"use client";

import { useForm, useFieldArray, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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


const itemSchema = z.object({
  narration: z.string().min(1, "Narration is required."),
  amount: z.coerce.number().min(0, "Amount must be positive."),
});

const reconciliationSchema = z.object({
  bankCode: z.string().min(1, "Bank code is required."),
  bankName: z.string(),
  reconciliationDate: z.string().min(1, "Date is required."),
  balanceAsPerBank: z.coerce.number(),
  // Bank Side
  additions: z.array(itemSchema),
  deductions: z.array(itemSchema),
  // Book Side
  bookAdditions: z.array(itemSchema),
  bookDeductions: z.array(itemSchema),
  balanceAsPerBook: z.coerce.number(),
});


type ReconciliationFormValues = z.infer<typeof reconciliationSchema>;

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
}) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name,
  });

  return (
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

const SummaryCalculation = ({ control, reportHeading }: { control: any, reportHeading?: string }) => {
  const formValues = useWatch({ control });

  // Bank side calculations
  const totalBankAdditions = useMemo(() => (formValues.additions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [formValues.additions]);
  const totalBankDeductions = useMemo(() => (formValues.deductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [formValues.deductions]);
  const correctedBankBalance = useMemo(() => (Number(formValues.balanceAsPerBank) || 0) + totalBankAdditions - totalBankDeductions, [formValues.balanceAsPerBank, totalBankAdditions, totalBankDeductions]);

  // Book side calculations
  const totalBookAdditions = useMemo(() => (formValues.bookAdditions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [formValues.bookAdditions]);
  const totalBookDeductions = useMemo(() => (formValues.bookDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0), [formValues.bookDeductions]);
  const correctedBookBalance = useMemo(() => (Number(formValues.balanceAsPerBook) || 0) + totalBookAdditions - totalBookDeductions, [formValues.balanceAsPerBook, totalBookAdditions, totalBookDeductions]);

  const difference = useMemo(() => correctedBankBalance - correctedBookBalance, [correctedBankBalance, correctedBookBalance]);


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
                <h4 className="font-bold">Balance as per Bank end of the period</h4>
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
                <h4 className="font-bold">Corrected Balance end of the period</h4>
                <span className="w-40 text-right font-bold">{correctedBankBalance.toFixed(2)}</span>
            </div>
        </div>

        {/* --- Book Section --- */}
        <div className="space-y-2 pt-4">
             <div className="flex justify-between items-center border-b-2 border-black pb-1">
                <h4 className="font-bold">Balance as per Book end of the period</h4>
                 <FormField
                    control={control}
                    name="balanceAsPerBook"
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
                <div className="col-span-2">Credit on Bank Records Without corresponding Debit Ledger records:</div>
            </div>
             { (formValues.bookAdditions || []).map((item:any, index:number) => (
                <div key={`book_add_${index}`} className="grid grid-cols-[auto,1fr,160px] items-center pl-8">
                    <div/>
                    <div>{item.narration}</div>
                    <div className="text-right pr-1">{Number(item.amount).toFixed(2)}</div>
                </div>
             ))}
             <div className="grid grid-cols-[auto,1fr,160px] items-center">
                <div/>
                <div className="text-right font-bold pr-2">Total amount A:</div>
                <div className="text-right border-t border-black font-bold">{totalBookAdditions.toFixed(2)}</div>
             </div>

            <div className="grid grid-cols-[auto,1fr,160px] items-center pt-2">
                <div className="font-bold pr-2">Less:</div>
                <div className="col-span-2">Debit on Bank Records Without corresponding Credit Ledger records:</div>
            </div>
             { (formValues.bookDeductions || []).map((item:any, index:number) => (
                <div key={`book_deduct_${index}`} className="grid grid-cols-[auto,1fr,160px] items-center pl-8">
                    <div/>
                    <div>{item.narration}</div>
                    <div className="text-right pr-1">{Number(item.amount).toFixed(2)}</div>
                </div>
             ))}
             <div className="grid grid-cols-[auto,1fr,160px] items-center">
                <div/>
                <div className="text-right font-bold pr-2">Total amount B:</div>
                <div className="text-right border-t border-black font-bold">({totalBookDeductions.toFixed(2)})</div>
             </div>

             <div className="flex justify-between items-center border-t-2 border-black pt-2 mt-2">
                <h4 className="font-bold">Corrected Balance end of the period</h4>
                <span className="w-40 text-right font-bold">{correctedBookBalance.toFixed(2)}</span>
            </div>
        </div>

        <div className="flex justify-end items-center pt-4">
            <h4 className="font-bold text-red-600">Difference</h4>
            <div className="w-40 text-right font-bold border-2 border-black ml-4 p-1">{difference.toFixed(2)}</div>
        </div>

        {/* Footer */}
        <div className="hidden print:block pt-24">
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="border-t border-black pt-2">Prepared by</p>
                    <p className="mt-2">Assistant Accountant</p>
                </div>
                 <div>
                    <p className="border-t border-black pt-2">Verified by</p>
                     <p className="mt-2">Accountant</p>
                </div>
                 <div>
                    <p className="border-t border-black pt-2">Approved by</p>
                     <p className="mt-2">AGM(Finance)</p>
                </div>
            </div>
        </div>

      </CardContent>
    </Card>
  )
}

export function ReconciliationForm({
  isEditMode = false,
  defaultValues,
  reconciliationId,
}: {
  isEditMode?: boolean;
  defaultValues?: Partial<ReconciliationFormValues>;
  reconciliationId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const printRef = useRef(null);
  
  const firestore = useFirestore();
  const { user } = useUser();
  const banksCollectionRef = useMemoFirebase(() => collection(firestore, 'banks'), [firestore]);
  const { data: banks, isLoading: banksLoading } = useCollection<{code: string, name: string}>(banksCollectionRef);
  
  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'report'), [firestore]);
  const { data: settingsData } = useDoc<{ reportHeading: string }>(settingsRef);


  const bankOptions = useMemo(() => {
    if (!banks) return [];
    return banks.map(bank => ({ value: bank.code, label: `${bank.name}`}));
  }, [banks]);

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: {
      bankCode: "",
      bankName: "",
      reconciliationDate: new Date().toISOString().split("T")[0],
      balanceAsPerBank: 0,
      additions: [],
      deductions: [],
      balanceAsPerBook: 0,
      bookAdditions: [],
      bookDeductions: [],
    },
  });

  useEffect(() => {
    if (isEditMode && defaultValues) {
        const valuesToReset = {
            ...defaultValues,
            reconciliationDate: defaultValues.reconciliationDate ? new Date(defaultValues.reconciliationDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            additions: defaultValues.additions || [],
            deductions: defaultValues.deductions || [],
            bookAdditions: defaultValues.bookAdditions || [],
            bookDeductions: defaultValues.bookDeductions || [],
        };
        form.reset(valuesToReset);
    }
  }, [isEditMode, defaultValues, form]);

  const { setValue, control } = form;

  const bankCode = useWatch({ control, name: 'bankCode'});

  useEffect(() => {
    const selectedBank = banks?.find(b => b.code === bankCode);
    if (selectedBank) {
      setValue("bankName", selectedBank.name);
    }
  }, [bankCode, setValue, banks]);

  const onSubmit = (data: ReconciliationFormValues) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to save a reconciliation.",
        });
        return;
    }
    
    const totalBankAdditions = (data.additions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalBankDeductions = (data.deductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const correctedBankBalance = (Number(data.balanceAsPerBank) || 0) + totalBankAdditions - totalBankDeductions;
  
    const totalBookAdditions = (data.bookAdditions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const totalBookDeductions = (data.bookDeductions || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const correctedBookBalance = (Number(data.balanceAsPerBook) || 0) + totalBookAdditions - totalBookDeductions;
  
    const difference = correctedBankBalance - correctedBookBalance;

    const payload = {
        ...data,
        userId: user.uid,
        reconciliationMonth: new Date(data.reconciliationDate).toLocaleString('default', { month: 'long', year: 'numeric' }),
        totalAdditions: totalBankAdditions,
        totalDeductions: totalBankDeductions,
        correctedBalance: correctedBankBalance,
        totalBookAdditions,
        totalBookDeductions,
        correctedBookBalance,
        difference,
        updatedAt: serverTimestamp(),
    };

    if (isEditMode && reconciliationId) {
        const reconciliationRef = doc(firestore, `users/${user.uid}/reconciliations`, reconciliationId);
        updateDocumentNonBlocking(reconciliationRef, payload);
    } else {
        const reconciliationsRef = collection(firestore, `users/${user.uid}/reconciliations`);
        addDocumentNonBlocking(reconciliationsRef, {...payload, createdAt: serverTimestamp()});
    }

    toast({
      title: `Statement ${isEditMode ? "Updated" : "Saved"}`,
      description: "Your reconciliation has been successfully processed.",
    });
    router.push("/reconciliations");
  };

  const handleDownloadPdf = async () => {
    const element = printRef.current;
    if (!element) return;
  
    // Temporarily apply print styles for PDF generation
    document.body.classList.add('print-styles-active');
    
    const canvas = await html2canvas(element, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: true,
    });
  
    // Remove print styles
    document.body.classList.remove('print-styles-active');
    
    const imgData = canvas.toDataURL('image/png');
    
    // Inches to points conversion (1 inch = 72 points)
    const topMargin = 0.25 * 72;
    const bottomMargin = 0.25 * 72;
    const leftMargin = 1.25 * 72;
    const rightMargin = 0.5 * 72;
  
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
  
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate the available width and height for the image on the PDF
    const contentWidth = pdfWidth - leftMargin - rightMargin;
    const contentHeight = pdfHeight - topMargin - bottomMargin;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate the aspect ratio of the canvas
    const ratio = canvasWidth / canvasHeight;
    
    // Calculate the height of the image on the PDF to maintain aspect ratio
    let imgHeight = contentWidth / ratio;
    let imgWidth = contentWidth;

    // If the calculated height is greater than the available content height,
    // recalculate width based on content height to fit the page.
    if (imgHeight > contentHeight) {
      imgHeight = contentHeight;
      imgWidth = imgHeight * ratio;
    }
  
    pdf.addImage(imgData, 'PNG', leftMargin, topMargin, imgWidth, imgHeight);
    pdf.save(`reconciliation-${reconciliationId || 'new'}.pdf`);
  };

  return (
    <Form {...form}>
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
          </CardContent>
        </Card>

        {/* --- DYNAMIC ITEMS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
            <Card>
                <CardContent className="p-6 space-y-6">
                    <DynamicItemList
                        control={control}
                        name="additions"
                        title="Bank Balance Additions"
                        label="Add: Debit on Ledger Records Without corresponding Credit Bank records"
                    />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 space-y-6">
                     <DynamicItemList
                        control={control}
                        name="deductions"
                        title="Bank Balance Deductions"
                        label="Less: Credit on Ledger Records Without corresponding Debit Bank records"
                    />
                </CardContent>
            </Card>
             <Card>
                <CardContent className="p-6 space-y-6">
                    <DynamicItemList
                        control={control}
                        name="bookAdditions"
                        title="Book Balance Additions"
                        label="Add: Credit on Bank Records Without corresponding Debit Ledger records"
                    />
                </CardContent>
            </Card>
            <Card>
                <CardContent className="p-6 space-y-6">
                     <DynamicItemList
                        control={control}
                        name="bookDeductions"
                        title="Book Balance Deductions"
                        label="Less: Debit on Bank Records Without corresponding Credit Ledger records"
                    />
                </CardContent>
            </Card>
        </div>

        <div ref={printRef}>
            <SummaryCalculation control={control} reportHeading={settingsData?.reportHeading} />
        </div>


        <div className="flex justify-end no-print gap-4">
          <Button type="button" variant="outline" onClick={handleDownloadPdf}>Download as PDF</Button>
          <Button type="submit">{isEditMode ? "Save Changes" : "Save Reconciliation"}</Button>
        </div>
      </form>
    </Form>
  );
}

    