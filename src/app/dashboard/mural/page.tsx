
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useSubscription, useTransactions, useMural } from '@/components/client-providers';
import { ArrowLeft, Loader2, MessageSquare, Send, Sparkles, Star, Mic, ArrowDown, Square, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { generateSuggestion } from '@/ai/flows/mural-chat';
import type { ChatMessage, MuralChatInput } from '@/lib/types';
import { onChatUpdate, addChatMessage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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

const AudioRecordingUI = ({ onStop, onCancel }: { onStop: () => void; onCancel: () => void }) => {
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimer(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center justify-between w-full h-10 px-3 rounded-md border border-input bg-secondary animate-in fade-in-0">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onCancel}>
                    <Trash2 className="h-4 w-4" />
                </Button>
                <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse"></div>
                <span className="text-sm font-mono text-muted-foreground">{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <p>Gravando...</p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onStop}>
                    <Square className="h-4 w-4 text-primary fill-primary" />
                </Button>
            </div>
        </div>
    );
};


export default function MuralPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { transactions } = useTransactions();
    const { setHasUnread } = useMural();
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    const [isLuminaThinking, setIsLuminaThinking] = useState(false);
    
    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const { toast } = useToast();
    
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const [showScrollToBottom, setShowScrollToBottom] = useState(false);
    
    const scrollToBottom = useCallback((behavior: 'smooth' | 'auto' = 'auto') => {
        setTimeout(() => {
             if (scrollViewportRef.current) {
                scrollViewportRef.current.scrollTo({
                    top: scrollViewportRef.current.scrollHeight,
                    behavior: behavior,
                });
            }
        }, 50); // Small delay to ensure DOM is updated
    }, []);

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            const unsubscribe = onChatUpdate(user.uid, (newMessages) => {
                const isNewMessage = newMessages.length > messages.length && messages.length > 0;
                const isFirstLoad = messages.length === 0;

                setMessages(newMessages);

                if (isFirstLoad || isAtBottomRef.current || (isNewMessage && newMessages[newMessages.length - 1].role === 'user')) {
                    scrollToBottom(isFirstLoad ? 'auto' : 'smooth');
                } else if (!isAtBottomRef.current && isNewMessage) {
                    setShowScrollToBottom(true);
                }
            });
            return () => unsubscribe();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isSubscribed, isAdmin]);
    
    // Initial scroll and reset unread status
    useEffect(() => {
        scrollToBottom('auto');
        setHasUnread(false);
        localStorage.setItem('lastMuralVisit', new Date().toISOString());
    }, [scrollToBottom, setHasUnread]);

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

    const callLumina = async (currentQuery: string) => {
        setIsLuminaThinking(true);
        try {
            const chatHistoryForLumina = messages.slice(-10).map(msg => ({
                role: msg.role === 'partner' ? 'user' : msg.role, // Treat partner as user for Lumina's context
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
            const isScrolledToBottom = scrollDiv.scrollHeight - scrollDiv.scrollTop - scrollDiv.clientHeight < 50;
            isAtBottomRef.current = isScrolledToBottom;
            if (isScrolledToBottom) {
                setShowScrollToBottom(false);
            }
        }
    };
    
    const handleAudioRecording = () => {
        if (!('webkitSpeechRecognition' in window)) {
            toast({ variant: 'destructive', title: 'Não suportado', description: 'O reconhecimento de voz não é suportado neste navegador. Tente o Chrome.' });
            return;
        }

        if (isRecording) {
            recognitionRef.current?.stop();
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';
        
        recognition.onstart = () => setIsRecording(true);
        recognition.onend = () => setIsRecording(false);
        recognition.onerror = (event) => {
            console.error('Speech recognition error', event.error);
            toast({ variant: 'destructive', title: 'Erro de Gravação', description: `Erro: ${event.error}` });
            setIsRecording(false);
        };

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setMessage(prev => prev ? `${prev} ${finalTranscript.trim()}` : finalTranscript.trim());
            }
        };
        
        recognition.start();
    };

    const cancelRecording = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
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
                        <div className="space-y-6">
                            {messages.map((msg, index) => {
                                const showAuthor = index === 0 || messages[index - 1].role !== msg.role;
                                return (
                                <div key={msg.id} className={cn('flex items-end gap-3 w-full', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    {msg.role !== 'user' && (
                                        <Avatar className={cn("h-10 w-10 border-2 border-border flex-shrink-0", showAuthor ? "visible" : "invisible")}>
                                            {msg.role === 'lumina' ? (
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                                    <Sparkles className="h-5 w-5" />
                                                </AvatarFallback>
                                            ) : (
                                                <>
                                                    <AvatarImage src={msg.authorPhotoUrl || undefined} />
                                                    <AvatarFallback>{msg.authorName?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                                                </>
                                            )}
                                        </Avatar>
                                    )}
                                    <div className={cn('flex flex-col max-w-[80%] md:max-w-[70%]', msg.role === 'user' ? 'items-end' : 'items-start')}>
                                        {showAuthor && (
                                            <span className="text-xs text-muted-foreground mb-1 px-2">{msg.authorName}</span>
                                        )}
                                        <div className={cn('p-3 rounded-lg border flex flex-col',
                                            msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary rounded-bl-none'
                                        )}>
                                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                            <span className="text-xs self-end mt-1 opacity-70">
                                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                     {msg.role === 'user' && (
                                        <Avatar className={cn("h-10 w-10 border-2 border-border flex-shrink-0", showAuthor ? "visible" : "invisible")}>
                                            <AvatarImage src={msg.authorPhotoUrl || undefined} />
                                            <AvatarFallback className="bg-primary/80 text-primary-foreground">{msg.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            )})}
                             {isLuminaThinking && (
                                <div className="flex items-end gap-3 justify-start">
                                    <Avatar className="h-10 w-10 border-2 border-border">
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                            <Sparkles className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start max-w-[80%] md:max-w-[70%]">
                                        <span className="text-xs text-muted-foreground mb-1 px-2">Lúmina</span>
                                        <div className="p-3 rounded-lg border bg-secondary rounded-bl-none">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Está pensando...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {showScrollToBottom && (
                        <Button
                            size="icon"
                            className="absolute bottom-24 right-6 rounded-full h-10 w-10 shadow-lg animate-in fade-in-0"
                            onClick={() => scrollToBottom('smooth')}
                        >
                            <ArrowDown className="h-5 w-5" />
                        </Button>
                    )}
                    
                    <div className="p-4 border-t bg-background">
                         <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                             {isRecording ? (
                                <AudioRecordingUI onStop={handleAudioRecording} onCancel={cancelRecording} />
                             ) : (
                                <>
                                    <Input 
                                        placeholder="Digite sua mensagem..." 
                                        className="flex-1"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        disabled={isLuminaThinking}
                                    />
                                    {message.trim() ? (
                                        <Button type="submit" size="icon" disabled={isLuminaThinking}>
                                            <Send className="h-5 w-5"/>
                                        </Button>
                                    ) : (
                                        <Button type="button" variant="ghost" size="icon" onClick={handleAudioRecording} disabled={isLuminaThinking}>
                                            <Mic className="h-5 w-5"/>
                                        </Button>
                                    )}
                                </>
                             )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
