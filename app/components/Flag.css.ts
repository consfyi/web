import { globalFontFace, style } from "@vanilla-extract/css";

globalFontFace("Twemoji Country Flags", {
  src: 'url("/TwemojiCountryFlags.woff2") format("woff2")',
  fontDisplay: "block",
});

export const flag = style({
  fontFamily: '"Twemoji Country Flags"',
  display: "inline-block",
  userSelect: "none",
});
