# API Integration

## Base URL

`NEXT_PUBLIC_API_URL` points to the backend API. Requests go to `/api/v1`.

## Client

Central API client in `src/services/api.ts`.

- Attaches `Authorization: Bearer <accessToken>` from `localStorage` on every request that is not `anonymous`.
- On a `401`, renews the access token once through `POST /api/v1/auth/refresh` and retries the request. Concurrent failures share a single refresh call, because the API treats a second use of the same refresh token as a stolen cookie and ends every session.
- Unwraps `{ data: T }` success envelopes.
- Throws `ApiError` carrying the backend `code`, `statusCode`, `field`, `details` and `retryAfterSeconds`, so a form can put a message on the right input and can show a wait.
- Fires `psi:session-expired` when the session cannot be renewed; `useAuth` listens and clears its state.

## Auth

`src/services/auth.ts` groups the calls: `authApi`, `invitationApi`, `onboardingApi`. The access token lives in `localStorage` (`accessToken`); the refresh token is an HttpOnly cookie the client never sees. The cached profile lives under `authProfile` so the shell can render before `/auth/me` answers.

The flow and the error codes are documented in the API repository:
`docs/AUTH_API_CONTRACTS.md`, `docs/SESSION_AND_SECURITY.md` and
`docs/AUTHENTICATION_ARCHITECTURE.md`. UI routes and components:
`docs/AUTH_UI.md` in this repository.

## Pharmacy endpoints

- `GET /api/v1/pharmacy/reports/dashboard` - TanStack Query key `['pharmacy', 'dashboard']`.
- `GET /api/v1/pharmacy/medicines` - medicine catalogue list.

## Types

No OpenAPI document is published. `src/types/api.ts` holds the product module
contracts and `src/types/auth.ts` mirrors the auth contracts by hand; when a shape
changes in the API, both are updated together.
