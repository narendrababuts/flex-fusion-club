
import React from 'react';
import DashboardHeader from './DashboardHeader';
import RevenueTabs from './RevenueTabs';
import DashboardGrid from './DashboardGrid';
import { useRevenueTabs } from '@/hooks/useRevenueTabs';
import { useRevenueSync } from '@/hooks/useRevenueSync';

const Dashboard = () => {
  useRevenueSync();
  const { metrics, isLoading } = useRevenueTabs();

  return (
    <div className="space-y-6 min-h-screen bg-background">
      <DashboardHeader />
      <RevenueTabs metrics={metrics} isMetricsLoading={isLoading} />
      <DashboardGrid />
    </div>
  );
};

export default Dashboard;
