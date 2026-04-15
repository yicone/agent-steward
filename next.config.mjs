/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      const existingIgnored = config.watchOptions?.ignored;
      const ignored = [
        ...(Array.isArray(existingIgnored) ? existingIgnored : existingIgnored ? [existingIgnored] : []),
        "**/.next/**",
        "**/node_modules/**",
        "**/.agent/**",
        "**/.agents/**",
        "**/.codex/**",
        "**/.github/**",
        "**/.windsurf/**",
        "**/.git/**",
        "**/output/**",
      ];

      config.watchOptions = {
        ...config.watchOptions,
        ignored,
      };
    }
    return config;
  }
};

export default nextConfig;
