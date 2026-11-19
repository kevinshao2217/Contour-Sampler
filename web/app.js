/* Contour Sampler — Professional Engineering Workstation */
(function () {
  'use strict';
  const Core = window.SamplerCore;
  const Fmt = window.ContourFormats;
  const $ = id => document.getElementById(id);

  // ================================================================== Internationalization (i18n)
  const I18N = {
    en: {
      lang: 'English',
      title: 'CONTOUR SAMPLER',
      sub: 'Dual-Grid Topological Boundary Engine',
      badge: 'PRO WORKSTATION',
      attr: 'Built with Claude · Anthropic',
      openMedia: 'Open Media',
      openMediaTip: 'Open video or raster media (MP4, WebM, MOV, PNG, JPG)',
      importData: 'Import Trajectory',
      importDataTip: 'Load extracted contour dataset (BACS, NDJSON, JSON, CSV)',
      demo: 'Benchmark Demo',
      demoTip: 'Execute synthetic benchmark generator',
      dropHeading: 'Drop Media Asset Here',
      dropSub: 'Drag video or image into viewport, or select via top navigation',
      dropSecurity: 'Pure In-Memory Client Pipeline — Zero Server Data Transmission',
      playTip: 'Play / Pause [Space]',
      pauseTip: 'Pause [Space]',
      prevTip: 'Step -1 Frame [←]',
      nextTip: 'Step +1 Frame [→]',
      seekLabel: 'Seek Timeline',
      velocityLabel: 'Playback Rate',
      systemStandby: 'SYSTEM STANDBY — Awaiting media stream or benchmark trigger',
      sec1: '01. SPATIAL DISCRETIZATION & LUMA',
      res: 'Sampling Grid',
      resOpt: [
        ['160x90', '160 × 90 (Draft)'],
        ['320x180', '320 × 180 (Standard Baseline)'],
        ['480x270', '480 × 270 (Dense)'],
        ['640x360', '640 × 360 (High Precision)'],
        ['960x540', '960 × 540 (Ultra Definition)']
      ],
      threshold: 'Luma Threshold',
      thresholdHint: 'Binary intensity cutoff level [1–254]',
      bgMode: 'Polarity Logic',
      bgModeOpt: [
        ['auto', 'Auto Boundary (Outer Field Dominance)'],
        ['white', 'Fixed Invert (White Field / Dark Silhouette)'],
        ['black', 'Fixed Normal (Black Field / Light Silhouette)']
      ],
      sec2: '02. TOPOLOGY & LOOP FILTERS',
      minLoopPoints: 'Min Loop Vertices',
      minLoopPointsHint: 'Suppresses sub-pixel raster noise',
      minArea: 'Min Bounding Area',
      minAreaHint: 'Shoelace formula threshold in px²',
      enclosedSamples: 'Enclosure Probes',
      enclosedSamplesHint: 'Ray-casting probe count per loop',
      enclosedVotes: 'Enclosure Consensus',
      enclosedVotesHint: 'Hits required to discard nested island',
      maxLoops: 'Retained Outer Loops',
      maxLoopsHint: '0 = Retain all qualified contours',
      sec3: '03. RESAMPLING & LAPLACIAN SMOOTHING',
      targetK: 'Max Vertex Budget (K)',
      targetKHint: 'Upper ceiling for trajectory discretization',
      minK: 'Min Vertex Floor',
      minKHint: 'Guaranteed resolution floor',
      smoothIter: 'Laplacian Passes',
      smoothIterHint: 'Iterative coordinate relaxation cycles',
      smoothWeight: 'Laplacian Weight (w)',
      smoothWeightHint: 'Kernel: w·P₋₁ + (1−2w)·P + w·P₊₁',
      sec4: '04. VIEWPORT OVERLAYS',
      bg: 'Backdrop Source',
      bgOpt: [
        ['source', 'Raw Media Input'],
        ['dim', 'Dimmed Media (-68% Gain)'],
        ['mask', 'Binary Luma Mask'],
        ['black', 'Solid Black'],
        ['white', 'Solid White']
      ],
      showFill: 'Silhouette Fill',
      showContour: 'Isocontour Stroke',
      showRaw: 'Stepped Dual-Grid Edges',
      showRejected: 'Rejected Loops',
      showRejectedHint: '<span class="swatch swatch-hole"></span>Holes <span class="swatch swatch-enclosed"></span>Enclosed <span class="swatch swatch-dust"></span>Noise',
      showPoints: 'Vertex Nodes',
      showGrid: 'Discretization Matrix',
      lineWidth: 'Stroke Width',
      lineColor: 'Stroke Color',
      sec5: '05. EXPORT PIPELINE',
      expMode: 'Render Style',
      expModeOpt: [
        ['outline', 'Pure Outline (Lines Only)'],
        ['fill', 'Silhouette (Solid Fill)'],
        ['composite', 'Full Viewport Composite']
      ],
      expFormat: 'Encoding Format',
      expFormatOpt: [
        ['ndjson', 'NDJSON (Line-delimited JSON)'],
        ['json', 'JSON (Monolithic Array)'],
        ['csv', 'CSV (Point Coordinate Matrix)'],
        ['bacs', 'BACS (Packed Binary Stream)']
      ],
      expRange: 'Temporal Range',
      expTo: 'to',
      expUnitSec: 'sec',
      expFps: 'Extraction Cadence',
      btnExport: 'Extract Trajectory',
      btnCancel: 'Abort Task',
      progressInit: 'Initializing pipeline...',
      progressFrame: (cur, total, eta) => `${cur} / ${total} frames · ~${eta}s remaining`,
      progressDone: n => `Complete: Extracted ${n} frames`,
      progressAborted: 'Task aborted',
      progressError: msg => `Pipeline error: ${msg}`,
      btnSvg: 'Frame SVG',
      btnPng: 'Frame PNG',
      btnRec: 'Record WebM',
      btnRecStop: '■ Stop Recording',
      exportNote: 'Batch extraction performs deterministic frame-stepping; stream recording captures live viewport rendering in real-time.',
      btnReset: 'Reset to Defaults',
      videoCodecErr: 'Hardware decode error: The browser cannot decode this video codec. Convert to MP4 (H.264) or WebM using ffmpeg, or switch to CLI mode.',
      dataParseErr: msg => `Failed to parse trajectory dataset: ${msg}`,
      exportPrompt: 'Please load a video, image, or benchmark demo before extracting.',
      recordPrompt: 'Stream capture requires an active continuous source (video, benchmark demo, or trajectory file).',
      recordUnsupported: 'MediaRecorder stream capture is unsupported in this browser environment.',
      whiteField: 'INVERT (WHITE)',
      blackField: 'NORMAL (BLACK)',
      outerLoops: 'OUTER',
      holes: 'HOLES',
      enclosed: 'ENCLOSED',
      vertices: 'VERTICES',
      latency: 'LATENCY',
      polarity: 'POLARITY'
    },
    zh: {
      lang: '繁體中文',
      title: 'CONTOUR SAMPLER',
      sub: '拓撲雙網格邊界提取儀器',
      badge: '專業工作台',
      attr: '由 Claude 協同製作',
      openMedia: '開啟媒體檔案',
      openMediaTip: '開啟視訊或圖像媒體 (MP4, WebM, MOV, PNG, JPG)',
      importData: '載入輪廓數據',
      importDataTip: '載入已提取之輪廓數據集 (BACS, NDJSON, JSON, CSV)',
      demo: '示範動畫序列',
      demoTip: '執行內建幾何示範與基準測試序列',
      dropHeading: '載入視訊或圖像媒體',
      dropSub: '將檔案拖放至畫布，或透過上方工具列開啟',
      dropSecurity: '純前端記憶體計算 · 資料不離開瀏覽器',
      playTip: '播放 / 暫停 [空白鍵]',
      pauseTip: '暫停 [空白鍵]',
      prevTip: '步進上一幀 [←]',
      nextTip: '步進下一幀 [→]',
      seekLabel: '時間進度軸',
      velocityLabel: '播放速率',
      systemStandby: '儀器待命 — 請載入視訊源或啟動示範動畫',
      sec1: '01. 空間離散化與二值化',
      res: '取樣網格',
      resOpt: [
        ['160x90', '160 × 90（預覽）'],
        ['320x180', '320 × 180（標準基準）'],
        ['480x270', '480 × 270（精細）'],
        ['640x360', '640 × 360（高精度）'],
        ['960x540', '960 × 540（極致解析度）']
      ],
      threshold: '亮度門檻 (Luma)',
      thresholdHint: '像素二值化臨界強度 [1–254]',
      bgMode: '極性判斷邏輯',
      bgModeOpt: [
        ['auto', '邊界自動判定（最外圈場主導）'],
        ['white', '固定白底反轉（黑剪影）'],
        ['black', '固定黑底正常（白剪影）']
      ],
      sec2: '02. 拓撲邊界與迴圈篩選',
      minLoopPoints: '最小迴圈節點數',
      minLoopPointsHint: '抑制次像素高頻光柵雜訊',
      minArea: '最小外框面積',
      minAreaHint: '鞋帶公式計算面積門檻（格²）',
      enclosedSamples: '包含判定採樣點數',
      enclosedSamplesHint: '單一迴圈射線測試採樣密度',
      enclosedVotes: '內含判定門檻票數',
      enclosedVotesHint: '判定為巢狀內含物並捨棄所需的命中數',
      maxLoops: '最大保留外框數',
      maxLoopsHint: '0 = 保留所有符合資格的有效輪廓',
      sec3: '03. 等距重取樣與平滑',
      targetK: '節點預算上限 (K)',
      targetKHint: '輪廓曲線離散化節點上限',
      minK: '節點預算下限',
      minKHint: '空間幾何解析度下限',
      smoothIter: '拉普拉斯平滑迭代',
      smoothIterHint: '封閉迴圈座標鬆弛迭代次數',
      smoothWeight: '平滑加權係數 (w)',
      smoothWeightHint: '核權重: w·P₋₁ + (1−2w)·P + w·P₊₁',
      sec4: '04. 視圖圖層與顯示',
      bg: '底圖圖層來源',
      bgOpt: [
        ['source', '原始媒體輸入'],
        ['dim', '原始媒體暗化 (-68% 增益)'],
        ['mask', '二值化遮罩 (Luma Mask)'],
        ['black', '純黑背景'],
        ['white', '純白背景']
      ],
      showFill: '剪影填色 (Fill)',
      showContour: '等值輪廓線 (Isocontour)',
      showRaw: '階梯狀雙網格邊界',
      showRejected: '捨棄之無效迴圈',
      showRejectedHint: '<span class="swatch swatch-hole"></span>內洞 <span class="swatch swatch-enclosed"></span>內含 <span class="swatch swatch-dust"></span>雜訊',
      showPoints: '重取樣節點',
      showGrid: '雙網格離散矩陣',
      lineWidth: '輪廓線寬度',
      lineColor: '輪廓線顏色',
      sec5: '05. 數據匯出管道',
      expMode: '算圖風格',
      expModeOpt: [
        ['outline', '純線條輪廓（只畫線條）'],
        ['fill', '剪影填色（黑白遮罩）'],
        ['composite', '完整畫面合成']
      ],
      expFormat: '編碼封裝格式',
      expFormatOpt: [
        ['ndjson', 'NDJSON（換行分隔 JSON）'],
        ['json', 'JSON（完整陣列物件）'],
        ['csv', 'CSV（座標矩陣表格）'],
        ['bacs', 'BACS（緊湊二進位串流）']
      ],
      expRange: '時間區間',
      expTo: '至',
      expUnitSec: '秒',
      expFps: '提取幀率 (FPS)',
      btnExport: '匯出輪廓軌跡數據',
      btnCancel: '中斷運算任務',
      progressInit: '正在初始化管道...',
      progressFrame: (cur, total, eta) => `${cur} / ${total} 幀 · 預估剩餘 ${eta} 秒`,
      progressDone: n => `計算完成：共提取 ${n} 幀`,
      progressAborted: '運算任務已中止',
      progressError: msg => `管道運算異常: ${msg}`,
      btnSvg: '當前幀 SVG',
      btnPng: '當前幀 PNG',
      btnRec: '錄製視訊 WebM',
      btnRecStop: '■ 停止錄製',
      exportNote: '批次提取執行逐幀確定性步進運算；串流錄製即時捕獲視窗渲染輸出。',
      btnReset: '恢復原廠預設參數',
      videoCodecErr: '硬體解碼錯誤：當前瀏覽器無法解碼此媒體編碼。請先使用 ffmpeg 轉碼為 MP4 (H.264) 或 WebM，或改用 CLI 命令列模式。',
      dataParseErr: msg => `解析輪廓檔案失敗: ${msg}`,
      exportPrompt: '請先載入視訊、圖像或示範動畫來源。',
      recordPrompt: '串流錄製需要連續序列來源（視訊、示範動畫或輪廓資料檔）。',
      recordUnsupported: '當前瀏覽器環境不支援 MediaRecorder 畫面串流錄製。',
      whiteField: '反轉白底',
      blackField: '正規黑底',
      outerLoops: '外框',
      holes: '內洞',
      enclosed: '內含',
      vertices: '節點數',
      latency: '延遲',
      polarity: '極性'
    }
  };

  const LANG_KEY = 'contour-sampler-lang';
  let curLang = 'zh';
  try {
    const savedLang = localStorage.getItem(LANG_KEY);
    if (savedLang && I18N[savedLang]) curLang = savedLang;
  } catch (e) { /* sandbox safe */ }

  function getSchema() {
    const s = I18N[curLang];
    return [
      { section: s.sec1, open: true, items: [
        { key: 'res', label: s.res, type: 'select', options: s.resOpt },
        { key: 'threshold', label: s.threshold, type: 'range', min: 1, max: 254, step: 1, hint: s.thresholdHint },
        { key: 'bgMode', label: s.bgMode, type: 'select', options: s.bgModeOpt },
      ] },
      { section: s.sec2, open: true, items: [
        { key: 'minLoopPoints', label: s.minLoopPoints, type: 'range', min: 4, max: 200, step: 1, hint: s.minLoopPointsHint },
        { key: 'minArea', label: s.minArea, type: 'range', min: 0, max: 500, step: 1, hint: s.minAreaHint },
        { key: 'enclosedSamples', label: s.enclosedSamples, type: 'range', min: 1, max: 32, step: 1, hint: s.enclosedSamplesHint },
        { key: 'enclosedVotes', label: s.enclosedVotes, type: 'range', min: 1, max: 32, step: 1, hint: s.enclosedVotesHint },
        { key: 'maxLoops', label: s.maxLoops, type: 'range', min: 0, max: 20, step: 1, hint: s.maxLoopsHint },
      ] },
      { section: s.sec3, open: true, items: [
        { key: 'targetK', label: s.targetK, type: 'range', min: 16, max: 2000, step: 1, hint: s.targetKHint },
        { key: 'minK', label: s.minK, type: 'range', min: 3, max: 1000, step: 1, hint: s.minKHint },
        { key: 'smoothIter', label: s.smoothIter, type: 'range', min: 0, max: 20, step: 1, hint: s.smoothIterHint },
        { key: 'smoothWeight', label: s.smoothWeight, type: 'range', min: 0, max: 0.33, step: 0.01, hint: s.smoothWeightHint },
      ] },
      { section: s.sec4, open: true, items: [
        { key: 'bg', label: s.bg, type: 'select', options: s.bgOpt },
        { key: 'showFill', label: s.showFill, type: 'checkbox' },
        { key: 'showContour', label: s.showContour, type: 'checkbox' },
        { key: 'showRaw', label: s.showRaw, type: 'checkbox' },
        { key: 'showRejected', label: s.showRejected, type: 'checkbox', hint: s.showRejectedHint },
        { key: 'showPoints', label: s.showPoints, type: 'checkbox' },
        { key: 'showGrid', label: s.showGrid, type: 'checkbox' },
        { key: 'lineWidth', label: s.lineWidth, type: 'range', min: 0.5, max: 8, step: 0.5 },
        { key: 'lineColor', label: s.lineColor, type: 'color' },
      ] },
    ];
  }

  const DEFAULTS = Object.assign({}, Core.defaults, {
    res: '320x180', bg: 'dim', showFill: false, showContour: true, showRaw: false, showRejected: false,
    showPoints: false, showGrid: false, lineWidth: 2, lineColor: '#38bdf8',
  });
  delete DEFAULTS.sampleW; delete DEFAULTS.sampleH;

  const STORE_KEY = 'contour-sampler-params-v2';
  let P = Object.assign({}, DEFAULTS);
  try { Object.assign(P, JSON.parse(localStorage.getItem(STORE_KEY) || '{}')); } catch (e) { /* sandbox safe */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(P)); } catch (e) { /* ignore */ } };
  const sampleSize = () => P.res.split('x').map(Number);
  const coreOpts = () => {
    const [w, h] = sampleSize();
    return Object.assign({}, P, { sampleW: w, sampleH: h });
  };

  function buildPanel() {
    const root = $('params');
    root.innerHTML = '';
    const schema = getSchema();
    for (const sec of schema) {
      const d = document.createElement('details');
      d.className = 'group';
      if (sec.open) d.open = true;
      d.innerHTML = `<summary class="group-header">
        <span class="group-title">${sec.section}</span>
        <svg class="chevron" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>
      </summary>`;
      const content = document.createElement('div');
      content.className = 'group-content';
      for (const it of sec.items) {
        const row = document.createElement('div');
        row.className = 'row';
        const id = 'p-' + it.key;
        let ctl = '';
        if (it.type === 'range') {
          ctl = `<input id="${id}" type="range" min="${it.min}" max="${it.max}" step="${it.step}"><output for="${id}"></output>`;
        } else if (it.type === 'select') {
          ctl = `<select id="${id}">${it.options.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('')}</select>`;
        } else if (it.type === 'checkbox') {
          ctl = `<label class="toggle-wrap" for="${id}"><input id="${id}" class="toggle-input" type="checkbox"><span class="toggle-switch"></span></label>`;
        } else if (it.type === 'color') {
          ctl = `<input id="${id}" type="color">`;
        }
        row.innerHTML = `<label for="${id}">${it.label}</label><div class="ctl">${ctl}</div>` + (it.hint ? `<div class="hint">${it.hint}</div>` : '');
        content.appendChild(row);
      }
      d.appendChild(content);
      root.appendChild(d);
    }
    for (const sec of schema) for (const it of sec.items) {
      const el = $('p-' + it.key);
      const out = el.parentElement.querySelector('output');
      const show = () => { if (out) out.textContent = String(P[it.key]); };
      if (it.type === 'checkbox') el.checked = !!P[it.key]; else el.value = P[it.key];
      show();
      el.addEventListener('input', () => {
        P[it.key] = it.type === 'checkbox' ? el.checked : it.type === 'range' ? +el.value : el.value;
        show(); save(); refresh();
      });
    }
  }

  function setLanguage(lang) {
    if (!I18N[lang]) lang = 'zh';
    curLang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';

    $('lang-zh').classList.toggle('active', lang === 'zh');
    $('lang-en').classList.toggle('active', lang === 'en');

    const s = I18N[lang];
    $('txt-title').textContent = s.title;
    $('txt-sub').textContent = s.sub;
    $('txt-badge').textContent = s.badge;
    $('txt-open-media').textContent = s.openMedia;
    $('tip-open-media').title = s.openMediaTip;
    $('txt-import-data').textContent = s.importData;
    $('tip-import-data').title = s.importDataTip;
    $('txt-demo').textContent = s.demo;
    $('btn-demo').title = s.demoTip;

    $('txt-drop-heading').textContent = s.dropHeading;
    $('txt-drop-sub').textContent = s.dropSub;
    const secBox = $('txt-drop-sec');
    if (secBox) {
      const sp = secBox.querySelector('span');
      if (sp) sp.textContent = s.dropSecurity;
    }

    $('btn-prev').title = s.prevTip;
    $('btn-next').title = s.nextTip;
    $('seek').setAttribute('aria-label', s.seekLabel);
    $('rate').setAttribute('aria-label', s.velocityLabel);
    $('rate').title = s.velocityLabel;

    $('txt-exp-title').textContent = s.sec5;
    if ($('txt-exp-mode-label')) $('txt-exp-mode-label').textContent = s.expMode;
    if ($('exp-mode')) {
      const curMode = $('exp-mode').value;
      $('exp-mode').innerHTML = s.expModeOpt.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('');
      $('exp-mode').value = curMode || 'outline';
    }

    $('txt-exp-fmt-label').textContent = s.expFormat;
    const curFmt = $('exp-format').value;
    $('exp-format').innerHTML = s.expFormatOpt.map(o => `<option value="${o[0]}">${o[1]}</option>`).join('');
    $('exp-format').value = curFmt || 'ndjson';

    $('txt-exp-range-label').textContent = s.expRange;
    $('txt-exp-to').textContent = s.expTo;
    $('txt-exp-unit').textContent = s.expUnitSec;
    $('txt-exp-fps-label').textContent = s.expFps;
    $('txt-btn-export').textContent = s.btnExport;
    $('btn-cancel').textContent = s.btnCancel;
    $('btn-svg').textContent = s.btnSvg;
    $('btn-png').textContent = s.btnPng;
    if (!$('btn-rec').dataset.rec) $('btn-rec').textContent = s.btnRec;
    $('txt-exp-note').textContent = s.exportNote;
    $('txt-btn-reset').textContent = s.btnReset;
    if ($('txt-attr')) $('txt-attr').textContent = s.attr;

    buildPanel();
    updatePlayBtn();
    updateStats();
  }

  $('lang-zh').addEventListener('click', () => setLanguage('zh'));
  $('lang-en').addEventListener('click', () => setLanguage('en'));

  // ================================================================== Media & Data Sources
  const video = $('video'), image = $('image');
  const view = $('view'), vctx = view.getContext('2d');
  const samp = document.createElement('canvas');
  const sctx = samp.getContext('2d', { willReadFrequently: true });
  const maskCanvas = document.createElement('canvas');
  const mctx = maskCanvas.getContext('2d');
  const demoCanvas = document.createElement('canvas');
  demoCanvas.width = 1280; demoCanvas.height = 720;

  const S = {
    kind: 'none',        // 'video' | 'image' | 'demo' | 'data'
    name: '',
    playing: false,
    demoT: 0, demoLast: 0,
    data: null,          // { meta, frames }
    dataT: 0,
    result: null,
    frameNo: 0,
    ms: 0,
    busy: false,
  };

  function srcSize() {
    if (S.kind === 'video') return [video.videoWidth || 16, video.videoHeight || 9];
    if (S.kind === 'image') return [image.naturalWidth || 16, image.naturalHeight || 9];
    if (S.kind === 'demo') return [demoCanvas.width, demoCanvas.height];
    if (S.kind === 'data') return [S.data.meta.w, S.data.meta.h];
    return [16, 9];
  }
  const duration = () => S.kind === 'video' ? (video.duration || 0) : S.kind === 'demo' ? 12 :
    S.kind === 'data' ? S.data.frames.length / S.data.meta.fps : 0;
  const curTime = () => S.kind === 'video' ? video.currentTime : S.kind === 'demo' ? S.demoT : S.kind === 'data' ? S.dataT : 0;
  const fps = () => S.kind === 'data' ? S.data.meta.fps : (+$('exp-fps').value || 30);

  function setKind(kind, name) {
    pause();
    S.kind = kind; S.name = name || '';
    $('drop-hint').hidden = kind !== 'none';
    const d = duration();
    $('exp-start').value = 0;
    $('exp-end').value = d ? d.toFixed(2) : 0;
    resizeView();
    refresh();
  }

  function openFile(file) {
    if (!file) return;
    const kind = Fmt.detectKind(file.name);
    if (kind && kind !== 'svg') return openData(file, kind);
    const url = URL.createObjectURL(file);
    if (file.type.startsWith('image/')) {
      image.onload = () => setKind('image', file.name);
      image.src = url;
    } else {
      video.onloadeddata = () => { video.onloadeddata = null; setKind('video', file.name); };
      video.onerror = () => alert(I18N[curLang].videoCodecErr);
      video.src = url;
      video.load();
    }
  }

  async function openData(file, kind) {
    try {
      const buf = kind === 'bacs' ? await file.arrayBuffer() : await file.text();
      S.data = Fmt.parse(buf, kind);
      S.dataT = 0;
      setKind('data', file.name);
    } catch (e) {
      alert(I18N[curLang].dataParseErr(e.message));
    }
  }

  // ---- Synthetic Benchmark Scene: Multi-loop, Inverted Cavity & Enclosure ----
  function drawDemo(t) {
    const c = demoCanvas.getContext('2d'), W = demoCanvas.width, H = demoCanvas.height;
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#000';
    // Dynamic Primary Silhouette
    const ax = W * (0.32 + 0.08 * Math.sin(t * 0.7)), ay = H * 0.52, r = H * (0.22 + 0.03 * Math.sin(t * 1.3));
    c.beginPath();
    c.moveTo(ax, ay - r * 0.72);
    c.bezierCurveTo(ax + r * 0.5, ay - r * 1.15, ax + r * 1.25, ay - r * 0.7, ax + r * 1.0, ay + r * 0.15);
    c.bezierCurveTo(ax + r * 0.85, ay + r * 0.85, ax + r * 0.35, ay + r * 1.1, ax, ay + r * 0.88);
    c.bezierCurveTo(ax - r * 0.35, ay + r * 1.1, ax - r * 0.85, ay + r * 0.85, ax - r * 1.0, ay + r * 0.15);
    c.bezierCurveTo(ax - r * 1.25, ay - r * 0.7, ax - r * 0.5, ay - r * 1.15, ax, ay - r * 0.72);
    c.fill();
    c.fillRect(ax - r * 0.05, ay - r * 1.05, r * 0.1, r * 0.4);
    // Rotating Annular Toroid (Inverted Hole Test)
    const rx = W * 0.72, ry = H * (0.45 + 0.1 * Math.cos(t * 0.9));
    c.save(); c.translate(rx, ry); c.rotate(t * 0.6);
    c.beginPath(); c.ellipse(0, 0, H * 0.2, H * 0.14, 0, 0, Math.PI * 2);
    c.ellipse(0, 0, H * 0.1, H * 0.06, 0, 0, Math.PI * 2, true);
    c.fill('evenodd');
    // Nested Interior Island (Enclosed Ray-Casting Test)
    c.beginPath(); c.arc(0, 0, H * 0.025, 0, Math.PI * 2); c.fill();
    c.restore();
    // High-Frequency Speckle Noise
    for (let i = 0; i < 14; i++) {
      const x = (Math.sin(i * 12.9898 + t * 0.4) * 0.5 + 0.5) * W, y = (Math.sin(i * 78.233) * 0.5 + 0.5) * H;
      c.fillRect(x, y, 4, 4);
    }
  }

  // ================================================================== Tracing & Viewport Rendering
  function currentSourceEl() {
    if (S.kind === 'video') return video;
    if (S.kind === 'image') return image;
    if (S.kind === 'demo') return demoCanvas;
    return null;
  }

  function sampleCurrent() {
    const el = currentSourceEl();
    if (!el) return null;
    const [w, h] = sampleSize();
    if (samp.width !== w || samp.height !== h) { samp.width = w; samp.height = h; }
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(el, 0, 0, w, h);
    const px = sctx.getImageData(0, 0, w, h).data;
    const L = Core.lumaFromRGBA(px, w * h);
    const t0 = performance.now();
    const r = Core.processLuma(L, w, h, coreOpts());
    S.ms = performance.now() - t0;
    r.w = w; r.h = h;
    return r;
  }

  function dataFrameAt(t) {
    const d = S.data;
    const i = Math.max(0, Math.min(d.frames.length - 1, Math.floor(t * d.meta.fps + 1e-6)));
    return { i, fr: d.frames[i] };
  }

  function resizeView() {
    const vp = $('viewport');
    const [sw, sh] = S.kind === 'none' ? [16, 9] : srcSize();
    const aw = vp.clientWidth - 2, ah = vp.clientHeight - 2;
    let w = aw, h = aw * sh / sw;
    if (h > ah) { h = ah; w = ah * sw / sh; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.style.width = Math.round(w) + 'px';
    view.style.height = Math.round(h) + 'px';
    view.width = Math.max(2, Math.round(w * dpr));
    view.height = Math.max(2, Math.round(h * dpr));
  }

  function tracePath(ctx, pts, sx, sy, closed) {
    ctx.moveTo(pts[0][0] * sx, pts[0][1] * sy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * sx, pts[i][1] * sy);
    if (closed) ctx.closePath();
  }

  function draw() {
    const W = view.width, H = view.height;
    const dpr = W / parseFloat(view.style.width || W);
    vctx.setTransform(1, 0, 0, 1, 0, 0);
    vctx.fillStyle = '#080a0f';
    vctx.fillRect(0, 0, W, H);
    if (S.kind === 'none') return;

    let gw, gh, whiteBg, kept, all = null, mask = null;
    if (S.kind === 'data') {
      const { i, fr } = dataFrameAt(S.dataT);
      S.frameNo = i;
      gw = S.data.meta.w; gh = S.data.meta.h; whiteBg = fr.whiteBg; kept = fr.loops;
    } else {
      const r = S.result;
      if (!r) return;
      gw = r.w; gh = r.h; whiteBg = r.whiteBg; kept = r.kept; all = r.all; mask = r.mask;
    }
    const sx = W / gw, sy = H / gh;
    const fg = whiteBg ? '#000' : '#fff', bgc = whiteBg ? '#fff' : '#000';

    // Backdrop Layer
    const el = currentSourceEl();
    if ((P.bg === 'source' || P.bg === 'dim') && el) {
      vctx.imageSmoothingEnabled = true;
      vctx.drawImage(el, 0, 0, W, H);
      if (P.bg === 'dim') { vctx.fillStyle = 'rgba(8,10,15,0.68)'; vctx.fillRect(0, 0, W, H); }
    } else if (P.bg === 'mask' && mask) {
      if (maskCanvas.width !== gw || maskCanvas.height !== gh) { maskCanvas.width = gw; maskCanvas.height = gh; }
      const img = mctx.createImageData(gw, gh);
      const on = whiteBg ? 0 : 255, off = whiteBg ? 255 : 0;
      for (let i = 0, j = 0; i < mask.length; i++, j += 4) {
        const v = mask[i] ? on : off;
        img.data[j] = img.data[j + 1] = img.data[j + 2] = v; img.data[j + 3] = 255;
      }
      mctx.putImageData(img, 0, 0);
      vctx.imageSmoothingEnabled = false;
      vctx.globalAlpha = 0.55;
      vctx.drawImage(maskCanvas, 0, 0, W, H);
      vctx.globalAlpha = 1;
    } else if (P.bg === 'white' || (S.kind === 'data' && P.bg !== 'black' && whiteBg && !el)) {
      vctx.fillStyle = P.bg === 'white' ? '#fff' : bgc; vctx.fillRect(0, 0, W, H);
    } else if (S.kind === 'data' && P.bg !== 'black' && !el) {
      vctx.fillStyle = bgc; vctx.fillRect(0, 0, W, H);
    }

    // Dual-Grid Matrix
    if (P.showGrid && sx >= 3) {
      vctx.strokeStyle = 'rgba(255,255,255,0.08)'; vctx.lineWidth = 1;
      vctx.beginPath();
      for (let x = 0; x <= gw; x++) { vctx.moveTo(Math.round(x * sx) + 0.5, 0); vctx.lineTo(Math.round(x * sx) + 0.5, H); }
      for (let y = 0; y <= gh; y++) { vctx.moveTo(0, Math.round(y * sy) + 0.5); vctx.lineTo(W, Math.round(y * sy) + 0.5); }
      vctx.stroke();
    }

    // Silhouette Fill
    if (P.showFill && kept.length) {
      vctx.fillStyle = fg;
      vctx.beginPath();
      for (const l of kept) tracePath(vctx, l.points, sx, sy, true);
      vctx.fill('evenodd');
    }

    const lw = P.lineWidth * dpr;
    vctx.lineJoin = 'round'; vctx.lineCap = 'round';
    // Rejected Loops Diagnostic Layer
    if (P.showRejected && all) {
      const col = { hole: '#f87171', enclosed: '#c084fc', speck: '#64748b', dust: '#64748b', outer: 'rgba(56,189,248,0.45)' };
      for (const l of all) {
        if (l.kept || l.pts.length < 2) continue;
        vctx.strokeStyle = col[l.cls] || '#64748b'; vctx.lineWidth = Math.max(1, lw * 0.6);
        vctx.beginPath(); tracePath(vctx, l.pts, sx, sy, true); vctx.stroke();
      }
    }
    // Stepped Dual-Grid Edges
    if (P.showRaw) {
      vctx.strokeStyle = 'rgba(226,232,240,0.65)'; vctx.lineWidth = Math.max(1, lw * 0.5);
      for (const l of kept) if (l.raw) { vctx.beginPath(); tracePath(vctx, l.raw, sx, sy, true); vctx.stroke(); }
    }
    // Smooth Isocontour Stroke
    if (P.showContour) {
      vctx.strokeStyle = P.lineColor; vctx.lineWidth = lw;
      vctx.beginPath();
      for (const l of kept) tracePath(vctx, l.points, sx, sy, true);
      vctx.stroke();
    }
    // Resampled Vertex Nodes
    if (P.showPoints) {
      vctx.fillStyle = '#ffffff';
      const r = Math.max(1.5, lw * 0.9);
      for (const l of kept) for (const p of l.points) { vctx.beginPath(); vctx.arc(p[0] * sx, p[1] * sy, r, 0, Math.PI * 2); vctx.fill(); }
    }
  }

  // ================================================================== Custom Export Rendering (Outline / Silhouette / Composite)
  function renderExportCanvas(targetCanvas, mode) {
    const tctx = targetCanvas.getContext('2d');
    const W = targetCanvas.width, H = targetCanvas.height;
    const dpr = W / parseFloat(view.style.width || W);
    tctx.setTransform(1, 0, 0, 1, 0, 0);

    if (mode === 'composite') {
      tctx.drawImage(view, 0, 0, W, H);
      return;
    }

    let gw, gh, whiteBg, kept;
    if (S.kind === 'data') {
      const { fr } = dataFrameAt(S.dataT);
      gw = S.data.meta.w; gh = S.data.meta.h; whiteBg = fr.whiteBg; kept = fr.loops;
    } else {
      const r = S.result;
      if (!r) return;
      gw = r.w; gh = r.h; whiteBg = r.whiteBg; kept = r.kept;
    }
    const sx = W / gw, sy = H / gh;
    const fg = whiteBg ? '#000000' : '#ffffff';
    const bg = whiteBg ? '#ffffff' : '#080a0f';

    if (mode === 'outline') {
      // Pure line contour on solid dark obsidian field
      tctx.fillStyle = '#080a0f';
      tctx.fillRect(0, 0, W, H);
      tctx.strokeStyle = P.lineColor;
      tctx.lineWidth = Math.max(1, P.lineWidth * dpr);
      tctx.lineJoin = 'round';
      tctx.lineCap = 'round';
      tctx.beginPath();
      for (const l of kept) tracePath(tctx, l.points, sx, sy, true);
      tctx.stroke();
    } else if (mode === 'fill') {
      // High-contrast binary silhouette fill
      tctx.fillStyle = bg;
      tctx.fillRect(0, 0, W, H);
      tctx.fillStyle = fg;
      tctx.beginPath();
      for (const l of kept) tracePath(tctx, l.points, sx, sy, true);
      tctx.fill('evenodd');
    }
  }

  function updateStats() {
    const st = $('stats');
    const s = I18N[curLang];
    if (S.kind === 'none') {
      st.innerHTML = `<div class="stat-idle">${s.systemStandby}</div>`;
      return;
    }
    const t = curTime(), d = duration();
    $('time').textContent = `${fmtTime(t)} / ${fmtTime(d)}`;
    if (!seeking) $('seek').value = d ? Math.round(1000 * t / d) : 0;
    
    const items = [];
    const sourceName = escapeHtml(S.name || S.kind).toUpperCase();
    items.push(`<div class="stat-item"><span class="stat-label">SRC</span><span class="stat-val" title="${sourceName}">${sourceName}</span></div>`);
    
    if (S.kind === 'data') {
      const { i, fr } = dataFrameAt(S.dataT);
      const totalPts = fr.loops.reduce((acc, l) => acc + l.points.length, 0);
      items.push(
        `<div class="stat-item"><span class="stat-label">FR</span><span class="stat-val">${i} <small style="color:var(--text-muted)">/ ${S.data.frames.length}</small></span></div>`,
        `<div class="stat-item"><span class="stat-label">GRID</span><span class="stat-val">${S.data.meta.w}×${S.data.meta.h}</span></div>`,
        `<div class="stat-item is-outer"><span class="stat-label">${s.outerLoops}</span><span class="stat-val">${fr.loops.length}</span></div>`,
        `<div class="stat-item"><span class="stat-label">${s.vertices}</span><span class="stat-val">${totalPts}</span></div>`
      );
    } else if (S.result) {
      const r = S.result, c = { outer: 0, enclosed: 0, hole: 0, speck: 0, dust: 0 };
      for (const l of r.all) c[l.cls]++;
      const curFrame = Math.floor(t * fps() + 1e-6);
      const totalPts = r.kept.reduce((acc, l) => acc + l.points.length, 0);
      items.push(
        `<div class="stat-item"><span class="stat-label">FRAME</span><span class="stat-val">${curFrame}</span></div>`,
        `<div class="stat-item"><span class="stat-label">GRID</span><span class="stat-val">${r.w}×${r.h}</span></div>`,
        `<div class="stat-item"><span class="stat-label">${s.polarity}</span><span class="stat-val">${r.whiteBg ? s.whiteField : s.blackField}</span></div>`,
        `<div class="stat-item is-outer"><span class="stat-label">${s.outerLoops}</span><span class="stat-val">${r.kept.length}</span></div>`,
        `<div class="stat-item is-hole"><span class="stat-label">${s.holes}</span><span class="stat-val">${c.hole}</span></div>`,
        `<div class="stat-item is-enclosed"><span class="stat-label">${s.enclosed}</span><span class="stat-val">${c.enclosed}</span></div>`,
        `<div class="stat-item"><span class="stat-label">${s.vertices}</span><span class="stat-val">${totalPts}</span></div>`,
        `<div class="stat-item is-speed"><span class="stat-label">${s.latency}</span><span class="stat-val">${S.ms.toFixed(1)}ms</span></div>`
      );
    }
    st.innerHTML = items.join('');
  }

  const fmtTime = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(2).padStart(5, '0')}`; };
  const escapeHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function refresh() {
    if (S.kind === 'demo') drawDemo(S.demoT);
    if (S.kind !== 'data' && S.kind !== 'none') S.result = sampleCurrent();
    draw();
    updateStats();
  }

  // ================================================================== Transport & Keybindings
  const PLAY_SVG = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M6.3 3.6c-.8-.5-1.8.1-1.8 1v10.8c0 .9 1 1.5 1.8 1l8.8-5.4c.8-.5.8-1.5 0-2L6.3 3.6z"/></svg>';
  const PAUSE_SVG = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><rect x="4.5" y="4" width="3.5" height="12" rx="1"/><rect x="12" y="4" width="3.5" height="12" rx="1"/></svg>';

  function updatePlayBtn() {
    const btn = $('btn-play');
    if (!btn) return;
    const s = I18N[curLang];
    btn.innerHTML = S.playing ? PAUSE_SVG : PLAY_SVG;
    btn.setAttribute('title', S.playing ? s.pauseTip : s.playTip);
    btn.setAttribute('aria-label', S.playing ? s.pauseTip : s.playTip);
  }

  let rafId = 0;
  function loop(now) {
    if (!S.playing) return;
    const dt = Math.min(0.1, (now - (S.demoLast || now)) / 1000) * (+$('rate').value);
    S.demoLast = now;
    if (S.kind === 'demo') S.demoT = (S.demoT + dt) % 12;
    if (S.kind === 'data') {
      S.dataT += dt;
      if (S.dataT >= duration()) { S.dataT = duration() - 1e-3; pause(); }
    }
    refresh();
    rafId = requestAnimationFrame(loop);
  }
  function videoTick() {
    if (!S.playing || S.kind !== 'video') return;
    refresh();
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(videoTick);
    else rafId = requestAnimationFrame(videoTick);
  }
  function play() {
    if (S.kind === 'none' || S.kind === 'image') return;
    S.playing = true;
    updatePlayBtn();
    if (S.kind === 'video') {
      video.playbackRate = +$('rate').value;
      video.play().then(videoTick).catch(() => pause());
    } else {
      S.demoLast = 0;
      rafId = requestAnimationFrame(loop);
    }
  }
  function pause() {
    S.playing = false;
    updatePlayBtn();
    if (!video.paused) video.pause();
    cancelAnimationFrame(rafId);
  }
  video.addEventListener('ended', () => { pause(); refresh(); });
  video.addEventListener('seeked', () => { if (!S.playing && !S.busy) refresh(); });

  function seekTo(t) {
    const d = duration();
    t = Math.max(0, Math.min(d ? d - 1e-3 : 0, t));
    if (S.kind === 'video') video.currentTime = t;
    else if (S.kind === 'demo') { S.demoT = t; refresh(); }
    else if (S.kind === 'data') { S.dataT = t; refresh(); }
  }
  const step = n => { pause(); seekTo(curTime() + n / fps() + (n > 0 ? 1e-4 : 0)); };

  let seeking = false;
  $('seek').addEventListener('input', e => { seeking = true; seekTo(duration() * e.target.value / 1000); });
  $('seek').addEventListener('change', () => { seeking = false; });
  $('btn-play').addEventListener('click', () => S.playing ? pause() : play());
  $('btn-prev').addEventListener('click', () => step(-1));
  $('btn-next').addEventListener('click', () => step(1));
  $('rate').addEventListener('change', () => { video.playbackRate = +$('rate').value; });

  document.addEventListener('keydown', e => {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'checkbox') return;
    if (e.code === 'Space') { e.preventDefault(); S.playing ? pause() : play(); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  // ================================================================== Drag & Drop Pipeline
  $('file-video').addEventListener('change', e => openFile(e.target.files[0]));
  $('file-data').addEventListener('change', e => openFile(e.target.files[0]));
  $('btn-demo').addEventListener('click', () => { S.demoT = 0; setKind('demo', 'BENCHMARK_DEMO'); });
  const vp = $('viewport');
  ['dragenter', 'dragover'].forEach(ev => window.addEventListener(ev, e => { e.preventDefault(); vp.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => window.addEventListener(ev, e => { e.preventDefault(); vp.classList.remove('drag'); }));
  window.addEventListener('drop', e => openFile(e.dataTransfer.files[0]));
  window.addEventListener('resize', () => { resizeView(); draw(); });
  $('btn-reset').addEventListener('click', () => { P = Object.assign({}, DEFAULTS); save(); buildPanel(); refresh(); });

  // ================================================================== Export Execution
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  const baseName = () => (S.name || 'contours').replace(/\.[^.]+$/, '');

  function seekAndWait(t) {
    return new Promise(res => {
      if (S.kind !== 'video') { seekTo(t); res(); return; }
      if (Math.abs(video.currentTime - t) < 1e-6) { res(); return; }
      const done = () => { video.removeEventListener('seeked', done); res(); };
      video.addEventListener('seeked', done);
      video.currentTime = t;
    });
  }

  let cancelFlag = false;
  $('btn-cancel').addEventListener('click', () => { cancelFlag = true; });

  $('btn-export').addEventListener('click', async () => {
    const s = I18N[curLang];
    if (S.kind === 'none') return alert(s.exportPrompt);
    const kind = $('exp-format').value;
    const enc = Fmt.enc[kind];
    pause();
    let frames = [], meta;
    const [w, h] = S.kind === 'data' ? [S.data.meta.w, S.data.meta.h] : sampleSize();
    const F = fps();
    const t0 = Math.max(0, +$('exp-start').value || 0);
    const t1 = S.kind === 'image' ? t0 : Math.min(duration(), +$('exp-end').value || duration());
    const n = S.kind === 'image' ? 1 : Math.max(1, Math.floor((t1 - t0) * F + 1e-6));
    meta = { w, h, fps: F, start: t0, source: S.name, params: S.kind === 'data' ? (S.data.meta.params || null) : coreOpts() };
    delete (meta.params || {}).res;

    S.busy = true; cancelFlag = false;
    $('btn-export').disabled = true; $('btn-cancel').hidden = false; $('progress').hidden = false;
    $('prog-text').textContent = s.progressInit;
    const parts = [enc.header(meta, n)];
    const tStart = performance.now();
    try {
      for (let i = 0; i < n; i++) {
        if (cancelFlag) throw new Error('cancel');
        const t = t0 + i / F;
        let fr;
        if (S.kind === 'data') {
          const df = dataFrameAt(t).fr;
          fr = { frame: i, time: t, whiteBg: df.whiteBg, loops: df.loops };
          S.dataT = t;
        } else {
          await seekAndWait(S.kind === 'video' ? t + 0.5 / F : t);
          if (S.kind === 'demo') drawDemo(S.demoT);
          const r = sampleCurrent();
          S.result = r;
          fr = { frame: i, time: t, whiteBg: r.whiteBg, loops: r.kept.map(l => ({ area: l.area, rawPoints: l.rawPoints, points: l.points })) };
        }
        parts.push(enc.frame(fr, i));
        if (i % 5 === 0 || i === n - 1) {
          draw(); updateStats();
          const p = (i + 1) / n, el = (performance.now() - tStart) / 1000;
          $('bar').style.width = (p * 100).toFixed(1) + '%';
          $('prog-text').textContent = s.progressFrame(i + 1, n, Math.ceil(el / p - el));
          await new Promise(r => setTimeout(r, 0));
        }
      }
      parts.push(enc.footer());
      const mime = kind === 'bacs' ? 'application/octet-stream' : kind === 'csv' ? 'text/csv' : 'application/json';
      download(new Blob(parts, { type: mime }), `${baseName()}.${kind}`);
      $('prog-text').textContent = s.progressDone(n);
    } catch (e) {
      $('prog-text').textContent = e.message === 'cancel' ? s.progressAborted : s.progressError(e.message);
    } finally {
      S.busy = false;
      $('btn-export').disabled = false; $('btn-cancel').hidden = true;
      refresh();
    }
  });

  // Export SVG with Render Style Support (Pure Outline / Silhouette / Composite)
  $('btn-svg').addEventListener('click', () => {
    if (S.kind === 'none') return;
    let fr, meta;
    if (S.kind === 'data') { fr = dataFrameAt(S.dataT).fr; meta = S.data.meta; }
    else { const r = S.result; fr = { whiteBg: r.whiteBg, loops: r.kept }; meta = { w: r.w, h: r.h }; }
    const mode = $('exp-mode') ? $('exp-mode').value : 'outline';
    const isOutline = mode === 'outline';
    const isFill = mode === 'fill';
    const svg = Fmt.frameToSVG(fr, meta, {
      fill: isFill || (mode === 'composite' && P.showFill),
      stroke: isOutline || P.showContour ? P.lineColor : 'none',
      strokeWidth: Math.max(0.5, P.lineWidth * 0.5),
      bg: !isOutline
    });
    const frameIdx = String(S.kind === 'data' ? S.frameNo : Math.floor(curTime() * fps())).padStart(5, '0');
    download(new Blob([svg], { type: 'image/svg+xml' }), `${baseName()}_${mode}_${frameIdx}.svg`);
  });

  // Export PNG with Render Style Support (Pure Outline on Canvas / Silhouette / Composite)
  $('btn-png').addEventListener('click', () => {
    if (S.kind === 'none') return;
    const mode = $('exp-mode') ? $('exp-mode').value : 'outline';
    const frameIdx = String(S.kind === 'data' ? S.frameNo : Math.floor(curTime() * fps())).padStart(5, '0');
    if (mode === 'composite') {
      view.toBlob(b => download(b, `${baseName()}_composite_${frameIdx}.png`), 'image/png');
      return;
    }
    const c = document.createElement('canvas');
    c.width = view.width; c.height = view.height;
    renderExportCanvas(c, mode);
    c.toBlob(b => download(b, `${baseName()}_${mode}_${frameIdx}.png`), 'image/png');
  });

  // Stream Recording (WebM) with Render Style Support
  $('btn-rec').addEventListener('click', async () => {
    const s = I18N[curLang];
    if (S.kind === 'none' || S.kind === 'image') return alert(s.recordPrompt);
    if (!window.MediaRecorder || !view.captureStream) return alert(s.recordUnsupported);
    const btn = $('btn-rec');
    if (btn.dataset.rec) { btn.dataset.stop = '1'; return; }
    const t0 = +$('exp-start').value || 0, t1 = +$('exp-end').value || duration();
    await seekAndWait(t0);

    const mode = $('exp-mode') ? $('exp-mode').value : 'outline';
    let targetCanvas = view;
    let recCanvas = null;
    if (mode !== 'composite') {
      recCanvas = document.createElement('canvas');
      recCanvas.width = view.width;
      recCanvas.height = view.height;
      targetCanvas = recCanvas;
      renderExportCanvas(recCanvas, mode);
    }

    const stream = targetCanvas.captureStream(Math.min(60, Math.max(24, fps())));
    if (S.kind === 'video') {
      const vs = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
      if (vs) vs.getAudioTracks().forEach(t => stream.addTrack(t));
    }
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 16e6 });
    const chunks = [];
    rec.ondataavailable = e => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      download(new Blob(chunks, { type: 'video/webm' }), `${baseName()}_${mode}_contours.webm`);
      btn.textContent = s.btnRec;
      delete btn.dataset.rec;
      delete btn.dataset.stop;
    };
    btn.dataset.rec = '1';
    btn.textContent = s.btnRecStop;
    rec.start(250);
    play();

    const watch = () => {
      if (recCanvas) renderExportCanvas(recCanvas, mode);
      if (btn.dataset.stop || !S.playing || curTime() >= t1) { pause(); rec.stop(); return; }
      requestAnimationFrame(watch);
    };
    requestAnimationFrame(watch);
  });

  // ================================================================== Initialization
  setLanguage(curLang);
  resizeView();
  if (new URLSearchParams(location.search).has('demo')) { setKind('demo', 'BENCHMARK_DEMO'); }
  draw();
})();
