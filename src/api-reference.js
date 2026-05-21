import jsyaml from "https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/+esm";

const ADMIN_TAG_PREFIXES = ["SEO — Admin"];
const NEW_BADGE_STORAGE_KEY = "achievece-docs-viewed-new-v4.13.0";

let scalarMounted = false;

function isAdminPath(pathItem) {
  for (const method of Object.keys(pathItem)) {
    const op = pathItem[method];
    if (op && Array.isArray(op.tags)) {
      if (op.tags.some((t) => ADMIN_TAG_PREFIXES.some((p) => t.startsWith(p)))) {
        return true;
      }
    }
  }
  return false;
}

async function loadFilteredSpec(isAdmin) {
  const res = await fetch("/openapi/achievece.yaml");
  const text = await res.text();
  const spec = jsyaml.load(text);
  if (!isAdmin && spec.paths) {
    for (const path of Object.keys(spec.paths)) {
      if (isAdminPath(spec.paths[path])) delete spec.paths[path];
    }
    if (Array.isArray(spec.tags)) {
      spec.tags = spec.tags.filter(
        (t) => !ADMIN_TAG_PREFIXES.some((p) => (t.name || "").startsWith(p))
      );
    }
  }
  return spec;
}

function readViewed() {
  try {
    const raw = localStorage.getItem(NEW_BADGE_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markViewed(opId) {
  try {
    const viewed = readViewed();
    viewed.add(opId);
    localStorage.setItem(NEW_BADGE_STORAGE_KEY, JSON.stringify([...viewed]));
  } catch {
    /* localStorage disabled — dot just won't persist this session */
  }
}

function collectNewOps(spec) {
  const bySummary = new Map();
  if (!spec || !spec.paths) return bySummary;
  for (const path of Object.keys(spec.paths)) {
    const pathItem = spec.paths[path] || {};
    for (const method of Object.keys(pathItem)) {
      const op = pathItem[method];
      if (op && op["x-new"] === true && op.summary) {
        bySummary.set(op.summary.trim(), op.operationId || op.summary);
      }
    }
  }
  return bySummary;
}

function attachNewBadges(rootEl, spec) {
  const bySummary = collectNewOps(spec);
  if (bySummary.size === 0) return;

  const decorate = () => {
    const viewed = readViewed();
    const links = rootEl.querySelectorAll("a");
    links.forEach((link) => {
      if (link.dataset.newBadgeChecked === "1") return;
      const label = (link.textContent || "").trim();
      const opId = bySummary.get(label);
      if (!opId) return;
      link.dataset.newBadgeChecked = "1";
      if (viewed.has(opId)) return;
      if (link.querySelector(".new-dot")) return;
      const dot = document.createElement("span");
      dot.className = "new-dot";
      dot.setAttribute("aria-label", "New");
      link.appendChild(dot);
      link.addEventListener(
        "click",
        () => {
          markViewed(opId);
          dot.remove();
        },
        { once: true }
      );
    });
  };

  decorate();
  const observer = new MutationObserver(decorate);
  observer.observe(rootEl, { childList: true, subtree: true });
}

function renderScalar(rootEl, spec) {
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@scalar/api-reference";
  script.onload = () => {
    Scalar.createApiReference("#" + rootEl.id, {
      content: spec,
      theme: "kepler",
      layout: "modern",
      darkMode: true,
      hiddenClients: ["unirest"],
      searchHotKey: "k",
      metaData: {
        title: "AchieveCE API Documentation",
        description: "Courses, Packages, Faculty, FindCE, and SEO APIs for AchieveCE",
      },
      hideModels: false,
      hideDownloadButton: false,
      defaultHttpClient: { targetKey: "javascript", clientKey: "fetch" },
    });
    attachNewBadges(rootEl, spec);
  };
  document.body.appendChild(script);
}

export async function mount(rootEl, { groups }) {
  if (scalarMounted) return;
  scalarMounted = true;
  const isAdmin = groups.includes("admin");
  const spec = await loadFilteredSpec(isAdmin);
  renderScalar(rootEl, spec);
}
