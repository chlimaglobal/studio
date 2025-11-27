
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useSubscription, useTransactions, useLumina, useViewMode } from '@/components/client-providers';
import { ArrowLeft, Loader2, Send, Sparkles, Star, Mic, Trash2, Paperclip, Camera, MessageSquare, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import type { ChatMessage, ExtractedTransaction } from '@/lib/types';
import { onChatUpdate, addChatMessage, onCoupleChatUpdate, addCoupleChatMessage } from '@/lib/storage';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { extractFromImage } from '@/ai/flows/extract-from-image';
import { z } from 'zod';
import { TransactionFormSchema } from '@/lib/types';
import { QrScannerDialog } from '@/components/qr-scanner-dialog';
import { generateSuggestion } from '@/ai/flows/lumina-chat';
import { generateCoupleSuggestion } from '@/ai/flows/lumina-couple-chat';
import { runRecoveryProtocol, RecoveryProtocolOutput, FlashRecoveryOutput } from '@/ai/flows/recovery-protocol-flow';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { extractTransactionInfoFromText } from '@/app/actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const PremiumBlocker = () => (
    <div className="flex flex-col h-full items-center justify-center">
        <Card className="text-center w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex items-center justify-center gap-2">
                    <Star className="h-6 w-6 text-amber-500" />
                    Recurso Premium
                </CardTitle>
                <CardDescription>
                    O Chat com a Lúmina é um recurso exclusivo para assinantes.
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
                    <Send className="h-4 w-4 text-primary" />
                </Button>
            </div>
        </div>
    );
};

