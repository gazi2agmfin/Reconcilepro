"use client";

import { useForm, useFieldArray, Controller, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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

  return (
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
  };

  return (
    <Form {...form}>
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
