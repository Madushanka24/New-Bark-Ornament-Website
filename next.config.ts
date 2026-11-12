
import type { NextConfig } from "next";

/**
 * BARK ORNAMENT — FILE 170
 *
 * Approved Sanity CDN photography.
 *
 * Preserve:
 * - Cache Components
 * - Partial Prefetching
 * - Existing Turbopack configuration
 * - Existing application architecture
 *
 * Security:
 * - Allow the configured Sanity project only.
 * - Allow the configured dataset only.
 * - Require HTTPS.
 * - Reject remote image query parameters.
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
            search: "",
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
