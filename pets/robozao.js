Pets.register({
  id: "robozao",
  dex: 9,
  name: "Robozão",
  color: "#3f7fb5",
  types: ["steel", "fighting"],
  description: "A forma final do Robô. Ombros largos, cintura fina e três engrenagens no peito: um lutador de aço que vive em guarda com as luvas erguidas, pronto para o próximo round.",
  actions: {
    jump: { duration: 1.1 },
    eat: { duration: 2.4 },
    punch: { duration: 1.8 },
    flex: { duration: 2.4 }
  },
  idle: [
    { action: "punch", min: 18, max: 40 },
    { action: "flex", min: 35, max: 70 },
    { action: "jump", min: 50, max: 90 }
  ],
  clickAction: n => ["punch", "jump", "punch", "flex"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase } = kit;

    const metal = (color, rough = 0.42, mt = 0.3) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: mt });
    const white = metal(0xe6ecf2);
    const blue = metal(0x5fa8d3, 0.4);
    const navy = metal(0x3f7fb5, 0.38);
    const dark = metal(0x2b3550, 0.5);
    const steel = metal(0xb8c2cc, 0.3, 0.45);
    const led = new THREE.MeshBasicMaterial({ color: 0x6ff3ff });
    const ledRed = new THREE.MeshBasicMaterial({ color: 0xff4d5a });
    const glow = new THREE.MeshBasicMaterial({ color: 0xff9f43 });
    const core = new THREE.MeshBasicMaterial({ color: 0x14182a });

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

    const root = new THREE.Group();
    const stance = new THREE.Group();
    root.add(stance);
    const WAIST = 1.01;
    const upper = new THREE.Group();
    upper.position.y = WAIST;
    stance.add(upper);
    const HEAD_Y = 1.74;

    const ab = mesh(roundedBox(0.6, 0.22, 0.5, 0.08, 0.03), white);
    ab.position.y = 0.3;
    upper.add(ab);
    const core2 = mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.36, 24), dark);
    core2.position.y = 0.26;
    upper.add(core2);
    [-1, 1].forEach(s => {
      const ob = mesh(roundedBox(0.1, 0.24, 0.4, 0.04, 0.015), dark, false);
      ob.position.set(0.31 * s, 0.33, 0);
      ob.rotation.z = 0.12 * s;
      upper.add(ob);
    });

    const CH = 1.0;
    const DEPTH = 0.72;
    const chestShape = new THREE.Shape();
    chestShape.moveTo(-0.38, 0);
    chestShape.lineTo(0.38, 0);
    chestShape.lineTo(0.72, CH - 0.15);
    chestShape.quadraticCurveTo(0.74, CH, 0.6, CH);
    chestShape.lineTo(-0.6, CH);
    chestShape.quadraticCurveTo(-0.74, CH, -0.72, CH - 0.15);
    chestShape.lineTo(-0.38, 0);
    const chestGeo = new THREE.ExtrudeGeometry(chestShape, { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 3, curveSegments: 10 });
    chestGeo.translate(0, 0, -DEPTH / 2);
    const chest = new THREE.Group();
    chest.position.y = 0.44;
    upper.add(chest);
    chest.add(mesh(chestGeo, white));
    const FRONT = DEPTH / 2 + 0.075;

    const vShape = new THREE.Shape();
    vShape.moveTo(-0.48, 0.92);
    vShape.lineTo(-0.331, 0.92);
    vShape.lineTo(0, 0.63);
    vShape.lineTo(0.331, 0.92);
    vShape.lineTo(0.48, 0.92);
    vShape.lineTo(0, 0.5);
    vShape.lineTo(-0.48, 0.92);
    const vGeo = new THREE.ExtrudeGeometry(vShape, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    const vMesh = mesh(vGeo, navy, false);
    vMesh.position.z = FRONT - 0.01;
    chest.add(vMesh);
    const ledShape = new THREE.Shape();
    ledShape.moveTo(-0.408, 0.89);
    ledShape.lineTo(-0.335, 0.89);
    ledShape.lineTo(0, 0.597);
    ledShape.lineTo(0.335, 0.89);
    ledShape.lineTo(0.408, 0.89);
    ledShape.lineTo(0, 0.533);
    ledShape.lineTo(-0.408, 0.89);
    const ledGeo = new THREE.ExtrudeGeometry(ledShape, { depth: 0.004, bevelEnabled: false });
    ledGeo.translate(0, -0.72, 0);
    const vLed = new THREE.Mesh(ledGeo, led);
    vLed.position.set(0, 0.72, FRONT + 0.056);
    chest.add(vLed);

    const plate = mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 32), dark, false);
    plate.rotation.x = Math.PI / 2;
    plate.position.set(0, 0.27, FRONT);
    const plateRim = mesh(new THREE.TorusGeometry(0.23, 0.03, 8, 32), navy, false);
    plateRim.position.set(0, 0.27, FRONT + 0.02);
    chest.add(plate, plateRim);
    const gearA = mesh(gearShape(9, 0.13, 0.095, 0.035, 0.05), blue, false);
    gearA.position.set(-0.08, 0.33, FRONT + 0.04);
    const gearB = mesh(gearShape(7, 0.095, 0.068, 0.025, 0.05), steel, false);
    gearB.position.set(0.13, 0.38, FRONT + 0.045);
    const gearC = mesh(gearShape(6, 0.08, 0.056, 0.022, 0.05), metal(0xf2c14e, 0.35, 0.4), false);
    gearC.position.set(0.06, 0.15, FRONT + 0.05);
    chest.add(gearA, gearB, gearC);

    [-0.43, 0.43].forEach(x => {
      const rv = mesh(new THREE.SphereGeometry(0.035, 10, 8), steel, false);
      rv.position.set(x, 0.86, FRONT);
      chest.add(rv);
    });

    const pads = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.78 * s, 0.44 + CH - 0.02, 0);
      const pad = mesh(roundedBox(0.52, 0.34, 0.72, 0.14, 0.04), white);
      const trim = mesh(roundedBox(0.54, 0.08, 0.74, 0.04, 0.015), navy, false);
      trim.position.y = -0.12;
      const bolt = mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 14), dark, false);
      bolt.rotation.z = Math.PI / 2;
      bolt.position.x = 0.27 * s;
      g.add(pad, trim, bolt);
      upper.add(g);
      return g;
    });
    const pauldrons = pads;

    const neck = mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.22, 16), dark);
    neck.position.y = 1.5;
    upper.add(neck);

    const head = new THREE.Group();
    head.position.set(0, HEAD_Y, 0.02);
    head.scale.setScalar(0.62);
    upper.add(head);
    head.add(mesh(roundedBox(1.35, 0.9, 1.0, 0.25), white));
    const visor = mesh(roundedBox(1.05, 0.5, 0.1, 0.16, 0.03), dark, false);
    visor.position.set(0, 0.1, 0.47);
    head.add(visor);
    const eyes = [-1, 1].map(s => {
      const e = mesh(roundedBox(0.2, 0.26, 0.04, 0.08, 0.015), led, false);
      e.position.set(0.25 * s, 0.14, 0.52);
      head.add(e);
      return e;
    });
    const brows = [-1, 1].map(s => {
      const b = mesh(roundedBox(0.24, 0.05, 0.03, 0.02, 0.01), led, false);
      b.position.set(0.25 * s, 0.33, 0.52);
      b.rotation.z = -0.25 * s;
      head.add(b);
      return b;
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
    antenna.position.y = 0.45;
    const stem = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), dark);
    stem.position.y = 0.15;
    const tip = mesh(new THREE.OctahedronGeometry(0.1), glow, false);
    tip.position.y = 0.36;
    antenna.add(stem, tip);
    head.add(antenna);

    const glove = s => {
      const g = new THREE.Group();
      const cuff = mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.12, 20), dark);
      cuff.position.y = -0.02;
      const body = mesh(roundedBox(0.42, 0.44, 0.46, 0.17, 0.05), blue);
      body.position.y = 0.26;
      const knuckle = mesh(roundedBox(0.4, 0.14, 0.4, 0.06, 0.03), navy, false);
      knuckle.position.set(0, 0.47, 0.02);
      const thumb = mesh(new THREE.SphereGeometry(1, 16, 12), blue);
      thumb.scale.set(0.09, 0.15, 0.1);
      thumb.rotation.z = 0.6 * s;
      thumb.position.set(-0.2 * s, 0.24, 0.17);
      const lace = mesh(new THREE.TorusGeometry(0.18, 0.022, 8, 24), white, false);
      lace.rotation.x = Math.PI / 2;
      lace.position.y = 0.06;
      g.add(cuff, body, knuckle, thumb, lace);
      return g;
    };

    const arms = [-1, 1].map(s => {
      const shoulder = new THREE.Group();
      shoulder.position.set(0.86 * s, 0.44 + CH - 0.14, 0.12);
      upper.add(shoulder);
      const joint = mesh(new THREE.SphereGeometry(0.17, 18, 12), dark);
      const upperArm = mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.58, 16), dark);
      upperArm.position.y = -0.29;
      const armPlate = mesh(roundedBox(0.26, 0.38, 0.3, 0.1, 0.03), white);
      armPlate.position.y = -0.27;
      shoulder.add(joint, upperArm, armPlate);
      const elbow = new THREE.Group();
      elbow.position.y = -0.58;
      shoulder.add(elbow);
      const ejoint = mesh(new THREE.SphereGeometry(0.14, 16, 12), dark);
      const forearm = mesh(roundedBox(0.3, 0.56, 0.3, 0.1, 0.03), white);
      forearm.position.y = 0.3;
      const fband = mesh(roundedBox(0.33, 0.08, 0.33, 0.04, 0.012), navy, false);
      fband.position.y = 0.14;
      const fband2 = mesh(roundedBox(0.33, 0.08, 0.33, 0.04, 0.012), navy, false);
      fband2.position.y = 0.44;
      elbow.add(ejoint, forearm, fband, fband2);
      const gl = glove(s);
      gl.position.y = 0.62;
      elbow.add(gl);
      return { shoulder, elbow, side: s };
    });

    const hips = mesh(roundedBox(0.86, 0.26, 0.54, 0.1, 0.03), dark);
    hips.position.y = 1.08;
    stance.add(hips);
    const buckle = mesh(roundedBox(0.3, 0.18, 0.06, 0.05, 0.015), steel, false);
    buckle.position.set(0, 1.08, 0.29);
    stance.add(buckle);

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.27 * s, 0, 0);
      const thigh = mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.5, 16), white);
      thigh.position.y = 0.8;
      const knee = mesh(new THREE.SphereGeometry(0.14, 14, 10), dark, false);
      knee.position.y = 0.54;
      const shin = mesh(roundedBox(0.3, 0.42, 0.34, 0.1, 0.03), blue);
      shin.position.y = 0.33;
      const foot = mesh(roundedBox(0.4, 0.16, 0.62, 0.06, 0.025), dark);
      foot.position.set(0, 0.08, 0.08);
      g.add(thigh, knee, shin, foot);
      stance.add(g);
      return g;
    });

    const food = new THREE.Group();
    const cell = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 16), metal(0xf6c443, 0.4), false);
    const cband = mesh(new THREE.CylinderGeometry(0.104, 0.104, 0.08, 16), dark, false);
    const ccap = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 12), steel, false);
    ccap.position.y = 0.2;
    food.add(cell, cband, ccap);
    food.visible = false;
    root.add(food);

    const GUARD = { sh: -0.8, sz: -0.15, el: 2.1 };
    let last = 0;
    let gearAngle = 0;

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
        let sy = 1 + Math.sin(t * 2) * 0.012 * motion;
        let twist = 0;
        let lean = 0;
        let lunge = 0;
        let mouthOpen = false;
        let squint = false;
        let happy = false;
        let coreFlash = 0;
        let gearSpeed = 1;
        const bob = Math.sin(t * 3.2) * 0.04 * motion;
        const pose = arms.map(({ side }) => ({
          sh: GUARD.sh + (side < 0 ? bob : -bob),
          sz: GUARD.sz,
          el: GUARD.el + (side < 0 ? -bob : bob) * 1.5
        }));

        if (a === "jump") {
          if (p < 0.2) sy = 1 - 0.14 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.72) {
            const q = (p - 0.2) / 0.52;
            y = Math.sin(q * Math.PI) * 0.75;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            pose.forEach(o => {
              o.sh = -1.2;
              o.el = 2.3;
            });
          } else {
            const q = (p - 0.72) / 0.28;
            sy = 1 - 0.2 * Math.sin(q * Math.PI) * (1 - q * 0.5);
            lean = Math.sin(q * Math.PI * 3) * 0.03 * (1 - q);
          }
          gearSpeed = 4;
        }

        if (a === "punch") {
          const hits = [
            { side: 0, at: 0.08 },
            { side: 0, at: 0.36 },
            { side: 1, at: 0.66 }
          ];
          hits.forEach(h => {
            const q = (p - h.at) / 0.24;
            if (q <= 0 || q >= 1) return;
            const k = q < 0.35 ? smooth(0, 0.35, q) : 1 - smooth(0.45, 1, q);
            const o = pose[h.side];
            o.sh = lerp(o.sh, -1.5, k);
            o.sz = lerp(o.sz, -0.22, k);
            o.el = lerp(o.el, 3.05, k);
            twist += (h.side === 0 ? 0.28 : -0.38) * k;
            lunge += 0.18 * k;
          });
          squint = true;
          gearSpeed = 6;
        }

        if (a === "flex") {
          const k = smooth(0, 0.18, p) * (1 - smooth(0.85, 1, p));
          const pump = Math.sin(p * Math.PI * 6) * 0.15 * k;
          pose.forEach(o => {
            o.sh = lerp(o.sh, -2.85, k) + pump;
            o.sz = lerp(o.sz, 0.3, k);
            o.el = lerp(o.el, 2.9, k) - Math.abs(pump) * 2;
          });
          sy += Math.abs(pump) * 0.2;
          coreFlash = k * (0.5 + 0.5 * Math.sin(p * Math.PI * 12));
          happy = true;
          gearSpeed = 8;
        }

        if (a === "eat") {
          sy += 0.03 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.04 * motion;
          food.visible = ph.visible;
          const hy = WAIST + HEAD_Y - 0.1;
          food.position.set(0, lerp(4.2, hy, ph.fall * ph.fall), lerp(1.2, 0.5, ph.fall));
          food.rotation.x = ph.fall * (Math.PI / 2);
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = p > 0.12 && p < 0.85;
          mouth.scale.y = 0.6 + ph.chew * 1.2;
          squint = p > 0.3 && p < 0.85;
          pose.forEach(o => {
            o.sh = -0.9;
            o.el = 2.0;
          });
          gearSpeed = p > 0.3 ? 4 : 1.5;
          coreFlash = p > 0.85 ? 1 : 0;
        } else {
          food.visible = false;
        }

        gearAngle += dt * gearSpeed;
        gearA.rotation.z = gearAngle;
        gearB.rotation.z = -gearAngle * (9 / 7) + 0.2;
        gearC.rotation.z = -gearAngle * (9 / 6) + 0.4;
        vLed.visible = coreFlash > 0.05 || Math.sin(t * 2.2) > -0.2;
        vLed.scale.set(1 + coreFlash * 0.03, 1 + coreFlash * 0.03, 1);

        const sx = 1 / Math.sqrt(sy);
        stance.scale.set(sx, sy, sx);
        root.position.y = y;
        root.rotation.y = lookYaw * 0.3;
        stance.rotation.z = lean + Math.sin(t * 1.6) * 0.02 * motion;
        upper.rotation.y = twist;
        upper.rotation.x = lunge * 0.35;
        upper.position.z = 0;
        root.position.z = lunge * 0.7;

        arms.forEach(({ shoulder, elbow, side }, i) => {
          const o = pose[i];
          shoulder.rotation.x = lerp(shoulder.rotation.x, o.sh, 0.28);
          shoulder.rotation.z = lerp(shoulder.rotation.z, o.sz * side, 0.28);
          elbow.rotation.x = lerp(elbow.rotation.x, o.el, 0.28);
        });

        legs.forEach((g, i) => {
          g.rotation.x = a === "punch" ? (i ? -0.08 : 0.12) * Math.min(1, lunge * 5) : 0;
        });
        pauldrons.forEach((g, i) => {
          g.rotation.x = Math.sin(t * 3.2 + i) * 0.03 * motion;
        });

        head.rotation.y = lookYaw * 0.6 - twist * 0.6;
        head.rotation.x = lookPitch;
        head.position.y = HEAD_Y + Math.sin(t * 2.4) * 0.012 * motion;
        antenna.rotation.z = Math.sin(t * 1.7) * 0.1 * motion;
        tip.scale.setScalar(1 + coreFlash * 0.5 + Math.sin(t * 4) * 0.1 * motion);

        mouth.visible = mouthOpen;
        smile.visible = !mouthOpen;
        brows.forEach((b, i) => {
          b.visible = !happy;
          b.rotation.z = (i ? 1 : -1) * (a === "punch" ? 0.45 : 0.25);
        });
        eyes.forEach((e, i) => {
          const base = i === 0 ? -0.25 : 0.25;
          e.position.x = lerp(e.position.x, base + pointer.x * 0.07, 0.2);
          e.position.y = lerp(e.position.y, 0.14 + pointer.y * 0.04, 0.2);
          e.scale.y = squint ? 0.35 : happy ? 0.55 : blink;
        });
      }
    };
  }
});
