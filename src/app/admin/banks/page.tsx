
"use client";

import { useState, useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, Upload } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';


type Bank = {
  id?: string;
  code: string;
  name: string;
};

export default function AdminBanksPage() {
  const firestore = useFirestore();
  const banksCollectionRef = useMemoFirebase(() => collection(firestore, 'banks'), [firestore]);
  const { data: banks, isLoading } = useCollection<Omit<Bank, 'id'>>(banksCollectionRef);
  const { toast } = useToast();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [currentBank, setCurrentBank] = useState<Bank | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [bankName, setBankName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);


  const sortedBanks = useMemo(() => {
    if (!banks) return [];
    return [...banks].sort((a, b) => a.code.localeCompare(b.code));
  }, [banks]);


  const handleSave = () => {
    if (!bankCode || !bankName) return;

    const payload = { code: bankCode, name: bankName };

    if (currentBank?.id) {
      const bankDocRef = doc(firestore, 'banks', currentBank.id);
      updateDocumentNonBlocking(bankDocRef, payload);
    } else {
      addDocumentNonBlocking(banksCollectionRef, payload);
    }
    setIsFormDialogOpen(false);
  };
  
  const handleDelete = (id: string) => {
    const bankDocRef = doc(firestore, 'banks', id);
    deleteDocumentNonBlocking(bankDocRef);
  };

  const handleDeleteAll = () => {
    if (!banks) return;
    for (const bank of banks) {
      const bankDocRef = doc(firestore, 'banks', bank.id);
      deleteDocumentNonBlocking(bankDocRef);
    }
    toast({
      title: "All Banks Deleted",
      description: "All bank records have been removed.",
    });
  };

  const openFormDialog = (bank: Bank | null) => {
    setCurrentBank(bank);
    setBankCode(bank ? bank.code : "");
    setBankName(bank ? bank.name : "");
    setIsFormDialogOpen(true);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      try {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        let importedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;
        
        for (let i = 1; i < json.length; i++) {
          const row = json[i];
          const code = row[0]?.toString().trim();
          const name = row[1]?.toString().trim();

          if (code && name) {
            const existingBank = banks?.find(b => b.code === code);
            if (!existingBank) {
              addDocumentNonBlocking(banksCollectionRef, { code, name });
              importedCount++;
            } else {
              skippedCount++;
            }
          } else {
            errorCount++;
          }
        }
        
        toast({
          title: "Bulk Import Complete",
          description: `${importedCount} banks imported, ${skippedCount} skipped (already exist), ${errorCount} rows had errors.`,
        });

      } catch (error) {
        console.error("Error parsing file: ", error);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: "There was an error parsing the file. Please ensure it's a valid Excel or CSV file.",
        });
      } finally {
        if(fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  return (
    <>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        className="hidden"
        accept=".xlsx, .xls, .csv"
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Bank List</CardTitle>
                <CardDescription>A list of all supported banks and their codes. The first two columns of the uploaded file should be Code and Name.</CardDescription>
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={triggerFileSelect}>
                    <Upload className="mr-2 h-4 w-4" />
                    Bulk Import
                </Button>
                <Button onClick={() => openFormDialog(null)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Bank
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={!banks || banks.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete All
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all {banks?.length} bank(s) from the database.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll}>Delete All</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank Code</TableHead>
                <TableHead>Bank Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 inline-block" /></TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && sortedBanks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium">{bank.code}</TableCell>
                  <TableCell>{bank.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openFormDialog(bank)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the bank
                                <span className="font-semibold"> {bank.name}</span>.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(bank.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!isLoading && banks?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No banks found. Add one to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
          setCurrentBank(null);
          setBankCode("");
          setBankName("");
        }
        setIsFormDialogOpen(isOpen);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentBank ? "Edit Bank" : "Add New Bank"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="bank-code">Bank Code</Label>
                <Input id="bank-code" value={bankCode} onChange={(e) => setBankCode(e.target.value)} disabled={!!currentBank} />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="bank-name">Bank Name</Label>
                <Input id="bank-name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Bank</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
