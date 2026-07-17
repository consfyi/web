import { defineConfig } from "vitest/config";

// Standalone config so unit tests don't pull in the React Router / lingui /
// vanilla-extract build plugins from vite.config.ts.
export default defineConfig({
  test: {
    include: ["app/**/*.test.ts", "scripts/**/*.test.ts"],
    environment: "node",
  },
});
