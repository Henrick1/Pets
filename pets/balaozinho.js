Pets.register({
  id: "balaozinho",
  dex: 26,
  name: "Balãozinho",
  color: "#ff8a74",
  types: ["flying"],
  evolvesTo: "zepelume",
  evolveLevel: 16,
  description: "Um balão de ar quente que ganhou vida numa festa junina e nunca mais quis descer. A cestinha é a barriga dele: quando está com fome, o balão murcha e ele pousa no chão emburrado.",
  actions: {
    jump: { duration: 1.6 },
    eat: { duration: 2.4 },
    puff: { duration: 2.0 }
  },
  idle: [
    { action: "puff", min: 20, max: 45 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["puff", "jump", "puff"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let sd = 5;
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

    const fabricTex = canvasTex(256, 256, (g, rnd, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = "rgba(0,0,0," + (0.03 + rnd() * 0.03) + ")";
        g.fillRect(0, y, w, 1);
      }
      for (let x = 0; x < w; x += 2) {
        g.fillStyle = "rgba(0,0,0," + (0.02 + rnd() * 0.03) + ")";
        g.fillRect(x, 0, 1, h);
      }
      for (let i = 0; i < 400; i++) {
        g.fillStyle = "rgba(255,255,255," + rnd() * 0.25 + ")";
        g.fillRect(rnd() * w, rnd() * h, 2, 1);
      }
      g.strokeStyle = "rgba(0,0,0,0.07)";
      g.setLineDash([5, 4]);
      g.lineWidth = 1.5;
      [h * 0.25, h * 0.75].forEach(y => {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      });
    }, 12, 4);
    const fabricBump = canvasTex(128, 128, (g, rnd, w, h) => {
      g.fillStyle = "#808080";
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 2) {
        g.fillStyle = "rgba(255,255,255,0.25)";
        g.fillRect(0, y, w, 1);
      }
      for (let x = 0; x < w; x += 2) {
        g.fillStyle = "rgba(0,0,0,0.2)";
        g.fillRect(x, 0, 1, h);
      }
    }, 24, 8);

    const weaveDraw = (g, rnd, w, h) => {
      g.fillStyle = "#6b4321";
      g.fillRect(0, 0, w, h);
      const rows = 8;
      const cols = 16;
      const rh = h / rows;
      const cw = w / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const over = (r + c) % 2 === 0;
          const x = c * cw;
          const y = r * rh;
          const gr = over ? g.createLinearGradient(x, y, x, y + rh) : g.createLinearGradient(x, y, x + cw, y);
          gr.addColorStop(0, "#8a5a2c");
          gr.addColorStop(0.45, over ? "#d9a35e" : "#c48c4a");
          gr.addColorStop(1, "#7a4b22");
          g.fillStyle = gr;
          if (over) g.fillRect(x + 1, y + 2, cw - 2, rh - 4);
          else g.fillRect(x + 2, y + 1, cw - 4, rh - 2);
          g.fillStyle = "rgba(255,240,200," + (0.05 + rnd() * 0.1) + ")";
          g.fillRect(x + 3, y + 3, cw - 6, 2);
        }
      }
    };
    const weaveTex = canvasTex(256, 128, weaveDraw, 3, 1);
    const weaveBump = canvasTex(256, 128, weaveDraw, 3, 1);

    const glowTex = canvasTex(128, 128, (g, rnd, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, "rgba(255,255,255,0.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    const flameTex = canvasTex(64, 128, (g, rnd, w, h) => {
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, "#5ab8ff");
      gr.addColorStop(0.22, "#fff3b0");
      gr.addColorStop(0.55, "#ffb030");
      gr.addColorStop(1, "#ff5a1a");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });

    const PANELS = 12;
    const palette = [new THREE.Color(0xff7c66), new THREE.Color(0xfff0d2), new THREE.Color(0x67c2ff), new THREE.Color(0xfff0d2)];
    const envMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: fabricTex, bumpMap: fabricBump, bumpScale: 0.004, roughness: 0.62, side: THREE.DoubleSide });
    const leather = new THREE.MeshStandardMaterial({ color: 0x7a4626, roughness: 0.55 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xc89a4a, roughness: 0.35, metalness: 0.75 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x4a4e58, roughness: 0.45, metalness: 0.7 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.9 });
    const basketMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: weaveTex, bumpMap: weaveBump, bumpScale: 0.012, roughness: 0.85 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x9a6534, roughness: 0.8, map: weaveTex });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0xa8875a, roughness: 0.95, map: fabricTex, bumpMap: fabricBump, bumpScale: 0.01 });
    const flameMat = new THREE.MeshBasicMaterial({ map: flameTex, transparent: true, opacity: 0.92, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const fireGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xff9a3a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending });
    const innerGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffb060, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x5a1e2e, roughness: 0.4 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xff7f8f, roughness: 0.5 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.6 });

    const rope = (a, b, r = 0.012) => {
      const d = b.clone().sub(a);
      const m = mesh(new THREE.CylinderGeometry(r, r, d.length(), 6), ropeMat, false);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
      return m;
    };

    const root = new THREE.Group();
    const craft = new THREE.Group();
    root.add(craft);

    const envelope = new THREE.Group();
    envelope.position.y = 1.0;
    craft.add(envelope);
    const prof = [
      [0.2, 0.0],
      [0.26, 0.06],
      [0.42, 0.24],
      [0.68, 0.56],
      [0.9, 0.92],
      [1.0, 1.24],
      [1.02, 1.5],
      [0.95, 1.78],
      [0.78, 2.02],
      [0.5, 2.2],
      [0.2, 2.28],
      [0.0, 2.3]
    ];
    const profCurve = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y)));
    const envGeo = new THREE.LatheGeometry(profCurve.getPoints(90), PANELS * 10);
    const envBase = Float32Array.from(envGeo.attributes.position.array);
    {
      const pos = envGeo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const tmp = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        let a = Math.atan2(x, z);
        if (a < 0) a += Math.PI * 2;
        const f = (a / (Math.PI * 2)) * PANELS;
        const k = Math.floor(f) % PANELS;
        const d = f - Math.floor(f);
        const puff = Math.pow(Math.sin(d * Math.PI), 0.55);
        const mid = smooth(0.08, 0.5, y) * smooth(2.3, 1.9, y);
        const r = 0.968 + 0.032 * puff * mid + 0.032 * (1 - mid);
        pos.setXYZ(i, x * r, y, z * r);
        envBase[i * 3] = x * r;
        envBase[i * 3 + 2] = z * r;
        tmp.copy(palette[k % palette.length]);
        if (y > 2.08) tmp.set(0xff7c66);
        if (y < 0.3) tmp.set(0x67c2ff);
        const seam = smooth(0.06, 0.0, Math.min(d, 1 - d));
        const band = Math.abs(y - 0.3) < 0.035 || Math.abs(y - 2.08) < 0.03 ? 1 : 0;
        const dk = 1 - seam * 0.35 - band * 0.45;
        col[i * 3] = tmp.r * dk;
        col[i * 3 + 1] = tmp.g * dk;
        col[i * 3 + 2] = tmp.b * dk;
      }
      envGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      envGeo.computeVertexNormals();
    }
    const env = mesh(envGeo, envMat);
    envelope.add(env);
    const innerLight = new THREE.Sprite(innerGlow);
    innerLight.scale.set(1.3, 1.3, 1);
    innerLight.position.y = 0.4;
    envelope.add(innerLight);
    const crown = mesh(new THREE.TorusGeometry(0.16, 0.035, 12, 32), leather, false);
    crown.rotation.x = Math.PI / 2;
    crown.position.y = 2.29;
    envelope.add(crown);
    const crownCap = mesh(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), leather, false);
    crownCap.scale.y = 0.35;
    crownCap.position.y = 2.29;
    envelope.add(crownCap);
    const skirtRing = mesh(new THREE.TorusGeometry(0.205, 0.03, 12, 40), leather, false);
    skirtRing.rotation.x = Math.PI / 2;
    skirtRing.position.y = 0.01;
    envelope.add(skirtRing);
    const surfR = y => {
      let best = profCurve.getPoint(0);
      for (let i = 0; i <= 200; i++) {
        const p = profCurve.getPoint(i / 200);
        if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
      }
      return best.x;
    };
    const tassels = [];
    const flagCols = [0xffd23f, 0x4fc26a, 0xff5a6a, 0x5aa8ff, 0xb57bff, 0xff9a3a];
    const flagMats = flagCols.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, side: THREE.DoubleSide, map: fabricTex }));
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute("position", new THREE.Float32BufferAttribute([-0.055, 0, 0, 0.055, 0, 0, 0, -0.11, 0], 3));
    flagGeo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2));
    flagGeo.computeVertexNormals();
    const BY = 0.7;
    const bR = y => surfR(y) + 0.03;
    const pts = [];
    for (let k = 0; k <= PANELS * 6; k++) {
      const a = (k / (PANELS * 6)) * Math.PI * 2;
      const f = ((k % 6) / 6);
      const y = BY - Math.sin(f * Math.PI) * 0.09;
      const rr = bR(y);
      pts.push(V3(Math.sin(a) * rr, y, Math.cos(a) * rr));
    }
    envelope.userData.bunting = pts;
    const stringGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), PANELS * 12, 0.007, 5, true);
    envelope.add(mesh(stringGeo, ropeMat, false));
    for (let k = 0; k < PANELS * 3; k++) {
      const idx = k * 2 + 1;
      const p0 = pts[idx];
      const pv = new THREE.Group();
      pv.position.copy(p0);
      pv.rotation.y = Math.atan2(p0.x, p0.z);
      const fl = new THREE.Mesh(flagGeo, flagMats[k % flagMats.length]);
      fl.position.z = 0.004;
      pv.add(fl);
      envelope.add(pv);
      tassels.push(pv);
    }

    const faceY = 1.05;
    const fr = surfR(faceY) * 0.985;
    const eyes = [-1, 1].map(s => {
      const e = eye({ size: 0.95 });
      const x = 0.32 * s;
      e.g.position.set(x, faceY + 0.06, Math.sqrt(fr * fr - x * x) - 0.03);
      e.g.rotation.y = Math.atan2(x, fr) * 0.9;
      e.g.rotation.x = 0.06;
      envelope.add(e.g);
      return e;
    });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.1, 28), cheekMat);
      const x = 0.52 * s;
      const y = faceY - 0.18;
      const r = surfR(y);
      c.scale.set(1, 0.65, 1);
      c.position.set(x, y, Math.sqrt(Math.max(0, r * r - x * x)) + 0.012);
      c.rotation.y = Math.atan2(x, r);
      envelope.add(c);
    });
    const mY = faceY - 0.24;
    const mz = Math.sqrt(surfR(mY) ** 2) + 0.005;
    const smile = mesh(new THREE.TorusGeometry(0.09, 0.024, 12, 26, Math.PI), mouthMat, false);
    smile.rotation.set(0.32, 0, Math.PI);
    smile.position.set(0, mY + 0.03, mz - 0.01);
    envelope.add(smile);
    const openMouth = new THREE.Group();
    const om = mesh(new THREE.SphereGeometry(0.11, 24, 16), mouthMat, false);
    om.scale.set(1, 0.85, 0.35);
    openMouth.add(om);
    const tongue = mesh(new THREE.SphereGeometry(0.06, 16, 12), tongueMat, false);
    tongue.scale.set(1.1, 0.5, 0.5);
    tongue.position.set(0, -0.05, 0.02);
    openMouth.add(tongue);
    openMouth.position.set(0, mY - 0.01, mz - 0.025);
    openMouth.rotation.x = 0.3;
    openMouth.visible = false;
    envelope.add(openMouth);

    const burner = new THREE.Group();
    burner.position.y = 0.82;
    craft.add(burner);
    const frame = mesh(new THREE.TorusGeometry(0.17, 0.018, 10, 32), iron, false);
    frame.rotation.x = Math.PI / 2;
    burner.add(frame);
    [0, 1, 2, 3].forEach(k => {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      burner.add(rope(V3(Math.cos(a) * 0.17, 0, Math.sin(a) * 0.17), V3(0, -0.02, 0), 0.01));
    });
    const can = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.12, 20), brass, false);
    can.position.y = -0.03;
    burner.add(can);
    const nozzle = mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.05, 16), iron, false);
    nozzle.position.y = 0.05;
    burner.add(nozzle);
    const flame = new THREE.Group();
    flame.position.y = 0.08;
    burner.add(flame);
    const flameGeo = new THREE.LatheGeometry(
      [V3(0, 0, 0), V3(0.045, 0.02, 0), V3(0.06, 0.08, 0), V3(0.045, 0.16, 0), V3(0.018, 0.24, 0), V3(0, 0.28, 0)].map(v => new THREE.Vector2(v.x, v.y)),
      18
    );
    const flameOuter = new THREE.Mesh(flameGeo, flameMat);
    flame.add(flameOuter);
    const flameInner = new THREE.Mesh(flameGeo, flameMat);
    flameInner.scale.set(0.55, 0.7, 0.55);
    flame.add(flameInner);
    const flameGlow = new THREE.Sprite(fireGlow);
    flameGlow.scale.set(0.6, 0.6, 1);
    flameGlow.position.y = 0.12;
    flame.add(flameGlow);
    const fireLight = new THREE.PointLight(0xffa040, 0.6, 2.2);
    fireLight.position.y = 0.3;
    flame.add(fireLight);

    const basket = new THREE.Group();
    basket.position.y = 0.0;
    craft.add(basket);
    const BW = 0.36;
    const bGeo = new THREE.CylinderGeometry(BW, BW * 0.86, 0.44, 48, 6, true);
    {
      const p = bGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const z = p.getZ(i);
        const a = Math.atan2(z, x);
        const sq = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 4) + Math.pow(Math.abs(Math.sin(a)), 4), 0.25);
        const k = lerp(1, sq, 0.55);
        p.setX(i, x * k);
        p.setZ(i, z * k);
      }
      bGeo.computeVertexNormals();
    }
    const bm = mesh(bGeo, basketMat);
    bm.material.side = THREE.DoubleSide;
    bm.position.y = 0.27;
    basket.add(bm);
    const floor = mesh(new THREE.CylinderGeometry(BW * 0.86 * 1.12, BW * 0.86 * 1.12, 0.04, 4, 1), rimMat, false);
    floor.rotation.y = Math.PI / 4;
    floor.scale.set(0.98, 1, 0.98);
    floor.position.y = 0.06;
    basket.add(floor);
    const rimGeo = new THREE.TorusGeometry(BW * 1.06, 0.045, 12, 64);
    {
      const p = rimGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const a = Math.atan2(y, x);
        const sq = 1 / Math.pow(Math.pow(Math.abs(Math.cos(a)), 4) + Math.pow(Math.abs(Math.sin(a)), 4), 0.25);
        const k = lerp(1, sq, 0.55);
        p.setXY(i, x * k, y * k);
      }
      rimGeo.computeVertexNormals();
    }
    const rim = mesh(rimGeo, rimMat, false);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.49;
    basket.add(rim);
    const corners = [];
    [-1, 1].forEach(sx =>
      [-1, 1].forEach(sz => {
        const p = V3(sx * 0.33, 0.5, sz * 0.33);
        corners.push(p);
      })
    );
    const ropes = new THREE.Group();
    craft.add(ropes);
    corners.forEach(c => {
      const top = V3(c.x * 0.6, 0.98, c.z * 0.6);
      ropes.add(rope(c, top));
      ropes.add(rope(V3(c.x * 0.4, 0.82, c.z * 0.4), V3(0, 0.82, 0), 0.008));
    });
    const sacks = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.4 * s, 0.44, 0.05);
      pv.add(rope(V3(0, 0, 0), V3(0.02 * s, -0.14, 0), 0.008));
      const sack = mesh(new THREE.SphereGeometry(0.075, 20, 14), sackMat, false);
      sack.scale.set(1, 1.25, 0.9);
      sack.position.set(0.02 * s, -0.22, 0);
      pv.add(sack);
      const tie = mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 14), ropeMat, false);
      tie.rotation.x = Math.PI / 2;
      tie.position.set(0.02 * s, -0.14, 0);
      pv.add(tie);
      basket.add(pv);
      return pv;
    });

    const food = berry();
    food.visible = false;
    root.add(food);

    const envPos = envGeo.attributes.position;
    let lastDeflate = -1;

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const puff = action && action.name === "puff" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        const hungry = s.dying ? 1 : smooth(30, 8, hunger);
        let lift = lerp(0.42, 0.0, hungry) + Math.sin(t * 1.1) * 0.08 * motion * (1 - hungry);
        let burn = 0.55 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.05;
        let inflate = 0;
        let mouthOpen = false;
        let squint = false;
        let tiltX = 0;

        if (jump) {
          const p = jump.p;
          lift += Math.sin(Math.min(1, p / 0.85) * Math.PI) * 1.1;
          burn += smooth(0, 0.15, p) * (1 - smooth(0.4, 0.6, p)) * 1.1;
          tiltX = Math.sin(p * Math.PI * 2) * 0.06;
        }
        if (puff) {
          const p = puff.p;
          const k = smooth(0, 0.2, p) * (1 - smooth(0.6, 1, p));
          burn += k * 1.4;
          inflate = k;
          lift += k * 0.28;
          mouthOpen = p > 0.15 && p < 0.55;
        }
        if (eat) {
          food.visible = ph.visible;
          const target = V3(0, 1.0 + mY + lift, mz + 0.05);
          food.position.set(0, lerp(4.6, target.y, ph.fall * ph.fall), lerp(1.1, target.z, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          om.scale.y = 0.6 + ph.chew * 0.5;
        } else {
          food.visible = false;
          om.scale.y = 0.85;
        }
        burn *= 1 - hungry * 0.75;

        root.position.y = lift;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * 0.5;
        craft.rotation.z = Math.sin(t * 0.8) * 0.035 * motion;
        craft.rotation.x = tiltX + Math.sin(t * 0.6 + 1) * 0.02 * motion;
        basket.rotation.z = -craft.rotation.z * 0.6;

        const deflate = Math.round((hungry * (1 - inflate)) * 40) / 40;
        if (deflate !== lastDeflate) {
          lastDeflate = deflate;
          for (let i = 0; i < envPos.count; i++) {
            const bx = envBase[i * 3];
            const by = envBase[i * 3 + 1];
            const bz = envBase[i * 3 + 2];
            const a = Math.atan2(bx, bz);
            const h = by / 2.3;
            const wr = 1 + deflate * (0.06 * Math.sin(a * 6 + 0.5) + 0.04 * Math.sin(a * 11)) * h * h;
            envPos.setXYZ(i, bx * wr, by - deflate * 0.3 * h * h * h * (0.6 + 0.4 * Math.cos(a * 2)), bz * wr);
          }
          envPos.needsUpdate = true;
          envGeo.computeVertexNormals();
        }
        const dfl = hungry * (1 - inflate);
        const sc = (1 + inflate * 0.07 + Math.sin(t * 1.6) * 0.008 * motion) * (1 - dfl * 0.1);
        envelope.scale.set(sc, (1 + inflate * 0.05) * (1 - dfl * 0.2), sc);
        crown.position.y = 2.29 - deflate * 0.18;
        crownCap.position.y = crown.position.y;

        flame.scale.set(1.1 + burn * 0.5, 0.9 + burn * 1.4, 1.1 + burn * 0.5);
        flameGlow.material.opacity = 0.35 + burn * 0.35;
        fireLight.intensity = 0.3 + burn * 0.6;
        innerGlow.opacity = 0.1 + burn * 0.25;

        tassels.forEach((tp, i) => {
          tp.rotation.x = -0.15 + Math.sin(t * 2.4 + i * 0.7) * 0.18 * motion;
        });
        sacks.forEach((sp, i) => {
          sp.rotation.z = Math.sin(t * 1.5 + i * 1.7) * 0.18 * motion - craft.rotation.z;
        });

        const open = mouthOpen;
        smile.visible = !open;
        openMouth.visible = open;
        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.4 : hungry > 0.6 ? Math.min(blink, 0.55) : blink;
        });
        followPupils(eyes, pointer);
      }
    };
  }
});
