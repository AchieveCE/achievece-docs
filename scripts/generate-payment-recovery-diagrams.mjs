// One-off generator for the payment-recovery guide's hand-drawn diagrams.
// Output: public/guides/payment-recovery/{customer-journey,recovery-journey}.{svg,excalidraw}
// SVG: rendered via rough.js for the Excalidraw aesthetic.
// .excalidraw: scene JSON, re-editable at excalidraw.com (drag & drop the file).
// Run with: node scripts/generate-payment-recovery-diagrams.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { RoughGenerator } from "roughjs/bin/generator.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, "..", "public", "guides", "payment-recovery");
mkdirSync(OUT_DIR, { recursive: true });

const gen = new RoughGenerator();

const TEAL = "#0d9488";
const TEAL_FILL = "#ccfbf1";
const GREEN = "#15803d";
const GREEN_FILL = "#dcfce7";
const RED = "#b91c1c";
const RED_FILL = "#fee2e2";
const SLATE = "#334155";
const SLATE_FILL = "#f1f5f9";
const INK = "#1e293b";

let seedCounter = 1;
const nextSeed = () => seedCounter++ * 1000 + 1;

// Convert a rough.js drawable into SVG path elements.
function drawableToSvg(drawable) {
  const parts = [];
  for (const set of drawable.sets) {
    const d = set.ops
      .map((op) => {
        if (op.op === "move") return `M${op.data[0].toFixed(2)} ${op.data[1].toFixed(2)}`;
        if (op.op === "lineTo") return `L${op.data[0].toFixed(2)} ${op.data[1].toFixed(2)}`;
        if (op.op === "bcurveTo")
          return `C${op.data[0].toFixed(2)} ${op.data[1].toFixed(2)} ${op.data[2].toFixed(2)} ${op.data[3].toFixed(2)} ${op.data[4].toFixed(2)} ${op.data[5].toFixed(2)}`;
        return "";
      })
      .join(" ");
    const o = drawable.options;
    if (set.type === "path") {
      parts.push(
        `<path d="${d}" stroke="${o.stroke || "#1e1e1e"}" stroke-width="${o.strokeWidth || 1.5}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
    } else if (set.type === "fillPath") {
      parts.push(`<path d="${d}" fill="${o.fill || "transparent"}" stroke="none" fill-rule="evenodd"/>`);
    } else if (set.type === "fillSketch") {
      parts.push(
        `<path d="${d}" stroke="${o.fill || "#1e1e1e"}" stroke-width="${o.fillWeight || 1}" fill="none" stroke-linecap="round"/>`,
      );
    }
  }
  return parts.join("\n      ");
}

function roughRect(x, y, w, h, stroke, fill) {
  return drawableToSvg(
    gen.rectangle(x, y, w, h, {
      stroke,
      strokeWidth: 1.5,
      fill,
      fillStyle: "hachure",
      fillWeight: 1,
      hachureGap: 6,
      roughness: 1.4,
      seed: nextSeed(),
    }),
  );
}

function roughDiamond(cx, cy, w, h, stroke, fill) {
  const pts = [
    [cx, cy - h / 2],
    [cx + w / 2, cy],
    [cx, cy + h / 2],
    [cx - w / 2, cy],
  ];
  return drawableToSvg(
    gen.polygon(pts, {
      stroke,
      strokeWidth: 1.5,
      fill,
      fillStyle: "hachure",
      fillWeight: 1,
      hachureGap: 6,
      roughness: 1.4,
      seed: nextSeed(),
    }),
  );
}

function roughArrow(x1, y1, x2, y2, stroke) {
  const line = drawableToSvg(
    gen.line(x1, y1, x2, y2, {
      stroke,
      strokeWidth: 1.5,
      roughness: 1.2,
      seed: nextSeed(),
    }),
  );
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = 10;
  const hx1 = x2 - head * Math.cos(angle - Math.PI / 7);
  const hy1 = y2 - head * Math.sin(angle - Math.PI / 7);
  const hx2 = x2 - head * Math.cos(angle + Math.PI / 7);
  const hy2 = y2 - head * Math.sin(angle + Math.PI / 7);
  const head1 = drawableToSvg(
    gen.line(x2, y2, hx1, hy1, { stroke, strokeWidth: 1.5, roughness: 0.6, seed: nextSeed() }),
  );
  const head2 = drawableToSvg(
    gen.line(x2, y2, hx2, hy2, { stroke, strokeWidth: 1.5, roughness: 0.6, seed: nextSeed() }),
  );
  return line + "\n      " + head1 + "\n      " + head2;
}

