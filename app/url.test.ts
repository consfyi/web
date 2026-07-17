import { describe, expect, it } from "vitest";
import { safeExternalUrl } from "./url";

describe("safeExternalUrl", () => {
  it("passes through http and https unchanged", () => {
    expect(safeExternalUrl("https://example.com/x")).toBe(
      "https://example.com/x",
    );
    expect(safeExternalUrl("http://example.com")).toBe("http://example.com");
  });

  it("blocks javascript: and other non-web schemes (the XSS guard)", () => {
    expect(safeExternalUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl(" javascript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("JavaScript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("java\tscript:alert(1)")).toBeUndefined();
    expect(safeExternalUrl("data:text/html,<script>1</script>")).toBeUndefined();
    expect(safeExternalUrl("vbscript:msgbox")).toBeUndefined();
  });

  it("fails closed on empty, nullish, relative and unparseable input", () => {
    expect(safeExternalUrl(undefined)).toBeUndefined();
    expect(safeExternalUrl(null)).toBeUndefined();
    expect(safeExternalUrl("")).toBeUndefined();
    expect(safeExternalUrl("not a url")).toBeUndefined();
    expect(safeExternalUrl("//protocol-relative.example")).toBeUndefined();
    expect(safeExternalUrl("/relative/path")).toBeUndefined();
  });
});
