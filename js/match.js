// 試合ごとの作戦（この試合で意識すること）と、1試合ずつ進める仕組み
(function () {
  const G = window.G;

  // ---------- 作戦 ----------
  G.BAT_APPROACHES = [
    { id: 'normal', name: 'いつも通り', desc: '自分のスタイルで打席に立つ', mods: {} },
    { id: 'power', name: '長打狙い', desc: '一発を狙って強振。三振は増える', mods: { hr: 1.4, xbh: 1.25, k: 1.25, babip: 0.94, bb: 0.95 } },
    { id: 'contact', name: 'バットに当てていく', desc: 'コンパクトに。三振は減るが長打も減る', mods: { k: 0.65, hr: 0.55, babip: 1.04, xbh: 0.8, bb: 0.85 } },
    { id: 'patient', name: '見ていく', desc: '球数を投げさせて四球を狙う', mods: { bb: 1.6, k: 1.12, hr: 0.9, babip: 0.97 } },
    { id: 'aggressive', name: '初球から積極的に', desc: '甘い球を逃さず打ちにいく', mods: { bb: 0.55, k: 0.85, hr: 1.12, babip: 1.02 } },
    { id: 'speed', name: '足でかき回す', desc: 'セーフティバントや盗塁を仕掛ける', req: (p) => p.batter.speed >= 50, mods: { sb: 2.5, babip: 1.04, hr: 0.7, xbh: 0.9 } },
  ];

  G.PIT_APPROACHES = [
    { id: 'normal', name: 'いつも通り', desc: '自分の投球をする', mods: {} },
    { id: 'power', name: '力で押す', desc: '直球で真っ向勝負。三振は増えるが一発も', mods: { k: 1.3, hr: 1.35, hit: 0.95, bb: 1.05 }, inn: -0.5 },
    { id: 'low', name: '低めを丁寧に', desc: '長打を防ぐ。四球はやや増える', mods: { hr: 0.55, bb: 1.25, k: 0.92, run: 0.95 } },
    { id: 'tempo', name: '打たせて取る', desc: 'テンポよく、長いイニングを投げる', mods: { k: 0.75, bb: 0.7, hit: 1.06 }, inn: 1 },
    { id: 'breaking', name: '変化球中心', desc: '持ち球の変化球でかわす', mods: { k: 1.15, bb: 1.15, run: 0.97 } },
    { id: 'inside', name: '内角を厳しく', desc: '強気に懐を攻める', mods: { k: 1.1, hit: 0.92, bb: 1.2 } },
  ];

  // 対戦相手の特徴（作戦との相性がある）
  G.OPP_PITCHERS = [
    { id: 'fast', name: '速球派', hint: '150km/hを超える直球でねじ伏せてくる', good: ['contact'], bad: ['power'], mods: { k: 1.15 } },
    { id: 'control', name: '技巧派', hint: 'コーナーぎりぎりを突く。四球は期待できない', good: ['aggressive'], bad: ['patient'], mods: { bb: 0.75 } },
    { id: 'soft', name: '軟投派', hint: '球は遅いが、緩急でタイミングを外してくる', good: ['power'], bad: ['contact'], mods: { k: 0.9 } },
    { id: 'wild', name: '制球難', hint: '球は速いが荒れ球。カウントを悪くしがち', good: ['patient'], bad: ['aggressive'], mods: { bb: 1.4 } },
    { id: 'ace', name: 'エース', hint: '相手チームの絶対的エース。甘い球はほとんどない', good: ['contact'], bad: ['aggressive'], mods: { k: 1.1, babip: 0.94, hr: 0.8 } },
  ];

  G.OPP_LINEUPS = [
    { id: 'slugger', name: '長距離砲ぞろい', hint: '一発のある打者が並ぶ', good: ['low'], bad: ['power'] },
    { id: 'contact', name: '巧打者ぞろい', hint: 'しぶとく当ててくる', good: ['power', 'inside'], bad: ['tempo'] },
    { id: 'patient', name: '選球眼が良い', hint: 'ボール球にはまず手を出さない', good: ['tempo'], bad: ['breaking'] },
    { id: 'aggressive', name: '早打ち傾向', hint: '初球からどんどん振ってくる', good: ['breaking', 'low'], bad: ['inside'] },
    { id: 'speed', name: '機動力野球', hint: '塁に出ると足でかき回してくる', good: ['tempo'], bad: ['low'] },
  ];

  G.approachList = (p) => (G.isPitcher(p) ? G.PIT_APPROACHES : G.BAT_APPROACHES).filter((a) => !a.req || a.req(p));
  G.approachById = (p, id) => (G.isPitcher(p) ? G.PIT_APPROACHES : G.BAT_APPROACHES).find((a) => a.id === id) || (G.isPitcher(p) ? G.PIT_APPROACHES : G.BAT_APPROACHES)[0];
  G.defaultApproach = (s) => {
    const p = s.player;
    const key = G.isPitcher(p) ? 'pitApproach' : 'batApproach';
    return s.flags[key] || 'normal';
  };

  G.levelOffset = (s) => (s.player.league === 'mlb' ? -6 : 0);

  // 試合内容の出来（good / ok / bad）
  G.judgeGame = (res) => {
    const l = res.line;
    if (res.kind === 'bat') {
      if (!l.pa) return res.fld && res.fld.e ? 'bad' : res.fld && res.fld.fine ? 'good' : 'ok';
      const tb = l.h + l.d + 2 * l.t + 3 * l.hr;
      if (l.hr || l.h >= 2 || (l.h >= 1 && (l.bb || l.rbi >= 2)) || tb + l.bb >= Math.max(2, l.pa - 2)) return 'good';
      if (l.h === 0 && l.bb === 0) return 'bad';
      if (l.pa >= 4 && l.h === 0 && l.k >= 2) return 'bad';
      return 'ok';
    }
    if (res.kind === 'pit') {
      if (l.gs) {
        if (l.outs >= 18 && l.r <= 2) return 'good';
        if (l.r >= 5 || (l.outs < 15 && l.r >= 3)) return 'bad';
        return 'ok';
      }
      if (l.r === 0) return 'good';
      if (res.blown || l.l || l.r >= 2) return 'bad';
      return 'ok';
    }
    return 'ok';
  };

  // 作戦の振り返り。相性と実際の結果の両方を見て、言っていることと結果が食い違わないようにする
  G.planReview = (s, res) => {
    const g = G.judgeGame(res);
    const l = res.line;
    const ap = res.ap;
    if (res.kind === 'bat' && !l.pa) return null;
    // 作戦そのものの手応え
    let note = '';
    if (res.kind === 'bat') {
      if (ap === 'power' && l.hr) note = '狙い通りの一発！';
      else if (ap === 'power' && l.k >= 2) note = '強振が空回りしてしまった。';
      else if (ap === 'contact' && l.k >= 2) note = '当てにいったのに三振…。';
      else if (ap === 'contact' && l.h && !l.k) note = 'しっかりバットに当てられた。';
      else if (ap === 'patient' && l.bb) note = 'じっくり見て四球をもぎ取った。';
      else if (ap === 'patient' && l.k >= 2) note = '見すぎて追い込まれてしまった。';
      else if (ap === 'aggressive' && l.h && !l.k) note = '積極的に振って結果を出した。';
      else if (ap === 'speed' && l.sb) note = '足で相手をかき回した！';
    } else if (res.kind === 'pit') {
      if (ap === 'power' && l.k >= (l.gs ? 7 : 2)) note = '直球で押し込めた。';
      else if (ap === 'power' && l.hr) note = '力勝負の直球を一発された…。';
      else if (ap === 'low' && !l.hr && l.r <= 1) note = '低めに集めて長打を許さなかった。';
      else if (ap === 'low' && l.bb >= 3) note = '低めを意識しすぎて四球が増えた。';
      else if (ap === 'tempo' && l.gs && l.outs >= 21) note = 'テンポよく長いイニングを投げられた。';
    }
    let cls;
    let text;
    if (res.match === 'good') {
      if (g === 'good') [cls, text] = ['good', '読みが当たった！ 作戦がハマった。'];
      else if (g === 'ok') [cls, text] = ['neutral', '狙いは悪くなかった。あと一本が出れば…。'];
      else [cls, text] = ['neutral', '作戦の方向性は合っていたが、相手が一枚上手だった。'];
    } else if (res.match === 'bad') {
      if (g === 'good') [cls, text] = ['good', '作戦は裏目だったが、実力でねじ伏せた！'];
      else if (g === 'ok') [cls, text] = ['neutral', '相手にうまく対応された。作戦を見直したい。'];
      else [cls, text] = ['bad', '相手の思うつぼだった…。作戦が裏目に出た。'];
    } else {
      if (g === 'good') [cls, text] = ['good', '自分のバッティングができた。'];
      else if (g === 'bad') [cls, text] = ['bad', '今日は相手が上だった。'];
      else return note ? { cls: 'neutral', text: note } : null;
      if (res.kind === 'pit') text = g === 'good' ? '自分の投球ができた。' : '今日は打たれてしまった。';
    }
    return { cls, text: note ? `${text}${note}` : text };
  };

  const mergeMods = (...list) => {
    const out = {};
    for (const m of list) for (const k in m) out[k] = (out[k] === undefined ? 1 : out[k]) * m[k];
    return out;
  };

  G.battingOrder = (p) => {
    const b = p.batter;
    if (G.overall(p) >= 68 && b.power >= 65) return '4番';
    if (b.speed >= 62 && b.contact >= b.power) return '1番';
    if (b.contact >= 62) return '3番';
    if (b.power >= 60) return '5番';
    return G.pick(['2番', '6番', '7番']);
  };

  // ---------- 打席・投球の実況 ----------
  G.paText = (pa) => {
    const t = {
      HR: () => `${G.pick(['レフトスタンド', 'ライトスタンド', 'バックスクリーン', 'センター後方'])}へ飛び込むホームラン！`,
      '3B': () => '右中間を深々と破るスリーベース！',
      '2B': () => `${G.pick(['左中間を破る', '右中間を破る', 'レフト線への', 'ライト線への'])}ツーベース`,
      '1B': () => `${G.pick(['センター前', 'レフト前', 'ライト前', '三遊間を破る', '一二塁間を抜ける', '内野安打の'])}ヒット`,
      BB: () => '四球を選んだ',
      K: () => G.pick(['空振り三振', '見逃し三振', '空振り三振']),
      OUT: () => G.pick(['ショートゴロ', 'セカンドゴロ', 'センターフライ', 'レフトフライ', 'サードライナー', 'ファーストゴロ', 'ライトフライ', 'ピッチャーゴロ']),
    }[pa.code]();
    return pa.rbi ? `${t}（${pa.rbi}打点）` : t;
  };

  G.inningText = (runs, startInning = 1) =>
    runs.map((r, i) => `${startInning + i}回：${r === 0 ? G.pick(['三者凡退', '無失点', 'ピンチをしのぐ', '0点に抑える']) : `${r}失点`}`);

  // ---------- 1試合の準備（出場するか・相手の特徴） ----------
  G.prepareOwnGame = (s, oppId) => {
    const p = s.player;
    const myStr = G.teamStrength(s, p.teamId) + G.playerTeamBonus(s);
    const oppStr = G.teamStrength(s, oppId);
    const ctx = { oppId, myStr, oppStr, kind: null };
    const active = p.squad === 'first' && !p.injury && !s.retired;
    if (!active) return ctx;
    if (!G.isPitcher(p)) {
      const u = G.ensureUsage(s);
      const regular = u.status === 'starter' && u.slot;
      const spot = !regular && G.chance(0.12);
      const starter = regular || spot;
      const slot = regular ? u.slot : spot ? (p.position === 'C' ? 8 : G.pick([7, 8])) : null;
      const nPA = starter ? (G.chance(slot <= 3 ? 0.55 : slot >= 7 ? 0.3 : 0.45) ? 5 : 4) : G.chance(0.35) ? 1 : 0;
      const oppP = { name: G.randomMaleName(), type: G.pick(G.OPP_PITCHERS).id };
      if (nPA) {
        Object.assign(ctx, { kind: 'bat', nPA, starter, order: starter ? `${slot}番${spot ? '（休養日の代役）' : ''}` : '代打', oppP });
      } else if (p.batter.fielding >= 66 && G.chance(0.3)) {
        // 守備の良い控え選手は終盤の守備固めで出場
        Object.assign(ctx, { kind: 'bat', nPA: G.chance(0.3) ? 1 : 0, starter: false, defOnly: true, order: '守備固め', oppP });
      }
    } else if (p.role === 'SP') {
      s.rotation = (s.rotation || 0) + 1;
      if (s.rotation % 6 === 0) {
        const inn = G.clamp(4 + p.pitcher.stamina * 0.045 + G.gauss(0, 0.8) + (p.skills.includes('quick') ? 0.5 : 0), 3, 9);
        Object.assign(ctx, { kind: 'pit', role: 'SP', inn, lineup: G.pick(G.OPP_LINEUPS).id, situation: '先発マウンドに上がる' });
      }
    } else {
      const pWin = G.clamp(0.5 + (myStr - oppStr) * 0.012, 0.25, 0.75);
      const pre = G.chance(0.03) ? 'D' : G.chance(pWin) ? 'W' : 'L';
      const lead = G.ri(1, 4);
      const rank = p.role === 'CL' ? 'CL' : p.rpRank || 'mid';
      const close = pre === 'W' && lead <= 3;
      let appear;
      if (rank === 'CL') appear = close ? G.chance(0.85) : G.chance(0.12);
      else if (rank === 'setup') appear = close ? G.chance(0.65) : G.chance(0.12);
      else if (rank === 'mid') appear = G.chance(0.38);
      else appear = pre === 'L' ? G.chance(0.5) : G.chance(0.08);
      if (appear) {
        let situation;
        if (rank === 'CL' && close) situation = `9回、${lead}点リードの場面で登板！`;
        else if (rank === 'setup' && close) situation = `8回、${lead}点リードの場面で登板`;
        else if (rank === 'mop') situation = `${G.ri(5, 8)}回、ビハインドの場面で登板`;
        else if (close) situation = `${G.ri(6, 7)}回、${lead}点リードの場面で登板`;
        else if (pre === 'D') situation = `${G.ri(7, 9)}回、同点の場面で登板`;
        else situation = `${G.ri(6, 9)}回、${pre === 'W' ? '大量リード' : 'ビハインド'}の場面で登板`;
        Object.assign(ctx, { kind: 'pit', role: p.role, pre, lead, lineup: G.pick(G.OPP_LINEUPS).id, situation });
      }
    }
    return ctx;
  };

  // ---------- 1試合の実行 ----------
  G.executeOwnGame = (s, ctx, apId) => {
    const p = s.player;
    const { oppId, myStr, oppStr } = ctx;
    let pWin = G.clamp(0.5 + (myStr - oppStr) * 0.012, 0.25, 0.75);
    const res = { oppId, kind: ctx.kind, line: null, ap: apId, order: ctx.order, situation: ctx.situation };
    const off = G.levelOffset(s);
    let outcome = null;
    let score = null;

    if (ctx.kind === 'bat') {
      const ap = G.approachById(p, apId);
      const opp = G.OPP_PITCHERS.find((o) => o.id === ctx.oppP.type);
      const match = opp.good.includes(ap.id) ? 'good' : opp.bad.includes(ap.id) ? 'bad' : null;
      const matchMods = match === 'good' ? { babip: 1.05, hr: 1.15, k: 0.88 } : match === 'bad' ? { babip: 0.95, hr: 0.85, k: 1.12 } : {};
      const pas = [];
      const st = G.simPlateAppearances(p, ctx.nPA, off, mergeMods(ap.mods, opp.mods, matchMods), pas);
      st.g = 1;
      res.line = st;
      res.pas = pas;
      res.match = match;
      res.oppP = ctx.oppP;
      pWin = G.clamp(pWin + G.batGameValue(st) * 0.035, 0.1, 0.9);
      // 守備（スタメンはフル、守備固めは終盤だけ）
      if (ctx.starter || ctx.defOnly) {
        const plays = [];
        const fld = G.simFielding(p, ctx.starter ? 1 : 0.25, plays);
        res.fld = fld;
        res.plays = plays;
        pWin = G.clamp(pWin - fld.e * 0.06 + fld.fine * 0.03 + fld.cs * 0.02 - fld.pb * 0.02, 0.08, 0.92);
      }
      const d = G.chance(0.03);
      outcome = d ? 'D' : G.chance(pWin) ? 'W' : 'L';
      score = G.scoreline(outcome === 'W', d, Math.max(st.rbi, st.r));
    } else if (ctx.kind === 'pit') {
      const ap = G.approachById(p, apId);
      const lu = G.OPP_LINEUPS.find((o) => o.id === ctx.lineup);
      const match = lu.good.includes(ap.id) ? 'good' : lu.bad.includes(ap.id) ? 'bad' : null;
      const matchMods = match === 'good' ? { run: 0.8, k: 1.08 } : match === 'bad' ? { run: 1.2, hit: 1.08 } : {};
      let apMods = ap.mods;
      if (ap.id === 'breaking') {
        const total = p.pitcher.pitches.reduce((a, x) => a + x.level, 0);
        apMods = { ...apMods, run: total >= 12 ? 0.9 : total >= 7 ? 0.97 : 1.08 };
      }
      const mods = mergeMods(apMods, matchMods);
      const inns = [];
      res.match = match;
      res.lineup = ctx.lineup;
      if (ctx.role === 'SP') {
        const st = G.simPitching(p, G.clamp(ctx.inn + (ap.inn || 0), 3, 9), off, { starter: true, mods, out: inns });
        st.gs = 1;
        const pen = 27 - st.outs;
        const penRuns = G.poisson((pen / 3) * (3.7 / 9));
        const offL = 3.9 + (myStr - 50) * 0.06 - (oppStr - 50) * 0.03;
        let ours = G.poisson(offL);
        let theirs = st.r + penRuns;
        if (ours === theirs) {
          if (G.chance(0.15)) outcome = 'D';
          else if (G.chance(0.5)) {
            ours++;
            outcome = 'W';
            res.extra = true;
          } else {
            theirs++;
            outcome = 'L';
            res.extra = true;
          }
        } else outcome = ours > theirs ? 'W' : 'L';
        if (outcome === 'W' && st.outs >= 15 && st.r < ours && G.chance(0.82)) st.w = 1;
        if (outcome === 'L' && st.r > ours) st.l = 1;
        score = [ours, theirs];
        res.line = st;
        res.innings = inns;
        res.startInning = 1;
      } else {
        outcome = ctx.pre;
        const st = G.simPitching(p, 1, off, { mods, out: inns });
        const lead = ctx.lead;
        if (ctx.role === 'CL' && outcome === 'W' && lead <= 3) {
          if (st.r >= lead) {
            res.blown = true;
            if (G.chance(0.6)) {
              st.l = 1;
              outcome = 'L';
            } else outcome = 'D';
          } else st.s = 1;
        } else if (ctx.role !== 'CL' && outcome === 'W' && lead <= 3) {
          if (st.r >= lead) {
            if (G.chance(0.5)) {
              st.l = 1;
              outcome = 'L';
            }
          } else st.hld = 1;
        }
        res.line = st;
        res.innings = inns;
        res.startInning = Number((ctx.situation.match(/^(\d)回/) || [0, 9])[1]);
        // スコアは「登板した場面」と「自分の失点」に合わせる
        const base = G.ri(1, 5);
        if (outcome === 'W') {
          const margin = Math.max(1, lead - st.r);
          score = [base + margin + st.r, base + st.r];
        } else if (outcome === 'D') score = [base + st.r, base + st.r];
        else if (ctx.pre === 'W') score = [base + lead, base + lead + Math.max(1, st.r - lead)];
        else score = [base, base + Math.max(1, G.ri(1, 4)) + st.r];
      }
    }

    if (!outcome) {
      const d = G.chance(0.03);
      outcome = d ? 'D' : G.chance(pWin) ? 'W' : 'L';
      score = G.scoreline(outcome === 'W', d);
    }
    res.outcome = outcome;
    res.score = score;
    return res;
  };

  // ---------- スコアボード ----------
  // 合計を各イニングにランダムに振り分ける
  const spread = (total, from, to, arr) => {
    for (let i = 0; i < total; i++) {
      const k = G.ri(from, to);
      arr[k - 1] = (arr[k - 1] || 0) + 1;
    }
  };

  // 試合結果（スコア・自分の投球・登板した場面）と矛盾しないイニングスコアをつくる
  G.buildBox = (s, res, ctx) => {
    const p = s.player;
    const [ours, theirs] = res.score;
    let n = 9;
    const our = new Array(12).fill(0);
    const opp = new Array(12).fill(0);
    let decided = false;
    if (res.kind === 'pit' && ctx.role === 'SP') {
      const inns = res.innings || [];
      inns.forEach((r, i) => (opp[i] = r));
      const rest = Math.max(0, theirs - inns.reduce((a, b) => a + b, 0));
      if (res.extra) {
        n = 10;
        const winnerOurs = res.outcome === 'W';
        spread(winnerOurs ? ours - 1 : ours, 1, 9, our);
        spread(winnerOurs ? rest : rest - 1, Math.min(9, inns.length + 1), 9, opp);
        if (winnerOurs) our[9] = 1;
        else opp[9] = 1;
        decided = true;
      } else {
        spread(ours, 1, 9, our);
        spread(rest, Math.min(9, inns.length + 1), 9, opp);
        decided = true;
      }
    } else if (res.kind === 'pit') {
      // 救援：登板した回は自分の失点。登板時点の点差を合わせる
      const k = Math.min(9, res.startInning || 9);
      const r = res.line.r;
      const lead = ctx.pre === 'W' ? ctx.lead : ctx.pre === 'D' ? 0 : -G.ri(1, 3);
      let tb = Math.max(0, Math.min(theirs - r, ours - lead));
      if (lead < 0) tb = Math.max(tb, -lead);
      const ob = tb + lead;
      if (ob >= 0 && tb >= 0 && ob <= ours && tb + r <= theirs) {
        spread(ob, 1, k - 1 || 1, our);
        spread(tb, 1, k - 1 || 1, opp);
        opp[k - 1] += r;
        const oa = ours - ob;
        const ta = theirs - tb - r;
        if (k >= 9 && (oa || ta)) {
          n = 10;
          spread(oa, 10, 10, our);
          spread(ta, 10, 10, opp);
        } else {
          spread(oa, k, 9, our);
          spread(ta, Math.min(9, k + 1), 9, opp);
        }
        decided = true;
      }
    }
    if (!decided) {
      spread(ours, 1, 9, our);
      spread(theirs, 1, 9, opp);
    }
    if (res.outcome === 'D' && n === 9) n = 12; // 引き分けは延長12回まで
    // 自分の投球で決まっているイニング（ここの得点は動かせない）
    let oppLocked = 0;
    let ourFrom = 0;
    if (res.kind === 'pit' && ctx.role === 'SP') oppLocked = (res.innings || []).length;
    else if (res.kind === 'pit' && decided) {
      oppLocked = Math.min(9, res.startInning || 9);
      ourFrom = oppLocked - 1;
    }
    // ホームチームが最終回の表の時点で勝っていれば、裏は「X」。裏の得点は前の回へ移す
    const settle = (home) => {
      const homeArr = home ? our : opp;
      const awayR = home ? theirs : ours;
      const homeR = home ? ours : theirs;
      if (homeR <= awayR) return { ok: true, last: homeArr[n - 1] };
      const before = homeArr.slice(0, n - 1).reduce((a, b) => a + b, 0);
      if (before <= awayR) return { ok: true, last: `${homeArr[n - 1]}x` }; // サヨナラ
      if (!homeArr[n - 1]) return { ok: true, last: 'X' };
      const lo = home ? ourFrom : oppLocked;
      if (lo > n - 2) return { ok: false };
      homeArr[G.ri(lo, n - 2)] += homeArr[n - 1];
      homeArr[n - 1] = 0;
      return { ok: true, last: 'X' };
    };
    let home = ctx.home;
    let st = settle(home);
    if (!st.ok) {
      home = !home;
      st = settle(home);
    }
    const homeArr = home ? our : opp;
    const awayArr = home ? opp : our;
    const homeR = home ? ours : theirs;
    const awayR = home ? theirs : ours;
    const lastHome = st.ok ? st.last : homeArr[n - 1];
    const ourH = Math.max(ours + G.ri(2, 6), res.line && res.kind === 'bat' ? res.line.h + G.ri(3, 7) : 0);
    const theirH = Math.max(theirs + G.ri(2, 6), res.line && res.kind === 'pit' ? res.line.h : 0);
    const ourE = (res.fld ? res.fld.e : 0) + (G.chance(0.2) ? 1 : 0);
    const theirE = G.chance(0.3) ? 1 : 0;
    // 責任投手
    const roster = G.ensureRoster(s).players;
    const mate = (role) => {
      const list = roster.filter((m) => m.pos === 'P' && (role ? m.role === role : m.role !== 'farm'));
      return list.length ? G.pick(list).name : G.randomMaleName();
    };
    const me = p.name;
    const line = res.kind === 'pit' ? res.line : {};
    let w;
    let l;
    let sv = null;
    if (res.outcome === 'W') {
      w = line.w ? me : mate(G.chance(0.6) ? 'SP' : null);
      l = G.randomMaleName();
      if (line.s) sv = me;
      else if (ours - theirs <= 3 && G.chance(0.65)) sv = mate('CL');
      if (sv === w) sv = null;
    } else if (res.outcome === 'L') {
      l = line.l ? me : mate(G.chance(0.6) ? 'SP' : null);
      w = G.randomMaleName();
      if (theirs - ours <= 3 && G.chance(0.6)) sv = G.randomMaleName();
    }
    // 本塁打（自分の分は通算何号かも）
    const hrs = [];
    if (res.kind === 'bat' && res.pas) {
      let num = s.stats.bat.hr;
      for (const pa of res.pas)
        if (pa.code === 'HR') {
          num++;
          hrs.push(`${me} ${num}号（${['', 'ソロ', '2ラン', '3ラン', '満塁'][Math.min(4, pa.rbi)]}）`);
        }
    }
    const lines = (arr, R) => arr.slice(0, n).map((x) => x);
    const awayLine = lines(awayArr);
    const homeLine = lines(homeArr);
    homeLine[n - 1] = lastHome;
    return {
      n,
      home,
      oppId: res.oppId,
      away: { id: home ? res.oppId : p.teamId, line: awayLine, R: awayR, H: home ? theirH : ourH, E: home ? theirE : ourE },
      homeT: { id: home ? p.teamId : res.oppId, line: homeLine, R: homeR, H: home ? ourH : theirH, E: home ? ourE : theirE },
      w,
      l,
      sv,
      hrs,
    };
  };

  // ---------- 1日分（全試合）の準備と実行 ----------
  const prepareDay = (s) => {
    const p = s.player;
    const gw = s.gw;
    const day = gw.days[gw.d];
    if (day.rain) {
      gw.cur = { rain: true, day };
      return;
    }
    const pairs = {};
    let own = null;
    const addPair = (lgId, a, b) => {
      if (a === p.teamId || b === p.teamId) {
        own = G.prepareOwnGame(s, a === p.teamId ? b : a);
        own.home = G.chance(0.5);
        own.inter = !!day.inter;
      } else (pairs[lgId] = pairs[lgId] || []).push([a, b]);
    };
    const npb = G.LEAGUES.filter((lg) => !lg.mlb);
    if (day.inter && npb.length === 2) {
      // 交流戦：セとパのように、別リーグのチームと対戦
      const A = G.shuffle(G.TEAMS.filter((t) => t.league === npb[0].id).map((t) => t.id));
      const B = G.shuffle(G.TEAMS.filter((t) => t.league === npb[1].id).map((t) => t.id));
      A.forEach((a, i) => addPair('inter', a, B[i]));
    }
    for (const lg of G.LEAGUES) {
      if (day.inter && !lg.mlb) continue;
      const ids = G.shuffle(G.TEAMS.filter((t) => t.league === lg.id).map((t) => t.id));
      for (let i = 0; i + 1 < ids.length; i += 2) addPair(lg.id, ids[i], ids[i + 1]);
    }
    gw.cur = { pairs, own, day };
  };

  const executeDay = (s, apId) => {
    const p = s.player;
    const gw = s.gw;
    const { pairs, own, day } = gw.cur;
    if (gw.cur.rain) {
      gw.games.push({ rain: true, date: day.d });
      gw.d++;
      gw.cur = null;
      return null;
    }
    for (const lg in pairs) {
      for (const [a, b] of pairs[lg]) {
        const o = G.playNpcGame(s, a, b);
        G.recordResult(s, a, o);
        G.recordResult(s, b, G.flip(o));
      }
    }
    let res = null;
    s.dayCount = (s.dayCount || 0) + 1;
    gw.played = (gw.played || 0) + 1;
    if (own) {
      res = G.executeOwnGame(s, own, apId);
      res.date = day.d;
      res.inter = !!day.inter;
      res.box = G.buildBox(s, res, own);
      G.recordResult(s, p.teamId, res.outcome);
      G.recordResult(s, own.oppId, G.flip(res.outcome));
      gw.games.push(res);
      if (res.kind === 'bat') G.addStats(gw.acc.weekBat, res.line);
      if (res.kind === 'pit') G.addStats(gw.acc.weekPit, res.line);
      if (res.fld) G.addStats(gw.acc.weekFld, res.fld);
      if (res.kind === 'bat') {
        const l = res.line;
        if (l.hr >= 2 || l.h >= 3) G.buzz(s, 'hotgame', { text: l.hr >= 2 ? `${l.hr}本塁打の大暴れ` : `${l.h}安打の猛打賞` });
        if (res.fld && res.fld.e && res.outcome === 'L') G.buzz(s, 'error');
        if (res.fld && res.fld.fine && res.outcome === 'W') G.buzz(s, 'fine');
      }
      // 監督の判断（打順・スタメン・登録抹消）は毎試合
      G.managerAfterDay(s, res);
    }
    if (p.squad === 'second' && !p.injury && !s.retired) {
      const fr = G.playFarmGame(s);
      if (fr && fr.kind === 'bat') G.addStats(gw.acc.farmBat, fr.line);
      if (fr && fr.kind === 'pit') G.addStats(gw.acc.farmPit, fr.line);
      if (fr) {
        const u = G.ensureUsage(s);
        u.farmForm.push(fr.line);
        if (u.farmForm.length > 15) u.farmForm.shift();
      }
    }
    gw.d++;
    gw.cur = null;
    return res;
  };

  // ---------- 1週間の試合の進行 ----------
  G.startGames = (s) => {
    const days = G.daysInWeek(s.week, s.year).slice();
    s.gw = {
      n: days.length,
      days,
      d: 0,
      played: 0,
      cur: null,
      last: null,
      await: false,
      games: [],
      before: { ...s.standings[s.player.teamId] },
      acc: { weekBat: G.emptyBat(), weekPit: G.emptyPit(), weekFld: G.emptyFld(), farmBat: G.emptyBat(), farmPit: G.emptyPit() },
    };
  };

  const interactive = (s) => s.flags.gameMode !== 'auto';

  // 次に自分の判断が必要になるところまで進める
  G.stepGames = (s, apId) => {
    const gw = s.gw;
    gw.last = null;
    while (gw.d < gw.n) {
      if (!gw.cur) prepareDay(s);
      const needs = interactive(s) && !gw.cur.rain && gw.cur.own && gw.cur.own.kind;
      if (needs && !apId) {
        gw.await = true;
        return;
      }
      gw.await = false;
      const res = executeDay(s, apId || G.defaultApproach(s));
      apId = null;
      if (needs) {
        gw.last = res;
        return;
      }
    }
    G.finishGames(s);
  };

  // 今週の残りの試合をすべて「いつもの作戦」で進める
  G.autoRestGames = (s) => {
    const gw = s.gw;
    gw.last = null;
    while (gw.d < gw.n) {
      if (!gw.cur) prepareDay(s);
      executeDay(s, G.defaultApproach(s));
    }
    G.finishGames(s);
  };

  // 週の試合（スコアボードつき）を、次の週に振り返れるように残す
  const keepWeek = (s, gw) => {
    s.lastGames = gw.games.map((g) => (g.rain ? { rain: true, date: g.date } : { date: g.date, outcome: g.outcome, score: g.score, oppId: g.oppId, inter: g.inter, box: g.box, kind: g.kind, text: g.kind === 'bat' ? G.batLineText(g.line) : g.kind === 'pit' ? G.pitLineText(g.line) : '出場なし' }));
  };

  G.finishGames = (s) => {
    const gw = s.gw;
    s.gw = null;
    keepWeek(s, gw);
    G.endWeek(s, gw);
  };

  // テスト用：対話なしで1週間分をまとめて行う
  G.simWeekGames = (s) => {
    G.startGames(s);
    const gw = s.gw;
    while (gw.d < gw.n) {
      prepareDay(s);
      executeDay(s, G.defaultApproach(s));
    }
    s.gw = null;
    keepWeek(s, gw);
    return gw;
  };
})();
