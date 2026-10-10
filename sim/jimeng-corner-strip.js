'use strict';

/**
 * 即梦导出右下角「AI」角标：只在角落按浅色/低饱和抠透明，禁止整块矩形擦除（会裁到土堆、叶片）。
 */
/** 仅最右下角一小块，即梦角标区（勿扩大到土堆主体） */
const X_FRAC = 0.76;
const Y_FRAC = 0.86;

function shouldStripJimengPixel(r, g, b, a) {
  if (a === 0) return false;
  const lum = (r + g + b) / 3;
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  // 即梦角标：白/浅灰字与图标；土堆棕黄 sat 通常 ≥ 28
  if (r > 205 && g > 205 && b > 205) return true;
  if (lum > 168 && sat < 22) return true;
  return false;
}

/** Node/sharp raw RGBA buffer */
function stripJimengCornerOnRaw(data, w, h, { xFrac = X_FRAC, yFrac = Y_FRAC } = {}) {
  const x0 = Math.floor(w * xFrac);
  const y0 = Math.floor(h * yFrac);
  for (let y = y0; y < h; y++) {
    for (let x = x0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (!shouldStripJimengPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      data[i + 3] = 0;
    }
  }
}

/** 嵌入 Edge 栅格化 HTML 的脚本片段（与 stripJimengCornerOnRaw 规则一致） */
const BROWSER_STRIP_FN = `
function stripJimengCorner(p,w,h){
  const x0=Math.floor(w*${X_FRAC}),y0=Math.floor(h*${Y_FRAC});
  for(let y=y0;y<h;y++)for(let xi=x0;xi<w;xi++){
    const i=(y*w+xi)*4;
    const a=p[i+3]; if(!a) continue;
    const r=p[i],g=p[i+1],b=p[i+2];
    const lum=(r+g+b)/3,sat=Math.max(r,g,b)-Math.min(r,g,b);
    if(r>205&&g>205&&b>205) p[i+3]=0;
    else if(lum>168&&sat<22) p[i+3]=0;
  }
}`;

module.exports = {
  stripJimengCornerOnRaw,
  BROWSER_STRIP_FN,
  shouldStripJimengPixel,
};
