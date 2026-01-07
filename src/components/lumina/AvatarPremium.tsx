
// components/lumina/AvatarPremium.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  isThinking?: boolean;
};

export default function AvatarPremium({ isThinking = false }: Props) {
  return (
    <div className={cn('lumina-sphere', isThinking && 'lumina-thinking')} aria-hidden />
  );
}

    