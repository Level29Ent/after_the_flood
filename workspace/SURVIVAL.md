# Waterline expansion

This is an intentionally compact, single-player systems expansion of the existing Three.js/Vite game, not a React migration or a full-scale city simulator. Existing cooperative expeditions remain available; the new personal systems are disabled while connected to co-op, rather than pretending to synchronize them.

## Play
- Continue survival, then press **G** (or the on-screen Waterline button). The console pauses solo simulation. E opens nearby marked sites; pre-existing relief interactions take priority except within 1.5m of a new site. T toggles the flashlight.
- Southern high ground at (0,43) is a camp; the pier at (4,36) builds/boards/moors vessels and hosts a trader. Bayou markers use narrower x coordinates.
- Search storefronts/attics/crates. Craft crowbars, axes or sledgehammers for cars/wreckage yielding rubber, copper, metal, wood and parts. Grappling hooks/nets recover storm-drifting debris and a survivor journal. Claims reset by game day; later days yield fewer supplies.
- Craft collector, solar, medical tent, barricade, generator, battery bank, pump, fridge, crops and sheltered fire on high ground. Supplies/power update every active minute; camp roles earn XP and improve production. Weather, rations and exposure affect morale; very low morale causes abandonment.
- Build a skiff, airboat, patrol boat or barrel/pallet/rope raft at the dock. WASD steers. Motorized vessels consume fuel; collision blocks damage hull. Repair/refuel while moored. Rafts have sequential chest, fire and survivor-platform modules. Anchor against surge currents. Trader swaps clean water, medicine and fuel for parts, rations and salvage-net knowledge without currency.
- Filter **and boil** dirty water; untreated floodwater causes illness/stamina drain. Protective cloth masks, ponchos, lights and glowsticks are craftable. Wetness lowers temperature. Powered pumps generate clean water; refrigeration limits passive food spoilage.
- Four-minute weather cycles: haze (100s), rain (70s), surge (70s). Water rises smoothly, haze/fog thickens, rain particles fall, currents push the player/vessel and debris drifts. Night water glows.
- Houston/New Orleans stairwell markers access three compact vertical platforms. Climbing costs stamina, requires a waterproof light, and unstable top floors cause damage. Roofs allow safe construction and two-stage landmark relay repair. Relays widen local minimap reconnaissance, enable dock-to-dock routes and unlock high-tier drops.
- Drain markers enter a lower-level transit bypass. The central choke point is fully submerged and drains oxygen. Masks prevent indoor mold damage. Surface via the console before oxygen runs out.
- Crank/tune the radio for military lore, weather timing and a north-rooftop rescue signal. Rescue specialists and assign station roles. Wildlife/runoff/power-line markers cause proximity hazards; looter and zoo caches carry combat/damage costs. Flare or restored-relay signals start a 90-second defense timer; barricades reduce raid damage. Death cancels extraction. Success evacuates the camp but allows continued exploration.

## Runtime guarantees
- Single-owned animation scheduler; hidden tabs and pagehide save synchronously and stop animation/audio; return resets dt. HMR teardown aborts input listeners, clears timers, closes audio, leaves the room and disposes render resources.
- No media/context creation before a user gesture. Resume failures are caught; future gestures retry. Procedural cues supplement existing local audio.
- Local saves are synchronous, versioned, and backed up. Failed local writes report failure, never success. Cloud writes are serialized and coalesced so an older request cannot finish after a newer one. Manual Save and persistent Saving/Saved/error status remain visible while playing. Hidden tabs do not advance the simulation.
- Existing per-model loading progress is preserved. Touch movement, drag-look, firing, interaction and console buttons supplement keyboard controls; viewport resizing updates camera and render targets.

## Deliberate limitations
These are small-scale simulation and interaction mechanics, not new full-sized Houston/New Orleans maps. Buildings use compact multi-level platforms rather than detailed new multi-story interiors. Wildlife is represented by simple moving shapes and hazard volumes; looters use interaction/combat costs, not a new faction AI. Rescue crew, camp structures and raft passengers are managed through the console rather than individually animated NPCs. The raft has three sequential modules, not a free-placement editor. Flare defense uses periodic damage/raid events plus existing enemies, not new helicopter assets. Weather is a repeatable gameplay cycle, not a fluid solver; no lightning shader or physical wall collapse is claimed. The current resource model has no per-food aging or granular depression simulation. Mobile controls are a basic fallback, not a fully tuned mobile release.

## Checks
`node test_flood.mjs`, `node test_survival.mjs`, `node test_expansion.mjs`, `node test_world.mjs`, and `npm run build`.

## Environment completion revision
- Replaced the floating tower slabs with foundations, side/rear walls, windows, three connected stair flights, landings, parapets, relay hardware and salvage furniture. The front remains a deliberate third-person camera cutaway. Floor changes still use the existing interact/console flow.
- Underground is a separate visible layer with a closed tunnel shell, structural ribs, track sleepers, floodwater, signs and lighting. Surface geometry is hidden underground; camera bounds and player elevation use the active layer. Surface return, respawn and menu reset the layer.
- Constructed collectors, solar panels, medical tents, barricades, generators, batteries, filters, fridges, crops and fires appear at the relief deck and rooftop when built or loaded from a save. Stations rebuild only when their levels change; replaced geometry/textures are released.
- Docks now have planks, piles and mooring rails. Skiffs, fan-cage airboats, cabin patrol boats and barrel rafts have distinct geometry; chest/fire/passenger-platform modules are visible.
- Site cubes are replaced by labeled salvage, vehicles, wreckage, runoff barrels and hazard props. City-edge skyline, street gateways, drains and Bayou embankment planting fill the previously exposed map edges without changing the established walkable envelope.
- `node test_environment.mjs` verifies geometry, station visibility, boat variants, tunnel/surface switching, all floor heights, deck bounds and teardown in every district. Existing path-reachability checks remain unchanged and pass. This remains a procedural environment, not a photorealistic or full-city asset pack.

## Joysticks and city relief circuits
Touch devices have independent analog MOVE and LOOK sticks with radial deadzones, pointer capture and cancellation/reset on pause, blur and hidden tabs. Stick deflection controls walking speed. Fire, reload, sprint, interaction, flashlight and console remain separate buttons; keyboard/mouse still work.
Each district now has a three-stage named relief circuit (12 activities total): recovery, material-cost repair and a 30-second landing defense. City signage and the console show the next objective and coordinates. Defense runs only during active solo play on the street, resets when leaving the landing, and awards parts, water, rations and copper plus a final medicine/fuel bonus. Completed stages persist; active defense timers reset safely on load. These activities extend the compact maps, not their city-scale geographic footprint, and remain solo-only with the Waterline systems.
