// 人生をまるごと：入団から引退後・エンディングまで、例外なく進むか
const { load, drain, newPlayer } = require('./lib/game');

function life(G, pos, opts) {
  const s = newPlayer(G, pos, opts);
  const p = s.player;
  s.flags.autoPlan = { train: 'smart', priv: 'smart', raise: true, choose: true };
  const seen = new Set();
  for (let guard = 0; !s.ended && guard < 800; guard++) {
    drain(G, s, (q) => {
      seen.add(q.id || q.kind);
      if (q.id === 'mlb_offer') return opts.mlb ? 0 : 1;
      if (q.id === 'continue_choice') return 0;
      if (q.kind === 'contract' && p.age >= 38) return G.sceneChoices(s, q).length - 1 >= 2 ? 2 : 0;
      return 0;
    });
    if (s.ended) break;
    if (s.after && p.age >= s.retired.age + 4) {
      G.finishLife(s, s.after.career);
      break;
    }
    G.autoAdvance(s, 'year');
  }
  return { s, seen };
}

module.exports = [
  {
    name: '人生をエンディングまで進められる（野手・投手・メジャー挑戦）',
    run() {
      const fails = [];
      const notes = [];
      for (const [pos, opts] of [
        ['SS', { ability: 70 }],
        ['P', { ability: { velocity: 150, control: 70, stamina: 70 } }],
        ['OF', { ability: 80, mlb: true }],
      ]) {
        const G = load();
        const { s } = life(G, pos, opts);
        const p = s.player;
        if (!s.ended) fails.push(`${pos}：エンディングまで進まなかった（${s.year}年 第${s.week}週）`);
        if (!s.ending || !s.ending.title) fails.push(`${pos}：エンディングの情報がない`);
        if (!s.career.length) fails.push(`${pos}：年度別成績が記録されていない`);
        const ach = Object.keys(s.ach || {}).length;
        if (ach < 30) fails.push(`${pos}：実績が少なすぎる（${ach}）`);
        if (opts.mlb && !s.titles.some((t) => t.name === 'メジャー挑戦')) notes.push('（メジャー挑戦は起きなかった）');
        const size = JSON.stringify(s).length;
        if (size > 1500000) fails.push(`${pos}：セーブデータが大きすぎる（${Math.round(size / 1024)}KB）`);
        notes.push(`${pos} ${p.age}歳まで・実績${ach}・${Math.round(size / 1024)}KB`);
      }
      return { fails, note: notes.join(' / ') };
    },
  },
];
