'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import AvatarPremium from '@/components/lumina/AvatarPremium';
import { Loader2, Volume2, VolumeX, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useTransactions, useLumina, useViewMode, useCoupleStore } from '@/components/client-providers';
import { addChatMessage, addCoupleChatMessage, onChatUpdate, fileToBase64 } from '@/lib/storage';
import type { ChatMessage } from '@/lib/types';

// sounds (place in /public/sounds/)
const THINK_SOUND = '/sounds/lumina_think.mp3';
const RESPONSE_SOUND = '/sounds/lumina_response.mp3';

export default function Chat() {
  const { user } = useAuth();
  const { transactions } = useTransactions();
  const { viewMode } = useViewMode();
  const { coupleLink } = useCoupleStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ttsOn, setTtsOn] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const thinkAudioRef = useRef<HTMLAudioElement | null>(null);
  const responseAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    thinkAudioRef.current = typeof window !== 'undefined' ? new Audio(THINK_SOUND) : null;
    responseAudioRef.current = typeof window !== 'undefined' ? new Audio(RESPONSE_SOUND) : null;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = (viewMode === 'together' && coupleLink)
      // @ts-ignore
      ? onChatUpdate(coupleLink.id, setMessages)
      // @ts-ignore
      : onChatUpdate(user.uid, setMessages);
    return () => unsub();
  }, [user, viewMode, coupleLink]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const playThink = () => { try { thinkAudioRef.current?.play().catch(()=>{}); } catch(e){} };
  const playResponse = () => { try { responseAudioRef.current?.play().catch(()=>{}); } catch(e){} };

  const speak = (text: string) => {
    if (!ttsOn || !('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const send = useCallback(async (text: string, file?: File) => {
    if (!user || (!text.trim() && !file)) return;
    
    setInput('');
    setIsTyping(true);

    // add user message locally + db
    const userMsg: Omit<ChatMessage, 'id'> = {
      role: 'user',
      text: text.trim(),
      authorId: user.uid,
      authorName: user.displayName || 'Você',
      authorPhotoUrl: user.photoURL || '',
      timestamp: new Date(),
    };

    if (viewMode === 'together' && coupleLink) {
      await addCoupleChatMessage(coupleLink.id, userMsg);
    } else {
      await addChatMessage(user!.uid, userMsg);
    }

    // prepare and show Lúmina placeholder with premium glow
    const tempId = 'lumina-temp-' + Date.now();
    setMessages(prev => [...prev, {
      id: tempId,
      role: 'lumina',
      text: '',
      authorName: 'Lúmina',
      authorPhotoUrl: '/lumina-avatar.png',
      timestamp: new Date()
    }]);

    playThink();

    // stream request to backend (same as you had)
    try {
      const imgBase64 = file ? await fileToBase64(file) : null;
      const res = await fetch('/api/lumina/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: text,
          chatHistory: messages,
          allTransactions: transactions,
          imageBase64: imgBase64,
          isCoupleMode: viewMode === 'together',
        }),
      });

      if (!res.ok) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: "Desculpe, tive um problema técnico no servidor." } : m));
        throw new Error('Server error');
      }
      
      if (!res.body) throw new Error('No body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: acc } : m));
      }

      const finalText = acc.trim();
      const luminaMsg: Omit<ChatMessage, 'id'> = {
        role: 'lumina',
        text: finalText,
        authorName: 'Lúmina',
        authorPhotoUrl: '/lumina-avatar.png',
        timestamp: new Date()
      };

      // save final message
      if (viewMode === 'together' && coupleLink) {
        await addCoupleChatMessage(coupleLink.id, luminaMsg);
      } else {
        await addChatMessage(user!.uid, luminaMsg);
      }

      // cleanup temp placeholder
      setMessages(prev => prev.filter(m => m.id !== tempId));
      playResponse();
      speak(finalText);
    } catch (e) {
      // remove placeholder and show fallback message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        role: 'lumina',
        text: 'Desculpe, tive um problema técnico. Vamos tentar novamente.',
        authorName: 'Lúmina',
        authorPhotoUrl: '/lumina-avatar.png',
        timestamp: new Date()
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [user, messages, transactions, viewMode, coupleLink, speak, ttsOn]);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      <header className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12">
            <AvatarPremium size={56} floating />
          </div>
          <div>
            <div className="font-semibold">Lúmina</div>
            <div className="text-xs text-slate-400">Assistente financeira</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={cn('p-2 rounded-md', ttsOn ? 'bg-slate-700' : 'bg-transparent')}
            onClick={() => setTtsOn(!ttsOn)}
            aria-label="Toggle TTS"
          >
            {ttsOn ? <Volume2 /> : <VolumeX />}
          </button>
          <button
            className="p-2 rounded-md bg-gradient-to-r from-amber-500/20 to-rose-400/10"
            onClick={() => {
              // optional quick action
            }}
            aria-label="Assist"
          >
            <Mic />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto px-4 py-3">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && !isTyping && (
            <div className="text-center p-8 rounded-lg bg-slate-800/40">
              <div className="text-lg font-medium">Olá! Posso te ajudar com suas finanças.</div>
            </div>
          )}

          {messages.map((m, idx) => {
            const mine = m.authorId === user?.uid;
            const isLumina = m.role === 'lumina';
            return (
              <div key={m.id || idx} className={cn('flex gap-3', mine ? 'justify-end' : 'justify-start')}>
                {!mine && (
                  <div className="flex-shrink-0 self-end">
                    <AvatarPremium size={48} floating={false} />
                  </div>
                )}

                <div className={cn(
                  'px-4 py-3 rounded-2xl message-bubble',
                  mine ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-100',
                  isLumina ? 'premium-glow holo-breath' : ''
                )}>
                  <div className="text-xs opacity-70 mb-1">{mine ? 'Você' : m.authorName || 'Lúmina'}</div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</div>
                  {/* typing neon */}
                  {isLumina && isTyping && m.id?.startsWith('lumina-temp-') && <div className="mt-2 text-xs text-slate-300 typing-neon">Lúmina está digitando...</div>}
                </div>
              </div>
            );
          })}

          {isTyping && messages.every(m => !m.id?.startsWith('lumina-temp-')) && (
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <AvatarPremium size={40} floating={false} />
              </div>
              <div className="rounded-2xl px-4 py-3 bg-slate-700 text-slate-200">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" /><div className="text-sm">Lúmina está pensando...</div></div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="p-4 border-t border-slate-800">
        {/* Input row - keep simple here */}
        <div className="flex gap-2 items-center max-w-3xl mx-auto">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escreva uma mensagem para Lúmina..."
            className="flex-1 rounded-full px-4 py-2 bg-slate-800 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
            onKeyDown={(e) => { if (e.key === 'Enter') send(input); }}
          />
          <button className="px-4 py-2 rounded-full bg-sky-500 text-slate-900 font-semibold" onClick={() => send(input)}>Enviar</button>
        </div>
      </footer>
    </div>
  );
}
