const nameEl = document.getElementById("pet-name");
const fillEl = document.getElementById("fill");
const valueEl = document.getElementById("hunger-val");
const feedBtn = document.getElementById("feed");
const treatBtn = document.getElementById("treat");
const evolveBtn = document.getElementById("evolve");
const lifeFillEl = document.getElementById("life-fill");
const lifeValueEl = document.getElementById("life-val");
const joyFillEl = document.getElementById("joy-fill");
const joyValueEl = document.getElementById("joy-val");
const statusEl = document.getElementById("status");
const levelBadge = document.getElementById("level-badge");
const xpFillEl = document.getElementById("xp-fill");
const xpValueEl = document.getElementById("xp-val");
const toastEl = document.getElementById("toast");
let toastTimer = 0;
const closeBtn = document.getElementById("close");
const listEl = document.getElementById("pets");

const cardEl = document.getElementById("card");
const emailIn = document.getElementById("email");
const passIn = document.getElementById("password");
const authForm = document.getElementById("auth-form");
const signupBtn = document.getElementById("signup");
const signinBtn = document.getElementById("signin");
const skipBtn = document.getElementById("skip");
const authMsg = document.getElementById("auth-msg");
const authClose = document.getElementById("auth-close");
const accountEl = document.getElementById("account");
const accEmail = document.getElementById("acc-email");
const accStatus = document.getElementById("acc-status");
const accountBtn = document.getElementById("account-btn");
const openBoxBtn = document.getElementById("open-box");
const boxList = document.getElementById("box-list");
const boxClose = document.getElementById("box-close");
const openBagBtn = document.getElementById("open-bag");
const bagClose = document.getElementById("bag-close");
const bagScroll = document.getElementById("bag-scroll");
const bagCoins = document.getElementById("bag-coins");
const bagToast = document.getElementById("bag-toast");
const EXP_LABEL = { curta: "30 min", media: "2 h", longa: "8 h" };
const EXP_NAME = { curta: "Expedição curta", media: "Expedição média", longa: "Expedição longa" };
const expDraft = {};
let expPick = null;

function chip(p) {
  const c = el("span", "chip");
  c.append(dotFor(p), el("span", "", p.name));
  return c;
}
let bagMode = null;
const openShopBtn = document.getElementById("open-shop");
const openExpBtn = document.getElementById("open-exp");
const dailyBtn = document.getElementById("daily-btn");
const bagTitle = document.getElementById("bag-title");
const MODE_TITLE = { shop: "Loja", bag: "Mochila", exp: "Expedições" };
const sub = id => document.getElementById(id + "-sub");
const setTile = (btn, text, hot, disabled) => {
  sub(btn.id).textContent = text;
  btn.classList.toggle("hot", !!hot);
  btn.querySelector(".tile-dot").hidden = !hot;
  btn.disabled = !!disabled;
};
let bagToastTimer = 0;
let lastState = null;
let boxMode = false;
let pickFor = null;

let forceAuth = false;
let signedIn = false;
let authBusy = false;

function setMsg(text, kind) {
  authMsg.textContent = text;
  authMsg.className = kind || "";
}

function setBusy(on) {
  authBusy = on;
  signinBtn.disabled = on;
  signupBtn.disabled = on;
}

async function submit(kind) {
  if (authBusy) return;
  const email = emailIn.value.trim();
  const password = passIn.value;
  if (!email || !password) {
    setMsg("Preencha o e-mail e a senha.", "error");
    return;
  }
  setBusy(true);
  setMsg("Aguarde...", "");
  const r = await (kind === "signin" ? window.pet.signIn({ email, password }) : window.pet.signUp({ email, password }));
  setBusy(false);
  if (!r.ok) {
    setMsg(r.error, "error");
    return;
  }
  if (r.confirm) {
    setMsg("Conta criada. Abra o e-mail de confirmação e depois toque em Entrar.", "ok");
    return;
  }
  passIn.value = "";
  forceAuth = false;
  setMsg("", "");
}

