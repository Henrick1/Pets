Pets.register({
  id: "cerebrolvo",
  dex: 20,
  name: "Cerebrolvo",
  color: "#9ad8ff",
  types: ["psychic"],
  description: "Um polvinho translúcido das profundezas, com o cérebro à mostra piscando em bioluminescência. Flutua no ar como se ainda estivesse debaixo d'água e já consegue erguer pedrinhas só com a mente.",
  evolvesTo: "abissomente",
  evolveLevel: 12,
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    lift: { duration: 3.0 },
    pulse: { duration: 2.0 }
  },
  idle: [
    { action: "lift", min: 25, max: 50 },
    { action: "pulse", min: 35, max: 70 }
  ],
  clickAction: n => ["lift", "pulse", "jump", "lift"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const taper = (pts, rf, radial, segs) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
      const pos = g.attributes.position;
      const c = V3(0, 0, 0);
      const p = V3(0, 0, 0);
      for (let i = 0; i <= segs; i++) {
        curve.getPointAt(i / segs, c);
        const r = rf(i / segs);
        for (let j = 0; j <= radial; j++) {
          const k = i * (radial + 1) + j;
          p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
          pos.setXYZ(k, p.x, p.y, p.z);
        }
      }
      g.computeVertexNormals();
      return { g, curve };
    };

    const root = new THREE.Group();
    const floatG = new THREE.Group();
    floatG.scale.setScalar(1.4);
    root.add(floatG);

    const HOVER = 1.15;
    const R = 0.58;

    const jellyMat = new THREE.MeshPhysicalMaterial({ color: 0xa8e6ff, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.42, clearcoat: 1, clearcoatRoughness: 0.1, emissive: 0x2a7ab8, emissiveIntensity: 0.18, side: THREE.DoubleSide, depthWrite: false });
    const faceMat = new THREE.MeshPhysicalMaterial({ color: 0x7cc8f0, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: 0x1a4a80, emissiveIntensity: 0.15 });
    const brainMat = new THREE.MeshStandardMaterial({ color: 0xf489c2, roughness: 0.45, emissive: 0xd83a90, emissiveIntensity: 0.3, vertexColors: true });
    const brainDark = new THREE.MeshStandardMaterial({ color: 0xd86aa8, roughness: 0.5, emissive: 0xb02a7a, emissiveIntensity: 0.3 });
    const spotMat = new THREE.MeshBasicMaterial({ color: 0x8ffcff });
    const armMat = new THREE.MeshPhysicalMaterial({ color: 0x6cbcea, roughness: 0.3, clearcoat: 0.8, emissive: 0x1a4a80, emissiveIntensity: 0.15 });
    const armUnder = new THREE.MeshStandardMaterial({ color: 0xffc2e2, roughness: 0.35, emissive: 0xff7ac0, emissiveIntensity: 0.15 });

    const head = new THREE.Group();
    head.position.y = HOVER;
    floatG.add(head);

    const domeGeo = new THREE.SphereGeometry(R, 48, 36, 0, Math.PI * 2, 0, Math.PI * 0.62);
    {
      const pos = domeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i) / R;
        pos.setY(i, pos.getY(i) * (1 + Math.max(0, y) * 0.28));
        const w = 1 + 0.04 * Math.sin(Math.atan2(pos.getZ(i), pos.getX(i)) * 8) * (1 - Math.abs(y));
        pos.setX(i, pos.getX(i) * w);
        pos.setZ(i, pos.getZ(i) * w);
      }
      domeGeo.computeVertexNormals();
    }
    const dome = mesh(domeGeo, jellyMat, false);
    dome.renderOrder = 2;
    head.add(dome);
    const rim = mesh(new THREE.TorusGeometry(R * 0.93, 0.035, 10, 48), new THREE.MeshStandardMaterial({ color: 0x8fdcff, roughness: 0.2, transparent: true, opacity: 0.7, emissive: 0x2a8ac8, emissiveIntensity: 0.4 }), false);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = R * Math.cos(Math.PI * 0.62) * 1;
    head.add(rim);

    const brain = new THREE.Group();
    brain.position.y = R * 0.42;
    head.add(brain);
    const lobes = [-1, 1].map(s => {
      const lg = new THREE.Group();
      lg.position.x = R * 0.19 * s;
      const LR = R * 0.33;
      const lobeGeo = new THREE.SphereGeometry(LR, 96, 72);
      const pos = lobeGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / LR;
        const y = pos.getY(i) / LR;
        const z = pos.getZ(i) / LR;
        const wx = x * 5.6 + Math.sin(y * 5.1 + z * 3.3 + s) * 0.9;
        const wy = y * 6.0 + Math.sin(z * 4.7 - x * 3.1) * 0.9;
        const wz = z * 5.4 + Math.sin(x * 5.3 + y * 2.9) * 0.9;
        const v = Math.sin(wx + Math.sin(wy) * 1.3) + Math.sin(wy + Math.sin(wz) * 1.3) + Math.sin(wz + Math.sin(wx) * 1.3);
        const fold = Math.min(1, Math.abs(v) / 1.1);
        const ridge = 1 - Math.pow(1 - fold, 3);
        const inner = Math.max(0, -x * s);
        const n = 1 + (ridge - 0.7) * 0.075 * (1 - inner * 0.6);
        pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n, pos.getZ(i) * n);
        const c = 0.62 + 0.38 * ridge;
        col[i * 3] = c;
        col[i * 3 + 1] = c * 0.94;
        col[i * 3 + 2] = c;
      }
      lobeGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      lobeGeo.computeVertexNormals();
      const lobe = mesh(lobeGeo, brainMat, false);
      lobe.scale.set(0.85, 0.9, 1.2);
      lg.add(lobe);
      brain.add(lg);
      return lg;
    });
    const stem = mesh(new THREE.CylinderGeometry(R * 0.07, R * 0.12, R * 0.4, 14), brainDark, false);
    stem.position.y = -R * 0.36;
    brain.add(stem);

    const spots = [];
    for (let k = 0; k < 12; k++) {
      const th = (k / 12) * Math.PI * 2 + (k % 2) * 0.3;
      const ph = 0.55 + (k % 3) * 0.28;
      const d = V3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * 1.2, Math.sin(ph) * Math.sin(th));
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), spotMat);
      sp.position.copy(d).multiplyScalar(R * 1.01);
      head.add(sp);
      spots.push({ m: sp, ph: k * 0.9 });
    }

    const face = mesh(new THREE.SphereGeometry(R * 0.86, 40, 30), faceMat);
    face.scale.set(1.0, 0.62, 0.95);
    face.position.y = -R * 0.16;
    head.add(face);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.95, whiteColor: 0xf2fdff, pupilColor: 0x0a1838 });
      e.pupil.scale.set(1.0, 1.12, 0.5);
      e.g.position.set(R * 0.34 * s, -R * 0.12, R * 0.74);
      e.g.rotation.set(0, 0.42 * s, 0);
      head.add(e.g);
      return e;
    });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffa6d4, transparent: true, opacity: 0.65, depthWrite: false });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), cheekMat);
      c.position.set(R * 0.6 * s, -R * 0.34, R * 0.6);
      c.rotation.y = 0.75 * s;
      c.scale.set(1, 0.6, 1);
      head.add(c);
    });
    const mouth = new THREE.Group();
    mouth.position.set(0, -R * 0.38, R * 0.8);
    head.add(mouth);
    const mouthO = mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 20), new THREE.MeshStandardMaterial({ color: 0x5a2a5a, roughness: 0.5 }), false);
    mouth.add(mouthO);

    const NT = 8;
    const TS = 7;
    const tentacles = [];
    for (let k = 0; k < NT; k++) {
      const a = (k / NT) * Math.PI * 2 + Math.PI / NT;
      const pts = [];
      for (let i = 0; i < TS; i++) pts.push(V3(0, 0, 0));
      const m = mesh(new THREE.BufferGeometry(), armMat);
      m.frustumCulled = false;
      floatG.add(m);
      const suckers = [];
      for (let j = 0; j < 5; j++) {
        const sk = mesh(new THREE.SphereGeometry(0.022, 10, 8), armUnder, false);
        sk.scale.set(1, 0.45, 1);
        floatG.add(sk);
        suckers.push(sk);
      }
      tentacles.push({ a, pts, m, suckers, ph: k * 0.79 });
    }

    const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x8a8478, roughness: 0.9 });
    const pebbles = [];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.DodecahedronGeometry(0.07 + (k % 2) * 0.03, 1);
      const p = mesh(g, pebbleMat, false);
      p.scale.set(1, 0.7, 1.1);
      root.add(p);
      const glowR = new THREE.Mesh(new THREE.SphereGeometry(0.13 + (k % 2) * 0.03, 14, 10), new THREE.MeshBasicMaterial({ color: 0x8ffcff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      p.add(glowR);
      const a = (k / 4) * Math.PI * 2 + 0.4;
      pebbles.push({ p, glowR, a, home: V3(Math.cos(a) * 0.95, 0.06, Math.sin(a) * 0.7 + 0.2), k });
    }

    const waveMat = new THREE.MeshBasicMaterial({ color: 0x9ffcff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const waves = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(R, 0.018, 6, 56), waveMat.clone());
      m.rotation.x = Math.PI / 2;
      m.visible = false;
      floatG.add(m);
      return m;
    });
    const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xd8f8ff, roughness: 0.05, transparent: true, opacity: 0.4, clearcoat: 1, depthWrite: false });
    const bubbles = [];
    for (let k = 0; k < 9; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 + (k % 3) * 0.012, 12, 10), bubbleMat);
      root.add(m);
      bubbles.push({ m, ph: k / 9, x: Math.sin(k * 2.7) * 0.75, z: Math.cos(k * 1.9) * 0.5, sp: 0.18 + (k % 4) * 0.04 });
    }
    const glow = new THREE.PointLight(0x9ffcff, 0.4, 3.5);
    glow.position.set(0, HOVER + 0.5, 0.6);
    floatG.add(glow);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    root.add(shadow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.88, 56), new THREE.MeshBasicMaterial({ color: 0x8ffcff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    root.add(ring);

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const lift = action && action.name === "lift" ? action : null;
        const pulse = action && action.name === "pulse" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const mind = s.dying ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        const swimT = t * 1.6;
        const stroke = Math.pow(Math.max(0, Math.sin(swimT)), 2);
        let y = Math.sin(swimT - 0.8) * 0.07 * motion + (s.dying ? -0.4 : 0);
        let squeeze = stroke * 0.5 * motion;
        let hop = 0;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) squeeze = Math.max(squeeze, Math.sin((p / 0.2) * Math.PI / 2));
          else if (p < 0.8) {
            hop = Math.sin(((p - 0.2) / 0.6) * Math.PI);
            y += hop * 0.65;
            squeeze = 0;
          }
        }
        let focus = 0;
        if (lift) focus = smooth(0, 0.2, lift.p) * (1 - smooth(0.82, 1, lift.p));
        let blast = 0;
        let charge = 0;
        if (pulse) {
          charge = smooth(0, 0.35, pulse.p) * (1 - smooth(0.35, 0.42, pulse.p));
          blast = smooth(0.38, 0.45, pulse.p) * (1 - smooth(0.7, 1, pulse.p));
          squeeze = Math.max(squeeze, charge);
        }
        root.position.y = 0;
        root.rotation.y = lookYaw;
        floatG.position.y = y;
        floatG.rotation.x = lookPitch * 0.6 + Math.sin(swimT) * 0.04 * motion;
        floatG.rotation.z = Math.sin(t * 0.7) * 0.05 * motion;

        const sq = squeeze;
        dome.scale.set(1 - sq * 0.12 + blast * 0.1, 1 + sq * 0.12 - blast * 0.06, 1 - sq * 0.12 + blast * 0.1);
        brain.scale.setScalar(1 + focus * 0.06 + charge * 0.08 + Math.sin(t * 2.2) * 0.015);
        lobes.forEach((l, i) => {
          l.rotation.z = (i ? 1 : -1) * Math.sin(t * 2.2) * 0.03;
        });
        const think = 0.3 + focus * 0.45 + charge * 0.5 + blast * 0.7 + Math.max(0, Math.sin(t * 3.1)) * 0.12;
        brainMat.emissiveIntensity = think * mind;
        jellyMat.emissiveIntensity = (0.15 + focus * 0.25 + blast * 0.4) * mind;
        spots.forEach(sp => {
          const f = 0.5 + 0.5 * Math.sin(t * 3 + sp.ph);
          sp.m.scale.setScalar(0.6 + f * 0.7 + focus * 0.5 + blast * 0.8);
        });
        head.rotation.y = pointer.x * 0.15;
        head.rotation.x = eat ? -0.25 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.08 : -focus * 0.08;

        let mo = 1;
        if (eat) mo = eat.p > 0.12 && eat.p < 0.85 ? 1.4 + ph.chew * 0.9 : 1;
        if (blast > 0.2) mo = 1.6;
        if (hop > 0.3) mo = 1.4;
        mouth.scale.setScalar(mo);

        tentacles.forEach(tn => {
          const ca = Math.cos(tn.a);
          const sa = Math.sin(tn.a);
          const spread = 1 - sq * 0.35 + blast * 0.55 + focus * 0.15 + hop * 0.25;
          const curl = 0.9 + sq * 0.6 + (eat ? 0.4 : 0) - hop * 0.4;
          const tip = 0.62;
          for (let i = 0; i < TS; i++) {
            const u = i / (TS - 1);
            const wave = Math.sin(t * 2.6 - u * 3.5 + tn.ph) * 0.07 * u * motion;
            const reach = (0.08 + u * tip * 0.75) * spread;
            const down = u * tip * (1.05 - u * 0.4) - Math.sin(u * Math.PI * 1.1) * curl * 0.12 * u * u;
            const r = R * 0.6 + reach;
            const curlIn = Math.max(0, u - 0.6) * curl * 0.45;
            const rr = r - curlIn;
            const yy = HOVER - R * 0.42 - down + curlIn * 0.6;
            tn.pts[i].set(ca * rr - sa * wave, yy, sa * rr + ca * wave);
          }
          const { g, curve } = taper(tn.pts, u => lerp(0.085, 0.018, Math.pow(u, 0.75)) * (1 + 0.15 * Math.sin(u * Math.PI)), 10, 24);
          tn.m.geometry.dispose();
          tn.m.geometry = g;
          tn.suckers.forEach((sk, j) => {
            const u = 0.22 + j * 0.14;
            curve.getPointAt(u, sk.position);
            const r = lerp(0.085, 0.018, Math.pow(u, 0.75));
            sk.position.x -= ca * r * 0.75;
            sk.position.z -= sa * r * 0.75;
            sk.position.y -= r * 0.35;
            sk.rotation.set(0.6, -tn.a, 0);
            sk.scale.set(1 - u * 0.6, 0.45, 1 - u * 0.6);
          });
        });

        pebbles.forEach(pb => {
          const k = focus * smooth(pb.k * 0.08, pb.k * 0.08 + 0.3, lift ? lift.p : 0);
          const a = pb.a + t * 0.9 * k;
          const orbit = V3(Math.cos(a) * 0.85, HOVER + 0.35 + Math.sin(t * 2 + pb.k) * 0.12 + y, Math.sin(a) * 0.85);
          pb.p.position.copy(pb.home).lerp(orbit, k);
          pb.p.rotation.set(t * k * 1.5 + pb.k, t * k, 0);
          pb.glowR.material.opacity = k * 0.35 * mind;
        });
        waves.forEach((w, k) => {
          const on = blast > 0.05;
          w.visible = on;
          if (!on) return;
          const u = Math.min(1, (pulse.p - 0.4) * 2.2 - k * 0.15);
          w.position.y = HOVER;
          w.scale.setScalar(1 + Math.max(0, u) * 3);
          w.material.opacity = Math.max(0, 1 - u) * 0.6 * mind;
        });
        bubbles.forEach(b => {
          const u = (((t * b.sp + b.ph) % 1) + 1) % 1;
          b.m.position.set(b.x + Math.sin(t * 1.3 + b.ph * 7) * 0.05, 0.1 + u * 2.7, b.z);
          b.m.scale.setScalar(Math.max(0.01, Math.sin(u * Math.PI)));
        });
        glow.intensity = (0.35 + focus * 0.6 + blast * 1.5 + charge * 0.5) * mind;
        shadow.scale.setScalar(1 - y * 0.25);
        shadow.material.opacity = 0.16 - y * 0.05;
        ring.scale.setScalar(1 + blast * 0.6 + focus * 0.15 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = (0.12 + blast * 0.3 + focus * 0.12) * mind;

        eyes.forEach(({ g }) => {
          g.scale.y = charge > 0.3 ? 0.35 : focus > 0.4 ? 0.7 : blast > 0.3 ? 1.2 : eat && eat.p > 0.3 ? 0.5 : blink;
        });
        followPupils(eyes, pointer, 0.55);

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, HOVER + y - R * 0.4, ph.fall * ph.fall), R * 0.85);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;
      }
    };
  }
});
