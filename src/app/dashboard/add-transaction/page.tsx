
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
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
import { CalendarIcon, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { TransactionFormSchema, categoryData } from '@/lib/types';
import React, { Suspense } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { getCategorySuggestion } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { z } from 'zod';
import { useTransactions } from '@/app/dashboard/layout';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, useSearchParams } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


function AddTransactionForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { addTransaction } = useTransactions();
    const [isSuggesting, startSuggestionTransition] = React.useTransition();

    const form = useForm<z.infer<typeof TransactionFormSchema>>({
        resolver: zodResolver(TransactionFormSchema),
        defaultValues: {
            description: searchParams.get('description') || '',
            amount: searchParams.get('amount') ? parseFloat(searchParams.get('amount')!) : '',
            date: searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date(),
            type: (searchParams.get('type') as 'income' | 'expense') || 'expense',
            category: (searchParams.get('category') as any) || undefined,
            paid: true,
            paymentMethod: 'one-time',
            installments: '',
            observations: '',
            hideFromReports: false,
        },
    });

    const watchedType = form.watch('type');
    const watchedPaymentMethod = form.watch('paymentMethod');
    const watchedCategory = form.watch('category');

    React.useEffect(() => {
        const description = searchParams.get('description');
        const category = searchParams.get('category');
        if (description && !category) {
            handleAiCategorize(description);
        }
    }, [searchParams]);


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
            // Error is already logged in the action, no need to show a toast here.
            // It should fail silently for the user.
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
            router.back();
        } catch (error) {
            console.error("Failed to add transaction:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Adicionar Transação',
                description: "Ocorreu um erro. Tente novamente."
            });
        }
    }
    
    const handlePaymentMethodChange = (value: string) => {
        form.setValue('paymentMethod', value as any, { shouldValidate: true });
    };

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 flex items-center gap-4 sticky top-0 bg-background z-10 border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold">Adicionar Transação</h1>
            </header>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-6">
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
                                        className="grid grid-cols-2 gap-4"
                                    >
                                        <FormItem className="flex items-center">
                                            <FormControl>
                                                <RadioGroupItem value="expense" id="expense" className="sr-only peer" />
                                            </FormControl>
                                            <FormLabel htmlFor="expense" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary w-full cursor-pointer">
                                                Despesa
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center">
                                            <FormControl>
                                                <RadioGroupItem value="income" id="income" className="sr-only peer" />
                                            </FormControl>
                                            <FormLabel htmlFor="income" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary w-full cursor-pointer">
                                                Receita
                                            </FormLabel>
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

                            {watchedType === 'expense' && (
                                <div className="space-y-4">
                                     <FormItem>
                                        <FormLabel>Tipo de Pagamento</FormLabel>
                                        <RadioGroup
                                            onValueChange={handlePaymentMethodChange}
                                            value={watchedPaymentMethod}
                                            className="flex space-x-4"
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="one-time" />
                                            </FormControl>
                                            <FormLabel className="font-normal">À Vista</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="installments" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Parcelado</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value="recurring" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Recorrente</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                     </FormItem>

                                    {watchedPaymentMethod === 'installments' && (
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

                                    {watchedPaymentMethod === 'recurring' && (
                                        <FormField
                                            control={form.control}
                                            name="recurrence"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Frequência</FormLabel>
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
                                </div>
                            )}

                             <FormField
                                control={form.control}
                                name="observations"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observações</FormLabel>
                                    <FormControl>
                                     <Textarea
                                        placeholder="Adicione qualquer detalhe extra aqui..."
                                        className="resize-none"
                                        {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="paid"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <FormLabel>Pago</FormLabel>
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="hideFromReports"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                            <FormLabel>Ocultar transação dos relatórios</FormLabel>
                                            <FormControl>
                                                <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>

                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t">
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Transação
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    )
}

export default function AddTransactionPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <AddTransactionForm />
        </Suspense>
    )
}
