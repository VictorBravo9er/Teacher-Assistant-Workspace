import os
import re
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

_scripts_dir = Path(__file__).resolve().parent
_root_dir = _scripts_dir.parent

if load_dotenv is not None:
    for _env_file in (
        _scripts_dir / ".env",
        _root_dir / ".env",
        _root_dir / "backend" / ".env",
        _root_dir / "frontend" / ".env",
    ):
        if _env_file.exists():
            if load_dotenv(_env_file, override=False):
                break


POSTGRES_URI: str = os.getenv(
    "POSTGRES_URI", "postgres://postgres:postgres@localhost:5432/postgres"
)
DB_OPTIONS = os.getenv("DB_OPTIONS", "-c%20search_path%3Dlanggraph")
DB_OPTIONS_URI = POSTGRES_URI + "?options=" + DB_OPTIONS


def resolve_supabase_project_ref() -> str | None:
    """Resolves the Supabase Project Reference ID from environment variables or linked config."""
    explicit_ref = os.getenv("SUPABASE_PROJECT_REF") or os.getenv("SUPABASE_PROJECT_ID")
    if explicit_ref:
        return explicit_ref.strip()

    for url_var in ("SUPABASE_URL", "VITE_SUPABASE_URL"):
        url_val = os.getenv(url_var, "")
        match = re.search(r"https://([a-z0-9]+)\.supabase\.co", url_val)
        if match:
            return match.group(1)

    uri_match = re.search(
        r"(?:postgres\.|db\.)([a-z0-9]+)(?:[:@]|(?:\.supabase\.co))", POSTGRES_URI
    )
    if uri_match:
        return uri_match.group(1)

    temp_ref_file = _root_dir / "supabase" / ".temp" / "project-ref"
    if temp_ref_file.exists():
        ref_text = temp_ref_file.read_text(encoding="utf-8").strip()
        if ref_text:
            return ref_text

    return None


def resolve_target_flags(
    project_ref: str | None = None,
) -> tuple[list[str], bool, str]:
    """Resolves Supabase CLI target flags following a strict priority hierarchy:
    1. Explicit project_ref CLI argument -> ['--remote=' + project_ref]
    2. SUPABASE_ACCESS_TOKEN with resolved ref (e.g. CI/CD) -> ['--remote=' + resolved_ref]
    3. Linked project (supabase/.temp/project-ref or linked-project.json) -> ['--remote']
    4. Explicit non-local POSTGRES_URI from environment -> ['--remote=' + POSTGRES_URI]
    5. Explicit local POSTGRES_URI (e.g. localhost:54322) -> ['--remote=' + POSTGRES_URI]
    6. Ultimate endgame fallback: default localhost:5432 -> ['--remote=' + POSTGRES_URI]

    Returns:
        tuple[list[str], bool, str]: (cli_target_args, is_remote, target_description)
    """
    resolved_ref = project_ref or resolve_supabase_project_ref()
    has_token = bool(os.getenv("SUPABASE_ACCESS_TOKEN"))
    temp_ref = _root_dir / "supabase" / ".temp" / "project-ref"
    temp_json = _root_dir / "supabase" / ".temp" / "linked-project.json"
    is_linked = temp_ref.exists() or temp_json.exists()

    has_custom_db_env = "POSTGRES_URI" in os.environ
    current_postgres_uri = os.getenv("POSTGRES_URI", POSTGRES_URI)
    is_local_db_env = (
        has_custom_db_env
        and any(
            h in current_postgres_uri
            for h in ("localhost", "127.0.0.1", "host.docker.internal")
        )
    )

    # Pattern match across target resolution indicators in priority order
    match (
        project_ref,
        has_token,
        bool(resolved_ref),
        is_linked,
        is_local_db_env,
        has_custom_db_env,
    ):
        # 1. Explicit project_ref CLI argument
        case (str() as ref, _, _, _, _, _) if ref:
            return (
                [f"--remote={ref}"],
                True,
                f"remote project '{ref}' via Supabase CLI",
            )

        # 2. Access token + resolved project ref (e.g. GitHub Actions CI/CD)
        case (_, True, True, _, _, _):
            return (
                [f"--remote={resolved_ref}"],
                True,
                f"remote project '{resolved_ref}' via Management API",
            )

        # 3. Linked project (supabase login + link), unless user explicitly configured a local DB URI
        case (_, _, _, True, False, _):
            ref_label = resolved_ref or "linked"
            return (
                ["--remote"],
                True,
                f"linked remote project '{ref_label}' via Supabase CLI",
            )

        # 4. Explicit non-local POSTGRES_URI in environment (e.g. db.xxx.supabase.co direct connection)
        case (_, _, _, _, False, True):
            return (
                [f"--remote={current_postgres_uri}"],
                False,
                "remote database via direct connection",
            )

        # 5. Explicit local POSTGRES_URI in environment (e.g. localhost:54322)
        case (_, _, _, _, True, True):
            return (
                [f"--remote={current_postgres_uri}"],
                False,
                "local database via direct connection",
            )

        # 6. Ultimate endgame fallback: default localhost:5432
        case _:
            return (
                [f"--remote={current_postgres_uri}"],
                False,
                "default local database (localhost:5432)",
            )
