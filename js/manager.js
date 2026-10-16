// 監督の起用判断（打順・スタメン・登録抹消・投手の配置）
// 実際の起用に近づけるため、試合ごとに直近の成績と実績を見て判断する。
//  ・新人や実績の少ない選手は下位打線から（俊足なら1・2番）
//  ・不振が続けば「打順降格 → スタメン落ち → 登録抹消（2軍）」
//  ・登録抹消から10日間（10試合日）は再登録できない
(function () {
  const G = window.G;

  const FORM_GAMES = 10; // 表示用の直近成績
  const DECIDE_GAMES = 15; // 起用判断に使う直近成績

  G.ensureUsage = (s) => {
    const p = s.player;
    if (!p.usage) {
      p.usage = { status: p.trust >= 55 ? 'starter' : 'bench', slot: null, form: [], farmForm: [], sinceChange: 0, trial: 0, benchGames: 0, lowered: false };
    }
    if (p.goodwill === undefined) p.goodwill = 0;
    if (s.dayCount === undefined) s.dayCount = 0;
    if (!s.flags.bar) G.newSeasonBars(s);
    if (G.isPitcher(p) && !p.rpRank) p.rpRank = 'mid';
    return p.usage;
  };

  // チーム内の競争相手の水準（毎年変わる）
  G.newSeasonBars = (s) => {
    const strong = (G.teamStrength(s, s.player.teamId) - 50) * 0.003;
    s.flags.bar = G.rf(0.67, 0.75) + strong;
    // チームメイトがいれば、同じ守備位置のライバルの実力を基準にする
    const rv = s.roster && G.positionRival ? G.positionRival(s) : null;
    if (rv) {
      const w = (G.POS_DEF[rv.pos] || G.POS_DEF.OF).weight;
      s.flags.bar = 0.65 + (rv.rating - 50) * 0.009 + (rv.prof.fielding - 50) * 0.0012 * w + G.levelOffset(s) * 0.009;
    }
    s.flags.barERA = G.rf(3.4, 4.1) - strong * 8;
  };

  const sumBat = (list) => list.reduce((a, x) => G.addStats(a, x), G.emptyBat());
  const sumPit = (list) => list.reduce((a, x) => G.addStats(a, x), G.emptyPit());

  G.careerPA = (s) => s.career.reduce((a, c) => a + c.bat.pa, 0);
  G.careerOuts = (s) => s.career.reduce((a, c) => a + c.pit.outs, 0);

  // ---------- 打者の評価 ----------
  G.expOPS = (s) => 0.65 + (G.overall(s.player) + G.levelOffset(s) - 50) * 0.009;

  G.batterView = (s) => {
    const p = s.player;
    const u = G.ensureUsage(s);
    const exp = G.expOPS(s);
    let val = exp;
    const season = s.stats.bat;
    const seasonOPS = season.pa >= 30 ? G.batDerived(season).ops : null;
    if (seasonOPS !== null) {
      const k = Math.min(0.7, season.pa / 350);
      val = val * (1 - k) + seasonOPS * k;
    }
    const f = sumBat(u.form.slice(-FORM_GAMES));
    const formOPS = f.pa >= 15 ? G.batDerived(f).ops : null;
    const d = sumBat(u.form.slice(-DECIDE_GAMES));
    const decideOPS = d.pa >= 40 ? G.batDerived(d).ops : null;
    if (decideOPS !== null) val = val * 0.75 + decideOPS * 0.25;
    const cpa = G.careerPA(s) + season.pa;
    const established = cpa >= 1200 || (season.pa >= 250 && seasonOPS >= 0.78);
    if (established) val += 0.03;
    val += p.goodwill * 0.002;
    // 守備：能力と直近のプレー（失策・好守備）を評価に加える
    const def = G.POS_DEF[p.position] || G.POS_DEF.OF;
    const recentE = u.form.slice(-10).reduce((a, x) => a + (x.fe || 0), 0);
    const recentFine = u.form.slice(-10).reduce((a, x) => a + (x.ffine || 0), 0);
    const seasonDrs = s.stats.fld ? s.stats.fld.drs : 0;
    const defAdj = def.weight * ((p.batter.fielding + p.batter.catching) / 2 - 50) * 0.0012 + seasonDrs * 0.002 - recentE * 0.012 + recentFine * 0.006;
    val += defAdj;
    return { defAdj, recentE, recentFine, val, exp, formOPS, formPA: f.pa, formAvg: f.ab ? f.h / f.ab : null, decideOPS, decidePA: d.pa, seasonOPS, established, bar: s.flags.bar };
  };

  // 打順の決定：まず選手のタイプで「定位置」を決め、評価が足りなければ下位へ
  G.batterProfile = (p) => {
    const b = p.batter;
    if (b.speed >= 65 && b.speed >= b.power) return 'lead';
    if (b.power >= 65) return 'slugger';
    if (b.contact >= 65) return 'hitter';
    if (b.contact >= 55 && b.speed >= 55) return 'second';
    return 'role';
  };

  G.computeSlot = (s, v) => {
    const p = s.player;
    const val = v.val;
    const prof = G.batterProfile(p);
    const bottom = p.position === 'C' ? 8 : val >= 0.7 ? 7 : 8;
    if (!v.established) {
      // 新人・実績の少ない選手：中軸はよほどの結果を出してから
      if (val >= 0.87 && s.stats.bat.pa >= 150 && (prof === 'slugger' || prof === 'hitter')) return prof === 'slugger' ? 5 : 3;
      if (prof === 'lead' && val >= 0.69) return 1;
      if ((prof === 'second' || prof === 'lead') && val >= 0.68) return 2;
      if (val >= 0.77) return 6;
      return bottom;
    }
    if (prof === 'lead') return val >= 0.7 ? 1 : bottom;
    if (prof === 'second') return val >= 0.69 ? 2 : bottom;
    if (prof === 'slugger') return val >= 0.86 ? 4 : val >= 0.78 ? 5 : val >= 0.72 ? 6 : bottom;
    if (prof === 'hitter') return val >= 0.8 ? 3 : val >= 0.72 ? 6 : bottom;
    return val >= 0.76 ? 6 : bottom;
  };

  const usageLog = (s, text, cls = 'event') => G.log(s, `【起用】${text}`, cls, 'usage');

  G.refreshTrust = (s) => {
    const p = s.player;
    if (G.isPitcher(p)) {
      const v = G.pitcherView(s);
      p.trust = G.clamp(50 + (s.flags.barERA - v.val) * 14 + (v.established ? 10 : 0) + p.goodwill, 0, 100);
    } else {
      const v = G.batterView(s);
      p.trust = G.clamp(50 + (v.val - v.bar) * 300 + (v.established ? 10 : 0), 0, 100);
    }
  };

  // ---------- 投手の評価 ----------
  G.expERA = (s) => G.clamp(4.3 - (G.pitchQuality(s.player) + G.levelOffset(s) - 45) * 0.055, 0.9, 9);

  G.pitcherView = (s) => {
    const p = s.player;
    const u = G.ensureUsage(s);
    const exp = G.expERA(s);
    let val = exp;
    const season = s.stats.pit;
    const seasonERA = season.outs >= 30 ? (season.er * 27) / season.outs : null;
    if (seasonERA !== null) {
      const k = Math.min(0.7, season.outs / 300);
      val = val * (1 - k) + seasonERA * k;
    }
    const recent = u.form.slice(-(p.role === 'SP' ? 3 : 8));
    const f = sumPit(recent);
    const formERA = f.outs >= 9 ? (f.er * 27) / f.outs : null;
    if (formERA !== null) val = val * 0.6 + formERA * 0.4;
    const established = G.careerOuts(s) >= 900 || (season.outs >= 300 && seasonERA <= 3.3);
    if (established) val -= 0.3;
    val -= p.goodwill * 0.03;
    const blown = recent.filter((x) => x.bs).length;
    return { val, exp, formERA, seasonERA, established, blown, apps: recent.length };
  };

  G.RP_RANKS = { setup: 'セットアッパー', mid: '中継ぎ', mop: '敗戦処理' };

  // 開幕・昇格時の配置
  G.assignRole = (s) => {
    const p = s.player;
    G.ensureUsage(s);
    const exp = G.expERA(s);
    const bar = s.flags.barERA;
    const st = p.pitcher.stamina;
    const established = G.careerOuts(s) >= 900;
    const pref = p.prefRole;
    const rpRank = () => (exp <= bar - 0.6 ? 'setup' : exp <= bar + 0.4 ? 'mid' : 'mop');
    if (pref === 'SP') {
      // 先発希望：スタミナがあれば先発で起用（力不足ならまずはロングリリーフ）
      if (st >= 45 && exp <= bar + 0.6) p.role = 'SP';
      else {
        p.role = 'RP';
        p.rpRank = rpRank();
      }
    } else if (pref === 'RP') {
      p.role = 'RP';
      p.rpRank = rpRank();
    } else if (pref === 'CL') {
      if (exp <= bar - 0.6 || (established && exp <= bar - 0.3)) p.role = 'CL';
      else {
        p.role = 'RP';
        p.rpRank = exp <= bar - 0.2 ? 'setup' : rpRank();
      }
    } else if (st >= 55 && exp <= bar + 0.3) p.role = 'SP';
    else if (established && exp <= bar - 1.0) p.role = 'CL';
    else {
      p.role = 'RP';
      p.rpRank = exp <= bar - 0.6 ? 'setup' : exp <= bar + 0.4 ? 'mid' : 'mop';
    }
  };

  const demote = (s, reason) => {
    const p = s.player;
    const u = p.usage;
    p.squad = 'second';
    u.status = 'bench';
    u.slot = null;
    u.benchGames = 0;
    u.lowered = false;
    u.farmForm = [];
    s.flags.downUntil = s.dayCount + 10;
    const down = G.squadName(p, 'second');
    G.scene(s, '登録抹消', `${reason}\n\n監督「しばらく${down}で自分の形を取り戻してこい」\n\n出場選手登録を抹消された。再登録は10日後から。`);
    usageLog(s, `${down}降格（登録抹消）。${reason}`, 'bad');
    G.buzz(s, 'demote');
    G.addHappy(s, -6);
  };

  // ---------- 試合ごとの判断 ----------
  G.managerAfterDay = (s, res) => {
    const p = s.player;
    const u = G.ensureUsage(s);
    if (p.squad !== 'first' || p.injury || s.retired) return;
    u.sinceChange++;
    if (u.trial > 0) u.trial--;
    if (G.isPitcher(p)) {
      if (res && res.kind === 'pit') {
        const l = res.line;
        u.form.push({ g: 1, outs: l.outs, er: l.er, bs: res.blown ? 1 : 0 });
        if (u.form.length > 15) u.form.shift();
        pitcherDecision(s, res);
      }
      G.refreshTrust(s);
      return;
    }
    if (res && res.fld && p.posAdapt !== undefined && p.posAdapt < 40) p.posAdapt++;
    if (res && res.kind === 'bat') {
      const l = res.line;
      u.form.push({ g: 1, pa: l.pa, ab: l.ab, h: l.h, d: l.d, t: l.t, hr: l.hr, bb: l.bb, k: l.k, fe: res.fld ? res.fld.e : 0, ffine: res.fld ? res.fld.fine : 0 });
      if (u.form.length > 15) u.form.shift();
    }
    batterDecision(s);
    G.refreshTrust(s);
  };

  const fmt = (v) => (v === null ? '-' : v.toFixed(3).replace(/^0/, ''));

  const batterDecision = (s) => {
    const p = s.player;
    const u = p.usage;
    const v = G.batterView(s);
    const bar = v.bar;
    const dec = sumBat(u.form.slice(-DECIDE_GAMES));
    const decN = Math.min(DECIDE_GAMES, u.form.length);
    const formTxt = dec.pa >= 15 ? `直近${decN}試合 打率${fmt(dec.ab ? dec.h / dec.ab : 0)}・OPS ${fmt(G.batDerived(dec).ops)}` : '';

    if (u.status === 'bench') {
      u.benchGames++;
      const ready = v.val >= bar - 0.01 && (v.formOPS === null || v.formOPS >= 0.62);
      if (ready && u.benchGames >= 3) {
        u.status = 'starter';
        u.slot = G.computeSlot(s, v);
        u.sinceChange = 0;
        u.lowered = false;
        usageLog(s, `スタメンに復帰。「${u.slot}番」で起用される`, 'good');
        return;
      }
      const recentBad = v.formPA >= 15 && v.formOPS < 0.5;
      if (!v.established && u.benchGames >= 12 && (recentBad || v.val < bar - 0.1)) {
        demote(s, `控えに回ってからも状態が上がらず（${v.formPA >= 15 ? `直近の打率${fmt(v.formAvg)}` : '出番も少ない'}）。`);
      } else if (v.established && u.benchGames >= 20 && v.val < bar - 0.1) {
        demote(s, '主力としての復調を待ったが、結果が出なかった。');
      }
      return;
    }

    // 守備のミスが続いたらスタメンを外れる
    if (u.status === 'starter' && v.recentE >= 4 && u.sinceChange >= 3 && !(v.established && v.val >= bar)) {
      u.status = 'bench';
      u.slot = null;
      u.benchGames = 0;
      u.sinceChange = 0;
      G.scene(s, 'スタメン落ち', `直近10試合で失策${v.recentE}。\n監督「守りでリズムを崩している。少しベンチで頭を冷やせ」`);
      usageLog(s, `守備のミスが続き、スタメンを外れた（直近10試合で失策${v.recentE}）`, 'bad');
      G.buzz(s, 'bench');
      G.addHappy(s, -4);
      return;
    }
    // スタメン
    // 15試合単位で見る。実績のある選手ほど我慢してもらえる
    const line = v.established ? 0.42 : 0.48;
    const slump = v.decidePA >= 40 && v.decideOPS < line;
    const deepSlump = v.decidePA >= 40 && v.decideOPS < line - 0.12;
    if (u.trial > 0 && !deepSlump) {
      if (u.slot === null) u.slot = G.computeSlot(s, v);
      return;
    }
    if (slump || v.val < bar - (v.established ? 0.1 : 0.07)) {
      if (!u.lowered && u.slot !== null && u.slot <= 6) {
        const from = u.slot;
        u.slot = p.position === 'C' ? 8 : v.established ? 6 : 7;
        u.lowered = true;
        u.sinceChange = 0;
        usageLog(s, `打順が${from}番から${u.slot}番に下がった（${formTxt || '状態が上がらない'}）`, 'bad');
        return;
      }
      if (u.sinceChange >= 5 && (deepSlump || !v.established || v.val < bar - 0.12)) {
        u.status = 'bench';
        u.slot = null;
        u.benchGames = 0;
        u.sinceChange = 0;
        G.scene(s, 'スタメン落ち', `試合前のミーティング。スタメン表に自分の名前がなかった。\n\n${formTxt ? `${formTxt}。` : ''}監督「少しベンチから試合を見てみろ」`);
        usageLog(s, `スタメンを外れた（${formTxt || '不振'}）`, 'bad');
        G.buzz(s, 'bench');
        G.addHappy(s, -4);
      }
      return;
    }
    // 好調・通常時は打順を見直す（固定が基本。はっきり状況が変わったときだけ動かす）
    const next = G.computeSlot(s, v);
    const tier = (n) => (n <= 2 ? 'top' : n <= 5 ? 'heart' : n === 6 ? 'mid' : 'bottom');
    const stays = u.slot !== null && [0.035, -0.035].some((d) => tier(G.computeSlot(s, { ...v, val: v.val + d })) === tier(u.slot));
    if (u.slot === null) u.slot = next;
    else if (!stays && tier(next) !== tier(u.slot) && u.sinceChange >= 10) {
      const from = u.slot;
      u.slot = next;
      u.sinceChange = 0;
      u.lowered = false;
      // 打順が上がるのは「評価が上がった」とき、下がるのは「評価が下がった」とき。理由もそれに合わせて書く
      const tierRank = { top: 1, heart: 0, mid: 2, bottom: 3 };
      const better = tierRank[tier(next)] < tierRank[tier(from)];
      const why = better
        ? v.decideOPS !== null && v.decideOPS >= 0.8
          ? `好調を買われて（${formTxt}）`
          : `今季の安定した成績が評価されて（今季OPS ${fmt(v.seasonOPS)}）`
        : formTxt
          ? `状態が上がらず（${formTxt}）`
          : '打線の組み替えで';
      usageLog(s, `${why}、打順が${from}番から${next}番に${better ? '上がった' : '下がった'}`, better ? 'good' : 'event');
    }
  };

  const pitcherDecision = (s, res) => {
    const p = s.player;
    const u = p.usage;
    const v = G.pitcherView(s);
    const bar = s.flags.barERA;
    const starts = u.form.filter((x) => x.outs >= 9).length;
    if (p.role === 'SP') {
      const last3 = sumPit(u.form.slice(-3));
      const era3 = last3.outs ? (last3.er * 27) / last3.outs : 0;
      if (starts >= 3 && era3 >= 7 && u.trial <= 0) {
        if (v.established) {
          p.role = 'RP';
          p.rpRank = 'mid';
          u.form = [];
          G.scene(s, '配置転換', `直近3試合の先発で防御率${era3.toFixed(2)}。\n監督「しばらく中継ぎで調子を取り戻してくれ」`);
          usageLog(s, '先発ローテーションを外れ、中継ぎへ', 'bad');
        } else demote(s, `直近3試合の先発で防御率${era3.toFixed(2)}と打ち込まれた。`);
      }
      return;
    }
    if (p.role === 'CL') {
      if (v.blown >= 2) {
        p.role = 'RP';
        p.rpRank = 'setup';
        u.form = [];
        G.scene(s, '配置転換', `直近の登板でセーブ失敗が続いた。\n監督「しばらく8回を任せる。抑えは他の投手でいく」`);
        usageLog(s, '抑えを外れ、セットアッパーへ', 'bad');
      }
      return;
    }
    if (v.apps < 6 || u.sinceChange < 6) return;
    const recent = sumPit(u.form.slice(-8));
    const era = recent.outs ? (recent.er * 27) / recent.outs : 0;
    const order = ['mop', 'mid', 'setup'];
    const i = order.indexOf(p.rpRank);
    if (era <= 1.6 && recent.outs >= 18) {
      if (p.rpRank === 'setup' && v.val <= bar - 1 && G.chance(0.2)) {
        p.role = 'CL';
        u.sinceChange = 0;
        G.scene(s, '守護神に抜擢', `安定した投球が評価され、抑えを任されることになった！\n監督「9回はお前に託す」`, { big: '守護神' });
        usageLog(s, '抑えに抜擢された', 'good');
      } else if (i < 2) {
        p.rpRank = order[i + 1];
        u.sinceChange = 0;
        usageLog(s, `${G.RP_RANKS[p.rpRank]}を任されるようになった（直近8登板 防御率${era.toFixed(2)}）`, 'good');
      }
    } else if (era >= 6.5) {
      if (i > 0) {
        p.rpRank = order[i - 1];
        u.sinceChange = 0;
        usageLog(s, `${G.RP_RANKS[p.rpRank]}に配置が下がった（直近8登板 防御率${era.toFixed(2)}）`, 'bad');
      } else if (!v.established) demote(s, `直近8登板で防御率${era.toFixed(2)}と結果が出なかった。`);
    }
  };

  // ---------- 2軍からの昇格（週ごと） ----------
  G.farmPromotionCheck = (s) => {
    const p = s.player;
    const u = G.ensureUsage(s);
    if (p.squad !== 'second' || p.injury || s.retired) return false;
    if (s.week >= G.cal(s.year).endW || s.dayCount < (s.flags.downUntil || 0)) return false;
    let ready = false;
    let note = '';
    if (G.isPitcher(p)) {
      const f = sumPit(u.farmForm.slice(-8));
      const era = f.outs >= 15 ? (f.er * 27) / f.outs : null;
      const exp = G.expERA(s);
      ready = (era !== null && era <= 2.8 && exp <= s.flags.barERA + 1.2) || (exp <= s.flags.barERA - 0.3 && (era === null || era <= 4));
      if (!ready && exp <= s.flags.barERA + 0.6 && G.chance(0.12)) {
        ready = true;
        note = '1軍の投手に故障者が出た。';
      }
    } else {
      const f = sumBat(u.farmForm.slice(-12));
      const ops = f.pa >= 30 ? G.batDerived(f).ops : null;
      const exp = G.expOPS(s);
      ready = (ops !== null && ops >= 0.82 && exp >= s.flags.bar - 0.09) || (exp >= s.flags.bar + 0.02 && (ops === null || ops >= 0.7));
      if (!ready && exp >= s.flags.bar - 0.05 && G.chance(0.12)) {
        ready = true;
        note = '1軍の野手に故障者が出た。';
      }
    }
    if (!ready) return false;
    promote(s, note);
    return true;
  };

  const promote = (s, note) => {
    const p = s.player;
    const u = p.usage;
    p.squad = 'first';
    u.form = [];
    u.sinceChange = 0;
    u.lowered = false;
    u.benchGames = 0;
    let role;
    if (G.isPitcher(p)) {
      G.assignRole(s);
      if (p.role === 'CL') p.role = 'RP';
      u.trial = 3;
      role = G.roleName(p);
    } else {
      const v = G.batterView(s);
      const f = sumBat(u.farmForm.slice(-12));
      const farmHot = f.pa >= 30 && G.batDerived(f).ops >= 0.82;
      u.status = v.val >= v.bar - 0.03 || farmHot ? 'starter' : 'bench';
      u.slot = u.status === 'starter' ? G.computeSlot(s, v) : null;
      u.trial = u.status === 'starter' ? 8 : 0;
      role = u.status === 'starter' ? `${u.slot}番でスタメン起用` : 'まずは控えから';
    }
    G.refreshTrust(s);
    const first = !s.flags.firstPromotion;
    s.flags.firstPromotion = true;
    const up = G.squadName(p, 'first');
    G.scene(s, `${up}昇格！`, `${note ? note + '\n' : ''}${first ? `監督「${p.name}、明日から${up}だ。思い切ってやってこい！」\n\nついに念願の${up}昇格！` : `再び${up}に呼ばれた！今度こそ結果を残すぞ！`}\n（${role}）`, { big: `${up}昇格` });
    usageLog(s, `${up}に昇格（${role}）`, 'good');
    G.buzz(s, 'promote');
    if (first) s.history.push({ year: s.year, text: '初の1軍昇格' });
  };

  // ---------- 開幕時の起用 ----------
  G.openingUsage = (s) => {
    const p = s.player;
    const u = G.ensureUsage(s);
    u.form = [];
    u.sinceChange = 0;
    u.lowered = false;
    u.benchGames = 0;
    if (G.isPitcher(p)) {
      G.assignRole(s);
      u.trial = 2;
      return G.roleName(p);
    }
    const v = G.batterView(s);
    const open = s.open.bat;
    const openOPS = open.pa >= 10 ? G.batDerived(open).ops : null;
    const score = v.val + (openOPS !== null ? (openOPS - 0.7) * 0.25 : 0);
    u.status = score >= v.bar - 0.02 ? 'starter' : 'bench';
    u.slot = u.status === 'starter' ? G.computeSlot(s, { ...v, val: score }) : null;
    u.trial = u.status === 'starter' ? (v.established ? 15 : 8) : 0;
    return u.status === 'starter' ? `${u.slot}番でスタメン` : 'ベンチスタート';
  };

  // 画面表示用の起用説明
  G.usageSummary = (s) => {
    const p = s.player;
    if (p.squad !== 'first' || s.retired) return null;
    const u = G.ensureUsage(s);
    if (G.isPitcher(p)) {
      const v = G.pitcherView(s);
      const recent = v.formERA !== null ? `直近の防御率 ${v.formERA.toFixed(2)}` : '登板を重ねて評価が決まる';
      return { role: G.roleName(p), detail: recent };
    }
    const v = G.batterView(s);
    const role = u.status === 'starter' ? `${u.slot}番・スタメン` : p.batter.fielding >= 66 ? '控え（守備固め・代打）' : '控え（代打要員）';
    let detail = v.formPA >= 15 ? `直近${Math.min(FORM_GAMES, u.form.length)}試合 打率${fmt(v.formAvg)}・OPS ${fmt(v.formOPS)}` : 'まだ打席が少ない';
    if (v.recentE || v.recentFine) detail += `／守備 失策${v.recentE}・好守${v.recentFine}`;
    let mood;
    if (u.status === 'bench') mood = '監督「もう少しベンチで見ていろ」';
    else if (u.trial > 0) mood = '監督「しばらくは我慢して使う」';
    else if (v.recentE >= 3) mood = '監督「守備をなんとかしろ」';
    else if (v.formOPS !== null && v.formOPS < 0.5) mood = '監督の信頼が揺らいでいる…';
    else if (v.formOPS !== null && v.formOPS >= 0.9) mood = '監督「今のお前は外せない」';
    else mood = '';
    return { role, detail, mood };
  };
})();
