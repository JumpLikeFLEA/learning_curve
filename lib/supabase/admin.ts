import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. It BYPASSES row-level security, so it must never
 * reach the browser and must never be built from caller-supplied input. Use it
 * only inside trusted server route handlers, for privileged operations the
 * anon/JWT client cannot do — Auth admin calls, cross-user cleanup.
 *
 * Keys are read from server-only env (SUPABASE_SERVICE_ROLE_KEY is not
 * NEXT_PUBLIC_, so it is never bundled to the client).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service-role environment is not configured");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
