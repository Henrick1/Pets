Pets.register({
  id: "zepelume",
  dex: 27,
  name: "Zepelume",
  color: "#9fb8c8",
  types: ["flying", "steel"],
  description: "Quando o Balãozinho cresce, troca o tecido por placas de metal rebitadas e a chama por motores barulhentos. Patrulha o céu à noite com o farol aceso, procurando quem se perdeu no caminho de casa.",
  actions: {
    jump: { duration: 1.8 },
    eat: { duration: 2.4 },
    beam: { duration: 2.6 }
  },
  idle: [
    { action: "beam", min: 25, max: 50 },
    { action: "jump", min: 40, max: 80 }
  ],
  clickAction: n => ["beam", "jump", "beam"][(n - 1) % 3],

  create({ THREE, kit }) {
    const { mesh, lerp, smooth, eye, followPupils, eatPhase, berry } = kit;
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const V2 = (x, y) => new THREE.Vector2(x, y);

    const canvasTex = (w, h, draw, rx = 1, ry = 1) => {
      if (typeof document === "undefined") return null;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      let sd = 9;
      const rnd = () => {
        sd = (sd * 16807) % 2147483647;
        return sd / 2147483647;
      };
      draw(g, rnd, w, h);
      const t = new THREE.CanvasTexture(c);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      t.anisotropy = 4;
      return t;
    };

    const plates = (bump, cols, rows) => (g, rnd, w, h) => {
      g.fillStyle = bump ? "#9a9a9a" : "#c9d6de";
      g.fillRect(0, 0, w, h);
      const cw = w / cols;
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        const off = (r % 2) * cw * 0.5;
        for (let c = -1; c <= cols; c++) {
          const x = c * cw + off;
          const y = r * rh;
          if (!bump) {
            const v = 196 + Math.floor((rnd() - 0.5) * 26);
            g.fillStyle = "rgb(" + (v - 6) + "," + (v + 10) + "," + (v + 20) + ")";
            g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
            for (let k = 0; k < 10; k++) {
              g.fillStyle = "rgba(255,255,255," + rnd() * 0.08 + ")";
              g.fillRect(x + 2, y + 2 + rnd() * (rh - 4), cw - 4, 1);
            }
            const gr = g.createLinearGradient(x, y, x, y + rh);
            gr.addColorStop(0, "rgba(255,255,255,0.12)");
            gr.addColorStop(1, "rgba(0,0,0,0.1)");
            g.fillStyle = gr;
            g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
          } else {
            g.fillStyle = "#b8b8b8";
            g.fillRect(x + 2, y + 2, cw - 4, rh - 4);
          }
          g.fillStyle = bump ? "#303030" : "rgba(40,55,70,0.75)";
          g.fillRect(x, y, cw, 1.5);
          g.fillRect(x, y, 1.5, rh);
          g.fillStyle = bump ? "#ffffff" : "#e8eef2";
          for (let k = 0; k < 4; k++) {
            g.beginPath();
            g.arc(x + 4 + (k * (cw - 8)) / 3, y + 4, 1.6, 0, Math.PI * 2);
            g.fill();
          }
          for (let k = 1; k < 3; k++) {
            g.beginPath();
            g.arc(x + 4, y + 4 + (k * (rh - 8)) / 3, 1.6, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
    };
    const hullTex = canvasTex(512, 512, plates(false, 8, 10), 3, 2);
    const hullBump = canvasTex(512, 512, plates(true, 8, 10), 3, 2);
    const glowTex = canvasTex(128, 128, (g, rnd, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, "rgba(255,255,255,1)");
      gr.addColorStop(0.3, "rgba(255,255,255,0.5)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, w);
    });
    const beamTex = canvasTex(64, 256, (g, rnd, w, h) => {
      const gr = g.createLinearGradient(0, h, 0, 0);
      gr.addColorStop(0, "rgba(255,255,255,0.9)");
      gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      const sg = g.createLinearGradient(0, 0, w, 0);
      sg.addColorStop(0, "rgba(0,0,0,1)");
      sg.addColorStop(0.5, "rgba(0,0,0,0)");
      sg.addColorStop(1, "rgba(0,0,0,1)");
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = sg;
      g.fillRect(0, 0, w, h);
    });
    const winTex = canvasTex(128, 64, (g, rnd, w, h) => {
      const gr = g.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h / 2, w * 0.6);
      gr.addColorStop(0, "#fff6c8");
      gr.addColorStop(0.6, "#ffcf6a");
      gr.addColorStop(1, "#e08a2a");
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(120,60,20,0.35)";
      g.fillRect(w * 0.48, 0, w * 0.04, h);
    });
    const wickerTex = canvasTex(256, 64, (g, rnd, w, h) => {
      g.fillStyle = "#6b4321";
      g.fillRect(0, 0, w, h);
      const cw = w / 16;
      const rh = h / 4;
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 16; c++) {
          const over = (r + c) % 2 === 0;
          g.fillStyle = over ? "#d49c58" : "#b07a3c";
          g.fillRect(c * cw + 1, r * rh + 1, cw - 2, rh - 2);
        }
    }, 6, 1);

    const hullMat = new THREE.MeshStandardMaterial({ color: 0xe4eef6, map: hullTex, bumpMap: hullBump, bumpScale: 0.006, metalness: 0.55, roughness: 0.38 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd2a24c, roughness: 0.3, metalness: 0.85 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x3c4450, roughness: 0.4, metalness: 0.8 });
    const finMat = new THREE.MeshStandardMaterial({ color: 0xff7c66, roughness: 0.45, metalness: 0.35, map: hullTex, bumpMap: hullBump, bumpScale: 0.004 });
    const finStripe = new THREE.MeshStandardMaterial({ color: 0xfff0d2, roughness: 0.45, metalness: 0.3 });
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x67c2ff, roughness: 0.4, metalness: 0.45, map: hullTex, bumpMap: hullBump, bumpScale: 0.004 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: winTex, emissive: 0xffc860, emissiveMap: winTex, emissiveIntensity: 0.9, roughness: 0.2 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe6ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4c0, emissive: 0xffd060, emissiveIntensity: 1.6, roughness: 0.2 });
    const wickerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: wickerTex, roughness: 0.85 });
    const propMat = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.5, metalness: 0.2 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xff5a6a, roughness: 0.6, side: THREE.DoubleSide });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x3a1a20, roughness: 0.4 });
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.5 });
    const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: 0xfff0b0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const lampGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffd070, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
    const winGlow = new THREE.SpriteMaterial({ map: glowTex, color: 0xffb040, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending });

    const strut = (a, b, r = 0.02, m = darkMetal) => {
      const d = b.clone().sub(a);
      const s = mesh(new THREE.CylinderGeometry(r, r, d.length(), 10), m, false);
      s.position.copy(a).add(b).multiplyScalar(0.5);
      s.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize());
      return s;
    };

    const root = new THREE.Group();
    const craft = new THREE.Group();
    root.add(craft);
    const ship = new THREE.Group();
    ship.position.y = 1.55;
    ship.rotation.y = -0.55;
    craft.add(ship);

    const prof = [V2(0.0, -1.62), V2(0.16, -1.5), V2(0.36, -1.22), V2(0.56, -0.8), V2(0.7, -0.3), V2(0.74, 0.2), V2(0.71, 0.62), V2(0.6, 1.0), V2(0.4, 1.3), V2(0.18, 1.46), V2(0.0, 1.5)];
    const profC = new THREE.SplineCurve(prof);
    const profPts = profC.getPoints(120);
    const rAt = z => {
      let best = profPts[0];
      profPts.forEach(p => {
        if (Math.abs(p.y - z) < Math.abs(best.y - z)) best = p;
      });
      return best.x;
    };
    const hullGeo = new THREE.LatheGeometry(profPts, 96);
    hullGeo.rotateX(Math.PI / 2);
    const hull = mesh(hullGeo, hullMat);
    ship.add(hull);
    {
      const seg = profPts.filter(p => p.y > -0.42 && p.y < 0.12).map(p => V2(p.x * 1.012, p.y));
      const beltGeo = new THREE.LatheGeometry(seg, 96);
      beltGeo.rotateX(Math.PI / 2);
      ship.add(mesh(beltGeo, finMat, false));
      const seg2 = profPts.filter(p => p.y > -0.3 && p.y < 0.0).map(p => V2(p.x * 1.018, p.y));
      const stripeG = new THREE.LatheGeometry(seg2.filter((p, i) => i % 1 === 0), 96);
      stripeG.rotateX(Math.PI / 2);
      const st = mesh(stripeG, finStripe, false);
      st.scale.z = 0.35;
      st.position.z = -0.1;
      ship.add(st);
    }
    [-0.95, -0.42, 0.12, 0.62].forEach(z => {
      const r = rAt(z);
      const band = mesh(new THREE.TorusGeometry(r + 0.012, 0.028, 12, 96), brass, false);
      band.position.z = z;
      ship.add(band);
    });
    const ridge = [];
    for (let i = 0; i <= 40; i++) {
      const z = -1.3 + (i / 40) * 2.55;
      ridge.push(V3(0, rAt(z) + 0.012, z));
    }
    ship.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ridge), 80, 0.018, 8), brass, false));

    const finShape = () => {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0);
      sh.lineTo(0.95, 0);
      sh.quadraticCurveTo(1.05, 0.0, 1.0, 0.12);
      sh.lineTo(0.62, 0.52);
      sh.quadraticCurveTo(0.55, 0.6, 0.45, 0.58);
      sh.lineTo(0.12, 0.5);
      sh.quadraticCurveTo(0.02, 0.47, 0.0, 0.36);
      sh.lineTo(0, 0);
      return sh;
    };
    const finGeo = new THREE.ExtrudeGeometry(finShape(), { depth: 0.03, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 12 });
    finGeo.translate(0, 0, -0.015);
    const stripeGeo = new THREE.ExtrudeGeometry(
      (() => {
        const sh = new THREE.Shape();
        sh.moveTo(0.35, 0.02);
        sh.lineTo(0.55, 0.02);
        sh.lineTo(0.42, 0.52);
        sh.lineTo(0.25, 0.48);
        sh.lineTo(0.35, 0.02);
        return sh;
      })(),
      { depth: 0.064, bevelEnabled: false }
    );
    stripeGeo.translate(0, 0, -0.032);
    const fins = [0, 1, 2, 3].map(k => {
      const a = (k / 4) * Math.PI * 2;
      const pv = new THREE.Group();
      pv.rotation.z = a;
      const f = new THREE.Group();
      f.position.set(0, rAt(-1.15) * 0.62, -1.48);
      f.rotation.set(0, Math.PI / 2, 0);
      f.scale.setScalar(0.62);
      f.add(mesh(finGeo, finMat, false));
      f.add(mesh(stripeGeo, finStripe, false));
      const edge = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0.0, 0.36, 0), V3(0.12, 0.5, 0), V3(0.45, 0.58, 0), V3(0.62, 0.52, 0), V3(1.0, 0.12, 0)]), 30, 0.018, 8), brass, false);
      f.add(edge);
      pv.add(f);
      ship.add(pv);
      return pv;
    });

    const props = [-1, 1].map(s => {
      const pod = new THREE.Group();
      pod.position.set(0.98 * s, -0.25, -0.3);
      ship.add(pod);
      const podGeo = new THREE.LatheGeometry([V2(0, -0.34), V2(0.09, -0.3), V2(0.15, -0.16), V2(0.16, 0.05), V2(0.13, 0.22), V2(0.06, 0.32), V2(0, 0.34)], 32);
      podGeo.rotateX(Math.PI / 2);
      pod.add(mesh(podGeo, hullMat));
      const cowl = mesh(new THREE.TorusGeometry(0.15, 0.025, 10, 32), brass, false);
      cowl.position.z = -0.24;
      pod.add(cowl);
      pod.add(strut(V3(-0.1 * s, 0.05, 0.05), V3(-0.62 * s, 0.32, 0.05), 0.025));
      pod.add(strut(V3(-0.1 * s, -0.02, -0.15), V3(-0.66 * s, 0.22, -0.25), 0.02));
      const hub = new THREE.Group();
      hub.position.z = -0.37;
      pod.add(hub);
      const cone = mesh(new THREE.ConeGeometry(0.05, 0.1, 16), brass, false);
      cone.rotation.x = -Math.PI / 2;
      cone.position.z = -0.03;
      hub.add(cone);
      for (let k = 0; k < 3; k++) {
        const bl = new THREE.Group();
        bl.rotation.z = (k / 3) * Math.PI * 2;
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(-0.02, 0);
        bladeShape.quadraticCurveTo(-0.06, 0.18, -0.03, 0.3);
        bladeShape.quadraticCurveTo(0, 0.34, 0.03, 0.3);
        bladeShape.quadraticCurveTo(0.05, 0.12, 0.02, 0);
        const bg = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
        const b = mesh(bg, propMat, false);
        b.rotation.y = 0.45;
        bl.add(b);
        const tip = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.016, 12), brass, false);
        tip.rotation.x = Math.PI / 2;
        tip.position.set(0, 0.29, 0.006);
        bl.add(tip);
        hub.add(bl);
      }
      return hub;
    });

    const gondola = new THREE.Group();
    gondola.position.set(0, -0.92, 0.05);
    ship.add(gondola);
    const capPts = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI / 2;
      capPts.push(V2(Math.sin(a) * 0.2, -0.31 - Math.cos(a) * 0.2));
    }
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI / 2;
      capPts.push(V2(Math.cos(a) * 0.2, 0.31 + Math.sin(a) * 0.2));
    }
    const gGeo = new THREE.LatheGeometry(capPts, 32);
    const cabin = mesh(gGeo, cabinMat);
    cabin.rotation.x = Math.PI / 2;
    cabin.scale.set(1.15, 1, 0.95);
    gondola.add(cabin);
    const cabinRoof = mesh(new THREE.BoxGeometry(0.32, 0.04, 0.78), brass, false);
    cabinRoof.position.y = 0.19;
    gondola.add(cabinRoof);
    const wick = mesh(new THREE.CylinderGeometry(0.235, 0.21, 0.12, 32, 1, true), wickerMat, false);
    wick.rotation.x = Math.PI / 2;
    wick.scale.set(1, 3.6, 0.55);
    wick.position.y = -0.12;
    gondola.add(wick);
    for (let k = 0; k < 4; k++) {
      [-1, 1].forEach(s => {
        const z = -0.33 + k * 0.22;
        const w = mesh(new THREE.PlaneGeometry(0.13, 0.11), winMat, false);
        w.position.set(0.232 * s, 0.03, z);
        w.rotation.y = (Math.PI / 2) * s;
        gondola.add(w);
        const fr = mesh(new THREE.TorusGeometry(0.072, 0.012, 8, 20), brass, false);
        fr.scale.set(1, 0.85, 1);
        fr.position.set(0.236 * s, 0.03, z);
        fr.rotation.y = (Math.PI / 2) * s;
        gondola.add(fr);
      });
    }
    const gGlow = new THREE.Sprite(winGlow);
    gGlow.scale.set(1.2, 0.6, 1);
    gondola.add(gGlow);
    [[-0.25, 0.12], [0.25, 0.12]].forEach(([z]) => {
      [-1, 1].forEach(s => gondola.add(strut(V3(0.12 * s, 0.18, z), V3(0.3 * s, 0.6, z * 1.4), 0.016)));
    });

    const beacon = new THREE.Group();
    beacon.position.set(0, rAt(0.35) + 0.02, 0.35);
    ship.add(beacon);
    const tower = mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.16, 20), darkMetal, false);
    tower.position.y = 0.08;
    beacon.add(tower);
    const cage = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.14, 20, 1, true), glassMat, false);
    cage.position.y = 0.23;
    beacon.add(cage);
    const capB = mesh(new THREE.ConeGeometry(0.11, 0.1, 20), brass, false);
    capB.position.y = 0.35;
    beacon.add(capB);
    const lamp = mesh(new THREE.SphereGeometry(0.05, 16, 12), lampMat, false);
    lamp.position.y = 0.23;
    beacon.add(lamp);
    const lampSprite = new THREE.Sprite(lampGlow);
    lampSprite.scale.set(0.5, 0.5, 1);
    lampSprite.position.y = 0.23;
    beacon.add(lampSprite);
    const beamPivot = new THREE.Group();
    beamPivot.position.y = 0.23;
    beacon.add(beamPivot);
    const beamGeo = new THREE.ConeGeometry(0.45, 2.2, 32, 1, true);
    beamGeo.translate(0, -1.1, 0);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.rotateX(Math.PI);
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.rotation.x = 0.1;
    beamPivot.add(beam);
    const beamLight = new THREE.PointLight(0xffd070, 0.4, 3);
    beamLight.position.y = 0.23;
    beacon.add(beamLight);

    const mast = new THREE.Group();
    mast.position.set(0, rAt(-0.95) + 0.03, -0.95);
    ship.add(mast);
    mast.add(strut(V3(0, 0, 0), V3(0, 0.42, 0), 0.012, brass));
    const flag = mesh(
      (() => {
        const g = new THREE.PlaneGeometry(0.26, 0.14, 8, 2);
        g.translate(-0.13, 0, 0);
        return g;
      })(),
      flagMat,
      false
    );
    flag.position.y = 0.34;
    mast.add(flag);
    const flagBase = Float32Array.from(flag.geometry.attributes.position.array);

    const face = new THREE.Group();
    ship.add(face);
    const onNose = (x, y, out = 0) => {
      const d = Math.hypot(x, y);
      let z = 1.5;
      for (let q = 1.5; q > 0.3; q -= 0.002) {
        if (rAt(q) >= d) {
          z = q;
          break;
        }
      }
      const dz = 0.02;
      const slope = (rAt(z - dz) - rAt(z + dz)) / (2 * dz);
      const n = V3((x / d) * 1, (y / d) * 1, slope).normalize();
      const p = V3(x, y, z).add(n.clone().multiplyScalar(out));
      return { p, n };
    };
    const eyes = [-1, 1].map(s => {
      const g = new THREE.Group();
      const { p, n } = onNose(0.24 * s, 0.14, 0.0);
      g.position.copy(p);
      g.lookAt(p.clone().add(n.clone().lerp(V3(0, 0, 1), 0.45)));
      const e = eye({ size: 0.72 });
      e.g.position.z = 0.02;
      g.add(e.g);
      const rimR = mesh(new THREE.TorusGeometry(0.175, 0.03, 14, 40), brass, false);
      rimR.position.z = 0.01;
      g.add(rimR);
      for (let k = 0; k < 8; k++) {
        const rv = mesh(new THREE.SphereGeometry(0.011, 8, 6), darkMetal, false);
        const ra = (k / 8) * Math.PI * 2;
        rv.position.set(Math.cos(ra) * 0.175, Math.sin(ra) * 0.175, 0.04);
        g.add(rv);
      }
      const lens = mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat, false);
      lens.rotation.x = Math.PI / 2;
      lens.scale.set(1, 1, 0.45);
      lens.position.z = 0.02;
      g.add(lens);
      face.add(g);
      return { g: e.g, pupil: e.pupil, holder: g };
    });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), cheekMat);
      const { p, n } = onNose(0.42 * s, -0.12, 0.006);
      c.position.copy(p);
      c.lookAt(p.clone().add(n));
      c.scale.set(1, 0.65, 1);
      face.add(c);
    });
    const mo = onNose(0.001, -0.18, 0.004);
    const smile = mesh(new THREE.TorusGeometry(0.08, 0.02, 10, 24, Math.PI), mouthMat, false);
    smile.position.copy(mo.p);
    smile.lookAt(mo.p.clone().add(mo.n));
    smile.rotateZ(Math.PI);
    smile.translateY(-0.03);
    face.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.1, 20, 14), mouthMat, false);
    openMouth.scale.set(1, 0.8, 0.4);
    openMouth.position.copy(mo.p);
    openMouth.lookAt(mo.p.clone().add(mo.n));
    openMouth.visible = false;
    face.add(openMouth);

    const food = berry();
    food.visible = false;
    root.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const hunger = typeof s.hunger === "number" ? s.hunger : 100;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const bm = action && action.name === "beam" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;
        const weak = s.dying ? 1 : smooth(30, 8, hunger);

        let lift = lerp(0.35, -0.35, weak) + Math.sin(t * 0.9) * 0.08 * motion;
        let pitch = Math.sin(t * 0.7) * 0.03 * motion + weak * 0.12;
        let power = 1 - weak * 0.7;
        let flash = 0;
        let mouthOpen = false;
        let squint = false;
        let sweep = t * 0.9;

        if (jump) {
          const p = jump.p;
          lift += Math.sin(Math.min(1, p / 0.9) * Math.PI) * 1.0;
          pitch -= Math.sin(p * Math.PI) * 0.22;
          power += Math.sin(p * Math.PI) * 1.5;
        }
        if (bm) {
          const p = bm.p;
          flash = smooth(0.05, 0.2, p) * (1 - smooth(0.8, 1, p));
          sweep = lerp(sweep, Math.PI * 0.55 + Math.sin(p * Math.PI * 3) * 0.6, flash);
          mouthOpen = p > 0.1 && p < 0.4;
        }
        if (eat) {
          food.visible = ph.visible;
          food.position.set(0.55, lerp(4.8, 1.55 + lift - 0.15, ph.fall * ph.fall), lerp(1.4, 1.05, ph.fall));
          food.scale.setScalar(1 - 0.85 * ph.bite);
          mouthOpen = eat.p > 0.12 && eat.p < 0.85 && (eat.p < 0.3 || ph.chew > 0.35);
          squint = eat.p > 0.3;
          openMouth.scale.y = 0.6 + ph.chew * 0.5;
        } else food.visible = false;

        root.position.y = lift;
        root.rotation.y = lookYaw;
        root.rotation.x = lookPitch * 0.5;
        ship.rotation.x = pitch;
        ship.rotation.z = Math.sin(t * 0.6 + 0.4) * 0.03 * motion;
        ship.rotation.y = -0.55 + pointer.x * 0.18;

        const spinRate = reduceMotion ? 0.3 : 1;
        props.forEach((h, i) => {
          h.rotation.z += (0.25 + power * 0.55) * spinRate * (i ? 1 : -1);
        });
        fins.forEach((f, i) => {
          f.rotation.z = (i / 4) * Math.PI * 2 + Math.sin(t * 1.1 + i) * 0.015 * motion;
        });
        beamPivot.rotation.y = sweep;
        beamMat.opacity = (0.16 + flash * 0.45) * (1 - weak * 0.6);
        beam.scale.set(1 + flash * 0.4, 1 + flash * 0.4, 1 + flash * 0.6);
        lampGlow.opacity = 0.55 + flash * 0.45 + Math.sin(t * 6) * 0.05;
        lampMat.emissiveIntensity = 1.2 + flash * 2;
        beamLight.intensity = 0.25 + flash * 0.9;
        winMat.emissiveIntensity = 0.7 + Math.sin(t * 2.3) * 0.06 - weak * 0.4;

        const fp = flag.geometry.attributes.position;
        for (let i = 0; i < fp.count; i++) {
          const x = flagBase[i * 3];
          const w = -x / 0.26;
          fp.setZ(i, Math.sin(t * 6 + x * 18) * 0.03 * w * motion);
        }
        fp.needsUpdate = true;

        smile.visible = !mouthOpen;
        openMouth.visible = mouthOpen;
        eyes.forEach(({ g }) => {
          g.scale.y = squint ? 0.4 : weak > 0.6 ? Math.min(blink, 0.55) : blink;
        });
        followPupils(eyes.map(e => ({ pupil: e.pupil })), pointer);
      }
    };
  }
});
