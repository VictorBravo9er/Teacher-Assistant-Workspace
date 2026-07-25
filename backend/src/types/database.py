from __future__ import annotations

# ===========================================================
# Auto-generated Python types compatible with Supabase Python SDK
# DO NOT EDIT DIRECTLY. Run `python generate_types.py`
# ===========================================================

import datetime
from typing import Any, List, NotRequired, Optional, TypedDict
from pydantic import BaseModel, Field

# =================================================================
# Supabase SDK TypedDict Definitions (For dict queries/inserts/updates)
# =================================================================

class ClassStudentsRowDict(TypedDict):
    attendance: Optional[Any]
    behavioral_notes: Optional[str]
    class_id: str
    grades: Optional[Any]
    performance_tier: Optional[str]
    student_id: str

class ClassStudentsInsertDict(TypedDict, total=False):
    attendance: NotRequired[Optional[Any]]
    behavioral_notes: NotRequired[Optional[str]]
    class_id: str
    grades: NotRequired[Optional[Any]]
    performance_tier: NotRequired[Optional[str]]
    student_id: str

class ClassStudentsUpdateDict(TypedDict, total=False):
    attendance: NotRequired[Optional[Any]]
    behavioral_notes: NotRequired[Optional[str]]
    class_id: NotRequired[str]
    grades: NotRequired[Optional[Any]]
    performance_tier: NotRequired[Optional[str]]
    student_id: NotRequired[str]

class ClassesRowDict(TypedDict):
    academic_year: Optional[str]
    archived: Optional[bool]
    assessment_preferences: Optional[str]
    created_at: str
    experience_level: Optional[str]
    id: str
    institute_id: Optional[str]
    name: str
    semester: Optional[str]
    special_notes: Optional[str]
    subject: Optional[str]
    teacher_name: Optional[str]
    teaching_style: Optional[str]
    updated_at: str
    user_id: str

class ClassesInsertDict(TypedDict, total=False):
    academic_year: NotRequired[Optional[str]]
    archived: NotRequired[Optional[bool]]
    assessment_preferences: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    experience_level: NotRequired[Optional[str]]
    id: NotRequired[str]
    institute_id: NotRequired[Optional[str]]
    name: str
    semester: NotRequired[Optional[str]]
    special_notes: NotRequired[Optional[str]]
    subject: NotRequired[Optional[str]]
    teacher_name: NotRequired[Optional[str]]
    teaching_style: NotRequired[Optional[str]]
    updated_at: NotRequired[str]
    user_id: str

class ClassesUpdateDict(TypedDict, total=False):
    academic_year: NotRequired[Optional[str]]
    archived: NotRequired[Optional[bool]]
    assessment_preferences: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    experience_level: NotRequired[Optional[str]]
    id: NotRequired[str]
    institute_id: NotRequired[Optional[str]]
    name: NotRequired[str]
    semester: NotRequired[Optional[str]]
    special_notes: NotRequired[Optional[str]]
    subject: NotRequired[Optional[str]]
    teacher_name: NotRequired[Optional[str]]
    teaching_style: NotRequired[Optional[str]]
    updated_at: NotRequired[str]
    user_id: NotRequired[str]

class InstitutesRowDict(TypedDict):
    city: Optional[str]
    country: Optional[str]
    created_at: str
    district: Optional[str]
    id: str
    name: str
    state: Optional[str]
    type: Optional[str]

class InstitutesInsertDict(TypedDict, total=False):
    city: NotRequired[Optional[str]]
    country: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    district: NotRequired[Optional[str]]
    id: NotRequired[str]
    name: str
    state: NotRequired[Optional[str]]
    type: NotRequired[Optional[str]]

class InstitutesUpdateDict(TypedDict, total=False):
    city: NotRequired[Optional[str]]
    country: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    district: NotRequired[Optional[str]]
    id: NotRequired[str]
    name: NotRequired[str]
    state: NotRequired[Optional[str]]
    type: NotRequired[Optional[str]]

