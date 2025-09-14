
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, KeyRound, MessageCircle, Fingerprint } from 'lucide-react';
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
                    <h3 className="font-semibold">Criptografia Abrangente</h3>
                    <p className="text-sm text-muted-foreground">
                        Todos os seus dados são protegidos por criptografia tanto em trânsito (enquanto viajam pela internet) quanto em repouso (armazenados em nossos servidores). Utilizamos algoritmos padrão da indústria para garantir que nenhuma informação sensível possa ser acessada ou comprometida por terceiros não autorizados.
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
                        Sua senha é transformada em um código ilegível (hash) usando um algoritmo robusto. Isso significa que sua senha nunca é armazenada em texto plano. Nem mesmo nós conseguimos vê-la.
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Fingerprint className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Acesso por Biometria</h3>
                    <p className="text-sm text-muted-foreground">
                        Seus dados biométricos (impressão digital ou reconhecimento facial) nunca saem do seu dispositivo. O aplicativo utiliza as APIs seguras do sistema operacional para verificar sua identidade localmente, garantindo uma camada extra de proteção sem comprometer sua privacidade.
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
