
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, AlertTriangle, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';

type AudioMuralDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscriptReceived: (transcript: string) => void;
}

const SoundWave = () => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-48 w-48 rounded-full bg-primary/20 animate-ping duration-1000"></div>
        <div className="absolute h-32 w-32 rounded-full bg-primary/30 animate-ping delay-200 duration-1000"></div>
    </div>
);

export function AudioMuralDialog({ open, onOpenChange, onTranscriptReceived }: AudioMuralDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // To show loader after recording stops
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const processTranscript = useCallback((transcript: string) => {
    setIsProcessing(true);
    setError(null);

    if (transcript) {
        onTranscriptReceived(transcript);
        onOpenChange(false);
    } else {
        setError('Não consegui ouvir nada. Por favor, tente novamente.');
    }
    setIsProcessing(false);
    
  }, [onOpenChange, onTranscriptReceived]);

  
  useEffect(() => {
    // Cleanup when the dialog closes
    if (!open) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsRecording(false);
      setIsProcessing(false);
      setError(null);
    }
  }, [open]);

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsProcessing(true); // Show loader while result is processed
      return;
    }
    
    if (!('webkitSpeechRecognition' in window)) {
      setError('O reconhecimento de voz não é suportado neste navegador. Tente usar o Chrome.');
      return;
    }
    
    setError(null);
    setIsProcessing(false);

    const SpeechRecognition = window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
    
    recognition.continuous = false;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    
    recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
    };

    recognition.onend = () => {
        setIsRecording(false);
        setIsProcessing(false);
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setError(`Erro: ${event.error}. Verifique a permissão do microfone.`);
        }
        setIsRecording(false);
        setIsProcessing(false);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processTranscript(transcript);
    };
    
    recognition.start();
  };

  const handleOpenChange = (isOpen: boolean) => {
      onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:rounded-2xl bg-background/80 backdrop-blur-sm border-border/50">
        <DialogHeader className="text-center">
          <DialogTitle>Ouvindo sua mensagem</DialogTitle>
          <DialogDescription>
            {isProcessing ? "Processando..." : (isRecording ? "Pode falar..." : "Pressione o botão para começar a falar.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <button
                className={cn(
                    "relative h-32 w-32 rounded-full transition-all duration-300 flex items-center justify-center",
                    isRecording ? 'bg-destructive/20' : 'bg-primary/20'
                )}
                onClick={handleToggleRecording}
                disabled={isProcessing}
                aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
            >
                {isRecording && <SoundWave />}
                 <div className="h-24 w-24 rounded-full bg-background flex items-center justify-center z-10 shadow-inner">
                    {isProcessing ? (
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        ) : isRecording ? (
                        <Square className="h-8 w-8 text-destructive fill-destructive" />
                        ) : (
                        <Mic className="h-10 w-10 text-primary" />
                    )}
                 </div>
            </button>
            {error && (
                <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro na Gravação</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} className="w-full">
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
