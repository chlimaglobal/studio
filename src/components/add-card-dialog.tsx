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
import { addCard, AddCardFormSchema, cardBrands } from '@/app/dashboard/cards/actions';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

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
  const [isSubmitting, startSubmittingTransition] = React.useTransition();
  
  const { toast } = useToast();

  const form = useForm<z.infer<typeof AddCardFormSchema>>({
    resolver: zodResolver(AddCardFormSchema),
    defaultValues: {
      name: '',
      closingDay: 1,
      dueDay: 10,
    },
  });

  function onSubmit(values: z.infer<typeof AddCardFormSchema>) {
    startSubmittingTransition(async () => {
        const result = await addCard(values);
        if (result.success) {
            toast({
                title: 'Sucesso!',
                description: result.message
            });
            setOpen(false);
            form.reset();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao Adicionar Cartão',
                description: result.message
            });
        }
    });
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
                    <Input placeholder="ex: Cartão Principal, Nu, Inter" {...field} />
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
                      <Input type="number" min="1" max="31" {...field} />
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
                      <Input type="number" min="1" max="31" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Cartão
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
