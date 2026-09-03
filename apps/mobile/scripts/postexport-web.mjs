import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const htmlPath = join(process.cwd(), "dist", "index.html");
const html = readFileSync(htmlPath, "utf8");
const distPath = join(process.cwd(), "dist");
const assetsPath = join(distPath, "assets");

const snippet = `  <style id="hide-vercel-feedback">
    [data-vercel-toolbar],
    [data-vercel-feedback],
    vercel-live-feedback,
    vercel-toolbar,
    iframe[src*="vercel.live"],
    iframe[src*="vercel.com/feedback"] {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  </style>
  <script>
    (function hideVercelFeedback() {
      var selectors = [
        "[data-vercel-toolbar]",
        "[data-vercel-feedback]",
        "vercel-live-feedback",
        "vercel-toolbar",
        "iframe[src*='vercel.live']",
        "iframe[src*='vercel.com/feedback']"
      ];
      function removeFeedback() {
        selectors.forEach(function(selector) {
          document.querySelectorAll(selector).forEach(function(node) {
            node.remove();
          });
        });
      }
      removeFeedback();
      new MutationObserver(removeFeedback).observe(document.documentElement, { childList: true, subtree: true });
    })();
  </script>`;

const pwaHead = `  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="#f7f8fa">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="SafeFleet">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <link rel="apple-touch-icon" href="/assets/safefleet-icon.svg">`;

let nextHtml = html;
if (!nextHtml.includes("hide-vercel-feedback")) {
  nextHtml = nextHtml.replace("</head>", `${snippet}\n  </head>`);
}
if (!nextHtml.includes("manifest.webmanifest")) {
  nextHtml = nextHtml.replace("</head>", `${pwaHead}\n  </head>`);
}
writeFileSync(htmlPath, nextHtml);

mkdirSync(assetsPath, { recursive: true });
writeFileSync(join(assetsPath, "safefleet-icon.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#f7f8fa"/>
  <path d="M256 72l146 54v101c0 93-59 176-146 213-87-37-146-120-146-213V126l146-54z" fill="#9f2f2f"/>
  <path d="M216 272l-42-42-32 32 74 74 154-154-32-32-122 122z" fill="#fff"/>
</svg>`);
writeFileSync(join(distPath, "manifest.webmanifest"), JSON.stringify({
  name: "SafeFleet",
  short_name: "SafeFleet",
  description: "Gestao de multas, prazos, documentos e risco operacional de frotas.",
  start_url: "/login",
  scope: "/",
  display: "standalone",
  background_color: "#f7f8fa",
  theme_color: "#f7f8fa",
  orientation: "portrait",
  icons: [
    {
      src: "/assets/safefleet-icon.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any maskable"
    }
  ]
}, null, 2));
