"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Skeleton } from '@/components/ui/skeleton';

const settingsSchema = z.object({
  reportHeading: z.string().min(1, 'Report heading is required.'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'report'), [firestore]);
  const { data: settingsData, isLoading } = useDoc<SettingsFormValues>(settingsRef);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
  });

  useEffect(() => {
    if (settingsData) {
      reset(settingsData);
    }
  }, [settingsData, reset]);

  const onSubmit = (data: SettingsFormValues) => {
    setDocumentNonBlocking(settingsRef, data, { merge: true });
    toast({
      title: 'Settings Saved',
      description: 'The report heading has been updated.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Settings</CardTitle>
        <CardDescription>Manage global settings for the application.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-4">
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-10 w-24" />
            </div>
        ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
                <div className="space-y-2">
                <Label htmlFor="reportHeading">Reconciliation Report Heading</Label>
                <Input
                    id="reportHeading"
                    {...register('reportHeading')}
                />
                {errors.reportHeading && <p className="text-sm text-destructive">{errors.reportHeading.message}</p>}
                </div>
                <Button type="submit">Save Settings</Button>
            </form>
        )}
      </CardContent>
    </Card>
  );
}
