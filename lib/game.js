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
    TREAT_HEAL_MIN: 120,
    FED_HEAL_MIN: 60,
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
    EGG_PLAY_AMOUNT: 20,
    ALLOWANCE_BASE: 1,
    ALLOWANCE_JOY: 1,
    ALLOWANCE_FED: 1,
    ALLOWANCE_MIN_HUNGER: 25,
    LEVEL_COINS: 10,
    DAILY_REWARDS: [10, 15, 20, 25, 30, 35, 80],
    DAILY_BONUS_ITEM: "dourada",
    EXPEDITION_SIZE: 3,
    EXPEDITIONS: {
      curta: { ms: 30 * 60000, coins: [15, 25], items: 1, rare: 0.05, xp: [5, 15], hunger: [10, 20], hurt: 0.2, life: [5, 15] },
      media: { ms: 2 * 3600000, coins: [50, 80], items: 2, rare: 0.2, xp: [15, 45], hunger: [10, 30], hurt: 0.35, life: [10, 25] },
      longa: { ms: 8 * 3600000, coins: [150, 220], items: 4, rare: 0.5, xp: [40, 120], hunger: [10, 45], hurt: 0.5, life: [15, 35] }
    }
  };

  const ITEMS = {
    fruta: { name: "Fruta", price: 5, hunger: 40 },
    doce: { name: "Doce", price: 8, joy: 30 },
    petisco: { name: "Petisco nutritivo", price: 15, hunger: 15, xp: 40 },
    peixe: { name: "Peixe fresco", hunger: 50, xp: 30, sell: 10 },
    pocao: { name: "Poção pequena", price: 12, life: 30 },
    "pocao-grande": { name: "Poção grande", price: 30, life: 100 },
    reviver: { name: "Reviver", price: 60, revive: true, life: 50 },
    dourada: { name: "Fruta dourada", hunger: 100, joy: 100, xp: 100, sell: 40 },
    cristal: { name: "Cristal", sell: 30 }
  };

  const TYPE_LOOT = {
    water: "peixe",
    psychic: "doce",
    grass: "fruta",
    bug: "fruta",
    rock: "cristal",
    ground: "cristal",
    steel: "cristal",
    poison: "pocao",
    ghost: "pocao",
    dark: "doce",
    fire: "petisco",
    electric: "petisco",
    light: "doce",
    fighting: "petisco"
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
      heal: {},
      treatDay: {},
      xp: {},
      level: {},
      coinFrac: 0,
      inventory: {},
      daily: { day: -1, streak: 0 },
      expeditions: [],
      stash: {},
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
      s.heal = numberMap(raw.heal, 0, 1e15);
      s.treatDay = numberMap(raw.treatDay, 0, 1e9);
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
      if (isNum(raw.coinFrac)) s.coinFrac = Math.max(0, Math.min(0.999999, raw.coinFrac));
      if (raw.inventory && typeof raw.inventory === "object") {
        Object.keys(raw.inventory).forEach(k => {
          const n = raw.inventory[k];
          if (ITEMS[k] && isNum(n) && n >= 1) s.inventory[k] = Math.min(9999, Math.floor(n));
        });
      }
      if (raw.daily && isNum(raw.daily.day) && isNum(raw.daily.streak)) {
        s.daily = { day: Math.floor(raw.daily.day), streak: Math.max(0, Math.floor(raw.daily.streak)) };
      }
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
    const rawStash = raw && raw.stash && typeof raw.stash === "object" ? raw.stash : {};
    const adopt = uid => {
      if (typeof uid !== "string" || s.owned.includes(uid)) return;
      const sp = typeof rawSpecies[uid] === "string" ? rawSpecies[uid] : typeof rawStash[uid] === "string" ? rawStash[uid] : uid;
      if (!valid(sp)) {
        if (typeof sp === "string" && sp) s.stash[uid] = sp.slice(0, 40);
        return;
      }
      delete s.stash[uid];
      s.owned.push(uid);
      s.species[uid] = sp;
    };
    if (raw && typeof raw === "object" && Array.isArray(raw.owned)) {
      raw.owned.forEach(adopt);
      Object.keys(rawStash).forEach(adopt);
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
    if (raw && Array.isArray(raw.expeditions)) {
      raw.expeditions.forEach(x => {
        if (!x || !C.EXPEDITIONS[x.kind] || !isNum(x.endsAt) || !isNum(x.startAt)) return;
        const pets = (Array.isArray(x.pets) ? x.pets : [x.pet]).filter(id => typeof id === "string" && s.owned.includes(id) && !isAway(s, id));
        if (!pets.length) return;
        const same = s.expeditions.find(y => y.kind === x.kind);
        if (same) {
          pets.forEach(id => {
            if (same.pets.length < C.EXPEDITION_SIZE && !same.pets.includes(id)) same.pets.push(id);
          });
          same.endsAt = Math.max(same.endsAt, x.endsAt);
          return;
        }
        s.expeditions.push({ kind: x.kind, pets: pets.slice(0, C.EXPEDITION_SIZE), startAt: x.startAt, endsAt: x.endsAt });
      });
    }
    if (!s.party.includes(s.pet) || isAway(s, s.pet)) s.pet = s.party.find(id => !isAway(s, id)) || (s.party.length ? s.party[0] : null);
    const seen = raw && Array.isArray(raw.seen) ? raw.seen.filter(valid) : [];
    s.owned.forEach(id => seen.push(s.species[id]));
    s.seen = Array.from(new Set(seen));
    return s;
  }

  const markSeen = (s, sp) => {
    if (sp && !s.seen.includes(sp)) s.seen.push(sp);
  };

  const isAway = (s, uid) => s.expeditions.some(x => x.pets.includes(uid));
  const awayOf = (s, uid) => s.expeditions.find(x => x.pets.includes(uid)) || null;

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

  const above = (v, rate, t, minutes) => (v > t ? Math.min(minutes, (v - t) / rate) : 0);

  function allowance(s, id, minutes) {
    if (isDying(s, id)) return 0;
    const h = hungerOf(s, id);
    const j = joyOf(s, id);
    const fedMin = above(h, C.DECAY_PER_MIN, C.ALLOWANCE_MIN_HUNGER, minutes);
    const fullMin = above(h, C.DECAY_PER_MIN, 50, minutes);
    const joyMin = Math.min(fedMin, above(j, C.JOY_DECAY_PER_MIN, 50, minutes));
    return (fedMin * C.ALLOWANCE_BASE + fullMin * C.ALLOWANCE_FED + joyMin * C.ALLOWANCE_JOY) / 60;
  }

  function advancePet(s, id, minutes, t0) {
    s.coinFrac += allowance(s, id, minutes);
    const h = hungerOf(s, id);
    const starving = Math.max(0, minutes - h / C.DECAY_PER_MIN);
    const fedMin = above(h, C.DECAY_PER_MIN, C.ALLOWANCE_MIN_HUNGER, minutes);
    const healMin = s.heal[id] ? Math.max(0, Math.min(minutes, (s.heal[id] - t0) / 60000)) : 0;
    if (fedMin > 0 || healMin > 0) s.life[id] = clamp100(lifeOf(s, id) + (fedMin * 100) / C.FED_HEAL_MIN + (healMin * 100) / C.TREAT_HEAL_MIN);
    if (s.heal[id] && s.heal[id] <= t0 + minutes * 60000) delete s.heal[id];
    s.hunger[id] = clamp100(h - minutes * C.DECAY_PER_MIN);
    const decayMin = starving - Math.max(0, healMin + starving - minutes);
    if (decayMin > 0) s.life[id] = clamp100(lifeOf(s, id) - decayMin * C.LIFE_DECAY_PER_MIN);
    const j0 = joyOf(s, id);
    s.joy[id] = clamp100(j0 - minutes * C.JOY_DECAY_PER_MIN);
    const avg = s.joyAvg[id] || { sum: 0, t: 0 };
    avg.sum += ((j0 + s.joy[id]) / 2) * minutes;
    avg.t += minutes;
    s.joyAvg[id] = avg;
    updateDying(s, id);
  }

  function advance(s, minutes, t0 = s.savedAt) {
    if (!(minutes > 0)) return s;
    s.party.forEach(id => {
      if (!isAway(s, id)) advancePet(s, id, minutes, t0);
    });
    if (s.coinFrac >= 1) {
      const whole = Math.floor(s.coinFrac);
      s.coins += whole;
      s.coinFrac -= whole;
    }
    advanceEggs(s, minutes);
    return s;
  }

  function catchUp(s, now = Date.now()) {
    advance(s, (now - s.savedAt) / 60000, s.savedAt);
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
      s.coins += C.LEVEL_COINS + level;
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

  function treatStatus(s, id = s.pet, now = Date.now()) {
    const used = s.treatDay[id] === dayNumber(now);
    const healing = !!s.heal[id] && s.heal[id] > now;
    return { used, healing, healUntil: healing ? s.heal[id] : 0, can: isDying(s, id) && !used && !healing };
  }

  function treat(s, now = Date.now()) {
    catchUp(s, now);
    const id = s.pet;
    if (!treatStatus(s, id, now).can) return { changed: false };
    s.heal[id] = now + C.TREAT_HEAL_MIN * 60000;
    s.treatDay[id] = dayNumber(now);
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

  const addItem = (s, item, n = 1) => {
    s.inventory[item] = (s.inventory[item] || 0) + n;
  };

  function buyItem(s, item, n = 1, now = Date.now()) {
    const it = ITEMS[item];
    n = Math.max(1, Math.floor(n) || 1);
    if (!it || !it.price) return { changed: false, reason: "item" };
    catchUp(s, now);
    if (s.coins < it.price * n) return { changed: false, reason: "coins" };
    s.coins -= it.price * n;
    addItem(s, item, n);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function sellItem(s, item, now = Date.now()) {
    const it = ITEMS[item];
    if (!it || !it.sell || !(s.inventory[item] >= 1)) return { changed: false };
    catchUp(s, now);
    s.inventory[item] -= 1;
    if (!s.inventory[item]) delete s.inventory[item];
    s.coins += it.sell;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, coins: it.sell };
  }

  function canUseItem(s, item, id = s.pet) {
    const it = ITEMS[item];
    if (!it || !(s.inventory[item] >= 1) || !s.owned.includes(id) || isAway(s, id)) return false;
    const dying = isDying(s, id);
    if (it.revive) return dying || lifeOf(s, id) < 100;
    return (
      (it.hunger && hungerOf(s, id) < 100) ||
      (it.life && lifeOf(s, id) < 100) ||
      (it.joy && !dying && joyOf(s, id) < 100) ||
      (it.xp && levelOf(s, id) < C.MAX_LEVEL)
    ) || false;
  }

  function useItem(s, item, id = s.pet, now = Date.now()) {
    catchUp(s, now);
    if (!canUseItem(s, item, id)) return { changed: false };
    const it = ITEMS[item];
    if (it.revive) {
      s.dying[id] = false;
      s.life[id] = Math.max(lifeOf(s, id), it.life);
    } else if (it.life) {
      s.life[id] = clamp100(lifeOf(s, id) + it.life);
      updateDying(s, id);
    }
    if (it.hunger) s.hunger[id] = clamp100(hungerOf(s, id) + it.hunger);
    if (it.joy && !isDying(s, id)) s.joy[id] = clamp100(joyOf(s, id) + it.joy);
    const levels = it.xp ? addXp(s, id, it.xp) : 0;
    s.inventory[item] -= 1;
    if (!s.inventory[item]) delete s.inventory[item];
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, levels, level: levelOf(s, id) };
  }

  const dayNumber = now => Math.floor((now - new Date(now).getTimezoneOffset() * 60000) / 86400000);

  function dailyStatus(s, now = Date.now()) {
    const today = dayNumber(now);
    const available = s.daily.day !== today;
    const streak = available ? (s.daily.day === today - 1 ? s.daily.streak + 1 : 1) : s.daily.streak;
    const step = ((streak - 1) % C.DAILY_REWARDS.length) + 1;
    return {
      available,
      streak,
      step,
      coins: C.DAILY_REWARDS[step - 1],
      item: step === C.DAILY_REWARDS.length ? C.DAILY_BONUS_ITEM : null
    };
  }

  function claimDaily(s, now = Date.now()) {
    const d = dailyStatus(s, now);
    if (!d.available) return { changed: false };
    catchUp(s, now);
    s.daily = { day: dayNumber(now), streak: d.streak };
    s.coins += d.coins;
    if (d.item) addItem(s, d.item);
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, coins: d.coins, item: d.item, streak: d.streak, step: d.step };
  }

  function canExplore(s, id) {
    return s.owned.includes(id) && !isAway(s, id) && !isDying(s, id);
  }

  function startExpedition(s, kind, ids, now = Date.now()) {
    const ex = C.EXPEDITIONS[kind];
    if (!ex || s.expeditions.some(x => x.kind === kind) || !Array.isArray(ids)) return { changed: false };
    const pets = Array.from(new Set(ids));
    if (!pets.length || pets.length > C.EXPEDITION_SIZE || !pets.every(id => canExplore(s, id))) return { changed: false };
    if (!s.party.some(id => !pets.includes(id) && !isAway(s, id))) return { changed: false, reason: "home" };
    catchUp(s, now);
    s.expeditions.push({ kind, pets, startAt: now, endsAt: now + ex.ms });
    if (isAway(s, s.pet)) s.pet = s.party.find(x => !isAway(s, x));
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function rollLoot(ex, types, level, rand) {
    const lo = ex.coins[0];
    const hi = ex.coins[1];
    let coins = Math.round((lo + rand() * (hi - lo)) * (1 + Math.min(level, 50) / 100));
    const items = {};
    const typed = (types || []).map(t => TYPE_LOOT[t]).filter(Boolean);
    for (let i = 0; i < ex.items; i++) {
      const pick = typed.length && rand() < 0.7 ? typed[Math.floor(rand() * typed.length) % typed.length] : rand() < 0.5 ? "fruta" : "doce";
      items[pick] = (items[pick] || 0) + 1;
    }
    if (rand() < ex.rare) items.dourada = (items.dourada || 0) + 1;
    return { coins, items };
  }

  function collectExpedition(s, kind, typesOf, now = Date.now(), rand = Math.random) {
    const x = s.expeditions.find(e => e.kind === kind);
    if (!x || x.endsAt > now) return { changed: false };
    catchUp(s, now);
    const ex = C.EXPEDITIONS[x.kind];
    const total = { coins: 0, items: {}, levels: [], effects: [] };
    const roll = ([a, b]) => Math.round(a + rand() * (b - a));
    s.expeditions = s.expeditions.filter(e => e !== x);
    x.pets.forEach(id => {
      if (!s.owned.includes(id)) return;
      const loot = rollLoot(ex, typeof typesOf === "function" ? typesOf(id) : [], levelOf(s, id), rand);
      total.coins += loot.coins;
      Object.keys(loot.items).forEach(k => {
        total.items[k] = (total.items[k] || 0) + loot.items[k];
        addItem(s, k, loot.items[k]);
      });
      const fx = { id, hunger: Math.min(hungerOf(s, id), roll(ex.hunger)), life: 0, xp: rand() < 0.7 ? roll(ex.xp) : 0 };
      s.hunger[id] = clamp100(hungerOf(s, id) - fx.hunger);
      if (rand() < ex.hurt) {
        const life0 = lifeOf(s, id);
        s.life[id] = Math.max(Math.min(life0, 5), life0 - roll(ex.life));
        fx.life = Math.round(life0 - s.life[id]);
        updateDying(s, id);
      }
      total.effects.push(fx);
      const gained = fx.xp ? addXp(s, id, fx.xp) : 0;
      if (gained > 0) total.levels.push({ id, level: levelOf(s, id) });
    });
    s.coins += total.coins;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return Object.assign({ changed: true, pets: x.pets.slice() }, total);
  }

  function effectText(fx) {
    const parts = ["-" + fx.hunger + "% fome"];
    if (fx.life) parts.push("-" + fx.life + "% vida");
    if (fx.xp) parts.push("+" + fx.xp + " XP");
    return parts.join(" · ");
  }

  function selectPet(s, id, now = Date.now()) {
    if (typeof id !== "string" || !s.party.includes(id) || id === s.pet || isAway(s, id)) return { changed: false };
    catchUp(s, now);
    s.pet = id;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true };
  }

  function swapParty(s, outId, inId, petIds, now = Date.now()) {
    const at = s.party.indexOf(outId);
    if (at < 0 || s.party.includes(inId) || !s.owned.includes(inId) || isAway(s, outId) || isAway(s, inId)) return { changed: false };
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
      level: levelOf(s, id),
      away: awayOf(s, id)
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
      treat: treatStatus(s, id),
      level,
      xp: xpOf(s, id),
      xpNext: xpNeeded(level),
      party: s.party.map(row),
      box: s.owned.filter(x => !s.party.includes(x)).map(row),
      owned: s.owned.slice(),
      ownedSpecies: Array.from(new Set(s.seen.concat(s.owned.map(x => speciesOf(s, x))))),
      coins: s.coins,
      eggs: s.eggs.map(e => Object.assign({}, e)),
      inventory: Object.assign({}, s.inventory),
      expeditions: s.expeditions.map(x => Object.assign({}, x, { pets: x.pets.slice() })),
      needsStarter: needsStarter(s)
    };
  }

  function merge(local, remote, now = Date.now(), opts = {}) {
    if (!remote) {
      local.actionAt = Math.max(local.actionAt, now);
      return { state: local, source: "local", push: true };
    }
    const adopt = opts.preferRemote ? true : remote.actionAt >= local.actionAt;
    if (adopt) {
      const next = catchUp(remote, now);
      return { state: next, source: "remote", push: false };
    }
    return { state: local, source: "local", push: local.actionAt > remote.actionAt };
  }

  return {
    C,
    ITEMS,
    TYPE_LOOT,
    create,
    isAway,
    buyItem,
    sellItem,
    canUseItem,
    useItem,
    dailyStatus,
    claimDaily,
    canExplore,
    startExpedition,
    collectExpedition,
    normalize,
    advance,
    catchUp,
    feed,
    treat,
    treatStatus,
    effectText,
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
