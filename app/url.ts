// Data-sourced URLs (a convention's `url`, a key-date `source` post) come from
// data.cons.fyi and are rendered as anchor `href`s. React does not block
// `javascript:` (or other non-web) URLs, so a poisoned value would become a
// script-execution sink on click. Only pass through http(s) URLs; anything
// else yields `undefined`, leaving the anchor inert.
//
// Only absolute URLs are supported: `new URL(url)` throws on a relative or
// protocol-relative value and we fail closed. That is fine for the current
// sinks (a convention `url` / key-date `source` are always absolute http(s)),
// but a relative URL entering the dataset would silently render inert.
export function safeExternalUrl(
  url: string | null | undefined,
): string | undefined {
  if (!url) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }
  return parsed.protocol === "https:" || parsed.protocol === "http:"
    ? url
    : undefined;
}
