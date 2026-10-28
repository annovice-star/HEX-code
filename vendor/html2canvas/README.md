# html2canvas

Version 1.4.1, copied from the official npm package `html2canvas`.

- Package: https://registry.npmjs.org/html2canvas/-/html2canvas-1.4.1.tgz
- Upstream: https://github.com/niklasvh/html2canvas
- License: MIT; see LICENSE and the notices in the JavaScript file.

Loaded on demand by `lib/export-article.ts`. The renderer runs entirely in the
visitor's browser and renders article HTML, including its embedded photographs,
to a fixed-width PNG. No model API, server-side rendering service, or prebuilt
article image is used for this export.

Local compatibility patch (2026-10-28): bound cloned-document font/image waits,
poll clone readiness without requiring the iframe load event, and clean up the
polling interval on removal or timeout. Original MIT notices are retained.

