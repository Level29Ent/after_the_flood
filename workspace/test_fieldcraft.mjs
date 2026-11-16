import assert from "node:assert/strict";
import * as T from "three";
import {
  restoreFieldcraft,
  craftFieldcraft,
  useDressing,
  collectRecord,
  consumeDecoy,
  perceptionRadius,
  choosePursuit,
  RECORDS,
} from "./src/fieldcraft.js";
import {
  createFieldcraft,
  hasClearSight,
  findThrowTarget,
} from "./src/fieldcraft-world.js";
import { restoreLiving, findRoute } from "./src/living-systems.js";
import { restoreFlood } from "./src/flood-systems.js";
import { makeMaterials, buildDistrict } from "./src/assets.js";
import { withinExpansion } from "./src/expansion.js";
const game = () => ({
  fieldcraft: restoreFieldcraft(),
  living: restoreLiving(),
  flood: restoreFlood(),
  scrap: 20,
  hp: 100,
  xp: 0,
  credits: 0,
  medkits: 0,
});
assert.deepEqual(restoreFieldcraft(null), restoreFieldcraft());
assert.equal(restoreFieldcraft({ decoys: -1, dressings: Infinity }).decoys, 0);
assert.equal(restoreFieldcraft({ dressings: 90 }).dressings, 9);
assert.deepEqual(
  restoreFieldcraft({ records: [0, 0, 4, "1", -1, 12, 1.5, null] }).records,
  [0, 4],
);
let g = game(),
  s = g.fieldcraft;
craftFieldcraft(s, g, "decoy");
assert.equal(s.decoys, 3);
assert.equal(g.scrap, 17);
g.scrap = 0;
assert.match(craftFieldcraft(s, g, "dressing"), /Not enough/);
assert.equal(s.dressings, 2);
s.decoys = 9;
g.scrap = 100;
assert.match(craftFieldcraft(s, g, "decoy"), /limit/);
assert.equal(g.scrap, 100);
assert.equal(consumeDecoy(s), true);
s.decoys = 0;
assert.equal(consumeDecoy(s), false);
assert.match(useDressing(s, g, null), /full/);
assert.equal(s.dressings, 2);
g.hp = 50;
assert.match(useDressing(s, g, null), /applied/);
assert.equal(g.hp, 80);
assert.equal(s.dressings, 1);
g.hp = 99;
useDressing(s, g, null);
assert.equal(g.hp, 100);
assert.equal(s.dressings, 0);
s.dressings = 3;
const m = g.living.missions[0];
m.stage = "escort";
m.hp = 40;
assert.match(useDressing(s, g, m, 4, "escort"), /Reach/);
assert.equal(s.dressings, 3);
useDressing(s, g, m, 2, "escort");
assert.equal(m.hp, 75);
assert.equal(s.dressings, 2);
m.stage = "failed";
assert.match(useDressing(s, g, m, 0, "escort"), /Reach/);
g.hp = 0;
assert.match(useDressing(s, g, m), /station/);
assert.equal(s.dressings, 2);
g = game();
for (let d = 0; d < 4; d++)
  for (let slot = 0; slot < 3; slot++) {
    const result = collectRecord(g.fieldcraft, g, d, slot);
    assert.equal(result.surveyed, slot === 2);
    const before = structuredClone(g);
    assert.equal(collectRecord(g.fieldcraft, g, d, slot), null);
    assert.deepEqual(g, before);
  }
assert.equal(g.xp, 480);
assert.equal(g.credits, 400);
assert.equal(g.medkits, 4);
assert.equal(g.fieldcraft.records.length, 12);
assert.equal(collectRecord(g.fieldcraft, g, 9, 0), null);
assert.deepEqual(
  restoreFieldcraft(JSON.parse(JSON.stringify(g.fieldcraft))),
  g.fieldcraft,
);
assert.equal(perceptionRadius(20, { sneaking: true }), 9);
assert.equal(perceptionRadius(20, { moving: true, sprinting: true }), 25);
assert.ok(perceptionRadius(20, { flashlight: true }) > 20);
assert.equal(choosePursuit({ distance: 20, visible: true, radius: 10 }), null);
assert.equal(
  choosePursuit({ distance: 20, visible: true, radius: 28, lured: true }),
  "noise",
);
assert.equal(
  choosePursuit({ distance: 2, visible: true, radius: 10, lured: true }),
  "player",
);
assert.equal(choosePursuit({ distance: 2, visible: false, radius: 10 }), null);
assert.equal(
  choosePursuit({ distance: 2, visible: false, radius: 10, heard: true }),
  "noise",
);
const zero = new T.Vector3(),
  forward = new T.Vector3(0, 0, -1),
  wall = { x: 0, z: -5, w: 3, d: 1, h: 4 };
