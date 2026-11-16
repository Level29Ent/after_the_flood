import assert from "node:assert/strict";
import * as T from "three";
import {
  restoreLiving,
  WEAPONS,
  INFECTED,
  PEOPLE,
  startDispatch,
  searchDispatch,
  meetSurvivor,
  tickDispatch,
  completeDispatch,
  damageAgainst,
  resupplyWeapon,
  findRoute,
  failDispatch,
} from "./src/living-systems.js";
import {
  createLivingWorld,
  decorateInfected,
  releaseInfected,
} from "./src/living-world.js";
import { restoreFlood } from "./src/flood-systems.js";
import { makeMaterials, buildDistrict } from "./src/assets.js";
import { withinExpansion } from "./src/expansion.js";
const living = restoreLiving();
assert.equal(living.selected, "carbine");
assert.equal(living.missions.length, 4);
assert.deepEqual(restoreLiving(null), living);
assert.equal(
  restoreLiving({
    selected: "invalid",
    ammo: { crossbow: { loaded: 900, reserve: -2 } },
    missions: [
      { stage: "bogus", remaining: Infinity, position: { x: NaN, z: 3 } },
    ],
  }).ammo.crossbow.loaded,
  1,
);
assert.equal(
  restoreLiving({ missions: [{ position: { x: Infinity, z: 0 } }] }).missions[0]
    .position,
  null,
);
const game = {
  flood: restoreFlood(),
  credits: 0,
  xp: 0,
  scrap: 30,
  reserve: 120,
};
for (let d = 0; d < 4; d++) {
  assert.match(startDispatch(living, d, "rescue", 1, 0), /accepted/);
  const m = living.missions[d];
  assert.equal(completeDispatch(living, d, game), false);
  assert.match(startDispatch(living, d, "cargo", 1, 0), /Finish/);
  assert.equal(searchDispatch(m), true);
  assert.equal(searchDispatch(m), false);
  assert.equal(meetSurvivor(m, { x: 0, z: 27 }), true);
  const time = m.remaining;
  tickDispatch(m, 30, { active: false });
  assert.equal(m.remaining, time);
  tickDispatch(m, 2, { distance: 1, danger: true });
  assert.equal(m.hp, 90);
  assert.equal(completeDispatch(living, d, game), true);
  assert.equal(completeDispatch(living, d, game), false);
  assert.equal(game.flood.survivors.at(-1).name, PEOPLE[d].name);
  assert.match(startDispatch(living, d, "cargo", 1, 0), /secure today/);
  assert.match(startDispatch(living, d, "cargo", 2, 0), /accepted/);
  searchDispatch(m);
  assert.equal(m.stage, "deliver");
  assert.equal(completeDispatch(living, d, game), true);
}
assert.equal(living.rescues, 4);
assert.equal(living.deliveries, 4);
assert.equal(game.credits, 1000);
assert.equal(game.xp, 1600);
assert.equal(restoreFlood(game.flood).survivors[0].name, PEOPLE[0].name);
assert.deepEqual(restoreLiving(JSON.parse(JSON.stringify(living))), living);
startDispatch(living, 0, "rescue", 3, 0);
const m = living.missions[0];
assert.match(tickDispatch(m, 601), /storm/);
assert.equal(m.stage, "failed");
assert.equal(completeDispatch(living, 0, game), false);
assert.match(startDispatch(living, 0, "rescue", 3, 12), /full/);
startDispatch(living, 0, "rescue", 3, 0);
searchDispatch(m);
meetSurvivor(m, { x: 0, z: 0 });
m.hp = 1;
tickDispatch(m, 1, { danger: true, distance: 2 });
assert.equal(m.stage, "failed");
startDispatch(living, 0, "rescue", 3, 0);
assert.equal(failDispatch(m), true);
assert.equal(failDispatch(m), false);
assert.equal(damageAgainst("armored", "carbine", 100), 40);
assert.equal(damageAgainst("armored", "crossbow", 100), 80);
assert.equal(damageAgainst("armored", "machete", 100), 90);
assert.equal(damageAgainst("walker", "carbine", 100), 100);
assert.equal(WEAPONS.shotgun.pellets, 6);
assert.ok(WEAPONS.crossbow.noise < WEAPONS.carbine.noise);
assert.ok(INFECTED.ambusher.detect < INFECTED.walker.detect);
const oldReserve = game.reserve;
resupplyWeapon(living, game, "crossbow");
assert.equal(game.reserve, oldReserve);
assert.equal(living.ammo.crossbow.reserve, 18);
game.scrap = 0;
const ammo = { ...living.ammo.shotgun };
assert.match(resupplyWeapon(living, game, "shotgun"), /Not enough/);
assert.deepEqual(living.ammo.shotgun, ammo);
const around = findRoute(
  { x: 0, z: 0 },
  { x: 4, z: 0 },
  (x, z) => x === 2 && Math.abs(z) < 2,
);
assert.ok(around.some((p) => Math.abs(p.z) >= 2));
assert.deepEqual(
  findRoute({ x: 0, z: 0 }, { x: 4, z: 0 }, () => true, { maxNodes: 10 }),
  [],
);
const ctx = new Proxy({}, { get: () => () => {} }),
  nodes = new Map();
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  querySelector: (selector) => {
    if (!nodes.has(selector))
      nodes.set(selector, { textContent: "", hidden: false });
    return nodes.get(selector);
  },
};
const materials = makeMaterials();
for (let d = 0; d < 4; d++) {
  const world = buildDistrict(d, materials);
  const blocked = (x, z) =>
    !withinExpansion(d, x, z, 0.3) ||
    world.colliders.some(
      (c) =>
        (c.minY || 0) < 1.8 + (d === 3 ? 0.26 : 0) &&
        Math.abs(x - c.x) < c.w / 2 + 0.3 &&
        Math.abs(z - c.z) < c.d / 2 + 0.3,
    );
  const from = { x: d === 3 ? -1.75 : -5, z: 29 },
    to = { x: 0, z: 43 };
  const path = findRoute(from, to, blocked, { step: 0.5 });
  assert.ok(path.length, `escort route reaches camp in district ${d}`);
  for (const p of path) assert.equal(blocked(p.x, p.z), false);
  const interiorRoute = findRoute(
    { x: world.sites[0].x, z: world.sites[0].z },
    to,
    blocked,
    { step: 0.5 },
  );
  assert.ok(
    interiorRoute.length,
    `interior route avoids walls in district ${d}`,
  );
  const scene = new T.Scene(),
    actor = { group: new T.Group() },
    state = {
      living: restoreLiving(),
      flood: restoreFlood(),
      credits: 0,
      xp: 0,
      day: 1,
    };
  let layer = "street",
    active = true,
    solo = true,
    html = "";
  const characters = {
    make() {
      return {
        group: new T.Group(),
        mixer: { stopAllAction() {}, update() {} },
        set() {},
      };
    },
  };
  const lw = createLivingWorld({
    scene,
    getState: () => state,
    getDistrict: () => d,
    getWorld: () => world,
    getActor: () => actor,
    getCharacters: () => characters,
    getLayer: () => layer,
    canUse: () => solo,
    isActive: () => active,
    blocked,
    move: (o, dx, dz) => {
      if (!blocked(o.position.x + dx, o.position.z)) o.position.x += dx;
      if (!blocked(o.position.x, o.position.z + dz)) o.position.z += dz;
    },
    openModal: (h) => (html = h),
    closeModal() {},
    toast() {},
    save() {
      return true;
    },
    equip() {},
  });
  lw.rebuild();
  lw.action("start:rescue");
  assert.match(html, /Search/);
  const mission = state.living.missions[d];
  actor.group.position.set(world.sites[0].x, 0, world.sites[0].z);
  lw.update(0, []);
  assert.equal(lw.nearby().kind, "search");
  lw.interact();
  assert.equal(mission.stage, "roof");
  layer = "roof";
  actor.group.position.set(from.x, 18.2, 27);
  lw.update(0.1, []);
  assert.equal(lw.nearby().kind, "meet");
  lw.interact();
  assert.equal(mission.stage, "escort");
  lw.update(0.1, []);
  layer = "street";
  actor.group.position.set(from.x, 0, 29);
  lw.update(0.1, []);
  const initial = mission.remaining;
  active = false;
  lw.update(10, []);
  assert.equal(mission.remaining, initial);
  active = true;
  solo = false;
  lw.update(10, []);
  assert.equal(mission.remaining, initial);
  assert.equal(lw.nearby(), null);
  solo = true;
  mission.holding = true;
  const heldPosition = {...mission.position};
  actor.group.position.set(from.x + 2, 0, 29);
  lw.update(.2, []);
  assert.deepEqual(mission.position, heldPosition, 'wait order holds position');
  mission.holding = false;
  state.flood.vessel = 'raft';
  lw.update(.2, []);
  assert.equal(mission.position.x, actor.group.position.x + .7, 'nearby follower boards vessel');
  assert.deepEqual(restoreLiving(JSON.parse(JSON.stringify(state.living))).missions[d].position, mission.position, 'escort location survives save migration');
  state.flood.vessel = null;
  // Move the player along the actual reachable route. Companion follows through movement/collision hooks.
  for (const p of path) {
    actor.group.position.set(p.x, 0, p.z);
    for (let i = 0; i < 10; i++) lw.update(0.1, []);
  }
  actor.group.position.set(0, 2.15, 43);
  for (let i = 0; i < 500 && mission.stage === "escort"; i++)
    lw.update(0.1, []);
  assert.equal(
    mission.stage,
    "complete",
    `physical follower reaches camp ${d}`,
  );
  assert.equal(state.flood.survivors.length, 1);
  lw.update(0, []);
  actor.group.position.set(-3, 2.15, 41);
  assert.equal(lw.nearby().kind, "talk");
  lw.interact();
  assert.match(html, new RegExp(PEOPLE[d].name));
  lw.hud();
  lw.dispose();
  assert.equal(scene.children.length, 0);
  const infected = characters.make();
  scene.add(infected.group);
  decorateInfected(infected, "armored");
  assert.ok(infected.group.userData.variantResources);
  releaseInfected(infected);
  assert.equal(scene.children.length, 0);
  world.root.traverse((o) => o.geometry?.dispose());
  console.log(
    `PASS district ${d}: real geometry routes, building search, rooftop rendezvous, physical escort, pause/co-op isolation, named camp conversation and teardown`,
  );
}
console.log(
  "PASS: save migration, rescue/cargo branches, unique daily rewards, crew cap, deadlines/death, health, armor weaknesses, ammo costs and independent reserves.",
);
