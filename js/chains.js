// 人間関係の「つながり」（イベントの連鎖と長期的な分岐）
// 親密度や過去の選択がフラグとして残り、次の出来事・引退後の人生へとつながっていく
(function () {
  const G = window.G;
  const ch = (s) => (s.chain = s.chain || {});
  const aff = (s, id) => (s.people[id] ? s.people[id].aff : 0);
  const done = (s, id) => !!ch(s)[id];
  const flag = (s, id) => {
    if (!ch(s)[id]) ch(s)[id] = s.year;
  };
  const offSeason = (s) => ['off', 'jan'].includes(G.phaseOf(s.week, s.year).id);
  const active = (s) => !s.retired && !s.after;

  // 表示用の定義：steps は順番に進む。done(s) が真なら達成、hint は次に何をすればよいかのヒント
  G.CHAINS = {
    senpai: [
      { id: 'senpai_invite', name: '自主トレへの誘い', hint: '先輩との仲45以上でオフを迎える' },
      { id: 'senpai_secret', name: '秘伝の伝授', hint: '合同自主トレを3回以上・仲55以上', check: (s) => !!s.story.jt_senpai_taught },
      { id: 'senpai_coach', name: '先輩がコーチに', hint: '先輩が引退する（プロ7年目ごろ）', check: (s) => !!s.people.senpai.retired },
      { id: 'senpai_manager', name: '先輩が監督に就任', hint: '先輩がコーチになって5年後・仲60以上' },
      { id: 'senpai_call', name: '監督からのラブコール', hint: '引退時に先輩監督との仲70以上 → 指導者の道へ（ヘッドコーチから）' },
    ],
    rival: [
      { id: 'rival_promise', name: 'タイトル勝負の約束', hint: 'ライバルとの仲50以上', check: (s) => !!s.story.rival_promise },
      { id: 'rival_invite', name: 'ライバルからの誘い', hint: 'ライバルとの仲45以上でオフを迎える' },
      { id: 'rival_teach', name: '得意技の伝授', hint: '合同自主トレを3回以上・仲55以上', check: (s) => !!s.story.jt_rival_taught },
      { id: 'rival_duel', name: '同期対決の決着', hint: 'ライバルが同じリーグの主力で、タイトルを争う', check: (s) => !!(s.story.raceWon || s.story.raceLost) },
      { id: 'rival_academy', name: 'ふたりの夢', hint: 'ふたりとも引退したとき仲65以上 → 野球アカデミーの道が開ける' },
    ],
    kohai: [
      { id: 'kohai_worry', name: '後輩の悩み', hint: '後輩との仲60以上', check: (s) => !!s.story.kohai_worry },
      { id: 'kohai_invite', name: '後輩の頼み', hint: '後輩との仲50以上でオフを迎える' },
      { id: 'kohai_grow', name: '後輩の成長', hint: '後輩と合同自主トレを3回', check: (s) => !!s.story.jt_kohai_grow },
      { id: 'kohai_star', name: '後輩のタイトル獲得', hint: '後輩が頭角を現して3年後・仲60以上' },
      { id: 'kohai_staff', name: '教え子との再会', hint: '引退後に指導者になる' },
    ],
    coach: [
      { id: 'coach_push', name: '首脳陣への推薦', hint: 'コーチとの仲50以上', check: (s) => !!s.story.coach_push },
      { id: 'coach_secret', name: 'マンツーマン指導', hint: 'コーチとの仲80以上', check: (s) => !!s.story.coach_secret },
      { id: 'coach_recommend', name: 'コーチの推薦状', hint: '引退時にコーチとの仲80以上 → 指導者の道で有利に' },
    ],
    friend: [
      { id: 'friend_dream', name: '親友の夢', hint: '親友との仲55以上・24歳以上' },
      { id: 'friend_partner', name: '共同出資', hint: '夢を応援し、27歳以上・所持金3000万円以上・仲60以上' },
      { id: 'friend_business', name: '親友と共同経営', hint: '引退後に飲食店を開く（所持金がなくても選べる）' },
    ],
    reporter: [
      { id: 'reporter_feature', name: '特集記事', hint: '記者との仲50以上', check: (s) => !!s.story.reporter_feature },
      { id: 'reporter_column', name: 'コラム連載', hint: '記者との仲70以上・人気30以上' },
      { id: 'reporter_tv', name: '解説者への近道', hint: '引退後に解説者になる（人気がなくても選べる）' },
    ],
  };

  G.chainState = (s, who) => {
    const list = G.CHAINS[who] || [];
    return list.map((st) => {
      const ok = st.check ? st.check(s) : done(s, st.id);
      if (ok && st.check) flag(s, st.id);
      return { ...st, ok, year: ch(s)[st.id] };
    });
  };

  // ---------- 自主トレは誘われてから ----------
  const origCan = G.canJointTrain;
  G.canJointTrain = (s, who) => {
    const r = origCan(s, who);
    if (r) return r;
    if (s.story[`jt_${who}`]) return ''; // 以前のセーブで一緒にやったことがあれば
    if (!done(s, `${who}_invite`)) return who === 'senpai' ? '先輩から誘われると解禁' : who === 'rival' ? 'ライバルから誘われると解禁' : '後輩から頼まれると解禁';
    return '';
  };

  const lifeScene = (s, id, title, text, data = {}) => s.queue.push({ kind: 'life', id, title, text, data });

  // ---------- 毎週の判定 ----------
  const origStories = G.checkStories;
  G.checkStories = (s) => {
    origStories(s);
    for (const who in G.CHAINS) G.chainState(s, who); // すでに起きた出来事をつながりとして記録
    const p = s.player;
    const P = s.people;
    const busy = s.queue.some((q) => q.kind !== 'info');
    if (busy) return;
    const yr = s.year;
    // 自主トレの誘い（オフ）
    if (active(s) && offSeason(s)) {
      for (const [who, need] of [['senpai', 45], ['rival', 45], ['kohai', 50]]) {
        const x = P[who];
        if (!x || !x.met || done(s, `${who}_invite`) || s.story[`invite_no_${who}`] === yr || aff(s, who) < need) continue;
        if (who === 'rival' && x.retired) continue;
        s.story[`invite_no_${who}`] = yr;
        const text = {
          senpai: `${x.name}${x.retired ? 'コーチ' : '先輩'}から電話があった。\n「今年の自主トレ、うちのグループに来ないか？ グアムで一緒に追い込もう」`,
          rival: `同期のライバル・${x.name}から連絡が来た。\n「…今年のオフ、一緒に自主トレしないか。お前と競い合ったほうが伸びる気がするんだ」`,
          kohai: `後輩の${x.name}が、思いつめた顔でやってきた。\n「${p.name.split(' ')[0]}さん、今年の自主トレに連れて行ってください！ 何でもします！」`,
        }[who];
        lifeScene(s, 'chain_invite', '自主トレの誘い', text, { who });
        return;
      }
    }
    // 先輩が監督に
    if (P.senpai.retired) flag(s, 'senpai_coach');
    if (done(s, 'senpai_coach') && !done(s, 'senpai_manager') && yr - ch(s).senpai_coach >= 5 && aff(s, 'senpai') >= 60) {
      flag(s, 'senpai_manager');
      s.history.push({ year: yr, text: `${P.senpai.name}元先輩が監督に就任` });
      G.scene(s, '先輩が監督に', `${P.senpai.name}元先輩が、ついに監督に就任した！\n就任会見で「チームの中心は${p.name.split(' ')[0]}だ」と名前を挙げてくれた。\n\n` + G.applyFx(s, { trust: active(s) ? 6 : 0, aff: { senpai: 5 }, happy: 4 }), { big: '先輩が監督に' });
      return;
    }
    // 後輩の成長 → タイトル
    if (s.story.jt_kohai_grow) flag(s, 'kohai_grow');
    if (done(s, 'kohai_grow') && !done(s, 'kohai_star') && yr - ch(s).kohai_grow >= 3 && aff(s, 'kohai') >= 60 && G.chance(0.05)) {
      flag(s, 'kohai_star');
      const t = G.pick(['首位打者', '最多勝', '最多セーブ', '盗塁王', '新人王']);
      s.history.push({ year: yr, text: `後輩の${P.kohai.name}が${t}を獲得` });
      G.scene(s, '後輩のタイトル', `後輩の${P.kohai.name}が${t}を獲得した！\n表彰式のスピーチで「自主トレに連れて行ってくれた${p.name.split(' ')[0]}さんのおかげです」と涙ながらに語った。\n\n` + G.applyFx(s, { happy: 8, aff: { kohai: 8 }, pop: 1 }));
      return;
    }
    // 親友の夢 → 共同出資
    if (!done(s, 'friend_dream') && !s.story.friend_dream_no && aff(s, 'friend') >= 55 && p.age >= 24 && G.chance(0.04)) {
      lifeScene(s, 'chain_friend_dream', '親友の夢', `地元の親友・${P.friend.name}と電話で話していると、ふと夢を打ち明けられた。\n「俺さ、いつか地元で自分の店を出したいんだ。お前の名前を出さなくても、うまいって言われる店を」`);
      return;
    }
    if (done(s, 'friend_dream') && !done(s, 'friend_partner') && !s.story.friend_partner_no && p.age >= 27 && p.money >= 3000 && aff(s, 'friend') >= 60 && G.chance(0.05)) {
      lifeScene(s, 'chain_friend_partner', '共同出資', `${P.friend.name}から真剣な声で電話があった。\n「いい物件が見つかったんだ。…もしよければ、共同出資者になってくれないか。2000万円。お前と一緒にやりたいんだ」`);
      return;
    }
    // 記者のコラム連載
    if (P.reporter.met && !done(s, 'reporter_column') && !s.story.reporter_column_no && aff(s, 'reporter') >= 70 && p.popularity >= 30 && G.chance(0.05)) {
      lifeScene(s, 'chain_column', 'コラム連載の依頼', `担当記者の${P.reporter.name}さんから相談された。\n「うちの新聞で、${p.name.split(' ')[0]}さんの連載コラムを始めませんか？ 野球のこと、日々のこと、自由に書いてほしいんです」`);
    }
  };

  // 親友の店の配当（毎年）・コラムの反響
  const origYearly = G.yearlyLife;
  G.yearlyLife = (s) => {
    origYearly(s);
    if (done(s, 'friend_partner')) {
      const d = G.ri(100, 400);
      s.player.money += d;
      G.scene(s, '親友の店', `${s.people.friend.name}の店は今年も繁盛している。\n共同出資者として、${G.fmtMoney(d)}の配当を受け取った。「次は2号店だな！」`);
    }
    if (done(s, 'reporter_column')) s.player.popularity = G.clamp(s.player.popularity + 1, 0, 100);
  };

  // ---------- 選択つきの場面 ----------
  Object.assign(G.LIFE_SCENES, {
    chain_invite: {
      choices: (s, q) => {
        const who = q.data.who;
        const x = s.people[who];
        return [
          { label: who === 'kohai' ? '「よし、ついて来い！」' : 'ぜひお願いします！', run: (s2) => { flag(s2, `${who}_invite`); s2.history.push({ year: s2.year, text: `${x.name}と合同自主トレの約束` }); return `${x.name}と、オフに合同自主トレをすることになった。\n（オフの過ごし方「球場・ジム」で一緒に自主トレできるようになった）` + G.applyFx(s2, { aff: { [who]: 5 } }); } },
          { label: '今年は一人でやります', run: (s2) => `「そうか、わかった」\n…また誘ってもらえるといいのだが。` + G.applyFx(s2, { aff: { [who]: -3 } }) },
        ];
      },
    },
    chain_friend_dream: {
      choices: (s) => [
        { label: '「いい夢じゃん。絶対応援する」', run: (s2) => { flag(s2, 'friend_dream'); return `「…ありがとな。お前にそう言ってもらえると、本気になれる」` + G.applyFx(s2, { aff: { friend: 8 }, happy: 3 }); } },
        { label: '「飲食店は甘くないぞ」', run: (s2) => { s2.story.friend_dream_no = true; return `「…だよな。わかってるよ」電話の向こうの声が、少し小さくなった。` + G.applyFx(s2, { aff: { friend: -6 } }); } },
      ],
    },
    chain_friend_partner: {
      choices: (s) => [
        { label: '共同出資者になる（2000万円）', run: (s2) => { flag(s2, 'friend_partner'); s2.history.push({ year: s2.year, text: `親友・${s2.people.friend.name}の店に共同出資` }); return `「本当か！ 絶対に成功させる！」\n地元に、ふたりの店ができた。（毎年、配当が入る）` + G.applyFx(s2, { money: -2000, aff: { friend: 15 }, happy: 6 }); } },
        { label: '今は野球に集中したい', run: (s2) => { s2.story.friend_partner_no = true; return `「そうだよな、お前は今が大事な時期だもんな」` + G.applyFx(s2, { aff: { friend: -4 } }); } },
      ],
    },
    chain_column: {
      choices: (s) => [
        { label: '連載を引き受ける', run: (s2) => { flag(s2, 'reporter_column'); s2.history.push({ year: s2.year, text: 'スポーツ紙でコラムの連載を開始' }); return `コラム「${s2.player.name.split(' ')[0]}の目」の連載が始まった。素直な言葉が、ファンの間で評判になっている。（毎年、人気が少し上がる）` + G.applyFx(s2, { pop: 3, aff: { reporter: 8 }, exp: { mind: 10 } }); } },
        { label: '野球に集中したいので断る', run: (s2) => { s2.story.reporter_column_no = true; return '「そうですか…。気が変わったら、いつでも」' + G.applyFx(s2, { aff: { reporter: -4 } }); } },
      ],
    },
    chain_academy: {
      choices: (s) => [
        { label: '「やろう、ふたりで」', run: (s2) => { flag(s2, 'rival_academy'); const p = s2.player; p.invest = p.invest || {}; p.invest.academy = Math.max(p.invest.academy || 0, 2); s2.story.academyStart = s2.story.academyStart || s2.year; s2.history.push({ year: s2.year, text: `同期の${s2.people.rival.name}と野球アカデミーを共同設立` }); return `ふたりで野球アカデミーを立ち上げることになった。\n（第二の人生で「野球アカデミーの理事長」を選べるようになった）` + G.applyFx(s2, { aff: { rival: 10 }, happy: 8 }); } },
        { label: '「俺には別の道がある」', run: (s2) => `「…そうか。お前らしいな」` + G.applyFx(s2, { aff: { rival: -3 } }) },
      ],
    },
  });

  // ---------- 引退のとき：ライバルとの夢 ----------
  const origRetire = G.retire;
  G.retire = (s, reason) => {
    origRetire(s, reason);
    const r = s.people.rival;
    if (!done(s, 'rival_academy') && aff(s, 'rival') >= 65) {
      const idx = s.queue.findIndex((q) => q.id === 'second_career');
      const scene = {
        kind: 'life',
        id: 'chain_academy',
        title: 'ふたりの夢',
        data: {},
        text: `${r.retired ? '先にユニフォームを脱いでいた' : 'まだ現役の'}同期のライバル・${r.name}から連絡が来た。\n「引退、お疲れさん。…なあ、${r.retired ? '' : 'いつか俺も引退したら、'}一緒に子どもたちのための野球アカデミーを作らないか。お前とならできる気がするんだ」`,
      };
      if (idx >= 0) s.queue.splice(idx, 0, scene);
    }
  };

  // ---------- 第二の人生への影響 ----------
  const careerById = (id) => G.SECOND_CAREERS.find((c) => c.id === id);
  const patch = (id, extra) => {
    const c = careerById(id);
    if (!c) return;
    const orig = c.req;
    c.req = (s, war) => orig(s, war) || extra(s);
  };
  patch('coach', (s) => done(s, 'senpai_manager') && aff(s, 'senpai') >= 70);
  patch('business', (s) => done(s, 'friend_partner'));
  patch('commentator', (s) => done(s, 'reporter_column'));

  const origStart = G.startAfterLife;
  G.startAfterLife = (s, careerId) => {
    origStart(s, careerId);
    const a = s.after;
    if (!a) return;
    const P = s.people;
    const def = G.AFTER_CAREERS[careerId];
    const lines = [];
    if (careerId === 'coach') {
      if (done(s, 'senpai_manager') && aff(s, 'senpai') >= 70) {
        flag(s, 'senpai_call');
        a.level = Math.max(a.level, 1);
        a.xp = Math.max(a.xp, def.need[1]);
        lines.push(`${P.senpai.name}監督「お前の力が必要だ。ヘッドコーチとして、俺の右腕になってくれ」\n——先輩監督の誘いで、いきなりヘッドコーチに就任した。`);
      } else if (aff(s, 'coach') >= 80) {
        flag(s, 'coach_recommend');
        a.xp = Math.max(a.xp, Math.round(def.need[1] * 0.7));
        lines.push(`${P.coach.name}が球団に推薦状を書いてくれていた。「あいつは良い指導者になる」`);
      }
      if (done(s, 'kohai_star')) {
        flag(s, 'kohai_staff');
        const tid = s.player.teamId;
        s.teamStr[tid] = Math.min(66, s.teamStr[tid] + 2);
        lines.push(`チームの主力になった後輩の${P.kohai.name}が、「今度はコーチとして鍛えてください！」と笑顔で迎えてくれた。`);
      }
    }
    if (careerId === 'business' && done(s, 'friend_partner')) {
      flag(s, 'friend_business');
      a.data.shops = Math.max(a.data.shops || 1, 2);
      a.data.rep = Math.max(a.data.rep || 40, 60);
      a.level = Math.max(a.level, 1);
      lines.push(`親友の${P.friend.name}と共同経営で、繁盛店の2号店からスタートすることになった。「やっと一緒に働けるな！」`);
    }
    if (careerId === 'commentator' && done(s, 'reporter_column')) {
      flag(s, 'reporter_tv');
      a.level = Math.max(a.level, 1);
      a.xp = Math.max(a.xp, def.need[1]);
      lines.push(`長年続けたコラムの評判で、引退直後からテレビ局の解説者として引っ張りだこになった。`);
    }
    if (careerId === 'academy' && done(s, 'rival_academy')) {
      a.xp += 300;
      lines.push(`同期の${P.rival.name}と共同で立ち上げたアカデミー。ふたりの名前に惹かれて、たくさんの子どもたちが集まった。`);
    }
    if (lines.length) G.scene(s, 'つながりが生んだ縁', lines.join('\n\n'), { big: '縁' });
  };
})();
