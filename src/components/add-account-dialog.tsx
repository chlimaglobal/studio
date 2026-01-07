
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import React from 'react';
import { AddAccountFormSchema, accountTypes, accountTypeLabels } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuth } from '@/components/providers/client-providers';
import { addStoredAccount } from '@/lib/storage';

type AddAccountDialogProps = {
  children: React.ReactNode;
};

export function AddAccountDialog({ children }: AddAccountDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof AddAccountFormSchema>>({
    resolver: zodResolver(AddAccountFormSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      initialBalance: 0,
    },
  });

  async function onSubmit(values: z.infer<typeof AddAccountFormSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Erro de Autenticação',
            description: "Você precisa estar logado para adicionar uma conta."
        });
        return;
    }
    try {
        await addStoredAccount(user.uid, values);
        toast({
            title: 'Sucesso!',
            description: "Conta adicionada com sucesso!",
        });
        form.reset();
        setOpen(false);
    } catch (error) {
        console.error("Failed to add account:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Adicionar Conta',
            description: "Ocorreu um erro. Tente novamente."
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Conta</DialogTitle>
          <DialogDescription>
            Insira os detalhes da sua conta bancária.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Conta Principal, Reserva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Conta</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {accountTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                    {accountTypeLabels[type]}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="initialBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Inicial (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Conta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
