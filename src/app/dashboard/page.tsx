
'use client';

import { useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DollarSign, BarChart, AlertTriangle, PlusCircle } from 'lucide-react';
import { MonthlyOverviewChart } from '@/components/dashboard/monthly-overview-chart';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { subMonths, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

type Reconciliation = {
  id: string;
  reconciliationDate: string;
  correctedBalance: number;
  difference: number;
};

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const reconciliationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/reconciliations`);
  }, [firestore, user]);

  const { data: reconciliations, isLoading: reconciliationsLoading } =
    useCollection<Reconciliation>(reconciliationsQuery);

  const { dashboardStats, monthlyChartData } = useMemo(() => {
    if (!reconciliations) {
      return {
        dashboardStats: {
          totalReconciledValue: 0,
          reconciliationsThisMonth: 0,
          statementsWithDifferences: 0,
        },
        monthlyChartData: [],
      };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalReconciledValue = 0;
    let reconciliationsThisMonth = 0;
    let statementsWithDifferences = 0;
    const monthlyCounts: { [key: string]: number } = {};

    reconciliations.forEach(rec => {
      const dateParts = rec.reconciliationDate.split('-').map(Number);
      const recDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
      
      if (recDate.getFullYear() === currentYear && recDate.getMonth() === currentMonth) {
        reconciliationsThisMonth++;
        totalReconciledValue += rec.correctedBalance;
      }

      if (rec.difference !== 0) {
        statementsWithDifferences++;
      }

      const monthKey = format(recDate, 'MMM yy');
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });
    
    const chartData = Array.from({ length: 12 }).map((_, i) => {
        const d = subMonths(now, i);
        const monthKey = format(d, 'MMM yy');
        return {
            month: format(d, 'MMM'),
            reconciliations: monthlyCounts[monthKey] || 0,
        };
    }).reverse();


    return {
      dashboardStats: {
        totalReconciledValue,
        reconciliationsThisMonth,
        statementsWithDifferences,
      },
      monthlyChartData: chartData,
    };
  }, [reconciliations]);

  const isLoading = isUserLoading || reconciliationsLoading;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <p className="text-muted-foreground">
            Welcome back, here&apos;s your reconciliation summary.
            </p>
        </div>
        <Button asChild>
            <Link href="/reconciliations/new">
                <PlusCircle className="mr-2 h-4 w-4" /> New Reconciliation
            </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reconciled Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">
                {dashboardStats.totalReconciledValue.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              In {new Date().toLocaleString('default', { month: 'long' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Reconciliations This Month
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">
                +{dashboardStats.reconciliationsThisMonth}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              In {new Date().toLocaleString('default', { month: 'long' })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Statements with Differences
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">
                {dashboardStats.statementsWithDifferences}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Action may be required
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Monthly Overview</CardTitle>
          <CardDescription>
            Number of reconciliations completed per month for the last year.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyOverviewChart data={monthlyChartData} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
