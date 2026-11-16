import * as T from "three";
import {
  RECORDS,
  FIELD_RECIPES,
  craftFieldcraft,
  useDressing,
  collectRecord,
  consumeDecoy,
} from "./fieldcraft.js";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function createFieldcraft({
  scene,
  getState,
  getWorld,
  getActor,
  getDistrict,
  getLayer,
  canUse,
  isActive,
  hasSight,
  openModal,
  toast,
  save,
  emitNoise,
  throwTarget,
  toggleSneak,
  isSneaking,
}) {
  let root = null,
    sites = [],
    lures = [],
    clock = 0;
  const s = () => getState().fieldcraft;
  const mission = () => getState().living.missions[getDistrict()];
  const grounded = () => !["roof", "tunnel"].includes(getLayer());
  function dispose() {
    if (root) {
      root.traverse((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      root.removeFromParent();
    }
    root = null;
    sites = [];
    lures = [];
    clock = 0;
  }
  function rebuild() {
    dispose();
    tracked = null;
    root = new T.Group();
    root.name = "fieldcraft-world";
    scene.add(root);
    sites = getWorld()
      .sites.slice(1, 4)
      .map((site, slot) => {
        const group = new T.Group();
        group.position.set(site.x, getDistrict() === 3 ? 0.68 : 0.42, site.z);
        root.add(group);
        const material = new T.MeshStandardMaterial({
          color: "#cbbd8c",
          roughness: 0.9,
          emissive: "#e8aa50",
          emissiveIntensity: 0.18,
        });
        const parcel = new T.Mesh(new T.BoxGeometry(0.6, 0.18, 0.4), material);
        group.add(parcel);
        const band = new T.Mesh(
          new T.BoxGeometry(0.09, 0.2, 0.42),
          new T.MeshStandardMaterial({ color: "#7c9c89", roughness: 0.8 }),
        );
        group.add(band);
        return {
          slot,
          id: getDistrict() * 3 + slot,
          site,
          group,
          x: site.x,
          z: site.z,
        };
      });
  }
  function nearby() {
    if (!root || !canUse() || !grounded()) return null;
    const p = getActor().group.position;
    return (
      sites.find(
        (site) =>
          !s().records.includes(site.id) &&
          Math.hypot(p.x - site.x, p.z - site.z) < 2.5 &&
          hasSight(p, new T.Vector3(site.x, p.y, site.z)),
      ) || null
    );
  }
  function interact() {
    const site = nearby();
    if (!site) return false;
    const result = collectRecord(s(), getState(), getDistrict(), site.slot);
    if (result) {
      toast(
        `Recovered ${result.title} · +40 XP · +5 scrap${result.surveyed ? " · district survey: +100 credits / +1 medkit" : ""}`,
      );
      save();
    }
    return true;
  }
  function treat(target) {
    const m = mission(),
      p = getActor().group.position,
      dist = m.position
        ? Math.hypot(p.x - m.position.x, p.z - m.position.z)
        : Infinity;
    if (!grounded() && target === "escort") {
      toast("Treat your survivor after returning to street level.");
      return;
    }
    toast(useDressing(s(), getState(), m, dist, target));
    save();
  }
  function throwDecoy() {
    if (!canUse() || !isActive() || !grounded()) {
      toast("Throw decoys during a solo street expedition.");
      return;
    }
    if (!s().decoys) {
      toast("No bottle decoys. Craft more in J · Field kit.");
      return;
    }
    const target = throwTarget();
    if (!target || target.distanceTo(getActor().group.position) < 2) {
      toast("No clear throwing space. Aim along the street.");
      return;
    }
    if (!consumeDecoy(s())) return;
    const bottle = new T.Mesh(
      new T.CylinderGeometry(0.07, 0.09, 0.3, 8),
      new T.MeshStandardMaterial({
        color: "#9bbea6",
        emissive: "#e8aa50",
        emissiveIntensity: 0.6,
      }),
    );
    bottle.position.copy(target);
    root.add(bottle);
    const ring = new T.Mesh(
      new T.RingGeometry(0.4, 0.48, 24),
      new T.MeshBasicMaterial({
        color: "#e8aa50",
        transparent: true,
        opacity: 0.75,
        side: T.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.1;
    bottle.add(ring);
    lures.push({ object: bottle, expires: clock + 8, next: clock, ring });
    toast("Bottle decoy deployed · move quietly");
    save();
  }
  function show() {
    if (!getActor()) {
      toast("The expedition is still loading.");
      return;
    }
    if (!canUse()) {
      toast("Fieldcraft supplies and surveys are solo-only.");
      return;
    }
    const game = getState(),
      district = getDistrict(),
      survey = s().records.filter(
        (id) => Math.floor(id / 3) === district,
      ).length;
    openModal(
      `<span class="panel-kicker">FIELDCRAFT · ${s().records.length}/12 RECORDS RECOVERED</span><h2>Leave a trail of hope.</h2><p class="panel-intro">C toggles quiet movement. V throws a bottle decoy ahead. J opens this kit. Sneaking slows you to 55% speed and reduces enemy detection; sprinting cancels it. Walls block enemy sight. Flashlights make you easier to spot. Noise can still give you away.</p><div class="dispatch-status"><strong>${isSneaking() ? "QUIET MOVEMENT" : "NORMAL MOVEMENT"}</strong><span>${s().decoys} decoys · ${s().dressings} dressings · ${game.scrap} scrap</span></div><div class="panel-footer"><button class="secondary" data-fieldcraft="sneak">Toggle quiet movement</button><button class="secondary" data-fieldcraft="heal:self">Dress your wounds (+30)</button><button class="secondary" data-fieldcraft="heal:escort">Treat escorted survivor (+35)</button></div><h3>Pack supplies</h3>${Object.entries(
        FIELD_RECIPES,
      )
        .map(
          ([id, r]) =>
            `<div class="entry"><div><h3>${r.name} · ${s()[r.supply]}/9</h3><p>${r.description}</p></div><button class="secondary" data-fieldcraft="craft:${id}" ${s()[r.supply] >= 9 || game.scrap < r.cost ? "disabled" : ""}>${r.cost} scrap · Craft</button></div>`,
        )
        .join(
          "",
        )}<h3>District survey · ${survey}/3</h3><p>Search the three furnished interiors listed below. Each field record awards +40 XP, +5 scrap, +1 medicine and +1 part. Recover all three in a district for +100 credits and a medkit. Records and rewards persist; they never reset with the day.</p>${sites.map((site) => `<div class="entry"><div><h3>${escape(site.site.name)}</h3><p>${s().records.includes(site.id) ? "RECORD SECURED" : `Recover record · ${Math.round(site.x)}, ${Math.round(site.z)}`}</p></div><button class="secondary" data-fieldcraft="track:${site.slot}">Mark next destination</button></div>`).join("")}<h3>Recovered field archive</h3>${
        s().records.length
          ? s()
              .records.map(
                (id) =>
                  `<article class="field-record"><h3>${escape(RECORDS[Math.floor(id / 3)][id % 3][0])}</h3><p>${escape(RECORDS[Math.floor(id / 3)][id % 3][1])}</p></article>`,
              )
              .join("")
          : "<p>Unrecovered records remain unknown. Find the wrapped document bundles inside the district interiors.</p>"
      }<p>Field supplies, lures and surveys are personal solo systems. Infected ignore a lure if they see you within 3.5m. Decoys make repeated noise for eight active seconds; you still need a clear escape route.</p><div class="panel-footer"><button class="primary" data-action="close">Return to expedition</button></div>`,
    );
  }
  let tracked = null;
  function action(id) {
    if (!canUse() || !getActor()) return;
    const [kind, arg] = id.split(":");
    if (kind === "craft") {
      toast(craftFieldcraft(s(), getState(), arg));
      save();
      show();
    } else if (kind === "heal") {
      treat(arg);
      show();
    } else if (kind === "sneak") {
      toggleSneak();
      show();
    } else if (kind === "track") {
      const site = sites[Number(arg)];
      if (site) {
        tracked = site.slot;
        toast(`Survey destination: ${site.site.name}`);
        show();
      }
    }
  }
  function objective() {
    const site = sites.find(
      (site) => site.slot === tracked && !s().records.includes(site.id),
    );
    return canUse() && site
      ? { x: site.x, z: site.z, label: `Survey · ${site.site.name}` }
      : null;
  }
  function update(dt) {
    if (!root) return;
    root.visible = canUse() && grounded();
    if (!canUse()) {
      document.querySelector("#fieldcraft-prompt").hidden = true;
      document.querySelector("#fieldcraft-status").textContent =
        "FIELDCRAFT · SOLO ONLY";
      return;
    }
    for (const site of sites)
      site.group.visible = !s().records.includes(site.id);
    if (isActive()) {
      clock += dt;
      for (let i = lures.length - 1; i >= 0; i--) {
        const lure = lures[i];
        if (clock >= lure.expires) {
          lure.object.traverse((o) => {
            o.geometry?.dispose();
            o.material?.dispose();
          });
          lure.object.removeFromParent();
          lures.splice(i, 1);
          continue;
        }
        lure.ring.scale.setScalar(1 + ((clock * 1.7) % 1) * 3);
        lure.ring.material.opacity = 0.8 - ((clock * 1.7) % 1) * 0.65;
        if (clock >= lure.next) {
          lure.next = clock + 0.8;
          emitNoise(lure.object.position, 40, true);
        }
      }
    }
    const prompt = document.querySelector("#fieldcraft-prompt"),
      status = document.querySelector("#fieldcraft-status");
    const near = nearby();
    prompt.hidden = !near;
    prompt.textContent = near
      ? `E · Recover field record · ${near.site.name}`
      : "";
    const target = objective();
    status.textContent = `${isSneaking() ? "QUIET" : "NORMAL"} · V: DECOY ${s().decoys} · DRESSINGS ${s().dressings}${target ? ` · ${target.label} (${Math.round(Math.hypot(target.x - getActor().group.position.x, target.z - getActor().group.position.z))}m)` : ""}`;
  }
  return {
    rebuild,
    dispose,
    nearby,
    interact,
    show,
    action,
    update,
    throwDecoy,
    objective,
  };
}

export function hasClearSight(from, to, colliders) {
  const origin = from.clone().add(new T.Vector3(0, 1.1, 0)),
    target = to.clone().add(new T.Vector3(0, 1.1, 0)),
    distance = origin.distanceTo(target);
  if (distance < 0.1) return true;
  const ray = new T.Ray(origin, target.sub(origin).normalize());
  return !colliders.some((c) => {
    const box = new T.Box3(
      new T.Vector3(c.x - c.w / 2, c.minY || 0, c.z - c.d / 2),
      new T.Vector3(c.x + c.w / 2, c.h, c.z + c.d / 2),
    );
    const hit = ray.intersectBox(box, new T.Vector3());
    return hit && origin.distanceTo(hit) < distance - 0.15;
  });
}
export function findThrowTarget(from, direction, blocked, height) {
  const dir = direction.clone().setY(0);
  if (dir.lengthSq() < 0.001) return null;
  dir.normalize();
  let last = null;
  for (let d = 0.5; d <= 12; d += 0.25) {
    const p = from.clone().addScaledVector(dir, d);
    if (blocked(p.x, p.z)) break;
    last = p;
  }
  if (last) last.y = height;
  return last;
}