function statusText(acc) {
  if (acc.error) return acc.error;
  if (acc.offline) return "Sem conexão. Salvo neste computador.";
  return "";
}

const barColor = v => (v > 50 ? "#5fbf8c" : v > 25 ? "#f2c14e" : "#e5645a");

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

function petInfo(p) {
  const info = el("span", "info");
  const line = el("span", "name-line");
  line.appendChild(el("span", "", p.name));
  line.appendChild(el("span", "lv", "Nv " + p.level));
  if (p.hunger <= 25) line.appendChild(el("span", "warn", "Fome"));
  if (p.joy <= 25) line.appendChild(el("span", "warn", "Triste"));
  if (p.dying) line.appendChild(el("span", "warn", "Morrendo"));
  if (p.away) line.appendChild(el("span", "away", p.ready ? "Voltou" : "Explorando"));
  info.appendChild(line);
  return info;
}

function describe(p) {
  return (
    p.name + ", nível " + p.level + ", fome " + Math.round(p.hunger) + "%, vida " + Math.round(p.life) + "%, felicidade " + Math.round(p.joy) + "%" +
    (p.dying ? ", morrendo" : "")
  );
}

function dotFor(p) {
  const d = el("span", "dot");
  d.style.background = p.color;
  return d;
}

function renderParty(s) {
  listEl.textContent = "";
  s.party.forEach(p => {
    const btn = el("button", "pet");
    btn.type = "button";
    btn.setAttribute("aria-label", describe(p));
    btn.setAttribute("aria-pressed", String(p.id === s.pet));
    btn.disabled = !!p.away;
    btn.append(dotFor(p), petInfo(p));
    btn.addEventListener("click", () => window.pet.selectPet(p.id));
    listEl.appendChild(btn);
  });
}

function renderBox(s) {
  boxList.textContent = "";
  if (!s.box.length) {
    boxList.appendChild(el("p", "", "A caixa está vazia."));
    return;
  }
  s.box.forEach(p => {
    const item = el("div", "box-item");
    const line = el("div", "line");
    const swap = el("button", "swap", pickFor === p.id ? "Cancelar" : "Trocar");
    swap.type = "button";
    swap.setAttribute("aria-label", (pickFor === p.id ? "Cancelar troca de " : "Trocar ") + p.name);
    swap.addEventListener("click", () => {
      pickFor = pickFor === p.id ? null : p.id;
      renderBox(lastState);
    });
    line.append(dotFor(p), petInfo(p), swap);
    item.appendChild(line);
    if (pickFor === p.id) {
      const picker = el("div", "picker");
      picker.appendChild(el("span", "who", "Quem sai do grupo?"));
      s.party.forEach(q => {
        const b = el("button", "");
        b.type = "button";
        b.setAttribute("aria-label", "Trocar " + q.name + " por " + p.name);
        b.append(dotFor(q), petInfo(q));
        b.addEventListener("click", () => {
          pickFor = null;
          window.pet.swapParty(q.id, p.id);
        });
        picker.appendChild(b);
      });
      item.appendChild(picker);
    }
    boxList.appendChild(item);
  });
}

function fmtTime(ms) {
  const sec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = String(sec % 60).padStart(2, "0");
  return h ? h + ":" + String(m).padStart(2, "0") + ":" + ss : m + ":" + ss;
}

function effect(it) {
  const parts = [];
  if (it.revive) parts.push("Tira do estado Morrendo");
  if (it.hunger) parts.push(it.hunger >= 100 ? "Fome cheia" : "+" + it.hunger + " fome");
  if (it.life && !it.revive) parts.push(it.life >= 100 ? "Vida cheia" : "+" + it.life + " vida");
  if (it.joy) parts.push(it.joy >= 100 ? "Felicidade cheia" : "+" + it.joy + " felicidade");
  if (it.xp) parts.push("+" + it.xp + " XP");
  if (!parts.length && it.sell) parts.push("Vale " + it.sell + " moedas");
  return parts.join(" · ");
}

