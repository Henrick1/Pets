Pets.register({
  id: "balaozinho",
  dex: 26,
  name: "Balãozinho",
  color: "#7cc8ff",
  types: ["flying"],
  evolvesTo: "zepelume",
  evolveLevel: 16,
  description: "Um filhote do céu, redondo e macio, com asinhas e cauda feitas de nuvem. Quando enche o peito de ar, flutua como um balão e sopra rajadas de vento. Com fome, murcha e pousa emburrado.",
  actions: {
    jump: { duration: 1.6 },
    eat: { duration: 2.4 },
    puff: { duration: 2.0 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "puff", hit: 0.65, speed: 1.3 } },
  idle: [
    { action: "puff", min: 20, max: 45 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["puff", "jump", "puff"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);

    const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let sd = 5;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };
      draw(g, rnd, w, h);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      return t;
    };
    const fuzzDraw = base => (g, rnd, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4200; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const v = rnd();
        g.strokeStyle = v < 0.5 ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.06)";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() - 0.5) * 3, y + 3 + rnd() * 4);
        g.stroke();
      }
    };
    const fuzzTex = canvasTex(256, 256, fuzzDraw("#f7f7f7"), 6, 4);
    const fuzzBump = canvasTex(256, 256, fuzzDraw("#808080"), 6, 4);
    const featherTex = canvasTex(64, 256, (g, rnd, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,0.18)";
      g.fillRect(w / 2 - 1.5, 0, 3, h);
      for (let y = 6; y < h; y += 7) {
        g.strokeStyle = "rgba(0,0,0," + (0.06 + rnd() * 0.06) + ")";
        g.beginPath();
        g.moveTo(w / 2, y);
        g.lineTo(0, y - 10);
        g.moveTo(w / 2, y);
        g.lineTo(w, y - 10);
        g.stroke();
      }
    });

    const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: fuzzTex, bumpMap: fuzzBump, bumpScale: 0.006, roughness: 0.78 });
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, emissive: 0xdcecff, emissiveIntensity: 0.28, map: fuzzTex });
    const featherMats = [0x3f8fe6, 0x8fd3ff, 0xffffff].map(c => new THREE.MeshStandardMaterial({ color: c, map: featherTex, roughness: 0.7, side: THREE.DoubleSide }));
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffc23d, roughness: 0.32 });
    const beakDark = new THREE.MeshStandardMaterial({ color: 0xf29a2e, roughness: 0.4 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xffa94a, roughness: 0.5 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff9fb4, transparent: true, opacity: 0.65, depthWrite: false });
    const mouthIn = new THREE.MeshStandardMaterial({ color: 0x6a1f2e, roughness: 0.5 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff7f8f, roughness: 0.5 });

    const tube = (pts, r0, r1, seg = 30, rad = 10) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, seg, 1, rad, false);
      const p = g.attributes.position;
      for (let i = 0; i <= seg; i++) {
        const f = i / seg;
        const c = curve.getPointAt(f);
        const r = lerp(r0, r1, f);
        for (let j = 0; j <= rad; j++) {
          const k = i * (rad + 1) + j;
          const v = V3(p.getX(k), p.getY(k), p.getZ(k)).sub(c).multiplyScalar(r);
          p.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z);
        }
      }
      g.computeVertexNormals();
      return g;
    };
    const featherGeo = (len, wid, curl) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.quadraticCurveTo(-wid, len * 0.45, -wid * 0.15, len);
      sh.quadraticCurveTo(0, len * 1.04, wid * 0.15, len);
      sh.quadraticCurveTo(wid, len * 0.45, 0, 0);
      const g = new THREE.ShapeGeometry(sh, 16);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        p.setZ(i, -Math.abs(x) * 0.4 + (y / len) * (y / len) * curl);
        uv.setXY(i, x / (wid * 2) + 0.5, y / len);
      }
      g.computeVertexNormals();
      return g;
    };
    const cloud = (parts, mat) => {
      const g = new THREE.Group();
      parts.forEach(([x, y, z, r]) => {
        const b = mesh(new THREE.SphereGeometry(r, 22, 16), mat, false);
        b.position.set(x, y, z);
        g.add(b);
      });
      return g;
    };

    const root = new THREE.Group();
    const bod = new THREE.Group();
    bod.position.y = 0.9;
    root.add(bod);
    const puffG = new THREE.Group();
    bod.add(puffG);

    const prof = [V2(0.0, -0.84), V2(0.3, -0.81), V2(0.58, -0.66), V2(0.8, -0.4), V2(0.9, -0.06), V2(0.89, 0.28), V2(0.78, 0.58), V2(0.56, 0.82), V2(0.28, 0.95), V2(0.0, 0.98)];
    const profC = new THREE.SplineCurve(prof);
    const profPts = profC.getPoints(120);
    const rAt = y => {
      let best = profPts[0];
      profPts.forEach(p => {
        if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
      });
      return best.x;
    };
    const bodyGeo = new THREE.LatheGeometry(profPts, 128);
    const baseBody = Float32Array.from(bodyGeo.attributes.position.array);
    {
      const p = bodyGeo.attributes.position;
      const col = new Float32Array(p.count * 3);
      const sky = new THREE.Color(0x86ceff);
      const deep = new THREE.Color(0x4b9ff0);
      const cream = new THREE.Color(0xfff0d2);
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const a = Math.atan2(x, z);
        const edge = 0.5 + Math.sin(a * 9) * 0.05 - Math.cos(a) * 0.07;
        const cap = smooth(edge - 0.03, edge + 0.03, y);
        const back = smooth(0.2, -0.6, Math.cos(a)) * smooth(-0.5, 0.2, y) * 0.35;
        c.copy(sky).lerp(deep, Math.max(cap, back));
        const bx = Math.sin(a) / 0.6;
        const by = (y + 0.32) / 0.46;
        const belly = Math.max(0, Math.cos(a)) * smooth(1.04, 0.9, Math.hypot(bx, by));
        c.lerp(cream, Math.min(1, belly));
        const shade = 0.9 + 0.1 * smooth(-0.84, 0.2, y);
        col[i * 3] = c.r * shade;
        col[i * 3 + 1] = c.g * shade;
        col[i * 3 + 2] = c.b * shade;
      }
      bodyGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      bodyGeo.computeVertexNormals();
    }
    const body = mesh(bodyGeo, bodyMat);
    puffG.add(body);

    const crest = new THREE.Group();
    crest.position.set(0, 0.93, 0.05);
    puffG.add(crest);
    [
      [0, 0.56, 0.17, 0.3, 0, -0.55],
      [-0.12, 0.4, 0.13, 0.2, 1, -0.3],
      [0.12, 0.4, 0.13, 0.2, 1, -0.3],
      [0, 0.28, 0.1, 0.16, 2, -0.08]
    ].forEach(([x, len, wid, curl, m, tilt]) => {
      const f = mesh(featherGeo(len, wid, curl), featherMats[m], false);
      f.position.x = x;
      f.rotation.set(tilt, 0, -x * 2.6);
      crest.add(f);
    });
    const curlPts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const a = u * Math.PI * 1.5;
      curlPts.push(V3(0, 0.02 + Math.sin(a) * 0.16 * (1 - u * 0.35) + u * 0.12, 0.04 + (1 - Math.cos(a)) * 0.12 * (1 - u * 0.35)));
    }
    const curl = mesh(tube(curlPts, 0.04, 0.012, 30, 8), featherMats[0], false);
    curl.position.set(0, 0.0, 0.06);
    crest.add(curl);

    const wings = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.8 * s, 0.02, -0.06);
      puffG.add(pv);
      const fan = cloud(
        [
          [0.08, 0.0, 0.0, 0.2],
          [0.28, 0.1, -0.02, 0.19],
          [0.47, 0.22, -0.05, 0.16],
          [0.62, 0.35, -0.08, 0.12],
          [0.26, -0.1, 0.02, 0.15],
          [0.44, 0.03, 0.0, 0.13],
          [0.58, 0.16, -0.03, 0.1]
        ].map(([x, y, z, r]) => [x * s, y, z, r]),
        cloudMat
      );
      pv.add(fan);
      return { pv, s };
    });

    const tail = cloud(
      [
        [0, 0, 0, 0.17],
        [0.15, 0.06, -0.06, 0.13],
        [-0.15, 0.06, -0.06, 0.13],
        [0, 0.14, -0.12, 0.12]
      ],
      cloudMat
    );
    tail.position.set(0, -0.32, -0.8);
    puffG.add(tail);

    const faceY = 0.12;
    const fr = rAt(faceY);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 1.15 });
      const x = 0.31 * s;
      const y = faceY + 0.17;
      const r = rAt(y);
      e.g.position.set(x, y, Math.sqrt(r * r - x * x) - 0.07);
      e.g.rotation.y = Math.atan2(x, r) * 0.8;
      puffG.add(e.g);
      return e;
    });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.1, 28), cheekMat);
      const x = 0.53 * s;
      const y = faceY - 0.06;
      const r = rAt(y);
      c.scale.set(1, 0.62, 1);
      c.position.set(x, y, Math.sqrt(Math.max(0, r * r - x * x)) + 0.012);
      c.rotation.y = Math.atan2(x, r);
      puffG.add(c);
    });
    const beak = new THREE.Group();
    beak.position.set(0, faceY - 0.02, fr - 0.04);
    beak.scale.setScalar(1.75);
    puffG.add(beak);
    const upper = mesh(
      (() => {
        const g = new THREE.SphereGeometry(0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const z = p.getZ(i);
          const y = p.getY(i);
          const f = Math.max(0, z) / 0.1;
          p.setXYZ(i, p.getX(i) * (1 - f * 0.55), y * 0.55, z * 1.25);
        }
        g.computeVertexNormals();
        return g;
      })(),
      beakMat,
      false
    );
    upper.rotation.x = 0.12;
    beak.add(upper);
    const lowerPv = new THREE.Group();
    lowerPv.position.set(0, -0.004, -0.015);
    beak.add(lowerPv);
    const lower = mesh(
      (() => {
        const g = new THREE.SphereGeometry(0.08, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const z = p.getZ(i);
          const f = Math.max(0, z) / 0.08;
          p.setXYZ(i, p.getX(i) * (1 - f * 0.5), p.getY(i) * 0.45, z * 1.1);
        }
        g.computeVertexNormals();
        return g;
      })(),
      beakDark,
      false
    );
    lowerPv.add(lower);
    const inside = mesh(new THREE.SphereGeometry(0.065, 16, 12), mouthIn, false);
    inside.scale.set(1, 0.32, 1);
    inside.position.set(0, -0.012, 0.015);
    lowerPv.add(inside);
    const tongue = mesh(new THREE.SphereGeometry(0.03, 12, 10), tongueMat, false);
    tongue.scale.set(1.2, 0.4, 1);
    tongue.position.set(0, -0.01, 0.04);
    lowerPv.add(tongue);

    const legs = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.24 * s, -0.72, 0.2);
      puffG.add(pv);
      pv.add(mesh(tube([V3(0, 0.04, 0), V3(0.01 * s, -0.1, 0.02), V3(0.02 * s, -0.2, 0.04)], 0.05, 0.038, 12, 10), legMat, false));
      [-0.55, 0, 0.55].forEach(a => {
        const toe = mesh(tube([V3(0, 0, 0), V3(Math.sin(a) * 0.07, -0.02, Math.cos(a) * 0.07), V3(Math.sin(a) * 0.11, -0.05, Math.cos(a) * 0.1)], 0.032, 0.014, 8, 6), legMat, false);
        toe.position.set(0.02 * s, -0.2, 0.04);
        pv.add(toe);
      });
      return { pv, s };
    });

    const gust = [];
    for (let k = 0; k < 5; k++) {
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 28), m);
      ring.visible = false;
      puffG.add(ring);
      gust.push({ ring, m, k });
    }

    const food = berry();
    food.visible = false;
    root.add(food);

    const bp = bodyGeo.attributes.position;
    let lastD = -1;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const puff = action && action.name === "puff" ? action : null;
        const atk = action && action.name === "attack" ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const hungry = s.dying ? 1 : smooth(30, 8, hunger);

        let lift = lerp(0.55, -0.02, hungry) + Math.sin(t * 1.3) * 0.08 * motion * (1 - hungry);
        let inflate = 0;
        let flap = 1 - hungry * 0.8;
        let beakOpen = 0;
        let squint = false;
        let blowP = -1;

        if (jump) {
          const p = jump.p;
          lift += Math.sin(Math.min(1, p / 0.85) * Math.PI) * 1.1;
          flap += Math.sin(p * Math.PI) * 1.5;
        }
        if (puff) {
          const p = puff.p;
          const k = smooth(0, 0.25, p) * (1 - smooth(0.6, 1, p));
          inflate = k;
          lift += k * 0.3;
          beakOpen = p > 0.62 && p < 0.88 ? Math.sin(((p - 0.62) / 0.26) * Math.PI) * 0.55 : 0;
          squint = k > 0.6;
          blowP = p;
        }
        let peck = 0;
        if (atk) {
          lift += atk.wind * 0.3 - atk.lunge * 0.15;
          flap += atk.wind * 2.2 + atk.lunge * 0.8;
          beakOpen = atk.wind > 0.3 || (atk.lunge > 0.2 && atk.impact < 0.4) ? 0.5 : 0;
          squint = atk.lunge > 0.4;
          peck = atk.lunge * 0.6 - atk.wind * 0.4;
        }
        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(4.2, 0.9 + faceY - 0.02, ph.fall * ph.fall), lerp(1.2, fr + 0.12, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          beakOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35) ? 0.35 + ph.chew * 0.3 : 0;
          squint = eat.p > 0.3;
        } else food.visible = false;

        root.position.y = lift;
        root.position.z = atk ? atk.lunge * 0.4 - atk.wind * 0.15 : 0;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * 0.5 + peck;
        bod.rotation.z = Math.sin(t * 0.9) * 0.05 * motion * (1 - hungry);
        bod.rotation.x = Math.sin(t * 0.7 + 1) * 0.04 * motion + hungry * 0.12;

        const d = Math.round(hungry * (1 - inflate) * 30) / 30;
        if (d !== lastD) {
          lastD = d;
          for (let i = 0; i < bp.count; i++) {
            const x = baseBody[i * 3];
            const y = baseBody[i * 3 + 1];
            const z = baseBody[i * 3 + 2];
            const a = Math.atan2(x, z);
            const h = (y + 0.84) / 1.82;
            const wr = 1 - d * (0.08 * h + 0.04 * Math.sin(a * 6) * h * h);
            bp.setXYZ(i, x * wr, y - d * 0.2 * h * h * h, z * wr);
          }
          bp.needsUpdate = true;
          bodyGeo.computeVertexNormals();
        }
        const sc = 1 + inflate * 0.16 + Math.sin(t * 1.8) * 0.012 * motion;
        puffG.scale.set(sc * (1 - hungry * 0.05), sc * (1 - hungry * 0.12), sc * (1 - hungry * 0.05));
        puffG.position.y = -hungry * 0.1;

        wings.forEach(({ pv, s: sd }) => {
          const w = Math.sin(t * (6 + flap * 10)) * (0.22 + flap * 0.22);
          pv.rotation.z = sd * (w - hungry * 0.55 + inflate * 0.25);
          pv.rotation.y = sd * 0.15;
          pv.scale.setScalar(1 + inflate * 0.12);
        });
        tail.rotation.x = Math.sin(t * 2.1) * 0.12 * motion + hungry * 0.4;
        tail.rotation.y = Math.sin(t * 1.4) * 0.15 * motion;
        legs.forEach(({ pv, s: sd }, i) => {
          pv.rotation.x = Math.sin(t * 2.2 + i * 1.6) * 0.25 * motion * (1 - hungry) + hungry * -0.6;
          pv.rotation.z = sd * (0.08 + Math.sin(t * 1.7 + i) * 0.06 * motion);
        });
        crest.rotation.x = Math.sin(t * 2.5) * 0.08 * motion - (jump ? 0.25 : 0) + hungry * 0.45 - peck * 0.5;
        crest.rotation.z = Math.sin(t * 1.9) * 0.05 * motion;

        gust.forEach(({ ring, m, k }) => {
          const q = (blowP - 0.64 - k * 0.05) / 0.32;
          const on = blowP >= 0 && q > 0 && q < 1;
          ring.visible = on;
          if (!on) return;
          ring.position.set(Math.sin(k * 2.1) * 0.05, faceY - 0.02, fr + 0.15 + q * 1.3);
          ring.scale.setScalar(0.6 + q * 1.4);
          m.opacity = Math.sin(q * Math.PI) * 0.7;
        });

        lowerPv.rotation.x = beakOpen;
        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.35 : hungry > 0.6 ? Math.min(blink, 0.55) : blink;
        });
        followPupils(eyes, pointer);
      }
    };
  }
});
