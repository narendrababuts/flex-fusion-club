import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone } from "lucide-react";
import FollowUpModal from "./FollowUpModal";
import ConvertToJobCardModal from "./ConvertToJobCardModal";
import { toast } from "@/components/ui/use-toast";
import LeadAddNote from "./LeadAddNote";
import LeadsFormModal from "./LeadsFormModal";

// 1. Explicitly define LeadStatus as string literal type
type LeadStatus = "Active" | "Interested" | "Not Interested" | "Converted";

type Lead = {
  id: string;
  customer_name: string;
  phone_number: string;
  vehicle_info: string;
  vehicle_make?: string;
  vehicle_model?: string;
  license_plate?: string;
  enquiry_date?: string;
  enquiry_type: string;
  enquiry_details?: string;
  source: string;
  status: LeadStatus;
  last_followup: string | null;
  next_followup: string | null;
  notes: string[] | null;
  created_at: string;
  assigned_to: string | null;
  updated_at: string | null;
  // Optionally, if you want - add garage_id, etc.
};

// 2. Restrict Badge variants to only those accepted by Badge component
const statusColors: Record<LeadStatus, "info" | "success" | "warning" | "default"> = {
  "Active": "info",
  "Interested": "success",
  "Not Interested": "warning",
  "Converted": "default", // Changed from "destructive"
};

