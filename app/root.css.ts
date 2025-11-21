import { createGlobalTheme } from "@vanilla-extract/css";

createGlobalTheme(':root[data-mantine-color-scheme="dark"]', {
  "--mantine-color-body": "#141414",
});
