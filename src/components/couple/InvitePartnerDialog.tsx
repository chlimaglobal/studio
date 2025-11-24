
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActionState, useEffect } from 'react';
import { sendPartnerInvite } from '@/app/dashboard/couple/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

interface InvitePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Enviar Convite
    </Button>
  );
}

export function InvitePartnerDialog({ open, onOpenChange }: InvitePartnerDialogProps) {
  const [state, formAction] = useActionState(sendPartnerInvite, null);
  const { toast } = useToast();

  useEffect(() => {
    if (state?.error) {
      toast({ variant: 'destructive', title: 'Erro', description: state.error });
    }
    if (state?.success) {
      toast({ title: 'Sucesso!', description: state.success });
      onOpenChange(false);
    }
  }, [state, toast, onOpenChange]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convidar Parceiro(a)</DialogTitle>
          <DialogDescription>
            Insira o e-mail do seu parceiro(a) para vincular suas contas. Ele(a) receberá um convite para se juntar a você.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                E-mail
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="parceiro@email.com"
                className="col-span-3"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