const statusFilters: { label: string; value: LeadStatus | "All" }[] = [
  { label: "All", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Interested", value: "Interested" },
  { label: "Not Interested", value: "Not Interested" },
  { label: "Converted", value: "Converted" },
];

// Utility to ensure notes are always string[]
function normalizeNotes(notes: unknown): string[] {
  if (Array.isArray(notes)) return notes;
  if (notes === null || notes === undefined) return [];
  if (typeof notes === "string") return [notes];
  return [];
}

const LeadsList: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "All">("All");
  const [showFollowUp, setShowFollowUp] = useState<Lead | null>(null);
  const [showConvert, setShowConvert] = useState<Lead | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetchLeads();
    const channel = supabase
      .channel("leads-db-changes")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => setRefresh((r) => r + 1)
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchLeads();
    // eslint-disable-next-line
  }, [selectedStatus, refresh]);

  async function fetchLeads() {
    setLoading(true);
    let query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (selectedStatus !== "All") {
      query = query.eq("status", selectedStatus);
    }
    const { data, error } = await query;
    if (!error && data) {
      setLeads(
        data.map((lead: any) => ({
          ...lead,
          status: ["Active", "Interested", "Not Interested", "Converted"].includes(lead.status)
            ? (lead.status as LeadStatus)
            : "Active",
          notes: normalizeNotes(lead.notes),
        }))
      );
    } else {
      setLeads([]);
    }
    setLoading(false);
  }

  function handleCall(lead: Lead) {
    toast({
      title: "Lead Phone Number",
      description: (
        <span>
          <b>{lead.customer_name}</b>:&nbsp;
          <a
            href={`https://wa.me/${lead.phone_number.replace(/\D/g, "")}?text=Hi%20${encodeURIComponent(lead.customer_name)},%20regarding%20your%20enquiry%20about%20${lead.enquiry_type}`}
            target="_blank" rel="noopener noreferrer"
            className="text-blue-700 underline"
          >
            {lead.phone_number}
          </a>
        </span>
      ),
      duration: 9000,
    });
  }

  const [showFormModal, setShowFormModal] = useState(false);

  async function getStaffNameById(id: string): Promise<string> {
    const { data } = await supabase.from("staff").select("name").eq("id", id).maybeSingle();
    return data?.name || "";
  }

  function handleNoteAdded() {
    setRefresh(r => r + 1);
  }

  function isDueToday(lead: Lead) {
    if (!lead.next_followup) return false;
    const today = new Date();
    const nextDT = new Date(lead.next_followup);
    return nextDT <= today;
  }

  // =============== STYLE HELPERS =============
  function badgeColor(status: LeadStatus) {
    switch (status) {
      case "Active": return "bg-blue-100 text-blue-700";
      case "Interested": return "bg-green-100 text-green-700";
      case "Not Interested": return "bg-orange-100 text-orange-700";
      case "Converted": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  }
  function colHeadStyle() {
    return "py-2 px-3 text-xs font-bold tracking-wide text-gray-800 whitespace-nowrap";
  }
  function cellStyle(center = false) {
    return `px-3 py-2 text-[15px] align-middle ${center ? 'text-center' : ''} whitespace-nowrap`;
  }
  // ===========================================

  const dueLeads = leads.filter(isDueToday);
  const otherLeads = leads.filter(l => !isDueToday(l));

  return (
    <div className="bg-white rounded-lg shadow-card p-4 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 px-1 mb-2 gap-3 relative">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Phone className="text-primary/90" size={24} />
          Leads &amp; Follow-Up
        </h2>
        <Button
          variant="fuchsia"
          size="lg"
          className="ml-auto shadow-lg sticky top-6 right-6 z-20 px-6 py-2 font-bold text-base"
          onClick={() => setShowFormModal(true)}
        >
          + Add Lead
        </Button>
      </div>
      <Tabs value={selectedStatus} onValueChange={setSelectedStatus as any} className="mb-4">
        <TabsList className="bg-neutral-100 rounded-lg p-1 gap-1 shadow-sm">
          {statusFilters.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="data-[state=active]:bg-fuchsia-600 data-[state=active]:text-white rounded-md px-3 py-1 text-base"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Due Today / Overdue */}
      {dueLeads.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 shadow-sm border border-red-100 animate-fade-in">
          <h3 className="font-semibold text-red-700 flex items-center gap-2 text-base mb-2">
            <span className="text-lg">&#9888;</span>
            Due Today / Overdue
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] table-auto rounded-lg shadow-inner">
              <thead>
                <tr className="">
                  <th className={colHeadStyle()}>Name</th>
                  <th className={colHeadStyle()}>Phone</th>
                  <th className={colHeadStyle()}>Vehicle</th>
                  <th className={colHeadStyle()}>Enquiry</th>
                  <th className={colHeadStyle()}>Source</th>
                  <th className={colHeadStyle()}>Assigned</th>
                  <th className={colHeadStyle()}>Status</th>
                  <th className={colHeadStyle()}>Next Follow-Up</th>
                  <th className={colHeadStyle()}>Notes</th>
                  <th className={colHeadStyle()}>Snooze</th>
                  <th className={colHeadStyle()}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dueLeads.map((lead, i) => (
                  <tr key={lead.id} className={`border-b ${i % 2 === 0 ? "bg-red-100/60" : "bg-red-50"} hover:bg-red-200 transition`}>
                    <td className={cellStyle()}>{lead.customer_name}</td>
                    <td className={cellStyle()}>{lead.phone_number}</td>
                    <td className={cellStyle()}>{[lead.vehicle_make, lead.vehicle_model, lead.license_plate].filter(Boolean).join(" / ")}</td>
                    <td className={cellStyle()}>{lead.enquiry_type}</td>
                    <td className={cellStyle()}>{lead.source}</td>
                    <td className={cellStyle()}>{lead.assigned_to ? <StaffNameById id={lead.assigned_to} /> : "--"}</td>
                    <td className={cellStyle(true)}>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className={cellStyle(true)}>{lead.next_followup ? new Date(lead.next_followup).toLocaleDateString() : "--"}</td>
                    <td className={cellStyle()}>
                      <LeadNotes notes={normalizeNotes(lead.notes)} />
                    </td>
                    <td className={cellStyle(true)}><SnoozeButton lead={lead} onSnoozed={() => setRefresh(r=>r+1)} /></td>
                    <td className="flex flex-col gap-2 py-2">
                      <LeadAddNote leadId={lead.id} onNoteAdded={handleNoteAdded} />
                      <Button size="sm" variant="outline" onClick={() => handleCall(lead)} className="w-fit">
                        <Phone size={16} /> <span className="ml-1">Call</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Other Leads */}
      <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-3 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] table-auto rounded-lg shadow-inner">
            <thead>
              <tr>
                <th className={colHeadStyle()}>Name</th>
                <th className={colHeadStyle()}>Phone</th>
                <th className={colHeadStyle()}>Vehicle</th>
                <th className={colHeadStyle()}>Enquiry</th>
                <th className={colHeadStyle()}>Source</th>
                <th className={colHeadStyle()}>Assigned</th>
                <th className={colHeadStyle()}>Status</th>
                <th className={colHeadStyle()}>Next Follow-Up</th>
                <th className={colHeadStyle()}>Notes</th>
                <th className={colHeadStyle()}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-muted-foreground">Loading leads...</td>
                </tr>
              ) : otherLeads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">No leads found in this category.</td>
                </tr>
              ) : (
                otherLeads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`border-b transition hover:bg-blue-100/40 ${i % 2 === 0 ? "bg-white" : "bg-gray-100/60"}`}
                  >
                    <td className={cellStyle()}>{lead.customer_name}</td>
                    <td className={cellStyle()}>{lead.phone_number}</td>
                    <td className={cellStyle()}>{[lead.vehicle_make, lead.vehicle_model, lead.license_plate].filter(Boolean).join(" / ")}</td>
                    <td className={cellStyle()}>{lead.enquiry_type}</td>
                    <td className={cellStyle()}>{lead.source}</td>
                    <td className={cellStyle()}>{lead.assigned_to ? <StaffNameById id={lead.assigned_to} /> : "--"}</td>
                    <td className={cellStyle(true)}>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className={cellStyle(true)}>{lead.next_followup ? new Date(lead.next_followup).toLocaleDateString() : "--"}</td>
                    <td className={cellStyle()}>
                      <LeadNotes notes={normalizeNotes(lead.notes)} />
                    </td>
                    <td className="flex flex-col gap-2 py-2">
                      <LeadAddNote leadId={lead.id} onNoteAdded={handleNoteAdded} />
                      <Button size="sm" variant="outline" onClick={() => handleCall(lead)} className="w-fit">
                        <Phone size={16} /> <span className="ml-1">Call</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <LeadsFormModal open={showFormModal} onClose={() => setShowFormModal(false)} onSaved={() => setRefresh(r=>r+1)} />
      {!!showFollowUp && (
        <FollowUpModal
          lead={showFollowUp}
          onClose={() => setShowFollowUp(null)}
          onUpdated={() => setRefresh(r => r + 1)}
        />
      )}
      {!!showConvert && (
        <ConvertToJobCardModal
          lead={showConvert}
          onClose={() => setShowConvert(null)}
        />
      )}
    </div>
  );
};

