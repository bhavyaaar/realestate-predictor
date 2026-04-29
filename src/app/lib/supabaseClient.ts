import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Bypass navigator.locks so concurrent requests don't steal each other's token lock
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
