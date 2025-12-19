"use client";

import { useForm, useFieldArray, Controller, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4469e0c (message)
import { PlusCircle, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
<<<<<<< HEAD
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/* ----------------------------- SCHEMA ----------------------------- */

const itemSchema = z.object({
  narration: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0, "Must be positive"),
});

const schema = z.object({
  balanceAsPerBank: z.coerce.number(),
  balanceAsPerBook: z.coerce.number(),
  additions: z.array(itemSchema),
  deductions: z.array(itemSchema),
  bookAdditions: z.array(itemSchema),
  bookDeductions: z.array(itemSchema),
});

type FormValues = z.infer<typeof schema>;

/* ------------------------ DYNAMIC LIST COMPONENT ----------------------------- */

function DynamicItemList({ 
  control, 
  name, 
  title, 
  label 
}: { 
  control: Control<FormValues>; 
  name: "additions" | "deductions" | "bookAdditions" | "bookDeductions"; 
  title: string; 
  label: string; 
}) {
  const { fields, append, remove } = useFieldArray({ control, name });
=======
import { Form, FormField, FormItem, FormLabel } from "@/components/ui/form";
=======
=======
>>>>>>> 4469e0c (message)
import {
  Form,
  FormField,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
<<<<<<< HEAD
>>>>>>> 89d01bd (message)
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp } from "firebase/firestore";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
=======
>>>>>>> 4469e0c (message)

/* ----------------------------- SCHEMA ----------------------------- */

const itemSchema = z.object({
  narration: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0, "Must be positive"),
});

const schema = z.object({
  balanceAsPerBank: z.coerce.number(),
  balanceAsPerBook: z.coerce.number(),
  additions: z.array(itemSchema),
  deductions: z.array(itemSchema),
  bookAdditions: z.array(itemSchema),
  bookDeductions: z.array(itemSchema),
});

type FormValues = z.infer<typeof schema>;

/* ------------------------ DYNAMIC LIST COMPONENT ----------------------------- */

<<<<<<< HEAD
const DynamicItemList = ({
  control,
  name,
  label,
  title,
}: {
  control: any;
  name: "additions" | "deductions" | "bookAdditions" | "bookDeductions";
  label: string;
  title: string;
<<<<<<< HEAD
}
>>>>>>> 4fcfa8d (message)
=======
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });
>>>>>>> 89d01bd (message)

  return (
<<<<<<< HEAD
<<<<<<< HEAD
=======
function DynamicItemList({ 
  control, 
  name, 
  title, 
  label 
}: { 
  control: Control<FormValues>; 
  name: "additions" | "deductions" | "bookAdditions" | "bookDeductions"; 
  title: string; 
  label: string; 
}) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
>>>>>>> 4469e0c (message)
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
<<<<<<< HEAD
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <span className="w-5 pt-2 text-xs font-bold text-slate-400">{index + 1}.</span>
            
            <div className="flex-1">
              <Controller
                control={control}
                name={`${name}.${index}.narration`}
                render={({ field }) => (
                  <Textarea {...field} placeholder="Description" className="min-h-[38px] text-sm" />
                )}
              />
            </div>

            <div className="w-28">
              <Controller
                control={control}
                name={`${name}.${index}.amount`}
                render={({ field }) => (
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="0.00" 
                    className="text-right text-sm" 
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                )}
              />
            </div>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-emerald-600"
                onClick={() => append({ narration: "", amount: 0 })}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-rose-500"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- MAIN PAGE ---------------------------- */

export default function ReconciliationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      balanceAsPerBank: 0,
      balanceAsPerBook: 0,
      additions: [{ narration: "", amount: 0 }],
      deductions: [{ narration: "", amount: 0 }],
      bookAdditions: [{ narration: "", amount: 0 }],
      bookDeductions: [{ narration: "", amount: 0 }],
    },
  });

  const { control, handleSubmit } = form;
  const values = useWatch({ control });

  // Error-safe sum helper
  const sum = (arr: any[] = []) => 
    arr.reduce((t, i) => t + (Number(i?.amount) || 0), 0);

  const correctedBank = (Number(values.balanceAsPerBank) || 0) + sum(values.additions) - sum(values.deductions);
  const correctedBook = (Number(values.balanceAsPerBook) || 0) + sum(values.bookAdditions) - sum(values.bookDeductions);
  const diff = correctedBank - correctedBook;

  /* EXCEL EXPORT LOGIC (Safe from .toFixed errors) */
  const downloadExcel = () => {
    const formatRow = (item: any) => ({
      Description: item.narration || "N/A",
      // CRITICAL FIX: Ensure it is a Number before calling toFixed
      Amount: Number(item.amount || 0).toFixed(2)
    });

    const workbook = XLSX.utils.book_new();

    // Create a flat array for the main reconciliation sheet
    const summaryData = [
      ["Bank Reconciliation Statement"],
      ["Generated on", new Date().toLocaleDateString()],
      [],
      ["BANK SIDE"],
      ["Balance as per Bank Statement", Number(values.balanceAsPerBank || 0).toFixed(2)],
      ["Add: Additions", sum(values.additions).toFixed(2)],
      ["Less: Deductions", `(${sum(values.deductions).toFixed(2)})`],
      ["Adjusted Bank Balance", correctedBank.toFixed(2)],
      [],
      ["BOOK SIDE"],
      ["Balance as per General Ledger", Number(values.balanceAsPerBook || 0).toFixed(2)],
      ["Add: Book Additions", sum(values.bookAdditions).toFixed(2)],
      ["Less: Book Deductions", `(${sum(values.bookDeductions).toFixed(2)})`],
      ["Adjusted Book Balance", correctedBook.toFixed(2)],
      [],
      ["Net Difference", diff.toFixed(2)]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");

    // Breakdown Sheets
    const details = [
      { name: "Bank Additions", data: values.additions },
      { name: "Bank Deductions", data: values.deductions },
      { name: "Book Additions", data: values.bookAdditions },
      { name: "Book Deductions", data: values.bookDeductions }
    ];

    details.forEach(section => {
      const ws = XLSX.utils.json_to_sheet(section.data?.map(formatRow) || []);
      XLSX.utils.book_append_sheet(workbook, ws, section.name);
    });

    XLSX.writeFile(workbook, `Reconciliation_${new Date().getTime()}.xlsx`);
=======
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-600">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ narration: "", amount: 0 })} className="h-7 text-[10px]">
          <PlusCircle className="mr-1 h-3 w-3" /> ADD ROW
=======
    <div className="space-y-2">
      <div className="flex items-center no-print">
        <h3 className="font-semibold text-lg flex-1">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ narration: "", amount: 0 })}
          className="no-print"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Item
