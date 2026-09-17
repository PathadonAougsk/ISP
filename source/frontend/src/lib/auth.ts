import { createClient } from "@/lib/supabase/client";

export async function logout(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
