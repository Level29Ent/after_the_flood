import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import * as T from "three";
import { restoreGame, readLocalSave } from "./src/save-state.js";
import { restoreLiving } from "./src/living-systems.js";
import { restoreFlood } from "./src/flood-systems.js";
import { createExpedition } from "./src/flood-expedition.js";
const source = fs.readFileSync(
  new URL("./src/main.js", import.meta.url),
  "utf8",
);
// Exercise the actual integrated lifecycle functions with browser side effects stubbed.
function extract(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const match = /\n(?:async )?function /.exec(source.slice(start + 1));
  const end = match ? start + 1 + match.index : -1;
  return source.slice(start, end < 0 ? undefined : end);
}
const element = { style: {}, classList: { add() {}, remove() {} } };
let panel = "",
  penalties = 0;
const sandbox = {
  state: {
    hp: 0,
    scrap: 100,
    flood: { extraction: 0 },
    hunger: 20,
    ammo: 0,
    reserve: 0,
  },
  dead: false,
  ready: true,
  running: true,
  elapsed: 1,
  invulnerable: 5,
  dodgeUntil: 0,
  reloadUntil: 8,
  stamina: 0,
  survivalBenefits: () => ({ damageMultiplier: 1 }),
  audio: { cue() {} },
  $: () => element,
  setTimeout() {},
  livingWorld: {
    fail() {
      penalties++;
    },
  },
  mouseDown: false,
  document: { exitPointerLock() {} },
  modalOpen: false,
  clearInput() {},
  save() {
    return true;
  },
  expedition: { resetLayer() {} },
  actor: { group: { position: { set() {} } } },
  updateDistrictUI() {},
  keys: new Set(),
};
vm.createContext(sandbox);
for (const name of [
  "openModal",
  "closeModal",
  "hurt",
  "die",
  "respawn",
  "menu",
])
  vm.runInContext(extract(name), sandbox);
