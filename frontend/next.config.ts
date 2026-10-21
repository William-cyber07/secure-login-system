import type { NextConfig } from "next";

const isMobileBuild = process.env.BUILD_TARGET === 'mobile';

const nextConfig: NextConfig = {
  // These are only enabled for the Web version (Vercel)
  ...(!isMobileBuild ? {
    cacheComponents: true,
    partialPrefetching: true,
    turbopack: {
      rules: {
        "*.css": {
          loaders: ["@tailwindcss/turbopack"],
          as: "*.css",
        },
      },
    },
  } : {
    // These are only enabled for the Mobile version (Capacitor)
    output: 'export',
    images: { unoptimized: true },
    assetPrefix: './',
  }),
};

export default nextConfig;