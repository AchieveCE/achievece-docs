# achievece-docs

Standalone Vite + Scalar static site that hosts the AchieveCE public API reference at `/` and an internal long-form wiki at `/guides`. Lives as a sibling of `achievece-web` (not inside it). Deployed to Vercel; locked to port `3003` in dev because that's the registered Cognito OAuth callback.

## Stack constraints

- **ES modules only**. No TypeScript. No tests in this repo — do not add a test framework.
- **CDN imports via `cdn.jsdelivr.net`** are the convention (`aws-amplify`, `js-yaml`, `marked`, `highlight.js`). Do **not** add npm dependencies — `package.json` is intentionally tiny.
- **No server-side code**. Static site only. Vercel rewrites everything to `index.html`.
- **Port `3003` is locked** in `vite.config.js`. Cognito's app client only accepts `http://localhost:3003/callback`.
- Single Cognito pool, all filtering is client-side.

## Cognito groups

Six groups exist on user pool `us-east-2_0gKmcU86y`:

| Group | What they see |
| --- | --- |
| `admin` | Everything — every API path, every guide. Global override. |
| `consumer` | External integrators. Public OpenAPI routes, no `SEO — Admin`. |
| `engineering` | Internal eng. Guides tagged `engineering`. |
| `payments` | Billing/payments team. Guides tagged `payments`. |
| `marketing` | Marketing team. Guides tagged `marketing`. |
| `customer-service` | CS reps. Guides tagged `customer-service`. |

## The two filters (most-misunderstood thing)

There are two completely independent filters, both client-side:

1. **API spec filter** — works on OpenAPI **tag prefixes**. `ADMIN_TAG_PREFIXES` in [src/api-reference.js](src/api-reference.js) (currently `["SEO — Admin"]`) names tags that get stripped from the spec for non-admin users.
2. **Guide filter** — works on Markdown **frontmatter**. Each guide has a `groups:` array; users see a guide if their `cognito:groups` claim intersects it. `admin` overrides.

The two share no code. Adding a new admin-only OpenAPI tag does **not** restrict any guide, and vice versa.

## Module map (`src/`)

- [auth.js](src/auth.js) — `init()` (Amplify.configure), `awaitOAuthCompletion()` (Hub listener + 10s safety), `getSession()`, `signIn()`, `signOut()`.
- [api-reference.js](src/api-reference.js) — `mount(rootEl, { groups })`. Loads `/openapi/achievece.yaml`, strips admin-only tag prefixes for non-admins, renders Scalar with the existing `kepler`/`modern`/dark-mode config, attaches the "New" badge MutationObserver.
- [guides/loader.js](src/guides/loader.js) — `loadGuides()` (via `import.meta.glob`, regex frontmatter parser, validates schema and warn-skips bad entries) and `canRead(guideGroups, userGroups)`.
- [guides/renderer.js](src/guides/renderer.js) — `renderGuide(guide)`. `marked@12` + `highlight.js@11` (JS, TS, bash, sql, json, yaml, html). Rewrites `*.md` links and appends a "Last updated · View history" footer.
- [guides/ui.js](src/guides/ui.js) — `mountGuides(rootEl, { groups, slug })`. Sidebar grouped by category, landing-page card list, not-found / forbidden cards.
- [router.js](src/router.js) — `start({ groups })` + `go(path)`. Parses `/`, `/guides`, `/guides/<slug>`. Toggles visibility instead of unmounting Scalar.
- [main.js](src/main.js) — entry. Sign-in card on no session; otherwise wire topbar and start the router.

## Adding a guide

1. Create `content/guides/<slug>.md` (kebab-case, filename **is** the slug).
2. Add the required frontmatter (`title`, `slug`, `groups`, `updated`). See [content/guides/CLAUDE.md](content/guides/CLAUDE.md).
3. `bun dev` and sign in as a user whose groups intersect — the guide appears in the sidebar.
4. Commit and push. Vercel serves it on next deploy.

## Adding a Cognito group

1. Create the group:
   ```bash
   aws cognito-idp create-group \
     --user-pool-id us-east-2_0gKmcU86y \
     --group-name <new-group> \
     --region us-east-2 --profile achievece
   ```
2. Add the new name to `VALID_GROUPS` in [src/guides/loader.js](src/guides/loader.js) and update the table in this file plus [COGNITO_SETUP.md](COGNITO_SETUP.md).

## Build & dev

```bash
bun install        # no new deps should appear
bun dev            # http://localhost:3003
bun run build      # outputs to dist/
```

## Never-do list

- **No secrets in this repo** — every authenticated user can read every shipped file.
- **No callback URL changes in `auth-config.js`** without first updating Cognito (see [COGNITO_SETUP.md](COGNITO_SETUP.md) → "Updating callback URLs"). The two must stay in sync.
- **No server-side code without approval** — this site is static by design.
- **No new npm deps** without asking. CDN imports are the convention.
- **Do not change** the new-badge `localStorage` key (`achievece-docs-viewed-new-v4.13.0`). Rotating it forces every user to re-see every "New" dot.
- **Do not refactor `awaitOAuthCompletion()`** speculatively. It was a recent fix (commit `06eb288`) that replaced an 800 ms timeout with a Hub event wait; behavior must stay 1:1.

## Testing access locally

[COGNITO_SETUP.md](COGNITO_SETUP.md) lists the seed users:

- `info@achievece.com` — `admin` — sees everything.
- `tech@achievece.com` — `consumer` — sees public API routes, no admin-tagged routes, no guides unless one is explicitly tagged with `consumer`.

To test team-specific access, `admin-add-user-to-group` a test account into `engineering`/`payments`/`marketing`/`customer-service` and sign in as that account.
