/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      const existingIgnored = config.watchOptions?.ignored;
      const agentStorageIgnored = /(?:^|[/\\])(?:\.next|node_modules|\.agent|\.agents|\.codex|\.github|\.windsurf|\.git|output)(?:[/\\]|$)/;

      config.watchOptions = {
        ...config.watchOptions,
        ignored: Array.isArray(existingIgnored)
          ? [...existingIgnored, agentStorageIgnored]
          : existingIgnored
            ? [existingIgnored, agentStorageIgnored]
            : agentStorageIgnored,
      };
    }
    return config;
  },
};

export default nextConfig;
