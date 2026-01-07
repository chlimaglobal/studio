
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
import { CalendarIcon, Loader2 } from 'lucide-react';
import React from 'react';
import { EditCommissionFormSchema, type Commission } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { updateStoredCommission } from '@/lib/storage';
import { useAuth } from '@/components/client-providers';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type EditCommissionDialogProps = {
  commission: Commission;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditCommissionDialog({ commission, open, onOpenChange }: EditCommissionDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof EditCommissionFormSchema>>({
    resolver: zodResolver(EditCommissionFormSchema),
    defaultValues: {
      description: commission.description,
      amount: commission.amount,
      client: commission.client || '',
      date: new Date(commission.date),
    },
  });
  
  React.useEffect(() => {
    form.reset({
      description: commission.description,
      amount: String(commission.amount).replace('.',','),
      client: commission.client || '',
      date: new Date(commission.date),
    });
  }, [commission, form]);

  async function onSubmit(values: z.infer<typeof EditCommissionFormSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro de Autenticação',
        description: 'Você precisa estar logado para editar uma comissão.',
      });
      return;
    }
    try {
      await updateStoredCommission(user.uid, commission.id, values);
      toast({
        title: 'Sucesso!',
        description: 'Comissão atualizada com sucesso!',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update commission:', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Atualizar',
        description: 'Ocorreu um erro. Tente novamente.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar Comissão</DialogTitle>
          <DialogDescription>
            Altere os detalhes da sua comissão registrada.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Venda do produto X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                            <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="0,00"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Data</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                                )}
                            >
                                {field.value ? format(new Date(field.value), 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date('2100-01-01') || date < new Date('1900-01-01')}
                            initialFocus
                            locale={ptBR}
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            </div>
            <FormField
              control={form.control}
              name="client"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Empresa Y" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
