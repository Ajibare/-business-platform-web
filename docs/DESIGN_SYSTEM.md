# Design System

## Tokens

The design system uses Tailwind CSS based tokens for colour, typography, spacing, radius, and elevation.

- Primary: `#0B6E80`, with soft and hover states.
- Status colours: success, warning, danger, info, discrepancy, neutral.
- Neutral scale: ink, slate, border, background, surface.

## Components

UI primitives live under `src/components/ui`.

Current primitives:

- `Button`: primary, secondary, outline, ghost, destructive; sizes sm, md, lg.
- `Card`: bordered surface with card shadow.
- `Input`: bordered text input.
- `Badge`: default and status variants.

## Usage

Product-specific components stay separate from shared UI primitives.
