'use client';

import { logoutAction } from '@/app/actions/auth';
import { Button } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

interface UserMenuProps {
  name: string;
}

export function UserMenu({ name }: UserMenuProps) {
  const t = useTranslations('nav');
  const [pending, startTransition] = useTransition();
  const initial = name.charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
        aria-hidden="true"
      >
        {initial}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            await logoutAction();
          });
        }}
      >
        {pending ? `${t('logout')}…` : t('logout')}
      </Button>
    </div>
  );
}
