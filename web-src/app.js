(function () {
  const $ = id => document.getElementById(id);
  const cfg = window.PETS_CONFIG || {};
  const STATE_KEY = "pets.state.v1";
  const SESSION_KEY = "pets.session.v1";
  const SYNC_DELAY_MS = 1500;
  const SYNC_EVERY_MS = 60000;
  const THREE_LOCAL = "vendor/three.min.js";
  const THREE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

  const store = {
    read(key) {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch (err) {
        return null;
      }
    },
    write(key, value) {
      try {
        if (value === null || value === undefined) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
      } catch (err) {}
    }
  };

  const loadScript = src =>
    new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("falha ao carregar " + src));
      document.body.appendChild(el);
    });

  const loadScriptSafe = src => loadScript(src).catch(() => null);

  let cloud = null;
  let state = null;
  let stage = null;
  let petIds = [];
  let meta = {};
  let syncTimer = 0;
  let animateList = false;
  let preview = null;
  let starterStage = null;
  let starterSel = 0;
  let starterEgg = null;
  let eggStage = null;
  let eggTab = "inc";
  let eggSlot = 0;
  let shownEggId = null;
  let revealing = false;
  let eggTicker = 0;
  let firstSyncDone = false;
  let evolvingNow = false;
  let syncing = false;
  let syncAgain = false;
  let account = { offline: false, error: "", lastSync: 0 };
  let toastTimer = 0;
  let installEvent = null;
  let tab = "party";
  let swapIn = null;
  let lastPetId = null;

  const barLevel = v => (v > 50 ? "ok" : v > 25 ? "warn" : "low");

  function setBar(bar, valueEl, pct, text) {
    const p = Math.max(0, Math.min(100, pct));
    bar.firstElementChild.style.width = p + "%";
    bar.setAttribute("aria-valuenow", String(Math.round(p)));
    if (valueEl) valueEl.textContent = text !== undefined ? text : Math.round(p) + "%";
  }

  function saveState() {
    store.write(STATE_KEY, state);
  }

  function view() {
    const list = petIds.map(id => ({
      id,
      name: (meta[id] && meta[id].name) || id,
      color: (meta[id] && meta[id].color) || "#999999",
      types: (meta[id] && meta[id].types) || []
    }));
    return Game.view(state, list);
  }

  function desktopDownload() {
    const ua = navigator.userAgent;
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return null;
    const host = location.hostname.match(/^([^.]+)\.github\.io$/i);
    const repo = location.pathname.split("/").filter(Boolean)[0];
    if (!host || !repo) return null;
    const base = "https://github.com/" + host[1] + "/" + repo + "/releases/download/desktop/";
    if (/Windows/i.test(ua)) return { url: base + "Pets-Windows.exe", label: "Baixar para Windows" };
    if (/Linux/i.test(ua)) return { url: base + "Pets-Linux.AppImage", label: "Baixar para Linux" };
    return null;
  }

  function typeTags(types) {
    const box = document.createElement("span");
    box.className = "type-tags";
    (types || []).forEach(t => {
      const info = window.PetTypes && PetTypes.INFO[t];
      if (!info) return;
      const tag = document.createElement("span");
      tag.className = "type-tag";
      tag.textContent = info.name;
      tag.style.background = info.color;
      const n = parseInt(info.color.slice(1), 16);
      const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
      tag.style.color = lum > 0.62 ? "#1f2a24" : "#ffffff";
      box.append(tag);
    });
    return box;
  }

  function renderDex() {
    const v = view();
    const owned = new Set(v.ownedSpecies);
    const found = petIds.filter(id => owned.has(id)).length;
    $("dex-count").textContent = found + " de " + petIds.length + " descobertas";
    const list = $("dex-list");
    list.replaceChildren();
    const dexOrder = petIds.slice().sort((a, b) => (meta[a] ? meta[a].dex : 999) - (meta[b] ? meta[b].dex : 999) || a.localeCompare(b));
    dexOrder.forEach((id, i) => {
      const m = meta[id] || { name: id, color: "#999999", types: [] };
      const known = owned.has(id);
      const card = document.createElement("button");
      card.type = "button";
      card.className = "dex-card" + (known ? "" : " unknown");
      card.style.setProperty("--i", String(i));
      card.style.setProperty("--c", known ? m.color : "#8a958f");
      card.disabled = !known;
      const sw = document.createElement("span");
      sw.className = "dex-dot";
      sw.textContent = known ? "" : "?";
      const name = document.createElement("span");
      name.className = "dex-card-name";
      name.textContent = known ? m.name : "???";
      const num = document.createElement("span");
      num.className = "dex-card-num";
      num.textContent = dexNum(id);
      card.append(sw, name, num);
      if (known) card.addEventListener("click", () => openDexDetail(id));
      list.append(card);
    });
  }

  function dexNum(id) {
    const n = meta[id] && meta[id].dex < 999 ? meta[id].dex : 0;
    return "#" + String(n).padStart(3, "0");
  }

  function openDexDetail(id) {
    const v = view();
    const m = meta[id];
    if (!m) return;
    const rows = v.party.concat(v.box).filter(p => p.species === id);
    const row = rows.find(p => p.id === v.pet) || rows.sort((a, b) => b.level - a.level)[0];
    $("dex-detail").style.setProperty("--c", m.color);
    $("dex-name").textContent = m.name;
    $("dex-types").replaceChildren(...typeTags(m.types).childNodes);
    $("dex-desc").textContent = m.description || "Ainda não há muito o que dizer sobre esta criatura.";
    const bits = [dexNum(id)];
    if (rows.length > 1) bits.push("Você tem " + rows.length + " · maior nível " + row.level);
    else if (row) bits.push("Nível " + row.level + " · " + (v.party.some(p => p.id === row.id) ? "No grupo" : "Na caixa"));
    $("dex-meta").textContent = bits.join(" · ");
    renderEvoChain(id, new Set(v.ownedSpecies));
    $("dex-list").hidden = true;
    $("dex-count").hidden = true;
    $("dex-detail").hidden = false;
    $("dex-back").hidden = false;
    $("dex-title").textContent = m.name;
    if (!preview) {
      preview = PetStage.create({
        canvas: $("dex-canvas"),
        THREE: window.THREE,
        kit: window.PetKit,
        Pets: window.Pets,
        reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      });
    }
    preview.setPet(id);
    preview.setStatus({ hunger: 100, life: 100, dying: false });
    requestAnimationFrame(() => {
      preview.resize();
      preview.start();
    });
  }

  function renderEvoChain(id, owned) {
    let first = id;
    const seen = new Set([id]);
    for (;;) {
      const pre = petIds.find(o => meta[o] && meta[o].evolvesTo === first);
      if (!pre || seen.has(pre)) break;
      seen.add(pre);
      first = pre;
    }
    const chain = [first];
    while (meta[chain[chain.length - 1]] && meta[chain[chain.length - 1]].evolvesTo && chain.length < 6) {
      const nx = meta[chain[chain.length - 1]].evolvesTo;
      if (!meta[nx] || chain.includes(nx)) break;
      chain.push(nx);
    }
    $("dex-evo").hidden = chain.length < 2;
    const box = $("dex-evo-chain");
    box.replaceChildren();
    if (chain.length < 2) return;
    chain.forEach((sp, i) => {
      if (i > 0) {
        const arrow = document.createElement("span");
        arrow.className = "evo-arrow";
        arrow.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const lv = document.createElement("span");
        lv.className = "evo-lv";
        lv.textContent = meta[chain[i - 1]].evolveLevel ? "Nv " + meta[chain[i - 1]].evolveLevel : "";
        arrow.append(lv);
        box.append(arrow);
      }
      const known = owned.has(sp);
      const node = document.createElement("button");
      node.type = "button";
      node.className = "evo-node" + (sp === id ? " current" : "") + (known ? "" : " unknown");
      node.style.setProperty("--c", meta[sp].color);
      node.style.setProperty("--i", String(i));
      node.disabled = !known || sp === id;
      const circle = document.createElement("span");
      circle.className = "evo-circle";
      const url = PetStage.thumbnail(window.THREE, window.PetKit, window.Pets, sp);
      if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = known ? meta[sp].name : "Criatura desconhecida";
        circle.append(img);
      }
      const name = document.createElement("span");
      name.className = "evo-name";
      name.textContent = known ? meta[sp].name : "???";
      node.append(circle, name);
      if (known && sp !== id) node.addEventListener("click", () => openDexDetail(sp));
      box.append(node);
    });
  }

  function closeDexDetail() {
    if (preview) preview.stop();
    $("dex-detail").hidden = true;
    $("dex-list").hidden = false;
    $("dex-count").hidden = false;
    $("dex-back").hidden = true;
    $("dex-title").textContent = "Criaturas";
  }

  const reduce = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function makeStage(canvasId) {
    return PetStage.create({
      canvas: $(canvasId),
      THREE: window.THREE,
      kit: window.PetKit,
      Pets: window.Pets,
      reduceMotion: reduce()
    });
  }

  function dragSpin(el, getStage, onTap) {
    let down = false;
    let x = 0;
    let y = 0;
    let sx = 0;
    let sy = 0;
    el.addEventListener("pointerdown", e => {
      const st = getStage();
      if (!st) return;
      down = true;
      x = e.clientX;
      y = e.clientY;
      sx = x;
      sy = y;
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {
        down = true;
      }
      st.spin.begin();
    });
    el.addEventListener("pointermove", e => {
      const st = getStage();
      if (!down || !st) return;
      st.spin.drag(e.clientX - x, e.clientY - y);
      x = e.clientX;
      y = e.clientY;
    });
    const up = e => {
      const st = getStage();
      if (down && st) st.spin.end();
      const tap = down && e && e.type === "pointerup" && Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) < 10;
      down = false;
      if (tap && onTap) onTap();
    };
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  function hatchLabel(wrap, text, cls) {
    let label = wrap.querySelector(".hatch-text");
    if (!label) {
      label = document.createElement("p");
      label.className = "hatch-text";
      wrap.append(label);
    }
    label.hidden = !text;
    label.textContent = text || "";
    label.className = "hatch-text" + (cls ? " " + cls : "");
    void label.offsetWidth;
    return label;
  }

  const TAP_TEXT = ["Toque no ovo 3 vezes!", "Rachou!", "Está brilhando!", "Lá vem!"];

  function tapEgg(st, wrap, species, onDone) {
    if (!st || !st.hasEgg() || st.eggCracks() >= 3) return;
    const level = st.eggTap();
    hatchLabel(wrap, TAP_TEXT[level], level % 2 ? "again" : "");
    wrap.classList.remove("knock");
    void wrap.offsetWidth;
    wrap.classList.add("knock");
    if (level >= 3) setTimeout(() => runHatch(st, wrap, species, onDone), 600);
  }

  function baseIds() {
    return petIds.filter(id => !petIds.some(o => meta[o] && meta[o].evolvesTo === id));
  }

  function route() {
    if (!state) return;
    if (Game.needsStarter(state)) {
      if (cloud && cloud.signedIn() && !firstSyncDone) {
        $("loading-text").textContent = account.offline ? "Sem conexão. Tentando de novo..." : "Sincronizando...";
        showView("loading");
        return;
      }
      enterStarter();
      return;
    }
    if (!$("starter-view").hidden && (starterEgg || !$("starter-done").hidden)) return;
    if ($("game-view").hidden) {
      showView("game");
      lastPetId = null;
    }
    render();
  }

  function enterStarter() {
    if (!$("starter-view").hidden) return;
    showView("starter");
    if (!starterStage) starterStage = makeStage("starter-canvas");
    $("starter-pick").hidden = false;
    $("starter-done").hidden = true;
    renderStarter();
    requestAnimationFrame(() => {
      starterStage.resize();
      starterStage.start();
    });
  }

  function renderStarter() {
    const list = Game.C.STARTERS.filter(id => meta[id]);
    const id = list[starterSel] || list[0];
    const m = meta[id];
    const box = $("starter-options");
    box.replaceChildren();
    list.forEach((sid, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "starter-option";
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(i === starterSel));
      b.style.setProperty("--c", meta[sid].color);
      b.style.setProperty("--i", String(i));
      const dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = meta[sid].color;
      const name = document.createElement("span");
      name.textContent = meta[sid].name;
      b.append(dot, name);
      b.addEventListener("click", () => {
        starterSel = i;
        renderStarter();
      });
      box.append(b);
    });
    document.documentElement.style.setProperty("--pet", m.color);
    $("starter-types").replaceChildren(...typeTags(m.types).childNodes);
    $("starter-desc").textContent = m.description;
    $("starter-go").textContent = "Escolher " + m.name;
    starterStage.setEgg(null);
    starterStage.setPet(id);
  }

  function runHatch(st, wrap, species, onDone) {
    const name = meta[species] ? meta[species].name : species;
    hatchLabel(wrap, "Vai nascer!", "again");
    wrap.classList.remove("burst", "knock");
    wrap.classList.add("hatching", "shake-3");
    st.hatch(
      species,
      () => {
        setTimeout(() => {
          wrap.classList.remove("burst");
          hatchLabel(wrap, "");
        }, 2200);
        if (onDone) onDone();
      },
      () => {
        wrap.classList.remove("shake-3", "hatching");
        void wrap.offsetWidth;
        wrap.classList.add("burst");
        hatchLabel(wrap, name + "!", "reveal");
      }
    );
  }

  function chooseStarter() {
    const list = Game.C.STARTERS.filter(id => meta[id]);
    const id = list[starterSel] || list[0];
    const r = Game.chooseStarter(state, id);
    if (!r.changed) {
      route();
      return;
    }
    saveState();
    scheduleSync();
    $("starter-pick").hidden = true;
    starterStage.setEgg({ color: meta[id].color });
    starterEgg = id;
    hatchLabel($("starter-wrap"), TAP_TEXT[0]);
  }

  const fmtTime = ms => {
    const sec = Math.ceil(ms / 1000);
    return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0");
  };

  function slotEgg(i) {
    return state.eggs.find(e => e.slot === i) || null;
  }

  function miniEgg(color) {
    const egg = document.createElement("span");
    egg.className = "mini-egg";
    egg.style.setProperty("--c", color);
    return egg;
  }

  function openEggs() {
    eggTab = "inc";
    const first = [0, 1, 2].find(i => slotEgg(i));
    eggSlot = first === undefined ? 0 : first;
    shownEggId = undefined;
    revealing = false;
    if (!eggStage) eggStage = makeStage("egg-canvas");
    renderEggs();
    $("egg-sheet").showModal();
    requestAnimationFrame(() => {
      eggStage.resize();
      eggStage.start();
    });
    clearInterval(eggTicker);
    eggTicker = setInterval(tickEggs, 500);
  }

  function renderEggs() {
    Game.catchUp(state);
    $("coins").textContent = state.coins + " moedas";
    [["inc", "egg-incubator"], ["inv", "egg-inventory"], ["shop", "egg-shop"]].forEach(([k, pane]) => {
      $("tab-" + k).setAttribute("aria-selected", String(eggTab === k));
      $(pane).hidden = eggTab !== k;
    });
    const slots = $("egg-slots");
    slots.replaceChildren();
    for (let i = 0; i < Game.C.INCUBATOR_SLOTS; i++) {
      const e = slotEgg(i);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "egg-slot" + (e ? "" : " empty");
      b.setAttribute("aria-pressed", String(i === eggSlot));
      if (e) {
        b.append(miniEgg(meta[e.species] ? meta[e.species].color : "#999999"));
        const tm = document.createElement("span");
        tm.className = "slot-time";
        tm.id = "slot-time-" + i;
        tm.textContent = e.left <= 0 ? "Pronto!" : fmtTime(e.left);
        b.append(tm);
      } else {
        const tm = document.createElement("span");
        tm.className = "slot-time";
        tm.textContent = "Vazio";
        b.append(tm);
      }
      b.addEventListener("click", () => {
        if (revealing) revealing = false;
        eggSlot = i;
        renderEggs();
      });
      slots.append(b);
    }
    syncEggStage();
    tickEggs();

    const inv = state.eggs.filter(e => e.slot === null);
    const full = [0, 1, 2].every(i => slotEgg(i));
    $("inv-hint").textContent = inv.length
      ? full
        ? "A chocadeira está cheia. Espere um ovo chocar para colocar outro."
        : "Toque num ovo para levá-lo à chocadeira."
      : "Nenhum ovo guardado. Compre ovos na loja.";
    const list = $("egg-list");
    list.replaceChildren();
    inv.forEach((e, k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "item enter";
      b.style.setProperty("--i", String(k));
      const info = document.createElement("span");
      info.className = "info";
      const name = document.createElement("span");
      name.className = "name-line";
      name.textContent = "Ovo misterioso";
      info.append(name);
      b.append(miniEgg(meta[e.species] ? meta[e.species].color : "#999999"), info);
      b.addEventListener("click", () => {
        const r = Game.incubate(state, e.id);
        if (!r.changed) {
          showToast("A chocadeira está cheia.");
          return;
        }
        saveState();
        scheduleSync();
        eggSlot = r.slot;
        eggTab = "inc";
        revealing = false;
        renderEggs();
        render();
      });
      list.append(b);
    });

    refreshShop();
  }

  function refreshShop() {
    $("coins").textContent = state.coins + " moedas";
    const pool = Game.eggPool(state, baseIds());
    const canBuy = state.coins >= Game.C.EGG_PRICE && pool.length > 0;
    $("buy-egg").disabled = !canBuy;
    $("buy-egg").textContent = "Comprar por " + Game.C.EGG_PRICE + " moedas";
    $("shop-hint").textContent = !pool.length
      ? "Nenhuma criatura disponível nos ovos."
      : state.coins < Game.C.EGG_PRICE
        ? "Moedas insuficientes. Ainda não dá para ganhar moedas."
        : "O ovo vai para o seu inventário.";
  }

  function syncEggStage() {
    if (!eggStage || revealing) return;
    const e = slotEgg(eggSlot);
    $("egg-empty").hidden = !!e;
    if (!e) {
      if (shownEggId !== null) {
        eggStage.setEgg(null);
        eggStage.setPet(null);
        shownEggId = null;
      }
      return;
    }
    if (shownEggId !== e.id) {
      eggStage.setPet(null);
      eggStage.setEgg({ color: meta[e.species] ? meta[e.species].color : "#999999", nest: true, care: e.care });
      shownEggId = e.id;
    }
  }

  function tickEggs() {
    if (!state) return;
    Game.catchUp(state);
    for (let i = 0; i < Game.C.INCUBATOR_SLOTS; i++) {
      const e = slotEgg(i);
      const el = $("slot-time-" + i);
      if (e && el) el.textContent = e.left <= 0 ? "Pronto!" : fmtTime(e.left);
    }
    const e = slotEgg(eggSlot);
    const has = !!e && !revealing;
    $("egg-controls").hidden = !has && !revealing;
    if (revealing) return;
    if (!e) return;
    setBar($("care-bar"), $("care-val"), e.care);
    $("care-bar").dataset.level = barLevel(e.care);
    if (eggStage) eggStage.setEggCare(e.care);
    $("egg-timer").textContent = e.left <= 0 ? "Pronto para chocar!" : fmtTime(e.left);
    $("egg-hint").textContent =
      e.left <= 0 ? "" : e.care <= 0 ? "O ovo está sem cuidado e parou de chocar. Limpe e brinque com ele." : "Mantenha o cuidado alto para o tempo continuar correndo.";
    $("egg-clean").disabled = e.left <= 0 || e.care >= 99.5;
    $("egg-play").disabled = e.left <= 0 || e.care >= 99.5;
    if (e.left <= 0 && eggStage && eggStage.hasEgg() && shownEggId === e.id && eggStage.eggCracks() === 0) {
      const lbl = $("egg-wrap").querySelector(".hatch-text");
      if (!lbl || lbl.hidden) hatchLabel($("egg-wrap"), TAP_TEXT[0]);
    }
  }

  function tapIncubatorEgg() {
    const e = slotEgg(eggSlot);
    if (!e || revealing || e.left > 0 || !eggStage || !eggStage.hasEgg()) return;
    if (eggStage.eggCracks() >= 2) {
      revealing = true;
      $("egg-clean").disabled = true;
      $("egg-play").disabled = true;
      $("egg-hint").textContent = "";
    }
    tapEgg(eggStage, $("egg-wrap"), e.species, () => finishHatch(e.id, e.species));
  }

  function finishHatch(id, species) {
    const r = Game.hatchEgg(state, id);
    if (r.changed) {
      saveState();
      scheduleSync();
      render();
    }
    shownEggId = null;
    const name = meta[species] ? meta[species].name : species;
    $("egg-timer").textContent = "Nasceu um " + name + "!";
    showToast(name + " nasceu e foi para " + (r.uid && state.party.includes(r.uid) ? "o seu grupo" : "a caixa") + "!");
    const slots = $("egg-slots");
    const btn = slots.children[eggSlot];
    if (btn) {
      btn.classList.add("empty");
      btn.replaceChildren();
      const tm = document.createElement("span");
      tm.className = "slot-time";
      tm.textContent = "Vazio";
      btn.append(tm);
    }
  }

  function evolveTarget() {
    if (!state || !state.pet) return null;
    const m = meta[Game.speciesOf(state)];
    if (!m || !m.evolvesTo || !meta[m.evolvesTo] || !m.evolveLevel) return null;
    return Game.canEvolve(state, state.pet, m.evolvesTo, m.evolveLevel) ? m.evolvesTo : null;
  }

  function checkEvolution() {
    if (evolvingNow || !state || !stage || !state.pet || $("game-view").hidden) return;
    const id = state.pet;
    const m = meta[Game.speciesOf(state)];
    if (!evolveTarget()) return;
    $("evolve-btn").hidden = true;
    const target = m.evolvesTo;
    const to = meta[target];
    evolvingNow = true;
    const wrap = $("stage-wrap");
    ["feed", "treat", "party-btn"].forEach(b => ($(b).disabled = true));
    hatchLabel(wrap, "Hã? " + m.name + " está evoluindo!");
    wrap.classList.remove("burst");
    wrap.classList.add("hatching", "shake-1");
    const t1 = setTimeout(() => wrap.classList.replace("shake-1", "shake-2"), 2200);
    const t2 = setTimeout(() => wrap.classList.replace("shake-2", "shake-3"), 3400);
    stage.evolve(
      target,
      () => {
        const r = Game.evolve(state, id, target, m.evolveLevel);
        evolvingNow = false;
        if (r.changed) {
          saveState();
          scheduleSync();
        }
        lastPetId = state.pet + ":" + Game.speciesOf(state);
        $("party-btn").disabled = false;
        setTimeout(() => {
          wrap.classList.remove("burst");
          hatchLabel(wrap, "");
        }, 2000);
        showToast(m.name + " evoluiu para " + to.name + "!");
        render();
      },
      () => {
        clearTimeout(t1);
        clearTimeout(t2);
        wrap.classList.remove("shake-1", "shake-2", "shake-3", "hatching");
        void wrap.offsetWidth;
        wrap.classList.add("burst");
        hatchLabel(wrap, to.name + "!", "reveal");
        document.documentElement.style.setProperty("--pet", to.color);
      }
    );
  }

  function showToast(text) {
    const el = $("toast");
    const host = document.querySelector("dialog[open]") || document.body;
    if (el.parentNode !== host) host.append(el);
    el.hidden = true;
    void el.offsetWidth;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3500);
  }

  function showView(name) {
    $("loading").hidden = name !== "loading";
    $("auth-view").hidden = name !== "auth";
    $("game-view").hidden = name !== "game";
    $("starter-view").hidden = name !== "starter";
    if (name !== "starter" && starterStage) starterStage.stop();
    if (name === "game" && stage) {
      stage.resize();
      stage.start();
    } else if (stage) {
      stage.stop();
    }
  }

  function itemNode(p, tag) {
    const el = document.createElement(tag || "div");
    el.className = "item";
    const dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = p.color;
    const info = document.createElement("span");
    info.className = "info";
    const line = document.createElement("span");
    line.className = "name-line";
    const name = document.createElement("span");
    name.textContent = p.name;
    const lv = document.createElement("span");
    lv.className = "lv";
    lv.textContent = "Nv " + p.level;
    line.append(name, lv);
    [
      [p.hunger <= 25, "Fome"],
      [p.joy <= 25, "Triste"],
      [p.dying, "Morrendo"]
    ].forEach(([on, text]) => {
      if (!on) return;
      const warn = document.createElement("span");
      warn.className = "warn-tag";
      warn.textContent = text;
      line.append(warn);
    });
    info.append(line);
    el.append(dot, info);
    return el;
  }

  function renderSheet(v) {
    const partyList = $("party-list");
    const boxList = $("box-list");
    $("tab-party").setAttribute("aria-selected", String(tab === "party"));
    $("tab-box").setAttribute("aria-selected", String(tab === "box"));
    partyList.hidden = tab !== "party";
    boxList.hidden = tab !== "box";
    $("tab-box").textContent = "Caixa (" + v.box.length + ")";
    $("tab-party").textContent = "Grupo (" + v.party.length + "/" + Game.C.PARTY_SIZE + ")";

    if (tab === "party") {
      $("sheet-hint").textContent = "Toque em um bichinho para cuidar dele. Todos do grupo gastam fome, vida e felicidade, mesmo fora da tela.";
    } else if (swapIn) {
      $("sheet-hint").textContent = "Escolha quem sai do grupo para dar lugar ao novo bichinho.";
    } else {
      $("sheet-hint").textContent = "Quem está na caixa fica parado: não gasta fome, vida nem felicidade.";
    }

    const stagger = animateList;
    animateList = false;
    partyList.replaceChildren();
    v.party.forEach(p => {
      const el = itemNode(p, "button");
      el.type = "button";
      el.setAttribute("aria-pressed", String(p.id === v.pet));
      el.addEventListener("click", () => {
        const r = Game.selectPet(state, p.id);
        if (r.changed) {
          saveState();
          scheduleSync();
        }
        $("party-sheet").close();
        render();
      });
      partyList.append(el);
    });

    boxList.replaceChildren();
    if (swapIn) {
      const incoming = v.box.find(b => b.id === swapIn);
      if (!incoming) {
        swapIn = null;
      } else {
        const title = document.createElement("p");
        title.className = "picker-title";
        title.textContent = "Entra: " + incoming.name;
        boxList.append(title);
        v.party.forEach(p => {
          const el = itemNode(p, "button");
          el.type = "button";
          el.setAttribute("aria-label", "Trocar " + p.name + " por " + incoming.name);
          el.addEventListener("click", () => {
            const r = Game.swapParty(state, p.id, incoming.id, petIds);
            swapIn = null;
            if (r.changed) {
              saveState();
              scheduleSync();
              showToast(incoming.name + " entrou no grupo");
            }
            render();
          });
          boxList.append(el);
        });
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.className = "btn soft";
        cancel.textContent = "Cancelar";
        cancel.addEventListener("click", () => {
          swapIn = null;
          render();
        });
        boxList.append(cancel);
        return;
      }
    }
    if (!v.box.length) {
      const empty = document.createElement("p");
      empty.className = "hint";
      empty.textContent = "A caixa está vazia.";
      boxList.append(empty);
    }
    v.box.forEach(p => {
      const el = itemNode(p, "div");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn primary";
      btn.textContent = "Trocar";
      btn.setAttribute("aria-label", "Trocar por " + p.name);
      btn.addEventListener("click", () => {
        swapIn = p.id;
        render();
      });
      el.append(btn);
      boxList.append(el);
    });
    if (stagger) {
      Array.from((tab === "party" ? partyList : boxList).children).forEach((el, k) => {
        el.classList.add("enter");
        el.style.setProperty("--i", String(k));
      });
    }
  }

  function renderAccount() {
    const signed = cloud && cloud.signedIn();
    $("account-email").textContent = signed ? cloud.email() || "" : "Modo local";
    $("signout").hidden = !signed;
    $("sync-now").hidden = !signed;
    let status = "";
    if (!cloud || !cloud.configured) status = "A conta ainda não foi configurada. O progresso fica só neste aparelho.";
    else if (!signed) status = "";
    else if (account.error) status = account.error;
    else if (account.offline) status = "Sem conexão. Vai sincronizar quando voltar.";
    else if (account.lastSync) status = "Sincronizado às " + new Date(account.lastSync).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    else status = "Ainda não sincronizado.";
    $("account-status").textContent = status;
    $("build").textContent = "Versão " + (window.PETS_BUILD || "local");
  }

  function render() {
    if (!state || !stage || Game.needsStarter(state) || !state.pet) return;
    $("egg-alert").hidden = !state.eggs.some(e => e.slot !== null && (e.left <= 0 || e.care <= 0));
    const v = view();
    const info = meta[v.species] || { name: v.species, color: "#999999" };
    $("pet-name").textContent = info.name;
    const lvText = "Nv " + v.level;
    if ($("level").textContent !== lvText) {
      const had = $("level").textContent !== "";
      $("level").textContent = lvText;
      if (had) {
        $("level").classList.remove("bump");
        void $("level").offsetWidth;
        $("level").classList.add("bump");
      }
    }
    document.documentElement.style.setProperty("--pet", info.color);
    setBar($("hunger-bar"), $("hunger-val"), v.hunger);
    setBar($("life-bar"), $("life-val"), v.life);
    setBar($("joy-bar"), $("joy-val"), v.joy);
    $("joy-bar").dataset.level = barLevel(v.joy);
    setBar($("xp-bar"), $("xp-val"), (v.xp / v.xpNext) * 100);
    $("hunger-bar").dataset.level = barLevel(v.hunger);
    $("life-bar").dataset.level = barLevel(v.life);
    $("tags").textContent = "";
    [
      [v.hunger <= 25, "Fome"],
      [v.joy <= 25, "Triste"],
      [v.dying, "Morrendo"]
    ].forEach(([on, text]) => {
      if (!on) return;
      const t = document.createElement("span");
      t.className = "warn-tag";
      t.textContent = text;
      $("tags").append(t);
    });
    $("feed").disabled = v.hunger >= 100;
    $("treat").disabled = v.life >= 100;
    $("party-alert").hidden = !v.party.some(p => p.dying || p.hunger <= 25 || p.life <= 25 || p.joy <= 25);
    if (lastPetId !== v.pet + ":" + v.species) {
      lastPetId = v.pet + ":" + v.species;
      stage.setPet(v.species);
    }
    stage.setStatus({ hunger: v.hunger, life: v.life, dying: v.dying });
    if ($("party-sheet").open) renderSheet(v);
    if ($("egg-sheet").open) refreshShop();
    const evo = evolvingNow ? null : evolveTarget();
    $("evolve-btn").hidden = !evo;

    if (evolvingNow) {
      ["feed", "treat", "party-btn"].forEach(b => ($(b).disabled = true));
    } else {
      $("party-btn").disabled = false;
    }
    if ($("account-sheet").open) renderAccount();
  }

  function scheduleSync() {
    if (!cloud || !cloud.signedIn()) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, SYNC_DELAY_MS);
  }

  async function syncNow(opts) {
    const options = opts && typeof opts === "object" && !opts.target ? opts : {};
    if (!cloud || !cloud.signedIn()) return;
    if (syncing) {
      syncAgain = true;
      return;
    }
    syncing = true;
    try {
      const row = await cloud.pull();
      const remote = row ? Game.normalize(row.state, petIds) : null;
      Game.catchUp(state);
      const result = Game.merge(state, remote, Date.now(), { preferRemote: !!options.preferRemote && !!remote });
      state = result.state;
      if (result.push) await cloud.push(state);
      account.offline = false;
      account.error = "";
      account.lastSync = Date.now();
      firstSyncDone = true;
    } catch (err) {
      if (err.auth) {
        await cloud.signOut().catch(() => null);
        enterAuth("Sua sessão expirou. Entre de novo.");
      } else {
        account.offline = !!err.offline;
        account.error = err.offline ? "" : err.message;
      }
    } finally {
      syncing = false;
      saveState();
      if ($("auth-view").hidden) route();
      if (!firstSyncDone && cloud.signedIn()) setTimeout(() => syncNow(), 5000);
      if (syncAgain) {
        syncAgain = false;
        scheduleSync();
      }
    }
  }

  function enterAuth(message) {
    clearTimeout(syncTimer);
    $("password").value = "";
    setAuthMsg(message || "", message ? "error" : "");
    showView("auth");
  }

  function setAuthMsg(text, kind) {
    const el = $("auth-msg");
    el.textContent = text;
    el.className = "msg" + (kind ? " " + kind : "");
  }

  function setAuthBusy(busy) {
    $("signin").disabled = busy;
    $("signup").disabled = busy;
  }

  async function submitAuth(mode) {
    const email = $("email").value.trim();
    const password = $("password").value;
    if (!email || !password) {
      setAuthMsg("Informe e-mail e senha.", "error");
      return;
    }
    setAuthBusy(true);
    setAuthMsg(mode === "signup" ? "Criando conta..." : "Entrando...", "");
    try {
      if (mode === "signup") {
        const r = await cloud.signUp(email, password);
        if (r.confirm) {
          setAuthMsg("Conta criada. Confirme pelo e-mail e depois entre.", "ok");
          return;
        }
      } else {
        await cloud.signIn(email, password);
      }
      $("password").value = "";
      firstSyncDone = false;
      route();
      await syncNow({ preferRemote: true });
    } catch (err) {
      setAuthMsg(err.offline ? "Sem conexão com a internet." : err.message, "error");
    } finally {
      setAuthBusy(false);
    }
  }

  function bindUi() {
    $("auth-form").addEventListener("submit", e => {
      e.preventDefault();
      submitAuth("signin");
    });
    $("signup").addEventListener("click", () => submitAuth("signup"));

    $("feed").addEventListener("click", () => {
      const r = Game.feed(state);
      if (!r.changed) return;
      saveState();
      stage.play("eat", true);
      if (r.levels > 0) {
        stage.play("jump", true);
        showToast("Subiu para o nível " + r.level + "!");
      }
      scheduleSync();
      render();
    });

    $("treat").addEventListener("click", () => {
      const r = Game.treat(state);
      if (!r.changed) return;
      saveState();
      scheduleSync();
      render();
    });

    $("party-btn").addEventListener("click", () => {
      tab = "party";
      swapIn = null;
      animateList = true;
      $("party-sheet").showModal();
      render();
    });

    $("tab-party").addEventListener("click", () => {
      tab = "party";
      swapIn = null;
      animateList = true;
      render();
    });
    $("tab-box").addEventListener("click", () => {
      tab = "box";
      swapIn = null;
      animateList = true;
      render();
    });

    $("starter-go").addEventListener("click", chooseStarter);
    $("evolve-btn").addEventListener("click", checkEvolution);
    $("starter-start").addEventListener("click", () => {
      $("starter-done").hidden = true;
      if (starterStage) starterStage.stop();
      showView("game");
      lastPetId = null;
      render();
    });
    dragSpin($("starter-wrap"), () => starterStage, () => {
      if (!starterEgg) return;
      const id = starterEgg;
      tapEgg(starterStage, $("starter-wrap"), id, () => {
        starterEgg = null;
        $("starter-hello").textContent = "Nasceu o seu " + meta[id].name + "!";
        $("starter-done").hidden = false;
      });
    });
    dragSpin($("egg-wrap"), () => eggStage, tapIncubatorEgg);
    $("egg-btn").addEventListener("click", openEggs);
    $("egg-sheet").addEventListener("close", () => {
      clearInterval(eggTicker);
      if (eggStage) eggStage.stop();
      revealing = false;
    });
    [["inc", "tab-inc"], ["inv", "tab-inv"], ["shop", "tab-shop"]].forEach(([k, id]) => {
      $(id).addEventListener("click", () => {
        eggTab = k;
        renderEggs();
      });
    });
    ["clean", "play"].forEach(kind => {
      $("egg-" + kind).addEventListener("click", () => {
        const e = slotEgg(eggSlot);
        if (!e) return;
        const r = Game.careEgg(state, e.id, kind);
        if (!r.changed) return;
        saveState();
        scheduleSync();
        if (eggStage) eggStage.eggDo(kind);
        tickEggs();
        render();
      });
    });
    $("buy-egg").addEventListener("click", () => {
      const r = Game.buyEgg(state, baseIds());
      if (!r.changed) {
        renderEggs();
        return;
      }
      saveState();
      scheduleSync();
      showToast("Ovo comprado! Ele está no inventário.");
      eggTab = "inv";
      renderEggs();
    });

    $("dex-btn").addEventListener("click", () => {
      closeDexDetail();
      renderDex();
      $("dex-sheet").showModal();
    });
    $("dex-back").addEventListener("click", closeDexDetail);
    $("dex-sheet").addEventListener("close", () => {
      if (preview) preview.stop();
    });
    const pv = $("dex-preview");
    let pvDown = false;
    let pvX = 0;
    let pvY = 0;
    pv.addEventListener("pointerdown", e => {
      if (!preview) return;
      pvDown = true;
      pvX = e.clientX;
      pvY = e.clientY;
      try {
        pv.setPointerCapture(e.pointerId);
      } catch (_) {
        pvDown = true;
      }
      preview.spin.begin();
    });
    pv.addEventListener("pointermove", e => {
      if (!pvDown || !preview) return;
      preview.spin.drag(e.clientX - pvX, e.clientY - pvY);
      pvX = e.clientX;
      pvY = e.clientY;
    });
    const pvUp = () => {
      if (pvDown && preview) preview.spin.end();
      pvDown = false;
    };
    pv.addEventListener("pointerup", pvUp);
    pv.addEventListener("pointercancel", pvUp);

    $("account-btn").addEventListener("click", () => {
      $("account-sheet").showModal();
      renderAccount();
    });

    $("sync-now").addEventListener("click", () => syncNow({ preferRemote: false }));

    const dl = desktopDownload();
    if (dl) {
      $("desk-dl-link").href = dl.url;
      $("desk-dl-link").textContent = dl.label;
      $("desk-dl-link").hidden = false;
    }

    $("signout").addEventListener("click", async () => {
      $("account-sheet").close();
      await cloud.signOut().catch(() => null);
      account = { offline: false, error: "", lastSync: 0 };
      firstSyncDone = false;
      enterAuth("");
    });

    document.querySelectorAll("dialog").forEach(d => {
      d.addEventListener("click", e => {
        if (e.target === d) d.close();
      });
      d.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => d.close()));
    });

    const wrap = $("stage-wrap");
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;
    let down = false;
    let rotating = false;
    wrap.addEventListener("pointerdown", e => {
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      down = true;
      rotating = false;
    });
    wrap.addEventListener("pointermove", e => {
      if (down) {
        if (!rotating && Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) >= 10) {
          rotating = true;
          try {
            wrap.setPointerCapture(e.pointerId);
          } catch (_) {
            rotating = true;
          }
          stage.spin.begin();
        }
        if (rotating) {
          stage.spin.drag(e.clientX - lastX, e.clientY - lastY);
          lastX = e.clientX;
          lastY = e.clientY;
          return;
        }
      }
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const y = -(e.clientY - (r.top + r.height * 0.45)) / (r.height / 2);
      stage.setPointer(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    });
    const releaseSpin = () => {
      down = false;
      if (rotating) stage.spin.end();
      rotating = false;
    };
    wrap.addEventListener("pointerup", e => {
      const wasRotating = rotating;
      releaseSpin();
      if (!wasRotating && Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) < 10 && stage.interact()) {
        const r = Game.play(state);
        if (r.changed) {
          saveState();
          scheduleSync();
          render();
        }
      }
    });
    wrap.addEventListener("pointercancel", releaseSpin);

    window.addEventListener("resize", () => {
      stage.resize();
      [starterStage, eggStage, preview].forEach(st => st && st.resize());
    });
    window.addEventListener("orientationchange", () => setTimeout(() => stage.resize(), 200));

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      Game.catchUp(state);
      saveState();
      render();
      syncNow();
    });
    window.addEventListener("online", () => syncNow());

    window.addEventListener("beforeinstallprompt", e => {
      e.preventDefault();
      installEvent = e;
      $("install").hidden = false;
    });
    $("install").addEventListener("click", async () => {
      if (!installEvent) return;
      installEvent.prompt();
      await installEvent.userChoice.catch(() => null);
      installEvent = null;
      $("install").hidden = true;
    });
    window.addEventListener("appinstalled", () => {
      $("install").hidden = true;
      $("install-hint").hidden = true;
    });

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (ios && !standalone) {
      $("install-hint").textContent = "Para instalar no iPhone: toque em Compartilhar e depois em Adicionar à Tela de Início.";
      $("install-hint").hidden = false;
    }
  }

  async function boot() {
    try {
      try {
        await loadScript(THREE_LOCAL);
      } catch (err) {
        await loadScript(THREE_CDN);
      }
      if (!window.THREE) throw new Error("three");
      await loadScript("lib/game.js");
      await loadScript("lib/cloud.js");
      await loadScript("lib/types.js");
      await loadScript("lib/pet-kit.js");
      await loadScript("lib/egg.js");
      await loadScript("lib/stage.js");
      await loadScript("pets-list.js");
      for (const f of window.PET_FILES || []) await loadScriptSafe(f);
    } catch (err) {
      $("loading-text").textContent = "Não foi possível carregar o app. Verifique a conexão e recarregue.";
      return;
    }

    window.Pets.list.forEach(p => {
      meta[p.id] = { id: p.id, dex: p.dex || 999, name: p.name, color: p.color, types: p.types, description: p.description || "", evolvesTo: p.evolvesTo || null, evolveLevel: p.evolveLevel || 0 };
    });
    petIds = window.Pets.list.map(p => p.id).sort();

    state = Game.normalize(store.read(STATE_KEY), petIds);
    Game.catchUp(state);
    saveState();

    cloud = PetsCloud.create({
      url: cfg.supabaseUrl,
      anonKey: cfg.supabaseAnonKey,
      store: {
        get: () => store.read(SESSION_KEY),
        set: v => store.write(SESSION_KEY, v)
      },
      fetch: window.fetch.bind(window)
    });

    stage = PetStage.create({
      canvas: $("stage"),
      THREE: window.THREE,
      kit: window.PetKit,
      Pets: window.Pets,
      reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
    });

    bindUi();

    setInterval(() => {
      if (!state) return;
      Game.catchUp(state);
      saveState();
      render();
    }, Game.C.TICK_MS);
    setInterval(() => syncNow(), SYNC_EVERY_MS);

    if (cloud.configured && !cloud.signedIn()) {
      enterAuth("");
      return;
    }
    route();
    if (cloud.signedIn()) syncNow();
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => null);
    });
  }

  boot();
})();
