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
    const spikeGeo = new THREE.ConeGeometry(0.024, 0.08, 10);
    spikeGeo.translate(0, 0.04, 0);
    const studBand = (parent, center, axis, radius, tubeR, n) => {
      const band = mesh(new THREE.TorusGeometry(radius, tubeR, 10, 36), slimeMat, false);
      band.position.copy(center);
      band.quaternion.setFromUnitVectors(V3(0, 0, 1), axis.clone().normalize());
      parent.add(band);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const sp = mesh(spikeGeo, slimeMat, false);
        sp.position.set(Math.cos(a) * (radius + tubeR * 0.8), Math.sin(a) * (radius + tubeR * 0.8), 0);
        sp.quaternion.setFromUnitVectors(V3(0, 1, 0), V3(Math.cos(a), Math.sin(a), 0));
        band.add(sp);
      }
      return band;
    };
    const plumeStalkMat = std(0x5a2a7a, 0.4, { emissive: 0x2a0a40, emissiveIntensity: 0.3 });
    const plumeFilMat = std(0xffffff, 0.45, { emissive: 0x2a0a3a, emissiveIntensity: 0.25 });
    const plumeTipMat = std(0xc080ff, 0.3, { emissive: 0x8a30e0, emissiveIntensity: 0.9 });
    const limbSkin = std(0xd2c4e2, 0.5);
    const venomMat = std(0x9a50e0, 0.3, { emissive: 0x7a28d0, emissiveIntensity: 0.7 });

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
    body.scale.setScalar(1.43);
    root.add(body);

    const legs = [-1, 1].map(s => {
      const hip = new THREE.Group();
      hip.position.set(0.2 * s, 0.78, -0.02);
      body.add(hip);
      hip.add(mesh(tube([V3(0, 0.06, 0), V3(0.03 * s, -0.2, 0.04), V3(0.04 * s, -0.36, 0.05)], 0.14, 0.1, 12, 14), limbSkin));
      const knee = new THREE.Group();
      knee.position.set(0.04 * s, -0.36, 0.05);
      hip.add(knee);
      knee.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), limbSkin));
      knee.add(mesh(tube([V3(0, 0, 0), V3(0, -0.18, -0.02), V3(0, -0.3, -0.03)], 0.095, 0.07, 10, 14), limbSkin));
      const foot = new THREE.Group();
      foot.position.set(0, -0.32, -0.02);
      knee.add(foot);
      foot.add(mesh(new THREE.SphereGeometry(0.075, 18, 14), limbSkin));
      const pg = new THREE.SphereGeometry(1, 32, 20);
      {
        const pp = pg.attributes.position;
        for (let i = 0; i < pp.count; i++) {
          const x = pp.getX(i);
          const y = pp.getY(i);
          const z = pp.getZ(i);
          const yy = y < 0 ? y * 0.35 : y;
          const front = Math.max(0, z);
          pp.setXYZ(i, x * (0.085 + front * 0.025), yy * 0.05, z * 0.11);
        }
        pg.computeVertexNormals();
      }
      const palm = mesh(pg, skin);
      palm.position.set(0, -0.045, 0.05);
      foot.add(palm);
      const tipsP = [];
      [-0.5, -0.17, 0.17, 0.5].forEach((a, i) => {
        const l = i === 1 || i === 2 ? 0.19 : 0.155;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        const p0 = V3(sa * 0.04, -0.045, 0.08 + ca * 0.04);
        const p1 = V3(sa * l * 0.55, -0.05, 0.08 + ca * l * 0.55);
        const p2 = V3(sa * l * 0.9, -0.065, 0.08 + ca * l * 0.9);
        const p3 = V3(sa * l, -0.078, 0.08 + ca * l);
        foot.add(mesh(tube([p0, p1, p2, p3], 0.036, 0.022, 14, 12), skin));
        const tip = mesh(new THREE.SphereGeometry(0.027, 14, 10), skin);
        tip.position.copy(p3);
        tip.scale.set(1, 0.75, 1.15);
        foot.add(tip);
        tipsP.push(p1);
      });
      {
        const wpos = [];
        for (let i = 0; i < tipsP.length - 1; i++) {
          const a0 = tipsP[i];
          const a1 = tipsP[i + 1];
          const base = V3((a0.x + a1.x) * 0.3, -0.045, 0.1);
          wpos.push(base.x, base.y, base.z, a0.x, a0.y + 0.008, a0.z, a1.x, a1.y + 0.008, a1.z);
        }
        const wg = new THREE.BufferGeometry();
        wg.setAttribute("position", new THREE.Float32BufferAttribute(wpos, 3));
        wg.computeVertexNormals();
        foot.add(mesh(wg, std(0xd8cbe8, 0.5, { side: THREE.DoubleSide }), false));
      }
      [[0.05 * s, -0.12, 0.13, 0.03], [-0.06 * s, -0.25, 0.1, 0.022]].forEach(([x, y, z, rr]) => {
        const d = mesh(new THREE.SphereGeometry(1, 12, 8), venomMat, false);
        d.position.set(x, y, z);
        d.scale.set(rr, rr * 1.1, rr * 0.35);
        hip.add(d);
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
      const A = [0.8, 0.74, 0.88];
      const B = [0.99, 0.96, 1.0];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const w = 1 + 0.12 * smooth(0.3, -0.7, y) - 0.12 * smooth(0.2, 0.9, y);
        pos.setXYZ(i, x * 0.38 * w, y * 0.48, z * 0.31 * w + 0.03 * smooth(0, -0.8, y) * Math.max(0, z));
        const b = smooth(-0.1, 0.7, z) * smooth(0.7, -0.4, y);
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
      const spotMat = venomMat;
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
      sh.add(mesh(new THREE.SphereGeometry(0.1, 16, 12), limbSkin));
      sh.add(mesh(tube([V3(0, 0, 0), V3(0.05 * s, -0.18, 0.02), V3(0.07 * s, -0.36, 0.04)], 0.09, 0.07, 10, 12), limbSkin));
      const el = new THREE.Group();
      el.position.set(0.07 * s, -0.36, 0.04);
      sh.add(el);
      el.add(mesh(new THREE.SphereGeometry(0.07, 12, 10), limbSkin));
      el.add(mesh(tube([V3(0, 0, 0), V3(-0.01 * s, -0.16, 0.04), V3(-0.02 * s, -0.3, 0.06)], 0.068, 0.05, 10, 12), limbSkin));
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
      const thumb = mesh(tube([V3(0.05 * s, -0.02, 0.02), V3(0.06 * s, -0.07, 0.06), V3(0.03 * s, -0.09, 0.075)], 0.022, 0.016, 8, 8), skin, false);
      hand.add(thumb);
      studBand(el, V3(-0.015 * s, -0.24, 0.05), V3(0, 1, 0.15), 0.07, 0.032, 7);
      [[0.07 * s, -0.12, 0.07, 0.024], [0.02 * s, -0.27, 0.075, 0.018]].forEach(([x, y, z, rr]) => {
        const d = mesh(new THREE.SphereGeometry(1, 12, 8), venomMat, false);
        d.position.set(x, y, z);
        d.scale.set(rr, rr * 1.1, rr * 0.35);
        sh.add(d);
      });
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
      lid.rotation.set(-0.05, 0, s * 0.22);
      const bag = mesh(new THREE.SphereGeometry(0.07, 18, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), std(0xb8a6cc, 0.7), false);
      bag.scale.set(1.25, 0.85, 0.55);
      bag.position.set(0, -0.012, -0.012);
      g.add(bag);
      return { g, lid, s };
    });
    [-1, 1].forEach(s => {
      head.add(mesh(tube([V3(0.05 * s, 0.1, HR * 0.92), V3(0.16 * s, 0.135, HR * 0.89), V3(0.27 * s, 0.18, HR * 0.76)], 0.026, 0.018, 12, 8), std(0x4a2a5a, 0.6), false));
    });
    const frown = new THREE.Group();
    frown.position.set(0.05, -0.17, HR * 0.955);
    frown.rotation.set(0.32, 0.12, -0.12);
    head.add(frown);
    {
      const rr = (w, h, rad) => {
        const sh = new THREE.Shape();
        sh.moveTo(-w / 2 + rad, -h / 2);
        sh.lineTo(w / 2 - rad, -h / 2);
        sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rad);
        sh.lineTo(w / 2, h / 2 - rad);
        sh.quadraticCurveTo(w / 2, h / 2, w / 2 - rad, h / 2);
        sh.lineTo(-w / 2 + rad, h / 2);
        sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rad);
        sh.lineTo(-w / 2, -h / 2 + rad);
        sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rad, -h / 2);
        return new THREE.ShapeGeometry(sh, 6);
      };
      const lips = new THREE.Mesh(rr(0.13, 0.055, 0.022), new THREE.MeshBasicMaterial({ color: 0x3a1430 }));
      frown.add(lips);
      const teeth = new THREE.Mesh(rr(0.112, 0.038, 0.014), new THREE.MeshBasicMaterial({ color: 0xf4f0f8 }));
      teeth.position.z = 0.002;
      frown.add(teeth);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x8a7a96 });
      const mid = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.004), lineMat);
      mid.position.z = 0.004;
      frown.add(mid);
      [-0.036, -0.012, 0.012, 0.036].forEach(x => {
        const v = new THREE.Mesh(new THREE.PlaneGeometry(0.004, 0.036), lineMat);
        v.position.set(x, 0, 0.004);
        frown.add(v);
      });
    }
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

    const slimeTex = (() => {
      const N = 256;
      const cv = document.createElement("canvas");
      cv.width = N;
      cv.height = N;
      const c = cv.getContext("2d");
      let seed = 7;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      const wrap = fn => {
        for (let dx = -N; dx <= N; dx += N) for (let dy = -N; dy <= N; dy += N) fn(dx, dy);
      };
      c.fillStyle = "#a6a6a6";
      c.fillRect(0, 0, N, N);
      for (let i = 0; i < 70; i++) {
        const x = rnd() * N;
        const y = rnd() * N;
        const r = 10 + rnd() * 34;
        const light = rnd() < 0.55;
        wrap((dx, dy) => {
          const g = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          g.addColorStop(0, light ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.3)");
          g.addColorStop(1, "rgba(128,128,128,0)");
          c.fillStyle = g;
          c.beginPath();
          c.ellipse(x + dx, y + dy, r * 0.8, r * 1.3, 0, 0, Math.PI * 2);
          c.fill();
        });
      }
      for (let i = 0; i < 22; i++) {
        const x = rnd() * N;
        const y = rnd() * N;
        const len = 30 + rnd() * 80;
        const w = 2 + rnd() * 4;
        wrap((dx, dy) => {
          const g = c.createLinearGradient(0, y + dy, 0, y + dy + len);
          g.addColorStop(0, "rgba(255,255,255,0)");
          g.addColorStop(0.5, "rgba(255,255,255,0.22)");
          g.addColorStop(1, "rgba(255,255,255,0)");
          c.fillStyle = g;
          c.beginPath();
          c.ellipse(x + dx, y + dy + len / 2, w, len / 2, 0, 0, Math.PI * 2);
          c.fill();
        });
      }
      for (let i = 0; i < 24; i++) {
        const x = rnd() * N;
        const y = rnd() * N;
        const r = 3 + rnd() * 7;
        wrap((dx, dy) => {
          c.strokeStyle = "rgba(255,255,255,0.55)";
          c.lineWidth = 1.2;
          c.beginPath();
          c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
          c.stroke();
          c.fillStyle = "rgba(255,255,255,0.7)";
          c.beginPath();
          c.arc(x + dx - r * 0.35, y + dy - r * 0.35, r * 0.3, 0, Math.PI * 2);
          c.fill();
        });
      }
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(2.5, 1.6);
      return tex;
    })();
    const capeMat = std(0xb070f0, 0.12, {
      map: slimeTex,
      bumpMap: slimeTex,
      bumpScale: 0.025,
      emissive: 0x3a1470,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    });
    const hoodMat = capeMat.clone();
    hoodMat.depthWrite = true;
    hoodMat.opacity = 0.9;
    const dripMat = std(0x9a4ae8, 0.08, { emissive: 0x4a1a90, emissiveIntensity: 0.5, transparent: true, opacity: 0.88 });
    const hood = new THREE.Group();
    head.add(hood);
    const hoodGoo = { geo: null, base: null, nrm: null, w: null };
    const updateHood = (t, motion) => {
      if (!hoodGoo.geo || !motion) return;
      const arr = hoodGoo.geo.attributes.position.array;
      const b = hoodGoo.base;
      const n = hoodGoo.nrm;
      const f = t * 0.55;
      for (let i = 0, o = 0; i < hoodGoo.w.length; i++, o += 3) {
        const w = hoodGoo.w[i];
        if (!w) continue;
        const x = b[o];
        const y = b[o + 1];
        const z = b[o + 2];
        const d = (Math.sin(x * 11 + y * 7 - f * 2.4) * Math.sin(z * 9 - y * 5 + f * 1.7) * 0.016 + Math.sin(y * 19 + f * 2.6 + x * 4) * 0.006) * w * motion;
        arr[o] = x + n[o] * d;
        arr[o + 1] = y + n[o + 1] * d;
        arr[o + 2] = z + n[o + 2] * d;
      }
      hoodGoo.geo.attributes.position.needsUpdate = true;
    };
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
      const uvs = [];
      const wob = [];
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
        uvs.push((Math.atan2(p.x, -p.z) / Math.PI) * 0.5 + 0.5, p.y * 0.9);
        const el = Math.asin(Math.max(-1, Math.min(1, d.y)));
        const fromCut = Math.abs(ha) < 1.75 ? el - cutE(ha) : 1;
        wob.push(cut ? 0 : smooth(0.08, 0.45, fromCut) * smooth(0.05, 0.4, al - a0));
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
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      hood.add(mesh(g, hoodMat, false));
      hoodGoo.geo = g;
      hoodGoo.base = pos.slice();
      hoodGoo.nrm = Array.from(g.attributes.normal.array);
      hoodGoo.w = wob;
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
      const lock = mesh(lockGeo, hoodMat, false);
      lock.scale.set(0.14, 0.24, 0.05);
      lock.position.set(0.12, 0.12, HR * 0.96);
      lock.rotation.set(-0.25, 0.28, 0.42);
      hood.add(lock);
      const lock2 = mesh(lockGeo, hoodMat, false);
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
      g.add(mesh(new THREE.TubeGeometry(curve, 20, 0.034, 8, false), plumeStalkMat, false));
      const N = 18;
      const fil = new THREE.InstancedMesh(filUnit, plumeFilMat, N * 6);
      const tips = new THREE.InstancedMesh(tipUnit, plumeTipMat, N * 6);
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      let n = 0;
      for (let i = 0; i < N; i++) {
        const f = 0.15 + (i / (N - 1)) * 0.8;
        const p = curve.getPointAt(f);
        const tan = curve.getTangentAt(f);
        [-1, 1].forEach(sd => [-0.4, 0, 0.4].forEach(zo => {
          const jit = Math.sin(i * 12.9898 + sd * 78.233 + zo * 37.7) * 0.5 + 0.5;
          const l = 0.24 * (1 - f * 0.5) * (0.75 + jit * 0.5) * (zo ? 0.85 : 1);
          const dir = V3(zo * 0.6, -0.05 + jit * 0.08, sd * 0.42).add(tan.clone().multiplyScalar(1.0)).normalize();
          dummy.position.copy(p);
          dummy.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
          dummy.scale.set(0.0075, l, 0.0075);
          dummy.updateMatrix();
          fil.setMatrixAt(n, dummy.matrix);
          col.setHSL(0.76 + f * 0.04, 0.45, 0.32 + f * 0.25);
          fil.setColorAt(n, col);
          dummy.position.copy(p).add(dir.multiplyScalar(l));
          dummy.quaternion.identity();
          dummy.scale.setScalar(zo ? 0.009 : 0.012 + (1 - f) * 0.004);
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
      const NU = 56;
      const NV = 34;
      const pos = [];
      const idx = [];
      const uvs = [];
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
          uvs.push(u, 1 - v);
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
      capeGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
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
    const hemDrop = (u, t, motion) => {
      const c = Math.abs(u * 2 - 1);
      const lobe = Math.max(0, Math.sin(u * Math.PI * 9 + 0.5 + Math.sin(t * 0.6 + u * 4) * 0.4 * motion));
      const drip = Math.max(0, Math.sin(u * Math.PI * 4.5 + 1.3));
      const stretch = 1 + Math.sin(t * 0.9 + u * 11) * 0.25 * motion;
      return (Math.pow(lobe, 3) * 0.07 + Math.pow(drip, 12) * 0.12 * stretch + 0.012 * Math.sin(u * 37)) * (1 - c * 0.5);
    };
    const updateCape = (t = 0, motion = 0) => {
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
          const u = iu / capeNU;
          const cz = lerp(HEAD.z - 0.02, 0, smooth(0.1, 0.45, v));
          let nx = bx;
          let nz = bz - cz;
          const nl = Math.hypot(nx, nz) || 1;
          nx /= nl;
          nz /= nl;
          const flow = t * 0.55 * motion;
          const goo =
            (Math.sin(u * 17 + v * 5 - flow * 2.2) * Math.sin(v * 9 - flow * 3 + u * 6) * 0.022 +
              Math.sin(u * 31 - v * 13 + flow * 1.3) * 0.008 +
              Math.max(0, Math.sin(u * 11 + 2.1)) * Math.sin(v * 3.2 - flow * 1.6) * 0.018) *
            w;
          const sag = smooth(0.55, 1, v) * hemDrop(u, t, motion);
          arr[o] = lerp(tmpV.x, bx + nx * goo, w);
          arr[o + 1] = lerp(tmpV.y, by - sag, w);
          arr[o + 2] = lerp(tmpV.z, bz + nz * goo, w);
        }
      }
      capeGeo.attributes.position.needsUpdate = true;
      capeGeo.computeVertexNormals();
    };
    const capeMesh = mesh(capeGeo, capeMat, false);
    capeMesh.renderOrder = 2;
    torso.add(capeMesh);
    const capeBubbles = [];
    for (let k = 0; k < 14; k++) {
      const b = mesh(new THREE.SphereGeometry(1, 10, 8), glowMat, false);
      torso.add(b);
      capeBubbles.push({ b, u: 0.06 + ((k * 0.618) % 1) * 0.88, v0: (k * 0.37) % 1, sp: 0.05 + ((k * 7) % 5) * 0.012, r: 0.012 + ((k * 3) % 4) * 0.005 });
    }
    const capePoint = (u, v, out) => {
      const fu = u * capeNU;
      const fv = v * capeNV;
      const iu = Math.min(capeNU - 1, Math.floor(fu));
      const iv = Math.min(capeNV - 1, Math.floor(fv));
      const du = fu - iu;
      const dv = fv - iv;
      const arr = capeGeo.attributes.position.array;
      const at = (a, b, c) => arr[((iv + b) * (capeNU + 1) + iu + a) * 3 + c];
      for (let c = 0; c < 3; c++) {
        const top = lerp(at(0, 0, c), at(1, 0, c), du);
        const bot = lerp(at(0, 1, c), at(1, 1, c), du);
        out.setComponent(c, lerp(top, bot, dv));
      }
      return out;
    };
    const updateBubbles = (t, motion, reduceMotion) => {
      capeBubbles.forEach(({ b, u, v0, sp, r }) => {
        const f = reduceMotion ? v0 : (v0 + t * sp) % 1;
        const v = 0.3 + f * 0.62;
        capePoint(u + Math.sin(t * 0.8 + v0 * 9) * 0.01 * motion, v, b.position);
        const cz = lerp(HEAD.z - 0.02, 0, smooth(0.1, 0.45, v));
        const nx = b.position.x;
        const nz = b.position.z - cz;
        const nl = Math.hypot(nx, nz) || 1;
        b.position.x -= (nx / nl) * 0.012;
        b.position.z -= (nz / nl) * 0.012;
        b.scale.setScalar(r * Math.sin(f * Math.PI) * (1 + Math.sin(t * 3 + v0 * 20) * 0.15));
      });
    };
    const tailRibbons = [[0.16, 1.62, 1.0, 0.95, 0.13], [0.05, 1.5, 0.7, 0.75, 0.1]].map(([x0, y0, sideK, len, wid], k) => {
      const NS = 20;
      const pos = new Float32Array((NS + 1) * 2 * 3);
      const idx = [];
      for (let i = 0; i < NS; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setIndex(idx);
      const m = mesh(g, slimeMat, false);
      m.frustumCulled = false;
      torso.add(m);
      return { g, pos, NS, x0, y0, sideK, len, wid, k };
    });
    const updateRibbons = (t, motion, gust) => {
      tailRibbons.forEach(({ g, pos, NS, x0, y0, sideK, len, wid, k }) => {
        for (let i = 0; i <= NS; i++) {
          const f = i / NS;
          const wave = Math.sin(t * 2.4 - f * 5 + k * 1.3) * 0.07 * f * (1 + gust) * (0.4 + motion * 0.6);
          const cx = x0 + f * len * sideK * (0.85 + gust * 0.15);
          const cy = y0 - f * 0.25 - f * f * 0.25 * (1 - gust * 0.6) + wave;
          const cz = -0.36 - f * 0.45 + Math.sin(t * 1.7 - f * 4 + k) * 0.04 * f;
          let w = wid * (1 - f * 0.55);
          if (f > 0.8) w *= 0.6 + 0.4 * Math.abs(Math.sin(f * 40 + k));
          const tw = f * 0.6 + wave * 2;
          const o = i * 6;
          pos[o] = cx;
          pos[o + 1] = cy + w * Math.cos(tw);
          pos[o + 2] = cz + w * Math.sin(tw) * 0.5;
          pos[o + 3] = cx;
          pos[o + 4] = cy - w * Math.cos(tw);
          pos[o + 5] = cz - w * Math.sin(tw) * 0.5;
        }
        g.attributes.position.needsUpdate = true;
        g.computeVertexNormals();
      });
    };
    const DRIP_N = 28;
    const DRIP_R = 14;
    const makeDripGeo = () => {
      const pts = [];
      for (let i = 0; i <= DRIP_N; i++) pts.push(new THREE.Vector2(0.01, -i / DRIP_N));
      const g = new THREE.LatheGeometry(pts, DRIP_R);
      g.attributes.position.setUsage(THREE.DynamicDrawUsage);
      return g;
    };
    const shapeDrip = (g, l, br, pinch) => {
      const L = l + br * 2;
      const rn = 0.013 * (1 - pinch * 0.55);
      const yc = -(L - br);
      const arr = g.attributes.position.array;
      for (let j = 0; j <= DRIP_R; j++) {
        const a = (j / DRIP_R) * Math.PI * 2;
        const ca = Math.sin(a);
        const sa = Math.cos(a);
        for (let i = 0; i <= DRIP_N; i++) {
          const f = i / DRIP_N;
          const y = -f * L;
          const d = (y - yc) / br;
          const sph = br * Math.sqrt(Math.max(0, 1 - d * d));
          const neck = y > yc ? rn + 0.016 * Math.exp(y / 0.02) + (rn * 0.5) * Math.exp(-(y - yc - br) * (y - yc - br) / 0.0008) : 0;
          const r = Math.max(0.0004, (sph + neck + Math.sqrt((sph - neck) * (sph - neck) + 0.00002)) / 2 - 0.0022);
          const o = (j * (DRIP_N + 1) + i) * 3;
          arr[o] = r * ca;
          arr[o + 1] = y;
          arr[o + 2] = r * sa;
        }
      }
      g.attributes.position.needsUpdate = true;
      g.computeVertexNormals();
    };
    const tearGeo = (() => {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const f = i / 24;
        const r = f < 0.62 ? 0.03 * Math.pow(f / 0.62, 1.4) : 0.03 * Math.sqrt(Math.max(0, 1 - Math.pow((f - 0.62) / 0.38, 2)));
        pts.push(new THREE.Vector2(Math.max(0.0004, r), 0.05 - f * 0.1));
      }
      return new THREE.LatheGeometry(pts, 16);
    })();
    const capeDrips = [];
    const fallDrops = [];
    for (let k = 0; k < 9; k++) {
      const g = new THREE.Group();
      const len = 0.05 + ((k * 5) % 4) * 0.025;
      const dg = makeDripGeo();
      const stem = mesh(dg, dripMat, false);
      stem.frustumCulled = false;
      const bulb = new THREE.Group();
      const shine = mesh(new THREE.SphereGeometry(0.006, 8, 6), glowMat, false);
      bulb.add(shine);
      shine.position.set(-0.012, 0.01, 0.018);
      g.add(stem, bulb);
      torso.add(g);
      capeDrips.push({ stem, bulb, dg, len, ph: k * 1.7, period: 4.2 + ((k * 7) % 5) * 0.9 });
      shapeDrip(dg, len, 0.026, 0);
      const dm = dripMat.clone();
      const drop = mesh(tearGeo, dm, false);
      drop.scale.setScalar(1.43);
      drop.visible = false;
      root.add(drop);
      const pm = dripMat.clone();
      const puddle = mesh(new THREE.CircleGeometry(0.05, 18), pm, false);
      puddle.rotation.x = -Math.PI / 2;
      puddle.visible = false;
      root.add(puddle);
      fallDrops.push({ drop, dm, puddle, pm });
    }
    const dripW = V3(0, 0, 0);
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

    const WSEG = 16;
    const WRAD = 7;
    const wispIdx = [];
    for (let i = 0; i < WSEG; i++) {
      for (let j = 0; j < WRAD; j++) {
        const a = i * (WRAD + 1) + j;
        const b = a + WRAD + 1;
        wispIdx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
    const wisps = [];
    for (let i = 0; i < 22; i++) {
      const pos = new Float32Array((WSEG + 1) * (WRAD + 1) * 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setIndex(wispIdx);
      const m = std(i % 3 === 0 ? 0x7a3ac0 : 0x3a1858, 0.6, { transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, emissive: i % 3 === 0 ? 0x5a20a0 : 0x2a0c48, emissiveIntensity: 0.7 });
      const w = new THREE.Mesh(g, m);
      w.frustumCulled = false;
      root.add(w);
      const puffs = [0, 1].map(() => {
        const pm = std(0x2a1040, 0.7, { transparent: true, opacity: 0, depthWrite: false, emissive: 0x1a0830, emissiveIntensity: 0.5 });
        const pf = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), pm);
        root.add(pf);
        return { pf, pm };
      });
      wisps.push({ dir: V3(0, 0, -1), g, pos, m, w, puffs, sp: 0.28 + (i % 5) * 0.05, off: (i * 0.37) % 1, ph: i * 2.1, curl: 2.2 + (i % 4) * 0.7, last: 1, origin: V3(0, 0, 0), em: i, back: 0 });
    }
    const wispOrigin = (em, out) => {
      const nEm = capeDrips.length + tailRibbons.length * 2;
      const k = em % nEm;
      if (k < capeDrips.length) {
        const iu = Math.round(((k + 0.5) / capeDrips.length) * capeNU);
        const o = (capeNV * (capeNU + 1) + iu) * 3;
        const arr = capeGeo.attributes.position.array;
        out.set(arr[o], arr[o + 1] + 0.04, arr[o + 2]);
        torso.localToWorld(out);
      } else {
        const rb = tailRibbons[(k - capeDrips.length) % tailRibbons.length];
        const o = rb.NS * 6;
        const side = (k - capeDrips.length) >= tailRibbons.length ? 3 : 0;
        out.set(rb.pos[o + side], rb.pos[o + side + 1], rb.pos[o + side + 2]);
        torso.localToWorld(out);
      }
      root.worldToLocal(out);
      return out;
    };
    const updateWisps = (t, boost, reduceMotion) => {
      wisps.forEach(W => {
        const age = (t * W.sp * (1 + boost * 0.8) + W.off) % 1;
        if (age < W.last) {
          wispOrigin(W.em, W.origin);
          W.back = W.em % (capeDrips.length + tailRibbons.length * 2) < capeDrips.length ? 1 : 0;
          const c = torso.localToWorld(V3(0, 1.1, 0));
          root.worldToLocal(c);
          W.dir = V3(W.origin.x - c.x, 0, W.origin.z - c.z).normalize();
        }
        W.last = age;
        W.w.visible = !reduceMotion;
        const L = 0.18 + age * 0.75;
        const life = Math.sin(age * Math.PI);
        for (let i = 0; i <= WSEG; i++) {
          const f = i / WSEG;
          const sw = f * (0.6 + age);
          const cx = W.origin.x + Math.sin(f * W.curl + W.ph + t * 1.3) * 0.09 * sw + f * age * (0.25 * (1 - W.back) + W.dir.x * 0.45 * W.back);
          const cz = W.origin.z + Math.cos(f * W.curl * 0.8 + W.ph + t) * 0.07 * sw + f * age * (-0.08 * (1 - W.back) + W.dir.z * 0.45 * W.back);
          const cy = W.origin.y + (L * f + age * 0.15) * (1 - W.back * 0.35) - Math.sin(f * Math.PI) * 0.02;
          const rr = (0.006 + 0.03 * Math.pow(Math.sin(Math.PI * Math.pow(f, 0.65)), 1.2)) * (0.5 + age * 1.1) * (1 + 0.35 * Math.sin(f * 11 + W.ph + t * 2));
          for (let j = 0; j <= WRAD; j++) {
            const a = (j / WRAD) * Math.PI * 2 + f * 2.5;
            const o = (i * (WRAD + 1) + j) * 3;
            W.pos[o] = cx + Math.cos(a) * rr * 1.25;
            W.pos[o + 1] = cy + Math.sin(a * 2) * rr * 0.15;
            W.pos[o + 2] = cz + Math.sin(a) * rr * 0.7;
          }
        }
        W.g.attributes.position.needsUpdate = true;
        W.g.computeVertexNormals();
        W.m.opacity = life * 0.7 * (1 + boost * 0.4);
        W.puffs.forEach(({ pf, pm }, k) => {
          const f = 0.55 + k * 0.4;
          const sw = f * (0.6 + age);
          pf.visible = !reduceMotion;
          pf.position.set(W.origin.x + Math.sin(f * W.curl + W.ph + t * 1.3) * 0.09 * sw + f * age * (0.25 * (1 - W.back) + W.dir.x * 0.45 * W.back), W.origin.y + (L * f + age * 0.15) * (1 - W.back * 0.35), W.origin.z + Math.cos(f * W.curl * 0.8 + W.ph + t) * 0.07 * sw + f * age * (-0.08 * (1 - W.back) + W.dir.z * 0.45 * W.back));
          pf.scale.set(0.035 + age * 0.05, 0.025 + age * 0.03, 0.03 + age * 0.04);
          pf.rotation.set(t + k, t * 0.7 + W.ph, 0);
          pm.opacity = life * 0.16 * smooth(0.3, 0.8, age);
        });
      });
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
        torsoPivot.position.y = 0.8 - 0.1;
        torsoPivot.rotation.z = Math.sin(t * 0.6) * 0.02 * motion;
        headPivot.rotation.x = lerp(headPivot.rotation.x, headDown - pointer.y * 0.1, 0.1);
        headPivot.rotation.y = lerp(headPivot.rotation.y, pointer.x * 0.25, 0.08);
        headPivot.rotation.z = 0.16 + Math.sin(t * 0.8) * 0.02 * motion;

        arms.forEach(({ sh, el, s: sd }) => {
          sh.position.y = 1.44 + shoulder;
          sh.rotation.x = lerp(sh.rotation.x, -armFwd + Math.sin(t * 1.2 + sd) * 0.02 * motion, 0.15);
          sh.rotation.z = sd * (0.14 + breath * 0.01) + shake;
          el.rotation.x = -0.35 - armFwd * 1.5 - Math.abs(shake) * 2;
        });

        legs.forEach(({ hip, knee, foot, s: sd }) => {
          foot.rotation.z = -sd * 0.08;
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
          hip.rotation.z = sd * 0.42;
          knee.rotation.z = -sd * 0.34;
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
        capeMat.emissiveIntensity = slimeMat.emissiveIntensity;
        slimeTex.offset.y = reduceMotion ? 0 : (t * 0.035) % 1;
        glowMat.emissiveIntensity = 0.6 + hoodGlowK;
        venomMat.emissiveIntensity = 0.55 + Math.sin(t * 1.8) * 0.2 * motion + (hoodGlowK - 0.3) * 0.6;
        plumeTipMat.emissiveIntensity = 0.8 + Math.sin(t * 2.2) * 0.2 * motion + (hoodGlowK - 0.3) * 0.5;
        hoodGlow.forEach((d, i) => {
          d.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.15 * motion + (hoodGlowK - 0.3) * 0.3);
        });
        updateCape(t, reduceMotion ? 0 : motion);
        updateHood(t, reduceMotion ? 0 : motion);
        hoodMat.emissiveIntensity = slimeMat.emissiveIntensity;
        dripMat.emissiveIntensity = slimeMat.emissiveIntensity + 0.05;
        capeDrips.forEach(({ stem, bulb, dg, len, ph: dp, period }, k) => {
          const u = 0.1 + (k / (capeDrips.length - 1)) * 0.8;
          capePoint(u, 0.999, stem.parent.position);
          stem.parent.position.y += 0.02;
          const fd = fallDrops[k];
          if (reduceMotion || !motion) {
            fd.drop.visible = false;
            fd.puddle.visible = false;
            return;
          }
          const c = (((t + dp) / period) % 1 + 1) % 1;
          const grow = smooth(0, 0.75, c);
          const pull = smooth(0.55, 0.92, c);
          const l = len * (0.5 + grow * 0.5 + pull * 0.9) * (1 + Math.sin(t * 3 + dp) * 0.04);
          const br = c < 0.92 ? 0.012 + grow * 0.016 : 0.01;
          shapeDrip(dg, c < 0.92 ? l : len * 0.4, br, c < 0.92 ? pull : 0);
          stem.rotation.z = Math.sin(t * 2.3 + dp) * 0.05;
          stem.scale.set(1, 1, 1);
          bulb.position.set(0, -(l + br), 0);
          bulb.visible = c < 0.92;
          const tau = (((c - 0.92) % 1) + 1) % 1 * period;
          bulb.visible = c < 0.92;
          stem.parent.updateMatrixWorld(true);
          bulb.getWorldPosition(dripW);
          root.worldToLocal(dripW);
          const h0 = Math.max(0.05, dripW.y - 0.05);
          const gAcc = 7;
          const tFall = Math.sqrt((2 * h0) / gAcc);
          if (tau < tFall) {
            fd.drop.visible = true;
            fd.drop.position.set(dripW.x, dripW.y - 0.5 * gAcc * tau * tau, dripW.z);
            fd.drop.scale.set(1.43 * (1 - Math.min(0.2, tau * 0.4)), 1.43 * (1.1 + tau * 0.7), 1.43 * (1 - Math.min(0.2, tau * 0.4)));
            fd.dm.opacity = 0.88;
            fd.puddle.visible = false;
          } else if (tau < tFall + 1.4) {
            const q = (tau - tFall) / 1.4;
            fd.drop.visible = q < 0.08;
            fd.drop.position.y = 0.02;
            fd.drop.scale.set(1.43 * (1 + q * 8), 1.43 * Math.max(0.1, 0.6 - q * 6), 1.43 * (1 + q * 8));
            fd.puddle.visible = true;
            fd.puddle.position.set(dripW.x, 0.006, dripW.z);
            fd.puddle.scale.setScalar(0.4 + smooth(0, 0.25, q) * 0.8 + q * 0.2);
            fd.pm.opacity = 0.75 * (1 - smooth(0.4, 1, q));
          } else {
            fd.drop.visible = false;
            fd.puddle.visible = false;
          }
        });

        updateTail(t, 0.08 * motion);
        updateRibbons(t, motion, a === "shadow" || a === "fume" ? Math.sin(Math.min(1, p * 2) * Math.PI) : 0);

        updateBubbles(t, motion, reduceMotion);
        root.updateMatrixWorld(true);
        updateWisps(t, a === "shadow" || a === "fume" ? 1 : 0, reduceMotion);
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
