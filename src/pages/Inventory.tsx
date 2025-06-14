import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Search, Pencil, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useGarage } from '@/contexts/GarageContext';
import StockGauge from "@/components/inventory/StockGauge";
import BinIcon3D from "@/components/inventory/BinIcon3D";
import { Switch } from "@/components/ui/switch";
import { useLiveInventoryValue } from "@/hooks/useLiveInventoryValue";
import { formatIndianCurrency } from "@/lib/utils";

interface InventoryItem {
  id: string;
  item_name: string;
  quantity: number;
  min_stock_level: number;
  unit_price: number;
  supplier: string;
  garage_id?: string;
  created_at?: string;
}

// Function to convert database items to InventoryItem format
const convertToInventoryItem = (item: any): InventoryItem => {
  return {
    id: item.id,
    item_name: item.item_name || '',
    quantity: item.quantity || 0,
    min_stock_level: item.min_stock_level || 0,
    unit_price: item.unit_price || 0,
    supplier: item.supplier || '',
    garage_id: item.garage_id || '',
    created_at: item.created_at || new Date().toISOString()
  };
};

// Validation util
function validateInventoryRow(item: InventoryItem) {
  const errors: Record<string, string> = {};
  if (!item.item_name || !item.item_name.trim()) errors.item_name = "Item name required";
  if (item.quantity < 0) errors.quantity = "Stock cannot be negative";
  if (item.min_stock_level < 0) errors.min_stock_level = "Minimum stock cannot be negative";
  if (item.unit_price < 0) errors.unit_price = "Price cannot be negative";
  // other validations can be added here
  return errors;
}

