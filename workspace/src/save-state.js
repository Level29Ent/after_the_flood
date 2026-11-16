// Validate persisted data before it reaches the renderer or gameplay arithmetic.
export function restoreGame(saved, defaults) {
  const base = defaults();
  if (
    !saved ||
    typeof saved !== "object" ||
    Array.isArray(saved) ||
    saved.version !== 1
  )
    return base;
  const next = { ...base };
  for (const [key, fallback] of Object.entries(base)) {
    const value = saved[key];
    if (typeof fallback === "number")
      next[key] = Number.isFinite(value)
        ? Math.max(0, Math.min(1e8, value))
        : fallback;
    else if (typeof fallback === "boolean")
      next[key] = typeof value === "boolean" ? value : fallback;
    else if (typeof fallback === "string")
      next[key] = typeof value === "string" ? value.slice(0, 100) : fallback;
    else if (value !== undefined) next[key] = value;
  }
  const integer = (v, f = 0, max = 1e8) =>
    Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : f;
  next.district = integer(saved.district, 0, 3);
  next.day = integer(saved.day, 1) || 1;
  next.time = Number.isFinite(saved.time)
    ? ((saved.time % 24) + 24) % 24
    : base.time;
  next.hp = Math.min(100, next.hp);
  next.hunger = Math.min(100, next.hunger);
  next.ammo = integer(next.ammo, 30, 30);
  next.upgrade = integer(next.upgrade, 0, 5);
  for (const key of [
    "reserve",
    "medkits",
    "scrap",
    "credits",
    "xp",
    "kills",
    "looted",
    "streak",
    "jobs",
    "jobProgress",
    "dailyKills",
    "dailyLoot",
  ])
    next[key] = integer(next[key]);
  for (const key of ["missions", "visited"])
    next[key] = [
      ...new Set(
        Array.isArray(saved[key])
          ? saved[key].filter((v) => Number.isInteger(v) && v >= 0 && v < 4)
          : base[key],
      ),
    ];
  next.achievements = Array.isArray(saved.achievements)
    ? [
        ...new Set(
          saved.achievements.filter(
            (v) => typeof v === "string" && v.length < 80,
          ),
        ),
      ]
    : [];
  next.cacheProgress = Array.from({ length: 4 }, (_, i) =>
    integer(saved.cacheProgress?.[i]),
  );
  next.lastSecured = Array.from({ length: 4 }, (_, i) =>
    Number.isInteger(saved.lastSecured?.[i])
      ? Math.max(-1, saved.lastSecured[i])
      : -1,
  );
  next.depleted = Array.from({ length: 4 }, (_, i) =>
    Array.isArray(saved.depleted?.[i])
      ? [
          ...new Set(
            saved.depleted[i].filter(
              (v) => typeof v === "string" && v.length < 100,
            ),
          ),
        ].slice(0, 100)
      : [],
  );
  next.position =
    Number.isFinite(saved.position?.x) &&
    Number.isFinite(saved.position?.z) &&
    Math.abs(saved.position.x) < 85 &&
    Math.abs(saved.position.z) < 60
      ? { x: saved.position.x, z: saved.position.z }
      : { ...base.position };
  if (next.hp <= 0) {
    next.hp = 100;
    next.position = { x: 0, z: 43 };
  }
  return next;
}
export function readLocalSave(storage, key, status = () => {}) {
  let invalid = false;
  for (const name of [key, `${key}:backup`]) {
    try {
      const raw = storage.getItem(name);
      if (raw === null) continue;
      const value = JSON.parse(raw);
      if (
        value?.schema_version === 1 &&
        value.game_data?.version === 1 &&
        !Array.isArray(value.game_data)
      ) {
        if (name !== key) status("Recovered backup save");
        return value;
      }
      invalid = true;
    } catch {
      invalid = true;
    }
  }
  if (invalid) status("Local save could not be read");
  return null;
}
