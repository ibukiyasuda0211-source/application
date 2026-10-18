// 相性とデータ（左右・投手のタイプ・球場・対戦球団）
// ・能力値だけでなく、相手や球場との相性で結果が変わる
// ・「対策」に経験点を使うと、苦手な相手を克服できる
// ・成績は条件ごとに記録され、「データ」タブでグラフにして分析できる
(function () {
  const G = window.G;

  // ---------- 球場（ホームチームごと） ----------
  // hr：本塁打の出やすさ（1.0が平均）
  G.PARKS = {
    tokyo: { name: '東京ギャラクシードーム', hr: 1.22, dome: true },
    yokohama: { name: '横浜オーシャンスタジアム', hr: 1.15 },
    nagoya: { name: '名古屋ドラグーンドーム', hr: 0.8, dome: true },
    osaka: { name: '大阪ブレイカーズ球場', hr: 0.88 },
    hiroshima: { name: '広島スカーレットパーク', hr: 1.0 },
    chiba: { name: '千葉マリンフィールド', hr: 0.92 },
    sapporo: { name: '札幌ノーザンドーム', hr: 0.85, dome: true },
    sendai: { name: '仙台フェニックスパーク', hr: 0.95 },
    saitama: { name: '埼玉ライトニングドーム', hr: 1.06, dome: true },
    kyoto: { name: '京都エンペラーズドーム', hr: 0.9, dome: true },
    fukuoka: { name: '福岡ファルコンズドーム', hr: 1.04, dome: true },
    okinawa: { name: '沖縄シーサースタジアム', hr: 1.1 },
    m_ny: { name: 'エンパイア・パーク', hr: 1.15 },
    m_la: { name: 'サンセット・スタジアム', hr: 0.95 },
    m_bos: { name: 'ハーバー・フィールド', hr: 1.05 },
    m_chi: { name: 'ウィンディ・フィールド', hr: 1.06 },
    m_sf: { name: 'ベイサイド・パーク', hr: 0.84 },
    m_sea: { name: 'レイニア・フィールド', hr: 0.9 },
    m_tex: { name: 'ローンスター・パーク', hr: 1.05 },
    m_atl: { name: 'ピーチツリー・パーク', hr: 1.0 },
    m_tor: { name: 'オーロラ・センター', hr: 1.05, dome: true },
    m_mia: { name: 'フラミンゴ・パーク', hr: 0.86, dome: true },
  };
  G.parkOf = (teamId) => G.PARKS[teamId] || { name: `${G.teamById(teamId).short}の本拠地`, hr: 1 };
  G.parkLabel = (pk) => (pk.hr >= 1.1 ? '本塁打が出やすい' : pk.hr <= 0.9 ? '本塁打が出にくい' : '標準的');
  const parkIdOf = (s, ctx) => ctx.parkId || (ctx.home ? s.player.teamId : ctx.oppId);

  // 球場ごとの「なぜか打てる・打てない」（隠れた相性。データを見ると気づける）
  G.parkAff = (p, tid) => {
    p.parkAff = p.parkAff || {};
    if (p.parkAff[tid] === undefined) p.parkAff[tid] = Math.round(G.clamp(G.gauss(0, 1.5), -3.5, 3.5) * 2) / 2;
    return p.parkAff[tid];
  };

  // ---------- 対策（相性）の値 -6〜+6 ----------
  G.MU_DEFS = {
    bat: [
      { id: 'vsL', name: '対左投手', desc: '左投手の球の見え方に慣れる' },
      { id: 'vsR', name: '対右投手', desc: '右投手との対戦を研究する' },
      { id: 'fast', name: '速球対策', desc: '速球派・エース級の速い球に振り負けない' },
      { id: 'breaking', name: '変化球対策', desc: '軟投派・技巧派の変化球を見極める' },
    ],
    pit: [
      { id: 'vsL', name: '対左打者', desc: '左打者の内角を攻める' },
      { id: 'vsR', name: '対右打者', desc: '右打者の外角を磨く' },
      { id: 'power', name: '長距離砲対策', desc: '一発のある打者を封じる' },
      { id: 'contact', name: '巧打者対策', desc: 'しぶとい打者を打ち取る' },
    ],
  };
  G.MU_MAX = 6;

  G.ensureMU = (p) => {
    if (p.mu) return p.mu;
    const r = () => Math.round(G.gauss(0, 1) * 2) / 2;
    if (G.isPitcher(p)) {
      const lefty = p.throws === 'L';
      p.mu = { vsL: (lefty ? 2 : -1.5) + r(), vsR: (lefty ? -1 : 1) + r(), power: r(), contact: r() };
    } else {
      const b = p.bats;
      p.mu = { vsL: (b === 'L' ? -3 : b === 'S' ? 0 : 1) + r(), vsR: (b === 'L' ? 1 : b === 'S' ? 0 : -1) + r(), fast: r() * 1.4, breaking: r() * 1.4 };
    }
    for (const k in p.mu) p.mu[k] = G.clamp(p.mu[k], -G.MU_MAX, G.MU_MAX);
    return p.mu;
  };

  G.muCost = (v) => ({ technique: Math.round(40 + (v + G.MU_MAX) * 12), mind: Math.round(25 + (v + G.MU_MAX) * 8) });
  G.raiseMU = (p, id) => {
    const mu = G.ensureMU(p);
    if (mu[id] === undefined || mu[id] >= G.MU_MAX) return false;
    const cost = G.muCost(mu[id]);
    if (!G.canAfford(p, cost)) return false;
    G.payCost(p, cost);
    mu[id] = Math.min(G.MU_MAX, Math.floor(mu[id] + 1));
    p.muRaised = (p.muRaised || 0) + 1;
    return true;
  };
  G.muGrade = (v) => (v >= 4 ? '◎' : v >= 1.5 ? '○' : v > -1.5 ? '－' : v > -4 ? '△' : '×');

  // ---------- 試合ごとの条件 ----------
  // 相手先発の利き腕、相手打線の左右
  G.on('ownGame:prepare', (s, ctx) => {
    if (ctx.oppP) ctx.oppP.hand = G.chance(0.32) ? 'L' : 'R';
    if (ctx.kind === 'pit') ctx.lineupHand = G.weighted([{ v: 'L', weight: 3 }, { v: 'R', weight: 4 }, { v: 'mix', weight: 3 }]).v;
  });
  G.HAND_NAME = { L: '左腕', R: '右腕' };
  G.LINEUP_HAND = { L: '左打者が多い', R: '右打者が多い', mix: '左右バランス型' };
  const ptypeGroup = (t) => (t === 'fast' || t === 'ace' ? 'fast' : t === 'soft' || t === 'control' ? 'breaking' : null);
  const lineupGroup = (t) => (t === 'slugger' ? 'power' : t === 'contact' ? 'contact' : null);

  // 相性による出来の上下（能力値に足す補正）
  G.matchParts = (s, ctx) => {
    const p = s.player;
    const mu = G.ensureMU(p);
    const parts = [];
    const tid = parkIdOf(s, ctx);
    const aff = G.parkAff(p, tid);
    if (ctx.kind === 'bat' && ctx.oppP) {
      const h = ctx.oppP.hand || 'R';
      parts.push({ key: h === 'L' ? 'vsL' : 'vsR', v: mu[h === 'L' ? 'vsL' : 'vsR'] * 0.8 });
      const g = ptypeGroup(ctx.oppP.type);
      if (g) parts.push({ key: g, v: mu[g] * 0.6 });
    } else if (ctx.kind === 'pit') {
      const h = ctx.lineupHand || 'mix';
      if (h === 'mix') parts.push({ key: 'mix', v: (mu.vsL + mu.vsR) * 0.35 });
      else parts.push({ key: h === 'L' ? 'vsL' : 'vsR', v: mu[h === 'L' ? 'vsL' : 'vsR'] * 0.7 });
      const g = lineupGroup(ctx.lineup);
      if (g) parts.push({ key: g, v: mu[g] * 0.5 });
    }
    parts.push({ key: 'park', v: aff });
    return parts;
  };

  // 試合での出来に足す補正（相性＋MLBでの疲労・適応など）
  G.gameOffset = (s, ctx) => {
    let off = G.matchParts(s, ctx).reduce((a, x) => a + x.v, 0);
    if (G.mlbOffset) off += G.mlbOffset(s);
    return off;
  };

  // 球場の広さ（本塁打の出やすさ）と相性による補正を、打球・三振の出やすさに変える
  G.envMods = (s, ctx) => {
    const pk = G.parkOf(parkIdOf(s, ctx));
    const v = G.clamp(G.gameOffset(s, ctx), -8, 8);
    if (ctx.kind === 'pit') return { hr: pk.hr * (1 - v * 0.03), run: 1 - v * 0.03, hit: 1 - v * 0.015, k: 1 + v * 0.02 };
    return { hr: pk.hr * (1 + v * 0.04), babip: 1 + v * 0.012, k: 1 - v * 0.025, xbh: 1 + v * 0.02 };
  };

  // ---------- 条件別の成績を記録 ----------
  const bucket = (s) => {
    if (!s.splits || s.splits.year !== s.year) s.splits = { year: s.year, season: {}, career: (s.splits && s.splits.career) || {} };
    return s.splits;
  };
  const add = (store, key, line, pit) => {
    store[key] = store[key] || (pit ? G.emptyPit() : G.emptyBat());
    G.addStats(store[key], line);
  };

  G.on('ownGame:result', (s, ctx, res) => {
    if (!res || !res.kind || !res.line || ctx.special) return; // 代表の試合はシーズンの記録に入れない
    const sp = bucket(s);
    const pit = res.kind === 'pit';
    if (!pit && !res.line.pa) return;
    const keys = [`park:${parkIdOf(s, ctx)}`, `opp:${ctx.oppId}`];
    if (!pit && ctx.oppP) {
      keys.push(`hand:${ctx.oppP.hand || 'R'}`, `ptype:${ctx.oppP.type}`);
      res.matchInfo = { hand: ctx.oppP.hand, park: parkIdOf(s, ctx) };
    }
    if (pit) {
      keys.push(`lhand:${ctx.lineupHand || 'mix'}`, `lineup:${ctx.lineup}`);
      res.matchInfo = { lhand: ctx.lineupHand, park: parkIdOf(s, ctx) };
    }
    for (const k of keys) {
      add(sp.season, k, res.line, pit);
      add(sp.career, k, res.line, pit);
    }
  });

  // ---------- 表示用 ----------
  G.splitValue = (line, pit) => {
    if (!line) return null;
    if (pit) return line.outs ? (line.er * 27) / line.outs : null;
    return line.pa ? G.batDerived(line).ops : null;
  };

  // 今日の試合の見どころ（データと相性）
  G.matchupHint = (s, own) => {
    const p = s.player;
    const pit = own.kind === 'pit';
    const sp = bucket(s).career;
    const items = [];
    const tid = parkIdOf(s, own);
    const pk = G.parkOf(tid);
    const fmt = (key) => {
      const l = sp[key];
      if (!l) return 'データなし';
      return pit ? `防御率${G.fmtERA(l.er, l.outs)}（${G.fmtIP(l.outs)}回）` : `打率${G.fmtRate(l.h, l.ab)}・${l.hr}本（${l.ab}打数）`;
    };
    const mu = G.ensureMU(p);
    if (!pit && own.oppP) {
      const h = own.oppP.hand || 'R';
      items.push({ label: `対${h === 'L' ? '左' : '右'}投手`, grade: G.muGrade(mu[h === 'L' ? 'vsL' : 'vsR']), data: fmt(`hand:${h}`) });
      const g = ptypeGroup(own.oppP.type);
      if (g) items.push({ label: g === 'fast' ? '速球対策' : '変化球対策', grade: G.muGrade(mu[g]), data: fmt(`ptype:${own.oppP.type}`) });
    }
    if (pit) {
      const h = own.lineupHand || 'mix';
      items.push({ label: G.LINEUP_HAND[h], grade: G.muGrade(h === 'mix' ? (mu.vsL + mu.vsR) / 2 : mu[h === 'L' ? 'vsL' : 'vsR']), data: fmt(`lhand:${h}`) });
    }
    const pd = sp[`park:${tid}`];
    items.push({ label: `${pk.name}（${G.parkLabel(pk)}）`, grade: null, data: fmt(`park:${tid}`), few: !pd || (pit ? pd.outs < 27 : pd.ab < 20) });
    return items;
  };

  G.splitsFor = (s, scope) => {
    const sp = bucket(s);
    return scope === 'career' ? sp.career : sp.season;
  };
})();
