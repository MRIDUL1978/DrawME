# DrawMe Project Constitution

This file is the single source of truth for DrawMe. If code, comments, issues, or other documentation conflict with this file, this file wins.

## Product

DrawMe is a desktop Chrome and Firefox extension that adds a Goodnotes-style annotation layer to ordinary web pages. The browser action enables or disables DrawMe in the current tab. Drawings use document coordinates and move with scrolling. Hand mode returns all pointer interaction to the host page.

Version one includes pen, pressure-aware ink, highlighter, whole-object eraser, rectangle, ellipse, line, arrow, text, selection and transforms, undo/redo, colors, width and opacity, clear, local per-page persistence, and annotated visible-viewport PNG export. Pen and highlighter each retain their own independent color, thickness, and opacity profile.

DrawMe has no account, cloud sync, telemetry, ads, or permanent access to browsing data. Safari, mobile browsers, semantic DOM anchoring, partial-stroke erasing, full-page capture, collaboration, and PDF export are not version-one features. Browser-internal pages, extension stores, and other protected URLs cannot be annotated.

## Interaction contract

- The browser action is the only activation entry point. It uses temporary `activeTab` access.
- `hand` makes the canvas pointer-transparent. `select`, `pen`, `highlighter`, `eraser`, `shape`, and `text` capture pointer input. Wheel scrolling is never cancelled.
- Holding Space temporarily activates hand mode. Shortcuts are V hand, P pen, H highlighter, E eraser, S select, T text, R shape, Cmd/Ctrl+Z undo, and Cmd/Ctrl+Shift+Z redo.
- The fixed viewport stage stores objects in content coordinates. Its annotation layer is offset by both `window.scrollX/Y` and the active large internal page scroller, so ink follows content on traditional pages and app-style sites such as ChatGPT and Gemini; the toolbar never moves with the document.
- URL changes within an SPA save the old document and load the new one. Full navigations require explicit activation again.
- Coordinates are not bound to DOM nodes. Host-page reflow can move content relative to existing ink.
- Pen and highlighter consume coalesced pointer samples when available, retain tight turns in small handwriting, and render no more than once per animation frame. Live ink must remain visually within one frame of the pointer; smoothing must not introduce intentional trailing.

## Architecture

- TypeScript, React, Vite, Konva, perfect-freehand, Framer Motion, GSAP ScrollTrigger, and webextension-polyfill. Firefox 140 or newer is required so its built-in no-data-collection declaration is enforced.
- `src/background` owns action clicks, injection, IndexedDB, screenshot capture, and first-run onboarding.
- `src/content` owns the closed Shadow DOM, toolbar, fixed Konva stage, annotation reducer, persistence client, URL monitoring, and export composition.
- `src/onboarding` owns the extension-local first-run page. ScrollTrigger must never execute in host pages.
- `src/shared` contains versioned data and runtime-message contracts used by every context.
- `scripts/build.mjs` produces self-contained `dist/chrome` and `dist/firefox` packages. Chrome uses a service worker; Firefox uses a non-persistent background script.

The content bundle must remain idempotent through `window.__DRAWME_CONTROLLER__`. Host styles must not enter the UI and extension styles must not leave its closed Shadow DOM. No remote code is allowed.

The Konva stage owns three persistent layers: committed annotations, a non-interactive live preview, and selection UI. Pointer movement may update only the current live object; it must not rebuild committed nodes, recreate the transformer, notify React, save, or mutate history. Completed freehand paths are cached by immutable annotation object identity. History snapshots structurally share unchanged annotations, and committed annotations must never be mutated in place.

## Data and messaging

`AnnotationDocument` is schema version 1 and contains a SHA-256 URL digest, timestamps, document dimensions, and ordered `Annotation` objects. Annotation types are ink, highlighter, shape, and text. Every object carries a transform. `ToolState` persists separate `penStyle` and `highlighterStyle` profiles alongside the general shape/text style. Unknown future schema versions are rejected without overwriting their records.

The storage key is the SHA-256 digest of normalized `origin + pathname + sorted query`; fragments are excluded and the raw URL is never persisted. IndexedDB database `drawme`, version 1, contains `documents`, `corrupt`, and `preferences` stores. Saves are debounced and flushed on hide, route transition, and page lifecycle events.

Runtime messages are versioned and limited to toggle/status, document load/save/delete, preferences load/save, and visible-tab capture. Every response is either `{ ok: true, data }` or `{ ok: false, error: { code, message } }`.

## Visual system

The deterministic design seed is 263: Editorial Split hero, Geist typography, Infinite Marquee, testimonial-style scenario carousel, Horizontal Accordions, Scrubbing Text Reveals, and Scroll Pinning. The onboarding follows Navigation, Attention, Interest, Desire, and Action.

The hero heading uses a 72rem maximum width and no more than three lines. The feature bento is four columns by three rows with dense flow: `2x2 + 2x1 + 1x1 + 1x1 + 4x1 = 12/12`. Numeric meta-labels, decorative badges, low-contrast buttons, flat generic cards, and horizontal page overflow are prohibited.

All controls require names, tooltips, visible focus, 44px targets where practical, WCAG AA contrast, and reduced-motion behavior. Framer Motion owns onboarding entrances, general hover physics, the marquee, bento reveals, and carousel transitions. GSAP owns the scrubbed word reveal, pinned onboarding chapter, and workflow-card scroll reveals. The use-case accordion retains its original CSS flex expansion. The injected toolbar uses lightweight GSAP only.

## Commands

- `npm install` installs dependencies.
- `npm run dev:onboarding` runs the onboarding page locally.
- `npm run build` creates both browser packages.
- `npm test` runs unit and component tests once.
- `npm run test:watch` runs tests interactively.
- `npm run typecheck` checks TypeScript.
- `npm run lint:firefox` validates the Firefox package after a build.

Load `dist` or `dist/chrome` from `chrome://extensions` with Developer mode and Load unpacked. For Firefox, select `dist/firefox/manifest.json` from `about:debugging#/runtime/this-firefox`; never select the root Chrome manifest. Run `npm run firefox` to launch the Firefox package with web-ext. Run `npm run dev:onboarding` and open `http://localhost:5173/onboarding.html` to view the onboarding webpage outside the extension.

## Release acceptance

- Both packages build without warnings or remote code.
- Repeated action clicks never duplicate the host, stage, listeners, or toolbar.
- Draw, select, transform, erase, text, undo, redo, clear, save, restore, scroll, route change, resize, and export work.
- Hand mode preserves host links, inputs, selection, keyboard behavior, and scrolling.
- ChatGPT, Gemini, a long article, an iframe-heavy page, and an SPA are manually checked at common zoom levels.
- There are no host CSS leaks, horizontal overflow, uncaught errors, silent persistence failures, or inaccessible controls.
- With at least 500 committed strokes, new handwriting remains within one animation frame of the pointer and drawing produces no main-thread task longer than 50ms on a normal desktop test machine.
