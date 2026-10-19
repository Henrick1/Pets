Pets.register({
  id: "orantis",
  dex: 18,
  name: "Orantis",
  color: "#8fd36a",
  types: ["fighting"],
  description: "Um jovem louva-a-deus que treina em silêncio, com os braços enfaixados juntos como em oração. Passa horas imóvel e, quando ataca, é mais rápido do que os olhos conseguem acompanhar.",
  evolvesTo: "mantrador",
  evolveLevel: 10,
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    strike: { duration: 1.6 },
    meditate: { duration: 3.4 }
  },
  idle: [
    { action: "meditate", min: 25, max: 50 },
    { action: "strike", min: 30, max: 60 }
  ],
  clickAction: n => ["strike", "meditate", "jump", "strike"][(n - 1) % 4],

  create({ THREE, kit }) {
    const STAGE = 1;
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
    scaleG.scale.setScalar(STAGE === 1 ? 1.2 : 1.45);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);

    const C_MAIN = STAGE === 1 ? 0x8fd36a : 0x2fae76;
    const C_DARK = STAGE === 1 ? 0x5fa64a : 0x1d7a52;
    const C_BELLY = STAGE === 1 ? 0xd6f2a4 : 0x9fe0b8;
    const skin = M(C_MAIN, 0.45, 0.05);
    const skinDark = M(C_DARK, 0.5, 0.05);
    const belly = M(C_BELLY, 0.55);
    const wrap = M(0xf2e8d0, 0.85);
    const bladeMat = M(STAGE === 1 ? 0xb8e88e : 0x6fe0a6, 0.3, 0.1);

    const abdomen = mesh(new THREE.SphereGeometry(1, 32, 24), skin);
    abdomen.scale.set(0.26, 0.22, STAGE === 1 ? 0.5 : 0.62);
    abdomen.position.set(0, 0.66, -0.58);
    abdomen.rotation.x = 0.28;
    bodyG.add(abdomen);
    for (let k = 0; k < 5; k++) {
      const z = -0.25 - k * (STAGE === 1 ? 0.15 : 0.19);
      const f = Math.sqrt(Math.max(0, 1 - Math.pow((z + 0.58) / (STAGE === 1 ? 0.5 : 0.62), 2)));
      const ring = mesh(new THREE.TorusGeometry(1, 0.06, 6, 24), skinDark, false);
      ring.scale.set(0.26 * f, 0.22 * f, 0.4);
      ring.position.set(0, 0.66 + (z + 0.58) * -0.28, z);
      ring.rotation.x = 0.28;
      bodyG.add(ring);
    }
    const bellyStrip = mesh(new THREE.SphereGeometry(1, 24, 16), belly, false);
    bellyStrip.scale.set(0.18, 0.12, STAGE === 1 ? 0.42 : 0.52);
    bellyStrip.position.set(0, 0.52, -0.56);
    bellyStrip.rotation.x = 0.28;
    bodyG.add(bellyStrip);

    const thorax = mesh(taper([V3(0, 0.68, -0.08), V3(0, 1.05, 0.0), V3(0, 1.45, 0.14), V3(0, 1.62, 0.22)], u => lerp(0.14, 0.09, u) * (1 + 0.15 * Math.sin(u * Math.PI)), 0, 12, 24), skin);
    bodyG.add(thorax);
    const chest = mesh(new THREE.SphereGeometry(1, 20, 14), belly, false);
    chest.scale.set(0.1, 0.22, 0.06);
    chest.position.set(0, 1.18, 0.1);
    chest.rotation.x = -0.2;
    bodyG.add(chest);

    const head = new THREE.Group();
    head.position.set(0, 1.72, 0.26);
    bodyG.add(head);
    const skull = mesh(new THREE.SphereGeometry(1, 28, 20), skin);
    skull.scale.set(0.27, 0.19, 0.17);
    head.add(skull);
    const jaw = mesh(new THREE.ConeGeometry(0.12, 0.22, 16), skin);
    jaw.rotation.x = Math.PI;
    jaw.position.set(0, -0.15, 0.03);
    jaw.scale.set(1, 1, 0.7);
    head.add(jaw);
    const mandibles = [-1, 1].map(s => {
      const m = mesh(new THREE.ConeGeometry(0.025, 0.08, 8), skinDark, false);
      m.position.set(0.035 * s, -0.27, 0.06);
      m.rotation.set(Math.PI + 0.3, 0, 0.3 * s);
      head.add(m);
      return m;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: STAGE === 1 ? 0.78 : 0.62, whiteColor: STAGE === 1 ? 0xf4ffe6 : 0xfff2b0, pupilColor: 0x10200f });
      e.g.position.set(0.21 * s, 0.05, 0.04);
      e.g.rotation.set(0, 0.55 * s, 0);
      head.add(e.g);
      if (STAGE === 2) {
        const brow = mesh(new THREE.BoxGeometry(0.14, 0.03, 0.05), skinDark, false);
        brow.position.set(0.17 * s, 0.17, 0.1);
        brow.rotation.set(0, 0.5 * s, 0.4 * s);
        head.add(brow);
      }
      return e;
    });
    const antennae = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.06 * s, 0.13, 0.05);
      g.add(mesh(taper([V3(0, 0, 0), V3(0.08 * s, 0.25, -0.05), V3(0.22 * s, 0.42, -0.22), V3(0.36 * s, 0.48, -0.42)], 0.012, 0.004, 5, 16), skinDark, false));
      head.add(g);
      return { g, s };
    });
    if (STAGE === 2) {
      const leafShape = new THREE.Shape();
      leafShape.moveTo(0, 0);
      leafShape.quadraticCurveTo(0.12, 0.12, 0, 0.36);
      leafShape.quadraticCurveTo(-0.12, 0.12, 0, 0);
      const crest = mesh(new THREE.ExtrudeGeometry(leafShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2 }), M(0x7fe08a, 0.4), false);
      crest.position.set(0, 0.14, -0.05);
      crest.rotation.x = -0.6;
      head.add(crest);
    }

    const sickle = new THREE.Shape();
    sickle.moveTo(0, 0);
    sickle.quadraticCurveTo(0.09, 0.18, 0.05, 0.42);
    sickle.quadraticCurveTo(0.02, 0.5, -0.03, 0.52);
    sickle.quadraticCurveTo(0.0, 0.3, -0.04, 0.05);
    sickle.lineTo(0, 0);
    const sickleGeo = new THREE.ExtrudeGeometry(sickle, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    sickleGeo.translate(0, 0, -0.015);
    sickleGeo.rotateY(Math.PI / 2);
    const BL = STAGE === 1 ? 1 : 1.3;
    const arms = [-1, 1].map(s => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.17 * s, 1.4, 0.2);
      bodyG.add(shoulder);
      const upperEnd = V3(0.04 * s, -0.3 * BL, 0.2 * BL);
      shoulder.add(mesh(taper([V3(0, 0, 0), V3(0.03 * s, -0.15 * BL, 0.12 * BL), upperEnd], 0.06, 0.05, 10, 12), skin));
      [0.3, 0.55, 0.8].forEach(f => {
        const b = mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 16), wrap, false);
        b.position.copy(upperEnd).multiplyScalar(f);
        b.lookAt(upperEnd.clone().multiplyScalar(2));
        shoulder.add(b);
      });
      const elbow = new THREE.Group();
      elbow.position.copy(upperEnd);
      shoulder.add(elbow);
      elbow.add(mesh(new THREE.SphereGeometry(0.06, 14, 10), skinDark, false));
      const foreEnd = V3(0, 0.3 * BL, 0.06 * BL);
      elbow.add(mesh(taper([V3(0, 0, 0), V3(0, 0.15 * BL, 0.04 * BL), foreEnd], 0.05, 0.035, 10, 12), skin));
      [0.35, 0.65].forEach(f => {
        const b = mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 16), wrap, false);
        b.position.copy(foreEnd).multiplyScalar(f);
        b.rotation.x = Math.PI / 2;
        elbow.add(b);
      });
      const blade = mesh(sickleGeo, bladeMat, false);
      blade.scale.setScalar(BL * (STAGE === 1 ? 0.75 : 0.95));
      blade.position.set(0, 0.05 * BL, 0.06);
      blade.rotation.x = 0.15;
      elbow.add(blade);
      for (let k = 0; k < 4; k++) {
        const sp = mesh(new THREE.ConeGeometry(0.014, 0.06, 6), skinDark, false);
        sp.position.set(0, (0.06 + k * 0.06) * BL, 0.05);
        sp.rotation.x = 1.0;
        elbow.add(sp);
      }
      let tail = null;
      if (STAGE === 2) {
        tail = { pts: [V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0)], m: mesh(new THREE.BufferGeometry(), wrap, false) };
        tail.m.frustumCulled = false;
        elbow.add(tail.m);
      }
      return { shoulder, elbow, s, tail, foreEnd };
    });

    const legs = [];
    [[0.0, 0.9], [-0.22, -0.7]].forEach(([z, dir]) => {
      [-1, 1].forEach(s => {
        const g = new THREE.Group();
        g.position.set(0.1 * s, 0.72, z);
        g.add(mesh(taper([V3(0, 0, 0), V3(0.32 * s, 0.26, 0.12 * dir), V3(0.5 * s, -0.7, 0.3 * dir)], u => (u < 0.5 ? 0.06 : 0.042) * (1 - u * 0.35), 0, 8, 16), skin));
        const knee = mesh(new THREE.SphereGeometry(0.04, 10, 8), skinDark, false);
        knee.position.set(0.32 * s, 0.26, 0.12 * dir);
        g.add(knee);
        bodyG.add(g);
        legs.push({ g, s, z });
      });
    });

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.quadraticCurveTo(0.2, -0.1, 0.18, -0.6);
    wingShape.quadraticCurveTo(0.12, -0.95, 0.0, -1.0);
    wingShape.quadraticCurveTo(-0.06, -0.5, 0, 0);
    const wingGeo = new THREE.ShapeGeometry(wingShape, 16);
    const wingMat = new THREE.MeshStandardMaterial({ color: STAGE === 1 ? 0xa8e07e : 0x3fcf8a, roughness: 0.4, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
    const WL = STAGE === 1 ? 0.62 : 1.0;
    const wings = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.03 * s, 0.9, -0.12);
      const w = new THREE.Mesh(wingGeo, wingMat);
      w.scale.set(s * (STAGE === 1 ? 0.9 : 1.15), WL, 1);
      w.rotation.x = -Math.PI / 2 + 0.25;
      g.add(w);
      for (let k = 0; k < 3; k++) {
        const vein = mesh(taper([V3(0, 0, 0), V3(0.06 * s * (k + 1) * 0.6, -0.45 * WL, 0), V3(0.05 * s * k * 0.5, -0.85 * WL, 0)], 0.007, 0.003, 4, 10), skinDark, false);
        vein.rotation.x = -Math.PI / 2 + 0.25;
        vein.position.z = 0.002;
        g.add(vein);
      }
      bodyG.add(g);
      return { g, s };
    });

    const slashMat = new THREE.MeshBasicMaterial({ color: STAGE === 1 ? 0xeaffd6 : 0xbfffe0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const slashes = [-1, 1].map(s => {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.62, 40, 1, 0, Math.PI * 0.8), slashMat.clone());
      m.position.set(0, 1.25, 0.6);
      m.rotation.set(0, 0, s > 0 ? -0.4 : Math.PI + 0.4);
      m.visible = false;
      bodyG.add(m);
      return { m, s };
    });
    const leafMat = new THREE.MeshBasicMaterial({ color: STAGE === 1 ? 0xc8f59a : 0x8fffb8, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const leafG = new THREE.ShapeGeometry((() => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.quadraticCurveTo(0.05, 0.05, 0, 0.13);
      sh.quadraticCurveTo(-0.05, 0.05, 0, 0);
      return sh;
    })());
    const leaves = [];
    for (let k = 0; k < (STAGE === 1 ? 5 : 9); k++) {
      const m = new THREE.Mesh(leafG, leafMat);
      m.visible = false;
      scaleG.add(m);
      leaves.push({ m, k, a: (k / 9) * Math.PI * 2 });
    }
    const ring = groundRing(STAGE === 1 ? 0xb8e88e : 0x5fe0a0, 0.7, 0.85);
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
        const strike = ACT(s, "strike");
        const med = ACT(s, "meditate");
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.012 * motion;
        let airborne = false;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.15 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.9;
            airborne = true;
          } else sy = 1 - 0.12 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
        }
        let wind = 0;
        let cut = 0;
        if (strike) {
          const p = strike.p;
          wind = smooth(0, 0.3, p) * (1 - smooth(0.3, 0.38, p));
          cut = smooth(0.3, 0.38, p) * (1 - smooth(0.62, 0.9, p));
        }
        let calm = 0;
        if (med) calm = smooth(0, 0.2, med.p) * (1 - smooth(0.82, 1, med.p));
        y += calm * (0.18 + Math.sin(t * 2) * 0.04);
        const sx = 1 / Math.sqrt(sy);
        bodyG.scale.set(sx, sy, sx);
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        bodyG.rotation.y = Math.sin(t * 0.8) * 0.06 * motion * (1 - calm);
        bodyG.rotation.x = -wind * 0.15 + cut * 0.2;

        head.rotation.y = Math.sin(t * 0.6) * 0.25 * motion * (1 - calm) + pointer.x * 0.15;
        head.rotation.z = Math.sin(t * 0.45) * 0.12 * motion;
        head.rotation.x = eat ? -0.3 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.1 : calm * 0.2;
        mandibles.forEach((m, i) => {
          m.rotation.z = (i ? 1 : -1) * (0.3 + (eat ? ph.chew * 0.5 : 0));
        });
        antennae.forEach(({ g, s: sd }, i) => {
          g.rotation.z = sd * Math.sin(t * 2.2 + i) * 0.15 * motion;
          g.rotation.x = Math.sin(t * 1.7 + i * 2) * 0.12 * motion;
        });

        arms.forEach(({ shoulder, elbow, s: sd, tail, foreEnd }) => {
          let sh = -0.1 + Math.sin(t * 1.5 + sd) * 0.04 * motion;
          let el = -0.2;
          if (strike) {
            sh += wind * 0.9 - cut * 1.5;
            el += wind * -0.6 + cut * 1.4;
          }
          if (calm) {
            sh = lerp(sh, -0.35, calm);
            el = lerp(el, -0.6, calm);
          }
          if (airborne) {
            sh = -0.9;
            el = 0.8;
          }
          if (eat) {
            sh = -0.4 * (1 - ph.fall) - 0.2;
            el = 0.2;
          }
          shoulder.rotation.x = sh;
          shoulder.rotation.z = sd * (0.42 - calm * 0.2 + cut * -0.3);
          elbow.rotation.x = el;
          if (tail) {
            const tip = foreEnd.clone().multiplyScalar(0.85);
            tail.pts[0].copy(tip);
            for (let k = 1; k < 4; k++) {
              const f = k / 3;
              tail.pts[k].set(tip.x + sd * 0.05 * f + Math.sin(t * 4 + k + sd) * 0.05 * f, tip.y - 0.12 * f - cut * 0.1, tip.z - 0.25 * f - Math.sin(t * 3 + k) * 0.06 * f);
            }
            tail.m.geometry.dispose();
            tail.m.geometry = taper(tail.pts, 0.03, 0.012, 6, 12);
          }
        });

        legs.forEach(({ g, s: sd, z }, i) => {
          g.rotation.z = sd * (airborne ? 0.4 : calm * 0.5);
          g.rotation.x = Math.sin(t * 3 + i) * 0.03 * motion;
        });
        wings.forEach(({ g, s: sd }) => {
          const flare = cut * 0.6 + calm * 0.35 + (airborne ? 0.9 : 0);
          g.rotation.y = sd * flare * 0.8;
          g.rotation.z = sd * flare * 0.25 + Math.sin(t * 30) * 0.08 * (airborne ? 1 : 0);
        });

        slashes.forEach(({ m }, i) => {
          const on = cut > 0.05;
          m.visible = on;
          if (!on) return;
          m.material.opacity = cut * 0.8;
          m.scale.setScalar(0.8 + (1 - cut) * 0.8 + i * 0.1);
        });
        leaves.forEach(lf => {
          const on = calm > 0.1;
          lf.m.visible = on;
          if (!on) return;
          const a = lf.a + t * 0.9;
          const r = 0.8 + Math.sin(t * 1.3 + lf.k) * 0.08;
          lf.m.position.set(Math.cos(a) * r, 0.9 + Math.sin(t * 1.5 + lf.k * 1.7) * 0.3 + y / 1.05, Math.sin(a) * r);
          lf.m.rotation.set(t + lf.k, a, 0.5);
          lf.m.scale.setScalar(calm * (STAGE === 1 ? 1 : 1.3));
        });
        ring.scale.setScalar(1 + calm * 0.4 + cut * 0.3 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = 0.14 + calm * 0.25 + cut * 0.2;

        eyes.forEach(({ g }) => {
          g.scale.y = calm > 0.4 ? 0.12 : wind > 0.3 ? 0.55 : eat && eat.p > 0.3 ? 0.5 : blink;
        });
        followPupils(eyes, pointer, 0.5);

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(2.4, 1.52, ph.fall * ph.fall), 0.42);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;
      }
    };
  }
});
