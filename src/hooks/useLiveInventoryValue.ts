
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGarage } from "@/contexts/GarageContext";

// Returns { value, isLoading }
export function useLiveInventoryValue() {
  const { currentGarage } = useGarage();
  const queryClient = useQueryClient();

  // --- Query for total value
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["inventory-value", currentGarage?.id],
    queryFn: async (): Promise<number> => {
      if (!currentGarage?.id) return 0;
      const { data, error } = await supabase
        .from("inventory")
        .select("quantity,unit_price")
        .eq("garage_id", currentGarage.id);

      if (error) {
        console.error("Error fetching inventory:", error);
        return 0;
      }
      return Array.isArray(data)
        ? data.reduce(
            (acc, item) => acc + (Number(item.quantity) * Number(item.unit_price)),
            0
          )
        : 0;
    },
    enabled: !!currentGarage?.id,
    staleTime: 0,
    gcTime: 5_000,
  });

  // Set up subscription for live updates
  useEffect(() => {
    if (!currentGarage?.id) return;
    const channel = supabase
      .channel(`inventory-live-value-${currentGarage.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
          filter: `garage_id=eq.${currentGarage.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["inventory-value", currentGarage.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGarage?.id, queryClient]);

  return { value: data ?? 0, isLoading };
}
