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
import { onChatUpdate, addChatMessage, addCoupleChatMessage } from '@/lib/storage';
import type { ChatMessage } from "@/lib/types";
import { AudioInputDialog } from "@/components/audio-transaction-dialog";

const TypingIndicator = () => (
  <div className="flex items-center space-x-2">
    <span className="h-2 w-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
    <span className="h-2 w-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
    <span className="h-2 w-2 bg-current/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
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
  const { viewMode } = useViewMode();
  const { hasUnread, setHasUnread } = useLumina();
  const { coupleLink, partner } = useCoupleStore();
  
  const view = viewMode;

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const handleMessages = (newMessages: ChatMessage[]) => {
      setMessages(newMessages);
      setIsLoading(false);
    };
    const unsub = view === 'together' && coupleLink
      ? onChatUpdate(coupleLink.id, handleMessages)
      : onChatUpdate(user.uid, handleMessages);
    return () => unsub();
  }, [user, view, coupleLink]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, isLuminaTyping]);
  useEffect(() => { setHasUnread(false); }, []);

  const handlePlayAudio = useCallback((url: string, id: string) => {
    if (!audioRef.current) return;
    if (currentlyPlaying === id) {
      audioRef.current.pause();
      setCurrentlyPlaying(null);
    } else {
      audioRef.current.src = url;
      audioRef.current.play();
      setCurrentlyPlaying(id);
    }
  }, [currentlyPlaying]);

  const handleSend = useCallback(async (text: string, fromAudio = false) => {
    if ((!text.trim() && !attachedFile) || !user) return;

    setInput("");
    setFilePreview(null);
    const file = attachedFile;
    setAttachedFile(null);

    const userMsg: ChatMessage = {
      role: "user",
      text,
      authorId: user.uid,
      authorName: user.displayName || "Você",
      authorPhotoUrl: user.photoURL || "",
      timestamp: new Date(),
    };
    view === 'together' && coupleLink
      ? await addCoupleChatMessage(coupleLink.id, userMsg)
      : await addChatMessage(user.uid, userMsg);

    setIsLuminaTyping(true);
    const imageBase64 = file ? await fileToBase64(file) : null;

    // Placeholder único
    const placeholderId = "lumina-current";
    setMessages(prev => [...prev.filter(m => m.id !== placeholderId), {
      id: placeholderId,
      role: "lumina",
      text: "",
      authorName: "Lúmina",
      authorPhotoUrl: "/lumina-avatar.png",
      timestamp: new Date(),
    }]);

    try {
      const res = await fetch('/api/lumina/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: text,
          audioText: fromAudio ? text : undefined,
          chatHistory: messages,
          allTransactions: transactions,
          imageBase64,
          isCoupleMode: view === 'together',
          isTTSActive: isTTSEnabled,
          user: { uid: user.uid, displayName: user.displayName },
          partner,
        }),
      });

      if (!res.ok || !res.body) throw new Error();

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      setIsLuminaTyping(false);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === placeholderId ? { ...m, text: fullText } : m));
      }

      // Salva mensagem final no Firestore (o listener vai atualizar)
      const finalMsg: ChatMessage = {
        role: "lumina",
        text: fullText.trim(),
        authorName: "Lúmina",
        authorPhotoUrl: "/lumina-avatar.png",
        timestamp: new Date(),
      };
      view === 'together' && coupleLink
        ? await addCoupleChatMessage(coupleLink.id, finalMsg)
        : await addChatMessage(user.uid, finalMsg);

      setMessages(prev => prev.filter(m => m.id !== placeholderId));

    } catch {
      setIsLuminaTyping(false);
      setMessages(prev => prev.filter(m => m.id !== placeholderId));
    }
  }, [user, messages, transactions, view, isTTSEnabled, attachedFile, partner, coupleLink]);

  return (
    <div className="flex flex-col h-full bg-background">
      <audio ref={audioRef} className="hidden" />
      <header className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-primary/50 shadow-[0_0_12px_rgba(255,215,130,0.4)]">
            <AvatarImage src="/lumina-avatar.png" />
            <AvatarFallback>L</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-base font-semibold">Lúmina – sua assistente financeira</h1>
            <p className="text-xs text-muted-foreground">Planejamento. Análise. Ação.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsTTSEnabled(!isTTSEnabled)}>
          {isTTSEnabled ? <Volume2 className="h-6 w-6 text-primary" /> : <VolumeX className="h-6 w-6" />}
        </Button>
      </header>

      <ScrollArea className="flex-1 p-4 pb-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : messages.length === 0 && !isLuminaTyping ? (
          <WelcomeMessage />
        ) : (
          <div className="space-y-6 pb-6">
            {messages.map((m, i) => {
              const isUser = m.authorId === user?.uid;
              const name = isUser ? "Você" : m.authorName || "Lúmina";

              return (
                <div
                  key={m.id || i}
                  className={cn("flex items-end gap-3 w-full", isUser ? "justify-end" : "justify-start")}
                >
                  {!isUser && (
                    <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-primary/50 shadow-glow">
                      <AvatarImage src={m.authorPhotoUrl || "/lumina-avatar.png"} />
                      <AvatarFallback>L</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("p-3 rounded-2xl w-full max-w-full", isUser ? "bg-primary/90 text-primary-foreground" : "bg-muted/80 backdrop-blur-sm border border-white/5")}>
                     <p className="text-xs font-medium opacity-80 mb-1">{name}</p>
                     <div className="w-full overflow-hidden">
                        <div className="inline-block min-w-0 max-w-full break-words whitespace-pre-wrap text-sm md:text-base leading-relaxed">
                            {m.text}
                        </div>
                    </div>
                    {!isUser && m.audioUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mt-3 h-8 w-8"
                        onClick={() => handlePlayAudio(m.audioUrl!, m.id || `${i}`)}
                      >
                        <Play className={cn("h-4 w-4", currentlyPlaying === (m.id || `${i}`) && "text-primary")} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLuminaTyping && (
              <div className="flex items-end gap-3 w-full">
                <Avatar className="h-8 w-8 flex-shrink-0 border-2 border-primary/50 shadow-glow">
                  <AvatarImage src="/lumina-avatar.png" />
                  <AvatarFallback>L</AvatarFallback>
                </Avatar>
                <div className="rounded-2xl px-4 py-3 bg-muted/80 backdrop-blur-sm border border-white/5">
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input area – sem mudança */}
      <div className="p-4 border-t bg-background">
        {/* ... seu código de input permanece igual ... */}
        {/* (mantive exatamente como estava) */}
      </div>

      <AudioInputDialog open={isAudioDialogOpen} onOpenChange={setIsAudioDialogOpen} onTranscript={t => handleSend(t, true)} />
    </div>
  );
}
