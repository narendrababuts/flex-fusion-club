import React, { useEffect, useState } from "react";
// MAKE SURE THE NEXT LINES ARE THE VERY FIRST UI LIBRARY IMPORTS:
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import StaffSelect from "@/components/staff/StaffSelect";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type LeadFields = {
  id?: string;
  customer_name: string;
  phone_number: string;
  vehicle_make?: string;
  vehicle_model?: string;
  license_plate?: string;
  enquiry_date?: string;
  enquiry_type?: string;
  enquiry_details?: string;
  source?: string;
  assigned_to?: string;
  status: string;
  next_followup?: string;
  notes?: string[];
};

interface LeadsFormModalProps {
  open: boolean;
  onClose: () => void;
  initialLead?: Partial<LeadFields>;
  onSaved?: () => void;
}

const ENQUIRY_TYPES = ["Service", "Repair", "Parts", "Quote", "Other"];
const SOURCES = ["Walk-in", "Call", "WhatsApp", "Referral", "Web"];
const STATUS = ["Active", "Interested", "Not Interested", "Converted"];

// Helper for dropdown list (PROVIDE a non-empty, obviously unusable value for placeholder)
function DropDownOptionList(opts: string[], placeholder: string) {
  return (
    <>
      <SelectItem value="__placeholder__" disabled>
        {placeholder}
      </SelectItem>
      {opts.map((opt) => (
        <SelectItem key={opt} value={opt}>
          {opt}
        </SelectItem>
      ))}
    </>
  );
}

