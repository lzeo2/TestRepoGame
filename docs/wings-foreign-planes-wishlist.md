# Wings: Modern Aircraft Wishlist

## Scope and balance conventions

Exactly 20 aircraft candidates, covering late Cold War designs still used in modern forces and newer platforms: fighters, interceptors, bombers, attack aircraft, trainers and helicopters. No naval vessels are included. "Foreign" means a multinational roster, not exclusion of any country. This is the standard aircraft wishlist; the [separate Factions mode wishlist](wings-factions-wishlist.md) has its own mixed air-and-sea roster. Neither document authorizes building, registering, publishing or pushing anything.

Wings already has an F-35 and an Apache, so their entries are variant-specific refinements rather than claims that these aircraft families are missing. See the [Wings maintenance manual](maintenance/games/232-wings.md) for current implementation and outstanding rights, tooling and native-play holds.

- **Facts versus proposals:** Names, roles, origins and service-era descriptions are real-world identifiers. Every speed, weapon fit and handling rating below is a proposed arcade balance value, not a real performance figure, operational loadout or capability ranking.
- **Speed:** Fixed-wing aircraft list cruise/boost in game metres per second, anchored to the current F-15 at 155/215 and F-35 at 130/180. Helicopters list maximum forward speed without boost; their hover and handling proposals require separate testing.
- **Armament:** Generic game abstractions only. Missile and bomb counts are ready rounds, with replenishment subject to Wings' existing rules. "Guided strike" can reuse the existing TV-missile or Maverick mechanics; it does not promise a new radar, missile seeker or real weapon simulation. Bomber payloads and helicopter fits are proposals, not claims about implemented weapon support.
- **Handling:** A proposed 1-5 rating, with 5 the most responsive. Fixed-wing ratings describe turn/roll response; helicopter ratings describe hover/yaw and low-speed response within their own class, not jet-like maneuverability. Named behavior gives each rating context.
- **Era:** Broad service-entry period of the named variant, not first flight, design date or a promise that every example remains active.
- **NATO names:** Western product names such as Fighting Falcon and Gripen are not NATO reporting names. None is asserted unless identified explicitly. J-20's reported "Fagin" designation is qualified below rather than presented as independently confirmed NATO terminology.

## Aircraft (20)

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

### 6. Dassault Rafale C

- **NATO reporting name:** Not applicable. **Role:** Land-based multirole fighter. **Era:** 2000s service entry. **Origin country:** France.
- **Suggested stats:** Speed 145/200 m/s; armament: cannon, 2 air-to-air missiles and 2 guided-strike rounds; handling 4/5, predictable low-speed control with moderate boost acceleration.
- **Gameplay fit:** Bridges fighter combat and precision ground attack with a recognizable canard-delta silhouette.

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

### 13. Sukhoi Su-34

- **NATO reporting name:** Fullback. **Role:** Tactical bomber and strike aircraft. **Era:** 2010s formal service entry. **Origin country:** Russia.
- **Suggested stats:** Speed 140/195 m/s; armament: cannon, 2 air-to-air missiles and 6 guided-strike rounds; handling 2/5, stable attack runs with slow roll and wide recovery turns.
- **Gameplay fit:** Adds a heavy tactical strike choice that needs escort or careful approach timing.

### 14. Tupolev Tu-160

- **NATO reporting name:** Blackjack. **Role:** Supersonic strategic bomber. **Era:** Late-1980s service entry; modernized examples remain in service. **Origin country:** Soviet Union.
- **Suggested stats:** Speed 160/225 m/s; armament: 8 guided-strike rounds, no cannon; handling 1/5, very wide turns and slow acceleration despite a high boost ceiling.
- **Gameplay fit:** Creates a large, vulnerable payload specialist whose escape speed cannot replace fighter protection.

### 15. Fairchild Republic A-10C Thunderbolt II

- **NATO reporting name:** Not applicable. **Role:** Close-air-support attack aircraft. **Era:** 2000s C upgrade of a 1970s-service aircraft. **Origin country:** United States.
- **Suggested stats:** Speed 90/120 m/s; armament: heavy cannon and 6 guided-strike rounds; handling 3/5, controlled low-speed turns with limited climb and escape speed.
- **Gameplay fit:** Trades interception ability for sustained ground attack and deliberate terrain use.

### 16. Sukhoi Su-25SM

