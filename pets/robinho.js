Pets.register({
  id: "robinho",
  dex: 6,
  name: "Robinho",
  color: "#7fb8de",
  types: ["steel"],
  description: "Robozinho de aço que anda sobre uma única roda. Adora passear de um lado para o outro com a engrenagem do peito sempre girando.",
  evolvesTo: "robo",
  evolveLevel: 5,
  actions: {
    jump: { duration: 0.9 },
    eat: { duration: 2.4 },
    roll: { duration: 2.2 }
  },
  idle: [
    { action: "roll", min: 20, max: 45 },
    { action: "jump", min: 30, max: 60 }
  ],
  clickAction: n => ["jump", "roll", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase } = kit;

    const metal = (color, rough = 0.45) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.25 });
    const white = metal(0xe6ecf2);
    const blue = metal(0x5fa8d3);
    const dark = metal(0x2b3550, 0.5);
    const tire = metal(0x232838, 0.8);
    const led = new THREE.MeshBasicMaterial({ color: 0x6ff3ff });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff9f43 });

    const roundedBox = (w, h, d, r, bev = 0.05) => {
      const ir = Math.max(0.001, r - bev);
      const x = (w - 2 * bev) / 2;
      const y = (h - 2 * bev) / 2;
      const pts = [];
      [
        [x - ir, -y + ir, -Math.PI / 2],
        [x - ir, y - ir, 0],
        [-x + ir, y - ir, Math.PI / 2],
        [-x + ir, -y + ir, Math.PI]
      ].forEach(([cx, cy, a0]) => {
        for (let i = 0; i <= 8; i++) {
          const a = a0 + (i / 8) * (Math.PI / 2);
          pts.push(new THREE.Vector2(cx + ir * Math.cos(a), cy + ir * Math.sin(a)));
        }
      });
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
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

    const WHEEL_R = 0.21;
    const BODY_Y = 1.17;

    const root = new THREE.Group();
    const lean = new THREE.Group();
    root.add(lean);
    const squash = new THREE.Group();
    lean.add(squash);

    const wheelBase = new THREE.Group();
    wheelBase.position.y = WHEEL_R;
    lean.add(wheelBase);
    const wheel = new THREE.Group();
    wheelBase.add(wheel);
    const tireMesh = mesh(new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.17, 28), tire);
    tireMesh.rotation.z = Math.PI / 2;
    const tread = mesh(new THREE.TorusGeometry(WHEEL_R - 0.01, 0.025, 8, 28), tire);
    tread.rotation.y = Math.PI / 2;
    [-1, 1].forEach(s => {
      const hub = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 20), white, false);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = 0.086 * s;
      wheel.add(hub);
      [0, 1].forEach(k => {
        const spoke = mesh(new THREE.BoxGeometry(0.012, 0.2, 0.035), blue, false);
        spoke.rotation.x = (k * Math.PI) / 2;
        spoke.position.x = 0.098 * s;
        wheel.add(spoke);
      });
      const bolt = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), dark, false);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.x = 0.11 * s;
      wheel.add(bolt);
    });
    wheel.add(tireMesh, tread);

    [-1, 1].forEach(s => {
      const strut = mesh(roundedBox(0.05, 0.36, 0.09, 0.02, 0.012), dark);
      strut.position.set(0.135 * s, WHEEL_R + 0.15, 0);
      lean.add(strut);
    });
    const yoke = mesh(roundedBox(0.36, 0.08, 0.16, 0.03, 0.015), blue);
    yoke.position.y = WHEEL_R + 0.33;
    lean.add(yoke);

    const body = mesh(roundedBox(0.92, 1.18, 0.7, 0.2), white);
    body.position.y = BODY_Y;
    squash.add(body);

    const visor = mesh(roundedBox(0.7, 0.38, 0.08, 0.12, 0.025), dark, false);
    visor.position.set(0, BODY_Y + 0.28, 0.34);
    squash.add(visor);

    const face = new THREE.Group();
    face.position.set(0, BODY_Y + 0.28, 0.385);
    squash.add(face);
    const eyes = [-1, 1].map(s => {
      const e = mesh(roundedBox(0.14, 0.17, 0.03, 0.05, 0.01), led, false);
      e.position.set(0.15 * s, 0.05, 0);
      face.add(e);
      return e;
    });
    const smile = mesh(new THREE.TorusGeometry(0.07, 0.016, 8, 20, Math.PI), led, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.07, 0.005);
    face.add(smile);
    const mouth = mesh(new THREE.BoxGeometry(0.18, 0.07, 0.02), led, false);
    mouth.position.set(0, -0.1, 0.005);
    mouth.visible = false;
    face.add(mouth);

    const panel = mesh(roundedBox(0.4, 0.36, 0.06, 0.1, 0.02), dark, false);
    panel.position.set(0, BODY_Y - 0.22, 0.34);
    squash.add(panel);
    const gear = mesh(gearShape(8, 0.13, 0.095, 0.035, 0.05), blue, false);
    gear.position.set(0, BODY_Y - 0.22, 0.385);
    squash.add(gear);

    [-1, 1].forEach(s => {
      const ear = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16), blue);
      ear.rotation.z = Math.PI / 2;
      ear.position.set(0.49 * s, BODY_Y + 0.25, 0);
      const cap = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 6), dark, false);
      cap.rotation.z = Math.PI / 2;
      cap.position.set(0.535 * s, BODY_Y + 0.25, 0);
      squash.add(ear, cap);
    });

    const antenna = new THREE.Group();
    antenna.position.y = BODY_Y + 0.59;
    const stem = mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.22, 10), dark);
    stem.position.y = 0.11;
    const tip = mesh(new THREE.OctahedronGeometry(0.085), glow, false);
    tip.position.y = 0.29;
    antenna.add(stem, tip);
    squash.add(antenna);

    const food = new THREE.Group();
    const cell = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.28, 16), metal(0xf6c443, 0.4), false);
    const band = mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.07, 16), dark, false);
    const cap = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), metal(0xb8c2cc, 0.3), false);
    cap.position.y = 0.17;
    food.add(cell, band, cap);
    food.visible = false;
    squash.add(food);

    let last = 0;
    let gearAngle = 0;
    let wheelAngle = 0;
    let rollX = 0;
    let turn = 0;
    let rollK = 0;

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
        let sy = 1 + Math.sin(t * 2.4) * 0.012 * motion;
        let airborne = false;
        let tilt = Math.sin(t * 1.3) * 0.02 * motion;
        let pitch = 0;
        let gearSpeed = 1;
        let targetX = 0;
        let flash = 0;
        let mouthOpen = false;
        let squint = false;
        let happy = false;

        if (a === "jump") {
          if (p < 0.18) {
            sy = 1 - 0.12 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.1;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            airborne = true;
            gearSpeed = 6;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.12 * Math.sin(q * Math.PI);
          }
        }

        if (a === "roll") {
          const k = smooth(0, 0.1, p) * (1 - smooth(0.85, 1, p));
          targetX = Math.sin(p * Math.PI * 2) * 0.55 * k;
          rollK = k;
          gearSpeed = 5;
          happy = true;
        }

        if (a === "eat") {
          sy += 0.04 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.05 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, BODY_Y + 0.2, ph.fall * ph.fall), lerp(0.7, 0.48, ph.fall));
          food.rotation.x = ph.fall * (Math.PI / 2);
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = p > 0.12 && p < 0.85;
          mouth.scale.y = 0.6 + ph.chew * 1.2;
          squint = p > 0.3 && p < 0.85;
          gearSpeed = p > 0.3 ? 4 : 1.5;
          flash = p > 0.85 ? 1 : 0;
        } else {
          food.visible = false;
        }

        if (a !== "roll") rollK = 0;
        const prevX = rollX;
        rollX = lerp(rollX, targetX, 0.12);
        const dx = rollX - prevX;
        const speed = dt > 0 ? Math.abs(dx) / dt : 0;
        wheelAngle += Math.abs(dx) / WHEEL_R;
        if (airborne) wheelAngle += dt * 8;
        const want = rollK > 0.05 && Math.abs(dx) > 0.0005 ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : 0;
        turn = lerp(turn, want * rollK, 0.15);
        pitch = Math.min(0.22, speed * 0.15);
        gearAngle += dt * gearSpeed;

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(rollX, y, 0);
        root.rotation.y = lookYaw * 0.4 + turn;
        lean.rotation.z = airborne ? 0 : tilt;
        lean.rotation.x = airborne ? 0 : pitch;
        squash.rotation.x = lookPitch * 0.5;

        wheel.rotation.x = wheelAngle;
        gear.rotation.z = gearAngle;
        antenna.rotation.z = Math.sin(t * 1.9) * 0.1 * motion - pitch * 0.8;
        tip.rotation.y = t * 1.5;
        tip.scale.setScalar(1 + flash * 0.5 + Math.sin(t * 4) * 0.1 * motion);

        mouth.visible = mouthOpen;
        smile.visible = !mouthOpen;
        smile.scale.set(happy ? 1.25 : 1, happy ? 1.3 : 1, 1);

        eyes.forEach((e, i) => {
          const base = i === 0 ? -0.15 : 0.15;
          e.position.x = lerp(e.position.x, base + pointer.x * 0.05, 0.2);
          e.position.y = lerp(e.position.y, 0.05 + pointer.y * 0.03, 0.2);
          e.scale.y = squint ? 0.3 : happy ? 0.6 : blink;
        });
      }
    };
  }
});
