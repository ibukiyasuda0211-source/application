// 入団した年のドラフト同期たち（毎年の成績をシミュレーション）
(function () {
  const G = window.G;

  G.NPB_TEAMS = () => G.TEAMS.filter((t) => t.league !== 'mlb');

  const PEAK = { early: 25, normal: 28, late: 31 };
  const BG_AGE = { hs: 18, univ: 22, corp: 24 };

  // 能力値（総合）からシミュレーション用の仮の選手をつくる
  const fakePlayer = (d, rating, mlb) => {
    const spread = (v) => G.clamp(Math.round(v + G.gauss(0, 6)), 5, 100);
    const r = mlb ? rating - 6 : rating;
    if (d.pos === 'P') {
      return {
        position: 'P', throws: 'R', skills: [], condition: 2,
        pitcher: { velocity: Math.round(128 + r * 0.32), control: spread(r), stamina: spread(r), pitches: [{ id: 'slider', level: G.clamp(Math.round(r / 14), 1, 7) }, { id: 'fork', level: G.clamp(Math.round(r / 16), 1, 7) }, { id: 'curve', level: G.clamp(Math.round(r / 20), 1, 7) }] },
      };
    }
    return {
      position: d.pos, skills: [], condition: 2,
      batter: { contact: spread(r), power: spread(r), speed: spread(r), arm: spread(r), fielding: spread(r), catching: spread(r) },
    };
  };

  G.genDraftClass = (s) => {
    const p = s.player;
    const teams = G.shuffle(G.NPB_TEAMS().map((t) => t.id));
    const picks = [];
    const used = new Set([p.name]);
    let id = 0;
    for (let round = 1; round <= 6; round++) {
      const order = round % 2 ? teams : teams.slice().reverse();
      for (const teamId of order) {
        if (teamId === p.teamId && round === p.draftRank) {
          picks.push({ id: id++, me: true, teamId, round });
          continue;
        }
        let name;
        do name = G.randomMaleName();
        while (used.has(name));
        used.add(name);
        const bg = G.pick(['hs', 'hs', 'univ', 'univ', 'corp']);
        const rating = G.clamp(Math.round(51 - round * 2 + G.gauss(0, 5) - (bg === 'hs' ? 5 : 0)), 24, 64);
        picks.push({
          id: id++, teamId, round, name, bg,
          pos: G.chance(0.45) ? 'P' : G.pick(['C', '1B', '2B', '3B', 'SS', 'OF', 'OF']),
          age: BG_AGE[bg],
          rating,
          pot: G.clamp(Math.round(rating + G.ri(4, 26) - round + (round === 1 ? 3 : 0)), 40, 95),
          growth: G.pick(['early', 'normal', 'normal', 'late']),
          status: '2軍', best: '2軍', league: 'npb', retired: false,
          tot: { bat: G.emptyBat(), pit: G.emptyPit() }, last: null, war: 0, years: 0,
        });
      }
    }
    // 同じ球団の同期のひとりをライバルにする
    const mates = picks.filter((d) => !d.me && d.teamId === p.teamId);
    const rival = mates.sort((a, b) => b.pot - a.pot)[0];
    rival.name = s.people ? s.people.rival.name : s.npc.rival;
    rival.pos = G.isPitcher(p) ? 'P' : p.position === 'P' ? 'OF' : p.position;
    rival.pot = Math.max(rival.pot, 70);
    s.draft = { year: s.startYear - 1, picks, rivalId: rival.id };
  };

  // 1シーズン分の成績をつくり、成長・引退を進める
  // 自分のチームにいる同期は、チームメイトとしての実際の成績を使う（チームのタブと食い違わないように）
  G.draftMateOf = (s, d) => {
    const R = s.roster;
    if (!R || !d || d.me || d.retired || d.league !== 'npb' || R.teamId !== d.teamId || s.player.league === 'mlb') return null;
    return R.players.find((m) => m.draftId === d.id) || null;
  };
  G.mateStatus = (m) => (['regular', 'SP', 'CL', 'setup'].includes(m.role) ? '1軍主力' : ['bench', 'mid', 'mop'].includes(m.role) ? '1軍' : '2軍');

  G.updateDraftClass = (s) => {
    if (!s.draft) return;
    const year = s.year;
    for (const d of s.draft.picks) {
      if (d.me || d.retired) continue;
      d.years++;
      const peak = PEAK[d.growth];
      if (d.age < peak) d.rating += (d.pot - d.rating) * 0.25 + G.gauss(0, 2);
      else d.rating -= G.ri(0, Math.max(1, d.age - peak)) * 0.8 + Math.max(0, G.gauss(0, 1));
      d.rating = G.clamp(d.rating, 15, 99);
      const r = d.rating;
      let status = r >= 60 ? '1軍主力' : r >= 52 ? '1軍' : '2軍';
      if (d.league === 'mlb') status = r >= 64 ? 'MLB主力' : r >= 56 ? 'MLB' : 'マイナー';
      const fp = fakePlayer(d, r, d.league === 'mlb');
      let bat = G.emptyBat();
      let pit = G.emptyPit();
      const mate = G.draftMateOf(s, d);
      if (mate) {
        // チームメイトとしての今季の成績そのもの
        bat = { ...G.emptyBat(), ...mate.stats.bat };
        pit = { ...G.emptyPit(), ...mate.stats.pit };
        status = pit.outs >= 300 || pit.g >= 40 || bat.pa >= 300 ? '1軍主力' : bat.g || pit.g ? '1軍' : '2軍';
      }
      const regular = /主力/.test(status);
      const bench = status === '1軍' || status === 'MLB';
      if (mate) {
        // 成績は上で決まっている
      } else if (d.pos === 'P') {
        const starter = r >= 55 && d.id % 2 === 0;
        if (regular || bench) {
          const apps = starter ? (regular ? 24 : 8) : regular ? 50 : 25;
          for (let i = 0; i < apps; i++) {
            const st = starter ? G.simPitching(fp, G.clamp(4 + r * 0.045, 4, 8), 0, { starter: true }) : G.simPitching(fp, 1, 0);
            if (starter) {
              st.gs = 1;
              if (st.outs >= 15 && st.r <= 2 && G.chance(0.62)) st.w = 1;
              else if (st.r >= 4 && G.chance(0.6)) st.l = 1;
            } else if (regular && r >= 62 && st.r === 0 && G.chance(0.6)) st.s = 1;
            else if (st.r === 0 && G.chance(0.35)) st.hld = 1;
            G.addStats(pit, st);
          }
        }
      } else if (regular || bench) {
        const games = regular ? G.ri(120, 143) : G.ri(30, 90);
        for (let i = 0; i < games; i++) G.addStats(bat, G.simPlateAppearances(fp, regular ? 4 : G.ri(1, 3), 0));
      }
      const war = d.pos === 'P' ? G.pitcherWAR(fp, pit) : G.batterWAR(fp, bat);
      d.war = Math.round((d.war + war) * 10) / 10;
      G.addStats(d.tot.bat, bat);
      G.addStats(d.tot.pit, pit);
      d.last = { year, status, bat, pit, war: Math.round(war * 10) / 10 };
      d.status = status;
      if (regular) d.best = d.league === 'mlb' ? 'MLB主力' : '1軍主力';
      else if (bench && d.best === '2軍') d.best = '1軍';
      d.age++;
      // メジャー挑戦・引退
      if (d.league === 'npb' && r >= 74 && d.age >= 25 && d.age <= 31 && G.chance(0.15)) {
        d.league = 'mlb';
        d.note = `${year}年オフにメジャー移籍`;
      } else if ((d.age >= 30 && r < 46) || (d.years >= 6 && d.best === '2軍' && G.chance(0.4)) || (d.age >= 37 && G.chance(0.35)) || d.age >= 43) {
        d.retired = true;
        d.status = d.best === '2軍' ? '戦力外' : '引退';
        d.note = `${year}年オフに${d.status === '戦力外' ? '戦力外・引退' : '現役引退'}`;
      }
    }
    // ライバルの情報を人間関係に反映
    const rv = s.draft.picks.find((d) => d.id === s.draft.rivalId);
    if (rv && s.people) {
      const pr = s.people.rival;
      pr.war = rv.war;
      pr.best = rv.status;
      if (rv.retired && !pr.retired) {
        pr.retired = true;
        G.scene(s, 'ライバルの引退', `同期のライバル・${rv.name}が現役引退を発表した。\n「お前がいたから、ここまでやってこれた。ありがとな」\n\n` + G.applyFx(s, { exp: { mind: 20 }, happy: -3 }));
        s.history.push({ year: s.year, text: `ライバル${rv.name}が引退` });
      }
    }
  };

  // 同期の「今」の評価（D〜S）。通算WARと今の立場から
  G.DRAFT_GRADES = [
    { g: 'S', name: '大当たり', desc: '球界を代表するスター' },
    { g: 'A', name: '当たり', desc: 'チームの中心選手' },
    { g: 'B', name: '戦力', desc: '1軍のレギュラー級' },
    { g: 'C', name: '一軍半', desc: '1軍で出番をつかみ始めた' },
    { g: 'D', name: 'まだこれから', desc: 'まだ目立った活躍はない' },
  ];
  G.draftGrade = (war, status, best) => {
    const star = /主力/.test(status || '') || /主力/.test(best || '');
    let g;
    if (war >= 25 || (star && war >= 18)) g = 'S';
    else if (war >= 12 || (star && war >= 7)) g = 'A';
    else if (war >= 4 || star) g = 'B';
    else if (war >= 0.8 || /1軍|MLB/.test(status || '') || /1軍|MLB/.test(best || '')) g = 'C';
    else g = 'D';
    return G.DRAFT_GRADES.find((x) => x.g === g);
  };

  // 表示用：自分のチームの同期は今季の成績も足した「いま」の姿
  G.draftLive = (s, d) => {
    const m = G.draftMateOf(s, d);
    const bat = { ...d.tot.bat };
    const pit = { ...d.tot.pit };
    let war = d.war;
    let status = d.status;
    let season = null;
    if (m) {
      G.addStats(bat, m.stats.bat);
      G.addStats(pit, m.stats.pit);
      const fp = fakePlayer(d, d.rating, false);
      war = Math.round((d.war + (d.pos === 'P' ? G.pitcherWAR(fp, m.stats.pit) : G.batterWAR(fp, m.stats.bat))) * 10) / 10;
      status = G.mateStatus(m);
      season = { bat: m.stats.bat, pit: m.stats.pit, role: m.role };
    }
    return { bat, pit, war, status, season, grade: G.draftGrade(war, status, d.best) };
  };

  G.draftTeamOf = (s) => s.draft.picks.find((x) => x.me).teamId;

  G.draftStatusClass = (status) => (/主力/.test(status) ? 'st-star' : /1軍|MLB/.test(status) ? 'st-first' : /引退|戦力外/.test(status) ? 'st-out' : 'st-farm');
})();
