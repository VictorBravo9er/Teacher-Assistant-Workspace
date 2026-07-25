export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
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
          class_id: string
          content: string
          created_at: string
          id: string
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          class_id: string
          content: string
          created_at?: string
          id?: string
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          class_id?: string
          content?: string
          created_at?: string
          id?: string
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          class_id: string
          id: string
          name: string
          size: string | null
          storage_path: string | null
          tags: string[] | null
          type: string | null
          upload_date: string
          user_id: string
          version_history: Json | null
        }
        Insert: {
          class_id: string
          id?: string
          name: string
          size?: string | null
          storage_path?: string | null
          tags?: string[] | null
          type?: string | null
          upload_date?: string
          user_id: string
          version_history?: Json | null
        }
        Update: {
          class_id?: string
          id?: string
          name?: string
          size?: string | null
          storage_path?: string | null
          tags?: string[] | null
          type?: string | null
          upload_date?: string
          user_id?: string
          version_history?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
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
      templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
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
          instructions?: Json | null
          materials_preset?: Json | null
          name?: string
          subject?: string | null
          teaching_style?: string | null
          user_id?: string
        }
        Relationships: []
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
