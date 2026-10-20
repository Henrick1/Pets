Pets.register({
  id: "brasinha",
  dex: 22,
  name: "Brasinha",
  color: "#e0602a",
  types: ["dragon", "fire"],
  evolvesTo: "magmarra",
  evolveLevel: 16,
  description: "Filhote de dragão que nasce dentro de pedras vulcânicas. A casca de rocha racha conforme ele cresce, e a lava aparece pelas frestas. Ainda não sabe cuspir fogo direito: quando tenta, sai só uma baforada e um pouco de fumaça.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    puff: { duration: 2.2 },
    wag: { duration: 1.6 }
  },
  idle: [
    { action: "puff", min: 20, max: 45 },
    { action: "wag", min: 12, max: 30 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["jump", "puff", "wag"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry, lavaRock } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const T = lavaRock({ seed: 17, cells: 24, crack: 1.7, rock: [70, 58, 54], lava: [30, 24, 22] });
    const A = lavaRock({ seed: 29, cells: 40, crack: 1.3, rock: [84, 74, 70], lava: [150, 70, 40] });
    const B = lavaRock({ seed: 5, stripes: 9, cols: 1, crack: 2.6, rock: [128, 74, 50], lava: [60, 36, 26] });
    const rep = (t, x, y) => {
      const c = t.clone();
      c.needsUpdate = true;
      c.repeat.set(x, y);
      return c;
    };
    const rockMat = (src, rx, ry, extra = {}) =>
      new THREE.MeshStandardMaterial(
        Object.assign(
          {
            color: 0xffffff,
            map: rep(src.map, rx, ry),
            emissive: 0x000000,
            emissiveMap: rep(src.emi, rx, ry),
            emissiveIntensity: 0.6,
            bumpMap: rep(src.bump, rx, ry),
            bumpScale: 0.04,
            roughness: 0.92,
            flatShading: true
          },
          extra
        )
      );
    const masked = m => {
      m.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nattribute float crack;\nvarying float vCrack;")
          .replace("#include <begin_vertex>", "#include <begin_vertex>\nvCrack = crack;");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying float vCrack;")
          .replace("#include <map_fragment>", "#include <map_fragment>\ndiffuseColor.rgb = mix(vec3(0.15, 0.125, 0.115), diffuseColor.rgb, vCrack);")
          .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vCrack;")
          .replace("#include <bumpmap_pars_fragment>", THREE.ShaderChunk.bumpmap_pars_fragment.replace(/bumpScale \*/g, "bumpScale * vCrack *"));
      };
      m.customProgramCacheKey = () => "brasinha-mask";
      return m;
    };
    const skinRock = masked(rockMat(T, 1, 1));
    const headRock = masked(rockMat(T, 1.4, 1.4));
    const smallRock = masked(rockMat(T, 1.2, 1));
    const hornRock = rockMat(T, 1.4, 1.4);
    const coneRock = rockMat(A, 3, 1.2, { emissiveIntensity: 0.15 });
    const bellyMat = rockMat(B, 1, 1, { flatShading: false, bumpScale: 0.025, roughness: 0.8 });
    const rockMats = [skinRock, headRock, smallRock, hornRock];
    const basalt = new THREE.MeshStandardMaterial({ color: 0x2c2422, roughness: 0.8, flatShading: true });
    const clawMat = mat(0x1a1210, 0.35);
    const toothMat = mat(0xe6d8c0, 0.45);
    const gumMat = new THREE.MeshBasicMaterial({ color: 0x3a0a06 });
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6a14 });
    const hotMat = new THREE.MeshBasicMaterial({ color: 0xffc84a });

    const noise = (x, y, z, sd) =>
      Math.sin(x * 5.3 + sd) * Math.sin(y * 4.7 + sd * 1.7) * Math.sin(z * 5.1 + sd * 0.6) +
      0.5 * Math.sin(x * 11.2 + z * 7.3 + sd) * Math.sin(y * 9.1 - x * 3.1) +
      0.25 * Math.sin(x * 23 + y * 19 + z * 17 + sd);
    const rocky = (geo, amp, sd = 1) => {
      const p = geo.attributes.position;
      const v = V3(0, 0, 0);
      for (let i = 0; i < p.count; i++) {
        v.set(p.getX(i), p.getY(i), p.getZ(i));
        const len = v.length() || 1;
        v.multiplyScalar(1 + (amp * noise(v.x, v.y, v.z, sd)) / len);
        p.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals();
      return geo;
    };
    const shard = (r, h, sd) => {
      const g = new THREE.CylinderGeometry(r * 0.25, r, h, 6, 3);
      g.translate(0, h / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const k = 1 + 0.25 * Math.sin(p.getX(i) * 40 + y * 13 + sd) * Math.sin(p.getZ(i) * 37 + sd);
        p.setX(i, p.getX(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      g.computeVertexNormals();
      return g;
    };

    const catmull = (p0, p1, p2, p3, t, out) => {
      const t2 = t * t;
      const t3 = t2 * t;
      for (const c of ["x", "y", "z"]) {
        out[c] = 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3);
      }
      return out;
    };
    const makeLoft = (nNodes, seg, R, material, o = {}) => {
      const rings = (nNodes - 1) * seg + 1;
      const a0 = o.a0 !== undefined ? o.a0 : 0;
      const a1 = o.a1 !== undefined ? o.a1 : Math.PI * 2;
      const closed = o.a0 === undefined;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(rings * (R + 1) * 3);
      const uv = new Float32Array(rings * (R + 1) * 2);
      const idx = [];
      for (let i = 0; i < rings - 1; i++) {
        for (let j = 0; j < R; j++) {
          const a = i * (R + 1) + j;
          const b = a + R + 1;
          idx.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const crackArr = new Float32Array(rings * (R + 1));
      for (let i = 0; i < rings; i++) {
        for (let j = 0; j <= R; j++) {
          const jj = closed ? j % R : j;
          const a = a0 + (jj / R) * (a1 - a0);
          crackArr[i * (R + 1) + j] = o.crack ? Math.max(0, Math.min(1, o.crack(i / seg, Math.cos(a), Math.sin(a), i / (rings - 1)))) : 0;
        }
      }
      geo.setAttribute("crack", new THREE.BufferAttribute(crackArr, 1));
      const rough = [];
      const sd = o.seed || 1;
      for (let i = 0; i < rings; i++) {
        const row = [];
        for (let j = 0; j <= R; j++) {
          const jj = closed ? j % R : j;
          const a0r = a0 + (jj / R) * (a1 - a0);
          const a = o.sym ? Math.atan2(Math.sin(a0r), Math.abs(Math.cos(a0r))) : a0r;
          row.push(1 + (o.rough === undefined ? 0.06 : o.rough) * (o.roughK ? o.roughK(i / seg) : 1) * (Math.sin(a * 3 + i * 1.3 + sd) * Math.sin(i * 0.7 + a * 2 + sd) + 0.6 * Math.sin(a * 7 - i * 2.1 + sd)));
        }
        rough.push(row);
      }
      const m = mesh(geo, material, o.shadow !== false);
      m.frustumCulled = false;
      const P = [];
      const TT = [];
      for (let i = 0; i < rings; i++) {
        P.push(V3(0, 0, 0));
        TT.push(V3(0, 0, 0));
      }
      const RX = new Float32Array(rings);
      const RY = new Float32Array(rings);
      const X = V3(0, 0, 0);
      const U = V3(0, 0, 0);
      const ref = o.ref || V3(1, 0, 0);
      const alt = V3(0, 0, 1);
      const shape = o.shape || ((c, s) => [c, s]);
      const scale = o.scale || 1;
      const uvK = o.uvK || 0.9;
      const update = nodes => {
        const n = nodes.length;
        for (let i = 0; i < rings; i++) {
          const k = Math.min(n - 2, Math.floor(i / seg));
          const f = i === rings - 1 ? 1 : (i - k * seg) / seg;
          const q0 = nodes[Math.max(0, k - 1)];
          const q1 = nodes[k];
          const q2 = nodes[k + 1];
          const q3 = nodes[Math.min(n - 1, k + 2)];
          catmull(q0.p, q1.p, q2.p, q3.p, f, P[i]);
          const e = f * f * (3 - 2 * f);
          RX[i] = lerp(q1.rx, q2.rx, e) * scale;
          RY[i] = lerp(q1.ry, q2.ry, e) * scale;
        }
        let dist = 0;
        for (let i = 0; i < rings; i++) {
          const a = P[Math.max(0, i - 1)];
          const b = P[Math.min(rings - 1, i + 1)];
          TT[i].subVectors(b, a).normalize();
          if (i > 0) dist += P[i].distanceTo(P[i - 1]);
          const Tn = TT[i];
          const r = Math.abs(Tn.dot(ref)) > 0.95 ? alt : ref;
          X.copy(r).addScaledVector(Tn, -r.dot(Tn)).normalize();
          U.crossVectors(Tn, X);
          if (o.upY && U.y < 0) {
            X.multiplyScalar(-1);
            U.crossVectors(Tn, X);
          }
          for (let j = 0; j <= R; j++) {
            const jj = closed ? j % R : j;
            const a = a0 + (jj / R) * (a1 - a0);
            const sh = shape(Math.cos(a), Math.sin(a), i / (rings - 1));
            const rr = rough[i][j];
            const cx = sh[0] * RX[i] * rr;
            const cy = sh[1] * RY[i] * rr;
            const oo = (i * (R + 1) + j) * 3;
            pos[oo] = P[i].x + X.x * cx + U.x * cy;
            pos[oo + 1] = P[i].y + X.y * cx + U.y * cy;
            pos[oo + 2] = P[i].z + X.z * cx + U.z * cy;
            const ou = (i * (R + 1) + j) * 2;
            uv[ou] = (j / R) * (o.uSpan || 2);
            uv[ou + 1] = dist * uvK;
          }
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.uv.needsUpdate = true;
        geo.computeVertexNormals();
      };
      return { mesh: m, update };
    };

    const root = new THREE.Group();
    const body = new THREE.Group();
    body.scale.setScalar(0.95);
    root.add(body);
    const F0 = V3(0, 0.87, -0.7);
    const FT = 0.04;
    const front = new THREE.Group();
    front.position.copy(F0);
    body.add(front);

    const anchor = (parent, x, y, z) => {
      const g = new THREE.Group();
      if (parent === front) g.position.set(x - F0.x, y - F0.y, z - F0.z);
      else g.position.set(x, y, z);
      parent.add(g);
      return g;
    };
    const bellyShape = (c, s) => [c, s > 0 ? s : s * 0.82];
    const spine = [
      { o: anchor(front, 0, 1.06, 1.94), rx: 0.2, ry: 0.18 },
      { o: anchor(front, 0, 0.98, 1.56), rx: 0.33, ry: 0.3 },
      { o: anchor(front, 0, 0.86, 1.0), rx: 0.48, ry: 0.4 },
      { o: anchor(front, 0, 0.82, 0.48), rx: 0.55, ry: 0.42 },
      { o: anchor(front, 0, 0.8, -0.04), rx: 0.53, ry: 0.41 },
      { o: anchor(body, 0, 0.78, -0.56), rx: 0.44, ry: 0.36 }
    ];

    const tail = [];
    {
      const base = new THREE.Group();
      base.position.set(0, 0.78, -0.86);
      base.rotation.x = -1.72;
      body.add(base);
      let parent = base;
      const n = 13;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1);
        const g = new THREE.Group();
        g.position.y = i === 0 ? 0 : 0.14;
        const r = 0.33 * (1 - 0.88 * Math.pow(u, 0.8));
        g.userData.r = r;
        if (i < n - 1 && i > 0) {
          const sp = mesh(shard(0.035 * (1 - u * 0.5) + 0.015, 0.07 + r * 0.3, 100 + i), basalt, false);
          sp.position.set(0, 0.06, -r * 0.5);
          sp.rotation.x = -Math.PI / 2 - 0.4;
          g.add(sp);
        }
        parent.add(g);
        tail.push(g);
        parent = g;
      }
      const tipG = new THREE.Group();
      tipG.position.y = 0.14;
      const fl = new THREE.LatheGeometry(
        Array.from({ length: 15 }, (_, i) => new THREE.Vector2(Math.max(0.0001, 0.11 * Math.sin(Math.PI * Math.pow(i / 14, 0.62)) * (1 - 0.3 * (i / 14))), (i / 14) * 0.4)),
        14
      );
      const flameO = new THREE.Mesh(fl, new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.95 }));
      const flameI = new THREE.Mesh(fl, new THREE.MeshBasicMaterial({ color: 0xffd23a }));
      flameI.scale.set(0.55, 0.65, 0.55);
      flameI.position.y = 0.01;
      tipG.add(flameO, flameI);
      tail.flame = tipG;
      parent.add(tipG);
      tail.tip = tipG;
    }
    const tailNodes = tail.map(g => ({ o: g, rx: g.userData.r, ry: g.userData.r * 0.92 }));
    tailNodes.push({ o: tail.tip, rx: 0.02, ry: 0.02 });
    const bodyChain = spine.concat(tailNodes);
    const bodyLoft = makeLoft(bodyChain.length, 4, 22, skinRock, {
      upY: true,
      roughK: f => 1 - smooth(4.6, 6.2, f) * 0.85,
      sym: true,
      seed: 3,
      uSpan: 3,
      uvK: 0.75,
      crack: (f, c, s) => {
        const near = 1 - smooth(0.25, 0.85, Math.abs(f - 3.6));
        const aroundVolcano = near * smooth(0.35, 0.8, s);
        const topNeck = f < 3.6 && f > 0.6 ? smooth(0.5, 0.9, s) * smooth(0.6, 1.4, f) : 0;
        return Math.max(aroundVolcano, topNeck);
      },
      shape: (c, s) => {
        const b = bellyShape(c, s);
        return [b[0] * (1 + 0.04 * Math.pow(Math.abs(c), 6)), b[1] + 0.12 * Math.pow(Math.max(0, s), 14)];
      }
    });
    body.add(bodyLoft.mesh);
    const bellyChain = spine.slice(2).concat(tailNodes.slice(0, 3));
    const bellyLoft = makeLoft(bellyChain.length, 4, 12, bellyMat, {
      upY: true,
      a0: Math.PI * 1.18,
      a1: Math.PI * 1.82,
      scale: 1.02,
      rough: 0.02,
      seed: 7,
      uSpan: 1,
      uvK: 0.55,
      shadow: false,
      shape: bellyShape
    });
    body.add(bellyLoft.mesh);

    const tmpA = V3(0, 0, 0);
    const bodyInv = new THREE.Matrix4();
    const chainNodes = chain => chain.map(c => ({ p: V3(0, 0, 0), rx: c.rx, ry: c.ry }));
    const bodyN = chainNodes(bodyChain);
    const bellyN = chainNodes(bellyChain);
    const readChain = (chain, out, dy = 0) => {
      chain.forEach((c, i) => {
        c.o.getWorldPosition(out[i].p);
        out[i].p.applyMatrix4(bodyInv);
        if (dy && c.o.parent && tail.includes(c.o)) out[i].p.y += 0;
      });
    };

    let prof = [];
    const coneK = (a, y) => 1 + 0.09 * Math.sin(a * 5 + y * 6) + 0.05 * Math.sin(a * 11 - y * 13) + (y > 0.82 ? 0.08 * Math.sin(a * 7) : 0);
    const coneR = y => {
      for (let i = 0; i < prof.length - 1; i++) {
        const [r0, y0] = prof[i];
        const [r1, y1] = prof[i + 1];
        if (y >= y0 && y <= y1) return lerp(r0, r1, (y - y0) / (y1 - y0));
      }
      return prof[prof.length - 1][0];
    };
    const volcano = anchor(front, 0, 1.0, 0.26);
    volcano.rotation.x = -0.12;
    volcano.scale.set(0.5, 0.45, 0.55);
    volcano.visible = false;
    {
      prof = [[0.56, -0.14], [0.6, 0.0], [0.58, 0.08], [0.5, 0.3], [0.4, 0.52], [0.32, 0.72], [0.29, 0.84], [0.25, 0.9], [0.18, 0.86], [0.12, 0.78], [0.02, 0.76]];
      const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 30, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);
        const k = coneK(Math.atan2(z, x), y);
        p.setX(i, x * k);
        p.setZ(i, z * k);
        p.setY(i, y + (y > 0.82 ? 0.04 * Math.sin(Math.atan2(z, x) * 6 + 1) : 0));
      }
      g.computeVertexNormals();
      volcano.add(mesh(g, coneRock));
    }
    const crater = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), lavaMat);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 0.8;
    volcano.add(crater);
    const craterHot = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), hotMat);
    craterHot.rotation.x = -Math.PI / 2;
    craterHot.position.y = 0.805;
    volcano.add(craterHot);
    const bubbles = [];
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), hotMat);
      volcano.add(b);
      bubbles.push({ b, a: i * 1.3, r: 0.04 + (i % 3) * 0.035, ph: i * 0.23 });
    }
    [0.4, 1.5, 2.6, 3.9, 5.1].forEach((a, i) => {
      const pts = [];
      const len = 0.45 + (i % 3) * 0.22;
      for (let k = 0; k <= 10; k++) {
        const u = (k / 10) * len;
        const y = 0.86 - u * 0.86;
        const aa = a + Math.sin(u * 6 + i) * 0.12;
        const r = coneR(y) * coneK(Math.atan2(Math.sin(aa), Math.cos(aa)), y) + 0.006;
        pts.push(V3(Math.cos(aa) * r, y, Math.sin(aa) * r));
      }
      volcano.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.022, 6, false), lavaMat));
    });

    const dorsal = [1.6, 2.1, 4.5, 4.9].map((f, i) => {
      const sp = mesh(shard(0.05, 0.12, i * 3), basalt, false);
      body.add(sp);
      return { sp, f };
    });
    const dP = V3(0, 0, 0);
    const dT = V3(0, 0, 0);
    const dQ = V3(0, 0, 0);
    const placeDorsal = () => {
      const n = bodyN.length;
      dorsal.forEach(({ sp, f }) => {
        const k = Math.floor(f);
        const t = f - k;
        const q = i => bodyN[Math.max(0, Math.min(n - 1, i))].p;
        catmull(q(k - 1), q(k), q(k + 1), q(k + 2), t, dP);
        catmull(q(k - 1), q(k), q(k + 1), q(k + 2), Math.min(1, t + 0.05), dQ);
        dT.subVectors(dQ, dP).normalize();
        const ry = lerp(bodyN[k].ry, bodyN[Math.min(n - 1, k + 1)].ry, t) * 0.82;
        sp.position.set(dP.x, dP.y + ry * 1.04, dP.z);
        sp.rotation.set(-0.55 - Math.atan2(dT.y, Math.abs(dT.z) || 1e-3) * (dT.z < 0 ? -1 : 1), 0, 0);
      });
    };

    const talon = (len, r) => {
      const g = new THREE.ConeGeometry(r, len, 8, 6);
      g.translate(0, len / 2, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i) / len;
        p.setZ(i, p.getZ(i) + y * y * len * 0.5);
      }
      g.rotateX(Math.PI / 2);
      g.computeVertexNormals();
      return g;
    };
    const makeLeg = (s, parent, J, radii, sd) => {
      const hip = anchor(parent, J[0][0] * s, J[0][1], J[0][2]);
      const knee = new THREE.Group();
      knee.position.set((J[1][0] - J[0][0]) * s, J[1][1] - J[0][1], J[1][2] - J[0][2]);
      hip.add(knee);
      const ankle = new THREE.Group();
      ankle.position.set((J[2][0] - J[1][0]) * s, J[2][1] - J[1][1], J[2][2] - J[1][2]);
      knee.add(ankle);
      const foot = new THREE.Group();
      foot.position.set((J[3][0] - J[2][0]) * s, J[3][1] - J[2][1], J[3][2] - J[2][2]);
      ankle.add(foot);
      const top = new THREE.Group();
      top.position.set(-0.12 * s, 0.28, 0);
      hip.add(top);
      const cap = new THREE.Group();
      cap.position.set(-0.16 * s, 0.4, 0);
      hip.add(cap);
      const isFront = parent === front;
      const PW = isFront ? 1.25 : 1;
      const pawMid = new THREE.Group();
      pawMid.position.set(0, -0.035, 0.09 * PW);
      foot.add(pawMid);
      const pawEnd = new THREE.Group();
      pawEnd.position.set(0, -0.045, 0.2 * PW);
      foot.add(pawEnd);
      const toe = new THREE.Group();
      toe.position.set(0, -0.045, 0.235 * PW);
      foot.add(toe);
      const midA = new THREE.Group();
      midA.position.copy(knee.position).multiplyScalar(0.5);
      midA.position.z += 0.04;
      hip.add(midA);
      const midB = new THREE.Group();
      midB.position.copy(ankle.position).multiplyScalar(0.5);
      knee.add(midB);
      const chain = [
        { o: cap, rx: 0.004, ry: 0.004 },
        { o: top, rx: radii[0], ry: radii[0] },
        { o: hip, rx: radii[1], ry: radii[1] * 1.1 },
        { o: midA, rx: radii[2], ry: radii[2] * 1.12 },
        { o: knee, rx: radii[3], ry: radii[3] * 1.1 },
        { o: midB, rx: radii[4], ry: radii[4] * 1.1 },
        { o: ankle, rx: radii[5], ry: radii[5] * 1.05 },
        { o: foot, rx: radii[6], ry: radii[6] },
        { o: pawMid, rx: 0.15 * PW, ry: 0.065 },
        { o: pawEnd, rx: 0.14 * PW, ry: 0.05 },
        { o: toe, rx: 0.004, ry: 0.004 }
      ];
      const loft = makeLoft(chain.length, 4, 14, skinRock, { seed: sd, rough: 0.07, uSpan: 1.5, uvK: 0.9, ref: V3(1, 0, 0), shape: (c, sn, u) => [c, sn > 0 || u < 0.82 ? sn : sn * 0.6] });
      body.add(loft.mesh);
      const toes = isFront ? [-1.5, -0.5, 0.5, 1.5] : [-1, 0, 1];
      toes.forEach(j => {
        const t = new THREE.Group();
        t.position.set(j * (isFront ? 0.075 : 0.075), -0.04, 0.2 * PW - Math.abs(j) * 0.035);
        t.rotation.y = j * (isFront ? 0.2 : 0.26);
        const knuckle = mesh(rocky(new THREE.SphereGeometry(1, 10, 8), 0.06, sd + j), smallRock, false);
        knuckle.scale.set(isFront ? 0.045 : 0.04, 0.04, 0.055);
        const claw = mesh(talon(isFront ? 0.1 : 0.08, 0.028), clawMat, false);
        claw.position.set(0, 0.0, 0.03);
        claw.rotation.x = -0.2;
        t.add(knuckle, claw);
        foot.add(t);
      });
      const spur = mesh(shard(0.045, 0.15, sd), basalt, false);
      spur.position.set(0, 0.01, -0.05);
      spur.rotation.x = -2.3;
      foot.add(spur);
      return { hip, knee, ankle, foot, s, chain, nodes: chainNodes(chain), loft };
    };
    const frontLegs = [-1, 1].map(s => {
      const L = makeLeg(
        s,
        front,
        [
          [0.4, 0.8, 0.98],
          [0.66, 0.6, 1.02],
          [0.72, 0.38, 1.02],
          [0.74, 0.24, 1.06]
        ],
        [0.2, 0.18, 0.15, 0.12, 0.11, 0.09, 0.08],
        30 + s
      );
      return L;
    });
    const backLegs = [-1, 1].map(s =>
      makeLeg(
        s,
        body,
        [
          [0.38, 0.76, -0.56],
          [0.66, 0.56, -0.46],
          [0.72, 0.32, -0.6],
          [0.74, 0.16, -0.52]
        ],
        [0.24, 0.22, 0.19, 0.13, 0.11, 0.09, 0.08],
        50 + s
      )
    );
    const legs = frontLegs.concat(backLegs);

    const head = anchor(front, 0, 1.12, 1.86);
    head.scale.setScalar(1.18);
    const headLoft = makeLoft(9, 5, 20, headRock, {
      sym: true,
      crack: () => 0,
      seed: 11,
      rough: 0.05,
      uSpan: 1.6,
      ref: V3(1, 0, 0),
      shape: (c, s, u) => [c * (1 + 0.08 * Math.pow(Math.abs(c), 4)), s > 0 ? s * (1 + 0.1 * Math.pow(s, 10) * (u < 0.5 ? 1 : 0)) : s * 0.5]
    });
    headLoft.update(
      [
        [-0.34, 0.05, 0.02, 0.02],
        [-0.3, 0.05, 0.14, 0.13],
        [-0.18, 0.06, 0.3, 0.27],
        [0.0, 0.06, 0.36, 0.3],
        [0.18, 0.03, 0.31, 0.24],
        [0.38, -0.01, 0.24, 0.18],
        [0.56, -0.03, 0.19, 0.14],
        [0.69, -0.04, 0.12, 0.095],
        [0.735, -0.05, 0.02, 0.02]
      ].map(([z, y, rx, ry]) => ({ p: V3(0, y, z), rx, ry }))
    );
    head.add(headLoft.mesh);

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.1, -0.12);
    head.add(jaw);
    const jawLoft = makeLoft(6, 5, 16, headRock, {
      sym: true,
      seed: 13,
      rough: 0.04,
      uSpan: 1.2,
      shape: (c, s) => [c, s > 0 ? s * 0.15 : s]
    });
    jawLoft.update(
      [
        [0.3, 0.06, 0.02, 0.02],
        [0.36, 0.045, 0.2, 0.15],
        [0.5, 0.028, 0.21, 0.17],
        [0.68, 0.021, 0.16, 0.13],
        [0.8, 0.024, 0.09, 0.09],
        [0.85, 0.03, 0.02, 0.02]
      ].map(([z, y, rx, ry]) => ({ p: V3(0, y, z), rx, ry }))
    );
    jaw.add(jawLoft.mesh);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), gumMat);
    inner.material = new THREE.MeshStandardMaterial({ color: 0x5a1612, roughness: 0.6 });
    inner.scale.set(0.22, 0.075, 0.4);
    inner.position.set(0, -0.1, 0.3);
    const tongue = mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: 0xc8605a, roughness: 0.5 }), false);
    tongue.scale.set(0.11, 0.035, 0.22);
    tongue.position.set(0, 0.06, 0.32);
    jaw.add(tongue);
    head.add(inner);
    const throat = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), lavaMat);
    throat.scale.set(0.45, 0.25, 0.4);
    throat.position.set(0, -0.09, 0.02);
    head.add(throat);
    const lips = [];
    const lipMat = new THREE.MeshBasicMaterial({ color: 0x1e120c });
    const lipPts = s => [V3(0.27 * s, -0.02, -0.12), V3(0.3 * s, -0.035, 0.05), V3(0.26 * s, -0.05, 0.22), V3(0.2 * s, -0.06, 0.4), V3(0.16 * s, -0.065, 0.56), V3(0.09 * s, -0.065, 0.68), V3(0, -0.065, 0.735)];
    [-1, 1].forEach(s => {
      const lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lipPts(s).slice(3)), 24, 0.012, 5, false), lavaMat);
      head.add(lip);
      lips.push(lip);
      lipPts(s)
        .slice(1, 5)
        .forEach((pt, k) => {
          [0].filter(() => k === 3).forEach(h => {
            const nxt = lipPts(s)[k + 2];
            const tp = pt.clone().lerp(nxt, h);
            const tooth = mesh(new THREE.ConeGeometry(0.018 + (k === 3 && !h ? 0.006 : 0), 0.055 + (k === 3 && !h ? 0.03 : 0), 5), toothMat, false);
            tooth.rotation.x = Math.PI;
            tooth.position.set(tp.x * 1.05, tp.y - 0.022, tp.z);
            head.add(tooth);
          });
        });
      [].forEach((z, k) => {
        const lt = mesh(new THREE.ConeGeometry(0.016, 0.05, 5), toothMat, false);
        lt.position.set((0.21 - k * 0.05) * s, 0.06, z + 0.12);
        jaw.add(lt);
      });
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), lavaMat);
      n.scale.set(1.3, 0.45, 0.8);
      n.position.set(0.07 * s, 0.05, 0.67);
      n.rotation.y = 0.4 * s;
      head.add(n);
      const cheek = mesh(shard(0.03, 0.1, 55 + s), basalt, false);
      cheek.position.set(0.28 * s, -0.08, -0.08);
      cheek.rotation.set(-1.9, 0, -0.8 * s);
      head.add(cheek);
      const cheek2 = mesh(shard(0.025, 0.07, 57 + s), basalt, false);
      cheek2.position.set(0.25 * s, -0.16, 0.02);
      cheek2.rotation.set(-2.1, 0, -1.1 * s);
      head.add(cheek2);
    });

    const eyes = [-1, 1].map(s => {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), gumMat);
      socket.scale.set(1, 0.75, 0.5);
      socket.position.set(0.24 * s, 0.13, 0.2);
      socket.rotation.y = 0.6 * s;
      socket.visible = false;
      head.add(socket);
      const e = eye({ size: 0.62, whiteColor: 0xfff1cc, pupilColor: 0x2a0a02 });
      e.g.position.set(0.25 * s, 0.13, 0.22);
      e.g.rotation.y = 0.6 * s;
      head.add(e.g);
      return e;
    });
    const browMat = new THREE.MeshStandardMaterial({ color: 0x2c2422, roughness: 0.85 });
    const brows = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.24 * s, 0.25, 0.22);
      g.scale.setScalar(0.8);
      const curve = new THREE.CatmullRomCurve3([V3(-0.13 * s, 0.035, 0.12), V3(-0.04 * s, 0.03, 0.06), V3(0.03 * s, 0.01, -0.02), V3(0.06 * s, -0.03, -0.1)]);
      const seg = 20;
      const geo = new THREE.TubeGeometry(curve, seg, 1, 10, false);
      const p = geo.attributes.position;
      const tmpC = V3(0, 0, 0);
      for (let i = 0; i <= seg; i++) {
        const u = i / seg;
        curve.getPointAt(u, tmpC);
        const r = 0.012 + 0.032 * Math.sin(Math.PI * Math.pow(u, 0.7));
        for (let j = 0; j <= 10; j++) {
          const k = i * 11 + j;
          p.setXYZ(k, tmpC.x + (p.getX(k) - tmpC.x) * r, tmpC.y + (p.getY(k) - tmpC.y) * r * 0.75, tmpC.z + (p.getZ(k) - tmpC.z) * r);
        }
      }
      geo.computeVertexNormals();
      g.add(mesh(geo, browMat, false));
      head.add(g);
      return g;
    });

    const hornSet = [];
    [-1, 1].forEach(s => {
      const g = new THREE.Group();
      g.position.set(0.2 * s, 0.24, -0.1);
      g.rotation.set(-0.55, 0.25 * s, -0.42 * s);
      g.scale.setScalar(0.4);
      let y = 0;
      [0.13, 0.105, 0.08, 0.055].forEach((r, i) => {
        const chunk = mesh(rocky(new THREE.CylinderGeometry(r * 0.85, r, r * 1.9, 6, 2), 0.012, 60 + i + s * 7), i === 3 ? basalt : hornRock);
        chunk.position.y = y + r * 0.95;
        chunk.rotation.y = i * 0.7;
        chunk.rotation.z = i * 0.08 * s;
        g.add(chunk);
        if (i < 3) {
          const seam = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, 0.014, 6), basalt);
          seam.position.y = y + r * 1.9;
          seam.rotation.y = i * 0.7;
          g.add(seam);
        }
        y += r * 1.8;
      });
      const tip = mesh(new THREE.ConeGeometry(0.05, 0.14, 5), basalt, false);
      tip.position.y = y + 0.06;
      g.add(tip);
      head.add(g);
      hornSet.push(g);
      const side = new THREE.Group();
      side.position.set(0.31 * s, 0.04, -0.14);
      side.visible = false;
      side.rotation.set(-1.2, 0, -1.1 * s);
      let y2 = 0;
      [0.07, 0.05].forEach((r, i) => {
        const c = mesh(rocky(new THREE.CylinderGeometry(r * 0.8, r, r * 1.8, 6, 1), 0.01, 70 + i + s), hornRock, false);
        c.position.y = y2 + r * 0.9;
        side.add(c);
        y2 += r * 1.7;
      });
      head.add(side);
    });
    for (let i = 0; i < 2; i++) {
      const sp = mesh(shard(0.04 - i * 0.008, 0.1 - i * 0.02, 80 + i), basalt, false);
      sp.position.set(0, 0.32 - i * 0.04, -0.12 - i * 0.12);
      sp.rotation.x = -0.75 - i * 0.25;
      head.add(sp);
    }

    const fx = new THREE.Group();
    root.add(fx);
    const smokeMat = new THREE.MeshBasicMaterial({ color: 0x4a403c, transparent: true, opacity: 0.4, depthWrite: false });
    const smoke = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), smokeMat.clone());
      fx.add(m);
      smoke.push({ m, ph: (i * 0.29) % 1, a: i * 2.3 });
    }
    const bombs = [];
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), i % 3 ? lavaMat : hotMat);
      m.visible = false;
      fx.add(m);
      bombs.push({ m, a: (i / 12) * Math.PI * 2, v: 0.6 + (i % 4) * 0.25, up: 2.6 + (i % 3) * 0.7, d: (i % 4) * 0.08, size: 0.04 + (i % 3) * 0.02 });
    }
    const sparkMats = [0xffe07a, 0xffa030, 0xff5a14].map(c => new THREE.MeshBasicMaterial({ color: c }));
    const sparks = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), sparkMats[i % 3]);
      m.visible = false;
      fx.add(m);
      sparks.push({ m, a: (i / 26) * Math.PI * 2 + (i % 3) * 0.3, v: 1.6 + (i % 5) * 0.45, up: 2.4 + (i % 4) * 0.7, size: 0.035 + (i % 3) * 0.015 });
    }
    const shock = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.62, 48),
      new THREE.MeshBasicMaterial({ color: 0xff7a1e, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    );
    shock.rotation.x = -Math.PI / 2;
    shock.position.y = 0.03;
    fx.add(shock);
    const breath = [];
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshBasicMaterial({ color: [0xffe07a, 0xffa030, 0xff5a14][i % 3], transparent: true, opacity: 0.9, depthWrite: false })
      );
      m.visible = false;
      fx.add(m);
      breath.push({ m, ph: i / 22, a: i * 2.39, r: (i % 5) * 0.05 });
    }

    const glow = new THREE.PointLight(0xff6a1a, 0.6, 6);
    glow.position.set(0, 1.9, 2.4);
    body.add(glow);
    const ventGlow = new THREE.PointLight(0xff7a2a, 0.6, 3);
    ventGlow.position.set(0, 1.2, 0);
    volcano.add(ventGlow);

    const food = berry();
    food.visible = false;
    root.add(food);

    const tmp = V3(0, 0, 0);
    const mouthW = V3(0, 0, 0);
    const tipW = V3(0, 0, 0);
    const hitPos = V3(0, 0, 0);
    const craterW = V3(0, 0, 0);

    const rebuild = () => {
      body.updateMatrixWorld(true);
      bodyInv.copy(body.matrixWorld).invert();
      readChain(bodyChain, bodyN);
      bodyLoft.update(bodyN);
      readChain(bellyChain, bellyN);
      bellyLoft.update(bellyN);
      placeDorsal();
      legs.forEach(L => {
        readChain(L.chain, L.nodes);
        L.loft.update(L.nodes);
      });
    };

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const a = action ? action.name : null;
        const p = action ? action.p : 0;
        const ph = a === "eat" ? eatPhase(p) : null;
        const heat = s.dying ? 0.25 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        const breathe = Math.sin(t * 1.4) * motion;
        let rear = breathe * 0.01;
        let headPitch = -0.04;
        let jawOpen = 0;
        let tailLift = 0;
        let impact = -1;
        let shake = 0;
        let roarK = -1;
        let erupt = 0;
        let stompSide = 0;
        let crouch = 0;
        let squint = false;

        let wagK = 0;
        let hop = 0;
        if (a === "wag") {
          wagK = Math.sin(p * Math.PI);
          squint = true;
        }
        if (a === "puff") {
          const k = smooth(0.1, 0.3, p) * (1 - smooth(0.85, 1, p));
          const pre = smooth(0, 0.3, p) * (1 - smooth(0.3, 0.38, p));
          headPitch = -0.04 + pre * 0.25 - k * 0.2;
          rear = -pre * 0.03 + k * 0.08;
          jawOpen = k * 0.22;
          roarK = p > 0.38 && p < 0.8 ? (p - 0.38) / 0.42 : -1;
          erupt = pre * 0.4;
          squint = pre > 0.3;
        }
        if (a === "jump") {
          if (p < 0.18) crouch = 0.08 * Math.sin((p / 0.18) * Math.PI / 2);
          else if (p < 0.78) hop = Math.sin(((p - 0.18) / 0.6) * Math.PI) * 0.8;
          else crouch = 0.08 * Math.sin(((p - 0.78) / 0.22) * Math.PI);
        }
        if (a === "eat") {
          headPitch = -0.04 + (1 - ph.fall) * -0.25 + ph.chew * 0.1;
          jawOpen = p > 0.12 && p < 0.85 ? (p < 0.3 ? 0.35 : 0.06 + ph.chew * 0.3) : 0;
          squint = p > 0.3;
        }

        const sh = reduceMotion ? 0 : shake;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.position.set(Math.sin(t * 61) * 0.025 * sh, -crouch + hop, 0);
        body.rotation.z = wagK * Math.sin(t * 14) * 0.04;
        front.rotation.x = FT - rear;
        front.rotation.z = Math.sin(t * 0.9) * 0.012 * motion;
        head.rotation.x = headPitch + Math.sin(t * 1.4 + 1) * 0.02 * motion;
        head.rotation.y = pointer.x * 0.06;
        jaw.rotation.x = jawOpen;
        throat.visible = jawOpen > 0.12;
        inner.visible = jawOpen > 0.03;
        lips.forEach(l => (l.visible = jawOpen < 0.03));

        frontLegs.forEach(({ hip, knee, ankle, foot, s: sd }) => {
          let lift = 0;
          if (hop > 0.05) lift = 0.5;
          const rearK = Math.max(0, rear) * 3;
          hip.rotation.x = -FT - lift * 0.9 - rearK * 0.5 + rear;
          knee.rotation.x = lift * 1.3 + rearK * 0.9;
          ankle.rotation.x = -lift * 0.3;
          foot.rotation.x = -lift * 0.3 + rearK * 0.3;
        });
        backLegs.forEach(({ hip, knee, ankle, foot }) => {
          hip.rotation.x = crouch * 1.5 + (hop > 0.05 ? 0.5 : 0);
          knee.rotation.x = -crouch * 2.5;
          ankle.rotation.x = crouch;
          foot.rotation.x = 0;
        });

        tail.forEach((g, i) => {
          if (i === 0) {
            g.parent.rotation.x = -1.72 + tailLift * 0.55;
            return;
          }
          const u = i / tail.length;
          g.rotation.x = 0.08 + 0.04 * u + tailLift * 0.12 * (1 - u);
          g.rotation.z = Math.sin(t * (1.3 + wagK * 10) - i * 0.45) * (0.07 + wagK * 0.3) * u * motion;
        });
        tail.flame.scale.set(heat * (1 + 0.12 * Math.sin(t * 11)), heat * (1 + 0.15 * Math.sin(t * 9) + wagK * 0.3), heat);

        rebuild();

        const surge = (impact >= 0 && a === "wag" ? Math.max(0, 1 - impact * 2) * 1.2 : 0) + erupt * 1.4;
        const lavaK = (0.42 + Math.sin(t * 1.4) * 0.1 * motion + surge * 0.6) * heat;
        rockMats.forEach(m => (m.emissiveIntensity = 0));
        coneRock.emissiveIntensity = 0.12 + erupt * 0.8;
        bellyMat.emissiveIntensity = 0;
        const flow = 0.75 + Math.sin(t * 2.2) * 0.15 * motion + erupt * 0.4;
        lavaMat.color.setRGB(1, 0.32 + flow * 0.12, 0.06);
        hotMat.color.setRGB(1, 0.72 + erupt * 0.2, 0.25 + erupt * 0.3);
        crater.scale.setScalar(1 + Math.sin(t * 2.5) * 0.05 * motion + erupt * 0.15);
        bubbles.forEach(({ b, a: ba, r, ph: bp }) => {
          const q = (((t * (0.7 + erupt * 2) + bp) % 1) + 1) % 1;
          b.position.set(Math.cos(ba + t * 0.3) * r, 0.8 + Math.sin(q * Math.PI) * (0.05 + erupt * 0.15), Math.sin(ba + t * 0.3) * r);
          b.scale.setScalar(reduceMotion ? 0.5 : 0.4 + Math.sin(q * Math.PI) * 0.8);
        });
        glow.intensity = (0.4 + lavaK * 0.4 + surge * 1.0) * heat;
        ventGlow.intensity = 0;

        root.updateMatrixWorld(true);

        volcano.localToWorld(craterW.set(0, 0.86, 0));
        fx.worldToLocal(craterW);
        smoke.forEach(sm => {
          const sp = 0.2 + erupt * 0.5;
          const u = (((t * sp + sm.ph) % 1) + 1) % 1;
          sm.m.visible = false;
          sm.m.position.set(craterW.x + Math.sin(sm.a + t * 0.5) * u * 0.25, craterW.y + u * (1.1 + erupt * 0.8), craterW.z - u * 0.3 + Math.cos(sm.a) * u * 0.1);
          sm.m.scale.setScalar(0.06 + u * (0.22 + erupt * 0.2));
          sm.m.material.opacity = Math.sin(u * Math.PI) * (0.4 + erupt * 0.2) * heat;
          sm.m.material.color.setHex(erupt > 0.3 && u < 0.25 ? 0xff7a2a : 0x4a403c);
        });
        bombs.forEach(bm => {
          const q = -1;
          bm.m.visible = q > 0 && q < 1 && !reduceMotion;
          if (!bm.m.visible) return;
          const tt = q * 1.1;
          bm.m.position.set(craterW.x + Math.cos(bm.a) * bm.v * tt, Math.max(0.04, craterW.y + bm.up * tt - 4.2 * tt * tt), craterW.z + Math.sin(bm.a) * bm.v * tt - tt * 0.3);
          bm.m.rotation.set(t * 5 + bm.a, t * 4, 0);
          bm.m.scale.setScalar(bm.size * (1 - q * 0.4));
        });

        tail.tip.getWorldPosition(tipW);
        fx.worldToLocal(tipW);
        if (a === "wag") hitPos.set(tipW.x, 0.05, tipW.z);
        else if (a === "jump")
          frontLegs.forEach(({ foot, s: sd }) => {
            if (sd !== stompSide) return;
            foot.getWorldPosition(hitPos);
            fx.worldToLocal(hitPos);
            hitPos.y = 0.05;
          });
        const showSparks = impact >= 0 && !reduceMotion;
        sparks.forEach((spk, i) => {
          const q = a === "wag" ? impact * 1.1 : impact * 0.8;
          spk.m.visible = showSparks && q < 1 && (a === "wag" || i % 2 === 0);
          if (!spk.m.visible) return;
          const tt = q * 0.9;
          const v = spk.v * (a === "wag" ? 1 : 0.5);
          spk.m.position.set(hitPos.x + Math.cos(spk.a) * v * tt, Math.max(0.02, hitPos.y + spk.up * tt - 4.5 * tt * tt * (a === "wag" ? 1 : 1.6)), hitPos.z + Math.sin(spk.a) * v * tt);
          spk.m.rotation.set(t * 8 + i, t * 6, 0);
          spk.m.scale.setScalar(spk.size * (1 - q * 0.7));
        });
        if (impact >= 0 && !reduceMotion) {
          const q = Math.min(1, impact * (a === "wag" ? 1.6 : 2.5));
          shock.position.set(hitPos.x, 0.03, hitPos.z);
          shock.scale.setScalar(0.3 + q * (a === "wag" ? 3 : 1.4));
          shock.material.opacity = (1 - q) * 0.6;
        } else shock.material.opacity = 0;

        head.localToWorld(mouthW.set(0, -0.07, 0.74));
        fx.worldToLocal(mouthW);
        head.localToWorld(tmp.set(0, -0.25, 1.7));
        fx.worldToLocal(tmp);
        const dir = tmp.sub(mouthW).normalize();
        breath.forEach(b => {
          if (roarK < 0 || reduceMotion) {
            b.m.visible = false;
            return;
          }
          const q = (((roarK * 3 + b.ph) % 1) + 1) % 1;
          b.m.visible = roarK < 0.9 || q < (1 - roarK) * 10;
          const d = q * 0.7;
          b.m.position.set(mouthW.x + dir.x * d + Math.cos(b.a) * b.r * q * 2, mouthW.y + dir.y * d + Math.sin(b.a) * b.r * q * 1.5 + q * q * 0.3, mouthW.z + dir.z * d);
          b.m.scale.setScalar(0.03 + q * 0.1);
          b.m.material.color.setHex(q < 0.35 ? [0xffe07a, 0xffa030, 0xff5a14][b.ph * 22 % 3 | 0] : 0x6a5a54);
          b.m.material.opacity = (q < 0.35 ? 0.9 : 0.5) * (1 - q * 0.8);
        });

        if (a === "eat") {
          food.visible = ph.visible;
          head.localToWorld(tmp.set(0, -0.1, 0.8));
          root.worldToLocal(tmp);
          food.position.set(tmp.x, lerp(4.2, tmp.y, ph.fall * ph.fall), tmp.z);
          food.scale.setScalar(1 - 0.85 * ph.bite);
        } else food.visible = false;

        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.45 : blink;
        });
        followPupils(eyes, pointer, 0.5);
        brows.forEach((b, i) => (b.rotation.z = (a === "puff" ? 0.18 * (i ? -1 : 1) * Math.max(0, roarK) : 0) + (squint ? 0.1 * (i ? 1 : -1) : 0)));
        hornSet.forEach((g, i) => (g.rotation.y = (i ? 0.25 : -0.25) + Math.sin(t * 0.7) * 0.01 * motion));
        tmpA.set(0, 0, 0);
      }
    };
  }
});
