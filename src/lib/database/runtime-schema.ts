import type { Database, Json } from "../../integrations/supabase/types";

// Owned contract for the reviewed C015 RPC, pending managed regeneration after deployment.
// Do not edit generated database types or infer privileges from this type declaration.
export type RuntimeDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
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
