// おまかせ進行（1か月・次の節目・シーズン終了・年末まで）
// 練習と私生活の選び方を決めておけば、選択が必要な出来事が起きるまで自動で進む
(function () {
  const G = window.G;

  G.AUTO_TRAIN = [
    { id: 'smart', name: 'おまかせ', desc: '体力を見ながら練習と休養' },
    { id: 'hard', name: 'ガンガン鍛える', desc: '特訓も入れる。ケガに注意' },
    { id: 'easy', name: '無理をしない', desc: '体力に余裕を持たせる' },
  ];
  G.AUTO_PRIV = [
    { id: 'smart', name: 'おまかせ', desc: '恋人・家族・仲間・趣味をバランスよく' },
    { id: 'love', name: '恋愛・家族を優先', desc: 'デートや家族サービス' },
    { id: 'people', name: '仲間づきあい', desc: '先輩・ライバル・親友と過ごす' },
    { id: 'growth', name: '野球漬け', desc: '自主練・研究・合同自主トレ' },
    { id: 'rest', name: '休養中心', desc: '家でのんびり・趣味・ケア' },
  ];

  G.autoPlan = (s) => {
    s.flags.autoPlan = s.flags.autoPlan || { train: 'smart', priv: 'smart', raise: true, choose: true };
    if (s.flags.autoPlan.choose === undefined) s.flags.autoPlan.choose = true;
    return s.flags.autoPlan;
  };

  // 人生を左右する選択は、おまかせ中でも必ず止まって自分で選ぶ
  const STOP_KINDS = ['contract', 'release', 'fa', 'forced_retire'];
  const STOP_LIFE = ['second_career', 'continue_choice', 'life_end', 'birth', 'wedding', 'mlb_offer', 'mlb_release', 'npb_return', 'intl_select', 'style_change', 'pos_offer', 'pos_request', 'fa_declare', 'trade', 'owner_plan', 'hall_speech', 'chain_academy'];
  G.isBigChoice = (q) => STOP_KINDS.includes(q.kind) || (q.kind === 'life' && STOP_LIFE.includes(q.id));
  const AVOID = /飲んでみる|開き直る|我慢して|言い張る|言い返す|断る|貸す/;

  // 小さな選択は無難なものを選ぶ
  const autoChoose = (s, q) => {
    const labels = G.sceneChoices(s, q);
    let idx = labels.findIndex((l) => !AVOID.test(l));
    if (q.kind === 'life' && q.id === 'choose_hobby') idx = G.ri(0, labels.length - 1);
    if (idx < 0) idx = 0;
    const title = q.title;
    G.resolveScene(s, idx, q.input);
    return { title, label: labels[idx] };
  };

  // ---------- 練習の選び方 ----------
  const pickTraining = (s, plan) => {
    const p = s.player;
    const opts = G.trainingOptions(s);
    const has = (id) => opts.some((o) => o.id === id);
    if (p.injury) return has('rehab') ? 'rehab' : 'rest';
    const limit = { smart: 45, hard: 32, easy: 62 }[plan.train];
    if (p.stamina < limit) return 'rest';
    if (has('vetcare') && G.chance(plan.train === 'hard' ? 0.25 : 0.5)) return 'vetcare';
    if (plan.train === 'hard' && p.stamina >= 75 && G.chance(0.35)) return 'special';
    const pool = opts.filter((o) => !o.rest && !o.risky && o.id !== 'vetcare').map((o) => o.id);
    // 弱いところを重点的に
    if (G.isPitcher(p)) {
      const pt = p.pitcher;
      if (pt.control < 50 && pool.includes('pitching') && G.chance(0.5)) return 'pitching';
      if (pt.pitches.reduce((a, x) => a + x.level, 0) < 6 && pool.includes('breakball') && G.chance(0.5)) return 'breakball';
    } else {
      const b = p.batter;
      if (b.fielding + b.catching < b.contact + b.power - 20 && pool.includes('defense') && G.chance(0.5)) return 'defense';
      if (pool.includes('batting') && G.chance(0.45)) return 'batting';
    }
    return G.pick(pool);
  };

  // ---------- 私生活の選び方 ----------
  const pickPrivate = (s, plan) => {
    const p = s.player;
    const acts = G.privateActions(s).filter((a) => a.ok);
    const ok = (id) => acts.find((a) => a.id === id);
    const starts = (pre) => acts.filter((a) => a.id.startsWith(pre));
    const streakOk = (id) => !(s.flags.lastPriv === id && (s.flags.privStreak || 1) >= 2);
    const choose = (list) => {
      const c = list.filter((a) => a && streakOk(a.id));
      return c.length ? G.pick(c).id : null;
    };
    if (p.stamina < 35 || p.injury) return choose([ok('relax'), ok('clinic'), ok('hobby')]) || 'relax';
    const love = [...starts('date:'), ok('propose'), ...starts('confess:'), ok('family'), ok('kids'), ok('housework'), ...starts('see:')];
    const people = [ok('senpai'), ok('rival'), ok('kohai'), ok('friend'), ok('call_parents'), ok('coach')];
    const growth = [ok('selfpractice'), ok('study'), ok('gym'), ok('jt_senpai'), ok('jt_rival'), ok('jt_kohai')];
    const rest = [ok('relax'), ok('hobby'), ok('clinic'), ok('movie'), ok('cafe')];
    const fun = [ok('hobby'), ok('cafe'), ok('movie'), ok('shopping'), ok('travel'), ok('homecoming'), ok('fanservice'), ok('sns')];
    const groups = { love, people, growth, rest };
    if (plan.priv !== 'smart') return choose(groups[plan.priv]) || choose(fun) || 'relax';
    // おまかせ：今の暮らしに合わせて
    const w = [];
    if (love.some(Boolean)) w.push([love, G.spouse(s) || G.partner(s) ? 4 : 2]);
    if (growth.some((a) => a && a.id.startsWith('jt_'))) w.push([growth.filter((a) => a && a.id.startsWith('jt_')), 4]);
    w.push([people, 3], [fun, 3], [growth, 1.5], [rest, p.stamina < 55 ? 3 : 1]);
    for (let i = 0; i < 4; i++) {
      const g = G.weighted(w.map(([list, weight]) => ({ list, weight })));
      const id = choose(g.list);
      if (id) return id;
    }
    return 'relax';
  };

  // ---------- 経験点を自動で能力アップに ----------
  G.autoRaise = (s) => {
    const p = s.player;
    let n = 0;
    const pit = G.isPitcher(p);
    const weight = pit
      ? { velocity: 6, control: 8, stamina: p.role === 'SP' ? 6 : 0 }
      : p.position === 'C'
        ? { contact: 6, power: 4, fielding: 6, catching: 6, arm: 4, speed: 0 }
        : { contact: 8, power: 6, fielding: 4, speed: 3, arm: 1, catching: 1 };
    const val = (id) => (pit ? (id === 'velocity' ? (p.pitcher.velocity - 125) * 2.2 : p.pitcher[id]) : p.batter[id]);
    for (let guard = 0; guard < 300; guard++) {
      const cands = Object.keys(weight)
        .map((id) => ({ id, score: val(id) - weight[id] }))
        .sort((a, b) => a.score - b.score);
      let done = false;
      for (const c of cands) {
        if (G.raiseAbility(p, c.id)) {
          n++;
          done = true;
          break;
        }
      }
      if (pit && !done) {
        const pt = p.pitcher.pitches.slice().sort((a, b) => a.level - b.level)[0];
        if (pt && pt.level < 5 && G.raisePitch(p, pt.id)) {
          n++;
          done = true;
        }
      }
      if (!done) break;
    }
    return n;
  };

  // ---------- 進める先 ----------
  G.autoTargets = (s) => {
    const c = G.cal(s.year);
    const list = s.after
      ? [
          { w: c.startW, name: '開幕' },
          { w: c.endW + 1, name: 'シーズン終了' },
        ]
      : [
          { w: c.campW, name: 'キャンプイン' },
          { w: c.openW, name: 'オープン戦' },
          { w: c.startW, name: '開幕' },
          { w: c.allstarW + 1, name: 'オールスター明け' },
          { w: c.endW + 1, name: 'シーズン終了' },
          { w: c.contractW + 1, name: '契約更改' },
        ];
    const next = list.find((x) => x.w > s.week) || { w: 53, name: '新年' };
    return [
      { id: 'w4', name: '4週間', y: null, w: null, weeks: 4 },
      { id: 'next', name: `次の節目（${next.name}）まで`, y: s.year, w: next.w },
      { id: 'season', name: s.week <= c.endW ? 'シーズン終了まで' : '来季のシーズン終了まで', y: s.week <= c.endW ? s.year : s.year + 1, w: s.week <= c.endW ? c.endW + 1 : G.cal(s.year + 1).endW + 1 },
      { id: 'year', name: '年末まで', y: s.year, w: 53 },
    ];
  };

  const reached = (s, t, weeks) => {
    if (t.weeks) return weeks >= t.weeks;
    const cur = s.year * 100 + s.week;
    const goal = t.w >= 53 ? (t.y + 1) * 100 + 1 : t.y * 100 + t.w;
    return cur >= goal;
  };

  // 選択が必要な出来事・ケガ・引退などで止まる。お知らせ（info）は集めて最後にまとめて見せる
  G.autoAdvance = (s, targetId) => {
    const t = G.autoTargets(s).find((x) => x.id === targetId) || G.autoTargets(s)[0];
    const plan = G.autoPlan(s);
    const p = s.player;
    const before = { year: s.year, week: s.week, money: p.money, bat: { ...s.stats.bat }, pit: { ...s.stats.pit }, ach: Object.keys(s.ach || {}).length, team: { ...(s.standings[p.teamId] || {}) } };
    const prevMode = s.flags.gameMode;
    s.flags.gameMode = 'auto';
    const events = [];
    let weeks = 0;
    let raised = 0;
    let stop = null;
    const injured0 = !!p.injury;
    const collect = () => {
      while (s.queue.length && s.queue[0].kind === 'info') {
        const q = s.queue[0];
        events.push({ y: s.year, w: s.week, title: q.title, text: q.text, big: q.big || null });
        G.dismissScene(s);
      }
    };
    for (let guard = 0; guard < 200; guard++) {
      collect();
      if (s.queue.length && plan.choose && !G.isBigChoice(s.queue[0])) {
        const c = autoChoose(s, s.queue[0]);
        const res = s.queue[0] && s.queue[0].kind === 'info' ? s.queue[0] : null;
        events.push({ y: s.year, w: s.week, title: `${c.title}（「${c.label}」を選んだ）`, text: res ? res.text : '', big: null, auto: true });
        if (res) G.dismissScene(s);
        continue;
      }
      if (s.queue.length) {
        stop = s.queue[0].title;
        break;
      }
      if (s.ended || s.retired && !s.after) {
        stop = '引退';
        break;
      }
      if (reached(s, t, weeks)) break;
      if (s.gw) G.autoRestGames(s);
      else if (s.after) {
        const works = G.afterWorks(s).filter((x) => x.ok);
        G.doAfterWeek(s, G.pick(works).id, pickPrivate(s, plan));
      } else G.doAction(s, pickTraining(s, plan), pickPrivate(s, plan));
      weeks++;
      if (plan.raise && !s.after) raised += G.autoRaise(s);
      if (!injured0 && p.injury && p.injury.weeks >= 3) {
        collect();
        stop = `ケガ（${p.injury.name}）`;
        break;
      }
    }
    collect();
    s.flags.gameMode = prevMode;
    const after = s.standings[p.teamId] || {};
    return {
      weeks,
      target: t.name,
      stop,
      events,
      raised,
      money: p.money - before.money,
      ach: Object.keys(s.ach || {}).length - before.ach,
      from: { year: before.year, week: before.week },
      to: { year: s.year, week: s.week },
      sameYear: before.year === s.year,
      bat: before.year === s.year ? diffStats(s.stats.bat, before.bat) : null,
      pit: before.year === s.year ? diffStats(s.stats.pit, before.pit) : null,
      team: before.year === s.year && after.w !== undefined ? { w: after.w - (before.team.w || 0), l: after.l - (before.team.l || 0), d: after.d - (before.team.d || 0) } : null,
    };
  };

  function diffStats(a, b) {
    const d = {};
    for (const k in a) d[k] = (a[k] || 0) - (b[k] || 0);
    return d;
  }
})();
