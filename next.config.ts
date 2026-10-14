import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 镜像只携带 .next/standalone 中的最小运行时
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
