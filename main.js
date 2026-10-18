const { app, BrowserWindow, ipcMain, Menu, screen } = require("electron");
const path = require("path");
const fs = require("fs");

if (process.platform === "linux") {
  app.commandLine.appendSwitch("ozone-platform", "x11");
  app.commandLine.appendSwitch("enable-transparent-visuals");
}

if (!app.requestSingleInstanceLock()) app.quit();

const Game = require("./lib/game.js");
const PetTypes = require("./lib/types.js");
const PetsCloud = require("./lib/cloud.js");
const config = require("./config.js");

const W = 260;
const H = 320;
const PW = 280;
const PH = 620;
const PANEL_GAP = 8;
const EDGE_X = 28;
const SYNC_DELAY_MS = 1500;
const SYNC_EVERY_MS = 60000;

let win = null;
let panel = null;
let dragOrigin = null;
let cursorTimer = null;
let tickTimer = null;
let petIds = [];
let petMeta = {};
let state = Game.create();
let syncTimer = null;
let syncLoop = null;
let syncing = false;
let syncAgain = false;
let account = { offline: false, error: "", lastSync: 0 };
let guest = false;

const iconPath = path.join(__dirname, "assets", "icon.png");

const webPreferences = {
  preload: path.join(__dirname, "preload.js"),
  contextIsolation: true,
  nodeIntegration: false
};

const clamp = v => Math.max(-1, Math.min(1, v));
const stateFile = () => path.join(app.getPath("userData"), "state.json");
const authFile = () => path.join(app.getPath("userData"), "auth.json");
const alive = w => w && !w.isDestroyed();

const authStore = {
  get() {
    try {
      return JSON.parse(fs.readFileSync(authFile(), "utf8"));
    } catch (err) {
      return null;
    }
  },
  set(session) {
    try {
      if (!session) {
        fs.rmSync(authFile(), { force: true });
        return;
      }
      fs.mkdirSync(path.dirname(authFile()), { recursive: true });
      fs.writeFileSync(authFile(), JSON.stringify(session), { mode: 0o600 });
    } catch (err) {}
  }
};

const cloud = PetsCloud.create({
  url: config.supabaseUrl,
  anonKey: config.supabaseAnonKey,
  store: authStore
});

function scanPets() {
  try {
    petIds = fs
      .readdirSync(path.join(__dirname, "pets"))
      .filter(f => f.endsWith(".js"))
      .map(f => f.slice(0, -3))
      .sort();
  } catch (err) {
    petIds = [];
  }
}

function loadState() {
  let saved = null;
  try {
    saved = JSON.parse(fs.readFileSync(stateFile(), "utf8"));
  } catch (err) {}
  state = Game.normalize(saved, petIds);
  Game.catchUp(state);
}

function saveState() {
  try {
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch (err) {}
}

function snapshot() {
  const meta = petIds.map(id => ({
    id,
    name: (petMeta[id] && petMeta[id].name) || id,
    color: (petMeta[id] && petMeta[id].color) || "#999999",
    types: (petMeta[id] && petMeta[id].types) || []
  }));
  const em = petMeta[state.pet];
  const evolveTo = em && em.evolvesTo && Game.canEvolve(state, state.pet, em.evolvesTo, em.evolveLevel || Infinity) ? (petMeta[em.evolvesTo] ? petMeta[em.evolvesTo].name : em.evolvesTo) : null;
  return Object.assign(Game.view(state, meta), {
    evolveTo,
    account: {
      configured: cloud.configured,
      signedIn: cloud.signedIn(),
      guest,
      email: cloud.email(),
      offline: account.offline,
      error: account.error,
      lastSync: account.lastSync
    }
  });
}

function broadcast() {
  const snap = snapshot();
  [win, panel].forEach(w => {
    if (alive(w)) w.webContents.send("state", snap);
  });
}

function tickHunger() {
  Game.catchUp(state);
  saveState();
  broadcast();
}

function startSyncLoop() {
  clearInterval(syncLoop);
  syncLoop = setInterval(syncNow, SYNC_EVERY_MS);
}

function scheduleSync() {
  if (!cloud.signedIn()) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, SYNC_DELAY_MS);
}

async function syncNow(opts = {}) {
  if (!cloud.signedIn()) return;
  if (syncing) {
    syncAgain = true;
    return;
  }
  syncing = true;
  try {
    const row = await cloud.pull();
    const remote = row ? Game.normalize(row.state, petIds) : null;
    Game.catchUp(state);
    const result = Game.merge(state, remote, Date.now(), { preferRemote: !!opts.preferRemote && !!remote });
    state = result.state;
    if (result.push) await cloud.push(state);
    account.offline = false;
    account.error = "";
    account.lastSync = Date.now();
  } catch (err) {
    account.offline = !!err.offline;
    account.error = err.offline ? "" : err.message;
  } finally {
    syncing = false;
    saveState();
    broadcast();
    if (syncAgain) {
      syncAgain = false;
      scheduleSync();
    }
  }
}

