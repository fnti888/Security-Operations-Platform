import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      incidents: {
        Row: {
          id: string;
          title: string;
          description: string;
          severity: 'critical' | 'high' | 'medium' | 'low';
          status: 'open' | 'investigating' | 'resolved' | 'closed';
          category: string;
          assigned_to: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['incidents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['incidents']['Insert']>;
      };
      threats: {
        Row: {
          id: string;
          name: string;
          description: string;
          threat_level: 'critical' | 'high' | 'medium' | 'low';
          threat_type: string;
          source: string;
          indicators: string | null;
          status: 'active' | 'mitigated' | 'monitoring';
          detected_at: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['threats']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['threats']['Insert']>;
      };
      alerts: {
        Row: {
          id: string;
          title: string;
          message: string;
          alert_type: 'security' | 'system' | 'performance';
          severity: 'critical' | 'high' | 'medium' | 'low';
          status: 'active' | 'acknowledged' | 'resolved';
          acknowledged_by: string | null;
          created_at: string;
          acknowledged_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['alerts']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['alerts']['Insert']>;
      };
      security_logs: {
        Row: {
          id: string;
          event_type: string;
          severity: 'info' | 'warning' | 'error' | 'critical';
          user_id: string | null;
          description: string;
          metadata: Record<string, unknown>;
          ip_address: string | null;
          created_at: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          role: 'admin' | 'analyst' | 'viewer';
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_profiles']['Insert']>;
      };
    };
  };
};
