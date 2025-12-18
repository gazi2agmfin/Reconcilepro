"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2, Check, ChevronsUpDown, FileDown, Save, Plus } from "lucide-react";
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
  const { fields, append, remove, insert } = useFieldArray({ control, name });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <h3 className="font-bold text-xs uppercase tracking-widest text-slate-600">{title}</h3>
        {fields.length === 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => append({ narration: "", amount: 0 })} className="h-7 text-[10px]">
            <PlusCircle className="mr-1 h-3 w-3" /> ADD ITEM
          </Button>
        )}
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
                <Input type="number" step="0.00" className="w-24 text-right text-sm h-[38px]" {...field} />
              </FormItem>
            )}
          />
          {/* Action Buttons: Add and Delete for every row */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => insert(index + 1, { narration: "", amount: 0 })} 
              className="h-5 w-8 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              size="icon" 
              onClick={() => remove(index)} 
              className="h-5 w-8 text-destructive hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

const SummaryCalculation = ({ control, reportHeading }: { control: any, reportHeading?: string }) => {
  const formValues = useWatch({ control });
  const formatNum = (val: number) => val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const calculateTotal = (arr: any[]) => (arr || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const totalBankAdd = calculateTotal(formValues.additions);
  const totalBankDed = calculateTotal(formValues.deductions);
  const correctedBankBal = (Number(formValues.balanceAsPerBank) || 0) + totalBankAdd - totalBankDed;

  const totalBookAdd = calculateTotal(formValues.bookAdditions);
  const totalBookDed = calculateTotal(formValues.bookDeductions);
  const correctedBookBal = (Number(formValues.balanceAsPerBook) || 0) + totalBookAdd - totalBookDed;
  const diff = correctedBankBal - correctedBookBal;

  return (
    <Card className="print-section !shadow-none border-none rounded-none bg-white font-sans">
      <CardContent className="p-10 space-y-6 text-[12px]">
        {/* Print Header */}
        <div className="hidden print:block text-center space-y-1 mb-6">
          <p className="text-[9px] text-right font-mono uppercase">BREB FORM NO. 285</p>
          <h2 className="text-xl font-extrabold uppercase">{reportHeading || 'Gazipur Palli Bidyut Samity-2'}</h2>
          <p className="text-[13px] font-medium">Rajendrapur, Gazipur</p>
          <h3 className="text-[15px] font-bold border-b-2 border-black inline-block mt-4 px-4 uppercase italic">Bank Reconciliation Statement</h3>
        </div>

        {/* Bank & Date Info */}
        <div className="grid grid-cols-2 gap-10 border-y border-black py-4">
          <div className="space-y-1">
            <p><span className="font-bold w-28 inline-block">Bank Name:</span> <span className="uppercase">{formValues.bankName}</span></p>
            <p><span className="font-bold w-28 inline-block">Bank Code:</span> {formValues.bankCode}</p>
          </div>
          <div className="text-right space-y-1">
            <p><span className="font-bold">Reconcile Date:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-GB') : ''}</p>
            <p><span className="font-bold">Month:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''}</p>
          </div>
        </div>

        {/* Dynamic List Renderers with Fixed Wrapping */}
        {[
          { title: "A. Bank Balance as per Statement", val: formValues.balanceAsPerBank, items: formValues.additions, lessItems: formValues.deductions, addLabel: "Add: Debit on Ledger records without Bank Credit:", lessLabel: "Less: Credit on Ledger records without Bank Debit:", totalAdd: totalBankAdd, totalLess: totalBankDed, finalBal: correctedBankBal, finalLabel: "Corrected Bank Balance" },
          { title: "B. Book Balance as per Ledger", val: formValues.balanceAsPerBook, items: formValues.bookAdditions, lessItems: formValues.bookDeductions, addLabel: "Add: Credit on Bank records without Ledger Debit:", lessLabel: "Less: Debit on Bank records without Ledger Credit:", totalAdd: totalBookAdd, totalLess: totalBookDed, finalBal: correctedBookBal, finalLabel: "Corrected Book Balance" }
        ].map((section, idx) => (
          <div key={idx} className="space-y-4 pt-4">
            <div className="flex justify-between font-bold border-b border-black pb-1">
              <span>{section.title}</span>
              <span className="w-36 text-right">{formatNum(section.val || 0)}</span>
            </div>
            
            {/* Additions */}
            <div className="pl-4 space-y-1">
              <p className="font-bold italic underline text-[11px] mb-2">{section.addLabel}</p>
              {section.items?.map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_140px] gap-2 border-b border-dotted border-slate-300 py-1 items-start">
                  <span className="narration-text text-left leading-tight break-words">{item.narration}</span>
                  <span className="text-right font-mono">{formatNum(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2"><span className="pl-4">Total Additions:</span><span className="w-36 text-right border-t border-black">{formatNum(section.totalAdd)}</span></div>
            </div>

            {/* Deductions */}
            <div className="pl-4 space-y-1 mt-4">
              <p className="font-bold italic underline text-[11px] mb-2">{section.lessLabel}</p>
              {section.lessItems?.map((item: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_140px] gap-2 border-b border-dotted border-slate-300 py-1 items-start">
                  <span className="narration-text text-left leading-tight break-words">{item.narration}</span>
                  <span className="text-right font-mono">{formatNum(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold pt-2"><span className="pl-4">Total Deductions:</span><span className="w-36 text-right border-t border-black">({formatNum(section.totalLess)})</span></div>
            </div>

            <div className="flex justify-between font-bold text-[13px] border-t-2 border-double border-black mt-2 pt-1 px-2 bg-slate-50">
              <span>{section.finalLabel}</span>
              <span className="w-36 text-right">{formatNum(section.finalBal)}</span>
            </div>
          </div>
        ))}

        {/* Discrepancy Box */}
        <div className="flex justify-end pt-8">
          <div className={cn("border-2 p-4 px-8 font-bold", diff === 0 ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50")}>
            RECONCILIATION DIFFERENCE: {formatNum(diff)}
          </div>
        </div>

        {/* Signatures */}
        <div className="hidden print:block pt-32 pb-10"> 
          <div className="grid grid-cols-3 gap-10 text-center text-[10px] font-bold uppercase">
            <div className="border-t border-black pt-2">Assistant Accountant</div>
            <div className="border-t border-black pt-2">Accountant</div>
            <div className="border-t border-black pt-2">AGM (Finance)</div>
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

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: defaultValues || {
      bankCode: "", bankName: "",
      reconciliationDate: new Date().toISOString().split("T")[0],
      balanceAsPerBank: 0, additions: [], deductions: [],
      balanceAsPerBook: 0, bookAdditions: [], bookDeductions: [],
    },
  });

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
    document.body.classList.add('print-styles-active');
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    document.body.classList.remove('print-styles-active');

    const bankName = form.getValues('bankName') || "Statement";
    const dateValue = form.getValues('reconciliationDate');
    const formattedDate = dateValue ? new Date(dateValue).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "";

    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
    pdf.save(`${bankName} - ${formattedDate}.pdf`);
  };

  const onSubmit = (data: ReconciliationFormValues) => {
    if (!user) return;
    const path = `users/${user.uid}/reconciliations`;
    if (isEditMode && reconciliationId) {
      updateDocumentNonBlocking(doc(firestore, path, reconciliationId), { ...data, updatedAt: serverTimestamp() });
    } else {
      addDocumentNonBlocking(collection(firestore, path), { ...data, createdAt: serverTimestamp() });
    }
    toast({ title: "Saved successfully" });
    router.push("/reconciliations");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-32">
        <Card className="no-print bg-slate-50/50">
          <CardContent className="p-6 grid md:grid-cols-4 gap-4 items-end">
            <FormField control={form.control} name="bankCode" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-xs font-bold uppercase">Bank Code</FormLabel>
                <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                  <PopoverTrigger asChild><Button variant="outline" className="w-full justify-between">{field.value || "Select Bank"}<ChevronsUpDown className="h-4 w-4 opacity-50"/></Button></PopoverTrigger>
                  <PopoverContent className="p-0 w-[300px]">
                    <Command><CommandInput placeholder="Search bank..."/><CommandList><CommandEmpty>No results</CommandEmpty><CommandGroup>
                      {banks?.map(b => (
                        <CommandItem key={b.code} onSelect={() => { form.setValue("bankCode", b.code); form.setValue("bankName", b.name); setPopoverOpen(false); }}>
                          {b.name} ({b.code})
                        </CommandItem>
                      ))}
                    </CommandGroup></CommandList></Command>
                  </PopoverContent>
                </Popover>
              </FormItem>
            )} />
            <FormField control={form.control} name="bankName" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel className="text-xs font-bold uppercase">Bank Name</FormLabel><Input readOnly {...field} className="bg-white"/></FormItem>
            )} />
            <FormField control={form.control} name="reconciliationDate" render={({ field }) => (
              <FormItem><FormLabel className="text-xs font-bold uppercase">Date</FormLabel><Input type="date" {...field} className="bg-white"/></FormItem>
            )} />
          </CardContent>
        </Card>

        <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="additions" title="Bank Additions" label="Outstanding Checks" /></CardContent></Card>
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="deductions" title="Bank Deductions" label="Deposits in Transit" /></CardContent></Card>
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="bookAdditions" title="Book Additions" label="Interest/Direct Credits" /></CardContent></Card>
          <Card><CardContent className="p-6"><DynamicItemList control={form.control} name="bookDeductions" title="Book Deductions" label="Bank Charges/Direct Debits" /></CardContent></Card>
        </div>

        <div ref={printRef} className="rounded-xl border shadow-xl bg-white overflow-hidden max-w-[210mm] mx-auto">
          <div className="no-print bg-slate-900 text-white p-4 flex justify-between items-center text-xs font-bold uppercase">
            <span>Statement Preview</span>
            <div className="flex gap-4">
              <div className="flex flex-col"><span>Bank Bal</span><Controller control={form.control} name="balanceAsPerBank" render={({ field }) => <input type="number" {...field} className="bg-transparent text-right w-24 border-none p-0 focus:ring-0" />} /></div>
              <div className="flex flex-col border-l border-slate-700 pl-4"><span>Book Bal</span><Controller control={form.control} name="balanceAsPerBook" render={({ field }) => <input type="number" {...field} className="bg-transparent text-right w-24 border-none p-0 focus:ring-0" />} /></div>
            </div>
          </div>
          <SummaryCalculation control={form.control} reportHeading={settingsData?.reportHeading} />
        </div>

        <div className="no-print fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-center gap-6 shadow-lg z-50">
          <Button type="button" variant="outline" onClick={handleDownloadPdf} className="h-12 px-8 font-bold uppercase text-xs"><FileDown className="mr-2 h-4 w-4" /> Download PDF</Button>
          <Button type="submit" className="h-12 px-12 font-bold uppercase text-xs"><Save className="mr-2 h-4 w-4" /> {isEditMode ? "Update" : "Save"}</Button>
        </div>
      </form>
    </Form>
  );
}
