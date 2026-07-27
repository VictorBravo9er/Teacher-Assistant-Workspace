export interface Material {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'book' | 'syllabus' | 'custom';
  uploadDate: string;
  size: string;
  tags: string[];
  versionHistory?: { version: string; date: string; note: string }[];
}

export interface Instruction {
  id: string;
  title: string;
  type: 'global' | 'subject' | 'marking' | 'criteria' | 'preference';
  content: string;
}

export interface Grade {
  id: string;
  assessmentName: string;
  score: number;
  maxScore: number;
  date: string;
  feedback?: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'boolean' | 'tag';
  value: string;
  visibility: boolean;
}

export interface StudentUpload {
  id: string;
  name: string;
  type: string;
  date: string;
  status: 'graded' | 'pending';
}

export interface Student {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  phone: string;
  address: string;
  parentName: string;
  parentContact: string;
  parentNotes: string;
  grades: Grade[];
  attendance: number; // e.g., 92%
  performanceIndicator: 'excellent' | 'good' | 'average' | 'critical';
  statusIndicator: 'active' | 'inactive' | 'needs-attention';
  uploads: StudentUpload[];
  customFields: CustomField[];
  avatarSeed?: string; // String for generating simple visual profile
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
    data: any; // Dynamic JSON parsed array/object depending on chart type
  };
}

export interface RAGSession {
  id: string;
  title: string;
  type: string; // e.g. student-performance, topic-detection, learning-gap
  scopeType: 'class' | 'students' | 'materials' | 'assessments';
  selectedIds: string[];
  customInstructions?: string;
  messages: Message[];
  archived?: boolean;
  createdAt: string;
}

export interface ClassModel {
  id: string;
  instituteId?: string;
  name: string;
  academicYear: string;
  semester: string;
  subject: string;
  teacherName: string;
  teachingStyle: string;
  experienceLevel: string;
  specialNotes?: string;
  assessmentPreferences?: string;
  materials: Material[];
  instructions: Instruction[];
  students: Student[];
  ragSessions: RAGSession[];
  archived?: boolean;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  subject: string;
  teachingStyle: string;
  instructions: Omit<Instruction, 'id'>[];
  materialsPreset: Omit<Material, 'id' | 'uploadDate'>[];
  defaultCustomFields?: Omit<CustomField, 'id'>[];
}
