Pets.register({
  id: "raizote",
  dex: 2,
  name: "Raizote",
  color: "#6cc48a",
  types: ["grass", "ground"],
  evolvesTo: "colossilva",
  evolveLevel: 15,
  description: "A casca da semente escorregou para a nuca e dela nasceu uma arvorezinha. O corpo endureceu em madeira, e ele já anda apoiado nos punhos de raiz, igualzinho ao colosso que vai virar. Quando gosta de um lugar, finca os punhos no chão e faz brotar plantinhas em volta.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    root: { duration: 3.2 }
  },
  idle: [
    { action: "root", min: 25, max: 50 },
    { action: "jump", min: 30, max: 60 }
  ],
  clickAction: n => ["root", "jump"][(n - 1) % 2],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
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

    const HIP = V3(0, 0.7, -0.05);
    const torsoPivot = new THREE.Group();
    torsoPivot.position.copy(HIP);
    root.add(torsoPivot);
    const torso = new THREE.Group();
    torso.position.copy(HIP).multiplyScalar(-1);
    torsoPivot.add(torso);

    const TC = V3(0, 1.0, -0.05);
    const TR = V3(0.64, 0.6, 0.58);
    const torsoGeo = new THREE.SphereGeometry(1, 150, 80);
    {
      const pos = torsoGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const bark = hexParts(0xffffff);
      const moss = hexParts(0xa8d88a);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const gv = Math.abs(Math.cos(a * 6 + y * 1.5 + Math.sin(y * 4 + a * 2) * 0.35));
        const k = 1 + 0.01 - 0.06 * Math.pow(gv, 18);
        pos.setXYZ(i, x * TR.x * k, y * TR.y * k, z * TR.z * k);
        const m = smooth(0.3, 0.7, z) * smooth(0.1, -0.5, y);
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(bark[j], moss[j], m * 0.9);
      }
      torsoGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      torsoGeo.computeVertexNormals();
    }
    const torsoMesh = mesh(torsoGeo, new THREE.MeshStandardMaterial({ vertexColors: true, color: 0xb89a7a, roughness: 0.92, map: barkTex, bumpMap: barkTex, bumpScale: 0.07 }));
    torsoMesh.position.copy(TC);
    torsoMesh.rotation.x = 0.08;
    torso.add(torsoMesh);
    {
      const bellyTex = canvasTex(256, 256, (g, rnd) => {
        const gr = g.createRadialGradient(128, 110, 10, 128, 128, 150);
        gr.addColorStop(0, "#b8f0c0");
        gr.addColorStop(1, "#5a9c6c");
        g.fillStyle = gr;
        g.fillRect(0, 0, 256, 256);
      }, 1, 1);
      const bellyMask = canvasTex(256, 256, (g, rnd) => {
        g.fillStyle = "#000";
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "#fff";
        g.beginPath();
        for (let i = 0; i <= 48; i++) {
          const t = (i / 48) * Math.PI * 2;
          const rr = 0.42 + 0.03 * Math.sin(t * 7) + (rnd() - 0.5) * 0.03;
          const x = 128 + Math.cos(t) * rr * 256;
          const y = 128 + Math.sin(t) * rr * 256 * 1.05;
          if (i) g.lineTo(x, y);
          else g.moveTo(x, y);
        }
        g.fill();
      }, 1, 1);
      [bellyTex, bellyMask].forEach(t => {
        if (t) {
          t.wrapS = THREE.ClampToEdgeWrapping;
          t.wrapT = THREE.ClampToEdgeWrapping;
        }
      });
      const bellyGeo = new THREE.SphereGeometry(1, 64, 40, Math.PI / 2 - 0.75, 1.5, Math.PI * 0.32, Math.PI * 0.5);
      const pos = bellyGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) * TR.x * 1.025, pos.getY(i) * TR.y * 1.025, pos.getZ(i) * TR.z * 1.025);
      bellyGeo.computeVertexNormals();
      const belly = mesh(bellyGeo, new THREE.MeshStandardMaterial({ map: bellyTex, alphaMap: bellyMask, alphaTest: 0.5, roughness: 0.6, bumpMap: bellyTex, bumpScale: 0.01 }), false);
      torsoMesh.add(belly);
      let sd = 21;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };
      const onBody = (phi, th, lift) => V3(-Math.cos(phi) * Math.sin(th) * TR.x * lift, Math.cos(th) * TR.y * lift, Math.sin(phi) * Math.sin(th) * TR.z * lift);
      const grow = (phi, th, dir, w, depth, steps, bend, split) => {
        const pts = [];
        let p = phi;
        let t = th;
        let d = dir;
        const len = 0.06 + w * 0.7;
        for (let i = 0; i <= steps; i++) {
          pts.push(onBody(p, t, 1.018 + w * 0.15));
          d += bend + (rnd() - 0.5) * 0.4;
          p += Math.cos(d) * len;
          t += Math.sin(d) * len;
        }
        torsoMesh.add(mesh(taperTube(pts, w, w * 0.6, 6 + steps * 4, 12), limbMat, false));
        if (depth > 1) {
          const n = rnd() < split ? 3 : 2;
          for (let k = 0; k < n; k++) {
            const off = n === 3 ? (k - 1) * (0.5 + rnd() * 0.4) : (k ? 1 : -1) * (0.3 + rnd() * 0.7);
            const sub = Math.max(1, steps - 1 - ((rnd() * 2) | 0));
            grow(p - Math.cos(d) * len, t - Math.sin(d) * len, d + off, w * (0.45 + rnd() * 0.25), depth - 1, sub, -bend * 0.5 + (rnd() - 0.5) * 0.3, split * 0.5);
          }
        } else {
          torsoMesh.add(mesh(taperTube([pts[pts.length - 1], onBody(p, t, 1.016)], w * 0.6, 0.003, 4, 8), limbMat, false));
        }
      };
      [
        [0.25, 0.06, 3, 5, 0.12, 0.6],
        [0.95, 0.032, 1, 3, -0.2, 0],
        [1.5, 0.05, 2, 4, 0.18, 0.3],
        [2.1, 0.028, 2, 2, -0.1, 0],
        [2.9, 0.065, 3, 3, -0.15, 0.8],
        [3.85, 0.038, 2, 5, 0.25, 0.2],
        [4.45, 0.03, 1, 4, -0.3, 0],
        [5.3, 0.055, 3, 2, 0.1, 0.5]
      ].forEach(([a, w, depth, steps, bend, split]) => {
        const p0 = Math.PI / 2 + Math.cos(a) * 0.72;
        const t0 = Math.PI * 0.57 + Math.sin(a) * 0.72;
        grow(p0, t0, a + Math.PI + (rnd() - 0.5) * 0.5, w, depth, steps, bend * 0.4, split);
      });
    }
    [[-1.0, 0.25, -1.3, -0.25], [-2.1, 0.3, -1.9, -0.2]].forEach(([t0, p0, t1, p1], k) => {
      const pts = [];
      for (let i = 0; i <= 6; i++) {
        const f = i / 6;
        const th = lerp(t0, t1, f) + (i % 2 ? 0.04 : -0.04);
        const ph = lerp(p0, p1, f);
        pts.push(V3(Math.cos(ph) * Math.cos(th) * TR.x, Math.sin(ph) * TR.y, Math.cos(ph) * Math.sin(th) * TR.z).multiplyScalar(1.02));
      }
      torsoMesh.add(mesh(tubeFrom(new THREE.CatmullRomCurve3(pts), f => 0.016 * Math.sin(Math.PI * f) + 0.004, 24, 6), sapMat, false));
    });

    const shoulders = [-1, 1].map(s => {
      const g = new THREE.SphereGeometry(0.25, 90, 40);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const gv = Math.abs(Math.cos(a * 4 + y * 5));
        const k = 1 + 0.01 - 0.07 * Math.pow(gv, 16);
        pos.setXYZ(i, x * k * 1.05, y * k * 0.9, z * k);
      }
      g.computeVertexNormals();
      const m = mesh(g, barkMat);
      m.position.set(0.58 * s, 1.26, -0.02);
      torso.add(m);
      const moss = mesh(mossCap(0.25, 1.05, 0.9, 1.0, 3 + s, 0.38), mossMat, false);
      moss.position.copy(m.position);
      torso.add(moss);
      return m;
    });

    const HEAD = V3(0, 1.52, 0.12);
    const headPivot = new THREE.Group();
    headPivot.position.copy(HEAD);
    headPivot.scale.setScalar(0.76);
    torso.add(headPivot);
    const headR = 0.57;
    const headGeo = new THREE.SphereGeometry(headR, 64, 48);
    {
      const pos = headGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const top = hexParts(0x62ac74);
      const face = hexParts(0x9ad8a4);
      const low = hexParts(0x4a8a5c);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        pos.setXYZ(i, x * 1.06, y * 0.92, z * 0.96);
        const f = smooth(0.1, 0.45, z / headR) * smooth(0.5, -0.1, y / headR);
        const l = smooth(-0.1, -0.9, y / headR);
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(lerp(top[j], low[j], l), face[j], f * 0.75);
      }
      headGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      headGeo.computeVertexNormals();
    }
    headPivot.add(mesh(headGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 })));
    {
      const edgeTex = canvasTex(256, 256, (g, rnd) => {
        g.fillStyle = "#000";
        g.fillRect(0, 0, 256, 256);
        g.fillStyle = "#fff";
        g.beginPath();
        const N = 40;
        for (let i = 0; i <= N; i++) g.lineTo(14 + Math.sin(i * 0.8) * 6 + (rnd() - 0.5) * 8, (i / N) * 200);
        for (let i = 0; i <= N; i++) g.lineTo(14 + (i / N) * 228, 200 + Math.sin(i * 0.9) * 10 + (rnd() - 0.5) * 12);
        for (let i = N; i >= 0; i--) g.lineTo(242 + Math.sin(i * 0.7 + 2) * 6 + (rnd() - 0.5) * 8, (i / N) * 200);
        g.closePath();
        g.fill();
      }, 1, 1);
      if (edgeTex) {
        edgeTex.wrapS = THREE.ClampToEdgeWrapping;
        edgeTex.wrapT = THREE.ClampToEdgeWrapping;
      }
      const hoodMat = barkMat.clone();
      const hoodTex = barkTex ? barkTex.clone() : null;
      if (hoodTex) {
        hoodTex.repeat.set(1, 1);
        hoodTex.needsUpdate = true;
      }
      hoodMat.map = hoodTex;
      hoodMat.bumpMap = hoodTex;
      hoodMat.alphaMap = edgeTex;
      hoodMat.alphaTest = 0.5;
      hoodMat.side = THREE.DoubleSide;
      const hoodGeo = new THREE.SphereGeometry(headR, 96, 48, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI);
      const pos = hoodGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const gv = Math.abs(Math.cos(a * 5 + y * 4));
        const k = 1.03 - 0.025 * Math.pow(gv, 14);
        pos.setXYZ(i, x * 1.06 * k, y * 0.92 * k, z * 0.96 * k);
      }
      hoodGeo.computeVertexNormals();
      headPivot.add(mesh(hoodGeo, hoodMat, false));
    }

    const capG = new THREE.Group();
    capG.position.set(0, 0.05, -0.04);
    capG.scale.setScalar(0.86 / 0.76);
    capG.rotation.x = -0.18;
    headPivot.add(capG);
    const CAP_T = Math.PI * 0.42;
    const capR = 0.67;
    const capGeo = new THREE.SphereGeometry(capR, 72, 24, 0, Math.PI * 2, 0, CAP_T);
    {
      const pos = capGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const k = 1 + 0.018 * Math.sin(a * 11) * smooth(0.6, 0.3, y / capR);
        pos.setXYZ(i, x * k, y * 0.85, z * k);
      }
      capGeo.computeVertexNormals();
    }
    capG.add(mesh(capGeo, capMat));
    const brimR = Math.sin(CAP_T) * capR;
    const brimY = Math.cos(CAP_T) * capR * 0.85;
    const brim = mesh(new THREE.TorusGeometry(brimR, 0.06, 14, 72), darkBark);
    brim.rotation.x = Math.PI / 2;
    brim.position.y = brimY;
    capG.add(brim);
    [[0.9, 0.6, 0.18], [2.6, 0.5, 0.16], [4.3, 0.55, 0.17]].forEach(([a, h, rr], k) => {
      const m = mesh(mossBlob(rr, k * 2 + 1, 0.3), mossMat, false);
      const ph = Math.acos(h);
      m.position.set(Math.cos(a) * Math.sin(ph) * capR, Math.cos(ph) * capR * 0.85, Math.sin(a) * Math.sin(ph) * capR);
      m.lookAt(m.position.clone().multiplyScalar(2));
      m.rotateX(Math.PI / 2);
      capG.add(m);
    });

    const stalk = new THREE.Group();
    stalk.position.set(0, capR * 0.85 - 0.03, 0);
    capG.add(stalk);
    stalk.add(mesh(taperTube([V3(0, -0.02, 0), V3(0.02, 0.2, 0), V3(-0.03, 0.42, 0.01), V3(0.0, 0.6, 0)], 0.1, 0.05, 20, 20, 5), limbMat));
    stalk.add(mesh(taperTube([V3(0.0, 0.32, 0), V3(0.14, 0.46, 0.02), V3(0.24, 0.56, 0.03)], 0.04, 0.016, 10, 8), limbMat, false));
    stalk.add(mesh(taperTube([V3(0.0, 0.4, 0), V3(-0.14, 0.52, -0.02), V3(-0.22, 0.62, -0.02)], 0.035, 0.014, 10, 8), limbMat, false));
    const crown = new THREE.Group();
    crown.position.set(0, 0.7, 0);
    stalk.add(crown);
    {
      const clumps = [[0, 0.05, 0, 0.3], [0.26, -0.06, 0.05, 0.21], [-0.25, -0.03, -0.03, 0.21], [0.02, -0.05, -0.22, 0.19], [0.0, -0.07, 0.22, 0.19]];
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x24582a, roughness: 0.9 });
      clumps.forEach(([x, y, z, rr]) => {
        const c = mesh(new THREE.SphereGeometry(rr * 0.8, 20, 14), coreMat, false);
        c.position.set(x, y, z);
        c.scale.y = 0.8;
        crown.add(c);
      });
      const leafGeo = oakLeaf(0.19, 0.068, 0.35);
      leafGeo.translate(0, -0.02, 0);
      const counts = clumps.map(([, , , rr]) => Math.round(200 * rr * rr / 0.06));
      const inst = new THREE.InstancedMesh(leafGeo, leafMat, counts.reduce((p, q) => p + q, 0));
      inst.castShadow = true;
      const dummy = new THREE.Object3D();
      const col = new THREE.Color();
      let sd = 3;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };
      let n = 0;
      clumps.forEach(([x, y, z, rr], k) => {
        for (let i = 0; i < counts[k]; i++) {
          const yy = 1 - (2 * (i + 0.5)) / counts[k];
          const rad = Math.sqrt(1 - yy * yy);
          const th = i * 2.39996 + k;
          const dir = V3(Math.cos(th) * rad, yy, Math.sin(th) * rad);
          const d = rr * (0.85 + rnd() * 0.2);
          dummy.position.set(x + dir.x * d, y + dir.y * d * 0.8, z + dir.z * d);
          dummy.lookAt(dummy.position.clone().add(dir.clone().add(V3((rnd() - 0.5) * 0.8, 0.35, (rnd() - 0.5) * 0.8))));
          dummy.rotateZ(rnd() * Math.PI * 2);
          dummy.scale.setScalar(0.8 + rnd() * 0.4);
          dummy.updateMatrix();
          inst.setMatrixAt(n, dummy.matrix);
          const lt = 0.6 + 0.4 * (yy * 0.5 + 0.5) + (rnd() - 0.5) * 0.15;
          col.setRGB(lt, lt, lt * 0.92);
          inst.setColorAt(n, col);
          n++;
        }
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      crown.add(inst);
    }

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.5 });
      e.g.position.set(0.16 * s, 0.01, headR * 0.95);
      e.g.rotation.y = 0.28 * s;
      const lid = mesh(new THREE.SphereGeometry(0.22 * 0.5 * 1.08, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.3), new THREE.MeshStandardMaterial({ color: 0x8fcf9a, roughness: 0.55 }), false);
      lid.scale.set(1, 1.1, 0.62);
      lid.rotation.x = 0.12;
      e.g.add(lid);
      headPivot.add(e.g);
      return e;
    });
    const brows = [-1, 1].map(s => {
      const b = mesh(taperTube([V3(0.06 * s, -0.012, 0.01), V3(0.16 * s, 0.018, -0.005), V3(0.26 * s, 0.012, -0.05)], 0.05, 0.03, 12, 10), darkBark, false);
      b.position.set(0, 0.13, headR * 0.9);
      headPivot.add(b);
      return b;
    });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.6 });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), cheekMat);
      c.scale.set(1, 0.7, 1);
      c.position.set(0.3 * s, -0.1, headR * 0.86);
      c.rotation.y = 0.5 * s;
      headPivot.add(c);
    });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a1a10, roughness: 0.5 });
    const smile = mesh(new THREE.TorusGeometry(0.085, 0.019, 10, 20, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI + 0.14;
    smile.scale.y = 0.8;
    smile.position.set(0.02, -0.12, headR * 0.93);
    headPivot.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.085, 20, 14), mouthMat, false);
    openMouth.scale.set(1, 0.9, 0.4);
    openMouth.position.set(0, -0.18, headR * 0.9);
    openMouth.visible = false;
    headPivot.add(openMouth);
    const earLeaves = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.46 * s, 0.1, -0.05);
      pv.rotation.set(0, s * 0.3, -s * 1.2);
      const l = mesh(oakLeaf(0.36, 0.12, 0.35), leafMat, false);
      l.rotation.x = -0.4;
      pv.add(l);
      headPivot.add(pv);
      return { pv, s };
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.64 * s, 1.22, 0.02);
      torso.add(pivot);
      const centre = new THREE.CatmullRomCurve3([V3(0, 0.02, 0), V3(0.13 * s, -0.25, 0.05), V3(0.17 * s, -0.5, 0.12), V3(0.14 * s, -0.66, 0.18)]);
      const frames = centre.computeFrenetFrames(20, false);
      for (let k = 0; k < 2; k++) {
        const pts = [];
        for (let i = 0; i <= 20; i++) {
          const f = i / 20;
          const a = k * Math.PI + f * 2.4 * s;
          const off = 0.07;
          pts.push(centre.getPointAt(f).add(frames.normals[i].clone().multiplyScalar(Math.cos(a) * off)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a) * off)));
        }
        pivot.add(mesh(tubeFrom(new THREE.CatmullRomCurve3(pts), f => lerp(0.12, 0.09, f), 40, 22, 4), limbMat));
      }
      const fist = new THREE.Group();
      fist.position.set(0.14 * s, -0.75, 0.21);
      fist.scale.setScalar(0.85);
      pivot.add(fist);
      const palm = mesh(new THREE.SphereGeometry(0.17, 24, 16), limbMat);
      palm.scale.set(1.05, 0.8, 1.0);
      fist.add(palm);
      const fingers = [-0.45, 0, 0.45].map(d => {
        const x = Math.sin(d) * 0.17;
        const f = mesh(taperTube([V3(x, 0.03, 0.07), V3(x * 1.1, 0.0, 0.17), V3(x * 1.15, -0.09, 0.19), V3(x * 1.1, -0.12, 0.11)], 0.06, 0.04, 12, 8), limbMat);
        fist.add(f);
        return f;
      });
      fist.add(mesh(taperTube([V3(-0.1 * s, 0.0, 0.0), V3(-0.18 * s, -0.03, 0.07), V3(-0.17 * s, -0.1, 0.14)], 0.05, 0.03, 10, 8), limbMat));
      const cuff = mesh(mossBlob(0.14, 5 + s, 0.6), mossMat);
      cuff.position.set(0.16 * s, -0.56, 0.15);
      pivot.add(cuff);
      return { pivot, s, fist, fingers };
    });

    const legs = [-1, 1].map(s => {
      const g = new THREE.Group();
      root.add(g);
      g.add(mesh(taperTube([V3(0.3 * s, 0.72, -0.08), V3(0.36 * s, 0.42, -0.02), V3(0.38 * s, 0.16, 0.02)], 0.2, 0.17, 16, 32, 6), limbMat));
      const foot = new THREE.Group();
      foot.position.set(0.38 * s, 0.1, 0.04);
      g.add(foot);
      const pad = mesh(new THREE.SphereGeometry(0.22, 24, 14), limbMat);
      pad.scale.set(1.05, 0.55, 1.1);
      foot.add(pad);
      const toes = [-0.8, -0.1, 0.6, 2.7].map((d, i) => {
        const a = d + s * 0.3;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        const len = i === 3 ? 0.28 : 0.32;
        const t = mesh(taperTube([V3(dx * 0.1, 0.02, dz * 0.1), V3(dx * len * 0.55, -0.02, dz * len * 0.55), V3(dx * len, -0.08, dz * len), V3(dx * len * 1.2, -0.1, dz * len * 1.2)], 0.075, 0.015, 12, 8), limbMat);
        foot.add(t);
        return t;
      });
      return { g, foot, toes };
    });

    const sprouts = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + 0.3;
      const r = 1.35 + (k % 3) * 0.2;
      const g = new THREE.Group();
      g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r + 0.2);
      g.rotation.y = -a + (k % 2) * 0.6;
      g.add(mesh(taperTube([V3(0, -0.02, 0), V3(0.01, 0.14, 0), V3(0.03, 0.26, 0.01)], 0.03, 0.015, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5fae4a, roughness: 0.6 }), false));
      [-1, 1].forEach(sd => {
        const l = mesh(oakLeaf(0.2, 0.07, 0.4), leafMat, false);
        l.position.set(0.03, 0.25, 0.01);
        l.rotation.set(0, 0, -sd * 0.9);
        g.add(l);
      });
      g.scale.setScalar(0.001);
      g.visible = false;
      root.add(g);
      sprouts.push({ g, d: (k % 4) * 0.06 + (k % 3) * 0.03 });
    }
    const roots = [];
    arms.forEach(({ s }) => {
      for (let k = 0; k < 3; k++) {
        const a = (k - 1) * 0.7 + (s > 0 ? 0.3 : -0.3);
        const g = new THREE.Group();
        g.position.set(0.38 * s, 0, 0.1);
        g.rotation.y = a + (s > 0 ? -0.6 : 0.6);
        g.add(mesh(taperTube([V3(0, 0.02, 0), V3(0, 0.0, 0.25), V3(0, -0.02, 0.5), V3(0, 0.0, 0.7)], 0.05, 0.01, 14, 8), limbMat, false));
        g.scale.set(1, 1, 0.001);
        g.visible = false;
        root.add(g);
        roots.push(g);
      }
    });
    const dirt = [];
    for (let k = 0; k < 10; k++) {
      const d = mesh(new THREE.SphereGeometry(0.05 + (k % 3) * 0.02, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }), false);
      d.visible = false;
      root.add(d);
      dirt.push({ d, a: k * 2.4, s: k % 2 ? 1 : -1, v: 0.8 + (k % 4) * 0.25 });
    }

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const rt = action && action.name === "root" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        const breath = Math.sin(t * 1.6) * motion;
        let y = 0;
        let pitch = breath * 0.015;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let dig = 0;
        let grow = 0;
        let armUp = 0;
        let headUp = 0;
        let crouch = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.2) crouch = Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.76) {
            const q = (p - 0.2) / 0.56;
            y = Math.sin(q * Math.PI) * 0.8;
            airborne = true;
            armUp = Math.sin(q * Math.PI);
            pitch -= Math.sin(q * Math.PI) * 0.2;
          } else crouch = Math.sin(((p - 0.76) / 0.24) * Math.PI) * 0.8;
        }
        if (rt) {
          const p = rt.p;
          dig = smooth(0.05, 0.25, p) * (1 - smooth(0.82, 0.98, p));
          grow = smooth(0.3, 0.6, p) * (1 - smooth(0.8, 0.97, p));
          pitch += dig * 0.12 - grow * 0.1;
          squint = p > 0.25 && p < 0.8;
          mouthOpen = p > 0.32 && p < 0.55;
          headUp = grow * 0.2;
        }
        if (eat) {
          food.visible = ph.visible;
          const m = V3(0, HEAD.y - 0.18, HEAD.z + headR + 0.05);
          food.position.set(0, lerp(3.6, m.y, ph.fall * ph.fall), lerp(1.0, m.z, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          headUp = Math.sin(Math.min(1, ph.fall) * Math.PI * 0.5) * 0.2 * (1 - ph.bite);
          openMouth.scale.y = 0.6 + ph.chew * 0.6;
        } else {
          food.visible = false;
          openMouth.scale.y = 0.9;
        }

        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        torsoPivot.position.y = HIP.y - crouch * 0.12 + breath * 0.01;
        torsoPivot.rotation.x = pitch;
        headPivot.rotation.y = lerp(headPivot.rotation.y, pointer.x * 0.4, 0.1);
        headPivot.rotation.x = lerp(headPivot.rotation.x, -pointer.y * 0.18 - headUp, 0.12);
        headPivot.rotation.z = Math.sin(t * 1.2) * 0.03 * motion;

        smile.visible = !(airborne || mouthOpen);
        openMouth.visible = airborne || mouthOpen;

        arms.forEach(({ pivot, s: sd, fist }) => {
          pivot.rotation.x = lerp(pivot.rotation.x, -armUp * 1.6 - grow * 0.2, 0.2);
          pivot.rotation.z = lerp(pivot.rotation.z, sd * (armUp * 0.5 + breath * 0.01), 0.2);
          fist.position.y = -0.75;
        });
        legs.forEach(({ toes }) => {
          toes.forEach(tt => tt.scale.setScalar(1 + dig * 0.3));
        });

        stalk.rotation.z = Math.sin(t * 1.8) * 0.06 * motion + (jump ? Math.sin(t * 18) * 0.1 : 0);
        crown.scale.setScalar(1 + grow * 0.25);
        earLeaves.forEach(({ pv, s: sd }) => {
          pv.rotation.z = -sd * (1.2 - armUp * 0.4 - grow * 0.3 + Math.sin(t * 2.4 + sd) * 0.06 * motion);
        });

        sprouts.forEach(({ g, d }) => {
          const k = rt ? smooth(0.3 + d, 0.55 + d, rt.p) * (1 - smooth(0.82, 0.96, rt.p)) : 0;
          g.visible = k > 0.01 && !reduceMotion;
          g.scale.setScalar(Math.max(0.001, k * (1 + Math.sin(t * 6 + d * 40) * 0.05)));
        });
        roots.forEach((g, i) => {
          const k = rt ? smooth(0.12 + i * 0.02, 0.35 + i * 0.02, rt.p) * (1 - smooth(0.82, 0.96, rt.p)) : 0;
          g.visible = k > 0.01 && !reduceMotion;
          g.scale.set(1, 1, Math.max(0.001, k));
        });
        dirt.forEach(({ d, a, s: sd, v }) => {
          const q = rt ? (rt.p - 0.06) / 0.25 : -1;
          d.visible = q > 0 && q < 1 && !reduceMotion;
          if (d.visible) {
            const r = 0.3 + q * 0.8 * v;
            d.position.set(0.38 * sd + Math.cos(a) * r, Math.sin(q * Math.PI) * 0.5 * v, 0.1 + Math.sin(a) * r);
          }
        });

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.1 : squint ? 0.4 : blink;
        });
        followPupils(eyes, pointer);
      }
    };
  }
});
