/**
 * 田里三档小样：仅去右下角即梦浅字/角标，不 trim、不抠灰边（避免误伤土堆）。
 * 运行：node sim/polish-field-crop-samples.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { stripJimengCornerOnRaw } = require('./jimeng-corner-strip');

const DIR = path.join(__dirname, '..', 'docs', '参考图', '小样', 'icons', 'crops');
const STAGE_RE = /^[a-z]+(_s[12])?\.png$/i;

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => STAGE_RE.test(f)).sort();
  for (const f of files) {
    const p = path.join(DIR, f);
    let { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    stripJimengCornerOnRaw(data, info.width, info.height);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile(p);
    console.log(`✓ ${f}`);
  }
  console.log(`完成 ${files.length} 张田里小样（仅角标）`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
