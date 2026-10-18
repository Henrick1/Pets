(function (root) {
  function build(THREE, opts = {}) {
    const H = 1.45;
    const W = 0.52;
    const color = opts.color || "#c48ae8";
    const lerp = (a, b, k) => a + (b - a) * k;
    const smooth = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    const profile = t => new THREE.Vector2(Math.max(0.0001, W * Math.sin(t) * (1 + 0.14 * Math.cos(t))), ((1 - Math.cos(t)) / 2) * H);
    const T_CUT = 1.78;
    const span = (a, b, n) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(profile(a + (b - a) * (i / n)));
      return pts;
    };
    const surf = (t, phi, k = 1) => {
      const p = profile(t);
      return new THREE.Vector3(Math.sin(phi) * p.x * k, p.y, Math.cos(phi) * p.x * k);
    };

    const shellBottom = new THREE.MeshStandardMaterial({ color: 0xfff3df, roughness: 0.45, transparent: true, opacity: 1 });
    const shellTop = new THREE.MeshStandardMaterial({ color: 0xfff3df, roughness: 0.45, transparent: true, opacity: 1 });
    const spotMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false });
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x5a4632 });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xfffbe8, transparent: true, opacity: 0, depthWrite: false });

    const rootG = new THREE.Group();
    const body = new THREE.Group();
    rootG.add(body);
    const bottom = new THREE.Group();
    const top = new THREE.Group();
    body.add(bottom, top);

    const mk = (geo, mat, shadow = true) => {
      const m = new THREE.Mesh(geo, mat);
      m.castShadow = shadow;
      return m;
    };

    bottom.add(mk(new THREE.LatheGeometry(span(0, T_CUT, 24), 40), shellBottom));
    const topPivot = new THREE.Group();
    const cutY = profile(T_CUT).y;
    topPivot.position.y = cutY;
    top.add(topPivot);
    const topMesh = mk(new THREE.LatheGeometry(span(T_CUT, Math.PI, 20), 40), shellTop);
    topMesh.position.y = -cutY;
    topPivot.add(topMesh);

    const place = (m, t, phi, k) => {
      const p = surf(t, phi, k);
      const n = new THREE.Vector3(Math.sin(phi), (Math.cos(t) * -0.9), Math.cos(phi)).normalize();
      m.position.copy(p);
      m.lookAt(p.x + n.x, p.y + n.y, p.z + n.z);
      return m;
    };

    [
      [0.9, 0.3, 0.13],
      [1.3, 2.2, 0.11],
      [1.15, -1.6, 0.12],
      [2.1, 0.9, 0.1],
      [2.3, -0.7, 0.12],
      [2.15, 3.0, 0.11],
      [2.65, 1.9, 0.08],
      [1.55, -0.2, 0.08],
      [0.7, 3.4, 0.1]
    ].forEach(([t, phi, r]) => {
      const spot = mk(new THREE.SphereGeometry(1, 16, 10), spotMat, false);
      spot.scale.set(r, r * 0.85, 0.025);
      if (t < T_CUT) bottom.add(place(spot, t, phi, 1.0));
      else {
        place(spot, t, phi, 1.0);
        spot.position.y -= cutY;
        topPivot.add(spot);
      }
    });

    const dirt = [];
    [
      [1.0, 0.8, 0.16],
      [1.6, -0.9, 0.13],
      [2.0, 2.4, 0.15],
      [1.25, 3.6, 0.12],
      [2.4, 0.2, 0.1]
    ].forEach(([t, phi, r]) => {
      const d = mk(new THREE.SphereGeometry(1, 14, 10), dirtMat, false);
      d.scale.set(r, r * 0.7, 0.03);
      place(d, t, phi, 1.004);
      if (t < T_CUT) bottom.add(d);
      else {
        d.position.y -= cutY;
        topPivot.add(d);
      }
      dirt.push(d);
    });

    const cracks = [];
    const crackPts = [];
    for (let i = 0; i <= 12; i++) {
      const phi = -1.4 + (i / 12) * 2.8;
      const t = T_CUT + (i % 2 ? 0.12 : -0.1);
      crackPts.push(surf(t, phi, 1.012));
    }
    for (let i = 0; i < crackPts.length - 1; i++) {
      const a = crackPts[i];
      const b = crackPts[i + 1];
      const len = a.distanceTo(b);
      const seg = mk(new THREE.BoxGeometry(0.018, 0.018, len), crackMat, false);
      seg.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      seg.lookAt(b.x, b.y, b.z);
      seg.visible = false;
      body.add(seg);
      cracks.push(seg);
    }

    let nest = null;
    if (opts.nest) {
      nest = new THREE.Group();
      const straw = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 });
      const ring = mk(new THREE.TorusGeometry(0.56, 0.15, 12, 36), straw);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      const bed = mk(new THREE.CylinderGeometry(0.56, 0.5, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0xb08a52, roughness: 0.95 }));
      bed.position.y = 0.04;
      nest.add(ring, bed);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const st = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), straw, false);
        st.position.set(Math.sin(a) * 0.6, 0.18, Math.cos(a) * 0.6);
        st.rotation.set(0.6 * Math.cos(a * 3), a, 0.9);
        nest.add(st);
      }
      rootG.add(nest);
      body.position.y = 0.08;
    }

    const sparks = [];
    for (let i = 0; i < 9; i++) {
      const m = mk(new THREE.OctahedronGeometry(0.05), sparkMat, false);
      m.visible = false;
      rootG.add(m);
      sparks.push({ m, a: (i / 9) * Math.PI * 2, h: 0.3 + (i % 3) * 0.35 });
    }

    const shards = [];
    for (let i = 0; i < 12; i++) {
      const m = mk(new THREE.TetrahedronGeometry(0.11), i % 3 ? shellBottom : spotMat, false);
      m.scale.set(1, 1, 0.3);
      m.visible = false;
      rootG.add(m);
      const a = (i / 12) * Math.PI * 2;
      shards.push({ m, vx: Math.sin(a) * (0.9 + (i % 4) * 0.25), vz: Math.cos(a) * (0.9 + (i % 3) * 0.3), vy: 2.2 + (i % 5) * 0.4, spin: 4 + (i % 4) * 2 });
    }

    const flash = mk(new THREE.SphereGeometry(1, 24, 16), flashMat, false);
    flash.position.y = H * 0.55;
    flash.visible = false;
    rootG.add(flash);

    return {
      root: rootG,
      update(st) {
        const t = st.t;
        const motion = st.motion === undefined ? 1 : st.motion;
        const care = st.care === undefined ? 100 : st.care;
        const careK = care / 100;
        const hp = st.hatch;

        dirtMat.opacity = (1 - careK) * 0.85;
        const alive = 0.35 + 0.65 * careK;
        let rz = Math.sin(t * 1.6) * 0.035 * alive * motion;
        let rx = Math.sin(t * 1.1 + 1) * 0.02 * alive * motion;
        let y = 0;
        let sy = 1 + Math.sin(t * 2.2) * 0.012 * alive * motion;
        let ry = 0;

        const act = st.action;
        if (act && act.name === "play") {
          const p = act.p;
          rz += Math.sin(p * Math.PI * 4) * 0.28 * (1 - p);
          y += Math.abs(Math.sin(p * Math.PI * 2)) * 0.18 * (1 - p * 0.5);
          sy += Math.sin(p * Math.PI * 4) * 0.04;
        }
        const cleaning = act && act.name === "clean" ? act.p : -1;
        if (cleaning >= 0) ry = Math.sin(cleaning * Math.PI) * 0.6;
        sparkMat.opacity = cleaning >= 0 ? Math.sin(cleaning * Math.PI) : 0;
        sparks.forEach(({ m, a, h }, i) => {
          m.visible = cleaning >= 0;
          if (!m.visible) return;
          const aa = a + cleaning * 5;
          const rr = 0.72 + Math.sin(cleaning * Math.PI * 2 + i) * 0.08;
          m.position.set(Math.sin(aa) * rr, h + cleaning * 0.6, Math.cos(aa) * rr);
          m.rotation.set(t * 4, t * 3, 0);
          m.scale.setScalar(0.6 + Math.sin(cleaning * Math.PI) * 0.8);
        });

        let burst = false;
        if (hp !== null && hp !== undefined) {
          const shake = smooth(0, 0.65, hp);
          rz = Math.sin(t * 34) * (0.03 + 0.12 * shake) * (hp < 0.72 ? 1 : 0);
          rx = Math.sin(t * 27) * 0.04 * shake * (hp < 0.72 ? 1 : 0);
          const hop = hp < 0.65 ? Math.max(0, Math.sin(hp * Math.PI * 9)) * 0.1 * shake : 0;
          y = hop;
          const vis = Math.floor(smooth(0.1, 0.62, hp) * cracks.length + 0.001);
          cracks.forEach((c, i) => {
            c.visible = i < vis && hp < 0.72;
          });
          if (hp > 0.62 && hp < 0.72) {
            const q = (hp - 0.62) / 0.1;
            sy = 1 + Math.sin(q * Math.PI) * 0.12;
          }
          flash.visible = hp > 0.66 && hp < 0.95;
          if (flash.visible) {
            const q = (hp - 0.66) / 0.29;
            flash.scale.setScalar(0.3 + q * 2.2);
            flashMat.opacity = Math.sin(Math.min(1, q * 1.4) * Math.PI) * 0.9;
          }
          if (hp >= 0.72) {
            burst = true;
            const q = (hp - 0.72) / 0.28;
            topPivot.position.set(q * 0.5, cutY + q * 1.8 - q * q * 1.2, q * 0.2);
            topPivot.rotation.set(-q * 1.4, 0, q * 2.2);
            shellTop.opacity = 1 - smooth(0.5, 1, q);
            bottom.scale.setScalar(1 - smooth(0.15, 0.9, q) * 0.6);
            shellBottom.opacity = 1 - smooth(0.2, 0.85, q);
            bottom.position.y = -q * 0.4;
            shards.forEach(s => {
              s.m.visible = q < 0.95;
              s.m.position.set(s.vx * q, cutY + s.vy * q - 4.5 * q * q, s.vz * q);
              s.m.rotation.set(q * s.spin, q * s.spin * 0.7, 0);
            });
          }
        } else {
          cracks.forEach(c => {
            c.visible = false;
          });
        }

        body.rotation.set(rx, ry, rz);
        body.position.y = (nest ? 0.08 : 0) + y;
        body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
        return burst;
      }
    };
  }

  root.PetEgg = { build };
})(typeof self !== "undefined" ? self : this);
