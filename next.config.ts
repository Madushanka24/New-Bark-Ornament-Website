
import type { NextConfig } from "next";

/**
 * FILE 142 — STEP B1
 *
 * Allow approved Sanity CDN photography
 * from the configured Bark Ornament
 * project and dataset.
 *
 * Preserve:
 * - Cache Components
 * - Partial Prefetching
 * - Existing Turbopack configuration
 * - Existing application architecture
 */

const sanityProjectId =
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim();

const sanityDataset =
  process.env.NEXT_PUBLIC_SANITY_DATASET?.trim();

const validSanityConfiguration =
  typeof sanityProjectId === "string" &&
  /^[a-z0-9-]+$/.test(sanityProjectId) &&
  typeof sanityDataset === "string" &&
  /^[a-z0-9_-]+$/.test(sanityDataset);

const nextConfig: NextConfig = {
  cacheComponents: true,

  partialPrefetching: true,

  images: {
    remotePatterns: validSanityConfiguration
      ? [
          {
            protocol: "https",
            hostname: "cdn.sanity.io",
            port: "",
            pathname:
              `/images/${sanityProjectId}/${sanityDataset}/**`,
          },
        ]
      : [],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
