
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth, useSubscription, useTransactions, useLumina, useViewMode } from '@/components/client-providers';
import { ArrowLeft, Loader2, MessageSquare, Send, Sparkles, Star, Mic, ArrowDown, Square, Trash2, Paperclip, Check, X, Camera } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import type { ChatMessage, LuminaChatInput, ExtractedTransaction } from '@/lib/types';
import { onChatUpdate, addChatMessage } from '@/lib/storage';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { extractFromImage } from '@/ai/flows/extract-from-image';
import { z } from 'zod';
import { TransactionFormSchema } from '@/lib/types';
import { QrScannerDialog } from '@/components/qr-scanner-dialog';
import { generateSuggestion } from '@/ai/flows/lumina-chat';
import { runRecoveryProtocol, RecoveryProtocolOutput, FlashRecoveryOutput } from '@/ai/flows/recovery-protocol-flow';


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
                    <Square className="h-4 w-4 text-primary fill-primary" />
                </Button>
            </div>
        </div>
    );
};

const TransactionConfirmationCard = ({ transaction, onConfirm, onCancel }: { transaction: ExtractedTransaction, onConfirm: () => void, onCancel: () => void }) => {
    return (
        <Card className="bg-secondary shadow-md">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Lúmina encontrou uma transação
                </CardTitle>
                <CardDescription>
                    Posso registrar esta {transaction.type === 'income' ? 'receita' : 'despesa'} para você?
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Descrição:</span>
                    <span className="font-semibold">{transaction.description}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className={cn("font-semibold", transaction.type === 'income' ? 'text-green-500' : 'text-destructive')}>
                        {formatCurrency(transaction.amount)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Categoria:</span>
                    <span className="font-semibold">{transaction.category}</span>
                </div>
                {transaction.paymentMethod === 'installments' && transaction.installments && (
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Parcelamento:</span>
                        <span className="font-semibold">{transaction.installments}x</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={onCancel}>
                    <X className="mr-2 h-4 w-4" /> Não
                </Button>
                <Button onClick={onConfirm}>
                    <Check className="mr-2 h-4 w-4" /> Sim, registrar
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function LuminaPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { transactions, addTransaction } = useTransactions();
    const { setHasUnread } = useLumina();
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
            const unsubscribe = onChatUpdate(user.uid, (newMessages) => {
                setMessages(newMessages);
            });
            return () => unsubscribe();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isSubscribed, isAdmin]);
    
    useEffect(() => {
        setHasUnread(false);
        localStorage.setItem('lastLuminaVisit', new Date().toISOString());
    }, [setHasUnread]);

    const saveMessage = useCallback(async (role: 'user' | 'partner' | 'lumina', text: string, authorName?: string, authorPhotoUrl?: string, transactionToConfirm?: ExtractedTransaction) => {
        if (!user || (!text.trim() && !transactionToConfirm)) return;

        const newMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
            role,
            text,
            authorName: authorName || user.displayName || 'Usuário',
            authorPhotoUrl: authorPhotoUrl || user.photoURL || '',
            transactionToConfirm: transactionToConfirm || null,
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
                role: msg.role === 'lumina' ? 'model' : 'user', // Map 'lumina' to 'model'
                text: msg.text
            }));

            const luminaInput: LuminaChatInput = {
                chatHistory: chatHistoryForLumina,
                userQuery: currentQuery,
                allTransactions: transactions,
            };
            
            const responseText = await generateSuggestion(luminaInput);
            
            await saveMessage('lumina', responseText, 'Lúmina', '/lumina-avatar.png');

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
        
        const lowerCaseMessage = currentMessage.toLowerCase();

        // Check for trigger phrases
        if (lowerCaseMessage === "lúmina, acione o protocolo de recuperação de performance.") {
            await handleRecoveryProtocol('full');
        } else if (lowerCaseMessage === "lúmina, modo flash") {
            await handleRecoveryProtocol('flash');
        } else {
            await callLumina(currentMessage);
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

            await saveMessage('lumina', formattedResponse, 'Lúmina', '/lumina-avatar.png');

        } catch (error) {
            console.error(`Error with Recovery Protocol (${type}):`, error);
            await saveMessage('lumina', "Desculpe, não foi possível executar o protocolo agora. Verifique seus dados e tente novamente.", 'Lúmina', '/lumina-avatar.png');
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
            await saveMessage('lumina', 'Analisei a imagem.', 'Lúmina', '/lumina-avatar.png', result);
        } catch (error) {
            const errorMessage = "Desculpe, não consegui extrair nenhuma informação útil desta imagem. Por favor, tente uma foto mais nítida de um comprovante ou anotação.";
            await saveMessage('lumina', errorMessage, 'Lúmina', '/lumina-avatar.png');
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
        saveMessage('lumina', 'Analisei o QR Code.', 'Lúmina', '/lumina-avatar.png', transactionData);
    };

    const handleConfirmTransaction = async (transaction: ExtractedTransaction, messageId: string) => {
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
            await addTransaction(transactionData);
            // We can optionally update the message to remove the confirmation buttons
            toast({ title: 'Sucesso!', description: 'A transação foi registrada.' });
             await addChatMessage(user!.uid, {
                role: 'user',
                text: 'Sim, pode registrar.',
                authorName: user!.displayName || 'Usuário',
                authorPhotoUrl: user!.photoURL || ''
            });

        } catch (error) {
            console.error("Error saving confirmed transaction:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a transação.' });
        }
    }

    const handleCancelTransaction = async (messageId: string) => {
        // Here you could update the message in Firestore to remove the buttons,
        // but for simplicity, we'll just add a "cancelled" message.
        await addChatMessage(user!.uid, {
            role: 'user',
            text: 'Não, obrigado.',
            authorName: user!.displayName || 'Usuário',
            authorPhotoUrl: user!.photoURL || ''
        });
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
                <div>
                    <h1 className="text-xl font-semibold flex items-center gap-2">
                        <MessageSquare />
                        Chat com a Lúmina
                    </h1>
                    <p className="text-sm text-muted-foreground">Converse sobre finanças e receba dicas da Lúmina.</p>
                </div>
            </header>

            {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">
                            {messages.map((msg, index) => {
                                const isUser = msg.role === 'user';
                                
                                return (
                                <div key={msg.id || index} className={cn('flex items-start gap-3 w-full', isUser ? 'justify-end' : 'justify-start')}>
                                    {!isUser && (
                                        <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
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
                                    <div className={cn('flex flex-col max-w-[80%] md:max-w-[70%]', isUser ? 'items-end' : 'items-start')}>
                                        <span className="text-xs text-muted-foreground mb-1 px-2">{msg.authorName}</span>
                                        { msg.text && (
                                            <div className={cn('p-3 rounded-lg border flex flex-col',
                                                isUser ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary rounded-tl-none'
                                            )}>
                                                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        )}
                                        {msg.transactionToConfirm && (
                                            <TransactionConfirmationCard 
                                                transaction={msg.transactionToConfirm}
                                                onConfirm={() => handleConfirmTransaction(msg.transactionToConfirm!, msg.id!)}
                                                onCancel={() => handleCancelTransaction(msg.id!)}
                                            />
                                        )}
                                        {msg.timestamp && (
                                            <span className="text-xs self-end mt-1 text-muted-foreground opacity-70 px-1">
                                                {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    {isUser && (
                                        <Avatar className="h-10 w-10 border-2 border-border flex-shrink-0">
                                            <AvatarImage src={msg.authorPhotoUrl || undefined} />
                                            <AvatarFallback className="bg-primary/80 text-primary-foreground">{msg.authorName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
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
