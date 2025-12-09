import type { NextConfig } from "next";

function getSafeHostname(
  urlString: string | undefined,
  fallback = "localhost"
) {
  if (!urlString) {
    return {
      protocol: "http",
      hostname: fallback,
      port: "3000",
    };
  }
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || "", // Ensure port is always a string
    };
  } catch {
    // fallback for cases like "localhost:3000" without protocol
    const match = urlString.match(/^(https?):\/\/([^:/]+)(?::(\d+))?/);
    if (match) {
      return {
        protocol: match[1],
        hostname: match[2],
        port: match[3] || "", // Ensure port is always a string
      };
    }
    // total fallback
    return {
      protocol: "http",
      hostname: fallback,
      port: "3000",
    };
  }
}

const devHost = getSafeHostname("http://localhost:3000");
const prodHost = getSafeHostname(process.env.NEXT_PUBLIC_API_URL);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL(`${devHost.protocol}://${devHost.hostname}:${devHost.port}/uploads/**`),
      new URL(`${prodHost.protocol}://${prodHost.hostname}:${prodHost.port}/uploads/**`),
    ],
  },
};

export default nextConfig;
