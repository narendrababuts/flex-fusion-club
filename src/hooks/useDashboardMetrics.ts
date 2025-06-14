
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGarage } from '@/contexts/GarageContext';

interface DashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  lowStockItems: number;
  inventoryValue: number;
  inventoryExpenseBalance: number;
  totalCOGS: number;
}

export const useDashboardMetrics = () => {
  const { currentGarage } = useGarage();

  const query = useQuery({
    queryKey: ['dashboard_stats', currentGarage?.id],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!currentGarage?.id) {
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalJobs: 0,
          completedJobs: 0,
          pendingJobs: 0,
          lowStockItems: 0,
          inventoryValue: 0,
          inventoryExpenseBalance: 0,
          totalCOGS: 0,
        };
      }

      try {
        // Fetch revenue data
        const { data: revenueData } = await supabase
          .from('accounts')
          .select('amount')
          .eq('garage_id', currentGarage.id)
          .eq('type', 'income');

        const totalRevenue = revenueData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

        // Fetch expense data from accounts table
        const { data: expenseData } = await supabase
          .from('accounts')
          .select('amount')
          .eq('garage_id', currentGarage.id)
          .eq('type', 'expense');

        const accountExpenses = expenseData?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;

        // Fetch expense data from expenses table
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('total_cost, type')
          .eq('garage_id', currentGarage.id);

        const inventoryPurchases = expensesData
          ?.filter(expense => expense.type === 'inventory_purchase')
          .reduce((sum, expense) => sum + Number(expense.total_cost), 0) || 0;

        const totalCOGS = expensesData
          ?.filter(expense => expense.type === 'cogs')
          .reduce((sum, expense) => sum + Number(expense.total_cost), 0) || 0;

        const manualExpenses = expensesData
          ?.filter(expense => expense.type === 'manual')
          .reduce((sum, expense) => sum + Number(expense.total_cost), 0) || 0;

        const totalExpenses = accountExpenses + inventoryPurchases + manualExpenses;
        const inventoryExpenseBalance = inventoryPurchases - totalCOGS;
        const netProfit = totalRevenue - totalExpenses;

        // Fetch job data
        const { data: jobData } = await supabase
          .from('job_cards')
          .select('id, status')
          .eq('garage_id', currentGarage.id);

        const totalJobs = jobData?.length || 0;
        const completedJobs = jobData?.filter(job => job.status === 'Completed').length || 0;
        const pendingJobs = totalJobs - completedJobs;

        // Fetch inventory data
        const { data: inventoryData } = await supabase
          .from('inventory')
          .select('quantity, min_stock_level, unit_price')
          .eq('garage_id', currentGarage.id);

        const lowStockItems = inventoryData?.filter(item => 
          item.quantity <= item.min_stock_level
        ).length || 0;

        const inventoryValue = inventoryData?.reduce((sum, item) => 
          sum + (item.quantity * item.unit_price), 0
        ) || 0;

        return {
          totalRevenue,
          totalExpenses,
          netProfit,
          totalJobs,
          completedJobs,
          pendingJobs,
          lowStockItems,
          inventoryValue,
          inventoryExpenseBalance,
          totalCOGS,
        };
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        return {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          totalJobs: 0,
          completedJobs: 0,
          pendingJobs: 0,
          lowStockItems: 0,
          inventoryValue: 0,
          inventoryExpenseBalance: 0,
          totalCOGS: 0,
        };
      }
    },
    enabled: !!currentGarage?.id,
    staleTime: 0,
    gcTime: 30 * 1000,
  });

  return {
    metrics: query.data,
    isMetricsLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch
  };
};
