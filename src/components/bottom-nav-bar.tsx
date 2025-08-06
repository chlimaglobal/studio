
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, BarChart3, UserCircle, HandCoins, ShieldCheck, Star, LineChart } from 'lucide-react';
import { useSubscription } from '@/components/client-providers';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', premium: false },
  { href: '/dashboard/transactions', icon: ArrowRightLeft, label: 'Transações', premium: false },
  { href: '/dashboard/investments', icon: LineChart, label: 'Investimentos', premium: true },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Relatórios', premium: false },
  { href: '/dashboard/profile', icon: UserCircle, label: 'Perfil', premium: false },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { isSubscribed } = useSubscription();

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
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group relative',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.premium && !isSubscribed && (
                <Star className="absolute top-1 right-3 h-3 w-3 text-amber-500 fill-amber-400" />
              )}
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
