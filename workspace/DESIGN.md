# After the Flood — game design

Original third-person survival shooter for desktop browsers, built with Three.js + Vite. Fallout and 7 Days to Die are broad mood/system references, not recreation targets. No franchise characters, maps, logos, or assets are used.

## Playable scope and assumptions
A compact, polished survival expedition across four separate districts, rather than full-scale reproductions of three real cities. New Orleans contains a French Quarter street, St. Louis Cathedral-inspired silhouette, and a domed stadium in the distance. Houston features a rocket/space center and glass downtown towers. Los Angeles features a hillside HOLLYWOOD landmark-inspired sign, a Griffith Observatory-inspired building, palms, and a ruined boulevard. The bayou contains cypress roots, water, boardwalks, fog, and abandoned structures. Each region can be freely deployed to from the field map. Single-player plus small-room online cooperative survival; no competitive or anti-cheat claims.

## Core loop
Deploy → explore → defeat infected → scavenge supplies and mission caches → activate district radio → return to the extraction beacon → earn credits/XP → buy/craft supplies → travel to another district. Days advance on an accelerated clock. Infected become more numerous during the night; every seventh day triggers a blood-night horde. Health, hunger, stamina, ammo, scrap, and medkits create resource choices. Death loses carried scrap and returns the survivor to safety, retaining progression.

Controls: WASD move, Shift sprint, mouse drag or pointer lock to orbit/aim, left click shoot, right mouse aim, R reload, E interact, F medkit, B field journal, M map, Escape release/pause, Space dodge. Shoulder camera with visible animated survivor. Rifle hitscan, recoil, muzzle flash, hit feedback, enemies chase and strike. Props obstruct movement and shooting. Stamina limits sprint/dodge.

Progress: four main radio-restoration missions; repeatable district cache/recovery side jobs; daily challenge (kills, supply recovery); achievements (first kill, scavenger, signal restoration, traveler, survivor); once-per-UTC-day supplies reward with streak; XP/rank and rifle upgrades. Persistent local cache and cloud saves through platform context. Personal progress, not an always-running persistent multiplayer world.

Co-op: room code host/join/leave, presence, earliest-join host election, remote transform interpolation at 12Hz, host-authoritative enemies/loot/radio state, shoot events, state snapshots for late join/reconnect. Cloud saves hold personal progression, realtime channels hold transient match state. Offline/network failures explicitly shown and solo remains available.

## Presentation / visual quality
Cinematic weathered realism with detailed geometric architecture and material texture, not faceted low-poly blockouts. French Quarter balconies with railings, shuttered windows, cornices, stucco variation, street signage and lamps. Rounded cypress trunks, roots, reeds and layered canopy. Rain-wet roads, cracked concrete, rusted surfaces, scattered rubble, vehicle wrecks, atmospheric depth and warm sky against cool shadows. Refined character silhouettes with real skinned Mixamo rigs. Directional shadows, hemisphere fill, procedural environment captured and PMREM-filtered for roughness response. Fog, filmic exposure, restrained bloom, particles and lighting accentuate the sunset. Shadow and render quality are scalable.

## UI design fingerprint
Experience: tense expedition and clear resource decisions for mouse/keyboard desktop play, with readable touch-safe menu buttons. Time-critical info: crosshair, ammo, health, threat direction, nearest interaction; secondary progress belongs in journal/map.
World vocabulary: evacuation route signs, field radios, stamped ration cards, weathered municipal maps. Colors: flood-black #111713 for ground/surfaces; bone #e6e1cd for primary text; rescue-amber #e8aa50 for actions/wayfinding; oxidized-sage #8a9c7a for support; warning-rust #c86248 for danger; mist #9caea8 for subdued info. Typography: Georgia display titles, system sans-serif body, tabular numerals for resources; large title 60–96px, section 26px, body 15–17px, labels minimum 12px. Left-aligned editorial menu, small perimeter HUD with deliberate uninterrupted center. Thin technical rules, square clipped corners and stamped rectangles rather than glass cards. One memorable element: a gold evacuation-route line that ties map, mission, and extraction markers together. Subtle fades, recoil, loot confirmation and achievement stamps communicate state, not decoration.

