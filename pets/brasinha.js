Pets.register({
  id: "brasinha",
  dex: 22,
  name: "Brasinha",
  color: "#e0602a",
  types: ["dragon", "fire"],
  evolvesTo: "magmarra",
  evolveLevel: 16,
  description: "Filhote de dragão que nasce dentro de pedras vulcânicas. A casca de rocha racha conforme ele cresce, e a lava aparece pelas frestas. Ainda não sabe cuspir fogo direito: quando tenta, sai só uma baforada e um pouco de fumaça.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    puff: { duration: 2.2 },
    wag: { duration: 1.6 }
  },
  idle: [
    { action: "puff", min: 20, max: 45 },
    { action: "wag", min: 12, max: 30 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "puff", "wag"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, lavaRock } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const T = lavaRock({ seed: 3, cells: 22, crack: 3.4, rock: [74, 56, 50], lava: [255, 120, 30] });
    const rep = (t, x, y) => {
      const c = t.clone();
      c.needsUpdate = true;
      c.repeat.set(x, y);
      return c;
    };
    const rockMatR = (rx, ry) =>
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        map: rep(T.map, rx, ry),
        emissive: 0xff5a12,
        emissiveMap: rep(T.emi, rx, ry),
        emissiveIntensity: 1,
        bumpMap: rep(T.bump, rx, ry),
        bumpScale: 0.035,
        roughness: 0.82
      });
    const bodyRock = rockMatR(2, 1);
    const headRock = rockMatR(1.5, 1);
    const limbRock = rockMatR(1, 1);
    const rockMats = [bodyRock, headRock, limbRock];
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xd9824a, roughness: 0.6, emissive: 0x7a2a08, emissiveIntensity: 0.35 });
    const clawMat = mat(0x2a1a16, 0.4);
    const darkMat = mat(0x1a0c08, 0.5);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb03a });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });
    const membraneMat = new THREE.MeshStandardMaterial({
      color: 0x7a2a14,
      emissive: 0xc0400e,
      emissiveIntensity: 0.45,
      roughness: 0.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });

    const root = new THREE.Group();
    const sizer = new THREE.Group();
    sizer.scale.setScalar(1.35);
    root.add(sizer);
    const squash = new THREE.Group();
    sizer.add(squash);

    const torso = mesh(new THREE.SphereGeometry(1, 48, 32), bodyRock);
    torso.scale.set(0.52, 0.42, 0.74);
    torso.position.set(0, 0.6, -0.08);
    squash.add(torso);

    const chest = mesh(new THREE.SphereGeometry(1, 32, 24), bellyMat, false);
    chest.scale.set(0.38, 0.32, 0.3);
    chest.position.set(0, 0.56, 0.38);
    squash.add(chest);
    const belly = mesh(new THREE.SphereGeometry(1, 32, 24), bellyMat, false);
    belly.scale.set(0.4, 0.2, 0.62);
    belly.position.set(0, 0.36, -0.05);
    squash.add(belly);
    for (let i = 0; i < 4; i++) {
      const band = mesh(new THREE.TorusGeometry(0.3 - i * 0.03, 0.012, 6, 30, Math.PI), darkMat, false);
      band.rotation.z = Math.PI;
      band.position.set(0, 0.66 - i * 0.075, 0.6 - i * 0.03);
      band.scale.set(1, 0.6, 1);
      band.rotation.x = -0.25;
      squash.add(band);
    }

    const plates = [];
    for (let i = 0; i < 6; i++) {
      const z = 0.42 - i * 0.24;
      const tz = (z + 0.08) / 0.74;
      const y = 0.6 + 0.42 * Math.sqrt(Math.max(0, 1 - tz * tz)) - 0.03;
      const g = new THREE.Group();
      g.position.set(0, y, z);
      const h = 0.16 - Math.abs(i - 1.5) * 0.02;
      const sp = mesh(new THREE.ConeGeometry(0.075, h, 5), limbRock);
      sp.position.y = h / 2;
      sp.rotation.x = -0.35;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.05, 5), glowMat);
      tip.position.set(0, h - 0.01, -0.03);
      tip.rotation.x = -0.35;
      g.add(sp, tip);
      squash.add(g);
      plates.push({ g, ph: i * 0.7 });
    }

    const legs = [
      [-1, 0.34, 0.3],
      [1, 0.34, 0.3],
      [-1, 0.36, -0.42],
      [1, 0.36, -0.42]
    ].map(([s, x, z], k) => {
      const hip = new THREE.Group();
      hip.position.set(x * s, 0.5, z);
      const thigh = mesh(new THREE.SphereGeometry(1, 24, 18), limbRock);
      thigh.scale.set(0.15, 0.22, 0.17);
      thigh.position.set(0.04 * s, -0.12, 0);
      const foot = new THREE.Group();
      foot.position.set(0.05 * s, -0.42, 0.04);
      const sole = mesh(new THREE.SphereGeometry(1, 24, 16), limbRock);
      sole.scale.set(0.15, 0.08, 0.19);
      foot.add(sole);
      [-1, 0, 1].forEach(j => {
        const c = mesh(new THREE.ConeGeometry(0.03, 0.09, 8), clawMat, false);
        c.rotation.x = Math.PI / 2;
        c.position.set(j * 0.07, -0.02, 0.19 - Math.abs(j) * 0.03);
        foot.add(c);
      });
      hip.add(thigh, foot);
      squash.add(hip);
      return { hip, foot, s, front: k < 2, ph: k * 1.3 };
    });

    const wings = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.24 * s, 0.94, -0.1);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(0.42, 0.18);
      shape.quadraticCurveTo(0.36, 0.06, 0.4, -0.02);
      shape.quadraticCurveTo(0.3, -0.04, 0.3, -0.12);
      shape.quadraticCurveTo(0.2, -0.1, 0.16, -0.2);
      shape.quadraticCurveTo(0.08, -0.08, 0, 0);
      const mem = mesh(new THREE.ShapeGeometry(shape, 12), membraneMat, false);
      const arm = mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.46, 8), limbRock, false);
      arm.rotation.z = -Math.PI / 2 + 0.41;
      arm.position.set(0.21, 0.09, 0.005);
      const claw = mesh(new THREE.ConeGeometry(0.02, 0.06, 6), clawMat, false);
      claw.position.set(0.43, 0.2, 0);
      claw.rotation.z = -0.9;
      const inner = new THREE.Group();
      inner.add(mem, arm, claw);
      inner.scale.set(s, 1, 1);
      pivot.add(inner);
      pivot.rotation.y = -0.35 * s;
      squash.add(pivot);
      return { pivot, s };
    });

    const tail = [];
    {
      const base = new THREE.Group();
      base.position.set(0, 0.52, -0.76);
      base.rotation.x = -2.2;
      squash.add(base);
      let parent = base;
      const n = 9;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const g = new THREE.Group();
        g.position.y = i === 0 ? 0 : 0.11;
        const r = 0.17 * (1 - 0.72 * u);
        const seg = mesh(new THREE.SphereGeometry(1, 20, 14), limbRock);
        seg.scale.set(r, 0.1, r);
        seg.position.y = 0.05;
        g.add(seg);
        if (i % 2 === 1 && i < n - 1) {
          const sp = mesh(new THREE.ConeGeometry(0.035 * (1 - u * 0.5), 0.08, 5), limbRock, false);
          sp.position.set(0, 0.05, -r * 0.95);
          sp.rotation.x = -Math.PI / 2;
          g.add(sp);
        }
        parent.add(g);
        tail.push(g);
        parent = g;
      }
    }

    const flameGeo = (h, w) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        const r = w * Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.3 * u);
        pts.push(new THREE.Vector2(Math.max(r, 0.0001), u * h));
      }
      return new THREE.LatheGeometry(pts, 14);
    };
    const tailFlame = new THREE.Group();
    const tfo = new THREE.Mesh(flameGeo(0.36, 0.09), new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.95 }));
    const tfi = new THREE.Mesh(flameGeo(0.22, 0.05), new THREE.MeshBasicMaterial({ color: 0xffd23a }));
    tailFlame.add(tfo, tfi);
    tailFlame.position.y = 0.08;
    tail[tail.length - 1].add(tailFlame);

    const head = new THREE.Group();
    head.position.set(0, 0.95, 0.5);
    squash.add(head);
    const skull = mesh(new THREE.SphereGeometry(1, 48, 36), headRock);
    skull.scale.set(0.5, 0.44, 0.48);
    head.add(skull);
    const snout = mesh(new THREE.SphereGeometry(1, 32, 24), headRock);
    snout.scale.set(0.3, 0.2, 0.28);
    snout.position.set(0, -0.12, 0.36);
    head.add(snout);
    const jawBelly = mesh(new THREE.SphereGeometry(1, 24, 16), bellyMat, false);
    jawBelly.scale.set(0.26, 0.12, 0.24);
    jawBelly.position.set(0, -0.22, 0.32);
    head.add(jawBelly);
    [-1, 1].forEach(s => {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), lavaMat);
      n.scale.set(1, 0.6, 1);
      n.position.set(0.08 * s, -0.06, 0.62);
      head.add(n);
    });

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.92, whiteColor: 0xfff1cc, pupilColor: 0x2a0a02 });
      e.g.position.set(0.25 * s, 0.07, 0.36);
      e.g.rotation.y = 0.32 * s;
      head.add(e.g);
      return e;
    });
    [-1, 1].forEach(s => {
      const brow = mesh(new THREE.SphereGeometry(1, 16, 10), headRock, false);
      brow.scale.set(0.15, 0.045, 0.08);
      brow.position.set(0.26 * s, 0.29, 0.34);
      brow.rotation.z = 0.25 * s;
      head.add(brow);
    });

    const horns = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.22 * s, 0.32, -0.06);
      g.rotation.set(-0.75, 0, -0.3 * s);
      const h = mesh(new THREE.ConeGeometry(0.06, 0.24, 10), limbRock, false);
      h.position.y = 0.12;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.07, 8), glowMat);
      tip.position.y = 0.21;
      g.add(h, tip);
      head.add(g);
      return g;
    });
    const nub = mesh(new THREE.ConeGeometry(0.04, 0.1, 8), limbRock, false);
    nub.position.set(0, 0.42, 0.08);
    nub.rotation.x = -0.4;
    head.add(nub);

    const mouthMat = mat(0x3a0e08, 0.4);
    const smileGeo = new THREE.TorusGeometry(0.29, 0.013, 8, 36, 1.5);
    smileGeo.rotateZ(Math.PI / 2 - 0.75);
    smileGeo.rotateX(Math.PI / 2);
    const smilePos = smileGeo.attributes.position;
    for (let i = 0; i < smilePos.count; i++) {
      const x = smilePos.getX(i);
      smilePos.setY(i, smilePos.getY(i) + x * x * 0.9);
    }
    smileGeo.computeVertexNormals();
    const smile = mesh(smileGeo, mouthMat, false);
    smile.scale.set(1.02, 1, 0.98);
    smile.position.set(0, -0.2, 0.36);
    head.add(smile);
    [-1, 1].forEach(s => {
      const fang = mesh(new THREE.ConeGeometry(0.016, 0.045, 6), mat(0xfff4e0, 0.3), false);
      fang.rotation.x = Math.PI;
      fang.position.set(0.07 * s, -0.215, 0.615);
      head.add(fang);
    });
    const openMouth = new THREE.Group();
    const om = mesh(new THREE.SphereGeometry(0.085, 20, 14), mouthMat, false);
    om.scale.set(1.1, 0.8, 0.45);
    const omGlow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), lavaMat);
    omGlow.scale.set(1, 0.7, 0.4);
    omGlow.position.z = 0.012;
    openMouth.add(om, omGlow);
    openMouth.position.set(0, -0.22, 0.58);
    openMouth.visible = false;
    head.add(openMouth);

    const puffs = [];
    const puffMats = [0xffe07a, 0xffa030, 0xff6a1a, 0x5a4a44].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, depthWrite: false }));
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), puffMats[0].clone());
      m.visible = false;
      root.add(m);
      puffs.push({ m, d: (i / 14) * 0.5, a: i * 2.39, r: 0.4 + (i % 4) * 0.15 });
    }

    const embers = [];
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xffb13b });
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), emberMat);
      squash.add(m);
      embers.push({ m, ph: (i * 0.37) % 1, a: i * 2.1, rad: 0.3 + (i % 3) * 0.15, sp: 0.12 + (i % 4) * 0.03, size: 0.02 + (i % 3) * 0.01 });
    }

    const glow = new THREE.PointLight(0xff7a2a, 0.5, 4);
    glow.position.set(0, 1.0, 0.9);
    squash.add(glow);

    const food = berry();
    food.visible = false;
    sizer.add(food);

    const headWorld = V3(0, 0, 0);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;
        const heat = s.dying ? 0.25 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.02 * motion;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let headUp = 0;
        let puffK = -1;
        let wagK = 0;
        let charge = 0;

        if (a === "jump") {
          if (p < 0.18) sy = 1 - 0.2 * Math.sin((p / 0.18) * Math.PI / 2);
          else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 0.9;
            sy = 1 + 0.1 * Math.cos(q * Math.PI);
            airborne = true;
          } else sy = 1 - 0.18 * Math.sin(((p - 0.78) / 0.22) * Math.PI);
        }
        if (a === "puff") {
          charge = smooth(0, 0.35, p) * (1 - smooth(0.35, 0.42, p));
          headUp = charge * 0.35 - smooth(0.38, 0.45, p) * (1 - smooth(0.8, 1, p)) * 0.15;
          sy += charge * 0.08;
          mouthOpen = p > 0.38 && p < 0.85;
          puffK = p > 0.38 ? (p - 0.38) / 0.62 : -1;
          squint = charge > 0.3;
        }
        if (a === "wag") wagK = Math.sin(p * Math.PI);
        if (a === "eat") {
          sy += 0.04 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.06 * motion;
          mouthOpen = p > 0.12 && p < 0.85 && (p < 0.3 || ph.chew > 0.35);
          squint = p > 0.3;
          headUp = (1 - ph.fall) * 0.2;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.2) * 0.025 * motion + wagK * Math.sin(t * 14) * 0.03;

        head.rotation.x = -headUp + Math.sin(t * 1.5) * 0.03 * motion;
        head.rotation.z = Math.sin(t * 0.8) * 0.06 * motion + (a === "eat" ? Math.sin(p * Math.PI * 6) * 0.05 : 0);
        head.rotation.y = pointer.x * 0.15;

        smile.visible = !(mouthOpen || airborne);
        openMouth.visible = mouthOpen || airborne;
        openMouth.scale.setScalar(a === "eat" ? 0.7 + ph.chew * 0.5 : 1);

        legs.forEach(({ hip, foot, front, ph: lp }) => {
          const step = airborne ? (front ? -0.5 : 0.5) : Math.sin(t * 2.4 + lp) * 0.04 * motion + wagK * Math.sin(t * 16 + lp) * 0.08;
          hip.rotation.x = step;
          foot.rotation.x = -step;
        });

        wings.forEach(({ pivot, s: sd }) => {
          const flap = airborne ? Math.sin(t * 22) * 0.6 : charge > 0 ? charge * 0.6 : Math.sin(t * 2 + sd) * 0.08 * motion;
          pivot.rotation.z = (0.25 + flap + (puffK > 0 ? 0.3 * Math.sin(Math.min(1, puffK * 2) * Math.PI) : 0)) * sd;
          pivot.rotation.y = -0.35 * sd;
        });

        const wagAmp = 0.12 + wagK * 0.5;
        tail.forEach((g, i) => {
          if (i === 0) return;
          const u = i / tail.length;
          g.rotation.z = Math.sin(t * (2 + wagK * 8) - i * 0.6) * wagAmp * u * (0.4 + motion * 0.6);
          g.rotation.x = 0.16 + (airborne ? 0.1 : 0);
        });
        const fl = (1 + 0.15 * Math.sin(t * 11) + 0.08 * Math.sin(t * 19)) * heat * (1 + wagK * 0.3);
        tailFlame.scale.set(fl, fl * (1 + 0.1 * Math.sin(t * 9)), fl);

        plates.forEach(({ g, ph: pp }) => {
          g.scale.y = 1 + Math.sin(t * 3 + pp) * 0.05 * motion + charge * 0.3;
        });

        const pulse = 0.75 + Math.sin(t * 2.2) * 0.2 * motion;
        const lavaK = (pulse + charge * 1.3 + (puffK > 0 ? (1 - puffK) * 0.6 : 0)) * heat;
        rockMats.forEach(m => (m.emissiveIntensity = lavaK));
        bellyMat.emissiveIntensity = 0.25 + lavaK * 0.2;
        membraneMat.emissiveIntensity = 0.3 + lavaK * 0.25;
        glow.intensity = (0.35 + lavaK * 0.4 + (puffK > 0 ? Math.sin(Math.min(1, puffK * 1.5) * Math.PI) * 1.5 : 0)) * heat;

        root.updateMatrixWorld(true);
        head.localToWorld(headWorld.set(0, -0.2, 0.68));
        root.worldToLocal(headWorld);
        puffs.forEach((pf, i) => {
          if (puffK < 0 || reduceMotion) {
            pf.m.visible = false;
            return;
          }
          const q = (puffK - pf.d) / 0.5;
          pf.m.visible = q > 0 && q < 1;
          if (!pf.m.visible) return;
          const fire = q < 0.45;
          const dist = q * 0.9;
          pf.m.position.set(
            headWorld.x + Math.cos(pf.a) * pf.r * q * 0.25,
            headWorld.y + q * 0.35 + Math.sin(pf.a) * pf.r * q * 0.15,
            headWorld.z + dist
          );
          const sz = (0.05 + q * 0.12) * (fire ? 1 : 1.3);
          pf.m.scale.setScalar(sz);
          const col = fire ? (q < 0.15 ? 0xffe07a : q < 0.3 ? 0xffa030 : 0xff6a1a) : 0x6a5a54;
          pf.m.material.color.setHex(col);
          pf.m.material.opacity = fire ? 0.9 : 0.55 * (1 - q);
        });

        embers.forEach(e => {
          const u = (((t * e.sp + e.ph) % 1) + 1) % 1;
          const ang = e.a + t * 0.6;
          e.m.position.set(Math.sin(ang) * e.rad, 0.7 + u * 1.3, -0.1 + Math.cos(ang) * e.rad);
          e.m.rotation.set(t * 2 + e.ph * 5, t * 1.5, 0);
          e.m.scale.setScalar(Math.max(0.001, e.size * Math.sin(Math.PI * u) * heat * (reduceMotion ? 0 : 1)));
        });

        if (a === "eat") {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, 0.82 + y, ph.fall * ph.fall), lerp(0.9, 1.12, ph.fall));
          food.scale.setScalar(0.8 * (1 - 0.85 * ph.bite));
        } else food.visible = false;

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.08 : squint ? 0.4 : blink;
        });
        followPupils(eyes, pointer);
        horns.forEach((g, i) => (g.rotation.z = (i ? -0.3 : 0.3) + Math.sin(t * 1.1 + i) * 0.02 * motion));
      }
    };
  }
});
