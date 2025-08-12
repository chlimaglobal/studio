
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useSubscription, useTransactions } from '@/components/client-providers';
import { ArrowLeft, Loader2, MessageSquare, Send, Sparkles, Star, Mic } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { generateSuggestion } from '@/ai/flows/mural-chat';
import type { ChatMessage, MuralChatInput } from '@/lib/types';
import { onChatUpdate, addChatMessage } from '@/lib/storage';
import { AudioMuralDialog } from '@/components/audio-mural-dialog';

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

const featureAnnouncements = [
    {
        id: 'feature_mural_welcome',
        text: "Olá! Notei que vocês chegaram ao nosso novo Mural. Este é um espaço para conversarem sobre suas finanças e contarem com minha ajuda para alcançar seus objetivos juntos. O que vocês gostariam de discutir hoje?"
    },
    {
        id: 'feature_budgets_announcement',
        text: "Novidade! Agora vocês podem definir orçamentos mensais para suas categorias de gastos. Acessem a tela de 'Orçamentos' no menu de perfil para começar a planejar!"
    }
];


export default function MuralPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { transactions } = useTransactions();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    const [isLuminaThinking, setIsLuminaThinking] = useState(false);
    const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
    const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false);

    const saveMessage = useCallback(async (role: 'user' | 'partner' | 'lumina', text: string, authorName?: string, authorPhotoUrl?: string) => {
        if (!user || !text.trim()) return;

        const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role,
            text,
            authorName: authorName || user.displayName || 'Usuário',
            authorPhotoUrl: authorPhotoUrl || user.photoURL || '',
        };

        await addChatMessage(user.uid, newMessage);

        if (role === 'user') {
            setMessage('');
        }
    }, [user]);

     const sendFeatureAnnouncements = useCallback(async () => {
        if (typeof window === 'undefined') return;

        for (const announcement of featureAnnouncements) {
            const hasBeenSent = localStorage.getItem(announcement.id);
            if (!hasBeenSent) {
                // Wait a bit before sending the message to make it feel more natural
                await new Promise(resolve => setTimeout(resolve, 1500));
                await saveMessage('lumina', announcement.text, 'Lúmina', '/lumina-avatar.png');
                localStorage.setItem(announcement.id, 'true');
            }
        }
    }, [saveMessage]);


    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            const unsubscribe = onChatUpdate(user.uid, (newMessages) => {
                setMessages(newMessages);
            });
            sendFeatureAnnouncements();
            return () => unsubscribe();
        }
    }, [user, isSubscribed, isAdmin, sendFeatureAnnouncements]);

    useEffect(() => {
        if (scrollAreaViewportRef.current) {
            scrollAreaViewportRef.current.scrollTop = scrollAreaViewportRef.current.scrollHeight;
        }
    }, [messages, isLuminaThinking]);


    const callLumina = async (currentQuery: string) => {
        setIsLuminaThinking(true);
        try {
            const chatHistoryForLumina = messages.map(msg => ({
                role: msg.role,
                text: msg.text
            }));

            const luminaInput: MuralChatInput = {
                chatHistory: chatHistoryForLumina,
                userQuery: currentQuery,
                allTransactions: transactions,
            };

            const luminaResponse = await generateSuggestion(luminaInput);

            if (luminaResponse.response) {
                await saveMessage('lumina', luminaResponse.response, 'Lúmina', '/lumina-avatar.png');
            }
        } catch (error) {
            console.error("Error with Lumina suggestion:", error);
            await saveMessage('lumina', "Desculpe, não consegui processar a informação agora. Podemos tentar mais tarde?", 'Lúmina', '/lumina-avatar.png');
        } finally {
            setIsLuminaThinking(false);
        }
    }


    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentMessage = message.trim();
        if (!currentMessage) return;

        await saveMessage('user', currentMessage);
        await callLumina(currentMessage);
    };

    const handleAskLumina = async () => {
        const currentQuery = message.trim() || "Lúmina, poderia nos dar alguma sugestão com base em nossas finanças recentes?";
        if (message.trim()) {
            await saveMessage('user', currentQuery);
        }
        await callLumina(currentQuery);
    };

    const handleTranscript = (transcript: string) => {
        setMessage(prev => prev ? `${prev} ${transcript}` : transcript);
    };
    
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
                    <ScrollArea className="flex-1 p-4" viewportRef={scrollAreaViewportRef}>
                        <div className="space-y-6">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role !== 'user' && (
                                        <Avatar className="h-8 w-8">
                                            {msg.role === 'lumina' ? (
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                                    <Sparkles className="h-5 w-5" />
                                                </AvatarFallback>
                                            ) : (
                                                <>
                                                    <AvatarImage src={msg.authorPhotoUrl} />
                                                    <AvatarFallback>{msg.authorName?.charAt(0) || 'P'}</AvatarFallback>
                                                </>
                                            )}
                                        </Avatar>
                                    )}
                                    <div className={`rounded-lg p-3 max-w-xs lg:max-w-md ${
                                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 
                                        msg.role === 'lumina' ? 'bg-secondary' : 'bg-muted'
                                    }`}>
                                        <p className="text-sm">{msg.text}</p>
                                        <p className="text-xs opacity-70 mt-1 text-right">
                                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    {msg.role === 'user' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.authorPhotoUrl || undefined} />
                                            <AvatarFallback>{msg.authorName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                             {isLuminaThinking && (
                                <div className="flex items-end gap-3">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                            <Sparkles className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="rounded-lg p-3 bg-secondary">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Lúmina está pensando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                         <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <Input 
                                placeholder="Digite sua mensagem..." 
                                className="flex-1"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                disabled={isLuminaThinking}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => setIsAudioDialogOpen(true)} disabled={isLuminaThinking}>
                                <Mic className="h-5 w-5"/>
                            </Button>
                            <Button type="submit" size="icon" disabled={isLuminaThinking || !message.trim()}>
                                <Send className="h-5 w-5"/>
                            </Button>
                             <Button type="button" variant="outline" size="icon" className="border-primary text-primary hover:bg-primary/10 hover:text-primary" onClick={handleAskLumina} disabled={isLuminaThinking}>
                                <Sparkles className="h-5 w-5"/>
                            </Button>
                        </form>
                    </div>
                 </div>
            )}
            <AudioMuralDialog
                open={isAudioDialogOpen}
                onOpenChange={setIsAudioDialogOpen}
                onTranscriptReceived={handleTranscript}
            />
        </div>
    );
}
