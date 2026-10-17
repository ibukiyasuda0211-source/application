// 仲間との合同自主トレ（特殊能力の伝授）と、ライバルとのタイトル争い
(function () {
  const G = window.G;

  // ---------- 合同自主トレ（1月・オフ限定） ----------
  const TEACH = {
    senpai: { B: ['chance', 'eye', 'tough', 'glove'], P: ['pinch', 'heavy', 'quick'] },
    rival: { B: ['powerhit', 'avg', 'steal', 'laser'], P: ['kire', 'nobi', 'kkk'] },
  };
  const SPOTS = ['グアム', '沖縄・宮古島', '鹿児島・徳之島', 'ハワイ', '地元の室内練習場'];

  const canJointTrainCore = (s, who) => {
    if (s.after || s.retired) return '現役のときだけ';
    const ph = G.phaseOf(s.week, s.year).id;
    if (!['jan', 'off'].includes(ph)) return '1月・12月の自主トレ期間だけ';
    const x = s.people[who];
    if (!x || !x.met) return 'まだ知り合っていない';
    if (who === 'rival' && x.retired) return 'ライバルは引退した';
    if (who === 'rival' && x.aff < 30) return 'ライバルとの仲30以上';
    return '';
  };
  G.canJointTrain = (s, who) => G.filter('canJointTrain', canJointTrainCore(s, who), s, who);

  // 教えてもらえる特殊能力（人ごとに決まっている）
  const teachSkill = (s, who) => {
    const p = s.player;
    const x = s.people[who];
    const pool = TEACH[who][G.isPitcher(p) ? 'P' : 'B'].filter((id) => !p.skills.includes(id));
    if (!pool.length) return null;
    if (!x.teach || p.skills.includes(x.teach) || !pool.includes(x.teach)) x.teach = G.pick(pool);
    return G.skillById(x.teach);
  };
  G.teachSkillOf = (s, who) => {
    const x = s.people[who];
    return x && x.teach ? G.skillById(x.teach) : null;
  };

  G.jointTraining = (s, who) => {
    const p = s.player;
    const x = s.people[who];
    const key = `jt_${who}`;
    const n = (s.story[key] = (s.story[key] || 0) + 1);
    const pit = G.isPitcher(p);
    const spot = G.pick(SPOTS);
    const label = who === 'senpai' ? `${x.name}先輩` : who === 'rival' ? `同期のライバル・${x.name}` : `後輩の${x.name}`;
    let exp = pit ? { technique: 12, breaking: 8, mind: 4 } : { technique: 12, muscle: 8, mind: 4 };
    if (who === 'rival') for (const k in exp) exp[k] = Math.round(exp[k] * 1.3);
    if (who === 'kohai') exp = { ...exp, mind: 14 };
    let msg = `${label}と${spot}で合同自主トレ。${who === 'rival' ? 'お互い一歩も譲らず、限界まで追い込んだ。' : who === 'kohai' ? '後輩に教えることで、自分の野球も見つめ直せた。' : '先輩の練習の質の高さに圧倒された。'}`;
    msg += G.applyFx(s, { exp, aff: { [who]: who === 'rival' ? 5 : 7 }, stamina: -12, happy: 2 });
    G.buzz(s, 'jointrain', { name: x.name.split(' ')[0] });
    // 3回目以降、仲が深まっていれば「伝授」
    if (who !== 'kohai' && n >= 3 && x.aff >= 55 && !s.story[`${key}_taught`]) {
      const sk = teachSkill(s, who);
      if (sk) {
        s.story[`${key}_taught`] = true;
        s.history.push({ year: s.year, text: `${x.name}から「${sk.name}」を伝授される` });
        const words =
          who === 'senpai'
            ? `${x.name}先輩「何年も一緒に自主トレしてきたお前になら教えてもいい。俺がプロで生き残ってこれた秘訣だ」`
            : `${x.name}「…しゃあねえな。お前に負けるのも癪だけど、張り合いがなくなるのはもっとつまらない。俺の${sk.name}のコツ、教えてやるよ」`;
        G.scene(s, '秘伝の伝授', `${words}\n\n` + G.applyFx(s, { skill: sk.id, aff: { [who]: 5 } }), { big: `「${sk.name}」習得` });
      }
    } else if (who !== 'kohai' && !s.story[`${key}_taught`]) {
      const sk = teachSkill(s, who);
      if (sk) msg += `\n（${x.name}の「${sk.name}」に何かヒントがありそうだ…）`;
    }
    if (who === 'kohai' && n >= 3 && !s.story.jt_kohai_grow) {
      s.story.jt_kohai_grow = true;
      s.history.push({ year: s.year, text: `自主トレで鍛えた後輩・${x.name}が頭角を現す` });
      G.scene(s, '後輩の成長', `一緒に自主トレを重ねてきた${x.name}が、キャンプで首脳陣の目に留まった。\n${x.name}「${p.name.split(' ')[0]}さんのおかげです！ 今年こそ1軍で一緒に戦いたいです」\n\n` + G.applyFx(s, { aff: { kohai: 10 }, trust: 4, exp: { mind: 15 } }));
    }
    return msg;
  };

  // ---------- タイトル争い ----------
  const CAT = {
    avg: { title: '首位打者', unit: '', rate: true },
    hits: { title: '最多安打', unit: '安打' },
    hr: { title: '本塁打王', unit: '本' },
    rbi: { title: '打点王', unit: '打点' },
    sb: { title: '盗塁王', unit: '盗塁' },
    w: { title: '最多勝', unit: '勝' },
    era: { title: '最優秀防御率', unit: '', rate: true, low: true },
    k: { title: '最多奪三振', unit: '奪三振' },
    s: { title: '最多セーブ', unit: 'セーブ' },
    hld: { title: '最優秀中継ぎ', unit: 'ホールド' },
  };
  G.RACE_CAT = CAT;

  const rivalPick = (s) => (s.draft ? s.draft.picks.find((d) => d.id === s.draft.rivalId) : null);

  // ライバルが同じリーグの主力なら、タイトル争いの相手になる
  G.on('leaders', (s) => {
    s.race = {};
    s.flags.rivalCat = null;
    const p = s.player;
    const rv = rivalPick(s);
    if (!rv || rv.retired || rv.league !== 'npb' || p.league === 'mlb' || !s.leaders) return;
    if (G.teamById(rv.teamId).league !== G.teamById(p.teamId).league) return;
    if (!/主力/.test(rv.status || '') && rv.rating < 60) return;
    let cats;
    if (G.isPitcher(p)) cats = p.role === 'SP' ? ['w', 'k', 'era'] : ['s', 'hld'];
    else cats = p.batter.power >= p.batter.contact ? ['hr', 'rbi', 'hr'] : p.batter.speed >= 65 ? ['sb', 'avg', 'hits'] : ['avg', 'hits', 'rbi'];
    const cat = G.pick(cats);
    const L = s.leaders[cat];
    if (!L) return;
    L.name = rv.name;
    L.team = G.teamById(rv.teamId).short;
    L.rival = true;
    s.flags.rivalCat = cat;
  });

  const myValue = (s, cat) => {
    const p = s.player;
    if (G.isPitcher(p)) {
      const st = s.stats.pit;
      if (cat === 'era') return st.outs ? (st.er * 27) / st.outs : null;
      return st[cat];
    }
    const st = s.stats.bat;
    if (cat === 'avg') return st.ab ? st.h / st.ab : null;
    if (cat === 'hits') return st.h;
    return st[cat];
  };
  const fmt = (cat, v) => (cat === 'avg' ? v.toFixed(3).replace(/^0/, '') : cat === 'era' ? v.toFixed(2) : `${v}${CAT[cat].unit}`);

  // 毎週：争っている部門の状況をログ・実況・SNSに
  G.raceWeek = (s) => {
    const p = s.player;
    const L = s.leaders;
    if (!L || s.retired || p.squad !== 'first') return;
    const prog = G.clamp(G.teamGamesPlayed(s) / G.SEASON_GAMES, 0, 1);
    if (prog < 0.4) return;
    const fam = p.name.split(' ')[0];
    const cats = G.isPitcher(p) ? (p.role === 'SP' ? ['w', 'era', 'k'] : ['s', 'hld']) : ['avg', 'hr', 'rbi', 'sb', 'hits'];
    const parts = [];
    s.race = s.race || {};
    for (const cat of cats) {
      const o = L[cat];
      if (!o) continue;
      const mine = myValue(s, cat);
      if (mine === null || mine === undefined) continue;
      const c = CAT[cat];
      let leader;
      let state;
      if (c.rate) {
        // 率の部門は規定到達ペースのときだけ
        const st = G.isPitcher(p) ? s.stats.pit : s.stats.bat;
        if (cat === 'era' ? st.outs < 429 * prog : st.pa < 443 * prog) continue;
        leader = cat === 'avg' ? o.final + (1 - prog) * 0.012 : o.final + (1 - prog) * 0.4;
        const better = c.low ? mine <= leader : mine >= leader;
        const close = c.low ? mine <= leader + 0.35 : mine >= leader - 0.012;
        if (!close) continue;
        state = better ? (Math.abs(mine - leader) < (cat === 'avg' ? 0.001 : 0.01) ? 'tie' : 'ahead') : 'behind';
      } else {
        leader = Math.round(o.final * prog);
        if (mine < Math.max(3, leader * 0.85)) continue;
        state = mine > leader ? 'ahead' : mine === leader ? 'tie' : 'behind';
      }
      const who = o.rival ? `同期のライバル・${o.name}` : `${o.name}（${o.team}）`;
      parts.push(`${c.title}：${fam} ${fmt(cat, mine)}／${o.rival ? '🔥' : ''}${o.name} ${fmt(cat, c.rate ? leader : leader)}`);
      const prev = s.race[cat];
      s.race[cat] = state;
      if (prev === state || !prev) {
        if (!prev && o.rival) G.buzz(s, 'race', { sent: 0, text: `${fam}と${o.name.split(' ')[0]}、同期同士の${c.title}争いが熱い` });
        continue;
      }
      // 順位が入れ替わった週は実況つき
      if (state === 'ahead' || state === 'tie') {
        const call =
          state === 'tie'
            ? `「${fam}、ついに${who}に並びました！ ${c.title}争いはまったくの互角！」`
            : `「${fam}、${who}を抜いてトップに立ちました！ ${c.title}のタイトルが見えてきた！」`;
        G.log(s, `🎙 実況${call}`, 'good', 'game', true);
        G.buzz(s, 'race', { sent: 1, text: o.rival ? `${fam}、ライバルの${o.name.split(' ')[0]}を${state === 'tie' ? 'とらえた' : '抜いた'}！${c.title}争いから目が離せない` : `${fam}が${c.title}争いのトップに！` });
        if (o.rival && !s.race[`${cat}_scene`]) {
          s.race[`${cat}_scene`] = true;
          G.scene(
            s,
            '同期対決',
            `🎙 実況${call}\n\n試合後、スマホに${o.name}からメッセージが届いた。\n「調子に乗るなよ。最後に笑うのは俺だ」\n\n負けられない戦いが続く。`,
          );
        }
      } else {
        G.log(s, `🎙 実況「${who}が${fam}を再び突き放しました！ ${c.title}争い、${fam}は追う立場に」`, 'bad', 'game');
        G.buzz(s, 'race', { sent: -1, text: o.rival ? `${fam}、ライバル${o.name.split(' ')[0]}にまた離された…巻き返して！` : `${fam}、${c.title}争いで抜き返されたか` });
      }
    }
    if (parts.length) G.log(s, `【タイトル争い】${parts.join('　')}`, 'team', 'game');
  };

  G.on('season:week', (s, gw) => {
    G.raceWeek(s);
  });

  // シーズン終了：ライバルとの争いの決着
  G.on('seasonEnd', (s) => {
    const cat = s.flags.rivalCat;
    if (!cat || !s.race || !s.race[cat]) return;
    const p = s.player;
    const o = s.leaders[cat];
    const title = CAT[cat].title;
    const won = s.titles.some((t) => t.year === s.year && t.name === title);
    const r = s.people.rival;
    if (won) {
      s.history.push({ year: s.year, text: `同期のライバル${o.name}との${title}争いを制す` });
      s.story.raceWon = (s.story.raceWon || 0) + 1;
      const promise = s.story.rival_promise ? `\n「…約束どおり焼肉は俺のおごりだ。来年は覚えてろよ」` : '';
      G.scene(s, '同期対決、決着', `最後まで続いた${title}争いは、${p.name}に軍配が上がった！\n\n${o.name}「おめでとう。…悔しいけど、今年はお前の年だったな」${promise}\n\n` + G.applyFx(s, { aff: { rival: 8 }, exp: { mind: 20 }, happy: 6 }), { big: 'ライバルに勝利' });
    } else {
      r.best = `${s.year}年 ${title}`;
      s.history.push({ year: s.year, text: `同期のライバル${o.name}が${title}を獲得` });
      s.story.raceLost = (s.story.raceLost || 0) + 1;
      G.scene(s, '同期対決、決着', `${title}のタイトルは、同期のライバル・${o.name}の手に渡った。\n\n${o.name}「来年もこうやって競い合おうぜ。お前がいると燃えるんだ」\n\n悔しさが、次のシーズンへの力になる。` + G.applyFx(s, { aff: { rival: 5 }, exp: { mind: 30 } }));
    }
  });
})();
