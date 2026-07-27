export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          status: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          class_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_instructions: {
        Row: {
          class_id: string
          created_at: string
          instruction_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          instruction_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          instruction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_instructions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_instructions_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_materials: {
        Row: {
          class_id: string
          created_at: string
          material_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          material_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          material_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          attendance: Json | null
          behavioral_notes: string | null
          class_id: string
          grades: Json | null
          performance_tier: string | null
          student_id: string
        }
        Insert: {
          attendance?: Json | null
          behavioral_notes?: string | null
          class_id: string
          grades?: Json | null
          performance_tier?: string | null
          student_id: string
        }
        Update: {
          attendance?: Json | null
          behavioral_notes?: string | null
          class_id?: string
          grades?: Json | null
          performance_tier?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string | null
          archived: boolean | null
          assessment_preferences: string | null
          created_at: string
          experience_level: string | null
          id: string
          institute_id: string | null
          name: string
          semester: string | null
          special_notes: string | null
          subject: string | null
          teacher_name: string | null
          teaching_style: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          academic_year?: string | null
          archived?: boolean | null
          assessment_preferences?: string | null
          created_at?: string
          experience_level?: string | null
          id?: string
          institute_id?: string | null
          name: string
          semester?: string | null
          special_notes?: string | null
          subject?: string | null
          teacher_name?: string | null
          teaching_style?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          academic_year?: string | null
          archived?: boolean | null
          assessment_preferences?: string | null
          created_at?: string
          experience_level?: string | null
          id?: string
          institute_id?: string | null
          name?: string
          semester?: string | null
          special_notes?: string | null
          subject?: string | null
          teacher_name?: string | null
          teaching_style?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
      institutes: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          id: string
          name: string
          state: string | null
          type: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name: string
          state?: string | null
          type?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          district?: string | null
          id?: string
          name?: string
          state?: string | null
          type?: string | null
        }
        Relationships: []
      }
      instructions: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean | null
          title: string
          type: string | null
          user_id: string
          when_to_apply: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title: string
          type?: string | null
          user_id: string
          when_to_apply?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
          when_to_apply?: string | null
        }
        Relationships: []
      }
      materials: {
        Row: {
          category: string
          content_type: string
          created_at: string
          id: string
          link_urls: string[] | null
          name: string
          size: string | null
          storage_paths: string[] | null
          tags: string[] | null
          user_id: string
          version_history: Json | null
        }
        Insert: {
          category?: string
          content_type?: string
          created_at?: string
          id?: string
          link_urls?: string[] | null
          name: string
          size?: string | null
          storage_paths?: string[] | null
          tags?: string[] | null
          user_id: string
          version_history?: Json | null
        }
        Update: {
          category?: string
          content_type?: string
          created_at?: string
          id?: string
          link_urls?: string[] | null
          name?: string
          size?: string | null
          storage_paths?: string[] | null
          tags?: string[] | null
          user_id?: string
          version_history?: Json | null
        }
        Relationships: []
      }
      student_materials: {
        Row: {
          class_id: string
          content: string | null
          created_at: string
          due_at: string | null
          feedback: string | null
          grade: string | null
          graded_at: string | null
          id: string
          is_late: boolean | null
          material_id: string | null
          max_score: number | null
          private_teacher_notes: string | null
          rubric_breakdown: Json | null
          score: number | null
          status: string
          storage_paths: string[] | null
          student_id: string
          submission_type: string
          submission_urls: string[] | null
          submitted_at: string | null
        }
        Insert: {
          class_id: string
          content?: string | null
          created_at?: string
          due_at?: string | null
          feedback?: string | null
          grade?: string | null
          graded_at?: string | null
          id?: string
          is_late?: boolean | null
          material_id?: string | null
          max_score?: number | null
          private_teacher_notes?: string | null
          rubric_breakdown?: Json | null
          score?: number | null
          status?: string
          storage_paths?: string[] | null
          student_id: string
          submission_type?: string
          submission_urls?: string[] | null
          submitted_at?: string | null
        }
        Update: {
          class_id?: string
          content?: string | null
          created_at?: string
          due_at?: string | null
          feedback?: string | null
          grade?: string | null
          graded_at?: string | null
          id?: string
          is_late?: boolean | null
          material_id?: string | null
          max_score?: number | null
          private_teacher_notes?: string | null
          rubric_breakdown?: Json | null
          score?: number | null
          status?: string
          storage_paths?: string[] | null
          student_id?: string
          submission_type?: string
          submission_urls?: string[] | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_materials_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          learning_style: string | null
          name: string
          strengths: string[] | null
          user_id: string
          weaknesses: string[] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          learning_style?: string | null
          name: string
          strengths?: string[] | null
          user_id: string
          weaknesses?: string[] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          learning_style?: string | null
          name?: string
          strengths?: string[] | null
          user_id?: string
          weaknesses?: string[] | null
        }
        Relationships: []
      }
      template_instructions: {
        Row: {
          created_at: string
          instruction_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          instruction_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          instruction_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_instructions_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "instructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_instructions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      template_materials: {
        Row: {
          created_at: string
          material_id: string
          template_id: string
        }
        Insert: {
          created_at?: string
          material_id: string
          template_id: string
        }
        Update: {
          created_at?: string
          material_id?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_materials_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          institute_id: string | null
          instructions: Json | null
          materials_preset: Json | null
          name: string
          subject: string | null
          teaching_style: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string | null
          instructions?: Json | null
          materials_preset?: Json | null
          name: string
          subject?: string | null
          teaching_style?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          institute_id?: string | null
          instructions?: Json | null
          materials_preset?: Json | null
          name?: string
          subject?: string | null
          teaching_style?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_institute_id_fkey"
            columns: ["institute_id"]
            isOneToOne: false
            referencedRelation: "institutes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_cities: {
        Args: { search_term: string }
        Returns: {
          result: string
        }[]
      }
      search_countries: {
        Args: { search_term: string }
        Returns: {
          result: string
        }[]
      }
      search_districts: {
        Args: { search_term: string }
        Returns: {
          result: string
        }[]
      }
      search_institutes: {
        Args: { search_term: string }
        Returns: {
          city: string | null
          country: string | null
          created_at: string
          district: string | null
          id: string
          name: string
          state: string | null
          type: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "institutes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_states: {
        Args: { search_term: string }
        Returns: {
          result: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

