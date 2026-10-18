(function () {
  const lerp = (a, b, k) => a + (b - a) * k;

  const smooth = (a, b, x) => {
    const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };

  const mat = (color, rough = 0.55) => new THREE.MeshStandardMaterial({ color, roughness: rough });

  const mesh = (geo, material, shadow = true) => {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = shadow;
    return m;
  };

  function eye(o = {}) {
    const size = o.size || 1;
    const g = new THREE.Group();
    const white = mesh(new THREE.SphereGeometry(0.22 * size, 32, 24), mat(o.whiteColor ?? 0xffffff, 0.3), false);
    white.scale.set(1, 1.1, 0.55);
    const pupil = mesh(new THREE.SphereGeometry(0.12 * size, 32, 24), mat(o.pupilColor ?? 0x1e2340, 0.2), false);
    pupil.scale.set(1, 1.1, 0.5);
    pupil.position.z = 0.09 * size;
    const shine = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 * size, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    shine.position.set(0.04 * size, 0.05 * size, 0.06 * size);
    pupil.add(shine);
    g.add(white, pupil);
    return { g, pupil };
  }

  function followPupils(eyes, pointer, amp = 1) {
    eyes.forEach(({ pupil }) => {
      pupil.position.x = lerp(pupil.position.x, pointer.x * 0.07 * amp, 0.15);
      pupil.position.y = lerp(pupil.position.y, pointer.y * 0.06 * amp, 0.15);
    });
  }

  function eatPhase(p) {
    if (p < 0.3) return { fall: p / 0.3, chew: 0, bite: 0, visible: true };
    if (p < 0.85) {
      const q = (p - 0.3) / 0.55;
      return { fall: 1, chew: Math.abs(Math.sin(q * Math.PI * 4)), bite: q, visible: true };
    }
    return { fall: 1, chew: 0, bite: 1, visible: false };
  }

  function berry() {
    const g = new THREE.Group();
    const fruit = mesh(new THREE.SphereGeometry(0.16, 24, 16), mat(0xe8465a, 0.4), false);
    const leaf = mesh(new THREE.SphereGeometry(0.07, 16, 12), mat(0x4fa86e), false);
    leaf.scale.set(1, 0.4, 1);
    leaf.position.y = 0.15;
    g.add(fruit, leaf);
    return g;
  }

  function fish(color = 0x7fb2e8) {
    const g = new THREE.Group();
    const body = mesh(new THREE.SphereGeometry(0.2, 24, 16), mat(color, 0.35), false);
    body.scale.set(1.7, 0.8, 0.6);
    const tail = mesh(new THREE.ConeGeometry(0.14, 0.24, 3), mat(color, 0.35), false);
    tail.rotation.z = -Math.PI / 2;
    tail.position.x = -0.38;
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x1e2340 })
    );
    dot.position.set(0.22, 0.04, 0.1);
    g.add(body, tail, dot);
    return g;
  }

  function spin(pivot, now) {
    pivot.rotation.order = "YXZ";
    const st = { yaw: 0, pitch: 0, vyaw: 0, vpitch: 0, held: false, at: -100 };
    const TAU = Math.PI * 2;
    return {
      active: () => st.held || Math.abs(st.yaw) > 0.01 || Math.abs(st.pitch) > 0.01,
      begin() {
        st.held = true;
        st.vyaw = 0;
        st.vpitch = 0;
        st.at = now();
      },
      drag(dx, dy) {
        const vy = dx * 0.011;
        const vp = dy * 0.007;
        st.yaw += vy;
        st.pitch = Math.max(-0.5, Math.min(0.8, st.pitch + vp));
        st.vyaw = vy;
        st.vpitch = vp;
        st.at = now();
      },
      end() {
        st.held = false;
        st.at = now();
      },
      update() {
        if (!st.held) {
          st.yaw += st.vyaw;
          st.vyaw *= 0.93;
          st.pitch = Math.max(-0.5, Math.min(0.8, st.pitch + st.vpitch));
          st.vpitch *= 0.9;
          if (now() - st.at > 6) {
            const home = Math.round(st.yaw / TAU) * TAU;
            st.yaw = lerp(st.yaw, home, 0.05);
            st.pitch = lerp(st.pitch, 0, 0.05);
            if (Math.abs(st.yaw - home) < 0.002) st.yaw = 0;
          }
        }
        pivot.rotation.set(st.pitch, st.yaw, 0);
      }
    };
  }

  window.PetKit = { lerp, smooth, mat, mesh, eye, followPupils, eatPhase, berry, fish, spin };

  window.Pets = {
    list: [],
    register(def) {
      def.types = window.PetTypes ? window.PetTypes.clean(def.types) : Array.isArray(def.types) ? def.types.slice(0, 2) : [];
      this.list.push(def);
    },
    find(id) {
      return this.list.find(p => p.id === id);
    }
  };
})();
