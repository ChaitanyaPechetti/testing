# Module 1 — ZeroUI Extension (Hardening & Packaging)

## Run / Test / Package
- `npm install` (root) — installs dev tools (vsce)
- `npm test` — runs all unit tests (Node). PowerShell-friendly.
- `npm run prep:copy-shared` — copies `shared_libs` into `extension/` (for packaging)
- `npm run package` — builds + produces `dist/zeroui.vsix`

## Where data lives
- Receipts: project root `receipts.log` (JSONL, latest valid line wins)
- ZeroUI view: Explorer → Zero UI (or activity bar Zero UI), refresh via `ZeroUI: Refresh Risk Pill`
- Problems panel: shows diagnostics from the latest receipt
- Output → ZeroUI: privacy-safe logs only (event + refs)

## Health probe
- Command: `ZeroUI: Health Check` (verifies receipts path readable; logs structured result)

## Known limitations
- Offline-only: no network calls or external services
- Facts-only adapters; no live polling
- No raw PII/URLs emitted; logs are sanitized via `safeLog`
- Packaging is local-only; vsix is built from current workspace

