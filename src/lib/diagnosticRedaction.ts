const BEARER_TOKEN = /\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi;
const API_KEY = /\b(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{16,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{16,}|AIza[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16})\b/g;
const SECRET_ASSIGNMENT = /(\b(?:api[_-]?key|access[_-]?token|secret[_-]?key|password)\s*[:=]\s*)(["']?)([^"'`\s,;]+)/gi;
const CSRF_ASSIGNMENT = /(\b(?:csrf[_-]?token|x-codeium-csrf-token)\s*[:=]\s*)(["']?)([^"'`\s,;]+)/gi;
const HOME_PATH = /\/Users\/[^/\\\s"'=,:;()[\]{}]+|\/home\/[^/\\\s"'=,:;()[\]{}]+|[A-Za-z]:\\Users\\[^\\\s"'=,:;()[\]{}]+/g;

/** Redact common sensitive values from a single diagnostic string. */
export function redactDiagnosticText(value: string): string {
  return value
    .replace(BEARER_TOKEN, "Bearer [REDACTED_TOKEN]")
    .replace(CSRF_ASSIGNMENT, "$1[REDACTED_CSRF]")
    .replace(SECRET_ASSIGNMENT, "$1[REDACTED_SECRET]")
    .replace(API_KEY, "[REDACTED_API_KEY]")
    .replace(HOME_PATH, "[REDACTED_HOME]");
}

/** Recursively redact JSON-like diagnostic data without mutating the input. */
export function redactDiagnosticValue(value: unknown): unknown {
  if (typeof value === "string") return redactDiagnosticText(value);
  if (Array.isArray(value)) return value.map((item) => redactDiagnosticValue(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, redactDiagnosticValue(item)])
  );
}