function textBlock(x, y, lines, { fontSize = 15, color = INK, anchor = "middle", weight = 400 } = {}) {
  const lh = fontSize * 1.25;
  const tspans = lines
    .map((line, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : lh}">${escapeXml(line)}</tspan>`)
    .join("");
  return `<text x="${x}" y="${y}" font-family="Inter, 'Comic Sans MS', system-ui, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}" dominant-baseline="hanging">${tspans}</text>`;
}

function escapeXml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapSvg({ width, height, title, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(title)}">
  <rect width="${width}" height="${height}" fill="#ffffff"/>
  <g>
${body}
  </g>
</svg>
`;
}

/* -------------------------------------------------------------------------- */
/* Diagram 1: Sarah's week (vertical timeline, branches at Day 8).            */
/* -------------------------------------------------------------------------- */

function buildCustomerJourney() {
  const W = 880;
  const H = 940;
  const dayX = 110;
  const dayW = 130;
  const dayH = 56;
  const contentX = 280;
  const contentW = 540;
  const contentH = 100;
  const rowGap = 50;

  const rows = [
    {
      day: ["Day 0"],
      body: [
        "Charge fails at Stripe. Within a minute Sarah gets the",
        "\"could not process your payment\" email, a banner",
        "appears on her dashboard, and the \"In dunning\" list adds her.",
      ],
    },
    {
      day: ["Day 2", "to 3"],
      body: [
        "Stripe quietly retries. It fails again.",
        "Sarah gets \"Quick reminder, your payment needs attention.\"",
      ],
    },
    {
      day: ["Day 4", "to 5"],
      body: ["Retry. Fails. Sarah gets \"Your access is at risk.\""],
    },
    {
      day: ["Day 6", "to 7"],
      body: [
        "Last retry. Fails. Sarah gets",
        "\"Final notice, access pauses tomorrow.\"",
      ],
    },
  ];

  let y = 70;
  const body = [];

  body.push(textBlock(W / 2, 20, ["Sarah's week"], { fontSize: 22, weight: 600 }));

  // Day rows 0..6/7
  const centers = [];
  for (const row of rows) {
    body.push(roughRect(dayX, y, dayW, dayH, TEAL, TEAL_FILL));
    body.push(
      textBlock(dayX + dayW / 2, y + (row.day.length > 1 ? 11 : 19), row.day, {
        fontSize: 16,
        weight: 600,
        color: TEAL,
      }),
    );
    body.push(roughRect(contentX, y, contentW, contentH, SLATE, "#ffffff"));
    body.push(textBlock(contentX + 18, y + 16, row.body, { fontSize: 14, color: INK, anchor: "start" }));
    centers.push({ y: y + dayH / 2 });
    y += contentH + rowGap;
  }

  // Connector arrows between consecutive day rows
  for (let i = 0; i < centers.length - 1; i++) {
    body.push(roughArrow(dayX + dayW / 2, centers[i].y + dayH / 2 + 4, dayX + dayW / 2, centers[i + 1].y - dayH / 2 - 4, SLATE));
  }

  // Day 8 row with two outcome boxes stacked above and below the marker.
  // Add extra clearance so the recovered box does not collide with Day 6-7.
  const day8Clearance = 130;
  const day8Y = y + day8Clearance;
  body.push(roughRect(dayX, day8Y, dayW, dayH, TEAL, TEAL_FILL));
  body.push(textBlock(dayX + dayW / 2, day8Y + 19, ["Day 8"], { fontSize: 16, weight: 600, color: TEAL }));
  // Arrow from previous day marker into Day 8
  body.push(roughArrow(dayX + dayW / 2, centers[centers.length - 1].y + dayH / 2 + 4, dayX + dayW / 2, day8Y - 4, SLATE));

  // Two outcome boxes stacked vertically next to Day 8 marker so the fork
  // arrows do not cross either box.
  const outW = 540;
  const outH = 110;
  const recoveredY = day8Y - outH - 20;
  const cancelledY = day8Y + dayH + 20;

  body.push(roughRect(contentX, recoveredY, outW, outH, GREEN, GREEN_FILL));
  body.push(
    textBlock(contentX + outW / 2, recoveredY + 12, ["Recovered"], { fontSize: 16, weight: 600, color: GREEN }),
  );
  body.push(
    textBlock(contentX + 18, recoveredY + 42, [
      "Stripe Smart Retries finally worked, or Sarah updated her card.",
      "She gets \"Your payment is back on track\" and the banner disappears.",
    ], { fontSize: 13, color: INK, anchor: "start" }),
  );

  body.push(roughRect(contentX, cancelledY, outW, outH, RED, RED_FILL));
  body.push(
    textBlock(contentX + outW / 2, cancelledY + 12, ["Stripe gave up"], { fontSize: 16, weight: 600, color: RED }),
  );
  body.push(
    textBlock(contentX + 18, cancelledY + 42, [
      "Her subscription is canceled.",
      "She gets the \"Your subscription has been paused\" email.",
    ], { fontSize: 13, color: INK, anchor: "start" }),
  );

  // Forks: green arrow up-right to Recovered, red arrow down-right to Stripe gave up.
  body.push(roughArrow(dayX + dayW, day8Y + 4, contentX - 4, recoveredY + outH - 12, GREEN));
  body.push(roughArrow(dayX + dayW, day8Y + dayH - 4, contentX - 4, cancelledY + 12, RED));

  const totalHeight = cancelledY + outH + 40;
  return wrapSvg({ width: W, height: totalHeight, title: "Sarah's week", body: body.join("\n") });
}

/* -------------------------------------------------------------------------- */
/* Diagram 2: Recovery decision tree (top-down).                              */
/* -------------------------------------------------------------------------- */

function buildRecoveryJourney() {
  const W = 840;
  const H = 980;
  const body = [];

  body.push(textBlock(W / 2, 18, ["The journey, end to end"], { fontSize: 20, weight: 600 }));

  // Start
  const startX = 270, startY = 70, startW = 220, startH = 60;
  body.push(roughRect(startX, startY, startW, startH, TEAL, TEAL_FILL));
  body.push(textBlock(startX + startW / 2, startY + 21, ["Customer renewal date"], { fontSize: 15, weight: 600, color: TEAL }));

  // Arrow down to decision
  body.push(roughArrow(startX + startW / 2, startY + startH, startX + startW / 2, startY + startH + 40, SLATE));

  // Decision: charge attempt
  const d1cx = W / 2, d1cy = 220;
  body.push(roughDiamond(d1cx, d1cy, 300, 110, SLATE, "#ffffff"));
  body.push(textBlock(d1cx, d1cy - 14, ["Stripe charges", "the card"], { fontSize: 14, weight: 600, color: INK }));

  // Success branch: arrow right + done box
  body.push(roughArrow(d1cx + 150, d1cy, d1cx + 220, d1cy, GREEN));
  body.push(textBlock(d1cx + 185, d1cy - 16, ["Success"], { fontSize: 12, color: GREEN, weight: 600 }));
  const doneX = d1cx + 220, doneY = d1cy - 35;
  body.push(roughRect(doneX, doneY, 180, 70, GREEN, GREEN_FILL));
  body.push(textBlock(doneX + 90, doneY + 14, ["Renewal done.", "Nothing else."], { fontSize: 13, color: INK }));

  // Failure branch: arrow down
  body.push(roughArrow(d1cx, d1cy + 55, d1cx, d1cy + 100, RED));
  body.push(textBlock(d1cx + 14, d1cy + 65, ["Failure"], { fontSize: 12, color: RED, weight: 600, anchor: "start" }));

  // Detect box
  const detectY = 330, boxW = 360, boxH = 80;
  const boxX = (W - boxW) / 2;
  body.push(roughRect(boxX, detectY, boxW, boxH, SLATE, SLATE_FILL));
  body.push(
    textBlock(boxX + boxW / 2, detectY + 14, [
      "First failure detected",
      "Classify hard or soft. Mark subscription past due.",
    ], { fontSize: 13, color: INK }),
  );

  // Arrow down
  body.push(roughArrow(W / 2, detectY + boxH, W / 2, detectY + boxH + 30, SLATE));

  // Notify box
  const notifyY = detectY + boxH + 40;
  body.push(roughRect(boxX, notifyY, boxW, boxH, SLATE, SLATE_FILL));
  body.push(
    textBlock(boxX + boxW / 2, notifyY + 14, [
      "Send email. Show banner.",
      "Add Sarah to the \"In dunning\" list.",
    ], { fontSize: 13, color: INK }),
  );

  // Arrow down
  body.push(roughArrow(W / 2, notifyY + boxH, W / 2, notifyY + boxH + 30, SLATE));

  // Retry box
  const retryY = notifyY + boxH + 40;
  body.push(roughRect(boxX, retryY, boxW, boxH, SLATE, SLATE_FILL));
  body.push(
    textBlock(boxX + boxW / 2, retryY + 14, [
      "Stripe retries the card",
      "over the next 7 days.",
    ], { fontSize: 13, color: INK }),
  );

  // Arrow down to outcome decision
  body.push(roughArrow(W / 2, retryY + boxH, W / 2, retryY + boxH + 30, SLATE));

  // Outcome decision
  const d2cx = W / 2, d2cy = retryY + boxH + 95;
  body.push(roughDiamond(d2cx, d2cy, 220, 90, SLATE, "#ffffff"));
  body.push(textBlock(d2cx, d2cy - 8, ["Outcome"], { fontSize: 15, weight: 600, color: INK }));

  // Recovered branch (left + green)
  body.push(roughArrow(d2cx - 110, d2cy, d2cx - 200, d2cy + 55, GREEN));
  body.push(textBlock(d2cx - 165, d2cy + 8, ["Recovers"], { fontSize: 12, weight: 600, color: GREEN, anchor: "end" }));
  const winX = 40, winY = d2cy + 60, winW = 280, winH = 90;
  body.push(roughRect(winX, winY, winW, winH, GREEN, GREEN_FILL));
  body.push(
    textBlock(winX + winW / 2, winY + 14, [
      "\"Payment recovered\" email.",
      "Banner disappears.",
      "Added to \"Recovered\" list.",
    ], { fontSize: 13, color: INK }),
  );

  // Canceled branch (right + red)
  body.push(roughArrow(d2cx + 110, d2cy, d2cx + 200, d2cy + 55, RED));
  body.push(textBlock(d2cx + 165, d2cy + 8, ["Never", "recovers"], { fontSize: 12, weight: 600, color: RED, anchor: "start" }));
  const loseX = W - 40 - 280, loseY = d2cy + 60, loseW = 280, loseH = 90;
  body.push(roughRect(loseX, loseY, loseW, loseH, RED, RED_FILL));
  body.push(
    textBlock(loseX + loseW / 2, loseY + 14, [
      "Cancel subscription.",
      "\"Subscription paused\" email.",
      "Added to \"Access revoked\" list.",
    ], { fontSize: 13, color: INK }),
  );

  const totalHeight = Math.max(d2cy + 60 + 90 + 40, H);
  return wrapSvg({ width: W, height: totalHeight, title: "Payment recovery journey", body: body.join("\n") });
}

/* -------------------------------------------------------------------------- */
/* .excalidraw scene authoring (re-editable on excalidraw.com).               */
/* -------------------------------------------------------------------------- */

let elIdCounter = 1000;
function elId(prefix) {
  elIdCounter++;
  return `${prefix}-${elIdCounter}`;
}

function exRect(x, y, w, h, { strokeColor = "#1e1e1e", backgroundColor = "transparent", fillStyle = "hachure" } = {}) {
  return {
    id: elId("rect"),
    type: "rectangle",
    x, y, width: w, height: h,
    angle: 0,
    strokeColor, backgroundColor,
    fillStyle, strokeWidth: 2, strokeStyle: "solid",
    roughness: 1, opacity: 100,
    groupIds: [], frameId: null, roundness: { type: 3 },
    seed: nextSeed(), version: 1, versionNonce: nextSeed(),
    isDeleted: false, boundElements: [], updated: 1, link: null, locked: false,
  };
}

function exDiamond(x, y, w, h, { strokeColor = "#1e1e1e", backgroundColor = "transparent" } = {}) {
  return { ...exRect(x, y, w, h, { strokeColor, backgroundColor }), type: "diamond", roundness: null };
}

function exText(x, y, text, { fontSize = 16, color = INK, textAlign = "center" } = {}) {
  return {
    id: elId("text"),
    type: "text",
    x, y,
    width: 200, height: fontSize * 1.4,
    angle: 0,
    strokeColor: color, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 1, strokeStyle: "solid",
    roughness: 1, opacity: 100,
    groupIds: [], frameId: null, roundness: null,
    seed: nextSeed(), version: 1, versionNonce: nextSeed(),
    isDeleted: false, boundElements: [], updated: 1, link: null, locked: false,
    text, fontSize, fontFamily: 1, textAlign, verticalAlign: "top",
    containerId: null, originalText: text, lineHeight: 1.25, baseline: fontSize,
  };
}

function exArrow(x1, y1, x2, y2, { strokeColor = SLATE } = {}) {
  return {
    id: elId("arrow"),
    type: "arrow",
    x: x1, y: y1,
    width: x2 - x1, height: y2 - y1,
    angle: 0,
    strokeColor, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: 2, strokeStyle: "solid",
    roughness: 1, opacity: 100,
    groupIds: [], frameId: null, roundness: { type: 2 },
    seed: nextSeed(), version: 1, versionNonce: nextSeed(),
    isDeleted: false, boundElements: [], updated: 1, link: null, locked: false,
    points: [[0, 0], [x2 - x1, y2 - y1]],
    lastCommittedPoint: null,
    startBinding: null, endBinding: null,
    startArrowhead: null, endArrowhead: "arrow",
    elbowed: false,
  };
}

function exScene(elements) {
  return {
    type: "excalidraw",
    version: 2,
    source: "achievece-docs scripts/generate-payment-recovery-diagrams.mjs",
    elements,
    appState: { viewBackgroundColor: "#ffffff", currentItemFontFamily: 1, gridSize: null },
    files: {},
  };
}

function buildCustomerJourneyExcalidraw() {
  const els = [];
  els.push(exText(330, 20, "Sarah's week", { fontSize: 22 }));
  const rows = [
    { day: "Day 0", body: "Charge fails. Email, banner, and the \"In dunning\" list pick Sarah up." },
    { day: "Day 2-3", body: "Stripe retries, fails. \"Quick reminder, your payment needs attention.\"" },
    { day: "Day 4-5", body: "Retry, fails. \"Your access is at risk.\"" },
    { day: "Day 6-7", body: "Last retry, fails. \"Final notice, access pauses tomorrow.\"" },
  ];
  let y = 70;
  const dayX = 60;
  for (const r of rows) {
    els.push(exRect(dayX, y, 130, 60, { strokeColor: TEAL, backgroundColor: TEAL_FILL }));
    els.push(exText(dayX + 28, y + 18, r.day, { fontSize: 18, color: TEAL }));
    els.push(exRect(220, y, 540, 100, { strokeColor: SLATE, backgroundColor: "#ffffff" }));
    els.push(exText(240, y + 16, r.body, { fontSize: 14, textAlign: "left" }));
    els.push(exArrow(dayX + 65, y + 60, dayX + 65, y + 150 - 5, { strokeColor: SLATE }));
    y += 150;
  }
  // Day 8 branches
  els.push(exRect(dayX, y, 130, 60, { strokeColor: TEAL, backgroundColor: TEAL_FILL }));
  els.push(exText(dayX + 32, y + 18, "Day 8", { fontSize: 18, color: TEAL }));
  els.push(exRect(220, y - 20, 256, 130, { strokeColor: GREEN, backgroundColor: GREEN_FILL }));
  els.push(exText(305, y - 10, "Recovered", { fontSize: 18, color: GREEN }));
  els.push(exText(238, y + 20, "Smart Retries worked or Sarah updated her card.\n\"Payment is back on track\". Banner gone.", { fontSize: 13, textAlign: "left" }));
  els.push(exRect(504, y - 20, 256, 130, { strokeColor: RED, backgroundColor: RED_FILL }));
  els.push(exText(580, y - 10, "Stripe gave up", { fontSize: 18, color: RED }));
  els.push(exText(522, y + 20, "Subscription canceled.\n\"Your subscription has been paused.\"", { fontSize: 13, textAlign: "left" }));
  els.push(exArrow(dayX + 130, y + 30, 216, y + 40, { strokeColor: GREEN }));
  els.push(exArrow(dayX + 130, y + 30, 500, y + 40, { strokeColor: RED }));
  return exScene(els);
}

function buildRecoveryJourneyExcalidraw() {
  const els = [];
  els.push(exText(280, 14, "The journey, end to end", { fontSize: 22 }));
  els.push(exRect(270, 60, 220, 60, { strokeColor: TEAL, backgroundColor: TEAL_FILL }));
  els.push(exText(290, 78, "Customer renewal date", { fontSize: 15, color: TEAL }));

  els.push(exArrow(380, 120, 380, 165, { strokeColor: SLATE }));

  els.push(exDiamond(230, 165, 300, 110, { strokeColor: SLATE, backgroundColor: "#ffffff" }));
  els.push(exText(320, 205, "Stripe charges\nthe card", { fontSize: 14 }));

  els.push(exArrow(530, 220, 600, 220, { strokeColor: GREEN }));
  els.push(exText(540, 198, "Success", { fontSize: 12, color: GREEN }));
  els.push(exRect(600, 185, 180, 70, { strokeColor: GREEN, backgroundColor: GREEN_FILL }));
  els.push(exText(615, 200, "Renewal done.\nNothing else.", { fontSize: 13 }));

  els.push(exArrow(380, 275, 380, 320, { strokeColor: RED }));
  els.push(exText(395, 285, "Failure", { fontSize: 12, color: RED, textAlign: "left" }));

  els.push(exRect(200, 320, 360, 80, { strokeColor: SLATE, backgroundColor: SLATE_FILL }));
  els.push(exText(220, 336, "First failure detected.\nClassify hard or soft. Mark past due.", { fontSize: 13, textAlign: "left" }));

  els.push(exArrow(380, 400, 380, 430, { strokeColor: SLATE }));
  els.push(exRect(200, 430, 360, 80, { strokeColor: SLATE, backgroundColor: SLATE_FILL }));
  els.push(exText(220, 446, "Send email. Show banner.\nAdd Sarah to the \"In dunning\" list.", { fontSize: 13, textAlign: "left" }));

  els.push(exArrow(380, 510, 380, 540, { strokeColor: SLATE }));
  els.push(exRect(200, 540, 360, 80, { strokeColor: SLATE, backgroundColor: SLATE_FILL }));
  els.push(exText(220, 556, "Stripe retries the card\nover the next 7 days.", { fontSize: 13, textAlign: "left" }));

  els.push(exArrow(380, 620, 380, 660, { strokeColor: SLATE }));
  els.push(exDiamond(270, 660, 220, 90, { strokeColor: SLATE, backgroundColor: "#ffffff" }));
  els.push(exText(345, 695, "Outcome", { fontSize: 15 }));

  els.push(exArrow(270, 705, 180, 760, { strokeColor: GREEN }));
  els.push(exText(190, 720, "Recovers", { fontSize: 12, color: GREEN }));
  els.push(exRect(40, 760, 280, 90, { strokeColor: GREEN, backgroundColor: GREEN_FILL }));
  els.push(exText(60, 776, "\"Payment recovered\" email.\nBanner disappears.\nAdded to \"Recovered\" list.", { fontSize: 13, textAlign: "left" }));

  els.push(exArrow(490, 705, 580, 760, { strokeColor: RED }));
  els.push(exText(525, 720, "Never recovers", { fontSize: 12, color: RED }));
  els.push(exRect(440, 760, 280, 90, { strokeColor: RED, backgroundColor: RED_FILL }));
  els.push(exText(460, 776, "Cancel subscription.\n\"Subscription paused\" email.\nAdded to \"Access revoked\" list.", { fontSize: 13, textAlign: "left" }));

  return exScene(els);
}

/* ------------------------------ Write outputs ----------------------------- */

writeFileSync(join(OUT_DIR, "customer-journey.svg"), buildCustomerJourney(), "utf8");
writeFileSync(
  join(OUT_DIR, "customer-journey.excalidraw"),
  JSON.stringify(buildCustomerJourneyExcalidraw(), null, 2),
  "utf8",
);
writeFileSync(join(OUT_DIR, "recovery-journey.svg"), buildRecoveryJourney(), "utf8");
writeFileSync(
  join(OUT_DIR, "recovery-journey.excalidraw"),
  JSON.stringify(buildRecoveryJourneyExcalidraw(), null, 2),
  "utf8",
);

console.log("Wrote:");
console.log("  ", join(OUT_DIR, "customer-journey.svg"));
console.log("  ", join(OUT_DIR, "customer-journey.excalidraw"));
console.log("  ", join(OUT_DIR, "recovery-journey.svg"));
console.log("  ", join(OUT_DIR, "recovery-journey.excalidraw"));
