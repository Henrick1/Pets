(function (root) {
  const CAT = { phys: "Ataque", spec: "Ataque Especial", status: "Status" };
  const STAT_ROWS = [["hp", "Vida", "#38c873"], ["spe", "Velocidade", "#59b7ff"], ["atk", "Ataque", "#f08030"], ["def", "Defesa", "#e2a23a"], ["spa", "Ataque Esp.", "#a46be8"], ["spd", "Defesa Esp.", "#7a8fe0"]];
  const STAT_IDX = { hp: 0, atk: 1, def: 2, spa: 3, spd: 4, spe: 5 };

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

  const icon = (key, size, w) => (root.PetIcons ? root.PetIcons.svg(key, size, w) : "");
  const typeIcon = (t, size, w) => (root.PetIcons ? root.PetIcons.typeSvg(t || "none", size, w) : "");

  function mount(el, o) {
    const { THREE, kit, Pets, Battle, Types, Game, api } = o;
    const reduceMotion = !!o.reduceMotion;
    el.innerHTML = "";
    const host = h("div", "bt");
    el.append(host);

    const typeInfo = t => (t && Types.INFO[t]) || { name: "Neutro", color: "#9aa3a0" };
    const pill = t => {
      const i = typeInfo(t);
      const s = h("span", "bt-type");
      s.innerHTML = typeIcon(t, 13, 2.4);
      s.append(h("span", "", i.name));
      s.style.setProperty("--tc", i.color);
      s.style.color = tagColor(i.color);
      return s;
    };
    const typeDot = t => {
      const d = h("i", "bt-tdot");
      d.style.setProperty("--tc", typeInfo(t).color);
      return d;
    };
    const metaOf = sp => (api.meta && api.meta(sp)) || { name: sp, color: "#999999", types: [] };
    const nameOf = sp => metaOf(sp).name || sp;
    const itemName = id => (Game.ITEMS[id] && Game.ITEMS[id].name) || id;
    const artImg = (sp, cls) => {
      const box = h("span", cls || "bt-art");
      const url = api.thumb ? api.thumb(sp) : null;
      if (url) {
        const img = h("img");
        img.src = url;
        img.alt = "";
        box.append(img);
      }
      return box;
    };

    const lobby = h("section", "bt-lobby");
    const lobbyHead = h("header", "bt-head");
    const closeBtn = h("button", "bt-x");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Fechar");
    closeBtn.innerHTML = icon("back", 22, 2.6);
    const lobbyTitle = h("h2", "bt-plate");
    lobbyTitle.innerHTML = icon("fight", 20, 2.6);
    lobbyTitle.append(h("span", "", "Preparar batalha"));
    lobbyHead.append(closeBtn, lobbyTitle);
    const teamList = h("div", "bt-team");
    const detail = h("div", "bt-detail");
    const lobbyFoot = h("div", "bt-foot");
    const lobbyNote = h("p", "bt-note");
    const startBtn = h("button", "bt-primary");
    startBtn.type = "button";
    lobbyFoot.append(lobbyNote, startBtn);
    lobby.append(lobbyHead, teamList, detail, lobbyFoot);

    const arena = h("section", "bt-arena");
    arena.hidden = true;
    const view = h("div", "bt-view");
    const canvas = h("canvas", "bt-canvas");
    const hudFoe = h("div", "bt-hud bt-hud-foe");
    const hudMe = h("div", "bt-hud bt-hud-me");
    view.append(canvas, hudFoe, hudMe);
    const panel = h("div", "bt-panel");
    const prompt = h("div", "bt-prompt");
    const msg = h("span", "bt-msg");
    msg.setAttribute("aria-live", "polite");
    const movesBack = h("button", "bt-pback");
    movesBack.type = "button";
    movesBack.innerHTML = icon("back", 15, 2.8);
    movesBack.append(h("span", "", "Voltar"));
    movesBack.hidden = true;
    prompt.append(msg, movesBack);
    const cmd = h("div", "bt-cmd");
    const cmdGrid = h("div", "bt-cmds");
    const moveGrid = h("div", "bt-moves");
    moveGrid.hidden = true;
    const tile = (key, title, cls) => {
      const b = h("button", "bt-tile " + cls);
      b.type = "button";
      const wm = h("span", "bt-wm");
      wm.innerHTML = icon(key, 84, 1.8);
      const t = h("b", "", title);
      const sub = h("small", "");
      b.append(wm, t, sub);
      b.sub = sub;
      return b;
    };
    const fightBtn = tile("fight", "Lutar", "bt-t-fight");
    const swBtn = tile("swap", "Trocar", "bt-t-swap");
    const itBtn = tile("bag", "Itens", "bt-t-items");
    const runBtn = tile("run", "Fugir", "bt-t-run");
    cmdGrid.append(fightBtn, swBtn, itBtn, runBtn);
    cmd.append(cmdGrid, moveGrid);
    const sheet = h("div", "bt-sheet");
    sheet.hidden = true;
    panel.append(prompt, cmd, sheet);
    const result = h("div", "bt-result");
    result.hidden = true;
    arena.append(view, panel, result);

    host.append(lobby, arena);

    function makeHud(box) {
      const top = h("div", "bt-hud-top");
      const name = h("span", "bt-hud-name");
      const types = h("span", "bt-hud-types");
      const lv = h("span", "bt-hud-lv");
      top.append(name, types, lv);
      const barRow = h("div", "bt-hud-bar");
      const bar = h("div", "bt-bar ticks");
      const fill = h("div", "bt-fill");
      bar.append(fill);
      barRow.append(h("span", "bt-pv", "PV"), bar);
      const bottom = h("div", "bt-hud-bottom");
      const dots = h("div", "bt-dots");
      const num = h("span", "bt-hud-num");
      bottom.append(dots, num);
      box.append(top, barRow, bottom);
      return { box, name, types, lv, fill, dots, num, hp: 0, max: 1, raf: 0 };
    }
    const huds = { me: makeHud(hudMe), foe: makeHud(hudFoe) };

    let state = { team: [], battle: null, inventory: {} };
    let shown = null;
    let stage = null;
    let busy = false;
    let pickUid = null;
    let note = "";
    let skip = null;
    let xpLog = {};
    let mode = "lobby";

    function show(which) {
      mode = which;
      lobby.hidden = which !== "lobby";
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
      if (!state.team.some(r => r.uid === pickUid)) pickUid = state.team.length ? state.team[0].uid : null;
      state.team.forEach(row => {
        const card = h("button", "bt-card" + (row.able ? "" : " off") + (row.uid === pickUid ? " sel" : ""));
        card.type = "button";
        card.setAttribute("aria-pressed", String(row.uid === pickUid));
        card.append(artImg(row.species));
        card.append(h("b", "", nameOf(row.species)), h("span", "bt-card-lv", row.able ? "Nv " + row.level : row.away ? "Expedição" : "Desmaiado"));
        const bar = h("span", "bt-bar small");
        const fill = h("span", "bt-fill");
        fill.style.width = Math.max(0, Math.min(100, row.life)) + "%";
        fill.style.background = lifeColor(row.life / 100);
        bar.append(fill);
        card.append(bar);
        card.addEventListener("click", () => {
          pickUid = row.uid;
          note = "";
          renderLobby();
        });
        teamList.append(card);
      });
      renderDetail();
      const able = state.team.filter(r => r.able).length;
      startBtn.innerHTML = icon("fight", 22, 2.6);
      startBtn.append(h("span", "", active ? "Continuar batalha" : "Procurar batalha"));
      startBtn.disabled = !active && !able;
      lobbyNote.textContent = active ? "Há uma batalha em andamento." : able ? able + (able === 1 ? " criatura pronta" : " criaturas prontas") + " para lutar." : "Nenhuma criatura do grupo pode lutar agora.";
    }

    async function toggleMove(row, id) {
      const on = row.moves.includes(id);
      let next;
      if (on) {
        if (row.moves.length <= 1) {
          note = "Deixe pelo menos um ataque equipado.";
          renderDetail();
          return;
        }
        next = row.moves.filter(x => x !== id);
      } else {
        if (row.moves.length >= Battle.MAX_MOVES) {
          note = "Já tem " + Battle.MAX_MOVES + " ataques. Toque em um equipado para tirar.";
          renderDetail();
          return;
        }
        next = row.moves.concat([id]);
      }
      note = "";
      row.moves = next;
      renderDetail();
      const r = await api.setMoves(row.uid, next);
      if (r) state = Object.assign(state, r);
      renderLobby();
    }

    function moveRow(info, extraCls) {
      const b = h("button", "bt-mrow" + (extraCls || ""));
      b.type = "button";
      b.style.setProperty("--tc", typeInfo(info.type).color);
      const name = h("span", "bt-mn");
      name.append(h("b", "", info.name));
      const sub = h("small");
      sub.innerHTML = icon(info.cat, 12, 2.3);
      sub.append(h("span", "", CAT[info.cat] + (info.cat !== "status" ? " · " + (info.acc ? info.acc + "% precisão" : "nunca erra") : "") + (info.desc ? " · " + info.desc : "")));
      name.append(sub);
      const pw = h("span", "bt-pw");
      pw.append(h("b", "", info.power ? String(info.power) : "–"), h("small", "", info.power ? "poder" : "status"));
      b.append(name, pill(info.type), pw);
      return b;
    }

    function renderDetail() {
      detail.innerHTML = "";
      const row = state.team.find(r => r.uid === pickUid);
      if (!row) return;
      const head = h("div", "bt-dhead");
      head.append(artImg(row.species, "bt-dart"));
      const hn = h("div", "bt-dname");
      hn.append(h("b", "", nameOf(row.species)));
      const types = h("div", "bt-types");
      (row.types || []).forEach(t => types.append(pill(t)));
      hn.append(types);
      if (!row.able) hn.append(h("span", "bt-why", row.away ? "Em expedição" : "Desmaiado · cure para lutar"));
      head.append(hn);
      detail.append(head);
      const base = Battle.speciesInfo(row.species).base;
      const stats = h("div", "bt-stats");
      STAT_ROWS.forEach(([k, label, color]) => {
        const st = h("div", "bt-stat");
        st.append(h("span", "", label), h("b", "", String(row.stats[k])));
        const bar = h("span", "bt-bar small");
        const fill = h("span", "bt-fill");
        fill.style.width = Math.min(100, (base[STAT_IDX[k]] / 130) * 100) + "%";
        fill.style.background = color;
        bar.append(fill);
        st.append(bar);
        stats.append(st);
      });
      detail.append(stats);
      const sec = h("div", "bt-sec-title");
      sec.append(h("b", "", "Ataques equipados"), h("span", "", row.moves.length + " de " + Battle.MAX_MOVES));
      detail.append(sec);
      if (note) detail.append(h("p", "bt-warnline", note));
      const list = h("div", "bt-mlist");
      const known = row.learnset.filter(e => e.known);
      const ordered = row.moves.map(id => known.find(e => e.id === id)).filter(Boolean).concat(known.filter(e => !row.moves.includes(e.id)));
      ordered.forEach(entry => {
        const info = Battle.moveInfo(entry.id);
        if (!info) return;
        const on = row.moves.includes(entry.id);
        const b = moveRow(info, on ? " on" : "");
        b.setAttribute("aria-pressed", String(on));
        b.addEventListener("click", () => toggleMove(row, entry.id));
        list.append(b);
      });
      const locked = row.learnset.filter(e => !e.known);
      if (locked.length) {
        list.append(h("p", "bt-sublabel", "Próximos ataques"));
        locked.forEach(entry => {
          const info = Battle.moveInfo(entry.id);
          if (!info) return;
          const b = moveRow(Object.assign({}, info, { desc: "" }), " locked");
          b.disabled = true;
          b.querySelector("small").innerHTML = icon("lock", 12, 2.3) + "<span>Libera no Nv " + entry.level + "</span>";
          list.append(b);
        });
      }
      detail.append(list);
    }

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
      hud.types.innerHTML = "";
      (Battle.speciesInfo(f.sp).types || []).forEach(t => hud.types.append(typeDot(t)));
      hud.lv.innerHTML = "Nv <b>" + f.lv + "</b>";
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
        if (side === "me") hud.num.innerHTML = Math.round(v) + "<small>/" + max + "</small>";
        else hud.num.textContent = "";
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
      movesBack.hidden = true;
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

    let cmdView = "cmd";

    function ready() {
      busy = false;
      if (!shown) return;
      if (shown.need || fighter(shown, "me").down) {
        msg.textContent = "Escolha quem vai entrar na batalha.";
        openSwitch(true);
        renderCmd(true);
        return;
      }
      cmdView = "cmd";
      msg.textContent = "O que " + nameOf(fighter(shown, "me").sp) + " vai fazer?";
      renderCmd(false);
    }

    function renderCmd(lock) {
      const f = shown && fighter(shown, "me");
      const list = f && !f.down ? f.moves : [];
      const showMoves = cmdView === "moves" && !lock;
      cmdGrid.hidden = showMoves;
      moveGrid.hidden = !showMoves;
      movesBack.hidden = !showMoves;
      moveGrid.innerHTML = "";
      const foe = shown && fighter(shown, "foe");
      list.forEach(id => {
        const m = Battle.MOVES[id];
        if (!m) return;
        const ti = typeInfo(m.type);
        const b = h("button", "bt-mv");
        b.type = "button";
        b.style.setProperty("--tc", ti.color);
        const badge = h("span", "bt-tb");
        badge.innerHTML = typeIcon(m.type, 18, 2.3);
        const name = h("span", "bt-mn");
        name.append(h("b", "", m.name));
        const sub = h("small");
        sub.innerHTML = icon(m.cat, 12, 2.3);
        sub.append(h("span", "", CAT[m.cat] + " · " + ti.name));
        name.append(sub);
        b.append(badge, name);
        if (m.cat !== "status" && foe && !foe.down) {
          const eff = Battle.effectiveness(m, foe.sp);
          if (eff !== 1) b.append(h("span", "bt-eff" + (eff >= 2 ? "" : " weak"), eff >= 2 ? "×" + eff : eff === 0 ? "×0" : eff === 0.25 ? "×¼" : "×½"));
        }
        const pw = h("span", "bt-pw");
        pw.append(h("b", "", m.power ? String(m.power) : "–"), h("small", "", m.power ? "poder" : "status"));
        b.append(pw);
        b.disabled = !!lock;
        b.addEventListener("click", () => send({ kind: "move", move: id }));
        moveGrid.append(b);
      });
      const usable = Battle.BATTLE_ITEMS.reduce((a, k) => a + (state.inventory[k] || 0), 0);
      const others = shown ? shown.me.filter((x, i) => !x.down && i !== shown.mi).length : 0;
      fightBtn.disabled = !!lock || !list.length;
      fightBtn.sub.textContent = list.length + (list.length === 1 ? " ataque" : " ataques");
      swBtn.disabled = !!lock || others === 0;
      swBtn.sub.textContent = others ? others + (others === 1 ? " pronto no grupo" : " prontos no grupo") : "Ninguém para trocar";
      itBtn.disabled = !!lock || !usable;
      itBtn.sub.textContent = usable ? usable + (usable === 1 ? " item" : " itens") : "Sem itens de batalha";
      runBtn.disabled = !!lock;
      runBtn.sub.textContent = "Sai sem recompensa";
    }

    fightBtn.addEventListener("click", () => {
      if (busy) return;
      cmdView = "moves";
      msg.textContent = "Escolha um ataque";
      renderCmd(false);
    });
    movesBack.addEventListener("click", () => {
      if (busy) return;
      ready();
    });

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
        const x = h("button", "bt-pback");
        x.type = "button";
        x.innerHTML = icon("back", 15, 2.8);
        x.append(h("span", "", "Voltar"));
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
      const art = artImg(f.sp, "bt-art small");
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
        const ic = h("span", "bt-item-ico");
        ic.innerHTML = icon("heal", 20, 2.3);
        const tx = h("span", "bt-item-txt");
        tx.append(h("strong", "", it.name), h("span", "bt-why", it.revive ? "Reanima com " + it.life + "% de vida" : "Recupera " + it.life + "% da vida"));
        b.append(ic, tx, h("span", "bt-qty", "×" + n));
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
      const yes = h("button", "bt-btn danger", "Fugir");
      const no = h("button", "bt-btn", "Continuar");
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
      if (mode === "lobby") renderLobby();
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
