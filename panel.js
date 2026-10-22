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
const profileBtn = document.getElementById("profile-btn");
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

function fadeList() {
  listEl.classList.toggle("more", listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight > 2);
}
listEl.addEventListener("scroll", fadeList);
window.addEventListener("resize", fadeList);

let releaseAsk = null;
function moreFor(p) {
  if (!p.canRelease) return null;
  const b = el("button", "more-btn");
  b.type = "button";
  b.title = "Mais opções";
  b.setAttribute("aria-label", "Mais opções para " + p.name);
  b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="5" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/></svg>';
  b.addEventListener("click", e => {
    e.stopPropagation();
    releaseAsk = releaseAsk === p.id ? null : p.id;
    if (lastState) render(lastState);
  });
  return b;
}
function releaseBox(p) {
  const box = el("div", "release-ask");
  box.appendChild(el("p", "", "Liberar " + p.name + "? Ela sai da sua conta para sempre, junto com o XP."));
  const row = el("div", "release-btns");
  const no = el("button", "ghost", "Cancelar");
  no.type = "button";
  no.addEventListener("click", () => {
    releaseAsk = null;
    if (lastState) render(lastState);
  });
  const yes = el("button", "danger", "Liberar");
  yes.type = "button";
  yes.addEventListener("click", async () => {
    releaseAsk = null;
    const msg = await window.pet.eco({ op: "release", id: p.id });
    if (msg) showToast(msg);
  });
  row.append(no, yes);
  box.appendChild(row);
  requestAnimationFrame(() => box.isConnected && box.scrollIntoView({ block: "nearest" }));
  return box;
}

function renderParty(s) {
  const keep = listEl.scrollTop;
  listEl.textContent = "";
  s.party.forEach(p => {
    const btn = el("button", "pet");
    btn.type = "button";
    btn.setAttribute("aria-label", describe(p));
    btn.setAttribute("aria-pressed", String(p.id === s.pet));
    btn.disabled = !!p.away;
    btn.append(dotFor(p), petInfo(p));
    btn.addEventListener("click", () => window.pet.selectPet(p.id));
    const wrap = el("div", "pet-wrap");
    wrap.appendChild(btn);
    const more = moreFor(p);
    if (more) wrap.appendChild(more);
    listEl.appendChild(wrap);
    if (releaseAsk === p.id) listEl.appendChild(releaseBox(p));
  });
  listEl.scrollTop = keep;
  requestAnimationFrame(fadeList);
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
    const more = moreFor(p);
    line.append(dotFor(p), petInfo(p));
    if (more) line.appendChild(more);
    line.appendChild(swap);
    item.appendChild(line);
    if (releaseAsk === p.id) item.appendChild(releaseBox(p));
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

async function collect(kind) {
  const r = await window.pet.eco({ op: "collect", kind });
  if (!r || !r.chest) return;
  if (!window.PetChest) {
    bagSay("Voltaram com " + r.coins + " moedas");
    return;
  }
  window.PetChest.open({
    host: document.body,
    title: (EXP_NAME[r.kind] || "Expedição") + " voltou!",
    subtitle: r.pets.join(", "),
    coins: r.coins,
    items: r.items.map(it => ({
      html: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' + (ITEM_ICONS[it.id] || "") + "</svg>",
      name: it.name,
      count: it.count
    })),
    notes: r.ups
  });
}

async function eco(p) {
  const msg = await window.pet.eco(p);
  if (msg) bagSay(msg);
}

const shopBagBtn = document.getElementById("shop-bag");
const bagNewEl = document.getElementById("bag-new");
const bought = {};
let bagNew = 0;
let shownCoins = null;
let coinAnim = 0;

function setCoins(value, animate) {
  if (!bagCoins.firstChild || bagCoins.firstChild.nodeType !== 3) bagCoins.prepend(document.createTextNode(""));
  const txt = bagCoins.firstChild;
  cancelAnimationFrame(coinAnim);
  coinAnim = 0;
  if (!animate || shownCoins === null || shownCoins === value) {
    shownCoins = value;
    txt.nodeValue = value + " moedas";
    return;
  }
  const from = shownCoins;
  const t0 = performance.now();
  const step = now => {
    const k = Math.max(0, Math.min(1, (now - t0) / 600));
    shownCoins = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)));
    txt.nodeValue = shownCoins + " moedas";
    coinAnim = k < 1 ? requestAnimationFrame(step) : 0;
  };
  coinAnim = requestAnimationFrame(step);
  bagCoins.classList.remove("got");
  void bagCoins.offsetWidth;
  bagCoins.classList.add("got");
  const d = el("span", "coin-delta", (value < from ? "-" : "+") + Math.abs(value - from));
  bagCoins.appendChild(d);
  setTimeout(() => d.remove(), 1000);
}

