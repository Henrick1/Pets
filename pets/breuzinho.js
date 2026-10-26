Pets.register({
  id: "breuzinho",
  dex: 24,
  name: "Breuzinho",
  color: "#4a3a7a",
  types: ["dark"],
  evolvesTo: "eclipsar",
  evolveLevel: 16,
  description: "Uma sombra que se soltou de alguém e resolveu viver por conta própria. Nunca sai de cima da própria poça e, quando se assusta, mergulha nela até sobrar só o brilho dos olhos.",
  actions: {
    jump: { duration: 1.0 },
    eat: { duration: 2.4 },
    sink: { duration: 2.4 }
  },
  idle: [
    { action: "sink", min: 30, max: 60 },
    { action: "jump", min: 25, max: 50 }
  ],
  clickAction: n => ["jump", "sink", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let sd = 7;
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

    const smokeTex = canvasTex(512, 512, (g, rnd, w, h) => {
      g.fillStyle = "#1a1430";
      g.fillRect(0, 0, w, h);
      const blob = (x, y, r, col, a) => {
        [-w, 0, w].forEach(ox =>
          [-h, 0, h].forEach(oy => {
            const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
            gr.addColorStop(0, col.replace("A", a));
            gr.addColorStop(1, col.replace("A", 0));
            g.fillStyle = gr;
            g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
          })
        );
      };
      for (let i = 0; i < 70; i++) blob(rnd() * w, rnd() * h, 30 + rnd() * 90, rnd() < 0.6 ? "rgba(58,38,110,A)" : "rgba(30,20,58,A)", 0.4);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = "rgba(120,90,200," + (0.06 + rnd() * 0.1) + ")";
        g.lineWidth = 2 + rnd() * 5;
        g.lineCap = "round";
        let x = rnd() * w;
        let y = rnd() * h;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) {
          const nx = x + (rnd() - 0.5) * 120;
          const ny = y - 20 - rnd() * 50;
          g.quadraticCurveTo(x + (rnd() - 0.5) * 80, (y + ny) / 2, nx, ny);
          x = nx;
          y = ny;
        }
        g.stroke();
      }
      for (let i = 0; i < 120; i++) {
        g.fillStyle = "rgba(190,170,255," + rnd() * 0.25 + ")";
        g.beginPath();
        g.arc(rnd() * w, rnd() * h, rnd() * 1.6, 0, Math.PI * 2);
        g.fill();
      }
    }, 2, 1);

    const glowTex = canvasTex(128, 128, (g, rnd, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.25, "rgba(255,255,255,0.55)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });

    const puddleTex = canvasTex(256, 256, (g, rnd, w) => {
      const c = w / 2;
      g.clearRect(0, 0, w, w);
      g.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const r = c * (0.8 + 0.06 * Math.sin(a * 5 + 1) + 0.04 * Math.sin(a * 9 + 2.4) + 0.03 * Math.sin(a * 14));
        g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
      }
      g.closePath();
      g.save();
      g.clip();
      const gr = g.createRadialGradient(c, c, 0, c, c, c * 0.92);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.75, "rgba(255,255,255,0.92)");
      gr.addColorStop(1, "rgba(255,255,255,0.15)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
      g.restore();
    });

    const uniforms = { uTime: { value: 0 }, uWobble: { value: 1 } };
    const rimShader = (m, opt) => {
      m.onBeforeCompile = sh => {
        sh.uniforms.uTime = uniforms.uTime;
        sh.uniforms.uWobble = uniforms.uWobble;
        sh.vertexShader = sh.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uWobble;\nvarying vec3 vRimN;\nvarying vec3 vRimV;")
          .replace(
            "#include <begin_vertex>",
            "#include <begin_vertex>\n" +
              (opt.wobble
                ? "float wa = atan(position.z, position.x);\ntransformed += normal * (sin(position.y * 7.0 - uTime * 2.2 + wa * 3.0) * 0.018 + sin(position.y * 13.0 + uTime * 3.1 - wa * 2.0) * 0.008) * uWobble * smoothstep(0.05, 0.4, position.y);\n"
                : "")
          )
          .replace("#include <project_vertex>", "#include <project_vertex>\nvRimN = normalize(normalMatrix * objectNormal);\nvRimV = normalize(-mvPosition.xyz);");
        sh.fragmentShader = sh.fragmentShader
          .replace("#include <common>", "#include <common>\nvarying vec3 vRimN;\nvarying vec3 vRimV;")
          .replace(
            "#include <emissivemap_fragment>",
            "#include <emissivemap_fragment>\nfloat rimK = pow(1.0 - clamp(dot(normalize(vRimN), normalize(vRimV)), 0.0, 1.0), 2.6);\ntotalEmissiveRadiance += vec3(0.42, 0.28, 0.95) * rimK * " + opt.rim.toFixed(2) + ";"
          );
      };
      m.customProgramCacheKey = () => "breuzinho-" + (opt.wobble ? "w" : "s") + opt.rim;
      return m;
    };

    const shadowMat = rimShader(
      new THREE.MeshStandardMaterial({ color: 0x7a70a8, map: smokeTex, roughness: 0.28, metalness: 0.2, emissive: 0x12082a, emissiveIntensity: 0.5 }),
      { wobble: true, rim: 0.6 }
    );
    const wispMat = rimShader(
      new THREE.MeshStandardMaterial({ color: 0x7a70a8, map: smokeTex, roughness: 0.3, metalness: 0.15, emissive: 0x12082a, emissiveIntensity: 0.5 }),
      { wobble: false, rim: 0.8 }
    );
    const puddleMat = new THREE.MeshStandardMaterial({ color: 0x1b1430, roughness: 0.15, metalness: 0.3, transparent: true, alphaMap: puddleTex, depthWrite: false, emissive: 0x150a2e, emissiveIntensity: 0.5 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0 });
    const irisMat = new THREE.MeshBasicMaterial({ color: 0xffc94a });
    const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffcf5a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    const violetGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0x9a6cff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0xc9a4ff });
    const mouthIn = new THREE.MeshBasicMaterial({ color: 0x07040e });

    const tube = (pts, r0, r1, seg = 32, rad = 14) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const frames = curve.computeFrenetFrames(seg, false);
      const pos = [];
      const uv = [];
      const idx = [];
      for (let i = 0; i <= seg; i++) {
        const f = i / seg;
        const p = curve.getPointAt(f);
        const r = lerp(r0, r1, Math.pow(f, 0.9)) * (i === seg ? 0.0 : 1);
        for (let j = 0; j <= rad; j++) {
          const a = (j / rad) * Math.PI * 2;
          const n = frames.normals[i].clone().multiplyScalar(Math.cos(a)).add(frames.binormals[i].clone().multiplyScalar(Math.sin(a)));
          pos.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r);
          uv.push(j / rad, f);
        }
      }
      for (let i = 0; i < seg; i++)
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      return g;
    };

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);
    const ground = new THREE.Group();
    root.add(ground);

    const prof = [
      [1.02, 0.0],
      [0.86, 0.05],
      [0.74, 0.14],
      [0.7, 0.3],
      [0.74, 0.55],
      [0.77, 0.82],
      [0.73, 1.08],
      [0.62, 1.3],
      [0.46, 1.48],
      [0.28, 1.62],
      [0.1, 1.71],
      [0.0, 1.73]
    ];
    const profCurve = new THREE.SplineCurve(prof.map(([x, y]) => new THREE.Vector2(x, y)));
    const bodyGeo = new THREE.LatheGeometry(profCurve.getPoints(80), 96);
    {
      const pos = bodyGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const a = Math.atan2(z, x);
        const drip = 1 + (0.06 * Math.sin(a * 5 + 0.7) + 0.035 * Math.sin(a * 9 + 2)) * smooth(0.35, 0.0, y);
        pos.setXYZ(i, x * drip, y, z * drip * 0.92 + 0.02 * smooth(0.6, 1.4, y));
      }
      bodyGeo.computeVertexNormals();
    }
    const body = mesh(bodyGeo, shadowMat);
    squash.add(body);
    const bodyAura = new THREE.Sprite(violetGlow);
    bodyAura.scale.set(3.4, 3.4, 1);
    bodyAura.position.set(0, 0.9, -0.35);
    squash.add(bodyAura);

    const wisps = [
      { pts: [V3(0, 1.5, 0), V3(0.05, 1.78, -0.02), V3(0.0, 2.02, -0.08), V3(-0.16, 2.14, -0.1), V3(-0.27, 2.06, -0.06), V3(-0.22, 1.96, -0.02)], r0: 0.3, r1: 0.03, ph: 0 },
      { pts: [V3(0.12, 1.55, -0.12), V3(0.24, 1.76, -0.2), V3(0.3, 1.92, -0.26), V3(0.24, 2.0, -0.26)], r0: 0.17, r1: 0.02, ph: 1.7 },
      { pts: [V3(-0.16, 1.5, -0.14), V3(-0.3, 1.66, -0.2), V3(-0.4, 1.78, -0.22), V3(-0.36, 1.86, -0.2)], r0: 0.13, r1: 0.02, ph: 3.1 }
    ].map(w => {
      const pv = new THREE.Group();
      pv.position.copy(w.pts[0]);
      const g = tube(w.pts.map(p => p.clone().sub(w.pts[0])), w.r0, w.r1, 40, 16);
      const m = mesh(g, wispMat, false);
      pv.add(m);
      squash.add(pv);
      return { pv, ph: w.ph };
    });

    const arms = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.6 * s, 0.66, 0.16);
      const g = tube([V3(-0.06 * s, 0.04, -0.02), V3(0.12 * s, -0.04, 0.03), V3(0.2 * s, -0.17, 0.08), V3(0.21 * s, -0.25, 0.1)], 0.17, 0.1, 28, 18);
      pv.add(mesh(g, wispMat, false));
      const tip = mesh(new THREE.SphereGeometry(0.1, 24, 16), wispMat, false);
      tip.scale.set(1, 0.85, 1);
      tip.position.set(0.21 * s, -0.25, 0.1);
      pv.add(tip);
      squash.add(pv);
      return { pv, s };
    });

    const profPts = profCurve.getPoints(400);
    const faceZ = y => {
      let best = profPts[0];
      profPts.forEach(p => {
        if (Math.abs(p.y - y) < Math.abs(best.y - y)) best = p;
      });
      return best.x;
    };
    const eyeShape = (w, h) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w, 0);
      sh.bezierCurveTo(-w * 0.6, h * 1.05, w * 0.6, h * 1.05, w, h * 0.15);
      sh.bezierCurveTo(w * 0.55, -h * 0.85, -w * 0.6, -h * 0.75, -w, 0);
      const g = new THREE.ShapeGeometry(sh, 24);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, -((p.getX(i) * p.getX(i)) / (w * w)) * 0.05);
      return g;
    };
    const eyesG = new THREE.Group();
    squash.add(eyesG);
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      const y = 1.02;
      const x = 0.27 * s;
      const r = faceZ(y);
      const z = Math.sqrt(Math.max(0, r * r - x * x)) * 0.92 + 0.02;
      g.position.set(x, y, z + 0.035);
      g.rotation.set(-0.05, Math.atan2(x, z) * 0.9, 0);
      const inner = new THREE.Group();
      g.add(inner);
      const wg = eyeShape(0.18, 0.15);
      if (s < 0) {
        wg.scale(-1, 1, 1);
        wg.index.array.reverse();
      }
      const white = new THREE.Mesh(wg, eyeMat);
      white.rotation.z = -0.22 * s;
      inner.add(white);
      const iris = new THREE.Mesh(new THREE.CircleGeometry(0.068, 28), irisMat);
      iris.position.set(0.02 * s, 0.01, 0.003);
      inner.add(iris);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.03, 18), mouthIn);
      pupil.scale.set(0.55, 1.3, 1);
      pupil.position.set(0, 0, 0.002);
      iris.add(pupil);
      iris.userData.bx = 0.02 * s;
      const halo = new THREE.Sprite(glowMat);
      halo.scale.set(0.8, 0.62, 1);
      halo.position.z = 0.02;
      g.add(halo);
      eyesG.add(g);
      return { g, iris, halo };
    });

    const mouthY = 0.8;
    const mr = faceZ(mouthY);
    const smile = mesh(new THREE.TorusGeometry(0.075, 0.016, 10, 28, Math.PI * 0.85), mouthMat, false);
    smile.rotation.z = Math.PI + Math.PI * 0.075;
    smile.position.set(0, mouthY + 0.03, mr * 0.92 + 0.015);
    smile.rotation.x = -0.15;
    squash.add(smile);
    const openMouth = new THREE.Group();
    const om = new THREE.Mesh(new THREE.CircleGeometry(0.08, 28), mouthIn);
    om.scale.set(1.1, 0.8, 1);
    openMouth.add(om);
    const omRim = mesh(new THREE.TorusGeometry(0.083, 0.012, 8, 32), mouthMat, false);
    omRim.scale.set(1.1, 0.8, 1);
    openMouth.add(omRim);
    openMouth.position.set(0, mouthY, mr * 0.92 + 0.02);
    openMouth.rotation.x = -0.15;
    openMouth.visible = false;
    squash.add(openMouth);

    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.75, 64), puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.y = 0.012;
    ground.add(puddle);
    const puddleSheen = new THREE.Sprite(violetGlow);
    puddleSheen.scale.set(2.6, 0.7, 1);
    puddleSheen.position.set(0, 0.05, 0.3);
    ground.add(puddleSheen);
    const rippleMat = new THREE.MeshBasicMaterial({ color: 0x8a6ae0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const ripple = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 64), rippleMat);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.y = 0.02;
    ground.add(ripple);
    const puddleEyes = [-1, 1].map(s => {
      const sp = new THREE.Sprite(glowMat.clone());
      sp.material.opacity = 0;
      sp.scale.set(0.5, 0.3, 1);
      sp.position.set(0.22 * s, 0.06, 0.55);
      ground.add(sp);
      return sp;
    });

    const motes = [];
    for (let i = 0; i < 9; i++) {
      const m = mesh(new THREE.SphereGeometry(0.05 + (i % 3) * 0.02, 12, 10), wispMat, false);
      ground.add(m);
      motes.push({ m, a: i * 2.4, ph: (i * 0.37) % 1, r: 0.75 + (i % 4) * 0.18 });
    }

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        uniforms.uTime.value = t;
        uniforms.uWobble.value = motion;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const sink = action && action.name === "sink" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 1.8) * 0.03 * motion;
        let sxz = 1;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;
        let melt = 0;
        let splash = 0;

        if (jump) {
          const p = jump.p;
          if (p < 0.2) sy = 1 - 0.25 * Math.sin((p / 0.2) * Math.PI / 2);
          else if (p < 0.75) {
            const q = (p - 0.2) / 0.55;
            y = Math.sin(q * Math.PI) * 1.15;
            sy = 1 + 0.18 * Math.cos(q * Math.PI);
            airborne = true;
          } else {
            const q = (p - 0.75) / 0.25;
            sy = 1 - 0.24 * Math.sin(q * Math.PI);
            splash = 1 - q;
          }
        }
        if (sink) {
          const p = sink.p;
          const down = smooth(0.0, 0.3, p);
          const up = smooth(0.62, 0.9, p);
          melt = down * (1 - up);
          sy = lerp(sy, 0.06, melt);
          sxz = 1 + melt * 0.35;
          if (p > 0.82) {
            const q = (p - 0.82) / 0.18;
            sy *= 1 + Math.sin(q * Math.PI) * 0.18;
          }
          splash = Math.max(splash, smooth(0.6, 0.75, p) * (1 - smooth(0.8, 1, p)));
        }
        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.1 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.2, mouthY, ph.fall * ph.fall), lerp(0.7, mr + 0.08, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          om.scale.y = 0.5 + ph.chew * 0.6;
        } else {
          food.visible = false;
          om.scale.y = 0.8;
        }

        const hs = sxz / Math.sqrt(Math.max(sy, 0.75));
        squash.scale.set(hs, sy, hs);
        root.position.y = y;
        ground.position.y = -y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * (1 - melt);
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.1) * 0.035 * motion;

        const pk = 1 - smooth(0, 0.6, y);
        puddle.scale.setScalar((0.86 + pk * 0.14) * (1 + melt * 0.25) * (1 + Math.sin(t * 1.4) * 0.015 * motion));
        puddleSheen.material.opacity = 0.35;
        ripple.visible = splash > 0.01;
        ripple.material.opacity = splash * 0.5;
        ripple.scale.setScalar(1 + (1 - splash) * 0.9);

        const eyesOn = melt < 0.55;
        eyesG.visible = eyesOn;
        puddleEyes.forEach(e => {
          e.material.opacity = smooth(0.5, 0.85, melt) * (1.4 + Math.sin(t * 6) * 0.15);
        });

        smile.visible = !(airborne || mouthOpen) && eyesOn;
        openMouth.visible = (airborne || mouthOpen) && eyesOn;

        eyes.forEach(({ g, iris, halo }) => {
          g.scale.y = airborne ? 1.12 : squint ? 0.35 : blink;
          iris.position.x = lerp(iris.position.x, iris.userData.bx + pointer.x * 0.035, 0.15);
          iris.position.y = lerp(iris.position.y, 0.01 + pointer.y * 0.03, 0.15);
          halo.material.opacity = 0.45 + Math.sin(t * 2.4) * 0.08;
        });

        wisps.forEach(({ pv, ph: wp }, i) => {
          const k = jump ? Math.sin(t * 16 + wp) * 0.25 : 0;
          pv.rotation.z = Math.sin(t * 1.7 + wp) * 0.12 * motion + k;
          pv.rotation.x = Math.sin(t * 1.3 + wp * 1.3) * 0.08 * motion - (airborne ? 0.35 : 0) * (i === 0 ? 1 : 0.5);
        });
        arms.forEach(({ pv, s: sd }) => {
          const target = airborne ? 1.4 : eat ? 0.9 : 0.15 + Math.sin(t * 2.2 + sd) * 0.1 * motion;
          pv.rotation.z = lerp(pv.rotation.z, target * sd, 0.18);
        });

        motes.forEach(mo => {
          const u = (((t * 0.22 + mo.ph) % 1) + 1) % 1;
          const a = mo.a + t * 0.3;
          mo.m.visible = !reduceMotion;
          mo.m.position.set(Math.cos(a) * mo.r * (1 - u * 0.3), u * 2.2, Math.sin(a) * mo.r * 0.7);
          mo.m.scale.setScalar(Math.sin(u * Math.PI) * (0.8 + melt * 0.6));
        });
      }
    };
  }
});
