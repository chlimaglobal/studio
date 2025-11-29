
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useTransactions, useViewMode, useAuth, useLumina, useCoupleStore } from "@/components/client-providers";
import { Loader2, Volume2, VolumeX, Play, Mic, Paperclip, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, fileToBase64 } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { onChatUpdate, addChatMessage, addCoupleChatMessage, updateChatMessage, updateCoupleChatMessage } from '@/lib/storage';
import type { ChatMessage } from "@/lib/types";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { AudioInputDialog } from "@/components/audio-transaction-dialog";

const TypingIndicator = () => (
    <div className="flex items-center space-x-2">
        <span className="h-2.5 w-2.5 typing-dot rounded-full" style={{ animationDelay: '-0.3s' }}></span>
        <span className="h-2.5 w-2.5 typing-dot rounded-full" style={{ animationDelay: '-0.15s' }}></span>
        <span className="h-2.5 w-2.5 typing-dot rounded-full"></span>
    </div>
);

const WelcomeMessage = () => {
    const { user } = useAuth();
    const userName = user?.displayName?.split(' ')[0] || 'usuário';

    return (
        <div className="flex h-full flex-col items-center justify-center text-center animate-in fade-in-0 duration-1000 p-4">
             <Avatar className="h-20 w-20 border-2 border-primary/50 shadow-[0_0_15px_rgba(255,215,130,0.4)] mb-4">
                <AvatarImage src="/lumina-avatar.png" alt="Lumina" />
                <AvatarFallback>L</AvatarFallback>
            </Avatar>
            <h2 className="text-2xl font-bold text-foreground">Olá, {userName}!</h2>
            <p className="text-muted-foreground max-w-sm">
                Pronta para organizar seu dinheiro, suas metas e sua rotina.
            </p>
        </div>
    )
}