function bagSay(text) {
  if (!text) return;
  bagToast.textContent = text;
  bagToast.hidden = false;
  clearTimeout(bagToastTimer);
  bagToastTimer = setTimeout(() => {
    bagToast.hidden = true;
  }, 4000);
}

async function eco(p) {
  const msg = await window.pet.eco(p);
  if (msg) bagSay(msg);
}

function btn(text, cls, onClick, disabled) {
  const b = el("button", cls || "", text);
  b.type = "button";
  b.disabled = !!disabled;
  b.addEventListener("click", onClick);
  return b;
}

const ITEM_ICONS = {
  fruta: '<circle cx="12" cy="14" r="7" fill="#e5484d"/><path d="M12 7c0-2 1-3 3-4" stroke="#6b4423" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M13 6c2-1 4 0 5 1-2 1-4 1-5-1z" fill="#4caf50"/>',
  doce: '<path d="M3 9l4 3-4 3zM21 9l-4 3 4 3z" fill="#f48fb1"/><circle cx="12" cy="12" r="5.5" fill="#ec407a"/><path d="M9 10c2 1 4 3 6 4" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/>',
  petisco: '<path d="M6 8a2.5 2.5 0 1 1 3-3l6 6a2.5 2.5 0 1 1 3 3 2.5 2.5 0 1 1-3 3l-6-6a2.5 2.5 0 1 1-3-3z" fill="#d7a86e"/>',
  peixe: '<path d="M3 12c3-5 10-6 14 0-4 6-11 5-14 0z" fill="#4fa3e0"/><path d="M17 12l4-4v8z" fill="#3a86c0"/><circle cx="8" cy="11" r="1.2" fill="#123"/>',
  pocao: '<path d="M10 3h4v4l3 5a5 5 0 1 1-10 0l3-5z" fill="#f06363"/><rect x="9.5" y="2" width="5" height="2" rx="1" fill="#8d6e63"/>',
  "pocao-grande": '<path d="M9 2h6v4l4 6a7 7 0 1 1-14 0l4-6z" fill="#d32f2f"/><rect x="8.5" y="1" width="7" height="2.4" rx="1" fill="#8d6e63"/><path d="M9 14h6M12 11v6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  reviver: '<path d="M12 2l2.6 6.3 6.4.4-5 4.2 1.7 6.6L12 16l-5.7 3.5L8 12.9 3 8.7l6.4-.4z" fill="#ffca28"/><path d="M12 8v6M9 11h6" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  dourada: '<circle cx="12" cy="14" r="7" fill="#f6c343"/><circle cx="9.5" cy="11.5" r="1.8" fill="#fff6c8"/><path d="M12 7c0-2 1-3 3-4" stroke="#6b4423" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M13 6c2-1 4 0 5 1-2 1-4 1-5-1z" fill="#4caf50"/>',
  cristal: '<path d="M12 2l6 7-6 13-6-13z" fill="#9c7cf4"/><path d="M6 9h12M12 2l-2 7 2 13 2-13z" stroke="#e6dcff" stroke-width="1" fill="none"/>',
  ovo: '<path d="M12 2.5c3.8 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3.2-11 7-11z" fill="#fff3df" stroke="#d9c7a8" stroke-width="1"/><circle cx="9.5" cy="12" r="2" fill="#b9a7d6"/><circle cx="14.5" cy="16" r="1.6" fill="#b9a7d6"/>'
};

function itemLine(it, extra) {
  const row = el("div", "it");
  const ico = el("span", "it-ico");
  ico.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">' + (ITEM_ICONS[it.id] || "") + "</svg>";
  row.appendChild(ico);
  const info = el("span", "info");
  const line = el("span", "name-line");
  line.appendChild(el("span", "", it.name));
  if (extra) line.appendChild(el("span", "lv", extra));
  info.append(line, el("span", "eff", effect(it)));
  row.appendChild(info);
  return row;
}

