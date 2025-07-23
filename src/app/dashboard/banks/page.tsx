'use client';

import { Button } from '@/components/ui/button';
import { Landmark, PlusCircle } from 'lucide-react';

export default function BanksPage() {

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Landmark className="h-6 w-6" />
            Minhas Contas
          </h1>
          <p className="text-muted-foreground">Gerencie suas contas bancárias em um só lugar.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Banco
        </Button>
      </div>
      
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <Landmark className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma conta cadastrada</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
                Adicione sua primeira conta bancária para começar a organizar.
            </p>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Conta
            </Button>
        </div>
    </div>
  );
}
