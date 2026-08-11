/**
 * Loading 页示意图生成器（美术 v1.1 同源：手绘水彩 · 奶油暖调）。
 * 依据：docs/美术风格规范.md（色板 / 左上 45° 光源 / 圆角语言 / 禁忌清单）。
 * 参考方向：主流游戏 loading 页三要素——主视觉海报（张力）+ 进度条 + 健康游戏忠告；
 * 差异化做法：不用角色立绘，用「丰收篮作物迸发」做画面张力，与游戏内图标同源（art-lib.js）。
 * 背景复用 bg-lib.js 田地场景（含外婆小屋/炊烟/灯笼串，loading 即游戏世界第一眼）。
 * 运行：node sim/gen-loading.js → docs/mockups/loading.svg
 * PNG 转换命令见文件尾部注释（Edge 无头模式）。
 */
const fs = require('fs');
const path = require('path');
const ART = require('./art-lib.js');
const BG = require('./bg-lib.js')(ART);

const OUT = path.join(__dirname, '..', 'docs', 'mockups');
fs.mkdirSync(OUT, { recursive: true });

const W = 720;
const H = 1280;
const { FONT, T, RR, C, E, P, PS, CROP_ICONS, DISH_ICONS, icon, wc } = ART;

// ---------- 自用 defs（loading 专用渐变） ----------
const DEFS = ART.DEFS.replace('</defs>', `
  <radialGradient id="burst" cx="0.5" cy="0.42" r="0.75">
    <stop offset="0" stop-color="#FFF3C4" stop-opacity="0.95"/>
    <stop offset="0.45" stop-color="#F2B830" stop-opacity="0.35"/>
    <stop offset="1" stop-color="#F2B830" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="goldBar" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F8D878"/><stop offset="0.5" stop-color="#F2B830"/><stop offset="1" stop-color="#D99A18"/>
  </linearGradient>
  <linearGradient id="logoPaper" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFDF5"/><stop offset="1" stop-color="#F5E8C8"/>
  </linearGradient>
  <linearGradient id="basketG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#C89A62"/><stop offset="1" stop-color="#8B5A2B"/>
  </linearGradient>
  <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F3E4C2" stop-opacity="0"/><stop offset="1" stop-color="#F3E4C2"/>
  </linearGradient>
</defs>`);

const grain = (opacity = 0.06) => `<rect x="0" y="0" width="${W}" height="${H}" filter="url(#grain)" opacity="${opacity}"/>`;

