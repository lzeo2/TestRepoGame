# Wings: Modern Aircraft and Naval Wishlist

## Scope and balance conventions

Exactly 20 candidates: 12 aircraft and 8 naval vessels, covering late Cold War designs still used in modern forces and newer platforms. "Foreign" means a multinational roster, not exclusion of any country. This is a planning document only, not authorization to build, register, publish or push anything.

Wings already has an F-35, so its entry is a variant-specific refinement rather than a claim that the type is missing. Existing generic carrier and destroyer assets are precedents for named-class alternatives, not evidence that these classes are implemented. The experimental speedboat is not an accepted playable naval roster. See the [Wings maintenance manual](maintenance/games/232-wings.md) for current implementation and outstanding rights, tooling and native-play holds.

- **Facts versus proposals:** Names, roles, origins and service-era descriptions are real-world identifiers. Every speed, weapon fit and handling rating below is a proposed arcade balance value, not a real performance figure, operational loadout or capability ranking.
- **Speed:** Aircraft list cruise/boost in game metres per second, anchored to the current F-15 at 155/215 and F-35 at 130/180. Ships list proposed maximum game metres per second without boost. Ship movement and playable-class support would need separate implementation and testing.
- **Armament:** Generic game abstractions only. Aircraft missile counts are ready rounds, with replenishment subject to Wings' existing rules. "Guided strike" can reuse the existing TV-missile or Maverick mechanics; it does not promise a new radar, missile seeker or real weapon simulation. Proposed naval missile and defensive-gun systems are future work, not claims about existing weapons.
- **Handling:** A proposed 1-5 rating, with 5 the most responsive. Aircraft ratings describe turn/roll response within the jet roster; naval ratings describe rudder response and turning circle within the vessel roster. The two scales are not comparable. Named behavior gives each rating context.
- **Era:** Broad service-entry period of the named variant or class, not first flight, design date or a promise that every hull remains active.
- **NATO names:** Western product names such as Fighting Falcon and Gripen are not NATO reporting names. None is asserted unless identified explicitly. J-20's reported "Fagin" designation is qualified below rather than presented as independently confirmed NATO terminology.

## Aircraft (12)

### 1. General Dynamics F-16C Fighting Falcon

- **NATO reporting name:** Not applicable. **Role:** Multirole fighter. **Era:** Mid-1980s service entry; modernized examples remain in service. **Origin country:** United States.
- **Suggested stats:** Speed 150/210 m/s; armament: cannon, 2 short-range air-to-air missiles and 2 guided-strike rounds; handling 5/5, quick roll and strong medium-speed turns with noticeable low-speed energy loss.
- **Gameplay fit:** Offers an accessible lightweight multirole alternative to the heavier F-15.

### 2. Mikoyan MiG-29

- **NATO reporting name:** Fulcrum. **Role:** Frontline air-superiority fighter. **Era:** 1980s service entry; upgraded variants continue in modern service. **Origin country:** Soviet Union.
- **Suggested stats:** Speed 145/205 m/s; armament: cannon and 4 short-range air-to-air missiles; handling 5/5, sharp initial turns but poor speed retention during sustained hard maneuvering.
- **Gameplay fit:** Rewards close-range interception and energy management rather than a large strike load.

### 3. Sukhoi Su-35S

- **NATO reporting name:** Flanker-E. **Role:** Multirole air-superiority fighter. **Era:** 2010s service entry. **Origin country:** Russia.
- **Suggested stats:** Speed 155/215 m/s; armament: cannon, 4 air-to-air missiles and 2 guided-strike rounds; handling 4/5, strong pitch authority with a slower roll than the lightweight fighters.
- **Gameplay fit:** Adds a large, maneuverable fighter whose generous weapon fit is offset by an easier-to-hit silhouette.

### 4. Lockheed Martin F-35A Lightning II

