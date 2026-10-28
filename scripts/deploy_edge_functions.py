#!/usr/bin/env python3
"""Supabase Edge Functions Incremental Deployment Script

Uses the official Supabase CLI (`npx -y supabase functions list` and
`npx -y supabase functions deploy`) alongside a tracked JSON state manifest
(`supabase/functions/deployed.json`) to detect and deploy only modified or
unregistered Deno Edge Functions with remote drift detection and bounded concurrency.
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import re
import subprocess
import sys
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import TextIO, TypedDict, cast

# Add scripts directory to sys.path to allow importing _env_helper
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _env_helper  # pyright: ignore[reportImplicitRelativeImport]

MANIFEST_FILE = (
    Path(__file__).resolve().parent.parent / "supabase" / "functions" / "deployed.json"
)

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

_manifest_lock = threading.Lock()
_print_lock = threading.Lock()


def _safe_print(*args: object, file: TextIO | None = None) -> None:
    """Thread-safe stdout printing."""
    with _print_lock:
        print(*args, file=file)


class DeploymentRecord(TypedDict):
    hash: str
    version: int
    updated_at: str  # ISO 8601 UTC


def _parse_timestamp(raw_val: object) -> str:
    """Converts epoch milliseconds or seconds, or ISO string, to an ISO 8601 UTC string."""
    if isinstance(raw_val, (int, float)):
        seconds = raw_val / 1000.0 if raw_val > 1e11 else float(raw_val)
        return datetime.datetime.fromtimestamp(
            seconds, tz=datetime.timezone.utc
        ).isoformat()
    if isinstance(raw_val, str) and raw_val.strip():
        return raw_val.strip()
    return ""


def _load_full_state() -> dict[str, dict[str, DeploymentRecord]]:
    """Reads the JSON manifest file from disk with backward compatibility."""
    if not MANIFEST_FILE.exists():
        return {}
    try:
        raw = cast(object, json.loads(MANIFEST_FILE.read_text(encoding="utf-8")))
        if isinstance(raw, dict):
            raw_dict = cast(dict[object, object], raw)
            result: dict[str, dict[str, DeploymentRecord]] = {}
            for proj_k, proj_v in raw_dict.items():
                if isinstance(proj_v, dict):
                    inner_dict = cast(dict[object, object], proj_v)
                    result[str(proj_k)] = {}
                    for fn_k, fn_v in inner_dict.items():
                        if isinstance(fn_v, dict):
                            rec_dict = cast(dict[object, object], fn_v)
                            raw_ver = rec_dict.get("version", 0)
                            rec_ver = (
                                int(raw_ver)
                                if isinstance(raw_ver, (int, float))
                                else (
                                    int(raw_ver)
                                    if isinstance(raw_ver, str)
                                    and raw_ver.isdigit()
                                    else 0
                                )
                            )
                            result[str(proj_k)][str(fn_k)] = {
                                "hash": str(rec_dict.get("hash", "")),
                                "version": rec_ver,
                                "updated_at": str(
                                    rec_dict.get("updated_at", "")
                                ),
                            }
                        elif isinstance(fn_v, str):
                            # Backward compatibility for legacy flat hash strings
                            result[str(proj_k)][str(fn_k)] = {
                                "hash": fn_v,
                                "version": 0,
                                "updated_at": "",
                            }
            return result
    except Exception:
        pass
    return {}


def load_local_state(project_key: str) -> dict[str, DeploymentRecord]:
    """Loads the local deployment records for the target Supabase project."""
    with _manifest_lock:
        return dict(_load_full_state().get(project_key, {}))


def save_single_record(
    project_key: str, fn_name: str, record: DeploymentRecord
) -> None:
    """Thread-safe and atomic persistence of a single function's deployment record."""
    with _manifest_lock:
        full_state = _load_full_state()
        if project_key not in full_state:
            full_state[project_key] = {}
        full_state[project_key][fn_name] = record

        MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
        temp_file = MANIFEST_FILE.with_suffix(".json.tmp")
        _ = temp_file.write_text(
            json.dumps(full_state, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )
        _ = temp_file.replace(MANIFEST_FILE)


def fetch_remote_functions(
    root_dir: Path, project_ref: str | None
) -> dict[str, dict[str, object]] | None:
    """Queries `npx -y supabase functions list -o json` to fetch remote metadata for functions."""
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
        # CLI might print npm notices before the JSON array
        stdout = result.stdout
        json_start = stdout.find("[")
        if json_start == -1:
            return None
        parsed = cast(object, json.loads(stdout[json_start:]))
        if isinstance(parsed, list):
            items = cast(list[object], parsed)
            remote_map: dict[str, dict[str, object]] = {}
            for item in items:
                if isinstance(item, dict):
                    item_dict = cast(dict[str, object], item)
                    slug = item_dict.get("slug") or item_dict.get("name")
                    if isinstance(slug, str):
                        version = 0
                        raw_ver = item_dict.get("version")
                        if isinstance(raw_ver, (int, float)):
                            version = int(raw_ver)
                        elif isinstance(raw_ver, str) and raw_ver.isdigit():
                            version = int(raw_ver)

                        raw_updated = item_dict.get("updated_at")
                        updated_iso = _parse_timestamp(raw_updated)

                        remote_map[slug] = {
                            "version": version,
                            "updated_at": updated_iso,
                            "status": str(item_dict.get("status", "ACTIVE")),
                        }
            return remote_map
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
) -> tuple[bool, str, int | None]:
    """Invokes `npx -y supabase functions deploy <fn_name>` and returns (success, output, new_version)."""
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
    output = (
        result.stdout.strip()
        if result.returncode == 0
        else (result.stderr or result.stdout).strip()
    )

    new_version: int | None = None
    # Parse version if present in output (e.g., "Version: 10" or "version 10")
    match = re.search(r"version[:\s]+(\d+)", output, re.IGNORECASE)
    if match:
        new_version = int(match.group(1))

    return result.returncode == 0, output, new_version


