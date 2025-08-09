
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useSubscription } from '@/components/client-providers';
import { ArrowLeft, Loader2, MessageSquare, Send, Sparkles, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

const exampleMessages = [
    { from: 'user', text: 'Amor, viu o gasto com o iFood ontem? Acho que precisamos rever nosso orçamento de delivery.', time: '14:30' },
    { from: 'lumina', text: 'Analisando seus gastos, vocês gastaram R$ 280 com delivery nos últimos 30 dias. Reduzir em 2 pedidos por semana poderia economizar cerca de R$ 150 por mês. Que tal definirmos uma meta de R$ 120 para o próximo mês?', time: '14:31' },
    { from: 'partner', text: 'Ótima ideia, Lúmina! Eu topo. Podemos cozinhar mais em casa no fim de semana.', time: '14:35' },
];

const PremiumBlocker = () => (
    <div className="flex flex-col h-full items-center justify-center">
        <Card className="text-center w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Recurso Premium
                </CardTitle>
                <CardDescription>
                    O Mural de Mensagens com a Lúmina é um recurso exclusivo para assinantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                    Faça o upgrade do seu plano para discutir finanças com seu parceiro(a) e receber insights da Lúmina.
                </p>
                <Button asChild>
                    <Link href="/dashboard/pricing">Ver Planos</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
);


export default function MuralPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [message, setMessage] = useState('');
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    
    if (isSubscriptionLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando...</span>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 p-4 sticky top-0 bg-background z-10 border-b">
                 <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <MessageSquare />
                        Mural de Mensagens
                    </h1>
                    <p className="text-sm text-muted-foreground">Converse sobre finanças e receba dicas da Lúmina.</p>
                </div>
            </header>

            {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                 <div className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">
                            {exampleMessages.map((msg, index) => (
                                <div key={index} className={`flex items-end gap-3 ${msg.from === 'user' ? 'justify-end' : ''}`}>
                                    {msg.from !== 'user' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.from === 'lumina' ? '/lumina-avatar.png' : '/partner-avatar.png'} />
                                            <AvatarFallback>{msg.from === 'lumina' ? 'L' : 'P'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                                        msg.from === 'user' ? 'bg-primary text-primary-foreground' : 
                                        msg.from === 'lumina' ? 'bg-secondary' : 'bg-muted'
                                    }`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className="text-xs opacity-70 mt-1 text-right">{msg.time}</p>
                                    </div>
                                    {msg.from === 'user' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={user?.photoURL || undefined} />
                                            <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                        <div className="flex items-center gap-2">
                            <Input 
                                placeholder="Digite sua mensagem ou pergunte para a Lúmina..." 
                                className="flex-1"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <Button>
                                <Send className="h-5 w-5"/>
                            </Button>
                             <Button variant="outline" size="icon" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
                                <Sparkles className="h-5 w-5"/>
                            </Button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
}

