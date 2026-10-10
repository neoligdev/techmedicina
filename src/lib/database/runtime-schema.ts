import type { Database } from "../../integrations/supabase/types";

// C015 is deployed; use its managed schema rather than intersecting a pending contract.
// Types do not grant privileges; database policies and protected RPCs remain authoritative.
export type RuntimeDatabase = Database;
