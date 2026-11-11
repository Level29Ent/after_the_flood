# Asset preparation record

Status: READY for engine integration. Runtime appearance and motion playback remain part of final validation.

## External sources
Assets supplied by the platform asset library for game integration. Source authorization: platform-provided retrieval assets; no claim of CC0. Sources retained below. All downloaded into project-local public/ and served with relative paths.

| Use | Local path | Source asset | Source URL |
|---|---|---|---|
| Survivor | public/models/survivor.fbx | 1005888 tactical soldier | https://asset.seeles.ai/asset/export/1616daaa-43c2-4f28-863a-7a1a1adee402/1005888/source.fbx |
| Infected | public/models/infected.fbx | 1005904 zombie | https://asset.seeles.ai/asset/export/91337ce2-4a6b-40d2-9fac-298779087cc9/1005904/source.fbx |
| Rifle run | public/models/run.fbx | 1075926 | https://asset.seeles.ai/asset/export/9bce8da2-62e4-4b73-a578-7923b0f008f8/1075926/source.fbx |
| Rifle idle | public/models/idle.fbx | 1082506 | https://asset.seeles.ai/asset/export/252472c5-2a3c-4a12-b74d-9e2e2059bdbc/1082506/source.fbx |
| Infected walk | public/models/zombie_walk.fbx | 1079807 | https://asset.seeles.ai/asset/export/95b1e868-eb5d-4a45-b46d-5e73ba7b1f7e/1079807/source.fbx |
| Firing | public/models/shoot.fbx | 1075571 | https://asset.seeles.ai/asset/export/e5cf3521-08f0-49eb-8ec4-e2560121a768/1075571/source.fbx |
| Infected attack | public/models/attack.fbx | 1069002 | https://asset.seeles.ai/asset/export/9fdf5d7c-e4c3-4a75-8192-92fdb5ce20a9/1069002/source.fbx |
| Gunshot | public/audio/shot.mp3 | 157101 | https://asset.seeles.ai/asset/export/ab4734e7-93de-439e-814b-a6fb9ebde18b/157101/sfx_157101_3198767.mp3 |
| Ambience | public/audio/ambience.mp3 | 124170 | https://asset.seeles.ai/asset/export/62338161-2d32-4d9b-8313-fcc526ec607e/124170/bgm_124170_2994982.mp3 |

Visual previews were inspected: tactical civilian-style blue/black survivor and detailed infected woman share realistic, weathered surface treatment. The cartoon candidate was rejected.

## Inspection evidence
`node inspect_assets.mjs` and `asset-inspection.json`: actual Mixamo hierarchy inspected, not inferred from prefixes. Hips → Spine → Spine1 → Spine2; shoulder → arm → forearm → hand; hips → up-leg → leg → foot → toe. T-rest orientation and limb lengths match the Mixamo family. FBX duplicate zero-transform bone nodes are retained as skinning links; the first canonical node drives their inherited motion. Survivor 71 nodes, 2 skinned meshes, 58,350 vertices; infected 189 nodes across mesh bindings, 3 skinned meshes, 22,344 vertices. Every vertex has normalized finite skin weights (zero invalid vertices). Embedded diffuse textures present for each material. Local scale normalized from 177.998cm / 206.576cm source bounds to 1.83m; Y-up, forward +Z, gameplay pivot at feet. Character controller collision uses a 0.42m radius, independent from render mesh.

Motions contain 53 Mixamo tracks each. Rifle idle 7.70s; rifle run .733s; infected walk 4.033s; shooting 1.167s; attack 4.633s. `loadCharacters` binds matching tracks and converts hip height to target proportions, strips horizontal root movement for controller-driven in-place movement. Actual blending and orientation remain runtime checks.

## Authored reusable assets
`src/assets.js` implements the actual procedural assets: 512px deterministic surface maps (road, stucco, wood, brick, rust), repeat-wrapped sRGB color maps, Standard materials with explicit roughness/metalness, detailed balcony architecture, window shutters/slats/mullions/sills, columns/cornices, curved street lamps, rounded car shells/wheels/hubs, relief caches and radio, detailed rifle, cypress roots/branches/moss, boardwalk, reeds, palms, cathedral spires/clock/arches, space-center rocket, observatory domes, hillside sign. Final district static geometry is merged by material; focal curved geometry uses smooth normals and sufficient segments. Scene colliders are explicit dimensions in meters. Each district uses a compact ~110m playable length, not a geographically accurate city replica.

Sky is generated from direction gradients and warm sun, reproducible uniform parameters; Cube/PMREM convolution provides roughness-dependent specular lighting. Hemisphere sky #d6ddd1/ground #555a3a at 1.55 and warm directional sun at 3.2, shadow map 2048. Filmic exposure and final fog are engine integration work. Deliberate procedural LDR environment, not labeled HDR.

UI assets: system sans-serif and Georgia available locally; SVG/typographic icons and CSS field-document panels authored in project. No external fonts/images. Local MP3 audio files confirmed present. No video needed.

Checks passed: local downloads, FBX parse, hierarchy/weights, embedded material presence, animation durations and tracks, asset module syntax. Pending engine checks: material rendering/texture clarity, gameplay collision dimensions, animated state transitions, lighting and reflections, representative world composition.

## Exploration expansion — Asset Preparation READY
- `src/expansion.js`: four reusable furnished shells per district, 16 named sites, 12m square rooms, 2.8m door clear width and 3.4m opening height, roof parapets, window frames, entrance signs, counters/shelving/cots/consoles/salvage props, warm practical lights. Detailed bevels, 24–32 segment curved props, existing weathered texture materials. Authored locally; no external assets or licenses added.
- Connected branch routes: two streets per city and two raised boardwalks in the bayou. Explicit meter-scale AABB wall/furniture colliders with minimum height, allowing the player below door lintels. Roof groups kept separate for camera visibility.
- Character and audio reuse: unchanged verified local FBX/MP3 files and matching existing idle/run/shoot clips; no new animation states or skeleton changes. Evidence remains asset-inspection.json.
- UI: existing local fonts and field-document theme retained; no additional artwork needed.
- Preparation checks: `node --check src/expansion.js` passed. `node test_expansion.mjs` passed all four districts: four finite shells, center aisle/door clearance, route continuity and cache bounds. Initial center-aisle obstruction from a clinic cot was caught and corrected before integration. Representative rendered interior, collision integration and close material response remain runtime checks, not claimed here.