class ClassInstructionsRowDict(TypedDict):
    class_id: str
    created_at: str
    instruction_id: str

class ClassInstructionsInsertDict(TypedDict, total=False):
    class_id: str
    created_at: NotRequired[str]
    instruction_id: str

class ClassInstructionsUpdateDict(TypedDict, total=False):
    class_id: NotRequired[str]
    created_at: NotRequired[str]
    instruction_id: NotRequired[str]

class ClassMaterialsRowDict(TypedDict):
    class_id: str
    created_at: str
    material_id: str

class ClassMaterialsInsertDict(TypedDict, total=False):
    class_id: str
    created_at: NotRequired[str]
    material_id: str

class ClassMaterialsUpdateDict(TypedDict, total=False):
    class_id: NotRequired[str]
    created_at: NotRequired[str]
    material_id: NotRequired[str]

class InstructionsRowDict(TypedDict):
    content: str
    created_at: str
    id: str
    title: str
    type: Optional[str]
    user_id: str

class InstructionsInsertDict(TypedDict, total=False):
    content: str
    created_at: NotRequired[str]
    id: NotRequired[str]
    title: str
    type: NotRequired[Optional[str]]
    user_id: str

class InstructionsUpdateDict(TypedDict, total=False):
    content: NotRequired[str]
    created_at: NotRequired[str]
    id: NotRequired[str]
    title: NotRequired[str]
    type: NotRequired[Optional[str]]
    user_id: NotRequired[str]

class MaterialsRowDict(TypedDict):
    category: str
    content_type: str
    created_at: str
    id: str
    link_url: Optional[str]
    name: str
    size: Optional[str]
    storage_path: Optional[str]
    tags: Optional[List[str]]
    user_id: str
    version_history: Optional[Any]

class MaterialsInsertDict(TypedDict, total=False):
    category: NotRequired[str]
    content_type: NotRequired[str]
    created_at: NotRequired[str]
    id: NotRequired[str]
    link_url: NotRequired[Optional[str]]
    name: str
    size: NotRequired[Optional[str]]
    storage_path: NotRequired[Optional[str]]
    tags: NotRequired[Optional[List[str]]]
    user_id: str
    version_history: NotRequired[Optional[Any]]

class MaterialsUpdateDict(TypedDict, total=False):
    category: NotRequired[str]
    content_type: NotRequired[str]
    created_at: NotRequired[str]
    id: NotRequired[str]
    link_url: NotRequired[Optional[str]]
    name: NotRequired[str]
    size: NotRequired[Optional[str]]
    storage_path: NotRequired[Optional[str]]
    tags: NotRequired[Optional[List[str]]]
    user_id: NotRequired[str]
    version_history: NotRequired[Optional[Any]]

class StudentMaterialsRowDict(TypedDict):
    class_id: str
    content: Optional[str]
    created_at: str
    feedback: Optional[str]
    grade: Optional[str]
    id: str
    material_id: str
    score: Optional[float]
    status: str
    storage_path: Optional[str]
    student_id: str
    submission_type: str
    submission_url: Optional[str]
    submitted_at: Optional[str]

class StudentMaterialsInsertDict(TypedDict, total=False):
    class_id: str
    content: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    feedback: NotRequired[Optional[str]]
    grade: NotRequired[Optional[str]]
    id: NotRequired[str]
    material_id: str
    score: NotRequired[Optional[float]]
    status: NotRequired[str]
    storage_path: NotRequired[Optional[str]]
    student_id: str
    submission_type: NotRequired[str]
    submission_url: NotRequired[Optional[str]]
    submitted_at: NotRequired[Optional[str]]

