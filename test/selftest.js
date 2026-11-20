'use strict';
const assert = require('assert');
const Core = require('../src/sampler-core.js');
const Fmt = require('../src/formats.js');

const W = 120, H = 80;
function scene() {
  const L = new Uint8Array(W * H).fill(255);
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) L[y * W + x] = 0; };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d1 = Math.hypot(x - 35, y - 40);
    if (d1 < 22 && d1 >= 10) set(x, y);
    if (d1 < 4) set(x, y);
    if (x >= 75 && x < 105 && y >= 20 && y < 60) set(x, y);
  }
  set(5, 5); set(6, 5);
  return L;
}

const r = Core.processLuma(scene(), W, H);
const count = c => r.all.filter(l => l.cls === c).length;
assert.strictEqual(r.whiteBg, true, '應判斷為白底');
assert.strictEqual(count('outer'), 2, '兩個外框');
assert.strictEqual(count('hole'), 1, '一個內洞');
assert.strictEqual(count('enclosed'), 1, '一個被包住的小島');
assert.ok(count('dust') >= 1, '雜點');
assert.strictEqual(r.kept.length, 2);
assert.ok(r.kept[0].area > r.kept[1].area, '依面積排序');
for (const l of r.kept) assert.strictEqual(l.points.length, Math.max(165, Math.min(450, l.rawPoints * 3)));

const r1 = Core.processLuma(scene(), W, H, { maxLoops: 1 });
assert.strictEqual(r1.kept.length, 1);

// 格式來回
const fr = { frame: 0, time: 0, whiteBg: r.whiteBg, loops: r.kept.map(l => ({ area: l.area, rawPoints: l.rawPoints, points: l.points })) };
const meta = { w: W, h: H, fps: 30, start: 0 };
for (const k of Fmt.KINDS) {
  const e = Fmt.enc[k];
  const parts = [e.header(meta, 1), e.frame(fr, 0), e.footer()];
  const data = k === 'bacs' ? Buffer.concat(parts.map(p => Buffer.from(p))) : parts.join('');
  const back = Fmt.parse(data, k);
  assert.strictEqual(back.frames.length, 1, k);
  assert.strictEqual(back.meta.w, W, k + ' meta');
  const a = fr.loops[0].points, b = back.frames[0].loops[0].points;
  assert.strictEqual(a.length, b.length, k);
  const md = Math.max(...a.map((p, i) => Math.max(Math.abs(p[0] - b[i][0]), Math.abs(p[1] - b[i][1]))));
  assert.ok(md <= (k === 'bacs' ? 0.0051 : 0.00051), `${k} 誤差 ${md}`);
}
console.log('selftest: 全部通過');
