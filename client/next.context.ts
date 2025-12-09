import dotenv from "dotenv";
dotenv.config();

/
 * Safely parse URL and fallback to a default
 */
function getSafeHostname(urlString, fallback = "localhost") {
  try {
    const url = new URL(urlString);
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      port: url.port || undefined,
    };
  } catch {
    // fallback for cases like "localhost:3000" without protocol
    const match = urlString.match(/^(https?):\/\/([^:/]+)(?::(\d+))?/);
    if (match) {
      return {
        protocol: match[1],
        hostname: match[2],
        port: match[3] || undefined,
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
const prodHost = getSafeHostname(process.env.NEXT_PUBLIC_API_URL || "");

/ @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: devHost.protocol,
        hostname: devHost.hostname,
        port: devHost.port,
        pathname: "/uploads/",
      },
      {
        protocol: prodHost.protocol,
        hostname: prodHost.hostname,
        port: prodHost.port,
        pathname: "/uploads/",
      },
    ],
  },
};

export default nextConfig;