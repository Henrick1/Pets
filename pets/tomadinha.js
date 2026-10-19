Pets.register({
  id: "tomadinha",
  dex: 14,
  name: "Tomadinha",
  color: "#f2efe4",
  types: ["electric"],
  description: "Um bichinho em forma de tomada que vive escondido atrás dos móveis. Quando leva um susto, solta faíscas pelos furinhos e o rabo de fio se enrola todo. Adora encostar o plugue do rabo em qualquer lugar para recarregar.",
  evolvesTo: "curtocircuito",
  evolveLevel: 10,
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    spark: { duration: 1.8 },
    charge: { duration: 2.8 }
  },
  idle: [
    { action: "spark", min: 20, max: 45 },
    { action: "charge", min: 40, max: 80 }
  ],
  clickAction: n => ["spark", "jump", "charge", "spark"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const plastic = new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.35, metalness: 0.02 });
    const plasticShade = new THREE.MeshStandardMaterial({ color: 0xcfc6b0, roughness: 0.45 });
    const holeMat = mat(0x16130f, 0.6);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 0.35 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.2, metalness: 0.9 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x9ff3ff });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });

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

    const BODY_Y = 0.95;
    const body = mesh(roundedBox(1.35, 1.35, 0.7, 0.42), plastic);
    body.position.y = BODY_Y;
    squash.add(body);

    const face = new THREE.Group();
    face.position.set(0, BODY_Y, 0.43);
    squash.add(face);

    const wellShape = new THREE.Shape();
    for (let k = 0; k <= 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      const r = 0.5;
      if (k === 0) wellShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else wellShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const ring = mesh(new THREE.ExtrudeGeometry(wellShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3, curveSegments: 6 }), plasticShade, false);
    ring.scale.set(1, 1, 1);
    ring.position.z = -0.05;
    face.add(ring);
    const wellIn = mesh(new THREE.CircleGeometry(0.47, 48), new THREE.MeshStandardMaterial({ color: 0xe3dccb, roughness: 0.5 }), false);
    wellIn.position.z = 0.04;
    face.add(wellIn);

    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.17 * s, 0.1, 0.045);
      const hole = mesh(new THREE.CircleGeometry(0.085, 32), holeMat, false);
      g.add(hole);
      const tube = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.08, 24, 1, true), holeMat, false);
      tube.rotation.x = Math.PI / 2;
      tube.position.z = -0.04;
      g.add(tube);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), glowMat);
      pupil.position.z = 0.003;
      g.add(pupil);
      const shine = new THREE.Mesh(new THREE.CircleGeometry(0.014, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(0.012, 0.014, 0.004);
      pupil.add(shine);
      face.add(g);
      return { g, pupil };
    });
    const mouth = new THREE.Group();
    mouth.position.set(0, -0.17, 0.045);
    face.add(mouth);
    const mouthHole = mesh(new THREE.CircleGeometry(0.07, 28), holeMat, false);
    mouth.add(mouthHole);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffa3a3, transparent: true, opacity: 0.6, depthWrite: false });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.06, 20), cheekMat);
      c.scale.set(1, 0.6, 1);
      c.position.set(0.31 * s, -0.08, 0.046);
      face.add(c);
    });
    const screw = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 16), metalMat, false);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(0, 0.6, 0.03);
    face.add(screw);
    const slot = mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), holeMat, false);
    slot.position.set(0, 0.6, 0.042);
    face.add(slot);

    const bolt = new THREE.Shape();
    bolt.moveTo(0.02, 0.12);
    bolt.lineTo(-0.05, 0.0);
    bolt.lineTo(0.0, 0.0);
    bolt.lineTo(-0.03, -0.12);
    bolt.lineTo(0.06, 0.03);
    bolt.lineTo(0.01, 0.03);
    bolt.lineTo(0.04, 0.12);
    bolt.lineTo(0.02, 0.12);
    const badge = mesh(new THREE.ExtrudeGeometry(bolt, { depth: 0.02, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xffd23a, emissive: 0xffb000, emissiveIntensity: 0.4 }), false);
    badge.position.set(0.5, BODY_Y + 0.5, 0.42);
    badge.scale.setScalar(0.8);
    squash.add(badge);

    const feet = [-1, 1].map(s => {
      const f = mesh(new THREE.SphereGeometry(0.18, 24, 16), plasticShade);
      f.scale.set(1.15, 0.55, 1.35);
      f.position.set(0.36 * s, 0.12, 0.08);
      squash.add(f);
      return f;
    });
    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.76 * s, BODY_Y - 0.05, 0.05);
      const a = mesh(new THREE.SphereGeometry(0.13, 20, 14), plastic);
      a.scale.set(0.75, 1.15, 0.75);
      a.position.set(0.05 * s, -0.12, 0);
      pivot.add(a);
      squash.add(pivot);
      return { pivot, s };
    });

    const CABLE_N = 60;
    const cablePts = [];
    for (let i = 0; i <= CABLE_N; i++) cablePts.push(V3(0, 0, 0));
    const cableCurve = new THREE.CatmullRomCurve3(cablePts);
    let cable = mesh(new THREE.TubeGeometry(cableCurve, 120, 0.045, 8, false), cableMat);
    squash.add(cable);
    const plug = new THREE.Group();
    squash.add(plug);
    const plugBody = mesh(roundedBox(0.2, 0.26, 0.12, 0.07), plastic, false);
    plugBody.rotation.x = Math.PI / 2;
    plug.add(plugBody);
    const plugCap = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16), plastic, false);
    plugCap.position.y = -0.18;
    plug.add(plugCap);
    [-1, 1].forEach(s => {
      const pin = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12), metalMat, false);
      pin.position.set(0.055 * s, 0.2, 0);
      plug.add(pin);
    });

    const sparks = [];
    for (let k = 0; k < 14; k++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), sparkMat);
      m.visible = false;
      squash.add(m);
      sparks.push({ m, k, a: (k / 14) * Math.PI * 2, ph: k * 0.37, from: k % 3 });
    }
    const arcMat = new THREE.LineBasicMaterial({ color: 0xfff6a0 });
    const arcs = [0, 1, 2].map(k => {
      const g = new THREE.BufferGeometry();
      const arr = new Float32Array(8 * 3);
      g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const l = new THREE.Line(g, arcMat);
      l.visible = false;
      l.frustumCulled = false;
      squash.add(l);
      return { l, arr, k };
    });

    const ringG = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.95, 56),
      new THREE.MeshBasicMaterial({ color: 0x9ff3ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false })
    );
    ringG.rotation.x = -Math.PI / 2;
    ringG.position.y = 0.012;
    root.add(ringG);

    const glow = new THREE.PointLight(0xbff6ff, 0.3, 4);
    glow.position.set(0, BODY_Y, 0.9);
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
        const spark = action && action.name === "spark" ? action : null;
        const charge = action && action.name === "charge" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const power = s.dying ? 0.2 : 0.5 + 0.5 * Math.max(0, Math.min(1, hunger / 100));

        let y = 0;
        let sy = 1 + Math.sin(t * 2.4) * 0.02 * motion;
        let airborne = false;
        let shake = 0;
        let fright = 0;
        let plugIn = 0;
        let juice = 0;
        if (jump) {
          const p = jump.p;
          if (p < 0.18) sy = 1 - 0.2 * Math.sin((p / 0.18) * Math.PI / 2);
          else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.1;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            airborne = true;
          } else sy = 1 - 0.16 * Math.sin(((p - 0.78) / 0.22) * Math.PI);
        }
        if (spark) {
          fright = smooth(0, 0.08, spark.p) * (1 - smooth(0.6, 1, spark.p));
          shake = fright * Math.sin(t * 60) * 0.04;
          sy += fright * 0.08;
          y += fright * 0.12;
        }
        if (charge) {
          plugIn = smooth(0.05, 0.3, charge.p) * (1 - smooth(0.82, 1, charge.p));
          juice = smooth(0.3, 0.55, charge.p) * (1 - smooth(0.78, 0.9, charge.p));
          sy += juice * 0.04 * Math.sin(t * 18);
        }
        if (eat) sy += 0.04 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.06;
        if (s.dying) sy *= 0.93;
        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.set(shake, y, 0);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        squash.rotation.z = Math.sin(t * 1.3) * 0.03 * motion + shake * 2;

        eyes.forEach(({ g, pupil }) => {
          pupil.position.x = lerp(pupil.position.x, pointer.x * 0.03, 0.15);
          pupil.position.y = lerp(pupil.position.y, pointer.y * 0.03, 0.15);
          const open = eat && eat.p > 0.3 ? 0.45 : blink;
          g.scale.y = fright > 0.3 ? 1.25 : open;
          pupil.scale.setScalar(fright > 0.3 ? 0.6 : 1 + juice * 0.4);
        });
        glowMat.color.setHSL(0.52, 0.9, 0.55 + juice * 0.3 + fright * 0.2);
        let mouthOpen = 1;
        if (eat) mouthOpen = eat.p > 0.12 && eat.p < 0.85 ? 1.2 + ph.chew * 0.6 : 1;
        if (fright > 0.3) mouthOpen = 1.5;
        if (airborne) mouthOpen = 1.3;
        mouth.scale.set(mouthOpen, mouthOpen, 1);

        arms.forEach(({ pivot, s: sd }) => {
          const target = airborne ? 2.2 : fright > 0.2 ? 2.6 : eat ? 1.0 : 0.25 + Math.sin(t * 2.6 + sd) * 0.1 * motion;
          pivot.rotation.z = lerp(pivot.rotation.z, target * sd, 0.2);
        });
        feet.forEach(f => {
          f.position.y = airborne ? 0.05 : 0.12;
        });

        const base = V3(0.35, 0.35, -0.38);
        const coil = 1 + fright * 0.6;
        for (let i = 0; i <= CABLE_N; i++) {
          const u = i / CABLE_N;
          const a = u * Math.PI * (7 + fright * 4) + t * 0.6;
          const rr = 0.14 * (1 - u * 0.4) * coil;
          const wagT = Math.sin(t * 2.2 - u * 3) * 0.2 * u * motion;
          const restP = V3(base.x + u * 0.9 + Math.cos(a) * rr + wagT, base.y + Math.sin(u * Math.PI) * 0.35 + Math.sin(a) * rr, base.z - u * 0.55);
          const plugTarget = V3(0.95, 0.05, 0.25);
          const reachP = V3(lerp(base.x, plugTarget.x, u) + Math.sin(u * Math.PI) * 0.2, base.y + Math.sin(u * Math.PI) * 0.45 - u * (base.y - plugTarget.y), lerp(base.z, plugTarget.z, u));
          cablePts[i].copy(restP).lerp(reachP, plugIn);
        }
        cableCurve.updateArcLengths();
        cable.geometry.dispose();
        cable.geometry = new THREE.TubeGeometry(cableCurve, 120, 0.045, 8, false);
        const tip = cablePts[CABLE_N];
        const tdir = tip.clone().sub(cablePts[CABLE_N - 2]).normalize();
        plug.position.copy(tip).addScaledVector(tdir, 0.12);
        plug.quaternion.setFromUnitVectors(V3(0, 1, 0), tdir);

        const sparkOn = fright > 0.15 || juice > 0.2;
        const src = [V3(-0.17, BODY_Y + 0.1, 0.5), V3(0.17, BODY_Y + 0.1, 0.5), V3(0, BODY_Y - 0.17, 0.5)];
        sparks.forEach(sp => {
          sp.m.visible = sparkOn;
          if (!sparkOn) return;
          const u = (((t * 1.8 + sp.ph) % 1) + 1) % 1;
          const from = juice > 0.2 ? plug.position : src[sp.from];
          const a = sp.a + t * 2;
          const rad = 0.15 + u * (0.5 + fright * 0.4);
          sp.m.position.set(from.x + Math.cos(a) * rad, from.y + Math.sin(a) * rad * 0.8 + u * 0.2, from.z + 0.1 + u * 0.2);
          sp.m.rotation.set(t * 5 + sp.k, t * 3, 0);
          sp.m.scale.setScalar(Math.max(0.01, Math.sin(Math.PI * u)) * (0.8 + juice));
        });
        arcs.forEach(({ l, arr, k }) => {
          const on = juice > 0.25 && Math.sin(t * 40 + k * 2) > -0.2;
          l.visible = on;
          if (!on) return;
          const a0 = plug.position;
          const a1 = V3(0, BODY_Y + 0.6 + k * 0.1, 0.1);
          const seed = Math.floor(t * 16) + k * 7;
          for (let j = 0; j < 8; j++) {
            const f = j / 7;
            const w = Math.sin(f * Math.PI) * 0.12;
            arr[j * 3] = lerp(a0.x, a1.x, f) + noise(seed + j, 1) * w;
            arr[j * 3 + 1] = lerp(a0.y, a1.y, f) + noise(2, seed - j) * w;
            arr[j * 3 + 2] = lerp(a0.z, a1.z, f) + noise(seed, j) * w;
          }
          l.geometry.attributes.position.needsUpdate = true;
        });

        badge.material.emissiveIntensity = (0.3 + juice * 1.5 + fright * 0.8) * power;
        ringG.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04 + juice * 0.6 + fright * 0.3);
        ringG.material.opacity = (0.15 + juice * 0.35 + fright * 0.2) * power;
        glow.intensity = (0.25 + juice * 1.4 + fright * 0.8) * power;

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, BODY_Y - 0.17, ph.fall * ph.fall), 0.58);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.8);
        } else food.visible = false;
      }
    };
  }
});
