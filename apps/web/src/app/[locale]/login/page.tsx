import { auth } from '@/auth';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { LoginForm } from './login-form';

interface LoginPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  const { next, error } = await searchParams;
  setRequestLocale(locale);

  // If already signed in, send the user to the dashboard.
  const session = await auth();
  if (session?.user) {
    redirect(next ?? '/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Accede a tu cuenta de Academy para continuar tu progreso.
        </p>
        <LoginForm initialError={error} />
      </div>
    </div>
  );
}
