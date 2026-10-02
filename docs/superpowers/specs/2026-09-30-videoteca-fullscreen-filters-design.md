# Videoteca Fullscreen and Filters Design

## Goal

Extend the videoteca with native fullscreen media viewing and align the root folder controls with the routines module in both appearance and behavior.

## Media Fullscreen

- The existing internal media viewer keeps its current image and video behavior.
- A header control enters fullscreen through the browser Fullscreen API for the entire viewer.
- The control reflects the current state and exits fullscreen when activated again.
- Images and videos remain contained within the available screen without cropping.
- Fullscreen state is synchronized from the browser `fullscreenchange` event, including exits triggered by Escape.
- Unsupported or rejected fullscreen requests surface a toast without closing the viewer.

## Folder Controls

The videoteca root uses the same control composition and visual measurements as routines:

- Search field with leading search icon.
- Labelled Order select with Recent, A-Z, and More files options.
- Labelled Filter select with All, With files, and Without files options.
- Grid/list view toggle with a visible active state.
- The existing New folder action remains available as a separate action in the same responsive control region.

Search matches folder names case-insensitively. Filtering and sorting are applied before pagination. Changing search, filter, sort, or view resets pagination to the first page.

## Folder Views

- Grid view preserves the current card layout.
- List view uses one row per folder while preserving open, context-menu, count, and tag behavior.
- The create-folder card remains available on the first page in either view.
- Empty-result feedback distinguishes an empty library from filters that return no matches.

## Responsive Behavior

Desktop controls follow the routines layout. On narrow screens, controls wrap without horizontal overflow, selects remain usable, and the New folder action occupies available width. List rows collapse cleanly while retaining their actions.

## Verification

- Add focused tests for search, filtering, sorting, and pagination derivation.
- Verify TypeScript and relevant tests without running `next build` while `next dev` is active.
- Confirm the development server remains healthy after edits.
- Manually verify fullscreen entry/exit for an image and video in a browser supporting the Fullscreen API.

## Scope

This change does not add gallery navigation, image zoom, media rotation, saved filter preferences, or new backend endpoints.