export default function LeadsFormModal({ open, onClose, initialLead = {}, onSaved }: LeadsFormModalProps) {
  // Helper for parsing ISO date strings or using Date objects
  const normalizeDate = (dateStr: string | undefined) => dateStr ? new Date(dateStr) : undefined;

  // State: Use a single LeadFields state, always strings or undefined or Date where needed
  const [values, setValues] = useState<LeadFields>({
    customer_name: "",
    phone_number: "",
    vehicle_make: "",
    vehicle_model: "",
    license_plate: "",
    enquiry_date: "",
    enquiry_type: undefined,
    enquiry_details: "",
    source: undefined,
    assigned_to: "",
    status: "Active",
    next_followup: "",
    notes: [],
    ...initialLead,
  });
  const [saving, setSaving] = useState(false);

  function blankLead() {
    return {
      customer_name: "",
      phone_number: "",
      vehicle_make: "",
      vehicle_model: "",
      license_plate: "",
      enquiry_date: "",
      enquiry_type: undefined,
      enquiry_details: "",
      source: undefined,
      assigned_to: "",
      status: "Active",
      next_followup: "",
      notes: [],
      ...initialLead,
    };
  }

  // Only blank/reset the form when going from closed to open (prevents wiping typed data)
  useEffect(() => {
    if (open) {
      setValues(blankLead());
    }
    // Only run when modal is opened
    // eslint-disable-next-line
  }, [open]);

  // Unified text and textarea fields
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setValues((v) => ({
      ...v,
      [e.target.name]: e.target.value,
    }));
  }

  // Dropdown value handler
  function selectField(name: keyof LeadFields, v: string) {
    if (v === "__placeholder__") return;
    setValues((prev) => ({ ...prev, [name]: v }));
  }

  // Enquiry Date picker
  function handleDateChange(date: Date | undefined) {
    setValues((prev) => ({ ...prev, enquiry_date: date ? date.toISOString() : "" }));
  }
  // Next Follow-Up picker
  function handleNextFollowupDate(date: Date | undefined) {
    setValues((prev) => ({ ...prev, next_followup: date ? date.toISOString() : "" }));
  }

  // Staff assign change from StaffSelect
  function handleAssignedStaff(staffId: string) {
    setValues((prev) => ({ ...prev, assigned_to: staffId }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.customer_name || !values.phone_number) {
      toast({ title: "Missing required fields" });
      return;
    }
    if (!values.enquiry_type || !values.source) {
      toast({ title: "Please select enquiry type and source." });
      return;
    }
    setSaving(true);
    let payload = { ...values };

    payload.notes = values.notes && values.notes.length ? values.notes.filter(Boolean) : null;
    if (!payload.enquiry_date) payload.enquiry_date = new Date().toISOString();
    if (!payload.status) payload.status = "Active";

    if (values.id) {
      const updatePayload = {
        customer_name: payload.customer_name,
        phone_number: payload.phone_number,
        vehicle_make: payload.vehicle_make,
        vehicle_model: payload.vehicle_model,
        license_plate: payload.license_plate,
        enquiry_date: payload.enquiry_date,
        enquiry_type: payload.enquiry_type,
        enquiry_details: payload.enquiry_details,
        source: payload.source,
        assigned_to: payload.assigned_to,
        status: payload.status,
        next_followup: payload.next_followup,
        updated_at: new Date().toISOString(),
        notes: payload.notes as any,
      };
      const { error } = await supabase.from("leads").update(updatePayload).eq("id", values.id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive"});
        setSaving(false);
        return;
      }
      toast({ title: "Lead updated" });
    } else {
      const user = await supabase.auth.getUser();
      const { data: garages } = await supabase.from("garages").select("id").eq("owner_user_id", user.data.user?.id).limit(1);
      if (!garages || !garages.length) {
        toast({ title: "Cannot add", description: "No garage found", variant: "destructive"});
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("leads").insert({
        garage_id: garages[0].id,
        customer_name: payload.customer_name,
        phone_number: payload.phone_number,
        vehicle_make: payload.vehicle_make,
        vehicle_model: payload.vehicle_model,
        license_plate: payload.license_plate,
        enquiry_date: payload.enquiry_date,
        enquiry_type: payload.enquiry_type,
        enquiry_details: payload.enquiry_details,
        source: payload.source,
        assigned_to: payload.assigned_to,
        status: payload.status,
        next_followup: payload.next_followup,
        notes: payload.notes as any,
        last_contacted: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive"});
        setSaving(false);
        return;
      }
      toast({ title: "Lead added" });
    }
    setSaving(false);
    onSaved?.();
    onClose();
  }

  // --- UI ---

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{values.id ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Customer Name */}
            <div>
              <Label>Customer Name *</Label>
              <Input
                name="customer_name"
                autoFocus
                value={values.customer_name || ""}
                onChange={handleChange}
                required
              />
            </div>
            {/* Phone Number */}
            <div>
              <Label>Phone Number *</Label>
              <Input
                name="phone_number"
                value={values.phone_number || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label>Vehicle Make</Label>
              <Input
                name="vehicle_make"
                value={values.vehicle_make || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Vehicle Model</Label>
              <Input
                name="vehicle_model"
                value={values.vehicle_model || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>License Plate</Label>
              <Input
                name="license_plate"
                value={values.license_plate || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label>Enquiry Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    {values.enquiry_date
                      ? new Date(values.enquiry_date).toLocaleDateString()
                      : <span className="text-muted-foreground">Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-[1000]" align="start">
                  <Calendar
                    mode="single"
                    selected={values.enquiry_date ? new Date(values.enquiry_date) : undefined}
                    onSelect={d => handleDateChange(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Next Follow-Up</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                  >
                    {values.next_followup
                      ? new Date(values.next_followup).toLocaleDateString()
                      : <span className="text-muted-foreground">Pick date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-white z-[1000]" align="start">
                  <Calendar
                    mode="single"
                    selected={values.next_followup ? new Date(values.next_followup) : undefined}
                    onSelect={d => handleNextFollowupDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Enquiry Type</Label>
              <Select
                value={values.enquiry_type ?? undefined}
                onValueChange={v => selectField("enquiry_type", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                {/* Solid background and high z-index */}
                <SelectContent className="z-[1000] bg-white">
                  {DropDownOptionList(ENQUIRY_TYPES, "Select type")}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select
                value={values.source ?? undefined}
                onValueChange={v => selectField("source", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent className="z-[1000] bg-white">
                  {DropDownOptionList(SOURCES, "Select source")}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Assigned Staff</Label>
              {/* StaffSelect fetches staff based on current garage_id */}
              <StaffSelect
                value={values.assigned_to || ""}
                onValueChange={handleAssignedStaff}
                placeholder="Assign staff"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={values.status || "Active"}
                onValueChange={v => selectField("status", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[1000] bg-white">
                  {DropDownOptionList(STATUS, "Select status")}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Enquiry Details</Label>
            <Textarea
              name="enquiry_details"
              value={values.enquiry_details || ""}
              onChange={handleChange}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              variant="fuchsia"
              type="submit"
              disabled={
                saving ||
                !values.customer_name ||
                !values.phone_number ||
                !values.enquiry_type ||
                !values.source
              }
            >
              {values.id ? "Update Lead" : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// file size warning:
//
// This file is now over 273 lines. You should consider splitting it into smaller focused components for maintainability.
