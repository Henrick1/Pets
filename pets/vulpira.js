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

    const tailProfile = f => (f >= 1 ? 0 : Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * f)), 0.55));
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
            const ca = Math.cos(a) * r;
            const sa = Math.sin(a) * r;
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

    const torso = mesh(paint(new THREE.SphereGeometry(1, 48, 32), 0x8a2414, 0xff6a2a, -1, 1), furMat);
    torso.scale.set(0.46, 0.44, 0.72);
    torso.position.set(0, 1.22, -0.06);
    body.add(torso);
    const chest = mesh(paint(new THREE.SphereGeometry(1, 40, 28), 0x9a2a16, 0xff6a2a, -1, 1), furMat);
    chest.scale.set(0.46, 0.54, 0.44);
    chest.position.set(0, 1.34, 0.46);
    body.add(chest);
    const bib = mesh(new THREE.SphereGeometry(1, 32, 24), creamMat, false);
    bib.scale.set(0.3, 0.42, 0.24);
    bib.position.set(0, 1.3, 0.72);
    body.add(bib);
    const belly = mesh(new THREE.SphereGeometry(1, 32, 20), creamMat, false);
    belly.scale.set(0.3, 0.2, 0.62);
    belly.position.set(0, 0.98, 0.0);
    body.add(belly);
    [-2, -1, 0, 1, 2].forEach(k => {
      const c = mesh(new THREE.ConeGeometry(0.07 - Math.abs(k) * 0.008, 0.3 - Math.abs(k) * 0.04, 10), fluffMat, false);
      c.position.set(k * 0.09, 0.98 + Math.abs(k) * 0.03, 0.74 - Math.abs(k) * 0.05);
      c.rotation.set(Math.PI - 0.35, 0, k * 0.2);
      body.add(c);
    });
    [-1, 1].forEach(s => {
      const h = mesh(paint(new THREE.SphereGeometry(1, 32, 24), 0x8a2414, 0xff6a2a, -1, 1), furMat);
      h.scale.set(0.24, 0.36, 0.38);
      h.position.set(0.24 * s, 1.18, -0.52);
      body.add(h);
      const tf = mesh(new THREE.ConeGeometry(0.06, 0.22, 10), deepMat, false);
      tf.position.set(0.46 * s, 1.2, -0.66);
      tf.rotation.set(0.6, 0, -1.8 * s);
      body.add(tf);
    });

    const legs = [
      { x: 0.25, z: 0.5, front: true },
      { x: -0.25, z: 0.5, front: true },
      { x: 0.27, z: -0.55, front: false },
      { x: -0.27, z: -0.55, front: false }
    ].map((L, i) => {
      const s = Math.sign(L.x);
      const pivot = new THREE.Group();
      pivot.position.set(L.x, 1.04, L.z);
      const up = mesh(new THREE.SphereGeometry(1, 20, 14), L.front ? orangeMat : deepMat);
      up.scale.set(0.17, 0.34, 0.2);
      up.position.y = -0.14;
      const knee = new THREE.Group();
      knee.position.y = -0.42;
      const low = mesh(new THREE.SphereGeometry(1, 18, 12), darkMat);
      low.scale.set(0.11, 0.3, 0.115);
      low.position.y = -0.24;
      const paw = mesh(new THREE.SphereGeometry(1, 20, 12), darkMat);
      paw.scale.set(0.13, 0.08, 0.18);
      paw.position.set(0, -0.53, 0.05);
      knee.add(low, paw);
      [-1, 0, 1].forEach(k => {
        const toe = mesh(new THREE.SphereGeometry(0.045, 10, 8), darkMat, false);
        toe.position.set(0.055 * k, -0.55, 0.19 - Math.abs(k) * 0.02);
        knee.add(toe);
      });
      const cuff = mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 20), fluffMat, false);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.02;
      knee.add(cuff);
      if (!L.front) knee.rotation.x = 0.0;
      pivot.add(up, knee);
      body.add(pivot);
      return { pivot, knee, front: L.front, s, i };
    });

    const neck = new THREE.Group();
    neck.position.set(0, 1.5, 0.6);
    body.add(neck);
    const neckMesh = mesh(paint(new THREE.SphereGeometry(1, 32, 24), 0xc83c1a, 0xff7030, -1, 1), furMat);
    neckMesh.scale.set(0.27, 0.4, 0.27);
    neckMesh.position.set(0, 0.24, 0.08);
    neckMesh.rotation.x = 0.35;
    neck.add(neckMesh);
    const neckBib = mesh(new THREE.SphereGeometry(1, 24, 18), creamMat, false);
    neckBib.scale.set(0.2, 0.34, 0.16);
    neckBib.position.set(0, 0.16, 0.24);
    neckBib.rotation.x = 0.35;
    neck.add(neckBib);

    const head = new THREE.Group();
    head.position.set(0, 0.62, 0.3);
    head.scale.setScalar(1.22);
    neck.add(head);
    const skull = mesh(paint(new THREE.SphereGeometry(1, 48, 36), 0xd8461c, 0xff7a30, -0.5, 0.5), furMat);
    skull.scale.set(0.42, 0.36, 0.4);
    head.add(skull);
    const snoutTop = mesh(new THREE.SphereGeometry(1, 32, 22), orangeMat, false);
    snoutTop.scale.set(0.16, 0.12, 0.34);
    snoutTop.position.set(0, -0.06, 0.42);
    snoutTop.rotation.x = 0.12;
    head.add(snoutTop);
    const muzzleCream = mesh(new THREE.SphereGeometry(1, 28, 20), creamMat, false);
    muzzleCream.scale.set(0.15, 0.08, 0.3);
    muzzleCream.position.set(0, -0.13, 0.42);
    head.add(muzzleCream);
    const nose = mesh(new THREE.SphereGeometry(0.055, 16, 12), darkMat, false);
    nose.scale.set(1.2, 0.85, 1);
    nose.position.set(0, -0.05, 0.75);
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
      { yaw: 0, pitch: -1.15, n: 12, len: 0.24, r0: 0.34, curl: 0.13, ph: 0 },
      { yaw: 0.62, pitch: -1.3, n: 11, len: 0.23, r0: 0.29, curl: 0.14, ph: 1.6 },
      { yaw: -0.62, pitch: -1.3, n: 11, len: 0.23, r0: 0.29, curl: 0.14, ph: 3.2 }
    ].map(spec => {
      const outer = new THREE.Group();
      outer.position.set(0, 1.36, -0.72);
      outer.rotation.y = spec.yaw;
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
      const tube = tailTube(48, 20, spec.r0, f => (f < 0.45 ? hexMix(0xa82a16, 0xff5a1e, f / 0.45) : f < 0.75 ? hexMix(0xff5a1e, 0xffb46a, (f - 0.45) / 0.3) : hexMix(0xffb46a, 0xe4dcff, (f - 0.75) / 0.25)));
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
          outer.rotation.x = airborne ? 0.25 : atk ? -atk.wind * 0.2 : 0;
          segs.forEach((g, i) => {
            if (i === 0) return;
            const u = i / segs.length;
            const wave = Math.sin(t * 2.0 * wag - i * 0.5 + spec.ph) * (0.04 + u * 0.1) * motion;
            g.rotation.x = spec.curl + wave - burst * 0.05;
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
