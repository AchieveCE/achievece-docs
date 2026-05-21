import { loadGuides, canRead } from "./loader.js";
import { activateGuideDiagrams, renderGuide } from "./renderer.js";
import { go } from "../router.js";

const allGuides = loadGuides();

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function readable(groups, userGroups) {
  return groups.filter((g) => canRead(g.groups, userGroups));
}

function groupByCategory(guides) {
  const byCat = new Map();
  for (const g of guides) {
    if (!byCat.has(g.category)) byCat.set(g.category, []);
    byCat.get(g.category).push(g);
  }
  for (const arr of byCat.values()) {
    arr.sort((a, b) => a.title.localeCompare(b.title));
  }
  return [...byCat.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function renderSidebar(allowed, activeSlug) {
  const cats = groupByCategory(allowed);
  if (cats.length === 0) {
    return `<aside class="guides-sidebar"><div class="guides-sidebar-empty">No guides available.</div></aside>`;
  }
  const sections = cats
    .map(([cat, list]) => {
      const items = list
        .map((g) => {
          const cls = g.slug === activeSlug ? "guides-link active" : "guides-link";
          return `<li><a class="${cls}" href="/guides/${g.slug}" data-slug="${escapeHtml(g.slug)}">${escapeHtml(g.title)}</a></li>`;
        })
        .join("");
      return `<div class="guides-cat"><div class="guides-cat-title">${escapeHtml(cat)}</div><ul>${items}</ul></div>`;
    })
    .join("");
  return `<aside class="guides-sidebar"><div class="guides-sidebar-inner"><a class="guides-home" href="/guides">All guides</a>${sections}</div></aside>`;
}

function renderLanding(allowed) {
  const sorted = [...allowed].sort((a, b) => b.updated.localeCompare(a.updated));
  if (sorted.length === 0) {
    return `<div class="guides-empty"><h2>No guides available</h2><p>You don't have access to any guides yet.</p></div>`;
  }
  const cards = sorted
    .map(
      (g) => `
        <a class="guide-card" href="/guides/${g.slug}" data-slug="${escapeHtml(g.slug)}">
          <div class="guide-card-title">${escapeHtml(g.title)}</div>
          ${g.summary ? `<div class="guide-card-summary">${escapeHtml(g.summary)}</div>` : ""}
          <div class="guide-card-meta">${escapeHtml(g.category)} · Updated ${escapeHtml(g.updated)}</div>
        </a>`
    )
    .join("");
  return `<div class="guides-landing"><h1>Guides</h1><p class="guides-landing-sub">Internal long-form documentation for the AchieveCE team.</p><div class="guide-cards">${cards}</div></div>`;
}

function renderNotFound() {
  return `<div class="guides-card"><h2>Guide not found</h2><p>That guide doesn't exist. <a href="/guides">Back to all guides</a>.</p></div>`;
}

function renderForbidden() {
  return `<div class="guides-card"><h2>You don't have access to this guide</h2><p>Your account isn't in any of the groups this guide is shared with. <a href="/guides">Back to all guides</a>.</p></div>`;
}

function bindLinks(rootEl) {
  const links = rootEl.querySelectorAll("a[href^='/guides']");
  links.forEach((a) => {
    if (a.dataset.spaBound === "1") return;
    a.dataset.spaBound = "1";
    a.addEventListener("click", (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      go(a.getAttribute("href"));
    });
  });
}

export function mountGuides(rootEl, { groups, slug }) {
  const allowed = readable(allGuides, groups);
  const sidebar = renderSidebar(allowed, slug || null);

  let pane;
  if (slug == null) {
    pane = renderLanding(allowed);
  } else {
    const guide = allGuides.find((g) => g.slug === slug);
    if (!guide) {
      pane = renderNotFound();
    } else if (!canRead(guide.groups, groups)) {
      pane = renderForbidden();
    } else {
      pane = renderGuide(guide);
    }
  }

  rootEl.innerHTML = `<div class="guides-shell">${sidebar}<main class="guides-main">${pane}</main></div>`;
  bindLinks(rootEl);
  // Fire-and-forget mermaid activation. Lazy-loaded inside renderer; no-op if
  // the current guide doesn't have any diagrams.
  activateGuideDiagrams(rootEl);
}
