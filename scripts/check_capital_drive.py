#!/usr/bin/env python3
"""Run bounded Capital Drive syntax and pure regressions; optionally browser QA.

No installation, source regeneration, save resets, maintenance refresh or push.
Browser artifacts require an explicit output directory outside the repository.
"""
import argparse
import json
import os
from pathlib import Path
import shlex
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
GAME = Path('Games/Capital Drive')
MODULES = (
    'car-model.js', 'parked-cars-view.js', 'driving-dynamics.js', 'car-camera.js', 'jetpack.js', 'jetpack-view.js', 'nitro-stations.js', 'nitro-view.js',
    'petrol-forecourts.js', 'car-rental.js', 'rental-storefronts.js', 'rental-storefronts-view.js', 'service-map-icons.js',
    'house-controller.js', 'delivery-service.js', 'delivery-view.js', 'vehicle-flight.js', 'stunt-ramps.js', 'stunt-ramps-view.js', 'airport-road-details.js',
    'burglary.js',
    'headlights-view.js', 'police-support.js', 'police-support-view.js', 'police-stations.js', 'police-station-view.js', 'safehouse-storage.js', 'city-ui.js',
    'drone.js', 'drone-view.js', 'security-cameras.js', 'security-cameras-view.js',
    'covered-passage.js',
    'water-contact.js', 'watercraft.js', 'watercraft-view.js',
    'light-rail.js', 'light-rail-source.js', 'light-rail-view.js', 'heist-sites.js', 'heist-sites-view.js', 'heist-activities.js',
    'war-memorial.js', 'war-memorial-data.js', 'war-memorial-view.js', 'birds-view.js',
    'regional-expansion.js', 'residential-expansion.js', 'regional-landmarks-view.js',
    'anu-campus-data.js', 'anu-campus.js', 'anu-campus-view.js', 'macquarie-shops-view.js',
    'skyline-job.js', 'skyline-opponents.js', 'skyline-site-view.js', 'skyline-cover.js', 'skyline-atv.js', 'skyline-atv-view.js',
    'skyline-pressure.js', 'skyline-pressure-view.js', 'skyline-support.js', 'skyline-backup.js',
    'campaign-world.js', 'campaign-aftermath.js', 'career-reset.js', 'free-roam-gear.js', 'depot-tank.js',
    'ballistics.js', 'shot-obstacles.js', 'recon.js', 'camera-control.js', 'foot-motion.js', 'safehouse-recovery.js',
    'aircraft.js', 'aircraft-view.js', 'stealth-contracts.js', 'stealth-contracts-view.js',
    'hero-powers.js', 'ordnance.js', 'ordnance-view.js', 'atmosphere.js', 'atmosphere-view.js', 'airport.js', 'airport-view.js', 'defence-depot.js', 'defence-depot-view.js', 'vehicle-damage.js', 'vehicle-damage-view.js',
    'touch-joystick.js',
    'tutorial.js', 'activity-ui.js',
    'script.js', 'game-data.js', 'dev-missions.js', 'interior-navigation.js', 'police-rooms.js', 'cache-launcher.js', 'cache-client.js', 'cache-manifest.js', 'service-worker.js', 'protagonist-state.js', 'render-gate.js', 'graphics-diagnostics.js', 'cutscenes.js', 'mission-locations.js', 'simulation.js', 'navigation.js', 'map-projection.js', 'navigation-guidance.js', 'road-guidance-view.js', 'traffic-lights.js', 'traffic-lights-view.js', 'equipment.js', 'equipment-view.js',
    'world-view.js', 'foliage-placement.js', 'exterior-materials.js', 'neighbourhood.js', 'person-model.js', 'wildlife-view.js', 'street-assets.js', 'street-assets-view.js', 'highway-barriers.js', 'highway-barriers-view.js', 'local-details-view.js', 'character-start.js', 'campaign-scenes.js', 'campaign-scenes-view.js', 'assassination-mission.js', 'assassination-site-view.js', 'contract-target.js', 'contract-stealth.js', 'pedestrians.js', 'gameplay.js', 'ride-service.js', 'ride-service-view.js',
    'progression.js', 'actor-view.js', 'landmarks.js', 'landmarks-view.js',
    'address-search.js', 'street-ui.js', 'road-network.js', 'police.js',
    'buses.js', 'bus-view.js', 'vehicle-occupants-view.js', 'districts.js',
    'services.js', 'services-view.js', 'stores.js', 'storefronts-view.js', 'traffic-view.js', 'vehicle-contact-shadow.js',
    'shopping-precincts.js','shopping-view.js','suburb-character.js','campus.js','campus-view.js',
    'interiors.js','interior-view.js','campaign.js','map-expansion.js','north-west.js', 'north-places-view.js', 'drive-audio.js','terrain.js','civic-view.js','noodle-shop-view.js','interior-people.js','interior-people-view.js','interior-activities.js','micromobility.js','micromobility-view.js','weapons.js','parking-layout.js','street-dealers.js','street-dealers-view.js','vehicle-challenges.js','civic-extras.js','civic-extras-view.js',
)
SUITES = (
    'test_capital_parked_cars_view.mjs', 'test_capital_contact_levels.mjs',
    'test_capital_bridge_support_selection.mjs', 'test_capital_actor_vehicle_escape.mjs', 'test_capital_car_model.mjs',
    'test_capital_regional_expansion.mjs', 'test_capital_regional_landmarks_view.mjs',
    'test_capital_regional_water.mjs', 'test_capital_regions_actual.mjs',
    'test_capital_gallery_contract.mjs', 'test_capital_jetpack_collision.mjs', 'test_capital_foliage_lighting.mjs',
    'test_capital_war_memorial.mjs', 'test_capital_birds_view.mjs', 'test_capital_bus_passenger_service.mjs',
    'test_capital_campaign_resolution.mjs', 'test_capital_interior_styles.mjs', 'test_capital_stealth_retry.mjs',
    'test_capital_vehicle_variety.mjs',
    'test_capital_driving_dynamics.mjs', 'test_capital_car_camera.mjs', 'test_capital_driving_shake.mjs', 'test_capital_foot_motion.mjs', 'test_capital_jetpack.mjs', 'test_capital_nitro_stations.mjs', 'test_capital_defence_depot.mjs',
    'test_capital_nitro_view.mjs', 'test_capital_car_rental.mjs', 'test_capital_rental_storefronts.mjs', 'test_capital_service_map_icons.mjs',
    'test_capital_delivery_actual.mjs', 'test_capital_job_cargo.mjs', 'test_capital_burglary_session.mjs', 'test_capital_jobs_rest.mjs', 'test_capital_delivery_service.mjs', 'test_capital_delivery_transactions.mjs', 'test_capital_house_stations.mjs', 'test_capital_house_controller.mjs', 'test_capital_static_occupancy.mjs', 'test_capital_airport_terrain.mjs', 'test_capital_stunt_ramps.mjs', 'test_capital_airport_details.mjs', 'test_capital_vehicle_flight.mjs',
    'test_capital_escape_objectives.mjs', 'test_capital_escape_navigation.mjs', 'test_capital_static_body_queries.mjs', 'test_capital_vehicle_overlap_scalars.mjs', 'test_capital_fast_pursuit.mjs', 'test_capital_yard_fit.mjs',
    'test_capital_burglary.mjs', 'test_capital_burglary_economy.mjs', 'test_capital_house_footprints.mjs', 'test_capital_footprint_navigation.mjs',
    'test_capital_bridge_vehicle_layers.mjs', 'test_capital_vehicle_support_views.mjs', 'test_capital_inventory_persistence.mjs', 'test_capital_hired_health.mjs',
    'test_capital_camera_wanted.mjs',
    'test_capital_external_vehicle_damage.mjs', 'test_capital_indoor_navigation_load.mjs',
    'test_capital_navigation_search.mjs', 'test_capital_hired_crew.mjs', 'test_capital_crew_interiors.mjs',
    'test_capital_city_controller.mjs', 'test_capital_bridge_roads.mjs', 'test_capital_bridge_approaches.mjs', 'test_capital_bridge_road_bands.mjs', 'test_capital_vehicle_bullets.mjs',
    'test_capital_crime_chapters.mjs', 'test_capital_headlights.mjs', 'test_capital_police_escalation.mjs', 'test_capital_police_replacements.mjs', 'test_capital_police_stations.mjs',
    'test_capital_safehouse_commerce.mjs', 'test_capital_drones.mjs', 'test_capital_drone_night_vision.mjs', 'test_capital_drone_strike.mjs', 'test_capital_security_cameras.mjs',
    'test_capital_civilian_damage.mjs', 'test_capital_grenade_detonation.mjs', 'test_capital_explosion_feedback.mjs', 'test_capital_covered_passage.mjs',
    'test_capital_covered_road_routes.mjs',
    'test_capital_shop_staff.mjs', 'test_capital_campaign_playability.mjs', 'test_capital_campaign_aviation.mjs',
    'test_capital_campaign_stealth.mjs', 'test_capital_campaign_assassination.mjs', 'test_capital_contract_target.mjs', 'test_capital_contract_stealth.mjs', 'test_capital_assassination_site_view.mjs', 'test_capital_stealth_contracts.mjs', 'test_capital_stealth_contracts_view.mjs',
    'test_capital_campaign_world.mjs', 'test_capital_campaign_aftermath.mjs', 'test_capital_career_reset.mjs', 'test_capital_free_roam_gear.mjs',
    'test_capital_light_rail.mjs', 'test_capital_light_rail_view.mjs', 'test_capital_anu.mjs', 'test_capital_macquarie_shops_view.mjs',
    'test_capital_skyline_job.mjs', 'test_capital_skyline_opponents.mjs', 'test_capital_skyline_site_view.mjs',
    'test_capital_skyline_cover.mjs', 'test_capital_skyline_atv.mjs',
    'test_capital_skyline_pressure.mjs', 'test_capital_skyline_pressure_view.mjs',
    'test_capital_skyline_support.mjs', 'test_capital_skyline_backup.mjs',
    'test_capital_residential.mjs', 'test_capital_bridge_clearance.mjs', 'test_capital_canberra_coverage.mjs',
    'test_capital_molonglo.mjs', 'test_capital_west_belconnen.mjs',
    'test_capital_heist_sites.mjs', 'test_capital_heist_activities.mjs', 'test_capital_hostage_activities.mjs', 'test_capital_tower_heist.mjs', 'test_capital_heist_interiors.mjs', 'test_capital_depot_aircraft.mjs', 'test_capital_traffic_cut_in.mjs',
    'test_capital_local_recovery.mjs', 'test_capital_safehouse_recovery.mjs', 'test_capital_campaign_retry.mjs', 'test_capital_campaign_retry_checkpoints.mjs', 'test_capital_mission_steps.mjs', 'test_capital_retry_controller.mjs', 'test_capital_water_contact.mjs',
    'test_capital_collision_cache.mjs', 'test_capital_ballistics.mjs', 'test_capital_recon.mjs', 'test_capital_recon_heists.mjs',
    'test_capital_pink_victory.mjs', 'test_capital_adult_shot_targets.mjs', 'test_capital_combat_presentation.mjs',
    'test_capital_evidence_activity.mjs', 'test_capital_camera_control.mjs', 'test_capital_combat_controller.mjs', 'test_capital_dynamic_shot_cover.mjs',
    'test_capital_airport_ground.mjs', 'test_capital_aircraft.mjs', 'test_capital_aircraft_controller.mjs', 'test_capital_aircraft_checkpoints.mjs',
    'test_capital_signed_for.mjs', 'test_capital_crew_seats.mjs', 'test_capital_npc_ragdoll.mjs', 'test_capital_mission_ally_switch.mjs', 'test_capital_garage_mods.mjs', 'test_capital_ordnance.mjs', 'test_capital_throwable_economy.mjs', 'test_capital_campaign_expansion.mjs', 'test_capital_airport.mjs', 'test_capital_hero_powers.mjs', 'test_capital_atmosphere.mjs', 'test_capital_backyards.mjs', 'test_capital_blast_people.mjs', 'test_capital_vehicle_damage.mjs', 'test_capital_extension_integration.mjs',
    'test_capital_touch_joystick.mjs', 'test_capital_touch_controller.mjs',
    'test_capital_tutorial.mjs', 'test_capital_tutorial_controller.mjs', 'test_capital_activity_ui.mjs',
    'test_capital_vehicle_impacts.mjs', 'test_capital_ragdoll.mjs',
    'test_capital_mission_hud.mjs', 'test_capital_north_west.mjs', 'test_capital_giant_spray.mjs', 'test_capital_north_places_view.mjs', 'test_capital_drive_audio.mjs', 'test_capital_swimming.mjs', 'test_capital_watercraft.mjs', 'test_capital_watercraft_actual.mjs', 'test_capital_watercraft_view.mjs',
    'test_capital_game_data.mjs', 'test_capital_dev_missions.mjs',
    'test_capital_interior_navigation.mjs', 'test_capital_police_rooms.mjs',
    'test_capital_cache.mjs', 'test_capital_protagonist_state.mjs', 'test_capital_character_switching.mjs', 'test_capital_collision_performance.mjs', 'test_capital_render_gate.mjs', 'test_capital_graphics_diagnostics.mjs',
    'test_capital_mission_locations.mjs', 'test_capital_world_streaming.mjs', 'test_capital_foliage_placement.mjs', 'test_capital_neighbourhood_streaming.mjs', 'test_capital_cutscenes.mjs', 'test_capital_drive.mjs', 'test_capital_pedestrians.mjs', 'test_capital_spawn.mjs', 'test_capital_starter.mjs', 'test_capital_signals.mjs', 'test_capital_signals_view.mjs', 'test_capital_guidance.mjs', 'test_capital_road_guidance_view.mjs', 'test_capital_traffic_body_clearance.mjs', 'test_capital_ambient_routes.mjs', 'test_capital_ride_driving.mjs', 'test_capital_bus_boarding.mjs', 'test_capital_equipment.mjs', 'test_capital_vehicle_contacts.mjs', 'test_capital_hold_ups.mjs', 'test_capital_crime_people.mjs',
    'test_capital_street_assets.mjs', 'test_capital_suburb_life.mjs', 'test_capital_local_details.mjs', 'test_capital_highway_barriers.mjs', 'test_capital_major_roads.mjs', 'test_capital_gym_equipment.mjs', 'test_capital_bus_stops.mjs', 'test_capital_character_starts.mjs', 'test_capital_campaign_scenes.mjs',
    'test_capital_neighbourhood.mjs', 'test_capital_world.mjs', 'test_capital_exterior_materials.mjs', 'test_capital_person_model.mjs', 'test_capital_vehicle_people.mjs',
    'test_capital_geodata.mjs', 'test_capital_map.mjs',
    'test_capital_gameplay.mjs', 'test_capital_progression.mjs',
    'test_capital_actors.mjs', 'test_capital_landmarks.mjs', 'test_capital_ride_service.mjs', 'test_capital_ride_view.mjs', 'test_capital_yoober_economy.mjs', 'test_capital_low_detail.mjs',
    'test_capital_addresses.mjs', 'test_capital_roads.mjs', 'test_capital_buses.mjs',
    'test_capital_police.mjs', 'test_capital_occupants.mjs', 'test_capital_services.mjs',
    'test_capital_services_view.mjs', 'test_capital_stores.mjs', 'test_capital_storefronts.mjs',
    'test_capital_traffic_view.mjs', 'test_capital_sites.mjs',
    'test_capital_shopping.mjs','test_capital_campus.mjs','test_capital_interiors.mjs',
    'test_capital_campaign.mjs','test_capital_north.mjs','test_capital_terrain.mjs','test_capital_civic.mjs','test_capital_crossings.mjs','test_capital_noodle_shop.mjs','test_capital_interior_people.mjs','test_capital_interior_activities.mjs','test_capital_micromobility.mjs','test_capital_civic_extras.mjs','test_capital_work_jobs.mjs','test_capital_skate_opening.mjs','test_capital_dev_codes.mjs','test_capital_vehicle_challenges.mjs','test_capital_car_theft.mjs','test_capital_scooter_hack.mjs','test_capital_weapons.mjs','test_capital_weapon_economy.mjs','test_capital_weapon_art.mjs','test_capital_street_dealers.mjs','test_capital_npc_routines.mjs','test_capital_traffic_queues.mjs','test_capital_junction_queues.mjs',
)
DATA = ('airport-terrain.json', 'canberra.json', 'geodata-validation.json', 'addresses.json', 'road-profiles.json', 'stores.json','shopping-precincts.json','canberra-north.json','north-terrain.json','north-west.json','north-west-terrain.json','civic-extras.json','traffic-signals.json','street-assets.json','highway-barriers.json','airport.json')
DATA += ('region-belconnen.json','region-north.json','region-south.json','region-molonglo.json',
         'region-west-belconnen.json','residential-supplement.json')
