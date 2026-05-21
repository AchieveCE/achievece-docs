# Authoring guides

Long-form internal docs that render at `/guides/<slug>`. Each guide is one Markdown file in this directory with YAML frontmatter.

## Frontmatter schema

```yaml
---
title: How payment recoveries work     # required, string
slug: example-guide                    # required, must equal filename minus .md
groups: [admin, engineering, payments] # required, non-empty array; see "Valid groups" below
category: Billing                      # optional, defaults to "Uncategorized"
summary: One-line description shown on the landing page  # optional, string
updated: 2026-05-21                    # required, YYYY-MM-DD
---
```

`loader.js` validates every field and warn-skips any file that doesn't match. Run `bun dev` and watch the console — any guide that doesn't show up has a warning explaining why.

## Valid groups

`admin`, `consumer`, `engineering`, `payments`, `marketing`, `customer-service`.

## Access rule

A user can read a guide if **any** group in the guide's `groups:` array appears in their Cognito `cognito:groups` claim. `admin` is a global override and sees every guide regardless of `groups`. Filtering is applied both in the sidebar (hidden guides don't render) and on direct URL hits (forbidden card). The same model is used in `src/api-reference.js` for the OpenAPI tag filter — keep the two filters mentally separate (see root `CLAUDE.md`).

## Naming

- Filename **is** the slug. `example-guide.md` → slug `example-guide` → URL `/guides/example-guide`.
- Kebab-case, lowercase, `.md` extension. No spaces, no underscores.
- Renaming a file silently breaks any existing `[text](old-name.md)` links.

## Internal links

Use relative Markdown links: `[See payment recoveries](example-guide.md)`. The renderer rewrites `*.md` → `/guides/<slug>`. Do **not** hardcode `/guides/...` — that bypasses the rewrite and won't survive a future routing change.

## Images

Put binary assets in `public/guides/<slug>/foo.png` and reference them as `/guides/<slug>/foo.png`. Vite serves `public/` at the site root, so the URL works in dev and prod identically.

## Diagrams

Two options, pick per diagram:

- **Mermaid** when the diagram is likely to change, or engineers will edit it in PRs. Author with a ` ```mermaid ` fenced block. Themed by [src/guides/renderer.js](../../src/guides/renderer.js). Lazy-loads ~600 KB of JS on first use; subsequent guides reuse it.
- **Excalidraw SVG** when the diagram is a headline visual that needs to read as designed and won't change weekly. Author at [excalidraw.com](https://excalidraw.com), export as SVG with **Embed scene** checked, commit the file under `public/guides/<slug>/<name>.svg`. The `Embed scene` flag round-trips: drag the SVG back into Excalidraw to keep editing. Zero runtime cost (native browser SVG render). Diffs are useless, so don't use this for diagrams that change often.

Wrap Excalidraw diagrams in the shared `figure.diagram` shell so dark-mode users get a pinned white background and an optional caption:

```html
<figure class="diagram">
  <img src="/guides/payment-recovery/section-3.svg" alt="Customer journey flow" />
  <figcaption>How a failed charge becomes either a recovery or a cancellation.</figcaption>
</figure>
```

The `figcaption` is optional. Marked passes raw HTML through, so this works inline anywhere in a guide.

## Security boundary

Client-side filtering is **not** a security boundary. The Markdown body is shipped to every authenticated user as part of the JS bundle — the filter only controls whether it gets rendered. Do not put:

- Customer PII
- API keys, tokens, passwords, or other secrets
- Anything you wouldn't want visible to every signed-in account if the filter had a bug

If a guide needs to be truly private, it doesn't belong in this repo.

## When in doubt

Default the frontmatter to `groups: [admin]`. Ask in PR review who else should see it. Widening access later is cheap; narrowing it after a leak is not.

## Why in-repo, not a CMS

These guides live as Markdown in this repo on purpose. The audience is internal teams and the primary authors are engineers, so PR review is genuinely useful: a guide describing how `payment-recoveries` works should be reviewed by the people who own that code, and renaming an API endpoint plus its guide can land in the same commit. Contentful adds editorial UI, drafts, scheduling, and locales, none of which we need yet; S3 decouples publish from deploy at the cost of losing version control and adding a sync workflow. Neither strengthens the security boundary, since the JS bundle ships every guide to every signed-in user regardless of where the source lives. Revisit this if non-engineers become the primary authors, the guide count crosses ~30–50 and rebuild time starts mattering, or we need scheduled publishing or i18n. The migration path is mechanical: `loadGuides()` in `src/guides/loader.js` is the seam, and the `{slug, title, groups, body}` shape it returns can come from anywhere.
