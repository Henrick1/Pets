const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const out = path.join(root, "web");
const config = require(path.join(root, "config.js"));

function reset(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function copyDir(from, to, filter) {
  if (!fs.existsSync(from)) return;
  fs.readdirSync(from).forEach(name => {
    const src = path.join(from, name);
    if (fs.statSync(src).isDirectory()) return;
    if (filter && !filter(name)) return;
    copy(src, path.join(to, name));
  });
}

function walk(dir, base = dir) {
  return fs.readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) return walk(full, base);
    return [path.relative(base, full).split(path.sep).join("/")];
  });
}

function supabaseOrigin() {
  try {
    const o = new URL(config.supabaseUrl).origin;
    return o + " " + o.replace(/^http/, "ws");
  } catch (err) {
    return "";
  }
}

reset(out);

copyDir(path.join(root, "web-src"), out, n => n !== "sw.js");
copyDir(path.join(root, "lib"), path.join(out, "lib"));
copyDir(path.join(root, "pets"), path.join(out, "pets"), n => n.endsWith(".js"));
copyDir(path.join(root, "assets"), path.join(out, "assets"), n => n.endsWith(".png"));
copy(path.join(root, "config.js"), path.join(out, "config.js"));

const threeSources = [
  path.join(root, "node_modules", "three", "build", "three.min.js"),
  path.join(root, "vendor", "three.min.js")
];
const threeFile = threeSources.find(f => fs.existsSync(f));
if (threeFile) copy(threeFile, path.join(out, "vendor", "three.min.js"));
else console.warn("three.min.js nao encontrado: o app vai carregar do CDN. Rode npm install antes para incluir localmente.");

const petFiles = fs
  .readdirSync(path.join(out, "pets"))
  .filter(f => f.endsWith(".js"))
  .sort()
  .map(f => "pets/" + f);
const build = Date.now().toString(36);
const crypto = require("crypto");
const vm = require("vm");
const petMeta = [];
const shared = ["lib/pet-kit.js", "lib/stage.js"].map(f => (fs.existsSync(path.join(out, f)) ? fs.readFileSync(path.join(out, f), "utf8") : "")).join("\n");
petFiles.forEach(f => {
  const src = fs.readFileSync(path.join(out, f), "utf8");
  const hash = crypto.createHash("sha1").update(src).update(shared).digest("hex").slice(0, 10);
  const sandbox = { Pets: { register: d => petMeta.push({ id: d.id, dex: d.dex || 999, name: d.name, color: d.color, types: d.types || [], description: d.description || "", evolvesTo: d.evolvesTo || null, evolveBranches: d.evolveBranches || null, evolveLevel: d.evolveLevel || 0, file: f, hash }) } };
  try {
    vm.runInNewContext(src, sandbox, { filename: f });
  } catch (err) {
    console.warn("Nao foi possivel ler " + f + ": " + err.message);
  }
});
fs.writeFileSync(
  path.join(out, "pets-list.js"),
  "window.PET_FILES = " + JSON.stringify(petFiles) + ";\nwindow.PET_META = " + JSON.stringify(petMeta) + ";\nwindow.PETS_BUILD = " + JSON.stringify(build) + ";\n"
);

const indexPath = path.join(out, "index.html");
const origin = supabaseOrigin();
fs.writeFileSync(indexPath, fs.readFileSync(indexPath, "utf8").replace("__SUPABASE_ORIGIN__", origin));

const assets = ["./"].concat(walk(out).filter(f => f !== "sw.js"));
const sw = fs
  .readFileSync(path.join(root, "web-src", "sw.js"), "utf8")
  .replace("__BUILD__", build)
  .replace("__ASSETS__", JSON.stringify(assets));
fs.writeFileSync(path.join(out, "sw.js"), sw);

console.log("web/ gerado: " + assets.length + " arquivos" + (origin ? "" : " (Supabase nao configurado: app roda so local)"));
