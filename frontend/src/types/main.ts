import { Database } from "./db";

export type content_type = Database["public"]["Enums"]["content_type"];
export type ContentCategory = Database["public"]["Enums"]["content_category"];
export type InstructionType = Database["public"]["Enums"]["instruction_type"];

export interface ContentItem {
  id?: string;
  name?: string;
  type: content_type; // 'File' | 'URL'
  path?: string;
  value?: string; // Legacy alias for path/name
  description?: string;
  signedUrl?: string;
}

export interface Material {
  id: string;
  name: string;
  category: ContentCategory;
  type?: string; // Legacy alias
  content: ContentItem[];
  uploadDate: string; // mapped from created_at
  size?: string;
  tags?: string[];
  dueAt?: string;
  maxScore?: number;
  toBeScored?: boolean;
  isArchived?: boolean;
  rubricCriteria?: any;
  versionHistory?: { version: string; date: string; note: string }[];
}

export interface Instruction {
  id: string;
  title: string;
  type: string;
  content: string;
  whenToApply?: string;
  isArchived?: boolean;
}

export interface StudentUpload {
  id: string;
  name: string;
  type: string;
  date: string;
  status: 'graded' | 'pending';
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
  student_id?: string;
  studentId?: string;
  material_id?: string;
  content?: ContentItem[];
  status?: string;
  score?: number;
  max_score?: number;
  grade?: string;
  feedback?: string;
  submittedAt?: string;
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
  grades?: any[];
  attendance?: any;
  performanceIndicator?: 'excellent' | 'good' | 'average' | 'critical' | 'High' | 'Average' | 'At Risk';
  performanceTier?: 'High' | 'Average' | 'At Risk';
  statusIndicator?: 'active' | 'inactive' | 'needs-attention';
  uploads?: StudentUpload[];
  submissions?: any[];
  customFields?: CustomField[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachments?: { name: string; type: string }[];
  visualization?: {
    type: 'charts' | 'heatmap' | 'ranking' | 'timeline' | 'radar' | 'stats';
    title: string;
    description?: string;
    data: any;
  };
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
  teachingStyle: any;
  experienceLevel: string;
  specialNotes?: string;
  assessmentPreferences?: any;
  materials: Material[];
  instructions: Instruction[];
  students: Student[];
  ragSessions: RAGSession[];
  archived?: boolean;
  isArchived?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  subject: string;
  teachingStyle: any;
  experienceLevel?: string;
  assessmentPreferences?: any;
  instructions: Omit<Instruction, 'id'>[];
  materialsPreset?: Omit<Material, 'id' | 'uploadDate'>[];
  defaultCustomFields?: any[];
  archived?: boolean;
  isArchived?: boolean;
}
