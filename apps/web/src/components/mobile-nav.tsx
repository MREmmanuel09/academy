'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from './link';

export interface NavLink {
  href: string;
  label: string;
}

interface SiteNavProps {
  links: NavLink[];
  loginHref: string;
  loginLabel: string;
  menuLabel: string;
  closeLabel: string;
  isLoggedIn: boolean;
}

function isActiveLink(pathname: string, href: string): boolean {
  return pathname === href || pathname.endsWith(href);
}

/**
 * Primary site navigation: inline links on desktop, hamburger panel on
 * mobile. The panel closes on route change and on Escape, and traps no
 * focus (links are natively keyboard-reachable).
 */
export function SiteNav({
  links,
  loginHref,
  loginLabel,
  menuLabel,
  closeLabel,
  isLoggedIn,
}: SiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile panel whenever the route changes (pathname-only
  // trigger is intentional; setOpen is a stable setter).
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional pathname-only trigger
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <nav aria-label="Primary" className="hidden items-center gap-6 text-sm md:flex">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={isActiveLink(pathname, l.href) ? 'page' : undefined}
            className={`rounded-sm transition-colors hover:text-foreground ${
              isActiveLink(pathname, l.href)
                ? 'font-semibold text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? closeLabel : menuLabel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-muted transition-colors hover:bg-accent"
        >
          {open ? (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>

        {open ? (
          <nav
            aria-label="Primary"
            className="absolute inset-x-0 top-16 z-50 animate-fade-in border-b border-border bg-background px-4 pb-4 pt-2 shadow-lg"
          >
            <ul className="space-y-1">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActiveLink(pathname, l.href) ? 'page' : undefined}
                    className={`block rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent ${
                      isActiveLink(pathname, l.href)
                        ? 'bg-accent font-semibold text-foreground'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              {!isLoggedIn ? (
                <li>
                  <Link
                    href={loginHref}
                    className="block rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent"
                  >
                    {loginLabel}
                  </Link>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </div>
    </>
  );
}
