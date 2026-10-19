Pets.register({
  id: "abissomente",
  dex: 33,
  name: "Abissomente",
  color: "#6a7ae8",
  types: ["psychic",  "water"],
  description: "Um polvo enorme vindo do fundo do oceano. Seus tentáculos se desfazem em filamentos de luz, um terceiro olho de cristal brilha na cabeça e objetos pesados orbitam ao seu redor sem que ele os toque.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    telekinesis: { duration: 3.2 },
    pulse: { duration: 2.2 }
  },
  idle: [
    { action: "telekinesis", min: 25, max: 50 },
    { action: "pulse", min: 35, max: 70 }
  ],
  clickAction: n => ["telekinesis", "pulse", "jump", "telekinesis"][(n - 1) % 4],

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
    scaleG.scale.setScalar(STAGE === 1 ? 1.15 : 1.35);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);

    const HOVER = STAGE === 1 ? 1.05 : 1.25;
    const skinMat = new THREE.MeshStandardMaterial({ color: STAGE === 1 ? 0x9ad8ff : 0x6a7ae8, roughness: 0.15, transparent: true, opacity: STAGE === 1 ? 0.55 : 0.6, emissive: STAGE === 1 ? 0x2a6aa8 : 0x3a2aa8, emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const innerMat = new THREE.MeshStandardMaterial({ color: STAGE === 1 ? 0xff9ad8 : 0xd88aff, roughness: 0.4, emissive: STAGE === 1 ? 0xff5ab8 : 0xb05aff, emissiveIntensity: 0.5 });
    const spotMat = new THREE.MeshBasicMaterial({ color: STAGE === 1 ? 0x8ffcff : 0xfff08a });

    const mantleR = STAGE === 1 ? 0.45 : 0.62;
    const mantle = new THREE.Group();
    mantle.position.y = HOVER + mantleR * 0.55;
    bodyG.add(mantle);
    const mantleGeo = new THREE.SphereGeometry(mantleR, 40, 30);
    {
      const pos = mantleGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / mantleR;
        const k = y > 0 ? 1 + y * 0.35 : 1;
        pos.setY(i, pos.getY(i) * k);
      }
      mantleGeo.computeVertexNormals();
    }
    const shell = mesh(mantleGeo, skinMat, false);
    mantle.add(shell);
    const brain = new THREE.Group();
    brain.position.y = mantleR * 0.25;
    mantle.add(brain);
    const lobes = [];
    [-1, 1].forEach(s => {
      const lobe = mesh(new THREE.SphereGeometry(mantleR * 0.42, 28, 20), innerMat, false);
      lobe.scale.set(0.8, 0.85, 1.15);
      lobe.position.x = mantleR * 0.22 * s;
      brain.add(lobe);
      lobes.push(lobe);
      for (let k = 0; k < 5; k++) {
        const fold = mesh(new THREE.TorusGeometry(mantleR * (0.18 + k * 0.035), mantleR * 0.022, 6, 24, Math.PI * 1.1), innerMat, false);
        fold.position.set(mantleR * 0.22 * s, mantleR * (0.12 - k * 0.04), mantleR * (0.05 - k * 0.07));
        fold.rotation.set(0.3 + k * 0.4, s * 0.5, s * 0.3);
        brain.add(fold);
      }
    });
    const stem = mesh(new THREE.CylinderGeometry(mantleR * 0.1, mantleR * 0.16, mantleR * 0.5, 12), innerMat, false);
    stem.position.y = -mantleR * 0.35;
    brain.add(stem);
    const spots = [];
    for (let k = 0; k < (STAGE === 1 ? 10 : 18); k++) {
      const th = rnd() * Math.PI * 2;
      const ph = 0.2 + rnd() * 1.3;
      const d = V3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * (1 + Math.max(0, Math.cos(ph)) * 0.35), Math.sin(ph) * Math.sin(th));
      const sp = new THREE.Mesh(new THREE.SphereGeometry(mantleR * 0.04, 8, 6), spotMat);
      sp.position.copy(d).multiplyScalar(mantleR * 1.01);
      mantle.add(sp);
      spots.push({ m: sp, ph: rnd() * 10 });
    }

    const headG = new THREE.Group();
    headG.position.set(0, HOVER - mantleR * 0.05, 0);
    bodyG.add(headG);
    const face = mesh(new THREE.SphereGeometry(mantleR * 0.62, 30, 22), new THREE.MeshStandardMaterial({ color: STAGE === 1 ? 0xb8e8ff : 0x8a9af0, roughness: 0.25, transparent: true, opacity: 0.85 }), false);
    face.scale.set(1.15, 0.75, 1);
    headG.add(face);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: STAGE === 1 ? 0.68 : 0.62, whiteColor: STAGE === 1 ? 0xeafcff : 0xfff8d0, pupilColor: 0x0a1030 });
      e.pupil.scale.set(STAGE === 1 ? 0.95 : 1.15, STAGE === 1 ? 1.1 : 0.8, 0.5);
      e.g.position.set(mantleR * 0.36 * s, mantleR * 0.08, mantleR * 0.56);
      e.g.rotation.y = 0.4 * s;
      headG.add(e.g);
      return e;
    });
    let third = null;
    if (STAGE === 2) {
      third = new THREE.Group();
      third.position.set(0, mantleR * 0.75, mantleR * 0.72);
      const gem = mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshStandardMaterial({ color: 0xfff08a, emissive: 0xffc83a, emissiveIntensity: 0.8, roughness: 0.1 }), false);
      gem.scale.set(0.8, 1.3, 0.5);
      third.add(gem);
      mantle.add(third);
    }
    const siphon = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 10), face.material, false);
    siphon.rotation.x = Math.PI / 2 + 0.4;
    siphon.position.set(0, -mantleR * 0.25, mantleR * 0.55);
    headG.add(siphon);

    const NT = 8;
    const TS = 22;
    const TL = STAGE === 1 ? 1.0 : 1.55;
    const armMat = new THREE.MeshStandardMaterial({ color: STAGE === 1 ? 0xa8deff : 0x7a88f0, roughness: 0.2, transparent: true, opacity: 0.8, emissive: STAGE === 1 ? 0x2a6aa8 : 0x3a2aa8, emissiveIntensity: 0.2 });
    const suckerMat = M(STAGE === 1 ? 0xffd0ec : 0xf0d0ff, 0.4);
    const tentacles = [];
    for (let k = 0; k < NT; k++) {
      const a = (k / NT) * Math.PI * 2 + Math.PI / NT;
      const pts = [];
      for (let i = 0; i <= 5; i++) pts.push(V3(0, 0, 0));
      const m = mesh(new THREE.BufferGeometry(), armMat, false);
      m.frustumCulled = false;
      bodyG.add(m);
      const suckers = [];
      for (let j = 0; j < 5; j++) {
        const sk = mesh(new THREE.TorusGeometry(0.025, 0.01, 6, 12), suckerMat, false);
        bodyG.add(sk);
        suckers.push(sk);
      }
      const strands = [];
      if (STAGE === 2) {
        for (let j = 0; j < 3; j++) {
          const sm = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: [0x9ffcff, 0xfff08a, 0xd8a8ff][j], transparent: true, opacity: 0.8 }));
          sm.frustumCulled = false;
          bodyG.add(sm);
          strands.push({ m: sm, j, pts: [V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0)] });
        }
      }
      tentacles.push({ a, pts, m, suckers, strands, ph: k * 0.7 });
    }

    const orbiters = [];
    const shapes = [new THREE.IcosahedronGeometry(0.09, 0), new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.TetrahedronGeometry(0.1, 0), new THREE.TorusGeometry(0.07, 0.025, 6, 14)];
    for (let k = 0; k < (STAGE === 1 ? 3 : 6); k++) {
      const m = mesh(shapes[k % shapes.length], new THREE.MeshStandardMaterial({ color: [0x8a6a4a, 0x6a8aa8, 0xa8a8b8, 0xd8b04a][k % 4], roughness: 0.6, emissive: 0x8a5aff, emissiveIntensity: 0.25 }), false);
      m.visible = false;
      scaleG.add(m);
      orbiters.push({ m, k, a: (k / 6) * Math.PI * 2 });
    }
    const auraMat = new THREE.MeshBasicMaterial({ color: STAGE === 1 ? 0x8ffcff : 0xc88aff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const auras = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(mantleR * 1.2, 0.012, 6, 48), auraMat.clone());
      m.visible = false;
      bodyG.add(m);
      return m;
    });
    const bubbles = [];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshStandardMaterial({ color: 0xcff6ff, roughness: 0.05, transparent: true, opacity: 0.45, depthWrite: false }));
      scaleG.add(m);
      bubbles.push({ m, ph: rnd(), x: (rnd() - 0.5) * 1.6, z: (rnd() - 0.5) * 1.2, s: 0.5 + rnd() });
    }
    const glow = new THREE.PointLight(STAGE === 1 ? 0x8ffcff : 0xc88aff, 0.5, 4);
    glow.position.set(0, HOVER + 0.3, 0.6);
    scaleG.add(glow);
    const ring = groundRing(STAGE === 1 ? 0x8ffcff : 0xb08aff, 0.8, 0.95);
    root.add(ring);

    const food = berry();
    food.visible = false;
    scaleG.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = ACT(s, "jump");
        const eat = ACT(s, "eat");
        const tk = ACT(s, "telekinesis");
        const pulse = ACT(s, "pulse");
        const ph = eat ? eatPhase(eat.p) : null;
        const mind = s.dying ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        let y = Math.sin(t * 1.3) * 0.08 * motion;
        let squeeze = 0;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) squeeze = Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.8) y += Math.sin(((p - 0.2) / 0.6) * Math.PI) * 0.7;
        }
        const swimC = Math.max(0, Math.sin(t * 1.3 + 1.2));
        squeeze = Math.max(squeeze, swimC * 0.3 * motion);
        let lift = 0;
        if (tk) lift = smooth(0, 0.2, tk.p) * (1 - smooth(0.82, 1, tk.p));
        let pp = 0;
        if (pulse) {
          const p = pulse.p;
          pp = smooth(0, 0.3, p) * (1 - smooth(0.4, 0.5, p));
          if (p > 0.4) pp = -smooth(0.4, 0.5, p) * (1 - smooth(0.7, 1, p));
        }
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        mantle.scale.set(1 - squeeze * 0.12 + Math.max(0, pp) * 0.1, 1 + squeeze * 0.15, 1 - squeeze * 0.12 + Math.max(0, pp) * 0.1);
        mantle.rotation.x = -0.15 + Math.sin(t * 1.3) * 0.08 * motion - lift * 0.2;
        mantle.rotation.z = Math.sin(t * 0.8) * 0.05 * motion;
        lobes.forEach((l, i) => {
          l.scale.set(0.8 + lift * 0.08, 0.85 + lift * 0.08, 1.15);
        });
        innerMat.emissiveIntensity = (0.45 + lift * 0.9 + Math.abs(pp) * 1.2 + Math.sin(t * 2) * 0.1) * mind;
        skinMat.emissiveIntensity = (0.2 + lift * 0.4 + Math.abs(pp) * 0.4) * mind;
        spots.forEach(sp => {
          const f = 0.5 + 0.5 * Math.sin(t * 3 + sp.ph);
          sp.m.scale.setScalar(0.6 + f * 0.6 + lift * 0.5);
        });
        spotMat.color.setHSL(STAGE === 1 ? 0.5 : 0.15, 1, 0.6 + lift * 0.15);
        if (third) {
          third.rotation.y = t * 1.5;
          third.scale.setScalar(1 + lift * 0.6 + Math.abs(pp) * 0.5);
        }
        headG.rotation.y = pointer.x * 0.2;
        headG.rotation.x = eat ? -0.2 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.08 : 0;

        tentacles.forEach(tn => {
          const ca = Math.cos(tn.a);
          const sa = Math.sin(tn.a);
          const curl = 0.5 + squeeze * 0.8 + (eat ? 0.6 : 0);
          const spread = 1 + Math.max(0, pp) * 0.6 - Math.min(0, pp) * -0.3 + lift * 0.25;
          for (let i = 0; i <= 5; i++) {
            const u = i / 5;
            const wave = Math.sin(t * 2.4 - u * 4 + tn.ph) * 0.12 * u * motion;
            const reach = u * TL * 0.55 * spread;
            const r = mantleR * 0.55 + reach;
            const down = u * TL * (0.85 - curl * 0.4 * u) - (lift ? Math.sin(u * Math.PI) * 0.2 * lift : 0);
            const ty = HOVER - mantleR * 0.25 - down + Math.sin(u * Math.PI * curl) * 0.15 * u;
            const tw = wave + Math.sin(t * 1.8 + tn.ph + u * 3) * 0.05 * u;
            tn.pts[i].set(ca * r - sa * tw, ty, sa * r + ca * tw);
          }
          tn.m.geometry.dispose();
          tn.m.geometry = taper(tn.pts, u => lerp(STAGE === 1 ? 0.075 : 0.095, 0.012, Math.pow(u, 0.8)), 0, 8, 20);
          const c = new THREE.CatmullRomCurve3(tn.pts);
          tn.suckers.forEach((sk, j) => {
            const u = 0.2 + j * 0.14;
            c.getPointAt(u, sk.position);
            sk.position.add(V3(-ca * 0.03, -0.02, -sa * 0.03));
            sk.rotation.set(Math.PI / 2, 0, tn.a);
            sk.scale.setScalar(1 - u * 0.6);
          });
          tn.strands.forEach(st => {
            const tip = tn.pts[5];
            const dir = tip.clone().sub(tn.pts[4]).normalize();
            for (let q = 0; q < 4; q++) {
              const f = q / 3;
              st.pts[q].copy(tip).addScaledVector(dir, f * 0.35).add(V3(Math.sin(t * 3 + st.j * 2 + tn.ph) * 0.08 * f, Math.cos(t * 2.5 + st.j) * 0.06 * f, 0));
              st.pts[q].x += (st.j - 1) * 0.06 * f;
            }
            st.m.geometry.dispose();
            st.m.geometry = taper(st.pts, 0.01, 0.003, 4, 8);
            st.m.material.opacity = (0.5 + lift * 0.4 + 0.2 * Math.sin(t * 4 + st.j)) * mind;
          });
        });

        orbiters.forEach(o => {
          const on = lift > 0.05;
          o.m.visible = on;
          if (!on) return;
          const a = o.a + t * 1.2;
          const rr = 1.0 + Math.sin(t * 1.5 + o.k) * 0.1;
          o.m.position.set(Math.cos(a) * rr, HOVER + 0.4 + lift * 0.6 + Math.sin(t * 2 + o.k * 1.3) * 0.2, Math.sin(a) * rr);
          o.m.rotation.set(t * 1.5 + o.k, t * 1.2, 0);
          o.m.scale.setScalar(lift);
        });
        auras.forEach((m, k) => {
          const on = Math.abs(pp) > 0.05 || lift > 0.3;
          m.visible = on;
          if (!on) return;
          const u = (((t * 0.8 + k / 3) % 1) + 1) % 1;
          m.position.y = mantle.position.y;
          m.rotation.x = Math.PI / 2;
          m.scale.setScalar(0.8 + u * (1.5 + Math.abs(pp) * 1.5));
          m.material.opacity = (1 - u) * (0.3 + Math.abs(pp) * 0.5) * mind;
        });
        bubbles.forEach(b => {
          const u = (((t * 0.2 * b.s + b.ph) % 1) + 1) % 1;
          b.m.position.set(b.x + Math.sin(t + b.ph * 6) * 0.05, 0.1 + u * 2.6, b.z);
          b.m.scale.setScalar(Math.max(0.01, Math.sin(u * Math.PI)) * b.s);
        });
        glow.intensity = (0.4 + lift * 1.2 + Math.abs(pp) * 1.5) * mind;
        ring.scale.setScalar(1 + Math.abs(pp) * 0.6 + lift * 0.2 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = 0.14 + Math.abs(pp) * 0.3 + lift * 0.15;

        eyes.forEach(({ g }) => {
          g.scale.y = lift > 0.4 ? 0.55 : eat && eat.p > 0.3 ? 0.45 : blink;
        });
        followPupils(eyes, pointer, 0.5);

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, HOVER - mantleR * 0.3, ph.fall * ph.fall), mantleR * 0.75);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.6);
        } else food.visible = false;
      }
    };
  }
});
