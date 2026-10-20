(function () {
  const COIN =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#f6c343" stroke="#c98a12" stroke-width="2"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="#c98a12" stroke-width="1.6"/></svg>';
  const CHEST =
    '<svg class="chest-svg" viewBox="0 0 140 120" aria-hidden="true">' +
    '<defs><radialGradient id="chestGlow" cx="50%" cy="60%" r="50%"><stop offset="0" stop-color="#fff6c8"/><stop offset="0.5" stop-color="#ffd25a" stop-opacity="0.8"/><stop offset="1" stop-color="#ffb030" stop-opacity="0"/></radialGradient></defs>' +
    '<ellipse cx="70" cy="110" rx="52" ry="7" fill="rgba(0,0,0,0.25)"/>' +
    '<g class="chest-rays">' +
    [0, 30, 60, 90, 120, 150].map(a => '<rect x="67" y="-10" width="6" height="70" rx="3" fill="#ffe28a" transform="rotate(' + (a - 75) + ' 70 58)"/>').join("") +
    "</g>" +
    '<ellipse class="chest-glow" cx="70" cy="58" rx="62" ry="46" fill="url(#chestGlow)"/>' +
    '<rect x="16" y="56" width="108" height="50" rx="7" fill="#8a5426"/>' +
    '<rect x="16" y="56" width="108" height="50" rx="7" fill="none" stroke="#5e3615" stroke-width="3"/>' +
    '<path d="M20 72H120M20 89H120" stroke="#6e4019" stroke-width="2"/>' +
    '<rect x="28" y="56" width="10" height="50" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    '<rect x="102" y="56" width="10" height="50" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    '<g class="chest-lid">' +
    '<path d="M14 58V40Q14 22 32 22H108Q126 22 126 40V58Z" fill="#a0652d" stroke="#5e3615" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 44H122" stroke="#7c4a1f" stroke-width="2"/>' +
    '<rect x="28" y="23" width="10" height="35" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    '<rect x="102" y="23" width="10" height="35" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    "</g>" +
    '<g class="chest-lock"><rect x="60" y="50" width="20" height="22" rx="4" fill="#f2c94c" stroke="#a87a18" stroke-width="2"/><circle cx="70" cy="59" r="3" fill="#5e3615"/><rect x="68.6" y="60" width="2.8" height="7" rx="1.2" fill="#5e3615"/></g>' +
    "</svg>";

  const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  function open(o) {
    const host = o.host || document.body;
    const overlay = el("div", "chest-overlay");
    const card = el("div", "chest-card");
    const title = el("h2", "chest-title", o.title || "Expedição voltou!");
    const who = el("p", "chest-who", o.subtitle || "");
    const stage = el("button", "chest-stage");
    stage.type = "button";
    stage.setAttribute("aria-label", "Abrir o baú");
    stage.innerHTML = CHEST;
    const hint = el("p", "chest-hint", "Toque no baú para abrir");
    const loot = el("div", "chest-loot");
    const notes = el("p", "chest-notes", "");
    const take = el("button", "chest-take", "Pegar");
    take.type = "button";
    take.hidden = true;
    card.append(title, who, stage, hint, loot, notes, take);
    overlay.appendChild(card);
    host.appendChild(overlay);
    stage.focus({ preventScroll: true });

    const list = [];
    if (o.coins) list.push({ html: COIN, name: "Moedas", count: o.coins, coin: true });
    (o.items || []).forEach(it => list.push(it));

    let opened = false;
    const finish = () => {
      notes.textContent = (o.notes || []).join(" ");
      take.hidden = false;
      take.focus({ preventScroll: true });
    };
    const popItem = (it, i) => {
      const slot = el("div", "chest-item" + (it.coin ? " coin" : ""));
      const ico = el("span", "chest-item-ico");
      ico.innerHTML = it.html || "";
      const label = el("span", "chest-item-name", it.name);
      const count = el("span", "chest-item-count", (it.coin ? "+" : "x") + it.count);
      slot.append(ico, count, label);
      loot.appendChild(slot);
      if (reduce() || !slot.animate) return;
      const a = stage.getBoundingClientRect();
      const b = slot.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height * 0.45 - (b.top + b.height / 2);
      slot.animate(
        [
          { transform: "translate(" + dx + "px," + dy + "px) scale(0.2)", opacity: 0 },
          { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - 70) + "px) scale(1.25)", opacity: 1, offset: 0.55 },
          { transform: "translate(0,0) scale(1)", opacity: 1 }
        ],
        { duration: 650, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)", fill: "backwards" }
      );
    };
    const reveal = () => {
      if (opened) return;
      opened = true;
      stage.classList.add("shake");
      hint.textContent = "";
      setTimeout(
        () => {
          stage.classList.remove("shake");
          stage.classList.add("open");
          stage.setAttribute("aria-label", "Baú aberto");
          if (o.onOpen) o.onOpen();
          const step = reduce() ? 0 : 520;
          list.forEach((it, i) => setTimeout(() => popItem(it, i), 250 + i * step));
          setTimeout(finish, 250 + list.length * step + 300);
        },
        reduce() ? 0 : 520
      );
    };
    const close = () => {
      overlay.classList.add("closing");
      setTimeout(() => overlay.remove(), reduce() ? 0 : 200);
      if (o.onDone) o.onDone();
    };
    stage.addEventListener("click", reveal);
    take.addEventListener("click", close);
    overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        if (!opened) reveal();
        else if (!take.hidden) close();
      }
    });
    return { close };
  }

  window.PetChest = { open, COIN };
})();
