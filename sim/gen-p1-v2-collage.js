/**
 * P1-V2：田地 / 厨房 / 小铺 三页即梦场景小样拼版（签字用）
 * 运行：node sim/gen-p1-v2-collage.js
 *
 * 输入：docs/参考图/小样/{field_bg,kitchen_bg,shop_bg}.png
 * 输出：docs/mockups/p1-v2-jimeng-scenes.png（+ 同源 .svg 引用拼版）
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SAMPLE = path.join(ROOT, 'docs', '参考图', '小样');
const OUT = path.join(ROOT, 'docs', 'mockups');
const SIGN_DATE = '2026-10-09';

const PANELS = [
  { file: 'field_bg.png', title: '田地', sub: 'field · 上景下田' },
  { file: 'kitchen_bg.png', title: '厨房', sub: 'kitchen · 浅口灶锅留白' },
  { file: 'shop_bg.png', title: '小铺', sub: 'shop · 木牌遮阳' },
];

const EDGE = [
  process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

for (const p of PANELS) {
  const fp = path.join(SAMPLE, p.file);
  if (!fs.existsSync(fp)) {
    console.error(`缺少小样：${fp}`);
    process.exit(1);
  }
}

const W = 2280;
const H = 1180;
const panelH = 920;
const panelW = Math.round(panelH * (720 / 1280));

const imgs = PANELS.map((p) => {
  const abs = path.join(SAMPLE, p.file).replace(/\\/g, '/');
  return { ...p, href: `file:///${abs}` };
});

const figures = imgs
  .map(
    (p) =>
      `<figure><img src="${p.href}" width="${panelW}" height="${panelH}" alt="${p.title}"/>` +
      `<figcaption><strong>${p.title}</strong><br/><span>${p.sub}</span></figcaption></figure>`,
  )
  .join('\n');

const html = `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"/>
<title>P1-V2 三页场景气质对照</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#1e1e1e;color:#eee;font-family:"Microsoft YaHei",sans-serif}
  header{padding:20px 24px 8px;text-align:center}
  h1{margin:0 0 8px;font-size:22px;color:#fff8e7}
  .sub{font-size:14px;color:#c9b896;line-height:1.5}
  .row{display:flex;gap:20px;justify-content:center;padding:12px 24px 8px}
  figure{margin:0;width:${panelW}px}
  img{display:block;width:100%;height:${panelH}px;object-fit:cover;border:3px solid #4a3520;border-radius:10px;background:#fff8e7}
  figcaption{margin-top:10px;font-size:15px;color:#f2b830}
  figcaption span{font-size:12px;color:#aaa}
  footer{padding:16px 24px 24px;text-align:center;font-size:13px;color:#888;border-top:1px solid #333;margin:8px 24px 0}
  .ok{color:#7ec850;font-weight:bold}
</style></head><body>
<header>
  <h1>M5-P1 · P1-V2 三页静态气质对照</h1>
  <p class="sub">即梦 Seedream 小样（粗描边 · 平涂 · 弱水彩 · 俯视分区留白）<br/>
  来源：<code>docs/参考图/小样/field_bg · kitchen_bg · shop_bg</code> · 与入库 <code>assets/resources/bg/*.jpg</code> 同源</p>
</header>
<div class="row">${figures}</div>
<footer>
  体验底线 P1-V2 验收：三页气质一致，无 UI/角色叠图 · 签字 <span class="ok">制作人过目 ✅ ${SIGN_DATE}</span><br/>
  对照《experience-roadmap.md》§4.2 · 出图《jimeng-workflow.md》阶段 0.3 / 2
</footer>
</body></html>`;

const htmlPath = path.join(OUT, '_p1-v2-collage.html');
const pngPath = path.join(OUT, 'p1-v2-jimeng-scenes.png');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(htmlPath, html, 'utf8');

// 轻量 SVG（外链 PNG，供版本管理 diff 结构）
const svgX = imgs
  .map((p, i) => {
    const x = 40 + i * (panelW + 20);
    return `<image href="${p.href}" x="${x}" y="100" width="${panelW}" height="${panelH}"/>` +
      `<text x="${x + panelW / 2}" y="${100 + panelH + 28}" text-anchor="middle" fill="#F2B830" font-size="18" font-family="Microsoft YaHei">${p.title}</text>`;
  })
  .join('\n');
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#1e1e1e"/>
  <text x="${W / 2}" y="48" text-anchor="middle" fill="#FFF8E7" font-size="24" font-family="Microsoft YaHei">P1-V2 三页场景气质对照</text>
  ${svgX}
  <text x="${W / 2}" y="${H - 36}" text-anchor="middle" fill="#7ec850" font-size="14" font-family="Microsoft YaHei">制作人过目 ✅ ${SIGN_DATE}</text>
</svg>`;
fs.writeFileSync(path.join(OUT, 'p1-v2-jimeng-scenes.svg'), svg, 'utf8');

if (!EDGE) {
  console.warn('未找到 Edge，已写出 HTML/SVG；请本地用浏览器打开 _p1-v2-collage.html 截图。');
  process.exit(0);
}

const userDataDir = path.join(OUT, '_edge_p1v2');
fs.mkdirSync(userDataDir, { recursive: true });
execFileSync(
  EDGE,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${W},${H}`,
    `--user-data-dir=${userDataDir}`,
    `--screenshot=${pngPath}`,
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ],
  { stdio: 'inherit' },
);

console.log(`✅ ${path.relative(ROOT, pngPath)}`);
console.log(`✅ ${path.relative(ROOT, path.join(OUT, 'p1-v2-jimeng-scenes.svg'))}`);
