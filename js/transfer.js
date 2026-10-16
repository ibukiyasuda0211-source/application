// 国内移籍（FA宣言・複数年契約・トレード）
(function () {
  const G = window.G;

  // 国内FA権：高卒は8年、大卒・社会人は7年。行使したら4年後に再取得
  G.faYears = (p) => (p.background === 'hs' ? 8 : 7);
  G.underContract = (s) => {
    const c = s.player.contract;
    return !!c && c.until > s.year;
  };
  const lastRank = (s, teamId) => {
    const t = G.teamById(teamId);
    const r = G.leagueRanking(s, t.league).findIndex((x) => x.id === teamId) + 1;
    return r;
  };

  // ---------- FA権の取得（オフ） ----------
  G.faCheck = (s) => {
    const p = s.player;
    if (G.isMLB(s) || s.retired) return;
    if (p.yearsPro + 1 < G.faYears(p)) return;
    if (s.flags.faYear && s.year - s.flags.faYear < 4) return;
    if (G.underContract(s)) return;
    s.flags.faYear = s.year;
    const overseas = p.yearsPro >= 8 && p.age <= 34;
    s.queue.push({
      kind: 'life',
      id: 'fa_declare',
      title: 'FA権を取得',
      text: `プロ${p.yearsPro + 1}年目のシーズンを終え、${overseas ? '国内・海外の' : '国内'}FA（フリーエージェント）権を取得した。\n\n宣言すれば、他球団の話を聞くことができる。宣言せずに残留すれば、球団は複数年契約を用意してくれるという。\n\n今季：${G.seasonSummaryText(s)}`,
      data: { overseas },
    });
  };

  // 他球団と残留の条件
  const makeOffers = (s) => {
    const p = s.player;
    const war = G.seasonWAR(p, s);
    const base = G.contractTarget(s);
    let n = war >= 4 ? 4 : war >= 2.5 ? 3 : war >= 1 ? 2 : war >= 0 ? (G.chance(0.6) ? 1 : 0) : G.chance(0.2) ? 1 : 0;
    if (p.age >= 35) n = Math.min(n, 1);
    const years = () => (p.age <= 29 ? G.ri(3, 5) : p.age <= 32 ? G.ri(2, 4) : G.ri(1, 2));
    const roles = G.isPitcher(p) ? (p.role === 'SP' ? ['先発ローテーション確約', 'エースとして期待', '開幕投手の候補'] : ['勝ちパターンの中継ぎとして', '抑えとして期待', 'ブルペンの柱として']) : ['レギュラー保証', 'クリーンアップとして期待', '主力として期待'];
    const offers = G.shuffle(G.NPB_TEAMS().filter((t) => t.id !== p.teamId))
      .slice(0, n)
      .map((t) => ({ teamId: t.id, salary: Math.round((base * G.rf(1.05, 1.5)) / 10) * 10, years: years(), role: G.pick(roles), rank: lastRank(s, t.id) }));
    const stay = { teamId: p.teamId, salary: Math.round((base * G.rf(0.95, 1.15)) / 10) * 10, years: Math.max(1, years() - 1), role: '生え抜きとして', rank: lastRank(s, p.teamId) };
    return { offers, stay };
  };
  const offerText = (o, s) => `${G.teamById(o.teamId).name}（今季${o.rank}位）：${o.years}年 総額${G.fmtMoney(o.salary * o.years)}（年俸${G.fmtMoney(o.salary)}）・${o.role}`;

  const sign = (s, o, how) => {
    const p = s.player;
    const team = G.teamById(o.teamId);
    const moving = o.teamId !== p.teamId;
    p.salary = o.salary;
    p.contract = { until: s.year + o.years, salary: o.salary, years: o.years, since: s.year };
    s.flags.skipContract = s.year;
    if (moving) {
      G.moveTeam(s, o.teamId);
      p.trust = 60;
      s.history.push({ year: s.year, text: `FAで${team.name}に移籍（${o.years}年契約）` });
      G.buzz(s, 'fa', { team: team.short });
      G.log(s, `FAで${team.name}へ移籍。${o.years}年総額${G.fmtMoney(o.salary * o.years)}`, 'good', 'event', true);
      return `${how}${team.name}への移籍を決断した！\n${o.years}年総額${G.fmtMoney(o.salary * o.years)}の大型契約。「${o.role}」——新天地での挑戦が始まる。`;
    }
    s.history.push({ year: s.year, text: `${how === '' ? '' : '宣言残留・'}${team.name}と${o.years}年契約` });
    p.popularity = G.clamp(p.popularity + 3, 0, 100);
    G.log(s, `${team.name}と${o.years}年契約（年俸${G.fmtMoney(o.salary)}）`, 'good', 'event', true);
    return `${team.name}に残ることを決めた！ ${o.years}年契約、年俸${G.fmtMoney(o.salary)}。\nファンから大きな拍手が送られた。`;
  };

  // 移籍の処理（FA・トレード共通）
  G.moveTeam = (s, teamId) => {
    const p = s.player;
    const oldLeague = G.teamById(p.teamId).league;
    p.teamId = teamId;
    const u = G.ensureUsage(s);
    u.status = 'bench';
    u.slot = null;
    u.form = [];
    u.farmForm = [];
    u.benchGames = 0;
    s.flags.downUntil = 0;
    G.ensureRoster(s);
    G.newSeasonBars(s);
    if (G.isPitcher(p) && G.assignRole && p.squad === 'first') G.assignRole(s);
    if (G.teamById(teamId).league !== oldLeague && G.phaseOf(s.week, s.year).id === 'season') G.genLeaders(s);
  };

  const origMlb = G.mlbCheck;
  G.mlbCheck = (s) => {
    if (s.queue.some((q) => q.id === 'fa_declare' || q.id === 'fa_offers')) return;
    origMlb(s);
  };

  G.LIFE_SCENES.fa_declare = {
    choices: (s, q) => {
      const list = [
        {
          label: 'FA宣言して、他球団の話を聞く',
          run: (s2) => {
            const { offers, stay } = makeOffers(s2);
            if (!offers.length) {
              const r = sign(s2, { ...stay, years: 1, salary: Math.round((stay.salary * 0.9) / 10) * 10 }, '');
              return `FA宣言をしたが、他球団からの声はかからなかった…。\n\n${r}`;
            }
            s2.queue.unshift({
              kind: 'life',
              id: 'fa_offers',
              title: 'FA交渉',
              text: `FA宣言をすると、${offers.length}球団から獲得の申し入れがあった！\n\n${offers.map((o) => `・${offerText(o, s2)}`).join('\n')}\n\n古巣も条件を示してくれた。\n・${offerText(stay, s2)}\n\nどこでプレーする？`,
              data: { offers, stay },
            });
            G.buzz(s2, 'fadeclare');
            return null;
          },
        },
        {
          label: '宣言せずに残留する（複数年契約）',
          run: (s2) => {
            const { stay } = makeOffers(s2);
            return '権利を行使せず、チームに残ることにした。\n' + sign(s2, { ...stay, salary: Math.round((stay.salary * 1.05) / 10) * 10, years: stay.years + 1 }, '');
          },
        },
      ];
      if (q.data.overseas) {
        list.push({
          label: '海外FA権でメジャーに挑戦する',
          run: (s2) => {
            s2.flags.mlbAsked = null;
            const before = s2.queue.length;
            origMlb(s2);
            if (s2.queue.length > before) {
              s2.queue.unshift(s2.queue.pop());
              return null;
            }
            return 'メジャー球団と交渉したが、満足できる条件は出てこなかった…。今回は日本でプレーを続けることにした。' + G.applyFx(s2, { exp: { mind: 10 } });
          },
        });
      }
      return list;
    },
  };

  G.LIFE_SCENES.fa_offers = {
    choices: (s, q) => [
      { label: `残留する（${q.data.stay.years}年・年俸${G.fmtMoney(q.data.stay.salary)}）`, run: (s2) => sign(s2, q.data.stay, '宣言残留') },
      ...q.data.offers.map((o) => ({
        label: `${G.teamById(o.teamId).short}へ移籍（${o.years}年・年俸${G.fmtMoney(o.salary)}）`,
        run: (s2) => sign(s2, o, 'FA宣言の末、'),
      })),
    ],
  };

  // 複数年契約の間は契約更改なし
  const origContract = G.contractScene;
  G.contractScene = (s) => {
    const p = s.player;
    if (G.underContract(s) && p.age < 44 && !G.isMLB(s)) {
      const c = p.contract;
      const n = s.year - c.since;
      G.scene(s, '契約更改', `${c.years}年契約の${n}年目が終わった。\n来季も年俸${G.fmtMoney(p.salary)}で契約が続く（${c.until}年まで）。\n\n${G.seasonSummaryText(s)}`);
      return;
    }
    origContract(s);
  };
  const origRelease = G.releaseCheck;
  G.releaseCheck = (s) => {
    if (G.underContract(s)) {
      s.flags.releasedThisYear = false;
      return;
    }
    origRelease(s);
  };

  // ---------- トレード ----------
  G.canRequestTrade = (s) => {
    const p = s.player;
    if (s.after || s.retired) return '現役のときだけ';
    if (G.isMLB(s)) return 'メジャーでは使えない';
    if (p.yearsPro < 2) return 'プロ3年目から';
    if (s.flags.tradeRequest) return '志願中（球団が検討している）';
    if (G.underContract(s)) return '複数年契約中';
    const u = p.usage || {};
    const regular = p.squad === 'first' && (G.isPitcher(p) ? true : u.status === 'starter');
    if (regular) return '主力として出場しているうちは志願できない';
    return '';
  };

  G.requestTrade = (s) => {
    s.flags.tradeRequest = true;
    s.player.trust = G.clamp(s.player.trust - 6, 0, 100);
    return '球団にトレードを志願した。「出場機会を求めて、ほかのチームで勝負したいんです」\n球団の空気は少し冷えたが、検討してくれるという。';
  };

  const tradeScene = (s) => {
    const p = s.player;
    const dest = G.pick(G.NPB_TEAMS().filter((t) => t.id !== p.teamId));
    const partnerPos = G.pick(['投手', '捕手', '内野手', '外野手']);
    const partner = `${G.randomMaleName()}${partnerPos}`;
    const money = G.chance(0.25);
    const why = s.flags.tradeRequest ? 'トレード志願が受け入れられた。' : p.squad === 'second' ? '出場機会を求めての移籍になる。' : `${dest.short}があなたの力を高く評価しているという。`;
    s.queue.push({
      kind: 'life',
      id: 'trade',
      title: 'トレード通告',
      text: `球団事務所に呼ばれた。\n\n「${dest.name}とのトレードが成立した。${money ? '金銭トレードだ' : `交換相手は${partner}だ`}」\n\n${why}\n${G.fmtDate(G.weekDate(s, 1))}付けで${dest.name}の一員になる。`,
      data: { teamId: dest.id },
    });
  };

  G.tradeCheck = (s, offseason) => {
    const p = s.player;
    if (G.isMLB(s) || s.retired || s.after || p.yearsPro < 2) return;
    if (p.contract && p.contract.until >= s.year) return; // 複数年契約中はトレードなし
    if (s.flags.tradedYear === s.year || s.queue.some((q) => q.kind !== 'info')) return;
    const u = p.usage || {};
    const surplus = p.squad === 'second' || (!G.isPitcher(p) && u.status !== 'starter');
    let pr = offseason ? 0.04 : 0.003;
    if (surplus && p.age >= 25) pr = offseason ? 0.12 : 0.01;
    if (s.flags.tradeRequest) pr = offseason ? 0.65 : 0.05;
    if (G.chance(pr)) tradeScene(s);
  };

  G.LIFE_SCENES.trade = {
    choices: (s, q) => {
      const team = G.teamById(q.data.teamId);
      const list = [
        {
          label: '新天地で心機一転、がんばる！',
          run: (s2) => {
            const p = s2.player;
            const from = G.teamById(p.teamId).name;
            const season = G.phaseOf(s2.week, s2.year).id === 'season';
            p.trust = G.clamp(p.trust * 0.5 + 30, 20, 70);
            if (season) p.squad = p.squad === 'first' || p.trust >= 45 ? 'first' : 'second';
            G.moveTeam(s2, team.id);
            s2.flags.tradedYear = s2.year;
            s2.flags.tradeRequest = false;
            s2.history.push({ year: s2.year, text: `トレードで${team.name}に移籍` });
            G.buzz(s2, 'trade', { team: team.short, from });
            G.log(s2, `トレードで${team.name}へ移籍`, 'bad', 'event', true);
            return `${from}のロッカーを片付け、${team.name}のユニフォームに袖を通した。\n「チャンスをくれた${team.short}のために、結果で恩返しします！」` + G.applyFx(s2, { exp: { mind: 15 }, happy: -4, pop: 1 });
          },
        },
      ];
      if (s.player.age >= 30) list.push({ label: 'トレードを拒んで現役を引退する', run: (s2) => { G.retire(s2, 'トレードを拒否し、現役を引退した'); return null; } });
      return list;
    },
  };

  const origWeekSeason = G.weekSeason;
  G.weekSeason = (s, gw) => {
    origWeekSeason(s, gw);
    const c = G.cal(s.year);
    const deadline = G.weekOfDate(s.year, new Date(Date.UTC(s.year, 6, 31)));
    if (s.week >= c.startW + 3 && s.week <= deadline) G.tradeCheck(s, false);
  };

  const origScheduled = G.scheduled;
  G.scheduled = (s) => {
    origScheduled(s);
    const c = G.cal(s.year);
    if (s.week === c.faW + 1 && !s.flags.releasedThisYear && !s.ended && !s.retired) G.tradeCheck(s, true);
  };
})();
