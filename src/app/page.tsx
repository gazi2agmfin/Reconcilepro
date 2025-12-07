
'use client';
import { AuthCard } from '@/components/auth/auth-card';
import { LoginForm } from '@/components/auth/login-form';

const ReconcileProIcon = () => (
    <div className="p-2 bg-primary rounded-lg">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5V10H2V6.5Z"/><path d="M2 14h20v3.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5V14Z"/><path d="M11 10.5 8 7h8l-3 3.5"/><path d="m7 14 3 3.5 4-3.5"/></svg>
    </div>
);

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex items-center gap-3 mb-8">
        <ReconcileProIcon />
        <h1 className="text-4xl font-bold font-headline text-foreground">
          ReconcilePro
        </h1>
      </div>
      <AuthCard>
        <LoginForm />
      </AuthCard>
      <p className="text-center text-sm text-muted-foreground mt-8 max-w-sm">
       A streamlined bank reconciliation tool.
      </p>
    </main>
  );
}
