# AGENTS.md

See [CLAUDE.md](CLAUDE.md) for the full guide. Critical rules:

1. **CDN imports only** (`cdn.jsdelivr.net`). Do not add npm dependencies.
2. **No server-side code.** This is a static Vite + Scalar site on Vercel.
3. **Port `3003` is locked** — it's the registered Cognito OAuth callback. Do not change it.
4. **Client-side filtering is not a security boundary.** Every authenticated user receives every shipped guide and OpenAPI spec; the filter only controls rendering. No secrets, no PII.
5. **Do not change** the new-badge `localStorage` key `achievece-docs-viewed-new-v4.13.0`. Do not refactor `awaitOAuthCompletion()` in `src/auth.js` — it was a deliberate fix.
