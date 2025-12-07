
"use client"
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Files,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const ReconcileProIcon = () => (
    <div className="p-2 bg-primary rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5V10H2V6.5Z"/><path d="M2 14h20v3.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5V14Z"/><path d="M11 10.5 8 7h8l-3 3.5"/><path d="m7 14 3 3.5 4-3.5"/></svg>
    </div>
);


export function SiteSidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/reconciliations", label: "Reconciliations", icon: Files },
    { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
  ];

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
  
  const getAvatarFallback = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    }
    if (firstName) {
        return firstName.charAt(0);
    }
    if (user?.email) {
        return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.adminOnly) return true;
    return user?.email === 'admin@example.com';
  });

  const isLoading = isUserLoading || (user && isProfileLoading);

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2" >
            <ReconcileProIcon />
            <h1 className="text-xl font-bold font-headline text-sidebar-foreground whitespace-nowrap">ReconcilePro</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)} variant="default" tooltip={item.label}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2 bg-sidebar-border" />
        <div className="flex items-center gap-3 px-2 py-2">
            {isLoading ? (
                <>
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </>
            ) : user ? (
                <>
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={userProfile?.avatarUrl} alt="User avatar" data-ai-hint="person face" />
                        <AvatarFallback>{getAvatarFallback(userProfile?.firstName, userProfile?.lastName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col whitespace-nowrap overflow-hidden">
                        <span className="font-semibold text-sidebar-foreground truncate">{`${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim() || 'User'}</span>
                        <span className="text-xs text-sidebar-foreground/70 truncate">{user.email}</span>
                    </div>
                </>
            ) : null }
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton asChild variant="default" tooltip="Settings">
                <Link href="/admin/account">
                  <Settings />
                  <span>Settings</span>
                </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
              <SidebarMenuButton onClick={handleLogout} variant="default" tooltip="Logout">
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
