import { defineConfig } from "@lingui/cli";

export default defineConfig({
  locales: ["en", "ja", "zh-Hant"],
  sourceLocale: "en",
  orderBy: "origin",
  catalogs: [
    {
      path: "<rootDir>/app/locales/{locale}/messages",
      include: ["app"],
    },
  ],
});
