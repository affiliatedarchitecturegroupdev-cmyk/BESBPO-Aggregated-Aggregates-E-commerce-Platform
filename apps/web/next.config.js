/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Staff upload compliance documents (up to 10MB) through a server action.
    serverActions: { bodySizeLimit: "11mb" },
    // One static-generation worker: the Render build instance is small, and a
    // worker per CPU ran it out of memory once the range passed 1,400 products.
    cpus: 1,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

module.exports = nextConfig;
