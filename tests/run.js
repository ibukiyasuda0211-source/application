// テストをまとめて実行する：node tests/run.js（または npm test）
const fs = require('fs');
const path = require('path');

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .filter((f) => !process.argv[2] || f.includes(process.argv[2]));
let failed = 0;
const t0 = Date.now();
for (const f of files) {
  for (const t of require(path.join(__dirname, f))) {
    const t1 = Date.now();
    let res;
    try {
      res = t.run();
    } catch (e) {
      res = [`例外：${e.stack}`];
    }
    const fails = Array.isArray(res) ? res : res.fails;
    const note = Array.isArray(res) ? '' : res.note || '';
    const sec = ((Date.now() - t1) / 1000).toFixed(1);
    if (fails.length) {
      failed++;
      console.log(`✗ ${t.name}（${sec}秒）`);
      for (const m of fails.slice(0, 15)) console.log(`    - ${m}`);
      if (fails.length > 15) console.log(`    …ほか${fails.length - 15}件`);
    } else console.log(`✓ ${t.name}（${sec}秒）${note ? ` ${note}` : ''}`);
  }
}
console.log(`\n${failed ? `${failed}件失敗` : 'すべて成功'}（${((Date.now() - t0) / 1000).toFixed(1)}秒）`);
process.exit(failed ? 1 : 0);
