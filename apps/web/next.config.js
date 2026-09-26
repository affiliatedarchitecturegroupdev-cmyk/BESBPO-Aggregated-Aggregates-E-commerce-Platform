/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [{ source: "/suppliers", destination: "/delivery-areas", permanent: true }];
  },
};

module.exports = nextConfig;
