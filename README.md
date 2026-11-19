# Contour Sampler 拓撲邊界輪廓取樣儀

<p align="center">
  <a href="#english"><b>English</b></a> &nbsp;|&nbsp; <a href="#繁體中文"><b>繁體中文</b></a>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/Built%20with-Claude-D97706?logo=anthropic&logoColor=white" alt="Built with Claude"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="#"><img src="https://img.shields.io/badge/Dependencies-Zero-emerald.svg" alt="Zero Dependencies"></a>
  <a href="#"><img src="https://img.shields.io/badge/Language-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87%20%7C%20English-sky.svg" alt="Bilingual"></a>
</p>

<p align="center">
  <img src="docs/screenshot.png" alt="Contour Sampler Pro Workstation" width="100%">
</p>

---

<a name="english"></a>
## English

> **Web application interface designed and built in collaboration with Claude (Anthropic).**

**Video / Image &rarr; Clean, Closed Topological Vector Contours.**  
A zero-dependency computational geometry toolkit that extracts closed boundary loops from raster video and images using a dual-grid topological marching algorithm, Shoelace-formula hole rejection, equidistant arc-length re-sampling, and Laplacian ring relaxation. Features an in-browser Pro Workstation UI and high-throughput Node.js CLI utilities.

### Key Highlights

- **Bilingual Interface**: One-click toggling between Traditional Chinese and English with automatic local storage persistence.
- **Pure Outline Vector Export**:
  - **Render Styles**: Outline Only, Silhouette Fill, and Viewport Composite.
  - **Multi-Format Export**: Clean SVG paths, high-res transparent/black PNGs, real-time WebM streaming video capture, and BACS / NDJSON / JSON / CSV raw telemetry.
- **Client-Side Privacy**: Runs 100% locally in browser memory via HTML5 Canvas. Zero network latency and zero server-side data leakage.
- **Zero Third-Party Runtime Dependencies**: Pure vanilla JavaScript implementation.

### Features

#### 1. Browser Pro Workstation (`index.html`)
- **Media Ingestion**: Drag-and-drop video/images (MP4, WebM, MOV, PNG, JPG).
- **Interactive Tuning Controls**:
  - **Grid & Binarization**: Sampling grid ($160\times 90$ to $960\times 540$), luminance threshold ($1\text{--}254$), polarity mode (auto, fixed white, fixed black).
  - **Topology & Filtering**: Minimum loop points, Shoelace area threshold, ray-casting enclosed island rejection, and maximum loop count.
  - **Resampling & Smoothing**: Target points $K$, lower bound $\min K$, and closed Laplacian smoothing iterations and weight $w$.
  - **Debug Layers**: Base frame, silhouette, contour lines, dual-grid steps, rejected loop tagging (holes / islands / noise), and resampling vertices.
- **Playback Telemetry**: Frame-stepping (`Left`/`Right`), play/pause (`Space`), adaptive scrub bar, and variable playback speed ($0.25\times\text{--}2.0\times$).
- **Built-in Synthetic Benchmark**: Generates geometric test animations featuring rotating rings, nested holes, isolated islands, and high-frequency noise.

#### 2. Command-Line Interface (`cli/`)
- `cli/sample.js`: Stream video/image sequences through FFmpeg to `.bacs`, `.ndjson`, `.json`, `.csv`, or per-frame `.svg`.
- `cli/decode.js`: Reconstruct vector contours back into outline videos (`--mode outline`), silhouette videos with original audio tracks (`--mode fill`), or image sequences.

### Quick Start

#### In-Browser Workstation
Clone and start a static web server:
```bash
git clone https://github.com/kevinshao2217/caustic_wavetank.git
cd caustic_wavetank
npm start            # Equivalent to npx http-server -p 8080 .
```
Or open `index.html` directly in any web browser without a server.

> **GitHub Pages Deployment**: In repository **Settings** &rarr; **Pages**, set Source to `main` branch root.  
> Append `?demo` to run the automatic benchmark suite: `https://kevinshao2217.github.io/caustic_wavetank/?demo`

#### Command-Line CLI (Requires Node.js 18+ and FFmpeg)
```bash
# 1. Extract contours from video into compact binary stream
node cli/sample.js input.mp4 -o out.bacs --start 0 --duration 10

# 2. Extract with custom grid and parameters to NDJSON
node cli/sample.js input.mp4 --res 640x360 --threshold 100 --maxLoops 0 -o out.ndjson

# 3. Decode into pure outline video
node cli/decode.js out.bacs -o lines.mp4 --mode outline --line 3 --lineColor #38bdf8

# 4. Decode into silhouette video synchronized with source audio
node cli/decode.js out.bacs -o decoded.mp4 --mode fill --audio input.mp4

# 5. Export per-frame SVG vector sequences
node cli/decode.js out.bacs -o svg_frames/ --format svg

# 6. Run algorithmic test suite
npm test
```

### Computational Algorithm

