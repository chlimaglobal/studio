
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
import { useAuth } from '@/components/client-providers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

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

    form.formState.isSubmitting = true;
    
    try {
        const sendDependentInvite = httpsCallable(functions, 'sendDependentInvite');
        const result = await sendDependentInvite({
            dependentName: values.name,
            dependentEmail: values.email,
        });

        // @ts-ignore
        const resultData = result.data as { success: boolean, message: string, error?: string };

        if (resultData.success) {
             toast({
                title: 'Convite Enviado!',
                description: resultData.message,
            });
            form.reset();
            setOpen(false);
        } else {
            throw new Error(resultData.error || 'Ocorreu um erro desconhecido ao enviar o convite.');
        }

    } catch (error) {
        console.error("Failed to send dependent invite:", error);
        const errorMessage = (error instanceof Error) ? error.message : "Não foi possível enviar o convite. Tente novamente.";
         toast({
            variant: 'destructive',
            title: 'Falha no Envio',
            description: errorMessage,
        });
    } finally {
        form.formState.isSubmitting = false;
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Dependente</DialogTitle>
          <DialogDescription>
            Insira os dados do dependente para enviar um convite. Ele poderá criar uma conta vinculada à sua.
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Convite
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
