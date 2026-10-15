// 所属チームのチームメイト（スタメン・控え・投手陣とその成績）
(function () {
  const G = window.G;

  const BAT_SLOTS = ['C', 'C', '1B', '2B', '3B', 'SS', 'SS', 'OF', 'OF', 'OF', 'OF', '1B', '2B'];
  const PIT_ROLES = ['SP', 'SP', 'SP', 'SP', 'SP', 'SP', 'CL', 'setup', 'setup', 'mid', 'mid', 'mid', 'mop'];
  const OF_REGULARS = 3;

  const mlbName = () =>
    `${G.pick(['ジョン', 'マイク', 'カルロス', 'デビッド', 'ホセ', 'ライアン', 'ケビン', 'ルイス', 'ジェイク', 'トミー'])}・${G.pick(['スミス', 'ジョンソン', 'ロドリゲス', 'ウィリアムズ', 'マルティネス', 'ブラウン', 'ガルシア', 'デービス', 'ミラー', 'ゴンザレス', 'テイラー', 'ペレス'])}`;

  const newMate = (s, pos, opts = {}) => {
    const mlb = G.teamById(s.player.teamId).league === 'mlb';
    const str = G.teamStrength(s, s.player.teamId);
    const base = opts.rating !== undefined ? opts.rating : G.clamp(Math.round(G.gauss(49 + (str - 50) * 0.8, 8)), 28, 85);
    const spread = (v) => G.clamp(Math.round(v + G.gauss(0, 9)), 10, 99);
    const m = {
      id: `m${Math.random().toString(36).slice(2, 9)}`,
      name: opts.name || (mlb ? mlbName() : G.randomMaleName()),
      pos,
      age: opts.age || G.ri(20, 35),
      rating: base,
      number: G.ri(0, 99),
      tag: opts.tag || null,
      draftId: opts.draftId,
      stats: { bat: G.emptyBat(), pit: G.emptyPit(), fld: G.emptyFld() },
      last: null,
    };
    if (pos === 'P') m.prof = { velocity: Math.round(132 + base * 0.32), control: spread(base), stamina: spread(base) };
    else {
      m.prof = { contact: spread(base), power: spread(base), speed: spread(base), arm: spread(base), fielding: spread(base), catching: spread(base) };
      if (pos === 'C') m.prof.speed = Math.max(10, m.prof.speed - 15);
    }
    return m;
  };

  const fake = (m, s) => {
    if (m.pos === 'P') {
      const r = m.rating;
      return { position: 'P', throws: 'R', skills: [], condition: 2, pitcher: { velocity: m.prof.velocity, control: m.prof.control, stamina: m.prof.stamina, pitches: [{ id: 'slider', level: G.clamp(Math.round(r / 14), 1, 7) }, { id: 'fork', level: G.clamp(Math.round(r / 16), 1, 7) }] } };
    }
    return { position: m.pos, skills: [], condition: 2, batter: { ...m.prof } };
  };

  G.genRoster = (s) => {
    const p = s.player;
    const players = [];
    const draftMates = s.draft && p.league !== 'mlb' ? s.draft.picks.filter((d) => !d.me && !d.retired && d.teamId === p.teamId) : [];
    const used = new Set();
    for (const pos of BAT_SLOTS) players.push(newMate(s, pos));
    for (const role of PIT_ROLES) {
      const m = newMate(s, 'P');
      m.role = role;
      players.push(m);
    }
    // ドラフト同期のチームメイトを入れる
    for (const d of draftMates) {
      const slot = players.find((m) => !used.has(m.id) && (d.pos === 'P' ? m.pos === 'P' && m.role !== 'CL' : m.pos === d.pos || (d.pos === 'OF' && m.pos === 'OF')));
      if (!slot) continue;
      Object.assign(slot, { name: d.name, age: d.age, rating: Math.round(d.rating), draftId: d.id, tag: d.id === s.draft.rivalId ? 'rival' : 'draft' });
      used.add(slot.id);
    }
    // 先輩はベテランの主力
    if (s.people && p.league !== 'mlb' && !s.people.senpai.retired) {
      const pos = G.isPitcher(p) ? 'P' : G.pick(['1B', '3B', 'OF', 'C']);
      const slot = players.find((m) => !used.has(m.id) && m.pos === pos && (pos !== 'P' || m.role === 'SP'));
      if (slot) {
        Object.assign(slot, { name: s.people.senpai.name, age: G.ri(30, 33), rating: G.ri(62, 72), tag: 'senpai' });
        used.add(slot.id);
      }
    }
    for (const m of players) {
      if (m.pos !== 'P') for (const k in m.prof) m.prof[k] = G.clamp(Math.round(m.rating + G.gauss(0, 8)), 10, 99);
    }
    s.roster = { teamId: p.teamId, year: s.year, players };
    G.assignPitchRoles(s);
    G.assignTeamRoles(s);
  };

  // 投手の役割は能力順。1軍の枠からあふれた投手は2軍
  G.assignPitchRoles = (s) => {
    const R = s.roster;
    const pit = R.players.filter((m) => m.pos === 'P').sort((a, b) => b.rating - a.rating);
    const draftFarm = (m) => {
      if (m.draftId === undefined || !s.draft) return false;
      const d = s.draft.picks.find((x) => x.id === m.draftId);
      return d && d.status === '2軍';
    };
    const ok = pit.filter((m) => !draftFarm(m) && m.rating >= 38);
    const sp = ok.filter((m) => m.prof.stamina >= 50).slice(0, 6);
    const rp = ok.filter((m) => !sp.includes(m)).slice(0, 7);
    for (const m of pit) m.role = 'farm';
    sp.forEach((m) => (m.role = 'SP'));
    rp.forEach((m, i) => (m.role = i === 0 ? 'CL' : i <= 2 ? 'setup' : i === rp.length - 1 ? 'mop' : 'mid'));
  };

  G.ensureRoster = (s) => {
    if (s.retired && s.roster) return s.roster;
    if (!s.roster || s.roster.teamId !== s.player.teamId) G.genRoster(s);
    return s.roster;
  };

  // 自分と同じ守備位置のライバル（レギュラー争いの相手）
  G.positionRival = (s) => {
    const p = s.player;
    if (G.isPitcher(p) || !s.roster) return null;
    const same = s.roster.players.filter((m) => m.pos === p.position).sort((a, b) => b.rating - a.rating);
    if (!same.length) return null;
    return p.position === 'OF' ? same[Math.min(OF_REGULARS - 1, same.length - 1)] : same[0];
  };

  // スタメン・控え・打順を決める
  G.assignTeamRoles = (s) => {
    const p = s.player;
    const R = s.roster;
    const meStarter = !G.isPitcher(p) && p.squad === 'first' && p.usage && p.usage.status === 'starter' && !s.retired;
    for (const m of R.players) if (m.pos !== 'P') {
      m.role = 'farm';
      m.slot = null;
    }
    const regulars = [];
    for (const pos of ['C', '1B', '2B', '3B', 'SS', 'OF']) {
      const need = pos === 'OF' ? OF_REGULARS : 1;
      const cands = R.players.filter((m) => m.pos === pos && !m.injured).sort((a, b) => b.rating - a.rating);
      const take = meStarter && p.position === pos ? need - 1 : need;
      for (const m of cands.slice(0, Math.max(0, take))) {
        m.role = 'regular';
        regulars.push(m);
      }
    }
    // 控えは6人まで（残りは2軍）。ドラフト同期で2軍扱いの選手は2軍
    const isFarmDraft = (m) => m.draftId !== undefined && s.draft && (s.draft.picks.find((x) => x.id === m.draftId) || {}).status === '2軍';
    R.players
      .filter((m) => m.pos !== 'P' && m.role !== 'regular' && !m.injured && !isFarmDraft(m))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 6)
      .forEach((m) => (m.role = 'bench'));
    // 打順：自分の打順を空けて、タイプと能力で並べる
    const free = [1, 2, 3, 4, 5, 6, 7, 8].filter((n) => !(meStarter && p.usage.slot === n));
    const pickBy = (fn) => regulars.filter((m) => !m.slot).sort((a, b) => fn(b) - fn(a))[0];
    const order = [
      [4, (m) => m.prof.power * 1.2 + m.rating],
      [3, (m) => m.prof.contact + m.rating],
      [5, (m) => m.prof.power + m.rating],
      [1, (m) => m.prof.speed * 1.3 + m.prof.contact * 0.5],
      [2, (m) => m.prof.contact + m.prof.speed * 0.5],
      [6, (m) => m.rating],
      [7, (m) => m.rating],
      [8, (m) => (m.pos === 'C' ? 200 : 0) - m.rating],
    ];
    for (const [slot, fn] of order) {
      if (!free.includes(slot)) continue;
      const m = pickBy(fn);
      if (m) m.slot = slot;
    }
  };

  G.lineup = (s) => {
    const p = s.player;
    const R = G.ensureRoster(s);
    const rows = R.players.filter((m) => m.slot).map((m) => ({ slot: m.slot, m }));
    if (!G.isPitcher(p) && p.usage && p.usage.status === 'starter' && p.squad === 'first' && p.usage.slot) rows.push({ slot: p.usage.slot, me: true });
    return rows.sort((a, b) => a.slot - b.slot);
  };

  // 1週間分のチームメイトの成績
  G.simTeammatesWeek = (s, n) => {
    const R = G.ensureRoster(s);
    G.assignTeamRoles(s);
    const p = s.player;
    for (const m of R.players) {
      if (m.injured) {
        m.injured--;
        continue;
      }
      const fp = fake(m, s);
      if (m.pos === 'P') {
        // 自分が先発ローテーションに入っている間は、6番手の先発は登板しない
        const sixth = R.players.filter((x) => x.role === 'SP').slice(-1)[0];
        if (G.isPitcher(p) && p.squad === 'first' && p.role === 'SP' && m === sixth) continue;
        if (m.role === 'SP') {
          const starts = G.chance(n / 6) ? 1 : 0;
          for (let i = 0; i < starts; i++) {
            const st = G.simPitching(fp, G.clamp(4 + m.prof.stamina * 0.045, 4, 8), 0, { starter: true });
            st.gs = 1;
            if (st.outs >= 15 && st.r <= 2 && G.chance(0.6)) st.w = 1;
            else if (st.r >= 4 && G.chance(0.6)) st.l = 1;
            G.addStats(m.stats.pit, st);
          }
        } else {
          const rate = { CL: 0.4, setup: 0.45, mid: 0.38, mop: 0.3 }[m.role] || 0.35;
          for (let d = 0; d < n; d++) {
            if (!G.chance(rate)) continue;
            const st = G.simPitching(fp, 1, 0);
            if (m.role === 'CL' && st.r === 0 && G.chance(0.65)) st.s = 1;
            else if (m.role === 'setup' && st.r === 0 && G.chance(0.6)) st.hld = 1;
            G.addStats(m.stats.pit, st);
          }
        }
      } else if (m.role === 'regular') {
        for (let d = 0; d < n; d++) {
          G.addStats(m.stats.bat, G.simPlateAppearances(fp, m.slot <= 3 ? 5 : 4, 0));
          G.addStats(m.stats.fld, G.simFielding(fp, 1));
        }
      } else if (m.role === 'bench') {
        for (let d = 0; d < n; d++) if (G.chance(0.3)) G.addStats(m.stats.bat, G.simPlateAppearances(fp, 1, 0));
      }
      // まれにケガ
      if (G.chance(0.006)) m.injured = G.ri(2, 6);
    }
  };

  // 年が変わったときの入れ替え
  G.updateRosterYear = (s) => {
    const R = s.roster;
    if (!R) return;
    for (const m of R.players) {
      m.last = { year: s.year, bat: m.stats.bat, pit: m.stats.pit, fld: m.stats.fld, role: m.role };
      m.stats = { bat: G.emptyBat(), pit: G.emptyPit(), fld: G.emptyFld() };
      m.age++;
      if (m.draftId !== undefined && s.draft) {
        const d = s.draft.picks.find((x) => x.id === m.draftId);
        if (d) {
          m.rating = Math.round(d.rating);
          if (d.retired || d.league === 'mlb') m.gone = d.retired ? '引退' : 'メジャー移籍';
        }
      } else if (m.age <= 26) m.rating += G.ri(0, 4);
      else if (m.age >= 32) m.rating -= G.ri(1, 4);
      else m.rating += G.ri(-2, 2);
      m.rating = G.clamp(m.rating, 20, 92);
      if (m.pos !== 'P') for (const k in m.prof) m.prof[k] = G.clamp(Math.round(m.rating + G.gauss(0, 8)), 10, 99);
      if (!m.gone && ((m.age >= 38 && G.chance(0.6)) || (m.age >= 30 && m.rating < 38) || m.age >= 41)) m.gone = '引退';
      if (m.tag === 'senpai' && s.people && s.people.senpai.retired) m.gone = '引退（コーチに就任）';
    }
    const departed = R.players.filter((m) => m.gone);
    R.departed = departed.map((m) => ({ name: m.name, why: m.gone, year: s.year }));
    R.players = R.players.filter((m) => !m.gone);
    for (const m of departed) {
      const n = newMate(s, m.pos, { age: G.ri(18, 23), rating: G.ri(35, 52) });
      if (m.pos === 'P') n.role = m.role === 'CL' || m.role === 'setup' ? 'mid' : m.role;
      n.rookie = true;
      R.players.push(n);
    }
    // 後輩が入団したら加える
    if (s.people && s.people.kohai.met && !R.players.some((m) => m.tag === 'kohai') && s.player.league !== 'mlb') {
      const n = newMate(s, G.isPitcher(s.player) ? 'P' : s.player.position === 'C' ? 'C' : G.pick(['2B', 'SS', 'OF']), { name: s.people.kohai.name, age: 19, rating: G.ri(38, 48), tag: 'kohai' });
      if (n.pos === 'P') n.role = 'mop';
      n.rookie = true;
      R.players.push(n);
    }
    G.assignPitchRoles(s);
    R.year = s.year + 1;
  };

  G.TEAM_ROLE_NAME = { SP: '先発', CL: '抑え', setup: 'セットアッパー', mid: '中継ぎ', mop: '敗戦処理', regular: 'レギュラー', bench: '控え', farm: '2軍' };
  G.mateTag = (m) => ({ senpai: '先輩', rival: '同期のライバル', draft: 'ドラフト同期', kohai: '後輩' })[m.tag] || '';
})();
