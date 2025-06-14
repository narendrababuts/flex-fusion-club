
import { useMutation } from "@tanstack/react-query";
import { recordAttendance } from "@/api/member-attendance";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";

export default function CheckIn() {
  const [memberId, setMemberId] = useState("");
  const mutation = useMutation({ mutationFn: recordAttendance });

  function handleCheckIn() {
    mutation.mutate(
      { member_id: memberId, branch_id: "CURRENT_BRANCH_ID" },
      {
        onSuccess: () => toast({ title: "Checked In!", description: "Your attendance is recorded" }),
        onError: (e) => toast({ title: "Error", description: e.message })
      }
    );
  }

  return (
    <div className="max-w-md mx-auto mt-12 bg-card rounded-lg p-8 shadow">
      <h2 className="text-2xl font-bold mb-4">Check-In Attendance</h2>
      <Input
        placeholder="Enter Member ID"
        value={memberId}
        onChange={e => setMemberId(e.target.value)}
      />
      <Button onClick={handleCheckIn} className="w-full mt-4">Check In</Button>
    </div>
  );
}
