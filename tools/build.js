// 1ファイルにまとめたHTMLをつくる（配布・アーティファクト用）：node tools/build.js [出力先]
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const out = process.argv[2] || path.join(ROOT, 'dist', 'diamond-life.html');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="(js\/\w+\.js)"><\/script>/g)].map((m) => m[1]);
const css = fs.readFileSync(path.join(ROOT, 'css', 'style.css'), 'utf8');
const js = scripts.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const page = `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ダイヤモンド・ライフ</title>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;700;800&display=swap" rel="stylesheet">
<style>${css}</style></head><body><div id="app"></div><div id="toast" class="toast" hidden></div>
<script>${js}</script></body></html>`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, page);
console.log(`${scripts.length}個のスクリプトをまとめました → ${path.relative(process.cwd(), out)}（${Math.round(page.length / 1024)}KB）`);
