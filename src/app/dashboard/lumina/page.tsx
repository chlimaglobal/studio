
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTransactions, useViewMode, useAuth, useLumina, useCoupleStore } from "@/components/client-providers";
import { Loader2, Volume2, VolumeX, Play, Mic } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { onChatUpdate, addChatMessage, onCoupleChatUpdate } from "@/lib/storage";
import type { ChatMessage } from "@/lib/types";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { AudioInputDialog } from "@/components/audio-transaction-dialog";
import { sendMessageToLumina } from "@/ai/lumina/lumina";

const TypingIndicator = () => (
    <div className="flex items-center space-x-2">
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span>
    </div>
);

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLuminaTyping, setIsLuminaTyping] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false);


  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { viewMode, partnerData } = useViewMode();
  const { hasUnread, setHasUnread } = useLumina();
  const { coupleLink, partner } = useCoupleStore();


  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    let unsubscribe: () => void;

    const handleMessages = async (newMessages: ChatMessage[]) => {
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage && lastMessage.role === 'lumina' && !lastMessage.audioUrl && isTTSEnabled) {
        try {
            const { audioUrl } = await textToSpeech(lastMessage.text || '');
            lastMessage.audioUrl = audioUrl;
            if (audioRef.current && audioUrl) {
                audioRef.current.src = audioUrl;
                audioRef.current.play().catch(e => console.warn("Autoplay was prevented.", e));
                setCurrentlyPlaying(lastMessage.id || null);
            }
        } catch (e) {
            console.error("TTS generation failed", e);
        }
      }
      setMessages(newMessages);
      setIsLoading(false);
      setIsLuminaTyping(false);
    };

    if (viewMode === 'together' && coupleLink) {
        unsubscribe = onCoupleChatUpdate(coupleLink.id, handleMessages);
    } else {
        unsubscribe = onChatUpdate(user.uid, handleMessages);
    }

    return () => unsubscribe();
  }, [user, viewMode, coupleLink, isTTSEnabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLuminaTyping]);
  
  useEffect(() => {
    setHasUnread(false);
    localStorage.setItem('lastLuminaVisit', new Date().toISOString());
  }, [setHasUnread]);

  const handlePlayAudio = useCallback((audioUrl: string, messageId: string) => {
    if (audioRef.current) {
      if (currentlyPlaying === messageId) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setCurrentlyPlaying(null);
      } else {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setCurrentlyPlaying(messageId);
      }
    }
  }, [currentlyPlaying]);

  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.onended = () => setCurrentlyPlaying(null);
    }
  }, []);

  const handleSend = useCallback(async (messageText: string, fromAudio: boolean = false) => {
    if (!messageText.trim() || !user) return;
    
    setInput("");
    setIsLuminaTyping(true);

    const commonInput = {
        userQuery: messageText,
        audioText: fromAudio ? messageText : undefined,
        chatHistory: messages,
        allTransactions: transactions,
        isCoupleMode: viewMode === 'together',
        isTTSActive: isTTSEnabled,
        user: { 
            uid: user.uid, 
            displayName: user.displayName || 'Usuário',
            email: user.email,
            photoURL: user.photoURL
        },
    };

    if (viewMode === 'together' && partner) {
        await sendMessageToLumina.couple({
            ...commonInput,
            partner: {
                uid: partner.uid,
                displayName: partner.displayName || 'Parceiro(a)',
                email: partner.email,
                photoURL: partner.photoURL
            },
        }, coupleLink);
    } else {
        await sendMessageToLumina.single(commonInput);
    }
    // The onSnapshot listener will handle displaying the new messages.

  }, [user, messages, transactions, viewMode, isTTSEnabled, partner, coupleLink]);

  const handleTextSend = () => {
      handleSend(input, false);
  }

  const handleAudioTranscript = (transcript: string) => {
      handleSend(transcript, true);
  }

  return (
    <div className="flex flex-col h-full bg-background">
        <audio ref={audioRef} className="hidden" />
        <header className="p-4 border-b flex justify-between items-center">
             <h1 className="text-xl font-semibold">Mural da Lúmina</h1>
             <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsTTSEnabled(!isTTSEnabled)}
                title={isTTSEnabled ? 'Desativar áudio' : 'Ativar áudio'}
             >
                {isTTSEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6" />}
             </Button>
        </header>

      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <div className="space-y-6">
                {messages.map((m, i) => {
                    const isUser = m.authorId === user?.uid;
                    const authorName = isUser ? 'Você' : m.authorName || 'Lúmina';
                    
                    return (
                        <div key={m.id || i} className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                            {!isUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={m.authorPhotoUrl} />
                                    <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={cn(
                                "p-3 rounded-2xl max-w-[75%]",
                                isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                                )}
                            >
                                <p className="text-sm font-semibold mb-1">{authorName}</p>
                                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                                {!isUser && m.audioUrl && (
                                     <Button
                                        variant="ghost"
                                        size="icon"
                                        className="mt-2 h-8 w-8 text-current"
                                        onClick={() => handlePlayAudio(m.audioUrl as string, m.id || `${i}`)}
                                     >
                                        <Play className={cn("h-5 w-5", currentlyPlaying === (m.id || `${i}`) && "text-primary")} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    )
                })}
                 {isLuminaTyping && (
                    <div className="flex items-end gap-2">
                         <Avatar className="h-8 w-8">
                            <AvatarImage src="/lumina-avatar.png" alt="Lumina" />
                            <AvatarFallback>L</AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-2xl bg-muted text-muted-foreground">
                            <TypingIndicator />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
            <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Converse com a Lúmina..."
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleTextSend();
                }
            }}
            />
            <Button onClick={() => setIsAudioDialogOpen(true)} size="icon" variant="outline">
                <Mic className="h-5 w-5" />
            </Button>
            <Button onClick={handleTextSend} disabled={!input.trim() || isLuminaTyping}>
                Enviar
            </Button>
        </div>
      </div>
       <AudioInputDialog 
            open={isAudioDialogOpen}
            onOpenChange={setIsAudioDialogOpen}
            onTranscript={handleAudioTranscript}
        />
    </div>
  );
}
