import AppShell from '@/components/layout/app-shell';

export default function ReconciliationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
