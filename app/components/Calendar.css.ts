import { style } from "@vanilla-extract/css";
import vars from "~/theme.css";

export const segment = style({});

export const inner = style({
  selectors: {
    [`${segment}:focus-visible > &`]: {
      position: "relative",
      outline: `2px solid ${vars.colors.primaryFilled}`,
      outlineOffset: `calc(0.125rem * ${vars.scale})`,
      zIndex: 2,
    },
  },
});
