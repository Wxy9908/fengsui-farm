/**
 * 去掉 shop_bg.png 右下角即梦水印（克隆相邻地砖区域覆盖）。
 * 运行：node sim/patch-shop-watermark.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const PNG = path.join(ROOT, 'docs', '参考图', '小样', 'shop_bg.png');

const EDGE = [process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

if (!EDGE) {
  console.error('未找到 Edge');
  process.exit(1);
}
if (!fs.existsSync(PNG)) {
  console.error('缺少', PNG);
  process.exit(1);
}

const htmlPath = path.join(__dirname, '_patch_shop_wm.html');
const pngUrl = `file:///${PNG.replace(/\\/g, '/')}`;

fs.writeFileSync(
  htmlPath,
  `<!doctype html><html><body><script>
const img=new Image();
img.onload=()=>{
  const c=document.createElement('canvas');
  c.width=img.width;c.height=img.height;
  const g=c.getContext('2d');
  g.drawImage(img,0,0);
  const pw=420,ph=160;
  const dx=img.width-pw-8;
  const dy=img.height-ph-8;
  const sx=Math.max(0,dx-pw-12);
  g.drawImage(c,sx,dy,pw,ph,dx,dy,pw,ph);
  const sx2=Math.max(0,dx-pw*2-24);
  g.globalAlpha=0.45;
  g.drawImage(c,sx2,dy,pw,ph,dx,dy,pw,ph);
  g.globalAlpha=1;
  document.body.textContent=c.toDataURL('image/png');
};
img.onerror=()=>{document.body.textContent='ERROR_LOAD';};
img.src='${pngUrl}';
</script></body></html>`,
);

const dom = execFileSync(EDGE, [
  '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
  '--virtual-time-budget=20000', '--dump-dom',
  `file:///${htmlPath.replace(/\\/g, '/')}`,
], { stdio: 'pipe', maxBuffer: 64 * 1024 * 1024 }).toString();

fs.unlinkSync(htmlPath);

if (dom.includes('ERROR_LOAD')) {
  console.error('图片加载失败');
  process.exit(1);
}
const m = dom.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
if (!m) {
  console.error('PNG 导出失败');
  process.exit(1);
}

const bak = PNG.replace(/\.png$/i, '_before_wm.png');
if (!fs.existsSync(bak)) fs.copyFileSync(PNG, bak);

fs.writeFileSync(PNG, Buffer.from(m[1], 'base64'));
console.log('✅ 已去水印:', PNG);
console.log('   备份:', bak);
