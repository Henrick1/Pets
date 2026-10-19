Pets.register({
  id: "curtocircuito",
  dex: 15,
  name: "Curto-Circuito",
  color: "#5a6b86",
  types: ["electric", "steel"],
  description: "Uma caixa de energia viva que anda sobre oito cabos trançados, com uma lâmpada acesa na ponta de cada um. Quando se empolga demais, sobrecarrega: as lâmpadas estouram de brilho e raios pulam de um cabo para o outro.",
  actions: {
    jump: { duration: 1.1 },
    eat: { duration: 2.4 },
    surge: { duration: 2.6 },
    dance: { duration: 3.2 }
  },
  idle: [
    { action: "dance", min: 20, max: 45 },
    { action: "surge", min: 35, max: 70 }
  ],
  clickAction: n => ["surge", "dance", "jump", "surge"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const steel = new THREE.MeshStandardMaterial({ color: 0x8ea0be, roughness: 0.35, metalness: 0.35 });
    const steelDark = new THREE.MeshStandardMaterial({ color: 0x55627a, roughness: 0.4, metalness: 0.35 });
    const plastic = new THREE.MeshStandardMaterial({ color: 0xf1ede2, roughness: 0.35 });
    const plasticShade = new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 0.45 });
    const holeMat = mat(0x0c0b0a, 0.6);
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffcc1a, roughness: 0.4 });
    const black = new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.4 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.2, metalness: 0.9 });
    const copper = new THREE.MeshStandardMaterial({ color: 0xd9823b, roughness: 0.25, metalness: 0.85 });
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0x9ff3ff });

    const roundedBox = (w, h, d, r) => {
      const s = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      s.moveTo(x + r, y);
      s.lineTo(x + w - r, y);
      s.quadraticCurveTo(x + w, y, x + w, y + r);
      s.lineTo(x + w, y + h - r);
      s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      s.lineTo(x + r, y + h);
      s.quadraticCurveTo(x, y + h, x, y + h - r);
      s.lineTo(x, y + r);
      s.quadraticCurveTo(x, y, x + r, y);
      const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 5, curveSegments: 12 });
      g.translate(0, 0, -d / 2);
      return g;
    };

    const HEAD_Y = 1.62;
    const head = new THREE.Group();
    head.position.y = HEAD_Y;
    squash.add(head);
    const box = mesh(roundedBox(1.15, 0.95, 0.85, 0.3), steel);
    head.add(box);
    const stripeMats = [yellow, black];
    for (let k = 0; k < 10; k++) {
      const seg = mesh(new THREE.BoxGeometry(0.13, 0.1, 0.02), stripeMats[k % 2], false);
      seg.position.set(-0.585 + (k + 0.5) * 0.117, -0.37, 0.51);
      seg.rotation.z = 0.5;
      seg.scale.x = 0.95;
      head.add(seg);
    }
    const stripeBand = mesh(new THREE.BoxGeometry(1.17, 0.12, 0.015), black, false);
    stripeBand.position.set(0, -0.37, 0.505);
    head.add(stripeBand);
    [-1, 1].forEach(s => {
      [-1, 1].forEach(v => {
        const bolt = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 6), metalMat, false);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(0.48 * s, 0.38 * v, 0.5);
        head.add(bolt);
      });
    });

    const face = new THREE.Group();
    face.position.set(0, 0.06, 0.5);
    head.add(face);
    const plate = mesh(roundedBox(0.66, 0.6, 0.04, 0.14), plastic, false);
    face.add(plate);
    const well = mesh(new THREE.CircleGeometry(0.27, 48), plasticShade, false);
    well.position.z = 0.112;
    face.add(well);
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.12 * s, 0.06, 0.115);
      const hole = mesh(new THREE.CircleGeometry(0.075, 28), holeMat, false);
      g.add(hole);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.036, 18), eyeGlow);
      pupil.position.z = 0.002;
      g.add(pupil);
      const brow = mesh(new THREE.BoxGeometry(0.11, 0.022, 0.02), black, false);
      brow.position.set(0, 0.1, 0.01);
      brow.rotation.z = 0.35 * s;
      g.add(brow);
      face.add(g);
      return { g, pupil };
    });
    const mouth = new THREE.Group();
    mouth.position.set(0, -0.11, 0.115);
    face.add(mouth);
    mouth.add(mesh(new THREE.CircleGeometry(0.045, 24), holeMat, false));

    const coilG = new THREE.Group();
    coilG.position.set(0, 0.55, -0.05);
    head.add(coilG);
    coilG.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.12, 16), steelDark, false));
    const coilPts = [];
    for (let k = 0; k <= 80; k++) {
      const u = k / 80;
      const a = u * Math.PI * 2 * 7;
      coilPts.push(V3(Math.cos(a) * 0.06, 0.06 + u * 0.32, Math.sin(a) * 0.06));
    }
    coilG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(coilPts), 200, 0.012, 6, false), copper, false));
    const coilRing = mesh(new THREE.TorusGeometry(0.12, 0.035, 10, 28), metalMat, false);
    coilRing.rotation.x = Math.PI / 2;
    coilRing.position.y = 0.42;
    coilG.add(coilRing);
    const coilOrb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xcff8ff }));
    coilOrb.position.y = 0.48;
    coilG.add(coilOrb);

    const under = mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.2, 24), steelDark);
    under.position.y = -0.55;
    head.add(under);

    const WIRE_COLORS = [0xd8342c, 0x1d1d22, 0x2f6fd8, 0xf2c21a, 0x3fae4a, 0xf0ece0, 0xf07a1a, 0x8a5a2b];
    const TN = 40;
    const tentacles = WIRE_COLORS.map((c, k) => {
      const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
      const pts = [];
      for (let i = 0; i <= TN; i++) pts.push(V3(0, 0, 0));
      const curve = new THREE.CatmullRomCurve3(pts);
      const wireMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 });
      const m = mesh(new THREE.TubeGeometry(curve, 60, 0.055, 8, false), wireMat);
      squash.add(m);
      const bulb = new THREE.Group();
      squash.add(bulb);
      const socket = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.1, 12), metalMat, false);
      bulb.add(socket);
      for (let r = 0; r < 3; r++) {
        const thread = mesh(new THREE.TorusGeometry(0.066, 0.008, 6, 16), metalMat, false);
        thread.rotation.x = Math.PI / 2;
        thread.position.y = -0.03 + r * 0.03;
        bulb.add(thread);
      }
      const glassMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xffd06a, emissiveIntensity: 0.6, transparent: true, opacity: 0.75, roughness: 0.05 });
      const glass = mesh(new THREE.SphereGeometry(0.13, 20, 16), glassMat, false);
      glass.scale.set(1, 1.15, 1);
      glass.position.y = 0.17;
      bulb.add(glass);
      const fil = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16, Math.PI), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }));
      fil.position.y = 0.16;
      bulb.add(fil);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.y = 0.17;
      bulb.add(halo);
      return { k, a, pts, curve, m, bulb, glassMat, halo, ph: k * 0.83 };
    });

    const arcMat = new THREE.LineBasicMaterial({ color: 0xfff6a0 });
    const arcs = [];
    for (let k = 0; k < 8; k++) {
      const g = new THREE.BufferGeometry();
      const arr = new Float32Array(9 * 3);
      g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const l = new THREE.Line(g, arcMat);
      l.visible = false;
      l.frustumCulled = false;
      squash.add(l);
      arcs.push({ l, arr, k });
    }
    const smokeMat = new THREE.MeshStandardMaterial({ color: 0x8a8f99, transparent: true, opacity: 0.4, depthWrite: false, roughness: 1 });
    const smoke = [];
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), smokeMat);
      m.visible = false;
      squash.add(m);
      smoke.push({ m, ph: k / 6, x: Math.sin(k * 2.3) * 0.3 });
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.3, 64),
      new THREE.MeshBasicMaterial({ color: 0x9ff3ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    root.add(ring);

    const glow = new THREE.PointLight(0xffe2a0, 0.4, 5);
    glow.position.set(0, 0.8, 0.8);
    squash.add(glow);

    const food = berry();
    food.visible = false;
    squash.add(food);

    const noise = (a, b) => Math.sin(a * 12.9898 + b * 78.233) * 0.5 + Math.sin(a * 4.1 + b * 9.7) * 0.5;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const surge = action && action.name === "surge" ? action : null;
        const dance = action && action.name === "dance" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const power = s.dying ? 0.2 : 0.5 + 0.5 * Math.max(0, Math.min(1, hunger / 100));

        let load = 0;
        let pop = 0;
        if (surge) {
          load = smooth(0, 0.4, surge.p) * (1 - smooth(0.4, 0.45, surge.p));
          pop = smooth(0.42, 0.48, surge.p) * (1 - smooth(0.75, 1, surge.p));
        }
        let groove = 0;
        if (dance) groove = smooth(0, 0.12, dance.p) * (1 - smooth(0.88, 1, dance.p));

        let y = 0;
        let crouch = 0;
        let airborne = false;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) crouch = Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.8) {
            y = Math.sin(((p - 0.2) / 0.6) * Math.PI) * 1.0;
            airborne = true;
          } else crouch = Math.sin(((1 - p) / 0.2) * Math.PI / 2) * 0.6;
        }
        crouch += load * 0.35;
        const bob = Math.sin(t * 2.2) * 0.04 * motion + groove * Math.sin(t * 6) * 0.08;
        const headY = HEAD_Y - crouch * 0.35 + bob + (s.dying ? -0.4 : 0);
        head.position.y = headY;
        head.position.x = groove * Math.sin(t * 3) * 0.12 + (pop ? Math.sin(t * 70) * 0.02 * pop : 0);
        head.rotation.z = groove * Math.sin(t * 3) * 0.12 + Math.sin(t * 1.2) * 0.03 * motion;
        head.rotation.y = groove * Math.sin(t * 1.5) * 0.25;
        head.rotation.x = eat ? -0.2 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.05 : pop * -0.15;
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;

        tentacles.forEach(tn => {
          const a = tn.a + (groove ? Math.sin(t * 2) * 0.15 : 0);
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          const wave = Math.sin(t * 2.2 + tn.ph) * 0.06 * motion + groove * Math.sin(t * 6 + tn.k * 0.8) * 0.25;
          const lift = airborne ? 0.4 : 0;
          const tipUp = 0.35 + groove * Math.max(0, Math.sin(t * 6 + tn.k * 0.8)) * 0.6 + pop * 0.35 + (eat && tn.k === 0 ? 0.4 : 0);
          for (let i = 0; i <= TN; i++) {
            const u = i / TN;
            const rad = lerp(0.3, 1.25 + wave, Math.pow(u, 0.8));
            const ground = 0.08 + lift * u;
            let yy = lerp(headY - 0.55, ground, smooth(0, 0.65, u));
            yy += Math.sin(u * Math.PI) * 0.18;
            yy += smooth(0.75, 1, u) * tipUp;
            const twist = Math.sin(u * 6 + t * 1.5 + tn.ph) * 0.05 * u;
            tn.pts[i].set(ca * rad - sa * twist, yy, sa * rad + ca * twist);
          }
          tn.curve.updateArcLengths();
          tn.m.geometry.dispose();
          tn.m.geometry = new THREE.TubeGeometry(tn.curve, 60, 0.055, 8, false);
          const tip = tn.pts[TN];
          const dir = tip.clone().sub(tn.pts[TN - 3]).normalize();
          tn.bulb.position.copy(tip);
          tn.bulb.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
          const chase = groove ? Math.max(0, Math.sin(t * 8 - tn.k * 0.8)) : 0;
          const flick = 0.5 + 0.5 * Math.sin(t * 1.3 + tn.ph * 2) * 0.3;
          const strobe = pop && Math.sin(t * 50 + tn.k * 3) > 0 ? 1 : 0;
          const intensity = (flick + chase * 1.2 + load * 1.2 + pop * (1.2 + strobe * 1.5)) * power;
          tn.glassMat.emissiveIntensity = intensity;
          tn.halo.material.opacity = Math.min(0.6, 0.1 + intensity * 0.15);
          tn.halo.scale.setScalar(1 + intensity * 0.25);
        });

        arcs.forEach(({ l, arr, k }) => {
          const on = (pop > 0.1 || load > 0.6) && Math.sin(t * 37 + k * 2.1) > -0.1;
          l.visible = on;
          if (!on) return;
          const A = tentacles[k].bulb.position;
          const B = k % 2 ? tentacles[(k + 1) % 8].bulb.position : V3(head.position.x, head.position.y + 1.03, -0.05);
          const seed = Math.floor(t * 18) + k * 5;
          for (let j = 0; j < 9; j++) {
            const f = j / 8;
            const w = Math.sin(f * Math.PI) * 0.18;
            arr[j * 3] = lerp(A.x, B.x, f) + noise(seed + j, k) * w;
            arr[j * 3 + 1] = lerp(A.y + 0.17, B.y, f) + noise(k, seed - j) * w + Math.sin(f * Math.PI) * 0.2;
            arr[j * 3 + 2] = lerp(A.z, B.z, f) + noise(seed, j + k) * w;
          }
          l.geometry.attributes.position.needsUpdate = true;
        });

        smoke.forEach(sm => {
          const on = pop > 0.2;
          sm.m.visible = on;
          if (!on) return;
          const u = (((t * 0.6 + sm.ph) % 1) + 1) % 1;
          sm.m.position.set(sm.x + Math.sin(t + sm.ph * 6) * 0.1, headY + 0.6 + u * 1.0, -0.1);
          sm.m.scale.setScalar(0.5 + u * 1.2);
          sm.m.material.opacity = 0.35 * (1 - u);
        });

        coilOrb.scale.setScalar(1 + load * 0.8 + pop * 1.2 + Math.sin(t * 9) * 0.1);
        coilRing.rotation.z = t * (1 + pop * 6);
        eyes.forEach(({ g, pupil }) => {
          pupil.position.x = lerp(pupil.position.x, pointer.x * 0.02, 0.15);
          pupil.position.y = lerp(pupil.position.y, pointer.y * 0.02, 0.15);
          g.scale.y = eat && eat.p > 0.3 ? 0.45 : load > 0.3 ? 0.4 : pop > 0.3 ? 1.3 : blink;
        });
        eyeGlow.color.setHSL(0.52 - pop * 0.38, 0.95, 0.6 + load * 0.2 + pop * 0.15);
        let mo = 1;
        if (eat) mo = eat.p > 0.12 && eat.p < 0.85 ? 1.3 + ph.chew * 0.7 : 1;
        if (pop > 0.3) mo = 1.7;
        mouth.scale.set(mo, mo, 1);

        ring.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04 + pop * 0.6 + groove * 0.1);
        ring.material.opacity = (0.14 + pop * 0.35 + load * 0.15) * power;
        glow.intensity = (0.35 + load * 0.8 + pop * 1.8 + groove * 0.4) * power;

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.6, headY - 0.04, ph.fall * ph.fall), 0.68);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.8);
        } else food.visible = false;
      }
    };
  }
});
