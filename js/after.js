// 引退後もつづく人生（第二のキャリア）
(function () {
  const G = window.G;
  const fx = (s, f) => G.applyFx(s, f);
  const A = (s) => s.after;

  const gain = (s, xp) => {
    A(s).xp += xp;
    return `（経験+${xp}）`;
  };

  G.AFTER_CAREERS = {
    coach: {
      ranks: (s) => [G.isPitcher(s.player) ? '投手コーチ' : '打撃コーチ', 'ヘッドコーチ', '監督'],
      need: [0, 1000, 3000],
      income: [30, 50, 160],
      works: [
        { id: 'teach', name: '若手を指導する', desc: 'チームが少しずつ強くなる', run: (s) => { A(s).data.boost = (A(s).data.boost || 0) + 0.08; return `若手選手にマンツーマンで指導した。${gain(s, 8)}` + fx(s, { happy: 2, stamina: -6 }); } },
        { id: 'study', name: 'データを分析する', desc: '采配の引き出しを増やす', run: (s) => `相手チームのデータを夜遅くまで分析した。${gain(s, 11)}` + fx(s, { happy: -1, stamina: -4 }) },
        { id: 'talk', name: '選手と面談する', desc: 'チームの雰囲気が良くなる', run: (s) => { A(s).data.boost = (A(s).data.boost || 0) + 0.04; return `選手ひとりひとりの悩みに耳を傾けた。${gain(s, 6)}` + fx(s, { happy: 3 }); } },
      ],
    },
    commentator: {
      ranks: () => ['野球解説者', '人気解説者', '球界のご意見番'],
      need: [0, 900, 2600],
      income: [20, 35, 60],
      works: [
        { id: 'broadcast', name: '試合を解説する', desc: '出演料と人気', run: (s) => `中継で${G.pick(['熱のこもった', 'わかりやすい', '鋭い'])}解説を披露した。${gain(s, 9)}` + fx(s, { pop: 1, money: 15 }) },
        { id: 'book', name: '本を書く', desc: 'いつかベストセラーに？', run: (s) => { A(s).data.book = (A(s).data.book || 0) + 1; let msg = `原稿を書き進めた。${gain(s, 6)}`; if (A(s).data.book === 20) { s.history.push({ year: s.year, text: '著書がベストセラーに' }); A(s).titles.push('著書がベストセラー'); msg += '\n著書が発売され、ベストセラーになった！' + fx(s, { money: 1500, pop: 5 }); } return msg; } },
        { id: 'youtube', name: '動画で発信する', desc: 'フォロワーが増える', run: (s) => { s.player.followers += G.ri(2000, 9000); return `野球の解説動画を配信した。${gain(s, 5)}` + fx(s, { pop: 1, happy: 2 }); } },
      ],
    },
    talent: {
      ranks: () => ['タレント', '人気タレント', '国民的タレント'],
      need: [0, 900, 2600],
      income: [25, 45, 80],
      works: [
        { id: 'variety', name: 'バラエティ番組に出る', desc: '出演料と人気', run: (s) => `${G.pick(['クイズ番組', 'グルメ番組', '旅番組', 'トーク番組'])}に出演した。${gain(s, 9)}` + fx(s, { money: 50, pop: 2, stamina: -8 }) },
        { id: 'drama', name: 'ドラマに挑戦する', desc: '新しい才能が開花するかも', run: (s) => { let msg = `ドラマの撮影に臨んだ。${gain(s, 12)}` + fx(s, { money: 40, stamina: -10 }); if (G.chance(0.04)) { A(s).titles.push('ドラマで新人賞'); s.history.push({ year: s.year, text: 'ドラマで新人賞を受賞' }); msg += '\n演技が評価され、新人賞を受賞した！'; } return msg; } },
        { id: 'cm', name: 'CM撮影', desc: '人気55以上で大きな収入', req: (s) => (s.player.popularity >= 55 ? '' : '人気55以上'), run: (s) => `CMの撮影をした。${gain(s, 5)}` + fx(s, { money: 300, pop: 1 }) },
      ],
    },
    business: {
      ranks: () => ['店主', '人気店オーナー', '実業家'],
      need: [0, 150, 380],
      income: [0, 0, 0],
      works: [
        { id: 'shop', name: '店に立つ', desc: '店の評判が上がる', run: (s) => { A(s).data.rep = G.clamp((A(s).data.rep || 40) + 2, 0, 100); return `厨房とホールを走り回った。常連さんも増えてきた。${gain(s, 7)}` + fx(s, { stamina: -8, pop: 1 }); } },
        { id: 'menu', name: '新メニューを開発する', desc: '当たれば評判が大きく上がる', run: (s) => { const hit = G.chance(0.4); A(s).data.rep = G.clamp((A(s).data.rep || 40) + (hit ? 7 : 1), 0, 100); return (hit ? '新メニューが大ヒット！行列ができた！' : '新メニューはそこそこの評判だった。') + gain(s, 8); } },
        { id: 'expand', name: '新しい店を出す', desc: '3000万円・評判60以上', req: (s) => ((A(s).data.rep || 40) >= 60 ? (s.player.money >= 3000 ? '' : 'お金が足りない') : '評判60以上'), run: (s) => { A(s).data.shops = (A(s).data.shops || 1) + 1; s.history.push({ year: s.year, text: `${A(s).data.shops}号店をオープン` }); return `${A(s).data.shops}号店をオープンした！${gain(s, 40)}` + fx(s, { money: -3000, happy: 6 }); } },
      ],
    },
    scout: {
      ranks: () => ['スカウト', 'チーフスカウト', 'スカウト部長'],
      need: [0, 1100, 3000],
      income: [18, 24, 32],
      works: [
        { id: 'tour', name: '全国の球場を回る', desc: '原石を探す', run: (s) => { A(s).data.eye = (A(s).data.eye || 0) + 3; return `${G.pick(['北海道', '東北', '関東', '関西', '九州', '四国'])}の高校野球を視察した。${gain(s, 9)}` + fx(s, { stamina: -8 }); } },
        { id: 'visit', name: '有望選手の家を訪ねる', desc: '入団を口説く', run: (s) => { A(s).data.eye = (A(s).data.eye || 0) + 2; return `有望選手の家族に、球団の魅力を熱く語った。${gain(s, 6)}` + fx(s, { happy: 1 }); } },
        { id: 'report', name: '報告書をまとめる', desc: '評価が上がる', run: (s) => `スカウティングレポートを仕上げた。${gain(s, 7)}` + fx(s, { exp: { mind: 3 } }) },
      ],
    },
    hometown: {
      ranks: () => ['少年野球の監督', '地元の名将', '伝説の指導者'],
      need: [0, 900, 2600],
      income: [12, 12, 12],
      works: [
        { id: 'coach_kids', name: '子供たちを指導する', desc: 'チームが強くなる', run: (s) => { A(s).data.team = G.clamp((A(s).data.team || 30) + 2, 0, 100); return `子供たちと一緒に汗を流した。${gain(s, 8)}` + fx(s, { happy: 3, stamina: -5 }); } },
        { id: 'camp_kids', name: '大会に向けて特訓', desc: 'チームが大きく強くなる', run: (s) => { A(s).data.team = G.clamp((A(s).data.team || 30) + 3, 0, 100); return `大会に向けて特訓した。${gain(s, 9)}` + fx(s, { stamina: -10 }); } },
        { id: 'parents_meet', name: '保護者と交流する', desc: '地域で慕われる', run: (s) => `保護者のみなさんとバーベキューをした。${gain(s, 5)}` + fx(s, { happy: 3, pop: 1 }) },
      ],
    },
    company: {
      ranks: () => ['一般社員', '係長', '課長', '部長', '役員'],
      need: [0, 700, 1800, 3200, 5000],
      income: [10, 13, 17, 23, 35],
      works: [
        { id: 'work', name: '仕事に励む', desc: '昇進が近づく', run: (s) => `${G.pick(['大型の商談をまとめた', '企画書を仕上げた', '取引先を回った', '後輩の面倒を見た'])}。${gain(s, 10)}` + fx(s, { stamina: -8, happy: -1 }) },
        { id: 'home_early', name: '定時で帰る', desc: '家族との時間', run: (s) => `今日は定時で帰った。${gain(s, 3)}` + fx(s, { happy: 3, stamina: 5 }) },
        { id: 'drinks', name: '同僚と飲みに行く', desc: '社内の評判が上がる', run: (s) => `同僚と飲みに行った。「元プロ野球選手の話、もっと聞かせてください！」${gain(s, 5)}` + fx(s, { happy: 2, money: -1 }) },
      ],
    },
  };

  G.afterDef = (s) => G.AFTER_CAREERS[s.after.career];
  G.afterRank = (s) => G.afterDef(s).ranks(s)[s.after.level];

  G.startAfterLife = (s, careerId) => {
    const p = s.player;
    s.after = { career: careerId, level: 0, xp: 0, startAge: p.age, startYear: s.year, titles: [], data: {} };
    s.retired = s.retired || { reason: '現役を引退した', age: p.age, years: p.yearsPro + 1 };
    if (careerId === 'coach') p.squad = 'first';
    s.queue = [];
    G.scene(s, '新しい人生', `${G.afterRank(s)}としての毎日が始まる。\n\n毎週「仕事」と「オフの過ごし方」を選んで、引退後の人生を歩もう。家族や仲間との時間も、まだまだこれから。\n（「人生」タブからいつでも物語を締めくくれます）`);
    G.log(s, `第二の人生：${G.afterRank(s)}`, 'year');
  };

  G.afterWorks = (s) =>
    G.afterDef(s).works.map((w) => {
      const reason = w.req ? w.req(s) : '';
      return { id: w.id, name: w.name, desc: w.desc, ok: !reason, reason };
    });

  const checkPromotion = (s) => {
    const def = G.afterDef(s);
    const a = A(s);
    if (s.after.career === 'business') {
      const shops = a.data.shops || 1;
      const lv = shops >= 4 ? 2 : shops >= 2 ? 1 : 0;
      if (lv > a.level) {
        a.level = lv;
        G.scene(s, 'ステップアップ', `店が増え、「${G.afterRank(s)}」と呼ばれるようになった！`);
      }
      return;
    }
    if (a.level + 1 < def.need.length && a.xp >= def.need[a.level + 1]) {
      a.level++;
      const rank = G.afterRank(s);
      s.history.push({ year: s.year, text: `${rank}に就任` });
      G.scene(s, '昇進', `これまでの努力が認められ、${rank}に就任した！`, { big: rank });
      G.addHappy(s, 8);
    }
  };

  G.afterIncome = (s) => {
    const a = A(s);
    if (a.career === 'business') return Math.round((a.data.shops || 1) * ((a.data.rep || 40) - 35) * 1.5);
    let inc = G.afterDef(s).income[a.level];
    if (a.career === 'commentator' || a.career === 'talent') inc += Math.round(s.player.popularity * 0.3);
    return inc;
  };

  // 引退後の1週間
  G.doAfterWeek = (s, workId, privId) => {
    const p = s.player;
    const w = G.afterDef(s).works.find((x) => x.id === workId) || G.afterDef(s).works[0];
    const msgs = [w.run(s)];
    if (privId) msgs.push(G.doPrivate(s, privId));
    for (const m of msgs) if (m) G.log(s, m);
    checkPromotion(s);
    p.money += G.afterIncome(s);
    p.stamina = G.clamp(p.stamina + 10, 0, 100);
    // 球界は動きつづける
    if (s.week >= G.cal(s.year).startW && s.week <= G.cal(s.year).endW) G.simLeagueWeek(s);
    if (s.week === G.cal(s.year).endW) G.afterSeasonEnd(s);
    G.weeklyLife(s);
    if (!s.queue.some((q) => q.kind !== 'info') && G.chance(0.15)) {
      const ev = G.pick(G.AFTER_EVENTS.filter((e) => !e.cond || e.cond(s)));
      if (ev) G.scene(s, ev.title, ev.run(s));
    }
    s.week++;
    if (s.week > 52) G.afterNewYear(s);
  };

  G.simLeagueWeek = (s) => {
    const n = G.gamesInWeek(s.week, s.year);
    const boost = s.after && s.after.career === 'coach' ? s.after.level + 1 : 0;
    for (let d = 0; d < n; d++) {
      for (const lg of G.LEAGUES) {
        const ids = G.shuffle(G.TEAMS.filter((t) => t.league === lg.id).map((t) => t.id));
        for (let i = 0; i + 1 < ids.length; i += 2) {
          const a = ids[i];
          const b = ids[i + 1];
          let o = G.playNpcGame(s, a, b);
          if (boost && (a === s.player.teamId || b === s.player.teamId) && G.chance(boost * 0.02)) o = a === s.player.teamId ? 'W' : 'L';
          G.recordResult(s, a, o);
          G.recordResult(s, b, G.flip(o));
        }
      }
    }
  };

  G.afterSeasonEnd = (s) => {
    const a = A(s);
    const p = s.player;
    if (a.career !== 'coach') return;
    const team = G.teamById(p.teamId);
    const rank = G.leagueRanking(s, team.league).findIndex((r) => r.id === p.teamId) + 1;
    let text = `今季、${team.name}は${rank}位でシーズンを終えた。`;
    if (rank === 1) {
      const role = G.afterRank(s);
      text += `\n\n🎉 リーグ優勝！ ${role}として歓喜の胴上げに加わった！`;
      a.titles.push(`${s.year}年 ${role}としてリーグ優勝`);
      s.history.push({ year: s.year, text: `${role}としてリーグ優勝` });
      if (G.chance(0.5)) {
        text += '\nさらに日本シリーズも制して日本一に！';
        a.titles.push(`${s.year}年 ${role}として日本一`);
        s.history.push({ year: s.year, text: `${role}として日本一` });
      }
      G.addHappy(s, 12);
    }
    G.scene(s, 'シーズン終了', text, rank === 1 ? { big: 'リーグ優勝' } : {});
  };

  G.afterNewYear = (s) => {
    const p = s.player;
    const a = A(s);
    G.updateDraftClass(s);
    s.year++;
    s.week = 1;
    p.age++;
    G.resetStandings(s);
    for (const t of G.TEAMS) s.teamStr[t.id] = Math.round(G.clamp(s.teamStr[t.id] * 0.6 + G.rf(42, 58) * 0.4 + G.gauss(0, 2), 40, 60));
    if (a.career === 'coach') s.teamStr[p.teamId] = Math.min(65, s.teamStr[p.teamId] + Math.round((a.data.boost || 0) * 0.5) + a.level);
    if (a.career === 'coach') a.data.boost = (a.data.boost || 0) * 0.5;
    // 職業ごとの1年
    if (a.career === 'scout' && G.chance(Math.min(0.7, (a.data.eye || 0) / 150))) {
      const name = G.randomMaleName();
      a.titles.push(`${s.year - 1}年 見出した${name}がドラフト1位`);
      s.history.push({ year: s.year - 1, text: `スカウトした${name}がドラフト1位指名` });
      G.scene(s, 'ドラフト会議', `あなたが何年も追いかけてきた${name}が、ドラフト1位で指名された！\n「あなたが見つけてくれたおかげです」`);
      a.data.eye = 0;
      a.xp += 200;
    }
    if (a.career === 'hometown') {
      const t = a.data.team || 30;
      const res = t >= 85 ? '全国大会で優勝' : t >= 65 ? '全国大会に出場' : t >= 45 ? '県大会でベスト4' : null;
      if (res) {
        a.titles.push(`${s.year - 1}年 少年野球チームが${res}`);
        G.scene(s, '少年野球大会', `教え子たちが${res}した！ 子供たちの笑顔が何よりのご褒美だ。`);
        a.xp += 150;
      }
      if (t >= 60 && G.chance(0.25)) {
        const name = G.randomMaleName();
        a.titles.push(`教え子の${name}がプロ入り`);
        G.scene(s, '教え子の旅立ち', `昔の教え子・${name}がプロ野球選手になった！「監督に野球の楽しさを教わりました」`);
      }
      a.data.team = Math.round(t * 0.85);
    }
    G.scene(s, `${s.year}年 新年`, `新しい年が明けた。${p.age}歳。${G.afterRank(s)}として迎える${s.year - a.startYear + 1}年目だ。`);
    G.log(s, `${s.year}年（${p.age}歳）`, 'year');
    G.yearlyLife(s);
    if (p.age >= 80) {
      s.queue.push({ kind: 'life', id: 'life_end', title: '人生の幕', text: `${p.age}歳。野球と共に歩んだ人生を、静かに振り返る。\n\nたくさんの人に支えられた、かけがえのない日々だった。`, data: {} });
    }
  };

  G.AFTER_EVENTS = [
    { title: '球場の思い出', run: (s) => `久しぶりに古巣の球場を訪れた。スタンドから「${s.player.name}！」と声をかけられた。` + fx(s, { happy: 4 }) },
    { title: 'OB戦', run: (s) => 'OB戦に出場した。体は動かないが、気持ちは現役の頃のままだ。' + fx(s, { happy: 5, stamina: -10 }) },
    { title: '同窓会', run: (s) => `高校の野球部の同窓会があった。${s.people.friend.name}と朝まで語り明かした。` + fx(s, { happy: 4, aff: { friend: 6 } }) },
    { title: 'ファンからの手紙', run: () => '「あの日のホームランは一生忘れません」——昔のファンからの手紙が届いた。', cond: (s) => !G.isPitcher(s.player) },
    { title: 'ファンからの手紙', run: () => '「あの日の完封は一生忘れません」——昔のファンからの手紙が届いた。', cond: (s) => G.isPitcher(s.player) },
    { title: '健康診断', run: (s) => '健康診断の結果は良好。現役時代の貯金がまだ残っているらしい。' + fx(s, { happy: 2 }) },
    { title: '孫の顔', cond: (s) => s.player.kids.some((k) => G.kidAge(s, k) >= 28), run: (s) => '子供が孫を連れて遊びに来た。「じいじ、キャッチボールしよう！」' + fx(s, { happy: 10 }) },
  ];

  Object.assign(G.LIFE_SCENES, {
    continue_choice: {
      choices: (s) => [
        { label: 'このまま人生を続ける', run: (s2) => { G.startAfterLife(s2, s2.secondCareer); return null; } },
        { label: 'ここでエンディングを見る', run: (s2) => { G.finishLife(s2, s2.secondCareer); return null; } },
      ],
    },
    life_end: {
      choices: () => [{ label: 'エンディングへ', run: (s) => { G.finishLife(s, s.after.career); return null; } }],
    },
  });
})();