class StudentMaterialsUpdateDict(TypedDict, total=False):
    class_id: NotRequired[str]
    content: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    feedback: NotRequired[Optional[str]]
    grade: NotRequired[Optional[str]]
    id: NotRequired[str]
    material_id: NotRequired[str]
    score: NotRequired[Optional[float]]
    status: NotRequired[str]
    storage_path: NotRequired[Optional[str]]
    student_id: NotRequired[str]
    submission_type: NotRequired[str]
    submission_url: NotRequired[Optional[str]]
    submitted_at: NotRequired[Optional[str]]

class TemplateInstructionsRowDict(TypedDict):
    created_at: str
    instruction_id: str
    template_id: str

class TemplateInstructionsInsertDict(TypedDict, total=False):
    created_at: NotRequired[str]
    instruction_id: str
    template_id: str

class TemplateInstructionsUpdateDict(TypedDict, total=False):
    created_at: NotRequired[str]
    instruction_id: NotRequired[str]
    template_id: NotRequired[str]

class TemplateMaterialsRowDict(TypedDict):
    created_at: str
    material_id: str
    template_id: str

class TemplateMaterialsInsertDict(TypedDict, total=False):
    created_at: NotRequired[str]
    material_id: str
    template_id: str

class TemplateMaterialsUpdateDict(TypedDict, total=False):
    created_at: NotRequired[str]
    material_id: NotRequired[str]
    template_id: NotRequired[str]

class StudentsRowDict(TypedDict):
    avatar_url: Optional[str]
    created_at: str
    email: Optional[str]
    id: str
    learning_style: Optional[str]
    name: str
    strengths: Optional[List[str]]
    user_id: str
    weaknesses: Optional[List[str]]

class StudentsInsertDict(TypedDict, total=False):
    avatar_url: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    email: NotRequired[Optional[str]]
    id: NotRequired[str]
    learning_style: NotRequired[Optional[str]]
    name: str
    strengths: NotRequired[Optional[List[str]]]
    user_id: str
    weaknesses: NotRequired[Optional[List[str]]]

class StudentsUpdateDict(TypedDict, total=False):
    avatar_url: NotRequired[Optional[str]]
    created_at: NotRequired[str]
    email: NotRequired[Optional[str]]
    id: NotRequired[str]
    learning_style: NotRequired[Optional[str]]
    name: NotRequired[str]
    strengths: NotRequired[Optional[List[str]]]
    user_id: NotRequired[str]
    weaknesses: NotRequired[Optional[List[str]]]

class TemplatesRowDict(TypedDict):
    created_at: str
    description: Optional[str]
    id: str
    instructions: Optional[Any]
    materials_preset: Optional[Any]
    name: str
    subject: Optional[str]
    teaching_style: Optional[str]
    user_id: str

class TemplatesInsertDict(TypedDict, total=False):
    created_at: NotRequired[str]
    description: NotRequired[Optional[str]]
    id: NotRequired[str]
    instructions: NotRequired[Optional[Any]]
    materials_preset: NotRequired[Optional[Any]]
    name: str
    subject: NotRequired[Optional[str]]
    teaching_style: NotRequired[Optional[str]]
    user_id: str

class TemplatesUpdateDict(TypedDict, total=False):
    created_at: NotRequired[str]
    description: NotRequired[Optional[str]]
    id: NotRequired[str]
    instructions: NotRequired[Optional[Any]]
    materials_preset: NotRequired[Optional[Any]]
    name: NotRequired[str]
    subject: NotRequired[Optional[str]]
    teaching_style: NotRequired[Optional[str]]
    user_id: NotRequired[str]

# =================================================================
# Master Database Schema Type Map
# =================================================================

