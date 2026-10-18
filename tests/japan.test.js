// 侍ジャパン：選出 → 宮崎合宿（仲間・首脳陣と話す）→ 強化試合で役割が決まる → 本大会 → 解散、と11月のシリーズ
const { load, drain, newPlayer } = require('./lib/game');

// 1週間すすめる（シーズン中の試合もまとめて）
const oneWeek = (G, s) => {
  drain(G, s);
  if (s.retired) return;
  const w = s.week;
  const opts = G.trainingOptions(s);
  G.doAction(s, opts[0].id, 'relax');
  for (let i = 0; s.gw && i < 20; i++) G.stepGames(s, null);
  if (s.week === w) throw new Error(`${s.year}年${w}週目から進まない`);
};

// 指定の選択肢が出るまで、ほかの場面を進める
const drainUntil = (G, s, id) => {
  for (let i = 0; s.queue.length && s.queue[0].id !== id && i < 200; i++) {
    if (s.queue[0].kind === 'info') G.dismissScene(s);
    else G.resolveScene(s, 0, s.queue[0].input);
  }
  return s.queue.length > 0 && s.queue[0].id === id;
};

// 毎年、前年に大活躍したことにして代表に選ばれやすくする
const star = (s) => {
  const last = s.career[s.career.length - 1];
  if (last) last.war = 8;
};

