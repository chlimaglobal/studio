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

const TypingIndicator = () => (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]"></span>
      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]"></span>
      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]"></span>
    </div>
);

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false); // Used to disable input
  const [ttsOn, setTtsOn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { viewMode } = useViewMode();
  const { setHasUnread } = useLumina();
  const coupleLink = useCoupleStore(s => s.coupleLink);

  // subscribe to chat
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const unsub = viewMode === "together" && coupleLink
      ? onCoupleChatUpdate(coupleLink.id, (msgs) => { setMessages(msgs); setIsLoading(false); })
      : onChatUpdate(user.uid, (msgs) => { setMessages(msgs); setIsLoading(false); });
    return unsub;
  }, [user, viewMode, coupleLink]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setHasUnread(false);
    localStorage.setItem('lastLuminaVisit', new Date().toISOString());
  }, [setHasUnread]);

  const send = useCallback(async (text: string, fromVoice = false) => {
    if ((!text.trim() && !file) || !user) return;

    setIsResponding(true);
    const query = text.trim();
    setInput("");
    setPreview(null);
    const imgBase64 = file ? await fileToBase64(file) : null;
    setFile(null);

    const userMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: "user",
      text: query,
      authorId: user.uid,
      authorName: user.displayName || "Você",
      authorPhotoUrl: user.photoURL || "",
    };

    // Optimistically add user message to state
    setMessages(prev => [...prev, { ...userMsg, id: `user-${Date.now()}`, timestamp: new Date() }]);

    // Persist user message in the background
    if (viewMode === "together" && coupleLink) {
      await addCoupleChatMessage(coupleLink.id, userMsg);
    } else {
      await addChatMessage(user.uid, userMsg);
    }

    try {
      const res = await fetch("/api/lumina/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: query,
          audioText: fromVoice ? query : undefined,
          chatHistory: messages,
          allTransactions: transactions,
          imageBase64: imgBase64,
          isCoupleMode: viewMode === "together",
          isTTSActive: ttsOn,
          user: user
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(res.statusText || "Resposta inválida do servidor");
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedResponse = "";

      // Add a placeholder for Lumina's response
      const luminaPlaceholderId = `lumina-${Date.now()}`;
      setMessages(prev => [...prev, { id: luminaPlaceholderId, role: "lumina", text: "", authorName: "Lúmina", authorPhotoUrl: "/lumina-avatar.png", timestamp: new Date() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedResponse += decoder.decode(value, { stream: true });
        
        // Update the placeholder in-place
        setMessages(prev => prev.map(m => 
            m.id === luminaPlaceholderId 
            ? { ...m, text: accumulatedResponse } 
            : m
        ));
      }
      
      // Final message is already in place. Nothing more to do.

    } catch (error) {
      console.error("Erro no stream:", error);
      const errorMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: "lumina",
        text: "Parece que estou com um pouco de dificuldade para me conectar. Que tal tentarmos um resumo do seu mês?",
        authorName: "Lúmina",
        authorPhotoUrl: "/lumina-avatar.png",
        suggestions: ["Resumo do mês", "Maiores gastos", "Quanto eu economizei?"],
      };
      if (viewMode === "together" && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, errorMsg);
      } else {
        await addChatMessage(user!.uid, errorMsg);
      }
    } finally {
      setIsResponding(false);
    }
  }, [user, messages, transactions, viewMode, ttsOn, file, coupleLink]);

  // file picker handler
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const b = await fileToBase64(f);
      setPreview(b);
    } else {
      setPreview(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="font-semibold">Lúmina</h1>
          <p className="text-xs text-muted-foreground">Assistente financeira</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="p-2 rounded-md hover:bg-muted/50"
            onClick={() => setTtsOn(v => !v)}
            aria-label="Toggle TTS"
          >
            {ttsOn ? <Mic className="w-5 h-5 text-primary" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1" style={{ minHeight: 0 }}>
         <div className="flex flex-col w-full h-full overflow-y-auto min-w-0 px-4 py-3 gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : messages.length === 0 && !isResponding ? (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <div>
                <h2 className="text-2xl font-bold mb-2">Olá</h2>
                <p className="text-muted-foreground">Converse com a Lúmina — digite ou envie voz/foto.</p>
              </div>
            </div>
          ) : (
             <>
              {messages.map((m, i) => {
                const isUser = m.authorId === user?.uid;
            
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
                            {isUser ? "Você" : (m.text ? "Lúmina" : <TypingIndicator />)}
                        </p>
            
                        {/* Texto — NUNCA estoura */}
                        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                            {m.text}
                        </p>
                        </div>
                    </div>
                );
              })}
            
              <div ref={bottomRef} />
             </>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />

        <Button
          variant="ghost"
          size="icon"
          onClick={() => fileRef.current?.click()}
          aria-label="Anexar imagem"
        >
          <Camera className="w-5 h-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setPreview(null) || setFile(null)}
          aria-label="Limpar anexo"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        <Input
          placeholder="Digite uma mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          className="flex-1 min-w-0"
          disabled={isResponding}
        />

        <AudioInputDialog open={false} onOpenChange={() => {}} onTranscript={() => {}} />

        <Button onClick={() => send(input)} disabled={isResponding || (!input.trim() && !file)}>
          {isResponding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

    