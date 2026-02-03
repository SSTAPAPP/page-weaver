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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string
          date: string
          id: string
          member_id: string | null
          member_name: string
          member_phone: string | null
          service_id: string | null
          service_name: string
          status: string | null
          time: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          member_id?: string | null
          member_name: string
          member_phone?: string | null
          service_id?: string | null
          service_name: string
          status?: string | null
          time: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          member_id?: string | null
          member_name?: string
          member_phone?: string | null
          service_id?: string | null
          service_name?: string
          status?: string | null
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          category: string
          created_at: string
          details: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          category: string
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      card_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          price: number
          service_ids: string[] | null
          total_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          service_ids?: string[] | null
          total_count: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          service_ids?: string[] | null
          total_count?: number
        }
        Relationships: []
      }
      member_cards: {
        Row: {
          created_at: string
          id: string
          member_id: string
          original_price: number
          original_total_count: number
          remaining_count: number
          services: string[] | null
          template_id: string | null
          template_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          original_price: number
          original_total_count: number
          remaining_count: number
          services?: string[] | null
          template_id?: string | null
          template_name: string
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          original_price?: number
          original_total_count?: number
          remaining_count?: number
          services?: string[] | null
          template_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_cards_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          balance: number | null
          created_at: string
          gender: string | null
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          balance?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          balance?: number | null
          created_at?: string
          gender?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string
          id: string
          member_id: string
          member_name: string
          payments: Json
          services: Json
          total_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          member_id: string
          member_name: string
          payments: Json
          services: Json
          total_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          member_id?: string
          member_name?: string
          payments?: Json
          services?: Json
          total_amount?: number
        }
        Relationships: []
      }
      services: {
        Row: {
          category: string
          created_at: string
          duration: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
        }
        Insert: {
          category: string
          created_at?: string
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
        }
        Update: {
          category?: string
          created_at?: string
          duration?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          admin_password_hash: string | null
          font_size: string | null
          id: string
          shop_address: string | null
          shop_name: string | null
          shop_phone: string | null
          sidebar_collapsed: boolean | null
          sync_config: Json | null
          theme: string | null
          updated_at: string
        }
        Insert: {
          admin_password_hash?: string | null
          font_size?: string | null
          id?: string
          shop_address?: string | null
          shop_name?: string | null
          shop_phone?: string | null
          sidebar_collapsed?: boolean | null
          sync_config?: Json | null
          theme?: string | null
          updated_at?: string
        }
        Update: {
          admin_password_hash?: string | null
          font_size?: string | null
          id?: string
          shop_address?: string | null
          shop_name?: string | null
          shop_phone?: string | null
          sidebar_collapsed?: boolean | null
          sync_config?: Json | null
          theme?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          created_at: string
          data: Json
          id: string
          operation: string
          retries: number | null
          table_name: string
        }
        Insert: {
          created_at?: string
          data: Json
          id?: string
          operation: string
          retries?: number | null
          table_name: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          operation?: string
          retries?: number | null
          table_name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          member_id: string
          member_name: string
          payment_method: string | null
          related_transaction_id: string | null
          sub_transactions: Json | null
          type: string
          voided: boolean | null
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          member_id: string
          member_name: string
          payment_method?: string | null
          related_transaction_id?: string | null
          sub_transactions?: Json | null
          type: string
          voided?: boolean | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          member_id?: string
          member_name?: string
          payment_method?: string | null
          related_transaction_id?: string | null
          sub_transactions?: Json | null
          type?: string
          voided?: boolean | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
