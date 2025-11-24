'use client';

import { useState } from 'react';
import { User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCoupleStore } from '@/hooks/use-couple-store';
import { InvitePartnerDialog } from './InvitePartnerDialog';

export function CoupleModeToggle() {
    const [isInviteOpen, setInviteOpen] = useState(false);
    const { partner } = useCoupleStore();
    
    // This local state will manage the visual toggle
    const [viewMode, setViewMode] = useState<'separate' | 'together'>('separate');

    const handleToggle = (newMode: 'separate' | 'together') => {
        if (newMode === 'together' && !partner) {
            setInviteOpen(true);
        } else {
            setViewMode(newMode);
            // Here you would also update a global state (e.g., Zustand/Context)
            // For now, we just manage the local visual state.
        }
    }

    return (
        <>
            <div className="flex items-center space-x-2 p-1 rounded-full bg-secondary">
                <Button
                    size="sm"
                    variant={viewMode === 'separate' ? 'default' : 'ghost'}
                    className="rounded-full px-4 py-1 h-8"
                    onClick={() => handleToggle('separate')}
                >
                    <User className="h-4 w-4 mr-2" />
                    Individual
                </Button>
                <Button
                    size="sm"
                    variant={viewMode === 'together' ? 'default' : 'ghost'}
                    className="rounded-full px-4 py-1 h-8"
                    onClick={() => handleToggle('together')}
                >
                    <Users className="h-4 w-4 mr-2" />
                    Casal
                </Button>
            </div>
            <InvitePartnerDialog open={isInviteOpen} onOpenChange={setInviteOpen} />
        </>
    );
}
