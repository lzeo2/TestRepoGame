"""Browser-free roster/runner regression: python3 -B Games/Jankolock3D/qa-roster-test.py."""
import ast
import contextlib
import io
from pathlib import Path
import runpy
import sys
import tempfile
from unittest.mock import patch
from qa_roster import HERO_IDS, KITS, MODEL_IDS, ROOT, runtime_hashes

BASE = Path(__file__).resolve().parent
assert set(HERO_IDS) == {'stampead', 'turretina', 'snipeoff', 'gooey', 'ribbon-seraph',
                         'spoollash', 'checkmate-regent', 'prism-warden'}
assert MODEL_IDS == set(HERO_IDS) | {'trooper', 'deployed_stapler'}
assert all({a['slot'] for a in kit['abilities']} == {1, 2, 3, 4} for kit in KITS)
# Evaluate the real runner assertions with observed browser-shaped data. Missing
# or unexpected cards/models must still fail; do not replace exact checks by >=.
class Cards:
    def __init__(self, ids): self.ids = ids
    def evaluate_all(self, expression): return self.ids
class Page:
    def __init__(self, ids): self.ids = ids
    def locator(self, selector):
        assert selector == '[data-hero]'
        return Cards(self.ids)

for name, expected in [('integration-qa.py', 'HERO_IDS'), ('theme-qa.py', 'HERO_IDS'),
                       ('letter-qa.py', 'MODEL_IDS'), ('external-model-qa.py', 'MODEL_IDS')]:
    tree = ast.parse((BASE / name).read_text())
    checks = [node.test for node in ast.walk(tree) if isinstance(node, ast.Assert)
              and expected in ast.unparse(node.test)]
    assert len(checks) == 1, name
    expression = compile(ast.Expression(checks[0]), name, 'eval')
    ids = list(HERO_IDS if expected == 'HERO_IDS' else MODEL_IDS)
    for observed, passes in [(ids, True), (ids[:-1], False), (ids + ['unexpected'], False),
                             ([i for i in ids if i not in {'ribbon-seraph', 'spoollash', 'checkmate-regent', 'prism-warden'}], False)]:
        snapshot = {'models': [{'id': i} for i in observed]}
        assert eval(expression, {'HERO_IDS': HERO_IDS, 'MODEL_IDS': MODEL_IDS,
                                'page': Page(observed), 'snap': snapshot,
                                'state': lambda: snapshot}) is passes, name
letter = (BASE / 'letter-qa.py').read_text()
assert 'choices=HERO_IDS' in letter
assert "elif letter == 'E':\n                    kits = KITS" in letter
assert '384 * len(kits)' in letter, 'all eight contact-sheet rows fit'
print('PASS QA roster: eight kits/32 slots/ten models; four runner exact checks reject missing/extra/legacy roster; native E choices and sheet wired')

runner = runpy.run_path(str(BASE / 'letter-qa.py'))
for hero in HERO_IDS:
    assert runner['parse_args'](['E', '--hero', hero]).hero == hero
    if hero in HERO_IDS[:4]:
        assert runner['parse_args'](['P', '--hero', hero]).hero == hero
    else:
        # Exercise actual main: rejection must precede guards, browser imports,
        # server construction and any output directory/report work.
        with patch.object(sys, 'argv', ['letter-qa.py', 'P', '--hero', hero]), contextlib.redirect_stderr(io.StringIO()) as err:
            with patch.dict(runner['main'].__globals__, {'guard': lambda: (_ for _ in ()).throw(AssertionError('guard reached'))}):
                try:
                    runner['main']()
                except SystemExit as error:
                    assert error.code == 2
                else:
                    raise AssertionError('unsupported P hero accepted')
            assert 'P has concept-comparison fixtures only for:' in err.getvalue()
for missing in ['screenshots', 'checks', 'responses']:
    report = {'screenshots': [1], 'checks': {'case': 1}, 'responses': [200]}
    runner['require_current_evidence'](report)
    report[missing] = []
    try:
        runner['require_current_evidence'](report)
    except AssertionError:
        pass
    else:
        raise AssertionError('empty current-run evidence accepted')
assert "require_current_evidence(report)\n                assert not report['errors']" in letter
print('PASS QA letters: unsupported P heroes exit 2 before preflight; E accepts all eight; empty current-run evidence rejected')

# Extract the real selectors without importing browser dependencies or starting
# their runners. Execute against tiny text fixtures in shared memory, not assets.
selectors = []
for name, function in [('letter-qa.py', 'hashes'), ('integration-qa.py', 'source_hashes'),
                       ('external-model-qa.py', 'current_hashes')]:
    tree = ast.parse((BASE / name).read_text())
    node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == function)
    selectors.append((name, compile(ast.Module(body=[node], type_ignores=[]), name, 'exec'), function))
actual = runtime_hashes()
required = {'docs/' + name for name in ('jank3d-hero-kits.json', 'jank3d-ribbon-seraph-kit.json', 'jank3d-trio-kits.json')}
required |= {'Games/Jankolock3D/' + name for name in ('qa_roster.py', 'portrait-config.json')}
for hero in MODEL_IDS - {'trooper'}:
    required |= {f'Games/Jankolock3D/models/{hero}/{name}.json' for name in ('manifest', 'palette', 'rig', 'receipt')}
required |= {p.relative_to(ROOT).as_posix() for p in (BASE / 'textures').rglob('*.png')}
required |= {'assets/fonts/' + name for name in ('bungee/bungee-400-latin.woff2',
             'atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2',
             'atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2')}
assert any('/textures/environment/' in name for name in required)
assert required <= actual.keys(), required - actual.keys()
with tempfile.TemporaryDirectory(dir='/dev/shm', prefix='jank-qa-hash-') as directory:
    root = Path(directory)
    for name in actual:
        path = root / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_text('base')
    for name, code, function in selectors:
        namespace = {'ROOT': root, 'runtime_hashes': runtime_hashes}
        exec(code, namespace)
        select = namespace[function]
        baseline = select()
        assert set(baseline) == set(actual), name
        for relative in required:
            path = root / relative
            path.write_text('changed')
            changed = select()
            assert changed[relative] != baseline[relative] and changed != baseline, (name, relative)
            path.write_text('base')
        for relative in ['docs/jank3d-trio-kits.json', 'Games/Jankolock3D/qa_roster.py',
                         'Games/Jankolock3D/models/ribbon-seraph/rig.json']:
            path = root / relative; path.unlink()
            try:
                select()
            except FileNotFoundError:
                pass
            else:
                raise AssertionError((name, 'missing required input accepted', relative))
            path.write_text('base')
print('PASS QA hashes: three real selectors pin kits/sidecars/config/helper/textures/fonts; mutations change hashes; required missing inputs fail closed')
