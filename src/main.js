import * as auth from "./auth.js";
import { start } from "./router.js";

const PREVIEW_STORAGE_KEY = "achievece-docs-preview-groups";

// Dev-only escape hatch: hit `?preview=admin,engineering,payments` once to
// skip Cognito for the rest of the browser session. Lets us iterate on styling
// without going through the OAuth flow. Compiled out of production builds
// because `import.meta.env.DEV` is replaced with `false` by Vite at build time.
function readPreviewGroups() {
  if (!import.meta.env.DEV) return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("preview");
  if (raw != null) {
    const groups = raw.split(",").map((s) => s.trim()).filter(Boolean);
    try { sessionStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(groups)); } catch {}
    // Strip the query param so subsequent SPA navigations stay clean.
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
    return groups;
  }
  try {
    const stored = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

auth.init();

function titleCase(s) {
  return s
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join("-");
}

function showSignIn() {
  const card = document.getElementById("auth-card");
  card.innerHTML = `
    <h2>Protected documentation</h2>
    <p>Sign in with your AchieveCE account to view the API reference.</p>
    <button id="sign-in-btn">Sign in</button>
  `;
  document.getElementById("sign-in-btn").addEventListener("click", () => {
    auth.signIn().catch(() => alert("Sign in failed. Please try again."));
  });
}

function showShell(session) {
  const { user, groups } = session;
  const isAdmin = groups.includes("admin");

  document.getElementById("auth-gate").style.display = "none";
  document.getElementById("docs-shell").classList.add("authenticated");
  // Scalar adds `dark-mode` once it mounts; do it preemptively so the chrome
  // and the /guides view match even when the user lands there directly.
  document.body.classList.add("dark-mode");
  document.getElementById("user-email").textContent =
    user.signInDetails?.loginId || user.username;

  const rolePill = document.getElementById("user-role");
  const labelGroups = groups.length > 0 ? groups : ["consumer"];
  rolePill.textContent = labelGroups.map(titleCase).join(", ");
  if (!isAdmin) rolePill.classList.add("consumer");

  document.getElementById("sign-out-btn").addEventListener("click", async () => {
    try {
      sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    } catch {}
    try {
      await auth.signOut();
    } catch {
      // Preview sessions have no real Amplify session; ignore.
    } finally {
      window.location.reload();
    }
  });

  start({ groups });
}

async function init() {
  const previewGroups = readPreviewGroups();
  if (previewGroups) {
    showShell({
      user: { signInDetails: { loginId: "preview@local" }, username: "preview" },
      groups: previewGroups,
    });
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const isCallback = params.has("code") || window.location.pathname === "/callback";
  if (isCallback) {
    const outcome = await auth.awaitOAuthCompletion();
    // Amplify v6 clears ?code= itself on success; only force-clean the
    // URL if it didn't (failure / safety timeout).
    if (outcome !== "success" && window.location.search) {
      window.history.replaceState({}, document.title, "/");
    }
  }

  try {
    const session = await auth.getSession();
    if (!session) return showSignIn();
    showShell(session);
  } catch (err) {
    console.error("[auth] init failed:", err);
    showSignIn();
  }
}

init();
