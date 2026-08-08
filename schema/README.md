# EduRAG Database Schema Documentation

This document provides a plain-English explanation of the EduRAG application database structure. It outlines what each table tracks, the meaning behind the various enumerations (ENUMs), and how the data relates.

*Note: The LangGraph-related tables responsible for storing the granular AI chat message history and checkpointing are excluded from this overview, as they are managed automatically by the LangGraph framework.*

---

## 🏛️ Enumerations (ENUMs)

To ensure strict data integrity, the database uses predefined lists of values (ENUMs) for various categories and statuses.

### Material & Content Types
- **`material_category`**: Broadly classifies the teaching resources uploaded by a teacher. 
  - *Values*: `Study Material`, `Note`, `Assigned Book`, `Link`, `Practical`, `Assignment`, `Test`, `Exam`
- **`material_content_type`**: Describes the physical medium of the material.
  - *Values*: `File` (uploaded document), `URL` (web link), `Text` (raw text content)

### Student Submissions & Attendance
- **`submission_type`**: The nature of the work the student is turning in.
  - *Values*: `Assignment Submission`, `Lab Work`, `Practical Completed`, `Exam Paper`
- **`submission_status`**: Tracks the lifecycle of a student's submission.
  - *Values*: `Assigned` (not yet started), `Pending` (submitted but awaiting grade), `Submitted` (turned in), `Evaluated` (auto-graded by AI), `Graded` (finalized by teacher)
- **`attendance_status`**: Standard daily attendance states.
  - *Values*: `Present`, `Absent`, `Late`, `Excused`

### Educational Contexts
- **`institute_type`**: The classification of the educational organization the teacher belongs to.
  - *Values*: `Primary School`, `Middle School`, `High School`, `K-12`, `College`, `University`, `Vocational School`, `Tutoring Center`, `Private Tutor`, `Freelancer`, `Training Agency`, `Online Academy`, `Homeschool Co-op`, `Other`
- **`experience_level`**: The target proficiency level of a class.
  - *Values*: `Beginner`, `Intermediate`, `Advanced`, `Mixed`
- **`teaching_style`**: The pedagogical approach utilized by the teacher (can be an array of multiple values).
  - *Values*: `Lecture`, `Socratic Method`, `Interactive`, `Project-Based`, `Flipped Classroom`, `Discussion-Based`, `Hands-On`
- **`assessment_preference`**: How the teacher prefers to evaluate students in a class (can be an array).
  - *Values*: `Multiple Choice`, `Short Answer`, `Essays`, `Presentations`, `Single Project`, `Group Projects`, `Oral Exams`, `Peer Review`

### AI & Prompting
- **`instruction_type`**: Categorizes the purpose of an AI prompt or rule, helping the AI understand how to behave when assisting the teacher.
  - *Values*: `System Persona`, `Grading Rubric`, `Lesson Plan Guideline`, `Material Generation Rule`, `Student Interaction Rule`, `Assessment Creation Rule`, `Content Filtering Rule`, `General Policy`

---

## 🗄️ Core Tables

### `institutes`
Tracks the educational organizations or individual teaching entities.
- **Key Columns**: `name`, `type` (institute_type), `district`, `city`, `state`, `country`. 

### `classes`
The core entity representing a specific course or class taught by a user (teacher). 
- **Key Columns**: `name`, `academic_year`, `semester`, `subject`. 
- **Array Columns**: `teaching_style` and `assessment_preferences` allow teachers to select multiple tags to describe how the class operates.

### `templates`
Blueprints created by teachers to quickly scaffold new classes. If a teacher runs three sections of "Beginner Python," they can create a template with preset materials, instructions, and settings, and spin up classes from it.
- **Key Columns**: Mirrors `classes` with `subject`, `teaching_style`, `experience_level`, and `assessment_preferences`.

### `students`
A global roster of all students managed by a specific teacher across all their classes. 
- **Key Columns**: `name`, `email`, `learning_style`, `strengths` (custom text array), `weaknesses` (custom text array).

### `materials`
A centralized repository of all teaching resources (PDFs, URLs, test papers) uploaded by the user.
- **Key Columns**: `name`, `category`, `content_type`, `storage_paths` (links to Supabase storage), `link_urls`.

### `instructions`
A centralized repository of AI prompts, rubrics, and behavioral rules created by the teacher. These tell the AI Assistant how to grade papers, design lesson plans, or act like a specific persona.
- **Key Columns**: `title`, `type` (instruction_type), `content` (the actual prompt), `when_to_apply` (a semantic hint for the AI).

---

## 🔗 Junction Tables (Relationships)
Because a Material or Instruction might be used in multiple Classes or Templates, we use junction tables to link them together without duplicating data.

- **`class_students`**: Links a Student to a Class. Tracks course-specific data like `performance_tier` ('High', 'Average', 'At Risk') and `behavioral_notes` for that specific class.
- **`class_materials` & `template_materials`**: Links Materials to specific Classes or Templates.
- **`class_instructions` & `template_instructions`**: Links AI Instructions to specific Classes or Templates, ensuring the AI knows which rubrics to apply to which class.

---

## 📝 Tracking & Logs

### `student_materials`
Tracks individual student assignments, submissions, grading statuses, and AI rubric breakdowns for a specific class. 
- **Key Columns**: 
  - `submission_type` & `status`
  - `storage_paths` / `submission_urls`: Where the student's work is stored.
  - `score` & `max_score`
  - `rubric_breakdown`: A JSON object where the AI can provide granular scoring across different rubric criteria.
  - `feedback`: Public feedback for the student.
  - `private_teacher_notes`: Hidden notes only the teacher sees.

### `attendance_records`
Daily or session-based attendance logs for students in a class.
- **Key Columns**: `date`, `status` (attendance_status), `notes`.

### `chat_sessions`
Stores the metadata (like the `title` and associated `class_id`) for AI chat conversations between the teacher and the EduRAG Assistant. 
- *Note: This table only populates the sidebar UI. The actual back-and-forth messages are stored inside the LangGraph checkpointing tables.*
