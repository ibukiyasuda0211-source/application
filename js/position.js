// ポジション変更（自分から相談する／首脳陣から打診される）
(function () {
  const G = window.G;
  const fx = (s, f) => G.applyFx(s, f);
  const posName = (id) => G.posById(id).name;
  const roleName = (id) => G.PREF_ROLES.find((r) => r.id === id).name;

  // 野手：その守備位置のレギュラーより自分が上か
  const rivalAt = (s, pos) => {
    if (!s.roster) return null;
    const same = s.roster.players.filter((m) => m.pos === pos).sort((a, b) => b.rating - a.rating);
    if (!same.length) return null;
    return pos === 'OF' ? same[Math.min(2, same.length - 1)] : same[0];
  };

  const fitRank = (v) => G.rank(Math.round(v));

  G.canConsultPosition = (s) => {
    if (s.retired || s.after) return '現役のときだけ';
    const last = s.flags.posConsultAt;
    if (last && G.absWeek(s) - last < 8) return `次に相談できるのは${8 - (G.absWeek(s) - last)}週後`;
    return '';
  };

  G.startPositionConsult = (s) => {
    const p = s.player;
    s.flags.posConsultAt = G.absWeek(s);
    const coach = s.people.coach.name;
    s.queue.push({
      kind: 'life',
      id: 'pos_request',
      title: 'ポジションの相談',
      text: G.isPitcher(p)
        ? `${coach}「どうした？ 役割のことで話があるのか」\n\n今の希望は「${roleName(p.prefRole || 'SP')}」。どの役割に挑戦したいと伝える？`
        : `${coach}「どうした？ ポジションのことで話があるのか」\n\n今は${posName(p.position)}。どこを守りたいと伝える？（カッコ内は今の能力での適性）`,
      data: {},
    });
    return `${coach}に、ポジションについて相談することにした。`;
  };

  // ---------- 判定 ----------
  const batterRequest = (s, pos) => {
    const p = s.player;
    const fit = G.posFit(p, pos);
    const u = G.ensureUsage(s);
    const benched = p.squad === 'second' || u.status !== 'starter';
    const rv = rivalAt(s, pos);
    const weakRival = rv && rv.rating < G.overall(p) - 2;
    let pr = 0.3 + (fit - 55) * 0.02 + (benched ? 0.2 : -0.15) + (s.people.coach.aff - 40) * 0.004 + (weakRival ? 0.15 : 0);
    if (pos === '1B') pr += 0.1;
    pr = G.clamp(pr, 0.05, 0.9);
    const coach = s.people.coach.name;
    if (G.chance(pr)) {
      G.applyPositionChange(s, pos);
      s.history.push({ year: s.year, text: `${posName(pos)}にコンバート` });
      G.buzz(s, 'poschange', { pos: posName(pos) });
      return `${coach}「わかった、監督にも話しておく。${posName(pos)}で勝負してみろ。慣れるまではミスも出るぞ」\n\n${posName(pos)}への挑戦が決まった！（新しいポジションに慣れるまで40試合ほどかかる）` + fx(s, { happy: 4, aff: { coach: 3 } });
    }
    if (fit < 50) return `${coach}「今のお前の守備力だと、${posName(pos)}は厳しい。まずは今のポジションで結果を出せ」` + fx(s, { happy: -2 });
    if (!benched) return `${coach}「チームとしては、今は${posName(p.position)}のお前が必要なんだ。もう少し待ってくれ」` + fx(s, { trust: 1 });
    return `${coach}「気持ちはわかる。だが${posName(pos)}には${rv ? rv.name : '別の選手'}がいる。今はチャンスを待て」` + fx(s, { happy: -2 });
  };

  const pitcherRequest = (s, role) => {
    const p = s.player;
    const st = p.pitcher.stamina;
    const exp = G.expERA(s);
    const bar = s.flags.barERA || 4;
    let pr;
    if (role === 'SP') pr = st >= 55 ? 0.65 : st >= 45 ? 0.35 : 0.05;
    else if (role === 'CL') pr = exp <= bar - 0.4 ? 0.55 : exp <= bar ? 0.3 : 0.1;
    else pr = 0.7;
    pr = G.clamp(pr + (s.people.coach.aff - 40) * 0.004, 0.05, 0.9);
    const coach = s.people.coach.name;
    if (G.chance(pr)) {
      p.prefRole = role;
      if (p.squad === 'first') G.assignRole(s);
      s.history.push({ year: s.year, text: `${roleName(role)}に転向` });
      const now = p.squad === 'first' ? `\n（現在の起用：${G.roleName(p)}）` : '\n（まずは2軍で試していく）';
      return `${coach}「よし、${roleName(role)}でやってみろ。調整の仕方も変わるぞ」\n\n${roleName(role)}への転向が決まった！${now}` + fx(s, { happy: 4, aff: { coach: 3 } });
    }
    if (role === 'SP' && st < 45) return `${coach}「今のスタミナでは、先発で長いイニングは任せられない。まずは走り込みだ」` + fx(s, { happy: -2 });
    if (role === 'CL') return `${coach}「抑えは一番重いところだ。もっと球の力をつけてからにしよう」` + fx(s, { happy: -2 });
    return `${coach}「チーム事情で、今の役割で頑張ってほしい」` + fx(s, { happy: -2 });
  };

  // ---------- 首脳陣からの打診（まれ） ----------
  G.positionOfferCheck = (s) => {
    const p = s.player;
    if (s.retired || s.after || p.injury) return;
    if (s.flags.posOfferYear === s.year) return;
    if (s.queue.some((q) => q.kind !== 'info')) return;
    const phase = G.phaseOf(s.week, s.year).id;
    if (!['camp', 'open', 'season', 'fall'].includes(phase)) return;
    const base = phase === 'camp' || phase === 'fall' ? 0.06 : 0.015;
    if (!G.chance(base)) return;
    const coach = s.people.coach.name;
    if (G.isPitcher(p)) {
      const st = p.pitcher.stamina;
      const exp = G.expERA(s);
      const bar = s.flags.barERA || 4;
      let to = null;
      let why = '';
      if (p.prefRole === 'SP' && p.pitcher.velocity >= 148 && exp <= bar) {
        to = 'CL';
        why = 'お前の球の強さは、短いイニングでこそ生きる。抑えをやってみないか？';
      } else if (p.prefRole !== 'SP' && st >= 60 && exp <= bar + 0.3) {
        to = 'SP';
        why = 'そのスタミナはリリーフではもったいない。先発に回ってみないか？';
      } else if (p.prefRole === 'SP' && st < 45) {
        to = 'RP';
        why = '先発で長い回を投げるのは今は難しい。中継ぎで力を発揮してほしい。';
      }
      if (!to) return;
      s.flags.posOfferYear = s.year;
      s.queue.push({ kind: 'life', id: 'pos_offer', title: '配置転換の打診', text: `${coach}「${p.name}、ちょっといいか」\n\n「${why}」`, data: { to, pitcher: true } });
      return;
    }
    const cur = G.posFit(p, p.position);
    const u = G.ensureUsage(s);
    const blocked = p.squad === 'second' || u.status !== 'starter';
    const cands = G.FIELD_POSITIONS.filter((pos) => pos !== p.position)
      .map((pos) => ({ pos, fit: G.posFit(p, pos), rv: rivalAt(s, pos) }))
      .filter((c) => c.fit >= Math.max(50, cur - 8) && (!c.rv || c.rv.rating < G.overall(p) - 2))
      .sort((a, b) => b.fit - a.fit);
    if (!cands.length || (!blocked && G.chance(0.7))) return;
    const c = cands[0];
    s.flags.posOfferYear = s.year;
    const why = blocked
      ? `今のポジションだと出番が少ない。${posName(c.pos)}なら、すぐにでもチャンスがあるぞ`
      : `チーム事情で${posName(c.pos)}が手薄なんだ。お前の${G.posFit(p, c.pos) >= cur ? '適性なら十分やれる' : '器用さに期待している'}`;
    s.queue.push({ kind: 'life', id: 'pos_offer', title: 'コンバートの打診', text: `監督とコーチに呼ばれた。\n\n${coach}「${p.name}、${posName(c.pos)}をやってみないか？ ${why}」`, data: { to: c.pos } });
  };

  Object.assign(G.LIFE_SCENES, {
    pos_request: {
      choices: (s) => {
        const p = s.player;
        const opts = G.isPitcher(p)
          ? G.PREF_ROLES.filter((r) => r.id !== (p.prefRole || 'SP')).map((r) => ({ label: `${r.name}をやりたい`, run: (s2) => pitcherRequest(s2, r.id) }))
          : G.FIELD_POSITIONS.filter((pos) => pos !== p.position)
              .map((pos) => ({ pos, fit: G.posFit(p, pos) }))
              .sort((a, b) => b.fit - a.fit)
              .map((x) => ({ label: `${posName(x.pos)}を守りたい（適性${fitRank(x.fit)}）`, run: (s2) => batterRequest(s2, x.pos) }));
        return [...opts, { label: 'やっぱり今のままで頑張る', run: () => '「何かあったら、いつでも言ってこい」' }];
      },
    },
    pos_offer: {
      choices: (s, q) => {
        const p = s.player;
        const to = q.data.to;
        const label = q.data.pitcher ? `${roleName(to)}に挑戦する` : `${posName(to)}に挑戦する`;
        return [
          {
            label,
            run: (s2) => {
              if (q.data.pitcher) {
                p.prefRole = to;
                if (p.squad === 'first') G.assignRole(s2);
                s2.history.push({ year: s2.year, text: `首脳陣の打診で${roleName(to)}に転向` });
                return `新しい役割で、もう一度勝負だ！` + fx(s2, { trust: 5, happy: 3 });
              }
              G.applyPositionChange(s2, to);
              s2.history.push({ year: s2.year, text: `首脳陣の打診で${posName(to)}にコンバート` });
              G.buzz(s2, 'poschange', { pos: posName(to) });
              return `${posName(to)}での挑戦が始まる！（慣れるまで40試合ほどかかる）` + fx(s2, { trust: 6, happy: 3 });
            },
          },
          { label: '今のポジションで勝負したい', run: (s2) => '「…そうか。お前がそう言うなら、結果で示してくれ」' + fx(s2, { trust: -3 }) },
        ];
      },
    },
  });
})();
