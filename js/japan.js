// 侍ジャパン（日本代表チームの人間模様）
// ・代表の常連たち（年をとり、入れ替わりながら続いていく）と、監督・コーチ陣
// ・選ばれると宮崎合宿 → 壮行試合 → 強化試合 → 本大会。合宿中は代表の仲間や首脳陣と話せる
// ・合宿と強化試合での「首脳陣の評価」で、本番の役割（スタメン・控え・抑えなど）が決まる
// ・仲良くなった代表仲間は人間関係に加わり、大会のあとも付き合いが続く
// ・大会の前の年の11月には「侍ジャパンシリーズ」（若手中心の強化試合）がある
(function () {
  const G = window.G;

  G.JP_SERIES_NAME = '侍ジャパンシリーズ';
  G.JP_TALKS_PER_WEEK = 3;

  // ---------- 監督のタイプ ----------
  G.JP_STYLES = [
    {
      id: 'trust',
      name: '信頼の人',
      desc: '選んだ選手を最後まで信じる。実績を重く見る',
      w: { record: 1.4, camp: 0.7 },
      speech: '「ここにいる全員が、日本で一番の選手だ。だから俺は、最後まで君たちを信じる」',
      final: '「誰が打てなくても、誰が打たれても、責めるやつはいない。全員で取りに行こう」',
      bye: '「君たちと戦えたことを、一生の誇りにする。ありがとう」',
    },
    {
      id: 'merit',
      name: '実力主義',
      desc: '合宿と強化試合の結果で起用を決める',
      w: { record: 0.6, camp: 1.5 },
      speech: '「名前で野球はしない。宮崎での動き、強化試合の結果。それだけで決める」',
      final: '「ここまで来たのは、結果を出し続けてきたからだ。最後も結果で示そう」',
      bye: '「厳しいことも言った。でも、全員が結果で応えてくれた。最高のチームだった」',
    },
    {
      id: 'data',
      name: 'データ重視',
      desc: '相手との相性やデータをもとに起用する',
      w: { record: 1, camp: 1 },
      speech: '「相手の投手、打者のデータは全部そろえてある。準備で負けることは絶対にない」',
      final: '「準備は終わっている。あとは、データを超えるプレーを見せてくれ」',
      bye: '「数字には残らない、いいチームだった。ありがとう」',
    },
    {
      id: 'heart',
      name: '熱血漢',
      desc: '気持ちを前に出す選手を好む',
      w: { record: 0.9, camp: 1.2 },
      speech: '「日の丸を背負うってのは、日本中の野球少年の夢を背負うってことだ。腹をくくれ！」',
      final: '「憧れるのは今日でやめよう。勝つことだけ考えるぞ！」',
      bye: '「泣くな！…いや、今日は泣いていい。最高だったぞ、お前たち！」',
    },
  ];
  G.jpStyle = (s) => G.JP_STYLES.find((x) => x.id === s.japan.staff.manager.style);

  const COACH_ROLES = [
    { key: 'head', name: 'ヘッドコーチ', exp: { mind: 10, technique: 4 }, for: 'A' },
    { key: 'pitch', name: '投手コーチ', exp: { technique: 8, breaking: 8 }, for: 'P' },
    { key: 'bat', name: '打撃コーチ', exp: { technique: 10, muscle: 6 }, for: 'B' },
    { key: 'field', name: '内野守備・走塁コーチ', exp: { agility: 10, technique: 4 }, for: 'B' },
  ];

  const POS_GROUPS = [
    { id: 'P', name: '投手', pos: ['P'] },
    { id: 'C', name: '捕手', pos: ['C'] },
    { id: 'IF', name: '内野手', pos: ['1B', '2B', '3B', 'SS'] },
    { id: 'OF', name: '外野手', pos: ['OF'] },
  ];
  G.JP_POS_GROUPS = POS_GROUPS;
  const groupOf = (pos) => POS_GROUPS.find((g) => g.pos.includes(pos)).id;
  // 代表常連の候補（ポジション別の人数）
  const POOL_PLAN = [['P', 'SP', 9], ['P', 'RP', 8], ['P', 'CL', 3], ['C', null, 4], ['1B', null, 2], ['2B', null, 3], ['3B', null, 3], ['SS', null, 3], ['OF', null, 9]];

  // ---------- 代表常連と首脳陣をつくる ----------
  const usedNames = (s) => {
    const set = new Set([s.player.name]);
    if (s.japan) {
      for (const x of s.japan.pool) set.add(x.name);
      if (s.japan.staff) for (const x of [s.japan.staff.manager, ...s.japan.staff.coaches]) set.add(x.name);
    }
    for (const x of Object.values(s.people || {})) set.add(x.name);
    return set;
  };
  const newName = (s) => {
    const used = usedNames(s);
    for (let i = 0; i < 30; i++) {
      const n = G.randomMaleName();
      if (!used.has(n)) return n;
    }
    return G.randomMaleName();
  };
  const otherNpbTeam = (s) => G.pick(G.NPB_TEAMS().filter((t) => t.id !== s.player.teamId)).id;

  const genMember = (s, pos, prole, opts = {}) => {
    const age = opts.age !== undefined ? opts.age : G.ri(23, 33);
    const mlb = !!opts.mlb;
    const m = {
      id: `jp${s.japan.nextId++}`,
      name: newName(s),
      pos,
      prole,
      hand: G.chance(0.3) ? 'L' : 'R',
      age,
      rating: G.clamp(Math.round(G.gauss(opts.rating || 74, 5)) + (mlb ? 4 : 0), 64, 94),
      team: mlb ? G.pick(G.MLB_TEAMS).id : otherNpbTeam(s),
      mlb,
      persona: G.pick(G.PERSONAS).id,
      aff: G.ri(0, 8),
      talks: 0,
      caps: opts.caps || 0,
      withYou: [],
    };
    return m;
  };

  const genStaffMember = (s, key, roleName) => {
    const team = G.pick(G.NPB_TEAMS());
    const pos = G.pick(['投手', '捕手', '内野手', '外野手']);
    const feats = ['首位打者', '本塁打王', '最多勝', 'ゴールデングラブ', '盗塁王', '最優秀防御率', 'MVP', '新人王'];
    return {
      key,
      role: roleName,
      name: newName(s),
      age: key === 'manager' ? G.ri(48, 62) : G.ri(40, 58),
      bio: `元${team.short}の${pos}。${G.pick(feats)}${G.chance(0.4) ? `、${G.pick(feats)}` : ''}の実績を持つ`,
      aff: G.ri(0, 6),
      talks: 0,
    };
  };

  const genStaff = (s, cycle) => {
    const manager = genStaffMember(s, 'manager', '監督');
    manager.style = G.pick(G.JP_STYLES).id;
    s.japan.staff = { cycle, since: s.year, manager, coaches: [] };
    s.japan.staff.coaches = COACH_ROLES.map((c) => ({ ...genStaffMember(s, c.key, c.name) }));
  };

  const nextIntlYear = (year) => {
    let y = year;
    while (!G.isIntlYear(y)) y++;
    return y;
  };

  G.ensureJapan = (s) => {
    if (s.japan) return s.japan;
    s.japan = { pool: [], poolYear: s.year, nextId: 1, trust: null, everCalled: false, staff: null };
    genStaff(s, nextIntlYear(s.year));
    for (const [pos, prole, n] of POOL_PLAN) {
      for (let i = 0; i < n; i++) s.japan.pool.push(genMember(s, pos, prole));
    }
    // 何人かはメジャーでプレーしている
    const cand = G.shuffle(s.japan.pool.filter((x) => x.age >= 26 && x.rating >= 74));
    for (const x of cand.slice(0, 5)) {
      x.mlb = true;
      x.rating = Math.min(94, x.rating + 3);
      x.team = G.pick(G.MLB_TEAMS).id;
    }
    G.emit('japan:init', s, s.japan); // 実在の代表選手データなどで差し替えられる
    return s.japan;
  };

  // 年月がたった分だけ、常連たちも年をとり、入れ替わる
  const updatePool = (s) => {
    const J = s.japan;
    const years = s.year - J.poolYear;
    for (let i = 0; i < years; i++) {
      for (const x of J.pool) {
        x.age++;
        x.rating = G.clamp(x.rating + (x.age <= 26 ? G.ri(0, 3) : x.age <= 30 ? G.ri(-1, 2) : x.age <= 33 ? G.ri(-2, 1) : G.ri(-4, 0)), 50, 95);
        if (!x.mlb && x.age >= 26 && x.age <= 31 && x.rating >= 80 && G.chance(0.12)) {
          x.mlb = true;
          x.team = G.pick(G.MLB_TEAMS).id;
        }
      }
      J.pool = J.pool.filter((x) => {
        const out = x.age >= 38 || x.rating < 62 || (x.age >= 35 && G.chance(0.3));
        if (out) {
          const pr = s.people[`jp_${x.id}`];
          if (pr && !/引退/.test(pr.role)) pr.role = `${pr.role.replace(/）$/, '')}・引退）`;
        }
        return !out;
      });
      // 新しい世代が出てくる
      for (const [pos, prole, n] of POOL_PLAN) {
        const have = J.pool.filter((x) => x.pos === pos && (x.prole || null) === prole).length;
        for (let k = have; k < n; k++) J.pool.push(genMember(s, pos, prole, { age: G.ri(21, 25), rating: 72 }));
      }
    }
    // 自分と同じ球団の選手はいない（チームの名簿と食い違わないように）。名簿にいる選手は名簿の側から選ばれる
    const onRoster = (x) => !!(s.roster && s.roster.teamId === s.player.teamId && s.roster.players.some((m) => m.name === x.name));
    for (const x of J.pool) if (!x.mlb && x.team === s.player.teamId && !onRoster(x)) x.team = otherNpbTeam(s);
    J.poolYear = s.year;
  };

  // ---------- メンバーの情報 ----------
  const lastLine = (x) => {
    const r = x.rating;
    if (x.pos === 'P') {
      const era = G.clamp(3.6 - (r - 64) * 0.07 + G.gauss(0, 0.25), 0.9, 4.2);
      if (x.prole === 'SP') return `${G.clamp(Math.round(6 + (r - 64) * 0.35 + G.gauss(0, 2)), 5, 20)}勝 防御率${era.toFixed(2)}`;
      if (x.prole === 'CL') return `${G.clamp(Math.round(18 + (r - 64) * 0.9 + G.gauss(0, 5)), 10, 48)}セーブ 防御率${era.toFixed(2)}`;
      return `${G.ri(45, 62)}登板 ${G.ri(15, 40)}ホールド 防御率${era.toFixed(2)}`;
    }
    const avg = G.clamp(0.25 + (r - 64) * 0.0028 + G.gauss(0, 0.012), 0.23, 0.345);
    const hr = G.clamp(Math.round(8 + (r - 64) * 0.9 + G.gauss(0, 6)), 1, 50);
    return `打率${avg.toFixed(3).replace(/^0/, '')} ${hr}本塁打`;
  };

  // 合宿に呼ばれる顔ぶれ（ライバルやチームメイトが選ばれることも）
  const guestMembers = (s, type) => {
    const p = s.player;
    const out = [];
    const rv = s.draft && s.draft.picks.find((d) => d.id === s.draft.rivalId);
    const rp = s.people.rival;
    if (rv && rp && !rp.retired && !rv.retired && rv.rating >= 67 && !(type === 'series' && rv.mlb)) {
      out.push({
        id: 'g_rival', name: rp.name, pos: rv.pos, prole: rv.pos === 'P' ? (rv.rating >= 75 ? 'SP' : 'RP') : null, hand: 'R', age: p.age,
        rating: Math.round(rv.rating), team: rv.teamId, mlb: !!rv.mlb, persona: rp.persona || 'serious', pid: 'rival', aff: rp.aff, talks: 0, caps: 0, withYou: [],
      });
    }
    const R = s.roster;
    if (R && R.teamId === p.teamId && !G.isMLB(s)) {
      const strong = R.players.filter((m) => m.rating >= 72 && m.tag !== 'rival' && m.age <= 36).sort((a, b) => b.rating - a.rating).slice(0, 2);
      for (const m of strong) {
        const info = G.mateInfo(s, m);
        out.push({
          id: `g_tm${m.id}`, name: m.name, pos: m.pos, prole: m.pos === 'P' ? (m.role === 'SP' ? 'SP' : m.role === 'CL' ? 'CL' : 'RP') : null, hand: 'R', age: m.age,
          rating: m.rating, team: p.teamId, mlb: false, persona: info.persona.id, pid: info.pid, rosterId: m.id, aff: info.aff, talks: 0, caps: 0, withYou: [],
        });
      }
    }
    return out;
  };

  const formSquad = (s, type) => {
    const J = G.ensureJapan(s);
    updatePool(s);
    const p = s.player;
    const plan = type === 'series' ? { P: 13, C: 3, IF: 7, OF: 5 } : { P: 15, C: 3, IF: 7, OF: 5 }; // 自分を含めた人数（本大会は30人）
    plan[groupOf(p.position)]--;
    const guests = guestMembers(s, type);
    for (const g of guests) plan[groupOf(g.pos)]--;
    const score = (x) => x.rating + G.gauss(0, 2) + (type === 'series' ? (x.age <= 27 ? 4 : 0) - (x.age >= 31 ? 8 : 0) : 0);
    const ids = [];
    const rosterNames = new Set(s.roster && s.roster.teamId === p.teamId ? s.roster.players.map((m) => m.name) : []);
    for (const grp of POS_GROUPS) {
      let cands = J.pool.filter((x) => grp.pos.includes(x.pos) && !(type === 'series' && x.mlb) && !rosterNames.has(x.name) && !guests.some((g) => g.name === x.name));
      cands = cands.map((x) => ({ x, sc: score(x) })).sort((a, b) => b.sc - a.sc).map((o) => o.x);
      let pick = [];
      if (grp.id === 'P') {
        const sp = cands.filter((x) => x.prole === 'SP').slice(0, 5);
        pick = [...sp, ...cands.filter((x) => !sp.includes(x))].slice(0, Math.max(0, plan.P));
      } else pick = cands.slice(0, Math.max(0, plan[grp.id]));
      ids.push(...pick.map((x) => x.id));
    }
    for (const x of J.pool) if (ids.includes(x.id)) x.last = lastLine(x);
    for (const g of guests) g.last = lastLine(g);
    return { squad: ids, guests };
  };

  G.jpSquad = (s) => {
    const t = s.intl;
    if (!t || !t.squad) return [];
    const pool = s.japan.pool;
    return [...t.squad.map((id) => pool.find((x) => x.id === id)).filter(Boolean), ...(t.guests || [])];
  };
  G.jpMember = (s, id) => G.jpSquad(s).find((x) => x.id === id);
  G.jpTeamName = (x, full = true) => {
    const t = G.teamById(x.team);
    if (!t) return '';
    if (!x.mlb) return t.short;
    return full ? t.name : `MLB・${t.short}`;
  };
  G.jpPosName = (x) => (x.pos === 'P' ? { SP: '先発', RP: '中継ぎ', CL: '抑え' }[x.prole] || '投手' : G.posById(x.pos).name);

  // 仲（ライバルやチームメイトは、もともとの人間関係とつながっている）
  const personOf = (s, x) => {
    const pid = x.pid || (s.people[`jp_${x.id}`] ? `jp_${x.id}` : null) || (x.rosterId !== undefined && s.people[`tm_${x.rosterId}`] ? `tm_${x.rosterId}` : null);
    return pid ? s.people[pid] : null;
  };
  G.jpAff = (s, x) => {
    const pr = personOf(s, x);
    return pr ? pr.aff : x.aff || 0;
  };
  G.jpIsFriend = (s, x) => !!personOf(s, x);
  const addAff = (s, x, d) => {
    const pr = personOf(s, x);
    if (pr) {
      pr.aff = G.clamp(pr.aff + d, 0, 100);
      return pr.aff;
    }
    x.aff = G.clamp((x.aff || 0) + d, 0, 100);
    if (x.rosterId !== undefined && s.roster) {
      const m = s.roster.players.find((y) => y.id === x.rosterId);
      if (m) m.aff = x.aff;
    }
    return x.aff;
  };

  G.jpFriends = (s) => Object.values(s.people).filter((x) => x.group === 'japan');
  G.jpFriendCap = (s) => {
    const p = s.player;
    return 2 + (p.skills.includes('mood') ? 1 : 0) + ((s.flags.japanCount || 0) + (s.flags.seriesCount || 0) >= 2 ? 1 : 0) + (p.popularity >= 60 ? 1 : 0);
  };

  // 仲が深まったら人間関係に加える（チームメイトなら「仲良くなったチームメイト」へ）
  const befriend = (s, x) => {
    const fam = x.name.split(' ')[0];
    if (x.rosterId !== undefined) {
      if (G.mateFriends(s).length >= G.friendCap(s)) {
        x.aff = G.FRIEND_AFF - 1;
        return `\n（もっと仲良くなれそうだが、今は付き合いきれない。親しくできるチームメイトは${G.friendCap(s)}人まで）`;
      }
      const pid = `tm_${x.rosterId}`;
      s.people[pid] = { id: pid, name: x.name, role: `チームメイト（${G.posById(x.pos).name}）`, group: 'mate', aff: x.aff, met: true, mateId: x.rosterId, persona: x.persona, since: s.year };
    } else {
      if (G.jpFriends(s).length >= G.jpFriendCap(s)) {
        x.aff = G.FRIEND_AFF - 1;
        return `\n（もっと仲良くなれそうだが、代表で親しくできる仲間は${G.jpFriendCap(s)}人まで）`;
      }
      const pid = `jp_${x.id}`;
      s.people[pid] = { id: pid, name: x.name, role: `侍ジャパンの仲間（${G.jpTeamName(x)}・${G.jpPosName(x)}）`, group: 'japan', aff: x.aff, met: true, jpId: x.id, persona: x.persona, since: s.year };
    }
    s.flags.jpFriendsMade = (s.flags.jpFriendsMade || 0) + 1;
    s.history.push({ year: s.year, text: `侍ジャパンで${x.name}（${G.jpTeamName(x)}）と打ち解ける` });
    G.log(s, `🤝 侍ジャパンで${x.name}と打ち解けた（人間関係に追加）`, 'good', 'life', true);
    G.buzz(s, 'jpcamp', { name: fam });
    return `\n\n${fam}とすっかり打ち解けた！（人間関係に追加された）`;
  };

  // ---------- 代表に参加している週か ----------
  G.onJapanDuty = (s) => {
    const t = s.intl;
    if (!t || !t.accepted || !t.squad || t.year !== s.year || s.retired || s.after) return false;
    if (t.type === 'series') return s.week === G.seriesWeek(s.year);
    const d = G.intlDates(s.year);
    return s.week >= d.campW && s.week <= d.finalW;
  };
  G.jpPhase = (s) => {
    const t = s.intl;
    if (!t) return null;
    if (t.type === 'series') return { id: 'series', name: G.JP_SERIES_NAME, place: '東京ドーム' };
    const d = G.intlDates(t.year);
    const w = s.week;
    if (s.year === t.year && w < d.campW) return { id: 'wait', name: '合宿前', place: '' };
    if (w < d.exhibitW) return { id: 'camp', name: '宮崎合宿', place: '宮崎' };
    if (w < d.poolW) return { id: 'exhibit', name: '強化試合', place: '名古屋・大阪' };
    if (w < d.sfW) return { id: 'tour', name: w === d.poolW ? '1次ラウンド' : '準々決勝', place: '東京ドーム' };
    return { id: 'tour', name: '準決勝・決勝', place: 'マイアミ' };
  };

  // ---------- 首脳陣の評価 ----------
  const addEval = (s, d, why) => {
    const t = s.intl;
    if (!t || !d) return '';
    const before = t.eval;
    t.eval = G.clamp(t.eval + d, 0, 100);
    s.flags.jpEvalMax = Math.max(s.flags.jpEvalMax || 0, Math.round(t.eval));
    const diff = Math.round((t.eval - before) * 10) / 10;
    if (!diff) return '';
    return `（首脳陣の評価${diff > 0 ? '+' : ''}${diff}${why ? `：${why}` : ''}）`;
  };
  G.jpEvalLabel = (v) => (v >= 80 ? '中心選手として期待されている' : v >= 60 ? '高く評価されている' : v >= 40 ? 'まずまずの評価' : v >= 25 ? 'まだ様子を見られている' : '厳しい目で見られている');

  // ---------- 代表の練習メニュー（代表にいる週は、いつもの練習の代わりにこちら） ----------
  const onDuty = (s) => G.onJapanDuty(s);
  G.TRAININGS.push(
    { id: 'jp_team', name: '代表の全体練習', for: 'A', japan: true, cond: onDuty, gain: { muscle: 7, agility: 6, technique: 8, mind: 6 }, stamina: 10, desc: '代表メニューをこなす。首脳陣の評価が少し上がる' },
    { id: 'jp_appeal', name: '首脳陣にアピール', for: 'A', japan: true, cond: onDuty, gain: { muscle: 9, technique: 10, mind: 4 }, stamina: 18, risky: true, desc: '特打・投げ込みで猛アピール。評価が大きく上がるがケガに注意' },
    { id: 'jp_watch', name: '一流の技を盗む', for: 'A', japan: true, cond: onDuty, gain: { technique: 10, mind: 8 }, stamina: 6, desc: '代表選手の練習を観察。技術・精神と代表仲間との仲' },
    { id: 'jp_tune', name: '本番に向けて調整', for: 'A', japan: true, cond: onDuty, gain: { technique: 4, mind: 6 }, stamina: -6, desc: '疲れを抜いて調子を上げる' },
  );
  G.on('trainingOptions', (acts, s) => (onDuty(s) ? acts.filter((a) => a.japan || a.rest || (s.player.injury && (a.id === 'rehab' || a.id === 'mental'))) : acts));
  G.on('trainingDone', (msg, s, t) => {
    if (!t.japan || !s.intl) return msg;
    const st = G.jpStyle(s);
    if (t.id === 'jp_team') return msg + addEval(s, 1.5 * st.w.camp);
    if (t.id === 'jp_appeal') return msg + addEval(s, (st.id === 'heart' ? 5 : 3.5) * st.w.camp, st.id === 'heart' ? '監督が目を細めていた' : '');
    if (t.id === 'jp_watch') {
      const x = G.pick(G.jpSquad(s).filter((m) => !(m.mlb && !s.intl.mlbJoined)));
      if (!x) return msg;
      addAff(s, x, 2);
      return `${msg}\n${x.name.split(' ')[0]}（${G.jpTeamName(x)}）の練習を間近で見せてもらった。（${x.name.split(' ')[0]}との仲+2）` + addEval(s, 0.8);
    }
    if (t.id === 'jp_tune') {
      if (G.chance(0.5)) msg += G.applyFx(s, { cond: 1 });
      return msg + addEval(s, 0.5);
    }
    return msg;
  });
  // 代表にいる間は、所属球団のオープン戦には出ない
  G.on('openGames', (s) => onDuty(s));

  // ---------- 代表の仲間と話す ----------
  G.JP_TOPICS = [
    ...G.TALK_TOPICS,
    { id: 'tech', name: '技術を教わる', desc: '一流の技を教えてもらう（仲20以上）', minAff: 20 },
    { id: 'mlb', name: 'メジャーの話を聞く', desc: 'メジャーでプレーする選手だけ', mlbOnly: true },
  ];

  G.jpCanTalk = (s, x, topicId) => {
    if (!onDuty(s)) return '代表の活動中だけ';
    const t = G.JP_TOPICS.find((y) => y.id === topicId);
    const w = G.absWeek(s);
    const it = s.intl;
    if (x.mlb && !it.mlbJoined && it.type !== 'series') return 'まだチームに合流していない';
    const used = it.talkW === w ? it.talkN || 0 : 0;
    if (used >= G.JP_TALKS_PER_WEEK) return `今週はもう話した（週${G.JP_TALKS_PER_WEEK}回まで）`;
    if (x.talkW === w) return 'さっき話したばかり';
    if (t.mlbOnly && !x.mlb) return 'メジャーの選手ではない';
    if (t.minAff && G.jpAff(s, x) < t.minAff) return `仲${t.minAff}以上で${t.id === 'meal' ? '誘える' : '頼める'}`;
    if (t.cost && s.player.money < t.cost) return 'お金が足りない';
    return '';
  };

  const JP_LINES = {
    good: {
      baseball: (n, x) => `${n}は目を輝かせて話に乗ってきた。${x.pos === 'P' ? '「代表のブルペン、みんなえげつない球を投げるよな。でも負けてられない」' : '「代表の打線、みんなスイングの音が違うよな。でも負けてられない」'}`,
      hobby: (n) => `${n}と趣味の話で盛り上がった。「宮崎にいる間に、一緒に行こうぜ！」`,
      joke: (n) => `${n}が吹き出した。「お前、テレビで見るより全然おもしろいな！」`,
      meal: (n) => `${n}と宮崎名物の地鶏を食べに行った。所属チームの話、家族の話。気づけば閉店まで話し込んでいた。`,
      tech: (n) => `${n}は惜しみなく教えてくれた。「ここだけの話な。俺はこう考えてる」\n一流の感覚に触れて、目からウロコが落ちた。`,
      mlb: (n) => `${n}はメジャーの話をたっぷり聞かせてくれた。移動の大変さ、ロッカールームの雰囲気、言葉のこと。「来るなら、いつでも相談に乗るよ」`,
    },
    ok: {
      baseball: (n) => `${n}と野球の話をした。普段は敵同士だけど、話してみると気が合う。`,
      hobby: (n) => `${n}と少し趣味の話をした。`,
      joke: (n) => `${n}は小さく笑ってくれた。`,
      meal: (n) => `${n}と食事に行った。会話はぼちぼちだった。`,
      tech: (n) => `${n}にコツを聞いた。「感覚的なものだからなあ」と言いつつ、少しだけ教えてくれた。`,
      mlb: (n) => `${n}にメジャーの話を聞いた。「まあ、行ってみないとわからないよ」`,
    },
    bad: {
      baseball: (n) => `${n}は「…今は自分の調整で精いっぱいでさ」と言って離れていった。`,
      hobby: (n) => `${n}は「へえ」と言ったきり、スマホに目を落とした。`,
      joke: (n) => `${n}は真顔のまま。代表の空気の中で、盛大にすべった…。`,
      meal: (n) => `${n}は「ごめん、今日はトレーナーとの約束が」と断った。`,
      tech: (n) => `${n}は「それは自分で見つけるものだよ」とだけ言った。`,
      mlb: (n) => `${n}は「その話は大会が終わってからにしよう」とそっけなかった。`,
    },
  };

  G.jpTalk = (s, x, topicId) => {
    const why = G.jpCanTalk(s, x, topicId);
    if (why) return { ok: false, text: why };
    const p = s.player;
    const it = s.intl;
    const t = G.JP_TOPICS.find((y) => y.id === topicId);
    const per = G.personaById(x.persona);
    const w = G.absWeek(s);
    it.talkN = it.talkW === w ? (it.talkN || 0) + 1 : 1;
    it.talkW = w;
    x.talkW = w;
    x.talks = (x.talks || 0) + 1;
    if (t.cost) p.money -= t.cost;
    const baseTopic = topicId === 'tech' || topicId === 'mlb' ? 'baseball' : topicId;
    const liked = per.likes.includes(baseTopic) || (topicId === 'mlb' && per.id !== 'cool');
    const disliked = per.dislikes.includes(baseTopic) && topicId !== 'mlb';
    let d = liked ? G.ri(6, 10) : disliked ? -G.ri(0, 4) : G.ri(2, 5);
    if (topicId === 'meal' && !disliked) d += 2;
    if (topicId === 'tech') d = Math.round(d * 0.5);
    if (d > 0) {
      d *= per.mul;
      if (x.withYou && x.withYou.length) d *= 1.2; // 前にも一緒に戦った仲
      if (Math.abs(x.age - p.age) >= 8 && per.id !== 'caring') d *= 0.8;
    }
    d = Math.round(d);
    const n = x.name.split(' ')[0];
    const tone = liked ? 'good' : disliked ? 'bad' : 'ok';
    let text = JP_LINES[tone][topicId](n, x);
    if (x.talks === 2 && !personOf(s, x)) text += `\n（${n}は「${per.name}」な性格のようだ。${per.hint}）`;
    // 技術を教わる：自分より格上の相手ほど学べる
    if (topicId === 'tech') {
      const sameSide = (x.pos === 'P') === G.isPitcher(p);
      const k = (tone === 'bad' ? 0.3 : tone === 'ok' ? 0.7 : 1) * (sameSide ? 1 : 0.5) * G.clamp((x.rating - 60) / 20, 0.4, 1.5);
      const exp = G.isPitcher(p) ? { technique: 12 * k, breaking: 8 * k, mind: 4 * k } : { technique: 14 * k, muscle: 6 * k, mind: 4 * k };
      text += G.applyFx(s, { exp });
      if (!sameSide) text += '\n（投手と野手では勝手が違う。それでも学ぶことはあった）';
    }
    if (topicId === 'mlb' && tone !== 'bad') {
      s.flags.mlbAdvice = (s.flags.mlbAdvice || 0) + 1;
      text += G.applyFx(s, { exp: { mind: 6 } });
      if (s.flags.mlbAdvice === 1) text += '\n（メジャーに挑戦したとき、早くなじめそうだ）';
    }
    let joined = '';
    const before = G.jpAff(s, x);
    const after = addAff(s, x, d);
    if (!personOf(s, x) && after >= G.FRIEND_AFF && before < G.FRIEND_AFF) joined = befriend(s, x);
    if (d > 0) G.addHappy(s, 1);
    s.story.jpTalks = (s.story.jpTalks || 0) + 1;
    return { ok: true, tone, d, text: text + `（仲${d >= 0 ? '+' : ''}${d}）` + joined };
  };

  // ---------- 首脳陣と話す ----------
  G.jpStaffList = (s) => (s.japan && s.japan.staff ? [s.japan.staff.manager, ...s.japan.staff.coaches] : []);
  G.jpStaffTopics = (s, st) =>
    st.key === 'manager'
      ? [
          { id: 'role', name: '起用について聞く', desc: '自分の役割と、期待されていること' },
          { id: 'resolve', name: '意気込みを伝える', desc: '大会にかける思いをぶつける' },
          { id: 'data', name: '相手の分析を話し合う', desc: 'データや相性について' },
          { id: 'advice', name: 'アドバイスをもらう', desc: '大舞台での心構え' },
        ]
      : [
          { id: 'coach', name: '指導をお願いする', desc: COACH_ROLES.find((c) => c.key === st.key).for === 'A' ? 'だれでも教われる' : COACH_ROLES.find((c) => c.key === st.key).for === 'P' ? '投手向け' : '野手向け' },
          { id: 'chat', name: '雑談する', desc: '現役時代の話を聞く' },
        ];

  G.jpCanStaffTalk = (s, st) => {
    if (!onDuty(s)) return '代表の活動中だけ';
    const w = G.absWeek(s);
    const it = s.intl;
    it.staffW = it.staffW || {};
    if (it.staffW[st.key] === w) return '今週はもう話した';
    return '';
  };

  const ROLE_TALK = {
    cleanup: '「4番を任せるつもりでいる。チームの顔として、どっしり構えていてくれ」',
    starter: '「スタメンで使うつもりだ。持ち味をそのまま出してくれればいい」',
    bench: '「今のところは控えの予定だ。ただ、短期決戦は何が起きるかわからない。準備だけは怠るなよ」',
    SP: '「先発の一角として考えている。大事な試合を任せることになる」',
    RP: '「中継ぎで、試合の流れを変える場面を任せたい」',
    CL: '「最後の1イニングを任せる。日本の命運を背負ってもらうぞ」',
  };

  G.jpStaffTalk = (s, st, topicId) => {
    const why = G.jpCanStaffTalk(s, st);
    if (why) return { ok: false, text: why };
    const it = s.intl;
    const p = s.player;
    it.staffW[st.key] = G.absWeek(s);
    st.talks = (st.talks || 0) + 1;
    const fam = st.name.split(' ')[0];
    let text = '';
    let d = 0;
    if (st.key === 'manager') {
      const style = G.jpStyle(s);
      s.flags.jpManagerTalks = (s.flags.jpManagerTalks || 0) + 1;
      if (topicId === 'role') {
        text = `${fam}監督「${p.name.split(' ')[0]}か。」\n${ROLE_TALK[it.role]}\n\n（今の評価：${G.jpEvalLabel(it.eval)}）` + addEval(s, 1, '自分から聞きに来た姿勢');
        d = 2;
      } else if (topicId === 'resolve') {
        const k = { heart: 6, trust: 3, merit: 1.5, data: 1 }[style.id];
        text = `「この大会に、野球人生をかけるつもりで来ました」\n${fam}監督は${style.id === 'heart' ? '大きくうなずき、肩を力強くたたいた。「その言葉が聞きたかった！」' : style.id === 'merit' ? '「気持ちはわかった。あとはグラウンドで見せてくれ」と静かに言った。' : '「頼もしいな」と笑った。'}` + addEval(s, k);
        d = style.id === 'heart' ? 6 : 3;
      } else if (topicId === 'data') {
        const k = { data: 5, merit: 2, trust: 1, heart: 0.5 }[style.id];
        text = `相手チームの投手陣・打線のデータを一緒に見ながら話し合った。${style.id === 'data' ? `\n${fam}監督「よく研究しているな。そういう選手を待っていた」` : ''}` + G.applyFx(s, { exp: { technique: 6, mind: 6 } }) + addEval(s, k);
        d = style.id === 'data' ? 5 : 2;
      } else {
        text = `${fam}監督「大舞台では、いつも通りが一番難しい。だから準備でいつも通りを作るんだ」\n短い言葉の一つひとつが、胸に残った。` + G.applyFx(s, { exp: { mind: G.ri(10, 15) }, cond: G.chance(0.3) ? 1 : 0 });
        d = 4;
      }
    } else {
      const c = COACH_ROLES.find((x) => x.key === st.key);
      if (topicId === 'coach') {
        const match = c.for === 'A' || (c.for === 'P') === G.isPitcher(p);
        const exp = {};
        for (const k in c.exp) if (k !== 'breaking' || G.isPitcher(p)) exp[k] = c.exp[k] * (match ? 1 : 0.4);
        if (!Object.keys(exp).length) exp.technique = 4;
        text = match ? `${fam}${c.name.replace(/・.*$/, '')}にマンツーマンで見てもらった。代表のコーチの指摘は、驚くほど具体的だ。` : `${fam}コーチは専門外ながら、気づいたことを教えてくれた。`;
        text += G.applyFx(s, { exp });
        d = G.ri(4, 7);
      } else {
        text = `${fam}コーチに現役時代の話を聞いた。${G.pick(['伝説の日本シリーズの舞台裏', '若手のころに怒られた思い出', '国際大会で味わった悔しさ'])}の話に、すっかり引き込まれた。` + G.applyFx(s, { happy: 1 });
        d = G.ri(3, 6);
      }
    }
    st.aff = G.clamp((st.aff || 0) + d, 0, 100);
    text += `（${fam}${st.key === 'manager' ? '監督' : 'コーチ'}との仲+${d}）`;
    // コーチの信頼を得ると、監督に推してくれる
    if (st.key !== 'manager' && st.aff >= 40 && it.recommended !== st.key && !(it.recBy || []).includes(st.key)) {
      it.recBy = [...(it.recBy || []), st.key];
      text += `\n\n（${st.role}が、首脳陣のミーティングで推してくれたらしい）` + addEval(s, 4);
    }
    return { ok: true, text };
  };

  // ---------- 選考 ----------
  // 同じ監督なら、前回の評価が選考に響く
  G.jpSelectBonus = (s) => {
    const J = s.japan;
    if (!J || J.trust === null || J.trust === undefined) return 0;
    return (J.trust - 50) * 0.03;
  };
  G.jpInitEval = (s, score) => {
    const J = G.ensureJapan(s);
    const carry = J.trust === null || J.trust === undefined ? 0 : (J.trust - 50) * 0.3;
    return G.clamp(35 + (score - 3.6) * 6 * G.jpStyle(s).w.record + carry, 15, 85);
  };

  // 選ばれたら（intl.js から呼ばれる）
  G.on('intl:selected', (s, t) => {
    G.ensureJapan(s);
    const { squad, guests } = formSquad(s, t.type);
    t.squad = squad;
    t.guests = guests;
    t.eval = G.jpInitEval(s, t.score || 4);
    t.baseRole = t.role;
    const used = new Set();
    t.number = (() => {
      const fav = [17, 18, 16, 11, 14, 19, 22, 25, 31, 51, 55, 1, 2, 6, 7, 8, 9];
      return G.pick(fav.filter((n) => !used.has(n)));
    })();
    s.japan.everCalled = true;
  });
  // 名前の一覧（多いときは「ほか○人」）
  const nameList = (xs, max, withTeam) => {
    const names = xs.slice(0, max).map((x) => (withTeam ? `${x.name}（${G.jpTeamName(x)}）` : x.name));
    return names.join('、') + (xs.length > max ? `ほか${xs.length - max}人` : '');
  };
  G.jpSelectText = (s, t) => {
    const sq = G.jpSquad(s);
    // 知っている顔：ライバル・チームメイト・仲良くなった仲間・前にも一緒で話したことのある選手
    const known = sq
      .filter((x) => x.pid || x.rosterId !== undefined || G.jpIsFriend(s, x) || (x.withYou && x.withYou.length && G.jpAff(s, x) >= 15))
      .sort((a, b) => G.jpAff(s, b) - G.jpAff(s, a));
    const mlb = sq.filter((x) => x.mlb);
    const st = s.japan.staff.manager;
    let txt = `監督は${st.name}（${G.jpStyle(s).name}）。`;
    if (mlb.length) txt += `\nメジャーからは${mlb.slice(0, 3).map((x) => x.name).join('、')}${mlb.length > 3 ? 'ら' : ''}も参加する。`;
    if (known.length) txt += `\n知っている顔も：${nameList(known, 4, true)}`;
    return txt;
  };

  G.on('intl:accepted', (s, t) => {
    const sq = G.jpSquad(s);
    for (const x of sq) {
      if (!x.withYou) x.withYou = [];
    }
    if (t.type === 'series') s.flags.seriesCount = (s.flags.seriesCount || 0) + 1;
    s.flags.jpCamp = (s.flags.jpCamp || 0) + 1;
  });

  // ---------- 合宿・強化試合の出来事 ----------
  const capOf = (s) => G.jpSquad(s).filter((x) => !x.mlb).sort((a, b) => (b.caps || 0) - (a.caps || 0) || b.age - a.age)[0];
  const sameGroup = (s) => G.jpSquad(s).filter((x) => groupOf(x.pos) === groupOf(s.player.position));

  G.LIFE_SCENES.jp_camp1 = {
    choices: () => [
      {
        label: '自分から輪に入っていく',
        run: (s) => {
          const xs = G.shuffle(G.jpSquad(s).filter((x) => !x.mlb)).slice(0, 3);
          for (const x of xs) addAff(s, x, 4);
          return `休憩のたびに、自分から声をかけて回った。${xs.map((x) => x.name.split(' ')[0]).join('、')}と打ち解けるきっかけができた。（それぞれ仲+4）` + addEval(s, 1);
        },
      },
      {
        label: '同じポジションの選手にあいさつする',
        run: (s) => {
          const xs = sameGroup(s).filter((x) => !x.mlb).slice(0, 4);
          for (const x of xs) addAff(s, x, 5);
          return `同じ${POS_GROUPS.find((g) => g.id === groupOf(s.player.position)).name}の${xs.map((x) => x.name.split(' ')[0]).join('、')}にあいさつに行った。ライバルでもあり、仲間でもある。（それぞれ仲+5）` + G.applyFx(s, { exp: { technique: 6 } });
        },
      },
      {
        label: 'まずは練習で見せる',
        run: (s) => {
          const st = G.jpStyle(s);
          return '言葉より先に、練習でアピールすると決めた。初日から全力でメニューをこなす。' + G.applyFx(s, { exp: { muscle: 8, technique: 6 }, stamina: -8 }) + addEval(s, 2.5 * st.w.camp);
        },
      },
    ],
  };

  G.LIFE_SCENES.jp_dinner = {
    choices: (s) => {
      const sq = G.jpSquad(s);
      const groups = [
        { label: '投手陣のテーブルにつく', list: sq.filter((x) => x.pos === 'P' && !x.mlb) },
        { label: '野手陣のテーブルにつく', list: sq.filter((x) => x.pos !== 'P' && !x.mlb) },
      ];
      const cap = capOf(s);
      return [
        ...groups.map((g) => ({
          label: g.label,
          run: (s2) => {
            const xs = G.shuffle(g.list).slice(0, 4);
            for (const x of xs) addAff(s2, x, 3);
            return `${xs.map((x) => x.name.split(' ')[0]).join('、')}たちと、所属チームの裏話で盛り上がった。（それぞれ仲+3）` + G.applyFx(s2, { happy: 3 });
          },
        })),
        {
          label: `キャプテンの${cap ? cap.name.split(' ')[0] : 'ベテラン'}の隣に座る`,
          run: (s2) => {
            if (cap) addAff(s2, cap, 6);
            return `${cap ? cap.name.split(' ')[0] : 'ベテラン'}は代表の歴史を話してくれた。「この時期の代表には、毎回いろんなドラマがあるんだよ」（仲+6）` + G.applyFx(s2, { exp: { mind: 10 } });
          },
        },
      ];
    },
  };

  G.LIFE_SCENES.jp_mlbjoin = {
    choices: (s) => {
      const star = G.jpSquad(s).filter((x) => x.mlb).sort((a, b) => b.rating - a.rating)[0];
      const n = star ? star.name.split(' ')[0] : '';
      return [
        {
          label: `${n}に話しかけに行く`,
          run: (s2) => {
            addAff(s2, star, 6);
            s2.flags.mlbAdvice = (s2.flags.mlbAdvice || 0) + 1;
            return `緊張しながら声をかけると、${n}は気さくに応じてくれた。「日本の野球、今いちばんレベル高いと思うよ」（仲+6）` + G.applyFx(s2, { exp: { mind: 8, technique: 4 } });
          },
        },
        {
          label: '遠くから練習を見て学ぶ',
          run: (s2) => `${n}のキャッチボール、打撃練習。一つひとつの動きに無駄がない。見ているだけで勉強になった。` + G.applyFx(s2, { exp: { technique: 10 } }),
        },
      ];
    },
  };

  // 強化試合（壮行試合も）。評価が動く
  const exhibitionGames = (s, n, opps) => {
    const p = s.player;
    const it = s.intl;
    const st = G.jpStyle(s);
    const lines = [];
    const acc = G.isPitcher(p) ? G.emptyPit() : G.emptyBat();
    let total = 0;
    for (let i = 0; i < n; i++) {
      const opp = opps[i % opps.length];
      let line = '出場なし';
      let dv = 0;
      if (G.isPitcher(p)) {
        const starter = it.role === 'SP' && i === 0;
        if (starter || G.chance(0.7)) {
          const r = G.simPitching(p, starter ? 3 : 1, 0, starter ? { starter: true } : {});
          G.addStats(acc, r);
          line = G.pitLineText(r);
          dv = (starter ? 1.6 : 1) * (1.2 - r.r) * 2.5 + r.k * 0.4;
        }
      } else {
        const start = it.role !== 'bench' || G.chance(0.6);
        const r = G.simPlateAppearances(p, start ? G.ri(3, 4) : G.ri(1, 2), 0);
        G.addStats(acc, r);
        line = G.batLineText(r);
        dv = G.batGameValue(r) * 2.4;
      }
      total += G.clamp(dv * st.w.camp, -6, 8);
      const win = G.chance(0.62);
      const sc = G.scoreline(win, false, 0);
      lines.push(`vs ${opp}　${win ? '○' : '●'} ${sc[0]}-${sc[1]}｜${line}`);
    }
    const wins = lines.filter((l) => l.includes('○')).length;
    return { lines, acc, wins, losses: n - wins, text: lines.join('\n') + addEval(s, total, '試合での働き') };
  };

  // 1試合ずつ遊んだ強化試合のまとめ（遊んでいなければ、まとめて行う）
  const exhibitionResult = (s, types, n, opps) => {
    const it = s.intl;
    const played = (it.exPlayed || []).filter((g) => types.includes(g.type) && g.year === s.year);
    if (!played.length) return exhibitionGames(s, n, opps);
    const p = s.player;
    const acc = G.isPitcher(p) ? G.emptyPit() : G.emptyBat();
    for (const g of played) if (g.line) G.addStats(acc, g.line);
    const lines = played.map((g) => `vs ${g.opp}　${g.win ? '○' : '●'} ${g.score[0]}-${g.score[1]}｜${g.line ? (G.isPitcher(p) ? G.pitLineText(g.line) : G.batLineText(g.line)) : '出場なし'}`);
    const ev = Math.round(played.reduce((a, g) => a + (g.evalDelta || 0), 0) * 10) / 10;
    const wins = played.filter((g) => g.win).length;
    return { lines, acc, wins, losses: played.length - wins, text: lines.join('\n') + (ev ? `（試合での働きで、首脳陣の評価${ev > 0 ? '+' : ''}${ev}）` : '') };
  };

  // 本番の役割を決める
  const decideRole = (s) => {
    const it = s.intl;
    const p = s.player;
    const before = it.role;
    const e = it.eval;
    if (G.isPitcher(p)) {
      if (it.role === 'SP' && e < 28) it.role = 'RP';
      else if (it.role === 'RP' && e >= 74 && (p.role === 'CL' || p.pitcher.velocity >= 150)) it.role = 'CL';
      else if (it.role === 'RP' && e >= 82 && p.role === 'SP') it.role = 'SP';
      else if (it.role === 'CL' && e < 35) it.role = 'RP';
    } else if (it.role === 'bench' && e >= 66) it.role = 'starter';
    else if (it.role === 'starter' && e >= 82 && p.batter.power >= 65) it.role = 'cleanup';
    else if (it.role === 'starter' && e < 32) it.role = 'bench';
    else if (it.role === 'cleanup' && e < 30) it.role = 'starter';
    const RANK = { bench: 0, RP: 0, starter: 1, SP: 1, CL: 1, cleanup: 2 };
    const up = RANK[it.role] > RANK[before];
    const down = RANK[it.role] < RANK[before];
    if (up) s.flags.jpPromoted = (s.flags.jpPromoted || 0) + 1;
    it.roleSet = true;
    const fam = s.japan.staff.manager.name.split(' ')[0];
    const head = up ? '合宿と強化試合での働きが認められた！' : down ? '悔しいが、首脳陣の判断は厳しかった。' : '';
    const NAME = { SP: '先発', RP: '中継ぎ', CL: '抑え', cleanup: '4番', starter: 'スタメン', bench: '控え' };
    G.scene(s, '本番の役割', `本大会を前に、${fam}監督に呼ばれた。\n\n${ROLE_TALK[it.role]}\n\n${head ? `${head}\n` : ''}本番の役割：${NAME[it.role]}`, up ? { big: `${NAME[it.role]}に昇格` } : {});
    G.log(s, `侍ジャパン：本番は「${NAME[it.role]}」${up ? '（昇格）' : down ? '（降格）' : ''}`, up ? 'good' : down ? 'bad' : 'event', 'event', true);
    if (up || it.role === 'cleanup' || it.role === 'CL') G.buzz(s, 'jprole', { role: NAME[it.role] });
  };

  // ---------- 週ごとの進行 ----------
  G.seriesWeek = (year) => G.weekOfDate(year, new Date(Date.UTC(year, 10, 10)));

  G.on('scheduled', (s) => {
    if (s.retired || s.after) return;
    const w = s.week;
    const t = s.intl;
    // 新しい監督（大会の年の11月末）
    if (G.isIntlYear(s.year) && w === G.cal(s.year).fallEndW - 1 && s.japan) {
      const J = s.japan;
      const old = J.staff.manager;
      if (J.staff.cycle <= s.year) {
        if (G.chance(0.65)) {
          genStaff(s, nextIntlYear(s.year + 1));
          J.trust = null;
          G.log(s, `📰 侍ジャパンの新監督に${J.staff.manager.name}氏（${G.jpStyle(s).name}）が就任。${old.name}監督は退任した`, 'event', 'event');
        } else {
          J.staff.cycle = nextIntlYear(s.year + 1);
          G.log(s, `📰 侍ジャパン、${old.name}監督の続投が決まった`, 'event', 'event');
        }
      }
    }
    // 侍ジャパンシリーズ（大会の前の年の11月）
    if (G.isIntlYear(s.year + 1) && !G.isMLB(s)) {
      const sw = G.seriesWeek(s.year);
      if (w === sw - 2 && !t) {
        const sel = G.intlSeriesSelection(s);
        if (sel) {
          G.ensureJapan(s);
          s.intl = { type: 'series', year: s.year, role: sel.role, accepted: false, games: [], score: sel.score };
          G.emit('intl:selected', s, s.intl);
          s.queue.push({
            kind: 'life',
            id: 'jp_series_select',
            title: `${G.JP_SERIES_NAME}に招集`,
            text: `11月の${G.JP_SERIES_NAME}（強化試合）のメンバーに選ばれた！${sel.young ? '\n若手中心のメンバーの中で、将来の代表候補として期待されている。' : ''}\n\n${G.jpSelectText(s, s.intl)}\n\n来年の${G.INTL_NAME}に向けて、${s.japan.staff.manager.name.split(' ')[0]}監督に名前を覚えてもらうチャンスだ。`,
            data: {},
          });
        }
      }
      if (t && t.type === 'series' && t.accepted && w === sw - 1) {
        G.scene(s, `${G.JP_SERIES_NAME} 集合`, `東京に、侍ジャパンのメンバーが集まった。\n${s.japan.staff.manager.name.split(' ')[0]}監督${G.jpStyle(s).speech}\n\n今週は代表の活動。仲間や首脳陣と話せるのは今週だけだ（「侍ジャパン」タブ）。`);
      }
      if (t && t.type === 'series' && w === sw) {
        if (!t.accepted) s.intl = null;
        else {
          const r = exhibitionResult(s, ['series'], 2, G.shuffle(['オーストラリア', '韓国', '台湾', 'メキシコ']));
          t.acc = r.acc;
          G.emit('intl:finish', s, t, `${r.wins}勝${r.losses}敗`, r.text);
        }
      }
    }
    if (!t || t.type === 'series' || !t.accepted || !t.squad || t.year !== s.year) return;
    const d = G.intlDates(s.year);
    if (w === d.campW - 1) {
      const cap = capOf(s);
      const again = G.jpSquad(s).filter((x) => x.withYou && x.withYou.length && G.jpAff(s, x) >= 12).sort((a, b) => G.jpAff(s, b) - G.jpAff(s, a));
      for (const x of again) addAff(s, x, 3);
      s.queue.push({
        kind: 'life',
        id: 'jp_camp1',
        title: '侍ジャパン 宮崎合宿',
        text: `チームの春季キャンプを離れ、宮崎へ。${G.isMLB(s) ? '（球団の許可を得て、合宿初日から参加する）' : ''}\n侍ジャパンが集結した。背番号「${t.number}」のユニフォームを受け取る。\n\n全体ミーティングで、${s.japan.staff.manager.name.split(' ')[0]}監督が口を開いた。\n${G.jpStyle(s).speech}\n\nキャプテンは${cap ? `${cap.name}（${G.jpTeamName(cap)}）` : 'ベテランの選手'}。${again.length ? `\n前にも代表で一緒だった${nameList(again, 3)}が「また一緒にやれるな」と声をかけてきた。` : ''}\n\n合宿中は「侍ジャパン」タブで、仲間や首脳陣と話せる。`,
        data: {},
      });
    }
    if (w === d.campW && d.campW < d.exhibitW - 1) {
      s.queue.push({ kind: 'life', id: 'jp_dinner', title: '代表の食事会', text: '合宿の夜、選手だけの食事会が開かれた。どこに座ろうか。', data: {} });
    }
    if (w === d.exhibitW - 1) {
      const r = exhibitionResult(s, ['sendoff'], 1, [G.teamById(otherNpbTeam(s)).name]);
      t.exGames = (t.exGames || []).concat(r.lines);
      const mlb = G.jpSquad(s).filter((x) => x.mlb);
      G.scene(s, '壮行試合', `宮崎での壮行試合。満員のスタンドから、日の丸の旗が揺れる。\n\n${r.text}`);
      if (mlb.length) {
        t.mlbJoined = true;
        s.queue.push({
          kind: 'life',
          id: 'jp_mlbjoin',
          title: 'メジャー組が合流',
          text: `メジャーでプレーする${mlb.map((x) => `${x.name}（${G.jpTeamName(x)}）`).join('、')}がチームに合流した！\n練習場の空気が、一気に変わる。`,
          data: {},
        });
      }
    }
    if (w === d.exhibitW) {
      const opps = G.shuffle(G.NPB_TEAMS().filter((x) => x.id !== s.player.teamId)).slice(0, 2).map((x) => x.name);
      const r = exhibitionResult(s, ['exhibit'], 2, opps);
      t.exGames = (t.exGames || []).concat(r.lines);
      G.scene(s, '強化試合', `名古屋・大阪での強化試合。本番前の最終調整だ。\n\n${r.text}`);
      decideRole(s);
    }
  });

  G.LIFE_SCENES.jp_series_select = {
    choices: () => [
      {
        label: '参加する',
        run: (s) => {
          s.intl.accepted = true;
          G.emit('intl:accepted', s, s.intl);
          s.history.push({ year: s.year, text: `${G.JP_SERIES_NAME}のメンバーに選出` });
          return `侍ジャパンのユニフォームに初めて袖を通す…${s.flags.seriesCount > 1 ? 'のは、もう何度目だろう。' : '。胸が高鳴る。'}` + G.applyFx(s, { pop: 3, exp: { mind: 12 }, happy: 5 });
        },
      },
      {
        label: 'オフの調整を優先して辞退する',
        run: (s) => {
          s.intl = null;
          return '体のケアを優先し、今回は辞退した。' + G.applyFx(s, { stamina: 10 });
        },
      },
    ],
  };

  // 11月のシリーズの選考：今季の働き＋若手の有望株
  G.intlSeriesSelection = (s) => {
    const p = s.player;
    if (s.retired || s.after || p.injury) return null;
    const war = G.seasonWAR(p, s);
    const ov = G.overall(p);
    const score = war * 1.2 + Math.max(0, p.popularity - 50) * 0.04 + Math.max(0, ov - 58) * 0.12 + G.jpSelectBonus(s);
    const young = p.age <= 25 && ov >= 55 && war >= 1;
    if (score < 2.8 && !young) return null;
    let role;
    if (G.isPitcher(p)) role = p.role === 'SP' ? 'SP' : p.role === 'CL' && score >= 5 ? 'CL' : 'RP';
    else role = score >= 7 ? 'cleanup' : score >= 4 ? 'starter' : 'bench';
    return { role, score: Math.max(score, 3.6), young: score < 2.8 };
  };

  // ---------- 大会の試合：仲間の活躍 ----------
  G.jpHero = (s, g) => {
    const sq = G.jpSquad(s).filter((x) => !(x.mlb && !s.intl.mlbJoined));
    if (!sq.length) return '';
    const bat = sq.filter((x) => x.pos !== 'P');
    const pit = sq.filter((x) => x.pos === 'P');
    const x = G.weighted([...bat.map((y) => ({ y, weight: Math.max(1, y.rating - 60) })), ...pit.map((y) => ({ y, weight: Math.max(1, (y.rating - 60) * 0.7) }))]).y;
    const n = `${x.name}（${G.jpTeamName(x, false)}）`;
    let text;
    if (x.pos === 'P') text = g.win ? G.pick([`${n}が${G.ri(3, 5)}回無失点の好投`, `${n}が圧巻の3者連続三振`, `${n}がピンチを切り抜けた`]) : `${n}が粘りの投球を見せるも及ばず`;
    else text = g.win ? G.pick([`${n}が先制の${G.pick(['2ラン', 'タイムリー', 'ソロ'])}`, `${n}が決勝打`, `${n}が3安打の大当たり`, `${n}が好守で流れを呼んだ`]) : `${n}が一矢報いる${G.pick(['ソロ', 'タイムリー'])}`;
    if (G.jpIsFriend(s, x)) {
      text += '（仲間の活躍がうれしい）';
      addAff(s, x, 1);
    }
    return text;
  };
  G.on('intlFinalSpeech', (txt, s) => (s.japan && s.japan.staff ? `決勝の前、${s.japan.staff.manager.name.split(' ')[0]}監督がロッカールームで語った。\n${G.jpStyle(s).final}` : txt));

  // ---------- 解散 ----------
  G.on('intl:finish', (s, t, result, gameText) => {
    const J = s.japan;
    if (!J || !t.squad) return;
    const style = G.jpStyle(s);
    for (const x of G.jpSquad(s)) {
      if (!x.guest && !x.pid && x.rosterId === undefined) {
        x.caps = (x.caps || 0) + 1;
        x.withYou = [...(x.withYou || []), t.year];
      }
    }
    J.trust = Math.round(t.eval);
    J.lastYear = t.year;
    const friends = G.jpSquad(s).filter((x) => G.jpIsFriend(s, x));
    const series = t.type === 'series';
    if (series) {
      s.intlHist = s.intlHist || [];
      const tot = t.acc || (G.isPitcher(s.player) ? G.emptyPit() : G.emptyBat());
      const pa = G.isPitcher(s.player) ? tot.outs : tot.pa;
      s.intlHist.push({ year: t.year, type: 'series', role: t.role, result, text: pa ? (G.isPitcher(s.player) ? G.pitLineText(tot) : G.batLineText(tot)) : '出場なし', mvp: false, hr: tot.hr || 0, w: tot.w || 0, s: tot.s || 0 });
      s.intl = null;
    }
    const mFam = J.staff.manager.name.split(' ')[0];
    const evalText = `${mFam}監督からの評価：${G.jpEvalLabel(J.trust)}`;
    G.scene(
      s,
      series ? `${G.JP_SERIES_NAME}` : '侍ジャパン 解散',
      `${series ? `${gameText}\n\n` : ''}最後のミーティング。${mFam}監督${style.bye}\n\n${evalText}${friends.length ? `\n連絡先を交換した仲間：${friends.map((x) => x.name.split(' ')[0]).join('、')}` : ''}\n\nそれぞれのチームへ戻っていく。${series ? '次は本大会で会おう。' : 'このユニフォームを、また着られる日まで。'}`,
    );
  });

  // ---------- 大会のあと：代表仲間との付き合い ----------
  const JP_PERKS = {
    serious: { exp: { technique: 5, mind: 3 } },
    craftsman: { exp: { technique: 7 } },
    cheerful: { happy: 3 },
    joker: { happy: 3 },
    caring: { exp: { mind: 6 } },
    cool: { exp: { technique: 3, mind: 3 } },
    mypace: { stamina: 6 },
  };
  G.on('extraActions', (list, s) => {
    if (!s.people || s.retired) return list;
    const acts = G.jpFriends(s).map((x) => ({
      id: `jpf:${x.id}`,
      place: 'people',
      cost: 2,
      name: `${x.name}に連絡する`,
      desc: `${x.role}・${G.personaById(x.persona).name}`,
      run: (s2) => {
        const d = Math.round(G.ri(4, 7) * G.personaById(x.persona).mul);
        x.aff = G.clamp(x.aff + d, 0, 100);
        const how = G.pick(['電話で近況を報告し合った', 'オフに会って食事をした', 'お互いの試合の感想をメッセージで送り合った', '代表のころの写真を送り合って盛り上がった']);
        return `${x.name}と${how}。（${x.name}との仲+${d}）` + G.applyFx(s2, JP_PERKS[x.persona] || {});
      },
    }));
    return [...list, ...acts];
  });

  G.on('week:life', (s) => {
    if (s.retired || s.after) return;
    const phase = G.phaseOf(s.week, s.year).id;
    for (const x of G.jpFriends(s)) {
      if (onDuty(s) && s.intl && G.jpSquad(s).some((y) => `jp_${y.id}` === x.id)) continue;
      x.aff = Math.max(0, x.aff - 0.3);
      if (x.aff <= 20) {
        delete s.people[x.id];
        G.scene(s, '疎遠', `代表で一緒だった${x.name}とは、いつの間にか連絡を取らなくなってしまった…。\n（人間関係から外れた）`);
        continue;
      }
      // オフには合同自主トレの誘いがくることも
      if ((phase === 'jan' || phase === 'off') && x.aff >= 55 && s.story[`jpjt_${x.id}`] !== s.year && !s.queue.some((q) => q.kind !== 'info') && G.chance(0.05)) {
        s.story[`jpjt_${x.id}`] = s.year;
        s.story.jpJointTrain = (s.story.jpJointTrain || 0) + 1;
        G.scene(s, '代表仲間との自主トレ', `${x.name}から連絡がきた。「今年の自主トレ、一緒にやらないか？」\n代表で知り合った仲間と、${G.pick(['沖縄', 'グアム', '鹿児島', '和歌山'])}で汗を流した。チームの垣根を越えて、刺激をもらった。\n\n` + G.applyFx(s, { exp: { technique: 15, muscle: 10, mind: 5 }, aff: { [x.id]: 5 }, stamina: -10 }));
        G.buzz(s, 'jointrain', { name: x.name.split(' ')[0] });
      }
    }
  });

  // メジャーに挑戦したら、代表で聞いた話が役に立つ
  G.on('joinMLB', (s) => {
    const m = s.player.mlbLife;
    if (m && s.flags.mlbAdvice) m.adapt = G.clamp(m.adapt + Math.min(12, 6 + s.flags.mlbAdvice * 2), 0, 100);
  });

  // チームメイトとは、代表に行っている間は話せない
  G.on('canTalkMate', (why, s) => why || (onDuty(s) ? '侍ジャパンの活動中' : ''));


  // ---------- 代表の試合：シーズン中と同じように、出番のある試合は1試合ずつ操作する ----------
  const FOREIGN = {
    east: ['キム', 'パク', 'イ', 'チェ', 'チャン', 'リン', 'ワン', 'チェン', 'ホン', 'ソン'],
    west: ['ガルシア', 'ロドリゲス', 'スミス', 'ジョンソン', 'ミラー', 'マルティネス', 'ヘルナンデス', 'ブラウン', 'ウィルソン', 'ペレス', 'ゴンザレス', 'ロペス', 'クルーズ', 'デービス'],
  };
  const oppPitcherName = (oppId) => {
    const tm = G.teamById(oppId);
    if (!tm || tm.league !== 'intl') return G.randomMaleName();
    return G.pick(tm.east ? FOREIGN.east : FOREIGN.west);
  };
  const oppName = (oppId) => {
    const tm = G.teamById(oppId);
    return tm.league === 'intl' ? tm.name.replace(/代表$/, '') : tm.name;
  };
  const addDays = (ymd, n) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return G.ymd(new Date(Date.UTC(y, m - 1, d + n)));
  };
  const ids = (names) => names.map((n) => G.intlTeamByName(n).id);
  const EXHIBITION = ['sendoff', 'exhibit', 'series'];
  const STR = { pool: 22, qf: 17, sf: 8, final: 4, sendoff: 10, exhibit: 10, series: 12 };
  const LEVEL = { pool: 2, qf: -1, sf: -3, final: -4, sendoff: 0, exhibit: 0, series: 1 };

  // 今週の代表の試合（日付つき）
  G.on('weekSpecialGames', (list, s) => {
    const t = s.intl;
    if (!t || !t.accepted || !t.squad || t.year !== s.year || s.retired || s.after) return list;
    const day = (d, sp) => ({ d, special: { kind: 'jp', ...sp } });
    const out = [];
    if (t.type === 'series') {
      if (s.week !== G.seriesWeek(s.year)) return list;
      const opps = G.shuffle(ids(['豪州', '韓国', '台湾', 'メキシコ'])).slice(0, 2);
      const sat = G.ymd(G.dateOfWeek(s.year, s.week, 5));
      out.push(day(sat, { type: 'series', title: G.JP_SERIES_NAME, venue: '東京', parkId: 'tokyo', opp: opps[0], idx: 0 }));
      out.push(day(addDays(sat, 1), { type: 'series', title: G.JP_SERIES_NAME, venue: '東京', parkId: 'tokyo', opp: opps[1], idx: 1 }));
      return [...list, ...out];
    }
    const d = G.intlDates(s.year);
    const w = s.week;
    const npb = G.shuffle(G.NPB_TEAMS().filter((x) => x.id !== s.player.teamId).map((x) => x.id));
    if (w === d.exhibitW - 1) out.push(day(d.sendoff, { type: 'sendoff', title: '壮行試合', venue: '宮崎', opp: npb[0], idx: 0 }));
    if (w === d.exhibitW) {
      out.push(day(d.exhibit, { type: 'exhibit', title: '強化試合', venue: '名古屋', parkId: 'nagoya', opp: npb[1], idx: 0 }));
      out.push(day(addDays(d.exhibit, 1), { type: 'exhibit', title: '強化試合', venue: '大阪', parkId: 'osaka', opp: npb[2], idx: 1 }));
    }
    if (w === d.poolW) {
      const opps = G.shuffle(ids(G.INTL_OPPS.pool)).slice(0, 4);
      opps.forEach((o, i) => out.push(day(addDays(d.pool, i), { type: 'pool', stage: 0, title: `${G.INTL_NAME} 1次ラウンド`, venue: '東京', parkId: 'tokyo', opp: o, idx: i })));
    }
    if (w === d.qfW) out.push(day(d.qf, { type: 'qf', stage: 1, title: `${G.INTL_NAME} 準々決勝`, venue: '東京', parkId: 'tokyo', opp: G.pick(ids(G.INTL_OPPS.qf)) }));
    if (w === d.sfW) {
      out.push(day(d.sf, { type: 'sf', stage: 2, title: `${G.INTL_NAME} 準決勝`, venue: 'マイアミ', parkId: 'm_mia', opp: G.pick(ids(G.INTL_OPPS.sf)) }));
      out.push(day(d.final, { type: 'final', stage: 3, title: `${G.INTL_NAME} 決勝`, venue: 'マイアミ', parkId: 'm_mia', opp: G.pick(ids(G.INTL_OPPS.final)), requiresWin: true }));
    }
    return [...list, ...out];
  });

  // 打順ごとの打席数（シーズン中と同じ考え方）
  const paFor = (slot) => (slot <= 2 ? (G.chance(0.6) ? 5 : 4) : slot <= 5 ? (G.chance(0.3) ? 5 : 4) : G.chance(0.15) ? 3 : G.chance(0.12) ? 5 : 4);

  // 試合の準備：役割に応じて、どこで出番があるか
  G.on('specialGame:prepare', (ctx0, s, day) => {
    const sp = day.special;
    const t = s.intl;
    if (!sp || sp.kind !== 'jp' || !t || !t.squad) return ctx0;
    // 決勝は準決勝に勝ったときだけ
    if (sp.requiresWin) {
      const sf = t.games.filter((g) => g.stage === 2);
      if (!sf.length || !sf[sf.length - 1].win) return { skip: true };
    }
    const p = s.player;
    const exh = EXHIBITION.includes(sp.type);
    const sq = G.jpSquad(s);
    const names = (f) => sq.filter(f).map((x) => x.name);
    const myStr = 60;
    const oppStr = myStr - STR[sp.type];
    const ctx = {
      special: sp,
      oppId: sp.opp,
      myStr,
      oppStr,
      kind: null,
      home: sp.type === 'sf' || sp.type === 'final' ? G.chance(0.5) : true,
      parkId: sp.parkId,
      levelOff: LEVEL[sp.type],
      ourId: 'n_jpn',
      mateNames: { SP: names((x) => x.prole === 'SP'), CL: names((x) => x.prole === 'CL'), any: names((x) => x.pos === 'P') },
      hrBase: exh ? (t.exPlayed || []).filter((g) => g.year === s.year && g.line).reduce((a, g) => a + (g.line.hr || 0), 0) : t.games.reduce((a, g) => a + ((g.line && g.line.hr) || 0), 0),
      hrLabel: exh ? '代表' : '大会',
      clutchBoost: exh ? 1 : sp.type === 'sf' || sp.type === 'final' ? 3.5 : 2.5,
    };
    const role = t.role;
    if (p.injury) {
      // ケガ：チームは戦うが、自分は出られない
    } else if (!G.isPitcher(p)) {
      let slot = null;
      let starter = false;
      if (role === 'cleanup') {
        starter = true;
        slot = 4;
      } else if (role === 'starter') {
        starter = true;
        slot = parseInt(G.battingOrder(p), 10) || 6;
        if (slot === 4) slot = 5;
      } else if (G.chance(exh ? 0.5 : 0.12)) {
        starter = true;
        slot = G.pick([7, 8, 9]);
      }
      const nPA = starter ? paFor(slot) : G.chance(exh ? 0.6 : 0.4) ? 1 : 0;
      const types = sp.type === 'sf' || sp.type === 'final' ? ['ace', 'fast', 'ace', 'control'] : G.OPP_PITCHERS.map((o) => o.id);
      if (nPA) Object.assign(ctx, { kind: 'bat', nPA, starter, order: starter ? `${slot}番` : '代打', oppP: { name: oppPitcherName(sp.opp), type: G.pick(types) } });
    } else if (role === 'SP') {
      const starts = (sp.type === 'pool' && sp.idx === 1) || sp.type === 'final' || (exh && sp.idx === 0);
      if (starts) Object.assign(ctx, { kind: 'pit', role: 'SP', inn: exh ? 3 : sp.type === 'pool' ? 4 : 5, lineup: G.pick(G.OPP_LINEUPS).id, situation: exh ? '先発で3イニングの予定' : `${sp.title}の先発マウンドへ（球数制限あり）` });
    } else {
      const pWin = G.clamp(0.5 + STR[sp.type] * 0.012, 0.25, 0.8);
      const pre = G.chance(pWin) ? 'W' : 'L';
      const lead = G.ri(1, 3);
      const cl = role === 'CL';
      const close = pre === 'W' && lead <= 3;
      const appear = cl ? (close ? G.chance(0.8) : G.chance(0.15)) : G.chance(exh ? 0.7 : 0.45);
      if (appear) {
        const situation = cl && close ? `9回、${lead}点リードの場面で登板！` : close ? `${G.ri(6, 8)}回、${lead}点リードの場面で登板` : `${G.ri(5, 8)}回、${pre === 'W' ? 'リード' : 'ビハインド'}の場面で登板`;
        Object.assign(ctx, { kind: 'pit', role: cl ? 'CL' : 'RP', pre, lead, lineup: G.pick(G.OPP_LINEUPS).id, situation });
      }
    }
    G.emit('ownGame:prepare', s, ctx);
    return ctx;
  });

  // 試合の結果：大会や強化試合の記録に入れる（シーズンの成績には入らない）
  G.on('specialGame:result', (s, day, own, res) => {
    const sp = day.special;
    const t = s.intl;
    if (!sp || sp.kind !== 'jp' || !t) return;
    const p = s.player;
    const g = { year: s.year, type: sp.type, stage: sp.stage, opp: oppName(sp.opp), oppId: sp.opp, win: res.outcome === 'W', score: res.score, line: res.kind ? res.line : null, date: day.d };
    g.hero = G.jpHero(s, g);
    res.note = g.hero;
    if (res.kind) p.stamina = G.clamp(p.stamina - (G.isPitcher(p) ? 9 : 5), 0, 100);
    if (EXHIBITION.includes(sp.type)) {
      // 強化試合の働きで、首脳陣の評価が動く
      let dv = 0;
      if (res.kind === 'pit') dv = (own.role === 'SP' ? 1.6 : 1) * (1.2 - res.line.r) * 2.5 + res.line.k * 0.4;
      else if (res.kind === 'bat') dv = G.batGameValue(res.line) * 2.4;
      if (res.kind) {
        const before = t.eval;
        res.evalNote = addEval(s, G.clamp(dv * G.jpStyle(s).w.camp, -6, 8), '試合での働き');
        g.evalDelta = t.eval - before;
      }
      t.exPlayed = [...(t.exPlayed || []), g];
    } else {
      t.games.push(g);
      const l = res.line;
      if (res.kind === 'bat' && (l.hr || l.h >= 3)) G.buzz(s, 'hotgame', { text: `${sp.title.replace(G.INTL_NAME, '').trim() || '日本代表'}での${l.hr ? 'ホームラン' : '猛打賞'}` });
      if (res.clutch && ['sayonara', 'ahead'].includes(res.clutch.verdict)) G.buzz(s, 'hotgame', { text: '日の丸を背負っての勝負強い一打' });
    }
  });
  const ROLE_LABEL = { SP: '先発', RP: '中継ぎ', CL: '抑え', cleanup: '4番', starter: 'スタメン', bench: '控え' };
  G.jpRoleName = (s) => (s.intl ? ROLE_LABEL[s.intl.role] || '' : '');
  // 今週の代表の試合（「1次ラウンド4試合」のような説明）
  G.jpWeekGames = (s) => {
    const days = G.filter('weekSpecialGames', [], s).filter((d) => d.special.kind === 'jp');
    if (!days.length) return '';
    const titles = [...new Set(days.map((d) => d.special.title.replace(`${G.INTL_NAME} `, '')))];
    return `${titles.join('・')}${days.length > 1 ? `（最大${days.length}試合）` : ''}`;
  };
  G.jpEventLine = (s) => {
    const t = s.intl;
    if (!t) return '';
    const p = s.player;
    const acc = G.isPitcher(p) ? G.emptyPit() : G.emptyBat();
    const list = [...t.games, ...(t.exPlayed || []).filter((g) => g.year === s.year)];
    for (const g of list) if (g.line) G.addStats(acc, g.line);
    const n = G.isPitcher(p) ? acc.outs : acc.pa;
    return n ? (G.isPitcher(p) ? G.pitLineText(acc) : G.batLineText(acc)) : 'まだ出番なし';
  };

  G.jpTabVisible = (s) => !!(s.intl || (s.japan && s.japan.everCalled) || G.jpFriends(s).length);
})();
