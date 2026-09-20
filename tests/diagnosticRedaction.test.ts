import { describe, expect, it } from "vitest";

import { redactDiagnosticValue } from "../src/lib/diagnosticRedaction";

describe("redactDiagnosticValue", () => {
  it("redacts common credentials and absolute home paths recursively", () => {
    const input = {
      bearer: "Authorization: Bearer abc.def-123_456",
      apiKeys: ["sk-test-1234567890123456", "ghp_12345678901234567890"],
      csrf: "csrf_token=secret-csrf-value",
      path: "/Users/alice/Library/Application Support/Agent/session.json",
      nested: { home: "/home/alice/project" },
    };

    expect(redactDiagnosticValue(input)).toEqual({
      bearer: "Authorization: Bearer [REDACTED_TOKEN]",
      apiKeys: ["[REDACTED_API_KEY]", "[REDACTED_API_KEY]"],
      csrf: "csrf_token=[REDACTED_CSRF]",
      path: "[REDACTED_HOME]/Library/Application Support/Agent/session.json",
      nested: { home: "[REDACTED_HOME]/project" },
    });
  });

  it("preserves shape and does not mutate input", () => {
    const input = {
      keep: "ordinary text",
      number: 3,
      nil: null,
      array: [{ keep: true }],
    };

    const result = redactDiagnosticValue(input);

    expect(result).toEqual(input);
    expect(result).not.toBe(input);
    expect((result as { array: unknown[] }).array).not.toBe(input.array);
  });

  it("is deterministic and idempotent", () => {
    const input = { value: "Bearer secret-token" };
    const once = redactDiagnosticValue(input);

    expect(redactDiagnosticValue(input)).toEqual(once);
    expect(redactDiagnosticValue(once)).toEqual(once);
  });
});
