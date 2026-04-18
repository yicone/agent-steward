/** @type {import('next').NextConfig} */
const AGENT_STORAGE_IGNORED_REGEXP =
  /(?:^|[/\\])(?:\.next|node_modules|\.agent|\.agents|\.codex|\.github|\.windsurf|\.git|output)(?:[/\\]|$)/;
const AGENT_STORAGE_IGNORED_GLOB = "**/{.next,node_modules,.agent,.agents,.codex,.github,.windsurf,.git,output}/**";

function globLikePatternToRegExpSource(pattern) {
  const normalizedPattern = pattern.replace(/\\/g, "/");
  const globStarPlaceholder = "__GLOBSTAR__";
  const escapedPattern = normalizedPattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, globStarPlaceholder)
    .replace(/\*/g, "[^/]*")
    .replaceAll(globStarPlaceholder, ".*");

  return `(?:${escapedPattern})`;
}

function combineRegExpFlags(patterns) {
  const flags = new Set();

  for (const pattern of patterns) {
    for (const flag of pattern.flags) {
      if (flag !== "g" && flag !== "y") flags.add(flag);
    }
  }

  return Array.from(flags).sort().join("");
}

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

  if (Array.isArray(existingIgnored)) {
    if (existingIgnored.every((pattern) => typeof pattern === "string")) {
      return [...existingIgnored, AGENT_STORAGE_IGNORED_GLOB];
    }

    const stringPatterns = existingIgnored
      .filter((pattern) => typeof pattern === "string" && pattern.length > 0)
      .map(globLikePatternToRegExpSource);
    const regexpPatterns = existingIgnored.filter((pattern) => pattern instanceof RegExp);

    if (stringPatterns.length > 0 || regexpPatterns.length > 0) {
      return new RegExp(
        [
          ...regexpPatterns.map((pattern) => `(?:${pattern.source})`),
          ...stringPatterns,
          `(?:${AGENT_STORAGE_IGNORED_REGEXP.source})`,
        ].join("|"),
        combineRegExpFlags(regexpPatterns),
      );
    }
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
