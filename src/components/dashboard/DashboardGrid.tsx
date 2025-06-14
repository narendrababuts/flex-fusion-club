import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import RevenueChart from './RevenueChart';
import RecentJobCards from './RecentJobCards';
import UpcomingAppointments from './UpcomingAppointments';
import InventoryAlerts from './InventoryAlerts';
import StaffPerformance from './StaffPerformance';
import PartsToOrder from './PartsToOrder';
import JobCardsStatusPanel from './JobCardsStatusPanel';
import { BarChart3 } from 'lucide-react';

const Sparkline = () => (
  <svg width="70" height="20" viewBox="0 0 70 20" fill="none">
    <polyline
      points="0,15 15,13 30,10 45,8 60,6 70,5"
      stroke="#22c55e"
      strokeWidth="2"
      fill="none"
    />
    <polyline
      points="0,17 15,16 30,13 45,13 60,12 70,11"
      stroke="#1E3A8A"
      strokeWidth="2"
      fill="none"
    />
  </svg>
);

const DashboardGrid = () => {
  return (
    <>
      <JobCardsStatusPanel />
      <div className="grid gap-6 md:grid-cols-6">
        <Card className="md:col-span-4 metric-card accent-bar-blue animate-card-in" accent="blue">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="icon-bg"><BarChart3 size={20} color="#1E3A8A" /></span>
              Monthly Revenue
            </CardTitle>
            <p className="text-muted-foreground text-sm">View your revenue trends over time</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Sparkline />
              <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold ml-2">+12.5%</span>
            </div>
            <RevenueChart />
          </CardContent>
        </Card>
        <div className="md:col-span-2 space-y-6">
          <InventoryAlerts />
          <PartsToOrder />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <RecentJobCards />
        <UpcomingAppointments />
      </div>
      <StaffPerformance />
    </>
  );
};
export default DashboardGrid;
