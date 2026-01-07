
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Banknote, BookOpen, Dumbbell, GraduationCap, HeartPulse, Loader2, PawPrint, Pizza, Popcorn, Save, ShoppingCart, ShieldCheck, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Budget, BudgetSchema } from '@/types';
import { useAuth, useSubscription } from '@/components/client-providers';
import { onBudgetsUpdate, saveBudgets } from '@/lib/storage';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

const budgetCategories = [
    { id: 'Supermercado', label: 'Supermercado', icon: ShoppingCart },
    { id: 'Casa', label: 'Casa (Contas e Manutenção)', icon: Banknote },
    { id: 'Pet', label: 'Pet', icon: PawPrint },
    { id: 'Farmácia', label: 'Farmácia', icon: HeartPulse },
    { id: 'Restaurante', label: 'Restaurante', icon: Pizza },
    { id: 'Entretenimento', label: 'Entretenimento', icon: Popcorn },
    { id: 'Fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'Educação', label: 'Educação', icon: GraduationCap },
    { id: 'Outros', label: 'Outros', icon: BookOpen },
] as const;

const PremiumBlocker = () => (
    <Card className="text-center">
        <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-6 w-6 text-amber-500" />
                Recurso Premium
            </CardTitle>
            <CardDescription>
                A criação de orçamentos personalizados é um recurso exclusivo para assinantes.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
                Faça o upgrade do seu plano para definir limites de gastos e receber alertas.
            </p>
            <Button asChild>
                <Link href="/dashboard/pricing">Ver Planos</Link>
            </Button>
        </CardContent>
    </Card>
);

export default function BudgetsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const { isSubscribed, isLoading: isSubscriptionLoading } = useSubscription();
    const [isLoading, setIsLoading] = useState(true);

    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';
    const monthId = format(new Date(), 'yyyy-MM');

    const form = useForm<z.infer<typeof BudgetSchema>>({
        resolver: zodResolver(BudgetSchema),
        defaultValues: {
            Supermercado: 0,
            Casa: 0,
            Pet: 0,
            Farmácia: 0,
            Restaurante: 0,
            Entretenimento: 0,
            Fitness: 0,
            Educação: 0,
            Outros: 0
        },
    });

    useEffect(() => {
        if (user && (isSubscribed || isAdmin)) {
            setIsLoading(true);
            const unsubscribe = onBudgetsUpdate(user.uid, monthId, (budgets) => {
                if (budgets) {
                    form.reset(budgets);
                }
                setIsLoading(false);
            });
            return () => unsubscribe();
        } else if (!isSubscribed && !isAdmin) {
            setIsLoading(false);
        }
    }, [user, monthId, form, isSubscribed, isAdmin]);

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

    if (isLoading || isSubscriptionLoading) {
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
                 {(isSubscribed || isAdmin) && (
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Salvar
                    </Button>
                )}
            </div>
             {(!isSubscribed && !isAdmin) ? <PremiumBlocker /> : (
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
                            <form onSubmit={form.handleSubmit(onSubmit)}>
                                <ScrollArea className="h-[calc(100vh-22rem)]">
                                    <div className="space-y-6 p-1">
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
                                    </div>
                                </ScrollArea>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
             )}
        </div>
    );
}

    