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
    JOY_DECAY_PER_MIN: 100 / 360,
    PLAY_AMOUNT: 5,
    REVIVE_AT: 20,
    HAPPY_SPLIT: 50,
    MAX_LEVEL: 99,
    STARTERS: ["bolota", "axolinho", "robinho"],
    EGG_PRICE: 100,
    HATCH_MS: 10 * 60000,
    INCUBATOR_SLOTS: 3,
    CARE_DECAY_PER_MIN: 20,
    CLEAN_AMOUNT: 25,
    EGG_PLAY_AMOUNT: 20
  };

  const clamp100 = v => Math.max(0, Math.min(100, v));
  const isNum = v => typeof v === "number" && Number.isFinite(v);

  const hungerOf = (s, id = s.pet) => (isNum(s.hunger[id]) ? s.hunger[id] : 100);
  const lifeOf = (s, id = s.pet) => (isNum(s.life[id]) ? s.life[id] : 100);
  const isDying = (s, id = s.pet) => s.dying[id] === true;
  const joyOf = (s, id = s.pet) => (isNum(s.joy[id]) ? s.joy[id] : 100);
  const xpOf = (s, id = s.pet) => (isNum(s.xp[id]) ? s.xp[id] : 0);
  const levelOf = (s, id = s.pet) => (isNum(s.level[id]) && s.level[id] >= 1 ? Math.floor(s.level[id]) : 1);
  const xpNeeded = level => 50 + (level - 1) * 25;

  function create(now = Date.now()) {
    return {
      pet: null,
      party: [],
      owned: [],
      species: {},
      seen: [],
      coins: 0,
      eggs: [],
      hunger: {},
      life: {},
      joy: {},
      joyAvg: {},
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
      s.joy = numberMap(raw.joy, 0, 100);
      s.xp = numberMap(raw.xp, 0, 1e9);
      s.level = numberMap(raw.level, 1, C.MAX_LEVEL);
      if (raw.dying && typeof raw.dying === "object") {
        Object.keys(raw.dying).forEach(k => {
          if (typeof raw.dying[k] === "boolean") s.dying[k] = raw.dying[k];
        });
      }
      if (raw.joyAvg && typeof raw.joyAvg === "object") {
        Object.keys(raw.joyAvg).forEach(k => {
          const a = raw.joyAvg[k];
          if (a && isNum(a.sum) && isNum(a.t) && a.t >= 0) s.joyAvg[k] = { sum: Math.max(0, a.sum), t: a.t };
        });
      }
      if (isNum(raw.savedAt)) s.savedAt = raw.savedAt;
      if (isNum(raw.actionAt)) s.actionAt = raw.actionAt;
      if (isNum(raw.coins)) s.coins = Math.max(0, Math.floor(raw.coins));
      if (Array.isArray(raw.eggs)) {
        const used = new Set();
        raw.eggs.forEach(e => {
          if (!e || typeof e.id !== "string" || typeof e.species !== "string") return;
          let slot = Number.isInteger(e.slot) && e.slot >= 0 && e.slot < C.INCUBATOR_SLOTS && !used.has(e.slot) ? e.slot : null;
          if (slot !== null) used.add(slot);
          s.eggs.push({
            id: e.id.slice(0, 40),
            species: e.species,
            slot,
            care: isNum(e.care) ? clamp100(e.care) : 100,
            left: isNum(e.left) ? Math.max(0, Math.min(C.HATCH_MS, e.left)) : C.HATCH_MS
          });
        });
      }
    }
    const ids = Array.isArray(petIds) && petIds.length ? petIds : null;
    const valid = id => typeof id === "string" && (!ids || ids.includes(id));
    const rawSpecies = raw && raw.species && typeof raw.species === "object" ? raw.species : {};
    const adopt = uid => {
      if (typeof uid !== "string" || s.owned.includes(uid)) return;
      const sp = typeof rawSpecies[uid] === "string" ? rawSpecies[uid] : uid;
      if (!valid(sp)) return;
      s.owned.push(uid);
      s.species[uid] = sp;
    };
    if (raw && typeof raw === "object" && Array.isArray(raw.owned)) {
      raw.owned.forEach(adopt);
    } else if (raw && typeof raw === "object") {
      if (ids) orderedIds(ids).forEach(adopt);
      else (Array.isArray(raw.party) ? raw.party : []).concat([raw.pet]).forEach(adopt);
    }
    if (ids) s.eggs = s.eggs.filter(e => ids.includes(e.species));
    let party = [];
    if (raw && Array.isArray(raw.party)) {
      raw.party.forEach(id => {
        if (s.owned.includes(id) && !party.includes(id)) party.push(id);
      });
    }
    if (s.owned.includes(s.pet) && !party.includes(s.pet)) party.unshift(s.pet);
    s.owned.forEach(id => {
      if (party.length < C.PARTY_SIZE && !party.includes(id)) party.push(id);
    });
    s.party = party.slice(0, C.PARTY_SIZE);
    if (!s.party.includes(s.pet)) s.pet = s.party.length ? s.party[0] : null;
    const seen = raw && Array.isArray(raw.seen) ? raw.seen.filter(valid) : [];
    s.owned.forEach(id => seen.push(s.species[id]));
    s.seen = Array.from(new Set(seen));
    return s;
  }

  const markSeen = (s, sp) => {
    if (sp && !s.seen.includes(sp)) s.seen.push(sp);
  };

  const speciesOf = (s, uid = s.pet) => (uid && s.species[uid]) || uid || null;

  function needsStarter(s) {
    return s.owned.length === 0 && s.eggs.length === 0;
  }

  function addOwned(s, species, rand = Math.random) {
    let uid = species;
    while (s.owned.includes(uid) || s.species[uid]) uid = species + "-" + Math.floor(rand() * 1e9).toString(36);
    s.owned.push(uid);
    s.species[uid] = species;
    markSeen(s, species);
    if (s.party.length < C.PARTY_SIZE) s.party.push(uid);
    if (!s.pet) s.pet = uid;
    return uid;
  }

  function chooseStarter(s, id, now = Date.now()) {
    if (!needsStarter(s) || !C.STARTERS.includes(id)) return { changed: false };
    catchUp(s, now);
    s.pet = addOwned(s, id);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function eggPool(s, baseIds) {
    return baseIds.slice();
  }

  function buyEgg(s, baseIds, now = Date.now(), rand = Math.random) {
    const pool = eggPool(s, baseIds);
    if (s.coins < C.EGG_PRICE) return { changed: false, reason: "coins" };
    if (!pool.length) return { changed: false, reason: "pool" };
    catchUp(s, now);
    const species = pool[Math.floor(rand() * pool.length) % pool.length];
    const egg = { id: "e" + now.toString(36) + Math.floor(rand() * 1e6).toString(36), species, slot: null, care: 100, left: C.HATCH_MS };
    s.coins -= C.EGG_PRICE;
    s.eggs.push(egg);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, egg };
  }

  function incubate(s, eggId, now = Date.now()) {
    const egg = s.eggs.find(e => e.id === eggId);
    if (!egg || egg.slot !== null) return { changed: false };
    let slot = -1;
    for (let i = 0; i < C.INCUBATOR_SLOTS; i++) {
      if (!s.eggs.some(e => e.slot === i)) {
        slot = i;
        break;
      }
    }
    if (slot < 0) return { changed: false, reason: "full" };
    catchUp(s, now);
    egg.slot = slot;
    egg.care = 100;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, slot };
  }

  function careEgg(s, eggId, kind, now = Date.now()) {
    catchUp(s, now);
    const egg = s.eggs.find(e => e.id === eggId);
    if (!egg || egg.slot === null || egg.left <= 0) return { changed: false };
    const before = egg.care;
    egg.care = clamp100(egg.care + (kind === "clean" ? C.CLEAN_AMOUNT : C.EGG_PLAY_AMOUNT));
    if (egg.care === before) return { changed: false };
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function hatchEgg(s, eggId, now = Date.now()) {
    catchUp(s, now);
    const egg = s.eggs.find(e => e.id === eggId);
    if (!egg || egg.slot === null || egg.left > 0) return { changed: false };
    s.eggs = s.eggs.filter(e => e !== egg);
    const uid = addOwned(s, egg.species);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, species: egg.species, uid };
  }

  function canEvolve(s, id, target, level) {
    return !!target && s.owned.includes(id) && speciesOf(s, id) !== target && levelOf(s, id) >= level;
  }

  function evolve(s, id, target, level, now = Date.now()) {
    if (!canEvolve(s, id, target, level)) return { changed: false };
    catchUp(s, now);
    s.species[id] = target;
    markSeen(s, target);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function joyAverage(s, id = s.pet) {
    const a = s.joyAvg[id];
    return a && a.t > 0 ? a.sum / a.t : joyOf(s, id);
  }

  function evolveTarget(m, s, id = s.pet) {
    if (!m) return null;
    if (m.evolveBranches) return (joyAverage(s, id) >= C.HAPPY_SPLIT ? m.evolveBranches.happy : m.evolveBranches.sad) || null;
    return m.evolvesTo || null;
  }

  function advanceEggs(s, minutes) {
    s.eggs.forEach(e => {
      if (e.slot === null || e.left <= 0) return;
      const active = Math.min(minutes, e.care / C.CARE_DECAY_PER_MIN);
      e.left = Math.max(0, e.left - active * 60000);
      e.care = clamp100(e.care - minutes * C.CARE_DECAY_PER_MIN);
    });
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
    const j0 = joyOf(s, id);
    s.joy[id] = clamp100(j0 - minutes * C.JOY_DECAY_PER_MIN);
    const avg = s.joyAvg[id] || { sum: 0, t: 0 };
    avg.sum += ((j0 + s.joy[id]) / 2) * minutes;
    avg.t += minutes;
    s.joyAvg[id] = avg;
    updateDying(s, id);
  }

  function advance(s, minutes) {
    if (!(minutes > 0)) return s;
    s.party.forEach(id => advancePet(s, id, minutes));
    advanceEggs(s, minutes);
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
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, levels, level: levelOf(s, id) };
  }

  function treat(s, now = Date.now()) {
    catchUp(s, now);
    const id = s.pet;
    if (lifeOf(s, id) >= 100) return { changed: false };
    s.life[id] = clamp100(lifeOf(s, id) + C.TREAT_AMOUNT);
    updateDying(s, id);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function play(s, now = Date.now()) {
    catchUp(s, now);
    const id = s.pet;
    if (isDying(s, id) || joyOf(s, id) >= 100) return { changed: false };
    s.joy[id] = clamp100(joyOf(s, id) + C.PLAY_AMOUNT);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function selectPet(s, id, now = Date.now()) {
    if (typeof id !== "string" || !s.party.includes(id) || id === s.pet) return { changed: false };
    catchUp(s, now);
    s.pet = id;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function swapParty(s, outId, inId, petIds, now = Date.now()) {
    const at = s.party.indexOf(outId);
    if (at < 0 || s.party.includes(inId) || !s.owned.includes(inId)) return { changed: false };
    catchUp(s, now);
    s.party[at] = inId;
    if (s.pet === outId) s.pet = inId;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function view(s, petsMeta) {
    const meta = {};
    const all = petsMeta || [];
    all.forEach(m => {
      meta[m.id] = m;
    });
    const info = id => meta[speciesOf(s, id)] || {};
    const row = id => ({
      id,
      species: speciesOf(s, id),
      name: info(id).name || speciesOf(s, id),
      color: info(id).color || "#999999",
      types: info(id).types || [],
      hunger: hungerOf(s, id),
      life: lifeOf(s, id),
      joy: joyOf(s, id),
      dying: isDying(s, id),
      level: levelOf(s, id)
    });
    const id = s.pet;
    const level = levelOf(s, id);
    return {
      pet: id,
      species: speciesOf(s, id),
      types: info(id).types || [],
      hunger: hungerOf(s, id),
      life: lifeOf(s, id),
      joy: joyOf(s, id),
      dying: isDying(s, id),
      level,
      xp: xpOf(s, id),
      xpNext: xpNeeded(level),
      party: s.party.map(row),
      box: s.owned.filter(x => !s.party.includes(x)).map(row),
      owned: s.owned.slice(),
      ownedSpecies: Array.from(new Set(s.seen.concat(s.owned.map(x => speciesOf(s, x))))),
      coins: s.coins,
      eggs: s.eggs.map(e => Object.assign({}, e)),
      needsStarter: needsStarter(s)
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
    play,
    needsStarter,
    chooseStarter,
    eggPool,
    buyEgg,
    incubate,
    careEgg,
    hatchEgg,
    canEvolve,
    evolve,
    speciesOf,
    selectPet,
    swapParty,
    view,
    merge,
    hungerOf,
    lifeOf,
    joyOf,
    joyAverage,
    evolveTarget,
    isDying,
    xpOf,
    levelOf,
    xpNeeded
  };
});
