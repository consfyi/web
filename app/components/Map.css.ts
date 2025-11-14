// map.css.ts
import { style, globalStyle } from "@vanilla-extract/css";
import vars from "~/theme.css";

export const map = style({
  vars: {
    "--ml-ctrl-border-radius": vars.radius.default,
    "--ml-c-bg-1": vars.colors.default,
    "--ml-c-bg-2": vars.colors.defaultHover,
    "--ml-c-bg-3": vars.colors.defaultHover,
    "--ml-c-icon-1": vars.colors.gray[7],
    "--ml-c-icon-2": vars.colors.gray[7],
    "--ml-c-active": vars.colors.primaryColors.filled,
    "--ml-c-error": vars.colors.red.filled,
    "--ml-o-disabled": "0.12",
    "--ml-shadow": "none",
    "--ml-c-link-1": vars.colors.dimmed,
    "--ml-c-link-2": vars.colors.dimmed,
    "--ml-c-geoloc": vars.colors.primaryColors.filled,
    "--popover-border-color": vars.colors.gray[2],
  },
  overflow: "hidden",
});

globalStyle(`.dark ${map}`, {
  vars: {
    "--ml-c-icon-1": vars.colors.dark[1],
    "--ml-c-icon-2": vars.colors.dark[1],
    "--popover-border-color": vars.colors.dark[4],
  },
});

globalStyle(`${map} .maplibregl-ctrl-attrib`, {
  background: "none",
  fontSize: vars.fontSizes.xs,
  borderTopLeftRadius: vars.radius.default,
  fontWeight: "500",
  WebkitTextStroke: "0.1px",
  WebkitTextStrokeColor: vars.colors.default,
});

globalStyle(`.${map} maplibregl-ctrl-attrib a`, {
  textDecoration: "initial",
});

globalStyle(`${map} .maplibregl-ctrl-attrib a:hover`, {
  textDecoration: "underline",
});

globalStyle(`${map} .maplibregl-popup`, {
  paddingBottom: "37px",
});

globalStyle(`${map} .maplibregl-popup.maplibregl-popup-anchor-left`, {
  paddingLeft: "17px",
});

globalStyle(`${map} .maplibregl-popup.maplibregl-popup-anchor-right`, {
  paddingRight: "17px",
});

globalStyle(`${map} .maplibregl-popup-content`, {
  border: "1px solid var(--popover-border-color)",
  touchAction: "none",
});

globalStyle(`${map} .maplibregl-popup-tip`, {
  border: `1px solid var(--popover-border-color)`,
  width: "7px",
  height: "7px",
  backgroundColor: vars.colors.default,
  position: "absolute",
  borderTopLeftRadius: "0px",
  borderBottomColor: "transparent",
  borderRightColor: "transparent",
  clipPath: "polygon(0px 100%, 0px 0px, 100% 0px)",
});

globalStyle(`${map} .maplibregl-popup-anchor-top .maplibregl-popup-tip`, {
  transform: "rotate(45deg)",
  top: "-2.5px",
});

globalStyle(`${map} .maplibregl-popup-anchor-bottom .maplibregl-popup-tip`, {
  transform: "rotate(225deg)",
  bottom: "34.5px",
});

globalStyle(`${map} .maplibregl-popup-anchor-left .maplibregl-popup-tip`, {
  transform: "rotate(-45deg)",
  left: "14.5px",
});

globalStyle(`${map} .maplibregl-popup-anchor-right .maplibregl-popup-tip`, {
  transform: "rotate(135deg)",
  right: "14.5px",
});
