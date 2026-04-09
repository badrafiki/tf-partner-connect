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
      applications: {
        Row: {
          annual_volume_estimate: string | null
          ap_email: string | null
          ap_first_name: string | null
          ap_last_name: string | null
          ap_phone: string | null
          ap_same_as_primary: boolean | null
          ap_title: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_account_type: string | null
          bank_name: string | null
          bank_routing_number: string | null
          business_type: string | null
          contact_department: string | null
          contact_direct_phone: string | null
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contact_mobile: string | null
          contact_title: string | null
          date_established: string | null
          ein: string | null
          general_email: string | null
          geographic_coverage: string | null
          how_heard: string | null
          id: string
          industries_served: string | null
          legal_business_name: string
          monthly_order_frequency: string | null
          preferred_payment_method: string | null
          primary_address_city: string | null
          primary_address_state: string | null
          primary_address_street: string | null
          primary_address_zip: string | null
          primary_phone: string | null
          reg_address_city: string | null
          reg_address_state: string | null
          reg_address_street: string | null
          reg_address_zip: string | null
          requested_credit_limit: string | null
          requested_payment_terms: string | null
          resale_certificate_status: string | null
          resale_states: string | null
          reviewed_at: string | null
          reviewer_notes: string | null
          sales_channels: string | null
          ship_additional_locations: boolean | null
          ship_address_city: string | null
          ship_address_state: string | null
          ship_address_street: string | null
          ship_address_zip: string | null
          ship_carrier_account: string | null
          ship_carrier_name: string | null
          ship_preferred_method: string | null
          ship_same_as_business: boolean | null
          ship_special_instructions: string | null
          status: string
          submitted_at: string | null
          tax_exempt: boolean | null
          trade_references: Json | null
          trading_name: string | null
          website: string | null
          years_in_business: string | null
        }
        Insert: {
          annual_volume_estimate?: string | null
          ap_email?: string | null
          ap_first_name?: string | null
          ap_last_name?: string | null
          ap_phone?: string | null
          ap_same_as_primary?: boolean | null
          ap_title?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_type?: string | null
          contact_department?: string | null
          contact_direct_phone?: string | null
          contact_email: string
          contact_first_name: string
          contact_last_name: string
          contact_mobile?: string | null
          contact_title?: string | null
          date_established?: string | null
          ein?: string | null
          general_email?: string | null
          geographic_coverage?: string | null
          how_heard?: string | null
          id?: string
          industries_served?: string | null
          legal_business_name: string
          monthly_order_frequency?: string | null
          preferred_payment_method?: string | null
          primary_address_city?: string | null
          primary_address_state?: string | null
          primary_address_street?: string | null
          primary_address_zip?: string | null
          primary_phone?: string | null
          reg_address_city?: string | null
          reg_address_state?: string | null
          reg_address_street?: string | null
          reg_address_zip?: string | null
          requested_credit_limit?: string | null
          requested_payment_terms?: string | null
          resale_certificate_status?: string | null
          resale_states?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          sales_channels?: string | null
          ship_additional_locations?: boolean | null
          ship_address_city?: string | null
          ship_address_state?: string | null
          ship_address_street?: string | null
          ship_address_zip?: string | null
          ship_carrier_account?: string | null
          ship_carrier_name?: string | null
          ship_preferred_method?: string | null
          ship_same_as_business?: boolean | null
          ship_special_instructions?: string | null
          status?: string
          submitted_at?: string | null
          tax_exempt?: boolean | null
          trade_references?: Json | null
          trading_name?: string | null
          website?: string | null
          years_in_business?: string | null
        }
        Update: {
          annual_volume_estimate?: string | null
          ap_email?: string | null
          ap_first_name?: string | null
          ap_last_name?: string | null
          ap_phone?: string | null
          ap_same_as_primary?: boolean | null
          ap_title?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_account_type?: string | null
          bank_name?: string | null
          bank_routing_number?: string | null
          business_type?: string | null
          contact_department?: string | null
          contact_direct_phone?: string | null
          contact_email?: string
          contact_first_name?: string
          contact_last_name?: string
          contact_mobile?: string | null
          contact_title?: string | null
          date_established?: string | null
          ein?: string | null
          general_email?: string | null
          geographic_coverage?: string | null
          how_heard?: string | null
          id?: string
          industries_served?: string | null
          legal_business_name?: string
          monthly_order_frequency?: string | null
          preferred_payment_method?: string | null
          primary_address_city?: string | null
          primary_address_state?: string | null
          primary_address_street?: string | null
          primary_address_zip?: string | null
          primary_phone?: string | null
          reg_address_city?: string | null
          reg_address_state?: string | null
          reg_address_street?: string | null
          reg_address_zip?: string | null
          requested_credit_limit?: string | null
          requested_payment_terms?: string | null
          resale_certificate_status?: string | null
          resale_states?: string | null
          reviewed_at?: string | null
          reviewer_notes?: string | null
          sales_channels?: string | null
          ship_additional_locations?: boolean | null
          ship_address_city?: string | null
          ship_address_state?: string | null
          ship_address_street?: string | null
          ship_address_zip?: string | null
          ship_carrier_account?: string | null
          ship_carrier_name?: string | null
          ship_preferred_method?: string | null
          ship_same_as_business?: boolean | null
          ship_special_instructions?: string | null
          status?: string
          submitted_at?: string | null
          tax_exempt?: boolean | null
          trade_references?: Json | null
          trading_name?: string | null
          website?: string | null
          years_in_business?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          id: string
          line_items: Json
          notes: string | null
          partner_id: string
          status: string
          submitted_at: string | null
          total_list_usd: number | null
          total_partner_usd: number | null
        }
        Insert: {
          id?: string
          line_items: Json
          notes?: string | null
          partner_id: string
          status?: string
          submitted_at?: string | null
          total_list_usd?: number | null
          total_partner_usd?: number | null
        }
        Update: {
          id?: string
          line_items?: Json
          notes?: string | null
          partner_id?: string
          status?: string
          submitted_at?: string | null
          total_list_usd?: number | null
          total_partner_usd?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          partner_id: string
          read: boolean
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          partner_id: string
          read?: boolean
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          partner_id?: string
          read?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_favourites: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_favourites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_favourites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_partner_view"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          assigned_rep: string | null
          company_logo_url: string | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at: string | null
          discount_percentage: number
          ein: string | null
          id: string
          phone: string | null
          state: string | null
          tier_label: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          assigned_rep?: string | null
          company_logo_url?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          created_at?: string | null
          discount_percentage?: number
          ein?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          tier_label?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          assigned_rep?: string | null
          company_logo_url?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          created_at?: string | null
          discount_percentage?: number
          ein?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          tier_label?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          cost_price_usd: number | null
          created_at: string | null
          description: string | null
          family: string | null
          hidden: boolean
          id: string
          list_price_usd: number
          name: string
          sku: string
          stock_qty: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          cost_price_usd?: number | null
          created_at?: string | null
          description?: string | null
          family?: string | null
          hidden?: boolean
          id?: string
          list_price_usd: number
          name: string
          sku: string
          stock_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          cost_price_usd?: number | null
          created_at?: string | null
          description?: string | null
          family?: string | null
          hidden?: boolean
          id?: string
          list_price_usd?: number
          name?: string
          sku?: string
          stock_qty?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quotations: {
        Row: {
          enquiry_id: string | null
          expires_at: string | null
          id: string
          issued_at: string | null
          notes: string | null
          partner_id: string
          pdf_url: string | null
          status: string
        }
        Insert: {
          enquiry_id?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          partner_id: string
          pdf_url?: string | null
          status?: string
        }
        Update: {
          enquiry_id?: string | null
          expires_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          partner_id?: string
          pdf_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotations_enquiry_id_fkey"
            columns: ["enquiry_id"]
            isOneToOne: false
            referencedRelation: "enquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      products_partner_view: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          family: string | null
          hidden: boolean | null
          id: string | null
          list_price_usd: number | null
          name: string | null
          sku: string | null
          stock_qty: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          family?: string | null
          hidden?: boolean | null
          id?: string | null
          list_price_usd?: number | null
          name?: string | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          family?: string | null
          hidden?: boolean | null
          id?: string | null
          list_price_usd?: number | null
          name?: string | null
          sku?: string | null
          stock_qty?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: { Args: { r: string; uid: string }; Returns: boolean }
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