sandbox.hurt(1);
assert.equal(
  sandbox.dead,
  true,
  "zero HP always triggers death even under combat invulnerability",
);
assert.equal(sandbox.state.scrap, 70);
assert.equal(sandbox.reloadUntil, 0);
assert.equal(penalties, 1);
sandbox.die();
assert.equal(sandbox.state.scrap, 70, "death penalty applied only once");
assert.equal(penalties, 1);
const deathPanel = element.innerHTML;
sandbox.openModal("Field kit");
assert.equal(
  element.innerHTML,
  deathPanel,
  "death panel cannot be replaced by field kit",
);
sandbox.menu();
assert.equal(sandbox.dead, true, "menu cannot bypass required respawn");
sandbox.respawn();
assert.equal(sandbox.dead, false);
assert.equal(sandbox.state.hp, 100);
assert.equal(sandbox.state.ammo, 15);
sandbox.state.hp = 40;
sandbox.respawn();
assert.equal(
  sandbox.state.hp,
  40,
  "respawn cannot be used to heal while alive",
);
// Actual main-loop timing must not advance reload, invulnerability or hearing while paused.
const position = { set() {}, x: 0, z: 0 };
Object.assign(sandbox, {
  enemies: [],
  controls: { flashlight: false },
  world: { root: {}, interact: [] },
  actor: { group: { position } },
  modalOpen: true,
  running: true,
  dead: false,
  room: { connected: false, isHost: true, players: {} },
  updatePlayer: () => false,
  fieldcraft: { update() {} },
  expedition: { update() {}, layer: () => "street" },
  updateEnemies() {},
  livingWorld: { update() {} },
  scene: { fog: {} },
  lighting: {
    sun: { intensity: 1, target: { position }, position },
    hemi: { intensity: 1 },
  },
  T,
  renderer: {},
  effects: [],
  muzzleLight: { intensity: 0 },
  dust: { rotation: {} },
  remotes: new Map(),
  autosave: 0,
  hudClock: 0,
  composer: { render() {} },
  updateHud() {},
  checkAchievements() {},
  elapsed: 10,
});
sandbox.state.time = 17;
sandbox.state.day = 1;
vm.runInContext(extract("frame"), sandbox);
sandbox.frame(100, 0.05);
assert.equal(sandbox.elapsed, 10, "solo menu pauses simulation clock");
sandbox.modalOpen = false;
sandbox.frame(150, 0.05);
assert.equal(sandbox.elapsed, 10.05, "active play advances simulation clock");
vm.runInContext(extract("makeNoise"), sandbox);
sandbox.enemies = [{ hp: 10, actor: { group: { position: new T.Vector3() } } }];
sandbox.makeNoise(new T.Vector3(), 40, true);
assert.ok(
  Math.abs(sandbox.enemies[0].alertUntil - sandbox.elapsed - 1.2) < 1e-9,
);
sandbox.makeNoise(new T.Vector3(), 40);
assert.equal(sandbox.enemies[0].alertUntil - sandbox.elapsed, 10);
sandbox.expedition.layer = () => "roof";
vm.runInContext(extract("nearest"), sandbox);
assert.equal(sandbox.nearest(), null);
sandbox.expedition.layer = () => "tunnel";
assert.equal(sandbox.nearest(), null);
const base = {
  version: 1,
  hp: 100,
  hunger: 100,
  day: 1,
  time: 17.5,
  district: 0,
  ammo: 30,
  reserve: 120,
  scrap: 15,
  credits: 0,
  xp: 0,
  medkits: 3,
  upgrade: 0,
  kills: 0,
  looted: 0,
  streak: 0,
  jobs: 0,
  jobProgress: 0,
  dailyKills: 0,
  dailyLoot: 0,
  sound: true,
  position: { x: 0, z: 38 },
  missions: [],
  visited: [0],
  achievements: [],
  cacheProgress: [0, 0, 0, 0],
  lastSecured: [-1, -1, -1, -1],
  depleted: [[], [], [], []],
  flood: {},
  living: {},
  fieldcraft: {},
  training: {},
};
const defaults = () => structuredClone(base);
assert.deepEqual(restoreGame(null, defaults), base);
const corrupted = restoreGame(
  {
    version: 1,
    hp: "100",
    day: NaN,
    district: 2.5,
    ammo: 999,
    upgrade: 9,
    depleted: [null, "string", [1, "a", "a"]],
    visited: [-1, "1", 2, 2, Infinity],
    position: { x: Infinity, z: 0 },
    sound: "yes",
  },
  defaults,
);
assert.equal(corrupted.hp, 100);
assert.equal(corrupted.day, 1);
assert.equal(corrupted.district, 2);
assert.equal(corrupted.ammo, 30);
assert.equal(corrupted.upgrade, 5);
assert.deepEqual(corrupted.visited, [2]);
assert.deepEqual(corrupted.depleted, [[], [], ["a"], []]);
assert.deepEqual(corrupted.position, base.position);
assert.equal(corrupted.sound, true);
const deadSave = restoreGame(
  { version: 1, hp: 0, position: { x: 12, z: 5 } },
  defaults,
);
assert.equal(deadSave.hp, 100);
assert.deepEqual(deadSave.position, { x: 0, z: 43 });
assert.equal(restoreLiving({ selected: "toString" }).selected, "carbine");
assert.equal(restoreLiving({ selected: "__proto__" }).selected, "carbine");
assert.equal(
  restoreFlood({ survivors: [null, 4, { role: "Medic" }] }).survivors.length,
  1,
);
assert.equal(
  restoreFlood({ vessel: "toString", fleet: { toString: {} } }).vessel,
  null,
);
let status = [];
const payload = {
  schema_version: 1,
  savedAt: 20,
  game_data: { version: 1, hp: 60 },
};
const storage = {
  getItem: (key) =>
    key.endsWith(":backup") ? JSON.stringify(payload) : "null",
};
assert.deepEqual(
  readLocalSave(storage, "game", (m) => status.push(m)),
  payload,
);
assert.equal(status.at(-1), "Recovered backup save");
assert.deepEqual(
  readLocalSave(
    {
      getItem: (key) =>
        key.endsWith(":backup") ? JSON.stringify(payload) : "{broken",
    },
    "game",
  ),
  payload,
);
assert.equal(
  readLocalSave(
    {
      getItem() {
        throw Error("denied");
      },
    },
    "game",
    (m) => status.push(m),
  ),
  null,
);
assert.equal(status.at(-1), "Local save could not be read");
const ctx = new Proxy({}, { get: () => () => {} }),
  nodes = new Map();
