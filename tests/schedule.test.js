// 日程：各球団143試合・交流戦は他リーグとだけ・ホームとビジターの偏りがない
const { load } = require('./lib/game');

module.exports = [
  {
    name: '日程（143試合・交流戦・ホーム/ビジター）',
    run() {
      const G = load();
      const fails = [];
      for (const y of [2027, 2028, 2031, 2034]) {
        const c = G.cal(y);
        const games = {};
        const home = {};
        for (const d of c.days) {
          if (d.rain) continue;
          for (const x of G.dayPairs(y, d)) {
            if (x.lg === 'mlb') continue;
            games[x.home] = (games[x.home] || 0) + 1;
            games[x.away] = (games[x.away] || 0) + 1;
            home[x.home] = (home[x.home] || 0) + 1;
            const same = G.teamById(x.home).league === G.teamById(x.away).league;
            if (d.inter && same) fails.push(`${y} ${d.d} 交流戦なのに同リーグ`);
            if (!d.inter && !same) fails.push(`${y} ${d.d} 交流戦以外で他リーグ`);
          }
        }
        for (const [t, n] of Object.entries(games)) if (n !== 143) fails.push(`${y} ${t} の試合数が${n}`);
        for (const [t, n] of Object.entries(home)) if (Math.abs(n - 71.5) > 4) fails.push(`${y} ${t} のホーム試合が${n}`);
        const rained = c.days.filter((d) => d.rain).length;
        const makeups = c.days.filter((d) => d.makeup).length;
        if (rained !== makeups) fails.push(`${y} 雨天中止${rained}と振替${makeups}が合わない`);
      }
      return fails;
    },
  },
];
