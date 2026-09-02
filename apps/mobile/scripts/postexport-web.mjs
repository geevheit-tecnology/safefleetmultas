import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const htmlPath = join(process.cwd(), "dist", "index.html");
const html = readFileSync(htmlPath, "utf8");

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

if (!html.includes("hide-vercel-feedback")) {
  writeFileSync(htmlPath, html.replace("</head>", `${snippet}\n  </head>`));
}