function relRect(r) {
  const c = cardEl.getBoundingClientRect();
  return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
}

function flyIcon(html, fromRect, toEl, onDone) {
  const node = el("span", "fly");
  node.innerHTML = html;
  cardEl.appendChild(node);
  const a = relRect(fromRect);
  const b = relRect(toEl.getBoundingClientRect());
  const x0 = a.x + a.w / 2 - 15;
  const y0 = a.y + a.h / 2 - 15;
  const x1 = b.x + b.w / 2 - 15;
  const y1 = b.y + b.h / 2 - 15;
  const lift = Math.min(y0, y1) - 50;
  const frames = [];
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const y = (1 - k) * (1 - k) * y0 + 2 * (1 - k) * k * lift + k * k * y1;
    frames.push({ transform: "translate(" + (x0 + (x1 - x0) * k) + "px," + y + "px) scale(" + (1.15 - k * 0.6) + ")", opacity: k > 0.9 ? 0.3 : 1 });
  }
  let done = false;
  const fin = () => {
    if (done) return;
    done = true;
    node.remove();
    toEl.classList.remove("got");
    void toEl.offsetWidth;
    toEl.classList.add("got");
    if (onDone) onDone();
  };
  const an = node.animate(frames, { duration: 650, easing: "cubic-bezier(0.4, 0, 0.6, 1)", fill: "forwards" });
  an.onfinish = fin;
  setTimeout(fin, 750);
}

function sparkle(rect) {
  const r = relRect(rect);
  for (let i = 0; i < 12; i++) {
    const p = el("span", "spark");
    p.style.left = r.x + r.w / 2 + "px";
    p.style.top = r.y + r.h / 2 + "px";
    const a = (i / 12) * Math.PI * 2;
    const d = 26 + (i % 3) * 12;
    p.style.setProperty("--dx", Math.cos(a) * d + "px");
    p.style.setProperty("--dy", Math.sin(a) * d + "px");
    cardEl.appendChild(p);
    setTimeout(() => p.remove(), 750);
  }
}

function showBagNew() {
  bagNewEl.textContent = "+" + bagNew;
  bagNewEl.hidden = bagNew <= 0;
}

async function buy(op, id, row) {
  if (bought[id] && bought[id] > Date.now()) return;
  const before = lastState ? lastState.coins : null;
  const icoRect = row.querySelector(".it-ico").getBoundingClientRect();
  const html = row.querySelector(".it-ico").innerHTML;
  const msg = await window.pet.eco(op === "egg" ? { op: "egg" } : { op: "buy", item: id });
  if (!msg) return;
  bought[id] = Date.now() + (op === "egg" ? 1600 : 900);
  setTimeout(() => lastState && bagMode === "shop" && renderBag(lastState), op === "egg" ? 1650 : 950);
  if (before !== null && lastState && lastState.coins !== before) {
    shownCoins = before;
    setCoins(lastState.coins, true);
  }
  if (lastState) renderBag(lastState);
  const fresh = bagScroll.querySelector('[data-item="' + id + '"]');
  if (fresh) {
    fresh.classList.add("bought");
    if (op === "egg") fresh.querySelector(".it-ico").classList.add("hop");
  }
  if (op === "egg") {
    sparkle(icoRect);
  } else {
    flyIcon(html, icoRect, shopBagBtn, () => {
      bagNew += 1;
      showBagNew();
    });
  }
}

function btn(text, cls, onClick, disabled) {
  const b = el("button", cls || "", text);
  b.type = "button";
  if (!text && /\bdone\b/.test(cls || "")) b.setAttribute("aria-label", "Comprado");
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
  shopBagBtn.hidden = bagMode !== "shop";
  showBagNew();
  if (bagMode !== "shop") {
    bagCoins.textContent = "";
    shownCoins = null;
  } else if (!coinAnim) setCoins(s.coins, shownCoins !== null);
  if (bagMode === "bag" && bagTab === "eggs" && hatching) return;
  bagScroll.textContent = "";
  if (bagMode === "shop") renderShopPart(s);
  else if (bagMode === "exp") renderExpPart(s);
  else {
    const tabs = el("div", "bag-tabs");
    const eggCount = s.eggs.length;
    const readyEggs = s.eggs.filter(e => e.slot !== null && eggNow(s, e).left <= 0).length;
    [["items", "Itens"], ["eggs", "Ovos" + (eggCount ? " (" + eggCount + ")" : "")]].forEach(([k, label]) => {
      const t = btn(label, "bag-tab" + (bagTab === k ? " on" : ""), () => {
        bagTab = k;
        renderBag(lastState);
      });
      t.setAttribute("aria-pressed", String(bagTab === k));
      if (k === "eggs" && readyEggs) t.appendChild(el("span", "tab-dot"));
      tabs.appendChild(t);
    });
    bagScroll.appendChild(tabs);
    if (bagTab === "eggs") renderEggsPart(s);
    else renderItemsPart(s);
  }
}

