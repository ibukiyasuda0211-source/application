// 終盤の大きなお金の使い道（寄付・財団・記念館・球団買収）と、
// 歴史に残る表彰（記録達成のセレモニー・名球会・引退試合・永久欠番・野球殿堂）
(function () {
  const G = window.G;
  const fam = (s) => s.player.name.split(' ')[0];

  // ================= 終盤の大きな買い物 =================
  G.INVEST_GROUPS.push({ id: 'legacy', name: '球界と社会に残すもの（億単位）' });

  const DONATIONS = ['被災地の復興支援', '小児医療の研究', '児童養護施設の子どもたち', '球場のバリアフリー化', '子ども食堂の運営', '途上国への野球用具', '難病の子どもたちの支援', '野球少年のための奨学金', '地元の病院', '母校の野球部'];

  G.INVESTMENTS.push(
    {
      id: 'donate',
      group: 'legacy',
      name: '社会貢献の寄付',
      levels: DONATIONS.map((d) => ({ name: `${d}に1億円を寄付`, verb: `${d}に1億円を寄付した`, price: 10000, desc: '人気+2・充実度アップ。何度でも' })),
      onBuy: (s, lv, next) => {
        s.story.donated = (s.story.donated || 0) + next.price;
        s.player.popularity = G.clamp(s.player.popularity + 2, 0, 100);
        G.addHappy(s, 5);
        G.buzz(s, 'charity');
        if (lv === 1) s.history.push({ year: s.year, text: '社会貢献のための寄付を始める' });
        return `累計寄付額 ${G.fmtMoney(s.story.donated)}`;
      },
    },
    {
      id: 'foundation',
      group: 'legacy',
      name: '自分の名前の財団を設立',
      levels: [{ name: (s) => `${fam(s)}スポーツ財団の設立`, price: 100000, desc: '毎年、子どもたちのための事業を行う。人気と充実度が毎年上がる' }],
      onBuy: (s) => {
        s.history.push({ year: s.year, text: `「${fam(s)}スポーツ財団」を設立` });
        s.player.popularity = G.clamp(s.player.popularity + 6, 0, 100);
        G.addHappy(s, 10);
        G.scene(s, '財団の設立', `「${fam(s)}スポーツ財団」を設立した。\n\n家庭の事情で野球を続けられない子どもたちへの支援、全国での野球教室、病院への慰問——\n自分が野球からもらったものを、次の世代に返していく。`, { big: '財団設立' });
        return null;
      },
    },
    {
      id: 'museum',
      group: 'legacy',
      name: '自分の記念館',
      req: (s) => {
        const t = G.careerTotals(s);
        const war = t.war + (s.retired || s.after ? 0 : G.seasonWAR(s.player, s));
        return war >= 10 || s.titles.length >= 3 ? '' : '記念館にふさわしい実績が必要（通算WAR10以上、またはタイトル・表彰3つ以上）';
      },
      levels: [{ name: (s) => `${fam(s)}記念館の建設`, price: 300000, desc: 'ユニフォームやトロフィーを展示する記念館。人気が大きく上がり、引退後は入館料の収入も' }],
      onBuy: (s) => {
        const p = s.player;
        const t = G.careerTotals(s);
        const rec = G.isPitcher(p) ? `通算${t.pit.w}勝 ${t.pit.s}セーブ ${t.pit.k}奪三振` : `通算${t.bat.h}安打 ${t.bat.hr}本塁打`;
        const titles = [...new Set(s.titles.map((x) => x.name))].slice(0, 6);
        s.story.museum = s.year;
        s.history.push({ year: s.year, text: `ふるさとに「${fam(s)}記念館」が開館` });
        p.popularity = G.clamp(p.popularity + 10, 0, 100);
        G.addAff(s, 'parents', 15);
        G.scene(
          s,
          '記念館の開館',
          `ふるさとに「${fam(s)}記念館」がオープンした。\n\n入口には、入団会見の写真。館内には、${rec}の記録を刻んだパネル${titles.length ? `、そして${titles.join('・')}のトロフィー` : ''}。\n子どもの頃に使っていたボロボロのグラブも、両親が大事にとっておいてくれた。\n\n開館初日、入口には長い行列ができた。`,
          { big: '記念館オープン' },
        );
        return null;
      },
    },
    {
      id: 'owner',
      group: 'legacy',
      name: '球団の買収',
      req: (s) => (s.after ? '' : '引退後（第二の人生）に購入できる'),
      levels: [{ name: (s) => `${G.teamById(ownerTeam(s)).name}を買収してオーナーに`, price: 1000000, desc: '古巣の球団オーナーになる。毎年の補強方針を決め、チームの成績で球団の収支が変わる' }],
      onBuy: (s) => {
        const tid = ownerTeam(s);
        const team = G.teamById(tid);
        s.owner = { teamId: tid, since: s.year, titles: 0 };
        s.teamStr[tid] = Math.min(66, s.teamStr[tid] + 3);
        s.history.push({ year: s.year, text: `${team.name}を買収し、球団オーナーに就任` });
        G.scene(s, 'オーナー就任', `${team.name}の球団オーナーに就任した。\n\n就任会見。「選手として育ててもらったこの球団に、今度は経営者として恩返しをします。目標はもちろん、日本一です」\n\n毎年オフに、補強の方針を決めることになる。`, { big: '球団オーナー' });
        return null;
      },
    },
  );
  // 名前が関数の段階にも対応
  for (const inv of G.INVESTMENTS) for (const lv of inv.levels) if (typeof lv.name === 'function') lv.nameFn = lv.name;
  const VERBS = {
    foundation: (s) => `「${fam(s)}スポーツ財団」を設立した`,
    museum: (s) => `ふるさとに「${fam(s)}記念館」を建てた`,
    owner: (s) => `${G.teamById(ownerTeam(s)).name}を買収し、球団オーナーに就任した`,
  };
  G.on('invest:beforeBuy', (s, id) => {
    const inv = G.INVESTMENTS.find((x) => x.id === id);
    const lv = inv && inv.levels[G.invLv(s, id)];
    if (lv && lv.nameFn) lv.name = lv.nameFn(s);
    if (lv && VERBS[id]) lv.verb = VERBS[id](s);
  });
  G.investLevelName = (s, lv) => (lv.nameFn ? lv.nameFn(s) : lv.name);

  // 買収する球団：最後に所属していた日本の球団
  const ownerTeam = (s) => {
    const p = s.player;
    if (G.teamById(p.teamId).league !== 'mlb') return p.teamId;
    const last = [...s.career].reverse().find((c) => G.teamById(c.team).league !== 'mlb');
    return last ? last.team : G.draftTeamOf(s);
  };

  // 財団：毎年の活動
  const PROJECTS = ['全国10か所で無料の野球教室を開いた', '小児病棟を訪問し、子どもたちとキャッチボールをした', '被災地の少年野球チームに用具を贈った', '野球を続けたい中高生10人に奨学金を出した', '障がいのある子どもたちの野球大会を開いた'];
  G.on('year:life', (s) => {
    if (G.invLv(s, 'foundation')) {
      s.player.popularity = G.clamp(s.player.popularity + 1, 0, 100);
      G.addHappy(s, 4);
      G.scene(s, '財団の1年', `${fam(s)}スポーツ財団は、昨年${G.pick(PROJECTS)}。\n届いた子どもたちからの手紙を、一通ずつ読み返した。`);
    }
  });

  // 記念館：引退後の入館料
  G.on('afterIncome', (inc, s) => inc + (G.invLv(s, 'museum') ? 15 : 0));

  // 球団オーナー：毎年の補強方針と収支
  G.on('after:newYear', (s) => {
    if (s.owner && !s.ended) {
      const team = G.teamById(s.owner.teamId);
      s.queue.push({ kind: 'life', id: 'owner_plan', title: 'オーナー会議', text: `${team.name}の今季の補強方針を決める。\n昨季の成績：${s.owner.lastRank ? `${s.owner.lastRank}位` : '—'}`, data: {} });
    }
  });
  G.LIFE_SCENES.owner_plan = {
    choices: (s) => {
      const tid = s.owner.teamId;
      const bump = (n) => (s.teamStr[tid] = G.clamp(s.teamStr[tid] + n, 38, 68));
      return [
        { label: '大型補強（5億円）', run: (s2) => { bump(5); return '大物外国人選手とFAの目玉選手を獲得した！ 戦力は大きく上がった。' + G.applyFx(s2, { money: -50000, pop: 2 }); } },
        { label: '育成に投資（1億円）', run: (s2) => { bump(2); s2.owner.dev = (s2.owner.dev || 0) + 1; return '2軍の施設とコーチ陣を充実させた。若手の成長が楽しみだ。' + G.applyFx(s2, { money: -10000 }); } },
        { label: '現場に任せる（支出なし）', run: () => '補強は最小限に。監督と選手たちを信じることにした。' },
      ];
    },
  };
  G.on('after:seasonEnd', (s) => {
    if (!s.owner) return;
    const tid = s.owner.teamId;
    const team = G.teamById(tid);
    if (s.owner.dev) s.teamStr[tid] = G.clamp(s.teamStr[tid] + 1, 38, 68);
    const rank = G.leagueRanking(s, team.league).findIndex((r) => r.id === tid) + 1;
    s.owner.lastRank = rank;
    const profit = (rank === 1 ? G.ri(3, 6) : rank <= 3 ? G.ri(1, 3) : rank >= 5 ? -G.ri(1, 3) : 0) * 10000;
    s.player.money += profit;
    let text = `オーナーを務める${team.name}は${rank}位でシーズンを終えた。\n球団の収支：${profit >= 0 ? '+' : ''}${G.fmtMoney(profit)}`;
    if (rank === 1) {
      s.owner.titles++;
      s.history.push({ year: s.year, text: `オーナーとして${team.name}がリーグ優勝` });
      text += '\n\n🎉 リーグ優勝！ ビールかけの輪の中で、選手たちに胴上げされた！';
      if (G.chance(0.5)) {
        s.history.push({ year: s.year, text: `オーナーとして${team.name}が日本一` });
        text += '\nさらに日本シリーズも制し、日本一に輝いた！';
      }
      G.addHappy(s, 10);
    }
    G.scene(s, 'オーナーとしての1年', text, rank === 1 ? { big: 'オーナーとして優勝' } : {});
  });

  // ================= 記録達成のセレモニー・名球会 =================
  const MILESTONES = {
    bat: [
      ['h', 1000, '通算1000安打'],
      ['h', 1500, '通算1500安打'],
      ['h', 2000, '通算2000安打', true],
      ['h', 2500, '通算2500安打'],
      ['h', 3000, '通算3000安打'],
      ['hr', 100, '通算100本塁打'],
      ['hr', 200, '通算200本塁打'],
      ['hr', 300, '通算300本塁打'],
      ['hr', 400, '通算400本塁打'],
      ['hr', 500, '通算500本塁打'],
      ['sb', 300, '通算300盗塁'],
    ],
    pit: [
      ['w', 100, '通算100勝'],
      ['w', 150, '通算150勝'],
      ['w', 200, '通算200勝', true],
      ['s', 100, '通算100セーブ'],
      ['s', 250, '通算250セーブ', true],
      ['k', 1000, '通算1000奪三振'],
      ['k', 2000, '通算2000奪三振'],
      ['k', 3000, '通算3000奪三振'],
    ],
  };

  const liveCareer = (s) => {
    const t = G.careerTotals(s);
    const bat = { ...t.bat };
    const pit = { ...t.pit };
    if (!s.retired) {
      G.addStats(bat, s.stats.bat);
      G.addStats(pit, s.stats.pit);
      if (s.gw && s.gw.acc) {
        G.addStats(bat, s.gw.acc.weekBat);
        G.addStats(pit, s.gw.acc.weekPit);
      }
    }
    return { bat, pit };
  };

  G.milestoneCheck = (s, silent) => {
    const p = s.player;
    const pit = G.isPitcher(p);
    const tot = liveCareer(s)[pit ? 'pit' : 'bat'];
    s.flags.ms = s.flags.ms || {};
    for (const [k, n, name, meikyu] of MILESTONES[pit ? 'pit' : 'bat']) {
      const key = `${k}${n}`;
      if (s.flags.ms[key] || (tot[k] || 0) < n) continue;
      s.flags.ms[key] = s.year;
      if (silent) continue;
      s.history.push({ year: s.year, text: `${name}達成${meikyu ? '・名球会入り' : ''}` });
      p.popularity = G.clamp(p.popularity + (meikyu ? 6 : 2), 0, 100);
      G.buzz(s, 'hotgame', { text: `${name}達成` });
      const sp = G.spouse(s);
      const kid = p.kids.find((x) => G.kidAge(s, x) >= 4);
      const flower = sp ? `${kid ? `${kid.name}と` : ''}${sp.name}が花束を持ってグラウンドに駆け寄ってきた` : `${s.people.senpai.name}${s.people.senpai.retired ? 'コーチ' : '先輩'}が花束を渡してくれた`;
      if (meikyu) {
        s.flags.meikyuYear = s.year;
        G.scene(
          s,
          `${name}達成！`,
          `ついにその瞬間が来た——${name}！\n\n試合が中断され、球場全体がスタンディングオベーション。${flower}。\n電光掲示板には「${p.name} ${name}達成おめでとう」の文字。\n\n日本プロ野球名球会から入会の連絡が届いた。球史に名を刻む選手の仲間入りだ。`,
          { big: '名球会入り' },
        );
      } else {
        G.scene(s, `${name}達成`, `${name}を達成した！\n\n試合後のセレモニーで、${flower}。\n「ここまで支えてくれた皆さんのおかげです」`, { big: name });
      }
    }
  };

  G.on('ach:before', (s, x) => {
    if (!s.flags.ms) G.milestoneCheck(s, true); // 古いセーブは今までの分を記念式なしで記録
    if (x.game) G.milestoneCheck(s, false);
  });

  // 名球会のブレザー贈呈（その年の表彰式の頃）
  G.on('scheduled', (s) => {
    if (s.flags.meikyuYear === s.year && s.week === G.cal(s.year).awardsW && !s.flags.blazer) {
      s.flags.blazer = s.year;
      s.history.push({ year: s.year, text: '名球会のブレザーを授与される' });
      G.scene(s, '名球会ブレザー贈呈式', `名球会の総会で、えんじ色のブレザーが贈られた。\n袖を通すと、先輩たちから大きな拍手が起こった。\n「これからは、球界の顔としての振る舞いも求められるぞ」\n\nこのブレザーは、記録を残した者だけが着られる。`, { big: '名球会ブレザー' });
    }
  });

  // ================= 引退のセレモニー =================
  G.isMeikyu = (s) => {
    const t = G.careerTotals(s);
    return G.isPitcher(s.player) ? t.pit.w >= 200 || t.pit.s >= 250 : t.bat.h >= 2000;
  };
  const hallScore = (s) => {
    const war = G.careerTotals(s).war;
    return { war, ok: war >= 50 || (G.isMeikyu(s) && war >= 35) || (war >= 40 && s.titles.length >= 8), strong: war >= 60 || (G.isMeikyu(s) && war >= 45) };
  };

  G.on('retire', (s, reason) => {
    const p = s.player;
    s.retired.year = s.year;
    const tot = G.careerTotals(s);
    const war = tot.war;
    const team = G.teamById(p.teamId);
    const scenes = [];
    const released = /戦力外|トライアウト|拒否/.test(reason);
    // 引退試合
    if (!released && (war >= 5 || p.popularity >= 45 || p.yearsPro >= 9)) {
      let last;
      if (G.isPitcher(p)) {
        last = G.pick([
          '最後の打者を、渾身のストレートで空振り三振に仕留めた。',
          '最後の一球は、いちばん自信のある変化球。打球はショート正面のゴロだった。',
          '最後の打者には、ど真ん中のストレート。打たれたが、悔いはなかった。',
        ]);
      } else {
        const hrP = 0.1 + Math.max(0, p.batter.power - 50) * 0.006;
        last = G.chance(hrP)
          ? '最後の打席——フルスイングした打球は、満員のライトスタンドに吸い込まれた。現役最後の一打は、ホームランだった。'
          : G.chance(0.4)
            ? '最後の打席は、センター前へのクリーンヒット。一塁ベース上で、帽子を取って深く頭を下げた。'
            : '最後の打席はフルスイングの空振り三振。それでも、スタンドからは今日いちばんの拍手が起きた。';
      }
      const sp = G.spouse(s);
      const r = s.people.rival;
      const flowers = [sp && `${sp.name}`, ...p.kids.filter((k) => G.kidAge(s, k) >= 3).map((k) => k.name)].filter(Boolean);
      scenes.push({
        kind: 'info',
        title: '引退試合',
        big: '引退試合',
        text: `${team.name}の本拠地で、${p.name}の引退試合が行われた。チケットは発売と同時に完売した。\n\n${last}\n\n試合後のセレモニー。${flowers.length ? `${flowers.join('と')}から花束を受け取った。` : '両親から花束を受け取った。'}${r && !r.retired ? `\n客席には、同期のライバル・${r.name}の姿もあった。` : ''}\n最後はチームメイトの手で、${p.yearsPro + 1}回宙に舞った。`,
      });
    }
    // 永久欠番
    const years = s.career.filter((c) => c.team === p.teamId).length;
    if ((war >= 50 && years >= 10) || (war >= 70 && years >= 6)) {
      s.flags.retiredNumber = { number: p.number, team: p.teamId, year: s.year };
      s.history.push({ year: s.year, text: `背番号${p.number}が${team.name}の永久欠番に` });
      scenes.push({ kind: 'info', title: '永久欠番', big: `背番号${p.number} 永久欠番`, text: `球団から発表があった。\n「背番号${p.number}を、${team.name}の永久欠番とします」\n\n${p.number}番のユニフォームは、もう誰も着ることはない。本拠地のスコアボードの上に、その数字が永遠に掲げられる。` });
    }
    if (G.isMeikyu(s)) scenes.push({ kind: 'info', title: '名球会の仲間たち', text: `名球会の先輩たちから、引退をねぎらうメッセージが次々と届いた。\n「お疲れさん。これからは、グラウンドの外から野球を盛り上げていこう」` });
    if (scenes.length) s.queue.unshift(...scenes);
  });

  // ================= 野球殿堂 =================
  // 引退から5年たつと候補に。実績があれば投票で選ばれる（第二の人生を続けている場合）
  G.on('after:newYear', (s) => {
    if (!s.retired || s.flags.hall || s.ended) return;
    const yrs = s.year - (s.retired.year || s.year);
    if (yrs < 5 || yrs > 20) return;
    const h = hallScore(s);
    let pr = 0;
    let expert = false;
    if (h.ok) pr = h.strong ? 0.8 : 0.4;
    else if (s.after && s.after.career === 'coach' && s.history.filter((x) => /としてリーグ優勝/.test(x.text)).length >= 2 && s.player.age >= 55) {
      pr = 0.2;
      expert = true;
    }
    if (!G.chance(pr)) {
      if (h.ok && yrs === 5) G.scene(s, '野球殿堂の発表', '今年の野球殿堂入りが発表された。…今回は、わずかに得票が足りなかった。\n「まだまだ、これからさ」');
      return;
    }
    s.flags.hall = { year: s.year, expert };
    s.titles.push({ year: s.year, name: '野球殿堂入り' });
    s.history.push({ year: s.year, text: `野球殿堂入り（${expert ? 'エキスパート表彰' : 'プレーヤー表彰'}）` });
    s.queue.push({
      kind: 'life',
      id: 'hall_speech',
      title: '野球殿堂入り',
      text: `${G.fmtDate(`${s.year}-01-15`, false)}、野球殿堂博物館で殿堂入りが発表された。\n\n「${expert ? 'エキスパート表彰' : 'プレーヤー表彰'}——${s.player.name}」\n\n自分の顔が刻まれたレリーフが、歴代の名選手たちの隣に並ぶ。\n表彰式のスピーチで、何を語ろう？`,
      data: {},
    });
  });
  G.LIFE_SCENES.hall_speech = {
    choices: (s) => {
      const p = s.player;
      const sp = G.spouse(s);
      return [
        { label: '家族への感謝を伝える', run: (s2) => `「${sp ? `${sp.name}、` : ''}父さん、母さん。${p.kids.length ? '子どもたち。' : ''}いちばん近くで支えてくれた家族に、このレリーフを捧げます」\n会場のあちこちから、すすり泣く声が聞こえた。` + G.applyFx(s2, { happy: 15, aff: { parents: 10 } }) },
        { label: 'ファンへの感謝を伝える', run: (s2) => `「どんなに打てない日も、スタンドから名前を呼んでくれた皆さん。皆さんの声が、僕の背中を押してくれました」\n大きな拍手が鳴りやまなかった。` + G.applyFx(s2, { happy: 12, pop: 5 }) },
        { label: '仲間とライバルへの感謝を伝える', run: (s2) => `「${s2.people.senpai.name}さん、${s2.people.coach.name}、そして同期の${s2.people.rival.name}。あなたたちがいたから、ここまで来られた」\n客席の${s2.people.rival.name}が、照れくさそうに手を挙げた。` + G.applyFx(s2, { happy: 12, aff: { rival: 10, senpai: 10 } }) },
      ];
    },
  };

  // ================= エンディングに残す称号 =================
  G.on('finishLife', (s, careerId) => {
    const e = s.ending;
    if (!e) return;
    const p = s.player;
    const honors = [];
    if (e.meikyu) honors.push(['🏅', '名球会', s.flags.meikyuYear ? `${s.flags.meikyuYear}年入会` : '']);
    if (s.flags.hall) honors.push(['🏛', '野球殿堂', `${s.flags.hall.year}年 ${s.flags.hall.expert ? 'エキスパート表彰' : 'プレーヤー表彰'}`]);
    else if (e.hall && !s.after) honors.push(['🏛', '野球殿堂', '引退から5年後に殿堂入り']);
    if (s.flags.retiredNumber) honors.push(['👕', `背番号${s.flags.retiredNumber.number} 永久欠番`, G.teamById(s.flags.retiredNumber.team).name]);
    const intl = (s.intlHist || []).filter((h) => h.result === '優勝').length;
    if (intl) honors.push(['🌏', `日本代表 世界一×${intl}`, '']);
    if (G.invLv(s, 'museum')) honors.push(['🏛', `${fam(s)}記念館`, `${s.story.museum}年開館`]);
    if (G.invLv(s, 'foundation')) honors.push(['🤝', `${fam(s)}スポーツ財団`, '子どもたちの未来を支える']);
    if (s.story.donated) honors.push(['💝', `累計寄付 ${G.fmtMoney(s.story.donated)}`, '']);
    if (s.owner) honors.push(['🏟', `${G.teamById(s.owner.teamId).name} オーナー`, s.owner.titles ? `リーグ優勝${s.owner.titles}回` : `${s.owner.since}年就任`]);
    e.honors = honors;
    // 殿堂の判定は実際の結果を優先
    if (s.after) e.hall = !!s.flags.hall;
    void p;
  });
})();
