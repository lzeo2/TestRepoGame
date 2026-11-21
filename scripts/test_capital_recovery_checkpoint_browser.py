#!/usr/bin/env python3
"""Focused native start/cancel/death recovery with explicit unearned initial injury.
Reuses the city browser's bounded server, native input and read-only observers.
No runtime setter is installed. The initial accepted career alone is arranged.
Run with --scenario city --capture --output <fresh-external-directory>. Add
--mission-failure for a real blast during an active mission instead of free play. This separately
seeds Rowan first intro completion to reach a combat-enabled ordinary mission.
Use --owned-safehouse instead for an actual nearby purchase before recovery.
"""
from pathlib import Path
import sys

OWNED = "--owned-safehouse" in sys.argv
if OWNED:
    sys.argv.remove("--owned-safehouse")
MISSION_FAILURE = "--mission-failure" in sys.argv
if MISSION_FAILURE:
    sys.argv.remove("--mission-failure")

BASE = Path(__file__).with_name('test_capital_city_browser.py')
source = BASE.read_text()
source = source.replace("source / 'scripts/capital-city-browser-fixture.mjs'", "source / 'scripts/test_capital_recovery_checkpoint_browser.py', source / 'scripts/test_capital_city_browser.py', source / 'scripts/capital-city-browser-fixture.mjs'")
start = source.index('    def city():')
end = source.index('    def burglary_case():', start)
source = source[:start] + '''    def city():
        baseline = record('Explicit initial injured armed career fixture')
        check(baseline['gameplay']['health'] == 1, 'Initial normal save accepts explicit injury fixture')
        check(ammo(baseline) == 72, 'Initial fixture has exactly 72 carried pistol rounds')
        capture('01-prelaunch')
        def begin():
            pulse('j')
            page.locator('#campaign-dialog').wait_for(state='visible')
            page.locator('#campaign-start').click()
            if page.locator('#cutscene-dialog').is_visible():
                page.locator('#cutscene-skip').click()
            return wait(lambda s:s['campaign']['active'] is not None, 'Native campaign Start and Skip')
        def same(a,b):
            return math.hypot(a['focus']['x']-b['focus']['x'],a['focus']['z']-b['focus']['z']) < .01 and all(a['gameplay'][k] == b['gameplay'][k] for k in ('mode','health','weapon','ammo','reserveAmmo'))
        begin()
        pulse('j')
        page.locator('#campaign-dialog').wait_for(state='visible')
        page.locator('#campaign-cancel').click()
        cancelled = wait(lambda s:s['campaign']['active'] is None, 'Native campaign Cancel')
        check(same(baseline,cancelled), 'Cancel restores exact prelaunch pose health mode weapon and ammo')
        check(cancelled['career']['cash'] == baseline['career']['cash'] and cancelled['campaign']['intros'] == baseline['campaign']['intros'], 'Cancel preserves cash and unearned progress')
        page.locator('#campaign-resume').click()
        wait(lambda s:not s['paused'], 'Return to game resumes cancelled attempt')
        page.wait_for_timeout(1000)
        check(snap()['campaign']['active'] is None, 'Cancelled mission stays inactive')
        pulse('v')
        thrown = wait(lambda s:len(s['ordnance']['projectiles']) > 0, 'Native V throws actual grenade')
        observations.append({'nativeGrenade':thrown['ordnance']})
        recovery = wait(lambda s:s['gameplay']['recovery'] is not None, 'Actual blast starts medical recovery', seconds=40)
        observations.append({'nativeRecovery':recovery['gameplay']['recovery']})
        after = wait(lambda s:s['gameplay']['recovery'] is None and s['gameplay']['health'] > 0, 'Actual medical recovery completes', seconds=45)
        check(after['gameplay']['mode'] == 'foot' and after['gameplay']['health'] == 100, 'Ordinary recovery returns healthy on foot')
        check(all(after['gameplay'][k] == baseline['gameplay'][k] for k in ('weapon','ammo','reserveAmmo')), 'Ordinary recovery retains equipped pistol and exact loaded reserve ammunition')
        check(after['interiors']['active'] is not None, 'Ordinary recovery enters a real safehouse room')
        check(after['interiors']['active']['id'] == after['storyHomes']['basement']['roomId'], 'Unowned career uses actual Milo public story safehouse')
        capture('02-safehouse-return')
        begin()
        check(snap()['campaign']['active'] is not None, 'Native explicit Start manually restarts after recovery')

''' + source[end:]
source = source.replace("fixture = json.loads(built.stdout)", "fixture = json.loads(built.stdout)\n        fixture['career']['protagonists'][fixture['hero']]['health'] = 1")
source = source.replace("'Prior wealth, equipment, checkpoint and optional Rowan intro prefix are explicit setup, not earned native progress.", "'Prior wealth, equipment, injury, checkpoint and optional Rowan intro prefix are explicit setup, not earned native progress.")
if OWNED:
    source = source.replace("        pulse('v')\n        thrown =", "        door = fixture['home']\n        approach = {'x': door['x'] - math.sin(door['yaw']) * 2, 'z': door['z'] - math.cos(door['yaw']) * 2}\n        walk(approach, tolerance=.35)\n        phone('properties')\n        cash = snap()['career']['cash']\n        page.locator('#city-buy-' + door['id']).click()\n        purchased = record('Native exact-house purchase')\n        check(door['id'] in purchased['career']['ownedProperties'] and purchased['career']['cash'] == cash - fixture['properties'][0]['price'], 'Native nearby purchase pays exact authoritative price')\n        close()\n        pulse('v')\n        thrown =")
    source = source.replace("after['storyHomes']['basement']['roomId']", "fixture['home']['id']")
    source = source.replace("Unowned career uses actual Milo public story safehouse", "Owned career prefers purchased actual nearby safehouse over public story house")
