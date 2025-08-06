
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Fuel, MessageCircle, Wallet, ArrowLeft, Star, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/components/client-providers';


const Logo = () => (
    <div className="p-4 bg-secondary/50 rounded-2xl inline-block shadow-inner">
        <div className="text-3xl font-bold tracking-tight" style={{ textShadow: '1px 1px 2px hsl(var(--muted))' }}>
            <span className="text-foreground">Finance</span>
            <span className="text-primary"> $ </span>
            <span className="text-foreground">Flow</span>
        </div>
    </div>
);

const PremiumBlocker = () => (
    <Card className="text-center w-full max-w-md">
        <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Recurso Premium
            </CardTitle>
            <CardDescription>
                A assistente Lúmina no WhatsApp é um recurso exclusivo para assinantes.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
                Faça o upgrade do seu plano para registrar despesas e obter insights diretamente do seu WhatsApp.
            </p>
            <Button asChild>
                <Link href="/dashboard/pricing">Ver Planos</Link>
            </Button>
        </CardContent>
    </Card>
);

export default function WhatsAppPage() {
  const router = useRouter();
  const whatsappLink = "https://wa.me/5585997635718";
  const { isSubscribed, isLoading } = useSubscription();

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col items-center text-center space-y-8 px-4 py-2">
        
        <div className="w-full flex justify-start">
             <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
        </div>

        <Logo />

        {!isSubscribed ? <PremiumBlocker /> : (
            <>
                <div className="w-full max-w-sm mx-auto p-4 rounded-xl shadow-lg bg-secondary/30" style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-4c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63-2c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm54-3c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM28 63c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-6-22c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3z' fill='%232e2e2e' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`
                }}>
                    <div className="space-y-3">
                        <div className="flex justify-end">
                            <div className="bg-green-200/80 text-gray-900 rounded-lg rounded-br-none p-3 max-w-xs">
                                <p>quanto gastei de combustivel este mes?</p>
                                <div className="flex items-center justify-end text-xs text-gray-500 mt-1">
                                    <span>6:13 da tarde</span>
                                    <Check className="w-4 h-4 ml-1 text-blue-500" />
                                    <Check className="w-4 h-4 -ml-2 text-blue-500" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-start">
                            <div className="bg-card text-card-foreground rounded-lg rounded-bl-none p-3 max-w-xs shadow">
                                <p className="flex items-center">
                                    No mês de junho de 2025, você gastou o total de R$ 100,00 com Combustível <Fuel className="w-4 h-4 ml-1.5 text-primary"/>
                                </p>
                                <div className="flex items-center justify-end text-xs text-muted-foreground mt-1">
                                    <span>6:14 da tarde</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h1 className="text-3xl font-bold tracking-tight">Sua assistente Lúmina no <span className="text-primary">WhatsApp</span></h1>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Isso mesmo. A Lúmina está sempre disponível para você diretamente no WhatsApp!
                    </p>
                    <p className="text-muted-foreground max-w-md mx-auto">
                        Você pode enviar mensagens, áudios, fotos de comprovantes e muito mais. Tudo que você cadastrar no assistente aparecerá no aplicativo no celular e vice-versa.
                    </p>
                </div>

                <Link href={whatsappLink} passHref legacyBehavior>
                    <a target="_blank" rel="noopener noreferrer" className="w-full max-w-sm">
                        <Button size="lg" className="w-full">
                            <MessageCircle className="mr-2 h-5 w-5" />
                            Conectar com o WhatsApp
                        </Button>
                    </a>
                </Link>
            </>
        )}
    </div>
  );
}
