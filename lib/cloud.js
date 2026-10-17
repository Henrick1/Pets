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

  function create(opts) {
    const url = String(opts.url || "").replace(/\/+$/, "");
    const anonKey = String(opts.anonKey || "");
    const store = opts.store;
    const doFetch = opts.fetch || (typeof fetch === "function" ? fetch.bind(globalThis) : null);
    const configured = /^https:\/\//.test(url) && anonKey.length > 20 && !!doFetch;
    let refreshing = null;

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
      pull() {
        return withAuth(async s => {
          const rows = await request(
            "/rest/v1/pet_state?select=state,updated_at&limit=1&user_id=eq." + encodeURIComponent(s.user.id),
            { token: s.access_token }
          );
          return rows && rows[0] ? rows[0] : null;
        });
      },
      push(state) {
        return withAuth(s =>
          request("/rest/v1/pet_state?on_conflict=user_id", {
            method: "POST",
            token: s.access_token,
            headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
            body: { user_id: s.user.id, state, updated_at: new Date().toISOString() }
          })
        );
      }
    };
  }

  return { create };
});
