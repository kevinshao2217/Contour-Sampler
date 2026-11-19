#!/usr/bin/env node
/**
 * cli/decode.js — 輪廓資料 → 影片／圖片序列，或資料格式互轉（需要 Node 18+；輸出影片／PNG 需要 ffmpeg）
 *
 *   node cli/decode.js input.ndjson -o decoded.mp4                       剪影影片
 *   node cli/decode.js input.bacs   -o decoded.mp4 --audio original.mp4   附原影片音軌（自動對齊）
 *   node cli/decode.js input.ndjson -o lines.mp4 --mode outline           只畫輪廓線
 *   node cli/decode.js input.ndjson -o png/ --frames 100-120              PNG 序列
 *   node cli/decode.js input.ndjson -o svg/ --format svg                  SVG 序列
 *   node cli/decode.js input.ndjson -o input.bacs                         轉檔（ndjson/json/csv/bacs 任意互轉）
 *
 * 選項：
 *   --mode fill|outline|both   剪影（預設）／輪廓線／兩者
 *   --w N --h N                輸出解析度（預設高 1080，寬依取樣比例）
 *   --line N                   線寬（像素，預設 3）
 *   --fg #rrggbb --bg #rrggbb  前景／背景色（預設依每幀黑底／白底還原）
 *   --lineColor #rrggbb        線色（預設 #3ab9f2）
 *   --frames A-B               只輸出這些幀
 *   --audio FILE               附上該檔音軌
 *   --crf N                    畫質（預設 16）
 *   --ffmpeg PATH
 */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const Fmt = require('../src/formats.js');

const VIDEO_EXT = new Set(['.mp4', '.mkv', '.mov', '.webm', '.gif', '.avi']);
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));

function parseArgs(argv) {
  const o = { input: null, out: null, mode: 'fill', w: null, h: null, line: 3, fg: null, bg: null,
    lineColor: '#3ab9f2', frames: null, audio: null, crf: 16, ffmpeg: 'ffmpeg', format: null };
  for (let i = 2; i < argv.length; i++) {
    let a = argv[i];
    if (a === '-o') a = '--out';
    if (a === '-h' || a === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0); }
    if (a.startsWith('--')) o[a.slice(2)] = argv[++i];
    else if (!o.input) o.input = a;
  }
  if (!o.input || !o.out) { console.error('用法：node cli/decode.js <輪廓檔> -o <decoded.mp4 | 資料夾/ | other.bacs>（--help 看全部選項）'); process.exit(1); }
  for (const k of ['w', 'h', 'line', 'crf']) if (o[k] !== null) o[k] = +o[k];
  if (o.frames) { const [a, b] = o.frames.split('-').map(Number); o.frames = [a, isNaN(b) ? a : b]; }
  return o;
}

// ================================================================== 光柵化
class Raster {
  constructor(W, H) { this.W = W; this.H = H; this.buf = Buffer.alloc(W * H * 3); }

  clear(c) { for (let i = 0; i < this.buf.length; i += 3) { this.buf[i] = c[0]; this.buf[i + 1] = c[1]; this.buf[i + 2] = c[2]; } }

  blend(x, y, c, a) {
    if (a <= 0 || x < 0 || y < 0 || x >= this.W || y >= this.H) return;
    const i = (y * this.W + x) * 3, b = this.buf;
    if (a >= 1) { b[i] = c[0]; b[i + 1] = c[1]; b[i + 2] = c[2]; return; }
    b[i] += (c[0] - b[i]) * a; b[i + 1] += (c[1] - b[i + 1]) * a; b[i + 2] += (c[2] - b[i + 2]) * a;
  }

  /** 奇偶規則掃描線填色，每列 4 次子取樣做水平反鋸齒。 */
  fill(polys, c) {
    const S = 4, W = this.W;
    let y0 = Infinity, y1 = -Infinity;
    for (const p of polys) for (const q of p) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); }
    y0 = Math.max(0, Math.floor(y0)); y1 = Math.min(this.H - 1, Math.ceil(y1));
    const cov = new Float32Array(W + 1);
    for (let y = y0; y <= y1; y++) {
      cov.fill(0);
      for (let s = 0; s < S; s++) {
        const sy = y + (s + 0.5) / S;
        const xs = [];
        for (const p of polys) {
          for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
            const [xi, yi] = p[i], [xj, yj] = p[j];
            if ((yi > sy) !== (yj > sy)) xs.push(xi + (sy - yi) * (xj - xi) / (yj - yi));
          }
        }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const a = Math.max(0, xs[k]), b = Math.min(W, xs[k + 1]);
          if (b <= a) continue;
          const ia = Math.floor(a), ib = Math.floor(b);
          if (ia === ib) { cov[ia] += (b - a) / S; continue; }
          cov[ia] += (ia + 1 - a) / S;
          for (let x = ia + 1; x < ib; x++) cov[x] += 1 / S;
          if (ib < W) cov[ib] += (b - ib) / S;
        }
      }
      for (let x = 0; x < W; x++) if (cov[x] > 0) this.blend(x, y, c, Math.min(1, cov[x]));
    }
  }

  /** 以「到線段距離」畫有寬度的反鋸齒線。 */
  stroke(p, c, width, closed = true) {
    const r = width / 2;
    const n = closed ? p.length : p.length - 1;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length];
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1)), x1 = Math.min(this.W - 1, Math.ceil(Math.max(ax, bx) + r + 1));
      const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1)), y1 = Math.min(this.H - 1, Math.ceil(Math.max(ay, by) + r + 1));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5 - ax, py = y + 0.5 - ay;
          const t = Math.max(0, Math.min(1, (px * dx + py * dy) / L2));
          const d = Math.hypot(px - t * dx, py - t * dy);
          const a = r + 0.5 - d;
          if (a > 0) {
            const k = (y * this.W + x) * 3, b = this.buf;
            const cur = Math.min(1, a);
            // 同一條線上重疊的線段不重複加深：只往線色靠近到 cur
            for (let ch = 0; ch < 3; ch++) {
              const target = b[k + ch] + (c[ch] - b[k + ch]) * cur;
              if (Math.abs(target - c[ch]) < Math.abs(b[k + ch] - c[ch])) b[k + ch] = target;
            }
          }
        }
      }
    }
  }
}

