/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.agent/**',
          '**/.agents/**',
          '**/.codex/**',
          '**/.github/**',
          '**/.windsurf/**',
          '**/.git/**',
          '**/output/**',
        ],
      };
    }
    return config;
  }
};

export default nextConfig;

