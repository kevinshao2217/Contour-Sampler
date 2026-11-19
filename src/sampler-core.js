/**
 * sampler-core.js — 拓撲雙網格邊界取樣（瀏覽器與 Node 共用，無相依套件）
 *
 * 單幀流程：
 *   1. 灰階格點（sampleW × sampleH）
 *   2. 背景判斷：最外圈像素平均亮度 > threshold → 白底（前景 = 暗），否則黑底（前景 = 亮）
 *   3. 亮度門檻 → 二值遮罩
 *   4. 雙網格：每條 0/1 交界的像素邊 → 一條有向邊（前景在行進方向的右手邊）
 *   5. 沿有向邊走出封閉迴圈
 *   6. 分類：點數 < minLoopPoints → dust；鞋帶公式有號面積 ≤ 0 → hole；0 < 面積 ≤ minArea → speck；
 *      其餘為外框候選，依面積由大到小，若 enclosedSamples 個取樣點中 ≥ enclosedVotes 個落在已接受的外框內 → enclosed
 *   7. 保留前 maxLoops 個外框（0 = 全部）
 *   8. 等距重取樣成 K = max(minK, min(targetK, 原始點數 × 3)) 點，再做 smoothIter 次 (w, 1−2w, w) 平滑
 *
 * 預設參數與 bake_fourier.js 完全相同。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SamplerCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const defaults = Object.freeze({
    sampleW: 320,
    sampleH: 180,
    threshold: 128,
    bgMode: 'auto',          // 'auto' | 'white' | 'black'
    minLoopPoints: 15,
    minArea: 15,
    enclosedSamples: 8,
    enclosedVotes: 3,
    maxLoops: 2,             // 0 = 不限
    targetK: 450,
    minK: 165,
    smoothIter: 2,
    smoothWeight: 0.2,
  });

  /** RGBA → 灰階（BT.601 亮度）。 */
  function lumaFromRGBA(data, n, out) {
    const L = out || new Uint8Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      L[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29 + 128) >> 8;
    }
    return L;
  }

  function detectWhiteBg(L, W, H, thr) {
    let s = 0, n = 0;
    for (let x = 0; x < W; x++) { s += L[x] + L[(H - 1) * W + x]; n += 2; }
    for (let y = 0; y < H; y++) { s += L[y * W] + L[y * W + W - 1]; n += 2; }
    return s / n > thr;
  }

  function makeMask(L, W, H, whiteBg, thr) {
    const M = new Uint8Array(W * H);
    if (whiteBg) { for (let i = 0; i < M.length; i++) M[i] = L[i] < thr ? 1 : 0; }
    else { for (let i = 0; i < M.length; i++) M[i] = L[i] > thr ? 1 : 0; }
    return M;
  }

  /** 雙網格有向邊 → 封閉迴圈（含 dust）。頂點以整數 key = y·(W+1)+x 表示。 */
  function traceLoops(M, W, H) {
    const KW = W + 1;
    const B = (x, y) => (x < 0 || x >= W || y < 0 || y >= H) ? 0 : M[y * W + x];
    const adj = new Map();
    const add = (x1, y1, x2, y2) => {
      const k = y1 * KW + x1;
      let l = adj.get(k);
      if (!l) { l = []; adj.set(k, l); }
      l.push(y2 * KW + x2);
    };
    for (let y = 0; y <= H; y++) {
      for (let x = 0; x <= W; x++) {
        if (x < W) {
          const up = B(x, y - 1), dn = B(x, y);
          if (up === 0 && dn === 1) add(x, y, x + 1, y);
          else if (up === 1 && dn === 0) add(x + 1, y, x, y);
        }
        if (y < H) {
          const lf = B(x - 1, y), rt = B(x, y);
          if (lf === 0 && rt === 1) add(x, y + 1, x, y);
          else if (lf === 1 && rt === 0) add(x, y, x, y + 1);
        }
      }
    }
    const NV = KW * (H + 2);
    const visited = new Set();
    const loops = [];
    for (const [start, targets] of adj) {
      for (const t0 of targets) {
        if (visited.has(start * NV + t0)) continue;
        const loop = [[start % KW, (start / KW) | 0]];
        let cur = start, tgt = t0;
        while (tgt !== -1) {
          const id = cur * NV + tgt;
          if (visited.has(id)) break;
          visited.add(id);
          loop.push([tgt % KW, (tgt / KW) | 0]);
          cur = tgt;
          tgt = -1;
          const nx = adj.get(cur);
          if (nx) for (const n of nx) { if (!visited.has(cur * NV + n)) { tgt = n; break; } }
        }
        loops.push(loop);
      }
    }
    return loops;
  }

  function signedArea(p) {
    let a = 0;
    for (let i = 0; i < p.length; i++) {
      const j = (i + 1) % p.length;
      a += p[i][0] * p[j][1] - p[j][0] * p[i][1];
    }
    return a / 2;
  }

  function pointInPolygon(pt, vs) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i][0], yi = vs[i][1], xj = vs[j][0], yj = vs[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function resampleEquidistant(pts, K) {
    if (pts.length <= 2) return pts.map(p => p.slice());
    const len = [0];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      len.push(total);
    }
    const out = new Array(K);
    const step = total / K;
    let s = 0;
    for (let k = 0; k < K; k++) {
      const d = k * step;
      while (s < len.length - 1 && len[s + 1] < d) s++;
      if (s >= len.length - 1) { out[k] = pts[pts.length - 1].slice(); continue; }
      const seg = len[s + 1] - len[s];
      const r = seg > 1e-5 ? (d - len[s]) / seg : 0;
      out[k] = [pts[s][0] + r * (pts[s + 1][0] - pts[s][0]), pts[s][1] + r * (pts[s + 1][1] - pts[s][1])];
    }
    return out;
  }

  function smoothClosedLoop(pts, iter, w) {
    let cur = pts;
    const N = cur.length, c = 1 - 2 * w;
    for (let it = 0; it < iter; it++) {
      const nx = new Array(N);
      for (let i = 0; i < N; i++) {
        const p = cur[(i - 1 + N) % N], q = cur[i], n = cur[(i + 1) % N];
        nx[i] = [w * p[0] + c * q[0] + w * n[0], w * p[1] + c * q[1] + w * n[1]];
      }
      cur = nx;
    }
    return cur;
  }

  /**
   * 處理一幀。
   * @param {Uint8Array} L  灰階 W×H
   * @returns {{whiteBg:boolean, mask:Uint8Array, all:Array, kept:Array}}
   *   all：每條迴圈 {pts, area, cls: 'outer'|'enclosed'|'hole'|'speck'|'dust', kept}
   *   kept：輸出用 {area, rawPoints, raw, points}
   */
  function processLuma(L, W, H, options) {
    const o = Object.assign({}, defaults, options || {});
    const whiteBg = o.bgMode === 'white' ? true : o.bgMode === 'black' ? false : detectWhiteBg(L, W, H, o.threshold);
    const mask = makeMask(L, W, H, whiteBg, o.threshold);
    const traced = traceLoops(mask, W, H);
    const all = traced.map(pts => ({ pts, area: 0, cls: 'dust', kept: false }));
    // 與原版相同：先依點數排序（影響同面積時的先後）
    const valid = all.filter(l => l.pts.length >= o.minLoopPoints).sort((a, b) => b.pts.length - a.pts.length);
    const cand = [];
    for (const l of valid) {
      l.area = signedArea(l.pts);
      if (l.area > o.minArea) cand.push(l);
      else l.cls = l.area <= 0 ? 'hole' : 'speck';
    }
    cand.sort((a, b) => b.area - a.area);
    const outer = [];
    for (const c of cand) {
      let votes = 0;
      for (let t = 0; t < o.enclosedSamples; t++) {
        const pt = c.pts[Math.floor(c.pts.length * (t / o.enclosedSamples))];
        for (const ol of outer) { if (pointInPolygon(pt, ol.pts)) { votes++; break; } }
      }
      if (votes >= o.enclosedVotes) c.cls = 'enclosed';
      else { c.cls = 'outer'; outer.push(c); }
    }
    const take = o.maxLoops > 0 ? outer.slice(0, o.maxLoops) : outer;
    const kept = take.map(l => {
      l.kept = true;
      const K = Math.max(o.minK, Math.min(o.targetK, l.pts.length * 3));
      return {
        area: l.area,
        rawPoints: l.pts.length,
        raw: l.pts,
        points: smoothClosedLoop(resampleEquidistant(l.pts, K), o.smoothIter, o.smoothWeight),
      };
    });
    return { whiteBg, mask, all, kept };
  }

  return {
    defaults, lumaFromRGBA, detectWhiteBg, makeMask, traceLoops, signedArea, pointInPolygon,
    resampleEquidistant, smoothClosedLoop, processLuma,
  };
});
