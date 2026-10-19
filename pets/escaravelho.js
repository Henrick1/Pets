Pets.register({
  id: "escaravelho",
  dex: 13,
  name: "Escaravelho",
  color: "#2f5fc0",
  types: ["bug", "light"],
  description: "Carrega nas patas um pequeno sol que ele mesmo moldou com luz. Durante o dia empurra a esfera pelo céu, e quando abre as asas de vitral o chão inteiro se pinta de cores.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    fly: { duration: 3.4 },
    shine: { duration: 2.6 },
    roll: { duration: 2.6 }
  },
  idle: [
    { action: "roll", min: 20, max: 40 },
    { action: "shine", min: 30, max: 60 },
    { action: "fly", min: 50, max: 90 }
  ],
  clickAction: n => ["shine", "fly", "roll", "jump"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const root = new THREE.Group();
    const scaleG = new THREE.Group();
    scaleG.scale.setScalar(1.6);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);

    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const paintY = (geo, stops) => {
      const pos = geo.attributes.position;
      const out = new Float32Array(pos.count * 3);
      const cs = stops.map(([y, c]) => [y, hexParts(c)]);
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i);
        let k = 0;
        while (k < cs.length - 2 && y > cs[k + 1][0]) k++;
        const [y0, c0] = cs[k];
        const [y1, c1] = cs[k + 1];
        const f = smooth(y0, y1, y);
        out[i * 3] = lerp(c0[0], c1[0], f);
        out[i * 3 + 1] = lerp(c0[1], c1[1], f);
        out[i * 3 + 2] = lerp(c0[2], c1[2], f);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(out, 3));
      return geo;
    };

    const BODY_Y = 0.6;
    const RX = 0.62;
    const RY = 0.46;
    const RZ = 0.76;

    const darkMat = mat(0x3b2410, 0.45);
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x6b4316, roughness: 0.3, metalness: 0.35 });
    const goldShell = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.55 });
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff3b0, emissive: 0xffd65a, emissiveIntensity: 0.8, roughness: 0.3 });

    const belly = mesh(new THREE.SphereGeometry(1, 40, 28), darkMat);
    belly.scale.set(RX * 0.9, RY * 0.8, RZ * 0.92);
    belly.position.set(0, BODY_Y - 0.04, -0.02);
    bodyG.add(belly);
    for (let k = 0; k < 4; k++) {
      const ring = mesh(new THREE.TorusGeometry(1, 0.035, 8, 40), bronzeMat, false);
      const z = -0.4 + k * 0.17;
      const f = Math.sqrt(Math.max(0, 1 - Math.pow(z / (RZ * 0.92), 2)));
      ring.scale.set(RX * 0.9 * f, RY * 0.8 * f, 1);
      ring.position.set(0, BODY_Y - 0.04, z - 0.02);
      bodyG.add(ring);
    }

    const shellGeo = side => {
      const g = new THREE.SphereGeometry(1, 48, 32, side < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI * 0.6);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const GOLD = hexParts(0xffc843);
      const DEEP = hexParts(0xb8741a);
      const LAPIS = hexParts(0x1d3f9a);
      const LAPIS2 = hexParts(0x3a6ad8);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const az = Math.atan2(Math.abs(x), y);
        const band = (az / (Math.PI * 0.6)) * 3;
        const fr = band - Math.floor(band);
        const groove = Math.max(1 - smooth(0.02, 0.1, fr), smooth(0.9, 0.98, fr)) * smooth(0.05, 0.25, az);
        const rim = 1 - smooth(0.12, 0.24, y);
        const tail = smooth(-0.78, -0.9, z);
        const lap = Math.max(groove, rim, tail);
        const gk = smooth(0.1, 0.9, y);
        const k = smooth(-0.3, 0.6, y);
        const c = [0, 1, 2].map(j => lerp(lerp(DEEP[j], GOLD[j], gk), lerp(LAPIS[j], LAPIS2[j], k), lap));
        col[i * 3] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    };
    const elytra = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.012 * s, BODY_Y + RY * 0.82, 0.02 + RZ * 0.55);
      const shell = mesh(shellGeo(s), goldShell);
      shell.scale.set(RX, RY, RZ);
      shell.position.set(0, -RY * 0.82, -RZ * 0.55);
      pivot.add(shell);
      const filMat = new THREE.MeshStandardMaterial({ color: 0xffd257, roughness: 0.2, metalness: 0.7 });
      [0.42, 0.95].forEach(beta => {
        const ptsF = [];
        for (let k = 0; k <= 20; k++) {
          const tz = -0.86 + (k / 20) * 1.62;
          const rho = Math.sqrt(1 - tz * tz) * 1.012;
          ptsF.push(V3(s * rho * Math.sin(beta) * RX, rho * Math.cos(beta) * RY - RY * 0.82, tz * 1.012 * RZ - RZ * 0.55));
        }
        pivot.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ptsF), 40, 0.013, 6, false), filMat, false));
      });
      const sunPts = [];
      for (let k = 0; k <= 24; k++) {
        const a = (k / 24) * Math.PI * 2;
        const tz = -0.35 + Math.sin(a) * 0.16;
        const beta = 0.68 + Math.cos(a) * 0.16;
        const rho = Math.sqrt(1 - tz * tz) * 1.012;
        sunPts.push(V3(s * rho * Math.sin(beta) * RX, rho * Math.cos(beta) * RY - RY * 0.82, tz * 1.012 * RZ - RZ * 0.55));
      }
      pivot.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sunPts, true), 48, 0.012, 6, true), filMat, false));
      bodyG.add(pivot);
      return { pivot, s };
    });
    const sun = new THREE.Group();
    sun.position.set(0, BODY_Y + RY + 0.012, -0.05);
    sun.scale.setScalar(1.4);
    sun.rotation.x = -Math.PI / 2 + 0.15;
    const sunCore = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
    sun.add(sunCore);
    for (let k = 0; k < 8; k++) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(0.025, 0.06), new THREE.MeshBasicMaterial({ color: 0xffd65a }));
      const a = (k / 8) * Math.PI * 2;
      ray.position.set(Math.cos(a) * 0.11, Math.sin(a) * 0.11, 0.001);
      ray.rotation.z = a - Math.PI / 2;
      sun.add(ray);
    }
    bodyG.add(sun);

    const pronotum = mesh(paintY(new THREE.SphereGeometry(1, 40, 22, 0, Math.PI * 2, 0, Math.PI * 0.56), [[0, 0x1d3f9a], [0.25, 0x3a6ad8], [0.4, 0xb8741a], [0.95, 0xffd257]]), goldShell);
    pronotum.scale.set(RX * 0.92, RY * 0.78, 0.4);
    pronotum.position.set(0, BODY_Y - 0.02, RZ * 0.76);
    bodyG.add(pronotum);
    [-1, 1].forEach(s => {
      const spike = mesh(new THREE.ConeGeometry(0.05, 0.2, 8), new THREE.MeshStandardMaterial({ color: 0xffd257, roughness: 0.2, metalness: 0.7 }), false);
      spike.position.set(RX * 0.9 * s, BODY_Y + 0.02, RZ * 0.78);
      spike.rotation.z = -s * 1.25;
      spike.rotation.x = 0.3;
      bodyG.add(spike);
    });

    const head = new THREE.Group();
    head.position.set(0, BODY_Y - 0.02, RZ * 1.0);
    head.scale.setScalar(1.25);
    bodyG.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.3, 36, 26), new THREE.MeshStandardMaterial({ color: 0x1d3f9a, roughness: 0.25, metalness: 0.4 }));
    skull.scale.set(1.1, 0.85, 0.95);
    head.add(skull);
    const shovel = new THREE.Shape();
    shovel.moveTo(-0.3, -0.02);
    shovel.quadraticCurveTo(-0.34, 0.16, -0.26, 0.26);
    const teeth = 6;
    for (let k = 0; k <= teeth; k++) {
      const x = -0.26 + (k / teeth) * 0.52;
      const yb = 0.26 + 0.04 * Math.cos((k / teeth - 0.5) * Math.PI);
      if (k > 0) shovel.lineTo(x - 0.0433, yb - 0.02);
      shovel.lineTo(x, yb + 0.07);
    }
    shovel.quadraticCurveTo(0.34, 0.16, 0.3, -0.02);
    shovel.quadraticCurveTo(0, -0.08, -0.3, -0.02);
    const shovelGeo = new THREE.ExtrudeGeometry(shovel, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
    shovelGeo.rotateX(-Math.PI / 2);
    const clypeus = mesh(shovelGeo, new THREE.MeshStandardMaterial({ color: 0xffc843, roughness: 0.25, metalness: 0.55 }), false);
    clypeus.position.set(0, 0.17, 0.02);
    clypeus.rotation.x = -0.35;
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x2a1a0a, emissive: 0xff9a1a, emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.3, flatShading: true });
    const eyes = [];
    const compound = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.24 * s, 0.04, 0.14);
      const e = mesh(new THREE.IcosahedronGeometry(0.11, 2), eyeMat, false);
      e.scale.set(0.75, 1, 1.15);
      g.add(e);
      const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(0.06 * s, 0.05, 0.06);
      g.add(shine);
      head.add(g);
      return g;
    });
    const smile = new THREE.Group();
    const mandibles = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.07 * s, -0.17, 0.2);
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.06 * s, -0.02, 0.08), V3(0.02 * s, -0.03, 0.17), V3(-0.04 * s, -0.03, 0.2)]);
      g.add(mesh(new THREE.TubeGeometry(c, 12, 0.022, 6, false), new THREE.MeshStandardMaterial({ color: 0xffc843, roughness: 0.25, metalness: 0.55 }), false));
      head.add(g);
      return { g, s };
    });

    const antennae = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.16 * s, 0.12, 0.14);
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.08 * s, 0.1, 0.04), V3(0.2 * s, 0.16, 0.0), V3(0.3 * s, 0.18, -0.08)]);
      g.add(mesh(new THREE.TubeGeometry(c, 16, 0.014, 6, false), darkMat, false));
      const tip = new THREE.Group();
      tip.position.set(0.3 * s, 0.18, -0.08);
      for (let k = 0; k < 3; k++) {
        const plate = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 16), lightMat, false);
        plate.rotation.set(0, 0, Math.PI / 2 + (k - 1) * 0.45);
        plate.position.set(0.015 * s * k, 0, -0.012 * k);
        tip.add(plate);
      }
      g.add(tip);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.copy(tip.position);
      g.add(halo);
      head.add(g);
      return { g, tip, halo, s };
    });

    const legs = [];
    [-0.4, -0.04].forEach((z, k) => {
      [-1, 1].forEach(s => {
        const g = new THREE.Group();
        g.position.set(RX * 0.62 * s, BODY_Y - RY * 0.55, z);
        const up = mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.22, 8), darkMat, false);
        up.rotation.z = -1.0 * s;
        up.position.set(0.09 * s, 0.04, 0);
        const knee = mesh(new THREE.SphereGeometry(0.04, 10, 8), darkMat, false);
        knee.position.set(0.18 * s, 0.1, 0);
        const low = mesh(new THREE.CylinderGeometry(0.022, 0.03, 0.26, 8), darkMat, false);
        low.rotation.z = 0.35 * s;
        low.position.set(0.22 * s, -0.02, 0);
        const foot = mesh(new THREE.SphereGeometry(0.035, 10, 8), bronzeMat, false);
        foot.scale.set(1.3, 0.6, 1.6);
        foot.position.set(0.26 * s, -0.14, 0.02);
        g.add(up, knee, low, foot);
        [0.35, 0.65].forEach(f => {
          const sp = mesh(new THREE.ConeGeometry(0.012, 0.05, 5), mat(0xffd257, 0.3), false);
          sp.position.set(lerp(0.18, 0.26, f) * s, lerp(0.1, -0.14, f), 0);
          sp.rotation.z = -s * 0.9;
          g.add(sp);
        });
        g.rotation.y = (k - 1) * -0.45 * s;
        bodyG.add(g);
        legs.push({ g, s, k });
      });
    });

    const WV = {
      r: [0, 0], o1: [0.3, 0.12], o2: [0.6, 0.15], o3: [0.88, 0.05], o4: [0.96, -0.14], o5: [0.8, -0.33], o6: [0.5, -0.42], o7: [0.2, -0.3],
      i1: [0.34, -0.04], i2: [0.63, -0.09], i3: [0.42, -0.22]
    };
    const PANES = [
      ["r", "o1", "i1"], ["o1", "o2", "i2", "i1"], ["o2", "o3", "o4", "i2"], ["i2", "o4", "o5"],
      ["i3", "i2", "o5", "o6"], ["r", "i1", "i3", "o7"], ["i1", "i2", "i3"], ["o7", "i3", "o6"]
    ];
    const PANE_COLORS = [0x7ff0ff, 0xff8fd8, 0xffe066, 0x9fff8a, 0xb69cff, 0xff9f5a, 0xfff6c8, 0x6fd0ff];
    const leadMat = mat(0x2a1a08, 0.4);
    const paneMats = [];
    const buildWing = () => {
      const g = new THREE.Group();
      const edges = new Set();
      PANES.forEach((pane, k) => {
        const pts = pane.map(n => WV[n]);
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
        const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const sh = new THREE.Shape();
        pts.forEach((p, i) => {
          const x = lerp(p[0], cx, 0.08);
          const y = lerp(p[1], cy, 0.08);
          if (i === 0) sh.moveTo(x, y);
          else sh.lineTo(x, y);
        });
        const pm = new THREE.MeshBasicMaterial({ color: PANE_COLORS[k], transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
        paneMats.push(pm);
        const geo = new THREE.ShapeGeometry(sh);
        geo.rotateX(Math.PI / 2);
        g.add(new THREE.Mesh(geo, pm));
        pane.forEach((n, i) => {
          const m = pane[(i + 1) % pane.length];
          edges.add([n, m].sort().join("|"));
        });
      });
      edges.forEach(key => {
        const [a, b] = key.split("|").map(n => WV[n]);
        const A = V3(a[0], 0, a[1]);
        const B = V3(b[0], 0, b[1]);
        const len = A.distanceTo(B);
        const seg = mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 6), leadMat, false);
        seg.position.copy(A).add(B).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(V3(0, 1, 0), B.clone().sub(A).normalize());
        g.add(seg);
      });
      return g;
    };
    const orbG = new THREE.Group();
    orbG.scale.setScalar(0.85);
    bodyG.add(orbG);
    const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 24), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }));
    orbG.add(orbCore);
    const orbShell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.29, 1), new THREE.MeshStandardMaterial({ color: 0xffc843, emissive: 0xffa21a, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.3, transparent: true, opacity: 0.45, flatShading: true }));
    orbG.add(orbShell);
    const orbHalo = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), new THREE.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }));
    orbG.add(orbHalo);
    const orbRays = new THREE.Group();
    for (let k = 0; k < 10; k++) {
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0xffd65a }));
      const a = (k / 10) * Math.PI * 2;
      ray.position.set(Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0);
      ray.rotation.z = a - Math.PI / 2;
      orbRays.add(ray);
    }
    orbG.add(orbRays);
    const ORB_REST = V3(0, 0.26, RZ + 0.62);
    const arms = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.24 * s, BODY_Y - 0.12, RZ * 0.75);
      bodyG.add(g);
      const goldLeg = new THREE.MeshStandardMaterial({ color: 0x1d3f9a, roughness: 0.3, metalness: 0.4 });
      const upper = mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.34, 8), goldLeg, false);
      const lower = mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.36, 8), goldLeg, false);
      const knee = mesh(new THREE.SphereGeometry(0.05, 10, 8), mat(0xffc843, 0.3), false);
      const claw = mesh(new THREE.ConeGeometry(0.035, 0.1, 6), mat(0xffc843, 0.3), false);
      g.add(upper, lower, knee, claw);
      const spikes = [0, 1, 2].map(() => {
        const sp = mesh(new THREE.ConeGeometry(0.018, 0.07, 5), mat(0xffc843, 0.3), false);
        g.add(sp);
        return sp;
      });
      return { g, upper, lower, knee, claw, spikes, s };
    });
    const segTo = (m, a, b) => {
      m.position.copy(a).add(b).multiplyScalar(0.5);
      const d = b.clone().sub(a);
      m.scale.y = d.length() / m.geometry.parameters.height;
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
    };

    const wings = [-1, 1].map(s => {
      const mount = new THREE.Group();
      mount.position.set(0.14 * s, BODY_Y + RY * 0.55, RZ * 0.3);
      const w = buildWing();
      w.scale.set(s * 1.75, 1, 1.4);
      const flapG = new THREE.Group();
      flapG.add(w);
      mount.add(flapG);
      bodyG.add(mount);
      return { mount, flapG, s };
    });

    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff1a0 });
    const sparkGeo = new THREE.OctahedronGeometry(0.04, 0);
    const sparks = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(sparkGeo, sparkMat);
      m.visible = false;
      scaleG.add(m);
      sparks.push({ m, ph: k / 12, a: (k / 12) * Math.PI * 2, h: 0.3 + ((k * 7) % 10) / 12 });
    }

    const rayMat = new THREE.MeshBasicMaterial({ color: 0xffe788, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const rays = new THREE.Group();
    rays.position.y = BODY_Y + 0.1;
    for (let k = 0; k < 12; k++) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 1), rayMat);
      r.geometry.translate(0, 0.75, 0);
      r.rotation.z = (k / 12) * Math.PI * 2;
      rays.add(r);
    }
    rays.visible = false;
    bodyG.add(rays);

    const tmpO = V3(0, 0, 0);
    const orbiters = [0, 1, 2, 3].map(() => {
      const o = mesh(new THREE.OctahedronGeometry(0.045, 0), lightMat, false);
      bodyG.add(o);
      return o;
    });
    const tmpH = V3(0, 0, 0);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beam.geometry.translate(0, 3, 0);
    beam.visible = false;
    bodyG.add(beam);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 1.2, 56),
      new THREE.MeshBasicMaterial({ color: 0xffd65a, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    root.add(ring);

    const glow = new THREE.PointLight(0xffd88a, 0.4, 5);
    glow.position.set(0, 1.4, 0.8);
    scaleG.add(glow);

    const food = berry();
    food.visible = false;
    scaleG.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const fly = action && action.name === "fly" ? action : null;
        const shine = action && action.name === "shine" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const light = s.dying ? 0.25 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        let open = 0;
        let lift = 0;
        let flapAmp = 0;
        if (fly) {
          const p = fly.p;
          open = smooth(0, 0.15, p) * (1 - smooth(0.85, 1, p));
          lift = smooth(0.1, 0.3, p) * (1 - smooth(0.75, 0.95, p));
          flapAmp = smooth(0.08, 0.2, p) * (1 - smooth(0.88, 1, p));
        }
        let burst = 0;
        let charge = 0;
        let raise = 0;
        if (shine) {
          raise = smooth(0, 0.25, shine.p) * (1 - smooth(0.85, 1, shine.p));
          charge = smooth(0.15, 0.45, shine.p) * (1 - smooth(0.45, 0.52, shine.p));
          burst = smooth(0.45, 0.52, shine.p) * (1 - smooth(0.78, 0.95, shine.p));
        }
        const rollA = action && action.name === "roll" ? action : null;
        let push = 0;
        let spinOrb = t * 0.4;
        if (rollA) {
          push = Math.sin(rollA.p * Math.PI * 2) * smooth(0, 0.1, rollA.p) * (1 - smooth(0.9, 1, rollA.p));
          spinOrb += rollA.p * Math.PI * 6;
        }

        let y = lift * (0.75 + Math.sin(t * 3) * 0.06);
        let sy = 1 + Math.sin(t * 2.4) * 0.02 * motion;
        let airborne = lift > 0.05;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.2 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.8) {
            const q = (p - 0.2) / 0.6;
            y = Math.sin(q * Math.PI) * 0.9;
            sy = 1 + 0.1 * Math.cos(q * Math.PI);
            airborne = true;
          } else sy = 1 - 0.15 * Math.sin(((p - 0.8) / 0.2) * Math.PI);
          open = Math.max(open, y > 0.3 ? 0.35 : 0);
        }
        sy -= charge * 0.1;
        sy += burst * 0.06;
        if (eat) sy += -ph.chew * 0.05;
        if (s.dying) sy *= 0.92;
        const sx = 1 / Math.sqrt(sy);
        bodyG.scale.set(sx, sy, sx);
        root.position.y = y;
        root.position.z = push * 0.35;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch + (fly ? -0.12 * lift : 0);
        bodyG.rotation.z = Math.sin(t * 1.4) * 0.03 * motion + (fly ? Math.sin(t * 2.2) * 0.06 * lift : 0);

        elytra.forEach(({ pivot, s: sd }) => {
          pivot.rotation.x = open * 0.38;
          pivot.rotation.y = -sd * open * 1.05;
          pivot.rotation.z = sd * open * 0.25;
        });
        wings.forEach(({ mount, flapG, s: sd }) => {
          const unfold = smooth(0.1, 0.6, open);
          const sc = 0.2 + unfold * 1.15;
          mount.scale.setScalar(Math.max(0.01, sc));
          mount.rotation.y = sd * lerp(-1.3, 0.05, unfold);
          mount.visible = unfold > 0.02;
          flapG.rotation.z = sd * (0.12 * unfold + Math.sin(t * 38) * 0.4 * flapAmp);
          flapG.rotation.x = Math.sin(t * 38 + 1) * 0.08 * flapAmp;
        });
        paneMats.forEach((m, k) => {
          m.opacity = (0.62 + flapAmp * 0.15 + Math.sin(t * 4 + k) * 0.06) * (0.6 + light * 0.4);
        });

        head.rotation.x = eat ? -0.25 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.08 : burst * -0.2;
        head.rotation.y = Math.sin(t * 0.7) * 0.08 * motion;
        mandibles.forEach(({ g, s: sd }) => {
          g.rotation.y = sd * ((eat ? ph.chew * 0.5 : 0) + Math.sin(t * 3 + sd) * 0.05 * motion);
        });
        smile.scale.y = eat && eat.p > 0.3 && eat.p < 0.85 ? 0.6 + ph.chew : burst > 0.3 ? 1.6 : 1;

        antennae.forEach(({ g, tip, halo, s: sd }, i) => {
          g.rotation.z = sd * (Math.sin(t * 2 + i * 1.3) * 0.12 * motion + (airborne ? -0.2 : 0));
          g.rotation.x = Math.sin(t * 1.6 + i) * 0.08 * motion - burst * 0.3;
          const pulse = 1 + Math.sin(t * 5 + i) * 0.12 * motion + charge * 0.6 + burst * 1.2;
          tip.scale.setScalar(pulse);
          halo.scale.setScalar(pulse * (1 + burst * 1.5));
          halo.material.opacity = (0.2 + burst * 0.4) * light;
        });
        lightMat.emissiveIntensity = (0.6 + charge * 1.2 + burst * 2) * light;

        legs.forEach(({ g, s: sd, k }) => {
          const walk = Math.sin(t * 6 + k * 2 + (sd > 0 ? Math.PI : 0)) * 0.08 * motion;
          g.rotation.z = airborne ? sd * 0.5 : walk * 0.5;
          g.rotation.x = airborne ? 0.4 : walk;
        });

        sun.scale.setScalar(1.4 * (1 + burst * 0.4 + Math.sin(t * 3) * 0.05 * motion));
        const orbPos = tmpO.copy(ORB_REST);
        orbPos.z += push * 0.12;
        orbPos.y += raise * 0.85 + Math.sin(t * 2) * 0.02 * motion + (airborne ? -0.05 : 0);
        orbPos.z -= raise * 0.55;
        orbG.position.copy(orbPos);
        orbG.rotation.x = spinOrb;
        orbShell.rotation.y = t * 0.5;
        orbRays.rotation.z = t * 0.7;
        const op = 1 + Math.sin(t * 3) * 0.04 * motion + charge * 0.5 + burst * 0.4;
        orbCore.scale.setScalar(op);
        orbHalo.scale.setScalar(op * (1 + burst * 1.6 + charge * 0.4));
        orbHalo.material.opacity = (0.2 + charge * 0.2 + burst * 0.3) * light;
        orbRays.scale.setScalar(1 + burst * 1.2);
        orbShell.material.emissiveIntensity = (0.5 + charge + burst * 1.5) * light;
        arms.forEach(({ g, upper, lower, knee, claw, spikes, s: sd }) => {
          const shoulder = V3(0, 0, 0);
          const hand = tmpH.copy(orbPos).sub(g.position);
          hand.x += sd * 0.27;
          hand.y -= 0.02;
          const mid = shoulder.clone().add(hand).multiplyScalar(0.5);
          mid.x += sd * 0.16;
          mid.y += 0.12;
          segTo(upper, shoulder, mid);
          segTo(lower, mid, hand);
          knee.position.copy(mid);
          claw.position.copy(hand);
          claw.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(-sd, 0, 0.3).normalize());
          spikes.forEach((sp, k) => {
            const f = 0.3 + k * 0.22;
            sp.position.copy(mid).lerp(hand, f);
            sp.position.y += 0.035;
            sp.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(sd * 0.3, 1, 0).normalize());
          });
        });
        sun.rotation.z = t * 0.6;
        rays.position.copy(orbG.position);
        rays.visible = burst > 0.02;
        rays.rotation.y = t * 0.8;
        rays.scale.setScalar(0.4 + burst * 1.1);
        rayMat.opacity = burst * 0.55;

        sparks.forEach(sp => {
          const on = flapAmp > 0.1 || burst > 0.1;
          sp.m.visible = on;
          if (!on) return;
          const u = (((t * 0.6 + sp.ph) % 1) + 1) % 1;
          const a = sp.a + t * 1.4;
          const rad = 0.7 + burst * 0.5;
          sp.m.position.set(Math.sin(a) * rad, BODY_Y + sp.h + (flapAmp ? -u * 0.8 : u * 0.6), Math.cos(a) * rad);
          sp.m.rotation.set(t * 3 + sp.ph, t * 2, 0);
          sp.m.scale.setScalar(Math.max(0.01, Math.sin(Math.PI * u)) * (0.6 + burst));
        });

        beam.visible = burst > 0.05;
        beam.position.copy(orbG.position);
        beam.scale.set(0.6 + burst * 0.6 + Math.sin(t * 30) * 0.05, 1, 0.6 + burst * 0.6);
        beam.material.opacity = burst * 0.5;
        ring.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04 + burst * 0.8 - lift * 0.3);
        ring.material.opacity = (0.18 + burst * 0.35) * light;
        glow.intensity = (0.35 + burst * 1.6 + charge * 0.6 + flapAmp * 0.4) * light;

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, BODY_Y + 0.1, ph.fall * ph.fall), RZ * 1.02 + 0.25);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;

        eyeMat.emissiveIntensity = (0.2 + charge * 0.5 + burst * 0.9) * light;
        compound.forEach((g, i) => {
          g.rotation.y = pointer.x * 0.1;
          g.scale.setScalar(1 + burst * 0.15);
        });
        orbiters.forEach((o, k) => {
          const a = t * (1.2 + burst * 2) + (k / orbiters.length) * Math.PI * 2;
          const rad = 0.42 + burst * 0.3;
          o.position.set(orbG.position.x + Math.cos(a) * rad, orbG.position.y + Math.sin(a * 0.7) * 0.12, orbG.position.z + Math.sin(a) * rad);
          o.rotation.set(t * 2 + k, t * 1.5, 0);
          o.scale.setScalar((0.8 + Math.sin(t * 4 + k) * 0.2) * light);
        });
      }
    };
  }
});
