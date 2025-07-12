
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
import { AddTransactionDialog } from './add-transaction-dialog';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';
import { extractTransactionInfoFromText } from '@/app/actions';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';

export function AudioTransactionDialog({ asChild, children }: { asChild?: boolean, children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [initialTransactionData, setInitialTransactionData] = useState<Partial<z.infer<typeof TransactionFormSchema>> | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('Pressione o botão e comece a falar.');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      setError('O reconhecimento de voz não é suportado neste navegador. Tente usar o Chrome.');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatusText('Ouvindo...');
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (!isProcessing) {
        setStatusText('Pressione o botão e comece a falar.');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setStatusText('Ocorreu um erro. Tente novamente.');
      setError(`Erro: ${event.error}`);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setStatusText('Processando seu comando...');
      setIsProcessing(true);
      
      extractTransactionInfoFromText(transcript)
        .then(result => {
          if ('error' in result) {
            toast({ variant: 'destructive', title: 'Erro ao Processar', description: result.error });
            setError(result.error);
          } else {
            setInitialTransactionData(result);
            setAddTransactionOpen(true);
            setOpen(false); // Close audio dialog
          }
        })
        .finally(() => {
          setIsProcessing(false);
          setStatusText('Pressione o botão e comece a falar.');
        });
    };

    recognitionRef.current = recognition;

  }, [isProcessing, toast]);

  const handleToggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      recognitionRef.current?.start();
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen && isRecording) {
          recognitionRef.current?.stop();
      }
  }
  
  const DefaultTriggerButton = (
    <Button variant="outline" size="sm">
      <Mic className="mr-2 h-4 w-4" />
      Usar Voz
    </Button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {asChild ? children : DefaultTriggerButton}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Transação por Voz</DialogTitle>
            <DialogDescription>
              {statusText}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <Button
              size="lg"
              className={`h-20 w-20 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary'}`}
              onClick={handleToggleRecording}
              disabled={isProcessing || !!error}
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
      <AddTransactionDialog
        open={addTransactionOpen}
        onOpenChange={setAddTransactionOpen}
        initialData={initialTransactionData || undefined}
      />
    </>
  );
}
