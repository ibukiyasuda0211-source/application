// 国際大会（3年に1度、3月の「世界野球クラシック」。成績上位の年だけ日本代表に選ばれる）
(function () {
  const G = window.G;

  G.INTL_NAME = '世界野球クラシック';
  G.isIntlYear = (year) => year % 3 === 2;

  const DAY = 86400000;
  const addDays = (d, n) => new Date(d.getTime() + n * DAY);
  // 1次ラウンドは3月5日以降の最初の木曜から4試合。準々決勝はその6日後、準決勝・決勝はさらに5〜6日後
  G.intlDates = (year) => {
    const mar5 = new Date(Date.UTC(year, 2, 5));
    const pool = addDays(mar5, (4 - mar5.getUTCDay() + 7) % 7);
    const d = {
      announce: addDays(pool, -24),
      pool,
      qf: addDays(pool, 6),
      sf: addDays(pool, 11),
      final: addDays(pool, 12),
    };
    const out = {};
    for (const k in d) {
      out[k] = G.ymd(d[k]);
      out[`${k}W`] = G.weekOfDate(year, d[k]);
    }
    return out;
  };

  const POOL_OPP = ['韓国', 'オーストラリア', 'チェコ', '中国', '台湾'];
  const QF_OPP = ['イタリア', 'メキシコ', 'プエルトリコ', 'オランダ', 'キューバ'];
  const SF_OPP = ['メキシコ', 'ベネズエラ', 'ドミニカ共和国', 'プエルトリコ'];
  const FINAL_OPP = ['アメリカ', 'ドミニカ共和国', 'アメリカ'];

  // 前年の働きで選考（タイトル・WAR・人気・能力）
  const selection = (s) => {
    const p = s.player;
    if (s.retired || s.after || p.injury) return null;
    const last = s.career[s.career.length - 1];
    if (!last) return null;
    const ov = G.overall(p);
    const titles = (last.titles || []).filter((t) => !['メジャー挑戦'].includes(t)).length;
    const score = last.war * 1.2 + titles * 1.5 + Math.max(0, p.popularity - 50) * 0.04 + Math.max(0, ov - 60) * 0.12;
    if (score < 3.6) return null;
    let role;
    if (G.isPitcher(p)) role = p.role === 'SP' ? 'SP' : p.role === 'CL' && score >= 6 ? 'CL' : 'RP';
    else role = score >= 8 ? 'cleanup' : score >= 5.2 ? 'starter' : 'bench';
    return { role, score };
  };

  const ROLE_NAME = { SP: '先発投手', RP: '中継ぎ', CL: '抑え', cleanup: '4番打者', starter: 'スタメン', bench: '控え野手' };

  // 1試合分の自分の働きと試合結果
  const playGame = (s, t, stage, opp, idx = 0) => {
    const p = s.player;
    const off = [2, -1, -3, -4][stage]; // 国際大会の相手の手ごわさ（所属リーグに関係なく）
    const base = [0.8, 0.7, 0.6, 0.55][stage];
    const g = { opp, stage };
    let pWin = base;
    if (G.isPitcher(p)) {
      // 先発は1次ラウンドの2戦目と決勝に登板
      const starts = t.role === 'SP' && ((stage === 0 && idx === 1) || stage === 3);
      if (starts) {
        const st = G.simPitching(p, stage === 0 ? 4 : 5, off, { starter: true });
        st.gs = 1;
        g.line = st;
        pWin = G.clamp(base + (1.5 - st.r) * 0.06, 0.2, 0.92);
      } else if (G.chance(t.role === 'CL' ? 0.6 : 0.45)) {
        const st = G.simPitching(p, 1, off);
        g.line = st;
        pWin = G.clamp(base - st.r * 0.12, 0.15, 0.9);
      }
    } else {
      const nPA = t.role === 'bench' ? (G.chance(0.5) ? 1 : 0) : G.chance(0.4) ? 5 : 4;
      if (nPA) {
        const st = G.simPlateAppearances(p, nPA, off);
        st.g = 1;
        g.line = st;
        pWin = G.clamp(base + G.batGameValue(st) * 0.03, 0.15, 0.93);
      }
    }
    const win = G.chance(pWin);
    let ours;
    let theirs;
    if (g.line && G.isPitcher(p)) {
      theirs = g.line.r + (g.line.gs ? G.poisson(1.2) : G.poisson(1.8));
      if (win) ours = theirs + G.ri(1, 4);
      else {
        if (theirs === 0) theirs = 1;
        ours = Math.max(0, theirs - G.ri(1, 3));
      }
      if (g.line.gs && win && g.line.outs >= 12 && g.line.r < ours && G.chance(0.55)) g.line.w = 1;
      if (g.line.gs && !win && g.line.r > ours) g.line.l = 1;
      if (!g.line.gs && t.role === 'CL' && win && ours - theirs <= 3 && g.line.r === 0) g.line.s = 1;
    } else {
      const sc = G.scoreline(win, false, g.line ? Math.max(g.line.rbi, g.line.r) : 0);
      [ours, theirs] = sc;
    }
    g.win = ours > theirs;
    g.score = [ours, theirs];
    return g;
  };

  const lineText = (p, g) => (!g.line ? '出場なし' : G.isPitcher(p) ? G.pitLineText(g.line) : G.batLineText(g.line));
  const gameText = (s, g) => `vs ${g.opp}　${g.win ? '○' : '●'} ${g.score[0]}-${g.score[1]}｜${lineText(s.player, g)}`;

  const total = (s, t) => {
    const acc = G.isPitcher(s.player) ? G.emptyPit() : G.emptyBat();
    for (const g of t.games) if (g.line) G.addStats(acc, g.line);
    return acc;
  };

  const finish = (s, t, result) => {
    const p = s.player;
    t.result = result;
    const tot = total(s, t);
    t.text = G.isPitcher(p) ? G.pitLineText(tot) : G.batLineText(tot);
    s.intlHist = s.intlHist || [];
    s.intlHist.push({ year: s.year, role: t.role, result, text: t.text, mvp: !!t.mvp, hr: tot.hr || 0, w: tot.w || 0, s: tot.s || 0 });
    s.intl = null;
  };

  // 大会の各ステージ（scheduled から呼ばれる）
  const runStage = (s, stage) => {
    const p = s.player;
    const t = s.intl;
    if (!t || !t.accepted) return;
    if (p.injury) {
      G.scene(s, G.INTL_NAME, 'ケガのため、日本代表を途中離脱することになった…。仲間たちの戦いをテレビで見守った。');
      finish(s, t, '途中離脱');
      return;
    }
    const games = [];
    if (stage === 0) {
      const opps = G.shuffle(POOL_OPP).slice(0, 4);
      opps.forEach((o, i) => games.push(playGame(s, t, 0, o, i)));
    } else if (stage === 1) games.push(playGame(s, t, 1, G.pick(QF_OPP)));
    else {
      const sf = playGame(s, t, 2, G.pick(SF_OPP));
      games.push(sf);
      if (sf.win) games.push(playGame(s, t, 3, G.pick(FINAL_OPP)));
    }
    t.games.push(...games);
    p.stamina = G.clamp(p.stamina - 8 * games.length * (G.isPitcher(p) ? 1.2 : 0.6), 0, 100);
    const lines = games.map((g) => gameText(s, g)).join('\n');
    const head = ['1次ラウンド（東京ラウンド）', '準々決勝', '準決勝・決勝（アメリカ・マイアミ）'][stage];
    if (stage === 0) {
      const wins = games.filter((g) => g.win).length;
      const pass = wins >= 3 || (wins === 2 && G.chance(0.5));
      G.scene(s, `${G.INTL_NAME} ${head}`, `${lines}\n\n${wins}勝${4 - wins}敗。${pass ? '1次ラウンドを突破した！ 次は準々決勝だ。' : '1次ラウンドで敗退…。日本中が肩を落とした。'}`);
      if (!pass) {
        G.buzz(s, 'intllose');
        finish(s, t, '1次ラウンド敗退');
      }
      return;
    }
    if (stage === 1) {
      const g = games[0];
      G.scene(s, `${G.INTL_NAME} ${head}`, `${lines}\n\n${g.win ? '準々決勝に勝利！ いよいよアメリカでの決戦へ。' : '準々決勝で敗退…。世界一の夢はここで途絶えた。'}`);
      if (!g.win) {
        G.buzz(s, 'intllose');
        finish(s, t, 'ベスト8');
      }
      return;
    }
    const [sf, fin] = games;
    if (!sf.win) {
      G.scene(s, `${G.INTL_NAME} ${head}`, `${lines}\n\n準決勝で惜しくも敗退…。ベスト4で大会を終えた。`);
      G.buzz(s, 'intllose');
      finish(s, t, 'ベスト4');
      return;
    }
    if (fin.win) {
      const tot = total(s, t);
      const star = G.isPitcher(p) ? (tot.outs >= 24 && (tot.er * 27) / tot.outs <= 2) || tot.s >= 2 || tot.w >= 2 : tot.pa >= 15 && G.batDerived(tot).ops >= 1.0;
      t.mvp = star && G.chance(0.55);
      s.titles.push({ year: s.year, name: `${G.INTL_NAME}優勝` });
      if (t.mvp) s.titles.push({ year: s.year, name: `${G.INTL_NAME}MVP` });
      s.history.push({ year: s.year, text: `日本代表として${G.INTL_NAME}で世界一${t.mvp ? '（大会MVP）' : ''}` });
      p.popularity = G.clamp(p.popularity + (t.mvp ? 12 : 8), 0, 100);
      G.addHappy(s, 15);
      G.buzz(s, 'worldchamp');
      G.scene(
        s,
        `${G.INTL_NAME} ${head}`,
        `${lines}\n\n🏆 世界一！！ 🏆\nマウンドに歓喜の輪ができる。日の丸を背負って、世界の頂点に立った！${t.mvp ? `\n\nさらに${p.name}が大会MVPに選ばれた！` : ''}`,
        { big: t.mvp ? '世界一・大会MVP' : '世界一' },
      );
      finish(s, t, '優勝');
    } else {
      G.scene(s, `${G.INTL_NAME} ${head}`, `${lines}\n\n決勝で敗れ、準優勝。あと一歩、世界一には届かなかった…。`);
      p.popularity = G.clamp(p.popularity + 3, 0, 100);
      G.buzz(s, 'intllose');
      finish(s, t, '準優勝');
    }
  };

  G.on('scheduled', (s) => {
    if (!G.isIntlYear(s.year) || s.retired || s.after) return;
    const d = G.intlDates(s.year);
    const w = s.week;
    if (w === d.announceW - 1) {
      const sel = selection(s);
      if (sel) {
        s.intl = { year: s.year, role: sel.role, accepted: false, games: [] };
        s.queue.push({
          kind: 'life',
          id: 'intl_select',
          title: '日本代表に選出！',
          text: `${G.fmtDate(d.announce)}、${G.INTL_NAME}の日本代表メンバーが発表された。\n\n「${s.player.name}」——${ROLE_NAME[sel.role]}として名前が呼ばれた！\n\n${G.fmtDate(d.pool)}から東京で1次ラウンド、決勝は${G.fmtDate(d.final)}にアメリカで行われる。`,
          data: {},
        });
      } else G.log(s, `${G.INTL_NAME}の日本代表メンバーが発表された。今回は選ばれなかった…。`, 'event', 'event');
    }
    if (s.intl && s.intl.accepted) {
      if (w === d.poolW) runStage(s, 0);
      else if (w === d.qfW && s.intl) runStage(s, 1);
      else if (w === d.finalW && s.intl) runStage(s, 2);
    }
  });

  G.LIFE_SCENES.intl_select = {
    choices: (s) => [
      {
        label: '日の丸を背負って戦う！',
        run: (s2) => {
          s2.intl.accepted = true;
          s2.flags.japanCount = (s2.flags.japanCount || 0) + 1;
          s2.history.push({ year: s2.year, text: `${G.INTL_NAME}の日本代表に選出` });
          G.buzz(s2, 'japan');
          return '侍のユニフォームに袖を通した。世界一を目指す戦いが始まる！' + G.applyFx(s2, { pop: 5, exp: { mind: 25 }, happy: 8 });
        },
      },
      {
        label: 'シーズンに備えて辞退する',
        run: (s2) => {
          s2.intl = null;
          return '所属球団での調整を優先し、代表を辞退した。「次こそは」と心に誓う。' + G.applyFx(s2, { pop: -2, stamina: 10 });
        },
      },
    ],
  };

  // カレンダー用の日程
  G.intlEvents = (s, year) => {
    if (!G.isIntlYear(year)) return [];
    const d = G.intlDates(year);
    const mine = (s.intlHist || []).find((x) => x.year === year);
    const out = [
      [d.announce, 'season', '🇯🇵 日本代表メンバー発表'],
      [d.pool, 'big', `🌏 ${G.INTL_NAME} 1次ラウンド開幕`],
      [d.qf, 'season', '🌏 準々決勝'],
      [d.sf, 'season', '🌏 準決勝'],
      [d.final, 'big', `🌏 ${G.INTL_NAME} 決勝`],
    ];
    if (mine) out.push([d.final, 'achv', `🇯🇵 日本代表：${mine.result}`]);
    return out;
  };
})();
