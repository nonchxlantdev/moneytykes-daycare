import { fileURLToPath } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";

/**
 * Cloudflare Workers build (vinext = Next.js API on Vite).
 *
 *   npm run dev:vinext     local dev in the Workers runtime (with local D1)
 *   npm run build:vinext   production build → dist/ (deployed by `npx wrangler deploy`)
 *
 * The Next.js build (`npm run build`, used by Vercel until it is retired)
 * does not read this file.
 */
const workersD1Binding = fileURLToPath(new URL("./lib/db/d1-binding.workers.ts", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      // Use the native D1 binding on Workers instead of the HTTP gateway (see lib/db/d1-binding.ts).
      { find: /^(?:\.\/|@\/lib\/db\/)d1-binding$/, replacement: workersD1Binding },
    ],
  },
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
