"use client";

import { useForm, useFieldArray, Controller, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
<<<<<<< HEAD
import { PlusCircle, Trash2, Download } from "lucide-react";
import * as XLSX from "xlsx";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// --- SCHEMAS & TYPES ---
const itemSchema = z.object({
  narration: z.string().min(1, "Required").default(""),
  amount: z.coerce.number().min(0).default(0),
});

const reconciliationSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required."),
  bankName: z.string().default(""),
  reconciliationDate: z.string().min(1, "Date is required."),
  balanceAsPerBank: z.coerce.number().default(0),
  additions: z.array(itemSchema).default([]),
  deductions: z.array(itemSchema).default([]),
  bookAdditions: z.array(itemSchema).default([]),
  bookDeductions: z.array(itemSchema).default([]),
  balanceAsPerBook: z.coerce.number().default(0),
});

type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;
type Item = z.infer<typeof itemSchema>;

// --- DYNAMIC LIST COMPONENT ---
interface DynamicListProps {
  control: Control<ReconciliationFormValues>;
  name: "additions" | "deductions" | "bookAdditions" | "bookDeductions";
  label: string;
  title: string;
}
>>>>>>> 4fcfa8d (message)

const DynamicItemList = ({ control, name, label, title }: DynamicListProps) => {
  const { fields, append, remove, insert } = useFieldArray({ control, name });
  return (
<<<<<<< HEAD
    <Card className="shadow-sm border-slate-200">
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
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
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground italic mb-2">{label}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start relative pb-1">
          <Controller
            control={control}
            name={`${name}.${index}.narration`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <Textarea placeholder="Description..." {...field} className="min-h-[38px] text-sm resize-none py-1 border-slate-200" />
              </FormItem>
            )}
          />
          <Controller
            control={control}
            name={`${name}.${index}.amount`}
            render={({ field }) => (
              <FormItem>
                <Input type="number" step="0.01" className="w-24 text-right text-sm h-[38px] font-mono" {...field} />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-1 pt-0.5">
            <Button type="button" variant="outline" size="icon" onClick={() => insert(index + 1, { narration: "", amount: 0 })} className="h-4 w-7 text-blue-600 border-blue-200">
              <Plus className="h-3 w-3" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={() => remove(index)} className="h-4 w-7 text-destructive border-red-200">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- PREVIEW COMPONENT ---
const SummaryCalculation = ({ control, reportHeading }: { control: Control<ReconciliationFormValues>, reportHeading?: string }) => {
  const formValues = useWatch({ control });

  const formatNum = (val: number | undefined) => (val ?? 0).toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  const calculateTotal = (arr: Item[] | undefined) => (arr ?? []).reduce((sum, item) => sum + (item.amount || 0), 0);

  const balBank = Number(formValues.balanceAsPerBank) || 0;
  const totalBankAdd = calculateTotal(formValues.additions);
  const totalBankDed = calculateTotal(formValues.deductions);
  const correctedBankBal = balBank + totalBankAdd - totalBankDed;

  const balBook = Number(formValues.balanceAsPerBook) || 0;
  const totalBookAdd = calculateTotal(formValues.bookAdditions);
  const totalBookDed = calculateTotal(formValues.bookDeductions);
  const correctedBookBal = balBook + totalBookAdd - totalBookDed;
  const diff = correctedBankBal - correctedBookBal;

  return (
    <Card className="print-section !shadow-none border-none rounded-none bg-white text-slate-900">
      <CardContent className="p-10 space-y-6 text-[12px]">
        {/* Header */}
        <div className="hidden print:block text-center space-y-1 mb-6">
          <p className="text-[9px] text-right font-mono uppercase">BREB FORM NO. 285</p>
          <h2 className="text-xl font-extrabold uppercase">{reportHeading || 'Gazipur Palli Bidyut Samity-2'}</h2>
          <h3 className="text-[15px] font-bold border-b-2 border-black inline-block mt-4 px-4 uppercase italic">Bank Reconciliation Statement</h3>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-10 border-y border-black py-4">
          <div className="space-y-1 text-left">
            <p><span className="font-bold w-28 inline-block">Bank Name:</span> <span className="uppercase">{formValues.bankName}</span></p>
            <p><span className="font-bold w-28 inline-block">Bank Code:</span> {formValues.bankCode}</p>
          </div>
          <div className="text-right space-y-1">
            <p><span className="font-bold">Reconcile Date:</span> {formValues.reconciliationDate}</p>
            <p><span className="font-bold">Month:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</p>
          </div>
        </div>

        {/* BANK SIDE */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between font-bold border-b border-black pb-1 uppercase">
            <span>Balance as per Bank end of the period</span>
            <span className="w-36 text-right font-mono">{formatNum(balBank)}</span>
          </div>
          <div className="pl-4 space-y-1">
            <p className="font-bold italic underline text-[11px] mb-2">Add: Debit on Ledger records without Bank Credit:</p>
            {(formValues.additions ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px] gap-2 border-b border-dotted py-1 items-start">
                <span className="text-left leading-tight break-words">{item.narration}</span>
                <span className="text-right font-mono">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2"><span>Total Additions:</span><span className="w-36 text-right border-t border-black">{formatNum(totalBankAdd)}</span></div>
          </div>
          <div className="pl-4 space-y-1 mt-4">
            <p className="font-bold italic underline text-[11px] mb-2">Less: Credit on Ledger records without Bank Debit:</p>
            {(formValues.deductions ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px] gap-2 border-b border-dotted py-1 items-start">
                <span className="text-left leading-tight break-words">{item.narration}</span>
                <span className="text-right font-mono">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2"><span>Total Deductions:</span><span className="w-36 text-right border-t border-black">({formatNum(totalBankDed)})</span></div>
          </div>
          <div className="flex justify-between font-bold text-[13px] border-t-2 border-double border-black mt-2 pt-1 px-2 bg-slate-50 uppercase">
            <span>Corrected Bank Balance end of the Month</span>
            <span className="w-36 text-right font-mono">{formatNum(correctedBankBal)}</span>
          </div>
        </div>

        {/* LEDGER SIDE */}
        <div className="space-y-4 pt-10">
          <div className="flex justify-between font-bold border-b border-black pb-1 uppercase">
            <span>Balance as per Ledger end of the period</span>
            <span className="w-36 text-right font-mono">{formatNum(balBook)}</span>
          </div>
          <div className="pl-4 space-y-1">
            <p className="font-bold italic underline text-[11px] mb-2">Add: Credit on Bank records without Ledger Debit:</p>
            {(formValues.bookAdditions ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px] gap-2 border-b border-dotted py-1 items-start">
                <span className="text-left leading-tight break-words">{item.narration}</span>
                <span className="text-right font-mono">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2"><span>Total Additions:</span><span className="w-36 text-right border-t border-black">{formatNum(totalBookAdd)}</span></div>
          </div>
          <div className="pl-4 space-y-1 mt-4">
            <p className="font-bold italic underline text-[11px] mb-2">Less: Debit on Bank records without Ledger Credit:</p>
            {(formValues.bookDeductions ?? []).map((item, i) => (
              <div key={i} className="grid grid-cols-[1fr_140px] gap-2 border-b border-dotted py-1 items-start">
                <span className="text-left leading-tight break-words">{item.narration}</span>
                <span className="text-right font-mono">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2"><span>Total Deductions:</span><span className="w-36 text-right border-t border-black">({formatNum(totalBookDed)})</span></div>
          </div>
          <div className="flex justify-between font-bold text-[13px] border-t-2 border-double border-black mt-2 pt-1 px-2 bg-slate-50 uppercase">
            <span>Corrected Ledger Balance end of the Month</span>
            <span className="w-36 text-right font-mono">{formatNum(correctedBookBal)}</span>
          </div>
        </div>

        {/* Unbalance Warning */}
        <div className="flex justify-end pt-8">
          <div className={cn("border-2 p-4 px-8 font-bold", Math.abs(diff) < 0.01 ? "border-green-600 bg-green-50 text-green-700" : "border-red-600 bg-red-50 text-red-700")}>
            DIFFERENCE: {formatNum(diff)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- FORM COMPONENT ---
export function ReconciliationForm({ isEditMode = false, defaultValues, reconciliationId }: any) {
  const router = useRouter();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();

  const banksCollectionRef = useMemoFirebase(() => collection(firestore, 'banks'), [firestore]);
  const { data: banks } = useCollection<{code: string, name: string}>(banksCollectionRef);
  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'report'), [firestore]);
  const { data: settingsData } = useDoc<{ reportHeading: string }>(settingsRef);

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: defaultValues || {
      bankCode: "", bankName: "", reconciliationDate: new Date().toISOString().split("T")[0],
      balanceAsPerBank: 0, additions: [], deductions: [],
      balanceAsPerBook: 0, bookAdditions: [], bookDeductions: []
    }
  });

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    document.body.classList.add('print-styles-active');
    const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    document.body.classList.remove('print-styles-active');
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`Reconciliation-${form.getValues('bankCode')}.pdf`);
  };

  const onSubmit = (data: ReconciliationFormValues) => {
    if (!user) return;
    const path = `users/${user.uid}/reconciliations`;
    const payload = { ...data, userId: user.uid, updatedAt: serverTimestamp() };
    if (isEditMode && reconciliationId) {
      updateDocumentNonBlocking(doc(firestore, path, reconciliationId), payload);
    } else {
      addDocumentNonBlocking(collection(firestore, path), { ...payload, createdAt: serverTimestamp() });
    }
    toast({ title: "Statement Saved" });
    router.push("/reconciliations");
>>>>>>> 4fcfa8d (message)
  };

  return (
    <Form {...form}>
<<<<<<< HEAD
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
                          ))}
                    </CommandGroup></CommandList></Command>
                  </PopoverContent>
                </Popover>
              </FormItem>
            )} />
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem className="md:col-span-2 text-left"><FormLabel className="text-xs font-bold uppercase text-slate-500">Bank Name</FormLabel><Input readOnly {...field} className="bg-white"/></FormItem>
            )} />
            <FormField control={form.control} name="reconciliationDate" render={({ field }) => (
              <FormItem className="text-left"><FormLabel className="text-xs font-bold uppercase text-slate-500">Date</FormLabel><Input type="date" {...field} className="bg-white"/></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DynamicItemList control={form.control} name="additions" title="Bank: Additions" label="Outstanding Checks" />
          <DynamicItemList control={form.control} name="deductions" title="Bank: Deductions" label="Deposits in Transit" />
          <DynamicItemList control={form.control} name="bookAdditions" title="Ledger: Additions" label="Direct Credits" />
          <DynamicItemList control={form.control} name="bookDeductions" title="Ledger: Deductions" label="Bank Charges" />
        </div>

        <div ref={printRef} className="rounded-xl border shadow-xl bg-white overflow-hidden max-w-[210mm] mx-auto">
          <div className="no-print bg-slate-900 text-white p-4 flex justify-between items-center text-[10px] font-bold uppercase">
            <span>Official Statement Preview</span>
            <div className="flex gap-6">
              <div className="flex flex-col text-right">
                <span className="text-slate-400">Bank End Balance</span>
                <Controller control={form.control} name="balanceAsPerBank" render={({ field }) => <input type="number" step="0.01" {...field} className="bg-transparent text-right font-mono text-sm border-none p-0 focus:ring-0 w-28" />} />
              </div>
              <div className="flex flex-col text-right border-l border-slate-700 pl-6">
                <span className="text-slate-400">Ledger End Balance</span>
                <Controller control={form.control} name="balanceAsPerBook" render={({ field }) => <input type="number" step="0.01" {...field} className="bg-transparent text-right font-mono text-sm border-none p-0 focus:ring-0 w-28" />} />
              </div>
            </div>
          </div>
          <SummaryCalculation control={form.control} reportHeading={settingsData?.reportHeading} />
        </div>

        <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center gap-6 shadow-2xl z-50">
          <Button type="button" variant="outline" onClick={handleDownloadPdf} className="h-12 px-8 font-bold uppercase text-xs tracking-widest"><FileDown className="mr-2 h-4 w-4" /> Download PDF</Button>
          <Button type="submit" className="h-12 px-12 font-bold uppercase text-xs tracking-widest"><Save className="mr-2 h-4 w-4" /> Save Statement</Button>
        </div>
      </form>
    </Form>
  );
}
>>>>>>> 4fcfa8d (message)
