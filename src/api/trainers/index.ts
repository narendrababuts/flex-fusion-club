
import { supabase } from "@/lib/supabaseClient";

export async function getBranchTrainers(branch_id: string) {
  const { data, error } = await supabase
    .from("trainers")
    .select("*")
    .eq("branch_id", branch_id);
  if (error) throw error;
  return data;
}
