from __future__ import annotations

import datetime
import uuid
from typing import (
    Annotated,
    Any,
    List,
    Literal,
    NotRequired,
    Optional,
    TypeAlias,
    TypedDict,
)

from pydantic import BaseModel, Field, Json

AuthFactorType: TypeAlias = Literal["totp", "webauthn", "phone"]

AuthFactorStatus: TypeAlias = Literal["unverified", "verified"]

AuthAalLevel: TypeAlias = Literal["aal1", "aal2", "aal3"]

AuthCodeChallengeMethod: TypeAlias = Literal["s256", "plain"]

AuthOneTimeTokenType: TypeAlias = Literal["confirmation_token", "reauthentication_token", "recovery_token", "email_change_token_new", "email_change_token_current", "phone_change_token"]

AuthOauthRegistrationType: TypeAlias = Literal["dynamic", "manual"]

AuthOauthAuthorizationStatus: TypeAlias = Literal["pending", "approved", "denied", "expired"]

AuthOauthResponseType: TypeAlias = Literal["code"]

AuthOauthClientType: TypeAlias = Literal["public", "confidential"]

RealtimeEqualityOp: TypeAlias = Literal["eq", "neq", "lt", "lte", "gt", "gte", "in", "like", "ilike", "is", "match", "imatch", "isdistinct"]

RealtimeAction: TypeAlias = Literal["INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR"]

StorageBuckettype: TypeAlias = Literal["STANDARD", "ANALYTICS", "VECTOR"]

PublicMaterialCategory: TypeAlias = Literal["Study Material", "Note", "Assigned Book", "Link", "Practical", "Assignment", "Test", "Exam"]

PublicMaterialContentType: TypeAlias = Literal["File", "URL", "Text"]

PublicSubmissionType: TypeAlias = Literal["Assignment Submission", "Lab Work", "Practical Completed", "Exam Paper"]

PublicSubmissionStatus: TypeAlias = Literal["Assigned", "Pending", "Submitted", "Evaluated", "Graded"]

PublicAttendanceStatus: TypeAlias = Literal["Present", "Absent", "Late", "Excused"]

PublicInstituteType: TypeAlias = Literal["Primary School", "Middle School", "High School", "K-12", "College", "University", "Vocational School", "Tutoring Center", "Private Tutor", "Freelancer", "Training Agency", "Online Academy", "Homeschool Co-op", "Other"]

PublicInstructionType: TypeAlias = Literal["System Persona", "Grading Rubric", "Lesson Plan Guideline", "Material Generation Rule", "Student Interaction Rule", "Assessment Creation Rule", "Content Filtering Rule", "General Policy"]

PublicExperienceLevel: TypeAlias = Literal["Beginner", "Intermediate", "Advanced", "Mixed"]

PublicTeachingStyle: TypeAlias = Literal["Lecture", "Socratic Method", "Interactive", "Project-Based", "Flipped Classroom", "Discussion-Based", "Hands-On"]

PublicAssessmentPreference: TypeAlias = Literal["Multiple Choice", "Short Answer", "Essays", "Presentations", "Single Project", "Group Projects", "Oral Exams", "Peer Review"]

class PublicInstitutes(BaseModel):
    city: Optional[str] = Field(alias="city")
    country: Optional[str] = Field(alias="country")
    created_at: datetime.datetime = Field(alias="created_at")
    district: Optional[str] = Field(alias="district")
    id: uuid.UUID = Field(alias="id")
    name: str = Field(alias="name")
    state: Optional[str] = Field(alias="state")
    type: Optional[PublicInstituteType] = Field(alias="type")

