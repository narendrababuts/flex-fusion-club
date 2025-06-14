
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMembershipPlans } from "@/api/membership-plans";
import { createMember } from "@/api/members";
import PlanPicker from "@/components/PlanPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function JoinGym() {
  const { data: plans } = useQuery({ queryKey: ['plans'], queryFn: getMembershipPlans });
  const mutation = useMutation({ mutationFn: createMember });
  const [form, setForm] = useState({ name: "", email: "", phone: "", plan_id: "" });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function onPlanSelect(plan_id: string) {
    setForm({ ...form, plan_id });
  }

  function handleJoin() {
    mutation.mutate({
      ...form,
      join_date: new Date(),
      expiry_date: new Date(Date.now() + (plans?.find(p => p.id === form.plan_id)?.duration_days || 30) * 86400000)
    }, {
      onSuccess: () => toast({ title: "Welcome!", description: "Membership created" }),
      onError: (e) => toast({ title: "Error", description: e.message })
    });
  }

  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-card rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold mb-4">Join Gym</h2>
      <div className="space-y-4">
        <Input name="name" placeholder="Full Name" onChange={handleChange} value={form.name} />
        <Input name="email" placeholder="Email" onChange={handleChange} value={form.email} />
        <Input name="phone" placeholder="Phone" onChange={handleChange} value={form.phone} />
        <PlanPicker plans={plans || []} selectedPlan={form.plan_id} onSelect={onPlanSelect} />
        <Button className="w-full mt-4" onClick={handleJoin}>Sign Up</Button>
      </div>
    </div>
  );
}
