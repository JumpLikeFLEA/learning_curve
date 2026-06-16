import { SidebarProvider } from "@/app/components/ui/sidebar";
import { AppSidebar } from "@/app/components/AppSidebar";
import { Topbar } from "@/app/components/Topbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-h-svh flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-5 py-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
