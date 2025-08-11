
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center bg-background p-4 sm:p-8">
      <div className="w-full max-w-4xl">
        <header className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Política de Privacidade</h1>
            <p className="text-muted-foreground">Última atualização: [Data]</p>
          </div>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo à nossa Política de Privacidade</CardTitle>
            <CardDescription>
              Sua privacidade é importante para nós. É política do FinanceFlow respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96 pr-4">
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.
                </p>
                <h3 className="font-semibold text-foreground">1. Informações que Coletamos</h3>
                <p>
                  As informações que coletamos incluem, mas não se limitam a, seu nome, endereço de e-mail e dados de transações financeiras que você insere no aplicativo.
                </p>
                <h3 className="font-semibold text-foreground">2. Como Usamos Suas Informações</h3>
                <p>
                  Usamos as informações que coletamos para operar e manter os recursos do FinanceFlow, para fornecer a você os recursos e funcionalidades do aplicativo, e para nos comunicarmos diretamente com você.
                </p>
                <h3 className="font-semibold text-foreground">3. Compartilhamento de Informações</h3>
                <p>
                  Não compartilhamos suas informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.
                </p>
                 <h3 className="font-semibold text-foreground">4. Segurança dos Dados</h3>
                <p>
                  A segurança dos seus dados é importante para nós, mas lembre-se que nenhum método de transmissão pela Internet ou método de armazenamento eletrônico é 100% seguro. Embora nos esforcemos para usar meios comercialmente aceitáveis para proteger suas informações pessoais, não podemos garantir sua segurança absoluta.
                </p>
                <p className="mt-6 font-semibold text-foreground">
                  O uso continuado de nosso aplicativo será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contato conosco.
                </p>
                <p className="mt-4 text-xs italic">
                  [Este é um texto de modelo. É altamente recomendável que você consulte um profissional jurídico para criar uma política de privacidade que se adeque às especificidades do seu negócio e às leis aplicáveis.]
                </p>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
