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
    let evolving = null;
    const evoFx = new THREE.Group();
    scene.add(evoFx);
    const evoFlashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
    const evoFlash = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), evoFlashMat);
    evoFlash.position.y = 1.2;
    evoFlash.visible = false;
    evoFx.add(evoFlash);
    const evoSparks = [];
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.07),
        new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffffff : 0xfff0a0 })
      );
      m.visible = false;
      evoFx.add(m);
      evoSparks.push({ m, a: (i / 18) * Math.PI * 2, h: 0.3 + (i % 6) * 0.4, sp: 0.8 + (i % 4) * 0.3 });
    }
    let jumpAt = -1;
    let lastW = 0;
    let lastH = 0;

    const lerp = (a, b, k) => a + (b - a) * k;
    const smooth = (a, b, x) => {
      const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
      return k * k * (3 - 2 * k);
    };

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

    function whiten(node, k) {
      node.traverse(o => {
        if (!o.material) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
          if (!m.userData.evo) {
            m.userData.evo = {
              color: m.color ? m.color.clone() : null,
              emissive: m.emissive ? m.emissive.clone() : null,
              ei: m.emissiveIntensity
            };
          }
          const o0 = m.userData.evo;
          if (m.emissive) {
            m.emissive.copy(o0.emissive).lerp(new THREE.Color(0xffffff), k);
            m.emissiveIntensity = lerp(o0.ei === undefined ? 1 : o0.ei, 1.2, k);
            if (m.color && o0.color) m.color.copy(o0.color).lerp(new THREE.Color(0xffffff), k);
          } else if (m.color && o0.color) {
            m.color.copy(o0.color).lerp(new THREE.Color(0xffffff), k);
          }
        });
      });
    }

    function evolve(targetId, onDone, onSwap) {
      const def = Pets.find(targetId);
      if (!current || !def || evolving) {
        if (onDone) onDone();
        return;
      }
      const next = def.create({ THREE, kit, reduceMotion, motion });
      next.root.visible = false;
      pivot.add(next.root);
      evolving = { start: clock.getElapsedTime(), old: current, next: { def, pet: next }, onDone, onSwap, swapped: false };
      activeAction = null;
      pendingAction = null;
    }

    function stepEvolve(t) {
      const ev = evolving;
      const p = Math.min(1, (t - ev.start) / 5.5);
      const oldR = ev.old.pet.root;
      const newR = ev.next.pet.root;
      const idle = { t, pointer: { x: 0, y: 0 }, lookYaw: 0, lookPitch: 0, blink: 1, action: null, hunger: 100, life: 100, joy: 100, dying: false, motion, reduceMotion };
      ev.old.pet.update(idle);
      ev.next.pet.update(idle);
      const glow = smooth(0, 0.18, p) * (1 - smooth(0.82, 1, p));
      let showNew = false;
      let squeeze = 1;
      if (p > 0.2 && p < 0.78) {
        const q = (p - 0.2) / 0.58;
        const freq = 1.2 + q * q * 14;
        const phase = Math.sin(((p - 0.2) * 5.5) * Math.PI * freq * 0.5 + q);
        showNew = phase > 0;
        squeeze = 0.85 + Math.abs(phase) * 0.15;
      } else if (p >= 0.78) {
        showNew = true;
      }
      oldR.visible = !showNew;
      newR.visible = showNew;
      [oldR, newR].forEach(r => {
        r.scale.set(1 / Math.sqrt(squeeze), squeeze, 1 / Math.sqrt(squeeze));
        r.position.y = Math.sin(t * 2) * 0.05 * glow + smooth(0.1, 0.3, p) * 0.25 * (1 - smooth(0.8, 0.95, p));
        r.rotation.y = smooth(0.2, 0.78, p) * Math.PI * 4;
      });
      whiten(oldR, glow);
      whiten(newR, p >= 0.78 ? Math.max(0, 1 - (p - 0.78) / 0.2) : glow);
      evoFlash.visible = p > 0.74 && p < 0.9;
      if (evoFlash.visible) {
        const q = (p - 0.74) / 0.16;
        evoFlash.scale.setScalar(0.4 + q * 3);
        evoFlashMat.opacity = Math.sin(Math.min(1, q * 1.3) * Math.PI) * 0.95;
      }
      evoSparks.forEach((s, i) => {
        const on = p > 0.05 && p < 0.98;
        s.m.visible = on;
        if (!on) return;
        const inward = p < 0.78;
        const k = inward ? smooth(0.05, 0.2, p) : 1 - smooth(0.85, 0.98, p);
        const rad = inward ? lerp(1.6, 0.6, smooth(0.2, 0.78, p)) : lerp(0.6, 2.2, smooth(0.78, 0.98, p));
        const a = s.a + t * s.sp * (inward ? 2 + p * 6 : 1);
        s.m.position.set(Math.sin(a) * rad, s.h + (inward ? 0 : smooth(0.78, 0.98, p) * 0.8), Math.cos(a) * rad);
        s.m.rotation.set(t * 5, t * 4, 0);
        s.m.scale.setScalar(k * (0.8 + Math.sin(t * 9 + i) * 0.3));
      });
      if (p >= 0.78 && !ev.swapped) {
        ev.swapped = true;
        if (ev.onSwap) ev.onSwap();
      }
      if (p >= 1) {
        pivot.remove(oldR);
        disposeTree(oldR);
        whiten(newR, 0);
        newR.visible = true;
        newR.scale.set(1, 1, 1);
        newR.position.y = 0;
        newR.rotation.y = 0;
        current = ev.next;
        counts = {};
        clicks = 0;
        const tt = clock.getElapsedTime();
        idleTimers = (current.def.idle || []).map(i => tt + i.min + Math.random() * (i.max - i.min));
        evolving = null;
        jumpAt = tt + 0.2;
        if (ev.onDone) ev.onDone();
      }
    }

    let fitK = 1;
    let needFit = false;
    let fitTarget = 1;
    let fitAt = 0;
    function fitScale(root, lookY, aspect) {
      const saved = root.position.clone();
      root.position.set(0, 0, 0);
      root.updateMatrixWorld(true);
      const box = new THREE.Box3();
      const v3 = new THREE.Vector3();
      const im = new THREE.Matrix4();
      const inv = root.parent ? new THREE.Matrix4().copy(root.parent.matrixWorld).invert() : new THREE.Matrix4();
      const m4 = new THREE.Matrix4();
      root.traverse(o => {
        if (!o.isMesh || !o.geometry) return;
        for (let p = o; p && p !== root.parent; p = p.parent) if (!p.visible) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (ms.some(m => m.depthWrite === false || (m.transparent && m.opacity < 0.5))) return;
        const pos = o.geometry.attributes.position;
        if (!pos) return;
        m4.multiplyMatrices(inv, o.matrixWorld);
        const step = Math.max(1, Math.floor(pos.count / 400));
        const n = o.isInstancedMesh ? o.count : 1;
        for (let k = 0; k < n; k++) {
          if (o.isInstancedMesh) {
            o.getMatrixAt(k, im);
            im.premultiply(m4);
          } else im.copy(m4);
          for (let q = 0; q < pos.count; q += step) box.expandByPoint(v3.fromBufferAttribute(pos, q).applyMatrix4(im));
        }
      });
      root.position.copy(saved);
      root.updateMatrixWorld(true);
      if (box.isEmpty()) return 1;
      const half = Math.tan((35 / 2) * Math.PI / 180) * 7.4;
      const hor = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z) * 0.6, Math.abs(box.max.z) * 0.6);
      return Math.max(1, (box.max.y - lookY) / (half * 0.82), (lookY - box.min.y) / (half * 0.9), hor / (half * aspect * 0.82));
    }
    function placeCamera() {
      camera.position.set(0, 1.55 + 0.45 * fitK, 7.4 * fitK);
      camera.lookAt(0, 1.55, 0);
      camera.updateProjectionMatrix();
    }

    function setPet(id) {
      if (evolving) return;
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
      fitK = 1;
      needFit = true;
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
      if (!current || status.dying || evolving) return false;
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
      placeCamera();
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
      if (evolving) {
        stepEvolve(t);
      } else if (current) {
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
      if (current && (needFit || performance.now() - fitAt > 1500)) {
        fitAt = performance.now();
        const k = fitScale(current.pet.root, 1.55, camera.aspect);
        if (needFit) fitK = k;
        else if (k > fitTarget) fitTarget = k;
        if (needFit) fitTarget = k;
        needFit = false;
        placeCamera();
      }
      if (fitK < fitTarget - 0.001) {
        fitK += (fitTarget - fitK) * 0.08;
        placeCamera();
      }
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

    return { setPet, evolve, isEvolving: () => !!evolving, setEgg, setEggCare, eggDo, eggTap, eggCracks: () => eggCracks, hatch, hasEgg: () => !!egg, setStatus, setPointer, spin, play, interact, resize, start, stop, current: () => current && current.def.id };
  }

  const thumbCache = {};
  let thumb = null;

  function thumbnail(THREE, kit, Pets, id, size = 192, fit = false) {
    const key = id + (fit ? ":fit" : "");
    if (thumbCache[key]) return thumbCache[key];
    const def = Pets.find(id);
    if (!def || !root.document) return null;
    try {
      if (!thumb) {
        const canvas = root.document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
        renderer.setSize(size, size, false);
        renderer.setClearColor(0x000000, 0);
        const scene = new THREE.Scene();
        scene.add(new THREE.HemisphereLight(0xffffff, 0x8890d0, 0.9));
        const sun = new THREE.DirectionalLight(0xffffff, 0.9);
        sun.position.set(3, 6, 4);
        scene.add(sun);
        const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 2.1, 7.6);
        camera.lookAt(0, 1.45, 0);
        thumb = { renderer, scene, camera };
      }
      const pet = def.create({ THREE, kit, reduceMotion: true, motion: 0 });
      for (let i = 0; i < 40; i++) pet.update({ t: i / 30, pointer: { x: 0, y: 0 }, lookYaw: 0.35, lookPitch: 0, blink: 1, action: null, hunger: 100, life: 100, joy: 100, dying: false, motion: 0, reduceMotion: true });
      thumb.scene.add(pet.root);
      pet.root.updateMatrixWorld(true);
      const box = new THREE.Box3();
      const tmpBox = new THREE.Box3();
      pet.root.traverse(o => {
        if (!o.geometry || !o.isMesh) return;
        for (let p = o; p; p = p.parent) if (!p.visible) return;
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        if (ms.some(m => m.depthWrite === false || (m.transparent && m.opacity < 0.5))) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        tmpBox.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        box.union(tmpBox);
      });
      if (fit && !box.isEmpty()) {
        const c = box.getCenter(new THREE.Vector3());
        const sz = box.getSize(new THREE.Vector3());
        const r = Math.max(sz.x, sz.y, sz.z * 0.8) * 0.5;
        const dist = r / Math.tan((35 / 2) * Math.PI / 180);
        thumb.camera.position.set(c.x, c.y + dist * 0.12, c.z + dist);
        thumb.camera.lookAt(c);
      } else {
        thumb.camera.position.set(0, 2.1, 7.6);
        thumb.camera.lookAt(0, 1.45, 0);
      }
      thumb.renderer.render(thumb.scene, thumb.camera);
      const url = thumb.renderer.domElement.toDataURL("image/png");
      thumb.scene.remove(pet.root);
      pet.root.traverse(o => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
      });
      thumbCache[key] = url;
      return url;
    } catch (err) {
      return null;
    }
  }

  root.PetStage = { create, thumbnail };
})(typeof self !== "undefined" ? self : this);
