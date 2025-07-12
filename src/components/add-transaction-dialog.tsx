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
import { CalendarIcon, Loader2, Plus, Sparkles } from 'lucide-react';
import { transactionCategories, TransactionFormSchema, TransactionCategory } from '@/lib/types';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './ui/calendar';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { getCategorySuggestion, addTransaction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

export function AddTransactionDialog() {
  const [open, setOpen] = React.useState(false);
  const [isSuggesting, startSuggestionTransition] = React.useTransition();
  const [isSubmitting, startSubmittingTransition] = React.useTransition();

  const { toast } = useToast();

  const form = useForm<React.ComponentProps<typeof Form>['data-type']>({
    resolver: zodResolver(TransactionFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: new Date(),
      type: 'expense',
    },
  });

  const handleAiCategorize = () => {
    const description = form.getValues('description');
    if (!description) {
      form.setError('description', {
        type: 'manual',
        message: 'Por favor, insira uma descrição primeiro.',
      });
      return;
    }
    
    startSuggestionTransition(async () => {
      const { category, error } = await getCategorySuggestion(description);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Falha na Categorização com IA',
          description: error,
        });
      } else if (category) {
        form.setValue('category', category, { shouldValidate: true });
        toast({
          title: 'Sugestão da IA',
          description: `Categorizamos isso como "${category}".`,
        });
      }
    });
  };

  function onSubmit(values: React.ComponentProps<typeof Form>['data-type']) {
    startSubmittingTransition(async () => {
        const result = await addTransaction(values);
        if (result.success) {
            toast({
                title: 'Transação Adicionada',
                description: `"${values.description}" adicionado com sucesso.`
            });
            setOpen(false);
            form.reset();
        } else {
            toast({
                variant: 'destructive',
                title: 'Erro ao Adicionar Transação',
                description: result.message
            });
        }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Adicionar Transação
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Transação</DialogTitle>
          <DialogDescription>
            Insira os detalhes da sua transação abaixo. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">Despesa</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">Receita</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Café com amigos" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0,00" {...field} />
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
                    <FormLabel>Data da Transação</FormLabel>
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
                            {field.value ? format(field.value, 'PPP', { locale: ptBR }) : <span>Escolha uma data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {transactionCategories.map((category) => (
                                <SelectItem key={category} value={category}>
                                    {category}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" type="button" onClick={handleAiCategorize} disabled={isSuggesting}>
                                {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Categorizar com IA</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Transação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
