Pets.register({
  id: "lugubrio",
  dex: 7,
  name: "Lugúbrio",
  color: "#5a3a7a",
  types: ["poison", "dark"],
  description: "Quando um Axolote cresce triste, ele fica de pé, se fecha e puxa o lodo das costas até a cabeça como um capuz venenoso. As brânquias ficam caídas, espremidas pelo capuz, e uma mecha de lodo cobre um dos olhos. Quase não fala, mas onde passa deixa uma névoa escura e tóxica.",
  actions: {
    eat: { duration: 2.6 },
    fume: { duration: 3.0 },
    shadow: { duration: 3.0 },
    kick: { duration: 1.6 }
  },
  idle: [
    { action: "fume", min: 18, max: 40 },
    { action: "kick", min: 35, max: 70 },
    { action: "shadow", min: 45, max: 90 }
  ],
  clickAction: n => ["fume", "shadow", "kick"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const std = (color, rough = 0.55, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

    const skin = std(0xe6dcef, 0.5);
    const skinDark = std(0xb8a8cc, 0.55);
    const slimeMat = std(0x7236b0, 0.15, { emissive: 0x3a1470, emissiveIntensity: 0.45, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
    const glowMat = std(0xb070ff, 0.3, { emissive: 0x8a30e0, emissiveIntensity: 0.8 });
    const dotMat = std(0x5a3a80, 0.4);
    const darkMat = std(0x120a1a, 0.2);
    const shadowMat = std(0x3a2050, 0.6);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x4a2a40 });
    const plumeStalkMat = std(0x7a4a9a, 0.5);
    const plumeFilMat = std(0xffffff, 0.5);
    const plumeTipMat = std(0x9a6ac8, 0.4, { emissive: 0x4a1a80, emissiveIntensity: 0.4 });

    const tube = (pts, r0, r1, seg = 16, rad = 12) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const frames = curve.computeFrenetFrames(seg, false);
      const pos = [];
      const idx = [];
      for (let i = 0; i <= seg; i++) {
        const f = i / seg;
        const p = curve.getPointAt(f);
        const r = lerp(r0, r1, f);
        for (let j = 0; j <= rad; j++) {
          const a = (j / rad) * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
          pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
        }
      }
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    const root = new THREE.Group();
    const body = new THREE.Group();
    body.scale.setScalar(1.3);
    root.add(body);

    const legs = [-1, 1].map(s => {
      const hip = new THREE.Group();
      hip.position.set(0.2 * s, 0.78, -0.02);
      body.add(hip);
      hip.add(mesh(tube([V3(0, 0.06, 0), V3(0.03 * s, -0.2, 0.04), V3(0.04 * s, -0.36, 0.05)], 0.14, 0.1, 12, 14), skin));
      const knee = new THREE.Group();
      knee.position.set(0.04 * s, -0.36, 0.05);
      hip.add(knee);
      knee.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), skin));
      knee.add(mesh(tube([V3(0, 0, 0), V3(0, -0.18, -0.02), V3(0, -0.3, -0.03)], 0.095, 0.07, 10, 14), skin));
      const foot = new THREE.Group();
      foot.position.set(0, -0.32, -0.02);
      knee.add(foot);
      const palm = mesh(new THREE.SphereGeometry(1, 18, 12), skin);
      palm.scale.set(0.09, 0.05, 0.12);
      palm.position.set(0, -0.02, 0.05);
      foot.add(palm);
      [-0.45, -0.15, 0.15, 0.45].forEach((a, i) => {
        const l = i === 1 || i === 2 ? 0.17 : 0.13;
        foot.add(mesh(tube([V3(0, -0.03, 0.08), V3(Math.sin(a) * l * 0.6, -0.05, 0.08 + Math.cos(a) * l * 0.6), V3(Math.sin(a) * l, -0.06, 0.08 + Math.cos(a) * l)], 0.03, 0.018, 8, 8), skin));
        const tip = mesh(new THREE.SphereGeometry(0.02, 8, 6), skin);
        tip.position.set(Math.sin(a) * l, -0.06, 0.08 + Math.cos(a) * l);
        foot.add(tip);
      });
      return { hip, knee, foot, s };
    });

    const torsoPivot = new THREE.Group();
    torsoPivot.position.set(0, 0.8, 0);
    body.add(torsoPivot);
    const torso = new THREE.Group();
    torso.position.set(0, -0.8, 0);
    torsoPivot.add(torso);

    const TC = V3(0, 1.18, 0);
    const torsoGeo = new THREE.SphereGeometry(1, 56, 40);
    {
      const pos = torsoGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = [0.9, 0.86, 0.94];
      const B = [0.98, 0.95, 1.0];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const w = 1 + 0.12 * smooth(0.3, -0.7, y) - 0.12 * smooth(0.2, 0.9, y);
        pos.setXYZ(i, x * 0.38 * w, y * 0.48, z * 0.31 * w + 0.03 * smooth(0, -0.8, y) * Math.max(0, z));
        const b = smooth(0.2, 0.8, z) * smooth(0.5, -0.2, y);
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(A[j], B[j], b);
      }
      torsoGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      torsoGeo.computeVertexNormals();
    }
    const torsoMesh = mesh(torsoGeo, std(0xe6dcef, 0.5, { vertexColors: true }));
    torsoMesh.position.copy(TC);
    torso.add(torsoMesh);
    {
      const tdef = (x, y, z) => {
        const w = 1 + 0.12 * smooth(0.3, -0.7, y) - 0.12 * smooth(0.2, 0.9, y);
        return V3(x * 0.38 * w, y * 0.48, z * 0.31 * w + 0.03 * smooth(0, -0.8, y) * Math.max(0, z));
      };
      const spotMat = std(0x7234b0, 0.35, { emissive: 0x2a1055, emissiveIntensity: 0.35 });
      [[-0.35, 0.3, 0.06], [0.42, -0.05, 0.07], [-0.12, -0.38, 0.05], [0.95, 0.35, 0.05], [-1.05, -0.2, 0.06], [1.35, -0.4, 0.045], [-1.4, 0.45, 0.045]].forEach(([u, y, rr]) => {
        const c = Math.sqrt(1 - y * y);
        const p = tdef(c * Math.sin(u), y, c * Math.cos(u));
        const n = V3(c * Math.sin(u) / 0.38, y / 0.48, c * Math.cos(u) / 0.31).normalize();
        const d = mesh(new THREE.SphereGeometry(1, 16, 10), spotMat, false);
        d.position.copy(p).add(n.clone().multiplyScalar(0.002));
        d.lookAt(d.position.clone().add(n));
        d.scale.set(rr, rr * 0.85, rr * 0.22);
        torsoMesh.add(d);
      });
    }

    const arms = [-1, 1].map(s => {
      const sh = new THREE.Group();
      sh.position.set(0.34 * s, 1.44, 0.02);
      torso.add(sh);
      sh.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), skin));
      sh.add(mesh(tube([V3(0, 0, 0), V3(0.05 * s, -0.18, 0.02), V3(0.07 * s, -0.36, 0.04)], 0.09, 0.07, 10, 12), skin));
      const el = new THREE.Group();
      el.position.set(0.07 * s, -0.36, 0.04);
      sh.add(el);
      el.add(mesh(new THREE.SphereGeometry(0.07, 12, 10), skin));
      el.add(mesh(tube([V3(0, 0, 0), V3(-0.01 * s, -0.16, 0.04), V3(-0.02 * s, -0.3, 0.06)], 0.068, 0.05, 10, 12), skin));
      const hand = new THREE.Group();
      hand.position.set(-0.02 * s, -0.32, 0.06);
      el.add(hand);
      const palm = mesh(new THREE.SphereGeometry(1, 16, 12), skin);
      palm.scale.set(0.075, 0.08, 0.065);
      palm.position.y = -0.04;
      hand.add(palm);
      [-1, 0, 1].forEach(k => {
        const kn = mesh(new THREE.SphereGeometry(0.03, 10, 8), skin, false);
        kn.position.set(k * 0.035, -0.1, 0.04);
        hand.add(kn);
      });
      const thumb = mesh(tube([V3(-0.05 * s, -0.02, 0.02), V3(-0.06 * s, -0.07, 0.06), V3(-0.03 * s, -0.09, 0.075)], 0.022, 0.016, 8, 8), skin, false);
      hand.add(thumb);
      return { sh, el, s };
    });

    const HEAD = V3(0, 1.88, 0.06);
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.58, 0.02);
    torso.add(headPivot);
    headPivot.add(mesh(tube([V3(0, -0.06, 0), V3(0, 0.12, 0.02), V3(0, 0.24, 0.04)], 0.15, 0.14, 8, 14), skin));
    const head = new THREE.Group();
    head.position.set(0, HEAD.y - 1.58, HEAD.z - 0.02);
    headPivot.add(head);
    const HR = 0.42;
    const headGeo = new THREE.SphereGeometry(HR, 48, 36);
    headGeo.scale(1.12, 0.92, 1.0);
    head.add(mesh(headGeo, skin));

    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.17 * s, 0.03, HR * 0.9);
      g.rotation.y = 0.3 * s;
      head.add(g);
      g.add(new THREE.Object3D());
      const ball = mesh(new THREE.SphereGeometry(0.062, 18, 14), darkMat, false);
      ball.scale.set(0.95, 1.0, 0.5);
      g.add(ball);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc8b8e0 }));
      shine.position.set(0.02, -0.015, 0.05);
      g.add(shine);
      const lid = new THREE.Group();
      lid.position.z = 0.0;
      g.add(lid);
      const lidMesh = mesh(new THREE.SphereGeometry(0.07, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), skin, false);
      lidMesh.scale.set(1.35, 1.2, 0.9);
      lid.add(lidMesh);
      lid.rotation.set(-0.05, 0, s * 0.42);
      return { g, lid, s };
    });
    [-1, 1].forEach(s => {
      head.add(mesh(tube([V3(0.05 * s, 0.1, HR * 0.92), V3(0.16 * s, 0.135, HR * 0.89), V3(0.27 * s, 0.18, HR * 0.76)], 0.026, 0.018, 12, 8), std(0x4a2a5a, 0.6), false));
    });
    const frown = mesh(new THREE.TorusGeometry(0.085, 0.016, 8, 20, Math.PI), mouthMat, false);
    frown.scale.set(1.1, 0.4, 1);
    frown.position.set(0.02, -0.17, HR * 0.97);
    frown.rotation.z = 0.06;
    head.add(frown);
    const openMouth = mesh(new THREE.SphereGeometry(0.06, 14, 10), mouthMat, false);
    openMouth.scale.set(1.2, 0.8, 0.4);
    openMouth.position.set(0, -0.16, HR * 0.96);
    openMouth.visible = false;
    head.add(openMouth);
    [-1, 1].forEach(s => {
      const n = mesh(new THREE.SphereGeometry(0.012, 8, 6), mouthMat, false);
      n.position.set(0.05 * s, -0.07, HR * 0.99);
      head.add(n);
    });

    const hood = new THREE.Group();
    head.add(hood);
    const hoodR = HR * 1.1;
    const openA = b => 0.62 + 0.26 * Math.pow(Math.abs(Math.sin(b * 0.5)), 1.2);
    const hoodPoint = (al, be, lift) => {
      const d = V3(Math.sin(al) * Math.sin(be), Math.sin(al) * Math.cos(be), Math.cos(al));
      const back = smooth(0.25, 1, (al - openA(be)) / (Math.PI - openA(be))) * (1 - smooth(1.8, 2.3, al));
      let rr = HR * 1.2 * lift;
      rr *= 1 + 0.035 * Math.sin(be * 7 + al * 2) * back + 0.02 * Math.sin(al * 9) * back;
      rr += HR * 0.08 * Math.exp(-(be * be) / 0.25 - Math.pow(al - 2.35, 2) / 0.12);
      const p = d.multiplyScalar(rr);
      p.x *= 1.1;
      p.z = p.z * 1.02 - 0.03;
      p.y += 0.02;
      if (d.y < 0) {
        p.y += d.y * HR * 0.45;
        p.x *= 1 + -d.y * 0.25;
        p.z -= -d.y * HR * 0.1;
      }
      return p;
    };
    const B0 = Math.PI - 0.6;
    const startA = be => {
      const ab = Math.abs(be);
      if (ab <= B0) return openA(be);
      return lerp(openA(B0), 2.3, smooth(0, 1, (ab - B0) / (Math.PI - B0)));
    };
    const cutE = ha => -0.3 - 0.35 * Math.pow(Math.abs(ha) / 1.75, 2);
    const onHood = (ha, e, lift) => {
      const c = Math.cos(e);
      const d = V3(Math.sin(ha) * c, Math.sin(e), -Math.cos(ha) * c);
      const al = Math.acos(Math.max(-1, Math.min(1, d.z)));
      const be = Math.atan2(d.x, d.y);
      return hoodPoint(Math.max(al, startA(be)), be, lift);
    };
    {
      const pos = [];
      const idx = [];
      const sg = new THREE.SphereGeometry(1, 120, 80);
      const sp = sg.attributes.position;
      const inside = [];
      for (let i = 0; i < sp.count; i++) {
        const d = V3(sp.getX(i), sp.getY(i), sp.getZ(i)).normalize();
        const ha = Math.atan2(d.x, -d.z);
        let cut = false;
        if (Math.abs(ha) < 1.75) {
          const e = cutE(ha);
          if (Math.asin(Math.max(-1, Math.min(1, d.y))) < e) {
            const c = Math.cos(e);
            d.set(Math.sin(ha) * c, Math.sin(e), -Math.cos(ha) * c);
            cut = true;
          }
        }
        const al = Math.acos(Math.max(-1, Math.min(1, d.z)));
        const be = Math.atan2(d.x, d.y);
        const a0 = startA(be);
        inside.push(al < a0 || cut);
        const p = hoodPoint(Math.max(al, a0), be, 1);
        pos.push(p.x, p.y, p.z);
      }
      const src = sg.index.array;
      for (let k = 0; k < src.length; k += 3) {
        const i0 = src[k];
        const i1 = src[k + 1];
        const i2 = src[k + 2];
        if (inside[i0] && inside[i1] && inside[i2]) continue;
        if ((inside[i0] ? 1 : 0) + (inside[i1] ? 1 : 0) + (inside[i2] ? 1 : 0) >= 2) continue;
        idx.push(i0, i1, i2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      hood.add(mesh(g, slimeMat, false));
      const rimPts = [];
      for (let i = 0; i <= 60; i++) {
        const be = -B0 + (i / 60) * B0 * 2;
        rimPts.push(hoodPoint(startA(be) + 0.02, be, 1.0));
      }
      const rim = new THREE.CatmullRomCurve3(rimPts);
      hood.add(mesh(new THREE.TubeGeometry(rim, 120, 0.04, 10, false), slimeMat, false));
      [rimPts[0], rimPts[rimPts.length - 1]].forEach(pp => {
        const c = mesh(new THREE.SphereGeometry(0.04, 10, 8), slimeMat, false);
        c.position.copy(pp);
        hood.add(c);
      });
    }
    {
      const lockGeo = new THREE.SphereGeometry(1, 28, 20);
      const lp = lockGeo.attributes.position;
      for (let i = 0; i < lp.count; i++) {
        const y = lp.getY(i);
        const taper = y < 0 ? 1 - Math.pow(-y, 1.6) * 0.75 : 1;
        lp.setX(i, lp.getX(i) * taper);
        lp.setZ(i, lp.getZ(i) * taper);
      }
      lockGeo.computeVertexNormals();
      const lock = mesh(lockGeo, slimeMat, false);
      lock.scale.set(0.14, 0.24, 0.05);
      lock.position.set(0.12, 0.12, HR * 0.96);
      lock.rotation.set(-0.25, 0.28, 0.42);
      hood.add(lock);
      const lock2 = mesh(lockGeo, slimeMat, false);
      lock2.scale.set(0.1, 0.17, 0.045);
      lock2.position.set(-0.04, 0.2, HR * 0.95);
      lock2.rotation.set(-0.35, 0.05, 0.5);
      hood.add(lock2);
      const drop = mesh(new THREE.SphereGeometry(0.03, 12, 10), slimeMat, false);
      drop.position.set(0.215, -0.08, HR * 0.97);
      drop.scale.y = 1.3;
      hood.add(drop);
    }

    const filUnit = new THREE.CylinderGeometry(0.45, 1, 1, 6, 1);
    filUnit.translate(0, 0.5, 0);
    const tipUnit = new THREE.SphereGeometry(1, 8, 6);
    const buildGill = len => {
      const g = new THREE.Group();
      const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0, len * 0.4, -0.02), V3(0.0, len * 0.75, -0.08), V3(0, len, -0.18)]);
      g.add(mesh(new THREE.TubeGeometry(curve, 16, 0.028, 8, false), plumeStalkMat, false));
      const N = 12;
      const fil = new THREE.InstancedMesh(filUnit, plumeFilMat, N * 4);
      const tips = new THREE.InstancedMesh(tipUnit, plumeTipMat, N * 4);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      let n = 0;
      for (let i = 0; i < N; i++) {
        const f = 0.15 + (i / (N - 1)) * 0.8;
        const p = curve.getPointAt(f);
        const tan = curve.getTangentAt(f);
        [-1, 1].forEach(sd => [-0.3, 0.3].forEach(zo => {
          const l = 0.22 * (1 - f * 0.5);
          const dir = V3(zo * 0.6, 0, sd * 0.42).add(tan.clone().multiplyScalar(1.0)).normalize();
          dummy.position.copy(p);
          dummy.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
          dummy.scale.set(0.008, l, 0.008);
          dummy.updateMatrix();
          fil.setMatrixAt(n, dummy.matrix);
          col.setHSL(0.78, 0.25, 0.55 + f * 0.1);
          fil.setColorAt(n, col);
          dummy.position.copy(p).add(dir.multiplyScalar(l));
          dummy.quaternion.identity();
          dummy.scale.setScalar(0.011);
          dummy.updateMatrix();
          tips.setMatrixAt(n, dummy.matrix);
          n++;
        }));
      }
      fil.instanceMatrix.needsUpdate = true;
      if (fil.instanceColor) fil.instanceColor.needsUpdate = true;
      tips.instanceMatrix.needsUpdate = true;
      g.add(fil, tips);
      return g;
    };
    const gills = [];
    [-1, 1].forEach(s => {
      [[0.02, 0.62, 0.1], [-0.09, 0.56, 0.0], [-0.19, 0.48, -0.1]].forEach(([y, len, z], k) => {
        const pv = new THREE.Group();
        pv.position.set(0.44 * s, y, z);
        const g = buildGill(len);
        pv.add(g);
        head.add(pv);
        gills.push({ pv, s, k, len, base: -s * (2.9 - k * 0.1) });
      });
    });

    const capeGeo = new THREE.BufferGeometry();
    let capeBase = null;
    let capeNU = 0;
    let capeNV = 0;
    {
      const NU = 28;
      const NV = 18;
      const pos = [];
      const idx = [];
      for (let iv = 0; iv <= NV; iv++) {
        const v = iv / NV;
        for (let iu = 0; iu <= NU; iu++) {
          const u = iu / NU;
          const a = (u * 2 - 1) * 1.75;
          const yTop = HEAD.y - 0.06;
          const y = lerp(Math.min(yTop, HEAD.y - 0.38), 0.86, v) - (v > 0.9 ? 0 : 0) - Math.pow(Math.abs(u * 2 - 1), 2) * 0.25 * v;
          const ty = (y - TC.y) / 0.5;
          const tr = Math.sqrt(Math.max(0.05, 1 - ty * ty));
          const rxB = 0.38 * tr * (1 + 0.12 * smooth(0.3, -0.7, ty)) + 0.07;
          const rzB = 0.31 * tr + 0.07;
          const hy = (y - HEAD.y) / (HR * 1.05);
          const hr = Math.sqrt(Math.max(0, 1 - hy * hy));
          const rxH = hoodR * 1.12 * hr + 0.01;
          const rzH = hoodR * hr + 0.01;
          const m = smooth(0.1, 0.45, v);
          const rx = lerp(Math.max(rxH, 0.5), Math.max(rxB, 0.42), m);
          const rz = lerp(Math.max(rzH, 0.44), Math.max(rzB, 0.36), m);
          const cz = lerp(HEAD.z - 0.02, 0, m);
          const wave = v * 0.03 * Math.sin(u * 22);
          pos.push(Math.sin(a) * (rx + wave), y, cz - Math.cos(a) * (rz + wave));
        }
      }
      for (let iv = 0; iv < NV; iv++) {
        for (let iu = 0; iu < NU; iu++) {
          const a = iv * (NU + 1) + iu;
          const b = a + NU + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      capeGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      capeGeo.setIndex(idx);
      capeGeo.computeVertexNormals();
      capeBase = pos.slice();
      capeNU = NU;
      capeNV = NV;
    }
    const edgeLocal = [];
    for (let iu = 0; iu <= capeNU; iu++) {
      const a = ((iu / capeNU) * 2 - 1) * 1.75;
      edgeLocal.push(onHood(a * 0.98, cutE(a * 0.98) + 0.05, 0.985));
    }
    const headToTorso = new THREE.Matrix4();
    const invTorso = new THREE.Matrix4();
    const tmpV = V3(0, 0, 0);
    const updateCape = () => {
      torso.updateMatrixWorld(true);
      invTorso.copy(torso.matrixWorld).invert();
      headToTorso.multiplyMatrices(invTorso, head.matrixWorld);
      const arr = capeGeo.attributes.position.array;
      for (let iv = 0; iv <= capeNV; iv++) {
        const v = iv / capeNV;
        const w = smooth(0, 0.7, v);
        for (let iu = 0; iu <= capeNU; iu++) {
          const o = (iv * (capeNU + 1) + iu) * 3;
          tmpV.copy(edgeLocal[iu]).applyMatrix4(headToTorso);
          const bx = capeBase[o];
          const by = capeBase[o + 1];
          const bz = capeBase[o + 2];
          arr[o] = lerp(tmpV.x, bx, w);
          arr[o + 1] = lerp(tmpV.y, by, w);
          arr[o + 2] = lerp(tmpV.z, bz, w);
        }
      }
      capeGeo.attributes.position.needsUpdate = true;
      capeGeo.computeVertexNormals();
    };
    torso.add(mesh(capeGeo, slimeMat, false));
    const capeDrips = [];
    for (let k = 0; k < 9; k++) {
      const u = 0.1 + (k / 8) * 0.8;
      const a = (u * 2 - 1) * 1.75;
      const y0 = 0.86 - Math.pow(Math.abs(u * 2 - 1), 2) * 0.25;
      const ty = (y0 - TC.y) / 0.5;
      const tr = Math.sqrt(Math.max(0.05, 1 - ty * ty));
      const rx = 0.38 * tr * 1.1 + 0.07;
      const rz = 0.31 * tr + 0.07;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * rx, y0, -Math.cos(a) * rz);
      const len = 0.08 + ((k * 5) % 4) * 0.04;
      const stem = mesh(new THREE.CylinderGeometry(0.012, 0.024, 1, 8), slimeMat, false);
      stem.position.y = -0.5;
      const bulb = mesh(new THREE.SphereGeometry(0.03, 10, 8), slimeMat, false);
      g.add(stem, bulb);
      torso.add(g);
      capeDrips.push({ stem, bulb, len, ph: k * 1.3 });
    }
    const hoodGlow = [];
    [[0.3, 1.62, -0.38], [-0.22, 1.35, -0.42], [0.12, 1.12, -0.44], [-0.3, 1.02, -0.38], [0.0, 1.8, -0.43]].forEach(([x, y, z]) => {
      const d = mesh(new THREE.SphereGeometry(0.03, 10, 8), glowMat, false);
      d.position.set(x, y, z);
      d.scale.set(1, 1, 0.5);
      torso.add(d);
      hoodGlow.push(d);
    });

    const TAIL = [V3(0, 0.82, -0.24), V3(0, 0.6, -0.45), V3(0.05, 0.3, -0.65), V3(0.15, 0.1, -0.85), V3(0.3, 0.05, -1.02), V3(0.42, 0.05, -1.12)];
    const NT = 24;
    const RAD = 10;
    const tailPos = new Float32Array((NT + 1) * (RAD + 1) * 3);
    const tailIdx = [];
    for (let i = 0; i < NT; i++) {
      for (let j = 0; j < RAD; j++) {
        const a = i * (RAD + 1) + j;
        const b = a + RAD + 1;
        tailIdx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const tailGeo = new THREE.BufferGeometry();
    tailGeo.setAttribute("position", new THREE.BufferAttribute(tailPos, 3));
    tailGeo.setIndex(tailIdx);
    const tailMesh = mesh(tailGeo, skin);
    tailMesh.frustumCulled = false;
    body.add(tailMesh);
    const finPos = new Float32Array((NT + 1) * 2 * 3);
    const finIdx = [];
    for (let i = 0; i < NT; i++) {
      const a = i * 2;
      finIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const finGeo = new THREE.BufferGeometry();
    finGeo.setAttribute("position", new THREE.BufferAttribute(finPos, 3));
    finGeo.setIndex(finIdx);
    const finMesh = mesh(finGeo, std(0xb8a0d0, 0.5, { side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), false);
    finMesh.frustumCulled = false;
    body.add(finMesh);
    const updateTail = (t, sway) => {
      const ctrl = TAIL.map((p, i) => {
        const f = i / (TAIL.length - 1);
        return V3(p.x + Math.sin(t * 1.1 - f * 2) * sway * f, p.y, p.z);
      });
      const curve = new THREE.CatmullRomCurve3(ctrl);
      const frames = curve.computeFrenetFrames(NT, false);
      for (let i = 0; i <= NT; i++) {
        const f = i / NT;
        const p = curve.getPointAt(f);
        const r = lerp(0.13, 0.02, Math.pow(f, 0.9));
        for (let j = 0; j <= RAD; j++) {
          const a = (j / RAD) * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a) * r).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a) * r * 0.75));
          const o = (i * (RAD + 1) + j) * 3;
          tailPos[o] = p.x + n.x;
          tailPos[o + 1] = Math.max(0.015, p.y + n.y);
          tailPos[o + 2] = p.z + n.z;
        }
        const h = f < 0.3 ? 0 : r * 1.6 * Math.sin(((f - 0.3) / 0.7) * Math.PI * 0.9);
        const o = i * 6;
        finPos[o] = p.x;
        finPos[o + 1] = p.y + r * 0.6;
        finPos[o + 2] = p.z;
        finPos[o + 3] = p.x;
        finPos[o + 4] = p.y + r * 0.6 + h;
        finPos[o + 5] = p.z;
      }
      tailGeo.attributes.position.needsUpdate = true;
      tailGeo.computeVertexNormals();
      finGeo.attributes.position.needsUpdate = true;
      finGeo.computeVertexNormals();
    };

    const mist = [];
    for (let i = 0; i < 14; i++) {
      const m = std(i % 3 ? 0x2a1040 : 0x6a2aa0, 0.8, { transparent: true, opacity: 0, depthWrite: false, emissive: 0x200830, emissiveIntensity: 0.5 });
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m);
      root.add(p);
      mist.push({ p, m, a: i * 2.4, r: 0.35 + (i % 4) * 0.12, sp: 0.18 + (i % 5) * 0.04, o: i / 14 });
    }
    const burst = [];
    for (let i = 0; i < 16; i++) {
      const m = std(i % 2 ? 0x1a0828 : 0x8a40d0, 0.7, { transparent: true, opacity: 0, depthWrite: false, emissive: i % 2 ? 0x100418 : 0x6a20b0, emissiveIntensity: 0.8 });
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), m);
      p.visible = false;
      root.add(p);
      burst.push({ p, m, a: (i / 16) * Math.PI * 2, d: (i % 4) * 0.04 });
    }
    const pebble = mesh(new THREE.DodecahedronGeometry(0.06, 0), std(0x6a6070, 0.9), false);
    pebble.visible = false;
    root.add(pebble);

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;

        const breath = Math.sin(t * 1.2) * motion;
        let slump = 0.12 + breath * 0.01;
        let headDown = 0.22;
        let lidDown = -0.05;
        let shoulder = 0;
        let mouthOpen = false;
        let hoodGlowK = 0.3;
        let burstK = -1;
        let kickK = -1;
        let armFwd = 0;
        let shake = 0;

        if (a === "fume") {
          const k = smooth(0.05, 0.25, p) * (1 - smooth(0.8, 1, p));
          shoulder = k * 0.07;
          slump += k * 0.08;
          headDown += k * 0.12;
          lidDown += k * 0.15;
          shake = k * Math.sin(t * 45) * 0.06;
          hoodGlowK = 0.3 + k * 0.9;
          mouthOpen = p > 0.55 && p < 0.75;
          burstK = p > 0.55 ? (p - 0.55) * 2 : -1;
        }
        if (a === "shadow") {
          const k = smooth(0.05, 0.3, p) * (1 - smooth(0.8, 1, p));
          headDown -= k * 0.25;
          slump -= k * 0.1;
          lidDown -= k * 0.3;
          hoodGlowK = 0.3 + k * 1.6;
          armFwd = k * 0.3;
          burstK = p;
        }
        if (a === "kick") {
          kickK = p;
          headDown += 0.08;
        }
        if (a === "eat") {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, HEAD.y - 0.1, ph.fall * ph.fall), lerp(0.9, HEAD.z + HR + 0.05, ph.fall));
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.9);
          headDown = lerp(headDown, -0.05, Math.sin(Math.min(1, ph.fall) * Math.PI * 0.5) * (1 - ph.bite));
          mouthOpen = p > 0.12 && p < 0.85 && (p < 0.3 || ph.chew > 0.35);
          armFwd = 0.2 * Math.sin(Math.min(1, p * 2) * Math.PI);
        } else food.visible = false;

        root.rotation.y = lookYaw * 0.6;
        root.rotation.x = lookPitch * 0.5;
        torsoPivot.rotation.x = slump;
        torsoPivot.rotation.z = Math.sin(t * 0.6) * 0.02 * motion;
        headPivot.rotation.x = lerp(headPivot.rotation.x, headDown - pointer.y * 0.1, 0.1);
        headPivot.rotation.y = lerp(headPivot.rotation.y, pointer.x * 0.25, 0.08);
        headPivot.rotation.z = 0.08 + Math.sin(t * 0.8) * 0.02 * motion;

        arms.forEach(({ sh, el, s: sd }) => {
          sh.position.y = 1.44 + shoulder;
          sh.rotation.x = lerp(sh.rotation.x, -armFwd + Math.sin(t * 1.2 + sd) * 0.02 * motion, 0.15);
          sh.rotation.z = sd * (0.14 + breath * 0.01) + shake;
          el.rotation.x = -0.35 - armFwd * 1.5 - Math.abs(shake) * 2;
        });

        legs.forEach(({ hip, knee, s: sd }) => {
          let hx = 0;
          let kx = 0;
          if (kickK >= 0 && sd > 0) {
            const back = smooth(0.0, 0.3, kickK) * (1 - smooth(0.3, 0.45, kickK));
            const fwd = smooth(0.3, 0.45, kickK) * (1 - smooth(0.6, 0.9, kickK));
            hx = back * 0.4 - fwd * 0.7;
            kx = back * 0.6 + fwd * 0.1;
          }
          hip.rotation.x = hx;
          knee.rotation.x = kx;
        });
        if (kickK >= 0 && !reduceMotion) {
          const q = (kickK - 0.4) / 0.6;
          pebble.visible = kickK > 0.1 && q < 1;
          if (q <= 0) pebble.position.set(0.24, 0.06, 0.35);
          else pebble.position.set(0.24 + q * 0.4, 0.06 + Math.sin(q * Math.PI) * 0.35, 0.35 + q * 1.6);
          pebble.rotation.set(q * 9, q * 7, 0);
        } else pebble.visible = false;

        eyes.forEach(({ g, lid }) => {
          lid.rotation.x = lerp(lid.rotation.x, Math.min(1.45, lidDown + (1 - blink) * 1.2), 0.3);
          g.children[1].position.x = lerp(g.children[1].position.x, pointer.x * 0.012, 0.1);
        });
        frown.visible = !mouthOpen;
        openMouth.visible = mouthOpen;
        openMouth.scale.y = ph ? 0.5 + ph.chew * 0.5 : 0.6;

        gills.forEach(({ pv, s: sd, k, base }) => {
          pv.rotation.z = base + Math.sin(t * 1.3 + k) * 0.04 * motion;
          pv.rotation.x = -0.6 + Math.sin(t * 0.9 + k * 2) * 0.03 * motion;
        });

        slimeMat.emissiveIntensity = 0.45 + (hoodGlowK - 0.3) * 0.4 + Math.sin(t * 1.5) * 0.08 * motion;
        glowMat.emissiveIntensity = 0.6 + hoodGlowK;
        hoodGlow.forEach((d, i) => {
          d.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.15 * motion + (hoodGlowK - 0.3) * 0.3);
        });
        capeDrips.forEach(({ stem, bulb, len, ph: dp }) => {
          const l = len * (1 + 0.25 * Math.sin(t * 1.1 + dp) * motion);
          stem.scale.y = l;
          stem.position.y = -l / 2;
          bulb.position.y = -l;
        });

        updateTail(t, 0.08 * motion);

        updateCape();
        root.updateMatrixWorld(true);
        mist.forEach(({ p: mp, m, a: ma, r, sp, o }, i) => {
          const f = (t * sp + o) % 1;
          mp.visible = !reduceMotion;
          if (i % 2) {
            const gl = gills[i % gills.length];
            gl.pv.localToWorld(tmpV.set(0, gl.len * 0.95, -0.16));
          } else {
            const dr = capeDrips[i % capeDrips.length];
            dr.bulb.getWorldPosition(tmpV);
          }
          root.worldToLocal(tmpV);
          mp.position.set(tmpV.x + Math.cos(ma) * f * 0.12, tmpV.y + f * 0.55, tmpV.z + Math.sin(ma) * f * 0.12);
          mp.scale.setScalar(0.025 + f * 0.06);
          m.opacity = Math.sin(f * Math.PI) * 0.35 * (1 + (hoodGlowK - 0.3) * 0.5);
        });
        burst.forEach(({ p: bp, m, a: ba, d }) => {
          const q = burstK >= 0 ? (burstK - 0.25 - d) / 0.6 : -1;
          bp.visible = q > 0 && q < 1 && !reduceMotion;
          if (bp.visible) {
            const r = 0.45 + q * 1.2;
            bp.position.set(Math.cos(ba) * r, 1.5 + q * 0.5 + Math.sin(ba * 3) * 0.15, Math.sin(ba) * r * 0.8 - 0.25);
            bp.scale.setScalar(0.08 + q * 0.18);
            m.opacity = (1 - q) * 0.6;
          }
        });
      }
    };
  }
});