globalThis.document = {
  createElement: () => ({ width: 0, height: 0, getContext: () => ctx }),
  querySelector: (sel) => {
    if (!nodes.has(sel)) nodes.set(sel, { textContent: "" });
    return nodes.get(sel);
  },
  body: { classList: { toggle() {} } },
};
for (let d = 0; d < 4; d++) {
  const scene = new T.Scene(),
    actor = { group: new T.Group() },
    state = { flood: restoreFlood(), day: 1, hp: 100, time: 17 };
  let active = false,
    solo = true,
    stamina = 100,
    deaths = 0,
    shown = 0;
  const expedition = createExpedition({
    scene,
    getState: () => state,
    getDistrict: () => d,
    getActor: () => actor,
    getStamina: () => stamina,
    setStamina: (v) => (stamina = v),
    hurt: (amount) => {
      state.hp = Math.max(0, state.hp - amount);
    },
    move() {},
    openModal() {
      shown++;
    },
    closeModal() {},
    toast() {},
    save() {
      return true;
    },
    isActive: () => active,
    canUse: () => solo,
    onDeath: () => deaths++,
  });
  expedition.rebuild();
  state.flood.gear.flashlight = true;
  const x = d === 3 ? -1.75 : -5;
  actor.group.position.set(x, 0, 27);
  expedition.act("site:roof");
  assert.equal(expedition.layer(), "roof");
  assert.equal(
    expedition.nearest(),
    null,
    "street sites are not interactable from roof",
  );
  assert.equal(expedition.context().dock, false);
  const copper = state.flood.inventory.copper;
  expedition.act("site:car");
  assert.equal(state.flood.inventory.copper, copper);
  expedition.resetLayer();
  assert.equal(
    actor.group.position.z,
    29,
    "returning from roof moves actor to stairwell exit",
  );
  actor.group.position.set(d === 3 ? 1.75 : 5, 0, 27);
  expedition.act("site:tunnel");
  assert.equal(expedition.layer(), "tunnel");
  assert.equal(expedition.nearest(), null);
  expedition.resetLayer();
  assert.equal(actor.group.position.y, 0);
  state.flood.vessel = "raft";
  state.flood.fleet.raft = { hull: 100, fuel: 0, modules: 0 };
  state.flood.anchored = true;
  assert.equal(expedition.speed(), 0);
  solo = false;
  assert.equal(
    expedition.speed(),
    1,
    "personal anchored vessel cannot freeze co-op movement",
  );
  solo = true;
  state.flood.vessel = null;
  actor.group.position.set(x, 0, 27);
  stamina = 100;
  state.hp = 4;
  expedition.act("site:roof");
  expedition.act("climb");
  const before = shown;
  expedition.act("climb");
  assert.equal(state.hp, 0);
  assert.equal(deaths, 1, "fatal climb damage calls death transition");
  assert.equal(shown, before, "fatal action cannot replace the death panel");
  state.hp = 0.001;
  state.flood.illness = 100;
  state.flood.oxygen = 0;
  active = true;
  expedition.update(0.05, false);
  assert.equal(state.hp, 0);
  assert.equal(
    deaths,
    2,
    "environmental death bypasses combat damage cooldown",
  );
  expedition.dispose();
  assert.equal(scene.children.length, 0);
  console.log(
    `PASS district ${d}: layer isolation/surface recovery, co-op movement, fatal climb and environmental death`,
  );
}
console.log(
  "PASS: idempotent death and respawn, malformed-save normalization, backup recovery and prototype-safe migration.",
);
