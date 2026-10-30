Pets.register({
  id: "cascalhinho",
  dex: 18,
  name: "Musgalho",
  color: "#9a958c",
  types: ["rock"],
  description: "Uma pedrinha cinza, emburrada e cheia de musgo, que passa o dia cochilando parada como uma pedra qualquer. Pela rachadinha do lado dá para ver um brilho roxo escondido lá dentro.",
  evolvesTo: "geodo",
  evolveLevel: 10,
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    roll: { duration: 1.8 },
    stomp: { duration: 1.6 }
  },
  battle: { attack: { action: "roll", hit: 0.5, speed: 1.0 }, special: { action: "stomp", hit: 0.6, speed: 1.0 } },
  idle: [
    { action: "stomp", min: 20, max: 45 },
    { action: "roll", min: 35, max: 70 }
  ],
  clickAction: n => ["stomp", "roll", "jump", "stomp"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);
    const spinG = new THREE.Group();
    squash.add(spinG);

    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const lump = (x, y, z, seed) =>
      Math.sin(x * 3.1 + seed) * Math.sin(y * 2.7 + seed * 1.3) * 0.5 +
      Math.sin(x * 5.3 - y * 4.1 + z * 3.7 + seed * 2.1) * 0.25 +
      Math.sin(z * 6.7 + x * 2.2 - seed) * 0.15;
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
    const rockGeo = (r, detail, amp, seed, colA, colB, colC) => {
      const g = new THREE.SphereGeometry(r, 18 + detail * 12, 12 + detail * 9);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(colA);
      const B = hexParts(colB);
      const C = hexParts(colC);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / r;
        const y = pos.getY(i) / r;
        const z = pos.getZ(i) / r;
        const n = lump(x, y, z, seed);
        const k = 1 + n * amp;
        pos.setXYZ(i, x * r * k, y * r * k, z * r * k);
        const f = Math.max(0, Math.min(1, 0.5 + n * 0.9));
        const speck = 0;
        for (let j = 0; j < 3; j++) col[i * 3 + j] = speck ? C[j] : lerp(A[j], B[j], f);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };

    const BODY_Y = 0.78;
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, map: stoneTex, bumpMap: stoneTex, bumpScale: 0.025 });
    const body = mesh(rockGeo(0.8, 3, 0.13, 1.7, 0x6a665e, 0xa8a398, 0xc4beb2), rockMat);
    body.scale.set(1.1, 0.88, 1.0);
    body.position.y = BODY_Y;
    spinG.add(body);

    const mossMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, bumpMap: stoneTex, bumpScale: 0.04 });
    [[0, 0.62, -0.05, 0.42], [0.32, 0.5, 0.22, 0.22], [-0.38, 0.52, 0.1, 0.2]].forEach(([x, y, z, r], k) => {
      const m = mesh(rockGeo(r, 2, 0.35, 4 + k, 0x3f7a2c, 0x7fbf4a, 0xa8d86a), mossMat, false);
      m.scale.set(1, 0.35, 1);
      m.position.set(x, BODY_Y + y, z);
      spinG.add(m);
    });
    const sprout = new THREE.Group();
    sprout.position.set(0.05, BODY_Y + 0.74, -0.05);
    spinG.add(sprout);
    const stem = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 6), mat(0x4f8a34), false);
    stem.position.y = 0.08;
    sprout.add(stem);
    [-1, 1].forEach(s => {
      const leaf = mesh(new THREE.SphereGeometry(0.06, 12, 8), mat(0x7fc64e), false);
      leaf.scale.set(1.4, 0.35, 0.7);
      leaf.position.set(0.06 * s, 0.16, 0);
      leaf.rotation.z = 0.4 * s;
      sprout.add(leaf);
    });

    const crackMat = new THREE.MeshBasicMaterial({ color: 0xc77dff });
    const crackPts = [[0.8, 0.32, 0.5], [0.86, 0.18, 0.42], [0.8, 0.05, 0.52], [0.88, -0.08, 0.4], [0.82, -0.2, 0.5]].map(([x, y, z]) => {
      const d = new THREE.Vector3(x, y, z).normalize();
      const k = 0.8 * (1 + lump(d.x, d.y, d.z, 1.7) * 0.13) * 1.005;
      return new THREE.Vector3(d.x * k * 1.1, d.y * k * 0.88 + BODY_Y, d.z * k);
    });
    const crack = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(crackPts), 24, 0.02, 5, false), crackMat, false);
    spinG.add(crack);
    const crackGlow = new THREE.PointLight(0xb46bff, 0.3, 1.5);
    crackGlow.position.set(1.0, BODY_Y, 0.7);
    spinG.add(crackGlow);

    const faceG = new THREE.Group();
    faceG.position.set(0, BODY_Y + 0.02, 0.8);
    spinG.add(faceG);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.7, whiteColor: 0xf6f2e8, pupilColor: 0x1d1a16 });
      e.g.position.set(0.22 * s, 0.08, 0);
      e.g.rotation.y = 0.15 * s;
      faceG.add(e.g);
      return e;
    });
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x8c877d, roughness: 0.95, map: stoneTex, bumpMap: stoneTex, bumpScale: 0.02 });
    const lids = [-1, 1].map(s => {
      const lid = mesh(new THREE.SphereGeometry(0.165, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), lidMat, false);
      lid.scale.set(1.0, 1.05, 0.62);
      lid.position.set(0.22 * s, 0.08, 0.01);
      lid.rotation.set(0.15, 0.15 * s, 0.3 * s);
      faceG.add(lid);
      return lid;
    });
    const frown = mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 16, Math.PI), mat(0x2a2620), false);
    frown.position.set(0, -0.15, 0.04);
    faceG.add(frown);

    spinG.children.forEach(c => {
      c.position.y -= BODY_Y;
    });
    spinG.position.y = BODY_Y;

    const feet = [-1, 1].map(s => {
      const f = mesh(rockGeo(0.16, 1, 0.2, 7 + s, 0x45413b, 0x6e6a62, 0x8a857a), rockMat);
      f.scale.set(1.2, 0.6, 1.3);
      f.position.set(0.38 * s, 0.1, 0.18);
      squash.add(f);
      return f;
    });

    const pebbles = [];
    for (let k = 0; k < 8; k++) {
      const m = mesh(rockGeo(0.06 + (k % 3) * 0.02, 0, 0.3, k, 0x6f6a62, 0xaaa59a, 0xd8d2c4), rockMat, false);
      m.visible = false;
      root.add(m);
      pebbles.push({ m, k, a: (k / 8) * Math.PI * 2 + 0.3, sp: 0.8 + (k % 4) * 0.2 });
    }
    const dustMat = new THREE.MeshBasicMaterial({ color: 0xcfc6b4, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 8; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), dustMat);
      m.visible = false;
      root.add(m);
      dust.push({ m, a: (k / 8) * Math.PI * 2 });
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const roll = action && action.name === "roll" ? action : null;
        const stomp = action && action.name === "stomp" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 1.4) * 0.012 * motion;
        let airborne = false;
        let rollA = 0;
        let rollX = 0;
        let impact = 0;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.14 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.78) {
            const q = (p - 0.2) / 0.58;
            y = Math.sin(q * Math.PI) * 0.75;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            airborne = true;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.12 * Math.sin(q * Math.PI);
            impact = Math.sin(q * Math.PI);
          }
        }
        if (roll) {
          const p = roll.p;
          const k = smooth(0, 0.15, p) * (1 - smooth(0.85, 1, p));
          rollA = smooth(0.05, 0.95, p) * Math.PI * 2;
          rollX = Math.sin(p * Math.PI * 2) * 0.6 * k;
          y = Math.abs(Math.sin(rollA)) * 0.12;
        }
        if (stomp) {
          const p = stomp.p;
          const hops = [0.1, 0.4, 0.7];
          hops.forEach(h => {
            const q = (p - h) / 0.22;
            if (q > 0 && q < 1) {
              y = Math.max(y, Math.sin(q * Math.PI) * 0.22);
              if (q > 0.85) impact = Math.max(impact, (q - 0.85) / 0.15);
            }
          });
          sy -= impact * 0.1;
        }
        if (eat) sy += -ph.chew * 0.04;
        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(rollX, y, 0);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        spinG.rotation.z = roll ? -rollA : Math.sin(t * 0.8) * 0.02 * motion;

        lids.forEach((l, i) => {
          const s = i ? 1 : -1;
          l.rotation.x = airborne ? -0.5 : stomp ? 0.32 : 0.15 + Math.sin(t * 0.3) * 0.04;
          l.rotation.z = 0.3 * s + (stomp ? 0.15 * s : 0);
        });
        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.1 : eat && eat.p > 0.3 ? 0.4 : blink;
        });
        followPupils(eyes, pointer, 0.6);
        frown.rotation.z = airborne ? Math.PI : 0;
        frown.position.y = airborne ? -0.12 : -0.18;
        frown.scale.set(1, eat && eat.p > 0.3 && eat.p < 0.85 ? 0.5 + ph.chew : 1, 1);

        sprout.rotation.z = Math.sin(t * 2.4) * 0.15 * motion + (airborne ? 0.4 : 0) + impact * Math.sin(t * 30) * 0.3;
        crackMat.color.setHSL(0.77, 0.9, 0.62 + Math.sin(t * 2) * 0.08 + impact * 0.2);
        crackGlow.intensity = 0.25 + Math.sin(t * 2) * 0.08 + impact * 0.5;
        feet.forEach(f => {
          f.position.y = airborne ? 0.04 : 0.1;
        });

        const fx = impact > 0.05;
        pebbles.forEach(pb => {
          pb.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.7 + u * 0.6 * pb.sp;
          pb.m.position.set(rollX + Math.cos(pb.a) * r, 0.06 + Math.sin(u * Math.PI) * 0.4 * pb.sp, Math.sin(pb.a) * r);
          pb.m.rotation.set(t * 4 + pb.k, t * 3, 0);
        });
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.8 + u * 0.5;
          d.m.position.set(rollX + Math.cos(d.a) * r, 0.1 + u * 0.15, Math.sin(d.a) * r);
          d.m.scale.setScalar(0.6 + u * 0.8);
          dustMat.opacity = 0.45 * impact;
        });

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, BODY_Y - 0.12, ph.fall * ph.fall), 0.95);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.8);
        } else food.visible = false;
      }
    };
  }
});
