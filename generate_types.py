#!/usr/bin/env python3
"""
Supabase TypeScript to Python Type Generator
Fetches TypeScript definitions from Supabase CLI (`npx supabase gen types --lang=typescript`)
and converts them into Python types compatible with the Supabase Python SDK (`supabase-py` / `postgrest-py`).

Generates:
1. `TypedDict` classes (native dictionary typing for `supabase.table("...").select()`, `.insert()`, `.update()`)
2. `Pydantic` `BaseModel` classes (for FastAPI / data validation / serialization)
3. Master `Database` TypedDict schema
"""

import os
import re
import subprocess
import sys
from pathlib import Path

def ts_type_to_py_typeddict(ts_type: str, is_optional_field: bool = False) -> str:
    """Convert TypeScript type to Python TypedDict field type hint."""
    ts_type = ts_type.strip()
    is_nullable = "null" in [t.strip() for t in ts_type.split("|")]
    base_type = "|".join([t.strip() for t in ts_type.split("|") if t.strip() != "null"]).strip()
    
    if base_type == "string":
        py_base = "str"
    elif base_type in ("number", "float"):
        py_base = "float"
    elif base_type == "integer":
        py_base = "int"
    elif base_type == "boolean":
        py_base = "bool"
    elif base_type in ("Json", "any", "object"):
        py_base = "Any"
    elif base_type.endswith("[]"):
        item_ts = base_type[:-2]
        item_py = ts_type_to_py_typeddict(item_ts)
        py_base = f"List[{item_py}]"
    else:
        py_base = "Any"
        
    if is_nullable:
        py_base = f"Optional[{py_base}]"
        
    if is_optional_field:
        return f"NotRequired[{py_base}]"
        
    return py_base

def camel_to_pascal(snake_str: str) -> str:
    """Convert snake_case table name to PascalCase model prefix."""
    components = snake_str.split('_')
    return ''.join(x.title() for x in components)

def extract_block(text: str, start_index: int) -> str:
    """Extract a balanced { ... } block starting from start_index."""
    open_brace = text.find('{', start_index)
    if open_brace == -1:
        return ""
    
    count = 0
    for i in range(open_brace, len(text)):
        if text[i] == '{':
            count += 1
        elif text[i] == '}':
            count -= 1
            if count == 0:
                return text[open_brace + 1 : i]
    return ""

def parse_fields(block: str) -> list[tuple[str, str, bool]]:
    """Parse field names, types, and optional status from a TS interface block."""
    fields = []
    lines = block.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        
        m = re.match(r'^([\w_]+)(\??):\s*(.+)$', line)
        if m:
            name = m.group(1)
            is_optional = bool(m.group(2))
            ts_type = m.group(3).rstrip(';,')
            fields.append((name, ts_type, is_optional))
            
    return fields

def parse_ts_tables(ts_content: str) -> dict:
    """Extract tables and their Row/Insert/Update definitions from TypeScript content."""
    tables = {}
    
    tables_pos = ts_content.find("Tables: {")
    if tables_pos == -1:
        print("Warning: Could not find 'Tables: {' in TypeScript definitions.", file=sys.stderr)
        return tables
        
    tables_block = extract_block(ts_content, tables_pos)
    if not tables_block:
        return tables

    table_matches = re.finditer(r'^\s*([\w_]+):\s*{', tables_block, re.MULTILINE)
    reserved_keys = {'Row', 'Insert', 'Update', 'Relationships', 'Views', 'Functions', 'Enums', 'CompositeTypes'}

    for m in table_matches:
        table_name = m.group(1)
        if table_name in reserved_keys:
            continue
            
        table_body = extract_block(tables_block, m.start())
        
        sections = {}
        for section in ['Row', 'Insert', 'Update']:
            sec_pos = table_body.find(f"{section}: {{")
            if sec_pos != -1:
                sec_body = extract_block(table_body, sec_pos)
                sections[section] = parse_fields(sec_body)
            else:
                sections[section] = []
                
        tables[table_name] = sections
        
    return tables

