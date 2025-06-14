import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExpenses } from '@/hooks/useExpenses';
import { formatIndianCurrency } from '@/lib/utils';
import { 
  ShoppingCart, 
  Package, 
  TrendingDown, 
  Calculator,
  Clock
} from 'lucide-react';

const ExpensesDashboard = () => {
  const { data: expenseData, isLoading } = useExpenses();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { summary, data: expenses } = expenseData || { 
    summary: { totalInventoryPurchases: 0, totalCOGS: 0, inventoryExpenseBalance: 0, totalExpenses: 0 }, 
    data: [] 
  };

  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Purchases</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatIndianCurrency(summary.totalInventoryPurchases)}
            </div>
            <p className="text-xs text-muted-foreground">
              Amount spent on inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost of Goods Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatIndianCurrency(summary.totalCOGS)}
            </div>
            <p className="text-xs text-muted-foreground">
              Value of inventory used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Balance</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatIndianCurrency(summary.inventoryExpenseBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Remaining inventory value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatIndianCurrency(summary.totalExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              All expenses combined
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
          <CardDescription>
            Latest expense entries from inventory purchases and job completions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No expenses recorded yet</p>
              <p className="text-sm mt-2">Expenses will appear here when you add inventory or complete jobs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{expense.item_name}</h4>
                      <Badge 
                        variant={
                          expense.type === 'inventory_purchase' ? 'default' :
                          expense.type === 'cogs' ? 'info' : 'outline'
                        }
                        className="text-xs"
                      >
                        {expense.type === 'inventory_purchase' ? 'Purchase' :
                         expense.type === 'cogs' ? 'COGS' : 'Manual'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Qty: {expense.quantity} × {formatIndianCurrency(expense.unit_cost)}
                    </p>
                    {expense.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {expense.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatIndianCurrency(expense.total_cost)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(expense.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesDashboard;
