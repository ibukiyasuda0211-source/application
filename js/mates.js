// チームメイトとの交流（話しかけて仲良くなり、人間関係に加える）
// ・性格によって好きな話題・苦手な話題がある（何度か話すとわかる）
// ・話しかけられるのは週2回まで。全員と親しくなれるわけではない（親しい仲間には上限がある）
// ・会わないと少しずつ疎遠になる
(function () {
  const G = window.G;

  G.PERSONAS = [
    { id: 'serious', name: 'まじめ', likes: ['baseball'], dislikes: ['joke'], mul: 1, hint: '野球の話になると真剣な顔になる' },
    { id: 'cheerful', name: '陽気', likes: ['joke', 'meal'], dislikes: [], mul: 1.15, hint: 'よく笑い、誰とでもすぐ打ち解ける' },
    { id: 'cool', name: 'クール', likes: ['baseball'], dislikes: ['meal', 'joke'], mul: 0.7, hint: '口数が少なく、群れるのが苦手' },
    { id: 'craftsman', name: '職人肌', likes: ['baseball'], dislikes: ['hobby'], mul: 0.85, hint: '練習の虫。雑談には興味が薄い' },
    { id: 'joker', name: 'お調子者', likes: ['joke', 'hobby'], dislikes: ['baseball'], mul: 1.1, hint: 'ロッカールームのムードメーカー' },
    { id: 'caring', name: '面倒見がいい', likes: ['baseball', 'meal'], dislikes: [], mul: 1.2, hint: '若手の相談によく乗っている' },
    { id: 'mypace', name: 'マイペース', likes: ['hobby'], dislikes: ['meal'], mul: 0.9, hint: '自分の世界を持っている' },
  ];
  G.personaById = (id) => G.PERSONAS.find((x) => x.id === id);

  G.TALK_TOPICS = [
    { id: 'baseball', name: '野球の話をする', desc: '打撃や配球について' },
    { id: 'hobby', name: '趣味の話をする', desc: 'オフの過ごし方や好きなもの' },
    { id: 'joke', name: '冗談を言う', desc: '場を和ませる' },
    { id: 'meal', name: '食事に誘う', desc: '3万円・仲15以上', cost: 3, minAff: 15 },
  ];
  G.TALKS_PER_WEEK = 2;
  G.FRIEND_AFF = 40;

  const TAG_PEOPLE = { senpai: 'senpai', rival: 'rival', kohai: 'kohai' };
  const fam = (name) => name.split(/[ ・]/)[0];

  // 交流の情報（性格・仲）はチームメイトごとに持つ
  G.mateInfo = (s, m) => {
    if (!m.persona) {
      m.persona = G.pick(G.PERSONAS).id;
      m.aff = G.ri(0, 12) + (m.tag === 'draft' ? 6 : 0);
      m.talks = 0;
    }
    const pid = TAG_PEOPLE[m.tag] || (s.people[`tm_${m.id}`] ? `tm_${m.id}` : null);
    const person = pid ? s.people[pid] : null;
    return { persona: G.personaById(m.persona), aff: person ? person.aff : m.aff, pid, person, known: m.talks >= 2 || !!person };
  };

  G.friendCap = (s) => {
    const p = s.player;
    return 2 + (p.skills.includes('mood') ? 1 : 0) + (p.popularity >= 50 ? 1 : 0) + (p.age >= 30 ? 1 : 0);
  };
  G.mateFriends = (s) => Object.values(s.people).filter((x) => x.group === 'mate');

  // 話しかけられるか（理由の文字列。できるなら ''）
  G.canTalk = (s, m, topicId) => {
    if (s.retired || s.after) return '現役のときだけ';
    const t = G.TALK_TOPICS.find((x) => x.id === topicId);
    const w = G.absWeek(s);
    const used = s.flags.talkW === w ? s.flags.talkN || 0 : 0;
    if (used >= G.TALKS_PER_WEEK) return `今週はもう話した（週${G.TALKS_PER_WEEK}回まで）`;
    if (m.talkW === w) return 'さっき話したばかり';
    const info = G.mateInfo(s, m);
    if (t.minAff && info.aff < t.minAff) return `仲${t.minAff}以上で誘える`;
    if (t.cost && s.player.money < t.cost) return 'お金が足りない';
    return '';
  };

  const LINES = {
    good: {
      baseball: (n) => `${n}は身を乗り出して話に乗ってきた。「そのタイミングの取り方、俺も試してみるよ」`,
      hobby: (n) => `${n}の趣味の話で大盛り上がり。「今度一緒に行こうぜ！」`,
      joke: (n) => `${n}が腹を抱えて笑った。「お前、おもしろいな！」`,
      meal: (n) => `${n}と焼肉へ。食べながら、野球のことも、家族のことも、たくさん話した。`,
    },
    ok: {
      baseball: (n) => `${n}と軽く野球の話をした。悪くない雰囲気だ。`,
      hobby: (n) => `${n}と趣味の話をした。少しだけ距離が縮まった気がする。`,
      joke: (n) => `${n}は小さく笑ってくれた。`,
      meal: (n) => `${n}と食事に行った。会話はぼちぼちだった。`,
    },
    bad: {
      baseball: (n) => `${n}は「…そういう話は、また今度な」とそっけなかった。`,
      hobby: (n) => `${n}は「へえ」と言ったきり、スマホに目を落とした。`,
      joke: (n) => `${n}は真顔のまま。…すべった。気まずい空気が流れる。`,
      meal: (n) => `${n}は「ごめん、今日は用事が」と断った。ちょっと気まずい。`,
    },
  };

  // 話しかける
  G.talkTo = (s, m, topicId) => {
    const why = G.canTalk(s, m, topicId);
    if (why) return { ok: false, text: why };
    const p = s.player;
    const t = G.TALK_TOPICS.find((x) => x.id === topicId);
    const info = G.mateInfo(s, m);
    const per = info.persona;
    const w = G.absWeek(s);
    s.flags.talkN = s.flags.talkW === w ? (s.flags.talkN || 0) + 1 : 1;
    s.flags.talkW = w;
    m.talkW = w;
    m.talks = (m.talks || 0) + 1;
    if (t.cost) p.money -= t.cost;
    const liked = per.likes.includes(topicId);
    const disliked = per.dislikes.includes(topicId);
    let d = liked ? G.ri(6, 10) : disliked ? -G.ri(0, 4) : G.ri(2, 5);
    if (topicId === 'meal' && !disliked) d += 2;
    if (d > 0) {
      d *= per.mul;
      if (Math.abs(m.age - p.age) >= 8 && per.id !== 'caring') d *= 0.8;
      const rv = G.positionRival && G.positionRival(s);
      if (rv === m && !(p.usage && p.usage.status === 'starter')) d *= 0.7; // レギュラーを争う相手とは、少しぎこちない
    }
    d = Math.round(d);
    const n = fam(m.name);
    const tone = liked ? 'good' : disliked ? 'bad' : 'ok';
    let text = LINES[tone][topicId](n);
    if (m.talks === 2) text += `\n（${n}は「${per.name}」な性格のようだ。${per.hint}）`;
    // 親密度を反映
    let joined = '';
    if (info.person) {
      info.person.aff = G.clamp(info.person.aff + d, 0, 100);
      m.aff = info.person.aff;
    } else {
      const cap = G.friendCap(s);
      const nAff = G.clamp(m.aff + d, 0, 100);
      if (nAff >= G.FRIEND_AFF) {
        if (G.mateFriends(s).length >= cap) {
          m.aff = G.FRIEND_AFF - 1;
          joined = `\n（もっと仲良くなれそうだが、今は付き合いきれない。親しくできるチームメイトは${cap}人まで）`;
        } else {
          m.aff = nAff;
          const pid = `tm_${m.id}`;
          s.people[pid] = { id: pid, name: m.name, role: `チームメイト（${G.posById(m.pos).name}）`, group: 'mate', aff: nAff, met: true, mateId: m.id, persona: per.id, since: s.year };
          s.history.push({ year: s.year, text: `チームメイトの${m.name}と打ち解ける` });
          G.log(s, `🤝 ${m.name}と打ち解けた（人間関係に追加）`, 'good', 'life', true);
          joined = `\n\n${n}とすっかり打ち解けた！（人間関係に追加された）`;
        }
      } else m.aff = nAff;
    }
    if (d > 0) G.addHappy(s, 1);
    s.story.talks = (s.story.talks || 0) + 1;
    if (topicId === 'meal') s.story.mealsWithMates = (s.story.mealsWithMates || 0) + 1;
    return { ok: true, tone, d, text: text + `（仲${d >= 0 ? '+' : ''}${d}）` + joined };
  };

  // ---------- 仲良くなったチームメイトとの過ごし方 ----------
  const PERKS = {
    serious: (s) => G.applyFx(s, { exp: { technique: 5, mind: 2 } }),
    craftsman: (s) => G.applyFx(s, { exp: { technique: 7 } }),
    cheerful: (s) => G.applyFx(s, { happy: 3 }),
    joker: (s) => G.applyFx(s, { happy: 3, cond: G.chance(0.3) ? 1 : 0 }),
    caring: (s) => G.applyFx(s, { exp: { mind: 6 } }),
    cool: (s) => G.applyFx(s, { exp: { technique: 3, mind: 3 } }),
    mypace: (s) => G.applyFx(s, { stamina: 6 }),
  };
  const SPOTS = ['焼肉屋', '行きつけの居酒屋', 'サウナ', 'バッティングセンター', 'ラーメン屋', 'ゴルフ場', '映画館'];
  const mateActions = (s) =>
    G.mateFriends(s).map((x) => ({
      id: `mate:${x.id}`,
      place: 'people',
      cost: 3,
      name: `${x.name}と過ごす`,
      desc: `${x.role}・${G.personaById(x.persona).name}`,
      run: (s2) => {
        const per = G.personaById(x.persona);
        const d = Math.round(G.ri(5, 8) * per.mul);
        x.aff = G.clamp(x.aff + d, 0, 100);
        return `${x.name}と${G.pick(SPOTS)}へ。（${x.name}との仲+${d}）` + PERKS[x.persona](s2);
      },
    }));
  const prevExtra = G.extraActions;
  G.extraActions = (s) => [...(prevExtra ? prevExtra(s) : []), ...(s.people ? mateActions(s) : [])];

  // ---------- 毎週：疎遠・出来事 ----------
  const origWeekly = G.weeklyLife;
  G.weeklyLife = (s) => {
    origWeekly(s);
    const R = s.roster;
    for (const x of G.mateFriends(s)) {
      const m = R && R.players.find((y) => y.id === x.mateId);
      if (!m && !/元チームメイト/.test(x.role)) x.role = `元チームメイト（${x.role.replace(/^チームメイト（|）$/g, '')}）`;
      x.aff = Math.max(0, x.aff - (m ? 0.5 : 0.8));
      if (x.aff <= 20) {
        delete s.people[x.id];
        if (m) m.aff = 20;
        G.scene(s, '疎遠', `最近、${x.name}とはすっかり話さなくなってしまった…。\n（人間関係から外れた）`);
        continue;
      }
      if (x.aff >= 60 && !s.queue.some((q) => q.kind !== 'info') && G.chance(0.025)) {
        const per = G.personaById(x.persona);
        const ev = per.likes.includes('baseball')
          ? [`${x.name}からのアドバイス`, `${x.name}「最近、ボールの見逃し方が少し早いぞ。0.1秒待ってみろ」\n言われた通りにしたら、手応えがあった。\n\n` + G.applyFx(s, { exp: { technique: 12, mind: 5 } })]
          : [`${x.name}と夜通し語る`, `${x.name}と朝まで語り明かした。野球を離れても、こんなに話せる仲間がいるのはありがたい。\n\n` + G.applyFx(s, { happy: 6, aff: { [x.id]: 4 } })];
        G.scene(s, ev[0], ev[1]);
      }
    }
  };
})();
