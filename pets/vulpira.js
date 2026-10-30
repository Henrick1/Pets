Pets.register({
  id: "vulpira",
  dex: 17,
  name: "Vulpira",
  color: "#e8462a",
  types: ["fire", "ghost"],
  description: "Quando o Trichama cresce, o fogo do seu corpo fica tão quente que vira azul. Deixou de andar em duas patas e corre pela floresta como um raio. Anda sempre acompanhado de três chamas-fantasma que obedecem só a ele, e dizem que quem segue essas luzes à noite se perde na floresta até o amanhecer.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    flare: { duration: 2.6 },
    attack: { duration: 1.1 }
  },
  battle: { special: { action: "flare", hit: 0.45, speed: 1.4 } },
  idle: [
    { action: "flare", min: 25, max: 50 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["flare", "jump", "jump"][(n - 1) % 3],

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

    const flameGeo = (h, w, bend, c0, c1, c2) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        const r = w * Math.sin(Math.PI * Math.pow(u, 0.55)) * (1 - 0.35 * u);
        pts.push(new THREE.Vector2(Math.max(r, 0.0001), u * h));
      }
      const g = new THREE.LatheGeometry(pts, 14);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const ca = hexParts(c0);
      const cb = hexParts(c1);
      const cc = hexParts(c2);
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getY(i) / h;
        pos.setX(i, pos.getX(i) + bend * h * u * u);
        for (let q = 0; q < 3; q++) col[i * 3 + q] = u < 0.45 ? lerp(ca[q], cb[q], u / 0.45) : lerp(cb[q], cc[q], (u - 0.45) / 0.55);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };

    const tailProfile = f => (f >= 1 ? 0 : Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * f)), 0.55));
    const tailJag = (f, a) => 0.14 * Math.sin(Math.PI * Math.min(1, f * 1.15)) * Math.pow(Math.abs(Math.sin(a * 3 + f * 7)), 3);
    const tailTube = (rings, rad, r0, colorAt) => {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(rings * (rad + 1) * 3);
      const col = new Float32Array(rings * (rad + 1) * 3);
      const idx = [];
      for (let i = 0; i < rings - 1; i++)
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      for (let i = 0; i < rings; i++) {
        const c = hexParts(colorAt(i / (rings - 1)));
        for (let j = 0; j <= rad; j++) col.set(c, (i * (rad + 1) + j) * 3);
      }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.setIndex(idx);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)], false, "centripetal");
      const p = new THREE.Vector3();
      const tg = new THREE.Vector3();
      const side = new THREE.Vector3();
      const up = new THREE.Vector3();
      const ref = new THREE.Vector3(1, 0, 0);
      const update = pts => {
        curve.points = pts;
        for (let i = 0; i < rings; i++) {
          const f = i / (rings - 1);
          curve.getPoint(f, p);
          curve.getTangent(f, tg);
          const r = r0 * tailProfile(f);
          side.crossVectors(tg, ref);
          if (side.lengthSq() < 1e-6) side.set(0, 0, 1);
          side.normalize();
          up.crossVectors(side, tg).normalize();
          for (let j = 0; j <= rad; j++) {
            const a = (j / rad) * Math.PI * 2;
            const o = (i * (rad + 1) + j) * 3;
            const rr = r * (1 + tailJag(f, a));
            const ca = Math.cos(a) * rr;
            const sa = Math.sin(a) * rr;
            pos[o] = p.x + side.x * ca + up.x * sa;
            pos[o + 1] = p.y + side.y * ca + up.y * sa;
            pos[o + 2] = p.z + side.z * ca + up.z * sa;
          }
        }
        geo.attributes.position.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
      };
      return { geo, update };
    };
    const chainM = new THREE.Matrix4();
    const chainPoints = (rootSeg, segs, tipLen, out) => {
      rootSeg.updateMatrix();
      chainM.copy(rootSeg.matrix);
      segs.forEach((g, i) => {
        g.updateMatrix();
        chainM.multiply(g.matrix);
        out[i].setFromMatrixPosition(chainM);
      });
      out[segs.length].set(0, tipLen, 0).applyMatrix4(chainM);
      return out;
    };

    const flames = [];
    const TONGUES = [
      { x: 0, z: 0, h: 1, w: 1, rz: 0, b: 1 },
      { x: -0.5, z: 0.1, h: 0.62, w: 0.6, rz: 0.42, b: -1 },
      { x: 0.5, z: 0.05, h: 0.56, w: 0.56, rz: -0.45, b: 1 },
      { x: 0.1, z: -0.4, h: 0.74, w: 0.62, rz: -0.12, b: 0.6 }
    ];
    const flame = (h, w, bend, outer, inner, phase) => {
      const g = new THREE.Group();
      const base = hexMix(inner, outer, 0.3);
      const deep = hexMix(outer, 0x000000, 0.3);
      const hot = hexMix(inner, 0xffffff, 0.55);
      const oMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false });
      const iMat = new THREE.MeshBasicMaterial({ vertexColors: true });
      const tongues = TONGUES.map((T, j) => {
        const q = new THREE.Group();
        q.position.set(T.x * w, 0, T.z * w);
        q.rotation.z = T.rz;
        q.rz = T.rz;
        q.add(new THREE.Mesh(flameGeo(h * T.h, w * T.w, bend * T.b + (j ? 0.25 * T.b : 0), base, outer, deep), oMat));
        const inn = new THREE.Mesh(flameGeo(h * T.h * 0.62, w * T.w * 0.55, bend * T.b * 0.7, hot, inner, outer), iMat);
        inn.position.z = 0.002;
        q.add(inn);
        g.add(q);
        return q;
      });
      const tick = t =>
        tongues.forEach((q, j) => {
          q.scale.y = 1 + 0.18 * Math.sin(t * (9 + j * 2.3) + phase * 3 + j * 1.9);
          q.rotation.z = q.rz + Math.sin(t * (5 + j) + phase + j) * 0.1;
        });
      const f = { g, phase, base: 1, kx: 1, tick };
      flames.push(f);
      return f;
    };

    const furMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.65 });
    const orangeMat = mat(0xe8501e, 0.65);
    const deepMat = mat(0xb8341a, 0.65);
    const creamMat = mat(0xffdcae, 0.8);
    const fluffMat = mat(0xffe8c4, 0.85);
    const darkMat = mat(0x2a0c0e, 0.55);
    const mouthMat = mat(0x3a0a12, 0.5);
    const glowMat = new THREE.MeshStandardMaterial({ color: 0xffc23a, roughness: 0.3, emissive: 0xff8a1a, emissiveIntensity: 0.9 });
    const ghostMat = new THREE.MeshStandardMaterial({ color: 0xc8b8ff, roughness: 0.3, emissive: 0x7a5cff, emissiveIntensity: 0.9 });
    const GO = 0x7a5cff;
    const GI = 0xeae4ff;

    const body = new THREE.Group();
    squash.add(body);

    const table = rows => f => {
      let i = 0;
      while (i < rows.length - 2 && f > rows[i + 1][0]) i++;
      const a = rows[i];
      const b = rows[i + 1];
      const k = Math.max(0, Math.min(1, (f - a[0]) / (b[0] - a[0])));
      const e = k * k * (3 - 2 * k);
      return [lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
    };
    const solid = (pts, radius, colorAt, rings = 36, rad = 22, ref = new THREE.Vector3(1, 0, 0)) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(q => new THREE.Vector3(q[0], q[1], q[2])), false, "centripetal");
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(rings * (rad + 1) * 3);
      const col = new Float32Array(rings * (rad + 1) * 3);
      const idx = [];
      const p = new THREE.Vector3();
      const tg = new THREE.Vector3();
      const side = new THREE.Vector3();
      const up = new THREE.Vector3();
      for (let i = 0; i < rings; i++) {
        const f = i / (rings - 1);
        curve.getPoint(f, p);
        curve.getTangent(f, tg);
        side.crossVectors(tg, ref).normalize();
        up.crossVectors(side, tg).normalize();
        const [rv, rl] = radius(f);
        for (let j = 0; j <= rad; j++) {
          const a = (j / rad) * Math.PI * 2;
          const o = (i * (rad + 1) + j) * 3;
          pos[o] = p.x + side.x * Math.cos(a) * rv + up.x * Math.sin(a) * rl;
          pos[o + 1] = p.y + side.y * Math.cos(a) * rv + up.y * Math.sin(a) * rl;
          pos[o + 2] = p.z + side.z * Math.cos(a) * rv + up.z * Math.sin(a) * rl;
          col.set(hexParts(colorAt(f, Math.cos(a))), o);
        }
      }
      for (let i = 0; i < rings - 1; i++)
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return mesh(geo, furMat);
    };
    const ORANGE = 0xf2621f;
    const DEEP = 0xb8301a;
    const CREAM = 0xffe0b4;
    const SOCK = 0x2a0c0e;
    const coat = (f, c) => {
      const top = Math.max(0, Math.min(1, (c - 0.45) / 0.5));
      return hexMix(ORANGE, DEEP, top * 0.7);
    };

    const torso = solid(
      [[0, 1.3, -0.98], [0, 1.28, -0.72], [0, 1.2, -0.32], [0, 1.2, 0.06], [0, 1.3, 0.42], [0, 1.5, 0.68]],
      table([[0, 0.05, 0.05], [0.08, 0.27, 0.25], [0.3, 0.35, 0.3], [0.55, 0.3, 0.26], [0.8, 0.42, 0.34], [1, 0.3, 0.26]]),
      (f, c) => {
        const belly = Math.max(0, Math.min(1, (-c - 0.35) / 0.3)) * Math.max(0, Math.min(1, (f - 0.25) / 0.15));
        return hexMix(coat(f, c), CREAM, belly);
      },
      44,
      26
    );
    body.add(torso);
    [-2, -1, 0, 1, 2].forEach(k => {
      const c = mesh(new THREE.ConeGeometry(0.075 - Math.abs(k) * 0.008, 0.34 - Math.abs(k) * 0.05, 10), fluffMat, false);
      c.position.set(k * 0.1, 1.0 + Math.abs(k) * 0.04, 0.6 - Math.abs(k) * 0.06);
      c.rotation.set(Math.PI - 0.45, 0, k * 0.22);
      body.add(c);
    });
    [-1, 1].forEach(s => {
      [0, 1].forEach(k => {
        const tf = mesh(new THREE.ConeGeometry(0.06, 0.24 - k * 0.05, 10), deepMat, false);
        tf.position.set(0.3 * s, 1.18 - k * 0.12, -0.72 + k * 0.06);
        tf.rotation.set(0.6, 0, -1.9 * s);
        body.add(tf);
      });
    });

    const legs = [
      { x: 0.22, z: 0.46, front: true },
      { x: -0.22, z: 0.46, front: true },
      { x: 0.24, z: -0.66, front: false },
      { x: -0.24, z: -0.66, front: false }
    ].map(L => {
      const s = Math.sign(L.x);
      const pivot = new THREE.Group();
      pivot.position.set(L.x, 1.08, L.z);
      const upper = L.front
        ? solid([[0, 0.16, -0.02], [0, -0.06, 0.02], [0, -0.3, 0.01], [0, -0.48, 0]], table([[0, 0.17, 0.15], [0.35, 0.16, 0.14], [0.75, 0.1, 0.095], [1, 0.09, 0.085]]), f => hexMix(ORANGE, SOCK, Math.max(0, Math.min(1, (f - 0.6) / 0.3))), 22, 18)
        : solid([[0, 0.2, -0.04], [0, -0.02, 0.06], [0, -0.3, -0.04], [0, -0.48, -0.06]], table([[0, 0.24, 0.2], [0.35, 0.22, 0.17], [0.75, 0.1, 0.095], [1, 0.09, 0.085]]), f => hexMix(ORANGE, SOCK, Math.max(0, Math.min(1, (f - 0.6) / 0.3))), 22, 18);
      const knee = new THREE.Group();
      knee.position.set(0, -0.42, L.front ? 0 : -0.05);
      const lower = solid([[0, 0.08, 0], [0, -0.2, 0.01], [0, -0.5, 0.03]], table([[0, 0.088, 0.083], [0.5, 0.08, 0.075], [1, 0.07, 0.068]]), () => SOCK, 16, 16);
      const paw = mesh(new THREE.SphereGeometry(1, 20, 12), darkMat);
      paw.scale.set(0.12, 0.075, 0.17);
      paw.position.set(0, -0.53, 0.06);
      knee.add(lower, paw);
      [-1, 0, 1].forEach(k => {
        const toe = mesh(new THREE.SphereGeometry(0.042, 10, 8), darkMat, false);
        toe.position.set(0.05 * k, -0.555, 0.19 - Math.abs(k) * 0.02);
        knee.add(toe);
      });
      const tuft = mesh(new THREE.ConeGeometry(0.05, 0.18, 8), fluffMat, false);
      tuft.position.set(0, 0.0, L.front ? -0.08 : 0.08);
      tuft.rotation.x = L.front ? -2.4 : 2.4;
      knee.add(tuft);
      pivot.add(upper, knee);
      body.add(pivot);
      return { pivot, knee, front: L.front, s };
    });

    const neck = new THREE.Group();
    neck.position.set(0, 1.5, 0.6);
    body.add(neck);
    neck.add(
      solid(
        [[0, -0.12, -0.08], [0, 0.18, 0.06], [0, 0.46, 0.2], [0, 0.66, 0.3]],
        table([[0, 0.3, 0.27], [0.4, 0.25, 0.23], [0.8, 0.21, 0.2], [1, 0.19, 0.18]]),
        (f, c) => hexMix(coat(f, c), CREAM, Math.max(0, Math.min(1, (-c - 0.2) / 0.35))),
        24,
        22
      )
    );

    const head = new THREE.Group();
    head.position.set(0, 0.62, 0.3);
    head.scale.setScalar(1.22);
    neck.add(head);
    const skull = mesh(paint(new THREE.SphereGeometry(1, 48, 36), 0xd8461c, 0xff7a30, -0.5, 0.5), furMat);
    skull.scale.set(0.42, 0.36, 0.4);
    head.add(skull);
    head.add(
      solid(
        [[0, -0.02, 0.12], [0, -0.07, 0.38], [0, -0.09, 0.62], [0, -0.07, 0.76]],
        table([[0, 0.2, 0.22], [0.45, 0.13, 0.14], [0.85, 0.075, 0.075], [1, 0.03, 0.03]]),
        (f, c) => hexMix(ORANGE, CREAM, Math.max(0, Math.min(1, (-c - 0.1) / 0.3))),
        24,
        20
      )
    );
    const nose = mesh(new THREE.SphereGeometry(0.055, 16, 12), darkMat, false);
    nose.scale.set(1.2, 0.85, 1);
    nose.position.set(0, -0.05, 0.76);
    head.add(nose);
    const maw = mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat, false);
    maw.scale.set(0.11, 0.06, 0.24);
    maw.position.set(0, -0.17, 0.46);
    maw.visible = false;
    head.add(maw);
    const jaw = new THREE.Group();
    jaw.position.set(0, -0.15, 0.2);
    head.add(jaw);
    const jawMesh = mesh(new THREE.SphereGeometry(1, 24, 16), creamMat, false);
    jawMesh.scale.set(0.13, 0.06, 0.28);
    jawMesh.position.set(0, -0.03, 0.24);
    jaw.add(jawMesh);
    const fangs = [-1, 1].map(s => {
      const fang = mesh(new THREE.ConeGeometry(0.014, 0.05, 8), fluffMat, false);
      fang.rotation.x = Math.PI;
      fang.position.set(0.06 * s, -0.17, 0.6);
      head.add(fang);
      return fang;
    });
    const smile = mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 20, Math.PI), mouthMat, false);
    smile.rotation.set(0.5, 0, Math.PI);
    smile.scale.set(1, 0.6, 1);
    smile.position.set(0, -0.14, 0.7);
    head.add(smile);
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -0.12, 0.82);
    head.add(muzzle);

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.62, whiteColor: 0xfff0c4, pupilColor: 0x3a0f08 });
      e.g.position.set(0.2 * s, 0.07, 0.31);
      e.g.rotation.set(0, 0.42 * s, -0.3 * s);
      head.add(e.g);
      return e;
    });
    [-1, 1].forEach(s => {
      const brow = mesh(new THREE.SphereGeometry(1, 14, 10), glowMat, false);
      brow.scale.set(0.11, 0.025, 0.04);
      brow.position.set(0.22 * s, 0.2, 0.3);
      brow.rotation.set(0, 0.45 * s, -0.45 * s);
      head.add(brow);
      [0, 1].forEach(k => {
        const st = mesh(new THREE.ConeGeometry(0.025, 0.2 - k * 0.05, 8), glowMat, false);
        st.scale.z = 0.4;
        st.position.set((0.3 + k * 0.05) * s, -0.06 - k * 0.07, 0.26 - k * 0.05);
        st.rotation.set(0, 0.6 * s, (1.85 + k * 0.2) * s);
        head.add(st);
      });
      [0, 1, 2].forEach(k => {
        const g = new THREE.Group();
        g.position.set(0.36 * s, -0.12 - k * 0.07, 0.04 - k * 0.04);
        g.rotation.set(0, 0, (1.9 + k * 0.25) * -s);
        const c = mesh(new THREE.ConeGeometry(0.075 - k * 0.012, 0.36 - k * 0.07, 12), k ? creamMat : orangeMat, false);
        c.position.y = 0.16;
        g.add(c);
        head.add(g);
      });
    });
    const gem = mesh(new THREE.OctahedronGeometry(0.06, 0), ghostMat, false);
    gem.scale.set(0.8, 1.6, 0.6);
    gem.position.set(0, 0.2, 0.36);
    head.add(gem);

    const ears = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.22 * s, 0.26, -0.06);
      const outer = mesh(paint(new THREE.ConeGeometry(0.17, 0.66, 20), 0xff6a2a, 0x2a0a10, -0.33, 0.33), furMat);
      outer.scale.z = 0.5;
      outer.position.y = 0.3;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.44, 16), new THREE.MeshBasicMaterial({ color: 0xffb454 }));
      inner.scale.z = 0.3;
      inner.position.set(0, 0.22, 0.06);
      g.add(outer, inner);
      const tip = flame(0.34, 0.06, 0.25, GO, GI, s * 1.7);
      tip.g.position.y = 0.62;
      tip.base = 0.9;
      g.add(tip.g);
      g.rotation.set(-0.2, 0, -0.28 * s);
      head.add(g);
      return { g, side: s };
    });

    const crest = [0, 1, 2, 3].map(k => {
      const f = flame(0.5 - k * 0.06, 0.12, -0.5, 0xff5a14, 0xffcf40, k * 1.3);
      f.g.position.set(0, 0.42 - k * 0.2, -0.12 - k * 0.14);
      f.g.rotation.x = -0.7 - k * 0.15;
      neck.add(f.g);
      f.rx = f.g.rotation.x;
      return f;
    });

    const mane = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const f = flame(0.62, 0.14, 0.1, i % 2 ? 0xff5a14 : 0xff7a1e, i % 2 ? 0xffc23a : 0xffd85a, i * 0.9);
      f.g.position.set(Math.sin(a) * 0.3, 0.06, Math.cos(a) * 0.3);
      f.g.rotation.set(Math.cos(a) * 1.1 + 0.25, 0, -Math.sin(a) * 1.1);
      f.base = 0.9;
      neck.add(f.g);
      mane.push(f);
    }

    const tailMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0xff5a14, emissiveIntensity: 0.12 });
    const tails = [
      { yaw: 0, roll: 0, pitch: -1.45, n: 12, len: 0.22, r0: 0.36, curl: 0.25, ph: 0 },
      { yaw: 0.95, roll: -0.35, pitch: -1.4, n: 11, len: 0.21, r0: 0.31, curl: 0.25, ph: 1.6 },
      { yaw: -0.95, roll: 0.35, pitch: -1.4, n: 11, len: 0.21, r0: 0.31, curl: 0.25, ph: 3.2 }
    ].map(spec => {
      const outer = new THREE.Group();
      outer.position.set(0, 1.32, -0.92);
      outer.rotation.set(0, spec.yaw, spec.roll);
      const rootSeg = new THREE.Group();
      rootSeg.rotation.x = spec.pitch;
      outer.add(rootSeg);
      const segs = [];
      let parent = rootSeg;
      for (let i = 0; i < spec.n; i++) {
        const g = new THREE.Group();
        g.position.y = i === 0 ? 0 : spec.len;
        parent.add(g);
        segs.push(g);
        parent = g;
      }
      const tipFlame = flame(0.62, 0.15, 0.3, GO, GI, spec.ph);
      tipFlame.g.position.y = spec.len * 0.75;
      parent.add(tipFlame.g);
      const tube = tailTube(56, 24, spec.r0, f => (f < 0.5 ? hexMix(0xc8401a, 0xff6a22, f / 0.5) : f < 0.74 ? hexMix(0xff6a22, 0xe8501e, (f - 0.5) / 0.24) : hexMix(0xfff0e0, 0xe4dcff, (f - 0.74) / 0.26)));
      const tm = mesh(tube.geo, tailMat);
      tm.frustumCulled = false;
      outer.add(tm);
      const pts = segs.map(() => new THREE.Vector3()).concat([new THREE.Vector3()]);
      tube.update(chainPoints(rootSeg, segs, spec.len * 0.85, pts));
      body.add(outer);
      return { spec, segs, outer, tipFlame, rootSeg, tube, pts };
    });

    const wispCore = new THREE.MeshBasicMaterial({ color: 0xf2eeff });
    const wispHalo = new THREE.MeshBasicMaterial({ color: 0x8a6cff, transparent: true, opacity: 0.3, depthWrite: false });
    const wisps = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const f = flame(0.55, 0.12, 0.2, GO, GI, i * 2.1);
      f.g.position.y = -0.08;
      const coreBall = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), wispCore);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), wispHalo);
      g.add(f.g, coreBall, halo);
      squash.add(g);
      wisps.push({ g, halo, a: (i / 3) * Math.PI * 2, rad: 1.55, h: 1.6 + i * 0.4, ph: i * 1.7 });
    }

    const emberMat = new THREE.MeshBasicMaterial({ color: 0xa48cff });
    const emberHot = new THREE.MeshBasicMaterial({ color: 0xffc06a });
    const embers = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(1, 0), i % 3 ? emberMat : emberHot);
      squash.add(m);
      embers.push({ m, ph: Math.random(), rad: 0.8 + Math.random() * 0.9, sp: 0.1 + Math.random() * 0.12, size: 0.035 + Math.random() * 0.045, a: Math.random() * Math.PI * 2, w: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8) });
    }

    const ring = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 64), new THREE.MeshBasicMaterial({ color: GO, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);
    const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.86, 64), new THREE.MeshBasicMaterial({ color: 0xff8a2e, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = 0.025;
    root.add(ring2);

    const glow = new THREE.PointLight(0xffa06a, 0.8, 7);
    glow.position.set(0, 2.0, 1.2);
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
          burst = smooth(0.3, 0.46, flare.p) * (1 - smooth(0.62, 1, flare.p));
          charge = smooth(0, 0.3, flare.p) * (1 - smooth(0.3, 0.42, flare.p));
        }

        let y = 0;
        let z = 0;
        let pitch = 0;
        let crouch = 0;
        let airborne = false;
        let gape = 0;
        let squint = false;
        let neckX = -pointer.y * 0.12;
        let legF = 0;
        let legB = 0;
        const breathe = 1 + Math.sin(t * 1.8) * 0.018 * motion;

        if (jump) {
          const p = jump.p;
          if (p < 0.2) crouch = Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 1.1;
            pitch = -Math.cos(q * Math.PI) * 0.22;
            airborne = true;
            legF = -0.9 * Math.sin(q * Math.PI);
            legB = 0.9 * Math.sin(q * Math.PI);
            gape = q > 0.2 && q < 0.7 ? 0.25 : 0;
          } else crouch = Math.sin(((p - 0.8) / 0.2) * Math.PI) * 0.6;
        }
        if (flare) {
          crouch = charge * 0.6;
          neckX = -0.15 - burst * 0.75 + charge * 0.3;
          gape = burst * 0.55;
          squint = charge > 0.3 || burst > 0.3;
          pitch = -burst * 0.12;
        }
        if (eat) {
          neckX = 0.35 + (ph.chew > 0 ? ph.chew * 0.08 : 0);
          food.visible = ph.visible;
          food.position.set(0, lerp(4.0, 1.62, ph.fall * ph.fall), lerp(1.4, 1.62, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          gape = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35) ? 0.2 + ph.chew * 0.2 : 0;
          squint = eat.p > 0.3;
        } else food.visible = false;
        if (atk) {
          crouch = atk.wind;
          y = Math.sin(Math.min(1, atk.lunge * 1.2) * Math.PI) * 0.35;
          z = atk.lunge * 0.8 - atk.wind * 0.25;
          pitch = atk.lunge * 0.18 - atk.wind * 0.12;
          legF = -atk.lunge * 0.9;
          legB = atk.lunge * 0.6;
          neckX = atk.wind * 0.25 + atk.lunge * 0.2;
          gape = atk.wind > 0.4 || atk.lunge > 0.15 ? 0.5 : 0;
          squint = atk.lunge > 0.35;
        }

        root.position.y = y;
        root.position.z = z;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        body.rotation.x = pitch;
        body.position.y = -crouch * 0.18;
        squash.scale.set(1 + crouch * 0.04, (1 - crouch * 0.05) * breathe, 1);

        legs.forEach(L => {
          const swing = L.front ? legF : legB;
          L.pivot.rotation.x = lerp(L.pivot.rotation.x, swing + crouch * (L.front ? 0.35 : -0.45), 0.25);
          L.knee.rotation.x = lerp(L.knee.rotation.x, crouch * (L.front ? -0.5 : 0.7) + (airborne ? (L.front ? 0.9 : -0.9) : 0), 0.25);
          L.pivot.position.y = 1.04 + crouch * 0.1;
        });

        neck.rotation.x = lerp(neck.rotation.x, neckX, 0.15);
        neck.rotation.y = lerp(neck.rotation.y, pointer.x * 0.35, 0.1);
        head.rotation.z = Math.sin(t * 0.8) * 0.04 * motion + (eat ? Math.sin(eat.p * Math.PI * 6) * 0.05 : 0);
        jaw.rotation.x = lerp(jaw.rotation.x, gape, 0.3);
        maw.visible = gape > 0.05;
        fangs.forEach(f => (f.visible = maw.visible));
        smile.visible = !maw.visible;

        ears.forEach(({ g, side }, i) => {
          const flick = Math.max(0, Math.sin(t * 0.7 + i * 2.4) - 0.96) * 18;
          const back = (atk ? atk.wind * 0.4 : 0) + charge * 0.3;
          g.rotation.z = lerp(g.rotation.z, (-0.28 - back * 0.5) * side + flick * side * 0.3, 0.2);
          g.rotation.x = lerp(g.rotation.x, -0.2 - back, 0.2);
        });

        const k = (1 + burst * 0.9 - charge * 0.35) * fire;
        flames.forEach(f => {
          const fl = 1 + 0.13 * Math.sin(t * 9 + f.phase * 3) + 0.07 * Math.sin(t * 17 + f.phase * 5);
          const wide = 1 + 0.08 * Math.sin(t * 7 + f.phase * 2);
          f.g.scale.set(wide * k, Math.max(0.05, fl * k * f.base), wide * k);
          f.tick(t);
        });
        crest.forEach(f => {
          f.g.rotation.x = f.rx + Math.sin(t * 3 + f.phase) * 0.1 * motion;
        });
        mane.forEach(f => {
          f.g.rotation.y = Math.sin(t * 2 + f.phase) * 0.12 * motion;
        });

        const wag = eat ? 2.4 : jump || flare ? 2.0 : 1;
        tails.forEach(({ spec, segs, outer, tipFlame, rootSeg, tube, pts }, ti) => {
          const spread = burst * 0.35;
          outer.rotation.y = spec.yaw * (1 + spread) + Math.sin(t * 1.1 * wag + spec.ph) * 0.12 * motion * (ti ? 1 : 0.6);
          outer.rotation.z = spec.roll * (1 + spread);
          outer.rotation.x = airborne ? 0.25 : atk ? -atk.wind * 0.2 : 0;
          segs.forEach((g, i) => {
            if (i === 0) return;
            const u = i / segs.length;
            const wave = Math.sin(t * 2.0 * wag - i * 0.5 + spec.ph) * (0.04 + u * 0.1) * motion;
            g.rotation.x = (i < 3 ? 0.04 : spec.curl) + wave - burst * 0.05;
            g.rotation.z = Math.sin(t * 1.5 * wag - i * 0.4 + spec.ph) * 0.06 * u * motion;
          });
          tipFlame.base = 1 + burst * 0.5;
          tube.update(chainPoints(rootSeg, segs, spec.len * 0.85, pts));
        });

        wisps.forEach(w => {
          const a = w.a + t * 0.5 * (1 + burst * 2.5) + charge * 2;
          const rad = w.rad * (1 - charge * 0.45 + burst * 0.5);
          w.g.position.set(Math.sin(a) * rad, w.h + Math.sin(t * 1.4 + w.ph) * 0.14 * motion + burst * 0.4, Math.cos(a) * rad);
          w.g.rotation.set(0, 0, Math.sin(t * 2 + w.ph) * 0.15);
          w.g.scale.setScalar((0.75 + fire * 0.25) * (1 + burst * 0.5));
          w.halo.scale.setScalar(1 + Math.sin(t * 4 + w.ph) * 0.12);
        });

        embers.forEach(e => {
          const u = (((t * e.sp * (1 + burst * 2.2) + e.ph) % 1) + 1) % 1;
          const rad = e.rad * (1 + burst * 0.9);
          const a = e.a + t * e.w * 0.5;
          e.m.position.set(Math.sin(a) * rad * (0.6 + u * 0.5), 0.25 + u * 3.3, Math.cos(a) * rad * (0.6 + u * 0.5));
          e.m.rotation.set(t * 2 + e.ph * 6, t * 1.7, 0);
          e.m.scale.setScalar(Math.max(0.001, e.size * Math.sin(Math.PI * u) * (0.4 + fire * 0.6) * (1 + burst * 0.8)));
        });

        const pulse = 1 + Math.sin(t * 3) * 0.06 * motion;
        gem.rotation.y = t * 1.2;
        glowMat.emissiveIntensity = (0.55 + Math.sin(t * 3.2) * 0.2 * motion + burst * 1.2) * (0.5 + fire * 0.5);
        ghostMat.emissiveIntensity = (0.7 + Math.sin(t * 2.6) * 0.2 * motion + burst * 1.2) * (0.5 + fire * 0.5);
        ring.scale.setScalar(pulse + burst * 1.2);
        ring.material.opacity = (0.22 + 0.1 * Math.sin(t * 2.4) + burst * 0.35) * fire;
        ring2.scale.setScalar(1 - Math.sin(t * 2.4) * 0.05 + burst * 0.5);
        ring2.material.opacity = (0.3 + burst * 0.4) * fire;
        glow.intensity = (0.55 + Math.sin(t * 11) * 0.06 + Math.sin(t * 5.3) * 0.06 + burst * 2.2) * fire;

        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.35 : blink;
        });
        followPupils(eyes, pointer, 0.6);
      }
    };
  }
});
