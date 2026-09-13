import { auth } from '@/auth';
import { Footer } from '@/components/footer';
import { Header } from '@/components/header';
import { Providers } from '@/components/providers';
import { type ClientSession, SessionProvider } from '@/components/session-provider';
import { directionFor } from '@/i18n/routing';
import { type Locale, isLocale, locales } from '@academy/i18n';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import Script from 'next/script';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams(): Array<{ locale: Locale }> {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  const session = await auth();
  const clientSession: ClientSession | null = session?.user
    ? {
        user: {
          id: session.user.id,
          email: session.user.email ?? '',
          name: session.user.name ?? null,
          image: session.user.image ?? null,
          isDemo: session.user.isDemo,
          preferredLocale: session.user.preferredLocale,
          timezone: session.user.timezone,
        },
      }
    : null;

  const dir = directionFor(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
        >{`(function(){try{var theme=localStorage.getItem('theme')||'system';var isDark=theme==='dark'||(theme==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(isDark)document.documentElement.classList.add('dark');}catch(e){}})();`}</Script>
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <SessionProvider value={clientSession}>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
              >
                Skip to main content
              </a>
              <div className="flex min-h-screen flex-col">
                <Header locale={locale} />
                <main id="main" className="flex-1">
                  {children}
                </main>
                <Footer />
              </div>
            </SessionProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
