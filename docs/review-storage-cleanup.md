# P4 bounded storage cleanup review

Scope was limited to tracked files under `assets/thumbs/`, `docs/sweep-shots/`, and `.hermes-swarm/`, plus this report. No games, portal files, catalog, AGENTS.md, other docs, history, garbage collection, external directories, or `.swarmforge-logs/` were changed.

## Guard and inventory

Disk guard was checked before inspection:

```text
$ df -h / | tail -1
/dev/mmcblk0p2   29G   26G  2.3G  92% /
```

The candidate inventory came from the index, so it includes sparse-excluded tracked content:

```text
$ for p in assets/thumbs docs/sweep-shots .hermes-swarm; do printf '%s ' "$p"; git ls-files -- "$p" | wc -l; done
assets/thumbs 88
docs/sweep-shots 2
.hermes-swarm 31
```

Index blob sizes (`git cat-file -s :path`), not working-tree guesses:

```text
assets/thumbs: 88 files, 491283 bytes
docs/sweep-shots: 2 files, 2802527 bytes
.hermes-swarm: 31 files, 2661114 bytes
total: 5954924 bytes
```

## Reference checks

All reference searches used `git grep --cached`, which searches tracked index content including sparse-excluded files. Exact candidate basenames were checked across tracked documentation and source.

### `assets/thumbs/`

The live portal constructs the thumbnail path from the `THUMBS` map:

```text
$ git grep --cached -I -n -F -e 'THUMBS' -e "'./assets/thumbs/' + slug + '.jpg'" -- assets/portal-ux.js
assets/portal-ux.js:150:  var THUMBS = {
assets/portal-ux.js:213:    var slug = THUMBS[title];
assets/portal-ux.js:214:    return slug ? './assets/thumbs/' + slug + '.jpg' : null;
```

The map has 59 entries and 50 unique values; all 50 corresponding tracked files exist. The other 38 files are the orphan set documented by the historical sweep audit. Exact basename checks against tracked `docs/` content found a documentation hit for every one:

```text
$ python3 - <<'PY'
import subprocess
orphans = "2048 ageofwar bossrush brickdash connectfour crossyroad flappybird fps fruitninja geometryrash gridheist hangman helixjump hextris houseofhazards lastlantern letterboxed lightsout matchflip mathquiz memory minesweeper paddleduel pong poorbunny queueescape qwop simonsays starcatcher storyadventure sudoku tetris thumbfighter tictactoe tilemerge typingspeed whackamole wordle".split()
missing = [b for b in orphans if subprocess.run(["git", "grep", "--cached", "-I", "-l", "-F", "-e", b, "--", "docs"], capture_output=True).returncode]
print("orphan basenames checked:", len(orphans))
print("docs basename hits:", len(orphans) - len(missing))
print("missing docs hits:", missing)
PY
orphan basenames checked: 38
docs basename hits: 38
missing docs hits: []
```

The 38 retained basenames are:

```text
2048 ageofwar bossrush brickdash connectfour crossyroad flappybird fps
fruitninja geometryrash gridheist hangman helixjump hextris houseofhazards
lastlantern letterboxed lightsout matchflip mathquiz memory minesweeper
paddleduel pong poorbunny queueescape qwop simonsays starcatcher storyadventure
sudoku tetris thumbfighter tictactoe tilemerge typingspeed whackamole wordle
```

The audit explicitly identifies them as orphan thumbnails, but that historical/audit reference is not treated as proof that they are unreferenced for this cleanup. They are retained. The 50 mapped files are also retained because the live portal can construct their paths.

### `docs/sweep-shots/`

Both tracked screenshots have exact path references in tracked historical/audit docs:

```text
$ git grep --cached -I -n -F -e 'docs/sweep-shots/portal-filters-after.png' -e 'docs/sweep-shots/portal-load.png' -- ':!docs/sweep-shots' | grep -E 'hygiene-w5.md:(53|54)|sweep-workerB.md:10|sweep-workerF1.md:90'
docs/hygiene-w5.md:53:docs/sweep-shots/portal-filters-after.png
docs/hygiene-w5.md:54:docs/sweep-shots/portal-load.png
docs/sweep-workerB.md:10:- Full-page screenshot: `docs/sweep-shots/portal-load.png` (1400×9207).
docs/sweep-workerF1.md:90:- Screenshot (desktop, all 13 chips with counts): `docs/sweep-shots/portal-filters-after.png`
```

These paths are retained under the historical/audit-doc rule.

### `.hermes-swarm/`

The tracked audit report refers to the directory and its contents, including an explicit entire-directory candidate:

```text
$ git grep --cached -I -n -F -e '.hermes-swarm/' -- ':!.hermes-swarm' | cut -d: -f1-2 | sort -u
docs/sweep-workerE.md:14
docs/sweep-workerE.md:34
docs/sweep-workerE.md:71
```

This is historical/audit evidence, not live-consumer proof. Per the requested rule, all 31 tracked paths are retained rather than deleting based on that report. The ignored `.swarmforge-logs/` directory was not deleted or otherwise touched:

```text
$ git status --short --ignored -- .swarmforge-logs
!! .swarmforge-logs/
```

## Result

No candidate met the requested safe-deletion bar after applying the historical/audit-document retention rule. No file was deleted and no portal or game reference was edited.

- Files removed: `0`
- Bytes reclaimed from the working tree: `0`
- Current candidate bytes retained: `5,954,924`
- Git blobs remain in repository history regardless; no history rewrite or garbage collection was attempted.
- This run did not add a game and did not self-make or edit any game.
