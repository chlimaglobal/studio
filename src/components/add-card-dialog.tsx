
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
import React, { useMemo } from 'react';
import { AddCardFormSchema, cardBrands } from '@/lib/card-types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { addStoredCard } from '@/lib/storage';
import { useAuth, useTransactions } from '@/components/client-providers';

type AddCardDialogProps = {
  children: React.ReactNode;
};

const brandNames: Record<typeof cardBrands[number], string> = {
    mastercard: 'Mastercard',
    visa: 'Visa',
    elo: 'Elo',
    amex: 'American Express',
    hipercard: 'Hipercard',
    diners: 'Diners Club',
    other: 'Outra',
};


export function AddCardDialog({ children }: AddCardDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { transactions } = useTransactions();

  const unsavedCardNames = useMemo(() => {
    // In a real app with card editing, you would get the list of saved cards.
    // For now, we assume no cards are saved yet.
    const savedCardNames = new Set<string>(); 
    const transactionCardNames = new Set(
        transactions
            .filter(t => t.category === 'Cartão de Crédito' && t.creditCard)
            .map(t => t.creditCard as string)
    );
    return Array.from(transactionCardNames).filter(name => !savedCardNames.has(name));
  }, [transactions]);


  const form = useForm<z.infer<typeof AddCardFormSchema>>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      name: '',
      closingDay: 1,
      dueDay: 10,
    },
  });

  async function onSubmit(values: z.infer<typeof AddCardFormSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Erro de Autenticação',
            description: "Você precisa estar logado para adicionar um cartão."
        });
        return;
    }
    try {
        await addStoredCard(user.uid, values);
        toast({
            title: 'Sucesso!',
            description: "Cartão adicionado com sucesso!",
        });
        form.reset();
        setOpen(false);
    } catch (error) {
        console.error("Failed to add card:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Adicionar Cartão',
            description: "Ocorreu um erro. Tente novamente."
        });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Cartão</DialogTitle>
          <DialogDescription>
            Insira os detalhes do seu cartão de crédito.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apelido do Cartão</FormLabel>
                  <FormControl>
                    <div>
                      <Input 
                        {...field}
                        placeholder="Selecione ou digite um apelido" 
                        list="card-name-suggestions"
                      />
                      <datalist id="card-name-suggestions">
                        {unsavedCardNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bandeira</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione a bandeira" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {cardBrands.map((brand) => (
                                <SelectItem key={brand} value={brand}>
                                    {brandNames[brand]}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="closingDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do Fechamento</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia do Vencimento</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="31" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10))}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Cartão
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
