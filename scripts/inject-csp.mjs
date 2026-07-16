// Build-time CSP finalisation. Run as the `postbuild` npm hook after
// `react-router build`. Cloudflare Pages serves the app as static files, so a
// per-request nonce is impossible; instead we pin script-src to the sha256 of
// every inline bootstrap script in the built index.html (Mantine's
// ColorSchemeScript, the React Router context/stream scripts, whose contents
// change per build). Same-origin bundle files load via 'self'; a javascript:
// URL matches neither 'self' nor any hash, so it stays blocked — the XSS
// backstop for the anchor sinks safeExternalUrl already guards.
//
// ROLLOUT: the full strict policy ships as Content-Security-Policy-REPORT-ONLY,
// so it only reports violations and cannot break the app. The committed
// public/_headers keeps a small ENFORCED Content-Security-Policy (frame-ancestors
// etc.) so clickjacking protection is live now. Once report-only has run clean
// against real traffic (incl. the OAuth login + authed actions), promote the
// strict policy to the enforced header. This rewrites only the built artifact
// (build/client/_headers); if the step is skipped the deploy still serves the
// valid enforced safe tier from public/_headers.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const OUT = "build/client";
const html = readFileSync(`${OUT}/index.html`, "utf8");

// Every inline <script> (no src= attribute). External /assets bundles carry a
// src and are covered by 'self'.
const hashes = [];
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
for (let m; (m = re.exec(html)); ) {
  const digest = createHash("sha256").update(m[1], "utf8").digest("base64");
  hashes.push(`'sha256-${digest}'`);
}
if (hashes.length === 0) {
  throw new Error("inject-csp: no inline scripts found in index.html — aborting");
}

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  `script-src 'self' ${hashes.join(" ")}`,
  // Mantine/emotion apply inline style attributes; vanilla-extract emits static CSS.
  "style-src 'self' 'unsafe-inline'",
  // bsky avatars, flag data URIs, maplibre tiles (canvas/blob).
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://protomaps.github.io",
  // data.cons.fyi, bsky appview, and the user's own (arbitrary) OAuth PDS host.
  "connect-src 'self' https:",
  // maplibre web workers.
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const headersPath = `${OUT}/_headers`;
const headers = readFileSync(headersPath, "utf8");
const cspLine = /^(\s*)Content-Security-Policy:.*$/m;
if (!cspLine.test(headers)) {
  throw new Error("inject-csp: no Content-Security-Policy line found in _headers");
}
// Leave the committed enforced safe-tier CSP in place; add the full strict
// policy as report-only right below it (same indentation). Report-only can't
// block anything, so this is safe to ship to production untested routes.
writeFileSync(
  headersPath,
  headers.replace(cspLine, `$&\n$1Content-Security-Policy-Report-Only: ${csp}`),
);
console.log(
  `inject-csp: added report-only strict CSP (script-src pinned to ${hashes.length} inline-script hashes)`,
);
