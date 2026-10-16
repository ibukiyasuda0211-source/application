// メジャーリーグならではの環境（長距離移動と時差による疲労・異文化への適応）
// 日本では「練習で能力を上げる」ことが中心だが、MLBでは体調管理と現地への適応が成績を左右する
(function () {
  const G = window.G;

  // 本拠地の時間帯（0:東部 1:中部 2:山岳部 3:太平洋）
  const ZONE = { m_ny: 0, m_bos: 0, m_atl: 0, m_tor: 0, m_mia: 0, m_chi: 1, m_tex: 1, m_la: 3, m_sf: 3, m_sea: 3 };
  const CITY = { m_ny: 'ニューヨーク', m_bos: 'ボストン', m_atl: 'アトランタ', m_tor: 'トロント', m_mia: 'マイアミ', m_chi: 'シカゴ', m_tex: 'テキサス', m_la: 'ロサンゼルス', m_sf: 'サンフランシスコ', m_sea: 'シアトル' };
  G.MLB_CITY = CITY;

  const ml = (s) => s.player.mlbLife;
  G.inMLB = (s) => G.isMLB(s) && !s.retired && !!ml(s);

  // ---------- 渡米・帰国 ----------
  const origJoinMLB = G.joinMLB;
  G.joinMLB = (s, offer) => {
    const text = origJoinMLB(s, offer);
    const p = s.player;
    p.mlbLife = { fatigue: 15, adapt: G.ri(8, 18) + (p.skills.includes('mood') ? 8 : 0), loc: offer.teamId };
    G.scene(
      s,
      'アメリカでの生活',
      'メジャーの世界は、日本とはまるで違う。\n\n・162試合に匹敵する長いシーズンを、東海岸から西海岸まで飛行機で移動しながら戦う。時差のある遠征が続くと「疲労」がたまり、成績もケガのリスクも悪化する\n・言葉も食事も文化も違う。チームに溶け込む「適応度」が低いうちは、実力を出し切れない\n・練習に使える時間は日本より短い。休養やコンディショニングがより大切になる\n\n「オフの過ごし方」に「アメリカ生活」が加わった。英会話やチームメイトとの交流で適応を、コンディショニングや休養で疲労を管理しよう。',
    );
    return text;
  };
  const origJoinNPB = G.joinNPB;
  G.joinNPB = (s, offer) => {
    const text = origJoinNPB(s, offer);
    s.player.mlbLife = null;
    return text;
  };

  // ---------- 疲労と適応が成績に与える影響 ----------
  G.mlbOffset = (s) => {
    if (!G.inMLB(s)) return 0;
    const m = ml(s);
    let off = 0;
    if (m.fatigue > 40) off -= (m.fatigue - 40) * 0.07;
    if (m.adapt < 70) off -= (70 - m.adapt) * 0.05;
    return off;
  };
  const origInj = G.injuryMul;
  G.injuryMul = (s) => origInj(s) * (G.inMLB(s) ? 1 + ml(s).fatigue / 110 : 1);
  const origMul = G.trainingMultiplier;
  G.trainingMultiplier = (s) => origMul(s) * (G.inMLB(s) ? 0.82 : 1);

  // ---------- 今週の移動（遠征）----------
  G.mlbTravel = (s, week = s.week) => {
    const p = s.player;
    const m = ml(s);
    const days = G.daysInWeek(week, s.year).filter((d) => !d.rain);
    if (G.phaseOf(week, s.year).id !== 'season' || !days.length) return null;
    let loc = m.loc || p.teamId;
    let shifts = 0;
    let away = 0;
    const cities = [];
    for (const d of days) {
      const g = G.teamGameOn(s.year, d, p.teamId);
      if (!g) continue;
      const here = g.home ? p.teamId : g.opp;
      if (!g.home) away++;
      shifts += Math.abs((ZONE[here] ?? 0) - (ZONE[loc] ?? 0));
      if (here !== loc || !cities.length) cities.push(CITY[here] || G.teamById(here).short);
      loc = here;
    }
    return { games: days.length, away, shifts, cities: [...new Set(cities)], end: loc, rest: 7 - days.length };
  };

  // 週の終わりに疲労と適応を更新
  const origWeekly = G.weeklyLife;
  G.weeklyLife = (s) => {
    origWeekly(s);
    if (!G.inMLB(s)) return;
    const p = s.player;
    const m = ml(s);
    const t = G.mlbTravel(s);
    const first = p.squad === 'first';
    if (t) {
      // 試合・時差のある移動・遠征で疲れがたまり、移動日の休みと自然回復で抜ける
      const load = t.games * (first ? 1.15 : 0.8) + t.shifts * 3 + t.away * 0.4 - t.rest * 3;
      m.fatigue = G.clamp(m.fatigue + load - 6 - m.fatigue * 0.08, 0, 100);
      m.loc = t.end;
      if (t.shifts >= 2 && first) G.log(s, `✈ 遠征：${t.cities.join('→')}（時差のある移動が${t.shifts}時間分）　疲労${Math.round(m.fatigue)}`, '', 'game');
    } else m.fatigue = G.clamp(m.fatigue - 15, 0, 100);
    m.adapt = G.clamp(m.adapt + 0.5 + (G.spouse(s) ? 0.3 : 0), 0, 100);
    if (m.fatigue >= 60) p.stamina = G.clamp(p.stamina - (m.fatigue - 50) * 0.3, 0, 100);
    if (m.adapt < 40) G.addHappy(s, -0.6);
    if (!s.queue.some((q) => q.kind !== 'info') && G.chance(0.06)) mlbEvent(s);
  };

  const fx = (s, f) => G.applyFx(s, f);
  const bump = (s, k, v) => {
    const m = ml(s);
    m[k] = G.clamp(m[k] + v, 0, 100);
    return `（${k === 'adapt' ? '適応度' : '疲労'}${v > 0 ? '+' : ''}${v}）`;
  };
  G.mlbBump = bump;

  const EVENTS = [
    { cond: (s) => s.player.yearsPro >= 0 && !s.story.mlb_hazing, run: (s) => { s.story.mlb_hazing = true; return ['新人の洗礼', `遠征の移動日、ロッカーを開けると自分の服がなくなっていて、代わりにアニメのコスプレ衣装が…。\nメジャー名物の「ルーキー・ヘイジング」だ。仕方なくその格好で空港を歩くと、チームメイトは大爆笑。\nなんだか、チームの一員になれた気がした。` + bump(s, 'adapt', 8) + fx(s, { happy: 4 })]; } },
    { cond: (s) => ml(s).fatigue >= 45, run: (s) => ['時差ボケ', `西海岸から東海岸への移動続きで、夜中の3時に目が覚めてしまう…。体が重い。` + bump(s, 'fatigue', 8)] },
    { cond: (s) => ml(s).adapt < 50, run: (s) => ['言葉の壁', `ミーティングで監督の指示がうまく聞き取れず、サインを見落としてしまった。\n通訳を通すと、どうしてもワンテンポ遅れる…。` + bump(s, 'adapt', -2) + fx(s, { trust: -2, happy: -3 })] },
    { cond: (s) => ml(s).adapt < 45, run: (s) => ['ホームシック', `ふと、日本の家族や仲間の顔が浮かんだ。コンビニのおにぎりが無性に食べたい…。` + fx(s, { happy: -6 })] },
    { cond: () => true, run: (s) => ['チームメイトの家へ', `チームメイトの${G.pick(['ジョンソン', 'ロドリゲス', 'ミラー', 'ガルシア'])}が、家族のホームパーティーに招いてくれた。\n片言の英語でも、野球の話なら通じ合える。` + bump(s, 'adapt', 5) + fx(s, { happy: 4 })] },
    { cond: (s) => ml(s).adapt >= 60, run: (s) => ['クラブハウスの人気者', `英語でジョークを言ったら、クラブハウスが爆笑に包まれた。すっかりチームの一員だ。` + bump(s, 'adapt', 3) + fx(s, { happy: 5, pop: 1 })] },
    { cond: (s) => s.player.squad === 'first', run: (s) => ['地元紙の特集', `地元の新聞に「海を渡ったサムライ」として特集記事が載った。街で声をかけられることが増えてきた。` + fx(s, { pop: 2 })] },
  ];
  const mlbEvent = (s) => {
    const list = EVENTS.filter((e) => e.cond(s));
    if (!list.length) return;
    const [title, text] = G.pick(list).run(s);
    G.scene(s, title, text);
  };

  // ---------- 「アメリカ生活」の過ごし方 ----------
  G.MLB_ACTIONS = [
    { id: 'us_english', name: '英会話レッスン', desc: '適応度アップ・精神の経験点', cost: 2, run: (s) => '個人レッスンで英語を勉強した。少しずつ、チームメイトの会話がわかってきた。' + bump(s, 'adapt', 4) + fx(s, { exp: { mind: 6 }, happy: -1 }) },
    { id: 'us_bbq', name: 'チームメイトとBBQ', desc: '適応度アップ・充実度アップ', cost: 3, run: (s) => 'チームメイトの家の庭でBBQ。巨大なステーキに驚かれながら、たくさん笑った。' + bump(s, 'adapt', 3) + fx(s, { happy: 4 }) },
    { id: 'us_condition', name: '専属トレーナーとコンディショニング', desc: '疲労を大きく回復', cost: 15, run: (s) => '専属トレーナーと、睡眠・栄養・ストレッチを徹底的に管理した。' + bump(s, 'fatigue', -18) + fx(s, { stamina: 15 }) },
    { id: 'us_sleep', name: '移動日にしっかり眠る', desc: '時差対策。疲労回復', cost: 0, run: (s) => '遮光カーテンとアイマスクで、とにかく眠った。時差ボケ対策はこれに限る。' + bump(s, 'fatigue', -10) + fx(s, { stamina: 10 }) },
    { id: 'us_jfood', name: '日本食レストランで息抜き', desc: '充実度アップ・疲労回復', cost: 3, run: (s) => '久しぶりの寿司と味噌汁。日本の味に、心も体もほっとした。' + bump(s, 'fatigue', -4) + fx(s, { happy: 5 }) },
    { id: 'us_town', name: '街を歩いて現地に慣れる', desc: '適応度アップ', cost: 2, run: (s) => `${CITY[s.player.teamId] || '街'}の街を歩いた。カフェの注文も、もう怖くない。` + bump(s, 'adapt', 2.5) + fx(s, { happy: 3 }) },
    { id: 'us_meeting', name: '通訳とコーチ陣の話を整理する', desc: '首脳陣との意思疎通・適応度', cost: 0, run: (s) => '通訳と一緒に、コーチ陣の指示や相手のデータを整理した。' + bump(s, 'adapt', 1.5) + fx(s, { trust: 2, exp: { technique: 4 } }) },
  ];

  G.PLACES.push({ id: 'usa', name: 'アメリカ生活' });
  G.extraActions = (s) => (G.inMLB(s) ? G.MLB_ACTIONS.map((a) => ({ ...a, place: 'usa' })) : []);

  // 古いセーブでメジャーにいる場合
  const origMigrate = G.migrate;
  G.migrate = (s) => {
    origMigrate(s);
    if (G.isMLB(s) && !s.player.mlbLife && !s.retired) s.player.mlbLife = { fatigue: 20, adapt: 50, loc: s.player.teamId };
    return s;
  };

  // ---------- 表示用 ----------
  G.mlbStatus = (s) => {
    if (!G.inMLB(s)) return null;
    const m = ml(s);
    const t = G.mlbTravel(s);
    const off = G.mlbOffset(s);
    return {
      fatigue: Math.round(m.fatigue),
      adapt: Math.round(m.adapt),
      off,
      travel: t ? `今週は${t.games}試合（${t.cities.join('→')}${t.shifts ? `・時差のある移動${t.shifts}時間分` : ''}）` : '今週は遠征なし',
    };
  };
})();
