import { Database } from "@/types/db";

export type content_type = Database["public"]["Enums"]["content_type"];
export type ContentCategory = Database["public"]["Enums"]["content_category"];
export type InstructionType = Database["public"]["Enums"]["instruction_type"];
export type SubmissionStatus = Database["public"]["Enums"]["submission_status"];
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export type PerformanceTier = 'High' | 'Average' | 'At Risk';
export type PerformanceIndicator = 'excellent' | 'good' | 'average' | 'critical' | PerformanceTier;
export type StatusIndicator = 'active' | 'inactive' | 'needs-attention';

export interface ContentItem {
  id?: string;
  name?: string;
  type: content_type;
  path?: string;
  value?: string;
  description?: string;
  signedUrl?: string;
  size_bytes?: number;
  mime_type?: string;
  isPrivate?: boolean;
  isShared?: boolean;
}

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  maxScore: number;
  weight?: number;
  isPrivate?: boolean;
}

export interface RubricBreakdownItem {
  criterionId: string;
  criterionName: string;
  score: number;
  maxScore: number;
  comment?: string;
}

export interface CriterionScoreItem {
  criterion_id?: string;
  criterionId?: string;
  criterion_name?: string;
  criterionName?: string;
  score_awarded?: number;
  score?: number;
  max_score?: number;
  maxScore?: number;
  feedback?: string;
  comment?: string;
}

export interface EvaluationSummary {
  total_score?: number;
  max_possible?: number;
  percentage?: number;
  strengths?: string[];
  learning_gaps?: string[];
  suggested_next_steps?: string;
}

export interface StructuredRubricBreakdown {
  criteria_scores?: CriterionScoreItem[];
  summary?: EvaluationSummary;
  evaluated_at?: string;
  model_version?: string;
}

export interface MaterialVersionEntry {
  version: string;
  date: string;
  note: string;
}

export interface Material {
  id: string;
  name: string;
  category: ContentCategory;
  type?: string;
  content: ContentItem[];
  customContent?: ContentItem[];
  uploadDate: string;
  size?: string;
  tags?: string[];
  dueAt?: string;
  maxScore?: number;
  toBeScored?: boolean;
  isArchived?: boolean;
  isShared?: boolean;
  sharedCount?: number;
  rubricCriteria?: RubricCriterion[];
  customRubricCriteria?: RubricCriterion[];
  versionHistory?: MaterialVersionEntry[];
}

export interface Instruction {
  id: string;
  title: string;
  type: string;
  content: string;
  whenToApply?: string;
  isArchived?: boolean;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'boolean' | 'tag';
  value: string;
  visibility: boolean;
}

export interface StudentSubmission {
  id: string;
  class_id?: string;
  classId?: string;
  student_id?: string;
  studentId?: string;
  material_id?: string;
  materialId?: string;
  materialName?: string;
  content?: ContentItem[];
  status?: SubmissionStatus | string;
  score?: number;
  max_score?: number;
  maxScore?: number;
  grade?: string;
  feedback?: string;
  private_teacher_notes?: string;
  privateTeacherNotes?: string;
  rubric_breakdown?: RubricBreakdownItem[] | StructuredRubricBreakdown | any;
  rubricBreakdown?: RubricBreakdownItem[] | StructuredRubricBreakdown | any;
  submittedAt?: string;
  reviewedAt?: string;
  dueAt?: string;
  isLate?: boolean;
}

export interface AttendanceRecord {
  id?: string;
  classId: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
}

export interface Student {
  id: string;
  name: string;
  rollNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  parentName?: string;
  parentContact?: string;
  parentNotes?: string;
  learningStyle?: string;
  strengths?: string[];
  weaknesses?: string[];
  avatarUrl?: string;
  avatarSeed?: string;
  currentScore?: number;
  currentGrade?: string;
  generalFeedback?: string;
  behavioralNotes?: string;
  attendance?: number;
  attendanceRecords?: AttendanceRecord[];
  performanceIndicator?: PerformanceIndicator;
  performanceTier?: PerformanceTier;
  statusIndicator?: StatusIndicator;
  submissions?: StudentSubmission[];
  customFields?: CustomField[];
  isArchived?: boolean;
}

export interface VisualizationItem {
  name?: string;
  score?: number;
  classAvg?: number;
  period?: string;
  date?: string;
  SofiaScore?: number;
  topic?: string;
  subject?: string;
  mastery?: number;
  label?: string;
  value?: string;
  [key: string]: unknown;
}

export interface VisualizationData {
  type: 'charts' | 'heatmap' | 'ranking' | 'timeline' | 'radar' | 'stats';
  title: string;
  description?: string;
  data: VisualizationItem[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachments?: { name: string; type: string }[];
  visualization?: VisualizationData;
}

export interface RAGSession {
  id: string;
  title: string;
  type: string;
  scopeType: 'class' | 'students' | 'materials' | 'assessments';
  selectedIds: string[];
  customInstructions?: string;
  messages: Message[];
  archived?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export interface ClassModel {
  id: string;
  instituteId?: string;
  instituteName?: string;
  instituteAddress?: string;
  name: string;
  academicYear: string;
  semester: string;
  subject: string;
  teacherName: string;
  teachingStyle: string[];
  experienceLevel: string;
  specialNotes?: string;
  assessmentPreferences?: string[];
  materials: Material[];
  instructions: Instruction[];
  students: Student[];
  ragSessions: RAGSession[];
  attendanceRecords?: AttendanceRecord[];
  archived?: boolean;
  isArchived?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  subject: string;
  teachingStyle: string[];
  experienceLevel?: string;
  assessmentPreferences?: string[];
  instructions: Omit<Instruction, 'id'>[];
  materialsPreset?: Omit<Material, 'id' | 'uploadDate'>[];
  defaultCustomFields?: CustomField[];
  archived?: boolean;
  isArchived?: boolean;
}
