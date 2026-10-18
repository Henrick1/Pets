Pets.register({
  id: "axolinho",
  name: "Axolinho",
  color: "#c48ae8",
  types: ["poison"],
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    bubble: { duration: 2.2 }
  },
  idle: [
    { action: "bubble", min: 25, max: 50 },
    { action: "jump", min: 35, max: 70 }
  ],
  clickAction: n => ["jump", "bubble", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;

    const std = (color, rough = 0.55, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

    const skin = std(0xfce8ee);
    const slimeMat = std(0x7b3fb0, 0.15, {
      emissive: 0x3a1470,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9
    });
    const lumpMat = std(0x9a5cd0, 0.12, {
      emissive: 0x4a1c88,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const dotMat = std(0x9a52d8, 0.3, { emissive: 0x2a1055, emissiveIntensity: 0.35 });
    const stalkMat = std(0xa24fc4, 0.5);
    const filMat = std(0xd16bd8, 0.5);
    const finMat = std(0xe6c4f2, 0.5, { transparent: true, opacity: 0.85, side: THREE.DoubleSide });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x8a3b58 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xffa6c1, transparent: true, opacity: 0.7 });

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const CY = 0.92;
    const RX = 0.97;
    const RY = 0.86;
    const RZ = 0.9;

    const surf = (lon, lat, k = 1) =>
      new THREE.Vector3(
        RX * Math.cos(lat) * Math.sin(lon) * k,
        CY + RY * Math.sin(lat) * k,
        RZ * Math.cos(lat) * Math.cos(lon) * k
      );

    const outward = (lon, lat) =>
      new THREE.Vector3(
        (Math.cos(lat) * Math.sin(lon)) / RX,
        Math.sin(lat) / RY,
        (Math.cos(lat) * Math.cos(lon)) / RZ
      ).normalize();

    const stick = (m, lon, lat, k) => {
      const p = surf(lon, lat, k);
      const n = outward(lon, lat);
      m.position.copy(p);
      m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z);
      return m;
    };

    const body = mesh(new THREE.SphereGeometry(1, 64, 48), skin);
    body.scale.set(RX, RY, RZ);
    body.position.y = CY;
    squash.add(body);

    [
      [0.0, 0.62, 0.13],
      [0.48, 0.5, 0.1],
      [-0.5, 0.52, 0.11],
      [0.95, 0.72, 0.09],
      [-0.9, 0.78, 0.1],
      [1.9, 0.45, 0.12],
      [-2.0, 0.5, 0.11],
      [2.8, 0.55, 0.13],
      [3.6, 0.2, 0.1],
      [2.4, 0.05, 0.09],
      [-2.5, 0.12, 0.1]
    ].forEach(([lon, lat, r]) => {
      const d = mesh(new THREE.SphereGeometry(1, 20, 12), dotMat, false);
      d.scale.set(r * 1.3, r, 0.02);
      squash.add(stick(d, lon, lat, 0.995));
    });

    const capGroup = new THREE.Group();
    capGroup.position.y = CY + RY * 0.86;
    squash.add(capGroup);
    [
      [0, 0, 0, 0.5, 0.2, 0.46],
      [0.24, 0, 0.16, 0.24, 0.14, 0.22],
      [-0.26, 0, 0.1, 0.22, 0.13, 0.22],
      [0.05, 0, -0.3, 0.26, 0.14, 0.22]
    ].forEach(([x, y, z, sx, sy, sz]) => {
      const b = mesh(new THREE.SphereGeometry(1, 28, 18), slimeMat, false);
      b.scale.set(sx, sy, sz);
      b.position.set(x, y, z);
      capGroup.add(b);
    });
    const capDrips = [0.7, -0.9, 2.9].map((lon, i) => {
      const d = mesh(new THREE.SphereGeometry(1, 14, 10), slimeMat, false);
      d.scale.set(0.05, 0.08, 0.05);
      d.position.copy(surf(lon, 0.95, 0.99));
      squash.add(d);
      return { d, ph: i * 2.1 };
    });
    [
      [0.1, 0.18, 0.12, 0.07],
      [-0.16, 0.16, -0.05, 0.055],
      [0.2, 0.12, -0.2, 0.05]
    ].forEach(([x, y, z, r]) => {
      const l = mesh(new THREE.SphereGeometry(1, 16, 12), lumpMat, false);
      l.scale.setScalar(r);
      l.position.set(x, y, z);
      capGroup.add(l);
    });

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.8, whiteColor: 0x14101c, pupilColor: 0x14101c });
      e.g.position.copy(surf(0.4 * s, 0.14, 0.96));
      e.g.rotation.y = 0.4 * s;
      squash.add(e.g);
      return e;
    });

    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), blushMat);
      c.scale.set(1, 0.65, 1);
      squash.add(stick(c, 0.72 * s, -0.1, 1.006));
      const n = mesh(new THREE.SphereGeometry(0.018, 8, 8), mouthMat, false);
      n.position.copy(surf(0.09 * s, -0.02, 1.0));
      squash.add(n);
    });

    const smilePts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 8 - 1;
      const x = 0.3 * u;
      const y = 0.79 - 0.08 * (1 - u * u);
      const dy = (y - CY) / RY;
      const z = RZ * Math.sqrt(Math.max(0, 1 - Math.pow(x / RX, 2) - dy * dy)) + 0.004;
      smilePts.push(new THREE.Vector3(x, y, z));
    }
    const smile = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smilePts), 32, 0.022, 8, false), mouthMat, false);
    squash.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.12, 20, 14), mouthMat, false);
    openMouth.scale.set(1.2, 0.8, 0.35);
    openMouth.position.set(0, 0.73, 0.86);
    openMouth.visible = false;
    squash.add(openMouth);

    const stalkGeo = new THREE.ConeGeometry(0.055, 1, 10);
    const filGeo = new THREE.ConeGeometry(0.017, 1, 6);
    const gills = [];
    [-1, 1].forEach(s => {
      [
        [1.12, 0.62, 0.95, 0.46],
        [1.25, 0.36, 0.45, 0.42],
        [1.3, 0.1, -0.05, 0.36]
      ].forEach(([lon, lat, up, len], i) => {
        const base = new THREE.Group();
        base.position.copy(surf(lon * s, lat, 0.97));
        const dir = new THREE.Vector3(s, up, -0.2).normalize();
        base.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const wig = new THREE.Group();
        base.add(wig);
        const stalk = mesh(stalkGeo, stalkMat, false);
        stalk.scale.y = len;
        stalk.position.y = len / 2;
        wig.add(stalk);
        [0.3, 0.55, 0.8].forEach((t, k) => {
          [-1, 1].forEach(side => {
            const f = mesh(filGeo, filMat, false);
            const fl = 0.13 - k * 0.025;
            const holder = new THREE.Group();
            holder.position.y = len * t;
            holder.rotation.z = side * 0.95;
            f.scale.y = fl;
            f.position.y = fl / 2;
            holder.add(f);
            wig.add(holder);
          });
        });
        squash.add(base);
        gills.push({ wig, side: s, i });
      });
    });

    const feet = [
      [-0.34, 0.22],
      [0.34, 0.22],
      [-0.33, -0.24],
      [0.33, -0.24]
    ].map(([x, z]) => {
      const f = mesh(new THREE.SphereGeometry(1, 20, 14), skin);
      f.scale.set(0.15, 0.1, 0.19);
      f.position.set(x, 0.1, z);
      squash.add(f);
      return f;
    });

    const tail = new THREE.Group();
    tail.position.set(0, 0.62, -0.78);
    squash.add(tail);
    const tailBody = mesh(new THREE.SphereGeometry(1, 20, 14), skin);
    tailBody.scale.set(0.12, 0.13, 0.28);
    tailBody.position.z = -0.16;
    const tailFin = mesh(new THREE.SphereGeometry(1, 20, 14), finMat, false);
    tailFin.scale.set(0.02, 0.2, 0.26);
    tailFin.position.set(0, 0.03, -0.24);
    tail.add(tailBody, tailFin);

    const floaters = [];
    for (let i = 0; i < 3; i++) {
      const m = std(0xb27ae0, 0.1, { transparent: true, opacity: 0, emissive: 0x5a2a99, emissiveIntensity: 0.3, depthWrite: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), m);
      squash.add(b);
      floaters.push({ b, m, i });
    }

    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const m = std(0xa060d8, 0.1, { transparent: true, opacity: 0, emissive: 0x6a2ab0, emissiveIntensity: 0.6, depthWrite: false });
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), m);
      b.visible = false;
      root.add(b);
      puffs.push({
        b,
        m,
        delay: i * 0.06,
        dir: [Math.sin(i * 2.4) * 0.45, 0.25 + Math.cos(i * 1.7) * 0.2, 1],
        size: 0.06 + (i % 3) * 0.025
      });
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const bub = action && action.name === "bubble" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.025 * motion;
        let sxExtra = 0;
        let spin = 0;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let flare = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.18) {
            sy = 1 - 0.22 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.2;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            airborne = true;
            if (jump.n % 3 === 0 && !reduceMotion) spin = q * Math.PI * 2;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.2 * Math.sin(q * Math.PI);
          }
        }

        let blowP = -1;
        if (bub) {
          const p = bub.p;
          const puff = smooth(0, 0.3, p) * (1 - smooth(0.32, 0.42, p));
          sxExtra = puff * 0.1;
          sy -= puff * 0.05;
          squint = p < 0.35;
          flare = smooth(0.3, 0.4, p) * (1 - smooth(0.75, 1, p));
          mouthOpen = p > 0.34 && p < 0.8;
          blowP = p;
        }

        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.1 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, 0.78, ph.fall * ph.fall), lerp(0.8, 1.0, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          openMouth.scale.y = 0.6 + ph.chew * 0.6;
        } else {
          food.visible = false;
          openMouth.scale.y = bub ? 0.9 : 0.8;
        }

        const sx = 1 / Math.sqrt(sy) + sxExtra;
        squash.scale.set(sx, sy, 1 / Math.sqrt(sy));
        root.position.y = y;
        root.rotation.y = lookYaw + spin;
        root.rotation.x = lookPitch;
        const happy = eat ? Math.sin(eat.p * Math.PI * 8) * 0.04 * motion : 0;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.3) * 0.04 * motion + happy;

        smile.visible = !(airborne || mouthOpen);
        openMouth.visible = airborne || mouthOpen;

        const speed = eat || jump ? 9 : bub ? 12 : 3;
        gills.forEach(({ wig, side, i }) => {
          const wave = Math.sin(t * speed + i * 0.9) * (0.08 + flare * 0.1) * motion;
          wig.rotation.z = lerp(wig.rotation.z, side * (flare * 0.35 + (airborne ? 0.25 : 0)) + wave, 0.25);
          wig.rotation.x = Math.sin(t * speed * 0.7 + i) * 0.05 * motion;
        });

        tail.rotation.y = Math.sin(t * (eat || jump ? 10 : 2.4)) * (eat || jump ? 0.45 : 0.25) * motion;
        tail.rotation.x = airborne ? -0.3 : 0;

        capDrips.forEach(({ d, ph: dp }) => {
          d.scale.y = 0.08 * (1 + 0.25 * Math.sin(t * 1.5 + dp) * motion);
        });

        feet.forEach((f, i) => {
          f.position.y = airborne ? 0.04 : 0.1;
          f.rotation.x = airborne ? 0.4 * (i < 2 ? -1 : 1) : 0;
        });

        floaters.forEach(({ b, m, i }) => {
          const f = (t * 0.25 + i / 3) % 1;
          b.position.set(Math.sin(i * 2.3) * 0.25 + Math.sin(t * 1.5 + i) * 0.05, CY + RY + 0.1 + f * 0.9, -0.1 + i * 0.1);
          b.scale.setScalar(0.035 + 0.015 * (i % 2));
          m.opacity = Math.sin(f * Math.PI) * 0.5;
        });

        puffs.forEach(({ b, m, delay, dir, size }) => {
          const q = (blowP - 0.38 - delay) / 0.5;
          const on = blowP >= 0 && q > 0 && q < 1;
          b.visible = on;
          if (on) {
            b.position.set(dir[0] * q * 1.1, 0.75 + dir[1] * q * 1.1 + q * 0.2, 0.95 + dir[2] * q * 1.1);
            b.scale.setScalar(size * (0.6 + q * 1.4));
            m.opacity = (1 - q) * 0.75;
          }
        });

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.1 : squint ? 0.35 : blink;
        });
        followPupils(eyes, pointer, 0.6);
      }
    };
  }
});
