// 選手の生成・能力・成長
(function () {
  const G = window.G;

  G.TRAININGS = [
    { id: 'batting', name: '打撃練習', for: 'B', gain: { technique: 11, muscle: 4 }, stamina: 14, desc: 'ミート・パワー向け' },
    { id: 'defense', name: '守備練習', for: 'B', gain: { agility: 7, technique: 8 }, stamina: 13, desc: '守備・捕球向け' },
    { id: 'pitching', name: '投げ込み', for: 'P', gain: { technique: 10, muscle: 5 }, stamina: 16, desc: 'コントロール・球速向け' },
    { id: 'breakball', name: '変化球練習', for: 'P', gain: { breaking: 12, technique: 3 }, stamina: 12, desc: '変化球向け' },
    { id: 'weights', name: '筋力トレ', for: 'A', gain: { muscle: 12, mind: 3 }, stamina: 16, desc: 'パワー・肩・球速向け' },
    { id: 'running', name: '走り込み', for: 'A', gain: { agility: 11, muscle: 4 }, stamina: 16, desc: '走力・スタミナ向け' },
    { id: 'mental', name: 'イメトレ', for: 'A', gain: { mind: 10, technique: 3 }, stamina: 5, desc: '精神向け・疲れにくい' },
    { id: 'special', name: '特訓', for: 'A', gain: null, stamina: 30, desc: '全経験点大幅UP・ケガ注意', risky: true },
  ];
  G.trainingById = (id) => G.TRAININGS.find((t) => t.id === id);

  G.isPitcher = (p) => p.position === 'P';

  G.createPlayer = (opt) => {
    const bg = G.BACKGROUNDS.find((b) => b.id === opt.background);
    const hand = G.HANDS.find((h) => h.id === opt.hand);
    const growth = opt.growth === 'random' ? G.pick(G.GROWTH_TYPES).id : opt.growth;
    const base = () => G.ri(bg.base[0], bg.base[1]);
    const p = {
      name: opt.name,
      position: opt.position,
      hand: hand.id,
      throws: hand.throws,
      bats: hand.bats,
      background: bg.id,
      growth,
      talent: G.rf(0.92, 1.12),
      ceiling: G.ri(68, 92),
      age: bg.age,
      condition: 2,
      stamina: 100,
      injury: null,
      exp: { muscle: 30, agility: 30, technique: 30, breaking: 30, mind: 30 },
      skills: [],
      popularity: 5,
      money: 0,
      salary: 0,
      teamId: null,
      squad: 'second',
      trust: 30,
      role: null,
      yearsPro: 0,
      girlfriend: null,
      married: null,
      children: 0,
      house: false,
      car: false,
    };

    if (opt.position === 'P') {
      p.pitcher = {
        velocity: G.ri(bg.velo[0], bg.velo[1]),
        control: base(),
        stamina: base() + 5,
        pitches: [],
      };
      const pool = G.shuffle(G.PITCH_TYPES);
      const n = bg.id === 'hs' ? 2 : 3;
      for (let i = 0; i < n; i++) {
        p.pitcher.pitches.push({ id: pool[i].id, level: G.ri(1, bg.id === 'hs' ? 2 : 3) });
      }
      if (hand.throws === 'L') p.pitcher.velocity -= 2;
    } else {
      const b = {
        contact: base(),
        power: base(),
        speed: base(),
        arm: base(),
        fielding: base(),
        catching: base(),
      };
      const tweak = {
        C: { fielding: 5, catching: 6, arm: 5, speed: -6 },
        '1B': { power: 7, fielding: -5, speed: -4 },
        '2B': { contact: 4, fielding: 4, speed: 3 },
        '3B': { power: 4, arm: 4 },
        SS: { fielding: 6, speed: 5, arm: 3 },
        OF: { speed: 4, arm: 3 },
      }[opt.position] || {};
      for (const k in tweak) b[k] += tweak[k];
      for (const k in b) b[k] = G.clamp(b[k], 1, 100);
      p.batter = b;
    }
    return p;
  };

  // 投手の総合力（被打率・防御率の元になる値）
  G.pitchQuality = (p) => {
    const pt = p.pitcher;
    const vScore = G.clamp((pt.velocity - 125) * 2.2, 0, 100);
    const total = pt.pitches.reduce((s, x) => s + x.level, 0);
    const bScore = Math.min(100, total * 5 + pt.pitches.length * 3);
    let q = 0.36 * vScore + 0.36 * pt.control + 0.28 * bScore;
    if (p.throws === 'L') q += 2;
    if (p.skills.includes('nobi')) q += 2;
    if (p.skills.includes('pinch')) q += 2;
    if (p.skills.includes('heavy')) q += 1;
    return q;
  };

  G.overall = (p) => {
    if (G.isPitcher(p)) return G.pitchQuality(p) * 0.85 + p.pitcher.stamina * 0.15;
    const b = p.batter;
    return b.contact * 0.3 + b.power * 0.3 + b.speed * 0.12 + b.arm * 0.08 + b.fielding * 0.15 + b.catching * 0.05;
  };

  // 能力値を1上げるのに必要な経験点
  // 素質（ceiling）を超えると必要経験点が大きく増える
  G.abilityCost = (abil, value, p) => {
    let v = value;
    let mul = 1;
    if (abil.id === 'velocity') {
      v = (value - 120) * 2.4;
      mul = 1.3;
    }
    v = Math.max(0, v);
    if (p && p.ceiling && v >= p.ceiling) mul *= 2.5;
    const main = Math.round((8 + v * 0.3 + Math.max(0, v - 55) ** 2 * 0.035) * mul);
    const sub = Math.round(main * 0.5);
    return { [abil.main]: main, [abil.sub]: sub };
  };

  G.abilityValue = (p, abil) => (G.isPitcher(p) ? p.pitcher[abil.id] : p.batter[abil.id]);

  G.abilityMax = (abil) => abil.max || 100;

  G.canAfford = (p, cost) => Object.keys(cost).every((k) => p.exp[k] >= cost[k]);

  G.payCost = (p, cost) => {
    for (const k in cost) p.exp[k] -= cost[k];
  };

  G.raiseAbility = (p, abilId) => {
    const list = G.isPitcher(p) ? G.PITCHER_ABILITIES : G.BATTER_ABILITIES;
    const abil = list.find((a) => a.id === abilId);
    const target = G.isPitcher(p) ? p.pitcher : p.batter;
    if (target[abilId] >= G.abilityMax(abil)) return false;
    const cost = G.abilityCost(abil, target[abilId], p);
    if (!G.canAfford(p, cost)) return false;
    G.payCost(p, cost);
    target[abilId] += 1;
    return true;
  };

  G.pitchLevelCost = (level) => ({ breaking: 25 + level * 20, technique: 10 + level * 5 });
  G.NEW_PITCH_COST = { breaking: 60, technique: 25 };
  G.MAX_PITCHES = 5;
  G.MAX_PITCH_LEVEL = 7;

  G.raisePitch = (p, pitchId) => {
    const pt = p.pitcher.pitches.find((x) => x.id === pitchId);
    if (!pt || pt.level >= G.MAX_PITCH_LEVEL) return false;
    const cost = G.pitchLevelCost(pt.level);
    if (!G.canAfford(p, cost)) return false;
    G.payCost(p, cost);
    pt.level += 1;
    return true;
  };

  G.learnPitch = (p, pitchId) => {
    if (p.pitcher.pitches.length >= G.MAX_PITCHES) return false;
    if (p.pitcher.pitches.some((x) => x.id === pitchId)) return false;
    if (!G.canAfford(p, G.NEW_PITCH_COST)) return false;
    G.payCost(p, G.NEW_PITCH_COST);
    p.pitcher.pitches.push({ id: pitchId, level: 1 });
    return true;
  };

  G.availableSkills = (p) =>
    G.SKILLS.filter((s) => s.type === 'A' || s.type === (G.isPitcher(p) ? 'P' : 'B'));

  G.learnSkill = (p, skillId) => {
    const s = G.skillById(skillId);
    if (!s || p.skills.includes(skillId)) return false;
    if (!G.canAfford(p, s.cost)) return false;
    G.payCost(p, s.cost);
    p.skills.push(skillId);
    return true;
  };

  // 年齢と成長タイプによる経験点倍率
  G.growthMultiplier = (p) => {
    const a = p.age;
    let m;
    if (p.growth === 'early') m = a <= 23 ? 1.35 : a <= 27 ? 1.0 : a <= 31 ? 0.55 : 0.3;
    else if (p.growth === 'late') m = a <= 24 ? 0.85 : a <= 32 ? 1.2 : a <= 35 ? 0.6 : 0.3;
    else m = a <= 24 ? 1.12 : a <= 30 ? 1.0 : a <= 33 ? 0.6 : 0.3;
    return m * p.talent;
  };

  // 年を取ったときの衰え
  G.applyAging = (p) => {
    const start = { early: 29, normal: 32, late: 34 }[p.growth];
    const over = p.age - start;
    const msgs = [];
    if (over <= 0) return msgs;
    const amt = Math.ceil(over * 1.6);
    if (G.isPitcher(p)) {
      const pt = p.pitcher;
      const dv = G.ri(0, Math.ceil(amt * 0.7));
      pt.velocity = Math.max(120, pt.velocity - dv);
      pt.control = Math.max(1, pt.control - G.ri(0, amt));
      pt.stamina = Math.max(1, pt.stamina - G.ri(1, amt + 1));
      for (const x of pt.pitches) {
        if (x.level > 1 && G.chance(Math.min(0.8, over * 0.08))) x.level--;
      }
      if (dv > 0) msgs.push(`球速が${dv}km/h落ちた…`);
    } else {
      const b = p.batter;
      for (const k of Object.keys(b)) {
        const d = G.ri(0, amt + (k === 'speed' ? 1 : 0));
        b[k] = Math.max(1, b[k] - d);
      }
    }
    msgs.push('年齢による衰えを感じる…');
    return msgs;
  };

  G.draftRank = (p) => {
    const ov = G.overall(p) + G.rf(-3, 3);
    const thresholds = [50, 45, 41, 37, 33];
    for (let i = 0; i < thresholds.length; i++) if (ov >= thresholds[i]) return i + 1;
    return 6;
  };

  G.DRAFT_TERMS = {
    1: { salary: 1500, bonus: 10000 },
    2: { salary: 1200, bonus: 7000 },
    3: { salary: 1000, bonus: 5000 },
    4: { salary: 900, bonus: 4000 },
    5: { salary: 800, bonus: 3000 },
    6: { salary: 700, bonus: 2000 },
  };

  G.positionName = (p) => G.posById(p.position).name;

  G.roleName = (p) => {
    if (!G.isPitcher(p)) {
      const u = p.usage;
      if (!u) return p.trust >= 55 ? 'レギュラー' : '控え';
      return u.status === 'starter' && u.slot ? `${u.slot}番スタメン` : '控え';
    }
    if (p.role === 'SP') return '先発';
    if (p.role === 'CL') return '抑え';
    return (G.RP_RANKS && G.RP_RANKS[p.rpRank]) || '中継ぎ';
  };
})();