// ---------- 主视觉：丰收篮 + 作物迸发 ----------
// 构图：画面纵轴中段偏上（黄金分割），作物沿左上→右下的对角线飞出，制造动势。
function harvestBasket(cx, cy) {
  let s = '';
  // 迸发光晕（张力底层）
  s += E(cx, cy - 80, 360, 320, 'url(#burst)');
  // 放射速度线（手绘短弧，沿对角扇形）
  const rays = [[-150, -200, -195, -262], [-70, -235, -88, -306], [20, -245, 26, -318], [110, -220, 148, -284], [175, -160, 236, -204], [-185, -120, -252, -146]];
  rays.forEach(([x1, y1, x2, y2], i) => {
    s += PS(`M${cx + x1} ${cy + y1} L${cx + x2} ${cy + y2}`, '#E8A020', 6 - (i % 2) * 2, 'opacity="0.8"');
  });
  // 飞出的作物（沿对角线由近及远，带旋转与大小递减，营造景深动势）
  const flying = [
    ['pumpkin', -195, -260, -24, 1.7],
    ['tomato', -64, -330, 10, 1.45],
    ['corn', 80, -340, 18, 1.5],
    ['strawberry', 205, -250, 30, 1.3],
    ['wheat', -258, -150, -40, 1.35],
    ['grape', 268, -128, 42, 1.2],
  ];
  flying.forEach(([id, dx, dy, rot, sc]) => {
    s += `<g transform="rotate(${rot} ${cx + dx} ${cy + dy})">` + wc(icon(CROP_ICONS[id], cx + dx, cy + dy, sc)) + `</g>`;
  });
  // 星星贴纸（惊喜感，程序叠层语汇）
  const star = (x, y, r, op) => P(`M${x} ${y - r} L${x + r * 0.28} ${y - r * 0.28} L${x + r} ${y} L${x + r * 0.28} ${y + r * 0.28} L${x} ${y + r} L${x - r * 0.28} ${y + r * 0.28} L${x - r} ${y} L${x - r * 0.28} ${y - r * 0.28} Z`, '#F2B830', `stroke="#C98F1B" stroke-width="1.5" opacity="${op}"`);
  s += star(cx - 140, cy - 360, 14, 0.95) + star(cx + 165, cy - 368, 10, 0.85) + star(cx + 288, cy - 205, 8, 0.75) + star(cx - 292, cy - 215, 8, 0.75) + star(cx + 30, cy - 392, 9, 0.8);
  // 篮子本体：投影 + 提手 + 梯形篮身 + 编织纹
  s += E(cx, cy + 96, 200, 22, '#4A3520', 'opacity="0.2" filter="url(#blur4)"');
  s += PS(`M${cx - 128} ${cy - 56} Q${cx} ${cy - 150} ${cx + 128} ${cy - 56}`, '#8B5A2B', 9);
  s += P(`M${cx - 150} ${cy - 42} Q${cx - 138} ${cy + 84} ${cx} ${cy + 88} Q${cx + 138} ${cy + 84} ${cx + 150} ${cy - 42} Z`, 'url(#basketG)', `stroke="#4A3520" stroke-width="3" filter="url(#softSm)"`);
  // 编织竖纹
  for (let i = -3; i <= 3; i++) {
    const bx = cx + i * 42;
    s += PS(`M${bx} ${cy - 34} Q${bx + i * 4} ${cy + 40} ${bx * 0.998 + cx * 0.002} ${cy + 82}`, '#6B4423', 2.5, 'opacity="0.6"');
  }
  // 编织横纹
  s += PS(`M${cx - 146} ${cy - 8} Q${cx} ${cy + 10} ${cx + 146} ${cy - 8}`, '#6B4423', 3, 'opacity="0.55"');
  s += PS(`M${cx - 138} ${cy + 38} Q${cx} ${cy + 56} ${cx + 138} ${cy + 38}`, '#6B4423', 3, 'opacity="0.55"');
  // 篮口溢出的作物（画在篮身之后、篮口沿之前，底部被篮口沿收住，读作「装在篮里」）
  const piled = [
    ['cabbage', -84, -78, 1.7], ['pumpkin', 66, -88, 1.8], ['tomato', -10, -116, 1.5],
    ['corn', 128, -58, 1.4], ['carrot', -142, -56, 1.45], ['wheat', 16, -72, 1.6],
  ];
  piled.forEach(([id, dx, dy, sc]) => { s += wc(icon(CROP_ICONS[id], cx + dx, cy + dy, sc)); });
  // 篮口沿
  s += E(cx, cy - 42, 150, 22, '#A0713D', `stroke="#4A3520" stroke-width="2.5"`);
  s += E(cx, cy - 46, 140, 16, '#C89A62', 'opacity="0.85"');
  return s;
}

