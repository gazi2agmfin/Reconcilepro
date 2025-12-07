"use client"

import { useState } from "react"
import {
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
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

  return (
    <>
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
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
