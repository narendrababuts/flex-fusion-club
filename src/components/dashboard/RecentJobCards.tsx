import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOptimizedJobCards } from '@/hooks/useOptimizedJobCards';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed':
      return 'bg-success/20 text-green-700 border-green-400';
    case 'In Progress':
      return 'bg-primary/20 text-primary border-primary';
    case 'Pending':
      return 'bg-orange-100 text-orange-600 border-orange-300';
    case 'Parts Ordered':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-200 text-gray-700 border-gray-300';
  }
};

const getStatusType = (status: string) => {
  if (status === 'Completed') return 'completed';
  if (status === 'Pending') return 'pending';
  if (status === 'Draft') return 'draft';
  if (status === 'In Progress') return null;
  if (status === 'Parts Ordered') return null;
  return null;
};

const RecentJobCards = () => {
  const { data: jobCardsData, isLoading } = useOptimizedJobCards({
    limit: 5,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Job Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentJobCards = jobCardsData?.data || [];

  return (
    <Card className="!p-0" accent="blue">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="icon-bg"><ClipboardList size={20} color="#1E3A8A" /></span>
          Recent Job Cards
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentJobCards.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No job cards found. Create your first job card to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="data-table min-w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Car</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentJobCards.map((job, idx) => (
                  <TableRow key={job.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-rowAlt'}>
                    <TableCell className="font-medium">
                      JC-{job.id.slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>{job.customer.name}</TableCell>
                    <TableCell>{job.car.make} {job.car.model}</TableCell>
                    <TableCell>
                      <Badge
                        statusType={getStatusType(job.status)}
                        label={job.status}
                        className="px-3 py-1"
                      />
                    </TableCell>
                    <TableCell>{job.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentJobCards;