- **NATO reporting name:** Not applicable. **Role:** Low-observable multirole fighter. **Era:** 2010s service entry. **Origin country:** United States, with international program partners.
- **Suggested stats:** Speed 130/180 m/s; armament: existing arcade cannon and 2 guided-strike rounds per missile seat; handling 4/5, stable medium-speed turns with less top-end speed than the F-15.
- **Gameplay fit:** Refines the existing F-35 into an explicitly named land-based variant while preserving its current strike and stealth niche.

The current cannon20/TV-missile fit is a game abstraction, not the F-35A's real gun caliber or an operational weapons inventory. Keep existing stealth rules unless a separate design change is approved.

### 5. Eurofighter Typhoon

- **NATO reporting name:** Not applicable. **Role:** Air-superiority and multirole fighter. **Era:** 2000s service entry. **Origin countries:** United Kingdom, Germany, Italy and Spain.
- **Suggested stats:** Speed 155/215 m/s; armament: cannon and 4 air-to-air missiles; handling 5/5, rapid roll and strong high-speed turns with a wider low-speed recovery arc.
- **Gameplay fit:** Provides a fast interception specialist that trades strike ammunition for air-combat responsiveness.

### 6. Dassault Rafale M

- **NATO reporting name:** Not applicable. **Role:** Carrier-capable multirole fighter. **Era:** 2000s service entry. **Origin country:** France.
- **Suggested stats:** Speed 145/200 m/s; armament: cannon, 2 air-to-air missiles and 2 guided-strike rounds; handling 4/5, predictable low-speed control with moderate boost acceleration.
- **Gameplay fit:** Bridges fighter combat and anti-fleet strikes with a distinct naval-aircraft silhouette, without requiring carrier landings.

### 7. Saab JAS 39C Gripen

- **NATO reporting name:** Not applicable. **Role:** Lightweight multirole fighter. **Era:** 2000s service entry for the C variant; Gripen family entered service in the 1990s. **Origin country:** Sweden.
- **Suggested stats:** Speed 140/195 m/s; armament: cannon, 2 air-to-air missiles and 2 guided-strike rounds; handling 5/5, fast roll and tight medium-speed turns with a lower boost ceiling.
- **Gameplay fit:** Gives players a compact, responsive strike-capable choice that cannot simply outrun heavier interceptors.

### 8. Chengdu J-20

- **NATO reporting name:** Fagin is reported in public Western usage; official NATO confirmation is not established in this document. "Mighty Dragon" is a translated Chinese nickname, not a NATO reporting name. **Role:** Low-observable air-superiority fighter. **Era:** 2010s service entry. **Origin country:** China.
- **Suggested stats:** Speed 150/210 m/s; armament: 4 air-to-air missiles, no cannon in the proposed game fit; handling 3/5, stable fast passes with a broad close-range turning circle.
- **Gameplay fit:** Offers a missile-focused interceptor differentiated from the existing F-35's guided-strike fit.

Do not invent radar ranges or classified performance. Any use of Wings' existing stealth abstraction would be a balance proposal, not a claim about real detection performance.

### 9. Mikoyan MiG-31BM

- **NATO reporting name:** Foxhound, for the MiG-31 family. **Role:** Long-range interceptor. **Era:** 2000s upgraded variant of a 1980s-service aircraft. **Origin country:** Russia for the BM upgrade; Soviet Union for the original MiG-31.
- **Suggested stats:** Speed 170/235 m/s; armament: cannon and 4 air-to-air missiles using existing targeting limits; handling 2/5, slow roll and wide turns with strong straight-line acceleration.
- **Gameplay fit:** Creates a fast hit-and-run interceptor that is vulnerable if drawn into a turning fight.

### 10. Dassault Mirage 2000C

- **NATO reporting name:** Not applicable. **Role:** Air-defense fighter. **Era:** 1980s service entry; the wider Mirage 2000 family remains in modern use. **Origin country:** France.
- **Suggested stats:** Speed 145/205 m/s; armament: cannon and 4 air-to-air missiles; handling 4/5, strong instantaneous turns followed by substantial speed loss if held.
- **Gameplay fit:** Makes turn timing important and adds a recognizable tailless-delta profile without a new flight system.