function renderBag(s) {
  bagTitle.textContent = MODE_TITLE[bagMode] || "";
  bagCoins.textContent = bagMode === "shop" ? s.coins + " moedas" : "";
  bagScroll.textContent = "";
  if (bagMode === "shop") renderShopPart(s);
  else if (bagMode === "exp") renderExpPart(s);
  else renderItemsPart(s);
}

function renderShopPart(s) {
  bagScroll.appendChild(el("p", "", "O que você compra vai para a mochila. O grupo rende moedas toda hora enquanto está alimentado e feliz."));
  const egg = itemLine({ id: "ovo", name: "Ovo misterioso" }, "");
  egg.querySelector(".eff").textContent = "Nasce uma criatura aleatória";
  const eggBox = el("span", "it-btns");
  eggBox.appendChild(btn(String(s.eggPrice), "price", () => eco({ op: "egg" }), s.coins < s.eggPrice || !s.eggPool));
  egg.appendChild(eggBox);
  bagScroll.appendChild(egg);
  s.items.filter(it => it.price).forEach(it => {
    const row = itemLine(it, it.count ? "tem " + it.count : "");
    const box = el("span", "it-btns");
    box.appendChild(btn(String(it.price), "price", () => eco({ op: "buy", item: it.id }), s.coins < it.price));
    row.appendChild(box);
    bagScroll.appendChild(row);
  });
}

function renderItemsPart(s) {
  const cur = s.party.find(p => p.id === s.pet);
  const have = s.items.filter(it => it.count > 0);
  if (!have.length) {
    bagScroll.appendChild(el("p", "", "A mochila está vazia. Compre itens na loja ou mande bichinhos em expedições."));
    bagScroll.appendChild(btn("Ir para a loja", "solid", () => setMode("shop")));
  }
  else bagScroll.appendChild(el("p", "", "Os itens são usados em " + (cur ? cur.name : "") + "."));
  have.forEach(it => {
    const row = itemLine(it, "x" + it.count);
    const box = el("span", "it-btns");
    if (it.hunger || it.life || it.joy || it.xp || it.revive) box.appendChild(btn("Usar", "", () => eco({ op: "use", item: it.id }), !it.canUse));
    if (it.sell) box.appendChild(btn("Vender " + it.sell, "ghost", () => eco({ op: "sell", item: it.id })));
    row.appendChild(box);
    bagScroll.appendChild(row);
  });
}

function renderExpPart(s) {
  bagScroll.appendChild(el("p", "", "Até " + s.expeditionSize + " criaturas por expedição, do grupo ou da caixa. Quem sai não gasta nada e volta com moedas e itens do seu tipo."));
  const rows = {};
  s.party.concat(s.box).forEach(p => (rows[p.id] = p));
  s.expeditionKinds.forEach(kind => {
    const run = s.expeditions.find(x => x.kind === kind);
    const card = el("div", "exp");
    const head = el("div", "exp-head");
    head.append(el("span", "exp-name", EXP_NAME[kind]), el("span", "lv", EXP_LABEL[kind]));
    card.appendChild(head);
    if (run) {
      const who = el("div", "exp-who");
      run.pets.forEach(id => rows[id] && who.appendChild(chip(rows[id])));
      card.appendChild(who);
      if (run.endsAt > Date.now()) {
        const t = el("span", "time", "Volta em " + fmtTime(run.endsAt - Date.now()));
        t.dataset.ends = String(run.endsAt);
        card.appendChild(t);
      } else {
        card.appendChild(btn("Receber", "solid", () => eco({ op: "collect", kind })));
      }
    } else {
      const draft = (expDraft[kind] = (expDraft[kind] || []).filter(id => rows[id] && rows[id].canExplore));
      const who = el("div", "exp-who");
      draft.forEach(id => who.appendChild(chip(rows[id])));
      if (!draft.length) who.appendChild(el("span", "eff", "Ninguém escolhido"));
      card.appendChild(who);
      if (expPick === kind) {
        const pick = el("div", "exp-pick");
        s.party.concat(s.box).forEach(p => {
          const on = draft.includes(p.id);
          const b = el("button", "pet");
          b.type = "button";
          b.setAttribute("aria-pressed", String(on));
          b.disabled = !on && (!p.canExplore || draft.length >= s.expeditionSize);
          b.append(dotFor(p), petInfo(p));
          b.addEventListener("click", () => {
            const at = draft.indexOf(p.id);
            if (at >= 0) draft.splice(at, 1);
            else if (draft.length < s.expeditionSize) draft.push(p.id);
            renderBag(lastState);
          });
          pick.appendChild(b);
        });
        card.appendChild(pick);
      }
      const row = el("div", "it-btns");
      row.appendChild(btn(expPick === kind ? "Pronto" : "Escolher", "ghost", () => {
        expPick = expPick === kind ? null : kind;
        renderBag(lastState);
      }));
      row.appendChild(btn("Partir", "", async () => {
        const ids = draft.slice();
        expPick = null;
        const msg = await window.pet.eco({ op: "explore", kind, ids });
        if (msg !== "Expedição partiu") {
          bagSay(msg || "Não deu para partir.");
          if (lastState) renderBag(lastState);
          return;
        }
        expDraft[kind] = [];
        bagSay(msg);
        if (lastState) renderBag(lastState);
      }, !draft.length));
      card.appendChild(row);
    }
    bagScroll.appendChild(card);
  });
}

