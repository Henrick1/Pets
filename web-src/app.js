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
  let shopTab = "items";
  let expTicker = 0;
  let dailyShown = "";
  let expPick = null;
  let shownCoins = null;
  let coinAnim = 0;
  let bagNew = 0;
  const bought = {};
  const expDraft = { curta: [], media: [], longa: [] };

  const ITEM_ICONS = {
    fruta: '<circle cx="12" cy="14" r="7" fill="#e5484d"/><path d="M12 7c0-2 1-3 3-4" stroke="#6b4423" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M13 6c2-1 4 0 5 1-2 1-4 1-5-1z" fill="#4caf50"/>',
    doce: '<path d="M3 9l4 3-4 3zM21 9l-4 3 4 3z" fill="#f48fb1"/><circle cx="12" cy="12" r="5.5" fill="#ec407a"/><path d="M9 10c2 1 4 3 6 4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
    petisco: '<path d="M6 8a2.5 2.5 0 1 1 3-3l6 6a2.5 2.5 0 1 1 3 3 2.5 2.5 0 1 1-3 3l-6-6a2.5 2.5 0 1 1-3-3z" fill="#d7a86e"/>',
    peixe: '<path d="M3 12c3-5 10-6 14 0-4 6-11 5-14 0z" fill="#4fa3e0"/><path d="M17 12l4-4v8z" fill="#3a86c0"/><circle cx="8" cy="11" r="1.2" fill="#123"/>',
    pocao: '<path d="M10 3h4v4l3 5a5 5 0 1 1-10 0l3-5z" fill="#f06363"/><rect x="9.5" y="2" width="5" height="2" rx="1" fill="#8d6e63"/>',
    "pocao-grande": '<path d="M9 2h6v4l4 6a7 7 0 1 1-14 0l4-6z" fill="#d32f2f"/><rect x="8.5" y="1" width="7" height="2.4" rx="1" fill="#8d6e63"/><path d="M9 14h6M12 11v6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    reviver: '<path d="M12 2l2.6 6.3 6.4.4-5 4.2 1.7 6.6L12 16l-5.7 3.5L8 12.9 3 8.7l6.4-.4z" fill="#ffca28"/><path d="M12 8v6M9 11h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
    dourada: '<circle cx="12" cy="14" r="7" fill="#f6c343"/><circle cx="9.5" cy="11.5" r="1.8" fill="#fff6c8"/><path d="M12 7c0-2 1-3 3-4" stroke="#6b4423" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M13 6c2-1 4 0 5 1-2 1-4 1-5-1z" fill="#4caf50"/>',
    cristal: '<path d="M12 2l6 7-6 13-6-13z" fill="#9c7cf4"/><path d="M6 9h12M12 2l-2 7 2 13 2-13z" stroke="#e6dcff" stroke-width="1" fill="none"/>'
  };

  const EXP_LABEL = { curta: "30 min", media: "2 h", longa: "8 h" };
  const EXP_NAME = { curta: "Expedição curta", media: "Expedição média", longa: "Expedição longa" };

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
    const thumbQueue = [];
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
      sw.className = "dex-art";
      sw.textContent = known ? "" : "?";
      const info = document.createElement("span");
      info.className = "dex-card-info";
      const name = document.createElement("span");
      name.className = "dex-card-name";
      name.textContent = known ? m.name : "???";
      const num = document.createElement("span");
      num.className = "dex-card-num";
      num.textContent = dexNum(id);
      info.append(num, name);
      card.append(sw, info);
      if (known) {
        card.addEventListener("click", () => openDexDetail(id));
        thumbQueue.push([sw, id]);
      }
      list.append(card);
    });
    const step = () => {
      const job = thumbQueue.shift();
      if (!job) return;
      const [dot, sp] = job;
      const url = window.PetStage && window.THREE ? PetStage.thumbnail(window.THREE, window.PetKit, window.Pets, sp, 256, true) : null;
      if (url && dot.isConnected) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        img.addEventListener("load", () => dot.classList.add("loaded"), { once: true });
        dot.append(img);
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
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
      const pre = petIds.find(o => nextForms(o).includes(first));
      if (!pre || seen.has(pre)) break;
      seen.add(pre);
      first = pre;
    }
    const stages = [[{ sp: first, from: null }]];
    const used = new Set([first]);
    while (stages.length < 6) {
      const nx = [];
      stages[stages.length - 1].forEach(({ sp }) => {
        nextForms(sp).forEach(c => {
          if (used.has(c)) return;
          used.add(c);
          nx.push({ sp: c, from: sp });
        });
      });
      if (!nx.length) break;
      stages.push(nx);
    }
    $("dex-evo").hidden = stages.length < 2;
    const box = $("dex-evo-chain");
    box.replaceChildren();
    if (stages.length < 2) return;
    let n = 0;
    stages.forEach((items, si) => {
      const col = document.createElement("div");
      col.className = "evo-stage";
      items.forEach(({ sp, from }) => {
        const step = document.createElement("div");
        step.className = "evo-step";
        if (from) {
          const arrow = document.createElement("span");
          arrow.className = "evo-arrow";
          arrow.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
          const lv = document.createElement("span");
          lv.className = "evo-lv";
          const pm = meta[from];
          let txt = pm.evolveLevel ? "Nv " + pm.evolveLevel : "";
          lv.textContent = txt;
          arrow.append(lv);
          step.append(arrow);
        }
        const known = owned.has(sp);
        const node = document.createElement("button");
        node.type = "button";
        node.className = "evo-node" + (sp === id ? " current" : "") + (known ? "" : " unknown");
        node.style.setProperty("--c", meta[sp].color);
        node.style.setProperty("--i", String(n++));
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
        step.append(node);
        col.append(step);
      });
      box.append(col);
      if (si === 0) col.classList.add("first");
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
    return petIds.filter(id => !petIds.some(o => nextForms(o).includes(id)));
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
    maybeDaily();
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
    if (sec >= 3600) return Math.floor(sec / 3600) + ":" + String(Math.floor((sec % 3600) / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
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
    [["inc", "egg-incubator"], ["inv", "egg-inventory"]].forEach(([k, pane]) => {
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
      : "Nenhum ovo guardado. Compre ovos na loja da mochila.";
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

  function nextForms(id) {
    const m = meta[id];
    if (!m) return [];
    const list = m.evolveBranches ? [m.evolveBranches.happy, m.evolveBranches.sad] : [m.evolvesTo];
    return list.filter(x => x && meta[x]);
  }

  function evolveTarget() {
    if (!state || !state.pet) return null;
    const m = meta[Game.speciesOf(state)];
    const target = Game.evolveTarget(m, state);
    if (!target || !meta[target] || !m.evolveLevel) return null;
    return Game.canEvolve(state, state.pet, target, m.evolveLevel) ? target : null;
  }

  function checkEvolution() {
    if (evolvingNow || !state || !stage || !state.pet || $("game-view").hidden) return;
    const id = state.pet;
    const m = meta[Game.speciesOf(state)];
    const target = evolveTarget();
    if (!target) return;
    $("evolve-btn").hidden = true;
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

  function itemIcon(id) {
    const el = document.createElement("span");
    el.className = "item-ico";
    el.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">' + (ITEM_ICONS[id] || "") + "</svg>";
    return el;
  }

  function itemEffect(it) {
    const parts = [];
    if (it.revive) parts.push("Tira do estado Morrendo");
    if (it.hunger) parts.push(it.hunger >= 100 ? "Fome cheia" : "+" + it.hunger + " fome");
    if (it.life && !it.revive) parts.push(it.life >= 100 ? "Vida cheia" : "+" + it.life + " vida");
    if (it.joy) parts.push(it.joy >= 100 ? "Felicidade cheia" : "+" + it.joy + " felicidade");
    if (it.xp) parts.push("+" + it.xp + " XP");
    if (!parts.length && it.sell) parts.push("Vale " + it.sell + " moedas");
    return parts.join(" · ");
  }

  function itemRow(id, it, extra) {
    const el = document.createElement("div");
    el.className = "item";
    const info = document.createElement("span");
    info.className = "info";
    const line = document.createElement("span");
    line.className = "name-line";
    const name = document.createElement("span");
    name.textContent = it.name;
    line.append(name);
    if (extra) {
      const c = document.createElement("span");
      c.className = "lv";
      c.textContent = extra;
      line.append(c);
    }
    const eff = document.createElement("span");
    eff.className = "lv";
    eff.textContent = itemEffect(it);
    info.append(line, eff);
    el.append(itemIcon(id), info);
    return el;
  }

  function lootText(r) {
    const parts = [r.coins + " moedas"];
    Object.keys(r.items || {}).forEach(k => parts.push(Game.ITEMS[k].name + (r.items[k] > 1 ? " x" + r.items[k] : "")));
    return parts.join(", ");
  }

  function buzz(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (err) {}
  }

  function setBagCoins(value, animate) {
    const el = $("bag-coins");
    if (!el.firstChild || el.firstChild.nodeType !== 3) el.prepend(document.createTextNode(""));
    const txt = el.firstChild;
    cancelAnimationFrame(coinAnim);
    if (!animate || shownCoins === null || shownCoins === value) {
      shownCoins = value;
      txt.nodeValue = value + " moedas";
      return;
    }
    const from = shownCoins;
    const t0 = performance.now();
    const step = now => {
      const k = Math.max(0, Math.min(1, (now - t0) / 650));
      const e = 1 - Math.pow(1 - k, 3);
      shownCoins = Math.round(from + (value - from) * e);
      txt.nodeValue = shownCoins + " moedas";
      if (k < 1) coinAnim = requestAnimationFrame(step);
      else coinAnim = 0;
    };
    coinAnim = requestAnimationFrame(step);
    el.classList.remove("spend");
    void el.offsetWidth;
    el.classList.add("spend");
    const d = document.createElement("span");
    d.className = "coin-delta";
    d.textContent = (value < from ? "-" : "+") + Math.abs(value - from);
    el.append(d);
    setTimeout(() => d.remove(), 1000);
  }

  function relRect(host, el) {
    const r = el.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    return { x: r.left - h.left - host.clientLeft + host.scrollLeft, y: r.top - h.top - host.clientTop + host.scrollTop, w: r.width, h: r.height };
  }

  function flyTo(node, fromEl, toEl, onDone) {
    const host = fromEl.closest("dialog") || document.body;
    const a = relRect(host, fromEl);
    const b = relRect(host, toEl);
    node.classList.add("fly");
    host.append(node);
    const nw = node.offsetWidth || 30;
    const nh = node.offsetHeight || 30;
    const x0 = a.x + a.w / 2 - nw / 2;
    const y0 = a.y + a.h / 2 - nh / 2;
    const x1 = b.x + b.w / 2 - nw / 2;
    const y1 = b.y + b.h / 2 - nh / 2;
    const lift = Math.min(y0, y1) - 70;
    node.style.left = "0px";
    node.style.top = "0px";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !node.animate) {
      node.remove();
      if (onDone) onDone();
      return;
    }
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const k = i / 12;
      const x = x0 + (x1 - x0) * k;
      const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * lift + k * k * y1;
      const sc = i === 0 ? 0.6 : 1.25 - k * 0.7;
      pts.push({ transform: "translate(" + x + "px," + y + "px) scale(" + sc + ")", opacity: k > 0.9 ? 0.3 : 1 });
    }
    const an = node.animate(pts, { duration: 700, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" });
    let finished = false;
    const fin = () => {
      if (finished) return;
      finished = true;
      node.remove();
      toEl.classList.remove("got");
      void toEl.offsetWidth;
      toEl.classList.add("got");
      if (onDone) onDone();
    };
    an.onfinish = fin;
    setTimeout(fin, 800);
  }

  function sparkle(host, el, color) {
    const r = relRect(host, el);
    for (let i = 0; i < 12; i++) {
      const p = document.createElement("span");
      p.className = "spark";
      p.style.left = r.x + r.w / 2 + "px";
      p.style.top = r.y + r.h / 2 + "px";
      p.style.background = color || "var(--warn)";
      const a = (i / 12) * Math.PI * 2;
      const d = 40 + (i % 3) * 18;
      p.style.setProperty("--dx", Math.cos(a) * d + "px");
      p.style.setProperty("--dy", Math.sin(a) * d + "px");
      host.append(p);
      setTimeout(() => p.remove(), 800);
    }
  }

  function showBagNew() {
    ["bag-new", "menu-bag-new"].forEach(id => {
      const el = $(id);
      el.textContent = "+" + bagNew;
      el.hidden = bagNew <= 0;
      el.classList.remove("got");
      void el.offsetWidth;
      el.classList.add("got");
    });
  }

  function openShop(t) {
    shopTab = t || "items";
    shownCoins = null;
    if ($("bag-sheet").open) $("bag-sheet").close();
    renderShop();
    $("shop-sheet").showModal();
  }

  function openBag() {
    bagNew = 0;
    showBagNew();
    if ($("shop-sheet").open) $("shop-sheet").close();
    renderBag();
    $("bag-sheet").showModal();
  }

  function renderShop() {
    Game.catchUp(state);
    if (!coinAnim || shownCoins === state.coins) setBagCoins(state.coins, false);
    $("tab-store").setAttribute("aria-selected", String(shopTab === "items"));
    $("tab-eggstore").setAttribute("aria-selected", String(shopTab === "eggs"));
    $("store-list").hidden = shopTab !== "items";
    $("store-hint").hidden = shopTab !== "items";
    $("egg-store").hidden = shopTab !== "eggs";
    const pool = Game.eggPool(state, baseIds());
    const eggDone = bought.egg && bought.egg > Date.now();
    $("buy-egg").disabled = !eggDone && (state.coins < Game.C.EGG_PRICE || !pool.length);
    $("buy-egg").textContent = eggDone ? "Comprado!" : "Comprar por " + Game.C.EGG_PRICE + " moedas";
    $("buy-egg").classList.toggle("bought", !!eggDone);
    const waiting = state.eggs.filter(e => e.slot === null).length;
    $("egg-owned").textContent = waiting ? (waiting === 1 ? "1 ovo esperando no inventário" : waiting + " ovos esperando no inventário") : "";
    $("shop-hint").textContent = !pool.length
      ? "Nenhuma criatura disponível nos ovos."
      : state.coins < Game.C.EGG_PRICE
        ? "Moedas insuficientes. Cuide do grupo, pegue o presente do dia e faça expedições para ganhar mais."
        : "O ovo vai para o inventário de ovos.";
    $("store-hint").textContent = "O que você compra vai para a mochila. Seu grupo rende moedas toda hora enquanto está alimentado e feliz.";
    const store = $("store-list");
    store.replaceChildren();
    Object.keys(Game.ITEMS).filter(k => Game.ITEMS[k].price).forEach(k => {
      const it = Game.ITEMS[k];
      const el = itemRow(k, it, state.inventory[k] ? "tem " + state.inventory[k] : "");
      const buy = document.createElement("button");
      buy.type = "button";
      buy.className = "btn primary small";
      const done = bought[k] && bought[k] > Date.now();
      buy.textContent = done ? "Comprado!" : it.price + " moedas";
      buy.classList.toggle("bought", !!done);
      buy.setAttribute("aria-label", "Comprar " + it.name + " por " + it.price + " moedas");
      buy.disabled = state.coins < it.price;
      buy.addEventListener("click", () => {
        const before = state.coins;
        const r = Game.buyItem(state, k);
        if (!r.changed) return;
        saveState();
        scheduleSync();
        buzz(18);
        shownCoins = before;
        setBagCoins(state.coins, true);
        bought[k] = Date.now() + 900;
        setTimeout(() => $("shop-sheet").open && renderShop(), 950);
        flyTo(itemIcon(k), el.querySelector(".item-ico"), $("shop-bag"), () => {
          bagNew += 1;
          showBagNew();
        });
        renderShop();
        render();
      });
      el.append(buy);
      store.append(el);
    });
  }

  function renderBag() {
    Game.catchUp(state);
    const petName = state.pet ? (meta[Game.speciesOf(state)] || {}).name || "" : "";
    const bag = $("bag-list");
    bag.replaceChildren();
    const have = Object.keys(Game.ITEMS).filter(k => state.inventory[k] > 0);
    $("bag-to-shop").hidden = have.length > 0;
    $("bag-hint").textContent = have.length
      ? "Os itens são usados em " + petName + ". Para usar em outro, troque de bichinho no Grupo."
      : "A mochila está vazia. Compre itens na loja ou mande bichinhos em expedições.";
    have.forEach(k => {
      const it = Game.ITEMS[k];
      const el = itemRow(k, it, "x" + state.inventory[k]);
      const box = document.createElement("span");
      box.className = "row-btns";
      if (it.hunger || it.life || it.joy || it.xp || it.revive) {
        const use = document.createElement("button");
        use.type = "button";
        use.className = "btn primary small";
        use.textContent = "Usar";
        use.disabled = !Game.canUseItem(state, k, state.pet);
        use.addEventListener("click", () => useItem(k));
        box.append(use);
      }
      if (it.sell) {
        const sell = document.createElement("button");
        sell.type = "button";
        sell.className = "btn soft small";
        sell.textContent = "Vender " + it.sell;
        sell.setAttribute("aria-label", "Vender por " + it.sell + " moedas");
        sell.addEventListener("click", () => {
          const r = Game.sellItem(state, k);
          if (!r.changed) return;
          saveState();
          scheduleSync();
          showToast("+" + r.coins + " moedas");
          renderBag();
          render();
        });
        box.append(sell);
      }
      el.append(box);
      bag.append(el);
    });
  }

  function useItem(k) {
    const r = Game.useItem(state, k, state.pet);
    if (!r.changed) return;
    saveState();
    scheduleSync();
    const it = Game.ITEMS[k];
    if (it.hunger) stage.play("eat", true);
    if (r.levels > 0) {
      stage.play("jump", true);
      showToast("Subiu para o nível " + r.level + "!");
    } else {
      showToast(it.name + " usado");
    }
    renderBag();
    render();
  }

  function expTypes(id) {
    return (meta[Game.speciesOf(state, id)] || {}).types || [];
  }

  function expChip(p) {
    const c = document.createElement("span");
    c.className = "exp-chip";
    const d = document.createElement("span");
    d.className = "exp-chip-art";
    d.style.setProperty("--c", p.color);
    const sp = Game.speciesOf(state, p.id);
    const url = window.PetStage && window.THREE ? PetStage.thumbnail(window.THREE, window.PetKit, window.Pets, sp, 256, true) : null;
    if (url) {
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      d.append(img);
    }
    const n = document.createElement("span");
    n.className = "exp-chip-name";
    n.textContent = p.name;
    c.append(d, n);
    return c;
  }

  function renderExpPicker(v) {
    const list = $("exp-list");
    const kind = expPick;
    const draft = expDraft[kind];
    const title = document.createElement("p");
    title.className = "picker-title";
    list.append(title);
    const arts = [];
    const rows = [];
    let done;
    const sync = () => {
      title.textContent = EXP_NAME[kind] + " · " + draft.length + "/" + Game.C.EXPEDITION_SIZE;
      rows.forEach(([el, p]) => {
        const on = draft.includes(p.id);
        el.setAttribute("aria-pressed", String(on));
        el.disabled = !on && (!!p.away || p.dying || draft.length >= Game.C.EXPEDITION_SIZE);
      });
      done.textContent = "Pronto" + (draft.length ? " (" + draft.length + "/" + Game.C.EXPEDITION_SIZE + ")" : "");
    };
    v.party.concat(v.box).forEach(p => {
      const el = itemNode(p, "button");
      el.type = "button";
      el.classList.add("pick-item");
      const art = document.createElement("span");
      art.className = "pick-art";
      art.style.setProperty("--c", p.color);
      el.querySelector(".dot").replaceWith(art);
      arts.push([art, Game.speciesOf(state, p.id)]);
      rows.push([el, p]);
      el.addEventListener("click", () => {
        const at = draft.indexOf(p.id);
        if (at >= 0) draft.splice(at, 1);
        else if (draft.length < Game.C.EXPEDITION_SIZE) draft.push(p.id);
        sync();
      });
      list.append(el);
    });
    const foot = document.createElement("div");
    foot.className = "pick-foot";
    done = document.createElement("button");
    done.type = "button";
    done.className = "btn primary";
    done.addEventListener("click", () => {
      expPick = null;
      render();
    });
    foot.append(done);
    list.append(foot);
    sync();
    const step = () => {
      const job = arts.shift();
      if (!job) return;
      const [art, sp] = job;
      const url = art.isConnected && window.PetStage && window.THREE ? PetStage.thumbnail(window.THREE, window.PetKit, window.Pets, sp, 256, true) : null;
      if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        art.append(img);
      }
      if (art.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function renderExp(v) {
    const list = $("exp-list");
    list.replaceChildren();
    const rows = {};
    v.party.concat(v.box).forEach(p => (rows[p.id] = p));
    Object.keys(expDraft).forEach(k => {
      expDraft[k] = expDraft[k].filter(id => rows[id] && !rows[id].away && !rows[id].dying);
    });
    if (expPick) {
      renderExpPicker(v);
      return;
    }
    const now = Date.now();
    Object.keys(Game.C.EXPEDITIONS).forEach(kind => {
      const run = state.expeditions.find(x => x.kind === kind);
      const card = document.createElement("div");
      card.className = "exp-card";
      const head = document.createElement("div");
      head.className = "exp-head";
      const name = document.createElement("span");
      name.className = "exp-name";
      name.textContent = EXP_NAME[kind];
      const dur = document.createElement("span");
      dur.className = "lv";
      dur.textContent = EXP_LABEL[kind];
      head.append(name, dur);
      card.append(head);
      const slots = document.createElement("div");
      slots.className = "exp-slots";
      if (run) {
        run.pets.forEach(id => rows[id] && slots.append(expChip(rows[id])));
        card.append(slots);
        if (run.endsAt > now) {
          const t = document.createElement("span");
          t.className = "exp-time";
          t.dataset.ends = String(run.endsAt);
          t.textContent = "Volta em " + fmtTime(run.endsAt - now);
          card.append(t);
        } else {
          const c = document.createElement("button");
          c.type = "button";
          c.className = "btn primary";
          c.textContent = "Receber";
          c.addEventListener("click", () => {
            const r = Game.collectExpedition(state, kind, expTypes);
            if (!r.changed) return;
            saveState();
            scheduleSync();
            const ups = r.levels.map(l => (rows[l.id] ? rows[l.id].name : "") + " subiu para o nível " + l.level + "!");
            const names = r.pets.map(id => (rows[id] ? rows[id].name : "")).filter(Boolean);
            if (window.PetChest) {
              window.PetChest.open({
                host: $("party-sheet"),
                title: EXP_NAME[kind] + " voltou!",
                subtitle: names.join(", "),
                coins: r.coins,
                items: Object.keys(r.items || {}).map(k => ({
                  html: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' + (ITEM_ICONS[k] || "") + "</svg>",
                  name: Game.ITEMS[k].name,
                  count: r.items[k]
                })),
                notes: (r.effects || []).map(fx => (rows[fx.id] ? rows[fx.id].name + ": " : "") + Game.effectText(fx)).concat(ups),
                onOpen: () => buzz([20, 40, 30])
              });
            } else {
              showToast("Voltaram com " + lootText(r) + (ups.length ? ". " + ups.join(" ") : ""));
            }
            render();
          });
          card.append(c);
        }
      } else {
        const draft = expDraft[kind];
        for (let i = 0; i < Game.C.EXPEDITION_SIZE; i++) {
          const p = rows[draft[i]];
          const b = document.createElement("button");
          b.type = "button";
          b.className = "exp-slot" + (p ? "" : " empty");
          if (p) {
            b.append(expChip(p));
            b.setAttribute("aria-label", "Tirar " + p.name);
            b.addEventListener("click", () => {
              draft.splice(i, 1);
              render();
            });
          } else {
            b.textContent = "+";
            b.setAttribute("aria-label", "Escolher criatura");
            b.addEventListener("click", () => {
              expPick = kind;
              animateList = true;
              render();
            });
          }
          slots.append(b);
        }
        card.append(slots);
        const go = document.createElement("button");
        go.type = "button";
        go.className = "btn primary";
        go.textContent = "Partir";
        go.disabled = !draft.length;
        go.addEventListener("click", () => {
          const r = Game.startExpedition(state, kind, draft.slice());
          if (!r.changed) {
            showToast(r.reason === "home" ? "Deixe pelo menos um do grupo em casa." : "Não deu para partir.");
            return;
          }
          expDraft[kind] = [];
          saveState();
          scheduleSync();
          showToast(EXP_NAME[kind] + " partiu");
          render();
        });
        card.append(go);
      }
      list.append(card);
    });
  }

  function tickExp() {
    if (!$("party-sheet").open || tab !== "exp") return;
    const now = Date.now();
    let done = false;
    document.querySelectorAll("#exp-list [data-ends]").forEach(t => {
      const left = Number(t.dataset.ends) - now;
      if (left <= 0) done = true;
      else t.textContent = "Volta em " + fmtTime(left);
    });
    if (done) render();
  }

  function maybeDaily() {
    if (!state || Game.needsStarter(state) || $("game-view").hidden) return;
    if (cloud && cloud.signedIn() && !firstSyncDone) return;
    if (document.querySelector("dialog[open]")) return;
    const d = Game.dailyStatus(state);
    const key = new Date().toDateString();
    if (!d.available || dailyShown === key) return;
    dailyShown = key;
    const days = $("daily-days");
    days.replaceChildren();
    Game.C.DAILY_REWARDS.forEach((c, i) => {
      const el = document.createElement("span");
      el.className = "daily-day" + (i + 1 < d.step ? " done" : i + 1 === d.step ? " today" : "") + (i === Game.C.DAILY_REWARDS.length - 1 ? " big" : "");
      const n = document.createElement("span");
      n.className = "daily-n";
      n.textContent = "Dia " + (i + 1);
      const v = document.createElement("span");
      v.className = "daily-v";
      v.textContent = String(c);
      el.append(n, v);
      days.append(el);
    });
    $("daily-hint").textContent =
      d.streak > 1
        ? d.streak + " dias seguidos! Hoje: " + d.coins + " moedas" + (d.item ? " e uma " + Game.ITEMS[d.item].name : "") + "."
        : "Volte todo dia para ganhar mais. Se faltar um dia, recomeça do dia 1.";
    $("daily-claim").textContent = "Pegar " + d.coins + " moedas";
    $("daily-sheet").showModal();
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

  let healUntil = 0;
  let healTicker = null;
  function tickHeal() {
    const box = $("heal-timer");
    const left = healUntil - Date.now();
    if (left <= 0) {
      box.hidden = true;
      clearInterval(healTicker);
      healTicker = null;
      return;
    }
    box.hidden = false;
    const total = Game.C.TREAT_HEAL_MIN * 60000;
    $("heal-ring").style.strokeDashoffset = String(100 - Math.max(0, Math.min(100, (left / total) * 100)));
    const m = Math.ceil(left / 60000);
    box.setAttribute("aria-label", "Em tratamento, faltam " + (m >= 60 ? Math.floor(m / 60) + " h " + (m % 60) + " min" : m + " min"));
    box.title = box.getAttribute("aria-label");
    if (!healTicker) healTicker = setInterval(tickHeal, 5000);
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
      [p.dying, "Morrendo"],
      [!!p.away, p.away && p.away.endsAt <= Date.now() ? "Voltou" : "Explorando", "away-tag"]
    ].forEach(([on, text, cls]) => {
      if (!on) return;
      const warn = document.createElement("span");
      warn.className = cls || "warn-tag";
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
    const expLocked = state.owned.length < 2 && !state.expeditions.length;
    $("tab-exp").disabled = expLocked;
    $("exp-lock").hidden = !expLocked;
    $("tab-exp").title = expLocked ? "Precisa de pelo menos 2 criaturas" : "";
    if (expLocked && tab === "exp") tab = "party";
    $("tab-party").setAttribute("aria-selected", String(tab === "party"));
    $("tab-box").setAttribute("aria-selected", String(tab === "box"));
    $("tab-exp").setAttribute("aria-selected", String(tab === "exp"));
    partyList.hidden = tab !== "party";
    boxList.hidden = tab !== "box";
    $("exp-list").hidden = tab !== "exp";
    $("exp-alert").hidden = !state.expeditions.some(x => x.endsAt <= Date.now());
    $("tab-box").textContent = "Caixa (" + v.box.length + ")";
    $("tab-party").textContent = "Grupo (" + v.party.length + "/" + Game.C.PARTY_SIZE + ")";

    if (tab === "party") {
      $("sheet-hint").textContent = "Toque em um bichinho para cuidar dele. Todos do grupo gastam fome, vida e felicidade, mesmo fora da tela, e rendem moedas enquanto estão alimentados e felizes.";
    } else if (tab === "exp" && expPick) {
      $("sheet-hint").textContent = "Escolha até " + Game.C.EXPEDITION_SIZE + " criaturas.";
    } else if (tab === "exp") {
      $("sheet-hint").textContent = "Até " + Game.C.EXPEDITION_SIZE + " criaturas por expedição, do grupo ou da caixa. Quem sai some da tela, não gasta nada e volta com moedas e itens do seu tipo.";
    } else if (swapIn) {
      $("sheet-hint").textContent = "Escolha quem sai do grupo para dar lugar ao novo bichinho.";
    } else {
      $("sheet-hint").textContent = "Quem está na caixa fica parado: não gasta fome, vida nem felicidade.";
    }

    const stagger = animateList;
    animateList = false;
    if (tab === "exp") renderExp(v);
    partyList.replaceChildren();
    v.party.forEach(p => {
      const el = itemNode(p, "button");
      el.type = "button";
      el.setAttribute("aria-pressed", String(p.id === v.pet));
      el.disabled = !!p.away;
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
          el.disabled = !!p.away;
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
      Array.from((tab === "party" ? partyList : tab === "exp" ? $("exp-list") : boxList).children).forEach((el, k) => {
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
    $("menu-alert").hidden = $("egg-alert").hidden;
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
    $("treat").disabled = !v.treat.can;
    healUntil = v.treat.healing ? v.treat.healUntil : 0;
    tickHeal();
    $("treat").title = v.treat.healing ? "Recuperando a vida" : v.treat.used ? "Já tratada hoje" : v.dying ? "" : "Só quando estiver morrendo";
    $("party-alert").hidden = !(state.expeditions.some(x => x.endsAt <= Date.now()) || v.party.some(p => !p.away && (p.dying || p.hunger <= 25 || p.life <= 25 || p.joy <= 25)));
    $("shop-btn").setAttribute("aria-label", "Loja · " + v.coins + " moedas");
    if ($("shop-sheet").open) renderShop();
    if ($("bag-sheet").open) renderBag();
    if (lastPetId !== v.pet + ":" + v.species) {
      lastPetId = v.pet + ":" + v.species;
      stage.setPet(v.species);
    }
    stage.setStatus({ hunger: v.hunger, life: v.life, dying: v.dying });
    if ($("party-sheet").open) renderSheet(v);
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
      expPick = null;
      swapIn = null;
      animateList = true;
      $("party-sheet").showModal();
      clearInterval(expTicker);
      expTicker = setInterval(tickExp, 1000);
      render();
    });

    $("tab-party").addEventListener("click", () => {
      tab = "party";
      swapIn = null;
      animateList = true;
      render();
    });
    $("tab-exp").addEventListener("click", () => {
      tab = "exp";
      expPick = null;
      swapIn = null;
      animateList = true;
      render();
    });
    $("party-sheet").addEventListener("close", () => clearInterval(expTicker));
    $("shop-btn").addEventListener("click", () => {
      if (Game.dailyStatus(state).available) {
        dailyShown = "";
        maybeDaily();
        if ($("daily-sheet").open) return;
      }
      openShop("items");
    });
    $("bag-btn").addEventListener("click", openBag);
    $("shop-bag").addEventListener("click", openBag);
    $("bag-to-shop").addEventListener("click", () => openShop("items"));
    $("tab-eggstore").addEventListener("click", () => {
      shopTab = "eggs";
      renderShop();
    });
    $("buy-egg").addEventListener("click", () => {
      if (bought.egg && bought.egg > Date.now()) return;
      const before = state.coins;
      const r = Game.buyEgg(state, baseIds());
      if (!r.changed) return;
      saveState();
      scheduleSync();
      buzz([15, 40, 25]);
      shownCoins = before;
      setBagCoins(state.coins, true);
      bought.egg = Date.now() + 1100;
      setTimeout(() => $("shop-sheet").open && renderShop(), 1150);
      const egg = $("shop-egg");
      egg.classList.remove("hatch-hop");
      void egg.offsetWidth;
      egg.classList.add("hatch-hop");
      sparkle($("shop-sheet"), egg, "#c9a8ff");
      const mini = miniEgg("#b9a7d6");
      setTimeout(() => flyTo(mini, egg, $("egg-owned")), 260);
      renderShop();
      render();
    });
    $("tab-store").addEventListener("click", () => {
      shopTab = "items";
      renderShop();
    });
    $("daily-claim").addEventListener("click", () => {
      const r = Game.claimDaily(state);
      $("daily-sheet").close();
      if (!r.changed) return;
      saveState();
      scheduleSync();
      showToast("+" + r.coins + " moedas" + (r.item ? " e " + Game.ITEMS[r.item].name : ""));
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
    [["inc", "tab-inc"], ["inv", "tab-inv"]].forEach(([k, id]) => {
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
    const setMenu = open => {
      $("menu-pop").hidden = !open;
      $("menu-btn").setAttribute("aria-expanded", String(open));
      $("menu-btn").classList.toggle("open", open);
      $("menu-scrim").hidden = !open;
      document.querySelector(".top").classList.toggle("menu-open", open);
    };
    $("menu-btn").addEventListener("click", () => setMenu($("menu-pop").hidden));
    document.addEventListener("pointerdown", e => {
      if (!$("menu-pop").hidden && !e.target.closest(".top-actions")) setMenu(false);
    });
    ["shop-btn", "bag-btn", "egg-btn", "dex-btn", "account-btn"].forEach(id => $(id).addEventListener("click", () => setMenu(false)));
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
      await loadScriptSafe("lib/chest.js");
      await loadScript("lib/stage.js");
      await loadScript("pets-list.js");
      for (const f of window.PET_FILES || []) await loadScriptSafe(f);
    } catch (err) {
      let tries = 0;
      try {
        tries = Number(sessionStorage.getItem("pets.boot.retry") || 0);
        sessionStorage.setItem("pets.boot.retry", String(tries + 1));
      } catch (e) {}
      if (tries < 2) {
        $("loading-text").textContent = "Atualizando o app...";
        setTimeout(() => location.reload(), 2500);
        return;
      }
      $("loading-text").textContent = "Não foi possível carregar o app. Verifique a conexão e recarregue.";
      return;
    }
    try {
      sessionStorage.removeItem("pets.boot.retry");
    } catch (e) {}

    window.Pets.list.forEach(p => {
      meta[p.id] = { id: p.id, dex: p.dex || 999, name: p.name, color: p.color, types: p.types, description: p.description || "", evolvesTo: p.evolvesTo || null, evolveBranches: p.evolveBranches || null, evolveLevel: p.evolveLevel || 0 };
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
      maybeDaily();
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
