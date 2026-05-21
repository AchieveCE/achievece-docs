import * as apiReference from "./api-reference.js";
import { mountGuides } from "./guides/ui.js";

let userGroups = [];
let apiMounted = false;

function parse(pathname) {
  if (pathname === "/" || pathname === "") return { view: "api" };
  if (pathname === "/guides" || pathname === "/guides/") return { view: "guides", slug: null };
  const m = pathname.match(/^\/guides\/([^/]+)\/?$/);
  if (m) return { view: "guides", slug: decodeURIComponent(m[1]) };
  return { view: "api", redirect: true };
}

function setActiveTab(view) {
  const apiBtn = document.getElementById("tab-api");
  const guidesBtn = document.getElementById("tab-guides");
  if (apiBtn) apiBtn.classList.toggle("active", view === "api");
  if (guidesBtn) guidesBtn.classList.toggle("active", view === "guides");
}

function show(view) {
  const scalarRoot = document.getElementById("scalar-root");
  const guidesRoot = document.getElementById("guides-root");
  if (scalarRoot) scalarRoot.style.display = view === "api" ? "" : "none";
  if (guidesRoot) guidesRoot.style.display = view === "guides" ? "" : "none";
  setActiveTab(view);
}

function render(pathname) {
  const route = parse(pathname);
  if (route.redirect) {
    history.replaceState({}, "", "/");
    return render("/");
  }
  if (route.view === "api") {
    show("api");
    if (!apiMounted) {
      apiMounted = true;
      apiReference.mount(document.getElementById("scalar-root"), { groups: userGroups });
    }
  } else {
    show("guides");
    mountGuides(document.getElementById("guides-root"), { groups: userGroups, slug: route.slug });
  }
}

export function go(path) {
  if (path === location.pathname) return;
  history.pushState({}, "", path);
  render(path);
}

export function start({ groups }) {
  userGroups = groups;

  document.getElementById("tab-api")?.addEventListener("click", (e) => {
    e.preventDefault();
    go("/");
  });
  document.getElementById("tab-guides")?.addEventListener("click", (e) => {
    e.preventDefault();
    go("/guides");
  });

  window.addEventListener("popstate", () => render(location.pathname));

  // After a Cognito callback, the path may still be /callback — normalize to /.
  let initialPath = location.pathname;
  if (initialPath === "/callback") {
    history.replaceState({}, "", "/");
    initialPath = "/";
  }
  render(initialPath);
}
