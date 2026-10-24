"""Reproduce bounded Git-only lane evidence. Never execute game code."""
import json
import pathlib
import posixpath
import re
import subprocess
from urllib.parse import unquote, urlsplit

BASE = 'acf759833a2cd06fb8e6c249cefe5e95c27eb9d8'
OUT = pathlib.Path('docs/maintenance/audits/registered-review/lane4')

def git(*args):
    return subprocess.check_output(['git', *args]).decode('utf-8')

def blob(path):
    return git('show', BASE + ':' + path)

catalog = json.loads(blob('games.json'))
inv = json.loads(blob('docs/maintenance/inventory.json'))
tracked = set(git('ls-tree', '-r', '--name-only', BASE).splitlines())
# Named call-site anchors are supplemented by input bindings and storage scans.
# These are source navigation receipts, not full semantic reviews.
tokens = {
169: ['startRound', 'shiftCell', 'movesEl', 'checkOrder', 'scramble', 'readBest', 'writeBest', 'renderBest'],
170: ['startRound', 'onCellActivate', 'moveCount', 'pegsLeft', 'checkEnd', 'doUndo'],
171: ['window.onload', 'Initialize()', 'Select(', 'updateHUD', 'GetPossibleMoves', 'gameOver', 'Play()'],
172: ['const init =', 'humanTurn', 'updateCounts', 'gameOver', 'endGame', 'newGame', 'timeLimit', 'enableTouch'],
174: ['function play', 'createGame', 'recordRound', 'updateHud', 'newRound', 'checkRow', "'show'", 'createAutosolver'],
175: ['function play', 'startRound', 'take(n)', 'endRound', 'updateHud', 'moverWon'],
176: ['function play', 'startRound', 'onLineClick', 'checkCompletedBoxes', 'showEndOverlay', 'className ===', 'kb-cursor'],
177: ['startGame', 'handleMove', 'updateScoreBoard', 'getWinner', 'applyMove', 'resetGame', '"D"'],
178: ['startGame', 'drawFromStock', 'autoMove', 'checkWin', 'hasAnyLegalMove', 'checkStuck', 'state.moves'],
179: ['App(window)', 'newGame', 'checkedMove', 'MoveCount', 'renderWinner', 'renderStuck', 'hasPick', 'if (!dom.picked)', 'tryEasymove'],
180: ['enterGame', 'startGame', 'hit()', 'stand()', 'doubleDown', 'endGame', 'resetGame', 'saveGameState', 'loadGameState', 'checkMilestones'],
181: ['DOMContentLoaded', 'onDealClick', 'toggleHold', 'replaceDraw', 'updateScoreDisplay', 'resetGame', 'dealNewHand', 'changeGameType', 'loadThemePreference', 'toggleTheme'],
182: ['window.onload', 'function roll', 'cellScore', 'updateCounters', 'endGame', 'restart-btn', 'checkUpperBonus'],
184: ['new GoFish', 'newGame()', '#waitForYourGuess', '#waitForYourFish', '#checkForCompleteBlocks', '#scoreline', '#difficultySelectEl'],
185: ['startGame', 'flip()', 'act()', 'roundsWon', 'updateCounts', 'showEnd'],
186: ['startTheme', 'attempt(', 'checkKbSelection', 'markFound', 'updateScore', 'showEnd', 'newGridBtn'],
188: ['newLadder', 'function commit', 'function render', 'endGame', 'chain.length', 'isComposing', 'composing'],
190: ['startGame', 'function check', 'updateHud', 'endGame', 'renderRound', 'arakter', 'w.word'],
191: ['new DartsGame', 'reset()', 'throwDart', 'endTurn', 'win()', 'lose()', 'this.score', 'dist >'],
193: ['startGame', 'onTileClick', 'activateCursor', 'removePair', 'updateHud', 'endGame', '}, 190)'],
195: ['imgPreload', 'function init', 'function go', 'doKeyDown', 'showMoveInfo', 'checkFinish', 'NextLevel', 'function Trygo', 'curMap[p2.x][p2.y]'],
}
saves = {
169: {'keys': ['p15-best'], 'purpose': 'best positive parsed move count only; not the board', 'callers': 'index.html:187-201 readBest/writeBest/renderBest; readBest callers renderBest:199 and winRound:309; writeBest only winRound:311; renderBest winRound:312 and startRound:353; startup startRound:388. Buttons:385-386 call scramble, which does not clear the key.', 'fallback': 'Shipped try/catch: read returns 0, write ignored. No cookie API or cookie-block-specific fallback. parseInt permits numeric prefixes.', 'namespace': 'Game-prefixed, unversioned origin-wide key; directories do not isolate storage. Outside-lane collisions not exhaustively excluded.'},
180: {'keys': ['bj_chips', 'bj_highest', 'bj_title'], 'purpose': 'bankroll, highest bankroll, title; not active hands', 'callers': 'script.js loadGameState:89-107, called enterGame:129 (startup:531). saveGameState:109-117 called resetGame:148, checkMilestones:199, startGame:306, endGame:491. checkMilestones callers enterGame:130 and endGame:486. Deal HTML:125 and keydown:511,527 -> startGame; reset HTML:38,48,58 -> resetGame; hit/stand/double/split/naturals converge on endGame. No other key read/write site in the tree.', 'fallback': 'Shipped read/write try/catch with warnings and default globals. Negative/prefix integers and arbitrary title accepted. Initial stake saved before deal; split/double deductions are not immediately saved. Reset retains peak/title. No cookie fallback.', 'namespace': 'bj_ prefix, unversioned, origin-wide, three non-atomic writes; partial writes possible. Outside-lane collisions not exhaustively excluded.'},
181: {'keys': ['videoPokerTheme'], 'purpose': 'theme preference only; no bankroll or hand save', 'callers': 'script.js:743-748 loadThemePreference reads at 744, top-level call:764; toggleTheme:751-758 writes at 757, theme button click binding:761. All key callers in this tree.', 'fallback': 'No shipped try/catch or cookie fallback; denied read/write can throw.', 'namespace': 'Game-specific unversioned origin-wide key. Outside-lane collisions not exhaustively excluded.'},
184: {'keys': ['difficulty'], 'purpose': 'difficulty preference only; no hands/books save', 'callers': 'index.html constructor:307 reads at 327; onchange:328 writes at 329 then offers newGame:330; newGame:354 consumes selected difficulty. new GoFish:789 -> constructor, startup newGame:790; new button:323-325 also invokes newGame.', 'fallback': 'Read unguarded; write catches. Missing/empty read defaults medium; newGame maps invalid selection to level 2. No cookie-block fallback shipped.', 'namespace': 'Generic origin-wide difficulty key: collision risk with unrelated same-origin games/preferences, even in other directories. No version or migration.'},
}
records = []
for g in catalog[65:86]:
    item = next(x for x in inv['games'] if x['id'] == g['id'])
    directory = item['directory']
    tree = git('rev-parse', BASE + ':' + directory).strip()
    entry = git('rev-parse', BASE + ':' + g['url']).strip()
    files = []
    texts = {}
    for line in git('ls-tree', '-rl', BASE, directory + '/').splitlines():
        meta, path = line.split('\t', 1)
        mode, kind, sha, size = meta.split()
        files.append({'path': path, 'blob': sha, 'bytes': int(size)})
        if path.endswith(('.html', '.js', '.css', '.md')) or path.endswith('/LICENSE'):
            texts[path] = blob(path)
    match = tree == item['tree'] and entry == item['entry_blob'] and len(files) == item['files'] and sum(x['bytes'] for x in files) == item['bytes']
    anchors = []
    storage = []
    refs = []
    notices = []
    for path, text in texts.items():
        lines = text.splitlines()
        if path.endswith(('.html', '.js')):
            for token in tokens[g['id']]:
                hits = [(n, line.strip()) for n, line in enumerate(lines, 1) if token in line]
                for n, line in hits[:7]:
                    anchors.append({'path': path, 'line': n, 'token': token, 'text': line[:180]})
            for n, line in enumerate(lines, 1):
                if re.search(r'localStorage|sessionStorage|document\.cookie|indexedDB|\.getItem\(|\.setItem\(|\.removeItem\(|\.clear\(', line):
                    storage.append({'path': path, 'line': n, 'text': line.strip()[:230]})
            # Explicit input dispatch anchors, rather than inferring controls from titles.
            hits = [(n, line.strip()) for n, line in enumerate(lines, 1) if re.search(r'keydown|onkeydown|onclick|addEventListener\([\x22\x27](click|pointer|touch)', line)]
            for n, line in hits[:18]:
                anchors.append({'path': path, 'line': n, 'token': 'input binding', 'text': line[:180]})
        # Only literal HTML and CSS loads. Script-constructed Sokoban paths added below.
        for pattern in [r'(?:src|href)\s*=\s*[\x22\x27]([^\x22\x27]+)', r'url\(\s*[\x22\x27]?([^\)\x22\x27]+)']:
            for m in re.finditer(pattern, text):
                ref = m.group(1).strip()
                if not ref or ref.startswith(('#', 'data:', 'javascript:')):
                    continue
                if '${' in ref:
                    continue
                if urlsplit(ref).scheme or ref.startswith('//'):
                    target, exists = ref, None
                else:
                    target = posixpath.normpath(posixpath.join(posixpath.dirname(path), unquote(urlsplit(ref).path))) if not ref.startswith('/') else unquote(urlsplit(ref).path).lstrip('/')
                    exists = target in tracked
                refs.append({'caller': path, 'line': text[:m.start()].count('\n') + 1, 'literal': ref, 'resolved': target, 'tracked': exists})
        if path.endswith('/LICENSE'):
            notices.append({'path': path, 'lines': len(lines), 'license': 'BSD-3-Clause' if 'BSD 3-Clause' in text else 'MIT grant present' if 'Permission is hereby granted' in text else 'review required'})
        elif path.endswith(('.html', '.md')):
            for n, line in enumerate(lines[:24], 1):
                if re.search(r'github.com|[a-f0-9]{40}|Copyright|License|licensed', line):
                    safe = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]+', '[contact omitted]', line.strip())
                    notices.append({'path': path, 'line': n, 'text': safe[:220]})
    if g['id'] == 195:
        for m in re.finditer(r'"(images/[^\x22]+)"', texts[g['url']]):
            target = directory + '/' + m.group(1)
            refs.append({'caller': g['url'], 'line': texts[g['url']][:m.start()].count('\n') + 1, 'literal': m.group(1), 'resolved': target, 'tracked': target in tracked})
    save = dict(saves.get(g['id'], {'keys': [], 'purpose': 'none; gameplay state is in memory', 'callers': 'No persistent API site found in whole shipped HTML/JS tree scan; save/history/deck helpers alone are not persistence.', 'fallback': 'none applicable', 'namespace': 'none'}))
    save.update(status='NOT VERIFIED (source only)' if g['id'] in saves else 'none', mechanism='localStorage' if g['id'] in saves else 'none', cookie_paths='none: no document.cookie read/write found', reload='NOT VERIFIED', sites=storage)
    records.append({'id': g['id'], 'title': g['title'], 'load': 'NOT VERIFIED', 'inventory_item': item, 'current': {'tree': tree, 'entry_blob': entry, 'files': len(files), 'bytes': sum(x['bytes'] for x in files)}, 'inventory_match': match, 'tracked_files': files, 'source_ranges': [{'path': p, 'scan': '1-' + str(len(t.splitlines())), 'review': 'whole-file lexical scan; selected named anchor/caller ranges inspected, not every statement semantically reviewed'} for p,t in texts.items()], 'gameplay_anchors': anchors, 'asset_references': refs, 'provenance': notices, 'save': save})
