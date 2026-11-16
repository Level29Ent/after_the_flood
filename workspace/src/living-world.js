import * as T from "three";
import {
  WEAPONS,
  INFECTED,
  PEOPLE,
  personFor,
  startDispatch,
  searchDispatch,
  meetSurvivor,
  tickDispatch,
  completeDispatch,
  failDispatch,
  findRoute,
  resupplyWeapon,
} from "./living-systems.js";
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function createLivingWorld({
  scene,
  getState,
  getDistrict,
  getWorld,
  getActor,
  getCharacters,
  getLayer,
  canUse,
  isActive,
  blocked,
  move,
  openModal,
  closeModal,
  toast,
  save,
  equip,
}) {
  let root = null,
    escort = null,
    crew = [],
    signature = "",
    route = [],
    routeClock = 0,
    pulse = 0,
    marker = null,
    markerMat = null;
  const s = () => getState().living,
    m = () => s().missions[getDistrict()];
  const tower = () => ({ x: getDistrict() === 3 ? -1.75 : -5, z: 27 });
  const searchSite = () => getWorld().sites[0];
  function dispose() {
    if (!root) return;
    for (const a of [...crew.map((c) => c.actor), escort].filter(Boolean))
      a.mixer.stopAllAction();
    root.removeFromParent();
    root.traverse((o) => {
      if (o.userData.owned) {
        o.geometry?.dispose();
        o.material?.dispose();
      }
    });
    root = null;
    crew = [];
    escort = null;
    signature = "";
    route = [];
  }
  function rebuild() {
    dispose();
    root = new T.Group();
    scene.add(root);
    const geo = new T.TorusGeometry(0.65, 0.055, 6, 24);
    markerMat = new T.MeshBasicMaterial({ color: "#e8aa50" });
    marker = new T.Mesh(geo, markerMat);
    marker.userData.owned = true;
    root.add(marker);
    routeClock = 0;
  }
  function spawnCrew() {
    const people = getState().flood.survivors;
    const next = JSON.stringify(people.map((p) => [p.id, p.station]));
    if (next === signature) return;
    signature = next;
    for (const c of crew) {
      c.actor.mixer.stopAllAction();
      c.actor.group.removeFromParent();
    }
    crew = people.map((p, i) => {
      const actor = getCharacters().make("survivor");
      actor.group.scale.setScalar(0.96);
      actor.group.position.set(
        -3 + (i % 4) * 2,
        2.15,
        41 + Math.floor(i / 4) * 1.7,
      );
      const stations = Object.entries(getState().flood.stations).filter(
        ([, level]) => level > 0,
      );
      const station = stations.findIndex(([id]) => id === p.station);
      if (station >= 0)
        actor.group.position.set(
          station % 2 ? 2.8 : -2.8,
          2.15,
          39.6 + Math.floor(station / 2) * 1.4,
        );
      actor.group.rotation.y = Math.PI;
      root.add(actor.group);
      return { actor, person: personFor(p, i), survivor: p, index: i };
    });
  }
  function ensureEscort() {
    const mission = m();
    if (!["roof", "escort"].includes(mission.stage)) {
      if (escort) {
        escort.mixer.stopAllAction();
        escort.group.removeFromParent();
        escort = null;
      }
      return;
    }
    if (!escort) {
      escort = getCharacters().make("survivor");
      root.add(escort.group);
      const t = tower();
      escort.group.position.set(
        mission.position?.x ?? t.x,
        mission.stage === "roof" ? 18.2 : 0,
        mission.position?.z ?? t.z + 2,
      );
    }
  }
  function objective() {
    const mission = m(),
      site = searchSite(),
      t = tower();
    if (mission.stage === "search")
      return {
        x: site.x,
        z: site.z,
        y: getDistrict() === 3 ? 1.8 : 1.5,
        label: `Search ${site.name} for ${mission.choice === "rescue" ? "rooftop access notes" : "medical cargo"}`,
      };
    if (mission.stage === "roof")
      return {
        ...t,
        y: 20,
        label: `Climb the relief tower to floor 3. Meet ${PEOPLE[getDistrict()].name}`,
      };
    if (["escort", "deliver"].includes(mission.stage))
      return {
        x: 0,
        z: 43,
        y: 3.5,
        label:
          mission.stage === "escort"
            ? `Bring ${PEOPLE[getDistrict()].name} to high-ground camp`
            : "Deliver medical cargo to high-ground camp",
      };
    return null;
  }
  function show() {
    if (!canUse()) {
      toast(
        "Living-world dispatches are solo-only. Co-op retains the shared carbine expedition.",
      );
      return;
    }
    const mission = m(),
      target = objective();
    openModal(
      `<span class="panel-kicker">THE LIVING WATERLINE · DISPATCH ${getDistrict() + 1}/4</span><h2>No one left below.</h2><p class="panel-intro">${target ? escape(target.label) : "A ten-minute window before the storm closes the route. Choose people or supplies; each district can reward one dispatch per game day."}</p><div class="dispatch-status"><strong>${mission.stage.toUpperCase()}</strong><span>${Math.ceil(mission.remaining)}s remaining${mission.stage === "escort" ? ` · survivor health ${Math.ceil(mission.hp)}%${mission.holding ? " · HOLDING" : ""}` : ""}</span></div>${target ? `<p>Objective: ${Math.round(target.x)}, ${Math.round(target.z)} · H reopens this board. E interacts at the objective.</p><p>Search the marked enterable building, then use G at the relief tower to climb to floor 3. Craft a waterproof flashlight first. Meet your survivor with E, return to the street using G, and escort them home. A boat is optional; survivors board automatically within 5m. Stay close during combat. The timer pauses with solo panels; storm surges consume the window 25% faster.</p><div class="panel-footer">${mission.stage === "escort" ? `<button class="secondary" data-living="hold">${mission.holding ? "Follow me" : "Wait here"}</button>` : ""}<button class="secondary" data-living="abandon">Abandon dispatch</button></div>` : `<div class="entry"><div><h3>${PEOPLE[getDistrict()].name} · ${PEOPLE[getDistrict()].role}</h3><p>Search a building → rooftop rendezvous → physical escort → camp. +125 credits, +200 XP and a camp specialist.</p></div><button class="primary" data-living="start:rescue">Answer distress call</button></div><div class="entry"><div><h3>Medical supply run</h3><p>Search the building → return cargo. +4 medicine, +6 parts, +125 credits and +200 XP; no new crew.</p></div><button class="secondary" data-living="start:cargo">Choose supplies</button></div>`}<h3>Field loadout · 1–4 to equip</h3><div class="loadout-grid">${Object.entries(
        WEAPONS,
      )
        .map(
          ([id, w]) =>
            `<div class="loadout-card ${s().selected === id ? "selected" : ""}"><small>SLOT ${w.key}</small><h3>${w.name}</h3><p>${w.description}</p><button class="secondary" data-living="equip:${id}">${s().selected === id ? "Equipped" : "Equip"}</button>${w.cost ? `<button class="secondary" data-living="ammo:${id}">${w.cost} scrap · +${w.supply} ammo</button>` : ""}</div>`,
        )
        .join(
          "",
        )}</div><h3>Know the infected</h3><p>Drowned ambushers: short sight, fast pursuit. Screamers: fragile, but their call alerts the district—silence them first. Armored responders: slow, resistant to bullets; use bolts or a machete. Loud shots draw infected to your last firing position.</p><div class="panel-footer"><button class="primary" data-action="close">Return to expedition</button><button class="secondary" data-living="help">Survival briefing</button></div>`,
    );
  }
  function briefing() {
    openModal(
      `<span class="panel-kicker">FIELD BRIEFING · KEEP THIS CLOSE</span><h2>People make a place.</h2><ol class="briefing-list"><li><strong>Get your bearings.</strong> WASD / touch sticks move and aim. M opens district travel. E interacts. G opens crafting, boats and the tower console.</li><li><strong>Choose a dispatch.</strong> H or the Dispatch button opens rooftop rescues and medical supply runs. The gold objective ring and tracker guide you.</li><li><strong>Prepare for the climb.</strong> Craft a waterproof flashlight in G → craft. Salvage copper from cars using a crowbar. At the tower use G to climb to floor 3.</li><li><strong>Bring them home.</strong> E recruits the waiting survivor. G → Return to street. Keep them within 5m to board your boat; they cannot follow you into tunnels. Return to the raised southern camp.</li><li><strong>Choose how to fight.</strong> 1 carbine, 2 quiet crossbow, 3 shotgun, 4 stamina-powered machete. R reloads. Craft ammunition on the dispatch board.</li><li><strong>Make camp matter.</strong> Talk with E. Use G → camp to assign workers to constructed stations. Their role and station determine production.</li></ol><p>New dispatches, camp characters and alternate weapons are solo-only. Existing shared co-op expeditions still work. Personal dispatches pause in co-op; active escorts must return to their district. Progress autosaves; hidden tabs do not advance time.</p><button class="primary" data-living="understood">Ready to survive</button>`,
    );
  }
  function action(id) {
    if (!canUse()) return;
    const [kind, arg] = id.split(":");
    if (kind === "start") {
      toast(
        startDispatch(
          s(),
          getDistrict(),
          arg,
          getState().day,
          getState().flood.survivors.length,
        ),
      );
      save();
      show();
    } else if (kind === "equip") {
      equip(arg);
      show();
    } else if (kind === "ammo") {
      toast(resupplyWeapon(s(), getState(), arg));
      save();
      show();
    } else if (kind === "hold") {
      m().holding = !m().holding;
      save();
      show();
    } else if (kind === "abandon") {
      failDispatch(m());
      save();
      show();
    } else if (kind === "help") briefing();
    else if (kind === "understood") {
      s().onboarded = true;
      save();
      closeModal();
    }
  }
  function nearby() {
    if (!canUse()) return null;
    const p = getActor().group.position,
      mission = m(),
      target = objective();
    if (
      mission.stage === "search" &&
      getLayer() !== "tunnel" &&
      Math.hypot(p.x - target.x, p.z - target.z) < 2.8
    )
      return {
        label:
          mission.choice === "rescue"
            ? "Search rooftop access notes"
            : "Collect medical cargo",
        kind: "search",
      };
    if (
      mission.stage === "roof" &&
      getLayer() === "roof" &&
      Math.abs(p.y - 18.2) < 1 &&
      Math.hypot(p.x - tower().x, p.z - tower().z) < 5
    )
      return { label: `Escort ${PEOPLE[getDistrict()].name}`, kind: "meet" };
    if (getLayer() === "tunnel" || getLayer() === "roof") return null;
    for (const c of crew)
      if (p.distanceTo(c.actor.group.position) < 2.8)
        return { label: `Talk to ${c.person.name}`, kind: "talk", crew: c };
    return null;
  }
  function interact() {
    const near = nearby();
    if (!near) return false;
    if (near.kind === "search") {
      searchDispatch(m());
      toast(
        m().choice === "rescue"
          ? "Access notes found. Survivor on relief tower floor 3."
          : "Medical cargo recovered. Return to high-ground camp.",
      );
      save();
    }
    if (near.kind === "meet") {
      meetSurvivor(m(), tower());
      route = [];
      toast(
        "Survivor following. Use G to return to the street, then head south to camp.",
      );
      save();
    }
    if (near.kind === "talk") {
      const c = near.crew;
      openModal(
        `<span class="panel-kicker">HIGH-GROUND CREW · ${escape(c.person.role)}</span><h2>${escape(c.person.name)}</h2><p class="panel-intro">“${escape(c.person.line)}”</p><p>Assigned: ${escape(c.survivor.station || "resting")} · experience ${c.survivor.xp} · camp morale ${Math.ceil(getState().flood.morale)}%</p><p>Build stations and assign crew through G → camp. Share rations to keep morale up.</p><button class="primary" data-action="close">Stay safe</button>`,
      );
    }
    return true;
  }
  function update(dt, enemies) {
    if (!root) return;
    root.visible = canUse() && getLayer() !== "tunnel";
    if (!canUse()) return;
    spawnCrew();
    ensureEscort();
    const active = isActive(),
      mission = m(),
      p = getActor().group.position;
    const target = objective();
    marker.visible = !!target;
    if (target) {
      marker.position.set(target.x, target.y, target.z);
      marker.rotation.y = pulse;
      markerMat.color.set(mission.remaining < 90 ? "#d46d50" : "#e8aa50");
    }
    if (active) pulse += dt;
    for (const c of crew) {
      c.actor.group.visible = getLayer() !== "tunnel";
      c.actor.group.rotation.y = Math.atan2(
        p.x - c.actor.group.position.x,
        p.z - c.actor.group.position.z,
      );
      if (active) {
        c.actor.set("idle");
        c.actor.group.rotation.z = c.survivor.station
          ? Math.sin(pulse * 1.5 + c.index) * 0.025
          : 0;
        c.actor.mixer.update(dt * 0.6);
      }
    }
    if (!active) return;
    const danger =
      escort &&
      enemies.some(
        (e) =>
          e.hp > 0 &&
          Math.hypot(
            e.actor.group.position.x - escort.group.position.x,
            e.actor.group.position.z - escort.group.position.z,
          ) < 2,
      );
    const failed = tickDispatch(
      mission,
      dt * (getState().flood.weather === 2 ? 1.25 : 1),
      {
        distance: escort ? p.distanceTo(escort.group.position) : Infinity,
        danger: danger && getLayer() !== "roof" && getLayer() !== "tunnel",
      },
    );
    if (failed) {
      toast(failed);
      save();
      return;
    }
    if (escort && mission.stage === "escort") {
      const q = escort.group.position,
        t = tower(),
        layer = getLayer();
      let moving = false;
      if (layer === "roof") {
        q.set(p.x + 0.65, p.y, p.z + 0.65);
      } else if (layer !== "tunnel") {
        if (q.y > 5) {
          q.set(t.x, 0, t.z + 2);
          route = [];
          routeClock = 0;
        }
        const distance = Math.hypot(p.x - q.x, p.z - q.z);
        if (getState().flood.vessel && distance < 5 && !mission.holding) {
          q.set(p.x + 0.7, p.y, p.z + 0.3);
          moving = false;
          route = [];
        } else if (!mission.holding && distance > 1.6) {
          routeClock -= dt;
          if (routeClock <= 0) {
            route = findRoute(q, p, blocked, { step: 0.5 });
            routeClock = 1.5;
          }
          while (
            route.length &&
            Math.hypot(q.x - route[0].x, q.z - route[0].z) < 0.25
          )
            route.shift();
          const next = route[0];
          if (next) {
            const dx = next.x - q.x,
              dz = next.z - q.z,
              len = Math.hypot(dx, dz),
              speed = Math.min(len, dt * (distance > 7 ? 4.5 : 3.5));
            move(escort.group, (dx / len) * speed, (dz / len) * speed, 0.28);
            escort.group.rotation.y = Math.atan2(dx, dz);
            moving = true;
          }
          q.y =
            Math.abs(q.x) < 5.3 && Math.abs(q.z - 43) < 4.5
              ? 2.15
              : Math.max(
                  getDistrict() === 3 ? 0.26 : 0,
                  getState().flood.level - 0.9,
                );
        }
      }
      escort.group.visible = layer !== "tunnel";
      escort.set(moving ? "run" : "idle");
      escort.mixer.update(dt);
      mission.position = { x: q.x, z: q.z };
    } else if (escort) escort.mixer.update(dt);
    const camp =
      Math.hypot(p.x, p.z - 43) < 4.5 &&
      getLayer() !== "roof" &&
      getLayer() !== "tunnel";
    if (
      camp &&
      (mission.stage === "deliver" ||
        (mission.stage === "escort" &&
          escort &&
          Math.hypot(escort.group.position.x, escort.group.position.z - 43) <
            5))
    ) {
      if (completeDispatch(s(), getDistrict(), getState())) {
        toast(
          "Dispatch complete · +125 credits · +200 XP · camp morale restored",
        );
        save();
      }
    }
  }
  function hud() {
    const el = document.querySelector("#dispatch-tracker"),
      near = document.querySelector("#living-prompt");
    if (!el) return;
    const target = canUse() ? objective() : null;
    el.hidden = !target;
    el.textContent = target
      ? `${target.label} · ${Math.ceil(m().remaining)}s${m().stage === "escort" ? ` · HP ${Math.ceil(m().hp)}%${m().holding ? " · WAITING" : ""}` : ""}`
      : "";
    const n = nearby();
    near.hidden = !n;
    near.textContent = n ? `E · ${n.label}` : "";
  }
  return {
    rebuild,
    dispose,
    show,
    briefing,
    action,
    nearby,
    interact,
    update,
    hud,
    objective,
    fail: () => {
      if (failDispatch(m())) save();
    },
  };
}
// Added meshes own only their small accent resources; FBX geometry/materials remain shared.
export function decorateInfected(actor, type) {
  const def = INFECTED[type] || INFECTED.walker;
  if (type === "walker") return;
  const group = new T.Group();
  actor.group.add(group);
  const material = new T.MeshStandardMaterial({
    color: def.color,
    roughness: 0.65,
    emissive: def.color,
    emissiveIntensity: type === "screamer" ? 0.55 : 0.06,
  });
  const geo =
    type === "armored"
      ? new T.BoxGeometry(0.72, 0.65, 0.36)
      : new T.SphereGeometry(type === "screamer" ? 0.16 : 0.25, 8, 6);
  const mesh = new T.Mesh(geo, material);
  mesh.position.set(
    0,
    type === "screamer" ? 1.5 : 1.05,
    type === "armored" ? 0 : 0.16,
  );
  group.add(mesh);
  actor.group.userData.variantResources = { geo, material };
}
export function releaseInfected(actor) {
  actor.mixer.stopAllAction();
  const r = actor.group.userData.variantResources;
  r?.geo.dispose();
  r?.material.dispose();
  actor.group.removeFromParent();
}

