# API Integration

## Base URL

`NEXT_PUBLIC_API_URL` points to the backend API. Requests go to `/api/v1`.

## Client

Central API client in `src/services/api.ts` handles auth headers, error envelopes and response unwrapping.

- Attaches `Authorization: Bearer <accessToken>` from `localStorage` on every request.
- Unwraps `{ data: T }` success envelopes.
- Throws `ApiError` carrying the backend `code` and HTTP `statusCode`.

## Auth

The login feature calls `POST /api/v1/auth/login` through the central client and stores tokens.

## Pharmacy endpoints

- `GET /api/v1/pharmacy/reports/dashboard` - TanStack Query key `['pharmacy', 'dashboard']`.
- `GET /api/v1/pharmacy/medicines` - medicine catalogue list.

## Types

API contracts are generated from OpenAPI or maintained in `src/types/api.ts`.
