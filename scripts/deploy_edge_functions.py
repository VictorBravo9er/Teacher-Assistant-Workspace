#!/usr/bin/env python3
"""Supabase Edge Functions Incremental Deployment Script

Uses the official Supabase CLI (`npx -y supabase functions list` and
`npx -y supabase functions deploy`) alongside a local SHA-256 state manifest
(`scripts/.edge_functions_state.json`) to detect and deploy only modified or
unregistered Deno Edge Functions without creating any tables in PostgreSQL.
"""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from typing import cast

# Add scripts directory to sys.path to allow importing _env_helper
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]

STATE_FILE = Path(__file__).resolve().parent / ".edge_functions_state.json"

# Functions invoked by external webhooks or pg_net database triggers that manage their own auth
# inside index.ts and must not be blocked by gateway-level user JWT enforcement.
NO_VERIFY_JWT_FUNCTIONS: set[str] = {
    "resend-webhook",
    "trigger-submission-evaluation",
    "trigger-material-analysis",
}

IGNORED_DOC_NAMES: set[str] = {
    "code.DESC.md",
    "code.ARCH.md",
    "AGENTS.md",
    "README.md",
}


def _load_full_state() -> dict[str, dict[str, str]]:
    if not STATE_FILE.exists():
        return {}
    try:
        raw = cast(object, json.loads(STATE_FILE.read_text(encoding="utf-8")))
        if isinstance(raw, dict):
            raw_dict = cast(dict[object, object], raw)
            result: dict[str, dict[str, str]] = {}
            for proj_k, proj_v in raw_dict.items():
                if isinstance(proj_v, dict):
                    inner_dict = cast(dict[object, object], proj_v)
                    result[str(proj_k)] = {
                        str(fn): str(h) for fn, h in inner_dict.items()
                    }
            return result
    except Exception:
        pass
    return {}


def load_local_state(project_key: str) -> dict[str, str]:
    """Loads the local SHA-256 hash manifest for the target Supabase project."""
    return dict(_load_full_state().get(project_key, {}))