>>>>>>> 89d01bd (message)
        </Button>
      </div>
      <p className="font-semibold print:font-normal">{label}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-4 items-start">
          <Controller
            control={control}
            name={`${name}.${index}.narration`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <Textarea placeholder="Enter narration..." {...field} className="print:hidden"/>
                <span className="hidden print:inline">{field.value}</span>
              </FormItem>
            )}
          />
          <Controller
            control={control}
            name={`${name}.${index}.amount`}
            render={({ field }) => (
              <FormItem>
                <Input
                  type="number"
                  step="0.00"
                  placeholder="0.00"
                  className="w-40 text-right"
                  {...field}
                />
              </FormItem>
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => remove(index)}
            className="no-print"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

const SummaryCalculation = ({ control, reportHeading, isEditMode }: { control: any, reportHeading?: string, isEditMode?: boolean }) => {
  const formValues = useWatch({ control });

  // Bank side calculations
  const totalBankAdditions = useMemo(() => (formValues.additions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0), [formValues.additions]);
  const totalBankDeductions = useMemo(() => (formValues.deductions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0), [formValues.deductions]);
  const correctedBankBalance = useMemo(() => (Number(formValues.balanceAsPerBank) || 0) + totalBankAdditions - totalBankDeductions, [formValues.balanceAsPerBank, totalBankAdditions, totalBankDeductions]);

  // Book side calculations
  const totalBookAdditions = useMemo(() => (formValues.bookAdditions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0), [formValues.bookAdditions]);
  const totalBookDeductions = useMemo(() => (formValues.bookDeductions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0), [formValues.bookDeductions]);
  const correctedBookBalance = useMemo(() => (Number(formValues.balanceAsPerBook) || 0) + totalBookAdditions - totalBookDeductions, [formValues.balanceAsPerBook, totalBookAdditions, totalBookDeductions]);

  const difference = useMemo(() => correctedBankBalance - correctedBookBalance, [correctedBankBalance, correctedBookBalance]);

  useEffect(() => {
    // Only notify header for draft (new) reconciliations, not when editing existing ones
    if (isEditMode) {
      try { window.dispatchEvent(new CustomEvent('reconciliation:differenceDraftCleared')); } catch (e) {}
      return;
    }

    try {
      window.dispatchEvent(new CustomEvent('reconciliation:differenceDraft', { detail: difference }));
    } catch (e) {
      // ignore in non-browser contexts
    }

    return () => {
      try { window.dispatchEvent(new CustomEvent('reconciliation:differenceDraftCleared')); } catch (e) {}
    };
  }, [difference, isEditMode]);


  return (
    <Card className="print-section !shadow-none !border-0">
        <CardContent className="space-y-4 !p-0">

        {/* Print Header */}
        <div className="hidden print:block text-center mb-8">
            <p className="text-xs">BREB FORM NO.285</p>
            <h2 className="text-xl font-bold">{reportHeading || 'Gazipur Palli Bidyut Samity-2'}</h2>
            <p>Rajendrapur,Gazipur</p>
            <p className="font-bold">Bank Reconciliation</p>
        </div>
        
        {/* Bank & Date Info */}
        <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
            <div className="print:text-left">
                <span className="font-bold">Bank Name:</span> {formValues.bankName}
                <br />
                <span className="font-bold">Bank Code:</span> {formValues.bankCode}
            </div>
            <div className="print:text-right">
                <span className="font-bold">Reconcile Date:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric'}) : ''}
                <br />
                <span className="font-bold">Reconcile Month:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric'}) : ''}
            </div>
        </div>
        
        {/* --- Bank Section --- */}
        <div className="space-y-2 pt-4">
            <div className="flex justify-between items-center border-b-2 border-black pb-1">
                <h4 className="font-bold">Bank Balance end of the period</h4>
                <FormField
                    control={control}
                    name="balanceAsPerBank"
                    render={({ field }) => (
                    <FormItem>
                        <FormControl>
                        <Input type="number" step="0.00" className="w-40 text-right font-bold" {...field} />
                        </FormControl>
                    </FormItem>
                    )}
                />
            </div>
            <div className="grid grid-cols-[auto,1fr,160px] items-center">
                <div className="font-bold pr-2">Add:</div>
                <div className="col-span-2">Debit on Ledger Records Without corresponding Credit Bank records:</div>
            </div>
             { (formValues.additions || []).map((item:any, index:number) => (
                <div key={`bank_add_${index}`} className="grid grid-cols-[auto,1fr,160px] items-center pl-8">
                    <div/>
                    <div>{item.narration}</div>
                    <div className="text-right pr-1">{Number(item.amount).toFixed(2)}</div>
                </div>
             ))}
             <div className="grid grid-cols-[auto,1fr,160px] items-center">
                <div/>
                <div className="text-right font-bold pr-2">Total amount A:</div>
                <div className="text-right border-t border-black font-bold">{totalBankAdditions.toFixed(2)}</div>
             </div>

             <div className="grid grid-cols-[auto,1fr,160px] items-center pt-2">
                <div className="font-bold pr-2">Less:</div>
                <div className="col-span-2">Credit on Ledger Records Without corresponding Debit Bank records:</div>
            </div>
             { (formValues.deductions || []).map((item:any, index:number) => (
                <div key={`bank_deduct_${index}`} className="grid grid-cols-[auto,1fr,160px] items-center pl-8">
                    <div/>
                    <div>{item.narration}</div>
                    <div className="text-right pr-1">{Number(item.amount).toFixed(2)}</div>
                </div>
             ))}
             <div className="grid grid-cols-[auto,1fr,160px] items-center">
                <div/>
                <div className="text-right font-bold pr-2">Total amount B:</div>
                <div className="text-right border-t border-black font-bold">({totalBankDeductions.toFixed(2)})</div>
             </div>

             <div className="flex justify-between items-center border-t-4 border-double border-black pt-2 mt-2">
                <h4 className="font-bold">Corrected Bank Balance end of the period</h4>
                <span className="w-40 text-right font-bold">{correctedBankBalance.toFixed(2)}</span>
            </div>
=======
>>>>>>> 4469e0c (message)
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <span className="w-5 pt-2 text-xs font-bold text-slate-400">{index + 1}.</span>
            
            <div className="flex-1">
              <Controller
                control={control}
                name={`${name}.${index}.narration`}
                render={({ field }) => (
                  <Textarea {...field} placeholder="Description" className="min-h-[38px] text-sm" />
                )}
              />
            </div>

            <div className="w-28">
              <Controller
                control={control}
                name={`${name}.${index}.amount`}
                render={({ field }) => (
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="0.00" 
                    className="text-right text-sm" 
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                )}
              />
            </div>

            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-emerald-600"
                onClick={() => append({ narration: "", amount: 0 })}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-rose-500"
                onClick={() => remove(index)}
                disabled={fields.length === 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/* ----------------------------- MAIN PAGE ---------------------------- */

export default function ReconciliationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      balanceAsPerBank: 0,
      balanceAsPerBook: 0,
      additions: [{ narration: "", amount: 0 }],
      deductions: [{ narration: "", amount: 0 }],
      bookAdditions: [{ narration: "", amount: 0 }],
      bookDeductions: [{ narration: "", amount: 0 }],
    },
  });

  const { control, handleSubmit } = form;
  const values = useWatch({ control });

  // Error-safe sum helper
  const sum = (arr: any[] = []) => 
    arr.reduce((t, i) => t + (Number(i?.amount) || 0), 0);

  const correctedBank = (Number(values.balanceAsPerBank) || 0) + sum(values.additions) - sum(values.deductions);
  const correctedBook = (Number(values.balanceAsPerBook) || 0) + sum(values.bookAdditions) - sum(values.bookDeductions);
  const diff = correctedBank - correctedBook;

  /* EXCEL EXPORT LOGIC (Safe from .toFixed errors) */
  const downloadExcel = () => {
    const formatRow = (item: any) => ({
      Description: item.narration || "N/A",
      // CRITICAL FIX: Ensure it is a Number before calling toFixed
      Amount: Number(item.amount || 0).toFixed(2)
    });
<<<<<<< HEAD
    router.push("/reconciliations");
>>>>>>> 4fcfa8d (message)
  };
=======
>>>>>>> 4469e0c (message)

    const workbook = XLSX.utils.book_new();

    // Create a flat array for the main reconciliation sheet
    const summaryData = [
      ["Bank Reconciliation Statement"],
      ["Generated on", new Date().toLocaleDateString()],
      [],
      ["BANK SIDE"],
      ["Balance as per Bank Statement", Number(values.balanceAsPerBank || 0).toFixed(2)],
      ["Add: Additions", sum(values.additions).toFixed(2)],
      ["Less: Deductions", `(${sum(values.deductions).toFixed(2)})`],
      ["Adjusted Bank Balance", correctedBank.toFixed(2)],
      [],
      ["BOOK SIDE"],
      ["Balance as per General Ledger", Number(values.balanceAsPerBook || 0).toFixed(2)],
      ["Add: Book Additions", sum(values.bookAdditions).toFixed(2)],
      ["Less: Book Deductions", `(${sum(values.bookDeductions).toFixed(2)})`],
      ["Adjusted Book Balance", correctedBook.toFixed(2)],
      [],
      ["Net Difference", diff.toFixed(2)]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");

    // Breakdown Sheets
    const details = [
      { name: "Bank Additions", data: values.additions },
      { name: "Bank Deductions", data: values.deductions },
      { name: "Book Additions", data: values.bookAdditions },
      { name: "Book Deductions", data: values.bookDeductions }
    ];

    details.forEach(section => {
      const ws = XLSX.utils.json_to_sheet(section.data?.map(formatRow) || []);
      XLSX.utils.book_append_sheet(workbook, ws, section.name);
    });

    XLSX.writeFile(workbook, `Reconciliation_${new Date().getTime()}.xlsx`);
  };

  return (
    <Form {...form}>
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> 4469e0c (message)
      <form onSubmit={handleSubmit((d) => console.log(d))} className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h1 className="text-xl font-bold text-slate-900">Bank Reconciliation</h1>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={downloadExcel} className="gap-2">
              <Download className="h-4 w-4" /> Download Excel
            </Button>
            <Button type="submit">Save Report</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
<<<<<<< HEAD
          <FormField
            control={control}
            name="balanceAsPerBank"
            render={({ field }) => (
              <FormItem className="bg-white p-4 border rounded-md shadow-sm">
                <FormLabel className="font-semibold">Balance as per Bank</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="balanceAsPerBook"
            render={({ field }) => (
              <FormItem className="bg-white p-4 border rounded-md shadow-sm">
                <FormLabel className="font-semibold">Balance as per Ledger</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <DynamicItemList control={control} name="additions" title="Bank Additions" label="Deposits in Transit" />
          <DynamicItemList control={control} name="deductions" title="Bank Deductions" label="Outstanding Checks" />
          <DynamicItemList control={control} name="bookAdditions" title="Book Additions" label="Direct Credits/Interest" />
          <DynamicItemList control={control} name="bookDeductions" title="Book Deductions" label="Bank Fees/Charges" />
        </div>

        <Card className="bg-slate-900 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-right">
              <div>
                <p className="text-slate-400 text-xs uppercase">Adj. Bank Balance</p>
                <p className="text-xl font-mono">{correctedBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase">Adj. Book Balance</p>
                <p className="text-xl font-mono">{correctedBook.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0">
                <p className="text-slate-400 text-xs uppercase">Difference</p>
                <p className={`text-2xl font-bold font-mono ${Math.abs(diff) < 0.01 ? "text-emerald-400" : "text-rose-400"}`}>
                  {diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
=======
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-32 max-w-5xl mx-auto px-4">
        <Card className="no-print bg-slate-50">
          <CardContent className="p-6 grid md:grid-cols-4 gap-4 items-end">
            <FormField control={form.control} name="bankCode" render={({ field }) => (
              <FormItem className="flex flex-col text-left">
                <FormLabel className="text-xs font-bold uppercase text-slate-500">Bank Code</FormLabel>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between bg-white">{field.value || "Select Bank"}<ChevronsUpDown className="h-4 w-4 opacity-50"/></Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]" align="start">
                    <Command><CommandInput placeholder="Search bank..."/><CommandList><CommandEmpty>No bank found.</CommandEmpty><CommandGroup>
                          {banks?.map(b => (
                            <CommandItem key={b.code} onSelect={() => { form.setValue("bankCode", b.code); form.setValue("bankName", b.name); setPopoverOpen(false); }}>{b.name} ({b.code})</CommandItem>
=======
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card className="no-print">
          <CardContent className="p-6 grid md:grid-cols-3 gap-6">
          <FormField
              control={form.control}
              name="bankCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Bank</FormLabel>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? bankOptions.find(
                                (option) => option.value === field.value
                              )?.label ?? 'Select bank...'
                            : "Select or type bank code"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search bank..." />
                        <CommandList>
                        {banksLoading && <CommandEmpty>Loading banks...</CommandEmpty>}
                        {!banksLoading && <CommandEmpty>No bank found.</CommandEmpty>}
                        <CommandGroup>
                          {bankOptions.map((option) => (
                            <CommandItem
                              value={option.label}
                              key={option.value}
                              onSelect={(currentValue) => {
                                const selectedBank = banks?.find(b => b.name.toLowerCase() === currentValue.toLowerCase());
                                form.setValue("bankCode", selectedBank?.code || "");
                                setPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  option.value === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {option.label}
                            </CommandItem>
>>>>>>> 89d01bd (message)
                          ))}
                        </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Auto-populated" readOnly {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reconciliationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reconciliation Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
=======
          <FormField
            control={control}
            name="balanceAsPerBank"
            render={({ field }) => (
              <FormItem className="bg-white p-4 border rounded-md shadow-sm">
                <FormLabel className="font-semibold">Balance as per Bank</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="balanceAsPerBook"
            render={({ field }) => (
              <FormItem className="bg-white p-4 border rounded-md shadow-sm">
                <FormLabel className="font-semibold">Balance as per Ledger</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <DynamicItemList control={control} name="additions" title="Bank Additions" label="Deposits in Transit" />
          <DynamicItemList control={control} name="deductions" title="Bank Deductions" label="Outstanding Checks" />
          <DynamicItemList control={control} name="bookAdditions" title="Book Additions" label="Direct Credits/Interest" />
          <DynamicItemList control={control} name="bookDeductions" title="Book Deductions" label="Bank Fees/Charges" />
        </div>

        <Card className="bg-slate-900 text-white overflow-hidden">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 text-center md:text-right">
              <div>
                <p className="text-slate-400 text-xs uppercase">Adj. Bank Balance</p>
                <p className="text-xl font-mono">{correctedBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-slate-400 text-xs uppercase">Adj. Book Balance</p>
                <p className="text-xl font-mono">{correctedBook.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0">
                <p className="text-slate-400 text-xs uppercase">Difference</p>
                <p className={`text-2xl font-bold font-mono ${Math.abs(diff) < 0.01 ? "text-emerald-400" : "text-rose-400"}`}>
                  {diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
>>>>>>> 4469e0c (message)
          </CardContent>
        </Card>
      </form>
    </Form>
  );
<<<<<<< HEAD
}
<<<<<<< HEAD
>>>>>>> 4fcfa8d (message)
=======

    
>>>>>>> 89d01bd (message)
=======
}
>>>>>>> 4469e0c (message)
