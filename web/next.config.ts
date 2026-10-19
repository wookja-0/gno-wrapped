import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  // Self-contained server for the Docker image (web/Dockerfile).
  output: "standalone",
  // The OG route reads these font files at runtime; make sure they're traced into the build.
  outputFileTracingIncludes: {
    "/api/og/[season]/[address]": ["./node_modules/@fontsource/*/files/*-latin-*-normal.woff"],
  },
};

export default nextConfig;
