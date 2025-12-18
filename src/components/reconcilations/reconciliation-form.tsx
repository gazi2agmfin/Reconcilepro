"use client";

import { useForm, useFieldArray, Controller, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, ChevronsUpDown, FileDown, Save, Plus } from "lucide-react";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* ----------------------------- SCHEMA ----------------------------- */

const itemSchema = z.object({
  narration: z.string().optional(),
  amount: z.coerce.number().optional(),
});

const reconciliationSchema = z.object({
  bankCode: z.string().min(1),
  bankName: z.string().optional(),
  reconciliationDate: z.string().min(1),
  balanceAsPerBank: z.coerce.number().optional(),
  additions: z.array(itemSchema).optional(),
  deductions: z.array(itemSchema).optional(),
  bookAdditions: z.array(itemSchema).optional(),
  bookDeductions: z.array(itemSchema).optional(),
  balanceAsPerBook: z.coerce.number().optional(),
});

export type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;

export type Item = {
  narration?: string;
  amount?: number;
};

/* ------------------------ DYNAMIC ITEM LIST ------------------------ */

interface DynamicListProps {
  control: Control<ReconciliationFormValues>;
  name: "additions" | "deductions" | "bookAdditions" | "bookDeductions";
  label: string;
  title: string;
}

const DynamicItemList = ({ control, name, label, title }: DynamicListProps) => {
  const { fields, append, remove, insert } = useFieldArray({ control, name });

  return (
    <div className="space-y-3">
      <div className="flex justify-between border-b pb-2">
        <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500">{title}</h3>
        <Button type="button" size="sm" variant="outline" onClick={() => append({ narration: "", amount: 0 })}>
          <PlusCircle className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <p className="text-[10px] italic text-muted-foreground">{label}</p>

      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <Controller
            control={control}
            name={`${name}.${index}.narration`}
            render={({ field }) => <Textarea {...field} className="min-h-[38px]" placeholder="Narration" />}
          />
          <Controller
            control={control}
            name={`${name}.${index}.amount`}
            render={({ field }) => <Input type="number" step="0.01" {...field} className="w-24 text-right" />}
          />
          <div className="flex flex-col gap-1">
            <Button type="button" size="icon" onClick={() => insert(index + 1, { narration: "", amount: 0 })}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button type="button" size="icon" variant="destructive" onClick={() => remove(index)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

/* -------------------------- CALCULATIONS --------------------------- */

const calculateTotal = (items?: Item[]) =>
  (items ?? []).reduce((sum, item) => sum + (item.amount ?? 0), 0);

const SummaryCalculation = ({ control, reportHeading }: { control: Control<ReconciliationFormValues>; reportHeading?: string }) => {
  const values = useWatch({ control });

  const balBank = values.balanceAsPerBank ?? 0;
  const balBook = values.balanceAsPerBook ?? 0;

  const tBankAdd = calculateTotal(values.additions);
  const tBankDed = calculateTotal(values.deductions);
  const tBookAdd = calculateTotal(values.bookAdditions);
  const tBookDed = calculateTotal(values.bookDeductions);

  const cBank = balBank + tBankAdd - tBankDed;
  const cBook = balBook + tBookAdd - tBookDed;
  const diff = cBank - cBook;

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card className="bg-white shadow-none">
      <CardContent className="p-8 space-y-4 text-sm">
        <h2 className="text-center font-bold text-lg uppercase">{reportHeading}</h2>
        <p className="text-center font-semibold">Bank Reconciliation Statement</p>

        <div className="flex justify-between font-bold">
          <span>Corrected Bank Balance</span>
          <span>{fmt(cBank)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Corrected Ledger Balance</span>
          <span>{fmt(cBook)}</span>
        </div>
        <div className={cn("mt-4 p-3 font-bold text-center", Math.abs(diff) < 0.01 ? "bg-green-100" : "bg-red-100")}>
          Difference: {fmt(diff)}
        </div>
      </CardContent>
    </Card>
  );
};

/* ------------------------------ MAIN ------------------------------- */

export function ReconciliationForm({ isEditMode = false, defaultValues, reconciliationId }: any) {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues,
  });

  const onSubmit = (data: ReconciliationFormValues) => {
    if (!user) return;
    const path = `users/${user.uid}/reconciliations`;
    const payload = { ...data, userId: user.uid, updatedAt: serverTimestamp() };

    isEditMode && reconciliationId
      ? updateDocumentNonBlocking(doc(firestore, path, reconciliationId), payload)
      : addDocumentNonBlocking(collection(firestore, path), { ...payload, createdAt: serverTimestamp() });

    toast({ title: "Saved successfully" });
    router.push("/reconciliations");
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const pdf = new jsPDF("p", "mm", "a4");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save("reconciliation.pdf");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl mx-auto">
        <DynamicItemList control={form.control} name="additions" title="Bank Additions" label="" />
        <DynamicItemList control={form.control} name="deductions" title="Bank Deductions" label="" />
        <DynamicItemList control={form.control} name="bookAdditions" title="Ledger Additions" label="" />
        <DynamicItemList control={form.control} name="bookDeductions" title="Ledger Deductions" label="" />

        <div ref={printRef}>
          <SummaryCalculation control={form.control} reportHeading="Reconciliation Report" />
        </div>

        <div className="flex justify-center gap-4">
          <Button type="button" variant="outline" onClick={handleDownloadPdf}><FileDown className="mr-2 h-4 w-4" /> PDF</Button>
          <Button type="submit"><Save className="mr-2 h-4 w-4" /> Save</Button>
        </div>
      </form>
    </Form>
  );
}
