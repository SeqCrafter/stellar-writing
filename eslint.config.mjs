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
    // 从 hexo-theme-stellar 原样复制的标签源码与浏览器垫片（CommonJS）
    "src/lib/stellar/vendor/**",
    "src/lib/stellar/shims/**",
    "public/stellar/**",
  ]),
]);

export default eslintConfig;
