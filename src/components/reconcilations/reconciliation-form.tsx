"use client";

import React from "react";
import { useForm, useFieldArray, Controller, useWatch, Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PlusCircle, Trash2, Download, AlertCircle } from "lucide-react";
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
} from "@/components/ui/form";

/* ----------------------------- SCHEMA ----------------------------- */

const itemSchema = z.object({
  narration: z.string().min(1, "Required"),
  amount: z.coerce.number().min(0),
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
    <Card className="shadow-sm border-slate-200 bg-white">
      <CardContent className="p-5 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 tracking-tight">{title}</h3>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-start">
            <span className="w-5 pt-2 text-xs font-bold text-slate-300">{index + 1}.</span>
            
            <div className="flex-1">
              <Controller
                control={control}
                name={`${name}.${index}.narration`}
                render={({ field }) => (
                  <Textarea {...field} placeholder="Description" className="min-h-[40px] text-sm resize-none" />
                )}
              />
            </div>

            <div className="w-32">
              <Controller
                control={control}
                name={`${name}.${index}.amount`}
                render={({ field }) => (
                  <Input 
                    {...field} 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    className="text-right text-sm font-mono" 
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                )}
              />
            </div>

            <div className="flex gap-1 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50"
                onClick={() => append({ narration: "", amount: 0 })}
              >
                <PlusCircle className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-500 hover:bg-rose-50"
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

/* ----------------------------- MAIN FORM ---------------------------- */

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

  // Safe Math Helpers
  const sum = (arr: any[] = []) => 
    arr.reduce((t, i) => t + (Number(i?.amount) || 0), 0);

  const correctedBank = (Number(values.balanceAsPerBank) || 0) + sum(values.additions) - sum(values.deductions);
  const correctedBook = (Number(values.balanceAsPerBook) || 0) + sum(values.bookAdditions) - sum(values.bookDeductions);
  const diff = Math.round((correctedBank - correctedBook) * 100) / 100;

  /* EXCEL GENERATION (Error-Free) */
  const handleDownloadExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Format Summary Data
      const summaryData = [
        ["BANK RECONCILIATION REPORT"],
        ["Date Generated:", new Date().toLocaleString()],
        [],
        ["PARTICULARS", "AMOUNT"],
        ["Balance as per Bank Statement", Number(values.balanceAsPerBank || 0).toFixed(2)],
        ["(+) Bank Additions", sum(values.additions).toFixed(2)],
        ["(-) Bank Deductions", `(${sum(values.deductions).toFixed(2)})`],
        ["ADJUSTED BANK BALANCE", correctedBank.toFixed(2)],
        [],
        ["Balance as per General Ledger (Book)", Number(values.balanceAsPerBook || 0).toFixed(2)],
        ["(+) Book Additions", sum(values.bookAdditions).toFixed(2)],
        ["(-) Book Deductions", `(${sum(values.bookDeductions).toFixed(2)})`],
        ["ADJUSTED BOOK BALANCE", correctedBook.toFixed(2)],
        [],
        ["NET DIFFERENCE", diff.toFixed(2)],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Summary");

      // Add Detail Sheets
      const sections = [
        { name: "Bank_Additions", data: values.additions },
        { name: "Bank_Deductions", data: values.deductions },
        { name: "Book_Additions", data: values.bookAdditions },
        { name: "Book_Deductions", data: values.bookDeductions }
      ];

      sections.forEach(sec => {
        const rows = (sec.data || []).map(item => ({
          Description: String(item.narration || ""),
          Amount: Number(item.amount || 0).toFixed(2)
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, ws, sec.name);
      });

      XLSX.writeFile(workbook, `Reconciliation_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      console.error("Excel generation failed:", err);
      alert("Error generating Excel file. Check console for details.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit((data) => console.log(data))} className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">ReconcilePro</h1>
            <p className="text-sm text-slate-500 font-medium">Bank Reconciliation Statement Manager</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadExcel} className="h-10 font-bold border-2">
              <Download className="mr-2 h-4 w-4" /> Download Excel
            </Button>
            <Button type="submit" size="sm" className="h-10 font-bold px-6 bg-slate-900">
              Save Report
            </Button>
          </div>
        </div>

        {/* Base Balances */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="border-2 border-slate-100 shadow-none">
            <CardContent className="p-4">
              <FormField
                control={control}
                name="balanceAsPerBank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Balance as per Bank Statement</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="text-lg font-mono" /></FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          <Card className="border-2 border-slate-100 shadow-none">
            <CardContent className="p-4">
              <FormField
                control={control}
                name="balanceAsPerBook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold text-slate-700">Balance as per Book (Ledger)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} className="text-lg font-mono" /></FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Items Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <DynamicItemList control={control} name="additions" title="Bank Additions" label="Deposits in Transit" />
          <DynamicItemList control={control} name="deductions" title="Bank Deductions" label="Outstanding Checks" />
          <DynamicItemList control={control} name="bookAdditions" title="Book Additions" label="Interest / Direct Credits" />
          <DynamicItemList control={control} name="bookDeductions" title="Book Deductions" label="Bank Fees / Direct Debits" />
        </div>

        {/* Result Summary */}
        <Card className="bg-slate-900 text-white shadow-xl border-none">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="space-y-1">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Adjusted Bank Balance</p>
                <p className="text-2xl font-mono">{correctedBank.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="space-y-1 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8">
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Adjusted Book Balance</p>
                <p className="text-2xl font-mono">{correctedBook.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-lg flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Difference</p>
                  <p className={`text-3xl font-black font-mono ${Math.abs(diff) < 0.01 ? "text-emerald-400" : "text-rose-400"}`}>
                    {diff.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
                {Math.abs(diff) >= 0.01 && <AlertCircle className="text-rose-400 h-8 w-8" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}