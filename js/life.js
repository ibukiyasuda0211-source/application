// 私生活（人間関係・恋愛・家族・住まい・趣味・充実度・第二の人生）
(function () {
  const G = window.G;

  // ---------- データ ----------
  G.PLACES = [
    { id: 'home', name: '自宅' },
    { id: 'love', name: '恋愛' },
    { id: 'family', name: '家族' },
    { id: 'people', name: '仲間と過ごす' },
    { id: 'town', name: '街へ出かける' },
    { id: 'ballpark', name: '球場・ジム' },
    { id: 'work', name: '仕事・ファン' },
    { id: 'trip', name: '遠出（オフ限定）' },
  ];

  G.HOBBIES = [
    { id: 'fishing', name: '釣り', desc: '心が落ち着き、調子を崩しにくくなる' },
    { id: 'cooking', name: '料理', desc: '毎週の体力回復が増える' },
    { id: 'reading', name: '読書', desc: '精神の経験点が手に入る' },
    { id: 'golf', name: 'ゴルフ', desc: '先輩やコーチと仲良くなれる' },
    { id: 'game', name: 'ゲーム', desc: '充実度がぐっと上がる' },
    { id: 'music', name: 'ギター', desc: '少しずつ人気が上がる' },
  ];
  G.hobbyById = (id) => G.HOBBIES.find((h) => h.id === id);

  G.HOMES = [
    { id: 'dorm', name: '球団寮', price: 0, weekly: 0, rest: 0, happy: 0, desc: '食事付きで練習環境も良い。若手向け' },
    { id: 'apartment', name: '賃貸マンション', price: 0, weekly: 4, rest: 3, happy: 0.3, desc: '家賃は月17万円ほど。自由な一人暮らし' },
    { id: 'mansion', name: '高級マンション', price: 8000, weekly: 2, rest: 6, happy: 0.6, desc: '都心の眺めの良い分譲マンション' },
    { id: 'house', name: '庭付き一戸建て', price: 15000, weekly: 3, rest: 8, happy: 0.9, desc: '広い庭のある家。家族が多くても安心' },
  ];
  G.homeById = (id) => G.HOMES.find((h) => h.id === id);

  G.LIFESTYLES = [
    { id: 'frugal', name: '節約', weekly: 2, happy: -0.4, desc: '週2万円。貯金はたまるが心は少しすさむ' },
    { id: 'normal', name: 'ふつう', weekly: 5, happy: 0, desc: '週5万円。無理のない暮らし' },
    { id: 'luxury', name: 'ぜいたく', weekly: 15, happy: 0.6, desc: '週15万円。毎日が楽しい' },
  ];
  G.lifestyleById = (id) => G.LIFESTYLES.find((l) => l.id === id);

  G.HEROINE_TYPES = [
    { id: 'cafe', job: 'カフェの店員', likes: 'quiet', intro: '球場近くのカフェで働く、笑顔のやわらかい女性。' },
    { id: 'trainer', job: 'ジムのトレーナー', likes: 'active', intro: '体のことに詳しい、さっぱりした性格の女性。' },
    { id: 'ana', job: 'スポーツアナウンサー', likes: 'luxury', intro: 'テレビ局のスポーツ担当アナウンサー。華やかだが努力家。' },
    { id: 'hometown', job: '地元の幼なじみ', likes: 'casual', intro: '子供のころ同じ町で育った、明るい幼なじみ。' },
  ];

  G.DATES = [
    { id: 'casual', name: '気軽なデート', desc: 'ラーメン屋やゲームセンターへ', cost: 2, love: 7, spots: ['ラーメン屋', 'ゲームセンター', '商店街の食べ歩き', 'カラオケ'] },
    { id: 'dinner', name: 'おしゃれなディナー', desc: '夜景の見えるレストランへ', cost: 10, love: 9, likes: 'luxury', spots: ['夜景の見えるレストラン', '高級寿司店', 'ホテルのラウンジ'] },
    { id: 'active', name: 'アクティブなデート', desc: 'ハイキングやボウリングへ', cost: 4, love: 8, stamina: -5, likes: 'active', spots: ['ハイキング', 'ボウリング', 'サイクリング', 'テニス'] },
    { id: 'quiet', name: '落ち着いたデート', desc: '美術館や公園へ', cost: 2, love: 7, likes: 'quiet', spots: ['美術館', '植物園', '公園のベンチ', '古本屋めぐり'] },
  ];
  G.DATES.find((d) => d.id === 'casual').likes = 'casual';

  G.STAGE_NAME = { none: '', met: '知り合い', friend: '友達', lover: '恋人', fiance: '婚約者', married: '配偶者', ex: '元恋人', exwife: '元配偶者' };

  G.SECOND_CAREERS = [
    {
      id: 'coach',
      name: '指導者の道へ',
      req: (s, war) => war >= 8 || s.people.coach.aff >= 60,
      text: (s, war) =>
        war >= 40
          ? 'コーチとして若手を鍛え上げ、数年後には監督に就任。ベンチから見る景色は現役時代とはまた違った。'
          : 'コーチとして球団に残り、若手の育成に情熱を注いでいる。教え子が1軍で活躍するたびに目を細める。',
    },
    { id: 'commentator', name: '野球解説者になる', req: (s) => s.player.popularity >= 40, text: () => '野球解説者として活躍。現場を知る言葉はわかりやすいと評判で、中継に欠かせない存在になった。' },
    { id: 'talent', name: 'タレントとして芸能界へ', req: (s) => s.player.popularity >= 65, text: () => 'バラエティ番組で引っ張りだこに。野球を知らない人にも名前を知られる存在になった。' },
    { id: 'business', name: '飲食店を開業する', req: (s) => s.player.money >= 3000, text: () => '念願の飲食店を開業。店内に飾ったユニフォームを見に、今日もファンが訪れる。' },
    { id: 'scout', name: 'スカウトとして球団に残る', req: (s) => s.player.yearsPro >= 4, text: () => 'スカウトとして全国の球場を飛び回る毎日。未来のスターを見つけるのが今の楽しみだ。' },
    { id: 'hometown', name: '地元で少年野球を教える', req: () => true, text: () => '故郷に戻り、少年野球チームの監督に。子供たちの笑顔に囲まれて、野球の楽しさを伝えている。' },
    { id: 'company', name: '一般企業に就職する', req: () => true, text: () => '会社員として新しい人生をスタート。草野球チームでは今でもエースで4番だ。' },
  ];

  // ---------- ヘルパー ----------
  G.absWeek = (s) => s.year * 52 + s.week;
  G.isOffseason = (s) => ['jan', 'fall', 'off'].includes(G.phaseOf(s.week, s.year).id);

  G.heroines = (s) => Object.values(s.people).filter((x) => x.group === 'love');
  G.partner = (s) => G.heroines(s).find((h) => ['lover', 'fiance', 'married'].includes(h.stage)) || null;
  G.spouse = (s) => G.heroines(s).find((h) => h.stage === 'married') || null;
  G.heroineType = (h) => G.HEROINE_TYPES.find((t) => t.id === h.type);
  G.kidAge = (s, k) => s.year - k.born;

  G.addAff = (s, id, d) => {
    const x = s.people[id];
    if (!x || !d) return '';
    x.aff = G.clamp(x.aff + d, 0, x.group === 'love' ? 150 : 100);
    const label = x.group === 'love' ? `${x.name}の好感度` : `${x.name}との仲`;
    return `${label}${d > 0 ? '+' : ''}${d}`;
  };

  // 充実度は高くなるほど上がりにくい
  G.addHappy = (s, d) => {
    const h = s.player.happy;
    if (d > 0) d *= G.clamp((100 - h) / 40, 0.15, 1);
    s.player.happy = G.clamp(h + d, 0, 100);
  };

  const scene = (s, title, text, extra = {}) => s.queue.push({ kind: 'info', title, text, ...extra });
  const lifeScene = (s, id, title, text, data = {}) => s.queue.push({ kind: 'life', id, title, text, data });
  const once = (s, key) => {
    if (s.story[key]) return false;
    s.story[key] = true;
    return true;
  };
  const fx = (s, f) => G.applyFx(s, f);

  // ---------- 初期化・移行 ----------
  G.initLife = (s) => {
    const p = s.player;
    const mk = (id, name, role, group, aff, met) => ({ id, name, role, group, aff, met });
    s.people = {
      senpai: mk('senpai', s.npc.senpai, 'チームの先輩', 'team', 25, true),
      rival: { ...mk('rival', s.npc.rival, '同期入団のライバル', 'team', 15, true), war: 0, best: '' },
      coach: mk('coach', `${s.npc.coach}コーチ`, 'コーチ', 'team', 20, true),
      kohai: mk('kohai', G.randomMaleName(), '後輩', 'team', 30, false),
      parents: mk('parents', '実家の両親', '家族', 'family', 70, true),
      friend: mk('friend', G.randomMaleName(), '地元の親友', 'friend', 60, true),
      reporter: mk('reporter', G.randomMaleName(), 'スポーツ紙の担当記者', 'work', 15, false),
    };
    const used = new Set();
    for (const t of G.HEROINE_TYPES) {
      let name;
      do name = `${G.pick(G.SURNAMES)} ${G.pick(G.FEMALE_NAMES)}`;
      while (used.has(name));
      used.add(name);
      s.people[`h_${t.id}`] = { ...mk(`h_${t.id}`, name, t.job, 'love', 0, false), type: t.id, stage: 'none', dates: 0 };
    }
    p.happy = 60;
    p.home = p.age <= 22 ? 'dorm' : 'apartment';
    p.lifestyle = 'normal';
    p.hobby = null;
    p.hobbyLv = 0;
    p.kids = [];
    p.followers = 300;
    s.story = {};
    s.happySum = 0;
    s.happyWeeks = 0;
  };

  // 旧バージョンのセーブデータを新しい形式にそろえる
  G.migrate = (s) => {
    const p = s.player;
    if (!s.people) {
      const oldMarried = p.married;
      const oldGf = p.girlfriend;
      const oldKids = p.children || 0;
      G.initLife(s);
      if (p.house) p.home = 'mansion';
      if (oldMarried || oldGf) {
        const h = s.people.h_cafe;
        h.name = (oldMarried || oldGf).name;
        h.met = true;
        h.stage = oldMarried ? 'married' : 'lover';
        h.aff = oldMarried ? 80 : Math.max(30, oldGf.love || 30);
        h.since = G.absWeek(s);
        if (oldMarried && p.home === 'dorm') p.home = 'apartment';
      }
      for (let i = 0; i < oldKids; i++) p.kids.push({ name: G.pick(['ゆうと', 'はると', 'さくら', 'ひなた', 'そうた', 'めい']), born: s.year - 1, bond: 50, baseball: null });
    }
    if (G.ensureTeams) G.ensureTeams(s);
    if (!s.stats.fld) s.stats.fld = G.emptyFld();
    // 旧バージョンで週の途中にセーブしていた場合は、実際の日程に合わせ直す
    if (s.gw && !s.gw.days) {
      s.gw.days = G.daysInWeek(s.week, s.year).slice();
      s.gw.n = s.gw.days.length;
      s.gw.d = Math.min(s.gw.d, s.gw.n);
      s.gw.cur = null;
      s.gw.await = false;
      s.gw.last = null;
    }
    if (!s.draft && G.genDraftClass) G.genDraftClass(s);
    delete p.married;
    delete p.girlfriend;
    delete p.children;
    delete p.house;
    return s;
  };

  // ---------- オフの過ごし方 ----------
  const trainExp = (s, base) => (G.isPitcher(s.player) ? { technique: base, breaking: Math.round(base * 0.6) } : { technique: base, muscle: Math.round(base * 0.6) });

  const STATIC_ACTIONS = [
    // 自宅
    {
      id: 'relax', place: 'home', name: '家でのんびり', desc: '体力を回復',
      run: (s) => {
        const home = G.homeById(s.player.home);
        return `${home.name}でゆっくり過ごした。` + fx(s, { stamina: 15 + home.rest, happy: 2 });
      },
    },
    {
      id: 'hobby', place: 'home',
      name: (s) => (s.player.hobby ? `${G.hobbyById(s.player.hobby).name}を楽しむ` : '趣味を見つける'),
      desc: (s) => (s.player.hobby ? `趣味レベル ${s.player.hobbyLv}` : '打ち込める趣味を探す'),
      run: (s) => G.doHobby(s),
    },
    { id: 'study', place: 'home', name: '野球の研究', desc: '精神・技術の経験点', run: (s) => '試合の映像を見て研究した。' + fx(s, { exp: { mind: 8, technique: 5 }, happy: -1 }) },
    { id: 'sns', place: 'home', name: 'SNSを更新', desc: '人気アップ。炎上に注意', run: (s) => G.doSns(s) },
    {
      id: 'egosearch', place: 'home', name: 'エゴサーチする', desc: 'ファンの声を読む（SNSタブでも見られる）',
      run: (s) => {
        const r = G.egoSearch(s);
        if (r.score >= 60) return `SNSで自分の名前を検索してみた。ファンの評判は「${r.label}」。温かい声に励まされた。` + fx(s, { happy: 4, exp: { mind: 3 } });
        if (r.score >= 45) return `SNSで自分の名前を検索してみた。評判は「${r.label}」。期待も厳しい声もある。` + fx(s, { exp: { mind: 6 } });
        return `SNSで自分の名前を検索してみた。評判は「${r.label}」…。厳しい言葉が胸に刺さる。でも、見返してやる。` + fx(s, { happy: -5, exp: { mind: 10 } });
      },
    },
    {
      id: 'call_parents', place: 'home', name: '両親に電話', desc: '実家の両親と話す',
      run: (s) => `${G.pick(['母が「ちゃんと食べてる？」と心配していた。', '父が先週の試合について熱く語ってきた。', '実家の犬が元気だと聞いて安心した。'])}` + fx(s, { aff: { parents: 4 }, happy: 2 }),
    },
    // 仲間
    {
      id: 'senpai', place: 'people', cost: 2, name: (s) => `${s.people.senpai.name}先輩と食事`, desc: '先輩との仲が深まる',
      run: (s) => `${s.people.senpai.name}先輩に${G.pick(['焼肉', '寿司', '居酒屋', 'ちゃんこ鍋'])}に連れて行ってもらった。` + fx(s, { aff: { senpai: 6 }, exp: { mind: 5 }, happy: 2 }),
    },
    {
      id: 'rival', place: 'people', cost: 2, name: (s) => `同期の${s.people.rival.name}と過ごす`, desc: 'ライバルとの仲が深まる',
      run: (s) => {
        if (G.chance(0.5)) return `${s.people.rival.name}と一緒に自主練をした。負けていられない！` + fx(s, { aff: { rival: 6 }, exp: trainExp(s, 6), stamina: -6 });
        return `${s.people.rival.name}とゲームをして盛り上がった。` + fx(s, { aff: { rival: 6 }, happy: 3 });
      },
    },
    {
      id: 'kohai', place: 'people', cost: 4, name: (s) => `後輩の${s.people.kohai.name}におごる`, desc: '後輩に慕われる',
      req: (s) => (s.people.kohai.met ? '' : '後輩がまだいない'),
      run: (s) => `${s.people.kohai.name}に${G.pick(['焼肉', 'ラーメン', 'ステーキ'])}をおごった。「ごちそうさまです！」` + fx(s, { aff: { kohai: 7 }, happy: 2, trust: 1 }),
    },
    {
      id: 'coach', place: 'people', name: (s) => `${s.people.coach.name}に相談`, desc: '首脳陣の評価が少し上がる',
      run: (s) => '練習方法について相談した。' + fx(s, { aff: { coach: 5 }, trust: 2, exp: { technique: 4 } }),
    },
    {
      id: 'posconsult', place: 'people', name: 'コーチにポジション変更を相談', desc: '守備位置・役割の変更を願い出る',
      req: (s) => G.canConsultPosition(s),
      run: (s) => G.startPositionConsult(s),
    },
    {
      id: 'friend', place: 'people', name: (s) => `親友の${s.people.friend.name}と電話`, desc: '地元の親友と語り合う',
      run: (s) => `${s.people.friend.name}と昔話で盛り上がった。` + fx(s, { aff: { friend: 5 }, happy: 3 }),
    },
    // 街
    {
      id: 'nightlife', place: 'town', cost: 6, name: '繁華街で遊ぶ', desc: '調子アップ。遊びすぎに注意',
      run: (s) => {
        s.flags.playCount = (s.flags.playCount || 0) + 1;
        return `${G.pick(['カラオケ', 'ボウリング', 'ダーツバー', 'ゲームセンター'])}で羽を伸ばした。` + fx(s, { cond: G.chance(0.7) ? 1 : 0, happy: 5, stamina: 4 });
      },
    },
    { id: 'shopping', place: 'town', cost: 10, name: 'ショッピング', desc: '充実度アップ', run: (s) => `${G.pick(['新しい服', '腕時計', 'スニーカー', 'ゲーム機'])}を買った。` + fx(s, { happy: 6 }) },
    {
      id: 'cafe', place: 'town', cost: 1, name: '行きつけのカフェ', desc: 'ゆったり過ごす。出会いも？',
      run: (s) => {
        const msg = 'カフェでコーヒーを飲みながらのんびりした。' + fx(s, { stamina: 8, happy: 3 });
        G.tryMeet(s, 'h_cafe', 0.4);
        return msg;
      },
    },
    { id: 'movie', place: 'town', cost: 1, name: '映画を観る', desc: '充実度アップ', run: (s) => `${G.pick(['感動の野球映画', '話題のアクション映画', 'ほのぼのアニメ映画', 'ホラー映画'])}を観た。` + fx(s, { happy: 4, exp: { mind: 3 } }) },
    // 球場・ジム
    {
      id: 'selfpractice', place: 'ballpark', name: '居残り自主練', desc: '経験点アップ・体力を使う',
      run: (s) => '日が暮れるまで居残りで練習した。' + fx(s, { exp: trainExp(s, 9), stamina: -12, trust: 1, happy: -1 }),
    },
    {
      id: 'gym', place: 'ballpark', cost: 1, name: 'ジムで体づくり', desc: '筋力・敏捷の経験点。出会いも？',
      run: (s) => {
        const msg = 'ジムでじっくり体を鍛えた。' + fx(s, { exp: { muscle: 8, agility: 4 }, stamina: -6 });
        G.tryMeet(s, 'h_trainer', 0.4);
        return msg;
      },
    },
    {
      id: 'clinic', place: 'ballpark', cost: 3, name: '治療院でケア', desc: '体力を大きく回復',
      run: (s) => {
        let msg = '治療院で体をケアしてもらった。' + fx(s, { stamina: 25 });
        if (s.player.injury && G.chance(0.5)) {
          s.player.injury.weeks = Math.max(1, s.player.injury.weeks - 1);
          msg += '\nケガの回復が早まった！';
        }
        return msg;
      },
    },
    // 仕事・ファン
    { id: 'fanservice', place: 'work', name: 'ファンサービス', desc: 'サイン会で人気アップ', run: (s) => 'サイン会でファンと交流した。' + fx(s, { pop: 2, happy: 1, stamina: -3 }) },
    {
      id: 'interview', place: 'work', name: '取材を受ける', desc: '記者と仲良くなる',
      req: (s) => (s.player.popularity >= 15 || s.player.squad === 'first' ? '' : '人気15以上か1軍で解禁'),
      run: (s) => {
        const r = s.people.reporter;
        let msg = '';
        if (!r.met) {
          r.met = true;
          msg = `スポーツ紙の記者・${r.name}さんが担当についた。`;
        }
        msg += 'インタビューに答えた。' + fx(s, { aff: { reporter: 6 }, pop: 1 });
        if (s.player.popularity >= 25) G.tryMeet(s, 'h_ana', 0.3);
        return msg;
      },
    },
    {
      id: 'tv', place: 'work', name: 'テレビ番組に出演', desc: '出演料と人気',
      req: (s) => (s.player.popularity >= 40 ? '' : '人気40以上で解禁'),
      run: (s) => {
        const msg = `${G.pick(['スポーツニュース', 'バラエティ番組', 'トーク番組'])}に出演した。` + fx(s, { money: G.ri(5, 15) * 10, pop: 3, stamina: -8 });
        G.tryMeet(s, 'h_ana', 0.45);
        return msg;
      },
    },
    {
      id: 'kids_clinic', place: 'work', name: '野球教室を開く', desc: '子供たちに野球を教える',
      req: (s) => (s.player.popularity >= 20 ? '' : '人気20以上で解禁'),
      run: (s) => '地域の子供たちに野球を教えた。目を輝かせる子供たちに元気をもらった。' + fx(s, { pop: 2, exp: { mind: 6 }, happy: 3, stamina: -4 }),
    },
    // 遠出
    {
      id: 'homecoming', place: 'trip', cost: 6, name: '地元に帰省', desc: '両親・親友と過ごす',
      req: (s) => (G.isOffseason(s) ? '' : 'オフシーズン限定'),
      run: (s) => {
        const msg = '久しぶりに地元へ帰った。母の手料理が身にしみる。' + fx(s, { aff: { parents: 10, friend: 8 }, happy: 6, stamina: 15 });
        G.tryMeet(s, 'h_hometown', 0.6);
        return msg;
      },
    },
    {
      id: 'travel', place: 'trip', cost: 30, name: '旅行に行く', desc: '心身ともにリフレッシュ',
      req: (s) => (G.isOffseason(s) ? '' : 'オフシーズン限定'),
      run: (s) => {
        const where = G.pick(['沖縄', '北海道', '京都', 'ハワイ', '箱根の温泉']);
        const pt = G.partner(s);
        if (pt) return `${pt.name}と${where}へ旅行した。最高の思い出になった！` + fx(s, { happy: 12, stamina: 25, cond: 1, aff: { [pt.id]: 15 } });
        return `ひとりで${where}へ旅行した。` + fx(s, { happy: 10, stamina: 25, cond: 1 });
      },
    },
    // 家族
    {
      id: 'family', place: 'family', name: '家族と過ごす', desc: '家族の時間を大切に',
      req: (s) => (G.spouse(s) ? '' : '結婚すると解禁'),
      run: (s) => {
        const sp = G.spouse(s);
        const kids = s.player.kids;
        for (const k of kids) k.bond = G.clamp(k.bond + 4, 0, 100);
        const where = G.pick(['公園', '水族館', '遊園地', 'キャンプ場', 'ショッピングモール']);
        return `家族みんなで${where}に出かけた。${kids.length ? '子供たちは大はしゃぎだ。' : ''}` + fx(s, { aff: { [sp.id]: 8 }, happy: 5, stamina: 6 });
      },
    },
    {
      id: 'housework', place: 'family', name: '家事を手伝う', desc: '配偶者の好感度アップ',
      req: (s) => (G.spouse(s) ? '' : '結婚すると解禁'),
      run: (s) => `${G.pick(['料理', '掃除', '洗濯', '買い出し'])}を担当した。「ありがとう、助かる！」` + fx(s, { aff: { [G.spouse(s).id]: 7 }, happy: 2 }),
    },
    {
      id: 'kids', place: 'family', name: '子供と遊ぶ', desc: '子供との絆が深まる',
      req: (s) => (s.player.kids.some((k) => G.kidAge(s, k) >= 1) ? '' : '子供が1歳になると解禁'),
      run: (s) => {
        const kids = s.player.kids.filter((k) => G.kidAge(s, k) >= 1);
        const k = G.pick(kids);
        k.bond = G.clamp(k.bond + 10, 0, 100);
        const age = G.kidAge(s, k);
        const play = age >= 6 ? G.pick(['キャッチボール', 'バッティングセンター', '自転車の練習', '宿題を見る']) : G.pick(['お絵かき', '絵本の読み聞かせ', '砂場遊び', '肩車']);
        return `${k.name}（${age}歳）と${play}をした。` + fx(s, { happy: 6, stamina: -3 });
      },
    },
  ];

  // 恋愛は相手の状況に応じて選択肢が変わる
  const loveActions = (s) => {
    const acts = [];
    const pt = G.partner(s);
    for (const h of G.heroines(s)) {
      if (!h.met || h === pt || ['ex', 'exwife'].includes(h.stage)) continue;
      acts.push({
        id: `see:${h.id}`, place: 'love', cost: 2, name: `${h.name}に会う`, desc: `${h.role}・${G.STAGE_NAME[h.stage]}`,
        run: (s2) => G.seeHeroine(s2, h.id),
      });
      if (!pt && h.stage === 'friend' && h.aff >= 60) {
        acts.push({ id: `confess:${h.id}`, place: 'love', name: `${h.name}に告白する`, desc: '想いを伝える', run: (s2) => G.confess(s2, h.id) });
      }
    }
    if (pt) {
      for (const d of G.DATES) {
        acts.push({
          id: `date:${d.id}`, place: 'love', cost: d.cost, name: d.name, desc: `${pt.name}と・${d.desc}`,
          run: (s2) => G.date(s2, d.id),
        });
      }
      if (pt.stage === 'lover' && pt.aff >= 100) {
        const weeks = G.absWeek(s) - (pt.since || 0);
        acts.push({
          id: 'propose', place: 'love', cost: 100, name: 'プロポーズする', desc: '婚約指輪を用意して',
          req: () => (weeks >= 20 ? '' : `付き合って20週から（あと${20 - weeks}週）`),
          run: (s2) => G.propose(s2),
        });
      }
    }
    return acts;
  };

  const resolveField = (v, s) => (typeof v === 'function' ? v(s) : v);

  G.privateActions = (s) => {
    const p = s.player;
    const list = [...STATIC_ACTIONS, ...loveActions(s)];
    return list.map((a) => {
      let reason = a.req ? a.req(s) : '';
      if (!reason && a.cost && p.money < a.cost) reason = 'お金が足りない';
      if (!reason && p.injury && ['selfpractice', 'gym', 'nightlife', 'travel'].includes(a.id)) reason = 'ケガの治療中';
      if (!reason && s.after && ['selfpractice', 'coach'].includes(a.id)) reason = '現役のときだけ';
      return { id: a.id, place: a.place, name: resolveField(a.name, s), desc: resolveField(a.desc, s), cost: a.cost || 0, reason, ok: !reason };
    });
  };

  G.doPrivate = (s, id) => {
    const list = [...STATIC_ACTIONS, ...loveActions(s)];
    const a = list.find((x) => x.id === id);
    if (!a) return '';
    if (a.cost) s.player.money -= a.cost;
    let msg = a.run(s);
    // 同じ過ごし方ばかりだとマンネリに
    const streak = s.flags.lastPriv === id ? (s.flags.privStreak || 1) + 1 : 1;
    s.flags.lastPriv = id;
    s.flags.privStreak = streak;
    if (streak >= 3 && !['relax'].includes(id)) {
      G.addHappy(s, -3);
      msg += '\n（同じ過ごし方が続いて、ちょっとマンネリ気味だ…）';
    }
    return msg;
  };

  // ---------- 趣味・SNS ----------
  G.doHobby = (s) => {
    const p = s.player;
    if (!p.hobby) {
      lifeScene(s, 'choose_hobby', '趣味を見つける', 'オフの時間に打ち込める趣味がほしい。何を始めよう？');
      return '新しい趣味を探してみることにした。';
    }
    p.hobbyLv++;
    const h = G.hobbyById(p.hobby);
    const f = { happy: 5, stamina: 5 };
    let msg = `${h.name}を楽しんだ。`;
    if (p.hobby === 'reading') f.exp = { mind: 8 };
    if (p.hobby === 'golf') {
      f.aff = { senpai: 3, coach: 3 };
      msg = '先輩やコーチとゴルフを回った。';
    }
    if (p.hobby === 'game') f.happy = 8;
    if (p.hobby === 'music') f.pop = 1;
    if (p.hobby === 'cooking') f.stamina = 10;
    if (p.hobby === 'fishing') f.cond = G.chance(0.4) ? 1 : 0;
    msg += fx(s, f);
    const milestones = { 10: '腕前がだいぶ上がってきた！', 25: '仲間内では「名人」と呼ばれるようになった！', 50: 'その道のプロにも一目置かれる腕前になった！' };
    if (milestones[p.hobbyLv]) {
      msg += `\n${h.name}の${milestones[p.hobbyLv]}`;
      s.history.push({ year: s.year, text: `趣味の${h.name}がレベル${p.hobbyLv}に` });
    }
    return msg;
  };

  G.doSns = (s) => {
    const p = s.player;
    const gain = Math.round(50 + p.popularity * G.ri(20, 60));
    p.followers += gain;
    const post = G.pick(['練習後の自撮り', '愛用のグラブの写真', 'チームメイトとの写真', '今日のごはん', 'ファンへの感謝のメッセージ']);
    let msg = `SNSに${post}を投稿した。フォロワー+${gain.toLocaleString()}` + fx(s, { pop: 1, happy: 1 });
    if (G.chance(0.08)) {
      lifeScene(s, 'sns_fire', 'SNS炎上', `何気ない投稿が切り取られ、SNSで炎上してしまった！\nコメント欄が荒れている…。`);
    }
    return msg;
  };

  // ---------- 恋愛 ----------
  G.tryMeet = (s, hid, prob) => {
    const h = s.people[hid];
    if (!h || h.met || G.partner(s) === h) return;
    if (s.player.age < 19 || !G.chance(prob)) return;
    const t = G.heroineType(h);
    lifeScene(s, 'meet_heroine', '出会い', `${t.intro}\n\n${h.name}さんと言葉を交わすきっかけができた。`, { hid });
  };

  G.seeHeroine = (s, hid) => {
    const h = s.people[hid];
    h.dates = (h.dates || 0) + 1;
    const pt = G.partner(s);
    let msg = `${h.name}さんと${G.pick(['お茶をした', '少し話をした', '食事に行った', '一緒に散歩した'])}。` + fx(s, { aff: { [hid]: G.ri(6, 10) }, happy: 2 });
    if (pt && h.aff >= 40 && G.chance(0.25)) {
      lifeScene(s, 'cheat', '疑惑', `${pt.name}に、${h.name}さんと会っていたことを知られてしまった…。\n「…どういうこと？」`, { hid });
    }
    return msg;
  };

  G.confess = (s, hid) => {
    const h = s.people[hid];
    const pr = G.clamp(0.55 + (h.aff - 60) * 0.02, 0.2, 0.95);
    if (G.chance(pr)) {
      h.stage = 'lover';
      h.since = G.absWeek(s);
      s.history.push({ year: s.year, text: `${h.name}さんと交際スタート` });
      scene(s, '告白', `「…${s.player.name}さん、実は私もずっと気になってたんです」\n\n${h.name}さんと付き合うことになった！`, { big: '交際スタート' });
      return `${h.name}さんに想いを伝えた。` + fx(s, { happy: 15, cond: 2 });
    }
    scene(s, '告白', `「ごめんなさい…今はまだ、そういうふうには考えられなくて」\n\n${h.name}さんに断られてしまった…。`);
    return `${h.name}さんに想いを伝えた。` + fx(s, { aff: { [hid]: -15 }, happy: -10, cond: -1 });
  };

  G.date = (s, did) => {
    const pt = G.partner(s);
    const d = G.DATES.find((x) => x.id === did);
    const t = G.heroineType(pt);
    pt.dates = (pt.dates || 0) + 1;
    const liked = d.likes === t.likes;
    const spot = G.pick(d.spots);
    let msg = `${pt.name}と${spot}へ。`;
    msg += liked ? 'とても喜んでくれた！' : '楽しい時間を過ごした。';
    msg += fx(s, { aff: { [pt.id]: d.love + (liked ? 6 : 0) }, happy: 4, cond: G.chance(0.5) ? 1 : 0, stamina: d.stamina || 0 });
    if (liked && !s.story[`liked_${pt.id}`]) {
      s.story[`liked_${pt.id}`] = true;
      msg += `\n（${pt.name}は「${d.name}」が好きみたいだ）`;
    }
    return msg;
  };

  G.propose = (s) => {
    const pt = G.partner(s);
    const pr = G.clamp(0.6 + (pt.aff - 100) * 0.04, 0.5, 0.98);
    if (G.chance(pr)) {
      pt.stage = 'fiance';
      s.flags.weddingAt = G.absWeek(s) + 8;
      s.history.push({ year: s.year, text: `${pt.name}さんにプロポーズ` });
      scene(s, 'プロポーズ', `夜景の見える場所で、指輪を差し出した。\n「${pt.name}さん、僕と結婚してください」\n\n「……はい。よろしくお願いします」\n\n${pt.name}さんと婚約した！8週間後に結婚式だ！`, { big: '婚約' });
      return 'プロポーズを決意した。' + fx(s, { happy: 20, cond: 2 });
    }
    scene(s, 'プロポーズ', `「ごめんなさい。気持ちはうれしいけど、もう少し考えさせて…」\n\nプロポーズは保留になってしまった。`);
    return 'プロポーズを決意した。' + fx(s, { aff: { [pt.id]: -20 }, happy: -8 });
  };

  // ---------- 毎週の私生活 ----------
  G.weeklyLife = (s) => {
    const p = s.player;
    const home = G.homeById(p.home);
    const ls = G.lifestyleById(p.lifestyle);
    const sp = G.spouse(s);
    const pt = G.partner(s);

    // 生活費（年俸の手取りは game.js 側で加算）
    p.money -= home.weekly + ls.weekly + (sp ? 3 : 0) + p.kids.length * 3;

    // 充実度
    let dh = (50 - p.happy) * 0.12 - 1 + home.happy + ls.happy;
    if (sp && sp.aff >= 60) dh += 0.6;
    else if (pt && pt.aff >= 50) dh += 0.4;
    dh += Math.min(3, p.kids.length) * 0.3;
    if (p.injury) dh -= 0.8;
    if (p.squad === 'first') dh += 0.2;
    if (p.home === 'dorm' && p.age >= 24) dh -= 0.5;
    if (p.money < 0) dh -= 1;
    G.addHappy(s, dh);
    if (p.happy >= 75 && G.chance(0.12)) p.condition = Math.min(4, p.condition + 1);
    if (p.happy <= 30 && G.chance(0.18)) p.condition = Math.max(0, p.condition - 1);
    if (p.hobby === 'cooking') p.stamina = G.clamp(p.stamina + 3, 0, 100);
    s.happySum += p.happy;
    s.happyWeeks += 1;

    // 好感度の自然変化
    for (const h of G.heroines(s)) {
      if (!h.met) continue;
      if (h.stage === 'lover') h.aff -= 1.5;
      else if (h.stage === 'fiance') h.aff -= 0.8;
      else if (h.stage === 'married') h.aff -= 0.6;
      else if (h.stage === 'met' || h.stage === 'friend') h.aff -= 0.3;
      h.aff = Math.max(0, h.aff);
      if (h.stage === 'met' && h.aff >= 30) {
        h.stage = 'friend';
        scene(s, '距離が縮まる', `${h.name}さんとすっかり打ち解けて、気軽に連絡を取り合う仲になった。`);
      }
    }
    if (pt && pt.stage === 'lover' && pt.aff <= 8) {
      pt.stage = 'ex';
      s.history.push({ year: s.year, text: `${pt.name}さんと破局` });
      scene(s, '別れ', `${pt.name}から「最近、全然会えないね…。もう終わりにしよう」と告げられた。\n\n${pt.name}と別れてしまった…。`);
      G.addHappy(s, -15);
      p.condition = Math.max(0, p.condition - 2);
    }
    if (sp && sp.aff <= 0) {
      sp.stage = 'exwife';
      p.money = Math.round(p.money * 0.6);
      s.history.push({ year: s.year, text: `${sp.name}と離婚` });
      scene(s, '離婚', `${sp.name}から離婚届を差し出された。すれ違いの日々の末、別々の道を歩むことになった…。\n\n（財産分与で所持金が減った）`);
      G.addHappy(s, -25);
    } else if (sp && sp.aff < 25 && once(s, `quarrel_${s.year}`)) {
      lifeScene(s, 'quarrel', '夫婦げんか', `最近、${sp.name}とすれ違いが続いている。今日はついに言い合いになってしまった…。`);
    }

    // 結婚式
    if (s.flags.weddingAt && G.absWeek(s) >= s.flags.weddingAt) {
      s.flags.weddingAt = null;
      const f = G.partner(s);
      if (f && f.stage === 'fiance') lifeScene(s, 'wedding', '結婚式', `いよいよ${f.name}との結婚式。どんな式にしよう？`);
    }

    // 妊娠・出産
    const youngest = p.kids.length ? Math.min(...p.kids.map((k) => G.kidAge(s, k))) : 99;
    if (sp && sp.aff >= 50 && p.kids.length < 4 && youngest >= 1 && !s.flags.babyDue && G.chance(0.006)) {
      s.flags.babyDue = G.absWeek(s) + 36;
      scene(s, 'うれしい知らせ', `${sp.name}「…あのね、赤ちゃんができたみたい」\n\n${p.name}、パパになる！`, { big: 'おめでた' });
      G.addHappy(s, 15);
      s.history.push({ year: s.year, text: '妊娠がわかる' });
    }
    if (s.flags.babyDue && G.absWeek(s) >= s.flags.babyDue) {
      s.flags.babyDue = null;
      s.queue.push({ kind: 'life', id: 'birth', title: '誕生', text: `元気な産声が病院に響いた。${sp ? sp.name : '妻'}も赤ちゃんも無事だ！\n\n赤ちゃんの名前を決めよう。`, data: {}, input: G.pick(['はると', 'ゆうと', 'そうた', 'さくら', 'ひなた', 'めい', 'りく', 'ゆい']) });
    }

    G.checkStories(s);
  };

  // ---------- 人間関係のストーリー ----------
  G.checkStories = (s) => {
    const p = s.player;
    const P = s.people;
    const pitcher = G.isPitcher(p);
    if (P.senpai.aff >= 45 && once(s, 'senpai_tips')) {
      scene(s, '先輩の教え', `${P.senpai.name}先輩「お前、最近頑張ってるな。俺が若い頃に教わったコツを教えてやるよ」` + '\n\n' + fx(s, { exp: pitcher ? { breaking: 25, technique: 10 } : { technique: 25, muscle: 10 } }));
    }
    if (P.senpai.aff >= 75 && once(s, 'senpai_secret')) {
      const pool = G.availableSkills(p).filter((sk) => !p.skills.includes(sk.id));
      if (pool.length) scene(s, '先輩の極意', `${P.senpai.name}先輩「これは誰にも教えたことがないんだが…お前になら」\n\n` + fx(s, { skill: G.pick(pool).id }));
    }
    if (P.rival.aff >= 50 && once(s, 'rival_promise')) {
      lifeScene(s, 'rival_promise', 'ライバルとの約束', `${P.rival.name}「なあ、俺たちどっちが先にタイトルを取るか、勝負しないか？」`);
    }
    if (P.coach.aff >= 50 && once(s, 'coach_push')) {
      scene(s, 'コーチの後押し', `${P.coach.name}「お前のことは監督にも推しておいたぞ。期待してる」` + '\n\n' + fx(s, { trust: 8 }));
    }
    if (P.coach.aff >= 80 && once(s, 'coach_secret')) {
      scene(s, 'マンツーマン指導', `${P.coach.name}「よし、今日はとことん付き合ってやる」\n夜遅くまで特別指導を受けた。\n\n` + fx(s, { ability: pitcher ? { control: 3 } : { contact: 3 } }));
    }
    if (P.kohai.met && P.kohai.aff >= 60 && once(s, 'kohai_worry')) {
      lifeScene(s, 'kohai_worry', '後輩の悩み', `${P.kohai.name}「先輩…最近まったく結果が出なくて。俺、プロでやっていけるんでしょうか…」`);
    }
    if (P.kohai.met && P.kohai.aff >= 85 && once(s, 'kohai_respect')) {
      scene(s, '憧れの先輩', `${P.kohai.name}が雑誌のインタビューで「目標は${p.name}さんです」と答えていた。\n\n` + fx(s, { happy: 6, pop: 2 }));
    }
    if (P.reporter.met && P.reporter.aff >= 50 && once(s, 'reporter_feature')) {
      scene(s, '特集記事', `${P.reporter.name}さんが「${p.name}、知られざる努力の日々」という特集記事を書いてくれた！\n\n` + fx(s, { pop: 6 }));
    }
    if (P.friend.aff >= 70 && p.age >= 25 && once(s, 'friend_wedding')) {
      lifeScene(s, 'friend_wedding', '親友の結婚', `親友の${P.friend.name}から電話があった。「俺、結婚するんだ！ それで…友人代表のスピーチ、お前に頼みたい」`);
    }
    if (p.age >= 27 && p.money >= 1500 && !s.story.friend_loan && G.chance(0.01)) {
      s.story.friend_loan = true;
      lifeScene(s, 'friend_loan', '親友の頼み', `${P.friend.name}「…言いにくいんだけど、店の経営が苦しくて。500万円、貸してもらえないか」`);
    }
    if (s.story.loanOut && G.absWeek(s) >= s.story.loanOut) {
      s.story.loanOut = null;
      if (G.chance(0.6)) scene(s, '恩返し', `${P.friend.name}「店、持ち直したよ！ 本当にありがとう」\n借りたお金に利子をつけて返してくれた。\n\n` + fx(s, { money: 600, aff: { friend: 10 }, happy: 6 }));
      else scene(s, '親友の店', `${P.friend.name}の店は、残念ながら閉店してしまったらしい。\n「本当にすまない…いつか必ず返す」\n\n` + fx(s, { aff: { friend: 10 }, happy: -3 }));
    }
    if (p.age >= 28 && !s.story.parents_sick && G.chance(0.008)) {
      s.story.parents_sick = true;
      lifeScene(s, 'parents_sick', '父の入院', '実家の母から電話。「お父さんが倒れて入院したの…」');
    }
    if (P.parents.aff >= 80 && p.money >= 3000 && once(s, 'parents_reform')) {
      lifeScene(s, 'parents_reform', '親孝行', '実家の両親に、何か恩返しがしたい。古くなった実家をリフォームしてあげようか？（1000万円）');
    }
    const pt = G.partner(s);
    if (pt && pt.stage === 'lover' && G.absWeek(s) - pt.since === 52) {
      scene(s, '記念日', `今日は${pt.name}と付き合って1年の記念日だ。\n「これからもよろしくね」\n\n` + fx(s, { aff: { [pt.id]: 8 }, happy: 4 }));
    }
  };

  // ---------- 年越し ----------
  G.yearlyLife = (s) => {
    const p = s.player;
    const P = s.people;
    for (const k of p.kids) {
      const age = G.kidAge(s, k);
      if (age === 1) scene(s, '初めての言葉', `${k.name}が初めて「パパ」と言った！\n\n` + fx(s, { happy: 8 }));
      if (age === 6) scene(s, '入学式', `${k.name}が小学校に入学した。大きなランドセルを背負った姿に、思わず目頭が熱くなる。\n\n` + fx(s, { happy: 6 }));
      if (age === 7 && k.baseball === null) lifeScene(s, 'kid_baseball', '子供と野球', `${k.name}「パパ、ぼくも野球やってみたい！」`, { name: k.name });
      if (age === 12 && k.baseball) scene(s, '少年野球', `${k.name}が少年野球チームでレギュラーになった！ 週末は試合の応援に行くのが楽しみだ。\n\n` + fx(s, { happy: 6 }));
      if (age === 18 && k.baseball) {
        const pr = G.clamp(0.15 + k.bond * 0.004 + Math.max(0, G.careerTotals(s).war) * 0.003, 0.1, 0.7);
        if (G.chance(pr)) {
          const team = G.pick(G.NPB_TEAMS());
          const round = G.ri(1, 5);
          k.pro = { team: team.id, round, year: s.year };
          s.history.push({ year: s.year, text: `${k.name}が${team.name}からドラフト${round}位指名` });
          scene(s, '親子二代のプロ野球選手', `ドラフト会議で、${k.name}の名前が呼ばれた。\n「第${round}巡選択希望選手 ${team.name}……${k.name}」\n\n${k.name}がプロ野球選手になる！\n「父さんの背中を見て、ここまで来たよ」`, { big: '親子でプロへ' });
          G.addHappy(s, 20);
        } else {
          scene(s, '進路', `${k.name}はドラフトで指名されなかったが、大学で野球を続けてプロを目指すことにした。「4年後、必ず」`);
        }
      }
      if (age === 16 && k.baseball) scene(s, '甲子園を目指して', `${k.name}が野球の強豪高校に進学した。「父さんを超える選手になる」と意気込んでいる。\n\n` + fx(s, { happy: 6 }));
    }
    // ライバルの1年（ドラフト同期のデータがあればそちらで管理）
    const r = P.rival;
    if (!r.retired && !s.draft) {
      const ageF = p.age <= 24 ? 0.6 : p.age <= 32 ? 1 : 0.5;
      const war = Math.max(-0.5, G.gauss(2.2, 1.8) * ageF);
      r.war = Math.round((r.war + war) * 10) / 10;
      if (war >= 5 && G.chance(0.6)) r.best = `${s.year - 1}年 ${G.pick(G.isPitcher(p) ? ['最多勝', '最多奪三振', '最優秀防御率'] : ['首位打者', '本塁打王', '打点王', '盗塁王'])}`;
      if (p.age >= 36 && G.chance(0.35)) {
        r.retired = true;
        scene(s, 'ライバルの引退', `同期のライバル・${r.name}が現役引退を発表した。\n「お前がいたから、ここまでやってこれた。ありがとな」\n\n` + fx(s, { exp: { mind: 20 }, happy: -3 }));
        s.history.push({ year: s.year, text: `ライバル${r.name}が引退` });
      }
    }
    if (p.yearsPro === 2 && !P.kohai.met) {
      P.kohai.met = true;
      scene(s, '後輩入団', `新人の${P.kohai.name}が入団してきた。\n「${p.name}さんに憧れてプロに入りました！ よろしくお願いします！」`);
    }
    if (p.yearsPro === 6 && !P.senpai.retired) {
      P.senpai.retired = true;
      P.senpai.role = '元先輩（今はコーチ）';
      scene(s, '先輩の引退', `${P.senpai.name}先輩が現役を引退し、コーチとしてチームに残ることになった。\n「あとは頼んだぞ」\n\n` + fx(s, { exp: { mind: 15 }, aff: { senpai: 5 } }));
      s.history.push({ year: s.year, text: `${P.senpai.name}先輩が引退` });
    }
    if (p.home === 'dorm' && p.age >= 24) {
      scene(s, '寮生活', '寮では最年長組になってきた。そろそろ一人暮らしを考えてもいい頃かもしれない。（「人生」タブで引っ越しできる）');
    }
  };

  // ---------- 住まい ----------
  G.moveHome = (s, id) => {
    const p = s.player;
    const h = G.homeById(id);
    if (!h || p.home === id) return false;
    if (id === 'dorm' && (G.spouse(s) || p.age >= 28)) return false;
    if (p.money < h.price) return false;
    p.money -= h.price;
    p.home = id;
    s.history.push({ year: s.year, text: `${h.name}に引っ越し` });
    G.addHappy(s, 6);
    return true;
  };

  // ---------- 選択肢つきの私生活シーン ----------
  G.LIFE_SCENES = {
    choose_hobby: {
      choices: () => G.HOBBIES.map((h) => ({
        label: `${h.name}（${h.desc}）`,
        run: (s) => {
          s.player.hobby = h.id;
          s.player.hobbyLv = 1;
          s.history.push({ year: s.year, text: `趣味で${h.name}を始める` });
          return `${h.name}を始めることにした！ これから少しずつ上達していこう。` + fx(s, { happy: 5 });
        },
      })),
    },
    meet_heroine: {
      choices: (s, q) => {
        const h = s.people[q.data.hid];
        return [
          { label: '話しかけてみる', run: (s2) => { h.met = true; h.stage = 'met'; return `${h.name}さんと連絡先を交換した！` + fx(s2, { aff: { [h.id]: 15 }, happy: 3 }); } },
          { label: '会釈だけしておく', run: (s2) => { h.met = true; h.stage = 'met'; return `${h.name}さんと顔見知りになった。` + fx(s2, { aff: { [h.id]: 5 } }); } },
        ];
      },
    },
    cheat: {
      choices: (s, q) => {
        const pt = G.partner(s);
        const h = s.people[q.data.hid];
        return [
          { label: '正直に謝る', run: (s2) => `「…もう二度としないでね」なんとか許してもらえた。` + fx(s2, { aff: { [pt.id]: -15, [h.id]: -10 }, happy: -5 }) },
          { label: 'ただの友達だと言い張る', run: (s2) => (G.chance(0.5) ? '信じてもらえたようだ…。' + fx(s2, { aff: { [pt.id]: -5 } }) : '「嘘つき！」完全に怒らせてしまった。' + fx(s2, { aff: { [pt.id]: -35 }, happy: -10, pop: -2 })) },
        ];
      },
    },
    wedding: {
      choices: (s) => {
        const pt = G.partner(s);
        const marry = (s2, text, f) => {
          pt.stage = 'married';
          pt.marriedYear = s2.year;
          if (s2.player.home === 'dorm') s2.player.home = 'apartment';
          s2.history.push({ year: s2.year, text: `${pt.name}と結婚` });
          G.buzz(s2, 'wedding');
          return text + fx(s2, f);
        };
        return [
          { label: '盛大な披露宴（1500万円）', run: (s2) => marry(s2, `チームメイトや芸能人も駆けつける盛大な披露宴になった！ スポーツ紙の一面を飾った。`, { money: -1500, pop: 6, happy: 20, aff: { [pt.id]: 20 } }) },
          { label: '家族だけの温かい式（200万円）', run: (s2) => marry(s2, `家族だけの小さな式。両親の涙に、こちらまで泣いてしまった。`, { money: -200, happy: 18, aff: { [pt.id]: 15, parents: 10 } }) },
          { label: '海外挙式（600万円）', run: (s2) => marry(s2, `南の島の教会で、ふたりだけの式を挙げた。一生忘れない景色だ。`, { money: -600, happy: 20, aff: { [pt.id]: 25 } }) },
        ];
      },
    },
    birth: {
      choices: () => [
        {
          label: 'この名前にする',
          run: (s, q, input) => {
            const name = (input || '').trim().slice(0, 8) || q.input;
            s.player.kids.push({ name, born: s.year, bond: 60, baseball: null });
            s.history.push({ year: s.year, text: `第${s.player.kids.length}子「${name}」誕生` });
            G.buzz(s, 'baby');
            return `「${name}」と名付けた。この子のためにも、もっと頑張らなきゃ！` + fx(s, { happy: 20, cond: 2, exp: { mind: 25 } });
          },
        },
      ],
    },
    kid_baseball: {
      choices: (s, q) => {
        const k = s.player.kids.find((x) => x.name === q.data.name);
        return [
          { label: 'よし、パパが教えてやる！', run: (s2) => { k.baseball = true; k.bond = G.clamp(k.bond + 15, 0, 100); return `${k.name}と毎朝キャッチボールをする約束をした。` + fx(s2, { happy: 8 }); } },
          { label: '好きなことをやればいいよ', run: (s2) => { k.baseball = false; k.bond = G.clamp(k.bond + 5, 0, 100); return `${k.name}は${G.pick(['サッカー', 'ピアノ', '水泳', '絵画'])}にも興味があるらしい。のびのび育ってほしい。` + fx(s2, { happy: 4 }); } },
        ];
      },
    },
    rival_promise: {
      choices: (s) => [
        { label: '受けて立つ！', run: (s2) => `「負けたら焼肉おごりな！」がっちり握手を交わした。` + fx(s2, { aff: { rival: 10 }, exp: { mind: 15 } }) },
        { label: 'タイトルより大事なものがある', run: (s2) => `「…お前らしいな」${s.people.rival.name}は少し笑った。` + fx(s2, { aff: { rival: 5 }, happy: 4 }) },
      ],
    },
    kohai_worry: {
      choices: (s) => {
        const k = s.people.kohai;
        return [
          { label: '「甘えるな。練習あるのみだ」', run: (s2) => `${k.name}は唇をかみしめてうなずいた。` + fx(s2, { aff: { kohai: 5 }, exp: { mind: 10 } }) },
          { label: '「焦らなくていい。俺もそうだった」', run: (s2) => `${k.name}の目に涙が浮かんだ。「ありがとうございます…！」` + fx(s2, { aff: { kohai: 12 }, happy: 4 }) },
          { label: '「一緒に特訓しよう」', run: (s2) => `夜遅くまで${k.name}の練習に付き合った。` + fx(s2, { aff: { kohai: 10 }, exp: G.isPitcher(s2.player) ? { technique: 10, breaking: 6 } : { technique: 10, muscle: 6 }, stamina: -12 }) },
        ];
      },
    },
    friend_wedding: {
      choices: () => [
        { label: '喜んで引き受ける', run: (s) => '心を込めたスピーチに、会場中が涙した。' + fx(s, { aff: { friend: 12 }, happy: 8, stamina: -10 }) },
        { label: 'シーズン中で忙しいと断る', run: (s) => '「…そうか。忙しいもんな」電話の声が少し寂しそうだった。' + fx(s, { aff: { friend: -15 }, happy: -3 }) },
      ],
    },
    friend_loan: {
      choices: () => [
        { label: '500万円を貸す', run: (s) => { s.story.loanOut = G.absWeek(s) + G.ri(40, 90); return '「恩に着る…！」親友の力になれた。' + fx(s, { money: -500, aff: { friend: 15 } }); } },
        { label: '断る', run: (s) => '「…そうだよな。無理言ってごめん」' + fx(s, { aff: { friend: -20 }, happy: -4 }) },
      ],
    },
    parents_sick: {
      choices: () => [
        { label: 'すぐに駆けつける', run: (s) => '練習を休んで病院へ向かった。父は「試合を優先しろと言ったろう」と怒りながらも、うれしそうだった。' + fx(s, { aff: { parents: 15 }, happy: 4, trust: -4, stamina: -10 }) },
        { label: '試合で結果を出して恩返しする', run: (s) => '電話で励まし、プレーに集中した。病室のテレビで見ていてくれるはずだ。' + fx(s, { aff: { parents: -5 }, happy: -6, exp: { mind: 20 } }) },
      ],
    },
    parents_reform: {
      choices: () => [
        { label: 'リフォームをプレゼントする', run: (s) => { s.history.push({ year: s.year, text: '実家をリフォームして親孝行' }); return '新しくなった実家で、両親が涙を流して喜んでくれた。' + fx(s, { money: -1000, aff: { parents: 15 }, happy: 12 }); } },
        { label: '今はやめておく', run: (s) => 'またの機会にしよう。' },
      ],
    },
    quarrel: {
      choices: (s) => {
        const sp = G.spouse(s);
        return [
          { label: '素直に謝って話し合う', run: (s2) => `朝まで話し合い、${sp.name}の本音を聞くことができた。` + fx(s2, { aff: { [sp.id]: 20 }, happy: 3, stamina: -8 }) },
          { label: '野球で疲れていると言い返す', run: (s2) => '家の空気が重い…。' + fx(s2, { aff: { [sp.id]: -15 }, happy: -8, cond: -1 }) },
        ];
      },
    },
    sns_fire: {
      choices: () => [
        { label: 'すぐに謝罪する', run: (s) => '誠実な謝罪で、騒ぎはすぐに収まった。' + fx(s, { pop: -2, happy: -3 }) },
        { label: '真意を説明する', run: (s) => (G.chance(0.5) ? 'ファンが擁護してくれて、むしろ好感度が上がった！' + fx(s, { pop: 3 }) : (G.buzz(s, 'fire'), '火に油を注いでしまった…。' + fx(s, { pop: -8, trust: -5, happy: -8 }))) },
        { label: 'しばらくSNSを休む', run: (s) => 'スマホを置いて野球に集中した。' + fx(s, { pop: -1, exp: { mind: 8 } }) },
      ],
    },
    second_career: {
      choices: (s) => {
        const war = G.careerTotals(s).war;
        return G.SECOND_CAREERS.filter((c) => c.req(s, war)).map((c) => ({
          label: c.name,
          run: (s2) => {
            s2.secondCareer = c.id;
            s2.queue.unshift({ kind: 'life', id: 'continue_choice', title: 'これからの人生', text: `「${c.name}」——それが、次の夢だ。\n\nこの先の人生も、自分の手で歩んでみる？`, data: {} });
            return null;
          },
        }));
      },
    },
  };

  G.lifeChoices = (s, q) => G.LIFE_SCENES[q.id].choices(s, q);

  // ---------- 人生の総合評価 ----------
  G.lifeScore = (s) => {
    const p = s.player;
    const avgHappy = s.happyWeeks ? s.happySum / s.happyWeeks : p.happy;
    const war = G.careerTotals(s).war;
    const close = Object.values(s.people).filter((x) => x.group !== 'love' && x.met && x.aff >= 70).length;
    let score = avgHappy * 0.45;
    if (G.spouse(s)) score += 12;
    score += Math.min(3, p.kids.length) * 4;
    score += Math.min(10, close * 2);
    score += Math.min(25, Math.max(0, war) * 0.5);
    if (p.money >= 10000) score += 3;
    score = Math.round(Math.min(100, score));
    let label;
    if (score >= 80) label = '最高の人生';
    else if (score >= 65) label = '充実した人生';
    else if (score >= 50) label = '悔いのない人生';
    else if (score >= 35) label = '波乱万丈の人生';
    else label = 'ほろ苦い人生';
    return { score, label, avgHappy: Math.round(avgHappy) };
  };
})();
