import { ReconciliationForm } from "@/components/reconciliations/reconciliation-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewReconciliationPage() {
    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold font-headline">New Reconciliation Statement</h1>
                <p className="text-muted-foreground">Fill in the details to create a new statement.</p>
            </div>

            <ReconciliationForm />
        </div>
    );
}
