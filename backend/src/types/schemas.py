from pydantic import BaseModel


class Message(BaseModel):
    id: str
    role: str
    text: str
    timestamp: str


class Material(BaseModel):
    name: str
    type: str
    tags: list[str] | None = []


class Instruction(BaseModel):
    title: str
    type: str
    content: str


class StudentGrade(BaseModel):
    assessmentName: str
    score: float
    maxScore: float


class StudentCustomField(BaseModel):
    label: str
    value: str


class Student(BaseModel):
    name: str
    rollNumber: str
    email: str
    performanceIndicator: str
    attendance: float
    grades: list[StudentGrade] = []
    customFields: list[StudentCustomField] = []
    parentName: str | None = ""
    parentContact: str | None = ""
    parentNotes: str | None = ""


class AnalysisConfig(BaseModel):
    type: str
    scopeType: str
    selectedIds: list[str] = []
    customInstructions: str | None = ""


class ChatPayload(BaseModel):
    messages: list[Message]
    workspaceName: str
    subject: str
    academicYear: str
    semester: str
    teacherName: str
    teachingStyle: str
    specialNotes: str | None = ""
    assessmentPreferences: str | None = ""
    materials: list[Material] = []
    instructions: list[Instruction] = []
    students: list[Student] = []
    newAnalysisConfig: AnalysisConfig | None = None
