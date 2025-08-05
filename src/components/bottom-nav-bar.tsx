
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, BarChart3, UserCircle, HandCoins, ShieldCheck } from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel' },
  { href: '/dashboard/transactions', icon: ArrowRightLeft, label: 'Transações' },
  { href: '/dashboard/budgets', icon: ShieldCheck, label: 'Orçamentos' },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Relatórios' },
  { href: '/dashboard/profile', icon: UserCircle, label: 'Perfil' },
];

export default function BottomNavBar() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full h-20 bg-secondary border-t border-border">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
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
                  'p-2 rounded-lg transition-colors duration-200',
                   isActive ? 'bg-primary/20' : ''
              )}>
                 <item.icon className="w-6 h-6" />
              </div>
              <span className={cn(
                  'text-[10px] mt-1 font-medium transition-colors duration-200',
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
