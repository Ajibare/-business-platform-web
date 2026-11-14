# Frontend Architecture

## Stack

Next.js, React, TypeScript, Tailwind CSS, React Hook Form, Zod, TanStack Query.

## Layers

- `app` routes
- `components` ui, shared, layouts
- `features` product-specific feature modules
- `services` central API client
- `lib`, `hooks`, `types`, `styles`

## Product boundaries

Each product owns its experience. Shared components are reused only where appropriate.
