# Add Search to the Users Table

**Status:** Approved design  
**Date:** 2026-09-30  
**Scope:** Client-side search for `agustinturriedf/web/app/(private)/usuarios/page.tsx`

## Decision

Add a search field directly below the current user count. The previously removed `Lista actualizada` status remains hidden. Search filters the complete client-side user collection by displayed name or email, without distinguishing case or accents.

This is a presentation-layer change. It does not alter the users API, metrics, mutations, persisted data, or the `UserRow` contract.

## Behavior

1. The user enters text in a controlled search field.
2. Normalize the trimmed query and each candidate with locale-aware lowercase and accent removal.
3. Keep users whose `name` or `email` contains the query.
4. Apply the existing sort to the filtered collection.
5. Paginate the sorted results with the existing four-row page size.

The required sequence is `users -> filteredUsers -> sortedUsers -> paginatedUsers`. Metrics and the “usuarios totales” count continue to describe the full loaded collection.

Changing the search query returns pagination to page 1. An empty query restores all users. When a non-empty query has no matches, the table displays `No se encontraron usuarios.`

## Interface

Place the search field below the user count inside the left side of the table toolbar. Use a visible search icon, the placeholder `Buscar por nombre o email`, and an accessible label. Show a clear button only while the query has content.

Keep the existing “Crear alumno” action aligned on the right. At narrow widths, the toolbar may stack while the search field uses the available width. Reuse the module's current colors, borders, focus treatment, and typography.

## Planned Files

| Path | Change |
| --- | --- |
| `agustinturriedf/web/app/(private)/usuarios/page.tsx` | Add search state, filtering, pagination reset, empty-result handling, and search controls. |
| `agustinturriedf/web/app/(private)/usuarios/usuarios.module.css` | Style the responsive search field and clear control. |
| `agustinturriedf/web/app/(private)/usuarios/page.test.tsx` | Cover name/email matching, excluded fields, clearing, no results, and pagination reset. |

## Verification

Run from `agustinturriedf/web`:

```bash
npm test -- "app/(private)/usuarios/page.test.tsx" "app/(private)/usuarios/archive-ui.test.tsx"
npm run build
```

## Acceptance Criteria

- [ ] The search field appears below the count and update status.
- [ ] Search matches partial names and emails regardless of case or accents.
- [ ] Role and status values do not produce matches.
- [ ] Filtering occurs before sorting and pagination.
- [ ] Changing or clearing the query returns the list to page 1.
- [ ] A non-empty query with no matches displays a specific empty-result message.
- [ ] The field and clear button are keyboard accessible with visible focus.
- [ ] The toolbar remains usable on desktop and narrow screens.
- [ ] Existing metrics, sorting, creation, archival, loading, error, and empty-list behavior remain intact.