class TablesSchema(TypedDict):
    class_students: TypedDict('Table_ClassStudents', {'Row': ClassStudentsRowDict, 'Insert': ClassStudentsInsertDict, 'Update': ClassStudentsUpdateDict})
    classes: TypedDict('Table_Classes', {'Row': ClassesRowDict, 'Insert': ClassesInsertDict, 'Update': ClassesUpdateDict})
    institutes: TypedDict('Table_Institutes', {'Row': InstitutesRowDict, 'Insert': InstitutesInsertDict, 'Update': InstitutesUpdateDict})
    class_instructions: TypedDict('Table_ClassInstructions', {'Row': ClassInstructionsRowDict, 'Insert': ClassInstructionsInsertDict, 'Update': ClassInstructionsUpdateDict})
    class_materials: TypedDict('Table_ClassMaterials', {'Row': ClassMaterialsRowDict, 'Insert': ClassMaterialsInsertDict, 'Update': ClassMaterialsUpdateDict})
    instructions: TypedDict('Table_Instructions', {'Row': InstructionsRowDict, 'Insert': InstructionsInsertDict, 'Update': InstructionsUpdateDict})
    materials: TypedDict('Table_Materials', {'Row': MaterialsRowDict, 'Insert': MaterialsInsertDict, 'Update': MaterialsUpdateDict})
    student_materials: TypedDict('Table_StudentMaterials', {'Row': StudentMaterialsRowDict, 'Insert': StudentMaterialsInsertDict, 'Update': StudentMaterialsUpdateDict})
    template_instructions: TypedDict('Table_TemplateInstructions', {'Row': TemplateInstructionsRowDict, 'Insert': TemplateInstructionsInsertDict, 'Update': TemplateInstructionsUpdateDict})
    template_materials: TypedDict('Table_TemplateMaterials', {'Row': TemplateMaterialsRowDict, 'Insert': TemplateMaterialsInsertDict, 'Update': TemplateMaterialsUpdateDict})
    students: TypedDict('Table_Students', {'Row': StudentsRowDict, 'Insert': StudentsInsertDict, 'Update': StudentsUpdateDict})
    templates: TypedDict('Table_Templates', {'Row': TemplatesRowDict, 'Insert': TemplatesInsertDict, 'Update': TemplatesUpdateDict})

class PublicSchema(TypedDict):
    Tables: TablesSchema

class DatabaseSchema(TypedDict):
    public: PublicSchema

# =================================================================
# Pydantic BaseModel Classes (For API Validation & Serialization)
# =================================================================

class ClassStudentsRow(BaseModel):
    attendance: Optional[Any] = None
    behavioral_notes: Optional[str] = None
    class_id: str
    grades: Optional[Any] = None
    performance_tier: Optional[str] = None
    student_id: str

class ClassStudentsInsert(BaseModel):
    attendance: Optional[Any] = None
    behavioral_notes: Optional[str] = None
    class_id: str
    grades: Optional[Any] = None
    performance_tier: Optional[str] = None
    student_id: str

class ClassStudentsUpdate(BaseModel):
    attendance: Optional[Any] = None
    behavioral_notes: Optional[str] = None
    class_id: Optional[str] = None
    grades: Optional[Any] = None
    performance_tier: Optional[str] = None
    student_id: Optional[str] = None

class ClassesRow(BaseModel):
    academic_year: Optional[str] = None
    archived: Optional[bool] = None
    assessment_preferences: Optional[str] = None
    created_at: str
    experience_level: Optional[str] = None
    id: str
    institute_id: Optional[str] = None
    name: str
    semester: Optional[str] = None
    special_notes: Optional[str] = None
    subject: Optional[str] = None
    teacher_name: Optional[str] = None
    teaching_style: Optional[str] = None
    updated_at: str
    user_id: str

class ClassesInsert(BaseModel):
    academic_year: Optional[str] = None
    archived: Optional[bool] = None
    assessment_preferences: Optional[str] = None
    created_at: Optional[str] = None
    experience_level: Optional[str] = None
    id: Optional[str] = None
    institute_id: Optional[str] = None
    name: str
    semester: Optional[str] = None
    special_notes: Optional[str] = None
    subject: Optional[str] = None
    teacher_name: Optional[str] = None
    teaching_style: Optional[str] = None
    updated_at: Optional[str] = None
    user_id: str

