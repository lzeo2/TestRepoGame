"""Current integrated roster, distinct from the four historical standalone ranges."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KIT_FILES = ('jank3d-hero-kits.json', 'jank3d-ribbon-seraph-kit.json', 'jank3d-trio-kits.json')
KITS = [hero for name in KIT_FILES
        for hero in json.loads((ROOT / 'docs' / name).read_text())['heroes']]
HERO_IDS = tuple(kit['id'] for kit in KITS)
assert len(HERO_IDS) == len(set(HERO_IDS)) == 8
MODEL_IDS = set(HERO_IDS) | {'deployed_stapler', 'trooper'}
P_HERO_IDS = HERO_IDS[:4]  # Only these heroes have concept-comparison fixtures.


def runtime_hashes(root=ROOT):
    """Conservative local runtime/runner closure, not an old-receipt repair."""
    game = root / 'Games/Jankolock3D'
    paths = {p for p in game.rglob('*') if p.is_file() and p.suffix in
             {'.mjs', '.js', '.html', '.css', '.py', '.json', '.glb', '.png'}}
    # Explicit required inputs fail closed if deleted instead of vanishing from a glob.
    paths.update(root / 'docs' / name for name in KIT_FILES)
    paths.update(game / name for name in ('qa_roster.py', 'portrait-config.json', 'models/portrait_relief.glb'))
    for model in MODEL_IDS:
        names = ('model.glb', 'receipt.json') if model == 'trooper' else (
            'model.glb', 'receipt.json', 'manifest.json', 'palette.json', 'rig.json')
        paths.update(game / 'models' / model / name for name in names)
    paths.update(root / 'assets/fonts' / name for name in (
        'bungee/bungee-400-latin.woff2',
        'atkinson-hyperlegible/atkinson-hyperlegible-400-latin.woff2',
        'atkinson-hyperlegible/atkinson-hyperlegible-700-latin.woff2'))
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(paths)}
