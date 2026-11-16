// Saveable gameplay rules. No DOM, renderer, or realtime dependencies.
export const WEAPONS = {
  carbine: {
    name: "Ranger carbine",
    key: "1",
    damage: 38,
    range: 95,
    interval: 0.145,
    reload: 1.6,
    capacity: 30,
    pellets: 1,
    spread: 0,
    noise: 65,
    cost: 6,
    supply: 30,
    description: "Reliable automatic fire. Loud; attracts infected.",
  },
  crossbow: {
    name: "Salvage crossbow",
    key: "2",
    damage: 100,
    range: 55,
    interval: 1.1,
    reload: 1.8,
    capacity: 1,
    pellets: 1,
    spread: 0,
    noise: 7,
    cost: 4,
    supply: 6,
    description: "Quiet single bolt. Pierces armor better than bullets.",
  },
  shotgun: {
    name: "Pump shotgun",
    key: "3",
    damage: 23,
    range: 19,
    interval: 0.85,
    reload: 2.4,
    capacity: 6,
    pellets: 6,
    spread: 0.045,
    noise: 85,
    cost: 8,
    supply: 12,
    description: "Six-pellet close-range blast. Extremely loud.",
  },
  machete: {
    name: "Rescue machete",
    key: "4",
    damage: 60,
    range: 2.8,
    interval: 0.65,
    reload: 0,
    capacity: 0,
    pellets: 1,
    spread: 0,
    noise: 3,
    stamina: 18,
    description: "No ammunition. Costs 18 stamina; cuts through armor straps.",
  },
};
export const INFECTED = {
  walker: {
    name: "Drifter",
    hp: 100,
    speed: 1,
    detect: 28,
    damage: 12,
    color: "#a8b49a",
  },
  ambusher: {
    name: "Drowned ambusher",
    hp: 85,
    speed: 1.55,
    detect: 9,
    damage: 16,
    color: "#66b6ad",
  },
  screamer: {
    name: "Screamer",
    hp: 65,
    speed: 0.85,
    detect: 32,
    damage: 8,
    color: "#e6b15b",
  },
  armored: {
    name: "Armored responder",
    hp: 160,
    speed: 0.7,
    detect: 24,
    damage: 20,
    color: "#a3b5ce",
  },
};
export const PEOPLE = [
  {
    name: "Mara Bell",
    role: "Medic",
    line: "I kept the clinic radio running. Give me a medical tent and I can help the others.",
  },
  {
    name: "Eli Navarro",
    role: "Mechanic",
    line: "That engine still has a little life in it. Put me on the generator.",
  },
  {
    name: "June Walker",
    role: "Botanist",
    line: "Seeds survived in the top-floor cabinets. We can grow something here.",
  },
  {
    name: "Louis Reed",
    role: "Scout",
    line: "I marked the high ground. Stay off the flooded street when the screaming starts.",
  },
];
export function personFor(survivor, index = 0) {
  return (
    PEOPLE.find((p) => p.name === survivor.name) || {
      ...PEOPLE[
        Math.abs(Math.floor(Number(survivor.id) || index)) % PEOPLE.length
      ],
      role: survivor.role,
    }
  );
}
const n = (v, f = 0, max = 1e6) =>
  Number.isFinite(v) ? Math.max(0, Math.min(max, v)) : f;
