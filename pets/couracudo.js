Pets.register({
  id: "couracudo",
  dex: 22,
  name: "Couraçudo",
  color: "#7f8aa0",
  types: ["ground",  "steel"],
  description: "Um tatu colossal com couraça de aço e placas laterais que se abrem como lâminas de escavadeira. Afunda no chão girando suas garras de broca e reaparece onde menos se espera.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    roll: { duration: 2.4 },
    dig: { duration: 3.2 }
  },
  idle: [
    { action: "roll", min: 20, max: 45 },
    { action: "dig", min: 40, max: 80 }
  ],
  clickAction: n => ["roll", "dig", "jump", "roll"][(n - 1) % 4],

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
    scaleG.scale.setScalar([0, 1.35, 1.55, 1.75][STAGE]);
    root.add(scaleG);
    const bodyG = new THREE.Group();
    scaleG.add(bodyG);
    const rollG = new THREE.Group();
    bodyG.add(rollG);

    const BANDS = STAGE === 1 ? [0xc98a5a, 0xb07448] : STAGE === 2 ? [0xd8925a, 0xb4643a, 0xe8b878, 0x9a5236, 0xcf7d4c] : [0xa8b4c8, 0x7a879c];
    const skin = M(STAGE === 3 ? 0xb58a6a : 0xe8b8a0, 0.6);
    const skinDark = M(0x7a5040, 0.6);
    const shellMat = (c) => M(c, STAGE === 3 ? 0.35 : 0.75, STAGE === 3 ? 0.6 : 0.02);
    const clayTex = STAGE === 3 ? null : canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = "#fff";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(60,30,10,0.35)";
      g.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) {
        g.beginPath();
        let x = rnd() * w;
        let y = rnd() * h;
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += (rnd() - 0.5) * 30;
          y += (rnd() - 0.5) * 30;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      for (let i = 0; i < 400; i++) {
        g.fillStyle = "rgba(80,40,20," + rnd() * 0.15 + ")";
        g.fillRect(rnd() * w, rnd() * h, 2, 2);
      }
    });

    const BODY_Y = 0.62;
    const RX = 0.62;
    const RY = 0.52;
    const RZ = STAGE === 1 ? 0.72 : 0.82;
    const belly = mesh(new THREE.SphereGeometry(1, 32, 24), M(0xf2cdb4, 0.7));
    belly.scale.set(RX * 0.98, RY * 0.9, RZ * 0.96);
    rollG.add(belly);
    rollG.position.y = BODY_Y;

    const NB = STAGE === 1 ? 7 : 9;
    const shellParts = [];
    const shellGeo = new THREE.SphereGeometry(1, 64, 40, 0, Math.PI * 2, 0, Math.PI * 0.68);
    shellGeo.rotateX(0);
    {
      const pos = shellGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const cols = BANDS.map(hexParts);
      const groove = hexParts(STAGE === 3 ? 0x2a303c : 0x6a3a22);
      for (let i = 0; i < pos.count; i++) {
        const z = pos.getZ(i);
        const f = (z + 1) / 2 * NB;
        const k = Math.min(NB - 1, Math.floor(f));
        const fr = f - k;
        const bump = 1 + 0.035 * Math.sin(fr * Math.PI);
        pos.setXYZ(i, pos.getX(i) * bump, pos.getY(i) * bump, z);
        const c = cols[k % cols.length];
        const gr = fr < 0.08 || fr > 0.92 ? 1 : 0;
        for (let j = 0; j < 3; j++) col[i * 3 + j] = gr ? groove[j] : c[j];
      }
      shellGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      shellGeo.computeVertexNormals();
    }
    const shellM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: STAGE === 3 ? 0.35 : 0.8, metalness: STAGE === 3 ? 0.55 : 0.02, map: clayTex || null });
    const shell = mesh(shellGeo, shellM);
    shell.scale.set(RX * 1.06, RY * 1.08, RZ * 1.04);
    rollG.add(shell);
    shellParts.push(shell);
    if (STAGE >= 2) {
      for (let k = 0; k < NB; k += 2) {
        const zc = -1 + ((k + 0.5) / NB) * 2;
        const rr = Math.sqrt(Math.max(0.05, 1 - zc * zc));
        for (let j = -2; j <= 2; j++) {
          const a = Math.PI / 2 + j * 0.42;
          const st = mesh(STAGE === 3 ? new THREE.ConeGeometry(0.045, 0.14, 6) : new THREE.SphereGeometry(0.035, 8, 6), shellMat(STAGE === 3 ? 0xe6eaf0 : 0xf2d8a8), false);
          st.position.set(Math.cos(a) * RX * rr * 1.1, Math.sin(a) * RY * rr * 1.12, zc * RZ * 1.04);
          st.lookAt(st.position.clone().multiplyScalar(2));
          st.rotateX(Math.PI / 2);
          rollG.add(st);
        }
      }
    }
    const plates = [];
    if (STAGE === 3) {
      [-1, 1].forEach(s => {
        const pl = new THREE.Group();
        pl.position.set(RX * 0.95 * s, 0.05, RZ * 0.55);
        const blade = mesh(new THREE.BoxGeometry(0.06, 0.55, 0.42), shellMat(0x9aa5b8), true);
        blade.position.set(0.04 * s, 0, 0.12);
        pl.add(blade);
        for (let k = 0; k < 3; k++) {
          const tooth = mesh(new THREE.ConeGeometry(0.04, 0.12, 4), shellMat(0xe6eaf0), false);
          tooth.position.set(0.04 * s, -0.2 + k * 0.2, 0.36);
          tooth.rotation.x = Math.PI / 2;
          pl.add(tooth);
        }
        rollG.add(pl);
        plates.push({ pl, s });
      });
    }

    const tail = mesh(taper([V3(0, -0.05, -RZ * 0.9), V3(0, -0.15, -RZ * 1.25), V3(0, -0.3, -RZ * 1.5)], 0.13, 0.04, 10, 12), shellMat(BANDS[0]), true);
    rollG.add(tail);
    for (let k = 0; k < 4; k++) {
      const tr = mesh(new THREE.TorusGeometry(0.1 - k * 0.018, 0.018, 6, 16), shellMat(BANDS[1 % BANDS.length]), false);
      tr.position.set(0, -0.08 - k * 0.055, -RZ * (1.0 + k * 0.13));
      tr.rotation.x = 0.4;
      rollG.add(tr);
    }

    const head = new THREE.Group();
    head.position.set(0, -0.02, RZ * 0.92);
    head.scale.setScalar(1.3);
    rollG.add(head);
    const helm = mesh(new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), shellMat(BANDS[0]));
    helm.scale.set(0.28, 0.24, 0.32);
    helm.position.set(0, 0.04, 0.06);
    head.add(helm);
    const snout = mesh(taper([V3(0, 0, 0), V3(0, -0.04, 0.2), V3(0, -0.08, 0.38)], 0.16, 0.06, 14, 12), skin);
    head.add(snout);
    const nose = mesh(new THREE.SphereGeometry(0.055, 14, 10), M(0x3a2520, 0.4), false);
    nose.position.set(0, -0.08, 0.42);
    head.add(nose);
    const ears = [-1, 1].map(s => {
      const e = mesh(new THREE.SphereGeometry(0.08, 14, 10), skin, false);
      e.scale.set(0.6, 1, 0.35);
      e.position.set(0.17 * s, 0.2, -0.04);
      e.rotation.z = -0.4 * s;
      head.add(e);
      return e;
    });
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: STAGE === 1 ? 0.55 : 0.45, whiteColor: 0xffffff, pupilColor: 0x1a120c });
      e.g.position.set(0.11 * s, 0.06, 0.2);
      e.g.rotation.y = 0.45 * s;
      head.add(e.g);
      if (STAGE >= 2) {
        const lid = mesh(new THREE.SphereGeometry(0.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), shellMat(BANDS[0]), false);
        lid.position.copy(e.g.position);
        lid.rotation.set(0.1, 0.45 * s, 0.35 * s);
        lid.scale.set(1.05, 1.1, 0.6);
        head.add(lid);
      }
      return e;
    });

    const legs = [];
    [[0.45, 1], [-0.45, -1]].forEach(([z]) => {
      [-1, 1].forEach(s => {
        const g = new THREE.Group();
        g.position.set(RX * 0.6 * s, BODY_Y - 0.3, z * RZ / 0.82);
        const leg = mesh(taper([V3(0, 0.1, 0), V3(0.03 * s, -0.12, 0.02), V3(0.02 * s, -0.24, 0.06)], 0.11, 0.08, 10, 8), skin);
        g.add(leg);
        const nClaw = STAGE === 3 ? 3 : 3;
        for (let k = 0; k < nClaw; k++) {
          let cl;
          if (STAGE === 3 && z > 0) {
            cl = new THREE.Group();
            const drill = mesh(new THREE.ConeGeometry(0.045, 0.2, 10), shellMat(0xd8dde6), false);
            drill.rotation.x = Math.PI / 2 + 0.6;
            cl.add(drill);
            for (let j = 0; j < 3; j++) {
              const th = mesh(new THREE.TorusGeometry(0.035 - j * 0.009, 0.007, 4, 10), shellMat(0x8a95a8), false);
              th.position.z = -0.03 + j * 0.05;
              th.position.y = -(-0.03 + j * 0.05) * 0.7;
              cl.add(th);
            }
          } else {
            cl = mesh(new THREE.ConeGeometry(0.025, STAGE === 1 ? 0.09 : 0.13, 6), M(0xf2e6d0, 0.4), false);
            cl.rotation.x = Math.PI / 2 + 0.6;
          }
          cl.position.set(0.02 * s + (k - 1) * 0.045, -0.28, 0.12);
          g.add(cl);
        }
        bodyG.add(g);
        legs.push({ g, s, front: z > 0 });
      });
    });

    const dustMat = new THREE.MeshBasicMaterial({ color: 0xd8b890, transparent: true, opacity: 0.4, depthWrite: false });
    const dust = [];
    for (let k = 0; k < 10; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), dustMat);
      m.visible = false;
      scaleG.add(m);
      dust.push({ m, a: (k / 10) * Math.PI * 2 });
    }
    const rocks = [];
    for (let k = 0; k < 8; k++) {
      const m = mesh(new THREE.DodecahedronGeometry(0.06 + (k % 3) * 0.025, 0), M([0x9a6a48, 0xc89a6a, 0x7a5a40][k % 3], 0.9), false);
      m.visible = false;
      scaleG.add(m);
      rocks.push({ m, k, a: (k / 8) * Math.PI * 2 + 0.2 });
    }
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.8, 32), new THREE.MeshBasicMaterial({ color: 0x2a1a10, transparent: true, opacity: 0, depthWrite: false }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.y = 0.01;
    scaleG.add(hole);
    const ring = groundRing(STAGE === 3 ? 0x9aa5b8 : 0xd8925a, 0.9, 1.05);
    root.add(ring);

    const food = berry();
    food.visible = false;
    scaleG.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, motion } = s;
        const jump = ACT(s, "jump");
        const eat = ACT(s, "eat");
        const roll = ACT(s, "roll");
        const dig = ACT(s, "dig");
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let curl = 0;
        let spin = 0;
        let x = 0;
        let sink = 0;
        let impact = 0;
        let airborne = false;
        if (jump) {
          const p = jump.p;
          if (p > 0.2 && p < 0.8) {
            y = Math.sin(((p - 0.2) / 0.6) * Math.PI) * 0.8;
            airborne = true;
          }
          if (p > 0.78 && p < 0.95) impact = Math.sin(((p - 0.78) / 0.17) * Math.PI);
        }
        if (roll) {
          const p = roll.p;
          curl = smooth(0, 0.15, p) * (1 - smooth(0.85, 1, p));
          spin = smooth(0.1, 0.9, p) * Math.PI * 4;
          x = Math.sin(p * Math.PI * 2) * 0.8 * curl;
          y = curl * 0.05 + Math.abs(Math.sin(spin)) * 0.04;
        }
        if (dig) {
          const p = dig.p;
          const down = smooth(0.05, 0.35, p) * (1 - smooth(0.45, 0.55, p));
          const up = smooth(0.55, 0.7, p) * (1 - smooth(0.85, 1, p));
          sink = Math.max(down, up);
          curl = Math.max(curl, sink * 0.6);
          if (p > 0.45 && p < 0.55) sink = 1;
          x = p > 0.5 ? 0.9 * (1 - smooth(0.7, 1, p)) : 0;
          if (p > 0.55 && p < 0.72) impact = Math.sin(((p - 0.55) / 0.17) * Math.PI);
          if (p > 0.08 && p < 0.4) impact = Math.max(impact, 0.5 + Math.sin(t * 30) * 0.3);
          spin = p < 0.5 ? p * 40 : 0;
        }
        root.position.set(x, y - sink * 1.1, 0);
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch;
        rollG.position.y = BODY_Y - curl * 0.05;
        rollG.rotation.x = roll ? spin : dig ? -sink * 0.6 : Math.sin(t * 1.5) * 0.02 * motion;
        rollG.rotation.z = dig ? spin * 0.4 * curl : 0;
        rollG.scale.set(1, 1 - curl * 0.05, 1 - curl * 0.28);
        head.position.z = RZ * (0.92 - curl * 0.45);
        head.position.y = -0.02 - curl * 0.28;
        head.rotation.x = curl * 1.8 + (eat ? -0.3 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.1 : 0) + Math.sin(t * 1.1) * 0.04 * motion;
        head.rotation.y = (1 - curl) * (Math.sin(t * 0.7) * 0.15 * motion + pointer.x * 0.12);
        tail.rotation.x = curl * -1.6;
        tail.position.y = curl * -0.1;
        ears.forEach((e, i) => {
          e.rotation.x = Math.sin(t * 2 + i) * 0.1 * motion;
        });
        legs.forEach(({ g, s: sd, front }, i) => {
          g.visible = curl < 0.6;
          const walk = Math.sin(t * 5 + i * 1.7) * 0.05 * motion;
          g.rotation.x = airborne ? (front ? -0.5 : 0.5) : walk + (dig && front ? Math.sin(t * 25) * 0.6 * sink : 0);
          g.scale.setScalar(1 - curl * 0.8);
        });
        plates.forEach(({ pl, s: sd }) => {
          const flare = (dig ? sink : 0) + (roll ? curl * 0.6 : 0);
          pl.rotation.y = sd * (0.2 + flare * 0.9);
          pl.rotation.z = sd * flare * 0.3;
        });
        const fx = impact > 0.05;
        dust.forEach(d => {
          d.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const r = 0.7 + u * 0.6;
          d.m.position.set(x / scaleG.scale.x + Math.cos(d.a) * r, 0.12 + u * 0.3, Math.sin(d.a) * r);
          d.m.scale.setScalar(0.6 + u);
          dustMat.opacity = 0.45 * impact;
        });
        rocks.forEach(r => {
          r.m.visible = fx;
          if (!fx) return;
          const u = 1 - impact;
          const rr = 0.6 + u * 0.7;
          r.m.position.set(x / scaleG.scale.x + Math.cos(r.a) * rr, 0.05 + Math.sin(u * Math.PI) * 0.6, Math.sin(r.a) * rr);
          r.m.rotation.set(t * 4 + r.k, t * 3, 0);
        });
        hole.material.opacity = sink * 0.7;
        hole.position.x = 0;
        ring.scale.setScalar(1 + impact * 0.5 + Math.sin(t * 2) * 0.03);
        ring.material.opacity = 0.14 + impact * 0.3;

        eyes.forEach(({ g }) => {
          g.scale.y = curl > 0.3 ? 0.1 : eat && eat.p > 0.3 ? 0.45 : blink;
        });
        followPupils(eyes, pointer, 0.5);

        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(2.6, BODY_Y - 0.08, ph.fall * ph.fall), RZ * 0.92 + 0.48);
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.7);
        } else food.visible = false;
      }
    };
  }
});
