// SNSのエゴサーチ（ファンの投稿から自分の評判を知る）
(function () {
  const G = window.G;

  // 話題になった出来事を記録（エゴサの投稿の元になる）
  G.buzz = (s, type, data = {}) => {
    if (!s.buzzLog) s.buzzLog = [];
    s.buzzLog.push({ w: G.absWeek(s), type, ...data });
    if (s.buzzLog.length > 60) s.buzzLog.splice(0, s.buzzLog.length - 60);
  };

  // 同じ週なら同じ投稿が出るように、週ごとに固定した乱数を使う
  const seeded = (seed) => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const hash = (str) => [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

  const HANDLE_A = ['tora', 'yakyu', 'kantoku', 'gaiya', 'naiya', 'stand', 'ouen', 'kaze', 'homerun', 'beer', 'umaibo', 'nagoya', 'osaka', 'mikan', 'sora', 'kumo'];
  const HANDLE_B = ['_love', '_fan', '_daisuki', '_mania', '_98', '_2010', '_hokkori', '_kansen', '_life', '_jp'];
  const NAME_A = ['外野席の', '内野の', 'テレビ観戦の', '球場通いの', '万年', '昭和からの', 'にわか', 'ベテラン', '週末だけの', '地元の'];
  const NAME_B = ['ファン', 'おじさん', '主婦', '学生', '野球好き', '応援団', 'OL', '少年', '解説者気取り', '野球バカ'];

  G.egoSearch = (s) => {
    const p = s.player;
    const rnd = seeded(hash(`${p.name}-${s.year}-${s.week}`));
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const fam = p.name.split(' ')[0];
    const team = G.teamById(p.teamId);
    const mlb = p.league === 'mlb';
    const posts = [];
    const add = (sent, weight, ...texts) => posts.push({ sent, weight, text: pick(texts) });
    const u = p.usage || { form: [] };
    const pitcher = G.isPitcher(p);
    const nowW = G.absWeek(s);
    const recentBuzz = (s.buzzLog || []).filter((b) => nowW - b.w <= 5);

    // 直近の成績
    if (!s.retired && p.squad === 'first') {
      if (!pitcher) {
        const f = u.form.slice(-10).reduce((a, x) => G.addStats(a, x), G.emptyBat());
        if (f.pa >= 15) {
          const ops = G.batDerived(f).ops;
          const avg = G.fmtRate(f.h, f.ab);
          if (ops >= 0.9) {
            add(1, 3, `${fam}最近マジで打ちすぎ。完全に覚醒したな`, `今日も${fam}が打った！今の${team.short}は${fam}のチーム`, `${fam}、直近10試合で打率${avg}はえぐい`, `${fam}が打席に立つと何か起こりそうな雰囲気ある`);
            add(1, 2, `${fam}のバッティング、見てて気持ちいい`, `${fam}の応援歌、球場で歌うの楽しみすぎる`);
          } else if (ops < 0.55) {
            add(-1, 3, `${fam}また凡退…見てられない`, `直近10試合で打率${avg}はさすがに厳しい`, `${fam}、そろそろ下で調整した方がいいのでは`, `なんで${fam}を使い続けるの？監督`);
            add(0, 1, `${fam}、今は苦しいけど信じて待つ`, `${fam}も悩んでるんだろうな。頑張れ`);
          } else add(0, 1, `${fam}、可もなく不可もなくって感じ`, `${fam}はもう一皮むけてほしい`);
        }
        const fd = u.form.slice(-10).reduce((a, x) => a + (x.fe || 0), 0);
        const fine = u.form.slice(-10).reduce((a, x) => a + (x.ffine || 0), 0);
        if (fd >= 2) add(-1, 3, `${fam}またエラーかよ…守備がザルすぎる`, `${fam}の守備、見ててヒヤヒヤする`, `打つ方はいいけど${fam}の守備は二軍レベル`);
        if (fine >= 1) add(1, 3, `${fam}の守備えぐい。今日のファインプレーで鳥肌立った`, `${fam}のところに飛べば安心感がある`, `今日の${fam}の好守備、あれで流れが変わった`);
        if (u.status === 'starter' && u.slot === 4) add(0, 2, `4番${fam}、重圧に負けるな！`, `${fam}が4番か…時代が変わったな`);
        if (u.status === 'bench') add(-1, 2, `${fam}スタメン落ちか…`, `今日も${fam}ベンチスタート。悔しいだろうな`);
      } else {
        const f = u.form.slice(-8).reduce((a, x) => G.addStats(a, x), G.emptyPit());
        if (f.outs >= 9) {
          const era = (f.er * 27) / f.outs;
          if (era <= 1.8) add(1, 3, `${fam}、最近の投球が完璧すぎる`, `${fam}が投げると負ける気がしない`, `${fam}の${pick(['直球', 'フォーク', 'スライダー'])}、打てる気がしない`);
          else if (era >= 6) add(-1, 3, `${fam}また炎上…もう見てられない`, `${fam}を出した時点で負け確定`, `${fam}、配置転換した方がいい`);
        }
        if (p.role === 'CL') add(0, 1, `9回に${fam}が出てくる安心感（たまに不安）`);
      }
      // 今季の成績・タイトル争い
      const L = s.leaders;
      if (!pitcher && L && s.stats.bat.pa >= 150) {
        const st = s.stats.bat;
        const qualified = st.pa >= 3.1 * Math.max(1, G.teamGamesPlayed(s)) * 0.95;
        if (qualified && st.ab && st.h / st.ab >= L.avg.final - 0.01) add(1, 2, `${fam}、首位打者あるぞこれ`, `今年の${fam}は本物。打率${G.fmtRate(st.h, st.ab)}`);
        if (st.hr >= 20) add(1, 2, `${fam}もう${st.hr}本塁打か！`, `${fam}のホームラン、今年何本いくんだろ`);
      }
      if (pitcher && s.stats.pit.w >= 10) add(1, 2, `${fam}もう${s.stats.pit.w}勝！エースの風格`);
    } else if (!s.retired) {
      add(0, 2, `最近${fam}を見ないけど、二軍で頑張ってるのかな`, `${fam}、ファームで結果出してるらしい。早く上で見たい`, `${fam}の名前、すっかり聞かなくなったな…`);
    } else {
      add(1, 2, `${fam}の現役時代、本当に好きだった`, `${fam}の引退、まだ寂しい`, `今の${fam}も応援してる`);
    }

    // 話題になった出来事
    for (const b of recentBuzz) {
      const today = nowW - b.w <= 0 ? '今日の' : nowW - b.w === 1 ? 'この前の' : '少し前の';
      const t = {
        promote: () => add(1, 3, `${fam}昇格きた！待ってた！`, `${fam}一軍！今日から球場行くわ`),
        demote: () => add(-1, 3, `${fam}抹消か…下で頑張れ`, `${fam}、今の状態じゃ仕方ない`, `${fam}を落とすのは早すぎない？`),
        bench: () => add(-1, 2, `${fam}スタメン外れたか。悔しさを力に`),
        title: () => add(1, 4, `${fam}${b.name}おめでとう！！`, `${b.name}の${fam}、ほんとに誇らしい`),
        allstar: () => add(1, 3, `オールスターの${fam}、かっこよかった！`),
        wedding: () => {
          add(1, 4, `${fam}結婚おめでとう！！末永くお幸せに`, `${fam}の結婚報道で今日いちばん元気出た`);
          add(-1, 1, `${fam}ロス…立ち直れない`);
        },
        baby: () => add(1, 3, `${fam}パパになったのか！おめでとう`, `${fam}の子供が野球始める日が楽しみ`),
        scandal: () => {
          add(-1, 4, `${fam}夜遊び報道とか…プロ意識ないの？`, `${fam}、この時期に何してんの`, `${fam}の週刊誌の件、がっかりした`);
          add(0, 1, `プライベートくらい好きにさせてあげなよ`);
        },
        fire: () => add(-1, 4, `${fam}のあの投稿はさすがにないわ`, `${fam}、SNSやめた方がいいと思う`),
        cm: () => add(1, 3, `${fam}のCM見た、かっこよすぎ`, `CMの${fam}、笑顔がいい`),
        charity: () => add(1, 3, `${fam}の寄付、人として尊敬する`, `${fam}、野球だけじゃなくて人間性も一流`),
        injury: () => add(0, 3, `${fam}のケガが心配…早く戻ってきて`, `${fam}、無理しないでほしい`),
        raise: () => add(0, 2, `${fam}年俸${G.fmtMoney(b.salary)}か。それだけの活躍はしてる`, `${fam}、年俸上がりすぎでは？`),
        cut: () => add(-1, 2, `${fam}大幅ダウンか。来年が勝負だな`),
        mlb: () => {
          add(1, 4, `${fam}メジャー挑戦！日本から応援してる`, `${fam}がメジャーか…寂しいけど誇らしい`);
          add(1, 2, `${fam} is the real deal. Welcome to the big leagues!`, `Can't wait to see ${fam} at our ballpark!`);
        },
        hotgame: () => add(1, 3, `${today}${fam}、${b.text}は最高だった`, `${fam}の${b.text}、ヒーローインタビューまで最高だった`),
        error: () => add(-1, 3, `${today}試合、${fam}のエラーが痛かった…`, `${today}試合は${fam}の守備に泣かされた`),
        fine: () => add(1, 3, `${today}${fam}のファインプレー、何回でも見られる`, `${today}試合、${fam}の守備で締まった`),
      }[b.type];
      if (t) t();
    }

    // ライバルとの比較
    if (s.people && !s.retired) {
      const r = s.people.rival;
      const me = G.careerTotals(s).war;
      if (r.war > me + 3) add(-1, 1, `同期の${r.name.split(' ')[0]}に完全に置いていかれてるな、${fam}`);
      else if (me > r.war + 3) add(1, 1, `同期の中では${fam}が一番出世したよね`);
    }

    // チームの状況についての投稿
    if (!s.retired && s.week >= G.SEASON_START && s.week <= G.SEASON_END) {
      const rank = G.leagueRanking(s, team.league).findIndex((r) => r.id === p.teamId) + 1;
      if (rank === 1) add(1, 1, `首位の${team.short}、${fam}の存在が大きい`, `今年の${team.short}は優勝あるぞ`);
      else if (rank >= 5) add(-1, 1, `${team.short}弱すぎ…${fam}一人じゃどうにもならん`, `${rank}位か…今年の${team.short}は厳しい`);
      else add(0, 1, `${team.short}、${rank}位。ここからが勝負`, `今日の${team.short}戦、${fam}に注目して見てる`);
    }
    add(0, 1, `${fam}の${G.posById(p.position).name}としての成長が楽しみ`, `${fam}って私生活どんな感じなんだろ`, `${fam}のサインもらえた！一生の宝物`);

    // 人気があるほど、ファンもアンチも増える
    const pop = p.popularity;
    if (pop >= 40) {
      add(1, 1 + pop / 40, `${fam}推し歴${2 + Math.floor(rnd() * 7)}年。今日もユニフォーム着て出勤`, `${fam}のグッズ、また買っちゃった`, `${fam}の笑顔に救われてる`);
      add(-1, pop / 50, `${fam}って過大評価されすぎじゃない？`, `${fam}が叩かれないのは顔がいいから`, `${fam}、人気先行だよね`);
    }
    if (pop < 15) add(0, 2, `${fam}って誰？`, `${fam}、もっと知られていい選手だと思う`);

    // 重み付きで十数件を選ぶ
    const chosen = [];
    const pool = posts.slice();
    const target = Math.min(14, pool.length);
    while (chosen.length < target && pool.length) {
      const total = pool.reduce((a, x) => a + x.weight, 0);
      let r = rnd() * total;
      let i = 0;
      while (i < pool.length - 1 && r >= pool[i].weight) r -= pool[i++].weight;
      chosen.push(pool.splice(i, 1)[0]);
    }
    const times = ['1分前', '4分前', '12分前', '38分前', '1時間前', '2時間前', '5時間前', '昨日', '2日前', '3日前'];
    const list = chosen.map((x, i) => {
      const likes = Math.round(rnd() * (5 + pop * 25) * (x.sent === 0 ? 0.5 : 1));
      return {
        ...x,
        name: `${pick(NAME_A)}${pick(NAME_B)}`,
        handle: `@${pick(HANDLE_A)}${pick(HANDLE_B)}`,
        time: times[Math.min(times.length - 1, i)],
        likes,
        rt: Math.round(likes / (3 + rnd() * 6)),
      };
    });
    const pos = list.filter((x) => x.sent > 0).length;
    const neg = list.filter((x) => x.sent < 0).length;
    const score = list.length ? Math.round(50 + (50 * (pos - neg)) / list.length) : 50;
    const label = score >= 75 ? '大人気' : score >= 60 ? '好評' : score >= 45 ? '賛否両論' : score >= 30 ? '批判多め' : '炎上ぎみ';
    return { posts: list, score, label, pos, neg, neutral: list.length - pos - neg, followers: p.followers };
  };
})();
