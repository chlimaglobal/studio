
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
import { CalendarIcon, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { transactionCategories, TransactionFormSchema, TransactionCategory } from '@/lib/types';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './ui/calendar';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { getCategorySuggestion } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { addStoredTransaction, getStoredTransactions } from '@/lib/storage';
import { z } from 'zod';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<z.infer<typeof TransactionFormSchema>>;
  children?: React.ReactNode;
};

export function AddTransactionDialog({ open, onOpenChange, initialData, children }: AddTransactionDialogProps) {
  const [isSuggesting, startSuggestionTransition] = React.useTransition();
  const { toast } = useToast();
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const form = useForm<z.infer<typeof TransactionFormSchema>>({
    resolver: zodResolver(TransactionFormSchema),
    defaultValues: {
      description: '',
      amount: '' as any, // Use empty string to avoid uncontrolled component error
      date: new Date(),
      type: 'expense',
      creditCard: '',
    },
  });
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
        audioRef.current = new Audio('/cash-register.mp3');
    }
  }, []);

  const watchedCategory = form.watch('category');

  React.useEffect(() => {
    if (open) {
      form.reset({
        description: initialData?.description || '',
        amount: initialData?.amount || ('' as any),
        date: initialData?.date ? new Date(initialData.date) : new Date(),
        type: initialData?.type || 'expense',
        category: initialData?.category,
        creditCard: initialData?.creditCard || '',
      });
      if (initialData?.description && !initialData.category) {
          handleAiCategorize(initialData.description);
      }
    }
  }, [initialData, form, open]);


  const handleAiCategorize = (description: string) => {
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
  
  const isUnusualSpending = (newAmount: number, category: TransactionCategory): boolean => {
    const historicalTransactions = getStoredTransactions().filter(
      t => t.category === category && t.type === 'expense'
    );
    
    if (historicalTransactions.length < 3) return false;

    const total = historicalTransactions.reduce((acc, t) => acc + t.amount, 0);
    const average = total / historicalTransactions.length;

    // Gasto é incomum se for 30% maior que a média e a média for maior que R$50 (para evitar falsos positivos em categorias de baixo valor)
    return newAmount > average * 1.3 && average > 50;
  }

  function onSubmit(values: z.infer<typeof TransactionFormSchema>) {
    try {
        addStoredTransaction(values);

        if (values.type === 'income') {
             audioRef.current?.play();
             toast({
                title: '🎉 Receita Adicionada!',
                description: "Ótimo trabalho! Continue investindo no seu futuro."
            });
        } else if (values.type === 'expense') {
            if (isUnusualSpending(values.amount, values.category)) {
                 toast({
                    variant: 'destructive',
                    title: '🚨 Gasto Incomum Detectado!',
                    description: `Seu gasto em "${values.category}" está acima da sua média.`,
                    action: <AlertTriangle className="h-5 w-5" />,
                });
            } else {
                 toast({
                    title: '💸 Despesa Adicionada',
                    description: `"${values.description}" adicionado. Lembre-se de manter o controle.`
                });
            }
        }
        
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
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
             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                        <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
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
                    <FormItem className="flex flex-col pt-2">
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
            </div>
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
                              <Button variant="outline" size="icon" type="button" onClick={() => handleAiCategorize(form.getValues('description'))} disabled={isSuggesting}>
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
            {watchedCategory === 'Cartão de Crédito' && (
                <FormField
                control={form.control}
                name="creditCard"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome do Cartão de Crédito</FormLabel>
                    <FormControl>
                        <Input placeholder="ex: Nubank, Inter, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Salvar Transação
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
