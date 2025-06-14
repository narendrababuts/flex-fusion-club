
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { getClassTypes } from "@/api/class-types";
import { getBranchTrainers } from "@/api/trainers";
import { bookSession } from "@/api/sessions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function BookClassForm() {
  const { data: classTypes } = useQuery({ queryKey: ["classTypes", "BRANCH_ID"], queryFn: () => getClassTypes("BRANCH_ID") });
  const { data: trainers } = useQuery({ queryKey: ["trainers", "BRANCH_ID"], queryFn: () => getBranchTrainers("BRANCH_ID") });
  const [form, setForm] = useState({ class_type_id: "", trainer_id: "", date: "", time: "" });
  const mutation = useMutation({ mutationFn: bookSession });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleBook() {
    mutation.mutate(
      { ...form, member_id: "CURRENT_MEMBER_ID", branch_id: "BRANCH_ID", session_date: form.date, session_time: form.time },
      {
        onSuccess: () => toast({ title: "Booked!", description: "Class session booked" }),
        onError: (e) => toast({ title: "Error", description: e.message })
      }
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={e => {
        e.preventDefault();
        handleBook();
      }}
    >
      <h2 className="text-2xl font-bold mb-4">Session Booking</h2>
      <select name="class_type_id" value={form.class_type_id} onChange={handleChange} className="w-full border rounded p-2">
        <option value="">Select Class Type</option>
        {classTypes?.map((ct: any) => (
          <option key={ct.id} value={ct.id}>{ct.name}</option>
        ))}
      </select>
      <select name="trainer_id" value={form.trainer_id} onChange={handleChange} className="w-full border rounded p-2">
        <option value="">Select Trainer</option>
        {trainers?.map((tr: any) => (
          <option key={tr.id} value={tr.id}>{tr.name}</option>
        ))}
      </select>
      <Input type="date" name="date" value={form.date} onChange={handleChange} />
      <Input type="time" name="time" value={form.time} onChange={handleChange} />
      <Button type="submit" className="w-full mt-2">Book Session</Button>
    </form>
  );
}
