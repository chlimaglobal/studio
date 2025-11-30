// components/lumina/AvatarPremium.tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  isThinking?: boolean;
  onClick?: () => void;
};

export default function AvatarPremium({ isThinking = false, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'lumina-avatar',
        isThinking && 'lumina-thinking'
      )}
      aria-hidden
    />
  );
}
