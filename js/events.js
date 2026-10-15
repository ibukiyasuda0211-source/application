// ランダムイベント
(function () {
  const G = window.G;

  // 効果をまとめて適用し、変化の説明文を返す
  G.applyFx = (s, fx) => {
    const p = s.player;
    const out = [];
    if (fx.exp) {
      for (const k in fx.exp) {
        const v = Math.round(fx.exp[k]);
        p.exp[k] = Math.max(0, p.exp[k] + v);
        const name = G.EXP_TYPES.find((e) => e.id === k).name;
        out.push(`${name}${v >= 0 ? '+' : ''}${v}`);
      }
    }
    if (fx.cond) {
      const before = p.condition;
      p.condition = G.clamp(p.condition + fx.cond, 0, 4);
      if (p.condition !== before) out.push(`調子${fx.cond > 0 ? 'アップ' : 'ダウン'}`);
    }
    if (fx.stamina) {
      p.stamina = G.clamp(p.stamina + fx.stamina, 0, 100);
      out.push(`体力${fx.stamina > 0 ? '+' : ''}${fx.stamina}`);
    }
    if (fx.pop) {
      p.popularity = G.clamp(p.popularity + fx.pop, 0, 100);
      out.push(`人気${fx.pop > 0 ? '+' : ''}${fx.pop}`);
    }
    if (fx.trust) {
      p.trust = G.clamp(p.trust + fx.trust, 0, 100);
      out.push(`首脳陣の評価${fx.trust > 0 ? 'アップ' : 'ダウン'}`);
    }
    if (fx.money) {
      p.money += fx.money;
      out.push(`所持金${fx.money > 0 ? '+' : ''}${G.fmtMoney(fx.money)}`);
    }
    if (fx.happy) {
      G.addHappy(s, fx.happy);
      out.push(`充実度${fx.happy > 0 ? '+' : ''}${fx.happy}`);
    }
    if (fx.aff) {
      for (const id in fx.aff) {
        const t = G.addAff(s, id, fx.aff[id]);
        if (t) out.push(t);
      }
    }
    if (fx.ability) {
      for (const k in fx.ability) {
        const v = fx.ability[k];
        if (G.isPitcher(p) && k in p.pitcher) {
          p.pitcher[k] = G.clamp(p.pitcher[k] + v, 1, k === 'velocity' ? 168 : 100);
          const ab = G.PITCHER_ABILITIES.find((a) => a.id === k);
          out.push(`${ab.name}${v > 0 ? '+' : ''}${v}`);
        } else if (!G.isPitcher(p) && k in p.batter) {
          p.batter[k] = G.clamp(p.batter[k] + v, 1, 100);
          const ab = G.BATTER_ABILITIES.find((a) => a.id === k);
          out.push(`${ab.name}${v > 0 ? '+' : ''}${v}`);
        }
      }
    }
    if (fx.skill) {
      if (!p.skills.includes(fx.skill)) {
        p.skills.push(fx.skill);
        out.push(`特殊能力「${G.skillById(fx.skill).name}」を習得！`);
      }
    }
    return out.length ? `（${out.join('、')}）` : '';
  };

  const P = (s) => s.player;
  const isP = (s) => G.isPitcher(s.player);
  const senpai = (s) => s.npc.senpai;
  const rival = (s) => s.npc.rival;
  const coach = (s) => s.npc.coach;
  const inSeason = (s) => s.week >= G.SEASON_START && s.week <= G.SEASON_END;

  G.EVENTS = [
    {
      id: 'senpai_drink',
      weight: 6,
      title: '先輩の誘い',
      text: (s) => `先輩の${senpai(s)}さんに「今夜、飲みに行かないか？」と誘われた。`,
      choices: [
        { label: '行く', run: (s) => '先輩と野球談義で盛り上がった！' + G.applyFx(s, { cond: 1, stamina: -10, exp: { mind: 12 } }) },
        { label: '断って素振りする', run: (s) => '黙々とバットを振り込んだ。' + G.applyFx(s, { exp: { technique: 10, muscle: 5 }, stamina: -5 }) },
      ],
    },
    {
      id: 'coach_advice_b',
      weight: 5,
      cond: (s) => !isP(s),
      title: 'コーチのアドバイス',
      text: (s) => `打撃コーチの${coach(s)}さんが声をかけてきた。「お前、ちょっと構えを見直してみないか？」`,
      choices: [
        {
          label: 'フォームを改造する',
          run: (s) => {
            if (G.chance(0.6)) return 'フォーム改造が大成功！打球が見違えるようになった！' + G.applyFx(s, { ability: { contact: G.ri(2, 4) } });
            return 'しっくりこない…元に戻すのに苦労した。' + G.applyFx(s, { cond: -1, exp: { mind: 10 } });
          },
        },
        { label: '今のフォームを貫く', run: (s) => '自分を信じることにした。' + G.applyFx(s, { exp: { mind: 15 } }) },
      ],
    },
    {
      id: 'coach_advice_p',
      weight: 5,
      cond: (s) => isP(s),
      title: '投手コーチのアドバイス',
      text: (s) => `投手コーチの${coach(s)}さん「腕の振りをもう少し鋭くしてみろ。球にキレが出るぞ」`,
      choices: [
        {
          label: '試してみる',
          run: (s) => {
            if (G.chance(0.55)) return 'ボールが走るようになった！' + G.applyFx(s, { ability: { velocity: G.ri(1, 2) } });
            return 'コントロールが乱れてしまった…' + G.applyFx(s, { cond: -1, exp: { technique: 10 } });
          },
        },
        { label: '変化球について聞く', run: (s) => '変化球の握りを教わった！' + G.applyFx(s, { exp: { breaking: 22 } }) },
      ],
    },
    {
      id: 'fan_letter',
      weight: 5,
      cond: (s) => P(s).popularity >= 10,
      title: 'ファンレター',
      text: () => '球団事務所にファンレターが届いていた。「いつも応援しています！」',
      run: (s) => 'やる気が湧いてきた！' + G.applyFx(s, { cond: 1, pop: 1 }),
    },
    {
      id: 'kid_fan',
      weight: 4,
      title: '少年ファン',
      text: () => '練習帰り、野球帽をかぶった少年にサインを頼まれた。「僕も将来プロ野球選手になる！」',
      choices: [
        { label: 'サインをして握手する', run: (s) => '少年は満面の笑みで帰っていった。' + G.applyFx(s, { pop: 2, exp: { mind: 8 } }) },
        { label: 'キャッチボールをしてあげる', run: (s) => '少年と日が暮れるまでキャッチボールをした。' + G.applyFx(s, { pop: 3, stamina: -8, exp: { mind: 12 } }) },
      ],
    },
    {
      id: 'magazine',
      weight: 4,
      cond: (s) => P(s).popularity >= 25,
      title: '雑誌の取材',
      text: () => '野球雑誌から特集インタビューの依頼が来た。',
      choices: [
        { label: '受ける', run: (s) => '特集記事が大きく掲載された！' + G.applyFx(s, { pop: 4, money: 20, stamina: -5 }) },
        { label: '練習を優先する', run: (s) => '取材は断ってグラウンドへ。' + G.applyFx(s, { exp: { technique: 8, mind: 8 } }) },
      ],
    },
    {
      id: 'cm',
      weight: 3,
      cond: (s) => P(s).popularity >= 55,
      title: 'CM出演オファー',
      text: () => '大手飲料メーカーからCM出演のオファーが舞い込んだ！',
      choices: [
        { label: '出演する', run: (s) => 'CMがお茶の間に流れた！' + G.applyFx(s, { money: G.ri(5, 20) * 100, pop: 5, stamina: -15 }) },
        { label: '野球に専念する', run: (s) => '「今は野球だけに集中したいんです」' + G.applyFx(s, { exp: { mind: 20 }, trust: 3 }) },
      ],
    },
    {
      id: 'supplement',
      weight: 2,
      title: '怪しいサプリ',
      text: () => '自称トレーナーの男が近づいてきた。「このサプリを飲めば筋肉モリモリだよ…ヒヒヒ」',
      choices: [
        {
          label: '飲んでみる',
          run: (s) => {
            if (G.chance(0.5)) return '体の奥から力が湧いてくる！' + G.applyFx(s, { exp: { muscle: 40 } });
            return 'お腹を壊してしまった…' + G.applyFx(s, { cond: -2, stamina: -20 });
          },
        },
        { label: 'きっぱり断る', run: (s) => '怪しいものには手を出さない。' + G.applyFx(s, { exp: { mind: 6 } }) },
      ],
    },
    {
      id: 'family_dinner',
      weight: 3,
      cond: (s) => !!G.spouse(s),
      title: '家族の時間',
      text: (s) => `${G.spouse(s).name}が得意料理を作って待っていてくれた。`,
      run: (s) => '家族の支えがあるから頑張れる。' + G.applyFx(s, { stamina: 15, cond: 1 }),
    },
    {
      id: 'rival_news',
      weight: 4,
      title: 'ライバルの活躍',
      text: (s) => `同期入団のライバル・${rival(s)}が${G.pick(['猛打賞', '初ホームラン', '完封勝利', 'サヨナラ打', '雑誌の表紙'])}で話題になっている。`,
      choices: [
        { label: '負けていられない！', run: (s) => '闘志に火がついた！' + G.applyFx(s, { exp: { mind: 10, muscle: 8 }, stamina: -8 }) },
        { label: '素直に祝福する', run: (s) => `${rival(s)}に祝福のメッセージを送った。` + G.applyFx(s, { exp: { mind: 12 } }) },
      ],
    },
    {
      id: 'veteran_skill',
      weight: 2,
      cond: (s) => G.availableSkills(P(s)).some((sk) => !P(s).skills.includes(sk.id)),
      title: 'ベテランの極意',
      text: (s) => `大ベテランの${senpai(s)}さんが「お前には特別に教えてやろう」と秘伝のコツを伝授してくれた。`,
      run: (s) => {
        const pool = G.availableSkills(P(s)).filter((sk) => !P(s).skills.includes(sk.id));
        const sk = G.pick(pool);
        return '目からウロコが落ちた！' + G.applyFx(s, { skill: sk.id });
      },
    },
    {
      id: 'shoulder',
      weight: 6,
      cond: (s) => P(s).stamina < 35 && !P(s).injury,
      title: '体の違和感',
      text: () => '練習中、体に嫌な違和感が走った…。',
      choices: [
        { label: '大事をとって休む', run: (s) => 'トレーナーにケアしてもらった。' + G.applyFx(s, { stamina: 30, trust: -2 }) },
        {
          label: '我慢して練習を続ける',
          run: (s) => {
            if (G.chance(0.5)) {
              G.injure(s, true);
              return `無理がたたってケガをしてしまった…（${P(s).injury.name}・全治${P(s).injury.weeks}週）`;
            }
            return '何とか乗り切った。' + G.applyFx(s, { exp: { mind: 15 }, trust: 2 });
          },
        },
      ],
    },
    {
      id: 'slump',
      weight: 3,
      cond: (s) => P(s).condition >= 3,
      title: '好事魔多し',
      text: () => '最近調子が良かったが、急に感覚が狂い始めた…。',
      run: (s) => 'しばらく苦しむことになりそうだ。' + G.applyFx(s, { cond: -2 }),
    },
    {
      id: 'zone',
      weight: 3,
      cond: (s) => P(s).condition <= 2,
      title: 'つかんだ感覚',
      text: () => '練習中、何かをつかんだ気がした！',
      run: (s) => 'これだ…この感覚だ！' + G.applyFx(s, { cond: 2 }),
    },
    {
      id: 'dorm_food',
      weight: 4,
      cond: (s) => P(s).age <= 23,
      title: '寮の食事',
      text: () => '寮のおばちゃん「若いんだからいっぱい食べなさい！」山盛りのどんぶりが出てきた。',
      run: (s) => '完食した！' + G.applyFx(s, { exp: { muscle: 12 }, stamina: 10 }),
    },
    {
      id: 'manager_talk',
      weight: 4,
      cond: (s) => P(s).squad === 'second',
      title: '2軍監督との面談',
      text: () => '2軍監督「最近いい顔つきになってきたな。上でも通用するところを見せてみろ」',
      run: (s) => '期待されているようだ！' + G.applyFx(s, { trust: 6, cond: 1 }),
    },
    {
      id: 'night_out',
      weight: 3,
      cond: (s) => (s.flags.playCount || 0) >= 3,
      title: '夜遊び発覚',
      text: () => '週刊誌に夜の街を歩く姿を撮られてしまった！',
      choices: [
        { label: '素直に謝罪する', run: (s) => { s.flags.playCount = 0; return '反省の色を示した。' + G.applyFx(s, { trust: -5, pop: -2 }); } },
        { label: '開き直る', run: (s) => { s.flags.playCount = 0; return '首脳陣の目が冷たい…' + G.applyFx(s, { trust: -12, pop: 2 }); } },
      ],
    },
    {
      id: 'star_training',
      weight: 5,
      cond: (s) => s.week <= 4 || s.week >= 45,
      title: '合同自主トレ',
      text: (s) => `球界を代表するスター選手から「一緒に自主トレしないか？」と誘われた！`,
      choices: [
        { label: '参加する', run: (s) => '一流の練習を間近で体感した！' + G.applyFx(s, { exp: isP(s) ? { breaking: 20, technique: 15, mind: 10 } : { technique: 20, muscle: 15, mind: 10 }, stamina: -20, money: -50 }) },
        { label: '自分のペースでやる', run: (s) => 'マイペースに調整した。' + G.applyFx(s, { stamina: 20 }) },
      ],
    },
    {
      id: 'charity',
      weight: 2,
      cond: (s) => P(s).money >= 1000,
      title: 'チャリティー',
      text: () => '被災地支援のチャリティー活動への協力を依頼された。',
      choices: [
        { label: '300万円寄付する', run: (s) => '多くの人から感謝の声が届いた。' + G.applyFx(s, { money: -300, pop: 6, exp: { mind: 15 } }) },
        { label: '野球教室を開く', run: (s) => '子供たちに笑顔が戻った。' + G.applyFx(s, { pop: 3, stamina: -10, exp: { mind: 10 } }) },
      ],
    },
    {
      id: 'video_study',
      weight: 4,
      title: 'データ分析',
      text: () => 'スコアラーが相手チームの分析データを見せてくれた。',
      run: (s) => '研究が進んだ！' + G.applyFx(s, { exp: { technique: 10, mind: 6 } }),
    },
    {
      id: 'catcher_talk',
      weight: 4,
      cond: (s) => isP(s),
      title: '正捕手との対話',
      text: () => '正捕手「お前の球、もっとインコースを攻めてもいいと思うぜ」',
      run: (s) => '配球について深く話し合った。' + G.applyFx(s, { exp: { technique: 12, mind: 8 } }),
    },
    {
      id: 'game_meta',
      weight: 1,
      title: '野球ゲーム',
      text: () => '後輩が遊んでいる野球ゲームに自分が登場していた。…能力、低くない？',
      run: (s) => '見返してやる！' + G.applyFx(s, { exp: { mind: 15 } }),
    },
    {
      id: 'lottery',
      weight: 1,
      title: '宝くじ',
      text: () => '寮の先輩にもらった宝くじを確認してみると…？',
      run: (s) => {
        if (G.chance(0.15)) return 'なんと当たっていた！' + G.applyFx(s, { money: 100 });
        return 'ハズレだった。まあそんなものだ。';
      },
    },
    {
      id: 'dog',
      weight: 1,
      cond: (s) => !P(s).dog,
      title: '子犬',
      text: () => '雨の日、帰り道で震えている子犬を見つけた。',
      choices: [
        { label: '連れて帰る', run: (s) => { P(s).dog = G.pick(['ポチ', 'コロ', 'ハル', 'ボール', 'ホームラン']); return `子犬に「${P(s).dog}」と名付けた！癒やされる毎日だ。` + G.applyFx(s, { cond: 1, exp: { mind: 10 } }); } },
        { label: '保護団体に連絡する', run: (s) => '無事に保護してもらえた。' + G.applyFx(s, { exp: { mind: 5 } }) },
      ],
    },
    {
      id: 'reporter_bad',
      weight: 3,
      cond: (s) => inSeason(s) && P(s).squad === 'first' && P(s).condition <= 1,
      title: '辛口記事',
      text: () => 'スポーツ新聞に「期待外れ」と厳しい見出しが躍った…。',
      choices: [
        { label: '気にしない', run: (s) => '気持ちを切り替えた。' + G.applyFx(s, { cond: 1 }) },
        { label: '見返してやる！', run: (s) => '悔しさを練習にぶつけた！' + G.applyFx(s, { exp: { mind: 15, technique: 10 }, stamina: -12 }) },
      ],
    },
  ];

  G.pickRandomEvent = (s) => {
    const pool = G.EVENTS.filter((e) => e.id !== s.flags.lastEvent && (!e.cond || e.cond(s))).map((e) => ({ e, weight: e.weight }));
    const picked = G.weighted(pool);
    return picked ? picked.e : null;
  };
})();
