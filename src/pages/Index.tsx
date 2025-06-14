
// Gym SaaS Index Landing

import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
      <div className="max-w-xl mx-auto flex flex-col gap-8 w-full text-center">
        <h1 className="text-5xl font-black">Welcome to GymPro Manager</h1>
        <p className="text-xl text-muted-foreground">
          Modern All-in-One SaaS for gyms — membership, attendance, bookings, billing, and more.
        </p>
        <div className="flex flex-col md:flex-row gap-4 justify-center w-full">
          <Button asChild className="font-semibold px-8">
            <Link to="/members/join">Join Gym</Link>
          </Button>
          <Button asChild className="font-semibold px-8" variant="secondary">
            <Link to="/members/attendance">Attendance Check-In</Link>
          </Button>
          <Button asChild className="font-semibold px-8" variant="outline">
            <Link to="/classes/book">Book a Session</Link>
          </Button>
        </div>
        <div className="mt-8 text-sm text-muted-foreground">
          <strong>Admin?</strong> Manage <Link className="underline story-link" to="/branches">Branches</Link>, <Link className="underline story-link" to="/membership-plans">Plans</Link>, <Link className="underline story-link" to="/equipment-inventory">Equipment</Link> and more in the dashboard.
        </div>
      </div>
    </div>
  );
};

export default Index;