- **NATO reporting name:** Frogfoot, for the Su-25 family. **Role:** Close-air-support attack aircraft. **Era:** 2000s SM upgrade of a 1980s-service aircraft. **Origin country:** Russia for the upgrade; Soviet Union for the original Su-25.
- **Suggested stats:** Speed 100/135 m/s; armament: cannon, 4 guided-strike rounds and 2 rocket salvos; handling 3/5, steady low-level control with wider turns when fast.
- **Gameplay fit:** Offers a faster attack alternative to the A-10C with a smaller guided payload.

### 17. BAE Systems Hawk T2 (Hawk 128)

- **NATO reporting name:** Not applicable. **Role:** Advanced jet trainer. **Era:** Late-2000s service entry. **Origin country:** United Kingdom.
- **Suggested stats:** Speed 110/150 m/s; armament: none in the proposed trainer fit; handling 5/5, forgiving roll and predictable medium-speed turns.
- **Gameplay fit:** Provides an unarmed flight-training and checkpoint-race option rather than pretending every aircraft must be combat competitive.

### 18. Yakovlev Yak-130

- **NATO reporting name:** Mitten. **Role:** Advanced jet trainer and light attack aircraft. **Era:** 2010s service entry. **Origin country:** Russia, with early Italian development collaboration before the programs separated.
- **Suggested stats:** Speed 110/150 m/s; armament: optional gun pod and 2 guided-strike rounds in the proposed combat fit; handling 5/5, gentle low-speed response with modest climb performance.
- **Gameplay fit:** Bridges training and light strike without matching frontline fighter speed or payload.

### 19. Boeing AH-64D Apache Longbow

- **NATO reporting name:** Not applicable; Apache is a United States service name. **Role:** Attack helicopter. **Era:** Late-1990s service entry for the D variant. **Origin country:** United States.
- **Suggested stats:** Maximum forward speed 75 m/s, no boost; armament: chain gun, 4 guided-strike rounds and 2 rocket salvos; handling 4/5, stable hover and responsive yaw with slow forward acceleration.
- **Gameplay fit:** Refines the existing Apache into a named variant focused on low-altitude cover and precision attack, without promising radar simulation.

### 20. Mil Mi-28N

- **NATO reporting name:** Havoc, for the Mi-28 family. **Role:** Attack helicopter. **Era:** Late-2000s service entry. **Origin country:** Russia, from a Soviet-origin design.
- **Suggested stats:** Maximum forward speed 80 m/s, no boost; armament: autocannon, 4 guided-strike rounds and 2 rocket salvos; handling 3/5, steady hover with slower yaw than the Apache proposal.
- **Gameplay fit:** Adds a faster but less nimble helicopter alternative using the same abstract weapon budget.

## Factual references and rights boundaries

These are public reference starting points for verifying identities, variant dates and configurations before implementation, not a claim that every linked page has been freshly checked. Proposed game stats above are original balance suggestions, not figures sourced from these pages.

- United States Air Force [fact sheets](https://www.af.mil/About-Us/Fact-Sheets/) and [F-35 program](https://www.f35.com/) for United States aircraft identities and variant distinctions.
- [United Aircraft Corporation](https://www.uacrussia.ru/en/) for MiG and Sukhoi families; corroborate reporting names separately rather than treating manufacturer names as NATO terminology.
- [Eurofighter](https://www.eurofighter.com/), [Dassault Aviation](https://www.dassault-aviation.com/en/), [Saab](https://www.saab.com/), [Pakistan Aeronautical Complex](https://www.pac.org.pk/) and [Korea Aerospace Industries](https://www.koreaaero.com/EN/) for their aircraft families.
- The United States Department of Defense [China military power reports](https://www.defense.gov/Spotlights/China-Military-Power-Report/) for public J-20 context; retain the reporting-name qualification until a citable official designation is established.
- [Royal Air Force](https://www.raf.mod.uk/aircraft/hawk-t2/) for Hawk T2; [Boeing](https://www.boeing.com/defense/ah-64-apache) and [Russian Helicopters](https://www.rhc.aero/en) for the helicopter families.

Use public facts and independently authored descriptions. Do not copy another game's meshes, textures, UI, stats, sounds or vehicle descriptions. Reference links do not grant permission to redistribute photographs, drawings, logos, liveries or models. Any future assets need original creation or documented compatible licensing; do not imply manufacturer endorsement. No assets are ingested and no runtime network requests are introduced by this document. Wings' existing upstream-license uncertainty remains unresolved.
