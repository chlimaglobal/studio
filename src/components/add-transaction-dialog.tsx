
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { CalendarIcon, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { TransactionFormSchema, TransactionCategory, categoryData } from '@/lib/types';
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from './ui/calendar';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { getCategorySuggestion } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { z } from 'zod';
import { useTransactions } from '@/app/dashboard/layout';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';

type AddTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: Partial<z.infer<typeof TransactionFormSchema>>;
  children?: React.ReactNode;
};

export function AddTransactionDialog({ open, onOpenChange, initialData, children }: AddTransactionDialogProps) {
  const [isSuggesting, startSuggestionTransition] = React.useTransition();
  const { toast } = useToast();
  const { addTransaction } = useTransactions();

  const form = useForm<z.infer<typeof TransactionFormSchema>>({
    resolver: zodResolver(TransactionFormSchema),
    defaultValues: {
      description: '',
      amount: '' as any, 
      date: new Date(),
      type: 'expense',
      creditCard: '',
      paid: true,
      paymentMethod: 'one-time',
    },
  });
  
  const watchedType = form.watch('type');
  const watchedPaymentMethod = form.watch('paymentMethod');
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
        paid: initialData?.paid ?? true,
        paymentMethod: 'one-time',
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

  async function onSubmit(values: z.infer<typeof TransactionFormSchema>) {
    try {
        await addTransaction(values);
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
      <DialogContent className="sm:max-w-[480px] flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Transação</DialogTitle>
          <DialogDescription>
            Insira os detalhes da sua transação abaixo. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 -mr-6 pr-6">
              <div className="space-y-4 pr-1">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormControl>
                          <RadioGroup
                            onValueChange={(value) => {
                              field.onChange(value);
                              if (value === 'income') {
                                form.setValue('paymentMethod', 'one-time');
                              }
                            }}
                            value={field.value}
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
                  </div>
                  <FormField
                      control={form.control}
                      name="paid"
                      render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                  <FormLabel>Pago</FormLabel>
                                  <FormDescription className="text-xs">
                                      Desative para lançamentos futuros ou previstos.
                                  </FormDescription>
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

                  {watchedType === 'expense' && (
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Pagamento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                            <SelectContent>
                              <SelectItem value="one-time">À Vista</SelectItem>
                              <SelectItem value="installments">Parcelado</SelectItem>
                              <SelectItem value="recurring">Recorrente</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  {watchedPaymentMethod === 'installments' && watchedType === 'expense' && (
                    <FormField
                      control={form.control}
                      name="installments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Parcelas</FormLabel>
                          <FormControl>
                            <Input type="number" min="2" placeholder="Ex: 12" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {watchedPaymentMethod === 'recurring' && watchedType === 'expense' && (
                    <FormField
                      control={form.control}
                      name="recurrence"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Frequência da Recorrência</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a frequência" />
                                </SelectTrigger>
                              </FormControl>
                            <SelectContent>
                              <SelectItem value="weekly">Semanalmente</SelectItem>
                              <SelectItem value="monthly">Mensalmente</SelectItem>
                              <SelectItem value="quarterly">Trimestralmente</SelectItem>
                              <SelectItem value="annually">Anualmente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

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
                                    <ScrollArea className="h-72">
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
                                    </ScrollArea>
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
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Transação
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
