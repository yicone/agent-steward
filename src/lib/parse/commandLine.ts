export function extractCsrfTokenFromCommand(commandLine: string): string | null {
  const patterns = [
    /--csrf[_-]token\s+([0-9a-fA-F-]{36})/i,
    /--csrf[_-]token=([0-9a-fA-F-]{36})/i,
    /--csrfToken\s+([0-9a-fA-F-]{36})/i,
    /--csrfToken=([0-9a-fA-F-]{36})/i,
    /(?:^|\s)CODEIUM_CSRF_TOKEN=([0-9a-fA-F-]{36})(?:\s|$)/i
  ];
  for (const re of patterns) {
    const match = commandLine.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}
