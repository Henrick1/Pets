Pets.register({
  id: "morcego",
  name: "Morcego Raio",
  color: "#7b5cff",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    zap: { duration: 2.0 },
    dangle: { duration: 3.0 }
  },
  idle: [
    { action: "jump", min: 25, max: 50 },
    { action: "zap", min: 30, max: 60 },
    { action: "dangle", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "zap", "jump", "dangle"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;

    const ghostMat = new THREE.MeshStandardMaterial({
      color: 0xcfc4ff,
      roughness: 0.6,
      emissive: 0x4a3aa8,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x3b2a7a,
      roughness: 0.6,
      emissive: 0x1a1040,
      emissiveIntensity: 0.5,
      side: THREE.DoubleSide
    });
    const earMat = new THREE.MeshStandardMaterial({ color: 0x6a55d9, roughness: 0.6 });
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xffe14a });
    const boneMat = new THREE.LineBasicMaterial({ color: 0xb9a6ff });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a1230, roughness: 0.5 });

    const boltGeo = depth => {
      const pts = [
        [0.15, 1],
        [-0.35, 0.1],
        [-0.02, 0.1],
        [-0.2, -0.9],
        [0.38, -0.05],
        [0.05, -0.05],
        [0.35, 1]
      ];
      const s = new THREE.Shape();
      pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
      s.lineTo(pts[0][0], pts[0][1]);
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
      g.center();
      return g;
    };

    const wingGeo = () => {
      const s = new THREE.Shape();
      s.moveTo(0, 0.05);
      s.lineTo(0.55, 0.62);
      s.lineTo(1.25, 0.95);
      s.quadraticCurveTo(1.0, 0.4, 1.38, 0.2);
      s.quadraticCurveTo(1.1, -0.05, 1.1, -0.45);
      s.quadraticCurveTo(0.85, -0.4, 0.6, -0.8);
      s.quadraticCurveTo(0.3, -0.5, 0.05, -0.55);
      s.lineTo(0, 0.05);
      return new THREE.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false, curveSegments: 8 });
    };

    const boneGeo = () => {
      const wrist = new THREE.Vector3(0.55, 0.62, 0.04);
      const tips = [
        [1.25, 0.95],
        [1.38, 0.2],
        [1.1, -0.45],
        [0.6, -0.8]
      ];
      const pts = [];
      tips.forEach(([x, y]) => pts.push(wrist.clone(), new THREE.Vector3(x, y, 0.04)));
      return new THREE.BufferGeometry().setFromPoints(pts);
    };

    const root = new THREE.Group();
    const spinner = new THREE.Group();
    const squash = new THREE.Group();
    root.add(spinner);
    spinner.add(squash);

    const profile = [
      [0.001, 0],
      [0.08, 0.15],
      [0.2, 0.4],
      [0.4, 0.75],
      [0.55, 1.1],
      [0.6, 1.4],
      [0.55, 1.7],
      [0.38, 1.92],
      [0.15, 2.02],
      [0.001, 2.05]
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const body = mesh(new THREE.LatheGeometry(profile, 40), ghostMat);
    body.scale.setScalar(0.8);
    body.position.y = 0.55;
    squash.add(body);

    const wings = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.4 * s, 1.5, -0.05);
      pivot.scale.set(0.85 * s, 0.85, 0.85);
      pivot.add(mesh(wingGeo(), wingMat));
      pivot.add(new THREE.LineSegments(boneGeo(), boneMat));
      squash.add(pivot);
      return { pivot, side: s };
    });

    const ears = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.3 * s, 2.0, -0.02);
      const outer = mesh(new THREE.ConeGeometry(0.17, 0.62, 4), earMat);
      outer.rotation.y = Math.PI / 4;
      outer.scale.z = 0.35;
      outer.position.y = 0.25;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.4, 4), boltMat);
      inner.rotation.y = Math.PI / 4;
      inner.scale.z = 0.3;
      inner.position.set(0, 0.2, 0.03);
      pivot.add(outer, inner);
      pivot.rotation.z = -0.35 * s;
      squash.add(pivot);
      return { pivot, side: s };
    });

    const tuft = new THREE.Mesh(boltGeo(0.05), boltMat);
    tuft.scale.setScalar(0.22);
    tuft.position.set(0, 2.28, 0.05);
    tuft.rotation.z = 0.25;
    squash.add(tuft);

    const chestBolt = new THREE.Mesh(boltGeo(0.03), boltMat);
    chestBolt.scale.setScalar(0.17);
    chestBolt.position.set(0, 1.15, 0.33);
    squash.add(chestBolt);

    const tail = new THREE.Group();
    tail.position.set(0, 0.62, -0.02);
    const tailBolt = mesh(boltGeo(0.06), boltMat, false);
    tailBolt.scale.setScalar(0.34);
    tailBolt.position.y = -0.3;
    tail.add(tailBolt);
    squash.add(tail);

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.75, whiteColor: 0xfff27a, pupilColor: 0x3a1d6e });
      e.g.position.set(0.19 * s, 1.72, 0.39);
      squash.add(e.g);
      return e;
    });

    [-1, 1].forEach(s => {
      const fang = mesh(new THREE.ConeGeometry(0.035, 0.11, 8), whiteMat, false);
      fang.rotation.x = Math.PI;
      fang.position.set(0.075 * s, 1.47, 0.45);
      squash.add(fang);
    });

    const smile = mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 20, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 1.55, 0.455);
    squash.add(smile);

    const openMouth = mesh(new THREE.SphereGeometry(0.09, 20, 14), mouthMat, false);
    openMouth.scale.set(1.3, 1, 0.4);
    openMouth.position.set(0, 1.5, 0.44);
    openMouth.visible = false;
    squash.add(openMouth);

    const bolts = [];
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Mesh(boltGeo(0.04), boltMat);
      const ang = (i / 6) * Math.PI * 2;
      const r = 0.95 + (i % 2) * 0.3;
      b.position.set(Math.cos(ang) * r, 1.5 + Math.sin(ang) * r * 0.9, 0.25);
      b.visible = false;
      squash.add(b);
      bolts.push({ b, ang });
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    const FLIP_CY = 1.4;
    let last = 0;

    return {
      root,
      update(s) {
        const { t, pointer, blink, lookYaw, lookPitch, action, motion } = s;
        last = t;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.02 * motion;
        let flap = 0.1 + Math.sin(t * 4) * 0.18 * motion;
        let flipAngle = 0;
        let zapK = 0;
        let tailLift = 0;
        let earBack = 0;
        let mouthOpen = false;
        let squint = false;

        if (a === "jump") {
          if (p < 0.15) {
            sy = 1 - 0.1 * Math.sin((p / 0.15) * Math.PI / 2);
            flap = -0.25;
          } else if (p < 0.8) {
            const q = (p - 0.15) / 0.65;
            y = Math.sin(q * Math.PI) * 1.1;
            sy = 1 + 0.06 * Math.cos(q * Math.PI);
            flap = Math.sin(t * 24) * 0.6;
            tailLift = 1;
            earBack = 1;
          }
        }

        if (a === "zap") {
          const k = smooth(0, 0.15, p) * (1 - smooth(0.85, 1, p));
          zapK = k;
          flap = lerp(flap, 0.65 + Math.sin(t * 30) * 0.1, k);
          tailLift = k;
          y = 0.12 * k;
        }

        if (a === "dangle") {
          const k = smooth(0, 0.2, p) * (1 - smooth(0.8, 1, p));
          flipAngle = Math.PI * k + Math.sin(t * 2) * 0.06 * k;
          y = 0.35 * k;
          flap = lerp(flap, -1.0, k);
        }

        if (a === "eat") {
          sy += 0.04 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.06 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, 1.5, ph.fall * ph.fall), lerp(0.9, 0.55, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouthOpen = p > 0.12 && p < 0.85 && (p < 0.3 || ph.chew > 0.35);
          openMouth.scale.y = 0.6 + ph.chew * 0.8;
          squint = p > 0.3;
          flap = -0.45 + Math.sin(t * 10) * 0.08 * motion;
        } else {
          food.visible = false;
          openMouth.scale.y = 1;
        }

        const bob = 0.05 + Math.sin(t * 1.8) * 0.08 * motion;
        root.position.y = bob + y;
        root.rotation.y = lookYaw * 0.35;
        root.rotation.x = lookPitch * 0.6;
        spinner.rotation.z = flipAngle;
        spinner.position.set(FLIP_CY * Math.sin(flipAngle), FLIP_CY * (1 - Math.cos(flipAngle)), 0);

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        squash.position.x = Math.sin(t * 55) * 0.03 * zapK;

        ghostMat.emissiveIntensity = 0.35 + zapK * (0.8 + 0.6 * Math.sin(t * 40));

        wings.forEach(({ pivot, side }) => {
          pivot.rotation.z = lerp(pivot.rotation.z, side * flap, 0.35);
        });

        ears.forEach(({ pivot, side }, i) => {
          const flick = Math.pow(Math.max(0, Math.sin(t * 0.8 + i * 2.1)), 14) * 0.35 * motion;
          pivot.rotation.z = lerp(pivot.rotation.z, -side * (0.35 + earBack * 0.4 + flick), 0.25);
        });

        tail.rotation.z = lerp(tail.rotation.z, Math.sin(t * 2.2) * 0.15 * motion + tailLift * 0.5, 0.2);
        tuft.rotation.z = 0.25 + Math.sin(t * 3) * 0.08 * motion + zapK * Math.sin(t * 45) * 0.15;

        bolts.forEach(({ b, ang }, i) => {
          const on = zapK > 0.2 && Math.sin(t * 26 + i * 2.1) > -0.3;
          b.visible = on;
          b.rotation.z = ang + Math.sin(t * 20 + i) * 0.4;
          b.scale.setScalar(0.2 * (0.6 + 0.8 * zapK) * (0.8 + 0.3 * Math.sin(t * 35 + i)));
        });

        mouthOpen = mouthOpen || zapK > 0.5;
        smile.visible = !mouthOpen;
        openMouth.visible = mouthOpen;

        eyes.forEach(({ g }) => {
          const open = squint ? 0.35 : blink;
          g.scale.set(1 + 0.3 * zapK, open * (1 + 0.3 * zapK), 1);
        });
        followPupils(eyes, pointer, 0.8);
      }
    };
  }
});
