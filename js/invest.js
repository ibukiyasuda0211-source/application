// 大きな買い物・投資（年俸が上がってからのお金の使い道）
(function () {
  const G = window.G;

  // for: 'bat' 野手だけ / 'pit' 投手だけ / なし＝全員
  // levels の各段階を順に購入する。fx は購入時の効果（能力は直接上がる＝永続）
  G.INVESTMENTS = [
    {
      id: 'care',
      group: 'body',
      name: '体のケア設備',
      levels: [
        { name: '高圧酸素カプセル', price: 3000, desc: '毎週の体力回復+3・ケガのリスク-15%' },
        { name: '自宅リカバリールーム', price: 8000, desc: '回復+3・ケガ-15%・年齢による衰えが少しゆるやかに' },
        { name: '専属メディカルチーム', price: 20000, desc: '回復+3・ケガ-15%・衰えがさらにゆるやかに' },
      ],
    },
    {
      id: 'lab',
      group: 'body',
      name: (p) => (G.isPitcher(p) ? 'ピッチング解析ラボ' : 'バッティング解析ラボ'),
      levels: [
        { name: '弾道測定器の導入', price: 5000, desc: '練習の経験点+10%（ずっと）' },
        { name: '専用の室内練習場', price: 15000, desc: '練習の経験点さらに+10%' },
      ],
    },
    {
      id: 'bat',
      group: 'gear',
      for: 'bat',
      name: '特注バット',
      levels: [
        { name: '職人の特注バット', price: 1000, desc: 'ミート+1・パワー+1', fx: { contact: 1, power: 1 } },
        { name: '最高級アオダモの特注バット', price: 3000, desc: 'ミート+1・パワー+1', fx: { contact: 1, power: 1 } },
        { name: '名工が削る一点もののバット', price: 8000, desc: 'ミート+1・パワー+1', fx: { contact: 1, power: 1 } },
      ],
    },
    {
      id: 'glove',
      group: 'gear',
      for: 'bat',
      name: '特注グラブ',
      levels: [
        { name: 'オーダーメイドのグラブ', price: 1000, desc: '守備力+1・捕球+1', fx: { fielding: 1, catching: 1 } },
        { name: '最高級牛革のグラブ', price: 3000, desc: '守備力+1・捕球+1', fx: { fielding: 1, catching: 1 } },
        { name: 'グラブ職人の最高傑作', price: 8000, desc: '守備力+1・捕球+1', fx: { fielding: 1, catching: 1 } },
      ],
    },
    {
      id: 'spikes',
      group: 'gear',
      for: 'bat',
      name: 'オーダーメイドのスパイク',
      levels: [
        { name: '足型から作るスパイク', price: 800, desc: '走力+1', fx: { speed: 1 } },
        { name: '超軽量カーボンスパイク', price: 2500, desc: '走力+1・肩力+1', fx: { speed: 1, arm: 1 } },
      ],
    },
    {
      id: 'pglove',
      group: 'gear',
      for: 'pit',
      name: '特注グラブ（投手用）',
      levels: [
        { name: 'オーダーメイドのグラブ', price: 1000, desc: 'コントロール+1', fx: { control: 1 } },
        { name: '最高級牛革のグラブ', price: 3000, desc: 'コントロール+1', fx: { control: 1 } },
        { name: 'グラブ職人の最高傑作', price: 8000, desc: 'コントロール+1', fx: { control: 1 } },
      ],
    },
    {
      id: 'pspikes',
      group: 'gear',
      for: 'pit',
      name: 'オーダーメイドのスパイク（投手用）',
      levels: [
        { name: '足型から作るスパイク', price: 1000, desc: 'スタミナ+1', fx: { stamina: 1 } },
        { name: '下半身を安定させる金具つき', price: 3000, desc: 'スタミナ+1・球速+1km/h', fx: { stamina: 1, velocity: 1 } },
      ],
    },
    {
      id: 'academy',
      group: 'future',
      name: '野球アカデミーへの出資',
      levels: [1, 2, 3, 4, 5].map((n) => ({
        name: n === 1 ? '子供向け野球アカデミーを設立' : `アカデミーを拡充（${n}口目）`,
        price: 5000,
        desc: '人気が少し上がる。引退後の収入・経験に上乗せ。教え子がプロになることも',
      })),
    },
    {
      id: 'villa',
      group: 'future',
      name: '海辺の別荘',
      levels: [{ name: '海辺の別荘', price: 15000, desc: '毎週の充実度が少し上がる（ずっと）' }],
    },
    {
      id: 'stadium',
      group: 'future',
      name: 'ふるさとに球場を寄付',
      levels: [{ name: '少年野球場の寄付', price: 30000, desc: '人気+8・両親が大喜び。球場に自分の名前がつく' }],
    },
  ];

  G.INVEST_GROUPS = [
    { id: 'body', name: '体と練習への投資' },
    { id: 'gear', name: '道具の特注（能力が永続的に上がる）' },
    { id: 'future', name: '将来・社会への投資' },
  ];

  G.invLv = (s, id) => (s.player.invest && s.player.invest[id]) || 0;
  G.investName = (inv, p) => (typeof inv.name === 'function' ? inv.name(p) : inv.name);
  G.investList = (s) => {
    const pit = G.isPitcher(s.player);
    return G.INVESTMENTS.filter((x) => !x.for || (x.for === 'pit') === pit);
  };

  // 効果の問い合わせ
  G.restBonus = (s) => G.invLv(s, 'care') * 3;
  G.injuryMul = (s) => 1 - G.invLv(s, 'care') * 0.15;
  G.agingReliefInvest = (p) => Math.max(0, ((p.invest && p.invest.care) || 0) - 1) * 0.12;

  G.buyInvestment = (s, id) => {
    const p = s.player;
    const inv = G.INVESTMENTS.find((x) => x.id === id);
    if (!inv || (s.after && inv.group !== 'future')) return null;
    const lv = G.invLv(s, id);
    const next = inv.levels[lv];
    if (!next || p.money < next.price) return null;
    p.money -= next.price;
    p.invest = p.invest || {};
    p.invest[id] = lv + 1;
    const msgs = [];
    if (next.fx) {
      const target = G.isPitcher(p) ? p.pitcher : p.batter;
      const defs = G.isPitcher(p) ? G.PITCHER_ABILITIES : G.BATTER_ABILITIES;
      for (const k in next.fx) {
        const def = defs.find((d) => d.id === k);
        if (!def) continue;
        target[k] = Math.min(G.abilityMax(def), target[k] + next.fx[k]);
        msgs.push(`${def.name}+${next.fx[k]}`);
      }
    }
    if (id === 'academy') {
      p.popularity = G.clamp(p.popularity + 2, 0, 100);
      G.addHappy(s, 4);
      if (lv === 0) {
        s.history.push({ year: s.year, text: '子供向けの野球アカデミーを設立' });
        s.story.academyStart = s.year;
      }
      msgs.push('人気+2');
    }
    if (id === 'villa') {
      G.addHappy(s, 8);
      s.history.push({ year: s.year, text: '海辺に別荘を購入' });
    }
    if (id === 'stadium') {
      p.popularity = G.clamp(p.popularity + 8, 0, 100);
      G.addAff(s, 'parents', 20);
      G.addHappy(s, 15);
      s.history.push({ year: s.year, text: `ふるさとに「${p.name.split(' ')[0]}スタジアム」を寄付` });
      G.buzz(s, 'charity');
      G.scene(s, '球場の完成', `ふるさとに寄付した少年野球場が完成した。\n入口には「${p.name.split(' ')[0]}スタジアム」の文字。\n\n始球式に招かれると、子供たちの大歓声に包まれた。両親は涙を浮かべていた。`, { big: '球場寄付' });
    }
    if (id === 'care' && lv === 0) s.history.push({ year: s.year, text: '自宅に高圧酸素カプセルを導入' });
    const text = `${next.name}を購入した！${msgs.length ? `（${msgs.join('・')}）` : ''}`;
    G.log(s, `💰 ${text}`, 'good', 'life', true);
    return text;
  };

  // アカデミーに2口以上出資していれば、引退後に理事長の道も
  G.SECOND_CAREERS.splice(G.SECOND_CAREERS.length - 2, 0, {
    id: 'academy',
    name: '野球アカデミーの理事長になる',
    req: (s) => G.invLv(s, 'academy') >= 2,
    text: () => '出資してきた野球アカデミーの理事長に就任。グラウンドを走り回る子供たちの中から、いつか未来のスターが生まれるはずだ。',
  });
  G.AFTER_CAREERS.academy = {
    ranks: () => ['アカデミー理事長', '名門アカデミー理事長', '球界の育ての親'],
    need: [0, 900, 2600],
    income: [25, 40, 60],
    works: [
      { id: 'ac_teach', name: '子供たちを直接指導する', desc: '教え子が育つ', run: (s) => { s.after.data.team = G.clamp((s.after.data.team || 40) + 3, 0, 100); s.after.xp += 9; return `グラウンドで子供たちと一緒に汗を流した。（経験+9）` + G.applyFx(s, { happy: 3, stamina: -6 }); } },
      { id: 'ac_expand', name: '施設を拡張する', desc: '2000万円・評判が上がる', req: (s) => (s.player.money >= 2000 ? '' : 'お金が足りない'), run: (s) => { s.after.xp += 30; s.after.data.team = G.clamp((s.after.data.team || 40) + 6, 0, 100); return '室内練習場を新しく建てた。（経験+30）' + G.applyFx(s, { money: -2000, pop: 1 }); } },
      { id: 'ac_fund', name: '支援者を集める', desc: '寄付金が集まる', run: (s) => { s.after.xp += 6; return '企業や地域の人たちに、アカデミーの未来を語った。（経験+6）' + G.applyFx(s, { money: G.ri(50, 200) }); } },
    ],
  };

  // ---------- 練習効率（ラボ） ----------
  const origMul = G.trainingMultiplier;
  G.trainingMultiplier = (s) => origMul(s) * (1 + G.invLv(s, 'lab') * 0.1);

  // ---------- 別荘：充実度 ----------
  const origWeekly = G.weeklyLife;
  G.weeklyLife = (s) => {
    origWeekly(s);
    if (G.invLv(s, 'villa')) G.addHappy(s, 0.4);
  };

  // ---------- アカデミー：引退後に有利 ----------
  const origStart = G.startAfterLife;
  G.startAfterLife = (s, careerId) => {
    origStart(s, careerId);
    const lv = G.invLv(s, 'academy');
    if (lv && s.after) {
      s.after.xp += lv * 120;
      G.scene(s, 'アカデミーの仲間', `出資してきた野球アカデミーのスタッフや子供たちが、引退を祝ってくれた。\n「これからは、もっと顔を出してくださいね！」\n\n（アカデミーのつながりで、新しい仕事も順調に滑り出した）`);
    }
  };
  const origIncome = G.afterIncome;
  G.afterIncome = (s) => origIncome(s) + G.invLv(s, 'academy') * 6;

  // アカデミー出身の子がプロへ（毎年）
  const origYearly = G.yearlyLife;
  G.yearlyLife = (s) => {
    origYearly(s);
    const lv = G.invLv(s, 'academy');
    if (!lv) return;
    s.player.popularity = G.clamp(s.player.popularity + lv * 0.5, 0, 100);
    if (s.year - (s.story.academyStart || s.year) >= 4 && G.chance(0.05 * lv)) {
      const name = G.randomMaleName();
      const team = G.pick(G.NPB_TEAMS());
      s.story.academyPros = (s.story.academyPros || 0) + 1;
      s.history.push({ year: s.year, text: `アカデミー出身の${name}が${team.short}に入団` });
      G.scene(s, 'アカデミーからプロへ', `出資している野球アカデミーの卒業生・${name}が、${team.name}にドラフト指名された！\n「子供のころ、${s.player.name.split(' ')[0]}さんにバットの握り方を教わったんです」`);
      G.addHappy(s, 6);
    }
  };
})();
