/**
 * 即梦田里生长阶段小样 → 游戏内地块幼苗/半成株图标
 * 运行：node sim/import-jimeng-crop-stages.js
 *
 * 输入：docs/参考图/小样/icons/crops/<id>.png | <id>_s1.png | <id>_s2.png（先跑 organize-crop-samples 整理抠图后缀）
 * 输出：assets/resources/icons/crops/（256 透明底 + 去即梦角标水印）
 * 可选参数：`node sim/import-jimeng-crop-stages.js wheat` 或 `--all`
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { spriteFrameMeta } = require('./cocos-meta');
const { buildRasterizeHtml } = require('./png-import-canvas');

const ROOT = path.join(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'docs', '参考图', '小样', 'icons', 'crops');
const OUT_DIR = path.join(ROOT, 'assets', 'resources', 'icons', 'crops');
const SIZE = 256;

const EDGE = [process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

if (!EDGE) {
  console.error('未找到 Edge，无法栅格化。请安装 Edge 或设置 EDGE 环境变量。');
  process.exit(1);
}

function resizePngCover(src, dest) {
  const htmlPath = path.join(OUT_DIR, '_import_crop_stage.html');
  const pngUrl = `file:///${src.replace(/\\/g, '/')}`;
  // 小样已是即梦抠图透明底，勿再抠角标（会误伤土堆/浅色作物）
  fs.writeFileSync(
    htmlPath,
    buildRasterizeHtml(pngUrl, SIZE, { knockoutBg: false, stripJimengWatermark: false }),
  );
  const dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--virtual-time-budget=12000', '--dump-dom',
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 }).toString();
  fs.unlinkSync(htmlPath);
  if (dom.includes('ERROR_LOAD')) throw new Error(`无法加载：${src}`);
  const m = dom.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error(`PNG 转换失败：${src}`);
  const buf = Buffer.from(m[1], 'base64');
  const tmp = `${dest}.importing`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, dest);
      return;
    } catch (e) {
      if (fs.existsSync(tmp)) try { fs.unlinkSync(tmp); } catch (_) { /* ignore */ }
      if (attempt === 4) throw e;
      const until = Date.now() + 1500;
      while (Date.now() < until) { /* 等 Cocos 释放文件锁 */ }
    }
  }
}

function ensureSpriteFrameMeta(pngPath, name) {
  const metaPath = `${pngPath}.meta`;
  if (fs.existsSync(metaPath)) return;
  const uuid = crypto.randomUUID();
  const body = spriteFrameMeta(name, uuid, SIZE, SIZE, '.png', true);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      fs.writeFileSync(metaPath, body);
      return;
    } catch (e) {
      if (attempt === 4) console.warn(`⚠️ 跳过 meta（文件被占用）：${path.basename(metaPath)}`);
      else {
        const until = Date.now() + 1500;
        while (Date.now() < until) { /* wait */ }
      }
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(SAMPLE_DIR)) {
  console.error(`缺少小样目录：${SAMPLE_DIR}`);
  process.exit(1);
}

/** 只认 <id>.png / <id>_s1.png / <id>_s2.png，忽略即梦附带的缩略图、视图等多余文件 */
function isFieldCropPng(file) {
  return /^[a-z]+(_s[12])?\.png$/i.test(file);
}

const argv = process.argv.slice(2).filter(Boolean);
const importAll = argv.includes('--all');
const cropIds = argv.filter((a) => a !== '--all');
const allPng = fs.readdirSync(SAMPLE_DIR).filter((f) => f.endsWith('.png') && isFieldCropPng(f));
const files = allPng
  .filter((f) => {
    if (importAll) return true;
    if (cropIds.length === 0) return /_s[12]\.png$/i.test(f);
    const base = f.replace(/\.png$/i, '');
    return cropIds.some((id) => base === id || base === `${id}_s1` || base === `${id}_s2`);
  })
  .sort();
if (files.length === 0) {
  console.warn(importAll || cropIds.length ? '未匹配到可入库的小样。' : 'icons/crops 小样为空。');
  process.exit(0);
}

let ok = 0;
for (const file of files) {
  const name = path.basename(file, '.png');
  const src = path.join(SAMPLE_DIR, file);
  const dest = path.join(OUT_DIR, file);
  resizePngCover(src, dest);
  ensureSpriteFrameMeta(dest, name);
  console.log(`✓ icons/crops/${file}`);
  ok++;
}
const skipped = fs.readdirSync(SAMPLE_DIR).filter((f) => f.endsWith('.png') && !isFieldCropPng(f));
if (skipped.length) {
  console.log(`（跳过 ${skipped.length} 个非标准文件名，如缩略图/视图：${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''}）`);
}
console.log(`完成 ${ok} 个田里作物图标。`);
