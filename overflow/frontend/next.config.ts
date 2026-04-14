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
    value: ([
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // DEV ONLY: Hardcoded IPs are for the hackathon dev server. In production, use HTTPS and env-driven origins.
      `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL || "http://149.102.129.143:3001"} ${process.env.NEXT_PUBLIC_AI_URL || "http://149.102.129.143:5001"} http://localhost:3001 http://localhost:5001 https://evm.wirefluid.com wss: ws:`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ] as string[]).join("; "),
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
};

export default nextConfig;
