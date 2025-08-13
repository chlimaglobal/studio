
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
import { CalendarIcon, Sparkles, ArrowLeft, Loader2, Landmark } from 'lucide-react';
import { TransactionFormSchema, categoryData, TransactionCategory, allInvestmentCategories } from '@/lib/types';
import React, { Suspense, useCallback, useEffect, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { getCategorySuggestion } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { z } from 'zod';
import { useTransactions } from '@/components/client-providers';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter, useSearchParams } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const institutions = [
    "Nubank", "Inter", "XP Investimentos", "Itaú", "Bradesco", "Santander", "Caixa", "Banco do Brasil", "BTG Pactual", "Outro"
];

const formatAmountForInput = (amount: number | string) => {
    if (typeof amount === 'number') {
        return new Intl.NumberFormat('pt-BR', {
            style: 'decimal',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: false,
        }).format(amount);
    }
    // If it's already a string, assume it's correctly formatted or will be handled by Zod
    return amount;
};


function AddTransactionForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { addTransaction, updateTransaction, transactions } = useTransactions();
    const [isSuggesting, setIsSuggesting] = React.useState(false);
    const suggestionTimeoutRef = React.useRef<NodeJS.Timeout>();

    const transactionId = searchParams.get('id');
    const isEditing = !!transactionId;

    const initialCategory = (searchParams.get('category') as TransactionCategory) || undefined;
    const isInvestment = initialCategory && allInvestmentCategories.has(initialCategory);

    const getPageTitle = () => {
        if (isEditing) return 'Editar Transação';
        if (isInvestment) {
             // @ts-ignore
            if (['Proventos', 'Juros', 'Rendimentos'].includes(initialCategory)) {
                 return 'Adicionar Rendimento';
            }
            return 'Adicionar Investimento';
        }
        return 'Adicionar Transação';
    };


    const initialValues = useMemo(() => {
        if (isEditing) {
            const transactionToEdit = transactions.find(t => t.id === transactionId);
            if (transactionToEdit) {
                return {
                    ...transactionToEdit,
                    date: new Date(transactionToEdit.date),
                    dueDate: transactionToEdit.dueDate ? new Date(transactionToEdit.dueDate) : undefined,
                    amount: formatAmountForInput(transactionToEdit.amount),
                    installments: transactionToEdit.installments || '',
                };
            }
        }
        // Values from query params (e.g., from voice command) or defaults
        const amountFromParams = searchParams.get('amount');
        return {
            description: searchParams.get('description') || '',
            amount: amountFromParams ? formatAmountForInput(parseFloat(amountFromParams)) : '',
            date: searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date(),
            dueDate: undefined,
            type: (searchParams.get('type') as 'income' | 'expense') || 'expense',
            category: (searchParams.get('category') as TransactionCategory) || undefined,
            paid: searchParams.get('paid') ? searchParams.get('paid') === 'true' : true,
            paymentMethod: (searchParams.get('paymentMethod') as any) || 'one-time',
            installments: searchParams.get('installments') || '',
            observations: searchParams.get('observations') || '',
            institution: searchParams.get('institution') || '',
            hideFromReports: searchParams.get('hideFromReports') ? searchParams.get('hideFromReports') === 'true' : false,
        };
    }, [isEditing, transactionId, transactions, searchParams]);


    const form = useForm<z.infer<typeof TransactionFormSchema>>({
        resolver: zodResolver(TransactionFormSchema),
        defaultValues: initialValues,
    });
    
    useEffect(() => {
        form.reset(initialValues);
    }, [initialValues, form]);
    
    const watchedDescription = form.watch('description');
    const watchedType = form.watch('type');
    const watchedCategory = form.watch('category');
    const watchedPaymentMethod = form.watch('paymentMethod');
    const formIsInvestment = watchedCategory && allInvestmentCategories.has(watchedCategory);
    const watchedPaid = form.watch('paid');

    const handleAiCategorize = useCallback(async (description: string) => {
        if (!description || form.formState.dirtyFields.category) return;
        setIsSuggesting(true);
        try {
            const { category } = await getCategorySuggestion(description);
            if (category) {
                form.setValue('category', category, { shouldValidate: true });
                toast({
                    title: 'Sugestão da Lúmina',
                    description: `Categorizamos isso como "${category}".`,
                });
            }
        } catch (e) {
            // Fail silently on exception, error is logged in the action
        } finally {
            setIsSuggesting(false);
        }
    }, [form, toast]);


    useEffect(() => {
        if (suggestionTimeoutRef.current) {
            clearTimeout(suggestionTimeoutRef.current);
        }
        if (watchedDescription && !isEditing) { // Only auto-suggest for new transactions
            suggestionTimeoutRef.current = setTimeout(() => {
                handleAiCategorize(watchedDescription);
            }, 1000); // 1s debounce
        }
        return () => {
            if (suggestionTimeoutRef.current) {
                clearTimeout(suggestionTimeoutRef.current);
            }
        };
    }, [watchedDescription, handleAiCategorize, isEditing]);

    useEffect(() => {
        if (watchedType === 'income') {
            form.setValue('paymentMethod', 'one-time');
            form.setValue('paid', true);
        }
    }, [watchedType, form]);


    async function onSubmit(values: z.infer<typeof TransactionFormSchema>) {
        try {
            const submissionData = { ...values };

            if (isEditing && transactionId) {
                await updateTransaction(transactionId, submissionData);
                 toast({
                    title: 'Sucesso!',
                    description: 'Transação atualizada.'
                });
            } else {
                await addTransaction(submissionData);
                toast({
                    title: 'Sucesso!',
                    description: 'Transação salva.'
                });
            }
            router.back();
        } catch (error) {
            // Error toast is handled in the context, so we just log here
            console.error("Failed to submit transaction:", error);
        }
    }

    return (
        <div className="flex flex-col h-full">
            <header className="p-4 flex items-center gap-4 sticky top-0 bg-background z-10 border-b">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
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
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
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
                                    <Input placeholder="ex: Ações da Apple, Fundo Imobiliário" {...field} />
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
                                                placeholder="10.000,00"
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
                                                {Object.entries(categoryData).map(([group, subcategories]) => (
                                                    <SelectGroup key={group}>
                                                        <SelectLabel>{group}</SelectLabel>
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
                                                <Button variant="outline" size="icon" type="button" onClick={() => handleAiCategorize(form.getValues('description'))} disabled={isSuggesting || !watchedDescription}>
                                                {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Categorizar com Lúmina</p>
                                            </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                             {formIsInvestment && (
                                <FormField
                                    control={form.control}
                                    name="institution"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel className="flex items-center gap-2"><Landmark className="h-4 w-4" /> Instituição Financeira (Opcional)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione a corretora ou banco" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {institutions.map(inst => (
                                                    <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

                            {watchedType === 'expense' && (
                                <div className="space-y-4">
                                     <FormField
                                        control={form.control}
                                        name="paymentMethod"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tipo de Pagamento</FormLabel>
                                                <FormControl>
                                                    <RadioGroup
                                                        onValueChange={field.onChange}
                                                        defaultValue={field.value}
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
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                     />

                                    {watchedPaymentMethod === 'installments' && (
                                        <FormField
                                            control={form.control}
                                            name="installments"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Número de Parcelas</FormLabel>
                                                <FormControl>
                                                    <Input 
                                                        type="text" 
                                                        inputMode="numeric"
                                                        placeholder="Ex: 12x" 
                                                        {...field}
                                                    />
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
                                {watchedType === 'expense' && (
                                    <FormField
                                        control={form.control}
                                        name="paid"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                                <FormLabel>
                                                    Pago
                                                </FormLabel>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                )}
                                
                                {watchedType === 'expense' && !watchedPaid && (
                                    <FormField
                                        control={form.control}
                                        name="dueDate"
                                        render={({ field }) => (
                                        <FormItem className="flex flex-col animate-in fade-in-0 duration-300">
                                            <FormLabel>Data de Vencimento</FormLabel>
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
                                                    {field.value ? format(new Date(field.value), 'PPP', { locale: ptBR }) : <span>Escolha a data de vencimento</span>}
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
                                )}

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
                            {isEditing ? 'Atualizar Transação' : 'Salvar Transação'}
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
