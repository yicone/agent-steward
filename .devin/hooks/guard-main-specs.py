#!/usr/bin/env python3
"""
Pre-write hook: Block direct edits to openspec/specs/ main spec files.

Main specs should only be updated through the OpenSpec sync flow
(openspec sync / openspec archive), not by direct agent edits.

Exit code 2 = block the action.
Exit code 0 = allow.
"""

import sys
import json

PROTECTED_PREFIX = "openspec/specs/"

# These files within specs/ ARE allowed to be created/modified by agents
# (e.g., during propose/apply workflows that create new spec files).
# The guard is primarily for preventing casual edits to established specs.
ALLOW_PATTERNS = []


def main():
    try:
        data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        # If we can't parse input, allow the action (fail open)
        sys.exit(0)

    tool_info = data.get("tool_info", {})
    file_path = tool_info.get("file_path", "")

    if file_path.startswith(PROTECTED_PREFIX):
        for pattern in ALLOW_PATTERNS:
            if pattern in file_path:
                sys.exit(0)

        print(
            f"Blocked: Direct edits to {PROTECTED_PREFIX} are discouraged. "
            "Use the OpenSpec sync flow (openspec sync / openspec archive) "
            "to update main specs. If this edit is intentional, ask the user "
            "to confirm.",
            file=sys.stderr,
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    main()
