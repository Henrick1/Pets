(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Game = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const C = {
    DEFAULT_PET: "bolota",
    PARTY_SIZE: 5,
    TICK_MS: 10000,
    DECAY_PER_MIN: 100 / 480,
    LIFE_DECAY_PER_MIN: 100 / 120,
    FEED_AMOUNT: 30,
    TREAT_AMOUNT: 10,
    REVIVE_AT: 20,
    MAX_LEVEL: 99
  };

  const clamp100 = v => Math.max(0, Math.min(100, v));
  const isNum = v => typeof v === "number" && Number.isFinite(v);

  const hungerOf = (s, id = s.pet) => (isNum(s.hunger[id]) ? s.hunger[id] : 100);
  const lifeOf = (s, id = s.pet) => (isNum(s.life[id]) ? s.life[id] : 100);
  const isDying = (s, id = s.pet) => s.dying[id] === true;
  const xpOf = (s, id = s.pet) => (isNum(s.xp[id]) ? s.xp[id] : 0);
  const levelOf = (s, id = s.pet) => (isNum(s.level[id]) && s.level[id] >= 1 ? Math.floor(s.level[id]) : 1);
  const xpNeeded = level => 50 + (level - 1) * 25;

  function create(now = Date.now()) {
    return {
      pet: C.DEFAULT_PET,
      party: [C.DEFAULT_PET],
      hunger: {},
      life: {},
      dying: {},
      xp: {},
      level: {},
      savedAt: now,
      actionAt: 0
    };
  }

  function orderedIds(petIds) {
    return petIds.includes(C.DEFAULT_PET) ? [C.DEFAULT_PET].concat(petIds.filter(x => x !== C.DEFAULT_PET)) : petIds.slice();
  }

  function numberMap(raw, min, max) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    Object.keys(raw).forEach(k => {
      if (isNum(raw[k])) out[k] = Math.max(min, Math.min(max, raw[k]));
    });
    return out;
  }

  function normalize(raw, petIds, now = Date.now()) {
    const s = create(now);
    if (raw && typeof raw === "object") {
      if (typeof raw.pet === "string") s.pet = raw.pet;
      s.hunger = numberMap(raw.hunger, 0, 100);
      s.life = numberMap(raw.life, 0, 100);
      s.xp = numberMap(raw.xp, 0, 1e9);
      s.level = numberMap(raw.level, 1, C.MAX_LEVEL);
      if (raw.dying && typeof raw.dying === "object") {
        Object.keys(raw.dying).forEach(k => {
          if (typeof raw.dying[k] === "boolean") s.dying[k] = raw.dying[k];
        });
      }
      if (isNum(raw.savedAt)) s.savedAt = raw.savedAt;
      if (isNum(raw.actionAt)) s.actionAt = raw.actionAt;
    }
    const ids = Array.isArray(petIds) && petIds.length ? petIds : null;
    if (ids && !ids.includes(s.pet)) s.pet = ids.includes(C.DEFAULT_PET) ? C.DEFAULT_PET : ids[0];
    let party = [];
    if (raw && Array.isArray(raw.party)) {
      raw.party.forEach(id => {
        if (typeof id === "string" && !party.includes(id) && (!ids || ids.includes(id))) party.push(id);
      });
    }
    if (!party.includes(s.pet)) party.unshift(s.pet);
    if (ids) {
      orderedIds(ids).forEach(id => {
        if (party.length < C.PARTY_SIZE && !party.includes(id)) party.push(id);
      });
    }
    s.party = party.slice(0, C.PARTY_SIZE);
    return s;
  }

  function updateDying(s, id = s.pet) {
    const life = lifeOf(s, id);
    if (life <= 0) s.dying[id] = true;
    else if (life >= C.REVIVE_AT) s.dying[id] = false;
  }

  function advancePet(s, id, minutes) {
    const h = hungerOf(s, id);
    const starving = Math.max(0, minutes - h / C.DECAY_PER_MIN);
    s.hunger[id] = clamp100(h - minutes * C.DECAY_PER_MIN);
    if (starving > 0) s.life[id] = clamp100(lifeOf(s, id) - starving * C.LIFE_DECAY_PER_MIN);
    updateDying(s, id);
  }

  function advance(s, minutes) {
    if (!(minutes > 0)) return s;
    const members = s.party && s.party.length ? s.party : [s.pet];
    members.forEach(id => advancePet(s, id, minutes));
    return s;
  }

  function catchUp(s, now = Date.now()) {
    advance(s, (now - s.savedAt) / 60000);
    s.savedAt = Math.max(s.savedAt, now);
    return s;
  }

  function addXp(s, id, amount) {
    let xp = xpOf(s, id) + amount;
    let level = levelOf(s, id);
    let gained = 0;
    while (level < C.MAX_LEVEL && xp >= xpNeeded(level)) {
      xp -= xpNeeded(level);
      level += 1;
      gained += 1;
    }
    s.xp[id] = level >= C.MAX_LEVEL ? Math.min(xp, xpNeeded(level)) : xp;
    s.level[id] = level;
    return gained;
  }

  function feed(s, now = Date.now()) {
    catchUp(s, now);
    const id = s.pet;
    const before = hungerOf(s, id);
    if (before >= 100) return { changed: false, levels: 0 };
    const after = clamp100(before + C.FEED_AMOUNT);
    s.hunger[id] = after;
    const levels = addXp(s, id, after - before);
    s.actionAt = now;
    return { changed: true, levels, level: levelOf(s, id) };
  }

  function treat(s, now = Date.now()) {
    catchUp(s, now);
    const id = s.pet;
    if (lifeOf(s, id) >= 100) return { changed: false };
    s.life[id] = clamp100(lifeOf(s, id) + C.TREAT_AMOUNT);
    updateDying(s, id);
    s.actionAt = now;
    return { changed: true };
  }

  function selectPet(s, id, now = Date.now()) {
    if (typeof id !== "string" || !s.party.includes(id) || id === s.pet) return { changed: false };
    catchUp(s, now);
    s.pet = id;
    s.actionAt = now;
    return { changed: true };
  }

  function swapParty(s, outId, inId, petIds, now = Date.now()) {
    const at = s.party.indexOf(outId);
    if (at < 0 || s.party.includes(inId) || !petIds.includes(inId)) return { changed: false };
    catchUp(s, now);
    s.party[at] = inId;
    if (s.pet === outId) s.pet = inId;
    s.actionAt = now;
    return { changed: true };
  }

  function view(s, petsMeta) {
    const meta = {};
    const all = petsMeta || [];
    all.forEach(m => {
      meta[m.id] = m;
    });
    const row = id => ({
      id,
      name: (meta[id] && meta[id].name) || id,
      color: (meta[id] && meta[id].color) || "#999999",
      hunger: hungerOf(s, id),
      life: lifeOf(s, id),
      dying: isDying(s, id),
      level: levelOf(s, id)
    });
    const id = s.pet;
    const level = levelOf(s, id);
    return {
      pet: id,
      hunger: hungerOf(s, id),
      life: lifeOf(s, id),
      dying: isDying(s, id),
      level,
      xp: xpOf(s, id),
      xpNext: xpNeeded(level),
      party: s.party.map(row),
      box: all.map(m => m.id).filter(x => !s.party.includes(x)).map(row)
    };
  }

  function merge(local, remote, now = Date.now(), opts = {}) {
    if (!remote) {
      local.actionAt = Math.max(local.actionAt, now);
      return { state: local, source: "local", push: true };
    }
    const adopt = opts.preferRemote ? true : remote.actionAt > local.actionAt;
    if (adopt) {
      const next = catchUp(remote, now);
      return { state: next, source: "remote", push: false };
    }
    return { state: local, source: "local", push: local.actionAt > remote.actionAt };
  }

  return {
    C,
    create,
    normalize,
    advance,
    catchUp,
    feed,
    treat,
    selectPet,
    swapParty,
    view,
    merge,
    hungerOf,
    lifeOf,
    isDying,
    xpOf,
    levelOf,
    xpNeeded
  };
});
