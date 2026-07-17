import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPT = resolve(process.cwd(), "scripts/inject-csp.mjs");
const HEADERS =
  "/*\n  X-Frame-Options: DENY\n" +
  "  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'\n";

// Run the real postbuild script against a throwaway build/client fixture and
// return the rewritten _headers.
function runInjectCsp(indexHtml: string, headers = HEADERS): string {
  const dir = mkdtempSync(join(tmpdir(), "inject-csp-"));
  try {
    const out = join(dir, "build", "client");
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, "index.html"), indexHtml);
    writeFileSync(join(out, "_headers"), headers);
    execFileSync(process.execPath, [SCRIPT], { cwd: dir, stdio: "pipe" });
    return readFileSync(join(out, "_headers"), "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function enforcedCspLine(headers: string): string {
  const line = headers
    .split("\n")
    .find((l) => l.trimStart().startsWith("Content-Security-Policy:"));
  if (!line) throw new Error("no enforced CSP line in output");
  return line;
}

describe("inject-csp postbuild", () => {
  it("enforces the strict policy: replaces the safe tier, no report-only, keeps indent", () => {
    const out = runInjectCsp("<script>console.log(1)</script>");
    expect(out).not.toContain("Report-Only");
    // the safe-tier line is gone, replaced by the full policy at the same indent
    expect(out).not.toContain(
      "Content-Security-Policy: frame-ancestors 'none';",
    );
    expect(out).toContain("  Content-Security-Policy: default-src 'self';");
  });

  it("hashes each inline script and skips external (src) scripts", () => {
    const html = `<html><head>
      <script src="/assets/app.js"></script>
      <script data-mantine-script="true">console.log(1)</script>
      <script type="module">import "/entry";</script>
    </head></html>`;
    const src = enforcedCspLine(runInjectCsp(html));
    expect(src).toContain(
      "script-src 'self' https://static.cloudflareinsights.com ",
    );
    // two inline scripts hashed; the src= one excluded
    expect(src.match(/'sha256-[^']+'/g) ?? []).toHaveLength(2);
  });

  it("does not mistake a data-src attribute for a real src", () => {
    // With a `\bsrc=` lookahead this inline script would be skipped, left
    // unhashed, and blocked once the CSP is enforced.
    const src = enforcedCspLine(
      runInjectCsp('<script data-src="ignored">console.log(2)</script>'),
    );
    expect(src.match(/'sha256-[^']+'/g) ?? []).toHaveLength(1);
  });

  it("aborts when the built index.html has no inline scripts", () => {
    expect(() =>
      runInjectCsp('<script src="/assets/only-external.js"></script>'),
    ).toThrow();
  });
});
