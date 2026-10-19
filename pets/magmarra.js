Pets.register({
  id: "magmarra",
  dex: 23,
  name: "Magmarra",
  color: "#b8401a",
  types: ["dragon", "fire"],
  description: "A casca do Brasinha endurece e vira uma armadura de basalto. Nas costas carrega pequenos vulcões que soltam fumaça quando ele respira. Quando bate o rabo de pedra no chão, a terra treme e sobem faíscas de lava.",
  actions: {
    eat: { duration: 2.6 },
    slam: { duration: 2.2 },
    roar: { duration: 2.8 },
    stomp: { duration: 1.4 }
  },
  idle: [
    { action: "slam", min: 25, max: 55 },
    { action: "roar", min: 40, max: 80 },
    { action: "stomp", min: 15, max: 35 }
  ],
  clickAction: n => ["slam", "roar", "stomp"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, lavaRock } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const T = lavaRock({ seed: 11, cells: 30, crack: 2.8, rock: [52, 42, 40], lava: [255, 110, 24] });
    const B = lavaRock({ seed: 5, stripes: 7, crack: 3.6, rock: [150, 82, 52], lava: [255, 150, 50] });
    const rep = (t, x, y) => {
      const c = t.clone();
      c.needsUpdate = true;
      c.repeat.set(x, y);
      return c;
    };
    const lavaMatR = (src, rx, ry, extra = {}) =>
      new THREE.MeshStandardMaterial(
        Object.assign(
          {
            color: 0xffffff,
            map: rep(src.map, rx, ry),
            emissive: 0xff4a0a,
            emissiveMap: rep(src.emi, rx, ry),
            emissiveIntensity: 1,
            bumpMap: rep(src.bump, rx, ry),
            bumpScale: 0.05,
            roughness: 0.88
          },
          extra
        )
      );
    const bodyRock = lavaMatR(T, 3, 1.6);
    const headRock = lavaMatR(T, 2, 1.2);
    const limbRock = lavaMatR(T, 1.4, 1);
    const tailRock = lavaMatR(T, 1.2, 0.8);
    const bellyMat = lavaMatR(B, 1, 1, { bumpScale: 0.03, roughness: 0.75 });
    const rockMats = [bodyRock, headRock, limbRock, tailRock];
    const basalt = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.75, flatShading: true });
    const clawMat = mat(0x1a1210, 0.35);
    const toothMat = mat(0xe8dcc8, 0.4);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6a14 });
    const hotMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x4a1a10,
      emissive: 0xb0300a,
      emissiveIntensity: 0.5,
      roughness: 0.7,
      side: THREE.DoubleSide
    });
    const veinMat = new THREE.MeshBasicMaterial({ color: 0xff7a1e });

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const upper = new THREE.Group();
    upper.position.y = 1.15;
    body.add(upper);

    const hips = mesh(new THREE.SphereGeometry(1, 40, 30), bodyRock);
    hips.scale.set(0.62, 0.48, 0.55);
    hips.position.set(0, 1.12, -0.05);
    body.add(hips);

    const torso = mesh(new THREE.SphereGeometry(1, 56, 40), bodyRock);
    torso.scale.set(0.72, 0.82, 0.6);
    torso.position.set(0, 0.45, 0.02);
    upper.add(torso);
    const belly = mesh(new THREE.SphereGeometry(1, 40, 32), bellyMat);
    belly.scale.set(0.52, 0.78, 0.36);
    belly.position.set(0, 0.32, 0.3);
    upper.add(belly);

    const shoulders = [-1, 1].map(s => {
      const pad = mesh(new THREE.DodecahedronGeometry(0.26, 0), basalt);
      pad.position.set(0.62 * s, 0.82, 0.02);
      pad.scale.set(1, 0.8, 1);
      pad.rotation.set(0.3, 0.4 * s, 0.4 * s);
      upper.add(pad);
      return pad;
    });

    const vents = [];
    [[0, 0.92, -0.4, 1.25], [-0.3, 0.66, -0.47, 1.0], [0.3, 0.66, -0.47, 1.0], [0, 0.32, -0.56, 1.1]].forEach(([x, y, z, k], i) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.x = -0.75;
      g.rotation.z = -x * 0.8;
      const cone = mesh(new THREE.CylinderGeometry(0.09 * k, 0.2 * k, 0.26 * k, 9, 1, true), basalt);
      cone.position.y = 0.13 * k;
      const lip = mesh(new THREE.TorusGeometry(0.09 * k, 0.025 * k, 6, 12), basalt, false);
      lip.rotation.x = Math.PI / 2;
      lip.position.y = 0.26 * k;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.085 * k, 14), lavaMat);
      pool.rotation.x = -Math.PI / 2;
      pool.position.y = 0.22 * k;
      g.add(cone, lip, pool);
      upper.add(g);
      vents.push({ g, pool, k, ph: i * 1.7 });
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.66 * s, 0.62, 0.12);
      const up = mesh(new THREE.SphereGeometry(1, 24, 18), limbRock);
      up.scale.set(0.17, 0.27, 0.18);
      up.position.set(0.05 * s, -0.2, 0);
      const elbow = new THREE.Group();
      elbow.position.set(0.08 * s, -0.42, 0.02);
      const fore = mesh(new THREE.SphereGeometry(1, 24, 18), limbRock);
      fore.scale.set(0.15, 0.22, 0.16);
      fore.position.set(0, -0.12, 0.08);
      const hand = mesh(new THREE.SphereGeometry(1, 20, 14), limbRock);
      hand.scale.set(0.14, 0.11, 0.14);
      hand.position.set(0, -0.3, 0.14);
      elbow.add(fore, hand);
      [-1, 0, 1].forEach(j => {
        const c = mesh(new THREE.ConeGeometry(0.032, 0.12, 8), clawMat, false);
        c.position.set(j * 0.065, -0.37, 0.24);
        c.rotation.x = 1.9;
        elbow.add(c);
      });
      elbow.rotation.x = -0.7;
      pivot.add(up, elbow);
      upper.add(pivot);
      return { pivot, elbow, s };
    });

    const legs = [-1, 1].map(s => {
      const hip = new THREE.Group();
      hip.position.set(0.42 * s, 1.0, 0);
      const thigh = mesh(new THREE.SphereGeometry(1, 32, 24), limbRock);
      thigh.scale.set(0.3, 0.42, 0.36);
      thigh.position.set(0.06 * s, -0.22, 0.04);
      const knee = new THREE.Group();
      knee.position.set(0.06 * s, -0.55, 0.08);
      const shin = mesh(new THREE.SphereGeometry(1, 24, 18), limbRock);
      shin.scale.set(0.2, 0.3, 0.22);
      shin.position.set(0, -0.15, -0.04);
      const foot = mesh(new THREE.SphereGeometry(1, 28, 18), limbRock);
      foot.scale.set(0.26, 0.13, 0.36);
      foot.position.set(0, -0.36, 0.08);
      knee.add(shin, foot);
      [-1, 0, 1].forEach(j => {
        const c = mesh(new THREE.ConeGeometry(0.045, 0.14, 8), clawMat, false);
        c.rotation.x = Math.PI / 2;
        c.position.set(j * 0.12, -0.4, 0.44 - Math.abs(j) * 0.05);
        knee.add(c);
      });
      hip.add(thigh, knee);
      body.add(hip);
      return { hip, knee, s };
    });

    const wingShape = () => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(0.95, 0.55);
      sh.quadraticCurveTo(0.82, 0.2, 1.0, -0.05);
      sh.quadraticCurveTo(0.72, -0.08, 0.7, -0.35);
      sh.quadraticCurveTo(0.48, -0.25, 0.4, -0.55);
      sh.quadraticCurveTo(0.22, -0.2, 0, -0.1);
      sh.lineTo(0, 0);
      return new THREE.ShapeGeometry(sh, 16);
    };
    const bone = (x0, y0, x1, y1, r) => {
      const len = Math.hypot(x1 - x0, y1 - y0);
      const m = mesh(new THREE.CylinderGeometry(r * 0.6, r, len, 8), basalt, false);
      m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0.01);
      m.rotation.z = Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2;
      return m;
    };
    const wings = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.36 * s, 0.86, -0.36);
      const inner = new THREE.Group();
      inner.add(mesh(wingShape(), membraneMat, false));
      inner.add(bone(0, 0, 0.95, 0.55, 0.05), bone(0.95, 0.55, 1.0, -0.05, 0.03), bone(0.95, 0.55, 0.7, -0.35, 0.03), bone(0.95, 0.55, 0.4, -0.55, 0.03));
      [[0.3, 0.1, 0.75, 0.05], [0.25, -0.05, 0.55, -0.25], [0.5, 0.25, 0.85, 0.3]].forEach(([a, b, c, d]) => {
        const v = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, Math.hypot(c - a, d - b), 4), veinMat);
        v.position.set((a + c) / 2, (b + d) / 2, 0.012);
        v.rotation.z = Math.atan2(d - b, c - a) - Math.PI / 2;
        inner.add(v);
      });
      const claw = mesh(new THREE.ConeGeometry(0.04, 0.12, 6), clawMat, false);
      claw.position.set(0.97, 0.62, 0);
      claw.rotation.z = -0.6;
      inner.add(claw);
      inner.scale.set(s * 0.95, 0.95, 0.95);
      pivot.add(inner);
      upper.add(pivot);
      return { pivot, s };
    });

    const neck = mesh(new THREE.SphereGeometry(1, 32, 24), bodyRock);
    neck.scale.set(0.34, 0.36, 0.36);
    neck.position.set(0, 1.12, 0.2);
    upper.add(neck);

    const head = new THREE.Group();
    head.position.set(0, 1.42, 0.36);
    head.scale.setScalar(1.18);
    upper.add(head);
    const skull = mesh(new THREE.SphereGeometry(1, 48, 36), headRock);
    skull.scale.set(0.42, 0.36, 0.46);
    head.add(skull);
    const muzzle = mesh(new THREE.SphereGeometry(1, 40, 28), headRock);
    muzzle.scale.set(0.3, 0.2, 0.4);
    muzzle.position.set(0, -0.06, 0.36);
    head.add(muzzle);
    [-1, 1].forEach(s => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), lavaMat);
      n.scale.set(1, 0.5, 1);
      n.position.set(0.09 * s, 0.03, 0.72);
      n.rotation.y = 0.3 * s;
      head.add(n);
    });
    [[-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(([s, k]) => {
      const t = mesh(new THREE.ConeGeometry(0.022, 0.07, 6), toothMat, false);
      t.rotation.x = Math.PI;
      t.position.set((0.1 + k * 0.07) * s, -0.25, 0.56 - k * 0.14);
      head.add(t);
    });

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.14, 0.05);
    head.add(jaw);
    const jawM = mesh(new THREE.SphereGeometry(1, 32, 22), headRock);
    jawM.scale.set(0.27, 0.11, 0.38);
    jawM.position.set(0, -0.06, 0.32);
    jaw.add(jawM);
    [-1, 1].forEach(s => {
      const t = mesh(new THREE.ConeGeometry(0.02, 0.06, 6), toothMat, false);
      t.position.set(0.13 * s, 0.03, 0.52);
      jaw.add(t);
    });
    const throat = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), lavaMat);
    throat.scale.set(1.2, 0.5, 1.8);
    throat.position.set(0, -0.14, 0.32);
    head.add(throat);

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.62, whiteColor: 0xffd25a, pupilColor: 0x1a0604 });
      e.g.position.set(0.24 * s, 0.1, 0.33);
      e.g.rotation.y = 0.45 * s;
      e.pupil.scale.x = 0.45;
      head.add(e.g);
      return e;
    });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xffa020, transparent: true, opacity: 0.35, depthWrite: false });
    eyes.forEach(({ g }) => {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), eyeGlow);
      h.scale.set(1, 0.9, 0.4);
      g.add(h);
    });
    const brows = [-1, 1].map(s => {
      const b = mesh(new THREE.DodecahedronGeometry(0.12, 0), basalt);
      b.scale.set(1.3, 0.5, 0.8);
      b.position.set(0.24 * s, 0.25, 0.36);
      b.rotation.z = -0.45 * s;
      head.add(b);
      return b;
    });

    const hornPath = (s, big) => {
      const pts = big
        ? [V3(0.24 * s, 0.22, -0.05), V3(0.36 * s, 0.4, -0.22), V3(0.42 * s, 0.5, -0.48), V3(0.4 * s, 0.46, -0.72)]
        : [V3(0.33 * s, 0.05, -0.15), V3(0.46 * s, 0.1, -0.3), V3(0.52 * s, 0.08, -0.45)];
      return new THREE.CatmullRomCurve3(pts);
    };
    const hornGeo = (curve, r0) => {
      const seg = 24;
      const rad = 10;
      const frames = curve.computeFrenetFrames(seg, false);
      const pos = [];
      const idx = [];
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        const p = curve.getPointAt(u);
        const r = r0 * (1 - u * 0.92);
        for (let j = 0; j <= rad; j++) {
          const a = (j / rad) * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
          pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
        }
      }
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    [-1, 1].forEach(s => {
      head.add(mesh(hornGeo(hornPath(s, true), 0.08), basalt));
      head.add(mesh(hornGeo(hornPath(s, false), 0.05), basalt, false));
    });
    for (let i = 0; i < 4; i++) {
      const sp = mesh(new THREE.ConeGeometry(0.05 - i * 0.006, 0.16 - i * 0.02, 5), basalt, false);
      sp.position.set(0, 0.34 - i * 0.06, -0.08 - i * 0.14);
      sp.rotation.x = -0.6 - i * 0.2;
      head.add(sp);
    }

    const tail = [];
    {
      const base = new THREE.Group();
      base.position.set(0, 1.0, -0.48);
      base.rotation.x = -2.25;
      body.add(base);
      let parent = base;
      const n = 11;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const g = new THREE.Group();
        g.position.y = i === 0 ? 0 : 0.17;
        const r = 0.32 * (1 - 0.62 * u);
        const seg = mesh(new THREE.SphereGeometry(1, 22, 16), tailRock);
        seg.scale.set(r, 0.15, r);
        seg.position.y = 0.07;
        g.add(seg);
        if (i % 2 === 0 && i < n - 2) {
          const sp = mesh(new THREE.ConeGeometry(0.05 * (1 - u * 0.4), 0.15, 5), basalt, false);
          sp.position.set(0, 0.07, -r * 0.9);
          sp.rotation.x = -Math.PI / 2 - 0.3;
          g.add(sp);
        }
        parent.add(g);
        tail.push(g);
        parent = g;
      }
      const club = new THREE.Group();
      club.position.y = 0.2;
      const rock = mesh(new THREE.DodecahedronGeometry(0.26, 1), tailRock);
      rock.scale.set(1.1, 0.9, 1.2);
      club.add(rock);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        const sp = mesh(new THREE.ConeGeometry(0.06, 0.18, 5), basalt, false);
        sp.position.set(Math.cos(a) * 0.24, 0.02, Math.sin(a) * 0.26);
        sp.rotation.set(Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4);
        club.add(sp);
      }
      parent.add(club);
      tail.club = club;
    }

    const fx = new THREE.Group();
    root.add(fx);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x4a403c, transparent: true, opacity: 0.4, depthWrite: false });
    const smoke = [];
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), smokeMat.clone());
      fx.add(m);
      smoke.push({ m, v: i % vents.length, ph: (i * 0.29) % 1, a: i * 2.3 });
    }
    const sparkMats = [0xffe07a, 0xffa030, 0xff5a14].map(c => new THREE.MeshBasicMaterial({ color: c }));
    const sparks = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), sparkMats[i % 3]);
      m.visible = false;
      fx.add(m);
      const a = (i / 26) * Math.PI * 2 + (i % 3) * 0.3;
      sparks.push({ m, a, v: 1.6 + (i % 5) * 0.45, up: 2.4 + (i % 4) * 0.7, size: 0.035 + (i % 3) * 0.015 });
    }
    const shock = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: 0xff7a1e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    shock.rotation.x = -Math.PI / 2;
    shock.position.y = 0.03;
    fx.add(shock);
    const breath = [];
    const breathMats = [0xffe07a, 0xffa030, 0xff5a14];
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshBasicMaterial({ color: breathMats[i % 3], transparent: true, opacity: 0.9, depthWrite: false }));
      m.visible = false;
      fx.add(m);
      breath.push({ m, ph: (i / 22), a: i * 2.39, r: (i % 5) * 0.05 });
    }

    const glow = new THREE.PointLight(0xff6a1a, 0.7, 6);
    glow.position.set(0, 1.6, 1.0);
    body.add(glow);

    const food = berry();
    food.visible = false;
    root.add(food);

    const tmp = V3(0, 0, 0);
    const mouthW = V3(0, 0, 0);
    const clubW = V3(0, 0, 0);
    const hitPos = V3(0, 0, 0);

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
        let lean = 0.06 + breathe * 0.01;
        let headPitch = 0.05;
        let jawOpen = 0.04;
        let wingOpen = 0;
        let tailLift = 0;
        let impact = -1;
        let shake = 0;
        let roarK = -1;
        let stompSide = 0;
        let crouch = 0;
        let squint = false;

        if (a === "slam") {
          const up = smooth(0.05, 0.4, p);
          const down = smooth(0.4, 0.5, p);
          tailLift = up * (1 - down) * 1.6 - down * (1 - smooth(0.6, 1, p)) * 0.15;
          lean = 0.06 - up * (1 - down) * 0.1 + down * (1 - smooth(0.55, 0.9, p)) * 0.15;
          crouch = down * (1 - smooth(0.55, 0.9, p)) * 0.08;
          impact = p >= 0.5 ? (p - 0.5) / 0.5 : -1;
          shake = impact >= 0 ? Math.max(0, 1 - impact * 3) : 0;
          jawOpen = 0.04 + up * (1 - down) * 0.2;
          squint = p > 0.45 && p < 0.7;
        }
        if (a === "roar") {
          const k = smooth(0.08, 0.3, p) * (1 - smooth(0.85, 1, p));
          const pre = smooth(0, 0.2, p) * (1 - smooth(0.2, 0.3, p));
          headPitch = 0.05 + pre * 0.35 - k * 0.3;
          lean = 0.06 + pre * 0.06 - k * 0.12;
          jawOpen = 0.04 + k * 0.55;
          wingOpen = k;
          roarK = p > 0.3 && p < 0.9 ? (p - 0.3) / 0.6 : -1;
          shake = k * 0.25;
        }
        if (a === "stomp") {
          stompSide = p < 0.5 ? 1 : -1;
          const q = (p % 0.5) / 0.5;
          crouch = Math.sin(q * Math.PI) * 0.03;
          impact = q > 0.6 ? (q - 0.6) / 0.4 : -1;
          shake = impact >= 0 ? Math.max(0, 1 - impact * 4) * 0.6 : 0;
        }
        if (a === "eat") {
          headPitch = 0.05 + (1 - ph.fall) * -0.2 + ph.chew * 0.06;
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

        legs.forEach(({ hip, knee, s: sd }) => {
          let lift = 0;
          if (a === "stomp" && sd === stompSide) {
            const q = (p % 0.5) / 0.5;
            lift = Math.sin(Math.min(1, q / 0.6) * Math.PI) * 0.6;
          }
          hip.rotation.x = -lift * 0.7 - crouch * 2;
          knee.rotation.x = lift * 0.9 + crouch * 3;
          hip.position.y = 1.0 - crouch;
        });

        arms.forEach(({ pivot, elbow, s: sd }) => {
          const swing = Math.sin(t * 1.4 + sd) * 0.05 * motion;
          pivot.rotation.x = -0.15 + swing - wingOpen * 0.5 + (tailLift > 0 ? tailLift * 0.15 : 0);
          pivot.rotation.z = (0.18 + wingOpen * 0.45) * sd;
          elbow.rotation.x = -0.7 - wingOpen * 0.4;
        });

        wings.forEach(({ pivot, s: sd }) => {
          const flap = Math.sin(t * 1.2 + sd) * 0.05 * motion;
          pivot.rotation.y = (0.9 - wingOpen * 0.75) * sd + flap * sd;
          pivot.rotation.z = (0.25 + wingOpen * 0.35) * sd + Math.sin(t * 9) * wingOpen * 0.08 * sd;
          pivot.rotation.x = -0.2 + wingOpen * 0.2;
        });

        tail.forEach((g, i) => {
          if (i === 0) {
            g.parent.rotation.x = -2.25 + tailLift * 0.55;
            return;
          }
          const u = i / tail.length;
          g.rotation.x = 0.07 + tailLift * 0.12 * (1 - u) + (impact >= 0 && impact < 0.3 ? -0.05 : 0);
          g.rotation.z = Math.sin(t * 1.3 - i * 0.45) * 0.07 * u * motion * (tailLift > 0.2 ? 0.2 : 1);
        });

        vents.forEach(({ pool, k, ph: vp }) => {
          pool.scale.setScalar(1 + Math.sin(t * 2.5 + vp) * 0.08 * motion);
        });

        const surge = (impact >= 0 && a === "slam" ? Math.max(0, 1 - impact * 2) * 1.5 : 0) + (roarK >= 0 ? Math.sin(roarK * Math.PI) * 1.2 : 0);
        const lavaK = (0.75 + Math.sin(t * 1.4) * 0.15 * motion + surge) * heat;
        rockMats.forEach(m => (m.emissiveIntensity = lavaK));
        bellyMat.emissiveIntensity = lavaK * 0.9;
        membraneMat.emissiveIntensity = 0.35 + lavaK * 0.25;
        hotMat.color.setRGB(1, 0.8 + surge * 0.1, 0.4);
        glow.intensity = (0.5 + lavaK * 0.5 + surge * 1.2) * heat;

        root.updateMatrixWorld(true);

        smoke.forEach(sm => {
          const v = vents[sm.v];
          const sp = 0.22 + (roarK >= 0 ? 0.25 : 0);
          const u = (((t * sp + sm.ph) % 1) + 1) % 1;
          v.g.localToWorld(tmp.set(0, 0.28 * v.k, 0));
          fx.worldToLocal(tmp);
          sm.m.visible = !reduceMotion;
          sm.m.position.set(tmp.x + Math.sin(sm.a + t * 0.5) * u * 0.25, tmp.y + u * 1.1, tmp.z - u * 0.25 + Math.cos(sm.a) * u * 0.1);
          sm.m.scale.setScalar(0.05 + u * 0.18);
          sm.m.material.opacity = Math.sin(u * Math.PI) * 0.4 * heat;
        });

        tail.club.getWorldPosition(clubW);
        fx.worldToLocal(clubW);
        if (a === "slam" || a === "stomp") {
          if (a === "slam") hitPos.set(clubW.x, 0.05, clubW.z);
          else legs.forEach(({ hip, s: sd }) => sd === stompSide && hitPos.set(hip.position.x, 0.05, 0.25));
        }
        const showSparks = impact >= 0 && !reduceMotion;
        sparks.forEach((spk, i) => {
          const q = a === "slam" ? impact * 1.1 : impact * 0.8;
          spk.m.visible = showSparks && q < 1 && (a === "slam" || i % 2 === 0);
          if (!spk.m.visible) return;
          const tt = q * 0.9;
          const v = spk.v * (a === "slam" ? 1 : 0.5);
          spk.m.position.set(hitPos.x + Math.cos(spk.a) * v * tt, hitPos.y + spk.up * tt - 4.5 * tt * tt * (a === "slam" ? 1 : 1.6), hitPos.z + Math.sin(spk.a) * v * tt);
          if (spk.m.position.y < 0.02) spk.m.position.y = 0.02;
          spk.m.rotation.set(t * 8 + i, t * 6, 0);
          spk.m.scale.setScalar(spk.size * (1 - q * 0.7));
        });
        if (impact >= 0 && !reduceMotion) {
          const q = Math.min(1, impact * (a === "slam" ? 1.6 : 2.5));
          shock.position.set(hitPos.x, 0.03, hitPos.z);
          shock.scale.setScalar((0.3 + q * (a === "slam" ? 3 : 1.4)));
          shock.material.opacity = (1 - q) * 0.6;
        } else shock.material.opacity = 0;

        head.localToWorld(mouthW.set(0, -0.14, 0.62));
        fx.worldToLocal(mouthW);
        head.localToWorld(tmp.set(0, -0.3, 1.6));
        fx.worldToLocal(tmp);
        const dir = tmp.sub(mouthW).normalize();
        breath.forEach(b => {
          if (roarK < 0 || reduceMotion) {
            b.m.visible = false;
            return;
          }
          const q = (((roarK * 3 + b.ph) % 1) + 1) % 1;
          const live = roarK < 0.9 || q < (1 - roarK) * 10;
          b.m.visible = live;
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
        brows.forEach((b, i) => (b.rotation.z = (i ? -0.45 : 0.45) + (a === "roar" ? 0.15 * (i ? -1 : 1) * Math.max(0, roarK) : 0)));
      }
    };
  }
});
