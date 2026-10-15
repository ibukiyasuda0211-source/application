// メジャーリーグ挑戦（ポスティング・海外FA・日本復帰）
(function () {
  const G = window.G;

  G.LEAGUES.push({ id: 'mlb', name: 'メジャーリーグ', mlb: true });
  G.MLB_TEAMS = [
    { id: 'm_ny', name: 'ニューヨーク・エンパイアーズ', short: 'NY', color: '#1c2b5a', league: 'mlb' },
    { id: 'm_la', name: 'ロサンゼルス・サンセッツ', short: 'LA', color: '#e0662f', league: 'mlb' },
    { id: 'm_bos', name: 'ボストン・ハーバーズ', short: 'BOS', color: '#a3162f', league: 'mlb' },
    { id: 'm_chi', name: 'シカゴ・ウィンディーズ', short: 'CHI', color: '#2a6bd1', league: 'mlb' },
    { id: 'm_sf', name: 'サンフランシスコ・ゴールドラッシュ', short: 'SF', color: '#c7921a', league: 'mlb' },
    { id: 'm_sea', name: 'シアトル・レイニアーズ', short: 'SEA', color: '#0f6e6e', league: 'mlb' },
    { id: 'm_tex', name: 'テキサス・ローンスターズ', short: 'TEX', color: '#9b2335', league: 'mlb' },
    { id: 'm_atl', name: 'アトランタ・ピーチーズ', short: 'ATL', color: '#e8875a', league: 'mlb' },
    { id: 'm_tor', name: 'トロント・オーロラズ', short: 'TOR', color: '#3b5fc0', league: 'mlb' },
    { id: 'm_mia', name: 'マイアミ・フラミンゴス', short: 'MIA', color: '#e0569b', league: 'mlb' },
  ];
  G.TEAMS.push(...G.MLB_TEAMS);

  G.isMLB = (s) => s.player.league === 'mlb';
  G.squadName = (p, squad = p.squad) => (p.league === 'mlb' ? (squad === 'first' ? 'メジャー' : 'マイナー') : squad === 'first' ? '1軍' : '2軍');
  G.YEN_PER_MILLION_USD = 15000; // 100万ドル ≒ 1億5000万円
  G.usdText = (man) => `約${(man / G.YEN_PER_MILLION_USD).toFixed(1)}百万ドル`;

  // 古いセーブデータにMLB球団の情報を足す
  G.ensureTeams = (s) => {
    for (const t of G.TEAMS) {
      if (s.teamStr[t.id] === undefined) s.teamStr[t.id] = Math.round(G.rf(44, 58));
      if (!s.standings[t.id]) s.standings[t.id] = { w: 0, l: 0, d: 0 };
    }
    if (!s.player.league) s.player.league = 'npb';
  };

  G.mlbLeaders = (s) => {
    const others = G.MLB_TEAMS.filter((t) => t.id !== s.player.teamId);
    const mk = (final) => ({ name: `${G.pick(['J.', 'M.', 'A.', 'C.', 'R.', 'D.', 'T.'])}${G.pick(['スミス', 'ジョンソン', 'ロドリゲス', 'ウィリアムズ', 'マルティネス', 'ブラウン', 'ガルシア', 'デービス', 'ミラー', 'ゴンザレス'])}`, team: G.pick(others).short, final });
    s.leaders = {
      avg: mk(G.rf(0.318, 0.345)),
      hits: mk(G.ri(175, 205)),
      hr: mk(G.ri(38, 56)),
      rbi: mk(G.ri(105, 135)),
      sb: mk(G.ri(30, 60)),
      w: mk(G.ri(15, 19)),
      era: mk(G.rf(2.1, 2.8)),
      k: mk(G.ri(210, 260)),
      s: mk(G.ri(35, 45)),
      hld: mk(G.ri(28, 38)),
    };
  };

  // ---------- メジャー挑戦の打診（オフ・第46週） ----------
  G.mlbCheck = (s) => {
    const p = s.player;
    if (G.isMLB(s) || p.age > 34 || s.retired) return;
    if (s.flags.mlbAsked === s.year) return;
    const war = G.seasonWAR(p, s);
    const careerWar = G.careerTotals(s).war + war;
    const overseasFA = p.yearsPro >= 8;
    if (war < 3 && !(careerWar >= 15 && war >= 2)) return;
    if (!overseasFA && p.yearsPro < 4) return;
    if (!overseasFA && !G.chance(p.trust >= 60 ? 0.6 : 0.3)) return;
    s.flags.mlbAsked = s.year;
    const offers = G.shuffle(G.MLB_TEAMS)
      .slice(0, G.ri(2, 3))
      .map((t) => {
        const usd = G.clamp(1 + war * 2.4 + p.popularity * 0.03, 1, 40) * G.rf(0.85, 1.3);
        return { teamId: t.id, salary: Math.round((usd * G.YEN_PER_MILLION_USD) / 10) * 10 };
      });
    const how = overseasFA ? '海外FA権を取得した。' : '球団がポスティング制度でのメジャー挑戦を認めてくれた。';
    s.queue.push({
      kind: 'life',
      id: 'mlb_offer',
      title: 'メジャー挑戦',
      text: `${how}\nメジャーリーグの球団からオファーが届いている！\n\n${offers.map((o) => `・${G.teamById(o.teamId).name}：年俸${G.fmtMoney(o.salary)}（${G.usdText(o.salary)}）`).join('\n')}\n\n夢の舞台に挑戦するか？`,
      data: { offers },
    });
  };

  G.joinMLB = (s, offer) => {
    const p = s.player;
    const team = G.teamById(offer.teamId);
    s.flags.formerTeam = p.teamId;
    if (p.home === 'dorm') p.home = 'apartment';
    p.league = 'mlb';
    p.teamId = team.id;
    p.salary = offer.salary;
    p.squad = G.overall(p) >= 58 ? 'first' : 'second';
    p.trust = 55;
    s.flags.skipContract = s.year;
    s.flags.mlbStart = s.year + 1;
    s.flags.mlbRookie = true;
    if (G.isPitcher(p)) G.assignRole(s);
    s.history.push({ year: s.year, text: `${team.name}と契約、メジャー挑戦` });
    s.titles.push({ year: s.year, name: 'メジャー挑戦' });
    G.buzz(s, 'mlb');
    return `${team.name}と契約！ 年俸${G.fmtMoney(offer.salary)}。\n\n渡米会見には100人を超える記者が詰めかけた。いよいよ世界最高峰の舞台へ！` + G.applyFx(s, { pop: 8, happy: 8 });
  };

  // 日本球界からのオファー
  G.npbOffers = (s) => {
    const p = s.player;
    const ov = G.overall(p);
    const base = Math.max(1500, Math.round(((ov - 40) * 700) / 10) * 10);
    const teams = G.shuffle(G.NPB_TEAMS());
    const former = s.flags.formerTeam ? G.teamById(s.flags.formerTeam) : null;
    const list = former ? [former, ...teams.filter((t) => t.id !== former.id)] : teams;
    return list.slice(0, 2).map((t, i) => ({ teamId: t.id, salary: Math.round((base * (i === 0 && former ? 1.15 : G.rf(0.9, 1.1))) / 10) * 10 }));
  };

  G.joinNPB = (s, offer) => {
    const p = s.player;
    const team = G.teamById(offer.teamId);
    p.league = 'npb';
    p.teamId = team.id;
    p.salary = offer.salary;
    p.squad = G.overall(p) >= 50 ? 'first' : 'second';
    p.trust = 55;
    s.flags.skipContract = s.year;
    if (G.isPitcher(p)) G.assignRole(s);
    s.history.push({ year: s.year, text: `${team.name}で日本球界に復帰` });
    return `${team.name}で日本球界に復帰することになった！ 年俸${G.fmtMoney(offer.salary)}。\n「ただいま」という言葉に、スタンドから大きな拍手が起きた。` + G.applyFx(s, { pop: 4, happy: 6 });
  };

  G.mlbContractTarget = (s) => {
    const p = s.player;
    const war = G.seasonWAR(p, s);
    const target = 11000 + Math.pow(Math.max(0, war), 1.3) * 22000;
    const cur = p.salary;
    const next = target > cur ? cur + (target - cur) * 0.5 : Math.max(11000, cur + (target - cur) * 0.4);
    return Math.round(next / 10) * 10;
  };

  // メジャーでの戦力外
  G.mlbReleaseCheck = (s) => {
    const p = s.player;
    const war = G.seasonWAR(p, s);
    let pr = 0;
    if (war < 0.3 && (p.squad === 'second' || p.age >= 33)) pr = 0.6;
    if (p.age >= 38 && war < 1.5) pr = Math.max(pr, 0.6);
    if (!G.chance(pr)) return;
    s.flags.releasedThisYear = true;
    s.queue.push({ kind: 'life', id: 'mlb_release', title: '自由契約', text: `${G.teamById(p.teamId).name}から、来季の契約を結ばないと告げられた。\n\nこれからどうする？`, data: { offers: G.npbOffers(s) } });
  };

  // ---------- ポストシーズン ----------
  G.mlbPostseason = (s) => {
    const p = s.player;
    const rank = s.final.rank;
    const me = p.squad === 'first' && !p.injury;
    if (rank > 4) {
      s.final.cs = false;
      return;
    }
    const pr = { 1: 0.5, 2: 0.4, 3: 0.3, 4: 0.25 }[rank];
    const win = G.chance(pr);
    s.final.cs = win;
    G.scene(s, 'プレーオフ', win ? `プレーオフを勝ち抜き、ワールドシリーズ進出を決めた！${me ? `\n${p.name}も大舞台で存在感を見せた！` : ''}` : 'プレーオフで敗退。来年こそ頂点へ…。');
    G.log(s, `プレーオフ：${win ? '突破！' : '敗退'}`, 'team');
  };

  G.worldSeries = (s) => {
    const p = s.player;
    if (!s.final || !s.final.cs) return;
    const win = G.chance(0.5);
    const me = p.squad === 'first' && !p.injury;
    const wins = win ? 4 : G.ri(0, 3);
    const losses = win ? G.ri(0, 3) : 4;
    let text = `ワールドシリーズ\n${wins}勝${losses}敗で`;
    if (win) {
      text += '世界一に輝いた！！🎉';
      s.history.push({ year: s.year, text: 'ワールドシリーズ制覇' });
      if (me) {
        s.titles.push({ year: s.year, name: 'ワールドシリーズ制覇' });
        p.popularity = G.clamp(p.popularity + 8, 0, 100);
      }
    } else text += '敗れてしまった…。';
    G.scene(s, 'ワールドシリーズ', text, win ? { big: '世界一' } : {});
    G.log(s, `ワールドシリーズ：${win ? '世界一！' : '敗退'}`, 'team');
  };

  // ---------- 選択肢つきのシーン ----------
  Object.assign(G.LIFE_SCENES, {
    mlb_offer: {
      choices: (s, q) => [
        ...q.data.offers.map((o) => ({ label: `${G.teamById(o.teamId).short}と契約する（${G.fmtMoney(o.salary)}）`, run: (s2) => G.joinMLB(s2, o) })),
        { label: '日本でプレーを続ける', run: (s2) => '今はまだ、このチームで頂点を目指したい。' + G.applyFx(s2, { trust: 5, pop: 2 }) },
      ],
    },
    mlb_release: {
      choices: (s, q) => [
        ...q.data.offers.map((o) => ({ label: `${G.teamById(o.teamId).short}で日本に復帰（${G.fmtMoney(o.salary)}）`, run: (s2) => G.joinNPB(s2, o) })),
        { label: '現役を引退する', run: (s2) => { G.retire(s2, 'メジャーで自由契約となり、現役を引退した'); return null; } },
      ],
    },
    npb_return: {
      choices: (s, q) => [
        ...q.data.offers.map((o) => ({ label: `${G.teamById(o.teamId).short}に入団（${G.fmtMoney(o.salary)}）`, run: (s2) => G.joinNPB(s2, o) })),
        { label: 'やっぱりメジャーに残る', run: (s2) => { s2.player.salary = s2.tmp.offer; return `${G.fmtMoney(s2.player.salary)}で契約を延長した。もう少しこの舞台で戦う！`; } },
      ],
    },
  });
})();
