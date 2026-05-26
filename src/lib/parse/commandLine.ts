export function extractCsrfTokenFromCommand(commandLine: string): string | null {
  return extractCsrfTokenMatchFromCommand(commandLine).token;
}

export type ProcessCsrfTokenMatch = {
  token: string | null;
  source: "ps_args" | "ps_env" | "none";
};

export function extractCsrfTokenMatchFromCommand(commandLine: string): ProcessCsrfTokenMatch {
  const argPatterns = [
    /--csrf[_-]token\s+([0-9a-fA-F-]{36})/i,
    /--csrf[_-]token=([0-9a-fA-F-]{36})/i,
    /--csrfToken\s+([0-9a-fA-F-]{36})/i,
    /--csrfToken=([0-9a-fA-F-]{36})/i
  ];
  for (const re of argPatterns) {
    const match = commandLine.match(re);
    if (match?.[1]) return { token: match[1], source: "ps_args" };
  }

  const envPatterns = [
    /(?:^|\s)CODEIUM_CSRF_TOKEN=([0-9a-fA-F-]{36})(?:\s|$)/i,
    /(?:^|\s)WINDSURF_CSRF_TOKEN=([0-9a-fA-F-]{36})(?:\s|$)/i
  ];
  for (const re of envPatterns) {
    const match = commandLine.match(re);
    if (match?.[1]) return { token: match[1], source: "ps_env" };
  }

  return { token: null, source: "none" };
}
