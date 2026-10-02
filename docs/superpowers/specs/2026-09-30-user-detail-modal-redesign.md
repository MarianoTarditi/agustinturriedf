# Improve the User Detail Modal

**Status:** Approved design  
**Date:** 2026-09-30  
**Scope:** Visual hierarchy and responsive layout of the user detail modal in `agustinturriedf/web/app/(private)/usuarios/page.tsx`

## Decision

Redesign the existing detail modal as a wider, polished profile summary while preserving the application's dark visual language. Increase readability through stronger typography, clearer spacing, balanced information cards, and explicit empty states.

This change affects only the detail modal. Creation, editing, archival, API contracts, and persisted user data remain unchanged.

## Layout

Use a maximum width near `60rem`, constrained by the viewport. Organize the modal into four clear regions:

1. Header with title, supporting description, and close control.
2. Profile hero with a larger avatar, full name, role, and account status.
3. Two-column information area for personal data and physical metrics.
4. Footer with separated audit dates and primary/secondary actions.

The modal must remain vertically scrollable on short screens. Below the tablet breakpoint, information sections and footer actions stack into one column without horizontal overflow.

## Typography and Data

Increase labels to a legible supporting size and render values at normal body size with stronger contrast. Section headings remain uppercase but use less compressed tracking. The profile name remains the strongest text element after the modal title.

Render absent phone, student status, gender, birth date, height, and weight as `Sin registrar`. Units appear only when the underlying value exists. Email and other long values must wrap safely.

## Visual Treatment

- Preserve the existing charcoal surfaces and violet accent.
- Increase avatar size and soften its glow.
- Give personal fields individual visual cells instead of one compressed card.
- Keep physical metrics as distinct cards with larger values.
- Use subtle borders and surface variation rather than decorative gradients throughout.
- Increase button height and hit area while retaining existing button semantics.

## Planned Files

| Path | Change |
| --- | --- |
| `agustinturriedf/web/app/(private)/usuarios/page.tsx` | Improve semantic grouping, empty-value rendering, and footer date structure. |
| `agustinturriedf/web/app/(private)/usuarios/usuarios.module.css` | Redesign modal dimensions, typography, cards, spacing, footer, and responsive behavior. |
| `agustinturriedf/web/app/(private)/usuarios/page.test.tsx` | Cover detail values and explicit empty states. |

## Verification

Run from `agustinturriedf/web`:

```bash
npm test -- "app/(private)/usuarios/page.test.tsx" "app/(private)/usuarios/archive-ui.test.tsx"
```

Manually verify the modal at desktop, tablet, and mobile widths, including long names/emails, missing profile fields, keyboard focus, Escape dismissal, and both footer actions.

## Acceptance Criteria

- [ ] The modal is moderately larger and remains viewport constrained.
- [ ] Labels and values are clearly readable without appearing oversized.
- [ ] Personal and physical information have balanced visual hierarchy.
- [ ] Missing values display `Sin registrar`; empty units never appear.
- [ ] Long values wrap without breaking the layout.
- [ ] Footer metadata and actions remain readable and keyboard accessible.
- [ ] Mobile layout uses one column and avoids horizontal scrolling.
- [ ] Other user modals and existing behaviors remain unchanged.
