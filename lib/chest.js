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

  function chest3d(canvas, W, H) {
    const THREE = window.THREE;
    if (!THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
      return null;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
    camera.position.set(0, 2.4, 6.0);
    camera.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a20, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const inner = new THREE.PointLight(0xffc040, 0, 4);
    inner.position.set(0, 0.9, 0);
    scene.add(inner);

    const woodTex = (() => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#9a5f2c";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5; i++) {
        const y = i * 51;
        g.fillStyle = i % 2 ? "#a86a33" : "#93582a";
        g.fillRect(0, y, 256, 51);
        g.fillStyle = "#5e3615";
        g.fillRect(0, y, 256, 3);
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = "rgba(70,38,14,0.25)";
          g.lineWidth = 1 + (k % 3);
          g.beginPath();
          const yy = y + 6 + ((k * 7) % 42);
          g.moveTo(0, yy);
          g.bezierCurveTo(80, yy + 3 * Math.sin(k), 170, yy - 3 * Math.cos(k), 256, yy + 1);
          g.stroke();
        }
      }
      const t = new THREE.CanvasTexture(c);
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      return t;
    })();
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c246, roughness: 0.35, metalness: 0.25, emissive: 0x3a2400, emissiveIntensity: 0.4 });
    const goldDark = new THREE.MeshStandardMaterial({ color: 0xc9922a, roughness: 0.4, metalness: 0.25 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const insideMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });

    const BW = 2.0;
    const BH = 1.05;
    const BD = 1.3;
    const root = new THREE.Group();
    scene.add(root);
    const chest = new THREE.Group();
    root.add(chest);
    const rbox = (w, h, d, r, m) => {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      const g = new THREE.ExtrudeGeometry(s, { depth: d - 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 6 });
      g.translate(0, 0, -(d - 0.08) / 2);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.5 + 0.5, uv.getY(i) * 0.5 + 0.5);
      return new THREE.Mesh(g, m);
    };
    const base = rbox(BW, BH, BD, 0.08, wood);
    base.position.y = BH / 2;
    chest.add(base);
    const hollow = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.18, 0.06, BD - 0.18), insideMat);
    hollow.position.y = BH + 0.005;
    chest.add(hollow);
    [-0.68, 0.68].forEach(x => {
      const band = rbox(0.2, BH + 0.02, BD + 0.05, 0.03, gold);
      band.position.set(x, BH / 2, 0);
      chest.add(band);
    });
    const rim = rbox(BW + 0.05, 0.12, BD + 0.05, 0.03, goldDark);
    rim.position.y = 0.06;
    chest.add(rim);

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, BH, -BD / 2);
    chest.add(lidPivot);
    const lid = new THREE.Group();
    lid.position.set(0, 0, BD / 2);
    lidPivot.add(lid);
    const half = new THREE.CylinderGeometry(BD / 2, BD / 2, BW, 28, 1, false, -Math.PI / 2, Math.PI);
    half.rotateZ(Math.PI / 2);
    const lidM = new THREE.Mesh(half, wood);
    lid.add(lidM);
    const capG = new THREE.CircleGeometry(BD / 2, 28, 0, Math.PI);
    [-1, 1].forEach(s => {
      const cap = new THREE.Mesh(capG, woodDark);
      cap.rotation.y = (s * Math.PI) / 2;
      cap.rotation.z = 0;
      cap.position.x = (s * BW) / 2;
      lid.add(cap);
    });
    [-0.68, 0.68].forEach(x => {
      const bg = new THREE.CylinderGeometry(BD / 2 + 0.035, BD / 2 + 0.035, 0.2, 28, 1, true, -Math.PI / 2, Math.PI);
      bg.rotateZ(Math.PI / 2);
      const b = new THREE.Mesh(bg, gold);
      b.material.side = THREE.DoubleSide;
      b.position.x = x;
      lid.add(b);
    });
    const lock = new THREE.Group();
    lock.position.set(0, BH - 0.02, BD / 2 + 0.06);
    chest.add(lock);
    const plate = rbox(0.34, 0.4, 0.1, 0.06, gold);
    lock.add(plate);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 10, 20, Math.PI), goldDark);
    shackle.position.y = 0.2;
    lock.add(shackle);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), woodDark);
    hole.position.set(0, 0.03, 0.06);
    lock.add(hole);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.09), woodDark);
    slot.position.set(0, -0.04, 0.061);
    lock.add(slot);

    const rays = new THREE.Group();
    rays.position.y = BH;
    chest.add(rays);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.PlaneGeometry(0.2, 1.5);
      g.translate(0, 0.75, 0);
      const r = new THREE.Mesh(g, glowMat);
      r.rotation.set(0, (i / 9) * Math.PI, (i % 2 ? 1 : -1) * (0.15 + (i % 3) * 0.12));
      rays.add(r);
    }
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), glowMat);
    halo.scale.set(1.1, 0.35, 0.8);
    halo.visible = false;
    halo.position.y = BH + 0.1;
    chest.add(halo);
    const sparks = [];
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), sparkMat);
      m.visible = false;
      chest.add(m);
      sparks.push({ m, a: i * 2.4, v: 0.5 + (i % 4) * 0.25, ph: (i * 0.37) % 1 });
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 0.6, 1);
    shadow.position.y = 0.005;
    root.add(shadow);

    const t0 = performance.now();
    let shakeAt = -1;
    let openAt = -1;
    let raf = 0;
    const lockStart = lock.position.clone();
    const ease = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const back = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      const still = reduce();
      root.rotation.y = still ? -0.35 : -0.35 + Math.sin(t * 0.6) * 0.18;
      if (openAt < 0) {
        chest.position.y = still ? 0 : Math.abs(Math.sin(t * 2.2)) * 0.05;
        chest.rotation.z = still ? 0 : Math.sin(t * 2.2) * 0.03;
      }
      if (shakeAt >= 0 && openAt < 0) {
        const q = (performance.now() - shakeAt) / 1000;
        chest.rotation.z = Math.sin(q * 38) * 0.09 * (1 - Math.min(1, q / 0.5));
        chest.scale.set(1 + Math.sin(q * 30) * 0.03, 1 - Math.sin(q * 30) * 0.03, 1);
      }
      if (openAt >= 0) {
        const q = (performance.now() - openAt) / 1000;
        chest.scale.set(1, 1, 1);
        chest.rotation.z *= 0.85;
        chest.position.y = q < 0.15 ? Math.sin((q / 0.15) * Math.PI) * 0.15 : 0;
        const k = Math.min(1, q / 0.55);
        lidPivot.rotation.x = -1.95 * (still ? 1 : back(k));
        const lq = Math.min(1, q / 0.7);
        lock.position.set(lockStart.x + lq * 0.3, lockStart.y - lq * lq * 1.1 + Math.sin(lq * Math.PI) * 0.35, lockStart.z + lq * 0.4);
        lock.rotation.set(lq * 1.4, 0, lq * 2.2);
        lock.visible = lq < 1;
        const g = ease(0.05, 0.4, q);
        glowMat.opacity = g * (0.45 + Math.sin(t * 5) * 0.08);
        inner.intensity = g * 2.4;
        rays.rotation.y = t * 0.6;
        rays.scale.setScalar(0.6 + g * 0.5 + Math.sin(t * 3) * 0.05);
        sparks.forEach(sp => {
          const u = ((t * sp.v + sp.ph) % 1 + 1) % 1;
          sp.m.visible = !still && g > 0.2;
          sp.m.position.set(Math.cos(sp.a + t) * 0.5 * u, BH + u * 2, Math.sin(sp.a + t) * 0.35 * u);
          sp.m.scale.setScalar(Math.sin(u * Math.PI));
        });
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return {
      shake() {
        shakeAt = performance.now();
      },
      open() {
        openAt = performance.now();
      },
      dispose() {
        cancelAnimationFrame(raf);
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
        });
        woodTex.dispose();
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      }
    };
  }
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
    const canvas = document.createElement("canvas");
    canvas.className = "chest-canvas";
    stage.appendChild(canvas);
    const three = chest3d(canvas, 220, 190);
    if (!three) stage.innerHTML = CHEST;
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
      const dy = a.top + a.height * 0.55 - (b.top + b.height / 2);
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
      if (three) three.shake();
      hint.textContent = "";
      setTimeout(
        () => {
          stage.classList.remove("shake");
          stage.classList.add("open");
          if (three) three.open();
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
      setTimeout(() => three && three.dispose(), 250);
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