function openPanel() {
  if (!alive(win)) return;
  if (alive(panel)) {
    panel.show();
    panel.focus();
    return;
  }
  const b = win.getBounds();
  const area = screen.getDisplayMatching(b).workArea;
  let x = b.x - PW - PANEL_GAP;
  if (x < area.x) x = b.x + b.width + PANEL_GAP;
  x = Math.max(area.x, Math.min(x, area.x + area.width - PW));
  const y = Math.max(area.y, Math.min(b.y + b.height - PH, area.y + area.height - PH));

  panel = new BrowserWindow({
    width: PW,
    height: PH,
    x,
    y,
    show: false,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    icon: iconPath,
    webPreferences
  });
  panel.setVisibleOnAllWorkspaces(true);
  panel.loadFile(path.join(__dirname, "panel.html"));
  panel.webContents.once("did-finish-load", () => {
    if (alive(panel)) {
      panel.show();
      panel.focus();
    }
  });
  panel.on("closed", () => {
    panel = null;
    if (alive(win)) win.webContents.send("panel", false);
  });
  win.webContents.send("panel", true);
}

function closePanel() {
  if (alive(panel)) panel.close();
}

function targetArea() {
  const primary = screen.getPrimaryDisplay();
  const others = screen
    .getAllDisplays()
    .filter(d => d.id !== primary.id)
    .sort((a, b) => a.bounds.x - b.bounds.x);
  return (others[0] || primary).workArea;
}

function placeOnTarget() {
  if (!alive(win)) return;
  closePanel();
  const area = targetArea();
  win.setBounds({
    x: area.x + area.width - W + EDGE_X,
    y: area.y + area.height - H,
    width: W,
    height: H
  });
}

function createWindow() {
  const area = targetArea();
  win = new BrowserWindow({
    width: W,
    height: H,
    x: area.x + area.width - W + EDGE_X,
    y: area.y + area.height - H,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    backgroundColor: "#00000000",
    icon: iconPath,
    webPreferences
  });

  win.setVisibleOnAllWorkspaces(true);
  win.loadFile(path.join(__dirname, "index.html"));
  win.once("ready-to-show", placeOnTarget);

  cursorTimer = setInterval(() => {
    if (!alive(win)) return;
    const c = screen.getCursorScreenPoint();
    const b = win.getBounds();
    const area = screen.getDisplayNearestPoint(c).workArea;
    const x = (c.x - (b.x + b.width / 2)) / (area.width / 2);
    const y = -(c.y - (b.y + b.height * 0.45)) / (area.height / 2);
    win.webContents.send("cursor", { x: clamp(x), y: clamp(y) });
  }, 33);

  win.on("closed", () => {
    clearInterval(cursorTimer);
    closePanel();
    win = null;
  });
}

ipcMain.handle("pet-files", () => petIds.map(id => "pets/" + id + ".js"));

ipcMain.handle("get-state", () => snapshot());

ipcMain.on("pets-meta", (_e, list) => {
  if (!Array.isArray(list)) return;
  list.forEach(p => {
    if (!p || !petIds.includes(p.id)) return;
    petMeta[p.id] = {
      name: String(p.name || p.id).slice(0, 40),
      color: /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#999999",
      types: PetTypes.clean(p.types),
      evolvesTo: typeof p.evolvesTo === "string" && petIds.includes(p.evolvesTo) ? p.evolvesTo : null,
      evolveLevel: Number.isInteger(p.evolveLevel) ? p.evolveLevel : 0
    };
  });
  broadcast();
});

function tryEvolve() {
  const id = state.pet;
  const m = petMeta[id];
  if (!m || !m.evolvesTo || !m.evolveLevel) return null;
  const r = Game.evolve(state, id, m.evolvesTo, m.evolveLevel);
  return r.changed ? (petMeta[m.evolvesTo] ? petMeta[m.evolvesTo].name : m.evolvesTo) : null;
}

ipcMain.on("feed", () => {
  const r = Game.feed(state);
  if (!r.changed) return;

  saveState();
  broadcast();
  scheduleSync();
  if (alive(win)) win.webContents.send("feed");
  if (r.levels > 0) {
    [win, panel].forEach(w => {
      if (alive(w)) w.webContents.send("level-up", r.level);
    });
  }
});

