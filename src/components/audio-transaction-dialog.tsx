
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Loader2, AlertTriangle, Square } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractTransactionInfoFromText } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';
import { cn } from '@/lib/utils';

type AudioTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionExtracted: (data: Partial<z.infer<typeof TransactionFormSchema>>) => void;
  children?: React.ReactNode;
}

const SoundWave = () => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-48 w-48 rounded-full bg-primary/20 animate-ping duration-1000"></div>
        <div className="absolute h-32 w-32 rounded-full bg-primary/30 animate-ping delay-200 duration-1000"></div>
    </div>
);

export function AudioTransactionDialog({ open, onOpenChange, onTransactionExtracted, children }: AudioTransactionDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const processTranscript = useCallback(async (transcript: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await extractTransactionInfoFromText(transcript);
      // @ts-ignore
      if (result.error) {
        // @ts-ignore
        const errorMessage = result.error || 'Não foi possível extrair os detalhes. Tente ser mais claro.';
        toast({ variant: 'destructive', title: 'Não foi possível entender', description: `${errorMessage} Por favor, tente novamente.` });
        setError(errorMessage);
      } else {
        // @ts-ignore
        onTransactionExtracted(result);
        onOpenChange(false); // Fecha o diálogo de áudio
      }
    } catch (e) {
      const errorMessage = 'Ocorreu um erro ao falar com a Lúmina. Tente novamente.';
      toast({ variant: 'destructive', title: 'Erro de Processamento', description: errorMessage });
      setError(errorMessage);
    } finally {
        setIsProcessing(false);
    }
  }, [toast, onOpenChange, onTransactionExtracted]);

  
  useEffect(() => {
    // Limpeza quando o diálogo fecha
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

  const handleToggleRecording = async () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }
    
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
      setError('O reconhecimento de voz não é suportado neste navegador. Tente usar o Chrome.');
      return;
    }
    
    try {
        // @ts-ignore
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        if (permissionStatus.state === 'denied') {
            setError('A permissão para usar o microfone foi negada. Por favor, habilite nas configurações do seu navegador.');
            return;
        }
    } catch (e) {
        console.warn('Permission API for microphone not supported, proceeding directly.');
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
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        let errorMessage = `Erro: ${event.error}. Verifique a permissão do microfone.`;
        if (event.error === 'not-allowed') {
            errorMessage = "Você precisa permitir o acesso ao microfone para usar esta funcionalidade.";
        } else if (event.error === 'no-speech') {
            errorMessage = "Não consegui ouvir nada. Fale mais alto ou verifique seu microfone.";
        }
        setError(errorMessage);
        setIsRecording(false);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          processTranscript(transcript);
        } else {
            setError('Não consegui ouvir nada. Por favor, tente novamente.');
            setIsProcessing(false);
        }
    };
    
    recognition.start();
  };

  const handleOpenChange = (isOpen: boolean) => {
      onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:rounded-2xl bg-background/80 backdrop-blur-sm border-border/50">
        <DialogHeader className="text-center">
          <DialogTitle>Adicionar por Voz</DialogTitle>
          <DialogDescription>
            {isProcessing ? "Analisando..." : (isRecording ? "Lúmina está ouvindo..." : "Diga o que você gastou ou recebeu.")}
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
                <AlertTitle>Erro ao Processar</AlertTitle>
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
