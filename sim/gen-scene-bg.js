/**
 * 场景大图生成器（美术 v3，与 docs/mockups 效果图同源 sim/bg-lib.js）：四页背景 720×1280，程序化矢量 → Edge 栅格化。
 * 运行：node sim/gen-scene-bg.js
 * 产出：
 *   assets/resources/bg/{field,kitchen,shop,book}.jpg（JPEG q87，+ 手写 sprite-frame meta，免编辑器手动改类型）
 *   art-src/bg/*.svg（矢量源）
 * 构图铁律（美术规范 §4.1）：细节集中上半屏，下半屏保持低细节操作区（UI 会盖上去）。
 * 注意：meta 中 sprite-frame 子资产按未裁切全图预计算（trimX/Y=0，全幅 UV），
 *   若编辑器导入后显示异常，在编辑器里右键 Reimport 或手动把 Type 设为 sprite-frame 即可。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const A = require('./art-lib');
// 装饰背景与 v3 效果图同源（sim/bg-lib.js），此处不再维护本地副本。
const BG = require('./bg-lib.js')(A);

const ROOT = path.join(__dirname, '..');
const W = 720;
const H = 1280;
const SRC_DIR = path.join(ROOT, 'art-src', 'bg');
const OUT_DIR = path.join(ROOT, 'assets', 'resources', 'bg');
for (const d of [SRC_DIR, OUT_DIR]) fs.mkdirSync(d, { recursive: true });

const EDGE = [process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

// 水彩质感：内容整体过 wcBg（低频手绘抖动 + 颜料不均），纸纹噪点置顶。
// 注意体积：噪点会让 PNG 膨胀（微信主包 4MB 红线），上线前场景大图仍按规范 §4.1 走 CDN。
const svg = (body, filterId = 'wcBg') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  A.DEFS + `<g filter="url(#${filterId})">` + body + `</g>` + `</svg>`;

// ---------- 四页背景（装饰件全部来自 bg-lib，与 docs/mockups v3 同源） ----------
const bgField = () => svg(BG.field());
const bgKitchen = () => svg(BG.kitchen(), 'wcBgSoft'); // 深木底用柔和水洗，避免奶油层显白斑
const bgShop = () => svg(BG.shop());
const bgBook = () => svg(BG.book());

// ---------- sprite-frame meta（共享：sim/cocos-meta.js） ----------
const { spriteFrameMeta } = require('./cocos-meta');

// ---------- 输出 ----------
// PNG（水彩噪点，600KB+）→ JPEG q87（≈100~200KB）：背景无透明通道，JPEG 体积达标主包红线。
// 转换用 Edge canvas（--dump-dom 吐 dataURL），免外部图像库依赖。
function pngToJpeg(name) {
  const htmlPath = path.join(OUT_DIR, '_convert.html');
  fs.writeFileSync(htmlPath,
    `<!doctype html><html><body><script>` +
    `const img=new Image();img.onload=()=>{` +
    `const c=document.createElement('canvas');c.width=${W};c.height=${H};` +
    `const x=c.getContext('2d');x.fillStyle='#FFF8E7';x.fillRect(0,0,c.width,c.height);` +
    `x.drawImage(img,0,0);document.body.textContent=c.toDataURL('image/jpeg',0.87);};` +
    `img.src='${name}.png';</script></body></html>`);
  const dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--virtual-time-budget=8000', '--dump-dom',
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 }).toString();
  fs.unlinkSync(htmlPath);
  const m = dom.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error(`JPEG 转换失败：${name}`);
  const jpgPath = path.join(OUT_DIR, `${name}.jpg`);
  fs.writeFileSync(jpgPath, Buffer.from(m[1], 'base64'));
  return jpgPath;
}

const pages = { field: bgField, kitchen: bgKitchen, shop: bgShop, book: bgBook };
for (const [name, fn] of Object.entries(pages)) {
  const svgPath = path.join(SRC_DIR, `${name}.svg`);
  fs.writeFileSync(svgPath, fn());
  const pngPath = path.join(OUT_DIR, `${name}.png`);
  if (EDGE) {
    execFileSync(EDGE, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars',
      `--screenshot=${pngPath}`,
      `--window-size=${W},${H}`,
      `file:///${svgPath.replace(/\\/g, '/')}`,
    ], { stdio: 'pipe' });
    const jpgPath = pngToJpeg(name);
    const size = fs.statSync(jpgPath).size;
    fs.writeFileSync(`${jpgPath}.meta`, spriteFrameMeta(name, crypto.randomUUID(), W, H, '.jpg'));
    fs.unlinkSync(pngPath);
    if (fs.existsSync(`${pngPath}.meta`)) fs.unlinkSync(`${pngPath}.meta`);
    console.log(`✅ bg/${name}.jpg（${(size / 1024).toFixed(0)}KB）+ meta`);
  } else {
    console.log(`⚠️ 未找到 Edge，仅出 SVG：${svgPath}`);
  }
}
console.log('完成：四页场景大图 → assets/resources/bg/');

// ---------- UI 纸纹叠层（GameController 卡片面板叠加；stitchTiles 可平铺、透明底棕噪点） ----------
if (EDGE) {
  const TILE = 128;
  const tileSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}">` +
    A.DEFS + `<rect width="${TILE}" height="${TILE}" filter="url(#grain)" opacity="0.55"/></svg>`;
  const tileSvgPath = path.join(SRC_DIR, 'ui-paper.svg');
  fs.writeFileSync(tileSvgPath, tileSvg);
  const uiDir = path.join(ROOT, 'assets', 'resources', 'ui');
  fs.mkdirSync(uiDir, { recursive: true });
  const tilePng = path.join(uiDir, 'paper.png');
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${tilePng}`,
    `--window-size=${TILE},${TILE}`,
    `file:///${tileSvgPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe' });
  fs.writeFileSync(`${tilePng}.meta`, spriteFrameMeta('paper', crypto.randomUUID(), TILE, TILE, '.png', true));
  console.log(`✅ ui/paper.png（${(fs.statSync(tilePng).size / 1024).toFixed(0)}KB，卡片纸纹叠层）+ meta`);
}
