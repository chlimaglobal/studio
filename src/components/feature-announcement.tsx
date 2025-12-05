'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Rocket, Baby } from 'lucide-react';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

const announcements = [
    {
        id: 'feature_retirement_planner_20240728',
        title: 'Nova Funcionalidade: Planejador de Aposentadoria!',
        description: 'Calcule quando você pode se aposentar e quanto precisa economizar. Encontre na seção "Minha Conta".',
        duration: 10000,
        href: '/dashboard/goals',
        actionLabel: 'Ver Agora',
        icon: Rocket,
    },
    {
        id: 'feature_baby_category_20240730',
        title: 'Nova Categoria: Despesas do Bebê!',
        description: 'A família vai aumentar? Agora você pode organizar os gastos com o seu bebê em uma categoria dedicada.',
        duration: 12000,
        href: '/dashboard/categories',
        actionLabel: 'Ver Categoria',
        icon: Baby,
    },
    // Adicione futuros anúncios aqui
];

export function FeatureAnnouncement() {
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        announcements.forEach(announcement => {
            const hasBeenShown = localStorage.getItem(announcement.id);
            if (!hasBeenShown) {
                toast({
                    title: (
                        <div className="flex items-center gap-2">
                            <announcement.icon className="h-5 w-5 text-primary" />
                            {announcement.title}
                        </div>
                    ),
                    description: announcement.description,
                    duration: announcement.duration,
                    action: announcement.href ? (
                        <Button variant="outline" size="sm" onClick={() => router.push(announcement.href)}>
                            {announcement.actionLabel}
                        </Button>
                    ) : undefined,
                });
                localStorage.setItem(announcement.id, 'true');
            }
        });
    }, [toast, router]);

    return null; // This component does not render anything itself
}
