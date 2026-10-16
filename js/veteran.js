// ベテランの選択肢（プレースタイルの転換・衰えをゆるやかにする調整）
(function () {
  const G = window.G;

  G.VET_AGE = 31;

  // 体のケア中心の調整（31歳から）。続けるほど、その冬の衰えが小さくなる
  G.TRAININGS.push({ id: 'vetcare', name: 'ベテラン調整', for: 'A', minAge: G.VET_AGE, gain: { technique: 5, mind: 7 }, stamina: 4, desc: '体のケア中心。続けるほど衰えがゆるやかに' });

  // keep: 年齢による衰えが半分になる能力
  G.PLAY_STYLES = [
    {
      id: 'finesse',
      for: 'pit',
      name: '技巧派への転身',
      desc: '球速-3km/h、コントロール+6、いちばん得意な変化球+1。以後、球速とコントロールの衰えが半分に',
      keep: ['velocity', 'control'],
      apply: (p) => {
        const pt = p.pitcher;
        pt.velocity = Math.max(120, pt.velocity - 3);
        pt.control = Math.min(100, pt.control + 6);
        const best = pt.pitches.slice().sort((a, b) => b.level - a.level)[0];
        if (best && best.level < G.MAX_PITCH_LEVEL) best.level++;
      },
    },
    {
      id: 'grinder',
      for: 'pit',
      name: '打たせて取る投球へ',
      desc: '球速-2km/h、コントロール+3、スタミナ+6。以後、スタミナとコントロールの衰えが半分に',
      keep: ['stamina', 'control'],
      apply: (p) => {
        const pt = p.pitcher;
        pt.velocity = Math.max(120, pt.velocity - 2);
        pt.control = Math.min(100, pt.control + 3);
        pt.stamina = Math.min(100, pt.stamina + 6);
      },
    },
    {
      id: 'contact',
      for: 'bat',
      name: '巧打者への転身',
      desc: 'パワー-4、ミート+5。以後、ミートと捕球の衰えが半分に',
      keep: ['contact', 'catching'],
      apply: (p) => {
        p.batter.power = Math.max(1, p.batter.power - 4);
        p.batter.contact = Math.min(100, p.batter.contact + 5);
      },
    },
    {
      id: 'slugger',
      for: 'bat',
      name: '長距離砲に専念',
      desc: '走力-4・守備力-3、パワー+5。以後、パワーと肩力の衰えが半分に',
      keep: ['power', 'arm'],
      apply: (p) => {
        p.batter.speed = Math.max(1, p.batter.speed - 4);
        p.batter.fielding = Math.max(1, p.batter.fielding - 3);
        p.batter.power = Math.min(100, p.batter.power + 5);
      },
    },
    {
      id: 'glove',
      for: 'bat',
      name: '守備職人になる',
      desc: 'パワー-3、守備力+4・捕球+3。以後、守備力と捕球の衰えが半分に',
      keep: ['fielding', 'catching'],
      apply: (p) => {
        p.batter.power = Math.max(1, p.batter.power - 3);
        p.batter.fielding = Math.min(100, p.batter.fielding + 4);
        p.batter.catching = Math.min(100, p.batter.catching + 3);
      },
    },
  ];
  G.styleById = (id) => G.PLAY_STYLES.find((x) => x.id === id);
  G.stylesFor = (p) => G.PLAY_STYLES.filter((x) => (x.for === 'pit') === G.isPitcher(p));

  // 衰えのゆるやかさ（0〜0.6）
  G.agingRelief = (p) => G.clamp((p.vetCare || 0) * 0.035 + (G.agingReliefInvest ? G.agingReliefInvest(p) : 0), 0, 0.6);
  G.agingKeep = (p) => (p.style ? G.styleById(p.style).keep : []);

  G.canConsultStyle = (s) => {
    const p = s.player;
    if (s.retired || s.after) return '現役のときだけ';
    if (p.age < G.VET_AGE) return `${G.VET_AGE}歳から`;
    if (p.style) return 'モデルチェンジ済み';
    return '';
  };

  const styleScene = (s, title, text) => s.queue.push({ kind: 'life', id: 'style_change', title, text, data: {} });

  G.startStyleConsult = (s) => {
    const p = s.player;
    styleScene(
      s,
      'モデルチェンジ',
      `${s.people.coach.name}「${p.age}歳か。若いころと同じやり方で、ずっと通用するわけじゃない。ここらで自分のスタイルを見直してみるのも手だぞ」\n\nどんな選手を目指す？（一度決めると戻せない）`,
    );
    return `${s.people.coach.name}に、これからのプレースタイルを相談した。`;
  };

  // 体の能力のピークからの落ち幅
  const physNow = (p) => (G.isPitcher(p) ? p.pitcher.velocity : p.batter.power + p.batter.speed);
  G.physDrop = (p) => Math.max(0, (p.peakPhys || physNow(p)) - physNow(p));

  // 体の衰えがはっきりしてきたら（または33歳になったら）、コーチの方から持ちかけてくる
  G.styleOfferCheck = (s) => {
    const p = s.player;
    const drop = G.physDrop(p);
    p.peakPhys = Math.max(p.peakPhys || 0, physNow(p));
    if (s.retired || s.after || p.style) return;
    const big = G.isPitcher(p) ? drop >= 5 : drop >= 10;
    if (big && p.age >= 29 && !s.story.styleDropOffered) {
      s.story.styleDropOffered = true;
      s.story.styleOffered = true;
      styleScene(
        s,
        '体の変化',
        `${s.people.coach.name}「${G.isPitcher(p) ? `全盛期より球速が${drop}km/hも落ちている` : '走力とパワーが全盛期より明らかに落ちてきた'}。体は正直だ。…だが、技術と経験はこれからもっと伸びる。ここでスタイルを変えてみないか」

どんな選手を目指す？（一度決めると戻せない）`,
      );
      return;
    }
    if (p.age < 33 || s.story.styleOffered) return;
    s.story.styleOffered = true;
    styleScene(
      s,
      'コーチの提案',
      `${s.people.coach.name}「なあ、${p.name.split(' ')[0]}。去年の映像を見たが、少しずつ体の反応が落ちてきている。…そろそろ、生き残るためのモデルチェンジを考えてみないか」`,
    );
  };

  G.LIFE_SCENES.style_change = {
    choices: (s) => [
      ...G.stylesFor(s.player).map((st) => ({
        label: `${st.name}（${st.desc}）`,
        run: (s2) => {
          const p = s2.player;
          st.apply(p);
          p.style = st.id;
          s2.history.push({ year: s2.year, text: `${st.name.replace(/^(.+?)(への転身|に専念|になる|へ)$/, '$1')}へモデルチェンジ` });
          G.buzz(s2, 'style', { name: st.name });
          return `「${st.name}」——新しい自分への挑戦が始まった。` + G.applyFx(s2, { exp: { mind: 20 }, aff: { coach: 6 } });
        },
      })),
      { label: '今のスタイルを貫く', run: (s2) => '「まだまだ、今のままで戦えます」' + G.applyFx(s2, { exp: { mind: 6 } }) },
    ],
  };
})();
