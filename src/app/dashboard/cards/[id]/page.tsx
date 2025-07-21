
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, History, ArrowUp, ArrowDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
};


export default function CardDetailsPage({ params }: { params: { id: string } }) {
  const cardName = decodeURIComponent(params.id);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link href="/dashboard/cards" passHref>
            <Button variant="ghost" size="icon">
                <ChevronLeft className="h-6 w-6" />
            </Button>
        </Link>
        <div className="text-center">
            <h1 className="text-lg font-semibold">21 de Julho de 2025</h1>
            <p className="text-xs text-muted-foreground">0:12</p>
        </div>
        <Button variant="ghost" size="icon">
          <History className="h-6 w-6" />
        </Button>
      </header>

      {/* Card Info */}
      <div className="px-4 space-y-2 mb-4">
        <div className="flex items-center gap-3">
            <div className="rounded-md bg-white/10 p-1.5">
                <Image src="https://placehold.co/24x24.png" alt="Nu Icon" width={24} height={24} data-ai-hint="bank logo" />
            </div>
            <div>
                <p className="font-semibold">{cardName}</p>
                <p className="text-sm text-green-400">{formatCurrency(1200)}</p>
            </div>
        </div>
        <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">{formatCurrency(1268.88)}</span>
        </div>
      </div>

       {/* Filters */}
       <div className="px-4 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Mesma titularidade?</span>
                <Switch />
            </div>
             <div className="flex items-center justify-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="font-semibold text-sm w-24 text-center bg-primary/20 text-primary py-1 px-3 rounded-md">
                    junho / 25
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                <ChevronRight className="h-5 w-5" />
                </Button>
            </div>
       </div>

        {/* Summary Cards */}
        <div className="px-4 grid grid-cols-3 gap-3 text-left mb-4">
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center gap-2">
                     <div className="w-4 h-4 rounded-full border-2 border-green-400"></div>
                    <CardTitle className="text-xs font-normal text-muted-foreground">Recebidos</CardTitle>
                </CardHeader>
                <CardContent className="p-1">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(2880.90)}</p>
                </CardContent>
            </Card>
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-red-500"></div>
                    <CardTitle className="text-xs font-normal text-muted-foreground">Despesas</CardTitle>
                </CardHeader>
                <CardContent className="p-1">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(909.00)}</p>
                </CardContent>
            </Card>
            <Card className="bg-secondary p-3">
                <CardHeader className="p-1 flex-row items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-green-400" />
                    <CardTitle className="text-xs font-normal text-muted-foreground">Previsto</CardTitle>
                </CardHeader>
                <CardContent className="p-1">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(1971.90)}</p>
                </CardContent>
            </Card>
      </div>


      {/* Transactions List */}
      <div className="flex-1 overflow-y-auto px-4">
        <div className="border border-border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-muted-foreground">
                <div className="text-left">Valor</div>
                <div className="text-left">Tipo</div>
                <div className="text-right">Pago</div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
                 <div className="text-left font-semibold">{formatCurrency(1320.00)}</div>
                 <div className="text-left text-sm flex items-center gap-2">
                     <ArrowDown className="h-4 w-4 text-green-400 bg-green-400/20 p-0.5 rounded-full"/>
                     <span>À vista</span>
                 </div>
                 <div className="text-right">
                    <Switch defaultChecked={true} />
                 </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-center">
                 <div className="text-left font-semibold">{formatCurrency(1560.90)}</div>
                 <div className="text-left text-sm">
                    <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-400/20 text-green-400">8/12</Badge>
                        <span>Recorrente</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Mensal</p>
                 </div>
                 <div className="text-right">
                    <Switch defaultChecked={true} />
                 </div>
            </div>
        </div>
      </div>

       {/* FAB and Action Button */}
       <div className="p-4 flex items-center justify-center gap-4">
            <Button className="flex-1 bg-primary/80 hover:bg-primary text-lg font-bold">
                também
            </Button>
            <Button size="icon" className="rounded-full h-14 w-14 bg-primary text-primary-foreground text-3xl">+</Button>
       </div>
    </div>
  );
}
