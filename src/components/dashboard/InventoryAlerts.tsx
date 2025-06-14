import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LowStockItem {
  id: string;
  name: string;
  current_stock: number;
  minimum_stock: number;
}

const InventoryAlerts = () => {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLowStockItems();

    // Set up real-time subscription
    const channel = supabase
      .channel('inventory-alerts')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'inventory' },
        () => fetchLowStockItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLowStockItems = async () => {
    try {
      // First get all inventory items, then filter in JavaScript to avoid SQL type issues
      const { data, error } = await supabase
        .from('inventory')
        .select('id, item_name, quantity, min_stock_level')
        .order('item_name');

      if (error) {
        console.error('Error fetching inventory items:', error);
        return;
      }

      // Filter items where quantity is less than or equal to min_stock_level
      const lowStockData = data?.filter(item => 
        item.quantity <= item.min_stock_level
      ) || [];

      const formattedItems = lowStockData.map(item => ({
        id: item.id,
        name: item.item_name,
        current_stock: item.quantity,
        minimum_stock: item.min_stock_level
      }));

      setLowStockItems(formattedItems);
    } catch (error) {
      console.error('Exception fetching low stock items:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToInventory = () => {
    navigate('/inventory');
  };

  return (
    <Card accent="red">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span className="icon-bg"><Package size={20} color="#1E3A8A" /></span>
          Inventory Alerts
        </CardTitle>
        {lowStockItems.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={navigateToInventory} 
            className="text-primary hover:bg-primary/10"
          >
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading inventory alerts...</p>
          </div>
        ) : lowStockItems.length > 0 ? (
          lowStockItems.slice(0, 3).map((item) => (
            <div key={item.id} className="alert-block">
              <span className="icon-bg"><Package size={20} color="#1E3A8A" /></span>
              <div>
                <div className="alert-block-title">Low Stock: {item.name}</div>
                <div className="alert-block-desc">
                  Current stock: {item.current_stock} (Minimum required: {item.minimum_stock})
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No inventory alerts at this time.</p>
          </div>
        )}
        {lowStockItems.length > 3 && (
          <div className="text-sm text-muted-foreground text-center pt-2">
            +{lowStockItems.length - 3} more items low in stock
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryAlerts;
