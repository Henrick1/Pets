const canvas = document.getElementById("stage");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const motion = reduceMotion ? 0.3 : 1;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xffffff, 0x8890d0, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 0.9);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -3;
sun.shadow.camera.right = 3;
sun.shadow.camera.top = 3;
sun.shadow.camera.bottom = -3;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 20;
sun.shadow.radius = 4;
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.2 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const tab = document.getElementById("tab");
const hungerFill = document.getElementById("hunger-fill");
const hungerText = document.getElementById("hunger-val");
const lifeFill = document.getElementById("life-fill");
const lifeText = document.getElementById("life-val");
const statusEl = document.getElementById("status");
const xpFill = document.getElementById("xp-fill");
const xpText = document.getElementById("xp-val");
const levelLabel = document.getElementById("level-label");
const levelupEl = document.getElementById("levelup");
let levelupTimer = 0;
const TAB_VISIBLE_MS = 6000;
let tabTimer = 0;
let hunger = 100;
let life = 100;
let dying = false;
let dyingK = 0;
let level = 1;
let xp = 0;
let xpNext = 50;
let panelOpen = false;

const barColor = v => (v > 50 ? "#5fbf8c" : v > 25 ? "#f2c14e" : "#e5645a");

function renderStats() {
  const h = Math.round(hunger);
  hungerFill.style.width = h + "%";
  hungerFill.style.background = barColor(hunger);
  hungerText.textContent = h + "%";
  const l = Math.round(life);
  lifeFill.style.width = l + "%";
  lifeFill.style.background = barColor(life);
  lifeText.textContent = l + "%";
  statusEl.hidden = !dying;
  const pct = Math.round((xp / xpNext) * 100);
  xpFill.style.width = pct + "%";
  xpText.textContent = pct + "%";
  levelLabel.textContent = "Nv " + level;
}

function showTab() {
  if (panelOpen) return;
  renderStats();
  tab.classList.add("open");
  clearTimeout(tabTimer);
  tabTimer = setTimeout(() => tab.classList.remove("open"), TAB_VISIBLE_MS);
}

const pointer = { x: 0, y: 0 };
let lookYaw = 0;
let lookPitch = 0;
let pressing = false;
let moving = false;
let downX = 0;
let downY = 0;
let glance = 0;
let glanceUntil = 0;
let nextGlance = 4 + Math.random() * 4;
let blinkStart = -10;
let nextBlink = 1.5;

const clock = new THREE.Clock();
const pivot = new THREE.Group();
scene.add(pivot);
const spin = PetKit.spin(pivot, () => clock.getElapsedTime());
let rotating = false;

let ready = false;
let current = null;
let activeAction = null;
let pendingAction = null;
let counts = {};
let clicks = 0;
let idleTimers = [];

const lerp = (a, b, k) => a + (b - a) * k;

function disposeTree(node) {
  node.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
}

function setPet(id) {
  const def = Pets.find(id) || Pets.list[0];
  if (!def || (current && current.def.id === def.id)) return;
  const pet = def.create({ THREE, kit: PetKit, reduceMotion, motion });
  if (current) {
    pivot.remove(current.pet.root);
    disposeTree(current.pet.root);
  }
  pivot.add(pet.root);
  current = { def, pet };
  activeAction = null;
  pendingAction = null;
  counts = {};
  clicks = 0;
  const t = clock.getElapsedTime();
  idleTimers = (def.idle || []).map(i => t + i.min + Math.random() * (i.max - i.min));
}

function startAction(name) {
  counts[name] = (counts[name] || 0) + 1;
  activeAction = { name, start: clock.getElapsedTime(), n: counts[name] };
}

function play(name, queue) {
  if (!current || !current.def.actions[name]) return;
  if (dying && name !== "eat") return;
  if (activeAction) {
    if (queue) pendingAction = name;
    return;
  }
  startAction(name);
}

function currentAction(t) {
  if (!activeAction) return null;
  const p = (t - activeAction.start) / current.def.actions[activeAction.name].duration;
  if (p < 1) return { name: activeAction.name, p, n: activeAction.n };
  activeAction = null;
  if (pendingAction) {
    const next = pendingAction;
    pendingAction = null;
    startAction(next);
    return { name: next, p: 0, n: activeAction.n };
  }
  return null;
}

function interact() {
  if (current && !dying) {
    const name = current.def.clickAction ? current.def.clickAction(++clicks) : "jump";
    play(name);
  }
  showTab();
}

function applyState(s) {
  hunger = s.hunger;
  life = s.life;
  dying = s.dying;
  level = s.level;
  xp = s.xp;
  xpNext = s.xpNext;
  if (ready) setPet(s.pet);
  renderStats();
}

