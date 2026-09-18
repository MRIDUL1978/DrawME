export const CONTENT_STYLES = `
:host { all: initial; color-scheme: light; }
*, *::before, *::after { box-sizing: border-box; }
.dm-shell { position: fixed; inset: 0; z-index: 2147483647; pointer-events: none; font-family: Geist, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.dm-stage { position: fixed; inset: 0; pointer-events: auto; }
.dm-stage.pass-through { pointer-events: none; }
.dm-toolbar-wrap { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); pointer-events: auto; touch-action: none; }
.dm-toolbar { display: flex; align-items: center; gap: 5px; padding: 7px; max-width: calc(100vw - 24px); border: 1px solid rgba(255,255,255,.18); border-radius: 18px; color: #f8f7f3; background: rgba(18,18,20,.94); box-shadow: 0 18px 60px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.1); backdrop-filter: blur(22px); }
.dm-hide-collapse { display: contents; }
.dm-toolbar.collapsed .dm-hide-collapse { display: none; }
.dm-grip { width: 14px; height: 38px; border: 0; border-radius: 10px; cursor: grab; background: repeating-linear-gradient(90deg, transparent 0 3px, #666 3px 5px); opacity: .75; }
.dm-tool, .dm-action { position: relative; display: inline-grid; place-items: center; width: 42px; height: 42px; padding: 0; flex: 0 0 auto; border: 0; border-radius: 12px; color: #c8c7c2; background: transparent; cursor: pointer; transition: color .2s ease, background .2s ease, transform .2s ease; }
.dm-tool:hover, .dm-action:hover { color: #fff; background: #2c2c30; transform: translateY(-1px); }
.dm-tool.active { color: #171717; background: #f4f0e6; }
.dm-tool:focus-visible, .dm-action:focus-visible, .dm-chip:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #8fb7ff; outline-offset: 2px; }
.dm-separator { width: 1px; height: 26px; margin: 0 2px; background: #3a3a3f; }
.dm-icon { width: 19px; height: 19px; display: block; }
.dm-controls { display: flex; align-items: center; gap: 7px; padding: 0 5px; }
.dm-color { width: 30px; height: 30px; padding: 3px; border: 1px solid #555; border-radius: 10px; background: transparent; cursor: pointer; }
.dm-range { width: 72px; accent-color: #f4f0e6; }
.dm-shape { height: 32px; max-width: 88px; border: 1px solid #49494f; border-radius: 9px; color: #f8f7f3; background: #27272b; font: 600 11px/1 inherit; }
.dm-toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); max-width: min(420px, calc(100vw - 32px)); padding: 12px 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; color: #fff; background: #18181b; box-shadow: 0 16px 40px rgba(0,0,0,.25); pointer-events: none; font: 600 13px/1.4 inherit; }
.dm-toast.error { background: #8f2119; }
.dm-swatch { width: 16px; height: 16px; border-radius: 999px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.35); }
@media (max-width: 760px) { .dm-range { width: 48px; } .dm-toolbar { gap: 2px; } .dm-tool, .dm-action { width: 38px; height: 38px; } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: .01ms !important; animation-duration: .01ms !important; } }
`;
