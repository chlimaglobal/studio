
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
    Fingerprint
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
    { 
        icon: Fingerprint, 
        title: 'Desbloquear com biometria', 
        subtitle: null,
        type: 'switch',
        href: ''
    },
    { 
        icon: UserCircle, 
        title: 'Meu perfil', 
        subtitle: 'Atualize seus dados pessoais, como nome, foto, renda e outros.',
        type: 'link',
        href: '/dashboard/settings'
    },
    { 
        icon: MessageCircle, 
        title: 'Assistente IA no WhatsApp', 
        subtitle: 'Registre receitas, despesas e muito mais diretamente no WhatsApp ✨',
        type: 'link',
        href: '/dashboard/whatsapp'
    },
    { 
        icon: Upload, 
        title: 'Importar extratos', 
        subtitle: 'Arquivos suportados: OFX, CSV, PDF.',
        type: 'link',
        href: '#'
    },
    { 
        icon: BellRing, 
        title: 'Importar notificações', 
        subtitle: 'Importe suas transações a partir de notificações do banco.',
        type: 'switch',
        href: ''
    },
    { 
        icon: LayoutGrid, 
        title: 'Minhas categorias', 
        subtitle: null,
        type: 'link',
        href: '#'
    },
    { 
        icon: Wallet, 
        title: 'Minhas contas e cartões', 
        subtitle: null,
        type: 'link',
        href: '/dashboard/cards'
    },
     { 
        icon: Target, 
        title: 'Minhas metas e limites', 
        subtitle: null,
        type: 'link',
        href: '/dashboard/goals'
    },
    { 
        icon: Bell, 
        title: 'Configurar notificações', 
        subtitle: null,
        type: 'link',
        href: '/dashboard/settings'
    },
];


export default function ProfilePage() {

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            Configurações
          </h1>
          <p className="text-muted-foreground">Gerencie suas preferências e conta.</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {menuItems.map((item) => {
            const ItemCard = () => (
                <Card className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <item.icon className="h-6 w-6 text-primary" />
                        <div className="flex flex-col">
                            <span className="font-semibold">{item.title}</span>
                            {item.subtitle && <span className="text-sm text-muted-foreground">{item.subtitle}</span>}
                        </div>
                    </div>
                    {item.type === 'link' && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    {item.type === 'switch' && <Switch />}
                </Card>
            );

            if (item.type === 'link' && item.href !== '#') {
                return (
                    <Link href={item.href} key={item.title}>
                        <ItemCard />
                    </Link>
                );
            }
            
            return <ItemCard key={item.title}/>;
        })}
      </div>

    </div>
  );
}
