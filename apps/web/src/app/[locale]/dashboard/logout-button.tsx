'use client';

import { logoutAction } from '@/app/actions/auth';
import { Button } from '@academy/ui';
import { useTranslations } from 'next-intl';
import { useTransition } from 'react';

export function LogoutButton() {
  const t = useTranslations('nav');
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await logoutAction();
        });
      }}
    >
      {pending ? `${t('logout')}…` : t('logout')}
    </Button>
  );
}
