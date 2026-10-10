'use strict';

const { BROWSER_STRIP_FN } = require('./jimeng-corner-strip');

/**
 * Edge 无头栅格化用 HTML：缩放 + 可选抠掉白/奶油底（即梦常出方形实底）。
 * 只抠高亮低饱和像素，避免误伤小麦黄、番茄红等浅色作物。
 */
function buildRasterizeHtml(pngUrl, size, opts = {}) {
  const knock = opts.knockoutBg !== false;
  const knockBlack = opts.knockoutBlack !== false;
  const stripWm = opts.stripJimengWatermark !== false;
  const minL = opts.knockMinL ?? 228;
  const maxSat = opts.knockMaxSat ?? 32;
  return `<!doctype html><html><body><script>
const S=${size};
const KNOCK=${knock ? 'true' : 'false'};
const KNOCK_BLACK=${knockBlack ? 'true' : 'false'};
const STRIP_WM=${stripWm ? 'true' : 'false'};
const MIN_L=${minL};
const MAX_SAT=${maxSat};
function knockOut(x,w,h){
  const d=x.getImageData(0,0,w,h); const p=d.data;
  for(let i=0;i<p.length;i+=4){
    const r=p[i],g=p[i+1],b=p[i+2];
    const lo=Math.min(r,g,b), hi=Math.max(r,g,b);
    const sat=hi-lo;
    if(KNOCK_BLACK && hi<=18 && sat<=8){ p[i+3]=0; continue; }
    if(lo>=MIN_L && sat<=MAX_SAT){
      const t=Math.min(lo-MIN_L+18,18);
      p[i+3]=t<=0?0:Math.floor(p[i+3]*(t/18));
    }
  }
  x.putImageData(d,0,0);
}
${BROWSER_STRIP_FN}
function stripWatermark(x,w,h){
  const d=x.getImageData(0,0,w,h);
  stripJimengCorner(d.data,w,h);
  x.putImageData(d,0,0);
}
const img=new Image();
img.onload=()=>{
  const c=document.createElement('canvas');c.width=S;c.height=S;
  const x=c.getContext('2d',{willReadFrequently:true});
  const s=Math.max(S/img.width,S/img.height);
  const dw=img.width*s,dh=img.height*s;
  x.clearRect(0,0,S,S);
  x.drawImage(img,(S-dw)/2,(S-dh)/2,dw,dh);
  if(KNOCK) knockOut(x,S,S);
  if(STRIP_WM) stripWatermark(x,S,S);
  document.body.textContent=c.toDataURL('image/png');
};
img.onerror=()=>{document.body.textContent='ERROR_LOAD';};
img.src='${pngUrl}';
</script></body></html>`;
}

module.exports = { buildRasterizeHtml };
