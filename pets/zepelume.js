Pets.register({
  id: "zepelume",
  dex: 27,
  name: "Zepelume",
  color: "#7fa8c8",
  types: ["flying", "steel"],
  description: "Quando o Balãozinho cresce, vira uma baleia do céu com placas de aço nas costas. Nada entre as nuvens batendo as nadadeiras devagar, e a lanterna da testa guia os bandos perdidos de volta para casa nas noites de tempestade.",
  actions: {
    jump: { duration: 2.0 },
    eat: { duration: 2.6 },
    beam: { duration: 2.8 },
    attack: { duration: 1.2 }
  },
  battle: { special: { action: "beam", hit: 0.25, speed: 1.3 } },
  idle: [
    { action: "beam", min: 25, max: 50 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["beam", "jump", "beam"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry, strike } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);

    const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let sd = 9;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };
      draw(g, rnd, w, h);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      return t;
    };
    const plates = bump => (g, rnd, w, h) => {
      g.fillStyle = bump ? "#9a9a9a" : "#ffffff";
      g.fillRect(0, 0, w, h);
      const cols = 6;
      const rows = 8;
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * cw * 0.5;
        for (let c = -1; c <= cols; c++) {
          const x = c * cw + off;
          const y = r * rh;
          if (!bump) {
            const v = 228 + Math.floor((rnd() - 0.5) * 30);
            g.fillStyle = "rgb(" + v + "," + v + "," + v + ")";
            g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
            const gr = g.createLinearGradient(x, y, x, y + rh);
            gr.addColorStop(0, "rgba(255,255,255,0.18)");
            gr.addColorStop(1, "rgba(0,0,0,0.1)");
            g.fillStyle = gr;
            g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
          } else {
            g.fillStyle = "#c0c0c0";
            g.fillRect(x + 2, y + 2, cw - 4, rh - 4);
          }
          g.fillStyle = bump ? "#303030" : "rgba(30,45,60,0.55)";
          g.fillRect(x, y, cw, 1.5);
          g.fillRect(x, y, 1.5, rh);
          g.fillStyle = bump ? "#ffffff" : "rgba(255,255,255,0.85)";
          for (let k = 0; k < 4; k++) {
            g.beginPath();
            g.arc(x + 5 + (k * (cw - 10)) / 3, y + 5, 1.7, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
    };
    const plateTex = canvasTex(512, 512, plates(false), 4, 3);
    const plateBump = canvasTex(512, 512, plates(true), 4, 3);
    const skinDraw = bump => (g, rnd, w, h) => {
      g.fillStyle = bump ? "#808080" : "#ffffff";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 18; i++) {
        const x = (i / 18) * w;
        const gr = g.createLinearGradient(x, 0, x + w / 18, 0);
        gr.addColorStop(0, bump ? "#909090" : "rgba(255,255,255,0)");
        gr.addColorStop(0.5, bump ? "#303030" : "rgba(200,90,90,0.45)");
        gr.addColorStop(1, bump ? "#909090" : "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(x + w / 18 * 0.35, 0, (w / 18) * 0.3, h);
      }
      for (let i = 0; i < 300; i++) {
        g.fillStyle = bump ? "rgba(255,255,255,0.2)" : "rgba(255,240,220,0.2)";
        g.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
    };
    const skinTex = canvasTex(256, 256, skinDraw(false), 1, 2);
    const skinBump = canvasTex(256, 256, skinDraw(true), 1, 2);
    const glowTex = canvasTex(128, 128, (g, rnd, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, "rgba(255,255,255,0.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    const beamTex = canvasTex(64, 256, (g, rnd, w, h) => {
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, "rgba(255,255,255,0.9)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "destination-out";
      const sg = g.createLinearGradient(0, 0, w, 0);
      sg.addColorStop(0, "rgba(0,0,0,1)");
      sg.addColorStop(0.5, "rgba(0,0,0,0)");
      sg.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = sg;
      g.fillRect(0, 0, w, h);
    });
    const finTex = canvasTex(128, 256, (g, rnd, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) {
        g.strokeStyle = "rgba(40,80,130,0.22)";
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(w * 0.1, h);
        g.quadraticCurveTo(w * (0.2 + i * 0.15), h * 0.5, w * (0.15 + i * 0.18), 0);
        g.stroke();
      }
    });

    const steel = new THREE.MeshStandardMaterial({ color: 0xa8cbe6, map: plateTex, bumpMap: plateBump, bumpScale: 0.006, metalness: 0.4, roughness: 0.38 });
    const armor = new THREE.MeshStandardMaterial({ color: 0x7ea6c8, map: plateTex, bumpMap: plateBump, bumpScale: 0.006, metalness: 0.65, roughness: 0.3, side: THREE.DoubleSide });
    const skin = new THREE.MeshStandardMaterial({ color: 0xfff0dc, map: skinTex, bumpMap: skinBump, bumpScale: 0.01, roughness: 0.6 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd8a84e, roughness: 0.28, metalness: 0.85 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3a4450, roughness: 0.4, metalness: 0.8 });
    const finMat = new THREE.MeshStandardMaterial({ color: 0x9fd0ff, map: finTex, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x4a1a24, roughness: 0.5 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff7f8f, roughness: 0.5 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.55 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff6c8, emissive: 0xffd060, emissiveIntensity: 1.6, roughness: 0.15 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xd0eeff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, emissive: 0xe8f2ff, emissiveIntensity: 0.25 });
    const lampGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd070, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: 0xfff0b0, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });

    const loft = (nodes, rad, per, a0 = 0, a1 = Math.PI * 2) => {
      const n = nodes.length;
      const segs = (n - 1) * per;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array((segs + 1) * (rad + 1) * 3);
      const uv = new Float32Array((segs + 1) * (rad + 1) * 2);
      const idx = [];
      for (let i = 0; i < segs; i++)
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, a + 1, b, b, a + 1, b + 1);
        }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const update = list => {
        const curve = new THREE.CatmullRomCurve3(list.map(q => q.p), false, "centripetal");
        const tng = V3(0, 0, 0);
        const side = V3(0, 0, 0);
        const up = V3(0, 0, 0);
        let len = 0;
        let prev = null;
        for (let i = 0; i <= segs; i++) {
          const f = i / segs;
          const c = curve.getPoint(f);
          curve.getTangent(f, tng);
          const k = f * (n - 1);
          const i0 = Math.min(n - 2, Math.floor(k));
          const u = k - i0;
          const s = u * u * (3 - 2 * u);
          const rx = lerp(list[i0].rx, list[i0 + 1].rx, s);
          const ry = lerp(list[i0].ry, list[i0 + 1].ry, s);
          side.crossVectors(V3(0, 1, 0), tng).normalize();
          up.crossVectors(tng, side).normalize();
          if (prev) len += c.distanceTo(prev);
          prev = c.clone();
          for (let j = 0; j <= rad; j++) {
            const a = a0 + (j / rad) * (a1 - a0);
            const o = (i * (rad + 1) + j) * 3;
            pos[o] = c.x + side.x * Math.cos(a) * rx + up.x * Math.sin(a) * ry;
            pos[o + 1] = c.y + side.y * Math.cos(a) * rx + up.y * Math.sin(a) * ry;
            pos[o + 2] = c.z + side.z * Math.cos(a) * rx + up.z * Math.sin(a) * ry;
            uv[(i * (rad + 1) + j) * 2] = j / rad;
            uv[(i * (rad + 1) + j) * 2 + 1] = len * 0.7;
          }
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.uv.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
      };
      update(nodes);
      return { geo, update };
    };

    const BASE = [
      [-2.05, 0.18, 0.03, 0.03],
      [-1.8, 0.12, 0.13, 0.12],
      [-1.4, 0.06, 0.3, 0.27],
      [-0.85, 0.0, 0.56, 0.5],
      [-0.2, 0.0, 0.78, 0.68],
      [0.45, 0.02, 0.84, 0.74],
      [0.98, 0.04, 0.78, 0.7],
      [1.36, 0.02, 0.6, 0.56],
      [1.58, -0.02, 0.42, 0.4],
      [1.7, -0.03, 0.24, 0.23],
      [1.76, -0.03, 0.08, 0.08],
      [1.77, -0.03, 0.01, 0.01]
    ];
    const nodes = BASE.map(([z, y, rx, ry]) => ({ p: V3(0, y, z), rx, ry }));
    const shellNodes = nodes.map(q => ({ p: q.p.clone(), rx: q.rx * 1.004, ry: q.ry * 1.004 }));
    const rAt = z => {
      for (let i = 0; i < BASE.length - 1; i++) {
        if (z >= BASE[i][0] && z <= BASE[i + 1][0]) {
          const u = (z - BASE[i][0]) / (BASE[i + 1][0] - BASE[i][0]);
          const s = u * u * (3 - 2 * u);
          return { rx: lerp(BASE[i][2], BASE[i + 1][2], s), ry: lerp(BASE[i][3], BASE[i + 1][3], s), y: lerp(BASE[i][1], BASE[i + 1][1], s) };
        }
      }
      return { rx: 0.04, ry: 0.04, y: 0 };
    };

    const root = new THREE.Group();
    const whale = new THREE.Group();
    whale.position.y = 1.55;
    whale.rotation.y = -0.32;
    root.add(whale);

    const top = loft(shellNodes, 40, 10, -0.18, Math.PI + 0.18);
    whale.add(mesh(top.geo, steel));
    const belly = loft(nodes, 40, 10, Math.PI, Math.PI * 2);
    whale.add(mesh(belly.geo, skin));

    const shells = [];
    [[-0.95, 0.42], [-0.5, 0.46], [-0.02, 0.5], [0.46, 0.46]].forEach(([z, len], k) => {
      const r0 = rAt(z - len / 2);
      const r1 = rAt(z + len / 2);
      const g = new THREE.PlaneGeometry(1, 1, 32, 8);
      const p = g.attributes.position;
      for (let q = 0; q < p.count; q++) {
        const u = p.getY(q) + 0.5;
        const v = p.getX(q) + 0.5;
        const a = -Math.PI * 0.42 + v * Math.PI * 0.84;
        const zz = -len / 2 + u * len;
        const rr = rAt(z + zz);
        const off = 0.05 + (1 - u) * 0.04;
        p.setXYZ(q, Math.sin(a) * (rr.rx + off), Math.cos(a) * (rr.ry + off) + rr.y - rAt(z).y, zz);
      }
      g.computeVertexNormals();
      const pv = new THREE.Group();
      pv.position.set(0, rAt(z).y, z);
      const sh = mesh(g, armor);
      pv.add(sh);
      const edgePts = [];
      for (let i = 0; i <= 24; i++) {
        const a = -Math.PI * 0.42 + (i / 24) * Math.PI * 0.84;
        const rr = rAt(z - len / 2);
        edgePts.push(V3(Math.sin(a) * (rr.rx + 0.095), Math.cos(a) * (rr.ry + 0.095), -len / 2));
      }
      pv.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts), 40, 0.022, 8), brass, false));
      for (let i = 1; i < 6; i++) {
        const a = -Math.PI * 0.36 + (i / 6) * Math.PI * 0.72;
        const rr = rAt(z - len / 2 + 0.08);
        const rv = mesh(new THREE.SphereGeometry(0.022, 10, 8), brass, false);
        rv.position.set(Math.sin(a) * (rr.rx + 0.1), Math.cos(a) * (rr.ry + 0.1), -len / 2 + 0.08);
        pv.add(rv);
      }
      whale.add(pv);
      shells.push(pv);
    });

    const rotors = [-1, 1].map(s => {
      const pv = new THREE.Group();
      const r = rAt(-1.15);
      pv.position.set(r.rx * 0.75 * s, r.y + r.ry * 0.6, -1.15);
      pv.rotation.set(0, 0, -s * 0.6);
      whale.add(pv);
      const ring = mesh(new THREE.TorusGeometry(0.14, 0.03, 12, 32), brass, false);
      pv.add(ring);
      const housing = mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.1, 32, 1, true), darkMetal, false);
      housing.rotation.x = Math.PI / 2;
      housing.material.side = THREE.DoubleSide;
      pv.add(housing);
      const hub = new THREE.Group();
      pv.add(hub);
      hub.add(mesh(new THREE.SphereGeometry(0.035, 12, 10), brass, false));
      for (let k = 0; k < 5; k++) {
        const b = mesh(new THREE.BoxGeometry(0.035, 0.12, 0.008), finMat, false);
        b.position.y = 0.065;
        const arm = new THREE.Group();
        arm.rotation.z = (k / 5) * Math.PI * 2;
        b.rotation.y = 0.5;
        arm.add(b);
        hub.add(arm);
      }
      return hub;
    });

    const flipper = s => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.2);
      sh.bezierCurveTo(0.32, 0.26, 0.72, 0.16, 1.02, -0.02);
      sh.quadraticCurveTo(1.14, -0.1, 1.04, -0.15);
      const trail = [[1.04, -0.15], [0.8, -0.16], [0.58, -0.2], [0.36, -0.23], [0.16, -0.25], [0, -0.22]];
      for (let k = 1; k < trail.length; k++) {
        const [x0, y0] = trail[k - 1];
        const [x1, y1] = trail[k];
        sh.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 0.07, x1, y1);
      }
      sh.lineTo(0, 0.2);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3, curveSegments: 16 });
      g.translate(0, 0, -0.02);
      const p = g.attributes.position;
      const uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        p.setZ(i, p.getZ(i) * (1 - x * 0.6) - x * x * 0.08);
        uv.setXY(i, x, p.getY(i) + 0.5);
      }
      g.computeVertexNormals();
      const m = mesh(g, finMat);
      if (s < 0) m.scale.x = -1;
      return m;
    };
    const flippers = [-1, 1].map(s => {
      const pv = new THREE.Group();
      const r = rAt(0.55);
      pv.position.set(r.rx * 0.8 * s, r.y - r.ry * 0.55, 0.55);
      pv.rotation.order = "ZYX";
      pv.rotation.set(0.75, 0.4 * s, -0.5 * s);
      whale.add(pv);
      const f = flipper(s);
      f.scale.set(f.scale.x * 1.05, 1.4, 1.3);
      pv.add(f);
      return { pv, s };
    });

    const fluke = new THREE.Group();
    whale.add(fluke);
    [-1, 1].forEach(s => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.quadraticCurveTo(0.25, 0.05, 0.55, -0.18);
      sh.quadraticCurveTo(0.68, -0.28, 0.6, -0.36);
      sh.quadraticCurveTo(0.35, -0.3, 0.12, -0.22);
      sh.quadraticCurveTo(0.02, -0.15, 0, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 16 });
      g.translate(0, 0, -0.015);
      g.rotateX(Math.PI / 2);
      const m = mesh(g, finMat);
      if (s < 0) m.scale.x = -1;
      m.scale.multiplyScalar(1.3);
      fluke.add(m);
    });

    const headZ = 1.18;
    const face = new THREE.Group();
    whale.add(face);
    const surf = (x, y, z, out = 0) => {
      const r = rAt(z);
      const dz = 0.02;
      const ra = rAt(z - dz);
      const rb = rAt(z + dz);
      const ex = x / r.rx;
      const ey = (y - r.y) / r.ry;
      const k = Math.sqrt(Math.max(1e-4, ex * ex + ey * ey));
      const px = (ex / k) * r.rx;
      const py = (ey / k) * r.ry + r.y;
      const slope = ((ra.rx + ra.ry) / 2 - (rb.rx + rb.ry) / 2) / (2 * dz);
      const n = V3(ex / k, ey / k, slope).normalize();
      return { p: V3(px, py, z).add(n.clone().multiplyScalar(out)), n };
    };
    const eyes = [-1, 1].map(s => {
      const { p, n } = surf(0.42 * s, 0.16, headZ + 0.1, -0.03);
      const g = new THREE.Group();
      g.position.copy(p);
      g.lookAt(p.clone().add(n.clone().lerp(V3(0, 0, 1), 0.55)));
      const e = eye({ size: 0.95 });
      g.add(e.g);
      face.add(g);
      const brow = mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 24, Math.PI * 0.8), brass, false);
      brow.position.set(0, 0.03, 0.02);
      brow.rotation.z = Math.PI * 0.1;
      g.add(brow);
      return e;
    });
    [-1, 1].forEach(s => {
      const { p, n } = surf(0.62 * s, -0.12, headZ - 0.05, 0.006);
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.09, 24), cheekMat);
      c.position.copy(p);
      c.lookAt(p.clone().add(n));
      c.scale.set(1, 0.6, 1);
      face.add(c);
    });
    const mouthPts = [];
    for (let i = 0; i <= 16; i++) {
      const x = -0.42 + (i / 16) * 0.84;
      const z = headZ + 0.22 - Math.abs(x) * 0.35;
      const y = -0.22 + x * x * 0.45;
      mouthPts.push(surf(x, y, Math.min(1.5, z), 0.005).p);
    }
    const smile = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(mouthPts), 40, 0.018, 8), mouthMat, false);
    face.add(smile);
    const mo = surf(0.0, -0.25, 1.42, -0.02);
    const openMouth = new THREE.Group();
    openMouth.position.copy(mo.p);
    openMouth.lookAt(mo.p.clone().add(mo.n));
    const om = mesh(new THREE.SphereGeometry(0.16, 24, 16), mouthMat, false);
    om.scale.set(1.3, 0.6, 0.4);
    openMouth.add(om);
    const tg = mesh(new THREE.SphereGeometry(0.09, 16, 12), tongueMat, false);
    tg.scale.set(1.3, 0.5, 0.6);
    tg.position.set(0, -0.04, 0.03);
    openMouth.add(tg);
    openMouth.visible = false;
    face.add(openMouth);

    const lure = new THREE.Group();
    const lp = surf(0, 0.8, 0.82, 0);
    lure.position.copy(lp.p);
    lure.scale.setScalar(1.45);
    whale.add(lure);
    const stalkPts = [V3(0, 0, 0), V3(0, 0.22, 0.05), V3(0, 0.38, 0.22), V3(0, 0.4, 0.42), V3(0, 0.32, 0.55)];
    lure.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(stalkPts), 30, 0.035, 10), steel, false));
    for (let k = 1; k < 4; k++) {
      const ring = mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 16), brass, false);
      const c = new THREE.CatmullRomCurve3(stalkPts);
      const p = c.getPoint(k / 4);
      const t = c.getTangent(k / 4);
      ring.position.copy(p);
      ring.quaternion.setFromUnitVectors(V3(0, 0, 1), t);
      lure.add(ring);
    }
    const bulb = new THREE.Group();
    bulb.position.copy(stalkPts[stalkPts.length - 1]);
    lure.add(bulb);
    const cap = mesh(new THREE.SphereGeometry(0.08, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass, false);
    cap.position.y = 0.02;
    bulb.add(cap);
    const glass = mesh(new THREE.SphereGeometry(0.09, 20, 14), glassMat, false);
    glass.position.y = -0.06;
    bulb.add(glass);
    const lamp = mesh(new THREE.SphereGeometry(0.05, 16, 12), lampMat, false);
    lamp.position.y = -0.06;
    bulb.add(lamp);
    const lampSprite = new THREE.Sprite(lampGlow);
    lampSprite.scale.set(0.6, 0.6, 1);
    lampSprite.position.y = -0.06;
    bulb.add(lampSprite);
    const beamPivot = new THREE.Group();
    beamPivot.position.y = -0.06;
    bulb.add(beamPivot);
    const beamGeo = new THREE.ConeGeometry(0.5, 2.4, 32, 1, true);
    beamGeo.translate(0, -1.2, 0);
    beamGeo.rotateX(-Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beamPivot.add(beam);
    const lampLight = new THREE.PointLight(0xffd070, 0.5, 3);
    lampLight.position.y = -0.06;
    bulb.add(lampLight);

    const clouds = [];
    [[-0.9, -0.95, 0.2, 0.9], [0.1, -1.05, -0.1, 1.1], [0.95, -0.92, 0.3, 0.8]].forEach(([z, y, x, s], k) => {
      const c = new THREE.Group();
      c.position.set(x, y, z);
      [[0, 0, 0, 0.22], [0.2, -0.03, 0.05, 0.16], [-0.2, -0.03, -0.04, 0.17], [0.08, 0.1, -0.02, 0.15], [-0.08, 0.08, 0.06, 0.13]].forEach(([a, b, d, r]) => {
        const m = mesh(new THREE.SphereGeometry(r, 18, 14), cloudMat, false);
        m.position.set(a, b, d);
        m.scale.y = 0.8;
        c.add(m);
      });
      c.scale.setScalar(s);
      whale.add(c);
      clouds.push({ c, k, y });
    });

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const bm = action && action.name === "beam" ? action : null;
        const atk = action && action.name === "attack" ? strike(action.p) : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const weak = s.dying ? 1 : smooth(30, 8, hunger);

        let lift = lerp(0.35, -0.3, weak) + Math.sin(t * 0.9) * 0.1 * motion;
        let pitch = Math.sin(t * 0.7) * 0.04 * motion + weak * 0.12;
        let swim = 1 - weak * 0.6;
        let flash = 0;
        let mouthOpen = false;
        let squint = false;
        let sweep = Math.sin(t * 0.8) * 0.6;

        if (jump) {
          const p = jump.p;
          lift += Math.sin(Math.min(1, p / 0.9) * Math.PI) * 1.0;
          pitch -= Math.sin(p * Math.PI) * 0.25;
          swim += Math.sin(p * Math.PI) * 1.6;
        }
        if (atk) {
          lift += atk.wind * 0.35 - atk.lunge * 0.2;
          pitch += -atk.wind * 0.35 + atk.lunge * 0.3;
          swim += atk.wind * 1.5 + atk.lunge * 2.5;
          squint = atk.wind > 0.3 || atk.lunge > 0.2;
        }
        if (bm) {
          const p = bm.p;
          flash = smooth(0.05, 0.2, p) * (1 - smooth(0.8, 1, p));
          sweep = lerp(sweep, Math.sin(p * Math.PI * 3) * 0.9, flash);
          mouthOpen = p > 0.1 && p < 0.45;
          squint = p > 0.1 && p < 0.45;
        }
        if (eat) {
          food.visible = ph.visible;
          food.position.set(-0.45, lerp(4.8, 1.55 - 0.25, ph.fall * ph.fall), lerp(1.6, 1.42, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          om.scale.y = 0.4 + ph.chew * 0.4;
        } else om.scale.y = 0.6;

        root.position.y = lift;
        root.position.z = atk ? atk.lunge * 0.4 - atk.wind * 0.06 : 0;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * 0.5;
        whale.rotation.x = pitch;
        whale.rotation.z = Math.sin(t * 0.6 + 0.4) * 0.04 * motion;
        whale.rotation.y = -0.32 + pointer.x * 0.2;

        const wv = t * (1.4 + swim * 0.8);
        for (let i = 0; i < BASE.length; i++) {
          const z = BASE[i][0];
          const w = smooth(0.2, -2.0, z);
          const dy = Math.sin(wv - z * 1.6) * 0.12 * w * motion * (0.6 + swim * 0.4);
          nodes[i].p.y = BASE[i][1] + dy;
          shellNodes[i].p.y = BASE[i][1] + dy;
        }
        if (!reduceMotion || t < 0.1) {
          top.update(shellNodes);
          belly.update(nodes);
        }
        const tail = nodes[0].p;
        const tail2 = nodes[1].p;
        fluke.position.set(0, tail2.y, tail2.z - 0.08);
        fluke.rotation.x = Math.atan2(tail.y - tail2.y, tail2.z - tail.z) * 1.6 + Math.PI;
        fluke.rotation.y = Math.PI;
        shells.forEach((sh, i) => {
          const z = sh.position.z;
          const w = smooth(0.2, -2.0, z);
          sh.position.y = rAt(z).y + Math.sin(wv - z * 1.6) * 0.12 * w * motion * (0.6 + swim * 0.4);
        });

        flippers.forEach(({ pv, s: sd }) => {
          pv.rotation.z = -0.5 * sd + Math.sin(wv * 0.8) * 0.35 * sd * (0.5 + swim * 0.5);
        });
        rotors.forEach((h, i) => {
          h.rotation.z += (0.15 + swim * 0.35) * (i ? 1 : -1) * (reduceMotion ? 0.3 : 1);
        });

        beamPivot.rotation.y = sweep;
        beamPivot.rotation.x = 0.35 + flash * 0.1;
        beamMat.opacity = (0.12 + flash * 0.5) * (1 - weak * 0.6);
        beam.scale.setScalar(1 + flash * 0.35);
        lampGlow.opacity = 0.55 + flash * 0.45 + Math.sin(t * 5) * 0.06;
        lampMat.emissiveIntensity = 1.2 + flash * 2 - weak * 0.8;
        lampLight.intensity = 0.3 + flash * 0.9;
        lure.rotation.x = Math.sin(t * 1.6) * 0.08 * motion + flash * -0.15;

        clouds.forEach(({ c, k, y }) => {
          c.position.y = y + Math.sin(t * 1.1 + k * 2) * 0.05 * motion - lift * 0.3;
          c.position.x += 0;
        });

        smile.visible = !mouthOpen;
        openMouth.visible = mouthOpen;
        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.4 : weak > 0.6 ? Math.min(blink, 0.55) : blink;
        });
        followPupils(eyes, pointer);
      }
    };
  }
});
