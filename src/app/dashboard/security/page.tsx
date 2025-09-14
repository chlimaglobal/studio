'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, KeyRound, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SecurityPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Segurança e Privacidade
          </h1>
          <p className="text-muted-foreground">
            Entenda como seus dados são protegidos.
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
        <CardHeader>
          <CardTitle>Segurança que você pode confiar, com a simplicidade que você merece.</CardTitle>
          <CardDescription>
            A confiança começa com a segurança. Utilizamos tecnologia de ponta e padrões rigorosos para garantir que cada transação seja segura e que seus dados sejam seus, e de mais ninguém.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Nossas Camadas de Proteção</CardTitle>
          <CardDescription>
             Adotamos diferentes camadas de proteção para garantir a privacidade e segurança das suas transações e dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Criptografia em Trânsito (Data-in-Transit)</h3>
                    <p className="text-sm text-muted-foreground">
                        Toda a comunicação entre seu dispositivo e nossos servidores, incluindo as conversas no mural, é protegida com criptografia TLS, a mesma tecnologia usada por bancos.
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Criptografia de Chaves Públicas e Privadas</h3>
                    <p className="text-sm text-muted-foreground">
                        Utilizamos um sistema robusto de chaves para autenticação, garantindo que apenas as partes autorizadas possam acessar as informações.
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Proteção de Senha com Bcrypt</h3>
                    <p className="text-sm text-muted-foreground">
                        Sua senha é transformada em um código ilegível (hash) usando o algoritmo Bcrypt. Isso significa que sua senha nunca é armazenada ou registrada em texto plano. Nem mesmo nós conseguimos vê-la.
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
