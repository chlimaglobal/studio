
'use client';

import { Button } from '@/components/ui/button';
import { Landmark, PlusCircle, ArrowLeft, Loader2, Share2, Users, User, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AddAccountDialog } from '@/components/add-account-dialog';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/client-providers';
import { onAccountsUpdate } from '@/lib/storage';
import type { Account } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { accountTypeLabels } from '@/lib/types';
import { InviteDialog } from '@/components/invite-dialog';
import { acceptInviteCode } from '@/lib/firebase-functions';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';


const AcceptInviteCard = ({ onInviteAccepted }: { onInviteAccepted: () => void }) => {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const { user } = useAuth();


    const handleAccept = async () => {
        if (!code.trim()) {
            toast({ variant: 'destructive', description: "Por favor, insira um código." });
            return;
        }
        if (!user) {
            toast({ variant: 'destructive', description: "Você precisa estar logado para aceitar um convite." });
            return;
        }

        setIsLoading(true);
        try {
            const result = await acceptInviteCode({ code: code });
            toast({
                title: 'Sucesso!',
                description: `Você agora tem acesso à conta "${result.accountName}".`,
            });
            setCode('');
            onInviteAccepted(); // Callback to refresh the accounts list
        } catch (error) {
            const errorMessage = (error instanceof Error) ? error.message : 'Ocorreu um erro desconhecido.';
            toast({
                variant: 'destructive',
                title: 'Falha ao Aceitar Convite',
                description: errorMessage,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Entrar em uma Conta Compartilhada</CardTitle>
                <CardDescription>
                    Se você recebeu um código de convite, insira-o abaixo para ter acesso à conta.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                 <Input 
                    placeholder="Código do convite" 
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="font-mono tracking-widest text-center flex-grow"
                    maxLength={8}
                />
                <Button onClick={handleAccept} disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                     <span className="sm:hidden ml-2">Aceitar Convite</span>
                </Button>
            </CardContent>
        </Card>
    )
}


export default function BanksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const fetchAccounts = useCallback(() => {
     if (!user) {
      setIsLoading(false);
      return () => {};
    };

    setIsLoading(true);
    const unsubscribe = onAccountsUpdate(user.uid, (newAccounts) => {
      setAccounts(newAccounts);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    const unsubscribe = fetchAccounts();
    return () => unsubscribe();
  }, [fetchAccounts]);

  const handleInviteClick = (account: Account) => {
    setSelectedAccount(account);
    setIsInviteDialogOpen(true);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando contas...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                  <ArrowLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <Landmark className="h-6 w-6" />
                  Minhas Contas
                </h1>
                <p className="text-muted-foreground">Gerencie suas contas bancárias e compartilhadas.</p>
              </div>
          </div>
          <AddAccountDialog>
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Conta
              </Button>
          </AddAccountDialog>
        </div>
        
        {accounts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <Card key={account.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                      <div>
                          <CardTitle>{account.name}</CardTitle>
                          <CardDescription>{accountTypeLabels[account.type]}</CardDescription>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                          {account.isShared ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          <span className="text-xs">{account.isShared ? 'Compartilhada' : 'Pessoal'}</span>
                      </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-xs text-muted-foreground">Saldo Atual</p>
                  <p className="text-2xl font-bold">{formatCurrency(account.currentBalance)}</p>
                </CardContent>
                <CardFooter className="bg-muted/50 p-3 rounded-b-lg">
                  <Button variant="outline" className="w-full" onClick={() => handleInviteClick(account)}>
                      <Share2 className="mr-2 h-4 w-4"/>
                      Convidar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
              <Landmark className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Nenhuma conta cadastrada</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                  Adicione sua primeira conta bancária para começar a organizar.
              </p>
              <AddAccountDialog>
                  <Button>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar Conta
                  </Button>
              </AddAccountDialog>
          </div>
        )}

        <AcceptInviteCard onInviteAccepted={fetchAccounts} />
      </div>

      {selectedAccount && (
        <InviteDialog 
          account={selectedAccount}
          open={isInviteDialogOpen}
          onOpenChange={setIsInviteDialogOpen}
        />
      )}
    </>
  );
}