if MISSION_FAILURE:
    source = source.replace("        fixture['career']['protagonists'][fixture['hero']]['health'] = 1", "        fixture['career']['protagonists']['corporate'] = fixture['career']['protagonists']['student']\n        fixture['career']['protagonists']['student'] = None\n        fixture['hero'] = 'corporate'\n        fixture['career']['campaign']['character'] = 'corporate'\n        fixture['career']['campaign']['intros']['corporate'] = ['corporate-present-tense']\n        fixture['career']['protagonists']['corporate']['health'] = 1")
    source = source.replace("        pulse('v')\n        thrown =", "        begin()\n        pulse('v')\n        thrown =")
    source = source.replace("lambda s:s['gameplay']['recovery'] is not None, 'Actual blast starts medical recovery'", "lambda s:s['campaign']['failed'] and s['campaign']['active'] is None, 'Actual blast fails active campaign mission'")
    first = source.index("        check(after['gameplay']['mode'] == 'foot'")
    last = source.index("        capture('02-safehouse-return')", first)
    source = source[:first] + """        check(after['campaign']['active'] is None, 'Real mission knockout leaves mission inactive')
        check(same(baseline,after), 'Real mission failure restores exact prelaunch pose health mode weapon and ammo')
        check(after['career'] == baseline['career'] and after['player'] == baseline['player'], 'Real failure restores complete career economy inventory and parked car')
        page.wait_for_timeout(1800)
        check(snap()['campaign']['active'] is None, 'Failed mission waits for manual restart')
""" + source[last:]
source = source.replace("'Full selected native scenario'", "('Focused native campaign failure' if MISSION_FAILURE else 'Focused native cancel and ordinary death')")
source = source.replace("        (output / 'results.json').write_text", "        result['scenario'] = 'mission-failure' if MISSION_FAILURE else ('owned-safehouse' if OWNED else 'ordinary-recovery')\n        result['limitations'] = ['Initial prior wealth, equipment, 1 health, exterior checkpoint and optional Rowan first intro completion are explicitly seeded unearned setup.', 'All subsequent start, skip, cancel, throw and restart actions use actual DOM or keyboard input; only detached public snapshots are read.', 'Actual blast recovery proves the selected bounded case, not native campaign completion or target hardware performance.']\n        (output / 'results.json').write_text")
exec(compile(source, str(BASE), 'exec'), {'__name__':'__main__','__file__':str(BASE),'MISSION_FAILURE':MISSION_FAILURE,'OWNED':OWNED})
