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
let bagMode = false;
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
  openBoxBtn.textContent = s.box.length ? "Abrir a caixa (" + s.box.length + ")" : "Caixa vazia";
  openBoxBtn.disabled = s.box.length === 0;
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

function itemLine(it, extra) {
  const row = el("div", "it");
  const info = el("span", "info");
  const line = el("span", "name-line");
  line.appendChild(el("span", "", it.name));
  if (extra) line.appendChild(el("span", "lv", extra));
  info.append(line, el("span", "eff", effect(it)));
  row.appendChild(info);
  return row;
}

function renderBag(s) {
  bagCoins.textContent = s.coins + " moedas";
  bagScroll.textContent = "";
  if (s.daily && s.daily.available) {
    bagScroll.appendChild(el("h2", "", "Presente do dia"));
    const row = el("div", "it");
    const info = el("span", "info");
    info.append(el("span", "name-line", "Dia " + s.daily.step + " de " + s.dailyRewards.length), el("span", "eff", s.daily.streak > 1 ? s.daily.streak + " dias seguidos" : "Volte todo dia para ganhar mais"));
    const box = el("span", "it-btns");
    box.appendChild(btn("Pegar " + s.daily.coins + " moedas", "", () => eco({ op: "daily" })));
    row.append(info, box);
    bagScroll.appendChild(row);
  }
  bagScroll.appendChild(el("h2", "", "Expedições"));
  bagScroll.appendChild(el("p", "", "Quem sai some da tela e não gasta nada. Volta com moedas e itens do seu tipo."));
  s.party.forEach(p => {
    const row = el("div", p.away ? "it" : "it wrap");
    row.append(dotFor(p), petInfo(p));
    const box = el("span", "it-btns");
    if (p.away && !p.ready) {
      const t = el("span", "time", "Volta em " + fmtTime(p.away.endsAt - Date.now()));
      t.dataset.ends = String(p.away.endsAt);
      box.appendChild(t);
    }
    else if (p.away) box.appendChild(btn("Receber", "", () => eco({ op: "collect", id: p.id })));
    else Object.keys(EXP_LABEL).forEach(k => box.appendChild(btn(EXP_LABEL[k], "ghost", () => eco({ op: "explore", id: p.id, kind: k }), !p.canExplore)));
    row.appendChild(box);
    bagScroll.appendChild(row);
  });
  const cur = s.party.find(p => p.id === s.pet);
  const have = s.items.filter(it => it.count > 0);
  bagScroll.appendChild(el("h2", "", "Itens"));
  if (!have.length) bagScroll.appendChild(el("p", "", "A mochila está vazia."));
  else bagScroll.appendChild(el("p", "", "Os itens são usados em " + (cur ? cur.name : "") + "."));
  have.forEach(it => {
    const row = itemLine(it, "x" + it.count);
    const box = el("span", "it-btns");
    if (it.hunger || it.life || it.joy || it.xp || it.revive) box.appendChild(btn("Usar", "", () => eco({ op: "use", item: it.id }), !it.canUse));
    if (it.sell) box.appendChild(btn("Vender " + it.sell, "ghost", () => eco({ op: "sell", item: it.id })));
    row.appendChild(box);
    bagScroll.appendChild(row);
  });
  bagScroll.appendChild(el("h2", "", "Loja"));
  s.items.filter(it => it.price).forEach(it => {
    const row = itemLine(it, it.count ? "tem " + it.count : "");
    const box = el("span", "it-btns");
    box.appendChild(btn(it.price + " moedas", "", () => eco({ op: "buy", item: it.id }), s.coins < it.price));
    row.appendChild(box);
    bagScroll.appendChild(row);
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
  if (s.needsStarter) bagMode = false;
  if (!cardEl.classList.contains("auth-mode")) {
    cardEl.classList.toggle("box-mode", boxMode);
    cardEl.classList.toggle("bag-mode", bagMode && !boxMode);
  }
  openBagBtn.textContent = "Mochila e expedições · " + s.coins + " moedas" + (s.daily && s.daily.available ? " · presente do dia!" : s.party.some(p => p.ready) ? " · expedição voltou!" : "");
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

openBagBtn.addEventListener("click", () => {
  bagMode = true;
  boxMode = false;
  if (lastState) render(lastState);
});
bagClose.addEventListener("click", () => {
  bagMode = false;
  if (lastState) render(lastState);
});
setInterval(() => {
  if (!bagMode || !lastState) return;
  if (lastState.party.some(p => p.away && !p.ready && p.away.endsAt <= Date.now())) window.pet.getState().then(render);
  else bagScroll.querySelectorAll("[data-ends]").forEach(t => (t.textContent = "Volta em " + fmtTime(Number(t.dataset.ends) - Date.now())));
}, 1000);
openBoxBtn.addEventListener("click", () => {
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
    bagMode = false;
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
