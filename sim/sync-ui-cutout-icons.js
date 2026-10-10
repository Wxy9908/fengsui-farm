/**
 * 用「*_抠图.png」修好并覆盖正式小样名，整理目录。
 * 运行：node sim/sync-ui-cutout-icons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { polishIconBuffer } = require('./ui-icon-image');

const ROOT = path.join(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'docs', '参考图', '小样', 'icons', 'ui');
const ARCHIVE_DIR = path.join(SAMPLE_DIR, '_archive', 'pre-cutout-replace');

const ICONS = ['map', 'bag', 'map_place_farm', 'map_place_canteen', 'map_place_shop', 'map_place_orchard'];

function findCutoutFile(name) {
  const f = `${name}_抠图.png`;
  const p = path.join(SAMPLE_DIR, f);
  return fs.existsSync(p) ? p : null;
}


async function processIcon(name) {
  const cutout = findCutoutFile(name);
  if (!cutout) {
    console.warn(`⚠️ 跳过 ${name}：未找到 ${name}_*.png 抠图小样`);
    return false;
  }
  const dest = path.join(SAMPLE_DIR, `${name}.png`);
  const plainExists = fs.existsSync(dest);

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  if (plainExists) {
    const archived = path.join(ARCHIVE_DIR, `${name}.png`);
    fs.copyFileSync(dest, archived);
  }
  const archivedCut = path.join(ARCHIVE_DIR, path.basename(cutout));
  fs.copyFileSync(cutout, archivedCut);

  let buf = await fs.promises.readFile(cutout);
  buf = await polishIconBuffer(buf);
  await fs.promises.writeFile(dest, buf);

  const meta = await sharp(dest).metadata();
  const hasAlpha = meta.hasAlpha;
  console.log(`✓ ${name}.png ← ${path.basename(cutout)} (${meta.width}×${meta.height}${hasAlpha ? ', RGBA' : ''})`);
  return true;
}

async function tidyFolder() {
  for (const name of ICONS) {
    const f = `${name}_抠图.png`;
    const from = path.join(SAMPLE_DIR, f);
    if (!fs.existsSync(from)) continue;
    const to = path.join(ARCHIVE_DIR, f);
    if (!fs.existsSync(to)) fs.copyFileSync(from, to);
    fs.unlinkSync(from);
    console.log(`  归档 ${f} → _archive/pre-cutout-replace/`);
  }
}

(async () => {
  if (!fs.existsSync(SAMPLE_DIR)) {
    console.error('缺少目录：', SAMPLE_DIR);
    process.exit(1);
  }
  let ok = 0;
  for (const name of ICONS) {
    if (await processIcon(name)) ok++;
  }
  await tidyFolder();
  console.log(`\n完成 ${ok}/${ICONS.length}；旧图与抠图源在 icons/ui/_archive/pre-cutout-replace/`);
  if (ok > 0) console.log('下一步：npm run import-jimeng-ui-icons');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
