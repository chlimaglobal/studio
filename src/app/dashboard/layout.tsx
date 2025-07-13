import MainSidebar from '@/components/main-sidebar';
import DashboardHeader from '@/components/dashboard-header';
import FloatingActionButton from '@/components/floating-action-button';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <MainSidebar />
      <div className="flex flex-1 flex-col sm:pl-14">
        <DashboardHeader />
        <main className="flex-1 p-4 sm:p-6 pb-20 sm:pb-6">{children}</main>
        <FloatingActionButton />
        <footer className="text-center p-4 text-xs text-muted-foreground">
          Marc Incorporação TEC - 2025 - ©™
        </footer>
      </div>
    </div>
  );
}