class PublicInstitutesInsert(TypedDict):
    city: NotRequired[Annotated[Optional[str], Field(alias="city")]]
    country: NotRequired[Annotated[Optional[str], Field(alias="country")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    district: NotRequired[Annotated[Optional[str], Field(alias="district")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    name: Annotated[str, Field(alias="name")]
    state: NotRequired[Annotated[Optional[str], Field(alias="state")]]
    type: NotRequired[Annotated[Optional[PublicInstituteType], Field(alias="type")]]

class PublicInstitutesUpdate(TypedDict):
    city: NotRequired[Annotated[Optional[str], Field(alias="city")]]
    country: NotRequired[Annotated[Optional[str], Field(alias="country")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    district: NotRequired[Annotated[Optional[str], Field(alias="district")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    name: NotRequired[Annotated[str, Field(alias="name")]]
    state: NotRequired[Annotated[Optional[str], Field(alias="state")]]
    type: NotRequired[Annotated[Optional[PublicInstituteType], Field(alias="type")]]

class PublicClasses(BaseModel):
    academic_year: Optional[str] = Field(alias="academic_year")
    assessment_preferences: Optional[List[PublicAssessmentPreference]] = Field(alias="assessment_preferences")
    created_at: datetime.datetime = Field(alias="created_at")
    experience_level: Optional[PublicExperienceLevel] = Field(alias="experience_level")
    id: uuid.UUID = Field(alias="id")
    institute_id: Optional[uuid.UUID] = Field(alias="institute_id")
    is_archived: Optional[bool] = Field(alias="is_archived")
    name: str = Field(alias="name")
    semester: Optional[str] = Field(alias="semester")
    special_notes: Optional[str] = Field(alias="special_notes")
    subject: Optional[str] = Field(alias="subject")
    teacher_name: Optional[str] = Field(alias="teacher_name")
    teaching_style: Optional[List[PublicTeachingStyle]] = Field(alias="teaching_style")
    updated_at: datetime.datetime = Field(alias="updated_at")
    user_id: uuid.UUID = Field(alias="user_id")

class PublicClassesInsert(TypedDict):
    academic_year: NotRequired[Annotated[Optional[str], Field(alias="academic_year")]]
    assessment_preferences: NotRequired[Annotated[Optional[List[PublicAssessmentPreference]], Field(alias="assessment_preferences")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    experience_level: NotRequired[Annotated[Optional[PublicExperienceLevel], Field(alias="experience_level")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    institute_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="institute_id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    name: Annotated[str, Field(alias="name")]
    semester: NotRequired[Annotated[Optional[str], Field(alias="semester")]]
    special_notes: NotRequired[Annotated[Optional[str], Field(alias="special_notes")]]
    subject: NotRequired[Annotated[Optional[str], Field(alias="subject")]]
    teacher_name: NotRequired[Annotated[Optional[str], Field(alias="teacher_name")]]
    teaching_style: NotRequired[Annotated[Optional[List[PublicTeachingStyle]], Field(alias="teaching_style")]]
    updated_at: NotRequired[Annotated[datetime.datetime, Field(alias="updated_at")]]
    user_id: Annotated[uuid.UUID, Field(alias="user_id")]

class PublicClassesUpdate(TypedDict):
    academic_year: NotRequired[Annotated[Optional[str], Field(alias="academic_year")]]
    assessment_preferences: NotRequired[Annotated[Optional[List[PublicAssessmentPreference]], Field(alias="assessment_preferences")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    experience_level: NotRequired[Annotated[Optional[PublicExperienceLevel], Field(alias="experience_level")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    institute_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="institute_id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    name: NotRequired[Annotated[str, Field(alias="name")]]
    semester: NotRequired[Annotated[Optional[str], Field(alias="semester")]]
    special_notes: NotRequired[Annotated[Optional[str], Field(alias="special_notes")]]
    subject: NotRequired[Annotated[Optional[str], Field(alias="subject")]]
    teacher_name: NotRequired[Annotated[Optional[str], Field(alias="teacher_name")]]
    teaching_style: NotRequired[Annotated[Optional[List[PublicTeachingStyle]], Field(alias="teaching_style")]]
    updated_at: NotRequired[Annotated[datetime.datetime, Field(alias="updated_at")]]
    user_id: NotRequired[Annotated[uuid.UUID, Field(alias="user_id")]]

class PublicTemplates(BaseModel):
    assessment_preferences: Optional[List[PublicAssessmentPreference]] = Field(alias="assessment_preferences")
    created_at: datetime.datetime = Field(alias="created_at")
    description: Optional[str] = Field(alias="description")
    experience_level: Optional[PublicExperienceLevel] = Field(alias="experience_level")
    id: uuid.UUID = Field(alias="id")
    institute_id: Optional[uuid.UUID] = Field(alias="institute_id")
    is_archived: Optional[bool] = Field(alias="is_archived")
    name: str = Field(alias="name")
    subject: Optional[str] = Field(alias="subject")
    teaching_style: Optional[List[PublicTeachingStyle]] = Field(alias="teaching_style")
    user_id: uuid.UUID = Field(alias="user_id")

class PublicTemplatesInsert(TypedDict):
    assessment_preferences: NotRequired[Annotated[Optional[List[PublicAssessmentPreference]], Field(alias="assessment_preferences")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    description: NotRequired[Annotated[Optional[str], Field(alias="description")]]
    experience_level: NotRequired[Annotated[Optional[PublicExperienceLevel], Field(alias="experience_level")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    institute_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="institute_id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    name: Annotated[str, Field(alias="name")]
    subject: NotRequired[Annotated[Optional[str], Field(alias="subject")]]
    teaching_style: NotRequired[Annotated[Optional[List[PublicTeachingStyle]], Field(alias="teaching_style")]]
    user_id: Annotated[uuid.UUID, Field(alias="user_id")]

class PublicTemplatesUpdate(TypedDict):
    assessment_preferences: NotRequired[Annotated[Optional[List[PublicAssessmentPreference]], Field(alias="assessment_preferences")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    description: NotRequired[Annotated[Optional[str], Field(alias="description")]]
    experience_level: NotRequired[Annotated[Optional[PublicExperienceLevel], Field(alias="experience_level")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    institute_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="institute_id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    name: NotRequired[Annotated[str, Field(alias="name")]]
    subject: NotRequired[Annotated[Optional[str], Field(alias="subject")]]
    teaching_style: NotRequired[Annotated[Optional[List[PublicTeachingStyle]], Field(alias="teaching_style")]]
    user_id: NotRequired[Annotated[uuid.UUID, Field(alias="user_id")]]

class PublicStudents(BaseModel):
    avatar_url: Optional[str] = Field(alias="avatar_url")
    created_at: datetime.datetime = Field(alias="created_at")
    email: Optional[str] = Field(alias="email")
    id: uuid.UUID = Field(alias="id")
    is_archived: Optional[bool] = Field(alias="is_archived")
    learning_style: Optional[str] = Field(alias="learning_style")
    name: str = Field(alias="name")
    strengths: Optional[List[str]] = Field(alias="strengths")
    user_id: uuid.UUID = Field(alias="user_id")
    weaknesses: Optional[List[str]] = Field(alias="weaknesses")

class PublicStudentsInsert(TypedDict):
    avatar_url: NotRequired[Annotated[Optional[str], Field(alias="avatar_url")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    email: NotRequired[Annotated[Optional[str], Field(alias="email")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    learning_style: NotRequired[Annotated[Optional[str], Field(alias="learning_style")]]
    name: Annotated[str, Field(alias="name")]
    strengths: NotRequired[Annotated[Optional[List[str]], Field(alias="strengths")]]
    user_id: Annotated[uuid.UUID, Field(alias="user_id")]
    weaknesses: NotRequired[Annotated[Optional[List[str]], Field(alias="weaknesses")]]

class PublicStudentsUpdate(TypedDict):
    avatar_url: NotRequired[Annotated[Optional[str], Field(alias="avatar_url")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    email: NotRequired[Annotated[Optional[str], Field(alias="email")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    learning_style: NotRequired[Annotated[Optional[str], Field(alias="learning_style")]]
    name: NotRequired[Annotated[str, Field(alias="name")]]
    strengths: NotRequired[Annotated[Optional[List[str]], Field(alias="strengths")]]
    user_id: NotRequired[Annotated[uuid.UUID, Field(alias="user_id")]]
    weaknesses: NotRequired[Annotated[Optional[List[str]], Field(alias="weaknesses")]]

class PublicClassStudents(BaseModel):
    behavioral_notes: Optional[str] = Field(alias="behavioral_notes")
    class_id: uuid.UUID = Field(alias="class_id")
    performance_tier: Optional[str] = Field(alias="performance_tier")
    student_id: uuid.UUID = Field(alias="student_id")

class PublicClassStudentsInsert(TypedDict):
    behavioral_notes: NotRequired[Annotated[Optional[str], Field(alias="behavioral_notes")]]
    class_id: Annotated[uuid.UUID, Field(alias="class_id")]
    performance_tier: NotRequired[Annotated[Optional[str], Field(alias="performance_tier")]]
    student_id: Annotated[uuid.UUID, Field(alias="student_id")]

class PublicClassStudentsUpdate(TypedDict):
    behavioral_notes: NotRequired[Annotated[Optional[str], Field(alias="behavioral_notes")]]
    class_id: NotRequired[Annotated[uuid.UUID, Field(alias="class_id")]]
    performance_tier: NotRequired[Annotated[Optional[str], Field(alias="performance_tier")]]
    student_id: NotRequired[Annotated[uuid.UUID, Field(alias="student_id")]]

class PublicMaterials(BaseModel):
    category: PublicMaterialCategory = Field(alias="category")
    content_type: PublicMaterialContentType = Field(alias="content_type")
    created_at: datetime.datetime = Field(alias="created_at")
    id: uuid.UUID = Field(alias="id")
    is_archived: Optional[bool] = Field(alias="is_archived")
    link_urls: Optional[List[str]] = Field(alias="link_urls")
    name: str = Field(alias="name")
    size: Optional[str] = Field(alias="size")
    storage_paths: Optional[List[str]] = Field(alias="storage_paths")
    tags: Optional[List[str]] = Field(alias="tags")
    user_id: uuid.UUID = Field(alias="user_id")
    version_history: Optional[Json[Any]] = Field(alias="version_history")

class PublicMaterialsInsert(TypedDict):
    category: NotRequired[Annotated[PublicMaterialCategory, Field(alias="category")]]
    content_type: NotRequired[Annotated[PublicMaterialContentType, Field(alias="content_type")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    link_urls: NotRequired[Annotated[Optional[List[str]], Field(alias="link_urls")]]
    name: Annotated[str, Field(alias="name")]
    size: NotRequired[Annotated[Optional[str], Field(alias="size")]]
    storage_paths: NotRequired[Annotated[Optional[List[str]], Field(alias="storage_paths")]]
    tags: NotRequired[Annotated[Optional[List[str]], Field(alias="tags")]]
    user_id: Annotated[uuid.UUID, Field(alias="user_id")]
    version_history: NotRequired[Annotated[Optional[Json[Any]], Field(alias="version_history")]]

class PublicMaterialsUpdate(TypedDict):
    category: NotRequired[Annotated[PublicMaterialCategory, Field(alias="category")]]
    content_type: NotRequired[Annotated[PublicMaterialContentType, Field(alias="content_type")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    link_urls: NotRequired[Annotated[Optional[List[str]], Field(alias="link_urls")]]
    name: NotRequired[Annotated[str, Field(alias="name")]]
    size: NotRequired[Annotated[Optional[str], Field(alias="size")]]
    storage_paths: NotRequired[Annotated[Optional[List[str]], Field(alias="storage_paths")]]
    tags: NotRequired[Annotated[Optional[List[str]], Field(alias="tags")]]
    user_id: NotRequired[Annotated[uuid.UUID, Field(alias="user_id")]]
    version_history: NotRequired[Annotated[Optional[Json[Any]], Field(alias="version_history")]]

class PublicTemplateMaterials(BaseModel):
    created_at: datetime.datetime = Field(alias="created_at")
    material_id: uuid.UUID = Field(alias="material_id")
    template_id: uuid.UUID = Field(alias="template_id")

class PublicTemplateMaterialsInsert(TypedDict):
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    material_id: Annotated[uuid.UUID, Field(alias="material_id")]
    template_id: Annotated[uuid.UUID, Field(alias="template_id")]

class PublicTemplateMaterialsUpdate(TypedDict):
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    material_id: NotRequired[Annotated[uuid.UUID, Field(alias="material_id")]]
    template_id: NotRequired[Annotated[uuid.UUID, Field(alias="template_id")]]

class PublicClassMaterials(BaseModel):
    class_id: uuid.UUID = Field(alias="class_id")
    created_at: datetime.datetime = Field(alias="created_at")
    material_id: uuid.UUID = Field(alias="material_id")

class PublicClassMaterialsInsert(TypedDict):
    class_id: Annotated[uuid.UUID, Field(alias="class_id")]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    material_id: Annotated[uuid.UUID, Field(alias="material_id")]

class PublicClassMaterialsUpdate(TypedDict):
    class_id: NotRequired[Annotated[uuid.UUID, Field(alias="class_id")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    material_id: NotRequired[Annotated[uuid.UUID, Field(alias="material_id")]]

class PublicInstructions(BaseModel):
    content: str = Field(alias="content")
    created_at: datetime.datetime = Field(alias="created_at")
    id: uuid.UUID = Field(alias="id")
    is_archived: Optional[bool] = Field(alias="is_archived")
    title: str = Field(alias="title")
    type: PublicInstructionType = Field(alias="type")
    user_id: uuid.UUID = Field(alias="user_id")
    when_to_apply: Optional[str] = Field(alias="when_to_apply")

class PublicInstructionsInsert(TypedDict):
    content: Annotated[str, Field(alias="content")]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    title: Annotated[str, Field(alias="title")]
    type: NotRequired[Annotated[PublicInstructionType, Field(alias="type")]]
    user_id: Annotated[uuid.UUID, Field(alias="user_id")]
    when_to_apply: NotRequired[Annotated[Optional[str], Field(alias="when_to_apply")]]

class PublicInstructionsUpdate(TypedDict):
    content: NotRequired[Annotated[str, Field(alias="content")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_archived: NotRequired[Annotated[Optional[bool], Field(alias="is_archived")]]
    title: NotRequired[Annotated[str, Field(alias="title")]]
    type: NotRequired[Annotated[PublicInstructionType, Field(alias="type")]]
    user_id: NotRequired[Annotated[uuid.UUID, Field(alias="user_id")]]
    when_to_apply: NotRequired[Annotated[Optional[str], Field(alias="when_to_apply")]]

class PublicTemplateInstructions(BaseModel):
    created_at: datetime.datetime = Field(alias="created_at")
    instruction_id: uuid.UUID = Field(alias="instruction_id")
    template_id: uuid.UUID = Field(alias="template_id")

class PublicTemplateInstructionsInsert(TypedDict):
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    instruction_id: Annotated[uuid.UUID, Field(alias="instruction_id")]
    template_id: Annotated[uuid.UUID, Field(alias="template_id")]

class PublicTemplateInstructionsUpdate(TypedDict):
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    instruction_id: NotRequired[Annotated[uuid.UUID, Field(alias="instruction_id")]]
    template_id: NotRequired[Annotated[uuid.UUID, Field(alias="template_id")]]

class PublicClassInstructions(BaseModel):
    class_id: uuid.UUID = Field(alias="class_id")
    created_at: datetime.datetime = Field(alias="created_at")
    instruction_id: uuid.UUID = Field(alias="instruction_id")

class PublicClassInstructionsInsert(TypedDict):
    class_id: Annotated[uuid.UUID, Field(alias="class_id")]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    instruction_id: Annotated[uuid.UUID, Field(alias="instruction_id")]

class PublicClassInstructionsUpdate(TypedDict):
    class_id: NotRequired[Annotated[uuid.UUID, Field(alias="class_id")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    instruction_id: NotRequired[Annotated[uuid.UUID, Field(alias="instruction_id")]]

class PublicStudentMaterials(BaseModel):
    class_id: uuid.UUID = Field(alias="class_id")
    content: Optional[str] = Field(alias="content")
    created_at: datetime.datetime = Field(alias="created_at")
    due_at: Optional[datetime.datetime] = Field(alias="due_at")
    feedback: Optional[str] = Field(alias="feedback")
    grade: Optional[str] = Field(alias="grade")
    graded_at: Optional[datetime.datetime] = Field(alias="graded_at")
    id: uuid.UUID = Field(alias="id")
    is_late: Optional[bool] = Field(alias="is_late")
    material_id: Optional[uuid.UUID] = Field(alias="material_id")
    max_score: Optional[float] = Field(alias="max_score")
    private_teacher_notes: Optional[str] = Field(alias="private_teacher_notes")
    rubric_breakdown: Optional[Json[Any]] = Field(alias="rubric_breakdown")
    score: Optional[float] = Field(alias="score")
    status: PublicSubmissionStatus = Field(alias="status")
    storage_paths: Optional[List[str]] = Field(alias="storage_paths")
    student_id: uuid.UUID = Field(alias="student_id")
    submission_type: PublicSubmissionType = Field(alias="submission_type")
    submission_urls: Optional[List[str]] = Field(alias="submission_urls")
    submitted_at: Optional[datetime.datetime] = Field(alias="submitted_at")

class PublicStudentMaterialsInsert(TypedDict):
    class_id: Annotated[uuid.UUID, Field(alias="class_id")]
    content: NotRequired[Annotated[Optional[str], Field(alias="content")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    due_at: NotRequired[Annotated[Optional[datetime.datetime], Field(alias="due_at")]]
    feedback: NotRequired[Annotated[Optional[str], Field(alias="feedback")]]
    grade: NotRequired[Annotated[Optional[str], Field(alias="grade")]]
    graded_at: NotRequired[Annotated[Optional[datetime.datetime], Field(alias="graded_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_late: NotRequired[Annotated[Optional[bool], Field(alias="is_late")]]
    material_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="material_id")]]
    max_score: NotRequired[Annotated[Optional[float], Field(alias="max_score")]]
    private_teacher_notes: NotRequired[Annotated[Optional[str], Field(alias="private_teacher_notes")]]
    rubric_breakdown: NotRequired[Annotated[Optional[Json[Any]], Field(alias="rubric_breakdown")]]
    score: NotRequired[Annotated[Optional[float], Field(alias="score")]]
    status: NotRequired[Annotated[PublicSubmissionStatus, Field(alias="status")]]
    storage_paths: NotRequired[Annotated[Optional[List[str]], Field(alias="storage_paths")]]
    student_id: Annotated[uuid.UUID, Field(alias="student_id")]
    submission_type: NotRequired[Annotated[PublicSubmissionType, Field(alias="submission_type")]]
    submission_urls: NotRequired[Annotated[Optional[List[str]], Field(alias="submission_urls")]]
    submitted_at: NotRequired[Annotated[Optional[datetime.datetime], Field(alias="submitted_at")]]

class PublicStudentMaterialsUpdate(TypedDict):
    class_id: NotRequired[Annotated[uuid.UUID, Field(alias="class_id")]]
    content: NotRequired[Annotated[Optional[str], Field(alias="content")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    due_at: NotRequired[Annotated[Optional[datetime.datetime], Field(alias="due_at")]]
    feedback: NotRequired[Annotated[Optional[str], Field(alias="feedback")]]
    grade: NotRequired[Annotated[Optional[str], Field(alias="grade")]]
    graded_at: NotRequired[Annotated[Optional[datetime.datetime], Field(alias="graded_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    is_late: NotRequired[Annotated[Optional[bool], Field(alias="is_late")]]
    material_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="material_id")]]
    max_score: NotRequired[Annotated[Optional[float], Field(alias="max_score")]]
    private_teacher_notes: NotRequired[Annotated[Optional[str], Field(alias="private_teacher_notes")]]
    rubric_breakdown: NotRequired[Annotated[Optional[Json[Any]], Field(alias="rubric_breakdown")]]
    score: NotRequired[Annotated[Optional[float], Field(alias="score")]]
    status: NotRequired[Annotated[PublicSubmissionStatus, Field(alias="status")]]
    storage_paths: NotRequired[Annotated[Optional[List[str]], Field(alias="storage_paths")]]
    student_id: NotRequired[Annotated[uuid.UUID, Field(alias="student_id")]]
    submission_type: NotRequired[Annotated[PublicSubmissionType, Field(alias="submission_type")]]
    submission_urls: NotRequired[Annotated[Optional[List[str]], Field(alias="submission_urls")]]
    submitted_at: NotRequired[Annotated[Optional[datetime.datetime], Field(alias="submitted_at")]]

class PublicAttendanceRecords(BaseModel):
    class_id: uuid.UUID = Field(alias="class_id")
    created_at: datetime.datetime = Field(alias="created_at")
    date: datetime.date = Field(alias="date")
    id: uuid.UUID = Field(alias="id")
    notes: Optional[str] = Field(alias="notes")
    status: PublicAttendanceStatus = Field(alias="status")
    student_id: uuid.UUID = Field(alias="student_id")

class PublicAttendanceRecordsInsert(TypedDict):
    class_id: Annotated[uuid.UUID, Field(alias="class_id")]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    date: Annotated[datetime.date, Field(alias="date")]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    notes: NotRequired[Annotated[Optional[str], Field(alias="notes")]]
    status: Annotated[PublicAttendanceStatus, Field(alias="status")]
    student_id: Annotated[uuid.UUID, Field(alias="student_id")]

class PublicAttendanceRecordsUpdate(TypedDict):
    class_id: NotRequired[Annotated[uuid.UUID, Field(alias="class_id")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    date: NotRequired[Annotated[datetime.date, Field(alias="date")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    notes: NotRequired[Annotated[Optional[str], Field(alias="notes")]]
    status: NotRequired[Annotated[PublicAttendanceStatus, Field(alias="status")]]
    student_id: NotRequired[Annotated[uuid.UUID, Field(alias="student_id")]]

class PublicChatSessions(BaseModel):
    class_id: Optional[uuid.UUID] = Field(alias="class_id")
    created_at: datetime.datetime = Field(alias="created_at")
    id: uuid.UUID = Field(alias="id")
    title: str = Field(alias="title")
    updated_at: datetime.datetime = Field(alias="updated_at")
    user_id: uuid.UUID = Field(alias="user_id")

class PublicChatSessionsInsert(TypedDict):
    class_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="class_id")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    title: NotRequired[Annotated[str, Field(alias="title")]]
    updated_at: NotRequired[Annotated[datetime.datetime, Field(alias="updated_at")]]
    user_id: Annotated[uuid.UUID, Field(alias="user_id")]

class PublicChatSessionsUpdate(TypedDict):
    class_id: NotRequired[Annotated[Optional[uuid.UUID], Field(alias="class_id")]]
    created_at: NotRequired[Annotated[datetime.datetime, Field(alias="created_at")]]
    id: NotRequired[Annotated[uuid.UUID, Field(alias="id")]]
    title: NotRequired[Annotated[str, Field(alias="title")]]
    updated_at: NotRequired[Annotated[datetime.datetime, Field(alias="updated_at")]]
    user_id: NotRequired[Annotated[uuid.UUID, Field(alias="user_id")]]
