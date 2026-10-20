// 査定（1試合ごとの貢献ポイント）とお立ち台（ヒーローインタビュー）
// ・1軍の試合は、打席・守備・投球の一つひとつに査定ポイントがつく（日本代表の試合は対象外）
// ・シーズンの合計は契約更改の提示額に響き、内訳も見られる
// ・勝った試合のヒーローになると、お立ち台でコメントを選べる（人気・首脳陣・SNSの反応が変わる）
(function () {
  const G = window.G;

  G.SATEI_CATS = [
    { id: 'bat', name: '打撃' },
    { id: 'clutch', name: '勝負強さ' },
    { id: 'run', name: '走塁' },
    { id: 'def', name: '守備' },
    { id: 'pit', name: '投球' },
    { id: 'team', name: 'チームへの貢献' },
  ];
  G.SATEI_PAR = 100; // ふつうのレギュラーの1年分。これを超えた分が年俸の上積みに（下回ると減額）

  const PA_PTS = { HR: ['ホームラン', 5], '3B': ['三塁打', 3.5], '2B': ['二塁打', 2.5], '1B': ['ヒット', 1.5], BB: ['四球', 1], K: ['三振', -1.4], OUT: ['凡退', -0.9] };

  // 1試合の査定
  G.calcSatei = (s, ctx, res) => {
    const items = [];
    const add = (cat, label, v) => {
      if (!v) return;
      const it = items.find((x) => x.label === label);
      if (it) {
        it.v += v;
        it.n++;
      } else items.push({ cat, label, v, n: 1 });
    };
    const l = res.line;
    if (res.kind === 'bat' && l) {
      for (const pa of res.pas || []) {
        const [label, v] = PA_PTS[pa.code] || PA_PTS.OUT;
        add('bat', label, v);
      }
      add('bat', '打点', l.rbi * 1);
      add('run', '盗塁', l.sb * 1);
      add('run', '盗塁死', l.cs * -1.5);
      if (res.fld) {
        add('def', 'ファインプレー', res.fld.fine * 1.5);
        add('def', '失策', res.fld.e * -2);
        add('def', '盗塁阻止', res.fld.cs * 1);
        add('def', '捕逸', res.fld.pb * -1);
      }
      if (res.clutch) {
        const v = res.clutch.verdict;
        if (v === 'sayonara') add('clutch', 'サヨナラ打', 6);
        else if (v === 'ahead') add('clutch', '勝ち越し打', 4);
        else if (v === 'tie') add('clutch', '同点打', 2);
        else add('clutch', 'チャンスで凡退', -1.5);
      }
      if (res.outcome === 'W' && (l.h || l.rbi || l.bb)) add('team', '勝利に貢献', 0.5);
    } else if (res.kind === 'pit' && l) {
      add('pit', 'イニング', Math.round((l.outs / 3) * 0.9 * 10) / 10);
      add('pit', '奪三振', Math.round(l.k * 0.3 * 10) / 10);
      add('pit', '自責点', l.er * -1.5);
      add('pit', '与四球', Math.round(l.bb * -0.3 * 10) / 10);
      if (l.gs) {
        if (l.outs >= 18 && l.er <= 3) add('pit', 'クオリティスタート', 3);
        if (l.outs >= 27) add('pit', l.r === 0 ? '完封' : '完投', l.r === 0 ? 8 : 4);
      }
      if (l.w) add('team', '勝利投手', 4);
      if (l.l) add('team', '敗戦投手', -2);
      if (l.s) add('clutch', 'セーブ', 4);
      if (l.hld) add('clutch', 'ホールド', 3);
      if (res.blown) add('clutch', 'リリーフ失敗', -4);
      if (res.clutch) add('clutch', ['K', 'OUT'].includes(res.clutch.how) ? 'ピンチを0点' : 'ピンチで失点', ['K', 'OUT'].includes(res.clutch.how) ? 3 : -2);
    } else return null;
    for (const it of items) it.v = Math.round(it.v * 10) / 10;
    const total = Math.round(items.reduce((a, x) => a + x.v, 0) * 10) / 10;
    return { total, items: items.filter((x) => x.v) };
  };

  G.seasonSatei = (s) => {
    if (!s.satei || s.satei.year !== s.year) s.satei = { year: s.year, total: 0, games: 0, cat: {}, best: null };
    return s.satei;
  };

  // ---------- お立ち台 ----------
  const heroReason = (s, res) => {
    const l = res.line;
    if (res.outcome !== 'W' || !l) return null;
    if (res.kind === 'bat') {
      if (res.clutch && res.clutch.verdict === 'sayonara') return 'sayonara';
      if (res.clutch && res.clutch.verdict === 'ahead') return 'ahead';
      if (l.hr >= 2) return 'multihr';
      if (l.hr && l.rbi >= 3) return 'hrrbi';
      if (l.h >= 4) return 'hits';
      return null;
    }
    if (l.gs && l.outs >= 27) return l.r === 0 ? 'shutout' : 'complete';
    if (l.gs && l.w && l.outs >= 21 && l.r <= 1) return 'ace';
    if (l.s && res.clutch && ['K', 'OUT'].includes(res.clutch.how)) return 'closer';
    return null;
  };
  const QUESTION = {
    sayonara: 'サヨナラの場面、どんな気持ちで打席に入りましたか？',
    ahead: '終盤の勝ち越し打。打った瞬間はいかがでしたか？',
    multihr: '今日は2本のホームラン。手応えはどうでしたか？',
    hrrbi: '貴重なホームランを含む大活躍でした！',
    hits: '今日は固め打ちでしたね！',
    shutout: '完封勝利、おめでとうございます！',
    complete: '最後まで投げ切りました。今の気持ちは？',
    ace: '見事なピッチングでした。今日の投球を振り返って。',
    closer: '最後はピンチを切り抜けました！',
  };
  G.HERO_STYLES = [
    { id: 'fan', label: '「応援ありがとうございます！ 最高でーす！！」', desc: 'スタンドを盛り上げる' },
    { id: 'team', label: '「みんながつないでくれたおかげです。チームの勝利がうれしいです」', desc: 'チームを立てる' },
    { id: 'bold', label: '「明日も打ちます！ 優勝するのは、うちです！」', desc: '強気に言い切る' },
  ];
  const HERO_RESULT = {
    fan: (s) => '球場が割れんばかりの大歓声に包まれた！' + G.applyFx(s, { pop: 2, happy: 2 }),
    team: (s) => 'ベンチの仲間たちが笑顔でうなずいている。首脳陣の評価も上がったようだ。' + G.applyFx(s, { trust: 1.5, happy: 1, aff: s.people.senpai ? { senpai: 2 } : {} }),
    bold: (s) => {
      s.flags.boldDay = s.dayCount;
      return 'スタンドがどっと沸いた。言ったからには、やるしかない！' + G.applyFx(s, { pop: 1, happy: 3 });
    },
  };
  G.heroDefault = (s) => {
    const st = s.story.heroStyle || {};
    return Math.max(0, G.HERO_STYLES.findIndex((x) => x.id === (Object.keys(st).sort((a, b) => st[b] - st[a])[0] || 'fan')));
  };
  G.heroSay = (s, res, idx) => {
    const it = res.interview;
    if (!it || it.said) return null;
    const st = G.HERO_STYLES[idx] || G.HERO_STYLES[0];
    it.said = st.id;
    it.reply = HERO_RESULT[st.id](s);
    s.story.heroStyle = s.story.heroStyle || {};
    s.story.heroStyle[st.id] = (s.story.heroStyle[st.id] || 0) + 1;
    G.buzz(s, 'interview', { style: st.id });
    G.log(s, `🎤 お立ち台：${st.label}`, 'good', 'game');
    return it.reply;
  };

  // 試合が終わったら：査定をつけ、ヒーローならお立ち台へ（日本代表の試合は除く）
  G.on('ownGame:result', (s, ctx, res) => {
    if (ctx.special || !res || !res.kind) return;
    const sat = G.calcSatei(s, ctx, res);
    if (!sat) return;
    res.satei = sat;
    const ss = G.seasonSatei(s);
    ss.total = Math.round((ss.total + sat.total) * 10) / 10;
    ss.games++;
    for (const it of sat.items) ss.cat[it.cat] = Math.round(((ss.cat[it.cat] || 0) + it.v) * 10) / 10;
    if (!ss.best || sat.total > ss.best.total) ss.best = { total: sat.total, oppId: ctx.oppId, dayCount: s.dayCount };
    // 「明日も打ちます」と言った次の試合
    if (s.flags.boldDay !== undefined && s.flags.boldDay !== s.dayCount) {
      const ok = res.kind === 'bat' ? res.line.h > 0 : res.line.er === 0;
      G.buzz(s, ok ? 'boldok' : 'boldng');
      if (ok) s.flags.boldOk = (s.flags.boldOk || 0) + 1;
      delete s.flags.boldDay;
    }
    const why = heroReason(s, res);
    if (why) {
      s.story.heroInterviews = (s.story.heroInterviews || 0) + 1;
      res.interview = { why, q: QUESTION[why], said: null, n: s.story.heroInterviews };
    }
  });

  // 結果を見ないまま進んだ試合のお立ち台は、いつもの調子で答えたことにする
  G.on('games:finish', (s, gw) => {
    for (const r of [...gw.games, ...(gw.specialGames || [])]) if (r && r.interview && !r.interview.said) G.heroSay(s, r, G.heroDefault(s));
  });

  // 契約更改：査定の合計が提示額に響く（日本球界のみ）
  G.on('contractTarget', (target, s) => {
    const ss = s.satei && s.satei.year === s.year ? s.satei : null;
    if (!ss || !ss.games) return target;
    return target + G.clamp((ss.total - G.SATEI_PAR) * 8, -1500, 4000);
  });
  G.sateiText = (s) => {
    const ss = s.satei && s.satei.year === s.year ? s.satei : null;
    if (!ss || !ss.games) return '';
    const parts = G.SATEI_CATS.filter((c) => ss.cat[c.id]).map((c) => `${c.name}${ss.cat[c.id] > 0 ? '+' : ''}${Math.round(ss.cat[c.id])}`);
    return `今季の査定ポイント：${ss.total > 0 ? '+' : ''}${Math.round(ss.total)}（${parts.join('・')}）`;
  };

  // シーズンが終わったら記録しておく
  G.on('seasonEnd', (s) => {
    const ss = G.seasonSatei(s);
    s.sateiHist = s.sateiHist || {};
    s.sateiHist[s.year] = { total: Math.round(ss.total), games: ss.games };
  });
})();
