import { pickRootLocale } from '@/lib/resolve-locale';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * App root (`/academy/` in public URL space). Next.js does not run
 * middleware for the basePath root, so this page performs the same
 * locale negotiation the intl middleware does everywhere else and
 * redirects to `/<locale>/`. Dynamic (reads request headers/cookies).
 */
export default async function AcademyRootPage(): Promise<never> {
  const store = await cookies();
  const hdrs = await headers();
  const locale = pickRootLocale(hdrs.get('accept-language'), store.get('NEXT_LOCALE')?.value);
  redirect(`/${locale}/`);
}