function renderAccount(acc) {
  signedIn = acc.signedIn;
  const showAuth = acc.configured && !acc.signedIn && (!acc.guest || forceAuth);
  cardEl.classList.toggle("auth-mode", showAuth);
  accountEl.hidden = !acc.configured;
  if (!acc.configured) return;
  if (acc.signedIn) {
    accEmail.textContent = acc.email || "";
    accStatus.textContent = statusText(acc);
    accStatus.hidden = !accStatus.textContent;
    accountBtn.textContent = "Sair";
  } else {
    accEmail.textContent = "Sem conta";
    accStatus.textContent = "O progresso fica só neste computador.";
    accStatus.hidden = false;
    accountBtn.textContent = "Entrar";
  }
}

function render(s) {
  lastState = s;
  renderAccount(s.account);
  if (pickFor && !s.box.some(p => p.id === pickFor)) pickFor = null;
  if (boxMode && s.box.length === 0) boxMode = false;
  if (s.needsStarter) bagMode = null;
  if (!cardEl.classList.contains("auth-mode")) {
    cardEl.classList.toggle("box-mode", boxMode);
    cardEl.classList.toggle("bag-mode", bagMode && !boxMode);
  }
  const itemCount = s.items.reduce((n, it) => n + it.count, 0);
  const ready = s.expeditions.filter(x => x.endsAt <= s.now).length;
  setTile(openShopBtn, s.coins + " moedas", false);
  setTile(openBagBtn, itemCount ? itemCount + (itemCount === 1 ? " item" : " itens") : "Vazia", false);
  setTile(openExpBtn, ready ? (ready === 1 ? "1 voltou!" : ready + " voltaram!") : s.expeditions.length ? s.expeditions.length + " em andamento" : "Nenhuma", ready > 0);
  setTile(openBoxBtn, s.box.length ? s.box.length + (s.box.length === 1 ? " bichinho" : " bichinhos") : "Vazia", false, s.box.length === 0);
  dailyBtn.hidden = !(s.daily && s.daily.available);
  if (s.daily && s.daily.available) dailyBtn.textContent = "Presente do dia: pegar " + s.daily.coins + " moedas" + (s.daily.streak > 1 ? " (" + s.daily.streak + " dias seguidos)" : "");
  if (bagMode) renderBag(s);
  renderParty(s);
  renderBox(s);
  cardEl.classList.toggle("empty-mode", !!s.needsStarter);
  const cur = s.party.find(p => p.id === s.pet);
  nameEl.textContent = cur ? cur.name : s.needsStarter ? "Pets" : "";
  const v = Math.round(s.hunger);
  fillEl.style.width = v + "%";
  fillEl.style.background = barColor(s.hunger);
  valueEl.textContent = v + "%";
  const l = Math.round(s.life);
  lifeFillEl.style.width = l + "%";
  lifeFillEl.style.background = barColor(s.life);
  lifeValueEl.textContent = l + "%";
  const j = Math.round(typeof s.joy === "number" ? s.joy : 100);
  joyFillEl.style.width = j + "%";
  joyFillEl.style.background = barColor(j);
  joyValueEl.textContent = j + "%";
  statusEl.textContent = s.needsStarter
    ? ""
    : [s.hunger <= 25 && "Fome", s.joy <= 25 && "Triste", s.dying && "Morrendo"].filter(Boolean).join(" ");
  treatBtn.disabled = s.life >= 100;
  evolveBtn.hidden = !s.evolveTo;

  feedBtn.disabled = Math.round(s.hunger) >= 100;
  levelBadge.textContent = "Nível " + s.level;
  xpFillEl.style.width = Math.min(100, (s.xp / s.xpNext) * 100) + "%";
  xpValueEl.textContent = Math.floor(s.xp) + " / " + s.xpNext;
}

