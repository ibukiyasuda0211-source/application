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
          <span class="btns-row"><button class="btn sub small" data-act="exportSlot" data-arg="${i}">書き出す</button><button class="btn sub small" data-act="importSlot" data-arg="${i}">読み込む</button>
          <button class="btn danger small" data-act="delete" data-arg="${i}">削除</button></span></div></div>`;
      } else {
        rows += `<div class="panel slot"><div class="info"><div class="muted" style="font-size:12px">スロット${i + 1}</div><b>― 空き ―</b></div>
          <div class="btns"><button class="btn blue" data-act="newgame" data-arg="${i}">はじめから</button>
          <button class="btn sub small" data-act="importSlot" data-arg="${i}">セーブを読み込む</button></div></div>`;
      }
    }
    return `<div class="title-screen">
      <div class="logo"><div class="ball">⚾</div><h1>ダイヤモンド・ライフ</h1><p>〜 プロ野球人生シミュレーション 〜</p></div>
      <div class="slots">${rows}</div>
      <div class="credit">ドラフト指名から引退まで、ひとりの野球選手の人生を体験しよう。<br>セーブデータはこのブラウザに保存されます。ブラウザのデータを消すと失われるので、ときどき「書き出す」でファイルに保管しておくと安心です（別の端末に移すときも「書き出す」→「読み込む」）。</div>
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
    { id: 'data', name: 'データ' },
    { id: 'calendar', name: 'カレンダー' },
    { id: 'ach', name: '実績' },
    { id: 'people', name: '人間関係' },
    { id: 'japan', name: '侍ジャパン' },
    { id: 'life', name: '人生' },
    { id: 'shop', name: 'ショップ' },
  ];

  const tabsView = (s) =>
    `<div class="tabs">${TABS.filter((t) => !(s.after && t.id === 'upgrade') && !(t.id === 'japan' && !G.jpTabVisible(s))).map(
      (t) =>
        `<button class="tab ${ui.tab === t.id ? 'on' : ''}" data-act="tab" data-arg="${t.id}">${t.name}${
          (t.id === 'upgrade' && canUpgradeSomething(s.player)) || (t.id === 'ach' && s.achBadge) || (t.id === 'japan' && G.onJapanDuty(s)) ? '<span class="dot"></span>' : ''
        }</button>`,
    ).join('')}</div>`;

  // ログの絞り込み
  const LOG_FILTERS = [
    { id: 'all', name: 'すべて' },
    { id: 'imp', name: '重要' },
    { id: 'game', name: '試合結果' },
    { id: 'usage', name: '起用' },
    { id: 'life', name: '私生活' },
    { id: 'train', name: '練習' },
    { id: 'event', name: '出来事' },
    { id: 'sns', name: 'SNS' },
    { id: 'ach', name: '実績' },
  ];
  const logCat = (l) => {
    if (l.cat) return l.cat;
    const c = l.cls || '';
    if (c.includes('game') || c === 'team') return 'game';
    if (c === 'ach') return 'ach';
    if (l.text.startsWith('【起用】')) return 'usage';
    if (c === 'event') return 'event';
    if (c === 'good' || c === 'bad' || c === 'year') return 'big';
    return 'week';
  };
  const logMatch = (l, f) => {
    if (f === 'all') return true;
    const cat = logCat(l);
    if (f === 'imp') return l.imp || ['good', 'bad', 'year', 'ach'].includes(l.cls) || cat === 'big';
    if (f === 'game') return cat === 'game';
    if (f === 'life') return cat === 'life';
    return cat === f;
  };
  const logView = (s) => {
    const f = ui.logFilter || 'all';
    const maxWeeks = (f === 'all' ? 14 : 40) * (ui.logMore || 1);
    const groups = [];
    let cur = null;
    let rest = false;
    for (let i = s.log.length - 1; i >= 0; i--) {
      const l = s.log[i];
      if (!logMatch(l, f)) continue;
      const key = `${l.y}-${l.w}`;
      if ((!cur || cur.key !== key) && groups.length >= maxWeeks) {
        rest = true;
        break;
      }
      if (!cur || cur.key !== key) {
        cur = { key, y: l.y, w: l.w, items: [] };
        groups.push(cur);
      }
      cur.items.unshift(l);
    }
    const chips = LOG_FILTERS.map((x) => `<button class="place ${f === x.id ? 'on' : ''}" data-act="logFilter" data-arg="${x.id}">${x.name}</button>`).join('');
    return `<div class="log-filter places">${chips}</div><div class="log">${
      groups
        .map((g) => {
          return `<div class="log-week"><h4>${g.y}年 ${G.weekLabel(g.y, g.w)}</h4>${g.items
            .map((l) => `<div class="log-item ${l.cls || ''}">${br(l.text)}</div>`)
            .join('')}</div>`;
        })
        .join('') || '<p class="muted">該当する記録はまだありません。</p>'
    }${rest ? '<div class="center"><button class="btn sub small" data-act="logMore">もっと前を見る</button></div>' : ''}</div>`;
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
    if (own.special) {
      // 日本代表の試合
      const sp = own.special;
      const jp = G.teamById(own.ourId || 'n_jpn');
      const day0 = s.gw.cur && s.gw.cur.day;
      return `<div class="game-date jp-game">${day0 ? G.fmtDate(day0.d) : ''}・🇯🇵 ${esc(sp.title)}（${esc(sp.venue)}${own.parkId ? `・${esc(G.parkOf(own.parkId).name)}` : ''}）</div>
      <div class="game-head"><span class="team-chip" style="background:${jp.color}">${jp.short}</span> vs <span class="team-chip" style="background:${opp.color}">${opp.short}</span>
      <span class="muted">${esc(opp.name)}・侍ジャパンでの役割「${esc(G.jpRoleName(s))}」</span></div>`;
    }
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
      const me = side.id === ui.s.player.teamId || side.id === 'n_jpn';
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
        return `<details class="game-row"><summary><b class="res-${g.outcome}">${mark}</b> ${G.fmtDate(g.date)} vs ${G.teamById(g.oppId).short}${g.label ? `（${esc(g.label)}）` : g.inter ? '（交流戦）' : ''} <b>${g.score[0]}-${g.score[1]}</b>　<span class="muted">${esc(g.text)}</span></summary>${boxHtml(g.box)}</details>`;
      })
      .join('')}</div></details>`;
  };

  const hintHtml = (s, own) =>
    `<ul class="mhint">${G.matchupHint(s, own)
      .map((h) => `<li><span>${esc(h.label)}</span>${h.grade ? `<b class="mu-grade">${h.grade}</b>` : ''}<small class="muted">${esc(h.data)}</small></li>`)
      .join('')}</ul>`;

  const pregameView = (s) => {
    const p = s.player;
    const own = s.gw.cur.own;
    let scout;
    if (own.kind === 'bat') {
      const o = G.OPP_PITCHERS.find((x) => x.id === own.oppP.type);
      const us = own.special ? null : G.usageSummary(s);
      scout = `<div class="scout"><b>${own.starter ? `今日は「${own.order}」でスタメン出場` : own.defOnly ? 'ベンチスタート（終盤の守備固めで出番がありそう）' : 'ベンチスタート（代打で出番がありそう）'}</b>
        ${us ? `<div class="muted">${esc(us.detail)}${us.mood ? `・${esc(us.mood)}` : ''}</div>` : ''}
        <div>相手先発：${esc(own.oppP.name)}（<b>${G.HAND_NAME[own.oppP.hand || 'R']}・${o.name}</b>）</div><div class="muted">スコアラー「${o.hint}」</div>${hintHtml(s, own)}</div>`;
    } else {
      const l = G.OPP_LINEUPS.find((x) => x.id === own.lineup);
      scout = `<div class="scout"><b>${esc(own.situation)}</b><div>相手打線：<b>${l.name}・${G.LINEUP_HAND[own.lineupHand || 'mix']}</b></div><div class="muted">捕手「${l.hint}」</div>${hintHtml(s, own)}</div>`;
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

  // 「ここぞ！」の場面
  const clutchView = (s) => {
    const own = s.gw.cur.own;
    const t = G.clutchText(s, own);
    const list = G.clutchChoices(s, own);
    return `<div class="panel game-panel clutch">
      ${gameMeta(s, own)}
      <div class="clutch-banner">ここぞ！ 勝負どころ</div>
      <div class="clutch-head">${esc(t.head)}</div>
      <div class="clutch-body">${br(t.body)}</div>
      <div class="section-title"><span class="step">🔥</span>この場面、どう勝負する？</div>
      <div class="act-grid">${list
        .map((c) => `<button class="act train ${c.skill ? 'skill' : ''}" data-act="clutch" data-arg="${c.id}"><b>${esc(c.name)}</b><small>${esc(c.desc)}</small></button>`)
        .join('')}</div>
    </div>`;
  };

  const clutchResult = (s, r) => {
    if (!r.clutch) return '';
    const c = r.clutch;
    const v = G.clutchResultText(s, c.kind === 'bat' ? c : { ...c, how: c.how, r: c.r });
    return `<div class="clutch-result ${v.cls}"><div class="muted">🔥 ${esc(c.situation.head)}・「${esc(c.choice)}」</div><b>${esc(v.text)}</b></div>`;
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
      const pas = r.pas.map((pa, i) => `<li class="pa-${pa.code}${pa.clutch ? ' clutch-pa' : ''}"><span>${pa.clutch ? '🔥勝負' : `第${i + 1}打席`}</span>${esc(G.paText(pa))}</li>`).join('');
      const head = r.order === '守備固め' ? '<div class="muted" style="font-size:13px">終盤、守備固めで出場</div>' : '';
      const fl = r.fld ? G.fldLineText(r.fld) : '';
      detail = `${head}<ol class="pa-list">${pas}${plays}</ol>
        <div class="line">${r.line.pa ? G.batLineText(r.line) : '打席なし'}${fl ? `／${fl}` : ''}</div>`;
    } else {
      const inn = r.clutch
        ? [`${r.startInning}回：2アウト${r.clutch.situation.head.split('2アウト')[1]}のピンチ${r.clutch.r ? `で${r.clutch.r}失点` : 'をしのぐ'}`]
        : G.inningText(r.innings, r.startInning);
      detail = `<ol class="pa-list">${inn
        .map((t) => `<li class="${/\d+失点/.test(t) ? 'pa-bad' : 'pa-OUT'}">${esc(t)}</li>`)
        .join('')}</ol><div class="line">${G.pitLineText(r.line)}</div>`;
    }
    const acc = s.gw.acc;
    const week = r.special ? `侍ジャパンでの成績：${G.jpEventLine(s)}` : r.kind === 'bat' ? `今週の成績：${G.batLineText(acc.weekBat)}` : `今週の成績：${G.pitLineText(acc.weekPit)}`;
    const extra = [r.tiebreak ? '延長タイブレークで決着' : '', r.note ? `⭐ ${r.note}` : '', r.evalNote ? r.evalNote.replace(/^（|）$/g, '') : ''].filter(Boolean);
    return `<div class="panel game-panel">
      <div class="game-date ${r.special ? 'jp-game' : ''}">${G.fmtDate(r.date)}${r.special ? `・🇯🇵 ${esc(r.special.title)}（${esc(r.special.venue)}）` : r.inter ? '・交流戦' : ''}</div>
      <div class="game-head"><b class="res-${r.outcome}">${mark}</b> ${r.score[0]} - ${r.score[1]} <span class="muted">vs ${G.teamById(r.oppId).name}・作戦「${ap.name}」</span></div>
      ${clutchResult(s, r)}
      ${boxHtml(r.box)}
      ${extra.length ? `<ul class="jp-notes">${extra.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
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

  // ---------- おまかせ進行 ----------
  const autoPanel = (s) => {
    const plan = G.autoPlan(s);
    const chip = (key, x) => `<button class="choice ${plan[key] === x.id ? 'on' : ''}" data-act="autoPlan" data-arg="${key}:${x.id}">${esc(x.name)}<small>${esc(x.desc)}</small></button>`;
    return `<details class="settings auto-panel" ${ui.autoOpen ? 'open' : ''}><summary data-act="autoOpen">⏩ おまかせで進める</summary>
      <div class="auto-targets">${G.autoTargets(s)
        .map((t) => `<button class="btn ${t.id === 'w4' ? 'sub' : ''} small" data-act="autoGo" data-arg="${t.id}">${esc(t.name)}</button>`)
        .join('')}</div>
      <div class="muted" style="font-size:12px">選択が必要な出来事・大きなケガ・引退の判断があると、そこで止まります。途中のお知らせは、あとでまとめて読めます。試合は「いつもの作戦」で進みます。</div>
      ${s.after ? '' : `<div class="mt" style="font-size:13px;font-weight:700">練習の方針</div><div class="choices">${G.AUTO_TRAIN.map((x) => chip('train', x)).join('')}</div>`}
      <div class="mt" style="font-size:13px;font-weight:700">オフの過ごし方の方針</div><div class="choices">${G.AUTO_PRIV.map((x) => chip('priv', x)).join('')}</div>
      <button class="choice ${plan.choose ? 'on' : ''} mt" data-act="autoChoose">${plan.choose ? '✔ ' : ''}小さな出来事の選択もおまかせにする<small>契約・移籍・結婚・メジャー・引退などの大事な選択では必ず止まります</small></button>
      ${s.after ? '' : `<button class="choice ${plan.raise ? 'on' : ''} mt" data-act="autoRaise">${plan.raise ? '✔ ' : ''}たまった経験点で自動的に能力アップする<small>ミート・コントロールなど大事な能力から順に</small></button>`}
    </details>`;
  };

  const autoSummaryView = (s) => {
    const r = ui.autoSummary;
    if (!r) return '';
    const p = s.player;
    const range = `${r.from.year}年${G.weekLabel(r.from.year, r.from.week).split('〜')[0]} → ${r.to.year}年${G.weekLabel(r.to.year, r.to.week).split('〜')[0]}`;
    const stats = [];
    if (r.bat && r.bat.g) stats.push(`${r.bat.g}試合 ${r.bat.ab}打数${r.bat.h}安打 ${r.bat.hr}本塁打 ${r.bat.rbi}打点`);
    if (r.pit && r.pit.g) stats.push(`${r.pit.g}登板 ${r.pit.w}勝${r.pit.l}敗${r.pit.s ? `${r.pit.s}S` : ''} ${G.fmtIP(r.pit.outs)}回 ${r.pit.k}奪三振`);
    if (r.team && r.team.w + r.team.l) stats.push(`チーム ${r.team.w}勝${r.team.l}敗${r.team.d ? `${r.team.d}分` : ''}`);
    const big = r.events.filter((e) => e.big);
    const ev = r.events
      .map((e) => `<details class="auto-ev ${e.big ? 'big' : ''}"><summary>${e.big ? '★ ' : ''}${esc(e.title)}<span class="muted">　${e.y}年${G.weekLabel(e.y, e.w).split('〜')[0]}</span></summary><div class="modal-text">${br(e.text)}</div></details>`)
      .join('');
    return `<div class="panel auto-summary">
      <div class="auto-sum-head"><h3 style="margin:0">⏩ ${r.weeks}週間をおまかせで過ごした</h3><button class="btn sub small" data-act="autoClose">閉じる</button></div>
      <div class="muted" style="font-size:13px">${range}${r.stop ? `　<b class="neg">「${esc(r.stop)}」で止まりました</b>` : `（${esc(r.target)}）`}</div>
      <ul class="auto-facts">
        ${stats.map((x) => `<li>⚾ ${esc(x)}</li>`).join('')}
        <li>💴 所持金 ${r.money >= 0 ? '+' : ''}${G.fmtMoney(r.money)}（現在 ${G.fmtMoney(p.money)}）</li>
        ${r.raised ? `<li>💪 能力アップ ${r.raised}回</li>` : ''}
        ${r.ach ? `<li>🏅 実績解除 ${r.ach}件</li>` : ''}
        ${big.length ? `<li>★ ${big.map((e) => esc(e.big)).join('・')}</li>` : ''}
      </ul>
      ${r.events.length ? `<div class="auto-evs"><div class="muted" style="font-size:12px">この間のお知らせ（${r.events.length}件・押すと読めます）</div>${ev}</div>` : ''}
    </div>`;
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
    return `${autoSummaryView(s)}<div class="panel">
      <div class="section-title"><span class="step">1</span>今週の仕事 <span class="muted">${esc(G.afterRank(s))}${next}</span></div>
      <div class="act-grid">${works.map(workBtn).join('')}</div>
      <div class="section-title"><span class="step">2</span>オフの過ごし方</div>
      <div class="places">${chips}</div>
      <div class="act-grid">${cur.items.map(privBtn).join('')}</div>
      <div class="week-bar"><div class="week-sum"><span>仕事：<b>${esc(selW.name)}</b></span><span>オフ：<b>${esc(selP.name)}</b>${selP.cost ? `（${G.fmtMoney(selP.cost)}）` : ''}</span></div>
        <button class="btn" data-act="week">この1週間を過ごす ▶</button></div>
      <div class="act-foot"><span class="muted" style="font-size:13px">${p.age}歳。人生はまだまだ続く。</span><button class="btn sub small" data-act="auto">おまかせで4週 ▶</button></div>
      ${autoPanel(s)}
      ${logView(s)}
    </div>`;
  };

  // メジャーでの疲労と適応
  const mlbBox = (s) => {
    const m = G.mlbStatus(s);
    if (!m) return '';
    const meter = (label, v, bad) => `<div class="mlb-meter"><span>${label}</span><div class="track"><div class="fill ${bad ? 'bad' : ''}" style="width:${v}%"></div></div><b>${v}</b></div>`;
    return `<div class="mlb-box"><div class="mlb-meters">${meter('疲労', m.fatigue, m.fatigue >= 50)}${meter('適応度', m.adapt, m.adapt < 50)}</div>
      <div class="muted" style="font-size:12px">✈ ${esc(m.travel)}　${m.off < -0.5 ? `<b class="neg">疲れ・不慣れで本来の力を出し切れていない（影響：${-m.off < 1.5 ? '小' : -m.off < 3.5 ? '中' : '大'}）</b>` : '実力を出せる状態'}</div></div>`;
  };

  const actionTab = (s) => {
    if (s.after) return afterActionTab(s);
    if (s.gw && s.gw.last) return resultView(s);
    if (s.gw && s.gw.awaitClutch) return clutchView(s);
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
      ${p.injury ? `<span class="tag injury">故障 残り${p.injury.weeks}週</span>` : ''}</div>${mlbBox(s)}`;

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
    const jp = G.onJapanDuty(s) ? G.jpPhase(s) : null;
    const jpBanner = jp
      ? `<div class="jp-banner"><div><b>🇯🇵 侍ジャパン ${esc(jp.name)}</b><small>${esc(jp.place)}で代表の活動中。練習は代表メニュー、仲間や首脳陣と話せるのは「侍ジャパン」タブ${
          G.jpWeekGames(s) ? `。今週は代表の試合が${G.jpWeekGames(s)}（出番のある試合は1試合ずつ作戦を選べる）` : ''
        }</small></div><button class="btn small" data-act="tab" data-arg="japan">侍ジャパンへ</button></div>`
      : '';
    return `${autoSummaryView(s)}<div class="panel">${quick}${jpBanner}
      <div class="section-title"><span class="step">1</span>今週の練習 <span class="muted">練習効率 ×${mul.toFixed(2)}（${phase.name}・${cond.name}）</span></div>
      <div class="act-grid">${train.map(trainBtn).join('')}</div>
      <div class="section-title"><span class="step">2</span>オフの過ごし方</div>
      <div class="places">${chips}</div>
      <div class="act-grid">${cur.items.map(privBtn).join('')}</div>
      <div class="week-bar">
        <div class="week-sum"><span>練習：<b>${esc(selT.name)}</b></span><span>オフ：<b>${esc(selP.name)}</b>${selP.cost ? `（${G.fmtMoney(selP.cost)}）` : ''}</span></div>
        <button class="btn" data-act="week">この1週間を過ごす ▶</button>
      </div>
      <div class="act-foot"><span class="muted" style="font-size:13px">${note}</span><button class="btn sub small" data-act="auto">おまかせで4週 ▶</button></div>
      ${autoPanel(s)}
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
        const wall = !max && G.overCeiling(p, a.id, v) ? '<div class="wall">素質の壁</div>' : '';
        return `<tr><td class="nm">${a.name}${wall}</td><td><div class="vcell">${disp}</div></td>
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
      <p class="muted up-note">経験点はそれぞれ${G.EXP_CAP}まで。「素質の壁」に届いた能力は、上げるのに何倍もの経験点がいる</p>
      <h3>基礎能力</h3><table class="up-table">${rows}</table>
      ${pitchHtml}
      <h3 class="mt">特殊能力</h3><div class="skill-list">${skills}</div>
      ${muSection(s)}
      ${agingPanel(s)}
      <p class="muted" style="font-size:12px">※ 能力が高くなるほど必要な経験点は増えます。選手ごとの「素質」を超えると、さらに伸びにくくなります。</p>
    </div>`;
  };

  // 年齢と経験点の倍率（エイジングカーブ）。同じ単位（倍率）の2系列を1つの軸で
  const agingPanel = (s) => {
    const p = s.player;
    const A0 = 18;
    const A1 = 42;
    const L = 36;
    const R = 300;
    const T = 12;
    const B = 128;
    const Y0 = 0.5;
    const Y1 = 1.7;
    const x = (a) => L + ((a - A0) / (A1 - A0)) * (R - L);
    const y = (v) => B - ((v - Y0) / (Y1 - Y0)) * (B - T);
    const ages = [];
    for (let a = A0; a <= A1; a++) ages.push(a);
    const phys = ages.map((a) => G.ageExpMul(p, 'muscle', a));
    const tech = ages.map((a) => G.ageExpMul(p, 'technique', a));
    const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(ages[i]).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    const start = G.AGING_START[p.growth];
    const now = G.clamp(p.age, A0, A1);
    const grid = [0.5, 1.0, 1.5].map((v) => `<line x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}" class="ag-grid"/><text x="${L - 6}" y="${y(v) + 4}" class="ag-axis" text-anchor="end">×${v.toFixed(1)}</text>`).join('');
    const xt = [20, 25, 30, 35, 40].map((a) => `<text x="${x(a)}" y="${B + 16}" class="ag-axis" text-anchor="middle">${a}歳</text>`).join('');
    const hits = ages
      .map((a, i) => `<rect x="${x(a) - 5}" y="${T}" width="10" height="${B - T}" class="ag-hit"><title>${a}歳：体（筋力・敏捷）×${phys[i].toFixed(2)}・技術・精神 ×${tech[i].toFixed(2)}</title></rect>`)
      .join('');
    const mPhys = G.ageExpMul(p, 'muscle');
    const mTech = G.ageExpMul(p, 'technique');
    const drop = G.physDrop ? G.physDrop(p) : 0;
    return `<h3 class="mt">年齢とからだ（エイジングカーブ）</h3>
      <div class="ag-legend"><span><i class="sw tech"></i>技術・精神・変化球の経験点</span><span><i class="sw phys"></i>体（筋力・敏捷）の経験点</span></div>
      <svg class="ag-chart" viewBox="0 0 340 152" role="img" aria-label="年齢ごとの経験点の倍率">
        <rect x="${x(start)}" y="${T}" width="${R - x(start)}" height="${B - T}" class="ag-zone"/>
        <text x="${x(start) + 4}" y="${T + 11}" class="ag-axis">衰え始め（${start}歳〜）</text>
        ${grid}${xt}
        <path d="${path(tech)}" class="ag-line tech"/><path d="${path(phys)}" class="ag-line phys"/>
        <line x1="${x(now)}" x2="${x(now)}" y1="${T}" y2="${B}" class="ag-now"/>
        <circle cx="${x(now)}" cy="${y(mTech)}" r="4" class="ag-dot tech"/><circle cx="${x(now)}" cy="${y(mPhys)}" r="4" class="ag-dot phys"/>
        <text x="${Math.min(x(now) + 5, R - 30)}" y="${B - 4}" class="ag-axis ag-nowlabel">いま${p.age}歳</text>
        <text x="${R + 4}" y="${y(tech[tech.length - 1]) + 4}" class="ag-end">技術</text><text x="${R + 4}" y="${y(phys[phys.length - 1]) + 4}" class="ag-end">体</text>
        ${hits}
      </svg>
      <p class="muted" style="font-size:12px;margin-top:2px">いまの練習効率：体（筋力・敏捷）×${mPhys.toFixed(2)}／技術・精神 ×${mTech.toFixed(2)}。毎年オフの衰えは、走力・パワー・球速・スタミナなど体の能力ほど大きく、ミート・コントロール・捕球など技術の能力は小さい。${
        drop ? `全盛期から${G.isPitcher(p) ? `球速が${drop}km/h` : `パワー＋走力が${drop}`}落ちている。` : ''
      }ベテランになったら「技術で勝負する」モデルチェンジも考えよう。</p>`;
  };

  // 対策（相性）：-6〜+6 を中央からのバーで表す（右＝得意、左＝苦手）
  const muBar = (v) => {
    const w = (Math.abs(v) / G.MU_MAX) * 50;
    return `<div class="mu-track"><div class="mu-mid"></div><div class="mu-fill ${v >= 0 ? 'pos' : 'neg'}" style="${v >= 0 ? `left:50%` : `right:50%`};width:${w}%"></div></div>`;
  };
  const muSection = (s) => {
    const p = s.player;
    const mu = G.ensureMU(p);
    const defs = G.MU_DEFS[G.isPitcher(p) ? 'pit' : 'bat'];
    const rows = defs
      .map((d) => {
        const v = mu[d.id];
        const cost = G.muCost(v);
        const ok = v < G.MU_MAX && G.canAfford(p, cost);
        return `<div class="mu-row"><div class="mu-name"><b>${d.name}</b> <span class="mu-grade">${G.muGrade(v)}</span><small class="muted">${d.desc}</small></div>
          ${muBar(v)}<div class="mu-val">${v > 0 ? '+' : ''}${v}</div>
          <div class="mu-up">${v >= G.MU_MAX ? '<span class="muted">最大</span>' : `<small class="cost">${costHtml(p, cost)}</small><button class="btn small" data-act="raiseMU" data-arg="${d.id}" ${ok ? '' : 'disabled'}>対策</button>`}</div></div>`;
      })
      .join('');
    return `<h3 class="mt">対策（相性）</h3>
      <p class="muted" style="font-size:12px;margin-top:-4px">右に伸びるほど得意、左は苦手。苦手な相手と当たる試合は打ちにくく（抑えにくく）なる。「データ」タブで、どの相手に弱いか確かめよう。</p>
      <div class="mu-list">${rows}</div>`;
  };

  // ================= データ（条件別の成績） =================
  // 1系列の横棒グラフ。値はバーの外に置き、基準線（リーグ平均）を引く
  const barChart = (rows, opt) => {
    if (!rows.length) return '<p class="muted" style="font-size:13px">まだデータがありません。</p>';
    const max = Math.max(opt.ref * 1.6, ...rows.map((r) => r.v));
    const refPct = (opt.ref / max) * 100;
    return `<div class="hbar-chart">${rows
      .map(
        (r) => `<div class="hbar-row" title="${esc(r.tip)}"><div class="hbar-label">${r.label}</div>
        <div class="hbar-track"><div class="hbar-fill ${r.few ? 'few' : ''}" style="width:${Math.max(1, (r.v / max) * 100)}%"></div><div class="hbar-ref" style="left:${refPct}%"></div></div>
        <div class="hbar-val">${esc(r.text)}${r.few ? '<small class="muted">（少）</small>' : ''}</div></div>`,
      )
      .join('')}<div class="hbar-foot muted"><span class="ref-key"></span>${esc(opt.refLabel)}${opt.note ? `　${esc(opt.note)}` : ''}</div></div>`;
  };

  const dataTab = (s) => {
    const p = s.player;
    const pit = G.isPitcher(p);
    const scope = ui.dataScope || (Object.keys(G.splitsFor(s, 'season')).length ? 'season' : 'career');
    const sp = G.splitsFor(s, scope);
    const row = (key, label) => {
      const l = sp[key];
      if (!l) return null;
      const v = G.splitValue(l, pit);
      if (v === null) return null;
      if (pit) {
        const few = l.outs < 27;
        return { label, v, few, text: `防御率${v.toFixed(2)}`, tip: `${label}：防御率${v.toFixed(2)}・${G.fmtIP(l.outs)}回・被安打${l.h}・奪三振${l.k}` };
      }
      const few = l.ab < 20;
      return { label, v, few, text: `OPS ${v.toFixed(3).replace(/^0/, '')}`, tip: `${label}：打率${G.fmtRate(l.h, l.ab)}・${l.hr}本塁打・${l.ab}打数・OPS ${v.toFixed(3)}` };
    };
    const opt = pit ? { ref: 3.5, refLabel: '縦線＝リーグ平均（防御率3.50）', note: 'バーが短いほど良い' } : { ref: 0.7, refLabel: '縦線＝リーグ平均（OPS .700）', note: 'バーが長いほど良い' };
    const keep = (list) => list.filter(Boolean);
    let sections;
    if (pit) {
      sections = [
        ['相手打線の左右', keep(['L', 'R', 'mix'].map((h) => row(`lhand:${h}`, G.LINEUP_HAND[h])))],
        ['相手打線のタイプ', keep(G.OPP_LINEUPS.map((l) => row(`lineup:${l.id}`, l.name)))],
      ];
    } else {
      sections = [
        ['相手先発の利き腕', keep(['L', 'R'].map((h) => row(`hand:${h}`, h === 'L' ? '対左投手' : '対右投手')))],
        ['相手先発のタイプ', keep(G.OPP_PITCHERS.map((o) => row(`ptype:${o.id}`, o.name)))],
      ];
    }
    const parks = keep(Object.keys(sp).filter((k) => k.startsWith('park:')).map((k) => {
      const tid = k.slice(5);
      const pk = G.parkOf(tid);
      return row(k, `${pk.name}<small class="muted">${pk.dome ? 'ドーム・' : ''}${G.parkLabel(pk)}</small>`);
    })).sort((a, b) => (pit ? a.v - b.v : b.v - a.v));
    const opps = keep(Object.keys(sp).filter((k) => k.startsWith('opp:')).map((k) => row(k, `vs ${G.teamById(k.slice(4)).short}`))).sort((a, b) => (pit ? a.v - b.v : b.v - a.v));
    sections.push(['球場別', parks], ['対戦球団別', opps]);
    const mu = G.ensureMU(p);
    const defs = G.MU_DEFS[pit ? 'pit' : 'bat'];
    const muLine = defs.map((d) => `<span class="mu-chip">${d.name} <b>${G.muGrade(mu[d.id])}</b></span>`).join('');
    return `<div class="panel">
      <div class="cal-head"><h3 style="margin:0">データ分析</h3><div class="places">${['season', 'career']
        .map((x) => `<button class="place ${scope === x ? 'on' : ''}" data-act="dataScope" data-arg="${x}">${x === 'season' ? `${s.year}年` : '通算'}</button>`)
        .join('')}</div></div>
      <p class="muted" style="font-size:13px">条件ごとの1軍成績。苦手な相手が見つかったら「能力アップ」タブの「対策」で克服しよう。球場との相性は、数字を見ないとわからない。</p>
      <div class="mu-chips">${muLine}</div>
      ${sections.map(([title, rows]) => `<h4 class="data-h">${title}</h4>${barChart(rows, opt)}`).join('')}
      <p class="muted" style="font-size:12px">（少）：まだ打席数・投球回が少なく、参考程度の数字。</p>
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

  // 日本代表の記録
  const intlView = (s) => {
    const hist = s.intlHist || [];
    let next = s.year;
    while (!G.isIntlYear(next) || (next === s.year && s.week > G.intlDates(next).finalW)) next++;
    const rows = hist
      .map((h) => `<tr><td>${h.year}</td><td>${h.type === 'series' ? '強化試合' : '本大会'}</td><td>${esc(h.result)}${h.mvp ? '・MVP' : ''}</td><td style="text-align:left">${esc(h.text)}</td></tr>`)
      .join('');
    return `<h3 class="mt">日本代表 <span class="muted" style="font-size:12px">次の${G.INTL_NAME}は${next}年3月（前年の活躍で選ばれる）</span></h3>
      ${hist.length ? `<div class="tbl-wrap"><table class="stats"><tr><th>年</th><th>大会</th><th>成績</th><th>個人成績</th></tr>${rows}</table></div>` : '<p class="muted" style="font-size:13px">まだ代表に選ばれたことはない。</p>'}`;
  };

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
      .map((r) => `<tr><td>${r[0]}</td><td>${r[1].rival ? '<span class="tag weapon">同期</span> ' : ''}${esc(r[1].name)}（${r[1].team}）</td><td>${r[2]}</td><td class="${r[4] ? 'lead' : ''}">${r[3]}</td></tr>`)
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
    return `<div class="panel"><h3>${s.year}年 今季成績</h3>${cur}${defense}${raceView(s)}${intlView(s)}${career}</div>`;
  };

  const teamTab = (s) => {
    const p = s.player;
    const R = G.ensureRoster(s);
    G.assignTeamRoles(s);
    const team = G.teamById(p.teamId);
    const tag = (m) =>
      (G.mateTag(m) ? `<span class="tag friend">${G.mateTag(m)}</span>` : '') +
      (s.people[`tm_${m.id}`] ? '<span class="tag lover">仲間</span>' : '') +
      (m.rookie ? '<span class="tag">新人</span>' : '') +
      (m.injured ? '<span class="tag injury">故障</span>' : '');
    const mateLink = (m) => `<button class="name-link" data-act="mate" data-arg="${m.id}">${esc(m.name)}</button>`;
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
        return `<tr><td>${r.slot}番</td><td style="text-align:left">${mateLink(m)} ${tag(m)}</td><td>${G.posById(m.pos).name}</td><td>${rankBadge(m.rating)}</td><td>${batStat(m.stats.bat)}</td></tr>`;
      })
      .join('');
    const pitcherSlot = '<tr><td>9番</td><td style="text-align:left" class="muted">（先発投手）</td><td>投手</td><td></td><td></td></tr>';
    // 野手一覧
    const fielders = R.players
      .filter((m) => m.pos !== 'P')
      .sort((a, b) => ({ regular: 0, bench: 1, farm: 2 }[a.role] - { regular: 0, bench: 1, farm: 2 }[b.role] || b.rating - a.rating))
      .map((m) => {
        const pct = G.fieldingPct(m.stats.fld);
        return `<tr><td style="text-align:left">${mateLink(m)} ${tag(m)}</td><td>${G.posById(m.pos).name}</td><td>${m.age}</td><td>${rankBadge(m.rating)}</td><td>${G.rank(m.prof.contact)}/${G.rank(m.prof.power)}/${G.rank(m.prof.speed)}/${G.rank(m.prof.fielding)}</td><td>${G.TEAM_ROLE_NAME[m.role]}</td><td>${batStat(m.stats.bat)}</td><td>${pct === null ? '-' : pct.toFixed(3).replace(/^0/, '')}${m.stats.fld.e ? `（失${m.stats.fld.e}）` : ''}</td></tr>`;
      })
      .join('');
    const roleOrder = { SP: 0, CL: 1, setup: 2, mid: 3, mop: 4, farm: 5 };
    const pitchers = R.players
      .filter((m) => m.pos === 'P')
      .sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || b.rating - a.rating)
      .map((m) => `<tr><td style="text-align:left">${mateLink(m)} ${tag(m)}</td><td>${G.TEAM_ROLE_NAME[m.role] || '中継ぎ'}</td><td>${m.age}</td><td>${rankBadge(m.rating)}</td><td>${m.prof.velocity}km/h</td><td style="text-align:left">${pitStat(m.stats.pit)}</td></tr>`)
      .join('');
    const meP = G.isPitcher(p) && !s.retired ? `<tr class="me"><td style="text-align:left">${esc(p.name)}（あなた）</td><td>${p.squad === 'first' ? G.roleName(p) : G.squadName(p)}</td><td>${p.age}</td><td>${rankBadge(Math.round(G.overall(p)))}</td><td>${p.pitcher.velocity}km/h</td><td style="text-align:left">${pitStat(s.stats.pit)}</td></tr>` : '';
    const departed = R.departed && R.departed.length ? `<p class="muted" style="font-size:13px">昨オフにチームを去った選手：${R.departed.map((d) => `${esc(d.name)}（${esc(d.why)}）`).join('、')}</p>` : '';
    return `<div class="panel">
      <h3><span class="team-chip" style="background:${team.color}">${team.short}</span> ${team.name}</h3>
      <p class="muted" style="font-size:13px;margin-top:-4px">選手の名前を押すと、くわしい情報を見たり話しかけたりできる（週${G.TALKS_PER_WEEK}回まで）。仲良くなると「人間関係」に加わる。親しくできるのは${G.friendCap(s)}人まで（いま${G.mateFriends(s).length}人）。</p>
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
    if (r.score >= 75 && s.achd) s.achd.flags.loved = true;
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
    const counts = {};
    const rows = s.draft.picks
      .filter((d) => f === 'all' || (f === 'r1' && d.round === 1) || (f === 'team' && d.teamId === G.draftTeamOf(s)) || (f === 'active' && (d.me ? !s.retired : !d.retired)))
      .map((d) => {
        const team = G.teamById(d.teamId);
        const gradeTd = (gr) => `<td><span class="dgrade g${gr.g}" title="${esc(gr.name)}：${esc(gr.desc)}">${gr.g}</span></td>`;
        if (d.me) {
          const live = s.retired ? 0 : G.seasonWAR(p, s);
          const war = Math.round((tot.war + live) * 10) / 10;
          const cb = { ...tot.bat };
          const cp = { ...tot.pit };
          if (!s.retired) {
            G.addStats(cb, s.stats.bat);
            G.addStats(cp, s.stats.pit);
          }
          const line = G.isPitcher(p) ? `${cp.g}登板 ${cp.w}勝${cp.s}S 防${G.fmtERA(cp.er, cp.outs)}` : `${cb.g}試合 ${cb.h}安打 ${cb.hr}本 率${G.fmtRate(cb.h, cb.ab)}`;
          const best = s.career.some((c) => (G.isPitcher(p) ? c.pit.outs >= 300 || c.pit.g >= 40 : c.bat.pa >= 300)) ? '1軍主力' : '';
          const gr = G.draftGrade(war, meStatus === '1軍' && (G.isPitcher(p) ? s.stats.pit.outs >= 150 : p.usage && p.usage.status === 'starter') ? '1軍主力' : meStatus, best);
          counts[gr.g] = (counts[gr.g] || 0) + 1;
          return `<tr class="me">${gradeTd(gr)}<td>${d.round}位</td><td style="text-align:left"><span class="team-chip" style="background:${team.color}">${team.short}</span></td><td style="text-align:left">${esc(p.name)}（あなた）</td><td>${G.posById(p.position).name}</td><td>${p.age}</td><td><span class="st ${G.draftStatusClass(meStatus)}">${meStatus}</span></td><td style="text-align:left">${line}</td><td>${war.toFixed(1)}</td><td style="text-align:left">${s.retired ? '-' : `今季：${esc(G.seasonSummaryText(s).replace(/^1軍成績：|^今季は/, ''))}`}</td></tr>`;
        }
        const L = G.draftLive(s, d);
        const t = L;
        counts[L.grade.g] = (counts[L.grade.g] || 0) + 1;
        const line = d.pos === 'P' ? (t.pit.g ? `${t.pit.g}登板 ${t.pit.w}勝${t.pit.s}S 防${G.fmtERA(t.pit.er, t.pit.outs)}` : '1軍登板なし') : t.bat.g ? `${t.bat.g}試合 ${t.bat.h}安打 ${t.bat.hr}本 率${G.fmtRate(t.bat.h, t.bat.ab)}` : '1軍出場なし';
        let last = '-';
        const fmtLine = (l) => (d.pos === 'P' ? (l.pit.g ? `${l.pit.g}登板 ${l.pit.w}勝${l.pit.s}S 防${G.fmtERA(l.pit.er, l.pit.outs)}` : '1軍出場なし') : l.bat.g ? `${l.bat.g}試合 率${G.fmtRate(l.bat.h, l.bat.ab)} ${l.bat.hr}本` : '1軍出場なし');
        if (L.season) last = `今季：${fmtLine(L.season)}<br><small class="muted">チームメイト（${G.TEAM_ROLE_NAME[L.season.role] || ''}）</small>`;
        else if (d.last) last = `${d.last.year}年：${fmtLine(d.last)}`;
        const rival = d.id === s.draft.rivalId ? ' <span class="tag friend">ライバル</span>' : '';
        return `<tr>${gradeTd(L.grade)}<td>${d.round}位</td><td style="text-align:left"><span class="team-chip" style="background:${team.color}">${team.short}</span></td><td style="text-align:left">${esc(d.name)}${rival}</td><td>${G.posById(d.pos).name}</td><td>${d.age}</td><td><span class="st ${G.draftStatusClass(L.status)}">${esc(L.status)}</span></td><td style="text-align:left">${line}</td><td>${L.war.toFixed(1)}</td><td style="text-align:left">${last}${d.note ? `<br><small class="muted">${esc(d.note)}</small>` : ''}</td></tr>`;
      })
      .join('');
    const filters = [['all', '全員'], ['r1', '1位指名'], ['team', '同じ球団'], ['active', '現役のみ']]
      .map(([id, name]) => `<button class="place ${f === id ? 'on' : ''}" data-act="draftFilter" data-arg="${id}">${name}</button>`)
      .join('');
    const active = s.draft.picks.filter((d) => (d.me ? !s.retired : !d.retired)).length;
    return `<div class="panel"><h3>${s.draft.year}年 ドラフト会議 <span class="muted" style="font-size:13px">指名${s.draft.picks.length}人・現役${active}人</span></h3>
      <p class="muted" style="font-size:13px;margin-top:0">同じ年にプロ入りした同期たちの現在。ほかの球団の同期は毎年のシーズン終了後に更新、同じチームの同期はチームメイトとしての今季の成績も含めて表示します。</p>
      <div class="places">${filters}</div>
      <div class="dgrade-legend">${G.DRAFT_GRADES.map((x) => `<span><span class="dgrade g${x.g}">${x.g}</span>${x.name}<small class="muted">${x.desc}</small><b>${counts[x.g] || 0}人</b></span>`).join('')}</div>
      <div class="tbl-wrap"><table class="stats draft-table"><tr><th>評価</th><th>順位</th><th>球団</th><th>選手</th><th>守備</th><th>年齢</th><th>状態</th><th>通算成績（1軍）</th><th>WAR</th><th>直近</th></tr>${rows}</table></div>
      <p class="muted" style="font-size:12px">評価：通算WAR（どれだけチームの勝ちに貢献したか）と、いまの立場から決まる。S＝大当たり（通算WAR25以上など）、A＝当たり、B＝1軍の戦力、C＝1軍で出番あり、D＝まだこれから。</p>
    </div>`;
  };

  const shopTab = (s) => {
    const p = s.player;
    if (s.after) return investPanel(s);
    // お金に余裕が出てきたら、大きな買い物を先に見せる
    const big = p.money >= 3000;
    return `${big ? investPanel(s) : ''}<div class="panel"><h3>ショップ <span class="muted" style="font-size:13px">所持金 ${G.fmtMoney(p.money)}</span></h3>
      <p class="muted" style="font-size:13px;margin-top:0">買い物では週は進みません。購入するとすぐに効果が出ます。</p>
      <div class="shop-grid">${G.SHOP_ITEMS.map((it) => {
        const owned = it.once && it.id === 'car' && p.car;
        const trainerActive = it.id === 'trainer' && s.flags.trainerUntil === s.year;
        const ok = !owned && !trainerActive && p.money >= it.price;
        return `<div class="shop-item"><b>${it.name}</b><small class="muted">${it.desc}</small>
          <div class="act-foot"><span class="price">${G.fmtMoney(it.price)}</span>
          <button class="btn small" data-act="buy" data-arg="${it.id}" ${ok ? '' : 'disabled'}>${owned ? '購入済' : trainerActive ? '契約中' : '購入'}</button></div></div>`;
      }).join('')}</div></div>${big ? '' : investPanel(s)}`;
  };

  // 大きな買い物・投資
  const investPanel = (s) => {
    const p = s.player;
    const list = G.investList(s).filter((x) => !s.after || ['future', 'legacy'].includes(x.group));
    const groups = G.INVEST_GROUPS.map((g) => {
      const items = list.filter((x) => x.group === g.id);
      if (!items.length) return '';
      return `<h4 class="inv-group">${g.name}</h4><div class="shop-grid">${items
        .map((inv) => {
          const lv = G.invLv(s, inv.id);
          const next = inv.levels[lv];
          const steps = inv.levels.length > 1 ? `<span class="inv-steps">${inv.levels.map((_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>` : '';
          const lvName = (x) => (G.investLevelName ? G.investLevelName(s, x) : x.name);
          const owned = lv ? `<small class="inv-owned">${inv.id === 'donate' ? `寄付${lv}回` : `所有：${esc(lvName(inv.levels[lv - 1]))}`}</small>` : '';
          if (!next)
            return `<div class="shop-item inv done"><b>${esc(G.investName(inv, p))} ${steps}</b>${owned}<div class="act-foot"><span class="muted">すべて購入済み</span></div></div>`;
          const why = inv.req ? inv.req(s) : '';
          return `<div class="shop-item inv ${inv.group === 'legacy' ? 'legacy' : ''}"><b>${esc(G.investName(inv, p))} ${steps}</b>${owned}
            <small>${lv ? '次：' : ''}${esc(lvName(next))}</small><small class="muted">${esc(next.desc)}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}
            <div class="act-foot"><span class="price">${G.fmtMoney(next.price)}</span>
            <button class="btn small" data-act="invest" data-arg="${inv.id}" ${p.money >= next.price && !why ? '' : 'disabled'}>購入</button></div></div>`;
        })
        .join('')}</div>`;
    }).join('');
    return `<div class="panel"><h3>大きな買い物・投資 <span class="muted" style="font-size:13px">一度買えばずっと効果が続く</span></h3>${groups}</div>`;
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

  // ---------- 侍ジャパン ----------
  const JP_ROLE_NAME = { SP: '先発', RP: '中継ぎ', CL: '抑え', cleanup: '4番', starter: 'スタメン', bench: '控え' };
  const mdOf = (ymd) => {
    const [, m, d] = ymd.split('-');
    return `${Number(m)}/${Number(d)}`;
  };
  const jpTags = (s, x) => {
    const t = s.intl;
    return (
      (x.pid === 'rival' ? '<span class="tag friend">同期のライバル</span>' : '') +
      (x.rosterId !== undefined ? '<span class="tag friend">チームメイト</span>' : '') +
      (G.jpIsFriend(s, x) && !x.pid && x.rosterId === undefined ? '<span class="tag lover">仲間</span>' : '') +
      (x.mlb && t && t.type !== 'series' && !t.mlbJoined ? '<span class="tag mlb">合流前</span>' : '')
    );
  };
  const japanTab = (s) => {
    const p = s.player;
    const J = s.japan;
    const t = s.intl && s.intl.squad ? s.intl : null;
    const style = J && J.staff ? G.jpStyle(s) : null;
    let head = '';
    if (t) {
      const ph = G.jpPhase(s);
      const title = t.type === 'series' ? `${G.JP_SERIES_NAME} ${t.year}` : `${G.INTL_NAME} ${t.year}`;
      let sched = '';
      if (t.type !== 'series') {
        const d = G.intlDates(t.year);
        const items = [
          [d.camp, d.campW, '宮崎合宿'],
          [d.sendoff, d.exhibitW - 1, '壮行試合・メジャー組合流'],
          [d.exhibit, d.exhibitW, '強化試合（本番の役割が決まる）'],
          [d.pool, d.poolW, '1次ラウンド（東京）'],
          [d.qf, d.qfW, '準々決勝（東京）'],
          [d.sf, d.sfW, '準決勝・決勝（マイアミ）'],
        ];
        sched = `<ol class="jp-sched">${items
          .map(([date, w, name]) => `<li class="${s.year === t.year && s.week > w ? 'done' : s.year === t.year && s.week === w ? 'now' : ''}"><b>${mdOf(date)}</b>${name}</li>`)
          .join('')}</ol>`;
      }
      const status = !t.accepted ? '選出されました（返事を待っています）' : G.onJapanDuty(s) ? `いま：${ph.name}（${ph.place}）` : ph && ph.id === 'wait' ? `合宿は${mdOf(G.intlDates(t.year).camp)}から` : '';
      const w = G.absWeek(s);
      const left = G.JP_TALKS_PER_WEEK - (t.talkW === w ? t.talkN || 0 : 0);
      const ev = Math.round(t.eval);
      head = `<div class="jp-head">
        <div class="jp-title"><span class="jp-flag">🇯🇵</span><div><b>${esc(title)}</b><small>${esc(status)}</small></div></div>
        ${sched}
        <div class="jp-me"><div class="num">${t.number}</div><div class="grow"><b>${esc(p.name)}（あなた）</b><small>役割：${JP_ROLE_NAME[t.role]}${t.roleSet ? '（本番）' : '（予定）'}</small>
          <div class="bar aff"><span>首脳陣の評価</span><div class="track"><div class="fill" style="width:${ev}%;background:var(--blue)"></div></div><span class="val">${ev}</span></div>
          <small class="muted">${G.jpEvalLabel(ev)}。${style ? `監督は「${style.name}」：${style.desc}` : ''}</small></div></div>
        ${G.onJapanDuty(s) ? `<p class="muted jp-note">選手の名前や首脳陣を押すと話しかけられる。仲間とは今週あと<b>${left}</b>回（週${G.JP_TALKS_PER_WEEK}回まで）、首脳陣はそれぞれ週1回。仲${G.FRIEND_AFF}で人間関係に加わる（代表の仲間は${G.jpFriendCap(s)}人まで、いま${G.jpFriends(s).length}人）。</p>` : ''}
      </div>`;
    } else {
      let next = s.year;
      while (!G.isIntlYear(next) || (next === s.year && s.week > G.intlDates(next).finalW)) next++;
      head = `<div class="jp-head"><div class="jp-title"><span class="jp-flag">🇯🇵</span><div><b>侍ジャパン</b><small>次の${G.INTL_NAME}は${next}年3月。前の年の活躍で選ばれる${G.isIntlYear(s.year + 1) ? `（今年の11月には${G.JP_SERIES_NAME}も）` : ''}</small></div></div>
        ${J && J.trust !== null && J.trust !== undefined ? `<p class="muted jp-note">${esc(J.staff.manager.name)}監督からの評価：${G.jpEvalLabel(J.trust)}（同じ監督のあいだは選考に響く）</p>` : ''}</div>`;
    }
    const staffHtml = J && J.staff
      ? `<h3 class="mt">首脳陣</h3><div class="jp-staff">${G.jpStaffList(s)
          .map(
            (st) => `<button class="jp-card" data-act="jpStaff" data-arg="${st.key}" ${t ? '' : 'disabled'}><b>${esc(st.name)}</b><small>${esc(st.role)}${st.key === 'manager' ? `・${esc(G.jpStyle(s).name)}` : ''}</small><small class="muted">${esc(st.bio)}</small>
              <span class="bar aff"><span class="track"><span class="fill" style="width:${Math.min(100, st.aff || 0)}%;background:#3b8ee0"></span></span><span class="val">${Math.round(st.aff || 0)}</span></span></button>`,
          )
          .join('')}</div>`
      : '';
    let squadHtml = '';
    if (t) {
      const sq = G.jpSquad(s);
      const me = (grp) => G.JP_POS_GROUPS.find((g) => g.id === grp).pos.includes(p.position);
      squadHtml = G.JP_POS_GROUPS.map((grp) => {
        const list = sq.filter((x) => grp.pos.includes(x.pos)).sort((a, b) => (a.prole || '').localeCompare(b.prole || '') || b.rating - a.rating);
        const rows = list
          .map(
            (x) => `<tr><td style="text-align:left"><button class="name-link" data-act="jpMember" data-arg="${x.id}">${esc(x.name)}</button> ${jpTags(s, x)}</td><td>${esc(G.jpTeamName(x, false))}</td><td>${esc(G.jpPosName(x))}</td><td>${x.age}</td><td>${rankBadge(x.rating)}</td><td>${(x.caps || 0) + 1}回目</td><td>${Math.round(G.jpAff(s, x))}</td></tr>`,
          )
          .join('');
        const meRow = me(grp.id) ? `<tr class="me"><td style="text-align:left">${esc(p.name)}（あなた）</td><td>${esc(G.teamById(p.teamId).short)}</td><td>${JP_ROLE_NAME[t.role]}</td><td>${p.age}</td><td>${rankBadge(Math.round(G.overall(p)))}</td><td>${(s.flags.japanCount || 0) + (s.flags.seriesCount || 0) + (t.accepted ? 0 : 1)}回目</td><td>-</td></tr>` : '';
        return `<h3 class="mt">${grp.name}（${list.length + (me(grp.id) ? 1 : 0)}人）</h3><div class="tbl-wrap"><table class="stats"><tr><th>選手</th><th>所属</th><th>守備・役割</th><th>年齢</th><th>総合</th><th>代表</th><th>仲</th></tr>${meRow}${rows}</table></div>`;
      }).join('');
    }
    return `<div class="panel">${head}${staffHtml}${squadHtml}${intlView(s)}</div>`;
  };

  const jpModal = (s) => {
    if (!ui.jp) return '';
    const msg = ui.jpMsg ? `<div class="mate-msg ${ui.jpMsg.tone || ''}">${br(ui.jpMsg.text)}</div>` : '';
    const wrap = (title, body) => `<div class="modal-back" data-act="jpClose"><div class="modal mate-modal" role="dialog" aria-modal="true" data-stop="1">
      <div class="modal-title">${title}</div>${body}${msg}
      <div class="modal-choices"><button class="btn sub" data-act="jpClose">閉じる</button></div></div></div>`;
    if (ui.jp.kind === 'staff') {
      const st = G.jpStaffList(s).find((y) => y.key === ui.jp.id);
      if (!st) return '';
      const style = st.key === 'manager' ? G.jpStyle(s) : null;
      const topics = G.jpStaffTopics(s, st)
        .map((tp) => {
          const why = G.jpCanStaffTalk(s, st);
          return `<button class="act rest" data-act="jpStaffTalk" data-arg="${tp.id}" ${why ? 'disabled' : ''}><b>${tp.name}</b><small>${tp.desc}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}</button>`;
        })
        .join('');
      const aff = Math.round(st.aff || 0);
      return wrap(
        `${esc(st.name)} <span class="tag friend">${esc(st.role)}</span>`,
        `<dl class="kv mate-kv"><dt>年齢</dt><dd>${st.age}歳</dd><dt>経歴</dt><dd>${esc(st.bio)}</dd>
          ${style ? `<dt>タイプ</dt><dd>${esc(style.name)}<small class="muted">（${esc(style.desc)}）</small></dd>` : ''}
          <dt>あなたとの仲</dt><dd><div class="bar aff"><div class="track"><div class="fill" style="width:${Math.min(100, aff)}%;background:#3b8ee0"></div></div><span class="val">${aff}</span></div>${st.key !== 'manager' ? '<small class="muted">信頼されると、首脳陣のミーティングで推してくれる</small>' : ''}</dd></dl>
        <div class="section-title" style="margin-top:6px">話しかける</div><div class="act-grid">${topics}</div>`,
      );
    }
    const x = G.jpMember(s, ui.jp.id);
    if (!x) return '';
    const per = G.personaById(x.persona);
    const known = x.talks >= 2 || G.jpIsFriend(s, x) || x.pid || x.rosterId !== undefined;
    const aff = Math.round(G.jpAff(s, x));
    const friend = G.jpIsFriend(s, x);
    const level = friend ? (aff >= 70 ? '親友' : '仲間') : aff >= 25 ? '話す仲' : aff >= 10 ? '顔見知り' : 'ほとんど話したことがない';
    const topics = G.JP_TOPICS.filter((tp) => !tp.mlbOnly || x.mlb)
      .map((tp) => {
        const why = G.jpCanTalk(s, x, tp.id);
        return `<button class="act rest" data-act="jpTalk" data-arg="${tp.id}" ${why ? 'disabled' : ''}><b>${tp.name}</b><small>${tp.desc}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}</button>`;
      })
      .join('');
    return wrap(
      `${esc(x.name)} ${jpTags(s, x)}`,
      `<div class="mate-head"><div class="num jp">${esc(G.jpPosName(x).slice(0, 2))}</div><div><b>${esc(G.jpTeamName(x))}・${x.age}歳</b><div class="muted" style="font-size:13px">${esc(G.jpPosName(x))}・総合 ${G.rank(x.rating)}・代表${(x.caps || 0) + 1}回目${x.withYou && x.withYou.length ? `（${x.withYou.join('・')}年に一緒だった）` : ''}</div></div></div>
      <dl class="kv mate-kv"><dt>昨季</dt><dd>${esc(x.last || '-')}</dd>
        <dt>性格</dt><dd>${known ? `${per.name}<small class="muted">（${per.hint}）</small>` : '？（何度か話すとわかる）'}</dd>
        <dt>あなたとの仲</dt><dd><div class="bar aff"><div class="track"><div class="fill" style="width:${Math.min(100, aff)}%;background:#3b8ee0"></div></div><span class="val">${aff}</span></div><small class="muted">${level}${friend ? '（人間関係に登録済み）' : `・仲${G.FRIEND_AFF}で人間関係に加わる`}</small></dd></dl>
      <div class="section-title" style="margin-top:6px">話しかける</div><div class="act-grid">${topics}</div>`,
    );
  };

  const peopleTab = (s) => {
    const P = s.people;
    const chainHtml = (id) => {
      const steps = G.chainState(s, id);
      if (!steps.length) return '';
      let shown = false;
      return `<ol class="chain">${steps
        .map((st) => {
          if (st.ok) return `<li class="ok">✔ ${esc(st.name)}${st.year ? `<small class="muted">（${st.year}年）</small>` : ''}</li>`;
          if (!shown) {
            shown = true;
            return `<li class="next">▶ ${esc(st.name)}<small class="muted">${esc(st.hint)}</small></li>`;
          }
          return '<li class="lock">・？？？</li>';
        })
        .join('')}</ol>`;
    };
    const card = (x, extra = '') => {
      const stage = x.group === 'love' ? G.STAGE_NAME[x.stage] : '';
      if (x.group !== 'love') extra += chainHtml(x.id);
      return `<div class="person ${x.group === 'love' ? 'love' : ''}">
        <div class="row"><b>${esc(x.name)}</b>${stage ? `<span class="tag ${x.stage}">${stage}</span>` : ''}</div>
        <small class="muted">${esc(x.role)}${x.retired && x.id === 'rival' ? '（引退）' : ''}</small>
        <div class="bar aff"><span>${x.group === 'love' ? '好感度' : '親密度'}</span>${affBar(x)}<span class="val">${Math.round(x.aff)}</span></div>${extra}</div>`;
    };
    const team = ['senpai', 'rival', 'coach', 'kohai'].map((id) => P[id]).filter((x) => x.met);
    const rival = P.rival;
    const rivalNote = `<small class="muted">通算WAR ${rival.war.toFixed(1)}${rival.best ? `・${esc(rival.best)}` : ''}</small>`;
    const others = ['parents', 'friend', 'reporter'].map((id) => P[id]).filter((x) => x.met);
    const mates = G.mateFriends(s);
    const jpFriends = G.jpFriends(s);
    const love = G.heroines(s).filter((h) => h.met);
    const unmet = G.heroines(s).filter((h) => !h.met).length;
    const pt = G.partner(s);
    return `<div class="panel">
      <h3>チーム</h3><div class="people">${team.map((x) => card(x, x.id === 'rival' ? rivalNote : '')).join('')}</div>
      <h3 class="mt">仲良くなったチームメイト <span class="muted" style="font-size:12px">${mates.length}/${G.friendCap(s)}人</span></h3>
      ${mates.length ? `<div class="people">${mates.map((x) => card(x, `<small class="muted">性格：${esc(G.personaById(x.persona).name)}</small>`)).join('')}</div>` : '<p class="muted" style="font-size:13px">「チーム」タブで選手の名前を押して話しかけてみよう。気の合う仲間ができるかもしれない。</p>'}
      ${jpFriends.length ? `<h3 class="mt">侍ジャパンの仲間 <span class="muted" style="font-size:12px">${jpFriends.length}/${G.jpFriendCap(s)}人</span></h3><div class="people">${jpFriends.map((x) => card(x, `<small class="muted">性格：${esc(G.personaById(x.persona).name)}</small>`)).join('')}</div>` : ''}
      <h3 class="mt">家族・友人・仕事</h3><div class="people">${others.map((x) => card(x)).join('')}</div>
      <h3 class="mt">恋愛</h3>
      ${love.length ? `<div class="people">${love.map((h) => card(h, s.story[`liked_${h.id}`] || h.dates >= 3 ? `<small class="muted">好み：${esc({ quiet: '落ち着いたデート', active: 'アクティブなデート', luxury: 'おしゃれなディナー', casual: '気軽なデート' }[G.heroineType(h).likes])}</small>` : '')).join('')}</div>` : '<p class="muted">まだ特別な出会いはない。</p>'}
      ${unmet && !pt ? `<p class="hint">まだ出会っていない人が${unmet}人いる。カフェ、ジム、取材やテレビ出演、地元への帰省で出会えるかも。</p>` : ''}
      <p class="muted" style="font-size:12px">親密度が上がると、特別なイベントが起こることがある。「つながり」は過去の選択とともに積み重なり、自主トレの誘いや引退後の仕事にまでつながっていく。恋人とは会わない日が続くと好感度が下がっていく。</p>
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

  // ================= カレンダー =================
  const md = (str) => str.slice(5); // 'MM-DD'
  // その年の、日付ごとの出来事
  const yearEvents = (s, year) => {
    const c = G.cal(year);
    const p = s.player;
    const mlb = G.isMLB(s);
    const ev = {};
    const add = (d, cls, text) => (ev[d] = ev[d] || []).push({ cls, text });
    const wd = (w, i) => G.ymd(G.dateOfWeek(year, w, i));
    add(`${year}-01-01`, 'season', '🎍 元日');
    add(`${year}-02-01`, 'season', '⛺ 春季キャンプイン');
    add(wd(c.openW, 5), 'season', '🌸 オープン戦');
    add(c.opening, 'big', '⚾ 開幕戦');
    const inter = c.days.filter((x) => x.inter);
    if (inter.length && !mlb) {
      add(inter[0].d, 'season', '🤝 交流戦開幕');
      add(inter[inter.length - 1].d, 'season', '交流戦最終日');
    }
    c.allstarDates.forEach((d, i) => add(d, 'big', `⭐ オールスター第${i + 1}戦`));
    add(c.lastGame, 'season', '🏁 レギュラーシーズン最終戦');
    add(c.csDate, 'big', mlb ? '🏆 ポストシーズン' : '🏆 クライマックスシリーズ');
    add(c.jsDate, 'big', mlb ? '🏆 ワールドシリーズ' : '🏆 日本シリーズ');
    add(c.draftDate, 'season', '📋 ドラフト会議');
    add(wd(c.releaseW, 0), 'season', '📮 戦力外通告期間');
    if (!mlb) add(wd(c.faW, 0), 'season', '✍ FA宣言期間');
    add(wd(c.awardsW, 1), 'season', '🏆 年間表彰式');
    add(wd(c.contractW, 1), 'season', '💴 契約更改');
    add(`${year}-12-31`, 'season', '🔔 大みそか');
    for (const [d, cls, text] of [...G.intlEvents(s, year), ...G.seriesEvents(s, year)]) add(d, cls, text);
    // 私生活
    if (p.birthday) add(`${year}-${p.birthday}`, 'life', `🎂 自分の誕生日`);
    const pt = G.partner(s);
    if (pt && pt.birthday) add(`${year}-${pt.birthday}`, 'life', `🎂 ${pt.name}の誕生日`);
    const sp = G.spouse(s);
    if (sp && sp.weddingDate) {
      const n = year - Number(sp.weddingDate.slice(0, 4));
      if (n === 0) add(sp.weddingDate, 'life', '💒 結婚式');
      else if (n > 0) add(`${year}-${md(sp.weddingDate)}`, 'life', `💍 結婚${n}周年`);
    }
    for (const k of p.kids) {
      const age = year - k.born;
      if (k.birthday && age >= 0) add(`${year}-${k.birthday}`, 'life', age === 0 ? `👶 ${k.name}誕生` : `🎂 ${k.name}の${age}歳の誕生日`);
    }
    if (s.flags.weddingAt && pt && pt.stage === 'fiance') {
      const w = s.flags.weddingAt - year * 52;
      if (w >= 1 && w <= 52) add(wd(w, 5), 'life', `💒 ${pt.name}との結婚式（予定）`);
    }
    // 実績
    for (const [key, v] of Object.entries(s.ach || {})) {
      if (!v.d || Number(v.d.slice(0, 4)) !== year) continue;
      const a = G.ACHIEVEMENTS.find((x) => x.key === key);
      if (a) add(v.d, 'achv', `🏅 ${a.n}`);
    }
    return ev;
  };

  const calYearOf = (s) => (ui.calYear && ui.calYear <= s.year && ui.calYear >= s.year - 1 ? ui.calYear : s.year);

  const gameInfo = (s, year, day) => {
    const p = s.player;
    const g = G.teamGameOn(year, day, p.teamId);
    if (!g) return null;
    const r = (s.results || {})[day.d];
    return { ...g, day, r };
  };

  const calendarTab = (s) => {
    const p = s.player;
    const year = calYearOf(s);
    const c = G.cal(year);
    const now = G.dateOfWeek(s.year, s.week, 0);
    const today = year === s.year ? G.ymd(now) : null;
    const weekEnd = year === s.year ? G.ymd(G.dateOfWeek(s.year, s.week, 6)) : null;
    let month = ui.calMonth || (year === s.year ? now.getUTCMonth() + 1 : 12);
    if (year === s.year && now.getUTCFullYear() !== year) month = ui.calMonth || 1;
    const ev = yearEvents(s, year);
    const byDate = {};
    for (const d of c.days) byDate[d.d] = d;
    const pad = (n) => String(n).padStart(2, '0');
    const first = new Date(Date.UTC(year, month - 1, 1));
    const daysIn = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lead = first.getUTCDay();
    let w = 0;
    let l = 0;
    let dr = 0;
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell empty"></div>');
    for (let dnum = 1; dnum <= daysIn; dnum++) {
      const key = `${year}-${pad(month)}-${pad(dnum)}`;
      const dow = (lead + dnum - 1) % 7;
      const day = byDate[key];
      const gi = day ? gameInfo(s, year, day) : null;
      let game = '';
      if (gi) {
        const t = G.teamById(gi.opp);
        let res = '';
        if (gi.r && gi.r.rain) res = '<span class="cal-rain">☔中止</span>';
        else if (gi.r) {
          const o = gi.r.o;
          if (o === 'W') w++;
          else if (o === 'L') l++;
          else dr++;
          res = `<span class="cal-res ${o}">${o === 'W' ? '○' : o === 'L' ? '●' : '△'}${gi.r.sc[0]}-${gi.r.sc[1]}</span>`;
        } else if (day.rain && key < (today || '9999')) res = '<span class="cal-rain">☔中止</span>';
        game = `<div class="cal-game"><span class="team-chip mini" style="background:${t.color}">${gi.home ? '' : '@'}${esc(t.short)}</span>${res}</div>${
          gi.inter ? '<span class="cal-tag inter">交流戦</span>' : ''
        }${day.makeup ? '<span class="cal-tag">振替</span>' : ''}`;
      }
      const evs = ev[key] || [];
      const marks = evs
        .slice(0, 3)
        .map((e) => `<div class="cal-ev ${e.cls}">${esc(e.text)}</div>`)
        .join('');
      const more = evs.length > 3 ? `<div class="cal-ev more">ほか${evs.length - 3}件</div>` : '';
      const isWeek = today && key >= today && key <= weekEnd;
      const past = today ? key < today : true;
      cells.push(
        `<button class="cal-cell ${dow === 0 ? 'sun' : dow === 6 ? 'sat' : ''} ${isWeek ? 'now' : ''} ${past ? 'past' : ''} ${ui.calDay === key ? 'sel' : ''}" data-act="calDay" data-arg="${key}">
          <span class="cal-num">${dnum}</span>${game}${marks}${more}</button>`,
      );
    }
    // 選んだ日の詳細
    let detail = '';
    const sel = ui.calDay && ui.calDay.startsWith(`${year}-${pad(month)}`) ? ui.calDay : null;
    if (sel) {
      const day = byDate[sel];
      const gi = day ? gameInfo(s, year, day) : null;
      const items = [];
      if (gi) {
        const t = G.teamById(gi.opp);
        const me = G.teamById(p.teamId);
        let line = `${gi.home ? `${esc(me.short)}（ホーム）` : `${esc(me.short)}（ビジター）`} vs ${esc(t.name)}${gi.inter ? '・交流戦' : ''}${day.makeup ? `・${G.fmtDate(day.makeupOf, false)}の振替試合` : ''}`;
        if (gi.r && gi.r.rain) line += '<br>☔ 雨天中止（シーズン終盤に振替）';
        else if (gi.r) {
          const o = gi.r.o;
          line += `<br><b class="${o === 'W' ? 'pos' : o === 'L' ? 'neg' : ''}">${o === 'W' ? '勝ち' : o === 'L' ? '負け' : '引き分け'} ${gi.r.sc[0]}-${gi.r.sc[1]}</b>`;
          line += `<br>${gi.r.k ? `自分：${esc(gi.r.t)}` : gi.r.sq === 'first' ? '自分：出場なし（ベンチ）' : `自分：${esc(G.squadName(p, 'second'))}で調整中`}`;
        } else if (!s.retired) line += '<br><span class="muted">これからの試合</span>';
        items.push(`<li class="game">⚾ ${line}</li>`);
      }
      for (const e of ev[sel] || []) items.push(`<li class="${e.cls}">${esc(e.text)}</li>`);
      const others = day && !day.rain ? G.dayPairs(year, day).filter((x) => x.home !== p.teamId && x.away !== p.teamId && (x.lg === 'inter' || x.lg === G.teamById(p.teamId).league)) : [];
      // この日までスキップ（その日を含む週の始めまで、おまかせで進める）
      const skip = !s.ended && !(s.retired && !s.after) ? G.skipTarget(s, sel) : null;
      const busy = s.queue.length || s.gw;
      const skipHtml = skip
        ? `<div class="cal-skip"><button class="btn small" data-act="calSkip" data-arg="${sel}" ${busy ? 'disabled' : ''}>⏩ この日までスキップ</button><small class="muted">${
            busy ? 'いまの場面や試合を終えてから使えます' : `おまかせで進み、この日を含む週（${G.weekLabel(skip.y, skip.w).replace(/〜.*$/, '')}〜）の始めで止まります。大事な選択やケガのときは途中で止まります`
          }</small></div>`
        : '';
      detail = `<div class="cal-detail"><h4>${G.fmtDate(sel)}</h4>${items.length ? `<ul>${items.join('')}</ul>` : '<p class="muted">予定なし</p>'}${
        others.length ? `<div class="muted cal-others">ほかのカード：${others.map((x) => `${esc(G.teamById(x.away).short)}－${esc(G.teamById(x.home).short)}`).join('・')}</div>` : ''
      }${skipHtml}</div>`;
    }
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((m) => `<button class="place ${m === month ? 'on' : ''}" data-act="calMonth" data-arg="${m}">${m}月</button>`)
      .join('');
    const years = [s.year - 1, s.year]
      .filter((y) => y >= (s.startYear || s.year))
      .map((y) => `<button class="place ${y === year ? 'on' : ''}" data-act="calYear" data-arg="${y}">${y}年</button>`)
      .join('');
    const key = [
      ['big', '大きな日程'],
      ['season', '球界の日程'],
      ['life', '私生活'],
      ['achv', '実績'],
    ];
    return `<div class="panel">
      <div class="cal-head"><h3 style="margin:0">${year}年 ${month}月</h3><div class="places">${years}</div></div>
      <div class="places cal-months">${months}</div>
      <div class="cal-sum muted">${w + l + dr ? `この月の試合：${w}勝${l}敗${dr ? `${dr}分` : ''}` : ''}　開幕 ${G.fmtDate(c.opening)}・最終戦 ${G.fmtDate(c.lastGame)}（雨天中止 ${c.rainN}試合は終盤に振替）</div>
      <div class="cal-grid">${G.DOW.map((d, i) => `<div class="cal-dow ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${d}</div>`).join('')}${cells.join('')}</div>
      <div class="cal-legend">${key.map(([k, n]) => `<span class="cal-ev ${k}">${n}</span>`).join('')}<span class="team-chip mini" style="background:#888">@相手</span><span class="muted">＝ビジター</span></div>
      ${detail || '<p class="muted" style="font-size:13px">日付を押すと、その日の詳しい情報が見られます。これからの日付なら、その日までスキップもできます。</p>'}
    </div>`;
  };

  // ================= 実績 =================
  const achTab = (s) => {
    const list = G.achFor(s);
    const prog = G.achProgress(s);
    const cat = ui.achCat || 'debut';
    const cats = G.ACH_CATS.filter((c) => list.some((a) => a.c === c.id));
    const chips = [{ id: 'all', name: 'すべて' }, { id: 'recent', name: '最近' }, ...cats]
      .map((c) => {
        const n = c.id === 'all' || c.id === 'recent' ? '' : `<small>${list.filter((a) => a.c === c.id && s.ach[a.key]).length}/${list.filter((a) => a.c === c.id).length}</small>`;
        return `<button class="place ${cat === c.id ? 'on' : ''}" data-act="achCat" data-arg="${c.id}">${c.name}${n}</button>`;
      })
      .join('');
    let shown;
    if (cat === 'recent') shown = list.filter((a) => s.ach[a.key]).sort((a, b) => (s.ach[b.key].d > s.ach[a.key].d ? 1 : -1)).slice(0, 30);
    else shown = cat === 'all' ? list : list.filter((a) => a.c === cat);
    const card = (a) => {
      const got = s.ach[a.key];
      const secret = a.hidden && !got;
      return `<div class="ach ${got ? 'got' : ''} ${a.bitter ? 'bitter' : ''}">
        <div class="ach-icon">${got ? (a.bitter ? '🥀' : '🏅') : secret ? '❔' : '🔒'}</div>
        <div><div class="ach-name">${secret ? '？？？' : esc(a.n)}</div>
        <div class="ach-desc muted">${secret ? 'ひみつの実績' : esc(a.d)}</div>
        ${got ? `<div class="ach-date">${got.d.slice(0, 4)}年${G.fmtDate(got.d)} 達成</div>` : ''}</div></div>`;
    };
    const groups =
      cat === 'all'
        ? cats
            .map((c) => `<h3 class="ach-cat">${c.name}</h3><div class="ach-grid">${list.filter((a) => a.c === c.id).map(card).join('')}</div>`)
            .join('')
        : `<div class="ach-grid">${shown.map(card).join('') || '<p class="muted">まだありません</p>'}</div>`;
    return `<div class="panel">
      <div class="ach-head"><div><h3 style="margin:0">自分だけの実績</h3><small class="muted">あなたしか見られない、人生の記録</small></div>
        <div class="ach-prog"><b>${prog.got}</b><small> / ${prog.total}</small><div class="track"><div class="fill" style="width:${Math.round((prog.got / prog.total) * 100)}%"></div></div></div></div>
      <div class="places">${chips}</div>
      ${groups}
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
    else if (ui.tab === 'japan') body = japanTab(s);
    else if (ui.tab === 'draft') body = draftTab(s);
    else if (ui.tab === 'calendar') body = calendarTab(s);
    else if (ui.tab === 'data') body = dataTab(s);
    else if (ui.tab === 'ach') {
      s.achBadge = 0;
      body = achTab(s);
    }
    else body = actionTab(s);
    return `<header class="topbar">
        <div class="date">${s.year}年 ${G.weekLabel(s.year, s.week)}${s.after ? '' : `<span class="phase">${G.isMLB(s) && phase.id === 'season' ? 'レギュラーシーズン' : phase.name}</span>`}</div>
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
      ${e.honors && e.honors.length ? `<div class="panel honors"><h3>栄誉の記録</h3><div class="honor-grid">${e.honors
        .map(([icon, name, sub]) => `<div class="honor"><div class="honor-icon">${icon}</div><div><b>${esc(name)}</b>${sub ? `<small class="muted">${esc(sub)}</small>` : ''}</div></div>`)
        .join('')}</div></div>` : ''}
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

  // ---------- チームメイトの詳細と交流 ----------
  const mateModal = (s) => {
    const R = s.roster;
    const m = R && R.players.find((x) => x.id === ui.mate);
    if (!m) return '';
    const p = s.player;
    const info = G.mateInfo(s, m);
    const per = info.persona;
    const pit = m.pos === 'P';
    const st = m.stats;
    const season = pit
      ? st.pit.g ? `${st.pit.g}登板 ${st.pit.w}勝${st.pit.l}敗${st.pit.s ? ` ${st.pit.s}S` : ''}${st.pit.hld ? ` ${st.pit.hld}H` : ''} 防御率${G.fmtERA(st.pit.er, st.pit.outs)}` : 'まだ登板なし'
      : st.bat.pa ? `${st.bat.g}試合 打率${G.fmtRate(st.bat.h, st.bat.ab)} ${st.bat.hr}本 ${st.bat.rbi}打点` : 'まだ出場なし';
    const last = m.last ? (pit ? (m.last.pit.g ? `${m.last.pit.g}登板 ${m.last.pit.w}勝 防御率${G.fmtERA(m.last.pit.er, m.last.pit.outs)}` : '1軍登板なし') : m.last.bat.pa ? `打率${G.fmtRate(m.last.bat.h, m.last.bat.ab)} ${m.last.bat.hr}本` : '1軍出場なし') : '-';
    const prof = pit
      ? `球速${m.prof.velocity}km/h・制球${G.rank(m.prof.control)}・スタミナ${G.rank(m.prof.stamina)}`
      : `ミート${G.rank(m.prof.contact)}・パワー${G.rank(m.prof.power)}・走力${G.rank(m.prof.speed)}・守備${G.rank(m.prof.fielding)}`;
    const aff = Math.round(info.aff);
    const level = info.person ? (aff >= 70 ? '親友' : '仲間') : aff >= 25 ? '話す仲' : aff >= 10 ? '顔見知り' : 'あまり話したことがない';
    const topics = G.TALK_TOPICS.map((t) => {
      const why = G.canTalk(s, m, t.id);
      return `<button class="act rest" data-act="mateTalk" data-arg="${t.id}" ${why ? 'disabled' : ''}><b>${t.name}</b><small>${t.desc}</small>${why ? `<small class="why">${esc(why)}</small>` : ''}</button>`;
    }).join('');
    const tagName = G.mateTag(m);
    return `<div class="modal-back" data-act="mateClose"><div class="modal mate-modal" role="dialog" aria-modal="true" data-stop="1">
      <div class="modal-title">${esc(m.name)} ${tagName ? `<span class="tag friend">${tagName}</span>` : ''}</div>
      <div class="mate-head"><div class="num">${m.number}</div><div><b>${G.posById(m.pos).name}・${m.age}歳</b><div class="muted" style="font-size:13px">${G.TEAM_ROLE_NAME[m.role] || ''}・総合 ${G.rank(m.rating)}</div></div></div>
      <dl class="kv mate-kv"><dt>能力</dt><dd>${prof}</dd><dt>今季</dt><dd>${season}</dd><dt>昨季</dt><dd>${last}</dd>
        <dt>性格</dt><dd>${info.known ? `${per.name}<small class="muted">（${per.hint}）</small>` : '？（何度か話すとわかる）'}</dd>
        <dt>あなたとの仲</dt><dd><div class="bar aff"><div class="track"><div class="fill" style="width:${Math.min(100, aff)}%;background:#3b8ee0"></div></div><span class="val">${aff}</span></div><small class="muted">${level}${info.person ? '（人間関係に登録済み）' : `・仲${G.FRIEND_AFF}で人間関係に加わる`}</small></dd></dl>
      ${s.retired || s.after ? '' : `<div class="section-title" style="margin-top:6px">話しかける</div><div class="act-grid">${topics}</div>`}
      ${ui.mateMsg ? `<div class="mate-msg ${ui.mateMsg.tone || ''}">${br(ui.mateMsg.text)}</div>` : ''}
      <div class="modal-choices"><button class="btn sub" data-act="mateClose">閉じる</button></div>
    </div></div>`;
  };

  // ---------- セーブの書き出し・読み込み ----------
  // ファイルとして保存する。claude.ai の中では保存の確認画面を通し、それ以外では普通にダウンロードする
  const saveFile = async (filename, text) => {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) {
      await dl.save({ filename, data: text });
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const ioModal = () => {
    const io = ui.io;
    if (io.mode === 'export') {
      return `<div class="modal-back"><div class="modal io-modal" role="dialog" aria-modal="true">
        <div class="modal-title">スロット${io.slot + 1}を書き出す</div>
        <div class="modal-text">${io.downloaded ? '<b>ファイル（.json）を保存しました。</b><br>' : '「ファイルに保存」で .json ファイルとして保存できます。<br>'}うまくいかないときは、下のテキストをすべてコピーして、メモ帳などに貼り付けて保管してください。</div>
        <textarea id="ioText" class="io-text" readonly>${esc(io.text)}</textarea>
        <div class="muted" style="font-size:12px">${Math.round(io.text.length / 1024)}KB</div>
        <div class="modal-choices"><button class="btn" data-act="ioSave">ファイルに保存</button><button class="btn sub" data-act="ioCopy">テキストをコピー</button><button class="btn sub" data-act="ioClose">閉じる</button></div>
      </div></div>`;
    }
    return `<div class="modal-back"><div class="modal io-modal" role="dialog" aria-modal="true">
      <div class="modal-title">スロット${io.slot + 1}に読み込む</div>
      <div class="modal-text">書き出したファイルを選ぶか、書き出したテキストを貼り付けてください。${G.loadAll()[io.slot] ? '<br><b class="neg">このスロットのデータは上書きされます。</b>' : ''}</div>
      <input type="file" id="ioFile" accept=".json,application/json,text/plain">
      <textarea id="ioText" class="io-text" placeholder="ここにテキストを貼り付け">${esc(io.text || '')}</textarea>
      ${io.error ? `<div class="mate-msg bad">${esc(io.error)}</div>` : ''}
      <div class="modal-choices"><button class="btn" data-act="ioImport">読み込む</button><button class="btn sub" data-act="ioClose">やめる</button></div>
    </div></div>`;
  };

  // ================= 描画 =================
  const render = () => {
    let html;
    if (ui.screen === 'create') html = createView();
    else if (ui.screen === 'game') html = gameView();
    else if (ui.screen === 'ending') html = endingView();
    else html = titleView();
    if (ui.screen === 'game' && ui.mate && ui.s && !ui.s.queue.length) html += mateModal(ui.s);
    if (ui.screen === 'game' && ui.jp && ui.s && !ui.s.queue.length) html += jpModal(ui.s);
    if (ui.screen === 'title' && ui.io) html += ioModal();
    if (ui.confirm) {
      html += `<div class="modal-back"><div class="modal" role="dialog" aria-modal="true">
        <div class="modal-title">確認</div><div class="modal-text">${br(ui.confirm.text)}</div>
        <div class="modal-choices"><button class="btn" data-act="confirmYes">${esc(ui.confirm.yes)}</button>
        <button class="btn sub" data-act="confirmNo">やめる</button></div></div></div>`;
    }
    app.innerHTML = html;
  };

  const afterTurn = () => {
    const s = ui.s;
    if (s.achNew && s.achNew.length) {
      const names = s.achNew.map((k) => (G.ACHIEVEMENTS.find((a) => a.key === k) || {}).n).filter(Boolean);
      s.achBadge = (s.achBadge || 0) + names.length;
      if (names.length) toast(`🏅 実績解除：${names[names.length - 1]}${names.length > 1 ? `（ほか${names.length - 1}件）` : ''}`);
      s.achNew = [];
    }
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
      if (s.gw && !s.gw.await && !s.gw.last && !s.gw.awaitClutch) G.stepGames(s, null);
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
    exportSlot: (arg) => {
      const i = Number(arg);
      const s = G.loadAll()[i];
      if (!s) return;
      const text = G.exportSave(s);
      const filename = `diamond-life_slot${i + 1}_${s.year}.json`; // 日本語のファイル名は環境によって崩れるので英数字だけ
      ui.io = { mode: 'export', slot: i, text, filename, downloaded: false };
      render();
    },
    ioSave: () => {
      const io = ui.io;
      if (!io || io.mode !== 'export') return;
      saveFile(io.filename, io.text).then(
        () => {
          io.downloaded = true;
          render();
        },
        (e) => toast(e && e.code === 'declined' ? '保存をやめました' : 'ファイルに保存できませんでした。テキストをコピーして保管してください'),
      );
    },
    importSlot: (arg) => {
      ui.io = { mode: 'import', slot: Number(arg), text: '', error: '' };
      render();
    },
    ioCopy: () => {
      const ta = document.getElementById('ioText');
      if (!ta) return;
      ta.select();
      const done = () => toast('コピーしました');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, () => (document.execCommand('copy'), done()));
      else {
        document.execCommand('copy');
        done();
      }
    },
    ioImport: () => {
      const io = ui.io;
      const ta = document.getElementById('ioText');
      const text = ta ? ta.value : io.text;
      try {
        const s = G.importSave(text);
        if (!G.saveToSlot(s, io.slot)) throw new Error('ブラウザに保存できませんでした（空き容量が足りないかもしれません）');
        ui.io = null;
        toast(`スロット${io.slot + 1}に「${s.player.name}」を読み込みました`);
      } catch (e) {
        ui.io = { ...io, text, error: e.message };
      }
      render();
    },
    ioClose: () => {
      ui.io = null;
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
      if (arg === 'calendar') {
        ui.calMonth = null;
        ui.calYear = null;
        ui.calDay = null;
      }
      render();
    },
    calMonth: (arg) => {
      ui.calMonth = Number(arg);
      ui.calDay = null;
      render();
    },
    calYear: (arg) => {
      ui.calYear = Number(arg);
      ui.calMonth = null;
      ui.calDay = null;
      render();
    },
    calDay: (arg) => {
      ui.calDay = ui.calDay === arg ? null : arg;
      render();
      // スマホでは詳細がカレンダーの下に隠れるので、見えるところまで動かす
      const el = ui.calDay && document.querySelector('.cal-detail');
      if (el && el.getBoundingClientRect().bottom > window.innerHeight) el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    },
    logFilter: (arg) => {
      ui.logFilter = arg;
      ui.logMore = 1;
      render();
    },
    logMore: () => {
      ui.logMore = (ui.logMore || 1) + 1;
      render();
    },
    dataScope: (arg) => {
      ui.dataScope = arg;
      render();
    },
    raiseMU: (arg) => {
      if (!G.raiseMU(ui.s.player, arg)) toast('経験点が足りません');
      save();
      render();
    },
    mate: (arg) => {
      ui.mate = arg;
      ui.mateMsg = null;
      render();
    },
    mateTalk: (arg) => {
      const s = ui.s;
      const m = s.roster && s.roster.players.find((x) => x.id === ui.mate);
      if (!m) return;
      ui.mateMsg = G.talkTo(s, m, arg);
      G.checkAch(s);
      save();
      render();
    },
    mateClose: (arg, el, e) => {
      ui.mate = null;
      ui.mateMsg = null;
      render();
    },
    jpMember: (arg) => {
      ui.jp = { kind: 'member', id: arg };
      ui.jpMsg = null;
      render();
    },
    jpStaff: (arg) => {
      ui.jp = { kind: 'staff', id: arg };
      ui.jpMsg = null;
      render();
    },
    jpTalk: (arg) => {
      const s = ui.s;
      const x = ui.jp && G.jpMember(s, ui.jp.id);
      if (!x) return;
      ui.jpMsg = G.jpTalk(s, x, arg);
      G.checkAch(s);
      save();
      render();
    },
    jpStaffTalk: (arg) => {
      const s = ui.s;
      const st = ui.jp && G.jpStaffList(s).find((y) => y.key === ui.jp.id);
      if (!st) return;
      ui.jpMsg = G.jpStaffTalk(s, st, arg);
      G.checkAch(s);
      save();
      render();
    },
    jpClose: () => {
      ui.jp = null;
      ui.jpMsg = null;
      render();
    },
    achCat: (arg) => {
      ui.achCat = arg;
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
      ui.autoSummary = null;
      if (ui.s.after) {
        G.doAfterWeek(ui.s, ui.sel.work, ui.sel.priv);
        afterTurn();
        return;
      }
      syncSelection(ui.s);
      G.doAction(ui.s, ui.sel.train, ui.sel.priv);
      afterTurn();
    },
    autoGo: (arg) => {
      const s = ui.s;
      if (s.queue.length || s.gw) return;
      if (!s.after) syncSelection(s);
      ui.autoSummary = G.autoAdvance(s, arg);
      ui.autoOpen = false;
      afterTurn();
      window.scrollTo(0, 0);
    },
    autoClose: () => {
      ui.autoSummary = null;
      render();
    },
    autoOpen: () => {
      ui.autoOpen = !ui.autoOpen;
    },
    autoPlan: (arg) => {
      const [k, v] = arg.split(':');
      G.autoPlan(ui.s)[k] = v;
      ui.autoOpen = true;
      save();
      render();
    },
    autoChoose: () => {
      const plan = G.autoPlan(ui.s);
      plan.choose = !plan.choose;
      ui.autoOpen = true;
      save();
      render();
    },
    autoRaise: () => {
      const plan = G.autoPlan(ui.s);
      plan.raise = !plan.raise;
      ui.autoOpen = true;
      save();
      render();
    },
    auto: () => handlers.autoGo('w4'),
    calSkip: (arg) => {
      const s = ui.s;
      const t = G.skipTarget(s, arg);
      if (!t || s.queue.length || s.gw) return;
      ui.tab = 'action';
      ui.calDay = null;
      handlers.autoGo(t);
    },
    approach: (arg) => {
      if (!ui.s.gw || ui.s.queue.length) return;
      G.stepGames(ui.s, arg);
      afterTurn();
    },
    clutch: (arg) => {
      if (!ui.s.gw || !ui.s.gw.awaitClutch || ui.s.queue.length) return;
      G.stepGames(ui.s, null, arg);
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
      G.log(s, `${it.name}を購入。${msg}`, '', 'life');
      toast(msg);
      save();
      render();
    },
    invest: (arg) => {
      const s = ui.s;
      const inv = G.INVESTMENTS.find((x) => x.id === arg);
      const next = inv && inv.levels[G.invLv(s, arg)];
      if (!next) return;
      ui.confirm = {
        text: `${G.investLevelName(s, next)}（${G.fmtMoney(next.price)}）を購入しますか？\n（${next.desc}）`,
        yes: '購入する',
        run: () => {
          const msg = G.buyInvestment(s, arg);
          if (msg) {
            G.checkAch(s);
            toast(msg);
          } else toast('お金が足りません');
          afterTurn();
        },
      };
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
    // モーダルの中身を押したときは、背景の「閉じる」を発火させない
    if (e.target.closest('[data-stop]') && !e.target.closest('[data-stop] [data-act]')) return;
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const h = handlers[el.dataset.act];
    if (h) h(el.dataset.arg, el);
  });

  // 読み込むファイルを選んだら、中身をテキスト欄に入れる
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'ioFile' || !e.target.files || !e.target.files[0] || !ui.io) return;
    const reader = new FileReader();
    reader.onload = () => {
      ui.io = { ...ui.io, text: String(reader.result || ''), error: '' };
      render();
    };
    reader.readAsText(e.target.files[0]);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'pfamily') ui.create.family = e.target.value;
    if (e.target.id === 'pgiven') ui.create.given = e.target.value;
  });

  render();
})();