ipcMain.on("evolve", () => {
  const name = tryEvolve();
  if (!name) return;
  saveState();
  broadcast();
  scheduleSync();
  [win, panel].forEach(w => {
    if (alive(w)) w.webContents.send("level-up", "Evoluiu para " + name + "!");
  });
});

ipcMain.on("treat", () => {
  const r = Game.treat(state);
  if (!r.changed) return;
  saveState();
  broadcast();
  scheduleSync();
  if (alive(win)) win.webContents.send("treat");
});

ipcMain.on("play", () => {
  const r = Game.play(state);
  if (!r.changed) return;
  saveState();
  broadcast();
  scheduleSync();
});

ipcMain.on("select-pet", (_e, id) => {
  const r = Game.selectPet(state, id);
  if (!r.changed) return;
  saveState();
  broadcast();
  scheduleSync();
});

ipcMain.on("swap-party", (_e, p) => {
  if (!p) return;
  const r = Game.swapParty(state, p.out, p.in, petIds);
  if (!r.changed) return;
  saveState();
  broadcast();
  scheduleSync();
});

ipcMain.handle("auth-signin", async (_e, creds) => {
  if (!cloud.configured) return { ok: false, error: "A conta ainda não foi configurada." };
  try {
    await cloud.signIn(String((creds && creds.email) || "").trim(), String((creds && creds.password) || ""));
    startSyncLoop();
    await syncNow({ preferRemote: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.offline ? "Sem conexão com a internet." : err.message };
  }
});

ipcMain.handle("auth-signup", async (_e, creds) => {
  if (!cloud.configured) return { ok: false, error: "A conta ainda não foi configurada." };
  try {
    const r = await cloud.signUp(String((creds && creds.email) || "").trim(), String((creds && creds.password) || ""));
    if (r.confirm) return { ok: true, confirm: true };
    startSyncLoop();
    await syncNow({ preferRemote: true });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.offline ? "Sem conexão com a internet." : err.message };
  }
});

ipcMain.handle("auth-signout", async () => {
  clearInterval(syncLoop);
  clearTimeout(syncTimer);
  await cloud.signOut();
  account = { offline: false, error: "", lastSync: 0 };
  guest = false;
  broadcast();
  return { ok: true };
});

ipcMain.on("sync-now", () => syncNow());

ipcMain.on("auth-skip", () => {
  guest = true;
  broadcast();
  closePanel();
});

ipcMain.on("close-panel", closePanel);

ipcMain.on("drag-start", (_e, p) => {
  if (!win) return;
  const b = win.getBounds();
  dragOrigin = { wx: b.x, wy: b.y, sx: p.x, sy: p.y };
});

ipcMain.on("drag-move", (_e, p) => {
  if (!win || !dragOrigin) return;
  win.setBounds({
    x: Math.round(dragOrigin.wx + p.x - dragOrigin.sx),
    y: Math.round(dragOrigin.wy + p.y - dragOrigin.sy),
    width: W,
    height: H
  });
});

ipcMain.on("drag-end", () => {
  dragOrigin = null;
});

ipcMain.on("menu", () => {
  if (!win) return;
  Menu.buildFromTemplate([
    { label: "Abrir", click: () => setTimeout(openPanel, 120) },
    { label: "Pular", click: () => win.webContents.send("jump") },
    {
      label: "Sempre no topo",
      type: "checkbox",
      checked: win.isAlwaysOnTop(),
      click: item => win.setAlwaysOnTop(item.checked)
    },
    ...(process.platform === "linux"
      ? []
      : [
          {
            label: "Iniciar com o computador",
            type: "checkbox",
            checked: app.getLoginItemSettings().openAtLogin,
            click: item => app.setLoginItemSettings({ openAtLogin: item.checked })
          }
        ]),
    { type: "separator" },
    { label: "Sair", click: () => app.quit() }
  ]).popup({ window: win });
});

app.on("second-instance", () => {
  if (alive(win)) {
    win.show();
    setTimeout(openPanel, 120);
  }
});

app.whenReady().then(() => {
  scanPets();
  loadState();
  tickTimer = setInterval(tickHunger, Game.C.TICK_MS);
  screen.on("display-added", placeOnTarget);
  screen.on("display-removed", placeOnTarget);
  setTimeout(() => {
    createWindow();
    if (cloud.configured) {
      if (cloud.signedIn()) {
        syncNow();
        startSyncLoop();
      } else {
        win.webContents.once("did-finish-load", () => setTimeout(openPanel, 400));
      }
    }
  }, 300);
});

app.on("before-quit", () => {
  clearInterval(tickTimer);
  clearInterval(syncLoop);
  saveState();
});

app.on("window-all-closed", () => app.quit());
