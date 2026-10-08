import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Separate Worker package (own tsconfig/types) and generated artefacts.
    "cloudflare/**/node_modules/**",
    "cloudflare/**/.wrangler/**",
    "drizzle/**",
    // Cloudflare (vinext) build output and local Wrangler state.
    "dist/**",
    ".vinext/**",
    ".wrangler/**",
  ]),
]);

export default eslintConfig;