class ClassesUpdate(BaseModel):
    academic_year: Optional[str] = None
    archived: Optional[bool] = None
    assessment_preferences: Optional[str] = None
    created_at: Optional[str] = None
    experience_level: Optional[str] = None
    id: Optional[str] = None
    institute_id: Optional[str] = None
    name: Optional[str] = None
    semester: Optional[str] = None
    special_notes: Optional[str] = None
    subject: Optional[str] = None
    teacher_name: Optional[str] = None
    teaching_style: Optional[str] = None
    updated_at: Optional[str] = None
    user_id: Optional[str] = None

class InstitutesRow(BaseModel):
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: str
    district: Optional[str] = None
    id: str
    name: str
    state: Optional[str] = None
    type: Optional[str] = None

class InstitutesInsert(BaseModel):
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: Optional[str] = None
    district: Optional[str] = None
    id: Optional[str] = None
    name: str
    state: Optional[str] = None
    type: Optional[str] = None

class InstitutesUpdate(BaseModel):
    city: Optional[str] = None
    country: Optional[str] = None
    created_at: Optional[str] = None
    district: Optional[str] = None
    id: Optional[str] = None
    name: Optional[str] = None
    state: Optional[str] = None
    type: Optional[str] = None

class ClassInstructionsRow(BaseModel):
    class_id: str
    created_at: str
    instruction_id: str

class ClassInstructionsInsert(BaseModel):
    class_id: str
    created_at: Optional[str] = None
    instruction_id: str

class ClassInstructionsUpdate(BaseModel):
    class_id: Optional[str] = None
    created_at: Optional[str] = None
    instruction_id: Optional[str] = None

class ClassMaterialsRow(BaseModel):
    class_id: str
    created_at: str
    material_id: str

class ClassMaterialsInsert(BaseModel):
    class_id: str
    created_at: Optional[str] = None
    material_id: str

class ClassMaterialsUpdate(BaseModel):
    class_id: Optional[str] = None
    created_at: Optional[str] = None
    material_id: Optional[str] = None

class InstructionsRow(BaseModel):
    content: str
    created_at: str
    id: str
    title: str
    type: Optional[str] = None
    user_id: str

class InstructionsInsert(BaseModel):
    content: str
    created_at: Optional[str] = None
    id: Optional[str] = None
    title: str
    type: Optional[str] = None
    user_id: str

class InstructionsUpdate(BaseModel):
    content: Optional[str] = None
    created_at: Optional[str] = None
    id: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    user_id: Optional[str] = None

class MaterialsRow(BaseModel):
    category: str
    content_type: str
    created_at: str
    id: str
    link_url: Optional[str] = None
    name: str
    size: Optional[str] = None
    storage_path: Optional[str] = None
    tags: Optional[List[str]] = None
    user_id: str
    version_history: Optional[Any] = None

class MaterialsInsert(BaseModel):
    category: Optional[str] = None
    content_type: Optional[str] = None
    created_at: Optional[str] = None
    id: Optional[str] = None
    link_url: Optional[str] = None
    name: str
    size: Optional[str] = None
    storage_path: Optional[str] = None
    tags: Optional[List[str]] = None
    user_id: str
    version_history: Optional[Any] = None

class MaterialsUpdate(BaseModel):
    category: Optional[str] = None
    content_type: Optional[str] = None
    created_at: Optional[str] = None
    id: Optional[str] = None
    link_url: Optional[str] = None
    name: Optional[str] = None
    size: Optional[str] = None
    storage_path: Optional[str] = None
    tags: Optional[List[str]] = None
    user_id: Optional[str] = None
    version_history: Optional[Any] = None

class StudentMaterialsRow(BaseModel):
    class_id: str
    content: Optional[str] = None
    created_at: str
    feedback: Optional[str] = None
    grade: Optional[str] = None
    id: str
    material_id: str
    score: Optional[float] = None
    status: str
    storage_path: Optional[str] = None
    student_id: str
    submission_type: str
    submission_url: Optional[str] = None
    submitted_at: Optional[str] = None

