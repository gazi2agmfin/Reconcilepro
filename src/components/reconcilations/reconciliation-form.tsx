```tsx
"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* -------------------- Schema -------------------- */
const rowSchema = z.object({
  narration: z.string().optional(),
  amount: z.number().optional(),
});

const formSchema = z.object({
  balanceAsPerBank: z.number().optional(),
  balanceAsPerBook: z.number().optional(),
  additions: z.array(rowSchema).optional(),
  deductions: z.array(rowSchema).optional(),
  bookAdditions: z.array(rowSchema).optional(),
  bookDeductions: z.array(rowSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

/* -------------------- Component -------------------- */
export default function ReconciliationForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      additions: [],
      deductions: [],
      bookAdditions: [],
      bookDeductions: [],
    },
  });

  const { register, control, handleSubmit } = form;

  const additions = useFieldArray({ control, name: "additions" });
  const deductions = useFieldArray({ control, name: "deductions" });
  const bookAdditions = useFieldArray({ control, name: "bookAdditions" });
  const bookDeductions = useFieldArray({ control, name: "bookDeductions" });

  /* -------------------- PDF -------------------- */
  const handleDownloadPdf = async () => {
    const element = document.getElementById("print-area");
    if (!element) return;

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("reconciliation.pdf");
  };

  /* -------------------- Excel -------------------- */
  const handleDownloadExcel = async () => {
    try {
      const values = form.getValues();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Reconciliation");

      sheet.columns = [
        { header: "Section", key: "section", width: 20 },
        { header: "Item", key: "item", width: 10 },
        { header: "Narration", key: "narration", width: 50 },
        { header: "Amount", key: "amount", width: 15 },
      ];

      const addRows = (
        section: string,
        rows?: { narration?: string; amount?: number }[]
      ) => {
        (rows ?? []).forEach((row, index) => {
          sheet.addRow({
            section,
            item: index + 1,
            narration: row.narration ?? "",
            amount: row.amount ?? 0,
          });
        });
      };

      addRows("Bank Additions", values.additions);
      addRows("Bank Deductions", values.deductions);
      addRows("Book Additions", values.bookAdditions);
      addRows("Book Deductions", values.bookDeductions);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type:
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "reconciliation.xlsx"
      );
    } catch (e) {
      alert("An error occurred while generating the Excel file.");
    }
  };

  /* -------------------- Row Renderer -------------------- */
  const renderRows = (
    title: string,
    fieldArray: ReturnType<typeof useFieldArray>,
    name: keyof FormValues
  ) => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {fieldArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-center py-1">
            <div className="w-16 text-sm">Item {index + 1}</div>

            <Input
              placeholder="Narration"
              {...register(`${name}.${index}.narration` as const)}
              className="flex-1"
            />

            <Input
              type="number"
              placeholder="Amount"
              {...register(`${name}.${index}.amount` as const, {
                valueAsNumber: true,
              })}
              className="w-32 text-right"
            />

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => fieldArray.remove(index)}
              className="no-print"
            >
              Delete
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => fieldArray.append({})}
        >
          + Add Item
        </Button>
      </CardContent>
    </Card>
  );

  /* -------------------- UI -------------------- */
  return (
    <form onSubmit={handleSubmit(() => {})}>
      <div id="print-area">
        {renderRows("Bank Additions", additions, "additions")}
        {renderRows("Bank Deductions", deductions, "deductions")}
        {renderRows("Book Additions", bookAdditions, "bookAdditions")}
        {renderRows("Book Deductions", bookDeductions, "bookDeductions")}
      </div>

      <div className="flex justify-end gap-4 no-print mt-6">
        <Button type="button" variant="outline" onClick={handleDownloadPdf}>
          Download PDF
        </Button>
        <Button type="button" variant="outline" onClick={handleDownloadExcel}>
          Download Excel
        </Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
```
