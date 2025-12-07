
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogClose,
  } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, PlusCircle, Trash2, Download } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useCollection, useFirestore, useMemoFirebase, useAuth, useUser } from '@/firebase';
import { collection, getCountFromServer, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { handleDeleteUserAction, handleDeleteAllUsersAction, handleSetUserPasswordAction } from './actions';
import * as XLSX from 'xlsx';

type UserProfile = {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
    name: string;
    statements: number;
};

export default function AdminUsersPage() {
    const firestore = useFirestore();
    const auth = useAuth();
    const { user: adminUser } = useUser();
    const { toast } = useToast();
    const isAdmin = adminUser?.email === 'admin@example.com';
    
    const usersCollectionRef = useMemoFirebase(() => {
        if (!isAdmin) return null;
        return collection(firestore, 'users');
    }, [firestore, isAdmin]);

    const { data: users, isLoading: usersLoading } = useCollection(usersCollectionRef);

    const [userStatements, setUserStatements] = useState<Record<string, number>>({});
    const [countsLoading, setCountsLoading] = useState(true);
    const [isCreateUserDialogOpen, setCreateUserDialogOpen] = useState(false);
    const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '' });
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [isSetPasswordDialogOpen, setSetPasswordDialogOpen] = useState(false);
    const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
    const [newTemporaryPassword, setNewTemporaryPassword] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
    const [deletingUserEmail, setDeletingUserEmail] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<any>(null);
    const [isDeleteErrorDialogOpen, setDeleteErrorDialogOpen] = useState(false);


    const fetchCounts = useCallback(async () => {
        if (!users || users.length === 0 || !isAdmin) {
            setCountsLoading(false);
            return;
        }

        setCountsLoading(true);
        const counts: Record<string, number> = {};
        const promises = users.map(async (user) => {
            try {
                const reconciliationsRef = collection(firestore, 'users', user.id, 'reconciliations');
                const snapshot = await getCountFromServer(reconciliationsRef);
                counts[user.id] = snapshot.data().count;
            } catch (error) {
                console.warn(`Could not count statements for user ${user.id}:`, error);
                counts[user.id] = 0; // Set to 0 on failure
            }
        });

        await Promise.all(promises);
        setUserStatements(counts);
        setCountsLoading(false);

    }, [users, firestore, isAdmin]);


    useEffect(() => {
        fetchCounts();
    }, [users, fetchCounts]);

    const usersWithStatements = useMemo(() => {
        if (!users) return [];
        return users.map(user => ({
            ...user,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No Name',
            statements: userStatements[user.id] ?? 0,
        }));
    }, [users, userStatements]);

    const handleCreateUser = async () => {
        if (!newUser.email || !newUser.firstName || !newUser.lastName) {
            toast({ variant: 'destructive', title: 'Error', description: 'All fields are required.' });
            return;
        }

        const password = Math.random().toString(36).slice(-8);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, password);
            const user = userCredential.user;
            const userProfile = {
                id: user.uid,
                email: newUser.email,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
            };

            const userDocRef = doc(firestore, "users", user.uid);
            
            await setDoc(userDocRef, userProfile);

            setGeneratedPassword(password);
            toast({ title: 'User Created', description: `${newUser.email} has been created.` });

        } catch (error: any) {
            if (error.code?.startsWith('auth/')) {
                toast({ variant: 'destructive', title: 'Authentication Error', description: error.message });
            } else {
                const userDocRef = doc(firestore, "users", "new-user-placeholder-id"); // Use a placeholder path
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: { email: newUser.email, firstName: newUser.firstName, lastName: newUser.lastName }
                });
                errorEmitter.emit('permission-error', permissionError);
            }
        }
    };
    
    const handlePasswordReset = async (email: string) => {
        if (!email) {
          toast({
            variant: "destructive",
            title: "Email not found",
            description: "Cannot send password reset to an empty email.",
          });
          return;
        }
        try {
          await sendPasswordResetEmail(auth, email);
          toast({
            title: "Password Reset Email Sent",
            description: `A password reset link has been sent to ${email}.`,
          });
        } catch (error: any) {
          console.error("Password Reset Error:", error);
          toast({
            variant: "destructive",
            title: "Error Sending Email",
            description: error.message || "Could not send password reset email.",
          });
        }
    };

    const openSetPasswordDialog = (user: UserProfile) => {
        setSelectedUserForPassword(user);
        setNewTemporaryPassword('');
        setSetPasswordDialogOpen(true);
    };

    const handleSetPassword = async () => {
        if (!selectedUserForPassword) return;

        toast({ title: "Setting Password...", description: `Please wait.` });
        const result = await handleSetUserPasswordAction(selectedUserForPassword.id);
        if (result.success && result.newPassword) {
            setNewTemporaryPassword(result.newPassword);
            toast({ title: "Password Set", description: `A new temporary password has been generated.` });
        } else {
            toast({ variant: "destructive", title: "Failed to Set Password", description: result.message });
        }
    };

    const handleDeleteUser = async (userId: string, userEmail: string) => {
        setDeletingUserId(userId);
        setDeletingUserEmail(userEmail);
        setDeleteError(null);
        toast({ title: 'Deleting User...', description: `Removing ${userEmail}. Please wait.` });
        try {
                    // Use API route instead of Server Action to avoid invalid Server Actions request
                    const resp = await fetch('/api/admin/delete-user', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId }),
                    });
                    const result = await resp.json();
                    if (resp.ok && result.success) {
                        toast({
                            title: "User Deleted",
                            description: `${userEmail} has been permanently removed.`,
                        });
                        // clear any deleting state
                        setDeletingUserId(null);
                        setDeletingUserEmail(null);
                    } else {
                        const msg = result?.message || `Failed to delete user (status ${resp.status})`;
                        throw new Error(msg);
                    }
        } catch (error: any) {
            console.error("User Deletion Error:", error);
            // store error and present a dialog with more context and retry option
            setDeleteError(error);
            setDeleteErrorDialogOpen(true);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: error?.message || "Could not delete the user.",
            });
        }
    };
    
    const handleDeleteAllUsers = async () => {
        if (!usersWithStatements || usersWithStatements.length === 0) {
            toast({ variant: 'destructive', title: 'No Users', description: 'There are no users to delete.' });
            return;
        }
        
        toast({ title: 'Deleting All Users...', description: `This may take a moment. Please do not navigate away.` });
        
        try {
            const result = await handleDeleteAllUsersAction(usersWithStatements.map(u => u.id));
            if (result.success) {
                toast({
                    title: "All Users Deleted",
                    description: "All user accounts and their data have been permanently removed.",
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Error Deleting All Users:", error);
            toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "An error occurred while deleting all users. Some users may not have been removed.",
            });
        }
    };

    const handleExportAll = () => {
        if (!usersWithStatements || usersWithStatements.length === 0) {
            toast({ variant: 'destructive', title: 'No Users', description: 'There are no users to export.' });
            return;
        }

        setIsExporting(true);
        toast({ title: 'Exporting...', description: 'Generating Excel file...' });

        try {
            const dataToExport = usersWithStatements.map(user => ({
                'First Name': user.firstName,
                'Last Name': user.lastName,
                'Email': user.email,
                'Statements': user.statements,
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

            // Auto-size columns
            const colWidths = Object.keys(dataToExport[0]).map(key => {
                const maxLength = Math.max(
                    key.length,
                    ...dataToExport.map(row => (row[key as keyof typeof row] ?? '').toString().length)
                );
                return { wch: maxLength + 2 };
            });
            worksheet['!cols'] = colWidths;
            
            XLSX.writeFile(workbook, 'all-users.xlsx');
            toast({ title: 'Export Successful', description: 'User data has been downloaded.' });
        } catch (error) {
            console.error('Export Error:', error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'An error occurred while generating the Excel file.' });
        } finally {
            setIsExporting(false);
        }
    };


    const openCreateUserDialog = () => {
        setNewUser({ firstName: '', lastName: '', email: '' });
        setGeneratedPassword('');
        setCreateUserDialogOpen(true);
    };


    const isLoading = usersLoading || countsLoading;

    return (
        <>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>View, edit, or remove user accounts.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportAll} disabled={isLoading || isExporting}>
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? 'Exporting...' : 'Export as Excel'}
                    </Button>
                    <Button onClick={openCreateUserDialog}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create User
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={!users || users.length === 0}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete All
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all {users?.length} user(s) and all of their associated data.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAllUsers}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete All Users
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-center">Statements</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-10 w-10 rounded-full" />
                                        <div>
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-32 mt-1" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                            </TableRow>
                        ))}
                        {!isLoading && usersWithStatements.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/40/40`} />
                                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="font-medium">{user.name}</div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm text-muted-foreground">{user.email}</div>
                                </TableCell>
                                <TableCell className="text-center">{user.statements}</TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/admin/users/${user.id}/dashboard`}>View Dashboard</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => handlePasswordReset(user.email)}>Send Reset Email</DropdownMenuItem>
                                            <DropdownMenuItem onSelect={() => openSetPasswordDialog(user)}>Set Temporary Password</DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                             <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:text-destructive">
                                                        Delete User
                                                    </div>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the user <span className="font-bold">{user.name} ({user.email})</span> and all of their data.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteUser(user.id, user.email)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                         {!isLoading && usersWithStatements.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Dialog open={isCreateUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                        Fill in the details to create a new user account.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" value={newUser.firstName} onChange={(e) => setNewUser({...newUser, firstName: e.target.value})} disabled={!!generatedPassword} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" value={newUser.lastName} onChange={(e) => setNewUser({...newUser, lastName: e.target.value})} disabled={!!generatedPassword} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} disabled={!!generatedPassword} />
                    </div>
                    {generatedPassword && (
                        <div className="space-y-2 rounded-md border bg-muted p-4">
                            <Label>Temporary Password</Label>
                            <p className="text-sm text-muted-foreground">Please copy this password and share it securely with the user.</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Input value={generatedPassword} readOnly className="font-mono"/>
                                <Button size="sm" onClick={() => navigator.clipboard.writeText(generatedPassword)}>Copy</Button>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    {!generatedPassword && <Button onClick={handleCreateUser}>Create</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isSetPasswordDialogOpen} onOpenChange={setSetPasswordDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Set Temporary Password</DialogTitle>
                    <DialogDescription>
                        Generate a new temporary password for <span className="font-bold">{selectedUserForPassword?.email}</span>.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {newTemporaryPassword ? (
                         <div className="space-y-2 rounded-md border bg-muted p-4">
                            <Label>New Temporary Password</Label>
                            <p className="text-sm text-muted-foreground">Please copy this password and share it securely with the user.</p>
                            <div className="flex items-center gap-2 mt-2">
                                <Input value={newTemporaryPassword} readOnly className="font-mono"/>
                                <Button size="sm" onClick={() => navigator.clipboard.writeText(newTemporaryPassword)}>Copy</Button>
                            </div>
                        </div>
                    ) : (
                        <p>Click the button below to generate a new password.</p>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                    {!newTemporaryPassword && <Button onClick={handleSetPassword}>Generate Password</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
        {/* Delete Error Dialog: shows detailed error and allows retry/copy */}
        <Dialog open={isDeleteErrorDialogOpen} onOpenChange={setDeleteErrorDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Could not delete user</DialogTitle>
                    <DialogDescription>
                        We were unable to delete <span className="font-bold">{deletingUserEmail}</span>. You can retry or copy the error details to share with support.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <pre className="max-h-48 overflow-auto rounded bg-muted p-2 text-xs">{deleteError?.message || String(deleteError) || 'Unknown error'}</pre>
                    {deleteError?.stack && (
                        <details className="mt-2 text-xs text-muted-foreground">
                            <summary>View stack trace</summary>
                            <pre className="whitespace-pre-wrap mt-2">{deleteError.stack}</pre>
                        </details>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                    <Button
                        onClick={() => {
                            // retry delete
                            setDeleteError(null);
                            setDeleteErrorDialogOpen(false);
                            if (deletingUserId && deletingUserEmail) {
                                handleDeleteUser(deletingUserId, deletingUserEmail);
                            }
                        }}
                    >
                        Retry
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => {
                            const details = deleteError?.stack || deleteError?.message || String(deleteError) || '';
                            try {
                                navigator.clipboard.writeText(details);
                                toast({ title: 'Copied', description: 'Error details copied to clipboard.' });
                            } catch (e) {
                                console.warn('Clipboard copy failed', e);
                            }
                        }}
                    >
                        Copy Details
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );

    
}

    