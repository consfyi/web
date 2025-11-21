import { globalStyle } from "@vanilla-extract/css";

globalStyle(':root[data-mantine-color-scheme="dark"]', {
  vars: {
    "--mantine-color-body": "#141414",
  },
});
