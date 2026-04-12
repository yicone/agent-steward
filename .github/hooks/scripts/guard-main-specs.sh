#!/usr/bin/env bash
#
# preToolUse hook: Block direct edits to openspec/specs/ main spec files.
# Main specs should only be updated through the OpenSpec sync flow.
#
# Copilot passes JSON on stdin with { toolName, toolArgs }.
# Output JSON to stdout: { "decision": "deny", "message": "..." } to block.
# Exit 0 with no output (or { "decision": "allow" }) to permit.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(echo "$INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('toolName',''))" 2>/dev/null || echo "")

# Only check file-writing tools
case "$TOOL_NAME" in
  editFile|createFile|writeFile|createOrUpdateFile)
    ;;
  *)
    exit 0
    ;;
esac

FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
args = json.load(sys.stdin).get('toolArgs', '{}')
if isinstance(args, str):
    import json as j
    args = j.loads(args)
print(args.get('filePath', args.get('file_path', args.get('path', ''))))
" 2>/dev/null || echo "")

if echo "$FILE_PATH" | grep -q "^openspec/specs/"; then
  cat <<EOF
{"decision": "deny", "message": "Blocked: Direct edits to openspec/specs/ are discouraged. Use the OpenSpec sync flow (openspec sync / openspec archive) to update main specs."}
EOF
  exit 0
fi

exit 0
