
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
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';
import { extractTransactionInfoFromText } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

type AudioTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionExtracted: (data: Partial<z.infer<typeof TransactionFormSchema>>) => void;
  children?: React.ReactNode;
}

export function AudioTransactionDialog({ open, onOpenChange, onTransactionExtracted, children }: AudioTransactionDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('Pressione o botão e comece a falar.');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  const processTranscript = useCallback(async (transcript: string) => {
    setStatusText('Processando seu comando...');
    setIsProcessing(true);
    setError(null);

    try {
      const result = await extractTransactionInfoFromText(transcript);
      if ('error' in result) {
        toast({ variant: 'destructive', title: 'Não foi possível entender', description: `${result.error} Por favor, tente novamente.` });
        setError(result.error);
        setStatusText('Tente novamente. Fale de forma clara, por exemplo: "gastei 50 reais no supermercado".');
      } else {
        onTransactionExtracted(result);
        onOpenChange(false); // Fecha o diálogo de áudio
      }
    } catch (e) {
      const errorMessage = 'Ocorreu um erro ao falar com a IA. Tente novamente.';
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
      setStatusText('Pressione o botão e comece a falar.');
    }
  }, [open]);

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    
    if (!('webkitSpeechRecognition' in window)) {
      setError('O reconhecimento de voz não é suportado neste navegador. Tente usar o Chrome.');
      return;
    }
    
    setError(null);

    try {
      const SpeechRecognition = window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'pt-BR';
      recognition.interimResults = false;
      
      recognition.onstart = () => {
          setIsRecording(true);
          setStatusText('Ouvindo...');
          setError(null);
      };

      recognition.onend = () => {
          setIsRecording(false);
          // Não redefina o texto aqui para manter mensagens de erro
      };

      recognition.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setStatusText('Ocorreu um erro. Tente novamente.');
            setError(`Erro: ${event.error}. Verifique a permissão do microfone.`);
          }
          setIsRecording(false);
      };

      recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            processTranscript(transcript);
          }
      };
      
      recognition.start();
      recognitionRef.current = recognition;

    } catch(e) {
      console.error("Error starting recognition", e);
      setError('Não foi possível iniciar o reconhecimento de voz.');
      setIsRecording(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
      onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Transação por Voz</DialogTitle>
          <DialogDescription>
            {isProcessing ? "Processando..." : (isRecording ? "Ouvindo..." : "Pressione o microfone e fale. Ex: 'Gastei 50 reais no almoço'.")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <Button
            size="lg"
            className={`h-20 w-20 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}
            onClick={handleToggleRecording}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : isRecording ? (
              <Square className="h-8 w-8 fill-white" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
         <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
