
import { supabase } from "@/lib/supabaseClient";

export async function recordAttendance({ member_id, branch_id }: { member_id: string, branch_id: string }) {
  const { data, error } = await supabase
    .from("member_attendance")
    .insert([{ member_id, branch_id, timestamp: new Date() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}
