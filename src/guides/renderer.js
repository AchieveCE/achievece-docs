import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/+esm";
import hljs from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/core/+esm";
import javascript from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/javascript/+esm";
import typescript from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/typescript/+esm";
import bash from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/bash/+esm";
import sql from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/sql/+esm";
import json from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/json/+esm";
import yaml from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/yaml/+esm";
import xml from "https://cdn.jsdelivr.net/npm/highlight.js@11/lib/languages/xml/+esm";

hljs.registerLanguage("js", javascript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("json", json);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("html", xml);

const SUPPORTED = new Set(["js", "javascript", "ts", "typescript", "bash", "sh", "sql", "json", "yaml", "yml", "html"]);

const stylesheetId = "hljs-stylesheet";
function ensureHighlightStylesheet() {
  if (document.getElementById(stylesheetId)) return;
  const link = document.createElement("link");
  link.id = stylesheetId;
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.css";
  document.head.appendChild(link);
}

const renderer = new marked.Renderer();
renderer.code = function (code, lang) {
  const language = (lang || "").trim().toLowerCase();
  if (language && SUPPORTED.has(language)) {
    try {
      const out = hljs.highlight(code, { language }).value;
      return `<pre><code class="hljs language-${language}">${out}</code></pre>`;
    } catch {
      /* fall through to plain */
    }
  }
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<pre><code class="hljs">${escaped}</code></pre>`;
};

renderer.link = function (href, title, text) {
  let rewritten = href || "";
  if (typeof rewritten === "string" && rewritten.endsWith(".md") && !/^https?:/i.test(rewritten)) {
    rewritten = "/guides/" + rewritten.replace(/^\.\//, "").replace(/\.md$/, "");
  }
  const titleAttr = title ? ` title="${title}"` : "";
  return `<a href="${rewritten}"${titleAttr}>${text}</a>`;
};

marked.setOptions({ renderer, gfm: true, breaks: false });

export function renderGuide(guide) {
  ensureHighlightStylesheet();
  const html = marked.parse(guide.body || "");
  const historyUrl = `https://github.com/AchieveCE/achievece-docs/commits/main/content/guides/${guide.slug}.md`;
  const footer = `<footer class="guide-footer">Last updated ${guide.updated} · <a href="${historyUrl}" target="_blank" rel="noopener">View history</a></footer>`;
  return `<article class="guide-article">${html}${footer}</article>`;
}