SUPPORT_SCRIPTS = ('capital-campaign-fixture.mjs', 'capital-gallery-fixture.mjs', 'capital-crime-playability.mjs', 'capital-collision-baseline.mjs', 'profile_capital_simulation.mjs', 'profile_capital_collision.mjs')


def run_command(command, timeout):
    """Kill the test process group on timeout, including its temporary browser."""
    started = time.monotonic()
    try:
        process = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True,
                                   start_new_session=os.name == 'posix')
    except OSError as error:
        return dict(exitCode=127, seconds=0, timedOut=False, output=str(error))
    timed_out = False
    try:
        output, _ = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        timed_out = True
        if os.name == 'posix':
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            process.kill()
        output, _ = process.communicate()
    return dict(exitCode=process.returncode,
                seconds=round(time.monotonic() - started, 2),
                timedOut=timed_out, output=output)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='store_true', help='Also run the targeted real-input browser suite (600 second limit).')
    parser.add_argument('--output', type=Path, help='Explicit external directory for browser artifacts and runner report; required with --browser.')
    parser.add_argument('--classic-browser', action='store_true', help='Use the retained earlier Street Life browser suite instead of the expansion suite.')
    parser.add_argument('--expansion-browser', action='store_true', help='Use the retained earlier expansion browser suite.')
    parser.add_argument('--priority-shop-browser',action='store_true',help='Use the focused restaurant browser flow with --browser.')
    parser.add_argument('--living-browser',action='store_true',help='Use the living interior, gym, restaurant and Lemon hire flow with --browser.')
    parser.add_argument('--dev-browser',action='store_true',help='Use the focused pause-entry browser flow with --browser.')
    parser.add_argument('--theft-browser',action='store_true',help='Use the sequence, scooter hack and car theft browser flow with --browser.')
    parser.add_argument('--dealers-browser',action='store_true',help='Use the native store purchase, weapons and dealer flow with --browser.')
    parser.add_argument('--store-browser',action='store_true',help='Use the native career Canalside purchase flow with --browser.')
    parser.add_argument('--yoober-browser',action='store_true',help='Use the normal-input Yoober passenger and driver flows with --browser.')
    parser.add_argument('--signals-browser',action='store_true',help='Use the native signals, GPS, tracking and transport flow with --browser.')
    parser.add_argument('--crime-browser',action='store_true',help='Use the normal-input career mugging and shop employee hold-up flow with --browser.')
    parser.add_argument('--life-browser',action='store_true',help='Use the three-character and city-life browser flow with --browser.')
    parser.add_argument('--people-browser',action='store_true',help='Use native loading/input and shared-person component evidence with --browser.')
    parser.add_argument('--dry-run', action='store_true', help='List required files and exact commands without running them or creating directories.')
    args = parser.parse_args()
    if sum([args.classic_browser,args.expansion_browser,args.priority_shop_browser,args.living_browser,args.dev_browser,args.theft_browser,args.dealers_browser,args.store_browser,args.yoober_browser,args.signals_browser,args.crime_browser,args.people_browser,args.life_browser])>1:parser.error('Choose one browser flow')
    if (args.priority_shop_browser or args.living_browser or args.dev_browser or args.theft_browser or args.dealers_browser or args.store_browser or args.yoober_browser or args.signals_browser or args.crime_browser or args.people_browser or args.life_browser) and not args.browser:parser.error('Browser flow options require --browser')
    browser_suite='scripts/test_capital_life_browser.py' if args.life_browser else 'scripts/test_capital_people_browser.py' if args.people_browser else 'scripts/test_capital_crime_browser.py' if args.crime_browser else 'scripts/test_capital_signals_browser.py' if args.signals_browser else 'scripts/test_capital_yoober_browser.py' if args.yoober_browser else 'scripts/test_capital_dealers_browser.py' if (args.dealers_browser or args.store_browser) else 'scripts/test_capital_dev_browser.py' if args.dev_browser else 'scripts/test_capital_theft_browser.py' if args.theft_browser else 'scripts/test_capital_living_browser.py' if args.living_browser else 'scripts/test_capital_drive_browser.py' if args.classic_browser else 'scripts/test_capital_expansion_browser.py' if args.expansion_browser else 'scripts/test_capital_district_browser.py'
    if args.browser != (args.output is not None):
        parser.error('--browser and --output must be used together')
    output = args.output.expanduser().resolve() if args.output else None
    if output is not None and (output == ROOT or ROOT in output.parents):
        parser.error('--output must be outside the repository')
    required = [GAME / filename for filename in MODULES]
    required += [GAME / filename for filename in ('index.html', 'style.css', 'credits.html')]
    required += [GAME / 'data' / filename for filename in DATA]
    required += [Path('scripts') / filename for filename in SUITES]
    required += [Path('scripts') / filename for filename in SUPPORT_SCRIPTS]
    required += [Path('scripts/build_capital_cache.py'),Path('scripts/test_capital_cache_manifest.py'),Path('scripts/analyse_capital_profile.py'),Path('scripts/test_analyse_capital_profile.py')]
    if args.browser:
        required.append(Path(browser_suite))
    commands = [(['node', '--check', str(GAME / filename)], 120) for filename in MODULES]
    commands += [(['node', '--check', str(Path('scripts') / filename)], 120) for filename in SUITES]
    commands += [(['node', '--check', str(Path('scripts') / filename)], 120) for filename in SUPPORT_SCRIPTS]
    commands += [(['node', str(Path('scripts') / filename)] +
                 ([str(GAME / 'data/canberra.json')] if filename == 'test_capital_drive.mjs' else []), 120)
                 for filename in SUITES]
    commands += [([sys.executable,'-B','scripts/test_analyse_capital_profile.py'],120),([sys.executable,'-B','scripts/test_capital_cache_manifest.py'],120),([sys.executable,'-B','scripts/build_capital_cache.py','--check'],120)]
    commands.append((['git', 'diff', '--check'], 120))
    if args.browser:
        suite = browser_suite
        commands.append(([sys.executable, '-B', suite, '--output', str(output)]+(['--priority-shop'] if args.priority_shop_browser else ['--scenario','career'] if args.store_browser else ['--scenario','free'] if args.dealers_browser else []), 600))
    missing = [str(path) for path in required if not (ROOT / path).is_file()]
    if missing:
        for path in missing:
            print(f'MISSING {path}')
        print('Required files are missing; no checks executed. Restore the narrow checkout or finish the assigned modules.')
        return 1
    if args.dry_run:
        for command, timeout in commands:
            print(f'PLAN [{timeout}s] {shlex.join(command)}')
        print(f'DRY RUN: {len(commands)} commands; {len(required)} required files present.')
        return 0
    if output:
        output.mkdir(parents=True, exist_ok=True)
    deadline = time.monotonic() + 900
    records = []
    for command, limit in commands:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            print('FAIL overall 900 second budget exhausted.')
            records.append(dict(command=command, exitCode=124, timedOut=True, output='Overall budget exhausted.', seconds=0))
            break
        print(f'RUN {shlex.join(command)}', flush=True)
        result = run_command(command, min(limit, remaining))
        record = dict(command=command, **result)
        records.append(record)
        label = 'PASS' if result['exitCode'] == 0 and not result['timedOut'] else 'FAIL'
        print(f"{label} exit={result['exitCode']} time={result['seconds']}s" + (' TIMEOUT' if result['timedOut'] else ''))
        lines = result['output'].strip().splitlines()
        if lines:
            print('\n'.join(lines[-3:] if label == 'PASS' else lines[-20:]))
        if label == 'FAIL':
            break
    passed = sum(row['exitCode'] == 0 and not row['timedOut'] for row in records)
    success = passed == len(commands)
    report = dict(passed=passed, planned=len(commands), success=success, browser=args.browser, results=records)
    if output:
        report_file = output / 'runner-results.json'
        report_file.write_text(json.dumps(report, indent=2) + '\n')
        print(f'Report: {report_file}')
    print(f"{'PASS' if success else 'FAIL'} Capital Drive: {passed}/{len(commands)} commands passed.")
    return 0 if success else 1


if __name__ == '__main__':
    raise SystemExit(main())
