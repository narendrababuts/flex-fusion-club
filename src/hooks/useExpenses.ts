import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGarage } from '@/contexts/GarageContext';
import { useEffect, useRef } from 'react';

interface Expense {
  id: string;
  garage_id: string;
  type: 'purchase' | 'inventory_purchase' | 'cogs' | 'manual'; // Added 'purchase'
  item_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  related_id?: string;
  description?: string;
  created_at: string;
}

interface ExpenseSummary {
  totalInventoryPurchases: number;
  totalCOGS: number;
  totalManualExpenses: number; // <-- add manual expenses metric
  inventoryExpenseBalance: number;
  totalExpenses: number;
}

export const useExpenses = () => {
  const { currentGarage } = useGarage();
  const queryClient = useQueryClient();
  const channelRef = useRef<any>(null);

  // Set up real-time subscription for expenses
  useEffect(() => {
    if (!currentGarage?.id) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const channelName = `expenses-${currentGarage.id}-${uniqueId}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'expenses',
          filter: `garage_id=eq.${currentGarage.id}`
        },
        async (payload) => {
          console.log('Expenses data changed:', payload);
          await queryClient.invalidateQueries({ queryKey: ['expenses', currentGarage.id] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentGarage?.id, queryClient]);

  return useQuery({
    queryKey: ['expenses', currentGarage?.id],
    queryFn: async (): Promise<{ data: Expense[]; summary: ExpenseSummary }> => {
      if (!currentGarage?.id) {
        return { 
          data: [], 
          summary: { 
            totalInventoryPurchases: 0, 
            totalCOGS: 0, 
            totalManualExpenses: 0, // <-- add manual expenses metric
            inventoryExpenseBalance: 0, 
            totalExpenses: 0 
          } 
        };
      }

      console.log('Fetching expenses for garage:', currentGarage.id);

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('garage_id', currentGarage.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      // Type-safe data mapping, handling nulls from DB
      const typedData: Expense[] = (data || []).map(expense => ({
        id: expense.id,
        garage_id: expense.garage_id ?? '',
        type: (expense.type as 'purchase' | 'inventory_purchase' | 'cogs' | 'manual'), // allow "purchase"/legacy
        item_name: expense.item_name ?? '',
        quantity: Number(expense.quantity) ?? 0,
        unit_cost: Number(expense.unit_cost) ?? 0,
        total_cost: Number(expense.total_cost) ?? 0,
        related_id: expense.related_id ?? undefined,
        description: expense.description ?? undefined,
        created_at: expense.created_at ?? new Date().toISOString(),
      }));

      // --- Metrics: Accept both new "purchase" and legacy "inventory_purchase" for compatibility ---
      const totalInventoryPurchases = typedData
        ?.filter(expense => expense.type === 'purchase' || expense.type === 'inventory_purchase')
        .reduce((sum, expense) => sum + Number(expense.total_cost), 0) || 0;

      const totalCOGS = typedData
        ?.filter(expense => expense.type === 'cogs')
        .reduce((sum, expense) => sum + Number(expense.total_cost), 0) || 0;

      const totalManualExpenses = typedData
        ?.filter(expense => expense.type === 'manual')
        .reduce((sum, expense) => sum + Number(expense.total_cost), 0) || 0;

      const inventoryExpenseBalance = totalInventoryPurchases - totalCOGS;
      const totalExpenses =
        totalInventoryPurchases + totalManualExpenses + totalCOGS;

      console.log('Expense summary:', {
        totalInventoryPurchases,
        totalCOGS,
        totalManualExpenses, // <-- add manual expenses metric
        inventoryExpenseBalance,
        totalExpenses
      });

      return {
        data: typedData,
        summary: {
          totalInventoryPurchases,
          totalCOGS,
          totalManualExpenses, // <-- add manual expenses metric
          inventoryExpenseBalance,
          totalExpenses
        }
      };
    },
    enabled: !!currentGarage?.id,
    staleTime: 0,
    gcTime: 30 * 1000,
  });
};

export const useAddManualExpense = () => {
  const { currentGarage } = useGarage();
  const queryClient = useQueryClient();

  const addExpense = async (expense: {
    item_name: string;
    quantity: number;
    unit_cost: number;
    description?: string;
  }) => {
    if (!currentGarage?.id) {
      throw new Error('No garage selected');
    }

    const { error } = await supabase
      .from('expenses')
      .insert({
        garage_id: currentGarage.id,
        type: 'manual',
        item_name: expense.item_name,
        quantity: expense.quantity,
        unit_cost: expense.unit_cost,
        total_cost: expense.quantity * expense.unit_cost,
        description: expense.description || `Manual expense: ${expense.item_name}`
      });

    if (error) {
      console.error('Error adding manual expense:', error);
      throw error;
    }

    // Invalidate expenses query
    await queryClient.invalidateQueries({ queryKey: ['expenses', currentGarage.id] });
  };

  return { addExpense };
};
