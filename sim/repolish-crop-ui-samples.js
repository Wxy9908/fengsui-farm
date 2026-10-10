/**
 * 用当前抛光规则重跑 crops-ui 小样（不依赖 *_抠图.png）。
 * 运行：node sim/repolish-crop-ui-samples.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { polishIconBuffer } = require('./ui-icon-image');

const DIR = path.join(__dirname, '..', 'docs', '参考图', '小样', 'icons', 'crops-ui');
const CANON = /^[a-z]+\.png$/i;

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => CANON.test(f)).sort();
  for (const f of files) {
    const p = path.join(DIR, f);
    const raw = await fs.promises.readFile(p);
    const buf = await polishIconBuffer(raw);
    await fs.promises.writeFile(p, buf);
    const m = await sharp(p).metadata();
    console.log(`✓ ${f} (${m.width}×${m.height})`);
  }
  console.log(`完成 ${files.length} 张 crops-ui 小样抛光`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
