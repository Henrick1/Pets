(function (root) {
  const P = {
    fight: '<path d="M6 16c3-3 6-8 8-12"/><path d="M10 19c3-3 6-8 8-13"/><path d="M15 20c2-2 4-5 5-8"/>',
    swap: '<path d="M7 7h11l-3.5-3.5M17 17H6l3.5 3.5"/>',
    bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="M10 13h4"/>',
    run: '<path d="M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 16l4-4-4-4M14 12H4"/>',
    food: '<path d="M12 7c-3-2-7 0-7 5 0 4 3 8 5 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-4 5-8 0-5-4-7-7-5z"/><path d="M12 7c0-2 1-3.5 3-4"/>',
    heal: '<rect x="4" y="9" width="16" height="6" rx="3"/><path d="M12 9v6"/>',
    joy: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
    xp: '<path d="M12 5v14M5 12h14"/>',
    paw: '<circle cx="7" cy="10" r="1.8"/><circle cx="11" cy="6.5" r="1.8"/><circle cx="16" cy="7.5" r="1.8"/><circle cx="18.5" cy="12" r="1.6"/><path d="M8.5 18c0-3 2-5.5 4.5-5.5s3.5 2 3.5 4-1.5 3-4 3-4 0-4-1.5z"/>',
    coin: '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M9.5 10.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.5-2.5 1.5-2.5.6-2.5 1.8 1.1 2 2.5 2 2.5-.8 2.5-2"/>',
    egg: '<path d="M12 3c-3.5 0-6.5 6-6.5 10a6.5 6.5 0 0 0 13 0C18.5 9 15.5 3 12 3z"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h10"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l8-8"/>',
    map: '<path d="M3 18l6-9 4 5 3-3 5 7z"/>',
    lock: '<rect x="6" y="11" width="12" height="9" rx="2"/><path d="M9 11V8a3 3 0 0 1 6 0v3"/>',
    phys: '<path d="M12 3l2 5 5-2-2 5 5 2-5 2 2 5-5-2-2 5-2-5-5 2 2-5-5-2 5-2-2-5 5 2z"/>',
    spec: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/>',
    status: '<path d="M12 4v16M4 12h16"/>',
    more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    sell: '<path d="M4 12l8-8h7v7l-8 8z"/><circle cx="15" cy="9" r="1.4"/>'
  };
  const T = {
    fire: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 0 2 1 3 2 3 0-3-1-5 .5-8z"/>',
    water: '<path d="M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z"/>',
    grass: P.leaf,
    electric: '<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
    poison: '<circle cx="12" cy="10" r="6"/><path d="M9 20h6M10 16v4M14 16v4"/><circle cx="10" cy="9" r="1"/><circle cx="14" cy="9" r="1"/>',
    steel: '<path d="M12 3l7 4v10l-7 4-7-4V7z"/><circle cx="12" cy="12" r="3"/>',
    fighting: '<path d="M7 11V7a2 2 0 0 1 4 0v3M11 10V6a2 2 0 0 1 4 0v4M15 10V8a2 2 0 0 1 4 0v5c0 4-3 7-7 7s-6-3-6-6v-2a2 2 0 0 1 2-2h3"/>',
    dark: '<path d="M19 14A8 8 0 1 1 10 5a6.5 6.5 0 0 0 9 9z"/>',
    ground: P.map,
    rock: '<path d="M6 18l-2-6 4-6 7-1 5 6-2 7z"/><path d="M8 6l3 6 6-1"/>',
    psychic: '<path d="M12 19c-4 0-7-3-7-6.5S8 6 12 6s7 3 7 6.5-3 6.5-7 6.5z"/><circle cx="12" cy="12.5" r="2.5"/>',
    flying: '<path d="M3 13c4 0 7-2 9-6 1 3 4 5 9 5-3 3-7 5-11 5-3 0-5-2-7-4z"/>',
    ghost: '<path d="M6 20V11a6 6 0 0 1 12 0v9l-2-2-2 2-2-2-2 2-2-2z"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/>',
    dragon: '<path d="M4 18c3-1 5-3 6-6-3 0-5-1-6-3 3 0 6 0 8 2 1-3 0-5-2-7 4 1 7 4 8 8 1 4-1 7-4 8-3 1-6 0-10-2z"/>',
    bug: '<ellipse cx="12" cy="13" rx="5" ry="6"/><path d="M12 7v12M9 4l1.5 3M15 4l-1.5 3M7 12H4M20 12h-3M7 16l-3 2M17 16l3 2"/>',
    light: P.joy,
    ice: '<path d="M12 2v20M3.5 7l17 10M3.5 17l17-10"/>',
    none: '<circle cx="12" cy="12" r="6"/>'
  };
  function svg(key, size = 24, width = 2.1) {
    const body = P[key] || T[key] || "";
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + "</svg>";
  }
  function typeSvg(type, size = 16, width = 2.3) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" fill="none" stroke="currentColor" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (T[type] || T.none) + "</svg>";
  }
  root.PetIcons = { svg, typeSvg, has: k => !!(P[k] || T[k]) };
})(typeof self !== "undefined" ? self : this);
