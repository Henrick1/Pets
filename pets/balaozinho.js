Pets.register({
  id: "balaozinho",
  dex: 26,
  name: "Balãozinho",
  color: "#ff8a6a",
  types: ["flying"],
  evolvesTo: "zepelume",
  evolveLevel: 16,
  description: "Um filhote do céu que enche o corpo de ar quente para flutuar. As listras das costas lembram os gomos de um balão, e a cordinha da cauda serve para os amigos o puxarem de volta quando ele sobe demais. Com fome, murcha e pousa emburrado.",
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
      for (let i = 0; i < 3500; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const v = rnd();
        g.strokeStyle = v < 0.5 ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.07)";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + (rnd() - 0.5) * 3, y + 3 + rnd() * 4);
        g.stroke();
      }
    };
    const fuzzTex = canvasTex(256, 256, fuzzDraw("#f6f6f6"), 6, 4);
    const fuzzBump = canvasTex(256, 256, fuzzDraw("#808080"), 6, 4);
    const featherTex = canvasTex(64, 256, (g, rnd, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,0.25)";
      g.fillRect(w / 2 - 1.5, 0, 3, h);
      for (let y = 6; y < h; y += 7) {
        g.strokeStyle = "rgba(0,0,0," + (0.08 + rnd() * 0.08) + ")";
        g.beginPath();
        g.moveTo(w / 2, y);
        g.lineTo(0, y - 10);
        g.moveTo(w / 2, y);
        g.lineTo(w, y - 10);
        g.stroke();
      }
    });

    const bodyMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: fuzzTex, bumpMap: fuzzBump, bumpScale: 0.006, roughness: 0.75 });
    const featherMats = [0xff7f62, 0x5ab4ff, 0xffe2a8].map(c => new THREE.MeshStandardMaterial({ color: c, map: featherTex, roughness: 0.7, side: THREE.DoubleSide }));
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xffb340, roughness: 0.35 });
    const beakDark = new THREE.MeshStandardMaterial({ color: 0xd9812a, roughness: 0.4 });
    const legMat = new THREE.MeshStandardMaterial({ color: 0xf2a03a, roughness: 0.5 });
    const stringMat = new THREE.MeshStandardMaterial({ color: 0xfff1d8, roughness: 0.8, map: fuzzTex });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.6 });
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

    const root = new THREE.Group();
    const bod = new THREE.Group();
    bod.position.y = 0.9;
    root.add(bod);
    const puffG = new THREE.Group();
    bod.add(puffG);

    const prof = [V2(0.0, -0.98), V2(0.14, -0.95), V2(0.36, -0.82), V2(0.62, -0.55), V2(0.82, -0.18), V2(0.9, 0.15), V2(0.88, 0.45), V2(0.76, 0.72), V2(0.52, 0.93), V2(0.25, 1.03), V2(0.0, 1.06)];
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
      const coral = new THREE.Color(0xff8a66);
      const blue = new THREE.Color(0x5db6ff);
      const cream = new THREE.Color(0xffe2a6);
      const c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const a = Math.atan2(x, z);
        const back = smooth(0.35, -0.2, Math.cos(a)) * smooth(-0.6, -0.1, y);
        const top = smooth(0.5, 0.85, y);
        const gore = smooth(0.25, 0.55, Math.cos(a * 6 + Math.PI / 6));
        const stripe = Math.max(back, top) * gore;
        c.copy(coral).lerp(blue, stripe);
        const bx = Math.sin(a) / 0.55;
        const by = (y + 0.45) / 0.38;
        const belly = Math.max(0, Math.cos(a)) * smooth(1.05, 0.85, Math.hypot(bx, by));
        c.lerp(cream, Math.min(1, belly));
        const seam = (1 - Math.abs(Math.cos(a * 6 + Math.PI / 6)) ** 0.15) * Math.max(back, top) * 0.25;
        col[i * 3] = c.r * (1 - seam);
        col[i * 3 + 1] = c.g * (1 - seam);
        col[i * 3 + 2] = c.b * (1 - seam);
      }
      bodyGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      bodyGeo.computeVertexNormals();
    }
    const body = mesh(bodyGeo, bodyMat);
    puffG.add(body);

    const knot = mesh(new THREE.TorusGeometry(0.07, 0.04, 10, 20), stringMat, false);
    knot.rotation.x = Math.PI / 2;
    knot.position.y = -0.98;
    puffG.add(knot);
    const knotBall = mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff8a66, roughness: 0.7 }), false);
    knotBall.scale.set(1, 0.7, 1);
    knotBall.position.y = -1.0;
    puffG.add(knotBall);

    const crest = new THREE.Group();
    crest.position.set(0, 1.0, -0.12);
    puffG.add(crest);
    [
      [0, 0.42, 0.13, 0.2, 0, -0.35],
      [-0.12, 0.3, 0.1, 0.16, 1, -0.2],
      [0.12, 0.3, 0.1, 0.16, 1, -0.2],
      [0, 0.24, 0.08, 0.12, 2, 0.15]
    ].forEach(([x, len, wid, curl, m, tilt]) => {
      const f = mesh(featherGeo(len, wid, curl), featherMats[m], false);
      f.position.x = x;
      f.rotation.set(tilt, 0, -x * 2.2);
      crest.add(f);
    });

    const wings = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.84 * s, 0.05, -0.05);
      puffG.add(pv);
      const fan = new THREE.Group();
      fan.rotation.z = -s * 1.2;
      pv.add(fan);
      [[0.66, 0.15, 0], [0.58, 0.14, 1], [0.48, 0.13, 0], [0.38, 0.12, 2], [0.3, 0.1, 1]].forEach(([len, wid, m], k) => {
        const f = mesh(featherGeo(len, wid, 0.06), featherMats[m], false);
        f.rotation.set(0.15, s * 0.4, -s * (0.05 + k * 0.28));
        f.position.z = -k * 0.012;
        fan.add(f);
      });
      const nub = mesh(new THREE.SphereGeometry(0.15, 18, 14), new THREE.MeshStandardMaterial({ color: 0xff8a66, roughness: 0.7, map: fuzzTex }), false);
      nub.scale.set(0.8, 1, 0.7);
      pv.add(nub);
      return { pv, s };
    });

    const faceY = 0.18;
    const fr = rAt(faceY);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 1.05 });
      const x = 0.3 * s;
      e.g.position.set(x, faceY + 0.14, Math.sqrt(fr * fr - x * x) - 0.05);
      e.g.rotation.y = Math.atan2(x, fr) * 0.8;
      puffG.add(e.g);
      return e;
    });
    const brows = [-1, 1].map(s => {
      const on = (x, y) => {
        const rr = rAt(y) + 0.012;
        return V3(x, y, Math.sqrt(Math.max(0, rr * rr - x * x)));
      };
      const b = mesh(tube([on(0.17 * s, 0.5), on(0.3 * s, 0.54), on(0.43 * s, 0.5)], 0.034, 0.02, 12, 8), new THREE.MeshStandardMaterial({ color: 0x8a3a2a, roughness: 0.6 }), false);
      puffG.add(b);
      return b;
    });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.1, 28), cheekMat);
      const x = 0.55 * s;
      const y = faceY - 0.08;
      const r = rAt(y);
      c.scale.set(1, 0.62, 1);
      c.position.set(x, y, Math.sqrt(Math.max(0, r * r - x * x)) + 0.012);
      c.rotation.y = Math.atan2(x, r);
      puffG.add(c);
    });
    const beak = new THREE.Group();
    beak.position.set(0, faceY - 0.06, rAt(faceY - 0.06) - 0.03);
    beak.scale.setScalar(1.55);
    puffG.add(beak);
    const upper = mesh(
      (() => {
        const g = new THREE.SphereGeometry(0.11, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const z = p.getZ(i);
          const y = p.getY(i);
          p.setXYZ(i, p.getX(i) * (1 - Math.max(0, z) * 2.2), y * 0.55, z * 1.5 + Math.max(0, z) * 0.6);
        }
        g.computeVertexNormals();
        return g;
      })(),
      beakMat,
      false
    );
    upper.rotation.x = 0.15;
    beak.add(upper);
    const lowerPv = new THREE.Group();
    lowerPv.position.set(0, -0.005, -0.02);
    beak.add(lowerPv);
    const lower = mesh(
      (() => {
        const g = new THREE.SphereGeometry(0.09, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const z = p.getZ(i);
          p.setXYZ(i, p.getX(i) * (1 - Math.max(0, z) * 2), p.getY(i) * 0.5, z * 1.35 + Math.max(0, z) * 0.3);
        }
        g.computeVertexNormals();
        return g;
      })(),
      beakDark,
      false
    );
    lowerPv.add(lower);
    const inside = mesh(new THREE.SphereGeometry(0.07, 16, 12), mouthIn, false);
    inside.scale.set(1, 0.35, 1);
    inside.position.set(0, -0.015, 0.02);
    lowerPv.add(inside);
    const tongue = mesh(new THREE.SphereGeometry(0.035, 12, 10), tongueMat, false);
    tongue.scale.set(1.2, 0.4, 1);
    tongue.position.set(0, -0.012, 0.05);
    lowerPv.add(tongue);

    const legs = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.24 * s, -0.78, 0.18);
      puffG.add(pv);
      pv.add(mesh(tube([V3(0, 0.05, 0), V3(0.01 * s, -0.12, 0.02), V3(0.02 * s, -0.24, 0.04)], 0.05, 0.038, 12, 10), legMat, false));
      [-0.5, 0, 0.5].forEach(a => {
        const toe = mesh(tube([V3(0, 0, 0), V3(Math.sin(a) * 0.07, -0.02, Math.cos(a) * 0.07), V3(Math.sin(a) * 0.12, -0.05, Math.cos(a) * 0.11)], 0.03, 0.012, 8, 6), legMat, false);
        toe.position.set(0.02 * s, -0.24, 0.04);
        pv.add(toe);
      });
      const thigh = mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe2b0, roughness: 0.8, map: fuzzTex }), false);
      thigh.position.y = 0.04;
      thigh.scale.set(1, 0.8, 1);
      pv.add(thigh);
      return { pv, s };
    });

    const stringPts = [];
    for (let i = 0; i <= 14; i++) stringPts.push(V3(0, -1.0 - i * 0.07, -0.02));
    const stringCurve = new THREE.CatmullRomCurve3(stringPts);
    const stringGeo = new THREE.TubeGeometry(stringCurve, 60, 0.016, 6, false);
    const stringMesh = mesh(stringGeo, stringMat, false);
    puffG.add(stringMesh);
    const pom = new THREE.Group();
    puffG.add(pom);
    for (let k = 0; k < 7; k++) {
      const b = mesh(new THREE.SphereGeometry(0.055, 14, 10), featherMats[k % 2 ? 1 : 0], false);
      const a = k * 2.4;
      b.position.set(Math.cos(a) * 0.04, (k % 3) * 0.03 - 0.03, Math.sin(a) * 0.04);
      pom.add(b);
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
          beakOpen = p > 0.62 && p < 0.85 ? Math.sin(((p - 0.62) / 0.23) * Math.PI) * 0.6 : 0;
          squint = k > 0.6;
        }
        let peck = 0;
        if (atk) {
          lift += atk.wind * 0.3 - atk.lunge * 0.15;
          flap += atk.wind * 2.2 + atk.lunge * 0.8;
          beakOpen = atk.wind > 0.3 || (atk.lunge > 0.2 && atk.impact < 0.4) ? 0.55 : 0;
          squint = atk.lunge > 0.4;
          peck = atk.lunge * 0.6 - atk.wind * 0.4;
        }
        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(4.2, 0.9 + (faceY - 0.06) * 1.0, ph.fall * ph.fall), lerp(1.2, fr + 0.15, ph.fall));
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
            const h = (y + 1) / 2.06;
            const wr = 1 - d * (0.1 * h + 0.05 * Math.sin(a * 6) * h * h);
            bp.setXYZ(i, x * wr, y - d * 0.22 * h * h * h, z * wr);
          }
          bp.needsUpdate = true;
          bodyGeo.computeVertexNormals();
        }
        const sc = 1 + inflate * 0.16 + Math.sin(t * 1.8) * 0.012 * motion;
        puffG.scale.set(sc * (1 - hungry * 0.05), sc * (1 - hungry * 0.14), sc * (1 - hungry * 0.05));
        puffG.position.y = -hungry * 0.1;

        wings.forEach(({ pv, s: sd }) => {
          const w = Math.sin(t * (6 + flap * 10)) * (0.25 + flap * 0.25);
          pv.rotation.z = sd * (w - hungry * 0.5);
          pv.rotation.y = sd * 0.2;
        });
        legs.forEach(({ pv, s: sd }, i) => {
          pv.rotation.x = Math.sin(t * 2.2 + i * 1.6) * 0.25 * motion * (1 - hungry) + hungry * -0.6;
          pv.rotation.z = sd * (0.08 + Math.sin(t * 1.7 + i) * 0.06 * motion);
        });
        crest.rotation.x = Math.sin(t * 2.5) * 0.08 * motion - (jump ? 0.25 : 0) + hungry * 0.35 - peck * 0.5;
        brows.forEach((b, i) => {
          b.position.y = squint ? -0.03 : hungry > 0.6 ? -0.02 : 0;
          b.rotation.z = (i ? 1 : -1) * (hungry > 0.6 ? -0.15 : 0);
        });

        for (let i = 0; i < stringPts.length; i++) {
          const f = i / (stringPts.length - 1);
          const sw = Math.sin(t * 2 - f * 3) * 0.12 * f * motion;
          const groundY = -lift - 0.9 + 0.06;
          let y = -1.0 - i * 0.07;
          let z = -0.02 - f * f * 0.1;
          if (y < groundY) {
            const over = groundY - y;
            y = groundY;
            z -= over;
          }
          stringPts[i].set(sw + Math.sin(f * 9) * 0.04 * f, y, z);
        }
        const ng = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stringPts), 50, 0.016, 6, false);
        stringMesh.geometry.dispose();
        stringMesh.geometry = ng;
        pom.position.copy(stringPts[stringPts.length - 1]);

        lowerPv.rotation.x = beakOpen;
        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.35 : hungry > 0.6 ? Math.min(blink, 0.55) : blink;
        });
        followPupils(eyes, pointer);
      }
    };
  }
});
