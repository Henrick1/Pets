(function (root) {
  const FX = {
    fire: { color: 0xff7a2a, core: 0xffe08a, kind: "orb", size: 0.32 },
    water: { color: 0x4aa8ff, core: 0xd8f0ff, kind: "stream", size: 0.13, count: 20 },
    grass: { color: 0x5cc35a, core: 0xc8f59a, kind: "leaves", size: 0.2, count: 9 },
    electric: { color: 0xffe14a, core: 0xffffff, kind: "bolt", size: 0.05 },
    ice: { color: 0x9fe8ff, core: 0xffffff, kind: "shards", size: 0.18, count: 7 },
    fighting: { color: 0xff8a3d, core: 0xfff1c8, kind: "orb", size: 0.34 },
    poison: { color: 0xb05ad8, core: 0xe8b8ff, kind: "bubbles", size: 0.16, count: 11 },
    ground: { color: 0xc8a060, core: 0xf0dca0, kind: "quake", size: 0.26, count: 9 },
    flying: { color: 0xc8d8ff, core: 0xffffff, kind: "rings", size: 0.36, count: 4 },
    psychic: { color: 0xff5fa0, core: 0xffd0e4, kind: "rings", size: 0.3, count: 5 },
    bug: { color: 0xa8c820, core: 0xeaff9a, kind: "shards", size: 0.15, count: 9 },
    rock: { color: 0x9a8058, core: 0xd8c8a0, kind: "rocks", size: 0.26, count: 5 },
    ghost: { color: 0x7a58b8, core: 0xd6c4ff, kind: "orb", size: 0.34, wobble: 1 },
    dragon: { color: 0x7048f0, core: 0xc8b8ff, kind: "orb", size: 0.42 },
    dark: { color: 0x4a3060, core: 0xb080ff, kind: "orb", size: 0.36, wobble: 1 },
    steel: { color: 0xc8d0e0, core: 0xffffff, kind: "shards", size: 0.2, count: 6 },
    light: { color: 0xffd860, core: 0xffffff, kind: "beam", size: 0.22 },
    none: { color: 0xffffff, core: 0xfff4c0, kind: "orb", size: 0.24 }
  };

  function create(opts) {
    const { canvas, THREE, kit, Pets } = opts;
    const reduceMotion = !!opts.reduceMotion;
    const motion = reduceMotion ? 0.3 : 1;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8890d0, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(2, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: 1, far: 25 });
    sun.shadow.radius = 4;
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.18 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const padTex = (() => {
      const c = root.document.createElement("canvas");
      c.width = c.height = 128;
      const g = c.getContext("2d");
      const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,0.55)");
      grd.addColorStop(0.65, "rgba(255,255,255,0.32)");
      grd.addColorStop(0.9, "rgba(255,255,255,0.12)");
      grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })();

    const SLOTS = {
      me: { pos: new THREE.Vector3(-1.2, 0, 1.3), yaw: 0.9 },
      foe: { pos: new THREE.Vector3(1.3, 0, -1.9), yaw: -0.7 }
    };
    Object.keys(SLOTS).forEach(k => {
      const pad = new THREE.Mesh(new THREE.CircleGeometry(1.35, 48), new THREE.MeshBasicMaterial({ map: padTex, transparent: true, depthWrite: false, premultipliedAlpha: true }));
      pad.rotation.x = -Math.PI / 2;
      pad.position.copy(SLOTS[k].pos).setY(0.01);
      scene.add(pad);
      SLOTS[k].pad = pad;
    });

    const clock = new THREE.Clock();
    const fighters = { me: null, foe: null };
    const tweens = [];
    const fxGroup = new THREE.Group();
    scene.add(fxGroup);
    let shakeK = 0;
    let raf = 0;
    let running = false;
    let lastW = 0;
    let lastH = 0;

    const lerp = (a, b, k) => a + (b - a) * k;
    const smooth = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const now = opts.time || (() => clock.getElapsedTime());
    const wait = sec => new Promise(res => tween(sec, () => {}, res));

    function tween(dur, fn, done) {
      const tw = { start: now(), dur: Math.max(0.001, dur), fn, done };
      tweens.push(tw);
      return tw;
    }

    function disposeTree(node) {
      node.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m !== padTex && m.dispose && m.dispose());
      });
    }

    function measure(petRoot, all) {
      petRoot.updateMatrixWorld(true);
      const box = new THREE.Box3();
      const tmp = new THREE.Box3();
      petRoot.traverse(o => {
        if (!o.geometry || !o.isMesh) return;
        for (let p = o; p; p = p.parent) if (!p.visible) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (!all && ms.some(m => m.depthWrite === false || (m.transparent && m.opacity < 0.5))) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        box.union(tmp);
      });
      return box;
    }

    const idleState = (t, life) => ({ t, pointer: { x: 0, y: 0 }, lookYaw: 0, lookPitch: 0, blink: 1, action: null, hunger: 100, life: life === undefined ? 100 : life, joy: 100, dying: false, motion, reduceMotion });

    function build(side, sp, power) {
      const def = Pets.find(sp);
      if (!def) return null;
      const pet = def.create({ THREE, kit, reduceMotion, motion });
      const holder = new THREE.Group();
      const body = new THREE.Group();
      holder.add(body);
      body.add(pet.root);
      for (let i = 0; i < 20; i++) pet.update(idleState(i / 30));
      const solid = measure(pet.root, false);
      const full = measure(pet.root, true);
      const box = solid.isEmpty() ? full : solid;
      const size = box.isEmpty() ? new THREE.Vector3(2, 2, 2) : box.getSize(new THREE.Vector3());
      const fsize = full.isEmpty() ? size : full.getSize(new THREE.Vector3());
      const dim = Math.max(size.y, size.x * 0.85, size.z * 0.7, fsize.y * 0.8, fsize.x * 0.6);
      const target = 1.75 + Math.max(0, Math.min(1, power)) * 0.75;
      const scale = Math.max(0.3, Math.min(1.8, target / dim));
      body.scale.setScalar(scale);
      holder.position.copy(SLOTS[side].pos);
      holder.rotation.y = SLOTS[side].yaw;
      scene.add(holder);
      const height = (box.isEmpty() ? 2 : box.max.y) * scale;
      const f = { side, sp, def, pet, holder, body, scale, height, dim, action: null, counts: {}, flash: 0, flashColor: 0xffffff, offset: new THREE.Vector3(), tilt: 0, sink: 0, k: 1, blinkAt: 1 + Math.random() * 2, life: 100 };
      return f;
    }

    function remove(side) {
      const f = fighters[side];
      if (!f) return;
      scene.remove(f.holder);
      disposeTree(f.holder);
      fighters[side] = null;
    }

    function center(f) {
      return f.holder.position.clone().add(new THREE.Vector3(0, f.height * 0.5, 0));
    }

    function muzzle(f) {
      if (f.pet.muzzle) {
        f.holder.updateMatrixWorld(true);
        return f.pet.muzzle.getWorldPosition(new THREE.Vector3());
      }
      const dir = new THREE.Vector3(Math.sin(SLOTS[f.side].yaw), 0, Math.cos(SLOTS[f.side].yaw));
      return f.holder.position.clone().add(new THREE.Vector3(0, f.height * 0.62, 0)).add(dir.multiplyScalar(f.dim * f.scale * 0.35));
    }

    function addFx(mesh) {
      fxGroup.add(mesh);
      return mesh;
    }
    function dropFx(mesh) {
      fxGroup.remove(mesh);
      disposeTree(mesh);
    }
    const glowMat = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, premultipliedAlpha: true });
    const solidMat = color => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, premultipliedAlpha: true });

    function ringPulse(pos, color, r0, r1, dur, flat) {
      const m = addFx(new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), glowMat(color, 0.9)));
      m.position.copy(pos);
      if (flat) m.rotation.x = Math.PI / 2;
      tween(dur, p => {
        m.scale.setScalar(lerp(r0, r1, p));
        m.material.opacity = 0.9 * (1 - p);
      }, () => dropFx(m));
    }

    function burst(pos, fx, big) {
      const flash = addFx(new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), glowMat(fx.core, 0.9)));
      flash.position.copy(pos);
      tween(0.32, p => {
        flash.scale.setScalar(0.4 + p * (big ? 2.4 : 1.6));
        flash.material.opacity = 0.9 * (1 - p);
      }, () => dropFx(flash));
      const n = big ? 14 : 9;
      for (let i = 0; i < n; i++) {
        const s = addFx(new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + Math.random() * 0.06), glowMat(i % 3 ? fx.color : fx.core)));
        const v = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(2.2 + Math.random() * 2.2);
        s.position.copy(pos);
        const p0 = pos.clone();
        tween(0.5 + Math.random() * 0.25, p => {
          s.position.set(p0.x + v.x * p * 0.6, p0.y + v.y * p * 0.6 - 2.5 * p * p * 0.6, p0.z + v.z * p * 0.6);
          s.rotation.set(p * 9, p * 7, 0);
          s.material.opacity = 1 - p;
        }, () => dropFx(s));
      }
      ringPulse(pos, fx.color, 0.2, big ? 1.5 : 1.1, 0.35);
    }

    function project(from, to, fx, onArrive) {
      const dir = to.clone().sub(from);
      const len = dir.length();
      const n = dir.clone().normalize();
      const side = new THREE.Vector3(-n.z, 0, n.x).normalize();
      const up = new THREE.Vector3(0, 1, 0);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      const at = (p, arc) => from.clone().add(dir.clone().multiplyScalar(p)).add(up.clone().multiplyScalar(Math.sin(p * Math.PI) * (arc || 0)));
      let arrived = false;
      const arrive = () => {
        if (arrived) return;
        arrived = true;
        onArrive();
      };
      const kind = fx.kind;
      if (kind === "orb") {
        const g = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(fx.size * 0.55, 16, 12), solidMat(fx.core));
        const halo = new THREE.Mesh(new THREE.SphereGeometry(fx.size, 16, 12), glowMat(fx.color, 0.6));
        g.add(core, halo);
        addFx(g);
        let lastTrail = 0;
        tween(0.5, p => {
          const pos = at(p, 0.4);
          if (fx.wobble) pos.add(side.clone().multiplyScalar(Math.sin(p * 18) * 0.18));
          g.position.copy(pos);
          const pulse = 1 + Math.sin(p * 40) * 0.12;
          halo.scale.setScalar(pulse);
          g.scale.setScalar(smooth(0, 0.12, p) * 0.5 + 0.5);
          if (p - lastTrail > 0.06) {
            lastTrail = p;
            const tr = addFx(new THREE.Mesh(new THREE.SphereGeometry(fx.size * 0.5, 10, 8), glowMat(fx.color, 0.5)));
            tr.position.copy(pos);
            tween(0.35, q => {
              tr.scale.setScalar(1 - q);
              tr.material.opacity = 0.5 * (1 - q);
            }, () => dropFx(tr));
          }
        }, () => {
          dropFx(g);
          arrive();
        });
      } else if (kind === "stream" || kind === "shards" || kind === "leaves" || kind === "bubbles") {
        const count = fx.count || 8;
        const travel = kind === "bubbles" ? 0.6 : kind === "leaves" ? 0.5 : 0.32;
        const gap = kind === "stream" ? 0.018 : 0.05;
        for (let i = 0; i < count; i++) {
          let geo;
          if (kind === "shards") geo = new THREE.OctahedronGeometry(fx.size, 0);
          else if (kind === "leaves") geo = new THREE.SphereGeometry(fx.size, 10, 6);
          else geo = new THREE.SphereGeometry(fx.size * (kind === "bubbles" ? 0.8 + Math.random() * 0.6 : 1), 10, 8);
          const m = addFx(new THREE.Mesh(geo, kind === "bubbles" ? glowMat(fx.color, 0.55) : kind === "leaves" ? solidMat(i % 2 ? fx.color : fx.core) : glowMat(i % 3 ? fx.color : fx.core, 0.9)));
          if (kind === "shards") m.scale.set(0.5, 1.8, 0.5);
          if (kind === "leaves") m.scale.set(1, 0.18, 0.55);
          m.visible = false;
          const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.25);
          const phase = Math.random() * 6;
          const delay = i * gap;
          tween(delay + travel, q => {
            const p = Math.max(0, (q * (delay + travel) - delay) / travel);
            m.visible = p > 0 && p < 1;
            const pos = at(p, kind === "bubbles" ? 0.5 : kind === "leaves" ? 0.25 : 0.1).add(jitter.clone().multiplyScalar(Math.sin(p * Math.PI)));
            if (kind === "leaves") pos.add(side.clone().multiplyScalar(Math.sin(p * 9 + phase) * 0.35)).add(up.clone().multiplyScalar(Math.cos(p * 9 + phase) * 0.25));
            if (kind === "bubbles") pos.add(side.clone().multiplyScalar(Math.sin(p * 12 + phase) * 0.12));
            m.position.copy(pos);
            if (kind === "shards") m.quaternion.copy(quat);
            if (kind === "leaves") m.rotation.set(p * 14 + phase, p * 9, p * 6);
          }, () => {
            dropFx(m);
            if (i === count - 1) arrive();
          });
        }
        tween(travel + gap * 2, () => {}, arrive);
      } else if (kind === "bolt") {
        const segs = 9;
        const parts = [];
        for (let i = 0; i < segs; i++) {
          const m = addFx(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6), glowMat(i % 2 ? fx.color : fx.core)));
          parts.push(m);
        }
        const halo = addFx(new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), glowMat(fx.color, 0.5)));
        halo.position.copy(from);
        const pts = () => {
          const out = [from.clone()];
          for (let i = 1; i < segs; i++) out.push(at(i / segs, 0).add(side.clone().multiplyScalar((Math.random() - 0.5) * 0.6)).add(up.clone().multiplyScalar((Math.random() - 0.5) * 0.5)));
          out.push(to.clone());
          return out;
        };
        let last = -1;
        tween(0.45, p => {
          const reach = smooth(0, 0.25, p);
          if (Math.floor(p * 20) !== last) {
            last = Math.floor(p * 20);
            const ps = pts();
            parts.forEach((m, i) => {
              const a = ps[i];
              const b = ps[i + 1];
              const visible = (i + 1) / segs <= reach + 0.001;
              m.visible = visible;
              if (!visible) return;
              const mid = a.clone().add(b).multiplyScalar(0.5);
              const d = b.clone().sub(a);
              m.position.copy(mid);
              m.scale.set(1, d.length(), 1);
              m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
            });
          }
          if (p > 0.25) arrive();
          parts.forEach(m => (m.material.opacity = 1 - smooth(0.7, 1, p)));
          halo.material.opacity = 0.5 * (1 - p);
        }, () => {
          parts.forEach(dropFx);
          dropFx(halo);
          arrive();
        });
      } else if (kind === "beam") {
        const beam = addFx(new THREE.Mesh(new THREE.CylinderGeometry(fx.size, fx.size, 1, 16, 1, true), glowMat(fx.color, 0.75)));
        const core = addFx(new THREE.Mesh(new THREE.CylinderGeometry(fx.size * 0.4, fx.size * 0.4, 1, 10, 1, true), solidMat(fx.core)));
        const orb = addFx(new THREE.Mesh(new THREE.SphereGeometry(fx.size * 1.6, 14, 10), glowMat(fx.core, 0.8)));
        orb.position.copy(from);
        tween(0.55, p => {
          const reach = smooth(0, 0.25, p);
          const fade = 1 - smooth(0.7, 1, p);
          const end = at(reach, 0);
          const mid = from.clone().add(end).multiplyScalar(0.5);
          [beam, core].forEach(m => {
            m.position.copy(mid);
            m.quaternion.copy(quat);
            m.scale.set(fade * (1 + Math.sin(p * 50) * 0.1), Math.max(0.001, len * reach), fade * (1 + Math.sin(p * 50) * 0.1));
          });
          orb.scale.setScalar(fade * (1 + Math.sin(p * 30) * 0.15));
          if (p > 0.26) arrive();
        }, () => {
          [beam, core, orb].forEach(dropFx);
          arrive();
        });
      } else if (kind === "rings") {
        const count = fx.count || 4;
        for (let i = 0; i < count; i++) {
          const m = addFx(new THREE.Mesh(new THREE.TorusGeometry(fx.size, 0.045, 8, 32), glowMat(i % 2 ? fx.color : fx.core, 0.9)));
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
          m.visible = false;
          const delay = i * 0.08;
          tween(delay + 0.42, q => {
            const p = Math.max(0, (q * (delay + 0.42) - delay) / 0.42);
            m.visible = p > 0 && p < 1;
            m.position.copy(at(p, 0.1));
            m.scale.setScalar(0.5 + p * 1.4);
            m.material.opacity = 0.9 * (1 - smooth(0.75, 1, p));
          }, () => {
            dropFx(m);
            if (i === count - 1) arrive();
          });
        }
      } else if (kind === "rocks") {
        const count = fx.count || 4;
        for (let i = 0; i < count; i++) {
          const m = addFx(new THREE.Mesh(new THREE.DodecahedronGeometry(fx.size * (0.7 + Math.random() * 0.6), 0), new THREE.MeshStandardMaterial({ color: fx.color, roughness: 0.9, flatShading: true })));
          m.castShadow = true;
          m.visible = false;
          const jitter = side.clone().multiplyScalar((Math.random() - 0.5) * 0.7);
          const delay = i * 0.07;
          tween(delay + 0.45, q => {
            const p = Math.max(0, (q * (delay + 0.45) - delay) / 0.45);
            m.visible = p > 0 && p < 1;
            m.position.copy(at(p, 1.1).add(jitter.clone().multiplyScalar(Math.sin(p * Math.PI))));
            m.rotation.set(p * 8, p * 5, 0);
          }, () => {
            dropFx(m);
            if (i === count - 1) arrive();
          });
        }
      } else if (kind === "quake") {
        const count = fx.count || 8;
        const base = from.clone().setY(0);
        const goal = to.clone().setY(0);
        const flat = goal.clone().sub(base);
        for (let i = 0; i < count; i++) {
          const m = addFx(new THREE.Mesh(new THREE.ConeGeometry(fx.size * (0.8 + Math.random() * 0.5), fx.size * 3, 5), new THREE.MeshStandardMaterial({ color: i % 2 ? fx.color : 0x8a6a40, roughness: 1, flatShading: true })));
          const p = (i + 1) / count;
          const pos = base.clone().add(flat.clone().multiplyScalar(p)).add(side.clone().multiplyScalar((Math.random() - 0.5) * 0.5));
          m.position.copy(pos);
          m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
          m.visible = false;
          const delay = i * 0.04;
          tween(delay + 0.5, q => {
            const k = Math.max(0, (q * (delay + 0.5) - delay) / 0.5);
            m.visible = k > 0 && k < 1;
            m.scale.setScalar(Math.sin(Math.min(1, k * 1.4) * Math.PI) * 1 + 0.001);
            m.position.y = Math.sin(Math.min(1, k * 1.4) * Math.PI) * fx.size * 1.2 - fx.size * 0.5;
          }, () => dropFx(m));
        }
        shakeK = Math.max(shakeK, 0.6);
        tween(count * 0.04 + 0.2, () => {}, arrive);
      } else arrive();
    }

    function playAction(f, name) {
      const def = f.def;
      const spec = (def.battle && def.battle[name]) || {};
      const act = spec.action || name;
      const has = !!(def.actions && def.actions[act]);
      const base = has ? def.actions[act].duration : name === "attack" ? 1.1 : 1.4;
      const dur = base / (spec.speed || 1);
      const hit = spec.hit || (name === "attack" ? 0.45 : 0.5);
      f.counts[act] = (f.counts[act] || 0) + 1;
      f.action = has ? { name: act, start: now(), dur, n: f.counts[act] } : { name: "__none", start: now(), dur, n: 1 };
      return { dur, hit };
    }

    function setFighter(side, sp, o = {}) {
      remove(side);
      const f = build(side, sp, o.power === undefined ? 0.5 : o.power);
      fighters[side] = f;
      placeCamera();
      if (!f) return Promise.resolve();
      f.life = o.life === undefined ? 100 : o.life;
      if (o.instant) return Promise.resolve();
      f.k = 0;
      ringPulse(f.holder.position.clone().setY(0.05), 0xffffff, 0.3, 1.6, 0.5, true);
      return new Promise(res =>
        tween(0.6, p => {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          f.k = Math.max(0.001, 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2));
          f.flash = 1 - p;
          f.flashColor = 0xffffff;
        }, () => {
          f.k = 1;
          f.flash = 0;
          res();
        })
      );
    }

    function recall(side) {
      const f = fighters[side];
      if (!f) return Promise.resolve();
      const beam = addFx(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 6, 20, 1, true), glowMat(0xffe0e0, 0.0)));
      beam.position.copy(f.holder.position).setY(3);
      return new Promise(res =>
        tween(0.5, p => {
          f.flash = Math.min(1, p * 2);
          f.flashColor = 0xffd0d0;
          f.k = Math.max(0.001, 1 - smooth(0.25, 1, p));
          beam.material.opacity = Math.sin(p * Math.PI) * 0.45;
        }, () => {
          dropFx(beam);
          remove(side);
          res();
        })
      );
    }

    function attack(side, o, onImpact) {
      const f = fighters[side];
      const t = fighters[side === "me" ? "foe" : "me"];
      if (!f) {
        if (onImpact) onImpact();
        return Promise.resolve();
      }
      const fx = FX[o.type] || FX.none;
      const status = o.cat === "status";
      const phys = o.cat === "phys";
      const plan = playAction(f, phys ? "attack" : "special");
      const dur = plan.dur;
      const hitAt = plan.hit;
      const aimK = status ? 0 : side === "me" ? 0.85 : 1;
      tween(dur, p => {
        f.aim = aimK * smooth(0, Math.min(0.25, hitAt * 0.6), p) * (1 - smooth(Math.min(0.95, hitAt + 0.35), 1, p));
      }, () => (f.aim = 0));
      let hit = false;
      const impact = () => {
        if (hit) return;
        hit = true;
        if (onImpact) onImpact();
      };
      return new Promise(res => {
        if (phys) {
          const from = f.holder.position.clone();
          const goal = t ? t.holder.position.clone() : from.clone();
          const dash = goal.sub(from).multiplyScalar(0.42);
          tween(dur, p => {
            const wind = smooth(hitAt - 0.3, hitAt - 0.12, p) * (1 - smooth(hitAt - 0.1, hitAt - 0.02, p));
            const lunge = smooth(hitAt - 0.13, hitAt, p) * (1 - smooth(hitAt + 0.12, Math.min(1, hitAt + 0.45), p));
            f.offset.copy(dash).multiplyScalar(lunge - wind * 0.12);
            if (p >= hitAt && !hit) {
              if (t) burst(center(t).add(dash.clone().normalize().multiplyScalar(-0.3)), fx, false);
              impact();
            }
          }, () => {
            f.offset.set(0, 0, 0);
            impact();
            res();
          });
        } else {
          let launched = false;
          let arrivedAt = 0;
          tween(dur, p => {
            const charge = smooth(0, hitAt - 0.04, p) * (1 - smooth(hitAt, hitAt + 0.1, p));
            const burstK = smooth(hitAt - 0.04, hitAt + 0.04, p) * (1 - smooth(hitAt + 0.12, hitAt + 0.4, p));
            f.flash = charge * 0.32 + burstK * 0.22;
            f.flashColor = fx.color;
            if (p >= hitAt && !launched) {
              launched = true;
              if (status) {
                ringPulse(f.holder.position.clone().setY(0.06), fx.color, 0.3, 1.8, 0.6, true);
                ringPulse(center(f), fx.core, 0.2, 1.4, 0.5);
                impact();
              } else if (t) {
                project(muzzle(f), center(t), fx, () => {
                  burst(center(t), fx, o.eff >= 2);
                  arrivedAt = now();
                  impact();
                });
              } else impact();
            }
          }, () => {
            f.flash = 0;
            const finish = () => {
              impact();
              res();
            };
            if (!launched || status) finish();
            else {
              const check = () => (hit && now() - arrivedAt > 0.15 ? finish() : tween(0.05, () => {}, check));
              check();
            }
          });
        }
      });
    }

    function hitReact(side, o = {}) {
      const f = fighters[side];
      if (!f) return Promise.resolve();
      const other = fighters[side === "me" ? "foe" : "me"];
      const away = other ? f.holder.position.clone().sub(other.holder.position).setY(0).normalize() : new THREE.Vector3(0, 0, -1);
      const strong = o.eff >= 2 || o.crit;
      if (o.eff === 0) {
        const puff = addFx(new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), glowMat(0xcccccc, 0.4)));
        puff.position.copy(center(f));
        return new Promise(res => tween(0.4, p => {
          puff.scale.setScalar(1 + p);
          puff.material.opacity = 0.4 * (1 - p);
        }, () => {
          dropFx(puff);
          res();
        }));
      }
      if (strong) shakeK = Math.max(shakeK, o.crit ? 0.9 : 0.7);
      return new Promise(res =>
        tween(strong ? 0.6 : 0.45, p => {
          const k = Math.sin(Math.min(1, p * 1.6) * Math.PI) * (1 - p * 0.3);
          f.offset.copy(away).multiplyScalar(k * (strong ? 0.45 : 0.28));
          f.tilt = Math.sin(p * 30) * 0.08 * (1 - p);
          f.flash = Math.floor(p * 10) % 2 === 0 ? 1 - p : 0;
          f.flashColor = 0xffffff;
        }, () => {
          f.offset.set(0, 0, 0);
          f.tilt = 0;
          f.flash = 0;
          res();
        })
      );
    }

    function dodge(side) {
      const f = fighters[side];
      if (!f) return Promise.resolve();
      const lateral = new THREE.Vector3(Math.cos(SLOTS[side].yaw), 0, -Math.sin(SLOTS[side].yaw));
      return new Promise(res =>
        tween(0.5, p => {
          f.offset.copy(lateral).multiplyScalar(Math.sin(p * Math.PI) * 0.7);
        }, () => {
          f.offset.set(0, 0, 0);
          res();
        })
      );
    }

    function faint(side) {
      const f = fighters[side];
      if (!f) return Promise.resolve();
      return new Promise(res =>
        tween(0.9, p => {
          f.tilt = smooth(0, 0.6, p) * 0.5;
          f.sink = smooth(0.2, 1, p) * f.height * 0.4;
          f.k = Math.max(0.001, 1 - smooth(0.35, 1, p));
          f.flash = smooth(0.3, 0.8, p) * 0.6;
          f.flashColor = 0x8888aa;
        }, () => {
          f.holder.visible = false;
          res();
        })
      );
    }

    function statFx(side, up) {
      const f = fighters[side];
      if (!f) return Promise.resolve();
      const color = up ? 0x6fd8ff : 0xa070ff;
      const base = f.holder.position.clone();
      const n = 10;
      for (let i = 0; i < n; i++) {
        const m = addFx(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 6), glowMat(color, 0.9)));
        if (!up) m.rotation.x = Math.PI;
        const a = (i / n) * Math.PI * 2;
        const r = 0.55 + (i % 3) * 0.2;
        const delay = (i % 5) * 0.06;
        m.visible = false;
        tween(delay + 0.7, q => {
          const p = Math.max(0, (q * (delay + 0.7) - delay) / 0.7);
          m.visible = p > 0 && p < 1;
          const y = up ? lerp(0.1, f.height * 1.1, p) : lerp(f.height * 1.1, 0.1, p);
          m.position.set(base.x + Math.sin(a) * r, y, base.z + Math.cos(a) * r);
          m.material.opacity = 0.9 * Math.sin(p * Math.PI);
        }, () => dropFx(m));
      }
      f.flashColor = color;
      return new Promise(res => tween(0.85, p => (f.flash = Math.sin(p * Math.PI) * 0.4), () => {
        f.flash = 0;
        res();
      }));
    }

    function healFx(side) {
      const f = fighters[side];
      if (!f) return Promise.resolve();
      const base = f.holder.position.clone();
      for (let i = 0; i < 14; i++) {
        const m = addFx(new THREE.Mesh(new THREE.SphereGeometry(0.06 + Math.random() * 0.05, 8, 6), glowMat(i % 2 ? 0x7aff9a : 0xd8ffe0, 0.9)));
        const a = Math.random() * Math.PI * 2;
        const r = 0.3 + Math.random() * 0.7;
        const delay = Math.random() * 0.3;
        m.visible = false;
        tween(delay + 0.8, q => {
          const p = Math.max(0, (q * (delay + 0.8) - delay) / 0.8);
          m.visible = p > 0 && p < 1;
          m.position.set(base.x + Math.sin(a + p * 2) * r, lerp(0.2, f.height * 1.15, p), base.z + Math.cos(a + p * 2) * r);
          m.material.opacity = 0.9 * Math.sin(p * Math.PI);
        }, () => dropFx(m));
      }
      f.flashColor = 0x7aff9a;
      return new Promise(res => tween(0.9, p => (f.flash = Math.sin(p * Math.PI) * 0.45), () => {
        f.flash = 0;
        res();
      }));
    }

    function setLife(side, life) {
      if (fighters[side]) fighters[side].life = life;
    }

    const probe = new THREE.Vector3();
    let camD = 10;
    function fits(d) {
      camera.position.set(0.05, 1.2 + d * 0.27, d);
      camera.lookAt(0.05, 1.45, -0.35);
      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();
      const sides = ["me", "foe"];
      for (let k = 0; k < sides.length; k++) {
        const side = sides[k];
        const f = fighters[side];
        const pos = SLOTS[side].pos;
        const r = f ? Math.max(0.6, f.dim * f.scale * 0.4) : 1;
        const top = f ? f.height : 2.1;
        const pts = [[-r, 0, 0], [r, 0, 0], [0, 0, r], [0, 0, -r], [-r * 0.8, top, 0], [r * 0.8, top, 0]];
        for (let i = 0; i < pts.length; i++) {
          probe.set(pos.x + pts[i][0], pts[i][1], pos.z + pts[i][2]).project(camera);
          if (Math.abs(probe.x) > 0.95) return false;
          if (side === "foe" && probe.y > 0.6) return false;
          if (side === "me" && probe.y > 0.8) return false;
          if (probe.y < -0.95) return false;
        }
      }
      return true;
    }
    function placeCamera() {
      let d = 7;
      while (d < 32 && !fits(d)) d += 0.5;
      camD = d;
      fits(d);
    }
    function resize() {
      const w = canvas.clientWidth || canvas.width || 1;
      const h = canvas.clientHeight || canvas.height || 1;
      renderer.setSize(w, h, false);
      lastW = canvas.clientWidth;
      lastH = canvas.clientHeight;
      camera.aspect = w / h;
      placeCamera();
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      const t = now();
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw && ch && (cw !== lastW || ch !== lastH)) resize();
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const p = Math.min(1, (t - tw.start) / tw.dur);
        tw.fn(p);
        if (p >= 1) {
          tweens.splice(i, 1);
          if (tw.done) tw.done();
        }
      }
      ["me", "foe"].forEach(side => {
        const f = fighters[side];
        if (!f) return;
        let action = null;
        if (f.action) {
          const p = (t - f.action.start) / f.action.dur;
          if (p >= 1) f.action = null;
          else if (f.action.name !== "__none") action = { name: f.action.name, p, n: f.action.n };
        }
        if (t > f.blinkAt + 0.16) f.blinkAt = t + 2 + Math.random() * 3;
        const bp = (t - f.blinkAt) / 0.16;
        const blink = bp >= 0 && bp <= 1 ? 1 - Math.sin(bp * Math.PI) * 0.9 : 1;
        const st = idleState(t, f.life);
        st.blink = blink;
        st.action = action;
        f.pet.update(st);
        f.pet.root.rotation.z = 0;
        f.pet.root.scale.set(1, 1, 1);
        f.holder.position.copy(SLOTS[side].pos).add(f.offset);
        f.holder.position.y = -f.sink;
        f.holder.rotation.z = f.tilt * (side === "me" ? -1 : 1);
        const foeSide = fighters[side === "me" ? "foe" : "me"];
        let aimYaw = SLOTS[side].yaw;
        if (foeSide) {
          const d = SLOTS[side === "me" ? "foe" : "me"].pos.clone().sub(SLOTS[side].pos);
          aimYaw = Math.atan2(d.x, d.z);
        }
        f.holder.rotation.y = lerp(SLOTS[side].yaw, aimYaw, f.aim || 0);
        f.holder.scale.setScalar(f.k);
        if (f.flash > 0.001) {
          kit.glow(f.pet.root, f.flashColor, f.flash);
          f.glowing = true;
        } else if (f.glowing) {
          kit.glow(f.pet.root, f.flashColor, 0);
          f.glowing = false;
        }
      });
      if (shakeK > 0.001) {
        shakeK *= 0.9;
        fits(camD);
        camera.position.x += (Math.random() - 0.5) * shakeK * 0.25;
        camera.position.y += (Math.random() - 0.5) * shakeK * 0.2;
      }
      renderer.render(scene, camera);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      frame();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    function dispose() {
      stop();
      remove("me");
      remove("foe");
      tweens.length = 0;
      while (fxGroup.children.length) dropFx(fxGroup.children[0]);
      renderer.dispose();
    }

    return { setFighter, recall, attack, hitReact, dodge, faint, statFx, healFx, setLife, remove, resize, start, stop, dispose, wait, has: side => !!fighters[side] };
  }

  root.BattleStage = { create, FX };
})(typeof self !== "undefined" ? self : this);
