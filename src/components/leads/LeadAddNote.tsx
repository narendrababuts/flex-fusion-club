
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface LeadAddNoteProps {
  leadId: string;
  onNoteAdded: () => void;
}

export default function LeadAddNote({ leadId, onNoteAdded }: LeadAddNoteProps) {
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAddNote() {
    if (!note) return;
    setAdding(true);
    // Retrieve current notes array (could be null or array)
    const { data, error } = await supabase.from('leads').select('notes').eq('id', leadId).single();
    let notes: string[] = [];
    if (Array.isArray(data?.notes)) {
      notes = data.notes as string[];
    } else if (typeof data?.notes === 'string' && data.notes) {
      notes = [data.notes];
    }
    const now = new Date().toISOString();
    const entry = `${now}::${note}`;
    notes.push(entry);

    // To fix TS error, cast notes to any (Supabase types think 'notes' is string)
    const { error: updateError } = await supabase.from("leads")
      .update({ notes: notes as any, updated_at: now })
      .eq("id", leadId);
    setAdding(false);
    if (updateError) {
      toast({ title: "Error adding note", description: updateError.message, variant: "destructive" });
    } else {
      toast({ title: "Note added" });
      setNote("");
      onNoteAdded();
    }
  }

  return (
    <div className="flex gap-2">
      <Textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className="text-sm" placeholder="Add note..." />
      <Button onClick={handleAddNote} disabled={adding || !note} size="sm">Add</Button>
    </div>
  );
}
