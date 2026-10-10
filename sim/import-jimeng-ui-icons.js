/**
 * 即梦 UI 导航小图标小样 → 游戏内 PNG（M6）
 * 运行：node sim/import-jimeng-ui-icons.js
 *
 * 输入：docs/参考图/小样/icons/ui/{map,bag,map_place_*}.png
 * 输出：assets/resources/icons/ui/*.png（透明底，384×384，Lanczos）
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spriteFrameMeta } = require('./cocos-meta');
const { polishIconPngFile } = require('./ui-icon-image');

const ROOT = path.join(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'docs', '参考图', '小样', 'icons', 'ui');
const OUT_DIR = path.join(ROOT, 'assets', 'resources', 'icons', 'ui');
const SIZE = 384;

const FILES = ['map', 'bag', 'map_place_farm', 'map_place_canteen', 'map_place_shop', 'map_place_orchard'];

fs.mkdirSync(OUT_DIR, { recursive: true });

function ensureSpriteFrameMeta(pngPath, name) {
  const metaPath = `${pngPath}.meta`;
  let uuid = crypto.randomUUID();
  if (fs.existsSync(metaPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (parsed.uuid) uuid = parsed.uuid;
    } catch (_) {
      /* ignore */
    }
  }
  fs.writeFileSync(metaPath, spriteFrameMeta(name, uuid, SIZE, SIZE, '.png', true));
}

(async () => {
  let ok = 0;
  for (const name of FILES) {
    const src = path.join(SAMPLE_DIR, `${name}.png`);
    if (!fs.existsSync(src)) {
      console.warn(`⚠️ 跳过 ${name}：缺少 ${src}`);
      continue;
    }
    const dest = path.join(OUT_DIR, `${name}.png`);
    const placeArt = name.startsWith('map_place_');
    let drawScale = 1;
    if (placeArt) {
      if (name === 'map_place_orchard') drawScale = 1.15;
      else if (name === 'map_place_farm') drawScale = 0.8;
      else drawScale = 0.94;
    }
    await polishIconPngFile(src, dest, SIZE, { placeArt, drawScale });
    ensureSpriteFrameMeta(dest, name);
    console.log(`✓ icons/ui/${name}.png (${SIZE}²)`);
    ok++;
  }
  if (ok === 0) {
    console.warn('无小样入库；请先按 docs/art/jimeng-prompts.md §6.3C 产出小样。');
  } else {
    console.log(`完成 ${ok}/${FILES.length}`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
