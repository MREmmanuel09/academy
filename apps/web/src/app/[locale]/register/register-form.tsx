'use client';

import { registerAction } from '@/app/actions/auth';
import { Link } from '@/components/link';
import { Button, Card, CardContent, Input, Label } from '@academy/ui';
import { useState, useTransition } from 'react';

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setError(null);
        setFieldErrors({});
        startTransition(async () => {
          const result = await registerAction(fd);
          if (!result.ok) {
            setError(result.error);
            if (result.fieldErrors) setFieldErrors(result.fieldErrors);
          }
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required maxLength={100} />
        {fieldErrors.name?.map((m) => (
          <p key={m} className="text-xs text-destructive">
            {m}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@email.com"
        />
        {fieldErrors.email?.map((m) => (
          <p key={m} className="text-xs text-destructive">
            {m}
          </p>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
        />
        <p className="text-xs text-muted-foreground">
          Mínimo 10 caracteres, con al menos una letra y un número.
        </p>
        {fieldErrors.password?.map((m) => (
          <p key={m} className="text-xs text-destructive">
            {m}
          </p>
        ))}
      </div>
      <input type="hidden" name="preferredLocale" value="es" />
      {error ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Creando…' : 'Crear cuenta'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium text-primary underline">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
