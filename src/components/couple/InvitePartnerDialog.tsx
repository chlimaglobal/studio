
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
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

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


  const actionWithAuth = async (formData: FormData) => {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não autenticado.' });
      return;
    }
    const token = await user.getIdToken();
    const headers = new Headers();
    headers.append('Authorization', `Bearer ${token}`);
    
    // We can't directly pass headers to a server action.
    // The server action has been updated to read the token from the standard 'Authorization' header
    // But we need a way to set that header for the server action call.
    // A common way is to use fetch, but that complicates useActionState.
    // For now, let's update the server action to expect the token as part of the form data.
    
    // This is a workaround since headers can't be set for form actions.
    // Let's modify the server action to read it from headers, assuming the client framework (Next.js) forwards it.
    
    // The server action now reads from headers().get('Authorization'), which should work in Next.js >= 14.
    // No special client-side code is needed if the auth middleware is set up correctly.
    // But since there is no middleware, we'll use a standard fetch call.
    
    try {
        const response = await fetch('/api/invite-partner', { // Let's assume we create an API route to handle this
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: formData.get('email') })
        });
        
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Falha na API');
        }
         toast({ title: 'Sucesso!', description: result.success });
         onOpenChange(false);

    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Erro', description: e.message || 'Ocorreu um erro.' });
    }
  };
  
  // Reverting to a simpler form action, assuming the server can get the user.
  const authenticatedFormAction = async (payload: FormData) => {
    const auth = getAuth(app);
    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({
            title: "Erro de autenticação",
            description: "Por favor, faça login novamente.",
            variant: "destructive",
        });
        return;
    }
    const token = await currentUser.getIdToken();
    
    // Re-creating FormData to add the token
    const formDataWithAuth = new FormData();
    formDataWithAuth.append('email', payload.get('email') || '');
    formDataWithAuth.append('authToken', token);

    // This is a hack. The proper way is to use fetch. But let's adapt the server action.
    // I'll modify the server action to read token from header instead.
    
    const requestHeaders = new Headers();
    requestHeaders.set('Authorization', 'Bearer ' + token);
    
     const response = await fetch('/api/invite-partner-proxy', {
        method: 'POST',
        headers: requestHeaders,
        body: payload
    });

    const result = await response.json();
    if (result.error) {
        toast({ variant: 'destructive', title: 'Erro', description: result.error });
    }
    if (result.success) {
        toast({ title: 'Sucesso!', description: result.success });
        onOpenChange(false);
    }
};


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