const TransactionConfirmationCard = ({ transaction, onConfirm, onCancel }: { transaction: ExtractedTransaction, onConfirm: () => void, onCancel: () => void }) => {
    return (
        <Card className="bg-secondary shadow-md max-w-[88%] self-start break-words w-fit">
            <CardHeader className="p-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Lúmina encontrou uma transação
                </CardTitle>
                <CardDescription className="text-xs">
                    Posso registrar esta {transaction.type === 'income' ? 'receita' : 'despesa'} para você?
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 p-3 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Descrição:</span>
                    <span className="font-semibold text-right">{transaction.description}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className={cn("font-semibold", transaction.type === 'income' ? 'text-green-500' : 'text-destructive')}>
                        {formatCurrency(transaction.amount)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoria:</span>
                    <span className="font-semibold text-right">{transaction.category}</span>
                </div>
                {transaction.paymentMethod === 'installments' && transaction.installments && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcelamento:</span>
                        <span className="font-semibold">{transaction.installments}x</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2 p-2">
                <Button size="sm" variant="outline" onClick={onCancel}>
                    Não
                </Button>
                <Button size="sm" onClick={onConfirm}>
                    Sim
                </Button>
            </CardFooter>
        </Card>
    );
}

const DiagnosticCard = ({ diagnostic }: { diagnostic: any }) => {
    return (
        <Alert variant="destructive" className="max-w-[88%] self-start break-words w-fit my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro de Diagnóstico da Lúmina</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
                <p><strong>Etapa:</strong> {diagnostic.etapa}</p>
                <p><strong>Causa:</strong> {diagnostic.causa}</p>
                <p><strong>Solução:</strong> {diagnostic.solucao}</p>
            </AlertDescription>
        </Alert>
    );
};

export default function LuminaPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { transactions, addTransaction } = useTransactions();
    const { setHasUnread } = useLumina();
    const { viewMode } = useViewMode();
    const { partner, coupleLink } = useCoupleStore();


    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    const [isLuminaThinking, setIsLuminaThinking] = useState(false);
    
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            let unsubscribe: () => void;
            if (viewMode === 'together' && coupleLink?.id) {
                unsubscribe = onCoupleChatUpdate(coupleLink.id, setMessages);
            } else {
                unsubscribe = onChatUpdate(user.uid, setMessages);
            }
            return () => unsubscribe();
        }
    }, [user, isSubscribed, isAdmin, viewMode, coupleLink]);
    
    useEffect(() => {
        setHasUnread(false);
        localStorage.setItem('lastLuminaVisit', new Date().toISOString());
    }, [setHasUnread]);

    const saveMessage = useCallback(async (newMessage: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        if (!user || (!newMessage.text?.trim() && !newMessage.transactionToConfirm && !(newMessage as any).status)) return;

        const messageWithAuthor = {
            ...newMessage,
            authorId: user.uid,
            authorName: newMessage.authorName || user.displayName || 'Usuário',
            authorPhotoUrl: newMessage.authorPhotoUrl || user.photoURL || '',
        };
        
        if (viewMode === 'together' && coupleLink?.id) {
            await addCoupleChatMessage(coupleLink.id, messageWithAuthor);
        } else {
            await addChatMessage(user.uid, messageWithAuthor);
        }

        if (newMessage.role === 'user') {
            setMessage('');
        }
    }, [user, viewMode, coupleLink]);

    const callLumina = async (currentQuery: string) => {
        setIsLuminaThinking(true);
        
        const chatHistoryForLumina = messages.slice(-10).map(msg => ({
            role: msg.role === 'lumina' ? 'model' as const : 'user' as const,
            text: msg.text || ''
        }));
        
        let luminaResponseData: z.infer<typeof LuminaChatOutputSchema> = {
            text: "Desculpe, não consegui processar a informação agora. Podemos tentar mais tarde?",
            suggestions: []
        };

        try {
            let result;
            if (viewMode === 'together' && partner) {
                const luminaInput = {
                    chatHistory: chatHistoryForLumina,
                    userQuery: currentQuery,
                    allTransactions: transactions,
                    user: { displayName: user?.displayName || '', uid: user?.uid || '' },
                    partner: { displayName: partner?.displayName || '', uid: partner?.uid || ''},
                };
                result = await generateCoupleSuggestion(luminaInput);
            } else {
                 const luminaInput = {
                    chatHistory: chatHistoryForLumina,
                    userQuery: currentQuery,
                    allTransactions: transactions,
                };
                result = await generateSuggestion(luminaInput);
            }

            await saveMessage({
              role: 'lumina',
              // @ts-ignore
              ...result,
              authorName: 'Lúmina', 
              authorPhotoUrl: '/lumina-avatar.png'
            });

        } catch (error) {
            console.error("Error with Lumina suggestion:", error);
            await saveMessage({
                role: 'lumina',
                text: "Desculpe, não consegui gerar uma resposta. Tente novamente.",
                authorName: 'Lúmina',
                authorPhotoUrl: '/lumina-avatar.png',
                suggestions: []
            });
        } finally {
            setIsLuminaThinking(false);
        }
    }

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const currentMessage = message.trim();
        if (!currentMessage) return;

        await saveMessage({ role: 'user', text: currentMessage });
        
        setIsLuminaThinking(true);
        try {
            const extractedResult = await extractTransactionInfoFromText(currentMessage);
            
            if (!('error' in extractedResult) && (extractedResult.amount || 0) > 0) {
                await saveMessage({
                    role: 'lumina',
                    text: 'Encontrei uma transação no que você disse.',
                    authorName: 'Lúmina',
                    authorPhotoUrl: '/lumina-avatar.png',
                    transactionToConfirm: extractedResult as ExtractedTransaction
                });
            } else {
                const lowerCaseMessage = currentMessage.toLowerCase();
                if (lowerCaseMessage === "lúmina, acione o protocolo de recuperação de performance.") {
                    await handleRecoveryProtocol('full');
                } else if (lowerCaseMessage === "lúmina, modo flash") {
                    await handleRecoveryProtocol('flash');
                } else {
                    await callLumina(currentMessage);
                }
            }
        } catch (error) {
            console.error("Error handling message:", error);
            await callLumina(currentMessage);
        } finally {
             setIsLuminaThinking(false);
        }
    };

    const handleRecoveryProtocol = async (type: 'full' | 'flash') => {
        setIsLuminaThinking(true);
        try {
            const result = await runRecoveryProtocol({ transactions, promptType: type });
            let formattedResponse = '';

            if (type === 'full') {
                const res = result as RecoveryProtocolOutput;
                formattedResponse = `
**PROTOCOLO DE RECUPERAÇÃO DE PERFORMANCE ACIONADO.**

**1. DIAGNÓSTICO DE INEFICIÊNCIA:**
${res.inefficiencyPoint}

**2. DECISÕES OMITIDAS:**
${res.missedDecisions}

**3. OPORTUNIDADES DESPERDIÇADAS:**
${res.wastedOpportunities}

**4. AÇÃO DE ALTA PERFORMANCE (PRÓXIMAS 48H):**
${res.highPerformerActions}

**5. PLANO DE RECUPERAÇÃO (PRÓXIMO MÊS):**
${res.recoveryPlan}

**MANTRA DE GUERRA:**
**${res.warMantra}**
`;
            } else {
                 const res = result as FlashRecoveryOutput;
                formattedResponse = `
**MODO FLASH ACIONADO.**

**DIAGNÓSTICO DE FALHA:**
${res.failureSummary}

**AÇÃO IMEDIATA:**
${res.actionNow}

**MANTRA DE REPROGRAMAÇÃO:**
**${res.warMantra}**
`;
            }

            await saveMessage({role: 'lumina', text: formattedResponse, authorName: 'Lúmina', authorPhotoUrl: '/lumina-avatar.png'});

        } catch (error) {
            console.error(`Error with Recovery Protocol (${type}):`, error);
            await saveMessage({role: 'lumina', text: "Desculpe, não foi possível executar o protocolo agora. Verifique seus dados e tente novamente.", authorName: 'Lúmina', authorPhotoUrl: '/lumina-avatar.png'});
        } finally {
            setIsLuminaThinking(false);
        }
    }
    
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
    
    const handleImageProcessing = async (imageDataUri: string) => {
        setIsLuminaThinking(true);
        try {
            const result = await extractFromImage({ imageDataUri });
            await saveMessage({role: 'lumina', text: 'Analisei a imagem.', authorName: 'Lúmina', authorPhotoUrl: '/lumina-avatar.png', transactionToConfirm: result});
        } catch (error) {
            const errorMessage = "Desculpe, não consegui extrair nenhuma informação útil desta imagem. Por favor, tente uma foto mais nítida de um comprovante ou anotação.";
            await saveMessage({role: 'lumina', text: errorMessage, authorName: 'Lúmina', authorPhotoUrl: '/lumina-avatar.png'});
        } finally {
            setIsLuminaThinking(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageDataUri = e.target?.result as string;
                await handleImageProcessing(imageDataUri);
            };
            reader.readAsDataURL(file);
        }
        event.target.value = ''; // Reset file input
    };

    const handleTransactionExtractedFromQR = (data: Partial<z.infer<typeof TransactionFormSchema>>) => {
        const transactionData: ExtractedTransaction = {
            description: data.description || 'Compra QR Code',
            amount: data.amount || 0,
            type: data.type || 'expense',
            category: data.category || 'Outros',
            date: new Date().toISOString().split('T')[0],
        };
        saveMessage({role: 'lumina', text: 'Analisei o QR Code.', authorName: 'Lúmina', authorPhotoUrl: '/lumina-avatar.png', transactionToConfirm: transactionData});
    };

    const handleConfirmTransaction = async (transaction: ExtractedTransaction) => {
        if (!user) return;
        try {
            const transactionData: z.infer<typeof TransactionFormSchema> = {
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                category: transaction.category,
                date: new Date(transaction.date),
                paid: true,
                paymentMethod: transaction.paymentMethod || 'one-time',
                installments: transaction.installments,
            };
            await addTransaction(transactionData, user.uid);
            toast({ title: 'Sucesso!', description: 'A transação foi registrada.' });
             await saveMessage({
                role: 'user',
                text: 'Sim, pode registrar.',
            });

        } catch (error) {
            console.error("Error saving confirmed transaction:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a transação.' });
        }
    }

    const handleCancelTransaction = async () => {
        await saveMessage({
            role: 'user',
            text: 'Não, obrigado.',
        });
    }

    const getAuthorAvatar = (msg: ChatMessage) => {
        if (msg.authorId === user?.uid) return user.photoURL;
        if (partner && msg.authorId === partner.uid) return partner.photoURL;
        return msg.authorPhotoUrl;
    }
    
    const getAuthorFallback = (msg: ChatMessage) => {
         if (msg.authorId === user?.uid) return user.displayName?.charAt(0).toUpperCase() || 'U';
         if (partner && msg.authorId === partner.uid) return partner.displayName?.charAt(0).toUpperCase() || 'P';
         return msg.authorName?.charAt(0).toUpperCase() || 'L';
    }

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
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        Mural do Casal
                    </h1>
                    <p className="text-sm text-muted-foreground">Converse sobre finanças e receba dicas da Lúmina.</p>
                </div>
            </header>

            {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">
                            {messages.map((msg, index) => {
                                const isCurrentUser = msg.authorId === user?.uid;
                                const isLumina = msg.role === 'lumina';
                                const isDiagnostic = (msg as any).status === 'erro';
                                
                                return (
                                <div key={msg.id || index} className={cn('flex items-end gap-3 w-full', isCurrentUser ? 'justify-end' : 'justify-start')}>
                                    {!isCurrentUser && (
                                        <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
                                            {isLumina ? (
                                                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                                    <Sparkles className="h-5 w-5" />
                                                </AvatarFallback>
                                            ) : (
                                                <>
                                                    <AvatarImage src={getAuthorAvatar(msg) || undefined} />
                                                    <AvatarFallback>{getAuthorFallback(msg)}</AvatarFallback>
                                                </>
                                            )}
                                        </Avatar>
                                    )}
                                    <div className={cn('flex flex-col', isCurrentUser ? 'items-end' : 'items-start')}>
                                         {!isDiagnostic && <span className="text-xs text-muted-foreground mb-1 px-2">{msg.authorName}</span>}
                                        
                                        {isDiagnostic ? (
                                            <DiagnosticCard diagnostic={msg} />
                                        ) : msg.text ? (
                                             <div className={cn('p-3 rounded-lg border flex flex-col max-w-[88%] w-fit break-words',
                                                isCurrentUser ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary rounded-tl-none'
                                            )}>
                                                <p className={cn("text-sm", isLumina ? 'whitespace-pre-wrap' : 'whitespace-normal' )}>{msg.text}</p>
                                            </div>
                                        ) : null}

                                        {msg.transactionToConfirm && (
                                            <TransactionConfirmationCard 
                                                transaction={msg.transactionToConfirm}
                                                onConfirm={() => handleConfirmTransaction(msg.transactionToConfirm!)}
                                                onCancel={() => handleCancelTransaction()}
                                            />
                                        )}
                                        {msg.timestamp && (
                                            <span className="text-xs self-end mt-1 text-muted-foreground opacity-70 px-1">
                                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    {isCurrentUser && (
                                        <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
                                            <AvatarImage src={user?.photoURL || undefined} />
                                            <AvatarFallback className="bg-primary/80 text-primary-foreground">{user?.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            )})}
                             {isLuminaThinking && (
                                <div className="flex items-start gap-3 justify-start">
                                    <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary text-primary">
                                            <Sparkles className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col max-w-[80%] md:max-w-[70%] items-start">
                                        <span className="text-xs text-muted-foreground mb-1 px-2">Lúmina</span>
                                        <div className="p-3 rounded-lg border bg-secondary rounded-tl-none">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span>Está pensando...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div ref={messagesEndRef} />
                    </ScrollArea>
                    <div className="p-4 border-t bg-background">
                         <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                             {isRecording ? (
                                <AudioRecordingUI onStop={handleAudioRecording} onCancel={cancelRecording} />
                             ) : (
                                <>
                                    <Input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLuminaThinking}>
                                        <Paperclip className="h-5 w-5"/>
                                    </Button>
                                     <Button type="button" variant="ghost" size="icon" onClick={() => setIsQrScannerOpen(true)} disabled={isLuminaThinking}>
                                        <Camera className="h-5 w-5" />
                                    </Button>
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
            <QrScannerDialog
                open={isQrScannerOpen}
                onOpenChange={setIsQrScannerOpen}
                onTransactionExtracted={handleTransactionExtractedFromQR}
            />
        </div>
    );
}
