#!/usr/bin/env python3
"""
Codex PreToolUse hook: Warn when Bash commands write to openspec/specs/.

Codex PreToolUse only fires for Bash tool calls. The hook receives JSON on
stdin with { event, hookId, toolName, toolInput: { command } }.

Output JSON on stdout:
  { "decision": "deny", "reason": "..." }  to block
  { "decision": "approve" }                 to allow
  (empty or no output)                      to allow

Note: This cannot intercept built-in file editing tools (Edit, Write),
only Bash commands. It's a best-effort guard for Codex.
"""

import sys
import json
import re

PROTECTED_PREFIX = "openspec/specs/"

# Patterns that suggest writing to a file path
WRITE_PATTERNS = [
    r'\bcp\b.*' + re.escape(PROTECTED_PREFIX),
    r'\bmv\b.*' + re.escape(PROTECTED_PREFIX),
    r'\btee\b.*' + re.escape(PROTECTED_PREFIX),
    r'\bcat\b.*>.*' + re.escape(PROTECTED_PREFIX),
    r'\becho\b.*>.*' + re.escape(PROTECTED_PREFIX),
    r'\bsed\b.*-i.*' + re.escape(PROTECTED_PREFIX),
    r'\brm\b.*' + re.escape(PROTECTED_PREFIX),
]


def main():
    try:
        data = json.loads(sys.stdin.read())
    except (json.JSONDecodeError, EOFError):
        sys.exit(0)

    tool_input = data.get("toolInput", {})
    command = tool_input.get("command", "")

    for pattern in WRITE_PATTERNS:
        if re.search(pattern, command):
            result = {
                "decision": "deny",
                "reason": (
                    f"Blocked: Bash command appears to write to {PROTECTED_PREFIX}. "
                    "Use the OpenSpec sync flow (openspec sync / openspec archive) "
                    "to update main specs."
                ),
            }
            print(json.dumps(result))
            sys.exit(0)

    sys.exit(0)


if __name__ == "__main__":
    main()