function StaffNameById({ id }: { id: string }) {
  const [name, setName] = React.useState<string>("");
  React.useEffect(() => {
    supabase.from("staff").select("name").eq("id", id).maybeSingle().then(r => setName(r.data?.name || ""));
  }, [id]);
  return <span className="font-medium">{name || "--"}</span>;
}

// Updated LeadNotes with stricter normalization
function LeadNotes({ notes }: { notes?: unknown }) {
  const safeNotes = normalizeNotes(notes);
  if (!safeNotes || safeNotes.length === 0)
    return <div className="text-xs text-muted-foreground">No notes</div>;
  return (
    <div className="max-h-14 overflow-auto text-xs text-gray-700 space-y-1">
      {safeNotes.map((n, i) => {
        const [ts, ...rest] = n.split("::");
        return (
          <div key={i}>
            <span className="text-gray-500">{ts ? new Date(ts).toLocaleString() : ""}:</span> {rest.join("::")}
          </div>
        );
      })}
    </div>
  );
}

// Snooze button (move next_followup forward by N days)
function SnoozeButton({ lead, onSnoozed }: { lead: any; onSnoozed: ()=>void }) {
  const [snoozing, setSnoozing] = React.useState(false);
  async function snooze(days = 1) {
    setSnoozing(true);
    const next = lead.next_followup ? new Date(lead.next_followup) : new Date();
    next.setDate(next.getDate() + days);
    const { error } = await supabase.from("leads").update({ next_followup: next.toISOString(), updated_at: new Date().toISOString() }).eq("id", lead.id);
    setSnoozing(false);
    if (!error) onSnoozed();
  }
  return (
    <div className="flex gap-1 items-center">
      {[1,3,7].map(d => (
        <Button key={d} size="sm" variant="outline" onClick={() => snooze(d)} disabled={snoozing}>
          +{d}d
        </Button>
      ))}
    </div>
  );
}

export default LeadsList;
