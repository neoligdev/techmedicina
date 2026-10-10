import type { Database, Json } from "../../integrations/supabase/types";

// Owned contract for the reviewed C015 RPC, pending managed regeneration after deployment.
// Do not edit generated database types or infer privileges from this type declaration.
export type RuntimeDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions" | "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      tm_admin_audit: {
        Row: {
          id: string;
          actor_user_id: string;
          clinic_id: string;
          action: string;
          changed_fields: string[];
          occurred_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: Database["public"]["Functions"] & {
      tm_save_clinic: {
        Args: {
          p_name: string;
          p_is_active: boolean;
          p_clinic_id: string | null;
          p_expected_revision: number | null;
        };
        Returns: Json;
      };
    };
  };
};
