# Add Accessible Sorting to the Users Table

**Status:** Approved design  
**Date:** 2026-09-28  
**Scope:** Client-side sorting for `agustinturriedf/web/app/(private)/usuarios/page.tsx`

## Decision

Make **Usuario**, **Email**, **Roles**, and **Estado** sortable from their table headers. Each header contains a native button: the first activation sorts ascending and later activations of the same header toggle direction. **Foto** and **Acciones** remain static. Sorting applies to the complete client-side user collection before the existing four-row pagination slice, and every sort change returns pagination to page 1. Remove the inert **Ordenar vista** toolbar button.

This is a presentation-layer change. It does not alter the API, `UserRow`, server queries, metrics, mutations, or persisted data.

## Architecture and state

Keep sorting local to `UsuariosPage` because the page already owns the complete `UserRow[]` and client pagination. Add a narrow sort model:

```ts
type SortKey = "name" | "email" | "role" | "status";
type SortDirection = "ascending" | "descending";
type SortState = { key: SortKey; direction: SortDirection } | null;
```

`null` preserves the API order until a sortable header is first activated. The interaction handler selects a new key in ascending order, toggles the active key, and sets `currentPage` to `1` in the same event.

Use one reusable `Intl.Collator("es-AR", { sensitivity: "base", numeric: true })` for user-facing text. Map sort keys to the displayed row values: `name`, `email`, `role`, and `status`. Sort a copy (`[...users]`) rather than mutating React state. Break equal comparisons by original list position so equal values retain the API order.

## Data flow

1. `fetchUsersRuntime` continues to load and map the complete user list into `users`.
2. Metrics and total counts continue to derive from unsorted `users`; sorting must not affect their values.
3. Derive `sortedUsers` from `users` and `sortState`. With no active sort, use the existing order.
4. Derive `totalPages` and `safeCurrentPage` as today.
5. Slice `sortedUsers`, not `users`, to produce `paginatedUsers`.
6. Render the current page. Creating, archiving, or refetching users naturally recomputes the sorted view without duplicating data in state.

The required sequence is therefore `users -> sortedUsers -> paginatedUsers`. Sorting an already paginated slice is explicitly incorrect because it would reorder only the visible four rows.

## Header interaction and accessibility

- Keep semantic `<th>` elements and place a `type="button"` control inside each sortable header. The entire label-and-icon control is keyboard operable with native Enter and Space behavior.
- Set `aria-sort="ascending"` or `aria-sort="descending"` on the active sortable `<th>` and `aria-sort="none"` on inactive sortable headers. Static headers do not receive `aria-sort` or buttons.
- Keep the visible Spanish column labels and expose the next action through a concise Spanish accessible name, for example, `Ordenar Usuario ascendente` initially and `Ordenar Usuario descendente` while ascending.
- Render a direction icon beside each sortable label: neutral when inactive, upward when ascending, and downward when descending. Mark the icon `aria-hidden="true"`; `aria-sort` and the button name carry the semantics.
- Preserve a strong `:focus-visible` outline with sufficient offset. Direction must not be conveyed by color alone.

## Styling

Extend `usuarios.module.css` with a header-button style that resets native button chrome while inheriting the existing uppercase header typography and muted color. Use inline-flex alignment and a small fixed gap so labels and icons remain stable. Add hover, active, and focus-visible states consistent with the current purple theme, and increase contrast for the active column without changing table geometry.

Delete the obsolete `.sortButton` rules and remove it from combined selectors after removing the toolbar control. Keep `.tableActions` and the **Crear alumno** button unchanged. The header buttons must remain compact and must not introduce horizontal overflow beyond the table's current behavior.

## Edge cases

- An empty, loading, or error table keeps its existing single-row state; sort controls may remain present but never alter those messages.
- Accents, case differences, and embedded numbers compare through the `es-AR` collator rather than code-point order.
- Equal values remain in API order, preventing rows from jumping unpredictably.
- Changing columns always starts ascending; only activating the current column toggles descending.
- Sorting from any later page resets immediately to page 1. Existing page clamping still handles list shrinkage after archival.
- Rapid activations use a functional sort-state update so direction changes are based on the latest state.

## Planned file map

Every path below is planned; this design task changes none of them.

| Planned path | Planned change |
| --- | --- |
| `agustinturriedf/web/app/(private)/usuarios/page.tsx` | Add sort types/state, locale-aware derivation, pagination reset, sortable header buttons, and remove **Ordenar vista**. |
| `agustinturriedf/web/app/(private)/usuarios/usuarios.module.css` | Style sortable headers and remove obsolete toolbar sort-button rules. |
| `agustinturriedf/web/app/(private)/usuarios/page.test.tsx` | Add focused interaction, ordering, pagination, and accessibility coverage. |

## Verification

Automated tests should render at least five users so ordering across page boundaries is observable, then verify:

- each supported header sorts the full list ascending on first activation and descending on second activation;
- switching to another column starts ascending and returns the view to page 1;
- accented/case-varied names follow `es-AR` comparison and equal values preserve source order;
- the active header exposes the matching `aria-sort`, inactive sortable headers expose `none`, and Foto/Acciones are not buttons;
- **Ordenar vista** is absent and existing loading, error, empty, pagination, create, and archive behavior remains intact.

Run from `agustinturriedf/web`:

```bash
npm test -- "app/(private)/usuarios/page.test.tsx" "app/(private)/usuarios/archive-ui.test.tsx"
npm run build
```

Manually verify pointer and keyboard operation, visible focus, direction indicators at desktop and narrow widths, and that a sort selected on page 2 displays page 1 of the newly sorted full list.

## Acceptance criteria

- [ ] Usuario, Email, Roles, and Estado sort ascending on first activation and toggle descending thereafter.
- [ ] Foto and Acciones remain non-interactive headers.
- [ ] Sorting uses Spanish/Argentina-aware comparison across the full client-side list before pagination.
- [ ] Every sort change resets pagination to page 1.
- [ ] Direction is visible and accurately represented by `aria-sort`.
- [ ] Header buttons are keyboard operable and have visible focus.
- [ ] The inert Ordenar vista toolbar button and its obsolete styles are removed.
- [ ] Existing loading, error, empty, metrics, pagination, creation, and archival behavior is preserved.
