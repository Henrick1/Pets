(function (root) {
  const CAT = { phys: "Ataque", spec: "Ataque Especial", status: "Status" };
  const CAT_SHORT = { phys: "Físico", spec: "Especial", status: "Status" };

  function h(tag, cls, text) {
    const el = root.document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function tagColor(hex) {
    const n = parseInt(String(hex || "#888888").slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum > 0.62 ? "#1f2a24" : "#ffffff";
  }

  function mount(el, o) {
    const { THREE, kit, Pets, Battle, Types, Game, api } = o;
    const reduceMotion = !!o.reduceMotion;
    el.innerHTML = "";
    const host = h("div", "bt");
    el.append(host);

    const typeInfo = t => (t && Types.INFO[t]) || { name: "Neutro", color: "#9aa3a0" };
    const pill = t => {
      const i = typeInfo(t);
      const s = h("span", "bt-type", i.name);
      s.style.background = i.color;
      s.style.color = tagColor(i.color);
      return s;
    };
    const metaOf = sp => (api.meta && api.meta(sp)) || { name: sp, color: "#999999", types: [] };
    const nameOf = sp => metaOf(sp).name || sp;
    const itemName = id => (Game.ITEMS[id] && Game.ITEMS[id].name) || id;

    const lobby = h("section", "bt-lobby");
    const lobbyHead = h("header", "bt-head");
    const lobbyTitle = h("h2", "", "Batalha");
    const closeBtn = h("button", "bt-x", "×");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fechar");
    lobbyHead.append(lobbyTitle, closeBtn);
    const lobbySub = h("p", "bt-sub", "Leve as criaturas do seu grupo. Os oponentes são sorteados com níveis parecidos com os do seu time. Toque em uma criatura para escolher os ataques.");
    const teamList = h("div", "bt-team");
    const lobbyFoot = h("div", "bt-foot");
    const startBtn = h("button", "bt-primary", "Procurar batalha");
    startBtn.type = "button";
    const lobbyNote = h("p", "bt-note");
    lobbyFoot.append(lobbyNote, startBtn);
    lobby.append(lobbyHead, lobbySub, teamList, lobbyFoot);

    const editor = h("section", "bt-editor");
    editor.hidden = true;
    const edHead = h("header", "bt-head");
    const edBack = h("button", "bt-back", "‹");
    edBack.type = "button";
    edBack.setAttribute("aria-label", "Voltar");
    const edTitle = h("h2");
    edHead.append(edBack, edTitle);
    const edSub = h("p", "bt-sub");
    const edList = h("div", "bt-movelist");
    const edFoot = h("div", "bt-foot");
    const edSave = h("button", "bt-primary", "Salvar ataques");
    edSave.type = "button";
    edFoot.append(edSave);
    editor.append(edHead, edSub, edList, edFoot);

    const arena = h("section", "bt-arena");
    arena.hidden = true;
    const view = h("div", "bt-view");
    const canvas = h("canvas", "bt-canvas");
    const hudFoe = h("div", "bt-hud bt-hud-foe");
    const hudMe = h("div", "bt-hud bt-hud-me");
    const msg = h("div", "bt-msg");
    msg.setAttribute("aria-live", "polite");
    view.append(canvas, hudFoe, hudMe);
    const panel = h("div", "bt-panel");
    const cmd = h("div", "bt-cmd");
    const moveGrid = h("div", "bt-grid");
    const cmdRow = h("div", "bt-row");
    const swBtn = h("button", "bt-sec", "Trocar");
    const itBtn = h("button", "bt-sec", "Itens");
    const runBtn = h("button", "bt-sec bt-run", "Fugir");
    [swBtn, itBtn, runBtn].forEach(b => (b.type = "button"));
    const ICONS = {
      swap: '<path d="M7 7h11l-3.5-3.5M17 17H6l3.5 3.5"/>',
      bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M10 13h4"/>',
      run: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 16l4-4-4-4M14 12H4"/>'
    };
    const withIcon = (b, key, color) => {
      const text = b.textContent;
      b.textContent = "";
      const ico = h("span", "bt-ico");
      ico.style.setProperty("--ic", color);
      ico.innerHTML = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + ICONS[key] + "</svg>";
      b.append(ico, h("span", "", text));
    };
    withIcon(swBtn, "swap", "#3f8fd8");
    withIcon(itBtn, "bag", "#d9962b");
    withIcon(runBtn, "run", "#d0503c");
    cmdRow.append(swBtn, itBtn, runBtn);
    cmd.append(moveGrid, cmdRow);
    const sheet = h("div", "bt-sheet");
    sheet.hidden = true;
    panel.append(msg, cmd, sheet);
    const result = h("div", "bt-result");
    result.hidden = true;
    arena.append(view, panel, result);

    host.append(lobby, editor, arena);

    function makeHud(box) {
      const top = h("div", "bt-hud-top");
      const name = h("span", "bt-hud-name");
      const lv = h("span", "bt-hud-lv");
      top.append(name, lv);
      const bar = h("div", "bt-bar");
      const fill = h("div", "bt-fill");
      bar.append(fill);
      const bottom = h("div", "bt-hud-bottom");
      const dots = h("div", "bt-dots");
      const num = h("span", "bt-hud-num");
      bottom.append(dots, num);
      box.append(top, bar, bottom);
      return { box, name, lv, fill, dots, num, hp: 0, max: 1, raf: 0 };
    }
    const huds = { me: makeHud(hudMe), foe: makeHud(hudFoe) };

    let state = { team: [], battle: null, inventory: {} };
    let shown = null;
    let stage = null;
    let busy = false;
    let editing = null;
    let picks = [];
    let skip = null;
    let xpLog = {};
    let mode = "lobby";

    function show(which) {
      mode = which;
      lobby.hidden = which !== "lobby";
      editor.hidden = which !== "editor";
      arena.hidden = which !== "arena";
      if (which === "arena") {
        if (!stage) {
          stage = root.BattleStage.create({ canvas, THREE, kit, Pets, reduceMotion });
        }
        stage.start();
        requestAnimationFrame(() => stage && stage.resize());
      } else if (stage) stage.stop();
    }

    function lifeColor(k) {
      return k > 0.5 ? "var(--bt-ok)" : k > 0.2 ? "var(--bt-warn)" : "var(--bt-low)";
    }

    function renderLobby() {
      teamList.innerHTML = "";
      const active = !!state.battle;
      state.team.forEach(row => {
        const card = h("button", "bt-card" + (row.able ? "" : " off"));
        card.type = "button";
        const art = h("span", "bt-art");
        art.style.setProperty("--c", metaOf(row.species).color);
        const url = api.thumb ? api.thumb(row.species) : null;
        if (url) {
          const img = h("img");
          img.src = url;
          img.alt = "";
          art.append(img);
        }
        const info = h("span", "bt-card-info");
        const top = h("span", "bt-card-top");
        top.append(h("strong", "", nameOf(row.species)), h("span", "bt-lv", "Nv " + row.level));
        const types = h("span", "bt-types");
        (row.types || []).forEach(t => types.append(pill(t)));
        const bar = h("span", "bt-bar small");
        const fill = h("span", "bt-fill");
        fill.style.width = Math.max(0, Math.min(100, row.life)) + "%";
        fill.style.background = lifeColor(row.life / 100);
        bar.append(fill);
        const moves = h("span", "bt-chips");
        row.moves.forEach(id => {
          const m = Battle.MOVES[id];
          if (!m) return;
          const c = h("span", "bt-chip", m.name);
          c.style.setProperty("--tc", typeInfo(m.type).color);
          moves.append(c);
        });
        info.append(top, types, bar, moves);
        if (!row.able) info.append(h("span", "bt-why", row.away ? "Em expedição" : "Desmaiado · cure para lutar"));
        card.append(art, info);
        card.addEventListener("click", () => openEditor(row.uid));
        teamList.append(card);
      });
      const able = state.team.filter(r => r.able).length;
      startBtn.textContent = active ? "Continuar batalha" : "Procurar batalha";
      startBtn.disabled = !active && !able;
      lobbyNote.textContent = active ? "Há uma batalha em andamento." : able ? able + (able === 1 ? " criatura pronta" : " criaturas prontas") + " para lutar." : "Nenhuma criatura do grupo pode lutar agora.";
    }

    function openEditor(uid) {
      const row = state.team.find(r => r.uid === uid);
      if (!row) return;
      editing = uid;
      picks = row.moves.slice();
      edTitle.textContent = "Ataques de " + nameOf(row.species);
      renderEditor();
      show("editor");
    }

    function renderEditor() {
      const row = state.team.find(r => r.uid === editing);
      if (!row) return;
      edSub.textContent = "Escolha até " + Battle.MAX_MOVES + " ataques (" + picks.length + "/" + Battle.MAX_MOVES + "). Novos ataques são liberados conforme o nível sobe.";
      edList.innerHTML = "";
      const base = Battle.speciesInfo(row.species).base;
      const box = h("div", "bt-stats");
      [["hp", "Vida"], ["atk", "Ataque"], ["def", "Defesa"], ["spa", "Ataque Especial"], ["spd", "Defesa Especial"], ["spe", "Velocidade"]].forEach(([k, name], i) => {
        const line = h("div", "bt-stat");
        const bar = h("span", "bt-stat-bar");
        const fill = h("span", "bt-stat-fill");
        fill.style.width = Math.min(100, (base[i] / 130) * 100) + "%";
        bar.append(fill);
        line.append(h("span", "bt-stat-name", name), h("strong", "bt-stat-val", String(row.stats[k])), bar);
        box.append(line);
      });
      edList.append(box);
      row.learnset.forEach(entry => {
        const info = Battle.moveInfo(entry.id);
        if (!info) return;
        const on = picks.includes(entry.id);
        const b = h("button", "bt-move-row" + (on ? " on" : "") + (entry.known ? "" : " locked"));
        b.type = "button";
        b.disabled = !entry.known;
        const head = h("span", "bt-move-head");
        head.append(pill(info.type), h("strong", "", info.name));
        const tag = h("span", "bt-move-tag", entry.known ? (on ? "Equipado" : "") : "Nv " + entry.level);
        head.append(tag);
        const stats = h("span", "bt-move-stats", CAT[info.cat] + (info.power ? " · Poder " + info.power : "") + " · " + (info.acc ? "Precisão " + info.acc + "%" : "Sempre acerta"));
        b.append(head, stats);
        if (info.desc) b.append(h("span", "bt-move-desc", info.desc));
        b.addEventListener("click", () => {
          if (on) picks = picks.filter(x => x !== entry.id);
          else if (picks.length < Battle.MAX_MOVES) picks.push(entry.id);
          else {
            picks.shift();
            picks.push(entry.id);
          }
          renderEditor();
        });
        edList.append(b);
      });
      edSave.disabled = !picks.length;
    }

    edBack.addEventListener("click", () => {
      renderLobby();
      show("lobby");
    });
    edSave.addEventListener("click", async () => {
      if (!picks.length || !editing) return;
      edSave.disabled = true;
      const r = await api.setMoves(editing, picks);
      if (r) state = Object.assign(state, r);
      renderLobby();
      show("lobby");
    });
    closeBtn.addEventListener("click", () => {
      if (o.onClose) o.onClose();
    });

    function setHud(side, f, team, animate) {
      const hud = huds[side];
      if (!f) {
        hud.box.classList.remove("on");
        return;
      }
      hud.box.classList.add("on");
      hud.name.textContent = nameOf(f.sp);
      hud.lv.textContent = "Nv " + f.lv;
      hud.dots.innerHTML = "";
      (team || []).forEach(x => {
        const d = h("i", x.down ? "down" : "");
        hud.dots.append(d);
      });
      setBar(side, f.hp, f.max, animate);
    }

    function setBar(side, hp, max, animate) {
      const hud = huds[side];
      const from = hud.hp;
      hud.max = max;
      cancelAnimationFrame(hud.raf);
      const paint = v => {
        const k = Math.max(0, Math.min(1, v / max));
        hud.fill.style.width = k * 100 + "%";
        hud.fill.style.background = lifeColor(k);
        hud.num.textContent = side === "me" ? Math.round(v) + "/" + max : Math.round(k * 100) + "%";
        hud.hp = v;
      };
      if (!animate || reduceMotion) {
        paint(hp);
        return Promise.resolve();
      }
      return new Promise(res => {
        const t0 = performance.now();
        const dur = Math.min(900, 250 + Math.abs(hp - from) / Math.max(1, max) * 900);
        const step = () => {
          const p = Math.min(1, (performance.now() - t0) / dur);
          paint(from + (hp - from) * p);
          if (p < 1) hud.raf = requestAnimationFrame(step);
          else res();
        };
        step();
      });
    }

    function say(text, ms) {
      msg.textContent = text;
      msg.classList.add("show");
      return new Promise(res => {
        const done = () => {
          clearTimeout(timer);
          skip = null;
          res();
        };
        const timer = setTimeout(done, reduceMotion ? Math.min(ms || 1100, 900) : ms || 1100);
        skip = done;
      });
    }

    arena.addEventListener("click", e => {
      if (e.target.closest("button")) return;
      if (skip) skip();
    });

    const fighter = (b, side) => (side === "me" ? b.me[b.mi] : b.foe[b.fi]);
    const label = (side, sp) => (side === "me" ? nameOf(sp) : nameOf(sp) + " adversário");
    const power = sp => {
      const info = Battle.speciesInfo(sp);
      const t = info.base.reduce((a, x) => a + x, 0);
      return Math.max(0, Math.min(1, (t - 300) / 250));
    };

    async function ensure(b) {
      if (!api.ensure || !b) return;
      await api.ensure(b.me.map(f => f.sp).concat(b.foe.map(f => f.sp)));
    }

    async function enterBattle(b, events) {
      shown = JSON.parse(JSON.stringify(b));
      xpLog = {};
      result.hidden = true;
      sheet.hidden = true;
      show("arena");
      await ensure(b);
      stage.remove("me");
      stage.remove("foe");
      setHud("me", null);
      setHud("foe", null);
      renderCmd(true);
      const fresh = events && events.some(e => e.t === "start");
      const me = fighter(shown, "me");
      const foe = fighter(shown, "foe");
      if (fresh) {
        const names = shown.foe.map(f => nameOf(f.sp));
        const list = names.length > 1 ? names.slice(0, -1).join(", ") + " e " + names[names.length - 1] : names[0];
        await say("Seus oponentes: " + list + "!", 1500);
        setHud("foe", foe, shown.foe, false);
        await Promise.all([stage.setFighter("foe", foe.sp, { power: power(foe.sp) }), say(label("foe", foe.sp) + " entrou na batalha!", 1100)]);
        setHud("me", me, shown.me, false);
        await Promise.all([stage.setFighter("me", me.sp, { power: power(me.sp) }), say("Vai, " + nameOf(me.sp) + "!", 1000)]);
      } else {
        setHud("foe", foe, shown.foe, false);
        stage.setFighter("foe", foe.sp, { instant: true, power: power(foe.sp) });
        if (!me.down) {
          setHud("me", me, shown.me, false);
          stage.setFighter("me", me.sp, { instant: true, power: power(me.sp) });
        }
      }
      ready();
    }

    function ready() {
      busy = false;
      if (!shown) return;
      if (shown.need || fighter(shown, "me").down) {
        msg.textContent = "Escolha quem vai entrar na batalha.";
        openSwitch(true);
        renderCmd(true);
        return;
      }
      msg.textContent = "O que " + nameOf(fighter(shown, "me").sp) + " vai fazer?";
      renderCmd(false);
    }

    function renderCmd(lock) {
      moveGrid.innerHTML = "";
      const f = shown && fighter(shown, "me");
      const list = f && !f.down ? f.moves : [];
      for (let i = 0; i < Battle.MAX_MOVES; i++) {
        const id = list[i];
        const m = id && Battle.MOVES[id];
        const b = h("button", "bt-mv" + (m ? "" : " empty"));
        b.type = "button";
        if (m) {
          const ti = typeInfo(m.type);
          b.style.setProperty("--tc", ti.color);
          b.style.setProperty("--tt", tagColor(ti.color));
          const top = h("span", "bt-mv-name", m.name);
          const sub = h("span", "bt-mv-sub", ti.name + " · " + CAT_SHORT[m.cat] + (m.power ? " · " + m.power : ""));
          const foe = shown && fighter(shown, "foe");
          if (m.cat !== "status" && foe && !foe.down) {
            const eff = Battle.effectiveness(m, foe.sp);
            if (eff >= 2) b.classList.add("good");
            else if (eff === 0) b.classList.add("none");
            else if (eff < 1) b.classList.add("bad");
          }
          b.append(top, sub);
          b.disabled = !!lock;
          b.addEventListener("click", () => send({ kind: "move", move: id }));
        } else b.disabled = true;
        moveGrid.append(b);
      }
      const usable = Battle.BATTLE_ITEMS.some(k => state.inventory[k] > 0);
      swBtn.disabled = !!lock || !shown || shown.me.filter((x, i) => !x.down && i !== shown.mi).length === 0;
      itBtn.disabled = !!lock || !usable;
      runBtn.disabled = !!lock;
    }

    function closeSheet() {
      sheet.hidden = true;
      sheet.innerHTML = "";
      cmd.hidden = false;
    }

    function sheetHead(title, canClose) {
      sheet.innerHTML = "";
      const head = h("div", "bt-sheet-head");
      head.append(h("strong", "", title));
      if (canClose) {
        const x = h("button", "bt-x small", "×");
        x.type = "button";
        x.setAttribute("aria-label", "Fechar");
        x.addEventListener("click", closeSheet);
        head.append(x);
      }
      sheet.append(head);
      sheet.hidden = false;
      cmd.hidden = true;
    }

    function memberRow(f, i, extra) {
      const b = h("button", "bt-member" + (f.down ? " down" : "") + (i === shown.mi && !shown.need ? " cur" : ""));
      b.type = "button";
      const art = h("span", "bt-art small");
      art.style.setProperty("--c", metaOf(f.sp).color);
      const url = api.thumb ? api.thumb(f.sp) : null;
      if (url) {
        const img = h("img");
        img.src = url;
        img.alt = "";
        art.append(img);
      }
      const info = h("span", "bt-card-info");
      const top = h("span", "bt-card-top");
      top.append(h("strong", "", nameOf(f.sp)), h("span", "bt-lv", "Nv " + f.lv));
      const bar = h("span", "bt-bar small");
      const fill = h("span", "bt-fill");
      fill.style.width = (f.hp / f.max) * 100 + "%";
      fill.style.background = lifeColor(f.hp / f.max);
      bar.append(fill);
      info.append(top, bar, h("span", "bt-why", f.down ? "Desmaiado" : f.hp + "/" + f.max + (extra ? " · " + extra : "")));
      b.append(art, info);
      return b;
    }

    function openSwitch(forced) {
      sheetHead(forced ? "Quem entra agora?" : "Trocar criatura", !forced);
      const list = h("div", "bt-sheet-list");
      shown.me.forEach((f, i) => {
        const cur = i === shown.mi && !f.down;
        const b = memberRow(f, i, cur ? "Em campo" : "");
        b.disabled = f.down || cur;
        b.addEventListener("click", () => {
          closeSheet();
          send({ kind: "switch", to: i });
        });
        list.append(b);
      });
      sheet.append(list);
      if (!forced) sheet.append(h("p", "bt-note", "Trocar gasta o seu turno."));
    }

    function openItems() {
      sheetHead("Itens", true);
      const list = h("div", "bt-sheet-list");
      Battle.BATTLE_ITEMS.forEach(id => {
        const n = state.inventory[id] || 0;
        if (!n) return;
        const it = Game.ITEMS[id];
        const b = h("button", "bt-item");
        b.type = "button";
        b.append(h("strong", "", it.name), h("span", "bt-why", (it.revive ? "Reanima com " + it.life + "% de vida" : "Recupera " + it.life + "% da vida") + " · x" + n));
        b.disabled = !shown.me.some(f => !f.gone && (it.revive ? f.down : !f.down && f.hp < f.max));
        b.addEventListener("click", () => openTargets(id));
        list.append(b);
      });
      sheet.append(list, h("p", "bt-note", "Usar um item gasta o seu turno."));
    }

    function openTargets(item) {
      const it = Game.ITEMS[item];
      sheetHead("Usar " + it.name + " em quem?", true);
      const list = h("div", "bt-sheet-list");
      shown.me.forEach((f, i) => {
        const ok = !f.gone && (it.revive ? f.down : !f.down && f.hp < f.max);
        const b = memberRow(f, i, i === shown.mi ? "Em campo" : "");
        b.disabled = !ok;
        b.addEventListener("click", () => {
          closeSheet();
          send({ kind: "item", item, target: i });
        });
        list.append(b);
      });
      sheet.append(list);
    }

    function openRun() {
      sheetHead("Fugir da batalha?", true);
      const p = h("p", "bt-sub", "Você não ganha recompensas, e a vida perdida pelas criaturas continua assim.");
      const row = h("div", "bt-row");
      const yes = h("button", "bt-sec bt-run", "Fugir");
      const no = h("button", "bt-sec", "Continuar");
      yes.type = no.type = "button";
      yes.addEventListener("click", () => {
        closeSheet();
        send({ kind: "run" });
      });
      no.addEventListener("click", closeSheet);
      row.append(no, yes);
      sheet.append(p, row);
    }

    swBtn.addEventListener("click", () => !busy && openSwitch(false));
    itBtn.addEventListener("click", () => !busy && openItems());
    runBtn.addEventListener("click", () => !busy && openRun());

    async function send(action) {
      if (busy) return;
      busy = true;
      renderCmd(true);
      let r = null;
      try {
        r = await api.act(action);
      } catch (e) {
        r = null;
      }
      if (!r || !r.ok) {
        busy = false;
        if (r && r.battle === null) {
          await back();
          return;
        }
        ready();
        return;
      }
      if (r.inventory) state.inventory = r.inventory;
      if (r.battle) await ensure(r.battle);
      await playEvents(r.events || []);
      if (r.battle) {
        shown = JSON.parse(JSON.stringify(r.battle));
        setHud("me", fighter(shown, "me").down ? null : fighter(shown, "me"), shown.me, false);
        setHud("foe", fighter(shown, "foe"), shown.foe, false);
        ready();
      }
    }

    const STAT_MSG = (name, stat, d) => {
      const s = Battle.STAT_NAMES[stat] || stat;
      if (d === 0) return s + " de " + name + " não pode mudar mais!";
      if (d >= 2) return s + " de " + name + " aumentou muito!";
      if (d > 0) return s + " de " + name + " aumentou!";
      if (d <= -2) return s + " de " + name + " diminuiu muito!";
      return s + " de " + name + " diminuiu!";
    };

    async function playEvents(events) {
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        if (e.t === "use") {
          const side = e.side;
          const tside = side === "me" ? "foe" : "me";
          const att = fighter(shown, side);
          const next = events[i + 1];
          const m = Battle.MOVES[e.move];
          const hits = next && next.t === "hit" && next.side === tside ? next : null;
          const miss = next && next.t === "miss" ? next : null;
          msg.textContent = label(side, att.sp) + " usou " + (m ? m.name : e.move) + "!";
          await stage.attack(side, { type: e.type, cat: e.cat, eff: hits ? hits.eff : 1 }, () => {
            if (hits) {
              const tf = fighter(shown, tside);
              tf.hp = hits.hp;
              stage.hitReact(tside, { eff: hits.eff, crit: hits.crit });
              setBar(tside, hits.hp, hits.max, true);
            } else if (miss) stage.dodge(tside);
          });
          await stage.wait(0.35);
          if (hits) {
            i += 1;
            if (hits.crit) await say("Acerto crítico!", 900);
            if (hits.eff === 0) await say("Não afeta " + label(tside, fighter(shown, tside).sp) + "...", 1100);
            else if (hits.eff >= 2) await say("É super efetivo!", 1000);
            else if (hits.eff < 1) await say("Não é muito efetivo...", 1000);
          } else if (miss) {
            i += 1;
            await say("Mas errou!", 900);
          }
          continue;
        }
        if (e.t === "hit") {
          const tf = fighter(shown, e.side);
          tf.hp = e.hp;
          await Promise.all([stage.hitReact(e.side, e), setBar(e.side, e.hp, e.max, true)]);
          continue;
        }
        if (e.t === "miss") {
          await say("Mas errou!", 900);
          continue;
        }
        if (e.t === "fail") {
          await say("Mas não funcionou!", 900);
          continue;
        }
        if (e.t === "heal") {
          const f = fighter(shown, e.side);
          f.hp = e.hp;
          await Promise.all([stage.healFx(e.side), setBar(e.side, e.hp, e.max, true)]);
          await say(e.drain ? label(e.side, f.sp) + " absorveu energia!" : label(e.side, f.sp) + " recuperou vida!", 900);
          continue;
        }
        if (e.t === "stat") {
          const f = fighter(shown, e.side);
          if (e.d !== 0) await Promise.all([stage.statFx(e.side, e.d > 0), say(STAT_MSG(label(e.side, f.sp), e.stat, e.d), 1100)]);
          else await say(STAT_MSG(label(e.side, f.sp), e.stat, 0), 1000);
          continue;
        }
        if (e.t === "faint") {
          const list = e.side === "me" ? shown.me : shown.foe;
          const f = list[e.i];
          f.down = true;
          f.hp = 0;
          setHud(e.side, f, list, false);
          await Promise.all([stage.faint(e.side), say(label(e.side, f.sp) + " desmaiou!", 1300)]);
          if (e.side === "me") setHud("me", null);
          continue;
        }
        if (e.t === "xp") {
          const f = shown.me[e.i];
          const log = xpLog[e.uid] || (xpLog[e.uid] = { sp: f.sp, xp: 0, level: 0, learned: [] });
          log.xp += e.amount;
          if (e.levels) log.level = e.level;
          (e.learned || []).forEach(id => log.learned.push(id));
          await say(nameOf(f.sp) + " ganhou " + e.amount + " XP!", 950);
          if (e.levels) await say(nameOf(f.sp) + " subiu para o nível " + e.level + "!", 1200);
          for (const id of e.learned || []) await say(nameOf(f.sp) + " aprendeu " + (Battle.MOVES[id] ? Battle.MOVES[id].name : id) + "!", 1200);
          continue;
        }
        if (e.t === "switch") {
          const list = e.side === "me" ? shown.me : shown.foe;
          const prevIdx = e.side === "me" ? shown.mi : shown.fi;
          const prev = list[prevIdx];
          if (e.side === "me" && prev && !prev.down && prevIdx !== e.i && stage.has("me")) {
            await Promise.all([stage.recall("me"), say("Volta, " + nameOf(prev.sp) + "!", 900)]);
          }
          if (e.side === "me") shown.mi = e.i;
          else shown.fi = e.i;
          const f = list[e.i];
          f.hp = e.hp;
          setHud(e.side, f, list, false);
          await Promise.all([
            stage.setFighter(e.side, f.sp, { power: power(f.sp) }),
            say(e.side === "me" ? "Vai, " + nameOf(f.sp) + "!" : label("foe", f.sp) + " entrou na batalha!", 1100)
          ]);
          renderCmd(true);
          continue;
        }
        if (e.t === "item") {
          const f = shown.me[e.i];
          const was = f.down;
          f.hp = e.hp;
          if (e.revive) f.down = false;
          await say("Você usou " + itemName(e.item) + " em " + nameOf(f.sp) + "!", 1000);
          if (e.i === shown.mi && !was) await Promise.all([stage.healFx("me"), setBar("me", e.hp, e.max, true)]);
          else if (e.revive) await say(nameOf(f.sp) + " voltou a ficar de pé!", 1000);
          setHud("me", fighter(shown, "me").down ? null : fighter(shown, "me"), shown.me, false);
          continue;
        }
        if (e.t === "need") continue;
        if (e.t === "run") {
          await say("Você fugiu da batalha.", 1100);
          continue;
        }
        if (e.t === "end") {
          await showResult(e);
          continue;
        }
      }
    }

    async function showResult(e) {
      busy = true;
      renderCmd(true);
      if (e.result === "win") await say("Você venceu a batalha!", 1300);
      else if (e.result === "lose") await say("Todas as suas criaturas desmaiaram...", 1500);
      result.innerHTML = "";
      const card = h("div", "bt-result-card " + e.result);
      card.append(h("h3", "", e.result === "win" ? "Vitória!" : e.result === "lose" ? "Derrota" : "Você fugiu"));
      if (e.coins) card.append(h("p", "bt-coins", "+" + e.coins + " moedas"));
      const rows = Object.keys(xpLog);
      if (rows.length) {
        const list = h("ul", "bt-xp");
        rows.forEach(uid => {
          const x = xpLog[uid];
          const li = h("li");
          li.append(h("strong", "", nameOf(x.sp)), h("span", "", "+" + x.xp + " XP" + (x.level ? " · Nv " + x.level : "")));
          list.append(li);
        });
        card.append(list);
      }
      if (e.result === "lose") card.append(h("p", "bt-sub", "Suas criaturas desmaiadas precisam ser curadas com poções ou tratamento antes de lutar de novo."));
      else if (e.result === "win") card.append(h("p", "bt-sub", "A vida perdida na batalha continua depois dela. Cuide do seu time!"));
      const ok = h("button", "bt-primary", "Voltar");
      ok.type = "button";
      ok.addEventListener("click", back);
      card.append(ok);
      result.append(card);
      result.hidden = false;
      shown = null;
    }

    async function back() {
      result.hidden = true;
      closeSheet();
      if (stage) {
        stage.remove("me");
        stage.remove("foe");
      }
      shown = null;
      await refresh();
      show("lobby");
      if (o.onChange) o.onChange();
    }

    startBtn.addEventListener("click", async () => {
      if (busy) return;
      if (state.battle) {
        await enterBattle(state.battle, null);
        return;
      }
      busy = true;
      startBtn.disabled = true;
      lobbyNote.textContent = "Procurando oponentes...";
      let r = null;
      try {
        r = await api.start();
      } catch (e) {
        r = null;
      }
      busy = false;
      if (!r || !r.ok) {
        lobbyNote.textContent = r && r.reason === "team" ? "Nenhuma criatura do grupo pode lutar agora." : "Não foi possível começar a batalha.";
        startBtn.disabled = false;
        if (r && r.battle) {
          state.battle = r.battle;
          renderLobby();
        }
        return;
      }
      if (r.inventory) state.inventory = r.inventory;
      state.battle = r.battle;
      busy = true;
      await enterBattle(r.battle, r.events);
    });

    async function refresh() {
      const r = await api.lobby();
      if (r) state = Object.assign({ team: [], battle: null, inventory: {} }, r);
      if (mode === "lobby" || mode === "editor") renderLobby();
      if (mode === "editor") renderEditor();
      return state;
    }

    async function open() {
      await refresh();
      if (state.battle) await enterBattle(state.battle, null);
      else show("lobby");
    }

    function close() {
      if (stage) stage.stop();
    }

    function destroy() {
      if (stage) stage.dispose();
      stage = null;
      el.innerHTML = "";
    }

    return { open, close, refresh, destroy, busy: () => busy, mode: () => mode };
  }

  root.BattleUI = { mount };
})(typeof self !== "undefined" ? self : this);
