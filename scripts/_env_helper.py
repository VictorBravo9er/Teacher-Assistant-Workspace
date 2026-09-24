import os
import re
from pathlib import Path

from dotenv import load_dotenv

_scripts_dir = Path(__file__).resolve().parent
_root_dir = _scripts_dir.parent

for _env_file in (
    _root_dir / "backend" / ".env",
    _root_dir / "frontend" / ".env",
    _root_dir / ".env.local",
    _root_dir / ".env",
):
    if _env_file.exists():
        _ = load_dotenv(_env_file, override=False)


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

