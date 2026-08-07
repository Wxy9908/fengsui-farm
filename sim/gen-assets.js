/**
 * 游戏资产生成器（美术 v1.0）：把 sim/art-lib.js 的矢量图标渲染成游戏用 PNG。
 * 运行：node sim/gen-assets.js
 * 产出：
 *   assets/resources/icons/crops/<id>.png   7 个作物图标（256×256 透明底）
 *   assets/resources/icons/dishes/<id>.png  22 个菜品图标（256×256 透明底）
 *   art-src/icons/*.svg                     矢量源文件（不进 assets，避免引擎误导入）
 *   docs/mockups/icon-sheet.svg/.png        验收拼版（奶油底 + 名称 + 32px 剪影行）
 * 依赖：本机 Edge 无头模式做 SVG→PNG 栅格化（可用环境变量 EDGE 覆盖路径）。
 * 注意：.meta 缺才写（编辑器没导入过的新资产，预览会因缺 meta 静默丢图）；
 *   已存在的 meta 不覆盖（编辑器导入过的含裁切/uuid 信息）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const A = require('./art-lib');
const { spriteFrameMeta, dirMeta } = require('./cocos-meta');

const ROOT = path.join(__dirname, '..');
const SIZE = 256;
const SRC_DIR = path.join(ROOT, 'art-src', 'icons');
const OUT_CROPS = path.join(ROOT, 'assets', 'resources', 'icons', 'crops');
const OUT_DISHES = path.join(ROOT, 'assets', 'resources', 'icons', 'dishes');
const OUT_FIELD = path.join(ROOT, 'assets', 'resources', 'icons', 'field');
const SHEET_DIR = path.join(ROOT, 'docs', 'mockups');
for (const d of [SRC_DIR, OUT_CROPS, OUT_DISHES, OUT_FIELD, SHEET_DIR]) fs.mkdirSync(d, { recursive: true });

const EDGE_CANDIDATES = [
  process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
const EDGE = EDGE_CANDIDATES.find((p) => fs.existsSync(p));

/** 单个图标的独立 SVG（透明底，主体占画面 ~78% 居中；水彩质感套件包装） */
const iconSvg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">` +
  A.DEFS + A.wc(A.icon(inner, SIZE / 2, SIZE / 2, 4.2)) + `</svg>`;

function rasterize(svgPath, pngPath, size = SIZE, h = size) {
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--default-background-color=00000000',
    `--screenshot=${pngPath}`,
    `--window-size=${size},${h}`,
    `file:///${svgPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe' });
}

// ---------- 1. 图标 SVG + PNG ----------
const jobs = [];
for (const [id, inner] of Object.entries(A.CROP_ICONS)) jobs.push({ id, inner, outDir: OUT_CROPS, group: 'crops' });
for (const [id, inner] of Object.entries(A.CROP_S1)) jobs.push({ id: `${id}_s1`, inner, outDir: OUT_CROPS, group: 'crops' });
for (const [id, inner] of Object.entries(A.CROP_S2)) jobs.push({ id: `${id}_s2`, inner, outDir: OUT_CROPS, group: 'crops' });
for (const [id, inner] of Object.entries(A.DISH_ICONS)) jobs.push({ id, inner, outDir: OUT_DISHES, group: 'dishes' });

for (const j of jobs) {
  const svgPath = path.join(SRC_DIR, `${j.group}-${j.id}.svg`);
  fs.writeFileSync(svgPath, iconSvg(j.inner));
  if (EDGE) rasterize(svgPath, path.join(j.outDir, `${j.id}.png`));
  console.log(`✅ icons/${j.group}/${j.id}.${EDGE ? 'png' : 'svg（未找到 Edge，仅出 SVG）'}`);
}

// ---------- 1.2 缺才写的 .meta（脚本生成的资产编辑器未必导入过；缺 meta 预览会静默丢图） ----------
// 注意：已存在的 meta（编辑器导入过、含裁切信息）绝不覆盖。
function ensureMeta(pngPath, w, h) {
  if (fs.existsSync(`${pngPath}.meta`)) return;
  const name = path.basename(pngPath, '.png');
  fs.writeFileSync(`${pngPath}.meta`, spriteFrameMeta(name, crypto.randomUUID(), w, h, '.png', true));
  console.log(`  + meta（新资产）: ${path.basename(pngPath)}`);
}
const ICON_DIRS = new Map([[OUT_CROPS, [SIZE, SIZE]], [OUT_DISHES, [SIZE, SIZE]], [OUT_FIELD, [200, 110]]]);
for (const [d, [w, h]] of ICON_DIRS) {
  const dirMetaPath = `${d}.meta`;
  if (!fs.existsSync(dirMetaPath)) {
    fs.writeFileSync(dirMetaPath, dirMeta(crypto.randomUUID()));
    console.log(`  + meta（新目录）: ${path.basename(d)}/`);
  }
  for (const f of fs.readdirSync(d)) {
    if (f.endsWith('.png')) ensureMeta(path.join(d, f), w, h);
  }
}

// ---------- 1.5 田地土壤畦（200×110 透明底，dry/wet 两态） ----------
for (const kind of ['dry', 'wet']) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="110" viewBox="0 0 200 110">` +
    A.DEFS + A.wc(A.SOIL(kind)) + `</svg>`;
  const svgPath = path.join(SRC_DIR, `field-soil_${kind}.svg`);
  fs.writeFileSync(svgPath, svg);
  if (EDGE) rasterize(svgPath, path.join(OUT_FIELD, `soil_${kind}.png`), 200, 110);
  console.log(`✅ icons/field/soil_${kind}.${EDGE ? 'png' : 'svg'}`);
}

