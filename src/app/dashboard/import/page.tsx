
'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload, Loader2, Save, Star } from 'lucide-react';
import Link from 'next/link';
import React, { useRef, useState, useTransition } from 'react';
import type { ExtractedTransaction } from '@/lib/types';
import { useTransactions, useSubscription, useAuth } from '@/components/client-providers';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { runFlow } from 'genkit';
import { extractFromFile } from '@/ai/flows/extract-from-file';

const PremiumBlocker = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Recurso Premium
                </CardTitle>
                <CardDescription>
                    A importação de extratos com a Lúmina é um recurso exclusivo para assinantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Faça o upgrade do seu plano para importar transações de arquivos PDF, CSV e OFX automaticamente.
                </p>
                <Button asChild>
                    <a href="/dashboard/pricing">Ver Planos</a>
                </Button>
            </CardContent>
        </Card>
    </div>
);

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { addTransaction } = useTransactions();
  const [isProcessing, startProcessingTransition] = useTransition();
  const [extractedData, setExtractedData] = useState<ExtractedTransaction[]>([]);
  const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
  const { user } = useAuth();
  const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: 'Arquivo Selecionado',
        description: `Processando ${file.name} com a Lúmina...`,
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        startProcessingTransition(async () => {
          try {
            const result = await runFlow(extractFromFile, { fileContent: content, fileName: file.name });
            if (result.transactions) {
              setExtractedData(result.transactions);
              toast({
                title: 'Extração Concluída!',
                description: `${result.transactions.length} transações foram extraídas. Revise e salve.`,
              });
            } else {
              throw new Error('A Lúmina não conseguiu extrair transações.');
            }
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Erro na Extração',
              description: 'Não foi possível processar o arquivo. Verifique o formato ou tente novamente.',
            });
          }
        });
      };
      reader.readAsDataURL(file); // Read as data URL for Genkit flow
    }
  };

  const handleSaveAll = () => {
    if (extractedData.length === 0) return;

    let savedCount = 0;
    extractedData.forEach((t) => {
      try {
        const transactionData = {
          description: t.description,
          amount: t.amount,
          date: new Date(t.date),
          type: t.type,
          category: t.category,
          paid: true,
        };
        addTransaction(transactionData);
        savedCount++;
      } catch (e) {
        console.error("Failed to save transaction:", t, e);
      }
    });

    toast({
      title: 'Transações Salvas!',
      description: `${savedCount} de ${extractedData.length} transações foram importadas com sucesso.`,
    });
    setExtractedData([]); // Clear the table after saving
  };

  if (isSubscriptionLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <header className="flex items-center gap-4">
        <Link href="/dashboard/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-6 w-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold">Importar extratos</h1>
      </header>

      {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : 
        !extractedData || extractedData.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
            <p className="text-muted-foreground">
              Use o botão abaixo para selecionar o seu extrato exportado do banco.
            </p>
            <p className="text-sm text-muted-foreground">
              Arquivos suportados: OFX, CSV, PDF. A Lúmina tentará entender o formato.
            </p>
            <div className="w-full max-w-sm pt-4">
              <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept=".ofx,.csv,.pdf"
                disabled={isProcessing}
              />
              <Button size="lg" className="w-full" onClick={handleFileButtonClick} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-5 w-5" />
                )}
                {isProcessing ? 'Processando...' : 'Carregar arquivo'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
                  <Button onClick={handleSaveAll} disabled={isProcessing}>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Todas as Transações
                  </Button>
            </div>
            <div className="rounded-md border">
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {extractedData.map((t, index) => (
                          <TableRow key={index}>
                              <TableCell>{new Date(t.date).toLocaleDateString()}</TableCell>
                              <TableCell>{t.description}</TableCell>
                              <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                              <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                  {formatCurrency(t.amount)}
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
            </div>
          </div>
        )}
    </div>
  );
}