def _deploy_worker(
    fn_name: str,
    c_hash: str,
    root_dir: Path,
    project_key: str,
    resolved_ref: str,
    no_verify_jwt: bool,
    remote_version: int,
    recorded_version: int,
) -> tuple[str, bool, str, DeploymentRecord | None]:
    """Worker function executed inside ThreadPoolExecutor to deploy and record a single function."""
    _safe_print(
        f"   ▶️  Deploying '{fn_name}' via Supabase CLI (project: {resolved_ref})..."
    )
    success, output, parsed_version = deploy_single_function(
        fn_name=fn_name,
        root_dir=root_dir,
        project_ref=resolved_ref,
        no_verify_jwt=no_verify_jwt,
    )

    if success:
        target_version = (
            parsed_version
            if parsed_version is not None
            else (max(remote_version, recorded_version) + 1)
        )
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        record: DeploymentRecord = {
            "hash": c_hash,
            "version": target_version,
            "updated_at": now_iso,
        }
        save_single_record(project_key, fn_name, record)
        _safe_print(
            f"   ✅ Successfully synced '{fn_name}' (v{target_version}, sha256: {c_hash[:10]})"
        )
        return fn_name, True, output, record

    _safe_print(
        f"   ❌ Failed to deploy '{fn_name}':\n      {output}",
        file=sys.stderr,
    )
    return fn_name, False, output, None


