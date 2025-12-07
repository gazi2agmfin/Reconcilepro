"use client";

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Search, Download } from 'lucide-react';
import { ReconciliationsTable } from '@/components/reconciliations/reconciliations-table';
import { Input } from '@/components/ui/input';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import * as XLSX from 'xlsx';

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
};


export default function ReconciliationsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isDownloading, setIsDownloading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const reconciliationsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/reconciliations`);
      }, [firestore, user]);
    
    const { data: reconciliations, isLoading } = useCollection<Reconciliation>(reconciliationsQuery);

    const handleDownloadExcel = () => {
        if (!reconciliations || reconciliations.length === 0) {
            alert("No data available to download.");
            return;
        }
        setIsDownloading(true);
    
        try {
            const dataToExport = reconciliations.map(rec => {
            const serializeItems = (items: Item[]) => {
                if (!items || items.length === 0) return '';
                return items.map(item => `${item.narration}: ${item.amount.toFixed(2)}`).join('; ');
            };
    
            return {
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
    
            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Reconciliations");
    
            // Auto-size columns
            const colWidths = Object.keys(dataToExport[0]).map(key => {
                const maxLength = Math.max(
                    key.length,
                    ...dataToExport.map(row => (row[key as keyof typeof row] ?? '').toString().length)
                );
                return { wch: maxLength + 2 };
            });
            worksheet['!cols'] = colWidths;
    
            XLSX.writeFile(workbook, "my-reconciliations.xlsx");
    
        } catch (error) {
            console.error("Failed to generate Excel file:", error);
            alert("An error occurred while generating the Excel file.");
        } finally {
            setIsDownloading(false);
        }
      };


    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-headline">Reconciliations</h1>
                    <p className="text-muted-foreground">Manage and review your bank reconciliations.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleDownloadExcel} variant="outline" disabled={isDownloading || isLoading || !reconciliations || reconciliations.length === 0}>
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
                            Here's a list of all your reconciliation statements.
                        </CardDescription>
                        <div className="relative w-full max-w-xs">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by bank name or date..." 
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ReconciliationsTable searchTerm={searchTerm} reconciliations={reconciliations} isLoading={isLoading} />
                </CardContent>
            </Card>
        </div>
    );
}
