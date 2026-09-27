/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Staff upload compliance documents (up to 10MB) through a server action.
    serverActions: { bodySizeLimit: "11mb" },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [{ source: "/suppliers", destination: "/delivery-areas", permanent: true }];
  },
};

module.exports = nextConfig;
