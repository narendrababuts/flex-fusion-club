
import { supabase } from "@/lib/supabaseClient";

export async function getMembershipPlans() {
  const { data, error } = await supabase
    .from("membership_plans")
    .select("*")
    .order("price");
  if (error) throw error;
  return data;
}