1. **Spatial Discretization**: Downsamples incoming frames to a $W \times H$ grayscale grid (default $320\times 180$).
2. **Polarity Analysis**: Evaluates outer border margins to automatically detect dark-on-light or light-on-dark polarity.
3. **Binarization**: Generates a boolean mask based on the luminance threshold.
4. **Dual-Grid Topology Extraction**: Iterates across inter-pixel boundary segments, constructing directed edges such that foreground pixels lie consistently to the right.
5. **Euler Loop Tracing**: Traverses directed edges into 100% closed, watertight loops with zero dangling vertices.
6. **Shoelace Geometric Classification** ($A = \frac{1}{2}\sum (x_i y_{i+1} - x_{i+1} y_i)$):
   - Vertex count $< \text{minLoopPoints} \to$ noise rejection.
   - Signed Area $A \le 0 \to$ counter-clockwise interior hole.
   - $0 < A \le \text{minArea} \to$ sub-pixel speckle rejection.
   - Multi-ray voting determines nested enclosed islands.
7. **Equidistant Arc-Length Re-sampling & Smoothing**: Re-samples contours into $K$ equidistant points and applies a cyclic Laplacian filter:
   $$P_i \leftarrow w P_{i-1} + (1-2w) P_i + w P_{i+1}$$

### Data Formats

| Format | Extension | Description | Characteristics |
|---|---|---|---|
| **Binary Adapted Contour Stream** | `.bacs` | Packed binary stream | ~25% size of NDJSON, optimal for low-latency pipelines |
| **Newline Delimited JSON** | `.ndjson` | One frame per line JSON | Streaming compatible with Python/Pandas/Node.js |
| **Standard JSON** | `.json` | Complete frame array | Monolithic structured document |
| **CSV Table** | `.csv` | Tabular coordinate matrix | Columns: `frame,time,whiteBg,loop,area,rawPoints,idx,x,y` |
| **Scalable Vector Graphics** | `.svg` | Standalone SVG vector files | Infinite zoom, lossless stroke reproduction |

---

<a name="繁體中文"></a>
## 繁體中文

> **網頁介面由 Claude (Anthropic) 協同設計與製作。**

**影片／圖像 &rarr; 乾淨的封閉拓撲向量輪廓。**  
這是一套零依賴的計算幾何工具組，以雙網格（Dual-Grid）演算法精確追蹤像素交界，結合鞋帶公式區分內洞與外框、等弧長等距重取樣與拉普拉斯環狀平滑濾波。提供專業瀏覽器工作台介面與高效率 Node.js 命令列工具。

### 核心亮點

- **雙語介面（繁體中文 / English）**：頂部導航列支援一鍵即時切換繁體中文與專業英文術語，偏好自動儲存於本機。
- **純線條倒出支援 (Pure Outline Export)**：
  - **算圖風格**：純線條輪廓 (Outline Only)、剪影填色 (Silhouette Fill) 與完整畫面合成 (Viewport Composite)。
  - **多元格式匯出**：一鍵匯出純線條向量 SVG、高解析透明/黑底線圖 PNG、即時串流錄製純線條 WebM 影片，以及 BACS、NDJSON、JSON、CSV 軌跡資料。
- **本機端隱私運算**：純前端 Canvas 與記憶體管道處理，零伺服器傳輸，資料完全保存在本地端。
- **零外部依賴套件**：純原生 JavaScript 實現。

### 功能規格

#### 1. 瀏覽器版工作台（`index.html`）
- **媒體載入**：支援將視訊或圖像拖放至畫布（MP4、WebM、MOV、PNG、JPG）。
- **參數調諧面板**：
  - **空間離散化與二值化**：取樣格點（$160\times 90$ 至 $960\times 540$）、亮度門檻（$1\text{--}254$）、邊界極性邏輯（自動 / 固定白底 / 固定黑底）。
  - **拓撲邊界與篩選**：最小迴圈點數、鞋帶公式面積篩選、內含射線判定採樣數與門檻、最大保留外框數。
  - **等距重取樣與平滑**：點數上限 $K$、下限 $\min K$、拉普拉斯平滑迭代次數與權重 $w$。
  - **視圖圖層**：底圖切換（原片 / 暗化 / 二值遮罩 / 黑 / 白）、剪影填色、等值輪廓線、階梯雙網格線、捨棄迴圈分色（內洞 / 內含 / 雜訊）、重取樣節點、雙網格矩陣。
- **播放控制器**：逐幀步進（`←` / `→`）、播放/暫停（`Space`）、自適應進度軸、0.25×–2× 播放速率。
- **幾何基準測試**：內建合成測試動畫（包含自轉環、內洞、被包覆的小島與高頻雜訊點）。

#### 2. 命令列版（`cli/`）
- `cli/sample.js`：任何 FFmpeg 可解碼之視訊/圖像序列 &rarr; 輪廓資料，或每幀獨立 SVG 序列。
- `cli/decode.js`：輪廓資料還原為剪影視訊、**純輪廓線視訊（`--mode outline`）**、PNG 序列、SVG 序列，可自動對齊附帶原音訊；各資料格式自由互轉。

### 快速開始

