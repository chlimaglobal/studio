
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Loader2, Mic, Paperclip, Camera, Send } from "lucide-react";
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

  // Vercel AI SDK chat hook - a chave para a correção.
  // NÃO passamos mais um 'body' fixo aqui.
  const { 
    messages, 
    setMessages, 
    input, 
    handleInputChange, 
    isLoading, 
    error,
    append // A função 'append' é a chave para a solução.
  } = useChat({
    api: '/api/lumina/chat/stream',
    onFinish: (message) => {
        // Persiste a mensagem final da Lumina no Firestore
        if (!message.content.trim()) return; // Não salve respostas vazias
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
    }
  });
  
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Sincroniza o histórico do Firestore com o estado do `useChat` na carga inicial
  useEffect(() => {
    if (!user) return;
    
    // Evita recarregar o histórico se já houver mensagens (para não apagar as que estão em streaming)
    if (messages.length > 0) return;

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

  // Esta é a nova função de envio que controla todo o fluxo
  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    // 1. Adiciona a mensagem do usuário à UI imediatamente usando `append`
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
    };
    append(userMessage);

    // 2. Persiste a mensagem do usuário no Firestore (como antes)
    const userMsgForDb = {
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

    // 3. Dispara a chamada para a API manualmente com o body completo
    // O hook `useChat` irá automaticamente lidar com a resposta de streaming
    await fetch('/api/lumina/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userQuery: input,
        messages: [...messages, userMessage], // Envia histórico completo + nova mensagem
        allTransactions: transactions,
        isCoupleMode: viewMode === "together",
        isTTSActive: false, // Pode ser dinâmico se necessário
        user: {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        },
      }),
    });
  };

  const handleAudioTranscript = (transcript: string) => {
    // Para implementar a funcionalidade de áudio, você faria algo semelhante a `sendMessage`
    // mas usando o 'transcript' em vez do 'input' do campo de texto.
    console.log("Transcrição recebida:", transcript);
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
                        {/* Nome */}
                        <p className="text-xs font-medium opacity-70 mb-2">
                            {isUser ? "Você" : "Lúmina"}
                        </p>
            
                        {/* Texto — quebra a linha corretamente */}
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

      {/* Input area - Agora usa a função `sendMessage` */}
      <form onSubmit={sendMessage} className="p-4 border-t flex items-center gap-3">
        {/* Placeholder for future file input */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Anexar imagem"
          disabled
        >
          <Camera className="w-5 h-5" />
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

        <Button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>
  );
}
