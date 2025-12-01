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

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
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
    const unsub = viewMode === "together" && coupleLink
      ? onCoupleChatUpdate(coupleLink.id, (msgs) => { setMessages(msgs); setIsLoading(false); })
      : onChatUpdate(user.uid, (msgs) => { setMessages(msgs); setIsLoading(false); });
    setIsLoading(false);
    return unsub;
  }, [user, viewMode, coupleLink]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    setHasUnread(false);
    localStorage.setItem('lastLuminaVisit', new Date().toISOString());
  }, [setHasUnread]);

  const send = useCallback(async (text: string, fromVoice = false) => {
    if ((!text.trim() && !file) || !user) return;

    setInput("");
    setPreview(null);
    const imgBase64 = file ? await fileToBase64(file) : null;
    setFile(null);

    const userMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: "user",
      text,
      authorId: user.uid,
      authorName: user.displayName || "Você",
      authorPhotoUrl: user.photoURL || "",
    };

    // persist user message
    if (viewMode === "together" && coupleLink) {
      await addCoupleChatMessage(coupleLink.id, userMsg);
    } else {
      await addChatMessage(user.uid, userMsg);
    }

    // show typing placeholder
    setIsTyping(true);
    const tempId = `temp-${Date.now()}`;
    setMessages(prev => [...prev, { id: tempId, role: "lumina", text: "", authorName: "Lúmina", authorPhotoUrl: "", timestamp: new Date() }]);

    try {
      // stream endpoint (assume exists)
      const res = await fetch("/api/lumina/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: text,
          audioText: fromVoice ? text : undefined,
          chatHistory: messages,
          allTransactions: transactions,
          imageBase64: imgBase64,
          isCoupleMode: viewMode === "together",
          isTTSActive: ttsOn,
          user: user
        }),
      });

      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // update placeholder bubble
        setMessages(prev => prev.map(m => (m.id === tempId ? { ...m, text: accumulated } : m)));
      }

      const finalMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: "lumina",
        text: accumulated.trim(),
        authorName: "Lúmina",
        authorPhotoUrl: "/lumina-avatar.png",
      };

      // persist final response
      if (viewMode === "together" && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, finalMsg);
      } else {
        await addChatMessage(user.uid, finalMsg);
      }

      // remove placeholder (it will be reloaded by subscription but keep UI clean)
      setMessages(prev => prev.filter(m => m.id !== tempId));

    } catch (err) {
      console.error("Erro no stream:", err);
      // remove placeholder and show fallback
      setMessages(prev => prev.filter(m => m.id !== tempId));
      const fallback: Omit<ChatMessage, 'id' | 'timestamp'> = {
        role: "lumina",
        text: "Desculpe, tivemos um problema ao responder. Tente novamente em alguns segundos.",
        authorName: "Lúmina",
        authorPhotoUrl: "/lumina-avatar.png",
      };
      if (viewMode === "together" && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, fallback);
      } else {
        await addChatMessage(user.uid, fallback);
      }
    } finally {
      setIsTyping(false);
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
            {ttsOn ? <Mic className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <ScrollArea className="flex-1" style={{ minHeight: 0 }}>
         <div className="flex flex-col w-full h-full overflow-y-auto min-w-0 px-4 py-3 gap-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : messages.length === 0 && !isTyping ? (
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
                        // Tema claro
                        "data-[theme=light]:bg-white data-[theme=light]:text-gray-900",
                        // Tema escuro
                        "data-[theme=dark]:bg-gray-800/95 data-[theme=dark]:text-white",
                        // Tema dourado — para Lúmina
                        !isUser &&
                          "data-[theme=gold]:bg-gradient-to-br data-[theme=gold]:from-amber-700/90 data-[theme=gold]:to-orange-700/90 text-white",
                        // Bolha do usuário
                        isUser &&
                          "bg-amber-600 text-white"
                      )}
                    >
                      {/* Nome */}
                      <p className="text-xs font-medium opacity-70 mb-2">
                        {isUser ? "Você" : "Lúmina"}
                      </p>
            
                      {/* Texto — NUNCA estoura */}
                      <p className="text-base leading-relaxed whitespace-pre-wrap overflow-wrap-anywhere break-words">
                        {m.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            
              {/* INDICADOR DE DIGITAÇÃO */}
              {isTyping && (
                <div className="flex w-full min-w-0 justify-start">
                  <div
                    className={cn(
                      "rounded-3xl px-5 py-3.5 shadow-lg max-w-[70%] min-w-0",
                      "data-[theme=dark]:bg-gray-800/95 data-[theme=gold]:bg-gradient-to-br data-[theme=gold]:from-amber-700/90 data-[theme=gold]:to-orange-700/90"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:0ms]"></span>
                      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:150ms]"></span>
                      <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:300ms]"></span>
                    </div>
                  </div>
                </div>
              )}
            
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

        <button
          onClick={() => fileRef.current?.click()}
          className="p-2 rounded-md hover:bg-muted/40"
          aria-label="Anexar imagem"
        >
          <Camera className="w-5 h-5" />
        </button>

        <button
          onClick={() => setPreview(null) || setFile(null)}
          className="p-2 rounded-md hover:bg-muted/40"
          aria-label="Limpar anexo"
        >
          <Paperclip className="w-5 h-5" />
        </button>

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
        />

        <AudioInputDialog open={false} onOpenChange={() => {}} onTranscript={() => {}} />

        <Button onClick={() => send(input)} className="flex items-center gap-2">
          <Send className="w-4 h-4" />
          Enviar
        </Button>
      </div>
    </div>
  );
}
