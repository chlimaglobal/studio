'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, BarChart3, Settings, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '#', icon: ArrowRightLeft, label: 'Transações', disabled: true },
  { href: '#', icon: BarChart3, label: 'Relatórios', disabled: true },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

export default function MainSidebar() {
  const pathname = usePathname();
  const { toast } = useToast();

  const handleDisabledClick = (e: React.MouseEvent<HTMLAnchorElement>, label: string) => {
    e.preventDefault();
    toast({
      title: 'Em breve!',
      description: `A página de ${label} será implementada em breve.`,
    });
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 py-4">
          <Link
            href="/dashboard"
            className="group mb-2 flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Wallet className="h-5 w-5 transition-all group-hover:scale-110" />
            <span className="sr-only">FinanceFlow</span>
          </Link>
          {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  onClick={(e) => item.disabled && handleDisabledClick(e, item.label)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    pathname === item.href && 'bg-accent text-accent-foreground',
                    item.disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
}
