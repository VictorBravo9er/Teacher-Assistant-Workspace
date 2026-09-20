#!/usr/bin/env python3
"""
Enum Tooltip Completeness Verifier
Audits generated frontend/src/types/db.ts enums against frontend/src/utils/enumTooltips.ts
and outputs clear warnings for any undocumented enum values.
"""

import re
from pathlib import Path

AUDIT_TARGET_ENUMS = [
    "instruction_type",
    "teaching_style",
    "assessment_preference",
    "content_category",
    "submission_status",
    "experience_level",
]


def extract_enums_from_db_ts(db_ts_path: Path) -> dict[str, list[str]]:
    content = db_ts_path.read_text(encoding="utf-8")
    enums: dict[str, list[str]] = {}
    for enum_name in AUDIT_TARGET_ENUMS:
        pattern = rf"{enum_name}:\s*\[(.*?)\]"
        match = re.search(pattern, content, re.DOTALL)
        if match:
            items = re.findall(r'"([^"]+)"', match.group(1))
            enums[enum_name] = items
    return enums


def extract_tooltips(tooltips_path: Path) -> set[str]:
    if not tooltips_path.exists():
        return set()
    content = tooltips_path.read_text(encoding="utf-8")
    return set(re.findall(r"['\"]([^'\"]+)['\"]\s*:\s*['\"]", content))


def audit_enum_tooltips() -> None:
    root_dir = Path(__file__).resolve().parent.parent
    db_ts = root_dir / "frontend" / "src" / "types" / "db.ts"
    tooltips_ts = root_dir / "frontend" / "src" / "utils" / "enumTooltips.ts"

    if not db_ts.exists():
        return

    enums = extract_enums_from_db_ts(db_ts)
    defined_tooltips = extract_tooltips(tooltips_ts)

    print("\n🔍 Auditing Enum Pedagogical Tooltips:")
    has_warnings = False
    for enum_name, values in enums.items():
        missing = [v for v in values if v not in defined_tooltips]
        total = len(values)
        documented = total - len(missing)
        if not missing:
            print(f"   ✅ {enum_name}: {documented}/{total} documented")
        else:
            has_warnings = True
            print(f"   ⚠️  {enum_name}: {documented}/{total} documented")
            for item in missing:
                print(f"       Missing tooltip for: '{item}'")

    if has_warnings:
        print(f"\n   💡 Tip: Add missing descriptions in {tooltips_ts.relative_to(root_dir)}")
    else:
        print("   🎉 All target enums have pedagogical tooltips!")


if __name__ == "__main__":
    audit_enum_tooltips()
