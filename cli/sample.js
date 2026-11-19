#!/usr/bin/env node
/**
 * cli/sample.js — 影片 → 輪廓資料（命令列版，需要 Node 18+ 與 ffmpeg）
 *
 *   node cli/sample.js input.mp4                         → input.ndjson
 *   node cli/sample.js input.mp4 -o out.bacs --start 13.33 --duration 10
 *   node cli/sample.js input.mp4 -o frames/ --format svg  每幀一個 SVG
 *
 * 輸入：任何 ffmpeg 能解碼的影片或圖片序列（mp4/mkv/webm/mov/gif/avi，或 img_%04d.png）
 * 輸出：.ndjson / .json / .csv / .bacs（依副檔名），或資料夾（SVG 序列）
 *
 * 取樣參數（預設 = 原版）：
 *   --res 320x180  --threshold 128  --bg auto|white|black
 *   --minLoopPoints 15  --minArea 15  --enclosedSamples 8  --enclosedVotes 3  --maxLoops 2 (0 = 全部)
 *   --targetK 450  --minK 165  --smoothIter 2  --smoothWeight 0.2
 * 其他：
 *   -o, --out FILE   --format ndjson|json|csv|bacs|svg   --start SEC   --duration SEC   --fps 30
 *   --ffmpeg PATH    --quiet
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Core = require('../src/sampler-core.js');
const Fmt = require('../src/formats.js');

function parseArgs(argv) {
  const o = { input: null, out: null, format: null, start: 0, duration: null, fps: 30, ffmpeg: 'ffmpeg', quiet: false, res: '320x180', bg: 'auto' };
  const num = new Set(['start', 'duration', 'fps', 'threshold', 'minLoopPoints', 'minArea', 'enclosedSamples', 'enclosedVotes',
    'maxLoops', 'targetK', 'minK', 'smoothIter', 'smoothWeight']);
  for (let i = 2; i < argv.length; i++) {
    let a = argv[i];
    if (a === '-o') a = '--out';
    if (a === '-h' || a === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0); }
    if (a === '--quiet') { o.quiet = true; continue; }
    if (a.startsWith('--')) { const k = a.slice(2), v = argv[++i]; o[k] = num.has(k) ? parseFloat(v) : v; }
    else if (!o.input) o.input = a;
  }
  if (!o.input) { console.error('用法：node cli/sample.js <影片> [-o out.ndjson] [--start 秒] [--duration 秒]（--help 看全部參數）'); process.exit(1); }
  if (!o.out) o.out = o.input.replace(/\.[^.\\/]+$/, '') + '.ndjson';
  return o;
}

function main() {
  const o = parseArgs(process.argv);
  const [W, H] = o.res.split('x').map(Number);
  const params = { threshold: 128, bgMode: o.bg };
  for (const k of Object.keys(Core.defaults)) if (o[k] !== undefined) params[k] = o[k];
  params.bgMode = o.bg;
  const opts = Object.assign({}, Core.defaults, params, { sampleW: W, sampleH: H });

  const kind = o.format || (/[\\/]$/.test(o.out) ? 'svg' : Fmt.detectKind(o.out) || 'ndjson');
  const meta = { w: W, h: H, fps: o.fps, start: o.start, source: path.basename(o.input), params: opts };
  let fd = null;
  if (kind === 'svg') fs.mkdirSync(o.out, { recursive: true });
  else {
    fd = fs.openSync(o.out, 'w');
    const h = Fmt.enc[kind].header(meta, 0);
    fs.writeSync(fd, typeof h === 'string' ? h : Buffer.from(h));
  }

  const args = ['-hide_banner', '-loglevel', 'error'];
  if (o.start > 0) args.push('-ss', String(o.start));
  args.push('-i', o.input);
  if (o.duration) args.push('-t', String(o.duration));
  args.push('-map', '0:v:0', '-vf', `fps=${o.fps}`, '-s', `${W}x${H}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-');
  const ff = spawn(o.ffmpeg, args, { stdio: ['ignore', 'pipe', 'inherit'] });
  ff.on('error', e => { console.error(`無法執行 ffmpeg（${o.ffmpeg}）：${e.message}\n請安裝 ffmpeg，或用 --ffmpeg 指定路徑。`); process.exit(1); });

  const N = W * H;
  let buf = Buffer.alloc(0), n = 0;
  const t0 = Date.now();
  ff.stdout.on('data', chunk => {
    buf = buf.length ? Buffer.concat([buf, chunk]) : chunk;
    while (buf.length >= N) {
      const L = new Uint8Array(buf.subarray(0, N));
      buf = buf.subarray(N);
      const r = Core.processLuma(L, W, H, opts);
      const fr = { frame: n, time: o.start + n / o.fps, whiteBg: r.whiteBg,
        loops: r.kept.map(l => ({ area: l.area, rawPoints: l.rawPoints, points: l.points })) };
      if (kind === 'svg') fs.writeFileSync(path.join(o.out, `frame_${String(n).padStart(5, '0')}.svg`), Fmt.frameToSVG(fr, meta));
      else { const s = Fmt.enc[kind].frame(fr, n); fs.writeSync(fd, typeof s === 'string' ? s : Buffer.from(s)); }
      if (!o.quiet && n % 300 === 0) console.log(`  幀 ${n}  ${(n / Math.max((Date.now() - t0) / 1000, 1e-3)).toFixed(0)} 幀/秒  外框 ${r.kept.length}`);
      n++;
    }
  });
  ff.on('close', code => {
    if (fd !== null) {
      const f = Fmt.enc[kind].footer();
      fs.writeSync(fd, typeof f === 'string' ? f : Buffer.from(f));
      if (kind === 'bacs') { const b = Buffer.alloc(4); b.writeUInt32LE(n, 0); fs.writeSync(fd, b, 0, 4, 18); }
      fs.closeSync(fd);
    }
    if (code !== 0 || n === 0) { console.error(`ffmpeg 結束代碼 ${code}，共 ${n} 幀。`); process.exit(1); }
    console.log(`完成：${n} 幀 → ${o.out}（${kind}，${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
  });
}

main();
