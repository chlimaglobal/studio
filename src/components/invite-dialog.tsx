'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import type { Account } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/client-providers';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';



interface InviteDialogProps {
  account: Account | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteDialog({ account, open, onOpenChange }: InviteDialogProps) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  if (!account) return null;

  const handleGenerateCode = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para gerar um convite.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const functions = getFunctions(app); // Correctly get functions instance
      const generateCode = httpsCallable(functions, 'generateInviteCode');
      const result = await generateCode({ accountId: account.id });
      // @ts-ignore
      const resultData = result.data as { success: boolean; code?: string; error?: string };

      if (resultData.success && resultData.code) {
        setInviteCode(resultData.code);
      } else {
        throw new Error(resultData.error || "Ocorreu um erro desconhecido.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Não foi possível gerar o código.";
      toast({
        variant: 'destructive',
        title: 'Erro ao Gerar Convite',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setIsCopied(true);
    toast({ title: 'Código copiado para a área de transferência!' });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
        setInviteCode(null);
        setIsLoading(false);
        setIsCopied(false);
    }, 300); // Delay to allow dialog to animate out
  }


  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar Conta: {account.name}</DialogTitle>
          <DialogDescription>
            Gere um código para que outra pessoa possa acessar e gerenciar esta conta com você. O código é válido por 24 horas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
            {!inviteCode ? (
                <Button onClick={handleGenerateCode} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Gerar código de convite'}
                </Button>
            ) : (
                 <div className="space-y-2">
                    <Label htmlFor="invite-code">Código de Convite</Label>
                    <div className="flex items-center space-x-2">
                        <Input 
                            id="invite-code" 
                            value={inviteCode} 
                            readOnly 
                            className="text-center font-mono text-lg tracking-widest"
                        />
                        <Button type="button" size="icon" onClick={handleCopyCode}>
                            {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                 </div>
            )}
        </div>
         <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
