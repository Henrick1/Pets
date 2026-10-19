Pets.register({
  id: "raizote",
  dex: 2,
  name: "Raizote",
  color: "#6cc48a",
  types: ["grass", "ground"],
  evolvesTo: "colossilva",
  evolveLevel: 15,
  description: "A semente endureceu e virou um chapéu de casca, e os pezinhos criaram raízes de verdade. Quando para num lugar que gosta, finca as raízes no chão e faz brotar plantinhas em volta.",
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
    const { mat, mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const canvasTex = (w, h, draw, rx, ry) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let seed = 7;
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
    const barkTex = canvasTex(256, 512, drawBark, 1, 1);

    const scaleTex = canvasTex(256, 256, (g, rnd) => {
      g.fillStyle = "#6a4426";
      g.fillRect(0, 0, 256, 256);
      const rows = 8;
      const cols = 8;
      for (let r = rows; r >= -1; r--) {
        for (let c = -1; c <= cols; c++) {
          const x = (c + (r % 2 ? 0.5 : 0)) * (256 / cols);
          const y = r * (256 / rows);
          const rw = 256 / cols * 0.62;
          const rh = 256 / rows * 0.95;
          const v = (150 + rnd() * 60) | 0;
          const gr = g.createRadialGradient(x, y - rh * 0.3, 2, x, y, rh);
          gr.addColorStop(0, "rgb(" + v + "," + ((v * 0.72) | 0) + "," + ((v * 0.45) | 0) + ")");
          gr.addColorStop(1, "rgb(" + ((v * 0.55) | 0) + "," + ((v * 0.38) | 0) + "," + ((v * 0.22) | 0) + ")");
          g.fillStyle = gr;
          g.beginPath();
          g.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2);
          g.fill();
          g.strokeStyle = "rgba(40,22,10,0.6)";
          g.lineWidth = 2;
          g.stroke();
        }
      }
    }, 7, 2.5);

    const barkMat = new THREE.MeshStandardMaterial({ color: 0xc8a888, roughness: 0.9, map: barkTex, bumpMap: barkTex, bumpScale: 0.04 });
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
    const sapMat = new THREE.MeshStandardMaterial({ color: 0xffb648, emissive: 0xff8a10, emissiveIntensity: 0.8, roughness: 0.3 });

    const capMat = new THREE.MeshStandardMaterial({ color: 0xc89868, roughness: 0.75, map: scaleTex, bumpMap: scaleTex, bumpScale: 0.035 });
    const leafMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide });

    const lumps = (x, y, z, sd) =>
      Math.sin(x * 7.1 + sd) * Math.sin(y * 6.3 + sd * 1.7) * Math.sin(z * 5.9 - sd) * 0.6 +
      Math.sin(x * 13.7 - y * 11.1 + z * 9.3 + sd * 2.3) * 0.3;

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

    const taperTube = (pts, r0, r1, seg = 16, rad = 10) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const frames = curve.computeFrenetFrames(seg, false);
      const pos = [];
      const uv = [];
      const idx = [];
      for (let i = 0; i <= seg; i++) {
        const f = i / seg;
        const p = curve.getPointAt(f);
        const r = lerp(r0, r1, Math.pow(f, 0.8));
        for (let j = 0; j <= rad; j++) {
          const a = (j / rad) * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
          pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
          uv.push(j / rad, f);
        }
      }
      for (let i = 0; i < seg; i++) {
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    const oakLeaf = (len, wid, curl = 0.25) => {
      const N = 40;
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
      const g = new THREE.ShapeGeometry(shape, 6);
      const pos = g.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const A = hexParts(0x3f9a4a);
      const B = hexParts(0x9ee070);
      const M = hexParts(0xc8f2a0);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const f = y / len;
        pos.setZ(i, -Math.abs(x) * 0.35 * (1 - f * 0.5) + f * f * curl * len);
        const rib = Math.max(0, 1 - Math.abs(x) / (wid * 0.08));
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(lerp(A[j], B[j], f * 0.8 + Math.abs(x) / wid * 0.3), M[j], rib * 0.7);
      }
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    };

    const R = 1.05;
    const CY = 1.08;
    const bodyGeo = new THREE.SphereGeometry(R, 72, 54);
    {
      const pos = bodyGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const top = hexParts(0x68b47c);
      const belly = hexParts(0xb6ecc0);
      const low = hexParts(0x4e9264);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const w = 1 + 0.08 * smooth(0.2, -0.8, y / R);
        pos.setXYZ(i, x * w, y * 0.97, z * w);
        const b = smooth(0.35, 0.85, z / R) * smooth(0.3, -0.3, y / R);
        const l = smooth(-0.2, -0.95, y / R);
        for (let j = 0; j < 3; j++) col[i * 3 + j] = lerp(lerp(top[j], low[j], l), belly[j], b * 0.8);
      }
      bodyGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      bodyGeo.computeVertexNormals();
    }
    const body = mesh(bodyGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
    body.position.y = CY;
    squash.add(body);

    const shellGeo = new THREE.SphereGeometry(R, 120, 60, Math.PI + 0.15, Math.PI - 0.3, Math.PI * 0.3, Math.PI * 0.55);
    {
      const pos = shellGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const phi = Math.acos(Math.max(-1, Math.min(1, y / R)));
        const ea = Math.min(a + Math.PI - 0.15, -0.15 - a) / 0.5;
        const ep = Math.min(phi - Math.PI * 0.3, Math.PI * 0.85 - phi) / 0.35;
        const e = smooth(0, 1, Math.min(ea, ep) + 0.15 * Math.sin(a * 9 + y * 6));
        const gv = Math.abs(Math.cos(a * 6 + y * 1.5 + Math.sin(y * 5 + a * 2) * 0.3));
        const w = 1 + 0.08 * smooth(0.2, -0.8, y / R);
        const k = 1.012 + e * (0.04 - 0.035 * Math.pow(gv, 16));
        pos.setXYZ(i, x * w * k, y * 0.97 * k, z * w * k);
      }
      shellGeo.computeVertexNormals();
    }
    const edgeTex = canvasTex(256, 256, (g, rnd) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = "#fff";
      g.beginPath();
      const N = 64;
      for (let i = 0; i <= N; i++) {
        const t = (i / N) * Math.PI * 2;
        const rr = 0.36 + 0.06 * Math.sin(t * 5 + 1) + 0.035 * Math.sin(t * 13) + (rnd() - 0.5) * 0.05;
        const x = 128 + Math.cos(t) * rr * 256 * 1.15;
        const y = 128 + Math.sin(t) * rr * 256;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.fill();
      [[30, 70, 16], [226, 90, 18], [40, 200, 14], [215, 205, 15], [128, 236, 12], [70, 30, 10], [190, 28, 11]].forEach(([cx, cy, rr]) => {
        g.beginPath();
        for (let i = 0; i <= 20; i++) {
          const t = (i / 20) * Math.PI * 2;
          const q = rr * (0.8 + rnd() * 0.4);
          if (i) g.lineTo(cx + Math.cos(t) * q, cy + Math.sin(t) * q * 1.4);
          else g.moveTo(cx + Math.cos(t) * q, cy + Math.sin(t) * q * 1.4);
        }
        g.fill();
      });
    }, 1, 1);
    if (edgeTex) {
      edgeTex.wrapS = THREE.ClampToEdgeWrapping;
      edgeTex.wrapT = THREE.ClampToEdgeWrapping;
    }
    const shellMat = barkMat.clone();
    shellMat.alphaMap = edgeTex;
    shellMat.alphaTest = 0.5;
    shellMat.side = THREE.DoubleSide;
    const shell = mesh(shellGeo, shellMat);
    shell.position.y = CY;
    squash.add(shell);
    {
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const f = i / 8;
        const a = -Math.PI / 2 + 0.45 + (i % 2 ? 0.015 : -0.015);
        const ph = lerp(0.45, 0.66, f) * Math.PI;
        pts.push(V3(Math.cos(a) * Math.sin(ph) * R * 1.085, CY + Math.cos(ph) * R * 0.97 * 1.04, Math.sin(a) * Math.sin(ph) * R * 1.085));
      }
      squash.add(mesh(taperTube(pts, 0.014, 0.006, 30, 6), sapMat, false));
    }

    const capG = new THREE.Group();
    capG.position.set(0, CY + 0.06, -0.03);
    capG.rotation.x = -0.14;
    squash.add(capG);
    const CAP_T = Math.PI * 0.4;
    const capR = 1.13;
    const capGeo = new THREE.SphereGeometry(capR, 72, 24, 0, Math.PI * 2, 0, CAP_T);
    {
      const pos = capGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const k = 1 + 0.015 * Math.sin(a * 11) * smooth(0.6, 0.35, y / capR);
        pos.setXYZ(i, x * k, y * 0.96, z * k);
      }
      capGeo.computeVertexNormals();
    }
    capG.add(mesh(capGeo, capMat));
    const brimY = Math.cos(CAP_T) * capR * 0.96;
    const brimR = Math.sin(CAP_T) * capR;
    const brimGeo = new THREE.TorusGeometry(brimR, 0.075, 14, 72);
    {
      const pos = brimGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const a = Math.atan2(y, x);
        const k = 1 + 0.012 * Math.sin(a * 13);
        pos.setXYZ(i, x * k, y * k, pos.getZ(i) * (1 + 0.25 * Math.sin(a * 7)));
      }
      brimGeo.computeVertexNormals();
    }
    const brim = mesh(brimGeo, new THREE.MeshStandardMaterial({ color: 0x7a5232, roughness: 0.85, map: barkTex, bumpMap: barkTex, bumpScale: 0.015 }));
    brim.rotation.x = Math.PI / 2;
    brim.position.y = brimY;
    capG.add(brim);
    [[0.9, 0.55, 0.32], [2.4, 0.5, 0.26], [4.1, 0.6, 0.3], [5.3, 0.45, 0.22]].forEach(([a, h, rr], k) => {
      const m = mesh(mossBlob(rr, k * 2 + 1, 0.3), mossMat, false);
      const ph = Math.acos(h);
      m.position.set(Math.cos(a) * Math.sin(ph) * capR * 1.0, Math.cos(ph) * capR * 0.96, Math.sin(a) * Math.sin(ph) * capR * 1.0);
      m.lookAt(m.position.clone().multiplyScalar(2));
      m.rotateX(Math.PI / 2);
      capG.add(m);
    });

    const stalk = new THREE.Group();
    stalk.position.set(0, capR * 0.96 - 0.03, 0);
    capG.add(stalk);
    stalk.add(mesh(taperTube([V3(0, -0.02, 0), V3(0.02, 0.18, 0), V3(-0.02, 0.36, 0.01), V3(0.0, 0.5, 0)], 0.1, 0.045, 18, 12), barkMat));
    stalk.add(mesh(taperTube([V3(0.0, 0.26, 0), V3(0.12, 0.38, 0.02), V3(0.2, 0.46, 0.03)], 0.035, 0.015, 10, 8), barkMat, false));
    stalk.add(mesh(taperTube([V3(0.0, 0.32, 0), V3(-0.12, 0.44, -0.02), V3(-0.18, 0.52, -0.02)], 0.03, 0.012, 10, 8), barkMat, false));
    const crown = new THREE.Group();
    crown.position.set(0, 0.58, 0);
    stalk.add(crown);
    {
      const clumps = [[0, 0.04, 0, 0.24], [0.2, -0.06, 0.04, 0.17], [-0.19, -0.03, -0.03, 0.17], [0.02, -0.04, -0.17, 0.15], [0.0, -0.06, 0.17, 0.15]];
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x2c6a2c, roughness: 0.9 });
      clumps.forEach(([x, y, z, rr]) => {
        const c = mesh(new THREE.SphereGeometry(rr * 0.8, 20, 14), coreMat, false);
        c.position.set(x, y, z);
        c.scale.y = 0.8;
        crown.add(c);
      });
      const leafGeo = oakLeaf(0.16, 0.06, 0.35);
      leafGeo.translate(0, -0.02, 0);
      const counts = clumps.map(([, , , rr]) => Math.round(260 * rr * rr / 0.06));
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
    const stalkLeaves = [{ pv: crown, rz: 0 }];

    const earLeaves = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(brimR * 0.93 * s, brimY + 0.04, -0.1);
      pv.rotation.set(0, s * 0.35, -s * 1.15);
      const l = mesh(oakLeaf(0.5, 0.16, 0.35), leafMat);
      l.rotation.x = -0.4;
      pv.add(l);
      capG.add(pv);
      return { pv, s };
    });

    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 1.05 });
      e.g.position.set(0.36 * s, CY + 0.08, 0.93);
      e.g.rotation.y = 0.32 * s;
      squash.add(e.g);
      return e;
    });

    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.7 });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), cheekMat);
      c.scale.set(1, 0.7, 1);
      const p = new THREE.Vector3(0.62 * s, -0.16, 0).setZ(Math.sqrt(1 - 0.62 * 0.62 - 0.16 * 0.16));
      c.position.set(p.x * R * 1.075, CY + p.y * R * 0.97, p.z * R * 1.075);
      c.lookAt(p.x * 3, CY + p.y * 3, p.z * 3);
      squash.add(c);
    });

    const mouthMat = mat(0x5a1e2e, 0.4);
    const smile = mesh(new THREE.TorusGeometry(0.1, 0.026, 12, 24, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, CY - 0.18, 1.065);
    squash.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.11, 24, 16), mouthMat, false);
    openMouth.scale.set(1, 0.9, 0.4);
    openMouth.position.set(0, CY - 0.22, 1.04);
    openMouth.visible = false;
    squash.add(openMouth);

    const feet = [-1, 1].map(s => {
      const f = new THREE.Group();
      f.position.set(0.48 * s, 0.14, 0.2);
      const pad = mesh(new THREE.SphereGeometry(0.3, 28, 16), barkMat);
      pad.scale.set(1.0, 0.6, 1.15);
      f.add(pad);
      const toes = [-0.75, 0, 0.75].map((d, i) => {
        const a = d + s * 0.25;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        const len = i === 1 ? 0.42 : 0.34;
        const g = taperTube([V3(dx * 0.1, 0.02, dz * 0.1), V3(dx * len * 0.55, -0.02, dz * len * 0.55), V3(dx * len, -0.11, dz * len), V3(dx * len * 1.15, -0.13, dz * len * 1.15)], 0.1, 0.018, 14, 10);
        const toe = mesh(g, barkMat);
        f.add(toe);
        return toe;
      });
      const back = mesh(taperTube([V3(0, 0.02, -0.08), V3(s * 0.1, -0.05, -0.3), V3(s * 0.18, -0.12, -0.42)], 0.09, 0.016, 12, 10), barkMat);
      f.add(back);
      squash.add(f);
      return { f, toes };
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(1.0 * s, CY - 0.18, 0.12);
      const armGeo = taperTube([V3(-0.08 * s, 0.05, 0), V3(0.06 * s, -0.12, 0.02), V3(0.12 * s, -0.32, 0.06), V3(0.13 * s, -0.42, 0.08)], 0.19, 0.13, 16, 14);
      {
        const pos = armGeo.attributes.position;
        const col = new Float32Array(pos.count * 3);
        const A = hexParts(0x6cc48a);
        for (let i = 0; i < pos.count; i++) for (let j = 0; j < 3; j++) col[i * 3 + j] = A[j];
        armGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      }
      const arm = mesh(armGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }));
      pivot.add(arm);
      pivot.add(mesh(taperTube([V3(0.08 * s, -0.2, 0.04), V3(0.12 * s, -0.32, 0.06), V3(0.13 * s, -0.4, 0.08)], 0.165, 0.15, 10, 18), barkMat));
      const cuff = mesh(mossBlob(0.15, 4 + s, 0.55), mossMat, false);
      cuff.position.set(0.1 * s, -0.2, 0.04);
      pivot.add(cuff);
      const hand = mesh(new THREE.SphereGeometry(0.16, 20, 14), barkMat);
      hand.scale.set(1, 0.85, 1);
      hand.position.set(0.13 * s, -0.45, 0.08);
      pivot.add(hand);
      [-0.6, 0, 0.6].forEach(d => {
        const dx = Math.sin(d) * 0.5 + s * 0.2;
        const dz = Math.cos(d) * 0.5;
        hand.add(mesh(taperTube([V3(dx * 0.12, -0.06, dz * 0.12), V3(dx * 0.22, -0.12, dz * 0.22), V3(dx * 0.27, -0.2, dz * 0.24)], 0.055, 0.03, 10, 8), barkMat, false));
      });
      const sprig = new THREE.Group();
      sprig.position.set(0.02 * s, -0.08, -0.08);
      sprig.rotation.set(-0.6, 0, -s * 0.9);
      sprig.add(mesh(oakLeaf(0.26, 0.09, 0.3), leafMat, false));
      pivot.add(sprig);
      squash.add(pivot);
      return { pivot, side: s };
    });

    const backLeaves = [[-0.35, 0.45], [0.3, 0.2], [0.05, -0.15]].map(([x, y], k) => {
      const pv = new THREE.Group();
      const dir = V3(x, y, -0.85).normalize();
      pv.position.set(dir.x * R, CY + dir.y * R, dir.z * R);
      pv.lookAt(dir.x * 4, CY + dir.y * 4, dir.z * 4);
      const l = mesh(oakLeaf(0.3, 0.1, 0.4), leafMat, false);
      l.rotation.set(Math.PI / 2 - 0.5, 0, k * 1.3 - 1.2);
      pv.add(l);
      squash.add(pv);
      return pv;
    });

    const sprouts = [];
    for (let k = 0; k < 9; k++) {
      const a = k / 9 * Math.PI * 2 + 0.3;
      const r = 1.55 + (k % 3) * 0.22;
      const g = new THREE.Group();
      g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      g.rotation.y = -a + (k % 2) * 0.6;
      g.add(mesh(taperTube([V3(0, -0.02, 0), V3(0.01, 0.14, 0), V3(0.03, 0.26, 0.01)], 0.03, 0.015, 8, 6), new THREE.MeshStandardMaterial({ color: 0x5fae4a, roughness: 0.6 }), false));
      [-1, 1].forEach(s => {
        const l = mesh(oakLeaf(0.2, 0.07, 0.4), leafMat, false);
        l.position.set(0.03, 0.25, 0.01);
        l.rotation.set(0, 0, -s * 0.9);
        g.add(l);
      });
      g.scale.setScalar(0.001);
      g.visible = false;
      root.add(g);
      sprouts.push({ g, d: (k % 4) * 0.06 + (k % 3) * 0.03 });
    }

    const dirt = [];
    for (let k = 0; k < 10; k++) {
      const d = mesh(new THREE.SphereGeometry(0.05 + (k % 3) * 0.02, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 1 }), false);
      d.visible = false;
      root.add(d);
      dirt.push({ d, a: k * 2.4, s: k % 2 ? 1 : -1, v: 0.8 + (k % 4) * 0.25 });
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const rt = action && action.name === "root" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 1.8) * 0.02 * motion;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let dig = 0;
        let grow = 0;
        let leafKick = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.2 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.76) {
            const q = (p - 0.2) / 0.56;
            y = Math.sin(q * Math.PI) * 1.0;
            sy = 1 + 0.1 * Math.cos(q * Math.PI);
            airborne = true;
          } else {
            const q = (p - 0.76) / 0.24;
            sy = 1 - 0.18 * Math.sin(q * Math.PI);
          }
          leafKick = Math.sin(p * Math.PI) * 0.5;
        }

        if (rt) {
          const p = rt.p;
          dig = smooth(0.05, 0.25, p) * (1 - smooth(0.82, 0.98, p));
          grow = smooth(0.3, 0.6, p) * (1 - smooth(0.8, 0.97, p));
          sy -= dig * 0.12 - Math.sin(smooth(0.3, 0.55, p) * Math.PI) * 0.08;
          squint = p > 0.25 && p < 0.8;
          mouthOpen = p > 0.32 && p < 0.55;
          leafKick = Math.sin(smooth(0.3, 0.7, p) * Math.PI) * 0.6;
        }

        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.08 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.6, CY - 0.2, ph.fall * ph.fall), lerp(0.8, 1.12, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          food.rotation.z = (1 - ph.fall) * 1.2;
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          openMouth.scale.y = 0.6 + ph.chew * 0.6;
        } else {
          food.visible = false;
          openMouth.scale.y = 0.9;
        }

        const sx = 1 / Math.sqrt(sy);
        squash.scale.set(sx, sy, sx);
        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.2) * 0.035 * motion + (rt ? Math.sin(t * 9) * 0.03 * grow : 0);

        smile.visible = !(airborne || mouthOpen);
        openMouth.visible = airborne || mouthOpen;

        arms.forEach(({ pivot, side }) => {
          let target = 0.3 + Math.sin(t * 2.6 + side) * 0.1 * motion;
          if (airborne) target = 1.9;
          else if (eat) target = 1.0;
          else if (rt) target = lerp(0.3, 1.6, grow) - dig * 0.15;
          pivot.rotation.z = lerp(pivot.rotation.z, target * side, 0.18);
          pivot.rotation.x = lerp(pivot.rotation.x, rt ? -0.4 * grow : 0, 0.18);
        });

        feet.forEach(({ f, toes }) => {
          f.position.y = airborne ? 0.08 : 0.14 - dig * 0.1;
          toes.forEach(toe => {
            toe.scale.setScalar(1 + dig * 0.35);
          });
        });

        const sway = Math.sin(t * 2.2) * 0.1 * motion;
        stalk.rotation.z = sway * 0.6 + (jump ? Math.sin(t * 20) * 0.12 : 0);
        stalkLeaves.forEach(({ pv, rz }, i) => {
          pv.rotation.z = rz + (i ? 1 : -1) * (Math.sin(t * 2.8 + i) * 0.08 * motion + leafKick * 0.4);
          pv.scale.setScalar(1 + grow * 0.25);
        });
        earLeaves.forEach(({ pv, s: sd }) => {
          pv.rotation.z = -sd * (1.15 - leafKick * 0.55 + Math.sin(t * 2.4 + sd) * 0.06 * motion);
        });
        backLeaves.forEach((pv, i) => {
          pv.scale.setScalar(1 + grow * 0.4 + Math.sin(t * 3 + i) * 0.03 * motion);
        });

        sprouts.forEach(({ g, d }) => {
          const k = rt ? smooth(0.3 + d, 0.55 + d, rt.p) * (1 - smooth(0.82, 0.96, rt.p)) : 0;
          g.visible = k > 0.01 && !reduceMotion;
          g.scale.setScalar(Math.max(0.001, k * (1 + Math.sin(t * 6 + d * 40) * 0.05)));
          g.rotation.z = Math.sin(t * 2 + d * 30) * 0.12 * k;
        });

        dirt.forEach(({ d, a, s: sd, v }) => {
          const q = rt ? (rt.p - 0.06) / 0.25 : -1;
          d.visible = q > 0 && q < 1 && !reduceMotion;
          if (d.visible) {
            const r = 0.4 + q * 0.9 * v;
            d.position.set(0.48 * sd + Math.cos(a) * r, Math.sin(q * Math.PI) * 0.5 * v, 0.2 + Math.sin(a) * r);
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
