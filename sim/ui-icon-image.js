'use strict';

const sharp = require('sharp');
const { stripJimengCornerOnRaw } = require('./jimeng-corner-strip');

function stripMatteOnRaw(data, w, h, { grayMatte = true, stripWhite = true, cornerLogo = true } = {}) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (r < 42 && g < 42 && b < 42) data[i + 3] = 0;
      else if (stripWhite && r > 238 && g > 238 && b > 238) data[i + 3] = 0;
      else if (grayMatte && sat < 28 && lum > 85 && lum < 248) data[i + 3] = 0;
    }
  }
  if (cornerLogo) stripJimengCornerOnRaw(data, w, h);
}

/** 误抠后 RGB 仍在、alpha=0 的墙体/填色补回不透明 */
function repairPlaceAlphaHoles(data, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] > 12) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (r < 36 && g < 36 && b < 36) continue;
      const lum = (r + g + b) / 3;
      const sat = Math.max(r, g, b) - Math.min(r, g, b);
      if (lum > 252 && sat < 10) continue;
      data[i + 3] = Math.min(255, Math.max(220, Math.round(lum)));
    }
  }
}

/** 即梦导出：黑底/白底/水印/灰边 → 真透明（map/bag 等小图标） */
async function polishIconBuffer(buf) {
  let { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  stripMatteOnRaw(data, w, h, { grayMatte: true });
  buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 12 })
    .png()
    .toBuffer();
  return buf;
}

/** 地图地点插画：保留米色墙/浅棕线稿，只去纯黑/纯白底与角标水印 */
async function polishPlaceIconBuffer(buf) {
  let { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  repairPlaceAlphaHoles(data, w, h);
  stripMatteOnRaw(data, w, h, { grayMatte: false, stripWhite: false, cornerLogo: true });
  repairPlaceAlphaHoles(data, w, h);
  buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 12 })
    .png()
    .toBuffer();
  return buf;
}

async function resizeIconToSquare(buf, size, { drawScale = 1 } = {}) {
  const inner = Math.max(48, Math.min(size, Math.round(size * drawScale)));
  return sharp(buf)
    .resize(inner, inner, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .extend({
      top: Math.floor((size - inner) / 2),
      bottom: Math.ceil((size - inner) / 2),
      left: Math.floor((size - inner) / 2),
      right: Math.ceil((size - inner) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function polishIconPngFile(srcPath, destPath, size, { placeArt = false, drawScale = 1 } = {}) {
  let buf = await sharp(srcPath).png().toBuffer();
  buf = placeArt ? await polishPlaceIconBuffer(buf) : await polishIconBuffer(buf);
  buf = await resizeIconToSquare(buf, size, { drawScale: placeArt ? drawScale : 1 });
  await sharp(buf).toFile(destPath);
}

module.exports = {
  polishIconBuffer,
  polishPlaceIconBuffer,
  polishIconPngFile,
  resizeIconToSquare,
};
