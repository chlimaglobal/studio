'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, Volume2, VolumeX, Mic, Paperclip, X, Camera, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useTransactions, useLumina, useViewMode, useCoupleStore } from '@/components/client-providers';
import { addChatMessage, addCoupleChatMessage, onChatUpdate, fileToBase64 } from '@/lib/storage';
import type { ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';

const THINK_SOUND = '/sounds/lumina_think.mp3';
const RESPONSE_SOUND = '/sounds/lumina_response.mp3';

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5">
    <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
    <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
    <div className="w-2 h-2 bg-current/60 rounded-full animate-bounce" />
  </div>
);

const WelcomeMessage = () => {
  const { user } = useAuth();
  const name = user?.displayName?.split(" ")[0] || "usuário";
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-6">
      <div className="w-20 h-20 mb-4 flex items-center justify-center">
        <div className="lumina-sphere scale-150"></div>
      </div>
      <h2 className="text-2xl font-bold">Olá, {name}!</h2>
      <p className="text-muted-foreground mt-2">Pronta para organizar suas finanças.</p>
    </div>
  );
};

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thinkAudioRef = useRef<HTMLAudioElement | null>(null);
  const responseAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { viewMode } = useViewMode();
  const { setHasUnread } = useLumina();
  const { coupleLink } = useCoupleStore();
  const { theme } = useTheme();
  
  useEffect(() => {
    thinkAudioRef.current = typeof window !== 'undefined' ? new Audio(THINK_SOUND) : null;
    responseAudioRef.current = typeof window !== 'undefined' ? new Audio(RESPONSE_SOUND) : null;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = viewMode === "together" && coupleLink
      ? onChatUpdate(coupleLink.id, (msgs) => { setMessages(msgs); setIsLoading(false); })
      : onChatUpdate(user.uid, (msgs) => { setMessages(msgs); setIsLoading(false); });
    return unsub;
  }, [user, viewMode, coupleLink]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);
  
  useEffect(() => {
    setHasUnread(false);
    localStorage.setItem('lastLuminaVisit', new Date().toISOString());
  }, [setHasUnread]);

  const playThink = () => { try { thinkAudioRef.current?.play().catch(()=>{}); } catch(e){} };
  const playResponse = () => {
      try {
          setIsResponding(true);
          responseAudioRef.current?.play().catch(() => {});
          setTimeout(() => setIsResponding(false), 1000); // duração da animação
      } catch (e) {}
  };


  const send = useCallback(async (text: string, file?: File, audioBase64?: string) => {
    if ((!text.trim() && !file && !audioBase64) || !user) return;

    setInput("");
    const currentFile = file;
    setFile(null);
    setPreview(null);

    const userMsg: Omit<ChatMessage, 'id' | 'timestamp'> = { role: "user", text: text.trim(), authorId: user.uid, authorName: user.displayName || "Você", authorPhotoUrl: user.photoURL || "" };
    
    if(viewMode === 'together' && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, userMsg);
    } else {
        await addChatMessage(user.uid, userMsg);
    }

    setIsTyping(true);
    playThink();

    await new Promise(resolve => setTimeout(resolve, 1500));

    const tempId = "lumina-temp-" + Date.now();
    
    try {
      const imgBase64 = currentFile ? await fileToBase64(currentFile) : null;
      const res = await fetch("/api/lumina/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: text,
          audioText: audioBase64, // Sending base64 audio
          chatHistory: messages,
          allTransactions: transactions,
          imageBase64: imgBase64,
          isCoupleMode: viewMode === "together",
          isTTSActive: ttsOn,
        }),
      });

      if (!res.ok) {
        setMessages(p => p.filter(m => m.id !== tempId));
        await addChatMessage(user.uid, { role: "lumina", text: "Desculpe, tive um problema técnico no servidor.", authorName: "Lúmina", authorPhotoUrl: "/lumina-avatar.png"});
        setIsTyping(false);
        return;
      }

      if (!res.body) throw new Error("No response body");
      playResponse();

      const tempLuminaMessage: ChatMessage = { 
          id: tempId, 
          role: "lumina", 
          text: "", 
          authorName: "Lúmina", 
          authorPhotoUrl: "/lumina-avatar.png", 
          timestamp: new Date() 
      };

      setMessages(prev => [...prev, tempLuminaMessage]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(p => p.map(m => m.id === tempId ? { ...m, text: fullText } : m));
      }
      
      const finalMsg: Omit<ChatMessage, 'id' | 'timestamp'> = { role: "lumina", text: fullText.trim(), authorName: "Lúmina", authorPhotoUrl: "/lumina-avatar.png" };
      
      if(viewMode === 'together' && coupleLink) {
          await addCoupleChatMessage(coupleLink.id, finalMsg);
      } else {
          await addChatMessage(user!.uid, finalMsg);
      }

    } catch (e) {
      console.error(e);
      const errorMsg: Omit<ChatMessage, 'id'|'timestamp'> = { role: "lumina", text: 'Desculpe, tive um problema técnico. Vamos tentar novamente.', authorName: "Lúmina", authorPhotoUrl: "/lumina-avatar.png" };
      if(viewMode === 'together' && coupleLink) {
          await addCoupleChatMessage(coupleLink.id, errorMsg);
      } else {
          await addChatMessage(user!.uid, errorMsg);
      }
    } finally {
      setIsTyping(false); 
      setMessages(p => p.filter(m => m.id !== tempId));
    }
  }, [user, messages, transactions, viewMode, ttsOn, coupleLink]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
    }
  };
  
  const handleSendMessage = () => {
    send(input, file);
  };

  const openCamera = () => {
    // Placeholder for camera functionality
    console.log("Opening camera...");
  };

  const onSendAudio = async (audioBlob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      send("Processando áudio...", undefined, base64Audio);
    };
  };

  const startRecording = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      } catch (e) {
          console.error("Error starting recording", e);
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/mpeg" });
            onSendAudio(audioBlob);
        };
      }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
             <div className={cn("lumina-sphere", isTyping && "thinking", isResponding && "responding")}></div>
          </div>
          <div>
            <h1 className="font-semibold">Lúmina</h1>
            <p className="text-xs text-muted-foreground">Assistente financeira</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setTtsOn(!ttsOn)}>
                {ttsOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </Button>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="chat-container min-h-full py-4" data-theme={theme}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : messages.length === 0 && !isTyping ? (
            <WelcomeMessage />
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => {
                const isUser = m.authorId === user?.uid;

                return (
                  <div
                    key={m.id || i} className={cn("flex w-full items-end gap-3 px-4 py-2", isUser ? "justify-end" : "justify-start")} >
                    {!isUser && (
                      <Avatar className="h-11 w-11 flex-shrink-0">
                        <AvatarImage src="/lumina-avatar.png" />
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-lg">L</AvatarFallback>
                      </Avatar>
                    )}

                    <div className="max-w-full">
                      <div
                        className={cn(
                          "inline-block max-w-full rounded-3xl px-5 py-3.5 shadow-lg border",
                          "data-[theme=light]:bg-white data-[theme=light]:text-gray-900 data-[theme=light]:border-gray-300",
                          "data-[theme=dark]:bg-gray-800 data-[theme=dark]:text-white data-[theme=dark]:border-gray-700",
                          "data-[theme=gold]:bg-gradient-to-r data-[theme=gold]:from-amber-700 data-[theme=gold]:to-orange-700 data-[theme=gold]:text-white data-[theme=gold]:border-amber-500/50",
                          isUser && "data-[theme=light]:bg-blue-600 data-[theme=dark]:bg-blue-700 data-[theme=gold]:bg-amber-600"
                        )}
                      >
                        <p className="text-xs font-medium opacity-70 mb-1">{isUser ? "Você" : "Lúmina"}</p>
                        <p className="text-base leading-relaxed whitespace-pre-wrap break-normal hyphens-auto">
                          {m.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isTyping && (
                <div className="flex w-full items-end gap-3 px-4 py-2">
                  <Avatar className="h-11 w-11 flex-shrink-0">
                    <AvatarImage src="/lumina-avatar.png" />
                    <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-lg">L</AvatarFallback>
                  </Avatar>
                  <div className="max-w-full">
                    <div className={cn(
                      "inline-block rounded-3xl px-5 py-3.5 shadow-lg border",
                      "data-[theme=light]:bg-white data-[theme=light]:border-gray-300",
                      "data-[theme=dark]:bg-gray-800 data-[theme=dark]:border-gray-700",
                      "data-[theme=gold]:bg-gradient-to-r data-[theme=gold]:from-amber-700 data-[theme=gold]:to-orange-700 data-[theme=gold]:border-amber-500/50"
                    )}>
                      <TypingIndicator />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <footer className="p-3 border-t bg-[#0D0D0D] border-[#333]">
        {preview && (
            <div className="relative w-24 h-24 mb-2 p-2 border rounded-md">
                <Avatar className="w-full h-full rounded-md">
                    <AvatarImage src={preview} alt="Pré-visualização" className="object-cover"/>
                </Avatar>
                <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => { setFile(null); setPreview(null); }}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3 border-t border-[#333] bg-[#0D0D0D]">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
                <Paperclip />
            </button>
            <button className="icon-btn" onClick={openCamera}>
                <Camera />
            </button>
            <Input
                className="flex-1 bg-transparent border border-[#333] rounded-xl px-3 py-2 text-white placeholder-[#777] outline-none"
                placeholder="Digite uma mensagem..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button className="icon-btn" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}>
                <Mic />
            </button>
            <button className="send-btn" onClick={handleSendMessage}>
                <Send />
            </button>
        </div>
      </footer>
    </div>
  );
}
