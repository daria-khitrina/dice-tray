#!/usr/bin/env bash
# Fails if any tracked text file has more than MAX_LINES lines (default 500). Binary files are skipped.
set -euo pipefail
max=${MAX_LINES:-500}
bad=0
while IFS= read -r f; do
  grep -Iq . "$f" 2>/dev/null || continue
  n=$(awk 'END{print NR}' "$f")
  if [ "$n" -gt "$max" ]; then echo "$f: $n lines (max $max)"; bad=1; fi
done < <(git ls-files)
exit $bad
