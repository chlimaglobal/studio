

      
'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { 
    ChevronRight, 
    UserCircle, 
    MessageCircle, 
    Upload, 
    BellRing, 
    LayoutGrid, 
    Wallet, 
    Target, 
    Bell,
    Fingerprint,
    Loader2,
    ShieldCheck,
    Star,
    LineChart,
    ArrowLeft,
    WalletCards,
    Repeat,
    LifeBuoy,
    HandCoins,
    Calculator,
    CreditCard,
    Shield,
    Settings,
    Users,
    HeartHandshake,
    Home
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useEffect } from 'react';
import { bufferToBase64Url } from '@/lib/utils';
import { useSubscription, useAuth } from '@/components/client-providers';
import { useRouter } from 'next/navigation';

const menuItems = [
    { 
        icon: CreditCard, 
        title: 'Meus Cartões', 
        subtitle: 'Gerencie seus cartões de crédito e faturas.',
        type: 'link',
        href: '/dashboard/cards',
        premium: true,
    },
    { 
        icon: HeartHandshake, 
        title: 'Controle Parental', 
        subtitle: 'Gerencie a mesada e as finanças dos seus filhos.',
        type: 'link',
        href: '/dashboard/parental-control',
        premium: true,
    },
    { 
        icon: MessageCircle, 
        title: 'Assistente Lúmina no WhatsApp', 
        subtitle: 'Registre receitas, despesas e muito mais diretamente no WhatsApp ✨',
        type: 'link',
        href: '/dashboard/whatsapp',
        premium: true,
    },
    { 
        icon: Upload, 
        title: 'Importar extratos', 
        subtitle: 'Arquivos suportados: OFX, CSV, PDF.',
        type: 'link',
        href: '/dashboard/import',
        premium: true,
    },
    { 
        icon: ShieldCheck, 
        title: 'Meus Orçamentos', 
        subtitle: 'Defina limites de gastos para categorias específicas.',
        type: 'link',
        href: '/dashboard/budgets',
        premium: true,
    },
     { 
        icon: LineChart, 
        title: 'Meus Investimentos', 
        subtitle: 'Controle seus ativos e veja a evolução do seu patrimônio.',
        type: 'link',
        href: '/dashboard/investments',
        premium: true,
    },
     { 
        icon: Target, 
        title: 'Minhas Metas', 
        subtitle: 'Crie e acompanhe seus objetivos financeiros.',
        type: 'link',
        href: '/dashboard/retirement-projection',
        premium: true,
    },
     {
        icon: Users,
        title: "Metas de Casal (com Lúmina)",
        subtitle: "Alinhe seus objetivos financeiros em conjunto.",
        type: 'link',
        href: '/dashboard/mediate-goals',
        premium: true,
    },
     { 
        icon: HandCoins, 
        title: 'Minhas Comissões', 
        subtitle: 'Acompanhe seus ganhos de comissões.',
        type: 'link',
        href: '/dashboard/commissions',
        premium: false,
    },
    { 
        icon: WalletCards, 
        title: 'Contas a Pagar e Recorrentes', 
        subtitle: 'Gerencie suas contas fixas e variáveis.',
        type: 'link',
        href: '/dashboard/bills',
        premium: false,
    },
    { 
        icon: Repeat, 
        title: 'Minhas Assinaturas', 
        subtitle: 'Gerencie seus serviços de assinatura e seus custos.',
        type: 'link',
        href: '/dashboard/subscriptions',
        premium: false,
    },
    { 
        icon: LayoutGrid, 
        title: 'Minhas categorias', 
        subtitle: null,
        type: 'link',
        href: '/dashboard/categories',
        premium: false,
    },
    { 
        icon: Wallet, 
        title: 'Minhas contas bancárias', 
        subtitle: null,
        type: 'link',
        href: '/dashboard/banks',
        premium: false,
    },
     { 
        icon: Calculator, 
        title: 'Planejamento de Aposentadoria', 
        subtitle: 'Calcule e planeje seu futuro financeiro.',
        type: 'link',
        href: '/dashboard/goals',
        premium: true,
    },
    { 
        icon: Settings, 
        title: 'Integrações Externas', 
        subtitle: 'Conecte o FinanceFlow a outros sistemas.',
        type: 'link',
        href: '/dashboard/integration',
        premium: false,
    },
    { 
        icon: Bell, 
        title: 'Configurar notificações', 
        subtitle: null,
        type: 'link',
        href: '/dashboard/settings',
        premium: false,
    },
    { 
        icon: Shield, 
        title: 'Segurança e Privacidade', 
        subtitle: 'Veja como protegemos seus dados.',
        type: 'link',
        href: '/dashboard/security',
        premium: false,
    },
    { 
        icon: LifeBuoy, 
        title: 'Suporte e Ajuda', 
        subtitle: 'Fale conosco ou consulte a documentação.',
        type: 'link',
        href: '/dashboard/support',
        premium: false,
    },
];