## Asset inventory / preparation plan
- Skinned survivor and infected: retrieve three_avatar, inspect actual Mixamo bones/rest hierarchy/weights, download locally.
- Rifle idle/run/attack motion and infected locomotion: retrieve three_motion; inspect compatible skeleton/track binding.
- District architecture/landmarks/vegetation/weapon/cache: refined local procedural geometry and textured materials, prepared in reusable asset module before gameplay integration.
- Material maps: deterministic locally generated asphalt/stucco/brick/rust/wood textures with normal/roughness response.
- Sky/reflections: reproducible procedural sky captured through CubeCamera/PMREM with explicit sun orientation.
- UI: CSS/SVG drawn local icons, system fonts, no remote font loading.
- Audio: locally retrieved gunshot and ambient music; local procedural footsteps/interaction tones if needed.
Every external asset gets source information in ASSETS.md. Local files are mandatory. Runtime service endpoints are allowed for networking/storage only, never remote game asset hotlinks.

## Acceptance / verification
Vite build succeeds. Representative expedition loop in browser: deploy, move, shoot infected, loot/interact and gain progression. Major visual assets display and controls are usable. District travel, journal, daily reward and save flows are inspectable. Resource/network inspection finds only local game assets. Build loads under a subdirectory. Two clients share a room and exchange presence/state where service permits. Cloud identity absence must show local-only status, not fake success. Publish through approved Three.js publisher after validation.

## Project state
Design: ready.
Asset Preparation: ready; evidence and inventory in ASSETS.md and asset-inspection.json.
Implementation: complete.
Validation/publishing: passed; actual published startup verified. See VERIFICATION.md and published-runtime.json.

## District expansion revision
Scope: four additional named exploration locations per district (16 total), each with a physically connected, furnished ground-floor interior and a relief cache. These are fictional local sites, not accurate reconstructions. Two branching cross streets or bayou boardwalks connect the existing expedition route to the new sites. No loading-screen teleport is required to enter a building. Static open entrances avoid introducing shared door-state complexity in co-op.

Asset/render direction: bevelled timber and masonry shells, 2.8m clear doorways, framed shop windows, roof trim, segmented planks, shelves, bars, cots, counters, industrial equipment and local signage. Distinct warm interior practical lighting contrasts with cooler outdoor fill. High-frequency bump detail and correctly scaled surface tiling improve close views. Retain detailed rigged characters and compatible existing locomotion/firing clips. Interior roofs fade out of the overhead camera only while occupied; solid walls and furnishings retain movement/bullet collision.

Controls: smooth acceleration/deceleration, aim-speed movement, both Shift keys, shoulder swap Q, wheel camera zoom, tunable mouse sensitivity/invert-Y, automatic mouse capture on a canvas click where allowed (drag fallback), flashlight T, camera obstruction avoidance and reset input on focus loss. Existing action keys remain intact. No new motion clips are required: controller locomotion continues to use the verified idle/run/firing assets.

UI continuation: preserve bone/amber/sage field-document vocabulary and perimeter HUD. The location label names the nearby site and indicates an interior; the world-map panel lists each district's new sites. Settings use explicit labeled sensitivity, inversion and quality controls rather than a new visual system. Exploration signage and minimap building outlines guide players without crowding the center.

Revision Asset Preparation: READY. Procedural assets are implemented in src/expansion.js and preparation checks pass; evidence in ASSETS.md and test_expansion.mjs. Integration and representative interior/exterior visual checks remain pending.

Revision status: implementation and validation complete; expansion published and Preview synchronized. Four additional enterable sites in every district, 16 total. Asset Preparation remains READY; final representative visual/collision/control/save checks recorded in VERIFICATION.md. Co-op/cloud service code remains unchanged; no new cross-device claims.
