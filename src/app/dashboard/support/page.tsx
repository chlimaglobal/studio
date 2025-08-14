
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, LifeBuoy, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

const supportEmail = 'financeflowsuporte@proton.me';

export default function SupportPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LifeBuoy className="h-6 w-6" />
            Suporte e Ajuda
          </h1>
          <p className="text-muted-foreground">
            Encontrou algum problema ou tem alguma sugestão? Fale conosco.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entre em Contato</CardTitle>
          <CardDescription>
            Nossa equipe de suporte está disponível para ajudar. A melhor forma de nos contatar é por e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
            <Mail className="h-10 w-10 text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Nosso e-mail de suporte é:</p>
            <p className="text-lg font-semibold text-primary">{supportEmail}</p>
          </div>
          <a href={`mailto:${supportEmail}?subject=Suporte%20FinanceFlow`} className="w-full">
            <Button className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Enviar E-mail para o Suporte
            </Button>
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
