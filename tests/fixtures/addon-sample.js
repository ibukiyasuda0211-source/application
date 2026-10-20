// 追加データ（アドオン）の見本：球団名・監督・選手・相手の名前・代表の顔ぶれを差し替える
// 自分だけで遊ぶ版をつくるときは、これと同じ形のファイルを用意して
//   node tools/build.js 出力先.html --with そのファイル.js --title 題名
// でまとめる。名前はすべて架空のもの。
(function () {
  const G = window.G;
  G.EDITION = 'アドオン見本';
  G.SAVE_KEY = 'diamond-life-sample-saves-v1'; // ほかの版とセーブを分ける
  Object.assign(G.teamById('tokyo'), { name: '東京サンプルズ', short: 'サンプル', mark: 'S', manager: '見本 太郎' });
  const ROSTER = [
    { name: '見本 一郎', pos: 'SS', born: 1996, r: 80 },
    { name: '見本 次郎', pos: 'P', born: 1998, r: 82, role: 'SP' },
  ];
  const age = (s, x) => s.year - x.born;
  G.on('roster:generated', (s, R) => {
    if (R.teamId !== 'tokyo') return;
    for (const x of ROSTER) {
      const free = R.players.filter((y) => !y.tag && !y.real && (x.pos === 'P') === (y.pos === 'P'));
      const m = free.find((y) => y.pos === x.pos) || free[0]; // 同じ守備位置があればそこ、なければ空いている枠
      if (m) Object.assign(m, { name: x.name, pos: x.pos, age: age(s, x), rating: x.r, real: true });
    }
  });
  G.on('oppName', (name, s, oppId, role) => (oppId === 'tokyo' ? (role === 'B' ? '見本 一郎' : '見本 次郎') : name));
  G.on('japan:init', (s, J) => {
    J.staff.manager.name = '見本 監督';
  });
})();
