
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, Save, Link as LinkIcon, KeyRound, TestTube2, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"


export default function IntegrationPage() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState('');
  const [bearerToken, setBearerToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    // Load saved settings from localStorage
    const savedApiUrl = localStorage.getItem('externalApiUrl');
    // We don't load the bearer token for security reasons. It's only written.
    if (savedApiUrl) {
      setApiUrl(savedApiUrl);
    }
  }, []);

  const handleSave = () => {
    setIsLoading(true);
    try {
      localStorage.setItem('externalApiUrl', apiUrl);
      if (bearerToken) {
          // Only update the token if a new one is provided
          localStorage.setItem('externalApiBearerToken', bearerToken);
      }
      toast({
        title: 'Sucesso!',
        description: 'As configurações de integração foram salvas.',
      });
      setBearerToken(''); // Clear the input after saving
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Erro ao Salvar',
        description: 'Não foi possível salvar as configurações.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const token = bearerToken || localStorage.getItem('externalApiBearerToken');

    if (!apiUrl || !token) {
        toast({
            variant: 'destructive',
            title: 'Dados Incompletos',
            description: 'Por favor, preencha a URL da API e o Token Secreto.',
        });
        setIsTesting(false);
        return;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            // Sending a dummy payload for testing
            body: JSON.stringify({
                descricao: "Teste de Conexão",
                valor: 0.01,
            }),
        });

        if (response.ok) {
             setTestResult({ success: true, message: `Conexão bem-sucedida! (Status: ${response.status})` });
        } else {
             const errorBody = await response.text();
             setTestResult({ success: false, message: `Falha na conexão (Status: ${response.status}). Resposta: ${errorBody}` });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        setTestResult({ success: false, message: `Erro de rede ou DNS: ${errorMessage}` });
    } finally {
        setIsTesting(false);
    }
  };


  return (
    <div className="space-y-6">
       <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    Integração com API Externa
                </h1>
                <p className="text-muted-foreground">Conecte o FinanceFlow ao seu assistente do WhatsApp.</p>
            </div>
      </div>

        <Card>
            <CardHeader>
                <CardTitle>Configurar Conexão</CardTitle>
                <CardDescription>
                    Forneça as credenciais da sua API para que o assistente do WhatsApp possa registrar suas despesas automaticamente aqui no FinanceFlow.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="space-y-2">
                    <Label htmlFor="api-url" className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        URL da sua API
                    </Label>
                    <Input 
                        id="api-url"
                        type="url"
                        placeholder="https://seu-dominio.com/api/despesas"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="bearer-token" className="flex items-center gap-2">
                         <KeyRound className="h-4 w-4" />
                        Bearer Token Secreto
                    </Label>
                    <Input 
                        id="bearer-token"
                        type="password"
                        placeholder="Deixe em branco para não alterar"
                        value={bearerToken}
                        onChange={(e) => setBearerToken(e.target.value)}
                    />
                     <p className="text-xs text-muted-foreground">
                        Seu token é armazenado de forma segura e nunca será exibido novamente.
                    </p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TestTube2 className="mr-2 h-4 w-4" />}
                    Testar Conexão
                </Button>
                <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar Configurações
                </Button>
            </CardFooter>
        </Card>

        {testResult && (
             <AlertDialog open={!!testResult} onOpenChange={() => setTestResult(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>{testResult.success ? "Conexão Bem-Sucedida" : "Falha no Teste"}</AlertDialogTitle>
                    <AlertDialogDescription>
                       {testResult.message}
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setTestResult(null)}>Fechar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}

    