import type { Metadata, Viewport } from 'next';
import './globals.css';

// Root layout is intentionally bare. The real <html>/<body> live in
// [locale]/layout.tsx so we can set the correct `lang` and `dir` per locale
// (e.g. `ar` needs `dir="rtl"`). next-intl's middleware will always match a
// [locale] segment in front of this layout, so this file is never rendered
// on its own at runtime.

export const metadata: Metadata = {
  title: {
    default: 'Academy — Learn DevOps, Data, and English',
    template: '%s · Academy',
  },
  description:
    'Hands-on courses in DevOps, Data, and English with spaced repetition, adaptive tests, and real progress tracking.',
  applicationName: 'Academy',
  authors: [{ name: 'Academy' }],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    title: 'Academy',
    description: 'Learn DevOps, Data, and English in one place.',
    siteName: 'Academy',
  },
  appleWebApp: {
    capable: true,
    title: 'Academy',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return children;
}
