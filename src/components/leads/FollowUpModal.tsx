
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

type Props = {
  lead: any;
  onClose: () => void;
  onUpdated?: () => void;
};

const statusOptions = [
  { label: "Interested", value: "Interested" },
  { label: "Not Interested", value: "Not Interested" },
  { label: "Active", value: "Active" },
];

export default function FollowUpModal({ lead, onClose, onUpdated }: Props) {
  const [status, setStatus] = useState(lead.status ?? "Active");
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const updates: any = {
      status,
      notes,
      last_followup: new Date().toISOString(),
    };
    // If creating, insert, else, update
    if (lead && lead.id) {
      await supabase.from("leads").update(updates).eq("id", lead.id);
      toast({ title: "Lead updated", description: "Lead follow-up details updated." });
    } else {
      // create (need to get current garage_id)
      const user = await supabase.auth.getUser();
      // Get garage_id for current user:
      const { data: garages } = await supabase.from("garages").select("id").eq("owner_user_id", user.data.user?.id).limit(1);
      if (!garages || garages.length === 0) {
        toast({ title: "Error", description: "No garage found for user", variant: "destructive" });
        setSaving(false);
        return;
      }
      const garage_id = garages[0].id;
      const { error } = await supabase.from("leads").insert({
        garage_id,
        customer_name: "",
        phone_number: "",
        vehicle_info: "",
        enquiry_type: "",
        source: "",
        status,
        notes,
        last_followup: new Date().toISOString(),
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Lead added" });
      }
    }
    setSaving(false);
    if(onUpdated) onUpdated();
    onClose();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Follow-Up Lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="status">Status</Label>
          <select
            className="block w-full border rounded p-2 mb-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            className="block w-full border rounded p-2"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="fuchsia" disabled={saving} onClick={handleSave}>
            {lead?.id ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
