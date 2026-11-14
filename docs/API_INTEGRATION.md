# API Integration

## Base URL

`NEXT_PUBLIC_API_URL` points to the backend API. Requests go to `/api/v1`.

## Client

Central API client in `src/services/api.ts` handles auth headers, error envelopes and response unwrapping.

## Auth

The login feature calls `POST /api/v1/auth/login` through the central client and stores tokens.

## Types

API contracts are generated from OpenAPI or maintained in `src/types/api.ts`.
