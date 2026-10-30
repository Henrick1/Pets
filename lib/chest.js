(function () {
  const COIN =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="#f6c343" stroke="#c98a12" stroke-width="2"/><circle cx="12" cy="12" r="4.4" fill="none" stroke="#c98a12" stroke-width="1.6"/></svg>';
  const CHEST =
    '<svg class="chest-svg" viewBox="0 0 140 120" aria-hidden="true">' +
    '<defs><radialGradient id="chestGlow" cx="50%" cy="60%" r="50%"><stop offset="0" stop-color="#fff6c8"/><stop offset="0.5" stop-color="#ffd25a" stop-opacity="0.8"/><stop offset="1" stop-color="#ffb030" stop-opacity="0"/></radialGradient></defs>' +
    '<ellipse cx="70" cy="110" rx="52" ry="7" fill="rgba(0,0,0,0.25)"/>' +
    '<g class="chest-rays">' +
    [0, 30, 60, 90, 120, 150].map(a => '<rect x="67" y="-10" width="6" height="70" rx="3" fill="#ffe28a" transform="rotate(' + (a - 75) + ' 70 58)"/>').join("") +
    "</g>" +
    '<ellipse class="chest-glow" cx="70" cy="58" rx="62" ry="46" fill="url(#chestGlow)"/>' +
    '<rect x="16" y="56" width="108" height="50" rx="7" fill="#8a5426"/>' +
    '<rect x="16" y="56" width="108" height="50" rx="7" fill="none" stroke="#5e3615" stroke-width="3"/>' +
    '<path d="M20 72H120M20 89H120" stroke="#6e4019" stroke-width="2"/>' +
    '<rect x="28" y="56" width="10" height="50" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    '<rect x="102" y="56" width="10" height="50" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    '<g class="chest-lid">' +
    '<path d="M14 58V40Q14 22 32 22H108Q126 22 126 40V58Z" fill="#a0652d" stroke="#5e3615" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M18 44H122" stroke="#7c4a1f" stroke-width="2"/>' +
    '<rect x="28" y="23" width="10" height="35" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    '<rect x="102" y="23" width="10" height="35" fill="#e0b040" stroke="#a87a18" stroke-width="1.5"/>' +
    "</g>" +
    '<g class="chest-lock"><rect x="60" y="50" width="20" height="22" rx="4" fill="#f2c94c" stroke="#a87a18" stroke-width="2"/><circle cx="70" cy="59" r="3" fill="#5e3615"/><rect x="68.6" y="60" width="2.8" height="7" rx="1.2" fill="#5e3615"/></g>' +
    "</svg>";

  const reduce = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function chest3d(canvas, W, H) {
    const THREE = window.THREE;
    if (!THREE) return null;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
      return null;
    }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
    camera.position.set(0, 2.4, 6.0);
    camera.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a20, 0.9));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(2.5, 4, 3);
    scene.add(key);
    const inner = new THREE.PointLight(0xffc040, 0, 4);
    inner.position.set(0, 1.25, 0.2);
    scene.add(inner);

    const woodTex = (() => {
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#9a5f2c";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 5; i++) {
        const y = i * 51;
        g.fillStyle = i % 2 ? "#a86a33" : "#93582a";
        g.fillStyle = i % 2 ? "#a86a33" : "#93582a";
        g.fillRect(0, y, 256, 51);
        g.fillStyle = "#5e3615";
        g.fillRect(0, y, 256, 3);
        for (let k = 0; k < 14; k++) {
          g.strokeStyle = "rgba(70,38,14,0.25)";
          g.lineWidth = 1 + (k % 3);
          g.beginPath();
          const yy = y + 6 + ((k * 7) % 42);
          g.moveTo(0, yy);
          g.bezierCurveTo(80, yy + 3 * Math.sin(k), 170, yy - 3 * Math.cos(k), 256, yy + 1);
          g.stroke();
        }
        const kx = ((i * 97) % 200) + 28;
        const ky = y + 25;
        for (let ring = 4; ring >= 1; ring--) {
          g.strokeStyle = "rgba(60,30,10," + (0.18 + ring * 0.05) + ")";
          g.lineWidth = 1.5;
          g.beginPath();
          g.ellipse(kx, ky, ring * 4, ring * 1.6, 0, 0, Math.PI * 2);
          g.stroke();
        }
        g.fillStyle = "rgba(50,24,8,0.6)";
        g.beginPath();
        g.ellipse(kx, ky, 2.5, 1.2, 0, 0, Math.PI * 2);
        g.fill();
      }
      const t = new THREE.CanvasTexture(c);
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      return t;
    })();
    const canvasTex = (size, draw, rx = 1, ry = 1, color = true) => {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      draw(c.getContext("2d"), size);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      if (color && THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      return t;
    };
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const goldDraw = (g, n) => {
      g.fillStyle = "#e9e1cf";
      g.fillRect(0, 0, n, n);
      for (let i = 0; i < 900; i++) {
        const v = 200 + Math.floor(rnd() * 55);
        g.fillStyle = "rgba(" + v + "," + v + "," + (v - 20) + ",0.5)";
        g.beginPath();
        g.arc(rnd() * n, rnd() * n, 1 + rnd() * 3, 0, Math.PI * 2);
        g.fill();
      }
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = "rgba(120,100,70," + (0.03 + rnd() * 0.05) + ")";
        g.lineWidth = 1;
        const y = rnd() * n;
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(n, y + (rnd() - 0.5) * 6);
        g.stroke();
      }
      for (let i = 0; i < 30; i++) {
        g.fillStyle = "rgba(90,60,20," + (0.08 + rnd() * 0.1) + ")";
        g.beginPath();
        g.arc(rnd() * n, rnd() * n, 2 + rnd() * 5, 0, Math.PI * 2);
        g.fill();
      }
    };
    const goldTex = canvasTex(128, goldDraw, 2, 2);
    const goldBump = canvasTex(128, goldDraw, 2, 2, false);
    const velvetDraw = (g, n) => {
      g.fillStyle = "#d9d9d9";
      g.fillRect(0, 0, n, n);
      for (let i = 0; i < 2500; i++) {
        const v = 170 + Math.floor(rnd() * 85);
        g.fillStyle = "rgba(" + v + "," + v + "," + v + ",0.35)";
        g.fillRect(rnd() * n, rnd() * n, 1.5, 1.5);
      }
      const q = n / 2;
      for (let y = 0; y <= 2; y++) {
        for (let x = 0; x <= 2; x++) {
          const cx = x * q + (y % 2 ? 0 : 0);
          const cy = y * q;
          const gr = g.createRadialGradient(cx, cy, 0, cx, cy, q * 0.75);
          gr.addColorStop(0, "rgba(255,255,255,0.35)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr;
          g.fillRect(cx - q, cy - q, q * 2, q * 2);
        }
      }
      g.strokeStyle = "rgba(60,60,60,0.55)";
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(0, q);
      g.lineTo(q, 0);
      g.lineTo(n, q);
      g.lineTo(q, n);
      g.closePath();
      g.stroke();
      [[0, q], [q, 0], [n, q], [q, n], [0, 0], [n, 0], [0, n], [n, n]].forEach(([x, y]) => {
        g.fillStyle = "rgba(40,40,40,0.7)";
        g.beginPath();
        g.arc(x, y, 4, 0, Math.PI * 2);
        g.fill();
      });
    };
    const velvetTex = canvasTex(128, velvetDraw, 3, 2);
    const velvetBump = canvasTex(128, velvetDraw, 3, 2, false);
    const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.75 });
    const woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2a12, roughness: 0.9 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xf2c246, map: goldTex, bumpMap: goldBump, bumpScale: 0.012, roughness: 0.35, metalness: 0.35, emissive: 0x3a2400, emissiveIntensity: 0.35 });
    const goldDark = new THREE.MeshStandardMaterial({ color: 0xc9922a, map: goldTex, bumpMap: goldBump, bumpScale: 0.012, roughness: 0.4, metalness: 0.35 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const insideMat = new THREE.MeshBasicMaterial({ color: 0xffd060 });

    const BW = 2.0;
    const BH = 1.0;
    const BD = 1.34;
    const woodMats = [0xb06a32, 0xa05e2a, 0xbb7638].map(c => new THREE.MeshStandardMaterial({ color: c, map: woodTex, bumpMap: woodTex, bumpScale: 0.01, roughness: 0.7 }));
    const capWood = new THREE.MeshStandardMaterial({ color: 0xbb7638, map: woodTex, bumpMap: woodTex, bumpScale: 0.01, roughness: 0.7, side: THREE.DoubleSide });
    const seamMat = new THREE.MeshStandardMaterial({ color: 0x3a200c, roughness: 1 });
    const velvetOpts = { color: 0xb3203a, map: velvetTex, bumpMap: velvetBump, bumpScale: 0.02, roughness: 0.95 };
    const velvet = new THREE.MeshStandardMaterial(velvetOpts);
    const velvetIn = new THREE.MeshStandardMaterial(Object.assign({ side: THREE.BackSide }, velvetOpts));
    const velvetBoth = new THREE.MeshStandardMaterial(Object.assign({ side: THREE.DoubleSide }, velvetOpts));
    const seamBoth = new THREE.MeshStandardMaterial({ color: 0x3a200c, roughness: 1, side: THREE.DoubleSide });
    const rivetMat = new THREE.MeshStandardMaterial({ color: 0xffe08a, roughness: 0.25, metalness: 0.3, emissive: 0x4a3000, emissiveIntensity: 0.4 });
    const gemMats = [0xff4d6d, 0x4dc3ff, 0x8cff6a, 0xc77dff].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.1, emissive: c, emissiveIntensity: 0.25, flatShading: true }));
    const coinMat = new THREE.MeshStandardMaterial({ color: 0xffcf3a, roughness: 0.3, metalness: 0.35, emissive: 0x5a3a00, emissiveIntensity: 0.35 });
    const rim = new THREE.DirectionalLight(0xffd9a0, 0.6);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    const root = new THREE.Group();
    scene.add(root);
    const chest = new THREE.Group();
    root.add(chest);
    const rbox = (w, h, d, r, m) => {
      const sh = new THREE.Shape();
      const x = -w / 2;
      const y = -h / 2;
      sh.moveTo(x + r, y);
      sh.lineTo(x + w - r, y);
      sh.quadraticCurveTo(x + w, y, x + w, y + r);
      sh.lineTo(x + w, y + h - r);
      sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      sh.lineTo(x + r, y + h);
      sh.quadraticCurveTo(x, y + h, x, y + h - r);
      sh.lineTo(x, y + r);
      sh.quadraticCurveTo(x, y, x + r, y);
      const bev = Math.min(0.03, d / 4);
      const g = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.001, d - bev * 2), bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 5 });
      g.translate(0, 0, -(d - bev * 2) / 2);
      const uv = g.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.45 + 0.5, uv.getY(k) * 0.45 + 0.5);
      return new THREE.Mesh(g, m);
    };
    const rivet = (parent, x, y, z, r = 0.035) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), rivetMat);
      m.position.set(x, y, z);
      m.scale.z = 0.6;
      parent.add(m);
      return m;
    };

    const core = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.06, BH - 0.26, BD - 0.06), seamMat);
    core.position.y = (BH - 0.26) / 2 + 0.02;
    chest.add(core);
    const PN = 3;
    const ph = (BH - 0.06) / PN;
    for (let k = 0; k < PN; k++) {
      const y = 0.05 + ph * (k + 0.5);
      [-1, 1].forEach(sd => {
        const f = rbox(BW, ph - 0.025, 0.09, 0.03, woodMats[(k + (sd > 0 ? 0 : 1)) % 3]);
        f.position.set(0, y, (sd * BD) / 2);
        f.rotation.z = (k % 2 ? 1 : -1) * 0.004;
        chest.add(f);
        const sidePl = rbox(BD - 0.02, ph - 0.025, 0.09, 0.03, woodMats[(k + 2) % 3]);
        sidePl.rotation.y = Math.PI / 2;
        sidePl.position.set((sd * BW) / 2, y, 0);
        chest.add(sidePl);
      });
    }
    const floor = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.1, 0.04, BD - 0.1), velvet);
    floor.position.y = BH - 0.22;
    chest.add(floor);
    const lining = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.12, 0.24, BD - 0.12), velvetIn);
    lining.position.y = BH - 0.1;
    chest.add(lining);
    const hollow = new THREE.Mesh(new THREE.BoxGeometry(BW - 0.2, 0.01, BD - 0.2), velvet);
    hollow.position.y = BH - 0.2;
    chest.add(hollow);
    const treasure = new THREE.Group();
    treasure.position.y = BH - 0.14;
    chest.add(treasure);
    for (let k = 0; k < 46; k++) {
      const a = k * 2.399;
      const r = Math.sqrt(k / 46) * 0.62;
      const x = Math.cos(a) * r * 1.25;
      const z = Math.sin(a) * r * 0.75;
      const h = 0.2 * (1 - (r / 0.62) * (r / 0.62)) + 0.02;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 14), coinMat);
      c.position.set(x, h, z);
      c.rotation.set(Math.sin(k * 1.7) * 0.5, k, Math.cos(k * 1.3) * 0.5);
      treasure.add(c);
    }
    [[-0.35, 0.2, 0.05, 0], [0.32, 0.17, -0.12, 1], [0.05, 0.26, 0.18, 2], [-0.1, 0.22, -0.25, 3]].forEach(([x, y, z, mI]) => {
      const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), gemMats[mI]);
      g.position.set(x, y, z);
      g.scale.y = 1.3;
      g.rotation.set(0.3 * mI, mI, 0.2);
      treasure.add(g);
    });

    [-0.62, 0.62].forEach(x => {
      [-1, 1].forEach(sd => {
        const band = rbox(0.17, BH - 0.02, 0.05, 0.03, gold);
        band.position.set(x, BH / 2 + 0.01, (sd * (BD + 0.06)) / 2);
        chest.add(band);
      });
      const under = rbox(0.17, 0.05, BD + 0.06, 0.02, gold);
      under.position.set(x, 0.03, 0);
      chest.add(under);
      [0.2, 0.5, 0.8].forEach(y => {
        rivet(chest, x, y, BD / 2 + 0.035);
        rivet(chest, x, y, -BD / 2 - 0.035);
      });
    });
    const trim = rbox(BW + 0.07, 0.1, BD + 0.07, 0.04, goldDark);
    trim.position.y = 0.06;
    chest.add(trim);
    [-1, 1].forEach(sd => {
      const tf = rbox(BW + 0.06, 0.07, 0.1, 0.02, gold);
      tf.position.set(0, BH - 0.035, (sd * (BD + 0.02)) / 2);
      chest.add(tf);
      const ts = rbox(0.1, 0.07, BD + 0.06, 0.02, gold);
      ts.position.set((sd * (BW + 0.02)) / 2, BH - 0.035, 0);
      chest.add(ts);
    });
    [-1, 1].forEach(sx => {
      [-1, 1].forEach(sz => {
        const c1 = rbox(0.24, BH + 0.02, 0.05, 0.02, goldDark);
        c1.position.set((sx * BW) / 2 - sx * 0.1, BH / 2, (sz * (BD + 0.07)) / 2);
        chest.add(c1);
        const c2 = rbox(0.24, BH + 0.02, 0.05, 0.02, goldDark);
        c2.rotation.y = Math.PI / 2;
        c2.position.set((sx * (BW + 0.07)) / 2, BH / 2, (sz * BD) / 2 - sz * 0.1);
        chest.add(c2);
        rivet(chest, (sx * BW) / 2 - sx * 0.1, 0.22, (sz * (BD + 0.12)) / 2);
        rivet(chest, (sx * BW) / 2 - sx * 0.1, BH - 0.2, (sz * (BD + 0.12)) / 2);
        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 10), goldDark);
        foot.scale.y = 0.6;
        foot.position.set((sx * BW) / 2 - sx * 0.08, 0.0, (sz * BD) / 2 - sz * 0.08);
        chest.add(foot);
      });
      const mount = rbox(0.34, 0.26, 0.05, 0.05, gold);
      mount.rotation.y = Math.PI / 2;
      mount.position.set((sx * (BW + 0.1)) / 2, BH * 0.6, 0);
      chest.add(mount);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 10, 24), goldDark);
      ring.rotation.y = Math.PI / 2;
      ring.position.set((sx * (BW + 0.16)) / 2, BH * 0.6 - 0.13, 0);
      ring.rotation.x = 0.2;
      chest.add(ring);
    });

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, BH, -BD / 2);
    chest.add(lidPivot);
    const lid = new THREE.Group();
    lid.position.set(0, 0, BD / 2);
    lidPivot.add(lid);
    const LR = BD / 2;
    const STAVES = 5;
    for (let k = 0; k < STAVES; k++) {
      const a0 = (k / STAVES) * Math.PI + 0.012;
      const al = Math.PI / STAVES - 0.024;
      const g = new THREE.CylinderGeometry(LR, LR, BW, 6, 1, false, a0, al);
      g.rotateZ(Math.PI / 2);
      const m = new THREE.Mesh(g, woodMats[k % 3]);
      lid.add(m);
    }
    const lidCore = new THREE.CylinderGeometry(LR - 0.02, LR - 0.02, BW - 0.01, 30, 1, true, 0, Math.PI);
    lidCore.rotateZ(Math.PI / 2);
    lid.add(new THREE.Mesh(lidCore, seamBoth));
    const liningGeo = new THREE.CylinderGeometry(LR - 0.07, LR - 0.07, BW - 0.14, 30, 1, true, 0, Math.PI);
    liningGeo.rotateZ(Math.PI / 2);
    lid.add(new THREE.Mesh(liningGeo, velvetBoth));
    const halfRing = (r0, r1) => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, r1, 0, Math.PI, false);
      sh.lineTo(-r0, 0);
      sh.absarc(0, 0, r0, Math.PI, 0, true);
      sh.lineTo(r1, 0);
      return new THREE.ShapeGeometry(sh, 24);
    };
    const rimGeo = new THREE.BoxGeometry(BW - 0.02, 0.03, 0.07);
    [-1, 1].forEach(sz => {
      const rimB = new THREE.Mesh(rimGeo, woodMats[1]);
      rimB.position.set(0, 0.015, sz * (LR - 0.035));
      lid.add(rimB);
    });
    [-1, 1].forEach(sd => {
      const cap = new THREE.Mesh(new THREE.CircleGeometry(LR, 30, 0, Math.PI), capWood);
      cap.rotation.y = (sd * Math.PI) / 2;
      cap.position.x = (sd * BW) / 2;
      lid.add(cap);
      const inCap = new THREE.Mesh(new THREE.CircleGeometry(LR - 0.07, 30, 0, Math.PI), velvetBoth);
      inCap.rotation.y = (sd * Math.PI) / 2;
      inCap.position.x = sd * (BW / 2 - 0.07);
      lid.add(inCap);
      const endRim = new THREE.Mesh(halfRing(LR - 0.07, LR - 0.005), seamBoth);
      endRim.rotation.y = (sd * Math.PI) / 2;
      endRim.position.x = sd * (BW / 2 - 0.07);
      lid.add(endRim);
      const edge = new THREE.Mesh(new THREE.TorusGeometry(LR, 0.035, 8, 30, Math.PI), goldDark);
      edge.rotation.y = (sd * Math.PI) / 2;
      edge.position.x = (sd * BW) / 2;
      lid.add(edge);
    });
    [-0.62, 0.62].forEach(x => {
      const bg = new THREE.CylinderGeometry(LR + 0.035, LR + 0.035, 0.17, 30, 1, true, 0, Math.PI);
      bg.rotateZ(Math.PI / 2);
      const b = new THREE.Mesh(bg, gold);
      b.material.side = THREE.DoubleSide;
      b.position.x = x;
      lid.add(b);
      for (let k = 1; k < 6; k++) {
        const a = (k / 6) * Math.PI;
        rivet(lid, x, Math.sin(a) * (LR + 0.05), Math.cos(a) * (LR + 0.05));
      }
    });
    const lip = rbox(BW + 0.06, 0.06, 0.08, 0.02, gold);
    lip.position.set(0, 0.02, LR + 0.01);
    lid.add(lip);
    const hasp = rbox(0.3, 0.34, 0.05, 0.08, gold);
    hasp.position.set(0, -0.08, LR + 0.06);
    lid.add(hasp);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), gemMats[0]);
    gem.position.set(0, -0.02, LR + 0.11);
    gem.scale.set(1, 1.2, 0.6);
    lid.add(gem);

    const lock = new THREE.Group();
    lock.position.set(0, BH - 0.28, BD / 2 + 0.1);
    chest.add(lock);
    const lockBody = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.09, 24), gold);
    lockBody.rotation.x = Math.PI / 2;
    lockBody.scale.set(1, 1, 1.1);
    lock.add(lockBody);
    const lockRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 8, 24), goldDark);
    lockRim.position.z = 0.045;
    lock.add(lockRim);
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 10, 20, Math.PI), goldDark);
    shackle.position.y = 0.13;
    lock.add(shackle);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.035, 14), seamMat);
    hole.position.set(0, 0.025, 0.047);
    lock.add(hole);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.026, 0.08), seamMat);
    slot.position.set(0, -0.025, 0.048);
    lock.add(slot);

    const rays = new THREE.Group();
    rays.position.y = BH;
    chest.add(rays);
    for (let i = 0; i < 9; i++) {
      const g = new THREE.PlaneGeometry(0.2, 1.5);
      g.translate(0, 0.75, 0);
      const r = new THREE.Mesh(g, glowMat);
      r.rotation.set(0, (i / 9) * Math.PI, (i % 2 ? 1 : -1) * (0.15 + (i % 3) * 0.12));
      rays.add(r);
    }
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 14), glowMat);
    halo.scale.set(1.1, 0.35, 0.8);
    halo.visible = false;
    halo.position.y = BH + 0.1;
    chest.add(halo);
    const sparks = [];
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), sparkMat);
      m.visible = false;
      chest.add(m);
      sparks.push({ m, a: i * 2.4, v: 0.5 + (i % 4) * 0.25, ph: (i * 0.37) % 1 });
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1, 0.6, 1);
    shadow.position.y = 0.005;
    root.add(shadow);

    const t0 = performance.now();
    let shakeAt = -1;
    let openAt = -1;
    let raf = 0;
    const lockStart = lock.position.clone();
    const ease = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };
    const back = k => 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
    const frame = () => {
      const t = (performance.now() - t0) / 1000;
      const still = reduce();
      root.rotation.y = still ? -0.35 : -0.35 + Math.sin(t * 0.6) * 0.18;
      if (openAt < 0) {
        chest.position.y = still ? 0 : Math.abs(Math.sin(t * 2.2)) * 0.05;
        chest.rotation.z = still ? 0 : Math.sin(t * 2.2) * 0.03;
      }
      if (shakeAt >= 0 && openAt < 0) {
        const q = (performance.now() - shakeAt) / 1000;
        chest.rotation.z = Math.sin(q * 38) * 0.09 * (1 - Math.min(1, q / 0.5));
        chest.scale.set(1 + Math.sin(q * 30) * 0.03, 1 - Math.sin(q * 30) * 0.03, 1);
      }
      if (openAt >= 0) {
        const q = (performance.now() - openAt) / 1000;
        chest.scale.set(1, 1, 1);
        chest.rotation.z *= 0.85;
        chest.position.y = q < 0.15 ? Math.sin((q / 0.15) * Math.PI) * 0.15 : 0;
        const k = Math.min(1, q / 0.55);
        lidPivot.rotation.x = -1.95 * (still ? 1 : back(k));
        const lq = Math.min(1, q / 0.7);
        lock.position.set(lockStart.x + lq * 0.3, lockStart.y - lq * lq * 1.1 + Math.sin(lq * Math.PI) * 0.35, lockStart.z + lq * 0.4);
        lock.rotation.set(lq * 1.4, 0, lq * 2.2);
        lock.visible = lq < 1;
        const g = ease(0.05, 0.4, q);
        glowMat.opacity = g * (0.28 + Math.sin(t * 5) * 0.06);
        inner.intensity = g * 1.1;
        rays.rotation.y = t * 0.6;
        rays.scale.setScalar(0.6 + g * 0.5 + Math.sin(t * 3) * 0.05);
        sparks.forEach(sp => {
          const u = ((t * sp.v + sp.ph) % 1 + 1) % 1;
          sp.m.visible = !still && g > 0.2;
          sp.m.position.set(Math.cos(sp.a + t) * 0.5 * u, BH + u * 2, Math.sin(sp.a + t) * 0.35 * u);
          sp.m.scale.setScalar(Math.sin(u * Math.PI));
        });
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return {
      shake() {
        shakeAt = performance.now();
      },
      open() {
        openAt = performance.now();
      },
      dispose() {
        cancelAnimationFrame(raf);
        scene.traverse(o => {
          if (o.geometry) o.geometry.dispose();
        });
        [woodTex, goldTex, goldBump, velvetTex, velvetBump].forEach(t => t.dispose());
        renderer.dispose();
        if (renderer.forceContextLoss) renderer.forceContextLoss();
      }
    };
  }
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };

  function open(o) {
    const host = o.host || document.body;
    const overlay = el("div", "chest-overlay");
    const card = el("div", "chest-card");
    const title = el("h2", "chest-title", o.title || "Expedição voltou!");
    const who = el("p", "chest-who", o.subtitle || "");
    const stage = el("button", "chest-stage");
    stage.type = "button";
    stage.setAttribute("aria-label", "Abrir o baú");
    const canvas = document.createElement("canvas");
    canvas.className = "chest-canvas";
    stage.appendChild(canvas);
    const three = chest3d(canvas, 220, 190);
    if (!three) stage.innerHTML = CHEST;
    const hint = el("p", "chest-hint", "Toque no baú para abrir");
    const loot = el("div", "chest-loot");
    const notes = el("p", "chest-notes", "");
    const take = el("button", "chest-take", "Pegar");
    take.type = "button";
    take.hidden = true;
    card.append(title, who, stage, hint, loot, notes, take);
    overlay.appendChild(card);
    host.appendChild(overlay);
    stage.focus({ preventScroll: true });

    const list = [];
    if (o.coins) list.push({ html: COIN, name: "Moedas", count: o.coins, coin: true });
    (o.items || []).forEach(it => list.push(it));

    let opened = false;
    const finish = () => {
      notes.replaceChildren(...(o.notes || []).map(t => el("span", "chest-note", t)));
      take.hidden = false;
      take.focus({ preventScroll: true });
    };
    const popItem = (it, i) => {
      const slot = el("div", "chest-item" + (it.coin ? " gold" : ""));
      const ico = el("span", "chest-item-ico");
      ico.innerHTML = it.html || "";
      const label = el("span", "chest-item-name", it.name);
      const count = el("span", "chest-item-count", (it.coin ? "+" : "x") + it.count);
      slot.append(ico, count, label);
      loot.appendChild(slot);
      if (reduce() || !slot.animate) return;
      const a = stage.getBoundingClientRect();
      const b = slot.getBoundingClientRect();
      const dx = a.left + a.width / 2 - (b.left + b.width / 2);
      const dy = a.top + a.height * 0.55 - (b.top + b.height / 2);
      slot.animate(
        [
          { transform: "translate(" + dx + "px," + dy + "px) scale(0.2)", opacity: 0 },
          { transform: "translate(" + dx * 0.5 + "px," + (dy * 0.5 - 70) + "px) scale(1.25)", opacity: 1, offset: 0.55 },
          { transform: "translate(0,0) scale(1)", opacity: 1 }
        ],
        { duration: 650, easing: "cubic-bezier(0.3, 0.7, 0.4, 1)", fill: "backwards" }
      );
    };
    const reveal = () => {
      if (opened) return;
      opened = true;
      stage.classList.add("shake");
      if (three) three.shake();
      hint.textContent = "";
      setTimeout(
        () => {
          stage.classList.remove("shake");
          stage.classList.add("open");
          if (three) three.open();
          stage.setAttribute("aria-label", "Baú aberto");
          if (o.onOpen) o.onOpen();
          const step = reduce() ? 0 : 520;
          list.forEach((it, i) => setTimeout(() => popItem(it, i), 250 + i * step));
          setTimeout(finish, 250 + list.length * step + 300);
        },
        reduce() ? 0 : 520
      );
    };
    const close = () => {
      overlay.classList.add("closing");
      setTimeout(() => three && three.dispose(), 250);
      setTimeout(() => overlay.remove(), reduce() ? 0 : 200);
      if (o.onDone) o.onDone();
    };
    stage.addEventListener("click", reveal);
    take.addEventListener("click", close);
    overlay.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        if (!opened) reveal();
        else if (!take.hidden) close();
      }
    });
    return { close };
  }

  window.PetChest = { open, COIN };
})();
