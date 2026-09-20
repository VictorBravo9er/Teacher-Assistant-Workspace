from src.types.schemas import AnalysisConfig, ChatPayload, Student


def format_classroom_context(payload: ChatPayload) -> str:
    """Format metadata, materials, and rubrics into a standardized text context."""
    materials_list = [
        f"- [{m.type.upper()}] {m.name} (Tags: {', '.join(m.tags) if m.tags else 'none'})"
        for m in payload.materials
    ]
    materials_str = (
        "\n".join(materials_list) if materials_list else "No reference files uploaded."
    )

    instructions_list = [
        f"- {i.title} ({i.type}): {i.content}" for i in payload.instructions
    ]
    instructions_str = (
        "\n".join(instructions_list)
        if instructions_list
        else "No custom instruction rubrics."
    )

    return f"""Active Classroom Workspace: "{payload.workspaceName}"
Subject: {payload.subject}
Academic Term: {payload.semester} ({payload.academicYear})
Lead Teacher: {payload.teacherName}
Target Teaching Style: {payload.teachingStyle}
Extra Special Classroom Notes: {payload.specialNotes}
Assessment Evaluation Preferences: {payload.assessmentPreferences}

Learning Repo (Materials):
{materials_str}

Reusable Prompt Instructional Rubrics:
{instructions_str}
"""


def format_students_context(students: list[Student]) -> str:
    """Format student grades, attendance, custom attributes, and parent notes."""
    lines = ["Student Information Portfolio:"]
    for s in students:
        grades_str = (
            ", ".join(f"{g.assessmentName}: {g.score}/{g.maxScore}" for g in s.grades)
            if s.grades
            else "No grades logged"
        )
        custom_str = (
            ", ".join(f"{cf.label}: {cf.value}" for cf in s.customFields)
            if s.customFields
            else "None"
        )
        parent_info = f"{s.parentName} ({s.parentContact}) | Note: {s.parentNotes}"

        lines.append(
            f"- Student Name: {s.name} (Roll: {s.rollNumber}, Email: {s.email})\n"
            + f"  * Performance: {s.performanceIndicator} | Attendance: {s.attendance}%\n"
            + f"  * Grades: {grades_str}\n"
            + f"  * Custom Attributes: {custom_str}\n"
            + f"  * Parent Notes: {parent_info}"
        )
    return "\n\n".join(lines)


def format_analysis_config_context(config: AnalysisConfig | None) -> str:
    """Format the active analysis session configuration focus & scope."""
    if config is None:
        return ""
    selected_ids_str = (
        ", ".join(config.selectedIds) if config.selectedIds else "Full Class Scope"
    )
    return f"""
NEW IN-DEPTH ANALYSIS SESSION STARTED:
* Analysis Focus: {config.type}
* Applied Analysis Scope: {config.scopeType} (Selected IDs: {selected_ids_str})
* Custom Teacher Instruction Guidelines: {config.customInstructions or "Default analytical depth"}
"""
