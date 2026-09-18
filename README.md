# DrawMe

DrawMe is a local-first Chrome and Firefox extension that adds a Goodnotes-style annotation layer to ordinary web pages. Click the toolbar icon to turn it on for the current tab, draw with document-anchored ink that scrolls with the page, and switch to hand mode to hand control straight back to the host page.


## Contents

- [Features](#features)
- [Privacy](#privacy)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Load in Chrome or Edge](#load-in-chrome-or-edge)
- [Load temporarily in Firefox](#load-temporarily-in-firefox)
- [Onboarding webpage](#onboarding-webpage)
- [Development scripts](#development-scripts)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [License](#license)

## Features

Version one covers:

- Pen (pressure-aware ink) and highlighter — each with its own independent color, thickness, and opacity
- Whole-object eraser
- Shapes: rectangle, ellipse, line, arrow
- Text
- Selection and transforms, undo/redo
- Adjustable color, width, and opacity; clear canvas
- Local, per-page persistence — annotations reload automatically when you revisit a page
- Annotated PNG export of the visible viewport

Not in v1 (see [AGENTS.md](./AGENTS.md) for the full contract): Safari or mobile browsers, semantic DOM anchoring, partial-stroke erasing, full-page capture, collaboration, and PDF export. Browser-internal pages, extension stores, and other protected URLs can't be annotated.

## Privacy

DrawMe has no account, cloud sync, telemetry, or ads, and no permanent access to your browsing data. It only requests temporary `activeTab` access, and only when you click the toolbar icon.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `V` | Hand mode |
| `P` | Pen |
| `H` | Highlighter |
| `E` | Eraser |
| `S` | Select |
| `T` | Text |
| `R` | Shape |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Shift+Z` | Redo |
| Hold `Space` | Temporary hand mode |

Wheel scrolling is never captured, regardless of the active tool.

## Requirements

- Node.js and npm
- Chrome or Edge (any recent version, Manifest V3), and/or Firefox 140+ — Firefox 140 is required so its built-in no-data-collection declaration is enforced

## Getting started

```bash
git clone https://github.com/MRIDUL1978/DrawME.git
cd DrawME
npm install
npm run build
```

`npm run build` runs `scripts/build.mjs`, which produces self-contained `dist/chrome` and `dist/firefox` packages — Chrome uses a service worker background script, Firefox uses a non-persistent one.

> `node_modules/` and `dist/` are generated, not source — they're already covered by `.gitignore`.

## Load in Chrome or Edge

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select the `dist` folder. `dist/chrome` is the equivalent browser-specific package.

## Load temporarily in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on**.
3. Select the file `dist/firefox/manifest.json`.

> ⚠️ **Do not** select `dist/manifest.json` in Firefox: the root package is the Chrome build and uses `background.service_worker`. Firefox uses the separate `background.scripts` manifest under `dist/firefox`.

Or run:

```bash
npm run firefox
```

This builds the extension and launches a temporary Firefox profile with `dist/firefox` loaded via `web-ext`.

## Onboarding webpage

Run:

```bash
npm run dev:onboarding
```

Then open `http://localhost:5173/onboarding.html`. The same page also opens automatically after a successful first installation of the extension.

## Development scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the `dist/chrome` and `dist/firefox` extension packages |
| `npm run dev:onboarding` | Serves the onboarding page locally with Vite (`http://localhost:5173/onboarding.html`) |
| `npm run firefox` | Builds, then launches a temporary Firefox profile with the built package loaded |
| `npm run lint:firefox` | Validates the built Firefox package with `web-ext lint` |
| `npm test` | Runs unit and component tests once (Vitest) |
| `npm run test:watch` | Runs tests interactively |
| `npm run typecheck` | Type-checks the project (`tsc --noEmit`) |


## Project layout

```
.
├── AGENTS.md             
├── onboarding.html         # Onboarding page entry point (built separately via vite.config.ts)
├── public/assets/          # Static assets
├── scripts/
│   └── build.mjs           # Builds the self-contained dist/chrome and dist/firefox extension packages
├── src/
│   ├── background/         # Action clicks, injection, IndexedDB, screenshot capture, first-run onboarding
│   ├── content/             # Shadow DOM host, toolbar, Konva stage, annotation reducer, persistence, export
│   ├── onboarding/           # Extension-local first-run onboarding page
│   └── shared/                # Versioned data and runtime-message contracts shared across contexts
├── tests/                    # Unit and component tests (Vitest + Testing Library)
├── package.json
├── tsconfig.json
└── vite.config.ts            # Builds the onboarding page to dist/onboarding-build/
```

`dist/` itself is generated by `npm run build` / `npx vite build` and isn't committed.

**Stack:** TypeScript, React 19, Vite, Konva, perfect-freehand, Framer Motion, GSAP, and `webextension-polyfill`.

## Contributing

Development workflow, coding conventions, the interaction contract, and the release acceptance checklist are maintained in [AGENTS.md](./AGENTS.md) — read it before opening a PR. Bug reports and feature requests are welcome through this repository's Issues tab.

## License

This project doesn't yet have a published license. Add a `LICENSE` file at the repo root (via **Add file → Create new file → LICENSE** on GitHub) and reference it here, e.g.:

> Licensed under the [MIT License](./LICENSE).