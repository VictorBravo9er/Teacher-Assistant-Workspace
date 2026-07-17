import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
import json

load_dotenv()

app = FastAPI(title="Teacher Assistant RAG API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenRouter / LangChain Config
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.5-flash")

# Define request schemas
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

@app.post("/api/chat")
async def chat_endpoint(payload: ChatPayload):
    if not OPENROUTER_API_KEY:
        # Fallback to warning text if API key is not configured
        return {
            "text": "### ⚠️ OpenRouter Key Warning\n`OPENROUTER_API_KEY` is missing in the backend environment. Please verify your environment settings to proceed with live AI generations.",
            "visualization": {
                "type": "stats",
                "title": "System Check",
                "description": "API status summary",
                "data": [
                    {"label": "API Key", "value": "Missing"},
                    {"label": "Target Model", "value": OPENROUTER_MODEL}
                ]
            }
        }

    try:
        # 1. Format Workspace and Student context data
        class_context = f"""
Active Classroom Workspace: "{payload.workspaceName}"
Subject: {payload.subject}
Academic Term: {payload.semester} ({payload.academicYear})
Lead Teacher: {payload.teacherName}
Target Teaching Style: {payload.teachingStyle}
Extra Special Classroom Notes: {payload.specialNotes}
Assessment Evaluation Preferences: {payload.assessmentPreferences}

Learning Repo (Materials):
{chr(10).join(f"- [{m.type.upper()}] {m.name} (Tags: {', '.join(m.tags) if m.tags else 'none'})" for m in payload.materials) if payload.materials else "No reference files uploaded."}

Reusable Prompt Instructional Rubrics:
{chr(10).join(f"- \"{i.title}\" ({i.type}): {i.content}" for i in payload.instructions) if payload.instructions else "No custom instruction rubrics."}
"""

        students_context = "Student Information Portfolio:\n" + "\n\n".join(
            f"- Student Name: {s.name} (Roll: {s.rollNumber}, Email: {s.email})\n"
            f"  * Performance: {s.performanceIndicator} | Attendance: {s.attendance}%\n"
            f"  * Grades: {', '.join(f'{g.assessmentName}: {g.score}/{g.maxScore}' for g in s.grades) if s.grades else 'No grades logged'}\n"
            f"  * Custom Attributes: {', '.join(f'{cf.label}: {cf.value}' for cf in s.customFields) if s.customFields else 'None'}\n"
            f"  * Parent Notes: {s.parentName} ({s.parentContact}) | Note: {s.parentNotes}"
            for s in payload.students
        )

        analysis_config_text = ""
        if payload.newAnalysisConfig:
            cfg = payload.newAnalysisConfig
            analysis_config_text = f"""
NEW IN-DEPTH ANALYSIS SESSION STARTED:
* Analysis Focus: {cfg.type}
* Applied Analysis Scope: {cfg.scopeType} ({f'Selected IDs: {", ".join(cfg.selectedIds)}' if cfg.selectedIds else 'Full Class Scope'})
* Custom Teacher Instruction Guidelines: {cfg.customInstructions or 'Default analytical depth'}
"""

        system_instruction = """You are the ultimate Teacher Assistant, an AI Pedagogist, and a RAG Data Analyst.
Your target is to help teachers manage student portfolios, draft personalized grading feedback, evaluate syllabus materials, and diagnose learning gaps.

Return your response in a serialized JSON format matching this schema:
{
  "text": "Detailed, professional markdown string containing constructive feedback, bullet points, checklists, analytical diagnosis tables, or report cards. Speak with professional, positive, compassionate teacher-assistant tone.",
  "visualization": {
    "type": "charts" | "heatmap" | "ranking" | "timeline" | "stats",
    "title": "A short, descriptive title for the visualization widget",
    "description": "A short subtitle explaining the visualized metrics",
    "data": [] /* Array of objects matching chart data structure */
  }
}

If no visualization fits or is needed, omit the "visualization" field (set it to null).

Data Schema Guidelines for "visualization":
- "ranking": list of {"name": str, "score": float, "classAvg": float, "status": str}
- "timeline": list of {"period": str, "score": float, "classAvg": float}
- "heatmap": list of {"topic": str, "mastery": float}
- "stats": list of {"label": str, "value": str}
"""

        # 2. Setup LangChain LLM referencing OpenRouter
        llm = ChatOpenAI(
            model=OPENROUTER_MODEL,
            openai_api_key=OPENROUTER_API_KEY,
            openai_api_base="https://openrouter.ai/api/v1",
            model_kwargs={
                "extra_headers": {
                    "HTTP-Referer": "https://github.com/Google-Developer-Assistant/Teacher-Assistant",
                    "X-Title": "Teacher Assistant Workspace"
                }
            },
            temperature=0.7
        )

        # Build prompt template
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_instruction),
            ("placeholder", "{history}"),
            ("user", "CONTEXT METADATA:\n{class_context}\n\nSTUDENT PORTFOLIOS:\n{students_context}\n\nACTIVE CONFIGURATION:\n{analysis_config_text}\n\nUSER PROMPT: {user_prompt}")
        ])

        # Prepare messages history (exclude last message which is user prompt)
        history_msgs = []
        for m in payload.messages[:-1]:
            history_msgs.append((m.role, m.text))

        # Format prompts
        formatted_messages = prompt_template.format_messages(
            history=history_msgs,
            class_context=class_context,
            students_context=students_context,
            analysis_config_text=analysis_config_text,
            user_prompt=payload.messages[-1].text
        )

        # Call LangChain
        response = llm.invoke(formatted_messages)
        
        # Clean response string to parse JSON safely
        res_text = response.content.strip()
        if res_text.startswith("```json"):
            res_text = res_text[7:]
        if res_text.endswith("```"):
            res_text = res_text[:-3]
        
        result_json = json.loads(res_text.strip())
        return result_json

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LangChain OpenRouter Error: {str(e)}")
