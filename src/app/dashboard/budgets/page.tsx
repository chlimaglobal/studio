
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Banknote, CreditCard, Loader2, Save, ShoppingCart, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Budget, BudgetSchema } from '@/lib/types';
import { useAuth } from '@/app/layout';
import { onBudgetsUpdate, saveBudgets } from '@/lib/storage';
import { format } from 'date-fns';

const budgetCategories = [
    { id: 'Supermercado', label: 'Supermercado', icon: ShoppingCart },
    { id: 'Casa', label: 'Casa (Contas e Manutenção)', icon: Banknote },
    { id: 'Cartão de Crédito', label: 'Cartão de Crédito', icon: CreditCard },
] as const;

export default function BudgetsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    const monthId = format(new Date(), 'yyyy-MM');

    const form = useForm<z.infer<typeof BudgetSchema>>({
        resolver: zodResolver(BudgetSchema),
        defaultValues: {
            Supermercado: 0,
            Casa: 0,
            'Cartão de Crédito': 0
        },
    });

    useEffect(() => {
        if (user) {
            setIsLoading(true);
            const unsubscribe = onBudgetsUpdate(user.uid, monthId, (budgets) => {
                if (budgets) {
                    form.reset(budgets);
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, monthId, form]);

    async function onSubmit(values: z.infer<typeof BudgetSchema>) {
        if (!user) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
            return;
        }

        try {
            await saveBudgets(user.uid, monthId, values);
            toast({
                title: 'Sucesso!',
                description: 'Seus orçamentos foram salvos.',
            });
            router.back();
        } catch (error) {
            console.error('Failed to save budgets', error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar os orçamentos.' });
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-6 w-6" />
                            Orçamentos do Mês
                        </h1>
                        <p className="text-muted-foreground">Defina seus limites de gastos mensais.</p>
                    </div>
                </div>
                <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Definir Orçamentos</CardTitle>
                    <CardDescription>
                        Insira o valor máximo que você planeja gastar em cada categoria este mês.
                        Para não definir um orçamento, deixe o valor como 0.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {budgetCategories.map((category) => (
                                <FormField
                                    key={category.id}
                                    control={form.control}
                                    name={category.id}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-2">
                                                <category.icon className="h-5 w-5 text-muted-foreground" />
                                                {category.label}
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0,00"
                                                        className="pl-9"
                                                        {...field}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        value={field.value || ''}
                                                    />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
