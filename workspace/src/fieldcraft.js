// Fieldcraft rules stay renderer-free so save migration and rewards can be tested.
export const RECORDS = [
  [
    [
      "Last ferry manifest",
      "The ferry made one final crossing with its lights off. Someone circled the high ground on the back of the manifest.",
    ],
    [
      "Pharmacy shift book",
      "Every empty medicine box has a name beside it. The last page asks the next survivor to leave clean water.",
    ],
    [
      "Quarter evacuation map",
      "Three streets are crossed out. A handwritten line follows the balconies: stay above the water, keep the radio dry.",
    ],
  ],
  [
    [
      "Generator service card",
      "The technician wired a second battery before leaving. Her note says the lights should last until dawn.",
    ],
    [
      "Clinic supply ledger",
      "The clinic traded fuel for antibiotics. The driver returned twice after the road was declared closed.",
    ],
    [
      "Launch-day postcard",
      "A child drew a rocket over the flooded skyline. On the reverse: we are still here, please look up.",
    ],
  ],
  [
    [
      "Boulevard broadcast reel",
      "The station kept broadcasting street names after its studio flooded. The final voice reads a list of shelters.",
    ],
    [
      "Observatory weather log",
      "Rain bands arrived hours earlier than expected. A volunteer added a warning beside every low bridge.",
    ],
    [
      "Community kitchen recipe",
      "The recipe serves forty. Extra notes describe rainwater boiling times and where to find unopened tins.",
    ],
  ],
  [
    [
      "Blackwater rescue chart",
      "An old fishing chart shows channels the road crews never mapped. The safest route changes with the current.",
    ],
    [
      "Ranger field journal",
      "The birds went quiet before the surge. The ranger marked three dry platforms and left his spare rope.",
    ],
    [
      "Lodge guest register",
      "Guests crossed out their room numbers and wrote the names of people still missing. The last entry reads: keep searching.",
    ],
  ],
];
const count = (value, fallback, max) =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.floor(value)))
    : fallback;
export function restoreFieldcraft(saved = {}) {
  const s = saved && typeof saved === "object" ? saved : {};
  return {
    version: 1,
    decoys: count(s.decoys, 2, 9),
    dressings: count(s.dressings, 2, 9),
    records: [
      ...new Set(
        Array.isArray(s.records)
          ? s.records.filter((id) => Number.isInteger(id) && id >= 0 && id < 12)
          : [],
      ),
    ].sort((a, b) => a - b),
  };
}
export const FIELD_RECIPES = {
  decoy: {
    name: "Bottle decoy",
    cost: 3,
    supply: "decoys",
    description:
      "Throw 12m ahead. Eight seconds of noise draws nearby infected away; expires on district travel.",
  },
  dressing: {
    name: "Field dressing",
    cost: 5,
    supply: "dressings",
    description:
      "Restore 30 personal health, or 35 escort health while within 3m. Consumed only if healing is possible.",
  },
};
export function craftFieldcraft(s, game, recipe) {
  const r = FIELD_RECIPES[recipe];
  if (!r) return "Unknown field recipe.";
  if (s[r.supply] >= 9) return "Pack limit reached (9).";
  if (game.scrap < r.cost) return "Not enough scrap.";
  game.scrap -= r.cost;
  s[r.supply]++;
  return `${r.name} packed.`;
}
export function useDressing(
  s,
  game,
  mission,
  distance = Infinity,
  target = "self",
) {
  if (!s.dressings) return "No dressings. Craft more in the field kit.";
  if (target === "escort") {
    if (mission?.stage !== "escort" || distance > 3)
      return "Reach your escorted survivor (within 3m).";
    if (mission.hp >= 100) return "Survivor is already healthy.";
    mission.hp = Math.min(100, mission.hp + 35);
  } else if (target === "self") {
    if (game.hp >= 100) return "Already at full health.";
    if (game.hp <= 0) return "Return to the relief station first.";
    game.hp = Math.min(100, game.hp + 30);
  } else return "Unknown treatment target.";
  s.dressings--;
  return "Dressing applied.";
}
export function collectRecord(s, game, district, slot) {
  if (
    !Number.isInteger(district) ||
    !Number.isInteger(slot) ||
    !RECORDS[district]?.[slot]
  )
    return null;
  const id = district * 3 + slot;
  if (s.records.includes(id)) return null;
  s.records.push(id);
  s.records.sort((a, b) => a - b);
  game.xp += 40;
  game.scrap += 5;
  game.flood.inventory.parts += 1;
  game.flood.inventory.medicine += 1;
  const surveyed =
    s.records.filter((n) => Math.floor(n / 3) === district).length === 3;
  if (surveyed) {
    game.credits += 100;
    game.medkits++;
  }
  return { id, title: RECORDS[district][slot][0], surveyed };
}
export function consumeDecoy(s) {
  if (!s.decoys) return false;
  s.decoys--;
  return true;
}
export function perceptionRadius(
  base,
  {
    sneaking = false,
    moving = false,
    sprinting = false,
    flashlight = false,
  } = {},
) {
  return (
    base *
    (sneaking ? 0.45 : 1) *
    (moving && sprinting ? 1.25 : 1) *
    (flashlight ? 1.2 : 1)
  );
}
export function choosePursuit({
  distance,
  visible,
  radius,
  lured = false,
  heard = false,
}) {
  if (visible && distance < 3.5) return "player";
  if (lured) return "noise";
  if (visible && distance < radius) return "player";
  return heard ? "noise" : null;
}
