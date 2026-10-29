const loadScript = src =>
  new Promise(resolve => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = resolve;
    document.body.appendChild(el);
  });

(async () => {
  const files = await window.pet.getPetFiles();
  await Promise.all(files.map(loadScript));
  Battle.setMeta(Pets.list.map(p => ({ id: p.id, types: p.types })));
  const thumbs = {};
  const ui = BattleUI.mount(document.getElementById("root"), {
    THREE,
    kit: PetKit,
    Pets,
    Battle,
    Types: PetTypes,
    Game,
    reduceMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    api: {
      meta: sp => {
        const d = Pets.find(sp);
        return d ? { name: d.name, color: d.color, types: d.types } : null;
      },
      thumb: sp => thumbs[sp] || (thumbs[sp] = PetStage.thumbnail(THREE, PetKit, Pets, sp, 256, true)),
      ensure: async () => {},
      lobby: () => window.pet.battle({ op: "lobby" }),
      setMoves: (uid, moves) => window.pet.battle({ op: "moves", uid, moves }),
      start: () => window.pet.battle({ op: "start" }),
      act: action => window.pet.battle({ op: "act", action })
    },
    onClose: () => window.pet.closeBattle()
  });
  await ui.open();
  let pending = 0;
  window.pet.onState(() => {
    clearTimeout(pending);
    pending = setTimeout(() => {
      if (ui.mode() !== "arena" && !ui.busy()) ui.refresh();
    }, 300);
  });
})();
