(() => {
  const cache = {};

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const sstep = (a, b, x) => {
    const k = clamp((x - a) / (b - a), 0, 1);
    return k * k * (3 - 2 * k);
  };
  const smin = (a, b, k) => {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  };
  const smax = (a, b, k) => -smin(-a, -b, k);
  const sdEll = (x, y, z, cx, cy, cz, rx, ry, rz) => {
    const px = (x - cx) / rx;
    const py = (y - cy) / ry;
    const pz = (z - cz) / rz;
    const k0 = Math.sqrt(px * px + py * py + pz * pz);
    const k1 = Math.sqrt((px * px) / (rx * rx) + (py * py) / (ry * ry) + (pz * pz) / (rz * rz));
    return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
  };
  const sdCone = (x, y, z, ax, ay, az, bx, by, bz, ra, rb) => {
    const dx = bx - ax;
    const dy = by - ay;
    const dz = bz - az;
    const px = x - ax;
    const py = y - ay;
    const pz = z - az;
    const h = clamp((px * dx + py * dy + pz * dz) / (dx * dx + dy * dy + dz * dz), 0, 1);
    const qx = px - dx * h;
    const qy = py - dy * h;
    const qz = pz - dz * h;
    return Math.sqrt(qx * qx + qy * qy + qz * qz) - (ra + (rb - ra) * h);
  };
  const sdSph = (x, y, z, cx, cy, cz, r) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r;

  const hash = (x, y, z) => {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h & 0xffff) / 0xffff;
  };
  const noise = (x, y, z) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const zi = Math.floor(z);
    let fx = x - xi;
    let fy = y - yi;
    let fz = z - zi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    fz = fz * fz * (3 - 2 * fz);
    const a = hash(xi, yi, zi);
    const b = hash(xi + 1, yi, zi);
    const c = hash(xi, yi + 1, zi);
    const d = hash(xi + 1, yi + 1, zi);
    const e = hash(xi, yi, zi + 1);
    const f = hash(xi + 1, yi, zi + 1);
    const g = hash(xi, yi + 1, zi + 1);
    const k = hash(xi + 1, yi + 1, zi + 1);
    const x1 = a + (b - a) * fx;
    const x2 = c + (d - c) * fx;
    const x3 = e + (f - e) * fx;
    const x4 = g + (k - g) * fx;
    const y1 = x1 + (x2 - x1) * fy;
    const y2 = x3 + (x4 - x3) * fy;
    return y1 + (y2 - y1) * fz;
  };

  function sculpt(THREE, F, box, h, paint) {
    const [x0, y0, z0, x1, y1, z1] = box;
    const nx = Math.ceil((x1 - x0) / h) + 1;
    const ny = Math.ceil((y1 - y0) / h) + 1;
    const nz = Math.ceil((z1 - z0) / h) + 1;
    const C = 4;
    const cx = Math.ceil((nx - 1) / C) + 2;
    const cy = Math.ceil((ny - 1) / C) + 2;
    const cz = Math.ceil((nz - 1) / C) + 2;
    const cv = new Float32Array(cx * cy * cz);
    for (let k = 0; k < cz; k++)
      for (let j = 0; j < cy; j++)
        for (let i = 0; i < cx; i++) cv[i + cx * (j + cy * k)] = F(x0 + i * C * h, y0 + j * C * h, z0 + k * C * h);
    const band = C * h * 1.85;
    const v = new Float32Array(nx * ny * nz);
    for (let k = 0; k < nz; k++) {
      const kc = Math.floor(k / C);
      const fz = k / C - kc;
      for (let j = 0; j < ny; j++) {
        const jc = Math.floor(j / C);
        const fy = j / C - jc;
        for (let i = 0; i < nx; i++) {
          const ic = Math.floor(i / C);
          const fx = i / C - ic;
          const o = ic + cx * (jc + cy * kc);
          const c00 = cv[o] + (cv[o + 1] - cv[o]) * fx;
          const c10 = cv[o + cx] + (cv[o + cx + 1] - cv[o + cx]) * fx;
          const o2 = o + cx * cy;
          const c01 = cv[o2] + (cv[o2 + 1] - cv[o2]) * fx;
          const c11 = cv[o2 + cx] + (cv[o2 + cx + 1] - cv[o2 + cx]) * fx;
          const a = (c00 + (c10 - c00) * fy) * (1 - fz) + (c01 + (c11 - c01) * fy) * fz;
          v[i + nx * (j + ny * k)] = Math.abs(a) > band ? a : F(x0 + i * h, y0 + j * h, z0 + k * h);
        }
      }
    }
    const idx = (i, j, k) => i + nx * (j + ny * k);
    const cell = new Int32Array(nx * ny * nz).fill(-1);
    const pos = [];
    const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    const O = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
    const cvals = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          let neg = 0;
          for (let c = 0; c < 8; c++) {
            const val = v[idx(i + O[c][0], j + O[c][1], k + O[c][2])];
            cvals[c] = val;
            if (val < 0) neg++;
          }
          if (neg === 0 || neg === 8) continue;
          let sx = 0;
          let sy = 0;
          let sz = 0;
          let n = 0;
          for (const [a, b] of E) {
            const va = cvals[a];
            const vb = cvals[b];
            if (va < 0 === vb < 0) continue;
            const t = va / (va - vb);
            sx += O[a][0] + (O[b][0] - O[a][0]) * t;
            sy += O[a][1] + (O[b][1] - O[a][1]) * t;
            sz += O[a][2] + (O[b][2] - O[a][2]) * t;
            n++;
          }
          cell[idx(i, j, k)] = pos.length / 3;
          pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
        }
    const tris = [];
    const quad = (a, b, c, d) => {
      if (a < 0 || b < 0 || c < 0 || d < 0) return;
      tris.push(a, b, c, a, c, d);
    };
    for (let k = 0; k < nz - 1; k++)
      for (let j = 0; j < ny - 1; j++)
        for (let i = 0; i < nx - 1; i++) {
          const s0 = v[idx(i, j, k)] < 0;
          if (j > 0 && k > 0 && s0 !== v[idx(i + 1, j, k)] < 0) quad(cell[idx(i, j - 1, k - 1)], cell[idx(i, j, k - 1)], cell[idx(i, j, k)], cell[idx(i, j - 1, k)]);
          if (i > 0 && k > 0 && s0 !== v[idx(i, j + 1, k)] < 0) quad(cell[idx(i - 1, j, k - 1)], cell[idx(i, j, k - 1)], cell[idx(i, j, k)], cell[idx(i - 1, j, k)]);
          if (i > 0 && j > 0 && s0 !== v[idx(i, j, k + 1)] < 0) quad(cell[idx(i - 1, j - 1, k)], cell[idx(i, j - 1, k)], cell[idx(i, j, k)], cell[idx(i - 1, j, k)]);
        }
    const vc = pos.length / 3;
    const nor = new Float32Array(vc * 3);
    const e = h * 0.5;
    for (let q = 0; q < vc; q++) {
      let x = pos[q * 3];
      let y = pos[q * 3 + 1];
      let z = pos[q * 3 + 2];
      const fa = F(x + e, y - e, z - e);
      const fb = F(x - e, y - e, z + e);
      const fc = F(x - e, y + e, z - e);
      const fd = F(x + e, y + e, z + e);
      let gx = fa - fb - fc + fd;
      let gy = -fa - fb + fc + fd;
      let gz = -fa + fb - fc + fd;
      const l = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
      gx /= l;
      gy /= l;
      gz /= l;
      const d = (fa + fb + fc + fd) * 0.25;
      if (Math.abs(d) < h) {
        x -= gx * d;
        y -= gy * d;
        z -= gz * d;
        pos[q * 3] = x;
        pos[q * 3 + 1] = y;
        pos[q * 3 + 2] = z;
      }
      nor[q * 3] = gx;
      nor[q * 3 + 1] = gy;
      nor[q * 3 + 2] = gz;
    }
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t] * 3;
      const b = tris[t + 1] * 3;
      const c = tris[t + 2] * 3;
      const ux = pos[b] - pos[a];
      const uy = pos[b + 1] - pos[a + 1];
      const uz = pos[b + 2] - pos[a + 2];
      const wx = pos[c] - pos[a];
      const wy = pos[c + 1] - pos[a + 1];
      const wz = pos[c + 2] - pos[a + 2];
      const fx = uy * wz - uz * wy;
      const fy = uz * wx - ux * wz;
      const fz = ux * wy - uy * wx;
      if (fx * (nor[a] + nor[b] + nor[c]) + fy * (nor[a + 1] + nor[b + 1] + nor[c + 1]) + fz * (nor[a + 2] + nor[b + 2] + nor[c + 2]) < 0) {
        const s = tris[t + 1];
        tris[t + 1] = tris[t + 2];
        tris[t + 2] = s;
      }
    }
    const col = new Float32Array(vc * 3);
    const star = new Float32Array(vc);
    const emit = new Float32Array(vc * 3);
    const out = [0, 0, 0, 0, 0, 0, 0];
    for (let q = 0; q < vc; q++) {
      paint(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2], out, nor[q * 3], nor[q * 3 + 1], nor[q * 3 + 2]);
      col[q * 3] = out[0];
      col[q * 3 + 1] = out[1];
      col[q * 3 + 2] = out[2];
      star[q] = out[3];
      emit[q * 3] = out[4];
      emit[q * 3 + 1] = out[5];
      emit[q * 3 + 2] = out[6];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setAttribute("star", new THREE.BufferAttribute(star, 1));
    geo.setAttribute("emit", new THREE.BufferAttribute(emit, 3));
    geo.setIndex(tris);
    geo.computeBoundingSphere();
    return geo;
  }

  const BASE = [0.075, 0.064, 0.105];
  const SMOKE = [0.2, 0.18, 0.26];
  const mix3 = (out, a, b, k) => {
    out[0] = a[0] + (b[0] - a[0]) * k;
    out[1] = a[1] + (b[1] - a[1]) * k;
    out[2] = a[2] + (b[2] - a[2]) * k;
  };

  function bodyShape(x, y, z) {
    const ax = Math.abs(x);
    let d = sdEll(x, y, z, 0, 0.52, -0.26, 0.4, 0.44, 0.42);
    d = smin(d, sdEll(ax, y, z, 0.27, 0.4, -0.26, 0.26, 0.34, 0.4), 0.1);
    d = smin(d, sdCone(x, y, z, 0, 0.62, -0.36, 0, 1.3, -0.06, 0.3, 0.23), 0.15);
    d = smin(d, sdEll(x, y, z, 0, 1.08, 0.02, 0.32, 0.46, 0.31), 0.12);
    d = smin(d, sdCone(x, y, z, 0, 1.3, 0.06, 0, 1.68, 0.2, 0.29, 0.24), 0.14);
    d = smin(d, sdEll(ax, y, z, 0.17, 1.16, 0.08, 0.13, 0.18, 0.15), 0.08);
    d = smin(d, sdCone(ax, y, z, 0.18, 1.14, 0.16, 0.185, 0.78, 0.22, 0.1, 0.08), 0.06);
    d = smin(d, sdCone(ax, y, z, 0.185, 0.78, 0.22, 0.18, 0.16, 0.33, 0.078, 0.062), 0.025);
    d = smin(d, sdEll(ax, y, z, 0.18, 0.066, 0.41, 0.088, 0.066, 0.115), 0.04);
    if (y < 0.14 && z > 0.36) for (let t = 0; t < 4; t++) d = smin(d, sdSph(ax, y, z, 0.18 + (t - 1.5) * 0.047, 0.04, 0.5 - Math.abs(t - 1.5) * 0.022, 0.035), 0.016);
    d = smin(d, sdEll(ax, y, z, 0.39, 0.064, 0.04, 0.092, 0.064, 0.23), 0.07);
    if (y < 0.14 && z > 0.1) for (let t = 0; t < 4; t++) d = smin(d, sdSph(ax, y, z, 0.39 + (t - 1.5) * 0.046, 0.038, 0.24 - Math.abs(t - 1.5) * 0.02, 0.034), 0.016);
    d = smin(d, sdEll(x, y, z, 0, 1.24, 0.2, 0.25, 0.38, 0.15), 0.1);
    return d;
  }
  const bibMask = (x, y, z) => clamp(1 - sdEll(x, y, z, 0, 1.24, 0.26, 0.26, 0.46, 0.22) * 5, 0, 1);
  function bodyF(x, y, z) {
    const d = bodyShape(x, y, z);
    if (d > 0.08) return d;
    const bib = bibMask(x, y, z);
    const ax = Math.abs(x);
    let f = (noise(ax * 15, y * 5, z * 15) - 0.5) * 0.014 + (noise(ax * 26, y * 6.5, z * 26) - 0.5) * 0.012;
    if (bib > 0) {
      const tuft = noise(ax * 34, y * 9 + ax * 8, z * 34);
      f += bib * tuft * tuft * 0.02;
    }
    const pawK = sstep(0.2, 0.08, y);
    return d - f * (1 - pawK * 0.8);
  }
  function bodyPaint(x, y, z, o) {
    const bib = bibMask(x, y, z);
    mix3(o, BASE, SMOKE, bib * 0.85);
    const paw = sstep(0.16, 0.04, y);
    o[0] *= 1 - paw * 0.25;
    o[1] *= 1 - paw * 0.25;
    o[2] *= 1 - paw * 0.25;
    const front = sstep(-0.05, 0.25, z) * sstep(0.45, 0.1, Math.abs(x));
    o[3] = sstep(0.12, 0.3, y) * (1 - bib) * (1 - front * 0.85);
    o[4] = o[5] = o[6] = 0;
  }

  const EYE = [0.155, 0.04, 0.255];
  function headShape(x, y, z) {
    const ax = Math.abs(x);
    let d = sdEll(x, y, z, 0, 0.06, -0.04, 0.36, 0.31, 0.33);
    d = smin(d, sdEll(ax, y, z, 0.16, -0.06, 0.06, 0.2, 0.17, 0.21), 0.1);
    d = smin(d, sdEll(x, y, z, 0, -0.12, 0.06, 0.2, 0.13, 0.2), 0.1);
    d = smin(d, sdCone(x, y, z, 0, 0.06, 0.22, 0, -0.05, 0.31, 0.095, 0.07), 0.08);
    d = smin(d, sdEll(ax, y, z, 0.06, -0.115, 0.29, 0.08, 0.064, 0.075), 0.04);
    d = smin(d, sdEll(x, y, z, 0, -0.19, 0.24, 0.065, 0.045, 0.06), 0.05);
    d = smin(d, sdEll(ax, y, z, 0.15, 0.115, 0.23, 0.11, 0.06, 0.08), 0.06);
    d = smax(d, -sdSph(ax, y, z, EYE[0], EYE[1], EYE[2], 0.092), 0.03);
    return d;
  }
  function headF(x, y, z) {
    const d = headShape(x, y, z);
    if (d > 0.08) return d;
    const ax = Math.abs(x);
    const face = sstep(0.12, 0.26, z) * sstep(0.32, 0.12, ax);
    let f = (noise(ax * 22, y * 9, z * 22) - 0.5) * 0.014 * (1 - face * 0.7);
    const ruff = sstep(0.14, 0.28, ax) * sstep(0.02, -0.1, y) * sstep(0.3, 0.0, z);
    if (ruff > 0) {
      const tuft = noise(ax * 18, y * 8 + ax * 9, z * 18);
      f += ruff * tuft * tuft * 0.035;
    }
    return d - f * sstep(0.06, 0.0, d);
  }
  function headPaint(x, y, z, o) {
    const ax = Math.abs(x);
    const pad = clamp(1 - sdEll(ax, y, z, 0.062, -0.13, 0.32, 0.11, 0.08, 0.1) * 9, 0, 1);
    const chin = clamp(1 - sdEll(x, y, z, 0, -0.21, 0.26, 0.09, 0.06, 0.08) * 9, 0, 1);
    mix3(o, BASE, SMOKE, Math.max(pad * 0.75, chin));
    const sock = clamp(1 - Math.abs(sdSph(ax, y, z, EYE[0], EYE[1], EYE[2], 0.092)) * 30, 0, 1) * sstep(0.2, 0.28, z);
    o[0] *= 1 - sock * 0.6;
    o[1] *= 1 - sock * 0.6;
    o[2] *= 1 - sock * 0.6;
    o[3] = sstep(0.0, -0.2, z) * sstep(-0.05, 0.15, y) * 0.8;
    o[4] = o[5] = o[6] = 0;
  }

  function earShape(x, y, z) {
    const zs = 0.42;
    const outer = sdCone(x, y, z / zs, 0, -0.04, 0, 0, 0.36, 0, 0.155, 0.016) * zs;
    const cav = sdCone(x, y, (z - 0.055) / 0.5, 0, 0.02, 0, 0, 0.335, 0, 0.118, 0.006) * 0.5;
    return smax(outer, -cav, 0.012);
  }
  const earCav = (x, y, z) => sdCone(x, y, (z - 0.055) / 0.5, 0, 0.02, 0, 0, 0.335, 0, 0.118, 0.006) * 0.5;
  function earF(x, y, z) {
    const d = earShape(x, y, z);
    if (d > 0.04) return d;
    return d - (noise(x * 40, y * 16, z * 40) - 0.5) * 0.006;
  }
  function earPaint(x, y, z, o) {
    const inner = sstep(0.025, 0.0, earCav(x, y, z)) * sstep(-0.02, 0.03, z);
    mix3(o, BASE, [0.3, 0.17, 0.44], inner);
    o[3] = 0;
    o[4] = 0.2 * inner;
    o[5] = 0.08 * inner;
    o[6] = 0.36 * inner;
  }

  const HO = [0, 1.85, 0.33];
  const HS = 1.12;
  const bodyBound = (x, y, z) => (y > 2.0 ? y - 1.94 : null);
  const headBound = (hx, hy, hz) => {
    const r = Math.sqrt(hx * hx + hy * hy + hz * hz);
    return r > 0.72 ? r - 0.58 : null;
  };
  function catF(x, y, z) {
    const hx = (x - HO[0]) / HS;
    const hy = (y - HO[1]) / HS;
    const hz = (z - HO[2]) / HS;
    const hb = headBound(hx, hy, hz);
    const hd = (hb === null ? headF(hx, hy, hz) : hb) * HS;
    const bb = bodyBound(x, y, z);
    const bd = bb === null ? bodyF(x, y, z) : bb;
    return smin(bd, hd, 0.09);
  }
  const tmpA = [0, 0, 0, 0, 0, 0, 0];
  const tmpB = [0, 0, 0, 0, 0, 0, 0];
  function catPaint(x, y, z, o) {
    const hx = (x - HO[0]) / HS;
    const hy = (y - HO[1]) / HS;
    const hz = (z - HO[2]) / HS;
    const hb = headBound(hx, hy, hz);
    const hd = (hb === null ? headShape(hx, hy, hz) : hb) * HS;
    const bb = bodyBound(x, y, z);
    const bd = bb === null ? bodyShape(x, y, z) : bb;
    const k = sstep(-0.04, 0.04, bd - hd);
    bodyPaint(x, y, z, tmpA);
    headPaint(hx, hy, hz, tmpB);
    for (let i = 0; i < 7; i++) o[i] = tmpA[i] + (tmpB[i] - tmpA[i]) * k;
  }

  function geometry(THREE) {
    if (cache.geo) return cache.geo;
    const body = sculpt(THREE, catF, [-0.66, -0.04, -0.78, 0.66, 2.38, 0.84], 0.02, catPaint);
    const p = body.attributes.position;
    const si = new Uint16Array(p.count * 4);
    const sw = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const hx = (x - HO[0]) / HS;
      const hy = (y - HO[1]) / HS;
      const hz = (z - HO[2]) / HS;
      const hb = headBound(hx, hy, hz);
      const hd = (hb === null ? headShape(hx, hy, hz) : hb) * HS;
      const bb = bodyBound(x, y, z);
      const bd = bb === null ? bodyShape(x, y, z) : bb;
      const w = Math.max(sstep(-0.05, 0.07, bd - hd), sstep(1.5, 1.72, y));
      si[i * 4] = 0;
      si[i * 4 + 1] = 2;
      sw[i * 4] = 1 - w;
      sw[i * 4 + 1] = w;
    }
    body.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    body.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    cache.geo = {
      body,
      ear: sculpt(THREE, earF, [-0.19, -0.08, -0.09, 0.19, 0.4, 0.13], 0.011, earPaint)
    };
    return cache.geo;
  }

  function surfZ(x, y) {
    let z = 0.6;
    for (let i = 0; i < 80; i++) {
      const d = smin(bodyShape(HO[0] + x * HS, HO[1] + y * HS, HO[2] + z * HS) / HS, headShape(x, y, z), 0.09 / HS);
      if (d < 0.0005) break;
      z -= Math.max(d * 0.8, 0.0008);
    }
    return z;
  }

  Pets.register({
    id: "eclipsar",
    dex: 25,
    name: "Eclipsar",
    color: "#2a2340",
    types: ["dark", "light"],
    description: "Quando um Breuzinho cresce, a sombra ganha forma de felino e prende um pedaço do sol nas costas. O anel de luz que carrega nunca se apaga por completo: dizem que é o último eclipse que ele viu.",
    actions: {
      jump: { duration: 1.1 },
      eat: { duration: 2.4 },
      eclipse: { duration: 3.2 },
      attack: { duration: 1.1 }
    },
    battle: { special: { action: "eclipse", hit: 0.3, speed: 1.5 } },
    idle: [
      { action: "eclipse", min: 30, max: 60 },
      { action: "jump", min: 35, max: 70 }
    ],
    clickAction: n => ["eclipse", "jump", "jump"][(n - 1) % 3],

    create({ THREE, kit }) {
      const { mesh, lerp, smooth, eatPhase, berry, strike } = kit;
      const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
      const G = geometry(THREE);

      const canvas = (key, w, h, draw) => {
        if (typeof document === "undefined") return null;
        if (!cache[key]) {
          const c = document.createElement("canvas");
          c.width = w;
          c.height = h;
          let sd = 11;
          const rnd = () => {
            sd = (sd * 16807) % 2147483647;
            return sd / 2147483647;
          };
          draw(c.getContext("2d"), rnd, w, h);
          cache[key] = c;
        }
        return cache[key];
      };
      const tex = (c, wrap = true) => {
        if (!c) return null;
        const t = new THREE.CanvasTexture(c);
        if (wrap) {
          t.wrapS = THREE.RepeatWrapping;
          t.wrapT = THREE.RepeatWrapping;
        }
        return t;
      };

      const furTex = tex(
        canvas("fur", 512, 512, (g, rnd, w, h) => {
          g.fillStyle = "#777";
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 6500; i++) {
            const x = rnd() * w;
            const y = rnd() * h;
            const len = 8 + rnd() * 18;
            const bend = (rnd() - 0.5) * 10;
            const v = rnd();
            g.strokeStyle = v < 0.5 ? "#fff" : "#000";
            g.globalAlpha = 0.18 + rnd() * 0.4;
            g.lineWidth = 0.7 + rnd() * 1.6;
            for (const ox of [-w, 0, w])
              for (const oy of [-h, 0, h]) {
                if (x + ox < -60 || x + ox > w + 60 || y + oy < -60 || y + oy > h + 60) continue;
                g.beginPath();
                g.moveTo(x + ox, y + oy);
                g.quadraticCurveTo(x + ox + bend, y + oy + len * 0.5, x + ox + bend * 0.4, y + oy + len);
                g.stroke();
              }
          }
          g.globalAlpha = 1;
        })
      );
      const starTex = tex(
        canvas("stars", 512, 512, (g, rnd, w, h) => {
          g.fillStyle = "#000";
          g.fillRect(0, 0, w, h);
          for (let i = 0; i < 70; i++) {
            const x = rnd() * w;
            const y = rnd() * h;
            const r = 0.8 + rnd() * rnd() * 3;
            const gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
            gr.addColorStop(0, "rgba(255,240,190,1)");
            gr.addColorStop(0.3, "rgba(255,205,110,0.7)");
            gr.addColorStop(1, "rgba(255,190,90,0)");
            g.fillStyle = gr;
            g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
          }
        })
      );
      const glowTex = tex(
        canvas("glow", 128, 128, (g, rnd, w) => {
          const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
          gr.addColorStop(0, "rgba(255,255,255,1)");
          gr.addColorStop(0.3, "rgba(255,255,255,0.5)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr;
          g.fillRect(0, 0, w, w);
        }),
        false
      );
      const ringTex = tex(
        canvas("ring", 256, 256, (g, rnd, w) => {
          const c = w / 2;
          const gr = g.createRadialGradient(c, c, 0, c, c, c);
          gr.addColorStop(0, "rgba(255,255,255,0)");
          gr.addColorStop(0.36, "rgba(255,255,255,0)");
          gr.addColorStop(0.46, "rgba(255,255,255,0.9)");
          gr.addColorStop(0.62, "rgba(255,255,255,0.35)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr;
          g.fillRect(0, 0, w, w);
        }),
        false
      );
      const rayTex = tex(
        canvas("ray", 64, 256, (g, rnd, w, h) => {
          const gr = g.createLinearGradient(0, h, 0, 0);
          gr.addColorStop(0, "rgba(255,255,255,0.95)");
          gr.addColorStop(0.5, "rgba(255,255,255,0.35)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          g.fillStyle = gr;
          g.beginPath();
          g.moveTo(w * 0.5, 0);
          g.quadraticCurveTo(w, h * 0.7, w * 0.62, h);
          g.lineTo(w * 0.38, h);
          g.quadraticCurveTo(0, h * 0.7, w * 0.5, 0);
          g.fill();
        }),
        false
      );
      const irisTex = tex(
        canvas("iris", 256, 256, (g, rnd, w, h) => {
          const edge = h * 0.36;
          const gr = g.createLinearGradient(0, 0, 0, edge);
          gr.addColorStop(0, "#fff3a8");
          gr.addColorStop(0.35, "#ffd24a");
          gr.addColorStop(0.75, "#f09a1c");
          gr.addColorStop(0.92, "#7a3f08");
          gr.addColorStop(1, "#4a2606");
          g.fillStyle = gr;
          g.fillRect(0, 0, w, edge);
          const out = g.createLinearGradient(0, edge, 0, h * 0.6);
          out.addColorStop(0, "#4a2606");
          out.addColorStop(1, "#2a1606");
          g.fillStyle = out;
          g.fillRect(0, edge, w, h - edge);
          for (let i = 0; i < 420; i++) {
            const x = rnd() * w;
            const y0 = rnd() * edge * 0.3;
            const y1 = edge * (0.55 + rnd() * 0.4);
            g.strokeStyle = rnd() < 0.5 ? "rgba(255,250,210,0.5)" : "rgba(150,70,10,0.45)";
            g.lineWidth = 0.6 + rnd() * 1.2;
            g.beginPath();
            g.moveTo(x, y0);
            g.lineTo(x + (rnd() - 0.5) * 4, y1);
            g.stroke();
          }
          const ring = g.createLinearGradient(0, 0, 0, edge * 0.35);
          ring.addColorStop(0, "rgba(255,255,230,0.9)");
          ring.addColorStop(1, "rgba(255,255,230,0)");
          g.fillStyle = ring;
          g.fillRect(0, 0, w, edge * 0.35);
        }),
        false
      );

      const furUniforms = {
        uFur: { value: furTex },
        uStars: { value: starTex },
        uStar: { value: 0.8 },
        uSheen: { value: new THREE.Color(0x6f5fb0) },
        uSheenK: { value: 0.45 },
        uStarCol: { value: new THREE.Color(0xffc860) }
      };
      const furMaterial = (o = {}) => {
        const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0.0, vertexColors: true, side: o.side || THREE.FrontSide, skinning: !!o.skin });
        m.extensions = { derivatives: true };
        const scale = o.scale || 2.8;
        const bump = o.bump || 0.011;
        m.customProgramCacheKey = () => "eclipsar-fur-" + scale + "-" + bump + (o.skin ? "-s" : "");
        m.onBeforeCompile = sh => {
          Object.assign(sh.uniforms, furUniforms);
          sh.vertexShader = sh.vertexShader
            .replace("#include <common>", "#include <common>\nattribute float star;\nattribute vec3 emit;\nvarying float vStar;\nvarying vec3 vEmit;\nvarying vec3 vOP;\nvarying vec3 vON;")
            .replace("#include <begin_vertex>", "#include <begin_vertex>\nvStar = star;\nvEmit = emit;\nvOP = position;\nvON = normal;");
          sh.fragmentShader = sh.fragmentShader
            .replace(
              "#include <common>",
              [
                "#include <common>",
                "uniform sampler2D uFur;",
                "uniform sampler2D uStars;",
                "uniform float uStar;",
                "uniform vec3 uSheen;",
                "uniform float uSheenK;",
                "uniform vec3 uStarCol;",
                "varying float vStar;",
                "varying vec3 vEmit;",
                "varying vec3 vOP;",
                "varying vec3 vON;",
                "vec3 triW() { vec3 w = pow(abs(normalize(vON)), vec3(4.0)); return w / (w.x + w.y + w.z); }",
                "float triT(sampler2D t, float s) { vec3 w = triW(); vec3 p = vOP * s; return texture2D(t, p.zy).r * w.x + texture2D(t, p.xz).r * w.y + texture2D(t, p.xy).r * w.z; }",
                "vec3 furBump(vec3 sp, vec3 sn, vec2 dh, float fd) {",
                "  vec3 sx = dFdx(sp); vec3 sy = dFdy(sp);",
                "  vec3 r1 = cross(sy, sn); vec3 r2 = cross(sn, sx);",
                "  float det = dot(sx, r1) * fd;",
                "  vec3 g = sign(det) * (dh.x * r1 + dh.y * r2);",
                "  return normalize(abs(det) * sn - g);",
                "}"
              ].join("\n")
            )
            .replace("#include <color_fragment>", "#include <color_fragment>\nfloat fh = triT(uFur, " + scale.toFixed(3) + ");\ndiffuseColor.rgb *= 0.8 + fh * 0.4;")
            .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\nnormal = furBump(-vViewPosition, normal, vec2(dFdx(fh), dFdy(fh)) * " + bump.toFixed(4) + ", faceDirection);")
            .replace(
              "#include <emissivemap_fragment>",
              "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vEmit;\ntotalEmissiveRadiance += uStarCol * triT(uStars, 1.35) * vStar * uStar;\nfloat fres = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);\ntotalEmissiveRadiance += uSheen * pow(fres, 2.6) * uSheenK;"
            );
        };
        return m;
      };
      const paint = (geo, c, s = 0, e = [0, 0, 0]) => {
        const n = geo.attributes.position.count;
        const col = new Float32Array(n * 3);
        const st = new Float32Array(n);
        const em = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          col.set(c, i * 3);
          st[i] = s;
          em.set(e, i * 3);
        }
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        geo.setAttribute("star", new THREE.BufferAttribute(st, 1));
        geo.setAttribute("emit", new THREE.BufferAttribute(em, 3));
        return geo;
      };

      const furMat = furMaterial({ skin: true });
      const tailMat = furMaterial();
      const headMat = furMaterial();
      const lidMat = furMaterial({ scale: 4, bump: 0.008, side: THREE.DoubleSide });
      const noseMat = new THREE.MeshStandardMaterial({ color: 0x3a2f48, roughness: 0.32, metalness: 0.05 });
      const mouthMat = new THREE.MeshStandardMaterial({ color: 0x07050b, roughness: 0.7 });
      const tongueMat = new THREE.MeshStandardMaterial({ color: 0xb05a7a, roughness: 0.45 });
      const fangMat = new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.3 });
      const irisMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: irisTex, emissive: 0xffffff, emissiveMap: irisTex, emissiveIntensity: 0.55, roughness: 0.4 });
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050307 });
      const corneaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.2, depthWrite: false });
      const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd76a, roughness: 0.3, metalness: 0.4, emissive: 0xffb030, emissiveIntensity: 1.2 });
      const markMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, side: THREE.DoubleSide });
      const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xcfc6b8, roughness: 0.4, emissive: 0x15120c });
      const follicleMat = new THREE.MeshBasicMaterial({ color: 0x030205 });
      const tuftMat = new THREE.MeshStandardMaterial({ color: 0x8f7fb8, roughness: 0.8, emissive: 0x2a1f48, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 });
      const voidMat = new THREE.MeshBasicMaterial({ color: 0x050308, side: THREE.DoubleSide });
      const coronaGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffc040, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
      const sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
      const eyeGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffc040, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending });
      const rayMat = new THREE.MeshBasicMaterial({ map: rayTex, color: 0xffcf6a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });

      const loft = (nodes, rad = 22, per = 10, ref = V3(0, 0, 1)) => {
        const n = nodes.length;
        const segs = (n - 1) * per;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array((segs + 1) * (rad + 1) * 3);
        const idx = [];
        for (let i = 0; i < segs; i++)
          for (let j = 0; j < rad; j++) {
            const a = i * (rad + 1) + j;
            const b = a + rad + 1;
            idx.push(a, b, a + 1, b, b + 1, a + 1);
          }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setIndex(idx);
        const tng = V3(0, 0, 0);
        const side = V3(0, 0, 0);
        const up = V3(0, 0, 0);
        const update = list => {
          const curve = new THREE.CatmullRomCurve3(list.map(q => q.p), false, "centripetal");
          for (let i = 0; i <= segs; i++) {
            const f = i / segs;
            const c = curve.getPoint(f);
            curve.getTangent(f, tng);
            const k = f * (n - 1);
            const i0 = Math.min(n - 2, Math.floor(k));
            const u = k - i0;
            const s = u * u * (3 - 2 * u);
            const r = lerp(list[i0].r, list[i0 + 1].r, s);
            side.crossVectors(tng, ref);
            if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
            side.normalize();
            up.crossVectors(side, tng).normalize();
            for (let j = 0; j <= rad; j++) {
              const a = (j / rad) * Math.PI * 2;
              const o = (i * (rad + 1) + j) * 3;
              pos[o] = c.x + (side.x * Math.cos(a) + up.x * Math.sin(a)) * r;
              pos[o + 1] = c.y + (side.y * Math.cos(a) + up.y * Math.sin(a)) * r;
              pos[o + 2] = c.z + (side.z * Math.cos(a) + up.z * Math.sin(a)) * r;
            }
          }
          geo.attributes.position.needsUpdate = true;
          geo.computeVertexNormals();
          geo.computeBoundingSphere();
        };
        update(nodes);
        return { geo, update };
      };
      const N = (x, y, z, r) => ({ p: V3(x, y, z), r });

      const tube = (pts, r, mat, seg = 12) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 5, false), mat);

      const root = new THREE.Group();
      const body = new THREE.Group();
      root.add(body);

      const tailBase = [N(0, 0.3, -0.6, 0.125), N(0.26, 0.15, -0.8, 0.118), N(0.66, 0.12, -0.5, 0.11), N(0.78, 0.12, 0.0, 0.104), N(0.62, 0.13, 0.44, 0.095), N(0.38, 0.19, 0.7, 0.084), N(0.2, 0.32, 0.8, 0.062)];
      const tailNodes = tailBase.map(q => ({ p: q.p.clone(), r: q.r }));
      const tail = loft(tailNodes, 20, 12, V3(0, 1, 0));
      paint(tail.geo, BASE, 0.9);
      body.add(mesh(tail.geo, tailMat));
      const tailTip = new THREE.Group();
      body.add(tailTip);
      tailTip.add(mesh(new THREE.SphereGeometry(0.07, 20, 14), goldMat, false));
      const tipGlow = new THREE.Sprite(coronaGlow.clone());
      tipGlow.material.opacity = 0.55;
      tipGlow.scale.set(0.5, 0.5, 1);
      tailTip.add(tipGlow);

      const halo = new THREE.Group();
      halo.position.set(0, 1.7, -0.62);
      body.add(halo);
      const haloSpin = new THREE.Group();
      halo.add(haloSpin);
      const coronaMat = new THREE.MeshBasicMaterial({ map: ringTex, color: 0xffc040, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
      const coronaBack = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.7), coronaMat);
      coronaBack.position.z = -0.02;
      halo.add(coronaBack);
      const rays = [];
      for (let i = 0; i < 14; i++) {
        const len = i % 2 ? 0.55 : 0.85;
        const g = new THREE.PlaneGeometry(0.16, len);
        g.translate(0, 0.62 + len / 2, 0);
        const r = new THREE.Mesh(g, rayMat);
        r.rotation.z = (i / 14) * Math.PI * 2;
        r.position.z = -0.05;
        haloSpin.add(r);
        rays.push({ r, i });
      }
      halo.add(mesh(new THREE.TorusGeometry(0.6, 0.045, 18, 96), goldMat, false));
      haloSpin.add(mesh(new THREE.TorusGeometry(0.7, 0.012, 10, 96), goldMat, false));
      const moon = new THREE.Mesh(new THREE.CircleGeometry(0.585, 64), voidMat);
      moon.position.z = 0.01;
      halo.add(moon);
      const moonRim = new THREE.Mesh(new THREE.RingGeometry(0.53, 0.585, 64), new THREE.MeshBasicMaterial({ color: 0x2a1a40, side: THREE.DoubleSide }));
      moonRim.position.z = 0.012;
      halo.add(moonRim);
      const diamond = new THREE.Sprite(sparkMat);
      diamond.scale.set(0.42, 0.42, 1);
      halo.add(diamond);
      const beads = [];
      for (let i = 0; i < 6; i++) {
        const b = new THREE.Sprite(sparkMat.clone());
        b.material.opacity = 0.7;
        b.scale.setScalar(0.12);
        halo.add(b);
        beads.push(b);
      }

      const rootBone = new THREE.Bone();
      const neck = new THREE.Bone();
      neck.position.set(0, 1.64, 0.22);
      rootBone.add(neck);
      const head = new THREE.Bone();
      head.position.set(HO[0], HO[1] - 1.64, HO[2] - 0.22);
      head.scale.setScalar(HS);
      neck.add(head);
      const skin = new THREE.SkinnedMesh(G.body, furMat);
      skin.castShadow = true;
      skin.add(rootBone);
      skin.updateMatrixWorld(true);
      skin.bind(new THREE.Skeleton([rootBone, neck, head]));
      body.add(skin);

      const nz = surfZ(0, -0.055);
      const noseShape = new THREE.Shape();
      noseShape.moveTo(0, -0.035);
      noseShape.quadraticCurveTo(0.012, -0.03, 0.04, 0.0);
      noseShape.quadraticCurveTo(0.05, 0.016, 0.03, 0.02);
      noseShape.lineTo(-0.03, 0.02);
      noseShape.quadraticCurveTo(-0.05, 0.016, -0.04, 0.0);
      noseShape.quadraticCurveTo(-0.012, -0.03, 0, -0.035);
      const noseGeo = new THREE.ExtrudeGeometry(noseShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 4, curveSegments: 12 });
      const nose = mesh(noseGeo, noseMat, false);
      nose.position.set(0, -0.052, nz - 0.012);
      nose.rotation.x = -0.35;
      head.add(nose);
      [-1, 1].forEach(s => {
        const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), follicleMat);
        nostril.scale.set(1.4, 0.7, 0.6);
        nostril.position.set(0.016 * s, -0.064, nz + 0.019);
        head.add(nostril);
      });
      const onFace = (x, y, lift = 0.004) => V3(x, y, surfZ(x, y) + lift);
      const philtrum = tube([onFace(0, -0.09), onFace(0, -0.115), onFace(0, -0.14)], 0.0045, mouthMat, 6);
      head.add(philtrum);
      const lips = [-1, 1].map(s => {
        const m = tube([onFace(0, -0.138), onFace(0.018 * s, -0.152), onFace(0.042 * s, -0.152), onFace(0.062 * s, -0.138)], 0.0045, mouthMat, 10);
        head.add(m);
        return m;
      });
      const mouthOpen = new THREE.Group();
      mouthOpen.position.set(0, -0.165, surfZ(0, -0.165) - 0.012);
      mouthOpen.visible = false;
      head.add(mouthOpen);
      const maw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), mouthMat);
      maw.scale.set(1.25, 0.8, 0.6);
      mouthOpen.add(maw);
      const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 10), tongueMat);
      tongue.scale.set(1.1, 0.45, 1);
      tongue.position.set(0, -0.022, 0.012);
      mouthOpen.add(tongue);
      [-1, 1].forEach(s => {
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.03, 8), fangMat);
        f.rotation.x = Math.PI;
        f.position.set(0.026 * s, 0.022, 0.022);
        mouthOpen.add(f);
      });

      [-1, 1].forEach(s => {
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 4; c++) {
            const x = (0.045 + c * 0.018 + r * 0.004) * s;
            const y = -0.105 - r * 0.017;
            const f = new THREE.Mesh(new THREE.SphereGeometry(0.0042, 6, 5), follicleMat);
            f.position.copy(onFace(x, y, 0.001));
            head.add(f);
          }
        [0, 1, 2, 3].forEach(k => {
          const a = onFace((0.08 + k * 0.006) * s, -0.112 - k * 0.013, -0.004);
          const len = 0.31 - k * 0.025;
          const spread = -0.08 + k * 0.09;
          const pts = [a, V3(a.x + len * 0.3 * s, a.y + 0.012 - spread * 0.3, a.z + 0.03), V3(a.x + len * 0.65 * s, a.y - spread * 0.8 - 0.02, a.z + 0.0), V3(a.x + len * s, a.y - spread * 1.4 - 0.07, a.z - 0.05)];
          head.add(tube(pts, 0.0021, whiskerMat, 14));
        });
        [0, 1].forEach(k => {
          const a = onFace((0.13 + k * 0.04) * s, 0.13 + k * 0.01, -0.004);
          head.add(tube([a, V3(a.x + 0.06 * s, a.y + 0.07, a.z + 0.02), V3(a.x + 0.13 * s, a.y + 0.11, a.z - 0.02)], 0.0022, whiskerMat, 10));
        });
      });

      const crescentShape = new THREE.Shape();
      crescentShape.absarc(0, 0, 0.06, Math.PI * 0.12, Math.PI * 1.88, false);
      crescentShape.absarc(0.028, 0, 0.049, Math.PI * 1.72, Math.PI * 0.28, true);
      const crescentGeo = new THREE.ShapeGeometry(crescentShape, 32);
      crescentGeo.rotateZ(Math.PI / 2);
      {
        const p = crescentGeo.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i);
          const y = p.getY(i) + 0.195;
          p.setXYZ(i, x, y, surfZ(x, y) + 0.003);
        }
        crescentGeo.computeVertexNormals();
      }
      head.add(new THREE.Mesh(crescentGeo, markMat));

      const ER = 0.082;
      const lens = new THREE.PlaneGeometry(1, 1, 6, 18);
      {
        const p = lens.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const a = p.getX(i);
          const b = p.getY(i);
          const y = b * 0.11;
          const x = a * 0.024 * Math.max(0, 1 - 4 * b * b) ** 0.7;
          p.setXYZ(i, x, y, Math.sqrt(Math.max(0, (ER + 0.0008) ** 2 - x * x - y * y)));
        }
        lens.computeVertexNormals();
      }
      const eyes = [-1, 1].map(s => {
        const g = new THREE.Group();
        g.position.set(EYE[0] * s, EYE[1], EYE[2]);
        g.rotation.set(-0.06, 0.3 * s, 0.12 * s);
        head.add(g);
        const look = new THREE.Group();
        g.add(look);
        const ball = new THREE.Mesh(new THREE.SphereGeometry(ER, 36, 24), irisMat);
        ball.rotation.x = Math.PI / 2;
        look.add(ball);
        const pupil = new THREE.Mesh(lens, pupilMat);
        look.add(pupil);
        const cornea = new THREE.Mesh(new THREE.SphereGeometry(ER * 1.035, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.45), corneaMat);
        cornea.rotation.x = Math.PI / 2;
        look.add(cornea);
        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), shineMat);
        shine.position.set(-0.026 * s, 0.03, Math.sqrt(ER * ER - 0.026 ** 2 - 0.03 ** 2) + 0.003);
        g.add(shine);
        const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), shineMat);
        shine2.position.set(0.022 * s, -0.026, Math.sqrt(ER * ER - 0.022 ** 2 - 0.026 ** 2) + 0.003);
        g.add(shine2);
        const lidR = ER * 1.1;
        const upper = new THREE.Mesh(paint(new THREE.SphereGeometry(lidR, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), BASE), lidMat);
        const lower = new THREE.Mesh(paint(new THREE.SphereGeometry(lidR, 40, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), BASE), lidMat);
        g.add(upper, lower);
        const rimU = new THREE.Mesh(new THREE.TorusGeometry(lidR, 0.006, 6, 48), mouthMat);
        rimU.rotation.x = Math.PI / 2;
        upper.add(rimU);
        const rimL = rimU.clone();
        lower.add(rimL);
        const gl = new THREE.Sprite(eyeGlow);
        gl.scale.set(0.34, 0.26, 1);
        gl.position.z = 0.04;
        g.add(gl);
        return { g, look, pupil, upper, lower, gl, s, shine, shine2 };
      });

      const ears = [-1, 1].map(s => {
        const pv = new THREE.Group();
        pv.position.set(0.215 * s, 0.2, -0.04);
        pv.rotation.set(-0.2, -0.35 * s, -0.4 * s);
        pv.add(mesh(G.ear, headMat, false));
        for (let k = 0; k < 9; k++) {
          const u = k / 8 - 0.5;
          const len = 0.09 + ((k * 7) % 5) * 0.012;
          const tf = tube([V3(u * 0.13, 0.02, 0.03), V3(u * 0.16, 0.02 + len * 0.5, 0.05), V3(u * 0.24, 0.02 + len, 0.085)], 0.0035, tuftMat, 6);
          pv.add(tf);
        }
        head.add(pv);
        return { pv, s };
      });

      const food = berry();
      food.visible = false;
      root.add(food);

      return {
        root,
        update(st) {
          const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = st;
          const jump = action && action.name === "jump" ? action : null;
          const eat = action && action.name === "eat" ? action : null;
          const ecl = action && action.name === "eclipse" ? action : null;
          const atk = action && action.name === "attack" ? strike(action.p) : null;
          const ph = eat ? eatPhase(eat.p) : null;

          let y = 0;
          const breathe = 1 + Math.sin(t * 1.6) * 0.012 * motion;
          let lean = 0;
          let headDown = 0;
          let headUp = 0;
          let open = false;
          let squint = 0;
          let flare = 0;
          let crouch = 0;
          let gape = 0.8;

          if (jump) {
            const p = jump.p;
            if (p < 0.22) crouch = Math.sin((p / 0.22) * Math.PI / 2);
            else if (p < 0.78) {
              const q = (p - 0.22) / 0.56;
              y = Math.sin(q * Math.PI) * 1.1;
              lean = Math.sin(q * Math.PI) * 0.15;
              crouch = 1 - smooth(0, 0.3, q);
            } else crouch = Math.sin(((p - 0.78) / 0.22) * Math.PI) * 0.6;
          }
          if (atk) {
            crouch = atk.wind;
            y = Math.sin(smooth(0.3, 0.55, action.p) * Math.PI) * 0.4;
            lean = atk.lunge * 0.35 - atk.wind * 0.1;
            open = atk.wind > 0.4 || atk.lunge > 0.15;
            squint = atk.lunge > 0.35 ? 1 : 0;
            flare = atk.impact * 0.6;
            gape = 1.1;
          }
          if (ecl) {
            const p = ecl.p;
            flare = smooth(0.08, 0.3, p) * (1 - smooth(0.75, 1, p));
            headUp = flare * 0.5;
          }
          if (eat) {
            headDown = Math.sin(Math.min(1, ph.fall) * Math.PI * 0.5) * 0.55 * (1 - ph.bite * 0.3);
            food.visible = ph.visible;
            food.position.set(0, lerp(3.2, 1.5, ph.fall * ph.fall), lerp(1.0, 0.8, ph.fall));
            food.scale.setScalar(1 - 0.85 * ph.bite);
            open = eat.p > 0.15 && eat.p < 0.85 && (eat.p < 0.32 || ph.chew > 0.35);
            squint = eat.p > 0.32 ? 0.7 : 0;
            gape = 0.5 + ph.chew * 0.6;
          } else food.visible = false;

          root.position.y = y;
          root.position.z = atk ? atk.lunge * 0.5 - atk.wind * 0.15 : 0;
          root.rotation.y = lookYaw;
          root.rotation.x = lookPitch * 0.6;
          body.scale.set(1 + crouch * 0.05, (1 - crouch * 0.12) * breathe, 1 + crouch * 0.05);
          body.rotation.x = -lean;

          neck.rotation.x = lerp(neck.rotation.x, headDown * 0.7 - headUp * 0.5 - pointer.y * 0.12, 0.12);
          head.rotation.x = lerp(head.rotation.x, headDown * 0.5 - headUp * 0.3, 0.12);
          head.rotation.y = lerp(head.rotation.y, pointer.x * 0.45, 0.1);
          head.rotation.z = Math.sin(t * 0.7) * 0.03 * motion;
          if (atk) {
            neck.rotation.x = -atk.wind * 0.12 + atk.lunge * 0.22;
            head.rotation.x = atk.wind * 0.12 - atk.lunge * 0.12;
          }

          const tw = Math.max(0, Math.sin(t * 0.9 + 1.2)) > 0.985 ? 1 : 0;
          ears.forEach(({ pv, s }, i) => {
            const tw2 = i === 0 ? tw : 0;
            pv.rotation.z = lerp(pv.rotation.z, -0.4 * s + tw2 * 0.25 * s - (jump ? 0.15 * s : 0) - (atk ? atk.wind * 0.35 * s : 0), 0.25);
            pv.rotation.x = lerp(pv.rotation.x, -0.2 - flare * 0.2, 0.2);
          });

          const openK = clamp(blink, 0, 1);
          eyes.forEach(({ look, pupil, upper, lower, gl, shine, shine2 }) => {
            shine.visible = shine2.visible = openK > 0.45 && squint < 0.9;
            const up = lerp(0.24, -0.66 - flare * 0.12 + squint * 0.42, openK);
            const lo = lerp(0.16, 0.8 + flare * 0.06 - squint * 0.3, openK);
            upper.rotation.x = up;
            lower.rotation.x = lo;
            look.rotation.y = lerp(look.rotation.y, pointer.x * 0.32, 0.15);
            look.rotation.x = lerp(look.rotation.x, -pointer.y * 0.22, 0.15);
            pupil.scale.x = lerp(pupil.scale.x, 1 + flare * 2.2 + (eat ? 0.6 : 0), 0.1);
            gl.material.opacity = 0.22 + flare * 0.5 + Math.sin(t * 2) * 0.04;
          });
          irisMat.emissiveIntensity = 0.5 + flare * 0.6;

          philtrum.visible = !open;
          lips.forEach(m => (m.visible = !open));
          mouthOpen.visible = open;
          mouthOpen.scale.set(1, gape, 1);

          const sw = Math.sin(t * 1.4) * motion;
          for (let i = 0; i < tailBase.length; i++) {
            const k = Math.max(0, i - 3) / 3;
            tailNodes[i].p.set(tailBase[i].p.x + sw * 0.06 * k, tailBase[i].p.y + k * k * (0.08 + Math.sin(t * 2.1) * 0.05 * motion + flare * 0.12), tailBase[i].p.z + sw * 0.04 * k);
          }
          if (!reduceMotion || t < 0.1) tail.update(tailNodes);
          tailTip.position.copy(tailNodes[tailNodes.length - 1].p);
          tipGlow.material.opacity = 0.45 + flare * 0.4 + Math.sin(t * 3) * 0.08;

          haloSpin.rotation.z = t * 0.12 * (reduceMotion ? 0.2 : 1);
          const pulse = 1 + Math.sin(t * 1.2) * 0.03 * motion;
          halo.scale.setScalar(pulse * (1 + flare * 0.12));
          rays.forEach(({ r, i }) => {
            r.scale.y = 1 + flare * (0.6 + (i % 3) * 0.25) + Math.sin(t * 2 + i) * 0.06 * motion;
          });
          rayMat.opacity = 0.7 + flare * 0.3;
          coronaMat.opacity = 0.7 + flare * 0.3;
          const mo = flare * 0.38;
          moon.position.x = mo;
          moonRim.position.x = mo;
          const da = 2.3 + t * 0.15;
          diamond.position.set(Math.cos(da) * 0.62, Math.sin(da) * 0.62, 0.05);
          diamond.material.opacity = 0.6 + flare * 0.4 + Math.sin(t * 5) * 0.15;
          diamond.scale.setScalar(0.38 + flare * 0.35);
          beads.forEach((b, i) => {
            const a = da - 0.18 * (i + 1);
            b.position.set(Math.cos(a) * 0.61, Math.sin(a) * 0.61, 0.04);
            b.material.opacity = (0.65 - i * 0.1) * (0.5 + flare * 0.5);
          });
          furUniforms.uStar.value = 0.7 + flare * 1.1 + Math.sin(t * 1.3) * 0.12;
          furUniforms.uSheenK.value = 0.45 + flare * 0.35;
        }
      };
    }
  });
})();
