# Videoteca Media Viewer Design

## Goal

Allow authenticated users to open images and videos without leaving the current videoteca folder.

## Interaction

- Clicking a file's media surface opens an in-page modal viewer.
- Selection and overflow-menu controls keep their current behavior and do not open the viewer.
- The file context menu includes an Open action.
- The viewer closes from its close button, the backdrop, or the Escape key.
- Opening or closing the viewer does not change file selection, search, sorting, or folder state.

## Viewer

- The modal uses the existing protected `viewUrl` for the selected file.
- Images are displayed at their natural aspect ratio within the available viewport using `object-fit: contain`.
- Videos use native browser controls, inline playback, and no autoplay.
- The modal exposes a labelled dialog and a keyboard-focusable close control.
- The layout remains usable on desktop and mobile, with the media constrained to the viewport.

## Streaming

The file-view endpoint will support single HTTP byte ranges for video seeking and efficient playback. Valid range requests return `206 Partial Content` with `Content-Range`, `Content-Length`, and `Accept-Ranges`. Invalid or unsatisfiable ranges return `416`. Requests without a range continue returning the complete file.

## Error Handling

Native image and video load failures are surfaced as a toast while the viewer remains closable. Authorization and missing-file behavior remain owned by the existing API route.

## Verification

- Test range parsing and response headers at the route/helper level.
- Run the relevant Vitest suite and TypeScript/build verification available in the web package.
- Manually verify that cards open both media types and that selection/menu controls do not trigger the viewer.

## Scope

This change does not add gallery navigation, zoom, autoplay, editing, download changes, or persistent viewer URLs.
