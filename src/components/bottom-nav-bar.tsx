
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, ArrowRightLeft, BarChart3, UserCircle, MessageSquare, LineChart, Star } from 'lucide-react';
import { useSubscription, useAuth, useMural } from '@/components/client-providers';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Painel', premium: false },
  { href: '/dashboard/transactions', icon: ArrowRightLeft, label: 'Transações', premium: false },
  { href: '/dashboard/mural', icon: MessageSquare, label: 'Mural', premium: true },
  { href: '/dashboard/reports', icon: BarChart3, label: 'Relatórios', premium: false },
  { href: '/dashboard/investments', icon: LineChart, label: 'Investimentos', premium: true },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const { isSubscribed, isLoading } = useSubscription();
  const { user } = useAuth();
  const { hasUnread } = useMural();
  const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

  return (
    <div className="fixed bottom-0 left-0 z-40 w-full bg-secondary border-t border-border">
      <div className="grid h-20 max-w-lg grid-cols-5 mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          
          const isItemDisabled = item.premium && !isSubscribed && !isAdmin;

          return (
            <Link
              key={item.label}
              href={isItemDisabled ? '/dashboard/pricing' : item.href}
              className={cn(
                'inline-flex flex-col items-center justify-center px-5 hover:bg-muted group relative',
                isActive ? 'text-primary' : 'text-muted-foreground',
                isItemDisabled ? 'cursor-not-allowed opacity-60' : ''
              )}
            >
              <div className="relative">
                <div className={cn(
                    'p-2 rounded-lg transition-colors duration-200',
                     isActive ? 'bg-primary/20' : ''
                )}>
                   <item.icon className="w-6 h-6" />
                </div>
                 {item.premium && !isSubscribed && !isAdmin && (
                    <Star className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                 )}
                {item.href === '/dashboard/mural' && hasUnread && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-secondary" />
                )}
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
        <div className="absolute bottom-1 right-1/2 translate-x-1/2 text-[9px] text-muted-foreground/50 font-mono tracking-widest" style={{ textShadow: '0 0 1px hsl(var(--background))' }}>
            CH LIMA Tecnologia
        </div>
    </div>
  );
}
