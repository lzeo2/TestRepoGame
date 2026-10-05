#!/usr/bin/env python3
"""Report audit coverage, not correctness/gameplay certification. Strict gate optional."""
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    games = json.loads((ROOT / 'docs/maintenance/inventory.json').read_text())['games']
    missing = []
    for game in games:
        report = ROOT / 'docs/play-flow/games' / Path(game['document']).name
        if not report.is_file():
            missing.append(game['title'])
            continue
        text = report.read_text().lower()
        assert 'source' in text and ('flow' in text) and ('bloat' in text), report
        assert 'code-review' in text or 'code review' in text or 'not runtime' in text, report
    print(f'INITIAL REPORT COVERAGE: {len(games)-len(missing)}/{len(games)}; missing {len(missing)}')
    if missing:
        print('PENDING: ' + ', '.join(missing))
    print('Coverage only; partial source ranges and opaque engines remain held. No browser/fix certification.')
    if '--require-complete' in sys.argv and missing:
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
