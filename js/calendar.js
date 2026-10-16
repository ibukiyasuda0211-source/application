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
    // 3連戦（火〜木・金〜日）ごとに対戦カードを決める番号をふる
    let ser = -1;
    let iser = -1;
    let prev = null;
    for (const x of days) {
      const dt = parse(x.d);
      const dow = dt.getUTCDay();
      const gap = prev ? Math.round((dt - prev.dt) / DAY) : 99;
      if (!prev || dow === 2 || dow === 5 || gap > 1 || prev.inter !== x.inter) {
        if (x.inter) iser++;
        else ser++;
      }
      x.ser = x.inter ? iser : ser;
      prev = { dt, inter: x.inter };
    }
    const rained = days.filter((x) => x.rain);
    let last = parse(days[days.length - 1].d);
    for (let i = 0; i < rainN; i++) {
      last = addDays(last, 1);
      if (last.getUTCDay() === 1) last = addDays(last, 1);
      // 振替試合は、中止になった日と同じカードで行う
      days.push({ d: ymd(last), inter: false, makeup: true, ser: rained[i].ser, makeupOf: rained[i].d });
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
      csDate: ymd(G.dateOfWeek(year, csW, 2)),
      jsDate: ymd(G.dateOfWeek(year, jsW, 5)),
      draftDate: ymd(firstDowOnOrAfter(utc(year, 10, 20), 4)), // 10月下旬の木曜
      rainN,
    };
    cache[year] = c;
    return c;
  };

  G.ymd = ymd;
  G.weekDate = (s, dayIdx = 0) => ymd(G.dateOfWeek(s.year, s.week, dayIdx));

  // 誕生日（MM-DD）
  G.randomBirthday = () => {
    const m = 1 + Math.floor(Math.random() * 12);
    const d = 1 + Math.floor(Math.random() * [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]);
    return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  G.daysInWeek = (week, year) => G.cal(year).byWeek[week] || [];
  G.dayOf = (year, dateStr) => G.cal(year).days.find((x) => x.d === dateStr) || null;

  // ---------- 対戦カード ----------
  // リーグ内は総当たり（サークル方式）を3連戦単位で回す。ホーム／ビジターは一巡ごとに入れ替え
  const roundRobin = (ids, round) => {
    const arr = ids.length % 2 ? [...ids, null] : ids.slice();
    const n = arr.length;
    const r = round % (n - 1);
    const cycle = Math.floor(round / (n - 1));
    const rest = arr.slice(1);
    const rot = [arr[0], ...rest.slice(rest.length - r), ...rest.slice(0, rest.length - r)];
    const out = [];
    for (let i = 0; i < n / 2; i++) {
      let a = rot[i];
      let b = rot[n - 1 - i];
      if (a === null || b === null) continue;
      // 同じ組み合わせは一巡ごとにホームが入れ替わる
      if ((ids.indexOf(a) + ids.indexOf(b) + cycle) % 2) [a, b] = [b, a];
      out.push([a, b]); // [ホーム, ビジター]
    }
    return out;
  };

  const orderCache = {};
  const teamOrder = (year, lgId) => {
    const key = `${year}:${lgId}`;
    if (!orderCache[key]) {
      const rnd = seeded(year * 131 + lgId.length * 977 + lgId.charCodeAt(0));
      const ids = G.TEAMS.filter((t) => t.league === lgId).map((t) => t.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      orderCache[key] = ids;
    }
    return orderCache[key];
  };

  // その日の全カード：[{ lg, home, away }]
  G.dayPairs = (year, day) => {
    const out = [];
    const npb = G.LEAGUES.filter((lg) => !lg.mlb);
    if (day.inter && npb.length === 2) {
      const A = teamOrder(year, npb[0].id);
      const B = teamOrder(year, npb[1].id);
      A.forEach((a, i) => {
        const b = B[(i + day.ser) % B.length];
        const aHome = (day.ser + year) % 2 === 0;
        out.push({ lg: 'inter', home: aHome ? a : b, away: aHome ? b : a });
      });
    }
    for (const lg of G.LEAGUES) {
      if (day.inter && !lg.mlb) continue;
      for (const [home, away] of roundRobin(teamOrder(year, lg.id), day.ser)) out.push({ lg: lg.id, home, away });
    }
    return out;
  };

  // あるチームのその日の相手：{ opp, home } または null
  G.teamGameOn = (year, day, teamId) => {
    for (const x of G.dayPairs(year, day)) {
      if (x.home === teamId) return { opp: x.away, home: true, inter: x.lg === 'inter' };
      if (x.away === teamId) return { opp: x.home, home: false, inter: x.lg === 'inter' };
    }
    return null;
  };
})();
