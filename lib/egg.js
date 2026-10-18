(function (root) {
  function build(THREE, opts = {}) {
    const H = 1.5;
    const W = 0.6;
    const color = opts.color || "#c48ae8";
    const lerp = (a, b, k) => a + (b - a) * k;
    const smooth = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

    const profile = t => new THREE.Vector2(Math.max(0.0001, W * Math.sin(t) * (1 + 0.12 * Math.cos(t))), ((1 - Math.cos(t)) / 2) * H);
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

    const shellBottom = new THREE.MeshStandardMaterial({ color: 0xfff3df, roughness: 0.45, transparent: true, opacity: 1, emissive: new THREE.Color(color), emissiveIntensity: 0 });
    const shellTop = new THREE.MeshStandardMaterial({ color: 0xfff3df, roughness: 0.45, transparent: true, opacity: 1, emissive: new THREE.Color(color), emissiveIntensity: 0 });
    const rayMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const spotMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x7a5a3c, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false });
    const crackMat = new THREE.MeshBasicMaterial({ color: 0x5a4632 });
    const crackDark = new THREE.Color(0x5a4632);
    const crackHot = new THREE.Color(0xfff2a8).lerp(new THREE.Color(color), 0.25);
    const crackGlowMat = new THREE.MeshBasicMaterial({ color: crackHot, transparent: true, opacity: 0, depthWrite: false });
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
      const seg = mk(new THREE.BoxGeometry(0.022, 0.022, len), crackMat, false);
      seg.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      seg.lookAt(b.x, b.y, b.z);
      const halo = mk(new THREE.BoxGeometry(0.07, 0.07, len * 1.05), crackGlowMat, false);
      seg.add(halo);
      seg.visible = false;
      body.add(seg);
      cracks.push({ seg, order: Math.abs(i - (crackPts.length - 2) / 2) });
    }
    cracks.sort((p1, p2) => p1.order - p2.order);

    let nest = null;
    if (opts.nest) {
      nest = new THREE.Group();
      const straw = new THREE.MeshStandardMaterial({ color: 0xc9a46a, roughness: 0.9 });
      const ring = mk(new THREE.TorusGeometry(0.64, 0.16, 12, 36), straw);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      const bed = mk(new THREE.CylinderGeometry(0.64, 0.58, 0.1, 32), new THREE.MeshStandardMaterial({ color: 0xb08a52, roughness: 0.95 }));
      bed.position.y = 0.04;
      nest.add(ring, bed);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const st = mk(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), straw, false);
        st.position.set(Math.sin(a) * 0.68, 0.18, Math.cos(a) * 0.68);
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

    const rays = [];
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const ray = mk(new THREE.ConeGeometry(0.07, 1.4, 6, 1, true), rayMat, false);
      ray.position.y = 0.7;
      g.add(ray);
      g.position.y = profile(T_CUT).y;
      g.rotation.set(Math.PI / 2 - 0.25 + (i % 3) * 0.15, (i / 10) * Math.PI * 2, 0, "YXZ");
      g.visible = false;
      rootG.add(g);
      rays.push(g);
    }

    const ring = mk(new THREE.RingGeometry(0.5, 0.62, 48), ringMat, false);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    ring.visible = false;
    rootG.add(ring);

    const confColors = [color, "#ffffff", "#ffd75e", color, "#ff9fb8"];
    const confetti = [];
    for (let i = 0; i < 30; i++) {
      const m = mk(new THREE.PlaneGeometry(0.07, 0.11), new THREE.MeshBasicMaterial({ color: new THREE.Color(confColors[i % confColors.length]), side: THREE.DoubleSide }), false);
      m.visible = false;
      rootG.add(m);
      const a = (i / 30) * Math.PI * 2 + (i % 3) * 0.4;
      confetti.push({ m, vx: Math.sin(a) * (0.6 + (i % 5) * 0.22), vz: Math.cos(a) * (0.6 + (i % 4) * 0.25), vy: 3 + (i % 6) * 0.45, spin: 5 + (i % 5) * 2, ph: i });
    }

    const orbitColors = [color, "#ffffff", "#ffe27a"];
    const orbiters = [];
    for (let i = 0; i < 14; i++) {
      const m = mk(new THREE.OctahedronGeometry(0.06), new THREE.MeshBasicMaterial({ color: new THREE.Color(orbitColors[i % 3]) }), false);
      m.visible = false;
      rootG.add(m);
      orbiters.push({ m, a: (i / 14) * Math.PI * 2, h: 0.2 + (i % 5) * 0.32, sp: 1 + (i % 3) * 0.35 });
    }

    const flash = mk(new THREE.SphereGeometry(1, 24, 16), flashMat, false);
    flash.position.y = H * 0.55;
    flash.visible = false;
    rootG.add(flash);

    return {
      root: rootG,
      hatchDuration: 3.2,
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
        const level = Math.max(0, Math.min(3, st.cracks || 0));
        let glowK = level / 3;
        let lift = 0;

        const knocking = act && act.name === "knock" ? act.p : -1;
        if (knocking >= 0) {
          const dir = level % 2 ? 1 : -1;
          rz += Math.sin(knocking * Math.PI * 3) * 0.32 * (1 - knocking) * dir;
          y += Math.sin(Math.min(1, knocking * 1.6) * Math.PI) * 0.32;
          const land = knocking > 0.62 ? Math.sin(((knocking - 0.62) / 0.38) * Math.PI) : 0;
          sy += -land * 0.16 + (knocking < 0.3 ? Math.sin((knocking / 0.3) * Math.PI) * 0.08 : 0);
          glowK = Math.min(1, glowK + Math.sin(knocking * Math.PI) * 0.6);
        }
        sparkMat.opacity = Math.max(sparkMat.opacity, knocking >= 0 ? Math.sin(knocking * Math.PI) : 0);
        if (knocking >= 0) {
          sparks.forEach(({ m, a }, i) => {
            m.visible = true;
            const rr = 0.45 + knocking * 0.9;
            m.position.set(Math.sin(a) * rr, cutY + (i % 3) * 0.08 + knocking * 0.5 - knocking * knocking * 0.6, Math.cos(a) * rr);
            m.rotation.set(t * 6, t * 5, 0);
            m.scale.setScalar(1.1 * (1 - knocking) + 0.2);
          });
        }

        const shown = hp !== null && hp !== undefined ? cracks.length : [0, 4, 8, 12][level];
        cracks.forEach((c, i) => {
          c.seg.visible = i < shown && !(hp !== null && hp !== undefined && hp >= 0.62);
        });
        const pulse = 0.75 + Math.sin(t * 6) * 0.25;
        crackMat.color.copy(crackDark).lerp(crackHot, Math.min(1, level / 3 + 0.2) * (level ? 1 : 0));
        crackGlowMat.opacity = (level / 3) * 0.55 * pulse + (knocking >= 0 ? Math.sin(knocking * Math.PI) * 0.4 : 0);

        if (hp !== null && hp !== undefined) {
          const pre = hp < 0.62;
          const frantic = smooth(0, 0.3, hp) * (pre ? 1 : 0);
          rz = Math.sin(t * 40) * 0.16 * frantic;
          rx = Math.sin(t * 31) * 0.07 * frantic;
          lift = smooth(0.02, 0.4, hp) * 0.5 * (pre ? 1 : 0);
          y = Math.sin(t * 3) * 0.04 * frantic;
          ry = smooth(0.05, 0.62, hp) * Math.PI * 3 * (pre ? 1 : 0);
          if (hp > 0.52 && pre) sy = 1 - Math.sin(((hp - 0.52) / 0.1) * Math.PI) * 0.24;
          glowK = pre ? 1 : 0;
          crackGlowMat.opacity = pre ? 0.6 + Math.sin(t * 18) * 0.3 : 0;
          crackMat.color.copy(crackHot);
          rays.forEach((g, i) => {
            g.visible = hp > 0.05 && hp < 0.7;
            if (!g.visible) return;
            const q = smooth(0.05, 0.55, hp);
            g.scale.set(1, (0.5 + q * 1.3) * (1 + Math.sin(t * 20 + i) * 0.15), 1);
            g.position.y = profile(T_CUT).y + lift + (nest ? 0.08 : 0);
          });
          rayMat.opacity = smooth(0.05, 0.5, hp) * (1 - smooth(0.62, 0.7, hp)) * 0.6;
          orbiters.forEach((o, i) => {
            const on = pre;
            o.m.visible = on;
            if (!on) return;
            const k = smooth(0, 0.12, hp);
            const rad = lerp(1.2, 0.5, smooth(0.1, 0.6, hp)) * k;
            const a = o.a + t * o.sp * (2 + hp * 10);
            o.m.position.set(Math.sin(a) * rad, (nest ? 0.08 : 0) + o.h + lift, Math.cos(a) * rad);
            o.m.rotation.set(t * 5, t * 4, 0);
            o.m.scale.setScalar(k * (0.8 + Math.sin(t * 9 + i) * 0.3));
          });
          flash.visible = hp > 0.58 && hp < 0.82;
          if (flash.visible) {
            const q = (hp - 0.58) / 0.24;
            flash.scale.setScalar(0.3 + q * 2.8);
            flashMat.opacity = Math.sin(Math.min(1, q * 1.3) * Math.PI) * 0.95;
          }
          ring.visible = hp > 0.62;
          if (ring.visible) {
            const q = (hp - 0.62) / 0.38;
            ring.scale.setScalar(1 + q * 4);
            ringMat.opacity = (1 - q) * 0.7;
          }
          if (!pre) {
            burst = true;
            const q = (hp - 0.62) / 0.38;
            topPivot.position.set(q * 0.6, cutY + q * 2.4 - q * q * 1.6, q * 0.25);
            topPivot.rotation.set(-q * 2.2, q * 1.5, q * 3.4);
            shellTop.opacity = 1 - smooth(0.55, 1, q);
            bottom.scale.setScalar(1 - smooth(0.2, 0.9, q) * 0.6);
            shellBottom.opacity = 1 - smooth(0.25, 0.85, q);
            bottom.position.y = -q * 0.4;
            shards.forEach(sh => {
              sh.m.visible = q < 0.95;
              sh.m.position.set(sh.vx * q * 1.3, cutY + sh.vy * q - 4.5 * q * q, sh.vz * q * 1.3);
              sh.m.rotation.set(q * sh.spin, q * sh.spin * 0.7, 0);
            });
            confetti.forEach(c => {
              c.m.visible = true;
              const qq = q * 1.25;
              c.m.position.set(c.vx * qq, cutY + c.vy * qq - 3.2 * qq * qq, c.vz * qq);
              c.m.rotation.set(t * c.spin, t * c.spin * 0.6 + c.ph, 0);
            });
          }
        } else {
          orbiters.forEach(o => {
            o.m.visible = false;
          });
          rays.forEach(g => {
            g.visible = false;
          });
        }
        shellBottom.emissiveIntensity = glowK * (0.35 + Math.sin(t * 6) * 0.08);
        shellTop.emissiveIntensity = shellBottom.emissiveIntensity;
        y += lift;

        body.rotation.set(rx, ry, rz);
        body.position.y = (nest ? 0.08 : 0) + y;
        body.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
        return burst;
      }
    };
  }

  root.PetEgg = { build };
})(typeof self !== "undefined" ? self : this);
