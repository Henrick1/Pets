Pets.register({
  id: "sineta",
  dex: 10,
  name: "Sineta",
  color: "#d9a441",
  types: ["ghost"],
  description: "Um sino antigo assombrado por um espírito mascarado. Seu toque ecoa pela casa mesmo quando ninguém o balança.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    ring: { duration: 2.2 },
    claw: { duration: 2.2 }
  },
  idle: [
    { action: "ring", min: 25, max: 50 },
    { action: "claw", min: 30, max: 60 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "ring", "jump", "claw"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry } = kit;

    const BASE = 1.1;
    const TILT = 0.28;
    const BELL_SCALE = 0.9;
    const HANDLE = 1.0;

    const brass = new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      roughness: 0.35,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xb9822a, roughness: 0.35, metalness: 0.3 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x8a5c1c, roughness: 0.4, metalness: 0.3 });
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x6a4410, roughness: 0.5, metalness: 0.2 });
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x7a1f4a,
      roughness: 0.25,
      emissive: 0x4a0f2e,
      emissiveIntensity: 0.6
    });
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x1d1236, side: THREE.DoubleSide });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a4a26, roughness: 0.75 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4e2f16, roughness: 0.8 });
    const hollowMat = new THREE.MeshBasicMaterial({ color: 0x04020a });
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x2c2640 });
    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xdfe6f5,
      roughness: 0.6,
      emissive: 0x5a6ab0,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });

    const spline = (pts, u) => {
      const n = pts.length - 1;
      const f = Math.min(u, 0.9999) * n;
      const i = Math.floor(f);
      const k = f - i;
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, n)];
      const k2 = k * k;
      const k3 = k2 * k;
      return [0, 1, 2].map(
        a =>
          0.5 *
          (2 * p1[a] +
            (-p0[a] + p2[a]) * k +
            (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * k2 +
            (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * k3)
      );
    };

    const root = new THREE.Group();
    const bodyG = new THREE.Group();
    root.add(bodyG);

    const handleG = new THREE.Group();
    handleG.position.y = BASE;
    bodyG.add(handleG);
    const handleProfile = [
      [0.001, 0],
      [0.1, 0.015],
      [0.15, 0.08],
      [0.15, 0.16],
      [0.1, 0.24],
      [0.085, 0.34],
      [0.085, 0.66],
      [0.1, 0.82],
      [0.16, 0.93],
      [0.001, 1.0]
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const handle = mesh(new THREE.LatheGeometry(handleProfile, 24), woodMat);
    handle.position.y = -HANDLE;
    handleG.add(handle);
    [0.42, 0.5, 0.58].forEach(h => {
      const band = mesh(new THREE.TorusGeometry(0.088, 0.016, 8, 24), woodDark, false);
      band.rotation.x = Math.PI / 2;
      band.position.y = -HANDLE + h;
      handleG.add(band);
    });
    const pommel = mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 24), woodDark, false);
    pommel.rotation.x = Math.PI / 2;
    pommel.position.y = -HANDLE + 0.12;
    handleG.add(pommel);

    const bell = new THREE.Group();
    bell.position.y = BASE;
    bell.rotation.x = TILT;
    bell.scale.setScalar(BELL_SCALE);
    bodyG.add(bell);

    const profile = [
      [0.001, 0],
      [0.4, 0],
      [0.46, 0.06],
      [0.54, 0.3],
      [0.64, 0.6],
      [0.74, 0.85],
      [0.8, 0.95],
      [0.82, 0.98],
      [0.8, 1.0],
      [0.74, 1.0],
      [0.72, 0.97],
      [0.66, 0.85],
      [0.56, 0.6],
      [0.46, 0.3],
      [0.38, 0.15],
      [0.001, 0.12]
    ].map(([r, y]) => new THREE.Vector2(r, y));
    bell.add(mesh(new THREE.LatheGeometry(profile, 48), brass));

    const rim = mesh(new THREE.TorusGeometry(0.78, 0.045, 10, 48), rimMat, false);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.99;
    bell.add(rim);

    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.7, 40), voidMat);
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.93;
    bell.add(hole);

    [
      [0.2, 0.51],
      [0.45, 0.6],
      [0.7, 0.7]
    ].forEach(([y, r]) => {
      const band = mesh(new THREE.TorusGeometry(r, 0.026, 8, 48), bandMat, false);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      bell.add(band);
      const line = mesh(new THREE.TorusGeometry(r + 0.04, 0.009, 6, 48), lineMat, false);
      line.rotation.x = Math.PI / 2;
      line.position.y = y + 0.07;
      bell.add(line);
    });

    for (let i = 0; i < 14; i++) {
      const g = new THREE.Group();
      g.rotation.y = (i / 14) * Math.PI * 2;
      const stud = mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.05, 8), rimMat, false);
      stud.rotation.z = Math.PI / 2;
      stud.position.x = 0.76;
      const cap = mesh(new THREE.ConeGeometry(0.032, 0.04, 8), rimMat, false);
      cap.rotation.z = -Math.PI / 2;
      cap.position.x = 0.8;
      g.add(stud, cap);
      g.position.y = 0.86;
      bell.add(g);
    }

    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      g.rotation.y = (i / 16) * Math.PI * 2;
      const spike = mesh(new THREE.ConeGeometry(0.04, 0.13, 6), rimMat, false);
      spike.position.set(0.78, 1.06, 0);
      g.add(spike);
      bell.add(g);
    }

    const emblem = new THREE.Group();
    emblem.position.set(0, 0.55, 0.63);
    emblem.rotation.x = 0.36;
    const plate = mesh(new THREE.OctahedronGeometry(0.16), bandMat, false);
    plate.scale.set(0.8, 1.25, 0.25);
    const gem = mesh(new THREE.OctahedronGeometry(0.09), gemMat, false);
    gem.scale.set(0.8, 1.25, 0.4);
    gem.position.z = 0.03;
    emblem.add(plate, gem);
    bell.add(emblem);

    const ghost = new THREE.Group();
    ghost.position.y = 0.5;
    bell.add(ghost);

    const gProfile = [
      [0.001, 0],
      [0.1, 0.12],
      [0.2, 0.3],
      [0.28, 0.55],
      [0.34, 0.8],
      [0.34, 1.0],
      [0.28, 1.18],
      [0.16, 1.3],
      [0.001, 1.35]
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const gBody = mesh(new THREE.LatheGeometry(gProfile, 36), ghostMat);
    gBody.scale.setScalar(0.8);
    ghost.add(gBody);

    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.1 * s, 0.8, 0.215);
      g.rotation.z = -s * 0.45;
      const ring = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 12), socketMat);
      ring.scale.set(1.7, 2.3, 0.4);
      const pit = new THREE.Mesh(new THREE.SphereGeometry(0.06, 18, 12), hollowMat);
      pit.scale.set(1.2, 1.8, 0.5);
      pit.position.z = 0.012;
      g.add(ring, pit);
      ghost.add(g);
      return { g, base: 0.1 * s };
    });

    const mouthLine = mesh(new THREE.BoxGeometry(0.15, 0.022, 0.015), hollowMat, false);
    mouthLine.position.set(0, 0.62, 0.25);
    ghost.add(mouthLine);

    const mouthOpen = mesh(new THREE.SphereGeometry(0.05, 14, 10), hollowMat, false);
    mouthOpen.scale.set(1.3, 2, 0.4);
    mouthOpen.position.set(0, 0.6, 0.25);
    mouthOpen.visible = false;
    ghost.add(mouthOpen);

    const M = 12;
    const S = [-0.55, 1.94, 0.28];
    const ARM_LEN = 1.2;
    const LAG = 0.1;

    const swingAngle = q => {
      if (q <= 0.2) return 1.2;
      if (q < 0.4) return lerp(1.2, 0.75, smooth(0.2, 0.4, q));
      if (q < 0.52) {
        const k = (q - 0.4) / 0.12;
        return lerp(0.75, 2.75, 1 - Math.pow(1 - k, 2));
      }
      if (q < 0.62) return lerp(2.75, 2.6, smooth(0.52, 0.62, q));
      if (q < 0.8) return lerp(2.6, 1.9, smooth(0.62, 0.8, q));
      return 1.9;
    };

    const armG = new THREE.Group();
    armG.visible = false;
    root.add(armG);
    const armSegs = [];
    for (let i = 0; i < M - 1; i++) {
      const r0 = lerp(0.1, 0.035, i / (M - 1));
      const r1 = lerp(0.1, 0.035, (i + 1) / (M - 1));
      const seg = mesh(new THREE.CylinderGeometry(r1, r0, 1, 10), ghostMat, false);
      armG.add(seg);
      armSegs.push(seg);
    }
    const tipsG = new THREE.Group();
    armG.add(tipsG);
    const tips = [-0.55, -0.2, 0.2, 0.55].map(fan => {
      const pv = new THREE.Group();
      const c = mesh(new THREE.ConeGeometry(0.03, 0.32, 6), ghostMat, false);
      c.position.y = 0.16;
      pv.add(c);
      tipsG.add(pv);
      return { pv, fan };
    });
    const UP_V = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();

    const swooshes = [
      [0.7, 1.05, 1.7],
      [0.95, 1.0, 1.8],
      [1.2, 0.95, 1.85]
    ].map(([r, start, span]) => {
      const m = new THREE.MeshBasicMaterial({ color: 0xe8eeff, transparent: true, opacity: 0 });
      const a = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 6, 28, span), m);
      a.position.set(S[0], S[1], 0.4);
      a.rotation.z = start;
      a.visible = false;
      root.add(a);
      return { a, m };
    });

    const arcs = [];
    [-1, 1].forEach(s => {
      for (let i = 0; i < 2; i++) {
        const m = new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0 });
        const a = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.015, 6, 16, Math.PI * 0.6), m);
        a.position.set(0.85 * s, 1.96, 0.28);
        a.rotation.z = s > 0 ? -Math.PI * 0.3 : Math.PI - Math.PI * 0.3;
        a.visible = false;
        root.add(a);
        arcs.push({ a, m, i });
      }
    });

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, blink, lookYaw, lookPitch, action, motion } = s;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;

        let y = 0;
        let ghostLift = Math.sin(t * 1.3) * 0.04 * motion;
        let swing = Math.sin(t * 1.6) * 0.06 * motion;
        let rock = Math.sin(t * 1.1) * 0.02 * motion;
        let ringK = 0;
        let ghostPitch = 0;
        let ghostYaw = 0;
        let opened = false;
        let squint = false;
        let lenK = 0;
        let swat = 0;

        if (a === "jump") {
          if (p < 0.2) {
            const k = Math.sin((p / 0.2) * Math.PI / 2);
            y = -0.1 * k;
            ghostLift -= 0.12 * k;
          } else if (p < 0.78) {
            const q = (p - 0.2) / 0.58;
            y = Math.sin(q * Math.PI) * 1.0;
            ghostLift += 0.25 * Math.sin(q * Math.PI);
            swing = Math.sin(t * 14) * 0.12;
          } else {
            const q = (p - 0.78) / 0.22;
            y = -0.06 * Math.sin(q * Math.PI);
          }
        }

        if (a === "ring") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.88, 1, p));
          ringK = k;
          rock = Math.sin(p * Math.PI * 8) * 0.2 * k;
          swing = -Math.sin(p * Math.PI * 8 - 0.6) * 0.45 * k;
        }

        if (a === "claw") {
          lenK = smooth(0, 0.2, p) * (1 - smooth(0.8, 1, p));
          swat = smooth(0.4, 0.48, p) * (1 - smooth(0.54, 0.7, p));
          ghostYaw = -0.4 * lenK;
          swing += swat * 0.3;
          rock -= 0.08 * swat;
        }

        if (a === "eat") {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, 2.07, ph.fall * ph.fall), lerp(0.6, 0.55, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          opened = p > 0.12 && p < 0.85 && (p < 0.3 || ph.chew > 0.35);
          squint = p > 0.3;
          ghostPitch = -0.25 * (p < 0.3 ? Math.sin((p / 0.3) * Math.PI) : 0) + ph.chew * 0.1;
          if (p > 0.3 && p < 0.55) {
            rock += Math.sin((p - 0.3) * Math.PI * 12) * 0.08 * (1 - (p - 0.3) / 0.25);
          }
        } else {
          food.visible = false;
        }

        root.position.y = y + 0.06 + Math.sin(t * 1.7) * 0.07 * motion;
        root.rotation.y = lookYaw * 0.3;
        handleG.rotation.z = rock;

        bell.rotation.x = TILT + Math.sin(t * 1.1) * 0.01 * motion;
        bell.rotation.z = rock;

        ghost.position.y = 0.5 + ghostLift;
        ghost.rotation.z = swing;
        ghost.rotation.y = lookYaw * 0.8 + ghostYaw;
        ghost.rotation.x = lookPitch * 0.8 + ghostPitch;

        if (lenK > 0.02) {
          armG.visible = true;
          const segLen = (ARM_LEN * lenK) / (M - 1);
          const pts = [S.slice()];
          for (let i = 1; i < M; i++) {
            const f = (i - 0.5) / (M - 1);
            const ang = swingAngle(p - LAG * f) + 0.25 * f + Math.sin(t * 6 + i * 0.7) * 0.03 * f;
            const prev = pts[i - 1];
            pts.push([prev[0] + Math.cos(ang) * segLen, prev[1] + Math.sin(ang) * segLen, 0.4 + 0.1 * f]);
          }
          armSegs.forEach((seg, i) => {
            const A = pts[i];
            const B = pts[i + 1];
            const dx = B[0] - A[0];
            const dy = B[1] - A[1];
            const dz = B[2] - A[2];
            const len = Math.hypot(dx, dy, dz);
            seg.visible = len > 0.002;
            if (!seg.visible) return;
            seg.position.set((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2);
            seg.scale.set(1, len * 1.12, 1);
            dir.set(dx, dy, dz).normalize();
            seg.quaternion.setFromUnitVectors(UP_V, dir);
          });
          const E = pts[M - 1];
          const P = pts[M - 2];
          tipsG.position.set(E[0], E[1], E[2]);
          dir.set(E[0] - P[0], E[1] - P[1], E[2] - P[2]).normalize();
          tipsG.quaternion.setFromUnitVectors(UP_V, dir);
          tips.forEach(({ pv, fan }) => {
            pv.rotation.z = fan * (0.6 + 0.8 * (0.35 + 0.65 * swat));
          });
        } else {
          armG.visible = false;
        }

        swooshes.forEach(({ a: sw, m }, i) => {
          sw.visible = swat > 0.05;
          m.opacity = swat * (0.85 - i * 0.2);
        });

        mouthLine.visible = !opened;
        mouthOpen.visible = opened;

        arcs.forEach(({ a: arc, m, i }) => {
          const q = (p * 2.2 + i * 0.5) % 1;
          arc.visible = ringK > 0.1;
          arc.scale.setScalar(1 + q * 1.4);
          m.opacity = (1 - q) * 0.8 * ringK;
        });

        eyes.forEach(({ g, base }) => {
          g.position.x = lerp(g.position.x, base + pointer.x * 0.012, 0.15);
          g.scale.set(1, squint ? 0.35 : blink, 1);
        });
      }
    };
  }
});
