Pets.register({
  id: "brasa",
  dex: 15,
  name: "Trichama",
  color: "#ff7a2e",
  types: ["fire"],
  description: "Raposa de fogo com três caudas em chamas. Quanto mais bem alimentada, mais forte queimam as chamas do seu corpo.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    flare: { duration: 2.4 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "flare", hit: 0.42, speed: 1.4 } },
  idle: [
    { action: "flare", min: 25, max: 50 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "flare", "jump", "jump"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const hexMix = (a, b, k) => {
      const ca = hexParts(a);
      const cb = hexParts(b);
      const r = Math.round(lerp(ca[0], cb[0], k) * 255);
      const g = Math.round(lerp(ca[1], cb[1], k) * 255);
      const bl = Math.round(lerp(ca[2], cb[2], k) * 255);
      return (r << 16) | (g << 8) | bl;
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
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const r = w * Math.sin(Math.PI * Math.pow(u, 0.62)) * (1 - 0.3 * u);
        pts.push(new THREE.Vector2(Math.max(r, 0.0001), u * h));
      }
      const g = new THREE.LatheGeometry(pts, 18);
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
      const o = new THREE.Mesh(
        flameGeo(h, w, bend),
        new THREE.MeshBasicMaterial({ color: outer, transparent: true, opacity: 0.94 })
      );
      const i = new THREE.Mesh(
        flameGeo(h * 0.68, w * 0.58, bend * 0.7),
        new THREE.MeshBasicMaterial({ color: inner })
      );
      i.position.z = 0.002;
      g.add(o, i);
      const f = { g, phase, base: 1, kx: 1 };
      flames.push(f);
      return f;
    };

    const furMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
    const creamMat = mat(0xffd9a0, 0.8);
    const darkMat = mat(0x2a0e0a, 0.6);
    const orangeMat = mat(0xe8561e, 0.7);
    const armMat = mat(0xc8451a, 0.7);
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xffc23a,
      roughness: 0.3,
      emissive: 0xff8a1a,
      emissiveIntensity: 0.9
    });
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3a1a14, roughness: 0.85, flatShading: true });
    const crackMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });

    const bodyGeo = paint(new THREE.SphereGeometry(1, 48, 36), 0x5a1810, 0xff6a24, -0.9, 0.9);
    const body = mesh(bodyGeo, furMat);
    body.scale.set(0.68, 0.64, 0.6);
    body.position.y = 0.88;
    squash.add(body);

    const belly = mesh(new THREE.SphereGeometry(1, 32, 24), creamMat, false);
    belly.scale.set(0.42, 0.5, 0.3);
    belly.position.set(0, 0.86, 0.38);
    squash.add(belly);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    core.position.set(0, 0.92, 0.66);
    squash.add(core);
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.17, 0.018, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xff8a1a })
    );
    coreRing.position.copy(core.position);
    squash.add(coreRing);

    const feet = [-1, 1].map(s => {
      const f = new THREE.Group();
      f.position.set(0.32 * s, 0.14, 0.12);
      const sole = mesh(new THREE.SphereGeometry(1, 24, 16), darkMat);
      sole.scale.set(0.22, 0.14, 0.32);
      f.add(sole);
      [-1, 0, 1].forEach(k => {
        const bean = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), glowMat);
        bean.position.set(0.07 * k, 0.04, 0.27 - Math.abs(k) * 0.03);
        f.add(bean);
      });
      squash.add(f);
      return f;
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.6 * s, 1.1, 0.1);
      const a = mesh(new THREE.SphereGeometry(1, 20, 14), armMat);
      a.scale.set(0.13, 0.32, 0.13);
      a.position.set(0.04 * s, -0.22, 0);
      const paw = mesh(new THREE.SphereGeometry(1, 20, 14), darkMat);
      paw.scale.set(0.15, 0.16, 0.16);
      paw.position.set(0.05 * s, -0.5, 0.02);
      pivot.add(a, paw);
      squash.add(pivot);
      return { pivot, side: s };
    });

    const head = new THREE.Group();
    head.position.y = 1.75;
    squash.add(head);

    const skull = mesh(paint(new THREE.SphereGeometry(1, 56, 40), 0xd04418, 0xff7a2e, -0.7, 0.7), furMat);
    skull.scale.set(0.8, 0.66, 0.72);
    head.add(skull);

    const snout = mesh(new THREE.SphereGeometry(1, 32, 24), creamMat, false);
    snout.scale.set(0.32, 0.21, 0.3);
    snout.position.set(0, -0.15, 0.64);
    head.add(snout);

    const nose = mesh(new THREE.SphereGeometry(0.06, 16, 12), darkMat, false);
    nose.scale.set(1.2, 0.8, 0.9);
    nose.position.set(0, -0.08, 0.92);
    head.add(nose);

    const mouthMat = mat(0x5a1018, 0.4);
    const smile = mesh(new THREE.TorusGeometry(0.09, 0.02, 10, 22, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.2, 0.9);
    head.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.1, 20, 14), mouthMat, false);
    openMouth.scale.set(1, 0.9, 0.4);
    openMouth.position.set(0, -0.24, 0.88);
    openMouth.visible = false;
    head.add(openMouth);
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -0.24, 1.0);
    head.add(muzzle);

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.95, whiteColor: 0xfff0c4, pupilColor: 0x3a0f08 });
      e.g.position.set(0.37 * s, 0.05, 0.56);
      e.g.rotation.z = -0.12 * s;
      head.add(e.g);
      return e;
    });

    [-1, 1].forEach(s => {
      const brow = mesh(new THREE.SphereGeometry(1, 16, 10), glowMat, false);
      brow.scale.set(0.16, 0.035, 0.05);
      brow.position.set(0.4 * s, 0.31, 0.5);
      brow.rotation.z = -0.35 * s;
      head.add(brow);
    });

    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff5a3a, transparent: true, opacity: 0.6 });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), cheekMat);
      c.scale.set(1, 0.65, 1);
      const x = 0.58 * s;
      const y = -0.17;
      const z = 0.72 * Math.sqrt(1 - Math.pow(x / 0.8, 2) - Math.pow(y / 0.66, 2)) * 1.01;
      c.position.set(x, y, z);
      c.lookAt(x * 2, y * 2, z * 2.2);
      head.add(c);
    });

    [-1, 1].forEach(s => {
      [0, 1, 2].forEach(k => {
        const tuft = mesh(new THREE.ConeGeometry(0.1 - k * 0.012, 0.42 - k * 0.07, 14), orangeMat, false);
        const g = new THREE.Group();
        g.position.set(0.74 * s, -0.08 - k * 0.1, 0.08 - k * 0.02);
        g.rotation.z = (1.25 + k * 0.28) * -s;
        tuft.position.y = 0.19;
        g.add(tuft);
        head.add(g);
      });
    });

    const ears = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.46 * s, 0.5, -0.02);
      const outer = mesh(paint(new THREE.ConeGeometry(0.32, 0.88, 22), 0xff6a24, 0x7a1e0e, -0.44, 0.44), furMat);
      outer.scale.z = 0.5;
      outer.position.y = 0.4;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.62, 20), new THREE.MeshBasicMaterial({ color: 0xffb454 }));
      inner.scale.z = 0.3;
      inner.position.set(0, 0.3, 0.11);
      const tip = flame(0.34, 0.07, 0.15, 0xff6a1a, 0xffd23a, s * 1.7);
      tip.g.position.y = 0.86;
      tip.base = 0.9;
      g.add(outer, inner, tip.g);
      g.rotation.z = -0.32 * s;
      head.add(g);
      return { g, side: s };
    });

    const crest = [
      { x: 0, h: 0.72, w: 0.16, rz: 0, ph: 0 },
      { x: -0.17, h: 0.5, w: 0.12, rz: 0.42, ph: 1.3 },
      { x: 0.17, h: 0.5, w: 0.12, rz: -0.42, ph: 2.1 }
    ].map(c => {
      const f = flame(c.h, c.w, 0.12, 0xff5a14, 0xffcf40, c.ph);
      f.g.position.set(c.x, 0.6, -0.04);
      f.g.rotation.z = c.rz;
      f.rz = c.rz;
      head.add(f.g);
      return f;
    });

    const gem = mesh(new THREE.OctahedronGeometry(0.1, 0), glowMat, false);
    gem.scale.set(0.8, 1.5, 0.7);
    gem.position.set(0, 0.3, 0.63);
    head.add(gem);

    const collar = [];
    const COLLAR_N = 9;
    for (let i = 0; i < COLLAR_N; i++) {
      const a = 1.05 + (i / (COLLAR_N - 1)) * (Math.PI * 2 - 2.1);
      const f = flame(0.46, 0.12, 0.1, i % 2 ? 0xff5a14 : 0xff7a1e, i % 2 ? 0xffc23a : 0xffd85a, i * 0.9);
      f.g.position.set(Math.sin(a) * 0.5, 1.38, Math.cos(a) * 0.42);
      f.g.rotation.set(Math.cos(a) * 0.95, 0, -Math.sin(a) * 0.95);
      f.base = 0.9;
      squash.add(f.g);
      collar.push(f);
    }

    const tails = [
      { yaw: 0, pitch: -0.95, n: 11, len: 0.2, r0: 0.3, curl: 0.18, ph: 0 },
      { yaw: 0.8, pitch: -0.75, n: 9, len: 0.19, r0: 0.24, curl: 0.2, ph: 1.6 },
      { yaw: -0.8, pitch: -0.75, n: 9, len: 0.19, r0: 0.24, curl: 0.2, ph: 3.2 }
    ].map(spec => {
      const outer = new THREE.Group();
      outer.position.set(0, 0.7, -0.5);
      outer.rotation.y = spec.yaw;
      const rootSeg = new THREE.Group();
      rootSeg.rotation.x = spec.pitch;
      outer.add(rootSeg);
      const segs = [];
      let parent = rootSeg;
      for (let i = 0; i < spec.n; i++) {
        const u = i / (spec.n - 1);
        const g = new THREE.Group();
        g.position.y = i === 0 ? 0 : spec.len;
        const col = u < 0.5 ? hexMix(0x8a1c0e, 0xff5a14, u / 0.5) : hexMix(0xff5a14, 0xffb52e, (u - 0.5) / 0.5);
        const m = new THREE.MeshStandardMaterial({
          color: col,
          roughness: 0.55,
          emissive: col,
          emissiveIntensity: 0.15 + u * 0.55
        });
        const r = spec.r0 * (1 - 0.82 * Math.pow(u, 0.85));
        const seg = mesh(new THREE.SphereGeometry(1, 20, 14), m);
        seg.scale.set(r, spec.len * 0.72, r);
        seg.position.y = spec.len * 0.45;
        g.add(seg);
        parent.add(g);
        segs.push(g);
        parent = g;
      }
      const tipFlame = flame(0.9, 0.2, 0.2, 0xff5a14, 0xffd23a, spec.ph);
      tipFlame.g.position.y = spec.len * 0.5;
      parent.add(tipFlame.g);
      squash.add(outer);
      return { spec, segs, outer, tipFlame };
    });

    const emberMat = new THREE.MeshBasicMaterial({ color: 0xffb13b });
    const emberHot = new THREE.MeshBasicMaterial({ color: 0xffe27a });
    const embers = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), i % 3 ? emberMat : emberHot);
      squash.add(m);
      embers.push({
        m,
        ph: Math.random(),
        rad: 0.7 + Math.random() * 0.8,
        sp: 0.12 + Math.random() * 0.12,
        size: 0.035 + Math.random() * 0.045,
        a: Math.random() * Math.PI * 2,
        w: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8)
      });
    }

    const shards = [];
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const rock = mesh(new THREE.OctahedronGeometry(0.14 + (i % 3) * 0.035, 0), rockMat, false);
      rock.scale.set(0.8, 1.5, 0.8);
      const vein = new THREE.Mesh(new THREE.OctahedronGeometry(0.075 + (i % 3) * 0.02, 0), crackMat);
      vein.scale.set(0.8, 1.5, 0.8);
      g.add(rock, vein);
      squash.add(g);
      shards.push({ g, rock, a: (i / 5) * Math.PI * 2, rad: 1.2 + (i % 2) * 0.15, h: 1.0 + (i % 3) * 0.6, ph: i * 1.7 });
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.3, 56),
      new THREE.MeshBasicMaterial({ color: 0xff7a1e, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.7, 56),
      new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.025;
    root.add(ring2);

    const glow = new THREE.PointLight(0xff8a3a, 0.8, 7);
    glow.position.set(0, 1.4, 0.8);
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
        const flare = action && action.name === "flare" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const atk = action && action.name === "attack" ? strike(action.p) : null;

        const fire = s.dying ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));
        let burst = 0;
        let charge = 0;
        if (flare) {
          const rise = smooth(0.28, 0.46, flare.p);
          const fall = 1 - smooth(0.58, 1, flare.p);
          burst = rise * fall;
          charge = smooth(0, 0.28, flare.p) * (1 - smooth(0.28, 0.4, flare.p));
        }

        let y = 0;
        let sy = 1 + Math.sin(t * 2.2) * 0.025 * motion;
        let spin = 0;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;

        if (jump) {
          const p = jump.p;
          if (p < 0.18) {
            sy = 1 - 0.22 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.3;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            airborne = true;
            if (jump.n % 3 === 0 && !reduceMotion) spin = q * Math.PI * 2;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.2 * Math.sin(q * Math.PI);
          }
        }

        if (flare) {
          sy -= charge * 0.12;
          sy += burst * 0.1;
          y = burst * 0.12;
          mouthOpen = burst > 0.4;
        }

        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.1 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.6, 1.62, ph.fall * ph.fall), lerp(0.8, 1.0, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          openMouth.scale.y = 0.6 + ph.chew * 0.6;
        } else {
          food.visible = false;
          openMouth.scale.y = flare ? 0.5 + burst * 0.9 : 0.9;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.y = y;
        root.rotation.y = lookYaw + spin;
        root.rotation.x = lookPitch;
        const happy = eat ? Math.sin(eat.p * Math.PI * 8) * 0.04 * motion : 0;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.3) * 0.035 * motion + happy;

        head.rotation.z = Math.sin(t * 0.9) * 0.05 * motion + (eat ? Math.sin(eat.p * Math.PI * 6) * 0.06 : 0);
        head.rotation.x = flare ? -burst * 0.25 + charge * 0.12 : 0;

        const open = airborne || mouthOpen;
        smile.visible = !open;
        openMouth.visible = open;

        ears.forEach(({ g, side }, i) => {
          const flick = Math.max(0, Math.sin(t * 0.7 + i * 2.4) - 0.96) * 18;
          const perk = (eat ? 0.12 : 0) + (airborne ? 0.18 : 0) + burst * 0.2;
          g.rotation.z = lerp(g.rotation.z, (-0.32 + perk) * side + flick * side * 0.5, 0.2);
        });

        arms.forEach(({ pivot, side }) => {
          const target = airborne ? 2.4 : flare ? 0.5 + burst * 1.9 : eat ? 1.1 : 0.3 + Math.sin(t * 3 + side) * 0.1 * motion;
          pivot.rotation.z = lerp(pivot.rotation.z, target * side, 0.2);
        });

        feet.forEach(f => {
          f.position.y = airborne ? 0.04 : 0.14;
        });

        const k = (1 + burst * 0.9 - charge * 0.35) * fire;
        flames.forEach(f => {
          const ph2 = f.phase;
          const flick = 1 + 0.13 * Math.sin(t * 9 + ph2 * 3) + 0.07 * Math.sin(t * 17 + ph2 * 5);
          const wide = 1 + 0.08 * Math.sin(t * 7 + ph2 * 2);
          f.g.scale.set(wide * k, Math.max(0.05, flick * k * f.base), wide * k);
        });
        crest.forEach(f => {
          f.g.rotation.z = f.rz + Math.sin(t * 3 + f.phase) * 0.1 * motion;
        });
        collar.forEach(f => {
          f.g.rotation.y = Math.sin(t * 2 + f.phase) * 0.12 * motion;
        });

        const wag = eat ? 2.6 : jump || flare ? 2.2 : 1;
        tails.forEach(({ spec, segs, outer, tipFlame }, ti) => {
          const spread = flare ? burst * 0.35 : 0;
          outer.rotation.y = spec.yaw * (1 + spread) + Math.sin(t * 1.1 * wag + spec.ph) * 0.1 * motion * (ti ? 1 : 0.6);
          segs.forEach((g, i) => {
            if (i === 0) return;
            const u = i / segs.length;
            const wave = Math.sin(t * 2.2 * wag - i * 0.55 + spec.ph) * (0.05 + u * 0.11) * motion;
            const air = airborne ? 0.12 : 0;
            g.rotation.x = spec.curl + wave + air - burst * 0.08;
            g.rotation.z = Math.sin(t * 1.6 * wag - i * 0.4 + spec.ph) * 0.06 * u * motion;
          });
          tipFlame.base = 1 + burst * 0.4;
        });

        embers.forEach(e => {
          const speed = e.sp * (1 + burst * 2.2);
          const u = (((t * speed + e.ph) % 1) + 1) % 1;
          const rad = e.rad * (1 + burst * 0.9);
          const a = e.a + t * e.w * 0.5;
          e.m.position.set(Math.sin(a) * rad * (0.6 + u * 0.5), 0.25 + u * 3.1, Math.cos(a) * rad * (0.6 + u * 0.5));
          e.m.rotation.set(t * 2 + e.ph * 6, t * 1.7, 0);
          const fade = Math.sin(Math.PI * u);
          e.m.scale.setScalar(Math.max(0.001, e.size * fade * (0.4 + fire * 0.6) * (1 + burst * 0.8)));
        });

        shards.forEach((sh, i) => {
          const a = sh.a + t * 0.45 * (1 + burst * 1.5);
          const rad = sh.rad * (1 + burst * 0.35);
          sh.g.position.set(Math.sin(a) * rad, sh.h + Math.sin(t * 1.4 + sh.ph) * 0.12 * motion, Math.cos(a) * rad);
          sh.g.rotation.set(t * 0.8 + sh.ph, t * 1.1 + sh.ph, 0.3);
          sh.g.scale.setScalar(0.7 + fire * 0.3);
        });

        const pulse = 1 + Math.sin(t * 3) * 0.06 * motion;
        core.scale.setScalar(pulse * (1 + burst * 0.9));
        coreRing.rotation.set(t * 1.3, t * 0.9, 0);
        coreRing.scale.setScalar(1 + burst * 1.1);
        gem.rotation.y = t * 1.2;
        glowMat.emissiveIntensity = (0.55 + Math.sin(t * 3.2) * 0.2 * motion + burst * 1.2) * (0.5 + fire * 0.5);

        ring.scale.setScalar(pulse + burst * 1.4);
        ring.material.opacity = (0.22 + 0.1 * Math.sin(t * 2.4) + burst * 0.35) * fire;
        ring2.scale.setScalar(1 - Math.sin(t * 2.4) * 0.05 + burst * 0.5);
        ring2.material.opacity = (0.3 + burst * 0.4) * fire;

        glow.intensity = (0.55 + Math.sin(t * 11) * 0.06 + Math.sin(t * 5.3) * 0.06 + burst * 2.2) * fire;

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.1 : squint ? 0.4 : charge > 0.3 ? 0.35 : blink;
        });
        root.position.z = 0;
        if (atk) {
          const crouch = atk.wind * 0.2;
          squash.scale.set(1 + crouch * 0.5, 1 - crouch + atk.lunge * 0.08, 1 + crouch * 0.5);
          root.position.y = Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.35;
          root.position.z = atk.lunge * 0.7 - atk.wind * 0.2;
          root.rotation.x = lookPitch + atk.lunge * 0.35 - atk.wind * 0.25;
          head.rotation.x = -atk.wind * 0.2 + atk.lunge * 0.15;
          arms.forEach(({ pivot, side }) => {
            const lead = side > 0 ? 1 : 0.55;
            pivot.rotation.z = side * (0.3 + atk.wind * 2.3 * lead - atk.impact * 1.6 * lead);
            pivot.rotation.x = -atk.lunge * 1.1 * lead;
          });
          smile.visible = atk.lunge < 0.2;
          openMouth.visible = !smile.visible;
          openMouth.scale.y = 0.7 + atk.lunge * 0.6;
          eyes.forEach(({ g }) => (g.scale.y = atk.lunge > 0.4 ? 0.5 : blink));
          tails.forEach(({ outer }) => (outer.rotation.x = -atk.wind * 0.3 + atk.lunge * 0.2));
        } else {
          arms.forEach(({ pivot }) => (pivot.rotation.x = 0));
          tails.forEach(({ outer }) => (outer.rotation.x = 0));
        }
        followPupils(eyes, pointer);
      }
    };
  }
});