const LinkCard = ({ item }: { item: typeof menuItems[0] }) => {
    const { toast } = useToast();
    const { isSubscribed } = useSubscription();
    const { user } = useAuth();
    const isAdmin = user?.email === 'digitalacademyoficiall@gmail.com';

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (item.href === '#') {
            e.preventDefault();
            toast({
                title: 'Funcionalidade em Breve',
                description: 'Esta opção ainda não foi implementada.',
            });
        }
    };

    return (
        <Link href={item.href} key={item.title} onClick={item.href === '#' ? handleClick : undefined}>
             <Card className="p-4 flex items-center justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                    <item.icon className="h-6 w-6 text-primary" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <span className="font-semibold">{item.title}</span>
                           {item.premium && !isSubscribed && !isAdmin && <Star className="h-4 w-4 text-amber-500 fill-amber-400" />}
                        </div>
                        {item.subtitle && <span className="text-sm text-muted-foreground">{item.subtitle}</span>}
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
        </Link>
    );
};


const BiometricsCard = () => {
    const { toast } = useToast();
    const [isRegistering, setIsRegistering] = useState(false);
    const [isBiometricSupported, setIsBiometricSupported] = useState(false);
    const [isBiometricRegistered, setIsBiometricRegistered] = useState(false);
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
                PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(supported => {
                    setIsBiometricSupported(supported);
                });
            }
            const storedCredential = localStorage.getItem('webauthn-credential-id');
            const registered = !!storedCredential;
            setIsBiometricRegistered(registered);
            setIsChecked(registered);
        }
    }, []);
    
    const handleRegisterBiometrics = async (enabled: boolean) => {
        setIsChecked(enabled);

        if (!enabled) {
            // Logic to disable/remove biometrics
            localStorage.removeItem('webauthn-credential-id');
            localStorage.removeItem('webauthn-user-id');
            setIsBiometricRegistered(false);
            toast({
                title: 'Biometria Desativada',
                description: 'O acesso com impressão digital foi removido.',
            });
            return;
        }

        setIsRegistering(true);
        try {
            const challenge = new Uint8Array(32);
            window.crypto.getRandomValues(challenge);

            let userId = localStorage.getItem('webauthn-user-id');
            if (!userId) {
                const newUserId = new Uint8Array(16);
                window.crypto.getRandomValues(newUserId);
                userId = bufferToBase64Url(newUserId);
                localStorage.setItem('webauthn-user-id', userId);
            }
            
            const userName = localStorage.getItem('userName') || 'Usuário';
            const userEmail = localStorage.getItem('userEmail') || 'user@example.com';

            const options: PublicKeyCredentialCreationOptions = {
                challenge,
                rp: {
                    name: "FinanceFlow",
                    id: window.location.hostname,
                },
                user: {
                    id: Uint8Array.from(atob(userId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
                    name: userEmail,
                    displayName: userName,
                },
                pubKeyCredParams: [
                    { type: "public-key", alg: -7 }, // ES256
                    { type: "public-key", alg: -257 }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                    requireResidentKey: true,
                },
                timeout: 60000,
                attestation: "direct",
            };

            const credential = await navigator.credentials.create({ publicKey: options });
            
            if (credential && (credential as PublicKeyCredential).rawId) {
                localStorage.setItem('webauthn-credential-id', bufferToBase64Url((credential as PublicKeyCredential).rawId));
                setIsBiometricRegistered(true);
                setIsChecked(true);
                toast({
                    title: 'Sucesso!',
                    description: 'Sua impressão digital foi cadastrada com sucesso.',
                });
            }

        } catch (err) {
            console.error("Erro no cadastro biométrico:", err);
            const error = err as Error;
            toast({
                variant: 'destructive',
                title: 'Falha no Cadastro',
                description: `Não foi possível cadastrar a impressão digital. (${error.name})`,
            });
            setIsChecked(false); // Revert switch on failure
        } finally {
            setIsRegistering(false);
        }
    }
    
     if (!isBiometricSupported) {
        return null; // Don't show the card if not supported
    }

    return (
        <Card className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Fingerprint className="h-6 w-6 text-primary" />
                <div className="flex flex-col">
                    <span className="font-semibold">Desbloquear com biometria</span>
                </div>
            </div>
            {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : <Switch checked={isChecked} onCheckedChange={handleRegisterBiometrics} />}
        </Card>
    );
};

export default function ProfilePage() {
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="space-y-4">
       <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            Minha Conta e Configurações
          </h1>
          <p className="text-muted-foreground">Gerencie suas preferências e conta.</p>
        </div>
      </div>
      
      <div className="space-y-3">
        
        <Link href={'/dashboard/settings'}>
             <Card className="p-4 flex items-center justify-between hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-4">
                    <UserCircle className="h-6 w-6 text-primary" />
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                           <span className="font-semibold">Editar Perfil e Preferências</span>
                        </div>
                        <span className="text-sm text-muted-foreground">Atualize seus dados e tema</span>
                    </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Card>
        </Link>
        
        <BiometricsCard />
        
        {menuItems.map((item) => (
            <LinkCard item={item} key={item.title} />
        ))}
        
      </div>
    </div>
  );
}
