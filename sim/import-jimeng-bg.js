/**
 * 即梦场景小样 → 游戏内场景大图（阶段 2）
 * 运行：node sim/import-jimeng-bg.js
 *
 * 输入：docs/参考图/小样/{field_bg,kitchen_bg,shop_bg,loading_bg,map_bg}.png
 * 输出：assets/resources/bg/{field,kitchen,shop,loading,map}.jpg（720×1280，JPEG q87，奶油底 cover 裁切）
 * meta：仅当 .jpg.meta 不存在时新建（不覆盖已有 uuid）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { spriteFrameMeta } = require('./cocos-meta');

const ROOT = path.join(__dirname, '..');
const SAMPLE_DIR = path.join(ROOT, 'docs', '参考图', '小样');
const OUT_DIR = path.join(ROOT, 'assets', 'resources', 'bg');
const W = 720;
const H = 1280;
const Q = 0.87;
const BG = '#FFF8E7';

const MAP = [
  { sample: 'field_bg.png', out: 'field' },
  { sample: 'kitchen_bg.png', out: 'kitchen' },
  { sample: 'shop_bg.png', out: 'shop' },
  { sample: 'loading_bg.png', out: 'loading' },
  { sample: 'map_bg.png', out: 'map' },
];

const EDGE = [process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

if (!EDGE) {
  console.error('未找到 Edge，无法栅格化。请安装 Edge 或设置 EDGE 环境变量。');
  process.exit(1);
}

function pngToJpegCover(pngPath, jpgPath) {
  const htmlPath = path.join(OUT_DIR, '_import_jimeng_bg.html');
  const pngUrl = `file:///${pngPath.replace(/\\/g, '/')}`;
  fs.writeFileSync(
    htmlPath,
    `<!doctype html><html><body><script>
const W=${W},H=${H},Q=${Q},BG='${BG}';
const img=new Image();
img.onload=()=>{
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const x=c.getContext('2d');
  x.fillStyle=BG;x.fillRect(0,0,W,H);
  const s=Math.max(W/img.width,H/img.height);
  const dw=img.width*s,dh=img.height*s;
  x.drawImage(img,(W-dw)/2,(H-dh)/2,dw,dh);
  document.body.textContent=c.toDataURL('image/jpeg',Q);
};
img.onerror=()=>{document.body.textContent='ERROR_LOAD';};
img.src='${pngUrl}';
</script></body></html>`,
  );
  const dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--virtual-time-budget=12000', '--dump-dom',
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe', maxBuffer: 48 * 1024 * 1024 }).toString();
  fs.unlinkSync(htmlPath);
  if (dom.includes('ERROR_LOAD')) throw new Error(`无法加载：${pngPath}`);
  const m = dom.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error(`JPEG 转换失败：${pngPath}`);
  fs.writeFileSync(jpgPath, Buffer.from(m[1], 'base64'));
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const MAP_BG_ALT = path.join(SAMPLE_DIR, 'icons', 'ui', 'map_bg.png');

(async () => {
for (const { sample, out } of MAP) {
  let src = path.join(SAMPLE_DIR, sample);
  if (out === 'map' && fs.existsSync(MAP_BG_ALT)) src = MAP_BG_ALT;
  if (!fs.existsSync(src)) {
    console.warn(`⚠️ 跳过 ${out}：缺少 ${src}`);
    continue;
  }
  const jpgPath = path.join(OUT_DIR, `${out}.jpg`);
  const metaPath = `${jpgPath}.meta`;
  pngToJpegCover(src, jpgPath);
  const kb = (fs.statSync(jpgPath).size / 1024).toFixed(0);
  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, spriteFrameMeta(out, crypto.randomUUID(), W, H, '.jpg'));
    console.log(`✅ bg/${out}.jpg（${kb}KB）+ 新建 meta`);
  } else {
    console.log(`✅ bg/${out}.jpg（${kb}KB），保留已有 meta`);
  }
}
console.log('阶段 2 完成：field/kitchen/shop/loading/map 已从即梦小样入库。');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
