import { globalStyle, style } from "@vanilla-extract/css";

export const itemDetails = style({});

export const compact = style({});

const content = '"\\00a0•\\00a0"';

globalStyle(`${itemDetails} > span:not(:first-child)::before`, {
  content,
});

globalStyle(`${compact} > p > span:first-child::before`, {
  content,
});
