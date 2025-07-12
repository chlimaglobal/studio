import MainSidebar from '@/components/main-sidebar';
import DashboardHeader from '@/components/dashboard-header';
import BottomActionBar from '@/components/bottom-action-bar';

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
        <BottomActionBar />
      </div>
    </div>
  );
}
