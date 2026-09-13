'use client';

import { useLocale } from 'next-intl';
import NextLink, { type LinkProps as NextLinkProps } from 'next/link';
import type * as React from 'react';

type Props = Omit<NextLinkProps, 'locale'> & {
  children?: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  'aria-label'?: string;
  id?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Wrapper around next/link that prefixes the current locale to the href.
 * - Internal paths (`/courses`, `/about`) → `/<locale>/courses`
 * - Absolute URLs (`https://...`, `mailto:...`) → passed through untouched.
 */
export function Link({ href, children, className, ...rest }: Props) {
  const locale = useLocale();
  let localizedHref: NextLinkProps['href'];
  if (typeof href === 'string') {
    localizedHref = ABSOLUTE_URL.test(href)
      ? href
      : `/${locale}${href.startsWith('/') ? href : `/${href}`}`;
  } else {
    const pathname = href.pathname ?? '';
    localizedHref = ABSOLUTE_URL.test(pathname)
      ? href
      : { ...href, pathname: `/${locale}${pathname}` };
  }
  return (
    <NextLink href={localizedHref} className={className} {...rest}>
      {children}
    </NextLink>
  );
}