// ---------- Logo 牌匾 ----------
function logo(cx, cy) {
  let s = `<g transform="rotate(-2.5 ${cx} ${cy})">`;
  // 背板光晕
  s += E(cx, cy, 330, 130, 'url(#burst)');
  // 奶油纸牌匾 + 双层描边（手抄本语汇）
  s += RR(cx - 262, cy - 72, 524, 148, 26, 'url(#logoPaper)', '#4A3520', 4, `filter="url(#soft)"`);
  s += RR(cx - 250, cy - 60, 500, 124, 20, 'none', '#C9B891', 2, 'opacity="0.7"');
  // 左右麦穗装饰
  [-1, 1].forEach((d) => {
    const mx = cx + d * 216;
    s += `<g transform="rotate(${d * 14} ${mx} ${cy})">` + icon(CROP_ICONS.wheat, mx, cy + 6, 1.5) + `</g>`;
  });
  // 主标题（深棕描边 + 金色投影字）
  s += T(cx + 3, cy + 22, 68, '丰穗小镇', '#C98F1B', 'bold', 'middle', 0.55);
  s += T(cx, cy + 18, 68, '丰穗小镇', '#4A3520', 'bold');
  // 副标题缎带
  s += RR(cx - 150, cy + 42, 300, 36, 18, 'url(#gold)', '#C98F1B', 2);
  s += T(cx, cy + 67, 21, '种田 · 做饭 · 慢慢过日子', '#4A3520', 'bold');
  // 品牌标志：金色麦穗徽章（骑在牌匾顶边，未来微信头像/分享卡片同源复用）
  s += C(cx, cy - 78, 46, 'url(#gold)', `stroke="#4A3520" stroke-width="3" filter="url(#softSm)"`);
  s += C(cx, cy - 78, 38, 'none', `stroke="#FFF3C4" stroke-width="2" opacity="0.8"`);
  s += icon(CROP_ICONS.wheat, cx, cy - 76, 1.9);
  s += `</g>`;
  return s;
}

// ---------- 进度条 ----------
function progressBar(cx, y, ratio) {
  const w = 480, h = 34;
  let s = '';
  // 木框
  s += RR(cx - w / 2 - 8, y - 8, w + 16, h + 16, (h + 16) / 2, 'url(#woodSign)', '#4A3520', 3, `filter="url(#softSm)"`);
  // 底槽
  s += RR(cx - w / 2, y, w, h, h / 2, '#F3E4C2', '#4A3520', 2);
  // 金色填充 + 顶部高光 + 前端圆头
  const fw = Math.max(h, w * ratio);
  s += RR(cx - w / 2 + 3, y + 3, fw - 6, h - 6, (h - 6) / 2, 'url(#goldBar)');
  s += RR(cx - w / 2 + 10, y + 6, fw - 34, (h - 6) * 0.36, (h - 6) * 0.18, '#FFF3C4', 'none', 0, 'opacity="0.75"');
  s += C(cx - w / 2 + fw - 4, y + h / 2, 5, '#FFF3C4', 'opacity="0.9"');
  // 百分比
  s += T(cx, y + h / 2 + 8, 22, `${Math.round(ratio * 100)}%`, '#4A3520', 'bold');
  return s;
}

// ---------- 页面 ----------
// dynamic=false 时剔除动态件（小贴士/加载文案/进度条/百分比），烘成游戏内 loading 底图，
// 动态件由 GameController.makeSplash 代码叠加（进度实时推进、小贴士可轮换）。
function pageLoading(dynamic = true) {
  // 背景：田地场景（与游戏内同源，第一眼即世界观）
  let s = BG.field();
  // 底部压暗暖化，给进度条区让出可读性
  s += `<rect x="0" y="900" width="${W}" height="${H - 900}" fill="url(#fadeDown)" opacity="0.9"/>`;
  // Logo + 主视觉
  s += logo(W / 2, 232);
  s += harvestBasket(W / 2, 706);
  if (dynamic) {
    // 提示语（轮换小贴士的示意）
    s += T(W / 2, 1010, 24, '小贴士：成熟的作物会微微发光，记得回来看看', '#8B5A2B');
    // 加载文案 + 进度条
    s += T(W / 2, 1078, 28, '外婆正在生火备料…', '#4A3520', 'bold');
    s += progressBar(W / 2, 1104, 0.78);
  }
  // 健康游戏忠告（平台合规，loading 页固定位置）
  s += T(W / 2, 1206, 16, '抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。', '#8B7355', 'normal', 'middle', 0.9);
  s += T(W / 2, 1232, 16, '适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。', '#8B7355', 'normal', 'middle', 0.9);
  s += grain(0.07);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    DEFS + RR(0, 0, W, H, 0, '#A8D8EA') + s + `</svg>`;
}