const Inventory = () => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<InventoryItem>({
    id: '',
    item_name: '',
    quantity: 0,
    min_stock_level: 10,
    unit_price: 0,
    supplier: '',
    garage_id: '',
    created_at: '',
  });
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<InventoryItem | null>(null);
  const [editRowErrors, setEditRowErrors] = useState<Record<string, string>>({});
  const { currentGarage, loading: garageLoading } = useGarage();
  const { value: inventoryValue, isLoading: valueLoading } = useLiveInventoryValue();

  useEffect(() => {
    if (!garageLoading && currentGarage) {
      fetchInventory();
    }
  }, [currentGarage, garageLoading]);

  useEffect(() => {
    if (!currentGarage?.id) return;

    const channel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'inventory',
          filter: `garage_id=eq.${currentGarage.id}`
        }, 
        () => {
          console.log('Inventory change detected, refreshing inventory');
          fetchInventory();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGarage?.id]);

  const fetchInventory = async () => {
    if (!currentGarage?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('garage_id', currentGarage.id)
        .order('item_name');

      if (error) throw error;

      const inventoryItems: InventoryItem[] = data.map(convertToInventoryItem);
      setInventoryItems(inventoryItems);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to load inventory items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addInventoryItem = async () => {
    if (!newItem.item_name || newItem.unit_price <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide item name and a valid price",
        variant: "destructive",
      });
      return;
    }

    if (!currentGarage?.id) {
      toast({
        title: "Error",
        description: "No garage selected",
        variant: "destructive",
      });
      return;
    }

    try {
      const itemToInsert = {
        item_name: newItem.item_name,
        quantity: newItem.quantity,
        min_stock_level: newItem.min_stock_level,
        unit_price: newItem.unit_price,
        supplier: newItem.supplier,
        garage_id: currentGarage.id
      };

      console.log('Inserting inventory item:', itemToInsert);

      const { data, error } = await supabase
        .from('inventory')
        .insert(itemToInsert)
        .select();

      if (error) {
        console.error('Supabase inventory error:', error);
        throw error;
      }

      // Insert 'purchase' expense
      if (data && data.length > 0) {
        const inv = data[0];
        const purchaseExpense = {
          garage_id: currentGarage.id,
          type: 'purchase',
          item_name: inv.item_name,
          quantity: inv.quantity,
          unit_cost: inv.unit_price,
          total_cost: Number(inv.quantity) * Number(inv.unit_price),
          related_id: inv.id,
          description: `Inventory item added: ${inv.item_name}`
        };
        const { error: expenseError } = await supabase.from('expenses').insert([purchaseExpense]);
        if (expenseError) {
          console.error('Supabase expense insert error:', expenseError);
          toast({
            title: "Expense Insert Error",
            description: "Failed to record purchase expense. " + (expenseError.message || ""),
            variant: "destructive",
          });
        }
      }

      toast({
        title: "Success",
        description: "Inventory item added successfully",
      });

      setNewItem({
        id: '',
        item_name: '',
        quantity: 0,
        min_stock_level: 10,
        unit_price: 0,
        supplier: '',
        garage_id: '',
        created_at: '',
      });

      fetchInventory();
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error adding inventory item:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to add inventory item",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewItem(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleNumberChange = (name: string, value: number) => {
    setNewItem(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const startEditRow = (row: InventoryItem) => {
    setEditingRowId(row.id);
    setEditRow({ ...row }); // Clone row, don't mutate
    setEditRowErrors({});
  };

  const cancelEditRow = () => {
    setEditingRowId(null);
    setEditRow(null);
    setEditRowErrors({});
  };

  const handleEditInputChange = (name: keyof InventoryItem, value: any) => {
    if (!editRow) return;
    let newRow = { ...editRow, [name]: value };
    setEditRow(newRow);
    setEditRowErrors(validateInventoryRow(newRow));
  };

  const saveEditRow = async () => {
    if (!editRow) return;

    // Validate
    const errors = validateInventoryRow(editRow);
    setEditRowErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Update via Supabase
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          item_name: editRow.item_name,
          quantity: editRow.quantity,
          min_stock_level: editRow.min_stock_level,
          unit_price: editRow.unit_price,
          supplier: editRow.supplier,
        })
        .eq('id', editRow.id)
        .eq('garage_id', currentGarage.id);

      if (error) throw error;

      toast({
        title: "Inventory updated",
        description: `Inventory for '${editRow.item_name}' updated successfully.`,
      });

      setEditingRowId(null);
      setEditRow(null);
      fetchInventory();
    } catch (err: any) {
      toast({
        title: "Save failed",
        description: err?.message || "Could not update inventory item.",
        variant: "destructive",
      });
    }
  };

  // Filter inventory items based on search query
  const filteredItems = inventoryItems.filter(item =>
    (showLowStockOnly ? item.quantity < item.min_stock_level : true) &&
    (item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (garageLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentGarage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Garage Found</h2>
          <p className="text-muted-foreground">Please contact support if this issue persists.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 animate-fade-in">
      {/* New: Total Inventory Value Card */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4">
        <div className="mb-4 md:mb-0">
          <div className="inline-block">
            <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col items-center border border-blue-100 min-w-[210px]">
              <span className="text-xs text-muted-foreground">Total Inventory Value</span>
              <span className="text-2xl font-bold text-blue-700 mt-1">
                {valueLoading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  formatIndianCurrency(inventoryValue)
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      <Card className="bg-[#f7fafc] border-0 shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div>
              <CardTitle className="text-primary text-2xl font-extrabold mb-1">Inventory Management</CardTitle>
              <CardDescription>Manage your inventory items and stock levels</CardDescription>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              className="bg-primary text-white hover:bg-primary-dark shadow-md rounded-lg px-6 py-2 flex gap-2 items-center"
              variant="default"
            >
              <Plus className="w-5 h-5" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <Input
              type="search"
              placeholder="Search inventory..."
              className="max-w-md"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div className="flex items-center gap-2 ml-1">
              <Switch
                id="lowStockSwitch"
                checked={showLowStockOnly}
                onCheckedChange={setShowLowStockOnly}
                className={showLowStockOnly ? "bg-red-200" : "bg-gray-200"}
              />
              <Label htmlFor="lowStockSwitch" className="font-medium text-xs text-gray-700">
                Only low‑stock
              </Label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] px-2"></TableHead>
                  <TableHead className="w-[90px] px-2"></TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Min. Stock Level</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading inventory...</TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No inventory items found.</TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => {
                    const isLowStock = item.quantity < item.min_stock_level;
                    const isEditing = editingRowId === item.id;
                    return (
                      <TableRow
                        key={item.id}
                        className={
                          `transition-all group
                           ${isLowStock && showLowStockOnly ? "scale-105 shadow-lg bg-red-50" : "hover:shadow-md"}
                           ${isLowStock ? "" : "hover:bg-blue-50"}
                           ${isEditing ? "bg-blue-100 border-blue-400 shadow-xl scale-[1.01]" : ""}
                           ${isLowStock ? '' : ''}`
                        }
                      >
                        {/* Bin (leftmost) */}
                        <TableCell className="px-2 py-3">
                          <BinIcon3D
                            current={item.quantity}
                            min={item.min_stock_level}
                            supplier={item.supplier}
                          />
                        </TableCell>
                        {/* Gauge */}
                        <TableCell className="px-2 py-3 align-middle">
                          <StockGauge current={isEditing && editRow ? editRow.quantity : item.quantity} min={item.min_stock_level} />
                        </TableCell>
                        {/* Inline Editable Cells */}
                        <TableCell className="font-semibold">
                          {isEditing ? (
                            <div>
                              <Input
                                value={editRow?.item_name}
                                className={`text-base ${editRowErrors.item_name ? 'border-red-500' : ''}`}
                                onChange={(e) => handleEditInputChange('item_name', e.target.value)}
                                autoFocus
                                onFocus={e => e.target.select()}
                                style={{ minWidth: 90 }}
                                tabIndex={0}
                              />
                              {editRowErrors.item_name && (
                                <div className="text-xs text-red-600">{editRowErrors.item_name}</div>
                              )}
                            </div>
                          ) : (
                            item.item_name
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editRow?.quantity}
                              className={`text-base ${editRowErrors.quantity ? 'border-red-500' : ''}`}
                              onChange={(e) => handleEditInputChange('quantity', Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ maxWidth: 80 }}
                              tabIndex={0}
                            />
                          ) : (
                            item.quantity
                          )}
                          {isEditing && editRowErrors.quantity && (
                            <div className="text-xs text-red-600">{editRowErrors.quantity}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editRow?.min_stock_level}
                              className={`text-base ${editRowErrors.min_stock_level ? 'border-red-500' : ''}`}
                              onChange={(e) => handleEditInputChange('min_stock_level', Math.max(0, parseInt(e.target.value) || 0))}
                              style={{ maxWidth: 80 }}
                              tabIndex={0}
                            />
                          ) : (
                            item.min_stock_level
                          )}
                          {isEditing && editRowErrors.min_stock_level && (
                            <div className="text-xs text-red-600">{editRowErrors.min_stock_level}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editRow?.unit_price}
                              className={`text-base ${editRowErrors.unit_price ? 'border-red-500' : ''}`}
                              onChange={(e) => handleEditInputChange('unit_price', Math.max(0, parseFloat(e.target.value) || 0))}
                              style={{ maxWidth: 90 }}
                              tabIndex={0}
                            />
                          ) : (
                            <>₹{item.unit_price}</>
                          )}
                          {isEditing && editRowErrors.unit_price && (
                            <div className="text-xs text-red-600">{editRowErrors.unit_price}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Input
                              value={editRow?.supplier || ""}
                              className="text-base"
                              onChange={(e) => handleEditInputChange('supplier', e.target.value)}
                              style={{ minWidth: 90 }}
                              tabIndex={0}
                            />
                          ) : (
                            item.supplier
                          )}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {isEditing ? (
                            <>
                              <Button
                                variant="default"
                                size="icon"
                                className="bg-primary text-white shadow"
                                aria-label="Save"
                                onClick={saveEditRow}
                                disabled={Object.keys(editRowErrors).length > 0}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="bg-error text-white shadow"
                                aria-label="Cancel"
                                onClick={cancelEditRow}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="default"
                                size="icon"
                                className="bg-primary text-white hover:bg-primary-dark shadow"
                                aria-label="Edit item"
                                onClick={() => startEditRow(item)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="bg-error text-white shadow"
                                aria-label="Delete item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Inventory Item</DialogTitle>
            <DialogDescription>
              Fill in the details for the new inventory item
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item_name">Item Name</Label>
                <Input
                  id="item_name"
                  name="item_name"
                  value={newItem.item_name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="unit_price">Unit Price</Label>
                <Input
                  id="unit_price"
                  type="number"
                  name="unit_price"
                  value={newItem.unit_price}
                  onChange={(e) => handleNumberChange('unit_price', parseFloat(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  name="supplier"
                  value={newItem.supplier}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  name="quantity"
                  value={newItem.quantity}
                  onChange={(e) => handleNumberChange('quantity', parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="min_stock_level">Min. Stock Level</Label>
                <Input
                  id="min_stock_level"
                  type="number"
                  name="min_stock_level"
                  value={newItem.min_stock_level}
                  onChange={(e) => handleNumberChange('min_stock_level', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={addInventoryItem}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;
