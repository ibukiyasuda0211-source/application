// コンバートの打診：1軍の選手にはシーズン中に来ない（春・秋のキャンプだけ）。2軍の選手には、チームが動いている時期ならいつでも
const { load, newPlayer } = require('./lib/game');

const weekOf = (G, year, phase) => {
  for (let w = 1; w <= 52; w++) if (G.phaseOf(w, year).id === phase) return w;
  return null;
};

module.exports = [
  {
    name: 'コンバートの打診が来る時期（1軍はキャンプだけ・2軍はいつでも）',
    run() {
      const fails = [];
      const counts = {};
      for (const pos of ['SS', 'P']) {
        const G = load();
        const s = newPlayer(G, pos, { ability: pos === 'P' ? { velocity: 152, control: 70, stamina: 75 } : 70 });
        const p = s.player;
        if (pos === 'P') p.prefRole = 'RP';
        for (const squad of ['first', 'second']) {
          for (const phase of ['jan', 'camp', 'open', 'season', 'post', 'fall', 'off']) {
            const w = weekOf(G, s.year, phase);
            if (!w) continue;
            let n = 0;
            for (let i = 0; i < 300; i++) {
              s.week = w;
              p.squad = squad;
              G.ensureUsage(s).status = 'bench';
              s.flags.posOfferYear = null;
              s.queue = [];
              G.positionOfferCheck(s);
              if (s.queue.some((q) => q.id === 'pos_offer')) n++;
            }
            counts[`${pos}-${squad}-${phase}`] = n;
            const allowed = squad === 'second' ? ['camp', 'open', 'season', 'post', 'fall'] : ['camp', 'fall'];
            if (!allowed.includes(phase) && n > 0) fails.push(`${pos === 'P' ? '投手' : '野手'}・${squad === 'first' ? '1軍' : '2軍'}なのに「${G.phaseOf(w, s.year).name}」に打診が来た（${n}回）`);
            if (allowed.includes(phase) && n === 0) fails.push(`${pos === 'P' ? '投手' : '野手'}・${squad === 'first' ? '1軍' : '2軍'}で「${G.phaseOf(w, s.year).name}」に一度も打診が来ない`);
          }
        }
      }
      return { fails, note: `1軍キャンプ ${counts['SS-first-camp']}回・1軍シーズン ${counts['SS-first-season']}回・2軍シーズン ${counts['SS-second-season']}回（300回中）` };
    },
  },
  {
    name: 'カレンダーの日付までスキップ',
    run() {
      const G = load();
      const fails = [];
      const s = newPlayer(G, 'OF', { ability: 60 });
      s.flags.gameMode = 'auto';
      const c = G.cal(s.year);
      // 開幕日まで
      const open = c.opening; // 'YYYY-MM-DD'
      const t = G.skipTarget(s, open);
      if (!t) return ['開幕日までのスキップができない'];
      const r = G.autoAdvance(s, t);
      const want = G.weekOfDate(s.year, new Date(`${open}T00:00:00Z`));
      if (!r.stop && s.week !== want) fails.push(`開幕日の週（${want}週目）ではなく${s.week}週目で止まった`);
      if (r.stop && s.week > want) fails.push(`「${r.stop}」で止まったのに行き過ぎている`);
      // 過ぎた日・今週・去年の日付には飛べない
      if (G.skipTarget(s, G.ymd(G.dateOfWeek(s.year, s.week, 0)))) fails.push('今週の日付に飛べてしまう');
      if (G.skipTarget(s, `${s.year}-01-05`)) fails.push('過ぎた日付に飛べてしまう');
      if (G.skipTarget(s, `${s.year - 1}-12-20`)) fails.push('去年の日付に飛べてしまう');
      // 夏の日付まで（試合をはさんでも進める）
      const before = s.week;
      const r2 = G.autoAdvance(s, G.skipTarget(s, `${s.year}-07-15`));
      const want2 = G.weekOfDate(s.year, new Date(Date.UTC(s.year, 6, 15)));
      if (!r2.stop && s.week !== want2) fails.push(`7月15日の週（${want2}週目）ではなく${s.week}週目で止まった`);
      return { fails, note: `開幕の週まで${r.weeks}週・そこから${s.week - before}週${r.stop || r2.stop ? `（途中で「${r.stop || r2.stop}」）` : ''}` };
    },
  },
];
