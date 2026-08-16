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
echo "-- test_firebase_listener_isolation.js --"
if node tools/test_firebase_listener_isolation.js; then
  echo "PASS  test_firebase_listener_isolation.js"
else
  echo "FAIL  test_firebase_listener_isolation.js"
  status=1
fi

echo ""
echo "-- test_sp_prematch_cancel.js --"
if node tools/test_sp_prematch_cancel.js; then
  echo "PASS  test_sp_prematch_cancel.js"
else
  echo "FAIL  test_sp_prematch_cancel.js"
  status=1
fi

echo ""
echo "-- test_mp_toss.js --"
if node tools/test_mp_toss.js; then
  echo "PASS  test_mp_toss.js"
else
  echo "FAIL  test_mp_toss.js"
  status=1
fi

echo ""
echo "-- test_mp_quicksim.js --"
if node tools/test_mp_quicksim.js; then
  echo "PASS  test_mp_quicksim.js"
else
  echo "FAIL  test_mp_quicksim.js"
  status=1
fi

echo ""
echo "-- test_mp_resume.js --"
if node tools/test_mp_resume.js; then
  echo "PASS  test_mp_resume.js"
else
  echo "FAIL  test_mp_resume.js"
  status=1
fi

echo ""
if [ "$status" -eq 0 ]; then
  echo "== All checks passed =="
else
  echo "== One or more checks FAILED — see above before trusting any 'it's fixed' claim =="
fi

exit 0
