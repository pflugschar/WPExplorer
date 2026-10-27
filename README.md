# WP REST Explorer

A privacy-first Firefox extension that detects whether a website runs WordPress and gives you a
developer-oriented UI for browsing, querying, and exporting its public REST API content — posts,
pages, media, taxonomies, custom post types, and WooCommerce products.

> **🤖 Vibe-coded project.** This extension was built largely with AI assistance. It has test
> coverage for the core logic, but review the code yourself before relying on it for anything
> sensitive.

## What it does

1. Click the toolbar icon while viewing any website.
2. The extension reads DOM signals from the active tab and opens a full browser tab
   (`explorer.html`). If needed, you're asked to grant access to that one site.
3. It detects WordPress, discovers the REST API's namespaces/routes, and builds a sidebar from
   whatever the site's REST index actually reports (no hardcoded assumptions).
4. You browse content in Table/Card/Raw JSON views, build queries, follow `_links`/`_embedded`
   relations, and export items or whole collections (JSON/NDJSON/CSV/ZIP, Markdown for posts/pages).

## Getting started

```
npm install
npm run build
```

Then load the unpacked extension in Firefox:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select `dist/manifest.json`

Or run `npm run start:firefox`, which builds and launches Firefox with the extension loaded.

## Development

```
npm run dev          # Vite dev server for iterating on the explorer UI
npm run typecheck    # tsc --noEmit
npm run lint          # ESLint
npm run test          # Vitest
npm run package       # web-ext build -> web-ext-artifacts/*.zip
```

## Permissions & privacy

- **`activeTab` + `scripting`** — reads DOM signals only from the tab you clicked the icon on.
- **`storage`** — settings and a short-lived handoff of DOM signals between the click and the
  explorer tab.
- **`downloads`** — used only when you explicitly export/download content.
- **Optional host permissions** (`http://*/*`, `https://*/*`) — requested per-origin, only for the
  site you connect to.
- No analytics, telemetry, or "phone home" behavior. Everything runs locally.
- The extension is **read-only** — only `GET`/`HEAD` requests are ever issued.
- Optional authentication (WordPress Application Passwords, WooCommerce keys) is kept **in memory
  only** for the current tab's lifetime — never written to disk, never logged.

## Known limitations

- Authenticated-route auto-discovery isn't implemented yet (auth works, but the UI doesn't
  automatically surface what an authenticated user can additionally see).
- No OPTIONS-based schema fetch; relationship exploration relies on `_links`/`_embedded`.
- The Markdown exporter is a small built-in HTML→Markdown converter, not a full-featured library.
- No virtualization for very large tables; pagination keeps individual requests bounded.
