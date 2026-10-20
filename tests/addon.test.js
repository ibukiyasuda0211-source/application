// アドオン（追加データ）で、球団・監督・選手・相手の名前・代表監督を差し替えられるか
const { load, newPlayer } = require('./lib/game');

const check = () => {
  const G = load(['tests/fixtures/addon-sample.js']);
  const fails = [];
  if (G.teamById('tokyo').name !== '東京サンプルズ') fails.push('球団名が変わらない');
  if (G.SAVE_KEY === 'pawa-mylife-saves-v1') fails.push('セーブの保存先が分かれない');
  const s = newPlayer(G, 'OF', { ability: 60 });
  s.player.teamId = 'tokyo';
  G.genRoster(s);
  if (!s.roster.players.some((m) => m.name === '見本 一郎' && m.rating === 80)) fails.push('チームの名簿に追加データの選手が入らない');
  if (G.mgrLabel(s) !== '見本監督') fails.push(`監督の呼び方が変わらない（${G.mgrLabel(s)}）`);
  s.player.teamId = 'yokohama';
  if (G.filter('oppName', 'x', s, 'tokyo', 'SP') !== '見本 次郎') fails.push('相手の先発投手の名前が変わらない');
  G.ensureJapan(s);
  if (s.japan.staff.manager.name !== '見本 監督') fails.push('代表監督の名前が変わらない');
  if (!G.faceSvg(G.randomFace('a'), { team: G.teamById('tokyo') }).includes('>S<')) fails.push('帽子のマークが変わらない');
  // 追加データなしなら、いつもの架空の名前のまま
  if (load().teamById('tokyo').name === '東京サンプルズ') fails.push('追加データなしでも名前が変わってしまう');
  return fails;
};

module.exports = [
  {
    name: 'アドオンで名前を差し替えられる',
    run() {
      // このテストは見本のアドオンだけで行う（ADDON で別のアドオンを足していても）
      const env = process.env.ADDON;
      delete process.env.ADDON;
      try {
        return check();
      } finally {
        if (env !== undefined) process.env.ADDON = env;
      }
    },
  },
];
