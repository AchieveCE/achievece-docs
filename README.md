# achievece-docs

Standalone Vite + Scalar site for AchieveCE public API reference (Faculty, SEO). It lives **next to** the Next.js app, not inside it:

```
~/work/AchiveCE/
  achievece-web/          # Next.js app — canonical OpenAPI: docs/openapi/achievece-public-api.yaml
  achievece-docs/         # this repo — built spec: public/openapi/achievece.yaml
```

## Local dev

```bash
cd achievece-docs
bun install
bun dev
```

Port **3003**. Build output: `dist/`.

## Sync OpenAPI from achievece-web

After you edit the spec in **achievece-web**, copy it into this project:

```bash
cd ../achievece-web
bun run docs:sync
```

Then commit `public/openapi/achievece.yaml` here and push.

Override the docs path if needed:

```bash
ACHIEVECE_DOCS_ROOT=/path/to/achievece-docs bun run docs:sync
```

## Vercel

Import this directory as its **own** Git repository (or monorepo subfolder with root = `achievece-docs`). Build: `bun run build`, output: `dist`.

In **achievece-web**, optional GitHub secret `ACHIEVECE_DOCS_VERCEL_DEPLOY_HOOK` triggers a docs redeploy when API routes or `docs/openapi/` change (see `achievece-web/.github/workflows/trigger-api-docs-deploy.yml`).
