
"use client";

import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Search, Download } from 'lucide-react';
import { ReconciliationsTable } from '@/components/reconciliations/reconciliations-table';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import * as XLSX from 'xlsx';

// --- Type Definitions ---
type Item = {
    narration: string;
    amount: number;
};

type Reconciliation = {
    id: string;
    userId: string;
    statementId: number;
    bankCode: string;
    bankName: string;
    reconciliationDate: string;
    reconciliationMonth: string;
    balanceAsPerBank: number;
    balanceAsPerBook: number;
    additions: Item[];
    deductions: Item[];
    bookAdditions: Item[];
    bookDeductions: Item[];
    totalAdditions: number;
    totalDeductions: number;
    correctedBalance: number;
    totalBookAdditions: number;
    totalBookDeductions: number;
    correctedBookBalance: number;
    difference: number;
    userName?: string;
    userEmail?: string;
};

type UserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
}
// --- End Type Definitions ---


export default function AdminReconciliationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const isAdmin = useMemo(() => user?.email === 'admin@example.com', [user]);

    const usersQuery = useMemoFirebase(() => {
        if (!isAdmin) return null;
        return collection(firestore, 'users');
    }, [firestore, isAdmin]);

    const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
    const [allReconciliations, setAllReconciliations] = useState<Reconciliation[] | null>(null);
    const [reconciliationsLoading, setReconciliationsLoading] = useState(true);

    useEffect(() => {
        if (!allUsers || !isAdmin) {
             if (!usersLoading) {
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

    // Consolidated loading state
    const isLoading = isUserLoading || usersLoading || reconciliationsLoading;

    // Combine Reconciliations with User Data
    const combinedData = useMemo(() => {
        if (isLoading || !allReconciliations || !allUsers) return [];
        
        const usersMap = new Map(allUsers.map(u => [u.id, u]));

        return allReconciliations.map(rec => {
            const userProfile = usersMap.get(rec.userId);
            return {
                ...rec,
                userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Unknown User',
                userEmail: userProfile ? userProfile.email : 'N/A',
            };
        });
    }, [allReconciliations, allUsers, isLoading]);

    // Apply Filtering based on searchTerm
    const filteredData = useMemo(() => {
        if (!searchTerm) return combinedData;
        const lowerCaseSearch = searchTerm.toLowerCase();

        return combinedData.filter(rec =>
            rec.userName?.toLowerCase().includes(lowerCaseSearch) ||
            rec.userEmail?.toLowerCase().includes(lowerCaseSearch) ||
            rec.bankName.toLowerCase().includes(lowerCaseSearch) ||
            rec.reconciliationDate.includes(searchTerm) ||
            rec.statementId.toString().includes(searchTerm)
        );
    }, [combinedData, searchTerm]);


    // Excel Download Function
    const handleDownloadExcel = () => {
        const dataToExport = filteredData; 

        if (!dataToExport || dataToExport.length === 0) {
            alert("No data available to download.");
            return;
        }
        setIsDownloading(true);
    
        try {
            const exportReadyData = dataToExport.map(rec => {
            const serializeItems = (items: Item[]) => {
                if (!items || items.length === 0) return '';
                return items.map(item => `${item.narration}: ${item.amount.toFixed(2)}`).join('; ');
            };
    
            return {
                'User Name': rec.userName,
                'User Email': rec.userEmail,
                'Statement ID': rec.statementId,
                'Bank Name': rec.bankName,
                'Bank Code': rec.bankCode,
                'Reconciliation Date': rec.reconciliationDate,
                'Reconciliation Month': rec.reconciliationMonth,
                'Balance as per Bank': rec.balanceAsPerBank,
                'Balance as per Book': rec.balanceAsPerBook,
                'Corrected Bank Balance': rec.correctedBalance,
                'Corrected Book Balance': rec.correctedBookBalance,
                'Difference': rec.difference,
                'Bank Additions': serializeItems(rec.additions),
                'Bank Deductions': serializeItems(rec.deductions),
                'Book Additions': serializeItems(rec.bookAdditions),
                'Book Deductions': serializeItems(rec.bookDeductions),
            };
            });
    
            const worksheet = XLSX.utils.json_to_sheet(exportReadyData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "All Reconciliations");
    
            // Auto-size columns logic
            const colWidths = Object.keys(exportReadyData[0]).map(key => {
                const maxLength = Math.max(
                    key.length,
                    ...exportReadyData.map(row => (row[key as keyof typeof row] ?? '').toString().length)
                );
                return { wch: maxLength + 2 };
            });
            worksheet['!cols'] = colWidths;
    
            XLSX.writeFile(workbook, "all-reconciliations.xlsx");
    
        } catch (error) {
            console.error("Failed to generate Excel file:", error);
            alert("An error occurred while generating the Excel file.");
        } finally {
            setIsDownloading(false);
        }
    };

    // --- Access Checks ---
    if (isUserLoading) {
        return <div className="text-center p-12">Loading user session...</div>;
    }

    if (!isAdmin) {
        return <div className="text-center p-12 text-red-600">Access Denied: You must be an administrator to view this page.</div>;
    }

    // --- Render Logic ---
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">All User Reconciliations</h1>
                    <p className="text-muted-foreground">Review and manage reconciliation statements from all users.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleDownloadExcel} variant="outline" disabled={isDownloading || isLoading || filteredData.length === 0}>
                        <Download className="mr-2 h-4 w-4" />
                        {isDownloading ? 'Downloading...' : 'Download as Excel'}
                    </Button>
                    <Button asChild>
                        <Link href="/reconciliations/new">
                            <PlusCircle className="mr-2 h-4 w-4" /> New Reconciliation
                        </Link>
                    </Button>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>All Statements</CardTitle>
                    <div className="flex justify-between items-start gap-4">
                        <CardDescription className="flex-1 mt-1">
                            A list of all reconciliation statements across all users. Total: **{isLoading ? '...' : filteredData.length}** records.
                        </CardDescription>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by user, bank, or date..." 
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ReconciliationsTable 
                        reconciliations={filteredData} 
                        isLoading={isLoading}
                        isAdminView={true}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
