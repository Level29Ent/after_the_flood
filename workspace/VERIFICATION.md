# Verification record

## Completed checks
- `npm run build`: passed, final production output in `dist/`. Non-blocking Vite warning: main JS bundle exceeds 800KB (about 247KB gzip).
- `node --check src/main.js`, `node --check src/assets.js`, `node --check src/services.js`: passed.
- `node .../game-data-storage/scripts/validate_storage_integration.mjs .`: passed.
- Actual production build opened under `/dist/`, not the site root. Models, animations, audio, JS and CSS loaded from local relative paths. Embedded FBX textures use local blob URLs. No external game asset hotlinks.
- Browser gameplay: deployed, aimed with mouse motion, fired carbine, killed infected (kill count 0→1, XP/scrap earned), used WASD movement, searched relief cache (loot 0→1, reserve 120→144), opened journal, returned to beacon and received extraction result.
- Daily reward: rounds +60, medkits 3→5, credits +50; claim button disabled after claim. Reload restored kill count, supply count and credits (55 after extraction), equipment and position.
- Two real game tabs joined the same online room. Earliest client elected leader, second client showed one peer and one remote avatar. Host enemy snapshot synchronized to late joiner. Host district travel to swamp synchronized district 3 on follower. Leader recovery observed after original host disconnected.
- Visual inspection: New Orleans cathedral/street balconies, playable animated survivor and infected, swamp boardwalk/cypress/moss/water, Houston glass skyline/rocket, Los Angeles observatory/hillside sign/palms. Final visual pass refined cypress leaf silhouettes, palm leaves, and street-facing Houston facades. Final Houston/swamp production screenshots inspected. Readable ambient fill and cast shadows present; metal/wet surfaces respond to filtered environment light.
- Final production startup and district changes: no browser exceptions or console errors. Earlier PMREM sample warning corrected. One interrupted preview reload occurred when its bounded server lifetime ended; verified server restart and refreshed interrupted model cache resolved it. This was not treated as a gameplay pass.

## Scope / limitations
- Compact expedition districts, not full-size real-city maps or a AAA franchise recreation.
- Online co-op is client-host authoritative with shared transient enemies/loot. No persistent dedicated world server, anti-cheat, PvP, or commercial economy security is claimed.
- Cloud save contract and fallback validated statically. Local progress restoration verified in browser. A stable host runtime identity was not provided by the standalone browser preview, so cross-device cloud save/load could not be exercised here; UI clearly reports local saving. Cloud writes use only the platform context when available.
- Night/horde, all achievement thresholds, and every mission branch were not exhaustively playtested; representative survival actions were tested.

## Publication
Approved Three.js publisher succeeded, uploaded 12 build files and synchronized frontend Preview. Published entry: https://static.seeles.ai/media/3js/2da931f6-2481-4d04-a99d-aa9ec030e5e1/index.html . Actual published page opened successfully; ready state true, no browser exceptions or console errors. Owned browser session closed after verification.

## Exploration expansion verification
- `node test_expansion.mjs`: passed preparation checks for all 16 furnished shells and entrances.
- `node test_world.mjs`: passed integrated flood-fill navigation in all four actual district geometries. All 16 room centers and supply caches reachable from deployment; 10 caches per district. Roof meshes survive static batching. About 17–18k sampled walkable points per city, 5.5k in the boardwalk network.
- `node --check src/main.js`, `src/assets.js`, `src/expansion.js`: passed. `npm run build`: passed; final JS 930.69KB / 250.95KB gzip. Existing non-blocking chunk-size warning remains.
- Actual production build tested at a non-root `/dist/` path. No external resource origins in performance entries; local FBX/audio/CSS/JS resources loaded. No browser exceptions or console errors observed during the representative checks.
- Real keyboard-controlled traversal: New Orleans deployment → crossing at z28 → side street → French Market Pharmacy doorway → interior cache; loot 0→1, spare rounds120→144. Exit through the same doorway verified with interior label returning to null. Saved/reloaded position restored inside the pharmacy at x−44.56/z25.37 with looted cache and ammunition retained.
- Bayou: real movement down main boardwalk and right branch into Blackwater Boathouse; raised floor and furnishings displayed, signed interior label correct. Houston and Los Angeles district changes displayed all four correct site names and rendered without errors.
- New control checks: mouse capture succeeded, right aim, Q changed shoulder to left, T flashlight enabled, wheel reduced zoom4.9→4.1, sensitivity slider set1.2, invert checkbox and Cinematic/Performance switch worked. Rifle fire killed an infected (kill0→1; two rounds expended). Clear-input and camera obstruction logic inspected; camera shortened against interior walls.
- Visual previews inspected: branching Quarter street with cathedral focal point, pharmacy masonry/interior doorway, warm ceiling practicals, timber boathouse/cots/window/boardwalk view, detailed character. Refined surface tiling, bump response, curved interior foliage and retained ceilings after first visual pass. Roof cutaway is used only for high camera angles.
- Two automation waits timed out before traversal finished because this browser renderer advanced slowly; positions were inspected, smaller input steps resumed, and actual entrance/exit paths passed. These timeouts were not reported as successful tests.
- Existing save format and realtime services were not replaced. The new caches use the same used-item snapshots and persisted depleted IDs. Local interior save/load verified. This revision did not repeat two-client co-op or authenticated cross-device cloud tests; prior co-op evidence remains above, and standalone cloud identity remains unavailable.
- Changed source: src/expansion.js (new), src/assets.js, src/main.js, src/style.css, index.html. Added repeatable test_expansion.mjs and test_world.mjs; design/asset/verification records updated. No unrelated services changes.

Expansion publication: approved Three.js publisher succeeded with 12 files, frontend Preview synchronized. Published entry https://static.seeles.ai/media/3js/89e0739b-5905-4cbb-9b7c-9dff4190e564/index.html opened successfully; ready=true, four expansion sites present, no browser errors or console errors. Owned browser session closed.
