
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGarage } from '@/contexts/GarageContext';

interface RevenueTabsMetrics {
  todayRevenue: number;
  monthlyRevenue: number;
  todayCompletedJobs: number;
  completedJobs: number;
  activeJobs: number;
  avgRepairTime: string;
}

export const useRevenueTabs = () => {
  const { currentGarage } = useGarage();

  const query = useQuery({
    queryKey: ['revenue_tabs', currentGarage?.id],
    queryFn: async (): Promise<RevenueTabsMetrics> => {
      if (!currentGarage?.id) {
        return {
          todayRevenue: 0,
          monthlyRevenue: 0,
          todayCompletedJobs: 0,
          completedJobs: 0,
          activeJobs: 0,
          avgRepairTime: '0 days',
        };
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

        // Fetch today's revenue from completed jobs
        const { data: todayJobsData } = await supabase
          .from('job_cards')
          .select('parts, labor_hours, hourly_rate, manual_labor_cost, selected_services')
          .eq('garage_id', currentGarage.id)
          .eq('status', 'Completed')
          .gte('actual_completion_date', today);

        const todayRevenue = todayJobsData?.reduce((total, job) => {
          const parts = Array.isArray(job.parts) ? job.parts as any[] : [];
          const selectedServices = Array.isArray(job.selected_services) ? job.selected_services as any[] : [];
          
          const partsCost = parts.reduce((sum: number, part: any) => 
            sum + (Number(part.quantity || 0) * Number(part.unitPrice || 0)), 0);
          const laborCost = Number(job.manual_labor_cost || 0) > 0 
            ? Number(job.manual_labor_cost || 0) 
            : (Number(job.labor_hours || 0) * Number(job.hourly_rate || 0));
          const servicesCost = selectedServices.reduce((sum: number, service: any) => 
            sum + Number(service.price || 0), 0);
          return total + partsCost + laborCost + servicesCost;
        }, 0) || 0;

        // Fetch monthly revenue from completed jobs
        const { data: monthlyJobsData } = await supabase
          .from('job_cards')
          .select('parts, labor_hours, hourly_rate, manual_labor_cost, selected_services')
          .eq('garage_id', currentGarage.id)
          .eq('status', 'Completed')
          .gte('actual_completion_date', startOfMonth);

        const monthlyRevenue = monthlyJobsData?.reduce((total, job) => {
          const parts = Array.isArray(job.parts) ? job.parts as any[] : [];
          const selectedServices = Array.isArray(job.selected_services) ? job.selected_services as any[] : [];
          
          const partsCost = parts.reduce((sum: number, part: any) => 
            sum + (Number(part.quantity || 0) * Number(part.unitPrice || 0)), 0);
          const laborCost = Number(job.manual_labor_cost || 0) > 0 
            ? Number(job.manual_labor_cost || 0) 
            : (Number(job.labor_hours || 0) * Number(job.hourly_rate || 0));
          const servicesCost = selectedServices.reduce((sum: number, service: any) => 
            sum + Number(service.price || 0), 0);
          return total + partsCost + laborCost + servicesCost;
        }, 0) || 0;

        // Fetch job counts
        const { data: allJobs } = await supabase
          .from('job_cards')
          .select('id, status, created_at, actual_completion_date')
          .eq('garage_id', currentGarage.id);

        const todayCompletedJobs = allJobs?.filter(job => 
          job.status === 'Completed' && 
          job.actual_completion_date?.startsWith(today)
        ).length || 0;

        const completedJobs = allJobs?.filter(job => 
          job.status === 'Completed' &&
          job.actual_completion_date && job.actual_completion_date >= startOfMonth
        ).length || 0;

        const activeJobs = allJobs?.filter(job => 
          job.status === 'In Progress' || job.status === 'Pending'
        ).length || 0;

        // Calculate average repair time (simplified)
        const completedJobsWithDates = allJobs?.filter(job => 
          job.status === 'Completed' && job.created_at && job.actual_completion_date
        ) || [];

        let avgDays = 0;
        if (completedJobsWithDates.length > 0) {
          const totalDays = completedJobsWithDates.reduce((sum, job) => {
            const start = new Date(job.created_at);
            const end = new Date(job.actual_completion_date!);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            return sum + days;
          }, 0);
          avgDays = Math.round(totalDays / completedJobsWithDates.length);
        }

        const avgRepairTime = avgDays === 1 ? '1 day' : `${avgDays} days`;

        return {
          todayRevenue,
          monthlyRevenue,
          todayCompletedJobs,
          completedJobs,
          activeJobs,
          avgRepairTime,
        };
      } catch (error) {
        console.error('Error fetching revenue tabs metrics:', error);
        return {
          todayRevenue: 0,
          monthlyRevenue: 0,
          todayCompletedJobs: 0,
          completedJobs: 0,
          activeJobs: 0,
          avgRepairTime: '0 days',
        };
      }
    },
    enabled: !!currentGarage?.id,
    staleTime: 0,
    gcTime: 30 * 1000,
  });

  return {
    metrics: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};
