
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload } from 'lucide-react';
import Link from 'next/link';
import React, { useRef } from 'react';

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: 'Arquivo Selecionado',
        description: `${file.name} está pronto para ser processado pela IA.`,
      });
      // TODO: Implementar a lógica de upload e processamento do arquivo aqui
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex items-center gap-4">
        <Link href="/dashboard/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Importar extratos</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <p className="text-muted-foreground">
          Use o botão abaixo para selecionar o seu extrato exportado do banco.
        </p>
        <p className="text-sm text-muted-foreground">
          Arquivos suportados: OFX, CSV, PDF.
        </p>
        <div className="w-full max-w-sm pt-4">
           <Input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
            accept=".ofx,.csv,.pdf"
          />
          <Button size="lg" className="w-full" onClick={handleFileButtonClick}>
            <Upload className="mr-2 h-5 w-5" />
            Carregar arquivo
          </Button>
        </div>
      </div>
    </div>
  );
}
