// 1ファイルにまとめたHTMLをつくる（配布・アーティファクト用）
//   node tools/build.js [出力先] [--with 追加.js,追加2.js] [--title ページの題名]
// --with：追加のデータや機能（画面の ui.js の直前に読み込む）。例：自分だけで遊ぶ版のデータ
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const extra = (opt('--with') || '').split(',').filter(Boolean);
const title = opt('--title') || 'ダイヤモンド・ライフ';
const out = args[0] || path.join(ROOT, 'dist', 'diamond-life.html');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/\w+\.js)"><\/script>/g)].map((m) => m[1]);
const ui = scripts.indexOf('js/ui.js');
const files = [...scripts.slice(0, ui), ...extra, ...scripts.slice(ui)];
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const js = files.map((f) => fs.readFileSync(path.isAbsolute(f) ? f : path.join(ROOT, f), 'utf8')).join('\n');
const esc = (t) => t.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' })[c]);
const page = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body><div id="app"></div><div id="toast" class="toast" hidden></div>
<script>${js}</script></body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`${files.length}個のスクリプトをまとめました${extra.length ? `（追加：${extra.map((f) => path.basename(f)).join('・')}）` : ''} → ${path.relative(process.cwd(), out)}（${Math.round(page.length / 1024)}KB）`);
