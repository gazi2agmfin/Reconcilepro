"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal } from "lucide-react"
import Link from "next/link"
import { useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";

type Reconciliation = {
  id: string;
  userId: string;
  statementId: number;
  bankName: string;
  reconciliationDate: string;
  correctedBalance: number;
  difference: number;
  userName?: string;
  userEmail?: string;
};

export function ReconciliationsTable({ searchTerm, reconciliations, isLoading, isAdminView, showPrint = true }: { searchTerm?: string, reconciliations?: Reconciliation[], isLoading?: boolean, isAdminView?: boolean, showPrint?: boolean }) {
  const firestore = useFirestore();

  const filteredReconciliations = useMemo(() => {
    if (!reconciliations) return [];
    if (!searchTerm) return [...reconciliations].sort((a, b) => (b.statementId || 0) - (a.statementId || 0));

    const lowercasedFilter = searchTerm.toLowerCase();
    const filtered = reconciliations.filter(rec =>
      rec.bankName?.toLowerCase().includes(lowercasedFilter) ||
      rec.reconciliationDate?.toLowerCase().includes(lowercasedFilter) ||
      (rec.statementId && rec.statementId.toString().includes(lowercasedFilter)) ||
      (isAdminView && rec.userName?.toLowerCase().includes(lowercasedFilter)) ||
      (isAdminView && rec.userEmail?.toLowerCase().includes(lowercasedFilter))
    );
    return filtered.sort((a, b) => (b.statementId || 0) - (a.statementId || 0));
  }, [reconciliations, searchTerm, isAdminView]);

  const handleDelete = (rec: Reconciliation) => {
    if (!rec.userId || !rec.id) return;
    const docRef = doc(firestore, 'users', rec.userId, 'reconciliations', rec.id);
    deleteDocumentNonBlocking(docRef);
  };
  
  const handlePrint = (rec: Reconciliation) => {
    const printUrl = `/reconciliations/${rec.id}/edit`;
    const newWindow = window.open(printUrl, '_blank');
    newWindow?.addEventListener('load', () => {
        setTimeout(() => {
            if (newWindow) {
              newWindow.print();
            }
        }, 1000);
    });
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Statement #</TableHead>
          {isAdminView && <TableHead>User</TableHead>}
          <TableHead>Bank</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Corrected Balance</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
            Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    {isAdminView && <TableCell><Skeleton className="h-5 w-32" /></TableCell>}
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-28 mx-auto" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
            ))
        )}
        {!isLoading && filteredReconciliations.map((rec) => (
          <TableRow key={rec.id}>
            <TableCell className="font-medium">{rec.statementId}</TableCell>
            {isAdminView && <TableCell>{rec.userName || 'N/A'}<br/><span className="text-xs text-muted-foreground">{rec.userEmail}</span></TableCell>}
            <TableCell>{rec.bankName}</TableCell>
            <TableCell>{rec.reconciliationDate}</TableCell>
            <TableCell className="text-right">{`${rec.correctedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</TableCell>
            <TableCell className="text-center">
                <Badge variant={rec.difference === 0 ? 'secondary' : 'destructive'}>
                    {rec.difference === 0 ? 'Reconciled' : 'Difference'}
                    {rec.difference !== 0 && ` (${rec.difference < 0 ? '-' : ''}${Math.abs(rec.difference).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link href={`/reconciliations/${rec.id}/edit`}>Edit</Link></DropdownMenuItem>
                  {showPrint && <DropdownMenuItem onClick={() => handlePrint(rec)}>Print</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => handleDelete(rec)} className="text-destructive focus:text-destructive focus:bg-destructive/10">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
         {!isLoading && filteredReconciliations.length === 0 && (
            <TableRow>
                <TableCell colSpan={isAdminView ? 7 : 6} className="h-24 text-center">
                    No reconciliation statements found.
                </TableCell>
            </TableRow>
         )}
      </TableBody>
    </Table>
  )
}
