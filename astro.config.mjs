// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    resolve: {
      alias: {
        "axobject-query": "axobject-query/lib/index.js",
        "aria-query": "aria-query/lib/index.js",
      },
    },
  },
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
});
