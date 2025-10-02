
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, LifeBuoy, Mail, Shield, Lock, KeyRound, MessageCircle, BrainCircuit, DatabaseZap } from 'lucide-react';
import { useRouter } from 'next/navigation';

const supportEmail = 'financeflowsuporte@proton.me';
const emailSubject = "LGPD - Solicitação de Revisão de Decisão Automatizada";
const emailBody = `Prezada equipe de suporte do FinanceFlow,

De acordo com a LGPD, gostaria de solicitar a revisão humana de uma decisão automatizada tomada pela IA Lúmina.

Por favor, descreva aqui a decisão que você gostaria de revisar (ex: meu perfil de investidor, minha análise de saúde financeira, etc.):
[Descreva aqui]


Atenciosamente,
[Seu Nome]
`;

const mailtoLink = `mailto:${supportEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;


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
          <CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5"/> Como Protegemos Seus Dados</CardTitle>
          <CardDescription>
            Estas são as principais camadas de segurança que protegem o FinanceFlow contra acessos não autorizados e vazamentos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <Lock className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Regras de Acesso no Servidor</h3>
                    <p className="text-sm text-muted-foreground">
                        Esta é a nossa defesa mais forte. Usamos as Regras de Segurança do Firebase para garantir que um usuário só possa ler e escrever seus próprios dados. Qualquer tentativa de acessar dados de outra pessoa é bloqueada diretamente no servidor do Google, antes mesmo de chegar ao banco de dados.
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <KeyRound className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Autenticação Segura do Google</h3>
                    <p className="text-sm text-muted-foreground">
                        Seu login é protegido pelo Firebase Authentication, um serviço robusto que gerencia senhas de forma segura e oferece login social (Google), reduzindo os riscos associados ao gerenciamento de senhas.
                    </p>
                </div>
            </div>
             <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                    <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h3 className="font-semibold">Criptografia em Trânsito e em Repouso</h3>
                    <p className="text-sm text-muted-foreground">
                        Todos os seus dados são criptografados com o padrão HTTPS/TLS enquanto viajam entre seu dispositivo e nossos servidores. Uma vez armazenados, eles são novamente criptografados nos servidores seguros do Google Cloud.
                    </p>
                </div>
            </div>
        </CardContent>
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
            <a href={mailtoLink} className="w-full">
                <Button className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Solicitar Revisão Humana
                </Button>
            </a>
        </CardContent>
      </Card>

    </div>
  );
}
