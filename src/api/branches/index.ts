
import { supabase } from "@/lib/supabaseClient";

export async function getBranches() {
  const { data, error } = await supabase.from("branches").select("*").order("name");
  if (error) throw error;
  return data;
}
