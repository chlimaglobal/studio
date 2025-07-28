
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
import { CalendarIcon, Loader2, HandCoins, PlusCircle } from 'lucide-react';
import { AddCommissionFormSchema, Commission } from '@/lib/commission-types';
import React, { useEffect, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { addStoredCommission, onCommissionsUpdate } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

function CommissionForm() {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof AddCommissionFormSchema>>({
        resolver: zodResolver(AddCommissionFormSchema),
        defaultValues: {
            description: '',
            amount: '' as any,
            client: '',
            date: new Date(),
        },
    });

    async function onSubmit(values: z.infer<typeof AddCommissionFormSchema>) {
        try {
            await addStoredCommission(values);
            toast({
                title: 'Sucesso!',
                description: 'Comissão adicionada com sucesso.',
            });
            form.reset({
                description: '',
                amount: '' as any,
                client: '',
                date: new Date(),
            });
        } catch (error) {
            console.error("Failed to submit commission:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Salvar',
                description: 'Não foi possível salvar a comissão. Tente novamente.',
            });
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PlusCircle /> Adicionar Nova Comissão</CardTitle>
                <CardDescription>Registre uma nova comissão recebida.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                            type="number" 
                                            step="0.01" 
                                            placeholder="0,00" 
                                            {...field}
                                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
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
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Comissão
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

function CommissionList({ commissions }: { commissions: Commission[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Comissões Registradas</CardTitle>
                <CardDescription>Seu histórico de comissões.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-96">
                    <ul className="space-y-4">
                        {commissions.length > 0 ? (
                            commissions.map((commission) => (
                                <li key={commission.id} className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                                    <div>
                                        <p className="font-semibold">{commission.description}</p>
                                        {commission.client && <p className="text-sm text-muted-foreground">{commission.client}</p>}
                                        <p className="text-xs text-muted-foreground">{format(commission.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                                    </div>
                                    <p className="font-bold text-lg text-green-500">{formatCurrency(commission.amount)}</p>
                                </li>
                            ))
                        ) : (
                            <li className="text-center text-muted-foreground py-10">
                                Nenhuma comissão registrada ainda.
                            </li>
                        )}
                    </ul>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onCommissionsUpdate((newCommissions) => {
            setCommissions(newCommissions);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full p-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Carregando comissões...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <HandCoins className="h-6 w-6" />
                    Minhas Comissões
                </h1>
                <p className="text-muted-foreground">Adicione e acompanhe seus ganhos de comissões.</p>
            </header>
            
            <CommissionForm />

            <CommissionList commissions={commissions} />
        </div>
    )
}
