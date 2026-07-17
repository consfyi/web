// Build-time CSP finalisation. Run as the `postbuild` npm hook after
// `react-router build`. Cloudflare Pages serves the app as static files, so a
// per-request nonce is impossible; instead we pin script-src to the sha256 of
// every inline bootstrap script in the built index.html (Mantine's
// ColorSchemeScript, the React Router context/stream scripts, whose contents
// change per build). Same-origin bundle files load via 'self'; a javascript:
// URL matches neither 'self' nor any hash, so it stays blocked — the XSS
// backstop for the anchor sinks safeExternalUrl already guards.
//
// This rewrites the enforced Content-Security-Policy in the built artifact
// (build/client/_headers) with the full strict policy. The committed
// public/_headers keeps a small safe tier (frame-ancestors etc.), so if this
// step is ever skipped the deploy still serves a valid CSP, never a broken one.
// Validated report-only against real traffic (a public-route sweep + an authed
// Bluesky login) before enforcing; the only external script was Cloudflare's
// Web Analytics beacon, allowlisted in script-src below.
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
  // static.cloudflareinsights.com = the Cloudflare Web Analytics beacon that
  // Pages auto-injects (Cloudflare's documented CSP value). Its data POST to
  // cloudflareinsights.com is covered by connect-src https: below.
  `script-src 'self' https://static.cloudflareinsights.com ${hashes.join(" ")}`,
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
// Replace the committed safe-tier Content-Security-Policy with the full strict
// enforced policy (indentation preserved via $1).
writeFileSync(
  headersPath,
  headers.replace(cspLine, `$1Content-Security-Policy: ${csp}`),
);
console.log(
  `inject-csp: enforced strict CSP (script-src pinned to ${hashes.length} inline-script hashes)`,
);
