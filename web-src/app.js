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
    const owned = new Set(v.party.concat(v.box).map(p => p.id));
    const found = petIds.filter(id => owned.has(id)).length;
    $("dex-count").textContent = found + " de " + petIds.length + " descobertas";
    const list = $("dex-list");
    list.replaceChildren();
    petIds.forEach((id, i) => {
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
      card.append(sw, name);
      if (known) card.addEventListener("click", () => openDexDetail(id));
      list.append(card);
    });
  }

  function openDexDetail(id) {
    const v = view();
    const m = meta[id];
    if (!m) return;
    const row = v.party.concat(v.box).find(p => p.id === id);
    $("dex-detail").style.setProperty("--c", m.color);
    $("dex-name").textContent = m.name;
    $("dex-types").replaceChildren(...typeTags(m.types).childNodes);
    $("dex-desc").textContent = m.description || "Ainda não há muito o que dizer sobre esta criatura.";
    const bits = [];
    if (row) bits.push("Nível " + row.level + " · " + (v.party.some(p => p.id === id) ? "No grupo" : "Na caixa"));
    if (m.evolvesTo && meta[m.evolvesTo]) bits.push("Evolui para " + meta[m.evolvesTo].name);
    const pre = petIds.find(o => meta[o] && meta[o].evolvesTo === id);
    if (pre) bits.push("Evolução de " + meta[pre].name);
    $("dex-meta").textContent = bits.join(" · ");
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

  function closeDexDetail() {
    if (preview) preview.stop();
    $("dex-detail").hidden = true;
    $("dex-list").hidden = false;
    $("dex-count").hidden = false;
    $("dex-back").hidden = true;
    $("dex-title").textContent = "Criaturas";
  }

  function showToast(text) {
    const el = $("toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.hidden = true;
    }, 3500);
  }

  function showView(name) {
    $("loading").hidden = true;
    $("auth-view").hidden = name !== "auth";
    $("game-view").hidden = name !== "game";
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
    if (!state || !stage) return;
    const v = view();
    const info = meta[v.pet] || { name: v.pet, color: "#999999" };
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
    if (lastPetId !== v.pet) {
      lastPetId = v.pet;
      stage.setPet(v.pet);
    }
    stage.setStatus({ hunger: v.hunger, life: v.life, dying: v.dying });
    if ($("party-sheet").open) renderSheet(v);
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
      render();
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
      showView("game");
      render();
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

    window.addEventListener("resize", () => stage.resize());
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
      await loadScript("lib/stage.js");
      await loadScript("pets-list.js");
      for (const f of window.PET_FILES || []) await loadScriptSafe(f);
    } catch (err) {
      $("loading-text").textContent = "Não foi possível carregar o app. Verifique a conexão e recarregue.";
      return;
    }

    window.Pets.list.forEach(p => {
      meta[p.id] = { id: p.id, name: p.name, color: p.color, types: p.types, description: p.description || "", evolvesTo: p.evolvesTo || null };
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
    showView("game");
    render();
    if (cloud.signedIn()) syncNow();
  }

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => null);
    });
  }

  boot();
})();
