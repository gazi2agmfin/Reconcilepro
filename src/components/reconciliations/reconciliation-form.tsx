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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCollection, useFirestore, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { collection, doc, serverTimestamp, getDocs, query, orderBy, limit, writeBatch, updateDoc } from "firebase/firestore";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { subMonths, format, startOfMonth } from 'date-fns';


const itemSchema = z.object({
  narration: z.string().min(1, "Narration is required."),
  amount: z.coerce.number().min(0, "Amount must be positive."),
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
                <Textarea placeholder="Enter narration..." {...field} className="print-hidden"/>
                <span className="hidden print-only">{field.value}</span>
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
                  step="0.0"
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

const SummaryCalculation = ({
  formValues,
  reportHeading,
  totalBankAdditions,
  totalBankDeductions,
  correctedBankBalance,
  totalBookAdditions,
  totalBookDeductions,
  correctedBookBalance,
  difference,
  isEditMode,
}: {
  formValues: ReconciliationFormValues;
  reportHeading?: string;
  totalBankAdditions: number;
  totalBankDeductions: number;
  correctedBankBalance: number;
  totalBookAdditions: number;
  totalBookDeductions: number;
  correctedBookBalance: number;
  difference: number;
  isEditMode?: boolean;
}) => {
  const reconciliationMonth = useMemo(() => {
    if (!formValues.reconciliationDate) return '';
    const date = new Date(formValues.reconciliationDate);
    // Adjust for timezone to avoid off-by-one day errors
    const utcDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    if (isNaN(utcDate.getTime())) return '';
    
    // The reconciliation is FOR the previous month.
    const forMonth = subMonths(utcDate, 1);
    return format(forMonth, 'MMMM yyyy');
  }, [formValues.reconciliationDate]);

  // Dispatch live draft updates so the header can reflect unsaved changes.
  // Previously this only broadcast for new (non-edit) drafts. Change makes
  // the header show live difference while editing an existing reconciliation.
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('reconciliation:differenceDraft', { detail: difference }));
    } catch (e) {
      // ignore in non-browser contexts
    }

    return () => {
      try { window.dispatchEvent(new CustomEvent('reconciliation:differenceDraftCleared')); } catch (e) {}
    };
  }, [difference]);


  return (
    <Card className="print-section">
      <CardContent className="space-y-4">
        <div className="print-only text-center relative">
            <p className="text-xs absolute top-0 left-0">BREB FORM NO.285</p>
            <h2 className="text-xl font-bold">{reportHeading || 'Gazipur Palli Bidyut Samity-2'}</h2>
            <p className="my-0">Rajendrapur,Gazipur</p>
            <div className="w-full inline-block pb-0">
                <p className="font-bold pt-0 pb-0 w-full inline-block">Bank Reconciliation</p>
                <div className="w-full h-px bg-black mt-0"></div>
            </div>
        </div>
        
        <div className="flex justify-between items-start">
            <div className="flex-grow">
                <span className="font-bold">Bank Name:</span> {formValues.bankName}
                <br />
                <span className="font-bold">Bank Code:</span> {formValues.bankCode}
            </div>
            <div className="text-right flex-shrink-0">
                <span className="font-bold">Reconcile Date:</span> {formValues.reconciliationDate ? new Date(formValues.reconciliationDate).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric'}) : ''}
                <br />
                <span className="font-bold">For the month of:</span> {reconciliationMonth}
            </div>
        </div>
        
        <div>
            <div className="flex justify-between items-end border-b-2 border-black pb-1">
                <h4 className="font-bold">Bank Balance end of the period</h4>
                <span className="font-bold w-48 text-right">
                    {Number(formValues.balanceAsPerBank || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
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
             <div className="grid grid-cols-[auto,1fr,160px]">
                <div/>
                <div className="col-span-2 border-b border-black mt-1"></div>
             </div>
             <div className="grid grid-cols-[auto,1fr,160px] items-end">
                <div/>
                <div className="text-right font-bold pr-2">Total amount A:</div>
                <div className="text-right font-bold">{totalBankAdditions.toFixed(2)}</div>
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
              <div className="grid grid-cols-[auto,1fr,160px]">
                <div/>
                <div className="col-span-2 border-b border-black mt-1"></div>
             </div>
             <div className="grid grid-cols-[auto,1fr,160px] items-end">
                <div/>
                <div className="text-right font-bold pr-2">Total amount B:</div>
                <div className="text-right font-bold">({totalBankDeductions.toFixed(2)})</div>
             </div>
             
             <div className="pt-2 mt-2">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold">Corrected Bank Balance end of the period</h4>
                    <span className="w-48 text-right font-bold">{correctedBankBalance.toFixed(2)}</span>
                </div>
                <div className="border-t border-black mt-1"></div>
                <div className="border-t border-black mt-0.5"></div>
            </div>
        </div>

        <div>
             <div className="flex justify-between items-end border-b-2 border-black pb-1">
                <h4 className="font-bold">Book Balance end of the period</h4>
                <span className="font-bold w-48 text-right">
                    {Number(formValues.balanceAsPerBook || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
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
              <div className="grid grid-cols-[auto,1fr,160px]">
                <div/>
                <div className="col-span-2 border-b border-black mt-1"></div>
             </div>
             <div className="grid grid-cols-[auto,1fr,160px] items-end">
                <div/>
                <div className="text-right font-bold pr-2">Total amount A:</div>
                <div className="text-right font-bold">{totalBookAdditions.toFixed(2)}</div>
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
              <div className="grid grid-cols-[auto,1fr,160px]">
                <div/>
                <div className="col-span-2 border-b border-black mt-1"></div>
             </div>
             <div className="grid grid-cols-[auto,1fr,160px] items-end">
                <div/>
                <div className="text-right font-bold pr-2">Total amount B:</div>
                <div className="text-right font-bold">({totalBookDeductions.toFixed(2)})</div>
             </div>

             <div className="pt-2 mt-2">
                <div className="flex justify-between items-center">
                    <h4 className="font-bold">Corrected Book Balance end of the period</h4>
                    <span className="w-48 text-right font-bold">{correctedBookBalance.toFixed(2)}</span>
                </div>
                <div className="border-t border-black mt-1"></div>
                <div className="border-t border-black mt-0.5"></div>
            </div>
        </div>

        <div className="flex justify-end items-center pt-4">
            <h4 className="font-bold text-red-600">Difference</h4>
            <div className="w-48 text-right font-bold border-2 border-black ml-4 p-1">{difference.toFixed(2)}</div>
        </div>

        <div className="print-only pt-24">
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
  defaultValues?: Partial<ReconciliationFormValues & { id: string, statementId: number }>;
  reconciliationId?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [isDuplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateStatementInfo, setDuplicateStatementInfo] = useState<{ statementId: number | string } | null>(null);
  const [isCopyDataDialogOpen, setCopyDataDialogOpen] = useState(false);
  const [previousStatement, setPreviousStatement] = useState<any>(null);
  const dataCopyCheckPerformed = useRef(false);

  
  const firestore = useFirestore();
  const { user } = useUser();
  const banksCollectionRef = useMemoFirebase(() => collection(firestore, 'banks'), [firestore]);
  const { data: banks, isLoading: banksLoading } = useCollection<{id: string; code: string, name: string}>(banksCollectionRef);
  
  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'report'), [firestore]);
  const { data: settingsData } = useDoc<{ reportHeading: string }>(settingsRef);

  const reconciliationsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(firestore, `users/${user.uid}/reconciliations`);
  }, [firestore, user]);
  const { data: allReconciliations } = useCollection(reconciliationsQuery);


  const bankOptions = useMemo(() => {
    if (!banks) return [];
    return banks.map(bank => ({ value: bank.code, label: `${bank.code} - ${bank.name}`}));
  }, [banks]);

  const form = useForm<ReconciliationFormValues>({
    resolver: zodResolver(reconciliationSchema),
    defaultValues: isEditMode ? defaultValues : {
      bankCode: "",
      bankName: "",
      reconciliationDate: new Date().toISOString().split("T")[0],
      balanceAsPerBank: 0,
      additions: [
        { narration: "Deposit-in-Transit", amount: 0 },
        { narration: "Short Deposit", amount: 0 }
      ],
      deductions: [
        { narration: "Outstanding Cheque", amount: 0 },
        { narration: "Excess Deposit", amount: 0 }
      ],
      balanceAsPerBook: 0,
      bookAdditions: [
        { narration: "Bank Interest", amount: 0 },
        { narration: "Remitted from other Accounts", amount: 0 }
      ],
      bookDeductions: [
        { narration: "Revenue stamps", amount: 0 },
        { narration: "Bank Charged", amount: 0 },
        { narration: "Fund Transfer", amount: 0 }
      ],
    },
  });

  useEffect(() => {
    if (isEditMode && defaultValues) {
        const valuesToReset: ReconciliationFormValues = {
            bankCode: defaultValues.bankCode || "",
            bankName: defaultValues.bankName || "",
            reconciliationDate: defaultValues.reconciliationDate ? new Date(defaultValues.reconciliationDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
            balanceAsPerBank: defaultValues.balanceAsPerBank || 0,
            balanceAsPerBook: defaultValues.balanceAsPerBook || 0,
            additions: defaultValues.additions || [],
            deductions: defaultValues.deductions || [],
            bookAdditions: defaultValues.bookAdditions || [],
            bookDeductions: defaultValues.bookDeductions || [],
        };
        form.reset(valuesToReset);
    }
  }, [isEditMode, defaultValues, form]);

  const { setValue, control, watch, reset, getValues, trigger, formState } = form;

  const watchedBankCode = watch('bankCode');
  const watchedReconciliationDate = watch('reconciliationDate');
  const formValues = watch();

  const {
    totalBankAdditions,
    totalBankDeductions,
    correctedBankBalance,
    totalBookAdditions,
    totalBookDeductions,
    correctedBookBalance,
    difference,
  } = useMemo(() => {
    const totalBankAdditions = (formValues.additions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalBankDeductions = (formValues.deductions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const correctedBankBalance = (Number(formValues.balanceAsPerBank) || 0) + totalBankAdditions - totalBankDeductions;
    const totalBookAdditions = (formValues.bookAdditions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const totalBookDeductions = (formValues.bookDeductions || []).reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    const correctedBookBalance = (Number(formValues.balanceAsPerBook) || 0) + totalBookAdditions - totalBookDeductions;
    const difference = correctedBankBalance - correctedBookBalance;
    return { totalBankAdditions, totalBankDeductions, correctedBankBalance, totalBookAdditions, totalBookDeductions, correctedBookBalance, difference };
  }, [formValues]);


  // Effect for handling duplicate and copy logic
  useEffect(() => {
    if (isEditMode || !allReconciliations || !watchedBankCode || !watchedReconciliationDate) {
      setDuplicateStatementInfo(null);
      return;
    }
  
    const currentDate = new Date(watchedReconciliationDate);
    if (isNaN(currentDate.getTime())) return;
    const utcCurrentDate = startOfMonth(new Date(currentDate.valueOf() + currentDate.getTimezoneOffset() * 60000));
  
    const currentMonth = format(utcCurrentDate, 'yyyy-MM');
    const previousMonth = format(subMonths(utcCurrentDate, 1), 'yyyy-MM');
  
    const duplicate = allReconciliations.find((rec: any) => {
      const recDate = new Date(rec.reconciliationDate);
      const utcRecDate = startOfMonth(new Date(recDate.valueOf() + recDate.getTimezoneOffset() * 60000));
      return rec.bankCode === watchedBankCode && format(utcRecDate, 'yyyy-MM') === currentMonth;
    });
  
    if (duplicate) {
      setDuplicateStatementInfo({ statementId: duplicate.statementId });
      setDuplicateDialogOpen(true);
    } else {
      setDuplicateStatementInfo(null);
      setDuplicateDialogOpen(false);
  
      // --- COPY DATA LOGIC ---
      if (!dataCopyCheckPerformed.current) {
        const prevStatement = allReconciliations.find((rec: any) => {
          const recDate = new Date(rec.reconciliationDate);
          const utcRecDate = startOfMonth(new Date(recDate.valueOf() + recDate.getTimezoneOffset() * 60000));
          return rec.bankCode === watchedBankCode && format(utcRecDate, 'yyyy-MM') === previousMonth;
        });

        if (prevStatement) {
          setPreviousStatement(prevStatement);
          setCopyDataDialogOpen(true);
        }
        dataCopyCheckPerformed.current = true; // Mark as checked for this combination
      }
    }
  }, [watchedBankCode, watchedReconciliationDate, allReconciliations, isEditMode]);


  // Reset copy check flag when bank/date changes
  useEffect(() => {
    dataCopyCheckPerformed.current = false;
  }, [watchedBankCode, watchedReconciliationDate]);


  useEffect(() => {
    const selectedBank = banks?.find(b => b.code === watchedBankCode);
    if (selectedBank) {
      setValue("bankName", selectedBank.name);
    } else {
      setValue("bankName", "");
    }
  }, [watchedBankCode, setValue, banks]);

  const getNextStatementId = async (userId: string) => {
    const reconciliationsRef = collection(firestore, `users/${userId}/reconciliations`);
    const q = query(reconciliationsRef, orderBy('statementId', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return 1;
    }
    const lastStatement = querySnapshot.docs[0].data();
    return (lastStatement.statementId || 0) + 1;
  };

  const handleSave = async (data: ReconciliationFormValues): Promise<string | undefined> => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to save a reconciliation.",
      });
      return;
    }
  
    const date = new Date(data.reconciliationDate);
    const utcDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    const forMonth = subMonths(utcDate, 1);
  
    const payload: any = {
      ...data,
      userId: user.uid,
      reconciliationMonth: format(forMonth, 'MMMM yyyy'),
      totalAdditions: totalBankAdditions,
      totalDeductions: totalBankDeductions,
      correctedBalance: correctedBankBalance,
      totalBookAdditions,
      totalBookDeductions,
      correctedBookBalance,
      difference,
      updatedAt: serverTimestamp(),
    };
  
    try {
      if (isEditMode && reconciliationId) {
        const reconciliationRef = doc(firestore, `users/${user.uid}/reconciliations`, reconciliationId);
        await updateDoc(reconciliationRef, payload);
        return reconciliationId;
      } else {
        const batch = writeBatch(firestore);
        const newReconRef = doc(collection(firestore, `users/${user.uid}/reconciliations`));
        const nextStatementId = await getNextStatementId(user.uid);
        
        payload.statementId = nextStatementId;
        payload.createdAt = serverTimestamp();
        
        batch.set(newReconRef, payload);
        await batch.commit();
        return newReconRef.id;
      }
    } catch(error) {
      console.error("Save failed", error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the reconciliation.' });
      return undefined;
    }
  };

  const onSubmit = async (data: ReconciliationFormValues) => {
    const savedId = await handleSave(data);
    if (savedId) {
      toast({
        title: `Statement ${isEditMode ? "Updated" : "Saved"}`,
        description: "Your reconciliation has been successfully processed.",
      });
      router.push("/reconciliations");
    }
  };

  const handleDownloadPdf = async () => {
    // First, trigger validation
    const isValid = await trigger();
    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Invalid Form",
        description: "Please fix the errors before downloading.",
      });
      return;
    }
    
    // Get current form data and save it
    const data = getValues();
    const savedId = await handleSave(data);
    
    // Only proceed to PDF generation if save was successful
    if (!savedId) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: "Could not save the reconciliation before creating PDF.",
      });
      return;
    }
    
    // If this was a new reconciliation, update the router to reflect the new ID
    if (!isEditMode) {
      router.replace(`/reconciliations/${savedId}/edit`, { scroll: false });
    }
    
    // Proceed with PDF generation
    const sourceElement = printRef.current;
    if (!sourceElement) return;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '210mm';
    document.body.appendChild(container);

    const clonedElement = sourceElement.cloneNode(true) as HTMLElement;
    container.appendChild(clonedElement);

    document.body.classList.add('print-styles-active');
    
    const canvas = await html2canvas(clonedElement, {
      scale: 2,
      useCORS: true,
      logging: true,
    });
  
    document.body.classList.remove('print-styles-active');
    document.body.removeChild(container);
    
    const imgData = canvas.toDataURL('image/png');
    
    const a4Width = 595.28;
    const a4Height = 841.89;
  
    const topMargin = 36;
    const bottomMargin = 36;
    const leftMargin = 90;
    const rightMargin = 36;
  
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });
  
    const contentWidth = a4Width - leftMargin - rightMargin;
    const contentHeight = a4Height - topMargin - bottomMargin;
    
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let finalImgWidth = contentWidth;
    let finalImgHeight = finalImgWidth / canvasAspectRatio;

    if (finalImgHeight > contentHeight) {
      finalImgHeight = contentHeight;
      finalImgWidth = finalImgHeight * canvasAspectRatio;
    }
  
    pdf.addImage(imgData, 'PNG', leftMargin, topMargin, finalImgWidth, finalImgHeight);
    pdf.save(`reconciliation-${savedId}.pdf`);
  };
  
  const handleDuplicateDialogClose = () => {
    form.setValue("bankCode", "");
    setDuplicateDialogOpen(false);
  };
  
  const handleCopyData = () => {
    if (!previousStatement) return;
    
    const currentDate = form.getValues('reconciliationDate');
    const currentBankCode = form.getValues('bankCode');
    const currentBankName = form.getValues('bankName');

    const newFormValues: ReconciliationFormValues = {
        reconciliationDate: currentDate,
        bankCode: currentBankCode,
        bankName: currentBankName,
        balanceAsPerBank: previousStatement.correctedBalance || 0,
        balanceAsPerBook: previousStatement.correctedBookBalance || 0,
        additions: (previousStatement.additions || []).map((item: any) => ({ ...item })),
        deductions: (previousStatement.deductions || []).map((item: any) => ({ ...item })),
        bookAdditions: (previousStatement.bookAdditions || []).map((item: any) => ({ ...item })),
        bookDeductions: (previousStatement.bookDeductions || []).map((item: any) => ({ ...item })),
    };
    
    reset(newFormValues);
    setCopyDataDialogOpen(false);
    toast({
        title: "Data Copied",
        description: "Data from the previous month has been copied. Please review all amounts."
    })
  };

  const isSaveDisabled = !isEditMode && !!duplicateStatementInfo;

  return (
    <>
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
                              : "Select or type bank"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search by bank code or name..." />
                          <CommandList>
                          {banksLoading && <CommandEmpty>Loading banks...</CommandEmpty>}
                          {!banksLoading && <CommandEmpty>No bank found.</CommandEmpty>}
                          <CommandGroup>
                            {bankOptions.map((option) => (
                              <CommandItem
                                value={option.label}
                                key={option.value}
                                onSelect={() => {
                                  form.setValue("bankCode", option.value);
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
              <FormField
                  control={control}
                  name="balanceAsPerBank"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Balance as per Bank</FormLabel>
                      <FormControl>
                      <Input type="number" step="0.01" {...field} />
                      </FormControl>
                  </FormItem>
                  )}
              />
              <FormField
                  control={control}
                  name="balanceAsPerBook"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Balance as per Book</FormLabel>
                      <FormControl>
                      <Input type="number" step="0.01" {...field} />
                      </FormControl>
                  </FormItem>
                  )}
              />
            </CardContent>
          </Card>

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
              <SummaryCalculation
                formValues={formValues}
                reportHeading={settingsData?.reportHeading}
                totalBankAdditions={totalBankAdditions}
                totalBankDeductions={totalBankDeductions}
                correctedBankBalance={correctedBankBalance}
                totalBookAdditions={totalBookAdditions}
                totalBookDeductions={totalBookDeductions}
                correctedBookBalance={correctedBookBalance}
                  difference={difference}
                  isEditMode={isEditMode}
              />
          </div>


          <div className="flex justify-end no-print gap-4">
            <Button 
                type="button" 
                variant="outline" 
                onClick={handleDownloadPdf}
                disabled={formState.isSubmitting || difference !== 0}
            >
                {formState.isSubmitting ? 'Saving...' : 'Save & Download PDF'}
            </Button>
            <Button type="submit" disabled={isSaveDisabled || formState.isSubmitting}>
              {formState.isSubmitting ? 'Saving...' : (isSaveDisabled ? "Duplicate Exists" : (isEditMode ? "Save Changes" : "Save Reconciliation"))}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={isDuplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Reconciliation Detected</AlertDialogTitle>
            <AlertDialogDescription>
                A reconciliation for this bank and month (Statement #{duplicateStatementInfo?.statementId}) already exists. 
                Saving is disabled. Please change the bank or date to continue.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={handleDuplicateDialogClose}>OK</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCopyDataDialogOpen} onOpenChange={setCopyDataDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Previous Reconciliation Found</AlertDialogTitle>
                <AlertDialogDescription>
                    We found a reconciliation from last month for this bank. Would you like to copy the balances and item narrations to this new statement? The amounts will be set to 0.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCopyDataDialogOpen(false)}>No, Start Fresh</AlertDialogCancel>
                <AlertDialogAction onClick={handleCopyData}>Yes, Copy Data</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