### 11. PAC/CAC JF-17 Thunder Block III

- **NATO reporting name:** None asserted; Thunder is a program name. **Role:** Lightweight multirole fighter. **Era:** 2020s service entry for Block III; the family entered service in the 2000s. **Origin countries:** Pakistan and China.
- **Suggested stats:** Speed 135/190 m/s; armament: cannon, 2 air-to-air missiles and 2 guided-strike rounds; handling 4/5, forgiving medium-speed control with modest acceleration.
- **Gameplay fit:** Supplies a balanced lighter fighter below the top-speed tier without needing new weapon mechanics.

### 12. Korea Aerospace Industries FA-50 Fighting Eagle

- **NATO reporting name:** Not applicable. **Role:** Light combat aircraft derived from an advanced trainer. **Era:** 2010s service entry. **Origin country:** South Korea, developed with United States industrial participation.
- **Suggested stats:** Speed 125/175 m/s; armament: cannon, 2 short-range air-to-air missiles and 2 guided-strike rounds; handling 4/5, smooth roll and predictable turns but limited pursuit speed.
- **Gameplay fit:** Provides a forgiving entry-level combat jet whose speed ceiling leaves room to progress to faster aircraft.

## Naval vessels (8)

For large vessels, begin as AI fleet units or objectives rather than promising player control. Patrol boats are candidates for a later water-handling class. Flight-deck operations, radar networks, torpedoes and antisubmarine warfare are not assumed to exist.

### 13. Charles de Gaulle (R91)

- **NATO reporting name:** Not applicable. **Role:** Nuclear-powered aircraft carrier. **Era:** 2000s service entry. **Origin country:** France.
- **Suggested stats:** Maximum speed 14 m/s; armament: 2 abstract defensive missile channels and short-range defensive guns; handling 1/5, slow rudder response and a very wide turning circle.
- **Gameplay fit:** Adds a compact carrier-class fleet objective with clear escort and strike priorities, without simulating an air wing.

### 14. Queen Elizabeth-class aircraft carrier

- **NATO reporting name:** Not applicable. **Role:** Aircraft carrier designed for short-takeoff/vertical-landing aircraft. **Era:** 2010s service entry. **Origin country:** United Kingdom.
- **Suggested stats:** Maximum speed 13 m/s; armament: 3 abstract close-in defensive gun mounts, no offensive missile battery; handling 1/5, slow acceleration and broad turns.
- **Gameplay fit:** Adds a visually distinct twin-island carrier that depends on escorts rather than excessive offensive firepower.

### 15. Type 45 Daring-class destroyer

- **NATO reporting name:** Not applicable; Daring is the class name. **Role:** Area-air-defense guided-missile destroyer. **Era:** 2000s service entry. **Origin country:** United Kingdom.
- **Suggested stats:** Maximum speed 16 m/s; armament: main gun, 4 ready anti-air missiles and 2 close-in defensive mounts; handling 2/5, deliberate turns with better acceleration than a carrier.
- **Gameplay fit:** Makes escort suppression valuable before a player attacks the fleet's main objective.

### 16. Kongō-class destroyer

- **NATO reporting name:** Not applicable. **Role:** Guided-missile air-defense destroyer. **Era:** 1990s service entry. **Origin country:** Japan, using United States-derived Aegis technology.
- **Suggested stats:** Maximum speed 16 m/s; armament: main gun, 4 ready anti-air missiles and 2 ready anti-ship missiles; handling 2/5, steady course keeping and a large turning circle.
- **Gameplay fit:** Provides a mixed air-and-surface threat that rewards approach planning instead of repeated straight attack runs.

### 17. Aquitaine-class FREMM frigate

- **NATO reporting name:** Not applicable. **Role:** Multimission frigate, with the Aquitaine antisubmarine variant as the reference. **Era:** 2010s service entry. **Origin country:** France, within the joint French-Italian FREMM program.
- **Suggested stats:** Maximum speed 14 m/s; armament: main gun, 2 ready anti-air missiles and 2 ready anti-ship missiles; handling 3/5, moderate rudder response and a smaller turning circle than the destroyers.
- **Gameplay fit:** Fills the middle escort tier between missile-heavy destroyers and lightly armed patrol boats.

