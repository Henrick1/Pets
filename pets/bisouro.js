Pets.register({
  id: "bisouro",
  dex: 12,
  name: "Bisouro",
  color: "#f2b632",
  types: ["bug", "light"],
  description: "Um besourinho dourado redondo como uma joia. Debaixo da carapaça esconde asas de vitral que brilham coloridas quando ele voa, e as pontinhas das antenas acendem como lanternas.",
  evolvesTo: "escaravelho",
  evolveLevel: 10,
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 },
    fly: { duration: 3.2 },
    shine: { duration: 2.2 }
  },
  idle: [
    { action: "shine", min: 25, max: 50 },
    { action: "fly", min: 40, max: 80 }
  ],
  clickAction: n => ["fly", "shine", "jump", "shine"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const root = new THREE.Group();
    const scaleG = new THREE.Group();
    scaleG.scale.setScalar(1.45);
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

    const BODY_Y = 0.52;
    const RX = 0.56;
    const RY = 0.44;
    const RZ = 0.64;

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
      const g = new THREE.SphereGeometry(1, 36, 28, side < 0 ? -Math.PI / 2 : Math.PI / 2, Math.PI, 0, Math.PI * 0.6);
      paintY(g, [[0.1, 0x9a5a10], [0.55, 0xe09a22], [0.95, 0xffd257]]);
      return g;
    };
    const elytra = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.012 * s, BODY_Y + RY * 0.82, 0.02 + RZ * 0.55);
      const shell = mesh(shellGeo(s), goldShell);
      shell.scale.set(RX, RY, RZ);
      shell.position.set(0, -RY * 0.82, -RZ * 0.55);
      pivot.add(shell);
      const glass = [0x7ff0ff, 0xff7fd8, 0x9fff8a, 0xffb05a];
      [[0.45, 0.8, 0.35], [0.3, 0.88, -0.25], [0.7, 0.55, 0.05], [0.55, 0.6, -0.55]].forEach(([nx0, ny0, nz0], k) => {
        const n = V3(nx0 * s, ny0, nz0).normalize();
        const nrm = V3(n.x / RX, n.y / RY, n.z / RZ).normalize();
        const gem = mesh(new THREE.SphereGeometry(0.075, 18, 12), new THREE.MeshStandardMaterial({ color: glass[k], emissive: glass[k], emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.1 }), false);
        gem.scale.set(1, 1, 0.4);
        gem.position.set(n.x * RX, n.y * RY - RY * 0.82, n.z * RZ - RZ * 0.55);
        gem.quaternion.setFromUnitVectors(V3(0, 0, 1), nrm);
        pivot.add(gem);
      });
      bodyG.add(pivot);
      return { pivot, s };
    });
    const sun = new THREE.Group();
    sun.position.set(0, BODY_Y + RY + 0.012, -0.1);
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

    const pronotum = mesh(paintY(new THREE.SphereGeometry(1, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), [[0, 0x7a4512], [0.9, 0xc9831c]]), goldShell);
    pronotum.scale.set(RX * 0.72, RY * 0.62, 0.3);
    pronotum.position.set(0, BODY_Y + 0.02, RZ * 0.78);
    bodyG.add(pronotum);

    const head = new THREE.Group();
    head.position.set(0, BODY_Y - 0.02, RZ * 1.02);
    bodyG.add(head);
    const skull = mesh(new THREE.SphereGeometry(0.3, 36, 26), bronzeMat);
    skull.scale.set(1.08, 0.92, 0.95);
    head.add(skull);
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.58, whiteColor: 0xffffff, pupilColor: 0x1a1206 });
      e.pupil.scale.set(0.95, 1.12, 0.5);
      e.g.position.set(0.12 * s, 0.06, 0.26);
      e.g.rotation.y = 0.28 * s;
      head.add(e.g);
      return e;
    });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xffa36b, transparent: true, opacity: 0.7, depthWrite: false });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.04, 20), cheekMat);
      c.position.set(0.21 * s, -0.08, 0.21);
      c.rotation.y = 0.75 * s;
      c.scale.set(1, 0.65, 1);
      head.add(c);
    });
    const smile = new THREE.Group();
    const mandibles = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.06 * s, -0.12, 0.24);
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.03 * s, -0.02, 0.06), V3(0.0, -0.03, 0.11)]);
      g.add(mesh(new THREE.TubeGeometry(c, 8, 0.016, 6, false), darkMat, false));
      head.add(g);
      return { g, s };
    });

    const antennae = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.1 * s, 0.2, 0.12);
      const c = new THREE.CatmullRomCurve3([V3(0, 0, 0), V3(0.06 * s, 0.14, 0.05), V3(0.16 * s, 0.26, 0.02), V3(0.24 * s, 0.32, -0.06)]);
      g.add(mesh(new THREE.TubeGeometry(c, 16, 0.014, 6, false), darkMat, false));
      const tip = mesh(new THREE.SphereGeometry(0.045, 16, 12), lightMat, false);
      tip.position.set(0.24 * s, 0.32, -0.06);
      g.add(tip);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.position.copy(tip.position);
      g.add(halo);
      head.add(g);
      return { g, tip, halo, s };
    });

    const legs = [];
    [-0.32, 0.0, 0.3].forEach((z, k) => {
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
    const wings = [-1, 1].map(s => {
      const mount = new THREE.Group();
      mount.position.set(0.14 * s, BODY_Y + RY * 0.55, RZ * 0.3);
      const w = buildWing();
      w.scale.set(s * 1.35, 1, 1.1);
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

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.95, 56),
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
        if (shine) {
          charge = smooth(0, 0.3, shine.p) * (1 - smooth(0.3, 0.4, shine.p));
          burst = smooth(0.3, 0.4, shine.p) * (1 - smooth(0.7, 1, shine.p));
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

        sun.scale.setScalar(1 + burst * 0.6 + Math.sin(t * 3) * 0.05 * motion);
        sun.rotation.z = t * 0.6;
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

        ring.scale.setScalar(1 + Math.sin(t * 2.4) * 0.04 + burst * 0.8 - lift * 0.3);
        ring.material.opacity = (0.18 + burst * 0.35) * light;
        glow.intensity = (0.35 + burst * 1.6 + charge * 0.6 + flapAmp * 0.4) * light;

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.0, (BODY_Y + 0.02) * 1, ph.fall * ph.fall), RZ * 1.02 + 0.32);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.08 : eat && eat.p > 0.3 ? 0.45 : charge > 0.3 ? 0.35 : blink;
        });
        followPupils(eyes, pointer, 0.7);
      }
    };
  }
});
