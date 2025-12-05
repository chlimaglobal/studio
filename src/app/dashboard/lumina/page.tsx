
"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Mic, Paperclip, Camera, Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, fileToBase64 } from "@/lib/utils";
import { onChatUpdate, addChatMessage, addCoupleChatMessage, onCoupleChatUpdate } from "@/lib/storage";
import type { ChatMessage } from "@/lib/types";
import { useTransactions, useViewMode, useAuth, useLumina, useCoupleStore } from "@/components/client-providers";
import { AudioInputDialog } from "@/components/audio-transaction-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChat } from 'ai/react';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";


const TypingIndicator = () => (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]"></span>
      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]"></span>
      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]"></span>
    </div>
);

export default function ChatPage() {
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { viewMode } = useViewMode();
  const { setHasUnread } = useLumina();
  const { coupleLink } = useCoupleStore.getState();
  const [isAudioOpen, setIsAudioOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { 
    messages, 
    setMessages, 
    input, 
    handleInputChange, 
    handleSubmit,
    isLoading, 
    error,
    append,
    reload,
  } = useChat({
    api: '/api/lumina/chat/stream',
    keepLastMessageOnError: true,
    body: {
      allTransactions: transactions,
      isCoupleMode: viewMode === "together",
      isTTSActive: false,
      user: {
        uid: user?.uid,
        displayName: user?.displayName,
        email: user?.email,
        photoURL: user?.photoURL,
      },
      imageBase64: imageBase64,
    },
    onFinish: (message) => {
        if (!message.content.trim()) return;
        const luminaMsg = {
            role: 'lumina' as const,
            text: message.content,
            authorName: 'Lúmina',
            authorPhotoUrl: '/lumina-avatar.png',
            suggestions: (message.data as any)?.finalSuggestions || [],
        };
        if (viewMode === "together" && coupleLink) {
            addCoupleChatMessage(coupleLink.id, luminaMsg);
        } else if (user) {
            addChatMessage(user.uid, luminaMsg);
        }
        // Clear image after successful submission
        setImagePreview(null);
        setImageBase64(null);
    },
    onError: () => {
        // Don't clear image on error so user can retry
    }
  });
  
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const isInitialLoad = messages.length === 0;
    if (!isInitialLoad) return;

    const unsub = viewMode === "together" && coupleLink
      ? onCoupleChatUpdate(coupleLink.id, (dbMsgs) => {
          const formatted = dbMsgs.map(m => ({
            id: m.id || '',
            role: m.role === 'lumina' ? 'assistant' : 'user',
            content: m.text || ''
          }));
          setMessages(formatted as any);
        })
      : onChatUpdate(user.uid, (dbMsgs) => {
          const formatted = dbMsgs.map(m => ({
            id: m.id || '',
            role: m.role === 'lumina' ? 'assistant' : 'user',
            content: m.text || ''
          }));
          setMessages(formatted as any);
        });

    return unsub;
  }, [user, viewMode, coupleLink, setMessages, messages.length]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setHasUnread(false);
    localStorage.setItem('lastLuminaVisit', new Date().toISOString());
  }, [setHasUnread]);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if ((!input.trim() && !imageBase64) || !user) return;

    const userMsgForDb: Omit<ChatMessage, 'id'|'timestamp'> = {
      role: 'user' as const,
      text: input,
      authorId: user.uid,
      authorName: user.displayName || 'Você',
      authorPhotoUrl: user.photoURL || '',
    };
    if (viewMode === "together" && coupleLink) {
      addCoupleChatMessage(coupleLink.id, userMsgForDb);
    } else {
      addChatMessage(user.uid, userMsgForDb);
    }
    
    handleSubmit(e, {
        options: {
            body: {
                imageBase64: imageBase64,
            }
        }
    });
  };

  const handleAudioTranscript = (transcript: string) => {
    console.log("Transcrição recebida:", transcript);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "Arquivo muito grande",
          description: "Por favor, selecione uma imagem com menos de 2MB.",
        });
        return;
      }
      const base64 = await fileToBase64(file);
      setImagePreview(URL.createObjectURL(file));
      setImageBase64(base64);
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if(fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };


  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="font-semibold">Lúmina</h1>
          <p className="text-xs text-muted-foreground">Assistente financeira</p>
        </div>
      </header>

      <ScrollArea className="flex-1" style={{ minHeight: 0 }}>
         <div className="flex flex-col w-full h-full overflow-y-auto min-w-0 px-4 py-3 gap-3">
          {messages.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <div>
                <h2 className="text-2xl font-bold mb-2">Olá</h2>
                <p className="text-muted-foreground">Converse com a Lúmina — digite ou envie voz/foto.</p>
              </div>
            </div>
          ) : (
             <>
              {messages.map((m, i) => {
                const isUser = m.role === 'user';
            
                return (
                    <div
                        key={m.id || i}
                        className={cn(
                        "flex w-full min-w-0",
                        isUser ? "justify-end" : "justify-start"
                        )}
                    >
                        <div
                        className={cn(
                            "rounded-3xl px-5 py-3.5 shadow-lg max-w-[85%] min-w-0",
                            isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-card border rounded-bl-none"
                        )}
                        >
                        <p className="text-xs font-medium opacity-70 mb-2">
                            {isUser ? "Você" : "Lúmina"}
                        </p>
            
                        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                            {m.content}
                        </p>
                        </div>
                    </div>
                );
              })}
            
              {isLoading && (
                 <div className="flex w-full min-w-0 justify-start">
                    <div className="rounded-3xl px-5 py-3.5 shadow-lg max-w-[85%] min-w-0 bg-card border rounded-bl-none">
                        <div className="text-xs font-medium opacity-70 mb-2">
                           <TypingIndicator />
                        </div>
                    </div>
                 </div>
              )}
              <div ref={bottomRef} />
             </>
          )}
        </div>
      </ScrollArea>
      
      <div className="border-t">
        {imagePreview && (
            <div className="p-4 bg-muted/50 relative">
                <p className="text-xs text-muted-foreground mb-2">Imagem anexada:</p>
                <div className="relative w-20 h-20">
                    <Image src={imagePreview} alt="Pré-visualização" layout="fill" objectFit="cover" className="rounded-md" />
                    <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={clearImage}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}
        <form onSubmit={handleFormSubmit} className="p-4 flex items-center gap-3">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Anexar arquivo"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            >
            <Paperclip className="w-5 h-5" />
            </Button>

            <Input
            placeholder="Digite uma mensagem..."
            value={input}
            onChange={handleInputChange}
            className="flex-1 min-w-0"
            disabled={isLoading}
            />
            
            <AudioInputDialog 
                open={isAudioOpen} 
                onOpenChange={setIsAudioOpen} 
                onTranscript={handleAudioTranscript}>
                <Button type="button" variant="ghost" size="icon" aria-label="Enviar áudio">
                    <Mic className="w-5 h-5" />
                </Button>
            </AudioInputDialog>

            <Button type="submit" disabled={isLoading || (!input.trim() && !imageBase64)}>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
        </form>
      </div>
    </div>
  );
}
