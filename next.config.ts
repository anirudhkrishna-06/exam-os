import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  // argon2 ships native bindings and must be loaded by Node at runtime rather
  // than bundled by Turbopack into the authentication route.
  serverExternalPackages: ['argon2'],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
