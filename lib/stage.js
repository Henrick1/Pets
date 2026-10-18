(function (root) {
  function create(opts) {
    const { canvas, THREE, kit, Pets } = opts;
    const reduceMotion = !!opts.reduceMotion;
    const motion = reduceMotion ? 0.3 : 1;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: false });
    renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8890d0, 0.8));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(3, 6, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -3;
    sun.shadow.camera.right = 3;
    sun.shadow.camera.top = 3;
    sun.shadow.camera.bottom = -3;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 20;
    sun.shadow.radius = 4;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.ShadowMaterial({ opacity: 0.2 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const clock = new THREE.Clock();
    const pivot = new THREE.Group();
    scene.add(pivot);
    const spin = kit.spin(pivot, () => clock.getElapsedTime());
    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let pointerAt = -100;
    let lookYaw = 0;
    let lookPitch = 0;
    let glance = 0;
    let glanceUntil = 0;
    let nextGlance = 4 + Math.random() * 4;
    let blinkStart = -10;
    let nextBlink = 1.5;
    let dyingK = 0;
    let current = null;
    let activeAction = null;
    let pendingAction = null;
    let counts = {};
    let clicks = 0;
    let idleTimers = [];
    let status = { hunger: 100, life: 100, dying: false };
    let raf = 0;
    let running = false;
    let egg = null;
    let eggCareValue = 100;
    let eggAction = null;
    let eggCracks = 0;
    let hatching = null;
    let popStart = -10;
    let jumpAt = -1;
    let lastW = 0;
    let lastH = 0;

    const lerp = (a, b, k) => a + (b - a) * k;

    function disposeTree(node) {
      node.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
    }

    function removeEgg() {
      if (!egg) return;
      pivot.remove(egg.root);
      disposeTree(egg.root);
      egg = null;
      eggAction = null;
    }

    function clearPet() {
      if (!current) return;
      pivot.remove(current.pet.root);
      disposeTree(current.pet.root);
      current = null;
    }

    function setEgg(opts) {
      removeEgg();
      hatching = null;
      if (!opts || !root.PetEgg) return;
      clearPet();
      egg = root.PetEgg.build(THREE, opts);
      eggCracks = 0;
      pivot.add(egg.root);
      eggCareValue = opts.care === undefined ? 100 : opts.care;
    }

    function setEggCare(v) {
      eggCareValue = v;
    }

    function eggDo(name) {
      if (!egg || hatching) return;
      eggAction = { name, start: clock.getElapsedTime(), dur: name === "play" ? 0.9 : 1.1 };
    }

    function eggTap() {
      if (!egg || hatching || eggCracks >= 3) return eggCracks;
      eggCracks += 1;
      eggAction = { name: "knock", start: clock.getElapsedTime(), dur: 0.55 };
      return eggCracks;
    }

    function hatch(species, onDone, onBurst) {
      if (!egg) {
        setPet(species);
        popStart = clock.getElapsedTime();
        if (onDone) onDone();
        return;
      }
      eggAction = null;
      hatching = { start: clock.getElapsedTime(), species, swapped: false, onDone, onBurst };
    }

    function setPet(id) {
      if (!id) {
        clearPet();
        return;
      }
      const def = Pets.find(id) || Pets.list[0];
      if (!def || (current && current.def.id === def.id)) return;
      const pet = def.create({ THREE, kit, reduceMotion, motion });
      if (current) {
        pivot.remove(current.pet.root);
        disposeTree(current.pet.root);
      }
      pivot.add(pet.root);
      current = { def, pet };
      activeAction = null;
      pendingAction = null;
      counts = {};
      clicks = 0;
      const t = clock.getElapsedTime();
      idleTimers = (def.idle || []).map(i => t + i.min + Math.random() * (i.max - i.min));
    }

    function startAction(name) {
      counts[name] = (counts[name] || 0) + 1;
      activeAction = { name, start: clock.getElapsedTime(), n: counts[name] };
    }

    function play(name, queue) {
      if (!current || !current.def.actions[name]) return false;
      if (status.dying && name !== "eat") return false;
      if (activeAction) {
        if (queue) pendingAction = name;
        return false;
      }
      startAction(name);
      return true;
    }

    function currentAction(t) {
      if (!activeAction) return null;
      const p = (t - activeAction.start) / current.def.actions[activeAction.name].duration;
      if (p < 1) return { name: activeAction.name, p, n: activeAction.n };
      activeAction = null;
      if (pendingAction) {
        const next = pendingAction;
        pendingAction = null;
        startAction(next);
        return { name: next, p: 0, n: activeAction.n };
      }
      return null;
    }

    function interact() {
      if (!current || status.dying) return false;
      const name = current.def.clickAction ? current.def.clickAction(++clicks) : "jump";
      return play(name);
    }

    function setPointer(x, y) {
      target.x = Math.max(-1, Math.min(1, x));
      target.y = Math.max(-1, Math.min(1, y));
      pointerAt = clock.getElapsedTime();
    }

    function setStatus(s) {
      status = { hunger: s.hunger, life: s.life, dying: !!s.dying };
    }

    function resize() {
      const w = canvas.clientWidth || canvas.width || 1;
      const h = canvas.clientHeight || canvas.height || 1;
      renderer.setSize(w, h, false);
      lastW = canvas.clientWidth;
      lastH = canvas.clientHeight;
      camera.aspect = w / h;
      camera.position.set(0, 2, 7.4);
      camera.lookAt(0, 1.55, 0);
      camera.updateProjectionMatrix();
    }

    function frame() {
      raf = requestAnimationFrame(frame);
      const t = clock.getElapsedTime();
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      if (cw && ch && (cw !== lastW || ch !== lastH)) resize();
      if (jumpAt > 0 && t > jumpAt) {
        jumpAt = -1;
        play("jump");
      }
      if (current) {
        (current.def.idle || []).forEach((i, k) => {
          if (t > idleTimers[k]) {
            play(i.action);
            idleTimers[k] = t + i.min + Math.random() * (i.max - i.min);
          }
        });

        if (t > nextGlance) {
          glance = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.2);
          glanceUntil = t + 1.2 + Math.random() * 1.3;
          nextGlance = t + 5 + Math.random() * 6;
        }
        if (t > glanceUntil) glance = 0;

        const fresh = t - pointerAt < 3;
        pointer.x = lerp(pointer.x, fresh ? target.x : 0, 0.12);
        pointer.y = lerp(pointer.y, fresh ? target.y : 0, 0.12);

        dyingK = lerp(dyingK, status.dying ? 1 : 0, 0.04);
        const look = status.dying ? { x: 0, y: -0.5 } : pointer;
        lookYaw = lerp(lookYaw, look.x * 0.35 + (status.dying ? 0 : glance), 0.05);
        lookPitch = lerp(lookPitch, -look.y * 0.15, 0.06);

        if (t > nextBlink) {
          blinkStart = t;
          nextBlink = t + 2 + Math.random() * 3;
        }
        const bp = (t - blinkStart) / 0.16;
        const blink = lerp(bp >= 0 && bp <= 1 ? 1 - Math.sin(bp * Math.PI) * 0.9 : 1, 0.15, dyingK);

        current.pet.update({
          t,
          pointer: look,
          lookYaw,
          lookPitch,
          blink,
          action: currentAction(t),
          hunger: status.hunger,
          life: status.life,
          dying: status.dying,
          motion,
          reduceMotion
        });

        const r = current.pet.root;
        r.rotation.z = dyingK * (0.3 + Math.sin(t * 0.8) * 0.02);
        r.scale.set(1 + 0.04 * dyingK, 1 - 0.1 * dyingK, 1 + 0.04 * dyingK);
        const pk = Math.min(1, Math.max(0, (t - popStart) / 0.7));
        if (pk < 1) {
          const c1 = 1.70158;
          const c3 = c1 + 1;
          const e = 1 + c3 * Math.pow(pk - 1, 3) + c1 * Math.pow(pk - 1, 2);
          r.scale.multiplyScalar(Math.max(0.001, e));
        }
      }
      if (egg) {
        let action = null;
        if (eggAction) {
          const p = (t - eggAction.start) / eggAction.dur;
          if (p >= 1) eggAction = null;
          else action = { name: eggAction.name, p };
        }
        let hp = null;
        if (hatching) hp = Math.min(1, (t - hatching.start) / (egg.hatchDuration || 2.6));
        const burst = egg.update({ t, care: eggCareValue, action, hatch: hp, motion, cracks: eggCracks });
        if (hatching && burst && !hatching.swapped) {
          hatching.swapped = true;
          setPet(hatching.species);
          popStart = t;
          jumpAt = t + 0.55;
          if (hatching.onBurst) hatching.onBurst();
        }
        if (hatching && hp >= 1) {
          const done = hatching.onDone;
          hatching = null;
          removeEgg();
          if (done) done();
        }
      }
      spin.update();
      renderer.render(scene, camera);
    }

    function start() {
      if (running) return;
      running = true;
      resize();
      frame();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    return { setPet, setEgg, setEggCare, eggDo, eggTap, eggCracks: () => eggCracks, hatch, hasEgg: () => !!egg, setStatus, setPointer, spin, play, interact, resize, start, stop, current: () => current && current.def.id };
  }

  root.PetStage = { create };
})(typeof self !== "undefined" ? self : this);
