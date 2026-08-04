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
      admin_chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "admin_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_chat_threads: {
        Row: {
          created_at: string
          id: string
          last_message_at: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      areas: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      billing_records: {
        Row: {
          billing_status: string
          business_id: string
          courier_payment: number
          created_at: string
          customer_price: number
          error_message: string | null
          id: string
          job_id: string
          paypal_capture_id: string | null
          paypal_order_id: string | null
          paypal_payout_batch_id: string | null
          platform_fee: number
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_status?: string
          business_id: string
          courier_payment?: number
          created_at?: string
          customer_price?: number
          error_message?: string | null
          id?: string
          job_id: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payout_batch_id?: string | null
          platform_fee?: number
          provider?: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_status?: string
          business_id?: string
          courier_payment?: number
          created_at?: string
          customer_price?: number
          error_message?: string | null
          id?: string
          job_id?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          paypal_payout_batch_id?: string | null
          platform_fee?: number
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_records_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_ai_config: {
        Row: {
          ai_enabled: boolean
          id: string
          knowledge_base: string | null
          model: string
          scope: string
          system_prompt: string
          temperature: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_enabled?: boolean
          id?: string
          knowledge_base?: string | null
          model?: string
          scope?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_enabled?: boolean
          id?: string
          knowledge_base?: string | null
          model?: string
          scope?: string
          system_prompt?: string
          temperature?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bot_conversation_tags: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          note: string | null
          phone: string
          tag: string
          tagged_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          note?: string | null
          phone: string
          tag: string
          tagged_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          note?: string | null
          phone?: string
          tag?: string
          tagged_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_conversation_tags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_conversations: {
        Row: {
          assigned_to: string | null
          courier_id: string | null
          created_at: string
          customer_id: string | null
          display_name: string | null
          handling_status: Database["public"]["Enums"]["bot_handling_status"]
          id: string
          last_message: string | null
          phone: string
          updated_at: string
          user_type: Database["public"]["Enums"]["bot_user_type"]
        }
        Insert: {
          assigned_to?: string | null
          courier_id?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          handling_status?: Database["public"]["Enums"]["bot_handling_status"]
          id?: string
          last_message?: string | null
          phone: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["bot_user_type"]
        }
        Update: {
          assigned_to?: string | null
          courier_id?: string | null
          created_at?: string
          customer_id?: string | null
          display_name?: string | null
          handling_status?: Database["public"]["Enums"]["bot_handling_status"]
          id?: string
          last_message?: string | null
          phone?: string
          updated_at?: string
          user_type?: Database["public"]["Enums"]["bot_user_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bot_conversations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bot_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_template_versions: {
        Row: {
          buttons: Json
          created_at: string
          edit_note: string | null
          edited_by: string | null
          footer: string | null
          id: string
          is_active: boolean
          message_body: string | null
          template_id: string
          template_key: string
          version: number
        }
        Insert: {
          buttons?: Json
          created_at?: string
          edit_note?: string | null
          edited_by?: string | null
          footer?: string | null
          id?: string
          is_active?: boolean
          message_body?: string | null
          template_id: string
          template_key: string
          version: number
        }
        Update: {
          buttons?: Json
          created_at?: string
          edit_note?: string | null
          edited_by?: string | null
          footer?: string | null
          id?: string
          is_active?: boolean
          message_body?: string | null
          template_id?: string
          template_key?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bot_template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bot_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_templates: {
        Row: {
          audience: Database["public"]["Enums"]["message_audience"]
          buttons: Json
          category: Database["public"]["Enums"]["bot_template_category"]
          created_at: string
          description: string | null
          footer: string | null
          id: string
          is_active: boolean
          message_body: string
          template_key: string
          template_name: string
          trigger_event: string | null
          updated_at: string
          updated_by: string | null
          variables_supported: string[]
          version: number
        }
        Insert: {
          audience: Database["public"]["Enums"]["message_audience"]
          buttons?: Json
          category?: Database["public"]["Enums"]["bot_template_category"]
          created_at?: string
          description?: string | null
          footer?: string | null
          id?: string
          is_active?: boolean
          message_body: string
          template_key: string
          template_name: string
          trigger_event?: string | null
          updated_at?: string
          updated_by?: string | null
          variables_supported?: string[]
          version?: number
        }
        Update: {
          audience?: Database["public"]["Enums"]["message_audience"]
          buttons?: Json
          category?: Database["public"]["Enums"]["bot_template_category"]
          created_at?: string
          description?: string | null
          footer?: string | null
          id?: string
          is_active?: boolean
          message_body?: string
          template_key?: string
          template_name?: string
          trigger_event?: string | null
          updated_at?: string
          updated_by?: string | null
          variables_supported?: string[]
          version?: number
        }
        Relationships: []
      }
      bot_training_examples: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          expected_reply: string
          id: string
          is_active: boolean
          notes: string | null
          user_message: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          expected_reply: string
          id?: string
          is_active?: boolean
          notes?: string | null
          user_message: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          expected_reply?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          user_message?: string
        }
        Relationships: []
      }
      business_branches: {
        Row: {
          branch_name: string
          business_hours: string | null
          business_id: string
          city: string | null
          contact_person: string | null
          courier_notes: string | null
          created_at: string
          full_address: string | null
          id: string
          is_default: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          branch_name: string
          business_hours?: string | null
          business_id: string
          city?: string | null
          contact_person?: string | null
          courier_notes?: string | null
          created_at?: string
          full_address?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          branch_name?: string
          business_hours?: string | null
          business_id?: string
          city?: string | null
          contact_person?: string | null
          courier_notes?: string | null
          created_at?: string
          full_address?: string | null
          id?: string
          is_default?: boolean
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_branches_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_favorite_couriers: {
        Row: {
          business_id: string
          courier_id: string
          created_at: string
          id: string
          status: string
        }
        Insert: {
          business_id: string
          courier_id: string
          created_at?: string
          id?: string
          status?: string
        }
        Update: {
          business_id?: string
          courier_id?: string
          created_at?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_favorite_couriers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_favorite_couriers_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_integrations: {
        Row: {
          allowed_origins: string[]
          auto_mode: boolean
          business_id: string
          created_at: string
          default_fixed_price: number | null
          default_pricing_type: string
          enabled: boolean
          id: string
          integration_token: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          allowed_origins?: string[]
          auto_mode?: boolean
          business_id: string
          created_at?: string
          default_fixed_price?: number | null
          default_pricing_type?: string
          enabled?: boolean
          id?: string
          integration_token?: string
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          allowed_origins?: string[]
          auto_mode?: boolean
          business_id?: string
          created_at?: string
          default_fixed_price?: number | null
          default_pricing_type?: string
          enabled?: boolean
          id?: string
          integration_token?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_integrations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_notifications: {
        Row: {
          body: string | null
          business_id: string
          created_at: string
          id: string
          job_id: string | null
          kind: string
          link: string | null
          read_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          business_id: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          business_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      business_push_subscriptions: {
        Row: {
          auth: string
          business_id: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          business_id: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          business_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_push_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_recurring_orders: {
        Row: {
          active: boolean
          branch_id: string | null
          business_id: string
          couriers_needed: number | null
          created_at: string
          days_of_week: number[] | null
          dropoff_address: string | null
          end_time: string | null
          id: string
          notes: string | null
          payment: number | null
          pickup_address: string | null
          recurrence_type: string
          start_time: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          branch_id?: string | null
          business_id: string
          couriers_needed?: number | null
          created_at?: string
          days_of_week?: number[] | null
          dropoff_address?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          payment?: number | null
          pickup_address?: string | null
          recurrence_type: string
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          branch_id?: string | null
          business_id?: string
          couriers_needed?: number | null
          created_at?: string
          days_of_week?: number[] | null
          dropoff_address?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          payment?: number | null
          pickup_address?: string | null
          recurrence_type?: string
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_recurring_orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_recurring_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_team_members: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string
          id: string
          invited_at: string
          name: string
          phone: string
          role: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string
          id?: string
          invited_at?: string
          name: string
          phone: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          name?: string
          phone?: string
          role?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_team_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      classification_rules: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          field: string
          id: string
          operator: string
          tag_id: string
          value: string
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          field: string
          id?: string
          operator: string
          tag_id: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          field?: string
          id?: string
          operator?: string
          tag_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "classification_rules_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          business_id: string | null
          courier_id: string | null
          created_at: string
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at: string
          last_message_preview: string | null
          subject: string | null
          unread_admin: number
          unread_business: number
          unread_courier: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string
          last_message_preview?: string | null
          subject?: string | null
          unread_admin?: number
          unread_business?: number
          unread_courier?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["conversation_kind"]
          last_message_at?: string
          last_message_preview?: string | null
          subject?: string | null
          unread_admin?: number
          unread_business?: number
          unread_courier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          amount_applied: number
          business_id: string
          coupon_id: string
          created_at: string
          id: string
          job_id: string | null
        }
        Insert: {
          amount_applied: number
          business_id: string
          coupon_id: string
          created_at?: string
          id?: string
          job_id?: string | null
        }
        Update: {
          amount_applied?: number
          business_id?: string
          coupon_id?: string
          created_at?: string
          id?: string
          job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_redemptions: number | null
          per_user_limit: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          per_user_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_redemptions?: number | null
          per_user_limit?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      courier_admin_notifications: {
        Row: {
          audience: string
          body: string | null
          courier_id: string | null
          created_at: string
          id: string
          link_url: string | null
          read_at: string | null
          sent_by: string | null
          title: string
        }
        Insert: {
          audience?: string
          body?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          sent_by?: string | null
          title: string
        }
        Update: {
          audience?: string
          body?: string | null
          courier_id?: string | null
          created_at?: string
          id?: string
          link_url?: string | null
          read_at?: string | null
          sent_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_admin_notifications_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_bonuses: {
        Row: {
          amount: number
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          icon: string
          id: string
          is_active: boolean
          sort_order: number
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      courier_contact_leads: {
        Row: {
          created_at: string
          id: string
          message: string | null
          name: string
          phone: string
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          name: string
          phone: string
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          source?: string | null
        }
        Relationships: []
      }
      courier_job_declines: {
        Row: {
          courier_id: string
          declined_at: string
          id: string
          job_id: string
        }
        Insert: {
          courier_id: string
          declined_at?: string
          id?: string
          job_id: string
        }
        Update: {
          courier_id?: string
          declined_at?: string
          id?: string
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_job_declines_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_job_declines_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_location_pings: {
        Row: {
          accuracy_m: number | null
          courier_id: string
          id: number
          lat: number
          lng: number
          recorded_at: string
        }
        Insert: {
          accuracy_m?: number | null
          courier_id: string
          id?: number
          lat: number
          lng: number
          recorded_at?: string
        }
        Update: {
          accuracy_m?: number | null
          courier_id?: string
          id?: number
          lat?: number
          lng?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_location_pings_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_password_resets: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      courier_push_subscriptions: {
        Row: {
          auth: string
          courier_id: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          courier_id: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          courier_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_push_subscriptions_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_stats: {
        Row: {
          acceptance_rate: number | null
          avg_rating: number | null
          avg_response_seconds: number | null
          computed_at: string
          courier_id: string
          jobs_cancelled: number
          jobs_completed: number
          last_active_at: string | null
          offers_accepted: number
          offers_declined: number
          offers_no_response: number
          offers_total: number
          on_time_rate: number | null
        }
        Insert: {
          acceptance_rate?: number | null
          avg_rating?: number | null
          avg_response_seconds?: number | null
          computed_at?: string
          courier_id: string
          jobs_cancelled?: number
          jobs_completed?: number
          last_active_at?: string | null
          offers_accepted?: number
          offers_declined?: number
          offers_no_response?: number
          offers_total?: number
          on_time_rate?: number | null
        }
        Update: {
          acceptance_rate?: number | null
          avg_rating?: number | null
          avg_response_seconds?: number | null
          computed_at?: string
          courier_id?: string
          jobs_cancelled?: number
          jobs_completed?: number
          last_active_at?: string | null
          offers_accepted?: number
          offers_declined?: number
          offers_no_response?: number
          offers_total?: number
          on_time_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_stats_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: true
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      courier_tags: {
        Row: {
          assigned_automatically: boolean
          courier_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          assigned_automatically?: boolean
          courier_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          assigned_automatically?: boolean
          courier_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "courier_tags_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          acceptance_rate: number | null
          accepting_jobs: boolean
          address: string | null
          admin_jobs_blocked: boolean
          auto_pause_after_declines: number
          availability: string[]
          avatar_url: string | null
          balance: number
          bank_account: string | null
          bank_account_owner: string | null
          bank_branch: string | null
          bank_details_verified: boolean
          bank_details_verified_at: string | null
          bank_details_verified_by: string | null
          bank_name: string | null
          base_city: string | null
          bio: string | null
          birth_date: string | null
          cargo_capacity: string | null
          city_of_residence: string | null
          consecutive_declines: number
          consent_whatsapp: boolean
          courier_experience_duration: string | null
          courier_experience_status: string | null
          courier_kind: Database["public"]["Enums"]["courier_kind"]
          courier_status: Database["public"]["Enums"]["courier_status"]
          created_at: string
          custom_dropoff_area: string | null
          custom_pickup_area: string | null
          custom_work_area: string | null
          delivery_bag: string | null
          dropoff_areas: string[]
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          experience: string | null
          full_name: string
          gender: string | null
          has_thermal_bag: boolean | null
          home_lat: number | null
          home_lng: number | null
          id: string
          id_document_url: string | null
          id_number: string | null
          id_photo_back_url: string | null
          id_photo_url: string | null
          insurance_expires_at: string | null
          invoice_status: string | null
          is_paused: boolean
          job_types: Database["public"]["Enums"]["job_type"][]
          languages: string[]
          last_incoming_message_at: string | null
          last_lat: number | null
          last_lng: number | null
          last_location_at: string | null
          last_message_status: string | null
          last_temp_password: string | null
          lead_source: string | null
          license_expires_at: string | null
          location_sharing_enabled: boolean
          max_concurrent_jobs: number
          max_distance: string[] | null
          max_package_value: number | null
          notes: string | null
          offers_accepted_total: number
          offers_sent_total: number
          password_set_at: string | null
          pause_until: string | null
          paused_at: string | null
          paused_reason: string | null
          pickup_areas: string[]
          preferred_job_types: string[]
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          service_window_expires_at: string | null
          typical_hours: string[]
          updated_at: string
          user_id: string | null
          vehicle_label: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_types: string[]
          whatsapp_opt_in: boolean
          whatsapp_phone: string
          whatsapp_provider: string | null
          work_distance_from_base: string | null
          working_areas: string[]
        }
        Insert: {
          acceptance_rate?: number | null
          accepting_jobs?: boolean
          address?: string | null
          admin_jobs_blocked?: boolean
          auto_pause_after_declines?: number
          availability?: string[]
          avatar_url?: string | null
          balance?: number
          bank_account?: string | null
          bank_account_owner?: string | null
          bank_branch?: string | null
          bank_details_verified?: boolean
          bank_details_verified_at?: string | null
          bank_details_verified_by?: string | null
          bank_name?: string | null
          base_city?: string | null
          bio?: string | null
          birth_date?: string | null
          cargo_capacity?: string | null
          city_of_residence?: string | null
          consecutive_declines?: number
          consent_whatsapp?: boolean
          courier_experience_duration?: string | null
          courier_experience_status?: string | null
          courier_kind?: Database["public"]["Enums"]["courier_kind"]
          courier_status?: Database["public"]["Enums"]["courier_status"]
          created_at?: string
          custom_dropoff_area?: string | null
          custom_pickup_area?: string | null
          custom_work_area?: string | null
          delivery_bag?: string | null
          dropoff_areas?: string[]
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience?: string | null
          full_name: string
          gender?: string | null
          has_thermal_bag?: boolean | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_photo_back_url?: string | null
          id_photo_url?: string | null
          insurance_expires_at?: string | null
          invoice_status?: string | null
          is_paused?: boolean
          job_types?: Database["public"]["Enums"]["job_type"][]
          languages?: string[]
          last_incoming_message_at?: string | null
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          last_message_status?: string | null
          last_temp_password?: string | null
          lead_source?: string | null
          license_expires_at?: string | null
          location_sharing_enabled?: boolean
          max_concurrent_jobs?: number
          max_distance?: string[] | null
          max_package_value?: number | null
          notes?: string | null
          offers_accepted_total?: number
          offers_sent_total?: number
          password_set_at?: string | null
          pause_until?: string | null
          paused_at?: string | null
          paused_reason?: string | null
          pickup_areas?: string[]
          preferred_job_types?: string[]
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          service_window_expires_at?: string | null
          typical_hours?: string[]
          updated_at?: string
          user_id?: string | null
          vehicle_label?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_types?: string[]
          whatsapp_opt_in?: boolean
          whatsapp_phone: string
          whatsapp_provider?: string | null
          work_distance_from_base?: string | null
          working_areas?: string[]
        }
        Update: {
          acceptance_rate?: number | null
          accepting_jobs?: boolean
          address?: string | null
          admin_jobs_blocked?: boolean
          auto_pause_after_declines?: number
          availability?: string[]
          avatar_url?: string | null
          balance?: number
          bank_account?: string | null
          bank_account_owner?: string | null
          bank_branch?: string | null
          bank_details_verified?: boolean
          bank_details_verified_at?: string | null
          bank_details_verified_by?: string | null
          bank_name?: string | null
          base_city?: string | null
          bio?: string | null
          birth_date?: string | null
          cargo_capacity?: string | null
          city_of_residence?: string | null
          consecutive_declines?: number
          consent_whatsapp?: boolean
          courier_experience_duration?: string | null
          courier_experience_status?: string | null
          courier_kind?: Database["public"]["Enums"]["courier_kind"]
          courier_status?: Database["public"]["Enums"]["courier_status"]
          created_at?: string
          custom_dropoff_area?: string | null
          custom_pickup_area?: string | null
          custom_work_area?: string | null
          delivery_bag?: string | null
          dropoff_areas?: string[]
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience?: string | null
          full_name?: string
          gender?: string | null
          has_thermal_bag?: boolean | null
          home_lat?: number | null
          home_lng?: number | null
          id?: string
          id_document_url?: string | null
          id_number?: string | null
          id_photo_back_url?: string | null
          id_photo_url?: string | null
          insurance_expires_at?: string | null
          invoice_status?: string | null
          is_paused?: boolean
          job_types?: Database["public"]["Enums"]["job_type"][]
          languages?: string[]
          last_incoming_message_at?: string | null
          last_lat?: number | null
          last_lng?: number | null
          last_location_at?: string | null
          last_message_status?: string | null
          last_temp_password?: string | null
          lead_source?: string | null
          license_expires_at?: string | null
          location_sharing_enabled?: boolean
          max_concurrent_jobs?: number
          max_distance?: string[] | null
          max_package_value?: number | null
          notes?: string | null
          offers_accepted_total?: number
          offers_sent_total?: number
          password_set_at?: string | null
          pause_until?: string | null
          paused_at?: string | null
          paused_reason?: string | null
          pickup_areas?: string[]
          preferred_job_types?: string[]
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          service_window_expires_at?: string | null
          typical_hours?: string[]
          updated_at?: string
          user_id?: string | null
          vehicle_label?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          vehicle_types?: string[]
          whatsapp_opt_in?: boolean
          whatsapp_phone?: string
          whatsapp_provider?: string | null
          work_distance_from_base?: string | null
          working_areas?: string[]
        }
        Relationships: []
      }
      customer_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          account_mode: string
          address: string | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          business_category: string | null
          business_hours: string | null
          business_name: string | null
          business_niche: string
          business_tax_id: string | null
          city: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"]
          default_delivery_price: number | null
          default_delivery_window_minutes: number | null
          default_pricing_type: string | null
          delivery_cities: string[]
          dispatch_blocked_reason: string | null
          email: string | null
          favorites_fallback_minutes: number
          favorites_first_enabled: boolean
          id: string
          invoice_required: boolean
          last_incoming_message_at: string | null
          last_message_status: string | null
          last_temp_password: string | null
          logo_url: string | null
          marketing_opt_in: boolean | null
          name: string
          niche_details: Json
          notes: string | null
          notify_email: boolean
          notify_recipient_allowed: boolean
          notify_recipient_enabled: boolean
          notify_wa: boolean
          operating_hours: Json | null
          password_set_at: string | null
          payment_method_added_at: string | null
          payment_method_brand: string | null
          payment_method_last4: string | null
          payment_method_on_file: boolean
          payment_provider: string | null
          paypal_email: string | null
          paypal_payer_id: string | null
          paypal_setup_at: string | null
          paypal_vault_id: string | null
          permanent_courier_notes: string | null
          phone: string
          pickup_address: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_instructions: string | null
          pickup_redispatch_minutes: number
          pickup_reminder_minutes: number
          pickup_watchdog_enabled: boolean
          preferred_job_type:
            | Database["public"]["Enums"]["preferred_job_type"]
            | null
          preferred_vehicle_types: string[] | null
          service_areas: string[] | null
          service_type: string | null
          service_window_expires_at: string | null
          signed_agreement_at: string | null
          signed_agreement_name: string | null
          signed_agreement_version: string | null
          status: Database["public"]["Enums"]["customer_status"]
          terms_accepted_at: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
          whatsapp_opt_in: boolean
          whatsapp_provider: string | null
        }
        Insert: {
          account_mode?: string
          address?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          business_category?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_niche?: string
          business_tax_id?: string | null
          city?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          default_delivery_price?: number | null
          default_delivery_window_minutes?: number | null
          default_pricing_type?: string | null
          delivery_cities?: string[]
          dispatch_blocked_reason?: string | null
          email?: string | null
          favorites_fallback_minutes?: number
          favorites_first_enabled?: boolean
          id?: string
          invoice_required?: boolean
          last_incoming_message_at?: string | null
          last_message_status?: string | null
          last_temp_password?: string | null
          logo_url?: string | null
          marketing_opt_in?: boolean | null
          name: string
          niche_details?: Json
          notes?: string | null
          notify_email?: boolean
          notify_recipient_allowed?: boolean
          notify_recipient_enabled?: boolean
          notify_wa?: boolean
          operating_hours?: Json | null
          password_set_at?: string | null
          payment_method_added_at?: string | null
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          payment_method_on_file?: boolean
          payment_provider?: string | null
          paypal_email?: string | null
          paypal_payer_id?: string | null
          paypal_setup_at?: string | null
          paypal_vault_id?: string | null
          permanent_courier_notes?: string | null
          phone: string
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_instructions?: string | null
          pickup_redispatch_minutes?: number
          pickup_reminder_minutes?: number
          pickup_watchdog_enabled?: boolean
          preferred_job_type?:
            | Database["public"]["Enums"]["preferred_job_type"]
            | null
          preferred_vehicle_types?: string[] | null
          service_areas?: string[] | null
          service_type?: string | null
          service_window_expires_at?: string | null
          signed_agreement_at?: string | null
          signed_agreement_name?: string | null
          signed_agreement_version?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_provider?: string | null
        }
        Update: {
          account_mode?: string
          address?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          business_category?: string | null
          business_hours?: string | null
          business_name?: string | null
          business_niche?: string
          business_tax_id?: string | null
          city?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"]
          default_delivery_price?: number | null
          default_delivery_window_minutes?: number | null
          default_pricing_type?: string | null
          delivery_cities?: string[]
          dispatch_blocked_reason?: string | null
          email?: string | null
          favorites_fallback_minutes?: number
          favorites_first_enabled?: boolean
          id?: string
          invoice_required?: boolean
          last_incoming_message_at?: string | null
          last_message_status?: string | null
          last_temp_password?: string | null
          logo_url?: string | null
          marketing_opt_in?: boolean | null
          name?: string
          niche_details?: Json
          notes?: string | null
          notify_email?: boolean
          notify_recipient_allowed?: boolean
          notify_recipient_enabled?: boolean
          notify_wa?: boolean
          operating_hours?: Json | null
          password_set_at?: string | null
          payment_method_added_at?: string | null
          payment_method_brand?: string | null
          payment_method_last4?: string | null
          payment_method_on_file?: boolean
          payment_provider?: string | null
          paypal_email?: string | null
          paypal_payer_id?: string | null
          paypal_setup_at?: string | null
          paypal_vault_id?: string | null
          permanent_courier_notes?: string | null
          phone?: string
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_instructions?: string | null
          pickup_redispatch_minutes?: number
          pickup_reminder_minutes?: number
          pickup_watchdog_enabled?: boolean
          preferred_job_type?:
            | Database["public"]["Enums"]["preferred_job_type"]
            | null
          preferred_vehicle_types?: string[] | null
          service_areas?: string[] | null
          service_type?: string | null
          service_window_expires_at?: string | null
          signed_agreement_at?: string | null
          signed_agreement_name?: string | null
          signed_agreement_version?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          whatsapp_opt_in?: boolean
          whatsapp_provider?: string | null
        }
        Relationships: []
      }
      delivery_status_events: {
        Row: {
          actor_id: string | null
          actor_type: string
          created_at: string
          delivery_id: string
          id: string
          metadata: Json
          new_status: string
          previous_status: string | null
          reason: string | null
          source: string
        }
        Insert: {
          actor_id?: string | null
          actor_type: string
          created_at?: string
          delivery_id: string
          id?: string
          metadata?: Json
          new_status: string
          previous_status?: string | null
          reason?: string | null
          source?: string
        }
        Update: {
          actor_id?: string | null
          actor_type?: string
          created_at?: string
          delivery_id?: string
          id?: string
          metadata?: Json
          new_status?: string
          previous_status?: string | null
          reason?: string | null
          source?: string
        }
        Relationships: []
      }
      delivery_status_history: {
        Row: {
          action_source: string
          courier_id: string | null
          created_at: string
          external_message_id: string | null
          id: string
          job_id: string
          metadata: Json | null
          new_status: string
          previous_status: string | null
        }
        Insert: {
          action_source?: string
          courier_id?: string | null
          created_at?: string
          external_message_id?: string | null
          id?: string
          job_id: string
          metadata?: Json | null
          new_status: string
          previous_status?: string | null
        }
        Update: {
          action_source?: string
          courier_id?: string | null
          created_at?: string
          external_message_id?: string | null
          id?: string
          job_id?: string
          metadata?: Json | null
          new_status?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_status_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_templates: {
        Row: {
          business_id: string
          created_at: string
          id: string
          last_used_at: string | null
          payload: Json
          template_name: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          payload: Json
          template_name: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          payload?: Json
          template_name?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      express_pricing_rules: {
        Row: {
          allow_customer_fixed_price: boolean
          allow_customer_quote: boolean
          base_price: number
          deposit_percent: number
          display_name: string
          id: string
          min_price: number
          notes: string | null
          payment_mode: string
          price_per_km: number
          service_category: string
          updated_at: string
        }
        Insert: {
          allow_customer_fixed_price?: boolean
          allow_customer_quote?: boolean
          base_price?: number
          deposit_percent?: number
          display_name: string
          id?: string
          min_price?: number
          notes?: string | null
          payment_mode?: string
          price_per_km?: number
          service_category: string
          updated_at?: string
        }
        Update: {
          allow_customer_fixed_price?: boolean
          allow_customer_quote?: boolean
          base_price?: number
          deposit_percent?: number
          display_name?: string
          id?: string
          min_price?: number
          notes?: string | null
          payment_mode?: string
          price_per_km?: number
          service_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      green_api_webhook_events: {
        Row: {
          button_id: string | null
          button_text: string | null
          courier_id: string | null
          delivery_id: string | null
          external_message_id: string | null
          id: string
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          raw_payload: Json
          received_at: string
          sender_chat_id: string | null
          sender_phone: string | null
          type_message: string | null
          type_webhook: string | null
        }
        Insert: {
          button_id?: string | null
          button_text?: string | null
          courier_id?: string | null
          delivery_id?: string | null
          external_message_id?: string | null
          id?: string
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          raw_payload: Json
          received_at?: string
          sender_chat_id?: string | null
          sender_phone?: string | null
          type_message?: string | null
          type_webhook?: string | null
        }
        Update: {
          button_id?: string | null
          button_text?: string | null
          courier_id?: string | null
          delivery_id?: string | null
          external_message_id?: string | null
          id?: string
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          raw_payload?: Json
          received_at?: string
          sender_chat_id?: string | null
          sender_phone?: string | null
          type_message?: string | null
          type_webhook?: string | null
        }
        Relationships: []
      }
      integration_request_logs: {
        Row: {
          business_id: string
          created_at: string
          error: string | null
          id: string
          ip: string | null
          job_id: string | null
          payload: Json | null
          source: string
          status: string
        }
        Insert: {
          business_id: string
          created_at?: string
          error?: string | null
          id?: string
          ip?: string | null
          job_id?: string | null
          payload?: Json | null
          source?: string
          status?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          error?: string | null
          id?: string
          ip?: string | null
          job_id?: string | null
          payload?: Json | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_request_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_request_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_leads: {
        Row: {
          created_at: string
          full_name: string
          id: string
          job_id: string
          kind: string
          note: string | null
          partner_slug: string | null
          phone: string
          price: number | null
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          job_id: string
          kind: string
          note?: string | null
          partner_slug?: string | null
          phone: string
          price?: number | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          job_id?: string
          kind?: string
          note?: string | null
          partner_slug?: string | null
          phone?: string
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_leads_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_outcomes: {
        Row: {
          cancellation_reason: string | null
          courier_id: string | null
          created_at: string
          customer_comment: string | null
          customer_rating: number | null
          delivered_at: string | null
          expected_delivery_at: string | null
          id: string
          internal_notes: string | null
          job_id: string
          late_minutes: number | null
          picked_up_at: string | null
          tip_amount: number | null
          updated_at: string
          was_cancelled: boolean
          was_late: boolean | null
        }
        Insert: {
          cancellation_reason?: string | null
          courier_id?: string | null
          created_at?: string
          customer_comment?: string | null
          customer_rating?: number | null
          delivered_at?: string | null
          expected_delivery_at?: string | null
          id?: string
          internal_notes?: string | null
          job_id: string
          late_minutes?: number | null
          picked_up_at?: string | null
          tip_amount?: number | null
          updated_at?: string
          was_cancelled?: boolean
          was_late?: boolean | null
        }
        Update: {
          cancellation_reason?: string | null
          courier_id?: string | null
          created_at?: string
          customer_comment?: string | null
          customer_rating?: number | null
          delivered_at?: string | null
          expected_delivery_at?: string | null
          id?: string
          internal_notes?: string | null
          job_id?: string
          late_minutes?: number | null
          picked_up_at?: string | null
          tip_amount?: number | null
          updated_at?: string
          was_cancelled?: boolean
          was_late?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "job_outcomes_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_outcomes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_quotes: {
        Row: {
          courier_completed_jobs_snapshot: number | null
          courier_id: string
          courier_rating_snapshot: number | null
          courier_response_time_snapshot: number | null
          created_at: string
          customer_id: string | null
          estimated_arrival_minutes: number | null
          estimated_delivery_minutes: number | null
          id: string
          includes_invoice: boolean
          is_final_price: boolean
          job_id: string
          note: string | null
          price: number
          selected_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
        }
        Insert: {
          courier_completed_jobs_snapshot?: number | null
          courier_id: string
          courier_rating_snapshot?: number | null
          courier_response_time_snapshot?: number | null
          created_at?: string
          customer_id?: string | null
          estimated_arrival_minutes?: number | null
          estimated_delivery_minutes?: number | null
          id?: string
          includes_invoice?: boolean
          is_final_price?: boolean
          job_id: string
          note?: string | null
          price: number
          selected_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Update: {
          courier_completed_jobs_snapshot?: number | null
          courier_id?: string
          courier_rating_snapshot?: number | null
          courier_response_time_snapshot?: number | null
          created_at?: string
          customer_id?: string | null
          estimated_arrival_minutes?: number | null
          estimated_delivery_minutes?: number | null
          id?: string
          includes_invoice?: boolean
          is_final_price?: boolean
          job_id?: string
          note?: string | null
          price?: number
          selected_at?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_quotes_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stops: {
        Row: {
          address: string | null
          area: string | null
          arrived_at: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          done_at: string | null
          fragile: boolean | null
          id: string
          job_id: string
          lat: number | null
          linked_pickup_id: string | null
          lng: number | null
          notes: string | null
          number_of_packages: number | null
          package_description: string | null
          package_size: string | null
          proof_photo_url: string | null
          public_token: string | null
          signature_url: string | null
          status: Database["public"]["Enums"]["stop_status"]
          stop_order: number
          stop_type: Database["public"]["Enums"]["stop_type"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          arrived_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          done_at?: string | null
          fragile?: boolean | null
          id?: string
          job_id: string
          lat?: number | null
          linked_pickup_id?: string | null
          lng?: number | null
          notes?: string | null
          number_of_packages?: number | null
          package_description?: string | null
          package_size?: string | null
          proof_photo_url?: string | null
          public_token?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["stop_status"]
          stop_order: number
          stop_type: Database["public"]["Enums"]["stop_type"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          area?: string | null
          arrived_at?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          done_at?: string | null
          fragile?: boolean | null
          id?: string
          job_id?: string
          lat?: number | null
          linked_pickup_id?: string | null
          lng?: number | null
          notes?: string | null
          number_of_packages?: number | null
          package_description?: string | null
          package_size?: string | null
          proof_photo_url?: string | null
          public_token?: string | null
          signature_url?: string | null
          status?: Database["public"]["Enums"]["stop_status"]
          stop_order?: number
          stop_type?: Database["public"]["Enums"]["stop_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stops_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_stops_linked_pickup_id_fkey"
            columns: ["linked_pickup_id"]
            isOneToOne: false
            referencedRelation: "job_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      job_tags: {
        Row: {
          job_id: string
          tag_id: string
        }
        Insert: {
          job_id: string
          tag_id: string
        }
        Update: {
          job_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_tags_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          accepted_at: string | null
          arrived_at_dropoff_at: string | null
          arrived_at_pickup_at: string | null
          base_price: number | null
          courier_step: string | null
          couriers_needed: number
          created_at: string
          created_by: string | null
          current_status_updated_at: string | null
          customer_id: string | null
          customer_logo_path: string | null
          customer_name: string | null
          customer_price: number | null
          delivered_at: string | null
          delivery_deadline: string | null
          delivery_status: string | null
          description: string | null
          distance_km: number | null
          dropoff_address: string | null
          dropoff_apartment: string | null
          dropoff_area: string | null
          dropoff_building: string | null
          dropoff_entrance: string | null
          dropoff_floor: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          dropoff_notes: string | null
          estimated_distance_km: number | null
          favorites_only_dispatched_at: string | null
          favorites_only_fallback_done: boolean
          final_price: number | null
          fragile: boolean
          guest_name: string | null
          guest_phone: string | null
          heading_to_dropoff_at: string | null
          heading_to_pickup_at: string | null
          id: string
          invoice_required: boolean
          is_multi_stop: boolean
          item_category: string | null
          item_value: number | null
          job_date: string | null
          job_number: string
          job_time: string | null
          job_type: Database["public"]["Enums"]["job_type"]
          matching_couriers_count: number
          matching_model: string | null
          max_quotes_to_show: number
          notify_recipient: boolean | null
          number_of_packages: number | null
          package_size: string | null
          package_type: string | null
          partner_id: string | null
          payment: number
          paypal_order_id: string | null
          per_job_amount: number | null
          per_job_paid: boolean
          picked_up_at: string | null
          pickup_address: string | null
          pickup_area: string | null
          pickup_branch_id: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_instructions: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_notes: string | null
          pickup_ready: boolean
          pickup_ready_at: string | null
          pickup_redispatch_count: number
          pickup_redispatch_minutes: number | null
          pickup_redispatched_at: string | null
          pickup_reminder_minutes: number | null
          pickup_reminder_sent_at: string | null
          pickup_watchdog_enabled: boolean | null
          pilot_area_override: boolean
          platform_fee: number | null
          price_per_km: number | null
          pricing_snapshot: Json | null
          pricing_type: string
          quote_deadline_at: string | null
          recipient_name: string | null
          recipient_phone: string | null
          recipient_tracking_token: string | null
          requires_cash: boolean
          requires_refrigeration: boolean
          requires_thermal_bag: boolean
          selected_courier_id: string | null
          selected_quote_id: string | null
          service_category: string | null
          short_code: string | null
          status: Database["public"]["Enums"]["job_status"]
          stops_count: number | null
          suggested_courier_payment: number | null
          time_window_minutes: number | null
          tip_amount: number | null
          total_distance_km: number | null
          updated_at: string
          vehicle_required: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          accepted_at?: string | null
          arrived_at_dropoff_at?: string | null
          arrived_at_pickup_at?: string | null
          base_price?: number | null
          courier_step?: string | null
          couriers_needed?: number
          created_at?: string
          created_by?: string | null
          current_status_updated_at?: string | null
          customer_id?: string | null
          customer_logo_path?: string | null
          customer_name?: string | null
          customer_price?: number | null
          delivered_at?: string | null
          delivery_deadline?: string | null
          delivery_status?: string | null
          description?: string | null
          distance_km?: number | null
          dropoff_address?: string | null
          dropoff_apartment?: string | null
          dropoff_area?: string | null
          dropoff_building?: string | null
          dropoff_entrance?: string | null
          dropoff_floor?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_notes?: string | null
          estimated_distance_km?: number | null
          favorites_only_dispatched_at?: string | null
          favorites_only_fallback_done?: boolean
          final_price?: number | null
          fragile?: boolean
          guest_name?: string | null
          guest_phone?: string | null
          heading_to_dropoff_at?: string | null
          heading_to_pickup_at?: string | null
          id?: string
          invoice_required?: boolean
          is_multi_stop?: boolean
          item_category?: string | null
          item_value?: number | null
          job_date?: string | null
          job_number?: string
          job_time?: string | null
          job_type?: Database["public"]["Enums"]["job_type"]
          matching_couriers_count?: number
          matching_model?: string | null
          max_quotes_to_show?: number
          notify_recipient?: boolean | null
          number_of_packages?: number | null
          package_size?: string | null
          package_type?: string | null
          partner_id?: string | null
          payment?: number
          paypal_order_id?: string | null
          per_job_amount?: number | null
          per_job_paid?: boolean
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_area?: string | null
          pickup_branch_id?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_instructions?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_notes?: string | null
          pickup_ready?: boolean
          pickup_ready_at?: string | null
          pickup_redispatch_count?: number
          pickup_redispatch_minutes?: number | null
          pickup_redispatched_at?: string | null
          pickup_reminder_minutes?: number | null
          pickup_reminder_sent_at?: string | null
          pickup_watchdog_enabled?: boolean | null
          pilot_area_override?: boolean
          platform_fee?: number | null
          price_per_km?: number | null
          pricing_snapshot?: Json | null
          pricing_type?: string
          quote_deadline_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_tracking_token?: string | null
          requires_cash?: boolean
          requires_refrigeration?: boolean
          requires_thermal_bag?: boolean
          selected_courier_id?: string | null
          selected_quote_id?: string | null
          service_category?: string | null
          short_code?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stops_count?: number | null
          suggested_courier_payment?: number | null
          time_window_minutes?: number | null
          tip_amount?: number | null
          total_distance_km?: number | null
          updated_at?: string
          vehicle_required?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          accepted_at?: string | null
          arrived_at_dropoff_at?: string | null
          arrived_at_pickup_at?: string | null
          base_price?: number | null
          courier_step?: string | null
          couriers_needed?: number
          created_at?: string
          created_by?: string | null
          current_status_updated_at?: string | null
          customer_id?: string | null
          customer_logo_path?: string | null
          customer_name?: string | null
          customer_price?: number | null
          delivered_at?: string | null
          delivery_deadline?: string | null
          delivery_status?: string | null
          description?: string | null
          distance_km?: number | null
          dropoff_address?: string | null
          dropoff_apartment?: string | null
          dropoff_area?: string | null
          dropoff_building?: string | null
          dropoff_entrance?: string | null
          dropoff_floor?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          dropoff_notes?: string | null
          estimated_distance_km?: number | null
          favorites_only_dispatched_at?: string | null
          favorites_only_fallback_done?: boolean
          final_price?: number | null
          fragile?: boolean
          guest_name?: string | null
          guest_phone?: string | null
          heading_to_dropoff_at?: string | null
          heading_to_pickup_at?: string | null
          id?: string
          invoice_required?: boolean
          is_multi_stop?: boolean
          item_category?: string | null
          item_value?: number | null
          job_date?: string | null
          job_number?: string
          job_time?: string | null
          job_type?: Database["public"]["Enums"]["job_type"]
          matching_couriers_count?: number
          matching_model?: string | null
          max_quotes_to_show?: number
          notify_recipient?: boolean | null
          number_of_packages?: number | null
          package_size?: string | null
          package_type?: string | null
          partner_id?: string | null
          payment?: number
          paypal_order_id?: string | null
          per_job_amount?: number | null
          per_job_paid?: boolean
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_area?: string | null
          pickup_branch_id?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_instructions?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_notes?: string | null
          pickup_ready?: boolean
          pickup_ready_at?: string | null
          pickup_redispatch_count?: number
          pickup_redispatch_minutes?: number | null
          pickup_redispatched_at?: string | null
          pickup_reminder_minutes?: number | null
          pickup_reminder_sent_at?: string | null
          pickup_watchdog_enabled?: boolean | null
          pilot_area_override?: boolean
          platform_fee?: number | null
          price_per_km?: number | null
          pricing_snapshot?: Json | null
          pricing_type?: string
          quote_deadline_at?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_tracking_token?: string | null
          requires_cash?: boolean
          requires_refrigeration?: boolean
          requires_thermal_bag?: boolean
          selected_courier_id?: string | null
          selected_quote_id?: string | null
          service_category?: string | null
          short_code?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          stops_count?: number | null
          suggested_courier_payment?: number | null
          time_window_minutes?: number | null
          tip_amount?: number | null
          total_distance_km?: number | null
          updated_at?: string
          vehicle_required?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_pickup_branch_id_fkey"
            columns: ["pickup_branch_id"]
            isOneToOne: false
            referencedRelation: "business_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_selected_courier_id_fkey"
            columns: ["selected_courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          kiosk_id: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          kiosk_id?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          kiosk_id?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_categories_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosk_products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          kiosk_id: string
          name: string
          price: number
          sort_order: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          kiosk_id: string
          name: string
          price: number
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          kiosk_id?: string
          name?: string
          price?: number
          sort_order?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kiosk_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kiosk_products_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      kiosks: {
        Row: {
          address: string
          city: string | null
          created_at: string
          delivery_fee_default: number
          hours: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_open: boolean
          lat: number | null
          lng: number | null
          name: string
          rating: number | null
          rating_count: number | null
          service_fee_default: number
          updated_at: string
        }
        Insert: {
          address: string
          city?: string | null
          created_at?: string
          delivery_fee_default?: number
          hours?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          rating?: number | null
          rating_count?: number | null
          service_fee_default?: number
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string | null
          created_at?: string
          delivery_fee_default?: number
          hours?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_open?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          rating?: number | null
          rating_count?: number | null
          service_fee_default?: number
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachment_kind: string | null
          attachment_mime: string | null
          attachment_name: string | null
          attachment_size: number | null
          attachment_url: string | null
          body: string | null
          conversation_id: string
          created_at: string
          duration_ms: number | null
          id: string
          sender_role: Database["public"]["Enums"]["sender_role"]
          sender_user_id: string
        }
        Insert: {
          attachment_kind?: string | null
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string | null
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          sender_role: Database["public"]["Enums"]["sender_role"]
          sender_user_id: string
        }
        Update: {
          attachment_kind?: string | null
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_size?: number | null
          attachment_url?: string | null
          body?: string | null
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          sender_role?: Database["public"]["Enums"]["sender_role"]
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      munch_orders: {
        Row: {
          cancelled_at: string | null
          confirmed_at: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee: number
          dropoff_address: string
          dropoff_lat: number | null
          dropoff_lng: number | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          items: Json
          job_id: string | null
          kiosk_id: string
          notes: string | null
          picked_up_at: string | null
          ready_at: string | null
          rejection_reason: string | null
          service_fee: number
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          dropoff_address: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          items?: Json
          job_id?: string | null
          kiosk_id: string
          notes?: string | null
          picked_up_at?: string | null
          ready_at?: string | null
          rejection_reason?: string | null
          service_fee?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee?: number
          dropoff_address?: string
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          items?: Json
          job_id?: string | null
          kiosk_id?: string
          notes?: string | null
          picked_up_at?: string | null
          ready_at?: string | null
          rejection_reason?: string | null
          service_fee?: number
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "munch_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "munch_orders_kiosk_id_fkey"
            columns: ["kiosk_id"]
            isOneToOne: false
            referencedRelation: "kiosks"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number
          body: string | null
          buttons: Json | null
          channel: string
          created_at: string
          external_message_id: string | null
          id: string
          job_id: string | null
          last_error: string | null
          max_attempts: number
          message_type: string
          next_attempt_at: string
          provider: string | null
          recipient_business_id: string | null
          recipient_courier_id: string | null
          recipient_phone: string
          sent_at: string | null
          status: string
          template_name: string | null
          template_params: Json | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          body?: string | null
          buttons?: Json | null
          channel?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          job_id?: string | null
          last_error?: string | null
          max_attempts?: number
          message_type?: string
          next_attempt_at?: string
          provider?: string | null
          recipient_business_id?: string | null
          recipient_courier_id?: string | null
          recipient_phone: string
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_params?: Json | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          body?: string | null
          buttons?: Json | null
          channel?: string
          created_at?: string
          external_message_id?: string | null
          id?: string
          job_id?: string | null
          last_error?: string | null
          max_attempts?: number
          message_type?: string
          next_attempt_at?: string
          provider?: string | null
          recipient_business_id?: string | null
          recipient_courier_id?: string | null
          recipient_phone?: string
          sent_at?: string | null
          status?: string
          template_name?: string | null
          template_params?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      offer_events: {
        Row: {
          channel: Database["public"]["Enums"]["offer_channel"]
          courier_id: string
          courier_lat: number | null
          courier_lng: number | null
          created_at: string
          decline_reason: string | null
          distance_km: number | null
          expires_at: string | null
          id: string
          job_id: string
          match_score: number | null
          metadata: Json
          responded_at: string | null
          response: Database["public"]["Enums"]["offer_response"]
          sent_at: string
          updated_at: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["offer_channel"]
          courier_id: string
          courier_lat?: number | null
          courier_lng?: number | null
          created_at?: string
          decline_reason?: string | null
          distance_km?: number | null
          expires_at?: string | null
          id?: string
          job_id: string
          match_score?: number | null
          metadata?: Json
          responded_at?: string | null
          response?: Database["public"]["Enums"]["offer_response"]
          sent_at?: string
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["offer_channel"]
          courier_id?: string
          courier_lat?: number | null
          courier_lng?: number | null
          created_at?: string
          decline_reason?: string | null
          distance_km?: number | null
          expires_at?: string | null
          id?: string
          job_id?: string
          match_score?: number | null
          metadata?: Json
          responded_at?: string | null
          response?: Database["public"]["Enums"]["offer_response"]
          sent_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_events_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          contact_phone: string | null
          created_at: string
          dispatch_note: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          message_cta: string | null
          message_sections: Json
          name: string
          slug: string
          updated_at: string
          whatsapp_group_id: string | null
        }
        Insert: {
          contact_phone?: string | null
          created_at?: string
          dispatch_note?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          message_cta?: string | null
          message_sections?: Json
          name: string
          slug: string
          updated_at?: string
          whatsapp_group_id?: string | null
        }
        Update: {
          contact_phone?: string | null
          created_at?: string
          dispatch_note?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          message_cta?: string | null
          message_sections?: Json
          name?: string
          slug?: string
          updated_at?: string
          whatsapp_group_id?: string | null
        }
        Relationships: []
      }
      paypal_payouts: {
        Row: {
          amount_ils: number
          courier_id: string | null
          created_at: string
          currency: string
          error_message: string | null
          id: string
          paypal_batch_id: string | null
          paypal_payout_item_id: string | null
          recipient_email: string
          sender_batch_id: string
          status: string
          updated_at: string
          withdrawal_request_id: string | null
        }
        Insert: {
          amount_ils: number
          courier_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          paypal_batch_id?: string | null
          paypal_payout_item_id?: string | null
          recipient_email: string
          sender_batch_id: string
          status?: string
          updated_at?: string
          withdrawal_request_id?: string | null
        }
        Update: {
          amount_ils?: number
          courier_id?: string | null
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          paypal_batch_id?: string | null
          paypal_payout_item_id?: string | null
          recipient_email?: string
          sender_batch_id?: string
          status?: string
          updated_at?: string
          withdrawal_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paypal_payouts_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paypal_payouts_withdrawal_request_id_fkey"
            columns: ["withdrawal_request_id"]
            isOneToOne: false
            referencedRelation: "withdrawal_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      paypal_webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          received_at: string
          resource_id: string | null
          resource_type: string | null
          verified: boolean
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          received_at?: string
          resource_id?: string | null
          resource_type?: string | null
          verified?: boolean
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          received_at?: string
          resource_id?: string | null
          resource_type?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      pilot_cities: {
        Row: {
          city_name: string
          created_at: string
          id: string
          is_active: boolean
          max_radius_km: number | null
          notes: string | null
          updated_at: string
        }
        Insert: {
          city_name: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_radius_km?: number | null
          notes?: string | null
          updated_at?: string
        }
        Update: {
          city_name?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_radius_km?: number | null
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      pricing_rules: {
        Row: {
          base_price: number
          created_at: string
          extra_stop_fee: number
          heavy_package_surcharge: number
          id: string
          is_active: boolean
          minimum_price: number
          name: string
          night_surcharge_percent: number
          notes: string | null
          platform_fee_fixed: number
          platform_fee_percent: number
          price_per_km: number
          updated_at: string
          version: number
          waiting_fee_per_minute: number
          weekend_surcharge_percent: number
        }
        Insert: {
          base_price?: number
          created_at?: string
          extra_stop_fee?: number
          heavy_package_surcharge?: number
          id?: string
          is_active?: boolean
          minimum_price?: number
          name: string
          night_surcharge_percent?: number
          notes?: string | null
          platform_fee_fixed?: number
          platform_fee_percent?: number
          price_per_km?: number
          updated_at?: string
          version?: number
          waiting_fee_per_minute?: number
          weekend_surcharge_percent?: number
        }
        Update: {
          base_price?: number
          created_at?: string
          extra_stop_fee?: number
          heavy_package_surcharge?: number
          id?: string
          is_active?: boolean
          minimum_price?: number
          name?: string
          night_surcharge_percent?: number
          notes?: string | null
          platform_fee_fixed?: number
          platform_fee_percent?: number
          price_per_km?: number
          updated_at?: string
          version?: number
          waiting_fee_per_minute?: number
          weekend_surcharge_percent?: number
        }
        Relationships: []
      }
      saved_contacts: {
        Row: {
          business_id: string
          city: string | null
          contact_name: string
          created_at: string
          full_address: string | null
          id: string
          last_used_at: string | null
          notes: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
          usage_count: number
        }
        Insert: {
          business_id: string
          city?: string | null
          contact_name: string
          created_at?: string
          full_address?: string | null
          id?: string
          last_used_at?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          usage_count?: number
        }
        Update: {
          business_id?: string
          city?: string | null
          contact_name?: string
          created_at?: string
          full_address?: string | null
          id?: string
          last_used_at?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_contacts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      status_logs: {
        Row: {
          changed_by: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
        }
        Relationships: []
      }
      storefront_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          storefront_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          storefront_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_categories_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_orders: {
        Row: {
          business_id: string
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          delivery_mode: string
          dropoff_address: string
          dropoff_city: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          id: string
          items: Json
          job_id: string | null
          notes: string | null
          order_number: string
          payment_method: string
          payment_status: string
          scheduled_for: string | null
          status: string
          storefront_id: string
          stripe_payment_intent_id: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          delivery_mode?: string
          dropoff_address: string
          dropoff_city?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          items: Json
          job_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          scheduled_for?: string | null
          status?: string
          storefront_id: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          delivery_mode?: string
          dropoff_address?: string
          dropoff_city?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          id?: string
          items?: Json
          job_id?: string | null
          notes?: string | null
          order_number?: string
          payment_method?: string
          payment_status?: string
          scheduled_for?: string | null
          status?: string
          storefront_id?: string
          stripe_payment_intent_id?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_orders_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          price: number
          sort_order: number
          stock: number | null
          storefront_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          price?: number
          sort_order?: number
          stock?: number | null
          storefront_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          price?: number
          sort_order?: number
          stock?: number | null
          storefront_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefront_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "storefront_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "storefront_products_storefront_id_fkey"
            columns: ["storefront_id"]
            isOneToOne: false
            referencedRelation: "storefronts"
            referencedColumns: ["id"]
          },
        ]
      }
      storefronts: {
        Row: {
          allow_scheduling: boolean
          banner_url: string | null
          brand_color: string | null
          business_id: string
          created_at: string
          default_courier_payment: number | null
          default_pricing_type: string
          default_vehicle_type: string | null
          delivery_fee: number | null
          delivery_window_minutes: number | null
          description: string | null
          id: string
          is_active: boolean
          is_open: boolean
          logo_url: string | null
          min_order_amount: number | null
          name: string
          opening_hours: Json | null
          payment_mode: string
          platform_fee_percent: number | null
          slug: string
          stripe_account_id: string | null
          stripe_charges_enabled: boolean
          updated_at: string
        }
        Insert: {
          allow_scheduling?: boolean
          banner_url?: string | null
          brand_color?: string | null
          business_id: string
          created_at?: string
          default_courier_payment?: number | null
          default_pricing_type?: string
          default_vehicle_type?: string | null
          delivery_fee?: number | null
          delivery_window_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          logo_url?: string | null
          min_order_amount?: number | null
          name: string
          opening_hours?: Json | null
          payment_mode?: string
          platform_fee_percent?: number | null
          slug: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          updated_at?: string
        }
        Update: {
          allow_scheduling?: boolean
          banner_url?: string | null
          brand_color?: string | null
          business_id?: string
          created_at?: string
          default_courier_payment?: number | null
          default_pricing_type?: string
          default_vehicle_type?: string | null
          delivery_fee?: number | null
          delivery_window_minutes?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          is_open?: boolean
          logo_url?: string | null
          min_order_amount?: number | null
          name?: string
          opening_hours?: Json | null
          payment_mode?: string
          platform_fee_percent?: number | null
          slug?: string
          stripe_account_id?: string | null
          stripe_charges_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "storefronts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          business_id: string
          created_at: string
          id: string
          issue_type: string
          job_id: string | null
          message: string
          status: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          issue_type: string
          job_id?: string | null
          message: string
          status?: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          issue_type?: string
          job_id?: string | null
          message?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_automatic: boolean
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_automatic?: boolean
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_automatic?: boolean
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wa_bot_state: {
        Row: {
          courier_id: string | null
          created_at: string
          customer_id: string | null
          expires_at: string
          id: string
          job_id: string | null
          payload: Json | null
          phone: string
          state: string
          updated_at: string
        }
        Insert: {
          courier_id?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          job_id?: string | null
          payload?: Json | null
          phone: string
          state: string
          updated_at?: string
        }
        Update: {
          courier_id?: string | null
          created_at?: string
          customer_id?: string | null
          expires_at?: string
          id?: string
          job_id?: string | null
          payload?: Json | null
          phone?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_bot_state_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bot_state_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wa_bot_state_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      wa_maintenance: {
        Row: {
          allowlist: string[]
          enabled: boolean
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowlist?: string[]
          enabled?: boolean
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowlist?: string[]
          enabled?: boolean
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      wa_poll_options: {
        Row: {
          created_at: string
          id: string
          options: Json
          phone: string
        }
        Insert: {
          created_at?: string
          id?: string
          options: Json
          phone: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          phone?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          job_id: string | null
          kind: string
          reference: string | null
        }
        Insert: {
          amount: number
          balance_after?: number | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string | null
          kind: string
          reference?: string | null
        }
        Update: {
          amount?: number
          balance_after?: number | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          job_id?: string | null
          kind?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          event_type: string | null
          external_event_id: string
          id: string
          payload: Json | null
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          provider: string
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          external_event_id: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider: string
        }
        Update: {
          created_at?: string
          event_type?: string | null
          external_event_id?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
        }
        Relationships: []
      }
      whatsapp_dispatch_settings: {
        Row: {
          couriers_group_id: string | null
          couriers_group_name: string | null
          id: boolean
          movers_group_id: string | null
          movers_group_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          couriers_group_id?: string | null
          couriers_group_name?: string | null
          id?: boolean
          movers_group_id?: string | null
          movers_group_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          couriers_group_id?: string | null
          couriers_group_name?: string | null
          id?: boolean
          movers_group_id?: string | null
          movers_group_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          body: string
          courier_id: string | null
          created_at: string
          customer_id: string | null
          delivered_at: string | null
          delivery_status: Database["public"]["Enums"]["message_delivery_status"]
          direction: Database["public"]["Enums"]["message_direction"]
          error_text: string | null
          external_message_id: string | null
          failed_at: string | null
          id: string
          job_id: string | null
          last_status_at: string | null
          message_type: string | null
          phone: string
          read_at: string | null
          sent_at: string | null
          sent_by: string | null
          template_id: string | null
        }
        Insert: {
          body: string
          courier_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["message_delivery_status"]
          direction?: Database["public"]["Enums"]["message_direction"]
          error_text?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          id?: string
          job_id?: string | null
          last_status_at?: string | null
          message_type?: string | null
          phone: string
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          template_id?: string | null
        }
        Update: {
          body?: string
          courier_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivered_at?: string | null
          delivery_status?: Database["public"]["Enums"]["message_delivery_status"]
          direction?: Database["public"]["Enums"]["message_direction"]
          error_text?: string | null
          external_message_id?: string | null
          failed_at?: string | null
          id?: string
          job_id?: string | null
          last_status_at?: string | null
          message_type?: string | null
          phone?: string
          read_at?: string | null
          sent_at?: string | null
          sent_by?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          account_owner: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account: string | null
          bank_branch: string | null
          bank_name: string | null
          bit_phone: string | null
          courier_id: string
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          payment_method: string
          receipt_url: string | null
          reference_number: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
        }
        Insert: {
          account_owner?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bit_phone?: string | null
          courier_id: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string
          receipt_url?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Update: {
          account_owner?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bit_phone?: string | null
          courier_id?: string
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          payment_method?: string
          receipt_url?: string | null
          reference_number?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_couriers_areas: {
        Args: never
        Returns: {
          base_city: string
          dropoff_areas: string[]
          id: string
          pickup_areas: string[]
          vehicle_type: string
          working_areas: string[]
        }[]
      }
      active_couriers_map: {
        Args: never
        Returns: {
          base_city: string
          last_location_at: string
          lat: number
          lng: number
          marker_id: string
          vehicle_type: string
        }[]
      }
      apply_bot_template_update: {
        Args: {
          _buttons: Json
          _edit_note?: string
          _footer: string
          _is_active: boolean
          _message_body: string
          _template_id: string
        }
        Returns: {
          audience: Database["public"]["Enums"]["message_audience"]
          buttons: Json
          category: Database["public"]["Enums"]["bot_template_category"]
          created_at: string
          description: string | null
          footer: string | null
          id: string
          is_active: boolean
          message_body: string
          template_key: string
          template_name: string
          trigger_event: string | null
          updated_at: string
          updated_by: string | null
          variables_supported: string[]
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "bot_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      business_area_couriers: {
        Args: never
        Returns: {
          base_city: string
          dropoff_areas: string[]
          home_lat: number
          home_lng: number
          last_lat: number
          last_lng: number
          last_location_at: string
          marker_id: string
          pickup_areas: string[]
          vehicle_type: string
          working_areas: string[]
        }[]
      }
      business_can_create_delivery: {
        Args: { _business_id: string }
        Returns: Json
      }
      cancel_job_quote: { Args: { _quote_id: string }; Returns: undefined }
      complete_signup_profile: {
        Args: { _full_name: string; _phone: string; _role: string }
        Returns: Json
      }
      compute_job_price: {
        Args: {
          _distance_km: number
          _extra_stops?: number
          _is_heavy?: boolean
        }
        Returns: Json
      }
      courier_can_receive_jobs: { Args: { _courier_id: string }; Returns: Json }
      courier_claim_job: {
        Args: { _job_id: string; _source?: string }
        Returns: Json
      }
      courier_claim_job_as_bot: {
        Args: { _courier_id: string; _job_id: string; _source?: string }
        Returns: Json
      }
      courier_respond_offer: {
        Args: { _offer_id: string; _response: string }
        Returns: Json
      }
      courier_update_job_progress: {
        Args: { _job_id: string; _note?: string; _step: string }
        Returns: Json
      }
      courier_update_job_progress_as_bot: {
        Args: {
          _courier_id: string
          _job_id: string
          _note?: string
          _step: string
        }
        Returns: Json
      }
      courier_update_stop_status: {
        Args: {
          _new_status: string
          _notes?: string
          _proof_photo_url?: string
          _stop_id: string
        }
        Returns: Json
      }
      current_active_courier_id: { Args: never; Returns: string }
      current_approved_courier_id: { Args: never; Returns: string }
      current_business_id: { Args: never; Returns: string }
      current_courier_id: { Args: never; Returns: string }
      gen_job_short_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_pilot_area: { Args: { _city: string }; Returns: boolean }
      log_delivery_status_event: {
        Args: {
          _actor_id: string
          _actor_type: string
          _delivery_id: string
          _metadata?: Json
          _new: string
          _previous: string
          _reason: string
          _source: string
        }
        Returns: string
      }
      mark_conversation_read: {
        Args: { _conversation_id: string; _role: string }
        Returns: undefined
      }
      munch_cancel_own: { Args: { _order_id: string }; Returns: Json }
      munch_confirm: { Args: { _order_id: string }; Returns: Json }
      munch_mark_ready: { Args: { _order_id: string }; Returns: Json }
      munch_reject: {
        Args: { _order_id: string; _reason?: string }
        Returns: Json
      }
      nearby_active_couriers: {
        Args: {
          _limit?: number
          _pickup_lat: number
          _pickup_lng: number
          _radius_km?: number
        }
        Returns: {
          acceptance_rate: number
          avg_rating: number
          courier_id: string
          distance_km: number
          full_name: string
          last_lat: number
          last_lng: number
          last_location_at: string
          score: number
          vehicle_type: string
          whatsapp_phone: string
        }[]
      }
      notify_business: {
        Args: {
          _body?: string
          _business_id: string
          _job_id: string
          _kind: string
          _link?: string
          _title: string
        }
        Returns: string
      }
      open_conversation: {
        Args: {
          _business_id?: string
          _courier_id?: string
          _job_id?: string
          _kind: string
          _subject?: string
        }
        Returns: string
      }
      optimize_stop_order: { Args: { _job_id: string }; Returns: undefined }
      recompute_courier_balance: {
        Args: { _courier_id: string }
        Returns: undefined
      }
      recompute_courier_stats: {
        Args: { _courier_id: string }
        Returns: undefined
      }
      refresh_quote_shortlist: { Args: { _job_id: string }; Returns: undefined }
      register_webhook_event: {
        Args: {
          _event_type: string
          _external_id: string
          _payload: Json
          _provider: string
        }
        Returns: Json
      }
      restore_bot_template_version: {
        Args: { _version_id: string }
        Returns: {
          audience: Database["public"]["Enums"]["message_audience"]
          buttons: Json
          category: Database["public"]["Enums"]["bot_template_category"]
          created_at: string
          description: string | null
          footer: string | null
          id: string
          is_active: boolean
          message_body: string
          template_key: string
          template_name: string
          trigger_event: string | null
          updated_at: string
          updated_by: string | null
          variables_supported: string[]
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "bot_templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      select_job_quote: { Args: { _quote_id: string }; Returns: Json }
      submit_job_quote: {
        Args: {
          _estimated_arrival_minutes?: number
          _estimated_delivery_minutes?: number
          _includes_invoice?: boolean
          _is_final_price?: boolean
          _job_id: string
          _note?: string
          _price: number
        }
        Returns: {
          courier_completed_jobs_snapshot: number | null
          courier_id: string
          courier_rating_snapshot: number | null
          courier_response_time_snapshot: number | null
          created_at: string
          customer_id: string | null
          estimated_arrival_minutes: number | null
          estimated_delivery_minutes: number | null
          id: string
          includes_invoice: boolean
          is_final_price: boolean
          job_id: string
          note: string | null
          price: number
          selected_at: string | null
          status: Database["public"]["Enums"]["quote_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "job_quotes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_delivery_status: {
        Args: {
          _action_source?: string
          _courier_id: string
          _external_message_id?: string
          _job_id: string
          _metadata?: Json
          _requested_status: string
        }
        Returns: Json
      }
      wa_record_inbound: {
        Args: { _phone: string; _provider?: string }
        Returns: undefined
      }
      wa_service_window_open: { Args: { _phone: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "courier" | "business"
      billing_cycle: "per_delivery" | "daily" | "weekly" | "monthly"
      bot_handling_status: "חדש" | "בטיפול" | "טופל" | "לא זוהה"
      bot_template_category:
        | "delivery_stage"
        | "courier_command"
        | "system_error"
        | "business_notification"
        | "customer_notification"
        | "general"
      bot_user_type: "courier" | "customer" | "unknown"
      conversation_kind:
        | "courier_support"
        | "business_support"
        | "courier_business"
      courier_kind: "courier" | "mover"
      courier_status:
        | "חדש"
        | "נרשם"
        | "ממתין לאישור"
        | "פעיל"
        | "חסר פרטים"
        | "שלחתי עבודה"
        | "לקח עבודה"
        | "לא רלוונטי"
        | "חסום"
        | "לא פעיל"
        | "מושהה"
      customer_status: "חדש" | "פעיל" | "מושהה"
      customer_type:
        | "מסעדה"
        | "חנות"
        | "עסק מקומי"
        | "לקוח פרטי"
        | "חברת הפצה"
        | "אחר"
      job_status:
        | "טיוטה"
        | "נשלחה לשליחים"
        | "ממתינה לתגובות"
        | "יש שליחים שאישרו"
        | "נבחר שליח"
        | "פעילה"
        | "הושלמה"
        | "בוטלה"
        | "תקועה"
      job_type:
        | "משלוח בודד"
        | "משמרת לפי שעה"
        | "קו חלוקה"
        | "משלוחי אוכל"
        | "חבילות / מסמכים"
        | "אחר"
      message_audience: "courier" | "customer" | "admin" | "business"
      message_delivery_status:
        | "pending"
        | "sent"
        | "failed"
        | "delivered"
        | "read"
      message_direction: "outbound" | "inbound"
      offer_channel: "whatsapp" | "bot" | "manual" | "app"
      offer_response:
        | "pending"
        | "accepted"
        | "declined"
        | "no_response"
        | "expired"
        | "cancelled"
      preferred_job_type:
        | "משלוח בודד"
        | "משמרת לפי שעה"
        | "קו קבוע"
        | "מכרז שליחים"
        | "מחיר קבוע"
      quote_status:
        | "pending"
        | "shortlisted"
        | "selected"
        | "rejected"
        | "expired"
        | "cancelled"
      sender_role: "courier" | "business" | "admin"
      stop_status: "pending" | "arrived" | "done" | "skipped"
      stop_type: "pickup" | "dropoff"
      vehicle_type:
        | "קטנוע"
        | "רכב"
        | "אופניים חשמליים"
        | "הליכה"
        | "קורקינט חשמלי"
        | "אופניים רגילים"
      withdrawal_status: "ממתינה" | "אושרה" | "שולמה" | "נדחתה"
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
    Enums: {
      app_role: ["admin", "manager", "courier", "business"],
      billing_cycle: ["per_delivery", "daily", "weekly", "monthly"],
      bot_handling_status: ["חדש", "בטיפול", "טופל", "לא זוהה"],
      bot_template_category: [
        "delivery_stage",
        "courier_command",
        "system_error",
        "business_notification",
        "customer_notification",
        "general",
      ],
      bot_user_type: ["courier", "customer", "unknown"],
      conversation_kind: [
        "courier_support",
        "business_support",
        "courier_business",
      ],
      courier_kind: ["courier", "mover"],
      courier_status: [
        "חדש",
        "נרשם",
        "ממתין לאישור",
        "פעיל",
        "חסר פרטים",
        "שלחתי עבודה",
        "לקח עבודה",
        "לא רלוונטי",
        "חסום",
        "לא פעיל",
        "מושהה",
      ],
      customer_status: ["חדש", "פעיל", "מושהה"],
      customer_type: [
        "מסעדה",
        "חנות",
        "עסק מקומי",
        "לקוח פרטי",
        "חברת הפצה",
        "אחר",
      ],
      job_status: [
        "טיוטה",
        "נשלחה לשליחים",
        "ממתינה לתגובות",
        "יש שליחים שאישרו",
        "נבחר שליח",
        "פעילה",
        "הושלמה",
        "בוטלה",
        "תקועה",
      ],
      job_type: [
        "משלוח בודד",
        "משמרת לפי שעה",
        "קו חלוקה",
        "משלוחי אוכל",
        "חבילות / מסמכים",
        "אחר",
      ],
      message_audience: ["courier", "customer", "admin", "business"],
      message_delivery_status: [
        "pending",
        "sent",
        "failed",
        "delivered",
        "read",
      ],
      message_direction: ["outbound", "inbound"],
      offer_channel: ["whatsapp", "bot", "manual", "app"],
      offer_response: [
        "pending",
        "accepted",
        "declined",
        "no_response",
        "expired",
        "cancelled",
      ],
      preferred_job_type: [
        "משלוח בודד",
        "משמרת לפי שעה",
        "קו קבוע",
        "מכרז שליחים",
        "מחיר קבוע",
      ],
      quote_status: [
        "pending",
        "shortlisted",
        "selected",
        "rejected",
        "expired",
        "cancelled",
      ],
      sender_role: ["courier", "business", "admin"],
      stop_status: ["pending", "arrived", "done", "skipped"],
      stop_type: ["pickup", "dropoff"],
      vehicle_type: [
        "קטנוע",
        "רכב",
        "אופניים חשמליים",
        "הליכה",
        "קורקינט חשמלי",
        "אופניים רגילים",
      ],
      withdrawal_status: ["ממתינה", "אושרה", "שולמה", "נדחתה"],
    },
  },
} as const
