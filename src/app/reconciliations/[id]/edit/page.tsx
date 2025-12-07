'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import { ReconciliationForm } from '@/components/reconciliations/reconciliation-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export default function EditReconciliationPage() {
    const params = useParams();
    const id = params.id as string;
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();

    const reconciliationRef = useMemoFirebase(() => {
        if (!user || !id) return null;
        return doc(firestore, `users/${user.uid}/reconciliations`, id);
    }, [user, firestore, id]);

    const { data: reconciliation, isLoading } = useDoc(reconciliationRef);

    return (
        <div className="space-y-8 max-w-5xl mx-auto print-container">
            <div className="flex items-center gap-4 no-print">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/reconciliations">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Edit Reconciliation</h1>
                    <p className="text-muted-foreground">
                        {reconciliation && reconciliation.statementId ? `Update the details for statement #${reconciliation.statementId}.` : `Loading statement details...`}
                    </p>
                </div>
            </div>

            {isLoading || isUserLoading ? (
                 <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-6">
                            <Skeleton className="h-10 w-1/3" />
                            <Skeleton className="h-10 w-1/2" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-40 w-full" />
                        </div>
                    </CardContent>
                 </Card>
            ) : reconciliation ? (
                <ReconciliationForm 
                    isEditMode={true} 
                    defaultValues={reconciliation} 
                    reconciliationId={id}
                />
            ) : (
                <p>Reconciliation not found.</p>
            )}
        </div>
    );
}
