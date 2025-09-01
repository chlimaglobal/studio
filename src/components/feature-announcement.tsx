
'use client';

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Rocket } from 'lucide-react';
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
    },
    // Adicione futuros anúncios aqui
    // {
    //     id: 'update_xyz_20240801',
    //     title: 'Atualização Importante!',
    //     description: 'Melhoramos o desempenho da sincronização de dados.',
    //     duration: 8000,
    // }
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
                            <Rocket className="h-5 w-5 text-primary" />
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
