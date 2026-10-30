import type { NextConfig } from "next";

function firebaseAuthDomain() {
  const raw = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim() ?? "";
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  return raw;
}

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const authDomain = firebaseAuthDomain();
    if (!authDomain) return [];
    // Phone sign-in must load Firebase's helper on this host. A redirect would
    // send the browser to firebaseapp.com, which Safari then blocks.
    return {
      beforeFiles: [
        {
          source: "/__/auth/:path*",
          destination: `https://${authDomain}/__/auth/:path*`,
        },
      ],
    };
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
