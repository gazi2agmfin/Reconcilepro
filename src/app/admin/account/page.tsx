"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { updatePassword, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  email: z.string().email('Invalid email address.'),
  avatarUrl: z.string().url('Please enter a valid URL.').or(z.literal('')),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [firestore, user]);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      avatarUrl: '',
    }
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const avatarUrl = profileForm.watch('avatarUrl');

  useEffect(() => {
    if (user && userDocRef) {
      const getProfile = async () => {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
              const data = docSnap.data();
              profileForm.reset({
                  firstName: data.firstName || '',
                  lastName: data.lastName || '',
                  email: user.email || '',
                  avatarUrl: data.avatarUrl || '',
              });
          } else {
             profileForm.reset({ 
                firstName: '', 
                lastName: '', 
                email: user.email || '',
                avatarUrl: '',
            });
          }
      }
      getProfile();
    }
  }, [user, userDocRef, profileForm]);

  const handleProfileUpdate = async (data: ProfileFormValues) => {
    if (!user || !user.email || !userDocRef) return;
    
    try {
      if (data.email !== user.email) {
        const password = prompt('To change your email, please confirm your password:');
        if (!password) {
            toast({ variant: 'destructive', title: 'Email Change Cancelled', description: 'Password not provided.' });
            return;
        }
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
        await updateEmail(user, data.email);
      }
      
      const profileData = { 
        firstName: data.firstName, 
        lastName: data.lastName, 
        email: data.email,
        avatarUrl: data.avatarUrl
      };
      
      await setDoc(userDocRef, profileData, { merge: true });
      
      toast({ title: 'Profile Updated', description: 'Your account details have been saved.' });
    } catch (error: any) {
        if (error.code === 'permission-denied') {
             const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { email: data.email, firstName: data.firstName, lastName: data.lastName, avatarUrl: data.avatarUrl }
            });
            errorEmitter.emit('permission-error', permissionError);
        } else {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
            profileForm.setValue('email', user.email);
        }
    }
  };

  const handlePasswordUpdate = async (data: PasswordFormValues) => {
    if (!user || !user.email) return;

    try {
        const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        
        toast({ title: 'Password Changed', description: 'Your password has been successfully updated.' });
        passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Password Change Failed', description: error.message });
    }
  };

  if (isUserLoading || !user) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-24" />
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={profileForm.handleSubmit(handleProfileUpdate)}>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information and email address.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={avatarUrl} alt="User Avatar" />
                    <AvatarFallback>{profileForm.getValues('firstName')?.charAt(0)}{profileForm.getValues('lastName')?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                    <Input id="avatarUrl" placeholder="https://example.com/image.png" {...profileForm.register('avatarUrl')} />
                    {profileForm.formState.errors.avatarUrl && <p className="text-sm text-destructive">{profileForm.formState.errors.avatarUrl.message}</p>}
                </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...profileForm.register('firstName')} />
                    {profileForm.formState.errors.firstName && <p className="text-sm text-destructive">{profileForm.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...profileForm.register('lastName')} />
                     {profileForm.formState.errors.lastName && <p className="text-sm text-destructive">{profileForm.formState.errors.lastName.message}</p>}
                </div>
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" {...profileForm.register('email')} />
                 {profileForm.formState.errors.email && <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>}
             </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
                {profileForm.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <Card>
        <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)}>
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your password here. Use a strong, unique password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" {...passwordForm.register('currentPassword')} />
                    {passwordForm.formState.errors.currentPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.currentPassword.message}</p>}
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" {...passwordForm.register('newPassword')} />
                        {passwordForm.formState.errors.newPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.newPassword.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input id="confirmPassword" type="password" {...passwordForm.register('confirmPassword')} />
                        {passwordForm.formState.errors.confirmPassword && <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>}
                    </div>
                 </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
                    {passwordForm.formState.isSubmitting ? 'Changing...' : 'Change Password'}
                </Button>
            </CardFooter>
        </form>
      </Card>
    </div>
  );
}
