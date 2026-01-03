

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { CalendarIcon, Sparkles, AlertTriangle, Repeat } from 'lucide-react';
import { TransactionFormSchema } from '@/types';
import { categoryData, transactionCategories } from '@/types';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Switch } from './ui/switch';
import { useTransactions } from '@/components/client-providers';

type AddTransactionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<z.infer<typeof TransactionFormSchema>>;
  children?: React.ReactNode;
};

const AddTransactionSheetRoot = ({ open, onOpenChange, initialData, children }: AddTransactionSheetProps) => {
  const { addTransaction } = useTransactions();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof TransactionFormSchema>>({
    resolver: zodResolver(TransactionFormSchema),
    defaultValues: {
      description: '',
      amount: '' as any, 
      date: new Date(),
      type: 'income', // Default to income as per "Adicionar Recebimentos"
      paid: true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        description: initialData?.description || 'Salário',
        amount: initialData?.amount || ('' as any),
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        type: initialData?.type || 'income',
        category: initialData?.category,
        paid: initialData?.paid ?? true,
      });
    }
  }, [initialData, form, open]);

  function onSubmit(values: z.infer<typeof TransactionFormSchema>) {
    try {
        addTransaction([values]);
        onOpenChange(false);
        form.reset();
    } catch (error) {
        console.error("Failed to add transaction:", error);
        toast({
            variant: 'destructive',
            title: 'Erro ao Adicionar Transação',
            description: "Ocorreu um erro. Tente novamente."
        });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {children}
      <SheetContent side="bottom" className="rounded-t-lg">
        <SheetHeader>
          <SheetTitle>Adicionar Recebimentos</SheetTitle>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição*</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Salário" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Data de vencimento*</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(new Date(field.value), 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date("2100-01-01") || date < new Date('1900-01-01')}
                            initialFocus
                            locale={ptBR}
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Valor*</FormLabel>
                        <FormControl>
                            <Input 
                                type="text" 
                                inputMode="decimal"
                                placeholder="R$" 
                                {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {Object.entries(categoryData).map(([category, subcategories]) => (
                                    <SelectGroup key={category}>
                                        <SelectLabel>{category}</SelectLabel>
                                        {subcategories.map((subcategory) => (
                                            <SelectItem key={subcategory} value={subcategory}>
                                                {subcategory}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paid"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                            <FormLabel>Pago</FormLabel>
                        </div>
                        <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
               />
             <SheetFooter className="pt-4 flex flex-row gap-2">
                <Button type="button" variant="outline" className="flex-1">
                    <Repeat className="mr-2 h-4 w-4"/>
                    Repetir
                </Button>
                <Button type="submit" className="w-full flex-1 bg-primary/90 hover:bg-primary">
                    Salvar
                </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

// Create a compound component
export const AddTransactionSheet = Object.assign(AddTransactionSheetRoot, {
  Trigger: SheetTrigger,
  Close: SheetClose,
});