fs.writeFileSync(path.join(OUT, 'loading.svg'), pageLoading());
console.log('✅ docs/mockups/loading.svg');

// ---------- 游戏内底图烘焙（静态版 → assets/resources/bg/loading.jpg） ----------
// 管线与 sim/gen-scene-bg.js 相同：Edge 无头截图 PNG → canvas 转 JPEG q87 → 手写 sprite-frame meta。
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const { spriteFrameMeta } = require('./cocos-meta');
const ROOT = path.join(__dirname, '..');
const EDGE = [process.env.EDGE,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean).find((p) => fs.existsSync(p));

if (EDGE) {
  const srcDir = path.join(ROOT, 'art-src', 'bg');
  const outDir = path.join(ROOT, 'assets', 'resources', 'bg');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  const svgPath = path.join(srcDir, 'loading.svg');
  fs.writeFileSync(svgPath, pageLoading(false));
  const pngPath = path.join(outDir, 'loading.png');
  execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--screenshot=${pngPath}`,
    `--window-size=${W},${H}`,
    `--user-data-dir=${path.join(ROOT, 'temp', 'edge-shot-loading')}`,
    `file:///${svgPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe' });
  // PNG → JPEG（Edge canvas --dump-dom 吐 dataURL，免外部图像库）
  const htmlPath = path.join(outDir, '_convert-loading.html');
  fs.writeFileSync(htmlPath,
    `<!doctype html><html><body><script>` +
    `const img=new Image();img.onload=()=>{` +
    `const c=document.createElement('canvas');c.width=${W};c.height=${H};` +
    `const x=c.getContext('2d');x.fillStyle='#FFF8E7';x.fillRect(0,0,c.width,c.height);` +
    `x.drawImage(img,0,0);document.body.textContent=c.toDataURL('image/jpeg',0.87);};` +
    `img.src='loading.png';</script></body></html>`);
  const dom = execFileSync(EDGE, [
    '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
    '--virtual-time-budget=8000', '--dump-dom',
    `--user-data-dir=${path.join(ROOT, 'temp', 'edge-shot-loading2')}`,
    `file:///${htmlPath.replace(/\\/g, '/')}`,
  ], { stdio: 'pipe', maxBuffer: 32 * 1024 * 1024 }).toString();
  fs.unlinkSync(htmlPath);
  const m = dom.match(/data:image\/jpeg;base64,([A-Za-z0-9+/=]+)/);
  if (!m) throw new Error('JPEG 转换失败：loading');
  const jpgPath = path.join(outDir, 'loading.jpg');
  fs.writeFileSync(jpgPath, Buffer.from(m[1], 'base64'));
  fs.writeFileSync(`${jpgPath}.meta`, spriteFrameMeta('loading', crypto.randomUUID(), W, H, '.jpg'));
  fs.unlinkSync(pngPath);
  if (fs.existsSync(`${pngPath}.meta`)) fs.unlinkSync(`${pngPath}.meta`);
  console.log(`✅ assets/resources/bg/loading.jpg（${(fs.statSync(jpgPath).size / 1024).toFixed(0)}KB，游戏内 loading 底图）+ meta`);
} else {
  console.log('⚠️ 未找到 Edge，仅出 mockup SVG');
}
// PNG 转换（Edge 无头模式，Git Bash）：
// "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
//   --screenshot="E:\Code\NewGame\docs\mockups\loading.png" --window-size=720,1280 --hide-scrollbars \
//   --user-data-dir="E:\Code\NewGame\temp\edge-shot-loading" "file:///E:/Code/NewGame/docs/mockups/loading.svg"