// ================================================================== 主程式
function main() {
  const o = parseArgs(process.argv);
  const kindIn = Fmt.detectKind(o.input);
  if (!kindIn || kindIn === 'svg') { console.error('輸入需為 .ndjson / .json / .csv / .bacs'); process.exit(1); }
  const raw = fs.readFileSync(o.input);
  const { meta, frames: all } = Fmt.parse(kindIn === 'bacs' ? raw : raw.toString('utf8'), kindIn);
  const frames = all.filter(fr => !o.frames || (fr.frame >= o.frames[0] && fr.frame <= o.frames[1]));
  const ext = path.extname(o.out).toLowerCase();
  const isDir = /[\\/]$/.test(o.out) || o.format === 'png' || o.format === 'svg';

  // ---- 資料互轉 ----
  if (!isDir && !VIDEO_EXT.has(ext)) {
    const kind = o.format || Fmt.detectKind(o.out) || 'ndjson';
    const enc = Fmt.enc[kind];
    const parts = [enc.header(meta, frames.length), ...frames.map((f, i) => enc.frame(f, i)), enc.footer()];
    fs.writeFileSync(o.out, Buffer.concat(parts.map(p => typeof p === 'string' ? Buffer.from(p) : Buffer.from(p))));
    console.log(`轉檔完成：${frames.length} 幀 → ${o.out}（${kind}）`);
    return;
  }
  // ---- SVG 序列 ----
  if (isDir && o.format === 'svg') {
    fs.mkdirSync(o.out, { recursive: true });
    for (const fr of frames) {
      fs.writeFileSync(path.join(o.out, `frame_${String(fr.frame).padStart(5, '0')}.svg`),
        Fmt.frameToSVG(fr, meta, { fill: o.mode !== 'outline', stroke: o.mode === 'fill' ? 'none' : o.lineColor }));
    }
    console.log(`完成：${frames.length} 個 SVG → ${o.out}`);
    return;
  }
  // ---- 影片／PNG ----
  const W = o.w || Math.round((o.h || 1080) * meta.w / meta.h);
  const H = o.h || Math.round(W * meta.h / meta.w);
  const sc = Math.min(W / meta.w, H / meta.h), ox = (W - meta.w * sc) / 2, oy = (H - meta.h * sc) / 2;
  const map = p => [ox + p[0] * sc, oy + p[1] * sc];
  const lineC = hex(o.lineColor);
  const first = frames.length ? frames[0].frame : 0;
  let args = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(meta.fps), '-i', '-'];
  if (isDir) {
    fs.mkdirSync(o.out, { recursive: true });
    args.push('-start_number', String(first), path.join(o.out, 'frame_%05d.png'));
  } else {
    if (o.audio) args.push('-ss', String((meta.start || 0) + first / meta.fps), '-i', o.audio, '-map', '0:v', '-map', '1:a?', '-c:a', 'aac', '-b:a', '256k', '-shortest');
    if (ext === '.gif') args.push('-vf', 'split[a][b];[a]palettegen[p];[b][p]paletteuse');
    else if (ext === '.webm') args.push('-c:v', 'libvpx-vp9', '-crf', String(o.crf + 14), '-b:v', '0', '-pix_fmt', 'yuv420p');
    else args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', String(o.crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
    args.push(o.out);
  }
  const ff = spawn(o.ffmpeg, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('error', e => { console.error(`無法執行 ffmpeg（${o.ffmpeg}）：${e.message}`); process.exit(1); });
  const R = new Raster(W, H);
  const t0 = Date.now();
  let idx = 0;
  const pump = () => {
    while (idx < frames.length) {
      const fr = frames[idx++];
      const bg = o.bg ? hex(o.bg) : (fr.whiteBg ? [255, 255, 255] : [0, 0, 0]);
      const fg = o.fg ? hex(o.fg) : (fr.whiteBg ? [0, 0, 0] : [255, 255, 255]);
      R.clear(o.mode === 'outline' && !o.bg ? [0, 0, 0] : bg);
      const polys = fr.loops.map(l => l.points.map(map));
      if (o.mode !== 'outline' && polys.length) R.fill(polys, fg);
      if (o.mode !== 'fill') for (const p of polys) R.stroke(p, lineC, o.line);
      if (idx % 300 === 0) console.log(`  ${idx}/${frames.length}  ${(idx / ((Date.now() - t0) / 1000)).toFixed(0)} 幀/秒`);
      if (!ff.stdin.write(Buffer.from(R.buf))) { ff.stdin.once('drain', pump); return; }
    }
    ff.stdin.end();
  };
  ff.on('close', code => {
    if (code !== 0) { console.error(`ffmpeg 結束代碼 ${code}`); process.exit(1); }
    console.log(`完成：${frames.length} 幀 → ${o.out}（${W}×${H}，${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
  });
  pump();
}

main();
