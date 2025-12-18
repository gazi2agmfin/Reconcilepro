"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Check, ChevronsUpDown, FileDown, Save } from "lucide-react";
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

const itemSchema = z.object({
  narration: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0),
});

const reconciliationSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required."),
  bankName: z.string(),
  reconciliationDate: z.string().min(1, "Date is required."),
  balanceAsPerBank: z.coerce.number(),
  additions: z.array(itemSchema),
  deductions: z.array(itemSchema),
  bookAdditions: z.array(itemSchema),
  bookDeductions: z.array(itemSchema),
  balanceAsPerBook: z.coerce.number(),
});

type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;

const DynamicItemList = ({ control, name, label, title }: any) => {
  const { fields, append, remove } = useFieldArray({ control, name });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-600">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => append({ narration: "", amount: 0 })} className="h-7 text-[10px]">
          <PlusCircle className="mr-1 h-3 w-3" /> ADD ITEM
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground italic mb-2">{label}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start group">
          <Controller
            control={control}
            name={`${name}.${index}.narration`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <Textarea placeholder="Entry description..." {...field} className="min-h-[38px] text-sm resize-none py-1" />
              </FormItem>
            )}
          />
          <Controller
            control={control}
            name={`${name}.${index}.amount`}
            render={({ field }) => (
              <FormItem>
                <Input type="number" step="0.01" className="w-24 text-right text-sm h-[38px]" {...field} />
              </FormItem>
            )}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-[38px] w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

