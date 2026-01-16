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
      agent_activity_logs: {
        Row: {
          action: string
          agent_role: Database["public"]["Enums"]["agent_role"]
          cost_usd: number | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_summary: string | null
          iteration_number: number | null
          output_summary: string | null
          parent_log_id: string | null
          reasoning: string | null
          status: string
          task_id: string
          tokens_used: number | null
          tool_input: Json | null
          tool_output: Json | null
          tool_used: string | null
        }
        Insert: {
          action: string
          agent_role: Database["public"]["Enums"]["agent_role"]
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_summary?: string | null
          iteration_number?: number | null
          output_summary?: string | null
          parent_log_id?: string | null
          reasoning?: string | null
          status?: string
          task_id: string
          tokens_used?: number | null
          tool_input?: Json | null
          tool_output?: Json | null
          tool_used?: string | null
        }
        Update: {
          action?: string
          agent_role?: Database["public"]["Enums"]["agent_role"]
          cost_usd?: number | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_summary?: string | null
          iteration_number?: number | null
          output_summary?: string | null
          parent_log_id?: string | null
          reasoning?: string | null
          status?: string
          task_id?: string
          tokens_used?: number | null
          tool_input?: Json | null
          tool_output?: Json | null
          tool_used?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_activity_logs_parent_log_id_fkey"
            columns: ["parent_log_id"]
            isOneToOne: false
            referencedRelation: "agent_activity_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_activity_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "research_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_ab_experiments: {
        Row: {
          completed_at: string | null
          control_metrics: Json | null
          control_model_id: string | null
          control_percentage: number
          created_at: string
          created_by: string | null
          current_sample_size: number
          description: string | null
          end_date: string | null
          experiment_name: string
          id: string
          min_sample_size: number
          project_id: string
          start_date: string | null
          statistical_significance: number | null
          status: string
          treatment_metrics: Json | null
          treatment_model_id: string | null
          winner: string | null
        }
        Insert: {
          completed_at?: string | null
          control_metrics?: Json | null
          control_model_id?: string | null
          control_percentage?: number
          created_at?: string
          created_by?: string | null
          current_sample_size?: number
          description?: string | null
          end_date?: string | null
          experiment_name: string
          id?: string
          min_sample_size?: number
          project_id: string
          start_date?: string | null
          statistical_significance?: number | null
          status?: string
          treatment_metrics?: Json | null
          treatment_model_id?: string | null
          winner?: string | null
        }
        Update: {
          completed_at?: string | null
          control_metrics?: Json | null
          control_model_id?: string | null
          control_percentage?: number
          created_at?: string
          created_by?: string | null
          current_sample_size?: number
          description?: string | null
          end_date?: string | null
          experiment_name?: string
          id?: string
          min_sample_size?: number
          project_id?: string
          start_date?: string | null
          statistical_significance?: number | null
          status?: string
          treatment_metrics?: Json | null
          treatment_model_id?: string | null
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_ab_experiments_control_model_id_fkey"
            columns: ["control_model_id"]
            isOneToOne: false
            referencedRelation: "ai_model_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_ab_experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_ab_experiments_treatment_model_id_fkey"
            columns: ["treatment_model_id"]
            isOneToOne: false
            referencedRelation: "ai_model_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_change_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          change_type: string
          created_at: string
          current_config: Json
          deployed_at: string | null
          description: string | null
          evaluated_at: string | null
          id: string
          is_breaking_change: boolean
          project_id: string
          proposed_by: string
          proposed_config: Json
          requires_approval: boolean
          rollback_reason: string | null
          rolled_back_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          change_type: string
          created_at?: string
          current_config?: Json
          deployed_at?: string | null
          description?: string | null
          evaluated_at?: string | null
          id?: string
          is_breaking_change?: boolean
          project_id: string
          proposed_by: string
          proposed_config?: Json
          requires_approval?: boolean
          rollback_reason?: string | null
          rolled_back_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          change_type?: string
          created_at?: string
          current_config?: Json
          deployed_at?: string | null
          description?: string | null
          evaluated_at?: string | null
          id?: string
          is_breaking_change?: boolean
          project_id?: string
          proposed_by?: string
          proposed_config?: Json
          requires_approval?: boolean
          rollback_reason?: string | null
          rolled_back_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_change_requests_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evaluation_gates: {
        Row: {
          baseline_metrics: Json
          change_request_id: string
          cost_delta_usd: number | null
          evaluated_at: string
          evaluated_by: string | null
          failure_reasons: string[] | null
          id: string
          latency_delta_ms: number | null
          ndcg_delta: number | null
          passed: boolean | null
          precision_delta: number | null
          proposed_metrics: Json
          recall_delta: number | null
          threshold_config: Json
        }
        Insert: {
          baseline_metrics?: Json
          change_request_id: string
          cost_delta_usd?: number | null
          evaluated_at?: string
          evaluated_by?: string | null
          failure_reasons?: string[] | null
          id?: string
          latency_delta_ms?: number | null
          ndcg_delta?: number | null
          passed?: boolean | null
          precision_delta?: number | null
          proposed_metrics?: Json
          recall_delta?: number | null
          threshold_config?: Json
        }
        Update: {
          baseline_metrics?: Json
          change_request_id?: string
          cost_delta_usd?: number | null
          evaluated_at?: string
          evaluated_by?: string | null
          failure_reasons?: string[] | null
          id?: string
          latency_delta_ms?: number | null
          ndcg_delta?: number | null
          passed?: boolean | null
          precision_delta?: number | null
          proposed_metrics?: Json
          recall_delta?: number | null
          threshold_config?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluation_gates_change_request_id_fkey"
            columns: ["change_request_id"]
            isOneToOne: false
            referencedRelation: "ai_change_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_evaluations: {
        Row: {
          citation_density_score: number | null
          confidence_score: number | null
          created_at: string
          hallucinations_detected: Json | null
          id: string
          original_response: string
          project_id: string
          query: string
          reasoning_path: Json | null
          source_chunks: Json | null
          source_relevance_score: number | null
          status: Database["public"]["Enums"]["evaluation_status"] | null
          unsupported_claims: Json | null
          updated_at: string
          user_id: string
          verification_duration_ms: number | null
          verification_score: number | null
          verified_response: string | null
          verifier_model: string | null
        }
        Insert: {
          citation_density_score?: number | null
          confidence_score?: number | null
          created_at?: string
          hallucinations_detected?: Json | null
          id?: string
          original_response: string
          project_id: string
          query: string
          reasoning_path?: Json | null
          source_chunks?: Json | null
          source_relevance_score?: number | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          unsupported_claims?: Json | null
          updated_at?: string
          user_id: string
          verification_duration_ms?: number | null
          verification_score?: number | null
          verified_response?: string | null
          verifier_model?: string | null
        }
        Update: {
          citation_density_score?: number | null
          confidence_score?: number | null
          created_at?: string
          hallucinations_detected?: Json | null
          id?: string
          original_response?: string
          project_id?: string
          query?: string
          reasoning_path?: Json | null
          source_chunks?: Json | null
          source_relevance_score?: number | null
          status?: Database["public"]["Enums"]["evaluation_status"] | null
          unsupported_claims?: Json | null
          updated_at?: string
          user_id?: string
          verification_duration_ms?: number | null
          verification_score?: number | null
          verified_response?: string | null
          verifier_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          ai_response: string
          corrected_response: string | null
          created_at: string
          document_id: string | null
          feedback_category: string | null
          feedback_text: string | null
          id: string
          is_used_for_training: boolean | null
          message_id: string | null
          project_id: string
          query: string
          rating: string
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string
        }
        Insert: {
          ai_response: string
          corrected_response?: string | null
          created_at?: string
          document_id?: string | null
          feedback_category?: string | null
          feedback_text?: string | null
          id?: string
          is_used_for_training?: boolean | null
          message_id?: string | null
          project_id: string
          query: string
          rating: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id: string
        }
        Update: {
          ai_response?: string
          corrected_response?: string | null
          created_at?: string
          document_id?: string | null
          feedback_category?: string | null
          feedback_text?: string | null
          id?: string
          is_used_for_training?: boolean | null
          message_id?: string | null
          project_id?: string
          query?: string
          rating?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_feedback_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "ai_feedback_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_governance_audit: {
        Row: {
          action: string
          action_category: string
          actor_id: string
          after_state: Json | null
          before_state: Json | null
          created_at: string
          id: string
          justification: string | null
          metadata: Json | null
          project_id: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          action_category: string
          actor_id: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          justification?: string | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          action_category?: string
          actor_id?: string
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          id?: string
          justification?: string | null
          metadata?: Json | null
          project_id?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_governance_audit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_model_registry: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          deployed_at: string | null
          deployment_percentage: number
          deprecated_at: string | null
          id: string
          is_active: boolean
          is_baseline: boolean
          model_name: string
          model_type: string
          model_version: string
          performance_metrics: Json | null
          project_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          deployment_percentage?: number
          deprecated_at?: string | null
          id?: string
          is_active?: boolean
          is_baseline?: boolean
          model_name: string
          model_type: string
          model_version: string
          performance_metrics?: Json | null
          project_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          deployed_at?: string | null
          deployment_percentage?: number
          deprecated_at?: string | null
          id?: string
          is_active?: boolean
          is_baseline?: boolean
          model_name?: string
          model_type?: string
          model_version?: string
          performance_metrics?: Json | null
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_model_registry_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quality_baselines: {
        Row: {
          baseline_type: string
          established_at: string
          established_by: string | null
          id: string
          is_current: boolean
          metrics: Json
          model_config: Json
          project_id: string
          sample_size: number
          superseded_at: string | null
          superseded_by: string | null
        }
        Insert: {
          baseline_type: string
          established_at?: string
          established_by?: string | null
          id?: string
          is_current?: boolean
          metrics?: Json
          model_config?: Json
          project_id: string
          sample_size?: number
          superseded_at?: string | null
          superseded_by?: string | null
        }
        Update: {
          baseline_type?: string
          established_at?: string
          established_by?: string | null
          id?: string
          is_current?: boolean
          metrics?: Json
          model_config?: Json
          project_id?: string
          sample_size?: number
          superseded_at?: string | null
          superseded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_quality_baselines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_quality_metrics: {
        Row: {
          dimension: string | null
          id: string
          measured_at: string
          metadata: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          model_version: string | null
          project_id: string
          sample_size: number | null
        }
        Insert: {
          dimension?: string | null
          id?: string
          measured_at?: string
          metadata?: Json | null
          metric_name: string
          metric_type: string
          metric_value: number
          model_version?: string | null
          project_id: string
          sample_size?: number | null
        }
        Update: {
          dimension?: string | null
          id?: string
          measured_at?: string
          metadata?: Json | null
          metric_name?: string
          metric_type?: string
          metric_value?: number
          model_version?: string | null
          project_id?: string
          sample_size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_quality_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_regression_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          baseline_value: number
          current_value: number
          delta_percent: number
          detected_at: string
          id: string
          is_acknowledged: boolean
          is_resolved: boolean
          metadata: Json | null
          metric_name: string
          project_id: string
          related_change_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          threshold_exceeded: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          baseline_value: number
          current_value: number
          delta_percent: number
          detected_at?: string
          id?: string
          is_acknowledged?: boolean
          is_resolved?: boolean
          metadata?: Json | null
          metric_name: string
          project_id: string
          related_change_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          threshold_exceeded?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          baseline_value?: number
          current_value?: number
          delta_percent?: number
          detected_at?: string
          id?: string
          is_acknowledged?: boolean
          is_resolved?: boolean
          metadata?: Json | null
          metric_name?: string
          project_id?: string
          related_change_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          threshold_exceeded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_regression_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_regression_alerts_related_change_id_fkey"
            columns: ["related_change_id"]
            isOneToOne: false
            referencedRelation: "ai_change_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          block_reason: string | null
          blocked: boolean | null
          cost_usd: number | null
          created_at: string
          id: string
          input_length: number | null
          latency_ms: number | null
          metadata: Json | null
          modality: string | null
          model: string
          model_selection_reason: string | null
          operation: string
          project_id: string | null
          request_id: string | null
          threats: string[] | null
          tokens_in: number | null
          tokens_out: number | null
          tokens_total: number | null
          user_id: string
        }
        Insert: {
          block_reason?: string | null
          blocked?: boolean | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_length?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          modality?: string | null
          model: string
          model_selection_reason?: string | null
          operation: string
          project_id?: string | null
          request_id?: string | null
          threats?: string[] | null
          tokens_in?: number | null
          tokens_out?: number | null
          tokens_total?: number | null
          user_id: string
        }
        Update: {
          block_reason?: string | null
          blocked?: boolean | null
          cost_usd?: number | null
          created_at?: string
          id?: string
          input_length?: number | null
          latency_ms?: number | null
          metadata?: Json | null
          modality?: string | null
          model?: string
          model_selection_reason?: string | null
          operation?: string
          project_id?: string | null
          request_id?: string | null
          threats?: string[] | null
          tokens_in?: number | null
          tokens_out?: number | null
          tokens_total?: number | null
          user_id?: string
        }
        Relationships: []
      }
      analytics_queries: {
        Row: {
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          generated_sql: string | null
          id: string
          is_successful: boolean | null
          natural_query: string
          parsed_intent: Json | null
          project_id: string
          result_data: Json | null
          result_type: string | null
          tokens_used: number | null
          user_id: string
          visualization_config: Json | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          generated_sql?: string | null
          id?: string
          is_successful?: boolean | null
          natural_query: string
          parsed_intent?: Json | null
          project_id: string
          result_data?: Json | null
          result_type?: string | null
          tokens_used?: number | null
          user_id: string
          visualization_config?: Json | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          generated_sql?: string | null
          id?: string
          is_successful?: boolean | null
          natural_query?: string
          parsed_intent?: Json | null
          project_id?: string
          result_data?: Json | null
          result_type?: string | null
          tokens_used?: number | null
          user_id?: string
          visualization_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_queries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          project_id: string | null
          rate_limit_per_day: number | null
          rate_limit_per_minute: number | null
          revoked_at: string | null
          scopes: string[] | null
          updated_at: string
          usage_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          project_id?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          scopes?: string[] | null
          updated_at?: string
          usage_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          project_id?: string | null
          rate_limit_per_day?: number | null
          rate_limit_per_minute?: number | null
          revoked_at?: string | null
          scopes?: string[] | null
          updated_at?: string
          usage_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      api_rate_limits: {
        Row: {
          api_key_id: string
          id: string
          request_count: number | null
          window_start: string
          window_type: string
        }
        Insert: {
          api_key_id: string
          id?: string
          request_count?: number | null
          window_start: string
          window_type: string
        }
        Update: {
          api_key_id?: string
          id?: string
          request_count?: number | null
          window_start?: string
          window_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_rate_limits_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          request_id: string | null
          resource_id: string
          resource_name: string
          resource_type: string
          severity_level: string | null
          user_agent: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          request_id?: string | null
          resource_id: string
          resource_name: string
          resource_type: string
          severity_level?: string | null
          user_agent?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          request_id?: string | null
          resource_id?: string
          resource_name?: string
          resource_type?: string
          severity_level?: string | null
          user_agent?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      base_models: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          model_type: string
          name: string
          provider: string
          requirements: Json | null
          size: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_type: string
          name: string
          provider: string
          requirements?: Json | null
          size: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          model_type?: string
          name?: string
          provider?: string
          requirements?: Json | null
          size?: string
        }
        Relationships: []
      }
      benchmark_runs: {
        Row: {
          avg_confidence_score: number | null
          avg_response_time_ms: number | null
          benchmark_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          model_version: string | null
          passed_questions: number | null
          project_id: string
          prompt_version: string | null
          results: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["benchmark_status"] | null
          total_questions: number | null
          user_id: string
        }
        Insert: {
          avg_confidence_score?: number | null
          avg_response_time_ms?: number | null
          benchmark_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_version?: string | null
          passed_questions?: number | null
          project_id: string
          prompt_version?: string | null
          results?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["benchmark_status"] | null
          total_questions?: number | null
          user_id: string
        }
        Update: {
          avg_confidence_score?: number | null
          avg_response_time_ms?: number | null
          benchmark_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          model_version?: string | null
          passed_questions?: number | null
          project_id?: string
          prompt_version?: string | null
          results?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["benchmark_status"] | null
          total_questions?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_runs_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "quality_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_decisions: {
        Row: {
          actual_cost_usd: number | null
          adjusted_config: Json | null
          cost_savings_percent: number | null
          created_at: string
          decision_type: string
          estimated_cost_usd: number | null
          id: string
          original_config: Json | null
          project_id: string
          quality_impact_percent: number | null
          reason: string
          user_id: string
        }
        Insert: {
          actual_cost_usd?: number | null
          adjusted_config?: Json | null
          cost_savings_percent?: number | null
          created_at?: string
          decision_type: string
          estimated_cost_usd?: number | null
          id?: string
          original_config?: Json | null
          project_id: string
          quality_impact_percent?: number | null
          reason: string
          user_id: string
        }
        Update: {
          actual_cost_usd?: number | null
          adjusted_config?: Json | null
          cost_savings_percent?: number | null
          created_at?: string
          decision_type?: string
          estimated_cost_usd?: number | null
          id?: string
          original_config?: Json | null
          project_id?: string
          quality_impact_percent?: number | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_decisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cache_entries: {
        Row: {
          cache_key: string
          cache_type: string
          content_hash: string
          created_at: string
          document_id: string | null
          expires_at: string
          hit_count: number | null
          id: string
          last_hit_at: string | null
          ttl_seconds: number | null
          value_ref: string | null
        }
        Insert: {
          cache_key: string
          cache_type: string
          content_hash: string
          created_at?: string
          document_id?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_hit_at?: string | null
          ttl_seconds?: number | null
          value_ref?: string | null
        }
        Update: {
          cache_key?: string
          cache_type?: string
          content_hash?: string
          created_at?: string
          document_id?: string | null
          expires_at?: string
          hit_count?: number | null
          id?: string
          last_hit_at?: string | null
          ttl_seconds?: number | null
          value_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cache_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cache_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      chat_image_uploads: {
        Row: {
          ai_analysis: Json | null
          created_at: string
          file_size_bytes: number | null
          height: number | null
          id: string
          message_id: string | null
          mime_type: string | null
          project_id: string
          selected_region: Json | null
          storage_path: string
          thread_id: string | null
          thumbnail_path: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          project_id: string
          selected_region?: Json | null
          storage_path: string
          thread_id?: string | null
          thumbnail_path?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          message_id?: string | null
          mime_type?: string | null
          project_id?: string
          selected_region?: Json | null
          storage_path?: string
          thread_id?: string | null
          thumbnail_path?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_image_uploads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_image_uploads_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "shared_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          document_refs: string[] | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          mentions: string[] | null
          metadata: Json | null
          sender_id: string
          sender_type: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          document_refs?: string[] | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          mentions?: string[] | null
          metadata?: Json | null
          sender_id: string
          sender_type?: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          document_refs?: string[] | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          mentions?: string[] | null
          metadata?: Json | null
          sender_id?: string
          sender_type?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "shared_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chunks: {
        Row: {
          chunking_strategy: string | null
          chunking_version: string | null
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          embedding_date: string | null
          embedding_model: string | null
          embedding_model_version: string | null
          hash: string | null
          id: string
          index: number
          is_duplicate: boolean | null
          metadata: Json | null
          quality_score: number | null
          search_vector: unknown
          vector_dimension: number | null
        }
        Insert: {
          chunking_strategy?: string | null
          chunking_version?: string | null
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_date?: string | null
          embedding_model?: string | null
          embedding_model_version?: string | null
          hash?: string | null
          id?: string
          index: number
          is_duplicate?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          search_vector?: unknown
          vector_dimension?: number | null
        }
        Update: {
          chunking_strategy?: string | null
          chunking_version?: string | null
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_date?: string | null
          embedding_model?: string | null
          embedding_model_version?: string | null
          hash?: string | null
          id?: string
          index?: number
          is_duplicate?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          search_vector?: unknown
          vector_dimension?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      collaborative_edits: {
        Row: {
          created_at: string
          document_id: string
          edit_type: string
          field_name: string
          id: string
          is_reverted: boolean | null
          new_value: string | null
          previous_value: string | null
          reverted_at: string | null
          reverted_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          document_id: string
          edit_type?: string
          field_name: string
          id?: string
          is_reverted?: boolean | null
          new_value?: string | null
          previous_value?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          document_id?: string
          edit_type?: string
          field_name?: string
          id?: string
          is_reverted?: boolean | null
          new_value?: string | null
          previous_value?: string | null
          reverted_at?: string | null
          reverted_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborative_edits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborative_edits_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      content_templates: {
        Row: {
          created_at: string
          description: string | null
          example_output: string | null
          id: string
          is_public: boolean | null
          name: string
          output_structure: Json | null
          project_id: string | null
          system_prompt: string | null
          target_format: Database["public"]["Enums"]["content_target_format"]
          updated_at: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          example_output?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          output_structure?: Json | null
          project_id?: string | null
          system_prompt?: string | null
          target_format: Database["public"]["Enums"]["content_target_format"]
          updated_at?: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          example_output?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          output_structure?: Json | null
          project_id?: string | null
          system_prompt?: string | null
          target_format?: Database["public"]["Enums"]["content_target_format"]
          updated_at?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_templates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_versions: {
        Row: {
          changes_summary: string | null
          content: string
          created_at: string
          diff_from_previous: Json | null
          generated_content_id: string
          id: string
          structured_output: Json | null
          user_id: string
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          content: string
          created_at?: string
          diff_from_previous?: Json | null
          generated_content_id: string
          id?: string
          structured_output?: Json | null
          user_id: string
          version_number?: number
        }
        Update: {
          changes_summary?: string | null
          content?: string
          created_at?: string
          diff_from_previous?: Json | null
          generated_content_id?: string
          id?: string
          structured_output?: Json | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_versions_generated_content_id_fkey"
            columns: ["generated_content_id"]
            isOneToOne: false
            referencedRelation: "generated_content"
            referencedColumns: ["id"]
          },
        ]
      }
      cross_language_queries: {
        Row: {
          avg_relevance_score: number | null
          created_at: string
          id: string
          last_used_at: string
          project_id: string
          query_embedding: string | null
          result_count: number | null
          source_language: string
          source_query: string
          target_language: string
          translated_query: string
          use_count: number | null
          user_id: string
        }
        Insert: {
          avg_relevance_score?: number | null
          created_at?: string
          id?: string
          last_used_at?: string
          project_id: string
          query_embedding?: string | null
          result_count?: number | null
          source_language: string
          source_query: string
          target_language: string
          translated_query: string
          use_count?: number | null
          user_id: string
        }
        Update: {
          avg_relevance_score?: number | null
          created_at?: string
          id?: string
          last_used_at?: string
          project_id?: string
          query_embedding?: string | null
          result_count?: number | null
          source_language?: string
          source_query?: string
          target_language?: string
          translated_query?: string
          use_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cross_language_queries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_tone_templates: {
        Row: {
          created_at: string
          formality_level: string | null
          id: string
          is_default: boolean | null
          jurisdiction:
            | Database["public"]["Enums"]["jurisdiction_region"]
            | null
          name: string
          template_ar: string
          template_en: string | null
          tone_type: string
          usage_context: string | null
        }
        Insert: {
          created_at?: string
          formality_level?: string | null
          id?: string
          is_default?: boolean | null
          jurisdiction?:
            | Database["public"]["Enums"]["jurisdiction_region"]
            | null
          name: string
          template_ar: string
          template_en?: string | null
          tone_type: string
          usage_context?: string | null
        }
        Update: {
          created_at?: string
          formality_level?: string | null
          id?: string
          is_default?: boolean | null
          jurisdiction?:
            | Database["public"]["Enums"]["jurisdiction_region"]
            | null
          name?: string
          template_ar?: string
          template_en?: string | null
          tone_type?: string
          usage_context?: string | null
        }
        Relationships: []
      }
      curated_qa_pairs: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          assistant_response: string
          created_at: string
          dataset_id: string
          id: string
          is_approved: boolean | null
          metadata: Json | null
          project_id: string
          quality_flags: string[] | null
          quality_score: number | null
          source_id: string | null
          source_type: string
          system_prompt: string | null
          token_count: number | null
          updated_at: string
          user_id: string
          user_message: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          assistant_response: string
          created_at?: string
          dataset_id: string
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          project_id: string
          quality_flags?: string[] | null
          quality_score?: number | null
          source_id?: string | null
          source_type: string
          system_prompt?: string | null
          token_count?: number | null
          updated_at?: string
          user_id: string
          user_message: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          assistant_response?: string
          created_at?: string
          dataset_id?: string
          id?: string
          is_approved?: boolean | null
          metadata?: Json | null
          project_id?: string
          quality_flags?: string[] | null
          quality_score?: number | null
          source_id?: string | null
          source_type?: string
          system_prompt?: string | null
          token_count?: number | null
          updated_at?: string
          user_id?: string
          user_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "curated_qa_pairs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "curated_qa_pairs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      data_extractions: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          extracted_data: Json | null
          extraction_cost_usd: number | null
          fields: Json
          id: string
          name: string
          project_id: string
          source_document_ids: string[]
          status: Database["public"]["Enums"]["report_status"]
          total_tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          extraction_cost_usd?: number | null
          fields?: Json
          id?: string
          name: string
          project_id: string
          source_document_ids?: string[]
          status?: Database["public"]["Enums"]["report_status"]
          total_tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          extracted_data?: Json | null
          extraction_cost_usd?: number | null
          fields?: Json
          id?: string
          name?: string
          project_id?: string
          source_document_ids?: string[]
          status?: Database["public"]["Enums"]["report_status"]
          total_tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_extractions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      data_sources: {
        Row: {
          created_at: string | null
          error_message: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          name: string
          original_url: string | null
          project_id: string
          raw_content: string | null
          source_type: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name: string
          original_url?: string | null
          project_id: string
          raw_content?: string | null
          source_type: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          original_url?: string | null
          project_id?: string
          raw_content?: string | null
          source_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      dataset_versions: {
        Row: {
          changes_summary: string | null
          created_at: string
          created_by: string
          dataset_id: string
          description: string | null
          id: string
          name: string | null
          pairs_count: number | null
          snapshot: Json
          tokens_count: number | null
          version_number: number
        }
        Insert: {
          changes_summary?: string | null
          created_at?: string
          created_by: string
          dataset_id: string
          description?: string | null
          id?: string
          name?: string | null
          pairs_count?: number | null
          snapshot?: Json
          tokens_count?: number | null
          version_number: number
        }
        Update: {
          changes_summary?: string | null
          created_at?: string
          created_by?: string
          dataset_id?: string
          description?: string | null
          id?: string
          name?: string | null
          pairs_count?: number | null
          snapshot?: Json
          tokens_count?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "dataset_versions_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      dialect_mappings: {
        Row: {
          context: string | null
          created_at: string
          dialect: Database["public"]["Enums"]["arabic_dialect"]
          dialect_term: string
          english_translation: string | null
          id: string
          is_verified: boolean | null
          msa_equivalent: string
          project_id: string | null
          updated_at: string
          usage_notes: string | null
          user_id: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          dialect: Database["public"]["Enums"]["arabic_dialect"]
          dialect_term: string
          english_translation?: string | null
          id?: string
          is_verified?: boolean | null
          msa_equivalent: string
          project_id?: string | null
          updated_at?: string
          usage_notes?: string | null
          user_id: string
        }
        Update: {
          context?: string | null
          created_at?: string
          dialect?: Database["public"]["Enums"]["arabic_dialect"]
          dialect_term?: string
          english_translation?: string | null
          id?: string
          is_verified?: boolean | null
          msa_equivalent?: string
          project_id?: string | null
          updated_at?: string
          usage_notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dialect_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_annotations: {
        Row: {
          ai_responded_at: string | null
          ai_response: string | null
          annotation_type: Database["public"]["Enums"]["annotation_type"]
          content: string
          created_at: string
          document_id: string
          end_offset: number | null
          id: string
          is_resolved: boolean | null
          mentions: string[] | null
          page_number: number | null
          position: Json | null
          replies: Json | null
          resolved_at: string | null
          resolved_by: string | null
          selected_text: string | null
          start_offset: number | null
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_responded_at?: string | null
          ai_response?: string | null
          annotation_type?: Database["public"]["Enums"]["annotation_type"]
          content: string
          created_at?: string
          document_id: string
          end_offset?: number | null
          id?: string
          is_resolved?: boolean | null
          mentions?: string[] | null
          page_number?: number | null
          position?: Json | null
          replies?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          selected_text?: string | null
          start_offset?: number | null
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_responded_at?: string | null
          ai_response?: string | null
          annotation_type?: Database["public"]["Enums"]["annotation_type"]
          content?: string
          created_at?: string
          document_id?: string
          end_offset?: number | null
          id?: string
          is_resolved?: boolean | null
          mentions?: string[] | null
          page_number?: number | null
          position?: Json | null
          replies?: Json | null
          resolved_at?: string | null
          resolved_by?: string | null
          selected_text?: string | null
          start_offset?: number | null
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_annotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_annotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_annotations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      document_anomalies: {
        Row: {
          anomaly_type: string
          confidence_score: number | null
          conflicting_document_id: string | null
          conflicting_value: string | null
          created_at: string
          description: string
          detected_at: string
          field_name: string | null
          id: string
          is_resolved: boolean | null
          project_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          source_document_id: string
          source_value: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anomaly_type: string
          confidence_score?: number | null
          conflicting_document_id?: string | null
          conflicting_value?: string | null
          created_at?: string
          description: string
          detected_at?: string
          field_name?: string | null
          id?: string
          is_resolved?: boolean | null
          project_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_document_id: string
          source_value?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anomaly_type?: string
          confidence_score?: number | null
          conflicting_document_id?: string | null
          conflicting_value?: string | null
          created_at?: string
          description?: string
          detected_at?: string
          field_name?: string | null
          id?: string
          is_resolved?: boolean | null
          project_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          source_document_id?: string
          source_value?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_anomalies_conflicting_document_id_fkey"
            columns: ["conflicting_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_anomalies_conflicting_document_id_fkey"
            columns: ["conflicting_document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_anomalies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_anomalies_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_anomalies_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      document_dialect_analysis: {
        Row: {
          analyzed_at: string
          detected_dialects: Json | null
          dialect_confidence: number | null
          dialect_regions: Json | null
          document_id: string
          has_mixed_dialects: boolean | null
          id: string
          msa_conversion_available: boolean | null
          msa_converted_text: string | null
          primary_dialect: Database["public"]["Enums"]["arabic_dialect"] | null
          project_id: string
          user_id: string
        }
        Insert: {
          analyzed_at?: string
          detected_dialects?: Json | null
          dialect_confidence?: number | null
          dialect_regions?: Json | null
          document_id: string
          has_mixed_dialects?: boolean | null
          id?: string
          msa_conversion_available?: boolean | null
          msa_converted_text?: string | null
          primary_dialect?: Database["public"]["Enums"]["arabic_dialect"] | null
          project_id: string
          user_id: string
        }
        Update: {
          analyzed_at?: string
          detected_dialects?: Json | null
          dialect_confidence?: number | null
          dialect_regions?: Json | null
          document_id?: string
          has_mixed_dialects?: boolean | null
          id?: string
          msa_conversion_available?: boolean | null
          msa_converted_text?: string | null
          primary_dialect?: Database["public"]["Enums"]["arabic_dialect"] | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_dialect_analysis_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_dialect_analysis_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_dialect_analysis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_locks: {
        Row: {
          document_id: string
          expires_at: string
          field_name: string
          id: string
          is_active: boolean
          locked_at: string
          user_id: string
        }
        Insert: {
          document_id: string
          expires_at?: string
          field_name: string
          id?: string
          is_active?: boolean
          locked_at?: string
          user_id: string
        }
        Update: {
          document_id?: string
          expires_at?: string
          field_name?: string
          id?: string
          is_active?: boolean
          locked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_locks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_locks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      document_scores: {
        Row: {
          ai_summary: string | null
          compliance_issues: Json | null
          created_at: string
          document_id: string
          expires_at: string | null
          flagged_clauses: Json | null
          id: string
          key_dates: Json | null
          opportunity_factors: Json | null
          opportunity_score: number | null
          project_id: string
          risk_factors: Json | null
          risk_score: number | null
          scored_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          compliance_issues?: Json | null
          created_at?: string
          document_id: string
          expires_at?: string | null
          flagged_clauses?: Json | null
          id?: string
          key_dates?: Json | null
          opportunity_factors?: Json | null
          opportunity_score?: number | null
          project_id: string
          risk_factors?: Json | null
          risk_score?: number | null
          scored_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          compliance_issues?: Json | null
          created_at?: string
          document_id?: string
          expires_at?: string | null
          flagged_clauses?: Json | null
          id?: string
          key_dates?: Json | null
          opportunity_factors?: Json | null
          opportunity_score?: number | null
          project_id?: string
          risk_factors?: Json | null
          risk_score?: number | null
          scored_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_scores_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_scores_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "document_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      document_trends: {
        Row: {
          affected_document_ids: string[] | null
          confidence_score: number | null
          created_at: string
          data_points: Json | null
          description: string | null
          first_detected_at: string
          id: string
          is_active: boolean | null
          last_updated_at: string
          metadata: Json | null
          project_id: string
          time_series_data: Json | null
          title: string
          trend_type: string
          user_id: string
        }
        Insert: {
          affected_document_ids?: string[] | null
          confidence_score?: number | null
          created_at?: string
          data_points?: Json | null
          description?: string | null
          first_detected_at?: string
          id?: string
          is_active?: boolean | null
          last_updated_at?: string
          metadata?: Json | null
          project_id: string
          time_series_data?: Json | null
          title: string
          trend_type: string
          user_id: string
        }
        Update: {
          affected_document_ids?: string[] | null
          confidence_score?: number | null
          created_at?: string
          data_points?: Json | null
          description?: string | null
          first_detected_at?: string
          id?: string
          is_active?: boolean | null
          last_updated_at?: string
          metadata?: Json | null
          project_id?: string
          time_series_data?: Json | null
          title?: string
          trend_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_trends_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          embedding: string | null
          embedding_date: string | null
          embedding_dimensions: number | null
          embedding_model: string | null
          embedding_model_version: string | null
          enriched_metadata: Json | null
          error_message: string | null
          extracted_text: string | null
          id: string
          language: string | null
          mime_type: string
          name: string
          needs_reindexing: boolean | null
          original_name: string
          owner_id: string
          processed_at: string | null
          processing_cost_usd: number | null
          processing_metadata: Json | null
          processing_steps: Json | null
          project_id: string
          quality_score: number | null
          search_vector: unknown
          size_bytes: number
          status: string
          storage_path: string
          summary: string | null
          total_tokens_used: number | null
          trace_id: string | null
          updated_at: string
          word_count: number | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          embedding?: string | null
          embedding_date?: string | null
          embedding_dimensions?: number | null
          embedding_model?: string | null
          embedding_model_version?: string | null
          enriched_metadata?: Json | null
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          language?: string | null
          mime_type: string
          name: string
          needs_reindexing?: boolean | null
          original_name: string
          owner_id: string
          processed_at?: string | null
          processing_cost_usd?: number | null
          processing_metadata?: Json | null
          processing_steps?: Json | null
          project_id: string
          quality_score?: number | null
          search_vector?: unknown
          size_bytes: number
          status?: string
          storage_path: string
          summary?: string | null
          total_tokens_used?: number | null
          trace_id?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          embedding?: string | null
          embedding_date?: string | null
          embedding_dimensions?: number | null
          embedding_model?: string | null
          embedding_model_version?: string | null
          enriched_metadata?: Json | null
          error_message?: string | null
          extracted_text?: string | null
          id?: string
          language?: string | null
          mime_type?: string
          name?: string
          needs_reindexing?: boolean | null
          original_name?: string
          owner_id?: string
          processed_at?: string | null
          processing_cost_usd?: number | null
          processing_metadata?: Json | null
          processing_steps?: Json | null
          project_id?: string
          quality_score?: number | null
          search_vector?: unknown
          size_bytes?: number
          status?: string
          storage_path?: string
          summary?: string | null
          total_tokens_used?: number | null
          trace_id?: string | null
          updated_at?: string
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_extraction_jobs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          document_id: string | null
          entities_extracted: number | null
          error_message: string | null
          id: string
          project_id: string
          relationships_created: number | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          entities_extracted?: number | null
          error_message?: string | null
          id?: string
          project_id: string
          relationships_created?: number | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          document_id?: string | null
          entities_extracted?: number | null
          error_message?: string | null
          id?: string
          project_id?: string
          relationships_created?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_extraction_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entity_extraction_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "entity_extraction_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      executive_briefings: {
        Row: {
          content_markdown: string | null
          content_pdf_url: string | null
          created_at: string
          error_message: string | null
          generated_at: string | null
          generation_cost_usd: number | null
          highlights: Json | null
          id: string
          key_decisions: string | null
          new_documents_summary: string | null
          period_end: string
          period_start: string
          project_id: string
          status: string
          summary_stats: Json | null
          title: string
          tokens_used: number | null
          upcoming_deadlines: Json | null
          updated_at: string
          user_id: string
          whats_next: string | null
        }
        Insert: {
          content_markdown?: string | null
          content_pdf_url?: string | null
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          generation_cost_usd?: number | null
          highlights?: Json | null
          id?: string
          key_decisions?: string | null
          new_documents_summary?: string | null
          period_end: string
          period_start: string
          project_id: string
          status?: string
          summary_stats?: Json | null
          title: string
          tokens_used?: number | null
          upcoming_deadlines?: Json | null
          updated_at?: string
          user_id: string
          whats_next?: string | null
        }
        Update: {
          content_markdown?: string | null
          content_pdf_url?: string | null
          created_at?: string
          error_message?: string | null
          generated_at?: string | null
          generation_cost_usd?: number | null
          highlights?: Json | null
          id?: string
          key_decisions?: string | null
          new_documents_summary?: string | null
          period_end?: string
          period_start?: string
          project_id?: string
          status?: string
          summary_stats?: Json | null
          title?: string
          tokens_used?: number | null
          upcoming_deadlines?: Json | null
          updated_at?: string
          user_id?: string
          whats_next?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executive_briefings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      export_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dataset_id: string | null
          error_message: string | null
          file_size_bytes: number | null
          file_url: string | null
          format: string
          id: string
          project_id: string
          record_count: number | null
          started_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dataset_id?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format: string
          id?: string
          project_id: string
          record_count?: number | null
          started_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dataset_id?: string | null
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          format?: string
          id?: string
          project_id?: string
          record_count?: number | null
          started_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_history_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "export_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_cache: {
        Row: {
          created_at: string
          extracted_text: string | null
          extraction_method: string | null
          file_hash: string
          id: string
          last_used_at: string
          mime_type: string | null
          text_length: number | null
          use_count: number | null
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          extraction_method?: string | null
          file_hash: string
          id?: string
          last_used_at?: string
          mime_type?: string | null
          text_length?: number | null
          use_count?: number | null
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          extraction_method?: string | null
          file_hash?: string
          id?: string
          last_used_at?: string
          mime_type?: string | null
          text_length?: number | null
          use_count?: number | null
        }
        Relationships: []
      }
      finetune_jobs: {
        Row: {
          base_model_id: string
          completed_at: string | null
          created_at: string | null
          current_epoch: number | null
          current_step: number | null
          dataset_id: string | null
          error_message: string | null
          estimated_completion: string | null
          estimated_cost: number | null
          external_job_id: string | null
          gpu_hours: number | null
          id: string
          loss: number | null
          metrics: Json | null
          name: string
          output_model_path: string | null
          owner_id: string
          project_id: string
          started_at: string | null
          status: string | null
          total_steps: number | null
          training_config: Json
          training_samples: number | null
          updated_at: string | null
        }
        Insert: {
          base_model_id: string
          completed_at?: string | null
          created_at?: string | null
          current_epoch?: number | null
          current_step?: number | null
          dataset_id?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          estimated_cost?: number | null
          external_job_id?: string | null
          gpu_hours?: number | null
          id?: string
          loss?: number | null
          metrics?: Json | null
          name: string
          output_model_path?: string | null
          owner_id: string
          project_id: string
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          training_config?: Json
          training_samples?: number | null
          updated_at?: string | null
        }
        Update: {
          base_model_id?: string
          completed_at?: string | null
          created_at?: string | null
          current_epoch?: number | null
          current_step?: number | null
          dataset_id?: string | null
          error_message?: string | null
          estimated_completion?: string | null
          estimated_cost?: number | null
          external_job_id?: string | null
          gpu_hours?: number | null
          id?: string
          loss?: number | null
          metrics?: Json | null
          name?: string
          output_model_path?: string | null
          owner_id?: string
          project_id?: string
          started_at?: string | null
          status?: string | null
          total_steps?: number | null
          training_config?: Json
          training_samples?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finetune_jobs_base_model_id_fkey"
            columns: ["base_model_id"]
            isOneToOne: false
            referencedRelation: "base_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finetune_jobs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finetune_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_content: {
        Row: {
          completed_at: string | null
          created_at: string
          custom_format_description: string | null
          error_message: string | null
          generated_content: string | null
          generation_cost_usd: number | null
          id: string
          instructions: string | null
          language: string | null
          project_id: string
          source_document_ids: string[]
          source_text: string | null
          status: Database["public"]["Enums"]["content_generation_status"]
          structured_output: Json | null
          target_format: Database["public"]["Enums"]["content_target_format"]
          title: string
          tokens_used: number | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          custom_format_description?: string | null
          error_message?: string | null
          generated_content?: string | null
          generation_cost_usd?: number | null
          id?: string
          instructions?: string | null
          language?: string | null
          project_id: string
          source_document_ids?: string[]
          source_text?: string | null
          status?: Database["public"]["Enums"]["content_generation_status"]
          structured_output?: Json | null
          target_format: Database["public"]["Enums"]["content_target_format"]
          title: string
          tokens_used?: number | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          custom_format_description?: string | null
          error_message?: string | null
          generated_content?: string | null
          generation_cost_usd?: number | null
          id?: string
          instructions?: string | null
          language?: string | null
          project_id?: string
          source_document_ids?: string[]
          source_text?: string | null
          status?: Database["public"]["Enums"]["content_generation_status"]
          structured_output?: Json | null
          target_format?: Database["public"]["Enums"]["content_target_format"]
          title?: string
          tokens_used?: number | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_content_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_reports: {
        Row: {
          completed_at: string | null
          content_markdown: string | null
          created_at: string
          error_message: string | null
          exported_formats: string[] | null
          generation_cost_usd: number | null
          generation_time_ms: number | null
          id: string
          language: string | null
          last_exported_at: string | null
          name: string
          project_id: string
          sections_data: Json | null
          source_document_ids: string[]
          status: Database["public"]["Enums"]["report_status"]
          template_id: string | null
          total_tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          content_markdown?: string | null
          created_at?: string
          error_message?: string | null
          exported_formats?: string[] | null
          generation_cost_usd?: number | null
          generation_time_ms?: number | null
          id?: string
          language?: string | null
          last_exported_at?: string | null
          name: string
          project_id: string
          sections_data?: Json | null
          source_document_ids?: string[]
          status?: Database["public"]["Enums"]["report_status"]
          template_id?: string | null
          total_tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          content_markdown?: string | null
          created_at?: string
          error_message?: string | null
          exported_formats?: string[] | null
          generation_cost_usd?: number | null
          generation_time_ms?: number | null
          id?: string
          language?: string | null
          last_exported_at?: string | null
          name?: string
          project_id?: string
          sections_data?: Json | null
          source_document_ids?: string[]
          status?: Database["public"]["Enums"]["report_status"]
          template_id?: string | null
          total_tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      glossary_terms: {
        Row: {
          aliases: string[] | null
          category: string | null
          context_hints: string[] | null
          created_at: string
          definition: string
          do_not_translate: boolean | null
          examples: string[] | null
          glossary_id: string
          id: string
          search_vector: unknown
          term: string
          updated_at: string
        }
        Insert: {
          aliases?: string[] | null
          category?: string | null
          context_hints?: string[] | null
          created_at?: string
          definition: string
          do_not_translate?: boolean | null
          examples?: string[] | null
          glossary_id: string
          id?: string
          search_vector?: unknown
          term: string
          updated_at?: string
        }
        Update: {
          aliases?: string[] | null
          category?: string | null
          context_hints?: string[] | null
          created_at?: string
          definition?: string
          do_not_translate?: boolean | null
          examples?: string[] | null
          glossary_id?: string
          id?: string
          search_vector?: unknown
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "glossary_terms_glossary_id_fkey"
            columns: ["glossary_id"]
            isOneToOne: false
            referencedRelation: "project_glossaries"
            referencedColumns: ["id"]
          },
        ]
      }
      gold_standard_answers: {
        Row: {
          applied_at: string | null
          approved_by: string | null
          correction_notes: string | null
          created_at: string
          evaluation_id: string | null
          gold_response: string
          id: string
          incorrect_response: string
          is_applied_to_prompt: boolean | null
          project_id: string
          query: string
          source_document_ids: string[] | null
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          approved_by?: string | null
          correction_notes?: string | null
          created_at?: string
          evaluation_id?: string | null
          gold_response: string
          id?: string
          incorrect_response: string
          is_applied_to_prompt?: boolean | null
          project_id: string
          query: string
          source_document_ids?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          approved_by?: string | null
          correction_notes?: string | null
          created_at?: string
          evaluation_id?: string | null
          gold_response?: string
          id?: string
          incorrect_response?: string
          is_applied_to_prompt?: boolean | null
          project_id?: string
          query?: string
          source_document_ids?: string[] | null
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gold_standard_answers_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "ai_evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gold_standard_answers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      injection_detection_logs: {
        Row: {
          action_taken: string | null
          content_sample: string | null
          detected_at: string
          detected_patterns: string[]
          document_id: string | null
          id: string
          project_id: string | null
          severity: string
          source_type: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          content_sample?: string | null
          detected_at?: string
          detected_patterns?: string[]
          document_id?: string | null
          id?: string
          project_id?: string | null
          severity?: string
          source_type: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          content_sample?: string | null
          detected_at?: string
          detected_patterns?: string[]
          document_id?: string | null
          id?: string
          project_id?: string | null
          severity?: string
          source_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injection_detection_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injection_detection_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "injection_detection_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          created_at: string
          description: string | null
          error_message: string | null
          event_type: string
          id: string
          integration_id: string | null
          metadata: Json | null
          project_id: string | null
          provider: Database["public"]["Enums"]["integration_provider"] | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          status: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"] | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          status?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          integration_id?: string | null
          metadata?: Json | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"] | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          status?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token_encrypted: string | null
          config: Json | null
          created_at: string
          display_name: string | null
          id: string
          last_sync_at: string | null
          project_id: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted: string | null
          status: Database["public"]["Enums"]["integration_status"]
          sync_error: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          webhook_events: string[] | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token_encrypted?: string | null
          config?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          project_id?: string | null
          provider: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          webhook_events?: string[] | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token_encrypted?: string | null
          config?: Json | null
          created_at?: string
          display_name?: string | null
          id?: string
          last_sync_at?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["integration_provider"]
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["integration_status"]
          sync_error?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          webhook_events?: string[] | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          max_uses: number
          tier_granted: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          tier_granted?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number
          tier_granted?: string | null
          used_count?: number
        }
        Relationships: []
      }
      jurisdiction_terms: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          effective_date: string | null
          id: string
          is_active: boolean | null
          jurisdiction: Database["public"]["Enums"]["jurisdiction_region"]
          legal_reference: string | null
          local_term_ar: string
          local_term_en: string
          metadata: Json | null
          term_key: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction: Database["public"]["Enums"]["jurisdiction_region"]
          legal_reference?: string | null
          local_term_ar: string
          local_term_en: string
          metadata?: Json | null
          term_key: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          effective_date?: string | null
          id?: string
          is_active?: boolean | null
          jurisdiction?: Database["public"]["Enums"]["jurisdiction_region"]
          legal_reference?: string | null
          local_term_ar?: string
          local_term_en?: string
          metadata?: Json | null
          term_key?: string
        }
        Relationships: []
      }
      knowledge_base_articles: {
        Row: {
          author_id: string
          content_markdown: string
          created_at: string
          id: string
          is_published: boolean | null
          knowledge_base_id: string
          last_edited_by: string | null
          published_at: string | null
          search_vector: unknown
          slug: string
          source_chunk_ids: string[] | null
          source_document_ids: string[] | null
          summary: string | null
          tags: string[] | null
          title: string
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          content_markdown: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          knowledge_base_id: string
          last_edited_by?: string | null
          published_at?: string | null
          search_vector?: unknown
          slug: string
          source_chunk_ids?: string[] | null
          source_document_ids?: string[] | null
          summary?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          content_markdown?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          knowledge_base_id?: string
          last_edited_by?: string | null
          published_at?: string | null
          search_vector?: unknown
          slug?: string
          source_chunk_ids?: string[] | null
          source_document_ids?: string[] | null
          summary?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_articles_knowledge_base_id_fkey"
            columns: ["knowledge_base_id"]
            isOneToOne: false
            referencedRelation: "knowledge_bases"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_bases: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          settings: Json | null
          slug: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_bases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph_edges: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          evidence_snippets: string[] | null
          id: string
          is_ai_discovered: boolean | null
          project_id: string
          properties: Json | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          source_document_ids: string[] | null
          source_node_id: string
          target_node_id: string
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          evidence_snippets?: string[] | null
          id?: string
          is_ai_discovered?: boolean | null
          project_id: string
          properties?: Json | null
          relationship_type: Database["public"]["Enums"]["relationship_type"]
          source_document_ids?: string[] | null
          source_node_id: string
          target_node_id: string
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          evidence_snippets?: string[] | null
          id?: string
          is_ai_discovered?: boolean | null
          project_id?: string
          properties?: Json | null
          relationship_type?: Database["public"]["Enums"]["relationship_type"]
          source_document_ids?: string[] | null
          source_node_id?: string
          target_node_id?: string
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_graph_edges_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_graph_edges_source_node_id_fkey"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_graph_edges_target_node_id_fkey"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "knowledge_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph_insights: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string
          id: string
          insight_type: string
          involved_document_ids: string[] | null
          involved_edge_ids: string[] | null
          involved_node_ids: string[] | null
          is_confirmed: boolean | null
          is_dismissed: boolean | null
          metadata: Json | null
          project_id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          description: string
          id?: string
          insight_type: string
          involved_document_ids?: string[] | null
          involved_edge_ids?: string[] | null
          involved_node_ids?: string[] | null
          is_confirmed?: boolean | null
          is_dismissed?: boolean | null
          metadata?: Json | null
          project_id: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string
          id?: string
          insight_type?: string
          involved_document_ids?: string[] | null
          involved_edge_ids?: string[] | null
          involved_node_ids?: string[] | null
          is_confirmed?: boolean | null
          is_dismissed?: boolean | null
          metadata?: Json | null
          project_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_graph_insights_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_graph_nodes: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          description: string | null
          embedding: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          first_seen_at: string | null
          id: string
          last_seen_at: string | null
          mention_count: number | null
          name: string
          normalized_name: string
          project_id: string
          properties: Json | null
          source_document_ids: string[] | null
          updated_at: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          entity_type: Database["public"]["Enums"]["entity_type"]
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          mention_count?: number | null
          name: string
          normalized_name: string
          project_id: string
          properties?: Json | null
          source_document_ids?: string[] | null
          updated_at?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          embedding?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"]
          first_seen_at?: string | null
          id?: string
          last_seen_at?: string | null
          mention_count?: number | null
          name?: string
          normalized_name?: string
          project_id?: string
          properties?: Json | null
          source_document_ids?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_graph_nodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          ai_description: string | null
          ai_tags: string[] | null
          created_at: string
          description: string | null
          document_id: string | null
          duration_seconds: number | null
          embedding: string | null
          extracted_data: Json | null
          file_size_bytes: number | null
          height: number | null
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          mime_type: string | null
          name: string
          page_number: number | null
          project_id: string
          search_vector: unknown
          source_coordinates: Json | null
          storage_path: string
          thumbnail_path: string | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          ai_description?: string | null
          ai_tags?: string[] | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          duration_seconds?: number | null
          embedding?: string | null
          extracted_data?: Json | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          mime_type?: string | null
          name: string
          page_number?: number | null
          project_id: string
          search_vector?: unknown
          source_coordinates?: Json | null
          storage_path: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          ai_description?: string | null
          ai_tags?: string[] | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          duration_seconds?: number | null
          embedding?: string | null
          extracted_data?: Json | null
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          mime_type?: string | null
          name?: string
          page_number?: number | null
          project_id?: string
          search_vector?: unknown
          source_coordinates?: Json | null
          storage_path?: string
          thumbnail_path?: string | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "media_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      media_transcriptions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          keyframes: Json | null
          language: string | null
          media_asset_id: string
          processing_cost_usd: number | null
          project_id: string
          search_vector: unknown
          speaker_labels: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["transcription_status"]
          tokens_used: number | null
          transcript_segments: Json | null
          transcript_text: string | null
          updated_at: string
          user_id: string
          visual_summary: string | null
          word_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          keyframes?: Json | null
          language?: string | null
          media_asset_id: string
          processing_cost_usd?: number | null
          project_id: string
          search_vector?: unknown
          speaker_labels?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["transcription_status"]
          tokens_used?: number | null
          transcript_segments?: Json | null
          transcript_text?: string | null
          updated_at?: string
          user_id: string
          visual_summary?: string | null
          word_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          keyframes?: Json | null
          language?: string | null
          media_asset_id?: string
          processing_cost_usd?: number | null
          project_id?: string
          search_vector?: unknown
          speaker_labels?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["transcription_status"]
          tokens_used?: number | null
          transcript_segments?: Json | null
          transcript_text?: string | null
          updated_at?: string
          user_id?: string
          visual_summary?: string | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_transcriptions_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_transcriptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tags: Json | null
          timestamp: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tags?: Json | null
          timestamp?: string
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tags?: Json | null
          timestamp?: string
          value?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pii_detection_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          mask_replacement: string | null
          mask_strategy: string
          name: string
          pattern: string
          pattern_type: string
          pii_category: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          mask_replacement?: string | null
          mask_strategy?: string
          name: string
          pattern: string
          pattern_type: string
          pii_category: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          mask_replacement?: string | null
          mask_strategy?: string
          name?: string
          pattern?: string
          pattern_type?: string
          pii_category?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      pii_detections: {
        Row: {
          chunk_id: string | null
          confidence: number | null
          created_at: string
          document_id: string
          id: string
          is_masked: boolean | null
          masked_at: string | null
          masked_replacement: string
          original_hash: string
          pii_category: string
          position_end: number | null
          position_start: number | null
          rule_id: string | null
        }
        Insert: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string
          document_id: string
          id?: string
          is_masked?: boolean | null
          masked_at?: string | null
          masked_replacement: string
          original_hash: string
          pii_category: string
          position_end?: number | null
          position_start?: number | null
          rule_id?: string | null
        }
        Update: {
          chunk_id?: string | null
          confidence?: number | null
          created_at?: string
          document_id?: string
          id?: string
          is_masked?: boolean | null
          masked_at?: string | null
          masked_replacement?: string
          original_hash?: string
          pii_category?: string
          position_end?: number | null
          position_start?: number | null
          rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pii_detections_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pii_detections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pii_detections_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "pii_detections_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "pii_detection_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          document_id: string | null
          duration_ms: number | null
          error_details: string | null
          estimated_cost_usd: number | null
          executor_version: string | null
          id: string
          memory_usage_mb: number | null
          metadata: Json | null
          prompt_tokens: number | null
          stage_name: string
          status: string
          total_tokens: number | null
          trace_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          document_id?: string | null
          duration_ms?: number | null
          error_details?: string | null
          estimated_cost_usd?: number | null
          executor_version?: string | null
          id?: string
          memory_usage_mb?: number | null
          metadata?: Json | null
          prompt_tokens?: number | null
          stage_name: string
          status: string
          total_tokens?: number | null
          trace_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          document_id?: string | null
          duration_ms?: number | null
          error_details?: string | null
          estimated_cost_usd?: number | null
          executor_version?: string | null
          id?: string
          memory_usage_mb?: number | null
          metadata?: Json | null
          prompt_tokens?: number | null
          stage_name?: string
          status?: string
          total_tokens?: number | null
          trace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_logs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      pipeline_metrics: {
        Row: {
          completed_at: string | null
          created_at: string
          document_id: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          retry_count: number | null
          stage: string
          started_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          retry_count?: number | null
          stage: string
          started_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          retry_count?: number | null
          stage?: string
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "pipeline_metrics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          created_at: string
          currency: string
          documents_limit: number | null
          is_active: boolean
          price_monthly: number | null
          processing_limit: number | null
          storage_limit_bytes: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          documents_limit?: number | null
          is_active?: boolean
          price_monthly?: number | null
          processing_limit?: number | null
          storage_limit_bytes: number
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          documents_limit?: number | null
          is_active?: boolean
          price_monthly?: number | null
          processing_limit?: number | null
          storage_limit_bytes?: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      processing_stage_metrics: {
        Row: {
          created_at: string | null
          document_id: string
          duration_ms: number | null
          error_message: string | null
          executor_version: string | null
          id: string
          input_size_bytes: number | null
          metadata: Json | null
          output_size_bytes: number | null
          pipeline_version: string | null
          retry_count: number | null
          stage: string
          success: boolean
        }
        Insert: {
          created_at?: string | null
          document_id: string
          duration_ms?: number | null
          error_message?: string | null
          executor_version?: string | null
          id?: string
          input_size_bytes?: number | null
          metadata?: Json | null
          output_size_bytes?: number | null
          pipeline_version?: string | null
          retry_count?: number | null
          stage: string
          success: boolean
        }
        Update: {
          created_at?: string | null
          document_id?: string
          duration_ms?: number | null
          error_message?: string | null
          executor_version?: string | null
          id?: string
          input_size_bytes?: number | null
          metadata?: Json | null
          output_size_bytes?: number | null
          pipeline_version?: string | null
          retry_count?: number | null
          stage?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "processing_stage_metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processing_stage_metrics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["user_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["user_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      project_cost_logs: {
        Row: {
          cost_usd: number
          created_at: string
          id: string
          metadata: Json | null
          model_used: string | null
          operation_id: string | null
          operation_type: string
          project_id: string
          tokens_used: number | null
          user_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used?: string | null
          operation_id?: string | null
          operation_type: string
          project_id: string
          tokens_used?: number | null
          user_id: string
        }
        Update: {
          cost_usd?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          model_used?: string | null
          operation_id?: string | null
          operation_type?: string
          project_id?: string
          tokens_used?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cost_logs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_glossaries: {
        Row: {
          auto_inject: boolean | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_inject?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_inject?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_glossaries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_localization: {
        Row: {
          auto_translate_queries: boolean | null
          auto_translate_to_msa: boolean | null
          created_at: string
          currency_format: string | null
          enable_cross_language_search: boolean | null
          id: string
          input_dialect_detection: boolean | null
          preferred_output_dialect:
            | Database["public"]["Enums"]["arabic_dialect"]
            | null
          primary_jurisdiction:
            | Database["public"]["Enums"]["jurisdiction_region"]
            | null
          professional_tone: string | null
          project_id: string
          secondary_jurisdictions:
            | Database["public"]["Enums"]["jurisdiction_region"][]
            | null
          updated_at: string
          use_hijri_dates: boolean | null
          use_local_greetings: boolean | null
          user_id: string
        }
        Insert: {
          auto_translate_queries?: boolean | null
          auto_translate_to_msa?: boolean | null
          created_at?: string
          currency_format?: string | null
          enable_cross_language_search?: boolean | null
          id?: string
          input_dialect_detection?: boolean | null
          preferred_output_dialect?:
            | Database["public"]["Enums"]["arabic_dialect"]
            | null
          primary_jurisdiction?:
            | Database["public"]["Enums"]["jurisdiction_region"]
            | null
          professional_tone?: string | null
          project_id: string
          secondary_jurisdictions?:
            | Database["public"]["Enums"]["jurisdiction_region"][]
            | null
          updated_at?: string
          use_hijri_dates?: boolean | null
          use_local_greetings?: boolean | null
          user_id: string
        }
        Update: {
          auto_translate_queries?: boolean | null
          auto_translate_to_msa?: boolean | null
          created_at?: string
          currency_format?: string | null
          enable_cross_language_search?: boolean | null
          id?: string
          input_dialect_detection?: boolean | null
          preferred_output_dialect?:
            | Database["public"]["Enums"]["arabic_dialect"]
            | null
          primary_jurisdiction?:
            | Database["public"]["Enums"]["jurisdiction_region"]
            | null
          professional_tone?: string | null
          project_id?: string
          secondary_jurisdictions?:
            | Database["public"]["Enums"]["jurisdiction_region"][]
            | null
          updated_at?: string
          use_hijri_dates?: boolean | null
          use_local_greetings?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_localization_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_privacy_settings: {
        Row: {
          ai_provider: string | null
          ai_provider_region: string | null
          allow_external_ai_calls: boolean | null
          auto_expire_documents_days: number | null
          created_at: string
          data_residency_region: string | null
          gdpr_compliant: boolean | null
          hipaa_compliant: boolean | null
          id: string
          local_processing_only: boolean | null
          pii_categories_to_mask: string[] | null
          pii_masking_enabled: boolean | null
          project_id: string
          require_consent_for_ai: boolean | null
          updated_at: string
          watermark_exports: boolean | null
          watermark_previews: boolean | null
        }
        Insert: {
          ai_provider?: string | null
          ai_provider_region?: string | null
          allow_external_ai_calls?: boolean | null
          auto_expire_documents_days?: number | null
          created_at?: string
          data_residency_region?: string | null
          gdpr_compliant?: boolean | null
          hipaa_compliant?: boolean | null
          id?: string
          local_processing_only?: boolean | null
          pii_categories_to_mask?: string[] | null
          pii_masking_enabled?: boolean | null
          project_id: string
          require_consent_for_ai?: boolean | null
          updated_at?: string
          watermark_exports?: boolean | null
          watermark_previews?: boolean | null
        }
        Update: {
          ai_provider?: string | null
          ai_provider_region?: string | null
          allow_external_ai_calls?: boolean | null
          auto_expire_documents_days?: number | null
          created_at?: string
          data_residency_region?: string | null
          gdpr_compliant?: boolean | null
          hipaa_compliant?: boolean | null
          id?: string
          local_processing_only?: boolean | null
          pii_categories_to_mask?: string[] | null
          pii_masking_enabled?: boolean | null
          project_id?: string
          require_consent_for_ai?: boolean | null
          updated_at?: string
          watermark_exports?: boolean | null
          watermark_previews?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "project_privacy_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_prompt_configs: {
        Row: {
          additional_instructions: string | null
          created_at: string
          id: string
          last_updated_by: string | null
          learned_patterns: Json | null
          project_id: string
          system_prompt: string | null
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          additional_instructions?: string | null
          created_at?: string
          id?: string
          last_updated_by?: string | null
          learned_patterns?: Json | null
          project_id: string
          system_prompt?: string | null
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          additional_instructions?: string | null
          created_at?: string
          id?: string
          last_updated_by?: string | null
          learned_patterns?: Json | null
          project_id?: string
          system_prompt?: string | null
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "project_prompt_configs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string
          id: string
          permission: string
          project_id: string
          shared_by: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          project_id: string
          shared_by: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          project_id?: string
          shared_by?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_shares_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          document_id: string | null
          due_date: string | null
          external_id: string | null
          external_provider: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["task_priority"]
          project_id: string
          source_text: string | null
          status: Database["public"]["Enums"]["task_status"]
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
          workflow_rule_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id: string
          source_text?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
          workflow_rule_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          external_id?: string | null
          external_provider?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["task_priority"]
          project_id?: string
          source_text?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
          workflow_rule_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_workflow_rule_id_fkey"
            columns: ["workflow_rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          auto_train_enabled: boolean | null
          auto_train_model: string | null
          budget_enforcement_mode: string | null
          chunk_overlap: number | null
          chunk_size: number | null
          chunk_strategy: string | null
          created_at: string
          description: string
          document_count: number
          id: string
          max_cost_per_query_usd: number | null
          monthly_budget_usd: number | null
          name: string
          owner_id: string
          preferred_baseline_strategy: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auto_train_enabled?: boolean | null
          auto_train_model?: string | null
          budget_enforcement_mode?: string | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          chunk_strategy?: string | null
          created_at?: string
          description?: string
          document_count?: number
          id?: string
          max_cost_per_query_usd?: number | null
          monthly_budget_usd?: number | null
          name: string
          owner_id: string
          preferred_baseline_strategy?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auto_train_enabled?: boolean | null
          auto_train_model?: string | null
          budget_enforcement_mode?: string | null
          chunk_overlap?: number | null
          chunk_size?: number | null
          chunk_strategy?: string | null
          created_at?: string
          description?: string
          document_count?: number
          id?: string
          max_cost_per_query_usd?: number | null
          monthly_budget_usd?: number | null
          name?: string
          owner_id?: string
          preferred_baseline_strategy?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      quality_benchmarks: {
        Row: {
          avg_score: number | null
          created_at: string
          description: string | null
          expected_answers: Json | null
          id: string
          is_active: boolean | null
          last_run_at: string | null
          name: string
          project_id: string
          questions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_score?: number | null
          created_at?: string
          description?: string | null
          expected_answers?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name: string
          project_id: string
          questions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_score?: number | null
          created_at?: string
          description?: string | null
          expected_answers?: Json | null
          id?: string
          is_active?: boolean | null
          last_run_at?: string | null
          name?: string
          project_id?: string
          questions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_benchmarks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_jobs: {
        Row: {
          attempts: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number | null
          payload: Json
          priority: number | null
          queue_name: string
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number | null
          payload: Json
          priority?: number | null
          queue_name: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number | null
          payload?: Json
          priority?: number | null
          queue_name?: string
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rag_eval_queries: {
        Row: {
          created_at: string
          eval_set_id: string
          expected_chunk_ids: string[]
          expected_document_ids: string[]
          id: string
          metadata: Json | null
          query: string
          relevance_scores: Json | null
        }
        Insert: {
          created_at?: string
          eval_set_id: string
          expected_chunk_ids?: string[]
          expected_document_ids?: string[]
          id?: string
          metadata?: Json | null
          query: string
          relevance_scores?: Json | null
        }
        Update: {
          created_at?: string
          eval_set_id?: string
          expected_chunk_ids?: string[]
          expected_document_ids?: string[]
          id?: string
          metadata?: Json | null
          query?: string
          relevance_scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_eval_queries_eval_set_id_fkey"
            columns: ["eval_set_id"]
            isOneToOne: false
            referencedRelation: "rag_eval_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_eval_sets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_id: string
          query_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_id: string
          query_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_id?: string
          query_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_eval_sets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_evaluation_results: {
        Row: {
          created_at: string | null
          document_id: string | null
          evaluated_by: string | null
          evaluation_type: string
          id: string
          metrics: Json | null
          project_id: string
          query: string | null
          score: number | null
        }
        Insert: {
          created_at?: string | null
          document_id?: string | null
          evaluated_by?: string | null
          evaluation_type: string
          id?: string
          metrics?: Json | null
          project_id: string
          query?: string | null
          score?: number | null
        }
        Update: {
          created_at?: string | null
          document_id?: string | null
          evaluated_by?: string | null
          evaluation_type?: string
          id?: string
          metrics?: Json | null
          project_id?: string
          query?: string | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rag_evaluation_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_evaluation_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "rag_evaluation_results_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_experiment_runs: {
        Row: {
          avg_query_latency_ms: number | null
          completed_at: string | null
          cost_metrics: Json | null
          error_message: string | null
          eval_set_id: string
          executed_at: string
          experiment_id: string
          id: string
          metrics: Json
          p95_latency_ms: number | null
          query_results: Json
          started_at: string | null
          status: string
          summary: string | null
          user_id: string
        }
        Insert: {
          avg_query_latency_ms?: number | null
          completed_at?: string | null
          cost_metrics?: Json | null
          error_message?: string | null
          eval_set_id: string
          executed_at?: string
          experiment_id: string
          id?: string
          metrics?: Json
          p95_latency_ms?: number | null
          query_results?: Json
          started_at?: string | null
          status?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          avg_query_latency_ms?: number | null
          completed_at?: string | null
          cost_metrics?: Json | null
          error_message?: string | null
          eval_set_id?: string
          executed_at?: string
          experiment_id?: string
          id?: string
          metrics?: Json
          p95_latency_ms?: number | null
          query_results?: Json
          started_at?: string | null
          status?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_experiment_runs_eval_set_id_fkey"
            columns: ["eval_set_id"]
            isOneToOne: false
            referencedRelation: "rag_eval_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rag_experiment_runs_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "rag_experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      rag_experiments: {
        Row: {
          auto_generated: boolean
          baseline_strategy: string | null
          chunking_config_hash: string | null
          created_at: string
          description: string | null
          embedding_model: string
          embedding_model_version: string | null
          generation_batch_id: string | null
          id: string
          is_baseline: boolean
          name: string
          project_id: string
          retrieval_config: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_generated?: boolean
          baseline_strategy?: string | null
          chunking_config_hash?: string | null
          created_at?: string
          description?: string | null
          embedding_model?: string
          embedding_model_version?: string | null
          generation_batch_id?: string | null
          id?: string
          is_baseline?: boolean
          name: string
          project_id: string
          retrieval_config?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_generated?: boolean
          baseline_strategy?: string | null
          chunking_config_hash?: string | null
          created_at?: string
          description?: string | null
          embedding_model?: string
          embedding_model_version?: string | null
          generation_batch_id?: string | null
          id?: string
          is_baseline?: boolean
          name?: string
          project_id?: string
          retrieval_config?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rag_experiments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          category: Database["public"]["Enums"]["report_category"]
          created_at: string
          description: string | null
          description_ar: string | null
          icon: string | null
          id: string
          is_public: boolean
          is_system: boolean
          name: string
          name_ar: string | null
          owner_id: string | null
          sections: Json
          settings: Json | null
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean
          is_system?: boolean
          name: string
          name_ar?: string | null
          owner_id?: string | null
          sections?: Json
          settings?: Json | null
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["report_category"]
          created_at?: string
          description?: string | null
          description_ar?: string | null
          icon?: string | null
          id?: string
          is_public?: boolean
          is_system?: boolean
          name?: string
          name_ar?: string | null
          owner_id?: string | null
          sections?: Json
          settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      research_tasks: {
        Row: {
          completed_at: string | null
          conflicts_found: Json | null
          created_at: string
          current_phase: string | null
          error_message: string | null
          final_report_markdown: string | null
          final_result: Json | null
          goal: string
          id: string
          max_iterations: number | null
          progress_percent: number | null
          project_id: string
          shared_workspace: Json | null
          source_document_ids: string[] | null
          started_at: string | null
          status: Database["public"]["Enums"]["research_task_status"]
          title: string
          total_cost_usd: number | null
          total_iterations: number | null
          total_tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          conflicts_found?: Json | null
          created_at?: string
          current_phase?: string | null
          error_message?: string | null
          final_report_markdown?: string | null
          final_result?: Json | null
          goal: string
          id?: string
          max_iterations?: number | null
          progress_percent?: number | null
          project_id: string
          shared_workspace?: Json | null
          source_document_ids?: string[] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["research_task_status"]
          title: string
          total_cost_usd?: number | null
          total_iterations?: number | null
          total_tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          conflicts_found?: Json | null
          created_at?: string
          current_phase?: string | null
          error_message?: string | null
          final_report_markdown?: string | null
          final_result?: Json | null
          goal?: string
          id?: string
          max_iterations?: number | null
          progress_percent?: number | null
          project_id?: string
          shared_workspace?: Json | null
          source_document_ids?: string[] | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["research_task_status"]
          title?: string
          total_cost_usd?: number | null
          total_iterations?: number | null
          total_tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      retrieval_evaluations: {
        Row: {
          created_by: string | null
          embedding_model: string | null
          evaluated_at: string
          gold_standard_id: string | null
          id: string
          latency_ms: number | null
          model_version: string | null
          ndcg_at_k: number | null
          precision_at_k: number | null
          project_id: string
          query: string
          recall_at_k: number | null
          results: Json
          search_mode: string | null
        }
        Insert: {
          created_by?: string | null
          embedding_model?: string | null
          evaluated_at?: string
          gold_standard_id?: string | null
          id?: string
          latency_ms?: number | null
          model_version?: string | null
          ndcg_at_k?: number | null
          precision_at_k?: number | null
          project_id: string
          query: string
          recall_at_k?: number | null
          results?: Json
          search_mode?: string | null
        }
        Update: {
          created_by?: string | null
          embedding_model?: string | null
          evaluated_at?: string
          gold_standard_id?: string | null
          id?: string
          latency_ms?: number | null
          model_version?: string | null
          ndcg_at_k?: number | null
          precision_at_k?: number | null
          project_id?: string
          query?: string
          recall_at_k?: number | null
          results?: Json
          search_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retrieval_evaluations_gold_standard_id_fkey"
            columns: ["gold_standard_id"]
            isOneToOne: false
            referencedRelation: "gold_standard_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retrieval_evaluations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      secure_share_links: {
        Row: {
          access_token: string
          allowed_emails: string[] | null
          created_at: string
          created_by: string
          download_enabled: boolean | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_accessed_at: string | null
          max_views: number | null
          password_hash: string | null
          require_email: boolean | null
          resource_id: string
          resource_type: string
          revoked_at: string | null
          view_count: number | null
          watermark_enabled: boolean | null
        }
        Insert: {
          access_token: string
          allowed_emails?: string[] | null
          created_at?: string
          created_by: string
          download_enabled?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          require_email?: boolean | null
          resource_id: string
          resource_type: string
          revoked_at?: string | null
          view_count?: number | null
          watermark_enabled?: boolean | null
        }
        Update: {
          access_token?: string
          allowed_emails?: string[] | null
          created_at?: string
          created_by?: string
          download_enabled?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_accessed_at?: string | null
          max_views?: number | null
          password_hash?: string | null
          require_email?: boolean | null
          resource_id?: string
          resource_type?: string
          revoked_at?: string | null
          view_count?: number | null
          watermark_enabled?: boolean | null
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          action: string
          action_category: string
          client_ip: string | null
          compliance_flags: string[] | null
          created_at: string
          data_exported: boolean | null
          details: Json | null
          id: string
          pii_accessed: boolean | null
          request_id: string | null
          resource_id: string
          resource_name: string
          resource_type: string
          session_id: string | null
          severity_level: string
          user_agent: string | null
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          action_category: string
          client_ip?: string | null
          compliance_flags?: string[] | null
          created_at?: string
          data_exported?: boolean | null
          details?: Json | null
          id?: string
          pii_accessed?: boolean | null
          request_id?: string | null
          resource_id: string
          resource_name: string
          resource_type: string
          session_id?: string | null
          severity_level?: string
          user_agent?: string | null
          user_id: string
          user_name: string
        }
        Update: {
          action?: string
          action_category?: string
          client_ip?: string | null
          compliance_flags?: string[] | null
          created_at?: string
          data_exported?: boolean | null
          details?: Json | null
          id?: string
          pii_accessed?: boolean | null
          request_id?: string | null
          resource_id?: string
          resource_name?: string
          resource_type?: string
          session_id?: string | null
          severity_level?: string
          user_agent?: string | null
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      share_link_access_logs: {
        Row: {
          access_granted: boolean
          accessor_email: string | null
          accessor_ip: string | null
          accessor_user_agent: string | null
          created_at: string
          denial_reason: string | null
          id: string
          share_link_id: string
        }
        Insert: {
          access_granted: boolean
          accessor_email?: string | null
          accessor_ip?: string | null
          accessor_user_agent?: string | null
          created_at?: string
          denial_reason?: string | null
          id?: string
          share_link_id: string
        }
        Update: {
          access_granted?: boolean
          accessor_email?: string | null
          accessor_ip?: string | null
          accessor_user_agent?: string | null
          created_at?: string
          denial_reason?: string | null
          id?: string
          share_link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_link_access_logs_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "secure_share_links"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_chat_threads: {
        Row: {
          branch_context: string | null
          branch_point_message_id: string | null
          context_document_ids: string[] | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_archived: boolean | null
          last_message_at: string | null
          parent_thread_id: string | null
          participant_ids: string[] | null
          project_id: string
          team_id: string
          title: string
          updated_at: string
        }
        Insert: {
          branch_context?: string | null
          branch_point_message_id?: string | null
          context_document_ids?: string[] | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          parent_thread_id?: string | null
          participant_ids?: string[] | null
          project_id: string
          team_id: string
          title: string
          updated_at?: string
        }
        Update: {
          branch_context?: string | null
          branch_point_message_id?: string | null
          context_document_ids?: string[] | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_archived?: boolean | null
          last_message_at?: string | null
          parent_thread_id?: string | null
          participant_ids?: string[] | null
          project_id?: string
          team_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_chat_threads_parent_thread_id_fkey"
            columns: ["parent_thread_id"]
            isOneToOne: false
            referencedRelation: "shared_chat_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_chat_threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_chat_threads_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sso_config: {
        Row: {
          attribute_mapping: Json | null
          certificate: string | null
          created_at: string
          entity_id: string | null
          id: string
          is_enabled: boolean | null
          metadata_url: string | null
          organization_id: string
          provider_name: string
          provider_type: string
          sso_url: string | null
          updated_at: string
        }
        Insert: {
          attribute_mapping?: Json | null
          certificate?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata_url?: string | null
          organization_id: string
          provider_name: string
          provider_type: string
          sso_url?: string | null
          updated_at?: string
        }
        Update: {
          attribute_mapping?: Json | null
          certificate?: string | null
          created_at?: string
          entity_id?: string | null
          id?: string
          is_enabled?: boolean | null
          metadata_url?: string | null
          organization_id?: string
          provider_name?: string
          provider_type?: string
          sso_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      style_profiles: {
        Row: {
          created_at: string
          custom_instructions: string | null
          description: string | null
          example_document_ids: string[] | null
          formality_level: number
          id: string
          is_active: boolean | null
          is_default: boolean | null
          language: string
          name: string
          project_id: string
          tone: string
          updated_at: string
          user_id: string
          writing_style: string | null
        }
        Insert: {
          created_at?: string
          custom_instructions?: string | null
          description?: string | null
          example_document_ids?: string[] | null
          formality_level?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string
          name: string
          project_id: string
          tone?: string
          updated_at?: string
          user_id: string
          writing_style?: string | null
        }
        Update: {
          created_at?: string
          custom_instructions?: string | null
          description?: string | null
          example_document_ids?: string[] | null
          formality_level?: number
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          language?: string
          name?: string
          project_id?: string
          tone?: string
          updated_at?: string
          user_id?: string
          writing_style?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "style_profiles_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          provider: string | null
          provider_subscription_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          provider?: string | null
          provider_subscription_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_prompt_versions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          include_glossary: boolean | null
          include_style_profile: boolean | null
          is_active: boolean | null
          max_tokens: number | null
          mode: string
          name: string
          parent_version_id: string | null
          project_id: string
          system_prompt: string
          temperature: number | null
          updated_at: string
          user_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          include_glossary?: boolean | null
          include_style_profile?: boolean | null
          is_active?: boolean | null
          max_tokens?: number | null
          mode?: string
          name: string
          parent_version_id?: string | null
          project_id: string
          system_prompt: string
          temperature?: number | null
          updated_at?: string
          user_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          include_glossary?: boolean | null
          include_style_profile?: boolean | null
          is_active?: boolean | null
          max_tokens?: number | null
          mode?: string
          name?: string
          parent_version_id?: string | null
          project_id?: string
          system_prompt?: string
          temperature?: number | null
          updated_at?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "system_prompt_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "system_prompt_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_prompt_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      team_activities: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string
          team_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type: string
          team_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_activities_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_at: string | null
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tier_limits: {
        Row: {
          documents_limit: number | null
          processing_limit: number | null
          storage_bytes_limit: number
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          documents_limit?: number | null
          processing_limit?: number | null
          storage_bytes_limit: number
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          documents_limit?: number | null
          processing_limit?: number | null
          storage_bytes_limit?: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      trained_models: {
        Row: {
          base_model: string
          created_at: string | null
          description: string | null
          finetune_job_id: string | null
          id: string
          inference_count: number | null
          is_public: boolean | null
          last_used_at: string | null
          model_path: string
          model_size_bytes: number | null
          name: string
          owner_id: string
          provider: string
          quantization: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          base_model: string
          created_at?: string | null
          description?: string | null
          finetune_job_id?: string | null
          id?: string
          inference_count?: number | null
          is_public?: boolean | null
          last_used_at?: string | null
          model_path: string
          model_size_bytes?: number | null
          name: string
          owner_id: string
          provider: string
          quantization?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          base_model?: string
          created_at?: string | null
          description?: string | null
          finetune_job_id?: string | null
          id?: string
          inference_count?: number | null
          is_public?: boolean | null
          last_used_at?: string | null
          model_path?: string
          model_size_bytes?: number | null
          name?: string
          owner_id?: string
          provider?: string
          quantization?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trained_models_finetune_job_id_fkey"
            columns: ["finetune_job_id"]
            isOneToOne: false
            referencedRelation: "finetune_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_checkpoints: {
        Row: {
          accuracy: number | null
          created_at: string | null
          file_path: string | null
          id: string
          job_id: string
          loss: number | null
          metadata: Json | null
          step: number
          val_loss: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          job_id: string
          loss?: number | null
          metadata?: Json | null
          step: number
          val_loss?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          file_path?: string | null
          id?: string
          job_id?: string
          loss?: number | null
          metadata?: Json | null
          step?: number
          val_loss?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_checkpoints_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "training_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_config_versions: {
        Row: {
          config: Json
          created_at: string
          created_by: string
          id: string
          project_id: string
          version_number: number
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          version_number: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_config_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      training_datasets: {
        Row: {
          created_at: string | null
          description: string | null
          error_message: string | null
          estimated_cost: number | null
          format: string
          generated_at: string | null
          id: string
          jsonl_content: string | null
          jsonl_storage_path: string | null
          name: string
          pair_generation_mode: string | null
          project_id: string
          status: string | null
          system_prompt: string | null
          total_pairs: number | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string
          validation_result: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          format?: string
          generated_at?: string | null
          id?: string
          jsonl_content?: string | null
          jsonl_storage_path?: string | null
          name: string
          pair_generation_mode?: string | null
          project_id: string
          status?: string | null
          system_prompt?: string | null
          total_pairs?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id: string
          validation_result?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          format?: string
          generated_at?: string | null
          id?: string
          jsonl_content?: string | null
          jsonl_storage_path?: string | null
          name?: string
          pair_generation_mode?: string | null
          project_id?: string
          status?: string | null
          system_prompt?: string | null
          total_pairs?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string
          validation_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "training_datasets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      training_jobs: {
        Row: {
          auto_started: boolean | null
          base_model: string
          checkpoint_path: string | null
          completed_at: string | null
          created_at: string
          current_checkpoint_step: number | null
          current_step: string | null
          dataset_id: string
          error_message: string | null
          fine_tuned_model_id: string | null
          id: string
          progress_percent: number | null
          project_id: string
          provider: string
          provider_job_id: string | null
          result_metrics: Json | null
          started_at: string | null
          status: string
          total_steps: number | null
          training_config: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_started?: boolean | null
          base_model: string
          checkpoint_path?: string | null
          completed_at?: string | null
          created_at?: string
          current_checkpoint_step?: number | null
          current_step?: string | null
          dataset_id: string
          error_message?: string | null
          fine_tuned_model_id?: string | null
          id?: string
          progress_percent?: number | null
          project_id: string
          provider?: string
          provider_job_id?: string | null
          result_metrics?: Json | null
          started_at?: string | null
          status?: string
          total_steps?: number | null
          training_config?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_started?: boolean | null
          base_model?: string
          checkpoint_path?: string | null
          completed_at?: string | null
          created_at?: string
          current_checkpoint_step?: number | null
          current_step?: string | null
          dataset_id?: string
          error_message?: string | null
          fine_tuned_model_id?: string | null
          id?: string
          progress_percent?: number | null
          project_id?: string
          provider?: string
          provider_job_id?: string | null
          result_metrics?: Json | null
          started_at?: string | null
          status?: string
          total_steps?: number | null
          training_config?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_jobs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      training_metrics: {
        Row: {
          accuracy: number | null
          created_at: string | null
          id: string
          job_id: string
          loss: number | null
          step: number
          tokens_processed: number | null
        }
        Insert: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          job_id: string
          loss?: number | null
          step: number
          tokens_processed?: number | null
        }
        Update: {
          accuracy?: number | null
          created_at?: string | null
          id?: string
          job_id?: string
          loss?: number | null
          step?: number
          tokens_processed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "training_metrics_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "training_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_pairs: {
        Row: {
          assistant_message: string
          created_at: string | null
          dataset_id: string
          id: string
          is_valid: boolean | null
          metadata: Json | null
          quality_score: number | null
          source_chunk_id: string | null
          source_document_id: string | null
          system_message: string | null
          token_count: number | null
          user_message: string
          validation_errors: string[] | null
        }
        Insert: {
          assistant_message: string
          created_at?: string | null
          dataset_id: string
          id?: string
          is_valid?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          source_chunk_id?: string | null
          source_document_id?: string | null
          system_message?: string | null
          token_count?: number | null
          user_message: string
          validation_errors?: string[] | null
        }
        Update: {
          assistant_message?: string
          created_at?: string | null
          dataset_id?: string
          id?: string
          is_valid?: boolean | null
          metadata?: Json | null
          quality_score?: number | null
          source_chunk_id?: string | null
          source_document_id?: string | null
          system_message?: string | null
          token_count?: number | null
          user_message?: string
          validation_errors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "training_pairs_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "training_datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_pairs_source_chunk_id_fkey"
            columns: ["source_chunk_id"]
            isOneToOne: false
            referencedRelation: "chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_pairs_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_pairs_source_document_id_fkey"
            columns: ["source_document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
        ]
      }
      usage_limits: {
        Row: {
          created_at: string
          documents_count: number
          id: string
          processing_count: number
          reset_date: string
          storage_bytes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          documents_count?: number
          id?: string
          processing_count?: number
          reset_date?: string
          storage_bytes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          documents_count?: number
          id?: string
          processing_count?: number
          reset_date?: string
          storage_bytes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_api_keys: {
        Row: {
          anthropic_key_encrypted: string | null
          anthropic_key_set: boolean | null
          created_at: string
          id: string
          openai_key_encrypted: string | null
          openai_key_set: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          anthropic_key_encrypted?: string | null
          anthropic_key_set?: boolean | null
          created_at?: string
          id?: string
          openai_key_encrypted?: string | null
          openai_key_set?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          anthropic_key_encrypted?: string | null
          anthropic_key_set?: boolean | null
          created_at?: string
          id?: string
          openai_key_encrypted?: string | null
          openai_key_set?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cursors: {
        Row: {
          cursor_position: Json | null
          id: string
          last_updated: string
          resource_id: string
          resource_type: string
          selection: Json | null
          user_id: string
        }
        Insert: {
          cursor_position?: Json | null
          id?: string
          last_updated?: string
          resource_id: string
          resource_type: string
          selection?: Json | null
          user_id: string
        }
        Update: {
          cursor_position?: Json | null
          id?: string
          last_updated?: string
          resource_id?: string
          resource_type?: string
          selection?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_interventions: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          intervention_type: string
          message: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          intervention_type: string
          message?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          intervention_type?: string
          message?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interventions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "research_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_presence: {
        Row: {
          id: string
          last_seen_at: string
          metadata: Json | null
          resource_id: string
          resource_type: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          resource_id: string
          resource_type: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          last_seen_at?: string
          metadata?: Json | null
          resource_id?: string
          resource_type?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_presence_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          created_at: string
          device_info: Json | null
          expires_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_active_at: string
          revoked_at: string | null
          revoked_reason: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: Json | null
          expires_at: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: Json | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_active_at?: string
          revoked_at?: string | null
          revoked_reason?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      visual_extractions: {
        Row: {
          chart_type: string | null
          completed_at: string | null
          confidence_score: number | null
          created_at: string
          data_labels: string[] | null
          data_values: Json | null
          error_message: string | null
          extracted_data: Json | null
          extraction_type: string
          id: string
          media_asset_id: string
          processing_cost_usd: number | null
          project_id: string
          started_at: string | null
          status: Database["public"]["Enums"]["extraction_status"]
          structured_table: Json | null
          tokens_used: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chart_type?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          data_labels?: string[] | null
          data_values?: Json | null
          error_message?: string | null
          extracted_data?: Json | null
          extraction_type: string
          id?: string
          media_asset_id: string
          processing_cost_usd?: number | null
          project_id: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
          structured_table?: Json | null
          tokens_used?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chart_type?: string | null
          completed_at?: string | null
          confidence_score?: number | null
          created_at?: string
          data_labels?: string[] | null
          data_values?: Json | null
          error_message?: string | null
          extracted_data?: Json | null
          extraction_type?: string
          id?: string
          media_asset_id?: string
          processing_cost_usd?: number | null
          project_id?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["extraction_status"]
          structured_table?: Json | null
          tokens_used?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visual_extractions_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visual_extractions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_action_logs: {
        Row: {
          action_config: Json
          action_type: Database["public"]["Enums"]["workflow_action_type"]
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          id: string
          input_data: Json | null
          output_data: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_execution_status"]
        }
        Insert: {
          action_config: Json
          action_type: Database["public"]["Enums"]["workflow_action_type"]
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_execution_status"]
        }
        Update: {
          action_config?: Json
          action_type?: Database["public"]["Enums"]["workflow_action_type"]
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          id?: string
          input_data?: Json | null
          output_data?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_execution_status"]
        }
        Relationships: [
          {
            foreignKeyName: "workflow_action_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          actions_executed: Json | null
          completed_at: string | null
          created_at: string
          document_id: string | null
          duration_ms: number | null
          error_message: string | null
          id: string
          parent_execution_id: string | null
          project_id: string
          retry_count: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["workflow_execution_status"]
          trigger_event: Json
          user_id: string
          workflow_rule_id: string
        }
        Insert: {
          actions_executed?: Json | null
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          parent_execution_id?: string | null
          project_id: string
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_execution_status"]
          trigger_event: Json
          user_id: string
          workflow_rule_id: string
        }
        Update: {
          actions_executed?: Json | null
          completed_at?: string | null
          created_at?: string
          document_id?: string | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          parent_execution_id?: string | null
          project_id?: string
          retry_count?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["workflow_execution_status"]
          trigger_event?: Json
          user_id?: string
          workflow_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "v_expensive_documents"
            referencedColumns: ["document_id"]
          },
          {
            foreignKeyName: "workflow_executions_parent_execution_id_fkey"
            columns: ["parent_execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_executions_workflow_rule_id_fkey"
            columns: ["workflow_rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_integrations: {
        Row: {
          config: Json
          created_at: string
          credentials_encrypted: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          last_used_at: string | null
          project_id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          credentials_encrypted?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          project_id: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          credentials_encrypted?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          project_id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_integrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          actions: Json
          conditions: Json | null
          cooldown_seconds: number | null
          created_at: string
          description: string | null
          execution_count: number | null
          id: string
          is_system: boolean | null
          last_triggered_at: string | null
          max_executions_per_day: number | null
          name: string
          priority: number | null
          project_id: string
          status: Database["public"]["Enums"]["workflow_status"]
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          actions?: Json
          conditions?: Json | null
          cooldown_seconds?: number | null
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_system?: boolean | null
          last_triggered_at?: string | null
          max_executions_per_day?: number | null
          name: string
          priority?: number | null
          project_id: string
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_config?: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          actions?: Json
          conditions?: Json | null
          cooldown_seconds?: number | null
          created_at?: string
          description?: string | null
          execution_count?: number | null
          id?: string
          is_system?: boolean | null
          last_triggered_at?: string | null
          max_executions_per_day?: number | null
          name?: string
          priority?: number | null
          project_id?: string
          status?: Database["public"]["Enums"]["workflow_status"]
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_templates: {
        Row: {
          actions: Json
          category: string | null
          conditions: Json | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_featured: boolean | null
          name: string
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          use_count: number | null
        }
        Insert: {
          actions?: Json
          category?: string | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          trigger_config?: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          use_count?: number | null
        }
        Update: {
          actions?: Json
          category?: string | null
          conditions?: Json | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["workflow_trigger_type"]
          use_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      v_daily_ai_costs: {
        Row: {
          date: string | null
          documents_processed: number | null
          total_api_calls: number | null
          total_completion_tokens: number | null
          total_cost_usd: number | null
          total_prompt_tokens: number | null
          total_tokens: number | null
        }
        Relationships: []
      }
      v_expensive_documents: {
        Row: {
          created_at: string | null
          document_id: string | null
          document_name: string | null
          original_name: string | null
          processing_cost_usd: number | null
          project_id: string | null
          project_name: string | null
          total_tokens_used: number | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      v_pipeline_health: {
        Row: {
          avg_duration_ms: number | null
          failed: number | null
          failure_rate_percent: number | null
          stage_name: string | null
          successful: number | null
          total_last_24h: number | null
        }
        Relationships: []
      }
      v_stage_failure_rates: {
        Row: {
          avg_duration_ms: number | null
          failed_runs: number | null
          last_run_at: string | null
          p95_duration_ms: number | null
          stage: string | null
          successful_runs: number | null
          total_runs: number | null
        }
        Relationships: []
      }
      v_stage_latency_analysis: {
        Row: {
          avg_cost_per_call: number | null
          avg_duration_ms: number | null
          failed_runs: number | null
          median_duration_ms: number | null
          p95_duration_ms: number | null
          p99_duration_ms: number | null
          stage_name: string | null
          successful_runs: number | null
          total_cost_usd: number | null
          total_runs: number | null
          total_tokens_all_time: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      aggregate_metrics: {
        Args: {
          end_time: string
          interval_minutes?: number
          metric_name: string
          start_time: string
        }
        Returns: {
          avg_value: number
          count_value: number
          max_value: number
          min_value: number
          sum_value: number
          time_bucket: string
        }[]
      }
      check_access: {
        Args: {
          p_project_id?: string
          p_resource_owner_id?: string
          p_team_id?: string
          p_user_id: string
        }
        Returns: boolean
      }
      check_project_budget: {
        Args: { p_estimated_cost?: number; p_project_id: string }
        Returns: Json
      }
      check_quota: {
        Args: { _quota_type: string; _user_id: string }
        Returns: Json
      }
      check_storage_quota: {
        Args: { _incoming_bytes: number; _user_id: string }
        Returns: Json
      }
      cleanup_old_metrics: { Args: never; Returns: number }
      decrement_usage: {
        Args: { _amount?: number; _quota_type: string; _user_id: string }
        Returns: boolean
      }
      get_metrics_summary: {
        Args: { time_range?: unknown }
        Returns: {
          avg_value: number
          max_value: number
          metric_name: string
          min_value: number
          sum_value: number
          total_count: number
        }[]
      }
      get_project_month_spending: {
        Args: { p_project_id: string }
        Returns: number
      }
      get_quota_status: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hybrid_search_chunks: {
        Args: {
          filter_date_from?: string
          filter_date_to?: string
          filter_language?: string
          filter_mime_types?: string[]
          filter_owner_id?: string
          filter_project_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding?: string
          search_query: string
          use_fulltext?: boolean
          use_semantic?: boolean
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          combined_score: number
          content: string
          created_at: string
          document_id: string
          document_name: string
          fulltext_score: number
          language: string
          matched_snippet: string
          mime_type: string
          project_id: string
          semantic_score: number
        }[]
      }
      hybrid_search_documents: {
        Args: {
          filter_date_from?: string
          filter_date_to?: string
          filter_language?: string
          filter_mime_types?: string[]
          filter_owner_id?: string
          filter_project_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding?: string
          search_query: string
          use_fulltext?: boolean
          use_semantic?: boolean
        }
        Returns: {
          combined_score: number
          created_at: string
          fulltext_score: number
          id: string
          language: string
          matched_snippet: string
          mime_type: string
          name: string
          original_name: string
          owner_id: string
          project_id: string
          semantic_score: number
          summary: string
        }[]
      }
      increment_usage: {
        Args: { _amount?: number; _quota_type: string; _user_id: string }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_team_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_owner: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
      reset_monthly_usage: { Args: never; Returns: undefined }
      search_chunks_by_embedding: {
        Args: {
          filter_mime_types?: string[]
          filter_project_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          chunk_id: string
          chunk_index: number
          content: string
          document_id: string
          document_name: string
          mime_type: string
          project_id: string
          similarity: number
        }[]
      }
      search_documents_by_embedding: {
        Args: {
          filter_mime_types?: string[]
          filter_project_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          id: string
          mime_type: string
          name: string
          original_name: string
          owner_id: string
          project_id: string
          similarity: number
          summary: string
        }[]
      }
      user_owns_document: { Args: { document_id: string }; Returns: boolean }
      user_owns_project: { Args: { project_id: string }; Returns: boolean }
    }
    Enums: {
      agent_role: "manager" | "researcher" | "analyst" | "critic"
      annotation_type:
        | "highlight"
        | "comment"
        | "question"
        | "critical"
        | "action_item"
      app_role: "admin" | "user" | "super_admin"
      arabic_dialect:
        | "msa"
        | "gulf"
        | "levantine"
        | "egyptian"
        | "maghrebi"
        | "iraqi"
        | "yemeni"
      benchmark_status: "pending" | "running" | "completed" | "failed"
      content_generation_status:
        | "pending"
        | "generating"
        | "completed"
        | "failed"
      content_target_format:
        | "presentation_outline"
        | "linkedin_post"
        | "twitter_thread"
        | "executive_memo"
        | "blog_post"
        | "email_draft"
        | "contract_draft"
        | "report_summary"
        | "meeting_notes"
        | "press_release"
        | "custom"
      entity_type:
        | "person"
        | "organization"
        | "location"
        | "date"
        | "concept"
        | "document"
        | "event"
        | "product"
        | "money"
        | "law"
        | "other"
      evaluation_status: "pending" | "verified" | "corrected" | "flagged"
      extraction_status: "pending" | "processing" | "completed" | "failed"
      integration_provider:
        | "google_drive"
        | "gmail"
        | "slack"
        | "microsoft_teams"
        | "webhook"
      integration_status: "pending" | "active" | "expired" | "revoked" | "error"
      jurisdiction_region:
        | "sau"
        | "uae"
        | "egy"
        | "jor"
        | "kwt"
        | "bhr"
        | "omn"
        | "qat"
        | "lbn"
        | "mar"
        | "dza"
        | "tun"
        | "irq"
        | "yen"
        | "global"
      media_type: "image" | "chart" | "diagram" | "video" | "audio"
      processing_stage:
        | "ingestion"
        | "text_extraction"
        | "language_detection"
        | "chunking"
        | "summarization"
        | "indexing"
      relationship_type:
        | "mentioned_in"
        | "related_to"
        | "contradicts"
        | "supports"
        | "references"
        | "authored_by"
        | "owned_by"
        | "located_in"
        | "occurred_on"
        | "involves"
        | "similar_to"
        | "part_of"
        | "preceded_by"
        | "followed_by"
      report_category:
        | "technical-audit"
        | "financial-summary"
        | "legal-comparison"
        | "research-synthesis"
        | "contract-analysis"
        | "compliance-review"
        | "custom"
      report_status: "pending" | "generating" | "ready" | "failed"
      research_task_status:
        | "pending"
        | "planning"
        | "researching"
        | "analyzing"
        | "verifying"
        | "synthesizing"
        | "completed"
        | "failed"
        | "cancelled"
      subscription_status: "active" | "canceled" | "past_due"
      subscription_tier: "free" | "starter" | "pro" | "enterprise"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status:
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "blocked"
      team_role: "owner" | "admin" | "editor" | "viewer"
      transcription_status: "pending" | "processing" | "completed" | "failed"
      user_status: "active" | "suspended"
      workflow_action_type:
        | "move_to_folder"
        | "add_tag"
        | "assign_user"
        | "generate_summary"
        | "create_task"
        | "send_email"
        | "send_slack"
        | "call_webhook"
        | "update_field"
      workflow_execution_status:
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "skipped"
        | "cancelled"
      workflow_status: "active" | "paused" | "draft" | "archived"
      workflow_trigger_type:
        | "document_uploaded"
        | "document_processed"
        | "content_detected"
        | "date_approaching"
        | "amount_threshold"
        | "keyword_match"
        | "ai_classification"
        | "manual"
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
      agent_role: ["manager", "researcher", "analyst", "critic"],
      annotation_type: [
        "highlight",
        "comment",
        "question",
        "critical",
        "action_item",
      ],
      app_role: ["admin", "user", "super_admin"],
      arabic_dialect: [
        "msa",
        "gulf",
        "levantine",
        "egyptian",
        "maghrebi",
        "iraqi",
        "yemeni",
      ],
      benchmark_status: ["pending", "running", "completed", "failed"],
      content_generation_status: [
        "pending",
        "generating",
        "completed",
        "failed",
      ],
      content_target_format: [
        "presentation_outline",
        "linkedin_post",
        "twitter_thread",
        "executive_memo",
        "blog_post",
        "email_draft",
        "contract_draft",
        "report_summary",
        "meeting_notes",
        "press_release",
        "custom",
      ],
      entity_type: [
        "person",
        "organization",
        "location",
        "date",
        "concept",
        "document",
        "event",
        "product",
        "money",
        "law",
        "other",
      ],
      evaluation_status: ["pending", "verified", "corrected", "flagged"],
      extraction_status: ["pending", "processing", "completed", "failed"],
      integration_provider: [
        "google_drive",
        "gmail",
        "slack",
        "microsoft_teams",
        "webhook",
      ],
      integration_status: ["pending", "active", "expired", "revoked", "error"],
      jurisdiction_region: [
        "sau",
        "uae",
        "egy",
        "jor",
        "kwt",
        "bhr",
        "omn",
        "qat",
        "lbn",
        "mar",
        "dza",
        "tun",
        "irq",
        "yen",
        "global",
      ],
      media_type: ["image", "chart", "diagram", "video", "audio"],
      processing_stage: [
        "ingestion",
        "text_extraction",
        "language_detection",
        "chunking",
        "summarization",
        "indexing",
      ],
      relationship_type: [
        "mentioned_in",
        "related_to",
        "contradicts",
        "supports",
        "references",
        "authored_by",
        "owned_by",
        "located_in",
        "occurred_on",
        "involves",
        "similar_to",
        "part_of",
        "preceded_by",
        "followed_by",
      ],
      report_category: [
        "technical-audit",
        "financial-summary",
        "legal-comparison",
        "research-synthesis",
        "contract-analysis",
        "compliance-review",
        "custom",
      ],
      report_status: ["pending", "generating", "ready", "failed"],
      research_task_status: [
        "pending",
        "planning",
        "researching",
        "analyzing",
        "verifying",
        "synthesizing",
        "completed",
        "failed",
        "cancelled",
      ],
      subscription_status: ["active", "canceled", "past_due"],
      subscription_tier: ["free", "starter", "pro", "enterprise"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: [
        "pending",
        "in_progress",
        "completed",
        "cancelled",
        "blocked",
      ],
      team_role: ["owner", "admin", "editor", "viewer"],
      transcription_status: ["pending", "processing", "completed", "failed"],
      user_status: ["active", "suspended"],
      workflow_action_type: [
        "move_to_folder",
        "add_tag",
        "assign_user",
        "generate_summary",
        "create_task",
        "send_email",
        "send_slack",
        "call_webhook",
        "update_field",
      ],
      workflow_execution_status: [
        "pending",
        "running",
        "completed",
        "failed",
        "skipped",
        "cancelled",
      ],
      workflow_status: ["active", "paused", "draft", "archived"],
      workflow_trigger_type: [
        "document_uploaded",
        "document_processed",
        "content_detected",
        "date_approaching",
        "amount_threshold",
        "keyword_match",
        "ai_classification",
        "manual",
      ],
    },
  },
} as const
