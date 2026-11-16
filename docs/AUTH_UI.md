# Auth UI

Routes, components and behaviour for sign-in, sign-up, password recovery,
invitation acceptance and the pharmacy setup wizard. The API side is documented in
the `business-platform-api` repository (`docs/AUTH_*.md`,
`docs/PHARMACY_ONBOARDING.md`).

## Routes

| Route | File | Notes |
| --- | --- | --- |
| `/sign-in` | `src/app/(auth)/sign-in/page.tsx` | Wrapped in `Suspense` because the form reads `?next=` |
| `/sign-up` | `src/app/(auth)/sign-up/page.tsx` | Two steps on one page |
| `/forgot-password` | `src/app/(auth)/forgot-password/page.tsx` | |
| `/reset-password?token=…` | `src/app/(auth)/reset-password/page.tsx` | Server component reads `searchParams`, then renders the form |
| `/invite/[token]` | `src/app/(auth)/invite/[token]/page.tsx` | Public: shows the workspace and role before sign-in |
| `/onboarding/pharmacy-setup` | `src/app/onboarding/pharmacy-setup/page.tsx` | Under the onboarding layout, which allows an unfinished setup |
| `/login` | `src/app/(auth)/login/page.tsx` | Redirects to `/sign-in` |
| `/dashboard` | `src/app/(platform)/dashboard/page.tsx` | Shows the setup checklist while tasks remain |

All `(auth)` routes share `AuthLayout`: a brand panel and a form column, stacked on
small screens. Every page sets `robots: { index: false }` except the public
invitation preview, which lives behind the same layout.

## Components

Under `src/components/auth/`:

| Component | Responsibility |
| --- | --- |
| `AuthCard` | Heading, description, form container, footer slot |
| `AuthInput` | Labelled 48px input, optional hint, error, trailing slot, `labelAction` |
| `PasswordInput` | `AuthInput` plus a real show/hide button (`aria-pressed`, labelled) |
| `PasswordStrengthIndicator` | Score bar, label, first unmet rule, suggestion when complete |
| `VerificationCodeInput` | Six boxes over one digit string: auto-advance, paste anywhere, backspace, arrows, `inputMode="numeric"` |
| `AuthSubmitButton` | Full-width primary; disabled with a spinner and `aria-busy` while submitting |
| `AuthErrorMessage` / `AuthSuccessMessage` / `AuthInfoMessage` | `role="alert"` / `role="status"` / neutral note |

Under `src/components/onboarding/`: `OnboardingLayout` (progress + panel),
`OnboardingProgress` (step dots and labels), `OnboardingStep` (title, description,
footer actions), `SelectField` (native select with a visible label).

Forms live in `src/features/auth/` and `src/features/onboarding/`. They hold the
state machine, call the API and map errors; the components above stay dumb.

## Validation

`src/lib/auth-validation.ts` mirrors the API rules:

- `NIGERIAN_MOBILE_PATTERN` and `normalizePhone` — identical to `auth.utils.ts` in
  the API, so a number the form accepts is a number the server accepts.
- `assessPassword` — same length, character-class, denylist and
  name/email-token rules, so the strength indicator can never say "strong" about a
  password the server rejects.
- Zod schemas: `signInSchema`, `registerSchema`, `verificationCodeSchema`,
  `forgotPasswordSchema`, `resetPasswordSchema`, `invitationAcceptSchema`,
  `pharmacyProfileSchema`, `stockSettingsSchema`, `staffInviteSchema`.
- `parseOptionalMinimum` — `''` means "not configured" and is sent as `null`;
  `'0'` is a real value.

If a rule changes, change both repositories and their tests together.

## Token handling

- `useAuth()` owns the client session: the access token, the cached profile, and
  the `isLoading` flag.
- The refresh token is an HttpOnly cookie; JavaScript never reads it.
- `renewAccessToken()` in `src/services/api.ts` is single-flight, and `apiFetch`
  retries a `401` once. Pages that fire several queries therefore share one
  refresh instead of rotating the cookie repeatedly.
- `psi:session-expired` clears the state and the guard redirects to
  `/sign-in?next=<path>`; `psi:profile-updated` keeps the shell and the checklist
  in step after a profile refresh.
- Signing out calls the API, clears storage and lands on `/sign-in`.

## Guard behaviour

`AuthGuard` in `src/components/guards/auth-guard.tsx`:

| State | Result |
| --- | --- |
| `isLoading` | Skeletons; children are not rendered |
| No access token | `router.replace('/sign-in?next=<encoded pathname>')`, nothing rendered |
| Owner with `onboarding.requiresSetup` | `router.replace('/onboarding/pharmacy-setup')` |
| Non-Owner with `requiresSetup` | Renders children (staff go to the dashboard) |
| Otherwise | Renders children |

The onboarding layout passes `requireOnboardingComplete={false}` so the wizard
itself is reachable while setup is unfinished.

`useAuth` hydrates from `localStorage` and only attempts a silent renewal when a
cached profile exists, so a first-time visitor sees the sign-in page immediately.

## Error mapping

| API signal | What the form does |
| --- | --- |
| `field: 'identifier' \| 'password'` | `setError` on that field, message under the input |
| `EMAIL_IN_USE`, `PHONE_IN_USE` | Message under the field, link to sign in |
| `WEAK_PASSWORD` | First rule under the password; `details.issues` in the strength list |
| `INVALID_CODE` | "…4 attempts left" from `details.attemptsRemaining` |
| `VERIFICATION_JUST_SENT`, `RATE_LIMITED`, `ACCOUNT_LOCKED`, `TOO_MANY_RESENDS` | Form-level message, using `retryAfterSeconds` for the countdown |
| `ACCOUNT_DEACTIVATED`, `NO_WORKSPACE` | Form-level message with the API wording |
| Anything that is not an `ApiError` | "We could not reach the server. Check your connection and try again." |

Errors never say whether an identifier exists.

## Accessibility and layout rules

- Every input is at least 48px tall and has a permanently visible label.
- Focus rings are visible and use `primary-600`; nothing relies on colour alone.
- Errors are announced (`role="alert"`); the strength indicator is `aria-live="polite"`.
- The code field exposes `aria-label="Digit N of 6"`, a label, and `aria-invalid`.
- Forms are `noValidate`: validation is Zod's, so the messages match the API's.
- Buttons disable while submitting; no screen has a dead button or an unimplemented
  action.

## Adding a step or a field

1. Add the schema in `src/lib/auth-validation.ts` (and the matching DTO in the API).
2. Add the input with `AuthInput`/`PasswordInput` so the styling and the error
   wiring stay consistent.
3. Map a new error code in the form's `catch`, defaulting to the form-level
   message.
4. Add a test in `src/lib/auth-validation.test.ts` or beside the component.
5. Update `docs/AUTH_API_CONTRACTS.md` in the API repository if the request shape
   changed.
