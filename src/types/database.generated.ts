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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          actor_user_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          message: string
          metadata: Json
          organization_id: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          message: string
          metadata?: Json
          organization_id: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          message?: string
          metadata?: Json
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          archived_at: string | null
          city: string
          code: string | null
          company_id: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          status: Database["public"]["Enums"]["record_status"]
          trade_licence_number: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          city: string
          code?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          trade_licence_number?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          city?: string
          code?: string | null
          company_id?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          trade_licence_number?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_same_tenant_fkey"
            columns: ["organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          archived_at: string | null
          branch_id: string | null
          business_activity: string | null
          city: string | null
          company_type: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          corporate_tax_registration_number: string | null
          created_at: string
          created_by: string | null
          establishment_card_number: string | null
          id: string
          immigration_file_number: string | null
          industry: string | null
          is_active: boolean
          licence_number: string | null
          name: string
          organization_id: string
          status: Database["public"]["Enums"]["record_status"]
          trade_name: string | null
          updated_at: string
          vat_registration_number: string | null
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          branch_id?: string | null
          business_activity?: string | null
          city?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          corporate_tax_registration_number?: string | null
          created_at?: string
          created_by?: string | null
          establishment_card_number?: string | null
          id?: string
          immigration_file_number?: string | null
          industry?: string | null
          is_active?: boolean
          licence_number?: string | null
          name: string
          organization_id: string
          status?: Database["public"]["Enums"]["record_status"]
          trade_name?: string | null
          updated_at?: string
          vat_registration_number?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          branch_id?: string | null
          business_activity?: string | null
          city?: string | null
          company_type?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          corporate_tax_registration_number?: string | null
          created_at?: string
          created_by?: string | null
          establishment_card_number?: string | null
          id?: string
          immigration_file_number?: string | null
          industry?: string | null
          is_active?: boolean
          licence_number?: string | null
          name?: string
          organization_id?: string
          status?: Database["public"]["Enums"]["record_status"]
          trade_name?: string | null
          updated_at?: string
          vat_registration_number?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_branch_id_fkey"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          archived_at: string | null
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          customer_type: string
          date_of_birth: string | null
          email: string | null
          emirates_id_number: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          nationality: string | null
          notes: string | null
          organization_id: string
          passport_number: string | null
          phone: string
          profession: string | null
          residential_address: string | null
          sponsor_company: string | null
          sponsor_name: string | null
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
          visa_type: string | null
          whatsapp_number: string | null
        }
        Insert: {
          archived_at?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string
          date_of_birth?: string | null
          email?: string | null
          emirates_id_number?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          nationality?: string | null
          notes?: string | null
          organization_id: string
          passport_number?: string | null
          phone: string
          profession?: string | null
          residential_address?: string | null
          sponsor_company?: string | null
          sponsor_name?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          visa_type?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          archived_at?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_type?: string
          date_of_birth?: string | null
          email?: string | null
          emirates_id_number?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          nationality?: string | null
          notes?: string | null
          organization_id?: string
          passport_number?: string | null
          phone?: string
          profession?: string | null
          residential_address?: string | null
          sponsor_company?: string | null
          sponsor_name?: string | null
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
          visa_type?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_branch_id_fkey"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customers_organization_id_company_id_fkey"
            columns: ["organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_version_files: {
        Row: {
          created_at: string
          document_version_id: string
          file_size_bytes: number
          id: string
          mime_type: string
          object_key: string
          organization_id: string
          original_filename: string
          page_order: number
        }
        Insert: {
          created_at?: string
          document_version_id: string
          file_size_bytes: number
          id?: string
          mime_type: string
          object_key: string
          organization_id: string
          original_filename: string
          page_order: number
        }
        Update: {
          created_at?: string
          document_version_id?: string
          file_size_bytes?: number
          id?: string
          mime_type?: string
          object_key?: string
          organization_id?: string
          original_filename?: string
          page_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_version_files_organization_id_document_version_id_fkey"
            columns: ["organization_id", "document_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "document_version_files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          archived_at: string | null
          checksum: string | null
          cleanup_eligible_at: string | null
          created_at: string
          document_id: string
          expected_mime_type: string
          expected_size_bytes: number
          file_size_bytes: number | null
          finalized_at: string | null
          id: string
          mime_type: string
          object_key: string
          organization_id: string
          original_filename: string
          stored_filename: string
          upload_status: Database["public"]["Enums"]["document_upload_status"]
          uploaded_by: string | null
          version_number: number
        }
        Insert: {
          archived_at?: string | null
          checksum?: string | null
          cleanup_eligible_at?: string | null
          created_at?: string
          document_id: string
          expected_mime_type: string
          expected_size_bytes: number
          file_size_bytes?: number | null
          finalized_at?: string | null
          id?: string
          mime_type: string
          object_key: string
          organization_id: string
          original_filename: string
          stored_filename: string
          upload_status?: Database["public"]["Enums"]["document_upload_status"]
          uploaded_by?: string | null
          version_number: number
        }
        Update: {
          archived_at?: string | null
          checksum?: string | null
          cleanup_eligible_at?: string | null
          created_at?: string
          document_id?: string
          expected_mime_type?: string
          expected_size_bytes?: number
          file_size_bytes?: number | null
          finalized_at?: string | null
          id?: string
          mime_type?: string
          object_key?: string
          organization_id?: string
          original_filename?: string
          stored_filename?: string
          upload_status?: Database["public"]["Enums"]["document_upload_status"]
          uploaded_by?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "document_versions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived_at: string | null
          branch_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          current_version_id: string | null
          customer_id: string | null
          display_name: string
          document_number: string | null
          document_type_id: string
          expires_on: string | null
          extracted_at: string | null
          extraction_attempts: number
          extraction_confidence: Json
          extraction_data: Json
          extraction_model: string | null
          extraction_provider: string | null
          extraction_status: Database["public"]["Enums"]["document_extraction_status"]
          extraction_warnings: Json
          id: string
          issued_on: string | null
          notes: string | null
          organization_id: string
          reminder_thresholds: number[] | null
          status: Database["public"]["Enums"]["document_status"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          customer_id?: string | null
          display_name: string
          document_number?: string | null
          document_type_id: string
          expires_on?: string | null
          extracted_at?: string | null
          extraction_attempts?: number
          extraction_confidence?: Json
          extraction_data?: Json
          extraction_model?: string | null
          extraction_provider?: string | null
          extraction_status?: Database["public"]["Enums"]["document_extraction_status"]
          extraction_warnings?: Json
          id?: string
          issued_on?: string | null
          notes?: string | null
          organization_id: string
          reminder_thresholds?: number[] | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          branch_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version_id?: string | null
          customer_id?: string | null
          display_name?: string
          document_number?: string | null
          document_type_id?: string
          expires_on?: string | null
          extracted_at?: string | null
          extraction_attempts?: number
          extraction_confidence?: Json
          extraction_data?: Json
          extraction_model?: string | null
          extraction_provider?: string | null
          extraction_status?: Database["public"]["Enums"]["document_extraction_status"]
          extraction_warnings?: Json
          id?: string
          issued_on?: string | null
          notes?: string | null
          organization_id?: string
          reminder_thresholds?: number[] | null
          status?: Database["public"]["Enums"]["document_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_current_version_same_document_fk"
            columns: ["id", "current_version_id"]
            isOneToOne: false
            referencedRelation: "document_versions"
            referencedColumns: ["document_id", "id"]
          },
          {
            foreignKeyName: "documents_organization_id_branch_id_fkey"
            columns: ["organization_id", "branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_organization_id_company_id_fkey"
            columns: ["organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_organization_id_document_type_id_fkey"
            columns: ["organization_id", "document_type_id"]
            isOneToOne: false
            referencedRelation: "organization_document_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_response: string | null
          document_id: string | null
          due_at: string
          id: string
          next_follow_up_id: string | null
          note: string | null
          organization_id: string
          service_request_id: string | null
          status: Database["public"]["Enums"]["follow_up_status"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_response?: string | null
          document_id?: string | null
          due_at: string
          id?: string
          next_follow_up_id?: string | null
          note?: string | null
          organization_id: string
          service_request_id?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_response?: string | null
          document_id?: string | null
          due_at?: string
          id?: string
          next_follow_up_id?: string | null
          note?: string | null
          organization_id?: string
          service_request_id?: string | null
          status?: Database["public"]["Enums"]["follow_up_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_company_tenant_fk"
            columns: ["organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "follow_ups_next_tenant_fk"
            columns: ["organization_id", "next_follow_up_id"]
            isOneToOne: false
            referencedRelation: "follow_ups"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "follow_ups_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "follow_ups_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_request_customer_fkey"
            columns: ["organization_id", "service_request_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["organization_id", "id", "customer_id"]
          },
        ]
      }
      import_job_rows: {
        Row: {
          company_id: string | null
          created_at: string
          customer_id: string | null
          document_id: string | null
          duplicate_of: Json
          id: string
          import_job_id: string
          imported_at: string | null
          issues: Json
          normalized_data: Json
          organization_id: string
          resolution: string | null
          row_number: number
          source_data: Json
          source_sheet_name: string
          status: Database["public"]["Enums"]["import_row_status"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          duplicate_of?: Json
          id?: string
          import_job_id: string
          imported_at?: string | null
          issues?: Json
          normalized_data?: Json
          organization_id: string
          resolution?: string | null
          row_number: number
          source_data?: Json
          source_sheet_name: string
          status?: Database["public"]["Enums"]["import_row_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          duplicate_of?: Json
          id?: string
          import_job_id?: string
          imported_at?: string | null
          issues?: Json
          normalized_data?: Json
          organization_id?: string
          resolution?: string | null
          row_number?: number
          source_data?: Json
          source_sheet_name?: string
          status?: Database["public"]["Enums"]["import_row_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_job_rows_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_job_rows_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_job_rows_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_job_rows_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_job_rows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          companies_created: number
          completed_at: string | null
          created_at: string
          created_by: string
          customers_created: number
          documents_created: number
          file_name: string
          id: string
          mapping: Json
          organization_id: string
          processed_rows: number
          records_failed: number
          records_skipped: number
          records_updated: number
          sheet_name: string | null
          source_format: string
          started_at: string | null
          status: Database["public"]["Enums"]["import_job_status"]
          total_rows: number
          updated_at: string
        }
        Insert: {
          companies_created?: number
          completed_at?: string | null
          created_at?: string
          created_by: string
          customers_created?: number
          documents_created?: number
          file_name: string
          id?: string
          mapping?: Json
          organization_id: string
          processed_rows?: number
          records_failed?: number
          records_skipped?: number
          records_updated?: number
          sheet_name?: string | null
          source_format: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_job_status"]
          total_rows?: number
          updated_at?: string
        }
        Update: {
          companies_created?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string
          customers_created?: number
          documents_created?: number
          file_name?: string
          id?: string
          mapping?: Json
          organization_id?: string
          processed_rows?: number
          records_failed?: number
          records_skipped?: number
          records_updated?: number
          sheet_name?: string | null
          source_format?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["import_job_status"]
          total_rows?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          created_at: string
          document_count: number
          error_message: string | null
          id: string
          notification_date: string
          notification_type: string
          organization_id: string
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_count: number
          error_message?: string | null
          id?: string
          notification_date: string
          notification_type: string
          organization_id: string
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_count?: number
          error_message?: string | null
          id?: string
          notification_date?: string
          notification_type?: string
          organization_id?: string
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          customer_id: string | null
          document_id: string | null
          id: string
          organization_id: string
          read_at: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          id?: string
          organization_id: string
          read_at?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          customer_id?: string | null
          document_id?: string | null
          id?: string
          organization_id?: string
          read_at?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "notifications_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_document_types: {
        Row: {
          canonical_code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          reminder_thresholds: number[]
          updated_at: string
        }
        Insert: {
          canonical_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          reminder_thresholds?: number[]
          updated_at?: string
        }
        Update: {
          canonical_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          reminder_thresholds?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_document_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          is_primary_owner: boolean
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["record_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_owner?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["record_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_owner?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["record_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          amount: number | null
          billing_cycle: string
          created_at: string
          currency: string
          current_period_ends_at: string | null
          current_period_starts_at: string | null
          document_quota: number | null
          id: string
          organization_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          storage_quota_bytes: number
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          billing_cycle?: string
          created_at?: string
          currency?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          document_quota?: number | null
          id?: string
          organization_id: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          storage_quota_bytes?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          billing_cycle?: string
          created_at?: string
          currency?: string
          current_period_ends_at?: string | null
          current_period_starts_at?: string | null
          document_quota?: number | null
          id?: string
          organization_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          storage_quota_bytes?: number
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_usage_counters: {
        Row: {
          document_count: number
          organization_id: string
          stored_bytes: number
          updated_at: string
        }
        Insert: {
          document_count?: number
          organization_id: string
          stored_bytes?: number
          updated_at?: string
        }
        Update: {
          document_count?: number
          organization_id?: string
          stored_bytes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_usage_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          account_state: string
          address: string | null
          business_email: string | null
          created_at: string
          currency: string
          id: string
          is_active: boolean
          legal_name: string | null
          locale: string
          location: string
          logo_url: string | null
          name: string
          onboarding_completed_at: string | null
          onboarding_step: number
          phone: string | null
          primary_color: string
          slug: string
          status: Database["public"]["Enums"]["record_status"]
          timezone: string
          updated_at: string
          whatsapp_last_message_id: string | null
          whatsapp_last_sent_at: string | null
          whatsapp_last_status: string | null
          whatsapp_notification_time: string
          whatsapp_notifications_enabled: boolean
          whatsapp_number: string | null
          whatsapp_recipient_phone: string | null
        }
        Insert: {
          account_state?: string
          address?: string | null
          business_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          legal_name?: string | null
          locale?: string
          location: string
          logo_url?: string | null
          name: string
          onboarding_completed_at?: string | null
          onboarding_step?: number
          phone?: string | null
          primary_color?: string
          slug: string
          status?: Database["public"]["Enums"]["record_status"]
          timezone?: string
          updated_at?: string
          whatsapp_last_message_id?: string | null
          whatsapp_last_sent_at?: string | null
          whatsapp_last_status?: string | null
          whatsapp_notification_time?: string
          whatsapp_notifications_enabled?: boolean
          whatsapp_number?: string | null
          whatsapp_recipient_phone?: string | null
        }
        Update: {
          account_state?: string
          address?: string | null
          business_email?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          legal_name?: string | null
          locale?: string
          location?: string
          logo_url?: string | null
          name?: string
          onboarding_completed_at?: string | null
          onboarding_step?: number
          phone?: string | null
          primary_color?: string
          slug?: string
          status?: Database["public"]["Enums"]["record_status"]
          timezone?: string
          updated_at?: string
          whatsapp_last_message_id?: string | null
          whatsapp_last_sent_at?: string | null
          whatsapp_last_status?: string | null
          whatsapp_notification_time?: string
          whatsapp_notifications_enabled?: boolean
          whatsapp_number?: string | null
          whatsapp_recipient_phone?: string | null
        }
        Relationships: []
      }
      pending_scans: {
        Row: {
          company_id: string | null
          confirmed_at: string | null
          confirmed_document_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          detected_canonical_code: string | null
          detected_document_type_id: string | null
          expected_size_bytes: number | null
          extraction_data: Json | null
          id: string
          mime_type: string | null
          object_key: string | null
          organization_id: string
          original_filename: string | null
          state: string
          uploaded_at: string | null
        }
        Insert: {
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_document_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          detected_canonical_code?: string | null
          detected_document_type_id?: string | null
          expected_size_bytes?: number | null
          extraction_data?: Json | null
          id?: string
          mime_type?: string | null
          object_key?: string | null
          organization_id: string
          original_filename?: string | null
          state?: string
          uploaded_at?: string | null
        }
        Update: {
          company_id?: string | null
          confirmed_at?: string | null
          confirmed_document_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          detected_canonical_code?: string | null
          detected_document_type_id?: string | null
          expected_size_bytes?: number | null
          extraction_data?: Json | null
          id?: string
          mime_type?: string | null
          object_key?: string | null
          organization_id?: string
          original_filename?: string | null
          state?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pending_scans_organization_id_company_id_fkey"
            columns: ["organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pending_scans_organization_id_confirmed_document_id_fkey"
            columns: ["organization_id", "confirmed_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pending_scans_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pending_scans_organization_id_detected_document_type_id_fkey"
            columns: ["organization_id", "detected_document_type_id"]
            isOneToOne: false
            referencedRelation: "organization_document_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "pending_scans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          organization_id: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          organization_id?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          organization_id?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admin_notes: {
        Row: {
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          organization_id: string
        }
        Insert: {
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          organization_id: string
        }
        Update: {
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_admin_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_payments: {
        Row: {
          amount: number
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          organization_id: string
          paid_at: string | null
          payment_method: string
          recorded_by: string | null
          reference: string | null
          status: string
          subscription_id: string | null
        }
        Insert: {
          amount: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          status: string
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          payment_method?: string
          recorded_by?: string | null
          reference?: string | null
          status?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_plans: {
        Row: {
          ai_allowance: number | null
          billing_cycle: string
          code: string
          created_at: string
          currency: string
          customer_allowance: number | null
          document_allowance: number | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price: number | null
          storage_allowance_bytes: number | null
          updated_at: string
          user_allowance: number | null
          whatsapp_allowance: number | null
        }
        Insert: {
          ai_allowance?: number | null
          billing_cycle?: string
          code: string
          created_at?: string
          currency?: string
          customer_allowance?: number | null
          document_allowance?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          storage_allowance_bytes?: number | null
          updated_at?: string
          user_allowance?: number | null
          whatsapp_allowance?: number | null
        }
        Update: {
          ai_allowance?: number | null
          billing_cycle?: string
          code?: string
          created_at?: string
          currency?: string
          customer_allowance?: number | null
          document_allowance?: number | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          storage_allowance_bytes?: number | null
          updated_at?: string
          user_allowance?: number | null
          whatsapp_allowance?: number | null
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
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      platform_whatsapp_qa_sends: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          failed_at: string | null
          id: string
          meta_error_code: number | null
          meta_error_details: string | null
          meta_error_message: string | null
          meta_error_title: string | null
          meta_message_id: string | null
          platform_admin_user_id: string
          read_at: string | null
          recipient_masked: string
          response_status: number | null
          sent_at: string | null
          status: string
          template_language: string
          template_name: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          id?: string
          meta_error_code?: number | null
          meta_error_details?: string | null
          meta_error_message?: string | null
          meta_error_title?: string | null
          meta_message_id?: string | null
          platform_admin_user_id: string
          read_at?: string | null
          recipient_masked: string
          response_status?: number | null
          sent_at?: string | null
          status: string
          template_language: string
          template_name: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          failed_at?: string | null
          id?: string
          meta_error_code?: number | null
          meta_error_details?: string | null
          meta_error_message?: string | null
          meta_error_title?: string | null
          meta_message_id?: string | null
          platform_admin_user_id?: string
          read_at?: string | null
          recipient_masked?: string
          response_status?: number | null
          sent_at?: string | null
          status?: string
          template_language?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_whatsapp_qa_sends_platform_admin_user_id_fkey"
            columns: ["platform_admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          platform_role: Database["public"]["Enums"]["platform_role"]
          status: Database["public"]["Enums"]["record_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          platform_role?: Database["public"]["Enums"]["platform_role"]
          status?: Database["public"]["Enums"]["record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      renewals: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string
          id: string
          notes: string | null
          organization_id: string
          replacement_document_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["renewal_status"]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id: string
          id?: string
          notes?: string | null
          organization_id: string
          replacement_document_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["renewal_status"]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string
          id?: string
          notes?: string | null
          organization_id?: string
          replacement_document_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["renewal_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "renewals_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "renewals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renewals_replacement_document_tenant_fk"
            columns: ["organization_id", "replacement_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          expected_days: number
          government_fee: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          service_fee: number
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          expected_days?: number
          government_fee?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          service_fee?: number
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          expected_days?: number
          government_fee?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          service_fee?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog_requirements: {
        Row: {
          created_at: string
          document_type_id: string | null
          id: string
          name: string
          organization_id: string
          required: boolean
          service_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type_id?: string | null
          id?: string
          name: string
          organization_id: string
          required?: boolean
          service_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          required?: boolean
          service_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_requirements_organization_id_document_type_fkey"
            columns: ["organization_id", "document_type_id"]
            isOneToOne: false
            referencedRelation: "organization_document_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_catalog_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_catalog_requirements_organization_id_service_id_fkey"
            columns: ["organization_id", "service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      service_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          notes: string | null
          organization_id: string
          paid_at: string
          received_by: string | null
          reference: string | null
          service_request_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method: string
          notes?: string | null
          organization_id: string
          paid_at?: string
          received_by?: string | null
          reference?: string | null
          service_request_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          notes?: string | null
          organization_id?: string
          paid_at?: string
          received_by?: string | null
          reference?: string | null
          service_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_payments_organization_id_service_request_id_fkey"
            columns: ["organization_id", "service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      service_request_counters: {
        Row: {
          next_number: number
          organization_id: string
        }
        Insert: {
          next_number?: number
          organization_id: string
        }
        Update: {
          next_number?: number
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_request_requirements: {
        Row: {
          created_at: string
          document_id: string | null
          document_type_id: string | null
          id: string
          name: string
          organization_id: string
          required: boolean
          service_request_id: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          document_type_id?: string | null
          id?: string
          name: string
          organization_id: string
          required: boolean
          service_request_id: string
          sort_order: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          document_type_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          required?: boolean
          service_request_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_requirements_organization_id_document_id_fkey"
            columns: ["organization_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_request_requirements_organization_id_document_type_fkey"
            columns: ["organization_id", "document_type_id"]
            isOneToOne: false
            referencedRelation: "organization_document_types"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_request_requirements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_request_requirements_organization_id_service_reque_fkey"
            columns: ["organization_id", "service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      service_request_status_history: {
        Row: {
          change_type: string
          changed_at: string
          changed_by: string | null
          from_status: string | null
          id: string
          organization_id: string
          service_request_id: string
          to_status: string
        }
        Insert: {
          change_type: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          organization_id: string
          service_request_id: string
          to_status: string
        }
        Update: {
          change_type?: string
          changed_at?: string
          changed_by?: string | null
          from_status?: string | null
          id?: string
          organization_id?: string
          service_request_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_request_status_histor_organization_id_service_requ_fkey"
            columns: ["organization_id", "service_request_id"]
            isOneToOne: false
            referencedRelation: "service_requests"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_request_status_history_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          application_reference: string | null
          archived_at: string | null
          assigned_to: string | null
          company_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount: number
          expected_completion_at: string | null
          external_reference: string | null
          government_fee: number
          id: string
          notes: string | null
          organization_id: string
          other_cost: number
          paid_amount: number
          payment_status: string
          priority: string
          request_number: string
          service_fee: number
          service_id: string
          source: string
          status: string
          submitted_at: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          application_reference?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount?: number
          expected_completion_at?: string | null
          external_reference?: string | null
          government_fee?: number
          id?: string
          notes?: string | null
          organization_id: string
          other_cost?: number
          paid_amount?: number
          payment_status?: string
          priority?: string
          request_number: string
          service_fee?: number
          service_id: string
          source?: string
          status?: string
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          application_reference?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          company_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount?: number
          expected_completion_at?: string | null
          external_reference?: string | null
          government_fee?: number
          id?: string
          notes?: string | null
          organization_id?: string
          other_cost?: number
          paid_amount?: number
          payment_status?: string
          priority?: string
          request_number?: string
          service_fee?: number
          service_id?: string
          source?: string
          status?: string
          submitted_at?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_organization_id_assigned_to_fkey"
            columns: ["organization_id", "assigned_to"]
            isOneToOne: false
            referencedRelation: "organization_memberships"
            referencedColumns: ["organization_id", "user_id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_company_id_fkey"
            columns: ["organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_customer_id_fkey"
            columns: ["organization_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["organization_id", "id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_organization_id_service_id_fkey"
            columns: ["organization_id", "service_id"]
            isOneToOne: false
            referencedRelation: "service_catalog"
            referencedColumns: ["organization_id", "id"]
          },
        ]
      }
      whatsapp_notifications: {
        Row: {
          accepted_at: string | null
          created_at: string
          delivered_at: string | null
          expiring_today_count: number
          failed_at: string | null
          id: string
          last_attempt_at: string | null
          meta_error_code: number | null
          meta_error_details: string | null
          meta_error_message: string | null
          meta_error_title: string | null
          meta_message_id: string | null
          next_30_days_count: number
          next_7_days_count: number
          next_retry_at: string | null
          notification_type: string
          organization_id: string
          read_at: string | null
          recipient_phone: string
          retry_count: number
          retryable: boolean
          sent_at: string | null
          status: string
          summary_local_date: string
          template_language: string
          template_name: string
          total_count: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          expiring_today_count: number
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          meta_error_code?: number | null
          meta_error_details?: string | null
          meta_error_message?: string | null
          meta_error_title?: string | null
          meta_message_id?: string | null
          next_30_days_count: number
          next_7_days_count: number
          next_retry_at?: string | null
          notification_type: string
          organization_id: string
          read_at?: string | null
          recipient_phone: string
          retry_count?: number
          retryable?: boolean
          sent_at?: string | null
          status: string
          summary_local_date: string
          template_language: string
          template_name: string
          total_count: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          delivered_at?: string | null
          expiring_today_count?: number
          failed_at?: string | null
          id?: string
          last_attempt_at?: string | null
          meta_error_code?: number | null
          meta_error_details?: string | null
          meta_error_message?: string | null
          meta_error_title?: string | null
          meta_message_id?: string | null
          next_30_days_count?: number
          next_7_days_count?: number
          next_retry_at?: string | null
          notification_type?: string
          organization_id?: string
          read_at?: string | null
          recipient_phone?: string
          retry_count?: number
          retryable?: boolean
          sent_at?: string | null
          status?: string
          summary_local_date?: string
          template_language?: string
          template_name?: string
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abandon_document_upload: {
        Args: { target_version_id: string }
        Returns: string
      }
      claim_whatsapp_expiry_notification: {
        Args: {
          p_expiring_today_count: number
          p_next_30_days_count: number
          p_next_7_days_count: number
          p_organization_id: string
          p_recipient_phone: string
          p_summary_local_date: string
          p_template_language: string
          p_template_name: string
          p_total_count: number
        }
        Returns: string
      }
      complete_document_renewal: {
        Args: {
          completion_note?: string
          replacement_document_number: string
          replacement_expires_on: string
          replacement_issued_on: string
          target_document_id: string
        }
        Returns: {
          renewal_id: string
          replacement_document_id: string
        }[]
      }
      customer_activity_timeline: {
        Args: {
          result_limit?: number
          target_customer_id: string
          target_organization_id: string
        }
        Returns: {
          created_at: string
          entity_type: string
          id: string
          message: string
        }[]
      }
      customer_list_summary: {
        Args: {
          page_limit?: number
          page_offset?: number
          search_text?: string
          sort_ascending?: boolean
          sort_column?: string
          target_organization_id: string
        }
        Returns: Json
      }
      dashboard_snapshot: {
        Args: {
          activity_limit?: number
          follow_up_end: string
          follow_up_start: string
          target_organization_id: string
          target_today: string
        }
        Returns: Json
      }
      finalize_document_version: {
        Args: {
          confirmed_mime_type: string
          confirmed_size_bytes: number
          target_version_id: string
        }
        Returns: {
          already_finalized: boolean
          current_version_id: string
          document_id: string
        }[]
      }
      finalize_pending_scan: {
        Args: {
          review_display_name: string
          review_document_number: string
          review_expiry_date: string
          review_extraction_data: Json
          review_issue_date: string
          target_pending_scan_id: string
        }
        Returns: {
          already_finalized: boolean
          document_id: string
          version_id: string
        }[]
      }
      log_workspace_activity: {
        Args: { entity_id: string; entity_type: string; event_kind: string }
        Returns: undefined
      }
      onboard_current_user: {
        Args: {
          organization_address: string
          organization_color: string
          organization_email: string
          organization_location: string
          organization_name: string
          organization_phone: string
          organization_slug: string
          organization_whatsapp: string
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
        }
        Returns: string
      }
      owner_search: {
        Args: {
          owner_kind: string
          result_limit?: number
          search_text?: string
          target_organization_id: string
        }
        Returns: {
          description: string
          id: string
          label: string
        }[]
      }
      provision_current_user_workspace: {
        Args: {
          owner_display_name?: string
          workspace_location: string
          workspace_name: string
          workspace_phone?: string
        }
        Returns: string
      }
      record_platform_whatsapp_qa_delivery_status: {
        Args: {
          p_error_code?: number
          p_error_details?: string
          p_error_message?: string
          p_error_title?: string
          p_event_at?: string
          p_meta_message_id: string
          p_status: string
        }
        Returns: boolean
      }
      record_whatsapp_delivery_status: {
        Args: {
          p_error_code?: number
          p_error_details?: string
          p_error_message?: string
          p_error_title?: string
          p_event_at?: string
          p_meta_message_id: string
          p_status: string
        }
        Returns: boolean
      }
      replace_document_from_upload: {
        Args: {
          draft_document_id: string
          existing_document_id: string
          review_display_name: string
          review_document_number: string
          review_document_type_id: string
          review_expiry_date: string
          review_extraction_data: Json
          review_issue_date: string
        }
        Returns: string
      }
      reset_note_it_demo_workspace: { Args: never; Returns: Json }
    }
    Enums: {
      document_extraction_status:
        | "uploaded"
        | "processing"
        | "review_required"
        | "confirmed"
        | "failed"
      document_status:
        | "valid"
        | "expiring_soon"
        | "urgent"
        | "expires_today"
        | "expired"
        | "renewal_in_progress"
      document_upload_status: "pending" | "complete" | "failed"
      follow_up_status: "pending" | "completed" | "overdue" | "cancelled"
      import_job_status:
        | "uploaded"
        | "validating"
        | "ready"
        | "importing"
        | "completed"
        | "completed_with_errors"
        | "failed"
      import_row_status:
        | "ready"
        | "possible_duplicate"
        | "existing"
        | "invalid"
        | "imported"
        | "skipped"
        | "failed"
      member_role: "owner" | "admin"
      notification_channel: "in_app" | "email" | "whatsapp"
      platform_role: "none" | "platform_support" | "platform_admin"
      record_status: "active" | "suspended" | "removed"
      renewal_status:
        | "draft"
        | "in_progress"
        | "submitted"
        | "completed"
        | "cancelled"
      subscription_plan: "starter" | "business" | "pro"
      subscription_status:
        | "trial"
        | "active"
        | "past_due"
        | "suspended"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      document_extraction_status: [
        "uploaded",
        "processing",
        "review_required",
        "confirmed",
        "failed",
      ],
      document_status: [
        "valid",
        "expiring_soon",
        "urgent",
        "expires_today",
        "expired",
        "renewal_in_progress",
      ],
      document_upload_status: ["pending", "complete", "failed"],
      follow_up_status: ["pending", "completed", "overdue", "cancelled"],
      import_job_status: [
        "uploaded",
        "validating",
        "ready",
        "importing",
        "completed",
        "completed_with_errors",
        "failed",
      ],
      import_row_status: [
        "ready",
        "possible_duplicate",
        "existing",
        "invalid",
        "imported",
        "skipped",
        "failed",
      ],
      member_role: ["owner", "admin"],
      notification_channel: ["in_app", "email", "whatsapp"],
      platform_role: ["none", "platform_support", "platform_admin"],
      record_status: ["active", "suspended", "removed"],
      renewal_status: [
        "draft",
        "in_progress",
        "submitted",
        "completed",
        "cancelled",
      ],
      subscription_plan: ["starter", "business", "pro"],
      subscription_status: [
        "trial",
        "active",
        "past_due",
        "suspended",
        "cancelled",
      ],
    },
  },
} as const
