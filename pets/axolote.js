Pets.register({
  id: "axolote",
  dex: 5,
  name: "Axolote",
  color: "#b36ad6",
  types: ["poison"],
  evolveBranches: { happy: "axolirio", sad: "lugubrio" },
  evolveLevel: 15,
  description: "Anfíbio coberto de lodo roxo venenoso. Suas brânquias ramificadas soltam toxinas quando ele se sente ameaçado.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    gills: { duration: 1.8 },
    toxic: { duration: 2.2 },
    crawl: { duration: 2.6 }
  },
  idle: [
    { action: "gills", min: 15, max: 35 },
    { action: "crawl", min: 25, max: 50 },
    { action: "toxic", min: 35, max: 70 },
    { action: "jump", min: 45, max: 85 }
  ],
  clickAction: n => ["jump", "gills", "toxic", "crawl"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase } = kit;

    const std = (color, rough = 0.55, extra = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

    const skin = std(0xfce8ee);
    const slimeMat = std(0x7b3fb0, 0.15, {
      emissive: 0x3a1470,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const lumpMat = std(0x9a5cd0, 0.12, {
      emissive: 0x4a1c88,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const dotMat = std(0x7234b0, 0.3, { emissive: 0x2a1055, emissiveIntensity: 0.5 });
    const stalkMat = std(0xa24fc4, 0.5);
    const filMat = std(0xd16bd8, 0.5);
    const darkMat = std(0x14101c, 0.2);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x8a3b58 });
    const blushMat = new THREE.MeshBasicMaterial({ color: 0xffa6c1, transparent: true, opacity: 0.7 });
    const finMat = std(0xffffff, 0.5, {
      vertexColors: true,
      side: THREE.DoubleSide
    });

    const spline = (pts, u) => {
      const n = pts.length - 1;
      const f = Math.min(u, 0.9999) * n;
      const i = Math.floor(f);
      const k = f - i;
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, n)];
      const k2 = k * k;
      const k3 = k2 * k;
      return [0, 1, 2].map(
        a =>
          0.5 *
          (2 * p1[a] +
            (-p0[a] + p2[a]) * k +
            (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * k2 +
            (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * k3)
      );
    };

    const root = new THREE.Group();
    const squash = new THREE.Group();
    const pose = new THREE.Group();
    pose.scale.setScalar(1.3);
    pose.position.x = 0.05;
    root.add(squash);
    squash.add(pose);

    const CY = 0.52;
    const zProfile = [
      [-1.0, 0.1],
      [-0.85, 0.26],
      [-0.6, 0.44],
      [-0.2, 0.54],
      [0.2, 0.55],
      [0.5, 0.46],
      [0.7, 0.32],
      [0.8, 0.2]
    ];
    const rAt = z => {
      for (let i = 0; i < zProfile.length - 1; i++) {
        const [z0, r0] = zProfile[i];
        const [z1, r1] = zProfile[i + 1];
        if (z >= z0 && z <= z1) return lerp(r0, r1, (z - z0) / (z1 - z0));
      }
      return 0.2;
    };

    const bodyPts = [new THREE.Vector2(0.001, -1.03)]
      .concat(zProfile.map(([z, r]) => new THREE.Vector2(r, z)))
      .concat([new THREE.Vector2(0.001, 0.85)]);
    const bodyGeo = new THREE.LatheGeometry(bodyPts, 40);
    bodyGeo.rotateX(Math.PI / 2);
    const body = mesh(bodyGeo, skin);
    body.scale.y = 0.72;
    body.position.y = CY;
    pose.add(body);

    const phiMax = z => 1.2 + 0.3 * Math.sin(z * 8.5 + 0.6) + 0.18 * Math.sin(z * 17 + 2.0);

    const buildSlime = () => {
      const NZ = 32;
      const NP = 28;
      const pos = [];
      const idx = [];
      for (let iz = 0; iz <= NZ; iz++) {
        const f = iz / NZ;
        const z = lerp(-0.78, 0.58, f);
        const pm = phiMax(z);
        const endK = 1 - Math.pow(Math.abs(f * 2 - 1), 5);
        const r = rAt(z);
        for (let ip = 0; ip <= NP; ip++) {
          const u = (ip / NP) * 2 - 1;
          const phi = u * pm;
          const noise = 0.75 + 0.25 * Math.sin(z * 11 + u * 4) * Math.cos(z * 7 - u * 3);
          const off = 0.004 + 0.09 * (1 - Math.pow(Math.abs(u), 3)) * endK * noise;
          pos.push(Math.sin(phi) * (r + off), CY + Math.cos(phi) * (r * 0.72 + off), z);
        }
      }
      for (let iz = 0; iz < NZ; iz++) {
        for (let ip = 0; ip < NP; ip++) {
          const a = iz * (NP + 1) + ip;
          const b = a + 1;
          const c = a + NP + 1;
          const d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    pose.add(mesh(buildSlime(), slimeMat, false));

    [
      [-0.5, 0.0, 0.1],
      [-0.3, 0.35, 0.08],
      [-0.1, -0.3, 0.12],
      [0.1, 0.2, 0.09],
      [0.3, -0.2, 0.1],
      [-0.65, -0.2, 0.07],
      [0.45, 0.1, 0.07],
      [-0.05, 0.65, 0.07],
      [-0.4, -0.55, 0.06]
    ].forEach(([z, u, sc]) => {
      const phi = u * phiMax(z);
      const r = rAt(z);
      const off = 0.085;
      const px = Math.sin(phi) * (r + off);
      const py = CY + Math.cos(phi) * (r * 0.72 + off);
      const lump = mesh(new THREE.SphereGeometry(1, 14, 10), lumpMat, false);
      lump.position.set(px, py, z);
      lump.lookAt(px + Math.sin(phi), py + Math.cos(phi), z);
      lump.scale.set(sc * 1.3, sc * 1.1, sc * 0.55);
      pose.add(lump);
    });

    const dripPts = [];
    for (let i = 14; i >= 0; i--) {
      dripPts.push(new THREE.Vector2(0.021, 0.02 - (i / 14) * 1.02));
    }
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      dripPts.push(new THREE.Vector2(Math.max(0.0001, 0.021 * Math.cos(a)), 0.02 + 0.021 * Math.sin(a)));
    }
    const dripGeo = new THREE.LatheGeometry(dripPts, 16);
    const bulbPts = [];
    const bulbTop = Math.acos(0.029 / 0.048);
    for (let i = 0; i <= 14; i++) {
      const a = -Math.PI / 2 + (i / 14) * (Math.PI / 2 + bulbTop);
      bulbPts.push(new THREE.Vector2(Math.max(0.0001, 0.048 * Math.cos(a)), 0.048 * Math.sin(a)));
    }
    const neckY = 0.048 * Math.sin(bulbTop);
    for (let j = 1; j <= 6; j++) {
      const k = j / 6;
      bulbPts.push(new THREE.Vector2(0.021 + 0.008 * (1 - Math.sin(k * Math.PI / 2)), neckY + k * 0.022));
    }
    const bulbGeo = new THREE.LatheGeometry(bulbPts, 16);
    const drips = [];
    for (let k = 0; k < 9; k++) {
      [-1, 1].forEach(s => {
        const z = -0.68 + k * 0.15 + (s > 0 ? 0.05 : 0);
        const phi = phiMax(z) * 0.98 * s;
        const r = rAt(z);
        const g = new THREE.Group();
        g.position.set(Math.sin(phi) * (r - 0.005), CY + Math.cos(phi) * (r * 0.72 - 0.005), z);
        const cone = mesh(dripGeo, slimeMat, false);
        const bulb = mesh(bulbGeo, slimeMat, false);
        const nx = Math.sin(phi);
        const ny = Math.cos(phi) / 0.72;
        const nl = Math.hypot(nx, ny);
        const base = mesh(new THREE.SphereGeometry(1, 20, 14), slimeMat, false);
        base.scale.set(0.036, 0.05, 0.04);
        base.position.set((-nx / nl) * 0.012, (-ny / nl) * 0.012 + 0.005, 0);
        g.add(cone, bulb, base);
        pose.add(g);
        drips.push({ cone, bulb, len: 0.1 + 0.2 * (((k * 7 + (s > 0 ? 3 : 0)) % 6) / 6), ph: k * 1.7 + (s > 0 ? 1 : 0) });
      });
    }

    const head = new THREE.Group();
    head.position.set(0, 0.5, 0.78);
    pose.add(head);

    const shape = new THREE.Group();
    shape.scale.set(1.15, 0.65, 1.0);
    head.add(shape);
    shape.add(mesh(new THREE.SphereGeometry(0.6, 40, 30), skin));

    const capGeo = (r, ang) => {
      const g = new THREE.SphereGeometry(r, 24, 8, 0, Math.PI * 2, 0, ang);
      g.rotateX(Math.PI / 2);
      return g;
    };
    const onShape = (obj, x, y, z) => {
      const p = new THREE.Vector3(x, y, z).normalize();
      obj.lookAt(p.x * 2, p.y * 2, p.z * 2);
      shape.add(obj);
    };

    [
      [-0.4, 0.85, 0.2, 0.2],
      [0.05, 0.95, 0.1, 0.16],
      [0.45, 0.8, 0.25, 0.18],
      [-0.75, 0.6, -0.05, 0.13],
      [0.8, 0.55, 0.0, 0.14],
      [-0.2, 0.7, 0.65, 0.11],
      [0.3, 0.65, 0.6, 0.1],
      [-0.5, 0.8, -0.35, 0.12],
      [0.5, 0.78, -0.3, 0.11],
      [0, 0.97, -0.35, 0.12]
    ].forEach(([x, y, z, ang]) => onShape(new THREE.Mesh(capGeo(0.605, ang), dotMat), x, y, z));

    [-1, 1].forEach(s => onShape(new THREE.Mesh(capGeo(0.603, 0.15), blushMat), 0.7 * s, -0.15, 0.6));

    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.34 * s, 0.15, 0.42);
      g.add(mesh(new THREE.SphereGeometry(0.065, 16, 12), darkMat, false));
      const shine = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      shine.position.set(0.025, 0.028, 0.05);
      g.add(shine);
      head.add(g);
      return { g };
    });

    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.018, 8, 8), mouthMat, false);
      n.position.set(0.07 * s, 0.02, 0.6);
      head.add(n);
    });

    const smile = mesh(new THREE.TorusGeometry(0.28, 0.028, 6, 28, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.scale.set(1, 0.35, 1);
    smile.position.set(0, -0.04, 0.585);
    head.add(smile);

    const openMouth = mesh(new THREE.SphereGeometry(0.13, 20, 14), mouthMat, false);
    openMouth.scale.set(1.5, 1, 0.4);
    openMouth.position.set(0, -0.1, 0.57);
    openMouth.visible = false;
    head.add(openMouth);

    const stalkGeo = new THREE.ConeGeometry(0.05, 1, 8);
    const filGeo = new THREE.ConeGeometry(0.018, 1, 6);
    const buildGill = () => {
      const g = new THREE.Group();
      const stalk = mesh(stalkGeo, stalkMat, false);
      stalk.scale.y = 0.62;
      stalk.position.y = 0.31;
      g.add(stalk);
      [0.18, 0.3, 0.42, 0.54].forEach(f => {
        const l = 0.28 * (1 - f * 0.7);
        [-1, 1].forEach(sd =>
          [0, Math.PI / 2].forEach(ry => {
            const pv = new THREE.Group();
            pv.position.y = f;
            pv.rotation.y = ry;
            pv.rotation.z = sd * 0.9;
            const fil = mesh(filGeo, filMat, false);
            fil.scale.y = l;
            fil.position.y = l / 2;
            pv.add(fil);
            g.add(pv);
          })
        );
      });
      g.scale.setScalar(1.1);
      return g;
    };

    const gills = [];
    [-1, 1].forEach(s => {
      [
        [0.2, 0.9, -0.2],
        [0.08, 0.4, -0.22],
        [-0.04, -0.1, -0.2]
      ].forEach(([gy, alpha, gz], k) => {
        const pivot = new THREE.Group();
        pivot.position.set(0.55 * s, gy, gz);
        pivot.rotation.x = -0.45;
        pivot.add(buildGill());
        head.add(pivot);
        gills.push({ pivot, side: s, alpha, i: k + (s > 0 ? 3 : 0) });
      });
    });

    const buildFoot = () => {
      const g = new THREE.Group();
      const palm = mesh(new THREE.SphereGeometry(1, 18, 12), skin, false);
      palm.scale.set(0.05, 0.034, 0.07);
      palm.position.z = 0.02;
      g.add(palm);
      [
        [-0.027, -0.08, 0.09, 0.07, 0],
        [0, 0, 0.11, 0.1, 0.05],
        [0.027, 0.08, 0.09, 0.07, 0]
      ].forEach(([fx, ang, l1, l2, curl]) => {
        const f = new THREE.Group();
        f.position.set(fx, 0, 0.05);
        f.rotation.y = ang;
        const a1 = mesh(new THREE.CylinderGeometry(0.021, 0.029, l1, 10), skin, false);
        a1.rotation.x = Math.PI / 2;
        a1.position.z = l1 / 2;
        const knuckle = new THREE.Group();
        knuckle.position.z = l1;
        knuckle.rotation.y = curl;
        const a2 = mesh(new THREE.CylinderGeometry(0.012, 0.021, l2, 10), skin, false);
        a2.rotation.x = Math.PI / 2;
        a2.position.z = l2 / 2;
        const tip = mesh(new THREE.SphereGeometry(0.0135, 10, 8), skin, false);
        tip.position.z = l2;
        const joint = mesh(new THREE.SphereGeometry(0.021, 10, 8), skin, false);
        knuckle.add(joint, a2, tip);
        f.add(a1, knuckle);
        g.add(f);
      });
      return g;
    };

    const LEG_OUT = 0.9;
    const legs = [];
    [
      [-0.45, 0.35, true],
      [0.45, 0.35, true],
      [-0.42, -0.45, false],
      [0.42, -0.45, false]
    ].forEach(([x, z, front]) => {
      const side = Math.sign(x);
      const k = front ? 1 : 1.1;
      const upperLen = 0.34 * k;
      const lowerLen = 0.27 * k;
      const shoulder = new THREE.Group();
      shoulder.position.set(x, 0.5, z);
      shoulder.rotation.z = side * LEG_OUT;
      const upper = mesh(new THREE.CylinderGeometry(0.1 * k, 0.07 * k, upperLen, 12), skin, false);
      upper.position.y = -upperLen / 2;
      const elbow = new THREE.Group();
      elbow.position.y = -upperLen;
      elbow.rotation.z = -side * LEG_OUT;
      const joint = mesh(new THREE.SphereGeometry(0.068 * k, 12, 10), skin, false);
      const lower = mesh(new THREE.CylinderGeometry(0.07 * k, 0.05 * k, lowerLen, 12), skin, false);
      lower.position.y = -lowerLen / 2;
      const hand = buildFoot();
      hand.position.y = -lowerLen;
      hand.scale.setScalar(1.1 * k);
      elbow.add(joint, lower, hand);
      shoulder.add(upper, elbow);
      pose.add(shoulder);
      legs.push({ shoulder, elbow, side, front });
    });

    const TAIL = [
      [0.0, 0.5, -0.85],
      [0.0, 0.44, -1.2],
      [0.25, 0.34, -1.5],
      [0.6, 0.26, -1.62],
      [0.95, 0.2, -1.45],
      [1.1, 0.18, -1.15]
    ];
    const NT = 22;
    const M = 8;
    const tailPos = new Float32Array(NT * M * 3);
    const tailIdx = [];
    for (let i = 0; i < NT - 1; i++) {
      for (let j = 0; j < M; j++) {
        const a = i * M + j;
        const b = i * M + ((j + 1) % M);
        const c = (i + 1) * M + j;
        const d = (i + 1) * M + ((j + 1) % M);
        tailIdx.push(a, b, c, b, d, c);
      }
    }
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
    tailGeo.setIndex(tailIdx);
    const tailMesh = mesh(tailGeo, skin);
    tailMesh.frustumCulled = false;
    pose.add(tailMesh);
    const tailTip = mesh(new THREE.SphereGeometry(1, 12, 10), skin);
    pose.add(tailTip);

    const finPos = new Float32Array(NT * 4 * 3);
    const finCol = new Float32Array(NT * 4 * 3);
    const finIdx = [];
    const colors = [
      [1, 0.84, 0.9],
      [0.72, 0.5, 0.9],
      [1, 0.84, 0.9],
      [0.85, 0.65, 0.95]
    ];
    for (let i = 0; i < NT; i++) {
      for (let v = 0; v < 4; v++) {
        const o = (i * 4 + v) * 3;
        finCol[o] = colors[v][0];
        finCol[o + 1] = colors[v][1];
        finCol[o + 2] = colors[v][2];
      }
    }
    for (let i = 0; i < NT - 1; i++) {
      const a = i * 4;
      const b = (i + 1) * 4;
      finIdx.push(a, a + 1, b, a + 1, b + 1, b);
      finIdx.push(a + 2, a + 3, b + 2, a + 3, b + 3, b + 2);
    }
    const finGeo = new THREE.BufferGeometry();
    finGeo.setAttribute("position", new THREE.BufferAttribute(finPos, 3));
    finGeo.setAttribute("color", new THREE.BufferAttribute(finCol, 3));
    finGeo.setIndex(finIdx);
    const finMesh = new THREE.Mesh(finGeo, finMat);
    finMesh.frustumCulled = false;
    pose.add(finMesh);

    const updateTail = (ctrl, t, motion) => {
      const pts = [];
      for (let i = 0; i < NT; i++) pts.push(spline(ctrl, i / (NT - 1)));
      for (let i = 0; i < NT; i++) {
        const c = pts[i];
        const pv = pts[Math.max(i - 1, 0)];
        const nx = pts[Math.min(i + 1, NT - 1)];
        let tx = nx[0] - pv[0];
        let tz = nx[2] - pv[2];
        const tl = Math.hypot(tx, tz) || 1;
        tx /= tl;
        tz /= tl;
        const nxv = tz;
        const nzv = -tx;
        const f = i / (NT - 1);
        const h = lerp(0.22, 0.045, Math.pow(f, 0.9));
        const w = h * 0.62;
        for (let j = 0; j < M; j++) {
          const a = (j / M) * Math.PI * 2;
          const o = (i * M + j) * 3;
          tailPos[o] = c[0] + nxv * w * Math.cos(a);
          tailPos[o + 1] = c[1] + h * Math.sin(a);
          tailPos[o + 2] = c[2] + nzv * w * Math.cos(a);
        }
        const scal = 1 + 0.2 * Math.sin(i * 2.1);
        const wave = 1 + 0.12 * Math.sin(t * 3 - i * 0.8) * motion;
        const dH = h * (0.9 + 0.8 * Math.sin(f * Math.PI * 0.85 + 0.2)) * scal * wave;
        const dV = dH * 0.7 * smooth(0.15, 0.5, f);
        const sway = Math.sin(t * 2.4 - i * 0.5) * 0.03 * f * motion;
        const o = i * 4 * 3;
        finPos[o] = c[0];
        finPos[o + 1] = c[1] + h * 0.95;
        finPos[o + 2] = c[2];
        finPos[o + 3] = c[0] + nxv * sway;
        finPos[o + 4] = c[1] + h * 0.95 + dH;
        finPos[o + 5] = c[2] + nzv * sway;
        finPos[o + 6] = c[0];
        finPos[o + 7] = c[1] - h * 0.95;
        finPos[o + 8] = c[2];
        finPos[o + 9] = c[0] + nxv * sway;
        finPos[o + 10] = c[1] - h * 0.95 - dV;
        finPos[o + 11] = c[2] + nzv * sway;
      }
      const tip = pts[NT - 1];
      tailTip.position.set(tip[0], tip[1], tip[2]);
      tailTip.scale.set(0.045 * 0.62, 0.045, 0.045 * 0.62);
      tailGeo.attributes.position.needsUpdate = true;
      tailGeo.computeVertexNormals();
      finGeo.attributes.position.needsUpdate = true;
      finGeo.computeVertexNormals();
    };

    const bubbles = [];
    for (let i = 0; i < 6; i++) {
      const m = std(0xb27ae0, 0.1, {
        transparent: true,
        opacity: 0,
        emissive: 0x5a2a99,
        emissiveIntensity: 0.3
      });
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), m);
      pose.add(b);
      bubbles.push({ b, m, i });
    }

    const bursts = [];
    for (let i = 0; i < 8; i++) {
      const m = std(0xa060d8, 0.1, {
        transparent: true,
        opacity: 0,
        emissive: 0x6a2ab0,
        emissiveIntensity: 0.6
      });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), m);
      b.visible = false;
      pose.add(b);
      const a = ((i - 3.5) / 3.5) * 0.9;
      const e = 0.15 + (i % 3) * 0.18;
      bursts.push({ b, m, dir: [Math.sin(a) * 0.9, e, Math.cos(a)], delay: (i % 4) * 0.06 });
    }

    const food = new THREE.Group();
    food.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 8, 16, Math.PI * 1.4), std(0xd9848c, 0.5)));
    food.visible = false;
    pose.add(food);

    return {
      root,
      update(s) {
        const { t, lookYaw, lookPitch, blink, action, motion } = s;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.02 * motion;
        let airborne = false;
        let flare = 0;
        let flutter = 0.1;
        let tailAmp = 1;
        let tailLift = 0;
        let mouthOpen = false;
        let squint = false;
        let headPush = 0;
        let headPitch = 0;
        let headYaw = 0;
        let poseYaw = 0;
        let glow = 0;
        let puff = 0;
        let crawlK = 0;
        let phase = 0;
        let tuck = 0;

        if (a === "jump") {
          if (p < 0.18) {
            sy = 1 - 0.2 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.0;
            sy = 1 + 0.1 * Math.cos(q * Math.PI);
            airborne = true;
            flare = -0.5;
            tailLift = 1;
            tuck = 1;
            flutter = 0.4;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.18 * Math.sin(q * Math.PI);
          }
        }

        if (a === "gills") {
          const k = smooth(0, 0.12, p) * (1 - smooth(0.88, 1, p));
          flare = 0.45 * k;
          flutter = 0.1 + 0.6 * k;
          headPitch = -0.12 * k;
          tailAmp = 1 + 0.8 * k;
        }

        if (a === "crawl") {
          crawlK = smooth(0, 0.1, p) * (1 - smooth(0.9, 1, p));
          phase = p * Math.PI * 8;
          tailAmp = 1 + 1.2 * crawlK;
          headYaw = -Math.sin(phase) * 0.2 * crawlK;
          poseYaw = Math.sin(phase) * 0.1 * crawlK;
          y = Math.abs(Math.sin(phase)) * 0.02 * crawlK;
          flutter = 0.25;
        }

        if (a === "toxic") {
          if (p < 0.3) {
            const k = smooth(0, 0.3, p);
            puff = k;
            flare = -0.4 * k;
            glow = k;
          } else {
            puff = 1 - smooth(0.3, 0.4, p);
            headPush = Math.sin(smooth(0.3, 0.4, p) * Math.PI) * 0.15;
            mouthOpen = p < 0.65;
            glow = 1 - smooth(0.6, 1, p);
            flare = 0.3 * (1 - smooth(0.5, 0.9, p));
            flutter = 0.4;
          }
        }

        if (a === "eat") {
          sy += 0.04 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.05 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, 0.5, ph.fall * ph.fall), lerp(1.25, 1.38, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = Math.sin(t * 14) * 0.3 + (1 - ph.fall) * 1.0;
          mouthOpen = p > 0.12 && p < 0.85 && (p < 0.3 || ph.chew > 0.35);
          openMouth.scale.y = 0.6 + ph.chew * 0.7;
          squint = p > 0.3;
          headPitch = 0.12 * (p < 0.3 ? Math.sin((p / 0.3) * Math.PI) : 0) + ph.chew * 0.08;
          flutter = 0.35;
          tailAmp = 1.6;
        } else {
          food.visible = false;
          openMouth.scale.y = 1;
        }

        const sx = (1 / Math.sqrt(sy)) * (1 + 0.1 * puff);
        squash.scale.set(sx, sy * (1 + 0.05 * puff), sx);
        root.position.y = y;
        root.rotation.y = lookYaw * 0.35;
        pose.rotation.y = -0.35 + poseYaw;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.3) * 0.015 * motion;

        head.position.set(0, 0.5 + Math.sin(t * 2) * 0.008 * motion, 0.78 + headPush);
        head.rotation.y = lookYaw * 0.5 + headYaw;
        head.rotation.x = -lookPitch * 0.6 + headPitch;
        head.rotation.z = Math.sin(t * 1.1) * 0.03 * motion;

        gills.forEach(({ pivot, side, alpha, i }) => {
          const wave =
            Math.sin(t * 2.2 + i) * 0.08 * motion + Math.sin(t * 16 + i * 1.9) * flutter * 0.2 * motion;
          pivot.rotation.z = lerp(pivot.rotation.z, side * (alpha + flare + wave - Math.PI / 2), 0.3);
        });

        legs.forEach(({ shoulder, elbow, side, front }, i) => {
          const diag = front === side < 0 ? 0 : Math.PI;
          const swing = -Math.sin(phase + diag) * 0.5 * crawlK;
          const lift = Math.max(0, Math.cos(phase + diag)) * 0.7 * crawlK + tuck * 0.55;
          const idle = Math.sin(t * 1.2 + i) * 0.02 * motion;
          shoulder.rotation.x = lerp(shoulder.rotation.x, swing + idle + tuck * (front ? -0.4 : 0.4), 0.3);
          elbow.rotation.z = lerp(elbow.rotation.z, -side * (LEG_OUT - lift), 0.3);
        });

        const ctrl = TAIL.map((pt, i) => {
          const f = i / (TAIL.length - 1);
          const sw = Math.sin(t * 1.6 + f * 3.2) * 0.12 * f * tailAmp * motion;
          return [pt[0] + sw * 0.6, pt[1] + tailLift * 0.35 * f * f, pt[2] + sw];
        });
        updateTail(ctrl, t, motion);

        slimeMat.emissiveIntensity = 0.5 + glow + Math.sin(t * 2) * 0.15 * motion;
        lumpMat.emissiveIntensity = 0.5 + glow;
        dotMat.emissiveIntensity = 0.5 + 0.9 * glow;
        drips.forEach(({ cone, bulb, len, ph: dp }) => {
          const l = len * (1 + 0.18 * Math.sin(t * 1.4 + dp) * motion + glow * 0.2);
          cone.scale.y = l;
          bulb.position.y = -l;
        });

        bubbles.forEach(({ b, m, i }) => {
          const f = (t * 0.3 + i / 6) % 1;
          b.position.set(Math.sin(i * 2.3) * 0.35 + Math.sin(t * 1.5 + i) * 0.06, 0.95 + f * 1.1, -0.55 + i * 0.18);
          b.scale.setScalar(0.04 + 0.025 * (i % 3));
          m.opacity = Math.sin(f * Math.PI) * 0.55;
        });

        bursts.forEach(({ b, m, dir, delay }) => {
          const q = (p - 0.3 - delay) / 0.5;
          const on = a === "toxic" && q > 0 && q < 1;
          b.visible = on;
          if (on) {
            b.position.set(dir[0] * q * 1.2, 0.45 + dir[1] * q * 1.2 + q * 0.25, 1.35 + dir[2] * q * 1.2);
            b.scale.setScalar(0.5 + q * 1.1);
            m.opacity = (1 - q) * 0.7;
          }
        });

        smile.visible = !mouthOpen;
        openMouth.visible = mouthOpen;

        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.3 : blink;
        });
      }
    };
  }
});
