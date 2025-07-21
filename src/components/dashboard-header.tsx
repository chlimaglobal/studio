
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

const LogoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 20V14.5C4 13.0667 4.58333 11.8333 5.75 10.8C6.91667 9.76667 8.33333 9.25 10 9.25C11.6667 9.25 13.0833 9.76667 14.25 10.8C15.4167 11.8333 16 13.0667 16 14.5V20H11V14.5C11 14.0333 10.85 13.65 10.55 13.35C10.25 13.05 9.86667 12.9 9.4 12.9C8.93333 12.9 8.55 13.05 8.25 13.35C7.95 13.65 7.8 14.0333 7.8 14.5V20H4ZM12 8L15.3 4H19.5L14 9.5L18 13V15.5L12 8Z" fill="white"/>
    </svg>
)

export default function DashboardHeader() {
  const currentDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between bg-background px-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon">
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
            <p className="text-sm font-semibold capitalize">{currentDate}</p>
            <p className="text-xs text-muted-foreground">0:12</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <LogoIcon />
        <div className='flex items-center gap-2'>
            <div className="rounded-md bg-white/10 p-1.5">
                <Image src="https://placehold.co/24x24.png" alt="Nu Icon" width={18} height={18} data-ai-hint="bank logo" />
            </div>
            <Avatar className="h-8 w-8">
                <AvatarImage src="https://placehold.co/40x40.png" alt="User Avatar" data-ai-hint="person" />
                <AvatarFallback>U</AvatarFallback>
            </Avatar>
        </div>
      </div>
    </header>
  );
}