#### 瀏覽器版 (Web UI)
複製儲存庫並啟動本機伺服器：
```bash
git clone https://github.com/kevinshao2217/caustic_wavetank.git
cd caustic_wavetank
npm start            # 等同 npx http-server -p 8080 .，瀏覽器開啟 http://localhost:8080
```
或直接以瀏覽器開啟 `index.html`，無需任何伺服器。

> **GitHub Pages 部署**：Settings &rarr; Pages &rarr; Source 選擇 `main` 分支根目錄即可自動上線。  
> 網址後方帶參數 `?demo` 可自動載入示範動畫（例如 `https://kevinshao2217.github.io/caustic_wavetank/?demo`）。

#### 命令列版 (CLI - 需要 Node.js 18+ 與 FFmpeg)
```bash
# 1. 提取輪廓資料為二進位串流
node cli/sample.js input.mp4 -o out.bacs --start 0 --duration 10

# 2. 自訂解析度並匯出為 NDJSON
node cli/sample.js input.mp4 --res 640x360 --threshold 100 --maxLoops 0 -o out.ndjson

# 3. 還原為純輪廓線視訊 (純線條模式)
node cli/decode.js out.bacs -o lines.mp4 --mode outline --line 3 --lineColor #38bdf8

# 4. 還原為黑白剪影視訊 (附帶原影片音軌)
node cli/decode.js out.bacs -o decoded.mp4 --mode fill --audio input.mp4

# 5. 匯出每幀向量 SVG 序列
node cli/decode.js out.bacs -o svg_frames/ --format svg

# 6. 執行演算法單元自我測試
npm test
```

### 演算法步驟

1. **空間縮放**：將輸入影像縮至 $W \times H$ 灰階網格（預設 320 × 180）。
2. **極性判定**：統計外框邊界亮度，自動判斷背景為白底（前景暗）或黑底（前景亮）。
3. **二值化**：依亮度門檻生成布林像素矩陣。
4. **雙網格邊界建立**：遍歷每條交界邊，建立沿像素邊界的有向拓撲邊，使前景恆在行進方向右側。
5. **閉合迴圈追蹤**：尤拉路徑閉合追蹤，保證輪廓為 100% 封閉環，無懸空飛線。
6. **鞋帶公式分類**（有號面積 $A = \frac{1}{2}\sum (x_i y_{i+1} - x_{i+1} y_i)$）：
   - 頂點數 $< \text{minLoopPoints} \to$ 雜訊點濾除。
   - $A \le 0 \to$ **內洞 (Hole)**（逆時針方向）。
   - $0 < A \le \text{minArea} \to$ 微小碎片濾除。
   - 射線法均勻採樣投票 $\to$ 判斷是否為巢狀包含於外框內之孤島。
7. **等距重取樣與平滑**：依弧長等距取樣成 $K$ 點，執行封閉拉普拉斯環狀鬆弛濾波：
   $$P_i \leftarrow w P_{i-1} + (1-2w) P_i + w P_{i+1}$$

### 數據格式

座標單位統一為取樣格點：$x \in [0, W], y \in [0, H]$，向下為正。

| 格式 | 副檔名 | 說明 | 特點 |
|---|---|---|---|
| **二進位封裝串流** | `.bacs` | Binary Adapted Contour Stream | 體積最小（約為 NDJSON 之 25%），適合高頻寬低延遲傳輸 |
| **逐行 JSON 串流** | `.ndjson` | 每行單幀 JSON 物件 | 支援串流讀取，相容 Python / Pandas / Node.js 串接 |
| **完整 JSON 陣列** | `.json` | 完整單一陣列 JSON | 結構完整，適合單一檔案解析 |
| **CSV 座標表格** | `.csv` | 點座標矩陣表格 | `frame,time,whiteBg,loop,area,rawPoints,idx,x,y` |
| **向量幾何檔案** | `.svg` | 每幀獨立向量路徑 | 支援向量放大無損、純線條輪廓無背景輸出 |

---

## 專案結構 (Repository Structure)

```
├── index.html            # 瀏覽器工作台入口 (Browser Pro Workstation UI)
├── web/
│   ├── app.js            # 介面互動、i18n 字典、算圖管道與串流錄製
│   └── style.css         # 工作台樣式系統 (深鈦色階、HUD 遙測、開關)
├── src/
│   ├── sampler-core.js   # 拓撲雙網格核心演算法 (純原生 JS，Node/Browser 雙相容)
│   └── formats.js        # BACS / NDJSON / JSON / CSV / SVG 編解碼引擎
├── cli/
│   ├── sample.js         # CLI 視訊取樣指令
│   └── decode.js         # CLI 輪廓還原與格式轉換工具
├── test/
│   └── selftest.js       # 演算法與編解碼單元測試
├── docs/
│   └── screenshot.png    # 工作台介面展示圖
├── README.md             # 雙語說明文件 (English & 繁體中文)
├── LICENSE               # MIT License
└── package.json
```

---

## 授權 (License)

本專案採用 [MIT License](LICENSE) 授權。