module.exports = [
  {
    name: '侍ジャパン：合宿・交流・役割・本大会・解散',
    run() {
      const G = load();
      const fails = [];
      const s = newPlayer(G, 'SS', { ability: 80, trust: 90 });
      s.flags.gameMode = 'auto';
      let picked = false;
      for (let i = 0; i < 400 && !picked && !s.retired; i++) {
        star(s);
        if (drainUntil(G, s, 'intl_select')) picked = true;
        else oneWeek(G, s);
      }
      if (!picked) return ['日本代表に選ばれない'];
      const t = s.intl;
      const sq = G.jpSquad(s);
      if (sq.length !== 29) fails.push(`代表の人数が${sq.length + 1}人（30人のはず）`);
      if (new Set(sq.map((x) => x.name)).size !== sq.length || sq.some((x) => x.name === s.player.name)) fails.push('代表に同じ名前の選手がいる');
      if (sq.some((x) => !x.mlb && x.rosterId === undefined && !x.pid && x.team === s.player.teamId)) fails.push('チームの名簿にいない「チームメイト」が代表にいる');
      if (sq.filter((x) => x.pos === 'P').length < 13) fails.push('投手が少なすぎる');
      if (!s.queue[0].text.includes('監督は')) fails.push('選出の知らせに監督の名前がない');
      drain(G, s); // 代表入りを受ける
      if (!t.accepted) return [...fails, '代表入りを受けられない'];

      // 合宿まで進める
      const d = G.intlDates(s.year);
      for (let i = 0; i < 20 && s.week < d.campW; i++) oneWeek(G, s);
      if (!G.onJapanDuty(s)) fails.push('合宿の週なのに代表の活動中になっていない');
      const opts = G.trainingOptions(s).map((o) => o.id);
      if (!s.player.injury && (!opts.includes('jp_appeal') || opts.includes('batting'))) fails.push(`合宿中の練習メニューがおかしい：${opts.join(',')}`);
      if (s.player.injury && opts.some((o) => o === 'jp_appeal' || o === 'batting')) fails.push('ケガをしているのに代表の練習ができる');
      if (G.canTalk(s, s.roster.players[0], 'baseball') !== '侍ジャパンの活動中') fails.push('合宿中にチームメイトと話せてしまう');

      // 仲間と話す（週3回まで・同じ人は週1回）
      const ok = sq.filter((x) => !x.mlb);
      const r1 = G.jpTalk(s, ok[0], 'baseball');
      if (!r1.ok) fails.push(`話しかけられない：${r1.text}`);
      if (G.jpTalk(s, ok[0], 'joke').ok) fails.push('同じ選手と週に何度も話せる');
      G.jpTalk(s, ok[1], 'hobby');
      G.jpTalk(s, ok[2], 'baseball');
      if (G.jpTalk(s, ok[3], 'baseball').ok) fails.push('週4回以上話せてしまう');
      const mlb = sq.find((x) => x.mlb);
      if (mlb && G.jpCanTalk(s, mlb, 'mlb') !== 'まだチームに合流していない') fails.push('合流前のメジャー組と話せる');
      // 首脳陣と話す（それぞれ週1回）
      const mgr = s.japan.staff.manager;
      const e0 = t.eval;
      const r2 = G.jpStaffTalk(s, mgr, 'resolve');
      if (!r2.ok || !(t.eval > e0)) fails.push('監督に意気込みを伝えても評価が変わらない');
      if (G.jpStaffTalk(s, mgr, 'role').ok) fails.push('監督と週に2回話せる');
      const coach = s.japan.staff.coaches.find((c) => c.key === 'bat');
      s.player.exp.technique = 0;
      const exp0 = s.player.exp.technique;
      if (!G.jpStaffTalk(s, coach, 'coach').ok || s.player.exp.technique <= exp0) fails.push('打撃コーチの指導で経験点が入らない');

      // 仲良くなると人間関係に加わる
      const x = ok[4];
      x.aff = 39;
      x.persona = 'cheerful';
      const r3 = (() => {
        s.intl.talkN = 0;
        return G.jpTalk(s, x, 'joke');
      })();
      if (!r3.ok || !s.people[`jp_${x.id}`] || s.people[`jp_${x.id}`].group !== 'japan') fails.push('仲良くなった代表仲間が人間関係に加わらない');

      // 本大会が終わるまで
      let roleSet = false;
      const year = s.year;
      for (let i = 0; i < 12 && s.intl; i++) {
        oneWeek(G, s);
        if (s.intl && s.intl.roleSet) roleSet = true;
        if (s.intl && G.onJapanDuty(s)) {
          const m = G.jpSquad(s).find((y) => y.mlb);
          if (m && s.week > d.exhibitW && G.jpCanTalk(s, m, 'mlb') === 'まだチームに合流していない') fails.push('強化試合のあともメジャー組が合流していない');
        }
      }
      drain(G, s);
      if (!roleSet) fails.push('本番の役割が決まらない');
      if (s.intl) fails.push('本大会が終わらない');
      const h = (s.intlHist || []).find((y) => y.year === year && y.type !== 'series');
      if (!h) fails.push('大会の記録が残らない');
      if (s.japan.trust === null) fails.push('監督の評価が次に引き継がれない');
      if (!G.jpFriends(s).length) fails.push('大会のあと代表仲間がいなくなった');
      if (!G.privateActions(s).some((a) => a.id.startsWith('jpf:'))) fails.push('代表仲間に連絡する行動がない');
      if (G.trainingOptions(s).some((o) => o.japan)) fails.push('大会のあとも代表の練習メニューが出る');
      return { fails, note: `${h ? h.result : '-'}・役割 ${h ? h.role : '-'}・代表仲間${G.jpFriends(s).length}人` };
    },
  },
  {
    name: '侍ジャパンシリーズ（11月の強化試合）',
    run() {
      const G = load();
      const fails = [];
      const s = newPlayer(G, 'P', { ability: { velocity: 152, control: 75, stamina: 70 }, trust: 90 });
      s.flags.gameMode = 'auto';
      // 選考の週にケガやメジャー移籍でいないことがないように
      G.on('mlbCheck', () => true);
      s.player.skills.push('durable');
      let picked = false;
      for (let i = 0; i < 700 && !picked && !s.retired; i++) {
        if (drainUntil(G, s, 'jp_series_select')) picked = true;
        else {
          // 今季の活躍を大きく見せる
          s.stats.pit.outs = Math.max(s.stats.pit.outs, 500);
          s.stats.pit.er = Math.min(s.stats.pit.er, 20);
          oneWeek(G, s);
        }
      }
      if (!picked) return ['侍ジャパンシリーズに選ばれない'];
      const year = s.year;
      if (G.jpSquad(s).some((x) => x.mlb)) fails.push('シリーズにメジャー組がいる');
      drain(G, s);
      for (let i = 0; i < 4 && s.intl; i++) oneWeek(G, s);
      drain(G, s);
      if (s.intl) fails.push('シリーズが終わらない');
      const h = (s.intlHist || []).find((y) => y.year === year && y.type === 'series');
      if (!h) fails.push('シリーズの記録が残らない');
      if (s.japan.trust === null) fails.push('シリーズでの評価が残らない');
      // 監督が同じなら、翌年の本大会の選考に評価が効く
      const before = G.jpSelectBonus(s);
      s.japan.trust = 90;
      if (!(G.jpSelectBonus(s) > before || before > 0)) fails.push('監督の評価が選考に効かない');
      return { fails, note: h ? `${h.result}・${h.text}` : '' };
    },
  },
  {
    name: '侍ジャパンの試合も1試合ずつ操作できる（シーズンの成績には入らない）',
    run() {
      const G = load();
      const fails = [];
      const s = newPlayer(G, 'SS', { ability: 80, trust: 90 });
      s.flags.gameMode = 'auto';
      let picked = false;
      for (let i = 0; i < 400 && !picked && !s.retired; i++) {
        star(s);
        if (drainUntil(G, s, 'intl_select')) picked = true;
        else oneWeek(G, s);
      }
      if (!picked) return ['日本代表に選ばれない'];
      drain(G, s);
      const d = G.intlDates(s.year);
      for (let i = 0; i < 20 && s.week < d.exhibitW - 1; i++) oneWeek(G, s);
      // ここからは1試合ずつ
      s.flags.gameMode = 'each';
      let awaited = 0;
      let clutches = 0;
      let jpBoxes = 0;
      let playedJp = 0;
      const seasonPA0 = s.stats.bat.pa;
      const year = s.year;
      let npbAfter = 0;
      for (let wk = 0; wk < 8 && s.intl && s.year === year; wk++) {
        drain(G, s);
        if (!s.intl) break;
        const opts = G.trainingOptions(s);
        G.doAction(s, (opts.find((o) => o.id === 'jp_tune') || opts[0]).id, 'relax'); // ケガで離脱しないよう調整中心
        for (let i = 0; s.gw && i < 40; i++) {
          if (s.gw.await) {
            if (s.gw.cur.special) awaited++;
            G.stepGames(s, G.approachList(s.player)[1].id);
          } else if (s.gw.awaitClutch) {
            clutches++;
            G.stepGames(s, null, G.clutchChoices(s, s.gw.cur.own)[0].id);
          } else {
            const r = s.gw.last;
            if (r && r.special && r.kind) playedJp++;
            if (r && r.special && r.box && (r.box.homeT.id === 'n_jpn' || r.box.away.id === 'n_jpn')) jpBoxes++;
            if (r && !r.special) npbAfter++;
            G.stepGames(s, null);
          }
        }
      }
      drain(G, s);
      const h = (s.intlHist || []).find((x) => x.year === year && x.type !== 'series');
      // 出番のあった代表戦は、すべて作戦を選べる（ケガで出られない試合もある）
      if (!playedJp) fails.push('代表の試合に一度も出られない');
      if (awaited !== playedJp) fails.push(`出番のあった代表戦${playedJp}試合のうち、作戦を選べたのは${awaited}試合`);
      if (playedJp && !jpBoxes) fails.push('スコアボードに「日本」が出ない');
      if (!h) fails.push('大会の記録が残らない');
      else if (!/打数/.test(h.text)) fails.push(`大会の成績がおかしい：${h.text}`);
      // 代表の打席はシーズンの成績に入らない（開幕前の週）。開幕と重なった週はシーズンの試合も遊べる
      const npbPA = s.stats.bat.pa - seasonPA0;
      if (npbAfter === 0 && npbPA > 0) fails.push('代表の打席がシーズンの成績に入っている');
      return { fails, note: `作戦を選んだ代表戦${awaited}試合・ここぞ${clutches}回・${h ? h.result : '-'}（${h ? h.text : ''}）${npbAfter ? `・同じ週のシーズン戦${npbAfter}試合` : ''}` };
    },
  },
];