const SummaryCalculation = ({ control, reportHeading }: { control: any, reportHeading?: string }) => {
  const formValues = useWatch({ control });
  const calculateTotal = (arr: any[]) => (arr || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalBankAdd = calculateTotal(formValues.additions);
  const totalBankDed = calculateTotal(formValues.deductions);
  const correctedBankBal = (Number(formValues.balanceAsPerBank) || 0) + totalBankAdd - totalBankDed;

  const totalBookAdd = calculateTotal(formValues.bookAdditions);
  const totalBookDed = calculateTotal(formValues.bookDeductions);
  const correctedBookBal = (Number(formValues.balanceAsPerBook) || 0) + totalBookAdd - totalBookDed;
  const diff = correctedBankBal - correctedBookBal;

  const formatNum = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card className="print-section !shadow-none border-none rounded-none bg-white font-sans">
      <CardContent className="p-10 space-y-6 text-[12px]">
        
        {/* Header Section */}
        <div className="hidden print:block text-center space-y-1 mb-6">
          <p className="text-[9px] text-right font-mono uppercase">BREB FORM NO. 285</p>
          <h2 className="text-xl font-extrabold uppercase">{reportHeading || 'Gazipur Palli Bidyut Samity-2'}</h2>
          <p className="text-[13px] font-medium">Rajendrapur, Gazipur</p>
          <h3 className="text-[15px] font-bold border-b-2 border-black inline-block mt-4 px-4 uppercase italic">Bank Reconciliation Statement</h3>
        </div>

        {/* Bank & Date Meta */}
        <div className="grid grid-cols-2 gap-10 border-y border-black py-4 mb-4">
          <div className="space-y-1">
            <p><span className="font-bold w-28 inline-block">Bank Name:</span> <span className="uppercase">{formValues.bankName}</span></p>
            <p><span className="font-bold w-28 inline-block">Bank Code:</span> {formValues.bankCode}</p>
          </div>
          <div className="text-right space-y-1">
            <p><span className="font-bold">Reconcile Date:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'}) : ''}</p>
            <p><span className="font-bold">For the month of:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</p>
          </div>
        </div>

        {/* Bank Side Statement */}
        <div className="space-y-4">
          <div className="flex justify-between font-bold text-[13px] border-b border-black pb-1">
            <span>Balance as per Bank end of the period</span>
            <span className="w-36 text-right">{formatNum(formValues.balanceAsPerBank || 0)}</span>
          </div>

          <div className="pl-4 space-y-1">
            <p className="font-bold underline italic mb-2">Add: Debit on Ledger Records Without corresponding Credit Bank records:</p>
            {(formValues.additions || []).map((item: any, i: number) => (
              <div key={i} className="ledger-row">
                <span className="narration-text">{item.narration}</span>
                <span className="text-right">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2">
              <span className="pl-6 italic">Total amount A:</span>
              <span className="w-36 text-right border-t border-black">{formatNum(totalBankAdd)}</span>
            </div>
          </div>

          <div className="pl-4 space-y-1 mt-4">
            <p className="font-bold underline italic mb-2">Less: Credit on Ledger Records Without corresponding Debit Bank records:</p>
            {(formValues.deductions || []).map((item: any, i: number) => (
              <div key={i} className="ledger-row">
                <span className="narration-text">{item.narration}</span>
                <span className="text-right">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2">
              <span className="pl-6 italic">Total amount B:</span>
              <span className="w-36 text-right border-t border-black">({formatNum(totalBankDed)})</span>
            </div>
          </div>

          <div className="flex justify-between font-bold text-[14px] border-t-2 border-double border-black mt-2 pt-1 bg-gray-50 px-2">
            <span>Corrected Balance end of the period</span>
            <span className="w-36 text-right">{formatNum(correctedBankBal)}</span>
          </div>
        </div>

        {/* Book Side Statement */}
        <div className="space-y-4 mt-10">
          <div className="flex justify-between font-bold text-[13px] border-b border-black pb-1">
            <span>Balance as per Book end of the period</span>
            <span className="w-36 text-right">{formatNum(formValues.balanceAsPerBook || 0)}</span>
          </div>

          <div className="pl-4 space-y-1">
            <p className="font-bold underline italic mb-2">Add: Credit on Bank Records Without corresponding Debit Ledger records:</p>
            {(formValues.bookAdditions || []).map((item: any, i: number) => (
              <div key={i} className="ledger-row">
                <span className="narration-text">{item.narration}</span>
                <span className="text-right">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2">
              <span className="pl-6 italic">Total amount C:</span>
              <span className="w-36 text-right border-t border-black">{formatNum(totalBookAdd)}</span>
            </div>
          </div>

          <div className="pl-4 space-y-1 mt-4">
            <p className="font-bold underline italic mb-2">Less: Debit on Bank Records Without corresponding Credit Ledger records:</p>
            {(formValues.bookDeductions || []).map((item: any, i: number) => (
              <div key={i} className="ledger-row">
                <span className="narration-text">{item.narration}</span>
                <span className="text-right">{formatNum(item.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold pt-2">
              <span className="pl-6 italic">Total amount D:</span>
              <span className="w-36 text-right border-t border-black">({formatNum(totalBookDed)})</span>
            </div>
          </div>

          <div className="flex justify-between font-bold text-[14px] border-t-2 border-double border-black mt-2 pt-1 bg-gray-50 px-2">
            <span>Corrected Book Balance end of the period</span>
            <span className="w-36 text-right">{formatNum(correctedBookBal)}</span>
          </div>
        </div>

        {/* Difference Summary */}
        <div className="flex justify-end pt-8">
          <div className={cn("flex items-center gap-6 border-2 p-4 px-8", diff === 0 ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50")}>
            <span className="font-black text-sm uppercase tracking-tighter italic">Reconciliation Difference:</span>
            <span className="text-2xl font-bold font-mono">{formatNum(diff)}</span>
          </div>
        </div>

        {/* Professional Footer Signatures */}
        <div className="hidden print:block pt-32 pb-20"> 
          <div className="grid grid-cols-3 gap-16 text-center">
            <div className="border-t border-black pt-2">
              <p className="font-extrabold uppercase text-[10px]">Prepared by</p>
              <p className="text-[11px] mt-1 font-medium">Assistant Accountant</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-extrabold uppercase text-[10px]">Verified by</p>
              <p className="text-[11px] mt-1 font-medium">Accountant</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-extrabold uppercase text-[10px]">Approved by</p>
              <p className="text-[11px] mt-1 font-medium">AGM (Finance)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

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

  const bankOptions = useMemo(() => banks?.map(b => ({ value: b.code, label: b.name })) || [], [banks]);

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: {
      bankCode: "", bankName: "",
      reconciliationDate: new Date().toISOString().split("T")[0],
      balanceAsPerBank: 0, additions: [], deductions: [],
      balanceAsPerBook: 0, bookAdditions: [], bookDeductions: [],
    },
  });

  useEffect(() => {
    if (isEditMode && defaultValues) {
      form.reset({
        ...defaultValues,
        reconciliationDate: defaultValues.reconciliationDate ? new Date(defaultValues.reconciliationDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
      });
    }
  }, [isEditMode, defaultValues, form]);

  const bankCode = useWatch({ control: form.control, name: 'bankCode'});
  useEffect(() => {
    const selected = banks?.find(b => b.code === bankCode);
    if (selected) form.setValue("bankName", selected.name);
  }, [bankCode, banks, form]);

  const onSubmit = (data: ReconciliationFormValues) => {
    if (!user) return;
    const payload = { ...data, userId: user.uid, updatedAt: serverTimestamp() };
    const collPath = `users/${user.uid}/reconciliations`;
    if (isEditMode && reconciliationId) {
      updateDocumentNonBlocking(doc(firestore, collPath, reconciliationId), payload);
    } else {
      addDocumentNonBlocking(collection(firestore, collPath), { ...payload, createdAt: serverTimestamp() });
    }
    toast({ title: "Statement Saved", description: "Successfully updated database." });
    router.push("/reconciliations");
  };
const handleDownloadPdf = async () => {
  const element = printRef.current;
  if (!element) return;

  // 1. Prepare for capture
  document.body.classList.add('print-styles-active');
  
  const canvas = await html2canvas(element, { 
    scale: 3, 
    useCORS: true, 
    backgroundColor: "#ffffff",
    windowWidth: 1200 
  });
  
  document.body.classList.remove('print-styles-active');

  // 2. Generate Date String (e.g., "November 2025")
  const dateValue = form.getValues('reconciliationDate');
  const bankName = form.getValues('bankName') || "Statement";
  
  const formattedDate = dateValue 
    ? new Date(dateValue).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : "Date-Unknown";

  // 3. Create PDF
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

  // 4. Save with requested name format: "Bank Name:Month Year"
  // Note: Colons are usually replaced with dashes or underscores in filenames for OS compatibility
  pdf.save(`${bankName}_${formattedDate}.pdf`);
};
 
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-32">
        <Card className="no-print border-none shadow-sm bg-slate-50/80">
          <CardContent className="p-6 grid md:grid-cols-4 gap-6 items-end">
            <FormField
              control={form.control}
              name="bankCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-xs font-bold uppercase text-slate-500">Bank Search</FormLabel>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-between w-full h-11">
                        {field.value || "Select Bank..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[320px] p-0">
                      <Command>
                        <CommandInput placeholder="Search bank code or name..." />
                        <CommandList>
                          <CommandEmpty>No results found.</CommandEmpty>
                          <CommandGroup>
                            {bankOptions.map((opt) => (
                              <CommandItem key={opt.value} onSelect={() => { form.setValue("bankCode", opt.value); setPopoverOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", opt.value === field.value ? "opacity-100" : "opacity-0")} />
                                {opt.label} - {opt.value}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel className="text-xs font-bold uppercase text-slate-500">Official Bank Name</FormLabel><Input readOnly {...field} className="h-11 bg-white font-medium" /></FormItem>
            )} />
            <FormField control={form.control} name="reconciliationDate" render={({ field }) => (
              <FormItem><FormLabel className="text-xs font-bold uppercase text-slate-500">Report Date</FormLabel><Input type="date" {...field} className="h-11 bg-white" /></FormItem>
            )} />
          </CardContent>
        </Card>

        {/* Management Inputs Section */}
        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-none shadow-sm"><CardContent className="p-6"><DynamicItemList control={form.control} name="additions" title="Bank Side: Additions" label="Checks issued but not yet cleared (Outstanding)" /></CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-6"><DynamicItemList control={form.control} name="deductions" title="Bank Side: Deductions" label="Deposits made but not in bank record (Transit)" /></CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-6"><DynamicItemList control={form.control} name="bookAdditions" title="Book Side: Additions" label="Direct bank credits or interest earned" /></CardContent></Card>
          <Card className="border-none shadow-sm"><CardContent className="p-6"><DynamicItemList control={form.control} name="bookDeductions" title="Book Side: Deductions" label="Bank charges or direct ledger debits" /></CardContent></Card>
        </div>

        {/* Live Preview Container */}
        <div ref={printRef} className="rounded-xl border shadow-2xl bg-white overflow-hidden max-w-[210mm] mx-auto">
           <div className="no-print bg-slate-900 text-white px-8 py-3 flex justify-between items-center">
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Official Statement Preview</span>
             <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase text-slate-400">Bank End Balance</span>
                  <Controller control={form.control} name="balanceAsPerBank" render={({ field }) => (
                    <input type="number" step="0.01" {...field} className="bg-transparent text-sm font-bold border-none focus:ring-0 text-right w-24 p-0" />
                  )} />
                </div>
                <div className="flex flex-col border-l border-slate-700 pl-4">
                  <span className="text-[9px] uppercase text-slate-400">Book End Balance</span>
                  <Controller control={form.control} name="balanceAsPerBook" render={({ field }) => (
                    <input type="number" step="0.01" {...field} className="bg-transparent text-sm font-bold border-none focus:ring-0 text-right w-24 p-0" />
                  )} />
                </div>
             </div>
           </div>
           <SummaryCalculation control={form.control} reportHeading={settingsData?.reportHeading} />
        </div>

        {/* Fixed Action Bar */}
        <div className="no-print fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 flex justify-center items-center gap-6 shadow-2xl z-50">
          <Button type="button" variant="outline" onClick={handleDownloadPdf} className="h-12 px-8 gap-3 border-slate-300 hover:bg-slate-50 transition-all font-bold uppercase text-xs tracking-widest">
            <FileDown className="h-4 w-4" /> Download Statement
          </Button>
          <Button type="submit" className="h-12 px-12 gap-3 shadow-lg shadow-primary/20 transition-all font-bold uppercase text-xs tracking-widest">
            <Save className="h-4 w-4" /> {isEditMode ? "Update Changes" : "Confirm & Save"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
