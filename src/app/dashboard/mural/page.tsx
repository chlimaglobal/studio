
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useSubscription, useTransactions, useMural } from '@/components/client-providers';
import { ArrowLeft, Loader2, MessageSquare, Send, Sparkles, Star, Mic, ArrowDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { generateSuggestion } from '@/ai/flows/mural-chat';
import type { ChatMessage, MuralChatInput } from '@/lib/types';
import { onChatUpdate, addChatMessage } from '@/lib/storage';
import { AudioMuralDialog } from '@/components/audio-mural-dialog';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

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
    const { transactions } = useTransactions();
    const { hasUnread, setHasUnread } = useMural();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    const [isLuminaThinking, setIsLuminaThinking] = useState(false);
    const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false);
    
    // State for pagination and smart scrolling
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);


    const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
        if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollTo({
                top: scrollViewportRef.current.scrollHeight,
                behavior: behavior,
            });
        }
    }, []);

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
    
    // Effect for initial load and real-time updates
    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            const unsubscribe = onChatUpdate(
                user.uid, 
                (newMessages) => {
                    // Prevent adding duplicate messages
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNewMessages = newMessages.filter(m => !existingIds.has(m.id));
                        return [...prev, ...uniqueNewMessages].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime());
                    });
                    
                    if (isAtBottomRef.current) {
                       setTimeout(() => scrollToBottom('smooth'), 100);
                    } else {
                       setShowScrollToBottom(true);
                    }
                }, 
                lastDoc // Pass the last known document to listen for messages after it
            );
            return () => unsubscribe();
        }
    }, [user, isSubscribed, isAdmin, lastDoc, scrollToBottom]);


    const callLumina = async (currentQuery: string) => {
        setIsLuminaThinking(true);
        try {
            const chatHistoryForLumina = messages.slice(-10).map(msg => ({ // Send last 10 messages for context
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
    
    const handleScroll = () => {
        const scrollDiv = scrollViewportRef.current;
        if (scrollDiv) {
            const isScrolledToBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight < 10;
            isAtBottomRef.current = isScrolledToBottom;
             if (isScrolledToBottom) {
                setShowScrollToBottom(false);
            }
        }
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
                <div className="flex-1 flex flex-col overflow-hidden relative">
                    <ScrollArea className="flex-1 p-4" viewportRef={scrollViewportRef} onScroll={handleScroll}>
                        {isLoadingMore && (
                            <div className="flex justify-center my-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/>
                            </div>
                        )}
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                                    <div className={`relative rounded-xl px-3 pt-2 pb-1 max-w-sm lg:max-w-md ${
                                        msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 
                                        msg.role === 'lumina' ? 'bg-secondary rounded-bl-none' : 'bg-muted rounded-bl-none'
                                    }`}>
                                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                        <div className="text-right">
                                            <p className="text-xs opacity-70 mt-1">
                                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    {msg.role === 'user' && (
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={msg.authorPhotoUrl || undefined} />
                                            <AvatarFallback className="bg-primary/80 text-primary-foreground">{msg.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))}
                             {isLuminaThinking && (
                                <div className="flex items-end gap-2.5">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                            <Sparkles className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="rounded-xl rounded-bl-none p-3 bg-secondary">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>Lúmina está pensando...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    
                    {showScrollToBottom && (
                        <Button 
                            variant="secondary"
                            size="icon"
                            className="absolute bottom-20 right-4 z-10 rounded-full animate-in fade-in-0"
                            onClick={() => scrollToBottom('smooth')}
                        >
                            <ArrowDown className="h-5 w-5"/>
                        </Button>
                    )}

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

