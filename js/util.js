// 汎用ユーティリティ
(function () {
  const G = (window.G = window.G || {});

  G.ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
  G.rf = (a, b) => Math.random() * (b - a) + a;
  G.chance = (p) => Math.random() < p;
  G.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  G.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  G.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // 重み付き抽選: items = [{weight, ...}]
  G.weighted = (items, key = 'weight') => {
    const total = items.reduce((s, it) => s + it[key], 0);
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const it of items) {
      r -= it[key];
      if (r < 0) return it;
    }
    return items[items.length - 1];
  };

  G.poisson = (lambda) => {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  };

  G.gauss = (mean = 0, sd = 1) => {
    const u = 1 - Math.random();
    const v = Math.random();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // 金額（万円単位）を表示用に
  G.fmtMoney = (man) => {
    man = Math.round(man);
    const neg = man < 0;
    man = Math.abs(man);
    const oku = Math.floor(man / 10000);
    const rest = man % 10000;
    let s;
    if (oku > 0) s = rest > 0 ? `${oku}億${rest}万円` : `${oku}億円`;
    else s = `${rest}万円`;
    return (neg ? '-' : '') + s;
  };

  G.fmtRate = (num, den) => {
    if (!den) return '.---';
    const v = num / den;
    if (v >= 1) return v.toFixed(3);
    return v.toFixed(3).replace(/^0/, '');
  };

  G.fmtERA = (er, outs) => {
    if (!outs) return '-.--';
    return ((er * 27) / outs).toFixed(2);
  };

  G.fmtIP = (outs) => {
    const full = Math.floor(outs / 3);
    const r = outs % 3;
    return r ? `${full} ${r}/3` : `${full}`;
  };

  // パワプロ風の能力ランク
  G.rank = (v) => {
    if (v >= 90) return 'S';
    if (v >= 80) return 'A';
    if (v >= 70) return 'B';
    if (v >= 60) return 'C';
    if (v >= 50) return 'D';
    if (v >= 40) return 'E';
    if (v >= 20) return 'F';
    return 'G';
  };

  G.esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  G.deepCopy = (o) => JSON.parse(JSON.stringify(o));
})();
