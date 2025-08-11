
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Termos de Uso</h1>
            <p className="text-muted-foreground">Última atualização: [Data]</p>
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Termos e Condições de Uso</CardTitle>
            <CardDescription>
              Ao acessar o aplicativo FinanceFlow, você concorda em cumprir estes termos de serviço, todas as leis e regulamentos aplicáveis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-4 text-muted-foreground">
                <h3 className="font-semibold text-foreground">1. Uso da Licença</h3>
                <p>
                  É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no aplicativo FinanceFlow, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título.
                </p>
                <h3 className="font-semibold text-foreground">2. Isenção de Responsabilidade</h3>
                <p>
                  Os materiais no aplicativo FinanceFlow são fornecidos 'como estão'. O FinanceFlow não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias.
                </p>
                <h3 className="font-semibold text-foreground">3. Limitações</h3>
                <p>
                  Em nenhum caso o FinanceFlow ou seus fornecedores serão responsáveis por quaisquer danos (incluindo, sem limitação, danos por perda de dados ou lucro, ou devido a interrupção dos negócios) decorrentes do uso ou da incapacidade de usar os materiais no FinanceFlow.
                </p>
                 <h3 className="font-semibold text-foreground">4. Modificações</h3>
                <p>
                  O FinanceFlow pode revisar estes termos de serviço para seu aplicativo a qualquer momento, sem aviso prévio. Ao usar este aplicativo, você concorda em ficar vinculado à versão atual desses termos de serviço.
                </p>
                <p className="mt-4 text-xs italic">
                  [Este é um texto de modelo. É altamente recomendável que você consulte um profissional jurídico para criar termos de uso que se adeque às especificidades do seu negócio e às leis aplicáveis.]
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
