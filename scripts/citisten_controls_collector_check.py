"""Source/pure-fixture collector regression, NOT Chrome/native input or GPU proof.
Run: python3 -B scripts/citisten_controls_collector_check.py
Only fixture callbacks model DOM focus and summary toggles; no product writes.
"""
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('controls_qa', ROOT / 'Games/Citisten3D/river-upgrade-qa.py')
qa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(qa)


class Controls:
    """Pure CPU model, not an assertion about Chromium's native behavior."""
    def __init__(self, *, opened=False, fault=None, legacy=False):
        self.opened, self.fault, self.legacy = opened, fault, legacy
        self.focus, self.index = 'world', 1
        self.values = ['0', '1', '3', '10']
        self.speed = 1
        self.keys, self.stages = [], []
        self.toggles = []

    def observe(self, stage):
        self.stages.append(stage)
        if len(self.stages) > 160:
            raise RuntimeError('collector exceeded pure-fixture observation budget')
        sample = dict(activeId=self.focus, activeTag='SELECT' if self.focus == 'speed' else 'SUMMARY' if self.focus == 'summary' else 'BUTTON',
                      documentFocused=True, tutorialOpen=False,
                      selectedSpeed=self.values[self.index], selectedIndex=self.index,
                      values=list(self.values), speed=self.speed)
        if not self.legacy:
            sample.update(speedControlsOpen=self.opened,
                          activeSpeedControlsSummary=self.focus == 'summary')
        return sample

    def press(self, key):
        self.keys.append(key)
        if len(self.keys) > 128:
            raise RuntimeError('collector exceeded pure-fixture key budget')
        if key in ('Tab', 'Shift+Tab'):
            if self.legacy:
                order = ['world', 'speed']
            elif self.fault == 'missingSummary':
                order = ['world', 'other']
            else:
                order = ['world', 'summary'] + (['camera', 'speed', 'weather'] if self.opened else []) + ['other']
            leaving = self.focus == 'speed'
            self.focus = order[(order.index(self.focus) + (1 if key == 'Tab' else -1)) % len(order)]
            if leaving and self.fault == 'blurSpeedMutation':
                self.index, self.speed = 1, 1
        elif key == 'Enter':
            if self.focus != 'summary':
                raise RuntimeError('fixture received Enter outside the Controls summary')
            if (not self.opened and self.fault == 'refusedSummaryOpen') or (self.opened and self.fault == 'refusedClose'):
                return
            self.opened = not self.opened
            self.toggles.append(self.opened)
        else:
            if key not in ('ArrowDown', 'ArrowUp') or self.focus != 'speed':
                raise RuntimeError('fixture received non-select arrow or unsupported key')
            self.index += 1 if key == 'ArrowDown' else -1
            if not 0 <= self.index < len(self.values):
                raise RuntimeError('fixture received out-of-range arrow')
            self.speed = int(self.values[self.index])
            if self.fault == 'focusTheft':
                self.focus = 'world'

    def collect(self, value):
        self.keys.clear()
        self.stages.clear()
        qa.native_speed(self.press, self.observe, value)


def main():
    # Existing exact legacy key assertions and negative-path checks stay intact.
    qa.self_test()
    legacy = Controls(legacy=True)
    old_keys = [
        (0, ['Tab', 'ArrowUp', 'Tab']),
        (1, ['Tab', 'ArrowDown', 'Tab']),
        (3, ['Tab', 'ArrowDown', 'Tab']),
        (10, ['Tab', 'ArrowDown', 'Tab']),
        (0, ['Tab', 'ArrowUp', 'ArrowUp', 'ArrowUp', 'Tab']),
    ]
    for value, keys in old_keys:
        legacy.collect(value)
        assert legacy.keys == keys, (value, legacy.keys)
        assert legacy.stages == [f'beforeSpeed:{value}', 'afterTab'] + ['afterArrow'] * (len(keys) - 2) + [f'afterSpeedTabCommit:{value}']
    print('PASS legacy absent fields: exact old keys AND observation stages')

    for initially_open in (False, True):
        fixture = Controls(opened=initially_open)
        for value in (0, 1, 3, 10, 10, 0, 0, 1, 3, 10):
            before = len(fixture.toggles)
            fixture.collect(value)
            assert fixture.opened is initially_open
            assert fixture.values[fixture.index] == str(value) and fixture.speed == value
            assert fixture.focus != 'speed'
            toggles = fixture.toggles[before:]
            assert toggles == ([] if initially_open else [True, False]), toggles
            if initially_open:
                assert 'Enter' not in fixture.keys and 'Shift+Tab' not in fixture.keys
            else:
                assert fixture.keys.count('Enter') == 2 and 'Shift+Tab' in fixture.keys
        print('PASS pure fixture: speeds 0/1/3/10 repeated; initially ' + ('open preserved' if initially_open else 'closed restored'))

    for fault in ('refusedSummaryOpen', 'missingSummary', 'focusTheft', 'blurSpeedMutation', 'refusedClose'):
        fixture = Controls(fault=fault)
        try:
            fixture.collect(0)
        except AssertionError:
            pass
        else:
            raise AssertionError('false acceptance: ' + fault)
        assert len(fixture.keys) <= 128 and len(fixture.stages) <= 160
        if fault in ('refusedSummaryOpen', 'missingSummary'):
            assert not fixture.opened and not any(key.startswith('Arrow') for key in fixture.keys)
        if fault == 'refusedClose':
            assert fixture.opened and fixture.speed == 0
        print(f'PASS bounded rejection {fault}: {len(fixture.keys)} keys/{len(fixture.stages)} observations')
    print('CONTROLS COLLECTOR PASS: source/pure-fixture only; NOT Chrome/native behavior, GPU, gameplay or acceptance proof; no browser/server launched')


if __name__ == '__main__':
    main()
