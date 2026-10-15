// 画面描画と操作
(function () {
  const G = window.G;
  const app = document.getElementById('app');
  const toastEl = document.getElementById('toast');
  const esc = G.esc;
  const br = (t) => esc(t).replace(/\n/g, '<br>');

  const defaultCreate = () => ({
    name: G.randomMaleName(),
    position: 'SS',
    hand: 'RR',
    background: 'hs',
    growth: 'random',
  });

  const ui = { screen: 'title', tab: 'action', s: null, create: defaultCreate(), slot: 0, confirm: null };

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
    const m = G.monthOf(s.week);
    return `<b>${esc(p.name)}</b><div class="muted">${team.short}・${G.positionName(p)}・${p.age}歳／${s.year}年${m.month}月・プロ${p.yearsPro + 1}年目</div>`;
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
      <div class="field"><label class="lbl" for="pname">選手名</label>
        <div class="name-row"><input id="pname" maxlength="12" value="${esc(c.name)}" autocomplete="off" />
        <button class="btn sub small" data-act="randname">ランダム</button></div></div>
      <div class="field"><span class="lbl">ポジション</span>${choiceGroup('position', G.POSITIONS, c.position)}</div>
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
      return `<div class="mini-stats"><div><b>1軍</b> ${st.g}登板 ${st.w}勝${st.l}敗 ${st.s}S ${st.hld}H 防御率 <b>${G.fmtERA(st.er, st.outs)}</b></div>
        <div class="muted"><b>2軍</b> ${f.g}登板 ${f.w}勝${f.l}敗 防御率 ${G.fmtERA(f.er, f.outs)}</div></div>`;
    }
    const st = s.stats.bat;
    const f = s.farm.bat;
    return `<div class="mini-stats"><div><b>1軍</b> ${st.g}試合 打率 <b>${G.fmtRate(st.h, st.ab)}</b> ${st.hr}本 ${st.rbi}打点 ${st.sb}盗塁</div>
      <div class="muted"><b>2軍</b> ${f.g}試合 打率 ${G.fmtRate(f.h, f.ab)} ${f.hr}本 ${f.rbi}打点</div></div>`;
  };

  const playerCard = (s) => {
    const p = s.player;
    const team = G.teamById(p.teamId);
    const hand = G.HANDS.find((h) => h.id === p.hand);
    const cond = G.CONDITIONS[p.condition];
    const growth = G.GROWTH_TYPES.find((g) => g.id === p.growth);
    return `<aside class="panel pcard" style="--team:${team.color}">
      <div class="head"><div class="num">${p.number}</div><div><div class="pname">${esc(p.name)}</div>
      <div class="sub">${G.positionName(p)}・${hand.name}・${p.age}歳・プロ${p.yearsPro + 1}年目</div></div></div>
      <div class="tags">
        <span class="tag ${p.squad}">${p.squad === 'first' ? '1軍' : '2軍'}</span>
        ${p.squad === 'first' || G.isPitcher(p) ? `<span class="tag">${G.roleName(p)}</span>` : ''}
        <span class="tag">${growth.name}</span>
        ${p.injury ? `<span class="tag injury">故障中：${esc(p.injury.name)}（残り${p.injury.weeks}週）</span>` : ''}
      </div>
      <div class="cond ${cond.cls}"><span class="arrow">${cond.icon}</span>${cond.name}</div>
      <div class="bars">
        ${bar('体力', p.stamina, staminaColor(p.stamina))}
        ${bar('首脳陣評価', p.trust, '#3b8ee0')}
        ${bar('人気', p.popularity, '#ff8a1f')}
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
    { id: 'standings', name: '順位表' },
    { id: 'shop', name: 'ショップ' },
    { id: 'life', name: '人生' },
  ];

  const tabsView = (s) =>
    `<div class="tabs">${TABS.map(
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
        const m = G.monthOf(g.w);
        return `<div class="log-week"><h4>${g.y}年 ${m.month}月 第${m.weekInMonth}週</h4>${g.items
          .map((l) => `<div class="log-item ${l.cls || ''}">${br(l.text)}</div>`)
          .join('')}</div>`;
      })
      .join('')}</div>`;
  };

  const actionTab = (s) => {
    const acts = G.availableActions(s);
    const mul = G.trainingMultiplier(s);
    const phase = G.phaseOf(s.week);
    const train = acts.filter((a) => a.group === 'train');
    const rest = acts.filter((a) => a.group === 'rest');
    const btn = (a) =>
      `<button class="act ${a.group} ${a.risky ? 'risky' : ''}" data-act="do" data-arg="${a.id}"><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></button>`;
    const games = G.gamesInWeek(s.week);
    let note = '';
    if (games) note = `今週は${games}試合（${s.player.squad === 'first' ? '1軍' : '2軍'}）`;
    else if (phase.id === 'open') note = '今週はオープン戦';
    const p = s.player;
    const cond = G.CONDITIONS[p.condition];
    const quick = `<div class="quick"><span class="cond ${cond.cls}"><span class="arrow">${cond.icon}</span>${cond.name}</span>
      <span>体力 <b style="color:${staminaColor(p.stamina)}">${Math.round(p.stamina)}</b></span>
      <span>評価 <b>${Math.round(p.trust)}</b></span><span class="tag ${p.squad}">${p.squad === 'first' ? '1軍' : '2軍'}</span>
      ${p.injury ? `<span class="tag injury">故障 残り${p.injury.weeks}週</span>` : ''}</div>`;
    return `<div class="panel">${quick}
      <div class="section-title">練習 <span class="muted">練習効率 ×${mul.toFixed(2)}（${phase.name}・${G.CONDITIONS[s.player.condition].name}）</span></div>
      <div class="act-grid">${train.map(btn).join('')}</div>
      <div class="section-title">休息・プライベート</div>
      <div class="act-grid">${rest.map(btn).join('')}</div>
      <div class="act-foot"><span class="muted" style="font-size:13px">${note}</span>
        <button class="btn sub small" data-act="auto">おまかせで4週進める</button></div>
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
    const cur = `<div class="tbl-wrap"><table class="stats">${head('')}${row('1軍', s.stats, 'me')}${row('2軍', s.farm)}</table></div>`;

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

    return `<div class="panel"><h3>${s.year}年 今季成績</h3>${cur}${raceView(s)}${career}</div>`;
  };

  const standingsTab = (s) => {
    const p = s.player;
    return `<div class="panel">${G.LEAGUES.map((lg) => {
      const rows = G.leagueRanking(s, lg.id);
      return `<h3>${lg.name}</h3><div class="tbl-wrap"><table class="stats"><tr><th>順位</th><th>球団</th><th>試合</th><th>勝</th><th>敗</th><th>分</th><th>勝率</th><th>差</th></tr>${rows
        .map((r, i) => {
          const t = G.teamById(r.id);
          return `<tr class="${r.id === p.teamId ? 'me' : ''}"><td>${i + 1}</td><td style="text-align:left"><span class="team-chip" style="background:${t.color}">${t.short}</span> ${t.name}</td><td>${r.w + r.l + r.d}</td><td>${r.w}</td><td>${r.l}</td><td>${r.d}</td><td>${r.w + r.l ? r.pct.toFixed(3).replace(/^0/, '') : '.000'}</td><td>${i === 0 ? '-' : r.gb.toFixed(1)}</td></tr>`;
        })
        .join('')}</table></div>`;
    }).join('')}</div>`;
  };

  const shopTab = (s) => {
    const p = s.player;
    return `<div class="panel"><h3>ショップ <span class="muted" style="font-size:13px">所持金 ${G.fmtMoney(p.money)}</span></h3>
      <p class="muted" style="font-size:13px;margin-top:0">買い物では週は進みません。購入するとすぐに効果が出ます。</p>
      <div class="shop-grid">${G.SHOP_ITEMS.map((it) => {
        const owned = it.once && ((it.id === 'house' && p.house) || (it.id === 'car' && p.car));
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

  const lifeTab = (s) => {
    const p = s.player;
    const tc = titleCounts(s.titles);
    let family = '';
    if (p.married) family += `<dt>配偶者</dt><dd>${esc(p.married.name)}（${p.married.year}年 結婚）</dd>`;
    else if (p.girlfriend) family += `<dt>恋人</dt><dd>${esc(p.girlfriend.name)}（好感度 ${Math.round(p.girlfriend.love)}）</dd>`;
    else family += '<dt>恋人</dt><dd>いない</dd>';
    family += `<dt>子供</dt><dd>${p.children}人</dd>`;
    if (p.dog) family += `<dt>ペット</dt><dd>犬の${esc(p.dog)}</dd>`;
    if (p.house) family += '<dt>住まい</dt><dd>高級マンション</dd>';
    if (p.car) family += '<dt>愛車</dt><dd>スポーツカー</dd>';
    const team = G.teamById(p.teamId);
    return `<div class="panel">
      <div class="grid2">
        <div><h3>プロフィール</h3><dl class="kv">
          <dt>所属</dt><dd>${team.name}</dd>
          <dt>入団</dt><dd>${s.startYear}年 ドラフト${p.draftRank}位</dd>
          <dt>経歴</dt><dd>${G.BACKGROUNDS.find((b) => b.id === p.background).name}</dd>
          <dt>ライバル</dt><dd>${esc(s.npc.rival)}</dd>
          <dt>生涯年収</dt><dd>${G.fmtMoney(s.totalEarnings)}</dd>
        </dl></div>
        <div><h3>家族・プライベート</h3><dl class="kv">${family}</dl></div>
      </div>
      <h3>獲得タイトル・表彰</h3>
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
      ${p.age >= 30 ? '<button class="btn danger small" data-act="retire">現役引退を表明する</button>' : ''}</div>
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
      <div class="modal-choices">${choices
        .map((c, i) => `<button class="btn ${i > 0 && q.kind !== 'info' ? 'sub' : ''}" data-act="choice" data-arg="${i}">${esc(c)}</button>`)
        .join('')}</div>
    </div></div>`;
  };

  const gameView = () => {
    const s = ui.s;
    const p = s.player;
    const team = G.teamById(p.teamId);
    const m = G.monthOf(s.week);
    const phase = G.phaseOf(s.week);
    let body;
    if (ui.tab === 'upgrade') body = upgradeTab(s);
    else if (ui.tab === 'stats') body = statsTab(s);
    else if (ui.tab === 'standings') body = standingsTab(s);
    else if (ui.tab === 'shop') body = shopTab(s);
    else if (ui.tab === 'life') body = lifeTab(s);
    else body = actionTab(s);
    return `<header class="topbar">
        <div class="date">${s.year}年 ${m.month}月 第${m.weekInMonth}週<span class="phase">${phase.name}</span></div>
        <div class="team"><span class="team-chip" style="background:${team.color}">${team.short}</span>${team.name}</div>
        <div class="spacer"></div>
        <button class="btn sub" data-act="quit">タイトルへ</button>
      </header>
      <div class="layout">${playerCard(s)}<main>${tabsView(s)}${body}</main></div>
      ${modalView(s)}`;
  };

  // ================= エンディング =================
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
        <div>${e.age}歳・プロ${e.years}年</div>
        <div class="legend">${esc(e.title)}</div>
        <div class="badges">${e.meikyu ? '<span>🏅 名球会入り</span>' : ''}${e.hall ? '<span>🏛 野球殿堂入り</span>' : ''}</div>
      </div>
      <div class="grid2">
        <div class="panel"><h3>通算成績</h3><dl class="kv">${main}<dt>通算WAR</dt><dd>${tot.war.toFixed(1)}</dd><dt>生涯年収</dt><dd>${G.fmtMoney(s.totalEarnings)}</dd></dl></div>
        <div class="panel"><h3>その後の人生</h3><p>${esc(e.after)}</p>
          ${p.married ? `<p>${esc(p.married.name)}と${p.children ? `${p.children}人の子供たち` : ''}に囲まれ、幸せに暮らしている。</p>` : ''}
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
      render();
    },
    randname: () => {
      ui.create.name = G.randomMaleName();
      render();
    },
    start: () => {
      const name = ui.create.name.trim();
      if (!name) {
        toast('選手名を入力してください');
        return;
      }
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
    do: (arg) => {
      if (ui.s.queue.length) return;
      G.doAction(ui.s, arg);
      afterTurn();
    },
    auto: () => {
      const s = ui.s;
      for (let i = 0; i < 4; i++) {
        if (s.queue.length || s.ended) break;
        const p = s.player;
        const acts = G.availableActions(s);
        let id;
        if (p.stamina < 45) id = 'rest';
        else {
          const train = acts.filter((a) => a.group === 'train' && !a.risky);
          id = train.length ? G.pick(train).id : 'rest';
        }
        G.doAction(s, id);
      }
      afterTurn();
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
      else G.resolveScene(s, Number(arg));
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
    if (e.target.id === 'pname') ui.create.name = e.target.value;
  });

  render();
})();
