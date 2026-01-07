
'use client';

import Link, { type LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type React from 'react';

interface MobileNavLinkProps extends LinkProps {
  children: React.ReactNode;
  setOpen: (open: boolean) => void;
  className?: string;
}

export default function MobileNavLink({
  href,
  setOpen,
  className,
  children,
  ...props
}: MobileNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  const handleClick = () => {
    setOpen(false);
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(
        'flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground',
        isActive && 'text-foreground',
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

    