assert len(records) == 21 and all(r['inventory_match'] for r in records)
assert sum(r['save']['status'] != 'none' for r in records) == 4
assert all(a['tracked'] is not False for r in records for a in r['asset_references']), 'literal asset resolution failure'
data = {'baseline': BASE, 'catalog_count': len(catalog), 'inventory_catalog_count': inv['catalog_entries'], 'slice': [65,86], 'runtime_checks': 0, 'compiled_limit': 'No compiled game engine in these 21 trees. Readable source is not proof of gameplay. Sokoban binary sprites only identified by Git blobs; map matrices scanned, not all semantically reviewed/solved.', 'asset_limit': 'Literal HTML/CSS loads resolved against Git plus all eight Sokoban constructed image-map paths. Mastermind autosolver default lib/autosolver.js is inactive: wrapper script.js:98 passes false and engine.js:1020 returns. No runtime decode/network/offline test. Attribution links and SVG namespace URLs are not loads.', 'games': records}
encoded = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
assert len(encoded.encode()) < 270000
(OUT / 'evidence.json').write_text(encoded)
print('PASS lane4: 21 inventory tree/entry/count/byte matches; 4 persistence users; 17 none; 0 runtime')
print('PASS literal asset references:', sum(len(r['asset_references']) for r in records))
print('evidence bytes:', len(encoded.encode()))
