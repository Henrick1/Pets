Pets.register({
  id: "leviatrom",
  name: "Leviatrom",
  color: "#1f4fb0",
  types: ["water", "electric"],
  description: "Serpente colossal dos mares profundos, coroada de chifres e com um capuz que brilha como uma tempestade. Quando se ergue, o céu escurece e raios caem onde ela olhar.",
  actions: {
    jump: { duration: 1.3 },
    eat: { duration: 2.4 },
    jet: { duration: 2.6 },
    zap: { duration: 2.6 }
  },
  idle: [
    { action: "zap", min: 25, max: 50 },
    { action: "jet", min: 45, max: 90 }
  ],
  clickAction: n => ["zap", "jet", "zap", "jump"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, fish } = kit;

    const root = new THREE.Group();
    const big = new THREE.Group();
    big.scale.setScalar(1.06);
    root.add(big);
    const swim = new THREE.Group();
    big.add(swim);

    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const UP = V3(0, 1, 0);
    const DOWN = V3(0, -1, 0);
    const FWD = V3(0, 0, 1);

    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const C_TOP = hexParts(0x0c2357);
    const C_SIDE = hexParts(0x1d4fae);
    const C_BELLY = hexParts(0x9fd6ff);
    const C_STRIPE = hexParts(0x061638);

    const paint = (geo, bottom, top, y0, y1) => {
      const pos = geo.attributes.position;
      const out = new Float32Array(pos.count * 3);
      const cb = hexParts(bottom);
      const ct = hexParts(top);
      for (let i = 0; i < pos.count; i++) {
        const k = smooth(y0, y1, pos.getY(i));
        out[i * 3] = lerp(cb[0], ct[0], k);
        out[i * 3 + 1] = lerp(cb[1], ct[1], k);
        out[i * 3 + 2] = lerp(cb[2], ct[2], k);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(out, 3));
      return geo;
    };

    const skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.08 });
    const navyMat = mat(0x0f2a5c, 0.4);
    const elecMat = new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffb81a, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.25 });
    const finMat = new THREE.MeshStandardMaterial({ color: 0x5ab8ff, emissive: 0x1a6ad0, emissiveIntensity: 0.35, roughness: 0.25, transparent: true, opacity: 0.82, side: THREE.DoubleSide });

    const N = 96;
    const M = 20;
    const radiusAt = u => 0.045 + 0.28 * smooth(0, 0.45, u) - 0.07 * smooth(0.74, 1, u);

    const bodyGeo = new THREE.BufferGeometry();
    const bodyPos = new Float32Array((N + 1) * M * 3);
    const bodyCol = new Float32Array((N + 1) * M * 3);
    bodyGeo.setAttribute("position", new THREE.BufferAttribute(bodyPos, 3));
    bodyGeo.setAttribute("color", new THREE.BufferAttribute(bodyCol, 3));
    const idx = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < M; j++) {
        const a = i * M + j;
        const b = i * M + ((j + 1) % M);
        const c = (i + 1) * M + j;
        const d = (i + 1) * M + ((j + 1) % M);
        idx.push(a, b, c, b, d, c);
      }
    }
    bodyGeo.setIndex(idx);
    const body = mesh(bodyGeo, skinMat);
    body.frustumCulled = false;
    swim.add(body);

    const REST = [
      [1.1, 0, -1.25],
      [0.45, 0, -1.6],
      [-0.4, 0, -1.45],
      [-1.0, 0, -0.85],
      [-1.02, 0, 0.0],
      [-0.42, 0, 0.5],
      [0.45, 0, 0.42],
      [0.72, 0.32, -0.18],
      [0.42, 0.95, -0.48],
      [0.08, 1.58, -0.42],
      [0, 2.02, -0.12],
      [0, 2.3, 0.22]
    ];
    REST.forEach((p, i) => {
      if (i < 7) p[1] = radiusAt(i / (REST.length - 1)) * 0.8;
    });
    const ctrl = REST.map(() => V3(0, 0, 0));
    const REST_LEN = new THREE.CatmullRomCurve3(REST.map(p => V3(p[0], p[1], p[2])), false, "centripetal").getLength();
    const HELIX_DROP = 1.8;
    const RING_R = Math.sqrt(REST_LEN * REST_LEN - HELIX_DROP * HELIX_DROP) / (Math.PI * 2 * 1.15 * 0.91);
    const curve = new THREE.CatmullRomCurve3(ctrl, false, "centripetal");

    const pts = [];
    const tans = [];
    const nors = [];
    const bins = [];
    const bellies = [];
    for (let i = 0; i <= N; i++) {
      pts.push(V3(0, 0, 0));
      tans.push(V3(0, 0, 1));
      nors.push(V3(1, 0, 0));
      bins.push(V3(0, 1, 0));
      bellies.push(V3(0, -1, 0));
    }
    const tmp = V3(0, 0, 0);
    const tmp2 = V3(0, 0, 0);
    const dir = V3(0, 0, 0);

    function buildBody() {
      curve.updateArcLengths();
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        curve.getPointAt(u, pts[i]);
        curve.getTangentAt(u, tans[i]).normalize();
      }
      const t0 = tans[0];
      tmp.copy(Math.abs(t0.y) > 0.9 ? FWD : UP);
      nors[0].crossVectors(tmp, t0).normalize();
      bins[0].crossVectors(t0, nors[0]);
      for (let i = 1; i <= N; i++) {
        const T = tans[i];
        const n = nors[i].copy(nors[i - 1]);
        n.addScaledVector(T, -n.dot(T)).normalize();
        bins[i].crossVectors(T, n);
      }
      for (let i = 0; i <= N; i++) {
        const T = tans[i];
        const v = Math.min(1, Math.abs(T.y) * 1.3);
        const bd = bellies[i].copy(DOWN).multiplyScalar(1 - v).addScaledVector(FWD, v);
        bd.addScaledVector(T, -bd.dot(T));
        if (bd.lengthSq() < 1e-6) bd.copy(nors[i]);
        bd.normalize();
        const u = i / N;
        const r = radiusAt(u);
        const p = pts[i];
        const n = nors[i];
        const b = bins[i];
        const stripeOn = u > 0.08 && u < 0.97 && Math.sin(u * 46) > 0.35;
        for (let j = 0; j < M; j++) {
          const a = (j / M) * Math.PI * 2;
          dir.copy(n).multiplyScalar(Math.cos(a)).addScaledVector(b, Math.sin(a));
          const dot = dir.dot(bd);
          const rr = r * (1 - 0.2 * Math.max(0, dot));
          const k = (i * M + j) * 3;
          bodyPos[k] = p.x + dir.x * rr;
          bodyPos[k + 1] = p.y + dir.y * rr;
          bodyPos[k + 2] = p.z + dir.z * rr;
          const belly = smooth(0.45, 0.85, dot);
          const top = smooth(-0.2, -0.85, dot);
          let c0 = lerp(C_SIDE[0], C_TOP[0], top);
          let c1 = lerp(C_SIDE[1], C_TOP[1], top);
          let c2 = lerp(C_SIDE[2], C_TOP[2], top);
          if (stripeOn && dot < -0.55) {
            c0 = C_STRIPE[0];
            c1 = C_STRIPE[1];
            c2 = C_STRIPE[2];
          }
          bodyCol[k] = lerp(c0, C_BELLY[0], belly);
          bodyCol[k + 1] = lerp(c1, C_BELLY[1], belly);
          bodyCol[k + 2] = lerp(c2, C_BELLY[2], belly);
        }
      }
      bodyGeo.attributes.position.needsUpdate = true;
      bodyGeo.attributes.color.needsUpdate = true;
      bodyGeo.computeVertexNormals();
      bodyGeo.computeBoundingSphere();
    }

    const basis = new THREE.Matrix4();
    const side = V3(0, 0, 0);
    const topV = V3(0, 0, 0);
    const orientAt = (obj, i, lift) => {
      const T = tans[i];
      topV.copy(bellies[i]).negate();
      side.crossVectors(topV, T).normalize();
      basis.makeBasis(side, topV, T);
      obj.quaternion.setFromRotationMatrix(basis);
      obj.position.copy(pts[i]).addScaledVector(topV, lift || 0);
    };

    const bandGeo = new THREE.TorusGeometry(1, 0.15, 10, 40);
    const bands = [0.16, 0.25, 0.34, 0.43, 0.52, 0.61, 0.7].map(u => {
      const m = mesh(bandGeo, elecMat, false);
      swim.add(m);
      return { m, i: Math.round(u * N), u };
    });

    const boltShape = new THREE.Shape();
    boltShape.moveTo(0, 0);
    boltShape.lineTo(0.3, 0);
    boltShape.lineTo(0.17, 0.13);
    boltShape.lineTo(0.34, 0.13);
    boltShape.lineTo(0.04, 0.44);
    boltShape.lineTo(0.11, 0.22);
    boltShape.lineTo(-0.03, 0.22);
    boltShape.lineTo(0, 0);
    const boltGeo = new THREE.ExtrudeGeometry(boltShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    boltGeo.translate(-0.15, -0.02, -0.0175);
    boltGeo.rotateY(Math.PI / 2);
    const bolts = [0.3, 0.42, 0.54, 0.65, 0.73, 0.8, 0.86].map((u, k) => {
      const m = mesh(boltGeo, elecMat, false);
      const sc = 0.75 + u * 0.75;
      m.scale.setScalar(sc);
      swim.add(m);
      return { m, i: Math.round(u * N), u, sc };
    });

    const tailShape = new THREE.Shape();
    tailShape.moveTo(-0.02, 0.04);
    tailShape.lineTo(0.18, 0.26);
    tailShape.lineTo(0.16, 0.12);
    tailShape.lineTo(0.36, 0.34);
    tailShape.lineTo(0.3, 0.12);
    tailShape.lineTo(0.56, 0.1);
    tailShape.lineTo(0.38, 0.0);
    tailShape.lineTo(0.56, -0.1);
    tailShape.lineTo(0.3, -0.12);
    tailShape.lineTo(0.36, -0.34);
    tailShape.lineTo(0.16, -0.12);
    tailShape.lineTo(0.18, -0.26);
    tailShape.lineTo(-0.02, -0.04);
    tailShape.lineTo(-0.02, 0.04);
    const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    tailGeo.translate(0, 0, -0.015);
    tailGeo.rotateY(Math.PI / 2);
    const tailFin = mesh(tailGeo, elecMat, false);
    swim.add(tailFin);
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xfffbd0 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), orbMat);
    swim.add(orb);
    const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe45a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), haloMat);
    swim.add(halo);
    const plasma = [];
    for (let k = 0; k < 14; k++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 14, 10),
        new THREE.MeshBasicMaterial({ color: k % 3 === 1 ? 0x8ff4ff : 0xffe96a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })
      );
      m.visible = false;
      swim.add(m);
      plasma.push({ m, k, ph: k * 0.37 });
    }

    const head = new THREE.Group();
    head.scale.setScalar(1.3);
    swim.add(head);
    const MOUTH_Y = -0.15;
    const HZ0 = -0.3;
    const HZ1 = 1.08;
    const HINGE_Z = 0.08;
    const hz = t => lerp(HZ0, HZ1, t);
    const bump = t => Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t)))), 0.34);
    const hw = t => 0.38 * bump(t) * (1 - 0.42 * t * t) * (1 + 0.1 * Math.exp(-Math.pow((t - 0.45) / 0.09, 2)));
    const ht = t => 0.44 * bump(t) * (1 - 0.6 * smooth(0.3, 1, t)) + 0.08 * Math.exp(-Math.pow((t - 0.42) / 0.07, 2)) + 0.03 * Math.exp(-Math.pow((t - 0.86) / 0.05, 2));
    const hd = t => 0.19 * bump(t) * (1 - 0.35 * smooth(0.45, 1, t)) + 0.022 * Math.exp(-Math.pow((t - 0.8) / 0.09, 2)) * bump(t);
    const LIP_A = 0.45;
    const LIP_D = 0.034;
    const LIP_IN = 0.13;
    const JAW_W = 0.95;
    const spow = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    const upperAt = (t, th, out) => out.set(hw(t) * spow(Math.cos(th), 0.72), MOUTH_Y + ht(t) * Math.pow(Math.max(0, Math.sin(th)), 0.9), hz(t));
    const lowerAt = (t, th, out) => out.set(hw(t) * JAW_W * spow(Math.cos(th), 0.85), MOUTH_Y - hd(t) * Math.pow(Math.abs(Math.sin(th)), 0.9), hz(t));
    const rollK = t => smooth(0, 0.08, t) * smooth(1, 0.94, t);
    const upperFull = (t, th, out) => {
      if (th >= 0 && th <= Math.PI) return upperAt(t, th, out);
      const side = th < 0 ? 1 : -1;
      const q = (th < 0 ? -th : th - Math.PI) / LIP_A;
      const k = rollK(t);
      const a = q * Math.PI / 2;
      return out.set(side * hw(t) * (1 - LIP_IN * (1 - Math.cos(a)) * k), MOUTH_Y - LIP_D * Math.sin(a) * k, hz(t));
    };
    const lowerFull = (t, th, out) => {
      if (th >= Math.PI && th <= Math.PI * 2) return lowerAt(t, th, out);
      const side = th < Math.PI ? -1 : 1;
      const q = (th < Math.PI ? Math.PI - th : th - Math.PI * 2) / LIP_A;
      const k = rollK(t);
      const a = q * Math.PI / 2;
      return out.set(side * hw(t) * JAW_W * (1 - LIP_IN * (1 - Math.cos(a)) * k), MOUTH_Y - LIP_D * 0.4 * (1 - Math.cos(a)) * k, hz(t));
    };

    const surface = (fn, nu, nv, colorFn, flip) => {
      const g = new THREE.BufferGeometry();
      const pos = new Float32Array((nu + 1) * (nv + 1) * 3);
      const col = new Float32Array((nu + 1) * (nv + 1) * 3);
      const pt = V3(0, 0, 0);
      for (let i = 0; i <= nu; i++) {
        for (let j = 0; j <= nv; j++) {
          const k = (i * (nv + 1) + j) * 3;
          fn(i / nu, j / nv, pt);
          pos[k] = pt.x;
          pos[k + 1] = pt.y;
          pos[k + 2] = pt.z;
          const c = colorFn(i / nu, j / nv, pt);
          col[k] = c[0];
          col[k + 1] = c[1];
          col[k + 2] = c[2];
        }
      }
      const index = [];
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const a = i * (nv + 1) + j;
          const b = a + 1;
          const c = a + nv + 1;
          const d = c + 1;
          if (flip) index.push(a, c, b, b, c, d);
          else index.push(a, b, c, b, d, c);
        }
      }
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.setIndex(index);
      g.computeVertexNormals();
      return g;
    };
    const mixC = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
    const H_TOP = hexParts(0x1d5cb4);
    const H_SIDE = hexParts(0x3596e6);
    const H_LIP = hexParts(0x9fe0ff);
    const H_JAW = hexParts(0xe2faff);
    const H_JAW2 = hexParts(0xaee8ff);

    const skinHead = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, side: THREE.DoubleSide });
    const toothMat = mat(0xffffff, 0.25);

    const upperGeo = surface((u, v, out) => upperFull(u, -LIP_A + v * (Math.PI + 2 * LIP_A), out), 64, 48, (u, v, p) => {
      const h = (p.y - MOUTH_Y) / Math.max(0.001, ht(u));
      const c = mixC(H_LIP, H_SIDE, smooth(0.05, 0.4, h));
      return mixC(c, H_TOP, smooth(0.55, 0.95, h) * (1 - 0.6 * smooth(0.8, 1, u)));
    }, false);
    const upper = mesh(upperGeo, skinHead);
    head.add(upper);

    const G_EDGE = hexParts(0xe0587e);
    const G_DEEP = hexParts(0x4a1028);
    const innerMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
    const CAV_T = 0.38;
    const cavT = u => lerp(CAV_T, 1, u);
    const roofAt = (t, th, sc, out) => {
      const k = rollK(t);
      return out.set(hw(t) * (1 - LIP_IN * k) * spow(Math.cos(th), 0.9) * sc, MOUTH_Y - LIP_D * k + ht(t) * 0.55 * Math.pow(Math.sin(th), 0.8) * sc, hz(t));
    };
    const floorAt = (t, th, sc, out) => {
      const k = rollK(t);
      return out.set(hw(t) * JAW_W * (1 - LIP_IN * k) * spow(Math.cos(th), 0.9) * sc, MOUTH_Y - LIP_D * 0.4 * k - hd(t) * 0.6 * Math.pow(Math.abs(Math.sin(th)), 0.8) * sc, hz(t));
    };
    const cavColor = (u, v) => mixC(G_EDGE, G_DEEP, smooth(0.15, 0.9, Math.abs(Math.sin(v * Math.PI))) * 0.7 + (1 - smooth(0, 0.4, u)) * 0.3);
    const roofGeo = surface((u, v, out) => roofAt(cavT(u), v * Math.PI, 1, out), 40, 24, cavColor, true);
    const roof = mesh(roofGeo, innerMat, false);
    head.add(roof);
    const throatUp = mesh(surface((u, v, out) => roofAt(CAV_T, v * Math.PI, u, out), 6, 24, () => G_DEEP, false), innerMat, false);
    head.add(throatUp);

    const lipPts = [];
    const LIP_T = 0.34;
    for (let k = 0; k <= 40; k++) {
      const f = k / 40;
      const side = f < 0.5 ? 1 : -1;
      const t = f < 0.5 ? lerp(LIP_T, 1, f * 2) : lerp(1, LIP_T, (f - 0.5) * 2);
      const lift = -0.035 * Math.pow(1 - smooth(LIP_T, 0.8, t), 1.4);
      lipPts.push(V3(side * hw(t) * 0.99, MOUTH_Y - 0.018 + lift, hz(t) + (t > 0.98 ? 0.012 : 0)));
    }
    const lip = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts), 80, 0.011, 6, false), navyMat, false);
    head.add(lip);

    const tmpS = V3(0, 0, 0);
    [-1, 1].forEach(s => {
      const nostril = mesh(new THREE.SphereGeometry(0.02, 10, 8), navyMat, false);
      upperAt(0.9, s > 0 ? Math.PI * 0.32 : Math.PI * 0.68, tmpS);
      nostril.position.copy(tmpS);
      nostril.scale.set(1, 0.6, 1);
      head.add(nostril);
      [[0.86, 0.034, 0.14], [0.7, 0.026, 0.09]].forEach(([ft, fr, fh]) => {
        const fang = mesh(new THREE.ConeGeometry(fr, fh, 10), toothMat, false);
        fang.rotation.x = Math.PI;
        fang.position.set(hw(ft) * (1 - LIP_IN) * 0.9 * s, MOUTH_Y - LIP_D - fh * 0.35, hz(ft));
        head.add(fang);
      });
    });

    const jaw = new THREE.Group();
    jaw.position.set(0, MOUTH_Y, HINGE_Z);
    head.add(jaw);
    const jawGeo = surface((u, v, out) => lowerFull(u, Math.PI - LIP_A + v * (Math.PI + 2 * LIP_A), out), 64, 40, (u, v, p) => {
      const h = (MOUTH_Y - p.y) / Math.max(0.001, hd(u));
      return mixC(H_LIP, mixC(H_JAW2, H_JAW, smooth(0.5, 1, h)), smooth(0.02, 0.25, h));
    }, false);
    jawGeo.translate(0, -MOUTH_Y, -HINGE_Z);
    const jawMesh = mesh(jawGeo, skinHead, false);
    jaw.add(jawMesh);
    const floorGeo = surface((u, v, out) => floorAt(cavT(u), Math.PI + v * Math.PI, 1, out), 40, 24, cavColor, false);
    floorGeo.translate(0, -MOUTH_Y, -HINGE_Z);
    const floor = mesh(floorGeo, innerMat, false);
    jaw.add(floor);
    const throatDownGeo = surface((u, v, out) => floorAt(CAV_T, Math.PI + v * Math.PI, u, out), 6, 24, () => G_DEEP, false);
    throatDownGeo.translate(0, -MOUTH_Y, -HINGE_Z);
    jaw.add(mesh(throatDownGeo, innerMat, false));
    const lowerTeeth = [];
    for (let k = 0; k < 9; k++) {
      const f = k / 8;
      const side = f < 0.5 ? 1 : -1;
      const t = f < 0.5 ? lerp(0.55, 0.97, f * 2) : lerp(0.97, 0.55, (f - 0.5) * 2);
      if (k === 4) continue;
      const tooth = mesh(new THREE.ConeGeometry(0.013, 0.035, 8), toothMat, false);
      tooth.position.set(side * hw(t) * JAW_W * (1 - LIP_IN) * 0.98, -LIP_D * 0.4 + 0.012, hz(t) - HINGE_Z - 0.01);
      jaw.add(tooth);
      lowerTeeth.push(tooth);
    }
    const tongue = new THREE.Group();
    tongue.position.set(0, -0.06, 0.1);
    jaw.add(tongue);
    const tongueMat = mat(0xff5f86, 0.45);
    const stem = mesh(new THREE.CylinderGeometry(0.016, 0.024, 0.34, 10), tongueMat, false);
    stem.rotation.x = Math.PI / 2;
    stem.position.z = 0.17;
    tongue.add(stem);
    [-1, 1].forEach(s => {
      const prong = mesh(new THREE.ConeGeometry(0.014, 0.1, 8), tongueMat, false);
      prong.rotation.set(Math.PI / 2, 0, -s * 0.45);
      prong.position.set(0.02 * s, 0, 0.37);
      tongue.add(prong);
    });

    const browShape = new THREE.Shape();
    browShape.moveTo(0, 0);
    browShape.lineTo(0.34, 0.02);
    browShape.quadraticCurveTo(0.36, 0.09, 0.3, 0.12);
    browShape.lineTo(0.02, 0.06);
    browShape.lineTo(0, 0);
    const browGeo = new THREE.ExtrudeGeometry(browShape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 });
    browGeo.translate(-0.17, -0.03, -0.035);
    const browMat = mat(0x0c2357, 0.35);
    const eyeGlow = new THREE.MeshBasicMaterial({ color: 0xfff27a });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.72, whiteColor: 0xfff27a, pupilColor: 0x06101e });
      e.g.children[0].material = eyeGlow;
      e.pupil.scale.set(0.32, 1.25, 0.5);
      upperAt(0.5, s > 0 ? 0.62 : Math.PI - 0.62, tmpS);
      e.g.position.set(tmpS.x * 0.92, tmpS.y, tmpS.z);
      e.g.rotation.set(-0.1, 0.55 * s, -0.18 * s);
      head.add(e.g);
      const brow = mesh(browGeo, browMat, false);
      brow.scale.set(0.8, 0.7, 0.8);
      brow.position.set(tmpS.x * 0.9, tmpS.y + 0.15, tmpS.z - 0.01);
      brow.rotation.set(0.05, 0.55 * s, -0.32 * s);
      head.add(brow);
      return e;
    });

    const hornMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.35 });
    const H_BASE = hexParts(0x1d4fae);
    const H_GOLD = hexParts(0xffd84a);
    const H_TIP = hexParts(0xfff6c0);
    const hornAxis = V3(0, 0, 0);
    const hornN = V3(0, 0, 0);
    const hornB = V3(0, 0, 0);
    const makeHorn = (pts3, r0) => {
      const c = new THREE.CatmullRomCurve3(pts3);
      const geo = surface((u, v, out) => {
        c.getPointAt(Math.min(0.999, u), out);
        c.getTangentAt(Math.min(0.999, u), hornAxis);
        hornN.crossVectors(hornAxis, Math.abs(hornAxis.y) > 0.9 ? FWD : UP).normalize();
        hornB.crossVectors(hornAxis, hornN);
        const rr = r0 * Math.pow(1 - u, 0.85) + 0.002;
        const a = v * Math.PI * 2;
        out.addScaledVector(hornN, Math.cos(a) * rr).addScaledVector(hornB, Math.sin(a) * rr);
        return out;
      }, 24, 12, u => (u < 0.5 ? mixC(H_BASE, H_GOLD, smooth(0.15, 0.5, u)) : mixC(H_GOLD, H_TIP, smooth(0.6, 1, u))), true);
      return mesh(geo, hornMat);
    };
    [-1, 1].forEach(s => {
      upperAt(0.3, s > 0 ? Math.PI * 0.3 : Math.PI * 0.7, tmpS);
      const b0 = tmpS.clone().multiplyScalar(0.92);
      head.add(makeHorn([b0, V3(b0.x + 0.08 * s, b0.y + 0.18, b0.z - 0.08), V3(b0.x + 0.22 * s, b0.y + 0.42, b0.z - 0.3), V3(b0.x + 0.3 * s, b0.y + 0.7, b0.z - 0.55), V3(b0.x + 0.26 * s, b0.y + 0.95, b0.z - 0.72)], 0.1));
      upperAt(0.22, s > 0 ? Math.PI * 0.08 : Math.PI * 0.92, tmpS);
      const b1 = tmpS.clone().multiplyScalar(0.92);
      head.add(makeHorn([b1, V3(b1.x + 0.1 * s, b1.y + 0.02, b1.z - 0.1), V3(b1.x + 0.24 * s, b1.y + 0.06, b1.z - 0.3), V3(b1.x + 0.34 * s, b1.y + 0.16, b1.z - 0.5)], 0.045));
    });

    const hoodShape = new THREE.Shape();
    const tips = [[-0.62, 0.22], [-0.6, 0.55], [-0.42, 0.82], [-0.16, 0.96], [0.16, 0.96], [0.42, 0.82], [0.6, 0.55], [0.62, 0.22]];
    hoodShape.moveTo(0, -0.14);
    hoodShape.quadraticCurveTo(-0.42, -0.14, tips[0][0], tips[0][1]);
    for (let k = 1; k < tips.length; k++) {
      const [x0, y0] = tips[k - 1];
      const [x1, y1] = tips[k];
      hoodShape.quadraticCurveTo((x0 + x1) * 0.42, (y0 + y1) * 0.42, x1, y1);
    }
    hoodShape.quadraticCurveTo(0.42, -0.14, 0, -0.14);
    const bend = (x, y) => -0.42 * x * x - 0.12 * Math.max(0, y);
    const hoodRim = hoodShape.getSpacedPoints(120);
    const HOOD_C = [0, 0.12];
    const hoodGeo = surface((u, v, out) => {
      const pr = hoodRim[Math.min(hoodRim.length - 1, Math.round(v * (hoodRim.length - 1)))];
      const x = lerp(HOOD_C[0], pr.x, u);
      const y = lerp(HOOD_C[1], pr.y, u);
      return out.set(x, y, bend(x, y));
    }, 16, hoodRim.length - 1, () => [1, 1, 1], false);
    hoodGeo.deleteAttribute("color");
    const hoodMat = new THREE.MeshStandardMaterial({ color: 0x2f7fe0, emissive: 0x1450b0, emissiveIntensity: 0.45, roughness: 0.65, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
    const RIB_Y = 0.12;
    const hood = new THREE.Group();
    hood.position.set(0, -0.42, -0.42);
    hood.rotation.x = -0.12;
    hood.add(mesh(hoodGeo, hoodMat, false));
    tips.forEach(([x, y]) => {
      const rib = [];
      for (let k = 0; k <= 8; k++) {
        const f = k / 8;
        const px = x * f * 0.96;
        const py = RIB_Y + (y - RIB_Y) * f * 0.96;
        rib.push(V3(px, py, bend(px, py) + 0.014));
      }
      hood.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib), 12, 0.014, 6, false), elecMat, false));
      const tipBall = mesh(new THREE.SphereGeometry(0.03, 10, 8), elecMat, false);
      tipBall.position.set(x * 0.96, RIB_Y + (y - RIB_Y) * 0.96, bend(x * 0.96, RIB_Y + (y - RIB_Y) * 0.96) + 0.014);
      hood.add(tipBall);
    });
    hood.scale.set(1.5, 1.3, 1.3);
    head.add(hood);


    const crestShape = new THREE.Shape();
    crestShape.moveTo(0, 0);
    crestShape.lineTo(0.5, 0);
    crestShape.quadraticCurveTo(0.68, 0.06, 0.82, 0.34);
    crestShape.lineTo(0.62, 0.22);
    crestShape.lineTo(0.66, 0.4);
    crestShape.lineTo(0.38, 0.16);
    crestShape.quadraticCurveTo(0.2, 0.12, 0, 0);
    const crestGeo = new THREE.ExtrudeGeometry(crestShape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.014, bevelSegments: 2 });
    crestGeo.translate(0, 0, -0.02);
    crestGeo.rotateY(Math.PI / 2);
    const crest = mesh(crestGeo, elecMat, false);
    crest.scale.setScalar(1.5);
    crest.position.set(0, 0.17, 0.52);
    crest.rotation.x = 0.2;
    head.add(crest);

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(0.12, 0.05);
    wingShape.quadraticCurveTo(0.34, 0.02, 0.5, -0.12);
    wingShape.lineTo(0.3, -0.08);
    wingShape.lineTo(0.38, -0.2);
    wingShape.lineTo(0.16, -0.1);
    wingShape.quadraticCurveTo(0.06, -0.08, 0, 0);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 });
    const wings = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.32 * s, -0.06, 0.12);
      g.scale.setScalar(1.35);
      const w = mesh(wingGeo, finMat, false);
      w.rotation.set(0, s > 0 ? Math.PI * 0.62 : Math.PI * 0.38, 0);
      if (s < 0) w.scale.set(1, 1, -1);
      g.add(w);
      head.add(g);
      return { g, s };
    });

    const barbels = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.17 * s, -0.06, 0.62);
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.12 * s, -0.04, -0.06), V3(0.26 * s, -0.02, -0.2), V3(0.34 * s, 0.06, -0.36)]);
      g.add(mesh(new THREE.TubeGeometry(c, 16, 0.016, 6, false), navyMat, false));
      const tip = mesh(new THREE.SphereGeometry(0.045, 14, 10), elecMat, false);
      tip.position.set(0.34 * s, 0.06, -0.36);
      g.add(tip);
      head.add(g);
      return { g, tip, s };
    });

    const bubbleMat = new THREE.MeshStandardMaterial({ color: 0xcff6ff, roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false });
    const bubbleGeo = new THREE.SphereGeometry(0.05, 12, 10);
    const bubbles = [];
    for (let k = 0; k < 16; k++) {
      const m = new THREE.Mesh(bubbleGeo, bubbleMat);
      swim.add(m);
      bubbles.push({ m, ph: k / 16, jx: Math.sin(k * 12.9) * 0.5, jy: Math.cos(k * 7.3) * 0.5, sz: 0.6 + ((k * 37) % 10) / 14 });
    }

    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff27a });
    const sparkGeo = new THREE.OctahedronGeometry(0.05, 0);
    const sparks = [];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(sparkGeo, sparkMat);
      swim.add(m);
      sparks.push({ m, ph: k * 0.71, a: (k / 10) * Math.PI * 2, i: Math.round((0.15 + 0.8 * ((k * 3) % 10) / 10) * N) });
    }

    const arcMat = new THREE.LineBasicMaterial({ color: 0xfff6a0, transparent: true, opacity: 0.95 });
    const arcs = [];
    for (let k = 0; k < 7; k++) {
      const g = new THREE.BufferGeometry();
      const arr = new Float32Array(10 * 3);
      g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      const line = new THREE.Line(g, arcMat);
      line.frustumCulled = false;
      line.visible = false;
      swim.add(line);
      arcs.push({ line, arr, seed: k * 3.7 });
    }

    const strikeMat = new THREE.MeshBasicMaterial({ color: 0xfffbe0 });
    const strikeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe45a, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    const strike = new THREE.Mesh(new THREE.BufferGeometry(), strikeMat);
    const strikeGlow = new THREE.Mesh(new THREE.BufferGeometry(), strikeGlowMat);
    strike.frustumCulled = false;
    strikeGlow.frustumCulled = false;
    strike.visible = false;
    strikeGlow.visible = false;
    swim.add(strike, strikeGlow);
    const strikePts = [];
    for (let k = 0; k < 14; k++) strikePts.push(V3(0, 0, 0));
    const sTop = V3(0, 0, 0);
    const sBot = V3(0, 0, 0);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.2, 1.75, 64),
      new THREE.MeshBasicMaterial({ color: 0x3aa8ff, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.015;
    root.add(ring);
    const ring2 = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.68, 64),
      new THREE.MeshBasicMaterial({ color: 0xffe45a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.02;
    root.add(ring2);

    const glow = new THREE.PointLight(0x9fe6ff, 0.6, 6);
    glow.position.set(0, 1.2, 0.9);
    swim.add(glow);

    const food = fish(0xffb35a);
    food.visible = false;
    swim.add(food);

    const headDir = V3(0, 0, 1);
    const q = new THREE.Quaternion();
    const noise = (a, b) => Math.sin(a * 12.9898 + b * 78.233) * 0.5 + Math.sin(a * 4.1 + b * 9.7) * 0.5;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const dash = action && action.name === "jet" ? action : null;
        const zap = action && action.name === "zap" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const elec = s.dying ? 0.25 : 0.5 + 0.5 * Math.max(0, Math.min(1, hunger / 100));

        let stream = 0;
        let thrust = 0.12;
        let orbit = 0;
        if (dash) {
          const p = dash.p;
          stream = smooth(0.02, 0.2, p) * (1 - smooth(0.84, 1, p));
          thrust = 0.12 + 0.5 * smooth(0.05, 0.2, p) + 0.5 * smooth(0.18, 0.26, p) * (1 - smooth(0.8, 0.9, p));
          orbit = smooth(0.2, 0.84, p) * Math.PI * 4;
        }
        let charge = 0;
        let blast = 0;
        if (zap) {
          charge = smooth(0, 0.35, zap.p) * (1 - smooth(0.35, 0.45, zap.p));
          blast = smooth(0.35, 0.45, zap.p) * (1 - smooth(0.75, 1, zap.p));
        }
        let hop = 0;
        let crouch = 0;
        if (jump) {
          const p = jump.p;
          crouch = p < 0.2 ? Math.sin((p / 0.2) * Math.PI / 2) : p > 0.8 ? Math.sin(((1 - p) / 0.2) * Math.PI / 2) * 0.6 : 0;
          if (p > 0.2 && p < 0.8) hop = Math.sin(((p - 0.2) / 0.6) * Math.PI);
        }
        const droop = s.dying ? 1 : 0;
        const fastWag = 1 + stream * 4 + charge * 2;

        for (let i = 0; i < REST.length; i++) {
          const r = REST[i];
          const c = ctrl[i];
          const u = i / (REST.length - 1);
          const ground = i < 7;
          const wave = Math.sin(t * 1.7 * fastWag - i * 0.95) * (ground ? 0.06 : 0.03) * motion;
          let x = r[0] + wave * (ground ? Math.cos(i) : 1);
          let y = r[1];
          let z = r[2] + wave * (ground ? Math.sin(i) : 0);
          if (!ground) {
            const k = (i - 6) / (REST.length - 7);
            x += Math.sin(t * 1.1) * 0.08 * k * motion;
            y -= crouch * 0.28 * k - Math.sin(t * 2) * 0.025 * k * motion;
            y -= droop * 0.9 * k * k;
            z += droop * 0.35 * k + charge * -0.12 * k + blast * 0.08 * k;
            if (eat) {
              y += 0.08 * k * Math.sin(ph.fall * Math.PI);
              z -= 0.06 * k * ph.chew;
            }
          } else {
            y = Math.max(r[1] * 0.92, y - crouch * 0.03);
          }
          const along = (1 - u) * REST_LEN;
          const ang = -along / RING_R;
          const rr = RING_R * (1 - 0.18 * (along / REST_LEN)) + Math.sin(along * 4.2 - t * 12) * 0.07 * Math.min(1, along) * motion;
          const sx = Math.sin(ang) * rr;
          const sy = 2.3 - (along / REST_LEN) * HELIX_DROP + Math.sin(along * 3 - t * 8) * 0.04 * motion;
          const sz = Math.cos(ang) * rr - 0.15;
          c.set(lerp(x, sx, stream), lerp(y, sy, stream), lerp(z, sz, stream));
        }
        buildBody();

        swim.position.set(0, 0, 0);
        swim.rotation.set(0.22 * stream + Math.sin(orbit) * 0.1 * stream, orbit, Math.cos(orbit) * 0.08 * stream);

        const end = pts[N];
        headDir.copy(tans[N]).multiplyScalar(0.35 + 0.65 * stream).addScaledVector(FWD, 0.65 * (1 - stream)).normalize();
        q.setFromUnitVectors(FWD, headDir);
        head.position.copy(end).addScaledVector(tans[N], -0.05);
        head.quaternion.copy(q);
        let nod = Math.sin(t * 1.4) * 0.05 * motion;
        if (eat) nod += -0.35 * (1 - ph.fall) * (eat.p < 0.3 ? 1 : 0) + Math.sin(ph.chew * Math.PI) * 0.06;
        nod += -blast * 0.12 + charge * 0.15 + droop * 0.35 + crouch * 0.1 - hop * 0.2;
        head.rotateX(nod);
        head.rotateZ(Math.sin(t * 0.9) * 0.06 * motion);

        let mouth = 0;
        if (eat) mouth = eat.p < 0.3 ? smooth(0.08, 0.28, eat.p) * 0.55 : eat.p < 0.85 ? 0.08 + ph.chew * 0.3 : 0;
        if (blast) mouth = Math.max(mouth, blast * 0.45);
        if (hop > 0.3) mouth = Math.max(mouth, 0.3);
        const flickT = (t * 0.23) % 1;
        const flick = !eat && !dash && !s.dying && flickT > 0.9 ? Math.sin(((flickT - 0.9) / 0.1) * Math.PI) : 0;
        if (flick) mouth = Math.max(mouth, 0.16 * flick);
        jaw.rotation.x = lerp(jaw.rotation.x, mouth, 0.35);
        const out = flick + (hop > 0.3 ? 0.5 : 0);
        tongue.position.z = 0.1 + out * 0.32;
        tongue.rotation.x = -0.15 * out + Math.sin(t * 40) * 0.08 * out;
        tongue.visible = jaw.rotation.x > 0.05;
        lowerTeeth.forEach(tt => {
          tt.visible = jaw.rotation.x > 0.06;
        });

        wings.forEach(({ g, s: sd }) => {
          const flap = Math.sin(t * 2.2 + sd) * 0.12 * motion;
          g.rotation.y = sd * (-0.15 - stream * 0.55 + flap * 0.5);
          g.rotation.z = sd * (flap + blast * 0.3 - stream * 0.15);
        });
        barbels.forEach(({ g, tip, s: sd }, i) => {
          g.rotation.y = sd * (Math.sin(t * 2.6 + i * 1.7) * 0.18 * motion - stream * 0.35);
          g.rotation.x = Math.sin(t * 2 + i) * 0.1 * motion + stream * 0.25;
          tip.scale.setScalar(1 + (charge + blast) * 0.7 + Math.sin(t * 6 + i * 2) * 0.12 * motion);
        });
        crest.rotation.x = 0.2 + stream * 0.25 + Math.sin(t * 1.8) * 0.04 * motion;

        bands.forEach((b, k) => {
          const r = radiusAt(b.u) * (1.02 + 0.06 * Math.max(0, Math.sin(t * 5 - k * 0.9)) * (charge + blast) * 2);
          orientAt(b.m, b.i, r * 0.1);
          b.m.scale.set(r, r * 0.9, r);
        });
        bolts.forEach((b, k) => {
          orientAt(b.m, b.i, radiusAt(b.u) * 0.92);
          b.m.scale.setScalar(b.sc * (1 + blast * 0.25 + Math.sin(t * 4 + k) * 0.03 * motion));
        });

        orientAt(tailFin, 2, 0);
        tailFin.position.addScaledVector(tans[2], -0.02);
        tailFin.scale.set(1.6, 1.6 * (1 + thrust * 0.4 + Math.sin(t * 7) * 0.05 * motion), 1.6 * (1 + thrust * 0.3));
        const back = tmp2.copy(tans[0]).negate();
        orb.position.copy(pts[0]).addScaledVector(back, 0.82);
        halo.position.copy(orb.position);
        const orbPulse = 1 + Math.sin(t * 6) * 0.15 * motion + thrust * 1.2 + (charge + blast) * 0.8;
        orb.scale.setScalar(orbPulse * elec);
        halo.scale.setScalar((1 + thrust * 1.1 + Math.sin(t * 13) * 0.12) * elec);
        haloMat.opacity = 0.25 + thrust * 0.35;
        plasma.forEach(pl => {
          const on = thrust > 0.2;
          pl.m.visible = on;
          if (!on) return;
          const u = (((t * (2.5 + thrust * 3) + pl.ph) % 1) + 1) % 1;
          const d = 0.4 + u * (0.6 + thrust * 1.6);
          pl.m.position.copy(pts[0]).addScaledVector(back, d);
          const wob = Math.sin(t * 31 + pl.k * 2.3) * 0.06 * u;
          pl.m.position.x += wob;
          pl.m.position.y += Math.cos(t * 27 + pl.k) * 0.06 * u;
          const size = (0.16 - u * 0.12) * (0.6 + thrust * 0.7) * (0.75 + 0.25 * Math.sin(t * 40 + pl.k));
          pl.m.scale.setScalar(Math.max(0.005, size));
          pl.m.material.opacity = (1 - u) * 0.75;
        });
        bubbles.forEach(b => {
          const speed = 0.35 + thrust * 1.6;
          const u = (((t * speed + b.ph) % 1) + 1) % 1;
          const reach = 0.4 + thrust * 2.2;
          b.m.position.copy(pts[0]).addScaledVector(back, 0.45 + u * reach);
          b.m.position.x += b.jx * u * 0.35 * (1 - stream * 0.6);
          b.m.position.y += b.jy * u * 0.3 + u * u * 0.6 * (1 - stream);
          b.m.position.z += b.jy * u * 0.2;
          const fade = Math.sin(Math.PI * u);
          b.m.scale.setScalar(Math.max(0.001, b.sz * fade * (0.5 + thrust * 0.8)));
          b.m.visible = !reduceMotion || thrust > 0.2;
        });

        const live = charge + blast + Math.max(0, thrust - 0.5) * 0.9;
        sparks.forEach((sp, k) => {
          const i = sp.i;
          const a = sp.a + t * (1.5 + live * 4);
          const rad = radiusAt(sp.i / N) + 0.12 + live * 0.25 + Math.sin(t * 3 + sp.ph) * 0.04;
          dir.copy(nors[i]).multiplyScalar(Math.cos(a)).addScaledVector(bins[i], Math.sin(a));
          sp.m.position.copy(pts[i]).addScaledVector(dir, rad);
          sp.m.rotation.set(t * 3 + sp.ph, t * 2, 0);
          const tw = Math.max(0, Math.sin(t * 2.3 + sp.ph * 3));
          sp.m.scale.setScalar(Math.max(0.001, (0.25 + live * 1.1) * (0.4 + tw * 0.6) * elec));
        });

        arcs.forEach((arc, k) => {
          const on = live > 0.15 && (Math.sin(t * 40 + arc.seed * 5) > -0.3);
          arc.line.visible = on;
          if (!on) return;
          const i0 = bands[k % bands.length].i;
          const i1 = k % 2 ? N - 4 : bands[(k + 2) % bands.length].i;
          const seed = Math.floor(t * 18) + arc.seed;
          for (let j = 0; j < 10; j++) {
            const f = j / 9;
            const ii = Math.round(lerp(i0, i1, f));
            const p = pts[ii];
            topV.copy(bellies[ii]).negate();
            const lift = radiusAt(ii / N) + 0.06 + Math.sin(f * Math.PI) * (0.2 + blast * 0.35);
            const jx = j === 0 || j === 9 ? 0 : noise(seed + j, k) * 0.12 * (1 + blast);
            const jy = j === 0 || j === 9 ? 0 : noise(k, seed - j) * 0.12 * (1 + blast);
            arc.arr[j * 3] = p.x + topV.x * lift + jx;
            arc.arr[j * 3 + 1] = p.y + topV.y * lift + jy;
            arc.arr[j * 3 + 2] = p.z + topV.z * lift + jx * 0.5;
          }
          arc.line.geometry.attributes.position.needsUpdate = true;
        });

        const strikeOn = blast > 0.25 && Math.sin(t * 23) > -0.3;
        strike.visible = strikeOn;
        strikeGlow.visible = strikeOn;
        if (strikeOn) {
          const seedS = Math.floor(t * 12);
          sBot.copy(head.position).add(tmp.set(0, 0.75, -0.1));
          sTop.copy(sBot).add(tmp.set(0.5, 5, -0.6));
          strikePts.forEach((sp, j) => {
            const f = j / (strikePts.length - 1);
            const w = Math.sin(f * Math.PI) * 0.35;
            sp.copy(sTop).lerp(sBot, f);
            sp.x += noise(seedS + j, 1) * w;
            sp.z += noise(2, seedS - j) * w;
          });
          const sc = new THREE.CatmullRomCurve3(strikePts, false, "catmullrom", 0.1);
          strike.geometry.dispose();
          strikeGlow.geometry.dispose();
          strike.geometry = new THREE.TubeGeometry(sc, 40, 0.028, 5, false);
          strikeGlow.geometry = new THREE.TubeGeometry(sc, 40, 0.1, 6, false);
        }

        elecMat.emissiveIntensity = (0.55 + Math.sin(t * 3) * 0.15 * motion + charge * 0.9 + blast * 1.8 + (Math.sin(t * 50) > 0 ? blast * 0.6 : 0)) * elec;
        finMat.emissiveIntensity = 0.2 + thrust * 0.5 + blast * 0.3;
        glow.color.setHex(live > 0.1 ? 0xfff0a0 : 0x9fe6ff);
        glow.intensity = (0.45 + live * 1.1 + thrust * 0.5 + (blast && Math.sin(t * 37) > 0.2 ? 0.5 : 0) * blast) * (0.6 + elec * 0.4);
        glow.position.copy(pts[Math.round(N * 0.4)]).add(tmp.set(0, 0.5, 1.3));

        const pulse = 1 + Math.sin(t * 2.4) * 0.05 * motion;
        ring.scale.setScalar(pulse + stream * 0.5 + blast * 0.5);
        ring.material.opacity = 0.16 + 0.06 * Math.sin(t * 2) + stream * 0.2;
        ring2.scale.setScalar(1.2 + blast * 1.8 + Math.sin(t * 3) * 0.04);
        ring2.material.opacity = (0.22 + live * 0.5) * elec;

        if (eat) {
          food.visible = ph.visible;
          const mouthPos = tmp.copy(head.position).addScaledVector(headDir, 0.75);
          food.position.set(mouthPos.x, lerp(3.6, mouthPos.y, ph.fall * ph.fall), lerp(mouthPos.z + 0.3, mouthPos.z, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.set(0, Math.PI / 2, (1 - ph.fall) * 1.4);
        } else {
          food.visible = false;
        }

        root.position.y = hop * 0.9;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;

        eyes.forEach(({ g }) => {
          g.scale.y = hop > 0.2 ? 1.1 : eat && eat.p > 0.3 ? 0.45 : charge > 0.3 ? 0.35 : blast > 0.3 ? 1.15 : blink;
        });
        followPupils(eyes, pointer, 0.8);
      }
    };
  }
});
