
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowUpDown, TrendingDown, CreditCard, Landmark, ArrowUp, ArrowDown } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/transactions', icon: ArrowDown, label: 'Recebimentos' },
  { href: '/dashboard/reports', icon: ArrowUp, label: 'Despesas' },
  { href: '/dashboard/cards', icon: CreditCard, label: 'Cartão' },
  { href: '/dashboard/goals', icon: Landmark, label: 'Bancos' },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-20 bg-secondary border-t border-border">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className={cn(
                  'p-3 rounded-lg',
                  isActive && 'bg-primary/20'
              )}>
                 <item.icon className="w-6 h-6" />
              </div>
              <span className={cn(
                  'text-xs mt-1',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
