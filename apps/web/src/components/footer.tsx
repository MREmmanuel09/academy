import { getTranslations } from 'next-intl/server';
import { Link } from './link';

export async function Footer() {
  const t = await getTranslations('footer');
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} Academy. {t('license')}.
        </p>
        <Link
          href="https://github.com/academy/platform"
          className="hover:underline"
          target="_blank"
          rel="noreferrer noopener"
        >
          {t('sourceCode')}
        </Link>
      </div>
    </footer>
  );
}
