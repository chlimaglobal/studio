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
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { cn } from '@/lib/utils';


type AudioInputDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTranscript: (transcript: string) => void;
  children?: React.ReactNode;
}

const SoundWave = () => (
    <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute h-48 w-48 rounded-full bg-primary/20 animate-ping duration-1000"></div>
        <div className="absolute h-32 w-32 rounded-full bg-primary/30 animate-ping delay-200 duration-1000"></div>
    </div>
);

export function AudioInputDialog({ open, onOpenChange, onTranscript, children }: AudioInputDialogProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // To handle the period after recording stops
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unsupported'>('prompt');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check permission status when the dialog opens
    const checkPermission = async () => {
        if (typeof window !== 'undefined' && 'permissions' in navigator) {
            try {
                // @ts-ignore
                const micPermission = await navigator.permissions.query({ name: 'microphone' });
                setPermissionState(micPermission.state);
                micPermission.onchange = () => setPermissionState(micPermission.state);
            } catch (e) {
                console.warn('Permissions API not fully supported, will ask directly.');
                setPermissionState('prompt');
            }
        } else {
            setPermissionState('unsupported');
        }
    };
    
    if (open) {
      checkPermission();
    } else {
      // Cleanup when the dialog closes
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
      setIsProcessing(true); // Show loader while waiting for final result
      return;
    }
    
    if (typeof window === 'undefined' || !('webkitSpeechRecognition' in window)) {
      setError('O reconhecimento de voz não é suportado neste navegador. Tente usar o Chrome.');
      return;
    }
    
    if (permissionState === 'denied') {
        setError('A permissão para usar o microfone foi negada. Por favor, habilite nas configurações do seu navegador.');
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
        let errorMessage = `Erro: ${event.error}. Verifique a permissão do microfone.`;
        if (event.error === 'not-allowed') {
            errorMessage = "Você precisa permitir o acesso ao microfone para usar esta funcionalidade.";
        } else if (event.error === 'no-speech') {
            errorMessage = "Não consegui ouvir nada. Fale mais alto ou verifique seu microfone.";
        } else if (event.error === 'network') {
            errorMessage = "Ocorreu um erro de rede. Verifique sua conexão com a internet e tente novamente.";
        }
        setError(errorMessage);
        setIsRecording(false);
        setIsProcessing(false);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          onTranscript(transcript);
          onOpenChange(false);
        } else {
            setError('Não consegui ouvir nada. Por favor, tente novamente.');
        }
        setIsProcessing(false);
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
          <DialogTitle>Comando de Voz</DialogTitle>
          <DialogDescription>
            {isProcessing ? "Processando..." : (isRecording ? "Estou ouvindo..." : "Pressione o microfone e fale com a Lúmina.")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center gap-4 py-12">
            <button
                className={cn(
                    "relative h-32 w-32 rounded-full transition-all duration-300 flex items-center justify-center",
                    isRecording ? 'bg-destructive/20' : 'bg-primary/20'
                )}
                onClick={handleToggleRecording}
                disabled={isProcessing || permissionState === 'denied'}
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
            {(error || permissionState === 'denied') && (
                <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro de Acesso</AlertTitle>
                <AlertDescription>{error || 'A permissão para usar o microfone foi negada. Por favor, habilite nas configurações do seu navegador.'}</AlertDescription>
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
