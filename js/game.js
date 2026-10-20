// ゲーム進行（週送り・年間スケジュール・契約・引退）
(function () {
  const G = window.G;

  G.TRAIN_EXP_SCALE = 0.6; // 練習でもらえる経験点の全体の量（バランス調整用）
  G.PHASE_MUL = { jan: 1.0, camp: 1.4, open: 1.0, season: 0.55, post: 0.7, fall: 1.25, off: 0.85 };
  G.COND_TRAIN_MUL = [0.75, 0.9, 1.0, 1.1, 1.25];

  G.INJURIES = [
    { name: '軽い捻挫', w: [1, 2], weight: 40 },
    { name: '太ももの肉離れ', w: [2, 5], weight: 30 },
    { name: '脇腹痛', w: [2, 4], weight: 20 },
    { name: '疲労骨折', w: [6, 12], weight: 8 },
    { name: '靭帯損傷', w: [14, 26], weight: 2 },
  ];
  G.PITCHER_INJURIES = [
    { name: '肩の炎症', w: [2, 6], weight: 30 },
    { name: '肘の張り', w: [1, 3], weight: 35 },
    { name: '太ももの肉離れ', w: [2, 5], weight: 25 },
    { name: '肘の靭帯損傷', w: [16, 30], weight: 3 },
    { name: '疲労骨折', w: [6, 12], weight: 7 },
  ];

  // cat: ログの分類（game 試合 / usage 起用 / life 私生活 / train 練習 / event 出来事 / sns / ach 実績）
  // imp: 重要な出来事（年表に残るもの）
  const log = (s, text, cls = '', cat = null, imp = false) => {
    const e = { y: s.year, w: s.week, text, cls };
    if (cat) e.cat = cat;
    if (imp) e.imp = true;
    s.log.push(e);
    if (s.log.length > 600) s.log.splice(0, s.log.length - 600);
  };
  G.log = log;

  const scene = (s, title, text, extra = {}) => s.queue.push({ kind: 'info', title, text, ...extra });
  G.scene = scene;

  // ---------- ニューゲーム ----------
  const newGameCore = (opt, slot) => {
    const p = G.createPlayer(opt);
    const team = G.pick(G.NPB_TEAMS());
    p.teamId = team.id;
    const rank = G.draftRank(p);
    const terms = G.DRAFT_TERMS[rank];
    p.salary = terms.salary;
    p.money = terms.bonus;
    p.draftRank = rank;
    p.number = rank === 1 ? G.ri(1, 25) : rank <= 3 ? G.ri(10, 50) : G.ri(30, 69);
    p.trust = { 1: 45, 2: 40, 3: 36, 4: 33, 5: 30, 6: 28 }[rank] + Math.round((G.overall(p) - 40) * 0.5);
    p.trust = G.clamp(p.trust, 10, 60);
    if (G.isPitcher(p)) p.role = p.prefRole === 'SP' && p.pitcher.stamina >= 45 ? 'SP' : p.prefRole === 'CL' ? 'CL' : 'RP';

    const s = {
      version: 1,
      slot,
      year: new Date().getFullYear() + 1,
      week: 1,
      player: p,
      npc: { senpai: G.randomMaleName(), rival: G.randomMaleName(), coach: G.pick(G.SURNAMES) },
      teamStr: {},
      standings: {},
      stats: { bat: G.emptyBat(), pit: G.emptyPit(), fld: G.emptyFld() },
      farm: { bat: G.emptyBat(), pit: G.emptyPit() },
      open: { bat: G.emptyBat(), pit: G.emptyPit() },
      leaders: null,
      career: [],
      titles: [],
      history: [],
      log: [],
      flags: { rookieEligible: true },
      tmp: {},
      queue: [],
      ended: false,
      startYear: null,
      totalEarnings: terms.bonus + terms.salary,
    };
    s.startYear = s.year;
    G.initLife(s);
    p.league = 'npb';
    G.genDraftClass(s);
    for (const t of G.TEAMS) s.teamStr[t.id] = Math.round(G.rf(42, 58));
    G.resetStandings(s);
    G.genLeaders(s);

    const posName = G.positionName(p);
    const bg = G.BACKGROUNDS.find((b) => b.id === p.background);
    scene(
      s,
      'ドラフト会議',
      `「第${rank}巡選択希望選手 ${team.name}……${p.name}、${bg.name === '高卒' ? '高校生' : bg.name === '大卒' ? '大学生' : '社会人'}、${posName}」\n\n${team.name}からドラフト${rank}位で指名された！`,
      { big: `ドラフト${rank}位` },
    );
    scene(
      s,
      '入団会見',
      `${team.name}と契約を結んだ。\n\n契約金：${G.fmtMoney(terms.bonus)}\n年俸：${G.fmtMoney(terms.salary)}\n背番号：${p.number}\n\n「目標は球界を代表する選手になることです！」\nいよいよプロ野球選手としての人生が始まる！`,
    );
    scene(
      s,
      '遊び方',
      '毎週「練習」と「オフの過ごし方」をひとつずつ選んで、プロ野球選手としての人生を歩もう。\n\n・練習で「経験点」をためて「能力アップ」で能力を上げる\n・オフは自由。先輩と食事、デート、趣味、帰省、取材…出会いや人間関係が人生を変える\n・体力が減るとケガをしやすく、充実度が下がると調子を崩しやすい\n・2軍で結果を出して首脳陣の評価を上げると1軍昇格\n・シーズン中は1試合ずつ「この試合で意識すること」を選べる（作戦と相手との相性で結果が変わる）\n・オフには契約更改。活躍すれば年俸アップ！\n・恋愛、結婚、子育て、引っ越し…引退後の人生まで、すべてはあなた次第\n\nめざせ、名球会。そして最高の人生！',
    );
    log(s, `${team.name}にドラフト${rank}位で入団！`, 'good');
    return s;
  };
  G.newGame = (opt, slot) => {
    const s = newGameCore(opt, slot);
    G.emit('newGame', s);
    return s;
  };

  G.resetStandings = (s) => {
    s.standings = {};
    for (const t of G.TEAMS) s.standings[t.id] = { w: 0, l: 0, d: 0 };
  };

  const genLeadersCore = (s) => {
    const p = s.player;
    if (p.league === 'mlb') return G.mlbLeaders(s);
    const league = G.teamById(p.teamId).league;
    const others = G.TEAMS.filter((t) => t.league === league && t.id !== p.teamId);
    const mk = (final) => ({ name: G.randomMaleName(), team: G.pick(others).short, final });
    s.leaders = {
      avg: mk(G.rf(0.312, 0.342)),
      hits: mk(G.ri(158, 182)),
      hr: mk(G.ri(27, 44)),
      rbi: mk(G.ri(85, 112)),
      sb: mk(G.ri(20, 40)),
      w: mk(G.ri(11, 16)),
      era: mk(G.rf(1.75, 2.55)),
      k: mk(G.ri(145, 195)),
      s: mk(G.ri(28, 42)),
      hld: mk(G.ri(30, 44)),
    };
  };
  G.genLeaders = (s) => {
    genLeadersCore(s);
    G.emit('leaders', s);
  };

  G.leagueRanking = (s, leagueId) => {
    const ids = G.TEAMS.filter((t) => t.league === leagueId).map((t) => t.id);
    const rows = ids.map((id) => {
      const r = s.standings[id];
      const pct = r.w + r.l ? r.w / (r.w + r.l) : 0;
      return { id, ...r, pct };
    });
    rows.sort((a, b) => b.pct - a.pct || b.w - a.w);
    const top = rows[0];
    for (const r of rows) r.gb = (top.w - r.w + (r.l - top.l)) / 2;
    return rows;
  };

  G.teamGamesPlayed = (s) => {
    const r = s.standings[s.player.teamId];
    return r.w + r.l + r.d;
  };

  // ---------- 行動 ----------
  // 今週の練習の選択肢
  G.trainingOptions = (s) => {
    const p = s.player;
    const acts = [];
    const pitcher = G.isPitcher(p);
    if (p.injury) {
      acts.push({ id: 'rehab', name: 'リハビリ', desc: '体力回復・治りが早まる' });
      acts.push({ id: 'mental', name: 'イメトレ', desc: '精神の経験点' });
    } else {
      for (const t of G.TRAININGS) {
        if (t.minAge && p.age < t.minAge) continue;
        if (t.cond && !t.cond(s)) continue;
        if (t.for === 'A' || (t.for === 'P') === pitcher) acts.push({ id: t.id, name: t.name, desc: t.desc, risky: t.risky, japan: t.japan });
      }
    }
    acts.push({ id: 'rest', name: '完全休養', desc: '練習を休んで体力回復', rest: true });
    return G.filter('trainingOptions', acts, s);
  };

  G.trainingMultiplier = (s) => {
    const p = s.player;
    const phase = G.phaseOf(s.week, s.year).id;
    let m = G.PHASE_MUL[phase] * G.COND_TRAIN_MUL[p.condition] * G.growthMultiplier(p);
    if (s.flags.trainerUntil === s.year) m *= 1.25;
    return G.filter('trainingMul', m, s);
  };

  G.injure = (s, forced) => {
    const p = s.player;
    const list = G.isPitcher(p) ? G.PITCHER_INJURIES : G.INJURIES;
    const inj = G.weighted(list);
    const weeks = G.ri(inj.w[0], inj.w[1]);
    p.injury = { name: inj.name, weeks, total: weeks, wasFirst: p.squad === 'first' };
    if (weeks >= 3 && p.squad === 'first') {
      p.squad = 'second';
      log(s, `${inj.name}で登録抹消…`, 'bad');
    }
    p.condition = Math.max(0, p.condition - 1);
    if (weeks >= 3) {
      s.history.push({ year: s.year, text: `${inj.name}（全治${weeks}週）` });
      G.buzz(s, 'injury');
    }
    return p.injury;
  };

  const doTraining = (s, t) => {
    const p = s.player;
    const mul = G.trainingMultiplier(s);
    let gain = t.gain;
    if (!gain) {
      gain = G.isPitcher(p)
        ? { muscle: 8, agility: 6, technique: 8, breaking: 9, mind: 5 }
        : { muscle: 9, agility: 8, technique: 9, mind: 6 };
    }
    const real = {};
    for (const k in gain) real[k] = Math.round(gain[k] * mul * G.ageExpMul(p, k) * G.TRAIN_EXP_SCALE * G.rf(0.8, 1.0));
    const staminaCost = t.stamina;
    p.stamina = G.clamp(p.stamina - staminaCost, 0, 100);
    let msg = `${t.name}をした。` + G.applyFx(s, { exp: real });
    if (t.id === 'vetcare') {
      p.vetCare = (p.vetCare || 0) + 1;
      s.story.vetcare = (s.story.vetcare || 0) + 1;
      msg += `（今年のケア${p.vetCare}週：冬の衰えが${Math.round(G.agingRelief(p) * 100)}%ゆるやかに）`;
    }
    // ケガ判定
    let risk = (t.risky ? 0.035 : 0.004) + Math.max(0, 30 - p.stamina) * 0.004;
    if (p.skills.includes('durable')) risk *= 0.5;
    risk *= G.filter('injuryMul', 1, s);
    if (G.chance(risk)) {
      const inj = G.injure(s);
      msg += `\nしまった！${inj.name}でケガをしてしまった…（全治${inj.weeks}週）`;
      scene(s, 'ケガ', `練習中に${inj.name}をしてしまった…\n全治${inj.weeks}週の見込み。しばらくは治療に専念しよう。`);
    }
    if (G.phaseOf(s.week, s.year).id !== 'season') p.trust = G.clamp(p.trust + 0.6, 0, 100);
    return G.filter('trainingDone', msg, s, t);
  };

  // 1週間 = 練習ひとつ + オフの過ごし方ひとつ
  G.doAction = (s, trainId, privId) => {
    const p = s.player;
    const results = [];
    const cats = [];
    const t = G.trainingById(trainId);
    if (t && (!p.injury || trainId === 'mental')) {
      results.push(doTraining(s, t));
    } else if (trainId === 'rehab') {
      let msg = 'リハビリに励んだ。' + G.applyFx(s, { stamina: 20 });
      if (p.injury && G.chance(0.5)) {
        p.injury.weeks = Math.max(1, p.injury.weeks - 1);
        msg += '\n回復が早まっている！';
      }
      results.push(msg);
    } else {
      const rec = 25 + (p.skills.includes('recover') ? 8 : 0);
      let msg = '練習を休んで体を休めた。' + G.applyFx(s, { stamina: rec });
      if (G.chance(0.25)) msg += G.applyFx(s, { cond: 1 });
      results.push(msg);
    }
    cats.push('train');
    if (privId) {
      const hist = s.history.length;
      const pm = G.doPrivate(s, privId);
      if (pm) {
        results.push(pm);
        cats.push(s.history.length > hist ? 'life!' : 'life');
      }
    }
    results.forEach((r, i) => log(s, r, '', cats[i].replace('!', ''), cats[i].endsWith('!')));
    // シーズン中は試合へ（1試合ずつ作戦を選べる）。日本代表の試合がある週も
    const special = G.filter('weekSpecialGames', [], s);
    const season = G.phaseOf(s.week, s.year).id === 'season' && G.gamesInWeek(s.week, s.year) > 0;
    if (special.length || season) {
      G.startGames(s, special, season);
      G.stepGames(s, null);
    } else G.endWeek(s, null);
  };

  // ---------- 週の処理 ----------
  const endWeekCore = (s, gw) => {
    const p = s.player;
    const phase = G.phaseOf(s.week, s.year).id;
    const ov = G.overall(p);

    if (phase !== 'season' && !(gw && gw.specialGames && gw.specialGames.length)) s.lastGames = null;
    if (phase === 'open' && !G.blocked('openGames', s)) {
      const r = G.simOpenGames(s, 4);
      G.addStats(s.open.bat, r.bat);
      G.addStats(s.open.pit, r.pit);
      let delta = 0;
      if (G.isPitcher(p)) {
        if (r.pit.outs) {
          const era = (r.pit.er * 27) / r.pit.outs;
          delta = G.clamp((3.6 - era) * 1.2, -5, 5);
          log(s, `オープン戦：${G.fmtIP(r.pit.outs)}回 ${r.pit.er}自責 ${r.pit.k}奪三振`, 'game');
        }
      } else if (r.bat.pa) {
        const d = G.batDerived(r.bat);
        delta = G.clamp((d.ops - 0.7) * 15, -5, 6);
        log(s, `オープン戦：${r.bat.ab}打数${r.bat.h}安打 ${r.bat.hr}本塁打`, 'game');
      }
      p.trust = G.clamp(p.trust + delta + (ov - 48) * 0.1, 0, 100);
    } else if (phase === 'season') {
      G.weekSeason(s, gw || G.simWeekGames(s));
    } else if (phase === 'camp' || phase === 'fall' || phase === 'jan') {
      p.trust = G.clamp(p.trust + (ov - 48) * 0.06, 0, 100);
    }

    // ケガの経過
    if (p.injury) {
      p.injury.weeks--;
      if (p.injury.weeks <= 0) {
        const was = p.injury;
        p.injury = null;
        log(s, `${was.name}が完治した！`, 'good');
        if (was.wasFirst && p.squad === 'second' && p.trust >= 40 && phase === 'season') {
          p.squad = 'first';
          const u = G.ensureUsage(s);
          u.status = 'bench';
          u.slot = null;
          u.benchGames = 0;
          u.form = [];
          log(s, `${G.squadName(p, 'first')}に復帰した！（まずは控えから）`, 'good');
        }
      }
    }

    // 収入（生活費は私生活側で計算）
    p.money += (p.salary * 0.65) / 52;

    // 自然回復と調子の波
    p.stamina = G.clamp(p.stamina + 6 + (p.skills.includes('recover') ? 4 : 0) + G.restBonus(s), 0, 100);
    const r = Math.random();
    if (r < 0.15) p.condition = Math.min(4, p.condition + 1);
    else if (r < 0.3 && !(p.hobby === 'fishing' && G.chance(0.5))) p.condition = Math.max(0, p.condition - 1);
    if (p.stamina < 20 && G.chance(0.5)) p.condition = Math.max(0, p.condition - 1);
    // 好不調の波はいずれ落ち着く
    else if (p.condition !== 2 && G.chance(0.2)) p.condition += p.condition < 2 ? 1 : -1;
    if (p.squad === 'second') p.popularity = Math.max(0, p.popularity - 0.05);

    // 私生活
    G.weeklyLife(s);
    G.snsWeekLog(s);
    // まれに首脳陣からポジション変更の打診
    G.positionOfferCheck(s);

    // 年間スケジュール
    G.scheduled(s);

    // ランダムイベント
    const hasChoiceScene = s.queue.some((q) => q.kind !== 'info');
    if (!hasChoiceScene && !s.ended && !s.retired) {
      let ev = null;
      if (s.tmp.forceEvent) {
        ev = G.EVENTS.find((e) => e.id === s.tmp.forceEvent);
        s.tmp.forceEvent = null;
      } else if (G.chance(0.3)) ev = G.pickRandomEvent(s);
      if (ev) G.queueEvent(s, ev);
    }

    if (s.ended || s.retired) return;
    s.week++;
    if (s.week > 52) G.newYear(s);
  };
  // 週の終わりの合図（週が進んだあと。date はその週の日曜日）
  G.endWeek = (s, gw) => {
    const date = G.weekDate(s, 6);
    endWeekCore(s, gw);
    G.emit('week:after', s, date);
  };

  G.queueEvent = (s, ev) => {
    s.flags.lastEvent = ev.id;
    const text = ev.text(s);
    if (ev.choices) {
      s.queue.push({ kind: 'event', id: ev.id, title: ev.title, text });
    } else {
      const res = ev.run(s);
      s.queue.push({ kind: 'info', title: ev.title, text: text + '\n\n' + res });
      log(s, `【${ev.title}】${res}`, 'event', 'event');
    }
  };

  const weekSeasonCore = (s, gw) => {
    const p = s.player;
    const before = gw.before;
    const r = { ...gw.acc, games: gw.games };
    G.addStats(s.stats.bat, r.weekBat);
    G.addStats(s.stats.pit, r.weekPit);
    if (!s.stats.fld) s.stats.fld = G.emptyFld();
    if (r.weekFld) G.addStats(s.stats.fld, r.weekFld);
    G.simTeammatesWeek(s, gw.played !== undefined ? gw.played : gw.n);
    G.addStats(s.farm.bat, r.farmBat);
    G.addStats(s.farm.pit, r.farmPit);
    const after = s.standings[p.teamId];
    const ww = after.w - before.w;
    const wl = after.l - before.l;

    // 試合ログ
    for (const g of r.games) {
      if (g.rain) {
        log(s, `${G.fmtDate(g.date)} 雨天中止（後日振替）`, 'game');
        continue;
      }
      const mark = g.outcome === 'W' ? '○' : g.outcome === 'L' ? '●' : '△';
      const opp = G.teamById(g.oppId).short;
      const line = g.kind === 'bat' ? G.batLineText(g.line) : g.kind === 'pit' ? G.pitLineText(g.line) : '出場なし';
      let cls = 'game';
      if (g.kind === 'bat' && (g.line.hr || g.line.h >= 3)) cls = 'game hot';
      if (g.kind === 'pit' && (g.line.w || g.line.s)) cls = 'game hot';
      log(s, `${G.fmtDate(g.date)} ${mark} vs${opp}${g.inter ? '（交流戦）' : ''} ${g.score[0]}-${g.score[1]}｜${line}`, cls);
    }
    log(s, `今週のチーム成績：${ww}勝${wl}敗（通算 ${after.w}勝${after.l}敗${after.d}分）`, 'team');

    // 人気（1軍での活躍）と2軍成績のログ
    if (p.squad === 'first' && !p.injury) {
      if (G.isPitcher(p)) {
        const w = r.weekPit;
        p.popularity += w.w * 0.6 + w.s * 0.3 + w.hld * 0.15;
      } else {
        const w = r.weekBat;
        if (w.pa >= 4) p.popularity += w.hr * 0.4 + (G.batDerived(w).ops > 0.85 ? 0.5 : 0);
      }
    } else if (p.squad === 'second' && !p.injury) {
      if (G.isPitcher(p)) {
        const w = r.farmPit;
        if (w.outs >= 3) log(s, `${G.squadName(p, 'second')}戦：${G.fmtIP(w.outs)}回 ${w.er}自責 ${w.k}奪三振`, 'game');
      } else {
        const w = r.farmBat;
        if (w.pa >= 4) log(s, `${G.squadName(p, 'second')}戦：${w.ab}打数${w.h}安打 ${w.hr}本塁打 ${w.rbi}打点`, 'game');
      }
    }
    p.popularity = G.clamp(p.popularity, 0, 100);

    // 試合による疲労
    if (p.squad === 'first' && !p.injury) {
      const tired = G.isPitcher(p) ? (p.role === 'SP' ? 8 : 6) : G.ensureUsage(s).status === 'starter' ? 7 : 3;
      p.stamina = G.clamp(p.stamina - tired, 0, 100);
    } else if (!p.injury) p.stamina = G.clamp(p.stamina - 3, 0, 100);

    // 2軍からの昇格判断（1軍での起用は試合ごとに match.js → manager.js で判断）
    G.farmPromotionCheck(s);
    G.refreshTrust(s);
  };
  G.weekSeason = (s, gw) => {
    weekSeasonCore(s, gw);
    G.emit('season:week', s, gw);
  };


  // ---------- 年間スケジュール ----------
  const scheduledCore = (s) => {
    const p = s.player;
    const w = s.week;
    const ov = G.overall(p);
    const c = G.cal(s.year);

    if (w === c.campW - 1) {
      const first = p.trust >= 50 || p.squad === 'first';
      p.squad = first ? 'first' : 'second';
      scene(s, 'キャンプイン', `2月1日、春季キャンプが始まる。\n${first ? '1軍スタート！首脳陣にアピールするチャンスだ！' : '2軍スタート。じっくり力をつけよう。'}`);
      log(s, `春季キャンプ ${first ? '1軍' : '2軍'}スタート`, 'event');
    }
    if (w === c.openW - 1) {
      // 日本代表などでチームを離れているときは、チームの様子だけ伝わる
      if (G.blocked('openGames', s)) log(s, `チームはキャンプを打ち上げ、オープン戦に入った（${G.fmtDate(c.opening)}に開幕）`, 'event');
      else scene(s, 'オープン戦開幕', `キャンプを打ち上げ、オープン戦が始まる。\n${G.fmtDate(c.opening)}の開幕戦までに、開幕1軍を勝ち取れ！`);
    }
    if (w === c.startW - 1) {
      // 開幕1軍の選考：能力・キャンプでの評価・オープン戦の結果・同じ守備位置のライバル
      G.ensureUsage(s);
      G.ensureRoster(s);
      G.newSeasonBars(s);
      let fit;
      if (G.isPitcher(p)) {
        const open = s.open.pit;
        const openERA = open.outs >= 9 ? (open.er * 27) / open.outs : null;
        fit = G.expERA(s) - (openERA !== null ? (3.6 - openERA) * 0.15 : 0) - (p.trust - 50) * 0.01 <= s.flags.barERA + 0.8;
      } else {
        const open = s.open.bat;
        const openOPS = open.pa >= 10 ? G.batDerived(open).ops : null;
        fit = G.expOPS(s) + (openOPS !== null ? (openOPS - 0.7) * 0.25 : 0) + (p.trust - 50) * 0.001 >= s.flags.bar - 0.08;
      }
      const first = !p.injury && fit;
      p.squad = first ? 'first' : 'second';
      G.resetStandings(s);
      s.rotation = G.ri(0, 5);
      s.farmRotation = G.ri(0, 5);
      if (first) {
        const role = `（${G.openingUsage(s)}）`;
        scene(s, '開幕1軍！', `開幕1軍メンバーに選ばれた！${role}\nいよいよペナントレースが始まる！`, { big: '開幕1軍' });
        log(s, `開幕1軍入り${role}`, 'good');
        if (!s.flags.firstPromotion) {
          s.flags.firstPromotion = true;
          s.history.push({ year: s.year, text: '開幕1軍入り' });
        }
      } else {
        scene(s, '開幕は2軍', '開幕1軍入りはならなかった…。2軍で結果を出して昇格を目指そう！');
        log(s, '開幕は2軍スタート', 'bad');
      }
    }
    if (w === c.allstarW) {
      const war = G.seasonWAR(p, s);
      const games = Math.max(1, G.teamGamesPlayed(s));
      const pace = (war * G.SEASON_GAMES) / games;
      if (p.squad === 'first' && (p.popularity >= 45 || pace >= 3)) {
        s.flags.allstarCount = (s.flags.allstarCount || 0) + 1;
        s.history.push({ year: s.year, text: 'オールスター出場' });
        const res = G.chance(0.3) ? `なんと${G.isPitcher(p) ? '3者連続三振' : '特大ホームラン'}でMVPに輝いた！` : '夢の舞台を楽しんだ！';
        if (res.includes('MVP')) s.titles.push({ year: s.year, name: 'オールスターMVP' });
        scene(s, 'オールスター', `${c.allstarDates.map((d) => G.fmtDate(d)).join('・')}、オールスターゲーム。\nファン投票・監督推薦で選出された！\n${res}`, { big: 'オールスター' });
        p.popularity = G.clamp(p.popularity + 4, 0, 100);
        log(s, `オールスター出場！${res}`, 'good');
        G.buzz(s, 'allstar');
      }
    }
    if (w === G.cal(s.year).endW) G.seasonEnd(s);
    const mlb = G.isMLB(s);
    if (w === c.csW) (mlb ? G.mlbPostseason : G.climaxSeries)(s);
    if (w === c.jsW) (mlb ? G.worldSeries : G.japanSeries)(s);
    if (w === c.releaseW) (mlb ? G.mlbReleaseCheck : G.releaseCheck)(s);
    if (w === c.faW && !s.ended && !s.retired && !mlb) G.faCheck(s);
    if (w === c.faW && !s.ended && !s.retired && !mlb && !s.queue.some((q) => q.kind === 'fa')) G.mlbCheck(s);
    if (w === c.awardsW) G.awards(s);
    if (w === c.contractW && !s.ended && !s.flags.releasedThisYear && s.flags.skipContract !== s.year) G.contractScene(s);
    if (w === 52) {
      scene(s, `${s.year}年 終了`, `${s.year}年が終わる。\n\n${G.seasonSummaryText(s)}\n\n来年はもっと活躍するぞ！`);
    }
  };
  G.scheduled = (s) => {
    scheduledCore(s);
    G.emit('scheduled', s);
  };

  G.seasonSummaryText = (s) => {
    const p = s.player;
    if (G.isPitcher(p)) {
      const st = s.stats.pit;
      if (!st.g) return '今季は1軍登板なし。';
      return `1軍成績：${st.g}登板 ${st.w}勝${st.l}敗${st.s}S${st.hld}H 防御率${G.fmtERA(st.er, st.outs)} ${st.k}奪三振`;
    }
    const st = s.stats.bat;
    if (!st.g) return '今季は1軍出場なし。';
    return `1軍成績：${st.g}試合 打率${G.fmtRate(st.h, st.ab)} ${st.hr}本塁打 ${st.rbi}打点 ${st.sb}盗塁`;
  };

  const seasonEndCore = (s) => {
    const p = s.player;
    const league = G.teamById(p.teamId).league;
    const ranking = G.leagueRanking(s, league);
    const rank = ranking.findIndex((r) => r.id === p.teamId) + 1;
    s.final = { rank, ranking: ranking.map((r) => r.id) };
    const L = s.leaders;
    const won = [];
    if (!G.isPitcher(p)) {
      const st = s.stats.bat;
      const avg = st.ab ? st.h / st.ab : 0;
      if (st.pa >= 443 && avg >= L.avg.final) won.push('首位打者');
      if (st.hr >= L.hr.final) won.push('本塁打王');
      if (st.rbi >= L.rbi.final) won.push('打点王');
      if (st.sb >= L.sb.final) won.push('盗塁王');
      if (st.h >= L.hits.final) won.push('最多安打');
      if (won.includes('首位打者') && won.includes('本塁打王') && won.includes('打点王')) won.push('三冠王');
    } else {
      const st = s.stats.pit;
      const era = st.outs ? (st.er * 27) / st.outs : 99;
      if (st.w >= L.w.final) won.push('最多勝');
      if (st.outs >= 429 && era <= L.era.final) won.push('最優秀防御率');
      if (st.k >= L.k.final) won.push('最多奪三振');
      if (st.s >= L.s.final) won.push('最多セーブ');
      if (st.hld >= L.hld.final) won.push('最優秀中継ぎ');
    }
    if (G.isMLB(s)) won.forEach((t, i) => (won[i] = `MLB${t}`));
    for (const t of won) {
      s.titles.push({ year: s.year, name: t });
      G.buzz(s, 'title', { name: t });
    }
    p.popularity = G.clamp(p.popularity + won.length * 6, 0, 100);
    let text = `ペナントレースが終了した。\n${G.teamById(p.teamId).name}は${rank}位。`;
    if (rank === 1) {
      text += G.isMLB(s) ? '\n\n🎉 地区優勝！！ 🎉' : '\n\n🎉 リーグ優勝！！ 🎉';
      s.history.push({ year: s.year, text: 'チームがリーグ優勝' });
      s.flags.pennant = s.year;
    }
    text += `\n\n${G.seasonSummaryText(s)}`;
    if (won.length) {
      text += `\n\n🏆 タイトル獲得：${won.join('・')}`;
      for (const t of won) log(s, `タイトル獲得：${t}！`, 'good');
    }
    scene(s, 'シーズン終了', text, rank === 1 ? { big: 'リーグ優勝' } : won.length ? { big: won[0] } : {});
    log(s, `シーズン終了：チームは${rank}位`, 'team');
  };
  G.seasonEnd = (s) => {
    seasonEndCore(s);
    G.emit('seasonEnd', s);
  };

  G.climaxSeries = (s) => {
    const p = s.player;
    const rank = s.final.rank;
    if (rank > 3) {
      s.final.cs = false;
      return;
    }
    const pr = { 1: 0.68, 2: 0.55 * 0.4, 3: 0.45 * 0.35 }[rank];
    const win = G.chance(pr);
    s.final.cs = win;
    const me = p.squad === 'first' && !p.injury;
    let text = `クライマックスシリーズが行われた。\n`;
    if (win) {
      text += `${G.teamById(p.teamId).name}が勝ち抜き、日本シリーズ進出を決めた！`;
      if (me) {
        // 今季の実際の働きに合わせた一言
        const war = G.seasonWAR(p, s);
        const starter = G.isPitcher(p) ? s.stats.pit.outs >= 90 : p.usage && p.usage.status === 'starter';
        if (starter && war >= 2) text += `\n${p.name}も${G.isPitcher(p) ? '好投' : '勝負強いバッティング'}でチームに貢献した！`;
        else if (starter) text += `\n${p.name}もグラウンドに立ち、短期決戦の重圧を肌で感じた。`;
        else text += `\n${p.name}はベンチから声を張り上げ、チームを後押しした。`;
      }
    } else {
      text += 'チームは惜しくも敗退してしまった…。';
    }
    scene(s, 'クライマックスシリーズ', text);
    log(s, `CS：${win ? '突破！' : '敗退'}`, 'team');
    if (me) p.popularity = G.clamp(p.popularity + 1, 0, 100);
  };

  G.japanSeries = (s) => {
    const p = s.player;
    if (!s.final || !s.final.cs) return;
    const myLeague = G.teamById(p.teamId).league;
    const otherLeague = G.LEAGUES.find((l) => l.id !== myLeague).id;
    const ranking = G.leagueRanking(s, otherLeague);
    const opp = G.chance(0.7) ? ranking[0].id : ranking[1].id;
    const pr = G.clamp(0.5 + (G.teamStrength(s, p.teamId) - G.teamStrength(s, opp)) * 0.02, 0.3, 0.7);
    const win = G.chance(pr);
    const wins = win ? 4 : G.ri(0, 3);
    const losses = win ? G.ri(0, 3) : 4;
    const me = p.squad === 'first' && !p.injury;
    let text = `日本シリーズ　vs ${G.teamById(opp).name}\n${wins}勝${losses}敗で`;
    if (win) {
      text += '日本一に輝いた！！🎉';
      s.history.push({ year: s.year, text: '日本一' });
      if (me) {
        s.titles.push({ year: s.year, name: '日本一' });
        p.popularity = G.clamp(p.popularity + 5, 0, 100);
        const regular = G.isPitcher(p) ? s.stats.pit.outs >= 90 : p.usage && p.usage.status === 'starter';
        if (regular && G.chance(0.1 + Math.max(0, G.seasonWAR(p, s)) * 0.03)) {
          s.titles.push({ year: s.year, name: '日本シリーズMVP' });
          text += `\n\nさらに${p.name}が日本シリーズMVPに選ばれた！`;
        }
      }
      s.flags.japanChamp = s.year;
    } else {
      text += '敗れてしまった…。';
    }
    scene(s, '日本シリーズ', text, win ? { big: '日本一' } : {});
    log(s, `日本シリーズ：${win ? '日本一！' : '敗退'}`, 'team');
  };

  G.awards = (s) => {
    const p = s.player;
    const war = G.seasonWAR(p, s);
    const won = [];
    const rank = s.final ? s.final.rank : 6;
    if (war >= 6.5 || (war >= 5 && rank === 1)) won.push('MVP');
    if (s.flags.rookieEligible && p.yearsPro <= 4 && war >= 1.5) {
      won.push('新人王');
      s.flags.rookieEligible = false;
    }
    if (G.isPitcher(p)) {
      const st = s.stats.pit;
      const era = st.outs ? (st.er * 27) / st.outs : 99;
      if (war >= 4) won.push('ベストナイン');
      if (st.w >= 14 && era <= 2.4 && st.outs >= 510 && st.k >= 140) won.push('沢村賞');
      if (st.outs >= 150) s.flags.rookieEligible = false;
    } else {
      const st = s.stats.bat;
      if (war >= 3.5 && st.pa >= 443) won.push('ベストナイン');
      // ゴールデングラブ賞：守備得点と守備率で選ばれる
      const fld = s.stats.fld || G.emptyFld();
      const pct = G.fieldingPct(fld);
      const avgPct = (G.POS_DEF[p.position] || G.POS_DEF.OF).avgPct;
      if (st.g >= 100 && fld.drs >= 8 && pct !== null && pct >= avgPct) won.push('ゴールデングラブ賞');
      if (st.pa >= 300) s.flags.rookieEligible = false;
    }
    if (G.isMLB(s)) {
      const map = { MVP: 'MLB MVP', 新人王: 'MLB新人王', ベストナイン: G.isPitcher(p) ? 'サイ・ヤング賞' : 'シルバースラッガー賞', ゴールデングラブ賞: 'ゴールドグラブ賞' };
      const rookie = s.flags.mlbRookie;
      for (let i = won.length - 1; i >= 0; i--) {
        if (won[i] === '沢村賞' || (won[i] === '新人王' && !rookie)) won.splice(i, 1);
        else if (map[won[i]]) won[i] = map[won[i]];
      }
      if (rookie && war >= 2.5 && !won.includes('MLB新人王')) won.push('MLB新人王');
      const cy = won.indexOf('サイ・ヤング賞');
      if (cy >= 0 && war < 5.5) won.splice(cy, 1);
    }
    if (!won.length) return;
    for (const t of won) {
      s.titles.push({ year: s.year, name: t });
      G.buzz(s, 'title', { name: t });
    }
    p.popularity = G.clamp(p.popularity + won.length * 4, 0, 100);
    scene(s, '表彰式', `${G.isMLB(s) ? 'シーズンの表彰' : 'NPBアワーズ'}で表彰された！\n\n🏆 ${won.join('\n🏆 ')}`, { big: won[0] });
    for (const t of won) log(s, `${t}を受賞！`, 'good');
  };

  const releaseCheckCore = (s) => {
    const p = s.player;
    s.flags.releasedThisYear = false;
    const ov = G.overall(p);
    const war = G.seasonWAR(p, s);
    const played = G.isPitcher(p) ? s.stats.pit.outs >= 60 : s.stats.bat.pa >= 100;
    let pr = 0;
    if (p.yearsPro >= 3 && !played && ov < 44 + Math.max(0, p.age - 25) * 1.5) pr = 0.6;
    if (p.age >= 35 && ov < 50) pr = Math.max(pr, 0.5);
    if (p.age >= 38 && ov < 58) pr = Math.max(pr, 0.6);
    if (p.age >= 36 && war < 0.5) pr = Math.max(pr, 0.5);
    if (p.age >= 40 && war < 1.5) pr = Math.max(pr, 0.7);
    if (!G.chance(pr)) return;
    s.flags.releasedThisYear = true;
    s.queue.push({
      kind: 'release',
      title: '戦力外通告',
      text: `球団事務所に呼び出された。\n\n「…${p.name}君、来季の契約は結ばないことになった」\n\n戦力外通告を受けてしまった…。`,
    });
  };
  G.releaseCheck = (s) => {
    if (G.blocked('releaseCheck', s)) return;
    releaseCheckCore(s);
  };

  G.faCheck = (s) => {
    const p = s.player;
    if (p.yearsPro < 8) return;
    if (s.flags.faYear && s.year - s.flags.faYear < 4) return;
    const war = G.seasonWAR(p, s);
    if (war < 1.5) return;
    const offers = G.shuffle(G.NPB_TEAMS().filter((t) => t.id !== p.teamId))
      .slice(0, G.ri(1, 3))
      .map((t) => ({ teamId: t.id, salary: Math.round((p.salary * G.rf(1.2, 1.7) + war * 500) / 10) * 10 }));
    s.flags.faYear = s.year;
    s.queue.push({
      kind: 'fa',
      title: 'FA権取得',
      text: `FA（フリーエージェント）権を行使できる！\n他球団からオファーが届いている。\n\n${offers.map((o) => `・${G.teamById(o.teamId).name}：年俸${G.fmtMoney(o.salary)}`).join('\n')}`,
      offers,
    });
  };

  G.contractTarget = (s) => {
    const p = s.player;
    const war = G.seasonWAR(p, s);
    const titles = s.titles.filter((t) => t.year === s.year).length;
    // 日本球界の相場：WAR5で2〜3億円、MVP級で4〜6億円。最高でも7億円ほど
    let target = Math.min(70000, 600 + Math.pow(Math.max(0, war), 1.25) * 3000 + titles * 800 + p.popularity * 10);
    if (s.flags.pennant === s.year && p.squad === 'first') target += 500;
    target = Math.max(440, G.filter('contractTarget', target, s)); // 査定ポイントなど
    const cur = p.salary;
    let next;
    if (target > cur) next = cur + (target - cur) * 0.6;
    else next = Math.max(cur + (target - cur) * 0.5, cur * (cur > 10000 ? 0.6 : 0.75));
    next = Math.max(440, Math.round(next / 10) * 10);
    return next;
  };

  const contractSceneCore = (s) => {
    const p = s.player;
    if (p.age >= 44) {
      s.queue.push({ kind: 'forced_retire', title: '現役引退', text: `${p.age}歳。体はもう限界だ…。\n長く続けてきた現役生活に別れを告げる時が来た。` });
      return;
    }
    const mlb = G.isMLB(s);
    const offer = mlb ? G.mlbContractTarget(s) : G.contractTarget(s);
    s.tmp.offer = offer;
    const diff = offer - p.salary;
    const sign = diff >= 0 ? '+' : '';
    s.queue.push({
      kind: 'contract',
      title: mlb ? '契約交渉' : '契約更改',
      text: `${mlb ? '代理人を通じた契約交渉。' : '球団との契約更改交渉。'}\n\n今季：${G.fmtMoney(p.salary)}\n提示：${G.fmtMoney(offer)}（${sign}${G.fmtMoney(diff)}）${mlb ? `\n（${G.usdText(offer)}）` : ''}\n\n${G.seasonSummaryText(s)}${G.sateiText && G.sateiText(s) ? `\n${G.sateiText(s)}` : ''}`,
      canRetire: p.age >= 30,
      mlb,
    });
  };
  G.contractScene = (s) => {
    if (G.blocked('contractScene', s)) return;
    contractSceneCore(s);
  };

  // ---------- 選択肢つきシーンの解決 ----------
  G.sceneChoices = (s, q) => {
    if (q.kind === 'event') {
      const ev = G.EVENTS.find((e) => e.id === q.id);
      return ev.choices.map((c) => c.label);
    }
    if (q.kind === 'contract') {
      const c = ['サインする', '粘って交渉する'];
      if (q.canRetire) c.push('現役を引退する');
      if (q.mlb) c.push('日本球界に復帰する');
      return c;
    }
    if (q.kind === 'release') return ['トライアウトを受ける', '現役を引退する'];
    if (q.kind === 'fa') return ['残留する', ...q.offers.map((o) => `${G.teamById(o.teamId).short}へ移籍`)];
    if (q.kind === 'forced_retire') return ['引退を決意する'];
    if (q.kind === 'life') return G.lifeChoices(s, q).map((c) => c.label);
    return ['OK'];
  };

  // 選択を処理し、結果シーン（info）に置き換える
  const resolveSceneCore = (s, idx, input) => {
    const q = s.queue.shift();
    const p = s.player;
    let title = q.title;
    let text = '';
    const hist = s.history.length;
    if (q.kind === 'life') {
      const c = G.lifeChoices(s, q)[idx];
      text = c.run(s, q, input);
      if (text === null) return;
      log(s, `【${q.title}】${text}`, 'event', 'life', s.history.length > hist);
    } else if (q.kind === 'event') {
      const ev = G.EVENTS.find((e) => e.id === q.id);
      const c = ev.choices[idx];
      text = c.run(s);
      log(s, `【${ev.title}】${text}`, 'event', 'event', s.history.length > hist);
    } else if (q.kind === 'contract') {
      if (idx === 0) {
        p.salary = s.tmp.offer;
        text = `${G.fmtMoney(p.salary)}で契約を更改した！`;
      } else if (idx === 1) {
        const war = G.seasonWAR(p, s);
        if (G.chance(G.clamp(0.25 + war * 0.1, 0.1, 0.8))) {
          p.salary = Math.round((s.tmp.offer * G.rf(1.05, 1.15)) / 10) * 10;
          text = `粘り強い交渉の末、${G.fmtMoney(p.salary)}で合意した！`;
        } else {
          p.salary = s.tmp.offer;
          p.trust = Math.max(0, p.trust - 4);
          text = `「これ以上は出せない」…結局${G.fmtMoney(p.salary)}でサインした。球団の印象が少し悪くなった。`;
        }
      } else if (G.sceneChoices(s, q)[idx] === '日本球界に復帰する') {
        s.queue.unshift({ kind: 'life', id: 'npb_return', title: '日本復帰', text: '日本の球団からオファーが届いている。', data: { offers: G.npbOffers(s) } });
        return;
      } else {
        G.retire(s, '自らの意思で現役を引退した');
        return;
      }
      log(s, `契約更改：${G.fmtMoney(p.salary)}`, 'good');
      G.buzz(s, p.salary >= (s.career.length ? s.career[s.career.length - 1].salary : 0) ? 'raise' : 'cut', { salary: p.salary });
    } else if (q.kind === 'release') {
      if (idx === 0) {
        const ov = G.overall(p);
        const pr = G.clamp((ov - 35) / 40, 0.1, 0.8) - Math.max(0, p.age - 33) * 0.05;
        if (G.chance(pr)) {
          const team = G.pick(G.NPB_TEAMS().filter((t) => t.id !== p.teamId));
          const from = G.teamById(p.teamId).name;
          p.teamId = team.id;
          p.salary = Math.max(440, Math.round((p.salary * 0.5) / 10) * 10);
          p.trust = 40;
          p.squad = 'second';
          s.history.push({ year: s.year, text: `トライアウトを経て${team.name}に移籍` });
          text = `トライアウトで結果を残し、${team.name}から声がかかった！\n年俸${G.fmtMoney(p.salary)}で契約。${from}への恩返しは新天地での活躍で！`;
          log(s, `${team.name}に移籍`, 'good');
        } else {
          s.queue.unshift({ kind: 'forced_retire', title: 'トライアウト', text: 'トライアウトを受けたが、どこからも声はかからなかった…。' });
          return;
        }
      } else {
        G.retire(s, '戦力外通告を受け、現役を引退した');
        return;
      }
    } else if (q.kind === 'fa') {
      if (idx === 0) {
        p.salary = Math.round((p.salary * 1.1) / 10) * 10;
        text = `${G.teamById(p.teamId).name}に残留することを決めた！ファンから大きな拍手が送られた。`;
        p.popularity = G.clamp(p.popularity + 3, 0, 100);
      } else {
        const o = q.offers[idx - 1];
        const team = G.teamById(o.teamId);
        p.teamId = o.teamId;
        p.salary = o.salary;
        p.trust = 60;
        s.history.push({ year: s.year, text: `FAで${team.name}に移籍` });
        text = `FA権を行使し、${team.name}へ移籍することを決めた！\n年俸${G.fmtMoney(o.salary)}の大型契約だ！`;
        s.flags.skipContract = s.year;
      }
      log(s, text.split('\n')[0], 'good');
    } else if (q.kind === 'forced_retire') {
      G.retire(s, '現役を引退した');
      return;
    }
    s.queue.unshift({ kind: 'info', title, text });
  };
  G.resolveScene = (s, idx, input) => {
    resolveSceneCore(s, idx, input);
    G.emit('scene:resolved', s);
  };

  G.dismissScene = (s) => {
    s.queue.shift();
  };

  // ---------- 年越し ----------
  G.newYear = (s) => {
    const p = s.player;
    G.pushCareer(s);
    G.updateDraftClass(s);
    G.updateRosterYear(s);
    if (p.league === 'mlb' && s.flags.mlbStart <= s.year) s.flags.mlbRookie = false;
    s.year++;
    s.week = 1;
    p.age++;
    p.yearsPro++;
    s.flags.releasedThisYear = false;
    const msgs = G.applyAging(p);
    G.newSeasonBars(s);
    const usage = G.ensureUsage(s);
    usage.form = [];
    usage.farmForm = [];
    s.flags.downUntil = 0;
    p.goodwill = Math.round(p.goodwill * 0.5);
    p.trust = G.clamp(p.trust * 0.6 + 20 + (G.overall(p) - 50) * 0.4, 5, 90);
    p.condition = 2;
    p.stamina = 100;
    s.stats = { bat: G.emptyBat(), pit: G.emptyPit(), fld: G.emptyFld() };
    s.farm = { bat: G.emptyBat(), pit: G.emptyPit() };
    s.open = { bat: G.emptyBat(), pit: G.emptyPit() };
    for (const t of G.TEAMS) {
      s.teamStr[t.id] = Math.round(G.clamp(s.teamStr[t.id] * 0.6 + G.rf(42, 58) * 0.4 + G.gauss(0, 2), 40, 60));
    }
    G.resetStandings(s);
    G.genLeaders(s);
    s.final = null;
    // カレンダーの試合結果は前年分まで残す
    if (s.results) for (const k of Object.keys(s.results)) if (Number(k.slice(0, 4)) < s.year - 1) delete s.results[k];
    s.totalEarnings += p.salary;
    scene(s, `${s.year}年 新年`, `新しい年が明けた。${p.age}歳、プロ${p.yearsPro + 1}年目のシーズンが始まる！${msgs.length ? '\n\n' + msgs.join('\n') : ''}`);
    log(s, `${s.year}年 プロ${p.yearsPro + 1}年目（${p.age}歳）`, 'year');
    G.yearlyLife(s);
    G.styleOfferCheck(s);
  };

  G.pushCareer = (s) => {
    const p = s.player;
    s.career.push({
      year: s.year,
      age: p.age,
      team: p.teamId,
      bat: { ...s.stats.bat },
      fld: { ...(s.stats.fld || G.emptyFld()) },
      pit: { ...s.stats.pit },
      farmBat: { ...s.farm.bat },
      farmPit: { ...s.farm.pit },
      war: Math.round(G.seasonWAR(p, s) * 10) / 10,
      salary: p.salary,
      titles: s.titles.filter((t) => t.year === s.year).map((t) => t.name),
    });
  };

  G.careerTotals = (s) => {
    const bat = G.emptyBat();
    const pit = G.emptyPit();
    const fld = G.emptyFld();
    let war = 0;
    for (const c of s.career) {
      G.addStats(bat, c.bat);
      G.addStats(pit, c.pit);
      if (c.fld) G.addStats(fld, c.fld);
      war += c.war;
    }
    return { bat, pit, fld, war };
  };

  // ---------- 引退・エンディング ----------
  // 引退を決めたら、第二の人生を選んでエンディングへ
  const retireCore = (s, reason) => {
    const p = s.player;
    G.pushCareer(s);
    s.retired = { reason, age: p.age, years: p.yearsPro + 1 };
    s.queue = [];
    s.history.push({ year: s.year, text: `現役引退（${p.age}歳）` });
    const tot = G.careerTotals(s);
    s.queue.push({
      kind: 'life',
      id: 'second_career',
      title: '引退会見',
      text: `${reason}。\n\nプロ${p.yearsPro + 1}年、${p.age}歳。たくさんのフラッシュを浴びながら、深く頭を下げた。\n${G.isPitcher(p) ? `通算${tot.pit.w}勝${tot.pit.s}セーブ` : `通算${tot.bat.h}安打${tot.bat.hr}本塁打`}。\n\n明日からは、新しい人生が始まる。これから何をしよう？`,
      data: {},
    });
    log(s, `${reason}（${p.age}歳）`, 'year');
  };
  G.retire = (s, reason) => {
    retireCore(s, reason);
    G.emit('retire', s, reason);
  };

  const finishLifeCore = (s, careerId) => {
    const p = s.player;
    const tot = G.careerTotals(s);
    const pitcher = G.isPitcher(p);
    const meikyu = pitcher ? tot.pit.w >= 200 || tot.pit.s >= 250 : tot.bat.h >= 2000;
    const war = tot.war;
    let title;
    if (war >= 60) title = '伝説の大選手';
    else if (war >= 40) title = '球史に残る名選手';
    else if (war >= 20) title = '球界を代表するスター';
    else if (war >= 8) title = '頼れる名脇役';
    else if (war >= 2) title = '一軍の戦力';
    else title = '夢を追い続けた男';
    const career = G.SECOND_CAREERS.find((c) => c.id === careerId);
    s.ending = {
      reason: s.retired.reason,
      title,
      after: career.text(s, war),
      careerName: career.name,
      life: G.lifeScore(s),
      meikyu,
      hall: war >= 50 || (meikyu && war >= 35),
      age: s.retired.age,
      years: s.retired.years,
    };
    s.ended = true;
    s.queue = [];
  };
  G.finishLife = (s, careerId) => {
    finishLifeCore(s, careerId);
    G.emit('finishLife', s, careerId);
  };

  // ---------- セーブ／ロード ----------
  G.SAVE_KEY = 'pawa-mylife-saves-v1';
  G.SLOTS = 3;

  G.loadAll = () => {
    try {
      const raw = localStorage.getItem(G.SAVE_KEY);
      const data = raw ? JSON.parse(raw) : {};
      return Array.isArray(data.slots) ? data.slots : new Array(G.SLOTS).fill(null);
    } catch (e) {
      return new Array(G.SLOTS).fill(null);
    }
  };

  G.saveGame = (s) => {
    try {
      const slots = G.loadAll();
      while (slots.length < G.SLOTS) slots.push(null);
      slots[s.slot] = s;
      localStorage.setItem(G.SAVE_KEY, JSON.stringify({ slots }));
      return true;
    } catch (e) {
      return false;
    }
  };

  // ---------- セーブデータの書き出し・読み込み ----------
  G.SAVE_FORMAT = 1;
  G.exportSave = (s) => JSON.stringify({ app: 'diamond-life', format: G.SAVE_FORMAT, exportedAt: new Date().toISOString(), save: s });

  // 書き出したテキスト（またはセーブデータそのもの）を読み込む。おかしければ理由つきでエラー
  G.importSave = (text) => {
    let data;
    try {
      data = JSON.parse(String(text || '').trim());
    } catch (e) {
      throw new Error('セーブデータの形式ではありません（テキストが途中で切れていないか確認してください）');
    }
    const s = data && data.app === 'diamond-life' ? data.save : data;
    const p = s && s.player;
    if (!p || typeof p.name !== 'string' || !Number.isFinite(s.year) || !Number.isFinite(s.week) || !Array.isArray(s.career) || !Array.isArray(s.queue)) {
      throw new Error('ダイヤモンド・ライフのセーブデータではないようです');
    }
    return G.migrate(s);
  };

  G.saveToSlot = (s, i) => {
    s.slot = i;
    return G.saveGame(s);
  };

  G.deleteSlot = (i) => {
    try {
      const slots = G.loadAll();
      slots[i] = null;
      localStorage.setItem(G.SAVE_KEY, JSON.stringify({ slots }));
    } catch (e) {
      /* 保存領域が使えない環境では何もしない */
    }
  };
})();