let bagTab = "items";
let eggSel = 0;
let hatching = false;
let eggTicker = 0;

function eggNow(s, e) {
  if (e.slot === null) return { left: e.left, care: e.care };
  const min = Math.max(0, (Date.now() - (s.now || Date.now())) / 60000);
  const active = Math.min(min, e.care / s.careDecay);
  return { left: Math.max(0, e.left - active * 60000), care: Math.max(0, e.care - min * s.careDecay) };
}

function eggSvg(color, size) {
  const w = size || 34;
  return '<svg viewBox="0 0 24 28" width="' + w + '" height="' + Math.round(w * 28 / 24) + '" aria-hidden="true"><path d="M12 1.5C7 1.5 3 9.5 3 16.5a9 9 0 0 0 18 0C21 9.5 17 1.5 12 1.5z" fill="' + color + '" stroke="rgba(0,0,0,0.25)" stroke-width="1"/><circle cx="8.5" cy="15" r="1.9" fill="#ffffff" opacity="0.75"/><circle cx="15" cy="10" r="1.4" fill="#ffffff" opacity="0.7"/><circle cx="14.5" cy="20" r="2.3" fill="#ffffff" opacity="0.65"/><ellipse cx="8" cy="8.5" rx="1.6" ry="2.6" fill="#ffffff" opacity="0.55" transform="rotate(25 8 8.5)"/></svg>';
}

function slotOf(s, i) {
  return s.eggs.find(e => e.slot === i) || null;
}

function renderEggsPart(s) {
  if (!slotOf(s, eggSel)) {
    const f = [0, 1, 2].find(i => slotOf(s, i));
    if (f !== undefined) eggSel = f;
  }
  const slots = el("div", "egg-slots");
  for (let i = 0; i < s.incubatorSlots; i++) {
    const e = slotOf(s, i);
    const b = el("button", "egg-slot" + (e ? "" : " empty") + (i === eggSel ? " on" : ""));
    b.type = "button";
    b.setAttribute("aria-pressed", String(i === eggSel));
    if (e) {
      const ico = el("span", "egg-ico");
      ico.innerHTML = eggSvg(e.color, 30);
      const n = eggNow(s, e);
      if (n.left <= 0) ico.classList.add("ready");
      else if (n.care <= 0) ico.classList.add("cold");
      b.appendChild(ico);
      const tm = el("span", "egg-time", n.left <= 0 ? "Pronto!" : fmtTime(n.left));
      tm.dataset.slot = String(i);
      b.appendChild(tm);
    } else {
      b.appendChild(el("span", "egg-empty-ico", "+"));
      b.appendChild(el("span", "egg-time", "Vazio"));
    }
    b.addEventListener("click", () => {
      eggSel = i;
      renderBag(lastState);
    });
    slots.appendChild(b);
  }
  bagScroll.appendChild(slots);
  const e = slotOf(s, eggSel);
  if (e) {
    const n = eggNow(s, e);
    const card = el("div", "egg-card");
    if (n.left <= 0) {
      card.appendChild(el("p", "egg-msg", "Pronto para chocar!"));
      const go = btn("Chocar", "solid hatch-btn", () => hatch(e, card));
      card.appendChild(go);
    } else {
      const row = el("div", "egg-care");
      row.appendChild(el("span", "", "Cuidado"));
      const track = el("div", "track");
      const fill = el("div", "care-fill");
      fill.style.width = Math.round(n.care) + "%";
      fill.style.background = barColor(n.care);
      track.appendChild(fill);
      row.appendChild(track);
      row.appendChild(el("span", "care-val", Math.round(n.care) + "%"));
      card.appendChild(row);
      card.appendChild(el("p", "egg-msg", n.care <= 0 ? "Sem cuidado o ovo para de chocar. Limpe e brinque com ele." : "Mantenha o cuidado alto para o tempo continuar correndo."));
      const acts = el("div", "row-buttons");
      [["clean", "Limpar"], ["play", "Brincar"]].forEach(([k, t]) => {
        acts.appendChild(
          btn(t, "ghost", async () => {
            const ico = bagScroll.querySelector(".egg-slot.on .egg-ico");
            if (ico) {
              ico.classList.remove("wiggle");
              void ico.offsetWidth;
              ico.classList.add("wiggle");
            }
            await window.pet.eco({ op: "care", id: e.id, kind: k });
          }, n.care >= 99.5)
        );
      });
      card.appendChild(acts);
    }
    bagScroll.appendChild(card);
  } else {
    bagScroll.appendChild(el("p", "", "Espaço vazio. Escolha um ovo guardado para colocar aqui."));
  }
  const inv = s.eggs.filter(x => x.slot === null);
  const full = [0, 1, 2].every(i => slotOf(s, i));
  bagScroll.appendChild(el("h3", "egg-sub", "Guardados" + (inv.length ? " (" + inv.length + ")" : "")));
  if (!inv.length) {
    bagScroll.appendChild(el("p", "", "Nenhum ovo guardado. Compre ovos na loja."));
    bagScroll.appendChild(btn("Ir para a loja", "solid", () => setMode("shop")));
  }
  inv.forEach(x => {
    const row = el("div", "it");
    const ico = el("span", "it-ico");
    ico.innerHTML = eggSvg(x.color, 20);
    row.appendChild(ico);
    const info = el("span", "info");
    info.append(el("span", "name-line", "Ovo misterioso"), el("span", "eff", full ? "A chocadeira está cheia" : "Leve para a chocadeira"));
    row.appendChild(info);
    const box = el("span", "it-btns");
    box.appendChild(
      btn("Chocadeira", "", async () => {
        const free = [0, 1, 2].find(i => !slotOf(lastState, i));
        if (free !== undefined) eggSel = free;
        const r = await window.pet.eco({ op: "incubate", id: x.id });
        if (r && r !== "Ovo foi para a chocadeira") bagSay(r);
      }, full)
    );
    row.appendChild(box);
    bagScroll.appendChild(row);
  });
  clearInterval(eggTicker);
  eggTicker = setInterval(tickEggTimes, 1000);
}

