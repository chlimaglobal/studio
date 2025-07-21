import DashboardHeader from '@/components/dashboard-header';
import BottomNavBar from '@/components/bottom-nav-bar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The min-h-screen and bg-background are to ensure the whole page has the dark theme
    <div className="flex flex-col min-h-screen w-full bg-background">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {children}
      </main>
      <BottomNavBar />
    </div>
  );
}