// Compact locally-built silhouettes; reuse verified survivor firing/locomotion clips.
export function makeFieldWeapon(id) {
  const group = new T.Group(),
    metal = new T.MeshStandardMaterial({
      color: "#454f4c",
      metalness: 0.7,
      roughness: 0.5,
    }),
    wood = new T.MeshStandardMaterial({ color: "#786247", roughness: 0.85 });
  const part = (x, y, z, w, h, d, mat = metal) => {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  if (id === "crossbow") {
    part(0, 0, 0, 0.09, 0.1, 0.65, wood);
    part(0, 0, 0.3, 0.75, 0.05, 0.05);
    part(0, 0.065, 0.05, 0.02, 0.02, 0.7);
    part(-0.18, 0, 0.15, 0.035, 0.035, 0.38).rotation.y = 0.85;
    part(0.18, 0, 0.15, 0.035, 0.035, 0.38).rotation.y = -0.85;
  }
  if (id === "shotgun") {
    part(0, 0, 0.1, 0.1, 0.1, 0.9);
    part(0, -0.04, -0.35, 0.12, 0.16, 0.4, wood);
    part(0, -0.07, 0.22, 0.15, 0.1, 0.25, wood);
  }
  if (id === "machete") {
    part(0, 0, -0.15, 0.065, 0.08, 0.22, wood);
    part(0, 0, 0.25, 0.12, 0.025, 0.6);
    part(0, 0, -0.02, 0.2, 0.035, 0.05);
    group.rotation.z = 0.35;
  }
  group.position.set(0.2, 1.3, 0.34);
  group.name = `held-${id}`;
  return group;
}