class StudentMaterialsInsert(BaseModel):
    class_id: str
    content: Optional[str] = None
    created_at: Optional[str] = None
    feedback: Optional[str] = None
    grade: Optional[str] = None
    id: Optional[str] = None
    material_id: str
    score: Optional[float] = None
    status: Optional[str] = None
    storage_path: Optional[str] = None
    student_id: str
    submission_type: Optional[str] = None
    submission_url: Optional[str] = None
    submitted_at: Optional[str] = None

class StudentMaterialsUpdate(BaseModel):
    class_id: Optional[str] = None
    content: Optional[str] = None
    created_at: Optional[str] = None
    feedback: Optional[str] = None
    grade: Optional[str] = None
    id: Optional[str] = None
    material_id: Optional[str] = None
    score: Optional[float] = None
    status: Optional[str] = None
    storage_path: Optional[str] = None
    student_id: Optional[str] = None
    submission_type: Optional[str] = None
    submission_url: Optional[str] = None
    submitted_at: Optional[str] = None

class TemplateInstructionsRow(BaseModel):
    created_at: str
    instruction_id: str
    template_id: str

class TemplateInstructionsInsert(BaseModel):
    created_at: Optional[str] = None
    instruction_id: str
    template_id: str

class TemplateInstructionsUpdate(BaseModel):
    created_at: Optional[str] = None
    instruction_id: Optional[str] = None
    template_id: Optional[str] = None

class TemplateMaterialsRow(BaseModel):
    created_at: str
    material_id: str
    template_id: str

class TemplateMaterialsInsert(BaseModel):
    created_at: Optional[str] = None
    material_id: str
    template_id: str

class TemplateMaterialsUpdate(BaseModel):
    created_at: Optional[str] = None
    material_id: Optional[str] = None
    template_id: Optional[str] = None

class StudentsRow(BaseModel):
    avatar_url: Optional[str] = None
    created_at: str
    email: Optional[str] = None
    id: str
    learning_style: Optional[str] = None
    name: str
    strengths: Optional[List[str]] = None
    user_id: str
    weaknesses: Optional[List[str]] = None

class StudentsInsert(BaseModel):
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    email: Optional[str] = None
    id: Optional[str] = None
    learning_style: Optional[str] = None
    name: str
    strengths: Optional[List[str]] = None
    user_id: str
    weaknesses: Optional[List[str]] = None

class StudentsUpdate(BaseModel):
    avatar_url: Optional[str] = None
    created_at: Optional[str] = None
    email: Optional[str] = None
    id: Optional[str] = None
    learning_style: Optional[str] = None
    name: Optional[str] = None
    strengths: Optional[List[str]] = None
    user_id: Optional[str] = None
    weaknesses: Optional[List[str]] = None

class TemplatesRow(BaseModel):
    created_at: str
    description: Optional[str] = None
    id: str
    instructions: Optional[Any] = None
    materials_preset: Optional[Any] = None
    name: str
    subject: Optional[str] = None
    teaching_style: Optional[str] = None
    user_id: str

class TemplatesInsert(BaseModel):
    created_at: Optional[str] = None
    description: Optional[str] = None
    id: Optional[str] = None
    instructions: Optional[Any] = None
    materials_preset: Optional[Any] = None
    name: str
    subject: Optional[str] = None
    teaching_style: Optional[str] = None
    user_id: str

class TemplatesUpdate(BaseModel):
    created_at: Optional[str] = None
    description: Optional[str] = None
    id: Optional[str] = None
    instructions: Optional[Any] = None
    materials_preset: Optional[Any] = None
    name: Optional[str] = None
    subject: Optional[str] = None
    teaching_style: Optional[str] = None
    user_id: Optional[str] = None