function tickEggTimes() {
  if (!lastState || bagMode !== "bag" || bagTab !== "eggs") {
    clearInterval(eggTicker);
    return;
  }
  if (hatching) return;
  let flip = false;
  bagScroll.querySelectorAll(".egg-time[data-slot]").forEach(t => {
    const e = slotOf(lastState, Number(t.dataset.slot));
    if (!e) return;
    const n = eggNow(lastState, e);
    const txt = n.left <= 0 ? "Pronto!" : fmtTime(n.left);
    if (txt === "Pronto!" && t.textContent !== "Pronto!") flip = true;
    t.textContent = txt;
  });
  const sel = slotOf(lastState, eggSel);
  if (sel) {
    const n = eggNow(lastState, sel);
    const fill = bagScroll.querySelector(".care-fill");
    const val = bagScroll.querySelector(".care-val");
    if (fill) {
      fill.style.width = Math.round(n.care) + "%";
      fill.style.background = barColor(n.care);
    }
    if (val) val.textContent = Math.round(n.care) + "%";
  }
  if (flip) renderBag(lastState);
}

async function hatch(e, card) {
  if (hatching) return;
  hatching = true;
  const ico = bagScroll.querySelector(".egg-slot.on .egg-ico");
  card.textContent = "";
  const stage = el("div", "hatch-stage");
  const big = el("span", "hatch-egg");
  big.innerHTML = eggSvg(e.color, 64);
  stage.appendChild(big);
  card.appendChild(stage);
  if (ico) ico.style.visibility = "hidden";
  await new Promise(res => setTimeout(res, 1300));
  const r = await window.pet.eco({ op: "hatch", id: e.id });
  big.classList.add("pop");
  await new Promise(res => setTimeout(res, 260));
  stage.textContent = "";
  if (r && r.hatched) {
    const burst = el("div", "hatch-burst");
    burst.style.setProperty("--c", r.color);
    stage.appendChild(burst);
    stage.appendChild(el("p", "hatch-name", "Nasceu um " + r.name + "!"));
    stage.appendChild(el("p", "egg-msg", "Foi para " + r.where + "."));
  }
  const ok = btn("Legal!", "solid", () => {
    hatching = false;
    if (lastState) renderBag(lastState);
  });
  stage.appendChild(ok);
}

