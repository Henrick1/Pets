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
    return new URL(config.supabaseUrl).origin;
  } catch (err) {
    return "";
  }
}

reset(out);

copyDir(path.join(root, "web-src"), out, n => n !== "sw.js");
copyDir(path.join(root, "lib"), path.join(out, "lib"));
copyDir(path.join(root, "pets"), path.join(out, "pets"), n => n.endsWith(".js"));
copyDir(path.join(root, "assets"), path.join(out, "assets"), n => n.endsWith(".png"));
copyDir(path.join(root, "assets", "sprites"), path.join(out, "assets", "sprites"), n => n.endsWith(".png"));
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
fs.writeFileSync(
  path.join(out, "pets-list.js"),
  "window.PET_FILES = " + JSON.stringify(petFiles) + ";\nwindow.PETS_BUILD = " + JSON.stringify(build) + ";\n"
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
