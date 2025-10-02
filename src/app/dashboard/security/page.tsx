
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Shield, Lock, KeyRound, MessageCircle, Fingerprint, Mail, BrainCircuit } from 'lucide-react';
import { useRouter } from 'next/navigation';

const supportEmail = 'financeflowsuporte@proton.me';

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
            Entenda como seus dados são protegidos e utilizados.
          </p>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
        <CardHeader>
          <CardTitle>Sua confiança é a nossa prioridade.</CardTitle>
          <CardDescription>
            Utilizamos tecnologia de ponta e padrões rigorosos para garantir que seus dados sejam seus, e de mais ninguém.
          </CardDescription>
        </CardHeader>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5"/> Transparência no Uso da Lúmina (IA)</CardTitle>
          <CardDescription>
             De acordo com a LGPD (Art. 20), você tem direito à transparência sobre como a Lúmina, nossa IA, utiliza seus dados para gerar análises.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
             <div>
                <h3 className="font-semibold text-foreground">Análise Financeira e Dicas</h3>
                <p className="text-muted-foreground">
                    Para gerar o diagnóstico de saúde financeira, sugestões de economia e análise de tendências, a Lúmina processa seu histórico de transações (descrição, valor, data, tipo e categoria).
                </p>
            </div>
             <div>
                <h3 className="font-semibold text-foreground">Análise de Perfil de Investidor</h3>
                <p className="text-muted-foreground">
                   Para determinar seu perfil de risco, a Lúmina utiliza as respostas fornecidas por você no questionário de suitability. Nenhum outro dado é utilizado para esta finalidade.
                </p>
            </div>
             <div>
                <h3 className="font-semibold text-foreground">Sugestão de Categoria e Extração de Dados</h3>
                <p className="text-muted-foreground">
                   Ao extrair dados de texto, áudio ou arquivos, a Lúmina utiliza apenas o conteúdo que você fornece para identificar e categorizar as transações.
                </p>
            </div>
             <div>
                <h3 className="font-semibold text-foreground">Mural do Casal</h3>
                <p className="text-muted-foreground">
                   No mural, a Lúmina considera o histórico da conversa e o histórico geral de transações de ambos para oferecer conselhos contextuais e proativos.
                </p>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direito à Revisão de Decisão Automatizada</CardTitle>
          <CardDescription>
            Você tem o direito de solicitar a revisão de qualquer decisão tomada pela Lúmina (como a definição do seu perfil de investidor ou a sua saúde financeira) por uma pessoa da nossa equipe.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <a href={`mailto:${supportEmail}?subject=LGPD%20-%20Solicitação%20de%20Revisão%20de%20Decisão%20Automatizada`} className="w-full">
                <Button className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Solicitar Revisão Humana
                </Button>
            </a>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Nossas Camadas de Proteção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Criptografia Abrangente</h3>
                    <p className="text-sm text-muted-foreground">
                        Todos os seus dados são protegidos por criptografia tanto em trânsito (enquanto viajam pela internet) quanto em repouso (armazenados em nossos servidores).
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Proteção de Senha</h3>
                    <p className="text-sm text-muted-foreground">
                        Sua senha é transformada em um código ilegível (hash). Nem mesmo nós conseguimos vê-la.
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
                        Seus dados biométricos nunca saem do seu dispositivo. Usamos as APIs seguras do sistema operacional para verificar sua identidade localmente.
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
