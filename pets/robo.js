Pets.register({
  id: "robo",
  name: "Robô",
  color: "#5fa8d3",
  actions: {
    jump: { duration: 0.9 },
    eat: { duration: 2.4 },
    scan: { duration: 1.8 },
    dance: { duration: 2.6 }
  },
  idle: [
    { action: "jump", min: 25, max: 50 },
    { action: "scan", min: 20, max: 45 },
    { action: "dance", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "scan", "jump", "dance"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase } = kit;

    const metal = (color, rough = 0.45) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.25 });
    const white = metal(0xe6ecf2);
    const blue = metal(0x5fa8d3);
    const dark = metal(0x2b3550, 0.5);
    const led = new THREE.MeshBasicMaterial({ color: 0x6ff3ff });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff9f43 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });

    const creased = (g, maxAngle = 0.21) => {
      const pos = g.attributes.position;
      const n = pos.count;
      const faces = new Float32Array(n * 3);
      const groups = new Map();
      const key = i =>
        Math.round(pos.getX(i) * 1e4) + "_" + Math.round(pos.getY(i) * 1e4) + "_" + Math.round(pos.getZ(i) * 1e4);
      for (let i = 0; i < n; i += 3) {
        const ax = pos.getX(i + 1) - pos.getX(i);
        const ay = pos.getY(i + 1) - pos.getY(i);
        const az = pos.getZ(i + 1) - pos.getZ(i);
        const bx = pos.getX(i + 2) - pos.getX(i);
        const by = pos.getY(i + 2) - pos.getY(i);
        const bz = pos.getZ(i + 2) - pos.getZ(i);
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;
        for (let k = 0; k < 3; k++) {
          faces[(i + k) * 3] = nx;
          faces[(i + k) * 3 + 1] = ny;
          faces[(i + k) * 3 + 2] = nz;
          const id = key(i + k);
          if (!groups.has(id)) groups.set(id, []);
          groups.get(id).push(i + k);
        }
      }
      const cos = Math.cos(maxAngle);
      const out = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const ox = faces[i * 3];
        const oy = faces[i * 3 + 1];
        const oz = faces[i * 3 + 2];
        const ol = Math.hypot(ox, oy, oz) || 1;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        groups.get(key(i)).forEach(j => {
          const fx = faces[j * 3];
          const fy = faces[j * 3 + 1];
          const fz = faces[j * 3 + 2];
          const fl = Math.hypot(fx, fy, fz) || 1;
          if ((ox * fx + oy * fy + oz * fz) / (ol * fl) >= cos) {
            sx += fx;
            sy += fy;
            sz += fz;
          }
        });
        const sl = Math.hypot(sx, sy, sz) || 1;
        out[i * 3] = sx / sl;
        out[i * 3 + 1] = sy / sl;
        out[i * 3 + 2] = sz / sl;
      }
      g.setAttribute("normal", new THREE.BufferAttribute(out, 3));
      return g;
    };

    const roundedBox = (w, h, d, r, bev = 0.05) => {
      const ir = Math.max(0.001, r - bev);
      const x = (w - 2 * bev) / 2;
      const y = (h - 2 * bev) / 2;
      const s = new THREE.Shape();
      s.moveTo(-x + ir, -y);
      s.lineTo(x - ir, -y);
      s.absarc(x - ir, -y + ir, ir, -Math.PI / 2, 0, false);
      s.lineTo(x, y - ir);
      s.absarc(x - ir, y - ir, ir, 0, Math.PI / 2, false);
      s.lineTo(-x + ir, y);
      s.absarc(-x + ir, y - ir, ir, Math.PI / 2, Math.PI, false);
      s.lineTo(-x, -y + ir);
      s.absarc(-x + ir, -y + ir, ir, Math.PI, Math.PI * 1.5, false);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: d - 2 * bev,
        bevelEnabled: true,
        bevelThickness: bev,
        bevelSize: bev,
        bevelSegments: 3,
        curveSegments: 8
      });
      g.center();
      return g;
    };

    const gearShape = (teeth, ro, ri, hole, depth) => {
      const s = new THREE.Shape();
      const step = (Math.PI * 2) / teeth;
      for (let i = 0; i < teeth; i++) {
        const a = i * step;
        [
          [ri, a],
          [ro, a + step * 0.15],
          [ro, a + step * 0.35],
          [ri, a + step * 0.5]
        ].forEach(([r, ang], k) => {
          const px = r * Math.cos(ang);
          const py = r * Math.sin(ang);
          if (i === 0 && k === 0) s.moveTo(px, py);
          else s.lineTo(px, py);
        });
      }
      const h = new THREE.Path();
      h.absarc(0, 0, hole, 0, Math.PI * 2, true);
      s.holes.push(h);
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
      g.center();
      return g;
    };

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const torso = mesh(roundedBox(1.2, 0.85, 0.8, 0.2), white);
    torso.position.set(0, 0.88, 0);
    squash.add(torso);

    const belt = mesh(roundedBox(1.24, 0.14, 0.84, 0.07, 0.03), blue);
    belt.position.set(0, 0.55, 0);
    squash.add(belt);

    const panel = mesh(roundedBox(0.62, 0.46, 0.08, 0.1, 0.025), dark, false);
    panel.position.set(0, 0.98, 0.4);
    squash.add(panel);

    const gear = mesh(gearShape(8, 0.19, 0.14, 0.05, 0.05), blue, false);
    gear.position.set(0, 0.98, 0.45);
    squash.add(gear);

    const neck = mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 16), dark);
    neck.position.set(0, 1.38, 0);
    squash.add(neck);

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.x = 0.3 * s;
      const leg = mesh(new THREE.BoxGeometry(0.3, 0.36, 0.3), dark);
      leg.position.y = 0.3;
      const foot = mesh(roundedBox(0.46, 0.14, 0.54, 0.06, 0.025), blue);
      foot.position.set(0, 0.07, 0.07);
      g.add(leg, foot);
      squash.add(g);
      return g;
    });

    const flames = [-1, 1].map(s => {
      const f = mesh(new THREE.ConeGeometry(0.12, 0.4, 12), flameMat, false);
      f.rotation.x = Math.PI;
      f.position.set(0.3 * s, -0.15, 0.07);
      f.visible = false;
      squash.add(f);
      return f;
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.68 * s, 1.12, 0);
      const joint = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 6), dark);
      joint.rotation.z = Math.PI / 2;
      const upper = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.4, 12), white);
      upper.position.set(0.04 * s, -0.22, 0);
      const hand = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 6), blue);
      hand.position.set(0.05 * s, -0.5, 0);
      pivot.add(joint, upper, hand);
      squash.add(pivot);
      return { pivot, side: s };
    });

    const head = new THREE.Group();
    head.position.set(0, 1.85, 0);
    squash.add(head);

    head.add(mesh(creased(roundedBox(1.35, 0.9, 1.0, 0.25)), white));

    const visor = mesh(roundedBox(1.05, 0.5, 0.1, 0.16, 0.03), dark, false);
    visor.position.set(0, 0.1, 0.47);
    head.add(visor);

    const eyes = [-1, 1].map(s => {
      const e = mesh(roundedBox(0.2, 0.26, 0.04, 0.08, 0.015), led, false);
      e.position.set(0.25 * s, 0.14, 0.52);
      head.add(e);
      return e;
    });

    const smile = mesh(new THREE.TorusGeometry(0.09, 0.02, 8, 20, Math.PI), led, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.03, 0.53);
    head.add(smile);

    const mouth = mesh(new THREE.BoxGeometry(0.26, 0.1, 0.03), led, false);
    mouth.position.set(0, -0.08, 0.53);
    mouth.visible = false;
    head.add(mouth);

    [-1, 1].forEach(s => {
      const ear = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.12, 16), blue);
      ear.rotation.z = Math.PI / 2;
      ear.position.set(0.72 * s, 0, 0);
      const cap = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 6), dark, false);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(0.78 * s, 0, 0);
      head.add(ear, cap);
    });

    const antenna = new THREE.Group();
    antenna.position.set(0, 0.45, 0);
    const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), dark);
    stem.position.y = 0.15;
    const tip = mesh(new THREE.OctahedronGeometry(0.1), glow, false);
    tip.position.y = 0.36;
    antenna.add(stem, tip);
    head.add(antenna);

    const food = new THREE.Group();
    const cell = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 16), metal(0xf6c443, 0.4), false);
    const band = mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.08, 16), dark, false);
    const cap = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 12), metal(0xb8c2cc, 0.3), false);
    cap.position.y = 0.2;
    food.add(cell, band, cap);
    food.visible = false;
    squash.add(food);

    let last = 0;
    let gearAngle = 0;
    let antAngle = 0;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const dt = Math.min(0.1, Math.max(0, t - last));
        last = t;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2.2) * 0.012 * motion;
        let airborne = false;
        let tilt = 0;
        let headTilt = 0;
        let headYaw = 0;
        let eyeScan = 0;
        let gearSpeed = 0.8;
        let spin = 0;
        let flash = 0;
        let mouthOpen = false;
        let squint = false;
        let armL = 0.15 + Math.sin(t * 2.4) * 0.05 * motion;
        let armR = 0.15 + Math.sin(t * 2.4 + 1) * 0.05 * motion;
        let liftL = 0;
        let liftR = 0;

        if (a === "jump") {
          if (p < 0.18) {
            sy = 1 - 0.1 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.25;
            sy = 1 + 0.05 * Math.cos(q * Math.PI);
            airborne = true;
            armL = 1.6;
            armR = 1.6;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.1 * Math.sin(q * Math.PI);
          }
        }

        if (a === "scan") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.88, 1, p));
          headYaw = Math.sin(p * Math.PI * 4) * 0.6 * k;
          eyeScan = Math.sin(p * Math.PI * 8) * 0.2 * k;
          spin = 12 * k;
          gearSpeed = 3;
        }

        if (a === "dance") {
          const k = smooth(0, 0.1, p) * (1 - smooth(0.9, 1, p));
          const beat = Math.tanh(Math.sin(p * Math.PI * 10) * 4);
          tilt = beat * 0.12 * k;
          headTilt = -beat * 0.1 * k;
          y = Math.abs(Math.sin(p * Math.PI * 10)) * 0.1 * k;
          armL = 0.2 + (0.5 + 0.5 * beat) * 1.7 * k;
          armR = 0.2 + (0.5 - 0.5 * beat) * 1.7 * k;
          liftL = Math.max(0, beat) * 0.12 * k;
          liftR = Math.max(0, -beat) * 0.12 * k;
          gearSpeed = 5;
        }

        if (a === "eat") {
          sy += 0.04 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.05 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, 1.77, ph.fall * ph.fall), lerp(0.8, 0.62, ph.fall));
          food.rotation.x = ph.fall * (Math.PI / 2);
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = p > 0.12 && p < 0.85;
          mouth.scale.y = 0.6 + ph.chew * 1.2;
          squint = p > 0.3 && p < 0.85;
          armL = 0.6;
          armR = 0.6;
          gearSpeed = p > 0.3 ? 4 : 1.5;
          flash = p > 0.85 ? 1 : 0;
        } else {
          food.visible = false;
        }

        gearAngle += dt * gearSpeed;
        antAngle += dt * spin;

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.y = y;
        root.rotation.y = lookYaw * 0.35;
        squash.rotation.z = airborne ? 0 : tilt + Math.sin(t * 1.2) * 0.015 * motion;

        head.position.y = 1.85 + Math.sin(t * 2.2) * 0.015 * motion;
        head.rotation.y = lookYaw * 0.7 + headYaw;
        head.rotation.x = lookPitch;
        head.rotation.z = headTilt;

        antenna.rotation.y = antAngle;
        antenna.rotation.z = Math.sin(t * 1.7) * 0.08 * motion;
        tip.scale.setScalar(1 + flash * 0.5 + Math.sin(t * 4) * 0.1 * motion);

        gear.rotation.z = gearAngle;

        arms.forEach(({ pivot, side }) => {
          const target = side === -1 ? armL : armR;
          pivot.rotation.z = lerp(pivot.rotation.z, target * side, 0.25);
        });

        legs.forEach((g, i) => {
          g.position.y = i === 0 ? liftL : liftR;
        });

        flames.forEach((f, i) => {
          f.visible = airborne;
          f.scale.set(1, 0.8 + Math.sin(t * 40 + i * 2) * 0.25, 1);
        });

        mouth.visible = mouthOpen;
        smile.visible = !mouthOpen;

        eyes.forEach((e, i) => {
          const base = i === 0 ? -0.25 : 0.25;
          e.position.x = lerp(e.position.x, base + pointer.x * 0.07 + eyeScan, 0.2);
          e.position.y = lerp(e.position.y, 0.14 + pointer.y * 0.04, 0.2);
          e.scale.y = squint ? 0.3 : blink;
        });
      }
    };
  }
});
