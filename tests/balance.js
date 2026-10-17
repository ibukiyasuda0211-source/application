// バランス確認：おまかせで何人分もの野球人生を走らせ、成績やお金の分布を表示する
//   node tests/balance.js [人数=60]
// 「おまかせ」で遊んだ平均的なプレイヤーの結果。自分で丁寧に育てればもっと上を目指せる前提で見る。
const { load, drain } = require('./lib/game');

const N = Number(process.argv[2]) || 60;
const pct = (arr, q) => {
  const a = [...arr].sort((x, y) => x - y);
  return a.length ? a[Math.min(a.length - 1, Math.floor(q * a.length))] : 0;
};
const fmt = (n) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString() : Math.round(n * 10) / 10);
const rows = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const G = load();
  const pos = G.pick(['P', 'P', 'C', '1B', '2B', '3B', 'SS', 'OF', 'OF']);
  const s = G.newGame({ name: '山田 太郎', position: pos, hand: G.pick(['RR', 'RL', 'LL']), background: G.pick(['hs', 'univ', 'corp']), growth: 'random' }, 0);
  const p = s.player;
  s.flags.autoPlan = { train: 'smart', priv: 'smart', raise: true, choose: true };
  let money30 = null;
  let regYears = 0;
  let firstRegularAge = null;
  let maxSalary = 0;
  for (let guard = 0; !s.retired && guard < 400; guard++) {
    drain(G, s, (q) => {
      if (q.kind === 'contract') {
        const war = G.seasonWAR(p, s);
        return p.age >= 37 && war < 1 && G.sceneChoices(s, q).length >= 3 ? 2 : 0; // 衰えたら引退
      }
      if (q.id === 'mlb_offer') return 0;
      return 0;
    });
    if (s.retired) break;
    const y = s.year;
    G.autoAdvance(s, 'year');
    if (s.year !== y) {
      const c = s.career[s.career.length - 1];
      if (c && c.year === y) {
        const reg = G.isPitcher(p) ? c.pit.outs >= 400 || c.pit.g >= 45 : c.bat.pa >= 400;
        if (reg) {
          regYears++;
          if (firstRegularAge === null) firstRegularAge = c.age;
        }
        maxSalary = Math.max(maxSalary, c.salary);
      }
      if (p.age === 30) money30 = p.money;
    }
  }
  const tot = G.careerTotals(s);
  const meikyu = G.isPitcher(p) ? tot.pit.w >= 200 || tot.pit.s >= 250 : tot.bat.h >= 2000;
  const titles = s.titles.filter((t) => !['メジャー挑戦', '日本一', 'ワールドシリーズ制覇'].includes(t.name));
  rows.push({
    pit: G.isPitcher(p),
    retireAge: s.retired ? s.retired.age : p.age,
    years: s.career.length,
    war: tot.war,
    h: tot.bat.h,
    hr: tot.bat.hr,
    w: tot.pit.w,
    sv: tot.pit.s,
    titles: titles.length,
    mvp: titles.filter((t) => /MVP$/.test(t.name) && !/オールスター|日本シリーズ/.test(t.name)).length,
    meikyu,
    mlb: s.titles.some((t) => t.name === 'メジャー挑戦'),
    regYears,
    firstRegularAge,
    maxSalary,
    money30,
    moneyEnd: p.money,
    earnings: s.totalEarnings,
    happy: s.happyWeeks ? s.happySum / s.happyWeeks : p.happy,
    married: !!G.spouse(s),
    kids: p.kids.length,
  });
  if ((i + 1) % 10 === 0) process.stderr.write(`${i + 1}人 `);
}
process.stderr.write('\n');

const B = rows.filter((r) => !r.pit);
const P = rows.filter((r) => r.pit);
const line = (label, arr, unit = '') => console.log(`  ${label.padEnd(14, '　')} 中央値 ${fmt(pct(arr, 0.5))}${unit}　上位25% ${fmt(pct(arr, 0.75))}${unit}　上位10% ${fmt(pct(arr, 0.9))}${unit}　最高 ${fmt(pct(arr, 1))}${unit}`);
const rate = (label, n, d) => console.log(`  ${label.padEnd(14, '　')} ${d ? Math.round((n / d) * 100) : 0}%（${n}/${d}人）`);
console.log(`\n${N}人分の野球人生（おまかせ）　${((Date.now() - t0) / 1000).toFixed(0)}秒\n`);
console.log('■ キャリア');
line('引退した年齢', rows.map((r) => r.retireAge), '歳');
line('通算WAR', rows.map((r) => r.war));
line('レギュラー年数', rows.map((r) => r.regYears), '年');
rate('レギュラー経験', rows.filter((r) => r.regYears > 0).length, N);
line('初レギュラーの年齢', rows.filter((r) => r.firstRegularAge).map((r) => r.firstRegularAge), '歳');
console.log(`■ 野手（${B.length}人）`);
line('通算安打', B.map((r) => r.h));
line('通算本塁打', B.map((r) => r.hr));
console.log(`■ 投手（${P.length}人）`);
line('通算勝利', P.map((r) => r.w));
line('通算セーブ', P.map((r) => r.sv));
console.log('■ 栄誉');
line('タイトル・表彰', rows.map((r) => r.titles), '個');
rate('MVP経験', rows.filter((r) => r.mvp > 0).length, N);
rate('名球会', rows.filter((r) => r.meikyu).length, N);
rate('メジャー挑戦', rows.filter((r) => r.mlb).length, N);
console.log('■ お金（万円）');
line('最高年俸', rows.map((r) => r.maxSalary));
line('30歳の所持金', rows.filter((r) => r.money30 !== null).map((r) => r.money30));
line('引退時の所持金', rows.map((r) => r.moneyEnd));
line('生涯年収', rows.map((r) => r.earnings));
console.log('■ 私生活');
line('平均充実度', rows.map((r) => r.happy));
rate('結婚', rows.filter((r) => r.married).length, N);
