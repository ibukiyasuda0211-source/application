// 「ここぞ！」の場面（試合終盤の勝負どころだけ、プレイヤーが作戦を選ぶ）
// 結果はスコア・イニングスコア・自分の成績と食い違わないように組み立てる
(function () {
  const G = window.G;

  const BASES = [
    { v: '満塁', n: 3, weight: 4 },
    { v: '二・三塁', n: 2, weight: 3 },
    { v: '一・二塁', n: 2, weight: 2 },
    { v: '二塁', n: 1, weight: 1 },
  ];

  // 自分と同じ苗字にならない相手の名前
  const otherName = (s) => {
    const fam = s.player.name.split(' ')[0];
    let n = G.randomMaleName();
    for (let i = 0; i < 20 && n.split(' ')[0] === fam; i++) n = G.randomMaleName();
    return n;
  };

  // 試合の前に「勝負どころが来るか」を決めておく（prepareDay でホーム／ビジターが決まったあと）
  G.planClutch = (s, own) => {
    if (!own || !own.kind) return;
    if (own.kind === 'bat') {
      if (own.defOnly) return;
      const pinch = own.order === '代打';
      if (!G.chance(pinch ? 0.28 : 0.07)) return;
      const inning = G.pick([7, 8, 9, 9, 9]);
      const b = G.weighted(BASES);
      let diff;
      if (b.n === 3) diff = G.pick([-1, -1, -2, 0]);
      else if (b.n === 2) diff = G.pick([-1, -1, 0]);
      else diff = G.pick([0, -1]);
      own.clutch = { type: 'bat', inning, bottom: !!own.home, bases: b.v, runners: b.n, diff, pinch, reliever: otherName(s) };
    } else if (own.kind === 'pit' && own.role !== 'SP' && own.pre === 'W' && own.lead <= 3) {
      const rank = own.role === 'CL' ? 'CL' : s.player.rpRank;
      const pr = rank === 'CL' ? 0.3 : rank === 'setup' ? 0.2 : 0.12;
      if (!G.chance(pr)) return;
      const b = G.chance(0.6) ? BASES[0] : BASES[1];
      const inning = Number((own.situation.match(/^(\d)回/) || [0, 9])[1]);
      own.clutch = { type: 'pit', inning, bottom: !own.home, bases: b.v, runners: b.n, lead: own.lead, batter: otherName(s) };
    }
  };

  // 場面の説明
  G.clutchText = (s, own) => {
    const c = own.clutch;
    const half = c.bottom ? '裏' : '表';
    if (c.type === 'bat') {
      const behind = -c.diff;
      let call;
      if (c.inning === 9 && c.bottom && c.runners > behind) call = behind === 0 ? 'ヒット1本でサヨナラだ！' : '一打逆転サヨナラのチャンス！';
      else if (c.runners > behind) call = behind === 0 ? '一打勝ち越しのチャンス！' : '一打逆転のチャンス！';
      else call = '一打同点のチャンス！';
      return {
        head: `${c.inning}回${half}　2アウト${c.bases}`,
        body: `${behind ? `${behind}点を追う` : '同点の'}場面で${c.pinch ? '、代打で名前がコールされた！' : '打席が回ってきた！'}\nマウンドには相手のリリーフ・${c.reliever}。\n\n${call}`,
      };
    }
    return {
      head: `${c.inning}回${half}　2アウト${c.bases}`,
      body: `${c.lead}点リードの場面で、ランナーをためてしまった。\n打席には一発のある${c.batter}。\n\n${c.lead === 1 ? '一打逆転のピンチ！' : '長打を打たれれば同点のピンチ！'}ここをしのげば勝利が近づく。`,
    };
  };

  // 選択肢。特殊能力を持っていれば、それを生かした作戦も選べる
  G.clutchChoices = (s, own) => {
    const p = s.player;
    const sk = (id) => p.skills.includes(id);
    if (own.clutch.type === 'bat') {
      const list = [
        { id: 'sweet', name: '甘い球を一球で仕留める', desc: 'ヒット狙い。いちばん確実', hit: 0.02, hr: 1, bb: 0.7 },
        { id: 'big', name: '一発を狙ってフルスイング', desc: '決まれば本塁打。凡退も増える', hit: -0.05, hr: 2.4, bb: 0.6 },
        { id: 'wait', name: 'じっくり見極める', desc: '四球や失投を待つ' + (own.clutch.runners === 3 ? '（押し出しも）' : ''), hit: -0.04, hr: 0.8, bb: 2.6 },
        { id: 'oppo', name: 'つなぐ意識で逆方向へ', desc: '単打でいい。三振しにくい', hit: 0.05, hr: 0.4, bb: 0.8 },
      ];
      if (sk('chance')) list.push({ id: 'sk_chance', name: '【チャンス◯】ここで決めるのが自分の仕事', desc: '勝負強さを信じる。成功率が大きく上がる', hit: 0.12, hr: 1.1, bb: 0.8, skill: true });
      else if (sk('powerhit')) list.push({ id: 'sk_power', name: '【パワーヒッター】スタンドまで運ぶ', desc: '持ち前の長打力で勝負', hit: 0.02, hr: 2.8, bb: 0.6, skill: true });
      else if (sk('avg')) list.push({ id: 'sk_avg', name: '【アベレージヒッター】確実に芯でとらえる', desc: 'ヒットの確率が上がる', hit: 0.08, hr: 0.9, bb: 0.7, skill: true });
      else if (sk('eye')) list.push({ id: 'sk_eye', name: '【選球眼】ボール球には手を出さない', desc: '四球を選びやすい', hit: 0, hr: 0.9, bb: 3.2, skill: true });
      return list;
    }
    const list = [
      { id: 'power', name: '力で押す（直球勝負）', desc: '三振を狙う。打たれれば長打も', ok: 0.0, k: 0.7, xbh: 0.5 },
      { id: 'low', name: '低めの変化球で打たせて取る', desc: '長打を防ぐ', ok: 0.02, k: 0.3, xbh: 0.15 },
      { id: 'corner', name: '際どいコースを突く', desc: '打たれにくいが、四球の危険' + (own.clutch.runners === 3 ? '（押し出し）' : ''), ok: 0.06, k: 0.4, xbh: 0.25, walk: 0.5 },
    ];
    if (sk('pinch')) list.push({ id: 'sk_pinch', name: '【ピンチ◯】ここからが本番だ', desc: 'ピンチでこそ力を発揮する', ok: 0.14, k: 0.5, xbh: 0.25, skill: true });
    else if (sk('kkk') || sk('kire') || sk('nobi')) list.push({ id: 'sk_k', name: `【${G.skillById(sk('kkk') ? 'kkk' : sk('kire') ? 'kire' : 'nobi').name}】三振で終わらせる`, desc: '決め球で三振を奪いにいく', ok: 0.08, k: 0.9, xbh: 0.4, skill: true });
    return list;
  };

  // 自動のとき（おまかせ・自動進行）の選択
  G.autoClutch = (s, own) => {
    const list = G.clutchChoices(s, own);
    return (list.find((x) => x.skill) || list[0]).id;
  };

  // ---------- 打者：勝負の1打席 ----------
  G.clutchAtBat = (s, own, choiceId) => {
    const p = s.player;
    const c = own.clutch;
    const ch = G.clutchChoices(s, own).find((x) => x.id === choiceId) || G.clutchChoices(s, own)[0];
    const off = G.COND_OFFSET[p.condition] + G.levelOffset(s) + (G.gameOffset ? G.gameOffset(s, own) : 0);
    const b = p.batter;
    const pHit = G.clamp(0.22 + (b.contact + off - 50) * 0.004 + ch.hit - (c.pinch ? 0.02 : 0), 0.1, 0.55);
    const pBB = G.clamp(0.06 * ch.bb, 0.02, 0.3);
    let code;
    const r = Math.random();
    if (r < pBB) code = 'BB';
    else if (r < pBB + pHit) {
      const hrShare = G.clamp((0.05 + Math.max(0, b.power + off - 40) * 0.006) * ch.hr, 0.02, 0.7);
      const x = Math.random();
      if (x < hrShare) code = 'HR';
      else if (x < hrShare + 0.03) code = '3B';
      else if (x < hrShare + 0.03 + 0.2 + b.power * 0.001) code = '2B';
      else code = '1B';
    } else code = G.chance(choiceId === 'big' ? 0.55 : choiceId === 'oppo' ? 0.2 : 0.35) ? 'K' : 'OUT';
    const n = c.runners;
    let rbi = 0;
    if (code === 'HR') rbi = n + 1;
    else if (code === '3B') rbi = n;
    else if (code === '2B') rbi = n === 3 ? (G.chance(0.6) ? 3 : 2) : n;
    else if (code === '1B') {
      if (c.bases === '満塁') rbi = G.chance(0.6) ? 2 : 1;
      else if (c.bases === '二・三塁') rbi = G.chance(0.65) ? 2 : 1;
      else if (c.bases === '一・二塁') rbi = G.chance(0.6) ? 1 : 0;
      else rbi = G.chance(0.65) ? 1 : 0;
    } else if (code === 'BB') rbi = n === 3 ? 1 : 0;
    return { code, rbi, choice: ch };
  };

  // 勝負どころつきの試合結果を組み立てる（イニングごとの得点まで決める）
  // stBefore：それまでの打席の成績。返り値の pa を自分の成績に加える
  G.resolveBatClutch = (s, own, choiceId, stBefore, pWin) => {
    const c = own.clutch;
    const k = c.inning;
    const res = G.clutchAtBat(s, own, choiceId);
    const need = Math.max(stBefore.rbi + stBefore.r - stBefore.hr, 0);
    const ourBefore = Math.max(need, G.ri(0, 4));
    const theirs0 = ourBefore - c.diff;
    // サヨナラは決勝点が入った時点で試合終了（本塁打は全員かえる）
    let rbi = res.rbi;
    if (k === 9 && c.bottom && res.code !== 'HR' && ourBefore + rbi > theirs0) rbi = theirs0 + 1 - ourBefore;
    const pa = { code: res.code, rbi, clutch: true };
    const our = new Array(12).fill(0);
    const opp = new Array(12).fill(0);
    spreadIn(ourBefore, 1, k - 1, our);
    spreadIn(theirs0, 1, c.bottom ? k : k - 1, opp);
    our[k - 1] += rbi;
    const ourAfter = ourBefore + rbi;
    const lead = ourAfter - theirs0;
    let n = 9;
    // その後の展開（勝ち・負け・引き分け）
    const adj = (pWin - 0.5) * 0.3;
    let outcome;
    if (lead > 0) outcome = G.chance(0.85 + adj) ? 'W' : 'L';
    else if (lead === 0) outcome = G.chance(0.1) ? 'D' : G.chance(0.5 + adj) ? 'W' : 'L';
    else outcome = G.chance(0.1 + adj) ? 'W' : 'L';
    const rnd = (a, b) => (a > b ? null : G.ri(a, b));
    if (c.bottom) {
      // 自分たちが後攻（裏の攻撃）
      if (k === 9) {
        if (lead > 0) outcome = 'W'; // サヨナラ
        else if (lead < 0) outcome = 'L';
        else if (outcome === 'W') {
          n = 10;
          our[9] = 1;
        } else if (outcome === 'L') {
          n = 10;
          opp[9] = G.ri(1, 2);
        } else n = 12;
      } else if (outcome === 'W') {
        if (lead > 0) {
          if (lead > 1 && G.chance(0.4)) opp[rnd(k + 1, 9) - 1] += G.ri(1, lead - 1);
          if (k + 1 <= 8 && G.chance(0.4)) our[rnd(k + 1, 8) - 1] += 1;
        } else {
          const needR = 1 - lead;
          if (k + 1 <= 8) our[rnd(k + 1, 8) - 1] += needR;
          else our[8] += needR; // 9回裏にサヨナラ
        }
      } else if (outcome === 'L') {
        opp[rnd(k + 1, 9) - 1] += Math.max(0, lead) + 1 + (G.chance(0.3) ? 1 : 0);
      } else {
        n = 12;
        if (lead > 0) opp[rnd(k + 1, 9) - 1] += lead;
        else if (lead < 0) our[rnd(k + 1, 9) - 1] += -lead;
      }
    } else {
      // 自分たちが先攻（表の攻撃）
      if (k === 9 && lead < 0) outcome = 'L';
      if (k === 9 && lead === 0 && outcome === 'D') outcome = G.chance(0.5) ? 'W' : 'L';
      if (outcome === 'W') {
        if (lead > 0) {
          if (lead > 1 && G.chance(0.4)) opp[rnd(k, 9) - 1] += G.ri(1, lead - 1);
          if (k + 1 <= 9 && G.chance(0.4)) our[rnd(k + 1, 9) - 1] += 1;
        } else if (k === 9) {
          n = 10;
          our[9] = 1;
        } else our[rnd(k + 1, 9) - 1] += 1 - lead;
      } else if (outcome === 'L') {
        if (lead >= 0) {
          const needR = lead + 1;
          if (k === 9 || G.chance(0.35)) opp[8] += needR; // 9回裏にサヨナラ負け
          else opp[rnd(k, 8) - 1] += needR + (G.chance(0.3) ? 1 : 0);
        } else if (k <= 8 && G.chance(0.3)) opp[rnd(k, 8) - 1] += 1;
      } else {
        n = 12;
        if (lead > 0) opp[rnd(k, 8) - 1] += lead;
        else if (lead < 0) our[rnd(k + 1, 9) - 1] += -lead;
      }
    }
    const ours = our.reduce((a, x) => a + x, 0);
    const theirs = opp.reduce((a, x) => a + x, 0);
    if (outcome === 'W' && ours <= theirs) outcome = ours === theirs ? 'D' : 'L';
    if (outcome === 'L' && ours >= theirs) outcome = ours === theirs ? 'D' : 'W';
    if (outcome === 'D' && ours !== theirs) outcome = ours > theirs ? 'W' : 'L';
    const verdict = lead > 0 ? (c.inning === 9 && c.bottom ? 'sayonara' : 'ahead') : lead === 0 ? 'tie' : 'fail';
    return { pa, outcome, score: [ours, theirs], box: { our: our.slice(0, n), opp: opp.slice(0, n), n }, verdict, choice: res.choice, situation: G.clutchText(s, own) };
  };

  function spreadIn(runs, from, to, arr) {
    if (to < from) {
      arr[Math.max(0, from - 1)] += runs;
      return;
    }
    for (let i = 0; i < runs; i++) arr[G.ri(from, to) - 1]++;
  }

  // ---------- 投手：ピンチの場面 ----------
  // 救援登板の1イニングを組み立てる（失点は既存の救援の処理に渡す）
  G.clutchPitchLine = (s, own, choiceId) => {
    const p = s.player;
    const c = own.clutch;
    const ch = G.clutchChoices(s, own).find((x) => x.id === choiceId) || G.clutchChoices(s, own)[0];
    const q = G.pitchQuality(p) + G.COND_OFFSET[p.condition] + G.levelOffset(s) + (G.gameOffset ? G.gameOffset(s, own) : 0);
    const pOk = G.clamp(0.6 + (q - 55) * 0.006 + ch.ok, 0.35, 0.92);
    const st = G.emptyPit();
    st.g = 1;
    // 2アウトまでに出したランナー
    const onBase = c.runners;
    const h0 = G.ri(Math.max(0, onBase - 2), onBase);
    st.h = h0;
    st.bb = onBase - h0;
    st.k = G.chance(0.5) ? 1 : 0;
    let how;
    let r = 0;
    if (G.chance(pOk)) {
      st.outs = 3;
      if (G.chance(ch.k)) {
        st.k++;
        how = 'K';
      } else how = 'OUT';
    } else if (ch.walk && onBase === 3 && G.chance(ch.walk)) {
      st.bb++;
      r = 1;
      st.outs = 3;
      how = 'BB';
    } else {
      st.h++;
      const xbh = G.chance(ch.xbh);
      r = xbh ? (G.chance(0.2) ? onBase + 1 : onBase) : Math.min(onBase, G.chance(0.6) ? 2 : 1);
      if (xbh && r === onBase + 1) st.hr = 1;
      st.outs = 3;
      how = st.hr ? 'HR' : xbh ? 'XBH' : 'HIT';
    }
    st.r = r;
    st.er = r;
    return { st, how, choice: ch, situation: G.clutchText(s, own) };
  };

  // 結果の一言
  G.clutchResultText = (s, cl) => {
    const fam = s.player.name.split(' ')[0];
    if (cl.kind === 'bat') {
      const code = cl.pa.code;
      const what = { HR: 'ホームラン', '3B': 'スリーベース', '2B': 'ツーベース', '1B': 'タイムリー', BB: '押し出しの四球', K: '空振り三振', OUT: G.pick(['セカンドゴロ', 'ショートフライ', 'センターフライ']) }[code];
      if (cl.verdict === 'sayonara') return { cls: 'good', text: `${code === 'HR' ? 'サヨナラホームラン' : `サヨナラ${what}`}！！ ${fam}がヒーローだ！` };
      if (cl.verdict === 'ahead') return { cls: 'good', text: `逆転の${what}！ 勝負どころで${fam}が試合をひっくり返した！` };
      if (cl.verdict === 'tie') return { cls: 'good', text: `同点の${what}！ 土壇場で試合を振り出しに戻した！` };
      if (cl.pa.rbi) return { cls: 'mid', text: `${what}で${cl.pa.rbi}点を返したが、追いつけなかった…` };
      return { cls: 'bad', text: `${what}…。チャンスを生かせなかった。` };
    }
    if (cl.how === 'K') return { cls: 'good', text: `最後は空振り三振！ 雄たけびを上げてピンチを切り抜けた！` };
    if (cl.how === 'OUT') return { cls: 'good', text: `${G.pick(['ショートゴロ', '平凡なフライ', '内野ゴロ'])}に打ち取り、ピンチを脱出！` };
    if (cl.how === 'BB') return { cls: 'bad', text: '押し出しの四球…。1点を与えてしまった。' };
    if (cl.how === 'HR') return { cls: 'bad', text: '痛恨の満塁ホームランを浴びた…。' };
    return { cls: 'bad', text: `${cl.how === 'XBH' ? '長打' : 'タイムリー'}を浴び、${cl.r}点を失った…。` };
  };
})();
