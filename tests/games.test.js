// 試合：スコアボード・メッセージ・勝負どころが、実際の結果と食い違わないか
const { load, drain, newPlayer } = require('./lib/game');

const num = (x) => (typeof x === 'number' ? x : x === 'X' ? 0 : parseInt(x, 10));

function checkGame(G, s, r, clutchCtx, fails) {
  const p = s.player;
  const b = r.box;
  const l = r.line;
  const bad = (msg) => fails.push(`${r.date} ${msg}`);
  for (const side of [b.away, b.homeT]) {
    const sum = side.line.reduce((a, x) => a + num(x), 0);
    if (sum !== side.R) bad(`イニングの合計${sum}と得点${side.R}が合わない`);
  }
  const ourR = b.home ? b.homeT.R : b.away.R;
  const oppR = b.home ? b.away.R : b.homeT.R;
  if (ourR !== r.score[0] || oppR !== r.score[1]) bad('スコアボードと試合結果の得点が合わない');
  if (b.homeT.line.includes('X') && !(b.homeT.R > b.away.R)) bad('「X」なのにホームが勝っていない');
  if (r.outcome === 'W' && r.score[0] <= r.score[1]) bad('勝ちなのにスコアが負け');
  if (r.outcome === 'L' && r.score[0] >= r.score[1]) bad('負けなのにスコアが勝ち');
  const rv = G.planReview(s, r);
  if (rv && /読みが当たった|ねじ伏せた|自分の/.test(rv.text) && G.judgeGame(r) !== 'good') bad(`好評価なのに結果が悪い：${rv.text}`);
  if (rv && /思うつぼ|相手が上|打たれて/.test(rv.text) && G.judgeGame(r) === 'good') bad(`悪評価なのに結果が良い：${rv.text}`);
  if (r.kind === 'bat') {
    if (l.rbi > r.score[0] || l.r > r.score[0]) bad('打点・得点がチームの得点を超える');
    if (b.hrs.length !== l.hr) bad('スコアボードの本塁打数が合わない');
  }
  if (r.kind === 'pit') {
    const me = p.name;
    if (l.r > r.score[1]) bad('自分の失点が相手の得点を超える');
    if (l.w && b.w !== me) bad('勝利投手が自分になっていない');
    if (l.l && b.l !== me) bad('敗戦投手が自分になっていない');
    if (l.s && b.sv !== me) bad('セーブが自分になっていない');
    if (!l.w && b.w === me) bad('勝っていないのに勝利投手');
    const oppArr = b.home ? b.away.line : b.homeT.line;
    const ourArr = b.home ? b.homeT.line : b.away.line;
    if (r.innings && r.startInning === 1) r.innings.forEach((x, i) => num(oppArr[i]) !== x && bad(`先発した${i + 1}回の失点が合わない`));
    const m = r.situation && r.situation.match(/^(\d)回、(\d)点リード/);
    if (m) {
      const k = +m[1];
      const lead = +m[2];
      const ob = ourArr.slice(0, k - 1).reduce((a, x) => a + num(x), 0);
      const tb = oppArr.slice(0, k - 1).reduce((a, x) => a + num(x), 0);
      if (ob - tb !== lead) bad(`登板時のリードが合わない（${r.situation}）`);
    }
  }
  if (r.clutch && r.clutch.kind === 'bat' && clutchCtx) {
    const c = clutchCtx;
    const ourArr = b.home ? b.homeT.line : b.away.line;
    const oppArr = b.home ? b.away.line : b.homeT.line;
    if (b.home !== c.bottom) bad('勝負どころの表・裏とホーム/ビジターが合わない');
    const ob = ourArr.slice(0, c.inning - 1).reduce((a, x) => a + num(x), 0);
    const tb = oppArr.slice(0, c.bottom ? c.inning : c.inning - 1).reduce((a, x) => a + num(x), 0);
    if (ob - tb !== c.diff) bad('勝負どころの直前の点差が合わない');
    if (num(ourArr[c.inning - 1]) < r.clutch.pa.rbi) bad('勝負どころの回の得点が打点より少ない');
    if (r.clutch.verdict === 'sayonara' && (r.outcome !== 'W' || !String(b.homeT.line[b.n - 1]).includes('x'))) bad('サヨナラなのに勝っていない・xがない');
  }
  if (r.clutch && r.clutch.kind === 'pit' && ['K', 'OUT'].includes(r.clutch.how) && l.r) bad('ピンチを抑えたのに失点がある');
}

function season(pos, ability, fails, counts) {
  const G = load();
  const s = newPlayer(G, pos, { ability, trust: 90 });
  const p = s.player;
  if (pos === 'P') p.prefRole = ability.stamina < 50 ? 'CL' : 'SP';
  s.queue = [];
  let clutchCtx = null;
  // 勝負どころが起きやすいように
  for (let guard = 0; s.year < s.startYear + 1 && guard < 3000; guard++) {
    drain(G, s);
    if (s.gw) {
      if (s.gw.last) {
        counts.games++;
        if (s.gw.last.clutch) counts.clutch++;
        checkGame(G, s, s.gw.last, clutchCtx, fails);
        clutchCtx = null;
        G.stepGames(s, null);
        continue;
      }
      if (s.gw.awaitClutch) {
        clutchCtx = { ...s.gw.cur.own.clutch };
        G.stepGames(s, null, G.pick(G.clutchChoices(s, s.gw.cur.own)).id);
        continue;
      }
      if (s.gw.await) {
        G.stepGames(s, G.pick(G.approachList(p)).id);
        continue;
      }
    }
    G.doAction(s, p.stamina < 40 ? 'rest' : 'mental', 'relax');
  }
  // 自分のチームと他球団の試合数
  const st = s.standings;
  void st;
}

module.exports = [
  {
    name: '試合結果・スコアボード・勝負どころの整合性',
    run() {
      const fails = [];
      const counts = { games: 0, clutch: 0 };
      season('SS', 68, fails, counts);
      season('OF', 72, fails, counts);
      season('P', { velocity: 150, control: 68, stamina: 72 }, fails, counts);
      season('P', { velocity: 152, control: 70, stamina: 30 }, fails, counts);
      if (counts.games < 300) fails.push(`チェックした試合が少なすぎる（${counts.games}）`);
      return { fails, note: `${counts.games}試合・勝負どころ${counts.clutch}回` };
    },
  },
];
