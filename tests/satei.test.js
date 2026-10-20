// 査定ポイント・お立ち台・顔のアバター
const { load, drain, newPlayer } = require('./lib/game');

module.exports = [
  {
    name: '査定ポイントとお立ち台（1シーズン）',
    run() {
      const G = load();
      const fails = [];
      // 1試合の査定：活躍すればプラス、凡退続きならマイナス
      const good = G.calcSatei({}, {}, { kind: 'bat', outcome: 'W', line: { h: 3, hr: 1, rbi: 4, bb: 0, sb: 1, cs: 0 }, pas: [{ code: 'HR' }, { code: '2B' }, { code: '1B' }, { code: 'K' }] });
      const bad = G.calcSatei({}, {}, { kind: 'bat', outcome: 'L', line: { h: 0, hr: 0, rbi: 0, bb: 0, sb: 0, cs: 1 }, pas: [{ code: 'K' }, { code: 'K' }, { code: 'OUT' }, { code: 'OUT' }], fld: { e: 1, fine: 0, cs: 0, pb: 0 } });
      const ace = G.calcSatei({}, {}, { kind: 'pit', outcome: 'W', line: { gs: 1, outs: 27, r: 0, er: 0, k: 10, bb: 1, w: 1 } });
      if (!(good.total > 10)) fails.push(`猛打賞＋本塁打の査定が低い（${good.total}）`);
      if (!(bad.total < -5)) fails.push(`ノーヒット・失策の査定が高い（${bad.total}）`);
      if (!(ace.total > 25)) fails.push(`完封の査定が低い（${ace.total}）`);

      // 1シーズン遊ぶ（強い選手で）
      const s = newPlayer(G, 'OF', { ability: 82, trust: 95 });
      s.flags.gameMode = 'auto';
      const year = s.year;
      for (let i = 0; i < 60 && s.year === year && !s.retired; i++) {
        drain(G, s);
        G.autoAdvance(s, 'w4');
      }
      drain(G, s);
      const h = (s.sateiHist || {})[year];
      if (!h || !h.games) return [...fails, 'シーズンの査定が記録されない'];
      if (!(h.total > 50)) fails.push(`主力選手の査定が低すぎる（${h.total}）`);
      const n = s.story.heroInterviews || 0;
      const said = Object.values(s.story.heroStyle || {}).reduce((a, b) => a + b, 0);
      if (!n) fails.push('お立ち台に一度も上がらない');
      if (said !== n) fails.push(`お立ち台${n}回のうち、答えたのは${said}回`);
      if (!s.ach || !Object.keys(s.ach).some((k) => k.includes('hero1'))) fails.push('「お立ち台デビュー」の実績がつかない');
      return { fails, note: `${year}年 査定+${h.total}（${h.games}試合）・お立ち台${n}回` };
    },
  },
  {
    name: '契約更改に査定が響く',
    run() {
      const G = load();
      const fails = [];
      const s = newPlayer(G, 'SS', { ability: 70, trust: 80 });
      const base = G.contractTarget(s);
      s.satei = { year: s.year, total: 300, games: 140, cat: { bat: 300 }, best: null };
      const high = G.contractTarget(s);
      s.satei.total = -50;
      const low = G.contractTarget(s);
      if (!(high > base && low < high)) fails.push(`査定で提示額が変わらない（なし${base}・高${high}・低${low}）`);
      if (!/査定ポイント/.test(G.sateiText(s))) fails.push('契約更改で査定の内訳が出ない');
      return { fails, note: `査定なし${base}万円・+300で${high}万円・-50で${low}万円` };
    },
  },
  {
    name: '顔のアバター',
    run() {
      const G = load();
      const fails = [];
      // すべてのパーツの組み合わせで描ける
      for (const k of G.FACE_KEYS) {
        for (const o of G.FACE_OPTS[k]) {
          const f = { ...G.randomFace('テスト'), [k]: o.id };
          const svg = G.faceSvg(f, { team: G.teamById('tokyo') });
          if (!svg.startsWith('<svg') || !svg.endsWith('</svg>') || /undefined|NaN/.test(svg)) fails.push(`${G.FACE_LABELS[k]}「${o.name}」がうまく描けない`);
        }
      }
      // 同じ名前の人はいつも同じ顔
      if (JSON.stringify(G.randomFace('佐藤 健太')) !== JSON.stringify(G.randomFace('佐藤 健太'))) fails.push('同じ人の顔が毎回変わる');
      // 自分の顔はセーブに残る
      const s = newPlayer(G, 'P', {});
      const f = G.ensureFace(s.player);
      G.faceStep(f, 'hair', 1);
      const back = G.importSave(G.exportSave(s));
      if (JSON.stringify(back.player.face) !== JSON.stringify(f)) fails.push('顔がセーブに残らない');
      return fails;
    },
  },
];
