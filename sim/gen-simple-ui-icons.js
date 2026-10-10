/**
 * 程序生成极简 map/bag 导航 icon（粗描边平涂，小尺寸可读）
 * 运行：node sim/gen-simple-ui-icons.js && npm run import-jimeng-ui-icons
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', 'docs', '参考图', '小样', 'icons', 'ui');
const STROKE = '#4A3520';
const PAPER = '#FFF8E7';
const ACCENT = '#F2B830';
const BAG = '#FFE9A8';

const MAP_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <path fill="${PAPER}" stroke="${STROKE}" stroke-width="26" stroke-linejoin="round"
    d="M108 148 L256 96 L404 148 L404 364 L256 416 L108 364 Z"/>
  <path fill="none" stroke="${STROKE}" stroke-width="18" d="M256 96 V416"/>
  <path fill="#B6E08A" stroke="${STROKE}" stroke-width="10" d="M140 260 h48 v52 h-48z M324 220 h56 v44 h-56z"/>
  <path fill="none" stroke="#6B4423" stroke-width="10" stroke-dasharray="14 12" stroke-linecap="round"
    d="M150 300 Q256 255 362 318"/>
  <circle fill="${ACCENT}" stroke="${STROKE}" stroke-width="12" cx="350" cy="325" r="20"/>
</svg>`;

const BAG_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <path fill="${PAPER}" stroke="${STROKE}" stroke-width="26" stroke-linejoin="round"
    d="M156 200 Q256 160 356 200 L380 360 Q256 400 132 360 Z"/>
  <path fill="${BAG}" stroke="${STROKE}" stroke-width="16" stroke-linejoin="round"
    d="M196 200 Q256 175 316 200 L316 248 Q256 268 196 248 Z"/>
  <rect fill="${ACCENT}" stroke="${STROKE}" stroke-width="12" x="232" y="268" width="48" height="40" rx="8"/>
  <path fill="none" stroke="${STROKE}" stroke-width="18" stroke-linecap="round"
    d="M200 200 Q200 140 256 128 Q312 140 312 200"/>
</svg>`;

async function writeIcon(name, svg) {
  const dest = path.join(OUT, `${name}.png`);
  await sharp(Buffer.from(svg)).png().toFile(dest);
  console.log(`✓ ${name}.png（程序极简版）`);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await writeIcon('map', MAP_SVG);
  await writeIcon('bag', BAG_SVG);
  console.log('已写入小样；请执行 npm run import-jimeng-ui-icons');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
