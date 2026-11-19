/**
 * formats.js — 輪廓資料格式（瀏覽器與 Node 共用，無相依套件）
 *
 * 幀物件：{ frame, time, whiteBg, loops: [{ area, rawPoints, points: [[x,y],...] }] }
 * meta：  { w, h, fps, start, source, params }
 *
 *   ndjson  第 1 行 {"meta":{...}}，之後一行一幀
 *   json    { meta, frames: [...] }
 *   csv     第 1 行 # {"meta":...}，之後 frame,time,whiteBg,loop,area,rawPoints,idx,x,y（一列一點）
 *   bacs    二進位，little-endian：
 *             header 24 bytes：'BACS' | u16 version=1 | u16 w | u16 h | f32 fps | f32 start | u32 frames | u16 0
 *             frame：u8 whiteBg | u8 nLoops | 每個 loop：f32 area | u16 rawPoints | u16 K | K × (i16 x·100, i16 y·100)
 *   svg     單幀向量圖
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ContourFormats = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const FIX = 100;
  const KINDS = ['ndjson', 'json', 'csv', 'bacs'];

  function detectKind(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || '');
    const e = m ? m[1].toLowerCase() : '';
    return { ndjson: 'ndjson', jsonl: 'ndjson', json: 'json', csv: 'csv', bacs: 'bacs', bin: 'bacs', svg: 'svg' }[e] || null;
  }

  const round3 = v => Math.round(v * 1000) / 1000;

  function compactFrame(fr) {
    return {
      frame: fr.frame, time: round3(fr.time), whiteBg: !!fr.whiteBg,
      loops: fr.loops.map(l => ({ area: l.area, rawPoints: l.rawPoints, points: l.points.map(p => [round3(p[0]), round3(p[1])]) })),
    };
  }

  // ------------------------------------------------------------------ 編碼（逐段，可串流）
  const enc = {
    ndjson: {
      header: meta => JSON.stringify({ meta }) + '\n',
      frame: fr => JSON.stringify(compactFrame(fr)) + '\n',
      footer: () => '',
    },
    json: {
      header: meta => `{"meta":${JSON.stringify(meta)},"frames":[\n`,
      frame: (fr, i) => (i ? ',\n' : '') + JSON.stringify(compactFrame(fr)),
      footer: () => '\n]}\n',
    },
    csv: {
      header: meta => '# ' + JSON.stringify({ meta }) + '\nframe,time,whiteBg,loop,area,rawPoints,idx,x,y\n',
      frame: fr => {
        const t = round3(fr.time), wb = fr.whiteBg ? 1 : 0;
        if (!fr.loops.length) return `${fr.frame},${t},${wb},,,,,,\n`;
        let s = '';
        fr.loops.forEach((l, li) => l.points.forEach((p, i) => {
          s += `${fr.frame},${t},${wb},${li},${l.area},${l.rawPoints},${i},${round3(p[0])},${round3(p[1])}\n`;
        }));
        return s;
      },
      footer: () => '',
    },
    bacs: {
      header: (meta, nFrames) => {
        const b = new ArrayBuffer(24), v = new DataView(b);
        'BACS'.split('').forEach((c, i) => v.setUint8(i, c.charCodeAt(0)));
        v.setUint16(4, 1, true); v.setUint16(6, meta.w, true); v.setUint16(8, meta.h, true);
        v.setFloat32(10, meta.fps, true); v.setFloat32(14, meta.start || 0, true);
        v.setUint32(18, nFrames || 0, true); v.setUint16(22, 0, true);
        return new Uint8Array(b);
      },
      frame: fr => {
        const n = fr.loops.reduce((a, l) => a + 8 + l.points.length * 4, 2);
        const b = new ArrayBuffer(n), v = new DataView(b);
        let o = 0;
        v.setUint8(o++, fr.whiteBg ? 1 : 0);
        v.setUint8(o++, Math.min(fr.loops.length, 255));
        for (const l of fr.loops.slice(0, 255)) {
          v.setFloat32(o, l.area, true); o += 4;
          v.setUint16(o, Math.min(l.rawPoints, 65535), true); o += 2;
          v.setUint16(o, l.points.length, true); o += 2;
          for (const p of l.points) {
            v.setInt16(o, Math.round(p[0] * FIX), true); o += 2;
            v.setInt16(o, Math.round(p[1] * FIX), true); o += 2;
          }
        }
        return new Uint8Array(b);
      },
      footer: () => new Uint8Array(0),
    },
  };

  // ------------------------------------------------------------------ 解碼（整份）
  function parse(data, kind) {
    if (kind === 'bacs') return parseBacs(data);
    const text = typeof data === 'string' ? data : new TextDecoder().decode(data);
    if (kind === 'json') {
      const o = JSON.parse(text);
      return { meta: fillMeta(o.meta), frames: o.frames };
    }
    if (kind === 'csv') return parseCsv(text);
    // ndjson（也接受沒有 meta 行的舊檔）
    let meta = null;
    const frames = [];
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      const o = JSON.parse(line);
      if (o.meta) meta = o.meta; else frames.push(o);
    }
    return { meta: fillMeta(meta), frames };
  }

  function fillMeta(m) {
    return Object.assign({ w: 320, h: 180, fps: 30, start: 0 }, m || {});
  }

  function parseCsv(text) {
    const lines = text.split('\n');
    const frames = [];
    let cur = null, meta = null;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      if (lines[i][0] === '#') { try { meta = JSON.parse(lines[i].slice(1)).meta; } catch (e) { /* 忽略 */ } continue; }
      if (lines[i].startsWith('frame,')) continue;
      const c = lines[i].split(',');
      const f = +c[0];
      if (!cur || cur.frame !== f) {
        cur = { frame: f, time: +c[1], whiteBg: c[2] === '1', loops: [] };
        frames.push(cur);
      }
      if (c[3] === '' || c[3] === undefined) continue;
      const li = +c[3];
      if (!cur.loops[li]) cur.loops[li] = { area: +c[4], rawPoints: +c[5], points: [] };
      cur.loops[li].points.push([+c[7], +c[8]]);
    }
    return { meta: fillMeta(meta), frames };
  }

  function parseBacs(data) {
    const buf = data instanceof ArrayBuffer ? data : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const v = new DataView(buf);
    const magic = String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2), v.getUint8(3));
    if (magic !== 'BACS') throw new Error('不是 BACS 檔');
    const meta = fillMeta({ w: v.getUint16(6, true), h: v.getUint16(8, true), fps: v.getFloat32(10, true), start: v.getFloat32(14, true) });
    let n = v.getUint32(18, true);
    const frames = [];
    let o = 24;
    for (let f = 0; (n ? f < n : o < buf.byteLength); f++) {
      const whiteBg = v.getUint8(o++) === 1;
      const nl = v.getUint8(o++);
      const loops = [];
      for (let l = 0; l < nl; l++) {
        const area = v.getFloat32(o, true); o += 4;
        const rawPoints = v.getUint16(o, true); o += 2;
        const k = v.getUint16(o, true); o += 2;
        const points = new Array(k);
        for (let i = 0; i < k; i++) { points[i] = [v.getInt16(o, true) / FIX, v.getInt16(o + 2, true) / FIX]; o += 4; }
        loops.push({ area, rawPoints, points });
      }
      frames.push({ frame: f, time: round3(meta.start + f / meta.fps), whiteBg, loops });
    }
    return { meta, frames };
  }

  // ------------------------------------------------------------------ SVG
  function frameToSVG(fr, meta, opt) {
    opt = Object.assign({ fill: true, stroke: '#3ab9f2', strokeWidth: 0.6, scale: 4, bg: true }, opt || {});
    const w = meta.w, h = meta.h;
    const fg = fr.whiteBg ? '#000' : '#fff', bg = fr.whiteBg ? '#fff' : '#000';
    const d = fr.loops.map(l => l.points.map((p, i) => (i ? 'L' : 'M') + round3(p[0]) + ',' + round3(p[1])).join('') + 'Z').join('');
    const bgRect = opt.bg ? `<rect width="${w}" height="${h}" fill="${opt.fill ? bg : '#000'}"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * opt.scale}" height="${h * opt.scale}">` +
      bgRect +
      (d ? `<path d="${d}" fill="${opt.fill ? fg : 'none'}" fill-rule="evenodd" stroke="${opt.stroke || 'none'}" stroke-width="${opt.strokeWidth}" stroke-linejoin="round"/>` : '') +
      '</svg>\n';
  }

  return { KINDS, detectKind, enc, parse, frameToSVG, compactFrame };
});
