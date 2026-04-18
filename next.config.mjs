/** @type {import('next').NextConfig} */
const AGENT_STORAGE_IGNORED_REGEXP =
  /(?:^|[/\\])(?:\.next|node_modules|\.agent|\.agents|\.codex|\.github|\.windsurf|\.git|output)(?:[/\\]|$)/;
const AGENT_STORAGE_IGNORED_GLOB = "**/{.next,node_modules,.agent,.agents,.codex,.github,.windsurf,.git,output}/**";

function combineIgnoredWatchPatterns(existingIgnored) {
  if (!existingIgnored) return AGENT_STORAGE_IGNORED_REGEXP;

  if (existingIgnored instanceof RegExp) {
    return new RegExp(
      `(?:${existingIgnored.source})|(?:${AGENT_STORAGE_IGNORED_REGEXP.source})`,
      existingIgnored.flags,
    );
  }

  if (typeof existingIgnored === "string") {
    return [existingIgnored, AGENT_STORAGE_IGNORED_GLOB];
  }

  if (Array.isArray(existingIgnored) && existingIgnored.every((pattern) => typeof pattern === "string")) {
    return [...existingIgnored, AGENT_STORAGE_IGNORED_GLOB];
  }

  return AGENT_STORAGE_IGNORED_REGEXP;
}

const nextConfig = {
  output: "standalone",
  webpack: (config, { dev }) => {
    if (dev) {
      const existingIgnored = config.watchOptions?.ignored;

      config.watchOptions = {
        ...config.watchOptions,
        ignored: combineIgnoredWatchPatterns(existingIgnored),
      };
    }
    return config;
  },
};

export default nextConfig;
