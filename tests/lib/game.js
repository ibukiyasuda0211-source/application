// テスト用：ブラウザなしでゲーム本体（js/*.js）を読み込む
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// index.html と同じ順番でスクリプトを読み込み、新しい G を返す（画面の ui.js は除く）
// extra：追加で読み込むファイル（build.js の --with と同じく、最後に読み込む）
// 環境変数 ADDON=ファイル.js を付けて npm test すると、すべてのテストをそのアドオン入りで行う
function load(extra = []) {
  if (process.env.ADDON) extra = [...process.env.ADDON.split(','), ...extra];
  const store = {};
  const ctx = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => {
        store[k] = String(v);
      },
      removeItem: (k) => delete store[k],
    },
    console,
    Math,
    JSON,
    Date,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const order = html.match(/js\/(\w+)\.js/g).map((x) => x.slice(3, -3)).filter((x) => x !== 'ui');
  for (const f of order) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', `${f}.js`), 'utf8'), ctx, { filename: `js/${f}.js` });
  for (const f of extra) vm.runInContext(fs.readFileSync(path.isAbsolute(f) ? f : path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return ctx.G;
}

// 選択肢つきの場面は choose(q) の番号（なければ0）で、お知らせは閉じて進める
function drain(G, s, choose) {
  for (let guard = 0; s.queue.length && guard < 200; guard++) {
    const q = s.queue[0];
    if (q.kind === 'info') G.dismissScene(s);
    else G.resolveScene(s, choose ? choose(q) : 0, q.input);
  }
}

function newPlayer(G, pos, opts = {}) {
  const s = G.newGame({ name: '山田 太郎', position: pos, hand: opts.hand || 'RR', background: opts.background || 'univ', growth: opts.growth || 'normal' }, 0);
  const p = s.player;
  if (opts.ability) {
    if (pos === 'P') Object.assign(p.pitcher, opts.ability);
    else for (const k in p.batter) p.batter[k] = opts.ability;
  }
  if (opts.trust) p.trust = opts.trust;
  return s;
}

module.exports = { load, drain, newPlayer, ROOT };
