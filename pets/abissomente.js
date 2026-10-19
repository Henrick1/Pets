Pets.register({
  id: "abissomente",
  dex: 17,
  name: "Abissomente",
  color: "#4a4ab8",
  types: ["psychic", "water"],
  description: "Um polvo colossal vindo das fossas mais escuras do oceano. O manto enorme guarda um cérebro que brilha como uma lanterna, os tentáculos se desfazem em fios de luz nas pontas e o terceiro olho de cristal ergue rochas inteiras ao seu redor.",
  actions: {
    jump: { duration: 1.1 },
    eat: { duration: 2.4 },
    lift: { duration: 3.4 },
    blast: { duration: 2.4 }
  },
  idle: [
    { action: "lift", min: 25, max: 50 },
    { action: "blast", min: 40, max: 80 }
  ],
  clickAction: n => ["blast", "lift", "jump", "blast"][(n - 1) % 4],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const taper = (pts, rf, radial, segs) => {
      const curve = new THREE.CatmullRomCurve3(pts);
      const g = new THREE.TubeGeometry(curve, segs, 1, radial, false);
      const pos = g.attributes.position;
      const c = V3(0, 0, 0);
      const p = V3(0, 0, 0);
      for (let i = 0; i <= segs; i++) {
        curve.getPointAt(i / segs, c);
        const r = rf(i / segs);
        for (let j = 0; j <= radial; j++) {
          const k = i * (radial + 1) + j;
          p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
          pos.setXYZ(k, p.x, p.y, p.z);
        }
      }
      g.computeVertexNormals();
      return { g, curve };
    };
    const hexParts = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);

    const root = new THREE.Group();
    const floatG = new THREE.Group();
    floatG.scale.setScalar(1.05);
    root.add(floatG);

    const HOVER = 1.45;

    const skinTex = (() => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = 256;
      c.height = 256;
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, 256, 256);
      let sd = 7;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };
      for (let i = 0; i < 220; i++) {
        const x = rnd() * 256;
        const y = rnd() * 256;
        const r = 2 + rnd() * 9;
        g.fillStyle = "rgba(60,40,140," + (0.08 + rnd() * 0.16) + ")";
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(3, 3);
      return t;
    })();

    const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.9, clearcoatRoughness: 0.25, map: skinTex, bumpMap: skinTex, bumpScale: 0.006, emissive: 0x1a1460, emissiveIntensity: 0.25 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x6a6af0, roughness: 0.05, transparent: true, opacity: 0.5, clearcoat: 1, emissive: 0x3a3ac8, emissiveIntensity: 0.25, side: THREE.DoubleSide, depthWrite: false });
    const brainMat = new THREE.MeshStandardMaterial({ color: 0xd88aff, roughness: 0.45, emissive: 0xa04aff, emissiveIntensity: 0.5 });
    const spotMat = new THREE.MeshBasicMaterial({ color: 0xffe27a });
    const underMat = new THREE.MeshStandardMaterial({ color: 0xe8c8ff, roughness: 0.4, emissive: 0x8a4ad8, emissiveIntensity: 0.2 });
    const webMat = new THREE.MeshPhysicalMaterial({ color: 0x5a4ad8, roughness: 0.3, transparent: true, opacity: 0.55, side: THREE.DoubleSide, emissive: 0x2a1a8a, emissiveIntensity: 0.3, depthWrite: false });

    const paint = (geo, fn) => {
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
        col[i * 3] = c[0];
        col[i * 3 + 1] = c[1];
        col[i * 3 + 2] = c[2];
      }
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return geo;
    };
    const TOP = hexParts(0x2a2a8a);
    const MID = hexParts(0x5a5ae0);
    const BOT = hexParts(0x9a9aff);
    const grad = (y, y0, y1) => {
      const k = smooth(y0, y1, y);
      return k < 0.5 ? [0, 1, 2].map(j => lerp(BOT[j], MID[j], k * 2)) : [0, 1, 2].map(j => lerp(MID[j], TOP[j], (k - 0.5) * 2));
    };

    const head = new THREE.Group();
    head.position.y = HOVER;
    floatG.add(head);

    const PROFILE = [[0.001, -0.6], [0.3, -0.57], [0.47, -0.44], [0.56, -0.22], [0.57, -0.02], [0.52, 0.17], [0.5, 0.3], [0.57, 0.5], [0.63, 0.75], [0.63, 1.0], [0.55, 1.22], [0.35, 1.38], [0.001, 1.44]];
    const SEAM = 0.3;
    const bend = (x, y, z) => {
      const k = Math.max(0, y - 0.2) / 1.1;
      return [x, y - k * k * 0.02, z - k * k * 0.04];
    };
    const latheFrom = (fromY, toY) => {
      const pts = [];
      const N = 60;
      const curve = new THREE.SplineCurve(PROFILE.map(([r, y]) => new THREE.Vector2(r, y)));
      const all = curve.getPoints(N * 3);
      all.forEach(v => {
        if (v.y >= fromY - 1e-4 && v.y <= toY + 1e-4) pts.push(new THREE.Vector2(Math.max(0.001, v.x), v.y));
      });
      const g = new THREE.LatheGeometry(pts, 56);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const [x, y, z] = bend(pos.getX(i), pos.getY(i), pos.getZ(i));
        pos.setXYZ(i, x, y, z);
      }
      g.computeVertexNormals();
      return g;
    };
    const bodyG = new THREE.Group();
    head.add(bodyG);
    const lowerGeo = paint(latheFrom(-0.7, SEAM), (x, y) => grad(y, -0.55, 0.45));
    const lower = mesh(lowerGeo, skin);
    bodyG.add(lower);
    const upperGlass = mesh(latheFrom(SEAM, 1.7), glassMat, false);
    upperGlass.renderOrder = 2;
    bodyG.add(upperGlass);
    const floor = mesh(new THREE.CircleGeometry(0.5, 48), new THREE.MeshStandardMaterial({ color: 0x3a2a8a, roughness: 0.6, emissive: 0x4a2ab0, emissiveIntensity: 0.35 }), false);
    floor.rotation.x = -Math.PI / 2;
    {
      const [x, y, z] = bend(0, SEAM - 0.02, 0);
      floor.position.set(x, y, z);
    }
    bodyG.add(floor);

    const seamRing = mesh(new THREE.TorusGeometry(0.5, 0.045, 14, 56), new THREE.MeshPhysicalMaterial({ color: 0x6f6cf0, roughness: 0.3, clearcoat: 0.9, emissive: 0x2a20a0, emissiveIntensity: 0.35 }), false);
    seamRing.rotation.x = Math.PI / 2;
    {
      const [x, y, z] = bend(0, SEAM, 0);
      seamRing.position.set(x, y, z);
    }
    bodyG.add(seamRing);

    const brain = new THREE.Group();
    {
      const [x, y, z] = bend(0, 0.86, 0);
      brain.position.set(x, y, z);
      brain.scale.setScalar(1.45);
    }
    brain.rotation.x = -0.05;
    bodyG.add(brain);
    {
      const [bx, by, bz] = bend(0, SEAM - 0.02, 0);
      const [tx, ty, tz] = bend(0, 0.7, 0);
      const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(bx, by, bz), new THREE.Vector3(bx, by + 0.15, bz + 0.02), new THREE.Vector3(tx, ty, tz)]);
      const stemGeo = new THREE.TubeGeometry(stemCurve, 20, 0.085, 16, false);
      const sp = stemGeo.attributes.position;
      for (let i = 0; i < sp.count; i++) {
        const y = sp.getY(i);
        const f = 1 + 0.6 * Math.max(0, 1 - (y - by) / 0.12);
        sp.setX(i, bx + (sp.getX(i) - bx) * f);
        sp.setZ(i, bz + (sp.getZ(i) - bz) * f);
      }
      stemGeo.computeVertexNormals();
      bodyG.add(mesh(stemGeo, brainMat, false));
      const nerveMat = new THREE.MeshStandardMaterial({ color: 0xe0b0ff, roughness: 0.4, emissive: 0xb060ff, emissiveIntensity: 0.9 });
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI * 2 + 0.5;
        const ca = Math.cos(a), sa = Math.sin(a);
        const pts = [
          new THREE.Vector3(bx + ca * 0.46, by + 0.01, bz + sa * 0.46),
          new THREE.Vector3(bx + ca * 0.34, by + 0.12, bz + sa * 0.34),
          new THREE.Vector3(bx + ca * 0.2, by + 0.3, bz + sa * 0.2),
          new THREE.Vector3(tx + ca * 0.12, ty + 0.02, tz + sa * 0.12)
        ];
        bodyG.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.016, 6, false), nerveMat, false));
      }
    }
    [-1, 1].forEach(s => {
      const lobeGeo = new THREE.SphereGeometry(0.26, 32, 24);
      const pos = lobeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);
        const n = 1 + 0.07 * Math.sin(y * 34 + Math.sin(z * 26) * 2) * Math.cos(z * 20 + x * 12);
        pos.setXYZ(i, x * n, y * n, z * n);
      }
      lobeGeo.computeVertexNormals();
      const lobe = mesh(lobeGeo, brainMat, false);
      lobe.scale.set(0.82, 1.0, 1.25);
      lobe.position.x = 0.14 * s;
      brain.add(lobe);
    });
    const brainLight = new THREE.PointLight(0xc08aff, 0.6, 2.5);
    brain.add(brainLight);

    const spots = [];
    for (let k = 0; k < 26; k++) {
      const th = k * 2.399;
      const yy = -0.4 + (k / 26) * 1.85;
      let rr = 0;
      for (let j = 0; j < PROFILE.length - 1; j++) {
        const [r0, y0] = PROFILE[j];
        const [r1, y1] = PROFILE[j + 1];
        if (yy >= y0 && yy <= y1) rr = lerp(r0, r1, (yy - y0) / (y1 - y0));
      }
      const [x, y, z] = bend(Math.cos(th) * rr * 1.015, yy, Math.sin(th) * rr * 1.015);
      if (z > 0.3 && yy > -0.25 && yy < 0.25) continue;
      const sp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), spotMat);
      sp.position.set(x, y, z);
      bodyG.add(sp);
      spots.push({ m: sp, ph: k * 0.7 });
    }

    const eyes = [];
    const turrets = [-1, 1].map(s => {
      const tg = new THREE.Group();
      tg.position.set(0.42 * s, 0.1, 0.32);
      head.add(tg);
      const tur = mesh(new THREE.SphereGeometry(0.2, 28, 20), skin);
      tur.geometry = paint(new THREE.SphereGeometry(0.2, 28, 20), (x, y) => grad(y, -0.2, 0.25));
      tur.scale.set(0.9, 1.0, 0.95);
      tg.add(tur);
      const e = eye({ size: 0.8, whiteColor: 0xfff2b8, pupilColor: 0x0a0820 });
      e.pupil.scale.set(1.35, 0.6, 0.5);
      e.g.position.set(0.03 * s, 0.02, 0.15);
      e.g.rotation.y = 0.45 * s;
      tg.add(e.g);
      const lidGeo = paint(new THREE.SphereGeometry(0.176, 32, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), () => TOP);
      const lid = mesh(lidGeo, skin, false);
      lid.scale.set(1.1, 1.2, 0.72);
      e.g.add(lid);
      eyes.push(e);
      return { tg, lid, s };
    });

    const third = new THREE.Group();
    third.position.set(0, 0.2, 0.53);
    head.add(third);
    const socket = mesh(new THREE.TorusGeometry(0.075, 0.022, 10, 24), new THREE.MeshStandardMaterial({ color: 0xffd86a, roughness: 0.25, metalness: 0.7 }), false);
    third.add(socket);
    const gemMat = new THREE.MeshStandardMaterial({ color: 0xfff4a8, emissive: 0xffc83a, emissiveIntensity: 0.9, roughness: 0.05, flatShading: true });
    const gem = mesh(new THREE.OctahedronGeometry(0.075, 0), gemMat, false);
    gem.scale.set(0.75, 1.15, 0.55);
    third.add(gem);

    const beak = new THREE.Group();
    beak.position.set(0, -0.54, 0.02);
    beak.scale.setScalar(1.7);
    head.add(beak);
    const lip = mesh(new THREE.TorusGeometry(0.13, 0.055, 14, 32), new THREE.MeshPhysicalMaterial({ color: 0x9a6ae8, roughness: 0.35, clearcoat: 0.6, emissive: 0x3a1a8a, emissiveIntensity: 0.3 }), false);
    lip.rotation.x = Math.PI / 2;
    lip.scale.set(1, 1, 0.8);
    beak.add(lip);
    const gullet = mesh(new THREE.CircleGeometry(0.13, 28), new THREE.MeshStandardMaterial({ color: 0x1a0a30, roughness: 0.8 }), false);
    gullet.rotation.x = Math.PI / 2;
    gullet.position.y = 0.01;
    beak.add(gullet);
    const jawMat = new THREE.MeshPhysicalMaterial({ color: 0x24183a, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.1 });
    const jaws = [-1, 1].map(s => {
      const h = 0.2;
      const g = new THREE.ConeGeometry(0.075, h, 20, 10);
      g.rotateX(Math.PI);
      g.translate(0, -h / 2, 0);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const t = -pos.getY(i) / h;
        pos.setX(i, pos.getX(i) * 0.8 - s * t * t * 0.09);
        pos.setZ(i, pos.getZ(i) * 0.75);
      }
      g.computeVertexNormals();
      const j = mesh(g, jawMat, false);
      j.position.set(s * 0.05, 0.02, 0);
      j.rotation.z = s * 0.12;
      beak.add(j);
      return { j, s };
    });

    const NT = 8;
    const TS = 9;
    const tentacles = [];
    for (let k = 0; k < NT; k++) {
      const a = (k / NT) * Math.PI * 2 + Math.PI / NT;
      const pts = [];
      for (let i = 0; i < TS; i++) pts.push(V3(0, 0, 0));
      const m = mesh(new THREE.BufferGeometry(), skin);
      m.frustumCulled = false;
      floatG.add(m);
      const suckers = [];
      for (let j = 0; j < 7; j++) {
        const sk = mesh(new THREE.TorusGeometry(0.032, 0.012, 6, 14), underMat, false);
        floatG.add(sk);
        suckers.push(sk);
      }
      const strands = [0, 1, 2].map(j => {
        const sm = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: [0x9ffcff, 0xffe27a, 0xd8a8ff][j], transparent: true, opacity: 0.85 }));
        sm.frustumCulled = false;
        floatG.add(sm);
        return { m: sm, j, pts: [V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0), V3(0, 0, 0)] };
      });
      const tipGlow = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff4c8 }));
      floatG.add(tipGlow);
      tentacles.push({ a, pts, m, suckers, strands, tipGlow, ph: k * 0.83, len: 1.55 + (k % 2) * 0.2 });
    }
    const web = mesh(new THREE.BufferGeometry(), webMat, false);
    web.frustumCulled = false;
    floatG.add(web);

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a5470, roughness: 0.85, emissive: 0x6a3ad8, emissiveIntensity: 0.0 });
    const rocks = [];
    for (let k = 0; k < 5; k++) {
      const g = new THREE.DodecahedronGeometry(0.16 + (k % 3) * 0.06, 1);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const n = 1 + Math.sin(pos.getX(i) * 13 + k) * Math.cos(pos.getY(i) * 11) * 0.12;
        pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * 0.8, pos.getZ(i) * n);
      }
      g.computeVertexNormals();
      const r = mesh(g, rockMat, false);
      r.visible = false;
      root.add(r);
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.3 + (k % 3) * 0.07, 14, 10), new THREE.MeshBasicMaterial({ color: 0xb08aff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      r.add(aura);
      const a = (k / 5) * Math.PI * 2 + 0.6;
      rocks.push({ r, aura, a, home: V3(Math.cos(a) * 1.25, 0.12, Math.sin(a) * 0.9 + 0.1), k });
    }
    const orbMat = new THREE.MeshPhysicalMaterial({ color: 0x9fdcff, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, emissive: 0x2a6ad8, emissiveIntensity: 0.3, depthWrite: false });
    const orbs = [];
    for (let k = 0; k < 6; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.08 + (k % 2) * 0.03, 16, 12), orbMat);
      floatG.add(m);
      orbs.push({ m, k, a: (k / 6) * Math.PI * 2 });
    }

    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.45, 3.2, 20, 1, true), beamMat);
    beam.geometry.translate(0, 1.6, 0);
    beam.geometry.rotateX(Math.PI / 2);
    beam.rotation.x = 0.18;
    third.add(beam);
    const beamCore = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.12, 3.2, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    beamCore.geometry.translate(0, 1.6, 0);
    beamCore.geometry.rotateX(Math.PI / 2);
    beam.add(beamCore);
    const flare = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    third.add(flare);
    const waveMat = new THREE.MeshBasicMaterial({ color: 0xc8a8ff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
    const waves = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.02, 6, 64), waveMat.clone());
      m.rotation.x = Math.PI / 2;
      m.visible = false;
      floatG.add(m);
      return m;
    });
    const bubbleMat = new THREE.MeshPhysicalMaterial({ color: 0xd8f0ff, roughness: 0.05, transparent: true, opacity: 0.4, clearcoat: 1, depthWrite: false });
    const bubbles = [];
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (k % 3) * 0.015, 12, 10), bubbleMat);
      root.add(m);
      bubbles.push({ m, ph: k / 12, x: Math.sin(k * 2.7) * 1.1, z: Math.cos(k * 1.9) * 0.7, sp: 0.14 + (k % 4) * 0.035 });
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    root.add(shadow);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.32, 64), new THREE.MeshBasicMaterial({ color: 0xb08aff, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    root.add(ring);

    const food = berry();
    food.visible = false;
    root.add(food);

    const tmp = V3(0, 0, 0);
    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const lift = action && action.name === "lift" ? action : null;
        const bl = action && action.name === "blast" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const mind = s.dying ? 0.3 : 0.55 + 0.45 * Math.max(0, Math.min(1, hunger / 100));

        const swimT = t * 1.1;
        const stroke = Math.pow(Math.max(0, Math.sin(swimT)), 2);
        let y = Math.sin(swimT - 0.9) * 0.08 * motion + (s.dying ? -0.55 : 0);
        let squeeze = stroke * 0.45 * motion;
        let hop = 0;
        if (jump) {
          const p = jump.p;
          if (p < 0.2) squeeze = Math.max(squeeze, Math.sin((p / 0.2) * Math.PI / 2));
          else if (p < 0.8) {
            hop = Math.sin(((p - 0.2) / 0.6) * Math.PI);
            y += hop * 0.55;
            squeeze = 0;
          }
        }
        let focus = 0;
        if (lift) focus = smooth(0, 0.22, lift.p) * (1 - smooth(0.82, 1, lift.p));
        let charge = 0;
        let fire = 0;
        if (bl) {
          charge = smooth(0, 0.35, bl.p) * (1 - smooth(0.35, 0.42, bl.p));
          fire = smooth(0.38, 0.44, bl.p) * (1 - smooth(0.72, 0.95, bl.p));
        }
        root.rotation.y = lookYaw;
        floatG.position.y = y + focus * 0.25;
        floatG.rotation.x = lookPitch * 0.5 + Math.sin(swimT) * 0.035 * motion - charge * 0.12 + fire * 0.06;
        floatG.rotation.z = Math.sin(t * 0.6) * 0.04 * motion;

        bodyG.scale.set(1 - squeeze * 0.08 + fire * 0.04, 1 + squeeze * 0.1, 1 - squeeze * 0.08 + fire * 0.04);
        bodyG.rotation.x = Math.sin(swimT) * 0.05 * motion - focus * 0.08;
        brain.scale.setScalar(1.45 + focus * 0.06 + charge * 0.1 + Math.sin(t * 1.8) * 0.015);
        brainMat.emissiveIntensity = (0.4 + focus * 0.5 + charge * 0.6 + fire * 0.5 + Math.max(0, Math.sin(t * 2.4)) * 0.12) * mind;
        brainLight.intensity = (0.4 + focus * 0.8 + charge + fire) * mind;
        glassMat.emissiveIntensity = (0.2 + focus * 0.25 + fire * 0.3) * mind;
        skin.emissiveIntensity = (0.22 + focus * 0.15 + fire * 0.2) * mind;
        spots.forEach(sp => {
          const f = 0.5 + 0.5 * Math.sin(t * 2.5 + sp.ph);
          sp.m.scale.setScalar(0.6 + f * 0.7 + focus * 0.5 + fire * 0.5);
        });
        gem.rotation.y = t * 1.4;
        gem.scale.set(0.75 * (1 + charge * 0.6 + fire * 0.4), 1.15 * (1 + charge * 0.6 + fire * 0.4), 0.55);
        gemMat.emissiveIntensity = (0.8 + focus * 0.6 + charge * 1.4 + fire * 2) * mind;
        beamMat.opacity = fire * 0.9 * mind;
        beamCore.material.opacity = fire * mind;
        flare.material.opacity = (charge * 0.5 + fire * 0.7) * mind;
        flare.scale.setScalar(0.5 + charge * 0.8 + fire * 1.2 + Math.sin(t * 30) * 0.1 * fire);
        beam.visible = fire > 0.02;
        beam.scale.set(1 + Math.sin(t * 40) * 0.08 * fire, 1 + Math.sin(t * 40) * 0.08 * fire, 0.3 + fire * 0.7);

        head.rotation.y = pointer.x * 0.12;
        head.rotation.x = eat ? -0.2 * (1 - ph.fall) + Math.sin(ph.chew * Math.PI) * 0.06 : 0;
        turrets.forEach(({ tg, lid, s: sd }) => {
          tg.rotation.z = sd * Math.sin(t * 0.9 + sd) * 0.05 * motion;
          lid.rotation.x = 0.05 + (charge > 0.3 ? 0.5 : 0) - (fire > 0.3 ? 0.35 : 0) + (focus > 0.4 ? 0.25 : 0);
        });

        const webPts = [];
        tentacles.forEach((tn, idx) => {
          const ca = Math.cos(tn.a);
          const sa = Math.sin(tn.a);
          const raise = focus * (0.5 + 0.5 * Math.sin(t * 2 + tn.ph)) * (Math.abs(sa) < 0.75 ? 1 : 0.4);
          const spread = 1 - squeeze * 0.4 + fire * 0.35 + focus * 0.2 + hop * 0.2;
          const curl = 0.6 + squeeze * 0.7 + (eat ? 0.3 : 0) - hop * 0.3;
          for (let i = 0; i < TS; i++) {
            const u = i / (TS - 1);
            const wave = Math.sin(t * 1.9 - u * 4 + tn.ph) * 0.12 * u * motion;
            const reach = (0.1 + u * tn.len * 0.62) * spread;
            let down = u * tn.len * (0.95 - u * 0.35);
            down -= raise * Math.pow(u, 1.4) * 1.6;
            const r = 0.3 + 0.2 * smooth(0, 0.3, u) + reach - 0.1 * spread;
            const curlIn = Math.max(0, u - 0.55) * curl * 0.7;
            const rr = r - curlIn;
            const yy = HOVER - 0.42 - down + curlIn * 0.9;
            tn.pts[i].set(ca * rr - sa * wave, Math.max(0.06, yy), sa * rr + ca * wave);
          }
          const { g, curve } = taper(tn.pts, u => lerp(0.15, 0.012, Math.pow(u, 0.7)) * (1 + 0.12 * Math.sin(u * Math.PI)), 10, 32);
          tn.m.geometry.dispose();
          tn.m.geometry = paint(g, (x, yv) => grad(yv, HOVER - 1.2, HOVER));
          tn.suckers.forEach((sk, j) => {
            const u = 0.15 + j * 0.11;
            curve.getPointAt(u, sk.position);
            curve.getTangentAt(u, tmp);
            const rad = lerp(0.13, 0.012, Math.pow(u, 0.7));
            sk.position.x -= ca * rad * 0.8;
            sk.position.z -= sa * rad * 0.8;
            sk.position.y -= rad * 0.5;
            sk.quaternion.setFromUnitVectors(V3(0, 0, 1), V3(-ca, -0.6, -sa).normalize());
            sk.scale.setScalar(1.1 - u * 0.75);
          });
          const tip = tn.pts[TS - 1];
          const dir = tip.clone().sub(tn.pts[TS - 2]).normalize();
          tn.tipGlow.position.copy(tip);
          tn.tipGlow.scale.setScalar((0.8 + Math.sin(t * 3 + tn.ph) * 0.25 + focus * 0.6 + fire * 0.6) * mind);
          tn.strands.forEach(st => {
            for (let q = 0; q < 4; q++) {
              const f = q / 3;
              st.pts[q].copy(tip).addScaledVector(dir, f * (0.35 + focus * 0.2));
              st.pts[q].x += (Math.sin(t * 2.6 + st.j * 2.1 + tn.ph) * 0.09 + (st.j - 1) * 0.05) * f;
              st.pts[q].y += Math.cos(t * 2.2 + st.j + tn.ph) * 0.07 * f;
              st.pts[q].z += (st.j - 1) * 0.04 * f;
            }
            const sg = taper(st.pts, u => lerp(0.012, 0.003, u), 4, 10);
            st.m.geometry.dispose();
            st.m.geometry = sg.g;
            st.m.material.opacity = (0.5 + focus * 0.4 + 0.2 * Math.sin(t * 4 + st.j)) * mind;
          });
          webPts.push(tn.pts.slice(0, 4).map(p => p.clone()));
        });
        {
          const pos = [];
          const idxs = [];
          for (let k = 0; k < NT; k++) {
            const A = webPts[k];
            const B = webPts[(k + 1) % NT];
            const base = pos.length / 3;
            for (let i = 0; i < 4; i++) {
              const f = i / 3;
              const sag = 1 - f * 0.35;
              const a = A[i];
              const b = B[i];
              const mx = (a.x + b.x) / 2;
              const mz = (a.z + b.z) / 2;
              const my = (a.y + b.y) / 2 + f * 0.1;
              pos.push(a.x, a.y, a.z, lerp(mx, mx * sag, 1), my, lerp(mz, mz * sag, 1), b.x, b.y, b.z);
            }
            for (let i = 0; i < 3; i++) {
              for (let j = 0; j < 2; j++) {
                const p0 = base + i * 3 + j;
                const p1 = p0 + 1;
                const p2 = p0 + 3;
                const p3 = p2 + 1;
                idxs.push(p0, p2, p1, p1, p2, p3);
              }
            }
          }
          const wg = new THREE.BufferGeometry();
          wg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          wg.setIndex(idxs);
          wg.computeVertexNormals();
          web.geometry.dispose();
          web.geometry = wg;
        }

        rocks.forEach(rk => {
          const k = focus * smooth(rk.k * 0.06, rk.k * 0.06 + 0.3, lift ? lift.p : 0);
          const a = rk.a + t * 0.7 * k;
          const orbit = V3(Math.cos(a) * 1.35, HOVER + 0.6 + Math.sin(t * 1.6 + rk.k) * 0.18 + y, Math.sin(a) * 1.0);
          rk.r.visible = k > 0.02;
          rk.r.position.copy(rk.home).lerp(orbit, k);
          rk.r.scale.setScalar(Math.min(1, k * 1.5));
          rk.r.rotation.set(t * k + rk.k, t * k * 0.7, 0);
          rk.aura.material.opacity = k * 0.22 * mind;
          rockMat.emissiveIntensity = focus * 0.5;
        });
        orbs.forEach(o => {
          const a = o.a + t * 0.5;
          const rr = 0.95 + Math.sin(t * 1.3 + o.k) * 0.08;
          o.m.position.set(Math.cos(a) * rr, HOVER + 0.15 + Math.sin(t * 1.7 + o.k * 1.1) * 0.2, Math.sin(a) * rr);
          o.m.scale.setScalar((0.8 + Math.sin(t * 2 + o.k) * 0.15) * (1 - fire * 0.5));
        });
        waves.forEach((w, k) => {
          const on = fire > 0.05;
          w.visible = on;
          if (!on) return;
          const u = Math.min(1, (bl.p - 0.4) * 2 - k * 0.15);
          w.position.y = HOVER;
          w.scale.setScalar(1 + Math.max(0, u) * 2.5);
          w.material.opacity = Math.max(0, 1 - u) * 0.55 * mind;
        });
        bubbles.forEach(b => {
          const u = (((t * b.sp + b.ph) % 1) + 1) % 1;
          b.m.position.set(b.x + Math.sin(t * 1.1 + b.ph * 7) * 0.06, 0.1 + u * 3.2, b.z);
          b.m.scale.setScalar(Math.max(0.01, Math.sin(u * Math.PI)));
        });
        shadow.scale.setScalar(1 - (y + focus * 0.25) * 0.2);
        ring.scale.setScalar(1 + fire * 0.5 + focus * 0.15 + Math.sin(t * 1.8) * 0.03);
        ring.material.opacity = (0.12 + fire * 0.3 + focus * 0.15) * mind;

        eyes.forEach(({ g }) => {
          g.scale.y = charge > 0.3 ? 0.3 : eat && eat.p > 0.3 ? 0.5 : blink;
        });
        followPupils(eyes, pointer, 0.45);

        const chomp = eat ? Math.sin(ph.chew * Math.PI) * 0.5 + smooth(0.4, 0.9, ph.fall) * (1 - ph.bite) * 0.4 : 0;
        jaws.forEach(({ j, s: sj }) => { j.rotation.z = sj * (0.12 + chomp); });
        if (eat) {
          food.visible = ph.visible;
          food.position.set(0, lerp(3.5, HOVER + y - 0.62, ph.fall * ph.fall), lerp(0.75, 0.08, smooth(0.75, 1, ph.fall)));
          food.scale.setScalar((1 - 0.85 * ph.bite) * 0.8);
        } else food.visible = false;
      }
    };
  }
});
