(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PetTypes = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const INFO = {
    fire: { name: "Fogo", color: "#f08030" },
    water: { name: "Água", color: "#6890f0" },
    grass: { name: "Planta", color: "#78c850" },
    electric: { name: "Elétrico", color: "#f8d030" },
    ice: { name: "Gelo", color: "#98d8d8" },
    fighting: { name: "Lutador", color: "#c03028" },
    poison: { name: "Veneno", color: "#a040a0" },
    ground: { name: "Terra", color: "#e0c068" },
    flying: { name: "Voador", color: "#a890f0" },
    psychic: { name: "Psíquico", color: "#f85888" },
    bug: { name: "Inseto", color: "#a8b820" },
    rock: { name: "Pedra", color: "#b8a038" },
    ghost: { name: "Fantasma", color: "#705898" },
    dragon: { name: "Dragão", color: "#7038f8" },
    dark: { name: "Sombrio", color: "#705848" },
    steel: { name: "Aço", color: "#b8b8d0" }
  };

  const LIST = Object.keys(INFO);
  const MAX_TYPES = 2;

  const CHART = {
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    electric: { water: 2, grass: 0.5, electric: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0 },
    ground: { fire: 2, grass: 0.5, electric: 2, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { grass: 2, electric: 0.5, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5 }
  };

  const has = t => Object.prototype.hasOwnProperty.call(INFO, t);

  function clean(types) {
    const out = [];
    (Array.isArray(types) ? types : [types]).forEach(t => {
      if (typeof t === "string" && has(t) && !out.includes(t) && out.length < MAX_TYPES) out.push(t);
    });
    return out;
  }

  function multiplier(attack, defense) {
    if (!has(attack)) return 1;
    return clean(defense).reduce((m, d) => {
      const v = CHART[attack][d];
      return m * (v === undefined ? 1 : v);
    }, 1);
  }

  function label(m) {
    if (m === 0) return "Não afeta";
    if (m >= 2) return "Super efetivo";
    if (m < 1) return "Pouco efetivo";
    return "Normal";
  }

  function weaknesses(defense) {
    const out = {};
    LIST.forEach(a => {
      const m = multiplier(a, defense);
      if (m !== 1) out[a] = m;
    });
    return out;
  }

  return { LIST, INFO, CHART, MAX_TYPES, has, clean, multiplier, label, weaknesses };
});
