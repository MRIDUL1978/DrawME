# DrawMe

Draw and annotate on ordinary web pages with a local-first Chrome and Firefox extension.

> 📖 The product contract, architecture, development commands, and release checklist live in [AGENTS.md](./AGENTS.md) — the project's single source of truth.

## Contents

- [Highlights](#highlights)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Load in Chrome or Edge](#load-in-chrome-or-edge)
- [Load temporarily in Firefox](#load-temporarily-in-firefox)
- [Onboarding webpage](#onboarding-webpage)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [License](#license)

## Highlights

- **Draw & annotate** directly on top of any webpage.
- **Local-first** — data stays on your machine.
- **Cross-browser** — ships as a Chrome/Edge build (Manifest V3, `background.service_worker`) and a separate Firefox build (`background.scripts`).
- **Guided onboarding** — a dedicated onboarding page walks new users through setup right after install.

## Requirements

- Node.js and npm
- Chrome, Edge, or Firefox for testing the extension

## Getting started

```bash
git clone https://github.com/<your-username>/drawme.git
cd drawme
npm install
npm run build
```

`npm run build` produces the root `dist/` package (the Chrome/Edge build) along with browser-specific packages, including `dist/chrome` and `dist/firefox`.

> `node_modules/` and `dist/` are generated, not source — make sure both are listed in `.gitignore` before you push so they don't end up in the repo.

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

Alternatively, run:

```bash
npm run firefox
```

This builds the extension and launches a temporary Firefox profile with the correct package pre-loaded.

## Onboarding webpage

Run:

```bash
npm run dev:onboarding
```

Then open `http://localhost:5173/onboarding.html`. The same page also opens automatically after a successful first installation of the extension.


## Project layout

What's known from this README (see [AGENTS.md](./AGENTS.md) for the full picture):

```
.
├── AGENTS.md          # Product contract, architecture, dev commands, release checklist
├── dist/              # Build output — root package is the Chrome/Edge build
│   ├── chrome/        # Chrome/Edge-specific package
│   └── firefox/       # Firefox-specific package (background.scripts manifest)
└── onboarding.html    # Onboarding page, served locally via `npm run dev:onboarding`
```

## Contributing

Development workflow, coding conventions, and the release checklist are maintained in [AGENTS.md](./AGENTS.md) — read it before opening a PR. Bug reports and feature requests are welcome through this repository's Issues tab.

## License

This project doesn't yet have a published license. Add a `LICENSE` file at the repo root — GitHub can generate one for you when creating the repository (or afterward via **Add file → Create new file → LICENSE**) — then reference it here, e.g.:

> Licensed under the [MIT License](./LICENSE).