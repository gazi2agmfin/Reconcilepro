
'use client';

import { useEffect, useMemo, useState } from 'react';
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

  // Selected month persisted in localStorage in `yyyy-MM` format
  const STORAGE_KEY = 'dashboard:selectedMonth';
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || format(new Date(), 'yyyy-MM');
    } catch (e) {
      return format(new Date(), 'yyyy-MM');
    }
  });

  useEffect(() => {
    try {
      // Persist a normalized month value: if the input was cleared (empty string),
      // fall back to the current month so downstream logic never sees an empty value.
      const normalized = selectedMonth || format(new Date(), 'yyyy-MM');
      if (normalized !== selectedMonth) setSelectedMonth(normalized);
      localStorage.setItem(STORAGE_KEY, normalized);
    } catch (e) {
      // ignore
    }
  }, [selectedMonth]);

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

    // baseDate is the month/year selected by the user
    // If the selector is empty, normalize to the current month so parsing is safe.
    const normalizedSelected = selectedMonth || format(new Date(), 'yyyy-MM');
    const [selYearStr, selMonthStr] = normalizedSelected.split('-');
    const currentYear = Number(selYearStr);
    const currentMonth = Number(selMonthStr) - 1; // 0-indexed month
    const now = new Date(currentYear, currentMonth, 1);

    let totalReconciledValue = 0;
    let reconciliationsThisMonth = 0;
    let statementsWithDifferences = 0;
    const monthlyCounts: { [key: string]: number } = {};

    reconciliations.forEach(rec => {
      if (!rec.reconciliationDate) return;
      const dateParts = rec.reconciliationDate.split('-').map(Number);
      const recDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

      // Count as 'this month' if recDate falls within selected month
      if (recDate.getFullYear() === currentYear && recDate.getMonth() === currentMonth) {
        reconciliationsThisMonth++;
        totalReconciledValue += rec.correctedBalance || 0;
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
  }, [reconciliations, selectedMonth]);
  

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
        <div className="flex items-center space-x-3">
          <label className="text-sm text-muted-foreground">View month:</label>
          <input
            aria-label="Select month"
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              // If the user clears the input, e.target.value will be an empty string.
              // Normalize that immediately to the current month to avoid downstream errors.
              const val = e.target.value || format(new Date(), 'yyyy-MM');
              setSelectedMonth(val);
            }}
            className="rounded-md border px-2 py-1 text-sm"
          />
          <Button asChild>
            <Link href="/reconciliations/new">
              <PlusCircle className="mr-2 h-4 w-4" /> New Reconciliation
            </Link>
          </Button>
        </div>
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
              In {(() => {
                try {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                } catch (e) {
                  return new Date().toLocaleString('default', { month: 'long' });
                }
              })()}
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
              In {(() => {
                try {
                  const [y, m] = selectedMonth.split('-').map(Number);
                  return new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
                } catch (e) {
                  return new Date().toLocaleString('default', { month: 'long' });
                }
              })()}
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
          <MonthlyOverviewChart data={monthlyChartData} isLoading={isLoading} colorBy="month" />
        </CardContent>
      </Card>
    </div>
  );
}
