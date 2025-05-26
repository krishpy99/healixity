/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'build',
  trailingSlash: true,
  images: {
    unoptimized: true
  }
};

module.exports = nextConfig;