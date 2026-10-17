// セーブデータ：書き出し → 読み込みで元に戻るか、壊れたデータを弾けるか
const { load, drain, newPlayer } = require('./lib/game');

module.exports = [
  {
    name: 'セーブデータの書き出しと読み込み',
    run() {
      const G = load();
      const fails = [];
      const s = newPlayer(G, 'SS');
      s.flags.gameMode = 'auto';
      for (let i = 0; i < 30; i++) {
        drain(G, s);
        G.autoAdvance(s, 'w4');
      }
      drain(G, s);
      const text = G.exportSave(s);
      const back = G.importSave(text);
      const expected = G.migrate(JSON.parse(JSON.stringify(s))); // 読み込み時に古い項目の整理（migrate）が入る
      if (JSON.stringify(back.player) !== JSON.stringify(expected.player)) fails.push('選手データが元に戻らない');
      if (JSON.stringify(back.career) !== JSON.stringify(s.career) || JSON.stringify(back.people) !== JSON.stringify(expected.people)) fails.push('成績・人間関係が元に戻らない');
      if (back.year !== s.year || back.week !== s.week) fails.push('日付が元に戻らない');
      // そのまま遊び続けられる
      try {
        G.autoAdvance(back, 'w4');
      } catch (e) {
        fails.push(`読み込んだデータで続きを遊べない：${e.message}`);
      }
      // セーブデータそのもの（包みなし）も読める
      if (!G.importSave(JSON.stringify(s))) fails.push('セーブデータそのものを読めない');
      // スロットに保存して読み直せる
      G.saveToSlot(back, 2);
      const again = G.loadAll()[2];
      if (!again || again.player.name !== s.player.name) fails.push('スロットに保存できない');
      for (const bad of ['', 'abc', '{"foo":1}', text.slice(0, text.length / 2)]) {
        let threw = false;
        try {
          G.importSave(bad);
        } catch (e) {
          threw = !!e.message;
        }
        if (!threw) fails.push(`壊れたデータを読み込んでしまった：${bad.slice(0, 20)}`);
      }
      return { fails, note: `${Math.round(text.length / 1024)}KB` };
    },
  },
];
