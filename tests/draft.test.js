// ドラフト同期：同じチームの同期は、チームのタブと同じ成績・立場になっているか
const { load, drain, newPlayer } = require('./lib/game');

module.exports = [
  {
    name: 'ドラフト同期とチームメイトの成績が一致する',
    run() {
      const fails = [];
      let checked = 0;
      for (const pos of ['SS', 'P']) {
        const G = load();
        const s = newPlayer(G, pos);
        s.flags.gameMode = 'auto';
        let lastYear = s.year;
        for (let guard = 0; s.year < s.startYear + 4 && guard < 4000; guard++) {
          drain(G, s);
          if (s.gw) {
            G.stepGames(s, null);
            continue;
          }
          if (s.retired || s.ended) break;
          if (s.roster && s.week % 8 === 0) {
            for (const m of s.roster.players) {
              if (m.draftId === undefined) continue;
              const d = s.draft.picks.find((x) => x.id === m.draftId);
              const L = G.draftLive(s, d);
              checked++;
              const g = m.pos === 'P' ? m.stats.pit.g : m.stats.bat.g;
              if (g && !(m.pos === 'P' ? L.pit.g : L.bat.g)) fails.push(`${d.name}：チームでは出場しているのに同期の表では出場なし`);
            }
          }
          G.doAction(s, 'mental', 'relax');
          if (s.year !== lastYear && s.roster) {
            for (const m of s.roster.players) {
              if (m.draftId === undefined || !m.last) continue;
              const d = s.draft.picks.find((x) => x.id === m.draftId);
              if (!d.last) continue;
              checked++;
              const A = m.pos === 'P' ? m.last.pit : m.last.bat;
              const B = m.pos === 'P' ? d.last.pit : d.last.bat;
              const keys = m.pos === 'P' ? ['g', 'outs', 'er', 'w', 's'] : ['g', 'ab', 'h', 'hr', 'rbi'];
              if (keys.some((k) => (A[k] || 0) !== (B[k] || 0))) fails.push(`${d.name}：${d.last.year}年の成績がチームと同期の表で違う`);
            }
            lastYear = s.year;
          }
        }
      }
      if (checked < 50) fails.push(`チェック件数が少なすぎる（${checked}）`);
      return { fails, note: `${checked}件` };
    },
  },
];
