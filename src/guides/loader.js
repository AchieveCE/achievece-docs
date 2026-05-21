const VALID_GROUPS = new Set([
  "admin",
  "consumer",
  "engineering",
  "payments",
  "marketing",
  "customer-service",
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const guideFiles = import.meta.glob("../../content/guides/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;
  const [, yamlBlock, body] = match;
  const data = {};
  for (const line of yamlBlock.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, "");
    }
    data[key] = value;
  }
  return { data, body: body || "" };
}

function fileSlug(path) {
  const base = path.split("/").pop() || "";
  return base.replace(/\.md$/, "");
}

function validate(entry, filename) {
  const { data } = entry;
  if (typeof data.title !== "string" || !data.title) return `missing title`;
  if (typeof data.slug !== "string" || !data.slug) return `missing slug`;
  if (data.slug !== filename) return `slug "${data.slug}" must equal filename "${filename}"`;
  if (!Array.isArray(data.groups) || data.groups.length === 0) return `groups must be a non-empty array`;
  for (const g of data.groups) {
    if (!VALID_GROUPS.has(g)) return `invalid group "${g}"`;
  }
  if (typeof data.updated !== "string" || !DATE_RE.test(data.updated)) {
    return `updated must be YYYY-MM-DD`;
  }
  return null;
}

export function loadGuides() {
  const guides = [];
  for (const [path, raw] of Object.entries(guideFiles)) {
    const filename = fileSlug(path);
    // Convention: ALL_CAPS filenames (e.g. CLAUDE.md) are author docs, not guides.
    if (/^[A-Z0-9_-]+$/.test(filename)) continue;
    const parsed = parseFrontmatter(raw);
    if (!parsed) {
      console.warn(`[guides] ${path}: missing or invalid frontmatter — skipped`);
      continue;
    }
    const err = validate(parsed, filename);
    if (err) {
      console.warn(`[guides] ${path}: ${err} — skipped`);
      continue;
    }
    const { data, body } = parsed;
    guides.push({
      slug: data.slug,
      title: data.title,
      groups: data.groups,
      category: typeof data.category === "string" && data.category ? data.category : "Uncategorized",
      summary: typeof data.summary === "string" ? data.summary : "",
      updated: data.updated,
      body,
    });
  }
  return guides;
}

export function canRead(guideGroups, userGroups) {
  if (userGroups.includes("admin")) return true;
  return Array.isArray(guideGroups) && guideGroups.some((g) => userGroups.includes(g));
}
