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
    // Generated Cloudflare/OpenNext build output - not our code.
    ".open-next/**",
    ".wrangler/**",
  ]),
  {
    // custom-worker.ts imports .open-next/worker.js, a build artifact that
    // doesn't exist before `opennextjs-cloudflare build` runs. Whether that
    // import errors under tsc is therefore build-state-dependent, so
    // @ts-expect-error (which itself errors when unused) isn't reliable
    // here - this is the same @ts-ignore pattern OpenNext's own docs use.
    files: ["custom-worker.ts"],
    rules: { "@typescript-eslint/ban-ts-comment": "off" },
  },
]);

export default eslintConfig;
