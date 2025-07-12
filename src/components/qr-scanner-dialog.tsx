
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import jsQR from 'jsqr';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { TransactionFormSchema } from '@/lib/types';
import { z } from 'zod';

type QrScannerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTransactionExtracted: (data: Partial<z.infer<typeof TransactionFormSchema>>) => void;
  children?: React.ReactNode;
};

export function QrScannerDialog({ open, onOpenChange, onTransactionExtracted, children }: QrScannerDialogProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const { toast } = useToast();

  const scan = useCallback(() => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });

            if (code) {
                stopCamera();
                try {
                  const data = JSON.parse(code.data);
                  // Basic validation
                  if (data.amount && data.description) {
                    onTransactionExtracted({ ...data, type: 'expense' });
                    onOpenChange(false); // Close scanner dialog
                  } else {
                    throw new Error("Dados do QR code inválidos.");
                  }
                } catch (e) {
                   toast({
                    variant: 'destructive',
                    title: 'QR Code Inválido',
                    description: 'Não foi possível ler os dados da nota fiscal no QR Code.',
                  });
                   setTimeout(() => startCamera(), 2000); // Try again
                }
            } else {
                 animationFrameId.current = requestAnimationFrame(scan);
            }
        } catch (error) {
            console.error('jsQR error:', error)
            animationFrameId.current = requestAnimationFrame(scan);
        }
      } else {
         animationFrameId.current = requestAnimationFrame(scan);
      }
    } else {
        animationFrameId.current = requestAnimationFrame(scan);
    }
  }, [toast, onOpenChange, onTransactionExtracted]);

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setHasCameraPermission(true);
      animationFrameId.current = requestAnimationFrame(scan);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Acesso à Câmera Negado',
        description: 'Por favor, habilite a permissão da câmera nas configurações do seu navegador.',
      });
    }
  }, [scan, toast]);

  
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Escanear QR Code da Nota Fiscal</DialogTitle>
          <DialogDescription>
            Aponte a câmera para o QR code da sua nota fiscal.
          </DialogDescription>
        </DialogHeader>
        <div className="relative mt-4 flex items-center justify-center">
          {hasCameraPermission === null && <Loader2 className="h-10 w-10 animate-spin" />}
          
          <video ref={videoRef} className="w-full aspect-square rounded-md bg-muted" autoPlay playsInline muted />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {hasCameraPermission === false && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
              <Alert variant="destructive" className="w-auto">
                  <AlertTitle>Câmera Necessária</AlertTitle>
                  <AlertDescription>Habilite a permissão da câmera.</AlertDescription>
              </Alert>
            </div>
          )}
          
          {hasCameraPermission === true && (
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3/4 h-3/4 border-4 border-dashed border-primary/50 rounded-lg"/>
              </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