def save_local_state(project_key: str, hashes: dict[str, str]) -> None:
    """Persists the updated SHA-256 hash manifest to scripts/.edge_functions_state.json."""
    full_state = _load_full_state()
    full_state[project_key] = hashes
    _ = STATE_FILE.write_text(
        json.dumps(full_state, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def fetch_remote_function_slugs(
    root_dir: Path, project_ref: str | None
) -> set[str] | None:
    """Queries `npx -y supabase functions list -o json` to see which functions exist remotely."""
    if not project_ref:
        return None
    cmd = [
        "npx",
        "-y",
        "supabase",
        "functions",
        "list",
        "--project-ref",
        project_ref,
        "-o",
        "json",
    ]
    result = subprocess.run(
        cmd,
        cwd=str(root_dir),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    try:
        parsed = cast(object, json.loads(result.stdout))
        if isinstance(parsed, list):
            items = cast(list[object], parsed)
            slugs: set[str] = set()
            for item in items:
                if isinstance(item, dict):
                    item_dict = cast(dict[str, object], item)
                    slug = item_dict.get("slug") or item_dict.get("name")
                    if isinstance(slug, str):
                        slugs.add(slug)
            return slugs
    except Exception:
        pass
    return None


def _iter_source_files(directory: Path) -> list[Path]:
    """Returns all non-documentation source files under directory sorted deterministically."""
    if not directory.exists():
        return []
    files: list[Path] = []
    for path in directory.rglob("*"):
        if (
            path.is_file()
            and not path.name.startswith(".")
            and path.name not in IGNORED_DOC_NAMES
            and path.suffix.lower() != ".md"
        ):
            files.append(path)
    return sorted(files, key=lambda p: str(p.relative_to(directory)))


def discover_edge_functions(functions_root: Path) -> list[Path]:
    """Lists all deployable Edge Function directories (containing an index.ts) sorted by name."""
    if not functions_root.exists():
        return []
    fn_dirs: list[Path] = []
    for item in functions_root.iterdir():
        if (
            item.is_dir()
            and not item.name.startswith("_")
            and not item.name.startswith(".")
            and (item / "index.ts").is_file()
        ):
            fn_dirs.append(item)
    return sorted(fn_dirs, key=lambda d: d.name)


def compute_function_hash(fn_dir: Path, shared_dir: Path) -> str:
    """Computes a composite SHA-256 digest of `_shared/` plus the specific function directory."""
    hasher = hashlib.sha256()

    for shared_file in _iter_source_files(shared_dir):
        rel = shared_file.relative_to(shared_dir).as_posix()
        hasher.update(f"shared:{rel}\n".encode("utf-8"))
        hasher.update(shared_file.read_bytes())
        hasher.update(b"\n")

    for fn_file in _iter_source_files(fn_dir):
        rel = fn_file.relative_to(fn_dir).as_posix()
        hasher.update(f"fn:{rel}\n".encode("utf-8"))
        hasher.update(fn_file.read_bytes())
        hasher.update(b"\n")

    return hasher.hexdigest()


def deploy_single_function(
    fn_name: str,
    root_dir: Path,
    project_ref: str | None = None,
    no_verify_jwt: bool = False,
) -> tuple[bool, str]:
    """Invokes `npx -y supabase functions deploy <fn_name>` and returns (success, output)."""
    cmd: list[str] = [
        "npx",
        "-y",
        "supabase",
        "functions",
        "deploy",
        fn_name,
    ]
    if project_ref:
        cmd.extend(["--project-ref", project_ref])
    if no_verify_jwt or fn_name in NO_VERIFY_JWT_FUNCTIONS:
        cmd.append("--no-verify-jwt")

    result = subprocess.run(
        cmd,
        cwd=str(root_dir),
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        return True, result.stdout.strip()
    return False, (result.stderr or result.stdout).strip()


def deploy_modified_functions(
    force: bool = False,
    status_only: bool = False,
    target_functions: list[str] | None = None,
    project_ref: str | None = None,
    no_verify_jwt: bool = False,
    strict: bool = False,
) -> int:
    """Detects and deploys modified Supabase Edge Functions via `npx -y supabase functions deploy`."""
    root_dir = Path(__file__).resolve().parent.parent
    functions_root = root_dir / "supabase" / "functions"
    shared_dir = functions_root / "_shared"
    resolved_ref = project_ref or _env_helper.resolve_supabase_project_ref()
    project_key = resolved_ref or "default"

    fn_dirs = discover_edge_functions(functions_root)
    if target_functions:
        target_set = set(target_functions)
        fn_dirs = [d for d in fn_dirs if d.name in target_set]

    if not fn_dirs:
        print("📂 No matching Supabase Edge Functions found in supabase/functions/.")
        return 0

    print("\n" + "=" * 60)
    print("⚡ Supabase Edge Functions Deployment Manager (Supabase CLI)")
    print("=" * 60)

    deployed_hashes = load_local_state(project_key)
    remote_slugs = fetch_remote_function_slugs(root_dir, resolved_ref)

    computed: list[tuple[str, str, str]] = []
    for d in fn_dirs:
        c_hash = compute_function_hash(d, shared_dir)
        prev_hash = deployed_hashes.get(d.name)
        missing_remotely = remote_slugs is not None and d.name not in remote_slugs
        if prev_hash is None or missing_remotely:
            state = "NEW"
        elif prev_hash != c_hash:
            state = "MODIFIED"
        else:
            state = "UP_TO_DATE"
        computed.append((d.name, c_hash, state))

    if status_only:
        print(
            f"\n📊 Edge Function Status (Project Ref: {resolved_ref or 'unlinked/local'}):"
        )
        for fn_name, c_hash, state in computed:
            badge = (
                "✅ Up to date"
                if state == "UP_TO_DATE"
                else ("🔄 Modified  " if state == "MODIFIED" else "🆕 Undeployed")
            )
            print(f"   [{badge}] {fn_name:<32} (sha256: {c_hash[:12]})")
        return 0

    to_deploy = [
        (fn_name, c_hash, state)
        for fn_name, c_hash, state in computed
        if force or state != "UP_TO_DATE"
    ]

    if not to_deploy:
        print(
            f"✨ All {len(computed)} Supabase Edge Functions are up to date! Zero deployments needed."
        )
        return 0

    print(f"\nFound {len(to_deploy)} Edge Function(s) to deploy:")
    for fn_name, c_hash, state in to_deploy:
        reason = "forced" if (force and state == "UP_TO_DATE") else state.lower()
        print(f"   • {fn_name} ({reason}, sha256: {c_hash[:10]})")

    if not resolved_ref:
        msg = (
            "⚠️  Warning: Could not resolve SUPABASE_PROJECT_REF from environment or linked project. "
            + "Set SUPABASE_PROJECT_REF or SUPABASE_URL in .env."
        )
        print(f"\n{msg}", file=sys.stderr)
        return 1 if strict else 0

    deployed_count = 0
    failed_count = 0

    for fn_name, c_hash, _state in to_deploy:
        print(
            f"\n▶️  Deploying Edge Function '{fn_name}' via Supabase CLI (project: {resolved_ref})..."
        )
        success, output = deploy_single_function(
            fn_name=fn_name,
            root_dir=root_dir,
            project_ref=resolved_ref,
            no_verify_jwt=no_verify_jwt,
        )

        if success:
            deployed_hashes[fn_name] = c_hash
            save_local_state(project_key, deployed_hashes)
            print(f"   ✅ Successfully synced '{fn_name}' ({c_hash[:10]})")
            deployed_count += 1
        else:
            failed_count += 1
            print(
                f"   ❌ Failed to deploy '{fn_name}':\n      {output}",
                file=sys.stderr,
            )
            if strict:
                return 1

    print(
        f"\n🎉 Edge Functions sync summary: {deployed_count} deployed, {failed_count} failed, "
        + f"{len(computed) - len(to_deploy)} unchanged."
    )
    return 1 if (failed_count > 0 and strict) else 0


class _DeployCLIArgs(argparse.Namespace):
    status: bool = False
    force: bool = False
    functions: list[str] | None = None
    project_ref: str | None = None
    no_verify_jwt: bool = False
    strict: bool = False


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Deploy modified Supabase Edge Functions via `npx -y supabase functions deploy`.",
    )
    _ = parser.add_argument(
        "--status",
        action="store_true",
        help="Show modification and deployment status of all Edge Functions without deploying.",
    )
    _ = parser.add_argument(
        "--force",
        "--all",
        dest="force",
        action="store_true",
        help="Force deploy all Edge Functions regardless of whether their source files changed.",
    )
    _ = parser.add_argument(
        "--function",
        "-f",
        dest="functions",
        action="append",
        help="Deploy only the specified function name(s). Can be passed multiple times.",
    )
    _ = parser.add_argument(
        "--project-ref",
        dest="project_ref",
        type=str,
        default=None,
        help="Explicit Supabase Project Ref ID (auto-detected from SUPABASE_URL / POSTGRES_URI if omitted).",
    )
    _ = parser.add_argument(
        "--no-verify-jwt",
        action="store_true",
        help="Pass --no-verify-jwt to all deployed functions (automatically applied to webhook functions).",
    )
    _ = parser.add_argument(
        "--strict",
        action="store_true",
        help="Exit with non-zero status code if any function deployment fails.",
    )

    args = parser.parse_args(namespace=_DeployCLIArgs())
    exit_code = deploy_modified_functions(
        force=args.force,
        status_only=args.status,
        target_functions=args.functions,
        project_ref=args.project_ref,
        no_verify_jwt=args.no_verify_jwt,
        strict=args.strict,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
