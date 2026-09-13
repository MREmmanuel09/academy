import { auth } from '@/auth';
import { setRequestLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { RegisterForm } from './register-form';

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Empieza a aprender hoy. Tu progreso se guarda en una base de datos real.
        </p>
        <RegisterForm />
      </div>
    </div>
  );
}
