Pets.register({
  id: "magmarra",
  dex: 23,
  name: "Magmarra",
  color: "#b8401a",
  types: ["dragon", "fire"],
  description: "A casca do Brasinha endurece e vira uma armadura de basalto. As asinhas caem e no lugar delas cresce um vulcão de verdade nas costas, que fumega quando ele respira e entra em erupção quando ele ruge. Os chifres são blocos de pedra empilhados, e o rabo pesado faz a terra tremer.",
  actions: {
    eat: { duration: 2.6 },
    slam: { duration: 2.2 },
    roar: { duration: 3.0 },
    stomp: { duration: 1.4 }
  },
  idle: [
    { action: "slam", min: 25, max: 55 },
    { action: "roar", min: 40, max: 80 },
    { action: "stomp", min: 15, max: 35 }
  ],
  clickAction: n => ["roar", "slam", "stomp"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, lavaRock } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const T = lavaRock({ seed: 17, cells: 24, crack: 1.7, rock: [70, 58, 54], lava: [255, 104, 20] });
    const A = lavaRock({ seed: 29, cells: 40, crack: 1.3, rock: [84, 74, 70], lava: [150, 70, 40] });
    const B = lavaRock({ seed: 5, stripes: 9, cols: 1, crack: 2.6, rock: [128, 74, 50], lava: [255, 140, 44] });
    const rep = (t, x, y) => {
      const c = t.clone();
      c.needsUpdate = true;
      c.repeat.set(x, y);
      return c;
    };
    const rockMat = (src, rx, ry, extra = {}) =>
      new THREE.MeshStandardMaterial(
        Object.assign(
          {
            color: 0xffffff,
            map: rep(src.map, rx, ry),
            emissive: 0xff4a0a,
            emissiveMap: rep(src.emi, rx, ry),
            emissiveIntensity: 0.8,
            bumpMap: rep(src.bump, rx, ry),
            bumpScale: 0.04,
            roughness: 0.92,
            flatShading: true
          },
          extra
        )
      );
    const bodyRock = rockMat(T, 2.5, 1.6);
    const headRock = rockMat(T, 1.6, 1.1);
    const limbRock = rockMat(T, 1.3, 1);
    const tailRock = rockMat(T, 1.2, 0.7);
    const coneRock = rockMat(A, 3, 1.2, { emissiveIntensity: 0.15 });
    const bellyMat = rockMat(B, 1, 1, { flatShading: false, bumpScale: 0.025, roughness: 0.8 });
    const rockMats = [bodyRock, headRock, limbRock, tailRock, coneRock];
    const basalt = new THREE.MeshStandardMaterial({ color: 0x2c2422, roughness: 0.8, flatShading: true });
    const clawMat = mat(0x1a1210, 0.35);
    const toothMat = mat(0xe6d8c0, 0.45);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6a14 });
    const hotMat = new THREE.MeshBasicMaterial({ color: 0xffc84a });

    const noise = (x, y, z, sd) =>
      Math.sin(x * 5.3 + sd) * Math.sin(y * 4.7 + sd * 1.7) * Math.sin(z * 5.1 + sd * 0.6) +
      0.5 * Math.sin(x * 11.2 + z * 7.3 + sd) * Math.sin(y * 9.1 - x * 3.1) +
      0.25 * Math.sin(x * 23 + y * 19 + z * 17 + sd);
    const rocky = (geo, amp, sd = 1) => {
      const p = geo.attributes.position;
      const v = V3(0, 0, 0);
      for (let i = 0; i < p.count; i++) {
        v.set(p.getX(i), p.getY(i), p.getZ(i));
        const len = v.length() || 1;
        const n = noise(v.x, v.y, v.z, sd);
        v.multiplyScalar(1 + (amp * n) / len);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      return geo;
    };
    const blob = (amp, sd, w = 28, h = 20) => rocky(new THREE.SphereGeometry(1, w, h), amp, sd);
    const shard = (r, h, sd) => {
      const g = new THREE.CylinderGeometry(r * 0.25, r, h, 6, 3);
      g.translate(0, h / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const k = 1 + 0.25 * Math.sin(p.getX(i) * 40 + y * 13 + sd) * Math.sin(p.getZ(i) * 37 + sd);
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    };

    const root = new THREE.Group();
    const body = new THREE.Group();
    body.scale.setScalar(0.86);
    root.add(body);

    const pelvis = mesh(blob(0.06, 2), bodyRock);
    pelvis.scale.set(0.6, 0.45, 0.55);
    pelvis.position.set(0, 1.6, -0.08);
    body.add(pelvis);

    const upper = new THREE.Group();
    upper.position.set(0, 1.62, 0);
    body.add(upper);

    const torso = mesh(blob(0.05, 3, 36, 26), bodyRock);
    torso.scale.set(0.6, 0.84, 0.52);
    torso.position.set(0, 0.55, 0);
    upper.add(torso);
    const belly = mesh(rocky(new THREE.SphereGeometry(1, 32, 26), 0.02, 4), bellyMat);
    belly.scale.set(0.4, 0.68, 0.3);
    belly.position.set(0, 0.42, 0.28);
    upper.add(belly);

    let prof = [];
    const coneK = (a, y) => 1 + 0.09 * Math.sin(a * 5 + y * 6) + 0.05 * Math.sin(a * 11 - y * 13) + (y > 0.78 ? 0.08 * Math.sin(a * 7) : 0);
    const coneR = y => {
      for (let i = 0; i < 6; i++) {
        const [r0, y0] = prof[i];
        const [r1, y1] = prof[i + 1];
        if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0));
      }
      return prof[6][0];
    };
    const volcano = new THREE.Group();
    volcano.position.set(0, 0.98, -0.3);
    volcano.rotation.x = -0.5;
    volcano.scale.set(1.15, 1.35, 1.15);
    upper.add(volcano);
    {
      const pts = [];
      prof = [
        [0.62, -0.05], [0.6, 0.05], [0.5, 0.2], [0.4, 0.38], [0.32, 0.56], [0.27, 0.72], [0.26, 0.8], [0.22, 0.84], [0.17, 0.8], [0.12, 0.72], [0.02, 0.7]
      ];
      prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
      const g = new THREE.LatheGeometry(pts, 26);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const a = Math.atan2(z, x);
        const k = coneK(a, y);
        p.setX(i, x * k);
        p.setZ(i, z * k);
        p.setY(i, y + (y > 0.78 ? 0.04 * Math.sin(a * 6 + 1) : 0));
      }
      g.computeVertexNormals();
      const cone = mesh(g, coneRock);
      volcano.add(cone);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2 + 0.3;
        const chunk = mesh(new THREE.DodecahedronGeometry(0.09 + (k % 3) * 0.03, 0), basalt, false);
        chunk.position.set(Math.cos(a) * 0.5, 0.05 + (k % 2) * 0.08, Math.sin(a) * 0.5);
        chunk.rotation.set(k, k * 2, k * 3);
        volcano.add(chunk);
      }
    }
    const crater = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), lavaMat);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 0.74;
    volcano.add(crater);
    const craterHot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), hotMat);
    craterHot.rotation.x = -Math.PI / 2;
    craterHot.position.y = 0.745;
    volcano.add(craterHot);
    const bubbles = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), hotMat);
      volcano.add(b);
      bubbles.push({ b, a: i * 1.3, r: 0.04 + (i % 3) * 0.035, ph: i * 0.23 });
    }
    const rivulets = [];
    [0.4, 1.5, 2.6, 3.9, 5.1].forEach((a, i) => {
      const pts = [];
      for (let k = 0; k <= 8; k++) {
        const u = k / 8;
        const y = 0.79 - u * 0.75;
        const aa = a + Math.sin(u * 6 + i) * 0.12;
        const r = coneR(y) * coneK(Math.atan2(Math.sin(aa), Math.cos(aa)), y) + 0.006;
        pts.push(V3(Math.cos(aa) * r, y, Math.sin(aa) * r));
      }
      const len = 0.35 + (i % 3) * 0.2;
      const curve = new THREE.CatmullRomCurve3(pts.slice(0, Math.max(3, Math.round(9 * len))));
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.022, 6, false), lavaMat);
      volcano.add(m);
      rivulets.push(m);
    });

    const plates = [];
    [[0.6, -0.5, 0.42], [0.95, -0.42, 0.36], [0.25, -0.55, 0.3]].forEach(([y, z, h], i) => {
      [-1, 1].forEach(s => {
        const sp = mesh(shard(0.08, h, i * 3 + s), basalt, false);
        sp.position.set(0.32 * s, y, z);
        sp.rotation.set(-1.2, 0, -0.5 * s);
        upper.add(sp);
        plates.push(sp);
      });
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.58 * s, 0.92, 0.12);
      const pad = mesh(blob(0.12, 5 + s, 14, 10), basalt);
      pad.scale.set(0.24, 0.2, 0.24);
      pad.position.set(0.04 * s, 0.04, 0);
      const up = mesh(blob(0.06, 6 + s, 20, 14), limbRock);
      up.scale.set(0.16, 0.27, 0.17);
      up.position.set(0.06 * s, -0.2, 0);
      const elbow = new THREE.Group();
      elbow.position.set(0.08 * s, -0.42, 0.02);
      const fore = mesh(blob(0.06, 7 + s, 20, 14), limbRock);
      fore.scale.set(0.14, 0.22, 0.15);
      fore.position.set(0, -0.12, 0.06);
      const hand = mesh(blob(0.08, 8 + s, 16, 12), limbRock);
      hand.scale.set(0.14, 0.11, 0.14);
      hand.position.set(0, -0.3, 0.12);
      elbow.add(fore, hand);
      [-1, 0, 1].forEach(j => {
        const c = mesh(new THREE.ConeGeometry(0.03, 0.12, 6), clawMat, false);
        c.position.set(j * 0.065, -0.36, 0.22);
        c.rotation.x = 1.9;
        elbow.add(c);
      });
      elbow.rotation.x = -0.9;
      pivot.add(pad, up, elbow);
      upper.add(pivot);
      return { pivot, elbow, s };
    });

    const HIP = 1.62;
    const legs = [-1, 1].map(s => {
      const hip = new THREE.Group();
      hip.position.set(0.36 * s, HIP, -0.02);
      const thigh = mesh(blob(0.05, 10 + s, 28, 20), limbRock);
      thigh.scale.set(0.31, 0.5, 0.36);
      thigh.position.set(0.04 * s, -0.28, 0.1);
      thigh.rotation.x = -0.45;
      const knee = new THREE.Group();
      knee.position.set(0.04 * s, -0.6, 0.26);
      const kneeCap = mesh(new THREE.DodecahedronGeometry(0.12, 0), basalt, false);
      kneeCap.position.set(0, 0.02, 0.08);
      const shin = mesh(blob(0.06, 12 + s, 22, 16), limbRock);
      shin.scale.set(0.15, 0.32, 0.17);
      shin.position.set(0, -0.25, -0.14);
      shin.rotation.x = 0.55;
      const ankle = new THREE.Group();
      ankle.position.set(0, -0.5, -0.3);
      const meta = mesh(blob(0.06, 14 + s, 18, 14), limbRock);
      meta.scale.set(0.11, 0.25, 0.13);
      meta.position.set(0, -0.2, 0.05);
      meta.rotation.x = -0.25;
      const foot = new THREE.Group();
      foot.position.set(0, -0.42, 0.1);
      const pad = mesh(blob(0.07, 16 + s, 22, 14), limbRock);
      pad.scale.set(0.2, 0.09, 0.3);
      pad.position.set(0, -0.01, 0.14);
      foot.add(pad);
      [-1, 0, 1].forEach(j => {
        const toe = mesh(blob(0.05, 18 + j, 12, 10), limbRock, false);
        toe.scale.set(0.06, 0.06, 0.12);
        toe.position.set(j * 0.1, -0.02, 0.36 - Math.abs(j) * 0.05);
        toe.rotation.y = -j * 0.25;
        const c = mesh(new THREE.ConeGeometry(0.04, 0.13, 6), clawMat, false);
        c.rotation.x = Math.PI / 2 + 0.3;
        c.position.set(j * 0.12, -0.04, 0.5 - Math.abs(j) * 0.06);
        foot.add(toe, c);
      });
      const spur = mesh(shard(0.05, 0.18, s), basalt, false);
      spur.position.set(0, 0, -0.08);
      spur.rotation.x = -2.4;
      ankle.add(meta, foot, spur);
      knee.add(kneeCap, shin, ankle);
      hip.add(thigh, knee);
      body.add(hip);
      return { hip, knee, ankle, foot, s };
    });

    const neck = mesh(blob(0.05, 20, 24, 18), bodyRock);
    neck.scale.set(0.32, 0.38, 0.34);
    neck.position.set(0, 1.26, 0.3);
    neck.rotation.x = 0.5;
    upper.add(neck);
    for (let i = 0; i < 4; i++) {
      const sp = mesh(shard(0.06 - i * 0.008, 0.2 - i * 0.03, 30 + i), basalt, false);
      sp.position.set(0, 1.35 - i * 0.16, 0.12 - i * 0.12);
      sp.rotation.x = -0.9 - i * 0.12;
      upper.add(sp);
    }

    const head = new THREE.Group();
    head.position.set(0, 1.62, 0.5);
    upper.add(head);
    const skull = mesh(blob(0.05, 40, 32, 24), headRock);
    skull.scale.set(0.38, 0.33, 0.44);
    head.add(skull);
    const snout = mesh(blob(0.05, 41, 28, 20), headRock);
    snout.scale.set(0.27, 0.19, 0.38);
    snout.position.set(0, -0.06, 0.38);
    head.add(snout);
    [-1, 1].forEach(s => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), lavaMat);
      n.scale.set(1, 0.5, 1);
      n.position.set(0.08 * s, 0.04, 0.73);
      head.add(n);
      const ridge = mesh(shard(0.035, 0.1, 50 + s), basalt, false);
      ridge.position.set(0.09 * s, 0.1, 0.62);
      ridge.rotation.set(-0.5, 0, 0.3 * s);
      head.add(ridge);
    });
    [[-1, 0], [1, 0], [-1, 1], [1, 1], [-1, 2], [1, 2]].forEach(([s, k]) => {
      const t = mesh(new THREE.ConeGeometry(0.02, 0.065, 5), toothMat, false);
      t.rotation.x = Math.PI;
      t.position.set((0.09 + k * 0.035) * s, -0.2, 0.62 - k * 0.12);
      head.add(t);
    });
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.14, 0.04);
    head.add(jaw);
    const jawM = mesh(blob(0.05, 43, 24, 16), headRock);
    jawM.scale.set(0.24, 0.1, 0.36);
    jawM.position.set(0, -0.06, 0.32);
    jaw.add(jawM);
    [-1, 1].forEach(s => {
      const t = mesh(new THREE.ConeGeometry(0.02, 0.06, 5), toothMat, false);
      t.position.set(0.12 * s, 0.03, 0.5);
      jaw.add(t);
    });
    const throat = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), lavaMat);
    throat.scale.set(1.1, 0.5, 1.7);
    throat.position.set(0, -0.15, 0.3);
    head.add(throat);

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.52, whiteColor: 0xffc23a, pupilColor: 0x1a0604 });
      e.g.position.set(0.22 * s, 0.08, 0.3);
      e.g.rotation.y = 0.5 * s;
      e.pupil.scale.x = 0.4;
      head.add(e.g);
      return e;
    });
    const brows = [-1, 1].map(s => {
      const b = mesh(new THREE.DodecahedronGeometry(0.12, 0), basalt);
      b.scale.set(1.25, 0.45, 0.8);
      b.position.set(0.21 * s, 0.2, 0.33);
      b.rotation.z = 0.45 * s;
      head.add(b);
      return b;
    });

    const hornSet = [];
    [-1, 1].forEach(s => {
      const g = new THREE.Group();
      g.position.set(0.2 * s, 0.22, -0.06);
      g.rotation.set(-0.55, 0.25 * s, -0.42 * s);
      g.scale.setScalar(1.45);
      let y = 0;
      [0.13, 0.105, 0.08, 0.055].forEach((r, i) => {
        const chunk = mesh(rocky(new THREE.CylinderGeometry(r * 0.85, r, r * 1.9, 6, 2), 0.012, 60 + i + s * 7), i === 3 ? basalt : headRock);
        chunk.position.y = y + r * 0.95;
        chunk.rotation.y = i * 0.7;
        chunk.rotation.z = i * 0.08 * s;
        g.add(chunk);
        if (i < 3) {
          const seam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.014, 6), lavaMat);
          seam.position.y = y + r * 1.9;
          seam.rotation.y = i * 0.7;
          g.add(seam);
        }
        y += r * 1.8;
      });
      const tip = mesh(new THREE.ConeGeometry(0.05, 0.14, 5), basalt, false);
      tip.position.y = y + 0.06;
      g.add(tip);
      head.add(g);
      hornSet.push(g);
      const side = new THREE.Group();
      side.position.set(0.3 * s, 0.02, -0.12);
      side.rotation.set(-1.2, 0, -1.1 * s);
      let y2 = 0;
      [0.07, 0.05].forEach((r, i) => {
        const c = mesh(rocky(new THREE.CylinderGeometry(r * 0.8, r, r * 1.8, 6, 1), 0.01, 70 + i + s), headRock, false);
        c.position.y = y2 + r * 0.9;
        side.add(c);
        y2 += r * 1.7;
      });
      head.add(side);
    });
    for (let i = 0; i < 3; i++) {
      const sp = mesh(shard(0.05 - i * 0.008, 0.16 - i * 0.02, 80 + i), basalt, false);
      sp.position.set(0, 0.28 - i * 0.05, -0.14 - i * 0.13);
      sp.rotation.x = -0.7 - i * 0.25;
      head.add(sp);
    }

    const tail = [];
    {
      const base = new THREE.Group();
      base.position.set(0, 1.5, -0.44);
      base.rotation.x = -2.35;
      body.add(base);
      let parent = base;
      const n = 12;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const g = new THREE.Group();
        g.position.y = i === 0 ? 0 : 0.16;
        const r = 0.34 * (1 - 0.78 * u);
        const seg = mesh(blob(0.07, 90 + i, 18, 12), tailRock);
        seg.scale.set(r, 0.14, r);
        seg.position.y = 0.06;
        g.add(seg);
        if (i < n - 1) {
          const sp = mesh(shard(0.05 * (1 - u * 0.5) + 0.02, 0.12 + (1 - u) * 0.08, 100 + i), basalt, false);
          sp.position.set(0, 0.06, -r * 0.85);
          sp.rotation.x = -Math.PI / 2 - 0.4;
          g.add(sp);
        }
        parent.add(g);
        tail.push(g);
        parent = g;
      }
      const tipG = new THREE.Group();
      tipG.position.y = 0.12;
      [[0, 0.16, 0], [0.5, 0.12, 1.2], [-0.5, 0.12, -1.2], [0.4, 0.1, 2.6], [-0.4, 0.1, -2.6]].forEach(([rz, h, ry], k) => {
        const sp = mesh(shard(0.05, h + 0.08, 120 + k), basalt, false);
        sp.rotation.set(0, ry, rz);
        tipG.add(sp);
      });
      parent.add(tipG);
      tail.tip = tipG;
    }

    const fx = new THREE.Group();
    root.add(fx);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x4a403c, transparent: true, opacity: 0.4, depthWrite: false });
    const smoke = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), smokeMat.clone());
      fx.add(m);
      smoke.push({ m, ph: (i * 0.29) % 1, a: i * 2.3 });
    }
    const bombs = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), i % 3 ? lavaMat : hotMat);
      m.visible = false;
      fx.add(m);
      bombs.push({ m, a: (i / 12) * Math.PI * 2, v: 0.6 + (i % 4) * 0.25, up: 2.6 + (i % 3) * 0.7, d: (i % 4) * 0.08, size: 0.04 + (i % 3) * 0.02 });
    }
    const sparkMats = [0xffe07a, 0xffa030, 0xff5a14].map(c => new THREE.MeshBasicMaterial({ color: c }));
    const sparks = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), sparkMats[i % 3]);
      m.visible = false;
      fx.add(m);
      sparks.push({ m, a: (i / 26) * Math.PI * 2 + (i % 3) * 0.3, v: 1.6 + (i % 5) * 0.45, up: 2.4 + (i % 4) * 0.7, size: 0.035 + (i % 3) * 0.015 });
    }
    const shock = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: 0xff7a1e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    shock.rotation.x = -Math.PI / 2;
    shock.position.y = 0.03;
    fx.add(shock);
    const breath = [];
    [0xffe07a, 0xffa030, 0xff5a14].forEach(() => null);
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshBasicMaterial({ color: [0xffe07a, 0xffa030, 0xff5a14][i % 3], transparent: true, opacity: 0.9, depthWrite: false })
      );
      m.visible = false;
      fx.add(m);
      breath.push({ m, ph: i / 22, a: i * 2.39, r: (i % 5) * 0.05 });
    }

    const glow = new THREE.PointLight(0xff6a1a, 0.6, 6);
    glow.position.set(0, 1.4, 1.1);
    body.add(glow);
    const ventGlow = new THREE.PointLight(0xff7a2a, 0.6, 3);
    ventGlow.position.set(0, 1.1, 0);
    volcano.add(ventGlow);

    const food = berry();
    food.visible = false;
    root.add(food);

    const tmp = V3(0, 0, 0);
    const mouthW = V3(0, 0, 0);
    const tipW = V3(0, 0, 0);
    const hitPos = V3(0, 0, 0);
    const craterW = V3(0, 0, 0);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;
        const heat = s.dying ? 0.25 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        const breathe = Math.sin(t * 1.4) * motion;
        let lean = 0.35 + breathe * 0.015;
        let headPitch = -0.3;
        let jawOpen = 0.04;
        let tailLift = 0;
        let impact = -1;
        let shake = 0;
        let roarK = -1;
        let erupt = 0;
        let stompSide = 0;
        let crouch = 0;
        let squint = false;
        let armsUp = 0;

        if (a === "slam") {
          const up = smooth(0.05, 0.4, p);
          const down = smooth(0.4, 0.5, p);
          tailLift = up * (1 - down) * 1.5 - down * (1 - smooth(0.6, 1, p)) * 0.12;
          lean = 0.35 - up * (1 - down) * 0.12 + down * (1 - smooth(0.55, 0.9, p)) * 0.12;
          crouch = down * (1 - smooth(0.55, 0.9, p)) * 0.08;
          impact = p >= 0.5 ? (p - 0.5) / 0.5 : -1;
          shake = impact >= 0 ? Math.max(0, 1 - impact * 3) : 0;
          jawOpen = 0.04 + up * (1 - down) * 0.18;
          squint = p > 0.45 && p < 0.7;
        }
        if (a === "roar") {
          const k = smooth(0.1, 0.3, p) * (1 - smooth(0.85, 1, p));
          const pre = smooth(0, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          headPitch = -0.3 + pre * 0.3 - k * 0.35;
          lean = 0.35 + pre * 0.08 - k * 0.22;
          jawOpen = 0.04 + k * 0.55;
          armsUp = k;
          roarK = p > 0.3 && p < 0.9 ? (p - 0.3) / 0.6 : -1;
          erupt = p > 0.25 ? smooth(0.25, 0.35, p) * (1 - smooth(0.8, 1, p)) : 0;
          shake = k * 0.3;
          crouch = pre * 0.05;
        }
        if (a === "stomp") {
          stompSide = p < 0.5 ? 1 : -1;
          const q = (p % 0.5) / 0.5;
          crouch = Math.sin(q * Math.PI) * 0.03;
          impact = q > 0.6 ? (q - 0.6) / 0.4 : -1;
          shake = impact >= 0 ? Math.max(0, 1 - impact * 4) * 0.6 : 0;
        }
        if (a === "eat") {
          headPitch = -0.3 + (1 - ph.fall) * -0.25 + ph.chew * 0.08;
          jawOpen = p > 0.12 && p < 0.85 ? (p < 0.3 ? 0.35 : 0.06 + ph.chew * 0.3) : 0.04;
          squint = p > 0.3;
        }

        const sh = reduceMotion ? 0 : shake;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.position.set(Math.sin(t * 61) * 0.025 * sh, -crouch + Math.abs(Math.sin(t * 47)) * 0.015 * sh, 0);
        upper.rotation.x = lean;
        upper.rotation.z = Math.sin(t * 0.9) * 0.02 * motion;
        head.rotation.x = headPitch + Math.sin(t * 1.4 + 1) * 0.02 * motion;
        head.rotation.y = pointer.x * 0.2;
        jaw.rotation.x = jawOpen;
        throat.visible = jawOpen > 0.12;

        legs.forEach(({ hip, knee, ankle, foot, s: sd }) => {
          let lift = 0;
          if (a === "stomp" && sd === stompSide) {
            const q = (p % 0.5) / 0.5;
            lift = Math.sin(Math.min(1, q / 0.6) * Math.PI) * 0.6;
          }
          hip.rotation.x = -lift * 0.8 - crouch * 2.2;
          knee.rotation.x = lift * 0.6 + crouch * 3;
          ankle.rotation.x = -crouch * 1.2 + lift * 0.3;
          foot.rotation.x = -lift * 0.3;
          hip.position.y = HIP - crouch;
        });

        arms.forEach(({ pivot, elbow, s: sd }) => {
          const swing = Math.sin(t * 1.4 + sd) * 0.05 * motion;
          pivot.rotation.x = -0.35 + swing - armsUp * 0.6;
          pivot.rotation.z = (0.2 + armsUp * 0.55) * sd;
          elbow.rotation.x = -0.9 - armsUp * 0.3;
        });

        tail.forEach((g, i) => {
          if (i === 0) {
            g.parent.rotation.x = -2.35 + tailLift * 0.55;
            return;
          }
          const u = i / tail.length;
          g.rotation.x = 0.06 + tailLift * 0.12 * (1 - u);
          g.rotation.z = Math.sin(t * 1.3 - i * 0.45) * 0.07 * u * motion * (tailLift > 0.2 ? 0.2 : 1);
        });

        const surge = (impact >= 0 && a === "slam" ? Math.max(0, 1 - impact * 2) * 1.2 : 0) + erupt * 1.4;
        const lavaK = (0.42 + Math.sin(t * 1.4) * 0.1 * motion + surge * 0.6) * heat;
        rockMats.forEach(m => (m.emissiveIntensity = lavaK));
        coneRock.emissiveIntensity = 0.12 + erupt * 0.8;
        bellyMat.emissiveIntensity = lavaK * 1.4;
        const flow = 0.75 + Math.sin(t * 2.2) * 0.15 * motion + erupt * 0.4;
        lavaMat.color.setRGB(1, 0.32 + flow * 0.12, 0.06);
        hotMat.color.setRGB(1, 0.72 + erupt * 0.2, 0.25 + erupt * 0.3);
        crater.scale.setScalar(1 + Math.sin(t * 2.5) * 0.05 * motion + erupt * 0.15);
        bubbles.forEach(({ b, a: ba, r, ph: bp }) => {
          const q = (((t * (0.7 + erupt * 2) + bp) % 1) + 1) % 1;
          b.position.set(Math.cos(ba + t * 0.3) * r, 0.74 + Math.sin(q * Math.PI) * (0.05 + erupt * 0.15), Math.sin(ba + t * 0.3) * r);
          b.scale.setScalar(reduceMotion ? 0.5 : 0.4 + Math.sin(q * Math.PI) * 0.8);
        });
        glow.intensity = (0.4 + lavaK * 0.4 + surge * 1.0) * heat;
        ventGlow.intensity = (0.5 + Math.sin(t * 3) * 0.1 * motion + erupt * 2.5) * heat;

        root.updateMatrixWorld(true);

        volcano.localToWorld(craterW.set(0, 0.8, 0));
        fx.worldToLocal(craterW);
        smoke.forEach(sm => {
          const sp = 0.2 + erupt * 0.5;
          const u = (((t * sp + sm.ph) % 1) + 1) % 1;
          sm.m.visible = !reduceMotion;
          sm.m.position.set(craterW.x + Math.sin(sm.a + t * 0.5) * u * 0.25, craterW.y + u * (1.2 + erupt * 0.8), craterW.z - u * 0.3 + Math.cos(sm.a) * u * 0.1);
          sm.m.scale.setScalar(0.06 + u * (0.22 + erupt * 0.2));
          sm.m.material.opacity = Math.sin(u * Math.PI) * (0.4 + erupt * 0.2) * heat;
          sm.m.material.color.setHex(erupt > 0.3 && u < 0.25 ? 0xff7a2a : 0x4a403c);
        });
        bombs.forEach(bm => {
          const q = erupt > 0 && a === "roar" ? (p - 0.3 - bm.d) / 0.45 : -1;
          bm.m.visible = q > 0 && q < 1 && !reduceMotion;
          if (!bm.m.visible) return;
          const tt = q * 1.1;
          bm.m.position.set(
            craterW.x + Math.cos(bm.a) * bm.v * tt,
            Math.max(0.04, craterW.y + bm.up * tt - 4.2 * tt * tt),
            craterW.z + Math.sin(bm.a) * bm.v * tt - tt * 0.3
          );
          bm.m.rotation.set(t * 5 + bm.a, t * 4, 0);
          bm.m.scale.setScalar(bm.size * (1 - q * 0.4));
        });

        tail.tip.getWorldPosition(tipW);
        fx.worldToLocal(tipW);
        if (a === "slam") hitPos.set(tipW.x, 0.05, tipW.z);
        else if (a === "stomp") legs.forEach(({ hip, s: sd }) => sd === stompSide && hitPos.set(hip.position.x * 0.86, 0.05, 0.3));
        const showSparks = impact >= 0 && !reduceMotion;
        sparks.forEach((spk, i) => {
          const q = a === "slam" ? impact * 1.1 : impact * 0.8;
          spk.m.visible = showSparks && q < 1 && (a === "slam" || i % 2 === 0);
          if (!spk.m.visible) return;
          const tt = q * 0.9;
          const v = spk.v * (a === "slam" ? 1 : 0.5);
          spk.m.position.set(hitPos.x + Math.cos(spk.a) * v * tt, Math.max(0.02, hitPos.y + spk.up * tt - 4.5 * tt * tt * (a === "slam" ? 1 : 1.6)), hitPos.z + Math.sin(spk.a) * v * tt);
          spk.m.rotation.set(t * 8 + i, t * 6, 0);
          spk.m.scale.setScalar(spk.size * (1 - q * 0.7));
        });
        if (impact >= 0 && !reduceMotion) {
          const q = Math.min(1, impact * (a === "slam" ? 1.6 : 2.5));
          shock.position.set(hitPos.x, 0.03, hitPos.z);
          shock.scale.setScalar(0.3 + q * (a === "slam" ? 3 : 1.4));
          shock.material.opacity = (1 - q) * 0.6;
        } else shock.material.opacity = 0;

        head.localToWorld(mouthW.set(0, -0.14, 0.62));
        fx.worldToLocal(mouthW);
        head.localToWorld(tmp.set(0, -0.25, 1.6));
        fx.worldToLocal(tmp);
        const dir = tmp.sub(mouthW).normalize();
        breath.forEach(b => {
          if (roarK < 0 || reduceMotion) {
            b.m.visible = false;
            return;
          }
          const q = (((roarK * 3 + b.ph) % 1) + 1) % 1;
          b.m.visible = roarK < 0.9 || q < (1 - roarK) * 10;
          const d = q * 1.6;
          b.m.position.set(
            mouthW.x + dir.x * d + Math.cos(b.a) * b.r * q * 2,
            mouthW.y + dir.y * d + Math.sin(b.a) * b.r * q * 1.5 + q * q * 0.3,
            mouthW.z + dir.z * d
          );
          b.m.scale.setScalar(0.06 + q * 0.2);
          b.m.material.opacity = 0.9 * (1 - q * 0.8);
        });

        if (a === "eat") {
          food.visible = ph.visible;
          head.localToWorld(tmp.set(0, -0.1, 0.75));
          root.worldToLocal(tmp);
          food.position.set(tmp.x, lerp(4.2, tmp.y, ph.fall * ph.fall), tmp.z);
          food.scale.setScalar(1 - 0.85 * ph.bite);
        } else food.visible = false;

        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.45 : blink;
        });
        followPupils(eyes, pointer, 0.6);
        brows.forEach((b, i) => (b.rotation.z = (i ? 0.45 : -0.45) + (a === "roar" ? 0.15 * (i ? 1 : -1) * Math.max(0, roarK) : 0)));
        hornSet.forEach((g, i) => (g.rotation.y = (i ? 0.25 : -0.25) + Math.sin(t * 0.7) * 0.01 * motion));
      }
    };
  }
});