def deploy_modified_functions(
    force: bool = False,
    status_only: bool = False,
    target_functions: list[str] | None = None,
    project_ref: str | None = None,
    no_verify_jwt: bool = False,
    strict: bool = False,
    quiet: bool = False,
    concurrency: int = 4,
    yes: bool = False,
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
        _safe_print(
            "📂 No matching Supabase Edge Functions found in supabase/functions/."
        )
        return 0

    if not quiet:
        _safe_print("\n" + "=" * 60)
        _safe_print("⚡ Supabase Edge Functions Deployment Manager (Supabase CLI)")
        _safe_print("=" * 60)

    deployed_records = load_local_state(project_key)
    remote_map = fetch_remote_functions(root_dir, resolved_ref)

    # Format: (fn_name, hash, state, recorded_version, remote_version, remote_updated, has_drift)
    computed: list[tuple[str, str, str, int, int, str, bool]] = []
    drifted_functions: list[tuple[str, int, str, int, str]] = []

    for d in fn_dirs:
        c_hash = compute_function_hash(d, shared_dir)
        rec = deployed_records.get(d.name)
        rec_hash = rec["hash"] if rec else None
        rec_version = rec["version"] if rec else 0
        rec_updated = rec["updated_at"] if rec else ""

        remote_info = (
            remote_map.get(d.name) if remote_map is not None else None
        )
        raw_rem_ver = remote_info.get("version", 0) if remote_info else 0
        remote_version = (
            int(raw_rem_ver)
            if isinstance(raw_rem_ver, (int, float))
            else (
                int(raw_rem_ver)
                if isinstance(raw_rem_ver, str) and raw_rem_ver.isdigit()
                else 0
            )
        )
        raw_rem_upd = (
            remote_info.get("updated_at", "") if remote_info else ""
        )
        remote_updated = str(raw_rem_upd)

        missing_remotely = remote_map is not None and d.name not in remote_map
        has_drift = (
            remote_info is not None
            and rec_version > 0
            and remote_version > rec_version
        )

        if has_drift:
            drifted_functions.append(
                (d.name, remote_version, remote_updated, rec_version, rec_updated)
            )

        if rec_hash is None or missing_remotely:
            state = "NEW"
        elif rec_hash != c_hash or has_drift:
            state = "MODIFIED"
        else:
            state = "UP_TO_DATE"

        computed.append(
            (
                d.name,
                c_hash,
                state,
                rec_version,
                remote_version,
                remote_updated,
                has_drift,
            )
        )

    if status_only:
        _safe_print(
            f"\n📊 Edge Function Status (Project Ref: {resolved_ref or 'unlinked/local'}):"
        )
        header = f"   {'Function Name':<30} {'Status':<16} {'Local':<8} {'Remote':<8} {'Remote Updated':<28} {'SHA-256':<12}"
        _safe_print(header)
        _safe_print("   " + "-" * (len(header) - 3))
        for (
            fn_name,
            c_hash,
            state,
            rec_ver,
            rem_ver,
            rem_upd,
            has_drift,
        ) in computed:
            badge = (
                "✅ Up to date"
                if state == "UP_TO_DATE"
                else (
                    "⚠️  Drifted  "
                    if has_drift
                    else ("🔄 Modified  " if state == "MODIFIED" else "🆕 Undeployed")
                )
            )
            local_str = f"v{rec_ver}" if rec_ver > 0 else "-"
            remote_str = f"v{rem_ver}" if rem_ver > 0 else "-"
            rem_upd_str = rem_upd[:25] if rem_upd else "-"
            _safe_print(
                f"   {fn_name:<30} {badge:<16} {local_str:<8} {remote_str:<8} {rem_upd_str:<28} {c_hash[:12]}"
            )
        return 0

    # Display warnings for out-of-band remote drift
    if drifted_functions:
        for (
            fn_name,
            r_ver,
            r_upd,
            l_ver,
            l_upd,
        ) in drifted_functions:
            _safe_print(
                f"\n⚠️  WARNING: Function '{fn_name}' was deployed out-of-band!"
            )
            _safe_print(f"    • Remote Server: Version {r_ver} at {r_upd}")
            _safe_print(f"    • Local Record:  Version {l_ver} at {l_upd}")

    to_deploy: list[tuple[str, str, str, int, int]] = []
    for (
        fn_name,
        c_hash,
        state,
        rec_ver,
        rem_ver,
        _rem_upd,
        has_drift,
    ) in computed:
        if force or state != "UP_TO_DATE":
            # Guard against overwrite in interactive mode if drift detected
            if has_drift and not force and not yes and sys.stdin.isatty():
                try:
                    answer = (
                        input(
                            f"❓ Function '{fn_name}' was deployed out-of-band. Overwrite? [y/N]: "
                        )
                        .strip()
                        .lower()
                    )
                    if answer not in ("y", "yes"):
                        _safe_print(
                            f"   ⏩ Skipping '{fn_name}' to preserve remote deployment."
                        )
                        continue
                except (KeyboardInterrupt, EOFError):
                    _safe_print("\n❌ Aborted by user.")
                    return 1

            to_deploy.append((fn_name, c_hash, state, rec_ver, rem_ver))

    if not to_deploy:
        if quiet:
            _safe_print(
                f"   └── All {len(computed)} Edge Functions up to date (0 deployments needed)"
            )
        else:
            _safe_print(
                f"✨ All {len(computed)} Supabase Edge Functions are up to date! Zero deployments needed."
            )
        return 0

    _safe_print(f"\nFound {len(to_deploy)} Edge Function(s) to deploy:")
    for fn_name, c_hash, state, rec_ver, rem_ver in to_deploy:
        reason = "forced" if (force and state == "UP_TO_DATE") else state.lower()
        ver_info = f"current remote: v{rem_ver}" if rem_ver > 0 else "new"
        _safe_print(
            f"   • {fn_name:<30} ({reason}, {ver_info}, sha256: {c_hash[:10]})"
        )

    if not resolved_ref:
        msg = (
            "⚠️  Warning: Could not resolve SUPABASE_PROJECT_REF from environment or linked project. "
            + "Set SUPABASE_PROJECT_REF or SUPABASE_URL in .env."
        )
        _safe_print(f"\n{msg}", file=sys.stderr)
        return 1 if strict else 0

    deployed_count = 0
    failed_count = 0

    pool_workers = max(1, min(concurrency, len(to_deploy)))
    _safe_print(
        f"\n🚀 Deploying {len(to_deploy)} functions with concurrency={pool_workers}..."
    )

    with ThreadPoolExecutor(max_workers=pool_workers) as executor:
        futures = [
            executor.submit(
                _deploy_worker,
                fn_name=fn_name,
                c_hash=c_hash,
                root_dir=root_dir,
                project_key=project_key,
                resolved_ref=resolved_ref,
                no_verify_jwt=no_verify_jwt,
                remote_version=rem_ver,
                recorded_version=rec_ver,
            )
            for fn_name, c_hash, _state, rec_ver, rem_ver in to_deploy
        ]

        for future in as_completed(futures):
            _fn, success, _out, _rec = future.result()
            if success:
                deployed_count += 1
            else:
                failed_count += 1

    _safe_print(
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
    concurrency: int = 4
    yes: bool = False


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
    _ = parser.add_argument(
        "-c",
        "--concurrency",
        type=int,
        default=4,
        help="Max number of concurrent Edge Function deployments (default: 4).",
    )
    _ = parser.add_argument(
        "-y",
        "--yes",
        action="store_true",
        help="Automatically answer yes to prompts when drift is detected.",
    )

    args = parser.parse_args(namespace=_DeployCLIArgs())
    exit_code = deploy_modified_functions(
        force=args.force,
        status_only=args.status,
        target_functions=args.functions,
        project_ref=args.project_ref,
        no_verify_jwt=args.no_verify_jwt,
        strict=args.strict,
        concurrency=args.concurrency,
        yes=args.yes,
    )
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
