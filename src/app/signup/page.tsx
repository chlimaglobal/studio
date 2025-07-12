'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { CreditCard, ShieldAlert, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const formSchema = z.object({
  name: z.string().min(2, {
    message: "O nome deve ter pelo menos 2 caracteres.",
  }),
  email: z.string().email({
    message: 'Endereço de e-mail inválido.',
  }),
  password: z.string().min(6, {
    message: 'A senha deve ter pelo menos 6 caracteres.',
  }),
  creditCard: z.string().refine((value) => /^\d{16}$/.test(value), {
    message: 'Número de cartão de crédito inválido. Deve ter 16 dígitos.',
  }),
});

export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      creditCard: '',
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log('Registration successful for:', values.email);
    toast({
      title: 'Cadastro realizado com sucesso!',
      description: 'Você será redirecionado para o painel.',
    });
    router.push('/dashboard');
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Alert variant="destructive" className="mb-4 max-w-sm">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Ambiente de Demonstração</AlertTitle>
        <AlertDescription>
          Esta é uma aplicação de protótipo. Não insira informações pessoais ou financeiras reais.
        </AlertDescription>
      </Alert>
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Wallet className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold">Crie sua Conta</CardTitle>
          <CardDescription>Insira seus dados para começar a usar o FinanceFlow.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="nome@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="creditCard"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cartão de Crédito (Simulação)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input placeholder="0000 0000 0000 0000" {...field} />
                        <CreditCard className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-lg" size="lg">
                Cadastrar
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link href="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Faça login
        </Link>
      </p>
    </main>
  );
}
