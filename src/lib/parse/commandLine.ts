export function extractCsrfTokenFromCommand(commandLine: string): string | null {
  const patterns = [
    /--csrf_token\s+([0-9a-fA-F-]{36})/,
    /--csrf_token=([0-9a-fA-F-]{36})/
  ];
  for (const re of patterns) {
    const match = commandLine.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

