// 実際の日付とプロ野球の年間日程
// ・開幕は3月の最終金曜日（金・土・日の3連戦から）
// ・その後は火曜〜日曜の週6試合、月曜は移動日
// ・5月末から3週間は交流戦（18試合）。終了後は数日の調整期間
// ・7月下旬にオールスター休み
// ・雨天中止になった試合はシーズン終盤に組み込まれる
// ・143試合。その後クライマックスシリーズ（10月中旬）→ 日本シリーズ（10月下旬）
(function () {
  const G = window.G;

  G.DOW = ['日', '月', '火', '水', '木', '金', '土'];
  const DAY = 86400000;
  const utc = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const addDays = (date, n) => new Date(date.getTime() + n * DAY);
  const ymd = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  const parse = (str) => {
    const [y, m, d] = str.split('-').map(Number);
    return utc(y, m, d);
  };

  // 第1週＝1月4日を含む週の月曜日から
  G.week1Monday = (year) => {
    const jan4 = utc(year, 1, 4);
    const dow = (jan4.getUTCDay() + 6) % 7; // 月曜=0
    return addDays(jan4, -dow);
  };
  G.weekOfDate = (year, date) => Math.floor((date.getTime() - G.week1Monday(year).getTime()) / (7 * DAY)) + 1;
  G.dateOfWeek = (year, week, dayIndex = 0) => addDays(G.week1Monday(year), (week - 1) * 7 + dayIndex);

  G.fmtDate = (d, withDow = true) => {
    const date = typeof d === 'string' ? parse(d) : d;
    return `${date.getUTCMonth() + 1}月${date.getUTCDate()}日${withDow ? `(${G.DOW[date.getUTCDay()]})` : ''}`;
  };

  G.weekLabel = (year, week) => {
    const a = G.dateOfWeek(year, week, 0);
    const b = G.dateOfWeek(year, week, 6);
    const sameMonth = a.getUTCMonth() === b.getUTCMonth();
    return `${G.fmtDate(a)}〜${sameMonth ? `${b.getUTCDate()}日(${G.DOW[b.getUTCDay()]})` : G.fmtDate(b)}`;
  };

  // 年ごとに決まった乱数（同じ年なら同じ日程になる）
  const seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const lastDowOnOrBefore = (date, dow) => addDays(date, -((date.getUTCDay() - dow + 7) % 7));
  const firstDowOnOrAfter = (date, dow) => addDays(date, (dow - date.getUTCDay() + 7) % 7);

  const cache = {};
  G.cal = (year) => {
    if (cache[year]) return cache[year];
    const rnd = seeded(year * 7919);
    const opening = lastDowOnOrBefore(utc(year, 3, 31), 5); // 3月最終金曜
    const interStart = firstDowOnOrAfter(utc(year, 5, 26), 2); // 5月26日以降の最初の火曜
    const asWeekMon = lastDowOnOrBefore(utc(year, 7, 22), 1); // オールスター週の月曜
    const TOTAL = 143;
    const days = [];
    let interCount = 0;
    let resumeAfterInter = null;
    for (let d = opening; days.length < TOTAL; d = addDays(d, 1)) {
      const dow = d.getUTCDay();
      if (d.getTime() < addDays(opening, 3).getTime()) {
        days.push({ d: ymd(d), inter: false });
        continue;
      }
      if (dow === 1) continue; // 月曜は移動日
      if (d >= asWeekMon && d < addDays(asWeekMon, 4)) continue; // オールスター休み（月〜木）
      if (d >= interStart && interCount < 18) {
        days.push({ d: ymd(d), inter: true });
        interCount++;
        if (interCount === 18) resumeAfterInter = firstDowOnOrAfter(addDays(d, 1), 5);
        continue;
      }
      if (resumeAfterInter && d < resumeAfterInter) continue; // 交流戦明けの調整期間
      days.push({ d: ymd(d), inter: false });
    }
    // 雨天中止（4〜8試合）→ シーズン終盤に振替
    const rainN = 4 + Math.floor(rnd() * 5);
    const candidates = days.filter((x) => !x.inter && x.d.slice(5, 7) >= '04' && x.d.slice(5, 7) <= '09');
    const rainSet = new Set();
    while (rainSet.size < rainN) rainSet.add(candidates[Math.floor(rnd() * candidates.length)].d);
    for (const x of days) if (rainSet.has(x.d)) x.rain = true;
    let last = parse(days[days.length - 1].d);
    for (let i = 0; i < rainN; i++) {
      last = addDays(last, 1);
      if (last.getUTCDay() === 1) last = addDays(last, 1);
      days.push({ d: ymd(last), inter: false, makeup: true });
    }
    const byWeek = {};
    for (const x of days) {
      const w = G.weekOfDate(year, parse(x.d));
      (byWeek[w] = byWeek[w] || []).push(x);
    }
    const lastGame = parse(days[days.length - 1].d);
    const startW = G.weekOfDate(year, opening);
    const endW = G.weekOfDate(year, lastGame);
    const wk = (m, d) => G.weekOfDate(year, utc(year, m, d));
    const csDate = firstDowOnOrAfter(utc(year, 10, 8), 6); // 10月第2土曜ごろ
    const csW = Math.max(endW + 1, G.weekOfDate(year, csDate) + 1);
    const jsW = Math.max(csW + 1, wk(10, 25));
    const c = {
      year,
      days,
      byWeek,
      opening: ymd(opening),
      lastGame: ymd(lastGame),
      startW,
      endW,
      campW: wk(2, 1),
      openW: wk(2, 22),
      interW: [G.weekOfDate(year, interStart), G.weekOfDate(year, interStart) + 2],
      allstarW: G.weekOfDate(year, asWeekMon),
      allstarDates: [ymd(addDays(asWeekMon, 2)), ymd(addDays(asWeekMon, 3))],
      csW,
      jsW,
      awardsW: Math.max(jsW + 1, wk(11, 26)),
      releaseW: jsW + 1,
      faW: jsW + 2,
      contractW: Math.max(jsW + 3, wk(12, 5)),
      fallEndW: wk(11, 30),
      rainN,
    };
    cache[year] = c;
    return c;
  };

  G.daysInWeek = (week, year) => G.cal(year).byWeek[week] || [];
})();
