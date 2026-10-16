// 自分だけの実績（野球・私生活・引退後）
// 試合のたび・週の終わり・出来事を選んだあとに条件を確かめ、達成した日付を記録する
(function () {
  const G = window.G;

  G.ACH_CATS = [
    { id: 'debut', name: 'プロの第一歩' },
    { id: 'bat', name: '打撃' },
    { id: 'pit', name: '投球' },
    { id: 'def', name: '守備・走塁' },
    { id: 'season', name: 'シーズン記録' },
    { id: 'career', name: '通算記録' },
    { id: 'title', name: 'タイトル・表彰' },
    { id: 'team', name: 'チーム・移籍' },
    { id: 'mlb', name: 'メジャー' },
    { id: 'hard', name: '試練' },
    { id: 'love', name: '恋愛・結婚' },
    { id: 'family', name: '家族' },
    { id: 'people', name: '仲間' },
    { id: 'life', name: '暮らし・趣味' },
    { id: 'fame', name: '人気・SNS' },
    { id: 'after', name: '引退後の人生' },
  ];

  // only: 'bat'（野手だけ）／'pit'（投手だけ）、hidden: 達成するまで名前を伏せる、bitter: ほろ苦い実績
  const L = [];
  const A = (c, id, n, d, t, o = {}) => L.push({ c, id, n, d, t, ...o });
  const BAT = { only: 'bat' };
  const PIT = { only: 'pit' };

  const slotOf = (c) => (c.g && c.g.order ? parseInt(c.g.order, 10) || 0 : 0);
  const batG = (c) => c.g && c.g.kind === 'bat';
  const pitG = (c) => c.g && c.g.kind === 'pit';
  const atBat = (c) => batG(c) && c.gl.pa > 0;
  const singles = (l) => l.h - l.d - l.t - l.hr;
  const era = (st) => (st.outs ? (st.er * 27) / st.outs : 99);
  const avg = (st) => (st.ab ? st.h / st.ab : 0);

  // ===== プロの第一歩 =====
  A('debut', 'draft', 'プロ野球選手誕生', 'ドラフト会議で指名を受けた', () => true);
  A('debut', 'camp', '初めての春季キャンプ', '2月1日、プロとして初めてのキャンプを迎えた', (c) => c.phase === 'camp' && c.date >= `${c.s.year}-02-01`);
  A('debut', 'camp1', '1軍キャンプ組', '春季キャンプを1軍でスタートした', (c) => c.phase === 'camp' && c.date >= `${c.s.year}-02-01` && c.p.squad === 'first');
  A('debut', 'open', 'オープン戦デビュー', 'オープン戦に出場した', (c) => c.s.open.bat.pa > 0 || c.s.open.pit.outs > 0);
  A('debut', 'ichigun', '初1軍', '初めて1軍の舞台に上がった', (c) => c.p.squad === 'first' && ['season', 'post'].includes(c.phase));
  A('debut', 'opening', '開幕1軍', '開幕1軍メンバーに選ばれた', (c) => c.seen('開幕1軍！') || c.hist(/^開幕1軍入り$/));
  A('debut', 'firstgame', 'プロ初出場', '1軍の公式戦に初めて出場した', (c) => !!c.g && !!c.g.kind);
  A('debut', 'openingday', '開幕戦に出場', '開幕戦のグラウンドに立った', (c) => !!c.g && !!c.g.kind && c.date === c.cal.opening);
  A('debut', 'start', '初スタメン', '初めてスタメンで試合に出た', (c) => batG(c) && c.own && c.own.starter, BAT);
  A('debut', 'pa', 'プロ初打席', '1軍で初めて打席に立った', (c) => atBat(c), BAT);
  A('debut', 'hit', 'プロ初安打', '記念のボールは宝物', (c) => batG(c) && c.gl.h > 0, BAT);
  A('debut', 'xbh', 'プロ初長打', '二塁打以上の当たりを放った', (c) => batG(c) && c.gl.d + c.gl.t + c.gl.hr > 0, BAT);
  A('debut', 'double', 'プロ初二塁打', '外野の間を破った', (c) => batG(c) && c.gl.d > 0, BAT);
  A('debut', 'triple', 'プロ初三塁打', '一気に三塁まで駆け抜けた', (c) => batG(c) && c.gl.t > 0, BAT);
  A('debut', 'hr', 'プロ初本塁打', 'ダイヤモンドを一周した', (c) => batG(c) && c.gl.hr > 0, BAT);
  A('debut', 'rbi', 'プロ初打点', 'チームに1点をもたらした', (c) => batG(c) && c.gl.rbi > 0, BAT);
  A('debut', 'run', 'プロ初得点', 'ホームベースを踏んだ', (c) => batG(c) && c.gl.r > 0, BAT);
  A('debut', 'bb', 'プロ初四球', 'しっかり見極めて出塁した', (c) => batG(c) && c.gl.bb > 0, BAT);
  A('debut', 'k', 'プロ初三振', 'プロの球は甘くない', (c) => batG(c) && c.gl.k > 0, { ...BAT, bitter: true });
  A('debut', 'sb', 'プロ初盗塁', '足でもぎ取った進塁', (c) => batG(c) && c.gl.sb > 0, BAT);
  A('debut', 'ph', '代打で出場', 'ここ一番で名前がコールされた', (c) => batG(c) && c.g.order === '代打', BAT);
  A('debut', 'phhit', '代打成功', '代打でヒットを打った', (c) => batG(c) && c.g.order === '代打' && c.gl.h > 0, BAT);
  A('debut', 'defsub', '守備固め', '終盤の守備を任された', (c) => batG(c) && c.g.order === '守備固め', BAT);
  A('debut', 'cleanup', '初の4番', '4番打者としてスタメン出場した', (c) => slotOf(c) === 4, BAT);
  A('debut', 'leadoff', '切り込み隊長', '1番打者としてスタメン出場した', (c) => slotOf(c) === 1, BAT);
  A('debut', 'pitch', 'プロ初登板', '1軍のマウンドに上がった', (c) => pitG(c), PIT);
  A('debut', 'gs', 'プロ初先発', '先発マウンドを任された', (c) => pitG(c) && c.gl.gs > 0, PIT);
  A('debut', 'pk', 'プロ初奪三振', '空振り三振を奪った', (c) => pitG(c) && c.gl.k > 0, PIT);
  A('debut', 'win', 'プロ初勝利', 'ウイニングボールを受け取った', (c) => pitG(c) && c.gl.w > 0, PIT);
  A('debut', 'loss', 'プロ初黒星', '悔しさを糧に', (c) => pitG(c) && c.gl.l > 0, { ...PIT, bitter: true });
  A('debut', 'save', 'プロ初セーブ', '最後のアウトをもぎ取った', (c) => pitG(c) && c.gl.s > 0, PIT);
  A('debut', 'hold', 'プロ初ホールド', 'リードを守ってバトンをつないだ', (c) => pitG(c) && c.gl.hld > 0, PIT);
  A('debut', 'zero', '無失点デビュー', '無失点で登板を終えた', (c) => pitG(c) && c.gl.r === 0, PIT);
  A('debut', 'qs', '初クオリティスタート', '先発して6回以上・自責点3以内', (c) => pitG(c) && c.gl.gs && c.gl.outs >= 18 && c.gl.er <= 3, PIT);
  A('debut', 'openingsp', '開幕投手', '開幕戦の先発マウンドに立った', (c) => pitG(c) && c.gl.gs > 0 && c.date === c.cal.opening, PIT);
  A('debut', 'raise', '初の年俸アップ', '契約更改で年俸が上がった', (c) => c.buzz('raise') > 0 && c.p.salary > c.d.salary0);
  A('debut', 'inter', '交流戦デビュー', '交流戦で他リーグのチームと対戦した', (c) => !!c.g && !!c.g.kind && !!c.g.inter);
  A('debut', 'allslots', '全打順制覇', '1番から9番まですべての打順で先発した', (c) => Object.keys(c.d.slots).length >= 9, { ...BAT, hidden: true });

  // ===== 打撃 =====
  A('bat', 'multi', 'マルチヒット', '1試合2安打以上', (c) => batG(c) && c.gl.h >= 2, BAT);
  A('bat', 'mouda', '猛打賞', '1試合3安打以上', (c) => batG(c) && c.gl.h >= 3, BAT);
  A('bat', 'h4', '4安打の固め打ち', '1試合4安打以上', (c) => batG(c) && c.gl.h >= 4, BAT);
  A('bat', 'h5', '5安打の大当たり', '1試合5安打', (c) => batG(c) && c.gl.h >= 5, { ...BAT, hidden: true });
  A('bat', 'hr2', '1試合2本塁打', '1試合で2本のアーチ', (c) => batG(c) && c.gl.hr >= 2, BAT);
  A('bat', 'hr3', '1試合3本塁打', '1試合で3本のアーチ', (c) => batG(c) && c.gl.hr >= 3, { ...BAT, hidden: true });
  A('bat', 'slam', 'グランドスラム', '満塁本塁打を放った', (c) => batG(c) && (c.g.pas || []).some((x) => x.code === 'HR' && x.rbi >= 4), BAT);
  A('bat', 'cycle', 'サイクルヒット', '単打・二塁打・三塁打・本塁打を1試合で', (c) => batG(c) && singles(c.gl) > 0 && c.gl.d > 0 && c.gl.t > 0 && c.gl.hr > 0, { ...BAT, hidden: true });
  A('bat', 'rbi4', '1試合4打点', '打点を荒稼ぎした', (c) => batG(c) && c.gl.rbi >= 4, BAT);
  A('bat', 'rbi6', '1試合6打点', '打点で試合を決めた', (c) => batG(c) && c.gl.rbi >= 6, { ...BAT, hidden: true });
  A('bat', 'bb3', '選球眼', '1試合3四球', (c) => batG(c) && c.gl.bb >= 3, BAT);
  A('bat', 'k4', '扇風機', '1試合4三振…', (c) => batG(c) && c.gl.k >= 4, { ...BAT, bitter: true });
  A('bat', 'streak10', '10試合連続安打', '連続試合安打を10に伸ばした', (c) => c.d.hitStreak >= 10, BAT);
  A('bat', 'streak20', '20試合連続安打', '連続試合安打を20に伸ばした', (c) => c.d.hitStreak >= 20, BAT);
  A('bat', 'streak30', '30試合連続安打', '球史に残る連続安打', (c) => c.d.hitStreak >= 30, { ...BAT, hidden: true });
  A('bat', 'hrstreak3', '3試合連続本塁打', '3試合続けてアーチをかけた', (c) => c.d.hrStreak >= 3, BAT);
  A('bat', 'hrstreak5', '5試合連続本塁打', '止まらないホームラン', (c) => c.d.hrStreak >= 5, { ...BAT, hidden: true });
  A('bat', 'allhit', '全球団から安打', 'リーグの全球団からヒットを打った', (c) => c.allOpp(c.d.hitOpp), BAT);
  A('bat', 'allhr', '全球団から本塁打', 'リーグの全球団からホームランを打った', (c) => c.allOpp(c.d.hrOpp), BAT);
  A('bat', 'cleanup_hr', '4番の一発', '4番打者としてホームランを打った', (c) => slotOf(c) === 4 && c.gl.hr > 0, BAT);
  A('bat', 'leadoff_hr', '先頭打者の一発', '1番打者としてホームランを打った', (c) => slotOf(c) === 1 && c.gl.hr > 0, BAT);
  A('bat', 'ph_hr', '代打本塁打', '代打の一振りでスタンドへ', (c) => batG(c) && c.g.order === '代打' && c.gl.hr > 0, BAT);
  A('bat', 'read', '読みが当たった', '試合前の作戦が相手にはまり、ヒットを打った', (c) => batG(c) && c.g.match === 'good' && c.gl.h > 0, BAT);

  // ===== 投球 =====
  A('pit', 'k10', '2ケタ奪三振', '1試合10奪三振以上', (c) => pitG(c) && c.gl.k >= 10, PIT);
  A('pit', 'k13', '奪三振ショー', '1試合13奪三振以上', (c) => pitG(c) && c.gl.k >= 13, { ...PIT, hidden: true });
  A('pit', 'seven0', '7回無失点', '先発して7回以上を無失点', (c) => pitG(c) && c.gl.gs && c.gl.outs >= 21 && c.gl.r === 0, PIT);
  A('pit', 'cg', '完投', '最後までマウンドを守り抜いた', (c) => pitG(c) && c.gl.gs && c.gl.outs >= 27, PIT);
  A('pit', 'sho', '完封勝利', '1点も与えず投げ切った', (c) => pitG(c) && c.gl.gs && c.gl.outs >= 27 && c.gl.r === 0, PIT);
  A('pit', 'nohit', 'ノーヒットノーラン', '1本のヒットも許さなかった', (c) => pitG(c) && c.gl.gs && c.gl.outs >= 27 && c.gl.h === 0, { ...PIT, hidden: true });
  A('pit', 'perfect', '完全試合', '27人で終わらせた', (c) => pitG(c) && c.gl.gs && c.gl.outs >= 27 && c.gl.h === 0 && c.gl.bb === 0, { ...PIT, hidden: true });
  A('pit', 'win5', '5連勝', '負けなしで5連勝', (c) => c.d.winStreak >= 5, PIT);
  A('pit', 'win10', '10連勝', '負けない投手', (c) => c.d.winStreak >= 10, { ...PIT, hidden: true });
  A('pit', 'zero10', '10試合連続無失点', 'リリーフで10登板続けて無失点', (c) => c.d.zeroStreak >= 10, PIT);
  A('pit', 'zero20', '20試合連続無失点', '鉄壁のリリーフ', (c) => c.d.zeroStreak >= 20, { ...PIT, hidden: true });
  A('pit', 'allwin', '全球団から勝利', 'リーグの全球団から白星を挙げた', (c) => c.allOpp(c.d.winOpp), PIT);
  A('pit', 'blown', 'セーブ失敗', 'リードを守れなかった夜', (c) => pitG(c) && !!c.g.blown, { ...PIT, bitter: true });
  A('pit', 'ko', 'ノックアウト', '先発して5失点以上…', (c) => pitG(c) && c.gl.gs && c.gl.r >= 5, { ...PIT, bitter: true });
  A('pit', 'read', '読みが当たった', '試合前の作戦がはまり、無失点で抑えた', (c) => pitG(c) && c.g.match === 'good' && c.gl.r === 0, PIT);

  // ===== 守備・走塁 =====
  A('def', 'fine', '初ファインプレー', 'スタンドが沸いた好守', (c) => batG(c) && c.g.fld && c.g.fld.fine > 0, BAT);
  A('def', 'fine10', 'ハイライトの常連', 'シーズン10度のファインプレー', (c) => c.sf.fine >= 10, BAT);
  A('def', 'error', 'プロ初失策', '悔しいエラー', (c) => batG(c) && c.g.fld && c.g.fld.e > 0, { ...BAT, bitter: true });
  A('def', 'cs', '盗塁阻止', '強肩で走者を刺した', (c) => batG(c) && c.g.fld && c.g.fld.cs > 0, BAT);
  A('def', 'sb2', '1試合2盗塁', '塁上をかき回した', (c) => batG(c) && c.gl.sb >= 2, BAT);
  A('def', 'drs10', '守備の名手', 'シーズン守備得点+10以上', (c) => c.sf.drs >= 10, BAT);
  A('def', 'noerror', '無失策シーズン', '100試合以上出場して失策0', (c) => c.done && c.sb.g >= 100 && c.sf.e === 0, { ...BAT, hidden: true });
  A('def', 'convert', '新しいポジションへ', 'ポジション（役割）の変更に挑戦した', (c) => c.buzz('poschange') > 0);

  // ===== シーズン記録 =====
  A('season', 'kitei', '規定打席到達', 'シーズン443打席以上', (c) => c.sb.pa >= 443, BAT);
  A('season', 'avg300', '打率3割', '規定打席に到達して打率.300以上', (c) => c.done && c.sb.pa >= 443 && avg(c.sb) >= 0.3, BAT);
  A('season', 'avg350', '打率3割5分', '規定打席に到達して打率.350以上', (c) => c.done && c.sb.pa >= 443 && avg(c.sb) >= 0.35, { ...BAT, hidden: true });
  A('season', 'hr10', '2ケタ本塁打', 'シーズン10本塁打', (c) => c.sb.hr >= 10, BAT);
  A('season', 'hr20', 'シーズン20本塁打', 'シーズン20本塁打', (c) => c.sb.hr >= 20, BAT);
  A('season', 'hr30', 'シーズン30本塁打', 'シーズン30本塁打', (c) => c.sb.hr >= 30, BAT);
  A('season', 'hr40', 'シーズン40本塁打', 'シーズン40本塁打', (c) => c.sb.hr >= 40, BAT);
  A('season', 'hr50', 'シーズン50本塁打', '伝説のアーチスト', (c) => c.sb.hr >= 50, { ...BAT, hidden: true });
  A('season', 'rbi100', '100打点', 'シーズン100打点', (c) => c.sb.rbi >= 100, BAT);
  A('season', 'h150', '150安打', 'シーズン150安打', (c) => c.sb.h >= 150, BAT);
  A('season', 'h200', '200安打', 'シーズン200安打', (c) => c.sb.h >= 200, { ...BAT, hidden: true });
  A('season', 'sb30', '30盗塁', 'シーズン30盗塁', (c) => c.sb.sb >= 30, BAT);
  A('season', 'sb50', '50盗塁', 'シーズン50盗塁', (c) => c.sb.sb >= 50, { ...BAT, hidden: true });
  A('season', 'triple3', 'トリプルスリー', '打率3割・30本塁打・30盗塁', (c) => c.done && c.sb.pa >= 443 && avg(c.sb) >= 0.3 && c.sb.hr >= 30 && c.sb.sb >= 30, { ...BAT, hidden: true });
  A('season', 'ops1', 'OPS10割', '規定打席に到達してOPS1.000以上', (c) => c.done && c.sb.pa >= 443 && G.batDerived(c.sb).ops >= 1, { ...BAT, hidden: true });
  A('season', 'allgames', '全試合出場', 'シーズン143試合すべてに出場', (c) => c.sb.g >= 143, BAT);
  A('season', 'kiteiP', '規定投球回到達', 'シーズン143イニング以上', (c) => c.sp.outs >= 429, PIT);
  A('season', 'w10', '2ケタ勝利', 'シーズン10勝', (c) => c.sp.w >= 10, PIT);
  A('season', 'w15', '15勝', 'シーズン15勝', (c) => c.sp.w >= 15, PIT);
  A('season', 'w20', '20勝', '大エースの証', (c) => c.sp.w >= 20, { ...PIT, hidden: true });
  A('season', 'era1', '防御率1点台', '規定投球回に到達して防御率1点台', (c) => c.done && c.sp.outs >= 429 && era(c.sp) < 2, { ...PIT, hidden: true });
  A('season', 'era2', '防御率2点台', '規定投球回に到達して防御率3.00未満', (c) => c.done && c.sp.outs >= 429 && era(c.sp) < 3, PIT);
  A('season', 'k150', '150奪三振', 'シーズン150奪三振', (c) => c.sp.k >= 150, PIT);
  A('season', 'k200', '200奪三振', 'シーズン200奪三振', (c) => c.sp.k >= 200, PIT);
  A('season', 's30', '30セーブ', 'シーズン30セーブ', (c) => c.sp.s >= 30, PIT);
  A('season', 's40', '40セーブ', '絶対的守護神', (c) => c.sp.s >= 40, PIT);
  A('season', 'hld30', '30ホールド', 'シーズン30ホールド', (c) => c.sp.hld >= 30, PIT);
  A('season', 'g50', '50登板', 'シーズン50試合に登板', (c) => c.sp.g >= 50, PIT);
  A('season', 'g70', '鉄腕', 'シーズン70試合に登板', (c) => c.sp.g >= 70, PIT);
  A('season', 'unbeaten', '負けなしのシーズン', '10勝以上して0敗', (c) => c.done && c.sp.w >= 10 && c.sp.l === 0, { ...PIT, hidden: true });
  A('season', 'war5', 'WAR5', 'シーズンWAR5.0以上', (c) => c.done && c.swar >= 5);
  A('season', 'war8', 'WAR8', 'シーズンWAR8.0以上。球界最高の選手', (c) => c.done && c.swar >= 8, { hidden: true });

  // ===== 通算記録 =====
  [
    [100, '通算100安打'], [500, '通算500安打'], [1000, '通算1000安打'], [1500, '通算1500安打'],
    [2000, '通算2000安打（名球会）'], [2500, '通算2500安打'], [3000, '通算3000安打'],
  ].forEach(([n, name]) => A('career', `h${n}`, name, `通算${n}安打に到達`, (c) => c.cb.h >= n, BAT));
  [[100, '通算100本塁打'], [200, '通算200本塁打'], [300, '通算300本塁打'], [400, '通算400本塁打'], [500, '通算500本塁打'], [600, '通算600本塁打']].forEach(([n, name]) =>
    A('career', `hr${n}`, name, `通算${n}本塁打に到達`, (c) => c.cb.hr >= n, BAT),
  );
  [[500, '通算500打点'], [1000, '通算1000打点'], [1500, '通算1500打点']].forEach(([n, name]) => A('career', `rbi${n}`, name, `通算${n}打点に到達`, (c) => c.cb.rbi >= n, BAT));
  [[100, '通算100盗塁'], [300, '通算300盗塁']].forEach(([n, name]) => A('career', `sb${n}`, name, `通算${n}盗塁に到達`, (c) => c.cb.sb >= n, BAT));
  [[500, '通算500試合出場'], [1000, '通算1000試合出場'], [1500, '通算1500試合出場'], [2000, '通算2000試合出場']].forEach(([n, name]) =>
    A('career', `g${n}`, name, `1軍で通算${n}試合に出場`, (c) => c.cb.g >= n, BAT),
  );
  [[10, '通算10勝'], [50, '通算50勝'], [100, '通算100勝'], [150, '通算150勝'], [200, '通算200勝（名球会）']].forEach(([n, name]) =>
    A('career', `w${n}`, name, `通算${n}勝に到達`, (c) => c.cp.w >= n, PIT),
  );
  [[100, '通算100セーブ'], [250, '通算250セーブ（名球会）']].forEach(([n, name]) => A('career', `s${n}`, name, `通算${n}セーブに到達`, (c) => c.cp.s >= n, PIT));
  [[100, '通算100ホールド'], [200, '通算200ホールド']].forEach(([n, name]) => A('career', `hld${n}`, name, `通算${n}ホールドに到達`, (c) => c.cp.hld >= n, PIT));
  [[500, '通算500奪三振'], [1000, '通算1000奪三振'], [2000, '通算2000奪三振'], [3000, '通算3000奪三振']].forEach(([n, name]) =>
    A('career', `k${n}`, name, `通算${n}奪三振に到達`, (c) => c.cp.k >= n, PIT),
  );
  [[300, '通算300登板'], [500, '通算500登板'], [700, '通算700登板']].forEach(([n, name]) => A('career', `pg${n}`, name, `1軍で通算${n}試合に登板`, (c) => c.cp.g >= n, PIT));
  [[10, '通算WAR10'], [30, '通算WAR30'], [50, '通算WAR50（殿堂級）'], [70, '通算WAR70']].forEach(([n, name]) =>
    A('career', `war${n}`, name, `現役通算のWARが${n}に到達`, (c) => c.cwar >= n, n >= 50 ? { hidden: true } : {}),
  );
  [[5, 'プロ5年目'], [10, 'プロ10年目'], [15, 'プロ15年目'], [20, 'プロ20年目']].forEach(([n, name]) =>
    A('career', `y${n}`, name, `現役のままプロ${n}年目を迎えた`, (c) => !c.s.retired && c.p.yearsPro + 1 >= n),
  );
  A('career', 'age40', '不惑の現役', '40歳になっても現役を続けた', (c) => !c.s.retired && c.p.age >= 40);

  // ===== タイトル・表彰 =====
  const T = (id, name, desc, opt = {}) => A('title', id, name, desc, (c) => c.hasTitle(name), opt);
  T('rookie', '新人王', '一生に一度の栄誉');
  T('mvp', 'MVP', 'リーグ最優秀選手に選ばれた');
  T('bestnine', 'ベストナイン', 'リーグのベストナインに選ばれた');
  T('gg', 'ゴールデングラブ賞', '守備の名手として表彰された', BAT);
  T('avgking', '首位打者', 'リーグ最高打率', BAT);
  T('hrking', '本塁打王', 'リーグ最多本塁打', BAT);
  T('rbiking', '打点王', 'リーグ最多打点', BAT);
  T('sbking', '盗塁王', 'リーグ最多盗塁', BAT);
  T('hitking', '最多安打', 'リーグ最多安打', BAT);
  T('triplecrown', '三冠王', '首位打者・本塁打王・打点王を同時に', { ...BAT, hidden: true });
  T('wking', '最多勝', 'リーグ最多勝', PIT);
  T('eraking', '最優秀防御率', 'リーグ最高の防御率', PIT);
  T('kking', '最多奪三振', 'リーグ最多奪三振', PIT);
  T('sking', '最多セーブ', 'リーグ最多セーブ', PIT);
  T('hldking', '最優秀中継ぎ', 'リーグ最多ホールドポイント', PIT);
  T('sawamura', '沢村賞', '先発投手最高の栄誉', { ...PIT, hidden: true });
  T('asmvp', 'オールスターMVP', '夢の球宴の主役になった');
  T('jsmvp', '日本シリーズMVP', '頂上決戦の主役になった');
  A('title', 'allstar', 'オールスター出場', 'ファン投票・監督推薦で選ばれた', (c) => (c.s.flags.allstarCount || 0) >= 1);
  A('title', 'allstar5', 'オールスター常連', 'オールスターに5回出場', (c) => (c.s.flags.allstarCount || 0) >= 5);
  A('title', 'allstar10', 'ミスター・オールスター', 'オールスターに10回出場', (c) => (c.s.flags.allstarCount || 0) >= 10);
  A('title', 'titles3', 'タイトルホルダー', 'タイトル・表彰を通算3つ', (c) => c.awardCount >= 3);
  A('title', 'titles10', '球界の顔', 'タイトル・表彰を通算10', (c) => c.awardCount >= 10);
  A('title', 'mvp3', '3度目のMVP', 'MVPを3回受賞', (c) => c.titleCount('MVP') >= 3, { hidden: true });
  A('title', 'meikyu', '名球会入り', '2000安打・200勝・250セーブのいずれかを達成', (c) => (c.pit ? c.cp.w >= 200 || c.cp.s >= 250 : c.cb.h >= 2000), { hidden: true });

  // ===== チーム・移籍 =====
  A('team', 'pennant', 'リーグ優勝', 'チームがリーグ優勝を果たした', (c) => c.hist(/チームがリーグ優勝/));
  A('team', 'pennant3', '黄金時代', 'リーグ優勝3回', (c) => c.histCount(/チームがリーグ優勝/) >= 3);
  A('team', 'japanseries', '日本シリーズ進出', 'クライマックスシリーズを勝ち抜いた', (c) => !!(c.s.final && c.s.final.cs) && !c.isMLB);
  A('team', 'champ', '日本一', '日本シリーズを制した', (c) => c.hist(/^日本一$/));
  A('team', 'champ3', '3度の日本一', '日本一を3回経験した', (c) => c.histCount(/^日本一$/) >= 3, { hidden: true });
  A('team', 'last', '最下位', 'チームが最下位に沈んだ…', (c) => !!c.s.final && c.s.final.rank === (c.isMLB ? 10 : 6), { bitter: true });
  A('team', 'fa', 'FA移籍', 'FA権を行使して新天地へ', (c) => c.hist(/FAで.*に移籍/));
  A('team', 'stay', '生涯一球団', 'FA権を得ても残留を選んだ', (c) => !!c.s.flags.faYear && !c.hist(/移籍/) && c.p.league !== 'mlb' && c.seenAny(/に残留することを決めた/));
  A('team', 'tryout', 'トライアウト合格', 'トライアウトから新しいチームへ', (c) => c.hist(/トライアウトを経て/));
  A('team', 'number1', 'エースナンバー級', '背番号1〜19を背負っている', (c) => c.p.number >= 1 && c.p.number <= 19 && !c.s.retired);
  A('team', 'cs_firstgame', 'ポストシーズン', 'チームがクライマックスシリーズに出場した', (c) => !!c.s.final && c.s.final.rank <= 3 && c.week >= c.cal.csW);

  // ===== メジャー =====
  A('mlb', 'challenge', 'メジャー挑戦', '海を渡り、メジャーリーグの球団と契約した', (c) => c.p.league === 'mlb' || c.hasTitle('メジャー挑戦'));
  A('mlb', 'mgame', 'メジャーデビュー', 'メジャーの公式戦に出場した', (c) => c.isMLB && !!c.g && !!c.g.kind);
  A('mlb', 'mhit', 'メジャー初安打', 'メジャーで初めてのヒット', (c) => c.isMLB && batG(c) && c.gl.h > 0, BAT);
  A('mlb', 'mhr', 'メジャー初本塁打', 'メジャーの球場にアーチをかけた', (c) => c.isMLB && batG(c) && c.gl.hr > 0, BAT);
  A('mlb', 'mwin', 'メジャー初勝利', 'メジャーで初めての白星', (c) => c.isMLB && pitG(c) && c.gl.w > 0, PIT);
  A('mlb', 'msave', 'メジャー初セーブ', 'メジャーのマウンドを締めくくった', (c) => c.isMLB && pitG(c) && c.gl.s > 0, PIT);
  A('mlb', 'mk', 'メジャー初奪三振', 'メジャーの強打者から三振を奪った', (c) => c.isMLB && pitG(c) && c.gl.k > 0, PIT);
  A('mlb', 'ws', 'ワールドシリーズ制覇', '世界一のチームの一員になった', (c) => c.hasTitle('ワールドシリーズ制覇'), { hidden: true });
  A('mlb', 'mtitle', 'メジャーのタイトル', 'メジャーでタイトル・表彰を受けた', (c) => c.s.titles.some((t) => /^MLB|サイ・ヤング|シルバースラッガー|ゴールドグラブ/.test(t.name)), { hidden: true });
  A('mlb', 'return', '日本球界に復帰', 'メジャーから日本に戻ってきた', (c) => c.hist(/日本球界に復帰/));

  // ===== 試練 =====
  A('hard', 'injury', '初めてのケガ', '体は資本', (c) => !!c.p.injury || c.buzz('injury') > 0, { bitter: true });
  A('hard', 'bigInjury', '長期離脱', '全治12週以上の大ケガ', (c) => c.hist(/全治(1[2-9]|[2-9]\d)週/), { bitter: true });
  A('hard', 'demote', '登録抹消', '2軍で出直し', (c) => c.buzz('demote') > 0, { bitter: true });
  A('hard', 'comeback', '再昇格', '登録抹消から1軍へはい上がった', (c) => c.buzz('demote') > 0 && c.buzz('promote') > c.d.promoteAtDemote, {});
  A('hard', 'bench', 'スタメン落ち', 'ベンチで悔しさをかみしめた', (c) => c.buzz('bench') > 0, { ...BAT, bitter: true });
  A('hard', 'cut', '年俸ダウン', '厳しい契約更改', (c) => c.buzz('cut') > 0, { bitter: true });
  A('hard', 'release', '戦力外通告', '球団から来季の契約を結ばないと告げられた', (c) => c.seen('戦力外通告'), { bitter: true, hidden: true });
  A('hard', 'slump', '大スランプ', '30打数以上で打率1割未満の時期があった', (c) => c.sb.ab >= 30 && avg(c.sb) < 0.1, { ...BAT, bitter: true, hidden: true });
  A('hard', 'scandal', '週刊誌に撮られた', 'スキャンダルが記事になった', (c) => c.buzz('scandal') > 0, { bitter: true, hidden: true });
  A('hard', 'fire', '炎上', 'SNSが炎上してしまった', (c) => c.seen('SNS炎上') || c.buzz('fire') > 0, { bitter: true });
  A('hard', 'tired', '疲労困憊', '体力が10以下まで落ち込んだ', (c) => c.p.stamina <= 10, { bitter: true });
  A('hard', 'slumpcond', '絶不調', '調子が「絶不調」まで落ち込んだ', (c) => c.p.condition === 0, { bitter: true });

  // ===== 恋愛・結婚 =====
  const hs = (c) => G.heroines(c.s);
  A('love', 'meet', '出会い', '気になる人と知り合った', (c) => hs(c).some((h) => h.met));
  A('love', 'meetall', '出会いの達人', '4人の女性すべてと知り合った', (c) => hs(c).filter((h) => h.met).length >= 4);
  A('love', 'friend', '友達以上？', '女性と気軽に連絡を取り合う仲になった', (c) => hs(c).some((h) => h.stage !== 'none' && h.stage !== 'met'));
  A('love', 'lover', '交際スタート', '告白が実り、恋人ができた', (c) => c.hist(/と交際スタート/));
  A('love', 'reject', '玉砕', '告白して断られた', (c) => c.d.flags.rejected, { bitter: true });
  A('love', 'date1', '初デート', '恋人と初めてデートした', (c) => c.priv('date') >= 1);
  A('love', 'date10', 'デート10回', '恋人とのデートを重ねた', (c) => c.priv('date') >= 10);
  A('love', 'date50', 'デート50回', 'いつまでも仲良し', (c) => c.priv('date') >= 50);
  A('love', 'liked', '好みを知る', '相手の好きなデートを見つけた', (c) => Object.keys(c.s.story).some((k) => k.startsWith('liked_')));
  A('love', 'anniv', '交際1周年', '付き合って1年の記念日を迎えた', (c) => c.seen('記念日'));
  A('love', 'propose', 'プロポーズ成功', '「……はい」', (c) => c.hist(/にプロポーズ/));
  A('love', 'proposeFail', 'プロポーズ保留', '返事はもう少し待って…', (c) => c.d.flags.proposeFail, { bitter: true });
  A('love', 'wedding', '結婚', '人生のパートナーと結ばれた', (c) => c.hist(/と結婚$/));
  A('love', 'w10', '結婚10周年', '錫婚式。10年連れ添った', (c) => { const sp = G.spouse(c.s); return !!sp && c.s.year - (sp.marriedYear || c.s.year) >= 10; });
  A('love', 'w25', '銀婚式', '結婚25周年', (c) => { const sp = G.spouse(c.s); return !!sp && c.s.year - (sp.marriedYear || c.s.year) >= 25; }, { hidden: true });
  A('love', 'w50', '金婚式', '結婚50周年', (c) => { const sp = G.spouse(c.s); return !!sp && c.s.year - (sp.marriedYear || c.s.year) >= 50; }, { hidden: true });
  A('love', 'cheat', '修羅場', '恋人に別の女性との密会を知られた', (c) => c.seen('疑惑'), { bitter: true, hidden: true });
  A('love', 'breakup', '失恋', '恋人と別れてしまった', (c) => c.hist(/と破局/), { bitter: true });
  A('love', 'divorce', '離婚', '別々の道を歩むことになった', (c) => c.hist(/と離婚/), { bitter: true, hidden: true });
  A('love', 'quarrel', '夫婦げんか', 'すれ違いの末に言い合いになった', (c) => c.seen('夫婦げんか'), { bitter: true });
  A('love', 'aff150', '最愛の人', '配偶者の好感度が最大に', (c) => { const sp = G.spouse(c.s); return !!sp && sp.aff >= 145; });

  // ===== 家族 =====
  A('family', 'pregnant', 'パパになる', '赤ちゃんができた', (c) => c.seen('うれしい知らせ') || c.p.kids.length > 0);
  A('family', 'kid1', '第一子誕生', '家族が増えた', (c) => c.p.kids.length >= 1);
  A('family', 'kid2', '2人の子の親', '子供が2人に', (c) => c.p.kids.length >= 2);
  A('family', 'kid3', '3人の子の親', 'にぎやかな毎日', (c) => c.p.kids.length >= 3);
  A('family', 'kid4', '大家族', '子供が4人に', (c) => c.p.kids.length >= 4, { hidden: true });
  A('family', 'papa', '「パパ」', '子供が初めて「パパ」と言った', (c) => c.seen('初めての言葉'));
  A('family', 'school', '入学式', '子供が小学校に入学した', (c) => c.seen('入学式'));
  A('family', 'catch', '親子でキャッチボール', '子供と一緒に野球をすることにした', (c) => c.p.kids.some((k) => k.baseball));
  A('family', 'koshien', '甲子園を目指して', '子供が野球の強豪高校に進学した', (c) => c.seen('甲子園を目指して'));
  A('family', 'nisei', '親子二代のプロ野球選手', '子供がドラフトで指名された', (c) => c.p.kids.some((k) => k.pro), { hidden: true });
  A('family', 'grandkid', '孫の顔', '孫と会えた', (c) => c.seen('孫の顔'), { hidden: true });
  A('family', 'family30', 'マイホームパパ', '家族と過ごした時間30回', (c) => c.priv('family') >= 30);
  A('family', 'kids30', '子煩悩', '子供と遊んだ回数30回', (c) => c.priv('kids') >= 30);
  A('family', 'house20', '家事の達人', '家事を20回手伝った', (c) => c.priv('housework') >= 20);
  A('family', 'bond', '親子の絆', '子供との絆が最大に', (c) => c.p.kids.some((k) => k.bond >= 100));
  A('family', 'call20', '親思い', '両親に20回電話した', (c) => c.priv('call_parents') >= 20);
  A('family', 'reform', '親孝行', '実家をリフォームしてプレゼントした', (c) => c.hist(/実家をリフォーム/));
  A('family', 'parentsSick', '父の入院', '実家の父が倒れた', (c) => c.seen('父の入院'), { bitter: true });
  A('family', 'home5', 'ふるさと', '地元に5回帰省した', (c) => c.priv('homecoming') >= 5);

  // ===== 仲間 =====
  const aff = (c, id) => (c.s.people[id] ? c.s.people[id].aff : 0);
  A('people', 'senpai', '頼れる先輩', '先輩との仲が75以上', (c) => aff(c, 'senpai') >= 75);
  A('people', 'senpaiSecret', '先輩の極意', '先輩から秘伝のコツを教わった', (c) => !!c.s.story.senpai_secret);
  A('people', 'rival', '好敵手', '同期のライバルとの仲が70以上', (c) => aff(c, 'rival') >= 70);
  A('people', 'promise', 'ライバルとの約束', 'どちらが先にタイトルを取るか勝負', (c) => !!c.s.story.rival_promise);
  A('people', 'coach', '師弟関係', 'コーチとの仲が80以上', (c) => aff(c, 'coach') >= 80);
  A('people', 'kohai', '憧れの先輩', '後輩に「目標は○○さん」と言われた', (c) => !!c.s.story.kohai_respect);
  A('people', 'kohaiMeet', '先輩になる', '後輩が入団してきた', (c) => !!(c.s.people.kohai && c.s.people.kohai.met));
  A('people', 'friend', '一生の親友', '地元の親友との仲が90以上', (c) => aff(c, 'friend') >= 90);
  A('people', 'speech', '友人代表スピーチ', '親友の結婚式に呼ばれた', (c) => !!c.s.story.friend_wedding);
  A('people', 'loan', '親友の頼み', '親友からお金の相談を受けた', (c) => !!c.s.story.friend_loan);
  A('people', 'reporter', '番記者の信頼', '記者が特集記事を書いてくれた', (c) => !!c.s.story.reporter_feature);
  A('people', 'parents', '自慢の息子', '両親との仲が95以上', (c) => aff(c, 'parents') >= 95);
  A('people', 'allfriends', '人望の厚い男', '家族・仲間6人との仲がすべて70以上', (c) => ['senpai', 'rival', 'coach', 'kohai', 'parents', 'friend'].every((id) => aff(c, id) >= 70), { hidden: true });
  A('people', 'senpaiDinner', '先輩にごちそうさま', '先輩と10回食事に行った', (c) => c.priv('senpai') >= 10);
  A('people', 'kohaiTreat', '後輩思い', '後輩に10回おごった', (c) => c.priv('kohai') >= 10);
  A('people', 'rivalRetire', 'ライバルの引退', '同期のライバルがユニフォームを脱いだ', (c) => c.seen('ライバルの引退') || c.hist(/ライバル.*引退/));

  // ===== 暮らし・趣味 =====
  A('life', 'alone', '一人暮らし', '寮を出て自分の部屋を借りた', (c) => c.p.home !== 'dorm');
  A('life', 'mansion', 'タワーマンション', '高級マンションに住んだ', (c) => c.p.home === 'mansion' || c.hist(/高級マンションに引っ越し/));
  A('life', 'house', 'マイホーム', '庭付き一戸建てを建てた', (c) => c.p.home === 'house');
  A('life', 'm1', '貯金1億円', '所持金1億円', (c) => c.p.money >= 10000);
  A('life', 'm5', '貯金5億円', '所持金5億円', (c) => c.p.money >= 50000);
  A('life', 'm10', '貯金10億円', '所持金10億円', (c) => c.p.money >= 100000, { hidden: true });
  A('life', 'sal1', '1億円プレーヤー', '年俸1億円に到達', (c) => c.p.salary >= 10000);
  A('life', 'sal3', '3億円プレーヤー', '年俸3億円に到達', (c) => c.p.salary >= 30000);
  A('life', 'sal5', '5億円プレーヤー', '年俸5億円に到達', (c) => c.p.salary >= 50000, { hidden: true });
  A('life', 'earn10', '生涯年収10億円', '稼いだ年俸と契約金の合計が10億円', (c) => (c.s.totalEarnings || 0) >= 100000);
  A('life', 'debt', '金欠', '所持金がマイナスになった', (c) => c.p.money < 0, { bitter: true });
  A('life', 'luxury', 'ぜいたくな暮らし', '暮らしぶりを「ぜいたく」にした', (c) => c.p.lifestyle === 'luxury');
  A('life', 'frugal', '節約生活', '暮らしぶりを「節約」にした', (c) => c.p.lifestyle === 'frugal');
  A('life', 'hobby', '趣味を見つけた', '打ち込める趣味ができた', (c) => !!c.p.hobby);
  A('life', 'hobby10', '趣味の腕前', '趣味レベル10', (c) => c.p.hobbyLv >= 10);
  A('life', 'hobby25', '趣味の名人', '趣味レベル25', (c) => c.p.hobbyLv >= 25);
  A('life', 'hobby50', 'プロ級の趣味', '趣味レベル50', (c) => c.p.hobbyLv >= 50, { hidden: true });
  A('life', 'travel', '旅に出る', 'オフに旅行へ出かけた', (c) => c.priv('travel') >= 1);
  A('life', 'travelAll', '旅の達人', '沖縄・北海道・京都・ハワイ・箱根をすべて訪れた', (c) => Object.keys(c.d.trips).length >= 5);
  A('life', 'happy', '最高に幸せ', '充実度95以上', (c) => c.p.happy >= 95);
  A('life', 'down', 'どん底', '充実度20以下', (c) => c.p.happy <= 20, { bitter: true });
  A('life', 'practice50', '練習の虫', '居残り自主練50回', (c) => c.priv('selfpractice') >= 50);
  A('life', 'gym30', 'ジム通い', 'ジムで30回体づくり', (c) => c.priv('gym') >= 30);
  A('life', 'study30', '研究熱心', '野球の研究30回', (c) => c.priv('study') >= 30);
  A('life', 'movie10', '映画好き', '映画を10回観た', (c) => c.priv('movie') >= 10);
  A('life', 'cafe20', 'カフェの常連', '行きつけのカフェに20回', (c) => c.priv('cafe') >= 20);
  A('life', 'shop20', '買い物好き', 'ショッピング20回', (c) => c.priv('shopping') >= 20);
  A('life', 'night20', '夜の街の顔', '繁華街で20回遊んだ', (c) => c.priv('nightlife') >= 20, { bitter: true });
  A('life', 'relax50', 'インドア派', '家でのんびり50回', (c) => c.priv('relax') >= 50);
  A('life', 'clinic10', '体のメンテナンス', '治療院で10回ケア', (c) => c.priv('clinic') >= 10);

  // ===== 人気・SNS =====
  A('fame', 'sns', 'SNSデビュー', '初めてSNSに投稿した', (c) => c.priv('sns') >= 1);
  A('fame', 'ego', 'エゴサーチ', '自分の評判を検索した', (c) => c.priv('egosearch') >= 1);
  A('fame', 'f10k', 'フォロワー1万人', 'SNSのフォロワーが1万人に', (c) => c.p.followers >= 10000);
  A('fame', 'f100k', 'フォロワー10万人', 'SNSのフォロワーが10万人に', (c) => c.p.followers >= 100000);
  A('fame', 'f1m', 'フォロワー100万人', '国民的な人気者', (c) => c.p.followers >= 1000000, { hidden: true });
  A('fame', 'pop30', '知る人ぞ知る', '人気30', (c) => c.p.popularity >= 30);
  A('fame', 'pop60', '人気選手', '人気60', (c) => c.p.popularity >= 60);
  A('fame', 'pop90', 'スーパースター', '人気90', (c) => c.p.popularity >= 90);
  A('fame', 'fan30', 'ファン思い', 'ファンサービス30回', (c) => c.priv('fanservice') >= 30);
  A('fame', 'tv', 'テレビ出演', 'テレビ番組に出演した', (c) => c.priv('tv') >= 1);
  A('fame', 'interview10', '取材慣れ', '取材を10回受けた', (c) => c.priv('interview') >= 10);
  A('fame', 'clinic', '野球教室', '子供たちに野球を教えた', (c) => c.priv('kids_clinic') >= 1);
  A('fame', 'cm', 'CM出演', 'お茶の間に顔が流れた', (c) => c.buzz('cm') > 0);
  A('fame', 'charity', 'チャリティー', '社会貢献に取り組んだ', (c) => c.buzz('charity') > 0);
  A('fame', 'hot', 'トレンド入り', '大活躍でSNSが沸いた', (c) => c.buzz('hotgame') > 0, BAT);
  A('fame', 'loved', 'ファンに愛されて', 'エゴサの評判が「大人気」以上に', (c) => c.d.flags.loved);

  // ===== 引退後の人生 =====
  A('after', 'retire', '現役引退', 'ユニフォームを脱いだ', (c) => !!c.s.retired);
  A('after', 'second', '第二の人生', '引退後の道を歩み始めた', (c) => !!c.s.after);
  A('after', 'promote', '新天地で昇進', '引退後の仕事でステップアップした', (c) => !!c.s.after && c.s.after.level >= 1);
  A('after', 'top', '第二の人生の頂点', '引退後の仕事で最高の地位に', (c) => !!c.s.after && c.s.after.level >= G.afterDef(c.s).ranks(c.s).length - 1, { hidden: true });
  A('after', 'manager', '監督就任', '指揮官として采配を振るう', (c) => c.hist(/監督に就任/));
  A('after', 'mgrWin', '監督で胴上げ', '指導者としてリーグ優勝', (c) => c.hist(/(監督|コーチ)としてリーグ優勝/));
  A('after', 'book', 'ベストセラー作家', '著書がベストセラーに', (c) => c.hist(/ベストセラー/), { hidden: true });
  A('after', 'drama', '俳優デビュー', 'ドラマで新人賞', (c) => c.hist(/ドラマで新人賞/), { hidden: true });
  A('after', 'shops', 'チェーン店', '飲食店を4店舗に', (c) => c.hist(/4号店をオープン/));
  A('after', 'scout', '名スカウト', '見出した選手がドラフト1位', (c) => c.hist(/スカウトした.*ドラフト1位/));
  A('after', 'kids', '名伯楽', '少年野球の教え子がプロ入り', (c) => !!c.s.after && c.s.after.titles.some((t) => /教え子/.test(t)));
  A('after', 'ob', 'OB戦', 'OB戦に出場した', (c) => c.seen('OB戦'));
  A('after', 'age60', '還暦', '60歳を迎えた', (c) => c.p.age >= 60);
  A('after', 'age70', '古希', '70歳を迎えた', (c) => c.p.age >= 70);
  A('after', 'age80', '傘寿', '80歳まで生きた', (c) => c.p.age >= 80);

  G.ACHIEVEMENTS = L;
  // 同じ id が別カテゴリにあるので、内部では「カテゴリ:id」で扱う
  L.forEach((a) => (a.key = `${a.c}:${a.id}`));
  G.achFor = (s) => {
    const pit = G.isPitcher(s.player);
    return L.filter((a) => !a.only || (a.only === 'pit') === pit);
  };

  // ---------- 記録の保管 ----------
  const data = (s) => {
    if (!s.achd) s.achd = { slots: {}, hitOpp: {}, hrOpp: {}, winOpp: {}, trips: {}, priv: {}, buzz: {}, seen: {}, flags: {}, hitStreak: 0, hrStreak: 0, winStreak: 0, zeroStreak: 0, promoteAtDemote: 0, salary0: s.player.salary };
    if (!s.ach) s.ach = {};
    return s.achd;
  };

  // 試合ごとの連続記録などを更新
  const trackGame = (s, d, g) => {
    const l = g.line;
    if (g.kind === 'bat' && l) {
      const slot = parseInt(g.order, 10);
      if (slot) d.slots[slot] = 1;
      if (l.pa > 0) {
        if (l.h > 0) d.hitStreak++;
        else if (l.ab > 0) d.hitStreak = 0;
        if (l.hr > 0) d.hrStreak++;
        else d.hrStreak = 0;
      }
      if (l.h > 0) d.hitOpp[g.oppId] = 1;
      if (l.hr > 0) d.hrOpp[g.oppId] = 1;
    }
    if (g.kind === 'pit' && l) {
      if (l.w) {
        d.winStreak++;
        d.winOpp[g.oppId] = 1;
      } else if (l.l) d.winStreak = 0;
      if (!l.gs) d.zeroStreak = l.r === 0 ? d.zeroStreak + 1 : 0;
    }
  };

  const ctxOf = (s, x) => {
    const p = s.player;
    const d = data(s);
    const pit = G.isPitcher(p);
    const sb = { ...G.emptyBat(), ...s.stats.bat };
    const sp = { ...G.emptyPit(), ...s.stats.pit };
    const sf = { ...G.emptyFld(), ...(s.stats.fld || {}) };
    if (s.gw && s.gw.acc) {
      G.addStats(sb, s.gw.acc.weekBat);
      G.addStats(sp, s.gw.acc.weekPit);
      if (s.gw.acc.weekFld) G.addStats(sf, s.gw.acc.weekFld);
    }
    const tot = G.careerTotals(s);
    const cb = { ...tot.bat };
    const cp = { ...tot.pit };
    let swar = 0;
    let cwar = tot.war;
    if (!s.retired && !s.after) {
      G.addStats(cb, sb);
      G.addStats(cp, sp);
      swar = G.seasonWAR(p, s);
      cwar += swar;
    }
    const cal = G.cal(s.year);
    const myLeague = G.teamById(p.teamId) ? G.teamById(p.teamId).league : null;
    const awards = s.titles.filter((t) => !['メジャー挑戦', '日本一', 'ワールドシリーズ制覇'].includes(t.name));
    return {
      s,
      p,
      d,
      pit,
      sb,
      sp,
      sf,
      cb,
      cp,
      swar,
      cwar,
      cal,
      week: s.week,
      phase: G.phaseOf(s.week, s.year).id,
      done: !s.gw && s.week > cal.endW,
      isMLB: p.league === 'mlb',
      g: x.game && x.game.kind ? x.game : null,
      gl: x.game && x.game.line,
      own: x.own || null,
      date: x.date,
      awardCount: awards.length,
      hist: (re) => s.history.some((h) => re.test(h.text)),
      histCount: (re) => s.history.filter((h) => re.test(h.text)).length,
      hasTitle: (name) => s.titles.some((t) => t.name === name),
      titleCount: (name) => s.titles.filter((t) => t.name === name).length,
      seen: (title) => !!d.seen[title],
      seenAny: (re) => !!d.flags[`re:${re.source}`],
      priv: (id) => d.priv[id] || 0,
      buzz: (t) => d.buzz[t] || 0,
      allOpp: (set) => {
        if (!myLeague) return false;
        const opp = G.TEAMS.filter((t) => t.league === myLeague && t.id !== p.teamId);
        return opp.length > 0 && opp.every((t) => set[t.id]);
      },
    };
  };

  // 出来事のテキストから拾う記録
  const TEXT_FLAGS = [
    [/断られてしまった/, 'rejected'],
    [/プロポーズは保留/, 'proposeFail'],
    [/に残留することを決めた/, 're:に残留することを決めた'],
  ];

  const scanQueue = (s, d) => {
    for (const q of s.queue) {
      if (q.title) d.seen[q.title] = 1;
      for (const [re, key] of TEXT_FLAGS) if (q.text && re.test(q.text)) d.flags[key] = true;
    }
  };

  const unlock = (s, a, date) => {
    s.ach[a.key] = { d: date, y: s.year };
    (s.achNew = s.achNew || []).push(a.key);
    if (s.achNew.length > 20) s.achNew.shift();
    G.log(s, `🏅 実績解除：${a.n}`, 'ach');
  };

  G.checkAch = (s, x = {}) => {
    if (!s || !s.player || s.ended) return;
    const d = data(s);
    if (x.game && x.game.kind) trackGame(s, d, x.game);
    scanQueue(s, d);
    const date = x.date || (s.gw && s.gw.days && s.gw.days[Math.max(0, s.gw.d - 1)] ? s.gw.days[Math.max(0, s.gw.d - 1)].d : G.weekDate(s, 0));
    const c = ctxOf(s, { ...x, date });
    for (const a of G.achFor(s)) {
      if (s.ach[a.key]) continue;
      let ok = false;
      try {
        ok = a.t(c);
      } catch (e) {
        ok = false;
      }
      if (ok) unlock(s, a, date);
    }
  };

  G.achProgress = (s) => {
    data(s);
    const list = G.achFor(s);
    const got = list.filter((a) => s.ach[a.key]).length;
    return { got, total: list.length };
  };

  // ---------- 既存の処理に「記録をとる」仕組みを差し込む ----------
  const origBuzz = G.buzz;
  G.buzz = (s, type, dt) => {
    const d = data(s);
    d.buzz[type] = (d.buzz[type] || 0) + 1;
    if (type === 'demote') d.promoteAtDemote = d.buzz.promote || 0;
    return origBuzz(s, type, dt);
  };

  const origPriv = G.doPrivate;
  G.doPrivate = (s, id) => {
    const msg = origPriv(s, id);
    const d = data(s);
    const key = String(id).split(':')[0];
    d.priv[key] = (d.priv[key] || 0) + 1;
    if (id === 'travel' && msg) for (const w of ['沖縄', '北海道', '京都', 'ハワイ', '箱根']) if (msg.includes(w)) d.trips[w] = 1;
    if (id === 'egosearch' || id === 'sns') {
      const r = G.egoSearch(s);
      if (r && r.score >= 75) d.flags.loved = true;
    }
    return msg;
  };

  const origEndWeek = G.endWeek;
  G.endWeek = (s, gw) => {
    const date = G.weekDate(s, 6);
    origEndWeek(s, gw);
    G.checkAch(s, { date });
  };

  const origAfterWeek = G.doAfterWeek;
  G.doAfterWeek = (s, workId, privId) => {
    const date = G.weekDate(s, 6);
    origAfterWeek(s, workId, privId);
    G.checkAch(s, { date });
  };

  const origResolve = G.resolveScene;
  G.resolveScene = (s, idx, input) => {
    origResolve(s, idx, input);
    G.checkAch(s);
  };

  const origNewGame = G.newGame;
  G.newGame = (opt, slot) => {
    const s = origNewGame(opt, slot);
    G.checkAch(s, { date: G.cal(s.year - 1).draftDate });
    s.achNew = [];
    return s;
  };

  const origMigrate = G.migrate;
  G.migrate = (s) => {
    origMigrate(s);
    data(s);
    if (!s.player.birthday) s.player.birthday = G.randomBirthday();
    return s;
  };
})();
