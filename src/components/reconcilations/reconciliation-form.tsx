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

// --- SCHEMAS ---
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

// --- DYNAMIC LIST COMPONENT ---
const DynamicItemList = ({ control, name, label, title }: any) => {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700">{title}</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ narration: "", amount: 0 })}
          className="h-8 text-xs"
        >
          <PlusCircle className="mr-1 h-3 w-3" /> Add
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground italic">{label}</p>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2 items-start">
          <Controller
            control={control}
            name={`${name}.${index}.narration`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <Textarea placeholder="Narration..." {...field} className="min-h-[40px] text-sm resize-none" />
              </FormItem>
            )}
          />
          <Controller
            control={control}
            name={`${name}.${index}.amount`}
            render={({ field }) => (
              <FormItem>
                <Input type="number" step="0.01" className="w-28 text-right text-sm" {...field} />
              </FormItem>
            )}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
};

// --- SUMMARY & PRINT VIEW ---
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

  return (
    <Card className="print-section !shadow-none border-t-4 border-t-primary rounded-none bg-white">
      <CardContent className="p-8 space-y-6 text-[12px] leading-relaxed">
        
        {/* Professional Header */}
        <div className="hidden print:block text-center space-y-1 mb-8 border-b pb-4">
          <p className="text-[10px] text-right font-mono">BREB FORM NO. 285</p>
          <h2 className="text-xl font-bold uppercase tracking-tight">{reportHeading || 'Gazipur Palli Bidyut Samity-2'}</h2>
          <p className="text-sm">Rajendrapur, Gazipur</p>
          <h3 className="text-md font-bold underline decoration-double pt-2 uppercase">Bank Reconciliation Statement</h3>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4 border-y py-3 border-slate-200">
          <div>
            <p><span className="font-bold w-24 inline-block">Bank Name:</span> {formValues.bankName}</p>
            <p><span className="font-bold w-24 inline-block">Bank Code:</span> {formValues.bankCode}</p>
          </div>
          <div className="text-right">
            <p><span className="font-bold">Reconcile Date:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-GB') : ''}</p>
            <p><span className="font-bold">Month:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</p>
          </div>
        </div>

        {/* Main Body */}
        <div className="space-y-8">
          {/* Section: Bank Side */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold border-b border-black pb-1">
              <span>1. Balance as per Bank Statement</span>
              <span className="w-32 text-right">{Number(formValues.balanceAsPerBank || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            
            <div className="pl-4 space-y-1">
              <p className="font-semibold italic text-slate-700 underline">Add: Debit on Ledger records without Bank Credit:</p>
              {(formValues.additions || []).map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr,120px] gap-2 border-b border-dotted border-slate-300">
                  <span className="narration-text">{item.narration}</span>
                  <span className="text-right self-end">{Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1">
                <span className="pl-4 text-slate-600">Total Additions (A)</span>
                <span className="w-32 text-right border-t border-black">{totalBankAdd.toFixed(2)}</span>
              </div>
            </div>

            <div className="pl-4 space-y-1 mt-4">
              <p className="font-semibold italic text-slate-700 underline">Less: Credit on Ledger records without Bank Debit:</p>
              {(formValues.deductions || []).map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr,120px] gap-2 border-b border-dotted border-slate-300">
                  <span className="narration-text">{item.narration}</span>
                  <span className="text-right self-end">{Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1">
                <span className="pl-4 text-slate-600">Total Deductions (B)</span>
                <span className="w-32 text-right border-t border-black">({totalBankDed.toFixed(2)})</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-sm border-t-2 border-double border-black mt-2 pt-1 bg-slate-50 px-2">
              <span>Corrected Bank Balance</span>
              <span className="w-32 text-right">{correctedBankBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Section: Book Side */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold border-b border-black pb-1">
              <span>2. Balance as per Cash Book (General Ledger)</span>
              <span className="w-32 text-right">{Number(formValues.balanceAsPerBook || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="pl-4 space-y-1">
              <p className="font-semibold italic text-slate-700 underline">Add: Credit on Bank records without Ledger Debit:</p>
              {(formValues.bookAdditions || []).map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr,120px] gap-2 border-b border-dotted border-slate-300">
                  <span className="narration-text">{item.narration}</span>
                  <span className="text-right self-end">{Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1">
                <span className="pl-4 text-slate-600">Total Additions (C)</span>
                <span className="w-32 text-right border-t border-black">{totalBookAdd.toFixed(2)}</span>
              </div>
            </div>

            <div className="pl-4 space-y-1 mt-4">
              <p className="font-semibold italic text-slate-700 underline">Less: Debit on Bank records without Ledger Credit:</p>
              {(formValues.bookDeductions || []).map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr,120px] gap-2 border-b border-dotted border-slate-300">
                  <span className="narration-text">{item.narration}</span>
                  <span className="text-right self-end">{Number(item.amount).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-1">
                <span className="pl-4 text-slate-600">Total Deductions (D)</span>
                <span className="w-32 text-right border-t border-black">({totalBookDed.toFixed(2)})</span>
              </div>
            </div>

            <div className="flex justify-between font-bold text-sm border-t-2 border-double border-black mt-2 pt-1 bg-slate-50 px-2">
              <span>Corrected Book Balance</span>
              <span className="w-32 text-right">{correctedBookBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Final Reconciled Status */}
        <div className="flex justify-end pt-6">
          <div className={cn("flex items-center gap-4 border-2 p-3 px-6", diff === 0 ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50")}>
            <span className="font-black text-sm uppercase">Unreconciled Difference:</span>
            <span className="text-xl font-bold font-mono">{diff.toFixed(2)}</span>
          </div>
        </div>

        {/* Professional Footer Signatures */}
        <div className="hidden print:block pt-32 pb-16"> 
          <div className="grid grid-cols-3 gap-12 text-center">
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase text-[10px]">Prepared by</p>
              <p className="mt-1">Assistant Accountant</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase text-[10px]">Verified by</p>
              <p className="mt-1">Accountant</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase text-[10px]">Approved by</p>
              <p className="mt-1">AGM (Finance)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// --- MAIN FORM EXPORT ---
export function ReconciliationForm({ isEditMode = false, defaultValues, reconciliationId }: any) {
  const router = useRouter();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const banksCollectionRef = useMemoFirebase(() => collection(firestore, 'banks'), [firestore]);
  const { data: banks, isLoading: banksLoading } = useCollection<{code: string, name: string}>(banksCollectionRef);
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
    toast({ title: "Success", description: "Reconciliation processed." });
    router.push("/reconciliations");
  };

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    document.body.classList.add('print-styles-active');
    
    const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
    document.body.classList.remove('print-styles-active');

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`reconciliation-${form.getValues('bankCode') || 'report'}.pdf`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <Card className="no-print border-none shadow-sm bg-slate-50">
          <CardContent className="p-6 grid md:grid-cols-4 gap-4 items-end">
            <FormField
              control={form.control}
              name="bankCode"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Bank Code</FormLabel>
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-between w-full font-normal">
                        {field.value || "Select Bank..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Search bank..." />
                        <CommandList>
                          <CommandEmpty>No banks found.</CommandEmpty>
                          <CommandGroup>
                            {bankOptions.map((opt) => (
                              <CommandItem key={opt.value} onSelect={() => { form.setValue("bankCode", opt.value); setPopoverOpen(false); }}>
                                <Check className={cn("mr-2 h-4 w-4", opt.value === field.value ? "opacity-100" : "opacity-0")} />
                                {opt.label} ({opt.value})
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
            <FormField
              control={form.control}
              name="bankName"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Bank Name</FormLabel>
                  <Input readOnly {...field} className="bg-slate-100" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reconciliationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reconciliation Date</FormLabel>
                  <Input type="date" {...field} />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Input Lists */}
        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="additions" title="Bank Additions" label="Checks issued but not presented" /></CardContent></Card>
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="deductions" title="Bank Deductions" label="Deposits in transit" /></CardContent></Card>
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="bookAdditions" title="Book Additions" label="Interest earned / Direct credits" /></CardContent></Card>
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="bookDeductions" title="Book Deductions" label="Bank charges / Direct debits" /></CardContent></Card>
        </div>

        {/* Live Calculation & Print Section */}
        <div ref={printRef} className="rounded-lg shadow-lg overflow-hidden border">
           <div className="no-print bg-slate-800 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest">Preview & Statement Summary</div>
           
           <div className="p-4 no-print bg-slate-50 border-b grid grid-cols-2 gap-8">
             <FormField control={form.control} name="balanceAsPerBank" render={({ field }) => (
                <FormItem><FormLabel className="text-blue-700 font-bold">Initial Bank Balance</FormLabel><Input type="number" step="0.01" {...field} /></FormItem>
             )} />
             <FormField control={form.control} name="balanceAsPerBook" render={({ field }) => (
                <FormItem><FormLabel className="text-green-700 font-bold">Initial Book Balance</FormLabel><Input type="number" step="0.01" {...field} /></FormItem>
             )} />
           </div>

           <SummaryCalculation control={form.control} reportHeading={settingsData?.reportHeading} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 no-print bg-white p-4 border rounded-lg shadow-sm sticky bottom-4 z-10">
          <Button type="button" variant="outline" onClick={handleDownloadPdf} className="gap-2">
            <FileDown className="h-4 w-4" /> Download PDF
          </Button>
          <Button type="submit" className="gap-2 px-8">
            <Save className="h-4 w-4" /> {isEditMode ? "Update Statement" : "Save Statement"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
