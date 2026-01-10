
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
import { CalendarIcon, Loader2, icons } from 'lucide-react';
import React from 'react';
import { AddGoalFormSchema } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { ScrollArea } from './ui/scroll-area';
import Icon from './icon';
import { addStoredGoal } from '@/lib/storage';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/components/providers/app-providers';
import { iconNames } from '@/types';

type AddGoalDialogProps = {
  children: React.ReactNode;
};

export function AddGoalDialog({ children }: AddGoalDialogProps) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof AddGoalFormSchema>>({
    resolver: zodResolver(AddGoalFormSchema),
    defaultValues: {
      name: '',
      targetAmount: undefined, // Use undefined for placeholder to show
      currentAmount: 0,
      deadline: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof AddGoalFormSchema>) {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Erro de Autenticação',
            description: "Você precisa estar logado para adicionar uma meta."
        });
        return;
    }
    try {
      await addStoredGoal(user.uid, values);
      toast({
          title: 'Sucesso!',
          description: "Meta adicionada com sucesso!",
      });
      form.reset();
      setOpen(false);
    } catch (error) {
      console.error("Failed to add goal:", error);
      toast({
          variant: 'destructive',
          title: 'Erro ao Adicionar Meta',
          description: 'Ocorreu um erro. Tente novamente.',
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Adicionar Nova Meta</DialogTitle>
          <DialogDescription>
            Defina um objetivo financeiro para acompanhar seu progresso.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Meta</FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Viagem, Carro Novo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Alvo (R$)</FormLabel>
                    <FormControl>
                        <Input 
                            type="text" 
                            inputMode="decimal" 
                            placeholder="2.500,00" 
                            {...field}
                         />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="currentAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Atual (R$)</FormLabel>
                    <FormControl>
                       <Input 
                            type="text" 
                            inputMode="decimal" 
                            placeholder="0,00" 
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
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                  {field.value ? <Icon name={field.value as keyof typeof icons} className="mr-2 h-5 w-5" /> : null}
                                <SelectValue placeholder="Selecione um ícone" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <ScrollArea className="h-72">
                                {iconNames.map((icon) => (
                                <SelectItem key={icon} value={icon}>
                                  <div className="flex items-center gap-2">
                                    <Icon name={icon as keyof typeof icons} className="h-5 w-5" />
                                    <span>{icon}</span>
                                  </div>
                                </SelectItem>
                                ))}
                              </ScrollArea>
                            </SelectContent>
                        </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Prazo</FormLabel>
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
                            disabled={(date) => date < new Date()}
                            initialFocus
                            locale={ptBR}
                            />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
              />
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Meta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
