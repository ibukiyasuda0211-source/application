// 顔のアバター（SVG）
// ・自分の選手は、入団前に髪型や目・口などを選べる（あとから変えることもできる）
// ・チームメイトや代表の仲間・首脳陣は、名前から決まる顔（毎回同じ顔になる）
// ・帽子は所属チームの色とマーク
(function () {
  const G = window.G;

  G.FACE_OPTS = {
    skin: [
      { id: 's1', name: '色白', c: '#f8dcc0' },
      { id: 's2', name: 'ふつう', c: '#f0c9a0' },
      { id: 's3', name: '日焼け', c: '#d9a26f' },
      { id: 's4', name: '褐色', c: '#a8704a' },
    ],
    hair: [
      { id: 'short', name: '短髪' },
      { id: 'spiky', name: 'ツンツン' },
      { id: 'buzz', name: '坊主' },
      { id: 'side', name: '七三' },
      { id: 'long', name: '長め' },
      { id: 'curly', name: 'パーマ' },
      { id: 'none', name: 'スキンヘッド' },
    ],
    hairColor: [
      { id: 'black', name: '黒', c: '#1d1d1f' },
      { id: 'brown', name: 'こげ茶', c: '#4b3020' },
      { id: 'light', name: '茶', c: '#8a5a2b' },
      { id: 'blond', name: '金', c: '#d4a63a' },
      { id: 'gray', name: 'グレー', c: '#9b9b9b' },
    ],
    eyes: [
      { id: 'dot', name: '点目' },
      { id: 'round', name: 'まる目' },
      { id: 'smile', name: 'にっこり' },
      { id: 'sharp', name: 'キリッ' },
      { id: 'sleepy', name: 'たれ目' },
    ],
    brows: [
      { id: 'normal', name: 'ふつう' },
      { id: 'thick', name: '太まゆ' },
      { id: 'up', name: 'つりまゆ' },
      { id: 'down', name: '困りまゆ' },
    ],
    mouth: [
      { id: 'smile', name: '笑顔' },
      { id: 'grin', name: 'にかっ' },
      { id: 'flat', name: 'への字' },
      { id: 'o', name: 'ぽかん' },
    ],
    extra: [
      { id: 'none', name: 'なし' },
      { id: 'stubble', name: '無精ひげ' },
      { id: 'goatee', name: 'あごひげ' },
      { id: 'glasses', name: 'メガネ' },
      { id: 'blush', name: 'ほっぺ' },
    ],
    cap: [
      { id: 'on', name: 'かぶる' },
      { id: 'off', name: 'かぶらない' },
    ],
  };
  G.FACE_KEYS = ['skin', 'hair', 'hairColor', 'eyes', 'brows', 'mouth', 'extra', 'cap'];
  G.FACE_LABELS = { skin: '肌', hair: '髪型', hairColor: '髪の色', eyes: '目', brows: 'まゆ', mouth: '口', extra: 'ほか', cap: '帽子' };

  // 名前などの文字列から、毎回同じ乱数をつくる
  const seeded = (str) => {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };
  };
  const pickBy = (rnd, list, weights) => {
    if (!weights) return list[Math.floor(rnd() * list.length)].id;
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rnd() * total;
    for (let i = 0; i < list.length; i++) if ((r -= weights[i]) < 0) return list[i].id;
    return list[0].id;
  };

  // ランダムな顔（seed があれば、その名前の人はいつも同じ顔）
  G.randomFace = (seed, opts = {}) => {
    const rnd = seed ? seeded(String(seed)) : Math.random;
    const O = G.FACE_OPTS;
    const age = opts.age || 25;
    const f = {
      skin: pickBy(rnd, O.skin, [3, 5, 3, 1]),
      hair: pickBy(rnd, O.hair, [6, 3, 3, 3, 2, 2, age >= 45 ? 3 : 0.5]),
      hairColor: age >= 50 && rnd() < 0.6 ? 'gray' : pickBy(rnd, O.hairColor, [8, 4, 2, 1, 0]),
      eyes: pickBy(rnd, O.eyes),
      brows: pickBy(rnd, O.brows, [4, 2, 2, 1]),
      mouth: pickBy(rnd, O.mouth, [4, 3, 2, 1]),
      extra: pickBy(rnd, O.extra, [7, 2, age >= 30 ? 2 : 0.5, 1.5, 1]),
      cap: opts.cap === undefined ? 'on' : opts.cap ? 'on' : 'off',
    };
    return f;
  };

  const opt = (k, id) => G.FACE_OPTS[k].find((x) => x.id === id) || G.FACE_OPTS[k][0];
  const darken = (hex, k = 0.25) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const ch = (v) => Math.max(0, Math.round(v * (1 - k)));
    return `rgb(${ch((n >> 16) & 255)},${ch((n >> 8) & 255)},${ch(n & 255)})`;
  };
  const capMark = (team) => {
    if (!team) return '';
    if (team.mark) return team.mark;
    if (team.id === 'n_jpn') return 'J';
    return team.league === 'mlb' ? team.short.slice(0, 2) : team.short.slice(0, 1);
  };

  const HAIR = {
    short: (c) => `<path d="M14.5 29.5c-1-11 7-17.5 17.5-17.5s18.5 6.5 17.5 17.5c-3-6-8-9.5-17.5-9.5s-14.5 3.5-17.5 9.5z" fill="${c}"/>`,
    spiky: (c) => `<path d="M14 30l1.5-11 4.5 3 2.5-9.5 4.5 6.5 4.5-9 4 7.5 4.5-7 3 7.5 4.5-3.5.5 7.5 2.5 8c-4-6-10-9-18-9s-14 3-18 9z" fill="${c}"/>`,
    buzz: (c) => `<path d="M14.5 29.5c-1-11 7-17.5 17.5-17.5s18.5 6.5 17.5 17.5c-3-6-8-9.5-17.5-9.5s-14.5 3.5-17.5 9.5z" fill="${c}" opacity=".45"/>`,
    side: (c) => `<path d="M14.5 30.5c-1.5-12 8-19 18-19s18.5 6.5 17.5 17.5c-6-7.5-14.5-9.5-24.5-6.5-4.5 1.5-8 4.5-11 8z" fill="${c}"/>`,
    long: (c) => `<path d="M14 32c-1.5-12.5 8-20 18-20s19.5 7.5 18 20c-3.5-5.5-8-8-11.5-8.5 1 3-.5 5-2.5 6.5 0-3-1.5-5.5-3.5-6.5-3.5.5-6.5 3-8.5 7-1.5-2-2.5-4-2.5-6-3.5 1.5-5.5 4.5-7.5 7.5z" fill="${c}"/>`,
    curly: (c) => [[17, 25], [21, 19], [27, 15.5], [33, 14.5], [39, 16], [44, 20], [47.5, 26]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/>`).join(''),
    none: () => '<path d="M24 17q4-2 7-1" stroke="#fff" stroke-width="1.6" fill="none" opacity=".5" stroke-linecap="round"/>',
  };
  const EYES = {
    dot: () => '<circle cx="24.5" cy="37" r="1.9" fill="#222"/><circle cx="39.5" cy="37" r="1.9" fill="#222"/>',
    round: () => [24.5, 39.5].map((x) => `<circle cx="${x}" cy="37" r="3.3" fill="#fff"/><circle cx="${x}" cy="37.3" r="2.2" fill="#222"/><circle cx="${x + 0.8}" cy="36.4" r=".7" fill="#fff"/>`).join(''),
    smile: () => '<path d="M21.5 38q3-3.5 6 0M36.5 38q3-3.5 6 0" stroke="#222" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
    sharp: () => '<path d="M21 37.6q3.5-3.2 7-.6q-3.5 1.6-7 .6zM43 37.6q-3.5-3.2-7-.6q3.5 1.6 7 .6z" fill="#222"/>',
    sleepy: () => '<path d="M21.5 36.5q3 2.8 6 0M36.5 36.5q3 2.8 6 0" stroke="#222" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="24.5" cy="37.6" r="1.1" fill="#222"/><circle cx="39.5" cy="37.6" r="1.1" fill="#222"/>',
  };
  const BROWS = {
    normal: (c) => `<path d="M21 32h7M36 32h7" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`,
    thick: (c) => `<path d="M21 32h7M36 32h7" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`,
    up: (c) => `<path d="M21 33.5l7-2.5M43 33.5l-7-2.5" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`,
    down: (c) => `<path d="M21 31.5l7 2M43 31.5l-7 2" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`,
  };
  const MOUTH = {
    smile: () => '<path d="M28 44q4 3.6 8 0" stroke="#8a3b2b" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
    grin: () => '<path d="M27.5 43q4.5 6 9 0z" fill="#7a2e22"/><path d="M28.4 43.4h7.2" stroke="#fff" stroke-width="1.3"/>',
    flat: () => '<path d="M28.5 45.6q3.5-2.2 7 0" stroke="#8a3b2b" stroke-width="1.7" fill="none" stroke-linecap="round"/>',
    o: () => '<ellipse cx="32" cy="45" rx="1.8" ry="2.2" fill="#7a2e22"/>',
  };
  const EXTRA = {
    none: () => '',
    stubble: (c) => `<path d="M19 42c2 7 7 10.5 13 10.5s11-3.5 13-10.5c-3 4.5-8 6.5-13 6.5s-10-2-13-6.5z" fill="${c}" opacity=".28"/>`,
    goatee: (c) => `<path d="M29.5 48q2.5 3.2 5 0q0 3.2-2.5 3.8q-2.5-.6-2.5-3.8z" fill="${c}"/>`,
    glasses: () => '<circle cx="24.5" cy="37" r="4.8" fill="none" stroke="#333" stroke-width="1.4"/><circle cx="39.5" cy="37" r="4.8" fill="none" stroke="#333" stroke-width="1.4"/><path d="M29.3 37h5.4" stroke="#333" stroke-width="1.4"/>',
    blush: () => '<ellipse cx="20.5" cy="42" rx="2.8" ry="1.6" fill="#ff8fa3" opacity=".55"/><ellipse cx="43.5" cy="42" rx="2.8" ry="1.6" fill="#ff8fa3" opacity=".55"/>',
  };

  // 顔の SVG。team を渡すと帽子とユニフォームがその色に
  G.faceSvg = (f, o = {}) => {
    const size = o.size || 56;
    const skin = opt('skin', f.skin).c;
    const hc = opt('hairColor', f.hairColor).c;
    const team = o.team || null;
    const tc = team ? team.color : '#2e8b3d';
    const cap = f.cap === 'on';
    const hair = opt('hair', f.hair).id;
    const parts = [];
    parts.push(`<circle cx="32" cy="32" r="32" fill="${o.bg || '#e9f0e4'}"/>`);
    parts.push(`<path d="M9 64c2-10 10.5-15 23-15s21 5 23 15z" fill="#fff" stroke="${tc}" stroke-width="2.4"/><path d="M27 50l5 6 5-6" fill="none" stroke="${tc}" stroke-width="2.2"/>`);
    parts.push(`<rect x="27" y="43" width="10" height="9" rx="3" fill="${darken(skin, 0.08)}"/>`);
    if (hair === 'long' && !cap) parts.push(`<path d="M13 31c0-11 8-18.5 19-18.5S51 20 51 31v9c-2.5-1.5-4.5-4.5-5-8H18c-.5 3.5-2.5 6.5-5 8z" fill="${hc}"/>`);
    parts.push(`<ellipse cx="14.8" cy="34" rx="3" ry="4" fill="${skin}"/><ellipse cx="49.2" cy="34" rx="3" ry="4" fill="${skin}"/>`);
    parts.push(`<ellipse cx="32" cy="32.5" rx="17.5" ry="18.5" fill="${skin}"/>`);
    if (!cap) parts.push(HAIR[hair](hc));
    else if (hair !== 'none' && hair !== 'buzz') parts.push(`<path d="M15.2 29c-.3 3.5 0 5.6.9 7.6l1.9-.9c-.7-2-.9-4-.7-6.7zM48.8 29c.3 3.5 0 5.6-.9 7.6l-1.9-.9c.7-2 .9-4 .7-6.7z" fill="${hc}"/>`);
    const browC = hair === 'none' ? '#3a2a20' : hc === '#9b9b9b' ? '#6f6f6f' : hc;
    parts.push(BROWS[opt('brows', f.brows).id](browC));
    parts.push(EYES[opt('eyes', f.eyes).id]());
    parts.push(`<path d="M32 39.8q-1.2 2.2.7 2.5" stroke="${darken(skin, 0.3)}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`);
    parts.push(MOUTH[opt('mouth', f.mouth).id]());
    parts.push(EXTRA[opt('extra', f.extra).id](hc));
    if (cap) {
      const mark = capMark(team);
      parts.push(`<path d="M13.6 29c0-12.5 8.4-19.5 18.4-19.5S50.4 16.5 50.4 29z" fill="${tc}"/>`);
      parts.push(`<path d="M12.5 28.6c6-2.6 12.8-3.6 19.5-3.6s13.5 1 19.5 3.6c-.8 2.3-2.6 3.3-4.6 3.3-4.3-1.5-9.3-2.2-14.9-2.2s-10.6.7-14.9 2.2c-2 0-3.8-1-4.6-3.3z" fill="${darken(tc, 0.3)}"/>`);
      if (mark) parts.push(`<text x="32" y="22.5" text-anchor="middle" font-size="${mark.length > 1 ? 7 : 9}" font-weight="800" fill="#fff" font-family="sans-serif">${mark.replace(/[<&>]/g, '')}</text>`);
    }
    return `<svg class="face" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="${o.label || '顔'}">${parts.join('')}</svg>`;
  };

  // 自分の顔（まだ決めていなければ、名前から決まる顔）
  G.ensureFace = (p) => {
    if (!p.face) p.face = G.randomFace(p.name, { age: 22 });
    return p.face;
  };
  G.playerFace = (s, size = 56) => G.faceSvg(G.ensureFace(s.player), { size, team: G.teamById(s.player.teamId), label: s.player.name });
  // ほかの人の顔（名前から決まる）
  G.npcFace = (name, o = {}) => G.faceSvg(G.randomFace(name, { age: o.age }), { size: o.size || 44, team: o.teamId ? G.teamById(o.teamId) : null, label: name });

  // 顔のパーツを1つ進める・戻す
  G.faceStep = (f, key, dir) => {
    const list = G.FACE_OPTS[key];
    const i = list.findIndex((x) => x.id === f[key]);
    f[key] = list[(i + dir + list.length) % list.length].id;
    return f;
  };
  G.faceName = (f, key) => opt(key, f[key]).name;
})();
