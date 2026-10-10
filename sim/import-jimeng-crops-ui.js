/**
 * 即梦作物 UI 贴纸（§6.3B）→ 游戏内列表/种子/图鉴展示用
 * 运行：node sim/import-jimeng-crops-ui.js
 *
 * 输入：docs/参考图/小样/icons/crops-ui/<id>.png（先 organize-crop-ui-samples）
 * 输出：assets/resources/icons/crops-ui/<id>.png（与田里 icons/crops 分离）
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { spriteFrameMeta, dirMeta } = require('./cocos-meta');
const { buildRasterizeHtml } = require('./png-import-canvas');

const ROOT = path.join(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'docs', '参考图', '小样', 'icons', 'crops-ui');
const OUT_DIR = path.join(ROOT, 'assets', 'resources', 'icons', 'crops-ui');
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
  const htmlPath = path.join(OUT_DIR, '_import_crop_ui.html');
  const pngUrl = `file:///${src.replace(/\\/g, '/')}`;
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
      while (Date.now() < until) { /* wait */ }
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
      if (attempt === 4) console.warn(`⚠️ 跳过 meta：${path.basename(metaPath)}`);
      else {
        const until = Date.now() + 1500;
        while (Date.now() < until) { /* wait */ }
      }
    }
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const dirMetaPath = `${OUT_DIR}.meta`;
if (!fs.existsSync(dirMetaPath)) {
  fs.writeFileSync(dirMetaPath, dirMeta(crypto.randomUUID()));
}
if (!fs.existsSync(SAMPLE_DIR)) {
  console.error(`缺少小样目录：${SAMPLE_DIR}`);
  process.exit(1);
}

const names = fs
  .readdirSync(SAMPLE_DIR)
  .filter((f) => /^[a-z]+\.png$/i.test(f))
  .map((f) => path.basename(f, '.png'))
  .sort();

if (names.length === 0) {
  console.warn('crops-ui 下无 canonical PNG；先 organize-crop-ui-samples。');
  process.exit(0);
}

let ok = 0;
for (const name of names) {
  const src = path.join(SAMPLE_DIR, `${name}.png`);
  const dest = path.join(OUT_DIR, `${name}.png`);
  resizePngCover(src, dest);
  ensureSpriteFrameMeta(dest, name);
  console.log(`✓ icons/crops-ui/${name}.png`);
  ok++;
}
console.log(`完成 ${ok} 个 UI 贴纸 → 种子/厨房/图鉴/背包展示；田里仍用 icons/crops/<id>_s1|_s2。`);
