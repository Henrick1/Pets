Pets.register({
  id: "colossilva",
  dex: 3,
  name: "Colossilva",
  color: "#4f8a3a",
  types: ["grass", "ground"],
  description: "Um colosso de madeira viva que carrega uma floresta inteira nas costas. Anda apoiado nos punhos de raiz, e a seiva âmbar que corre pelas rachaduras da casca brilha mais forte quando ele bate no chão e faz a terra tremer.",
  actions: {
    eat: { duration: 2.8 },
    slam: { duration: 3.0 },
    bloom: { duration: 3.6 }
  },
  idle: [
    { action: "bloom", min: 30, max: 60 },
    { action: "slam", min: 45, max: 90 }
  ],
  clickAction: n => ["slam", "bloom"][(n - 1) % 2],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);

    const root = new THREE.Group();

    const canvasTex = (w, h, draw, rx, ry) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let seed = 13;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      draw(g, rnd);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      return t;
    };

    const drawBark = (g, rnd) => {
      const W = 256;
      const H = 512;
      const lat = (px, py) => {
        const v = new Float32Array(px * py);
        for (let i = 0; i < v.length; i++) v[i] = rnd();
        return (x, y) => {
          const xi = Math.floor(x);
          const yi = Math.floor(y);
          const fx = x - xi;
          const fy = y - yi;
          const sx = fx * fx * (3 - 2 * fx);
          const sy = fy * fy * (3 - 2 * fy);
          const at = (a, b) => v[(((a % px) + px) % px) + (((b % py) + py) % py) * px];
          const a = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * sx;
          const b = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * sx;
          return a + (b - a) * sy;
        };
      };
      const oct = [[6, 3, 0.5], [12, 6, 0.25], [24, 12, 0.15], [48, 24, 0.1]].map(([px, py, w]) => ({ n: lat(px, py), px, py, w }));
      const fbm = (u, v) => oct.reduce((s, o) => s + o.n(u * o.px, v * o.py) * o.w, 0);
      const crack = lat(10, 14);
      const grain = lat(128, 32);
      const img = g.createImageData(W, H);
      const N = 7;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const u = x / W;
          const v = y / H;
          const warp = (fbm(u, v) - 0.5) * 1.6;
          const s = Math.abs(Math.sin((u * N + warp) * Math.PI));
          const sm = (a, b, t) => { const q = Math.max(0, Math.min(1, (t - a) / (b - a))); return q * q * (3 - 2 * q); };
          let h = sm(0.1, 0.62, s) * (0.8 + 0.2 * s);
          const seg = Math.abs(Math.sin((v * 5 + fbm(u * 3 % 1, v) * 2.5 + Math.floor(u * N + warp) * 0.37) * Math.PI));
          h *= 0.5 + 0.5 * sm(0.04, 0.3, seg);
          const c = crack(u * 10, v * 14);
          h *= 1 - 0.85 * Math.max(0, Math.min(1, (c - 0.78) * 9)) * Math.max(0, Math.min(1, (0.04 - Math.abs(fbm(u + 0.3, v * 3) - 0.5)) * 30));
          const gr = grain(u * 128, v * 32);
          const shade = h * (0.75 + gr * 0.4) * (0.85 + fbm(u * 2 % 1, v) * 0.3);
          const k = Math.max(0, Math.min(1.15, shade));
          const i = (y * W + x) * 4;
          img.data[i] = 22 + k * 118;
          img.data[i + 1] = 14 + k * 96;
          img.data[i + 2] = 9 + k * 72;
          img.data[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
    };
    const barkTex = canvasTex(256, 512, drawBark, 2.5, 1);
    const barkTexLimb = barkTex ? barkTex.clone() : null;
    if (barkTexLimb) {
      barkTexLimb.repeat.set(1, 1.2);
      barkTexLimb.needsUpdate = true;
    }

    const scaleTex = canvasTex(256, 256, (g, rnd) => {
      g.fillStyle = "#5a3820";
      g.fillRect(0, 0, 256, 256);
      const rows = 8;
      const cols = 8;
      for (let r = rows; r >= -1; r--) {
        for (let c = -1; c <= cols; c++) {
          const x = (c + (r % 2 ? 0.5 : 0)) * (256 / cols);
          const y = r * (256 / rows);
          const rw = 256 / cols * 0.62;
          const rh = 256 / rows * 0.95;
          const v = (130 + rnd() * 60) | 0;
          const gr = g.createRadialGradient(x, y - rh * 0.3, 2, x, y, rh);
          gr.addColorStop(0, "rgb(" + v + "," + ((v * 0.7) | 0) + "," + ((v * 0.42) | 0) + ")");
          gr.addColorStop(1, "rgb(" + ((v * 0.5) | 0) + "," + ((v * 0.34) | 0) + "," + ((v * 0.2) | 0) + ")");
          g.fillStyle = gr;
          g.beginPath();
          g.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "rgba(30,16,8,0.6)";
          g.lineWidth = 2;
          g.stroke();
        }
      }
    }, 10, 3);

    const barkMat = new THREE.MeshStandardMaterial({ color: 0xb89a7a, roughness: 0.92, map: barkTex, bumpMap: barkTex, bumpScale: 0.07 });
    const limbMat = new THREE.MeshStandardMaterial({ color: 0xb89a7a, roughness: 0.92, map: barkTexLimb, bumpMap: barkTexLimb, bumpScale: 0.06 });
    const darkBark = new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.95, map: barkTexLimb, bumpMap: barkTexLimb, bumpScale: 0.06 });
    const mossTex = canvasTex(256, 256, (g, rnd) => {
      g.fillStyle = "#7a8a5a";
      g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 9000; i++) {
        const x = rnd() * 256;
        const y = rnd() * 256;
        const v = rnd();
        const r = (v < 0.3 ? 40 : 110 + rnd() * 120) | 0;
        g.fillStyle = "rgba(" + ((r * 0.75) | 0) + "," + r + "," + ((r * 0.55) | 0) + "," + (0.5 + rnd() * 0.5) + ")";
        g.beginPath();
        g.arc(x, y, 0.6 + rnd() * 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }, 3, 2);
    const mossMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: mossTex, bumpMap: mossTex, bumpScale: 0.025 });
    const sapMat = new THREE.MeshStandardMaterial({ color: 0xffb648, emissive: 0xff8a10, emissiveIntensity: 0.9, roughness: 0.3 });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
    const canopyMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x9a7650, roughness: 0.8, map: scaleTex, bumpMap: scaleTex, bumpScale: 0.04 });

    const lumps = (x, y, z, sd) =>
      Math.sin(x * 7.1 + sd) * Math.sin(y * 6.3 + sd * 1.7) * Math.sin(z * 5.9 - sd) * 0.6 +
      Math.sin(x * 13.7 - y * 11.1 + z * 9.3 + sd * 2.3) * 0.3;

    const tubeFrom = (curve, radiusAt, seg = 20, rad = 12, groove = 0) => {
      const frames = curve.computeFrenetFrames(seg, false);
      const pos = [];
      const uv = [];
      const idx = [];
      for (let i = 0; i <= seg; i++) {
        const f = i / seg;
        const p = curve.getPointAt(f);
        const r = radiusAt(f);
        for (let j = 0; j <= rad; j++) {
          const a = (j / rad) * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
          const rr = groove ? r * (1 - 0.13 * Math.pow(Math.abs(Math.cos(a * groove * 0.5 + f * 2.2)), 14)) : r;
          pos.push(p.x + n.x * rr, p.y + n.y * rr, p.z + n.z * rr);
          uv.push(j / rad, f);
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
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };
    const taperTube = (pts, r0, r1, seg = 16, rad = 10, groove = 0) => tubeFrom(new THREE.CatmullRomCurve3(pts), f => lerp(r0, r1, Math.pow(f, 0.8)), seg, rad, groove);

    const oakLeaf = (len, wid, curl = 0.25) => {
      const N = 36;
      const left = [];
      for (let i = 0; i <= N; i++) {
        const f = i / N;
        const w = wid * Math.pow(Math.sin(Math.PI * Math.min(1, f * 1.05)), 0.75) * (0.74 + 0.26 * Math.sqrt(Math.abs(Math.cos(f * Math.PI * 4.5))));
        left.push([-Math.max(0.004, w), f * len]);
      }
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      left.forEach(([x, y]) => shape.lineTo(x, y));
      for (let i = left.length - 1; i >= 0; i--) shape.lineTo(-left[i][0], left[i][1]);
      const g = new THREE.ShapeGeometry(shape, 4);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x2f7a36);
      const B = hexParts(0x7cc85a);
      const M = hexParts(0xb8e690);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const f = y / len;
        pos.setZ(i, -Math.abs(x) * 0.35 * (1 - f * 0.5) + f * f * curl * len);
        const rib = Math.max(0, 1 - Math.abs(x) / (wid * 0.08));
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(lerp(A[j], B[j], f * 0.8 + Math.abs(x) / wid * 0.3), M[j], rib * 0.6);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };

    const mossBlob = (r, seed, flat = 0.45) => {
      const g = new THREE.SphereGeometry(r, 96, 48);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x6aa04a);
      const B = hexParts(0xc8f090);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / r;
        const y = pos.getY(i) / r;
        const z = pos.getZ(i) / r;
        const n = lumps(x, y, z, seed);
        const fine = Math.sin(x * 41 + seed) * Math.sin(y * 37) * Math.sin(z * 43 - seed) * 0.05 + Math.sin(x * 23 - z * 19 + y * 29) * 0.03;
        const k = 1 + n * 0.14 + fine;
        pos.setXYZ(i, x * r * k, y * r * k * flat, z * r * k);
        const f = Math.max(0, Math.min(1, 0.45 + n * 0.8 + y * 0.3));
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(A[j], B[j], f);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };

    const mossCap = (r, sx, sy, sz, seed, cover = 0.4) => {
      const g = new THREE.SphereGeometry(r, 96, 32, 0, Math.PI * 2, 0, Math.PI * cover);
      const pos = g.attributes.position;
      const uv = g.attributes.uv;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x5a9040);
      const B = hexParts(0xb8e888);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) / r;
        const y = pos.getY(i) / r;
        const z = pos.getZ(i) / r;
        const a = Math.atan2(z, x);
        const e = Math.acos(Math.max(-1, Math.min(1, y))) / (Math.PI * cover);
        const lim = 0.68 + 0.16 * Math.sin(a * 5 + seed) + 0.08 * Math.sin(a * 13 - seed * 2);
        const fine = Math.sin(x * 41 + seed) * Math.sin(y * 37) * Math.sin(z * 43 - seed) * 0.6 + Math.sin(x * 23 - z * 19 + y * 29) * 0.4;
        const lift = 1.05 + 0.025 * fine - 0.1 * smooth(lim, Math.min(1, lim + 0.25), e);
        pos.setXYZ(i, x * sx * r * lift, y * sy * r * lift, z * sz * r * lift);
        uv.setXY(i, x * 1.2 + 0.5, z * 1.2 + 0.5);
        const f = Math.max(0, Math.min(1, 0.5 + fine * 0.35 + (1 - e) * 0.3));
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(A[j], B[j], f);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };

    const HIP = V3(0, 1.0, -0.35);
    const torsoPivot = new THREE.Group();
    torsoPivot.position.copy(HIP);
    root.add(torsoPivot);
    const torso = new THREE.Group();
    torso.position.copy(HIP).multiplyScalar(-1);
    torsoPivot.add(torso);

    const TC = V3(0, 1.55, -0.2);
    const TR = V3(0.98, 0.86, 0.78);
    const torsoGeo = new THREE.SphereGeometry(1, 180, 90);
    {
      const pos = torsoGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const bark = hexParts(0xffffff);
      const moss = hexParts(0x9ac87a);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const gv = Math.abs(Math.cos(a * 7 + y * 1.5 + Math.sin(y * 4 + a * 2) * 0.35));
        const ridge = 0.012 - 0.07 * Math.pow(gv, 18) + 0.01 * Math.sin(a * 31 + y * 9);
        const chest = 1 + 0.08 * smooth(0.1, 0.8, z) * smooth(-0.6, 0.4, y);
        const k = 1 + ridge;
        pos.setXYZ(i, x * TR.x * k, y * TR.y * k, z * TR.z * k * chest);
        const m = smooth(0.35, 0.75, z) * smooth(0.0, -0.55, y);
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(bark[j], moss[j], m * 0.85);
      }
      torsoGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      torsoGeo.computeVertexNormals();
    }
    const torsoMesh = mesh(torsoGeo, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xb89a7a, roughness: 0.92, map: barkTex, bumpMap: barkTex, bumpScale: 0.07 }));
    torsoMesh.position.copy(TC);
    torsoMesh.rotation.x = 0.32;
    torso.add(torsoMesh);

    const onTorso = (th, ph, lift = 1.03) => {
      const v = V3(Math.cos(ph) * Math.cos(th) * TR.x, Math.sin(ph) * TR.y, Math.cos(ph) * Math.sin(th) * TR.z).multiplyScalar(lift);
      return v;
    };
    const sapLines = [];
    [[1.25, 0.35, 1.55, -0.3], [1.85, 0.4, 1.65, -0.25], [0.6, 0.45, 0.9, -0.1], [2.55, 0.45, 2.3, -0.05], [-1.2, 0.5, -1.6, 0.0], [-2.0, 0.3, -1.7, -0.3]].forEach(([t0, p0, t1, p1], k) => {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const f = i / 6;
        const jt = (i % 2 ? 1 : -1) * 0.06 * Math.sin(k + i);
        pts.push(onTorso(lerp(t0, t1, f) + jt, lerp(p0, p1, f), 1.025));
      }
      const m = mesh(tubeFrom(new THREE.CatmullRomCurve3(pts), f => 0.028 * Math.sin(Math.PI * Math.min(1, f * 1.1 + 0.05)) + 0.006, 24, 6), sapMat, false);
      torsoMesh.add(m);
      sapLines.push(m);
    });

    const shoulders = [-1, 1].map(s => {
      const g = new THREE.SphereGeometry(0.54, 120, 60);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const gv = Math.abs(Math.cos(a * 5 + y * 3 + Math.sin(y * 7 + s) * 0.4));
        const k = 1 + 0.015 - 0.09 * Math.pow(gv, 16) + 0.012 * Math.sin(a * 23 - y * 5);
        pos.setXYZ(i, x * k * 1.05, y * k * 0.9, z * k);
      }
      g.computeVertexNormals();
      const m = mesh(g, barkMat);
      m.position.set(1.0 * s, 2.0, 0.05);
      torso.add(m);
      const moss = mesh(mossCap(0.54, 1.05, 0.9, 1.0, 3 + s, 0.38), mossMat, false);
      moss.position.copy(m.position);
      torso.add(moss);
      return m;
    });
    torsoMesh.add(mesh(mossCap(1, TR.x, TR.y, TR.z, 9, 0.3), mossMat, false));

    const capG = new THREE.Group();
    capG.position.set(0, 1.72, -0.64);
    capG.rotation.x = -1.1;
    torso.add(capG);
    const CAP_T = Math.PI * 0.42;
    const capR = 0.68;
    const capGeo = new THREE.SphereGeometry(capR, 72, 24, 0, Math.PI * 2, 0, CAP_T);
    {
      const pos = capGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const k = 1 + 0.018 * Math.sin(a * 11) * smooth(0.6, 0.3, y / capR);
        pos.setXYZ(i, x * k, y * 0.8, z * k);
      }
      capGeo.computeVertexNormals();
    }
    capG.add(mesh(capGeo, capMat));
    const brimR = Math.sin(CAP_T) * capR;
    const brimY = Math.cos(CAP_T) * capR * 0.8;
    const brim = mesh(new THREE.TorusGeometry(brimR, 0.09, 14, 72), darkBark);
    brim.rotation.x = Math.PI / 2;
    brim.position.y = brimY;
    capG.add(brim);

    const treeG = new THREE.Group();
    torso.add(treeG);
    const TB = V3(0, 2.2, -1.08);
    const trunkCurve = [TB.clone().add(V3(0, -0.2, 0.08)), TB.clone().add(V3(0.04, 0.25, -0.05)), TB.clone().add(V3(-0.05, 0.55, -0.08)), TB.clone().add(V3(0.02, 0.85, -0.05))];
    treeG.add(mesh(taperTube(trunkCurve, 0.22, 0.1, 24, 32, 7), limbMat));
    const branchDefs = [
      [V3(0.0, 0.4, -0.06), V3(0.35, 0.62, 0.05), V3(0.62, 0.78, 0.1)],
      [V3(-0.03, 0.5, -0.07), V3(-0.35, 0.72, -0.05), V3(-0.6, 0.86, 0.0)],
      [V3(0.0, 0.62, -0.06), V3(0.1, 0.82, -0.32), V3(0.15, 0.95, -0.5)]
    ];
    branchDefs.forEach(pts => {
      treeG.add(mesh(taperTube(pts.map(p => p.clone().add(TB)), 0.08, 0.03, 12, 10), limbMat, false));
    });
    const canopy = new THREE.Group();
    canopy.position.copy(TB).add(V3(0, 0.98, -0.05));
    treeG.add(canopy);
    const clumpDefs = [
      [0, 0.12, 0, 0.56], [0.55, -0.05, 0.12, 0.42], [-0.55, 0.0, 0.05, 0.44], [0.12, -0.08, -0.48, 0.4], [-0.2, 0.3, -0.2, 0.4], [0.3, 0.32, 0.15, 0.36], [-0.25, -0.12, 0.4, 0.34]
    ];
    const canopyLeaves = [];
    clumpDefs.forEach(([x, y, z, r], k) => {
      const g = new THREE.SphereGeometry(r, 48, 32);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x14381a);
      const B = hexParts(0x2c6a2c);
      const C = hexParts(0x4a8a3a);
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i) / r;
        const py = pos.getY(i) / r;
        const pz = pos.getZ(i) / r;
        const n = lumps(px * 1.3, py * 1.3, pz * 1.3, k * 1.7);
        const kk = 0.82 + n * 0.1;
        pos.setXYZ(i, px * r * kk, py * r * kk * 0.82, pz * r * kk);
        const f = Math.max(0, Math.min(1, 0.4 + py * 0.45 + n * 0.6));
        for (let j = 0; j < 3; j++) col[i * 3 + j] = f < 0.5 ? lerp(A[j], B[j], f * 2) : lerp(B[j], C[j], (f - 0.5) * 2);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      const c = mesh(g, canopyMat);
      c.position.set(x, y, z);
      canopy.add(c);
    });

    {
      const leafGeo = oakLeaf(0.24, 0.085, 0.35);
      leafGeo.translate(0, -0.03, 0);
      const counts = clumpDefs.map(([, , , rr]) => Math.round(150 * (rr / 0.5) * (rr / 0.5)));
      const total = counts.reduce((a, b) => a + b, 0);
      const inst = new THREE.InstancedMesh(leafGeo, leafMat, total);
      inst.castShadow = true;
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      let seed = 5;
      const rnd = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      let n = 0;
      clumpDefs.forEach(([x, y, z, rr], k) => {
        const cnt = counts[k];
        for (let i = 0; i < cnt; i++) {
          const yy = 1 - (2 * (i + 0.5)) / cnt;
          const rad = Math.sqrt(1 - yy * yy);
          const th = i * 2.39996 + k;
          const dir = V3(Math.cos(th) * rad, yy, Math.sin(th) * rad);
          const d = rr * (0.86 + rnd() * 0.18);
          dummy.position.set(x + dir.x * d, y + dir.y * d * 0.82, z + dir.z * d);
          dummy.lookAt(dummy.position.clone().add(dir.clone().add(V3((rnd() - 0.5) * 0.8, 0.35 + (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.8))));
          dummy.rotateZ(rnd() * Math.PI * 2);
          dummy.scale.setScalar(0.8 + rnd() * 0.45);
          dummy.updateMatrix();
          inst.setMatrixAt(n, dummy.matrix);
          const light = 0.55 + 0.45 * (yy * 0.5 + 0.5) + (rnd() - 0.5) * 0.2;
          col.setRGB(light * (0.9 + rnd() * 0.2), light, light * (0.85 + rnd() * 0.15));
          inst.setColorAt(n, col);
          n++;
        }
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      canopy.add(inst);
    }

    const flowers = [];
    const petalMat = new THREE.MeshStandardMaterial({ color: 0xffd6e4, emissive: 0xff9ec0, emissiveIntensity: 0.25, roughness: 0.5, side: THREE.DoubleSide });
    const flowerCore = new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 0.5 });
    for (let k = 0; k < 22; k++) {
      const cd = clumpDefs[k % clumpDefs.length];
      const a = k * 2.1;
      const b = 0.2 + Math.sin(k * 1.3) * 0.6;
      const dir = V3(Math.cos(a) * Math.cos(b), Math.sin(b) * 0.82, Math.sin(a) * Math.cos(b));
      const fg = new THREE.Group();
      fg.position.set(cd[0] + dir.x * cd[3] * 1.12, cd[1] + dir.y * cd[3] * 0.82 * 1.12, cd[2] + dir.z * cd[3] * 1.12);
      fg.quaternion.setFromUnitVectors(V3(0, 0, 1), dir.clone().normalize());
      for (let p = 0; p < 5; p++) {
        const pet = mesh(new THREE.SphereGeometry(0.085, 12, 8), petalMat, false);
        pet.scale.set(0.7, 1.2, 0.25);
        const pa = (p / 5) * Math.PI * 2;
        pet.position.set(Math.cos(pa) * 0.085, Math.sin(pa) * 0.085, 0);
        pet.rotation.z = pa - Math.PI / 2;
        fg.add(pet);
      }
      fg.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), flowerCore, false));
      fg.scale.setScalar(0.001);
      fg.visible = false;
      canopy.add(fg);
      flowers.push({ fg, d: (k % 5) * 0.04 });
    }

    const acorns = [[0.45, -0.38, 0.25], [-0.5, -0.36, 0.3], [0.05, -0.45, 0.42]].map(([x, y, z]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const nut = mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshStandardMaterial({ color: 0x9a6a38, roughness: 0.5 }), false);
      nut.scale.set(0.85, 1.2, 0.85);
      nut.position.y = -0.07;
      g.add(nut);
      const cp = mesh(new THREE.SphereGeometry(0.075, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), capMat, false);
      cp.position.y = -0.04;
      g.add(cp);
      canopy.add(g);
      return g;
    });

    const HEAD = V3(0, 1.82, 0.62);
    const headPivot = new THREE.Group();
    headPivot.position.copy(HEAD);
    torso.add(headPivot);
    const headGeo = new THREE.SphereGeometry(0.5, 56, 40);
    {
      const pos = headGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(x, -y);
        const k = 1 + 0.025 * Math.sin(a * 14 + z * 4);
        const flatFront = z > 0.25 ? 1 - (z - 0.25) * 0.5 : 1;
        pos.setXYZ(i, x * k * 1.08, y * k * 0.84, z * k * 0.9 * flatFront);
      }
      headGeo.computeVertexNormals();
    }
    const headMesh = mesh(headGeo, barkMat);
    headPivot.add(headMesh);

    const brows = [-1, 1].map(s => {
      const b = mesh(taperTube([V3(0.04 * s, 0.0, 0), V3(0.2 * s, 0.03, -0.02), V3(0.38 * s, -0.03, -0.1)], 0.1, 0.07, 14, 12), darkBark);
      b.position.set(0, 0.17, 0.33);
      b.rotation.z = -s * 0.18;
      headPivot.add(b);
      return b;
    });
    const eyeGlows = [-1, 1].map(s => {
      const sock = mesh(new THREE.SphereGeometry(0.1, 20, 14), new THREE.MeshStandardMaterial({ color: 0x1a1008, roughness: 1 }), false);
      sock.scale.set(1.3, 0.75, 0.5);
      sock.position.set(0.19 * s, 0.07, 0.36);
      sock.rotation.y = 0.35 * s;
      headPivot.add(sock);
      const glow = mesh(new THREE.SphereGeometry(0.055, 18, 12), new THREE.MeshStandardMaterial({ color: 0xffd070, emissive: 0xffa020, emissiveIntensity: 1.4 }), false);
      glow.scale.set(1.35, 0.7, 0.6);
      glow.position.set(0.19 * s, 0.065, 0.39);
      glow.rotation.y = 0.35 * s;
      headPivot.add(glow);
      return glow;
    });
    const eyeLight = new THREE.PointLight(0xffa040, 0.5, 1.6);
    eyeLight.position.set(0, 0.07, 0.6);
    headPivot.add(eyeLight);

    const mouthBack = mesh(new THREE.SphereGeometry(0.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0x2a1408, roughness: 1 }), false);
    mouthBack.scale.set(1.3, 0.5, 0.6);
    mouthBack.position.set(0, -0.17, 0.2);
    headPivot.add(mouthBack);
    const sapGlow = mesh(new THREE.SphereGeometry(0.12, 16, 12), sapMat, false);
    sapGlow.scale.set(1.4, 0.3, 0.5);
    sapGlow.position.set(0, -0.2, 0.2);
    headPivot.add(sapGlow);

    const jaw = new THREE.Group();
    jaw.position.set(0, -0.14, -0.12);
    headPivot.add(jaw);
    const jawGeo = new THREE.SphereGeometry(0.36, 40, 24, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55);
    {
      const pos = jawGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setXYZ(i, pos.getX(i) * 1.15, pos.getY(i) * 0.55, pos.getZ(i) * 1.05);
      }
      jawGeo.computeVertexNormals();
    }
    const jawMesh = mesh(jawGeo, barkMat);
    jawMesh.position.set(0, 0.0, 0.2);
    jaw.add(jawMesh);
    const beard = [];
    for (let k = 0; k < 9; k++) {
      const x = (k - 4) * 0.075;
      const len = 0.28 + (1 - Math.abs(k - 4) / 4) * 0.22;
      const g = taperTube([V3(x, -0.12, 0.42 - Math.abs(x) * 0.5), V3(x * 1.05, -0.12 - len * 0.5, 0.45 - Math.abs(x) * 0.5), V3(x * 1.1, -0.12 - len, 0.38 - Math.abs(x) * 0.4)], 0.05, 0.012, 10, 8);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x4f8a3a);
      const B = hexParts(0x8cc060);
      for (let i = 0; i < pos.count; i++) {
        const f = Math.max(0, Math.min(1, (pos.getY(i) + 0.12) / -len));
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(A[j], B[j], f);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      const b = mesh(g, mossMat, false);
      jaw.add(b);
      beard.push(b);
    }
    [-1, 1].forEach(s => {
      const tusk = mesh(taperTube([V3(0.24 * s, -0.08, 0.4), V3(0.3 * s, 0.02, 0.48), V3(0.27 * s, 0.14, 0.5)], 0.045, 0.01, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: 0.5 }), false);
      jaw.add(tusk);
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(1.05 * s, 2.0, 0.05);
      torso.add(pivot);
      const centre = new THREE.CatmullRomCurve3([V3(0, 0.05, 0), V3(0.3 * s, -0.5, 0.15), V3(0.4 * s, -1.1, 0.35), V3(0.32 * s, -1.68, 0.56)]);
      const frames = centre.computeFrenetFrames(24, false);
      for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let i = 0; i <= 24; i++) {
          const f = i / 24;
          const a = k * 2.094 + f * 2.6 * s;
          const off = 0.15 * (1 - f * 0.25);
          const p = centre.getPointAt(f).add(frames.normals[i].clone().multiplyScalar(Math.cos(a) * off)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a) * off));
          pts.push(p);
        }
        pivot.add(mesh(tubeFrom(new THREE.CatmullRomCurve3(pts), f => lerp(0.2, 0.14, f), 48, 28, 5), limbMat));
      }
      const sap = [];
      for (let i = 0; i <= 10; i++) {
        const f = 0.15 + i / 10 * 0.7;
        const p = centre.getPointAt(f);
        const fi = Math.round(f * 24);
        const a = 1.047 + f * 2.6 * s + (i % 2 ? 0.18 : -0.18);
        sap.push(p.add(frames.normals[fi].clone().multiplyScalar(Math.cos(a) * 0.2)).add(frames.binormals[fi].clone().multiplyScalar(Math.sin(a) * 0.2)));
      }
      const sapLine = mesh(tubeFrom(new THREE.CatmullRomCurve3(sap), f => 0.014 * Math.sin(Math.PI * f) + 0.004, 40, 6), sapMat, false);
      pivot.add(sapLine);
      sapLines.push(sapLine);
      const fist = new THREE.Group();
      fist.position.set(0.32 * s, -1.78, 0.6);
      pivot.add(fist);
      const palm = mesh(new THREE.SphereGeometry(0.3, 28, 20), limbMat);
      palm.scale.set(1.05, 0.8, 1.0);
      fist.add(palm);
      [-0.55, -0.18, 0.18, 0.55].forEach((d, i) => {
        const x = Math.sin(d) * 0.3;
        fist.add(mesh(taperTube([V3(x, 0.05, 0.12), V3(x * 1.1, 0.0, 0.3), V3(x * 1.15, -0.16, 0.32), V3(x * 1.1, -0.2, 0.18)], 0.1, 0.07, 14, 10), limbMat));
      });
      fist.add(mesh(taperTube([V3(-0.18 * s, 0.0, 0.0), V3(-0.32 * s, -0.05, 0.12), V3(-0.3 * s, -0.17, 0.25)], 0.09, 0.05, 10, 8), limbMat));
      const cuff = mesh(mossBlob(0.24, 5 + s, 0.6), mossMat);
      cuff.position.set(0.34 * s, -1.42, 0.5);
      pivot.add(cuff);
      return { pivot, s, fist };
    });

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      root.add(g);
      g.add(mesh(taperTube([V3(0.42 * s, 1.3, -0.28), V3(0.6 * s, 0.95, -0.36), V3(0.72 * s, 0.6, -0.32), V3(0.74 * s, 0.22, -0.26)], 0.4, 0.28, 24, 40, 8), limbMat));
      const hipGeo = new THREE.SphereGeometry(0.44, 80, 40);
      {
        const pos = hipGeo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const z = pos.getZ(i);
          const a = Math.atan2(z, x);
          const gv = Math.abs(Math.cos(a * 4 + y * 6));
          const k = 1.01 - 0.07 * Math.pow(gv, 16);
          pos.setXYZ(i, x * k, y * k * 1.1, z * k);
        }
        hipGeo.computeVertexNormals();
      }
      const hip = mesh(hipGeo, barkMat);
      hip.position.set(0.5 * s, 1.05, -0.4);
      g.add(hip);
      const foot = new THREE.Group();
      foot.position.set(0.74 * s, 0.14, -0.24);
      g.add(foot);
      const pad = mesh(new THREE.SphereGeometry(0.36, 28, 16), limbMat);
      pad.scale.set(1.05, 0.5, 1.1);
      foot.add(pad);
      [-1.0, -0.45, 0.1, 0.65, 2.6].forEach((d, i) => {
        const a = d + s * 0.3;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        const len = i === 4 ? 0.45 : 0.5 + (i % 2) * 0.1;
        foot.add(mesh(taperTube([V3(dx * 0.15, 0.02, dz * 0.15), V3(dx * len * 0.55, -0.04, dz * len * 0.55), V3(dx * len, -0.12, dz * len), V3(dx * len * 1.2, -0.14, dz * len * 1.2)], 0.12, 0.02, 14, 10), limbMat));
      });
      return g;
    });

    const spikes = [];
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * Math.PI * 2 + 0.2;
      const r = 2.0 + (k % 3) * 0.2;
      const g = new THREE.Group();
      g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r * 0.85 + 0.3);
      g.rotation.y = -a;
      const h = 0.55 + (k % 4) * 0.15;
      g.add(mesh(taperTube([V3(0, -0.05, 0), V3(0.05, h * 0.45, 0), V3(0.15, h * 0.8, 0.02), V3(0.22, h, 0.03)], 0.13, 0.015, 14, 10), limbMat, false));
      g.visible = false;
      root.add(g);
      spikes.push({ g, d: (k % 4) * 0.025 });
    }
    const quake = mesh(new THREE.RingGeometry(0.85, 1.0, 64), new THREE.MeshBasicMaterial({ color: 0xc8a070, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }), false);
    quake.rotation.x = -Math.PI / 2;
    quake.position.set(0, 0.02, 0.6);
    root.add(quake);
    const dust = [];
    for (let k = 0; k < 18; k++) {
      const d = mesh(new THREE.SphereGeometry(0.06 + (k % 3) * 0.03, 8, 6), new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 1 }), false);
      d.visible = false;
      root.add(d);
      dust.push({ d, a: k * 2.39, v: 0.7 + (k % 5) * 0.2, s: k % 2 ? 1 : -1 });
    }
    const falling = [];
    for (let k = 0; k < 10; k++) {
      const l = mesh(oakLeaf(0.22, 0.08, 0.3), leafMat, false);
      l.visible = false;
      root.add(l);
      falling.push({ l, x: Math.sin(k * 2.3) * 0.8, z: -1.0 + Math.cos(k * 1.9) * 0.5, d: (k % 5) * 0.05, sp: 1 + (k % 3) * 0.6 });
    }
    const petals = [];
    for (let k = 0; k < 14; k++) {
      const p = mesh(new THREE.SphereGeometry(0.035, 8, 6), petalMat, false);
      p.scale.set(1, 0.25, 0.7);
      p.visible = false;
      root.add(p);
      petals.push({ p, a: k * 2.7, r: 0.4 + (k % 4) * 0.25, d: (k % 7) * 0.05 });
    }

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, action, motion, reduceMotion } = s;
        const eat = action && action.name === "eat" ? action : null;
        const slam = action && action.name === "slam" ? action : null;
        const bl = action && action.name === "bloom" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        const breath = Math.sin(t * 1.1) * motion;
        let pitch = breath * 0.015;
        let lift = 0;
        let armRaise = 0;
        let jawOpen = 0;
        let headUp = 0;
        let shake = 0;
        let glow = 0.85 + Math.sin(t * 1.6) * 0.15;
        let hit = 0;
        let blossom = 0;

        if (slam) {
          const p = slam.p;
          const up = smooth(0.05, 0.38, p) * (1 - smooth(0.42, 0.5, p));
          pitch -= up * 0.3;
          lift = up * 0.15;
          armRaise = up * 2.0;
          headUp = up * 0.3;
          jawOpen = up * 0.6 + (p > 0.48 && p < 0.7 ? 0.5 * (1 - smooth(0.5, 0.7, p)) : 0);
          hit = p > 0.48 ? Math.max(0, 1 - (p - 0.48) / 0.12) : 0;
          pitch += hit * 0.06;
          shake = hit;
          glow += up * 0.8 + hit * 1.5;
        }

        if (bl) {
          const p = bl.p;
          blossom = smooth(0.15, 0.45, p) * (1 - smooth(0.82, 0.98, p));
          pitch -= Math.sin(smooth(0.05, 0.4, p) * Math.PI) * 0.08;
          headUp = Math.sin(smooth(0.05, 0.6, p) * Math.PI) * 0.25;
          glow += blossom * 0.9;
        }

        if (eat) {
          food.visible = ph.visible;
          const mouth = V3(0, HEAD.y - 0.2, HEAD.z + 0.5);
          food.position.set(0, lerp(4.2, mouth.y, ph.fall * ph.fall), lerp(1.4, mouth.z, ph.fall));
          food.scale.setScalar((1 - 0.85 * ph.bite) * 1.3);
          headUp = Math.sin(Math.min(1, ph.fall) * Math.PI * 0.5) * 0.25 * (1 - ph.bite);
          jawOpen = (eat.p > 0.12 && eat.p < 0.45 ? smooth(0.12, 0.3, eat.p) : 0) + ph.chew * 0.35;
        } else food.visible = false;

        torsoPivot.rotation.x = pitch;
        torsoPivot.position.y = HIP.y + lift + breath * 0.012;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        root.position.x = shake && !reduceMotion ? Math.sin(t * 70) * 0.03 * shake : 0;

        headPivot.rotation.y = lerp(headPivot.rotation.y, pointer.x * 0.35, 0.08);
        headPivot.rotation.x = lerp(headPivot.rotation.x, -pointer.y * 0.15 - headUp, 0.12);
        jaw.rotation.x = jawOpen * 0.45;
        beard.forEach((b, i) => {
          b.rotation.x = Math.sin(t * 1.4 + i * 0.6) * 0.04 * motion;
        });

        arms.forEach(({ pivot, s: sd }) => {
          pivot.rotation.x = lerp(pivot.rotation.x, -armRaise * 0.75 - (bl ? blossom * 0.15 : 0), 0.2);
          pivot.rotation.z = lerp(pivot.rotation.z, sd * (armRaise * 0.12 + breath * 0.01), 0.2);
        });

        sapMat.emissiveIntensity = glow;
        eyeGlows.forEach(g => {
          g.material.emissiveIntensity = 1.1 + glow * 0.5;
        });
        eyeLight.intensity = 0.3 + glow * 0.3;

        canopy.rotation.z = Math.sin(t * 0.7) * 0.03 * motion + (slam ? Math.sin(t * 25) * 0.06 * hit : 0) + blossom * Math.sin(t * 3) * 0.02;
        canopy.rotation.x = Math.sin(t * 0.55 + 1) * 0.025 * motion;
        canopy.scale.setScalar(1.15 + blossom * 0.06);
        canopyLeaves.forEach((pv, i) => {
          pv.rotation.z = Math.sin(t * 2.2 + i) * 0.06 * motion;
        });
        acorns.forEach((a, i) => {
          a.rotation.z = Math.sin(t * 1.8 + i * 2) * 0.15 * motion + (slam ? Math.sin(t * 30 + i) * 0.4 * hit : 0);
        });

        flowers.forEach(({ fg, d }) => {
          const k = bl ? smooth(0.18 + d, 0.42 + d, bl.p) * (1 - smooth(0.82, 0.96, bl.p)) : 0;
          fg.visible = k > 0.01;
          fg.scale.setScalar(Math.max(0.001, k * 1.3));
        });
        petals.forEach(({ p, a, r, d }) => {
          const q = bl ? (bl.p - 0.4 - d) / 0.5 : -1;
          p.visible = q > 0 && q < 1 && !reduceMotion;
          if (p.visible) {
            const c = canopy.getWorldPosition(V3(0, 0, 0));
            root.worldToLocal(c);
            p.position.set(c.x + Math.cos(a + q * 2) * (r + q * 0.8), c.y - q * 2.6, c.z + Math.sin(a + q * 2) * (r + q * 0.8));
            p.rotation.set(q * 9 + a, q * 6, a);
          }
        });

        spikes.forEach(({ g, d }) => {
          const k = slam ? smooth(0.48 + d, 0.56 + d, slam.p) * (1 - smooth(0.75, 0.92, slam.p)) : 0;
          g.visible = k > 0.01 && !reduceMotion;
          g.scale.set(1, Math.max(0.001, k), 1);
        });
        const qk = slam ? (slam.p - 0.48) / 0.35 : -1;
        quake.material.opacity = qk > 0 && qk < 1 && !reduceMotion ? (1 - qk) * 0.6 : 0;
        quake.scale.setScalar(1 + Math.max(0, qk) * 2.8);
        dust.forEach(({ d, a, v, s: sd }) => {
          const q = slam ? (slam.p - 0.48) / 0.3 : -1;
          d.visible = q > 0 && q < 1 && !reduceMotion;
          if (d.visible) {
            const r = 0.3 + q * 1.4 * v;
            d.position.set(1.35 * sd + Math.cos(a) * r, Math.sin(q * Math.PI) * 0.7 * v, 1.0 + Math.sin(a) * r * 0.7);
          }
        });
        falling.forEach(({ l, x, z, d, sp }) => {
          const q = slam ? (slam.p - 0.5 - d) / 0.45 : -1;
          l.visible = q > 0 && q < 1 && !reduceMotion;
          if (l.visible) {
            l.position.set(x + Math.sin(q * 7 * sp) * 0.25, 3.4 - q * 3.4, z + q * 0.6);
            l.rotation.set(q * 6 * sp, q * 4, Math.sin(q * 9) * 0.8);
          }
        });
      }
    };
  }
});
