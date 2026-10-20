// ゲームデータ定義（球団・名前・特殊能力・ショップなど）
(function () {
  const G = window.G;

  G.LEAGUES = [
    { id: 'star', name: 'スターリーグ' },
    { id: 'dream', name: 'ドリームリーグ' },
  ];

  G.TEAMS = [
    { id: 'tokyo', name: '東京ギャラクシーズ', short: '東京', color: '#f08300', league: 'star' },
    { id: 'yokohama', name: '横浜オーシャンズ', short: '横浜', color: '#0067c0', league: 'star' },
    { id: 'nagoya', name: '名古屋ドラグーンズ', short: '名古屋', color: '#1d3f8f', league: 'star' },
    { id: 'osaka', name: '大阪ブレイカーズ', short: '大阪', color: '#e8b500', league: 'star' },
    { id: 'hiroshima', name: '広島スカーレッツ', short: '広島', color: '#d7000f', league: 'star' },
    { id: 'chiba', name: '千葉サンダーボルツ', short: '千葉', color: '#222222', league: 'star' },
    { id: 'sapporo', name: '札幌ノーザンライツ', short: '札幌', color: '#2aa6c9', league: 'dream' },
    { id: 'sendai', name: '仙台フェニックス', short: '仙台', color: '#8b1a2b', league: 'dream' },
    { id: 'saitama', name: '埼玉ライトニング', short: '埼玉', color: '#16408f', league: 'dream' },
    { id: 'kyoto', name: '京都エンペラーズ', short: '京都', color: '#6b3fa0', league: 'dream' },
    { id: 'fukuoka', name: '福岡ファルコンズ', short: '福岡', color: '#f2c200', league: 'dream' },
    { id: 'okinawa', name: '沖縄シーサーズ', short: '沖縄', color: '#00a37a', league: 'dream' },
  ];

  // 国際大会の代表チーム（球団の一覧には入れない）
  G.INTL_TEAMS = [
    { id: 'n_jpn', name: '侍ジャパン', short: '日本', color: '#10275c', league: 'intl' },
    { id: 'n_kor', name: '韓国代表', short: '韓国', color: '#c8102e', league: 'intl', east: true },
    { id: 'n_twn', name: '台湾代表', short: '台湾', color: '#1b4d9b', league: 'intl', east: true },
    { id: 'n_chn', name: '中国代表', short: '中国', color: '#d62828', league: 'intl', east: true },
    { id: 'n_aus', name: 'オーストラリア代表', short: '豪州', color: '#1f7a3d', league: 'intl' },
    { id: 'n_cze', name: 'チェコ代表', short: 'チェコ', color: '#2b4c9b', league: 'intl' },
    { id: 'n_ita', name: 'イタリア代表', short: '伊', color: '#1d7f4e', league: 'intl' },
    { id: 'n_mex', name: 'メキシコ代表', short: 'メキシコ', color: '#0b6e3b', league: 'intl' },
    { id: 'n_pur', name: 'プエルトリコ代表', short: 'PUR', color: '#b5121b', league: 'intl' },
    { id: 'n_ned', name: 'オランダ代表', short: 'オランダ', color: '#e0662f', league: 'intl' },
    { id: 'n_cub', name: 'キューバ代表', short: 'キューバ', color: '#0b3d91', league: 'intl' },
    { id: 'n_ven', name: 'ベネズエラ代表', short: 'VEN', color: '#a3162f', league: 'intl' },
    { id: 'n_dom', name: 'ドミニカ共和国代表', short: 'DOM', color: '#1c2b5a', league: 'intl' },
    { id: 'n_usa', name: 'アメリカ代表', short: 'USA', color: '#22356b', league: 'intl' },
  ];
  G.intlTeamByName = (short) => G.INTL_TEAMS.find((t) => t.short === short || t.name.replace(/代表$/, '') === short);
  // 監督の呼び方（球団に監督の名前があれば「〇〇監督」）
  G.mgrLabel = (s) => {
    const t = G.teamById(s.player.teamId);
    return t && t.manager ? `${t.manager.split(' ')[0]}監督` : '監督';
  };
  G.teamById = (id) => G.TEAMS.find((t) => t.id === id) || G.INTL_TEAMS.find((t) => t.id === id);

  G.SURNAMES = [
    '佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤',
    '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '清水', '山崎',
    '森', '池田', '橋本', '阿部', '石川', '前田', '藤田', '岡田', '後藤', '長谷川',
    '村上', '近藤', '坂本', '遠藤', '青木', '藤井', '西村', '福田', '太田', '三浦',
    '岡本', '松田', '中川', '中野', '原田', '小野', '竹内', '金子', '和田', '中山',
    '石井', '上田', '森田', '柴田', '酒井', '工藤', '横山', '宮崎', '宮本', '内田',
  ];

  G.MALE_NAMES = [
    '翔太', '大輝', '拓也', '健太', '大翔', '蓮', '陽翔', '悠真', '颯太', '湊',
    '亮', '誠', '剛', '隼人', '直樹', '和也', '慎吾', '達也', '雄大', '優斗',
    '龍之介', '圭', '航', '海斗', '一輝', '晴', '朗', '駿', '翼', '光',
  ];

  G.FEMALE_NAMES = [
    'さくら', 'あおい', 'ひなた', 'ゆい', 'みお', 'りこ', 'かのん', 'めい', 'ことね', 'はるか',
    'まい', 'えみ', 'あかり', 'ちひろ', 'なつみ', 'ゆな', 'さき', 'のぞみ',
  ];

  G.randomMaleName = () => G.pick(G.SURNAMES) + ' ' + G.pick(G.MALE_NAMES);

  G.POSITIONS = [
    { id: 'P', name: '投手', pitcher: true },
    { id: 'C', name: '捕手', defBonus: 1.2 },
    { id: '1B', name: '一塁手', defBonus: -0.6 },
    { id: '2B', name: '二塁手', defBonus: 0.4 },
    { id: '3B', name: '三塁手', defBonus: 0.1 },
    { id: 'SS', name: '遊撃手', defBonus: 0.8 },
    { id: 'OF', name: '外野手', defBonus: 0.0 },
  ];
  G.posById = (id) => G.POSITIONS.find((p) => p.id === id);

  G.HANDS = [
    { id: 'RR', name: '右投右打', throws: 'R', bats: 'R' },
    { id: 'RL', name: '右投左打', throws: 'R', bats: 'L' },
    { id: 'LL', name: '左投左打', throws: 'L', bats: 'L' },
    { id: 'RS', name: '右投両打', throws: 'R', bats: 'S' },
  ];

  G.BACKGROUNDS = [
    { id: 'hs', name: '高卒', age: 18, base: [24, 42], velo: [136, 145], growth: 1.25, desc: '能力は低いが伸びしろ十分' },
    { id: 'univ', name: '大卒', age: 22, base: [32, 50], velo: [140, 149], growth: 1.0, desc: 'バランス型。即戦力も狙える' },
    { id: 'corp', name: '社会人', age: 24, base: [38, 55], velo: [142, 150], growth: 0.85, desc: '完成度が高い即戦力' },
  ];

  G.GROWTH_TYPES = [
    { id: 'early', name: '早熟', desc: '若いうちにグングン伸びるが衰えも早い' },
    { id: 'normal', name: '普通', desc: '標準的な成長曲線' },
    { id: 'late', name: '晩成', desc: '若手時代は苦労するが長く活躍できる' },
  ];

  G.CONDITIONS = [
    { name: '絶不調', icon: '⬇', cls: 'c0', mul: 0.82 },
    { name: '不調', icon: '↘', cls: 'c1', mul: 0.92 },
    { name: '普通', icon: '➡', cls: 'c2', mul: 1.0 },
    { name: '好調', icon: '↗', cls: 'c3', mul: 1.08 },
    { name: '絶好調', icon: '⬆', cls: 'c4', mul: 1.16 },
  ];

  // 経験点カテゴリ
  G.EXP_CAP = 999; // 経験点はそれぞれ999まで貯められる
  G.EXP_TYPES = [
    { id: 'muscle', name: '筋力', color: '#e74c3c' },
    { id: 'agility', name: '敏捷', color: '#3498db' },
    { id: 'technique', name: '技術', color: '#27ae60' },
    { id: 'breaking', name: '変化球', color: '#9b59b6' },
    { id: 'mind', name: '精神', color: '#e67e22' },
  ];

  // 能力定義（main/sub は能力アップに必要な経験点の種類）
  G.BATTER_ABILITIES = [
    { id: 'contact', name: 'ミート', main: 'technique', sub: 'mind' },
    { id: 'power', name: 'パワー', main: 'muscle', sub: 'technique' },
    { id: 'speed', name: '走力', main: 'agility', sub: 'muscle' },
    { id: 'arm', name: '肩力', main: 'muscle', sub: 'agility' },
    { id: 'fielding', name: '守備力', main: 'agility', sub: 'mind' },
    { id: 'catching', name: '捕球', main: 'technique', sub: 'mind' },
  ];

  G.PITCHER_ABILITIES = [
    { id: 'velocity', name: '球速', main: 'muscle', sub: 'agility', unit: 'km/h', min: 120, max: 168 },
    { id: 'control', name: 'コントロール', main: 'technique', sub: 'mind' },
    { id: 'stamina', name: 'スタミナ', main: 'muscle', sub: 'mind' },
  ];

  G.PITCH_TYPES = [
    { id: 'slider', name: 'スライダー' },
    { id: 'curve', name: 'カーブ' },
    { id: 'fork', name: 'フォーク' },
    { id: 'shoot', name: 'シュート' },
    { id: 'change', name: 'チェンジアップ' },
    { id: 'cutter', name: 'カットボール' },
    { id: 'sinker', name: 'シンカー' },
    { id: 'splitter', name: 'スプリット' },
  ];
  G.pitchById = (id) => G.PITCH_TYPES.find((p) => p.id === id);

  // 特殊能力
  // type: 'B'=野手, 'P'=投手, 'A'=共通
  G.SKILLS = [
    { id: 'chance', name: 'チャンス◯', type: 'B', cost: { mind: 140, technique: 75 }, desc: '得点圏で打点が増える' },
    { id: 'avg', name: 'アベレージヒッター', type: 'B', cost: { technique: 220, mind: 100 }, desc: 'ヒットが出やすい' },
    { id: 'powerhit', name: 'パワーヒッター', type: 'B', cost: { muscle: 240, technique: 100 }, desc: 'ホームランが出やすい' },
    { id: 'eye', name: '選球眼', type: 'B', cost: { mind: 165, technique: 45 }, desc: '四球を選びやすい' },
    { id: 'tough', name: '粘り打ち', type: 'B', cost: { technique: 140, mind: 75 }, desc: '三振しにくい' },
    { id: 'steal', name: '盗塁◯', type: 'B', cost: { agility: 165, mind: 45 }, desc: '盗塁が成功しやすい' },
    { id: 'laser', name: 'レーザービーム', type: 'B', cost: { muscle: 120, agility: 120 }, desc: '守備での貢献が増える' },
    { id: 'glove', name: '守備職人', type: 'B', cost: { agility: 140, technique: 120 }, desc: '守備での貢献が大きく増える' },
    { id: 'nobi', name: 'ノビ◯', type: 'P', cost: { muscle: 140, technique: 100 }, desc: '打たれにくく三振を奪いやすい' },
    { id: 'kire', name: 'キレ◯', type: 'P', cost: { breaking: 140, technique: 100 }, desc: '三振を奪いやすい' },
    { id: 'pinch', name: 'ピンチ◯', type: 'P', cost: { mind: 195, technique: 45 }, desc: '失点しにくい' },
    { id: 'heavy', name: '重い球', type: 'P', cost: { muscle: 165, mind: 75 }, desc: 'ホームランを打たれにくい' },
    { id: 'quick', name: '尻上がり', type: 'P', cost: { mind: 120, muscle: 100 }, desc: '長いイニングを投げやすい' },
    { id: 'kkk', name: '奪三振', type: 'P', cost: { breaking: 165, mind: 100 }, desc: '三振が大幅に増える' },
    { id: 'durable', name: 'ケガしにくさ◯', type: 'A', cost: { muscle: 120, mind: 100 }, desc: 'ケガをしにくくなる' },
    { id: 'mood', name: 'ムード◯', type: 'A', cost: { mind: 140 }, desc: 'チームが勝ちやすくなる・人気が上がりやすい' },
    { id: 'recover', name: '回復◯', type: 'A', cost: { agility: 75, mind: 100 }, desc: '体力が回復しやすい' },
  ];
  G.skillById = (id) => G.SKILLS.find((s) => s.id === id);

  G.SHOP_ITEMS = [
    { id: 'drink', name: 'スポーツドリンク', price: 1, desc: '体力が20回復する', use: (p) => { p.stamina = G.clamp(p.stamina + 20, 0, 100); return '体力が回復した！'; } },
    { id: 'massage', name: '整体マッサージ', price: 3, desc: '体力が35回復する', use: (p) => { p.stamina = G.clamp(p.stamina + 35, 0, 100); return '体がほぐれて体力が回復した！'; } },
    { id: 'protein', name: '高級プロテイン', price: 5, desc: '筋力の経験点+12', use: (p) => { p.exp.muscle += 12; return '筋力の経験点が12上がった！'; } },
    { id: 'video', name: '研究用ビデオ', price: 5, desc: '技術の経験点+12', use: (p) => { p.exp.technique += 12; return '技術の経験点が12上がった！'; } },
    { id: 'book', name: '名選手の自伝', price: 3, desc: '精神の経験点+10', use: (p) => { p.exp.mind += 10; return '精神の経験点が10上がった！'; } },
    { id: 'spikes', name: '特注スパイク', price: 8, desc: '敏捷の経験点+15', use: (p) => { p.exp.agility += 15; return '敏捷の経験点が15上がった！'; } },
    { id: 'yakiniku', name: '高級焼肉', price: 6, desc: '調子が1段階上がる', use: (p) => { p.condition = G.clamp(p.condition + 1, 0, 4); return 'おいしい焼肉で調子が上がった！'; } },
    { id: 'onsen', name: '温泉旅行', price: 20, desc: '体力全回復＆調子アップ', use: (p) => { p.stamina = 100; p.condition = G.clamp(p.condition + 1, 0, 4); return '温泉でリフレッシュ！体力全回復＆調子アップ！'; } },
    { id: 'trainer', name: '専属トレーナー契約(1年)', price: 800, desc: '1年間、練習の経験点が25%アップ', use: (p, s) => { s.flags.trainerUntil = s.year; return '専属トレーナーと契約した！今年の練習効率がアップ！'; } },
    { id: 'car', name: '高級スポーツカー', price: 3000, desc: '人気+5（一度きり）', once: true, use: (p) => { p.popularity = G.clamp(p.popularity + 5, 0, 100); p.car = true; return 'ピカピカのスポーツカーを手に入れた！'; } },
  ];

  // 1年の流れ（週番号 1〜52）
  G.SEASON_GAMES = 143;

  // 年間の流れは calendar.js の実際の日程から決まる（year を渡す）
  G.phaseOf = (week, year) => {
    const c = G.cal(year);
    if (week < c.campW) return { id: 'jan', name: '自主トレ期間' };
    if (week < c.openW) return { id: 'camp', name: '春季キャンプ' };
    if (week < c.startW) return { id: 'open', name: 'オープン戦' };
    if (week <= c.endW) return { id: 'season', name: week >= c.interW[0] && week <= c.interW[1] ? '交流戦' : 'ペナントレース' };
    if (week <= c.jsW) return { id: 'post', name: 'ポストシーズン' };
    if (week <= c.fallEndW) return { id: 'fall', name: '秋季キャンプ' };
    return { id: 'off', name: 'オフシーズン' };
  };

  G.monthOf = (week, year) => {
    const d = G.dateOfWeek(year, week, 3);
    return { month: d.getUTCMonth() + 1, weekInMonth: Math.ceil(d.getUTCDate() / 7) };
  };

  // その週に予定されている試合数（雨天中止になる日も含む）
  G.gamesInWeek = (week, year) => {
    if (G.phaseOf(week, year).id !== 'season') return 0;
    return G.daysInWeek(week, year).length;
  };
})();
