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
      community_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_anonymous: boolean
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_anonymous?: boolean
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_id: string
          body: string
          category: string
          comment_count: number
          created_at: string
          id: string
          is_anonymous: boolean
          like_count: number
          title: string
        }
        Insert: {
          author_id: string
          body: string
          category: string
          comment_count?: number
          created_at?: string
          id?: string
          is_anonymous?: boolean
          like_count?: number
          title: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          comment_count?: number
          created_at?: string
          id?: string
          is_anonymous?: boolean
          like_count?: number
          title?: string
        }
        Relationships: []
      }
      contractions: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          intensity: number | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds: number
          id?: string
          intensity?: number | null
          started_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          intensity?: number | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_entries: {
        Row: {
          blood_color: string | null
          clotting: string | null
          cramp_level: number | null
          created_at: string
          end_date: string | null
          energy: number | null
          entry_date: string
          flow: string | null
          flow_intensity: string | null
          id: string
          is_period_start: boolean | null
          mood: string | null
          notes: string | null
          pain_level: number | null
          period_symptoms: Json | null
          symptom_severities: Json | null
          symptoms: string[] | null
          user_id: string
        }
        Insert: {
          blood_color?: string | null
          clotting?: string | null
          cramp_level?: number | null
          created_at?: string
          end_date?: string | null
          energy?: number | null
          entry_date: string
          flow?: string | null
          flow_intensity?: string | null
          id?: string
          is_period_start?: boolean | null
          mood?: string | null
          notes?: string | null
          pain_level?: number | null
          period_symptoms?: Json | null
          symptom_severities?: Json | null
          symptoms?: string[] | null
          user_id: string
        }
        Update: {
          blood_color?: string | null
          clotting?: string | null
          cramp_level?: number | null
          created_at?: string
          end_date?: string | null
          energy?: number | null
          entry_date?: string
          flow?: string | null
          flow_intensity?: string | null
          id?: string
          is_period_start?: boolean | null
          mood?: string | null
          notes?: string | null
          pain_level?: number | null
          period_symptoms?: Json | null
          symptom_severities?: Json | null
          symptoms?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      fertility_logs: {
        Row: {
          bbt_celsius: number | null
          cervical_mucus: string | null
          created_at: string
          id: string
          intercourse: boolean
          log_date: string
          notes: string | null
          ovulation_test: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bbt_celsius?: number | null
          cervical_mucus?: string | null
          created_at?: string
          id?: string
          intercourse?: boolean
          log_date: string
          notes?: string | null
          ovulation_test?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bbt_celsius?: number | null
          cervical_mucus?: string | null
          created_at?: string
          id?: string
          intercourse?: boolean
          log_date?: string
          notes?: string | null
          ovulation_test?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          ai_insight: string | null
          content: string
          created_at: string
          id: string
          mood: string | null
          user_id: string
        }
        Insert: {
          ai_insight?: string | null
          content: string
          created_at?: string
          id?: string
          mood?: string | null
          user_id: string
        }
        Update: {
          ai_insight?: string | null
          content?: string
          created_at?: string
          id?: string
          mood?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journey_members: {
        Row: {
          joined_at: string
          journey_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          journey_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          journey_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journey_members_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journey_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          attachment_size: number | null
          attachment_type: string | null
          author_id: string
          body: string | null
          created_at: string
          id: string
          is_anonymous: boolean
          journey_id: string
          scan_detail: string | null
          scan_status: string
          scanned_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          journey_id: string
          scan_detail?: string | null
          scan_status?: string
          scanned_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          attachment_size?: number | null
          attachment_type?: string | null
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          is_anonymous?: boolean
          journey_id?: string
          scan_detail?: string | null
          scan_status?: string
          scanned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journey_messages_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      journeys: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          tags: string[]
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[]
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      kick_counts: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          kicks: number
          started_at: string
          updated_at: string
          user_id: string
          week: number | null
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          kicks?: number
          started_at?: string
          updated_at?: string
          user_id: string
          week?: number | null
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          kicks?: number
          started_at?: string
          updated_at?: string
          user_id?: string
          week?: number | null
        }
        Relationships: []
      }
      library_articles: {
        Row: {
          created_at: string
          id: string
          read_minutes: number
          summary: string | null
          title: string
          topic: string
        }
        Insert: {
          created_at?: string
          id?: string
          read_minutes?: number
          summary?: string | null
          title: string
          topic: string
        }
        Update: {
          created_at?: string
          id?: string
          read_minutes?: number
          summary?: string | null
          title?: string
          topic?: string
        }
        Relationships: []
      }
      mentors: {
        Row: {
          bio: string | null
          created_at: string
          expertise: string[]
          headline: string
          hourly_rate: number | null
          id: string
          is_available: boolean
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          expertise?: string[]
          headline: string
          hourly_rate?: number | null
          id?: string
          is_available?: boolean
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          expertise?: string[]
          headline?: string
          hourly_rate?: number | null
          id?: string
          is_available?: boolean
          user_id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          journey_id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          journey_id: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          journey_id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "journey_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_views: {
        Row: {
          created_at: string
          id: string
          journey_id: string
          message_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          journey_id: string
          message_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          journey_id?: string
          message_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_views_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_views_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "journey_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_prefs: {
        Row: {
          ai_analysis_enabled: boolean | null
          created_at: string
          notify_doctor: boolean | null
          notify_hydration: boolean | null
          notify_logging: boolean | null
          notify_medication: boolean | null
          notify_ovulation: boolean | null
          notify_period: boolean | null
          notify_sleep: boolean | null
          period_lead_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis_enabled?: boolean | null
          created_at?: string
          notify_doctor?: boolean | null
          notify_hydration?: boolean | null
          notify_logging?: boolean | null
          notify_medication?: boolean | null
          notify_ovulation?: boolean | null
          notify_period?: boolean | null
          notify_sleep?: boolean | null
          period_lead_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis_enabled?: boolean | null
          created_at?: string
          notify_doctor?: boolean | null
          notify_hydration?: boolean | null
          notify_logging?: boolean | null
          notify_medication?: boolean | null
          notify_ovulation?: boolean | null
          notify_period?: boolean | null
          notify_sleep?: boolean | null
          period_lead_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          org: string
          region: string
          title: string
          type: string
          url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          org: string
          region: string
          title: string
          type: string
          url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          org?: string
          region?: string
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      preconception_checklist: {
        Row: {
          created_at: string
          done: boolean
          id: string
          item_key: string
          note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          item_key: string
          note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          item_key?: string
          note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prediction_runs: {
        Row: {
          avg_cycle_length: number | null
          avg_period_length: number | null
          confidence: number | null
          created_at: string
          cycles_used: number
          data_end: string | null
          data_start: string | null
          fertile_window_high: string | null
          fertile_window_low: string | null
          id: string
          is_late: boolean | null
          next_period_end: string | null
          next_period_high: string | null
          next_period_low: string | null
          ovulation_day: string | null
          pms_start: string | null
          predicted_at: string
          recent_starts: Json
          regularity_label: string | null
          summary: string | null
          user_id: string
        }
        Insert: {
          avg_cycle_length?: number | null
          avg_period_length?: number | null
          confidence?: number | null
          created_at?: string
          cycles_used?: number
          data_end?: string | null
          data_start?: string | null
          fertile_window_high?: string | null
          fertile_window_low?: string | null
          id?: string
          is_late?: boolean | null
          next_period_end?: string | null
          next_period_high?: string | null
          next_period_low?: string | null
          ovulation_day?: string | null
          pms_start?: string | null
          predicted_at?: string
          recent_starts?: Json
          regularity_label?: string | null
          summary?: string | null
          user_id: string
        }
        Update: {
          avg_cycle_length?: number | null
          avg_period_length?: number | null
          confidence?: number | null
          created_at?: string
          cycles_used?: number
          data_end?: string | null
          data_start?: string | null
          fertile_window_high?: string | null
          fertile_window_low?: string | null
          id?: string
          is_late?: boolean | null
          next_period_end?: string | null
          next_period_high?: string | null
          next_period_low?: string | null
          ovulation_day?: string | null
          pms_start?: string | null
          predicted_at?: string
          recent_starts?: Json
          regularity_label?: string | null
          summary?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pregnancy_appointments: {
        Row: {
          appt_date: string
          appt_time: string | null
          created_at: string
          done: boolean
          id: string
          kind: string
          notes: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appt_date: string
          appt_time?: string | null
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          notes?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appt_date?: string
          appt_time?: string | null
          created_at?: string
          done?: boolean
          id?: string
          kind?: string
          notes?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pregnancy_health_logs: {
        Row: {
          blood_sugar: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          created_at: string
          exercise: string | null
          id: string
          log_date: string
          mood: string | null
          notes: string | null
          sleep_hours: number | null
          updated_at: string
          user_id: string
          water_glasses: number | null
          weight_kg: number | null
        }
        Insert: {
          blood_sugar?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          exercise?: string | null
          id?: string
          log_date: string
          mood?: string | null
          notes?: string | null
          sleep_hours?: number | null
          updated_at?: string
          user_id: string
          water_glasses?: number | null
          weight_kg?: number | null
        }
        Update: {
          blood_sugar?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          created_at?: string
          exercise?: string | null
          id?: string
          log_date?: string
          mood?: string | null
          notes?: string | null
          sleep_hours?: number | null
          updated_at?: string
          user_id?: string
          water_glasses?: number | null
          weight_kg?: number | null
        }
        Relationships: []
      }
      pregnancy_profiles: {
        Row: {
          birth_plan: string | null
          conception_date: string | null
          created_at: string
          due_date: string | null
          id: string
          lmp_date: string | null
          next_appointment: string | null
          notes: string | null
          stage: string
          test_date: string | null
          test_result: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_plan?: string | null
          conception_date?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          lmp_date?: string | null
          next_appointment?: string | null
          notes?: string | null
          stage?: string
          test_date?: string | null
          test_result?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_plan?: string | null
          conception_date?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          lmp_date?: string | null
          next_appointment?: string | null
          notes?: string | null
          stage?: string
          test_date?: string | null
          test_result?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pregnancy_records: {
        Row: {
          created_at: string
          id: string
          record_date: string
          record_type: string
          summary: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          record_date: string
          record_type?: string
          summary?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          record_date?: string
          record_type?: string
          summary?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          background_style: string | null
          bio: string | null
          calendar_overlay: Json | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          id: string
          is_verified: boolean
          theme_mode: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          background_style?: string | null
          bio?: string | null
          calendar_overlay?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_verified?: boolean
          theme_mode?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          background_style?: string | null
          bio?: string | null
          calendar_overlay?: Json | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_verified?: boolean
          theme_mode?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quarantined_files: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          id: string
          journey_id: string | null
          reason: string
          updated_at: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          journey_id?: string | null
          reason: string
          updated_at?: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          journey_id?: string | null
          reason?: string
          updated_at?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quarantined_files_journey_id_fkey"
            columns: ["journey_id"]
            isOneToOne: false
            referencedRelation: "journeys"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_places: {
        Row: {
          address: string | null
          city: string
          cleanliness_score: number | null
          country: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          notes: string | null
          place_type: string
          review_count: number
          safety_score: number | null
          submitted_by: string
          women_friendly_score: number | null
        }
        Insert: {
          address?: string | null
          city: string
          cleanliness_score?: number | null
          country: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          notes?: string | null
          place_type: string
          review_count?: number
          safety_score?: number | null
          submitted_by: string
          women_friendly_score?: number | null
        }
        Update: {
          address?: string | null
          city?: string
          cleanliness_score?: number | null
          country?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          notes?: string | null
          place_type?: string
          review_count?: number
          safety_score?: number | null
          submitted_by?: string
          women_friendly_score?: number | null
        }
        Relationships: []
      }
      safety_alerts: {
        Row: {
          alert_type: string
          city: string
          country: string
          created_at: string
          description: string
          id: string
          is_verified: boolean
          location: string | null
          reporter_id: string
          severity: string
        }
        Insert: {
          alert_type: string
          city: string
          country: string
          created_at?: string
          description: string
          id?: string
          is_verified?: boolean
          location?: string | null
          reporter_id: string
          severity?: string
        }
        Update: {
          alert_type?: string
          city?: string
          country?: string
          created_at?: string
          description?: string
          id?: string
          is_verified?: boolean
          location?: string | null
          reporter_id?: string
          severity?: string
        }
        Relationships: []
      }
      service_listings: {
        Row: {
          craft: string
          created_at: string
          id: string
          price: string
          provider_name: string
          tags: string[]
          user_id: string
        }
        Insert: {
          craft: string
          created_at?: string
          id?: string
          price: string
          provider_name: string
          tags?: string[]
          user_id: string
        }
        Update: {
          craft?: string
          created_at?: string
          id?: string
          price?: string
          provider_name?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: []
      }
      travel_connections: {
        Row: {
          contact_handle: string | null
          contact_type: string | null
          created_at: string
          from_user: string
          id: string
          message: string | null
          request_id: string
          status: string
          to_user: string
          updated_at: string
        }
        Insert: {
          contact_handle?: string | null
          contact_type?: string | null
          created_at?: string
          from_user: string
          id?: string
          message?: string | null
          request_id: string
          status?: string
          to_user: string
          updated_at?: string
        }
        Update: {
          contact_handle?: string | null
          contact_type?: string | null
          created_at?: string
          from_user?: string
          id?: string
          message?: string | null
          request_id?: string
          status?: string
          to_user?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_connections_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "travel_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_hosts: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          note: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          note?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          note?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      travel_requests: {
        Row: {
          city: string
          contact: string
          country: string
          created_at: string
          id: string
          need: string
          user_id: string
        }
        Insert: {
          city: string
          contact: string
          country: string
          created_at?: string
          id?: string
          need: string
          user_id: string
        }
        Update: {
          city?: string
          contact?: string
          country?: string
          created_at?: string
          id?: string
          need?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wellness_logs: {
        Row: {
          created_at: string
          custom_symptoms: string[] | null
          energy_level: number | null
          exercise: string[] | null
          id: string
          log_date: string
          mood: string[] | null
          notes: string | null
          nutrition: Json | null
          sleep_hours: number | null
          sleep_quality: number | null
          symptoms: Json | null
          updated_at: string
          user_id: string
          water_glasses: number | null
        }
        Insert: {
          created_at?: string
          custom_symptoms?: string[] | null
          energy_level?: number | null
          exercise?: string[] | null
          id?: string
          log_date: string
          mood?: string[] | null
          notes?: string | null
          nutrition?: Json | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          symptoms?: Json | null
          updated_at?: string
          user_id: string
          water_glasses?: number | null
        }
        Update: {
          created_at?: string
          custom_symptoms?: string[] | null
          energy_level?: number | null
          exercise?: string[] | null
          id?: string
          log_date?: string
          mood?: string[] | null
          notes?: string | null
          nutrition?: Json | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          symptoms?: Json | null
          updated_at?: string
          user_id?: string
          water_glasses?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_journey_member: {
        Args: { _journey_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "mentor" | "member"
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
      app_role: ["admin", "moderator", "mentor", "member"],
    },
  },
} as const