window.pet.onCursor(p => {
  pointer.x = p.x;
  pointer.y = p.y;
});
window.pet.onJump(() => play("jump"));
window.pet.onFeed(() => {
  play("eat", true);
  showTab();
});
window.pet.onTreat(() => showTab());
window.pet.onLevelUp(n => {
  play("jump", true);
  levelupEl.textContent = "Nível " + n + "!";
  levelupEl.hidden = false;
  clearTimeout(levelupTimer);
  levelupTimer = setTimeout(() => {
    levelupEl.hidden = true;
  }, 4000);
  showTab();
});
window.pet.onPanel(open => {
  panelOpen = open;
  if (open) {
    clearTimeout(tabTimer);
    tab.classList.remove("open");
  }
});
window.pet.onState(applyState);

canvas.addEventListener("contextmenu", e => e.preventDefault());

canvas.addEventListener("pointerdown", e => {
  downX = e.screenX;
  downY = e.screenY;
  canvas.setPointerCapture(e.pointerId);
  if (e.button === 2) {
    moving = true;
    canvas.classList.add("moving");
    window.pet.dragStart({ x: e.screenX, y: e.screenY });
    return;
  }
  if (e.button === 0) pressing = true;
});

let lastX = 0;
let lastY = 0;
canvas.addEventListener("pointermove", e => {
  if (moving) {
    window.pet.dragMove({ x: e.screenX, y: e.screenY });
    return;
  }
  if (pressing) {
    if (!rotating && Math.abs(e.screenX - downX) + Math.abs(e.screenY - downY) >= 6) {
      rotating = true;
      lastX = e.screenX;
      lastY = e.screenY;
      spin.begin();
    }
    if (rotating) {
      spin.drag(e.screenX - lastX, e.screenY - lastY);
      lastX = e.screenX;
      lastY = e.screenY;
    }
  }
});

canvas.addEventListener("pointerup", e => {
  const still = Math.abs(e.screenX - downX) + Math.abs(e.screenY - downY) < 6;
  if (moving) {
    moving = false;
    canvas.classList.remove("moving");
    window.pet.dragEnd();
    if (still) window.pet.menu();
    return;
  }
  if (pressing) {
    pressing = false;
    if (rotating) {
      rotating = false;
      spin.end();
      return;
    }
    if (still) interact();
  }
});

canvas.addEventListener("pointercancel", () => {
  if (rotating) spin.end();
  rotating = false;
  pressing = false;
  moving = false;
  canvas.classList.remove("moving");
  window.pet.dragEnd();
});

canvas.addEventListener("keydown", e => {
  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    interact();
  }
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.position.set(0, 2, 7.4);
  camera.lookAt(0, 1.55, 0);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  if (current) {
    (current.def.idle || []).forEach((i, k) => {
      if (t > idleTimers[k]) {
        if (!pressing && !moving) play(i.action);
        idleTimers[k] = t + i.min + Math.random() * (i.max - i.min);
      }
    });

    if (t > nextGlance) {
      glance = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.2);
      glanceUntil = t + 1.2 + Math.random() * 1.3;
      nextGlance = t + 5 + Math.random() * 6;
    }
    if (t > glanceUntil) glance = 0;
    dyingK = lerp(dyingK, dying ? 1 : 0, 0.04);
    const look = dying ? { x: 0, y: -0.5 } : pointer;
    lookYaw = lerp(lookYaw, look.x * 0.35 + (dying ? 0 : glance), 0.05);
    lookPitch = lerp(lookPitch, -look.y * 0.15, 0.06);

    if (t > nextBlink) {
      blinkStart = t;
      nextBlink = t + 2 + Math.random() * 3;
    }
    const bp = (t - blinkStart) / 0.16;
    const blink = lerp(bp >= 0 && bp <= 1 ? 1 - Math.sin(bp * Math.PI) * 0.9 : 1, 0.15, dyingK);

    current.pet.update({
      t,
      pointer: look,
      lookYaw,
      lookPitch,
      blink,
      action: currentAction(t),
      hunger,
      life,
      dying,
      motion,
      reduceMotion
    });

    const r = current.pet.root;
    r.rotation.z = dyingK * (0.3 + Math.sin(t * 0.8) * 0.02);
    r.scale.set(1 + 0.04 * dyingK, 1 - 0.1 * dyingK, 1 + 0.04 * dyingK);
  }

  spin.update();
  renderer.render(scene, camera);
}

const loadScript = src =>
  new Promise(resolve => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = resolve;
    document.body.appendChild(el);
  });

async function boot() {
  const files = await window.pet.getPetFiles();
  for (const f of files) await loadScript(f);
  window.pet.setPetsMeta(Pets.list.map(p => ({ id: p.id, name: p.name, color: p.color })));
  ready = true;
  applyState(await window.pet.getState());
  animate();
}

boot();
