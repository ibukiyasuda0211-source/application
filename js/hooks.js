// 機能どうしをつなぐ「合図」の仕組み
// 本体の処理は決まった場所で合図（emit / filter / blocked）を出し、
// 追加機能はそれを受け取って動く。関数を上書きしないので、読み込み順に左右されにくい。
//
//   G.on(name, fn)                 合図を受け取る処理を登録する
//   G.emit(name, ...args)          合図を出す（登録順にすべて呼ぶ）
//   G.filter(name, value, ...args) 値を順に加工してもらう（fn(value, ...args) の戻り値が次の値）
//   G.blocked(name, ...args)       どれかが true を返したら「止める」
(function () {
  const G = window.G;
  const table = {};

  G.on = (name, fn) => {
    (table[name] = table[name] || []).push(fn);
  };
  G.emit = (name, ...args) => {
    for (const fn of table[name] || []) fn(...args);
  };
  G.filter = (name, value, ...args) => (table[name] || []).reduce((v, fn) => fn(v, ...args), value);
  G.blocked = (name, ...args) => (table[name] || []).some((fn) => fn(...args));
  G.hookNames = () => Object.keys(table).sort();
})();
