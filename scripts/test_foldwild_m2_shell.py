#!/usr/bin/env python3
"""Stdlib shell ABI check only; controller actions and gameplay are not tested."""
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEGACY_IDS = set('''controls menu menu-title starter-description seed-input start continue
world-hud zone-name marks kites class-name score dex-count synergy-name save-state
 game-canvas message team-list nearby-actions interact rest collection-btn services-btn
pause new-run camera-reset quality reduce-motion world-help battle-panel player-name
player-hp player-hp-bar player-energy player-energy-bar player-status enemy-name
 enemy-hp enemy-hp-bar enemy-energy enemy-energy-bar enemy-status ability-0 ability-1
ability-2 ability-3 capture wait flee switch-list battle-log result result-title
result-description result-continue dialogue-dialog dialogue-title dialogue-text
 dialogue-start dialogue-cancel collection-dialog collection-title collection-close
ledger-search ledger-filter collection-list service-dialog service-title
service-description service-content service-close reset-dialog reset-title
reset-confirm reset-cancel'''.split())
M2_IDS = set('''ledger-inspector ledger-model-name ledger-model-host ledger-model-status
ledger-rotate-left ledger-rotate-right ledger-model-reset ledger-preview-close
release-dialog release-title release-description release-confirm release-cancel
save-now evolution-summary'''.split())


class Shell(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.nodes = []
        self.stack = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        self.nodes.append((tag, attrs, tuple(self.stack)))
        if tag not in {'meta', 'link', 'input', 'br', 'hr', 'img'}:
            self.stack.append((tag, attrs.get('id')))

    def handle_endtag(self, tag):
        assert self.stack and self.stack[-1][0] == tag, f'unbalanced {tag}'
        self.stack.pop()


class ShellContract(unittest.TestCase):
    def test_shell_abi(self):
        source = (ROOT / 'Games/Foldwild/index.html').read_text()
        shell = Shell(source)
        self.assertFalse(shell.stack)
        nodes = shell.nodes
        ids = [a['id'] for _, a, _ in nodes if 'id' in a]
        self.assertEqual(len(ids), len(set(ids)), 'duplicate IDs')
        self.assertLessEqual(LEGACY_IDS | M2_IDS, set(ids))
        by_id = {a['id']: (tag, a, parents) for tag, a, parents in nodes if 'id' in a}
        self.assertEqual(sum(tag == 'canvas' for tag, _, _ in nodes), 1)
        self.assertIn(('section', None), by_id['game-canvas'][2])
        self.assertIn('hidden', by_id['ledger-inspector'][1])
        self.assertIn('hidden', by_id['evolution-summary'][1])
        for id in M2_IDS:
            if id.startswith('ledger-'):
                self.assertIn(('dialog', 'collection-dialog'), by_id[id][2])
        self.assertLess(ids.index('ledger-filter'), ids.index('ledger-inspector'))
        self.assertLess(ids.index('ledger-inspector'), ids.index('collection-list'))
        self.assertIn(('section', 'result'), by_id['evolution-summary'][2])
        self.assertLess(ids.index('result-description'), ids.index('evolution-summary'))
        status = by_id['ledger-model-status'][1]
        self.assertEqual(status.get('role'), 'status')
        self.assertEqual(status.get('aria-live'), 'polite')
        dialog = by_id['release-dialog']
        self.assertEqual(dialog[0], 'dialog')
        self.assertEqual(dialog[1].get('aria-labelledby'), 'release-title')
        self.assertEqual(dialog[1].get('aria-describedby'), 'release-description')
        self.assertIn('<h2 id="release-title">Release ally?</h2>', source)
        self.assertIn('<p id="release-description"></p>', source)
        self.assertTrue(all(not key.startswith('on') for _, a, _ in nodes for key in a))
        self.assertEqual([(a.get('type'), a.get('src')) for tag, a, _ in nodes if tag == 'script'],
                         [('module', './script.js')])
        for tag, attrs, _ in nodes:
            if tag == 'button':
                self.assertEqual(attrs.get('type'), 'submit' if attrs.get('id') == 'service-close' else 'button')
        for attr, expected in [('data-region', ['0', '1', '2', '3', '4']),
                               ('data-slot', ['0', '1', '2', '3']),
                               ('data-starter', ['cindupp', 'dewgob', 'pithnip'])]:
            self.assertEqual([a[attr] for _, a, _ in nodes if attr in a], expected)
        css = (ROOT / 'Games/Foldwild/style.css').read_text()
        host = re.search(r'#ledger-model-host\{([^}]+)\}', css).group(1)
        self.assertIn('--scene-height:260px', host)
        self.assertIn('width:100%', host)
        self.assertIn('height:var(--scene-height)', host)
        self.assertNotIn('aspect-ratio', host)
        self.assertRegex(css, r'button\{[^}]*min-height:44px;min-width:44px')
        self.assertRegex(css, r'#game-canvas\{[^}]*height:var\(--scene-height\)')


if __name__ == '__main__':
    unittest.main()
