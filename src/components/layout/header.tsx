"use client"

import { useState, useEffect } from "react"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import Link from 'next/link';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { doc } from "firebase/firestore"

export function SiteHeader() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (isUserLoading || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user, isUserLoading]);

  const { data: userProfile } = useDoc(userDocRef);

  const [latestDifference, setLatestDifference] = useState<number | null>(null);
  const [differencesLoading, setDifferencesLoading] = useState(true);
  const [draftDifference, setDraftDifference] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(() => {
    try {
      return localStorage.getItem('dashboard:selectedMonth');
    } catch (e) {
      return null;
    }
  });
  const [currentRecId, setCurrentRecId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('reconciliation:currentId');
    } catch (e) {
      return null;
    }
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch (error: any) {
      console.error("Logout Error:", error);
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  const getAvatarFallback = () => {
    if (userProfile?.firstName && userProfile?.lastName) {
        return `${userProfile.firstName.charAt(0)}${userProfile.lastName.charAt(0)}`;
    }
    if (userProfile?.firstName) {
        return userProfile.firstName.charAt(0);
    }
    if (user?.email) {
        return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  useEffect(() => {
    // Listen for dashboard month change events from the same window and update local state
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as string | undefined;
        setSelectedMonth(detail ?? null);
      } catch (err) {
        setSelectedMonth(null);
      }
    };
    window.addEventListener('dashboard:selectedMonthChanged', handler as EventListener);
    const openHandler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as string | undefined;
        setCurrentRecId(detail ?? null);
      } catch (err) {
        setCurrentRecId(null);
      }
    };
    const closeHandler = () => setCurrentRecId(null);
    window.addEventListener('reconciliation:opened', openHandler as EventListener);
    window.addEventListener('reconciliation:closed', closeHandler as EventListener);
    return () => window.removeEventListener('dashboard:selectedMonthChanged', handler as EventListener);
    // cleanup for reconciliation events
    // Note: we intentionally don't remove openHandler/closeHandler here because return only runs once; adjust below
  }, []);

  // Listen for difference draft events dispatched by the reconciliation form (for live drafts)
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const val = (e as CustomEvent).detail as number | undefined;
        setDraftDifference(typeof val === 'number' ? val : null);
      } catch (err) {
        setDraftDifference(null);
      }
    };
    const clearHandler = () => setDraftDifference(null);
    window.addEventListener('reconciliation:differenceDraft', handler as EventListener);
    window.addEventListener('reconciliation:differenceDraftCleared', clearHandler as EventListener);
    return () => {
      window.removeEventListener('reconciliation:differenceDraft', handler as EventListener);
      window.removeEventListener('reconciliation:differenceDraftCleared', clearHandler as EventListener);
    };
  }, []);

  // separate cleanup for reconciliation event listeners (ensure both removed)
  useEffect(() => {
    const openHandler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as string | undefined;
        setCurrentRecId(detail ?? null);
      } catch (err) {
        setCurrentRecId(null);
      }
    };
    const closeHandler = () => setCurrentRecId(null);
    window.addEventListener('reconciliation:opened', openHandler as EventListener);
    window.addEventListener('reconciliation:closed', closeHandler as EventListener);
    return () => {
      window.removeEventListener('reconciliation:opened', openHandler as EventListener);
      window.removeEventListener('reconciliation:closed', closeHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setLatestDifference(null);
      setDifferencesLoading(false);
      return;
    }

    setDifferencesLoading(true);

    // If a reconciliation is currently open, subscribe to that doc directly
    if (currentRecId) {
      const docRef = doc(firestore, `users/${user.uid}/reconciliations`, currentRecId);
      const unsubscribeDoc = onSnapshot(docRef as any, (snap: any) => {
        const data = typeof snap.exists === 'function' ? (snap.exists() ? (snap.data() as any) : null) : (snap.data ? snap.data() as any : null);
        setLatestDifference(data && typeof data.difference === 'number' ? data.difference : null);
        setDifferencesLoading(false);
      }, (err: any) => {
        console.warn('onSnapshot (doc) error for header badge:', err);
        setLatestDifference(null);
        setDifferencesLoading(false);
      });

      return () => unsubscribeDoc();
    }

    // Otherwise, subscribe to the most recent reconciliation for the selected month or overall
    const baseRef = collection(firestore, `users/${user.uid}/reconciliations`);

    let q;
    if (selectedMonth) {
      const [yStr, mStr] = selectedMonth.split('-');
      const year = Number(yStr);
      const month = Number(mStr);
      const start = `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
      const endDay = new Date(year, month, 0).getDate();
      const end = `${year.toString().padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
      q = query(baseRef, where('reconciliationDate', '>=', start), where('reconciliationDate', '<=', end), orderBy('reconciliationDate', 'desc'), limit(1));
    } else {
      q = query(baseRef, orderBy('reconciliationDate', 'desc'), limit(1));
    }

    const unsubscribe = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setLatestDifference(null);
      } else {
        const d = snap.docs[0];
        const data = d.data() as any;
        setLatestDifference(typeof data.difference === 'number' ? data.difference : null);
      }
      setDifferencesLoading(false);
    }, (err) => {
      console.warn('onSnapshot error for header badge:', err);
      setLatestDifference(null);
      setDifferencesLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, user, selectedMonth, currentRecId]);

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 print:sticky print:top-0 print:z-50">
          <div className="md:hidden">
              <SidebarTrigger />
          </div>
          <div className="w-full flex-1">
            {/* Future search bar can go here */}
          </div>
          <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-5 w-5" />
                  <span className="sr-only">Toggle notifications</span>
              </Button>
              {
                // Render the badge to the right of the bell button so it doesn't shift the icon.
                (() => {
                  const displayed = draftDifference !== null ? draftDifference : latestDifference;
                  const isLoading = draftDifference === null ? differencesLoading : false;
                  if (displayed === null) return null;
                  const formatted = isLoading ? '…' : (displayed >= 0 ? '+' : '-') + Math.abs(displayed).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                  return (
                    <span className="ml-2" title={isLoading ? 'Difference: …' : `Difference: ${formatted}`}>
                      <Badge variant={displayed === 0 ? 'default' : 'destructive'}>
                        {formatted}
                      </Badge>
                    </span>
                  );
                })()
              }
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full">
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={userProfile?.avatarUrl} alt="User avatar" />
                              <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                          </Avatar>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin/account">Profile Settings</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
      </header>
    </>
  )
}
