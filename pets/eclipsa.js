Pets.register({
  id: "eclipsa",
  dex: 31,
  name: "Eclipsa",
  color: "#5a3a8a",
  types: ["dark",  "psychic"],
  description: "Uma mariposa gigante com asas cobertas de olhos e padrões hipnóticos. Quando abre as asas por completo, a luz em volta some como num eclipse.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    glare: { duration: 2.4 },
    eclipse: { duration: 3.6 }
  },
  idle: [
    { action: "glare", min: 20, max: 45 },
    { action: "eclipse", min: 45, max: 90 }
  ],
  clickAction: n => ["glare", "eclipse", "jump", "glare"][(n - 1) % 4],

  create({ THREE, kit }) {
    const STAGE = 3;
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
    const M = (c, r, m, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r === undefined ? 0.5 : r, metalness: m || 0 }, extra || {}));
    const taper = (pts, r0, r1, radial, segs) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const sg = segs || 24;
      const rd = radial || 10;
      const g = new THREE.TubeGeometry(curve, sg, 1, rd, false);
      const pos = g.attributes.position;
      const c = V3(0, 0, 0);
      const p = V3(0, 0, 0);
      for (let i = 0; i <= sg; i++) {
        const u = i / sg;
        curve.getPointAt(u, c);
        const r = typeof r0 === "function" ? r0(u) : lerp(r0, r1, u);
        for (let j = 0; j <= rd; j++) {
          const k = i * (rd + 1) + j;
          p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
          pos.setXYZ(k, p.x, p.y, p.z);
        }
      }
      g.computeVertexNormals();
      return g;
    };
    const canvasTex = (w, h, draw) => {
      if (typeof document === "undefined") return null;
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      draw(cv.getContext("2d"), w, h);
      const tx = new THREE.CanvasTexture(cv);
      tx.wrapS = THREE.RepeatWrapping;
      tx.wrapT = THREE.RepeatWrapping;
      return tx;
    };
    let rseed = 1234 + STAGE * 77;
    const rnd = () => {
      rseed = (rseed * 16807) % 2147483647;
      return rseed / 2147483647;
    };
    const noise = (a, b) => Math.sin(a * 12.9898 + b * 78.233) * 0.5 + Math.sin(a * 4.1 + b * 9.7) * 0.5;
    const ACT = (s, name) => (s.action && s.action.name === name ? s.action : null);
    const groundRing = (color, r0, r1) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.y = 0.012;
      return m;
    };

    const root = new THREE.Group();
    const scaleG = new THREE.Group();
    scaleG.scale.setScalar([0, 1.3, 1.3, 1.15][STAGE]);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);

    const velvet = M(0x1c1626, 0.95);
    const velvetDark = M(0x0e0a14, 0.95);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xb38cff });
    const furTex = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = "#888";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2500; i++) {
        const v = (90 + rnd() * 120) | 0;
        g.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
        g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 3);
      }
    });
    if (furTex) {
      velvet.bumpMap = furTex;
      velvet.bumpScale = 0.02;
    }

    const eyeSpots = [];
    const fakeEye = (r, col) => {
      const g = new THREE.Group();
      const ring = new THREE.Mesh(new THREE.CircleGeometry(r, 28), new THREE.MeshBasicMaterial({ color: col }));
      const iris = new THREE.Mesh(new THREE.CircleGeometry(r * 0.62, 28), new THREE.MeshBasicMaterial({ color: 0x120a1c }));
      iris.position.z = 0.002;
      const shine = new THREE.Mesh(new THREE.CircleGeometry(r * 0.18, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      shine.position.set(r * 0.22, r * 0.22, 0.004);
      const lid = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 28), new THREE.MeshBasicMaterial({ color: 0x1c1626 }));
      lid.position.z = 0.006;
      lid.scale.y = 0;
      g.add(ring, iris, shine, lid);
      eyeSpots.push({ g, lid, ph: rnd() * 10 });
      return g;
    };

    const eyes = [];
    let segs = [];
    let cocoon = null;
    let wings = [];
    let headG = null;
    const runes = [];

    if (STAGE === 1) {
      const N = 7;
      for (let k = 0; k < N; k++) {
        const r = 0.24 - Math.abs(k - 2) * 0.012;
        const sg = mesh(new THREE.SphereGeometry(r, 24, 18), k % 2 ? velvet : velvetDark);
        bodyG.add(sg);
        const legs = [];
        if (k > 0 && k < N - 1) {
          [-1, 1].forEach(s => {
            const l = mesh(new THREE.SphereGeometry(0.045, 8, 6), M(0x2a2236, 0.8), false);
            l.position.set(r * 0.7 * s, -r * 0.75, 0);
            sg.add(l);
            legs.push(l);
          });
        }
        if (k === 2 || k === 4) {
          [-1, 1].forEach(s => {
            const fe = fakeEye(0.07, 0xc8a8ff);
            fe.position.set(r * 0.55 * s, r * 0.72, 0);
            fe.rotation.set(-1.0, 0, -0.6 * s);
            sg.add(fe);
          });
        }
        for (let j = 0; j < 5; j++) {
          const hair = mesh(new THREE.ConeGeometry(0.012, 0.12, 4), velvetDark, false);
          const a = Math.PI / 2 + (j - 2) * 0.45;
          hair.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
          hair.rotation.z = a - Math.PI / 2;
          sg.add(hair);
        }
        segs.push({ m: sg, r, k });
      }
      headG = new THREE.Group();
      bodyG.add(headG);
      const head = mesh(new THREE.SphereGeometry(0.26, 28, 20), velvet);
      headG.add(head);
      [-1, 1].forEach(s => {
        const e = eye({ size: 0.5, whiteColor: 0xd8c8ff, pupilColor: 0x10081a });
        e.g.position.set(0.1 * s, 0.05, 0.21);
        e.g.rotation.y = 0.3 * s;
        headG.add(e.g);
        eyes.push(e);
        const ant = mesh(taper([V3(0.08 * s, 0.2, 0.05), V3(0.14 * s, 0.34, 0.08), V3(0.2 * s, 0.4, 0.02)], 0.015, 0.006, 5, 8), velvetDark, false);
        headG.add(ant);
      });
    } else if (STAGE === 2) {
      cocoon = new THREE.Group();
      bodyG.add(cocoon);
      const hang = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.4, 6), M(0xd8d0e8, 0.6));
      hang.position.y = 2.75;
      bodyG.add(hang);
      const branch = mesh(taper([V3(-0.9, 3.45, -0.1), V3(0, 3.42, 0), V3(0.9, 3.5, 0.1)], 0.07, 0.05, 8, 10), M(0x3a2a20, 0.9));
      bodyG.add(branch);
      const lathe = [];
      for (let k = 0; k <= 24; k++) {
        const u = k / 24;
        const r = Math.sin(Math.PI * Math.pow(u, 0.8)) * 0.42 * (1 - 0.25 * u) + 0.01;
        lathe.push(new THREE.Vector2(r, u * 1.5));
      }
      const cg = new THREE.LatheGeometry(lathe, 40);
      cg.translate(0, -0.75, 0);
      const silkTex = canvasTex(128, 256, (g, w, h) => {
        g.fillStyle = "#8a80a0";
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(220,210,240,0.5)";
        for (let i = 0; i < 60; i++) {
          g.lineWidth = 0.5 + rnd() * 1.5;
          g.beginPath();
          const y = rnd() * h;
          g.moveTo(0, y);
          g.bezierCurveTo(w * 0.3, y + (rnd() - 0.5) * 30, w * 0.7, y + (rnd() - 0.5) * 30, w, y + (rnd() - 0.5) * 20);
          g.stroke();
        }
      });
      const shell = mesh(cg, new THREE.MeshStandardMaterial({ color: 0x4a3a62, roughness: 0.8, map: silkTex, bumpMap: silkTex, bumpScale: 0.02 }));
      cocoon.add(shell);
      for (let k = 0; k < 7; k++) {
        const rs = new THREE.Shape();
        const kind = k % 3;
        if (kind === 0) {
          rs.moveTo(-0.04, -0.06);
          rs.lineTo(0, 0.06);
          rs.lineTo(0.04, -0.06);
          rs.lineTo(0.025, -0.06);
          rs.lineTo(0, 0.02);
          rs.lineTo(-0.025, -0.06);
        } else if (kind === 1) {
          rs.absarc(0, 0, 0.05, 0, Math.PI * 2, false);
          const h2 = new THREE.Path();
          h2.absarc(0, 0, 0.032, 0, Math.PI * 2, true);
          rs.holes.push(h2);
        } else {
          rs.moveTo(-0.01, -0.07);
          rs.lineTo(0.01, -0.07);
          rs.lineTo(0.01, 0.07);
          rs.lineTo(-0.01, 0.07);
        }
        const rm = new THREE.Mesh(new THREE.ShapeGeometry(rs), glowMat);
        const a = (k / 7) * Math.PI * 2;
        const yy = -0.35 + (k % 4) * 0.22;
        const rr = Math.sin(Math.PI * Math.pow((yy + 0.75) / 1.5, 0.8)) * 0.42 * (1 - 0.25 * (yy + 0.75) / 1.5) + 0.012;
        rm.position.set(Math.sin(a) * rr, yy, Math.cos(a) * rr);
        rm.lookAt(rm.position.x * 2, yy, rm.position.z * 2);
        cocoon.add(rm);
        runes.push({ m: rm, k });
      }
      [-1, 1].forEach(s => {
        const e = eye({ size: 0.42, whiteColor: 0xd8c8ff, pupilColor: 0x10081a });
        e.g.position.set(0.09 * s, 0.25, 0.38);
        e.g.rotation.y = 0.25 * s;
        cocoon.add(e.g);
        eyes.push(e);
      });
    } else {
      const thorax = mesh(new THREE.SphereGeometry(1, 28, 22), velvet);
      thorax.scale.set(0.24, 0.28, 0.24);
      thorax.position.y = 1.55;
      bodyG.add(thorax);
      const ruff = mesh(new THREE.SphereGeometry(1, 28, 22), M(0xcfc4e0, 0.95, 0, furTex ? { bumpMap: furTex, bumpScale: 0.04 } : {}));
      ruff.scale.set(0.3, 0.16, 0.3);
      ruff.position.y = 1.72;
      bodyG.add(ruff);
      const abd = mesh(taper([V3(0, 1.4, -0.02), V3(0, 1.05, -0.08), V3(0, 0.7, -0.05), V3(0, 0.5, 0.02)], u => 0.2 * Math.sin(Math.PI * (0.15 + u * 0.8)) + 0.03, 0, 16, 20), velvet);
      bodyG.add(abd);
      for (let k = 0; k < 4; k++) {
        const band = mesh(new THREE.TorusGeometry(0.17 - Math.abs(k - 1.5) * 0.02, 0.025, 6, 20), velvetDark, false);
        band.rotation.x = Math.PI / 2;
        band.position.set(0, 1.25 - k * 0.17, -0.06);
        bodyG.add(band);
      }
      headG = new THREE.Group();
      headG.position.set(0, 1.92, 0.06);
      bodyG.add(headG);
      headG.add(mesh(new THREE.SphereGeometry(0.18, 24, 18), velvet));
      [-1, 1].forEach(s => {
        const e = eye({ size: 0.45, whiteColor: 0xe0d0ff, pupilColor: 0x2a0a4a });
        e.g.children[0].material = new THREE.MeshBasicMaterial({ color: 0xc8a8ff });
        e.g.position.set(0.09 * s, 0.03, 0.13);
        e.g.rotation.y = 0.35 * s;
        headG.add(e.g);
        eyes.push(e);
        const plume = new THREE.Group();
        plume.position.set(0.06 * s, 0.14, 0.04);
        const stem = [V3(0, 0, 0), V3(0.12 * s, 0.22, 0.02), V3(0.3 * s, 0.38, -0.05)];
        plume.add(mesh(taper(stem, 0.014, 0.006, 5, 10), velvetDark, false));
        const c = new THREE.CatmullRomCurve3(stem);
        for (let j = 1; j < 10; j++) {
          const p = c.getPointAt(j / 10);
          [-1, 1].forEach(side => {
            const barb = mesh(new THREE.ConeGeometry(0.008, 0.09 * (1 - j / 12), 4), M(0x8a7aa8, 0.8), false);
            barb.position.copy(p);
            barb.rotation.z = side * 1.1 - s * 0.5;
            plume.add(barb);
          });
        }
        headG.add(plume);
      });

      const wingTex = canvasTex(256, 256, (g, w, h) => {
        const gr = g.createRadialGradient(w * 0.15, h * 0.5, 10, w * 0.4, h * 0.5, w * 0.9);
        gr.addColorStop(0, "#3a2458");
        gr.addColorStop(0.6, "#1a1028");
        gr.addColorStop(1, "#0a0610");
        g.fillStyle = gr;
        g.fillRect(0, 0, w, h);
        g.strokeStyle = "rgba(200,170,255,0.35)";
        g.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          g.beginPath();
          g.moveTo(0, h * 0.5);
          g.quadraticCurveTo(w * 0.5, h * (0.1 + i * 0.1), w, h * (i / 8));
          g.stroke();
        }
        g.strokeStyle = "rgba(255,230,180,0.35)";
        g.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
          g.beginPath();
          g.arc(w * 0.92, h * 0.5, w * (0.18 + i * 0.12), Math.PI * 0.55, Math.PI * 1.45);
          g.stroke();
        }
        for (let i = 0; i < 400; i++) {
          g.fillStyle = "rgba(220,200,255," + rnd() * 0.25 + ")";
          g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5);
        }
      });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wingTex, roughness: 0.9, side: THREE.DoubleSide, emissive: 0x2a1048, emissiveIntensity: 0.35 });
      const fore = new THREE.Shape();
      fore.moveTo(0, 0);
      fore.bezierCurveTo(0.4, 0.55, 1.1, 0.75, 1.45, 0.55);
      fore.bezierCurveTo(1.5, 0.25, 1.3, -0.05, 0.95, -0.2);
      fore.bezierCurveTo(0.6, -0.22, 0.25, -0.12, 0, 0);
      const hind = new THREE.Shape();
      hind.moveTo(0, 0);
      hind.bezierCurveTo(0.35, -0.05, 0.85, -0.2, 1.0, -0.55);
      hind.bezierCurveTo(1.0, -0.95, 0.75, -1.15, 0.55, -1.2);
      hind.bezierCurveTo(0.35, -0.95, 0.12, -0.4, 0, 0);
      const fitUV = (geo) => {
        geo.computeBoundingBox();
        const bb = geo.boundingBox;
        const pos = geo.attributes.position;
        const uv = geo.attributes.uv;
        for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
        return geo;
      };
      const foreGeo = fitUV(new THREE.ShapeGeometry(fore, 24));
      const hindGeo = fitUV(new THREE.ShapeGeometry(hind, 24));
      wings = [-1, 1].map(s => {
        const g = new THREE.Group();
        g.position.set(0.12 * s, 1.55, -0.12);
        const fm = new THREE.Mesh(foreGeo, wingMat);
        fm.scale.set(s, 1, 1);
        g.add(fm);
        const hm = new THREE.Mesh(hindGeo, wingMat);
        hm.scale.set(s, 1, 1);
        hm.position.z = -0.01;
        g.add(hm);
        [[1.0, 0.25, 0.17, 0xffd27a], [0.62, -0.62, 0.13, 0xc8a8ff], [0.5, 0.25, 0.08, 0xc8a8ff], [0.32, -0.25, 0.06, 0xffd27a]].forEach(([x, y, r, c]) => {
          const fe = fakeEye(r, c);
          fe.position.set(x * s, y, 0.006);
          g.add(fe);
          const fe2 = fakeEye(r, c);
          fe2.position.set(x * s, y, -0.02);
          fe2.rotation.y = Math.PI;
          g.add(fe2);
        });
        bodyG.add(g);
        return { g, s };
      });
      const legs = [];
      for (let k = 0; k < 3; k++) {
        [-1, 1].forEach(s => {
          const l = mesh(taper([V3(0.1 * s, 1.5 - k * 0.06, 0.12), V3(0.25 * s, 1.35 - k * 0.08, 0.2), V3(0.22 * s, 1.1 - k * 0.1, 0.25)], 0.02, 0.01, 5, 8), velvetDark, false);
          bodyG.add(l);
        });
      }
    }

    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd8c0ff, transparent: true, opacity: 0.7, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 20; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), dustMat);
      scaleG.add(m);
      dust.push({ m, ph: rnd(), a: rnd() * Math.PI * 2, r: 0.3 + rnd() * 0.9 });
    }
    const dark = new THREE.Mesh(new THREE.SphereGeometry(14, 24, 16), new THREE.MeshBasicMaterial({ color: 0x05030a, transparent: true, opacity: 0, side: THREE.BackSide, depthWrite: false }));
    dark.position.y = 1.2;
    scaleG.add(dark);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 64), new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    halo.position.set(0, 1.55, -0.3);
    scaleG.add(halo);
    const ring = groundRing(0x8a5ad8, 0.9, 1.05);
    root.add(ring);

    const food = berry();
    food.visible = false;
    scaleG.add(food);

    const crawlPos = V3(0, 0, 0);
    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, motion } = s;
        const jump = ACT(s, "jump");
        const eat = ACT(s, "eat");
        const glare = ACT(s, "glare");
        const ecl = ACT(s, "eclipse");
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let airborne = false;
        if (jump) {
          const p = jump.p;
          if (p > 0.2 && p < 0.8) {
            y = Math.sin(((p - 0.2) / 0.6) * Math.PI) * (STAGE === 2 ? 0.25 : 0.6);
            airborne = true;
          }
        }
        let stare = 0;
        if (glare) stare = smooth(0, 0.15, glare.p) * (1 - smooth(0.85, 1, glare.p));
        let dim = 0;
        let open = 0;
        if (ecl) {
          const k = smooth(0, 0.25, ecl.p) * (1 - smooth(0.75, 1, ecl.p));
          dim = k;
          open = k;
        }
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;

        if (STAGE === 1) {
          const n = segs.length;
          for (let i = 0; i < n; i++) {
            const sg = segs[i];
            const u = i / (n - 1);
            const wave = Math.max(0, Math.sin(t * 3 - i * 0.9)) * 0.1 * motion;
            const rear = stare * Math.max(0, (u - 0.5) * 2) * 0.45;
            sg.m.position.set(Math.sin(t * 1.2 + i * 0.6) * 0.05 * motion, sg.r + wave + rear * 1.4, lerp(-0.85, 0.75, u));
          }
          const last = segs[n - 1].m.position;
          headG.position.set(last.x, last.y + 0.08 + stare * 0.15, last.z + 0.2);
          headG.rotation.x = -stare * 0.4 + (eat ? -0.3 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.1 : 0);
          headG.rotation.y = pointer.x * 0.2 + Math.sin(t * 0.7) * 0.15 * motion;
        } else if (STAGE === 2) {
          cocoon.position.set(0, 1.35 + Math.sin(t * 0.9) * 0.03 * motion, 0);
          cocoon.rotation.z = Math.sin(t * 0.7) * 0.06 * motion + (jump ? Math.sin(t * 20) * 0.08 : 0);
          cocoon.rotation.y = Math.sin(t * 0.4) * 0.3 + stare * Math.sin(t * 12) * 0.05;
          cocoon.scale.set(1 + dim * 0.08 + Math.sin(t * 2) * 0.01, 1, 1 + dim * 0.08);
          runes.forEach(r => {
            r.m.material.color.setHSL(0.74, 0.8, 0.5 + 0.2 * Math.max(0, Math.sin(t * 2 + r.k)) + dim * 0.25 + stare * 0.15);
          });
        } else {
          bodyG.position.y = Math.sin(t * 1.4) * 0.06 * motion + 0.05 + dim * 0.2;
          const beat = Math.sin(t * (ecl ? 2 : 4)) * (0.25 + (airborne ? 0.4 : 0)) * motion;
          wings.forEach(({ g, s: sd }) => {
            const spread = lerp(0.55, 0.0, open);
            g.rotation.y = sd * (spread + beat * (1 - open * 0.6));
            g.rotation.z = sd * (0.12 + open * 0.15);
            g.scale.setScalar(1 + open * 0.25);
          });
          headG.rotation.x = eat ? -0.3 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.1 : -stare * 0.15;
          headG.rotation.y = pointer.x * 0.2;
          halo.material.opacity = open * 0.55;
          halo.scale.setScalar(1 + open * 0.4);
          halo.rotation.z = t * 0.3;
        }
        eyeSpots.forEach(es => {
          const blinkSpot = Math.max(0, Math.sin(t * 0.9 + es.ph) - 0.93) * 14;
          es.lid.scale.y = Math.min(1, blinkSpot) * (1 - stare);
          es.g.scale.setScalar(1 + stare * 0.25 * (0.5 + 0.5 * Math.sin(t * 6 + es.ph)));
        });
        glowMat.color.setHSL(0.74, 0.9, 0.6 + stare * 0.15 + dim * 0.2);
        dark.material.opacity = dim * 0.55;
        dust.forEach(d => {
          const u = (((t * 0.25 + d.ph) % 1) + 1) % 1;
          const a = d.a + t * 0.5;
          const base = STAGE === 3 ? 1.3 : STAGE === 2 ? 1.3 : 0.4;
          d.m.position.set(Math.cos(a) * d.r * (1 + open * 0.6), base - u * 1.2 + open * 0.4, Math.sin(a) * d.r * (1 + open * 0.6));
          d.m.scale.setScalar(Math.max(0.01, Math.sin(u * Math.PI)) * (STAGE === 1 ? 0.4 : 1));
        });
        ring.scale.setScalar(1 + dim * 0.5 + stare * 0.2 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = 0.14 + dim * 0.3 + stare * 0.15;

        eyes.forEach(({ g }) => {
          g.scale.y = stare > 0.3 ? 1.2 : eat && eat.p > 0.3 ? 0.45 : blink;
        });
        followPupils(eyes, pointer, 0.5);

        if (eat) {
          food.visible = ph.visible;
          const hp = STAGE === 1 ? headG.position : STAGE === 2 ? V3(0, 1.6, 0.4) : V3(0, 1.9 + bodyG.position.y, 0.2);
          food.position.set(hp.x, lerp(3.2, hp.y - 0.05, ph.fall * ph.fall), hp.z + 0.25);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.6);
        } else food.visible = false;
      }
    };
  }
});