assert.equal(hasClearSight(zero, new T.Vector3(0, 0, -10), [wall]), false);
assert.equal(hasClearSight(zero, new T.Vector3(4, 0, 0), [wall]), true);
assert.equal(hasClearSight(zero, zero, [wall]), true);
assert.equal(
  hasClearSight(new T.Vector3(0, 5, 0), new T.Vector3(0, 5, -10), [wall]),
  true,
);
const stop = findThrowTarget(zero, forward, (x, z) => z < -4, 0.2);
assert.ok(stop.z >= -4);
assert.equal(stop.y, 0.2);
assert.equal(findThrowTarget(zero, forward, () => false, 0.2).z, -12);
assert.equal(
  findThrowTarget(zero, forward, () => true, 0.2),
  null,
);
const ctx = new Proxy({}, { get: () => () => {} }),
  nodes = new Map();
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  querySelector: (sel) => {
    if (!nodes.has(sel)) nodes.set(sel, { hidden: true, textContent: "" });
    return nodes.get(sel);
  },
};
const materials = makeMaterials();
for (let district = 0; district < 4; district++) {
  const world = buildDistrict(district, materials),
    scene = new T.Scene(),
    actor = { group: new T.Group() },
    state = game();
  let solo = true,
    active = true,
    layer = "street",
    seen = true,
    html = "",
    noise = 0,
    sneak = false,
    target = new T.Vector3(0, 0.3, 25),
    saves = 0;
  const blocked = (x, z) =>
    !withinExpansion(district, x, z, 0.3) ||
    world.colliders.some(
      (c) =>
        (c.minY || 0) < 1.8 + (district === 3 ? 0.26 : 0) &&
        Math.abs(x - c.x) < c.w / 2 + 0.3 &&
        Math.abs(z - c.z) < c.d / 2 + 0.3,
    );
  const field = createFieldcraft({
    scene,
    getState: () => state,
    getWorld: () => world,
    getActor: () => actor,
    getDistrict: () => district,
    getLayer: () => layer,
    canUse: () => solo,
    isActive: () => active,
    hasSight: (from, to) => seen && hasClearSight(from, to, world.colliders),
    openModal: (h) => (html = h),
    toast() {},
    save() {
      saves++;
    },
    emitNoise: (p, r, lure) => {
      assert.equal(r, 40);
      assert.equal(lure, true);
      noise++;
    },
    throwTarget: () => target,
    toggleSneak: () => (sneak = !sneak),
    isSneaking: () => sneak,
  });
  field.rebuild();
  assert.equal(scene.getObjectByName("fieldcraft-world").children.length, 3);
  field.show();
  assert.match(html, /0\/12/);
  assert.doesNotMatch(html, new RegExp(RECORDS[district][0][1]));
  field.action("track:0");
  assert.equal(field.objective().x, world.sites[1].x);
  for (let slot = 0; slot < 3; slot++) {
    const site = world.sites[slot + 1];
    const route = findRoute({ x: 0, z: 38 }, site, blocked, { step: 0.5 });
    assert.ok(route.length, `survey interior reachable ${district}:${slot}`);
    const end = route.at(-1);
    actor.group.position.set(end.x, 0, end.z);
    assert.equal(field.nearby().slot, slot);
    seen = false;
    assert.equal(field.nearby(), null);
    seen = true;
    layer = "roof";
    assert.equal(field.nearby(), null);
    layer = "street";
    solo = false;
    assert.equal(field.interact(), false);
    solo = true;
    assert.equal(field.interact(), true);
    assert.equal(field.interact(), false);
  }
  assert.equal(state.fieldcraft.records.length, 3);
  assert.equal(state.credits, 100);
  assert.equal(state.medkits, 1);
  assert.equal(field.objective(), null);
  field.show();
  assert.match(html, new RegExp(RECORDS[district][0][0]));
  field.action("craft:decoy");
  assert.equal(state.fieldcraft.decoys, 3);
  field.action("sneak");
  assert.equal(sneak, true);
  state.hp = 50;
  field.action("heal:self");
  assert.equal(state.hp, 80);
  const mission = state.living.missions[district];
  mission.stage = "escort";
  mission.hp = 40;
  mission.position = { x: actor.group.position.x, z: actor.group.position.z };
  field.action("heal:escort");
  assert.equal(mission.hp, 75);
  actor.group.position.set(0, 0, 35);
  const before = state.fieldcraft.decoys;
  target = null;
  field.throwDecoy();
  assert.equal(state.fieldcraft.decoys, before);
  target = new T.Vector3(0, 0.3, 25);
  active = false;
  field.throwDecoy();
  assert.equal(state.fieldcraft.decoys, before);
  active = true;
  solo = false;
  field.throwDecoy();
  assert.equal(state.fieldcraft.decoys, before);
  solo = true;
  layer = "tunnel";
  field.throwDecoy();
  assert.equal(state.fieldcraft.decoys, before);
  layer = "street";
  field.throwDecoy();
  assert.equal(state.fieldcraft.decoys, before - 1);
  field.update(0.1);
  assert.equal(noise, 1);
  active = false;
  field.update(20);
  assert.equal(noise, 1);
  active = true;
  solo = false;
  field.update(20);
  assert.equal(noise, 1);
  assert.equal(nodes.get("#fieldcraft-prompt").hidden, true);
  solo = true;
  field.update(1);
  assert.equal(noise, 2);
  field.update(8);
  assert.equal(noise, 2);
  assert.equal(
    scene.getObjectByName("fieldcraft-world").children.length,
    3,
    "expired lure resources removed",
  );
  field.throwDecoy();
  field.rebuild();
  assert.equal(
    scene.getObjectByName("fieldcraft-world").children.length,
    3,
    "district rebuild removes temporary decoys",
  );
  assert.equal(field.objective(), null);
  field.dispose();
  assert.equal(scene.children.length, 0);
  assert.ok(saves > 0);
  world.root.traverse((o) => o.geometry?.dispose());
  console.log(
    `PASS district ${district}: reachable surveys, visibility/layer guards, unique rewards/archive, healing, crafting, timed decoys, pause/co-op isolation and teardown`,
  );
}
console.log(
  "PASS: fieldcraft migration, inventory limits/costs, treatment guards, 12 unique survey rewards, perception/cover/lure priorities and blocked throwing.",
);
