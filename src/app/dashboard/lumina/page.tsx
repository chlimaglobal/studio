
"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { sendMessageToLumina } from "@/lib/lumina/agent";
import { useTransactions, useViewMode, useAuth, useLumina, useCoupleStore } from "@/components/client-providers";
import { Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { onChatUpdate, addChatMessage, onCoupleChatUpdate, addCoupleChatMessage } from "@/lib/storage";
import type { ChatMessage } from "@/lib/types";

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
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { viewMode, partnerData } = useViewMode();
  const { hasUnread, setHasUnread } = useLumina();
  const { coupleLink } = useCoupleStore();


  useEffect(() => {
    if (!user) return;
    
    setIsLoading(true);
    let unsubscribe: () => void;

    const handleMessages = (newMessages: ChatMessage[]) => {
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
  }, [user, viewMode, coupleLink]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLuminaTyping]);
  
  useEffect(() => {
    setHasUnread(false);
    localStorage.setItem('lastLuminaVisit', new Date().toISOString());
  }, [setHasUnread]);


  const handleSend = async () => {
    if (!input.trim() || !user) return;

    const userMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
      role: "user",
      text: input,
      authorId: user.uid,
      authorName: user.displayName || 'Você',
      authorPhotoUrl: user.photoURL || '',
    };
    
    setInput("");
    setIsLuminaTyping(true);

    if (viewMode === 'together' && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, userMessage);
    } else {
        await addChatMessage(user.uid, userMessage);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
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
                        <div key={i} className={cn("flex items-end gap-2", isUser ? "justify-end" : "justify-start")}>
                            {!isUser && (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={m.authorPhotoUrl} />
                                    <AvatarFallback>{authorName.charAt(0)}</AvatarFallback>
                                </Avatar>
                            )}
                            <div
                                className={cn(
                                "p-3 rounded-2xl max-w-[75%]",
                                isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}
                            >
                                <p className="text-sm font-semibold mb-1">{authorName}</p>
                                {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                            </div>
                        </div>
                    )
                })}
                 {isLuminaTyping && (
                    <div className="flex items-end gap-2">
                         <Avatar className="h-8 w-8">
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
                handleSend();
                }
            }}
            />
            <Button onClick={handleSend} disabled={!input.trim()}>
                Enviar
            </Button>
        </div>
      </div>
    </div>
  );
}