// ---------- 2. 验收拼版（含 32px 剪影测试行） ----------
function contactSheet() {
  const cols = 8;
  const cell = 96;
  const entries = [
    ...Object.keys(A.CROP_ICONS).flatMap((id) => [
      { id, name: A.CROP_NAMES[id], inner: A.CROP_ICONS[id] },
      { id: `${id}_s1`, name: `${A.CROP_NAMES[id]}·苗`, inner: A.CROP_S1[id] },
      { id: `${id}_s2`, name: `${A.CROP_NAMES[id]}·半`, inner: A.CROP_S2[id] },
    ]),
    ...Object.keys(A.DISH_ICONS).map((id) => ({ id, name: A.DISH_NAMES[id], inner: A.DISH_ICONS[id] })),
  ];
  const rows = Math.ceil(entries.length / cols);
  const W = cols * cell + 40;
  // 剪影测试行改为多行换行（条目增多后单行溢出画布右侧）
  const silPerRow = Math.floor((W - 120) / 17);
  const silRows = Math.ceil(entries.length / silPerRow);
  const H = rows * (cell + 22) + 120 + (silRows - 1) * 40;
  let s = A.RR(0, 0, W, H, 0, 'url(#paperDeep)');
  s += A.T(W / 2, 34, 22, '图标验收拼版 · 美术 v1.1（上：64px 标准 / 下：32px 剪影测试）', '#8B5A2B', 'bold');
  entries.forEach((e, i) => {
    const x = 20 + (i % cols) * cell + cell / 2;
    const y = 56 + Math.floor(i / cols) * (cell + 22) + cell / 2;
    s += A.wc(A.icon(e.inner, x, y - 6, 64 / 48));
    s += A.T(x, y + 46, 13, e.name, '#4A3520');
  });
  // 剪影测试行：全部缩到 32px（不带水彩包装，专验形状可辨性）；多行换行
  entries.forEach((e, i) => {
    const sr = Math.floor(i / silPerRow);
    const sx = 100 + (i % silPerRow) * 17;
    const sy = H - 44 - (silRows - 1 - sr) * 40;
    if (i % silPerRow === 0) s += A.T(60, sy + 6, 14, '32px:', '#8B5A2B', 'bold', 'start');
    s += A.icon(e.inner, sx, sy, 32 / 48);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` + A.DEFS + s + `</svg>`;
}
const sheetSvg = path.join(SHEET_DIR, 'icon-sheet.svg');
const sheet = contactSheet();
fs.writeFileSync(sheetSvg, sheet);
if (EDGE) {
  const sm = sheet.match(/width="(\d+)" height="(\d+)"/);
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--screenshot=${path.join(SHEET_DIR, 'icon-sheet.png')}`,
    `--window-size=${sm[1]},${sm[2]}`,
    `file:///${sheetSvg.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe' });
}
console.log('✅ docs/mockups/icon-sheet.svg/.png（验收拼版：三关检查——剪影可辨/光源左上/配色合规）');
console.log(EDGE ? `完成：${jobs.length} 个图标 PNG → assets/resources/icons/` : '警告：未找到 Edge，仅生成 SVG 源；设 EDGE 环境变量后重跑');
