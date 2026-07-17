from pydantic import BaseModel
from typing import List, Optional

class Message(BaseModel):
    id: str
    role: str
    text: str
    timestamp: str

class Material(BaseModel):
    name: str
    type: str
    tags: Optional[List[str]] = []

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
    grades: List[StudentGrade] = []
    customFields: List[StudentCustomField] = []
    parentName: Optional[str] = ""
    parentContact: Optional[str] = ""
    parentNotes: Optional[str] = ""

class AnalysisConfig(BaseModel):
    type: str
    scopeType: str
    selectedIds: List[str] = []
    customInstructions: Optional[str] = ""

class ChatPayload(BaseModel):
    messages: List[Message]
    workspaceName: str
    subject: str
    academicYear: str
    semester: str
    teacherName: str
    teachingStyle: str
    specialNotes: Optional[str] = ""
    assessmentPreferences: Optional[str] = ""
    materials: List[Material] = []
    instructions: List[Instruction] = []
    students: List[Student] = []
    newAnalysisConfig: Optional[AnalysisConfig] = None
