(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PetsCloud = factory();
})(typeof self !== "undefined" ? self : this, function () {
  function friendly(status, body) {
    const raw = String((body && (body.msg || body.error_description || body.message || body.error)) || "");
    const low = raw.toLowerCase();
    if (low.includes("invalid login")) return "E-mail ou senha incorretos.";
    if (low.includes("not confirmed")) return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
    if (low.includes("already registered") || low.includes("already been registered")) {
      return "Esse e-mail já tem uma conta. Toque em Entrar.";
    }
    if (low.includes("signups not allowed") || low.includes("signup is disabled")) {
      return "O cadastro está desativado neste projeto.";
    }
    if (low.includes("password") && (low.includes("at least") || low.includes("weak") || low.includes("short"))) {
      return "A senha precisa ter pelo menos 6 caracteres.";
    }
    if (low.includes("valid email") || low.includes("invalid format") || low.includes("validate email")) {
      return "Digite um e-mail válido.";
    }
    if (status === 429 || low.includes("rate limit")) return "Muitas tentativas. Espere um pouco e tente de novo.";
    return raw || "Não foi possível concluir. Tente de novo.";
  }

  function ts(v) {
    if (!v) return null;
    let x = String(v).trim().replace(" ", "T");
    if (/[+-]\d\d$/.test(x)) x += ":00";
    const n = Date.parse(x);
    return isNaN(n) ? null : n;
  }

  function create(opts) {
    const url = String(opts.url || "").replace(/\/+$/, "");
    const anonKey = String(opts.anonKey || "");
    const store = opts.store;
    const doFetch = opts.fetch || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    const configured = /^https:\/\//.test(url) && anonKey.length > 20 && !!doFetch;
    let refreshing = null;
    let lastSeen = null;
    let lastActionAt = null;

    async function request(path, o = {}) {
      let res;
      try {
        res = await doFetch(url + path, {
          method: o.method || "GET",
          headers: Object.assign(
            { apikey: anonKey, "Content-Type": "application/json" },
            o.token ? { Authorization: "Bearer " + o.token } : {},
            o.headers || {}
          ),
          body: o.body === undefined ? undefined : JSON.stringify(o.body)
        });
      } catch (e) {
        const err = new Error("Sem conexão.");
        err.offline = true;
        throw err;
      }
      let data = null;
      const text = await res.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = null;
        }
      }
      if (!res.ok) {
        const err = new Error(friendly(res.status, data));
        err.status = res.status;
        throw err;
      }
      return data;
    }

    function keep(d) {
      const session = {
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600),
        user: { id: d.user && d.user.id, email: d.user && d.user.email }
      };
      store.set(session);
      return session;
    }

    function refresh(s) {
      if (refreshing) return refreshing;
      refreshing = request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: { refresh_token: s.refresh_token }
      })
        .then(keep)
        .finally(() => {
          refreshing = null;
        });
      return refreshing;
    }

    async function fresh(force) {
      const s = store.get();
      if (!s) return null;
      if (!force && s.expires_at - Date.now() / 1000 > 60) return s;
      try {
        return await refresh(s);
      } catch (e) {
        if (e.offline) return s;
        if (e.status === 400 || e.status === 401 || e.status === 403) {
          store.set(null);
          return null;
        }
        throw e;
      }
    }

    async function withAuth(fn) {
      let s = await fresh(false);
      if (!s) {
        const err = new Error("Sessão expirada. Entre de novo.");
        err.auth = true;
        throw err;
      }
      try {
        return await fn(s);
      } catch (e) {
        if (e.status !== 401) throw e;
        s = await fresh(true);
        if (!s) {
          const err = new Error("Sessão expirada. Entre de novo.");
          err.auth = true;
          throw err;
        }
        return fn(s);
      }
    }

    return {
      configured,
      signedIn: () => !!store.get(),
      email: () => {
        const s = store.get();
        return s && s.user ? s.user.email : null;
      },
      async signIn(email, password) {
        const d = await request("/auth/v1/token?grant_type=password", {
          method: "POST",
          body: { email, password }
        });
        return keep(d);
      },
      async signUp(email, password) {
        const d = await request("/auth/v1/signup", { method: "POST", body: { email, password } });
        if (d && d.access_token) {
          keep(d);
          return { session: true };
        }
        return { confirm: true };
      },
      async signOut() {
        const s = store.get();
        store.set(null);
        if (s) {
          try {
            await request("/auth/v1/logout", { method: "POST", token: s.access_token });
          } catch (e) {}
        }
      },
      seen(row) {
        if (!row) return;
        lastSeen = ts(row.updated_at);
        if (row.state && typeof row.state.actionAt === "number") lastActionAt = row.state.actionAt;
      },
      ts,
      known: () => ({ updatedAt: lastSeen, actionAt: lastActionAt }),
      head() {
        return withAuth(async s => {
          const rows = await request("/rest/v1/pet_state?select=updated_at&limit=1&user_id=eq." + encodeURIComponent(s.user.id), { token: s.access_token });
          return rows && rows[0] && rows[0].updated_at ? ts(rows[0].updated_at) : null;
        });
      },
      pull() {
        return withAuth(async s => {
          const rows = await request(
            "/rest/v1/pet_state?select=state,updated_at&limit=1&user_id=eq." + encodeURIComponent(s.user.id),
            { token: s.access_token }
          );
          const row = rows && rows[0] ? rows[0] : null;
          if (row) {
            lastSeen = ts(row.updated_at);
            if (row.state && typeof row.state.actionAt === "number") lastActionAt = row.state.actionAt;
          }
          return row;
        });
      },
      push(state) {
        const updatedAt = new Date().toISOString();
        return withAuth(s =>
          request("/rest/v1/pet_state?on_conflict=user_id", {
            method: "POST",
            token: s.access_token,
            headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
            body: { user_id: s.user.id, state, updated_at: updatedAt }
          })
        ).then(r => {
          lastSeen = Date.parse(updatedAt);
          lastActionAt = state.actionAt;
          return r;
        });
      },
      auth() {
        return fresh(false).then(s => (s ? { token: s.access_token, userId: s.user.id } : null));
      },
      realtimeInfo: () => ({ url, anonKey })
    };
  }

  function realtime(o) {
    const WS = o.WebSocket || (typeof WebSocket !== "undefined" ? WebSocket : null);
    let ws = null;
    let beat = null;
    let retry = null;
    let ref = 0;
    let wait = 2000;
    let stopped = true;
    let live = false;
    let tokenTimer = null;
    const topic = "realtime:pets-state";
    const send = m => {
      if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
    };
    const cleanup = () => {
      clearInterval(beat);
      clearInterval(tokenTimer);
      beat = null;
      live = false;
      if (o.onStatus) o.onStatus(false);
    };
    const schedule = () => {
      if (stopped) return;
      clearTimeout(retry);
      retry = setTimeout(connect, wait);
      wait = Math.min(60000, wait * 2);
    };
    async function connect() {
      if (stopped || !WS) return;
      let auth = null;
      try {
        auth = await o.getAuth();
      } catch (e) {
        auth = undefined;
      }
      if (stopped) return;
      if (auth === null) {
        stopped = true;
        return;
      }
      if (!auth || !auth.token) {
        schedule();
        return;
      }
      const base = String(auth.url || o.url || "").replace(/^http/, "ws").replace(/\/+$/, "");
      try {
        ws = new WS(base + "/realtime/v1/websocket?apikey=" + encodeURIComponent(auth.anonKey || o.anonKey || "") + "&vsn=1.0.0");
      } catch (e) {
        schedule();
        return;
      }
      const sock = ws;
      sock.onopen = () => {
        ref += 1;
        send({
          topic,
          event: "phx_join",
          ref: String(ref),
          join_ref: String(ref),
          payload: {
            config: { broadcast: { self: false }, presence: { key: "" }, postgres_changes: [{ event: "*", schema: "public", table: "pet_state", filter: "user_id=eq." + auth.userId }] },
            access_token: auth.token
          }
        });
        beat = setInterval(() => {
          ref += 1;
          send({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(ref) });
        }, 25000);
        tokenTimer = setInterval(async () => {
          try {
            const a = await o.getAuth();
            if (a && a.token) {
              ref += 1;
              send({ topic, event: "access_token", payload: { access_token: a.token }, ref: String(ref) });
            }
          } catch (e) {}
        }, 10 * 60000);
      };
      sock.onmessage = ev => {
        let m = null;
        try {
          m = JSON.parse(ev.data);
        } catch (e) {
          return;
        }
        if (!m || m.topic !== topic) return;
        if (m.event === "phx_reply" && m.payload && m.payload.status === "ok" && !live) {
          live = true;
          wait = 2000;
          if (o.onStatus) o.onStatus(true);
        } else if (m.event === "postgres_changes") {
          const d = m.payload && m.payload.data;
          const rec = d && (d.record || d.new);
          if (o.onChange) o.onChange(rec || null);
        } else if (m.event === "phx_error" || m.event === "phx_close" || (m.event === "system" && m.payload && m.payload.status === "error")) {
          try {
            sock.close();
          } catch (e) {}
        }
      };
      sock.onclose = () => {
        if (ws === sock) ws = null;
        cleanup();
        schedule();
      };
      sock.onerror = () => {
        try {
          sock.close();
        } catch (e) {}
      };
    }
    return {
      start() {
        if (!stopped) return;
        stopped = false;
        wait = 2000;
        connect();
      },
      stop() {
        stopped = true;
        clearTimeout(retry);
        cleanup();
        if (ws) {
          const sock = ws;
          ws = null;
          try {
            sock.close();
          } catch (e) {}
        }
      },
      restart() {
        this.stop();
        this.start();
      },
      live: () => live
    };
  }

  return { create, realtime, ts };
});
