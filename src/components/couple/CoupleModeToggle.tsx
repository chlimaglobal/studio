'use client';

import { useState } from 'react';
import { User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { InvitePartnerDialog } from './InvitePartnerDialog';
import { useViewMode } from '../client-providers';
import { useToast } from '@/hooks/use-toast';

export function CoupleModeToggle() {
    const [isInviteOpen, setInviteOpen] = useState(false);
    const { status } = useCoupleStore();
    const { viewMode, setViewMode } = useViewMode();
    const { toast } = useToast();

    const handleToggle = (newMode: 'separate' | 'together') => {
        if (newMode === 'together' && status !== 'linked') {
            toast({
                title: 'Vincule um parceiro primeiro',
                description: 'Envie um convite para poder usar o Modo Casal.',
            });
            setInviteOpen(true);
        } else {
            setViewMode(newMode);
        }
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
