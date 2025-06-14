
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useGarage } from '@/contexts/GarageContext';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { formatIndianCurrency } from '@/lib/utils';
import { Plus, Download, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import ExpensesDashboard from '@/components/accounts/ExpensesDashboard';
import { useExpenses } from '@/hooks/useExpenses';
import { useLiveInventoryValue } from "@/hooks/useLiveInventoryValue";

interface AccountEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  garage_id: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<AccountEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  // FIX: Correct useState generic usage for typeFilter
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const { toast } = useToast();
  const { currentGarage, loading: garageLoading } = useGarage();
  const { data: expenseData, isLoading: expenseLoading } = useExpenses();
  const { value: inventoryValue, isLoading: invValueLoading } = useLiveInventoryValue();

  const [newEntry, setNewEntry] = useState({
    type: 'income' as 'income' | 'expense',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!garageLoading && currentGarage) {
      fetchAccounts();
    }
  }, [currentGarage, garageLoading, dateRange, typeFilter]);

  useEffect(() => {
    if (!currentGarage?.id) return;

    const channel = supabase
      .channel('accounts-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'accounts',
          filter: `garage_id=eq.${currentGarage.id}`
        }, 
        () => {
          console.log('Accounts data changed, refreshing');
          fetchAccounts();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGarage?.id]);

  const fetchAccounts = async () => {
    if (!currentGarage?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      let query = supabase
        .from('accounts')
        .select('*')
        .eq('garage_id', currentGarage.id)
        .order('date', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('date', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('date', dateRange.to.toISOString());
      }
      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const accountEntries: AccountEntry[] = data.map(account => ({
        id: account.id,
        type: account.type,
        amount: Number(account.amount),
        date: account.date,
        description: account.description || '',
        garage_id: account.garage_id,
      }));

      setAccounts(accountEntries);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load accounts data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addAccountEntry = async () => {
    if (!newEntry.description || newEntry.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide description and a valid amount",
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
      const { error } = await supabase
        .from('accounts')
        .insert({
          garage_id: currentGarage.id,
          type: newEntry.type,
          amount: newEntry.amount,
          date: new Date(newEntry.date).toISOString(),
          description: newEntry.description,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account entry added successfully",
      });

      setNewEntry({
        type: 'income',
        amount: 0,
        description: '',
        date: new Date().toISOString().split('T')[0],
      });

      fetchAccounts();
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding account entry:', error);
      toast({
        title: "Error",
        description: "Failed to add account entry",
        variant: "destructive",
      });
    }
  };

  const calculateTotals = () => {
    const income = accounts.filter(acc => acc.type === 'income').reduce((sum, acc) => sum + acc.amount, 0);
    const expense = accounts.filter(acc => acc.type === 'expense').reduce((sum, acc) => sum + acc.amount, 0);
    return { income, expense, balance: income - expense };
  };

  const totals = calculateTotals();

  // Everything below is inside the Accounts component function now
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">Manage your financial records and expenses</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatIndianCurrency(totals.income)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatIndianCurrency(totals.expense)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatIndianCurrency(totals.balance)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses">
          {expenseLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

                {/* Inventory Purchases Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Inventory Purchases
                    </CardTitle>
                    <span className="inline-block ml-auto"><i className="lucide lucide-shopping-cart" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-700">
                      {expenseData ?
                        (Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(expenseData.summary.totalInventoryPurchases || 0))
                        : '--'
                      }
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Lifetime amount spent on inventory purchases
                    </div>
                  </CardContent>
                </Card>

                {/* COGS Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Cost of Goods Sold (COGS)
                    </CardTitle>
                    <span className="inline-block ml-auto"><i className="lucide lucide-dollar-sign" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-700">
                      {expenseData ?
                        (Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(expenseData.summary.totalCOGS || 0))
                        : '--'
                      }
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Value of inventory actually used (parts consumed)
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Expenses Card */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Manual Expenses
                    </CardTitle>
                    <span className="inline-block ml-auto"><i className="lucide lucide-dollar-sign" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-700">
                      {expenseData ?
                        (Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(expenseData.summary.totalManualExpenses || 0))
                        : '--'
                      }
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Out-of-process, custom or one-off expenses
                    </div>
                  </CardContent>
                </Card>

                {/* Inventory "Balance" per Expense History */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Inventory Expense Balance
                    </CardTitle>
                    <span className="inline-block ml-auto" title="Purchases minus COGS"><i className="lucide lucide-calculator" /></span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-700">
                      {expenseData ?
                        (Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 }).format(expenseData.summary.inventoryExpenseBalance || 0))
                        : '--'
                      }
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Purchases − COGS (historic balance, may not match stock)
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Info block for inventory metrics */}
              <div className="mb-2 text-xs text-muted-foreground flex flex-col gap-1 md:gap-0 md:flex-row md:items-center md:justify-between">
                <span>
                  <b>Inventory Expense Balance:</b> Purchases − COGS, a running total based only on expense events. <span className="text-muted-foreground">Can drift from real stock value if items were added/removed manually or through corrections.</span>
                </span>
                <span>
                  <b>Current Inventory Value (Live):</b> True value of items actually in stock, updated in real time.
                </span>
              </div>

              {/* Dual Metrics: Purchases - COGS and Current Inventory Value */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-6">

                {/* Historic Expense Balance */}
                <div className="bg-white rounded-lg shadow border border-muted p-4 flex flex-col relative">
                  <div className="text-xs text-blue-800 mb-1 flex items-center gap-1">
                    <i className="lucide lucide-calculator" />
                    <span>
                      Inventory Expense Balance (Purchases − COGS)
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-blue-900">
                    {expenseData
                      ? Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 2,
                        }).format(
                          (expenseData.summary.totalInventoryPurchases || 0) - (expenseData.summary.totalCOGS || 0)
                        )
                      : "--"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Based on expenses, not live stock.
                  </div>
                </div>

                {/* Live Inventory Value */}
                <div className="bg-white rounded-lg shadow border border-muted p-4 flex flex-col relative">
                  <div className="text-xs text-green-800 mb-1 flex items-center gap-1">
                    <i className="lucide lucide-dollar-sign" />
                    <span>
                      Current Inventory Value (Live)
                    </span>
                  </div>
                  <div className="text-xl font-semibold text-green-700">
                    {invValueLoading
                      ? <span className="animate-pulse">...</span>
                      : Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                          minimumFractionDigits: 2,
                        }).format(inventoryValue)
                    }
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Real-time value of stock currently in inventory.
                  </div>
                </div>
              </div>
              <ExpensesDashboard />
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>View and manage your financial transactions</CardDescription>
                </div>
                <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Entry
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Account Entry</DialogTitle>
                      <DialogDescription>
                        Record a new financial transaction
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Type</Label>
                        <Select value={newEntry.type} onValueChange={(value: 'income' | 'expense') => setNewEntry(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="amount" className="text-right">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={newEntry.amount}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="date" className="text-right">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newEntry.date}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, date: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">Description</Label>
                        <Textarea
                          id="description"
                          value={newEntry.description}
                          onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" onClick={addAccountEntry}>
                        Add Entry
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-4 mb-4">
                <DatePickerWithRange onChange={setDateRange} />
                <Select value={typeFilter} onValueChange={(value: 'all' | 'income' | 'expense') => setTypeFilter(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income Only</SelectItem>
                    <SelectItem value="expense">Expense Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction List */}
              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : accounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transactions found</p>
                  <p className="text-sm mt-2">Add your first transaction to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            account.type === 'income' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {account.type === 'income' ? 'Income' : 'Expense'}
                          </span>
                        </div>
                        <p className="font-medium mt-1">{account.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(account.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${
                          account.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {account.type === 'income' ? '+' : '-'}{formatIndianCurrency(account.amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default Accounts;

