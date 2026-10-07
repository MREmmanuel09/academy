import { z } from 'zod';

/**
 * Validation schemas for auth forms. Same shapes used by:
 *   - Server actions (parse formData)
 *   - Client-side react-hook-form (via zodResolver)
 *   - API routes (parse JSON)
 */
export const registerSchema = z.object({
  email: z.string().email('Email inválido').max(254),
  // Public-service policy: length + mixed character classes. NIST-style
  // (no forced symbols/caps), just enough entropy to resist stuffing.
  password: z
    .string()
    .min(10, 'La contraseña debe tener al menos 10 caracteres')
    .max(200, 'Contraseña demasiado larga')
    .regex(/[A-Za-z]/, 'La contraseña debe incluir al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe incluir al menos un número'),
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
  preferredLocale: z.enum(['es', 'en']).default('es'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

export const onboardingSchema = z.object({
  preferredLocale: z.enum(['es', 'en']),
  timezone: z.string().min(1).max(100),
  goals: z.array(z.enum(['devops', 'data', 'english'])).min(1, 'Selecciona al menos un objetivo'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
