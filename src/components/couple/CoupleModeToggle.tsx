'use client';

import { useState, useEffect } from 'react';
import { User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { InvitePartnerDialog } from './InvitePartnerDialog';
import { useViewMode } from '../client-providers';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';

export function CoupleModeToggle() {
    const [isInviteOpen, setInviteOpen] = useState(false);
    const { status, isLoading } = useCoupleStore();
    const { viewMode, setViewMode } = useViewMode();
    const { toast } = useToast();
    
    const handleToggle = (newMode: 'separate' | 'together') => {
        if (isLoading) return; // evita ações antes do store estar pronto

        if (newMode === 'together' && status !== 'linked') {
            toast({
                title: 'Vincule um parceiro primeiro',
                description: 'Envie um convite para poder usar o Modo Casal.',
            });
            setInviteOpen(true);
        } else {
            setViewMode(newMode);
        }
    };

    if (isLoading) {
        return <Skeleton className="h-10 w-44 rounded-full" />
    }

    return (
        <>
            <div className="flex items-center space-x-1 p-1 rounded-full bg-secondary">
                <Button
                    size="sm"
                    variant={viewMode === 'separate' ? 'default' : 'ghost'}
                    className="rounded-full px-3 py-1 h-8 text-xs"
                    onClick={() => handleToggle('separate')}
                >
                    <User className="h-4 w-4 mr-1.5" />
                    Individual
                </Button>
                <Button
                    size="sm"
                    variant={viewMode === 'together' ? 'default' : 'ghost'}
                    className="rounded-full px-3 py-1 h-8 text-xs"
                    onClick={() => handleToggle('together')}
                >
                    <Users className="h-4 w-4 mr-1.5" />
                    Casal
                </Button>
            </div>
            <InvitePartnerDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
        </>
    );
}
