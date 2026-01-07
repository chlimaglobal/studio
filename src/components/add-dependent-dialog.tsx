
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuth } from '@/components/providers/client-providers';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { app } from '@/lib/firebase';

const AddDependentFormSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  email: z.string().email('Por favor, insira um e-mail válido.'),
});

type AddDependentDialogProps = {
  children: React.ReactNode;
};

export function AddDependentDialog({ children }: AddDependentDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof AddDependentFormSchema>>({
    resolver: zodResolver(AddDependentFormSchema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  async function onSubmit(values: z.infer<typeof AddDependentFormSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Erro de Autenticação',
            description: "Você precisa estar logado para adicionar um dependente."
        });
        return;
    }
    
    setIsLoading(true);
    try {
        const functions = getFunctions(app, 'us-central1'); 
        const sendDependentInviteCallable = httpsCallable(functions, 'sendDependentInvite');
        const result = await sendDependentInviteCallable({
            dependentName: values.name,
            dependentEmail: values.email,
        });

        const resultData = (result.data as any)?.data as { success: boolean, message: string, inviteToken?: string, error?: string };

        if (resultData.success) {
            const inviteLink = `${window.location.origin}/signup?inviteToken=${resultData.inviteToken}`;
            
            toast({
                title: 'Convite Criado!',
                description: (
                    <div>
                        <p>Compartilhe o link a seguir com seu dependente para que ele possa se cadastrar:</p>
                        <div className="flex items-center space-x-2 mt-2">
                            <Input value={inviteLink} readOnly className="text-xs" />
                            <Button size="sm" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                                Copiar
                            </Button>
                        </div>
                    </div>
                ),
                duration: 15000, 
            });

            form.reset();
            setOpen(false);
        } else {
            throw new Error(resultData.error || 'Ocorreu um erro desconhecido ao enviar o convite.');
        }

    } catch (error) {
        const errorMessage = (error instanceof Error) ? error.message : "Não foi possível enviar o convite. Tente novamente.";
         toast({
            variant: 'destructive',
            title: 'Falha no Envio',
            description: errorMessage,
        });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Dependente</DialogTitle>
          <DialogDescription>
            Insira os dados do dependente para gerar um link de convite. Ele poderá criar uma conta vinculada à sua através deste link.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Dependente</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail do Dependente</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: joao@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Gerar Link de Convite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    