### 18. Shivalik-class frigate

- **NATO reporting name:** Not applicable. **Role:** Multirole guided-missile frigate with reduced-signature design features. **Era:** 2010s service entry. **Origin country:** India.
- **Suggested stats:** Maximum speed 16 m/s; armament: main gun, 2 ready anti-air missiles, 2 ready anti-ship missiles and short-range defensive guns; handling 2/5, slower rudder response than the Aquitaine proposal.
- **Gameplay fit:** Adds a heavier frigate option for mixed fleets without introducing a new naval combat system.

Reduced-signature design does not mean invisibility; no automatic stealth bonus is proposed.

### 19. Super Dvora Mk III patrol boat

- **NATO reporting name:** Not applicable. **Role:** Fast coastal patrol and interdiction boat. **Era:** 2000s service entry. **Origin country:** Israel.
- **Suggested stats:** Maximum speed 24 m/s; armament: 1 forward light autocannon and 2 machine-gun positions, no guided missiles; handling 5/5, quick acceleration and tight powered turns with a speed penalty while turning.
- **Gameplay fit:** Creates a mobile coastal skirmisher whose agility is balanced by short weapon reach and a light fit.

### 20. Dockstavarvet Combat Boat 90 H (CB90 H)

- **NATO reporting name:** Not applicable; CB90 is a product designation. **Role:** Fast assault and troop-transport boat. **Era:** 1990s service entry. **Origin country:** Sweden.
- **Suggested stats:** Maximum speed 22 m/s; armament: 3 machine-gun positions, no missiles; handling 5/5, responsive waterjet-style steering but slower acceleration than the Super Dvora proposal.
- **Gameplay fit:** Supports a lightly armed coastal objective or patrol role without requiring a troop simulation.

## Factual references and rights boundaries

These are public reference starting points for verifying identities, variant dates and configurations before implementation, not a claim that every linked page has been freshly checked. Proposed game stats above are original balance suggestions, not figures sourced from these pages.

- United States Air Force [fact sheets](https://www.af.mil/About-Us/Fact-Sheets/) and [F-35 program](https://www.f35.com/) for United States aircraft identities and variant distinctions.
- [United Aircraft Corporation](https://www.uacrussia.ru/en/) for MiG and Sukhoi families; corroborate reporting names separately rather than treating manufacturer names as NATO terminology.
- [Eurofighter](https://www.eurofighter.com/), [Dassault Aviation](https://www.dassault-aviation.com/en/), [Saab](https://www.saab.com/), [Pakistan Aeronautical Complex](https://www.pac.org.pk/) and [Korea Aerospace Industries](https://www.koreaaero.com/EN/) for their aircraft families.
- The United States Department of Defense [China military power reports](https://www.defense.gov/Spotlights/China-Military-Power-Report/) for public J-20 context; retain the reporting-name qualification until a citable official designation is established.
- [Marine nationale](https://www.defense.gouv.fr/marine), [Royal Navy](https://www.royalnavy.mod.uk/), [Japan Maritime Self-Defense Force](https://www.mod.go.jp/msdf/en/) and [Indian Navy](https://www.indiannavy.nic.in/) for carrier, destroyer and frigate classes.
- [Israel Aerospace Industries](https://www.iai.co.il/) and [Dockstavarvet](https://www.dockstavarvet.se/) for the patrol/assault boat families.

Use public facts and independently authored descriptions. Do not copy another game's meshes, textures, UI, stats, sounds or vehicle descriptions. Reference links do not grant permission to redistribute photographs, drawings, logos, liveries or models. Any future assets need original creation or documented compatible licensing; do not imply manufacturer endorsement. No assets are ingested and no runtime network requests are introduced by this document. Wings' existing upstream-license uncertainty remains unresolved.
