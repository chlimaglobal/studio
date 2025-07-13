'use client';

import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CircleUser, Menu, Wallet, LayoutDashboard, ArrowRightLeft, BarChart3, Settings, Mic, QrCode, Plus, CreditCard, Activity, Target } from 'lucide-react';
import { AddTransactionDialog } from './add-transaction-dialog';
import { ThemeToggle } from './theme-toggle';
import { QrScannerDialog } from './qr-scanner-dialog';
import { useToast } from '@/hooks/use-toast';
import { AudioTransactionDialog } from './audio-transaction-dialog';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { z } from 'zod';
import { TransactionFormSchema } from '@/lib/types';
import { extractTransactionInfoFromText } from '@/app/actions';

export default function DashboardHeader() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [initialData, setInitialData] = useState<Partial<z.infer<typeof TransactionFormSchema>> | undefined>(undefined);

  const [audioOpen, setAudioOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const handleTransactionExtracted = (data: Partial<z.infer<typeof TransactionFormSchema>>) => {
    setInitialData(data);
    setAddTransactionOpen(true);
  };
  
  const handleOpenAddTransaction = () => {
    setInitialData(undefined);
    setAddTransactionOpen(true);
  }

  const handleLogout = () => {
    toast({
      title: 'Logout Realizado',
      description: 'Você saiu da sua conta. Redirecionando...',
    });
    router.push('/');
  };

  const handleSupport = () => {
     toast({
      title: 'Suporte',
      description: 'Em breve, você será redirecionado para a página de suporte.',
    });
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Alternar Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs">
          <SheetHeader className="text-left">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Navegue pelas seções do aplicativo.</SheetDescription>
          </SheetHeader>
          <nav className="grid gap-6 text-lg font-medium mt-4">
            <Link
              href="/dashboard"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Wallet className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">FinanceFlow</span>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <LayoutDashboard className="h-5 w-5" />
              Painel
            </Link>
             <Link href="/dashboard/cards" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <CreditCard className="h-5 w-5" />
              Cartões
            </Link>
            <Link href="/dashboard/goals" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Target className="h-5 w-5" />
              Metas
            </Link>
            <Link href="/dashboard/analysis" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Activity className="h-5 w-5" />
              Análise
            </Link>
            <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => toast({ title: 'Em breve!', description: 'A página de Transações será implementada.'})}>
              <ArrowRightLeft className="h-5 w-5" />
              Transações
            </Link>
            <Link href="#" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground" onClick={() => toast({ title: 'Em breve!', description: 'A página de Relatórios será implementada.'})}>
              <BarChart3 className="h-5 w-5" />
              Relatórios
            </Link>
            <Link href="/dashboard/settings" className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground">
              <Settings className="h-5 w-5" />
              Configurações
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex w-full items-center gap-4">
        <h1 className="text-xl font-semibold sm:text-2xl flex-1">Painel</h1>
        <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAudioOpen(true)}>
              <Mic className="mr-2 h-4 w-4" />
              Usar Voz
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              Escanear Nota
            </Button>
          <Button size="sm" className="gap-1" onClick={handleOpenAddTransaction}>
            <Plus className="h-4 w-4" />
            Adicionar Transação
          </Button>

        </div>
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary" size="icon" className="rounded-full">
              <CircleUser className="h-5 w-5" />
              <span className="sr-only">Alternar menu do usuário</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/dashboard/settings')}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleSupport}>
              Suporte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AddTransactionDialog open={addTransactionOpen} onOpenChange={setAddTransactionOpen} initialData={initialData} />
      <AudioTransactionDialog open={audioOpen} onOpenChange={setAudioOpen} onTransactionExtracted={handleTransactionExtracted} />
      <QrScannerDialog open={qrOpen} onOpenChange={setQrOpen} onTransactionExtracted={handleTransactionExtracted} />
    </header>
  );
}