export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLuminaTyping, setIsLuminaTyping] = useState(false);
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [isAudioDialogOpen, setIsAudioDialogOpen] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setMessages(newMessages);
      setIsLoading(false);
    };

    if (viewMode === 'together' && coupleLink) {
        unsubscribe = onCoupleChatUpdate(coupleLink.id, handleMessages);
    } else {
        unsubscribe = onChatUpdate(user.uid, handleMessages);
    }

    return () => unsubscribe();
  }, [user, viewMode, coupleLink]);

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
    if ((!messageText.trim() && !attachedFile) || !user) return;
    
    setInput("");
    setFilePreview(null);
    const fileToSend = attachedFile;
    setAttachedFile(null);

    // Add user message to DB and local state immediately
    const userMessageData: ChatMessage = {
        role: "user",
        text: messageText,
        authorId: user.uid,
        authorName: user.displayName || 'Você',
        authorPhotoUrl: user.photoURL || '',
        timestamp: new Date(),
    };
    
    if (viewMode === 'together' && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, userMessageData);
    } else {
        await addChatMessage(user.uid, userMessageData);
    }

    setIsLuminaTyping(true);

    let imageBase64: string | null = null;
    if (fileToSend) {
        imageBase64 = await fileToBase64(fileToSend);
    }

    // Add an empty placeholder for Lumina's message to local state
    const luminaMessageId = `lumina-placeholder-${Date.now()}`;
    const luminaPlaceholder: ChatMessage = {
      id: luminaMessageId,
      role: 'lumina',
      text: '',
      authorName: 'Lúmina',
      authorPhotoUrl: '/lumina-avatar.png',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, luminaPlaceholder]);

    try {
        const response = await fetch('/api/lumina/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userQuery: messageText,
                audioText: fromAudio ? messageText : undefined,
                chatHistory: messages, // Send current history
                allTransactions: transactions,
                imageBase64,
                isCoupleMode: viewMode === 'together',
                isTTSActive: isTTSEnabled,
                user: { uid: user.uid, displayName: user.displayName || '' },
                partner: partner ? { uid: partner.uid, displayName: partner.displayName || '' } : undefined,
            }),
        });

        if (!response.ok || !response.body) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let luminaMessageText = '';
        
        setIsLuminaTyping(false);

        // Read the stream
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            luminaMessageText += decoder.decode(value, { stream: true });
            
            // Update the placeholder message in real-time
            setMessages(prev => prev.map(msg => 
                msg.id === luminaMessageId 
                ? { ...msg, text: luminaMessageText } 
                : msg
            ));
        }
        
        const finalMessageText = luminaMessageText.trim();
        let suggestions: string[] = [];
        const suggestionsMarker = '\n\n💡 Sugestões: ';
        if (finalMessageText.includes(suggestionsMarker)) {
            const parts = finalMessageText.split(suggestionsMarker);
            luminaMessageText = parts[0];
            suggestions = parts[1].split(' · ');
        }
        
        // Save the final, complete message to the database
        const luminaMessageData = {
          role: 'lumina' as const,
          text: luminaMessageText,
          authorName: 'Lúmina',
          authorPhotoUrl: '/lumina-avatar.png',
          suggestions: suggestions,
        };

        if (viewMode === 'together' && coupleLink) {
            await addCoupleChatMessage(coupleLink.id, luminaMessageData);
        } else {
            await addChatMessage(user.uid, luminaMessageData);
        }
        
        // Remove placeholder now that DB will trigger an update with the final message
        setMessages(prev => prev.filter(msg => msg.id !== luminaMessageId));

    } catch (error) {
        setIsLuminaTyping(false);
        const errorMessage = "Desculpe, tive um problema para processar sua solicitação. Poderia tentar novamente?";
        
        const errorData = {
          role: 'lumina' as const,
          text: errorMessage,
          authorName: "Lúmina",
          authorPhotoUrl: "/lumina-avatar.png"
        };
        if (viewMode === 'together' && coupleLink) {
             await addCoupleChatMessage(coupleLink.id, errorData);
        } else {
             await addChatMessage(user.uid, errorData);
        }
        setMessages(prev => prev.filter(msg => msg.id !== luminaMessageId));
    }

  }, [user, messages, transactions, viewMode, isTTSEnabled, partner, coupleLink, attachedFile]);
  
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAttachedFile(file);
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                setFilePreview(loadEvent.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
  
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
            <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/50 shadow-[0_0_12px_rgba(255,215,130,0.4)]">
                    <AvatarImage src="/lumina-avatar.png" alt="Lumina" />
                    <AvatarFallback>L</AvatarFallback>
                </Avatar>
                <div>
                    <h1 className="text-base font-semibold">Lúmina – sua assistente financeira</h1>
                    <p className="text-xs text-muted-foreground">Planejamento. Análise. Ação.</p>
                </div>
            </div>
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
        ) : messages.length === 0 && !isLuminaTyping ? (
            <WelcomeMessage />
        ) : (
            <div className="space-y-6">
                {messages.map((m, i) => {
                    const isUser = m.authorId === user?.uid;
                    const authorName = isUser ? 'Você' : m.authorName || 'Lúmina';
                    
                    return (
                        <div key={m.id || i} className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                            {!isUser && (
                                 <Avatar className={cn("h-8 w-8 border-2 border-primary/50 shadow-[0_0_12px_rgba(255,215,130,0.4)]", isLuminaTyping && i === messages.length - 1 && "lumina-avatar-pulse")}>
                                    <AvatarImage src={m.authorPhotoUrl} />
                                    <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={cn(
                                "p-3 rounded-2xl max-w-[85%]",
                                isUser ? "user-bubble" : "lumina-bubble"
                                )}
                            >
                                <p className="text-sm font-semibold mb-1">{authorName}</p>
                                {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
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
                 {isLuminaTyping && messages[messages.length-1]?.id?.startsWith('lumina-placeholder') === false && (
                    <div className="flex items-end gap-2">
                         <Avatar className="h-8 w-8 border-2 border-primary/50 shadow-[0_0_12px_rgba(255,215,130,0.4)] lumina-avatar-pulse">
                            <AvatarImage src="/lumina-avatar.png" alt="Lumina" />
                            <AvatarFallback>L</AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-2xl lumina-bubble">
                            <TypingIndicator />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>
        )}
      </ScrollArea>

       <div className="p-4 border-t bg-background">
        {attachedFile && (
          <div className="relative mb-2 p-2 border rounded-lg flex items-center gap-2 bg-secondary/50">
            {filePreview && <Image src={filePreview} alt="Preview" width={40} height={40} className="rounded-md object-cover h-10 w-10" />}
            <span className="text-sm text-muted-foreground truncate flex-1">{attachedFile.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setAttachedFile(null);
                setFilePreview(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
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
              className="rounded-xl text-foreground focus-visible:ring-primary/50"
            />
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/*"
            />
            <Button onClick={() => fileInputRef.current?.click()} size="icon" variant="ghost">
                <Paperclip className="h-5 w-5 text-foreground" />
            </Button>
            <Button onClick={() => setIsAudioDialogOpen(true)} size="icon" variant="ghost">
                <Mic className="h-5 w-5 text-foreground" />
            </Button>
            <Button onClick={handleTextSend} disabled={(!input.trim() && !attachedFile) || isLuminaTyping}>
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
