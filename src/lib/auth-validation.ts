import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 10;

/**
 * Same rule the API applies: `0803…`, `803…`, `+234803…` and `234803…`. The two
 * alternatives keep the national part identical, so a nine-digit body can never
 * be accepted with a doubled prefix.
 */
const NIGERIAN_MOBILE_PATTERN = /^(?:(?:\+?234|0)([789][01]\d{8})|([789][01]\d{8}))$/;

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'passw0rd',
  '12345678',
  '123456789',
  '1234567890',
  'qwertyuiop',
  'qwerty123',
  'letmein123',
  'iloveyou1',
  'admin12345',
  'pharmacy123',
  'pharmacy2024',
  'welcome123',
]);

export const TIME_ZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Abidjan',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Europe/London',
  'UTC',
] as const;

export function normalizePhone(input: string): string | null {
  const cleaned = input.replace(/[\s()-]/g, '');
  if (!cleaned) return null;
  const match = cleaned.match(NIGERIAN_MOBILE_PATTERN);
  if (!match) return null;
  const nationalNumber = match[1] ?? match[2];
  if (!nationalNumber) return null;
  return `+234${nationalNumber}`;
}

export function isValidNigerianPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}

export interface PasswordAssessment {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  issues: string[];
  suggestions: string[];
}

const PASSWORD_LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];

/**
 * Mirrors `assessPassword` in the API. A password the form calls "strong" must
 * never be rejected by the server, so the rules live in one place per repo and
 * are kept identical by the tests.
 */
export function assessPassword(
  password: string,
  context: { email?: string | null; name?: string | null } = {},
): PasswordAssessment {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    issues.push(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
  }
  if (!/[a-z]/.test(password)) issues.push('Include a lowercase letter.');
  if (!/[A-Z]/.test(password)) issues.push('Include an uppercase letter.');
  if (!/\d/.test(password)) issues.push('Include a number.');

  const lowered = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lowered)) {
    issues.push('This password is too common. Choose something unique.');
  }

  const personalTokens = [context.email?.split('@')[0] ?? '', ...(context.name ?? '').split(/\s+/)]
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length >= 3);
  if (personalTokens.some((token) => lowered.includes(token))) {
    issues.push('Do not use your name or email address in the password.');
  }

  // Suggestions are only worth showing when they ask for something missing:
  // telling someone who already used a symbol to "add a symbol" reads like a bug.
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  if (!hasSymbol) suggestions.push('Add a symbol for extra strength.');
  else if (password.length < 14) suggestions.push('A longer password is even harder to guess.');

  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;

  let score = 0;
  if (password.length >= PASSWORD_MIN_LENGTH) score += 1;
  if (variety >= 3) score += 1;
  if (password.length >= 14) score += 1;
  if (variety === 4 && password.length >= 12) score += 1;
  if (issues.length > 0) score = Math.min(score, 1);

  const bounded = Math.min(4, Math.max(0, score)) as PasswordAssessment['score'];
  return {
    valid: issues.length === 0,
    score: bounded,
    label: PASSWORD_LABELS[bounded],
    issues,
    suggestions,
  };
}

const identifier = z
  .string()
  .trim()
  .min(1, 'Enter your email address or phone number.')
  .refine(
    (value) => (value.includes('@') ? isValidEmail(value) : isValidNigerianPhone(value)),
    'Enter a valid email address or Nigerian mobile number, for example 0803 123 4567.',
  );

const email = z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.');

const optionalPhone = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || isValidNigerianPhone(value),
    'Enter a Nigerian mobile number, for example 0803 123 4567.',
  );

export const signInSchema = z.object({
  identifier,
  password: z.string().min(1, 'Enter your password.'),
});

export type SignInValues = z.infer<typeof signInSchema>;

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Enter your full name.')
      .max(120, 'Use 120 characters or fewer.'),
    email,
    phone: optionalPhone,
    password: z.string().min(1, 'Choose a password.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    termsAccepted: z
      .boolean()
      .refine((value) => value, 'Accept the terms of service and privacy policy to continue.'),
  })
  .superRefine((values, ctx) => {
    const assessment = assessPassword(values.password, { email: values.email, name: values.name });
    if (!assessment.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: assessment.issues[0],
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'The two passwords do not match.',
      });
    }
  });

export type RegisterValues = z.infer<typeof registerSchema>;

export const verificationCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the six-digit code from your email.'),
});

export const forgotPasswordSchema = z.object({ identifier });

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(1, 'Choose a new password.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .superRefine((values, ctx) => {
    const assessment = assessPassword(values.password);
    if (!assessment.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: assessment.issues[0],
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'The two passwords do not match.',
      });
    }
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const invitationAcceptSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name.').max(120, 'Use 120 characters or fewer.'),
    password: z.string().min(1, 'Choose a password.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .superRefine((values, ctx) => {
    const assessment = assessPassword(values.password, { name: values.name });
    if (!assessment.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: assessment.issues[0],
      });
    }
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'The two passwords do not match.',
      });
    }
  });

export type InvitationAcceptValues = z.infer<typeof invitationAcceptSchema>;

export const pharmacyProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter the pharmacy or business name.')
    .max(120, 'Use 120 characters or fewer.'),
  outletProfile: z.string().min(1, 'Choose the outlet type that describes this pharmacy.'),
  address: z.string().trim().max(200, 'Use 200 characters or fewer.').optional(),
  timezone: z.string().min(1, 'Choose a time zone.'),
});

export type PharmacyProfileValues = z.infer<typeof pharmacyProfileSchema>;

export const stockSettingsSchema = z.object({
  nearExpiryWarningDays: z.coerce
    .number({ invalid_type_error: 'Enter the number of days.' })
    .int('Use a whole number of days.')
    .min(1, 'Use at least 1 day.')
    .max(365, 'Use 365 days or fewer.'),
  defaultUnit: z.string().trim().max(24, 'Use 24 characters or fewer.').optional(),
});

/** `''` is "not configured" and is sent as `null`; it is never coerced to zero. */
export function parseOptionalMinimum(raw: string): number | null | 'invalid' {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) return 'invalid';
  return value;
}

export type StockSettingsValues = z.infer<typeof stockSettingsSchema>;

export const staffInviteSchema = z.object({
  email: z.string().trim().min(1, 'Enter an email address.').email('Enter a valid email address.'),
  role: z.enum(['MANAGER', 'INVENTORY_STAFF', 'READ_ONLY']),
});

export type StaffInviteValues = z.infer<typeof staffInviteSchema>;
