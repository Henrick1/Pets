Pets.register({
  id: "chamisco",
  dex: 15,
  name: "Chamisco",
  color: "#ff9a4a",
  types: ["fire"],
  description: "Um filhote de raposa arisco que ainda não sabe controlar o próprio fogo. As pontas das orelhas e do rabo ficam sempre em brasa, e quando se assusta ele espirra uma chuva de faíscas.",
  evolvesTo: "brasa",
  evolveLevel: 16,
  actions: {
    jump: { duration: 0.9 },
    eat: { duration: 2.4 },
    sneeze: { duration: 1.6 },
    attack: { duration: 1.0 }
  },
  battle: { special: { action: "sneeze", hit: 0.5, speed: 1.3 } },
  idle: [
    { action: "sneeze", min: 25, max: 55 },
    { action: "jump", min: 35, max: 70 }
  ],
  clickAction: n => ["jump", "sneeze", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const hexMix = (a, b, k) => {
      const ca = hexParts(a);
      const cb = hexParts(b);
      return (Math.round(lerp(ca[0], cb[0], k) * 255) << 16) | (Math.round(lerp(ca[1], cb[1], k) * 255) << 8) | Math.round(lerp(ca[2], cb[2], k) * 255);
    };
    const paint = (geo, bottom, top, y0, y1) => {
      const pos = geo.attributes.position;
      const out = new Float32Array(pos.count * 3);
      const cb = hexParts(bottom);
      const ct = hexParts(top);
      for (let i = 0; i < pos.count; i++) {
        const k = Math.max(0, Math.min(1, (pos.getY(i) - y0) / (y1 - y0)));
        out[i * 3] = lerp(cb[0], ct[0], k);
        out[i * 3 + 1] = lerp(cb[1], ct[1], k);
        out[i * 3 + 2] = lerp(cb[2], ct[2], k);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(out, 3));
      return geo;
    };

    const flameGeo = (h, w, bend) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        const r = w * Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.3 * u);
        pts.push(new THREE.Vector2(Math.max(r, 0.0001), u * h));
      }
      const g = new THREE.LatheGeometry(pts, 16);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getY(i) / h;
        pos.setX(i, pos.getX(i) + bend * h * u * u);
      }
      g.computeVertexNormals();
      return g;
    };
    const flames = [];
    const flame = (h, w, bend, outer, inner, phase) => {
      const g = new THREE.Group();
      const o = new THREE.Mesh(flameGeo(h, w, bend), new THREE.MeshBasicMaterial({ color: outer, transparent: true, opacity: 0.94 }));
      const i = new THREE.Mesh(flameGeo(h * 0.66, w * 0.56, bend * 0.7), new THREE.MeshBasicMaterial({ color: inner }));
      i.position.z = 0.002;
      g.add(o, i);
      const f = { g, phase, base: 1 };
      flames.push(f);
      return f;
    };

    const furMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    const creamMat = mat(0xffe0b0, 0.8);
    const fluffMat = mat(0xfff0d0, 0.85);
    const darkMat = mat(0x3a1610, 0.6);
    const orangeMat = mat(0xf2702a, 0.7);
    const thighMat = mat(0xeb6424, 0.7);
    const armMat = mat(0xe0601f, 0.7);
    const emberMat = new THREE.MeshStandardMaterial({ color: 0xffc04a, roughness: 0.3, emissive: 0xff7a1a, emissiveIntensity: 1 });
    const mouthMat = mat(0x5a1018, 0.4);
    const lashMat = mat(0x2a0a06, 0.5);
    const irisMat = new THREE.MeshStandardMaterial({ color: 0xffb03a, roughness: 0.3, emissive: 0xff7a1a, emissiveIntensity: 0.35 });

    const body = mesh(paint(new THREE.SphereGeometry(1, 40, 30), 0xc8481a, 0xff8a3a, -0.9, 0.9), furMat);
    body.scale.set(0.52, 0.5, 0.47);
    body.position.y = 0.66;
    squash.add(body);

    const belly = mesh(new THREE.SphereGeometry(1, 28, 20), creamMat, false);
    belly.scale.set(0.33, 0.37, 0.24);
    belly.position.set(0, 0.64, 0.3);
    squash.add(belly);

    [-1, 1].forEach(s => {
      const thigh = mesh(new THREE.SphereGeometry(1, 22, 16), thighMat);
      thigh.scale.set(0.19, 0.2, 0.22);
      thigh.position.set(0.31 * s, 0.38, 0.04);
      squash.add(thigh);
    });

    const feet = [-1, 1].map(s => {
      const f = new THREE.Group();
      f.position.set(0.25 * s, 0.11, 0.1);
      const sole = mesh(new THREE.SphereGeometry(1, 22, 14), darkMat);
      sole.scale.set(0.17, 0.11, 0.25);
      f.add(sole);
      [-1, 0, 1].forEach(k => {
        const toe = mesh(new THREE.SphereGeometry(0.055, 12, 8), darkMat, false);
        toe.position.set(0.066 * k, -0.015, 0.2 - Math.abs(k) * 0.03);
        f.add(toe);
      });
      squash.add(f);
      return f;
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.44 * s, 0.86, 0.08);
      const a = mesh(new THREE.SphereGeometry(1, 18, 12), armMat);
      a.scale.set(0.1, 0.24, 0.1);
      a.position.set(0.03 * s, -0.16, 0);
      const paw = mesh(new THREE.SphereGeometry(1, 18, 12), darkMat);
      paw.scale.set(0.115, 0.12, 0.12);
      paw.position.set(0.04 * s, -0.37, 0.02);
      const bean = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), emberMat);
      bean.scale.z = 0.5;
      bean.position.set(0.04 * s, -0.39, 0.13);
      pivot.add(a, paw, bean);
      squash.add(pivot);
      return { pivot, side: s };
    });

    const head = new THREE.Group();
    head.position.y = 1.42;
    squash.add(head);

    const skull = mesh(paint(new THREE.SphereGeometry(1, 52, 38), 0xe0581c, 0xff9a40, -0.7, 0.7), furMat);
    skull.scale.set(0.76, 0.64, 0.68);
    head.add(skull);

    const snout = mesh(new THREE.SphereGeometry(1, 30, 22), creamMat, false);
    snout.scale.set(0.28, 0.18, 0.24);
    snout.position.set(0, -0.17, 0.6);
    head.add(snout);
    const bridge = mesh(new THREE.SphereGeometry(1, 24, 18), orangeMat, false);
    bridge.scale.set(0.17, 0.12, 0.28);
    bridge.position.set(0, -0.04, 0.56);
    bridge.rotation.x = 0.35;
    head.add(bridge);

    const nose = mesh(new THREE.SphereGeometry(0.055, 16, 12), darkMat, false);
    nose.scale.set(1.25, 0.85, 0.9);
    nose.position.set(0, -0.1, 0.83);
    head.add(nose);

    const smile = mesh(new THREE.TorusGeometry(0.075, 0.018, 10, 22, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.21, 0.82);
    head.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.09, 20, 14), mouthMat, false);
    openMouth.scale.set(1, 0.9, 0.4);
    openMouth.position.set(0, -0.25, 0.8);
    openMouth.visible = false;
    head.add(openMouth);
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -0.24, 0.92);
    head.add(muzzle);

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 1.05, whiteColor: 0xfff4d6, pupilColor: 0x2a0806 });
      e.g.position.set(0.33 * s, 0.03, 0.52);
      e.g.rotation.z = -0.1 * s;
      const iris = mesh(new THREE.SphereGeometry(0.155, 28, 20), irisMat, false);
      iris.scale.set(1, 1.1, 0.5);
      iris.position.z = -0.012;
      e.pupil.add(iris);
      e.pupil.scale.set(0.86, 0.94, 0.5);
      const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine2.position.set(-0.05, -0.06, 0.09);
      e.pupil.add(shine2);
      const lid = mesh(new THREE.TorusGeometry(0.215, 0.022, 8, 28, Math.PI * 0.95), lashMat, false);
      lid.scale.set(1, 1.12, 1);
      lid.position.z = 0.04;
      lid.rotation.z = 0.08;
      e.g.add(lid);
      head.add(e.g);
      return e;
    });

    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: 0.55 });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), cheekMat);
      c.scale.set(1, 0.65, 1);
      const x = 0.54 * s;
      const y = -0.18;
      const z = 0.68 * Math.sqrt(1 - Math.pow(x / 0.76, 2) - Math.pow(y / 0.64, 2)) * 1.01;
      c.position.set(x, y, z);
      c.lookAt(x * 2, y * 2, z * 2.2);
      head.add(c);
    });

    [-1, 1].forEach(s => {
      [0, 1].forEach(k => {
        const tuft = mesh(new THREE.ConeGeometry(0.085 - k * 0.012, 0.3 - k * 0.06, 12), orangeMat, false);
        const g = new THREE.Group();
        g.position.set(0.7 * s, -0.12 - k * 0.1, 0.06);
        g.rotation.z = (1.3 + k * 0.3) * -s;
        tuft.position.y = 0.14;
        g.add(tuft);
        head.add(g);
      });
      const c = mesh(new THREE.ConeGeometry(0.075, 0.26, 12), creamMat, false);
      const g = new THREE.Group();
      g.position.set(0.62 * s, -0.32, 0.18);
      g.rotation.z = 2.0 * -s;
      c.position.y = 0.12;
      g.add(c);
      head.add(g);
    });

    const ears = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.42 * s, 0.46, -0.02);
      const outer = mesh(paint(new THREE.ConeGeometry(0.3, 0.74, 22), 0xff7a2a, 0x5a1a0e, -0.37, 0.37), furMat);
      outer.scale.z = 0.5;
      outer.position.y = 0.34;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.52, 20), new THREE.MeshBasicMaterial({ color: 0xffc070 }));
      inner.scale.z = 0.3;
      inner.position.set(0, 0.26, 0.11);
      g.add(outer, inner);
      [-1, 0, 1].forEach(k => {
        const f = mesh(new THREE.ConeGeometry(0.045, 0.2 - Math.abs(k) * 0.04, 10), fluffMat, false);
        f.position.set(0.07 * k, 0.1, 0.14);
        f.rotation.set(0.25, 0, -0.35 * k);
        g.add(f);
      });
      const ember = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), emberMat);
      ember.position.y = 0.68;
      g.add(ember);
      const tip = flame(0.16, 0.045, 0.1, 0xff6a1a, 0xffd23a, s * 1.7);
      tip.g.position.y = 0.7;
      tip.base = 0.9;
      g.add(tip.g);
      g.rotation.z = -0.36 * s;
      head.add(g);
      return { g, side: s };
    });

    const tuft = flame(0.34, 0.1, -0.4, 0xff6a1a, 0xffd23a, 0.4);
    tuft.g.position.set(0, 0.58, 0.12);
    tuft.g.rotation.x = 0.3;
    head.add(tuft.g);

    const tailSpec = { n: 9, len: 0.17, r0: 0.22, curl: 0.2 };
    const tailOuter = new THREE.Group();
    tailOuter.position.set(0, 0.52, -0.38);
    const tailRoot = new THREE.Group();
    tailRoot.rotation.x = -1.0;
    tailOuter.add(tailRoot);
    const tailSegs = [];
    let parent = tailRoot;
    for (let i = 0; i < tailSpec.n; i++) {
      const u = i / (tailSpec.n - 1);
      const g = new THREE.Group();
      g.position.y = i === 0 ? 0 : tailSpec.len;
      const col = u < 0.65 ? hexMix(0xd8521c, 0xff9a40, u / 0.65) : hexMix(0xff9a40, 0x4a160c, (u - 0.65) / 0.35);
      const m = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6, emissive: u > 0.8 ? 0xff5a10 : 0x000000, emissiveIntensity: u > 0.8 ? 0.6 : 0 });
      const r = tailSpec.r0 * (1 - 0.7 * Math.pow(Math.abs(u - 0.35) / 0.65, 1.4)) * (u < 0.35 ? 0.55 + u * 1.3 : 1);
      const seg = mesh(new THREE.SphereGeometry(1, 18, 12), m);
      seg.scale.set(r, tailSpec.len * 0.75, r);
      seg.position.y = tailSpec.len * 0.45;
      g.add(seg);
      parent.add(g);
      tailSegs.push(g);
      parent = g;
    }
    const tailTip = flame(0.42, 0.12, 0.2, 0xff5a14, 0xffd23a, 2.2);
    tailTip.g.position.y = tailSpec.len * 0.55;
    parent.add(tailTip.g);
    squash.add(tailOuter);

    const emberHot = new THREE.MeshBasicMaterial({ color: 0xffd36a });
    const embers = [];
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), emberHot);
      squash.add(m);
      embers.push({ m, ph: Math.random(), rad: 0.55 + Math.random() * 0.5, sp: 0.1 + Math.random() * 0.1, size: 0.025 + Math.random() * 0.03, a: Math.random() * Math.PI * 2, w: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8) });
    }
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffc04a, transparent: true });
    const sparks = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), sparkMat);
      m.visible = false;
      root.add(m);
      const a = (i / 14) * Math.PI * 2;
      sparks.push({ m, dx: Math.cos(a) * (0.35 + (i % 3) * 0.18), dy: Math.sin(a) * 0.45 + 0.25, dz: 1.0 + (i % 4) * 0.28, s: 0.04 + (i % 3) * 0.015 });
    }

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.92, 48), new THREE.MeshBasicMaterial({ color: 0xff8a2e, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);

    const glow = new THREE.PointLight(0xff8a3a, 0.5, 5);
    glow.position.set(0, 1.1, 0.8);
    squash.add(glow);

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      muzzle,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const sneeze = action && action.name === "sneeze" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const atk = action && action.name === "attack" ? strike(action.p) : null;
        const fire = s.dying ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        let y = 0;
        let sy = 1 + Math.sin(t * 2.4) * 0.025 * motion;
        let spin = 0;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let pre = 0;
        let burst = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.18) sy = 1 - 0.22 * Math.sin((p / 0.18) * Math.PI / 2);
          else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.1;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            airborne = true;
            if (jump.n % 3 === 0 && !reduceMotion) spin = q * Math.PI * 2;
          } else sy = 1 - 0.2 * Math.sin(((p - 0.78) / 0.22) * Math.PI);
        }
        if (sneeze) {
          const p = sneeze.p;
          pre = smooth(0.05, 0.42, p) * (1 - smooth(0.44, 0.5, p));
          burst = smooth(0.44, 0.5, p) * (1 - smooth(0.6, 1, p));
          sy += pre * 0.06 - burst * 0.12;
          mouthOpen = pre > 0.5 || burst > 0.1;
          squint = pre > 0.3 || burst > 0.2;
        }
        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.1 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, 1.26, ph.fall * ph.fall), lerp(0.8, 0.95, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          openMouth.scale.y = 0.6 + ph.chew * 0.6;
        } else {
          food.visible = false;
          openMouth.scale.y = sneeze ? 0.5 + pre * 0.5 + burst * 0.5 : 0.9;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.y = y;
        root.position.z = sneeze ? -burst * 0.12 : 0;
        root.rotation.y = lookYaw + spin;
        root.rotation.x = lookPitch;
        const happy = eat ? Math.sin(eat.p * Math.PI * 8) * 0.04 * motion : 0;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.4) * 0.035 * motion + happy;

        head.rotation.z = Math.sin(t * 1.1) * 0.06 * motion + (eat ? Math.sin(eat.p * Math.PI * 6) * 0.06 : 0);
        head.rotation.x = sneeze ? -pre * 0.3 + burst * 0.35 : 0;

        const open = airborne || mouthOpen;
        smile.visible = !open;
        openMouth.visible = open;

        ears.forEach(({ g, side }, i) => {
          const flick = Math.max(0, Math.sin(t * 0.8 + i * 2.4) - 0.96) * 18;
          const perk = (eat ? 0.12 : 0) + (airborne ? 0.18 : 0) - burst * 0.3;
          g.rotation.z = lerp(g.rotation.z, (-0.36 + perk) * side + flick * side * 0.5, 0.2);
        });

        arms.forEach(({ pivot, side }) => {
          const target = airborne ? 2.3 : sneeze ? 0.3 + pre * 0.4 : eat ? 1.0 : 0.3 + Math.sin(t * 3 + side) * 0.1 * motion;
          pivot.rotation.z = lerp(pivot.rotation.z, target * side, 0.2);
          pivot.rotation.x = lerp(pivot.rotation.x, sneeze ? -pre * 0.9 : 0, 0.2);
        });

        feet.forEach(f => {
          f.position.y = airborne ? 0.03 : 0.11;
        });

        const k = (1 + burst * 0.9) * fire;
        flames.forEach(f => {
          const flick = 1 + 0.14 * Math.sin(t * 10 + f.phase * 3) + 0.07 * Math.sin(t * 19 + f.phase * 5);
          const wide = 1 + 0.08 * Math.sin(t * 7 + f.phase * 2);
          f.g.scale.set(wide * k, Math.max(0.05, flick * k * f.base), wide * k);
        });
        tuft.g.rotation.z = Math.sin(t * 3) * 0.12 * motion;
        tailTip.base = 1 + burst * 1.2;

        const wag = eat ? 2.6 : jump ? 2.2 : 1;
        tailOuter.rotation.y = Math.sin(t * 1.3 * wag) * 0.18 * motion;
        tailSegs.forEach((g, i) => {
          if (i === 0) return;
          const u = i / tailSegs.length;
          const wave = Math.sin(t * 2.4 * wag - i * 0.55) * (0.05 + u * 0.1) * motion;
          g.rotation.x = tailSpec.curl + wave + (airborne ? 0.12 : 0) - burst * 0.1;
          g.rotation.z = Math.sin(t * 1.7 * wag - i * 0.4) * 0.07 * u * motion;
        });

        embers.forEach(e => {
          const u = (((t * e.sp * (1 + burst * 2) + e.ph) % 1) + 1) % 1;
          const a = e.a + t * e.w * 0.5;
          e.m.position.set(Math.sin(a) * e.rad * (0.6 + u * 0.5), 0.2 + u * 2.4, Math.cos(a) * e.rad * (0.6 + u * 0.5));
          e.m.rotation.set(t * 2 + e.ph * 6, t * 1.7, 0);
          e.m.scale.setScalar(Math.max(0.001, e.size * Math.sin(Math.PI * u) * (0.4 + fire * 0.6)));
        });

        const sp = sneeze ? smooth(0.44, 0.95, sneeze.p) : 0;
        sparkMat.opacity = 1 - sp;
        sparks.forEach(q => {
          q.m.visible = !!sneeze && sp > 0 && sp < 1;
          if (!q.m.visible) return;
          const e = 1 - Math.pow(1 - sp, 2);
          q.m.position.set(q.dx * e, 1.2 + q.dy * e - sp * sp * 0.6, 0.9 + q.dz * e);
          q.m.rotation.set(t * 6 + q.dx * 9, t * 5, 0);
          q.m.scale.setScalar(q.s * (1 - sp * 0.6));
        });

        emberMat.emissiveIntensity = (0.7 + Math.sin(t * 4) * 0.25 * motion + burst * 1.2) * (0.5 + fire * 0.5);
        ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05 * motion + burst * 0.6);
        ring.material.opacity = (0.2 + 0.08 * Math.sin(t * 2.4) + burst * 0.3) * fire;
        glow.intensity = (0.4 + Math.sin(t * 9) * 0.05 + burst * 1.4) * fire;

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.1 : squint ? 0.35 : blink;
        });
        if (atk) {
          const crouch = atk.wind * 0.2;
          squash.scale.set(1 + crouch * 0.5, 1 - crouch + atk.lunge * 0.08, 1 + crouch * 0.5);
          root.position.y = Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.3;
          root.position.z = atk.lunge * 0.6 - atk.wind * 0.18;
          root.rotation.x = lookPitch + atk.lunge * 0.35 - atk.wind * 0.25;
          head.rotation.x = -atk.wind * 0.2 + atk.lunge * 0.15;
          arms.forEach(({ pivot, side }) => {
            const lead = side > 0 ? 1 : 0.55;
            pivot.rotation.z = side * (0.3 + atk.wind * 2.2 * lead - atk.impact * 1.5 * lead);
            pivot.rotation.x = -atk.lunge * 1.1 * lead;
          });
          smile.visible = atk.lunge < 0.2;
          openMouth.visible = !smile.visible;
          openMouth.scale.y = 0.7 + atk.lunge * 0.6;
          eyes.forEach(({ g }) => (g.scale.y = atk.lunge > 0.4 ? 0.5 : blink));
          tailOuter.rotation.x = -atk.wind * 0.3 + atk.lunge * 0.2;
        } else tailOuter.rotation.x = 0;
        followPupils(eyes, pointer);
      }
    };
  }
});
