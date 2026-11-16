# business-platform-web

Frontend for the multi-product SaaS platform. Pharmacy Stock Intelligence is the first product module.

## Stack

Next.js, React, TypeScript, Tailwind CSS, React Hook Form, Zod, TanStack Query.

## Getting started

- Copy `.env.example` to `.env`.
- Run `npm run dev`.

## Routes

- `/` redirects to `/sign-up` or `/dashboard`; see `docs/ROUTING_AND_NAVIGATION.md`
- `(auth)/sign-up`, `sign-in`, `verify-contact`, `forgot-password`, `reset-password`, `invite/[token]`
- `(platform)/dashboard`
- `onboarding/pharmacy-setup`
- `products/pharmacy`

## Testing

- `npm test`

## Deployment

Docker and Vercel are supported. See `docs/FRONTEND_SETUP.md`.
