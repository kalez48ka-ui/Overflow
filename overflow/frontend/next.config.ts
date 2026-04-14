import type { NextConfig } from "next";

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: (() => {
      const isDev = process.env.NODE_ENV === "development";

      // Build connect-src from environment variables — no hardcoded IPs
      const connectSources = ["'self'", "https://evm.wirefluid.com"];
      if (process.env.NEXT_PUBLIC_API_URL) {
        connectSources.push(process.env.NEXT_PUBLIC_API_URL);
      }
      if (process.env.NEXT_PUBLIC_AI_URL) {
        connectSources.push(process.env.NEXT_PUBLIC_AI_URL);
      }
      // WebSocket: allow both ws: and wss: since backend may be HTTP or HTTPS
      connectSources.push("ws:", "wss:");
      if (isDev) {
        connectSources.push("http://localhost:3001", "http://localhost:5001");
      }

      const directives: string[] = [
        "default-src 'self'",
        // Next.js injects inline scripts for hydration — 'unsafe-inline' is required.
        // 'strict-dynamic' is NOT compatible without nonce support in Next.js production builds.
        `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        `connect-src ${connectSources.join(" ")}`,
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ];

      return directives.join("; ");
    })(),
  },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  allowedDevOrigins: ["149.102.129.143"],
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const aiUrl = process.env.NEXT_PUBLIC_AI_URL || "http://localhost:5001";
    return [
      {
        source: "/proxy/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: "/proxy/ai/:path*",
        destination: `${aiUrl}/api/ai/:path*`,
      },
    ];
  },
};

export default nextConfig;
