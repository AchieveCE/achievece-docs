import * as auth from "./auth.js";
import { start } from "./router.js";

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
  document.getElementById("user-email").textContent =
    user.signInDetails?.loginId || user.username;

  const rolePill = document.getElementById("user-role");
  const labelGroups = groups.length > 0 ? groups : ["consumer"];
  rolePill.textContent = labelGroups.map(titleCase).join(", ");
  if (!isAdmin) rolePill.classList.add("consumer");

  document.getElementById("sign-out-btn").addEventListener("click", async () => {
    try {
      await auth.signOut();
    } finally {
      window.location.reload();
    }
  });

  start({ groups });
}

async function init() {
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
