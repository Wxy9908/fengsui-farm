/**
 * 即梦 crops-ui 导出整理：<id>_抠图.png → 抛光后的 <id>.png
 * 运行：node sim/organize-crop-ui-samples.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { polishIconBuffer } = require('./ui-icon-image');

const DIR = path.join(__dirname, '..', 'docs', '参考图', '小样', 'icons', 'crops-ui');
const ARCHIVE_DIR = path.join(DIR, '_archive', 'pre-cutout-replace');
const CANON = /^[a-z]+\.png$/i;
const CUTOUT = /^([a-z]+)_抠图\.png$/i;

function todayStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function processCutout(filename) {
  const id = filename.match(CUTOUT)[1];
  const canonical = `${id}.png`;
  const cutoutPath = path.join(DIR, filename);
  const dest = path.join(DIR, canonical);

  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  if (fs.existsSync(dest)) {
    fs.copyFileSync(dest, path.join(ARCHIVE_DIR, canonical));
    console.log(`  归档旧 ${canonical}`);
  }
  fs.copyFileSync(cutoutPath, path.join(ARCHIVE_DIR, filename));

  let buf = await fs.promises.readFile(cutoutPath);
  buf = await polishIconBuffer(buf);
  await fs.promises.writeFile(dest, buf);
  fs.unlinkSync(cutoutPath);

  const meta = await sharp(dest).metadata();
  console.log(
    `✓ ${canonical} ← ${filename} (${meta.width}×${meta.height}${meta.hasAlpha ? ', RGBA' : ''})`,
  );
}

(async () => {
  if (!fs.existsSync(DIR)) {
    console.error(`缺少目录：${DIR}`);
    process.exit(1);
  }

  const cutouts = fs.readdirSync(DIR).filter((x) => CUTOUT.test(x)).sort();
  if (cutouts.length === 0) {
    console.warn('未找到 *_抠图.png；目录已是 canonical 则可直接 import-jimeng-crops-ui。');
  } else {
    for (const f of cutouts) await processCutout(f);
  }

  const strayArchive = path.join(DIR, '_archive', todayStamp());
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith('.png') || f.startsWith('_')) continue;
    if (!CANON.test(f)) {
      fs.mkdirSync(strayArchive, { recursive: true });
      fs.renameSync(path.join(DIR, f), path.join(strayArchive, f));
      console.log(`  归档杂项 ${f} → _archive/${path.basename(strayArchive)}/`);
    }
  }

  const left = fs.readdirSync(DIR).filter((f) => CANON.test(f)).sort();
  console.log(`\ncrops-ui canonical（${left.length}）：${left.join(', ')}`);
  if (cutouts.length > 0) {
    console.log(`抠图源与替换前的正式图在 _archive/pre-cutout-replace/`);
  }
  console.log('下一步：npm run import-jimeng-crops-ui');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
