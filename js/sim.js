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
  // mods: 作戦による補正（hr/bb/k/babip/xbh/sb の倍率）、out: 打席ごとの結果を入れる配列
  G.simPlateAppearances = (p, nPA, levelOffset, mods = {}, out = null) => {
    const m = (k) => (mods[k] === undefined ? 1 : mods[k]);
    const b = p.batter;
    const off = G.COND_OFFSET[p.condition] + levelOffset + G.gauss(0, 4);
    const sk = (id) => p.skills.includes(id);
    const c = b.contact + off;
    const pw = b.power + off * 0.7;
    const sp = b.speed;

    const pHR = Math.max(0.002, 0.004 + (pw - 40) * 0.001 + Math.max(0, pw - 75) * 0.0006) * (sk('powerhit') ? 1.15 : 1) * m('hr');
    const pBB = (0.05 + c * 0.0003 + pw * 0.0002 + (sk('eye') ? 0.025 : 0)) * m('bb');
    const pK = Math.max(0.04, 0.28 - c * 0.0014) * (sk('tough') ? 0.85 : 1) * m('k');
    const babip = (0.25 + c * 0.0008 + sp * 0.0003 + (sk('avg') ? 0.012 : 0)) * m('babip');
    const chanceMul = sk('chance') ? 1.3 : 1;

    const st = G.emptyBat();
    st.g = 1;
    for (let i = 0; i < nPA; i++) {
      st.pa++;
      const r = Math.random();
      const rbi0 = st.rbi;
      let code = 'OUT';
      let onBase = 0; // 0:なし 1:単打/四球 2:二塁打 3:三塁打
      if (r < pHR) {
        st.ab++;
        st.h++;
        st.hr++;
        st.r++;
        st.rbi += 1 + Math.min(3, G.poisson(0.65 * chanceMul));
        code = 'HR';
      } else if (r < pHR + pBB) {
        st.bb++;
        onBase = 1;
        code = 'BB';
        if (G.chance(0.01)) st.rbi++;
      } else if (r < pHR + pBB + pK) {
        st.ab++;
        st.k++;
        code = 'K';
      } else {
        st.ab++;
        if (G.chance(babip)) {
          st.h++;
          const x = Math.random();
          const pD = (0.17 + pw * 0.0012) * m('xbh');
          const pT = 0.012 + sp * 0.0004;
          if (x < pT) {
            st.t++;
            onBase = 3;
            code = '3B';
            st.rbi += Math.min(3, G.poisson(0.7 * chanceMul));
          } else if (x < pT + pD) {
            st.d++;
            onBase = 2;
            code = '2B';
            st.rbi += Math.min(3, G.poisson(0.5 * chanceMul));
          } else {
            onBase = 1;
            code = '1B';
            st.rbi += Math.min(2, G.poisson(0.28 * chanceMul));
          }
        } else if (G.chance(0.035)) {
          st.rbi++; // 犠飛・内野ゴロの間
        }
      }
      if (onBase) {
        let scoreP = onBase === 1 ? 0.3 + sp * 0.002 : onBase === 2 ? 0.5 + sp * 0.002 : 0.78;
        if (onBase === 1) {
          const attempt = Math.min(0.6, (sp >= 55 ? (sp - 50) * 0.006 * (sk('steal') ? 1.5 : 1) : 0.01) * m('sb'));
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
      if (out) out.push({ code, rbi: st.rbi - rbi0 });
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
  // opts.mods: 作戦による補正（run/hit/k/bb/hr の倍率）、opts.out: イニングごとの失点を入れる配列
  G.simPitching = (p, innings, levelOffset, opts = {}) => {
    const pr = G.pitchParams(p, levelOffset);
    const md = opts.mods || {};
    for (const [k, key] of [['run', 'runL'], ['hit', 'hitL'], ['k', 'kL'], ['bb', 'bbL'], ['hr', 'hrL']]) if (md[k] !== undefined) pr[key] *= md[k];
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
      if (opts.out) opts.out.push(r);
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
