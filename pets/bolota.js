Pets.register({
  id: "bolota",
  dex: 1,
  name: "Bolota",
  color: "#7fd6a8",
  types: ["grass"],
  description: "Uma bolinha de planta que brotou de uma semente teimosa. Quando está feliz, o broto da cabeça balança sem parar.",
  actions: {
    jump: { duration: 0.95 },
    eat: { duration: 2.4 }
  },
  idle: [{ action: "jump", min: 20, max: 45 }],
  clickAction: () => "jump",

  create({ THREE, kit }) {
    const { mat, mesh, lerp, eye, followPupils, eatPhase, berry } = kit;

    const root = new THREE.Group();
    const squash = new THREE.Group();
    root.add(squash);

    const body = mesh(new THREE.SphereGeometry(1, 64, 48), mat(0x7fd6a8));
    body.position.y = 1;
    squash.add(body);

    const limbMat = mat(0x5fbf8c);
    const feet = [-1, 1].map(s => {
      const f = mesh(new THREE.SphereGeometry(0.25, 32, 16), limbMat);
      f.scale.set(1.1, 0.55, 1.3);
      f.position.set(0.42 * s, 0.1, 0.18);
      squash.add(f);
      return f;
    });

    const arms = [-1, 1].map(s => {
      const pivot = new THREE.Group();
      pivot.position.set(0.9 * s, 0.85, 0.1);
      const a = mesh(new THREE.SphereGeometry(0.18, 24, 16), limbMat);
      a.scale.set(0.7, 1.1, 0.7);
      a.position.set(0.08 * s, -0.12, 0);
      pivot.add(a);
      squash.add(pivot);
      return { pivot, side: s };
    });

    const eyes = [-1, 1].map(s => {
      const e = eye();
      e.g.position.set(0.35 * s, 1.15, 0.86);
      squash.add(e.g);
      return e;
    });

    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.75 });
    [-1, 1].forEach(s => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(0.12, 32), cheekMat);
      c.scale.set(1, 0.7, 1);
      const p = new THREE.Vector3(0.6 * s, -0.08, Math.sqrt(1 - 0.36 - 0.0064)).multiplyScalar(1.012);
      c.position.set(p.x, p.y + 1, p.z);
      c.lookAt(p.x * 2, p.y * 2 + 1, p.z * 2);
      squash.add(c);
    });

    const mouthMat = mat(0x5a1e2e, 0.4);
    const smile = mesh(new THREE.TorusGeometry(0.09, 0.025, 12, 24, Math.PI), mouthMat, false);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.97, 0.99);
    squash.add(smile);
    const openMouth = mesh(new THREE.SphereGeometry(0.1, 24, 16), mouthMat, false);
    openMouth.scale.set(1, 0.9, 0.4);
    openMouth.position.set(0, 0.92, 0.96);
    openMouth.visible = false;
    squash.add(openMouth);

    const sprout = new THREE.Group();
    sprout.position.set(0, 1.95, 0);
    const stem = mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.35, 12), mat(0x4fa86e));
    stem.position.y = 0.17;
    sprout.add(stem);
    const leafMat = mat(0x9be36a, 0.5);
    const leaves = [-1, 1].map(s => {
      const l = mesh(new THREE.SphereGeometry(0.18, 24, 16), leafMat);
      l.scale.set(1, 0.3, 0.55);
      l.position.set(0.15 * s, 0.36, 0);
      l.rotation.z = 0.5 * s;
      sprout.add(l);
      return l;
    });
    squash.add(sprout);

    const food = berry();
    food.visible = false;
    squash.add(food);

    return {
      root,
      update(s) {
        const { t, pointer, lookYaw, lookPitch, blink, action, motion, reduceMotion } = s;
        const jump = action && action.name === "jump" ? action : null;
        const eat = action && action.name === "eat" ? action : null;
        const ph = eat ? eatPhase(eat.p) : null;

        let y = 0;
        let sy = 1 + Math.sin(t * 2) * 0.025 * motion;
        let spin = 0;
        let airborne = false;
        let mouthOpen = false;
        let squint = false;

        if (jump) {
          const p = jump.p;
          if (p < 0.18) {
            sy = 1 - 0.22 * Math.sin((p / 0.18) * Math.PI / 2);
          } else if (p < 0.78) {
            const q = (p - 0.18) / 0.6;
            y = Math.sin(q * Math.PI) * 1.3;
            sy = 1 + 0.12 * Math.cos(q * Math.PI);
            airborne = true;
            if (jump.n % 3 === 0 && !reduceMotion) spin = q * Math.PI * 2;
          } else {
            const q = (p - 0.78) / 0.22;
            sy = 1 - 0.2 * Math.sin(q * Math.PI);
          }
        }

        if (eat) {
          sy += 0.05 * Math.sin(ph.fall * Math.PI) - ph.chew * 0.1 * motion;
          food.visible = ph.visible;
          food.position.set(0, lerp(3.4, 1.0, ph.fall * ph.fall), lerp(0.7, 1.08, ph.fall));
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
        root.rotation.y = lookYaw + spin;
        root.rotation.x = lookPitch;
        const happy = eat ? Math.sin(eat.p * Math.PI * 8) * 0.04 * motion : 0;
        squash.rotation.z = airborne ? 0 : Math.sin(t * 1.3) * 0.04 * motion + happy;

        const open = airborne || mouthOpen;
        smile.visible = !open;
        openMouth.visible = open;

        arms.forEach(({ pivot, side }) => {
          const target = airborne ? 2.2 : eat ? 1.1 : 0.35 + Math.sin(t * 3 + side) * 0.12 * motion;
          pivot.rotation.z = lerp(pivot.rotation.z, target * side, 0.2);
        });

        feet.forEach(f => {
          f.position.y = airborne ? 0.05 : 0.1;
        });

        const wobble = jump ? Math.sin(t * 22) * 0.18 : eat ? Math.sin(t * 14) * 0.08 : 0;
        sprout.rotation.z = Math.sin(t * 2.6) * 0.12 * motion + wobble;
        leaves.forEach((l, i) => {
          l.rotation.z = (i ? 1 : -1) * (0.5 + Math.sin(t * 3.1 + i) * 0.1 * motion);
        });

        eyes.forEach(({ g }) => {
          g.scale.y = airborne ? 1.1 : squint ? 0.4 : blink;
        });
        followPupils(eyes, pointer);
      }
    };
  }
});
