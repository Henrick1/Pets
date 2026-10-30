Pets.register({
  id: "geodo",
  dex: 19,
  name: "Cristalma",
  color: "#8e5cd8",
  types: ["rock", "psychic"],
  description: "Por fora parece só uma rocha velha, mas a casca se abre como uma concha e revela um interior forrado de cristais de ametista. No centro flutua um coração de cristal que lê pensamentos e amplifica tudo o que sente.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.6 },
    open: { duration: 3.0 },
    psy: { duration: 3.0 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "psy", hit: 0.3, speed: 1.5 } },
  idle: [
    { action: "open", min: 20, max: 45 },
    { action: "psy", min: 40, max: 80 }
  ],
  clickAction: n => ["open", "psy", "jump", "open"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const lump = (x, y, z, seed) =>
      Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed * 1.3) * 0.5 +
      Math.sin(x * 5.3 - y * 4.1 + z * 3.7 + seed * 2.1) * 0.25 +
      Math.sin(z * 6.7 + x * 2.2 - seed) * 0.15;

    const R = 0.92;
    const CUT_Y = 0.98;
    const stoneTex = (() => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#c9c6c0";
      g.fillRect(0, 0, 256, 256);
      let seed = 11;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const wrap = (x, y, fn) => {
        [-256, 0, 256].forEach(dx => [-256, 0, 256].forEach(dy => fn(x + dx, y + dy)));
      };
      for (let i = 0; i < 160; i++) {
        const x = rnd() * 256;
        const y = rnd() * 256;
        const r = 10 + rnd() * 34;
        const v = (150 + rnd() * 80) | 0;
        wrap(x, y, (px, py) => {
          const gr = g.createRadialGradient(px, py, 0, px, py, r);
          gr.addColorStop(0, "rgba(" + v + "," + v + "," + (v - 6) + ",0.45)");
          gr.addColorStop(1, "rgba(" + v + "," + v + "," + (v - 6) + ",0)");
          g.fillStyle = gr;
          g.fillRect(px - r, py - r, r * 2, r * 2);
        });
      }
      for (let i = 0; i < 3000; i++) {
        const x = rnd() * 256;
        const y = rnd() * 256;
        const dark = rnd() < 0.55;
        const v = dark ? (90 + rnd() * 50) | 0 : (215 + rnd() * 40) | 0;
        g.fillStyle = "rgba(" + v + "," + v + "," + v + "," + (0.25 + rnd() * 0.45) + ")";
        g.fillRect(x, y, 1 + rnd() * 2, 1 + rnd() * 2);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 2);
      return t;
    })();
    const shellHalf = (top, seed) => {
      const g = new THREE.SphereGeometry(R, 72, 36, 0, Math.PI * 2, top ? 0 : Math.PI / 2, Math.PI / 2);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x4a433c);
      const B = hexParts(0x857a6c);
      const C = hexParts(0xb8ab98);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / R;
        const y = pos.getY(i) / R;
        const z = pos.getZ(i) / R;
        const rim = Math.abs(y);
        const n = lump(x, y, z, seed) * smooth(0.02, 0.25, rim);
        const k = 1 + n * 0.12;
        pos.setXYZ(i, x * R * k, y * R * k * 0.92, z * R * k);
        const f = Math.max(0, Math.min(1, 0.5 + n * 1.2));
        const speck = 0;
        for (let j = 0; j < 3; j++) col[i * 3 + j] = speck ? C[j] : lerp(A[j], B[j], f);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: stoneTex, bumpMap: stoneTex, bumpScale: 0.03 });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0x3a1f5c, roughness: 0.6, side: THREE.BackSide });

    const bandRing = () => {
      const g = new THREE.RingGeometry(R * 0.7, R * 1.0, 64, 4);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const bands = [0xf4f0ea, 0xbfb6c8, 0xe6e0ef, 0x9a86c4, 0xd8cfe8, 0x6e4fa8].map(hexParts);
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        const f = (R - r) / (R * 0.3);
        const b = bands[Math.min(bands.length - 1, Math.max(0, Math.floor(f * bands.length)))];
        for (let j = 0; j < 3; j++) col[i * 3 + j] = b[j];
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    };
    const bandMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, side: THREE.DoubleSide });

    const crystalMats = [0xb37cff, 0x9b5cf0, 0xd2a8ff, 0x7f45d6].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: 0x6a2cc4, emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.92 }));
    const crystals = [];
    let cseed = 97;
    const crnd = () => {
      cseed = (cseed * 16807) % 2147483647;
      return cseed / 2147483647;
    };
    const lineWithCrystals = (group, top, count) => {
      const golden = Math.PI * (3 - Math.sqrt(5));
      for (let k = 0; k < count; k++) {
        const f = (k + 0.5) / count;
        const cy = top ? 0.04 + f * 0.94 : -(0.04 + f * 0.94);
        const rr = Math.sqrt(Math.max(0, 1 - cy * cy));
        const phi = k * golden + crnd() * 0.6;
        const base = V3(Math.cos(phi) * rr, cy, Math.sin(phi) * rr).normalize();
        const cluster = 1 + Math.floor(crnd() * 3);
        for (let c = 0; c < cluster; c++) {
          const d = base.clone().add(V3(crnd() - 0.5, crnd() - 0.5, crnd() - 0.5).multiplyScalar(0.18)).normalize();
          if (top ? d.y < 0.03 : d.y > -0.03) continue;
          const len = 0.12 + crnd() * 0.26;
          const rad = 0.035 + crnd() * 0.05;
          const cm = mesh(new THREE.ConeGeometry(rad, len, 6), crystalMats[Math.floor(crnd() * crystalMats.length)], false);
          cm.position.copy(d).multiplyScalar(R * 0.84 - len * 0.38);
          cm.position.y *= 0.92;
          const aim = d.clone().negate().add(V3(crnd() - 0.5, crnd() - 0.5, crnd() - 0.5).multiplyScalar(0.5)).normalize();
          cm.quaternion.setFromUnitVectors(V3(0, 1, 0), aim);
          cm.rotateY(crnd() * Math.PI);
          group.add(cm);
          crystals.push(cm);
        }
      }
    };

    const bottom = new THREE.Group();
    bottom.position.y = CUT_Y;
    squash.add(bottom);
    bottom.add(mesh(shellHalf(false, 2.2), rockMat));
    const bottomIn = mesh(new THREE.SphereGeometry(R * 0.86, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), innerMat, false);
    bottomIn.scale.y = 0.92;
    bottom.add(bottomIn);
    const bandB = mesh(bandRing(), bandMat, false);
    bandB.rotation.x = -Math.PI / 2;
    bandB.position.y = 0.002;
    bottom.add(bandB);
    lineWithCrystals(bottom, false, 70);

    const hinge = new THREE.Group();
    hinge.position.set(0, CUT_Y, -R * 0.95);
    squash.add(hinge);
    const top = new THREE.Group();
    top.position.set(0, 0, R * 0.95);
    hinge.add(top);
    top.add(mesh(shellHalf(true, 5.1), rockMat));
    const topIn = mesh(new THREE.SphereGeometry(R * 0.86, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), innerMat, false);
    topIn.scale.y = 0.92;
    top.add(topIn);
    const bandT = mesh(bandRing(), bandMat, false);
    bandT.rotation.x = Math.PI / 2;
    bandT.position.y = -0.002;
    top.add(bandT);
    lineWithCrystals(top, true, 60);


    const core = new THREE.Group();
    core.position.y = CUT_Y + 0.05;
    squash.add(core);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0xe0b8ff, emissive: 0xa45cff, emissiveIntensity: 0.7, roughness: 0.1, metalness: 0.1, flatShading: true });
    const heart = mesh(new THREE.OctahedronGeometry(0.3, 1), coreMat, false);
    heart.scale.set(1, 1.15, 0.9);
    core.add(heart);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.55, whiteColor: 0xffffff, pupilColor: 0x3a1268 });
      e.g.position.set(0.11 * s, 0.03, 0.24);
      e.g.rotation.y = 0.25 * s;
      core.add(e.g);
      return e;
    });
    const coreHalo = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), new THREE.MeshBasicMaterial({ color: 0xc58cff, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
    core.add(coreHalo);

    const shards = [];
    for (let k = 0; k < 7; k++) {
      const m = mesh(new THREE.ConeGeometry(0.06, 0.22, 6), crystalMats[k % crystalMats.length], false);
      m.visible = false;
      squash.add(m);
      shards.push({ m, k, a: (k / 7) * Math.PI * 2 });
    }
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xd2a8ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const waves = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.02, 6, 48), waveMat.clone());
      m.rotation.x = Math.PI / 2;
      m.visible = false;
      squash.add(m);
      return m;
    });

    const feet = [];
    [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([sx, sz]) => {
      const f = mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshStandardMaterial({ color: 0x6a6258, roughness: 0.95, map: stoneTex, bumpMap: stoneTex, bumpScale: 0.02 }), false);
      f.scale.set(1.2, 0.6, 1.2);
      f.position.set(0.48 * sx, 0.1, 0.38 * sz);
      squash.add(f);
      feet.push(f);
    });

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.25, 64),
      new THREE.MeshBasicMaterial({ color: 0xb37cff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    root.add(ring);

    const glow = new THREE.PointLight(0xc58cff, 0.6, 4);
    glow.position.set(0, CUT_Y + 0.1, 0.4);
    squash.add(glow);

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const openA = action && action.name === "open" ? action : null;
        const psy = action && action.name === "psy" ? action : null;
        const atk = action && action.name === "attack" ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const mind = s.dying ? 0.25 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        let open = 0.42 + Math.sin(t * 0.9) * 0.04 * motion;
        let rise = 0;
        let pulse = 0;
        let y = 0;
        let sy = 1;
        let airborne = false;
        if (openA) {
          const k = smooth(0, 0.18, openA.p) * (1 - smooth(0.82, 1, openA.p));
          open = lerp(open, 1.25, k);
          rise = k * 0.25;
          pulse = k;
        }
        if (psy) {
          const k = smooth(0, 0.2, psy.p) * (1 - smooth(0.8, 1, psy.p));
          open = lerp(open, 1.15, k);
          rise = k * (0.9 + Math.sin(t * 2) * 0.05);
          pulse = k * (1 + Math.max(0, Math.sin(t * 6)) * 0.5);
        }
        if (eat) {
          const k = eat.p < 0.3 ? smooth(0.05, 0.25, eat.p) : eat.p < 0.85 ? 1 - ph.chew * 0.7 : 1 - smooth(0.85, 1, eat.p);
          open = lerp(open, 1.0, k);
        }
        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.12 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.7;
            airborne = true;
            open = lerp(open, 0.9, Math.sin(q * Math.PI));
          } else sy = 1 - 0.1 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        let lungeZ = 0;
        let tilt = 0;
        if (atk) {
          const gape = Math.max(atk.wind, atk.lunge * (1 - smooth(0.4, 0.46, action.p)));
          open = lerp(open, 1.3, gape);
          open *= 1 - atk.impact * 0.9;
          sy = 1 - atk.wind * 0.12 + atk.impact * 0.06;
          y = Math.sin(smooth(0.3, 0.5, action.p) * Math.PI) * 0.3;
          airborne = y > 0.05;
          lungeZ = atk.lunge * 0.5 - atk.wind * 0.15;
          tilt = atk.lunge * 0.25 - atk.wind * 0.15;
          pulse = Math.max(pulse, atk.impact);
        }
        if (s.dying) open *= 0.4;
        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.y = y;
        root.position.z = lungeZ;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch + tilt;
        hinge.rotation.x = -open;

        core.position.y = CUT_Y + 0.08 + rise + Math.sin(t * 2) * 0.03 * motion;
        core.rotation.y = Math.sin(t * 0.7) * 0.25 + (psy ? t * 1.5 : 0) * 0;
        heart.rotation.y = t * 0.4;
        coreMat.emissiveIntensity = (0.6 + pulse * 0.9 + Math.sin(t * 2.5) * 0.1) * mind;
        coreHalo.scale.setScalar(1 + pulse * 0.6 + Math.sin(t * 3) * 0.05);
        coreHalo.material.opacity = (0.15 + pulse * 0.2) * mind;
        crystalMats.forEach((m, i) => {
          m.emissiveIntensity = (0.3 + pulse * 0.8 + Math.max(0, Math.sin(t * 3 + i * 1.6)) * 0.15) * mind;
        });
        eyes.forEach(({ g }) => {
          g.scale.y = eat && eat.p > 0.3 && eat.p < 0.85 ? 0.45 : psy ? 0.6 : blink;
        });
        followPupils(eyes, pointer, 0.6);

        shards.forEach(sh => {
          const on = rise > 0.3;
          sh.m.visible = on;
          if (!on) return;
          const a = sh.a + t * 1.6;
          const rad = 0.7 + Math.sin(t * 2 + sh.k) * 0.08;
          sh.m.position.set(Math.cos(a) * rad, core.position.y + Math.sin(a * 2 + sh.k) * 0.15, Math.sin(a) * rad);
          sh.m.rotation.set(t * 2 + sh.k, a, 0.5);
        });
        waves.forEach((w, k) => {
          const on = psy && pulse > 0.2;
          w.visible = !!on;
          if (!on) return;
          const u = (((t * 0.7 + k / 3) % 1) + 1) % 1;
          w.position.y = core.position.y;
          w.scale.setScalar(0.6 + u * 2.4);
          w.material.opacity = (1 - u) * 0.5 * mind;
        });
        feet.forEach(f => {
          f.position.y = airborne ? 0.04 : 0.1;
        });

        ring.scale.setScalar(1 + Math.sin(t * 2) * 0.04 + pulse * 0.4);
        ring.material.opacity = (0.15 + pulse * 0.25) * mind;
        glow.intensity = (0.4 + pulse * 1.4) * mind;
        glow.position.y = core.position.y;

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, CUT_Y + 0.15, ph.fall * ph.fall), lerp(0.4, 0.1, ph.fall));
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.9);
        } else food.visible = false;
      }
    };
  }
});
