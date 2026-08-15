#!/bin/bash
set -uo pipefail

cd "$CLAUDE_PROJECT_DIR"

echo "== League Cricket Boss: session-start verification =="

if ! command -v node >/dev/null 2>&1; then
  echo "FAIL  node is not available in this environment"
  exit 0
fi
echo "node: $(node --version)"

status=0

echo ""
echo "-- Syntax check (production HTML bundles) --"
if ! node tools/check_syntax.js; then
  status=1
fi

echo ""
echo "-- test_auction_distribution.js --"
if node tools/test_auction_distribution.js; then
  echo "PASS  test_auction_distribution.js"
else
  echo "FAIL  test_auction_distribution.js"
  status=1
fi

echo ""
echo "-- test_player_stat_tracking.js --"
if node tools/test_player_stat_tracking.js; then
  echo "PASS  test_player_stat_tracking.js"
else
  echo "FAIL  test_player_stat_tracking.js"
  status=1
fi

echo ""
if [ "$status" -eq 0 ]; then
  echo "== All checks passed =="
else
  echo "== One or more checks FAILED — see above before trusting any 'it's fixed' claim =="
fi

exit 0
