// 守備のシミュレーションと守備成績
(function () {
  const G = window.G;

  // 1試合あたりの守備機会の目安（NPBの平均的な数字をもとに簡略化）
  // po: 刺殺, a: 補殺, err: 1機会あたりの失策率の基準, weight: 守備位置の重要度
  G.POS_DEF = {
    C: { po: 6.8, a: 0.6, err: 0.006, weight: 1.1, avgPct: 0.995 },
    '1B': { po: 8.2, a: 0.6, err: 0.005, weight: 0.5, avgPct: 0.993 },
    '2B': { po: 2.0, a: 2.9, err: 0.014, weight: 1.1, avgPct: 0.985 },
    '3B': { po: 0.8, a: 2.0, err: 0.025, weight: 1.0, avgPct: 0.965 },
    SS: { po: 1.7, a: 3.0, err: 0.02, weight: 1.4, avgPct: 0.975 },
    OF: { po: 2.1, a: 0.06, err: 0.009, weight: 0.9, avgPct: 0.988 },
  };

  G.emptyFld = () => ({ g: 0, po: 0, a: 0, e: 0, fine: 0, drs: 0, sba: 0, cs: 0, pb: 0 });

  G.fieldingPct = (f) => {
    const ch = f.po + f.a + f.e;
    return ch ? (f.po + f.a) / ch : null;
  };

  // innings: 守った割合（フル出場=1、守備固め=0.25 など）
  G.simFielding = (p, frac = 1, out = null) => {
    const b = p.batter;
    const d = G.POS_DEF[p.position] || G.POS_DEF.OF;
    const f = G.emptyFld();
    f.g = 1;
    // 新しいポジションに慣れるまでは守備力が落ちる（40試合ほどで慣れる）
    const adaptPenalty = p.posAdapt !== undefined && p.posAdapt < 40 ? (40 - p.posAdapt) * 0.4 : 0;
    const skill = (b.fielding + b.catching) / 2 - adaptPenalty;
    const range = 0.85 + b.fielding * 0.003;
    const errMul = G.clamp(1.6 - (b.catching - adaptPenalty) * 0.011, 0.45, 1.8) * (p.skills.includes('glove') ? 0.75 : 1);
    const po = G.poisson(d.po * frac * (p.position === 'C' || p.position === '1B' ? 1 : range));
    const a = G.poisson(d.a * frac * range * (p.position === 'OF' ? 0.5 + b.arm * 0.012 : 1));
    let e = 0;
    const chances = po + a;
    for (let i = 0; i < chances; i++) if (G.chance(d.err * errMul)) e++;
    f.po = po;
    f.a = a;
    f.e = e;
    // 好守備（ファインプレー）
    if (G.chance(frac * Math.max(0, (b.fielding - 45) * 0.004) * (p.skills.includes('glove') ? 1.4 : 1))) f.fine = 1;
    // 捕手：盗塁阻止と捕逸
    if (p.position === 'C') {
      f.sba = G.poisson(0.55 * frac);
      const csRate = G.clamp(0.12 + b.arm * 0.0035 + (p.skills.includes('laser') ? 0.05 : 0), 0.1, 0.55);
      for (let i = 0; i < f.sba; i++) if (G.chance(csRate)) f.cs++;
      if (G.chance(0.012 * errMul * frac)) f.pb = 1;
    }
    // 守備得点（平均的な守備からの失点の増減。プラスほど良い）
    let drs = (skill - 55) * 0.0035 * d.weight * frac + (f.fine - 0.04 * frac) * 0.5 - (f.e - chances * d.err) * 0.55 + (f.cs - f.sba * 0.27) * 0.35 - (f.pb - 0.012 * frac) * 0.3;
    if (p.position === 'OF') drs += (a - 0.06 * frac) * 0.5;
    f.drs = Math.round(drs * 100) / 100;
    if (out) {
      if (f.fine) out.push(G.pick(p.position === 'OF' ? ['ダイビングキャッチで長打を防いだ！', 'フェンス際の打球を好捕！', 'レーザービームで走者を刺した！'] : ['三遊間の深い打球に追いつき、アウトにした！', '飛びついて痛烈なライナーを好捕！', '難しいバウンドを華麗にさばいた！']));
      for (let i = 0; i < f.e; i++) out.push(G.pick(['ゴロをはじいてしまった（失策）', '送球がそれてしまった（失策）', '打球を後ろにそらしてしまった（失策）']));
      if (f.cs) out.push(`盗塁を${f.cs}つ阻止した！`);
      if (f.pb) out.push('捕逸で走者の進塁を許した');
    }
    return f;
  };

  G.fldLineText = (f) => {
    const parts = [];
    if (f.fine) parts.push(`好守備${f.fine}`);
    if (f.e) parts.push(`失策${f.e}`);
    if (f.cs) parts.push(`盗塁阻止${f.cs}`);
    return parts.join(' ');
  };
})();
