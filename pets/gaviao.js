Pets.register({
  id: "gaviao",
  dex: 24,
  name: "Gavião",
  color: "#6f6a66",
  types: ["flying"],
  description: "As penas das asas ficaram afiadas como facas. Vigia do alto das árvores e mergulha tão rápido que o ar assobia atrás dele.",
  evolvesTo: "harpia",
  evolveLevel: 20,
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    fly: { duration: 3.0 },
    dive: { duration: 3.0 }
  },
  idle: [
    { action: "fly", min: 25, max: 50 },
    { action: "dive", min: 40, max: 80 }
  ],
  clickAction: n => ["dive", "fly", "jump", "dive"][(n - 1) % 4],

  create({ THREE, kit }) {
    const STAGE = 2;
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const M = (c, r, m, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r === undefined ? 0.5 : r, metalness: m || 0 }, extra || {}));
    const taper = (pts, r0, r1, radial, segs) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const sg = segs || 24;
      const rd = radial || 10;
      const g = new THREE.TubeGeometry(curve, sg, 1, rd, false);
      const pos = g.attributes.position;
      const c = V3(0, 0, 0);
      const p = V3(0, 0, 0);
      for (let i = 0; i <= sg; i++) {
        const u = i / sg;
        curve.getPointAt(u, c);
        const r = typeof r0 === "function" ? r0(u) : lerp(r0, r1, u);
        for (let j = 0; j <= rd; j++) {
          const k = i * (rd + 1) + j;
          p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
          pos.setXYZ(k, p.x, p.y, p.z);
        }
      }
      g.computeVertexNormals();
      return g;
    };
    const canvasTex = (w, h, draw) => {
      if (typeof document === "undefined") return null;
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      draw(cv.getContext("2d"), w, h);
      const tx = new THREE.CanvasTexture(cv);
      tx.wrapS = THREE.RepeatWrapping;
      tx.wrapT = THREE.RepeatWrapping;
      return tx;
    };
    let rseed = 1234 + STAGE * 77;
    const rnd = () => {
      rseed = (rseed * 16807) % 2147483647;
      return rseed / 2147483647;
    };
    const noise = (a, b) => Math.sin(a * 12.9898 + b * 78.233) * 0.5 + Math.sin(a * 4.1 + b * 9.7) * 0.5;
    const ACT = (s, name) => (s.action && s.action.name === name ? s.action : null);
    const groundRing = (color, r0, r1) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.012;
      return m;
    };

    const root = new THREE.Group();
    const scaleG = new THREE.Group();
    scaleG.scale.setScalar([0, 1.25, 1.35, 1.45][STAGE]);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);

    const C_BODY = [0, 0xe6e2da, 0x6f6a66, 0x2a2730][STAGE];
    const C_CHEST = [0, 0xf8f6f2, 0xece8e0, 0xd8d2cc][STAGE];
    const C_WING = [0, 0xcfc8be, 0x4a4542, 0x1a1820][STAGE];
    const C_TIP = [0, 0xa69e94, 0x2a2624, 0x5a2a8a][STAGE];
    const body = M(C_BODY, 0.75);
    const chest = M(C_CHEST, 0.8);
    const wingM = M(C_WING, 0.7);
    const tipM = M(C_TIP, 0.6, 0, STAGE === 3 ? { emissive: 0x3a106a, emissiveIntensity: 0.4 } : {});
    const beakM = M(STAGE === 3 ? 0x2a2a30 : 0x3a3a40, 0.35, 0.2);
    const talonM = M(STAGE === 3 ? 0xd8b04a : 0xe8c060, 0.45, 0.1);

    const fluffy = STAGE === 1;
    const BODY_Y = fluffy ? 0.85 : 1.05;
    const torso = mesh(new THREE.SphereGeometry(1, 36, 28), body);
    torso.scale.set(fluffy ? 0.62 : 0.5, fluffy ? 0.66 : 0.72, fluffy ? 0.58 : 0.55);
    torso.position.y = BODY_Y;
    bodyG.add(torso);
    const breast = mesh(new THREE.SphereGeometry(1, 28, 20), chest, false);
    breast.scale.set(fluffy ? 0.5 : 0.3, fluffy ? 0.52 : 0.42, 0.28);
    breast.position.set(0, BODY_Y - (fluffy ? 0.05 : 0.18), fluffy ? 0.32 : 0.3);
    bodyG.add(breast);
    if (fluffy) {
      for (let k = 0; k < 26; k++) {
        const th = rnd() * Math.PI * 2;
        const ph = 0.3 + rnd() * 2.2;
        const tuft = mesh(new THREE.SphereGeometry(0.11 + rnd() * 0.06, 10, 8), k % 3 ? body : chest, false);
        tuft.position.set(Math.sin(ph) * Math.cos(th) * 0.6, BODY_Y + Math.cos(ph) * 0.62, Math.sin(ph) * Math.sin(th) * 0.56);
        bodyG.add(tuft);
      }
    } else {
      const featherRow = (y, n, r, z0, col) => {
        for (let k = 0; k < n; k++) {
          const a = (k / (n - 1) - 0.5) * 1.6;
          const f = mesh(new THREE.SphereGeometry(0.09, 10, 6), col, false);
          f.scale.set(0.8, 0.35, 1.2);
          f.position.set(Math.sin(a) * r * 1.25, y, z0 + Math.cos(a) * r * 1.35);
          f.rotation.y = a;
          f.rotation.x = 0.3;
          bodyG.add(f);
        }
      };
      const band = mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 32, Math.PI), STAGE === 3 ? M(0x14121a, 0.7) : wingM, false);
      band.rotation.set(Math.PI / 2 - 0.15, 0, 0);
      band.scale.set(1.05, 1, 1);
      band.position.set(0, BODY_Y + 0.28, 0.0);
      bodyG.add(band);
      featherRow(BODY_Y - 0.12, 6, 0.33, 0.02, M(STAGE === 3 ? 0x2a2730 : 0x8a847c, 0.8));
      featherRow(BODY_Y - 0.32, 5, 0.3, 0.02, M(STAGE === 3 ? 0x2a2730 : 0x8a847c, 0.8));
    }

    const head = new THREE.Group();
    head.position.set(0, BODY_Y + (fluffy ? 0.62 : 0.72), fluffy ? 0.12 : 0.18);
    bodyG.add(head);
    const skull = mesh(new THREE.SphereGeometry(1, 30, 22), STAGE === 1 ? body : M(STAGE === 3 ? 0x8a8690 : 0xd8d2c8, 0.75));
    skull.scale.set(fluffy ? 0.42 : 0.38, fluffy ? 0.38 : 0.36, fluffy ? 0.4 : 0.4);
    head.add(skull);
    const mask = mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), body, false);
    mask.scale.set(fluffy ? 0.43 : 0.39, fluffy ? 0.3 : 0.3, fluffy ? 0.41 : 0.41);
    mask.position.y = 0.04;
    if (!fluffy) head.add(mask);
    const beak = new THREE.Group();
    beak.position.set(0, -0.03, fluffy ? 0.36 : 0.37);
    head.add(beak);
    const upper = mesh(taper([V3(0, 0.04, 0), V3(0, 0.03, 0.12), V3(0, -0.04, 0.2), V3(0, -0.12, 0.22)], u => lerp(0.08, 0.012, u) * (fluffy ? 0.8 : 1), 0, 10, 16), beakM, false);
    upper.scale.set(1, 1, 1.1);
    beak.add(upper);
    const lower = mesh(taper([V3(0, -0.02, 0), V3(0, -0.04, 0.1), V3(0, -0.06, 0.14)], 0.05, 0.01, 8, 10), beakM, false);
    beak.add(lower);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: fluffy ? 0.62 : 0.5, whiteColor: STAGE === 3 ? 0xffd84a : STAGE === 2 ? 0xffe28a : 0xffffff, pupilColor: 0x10100e });
      e.g.position.set((fluffy ? 0.18 : 0.17) * s, 0.06, fluffy ? 0.3 : 0.31);
      e.g.rotation.y = 0.35 * s;
      head.add(e.g);
      if (!fluffy) {
        const brow = mesh(new THREE.BoxGeometry(0.16, 0.035, 0.08), body, false);
        brow.position.set(0.16 * s, 0.15, 0.31);
        brow.rotation.set(0.2, 0.35 * s, 0.38 * s);
        head.add(brow);
      }
      return e;
    });
    const crest = new THREE.Group();
    crest.position.set(0, 0.22, -0.05);
    head.add(crest);
    const NCREST = [0, 5, 6, 9][STAGE];
    const crestFeathers = [];
    for (let k = 0; k < NCREST; k++) {
      const a = (k / (NCREST - 1) - 0.5) * (STAGE === 3 ? 2.6 : 1.6);
      const len = (STAGE === 1 ? 0.22 : STAGE === 2 ? 0.32 : 0.48) * (1 - Math.abs(a) * 0.18);
      const f = mesh(taper([V3(0, 0, 0), V3(Math.sin(a) * len * 0.4, len * 0.6, -len * 0.3), V3(Math.sin(a) * len * 0.7, len, -len * 0.7)], u => 0.04 * (1 - u) + 0.006, 0, 6, 10), k % 2 ? tipM : body, false);
      crest.add(f);
      crestFeathers.push(f);
    }

    const featherGeo = (len, w) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.quadraticCurveTo(w, len * 0.3, w * 0.6, len * 0.85);
      sh.lineTo(0, len);
      sh.lineTo(-w * 0.3, len * 0.85);
      sh.quadraticCurveTo(-w * 0.5, len * 0.3, 0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
      g.translate(0, 0, -0.0075);
      return g;
    };
    const WSPAN = [0, 0.75, 1.15, 1.5][STAGE];
    const wings = [-1, 1].map(s => {
      const root2 = new THREE.Group();
      root2.position.set(0.42 * s * (fluffy ? 1.2 : 1), BODY_Y + 0.2, -0.05);
      bodyG.add(root2);
      const arm = new THREE.Group();
      root2.add(arm);
      const NF = fluffy ? 5 : 9;
      const feathers = [];
      for (let k = 0; k < NF; k++) {
        const f = k / (NF - 1);
        const len = WSPAN * (0.45 + 0.55 * Math.sin(f * Math.PI * 0.8 + 0.2));
        const fm = mesh(featherGeo(len, fluffy ? 0.12 : 0.1), k > NF * 0.6 ? tipM : wingM, false);
        fm.position.set(s * f * WSPAN * 0.45, 0, -f * 0.08);
        fm.rotation.z = s * (-Math.PI / 2 + f * 0.9 - 0.25);
        if (STAGE >= 2 && k > NF * 0.6) {
          const edge = mesh(new THREE.ConeGeometry(0.02, 0.14, 4), M(0xe8e8f0, 0.2, 0.7), false);
          edge.position.set(0, len * 0.98, 0);
          fm.add(edge);
        }
        arm.add(fm);
        feathers.push(fm);
      }
      const cover = mesh(new THREE.SphereGeometry(1, 20, 14), wingM, false);
      cover.scale.set(WSPAN * 0.28, 0.12, 0.22);
      cover.position.set(s * WSPAN * 0.2, 0.05, 0);
      arm.add(cover);
      return { root2, arm, s, feathers };
    });

    const tailG = new THREE.Group();
    tailG.position.set(0, BODY_Y - 0.35, -0.42);
    bodyG.add(tailG);
    const NT = [0, 3, 5, 7][STAGE];
    for (let k = 0; k < NT; k++) {
      const a = (k / Math.max(1, NT - 1) - 0.5) * 0.9;
      const tf = mesh(featherGeo([0, 0.3, 0.55, 0.75][STAGE], 0.09), k % 2 ? tipM : wingM, false);
      tf.rotation.set(-Math.PI / 2 - 0.5, 0, a);
      tf.position.x = a * 0.12;
      tailG.add(tf);
    }

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.18 * s, BODY_Y - (fluffy ? 0.55 : 0.6), 0.05);
      const shin = mesh(new THREE.CylinderGeometry(0.035, 0.045, fluffy ? 0.22 : 0.36, 8), talonM, false);
      shin.position.y = fluffy ? -0.1 : -0.17;
      g.add(shin);
      const foot = new THREE.Group();
      foot.position.y = fluffy ? -0.22 : -0.36;
      g.add(foot);
      [-0.5, 0, 0.5, Math.PI].forEach((a, k) => {
        const toe = new THREE.Group();
        toe.rotation.y = a;
        const tl = (fluffy ? 0.1 : 0.15) * (STAGE === 3 ? 1.3 : 1);
        toe.add(mesh(taper([V3(0, 0, 0), V3(0, -0.02, tl * 0.6), V3(0, -0.06, tl)], 0.022, 0.016, 6, 8), talonM, false));
        const claw = mesh(new THREE.ConeGeometry(0.016, STAGE === 3 ? 0.11 : 0.06, 6), M(0x1a1a1e, 0.3), false);
        claw.position.set(0, -0.08, tl + 0.02);
        claw.rotation.x = 2.2;
        toe.add(claw);
        foot.add(toe);
      });
      bodyG.add(g);
      return { g, foot, s };
    });

    const windMat = new THREE.MeshBasicMaterial({ color: STAGE === 3 ? 0xb28cff : 0xe8f4ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const swirls = [0, 1, 2].map(k => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.7 + k * 0.25, 0.015, 6, 48, Math.PI * 1.4), windMat.clone());
      m.rotation.x = Math.PI / 2;
      m.visible = false;
      scaleG.add(m);
      return m;
    });
    const loose = [];
    for (let k = 0; k < 8; k++) {
      const m = mesh(featherGeo(0.18, 0.06), k % 2 ? tipM : wingM, false);
      m.visible = false;
      scaleG.add(m);
      loose.push({ m, k, a: (k / 8) * Math.PI * 2 });
    }
    const ring = groundRing(STAGE === 3 ? 0x8a5ad8 : 0xd8e4f0, 0.9, 1.05);
    root.add(ring);

    const food = berry();
    food.visible = false;
    scaleG.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, motion } = s;
        const jump = ACT(s, "jump");
        const eat = ACT(s, "eat");
        const fly = ACT(s, "fly");
        const dive = ACT(s, "dive");
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let spread = 0;
        let flap = 0;
        let spin = 0;
        let pitch = 0;
        let ruffle = 0;
        let airborne = false;
        if (jump) {
          const p = jump.p;
          if (p > 0.2 && p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.8;
            airborne = true;
            spread = Math.sin(q * Math.PI);
            flap = spread;
          }
        }
        if (fly) {
          const p = fly.p;
          const k = smooth(0, 0.15, p) * (1 - smooth(0.85, 1, p));
          spread = Math.max(spread, k);
          flap = k;
          y = k * (1.1 + Math.sin(t * 3) * 0.1);
          airborne = k > 0.1;
        }
        if (dive) {
          const p = dive.p;
          const up = smooth(0, 0.3, p) * (1 - smooth(0.42, 0.5, p));
          const fall = smooth(0.42, 0.75, p);
          const k = smooth(0, 0.1, p) * (1 - smooth(0.88, 1, p));
          y = up * 2.0 + (1 - fall) * (p > 0.42 ? 2.0 : 0) * k;
          if (p > 0.75) y = (1 - smooth(0.75, 0.82, p)) * 0.1;
          spread = Math.max(up, k * (1 - fall * 0.8));
          flap = up;
          pitch = p > 0.42 && p < 0.78 ? 1.2 : 0;
          spin = p > 0.42 && p < 0.78 ? (p - 0.42) * 30 : 0;
          if (p > 0.74 && p < 0.92) ruffle = Math.sin(((p - 0.74) / 0.18) * Math.PI);
          airborne = y > 0.05;
        }
        root.position.y = y;
        root.rotation.y = lookYaw + spin;
        root.rotation.x = lookPitch;
        bodyG.rotation.x = pitch * 0.9 + (airborne && !pitch ? 0.25 : 0);
        torso.scale.y = (fluffy ? 0.66 : 0.72) * (1 + Math.sin(t * 2.2) * 0.015 * motion);

        const flapA = Math.sin(t * (STAGE === 1 ? 20 : 12)) * 0.7 * flap;
        wings.forEach(({ root2, arm, s: sd, feathers }) => {
          const fold = 1 - spread;
          root2.rotation.z = sd * (-fold * 1.3 + flapA * (pitch ? 0 : 1)) - sd * pitch * 0.6;
          root2.rotation.y = -sd * fold * 0.35;
          root2.rotation.x = -fold * 0.25 + (pitch ? 0.6 : 0);
          arm.scale.setScalar(0.55 + spread * 0.45);
          feathers.forEach((f, k) => {
            f.rotation.x = Math.sin(t * 2 + k) * 0.03 * motion + ruffle * Math.sin(t * 30 + k) * 0.2;
          });
        });
        tailG.rotation.x = -0.15 + Math.sin(t * 1.6) * 0.06 * motion + (airborne ? 0.3 : 0);
        crest.rotation.x = -0.2 + Math.sin(t * 2.4) * 0.08 * motion + ruffle * 0.4 + (airborne ? -0.4 : 0);
        crestFeathers.forEach((f, k) => {
          f.rotation.z = Math.sin(t * 3 + k) * 0.05 * motion;
        });
        head.rotation.y = Math.sin(t * 0.5) * 0.4 * motion * (airborne ? 0.3 : 1) + pointer.x * 0.2;
        head.rotation.x = eat ? -0.6 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.25 : pitch * -0.6;
        const tilt = Math.max(0, Math.sin(t * 0.37) - 0.85) * 4;
        head.rotation.z = tilt * 0.4 * motion;
        lower.rotation.x = eat ? ph.chew * 0.4 : ruffle * 0.5;
        legs.forEach(({ g, foot }) => {
          g.rotation.x = airborne ? 0.9 : 0;
          foot.rotation.x = airborne ? 0.6 : 0;
        });

        const windOn = (fly && flap > 0.2) || pitch > 0 || ruffle > 0.1;
        swirls.forEach((w, k) => {
          w.visible = windOn;
          if (!windOn) return;
          w.position.y = 0.2 + k * 0.5 + y / scaleG.scale.y * 0.3;
          w.rotation.z = t * (3 + k) * (k % 2 ? 1 : -1);
          w.material.opacity = (pitch ? 0.5 : 0.25 + ruffle * 0.4) * (1 - k * 0.2);
          w.scale.setScalar(1 + ruffle * 0.8);
        });
        loose.forEach(l => {
          const on = ruffle > 0.05;
          l.m.visible = on;
          if (!on) return;
          const u = 1 - ruffle;
          const a = l.a + u * 3;
          l.m.position.set(Math.cos(a) * (0.6 + u * 0.8), 0.6 + Math.sin(u * Math.PI) * 0.8 - u * 0.3, Math.sin(a) * (0.6 + u * 0.8));
          l.m.rotation.set(t * 3 + l.k, t * 2, a);
        });
        ring.scale.setScalar(1 + ruffle * 0.8 + flap * 0.2 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = 0.14 + ruffle * 0.35 + flap * 0.1;

        eyes.forEach(({ g }) => {
          g.scale.y = eat && eat.p > 0.3 ? 0.45 : pitch ? 0.6 : blink;
        });
        followPupils(eyes, pointer, 0.5);

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(1.2, 0.12, ph.fall * ph.fall), 0.75);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.6);
        } else food.visible = false;
      }
    };
  }
});
