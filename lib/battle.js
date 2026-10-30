(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./game.js"), require("./types.js"));
  else root.Battle = factory(root.Game, root.PetTypes);
})(typeof self !== "undefined" ? self : this, function (Game, Types) {
  const MAX_MOVES = 4;
  const STATS = ["hp", "atk", "def", "spa", "spd", "spe"];
  const STAT_NAMES = { atk: "Ataque", def: "Defesa", spa: "Ataque Especial", spd: "Defesa Especial", spe: "Velocidade" };
  const BATTLE_ITEMS = ["pocao", "pocao-grande", "reviver"];

  const M = (name, type, cat, power, acc, extra) => Object.assign({ name, type, cat, power, acc }, extra || {});
  const MOVES = {
    investida: M("Investida", null, "phys", 40, 100),
    "golpe-rapido": M("Golpe Rápido", null, "phys", 40, 100, { prio: 1 }),
    pancada: M("Pancada", null, "phys", 70, 100),
    rosnar: M("Rosnar", null, "status", 0, 100, { foe: { atk: -1 } }),
    encarar: M("Encarar", null, "status", 0, 100, { foe: { def: -1 } }),
    endurecer: M("Endurecer", null, "status", 0, 0, { self: { def: 1 } }),
    fortalecer: M("Fortalecer", null, "status", 0, 0, { self: { atk: 2 } }),
    concentrar: M("Concentrar", null, "status", 0, 0, { self: { spa: 1, spd: 1 } }),
    agilidade: M("Agilidade", null, "status", 0, 0, { self: { spe: 2 } }),
    recuperar: M("Recuperar", null, "status", 0, 0, { heal: 0.5 }),

    brasas: M("Brasas", "fire", "spec", 40, 100),
    "garra-flamejante": M("Garra Flamejante", "fire", "phys", 65, 100),
    "lanca-chamas": M("Lança-chamas", "fire", "spec", 90, 100),
    "chama-colossal": M("Investida Vulcânica", "fire", "phys", 110, 85),
    erupcao: M("Erupção", "fire", "spec", 110, 85),

    "jato-dagua": M("Jato d'Água", "water", "spec", 40, 100),
    "cauda-dagua": M("Cauda d'Água", "water", "phys", 85, 90),
    surfar: M("Onda", "water", "spec", 90, 100),
    hidrobomba: M("Hidrobomba", "water", "spec", 110, 80),

    absorver: M("Absorver", "grass", "spec", 40, 100, { drain: 0.5 }),
    "chicote-cipo": M("Chicote de Cipó", "grass", "phys", 45, 100),
    "folha-navalha": M("Folha Navalha", "grass", "phys", 55, 95),
    gigadreno: M("Gigadreno", "grass", "spec", 75, 100, { drain: 0.5 }),
    "semente-bomba": M("Semente Bomba", "grass", "phys", 80, 100),
    "raio-solar": M("Raio Solar", "grass", "spec", 110, 90),
    "pancada-tronco": M("Pancada de Tronco", "grass", "phys", 110, 90),
    fotossintese: M("Fotossíntese", "grass", "status", 0, 0, { heal: 0.5 }),

    choque: M("Choque", "electric", "spec", 40, 100),
    faisca: M("Faísca", "electric", "phys", 65, 100),
    "soco-trovao": M("Soco Trovão", "electric", "phys", 75, 100),
    raio: M("Raio", "electric", "spec", 90, 100),
    trovao: M("Trovão", "electric", "spec", 110, 70),

    "caco-gelo": M("Caco de Gelo", "ice", "phys", 40, 100, { prio: 1 }),
    "raio-gelo": M("Raio de Gelo", "ice", "spec", 90, 100),

    "golpe-karate": M("Golpe de Caratê", "fighting", "phys", 50, 100),
    "murro-direto": M("Murro Direto", "fighting", "phys", 75, 100),
    "soco-foguete": M("Soco Foguete", "fighting", "phys", 100, 90),
    "esfera-aura": M("Esfera de Aura", "fighting", "spec", 80, 0),

    acido: M("Ácido", "poison", "spec", 40, 100, { chance: 30, foe: { spd: -1 } }),
    ferrao: M("Ferrão Venenoso", "poison", "phys", 45, 100),
    "jab-venenoso": M("Jab Venenoso", "poison", "phys", 80, 100),
    "bomba-lodo": M("Bomba de Lodo", "poison", "spec", 90, 100),

    lamacal: M("Lamaçal", "ground", "spec", 55, 95, { chance: 100, foe: { spe: -1 } }),
    tremor: M("Tremor", "ground", "phys", 60, 100),
    terremoto: M("Terremoto", "ground", "phys", 100, 100),

    rajada: M("Rajada de Vento", "flying", "spec", 40, 100),
    "as-aereo": M("Ás Aéreo", "flying", "phys", 60, 0),
    "lamina-ar": M("Lâmina de Ar", "flying", "spec", 75, 95),
    mergulho: M("Mergulho Aéreo", "flying", "phys", 90, 95),
    furacao: M("Furacão", "flying", "spec", 110, 70),

    confusao: M("Confusão", "psychic", "spec", 50, 100),
    psicocorte: M("Psicocorte", "psychic", "phys", 70, 100),
    psiquico: M("Psíquico", "psychic", "spec", 90, 100, { chance: 10, foe: { spd: -1 } }),

    picada: M("Picada", "bug", "phys", 60, 100),
    "tesoura-x": M("Tesoura X", "bug", "phys", 80, 100),
    zumbido: M("Zumbido", "bug", "spec", 90, 100),

    "lancar-pedras": M("Lançar Pedras", "rock", "phys", 50, 90),
    "poder-ancestral": M("Poder Ancestral", "rock", "spec", 60, 100, { chance: 10, self: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } }),
    gema: M("Gema Brilhante", "rock", "spec", 80, 100),
    "pedra-afiada": M("Pedra Afiada", "rock", "phys", 100, 80),

    lambida: M("Lambida", "ghost", "phys", 30, 100),
    "soco-sombra": M("Soco Sombra", "ghost", "phys", 60, 0),
    "sino-assombrado": M("Badalada Fantasma", "ghost", "spec", 65, 100),
    "bola-sombria": M("Bola Sombria", "ghost", "spec", 80, 100, { chance: 20, foe: { spd: -1 } }),

    "sopro-dragao": M("Sopro do Dragão", "dragon", "spec", 60, 100),
    "garra-dragao": M("Garra de Dragão", "dragon", "phys", 80, 100),
    "pulso-dragao": M("Pulso do Dragão", "dragon", "spec", 85, 100),
    "furia-dragao": M("Fúria Dracônica", "dragon", "phys", 120, 85),

    mordida: M("Mordida", "dark", "phys", 60, 100),
    "golpe-baixo": M("Golpe Baixo", "dark", "phys", 70, 100, { prio: 1 }),
    "pulso-sombrio": M("Pulso Sombrio", "dark", "spec", 80, 100),
    mastigar: M("Mastigar", "dark", "phys", 80, 100, { chance: 20, foe: { def: -1 } }),

    "garra-metal": M("Garra de Metal", "steel", "phys", 50, 95, { chance: 10, self: { atk: 1 } }),
    "cabecada-ferro": M("Cabeçada de Ferro", "steel", "phys", 80, 100),
    engrenagem: M("Engrenagem Dupla", "steel", "phys", 95, 85),
    "canhao-brilho": M("Canhão de Brilho", "steel", "spec", 80, 100),
    "defesa-ferro": M("Defesa de Ferro", "steel", "status", 0, 0, { self: { def: 2 } }),

    lampejo: M("Lampejo", "light", "spec", 40, 100),
    "raio-luz": M("Raio de Luz", "light", "spec", 65, 100),
    "investida-radiante": M("Investida Radiante", "light", "phys", 80, 100),
    prisma: M("Prisma", "light", "spec", 90, 100),
    supernova: M("Supernova", "light", "spec", 110, 85)
  };

  const LINES = {
    planta: [[1, "investida"], [1, "rosnar"], [3, "absorver"], [6, "chicote-cipo"], [9, "folha-navalha"], [12, "fotossintese"], [15, "lamacal"], [18, "semente-bomba"], [22, "gigadreno"], [26, "endurecer"], [30, "tremor"], [35, "terremoto"], [40, "raio-solar"]],
    axolote: [[1, "investida"], [1, "rosnar"], [3, "acido"], [6, "jato-dagua"], [9, "ferrao"], [13, "bomba-lodo"], [17, "jab-venenoso"], [24, "cauda-dagua"], [30, "concentrar"]],
    robo: [[1, "investida"], [1, "endurecer"], [3, "garra-metal"], [6, "golpe-rapido"], [9, "golpe-karate"], [12, "cabecada-ferro"], [15, "defesa-ferro"], [18, "murro-direto"], [22, "engrenagem"], [26, "soco-trovao"], [30, "soco-foguete"], [36, "fortalecer"], [40, "canhao-brilho"]],
    marola: [[1, "investida"], [1, "jato-dagua"], [4, "encarar"], [7, "choque"], [10, "mordida"], [13, "faisca"], [16, "surfar"], [20, "raio"], [24, "cauda-dagua"], [28, "agilidade"], [32, "raio-gelo"], [36, "hidrobomba"], [42, "trovao"]],
    sineta: [[1, "lambida"], [1, "rosnar"], [4, "confusao"], [8, "soco-sombra"], [12, "sino-assombrado"], [18, "concentrar"], [22, "bola-sombria"], [28, "psiquico"], [34, "recuperar"], [40, "pulso-sombrio"]],
    brasa: [[1, "investida"], [1, "brasas"], [4, "golpe-rapido"], [8, "mordida"], [12, "garra-flamejante"], [16, "agilidade"], [20, "lanca-chamas"], [26, "concentrar"], [32, "pulso-sombrio"], [38, "erupcao"]],
    bisouro: [[1, "investida"], [1, "endurecer"], [4, "lampejo"], [7, "picada"], [10, "raio-luz"], [14, "tesoura-x"], [18, "investida-radiante"], [23, "zumbido"], [28, "prisma"], [34, "supernova"]],
    pedra: [[1, "investida"], [1, "endurecer"], [4, "lancar-pedras"], [8, "confusao"], [12, "poder-ancestral"], [16, "tremor"], [20, "gema"], [24, "psiquico"], [28, "concentrar"], [32, "pedra-afiada"], [38, "terremoto"]],
    polvo: [[1, "confusao"], [1, "jato-dagua"], [5, "encarar"], [9, "psicocorte"], [13, "concentrar"], [17, "psiquico"], [21, "surfar"], [26, "recuperar"], [30, "pulso-sombrio"], [36, "hidrobomba"]],
    dragao: [[1, "investida"], [1, "brasas"], [4, "rosnar"], [7, "mordida"], [10, "sopro-dragao"], [14, "garra-flamejante"], [18, "lancar-pedras"], [22, "garra-dragao"], [26, "lanca-chamas"], [30, "pulso-dragao"], [36, "chama-colossal"], [42, "furia-dragao"]],
    sombra: [[1, "investida"], [1, "encarar"], [4, "golpe-rapido"], [7, "mordida"], [11, "lampejo"], [15, "golpe-baixo"], [19, "raio-luz"], [23, "pulso-sombrio"], [27, "agilidade"], [31, "mastigar"], [35, "prisma"], [40, "supernova"]],
    ceu: [[1, "investida"], [1, "rajada"], [5, "endurecer"], [9, "as-aereo"], [13, "lamina-ar"], [17, "cabecada-ferro"], [21, "mergulho"], [26, "defesa-ferro"], [30, "recuperar"], [34, "furacao"], [40, "canhao-brilho"]]
  };

  const S = (types, base, line, from, minLevel, maxLevel, extra) => ({ types, base, line, from, minLevel, maxLevel, extra: extra || [] });
  const SPECIES = {
    bolota: S(["grass"], [45, 49, 49, 60, 60, 45], "planta", null, 1, 11),
    raizote: S(["grass", "ground"], [65, 75, 75, 70, 70, 55], "planta", "bolota", 5, 21),
    colossilva: S(["grass", "ground"], [95, 110, 105, 80, 85, 50], "planta", "raizote", 15, 100, [[25, "pancada-tronco"], [44, "fortalecer"]]),
    axolinho: S(["poison"], [50, 45, 45, 60, 50, 55], "axolote", null, 1, 11),
    axolote: S(["poison"], [70, 60, 60, 80, 70, 65], "axolote", "axolinho", 5, 21),
    axolirio: S(["poison"], [85, 65, 75, 105, 100, 85], "axolote", "axolote", 15, 100, [[16, "gigadreno"], [20, "recuperar"], [26, "surfar"], [34, "prisma"]]),
    lugubrio: S(["poison", "dark"], [85, 100, 85, 70, 80, 95], "axolote", "axolote", 15, 100, [[16, "mordida"], [20, "golpe-baixo"], [26, "mastigar"], [32, "fortalecer"], [38, "pulso-sombrio"]]),
    robinho: S(["steel"], [45, 55, 60, 40, 45, 60], "robo", null, 1, 11),
    robo: S(["steel", "fighting"], [60, 85, 80, 50, 55, 70], "robo", "robinho", 5, 21),
    robozao: S(["steel", "fighting"], [80, 120, 105, 60, 70, 85], "robo", "robo", 15, 100, [[34, "esfera-aura"]]),
    marola: S(["water"], [45, 45, 45, 60, 50, 65], "marola", null, 1, 11),
    turboa: S(["water", "electric"], [60, 60, 60, 85, 65, 80], "marola", "marola", 5, 21),
    leviatrom: S(["water", "electric"], [95, 85, 80, 115, 90, 60], "marola", "turboa", 15, 100, [[30, "pulso-dragao"]]),
    sineta: S(["ghost"], [70, 55, 75, 95, 95, 70], "sineta", null, 1, 100),
    chamisco: S(["fire"], [45, 50, 40, 65, 50, 70], "brasa", null, 1, 22),
    brasa: S(["fire"], [70, 75, 65, 100, 75, 105], "brasa", "chamisco", 16, 42),
    vulpira: S(["fire", "ghost"], [85, 80, 75, 125, 100, 115], "brasa", "brasa", 32, 100, [[32, "bola-sombria"], [40, "confusao"], [46, "chama-colossal"]]),
    bisouro: S(["bug", "light"], [40, 50, 65, 55, 55, 40], "bisouro", null, 1, 16),
    escaravelho: S(["bug", "light"], [75, 95, 100, 85, 80, 60], "bisouro", "bisouro", 10, 100, [[20, "lancar-pedras"]]),
    cascalhinho: S(["rock"], [50, 65, 85, 35, 40, 30], "pedra", null, 1, 16),
    geodo: S(["rock", "psychic"], [80, 75, 115, 105, 90, 40], "pedra", "cascalhinho", 10, 100, [[18, "recuperar"]]),
    cerebrolvo: S(["psychic"], [45, 35, 40, 80, 65, 50], "polvo", null, 1, 18),
    abissomente: S(["psychic", "water"], [90, 60, 75, 120, 105, 50], "polvo", "cerebrolvo", 12, 100, [[24, "bomba-lodo"]]),
    brasinha: S(["dragon", "fire"], [50, 70, 55, 55, 45, 50], "dragao", null, 1, 22),
    magmarra: S(["dragon", "fire"], [90, 115, 95, 100, 75, 80], "dragao", "brasinha", 16, 100, [[33, "erupcao"], [38, "terremoto"]]),
    breuzinho: S(["dark"], [45, 60, 40, 60, 45, 70], "sombra", null, 1, 22),
    eclipsar: S(["dark", "light"], [75, 100, 70, 95, 75, 110], "sombra", "breuzinho", 16, 100, [[20, "investida-radiante"]]),
    balaozinho: S(["flying"], [60, 40, 45, 55, 55, 50], "ceu", null, 1, 22),
    zepelume: S(["flying", "steel"], [110, 85, 100, 80, 80, 50], "ceu", "balaozinho", 16, 100, [[24, "engrenagem"]])
  };

  const TYPE_MOVES = {
    fire: "brasas", water: "jato-dagua", grass: "absorver", electric: "choque", ice: "caco-gelo", fighting: "golpe-karate",
    poison: "acido", ground: "lamacal", flying: "rajada", psychic: "confusao", bug: "picada", rock: "lancar-pedras",
    ghost: "lambida", dragon: "sopro-dragao", dark: "mordida", steel: "garra-metal", light: "lampejo"
  };

  const extraMeta = {};
  function setMeta(list) {
    (list || []).forEach(m => {
      if (m && m.id && !SPECIES[m.id]) extraMeta[m.id] = m;
    });
  }

  function speciesInfo(sp) {
    if (SPECIES[sp]) return SPECIES[sp];
    const m = extraMeta[sp];
    const types = m && Array.isArray(m.types) && m.types.length ? m.types : [];
    const learn = [[1, "investida"], [1, "rosnar"]];
    types.forEach((t, i) => TYPE_MOVES[t] && learn.push([3 + i * 4, TYPE_MOVES[t]]));
    learn.push([14, "pancada"]);
    return { types, base: [60, 60, 60, 60, 60, 60], line: null, from: null, minLevel: 1, maxLevel: 100, extra: [], learn };
  }

  function learnset(sp) {
    const info = speciesInfo(sp);
    const list = (info.learn || LINES[info.line] || []).concat(info.extra || []);
    const seen = {};
    return list
      .filter(([lv, id]) => MOVES[id] && !seen[id] && (seen[id] = true))
      .sort((a, b) => a[0] - b[0]);
  }

  function learnable(sp, level) {
    return learnset(sp)
      .filter(([lv]) => lv <= level)
      .map(([, id]) => id);
  }

  function defaultMoves(sp, level) {
    const list = learnable(sp, level).reverse();
    const hit = list.filter(id => MOVES[id].cat !== "status");
    const other = list.filter(id => MOVES[id].cat === "status");
    const pick = hit.slice(0, 3).concat(other.slice(0, 1));
    hit.slice(3).forEach(id => pick.length < MAX_MOVES && pick.push(id));
    other.slice(1).forEach(id => pick.length < MAX_MOVES && pick.push(id));
    return pick.slice(0, MAX_MOVES);
  }

  function statsOf(sp, level) {
    const b = speciesInfo(sp).base;
    const out = {};
    STATS.forEach((k, i) => {
      const core = Math.floor((2 * b[i] * level) / 100);
      out[k] = k === "hp" ? core + level + 10 : core + 5;
    });
    return out;
  }

  const bst = sp => speciesInfo(sp).base.reduce((a, b) => a + b, 0);

  function movesOf(s, uid) {
    const sp = Game.speciesOf(s, uid);
    const lv = Game.levelOf(s, uid);
    const can = learnable(sp, lv);
    const chosen = (s.moves && Array.isArray(s.moves[uid]) ? s.moves[uid] : []).filter(id => can.includes(id));
    return chosen.length ? Array.from(new Set(chosen)).slice(0, MAX_MOVES) : defaultMoves(sp, lv);
  }

  function setMoves(s, uid, list, now = Date.now()) {
    if (!s.owned.includes(uid) || !Array.isArray(list)) return { changed: false };
    const can = learnable(Game.speciesOf(s, uid), Game.levelOf(s, uid));
    const clean = Array.from(new Set(list.filter(id => can.includes(id)))).slice(0, MAX_MOVES);
    if (!clean.length) return { changed: false };
    Game.catchUp(s, now);
    if (!s.moves) s.moves = {};
    s.moves[uid] = clean;
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, moves: clean.slice() };
  }

  function canFight(s, uid) {
    return s.owned.includes(uid) && !Game.isAway(s, uid) && !Game.isDying(s, uid) && Game.lifeOf(s, uid) > 0;
  }

  function team(s) {
    return s.party.map(uid => {
      const sp = Game.speciesOf(s, uid);
      const lv = Game.levelOf(s, uid);
      const st = statsOf(sp, lv);
      return {
        uid,
        species: sp,
        level: lv,
        types: speciesInfo(sp).types,
        life: Game.lifeOf(s, uid),
        hp: Math.max(Game.lifeOf(s, uid) > 0 ? 1 : 0, Math.round((st.hp * Game.lifeOf(s, uid)) / 100)),
        stats: st,
        away: Game.isAway(s, uid),
        dying: Game.isDying(s, uid),
        able: canFight(s, uid),
        moves: movesOf(s, uid),
        learnset: learnset(sp).map(([lv2, id]) => ({ id, level: lv2, known: lv2 <= lv }))
      };
    });
  }

  function wildPool(level) {
    return Object.keys(SPECIES).filter(sp => level >= SPECIES[sp].minLevel && level < SPECIES[sp].maxLevel);
  }

  function makeFighter(sp, lv, moves, uid) {
    const st = statsOf(sp, lv);
    const f = { sp, lv, st, max: st.hp, hp: st.hp, moves: moves.slice(0, MAX_MOVES), down: false };
    if (uid) f.uid = uid;
    return f;
  }

  const ableIdx = list => list.map((f, i) => (f.down ? -1 : i)).filter(i => i >= 0);

  function start(s, now = Date.now(), rand = Math.random) {
    Game.catchUp(s, now);
    if (s.battle) return { changed: false, reason: "active" };
    const mine = s.party.filter(uid => canFight(s, uid));
    if (!mine.length) return { changed: false, reason: "team" };
    const me = mine.map(uid => {
      const f = makeFighter(Game.speciesOf(s, uid), Game.levelOf(s, uid), movesOf(s, uid), uid);
      f.hp = Math.max(1, Math.min(f.max, Math.round((f.max * Game.lifeOf(s, uid)) / 100)));
      return f;
    });
    const avg = me.reduce((a, f) => a + f.lv, 0) / me.length;
    const used = {};
    const foe = me.map(m => {
      const ref = m.lv * 0.7 + avg * 0.3;
      const lv = Math.max(1, Math.min(Game.C.MAX_LEVEL, Math.round(ref + rand() * 3.5 - 2.5)));
      let pool = wildPool(lv);
      const fresh = pool.filter(sp => !used[sp]);
      if (fresh.length) pool = fresh;
      const sp = pool[Math.floor(rand() * pool.length) % pool.length];
      used[sp] = true;
      return makeFighter(sp, lv, defaultMoves(sp, lv));
    });
    const lead = Math.max(0, mine.indexOf(s.pet));
    s.battle = {
      v: 1,
      id: "b" + now.toString(36) + Math.floor(rand() * 1e6).toString(36),
      at: now,
      turn: 0,
      me,
      foe,
      mi: lead,
      fi: 0,
      stages: { me: {}, foe: {} },
      seen: { 0: [lead] },
      need: false
    };
    s.actionAt = Math.max(now, s.actionAt + 1);
    return { changed: true, battle: snapshot(s.battle), events: [{ t: "start" }] };
  }

  const stageMul = n => (n >= 0 ? (2 + n) / 2 : 2 / (2 - n));
  const statOf = (b, side, key) => {
    const f = side === "me" ? b.me[b.mi] : b.foe[b.fi];
    return Math.max(1, Math.floor(f.st[key] * stageMul(b.stages[side][key] || 0)));
  };
  const other = side => (side === "me" ? "foe" : "me");
  const active = (b, side) => (side === "me" ? b.me[b.mi] : b.foe[b.fi]);

  function effectiveness(move, sp) {
    if (!move.type) return 1;
    return Types.multiplier(move.type, speciesInfo(sp).types);
  }

  function calcDamage(b, side, move, rand, avg) {
    const att = active(b, side);
    const def = active(b, other(side));
    const phys = move.cat === "phys";
    const A = statOf(b, side, phys ? "atk" : "spa");
    const D = statOf(b, other(side), phys ? "def" : "spd");
    const base = Math.floor(Math.floor((Math.floor((2 * att.lv) / 5 + 2) * move.power * A) / D) / 50) + 2;
    const stab = move.type && speciesInfo(att.sp).types.includes(move.type) ? 1.5 : 1;
    const eff = effectiveness(move, def.sp);
    const crit = !avg && rand() < 1 / 16;
    const roll = avg ? 0.925 : 0.85 + rand() * 0.15;
    const dmg = eff === 0 ? 0 : Math.max(1, Math.floor(base * stab * eff * (crit ? 1.5 : 1) * roll));
    return { dmg, eff, crit };
  }

  function applyStages(b, side, changes, events) {
    let any = false;
    Object.keys(changes || {}).forEach(k => {
      const cur = b.stages[side][k] || 0;
      const next = Math.max(-6, Math.min(6, cur + changes[k]));
      if (next === cur) {
        events.push({ t: "stat", side, stat: k, d: 0 });
        return;
      }
      b.stages[side][k] = next;
      any = true;
      events.push({ t: "stat", side, stat: k, d: next - cur });
    });
    return any;
  }

  function useMove(s, b, side, moveId, rand, events) {
    const att = active(b, side);
    const def = active(b, other(side));
    if (!att || att.down) return;
    const move = MOVES[moveId];
    if (!move) return;
    events.push({ t: "use", side, move: moveId, anim: move.cat === "phys" ? "attack" : "special", type: move.type, cat: move.cat });
    if (move.cat === "status") {
      if (move.heal) {
        const before = att.hp;
        att.hp = Math.min(att.max, att.hp + Math.ceil(att.max * move.heal));
        if (att.hp === before) events.push({ t: "fail" });
        else events.push({ t: "heal", side, hp: att.hp, max: att.max, amount: att.hp - before });
      }
      if (move.self) applyStages(b, side, move.self, events);
      if (move.foe) {
        if (def.down) events.push({ t: "fail" });
        else if (move.acc && rand() * 100 >= move.acc) events.push({ t: "miss", side });
        else applyStages(b, other(side), move.foe, events);
      }
      return;
    }
    if (!def || def.down) {
      events.push({ t: "fail" });
      return;
    }
    if (move.acc && rand() * 100 >= move.acc) {
      events.push({ t: "miss", side });
      return;
    }
    const r = calcDamage(b, side, move, rand);
    if (r.eff === 0) {
      events.push({ t: "hit", side: other(side), dmg: 0, hp: def.hp, max: def.max, eff: 0, crit: false, type: move.type });
      return;
    }
    const dealt = Math.min(def.hp, r.dmg);
    def.hp -= dealt;
    events.push({ t: "hit", side: other(side), dmg: dealt, hp: def.hp, max: def.max, eff: r.eff, crit: r.crit, type: move.type });
    if (move.drain && dealt > 0 && att.hp < att.max) {
      const before = att.hp;
      att.hp = Math.min(att.max, att.hp + Math.max(1, Math.floor(dealt * move.drain)));
      events.push({ t: "heal", side, hp: att.hp, max: att.max, amount: att.hp - before, drain: true });
    }
    if (def.hp <= 0) {
      def.hp = 0;
      def.down = true;
      events.push({ t: "faint", side: other(side), i: other(side) === "me" ? b.mi : b.fi });
      if (other(side) === "foe") award(s, b, events);
      return;
    }
    if ((move.self || move.foe) && rand() * 100 < (move.chance || 100)) {
      if (move.self) applyStages(b, side, move.self, events);
      if (move.foe) applyStages(b, other(side), move.foe, events);
    }
  }

  function award(s, b, events) {
    const f = b.foe[b.fi];
    const xp = Math.round((bst(f.sp) / 300) * (5 + f.lv * 2.4));
    const ids = Array.from(new Set(b.seen[b.fi] || [])).filter(i => b.me[i] && !b.me[i].down && b.me[i].uid);
    ids.forEach(i => {
      const m = b.me[i];
      if (!s.owned.includes(m.uid)) return;
      const sp = Game.speciesOf(s, m.uid);
      const before = Game.levelOf(s, m.uid);
      const known = learnable(sp, before);
      const gained = Game.addXp(s, m.uid, xp);
      const level = Game.levelOf(s, m.uid);
      const learned = gained ? learnable(sp, level).filter(id => !known.includes(id)) : [];
      if (learned.length && s.moves && Array.isArray(s.moves[m.uid])) {
        learned.forEach(id => {
          if (s.moves[m.uid].length < MAX_MOVES && !s.moves[m.uid].includes(id)) s.moves[m.uid].push(id);
        });
      }
      events.push({ t: "xp", i, uid: m.uid, amount: xp, levels: gained, level, learned });
    });
  }

  function aiMove(b, rand) {
    const f = b.foe[b.fi];
    const target = b.me[b.mi];
    const scored = f.moves.map(id => {
      const m = MOVES[id];
      if (!m) return { id, score: 0 };
      if (m.cat === "status") {
        let score = 18;
        if (m.heal) score = f.hp < f.max * 0.45 ? 70 : f.hp >= f.max ? 0 : 10;
        const st = b.stages.foe;
        if (m.self && Object.keys(m.self).every(k => (st[k] || 0) >= 2)) score = m.heal ? score : 2;
        if (m.foe && Object.keys(m.foe).every(k => (b.stages.me[k] || 0) <= -2)) score = 2;
        return { id, score };
      }
      if (!target || target.down) return { id, score: m.power };
      const r = calcDamage(b, "foe", m, rand, true);
      const kill = r.dmg >= target.hp ? 1.6 : 1;
      return { id, score: r.dmg * ((m.acc || 100) / 100) * kill + (m.prio && r.dmg >= target.hp ? 40 : 0) };
    });
    if (!scored.length) return "investida";
    if (rand() < 0.75) return scored.slice().sort((a, b2) => b2.score - a.score)[0].id;
    const ok = scored.filter(x => x.score > 0);
    const list = ok.length ? ok : scored;
    return list[Math.floor(rand() * list.length) % list.length].id;
  }

  function switchIn(b, side, i, events) {
    if (side === "me") {
      b.mi = i;
      const seen = b.seen[b.fi] || (b.seen[b.fi] = []);
      if (!seen.includes(i)) seen.push(i);
    } else {
      b.fi = i;
      b.seen[i] = b.me[b.mi] && !b.me[b.mi].down ? [b.mi] : [];
    }
    b.stages[side] = {};
    const f = active(b, side);
    events.push({ t: "switch", side, i, sp: f.sp, lv: f.lv, hp: f.hp, max: f.max });
  }

  function syncLife(s, b) {
    b.me.forEach(f => {
      if (!f.uid || !s.owned.includes(f.uid) || f.gone) return;
      if (f.down || f.hp <= 0) {
        s.life[f.uid] = 0;
        s.dying[f.uid] = true;
      } else {
        s.life[f.uid] = Math.max(0.5, Math.min(100, (f.hp / f.max) * 100));
        if (s.life[f.uid] >= Game.C.REVIVE_AT) s.dying[f.uid] = false;
      }
    });
  }

  function refresh(s, b) {
    b.me.forEach(f => {
      if (f.gone) return;
      if (!f.uid || !s.owned.includes(f.uid) || Game.isAway(s, f.uid)) {
        f.gone = true;
        f.down = true;
        return;
      }
      if (f.down) return;
      const life = Game.lifeOf(s, f.uid);
      const hp = Math.floor((f.max * life) / 100);
      if (hp > f.hp) f.hp = Math.min(f.max, hp);
    });
  }

  function finish(s, b, result, events, now) {
    let coins = 0;
    if (result === "win") {
      coins = Math.round(b.foe.reduce((a, f) => a + f.lv, 0) * 0.5) + 4 * b.foe.length;
      s.coins += coins;
    }
    syncLife(s, b);
    s.battle = null;
    s.actionAt = Math.max(now, s.actionAt + 1);
    events.push({ t: "end", result, coins });
  }

  function itemTarget(s, b, item, i) {
    const it = Game.ITEMS[item];
    const f = b.me[i];
    if (!it || !BATTLE_ITEMS.includes(item) || !(s.inventory[item] >= 1) || !f || f.gone) return false;
    if (it.revive) return f.down;
    return !f.down && f.hp < f.max;
  }

  function act(s, action, now = Date.now(), rand = Math.random) {
    const b = s.battle;
    if (!b || !action || typeof action !== "object") return { changed: false };
    Game.catchUp(s, now);
    refresh(s, b);
    const events = [];
    const done = () => {
      if (s.battle) {
        syncLife(s, b);
        s.actionAt = Math.max(now, s.actionAt + 1);
      }
      return { changed: true, events, battle: s.battle ? snapshot(s.battle) : null };
    };

    if (action.kind === "run") {
      events.push({ t: "run" });
      finish(s, b, "run", events, now);
      return done();
    }

    if (b.me[b.mi] && b.me[b.mi].down && !b.need) {
      if (ableIdx(b.me).length) b.need = true;
      else {
        finish(s, b, "lose", events, now);
        return done();
      }
    }

    if (b.need) {
      const i = action.kind === "switch" ? action.to : -1;
      if (!b.me[i] || b.me[i].down) return { changed: false };
      b.need = false;
      switchIn(b, "me", i, events);
      return done();
    }

    let first = null;
    if (action.kind === "move") {
      if (!active(b, "me").moves.includes(action.move) || !MOVES[action.move]) return { changed: false };
    } else if (action.kind === "switch") {
      if (action.to === b.mi || !b.me[action.to] || b.me[action.to].down) return { changed: false };
    } else if (action.kind === "item") {
      if (!itemTarget(s, b, action.item, action.target)) return { changed: false };
    } else return { changed: false };

    b.turn += 1;
    const foeMove = aiMove(b, rand);

    if (action.kind === "switch") {
      switchIn(b, "me", action.to, events);
      first = "done";
    } else if (action.kind === "item") {
      const it = Game.ITEMS[action.item];
      const f = b.me[action.target];
      s.inventory[action.item] -= 1;
      if (!s.inventory[action.item]) delete s.inventory[action.item];
      if (it.revive) {
        f.down = false;
        f.hp = Math.max(1, Math.round((f.max * it.life) / 100));
        s.dying[f.uid] = false;
        events.push({ t: "item", item: action.item, i: action.target, hp: f.hp, max: f.max, revive: true });
      } else {
        const before = f.hp;
        f.hp = Math.min(f.max, f.hp + Math.round((f.max * it.life) / 100));
        events.push({ t: "item", item: action.item, i: action.target, hp: f.hp, max: f.max, amount: f.hp - before });
      }
      first = "done";
    }

    if (first === "done") {
      useMove(s, b, "foe", foeMove, rand, events);
    } else {
      const mp = MOVES[action.move].prio || 0;
      const fp = MOVES[foeMove].prio || 0;
      const ms = statOf(b, "me", "spe");
      const fs = statOf(b, "foe", "spe");
      const meFirst = mp !== fp ? mp > fp : ms !== fs ? ms > fs : rand() < 0.5;
      const order = meFirst ? [["me", action.move], ["foe", foeMove]] : [["foe", foeMove], ["me", action.move]];
      order.forEach(([side, id]) => {
        const a = active(b, side);
        const d = active(b, other(side));
        if (!a || a.down) return;
        if (MOVES[id].cat !== "status" && (!d || d.down)) return;
        useMove(s, b, side, id, rand, events);
      });
    }

    if (b.foe[b.fi].down) {
      const next = ableIdx(b.foe);
      if (!next.length) {
        finish(s, b, "win", events, now);
        return done();
      }
      switchIn(b, "foe", next[0], events);
    }
    if (b.me[b.mi].down) {
      if (!ableIdx(b.me).length) {
        finish(s, b, "lose", events, now);
        return done();
      }
      b.need = true;
      events.push({ t: "need" });
    }
    return done();
  }

  function snapshot(b) {
    return b ? JSON.parse(JSON.stringify(b)) : null;
  }

  function moveInfo(id) {
    const m = MOVES[id];
    if (!m) return null;
    const parts = [];
    if (m.prio) parts.push("Ataca primeiro");
    if (m.drain) parts.push("Recupera metade do dano causado");
    if (m.heal) parts.push("Recupera metade da vida");
    const fx = (o, who) =>
      Object.keys(o).map(k => (o[k] > 0 ? "+" : "") + o[k] + " " + STAT_NAMES[k] + who);
    const stat = [].concat(m.self ? fx(m.self, "") : [], m.foe ? fx(m.foe, " do alvo") : []);
    if (stat.length) parts.push((m.cat !== "status" && m.chance && m.chance < 100 ? m.chance + "% de chance: " : "") + stat.join(", "));
    if (m.cat !== "status" && !m.acc) parts.push("Nunca erra");
    return Object.assign({ id, desc: parts.join(" · ") }, m);
  }

  return {
    MAX_MOVES,
    MOVES,
    SPECIES,
    STAT_NAMES,
    BATTLE_ITEMS,
    setMeta,
    speciesInfo,
    learnset,
    learnable,
    defaultMoves,
    statsOf,
    movesOf,
    setMoves,
    canFight,
    team,
    wildPool,
    start,
    act,
    snapshot,
    moveInfo,
    effectiveness
  };
});
