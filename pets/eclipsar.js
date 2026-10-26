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
    eclipse: { duration: 3.2 }
  },
  idle: [
    { action: "eclipse", min: 30, max: 60 },
    { action: "jump", min: 35, max: 70 }
  ],
  clickAction: n => ["eclipse", "jump", "jump"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

    const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let sd = 11;
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

    const furDraw = (base, light, dark) => (g, rnd, w, h) => {
      g.fillStyle = base;
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const len = 6 + rnd() * 12;
        const ang = Math.PI / 2 + (rnd() - 0.5) * 0.5;
        g.strokeStyle = rnd() < 0.55 ? light : dark;
        g.globalAlpha = 0.25 + rnd() * 0.45;
        g.lineWidth = 0.8 + rnd() * 1.2;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (rnd() - 0.5) * 3, y + Math.sin(ang) * len * 0.5, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        g.stroke();
        [-w, w].forEach(o => {
          if (x + o > -20 && x + o < w + 20) {
            g.beginPath();
            g.moveTo(x + o, y);
            g.lineTo(x + o + Math.cos(ang) * len, y + Math.sin(ang) * len);
            g.stroke();
          }
        });
      }
      g.globalAlpha = 1;
    };
    const furTex = canvasTex(512, 512, furDraw("#17141f", "#3a3450", "#0b0910"), 3, 3);
    const furBump = canvasTex(512, 512, furDraw("#808080", "#e0e0e0", "#202020"), 3, 3);
    const chestTex = canvasTex(256, 256, furDraw("#221e2e", "#463f60", "#120f18"), 2, 2);
    const starTex = canvasTex(512, 512, (g, rnd, w, h) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const x = rnd() * w;
        const y = rnd() * h;
        const r = 1 + rnd() * 2.2;
        const gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
        gr.addColorStop(0, "rgba(255,230,150,1)");
        gr.addColorStop(0.35, "rgba(255,200,90,0.6)");
        gr.addColorStop(1, "rgba(255,200,90,0)");
        g.fillStyle = gr;
        g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
      }
    }, 2, 2);
    const glowTex = canvasTex(128, 128, (g, rnd, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, "rgba(255,255,255,0.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    const ringTex = canvasTex(256, 256, (g, rnd, w) => {
      const c = w / 2;
      const gr = g.createRadialGradient(c, c, 0, c, c, c);
      gr.addColorStop(0, "rgba(255,255,255,0)");
      gr.addColorStop(0.36, "rgba(255,255,255,0)");
      gr.addColorStop(0.46, "rgba(255,255,255,0.9)");
      gr.addColorStop(0.62, "rgba(255,255,255,0.35)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    const rayTex = canvasTex(64, 256, (g, rnd, w, h) => {
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
    });

    const furMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: furTex, bumpMap: furBump, bumpScale: 0.012, roughness: 0.78, metalness: 0.05, emissive: 0xffc860, emissiveMap: starTex, emissiveIntensity: 0.7 });
    const furPlain = new THREE.MeshStandardMaterial({ color: 0xffffff, map: furTex, bumpMap: furBump, bumpScale: 0.012, roughness: 0.78, metalness: 0.05 });
    const chestMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: chestTex, bumpMap: furBump, bumpScale: 0.01, roughness: 0.82 });
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0x4a2e6e, roughness: 0.6, emissive: 0x6a3aa0, emissiveIntensity: 0.35, side: THREE.DoubleSide });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x5a4a6a, roughness: 0.35 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x0c0912, roughness: 0.6 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd25a });
    const eyeRim = new THREE.MeshBasicMaterial({ color: 0x0a0710 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0a0710 });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd76a, roughness: 0.3, metalness: 0.4, emissive: 0xffb030, emissiveIntensity: 1.2 });
    const markMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, side: THREE.DoubleSide });
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xfff1c8, transparent: true, opacity: 0.75 });
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x050308 });
    const coronaGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffc040, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
    const sparkMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
    const eyeGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffc040, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
    const rayMat = new THREE.MeshBasicMaterial({ map: rayTex, color: 0xffcf6a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });

    const loft = (nodes, rad = 22, per = 10, ref = V3(0, 0, 1)) => {
      const n = nodes.length;
      const segs = (n - 1) * per;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array((segs + 1) * (rad + 1) * 3);
      const uv = new Float32Array((segs + 1) * (rad + 1) * 2);
      const idx = [];
      for (let i = 0; i < segs; i++)
        for (let j = 0; j < rad; j++) {
          const a = i * (rad + 1) + j;
          const b = a + rad + 1;
          idx.push(a, b, a + 1, b, b + 1, a + 1);
        }
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
      geo.setIndex(idx);
      const tng = V3(0, 0, 0);
      const side = V3(0, 0, 0);
      const up = V3(0, 0, 0);
      const update = list => {
        const curve = new THREE.CatmullRomCurve3(list.map(q => q.p), false, "centripetal");
        let len = 0;
        let prev = null;
        for (let i = 0; i <= segs; i++) {
          const f = i / segs;
          const c = curve.getPoint(f);
          curve.getTangent(f, tng);
          const k = f * (n - 1);
          const i0 = Math.min(n - 2, Math.floor(k));
          const u = k - i0;
          const s = u * u * (3 - 2 * u);
          const rx = lerp(list[i0].rx, list[i0 + 1].rx, s);
          const rz = lerp(list[i0].rz, list[i0 + 1].rz, s);
          side.crossVectors(tng, ref);
          if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
          side.normalize();
          up.crossVectors(side, tng).normalize();
          if (prev) len += c.distanceTo(prev);
          prev = c.clone();
          for (let j = 0; j <= rad; j++) {
            const a = (j / rad) * Math.PI * 2;
            const o = (i * (rad + 1) + j) * 3;
            pos[o] = c.x + side.x * Math.cos(a) * rx + up.x * Math.sin(a) * rz;
            pos[o + 1] = c.y + side.y * Math.cos(a) * rx + up.y * Math.sin(a) * rz;
            pos[o + 2] = c.z + side.z * Math.cos(a) * rx + up.z * Math.sin(a) * rz;
            const ou = (i * (rad + 1) + j) * 2;
            uv[ou] = j / rad;
            uv[ou + 1] = len * 1.4;
          }
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.uv.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingSphere();
      };
      update(nodes);
      return { geo, update };
    };
    const N = (x, y, z, rx, rz = rx) => ({ p: V3(x, y, z), rx, rz });

    const blob = (r, sx, sy, sz, deform) => {
      const g = new THREE.SphereGeometry(r, 48, 36);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) * sx;
        let y = p.getY(i) * sy;
        let z = p.getZ(i) * sz;
        if (deform) [x, y, z] = deform(x, y, z);
        p.setXYZ(i, x, y, z);
      }
      g.computeVertexNormals();
      return g;
    };

    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);

    const torsoNodes = [N(0, 0.16, -0.44, 0.08, 0.07), N(0, 0.3, -0.42, 0.5, 0.44), N(0, 0.62, -0.32, 0.6, 0.52), N(0, 0.98, -0.16, 0.5, 0.44), N(0, 1.3, 0.0, 0.39, 0.36), N(0, 1.58, 0.13, 0.28, 0.27), N(0, 1.8, 0.2, 0.2, 0.2)];
    const torso = loft(torsoNodes, 32, 12, V3(0, 0, 1));
    const torsoMesh = mesh(torso.geo, furMat);
    body.add(torsoMesh);

    const chest = mesh(
      blob(0.3, 0.82, 1.45, 0.5, (x, y, z) => {
        const f = Math.max(0, -y) / 0.45;
        const e = 1 - Math.pow(Math.abs(x) / 0.25, 2) * 0.35;
        return [x * (1 - f * 0.3), y, z * Math.max(0.4, e)];
      }),
      chestMat
    );
    chest.position.set(0, 1.12, 0.17);
    chest.rotation.x = -0.32;
    body.add(chest);
    for (let k = 0; k < 5; k++) {
      const tuft = mesh(new THREE.ConeGeometry(0.06, 0.16, 8), chestMat, false);
      tuft.position.set((k - 2) * 0.08, 0.86 - Math.abs(k - 2) * 0.03, 0.34 - Math.abs(k - 2) * 0.02);
      tuft.rotation.set(Math.PI - 0.4, 0, (k - 2) * 0.15);
      body.add(tuft);
    }

    [-1, 1].forEach(s => {
      const haunch = mesh(blob(0.34, 0.78, 1.0, 1.25, (x, y, z) => [x, y + Math.max(0, z) * 0.15, z]), furMat);
      haunch.position.set(0.38 * s, 0.38, -0.2);
      haunch.rotation.set(0.2, 0.18 * s, -0.08 * s);
      body.add(haunch);
      const foot = mesh(blob(0.11, 1.0, 0.7, 2.1), furPlain);
      foot.position.set(0.42 * s, 0.07, 0.18);
      foot.rotation.y = -0.12 * s;
      body.add(foot);
      for (let k = -1; k <= 1; k++) {
        const toe = mesh(new THREE.SphereGeometry(0.045, 16, 12), furPlain, false);
        toe.scale.set(1, 0.8, 1.1);
        toe.position.set(0.42 * s + k * 0.055, 0.055, 0.4 - Math.abs(k) * 0.02);
        body.add(toe);
      }
    });

    const legs = [-1, 1].map(s => {
      const leg = loft([N(0.24 * s, 1.24, 0.12, 0.16, 0.18), N(0.24 * s, 0.95, 0.24, 0.13, 0.15), N(0.22 * s, 0.6, 0.3, 0.1, 0.11), N(0.21 * s, 0.25, 0.36, 0.085, 0.09), N(0.21 * s, 0.1, 0.4, 0.08, 0.08)], 22, 10, V3(0, 0, 1));
      body.add(mesh(leg.geo, furPlain));
      const paw = mesh(blob(0.11, 1.15, 0.72, 1.45), furPlain);
      paw.position.set(0.21 * s, 0.075, 0.46);
      body.add(paw);
      for (let k = -1; k <= 1; k++) {
        const toe = mesh(new THREE.SphereGeometry(0.045, 16, 12), furPlain, false);
        toe.scale.set(1, 0.85, 1.1);
        toe.position.set(0.21 * s + k * 0.06, 0.06, 0.6 - Math.abs(k) * 0.02);
        body.add(toe);
      }
      return leg;
    });

    const tailBase = [N(0, 0.28, -0.7, 0.13, 0.13), N(0.32, 0.14, -0.78, 0.12, 0.12), N(0.7, 0.12, -0.42, 0.11, 0.11), N(0.78, 0.12, 0.08, 0.1, 0.1), N(0.6, 0.13, 0.5, 0.085, 0.085), N(0.36, 0.2, 0.74, 0.07, 0.07), N(0.2, 0.34, 0.8, 0.05, 0.05)];
    const tailNodes = tailBase.map(q => ({ p: q.p.clone(), rx: q.rx, rz: q.rz }));
    const tail = loft(tailNodes, 18, 12, V3(0, 1, 0));
    const tailMesh = mesh(tail.geo, furMat);
    body.add(tailMesh);
    const tailTip = new THREE.Group();
    body.add(tailTip);
    const tipCore = mesh(new THREE.SphereGeometry(0.075, 20, 14), goldMat, false);
    tailTip.add(tipCore);
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
      rays.push({ r, len, i });
    }
    const ring = mesh(new THREE.TorusGeometry(0.6, 0.045, 18, 96), goldMat, false);
    halo.add(ring);
    const ring2 = mesh(new THREE.TorusGeometry(0.7, 0.012, 10, 96), goldMat, false);
    haloSpin.add(ring2);
    voidMat.side = THREE.DoubleSide;
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

    const neck = new THREE.Group();
    neck.position.set(0, 1.78, 0.2);
    body.add(neck);
    const head = new THREE.Group();
    head.position.set(0, 0.26, 0.1);
    neck.add(head);
    const skull = mesh(
      blob(0.4, 1.12, 0.92, 0.98, (x, y, z) => {
        const cheek = Math.max(0, -y) * 0.55 * Math.max(0, z + 0.1);
        const nx = x * (1 + cheek);
        const fz = z > 0 ? z * (1 - 0.18 * Math.max(0, 1 - Math.abs(y) * 2.5)) : z;
        return [nx, y * (y > 0 ? 0.92 : 1), fz];
      }),
      furPlain
    );
    head.add(skull);
    [-1, 1].forEach(s => {
      for (let k = 0; k < 3; k++) {
        const ruff = mesh(new THREE.ConeGeometry(0.07, 0.2, 8), furPlain, false);
        ruff.position.set((0.42 + k * 0.02) * s, -0.12 - k * 0.07, -0.02 + k * 0.03);
        ruff.rotation.set(0, 0, (Math.PI / 2 + 0.5 + k * 0.25) * s);
        head.add(ruff);
      }
    });
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -0.12, 0.32);
    head.add(muzzle);
    [-1, 1].forEach(s => {
      const pad = mesh(blob(0.095, 1.05, 0.85, 0.8), chestMat, false);
      pad.position.set(0.07 * s, -0.01, 0.02);
      muzzle.add(pad);
    });
    const chin = mesh(blob(0.07, 1.1, 0.7, 0.9), chestMat, false);
    chin.position.set(0, -0.09, -0.01);
    muzzle.add(chin);
    const noseGeo = new THREE.SphereGeometry(0.045, 20, 14);
    {
      const p = noseGeo.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const k = 1 - Math.max(0, -y) * 9;
        p.setXYZ(i, p.getX(i) * 1.35 * Math.max(0.25, k), y * 0.8, p.getZ(i) * 0.8);
      }
      noseGeo.computeVertexNormals();
    }
    const nose = mesh(noseGeo, noseMat, false);
    nose.position.set(0, 0.06, 0.1);
    muzzle.add(nose);
    const mouthL = [-1, 1].map(s => {
      const m = mesh(new THREE.TorusGeometry(0.04, 0.008, 8, 16, Math.PI * 0.8), mouthMat, false);
      m.position.set(0.035 * s, -0.035, 0.1);
      m.rotation.set(0, 0, Math.PI + (s < 0 ? 0.25 : -0.05) * 1);
      if (s < 0) m.rotation.z = Math.PI + Math.PI * 0.2;
      muzzle.add(m);
      return m;
    });
    const philtrum = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), mouthMat, false);
    philtrum.position.set(0, 0.015, 0.105);
    muzzle.add(philtrum);
    const openMouth = mesh(new THREE.SphereGeometry(0.06, 20, 14), mouthMat, false);
    openMouth.scale.set(1.1, 0.8, 0.45);
    openMouth.position.set(0, -0.055, 0.085);
    openMouth.visible = false;
    muzzle.add(openMouth);
    const fangs = [-1, 1].map(s => {
      const f = mesh(new THREE.ConeGeometry(0.012, 0.035, 6), new THREE.MeshStandardMaterial({ color: 0xf4efe6, roughness: 0.3 }), false);
      f.rotation.x = Math.PI;
      f.position.set(0.03 * s, -0.035, 0.105);
      f.visible = false;
      muzzle.add(f);
      return f;
    });
    [-1, 1].forEach(s => {
      [0.02, -0.01, -0.04].forEach((dy, k) => {
        const len = 0.42 - k * 0.04;
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0012, len, 5), whiskerMat);
        w.geometry.translate(0, len / 2, 0);
        w.position.set(0.13 * s, dy, 0.05);
        w.rotation.set(0, 0, -s * (Math.PI / 2 - 0.12 + k * 0.14));
        w.rotateX(-0.25);
        muzzle.add(w);
      });
    });

    const eyeShape = () => {
      const sh = new THREE.Shape();
      sh.moveTo(-0.1, -0.005);
      sh.bezierCurveTo(-0.07, 0.075, 0.06, 0.08, 0.1, 0.02);
      sh.bezierCurveTo(0.07, -0.06, -0.05, -0.065, -0.1, -0.005);
      return sh;
    };
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      g.position.set(0.17 * s, 0.03, 0.335);
      g.rotation.set(-0.05, 0.42 * s, 0);
      const flip = new THREE.Group();
      flip.scale.x = s;
      g.add(flip);
      const rim = new THREE.Mesh(new THREE.ShapeGeometry(eyeShape(), 20), eyeRim);
      rim.scale.set(1.2, 1.25, 1);
      rim.position.z = -0.002;
      flip.add(rim);
      const white = new THREE.Mesh(new THREE.ShapeGeometry(eyeShape(), 20), eyeMat);
      white.rotation.z = 0.12;
      flip.add(white);
      const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), pupilMat);
      pupil.scale.set(0.42, 1.65, 1);
      pupil.position.set(0, 0.01, 0.003);
      flip.add(pupil);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(0.013, 12), shineMat);
      sh.position.set(-0.03, 0.03, 0.005);
      flip.add(sh);
      const gl = new THREE.Sprite(eyeGlow);
      gl.scale.set(0.38, 0.26, 1);
      gl.position.z = 0.02;
      g.add(gl);
      [rim, white, pupil, sh].forEach(m => (m.material.side = THREE.DoubleSide));
      head.add(g);
      return { g, pupil, gl };
    });
    const crescent = (() => {
      const sh = new THREE.Shape();
      sh.absarc(0, 0, 0.075, Math.PI * 0.15, Math.PI * 1.85, false);
      sh.absarc(0.035, 0.0, 0.06, Math.PI * 1.75, Math.PI * 0.25, true);
      return new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), markMat);
    })();
    crescent.position.set(0, 0.2, 0.36);
    crescent.rotation.set(-0.45, 0, Math.PI / 2);
    head.add(crescent);

    const earGeo = (w, h, d, inner) => {
      const sh = new THREE.Shape();
      sh.moveTo(-w, 0);
      sh.quadraticCurveTo(-w * 0.75, h * 0.6, -w * 0.08, h);
      sh.quadraticCurveTo(0, h * 1.03, w * 0.08, h);
      sh.quadraticCurveTo(w * 0.75, h * 0.6, w, 0);
      sh.quadraticCurveTo(0, -h * 0.08, -w, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelThickness: d * 0.6, bevelSize: d * 0.5, bevelSegments: 3, curveSegments: 16 });
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const cup = (1 - Math.pow(Math.abs(x) / w, 2)) * (1 - y / h) * (inner ? 0.06 : 0.07);
        p.setZ(i, p.getZ(i) - cup);
      }
      g.computeVertexNormals();
      return g;
    };
    const ears = [-1, 1].map(s => {
      const pv = new THREE.Group();
      pv.position.set(0.24 * s, 0.24, 0.0);
      pv.rotation.set(-0.25, -0.35 * s, -0.42 * s);
      const outer = mesh(earGeo(0.15, 0.36, 0.025, false), furPlain, false);
      outer.position.z = -0.03;
      pv.add(outer);
      const inner = mesh(earGeo(0.1, 0.28, 0.008, true), innerEarMat, false);
      inner.position.set(0, 0.03, 0.012);
      pv.add(inner);
      for (let k = 0; k < 3; k++) {
        const tf = mesh(new THREE.ConeGeometry(0.018, 0.12, 6), chestMat, false);
        tf.position.set((k - 1) * 0.03, 0.08 + k * 0.02, 0.03);
        tf.rotation.z = (k - 1) * 0.3;
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
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const ecl = action && action.name === "eclipse" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let breathe = 1 + Math.sin(t * 1.6) * 0.012 * motion;
        let lean = 0;
        let headDown = 0;
        let headUp = 0;
        let mouthOpen = false;
        let squint = false;
        let flare = 0;
        let crouch = 0;

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
        if (ecl) {
          const p = ecl.p;
          flare = smooth(0.08, 0.3, p) * (1 - smooth(0.75, 1, p));
          headUp = flare * 0.5;
        }
        if (eat) {
          headDown = Math.sin(Math.min(1, ph.fall) * Math.PI * 0.5) * 0.55 * (1 - ph.bite * 0.3);
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, 1.85, ph.fall * ph.fall), lerp(1.0, 0.92, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = eat.p > 0.15 && eat.p < 0.85 && (eat.p < 0.32 || ph.chew > 0.35);
          squint = eat.p > 0.32;
          openMouth.scale.y = 0.5 + ph.chew * 0.6;
        } else food.visible = false;

        root.position.y = y;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * 0.6;
        body.scale.set(1 + crouch * 0.05, (1 - crouch * 0.12) * breathe, 1 + crouch * 0.05);
        body.rotation.x = -lean;

        neck.rotation.x = lerp(neck.rotation.x, headDown * 0.7 - headUp * 0.5 - pointer.y * 0.12, 0.12);
        head.rotation.x = lerp(head.rotation.x, headDown * 0.5 - headUp * 0.3, 0.12);
        head.rotation.y = lerp(head.rotation.y, pointer.x * 0.45, 0.1);
        head.rotation.z = Math.sin(t * 0.7) * 0.03 * motion;

        const tw = Math.max(0, Math.sin(t * 0.9 + 1.2)) > 0.985 ? 1 : 0;
        ears.forEach(({ pv, s: sd }, i) => {
          const tw2 = i === 0 ? tw : 0;
          pv.rotation.z = lerp(pv.rotation.z, -0.42 * sd + tw2 * 0.25 * sd - (jump ? 0.15 * sd : 0), 0.25);
          pv.rotation.x = lerp(pv.rotation.x, -0.25 - flare * 0.2, 0.2);
        });

        eyes.forEach(({ g, pupil, gl }) => {
          g.scale.y = squint ? 0.35 : blink;
          pupil.position.x = lerp(pupil.position.x, pointer.x * 0.03, 0.15);
          pupil.position.y = lerp(pupil.position.y, 0.01 + pointer.y * 0.02, 0.15);
          pupil.scale.x = lerp(pupil.scale.x, 0.42 + flare * 0.55, 0.1);
          gl.material.opacity = 0.3 + flare * 0.5 + Math.sin(t * 2) * 0.05;
        });
        mouthL.forEach(m => (m.visible = !mouthOpen));
        openMouth.visible = mouthOpen;
        fangs.forEach(f => (f.visible = mouthOpen));

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
        furMat.emissiveIntensity = 0.55 + flare * 0.9 + Math.sin(t * 1.3) * 0.1;
      }
    };
  }
});