window.pet.onLevelUp(n => {
  toastEl.textContent = typeof n === "string" ? n : "Subiu para o nível " + n + "!";
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 4000);
});
window.pet.onState(render);
window.pet.getState().then(render);

authForm.addEventListener("submit", e => {
  e.preventDefault();
  submit("signin");
});
signupBtn.addEventListener("click", () => submit("signup"));
skipBtn.addEventListener("click", () => window.pet.skipAuth());
authClose.addEventListener("click", () => window.pet.closePanel());
accountBtn.addEventListener("click", async () => {
  if (signedIn) {
    await window.pet.signOut();
    forceAuth = true;
    setMsg("", "");
  } else {
    forceAuth = true;
    window.pet.getState().then(render);
  }
});

function setMode(m) {
  bagMode = m;
  boxMode = false;
  expPick = null;
  bagScroll.scrollTop = 0;
  if (lastState) render(lastState);
}
openShopBtn.addEventListener("click", () => setMode("shop"));
openBagBtn.addEventListener("click", () => setMode("bag"));
openExpBtn.addEventListener("click", () => setMode("exp"));
bagClose.addEventListener("click", () => setMode(null));
dailyBtn.addEventListener("click", async () => {
  const msg = await window.pet.eco({ op: "daily" });
  if (msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 4000);
  }
});
document.getElementById("site-btn").addEventListener("click", () => window.pet.openSite());
setInterval(() => {
  if (!bagMode || !lastState) return;
  if (lastState.expeditions.some(x => x.endsAt <= Date.now() && x.endsAt > lastState.now)) window.pet.getState().then(render);
  else bagScroll.querySelectorAll("[data-ends]").forEach(t => (t.textContent = "Volta em " + fmtTime(Number(t.dataset.ends) - Date.now())));
}, 1000);
openBoxBtn.addEventListener("click", () => {
  bagMode = null;
  boxMode = true;
  pickFor = null;
  if (lastState) render(lastState);
});
boxClose.addEventListener("click", () => {
  boxMode = false;
  pickFor = null;
  if (lastState) render(lastState);
});

feedBtn.addEventListener("click", () => window.pet.feed());
treatBtn.addEventListener("click", () => window.pet.treat());
evolveBtn.addEventListener("click", () => window.pet.evolve());
closeBtn.addEventListener("click", () => window.pet.closePanel());
window.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (bagMode) {
    bagMode = null;
    if (lastState) render(lastState);
  } else if (boxMode) {
    boxMode = false;
    pickFor = null;
    if (lastState) render(lastState);
  } else {
    window.pet.closePanel();
  }
});

document.getElementById("open-site").addEventListener("click", () => window.pet.openSite());
