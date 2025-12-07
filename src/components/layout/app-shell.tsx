import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SiteSidebarContent } from "@/components/layout/sidebar";
import { SiteHeader } from "@/components/layout/header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SiteSidebarContent />
      </Sidebar>
      <SidebarInset>
        <SiteHeader />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
