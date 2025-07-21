import BottomNavBar from '@/components/bottom-nav-bar';
import { AddTransactionFab } from '@/components/add-transaction-fab';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The min-h-screen and bg-background are to ensure the whole page has the dark theme
    <div className="flex flex-col min-h-screen w-full bg-background relative">
      <main className="flex-1 overflow-y-auto pb-24 p-4 pt-0">
        {children}
      </main>
      <AddTransactionFab />
      <BottomNavBar />
    </div>
  );
}
