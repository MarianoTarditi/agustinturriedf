# Archive Report: admin-users-module

## Outcome

The `admin-users-module` change was archived on 2026-09-27 after all 39 tracked implementation tasks were complete. The six delta specifications were copied mechanically into the previously absent canonical specification paths before the change folder was moved.

## Artifact Inventory

| Artifact | Final state |
|---|---|
| `proposal.md` | Present in archive |
| `exploration.md` | Present in archive |
| `research.md` | Present in archive |
| `specs/` | Present with six domain specifications |
| `design.md` | Present in archive |
| `tasks.md` | Present; 39/39 tasks complete, 0 unfinished |
| `apply-progress.md` | Present in archive |
| `verify-report.md` | Missing; no separate persisted verification report existed |

## Final Verification State

- Schema tests passed: 6/6.
- Transactional flow tests passed: 2/2.
- Invitation/reset/outbox regression tests passed: 67/67.
- Full web test run: 88/94 files and 470/475 tests passed; the remaining 6 files and 5 tests were confirmed initial-base failures in unchanged routes/tests.
- Prisma validate and diff checks passed.
- Lint was unavailable because `next lint` opened its first-run configuration prompt.
- The inherited reset-password confirm PageProps build failure was not rerun.

No verification certificate is claimed because `verify-report.md` was not persisted.

## Mechanical Evidence

Canonical specs were newly created for: `account-invitations`, `account-lifecycle`, `administration-audit`, `credential-recovery`, `operational-delivery`, and `user-directory`. Each source-to-temporary-copy `diff -r` completed with empty output before replacement.

The archive move used a pre-move recursive snapshot. `git mv` refused the untracked source directory with status 128 (`source directory is empty`); the required unchanged-snapshot check passed, then a native move was performed. The post-move snapshot-to-archive `diff -r` completed with empty output. The active source directory is absent and the archive destination exists.

## Unresolved Findings

- No separate verification report was available.
- Lint remains unrun because of the interactive first-run prompt.
- The inherited reset-password confirm PageProps build failure remains unrerun.
- The full web test run retains 5 confirmed initial-base failures in unchanged routes/tests.
