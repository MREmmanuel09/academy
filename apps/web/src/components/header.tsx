import { auth } from '@/auth';
import { getTranslations } from 'next-intl/server';
import { HeaderClient } from './header-client';
import { Link } from './link';
import { SiteNav } from './mobile-nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

interface HeaderProps {
  locale: string;
}

export async function Header({ locale }: HeaderProps) {
  const t = await getTranslations('nav');
  const session = await auth();
  const links = [
    { href: '/courses', label: t('courses') },
    { href: '/practice', label: t('practice') },
    ...(session?.user ? [{ href: '/dashboard', label: t('dashboard') }] : []),
  ];
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Academy
        </Link>
        <SiteNav
          links={links}
          loginHref="/login"
          loginLabel={t('login')}
          menuLabel={t('menu')}
          closeLabel={t('close')}
          isLoggedIn={Boolean(session?.user)}
        />
        <div className="flex items-center gap-2 text-sm">
          <HeaderClient />
          <ThemeToggle />
          {session?.user ? (
            <UserMenu name={session.user.name ?? session.user.email ?? ''} />
          ) : (
            <Link href="/login" className="hidden hover:underline md:inline">
              {t('login')}
            </Link>
          )}
        </div>
        <span className="sr-only">Current locale: {locale}</span>
      </div>
    </header>
  );
}
