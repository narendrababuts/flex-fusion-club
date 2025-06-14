
import { supabase } from "@/lib/supabaseClient";

export async function bookSession(payload: any) {
  const { data, error } = await supabase
    .from("membership_sessions")
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}
