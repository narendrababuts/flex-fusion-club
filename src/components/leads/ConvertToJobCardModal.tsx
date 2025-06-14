
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

type Props = {
  lead: any;
  onClose: () => void;
};

export default function ConvertToJobCardModal({ lead, onClose }: Props) {
  const navigate = useNavigate();

  function handleConvert() {
    // Redirect to Job Card create with pre-populated query params (or global state as needed)
    // We'll use localStorage for passing data
    localStorage.setItem("lead_to_jobcard", JSON.stringify({
      customer_name: lead.customer_name,
      customer_phone: lead.phone_number,
      car_number: lead.vehicle_info,
      work_description: lead.enquiry_type,
    }));
    navigate("/job-cards/create");
    onClose();
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Lead to Job Card</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <div><b>Name:</b> {lead.customer_name}</div>
          <div><b>Phone:</b> {lead.phone_number}</div>
          <div><b>Vehicle:</b> {lead.vehicle_info}</div>
          <div><b>Enquiry:</b> {lead.enquiry_type}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="fuchsia" onClick={handleConvert}>Convert &amp; Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
