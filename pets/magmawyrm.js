Pets.register({
  id: "magmawyrm",
  dex: 28,
  name: "Magmawyrm",
  color: "#ff6a1a",
  types: ["dragon",  "fire"],
  description: "Um wyvern colossal com asas de membrana incandescente. Antes do sopro, as placas do peito se abrem e revelam um núcleo de magma que brilha como um pequeno sol.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    flap: { duration: 2.8 },
    breath: { duration: 2.8 }
  },
  idle: [
    { action: "breath", min: 25, max: 50 },
    { action: "flap", min: 35, max: 70 }
  ],
  clickAction: n => ["breath", "flap", "jump", "breath"][(n - 1) % 4],

  create({ THREE, kit }) {
    const STAGE = 3;
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
    scaleG.scale.setScalar([0, 1.25, 1.15, 1.1][STAGE]);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);

    const lavaTex = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#fff";
      g.lineCap = "round";
      for (let i = 0; i < (STAGE === 1 ? 10 : STAGE === 2 ? 16 : 24); i++) {
        g.lineWidth = 1.5 + rnd() * 2.5;
        g.beginPath();
        let x = rnd() * w;
        let y = rnd() * h;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          x += (rnd() - 0.5) * 50;
          y += (rnd() - 0.5) * 50;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    });
    const obsidian = new THREE.MeshStandardMaterial({ color: 0x15121a, roughness: 0.12, metalness: 0.35, emissive: 0xff5a10, emissiveIntensity: 1.0, emissiveMap: lavaTex });
    const obsidianPlain = new THREE.MeshStandardMaterial({ color: 0x1d1a24, roughness: 0.1, metalness: 0.4 });
    const membrane = new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff4a00, emissiveIntensity: 0.55, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const hornM = new THREE.MeshStandardMaterial({ color: 0x2a2530, roughness: 0.15, metalness: 0.5 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffb040 });

    const BODY_Y = [0, 0.62, 0.95, 1.15][STAGE];
    const BL = [0, 0.48, 0.62, 0.72][STAGE];
    const torso = mesh(taper([V3(0, BODY_Y + 0.05, -BL), V3(0, BODY_Y, -BL * 0.2), V3(0, BODY_Y + 0.12, BL * 0.45), V3(0, BODY_Y + 0.35, BL * 0.85)], u => [0, 0.34, 0.38, 0.42][STAGE] * (0.7 + 0.45 * Math.sin(u * Math.PI)), 0, 20, 24), obsidian);
    bodyG.add(torso);
    const bellyPlates = [];
    for (let k = 0; k < 6; k++) {
      const pl = mesh(new THREE.BoxGeometry(0.22, 0.04, 0.12), obsidianPlain, false);
      const f = k / 5;
      pl.position.set(0, BODY_Y - [0, 0.26, 0.3, 0.33][STAGE] + f * 0.05, lerp(-BL * 0.6, BL * 0.55, f));
      pl.rotation.x = -0.1 + f * 0.3;
      pl.scale.x = 1 - Math.abs(f - 0.45) * 0.8;
      bodyG.add(pl);
      bellyPlates.push(pl);
    }

    let chestPlates = [];
    let core = null;
    if (STAGE === 3) {
      core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), coreMat);
      core.position.set(0, BODY_Y + 0.18, BL * 0.55);
      bodyG.add(core);
      chestPlates = [-1, 1].map(s => {
        const g = new THREE.Group();
        g.position.set(0.03 * s, BODY_Y + 0.18, BL * 0.62);
        const p = mesh(new THREE.SphereGeometry(0.26, 18, 14, s > 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI), obsidian, false);
        p.scale.set(0.8, 1.2, 0.6);
        g.add(p);
        bodyG.add(g);
        return { g, s };
      });
    }

    const neckBase = V3(0, BODY_Y + 0.3, BL * 0.8);
    const headPos = [0, V3(0, 0.95, 0.62), V3(0, 1.75, 0.92), V3(0, 2.2, 1.05)][STAGE];
    const neck = mesh(new THREE.BufferGeometry(), obsidian);
    neck.frustumCulled = false;
    bodyG.add(neck);
    const head = new THREE.Group();
    bodyG.add(head);
    const HS = [0, 1.25, 1.05, 1.15][STAGE];
    head.scale.setScalar(HS);
    const skull = mesh(new THREE.SphereGeometry(1, 30, 22), obsidian);
    skull.scale.set(0.22, 0.19, 0.25);
    head.add(skull);
    const snout = mesh(taper([V3(0, -0.02, 0.1), V3(0, -0.04, 0.28), V3(0, -0.06, 0.4)], u => lerp(0.15, 0.08, u), 0, 14, 10), obsidian);
    snout.scale.set(1, 0.75, 1);
    head.add(snout);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.08, 0.05);
    head.add(jaw);
    jaw.add(mesh(taper([V3(0, -0.02, 0), V3(0, -0.04, 0.2), V3(0, -0.05, 0.33)], u => lerp(0.11, 0.06, u), 0, 12, 10), obsidianPlain));
    const mouthGlow = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), coreMat);
    mouthGlow.position.set(0, -0.06, 0.2);
    mouthGlow.scale.set(1, 0.4, 2);
    head.add(mouthGlow);
    [-1, 1].forEach(s => {
      for (let k = 0; k < 3; k++) {
        const tooth = mesh(new THREE.ConeGeometry(0.012, 0.05, 6), M(0xfff2d8, 0.3), false);
        tooth.position.set(0.05 * s, -0.08, 0.2 + k * 0.07);
        tooth.rotation.x = Math.PI;
        head.add(tooth);
      }
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: STAGE === 1 ? 0.5 : 0.4, whiteColor: 0xffc04a, pupilColor: 0x1a0800 });
      e.pupil.scale.set(STAGE === 1 ? 0.8 : 0.35, 1.2, 0.5);
      e.g.children[0].material = new THREE.MeshBasicMaterial({ color: 0xffb030 });
      e.g.position.set(0.14 * s, 0.06, 0.16);
      e.g.rotation.y = 0.5 * s;
      head.add(e.g);
      if (STAGE >= 2) {
        const ridge = mesh(new THREE.ConeGeometry(0.035, 0.16, 6), hornM, false);
        ridge.position.set(0.13 * s, 0.13, 0.13);
        ridge.rotation.set(-1.2, 0, -0.5 * s);
        head.add(ridge);
      }
      return e;
    });
    const NH = [0, 2, 2, 4][STAGE];
    for (let k = 0; k < NH; k++) {
      const s = k % 2 ? 1 : -1;
      const big = k < 2;
      const len = big ? [0, 0.12, 0.32, 0.5][STAGE] : 0.28;
      const h = mesh(taper([V3(0, 0, 0), V3(0.05 * s, len * 0.4, -len * 0.5), V3(0.1 * s, len * 0.55, -len)], u => (big ? 0.05 : 0.035) * (1 - u) + 0.005, 0, 8, 10), hornM, false);
      h.position.set((big ? 0.11 : 0.18) * s, big ? 0.14 : 0.04, big ? -0.05 : -0.1);
      head.add(h);
    }

    const wingShape = (span, depth) => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(span * 0.45, depth * 0.35);
      sh.lineTo(span, depth * 0.1);
      sh.quadraticCurveTo(span * 0.82, -depth * 0.35, span * 0.75, -depth * 0.7);
      sh.quadraticCurveTo(span * 0.62, -depth * 0.45, span * 0.5, -depth * 0.85);
      sh.quadraticCurveTo(span * 0.38, -depth * 0.5, span * 0.25, -depth * 0.9);
      sh.quadraticCurveTo(span * 0.12, -depth * 0.45, 0, -depth * 0.55);
      sh.lineTo(0, 0);
      return sh;
    };
    const SPAN = [0, 0.55, 1.35, 1.9][STAGE];
    const DEPTH = [0, 0.5, 0.95, 1.2][STAGE];
    const wings = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.22 * s, BODY_Y + 0.3, BL * 0.25);
      const geo = new THREE.ShapeGeometry(wingShape(SPAN, DEPTH), 12);
      const m = new THREE.Mesh(geo, membrane);
      m.scale.x = s;
      m.rotation.x = -Math.PI / 2;
      g.add(m);
      const bones = [[0, 0, SPAN * 0.45, DEPTH * 0.35], [SPAN * 0.45, DEPTH * 0.35, SPAN, DEPTH * 0.1], [SPAN * 0.45, DEPTH * 0.35, SPAN * 0.75, -DEPTH * 0.7], [SPAN * 0.45, DEPTH * 0.35, SPAN * 0.5, -DEPTH * 0.85], [SPAN * 0.45, DEPTH * 0.35, SPAN * 0.25, -DEPTH * 0.9]];
      bones.forEach(([x0, y0, x1, y1], k) => {
        const b = mesh(taper([V3(x0 * s, 0.01, -y0), V3(x1 * s, 0.01, -y1)], k < 2 ? 0.035 : 0.018, k < 2 ? 0.028 : 0.008, 6, 4), obsidianPlain, false);
        g.add(b);
      });
      const claw = mesh(new THREE.ConeGeometry(0.03, 0.12, 6), hornM, false);
      claw.position.set(SPAN * 0.45 * s, 0.05, -DEPTH * 0.35);
      claw.rotation.x = -0.6;
      g.add(claw);
      bodyG.add(g);
      return { g, s };
    });

    const tailPts = [];
    for (let k = 0; k < 6; k++) tailPts.push(V3(0, 0, 0));
    const tail = mesh(new THREE.BufferGeometry(), obsidian);
    tail.frustumCulled = false;
    bodyG.add(tail);
    const tailTip = mesh(new THREE.ConeGeometry(0.08, 0.22, 4), hornM, false);
    bodyG.add(tailTip);
    const TAILL = [0, 0.8, 1.3, 1.7][STAGE];

    const legs = [];
    [[0.32, 1], [-0.38, -1]].forEach(([zf, front]) => {
      if (STAGE === 3 && front > 0) return;
      [-1, 1].forEach(s => {
        const g = new THREE.Group();
        g.position.set(0.22 * s, BODY_Y - 0.1, zf * BL / 0.5);
        const LL = BODY_Y - 0.08;
        g.add(mesh(taper([V3(0, 0, 0), V3(0.06 * s, -LL * 0.45, 0.1), V3(0.04 * s, -LL * 0.8, -0.05), V3(0.04 * s, -LL, 0.05)], u => lerp(0.11, 0.05, u) * [0, 1, 1.15, 1.35][STAGE], 0, 10, 16), obsidian));
        for (let k = -1; k <= 1; k++) {
          const c = mesh(new THREE.ConeGeometry(0.022, 0.1, 6), hornM, false);
          c.position.set(0.04 * s + k * 0.04, -LL + 0.02, 0.12);
          c.rotation.x = Math.PI / 2 + 0.4;
          g.add(c);
        }
        bodyG.add(g);
        legs.push({ g, s, front: front > 0 });
      });
    });
    const spines = [];
    for (let k = 0; k < (STAGE === 1 ? 4 : 8); k++) {
      const sp = mesh(new THREE.ConeGeometry(0.04, 0.12 + STAGE * 0.03, 4), hornM, false);
      bodyG.add(sp);
      spines.push(sp);
    }

    let shell = null;
    if (STAGE === 1) {
      shell = new THREE.Group();
      [[0.35, 0.12, -0.3], [-0.38, 0.08, -0.25], [0.2, 0.06, 0.38]].forEach(([x, y, z], k) => {
        const piece = mesh(new THREE.SphereGeometry(0.16, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: 0x1a1620, roughness: 0.05, metalness: 0.5, emissive: 0xff5a10, emissiveIntensity: 0.4, emissiveMap: lavaTex, side: THREE.DoubleSide }), false);
        piece.position.set(x, y, z);
        piece.rotation.set(0.4 + k, k * 1.3, Math.PI);
        shell.add(piece);
      });
      scaleG.add(shell);
    }

    const fireMats = [0xffe680, 0xffa030, 0xff5a10].map(c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, depthWrite: false }));
    const flames = [];
    for (let k = 0; k < 22; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), fireMats[k % 3]);
      m.visible = false;
      scaleG.add(m);
      flames.push({ m, k, ph: k / 22, jx: rnd() - 0.5, jy: rnd() - 0.5 });
    }
    const embers = [];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.03, 0), fireMats[k % 3]);
      scaleG.add(m);
      embers.push({ m, ph: k / 10, a: rnd() * Math.PI * 2, r: 0.4 + rnd() * 0.6 });
    }
    const glow = new THREE.PointLight(0xff7a20, 0.6, 5);
    glow.position.set(0, BODY_Y, 0.4);
    scaleG.add(glow);
    const ring = groundRing(0xff6a1a, 1.0, 1.2);
    root.add(ring);

    const food = berry();
    food.visible = false;
    scaleG.add(food);

    const tmp = V3(0, 0, 0);
    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = ACT(s, "jump");
        const eat = ACT(s, "eat");
        const breath = ACT(s, "breath");
        const flapA = ACT(s, "flap");
        const ph = eat ? eatPhase(eat.p) : null;
        const heat = s.dying ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        let y = 0;
        let spread = 0.08;
        let flap = 0;
        let airborne = false;
        let inhale = 0;
        let blast = 0;
        if (jump) {
          const p = jump.p;
          if (p > 0.2 && p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.7;
            airborne = true;
            spread = Math.max(spread, Math.sin(q * Math.PI));
            flap = spread * 0.6;
          }
        }
        if (flapA) {
          const k = smooth(0, 0.15, flapA.p) * (1 - smooth(0.85, 1, flapA.p));
          spread = Math.max(spread, k);
          flap = k;
          y = k * (STAGE === 1 ? 0.35 : 0.8 + Math.sin(t * 3) * 0.08);
          airborne = y > 0.05;
        }
        if (breath) {
          const p = breath.p;
          inhale = smooth(0, 0.35, p) * (1 - smooth(0.35, 0.42, p));
          blast = smooth(0.38, 0.45, p) * (1 - smooth(0.78, 0.95, p));
          spread = Math.max(spread, (inhale + blast) * 0.7);
        }
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        bodyG.rotation.x = airborne ? -0.15 : -inhale * 0.12 + blast * 0.08;
        bodyG.scale.set(1 + inhale * 0.06, 1 + inhale * 0.06, 1);

        const headTarget = tmp.copy(headPos);
        headTarget.y += Math.sin(t * 1.4) * 0.03 * motion - inhale * 0.15 + blast * 0.05;
        headTarget.z += -inhale * 0.15 + blast * 0.12;
        if (eat) headTarget.y -= 0.25 * (1 - ph.fall) * (eat.p < 0.3 ? 1 : 0.3);
        const mid = neckBase.clone().lerp(headTarget, 0.5);
        mid.z += 0.12;
        neck.geometry.dispose();
        neck.geometry = taper([neckBase, mid, headTarget.clone().add(V3(0, -0.03, -0.12))], u => lerp([0, 0.2, 0.2, 0.22][STAGE], [0, 0.16, 0.13, 0.14][STAGE], u), 0, 12, 12);
        head.position.copy(headTarget);
        head.rotation.x = 0.15 - inhale * 0.35 + blast * 0.25 + (eat ? -0.4 * (1 - ph.fall) : 0);
        head.rotation.y = Math.sin(t * 0.6) * 0.25 * motion * (1 - blast) + pointer.x * 0.15;
        jaw.rotation.x = Math.max(blast * 0.7, eat && eat.p > 0.12 && eat.p < 0.85 ? 0.2 + ph.chew * 0.35 : 0, airborne && flapA ? 0.2 : 0);
        mouthGlow.scale.set(1 + inhale, 0.4 + inhale * 0.8, 2);
        coreMat.color.setHSL(0.09, 1, 0.55 + inhale * 0.2 + blast * 0.15);

        wings.forEach(({ g, s: sd }) => {
          const fa = Math.sin(t * (STAGE === 1 ? 14 : 7)) * 0.55 * flap;
          g.rotation.z = sd * (-(1 - spread) * 1.1 + fa + 0.15);
          g.rotation.y = sd * (1 - spread) * 1.15;
          g.scale.setScalar(0.35 + spread * 0.65);
        });
        const tailBase = V3(0, BODY_Y + 0.05, -BL * 0.95);
        for (let k = 0; k < 6; k++) {
          const f = k / 5;
          tailPts[k].set(Math.sin(t * 1.6 - k * 0.7) * 0.18 * f * motion, tailBase.y - f * (BODY_Y - 0.2) * (airborne ? 0.3 : 1) + Math.sin(f * Math.PI) * 0.12, tailBase.z - f * TAILL);
        }
        tail.geometry.dispose();
        tail.geometry = taper(tailPts, u => lerp([0, 0.2, 0.22, 0.24][STAGE], 0.04, u), 0, 12, 20);
        tailTip.position.copy(tailPts[5]).add(V3(0, 0, -0.08));
        tailTip.rotation.x = -Math.PI / 2;
        spines.forEach((sp, k) => {
          const f = k / (spines.length - 1);
          if (f < 0.55) {
            const u = f / 0.55;
            sp.position.set(0, BODY_Y + [0, 0.32, 0.38, 0.42][STAGE] * (0.75 + 0.4 * Math.sin(lerp(0.2, 0.8, u) * Math.PI)), lerp(BL * 0.6, -BL * 0.8, u));
            sp.rotation.x = -0.3;
          } else {
            const u = (f - 0.55) / 0.45;
            const p = tailPts[Math.min(5, Math.round(u * 4) + 1)];
            sp.position.set(p.x, p.y + 0.14 * (1 - u * 0.5), p.z);
            sp.rotation.x = -0.6;
          }
          sp.scale.setScalar(1 - f * 0.4);
        });
        legs.forEach(({ g, s: sd, front }, i) => {
          g.rotation.x = airborne ? (front ? -0.6 : 0.6) : Math.sin(t * 2 + i) * 0.02 * motion;
        });
        chestPlates.forEach(({ g, s: sd }) => {
          g.rotation.y = sd * (inhale * 0.9 + blast * 0.5);
        });
        if (core) core.scale.setScalar(0.6 + inhale * 0.8 + blast * 0.4 + Math.sin(t * 4) * 0.05);
        obsidian.emissiveIntensity = (0.75 + Math.sin(t * 2.2) * 0.15 + inhale * 1.2 + blast * 0.8) * heat;
        membrane.emissiveIntensity = (0.45 + inhale * 0.6 + blast * 0.5) * heat;

        if (shell) {
          shell.children.forEach((p, k) => {
            p.position.y = 0.1 + Math.abs(Math.sin(t * 0.8 + k)) * 0.01;
          });
        }

        const mouthW = V3(0, -0.06, 0.45).multiplyScalar(HS).applyEuler(head.rotation).add(head.position);
        const fdir = V3(0, -0.15, 1).normalize().applyEuler(head.rotation);
        flames.forEach(fl => {
          const on = blast > 0.05;
          fl.m.visible = on;
          if (!on) return;
          const u = (((t * 2.4 + fl.ph) % 1) + 1) % 1;
          const d = u * [0, 1.0, 1.6, 2.2][STAGE] * blast;
          fl.m.position.copy(mouthW).addScaledVector(fdir, d);
          fl.m.position.x += fl.jx * d * 0.5;
          fl.m.position.y += fl.jy * d * 0.4 + u * u * 0.3;
          fl.m.scale.setScalar((0.5 + u * 2.2) * [0, 0.6, 1, 1.4][STAGE] * (1 - u * 0.5));
          fl.m.material.opacity = 0.9 * (1 - u);
        });
        embers.forEach(e => {
          const u = (((t * 0.3 + e.ph) % 1) + 1) % 1;
          const a = e.a + t * 0.4;
          e.m.position.set(Math.cos(a) * e.r, 0.2 + u * 1.6, Math.sin(a) * e.r);
          e.m.scale.setScalar(Math.max(0.01, Math.sin(u * Math.PI)) * heat);
          e.m.rotation.set(t * 2, t * 3, 0);
        });
        glow.intensity = (0.5 + inhale * 1.5 + blast * 2) * heat;
        glow.position.copy(blast > 0.1 ? mouthW : V3(0, BODY_Y, 0.4));
        ring.scale.setScalar(1 + blast * 0.4 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = 0.14 + blast * 0.3 + inhale * 0.15;

        eyes.forEach(({ g }) => {
          g.scale.y = inhale > 0.3 ? 0.4 : eat && eat.p > 0.3 ? 0.45 : blink;
        });
        followPupils(eyes, pointer, 0.4);

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, head.position.y - 0.1, ph.fall * ph.fall), head.position.z + 0.4 * HS);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;
      }
    };
  }
});
