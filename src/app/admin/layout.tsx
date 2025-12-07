
"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppShell from '@/components/layout/app-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

const AdminLoadingSkeleton = () => (
    <AppShell>
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
                <p className="text-muted-foreground">Manage users and application data.</p>
            </div>
            <Tabs defaultValue="reconciliations" className="w-full">
                <TabsList>
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="users">Users</TabsTrigger>
                    <TabsTrigger value="reconciliations">All Reconciliations</TabsTrigger>
                    <TabsTrigger value="banks">Banks</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="account">My Account</TabsTrigger>
                </TabsList>
            </Tabs>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-1" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    </AppShell>
);

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const getTabValue = () => {
    if (pathname.startsWith('/admin/dashboard')) return 'dashboard';
    if (pathname.startsWith('/admin/users')) return 'users';
    if (pathname.startsWith('/admin/reconciliations')) return 'reconciliations';
    if (pathname.startsWith('/admin/banks')) return 'banks';
    if (pathname.startsWith('/admin/settings')) return 'settings';
    if (pathname.startsWith('/admin/account')) return 'account';
    return 'dashboard';
  }

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        // Not logged in, redirect to login page
        router.push('/');
      } else if (user.email !== 'admin@example.com') {
        // Logged in, but not the master admin, redirect to user dashboard
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || user.email !== 'admin@example.com') {
    // While loading or if not the correct user, show a skeleton or loading state
    // to prevent flashing content before the redirect happens.
    return <AdminLoadingSkeleton />;
  }

  return (
    <AppShell>
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Admin Panel</h1>
                <p className="text-muted-foreground">Manage users and application data.</p>
            </div>
            <Tabs defaultValue={getTabValue()} className="w-full">
                <TabsList>
                    <TabsTrigger value="dashboard" asChild>
                        <Link href="/admin/dashboard">Dashboard</Link>
                    </TabsTrigger>
                    <TabsTrigger value="users" asChild>
                        <Link href="/admin/users">Users</Link>
                    </TabsTrigger>
                    <TabsTrigger value="reconciliations" asChild>
                        <Link href="/admin/reconciliations">All Reconciliations</Link>
                    </TabsTrigger>
                    <TabsTrigger value="banks" asChild>
                        <Link href="/admin/banks">Banks</Link>
                    </TabsTrigger>
                    <TabsTrigger value="settings" asChild>
                        <Link href="/admin/settings">Settings</Link>
                    </TabsTrigger>
                    <TabsTrigger value="account" asChild>
                        <Link href="/admin/account">My Account</Link>
                    </TabsTrigger>
                </TabsList>
            </Tabs>
            {children}
        </div>
    </AppShell>
  );
}