const stages = [
  "idle",
  "search",
  "roof",
  "escort",
  "deliver",
  "complete",
  "failed",
];
export function restoreLiving(saved = {}) {
  const s = saved && typeof saved === "object" ? saved : {};
  return {
    version: 1,
    selected: WEAPONS[s.selected] ? s.selected : "carbine",
    onboarded: s.onboarded === true,
    ammo: {
      crossbow: {
        loaded: Math.floor(n(s.ammo?.crossbow?.loaded, 1, 1)),
        reserve: Math.floor(n(s.ammo?.crossbow?.reserve, 12, 300)),
      },
      shotgun: {
        loaded: Math.floor(n(s.ammo?.shotgun?.loaded, 6, 6)),
        reserve: Math.floor(n(s.ammo?.shotgun?.reserve, 24, 300)),
      },
    },
    missions: Array.from({ length: 4 }, (_, i) => {
      const m = s.missions?.[i] || {};
      return {
        stage: stages.includes(m.stage) ? m.stage : "idle",
        choice: m.choice === "cargo" ? "cargo" : "rescue",
        remaining: n(m.remaining, 600, 600),
        hp: n(m.hp, 100, 100),
        rewarded: m.rewarded === true,
        holding: m.holding === true,
        day: Math.floor(n(m.day)),
        position:
          Number.isFinite(m.position?.x) &&
          Number.isFinite(m.position?.z) &&
          Math.abs(m.position.x) < 100 &&
          Math.abs(m.position.z) < 100
            ? { x: m.position.x, z: m.position.z }
            : null,
      };
    }),
    rescues: Math.floor(n(s.rescues)),
    deliveries: Math.floor(n(s.deliveries)),
  };
}
export function startDispatch(s, district, choice, day, crewCount) {
  const m = s.missions[district];
  if (!m || !["rescue", "cargo"].includes(choice)) return "Unknown dispatch.";
  if (!["idle", "failed", "complete"].includes(m.stage))
    return "Finish the active dispatch first.";
  if (m.stage === "complete" && m.day >= day)
    return "This district is secure today. Return tomorrow.";
  if (choice === "rescue" && crewCount >= 12)
    return "Camp is full. Choose a supply run instead.";
  Object.assign(m, {
    stage: "search",
    choice,
    remaining: 600,
    hp: 100,
    rewarded: false,
    holding: false,
    day,
    position: null,
  });
  return choice === "rescue"
    ? "Distress accepted. Search the marked building for the rooftop access notes."
    : "Supply run accepted. Recover the medical cargo from the marked building.";
}
export function searchDispatch(m) {
  if (m.stage !== "search") return false;
  m.stage = m.choice === "rescue" ? "roof" : "deliver";
  return true;
}
export function meetSurvivor(m, position) {
  if (m.stage !== "roof") return false;
  m.stage = "escort";
  m.position = { x: position.x, z: position.z };
  return true;
}
export function failDispatch(m) {
  if (["search", "roof", "escort", "deliver"].includes(m.stage)) {
    m.stage = "failed";
    m.holding = false;
    m.position = null;
    return true;
  }
  return false;
}
export function tickDispatch(
  m,
  dt,
  { active = true, distance = Infinity, danger = false } = {},
) {
  if (!active || !["search", "roof", "escort", "deliver"].includes(m.stage))
    return null;
  m.remaining = Math.max(0, m.remaining - dt);
  if (m.stage === "escort" && danger) m.hp = Math.max(0, m.hp - dt * 5);
  if (m.remaining <= 0 || m.hp <= 0) {
    failDispatch(m);
    return "Dispatch lost. The storm closed the route. Retry from the dispatch board.";
  }
  return null;
}
export function completeDispatch(s, district, game) {
  const m = s.missions[district];
  if (!m || m.rewarded || !["escort", "deliver"].includes(m.stage))
    return false;
  if (m.choice === "rescue" && game.flood.survivors.length >= 12) return false;
  if (m.choice === "rescue") {
    const p = PEOPLE[district];
    game.flood.survivors.push({
      id:
        Math.max(0, ...game.flood.survivors.map((p) => Number(p.id) || 0)) + 1,
      name: p.name,
      role: p.role,
      station: null,
      xp: 0,
    });
    s.rescues++;
  } else {
    game.flood.inventory.medicine += 4;
    game.flood.inventory.parts += 6;
    s.deliveries++;
  }
  game.credits += 125;
  game.xp += 200;
  game.flood.morale = Math.min(100, game.flood.morale + 12);
  m.stage = "complete";
  m.rewarded = true;
  m.position = null;
  m.holding = false;
  return true;
}
export function damageAgainst(type, weapon, damage) {
  return type === "armored"
    ? damage * (weapon === "machete" ? 0.9 : weapon === "crossbow" ? 0.8 : 0.4)
    : damage;
}
export function resupplyWeapon(living, game, id) {
  const w = WEAPONS[id];
  if (!w?.cost) return "This weapon needs no ammunition.";
  const ammo = id === "carbine" ? game : living.ammo[id];
  if (ammo.reserve >= 300) return "Reserve ammunition is full.";
  if (game.scrap < w.cost) return "Not enough scrap.";
  game.scrap -= w.cost;
  ammo.reserve = Math.min(300, ammo.reserve + w.supply);
  return `${w.name} ammunition crafted.`;
}
// Grid A* routes escorts around actual district walls, not straight through buildings.
export function findRoute(
  from,
  to,
  blocked,
  { step = 1, maxNodes = 24000 } = {},
) {
  const snap = (v) => Math.round(v / step),
    key = (x, z) => `${x},${z}`;
  const sx = snap(from.x),
    sz = snap(from.z),
    tx = snap(to.x),
    tz = snap(to.z);
  const start = { x: sx, z: sz, g: 0, f: 0, parent: null },
    open = [start],
    best = new Map([[key(sx, sz), 0]]);
  let count = 0;
  while (open.length && count++ < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const p = open.splice(bi, 1)[0];
    if (Math.hypot((p.x - tx) * step, (p.z - tz) * step) <= step) {
      const path = [];
      for (let q = p; q; q = q.parent)
        path.push({ x: q.x * step, z: q.z * step });
      return path.reverse().slice(1);
    }
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = p.x + dx,
        z = p.z + dz,
        k = key(x, z),
        g = p.g + 1;
      if (
        Math.abs(x * step) > 85 ||
        Math.abs(z * step) > 60 ||
        blocked(x * step, z * step) ||
        (best.has(k) && best.get(k) <= g)
      )
        continue;
      best.set(k, g);
      open.push({
        x,
        z,
        g,
        f: g + Math.abs(tx - x) + Math.abs(tz - z),
        parent: p,
      });
    }
  }
  return [];
}
