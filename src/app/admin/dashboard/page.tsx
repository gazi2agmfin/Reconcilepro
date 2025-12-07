
'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { DollarSign, BarChart, AlertTriangle } from 'lucide-react';
import { MonthlyOverviewChart } from '@/components/dashboard/monthly-overview-chart';

import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';

import {
  collection,
  query,
  getDocs,
} from 'firebase/firestore';

import { Skeleton } from '@/components/ui/skeleton';

import {
  subMonths,
  format,
  parse,
  isValid,
  startOfToday,
} from 'date-fns';


type Reconciliation = {
  id: string;
  reconciliationDate: string;
  correctedBalance: number;
  difference: number;
  userId?: string;
};

type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
}


export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const isAdmin = useMemo(() => user?.email === 'admin@example.com', [user]);

  const usersQuery = useMemoFirebase(() => {
    if (!isAdmin) return null;
    return query(collection(firestore, 'users'));
  }, [firestore, isAdmin]);

  const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
  const [allReconciliations, setAllReconciliations] = useState<Reconciliation[] | null>(null);
  const [reconciliationsLoading, setReconciliationsLoading] = useState(true);

  useEffect(() => {
    if (!allUsers || !isAdmin) {
      if (!usersLoading) { // If we are done loading users and there are none
          setReconciliationsLoading(false);
          setAllReconciliations([]);
      }
      return;
    };
  
    const fetchAllReconciliations = async () => {
        setReconciliationsLoading(true);
        const allRecons: Reconciliation[] = [];
        const promises = allUsers.map(async (u) => {
            const userReconsRef = collection(firestore, `users/${u.id}/reconciliations`);
            const querySnapshot = await getDocs(userReconsRef);
            querySnapshot.forEach((doc) => {
                const data = doc.data() as Omit<Reconciliation, 'id'>;
                allRecons.push({ ...data, id: doc.id, userId: u.id });
            });
        });
    
        await Promise.all(promises);
        setAllReconciliations(allRecons);
        setReconciliationsLoading(false);
    };

    fetchAllReconciliations();
  }, [allUsers, firestore, isAdmin, usersLoading]);


  const { dashboardStats, monthlyChartData } = useMemo(() => {
    if (!allReconciliations) {
      return {
        dashboardStats: {
          totalReconciledValue: 0,
          totalReconciliations: 0,
          statementsWithDifferences: 0,
        },
        monthlyChartData: Array.from({ length: 12 }).map((_, i) => {
            const dt = subMonths(new Date(), i);
            return { month: format(dt, 'MMM'), reconciliations: 0 };
        }).reverse(),
      };
    }

    // Client-side filtering for the last 12 months
    const twelveMonthsAgo = subMonths(startOfToday(), 12);
    const recentReconciliations = allReconciliations.filter(rec => {
        if (!rec.reconciliationDate) return false;
        try {
            const recDate = parse(rec.reconciliationDate, 'yyyy-MM-dd', new Date());
            return isValid(recDate) && recDate >= twelveMonthsAgo;
        } catch(e) {
            return false;
        }
    });

    let totalReconciledValue = 0;
    let statementsWithDifferences = 0;
    const monthlyCounts: Record<string, number> = {};

    for (const rec of recentReconciliations) {
      totalReconciledValue += rec.correctedBalance || 0;

      if (rec.difference !== 0) {
        statementsWithDifferences++;
      }

      if (typeof rec.reconciliationDate === 'string') {
        const dateObj = parse(rec.reconciliationDate, 'yyyy-MM-dd', new Date());
        if (isValid(dateObj)) {
          const key = format(dateObj, 'MMM yy');
          monthlyCounts[key] = (monthlyCounts[key] || 0) + 1;
        }
      }
    }

    const chartData = Array.from({ length: 12 }).map((_, i) => {
      const dt = subMonths(new Date(), i);
      const key = format(dt, 'MMM yy');
      return {
        month: format(dt, 'MMM'),
        reconciliations: monthlyCounts[key] || 0,
      };
    }).reverse();


    return {
      dashboardStats: {
        totalReconciledValue,
        totalReconciliations: recentReconciliations.length,
        statementsWithDifferences,
      },
      monthlyChartData: chartData,
    };

  }, [allReconciliations]);

  // Build per-user totals for admin overview
  const userChartData = useMemo(() => {
    if (!allReconciliations || !allUsers) return [];
    const twelveMonthsAgo = subMonths(startOfToday(), 12);
    const recent = allReconciliations.filter(rec => {
      if (!rec.reconciliationDate) return false;
      try {
        const recDate = parse(rec.reconciliationDate, 'yyyy-MM-dd', new Date());
        return isValid(recDate) && recDate >= twelveMonthsAgo;
      } catch (e) {
        return false;
      }
    });

    const counts: Record<string, number> = {};
    for (const r of recent) {
      const uid = r.userId || 'unknown';
      counts[uid] = (counts[uid] || 0) + 1;
    }

    // map to user display names
    const rows = (allUsers || []).map(u => ({
      user: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || u.id,
      reconciliations: counts[u.id] || 0,
      userId: u.id,
    }));

    // include any reconciliations with missing user
    if (counts['unknown']) rows.push({ user: 'Unknown', reconciliations: counts['unknown'], userId: 'unknown' });

    // sort descending by count
    return rows.sort((a, b) => b.reconciliations - a.reconciliations);
  }, [allReconciliations, allUsers]);

  const isLoading = isUserLoading || usersLoading || reconciliationsLoading;
  
  if (isUserLoading || (isAdmin && isLoading && !allReconciliations)) {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-3/4" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
                <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-8 w-1/4" /></CardContent></Card>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-[350px] w-full" />
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="space-y-8">
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
                {dashboardStats.totalReconciledValue.toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Last 12 months, across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reconciliations
            </CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-1/4" />
            ) : (
              <div className="text-2xl font-bold">
                {dashboardStats.totalReconciliations}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Last 12 months, across all users
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
              Last 12 months, across all users
            </p>
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">System-Wide Monthly Overview</CardTitle>
          <CardDescription>
            Reconciliations per month (last 12 months).
          </CardDescription>
        </CardHeader>

        <CardContent>
          <MonthlyOverviewChart data={monthlyChartData} isLoading={isLoading} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">User-Based Overview</CardTitle>
          <CardDescription>
            Reconciliations per user (last 12 months). Top users shown.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <MonthlyOverviewChart data={userChartData.slice(0, 8)} isLoading={isLoading} xKey="user" colorBy="user" />
        </CardContent>
      </Card>
    </div>
  );
}
