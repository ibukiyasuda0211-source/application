// 試合シミュレーション
(function () {
  const G = window.G;

  G.emptyBat = () => ({ g: 0, pa: 0, ab: 0, h: 0, d: 0, t: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, cs: 0 });
  G.emptyPit = () => ({ g: 0, gs: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, k: 0, hr: 0, w: 0, l: 0, s: 0, hld: 0 });

  G.addStats = (to, from) => {
    for (const k in from) to[k] = (to[k] || 0) + from[k];
    return to;
  };

  G.COND_OFFSET = [-7, -3, 0, 3, 6];

  G.batDerived = (s) => {
    const tb = s.h + s.d + 2 * s.t + 3 * s.hr;
    const obp = s.pa ? (s.h + s.bb) / s.pa : 0;
    const slg = s.ab ? tb / s.ab : 0;
    return { tb, obp, slg, ops: obp + slg, avg: s.ab ? s.h / s.ab : 0 };
  };

  // ---------- 打者 ----------
  G.simPlateAppearances = (p, nPA, levelOffset) => {
    const b = p.batter;
    const off = G.COND_OFFSET[p.condition] + levelOffset + G.gauss(0, 4);
    const sk = (id) => p.skills.includes(id);
    const c = b.contact + off;
    const pw = b.power + off * 0.7;
    const sp = b.speed;

    const pHR = Math.max(0.002, 0.004 + (pw - 40) * 0.001 + Math.max(0, pw - 75) * 0.0006) * (sk('powerhit') ? 1.15 : 1);
    const pBB = 0.05 + c * 0.0003 + pw * 0.0002 + (sk('eye') ? 0.025 : 0);
    const pK = Math.max(0.06, 0.28 - c * 0.0014) * (sk('tough') ? 0.85 : 1);
    const babip = 0.25 + c * 0.0008 + sp * 0.0003 + (sk('avg') ? 0.012 : 0);
    const chanceMul = sk('chance') ? 1.3 : 1;

    const st = G.emptyBat();
    st.g = 1;
    for (let i = 0; i < nPA; i++) {
      st.pa++;
      const r = Math.random();
      let onBase = 0; // 0:なし 1:単打/四球 2:二塁打 3:三塁打
      if (r < pHR) {
        st.ab++;
        st.h++;
        st.hr++;
        st.r++;
        st.rbi += 1 + Math.min(3, G.poisson(0.65 * chanceMul));
      } else if (r < pHR + pBB) {
        st.bb++;
        onBase = 1;
        if (G.chance(0.01)) st.rbi++;
      } else if (r < pHR + pBB + pK) {
        st.ab++;
        st.k++;
      } else {
        st.ab++;
        if (G.chance(babip)) {
          st.h++;
          const x = Math.random();
          const pD = 0.17 + pw * 0.0012;
          const pT = 0.012 + sp * 0.0004;
          if (x < pT) {
            st.t++;
            onBase = 3;
            st.rbi += Math.min(3, G.poisson(0.7 * chanceMul));
          } else if (x < pT + pD) {
            st.d++;
            onBase = 2;
            st.rbi += Math.min(3, G.poisson(0.5 * chanceMul));
          } else {
            onBase = 1;
            st.rbi += Math.min(2, G.poisson(0.28 * chanceMul));
          }
        } else if (G.chance(0.035)) {
          st.rbi++; // 犠飛・内野ゴロの間
        }
      }
      if (onBase) {
        let scoreP = onBase === 1 ? 0.3 + sp * 0.002 : onBase === 2 ? 0.5 + sp * 0.002 : 0.78;
        if (onBase === 1) {
          const attempt = sp >= 55 ? (sp - 50) * 0.006 * (sk('steal') ? 1.5 : 1) : 0.01;
          if (G.chance(attempt)) {
            const succ = G.clamp(0.55 + sp * 0.0035 + (sk('steal') ? 0.08 : 0), 0, 0.95);
            if (G.chance(succ)) {
              st.sb++;
              scoreP += 0.12;
            } else {
              st.cs++;
              scoreP = 0;
            }
          }
        }
        if (G.chance(scoreP)) st.r++;
      }
    }
    return st;
  };

  G.batGameValue = (st) => {
    const tb = st.h + st.d + 2 * st.t + 3 * st.hr;
    return tb + st.bb + st.rbi * 0.5 + st.sb * 0.3 - st.pa * 0.45;
  };

  G.batLineText = (st) => {
    if (!st.pa) return '出場なし';
    const parts = [`${st.ab}打数${st.h}安打`];
    if (st.hr) parts.push(`${st.hr}本塁打`);
    if (st.rbi) parts.push(`${st.rbi}打点`);
    if (st.bb) parts.push(`${st.bb}四球`);
    if (st.sb) parts.push(`${st.sb}盗塁`);
    return parts.join(' ');
  };

  // ---------- 投手 ----------
  G.pitchParams = (p, levelOffset) => {
    const pt = p.pitcher;
    const q = G.pitchQuality(p) + G.COND_OFFSET[p.condition] + levelOffset + G.gauss(0, 6);
    const vScore = G.clamp((pt.velocity - 125) * 2.2, 0, 100);
    const total = pt.pitches.reduce((s, x) => s + x.level, 0);
    const bScore = Math.min(100, total * 5 + pt.pitches.length * 3);
    const sk = (id) => p.skills.includes(id);
    const era = G.clamp(4.3 - (q - 45) * 0.055, 0.9, 9.5);
    return {
      era,
      runL: (era / 9) * 1.08,
      hitL: 0.55 + era * 0.07,
      kL: 0.45 + vScore * 0.0035 + bScore * 0.004 + (sk('kire') ? 0.08 : 0) + (sk('kkk') ? 0.15 : 0) + (sk('nobi') ? 0.05 : 0),
      bbL: Math.max(0.08, 0.6 - pt.control * 0.0045),
      hrL: (0.05 + Math.max(0, era - 2) * 0.025) * (sk('heavy') ? 0.7 : 1),
    };
  };

  // innings: 予定イニング数（小数可）。戻り値は投手成績
  G.simPitching = (p, innings, levelOffset, opts = {}) => {
    const pr = G.pitchParams(p, levelOffset);
    const st = G.emptyPit();
    st.g = 1;
    const full = Math.floor(innings);
    let outs = 0;
    for (let i = 0; i < full; i++) {
      const fatigue = opts.starter && i >= 6 ? 1.15 : 1;
      const r = G.poisson(pr.runL * fatigue);
      st.r += r;
      st.h += G.poisson(pr.hitL * fatigue) + (r > 0 ? 1 : 0);
      st.k += Math.min(3, G.poisson(pr.kL));
      st.bb += G.poisson(pr.bbL);
      if (r > 0 && G.chance(Math.min(0.9, pr.hrL * 4))) st.hr++;
      outs += 3;
      if (opts.starter && st.r >= 5 && i >= 2) {
        break;
      }
    }
    if (opts.starter && outs === full * 3 && G.chance(innings - full)) outs += G.ri(1, 2);
    st.outs = outs;
    st.er = Math.max(0, st.r - (st.r > 0 && G.chance(0.12) ? 1 : 0));
    return st;
  };

  G.pitLineText = (st) => {
    if (!st.outs && !st.g) return '登板なし';
    let s = `${G.fmtIP(st.outs)}回 ${st.r}失点 ${st.k}奪三振`;
    const tags = [];
    if (st.w) tags.push('勝利');
    if (st.l) tags.push('敗戦');
    if (st.s) tags.push('セーブ');
    if (st.hld) tags.push('ホールド');
    if (tags.length) s += ` 【${tags.join('・')}】`;
    return s;
  };

  // ---------- 1試合（自チーム） ----------
  // ctx: { s, oppId, levelOffset, squad, gameIndex }
  G.teamStrength = (s, teamId) => s.teamStr[teamId] || 50;

  G.playerTeamBonus = (s) => {
    const p = s.player;
    if (p.squad !== 'first' || p.injury) return 0;
    let bonus = 0;
    if (G.isPitcher(p)) bonus = (G.overall(p) - 50) * 0.06;
    else if (p.trust >= 55) bonus = (G.overall(p) - 50) * 0.12;
    if (p.skills.includes('mood')) bonus += 1;
    return bonus;
  };

  G.scoreline = (win, draw, minOurs = 0) => {
    if (draw) {
      const r = G.poisson(2.5);
      return [Math.max(r, minOurs), Math.max(r, minOurs)];
    }
    let w = 1 + G.poisson(3.6);
    let l = G.ri(0, Math.max(0, w - 1));
    if (win) {
      w = Math.max(w, minOurs);
      if (l >= w) l = w - 1;
      return [w, l];
    }
    // 負け
    let ours = Math.max(l, minOurs);
    let theirs = Math.max(w, ours + 1);
    return [ours, theirs];
  };

  // 自チームの1試合を処理し、選手の出場結果を返す
  G.playOwnGame = (s, oppId, gameNo) => {
    const p = s.player;
    const myStr = G.teamStrength(s, p.teamId) + G.playerTeamBonus(s);
    const oppStr = G.teamStrength(s, oppId);
    let pWin = G.clamp(0.5 + (myStr - oppStr) * 0.012, 0.25, 0.75);
    const res = { oppId, line: null, kind: null };
    const active = p.squad === 'first' && !p.injury;

    let outcome = null; // 'W' | 'L' | 'D'
    let score = null;

    if (active && !G.isPitcher(p)) {
      let nPA = 0;
      const starter = p.trust >= 55 || G.chance(0.2);
      if (starter) nPA = G.chance(0.45) ? 5 : 4;
      else if (G.chance(0.35)) nPA = 1;
      if (nPA) {
        const st = G.simPlateAppearances(p, nPA, 0);
        res.line = st;
        res.kind = 'bat';
        pWin = G.clamp(pWin + G.batGameValue(st) * 0.035, 0.1, 0.9);
        const d = G.chance(0.03);
        outcome = d ? 'D' : G.chance(pWin) ? 'W' : 'L';
        score = G.scoreline(outcome === 'W', d, Math.max(st.rbi, st.r));
      }
    } else if (active && G.isPitcher(p)) {
      if (p.role === 'SP') {
        s.rotation = (s.rotation || 0) + 1;
        if (s.rotation % 6 === 0) {
          const inn = G.clamp(4 + p.pitcher.stamina * 0.045 + G.gauss(0, 0.8) + (p.skills.includes('quick') ? 0.5 : 0), 3, 9);
          const st = G.simPitching(p, inn, 0, { starter: true });
          st.gs = 1;
          const pen = 27 - st.outs;
          const penRuns = G.poisson((pen / 3) * (3.7 / 9));
          const offL = 3.9 + (myStr - 50) * 0.06 - (oppStr - 50) * 0.03;
          let ours = G.poisson(offL);
          let theirs = st.r + penRuns;
          if (ours === theirs) {
            if (G.chance(0.15)) outcome = 'D';
            else if (G.chance(0.5)) {
              ours++;
              outcome = 'W';
            } else {
              theirs++;
              outcome = 'L';
            }
          } else outcome = ours > theirs ? 'W' : 'L';
          if (outcome === 'W' && st.outs >= 15 && st.r < ours && G.chance(0.82)) st.w = 1;
          if (outcome === 'L' && st.r > ours) st.l = 1;
          score = [ours, theirs];
          res.line = st;
          res.kind = 'pit';
        }
      } else {
        // 救援
        const d = G.chance(0.03);
        outcome = d ? 'D' : G.chance(pWin) ? 'W' : 'L';
        const lead = G.ri(1, 4);
        let appear = false;
        let st = null;
        if (p.role === 'CL') {
          if (outcome === 'W' && lead <= 3 && G.chance(0.85)) {
            appear = true;
            st = G.simPitching(p, 1, 0);
            if (st.r >= lead) {
              if (G.chance(0.6)) {
                st.l = 1;
                outcome = 'L';
              } else outcome = 'D';
            } else st.s = 1;
          } else if (outcome !== 'W' && G.chance(0.12)) {
            appear = true;
            st = G.simPitching(p, 1, 0);
          }
        } else if (G.chance(0.42)) {
          appear = true;
          st = G.simPitching(p, 1, 0);
          if (outcome === 'W' && lead <= 3) {
            if (st.r >= lead) {
              if (G.chance(0.5)) {
                st.l = 1;
                outcome = 'L';
              }
            } else st.hld = 1;
          }
        }
        if (appear) {
          res.line = st;
          res.kind = 'pit';
        }
        score = G.scoreline(outcome === 'W', outcome === 'D');
      }
    }

    if (!outcome) {
      const d = G.chance(0.03);
      outcome = d ? 'D' : G.chance(pWin) ? 'W' : 'L';
      score = G.scoreline(outcome === 'W', d);
    }
    res.outcome = outcome;
    res.score = score;
    return res;
  };

  // 2軍戦（成績のみ）
  G.playFarmGame = (s) => {
    const p = s.player;
    if (G.isPitcher(p)) {
      s.farmRotation = (s.farmRotation || 0) + 1;
      if (p.pitcher.stamina >= 45 && s.farmRotation % 6 === 0) {
        const inn = G.clamp(4 + p.pitcher.stamina * 0.045 + G.gauss(0, 0.8), 3, 9);
        const st = G.simPitching(p, inn, 6, { starter: true });
        st.gs = 1;
        if (st.outs >= 15 && G.chance(st.r <= 2 ? 0.6 : 0.3)) st.w = 1;
        else if (st.r >= 4 && G.chance(0.6)) st.l = 1;
        return { kind: 'pit', line: st };
      }
      if (p.pitcher.stamina < 45 && G.chance(0.45)) {
        const st = G.simPitching(p, 1, 6);
        return { kind: 'pit', line: st };
      }
      return null;
    }
    if (G.chance(0.85)) {
      return { kind: 'bat', line: G.simPlateAppearances(p, 4, 7) };
    }
    return null;
  };

  // NPC同士の試合
  G.playNpcGame = (s, a, b) => {
    const pa = G.clamp(0.5 + (G.teamStrength(s, a) - G.teamStrength(s, b)) * 0.012, 0.25, 0.75);
    if (G.chance(0.03)) return 'D';
    return G.chance(pa) ? 'W' : 'L';
  };

  G.recordResult = (s, teamId, outcome) => {
    const r = s.standings[teamId];
    if (outcome === 'W') r.w++;
    else if (outcome === 'L') r.l++;
    else r.d++;
  };

  G.flip = (o) => (o === 'W' ? 'L' : o === 'L' ? 'W' : 'D');

  // 週の試合をまとめて行う
  G.simWeekGames = (s, nGames) => {
    const p = s.player;
    const myLeague = G.teamById(p.teamId).league;
    const weekBat = G.emptyBat();
    const weekPit = G.emptyPit();
    const farmBat = G.emptyBat();
    const farmPit = G.emptyPit();
    const games = [];
    for (let d = 0; d < nGames; d++) {
      for (const lg of G.LEAGUES) {
        const ids = G.shuffle(G.TEAMS.filter((t) => t.league === lg.id).map((t) => t.id));
        for (let i = 0; i < ids.length; i += 2) {
          const a = ids[i];
          const b = ids[i + 1];
          if (lg.id === myLeague && (a === p.teamId || b === p.teamId)) {
            const opp = a === p.teamId ? b : a;
            const res = G.playOwnGame(s, opp, d);
            G.recordResult(s, p.teamId, res.outcome);
            G.recordResult(s, opp, G.flip(res.outcome));
            games.push(res);
            if (res.kind === 'bat') G.addStats(weekBat, res.line);
            if (res.kind === 'pit') G.addStats(weekPit, res.line);
          } else {
            const o = G.playNpcGame(s, a, b);
            G.recordResult(s, a, o);
            G.recordResult(s, b, G.flip(o));
          }
        }
      }
      if (p.squad === 'second' && !p.injury) {
        const fr = G.playFarmGame(s);
        if (fr && fr.kind === 'bat') G.addStats(farmBat, fr.line);
        if (fr && fr.kind === 'pit') G.addStats(farmPit, fr.line);
      }
    }
    return { games, weekBat, weekPit, farmBat, farmPit };
  };

  // オープン戦（成績は評価のみに使う）
  G.simOpenGames = (s, n) => {
    const p = s.player;
    const bat = G.emptyBat();
    const pit = G.emptyPit();
    if (p.injury) return { bat, pit };
    for (let i = 0; i < n; i++) {
      if (G.isPitcher(p)) {
        if (G.chance(0.5)) G.addStats(pit, G.simPitching(p, G.ri(1, 3), 2));
      } else if (G.chance(0.8)) {
        G.addStats(bat, G.simPlateAppearances(p, G.ri(2, 4), 2));
      }
    }
    return { bat, pit };
  };

  // ---------- 評価指標 ----------
  G.batterWAR = (p, st) => {
    if (!st.pa) return 0;
    const d = G.batDerived(st);
    const wraa = (d.ops - 0.74) * st.pa * 0.2;
    const share = st.g / G.SEASON_GAMES;
    const pos = G.posById(p.position);
    let def = ((p.batter.fielding - 50) * 0.12 + (pos.defBonus || 0) * 6) * share;
    if (p.skills.includes('glove')) def += 3 * share;
    if (p.skills.includes('laser')) def += 2 * share;
    const repl = (st.pa * 12) / 600;
    return (wraa + def + repl + st.sb * 0.2 - st.cs * 0.4) / 10;
  };

  G.pitcherWAR = (p, st) => {
    if (!st.outs) return 0;
    const ip = st.outs / 3;
    const era = (st.er * 9) / ip;
    return ((4.1 - era) * ip / 9 + ip * 0.08) / 10 + st.s * 0.04 + st.hld * 0.02;
  };

  G.seasonWAR = (p, s) => (G.isPitcher(p) ? G.pitcherWAR(p, s.stats.pit) : G.batterWAR(p, s.stats.bat));
})();
