/**
 * 重新抛光小样目录里的正式 icon PNG（去水印/灰边/trim），不覆盖 _archive。
 * 运行：node sim/polish-ui-sample-icons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { polishIconBuffer, polishPlaceIconBuffer } = require('./ui-icon-image');

const SAMPLE_DIR = path.join(__dirname, '..', 'docs', '参考图', '小样', 'icons', 'ui');
const ICONS = ['map', 'bag', 'map_place_farm', 'map_place_canteen', 'map_place_shop', 'map_place_orchard'];

(async () => {
  for (const name of ICONS) {
    const p = path.join(SAMPLE_DIR, `${name}.png`);
    if (!fs.existsSync(p)) {
      console.warn('skip', name);
      continue;
    }
    const raw = await fs.promises.readFile(p);
    const buf = name.startsWith('map_place_')
      ? await polishPlaceIconBuffer(raw)
      : await polishIconBuffer(raw);
    // place 只走 polishPlaceIconBuffer，避免再次误抠米色墙
    await sharp(buf).png().toFile(p);
    const m = await sharp(p).metadata();
    console.log(`✓ ${name}.png ${m.width}×${m.height}`);
  }
  console.log('小样抛光完成 → npm run import-jimeng-ui-icons');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
