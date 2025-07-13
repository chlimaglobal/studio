
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, BarChart3, Settings, Wallet, CreditCard, Activity, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/transactions', icon: ArrowRightLeft, label: 'Transações' },
  { href: '/dashboard/cards', icon: CreditCard, label: 'Cartões' },
  { href: '/dashboard/goals', icon: Target, label: 'Metas' },
  { href: '/dashboard/analysis', icon: Activity, label: 'Análise' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Relatórios' },
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
                    pathname === item.href && item.href !== '#' && 'bg-accent text-accent-foreground',
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
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 py-4">
           <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/dashboard/settings"
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    pathname === '/dashboard/settings' && 'bg-accent text-accent-foreground'
                  )}
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Configurações</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">Configurações</TooltipContent>
            </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
