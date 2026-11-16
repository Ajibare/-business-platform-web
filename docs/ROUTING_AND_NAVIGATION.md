# Routing and Navigation

## Route groups

- `(auth)` - registration, sign-in and account recovery. Public.
- `(platform)` - authenticated platform shell and dashboard.
- `products/pharmacy` - product screens. Protected by `products/layout.tsx`.

Route groups do not appear in the URL.

## What is public

| Route | Access |
| --- | --- |
| `/sign-up`, `/sign-in`, `/verify-contact` | Anyone |
| `/forgot-password`, `/reset-password` | Anyone |
| `/invite/<token>` | Anyone with the token; the page shows the workspace and role |
| `/` | Redirects: `/sign-up` without a session, `/dashboard` with one |
| Everything else | Requires a session |

`src/middleware.ts` applies this table before the first byte of a page is sent,
using the `psi_session` hint cookie; `AuthGuard` makes the real decision once the
API has answered. Details, including why the hint is not a credential, are in
`AUTH_UI.md`.

## Navigation

Product-specific navigation is owned by the product layout. Shared navigation lives in the platform layout.

The sidebar and the mobile bar both call `/dashboard` "Dashboard" and link the
product screens under `/products/pharmacy/*`. Those screens sit outside
`(platform)`, so they render `AuthGuard` without `AppShell` and arrive without
the sidebar.
