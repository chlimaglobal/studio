
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
import { Copy, Check, Loader2, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { generateInviteCode } from '@/app/dashboard/banks/actions';

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

  if (!account) return null;

  const handleGenerateCode = async () => {
    setIsLoading(true);
    try {
      const result = await generateInviteCode(account.id);
      setInviteCode(result.code);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Gerar Convite',
        description: 'Não foi possível gerar o código. Tente novamente.',
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
            Convide seu parceiro(a) ou advisor para gerenciar esta conta com você.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
            <div className="space-y-2">
                <h3 className="font-semibold">Passo 1: Gerar e compartilhar o código</h3>
                <p className="text-sm text-muted-foreground">
                    Clique no botão para gerar um código de convite único. O código expira em 24 horas.
                </p>
                {!inviteCode ? (
                    <Button onClick={handleGenerateCode} disabled={isLoading} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Gerar código de convite'}
                    </Button>
                ) : (
                    <div className="flex items-center space-x-2 pt-2">
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
                )}
            </div>

             <div className="space-y-2 opacity-50 cursor-not-allowed">
                <h3 className="font-semibold">Passo 2: Para quem você convidou</h3>
                 <p className="text-sm text-muted-foreground">
                    A pessoa convidada deve colar o código no campo "Aceitar Convite" em sua própria conta.
                </p>
                 <div className="flex items-center space-x-2 pt-2">
                    <Input placeholder="Colar código aqui..." disabled />
                    <Button type="button" disabled>
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground">Esta funcionalidade será habilitada em breve.</p>
            </div>

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
