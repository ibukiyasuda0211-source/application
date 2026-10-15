// 画面描画と操作
(function () {
  const G = window.G;
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const esc = G.esc;
  const br = (t) => esc(t).replace(/\n/g, '<br>');

  const defaultCreate = () => ({
    family: G.pick(G.SURNAMES),
    given: G.pick(G.MALE_NAMES),
    weapon: 'hitter',
    prefRole: 'SP',
    position: 'SS',
    hand: 'RR',
    background: 'hs',
    growth: 'random',
  });

  const ui = { screen: 'title', tab: 'action', s: null, create: defaultCreate(), slot: 0, confirm: null, sel: { train: null, priv: 'relax' }, place: 'home' };

  let toastTimer = null;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toastEl.hidden = true), 2200);
  };

  const save = () => {
    if (ui.s && !G.saveGame(ui.s)) toast('セーブに失敗しました（ブラウザの保存領域を確認してください）');
  };

  // ================= タイトル =================
  const slotSummary = (s) => {
    const p = s.player;
    const team = G.teamById(p.teamId);
    if (s.ended) return `<b>${esc(p.name)}</b><div class="muted">引退済み（${s.ending.age}歳・${esc(s.ending.title)}）</div>`;
    const when = `${s.year}年${G.fmtDate(G.dateOfWeek(s.year, s.week, 0), false)}`;
    if (s.after) return `<b>${esc(p.name)}</b><div class="muted">引退後・${esc(G.afterRank(s))}・${p.age}歳／${when}</div>`;
    return `<b>${esc(p.name)}</b><div class="muted">${team.short}・${G.positionName(p)}・${p.age}歳／${when}・プロ${p.yearsPro + 1}年目</div>`;
  };

  const titleView = () => {
    const slots = G.loadAll();
    let rows = '';
    for (let i = 0; i < G.SLOTS; i++) {
      const s = slots[i];
      if (s) {
        rows += `<div class="panel slot"><div class="info"><div class="muted" style="font-size:12px">スロット${i + 1}</div>${slotSummary(s)}</div>
          <div class="btns"><button class="btn" data-act="continue" data-arg="${i}">${s.ended ? '記録を見る' : 'つづき'}</button>
          <button class="btn danger small" data-act="delete" data-arg="${i}">削除</button></div></div>`;
      } else {
        rows += `<div class="panel slot"><div class="info"><div class="muted" style="font-size:12px">スロット${i + 1}</div><b>― 空き ―</b></div>
          <div class="btns"><button class="btn blue" data-act="newgame" data-arg="${i}">はじめから</button></div></div>`;
      }
    }
    return `<div class="title-screen">
      <div class="logo"><div class="ball">⚾</div><h1>ダイヤモンド・ライフ</h1><p>〜 プロ野球人生シミュレーション 〜</p></div>
      <div class="slots">${rows}</div>
      <div class="credit">ドラフト指名から引退まで、ひとりの野球選手の人生を体験しよう。<br>セーブデータはこのブラウザに保存されます。</div>
    </div>`;
  };

  // ================= キャラメイク =================
  const choiceGroup = (field, items, cur) =>
    `<div class="choices">${items
      .map(
        (it) =>
          `<button class="choice ${cur === it.id ? 'on' : ''}" data-act="setc" data-arg="${field}:${it.id}">${esc(it.name)}${it.desc ? `<small>${esc(it.desc)}</small>` : ''}</button>`,
      )
      .join('')}</div>`;

  const createView = () => {
    const c = ui.create;
    const hands = c.position === 'P' ? G.HANDS.filter((h) => h.id !== 'RS') : G.HANDS;
    return `<div class="topbar"><div class="date">新しい選手をつくる</div><div class="spacer"></div><button class="btn sub" data-act="totitle">もどる</button></div>
    <div class="create"><div class="panel">
      <div class="field"><span class="lbl">選手名</span>
        <div class="name-row">
          <label class="name-part"><small>苗字</small><input id="pfamily" maxlength="6" value="${esc(c.family)}" autocomplete="off" placeholder="例：山田" /></label>
          <label class="name-part"><small>名前</small><input id="pgiven" maxlength="6" value="${esc(c.given)}" autocomplete="off" placeholder="例：太郎" /></label>
          <button class="btn sub small" data-act="randname">ランダム</button></div>
        <small class="muted">ファンやメディアからは苗字で呼ばれます。</small></div>
      <div class="field"><span class="lbl">ポジション</span>${choiceGroup('position', G.POSITIONS, c.position)}</div>
      <div class="field"><span class="lbl">武器（特徴）</span><small class="muted" style="display:block;margin:-2px 0 6px">選手としての一番の売り。初期能力や特殊能力に反映されます。</small>${choiceGroup('weapon', G.weaponsFor(c.position), c.weapon)}</div>
      ${c.position === 'P' ? `<div class="field"><span class="lbl">希望の役割</span><small class="muted" style="display:block;margin:-2px 0 6px">先発・中継ぎ・抑えのどれで勝負するか。後からコーチに相談して変えることもできます。</small>${choiceGroup('prefRole', G.PREF_ROLES, c.prefRole || 'SP')}</div>` : ''}
      <div class="field"><span class="lbl">投打</span>${choiceGroup('hand', hands, c.hand)}</div>
      <div class="field"><span class="lbl">経歴</span>${choiceGroup(
        'background',
        G.BACKGROUNDS.map((b) => ({ ...b, name: `${b.name}（${b.age}歳）` })),
        c.background,
      )}</div>
      <div class="field"><span class="lbl">成長タイプ</span>${choiceGroup('growth', [{ id: 'random', name: 'おまかせ', desc: '運命に任せる' }, ...G.GROWTH_TYPES], c.growth)}</div>
      <div class="center"><button class="btn big" data-act="start">ドラフト会議へ ▶</button></div>
    </div></div>`;
  };

  // ================= メイン画面 =================
  const rankBadge = (v) => {
    const r = G.rank(v);
    return `<span class="rank ${r}">${r}</span>`;
  };

  const bar = (label, v, color) =>
    `<div class="bar"><span>${label}</span><div class="track"><div class="fill" style="width:${G.clamp(v, 0, 100)}%;background:${color}"></div></div><span class="val">${Math.round(v)}</span></div>`;

  const staminaColor = (v) => (v >= 60 ? '#2fb46e' : v >= 30 ? '#f2c200' : '#ff4a5a');

  const abilityRows = (p) => {
    if (G.isPitcher(p)) {
      const pt = p.pitcher;
      return `<div class="abil">
        <div class="abil-row"><span>球速</span><span></span><span class="velo" style="grid-column:2/4;text-align:right">${pt.velocity}<small style="font-size:12px">km/h</small></span></div>
        <div class="abil-row"><span>コントロール</span>${rankBadge(pt.control)}<span class="v">${pt.control}</span></div>
        <div class="abil-row"><span>スタミナ</span>${rankBadge(pt.stamina)}<span class="v">${pt.stamina}</span></div>
      </div>
      <div class="pitches">${pt.pitches.map((x) => `<span class="pitch">${G.pitchById(x.id).name} ${x.level}</span>`).join('')}</div>`;
    }
    return `<div class="abil">${G.BATTER_ABILITIES.map(
      (a) => `<div class="abil-row"><span>${a.name}</span>${rankBadge(p.batter[a.id])}<span class="v">${p.batter[a.id]}</span></div>`,
    ).join('')}</div>`;
  };

  const miniStats = (s) => {
    const p = s.player;
    if (G.isPitcher(p)) {
      const st = s.stats.pit;
      const f = s.farm.pit;
      return `<div class="mini-stats"><div><b>${G.squadName(p, 'first')}</b> ${st.g}登板 ${st.w}勝${st.l}敗 ${st.s}S ${st.hld}H 防御率 <b>${G.fmtERA(st.er, st.outs)}</b></div>
        <div class="muted"><b>${G.squadName(p, 'second')}</b> ${f.g}登板 ${f.w}勝${f.l}敗 防御率 ${G.fmtERA(f.er, f.outs)}</div></div>`;
    }
    const st = s.stats.bat;
    const f = s.farm.bat;
    return `<div class="mini-stats"><div><b>${G.squadName(p, 'first')}</b> ${st.g}試合 打率 <b>${G.fmtRate(st.h, st.ab)}</b> ${st.hr}本 ${st.rbi}打点 ${st.sb}盗塁</div>
      <div class="muted"><b>${G.squadName(p, 'second')}</b> ${f.g}試合 打率 ${G.fmtRate(f.h, f.ab)} ${f.hr}本 ${f.rbi}打点</div></div>`;
  };

  const afterCard = (s) => {
    const p = s.player;
    const team = G.teamById(p.teamId);
    const tot = G.careerTotals(s);
    const career = G.isPitcher(p) ? `通算 ${tot.pit.w}勝 ${tot.pit.s}セーブ 防御率${G.fmtERA(tot.pit.er, tot.pit.outs)}` : `通算 ${tot.bat.h}安打 ${tot.bat.hr}本塁打 打率${G.fmtRate(tot.bat.h, tot.bat.ab)}`;
    return `<aside class="panel pcard" style="--team:${team.color}">
      <div class="head"><div class="num">OB</div><div><div class="pname">${esc(p.name)}</div>
      <div class="sub">${p.age}歳・引退して${s.year - s.after.startYear + 1}年目</div></div></div>
      <div class="tags"><span class="tag first">${esc(G.afterRank(s))}</span><span class="tag">元${esc(team.short)}</span></div>
      <div class="bars">
        ${bar('体力', p.stamina, staminaColor(p.stamina))}
        ${bar('人気', p.popularity, '#ff8a1f')}
        ${bar('充実度', p.happy, '#e0569b')}
      </div>
      <div class="money"><div><small>所持金</small><b>${G.fmtMoney(p.money)}</b></div><div><small>週の収入</small><b>${G.fmtMoney(G.afterIncome(s))}</b></div></div>
      <div class="mini-stats"><div><b>現役時代</b> プロ${s.retired.years}年</div><div class="muted">${career}</div></div>
      ${s.after.titles.length ? `<div class="skills">${s.after.titles.slice(-4).map((t) => `<span class="skill">${esc(t)}</span>`).join('')}</div>` : ''}
    </aside>`;
  };

  const usageBox = (s) => {
    const u = G.usageSummary(s);
    if (!u) {
      const p = s.player;
      if (p.squad === 'second' && !s.retired && G.phaseOf(s.week, s.year).id === 'season' && s.dayCount < (s.flags.downUntil || 0)) {
        return `<div class="usage"><b>登録抹消中</b><small>再登録まであと${s.flags.downUntil - s.dayCount}試合日</small></div>`;
      }
      return '';
    }
    return `<div class="usage"><b>起用：${esc(u.role)}</b><small>${esc(u.detail)}</small>${u.mood ? `<small class="mood">${esc(u.mood)}</small>` : ''}</div>`;
  };

  const playerCard = (s) => {
    const p = s.player;
    if (s.after) return afterCard(s);
    const team = G.teamById(p.teamId);
    const hand = G.HANDS.find((h) => h.id === p.hand);
    const cond = G.CONDITIONS[p.condition];
    const growth = G.GROWTH_TYPES.find((g) => g.id === p.growth);
    return `<aside class="panel pcard" style="--team:${team.color}">
      <div class="head"><div class="num">${p.number}</div><div><div class="pname">${esc(p.name)}</div>
      <div class="sub">${G.positionName(p)}・${hand.name}・${p.age}歳・プロ${p.yearsPro + 1}年目</div></div></div>
      <div class="tags">
        <span class="tag ${p.squad}">${G.squadName(p)}</span>
        ${p.squad === 'first' || G.isPitcher(p) ? `<span class="tag">${G.roleName(p)}</span>` : ''}
        ${G.weaponOf(p) ? `<span class="tag weapon">武器：${G.weaponOf(p).name}</span>` : ''}
        ${G.isPitcher(p) && p.prefRole ? `<span class="tag">希望：${G.PREF_ROLES.find((r) => r.id === p.prefRole).name}</span>` : ''}
        ${!G.isPitcher(p) && p.posAdapt !== undefined && p.posAdapt < 40 ? `<span class="tag injury" style="background:#e3b600">新ポジション慣熟中 ${p.posAdapt}/40試合</span>` : ''}
        <span class="tag">${growth.name}</span>
        ${p.injury ? `<span class="tag injury">故障中：${esc(p.injury.name)}（残り${p.injury.weeks}週）</span>` : ''}
      </div>
      <div class="cond ${cond.cls}"><span class="arrow">${cond.icon}</span>${cond.name}</div>
      ${usageBox(s)}
      <div class="bars">
        ${bar('体力', p.stamina, staminaColor(p.stamina))}
        ${bar('首脳陣評価', p.trust, '#3b8ee0')}
        ${bar('人気', p.popularity, '#ff8a1f')}
        ${bar('充実度', p.happy, '#e0569b')}
      </div>
      <div class="money"><div><small>所持金</small><b>${G.fmtMoney(p.money)}</b></div><div><small>年俸</small><b>${G.fmtMoney(p.salary)}</b></div></div>
      ${abilityRows(p)}
      ${p.skills.length ? `<div class="skills">${p.skills.map((id) => `<span class="skill">${G.skillById(id).name}</span>`).join('')}</div>` : ''}
      ${miniStats(s)}
    </aside>`;
  };

  const canUpgradeSomething = (p) => {
    const list = G.isPitcher(p) ? G.PITCHER_ABILITIES : G.BATTER_ABILITIES;
    const tgt = G.isPitcher(p) ? p.pitcher : p.batter;
    return list.some((a) => tgt[a.id] < G.abilityMax(a) && G.canAfford(p, G.abilityCost(a, tgt[a.id], p)));
  };

  const TABS = [
    { id: 'action', name: '行動' },
    { id: 'upgrade', name: '能力アップ' },
    { id: 'stats', name: '成績' },
    { id: 'team', name: 'チーム' },
    { id: 'sns', name: 'SNS' },
    { id: 'draft', name: 'ドラフト同期' },
    { id: 'people', name: '人間関係' },
    { id: 'life', name: '人生' },
    { id: 'shop', name: 'ショップ' },
  ];

  const tabsView = (s) =>
    `<div class="tabs">${TABS.filter((t) => !(s.after && ['upgrade', 'shop'].includes(t.id))).map(
      (t) =>
        `<button class="tab ${ui.tab === t.id ? 'on' : ''}" data-act="tab" data-arg="${t.id}">${t.name}${
          t.id === 'upgrade' && canUpgradeSomething(s.player) ? '<span class="dot"></span>' : ''
        }</button>`,
    ).join('')}</div>`;

  const logView = (s) => {
    const groups = [];
    let cur = null;
    for (let i = s.log.length - 1; i >= 0 && groups.length < 14; i--) {
      const l = s.log[i];
      const key = `${l.y}-${l.w}`;
      if (!cur || cur.key !== key) {
        cur = { key, y: l.y, w: l.w, items: [] };
        groups.push(cur);
      }
      cur.items.unshift(l);
    }
    return `<div class="log">${groups
      .map((g) => {
        return `<div class="log-week"><h4>${g.y}年 ${G.weekLabel(g.y, g.w)}</h4>${g.items
          .map((l) => `<div class="log-item ${l.cls || ''}">${br(l.text)}</div>`)
          .join('')}</div>`;
      })
      .join('')}</div>`;
  };

  // 今週の選択をそろえる（選べなくなった選択肢は既定に戻す）
  const syncSelection = (s) => {
    const train = G.trainingOptions(s);
    if (!train.some((t) => t.id === ui.sel.train)) ui.sel.train = (train.find((t) => !t.risky && !t.rest) || train[0]).id;
    const priv = G.privateActions(s);
    if (!priv.some((a) => a.id === ui.sel.priv && a.ok)) ui.sel.priv = 'relax';
    return { train, priv };
  };

  // ---------- 試合画面（1試合ずつ作戦を選ぶ） ----------
  const gameMeta = (s, own) => {
    const opp = G.teamById(own.oppId);
    const r = s.standings[s.player.teamId];
    const day = s.gw.cur && s.gw.cur.day;
    return `<div class="game-date">${day ? G.fmtDate(day.d) : ''} 18:00 試合開始・${own.home ? 'ホーム' : 'ビジター'}${own.inter ? '・交流戦' : ''}${day && day.makeup ? '・振替試合' : ''}</div>
      <div class="game-head"><span class="team-chip" style="background:${G.teamById(s.player.teamId).color}">${G.teamById(s.player.teamId).short}</span> vs <span class="team-chip" style="background:${opp.color}">${opp.short}</span>
      <span class="muted">${opp.name}・チーム ${r.w}勝${r.l}敗${r.d}分</span></div>`;
  };

  // スコアボード
  const boxHtml = (b) => {
    if (!b) return '';
    const head = Array.from({ length: b.n }, (_, i) => `<th>${i + 1}</th>`).join('');
    const row = (side, isHome) => {
      const t = G.teamById(side.id);
      const me = side.id === ui.s.player.teamId;
      return `<tr class="${me ? 'me' : ''}"><td class="tname"><span class="team-chip" style="background:${t.color}">${t.short}</span></td>${side.line
        .map((x) => `<td class="${x !== 0 && x !== 'X' ? 'run' : ''}">${x}</td>`)
        .join('')}<td class="tot">${side.R}</td><td>${side.H}</td><td>${side.E}</td></tr>`;
    };
    const pitchers = [b.w && `勝：${esc(b.w)}`, b.l && `負：${esc(b.l)}`, b.sv && `S：${esc(b.sv)}`].filter(Boolean).join('　');
    return `<div class="box-wrap"><table class="boxscore"><tr><th></th>${head}<th class="tot">計</th><th>安</th><th>失</th></tr>${row(b.away, false)}${row(b.homeT, true)}</table></div>
      ${pitchers || b.hrs.length ? `<div class="box-foot">${pitchers}${b.hrs.length ? `<br>本塁打：${b.hrs.map(esc).join('、')}` : ''}</div>` : ''}`;
  };

  const lastGamesView = (s) => {
    const list = s.lastGames || [];
    if (!list.length) return '';
    return `<details class="settings" open><summary>先週の試合（スコアボード）</summary><div class="games-list">${list
      .map((g) => {
        if (g.rain) return `<div class="game-row muted">${G.fmtDate(g.date)}　雨天中止（後日振替）</div>`;
        const mark = g.outcome === 'W' ? '○' : g.outcome === 'L' ? '●' : '△';
        return `<details class="game-row"><summary><b class="res-${g.outcome}">${mark}</b> ${G.fmtDate(g.date)} vs ${G.teamById(g.oppId).short}${g.inter ? '（交流戦）' : ''} <b>${g.score[0]}-${g.score[1]}</b>　<span class="muted">${esc(g.text)}</span></summary>${boxHtml(g.box)}</details>`;
      })
      .join('')}</div></details>`;
  };

  const pregameView = (s) => {
    const p = s.player;
    const own = s.gw.cur.own;
    let scout;
    if (own.kind === 'bat') {
      const o = G.OPP_PITCHERS.find((x) => x.id === own.oppP.type);
      const us = G.usageSummary(s);
      scout = `<div class="scout"><b>${own.starter ? `今日は「${own.order}」でスタメン出場` : own.defOnly ? 'ベンチスタート（終盤の守備固めで出番がありそう）' : 'ベンチスタート（代打で出番がありそう）'}</b>
        ${us ? `<div class="muted">${esc(us.detail)}${us.mood ? `・${esc(us.mood)}` : ''}</div>` : ''}
        <div>相手先発：${esc(own.oppP.name)}（<b>${o.name}</b>）</div><div class="muted">スコアラー「${o.hint}」</div></div>`;
    } else {
      const l = G.OPP_LINEUPS.find((x) => x.id === own.lineup);
      scout = `<div class="scout"><b>${esc(own.situation)}</b><div>相手打線：<b>${l.name}</b></div><div class="muted">捕手「${l.hint}」</div></div>`;
    }
    const aps = G.approachList(p);
    const def = G.defaultApproach(s);
    return `<div class="panel game-panel">
      ${gameMeta(s, own)}${scout}
      <div class="section-title"><span class="step">⚾</span>この試合で意識すること</div>
      <div class="act-grid">${aps
        .map((a) => `<button class="act train ${a.id === def ? 'on' : ''}" data-act="approach" data-arg="${a.id}"><b>${a.name}</b><small>${a.desc}</small></button>`)
        .join('')}</div>
      <div class="act-foot"><span class="muted" style="font-size:13px">相手の特徴に合った作戦を選ぶと結果が出やすい。</span>
      <button class="btn sub small" data-act="autoGames">今週の残りはおまかせ</button></div>
    </div>`;
  };

  const resultView = (s) => {
    const r = s.gw.last;
    const mark = r.outcome === 'W' ? '勝利' : r.outcome === 'L' ? '敗戦' : '引き分け';
    const ap = G.approachById(s.player, r.ap);
    const review = G.planReview(s, r);
    const read = review ? `<div class="read ${review.cls}">${esc(review.text)}</div>` : '';
    let detail;
    if (r.kind === 'bat') {
      const plays = (r.plays || []).map((t) => `<li class="${/失策|捕逸/.test(t) ? 'pa-bad' : 'pa-HR'}"><span>守備</span>${esc(t)}</li>`).join('');
      const pas = r.pas.map((pa, i) => `<li class="pa-${pa.code}"><span>第${i + 1}打席</span>${esc(G.paText(pa))}</li>`).join('');
      const head = r.order === '守備固め' ? '<div class="muted" style="font-size:13px">終盤、守備固めで出場</div>' : '';
      const fl = r.fld ? G.fldLineText(r.fld) : '';
      detail = `${head}<ol class="pa-list">${pas}${plays}</ol>
        <div class="line">${r.line.pa ? G.batLineText(r.line) : '打席なし'}${fl ? `／${fl}` : ''}</div>`;
    } else {
      detail = `<ol class="pa-list">${G.inningText(r.innings, r.startInning)
        .map((t) => `<li class="${/\d+失点/.test(t) ? 'pa-bad' : 'pa-OUT'}">${esc(t)}</li>`)
        .join('')}</ol><div class="line">${G.pitLineText(r.line)}</div>`;
    }
    const acc = s.gw.acc;
    const week = r.kind === 'bat' ? `今週の成績：${G.batLineText(acc.weekBat)}` : `今週の成績：${G.pitLineText(acc.weekPit)}`;
    return `<div class="panel game-panel">
      <div class="game-date">${G.fmtDate(r.date)}${r.inter ? '・交流戦' : ''}</div>
      <div class="game-head"><b class="res-${r.outcome}">${mark}</b> ${r.score[0]} - ${r.score[1]} <span class="muted">vs ${G.teamById(r.oppId).name}・作戦「${ap.name}」</span></div>
      ${boxHtml(r.box)}
      ${read}${detail}
      <div class="muted" style="font-size:13px">${week}</div>
      <div class="act-foot mt"><span></span><span class="btns-row"><button class="btn sub small" data-act="autoGames">残りはおまかせ</button>
      <button class="btn" data-act="nextGame">${s.gw.d >= s.gw.n ? '今週を終える ▶' : '次の試合へ ▶'}</button></span></div>
    </div>`;
  };

  const gameSettings = (s) => {
    const p = s.player;
    const mode = s.flags.gameMode === 'auto' ? 'auto' : 'each';
    const def = G.defaultApproach(s);
    return `<details class="settings"><summary>試合の設定</summary>
      <div class="choices mt"><button class="choice ${mode === 'each' ? 'on' : ''}" data-act="gameMode" data-arg="each">1試合ずつ作戦を選ぶ<small>出場する試合の前に毎回選ぶ</small></button>
      <button class="choice ${mode === 'auto' ? 'on' : ''}" data-act="gameMode" data-arg="auto">まとめて自動で進める<small>いつもの作戦で1週間分を一気に</small></button></div>
      <div class="mt" style="font-size:14px;font-weight:700">いつもの作戦（自動のときと2軍戦で使う）</div>
      <div class="choices">${G.approachList(p).map((a) => `<button class="choice ${def === a.id ? 'on' : ''}" data-act="defaultAp" data-arg="${a.id}">${a.name}</button>`).join('')}</div>
    </details>`;
  };

  const afterActionTab = (s) => {
    const p = s.player;
    const works = G.afterWorks(s);
    if (!works.some((w) => w.id === ui.sel.work && w.ok)) ui.sel.work = works.find((w) => w.ok).id;
    const priv = G.privateActions(s);
    if (!priv.some((a) => a.id === ui.sel.priv && a.ok)) ui.sel.priv = 'relax';
    const places = G.PLACES.map((pl) => ({ ...pl, items: priv.filter((a) => a.place === pl.id) })).filter((pl) => pl.items.length);
    if (!places.some((pl) => pl.id === ui.place)) ui.place = 'home';
    const cur = places.find((pl) => pl.id === ui.place);
    const special = (a) => a.ok && /^(confess|propose)/.test(a.id);
    const chips = places.map((pl) => `<button class="place ${ui.place === pl.id ? 'on' : ''}" data-act="place" data-arg="${pl.id}">${pl.name}${pl.items.some(special) ? '<span class="dot"></span>' : ''}</button>`).join('');
    const workBtn = (w) => `<button class="act train ${ui.sel.work === w.id ? 'on' : ''}" data-act="selWork" data-arg="${w.id}" ${w.ok ? '' : 'disabled'}><b>${esc(w.name)}</b><small>${esc(w.desc)}</small>${w.ok ? '' : `<small class="why">${esc(w.reason)}</small>`}</button>`;
    const privBtn = (a) =>
      `<button class="act rest ${special(a) ? 'special' : ''} ${ui.sel.priv === a.id ? 'on' : ''}" data-act="selPriv" data-arg="${esc(a.id)}" ${a.ok ? '' : 'disabled'}><b>${esc(a.name)}</b><small>${esc(a.desc)}</small>${a.cost ? `<small class="cost-tag">${G.fmtMoney(a.cost)}</small>` : ''}${a.ok ? '' : `<small class="why">${esc(a.reason)}</small>`}</button>`;
    const selW = works.find((w) => w.id === ui.sel.work);
    const selP = priv.find((a) => a.id === ui.sel.priv);
    const def = G.afterDef(s);
    const a = s.after;
    const next = a.career !== 'business' && a.level + 1 < def.need.length ? `（次の昇進まで経験${Math.max(0, def.need[a.level + 1] - a.xp)}）` : '';
    return `<div class="panel">
      <div class="section-title"><span class="step">1</span>今週の仕事 <span class="muted">${esc(G.afterRank(s))}${next}</span></div>
      <div class="act-grid">${works.map(workBtn).join('')}</div>
      <div class="section-title"><span class="step">2</span>オフの過ごし方</div>
      <div class="places">${chips}</div>
      <div class="act-grid">${cur.items.map(privBtn).join('')}</div>
      <div class="week-bar"><div class="week-sum"><span>仕事：<b>${esc(selW.name)}</b></span><span>オフ：<b>${esc(selP.name)}</b>${selP.cost ? `（${G.fmtMoney(selP.cost)}）` : ''}</span></div>
        <button class="btn" data-act="week">この1週間を過ごす ▶</button></div>
      <div class="act-foot"><span class="muted" style="font-size:13px">${p.age}歳。人生はまだまだ続く。</span><button class="btn sub small" data-act="auto">おまかせで4週進める</button></div>
      ${logView(s)}
    </div>`;
  };

  const actionTab = (s) => {
    if (s.after) return afterActionTab(s);
    if (s.gw && s.gw.last) return resultView(s);
    if (s.gw && s.gw.await) return pregameView(s);
    const { train, priv } = syncSelection(s);
    const mul = G.trainingMultiplier(s);
    const phase = G.phaseOf(s.week, s.year);
    const p = s.player;
    const games = G.gamesInWeek(s.week, s.year);
    let note = '';
    if (games) {
      const days = G.daysInWeek(s.week, s.year);
      note = `今週は${games}試合（${days.map((d) => G.fmtDate(d.d).replace(/^\d+月/, '')).join('・')}）・${G.squadName(p)}`;
    } else if (phase.id === 'season') note = '今週は試合なし（オールスター休み・調整期間）';
    else if (phase.id === 'open') note = '今週はオープン戦';
    const cond = G.CONDITIONS[p.condition];
    const quick = `<div class="quick"><span class="cond ${cond.cls}"><span class="arrow">${cond.icon}</span>${cond.name}</span>
      <span>体力 <b style="color:${staminaColor(p.stamina)}">${Math.round(p.stamina)}</b></span>
      <span>充実度 <b>${Math.round(p.happy)}</b></span>
      <span>所持金 <b>${G.fmtMoney(p.money)}</b></span><span class="tag ${p.squad}">${G.squadName(p)}</span>
      ${p.injury ? `<span class="tag injury">故障 残り${p.injury.weeks}週</span>` : ''}</div>`;

    const trainBtn = (a) =>
      `<button class="act train ${a.risky ? 'risky' : ''} ${a.rest ? 'restopt' : ''} ${ui.sel.train === a.id ? 'on' : ''}" data-act="selTrain" data-arg="${a.id}" aria-pressed="${ui.sel.train === a.id}"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></button>`;

    const places = G.PLACES.map((pl) => ({ ...pl, items: priv.filter((a) => a.place === pl.id) })).filter((pl) => pl.items.length);
    if (!places.some((pl) => pl.id === ui.place)) ui.place = 'home';
    const special = (a) => a.ok && /^(confess|propose)/.test(a.id);
    const chips = places
      .map((pl) => {
        const hot = pl.items.some(special);
        const okCount = pl.items.filter((a) => a.ok).length;
        return `<button class="place ${ui.place === pl.id ? 'on' : ''} ${okCount ? '' : 'dim'}" data-act="place" data-arg="${pl.id}">${pl.name}${hot ? '<span class="dot"></span>' : ''}</button>`;
      })
      .join('');
    const cur = places.find((pl) => pl.id === ui.place);
    const privBtn = (a) =>
      `<button class="act rest ${special(a) ? 'special' : ''} ${ui.sel.priv === a.id ? 'on' : ''}" data-act="selPriv" data-arg="${esc(a.id)}" ${a.ok ? '' : 'disabled'} aria-pressed="${ui.sel.priv === a.id}">
        <b>${esc(a.name)}</b><small>${esc(a.desc)}</small>${a.cost ? `<small class="cost-tag">${G.fmtMoney(a.cost)}</small>` : ''}${a.ok ? '' : `<small class="why">${esc(a.reason)}</small>`}</button>`;

    const selT = train.find((t) => t.id === ui.sel.train);
    const selP = priv.find((a) => a.id === ui.sel.priv);
    return `<div class="panel">${quick}
      <div class="section-title"><span class="step">1</span>今週の練習 <span class="muted">練習効率 ×${mul.toFixed(2)}（${phase.name}・${cond.name}）</span></div>
      <div class="act-grid">${train.map(trainBtn).join('')}</div>
      <div class="section-title"><span class="step">2</span>オフの過ごし方</div>
      <div class="places">${chips}</div>
      <div class="act-grid">${cur.items.map(privBtn).join('')}</div>
      <div class="week-bar">
        <div class="week-sum"><span>練習：<b>${esc(selT.name)}</b></span><span>オフ：<b>${esc(selP.name)}</b>${selP.cost ? `（${G.fmtMoney(selP.cost)}）` : ''}</span></div>
        <button class="btn" data-act="week">この1週間を過ごす ▶</button>
      </div>
      <div class="act-foot"><span class="muted" style="font-size:13px">${note}</span>
        <button class="btn sub small" data-act="auto">おまかせで4週進める</button></div>
      ${lastGamesView(s)}
      ${gameSettings(s)}
      ${logView(s)}
    </div>`;
  };

  const costHtml = (p, cost) =>
    Object.keys(cost)
      .map((k) => {
        const et = G.EXP_TYPES.find((e) => e.id === k);
        const lack = p.exp[k] < cost[k];
        return `<span class="${lack ? 'lack' : ''}">${et.name}${cost[k]}</span>`;
      })
      .join(' / ');

  const upgradeTab = (s) => {
    const p = s.player;
    const chips = G.EXP_TYPES.filter((e) => G.isPitcher(p) || e.id !== 'breaking')
      .map((e) => `<div class="exp-chip" style="background:${e.color}">${e.name}<span>${Math.floor(p.exp[e.id])}</span></div>`)
      .join('');
    const list = G.isPitcher(p) ? G.PITCHER_ABILITIES : G.BATTER_ABILITIES;
    const tgt = G.isPitcher(p) ? p.pitcher : p.batter;
    const rows = list
      .map((a) => {
        const v = tgt[a.id];
        const max = v >= G.abilityMax(a);
        const cost = G.abilityCost(a, v, p);
        const ok = !max && G.canAfford(p, cost);
        const disp = a.id === 'velocity' ? `<span class="velo">${v}km/h</span>` : `${rankBadge(v)} ${v}`;
        return `<tr><td class="nm">${a.name}</td><td><div class="vcell">${disp}</div></td>
          <td class="cost">${max ? 'MAX' : costHtml(p, cost)}</td>
          <td class="ops"><button class="btn small" data-act="raise" data-arg="${a.id}" ${ok ? '' : 'disabled'}>＋1</button>
          <button class="btn small sub" data-act="raise5" data-arg="${a.id}" ${ok ? '' : 'disabled'}>＋5</button></td></tr>`;
      })
      .join('');

    let pitchHtml = '';
    if (G.isPitcher(p)) {
      const prow = p.pitcher.pitches
        .map((x) => {
          const max = x.level >= G.MAX_PITCH_LEVEL;
          const cost = G.pitchLevelCost(x.level);
          const ok = !max && G.canAfford(p, cost);
          return `<tr><td class="nm">${G.pitchById(x.id).name}</td><td><div class="vcell">変化量 ${x.level}</div></td>
            <td class="cost">${max ? 'MAX' : costHtml(p, cost)}</td>
            <td class="ops"><button class="btn small" data-act="raisePitch" data-arg="${x.id}" ${ok ? '' : 'disabled'}>＋1</button></td></tr>`;
        })
        .join('');
      const learnable = G.PITCH_TYPES.filter((t) => !p.pitcher.pitches.some((x) => x.id === t.id));
      const canLearn = p.pitcher.pitches.length < G.MAX_PITCHES && G.canAfford(p, G.NEW_PITCH_COST);
      pitchHtml = `<h3 class="mt">変化球</h3><table class="up-table">${prow}</table>
        ${
          p.pitcher.pitches.length < G.MAX_PITCHES
            ? `<div class="act-foot mt"><span class="cost muted" style="font-size:13px">新しい球種を覚える：${costHtml(p, G.NEW_PITCH_COST)}</span>
          <span><select id="newpitch">${learnable.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
          <button class="btn small blue" data-act="learnPitch" ${canLearn ? '' : 'disabled'}>習得</button></span></div>`
            : '<p class="muted">覚えられる球種は最大5つです。</p>'
        }`;
    }

    const skills = G.availableSkills(p)
      .map((sk) => {
        const have = p.skills.includes(sk.id);
        const ok = !have && G.canAfford(p, sk.cost);
        return `<div class="skill-card ${have ? 'have' : ''}"><div class="row"><b>${sk.name}</b>${
          have ? '<span class="skill">習得済</span>' : `<button class="btn small" data-act="learnSkill" data-arg="${sk.id}" ${ok ? '' : 'disabled'}>習得</button>`
        }</div><small class="muted">${sk.desc}</small>${have ? '' : `<small class="cost">${costHtml(p, sk.cost)}</small>`}</div>`;
      })
      .join('');

    return `<div class="panel">
      <h3>経験点</h3><div class="exp-chips">${chips}</div>
      <h3>基礎能力</h3><table class="up-table">${rows}</table>
      ${pitchHtml}
      <h3 class="mt">特殊能力</h3><div class="skill-list">${skills}</div>
      <p class="muted" style="font-size:12px">※ 能力が高くなるほど必要な経験点は増えます。選手ごとの「素質」を超えると、さらに伸びにくくなります。</p>
    </div>`;
  };

  const batRow = (label, st, cls = '') => {
    const d = G.batDerived(st);
    return `<tr class="${cls}"><td>${label}</td><td>${st.g}</td><td>${st.pa}</td><td>${st.ab}</td><td>${st.h}</td><td>${st.d}</td><td>${st.t}</td><td>${st.hr}</td><td>${st.rbi}</td><td>${st.r}</td><td>${st.bb}</td><td>${st.k}</td><td>${st.sb}</td>
      <td>${G.fmtRate(st.h, st.ab)}</td><td>${st.pa ? G.fmtRate(st.h + st.bb, st.pa) : '.---'}</td><td>${st.ab ? d.slg.toFixed(3).replace(/^0/, '') : '.---'}</td><td>${st.pa ? d.ops.toFixed(3).replace(/^0/, '') : '.---'}</td></tr>`;
  };
  const batHead = (first = '') =>
    `<tr><th>${first}</th><th>試合</th><th>打席</th><th>打数</th><th>安打</th><th>二塁打</th><th>三塁打</th><th>本塁打</th><th>打点</th><th>得点</th><th>四球</th><th>三振</th><th>盗塁</th><th>打率</th><th>出塁率</th><th>長打率</th><th>OPS</th></tr>`;

  const pitRow = (label, st, cls = '') =>
    `<tr class="${cls}"><td>${label}</td><td>${st.g}</td><td>${st.gs}</td><td>${st.w}</td><td>${st.l}</td><td>${st.s}</td><td>${st.hld}</td><td>${G.fmtIP(st.outs)}</td><td>${st.h}</td><td>${st.k}</td><td>${st.bb}</td><td>${st.r}</td><td>${st.er}</td><td>${G.fmtERA(st.er, st.outs)}</td></tr>`;
  const pitHead = (first = '') =>
    `<tr><th>${first}</th><th>登板</th><th>先発</th><th>勝</th><th>敗</th><th>S</th><th>H</th><th>投球回</th><th>被安打</th><th>奪三振</th><th>四球</th><th>失点</th><th>自責</th><th>防御率</th></tr>`;

  const raceView = (s) => {
    const p = s.player;
    const L = s.leaders;
    if (!L) return '';
    const prog = G.clamp(G.teamGamesPlayed(s) / G.SEASON_GAMES, 0, 1);
    const cnt = (o) => Math.round(o.final * prog * G.rf(0.98, 1.0));
    let rows;
    if (G.isPitcher(p)) {
      const st = s.stats.pit;
      const era = st.outs ? (st.er * 27) / st.outs : null;
      rows = [
        ['最多勝', L.w, cnt(L.w), st.w, st.w >= cnt(L.w) && st.w > 0],
        ['最優秀防御率', L.era, (L.era.final + (1 - prog) * 0.4).toFixed(2), era === null ? '-.--' : era.toFixed(2), era !== null && st.outs >= 429 * prog && era <= L.era.final + (1 - prog) * 0.4],
        ['最多奪三振', L.k, cnt(L.k), st.k, st.k >= cnt(L.k) && st.k > 0],
        ['最多セーブ', L.s, cnt(L.s), st.s, st.s >= cnt(L.s) && st.s > 0],
        ['最優秀中継ぎ', L.hld, cnt(L.hld), st.hld, st.hld >= cnt(L.hld) && st.hld > 0],
      ];
    } else {
      const st = s.stats.bat;
      const avg = st.ab ? st.h / st.ab : null;
      const npcAvg = L.avg.final + (1 - prog) * 0.012;
      rows = [
        ['首位打者', L.avg, npcAvg.toFixed(3).replace(/^0/, ''), avg === null ? '.---' : avg.toFixed(3).replace(/^0/, ''), avg !== null && st.pa >= 443 * prog && avg >= npcAvg],
        ['本塁打王', L.hr, cnt(L.hr), st.hr, st.hr >= cnt(L.hr) && st.hr > 0],
        ['打点王', L.rbi, cnt(L.rbi), st.rbi, st.rbi >= cnt(L.rbi) && st.rbi > 0],
        ['盗塁王', L.sb, cnt(L.sb), st.sb, st.sb >= cnt(L.sb) && st.sb > 0],
        ['最多安打', L.hits, cnt(L.hits), st.h, st.h >= cnt(L.hits) && st.h > 0],
      ];
    }
    return `<h3>タイトル争い <span class="muted" style="font-size:12px">（${G.LEAGUES.find((l) => l.id === G.teamById(p.teamId).league).name}）</span></h3>
    <div class="tbl-wrap"><table class="stats"><tr><th>部門</th><th>ライバル</th><th>記録</th><th>あなた</th></tr>${rows
      .map((r) => `<tr><td>${r[0]}</td><td>${esc(r[1].name)}（${r[1].team}）</td><td>${r[2]}</td><td class="${r[4] ? 'lead' : ''}">${r[3]}</td></tr>`)
      .join('')}</table></div>
    <p class="muted" style="font-size:12px;margin-top:-8px">※ 首位打者は規定打席（443）、最優秀防御率は規定投球回（143）が必要</p>`;
  };

  const statsTab = (s) => {
    const p = s.player;
    const pitcher = G.isPitcher(p);
    const head = pitcher ? pitHead : batHead;
    const row = pitcher ? (l, c, cls) => pitRow(l, c.pit, cls) : (l, c, cls) => batRow(l, c.bat, cls);
    const cur = `<div class="tbl-wrap"><table class="stats">${head('')}${row(G.squadName(p, 'first'), s.stats, 'me')}${row(G.squadName(p, 'second'), s.farm)}</table></div>`;

    const tot = G.careerTotals(s);
    const careerRows = s.career
      .map((c) => {
        const t = G.teamById(c.team).short;
        const label = `${c.year} ${t} (${c.age})`;
        return pitcher ? pitRow(label, c.pit) : batRow(label, c.bat);
      })
      .join('');
    const career = s.career.length
      ? `<h3 class="mt">年度別成績（1軍）</h3><div class="tbl-wrap"><table class="stats">${head('年度')}${careerRows}${
          pitcher ? pitRow('通算', tot.pit, 'total') : batRow('通算', tot.bat, 'total')
        }</table></div>
        <div class="tbl-wrap"><table class="stats"><tr><th>年度</th><th>年俸</th><th>貢献度(WAR)</th><th>タイトル・表彰</th></tr>${s.career
          .map((c) => `<tr><td>${c.year}</td><td>${G.fmtMoney(c.salary)}</td><td>${c.war.toFixed(1)}</td><td style="text-align:left">${c.titles.join('・') || '-'}</td></tr>`)
          .join('')}</table></div>`
      : '<p class="muted mt">年度別成績は1年目のシーズン終了後に表示されます。</p>';

    let defense = '';
    if (!pitcher) {
      const fh = `<tr><th></th><th>試合</th><th>刺殺</th><th>補殺</th><th>失策</th><th>守備率</th><th>好守備</th><th>守備得点</th>${p.position === 'C' ? '<th>盗塁企図</th><th>阻止</th><th>阻止率</th><th>捕逸</th>' : ''}</tr>`;
      const fr = (label, f, cls = '') => {
        if (!f) return '';
        const pct = G.fieldingPct(f);
        const c = p.position === 'C' ? `<td>${f.sba}</td><td>${f.cs}</td><td>${f.sba ? G.fmtRate(f.cs, f.sba) : '.---'}</td><td>${f.pb}</td>` : '';
        return `<tr class="${cls}"><td>${label}</td><td>${f.g}</td><td>${f.po}</td><td>${f.a}</td><td>${f.e}</td><td>${pct === null ? '.---' : pct.toFixed(3).replace(/^0/, '')}</td><td>${f.fine}</td><td class="${f.drs >= 5 ? 'lead' : ''}">${f.drs >= 0 ? '+' : ''}${f.drs.toFixed(1)}</td>${c}</tr>`;
      };
      const yrs = s.career.filter((c) => c.fld && c.fld.g).map((c) => fr(`${c.year}`, c.fld)).join('');
      defense = `<h3 class="mt">守備成績（${G.positionName(p)}）</h3>
        <div class="tbl-wrap"><table class="stats">${fh}${fr('今季', s.stats.fld || G.emptyFld(), 'me')}${yrs}${yrs ? fr('通算', tot.fld, 'total') : ''}</table></div>
        <p class="muted" style="font-size:12px;margin-top:-8px">守備得点：平均的な守備と比べて何点防いだか（プラスほど良い）。守備の評価は打順・スタメン争いやゴールデングラブ賞にも影響する。</p>`;
    }
    return `<div class="panel"><h3>${s.year}年 今季成績</h3>${cur}${defense}${raceView(s)}${career}</div>`;
  };

  const teamTab = (s) => {
    const p = s.player;
    const R = G.ensureRoster(s);
    G.assignTeamRoles(s);
    const team = G.teamById(p.teamId);
    const tag = (m) => (G.mateTag(m) ? `<span class="tag friend">${G.mateTag(m)}</span>` : '') + (m.rookie ? '<span class="tag">新人</span>' : '') + (m.injured ? '<span class="tag injury">故障</span>' : '');
    const batStat = (st) => (st.pa ? `${G.fmtRate(st.h, st.ab)}・${st.hr}本・${st.rbi}点` : '-');
    const pitStat = (st) => (st.g ? `${st.g}登板 ${st.w}勝${st.l}敗${st.s ? ` ${st.s}S` : ''}${st.hld ? ` ${st.hld}H` : ''} 防${G.fmtERA(st.er, st.outs)}` : '-');
    // レギュラー争い
    let rivalBox = '';
    const rv = G.positionRival(s);
    if (rv && !s.retired) {
      const meStarter = p.squad === 'first' && p.usage && p.usage.status === 'starter';
      rivalBox = `<div class="usage"><b>${G.positionName(p)}のレギュラー争い</b>
        <small>${meStarter ? 'いまはあなたがレギュラー。' : 'いまのレギュラーは'}${esc(rv.name)}（${rv.age}歳・総合${G.rank(rv.rating)}・守備${G.rank(rv.prof.fielding)}）今季 ${batStat(rv.stats.bat)}${rv.stats.fld.g ? `・失策${rv.stats.fld.e}` : ''}</small></div>`;
    }
    // スタメン（打順）
    const lu = G.lineup(s)
      .map((r) => {
        if (r.me) {
          const st = s.stats.bat;
          return `<tr class="me"><td>${r.slot}番</td><td style="text-align:left">${esc(p.name)}（あなた）</td><td>${G.posById(p.position).name}</td><td>${rankBadge(Math.round(G.overall(p)))}</td><td>${batStat(st)}</td></tr>`;
        }
        const m = r.m;
        return `<tr><td>${r.slot}番</td><td style="text-align:left">${esc(m.name)} ${tag(m)}</td><td>${G.posById(m.pos).name}</td><td>${rankBadge(m.rating)}</td><td>${batStat(m.stats.bat)}</td></tr>`;
      })
      .join('');
    const pitcherSlot = '<tr><td>9番</td><td style="text-align:left" class="muted">（先発投手）</td><td>投手</td><td></td><td></td></tr>';
    // 野手一覧
    const fielders = R.players
      .filter((m) => m.pos !== 'P')
      .sort((a, b) => ({ regular: 0, bench: 1, farm: 2 }[a.role] - { regular: 0, bench: 1, farm: 2 }[b.role] || b.rating - a.rating))
      .map((m) => {
        const pct = G.fieldingPct(m.stats.fld);
        return `<tr><td style="text-align:left">${esc(m.name)} ${tag(m)}</td><td>${G.posById(m.pos).name}</td><td>${m.age}</td><td>${rankBadge(m.rating)}</td><td>${G.rank(m.prof.contact)}/${G.rank(m.prof.power)}/${G.rank(m.prof.speed)}/${G.rank(m.prof.fielding)}</td><td>${G.TEAM_ROLE_NAME[m.role]}</td><td>${batStat(m.stats.bat)}</td><td>${pct === null ? '-' : pct.toFixed(3).replace(/^0/, '')}${m.stats.fld.e ? `（失${m.stats.fld.e}）` : ''}</td></tr>`;
      })
      .join('');
    const roleOrder = { SP: 0, CL: 1, setup: 2, mid: 3, mop: 4, farm: 5 };
    const pitchers = R.players
      .filter((m) => m.pos === 'P')
      .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || b.rating - a.rating)
      .map((m) => `<tr><td style="text-align:left">${esc(m.name)} ${tag(m)}</td><td>${G.TEAM_ROLE_NAME[m.role] || '中継ぎ'}</td><td>${m.age}</td><td>${rankBadge(m.rating)}</td><td>${m.prof.velocity}km/h</td><td style="text-align:left">${pitStat(m.stats.pit)}</td></tr>`)
      .join('');
    const meP = G.isPitcher(p) && !s.retired ? `<tr class="me"><td style="text-align:left">${esc(p.name)}（あなた）</td><td>${p.squad === 'first' ? G.roleName(p) : G.squadName(p)}</td><td>${p.age}</td><td>${rankBadge(Math.round(G.overall(p)))}</td><td>${p.pitcher.velocity}km/h</td><td style="text-align:left">${pitStat(s.stats.pit)}</td></tr>` : '';
    const departed = R.departed && R.departed.length ? `<p class="muted" style="font-size:13px">昨オフにチームを去った選手：${R.departed.map((d) => `${esc(d.name)}（${esc(d.why)}）`).join('、')}</p>` : '';
    return `<div class="panel">
      <h3><span class="team-chip" style="background:${team.color}">${team.short}</span> ${team.name}</h3>
      ${rivalBox}
      <h3 class="mt">いまのスタメン</h3>
      <div class="tbl-wrap"><table class="stats"><tr><th>打順</th><th>選手</th><th>守備</th><th>総合</th><th>今季</th></tr>${lu}${pitcherSlot}</table></div>
      <h3>野手</h3>
      <div class="tbl-wrap"><table class="stats"><tr><th>選手</th><th>守備</th><th>年齢</th><th>総合</th><th>ミ/パ/走/守</th><th>起用</th><th>今季（率・本・点）</th><th>守備率</th></tr>${fielders}</table></div>
      <h3>投手</h3>
      <div class="tbl-wrap"><table class="stats"><tr><th>選手</th><th>役割</th><th>年齢</th><th>総合</th><th>球速</th><th>今季</th></tr>${meP}${pitchers}</table></div>
      ${departed}
    </div>${standingsTab(s)}`;
  };

  const snsTab = (s) => {
    const p = s.player;
    const r = G.egoSearch(s);
    const tone = (x) => (x.sent > 0 ? 'pos' : x.sent < 0 ? 'neg' : 'neu');
    return `<div class="panel">
      <div class="sns-head"><div><h3 style="margin:0">「${esc(p.name.split(' ')[0])}」の検索結果</h3>
        <small class="muted">フォロワー ${Math.round(p.followers).toLocaleString()}人・投稿は毎週変わる</small></div>
        <div class="fan-meter"><small class="muted">ファンの評判</small><b class="${r.score >= 60 ? 'pos' : r.score < 45 ? 'neg' : ''}">${r.label}</b>
        <div class="track"><div class="fill" style="width:${r.score}%"></div></div>
        <small class="muted">好意的 ${r.pos}・中立 ${r.neutral}・批判的 ${r.neg}</small></div></div>
      <ul class="timeline-sns">${r.posts
        .map(
          (x) => `<li class="post ${tone(x)}"><div class="avatar">${esc(x.name.slice(0, 1))}</div><div class="body">
          <div class="who"><b>${esc(x.name)}</b> <span class="muted">${esc(x.handle)}・${esc(x.time)}</span></div>
          <div class="text">${esc(x.text)}</div>
          <div class="muted meta">💬 ${Math.round(x.rt / 2)}　🔁 ${x.rt}　♡ ${x.likes}</div></div></li>`,
        )
        .join('')}</ul>
      <p class="muted" style="font-size:12px">投稿は架空のファンによるものです。成績・起用・守備・私生活の出来事によって内容が変わります。</p>
    </div>`;
  };

  const standingsTab = (s) => {
    const p = s.player;
    const showMlb = p.league === 'mlb' || s.flags.mlbStart;
    return `<div class="panel">${G.LEAGUES.filter((lg) => !lg.mlb || showMlb).map((lg) => {
      const rows = G.leagueRanking(s, lg.id);
      return `<h3>${lg.name}</h3><div class="tbl-wrap"><table class="stats"><tr><th>順位</th><th>球団</th><th>試合</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>差</th></tr>${rows
        .map((r, i) => {
          const t = G.teamById(r.id);
          return `<tr class="${r.id === p.teamId ? 'me' : ''}"><td>${i + 1}</td><td style="text-align:left"><span class="team-chip" style="background:${t.color}">${t.short}</span> ${t.name}</td><td>${r.w + r.l + r.d}</td><td>${r.w}</td><td>${r.l}</td><td>${r.d}</td><td>${r.w + r.l ? r.pct.toFixed(3).replace(/^0/, '') : '.000'}</td><td>${i === 0 ? '-' : r.gb.toFixed(1)}</td></tr>`;
        })
        .join('')}</table></div>`;
    }).join('')}</div>`;
  };

  const draftTab = (s) => {
    const p = s.player;
    if (!s.draft) return '<div class="panel"><p class="muted">ドラフトの記録がありません。</p></div>';
    const f = ui.draftFilter || 'all';
    const tot = G.careerTotals(s);
    const meStatus = s.ended || s.retired ? '引退' : p.league === 'mlb' ? (p.squad === 'first' ? 'MLB' : 'マイナー') : p.squad === 'first' ? '1軍' : '2軍';
    const rows = s.draft.picks
      .filter((d) => f === 'all' || (f === 'r1' && d.round === 1) || (f === 'team' && d.teamId === G.draftTeamOf(s)) || (f === 'active' && (d.me ? !s.retired : !d.retired)))
      .map((d) => {
        const team = G.teamById(d.teamId);
        if (d.me) {
          const line = G.isPitcher(p) ? `${tot.pit.g}登板 ${tot.pit.w}勝${tot.pit.s}S 防${G.fmtERA(tot.pit.er, tot.pit.outs)}` : `${tot.bat.g}試合 ${tot.bat.h}安打 ${tot.bat.hr}本 率${G.fmtRate(tot.bat.h, tot.bat.ab)}`;
          return `<tr class="me"><td>${d.round}位</td><td style="text-align:left"><span class="team-chip" style="background:${team.color}">${team.short}</span></td><td style="text-align:left">${esc(p.name)}（あなた）</td><td>${G.posById(p.position).name}</td><td>${p.age}</td><td><span class="st ${G.draftStatusClass(meStatus)}">${meStatus}</span></td><td style="text-align:left">${line}</td><td>${tot.war.toFixed(1)}</td><td style="text-align:left">-</td></tr>`;
        }
        const t = d.tot;
        const line = d.pos === 'P' ? (t.pit.g ? `${t.pit.g}登板 ${t.pit.w}勝${t.pit.s}S 防${G.fmtERA(t.pit.er, t.pit.outs)}` : '1軍登板なし') : t.bat.g ? `${t.bat.g}試合 ${t.bat.h}安打 ${t.bat.hr}本 率${G.fmtRate(t.bat.h, t.bat.ab)}` : '1軍出場なし';
        let last = '-';
        if (d.last) {
          const l = d.last;
          last = d.pos === 'P' ? (l.pit.g ? `${l.pit.w}勝${l.pit.s}S 防${G.fmtERA(l.pit.er, l.pit.outs)}` : '出場なし') : l.bat.g ? `率${G.fmtRate(l.bat.h, l.bat.ab)} ${l.bat.hr}本` : '出場なし';
        }
        const rival = d.id === s.draft.rivalId ? ' <span class="tag friend">ライバル</span>' : '';
        return `<tr><td>${d.round}位</td><td style="text-align:left"><span class="team-chip" style="background:${team.color}">${team.short}</span></td><td style="text-align:left">${esc(d.name)}${rival}</td><td>${G.posById(d.pos).name}</td><td>${d.age}</td><td><span class="st ${G.draftStatusClass(d.status)}">${esc(d.status)}</span></td><td style="text-align:left">${line}</td><td>${d.war.toFixed(1)}</td><td style="text-align:left">${last}${d.note ? `<br><small class="muted">${esc(d.note)}</small>` : ''}</td></tr>`;
      })
      .join('');
    const filters = [['all', '全員'], ['r1', '1位指名'], ['team', '同じ球団'], ['active', '現役のみ']]
      .map(([id, name]) => `<button class="place ${f === id ? 'on' : ''}" data-act="draftFilter" data-arg="${id}">${name}</button>`)
      .join('');
    const active = s.draft.picks.filter((d) => (d.me ? !s.retired : !d.retired)).length;
    return `<div class="panel"><h3>${s.draft.year}年 ドラフト会議 <span class="muted" style="font-size:13px">指名${s.draft.picks.length}人・現役${active}人</span></h3>
      <p class="muted" style="font-size:13px;margin-top:0">同じ年にプロ入りした同期たちの現在。成績は毎年のシーズン終了後に更新されます。</p>
      <div class="places">${filters}</div>
      <div class="tbl-wrap"><table class="stats draft-table"><tr><th>順位</th><th>球団</th><th>選手</th><th>守備</th><th>年齢</th><th>状態</th><th>通算成績（1軍）</th><th>WAR</th><th>昨季</th></tr>${rows}</table></div>
    </div>`;
  };

  const shopTab = (s) => {
    const p = s.player;
    return `<div class="panel"><h3>ショップ <span class="muted" style="font-size:13px">所持金 ${G.fmtMoney(p.money)}</span></h3>
      <p class="muted" style="font-size:13px;margin-top:0">買い物では週は進みません。購入するとすぐに効果が出ます。</p>
      <div class="shop-grid">${G.SHOP_ITEMS.map((it) => {
        const owned = it.once && it.id === 'car' && p.car;
        const trainerActive = it.id === 'trainer' && s.flags.trainerUntil === s.year;
        const ok = !owned && !trainerActive && p.money >= it.price;
        return `<div class="shop-item"><b>${it.name}</b><small class="muted">${it.desc}</small>
          <div class="act-foot"><span class="price">${G.fmtMoney(it.price)}</span>
          <button class="btn small" data-act="buy" data-arg="${it.id}" ${ok ? '' : 'disabled'}>${owned ? '購入済' : trainerActive ? '契約中' : '購入'}</button></div></div>`;
      }).join('')}</div></div>`;
  };

  const titleCounts = (titles) => {
    const m = new Map();
    for (const t of titles) m.set(t.name, (m.get(t.name) || 0) + 1);
    return [...m.entries()];
  };

  const affBar = (x) => {
    const v = Math.min(100, x.aff);
    const color = x.group === 'love' ? '#e0569b' : '#3b8ee0';
    return `<div class="track"><div class="fill" style="width:${v}%;background:${color}"></div></div>`;
  };

  const peopleTab = (s) => {
    const P = s.people;
    const card = (x, extra = '') => {
      const stage = x.group === 'love' ? G.STAGE_NAME[x.stage] : '';
      return `<div class="person ${x.group === 'love' ? 'love' : ''}">
        <div class="row"><b>${esc(x.name)}</b>${stage ? `<span class="tag ${x.stage}">${stage}</span>` : ''}</div>
        <small class="muted">${esc(x.role)}${x.retired && x.id === 'rival' ? '（引退）' : ''}</small>
        <div class="bar aff"><span>${x.group === 'love' ? '好感度' : '親密度'}</span>${affBar(x)}<span class="val">${Math.round(x.aff)}</span></div>${extra}</div>`;
    };
    const team = ['senpai', 'rival', 'coach', 'kohai'].map((id) => P[id]).filter((x) => x.met);
    const rival = P.rival;
    const rivalNote = `<small class="muted">通算WAR ${rival.war.toFixed(1)}${rival.best ? `・${esc(rival.best)}` : ''}</small>`;
    const others = ['parents', 'friend', 'reporter'].map((id) => P[id]).filter((x) => x.met);
    const love = G.heroines(s).filter((h) => h.met);
    const unmet = G.heroines(s).filter((h) => !h.met).length;
    const pt = G.partner(s);
    return `<div class="panel">
      <h3>チーム</h3><div class="people">${team.map((x) => card(x, x.id === 'rival' ? rivalNote : '')).join('')}</div>
      <h3 class="mt">家族・友人・仕事</h3><div class="people">${others.map((x) => card(x)).join('')}</div>
      <h3 class="mt">恋愛</h3>
      ${love.length ? `<div class="people">${love.map((h) => card(h, s.story[`liked_${h.id}`] || h.dates >= 3 ? `<small class="muted">好み：${esc({ quiet: '落ち着いたデート', active: 'アクティブなデート', luxury: 'おしゃれなディナー', casual: '気軽なデート' }[G.heroineType(h).likes])}</small>` : '')).join('')}</div>` : '<p class="muted">まだ特別な出会いはない。</p>'}
      ${unmet && !pt ? `<p class="hint">まだ出会っていない人が${unmet}人いる。カフェ、ジム、取材やテレビ出演、地元への帰省で出会えるかも。</p>` : ''}
      <p class="muted" style="font-size:12px">親密度が上がると、特別なイベントが起こることがある。恋人とは会わない日が続くと好感度が下がっていく。</p>
    </div>`;
  };

  const lifeTab = (s) => {
    const p = s.player;
    const tc = titleCounts(s.titles);
    const sp = G.spouse(s);
    const pt = G.partner(s);
    let family = '';
    if (sp) family += `<dt>配偶者</dt><dd>${esc(sp.name)}（${sp.marriedYear || s.year}年 結婚）</dd>`;
    else if (pt) family += `<dt>${G.STAGE_NAME[pt.stage]}</dt><dd>${esc(pt.name)}</dd>`;
    else family += '<dt>恋人</dt><dd>いない</dd>';
    family += `<dt>子供</dt><dd>${p.kids.length ? p.kids.map((k) => `${esc(k.name)}（${G.kidAge(s, k)}歳${k.baseball ? '・野球' : ''}）`).join('、') : 'いない'}</dd>`;
    family += `<dt>両親</dt><dd>親密度 ${Math.round(s.people.parents.aff)}</dd>`;
    if (p.dog) family += `<dt>ペット</dt><dd>犬の${esc(p.dog)}</dd>`;
    if (p.car) family += '<dt>愛車</dt><dd>スポーツカー</dd>';
    const team = G.teamById(p.teamId);
    const home = G.homeById(p.home);
    const homes = G.HOMES.filter((h) => h.id !== p.home)
      .map((h) => {
        let why = '';
        if (h.id === 'dorm' && (sp || p.age >= 28)) why = '入れない';
        else if (p.money < h.price) why = 'お金が足りない';
        return `<div class="shop-item"><b>${h.name}</b><small class="muted">${h.desc}</small><small class="muted">維持費 週${h.weekly}万円・休養+${h.rest}</small>
          <div class="act-foot"><span class="price">${h.price ? G.fmtMoney(h.price) : '初期費用なし'}</span>
          <button class="btn small" data-act="move" data-arg="${h.id}" ${why ? 'disabled' : ''}>${why || '引っ越す'}</button></div></div>`;
      })
      .join('');
    const styles = G.LIFESTYLES.map(
      (l) => `<button class="choice ${p.lifestyle === l.id ? 'on' : ''}" data-act="lifestyle" data-arg="${l.id}">${l.name}<small>${l.desc}</small></button>`,
    ).join('');
    const hobby = p.hobby ? `${G.hobbyById(p.hobby).name}（レベル${p.hobbyLv}）：${G.hobbyById(p.hobby).desc}` : 'まだない（「オフの過ごし方」の自宅から始められる）';
    return `<div class="panel">
      <div class="grid2">
        <div><h3>プロフィール</h3><dl class="kv">
          <dt>所属</dt><dd>${team.name}</dd>
          <dt>入団</dt><dd>${s.startYear}年 ドラフト${p.draftRank}位</dd>
          <dt>経歴</dt><dd>${G.BACKGROUNDS.find((b) => b.id === p.background).name}</dd>
          <dt>SNSフォロワー</dt><dd>${Math.round(p.followers).toLocaleString()}人</dd>
          <dt>生涯年収</dt><dd>${G.fmtMoney(s.totalEarnings)}</dd>
        </dl></div>
        <div><h3>家族</h3><dl class="kv">${family}</dl></div>
      </div>
      <h3>住まい <span class="muted" style="font-size:13px">いま：${home.name}</span></h3>
      <div class="shop-grid">${homes}</div>
      <h3 class="mt">生活レベル</h3><div class="choices">${styles}</div>
      <h3 class="mt">趣味</h3><p style="margin:0">${esc(hobby)}</p>
      <h3 class="mt">獲得タイトル・表彰</h3>
      ${tc.length ? `<div class="titles">${tc.map(([n, c]) => `<span class="trophy">🏆 ${n}${c > 1 ? ` ×${c}` : ''}</span>`).join('')}</div>` : '<p class="muted">まだありません。</p>'}
      <h3 class="mt">年表</h3>
      ${
        s.history.length
          ? `<ul class="timeline">${s.history
              .slice()
              .reverse()
              .map((h) => `<li><b>${h.year}</b>${esc(h.text)}</li>`)
              .join('')}</ul>`
          : '<p class="muted">これから刻まれていく。</p>'
      }
      <div class="act-foot mt"><span class="muted" style="font-size:13px">データは毎週自動でセーブされます。</span>
      ${s.after ? '<button class="btn danger small" data-act="finishStory">物語を締めくくる</button>' : p.age >= 30 ? '<button class="btn danger small" data-act="retire">現役引退を表明する</button>' : ''}</div>
    </div>`;
  };

  const modalView = (s) => {
    const q = s.queue[0];
    if (!q) return '';
    const choices = G.sceneChoices(s, q);
    return `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">
      <div class="modal-title">${esc(q.title)}</div>
      ${q.big ? `<div class="big-banner">${esc(q.big)}</div>` : ''}
      <div class="modal-text">${br(q.text)}</div>
      ${q.input ? `<div class="modal-input"><label for="modalInput">名前</label><input id="modalInput" maxlength="8" value="${esc(q.input)}" autocomplete="off"></div>` : ''}
      <div class="modal-choices">${choices
        .map((c, i) => `<button class="btn ${i > 0 && q.kind !== 'info' ? 'sub' : ''}" data-act="choice" data-arg="${i}">${esc(c)}</button>`)
        .join('')}</div>
    </div></div>`;
  };

  const gameView = () => {
    const s = ui.s;
    const p = s.player;
    const team = G.teamById(p.teamId);
    const m = G.monthOf(s.week, s.year);
    const phase = G.phaseOf(s.week, s.year);
    let body;
    if (ui.tab === 'upgrade') body = upgradeTab(s);
    else if (ui.tab === 'stats') body = statsTab(s);
    else if (ui.tab === 'team') body = teamTab(s);
    else if (ui.tab === 'sns') body = snsTab(s);
    else if (ui.tab === 'shop') body = shopTab(s);
    else if (ui.tab === 'life') body = lifeTab(s);
    else if (ui.tab === 'people') body = peopleTab(s);
    else if (ui.tab === 'draft') body = draftTab(s);
    else body = actionTab(s);
    return `<header class="topbar">
        <div class="date">${s.year}年 ${G.weekLabel(s.year, s.week)}${s.after ? '' : `<span class="phase">${phase.name}</span>`}</div>
        <div class="team"><span class="team-chip" style="background:${team.color}">${team.short}</span>${team.name}</div>
        <div class="spacer"></div>
        <button class="btn sub" data-act="quit">タイトルへ</button>
      </header>
      <div class="layout">${playerCard(s)}<main>${tabsView(s)}${body}</main></div>
      ${modalView(s)}`;
  };

  // ================= エンディング =================
  const familyEpilogue = (s) => {
    const p = s.player;
    const sp = G.spouse(s);
    const kids = p.kids;
    const ballKid = kids.find((k) => k.baseball && G.kidAge(s, k) >= 10);
    let t = '';
    if (sp) t += `${sp.name}と${kids.length ? `${kids.length}人の子供たち` : 'ふたり'}で、穏やかな毎日を送っている。`;
    else if (kids.length) t += `子供たちの成長を見守るのが、何よりの楽しみだ。`;
    else t += 'ひとりの時間も、それはそれで悪くない。';
    if (ballKid) t += `${ballKid.name}は今、本気でプロ野球選手を目指している。`;
    if (p.hobby && p.hobbyLv >= 25) t += `趣味の${G.hobbyById(p.hobby).name}の腕前は、もはやプロ級だ。`;
    return t;
  };
  const closePeople = (s) => {
    const close = Object.values(s.people).filter((x) => x.group !== 'love' && x.met && x.aff >= 70);
    return close.length ? `今も付き合いが続く仲間：${close.map((x) => x.name).join('、')}` : '';
  };


  const endingView = () => {
    const s = ui.s;
    const p = s.player;
    const e = s.ending;
    const tot = G.careerTotals(s);
    const pitcher = G.isPitcher(p);
    const tc = titleCounts(s.titles);
    let main;
    if (pitcher) {
      const st = tot.pit;
      main = `<dt>登板</dt><dd>${st.g}</dd><dt>勝利</dt><dd>${st.w}</dd><dt>敗戦</dt><dd>${st.l}</dd><dt>セーブ</dt><dd>${st.s}</dd><dt>ホールド</dt><dd>${st.hld}</dd>
        <dt>投球回</dt><dd>${G.fmtIP(st.outs)}</dd><dt>奪三振</dt><dd>${st.k}</dd><dt>防御率</dt><dd>${G.fmtERA(st.er, st.outs)}</dd>`;
    } else {
      const st = tot.bat;
      main = `<dt>試合</dt><dd>${st.g}</dd><dt>安打</dt><dd>${st.h}</dd><dt>本塁打</dt><dd>${st.hr}</dd><dt>打点</dt><dd>${st.rbi}</dd>
        <dt>盗塁</dt><dd>${st.sb}</dd><dt>打率</dt><dd>${G.fmtRate(st.h, st.ab)}</dd><dt>OPS</dt><dd>${st.pa ? G.batDerived(st).ops.toFixed(3) : '-'}</dd>`;
    }
    const head = pitcher ? pitHead : batHead;
    const rows = s.career
      .map((c) => {
        const label = `${c.year} ${G.teamById(c.team).short} (${c.age})`;
        return pitcher ? pitRow(label, c.pit) : batRow(label, c.bat);
      })
      .join('');
    return `<div class="ending">
      <div class="hero">
        <div>⚾ ${esc(e.reason)} ⚾</div>
        <h1>${esc(p.name)}</h1>
        <div>${e.age}歳で引退・プロ${e.years}年${s.after ? `／${p.age}歳まで生きた人生の物語` : ''}</div>
        <div class="legend">${esc(e.title)}</div>
        <div class="badges">${e.meikyu ? '<span>🏅 名球会入り</span>' : ''}${e.hall ? '<span>🏛 野球殿堂入り</span>' : ''}</div>
      </div>
      ${e.life ? `<div class="panel life-score"><div><small class="muted">人生の評価</small><div class="ls-label">${esc(e.life.label)}</div></div>
        <div class="ls-num">${e.life.score}<small>点</small></div><div class="muted" style="font-size:13px">平均充実度 ${e.life.avgHappy}・${esc(closePeople(s))}</div></div>` : ''}
      <div class="grid2">
        <div class="panel"><h3>通算成績</h3><dl class="kv">${main}<dt>通算WAR</dt><dd>${tot.war.toFixed(1)}</dd><dt>生涯年収</dt><dd>${G.fmtMoney(s.totalEarnings)}</dd></dl></div>
        <div class="panel"><h3>第二の人生：${esc(e.careerName || '')}</h3><p>${esc(e.after)}</p>
          <p>${esc(familyEpilogue(s))}</p>
          ${s.after && s.after.titles.length ? `<h3>引退後の歩み</h3><ul class="timeline">${s.after.titles.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          ${p.kids.filter((k) => k.pro).map((k) => `<p>🎉 ${esc(k.name)}は${G.teamById(k.pro.team).name}にドラフト${k.pro.round}位で入団し、親子二代のプロ野球選手になった。</p>`).join('')}
          <h3>タイトル・表彰</h3>${tc.length ? `<div class="titles">${tc.map(([n, c]) => `<span class="trophy">🏆 ${n}${c > 1 ? ` ×${c}` : ''}</span>`).join('')}</div>` : '<p class="muted">なし</p>'}
        </div>
      </div>
      <div class="panel"><h3>年度別成績</h3><div class="tbl-wrap"><table class="stats">${head('年度')}${rows}${
        pitcher ? pitRow('通算', tot.pit, 'total') : batRow('通算', tot.bat, 'total')
      }</table></div>
      ${s.history.length ? `<h3>年表</h3><ul class="timeline">${s.history.map((h) => `<li><b>${h.year}</b>${esc(h.text)}</li>`).join('')}</ul>` : ''}
      </div>
      <div class="center mt"><button class="btn big" data-act="totitle">タイトルへ</button></div>
    </div>`;
  };

  // ================= 描画 =================
  const render = () => {
    let html;
    if (ui.screen === 'create') html = createView();
    else if (ui.screen === 'game') html = gameView();
    else if (ui.screen === 'ending') html = endingView();
    else html = titleView();
    if (ui.confirm) {
      html += `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">
        <div class="modal-title">確認</div><div class="modal-text">${br(ui.confirm.text)}</div>
        <div class="modal-choices"><button class="btn" data-act="confirmYes">${esc(ui.confirm.yes)}</button>
        <button class="btn sub" data-act="confirmNo">やめる</button></div></div></div>`;
    }
    app.innerHTML = html;
  };

  const afterTurn = () => {
    if (ui.s.ended && !ui.s.queue.length) ui.screen = 'ending';
    save();
    render();
  };

  // ================= 操作 =================
  const handlers = {
    newgame: (arg) => {
      ui.slot = Number(arg);
      ui.create = defaultCreate();
      ui.screen = 'create';
      render();
    },
    continue: (arg) => {
      const s = G.loadAll()[Number(arg)];
      if (!s) return;
      G.migrate(s);
      // 週の試合の途中で中断していたら、次に判断が必要なところまで進める
      if (s.gw && !s.gw.await && !s.gw.last) G.stepGames(s, null);
      s.slot = Number(arg);
      ui.s = s;
      ui.tab = 'action';
      ui.screen = s.ended ? 'ending' : 'game';
      render();
      window.scrollTo(0, 0);
    },
    delete: (arg) => {
      ui.confirm = {
        text: `スロット${Number(arg) + 1}のデータを削除しますか？`,
        yes: '削除する',
        run: () => G.deleteSlot(Number(arg)),
      };
      render();
    },
    totitle: () => {
      ui.screen = 'title';
      ui.s = null;
      render();
      window.scrollTo(0, 0);
    },
    setc: (arg) => {
      const [k, v] = arg.split(':');
      ui.create[k] = v;
      if (k === 'position' && v === 'P' && ui.create.hand === 'RS') ui.create.hand = 'RR';
      // 投手と野手で選べる武器が違うので、切り替えたら合うものに戻す
      if (k === 'position' && !G.weaponsFor(v).some((w) => w.id === ui.create.weapon)) ui.create.weapon = G.weaponsFor(v)[v === 'P' ? 0 : 1].id;
      render();
    },
    randname: () => {
      ui.create.family = G.pick(G.SURNAMES);
      ui.create.given = G.pick(G.MALE_NAMES);
      render();
    },
    start: () => {
      const family = (ui.create.family || '').trim().replace(/\s+/g, '');
      const given = (ui.create.given || '').trim().replace(/\s+/g, '');
      if (!family || !given) {
        toast(!family ? '苗字を入力してください' : '名前を入力してください');
        return;
      }
      const name = `${family} ${given}`;
      ui.s = G.newGame({ ...ui.create, name }, ui.slot);
      ui.tab = 'action';
      ui.screen = 'game';
      save();
      render();
      window.scrollTo(0, 0);
    },
    tab: (arg) => {
      ui.tab = arg;
      render();
    },
    selTrain: (arg) => {
      ui.sel.train = arg;
      render();
    },
    selPriv: (arg) => {
      ui.sel.priv = arg;
      render();
    },
    place: (arg) => {
      ui.place = arg;
      render();
    },
    week: () => {
      if (ui.s.queue.length) return;
      if (ui.s.after) {
        G.doAfterWeek(ui.s, ui.sel.work, ui.sel.priv);
        afterTurn();
        return;
      }
      syncSelection(ui.s);
      G.doAction(ui.s, ui.sel.train, ui.sel.priv);
      afterTurn();
    },
    auto: () => {
      const s = ui.s;
      if (s.after) {
        for (let i = 0; i < 4 && !s.queue.length && !s.ended; i++) {
          const w = G.afterWorks(s).filter((x) => x.ok);
          G.doAfterWeek(s, G.pick(w).id, 'relax');
        }
        afterTurn();
        return;
      }
      const prevMode = s.flags.gameMode;
      s.flags.gameMode = 'auto';
      for (let i = 0; i < 4; i++) {
        if (s.queue.length || s.ended || s.retired || s.gw) break;
        const p = s.player;
        const train = G.trainingOptions(s);
        let id;
        if (p.stamina < 45) id = 'rest';
        else {
          const t = train.filter((a) => !a.risky && !a.rest);
          id = t.length ? G.pick(t).id : 'rest';
        }
        G.doAction(s, id, 'relax');
      }
      s.flags.gameMode = prevMode;
      afterTurn();
    },
    approach: (arg) => {
      if (!ui.s.gw || ui.s.queue.length) return;
      G.stepGames(ui.s, arg);
      afterTurn();
    },
    nextGame: () => {
      if (!ui.s.gw || ui.s.queue.length) return;
      G.stepGames(ui.s, null);
      afterTurn();
    },
    autoGames: () => {
      if (!ui.s.gw || ui.s.queue.length) return;
      G.autoRestGames(ui.s);
      afterTurn();
    },
    gameMode: (arg) => {
      ui.s.flags.gameMode = arg;
      save();
      render();
    },
    defaultAp: (arg) => {
      ui.s.flags[G.isPitcher(ui.s.player) ? 'pitApproach' : 'batApproach'] = arg;
      save();
      render();
    },
    selWork: (arg) => {
      ui.sel.work = arg;
      render();
    },
    draftFilter: (arg) => {
      ui.draftFilter = arg;
      render();
    },
    finishStory: () => {
      ui.confirm = {
        text: 'ここで物語を締めくくり、エンディングを見ますか？',
        yes: 'エンディングへ',
        run: () => {
          G.finishLife(ui.s, ui.s.after.career);
          ui.screen = 'ending';
          save();
        },
      };
      render();
    },
    move: (arg) => {
      if (G.moveHome(ui.s, arg)) toast(`${G.homeById(arg).name}に引っ越した！`);
      else toast('引っ越せませんでした');
      save();
      render();
    },
    lifestyle: (arg) => {
      ui.s.player.lifestyle = arg;
      save();
      render();
    },
    raise: (arg) => {
      if (!G.raiseAbility(ui.s.player, arg)) toast('経験点が足りません');
      save();
      render();
    },
    raise5: (arg) => {
      let n = 0;
      for (let i = 0; i < 5; i++) if (G.raiseAbility(ui.s.player, arg)) n++;
      if (!n) toast('経験点が足りません');
      else if (n < 5) toast(`${n}だけ上げました（経験点不足）`);
      save();
      render();
    },
    raisePitch: (arg) => {
      if (!G.raisePitch(ui.s.player, arg)) toast('経験点が足りません');
      save();
      render();
    },
    learnPitch: () => {
      const sel = document.getElementById('newpitch');
      if (!sel) return;
      if (G.learnPitch(ui.s.player, sel.value)) toast(`${G.pitchById(sel.value).name}を覚えた！`);
      else toast('経験点が足りません');
      save();
      render();
    },
    learnSkill: (arg) => {
      if (G.learnSkill(ui.s.player, arg)) toast(`「${G.skillById(arg).name}」を習得した！`);
      else toast('経験点が足りません');
      save();
      render();
    },
    buy: (arg) => {
      const s = ui.s;
      const it = G.SHOP_ITEMS.find((x) => x.id === arg);
      if (!it || s.player.money < it.price) {
        toast('お金が足りません');
        return;
      }
      s.player.money -= it.price;
      const msg = it.use(s.player, s);
      G.log(s, `${it.name}を購入。${msg}`);
      toast(msg);
      save();
      render();
    },
    choice: (arg) => {
      const s = ui.s;
      const q = s.queue[0];
      if (!q) return;
      if (q.kind === 'info') G.dismissScene(s);
      else {
        const input = document.getElementById('modalInput');
        G.resolveScene(s, Number(arg), input ? input.value : undefined);
      }
      afterTurn();
    },
    retire: () => {
      ui.confirm = {
        text: '本当に現役を引退しますか？\n（取り消しできません）',
        yes: '引退する',
        run: () => {
          G.retire(ui.s, '自らの意思で現役を引退した');
          if (ui.s.ended && !ui.s.queue.length) ui.screen = 'ending';
          save();
        },
      };
      render();
    },
    confirmYes: () => {
      const c = ui.confirm;
      ui.confirm = null;
      if (c) c.run();
      render();
    },
    confirmNo: () => {
      ui.confirm = null;
      render();
    },
    quit: () => {
      save();
      handlers.totitle();
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const h = handlers[el.dataset.act];
    if (h) h(el.dataset.arg, el);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'pfamily') ui.create.family = e.target.value;
    if (e.target.id === 'pgiven') ui.create.given = e.target.value;
  });

  render();
})();
