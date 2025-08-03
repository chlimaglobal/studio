
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
import { CalendarIcon, Loader2, HandCoins, PlusCircle, Trash2, CheckCircle, Clock, PieChart, Pencil } from 'lucide-react';
import { AddCommissionFormSchema, Commission } from '@/lib/commission-types';
import React, { useEffect, useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { addStoredCommission, onCommissionsUpdate, updateStoredCommissionStatus, deleteStoredCommission } from '@/lib/storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/app/layout';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { EditCommissionDialog } from '@/components/edit-commission-dialog';

function CommissionForm() {
    const { toast } = useToast();
    const { user } = useAuth();
    const form = useForm<z.infer<typeof AddCommissionFormSchema>>({
        resolver: zodResolver(AddCommissionFormSchema),
        defaultValues: {
            description: '',
            amount: '' as any,
            client: '',
            date: new Date(),
            status: 'received',
        },
    });

    async function onSubmit(values: z.infer<typeof AddCommissionFormSchema>) {
        if (!user) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Você precisa estar logado.' });
            return;
        }
        try {
            await addStoredCommission(user.uid, values);
            toast({
                title: 'Sucesso!',
                description: `Comissão adicionada com sucesso. Uma transação de receita foi criada.`,
            });
            form.reset({
                description: '',
                amount: '' as any,
                client: '',
                date: new Date(),
                status: 'received',
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
                <CardDescription>Registre uma nova comissão. Se marcada como "Recebida", será adicionada como receita automaticamente.</CardDescription>
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
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <FormLabel>Já foi recebida?</FormLabel>
                                    <FormControl>
                                        <Switch
                                            checked={field.value === 'received'}
                                            onCheckedChange={(checked) => field.onChange(checked ? 'received' : 'pending')}
                                        />
                                    </FormControl>
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
    const { user } = useAuth();
    const { toast } = useToast();
    const [editingCommission, setEditingCommission] = useState<Commission | null>(null);

    const handleStatusChange = async (commission: Commission) => {
        if (!user) return;
        const newStatus = commission.status === 'received' ? 'pending' : 'received';
        try {
            await updateStoredCommissionStatus(user.uid, commission.id, newStatus, commission);
            let description = `Comissão marcada como ${newStatus === 'received' ? 'recebida' : 'pendente'}.`;
            if (newStatus === 'received') {
                description += ' Uma transação de receita foi criada.';
            }
            toast({
                title: 'Status Atualizado!',
                description: description,
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível atualizar o status.' });
        }
    }

    const handleDelete = async (commissionId: string) => {
        if (!user) return;
        try {
            await deleteStoredCommission(user.uid, commissionId);
            toast({
                title: 'Comissão Excluída!',
                description: 'O registro da comissão foi removido com sucesso.',
            });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível excluir a comissão.' });
        }
    }

    return (
        <>
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
                                        <div className="flex items-center gap-4">
                                            <Switch
                                                checked={commission.status === 'received'}
                                                onCheckedChange={() => handleStatusChange(commission)}
                                                aria-label={commission.status === 'received' ? 'Marcar como pendente' : 'Marcar como recebida'}
                                            />
                                            <div>
                                                <p className="font-semibold">{commission.description}</p>
                                                {commission.client && <p className="text-sm text-muted-foreground">{commission.client}</p>}
                                                <p className="text-xs text-muted-foreground">{format(commission.date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <p className={cn("font-bold text-lg", commission.status === 'received' ? 'text-green-500' : 'text-amber-500')}>
                                                {formatCurrency(commission.amount)}
                                            </p>
                                            
                                            <Button variant="ghost" size="icon" onClick={() => setEditingCommission(commission)}>
                                                <Pencil className="h-4 w-4" />
                                            </Button>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o registro da comissão.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(commission.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Sim, excluir
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
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
            {editingCommission && (
                <EditCommissionDialog
                    commission={editingCommission}
                    open={!!editingCommission}
                    onOpenChange={(isOpen) => {
                        if (!isOpen) {
                            setEditingCommission(null);
                        }
                    }}
                />
            )}
        </>
    )
}

function CommissionSummary({ commissions }: { commissions: Commission[] }) {
    const { received, pending, total } = useMemo(() => {
        const received = commissions
            .filter(c => c.status === 'received')
            .reduce((acc, c) => acc + c.amount, 0);

        const pending = commissions
            .filter(c => c.status === 'pending')
            .reduce((acc, c) => acc + c.amount, 0);

        return { received, pending, total: received + pending };
    }, [commissions]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart /> Resumo das Comissões</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 rounded-lg bg-green-500/10 text-green-500">
                    <CheckCircle className="h-8 w-8 mb-2" />
                    <p className="text-sm font-medium">Total Recebido</p>
                    <p className="text-2xl font-bold">{formatCurrency(received)}</p>
                </div>
                 <div className="flex flex-col items-center p-4 rounded-lg bg-amber-500/10 text-amber-500">
                    <Clock className="h-8 w-8 mb-2" />
                    <p className="text-sm font-medium">A Receber</p>
                    <p className="text-2xl font-bold">{formatCurrency(pending)}</p>
                </div>
                <div className="flex flex-col items-center p-4 rounded-lg bg-primary/10 text-primary">
                    <HandCoins className="h-8 w-8 mb-2" />
                    <p className="text-sm font-medium">Total Geral</p>
                    <p className="text-2xl font-bold">{formatCurrency(total)}</p>
                </div>
            </CardContent>
        </Card>
    )
}

export default function CommissionsPage() {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const unsubscribe = onCommissionsUpdate(user.uid, (newCommissions) => {
            setCommissions(newCommissions);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [user]);

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
            
            <CommissionSummary commissions={commissions} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CommissionForm />
                <CommissionList commissions={commissions} />
            </div>
        </div>
    )
}