def generate_python_code(tables: dict) -> str:
    """Generate complete Python file content with TypedDict and Pydantic models."""
    lines = [
        "from __future__ import annotations",
        "",
        "# ===========================================================",
        "# Auto-generated Python types compatible with Supabase Python SDK",
        "# DO NOT EDIT DIRECTLY. Run `python generate_types.py`",
        "# ===========================================================",
        "",
        "import datetime",
        "from typing import Any, List, NotRequired, Optional, TypedDict",
        "from pydantic import BaseModel, Field",
        "",
    ]
    
    # 1. TypedDict definitions for Supabase Python SDK
    lines.append("# " + "=" * 65)
    lines.append("# Supabase SDK TypedDict Definitions (For dict queries/inserts/updates)")
    lines.append("# " + "=" * 65)
    lines.append("")

    for table_name, sections in tables.items():
        pascal_name = camel_to_pascal(table_name)
        
        # Row TypedDict
        lines.append(f"class {pascal_name}RowDict(TypedDict):")
        fields = sections['Row']
        if not fields:
            lines.append("    pass")
        else:
            for name, ts_type, _ in fields:
                py_type = ts_type_to_py_typeddict(ts_type, is_optional_field=False)
                lines.append(f"    {name}: {py_type}")
        lines.append("")
        
        # Insert TypedDict
        lines.append(f"class {pascal_name}InsertDict(TypedDict, total=False):")
        fields = sections['Insert']
        if not fields:
            lines.append("    pass")
        else:
            for name, ts_type, is_opt in fields:
                py_type = ts_type_to_py_typeddict(ts_type, is_optional_field=is_opt)
                lines.append(f"    {name}: {py_type}")
        lines.append("")
        
        # Update TypedDict
        lines.append(f"class {pascal_name}UpdateDict(TypedDict, total=False):")
        fields = sections['Update']
        if not fields:
            lines.append("    pass")
        else:
            for name, ts_type, is_opt in fields:
                py_type = ts_type_to_py_typeddict(ts_type, is_optional_field=True)
                lines.append(f"    {name}: {py_type}")
        lines.append("")

    # Master Table Schema Map for SDK
    lines.append("# " + "=" * 65)
    lines.append("# Master Database Schema Type Map")
    lines.append("# " + "=" * 65)
    lines.append("")
    lines.append("class TablesSchema(TypedDict):")
    for table_name in tables.keys():
        pascal_name = camel_to_pascal(table_name)
        lines.append(f"    {table_name}: TypedDict('Table_{pascal_name}', {{'Row': {pascal_name}RowDict, 'Insert': {pascal_name}InsertDict, 'Update': {pascal_name}UpdateDict}})")
    lines.append("")

    lines.append("class PublicSchema(TypedDict):")
    lines.append("    Tables: TablesSchema")
    lines.append("")

    lines.append("class DatabaseSchema(TypedDict):")
    lines.append("    public: PublicSchema")
    lines.append("")

    # 2. Pydantic BaseModel definitions
    lines.append("# " + "=" * 65)
    lines.append("# Pydantic BaseModel Classes (For API Validation & Serialization)")
    lines.append("# " + "=" * 65)
    lines.append("")

    for table_name, sections in tables.items():
        pascal_name = camel_to_pascal(table_name)
        
        for section_name in ['Row', 'Insert', 'Update']:
            model_name = f"{pascal_name}{section_name}"
            fields = sections[section_name]
            
            lines.append(f"class {model_name}(BaseModel):")
            if not fields:
                lines.append("    pass")
                lines.append("")
                continue
                
            for name, ts_type, is_optional in fields:
                is_nullable = "null" in [t.strip() for t in ts_type.split("|")]
                base_type = "|".join([t.strip() for t in ts_type.split("|") if t.strip() != "null"]).strip()
                
                if base_type == "string":
                    py_base = "str"
                elif base_type in ("number", "float"):
                    py_base = "float"
                elif base_type == "integer":
                    py_base = "int"
                elif base_type == "boolean":
                    py_base = "bool"
                elif base_type in ("Json", "any", "object"):
                    py_base = "Any"
                elif base_type.endswith("[]"):
                    item_ts = base_type[:-2]
                    py_base = f"List[{ts_type_to_py_typeddict(item_ts)}]"
                else:
                    py_base = "Any"
                    
                if is_optional or is_nullable:
                    py_type = f"Optional[{py_base}] = None"
                else:
                    py_type = py_base
                    
                lines.append(f"    {name}: {py_type}")
            lines.append("")

    return "\n".join(lines)

def main():
    root_dir = Path(__file__).resolve().parent
    ts_file = root_dir / "types.ts"
    py_output_file = root_dir / "backend" / "src" / "types" / "database.py"
    
    project_id = os.getenv("SUPABASE_PROJECT_ID", "iphwbwpdvngkxrvxckse")
    
    print(f"1. Fetching TypeScript types from Supabase (Project ID: {project_id})...")
    cmd = ["npx", "-y", "supabase", "gen", "types", "--lang=typescript", "--project-id", project_id]
    result = subprocess.run(cmd, cwd=root_dir, capture_output=True, text=True)
    
    if result.returncode == 0 and result.stdout.strip():
        ts_content = result.stdout
        with open(ts_file, "w", encoding="utf-8") as f:
            f.write(ts_content)
        print(f"   Saved updated TypeScript types to {ts_file.name}")
    elif ts_file.exists():
        print(f"   Notice: Using existing {ts_file.name}")
        with open(ts_file, "r", encoding="utf-8") as f:
            ts_content = f.read()
    else:
        print(f"Error fetching types: {result.stderr}", file=sys.stderr)
        sys.exit(1)

    print("2. Parsing TypeScript types and converting to Supabase-SDK compatible Python types...")
    tables = parse_ts_tables(ts_content)
    
    if not tables:
        print("Error: No tables found to convert.", file=sys.stderr)
        sys.exit(1)
        
    py_code = generate_python_code(tables)
    
    py_output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(py_output_file, "w", encoding="utf-8") as f:
        f.write(py_code)
        
    print(f"3. Successfully generated Python types at {py_output_file.relative_to(root_dir)}")
    print(f"   Converted tables ({len(tables)}): {', '.join(tables.keys())}")

if __name__ == "__main__":
    main()