function renderShopPart(s) {
  bagScroll.appendChild(el("p", "", "O que você compra vai para a mochila. O grupo rende moedas toda hora enquanto está alimentado e feliz."));
  const egg = itemLine({ id: "ovo", name: "Ovo misterioso" }, "");
  egg.querySelector(".eff").textContent = "Nasce uma criatura aleatória";
  const eggBox = el("span", "it-btns");
  const eggDone = bought.ovo && bought.ovo > Date.now();
  const eggBtn = btn(eggDone ? "" : String(s.eggPrice), "price" + (eggDone ? " done" : ""), () => buy("egg", "ovo", egg), !eggDone && (s.coins < s.eggPrice || !s.eggPool));
  eggBox.appendChild(eggBtn);
  egg.dataset.item = "ovo";
  egg.appendChild(eggBox);
  bagScroll.appendChild(egg);
  s.items.filter(it => it.price).forEach(it => {
    const row = itemLine(it, it.count ? "tem " + it.count : "");
    const box = el("span", "it-btns");
    const done = bought[it.id] && bought[it.id] > Date.now();
    box.appendChild(btn(done ? "" : String(it.price), "price" + (done ? " done" : ""), () => buy("buy", it.id, row), !done && s.coins < it.price));
    row.dataset.item = it.id;
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
        card.appendChild(btn("Abrir o baú", "solid", () => collect(kind)));
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
  profileBtn.hidden = !acc.configured;
  accountBtn.hidden = !acc.configured;
  if (!acc.configured) return;
  const label = acc.signedIn ? "Sair" : "Entrar";
  accountBtn.setAttribute("aria-label", label);
  accountBtn.title = label;
  document.getElementById("acc-ico-out").style.display = acc.signedIn ? "" : "none";
  document.getElementById("acc-ico-in").style.display = acc.signedIn ? "none" : "";
  if (acc.signedIn) {
    accEmail.textContent = acc.email || "";
    accStatus.textContent = statusText(acc);
    profileBtn.title = "Abrir o perfil";
  } else {
    accEmail.textContent = "Sem conta";
    accStatus.textContent = "Progresso só neste computador";
    profileBtn.title = "Entrar para salvar o progresso";
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
  const eggsReady = s.eggs.filter(e => e.slot !== null && eggNow(s, e).left <= 0).length;
  const bagParts = [];
  if (itemCount) bagParts.push(itemCount + (itemCount === 1 ? " item" : " itens"));
  if (s.eggs.length) bagParts.push(s.eggs.length + (s.eggs.length === 1 ? " ovo" : " ovos"));
  setTile(openBagBtn, eggsReady ? (eggsReady === 1 ? "Ovo pronto!" : eggsReady + " ovos prontos!") : bagParts.join(" · ") || "Vazia", eggsReady > 0);
  const expLocked = s.owned.length < 2 && !s.expeditions.length;
  if (expLocked) setTile(openExpBtn, "Bloqueado", false, true);
  else setTile(openExpBtn, ready ? (ready === 1 ? "1 voltou!" : ready + " voltaram!") : s.expeditions.length ? s.expeditions.length + " em andamento" : "Nenhuma", ready > 0);
  openExpBtn.classList.toggle("locked", expLocked);
  openExpBtn.title = expLocked ? "Precisa de pelo menos 2 criaturas" : "";
  if (expLocked && bagMode === "exp") bagMode = null;
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
  treatBtn.disabled = !(s.treat && s.treat.can);
  treatBtn.textContent = s.treat && s.treat.healing ? "Tratando…" : "Tratar";
  treatBtn.title = !s.treat ? "" : s.treat.healing ? "Recuperando a vida" : s.treat.used ? "Já tratada hoje" : s.dying ? "" : "Só quando estiver morrendo";
  evolveBtn.hidden = !s.evolveTo;

  feedBtn.disabled = Math.round(s.hunger) >= 100;
  levelBadge.textContent = "Nível " + s.level;
  xpFillEl.style.width = Math.min(100, (s.xp / s.xpNext) * 100) + "%";
  xpValueEl.textContent = Math.floor(s.xp) + " / " + s.xpNext;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 4000);
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
  if (m === "bag") bagNew = 0;
  if (m !== "bag") hatching = false;
  if (m === "shop") shownCoins = null;
  bagMode = m;
  boxMode = false;
  expPick = null;
  bagScroll.scrollTop = 0;
  if (lastState) render(lastState);
}
openShopBtn.addEventListener("click", () => setMode("shop"));
openBagBtn.addEventListener("click", () => setMode("bag"));
shopBagBtn.addEventListener("click", () => setMode("bag"));
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
profileBtn.addEventListener("click", () => {
  if (signedIn) window.pet.openSite("conta");
  else accountBtn.click();
});
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
