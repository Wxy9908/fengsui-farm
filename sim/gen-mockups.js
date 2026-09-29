/**
 * 效果图生成器 v3：M3 目标效果图（2.5D 软渲染 · 手绘水彩 · 奶油暖调）。
 * 依据：docs/美术风格规范.md（色板 / 左上 45° 光源 / 圆角语言 / 禁忌清单）、
 *       docs/数据表设计.md §8（M3：农场等级系统 / 金币水槽 / 卖出预览 / 今日特价 / 首发内容量）。
 * 图标与游戏内同源：require('./art-lib.js')（美术 v1.1 权威源，22 菜品独立剪影 + 7 作物）；
 * 渐变/滤镜 defs 直接复用 art-lib.DEFS，仅追加 mockup 自用的 soilDry/soilWet。
 * 运行：node sim/gen-mockups.js → docs/mockups/{field,kitchen,shop,book}.svg + index.html
 * PNG 由 Edge 无头模式转换（见文件尾部注释命令）。
 */
const fs = require('fs');
const path = require('path');
const ART = require('./art-lib.js');
// 装饰背景与游戏内场景大图同源（sim/bg-lib.js），本文件只在其上叠加前景 UI。
const BG = require('./bg-lib.js')(ART);

const OUT = path.join(__dirname, '..', 'docs', 'mockups');
fs.mkdirSync(OUT, { recursive: true });

const W = 720;
const H = 1280;

// ---------- 基础件与图标库（与游戏内同源） ----------
const { FONT, esc, T, RR, C, E, P, PS, CROP_ICONS, CROP_NAMES, DISH_COLORS, DISH_NAMES, DISH_ICONS, icon, CROP_S1 } = ART;

// ---------- 全局 defs：art-lib 权威 defs + mockup 自用的干/湿土渐变 ----------
const DEFS = ART.DEFS.replace('</defs>', `
  <linearGradient id="soilDry" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="#CE9C64"/><stop offset="0.55" stop-color="#B0824F"/><stop offset="1" stop-color="#96683F"/>
  </linearGradient>
  <linearGradient id="soilWet" x1="0" y1="0" x2="0.6" y2="1">
    <stop offset="0" stop-color="#8A5F3C"/><stop offset="0.55" stop-color="#744C2E"/><stop offset="1" stop-color="#5F3D22"/>
  </linearGradient>
  <linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F3E4C2" stop-opacity="0"/><stop offset="1" stop-color="#F3E4C2"/>
  </linearGradient>
  <linearGradient id="fadeR" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#FFF8E7" stop-opacity="0"/><stop offset="1" stop-color="#FFF8E7"/>
  </linearGradient>
</defs>`);


const grain = (opacity = 0.05) => `<rect x="0" y="0" width="${W}" height="${H}" filter="url(#grain)" opacity="${opacity}"/>`;
const svg = (body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  DEFS + RR(0, 0, W, H, 0, bg) + body + `</svg>`;


// ---------- 全局 UI 件（2.5D） ----------
// 胶囊按钮：渐变 + 顶部高光 + 软投影
const pill = (x, y, w, h, label, opts = {}) => {
  const { fill = 'url(#paper)', stroke = '#4A3520', textFill = '#4A3520', size = 24, weight = 'normal', shadow = true } = opts;
  let s = RR(x, y, w, h, h / 2, fill, stroke, 2.5, shadow ? `filter="url(#softSm)"` : '');
  s += RR(x + w * 0.08, y + h * 0.12, w * 0.84, h * 0.36, h * 0.18, '#FFFFFF', 'none', 0, 'opacity="0.35"');
  s += T(x + w / 2, y + h / 2 + size * 0.36, size, label, textFill, weight);
  return s;
};
// 纸面板：纸渐变 + 软投影 + 顶部受光边
const panel = (x, y, w, h, title) => {
  let s = RR(x, y, w, h, 20, 'url(#paper)', '#4A3520', 2.5, `filter="url(#soft)"`);
  s += PS(`M${x + 18} ${y + 3.5} Q${x + w / 2} ${y + 0.5} ${x + w - 18} ${y + 3.5}`, '#FFFFFF', 2.5, 'opacity="0.7"');
  if (title) {
    s += PS(`M${x + 26} ${y + 40} L${x + w / 2 - 88} ${y + 40} M${x + w / 2 + 88} ${y + 40} L${x + w - 26} ${y + 40}`, '#C9B891', 2);
    s += T(x + w / 2, y + 48, 23, title, '#8B5A2B', 'bold');
  }
  return s;
};
// 列表项卡片
const itemCard = (x, y, w, h, selected) => {
  let s = RR(x, y, w, h, 14, selected ? 'url(#goldSoft)' : '#FFFDF5', selected ? '#C98F1B' : '#4A3520', 2.2, `filter="url(#softSm)"`);
  s += RR(x + 5, y + 4, w - 10, h * 0.34, 10, '#FFFFFF', 'none', 0, `opacity="${selected ? 0.3 : 0.55}"`);
  return s;
};
// 顶栏（M3）：左上个人区（外婆头像 + Lv4 徽章 + 经验条）· 右上金币胶囊（带“+”付费伏笔）
const topBar = (gold) => {
  // —— 左上：个人区衬底胶囊 ——
  let s = RR(14, 12, 264, 58, 29, '#4A3520', 'none', 0, 'opacity="0.82" filter="url(#softSm)"');
  // 外婆简笔头像：圆脸 + 发髻 + 圆眼镜 + 微笑 + 腮红
  s += `<g>` +
    C(48, 41, 21, '#FFF8E7', `stroke="#4A3520" stroke-width="2"`) +
    P('M29 39 Q30 19 48 19 Q66 19 67 39 Q59 29 48 29 Q37 29 29 39 Z', '#F5ECD4', `stroke="#4A3520" stroke-width="1.5"`) +
    C(48, 17, 6.5, '#F5ECD4', `stroke="#4A3520" stroke-width="1.5"`) +
    C(41.5, 41, 4.6, 'none', `stroke="#4A3520" stroke-width="1.3"`) +
    C(54.5, 41, 4.6, 'none', `stroke="#4A3520" stroke-width="1.3"`) +
    PS('M46.1 41 L49.9 41 M36.9 40 L31 38 M59.1 40 L65 38', '#4A3520', 1.3) +
    C(41.5, 41, 1.7, '#4A3520') + C(54.5, 41, 1.7, '#4A3520') +
    PS('M44 49 Q48 52.5 52 49', '#4A3520', 1.6) +
    C(36.5, 47, 2.8, '#F4A7B9', 'opacity="0.55"') + C(59.5, 47, 2.8, '#F4A7B9', 'opacity="0.55"') +
    `</g>`;
  // 等级徽章 + 经验条（812/1200，约 68%）
  s += C(90, 41, 13, 'url(#goldSoft)', `stroke="#C98F1B" stroke-width="2"`);
  s += T(90, 45.5, 10.5, 'Lv4', '#6B4423', 'bold');
  s += RR(110, 35, 100, 12, 6, '#2E1D0E', 'none', 0, 'opacity="0.55"');
  s += RR(110, 35, 100 * 0.68, 12, 6, 'url(#gold)');
  s += RR(110, 35, 100 * 0.68, 5, 2.5, '#FFFFFF', 'none', 0, 'opacity="0.35"');
  s += T(216, 45, 11.5, '812/1200', '#FFE9A8', 'normal', 'start');
  // —— 右上：金币胶囊 + “+”按钮（付费扩展伏笔，低调） ——
  s += RR(W - 178, 14, 164, 48, 24, '#4A3520', 'none', 0, 'opacity="0.82" filter="url(#softSm)"');
  s += C(W - 148, 38, 15, 'url(#gold)', `stroke="#8A5F10" stroke-width="2"`);
  s += T(W - 148, 44.5, 17, '¥', '#6B4423', 'bold');
  s += T(W - 126, 46.5, 23, `${gold}`, '#FFE9A8', 'bold', 'start');
  s += C(W - 30, 38, 12, 'url(#goldSoft)', `stroke="#C98F1B" stroke-width="1.8"`);
  s += PS(`M${W - 30} 32.5 L${W - 30} 43.5 M${W - 35.5} 38 L${W - 24.5} 38`, '#6B4423', 2.4);
  return s;
};
const msgBar = (msg) => (msg ? T(W / 2, 106, 22, msg, '#5C4028', 'bold') : '');
// 底部导航：木牌 tab（默认四页；订单页可传五页）
const navBar = (active, tabs = ['田地', '厨房', '小铺', '图鉴']) => {
  const n = tabs.length;
  const gap = n <= 4 ? 172 : 138;
  const bw = n <= 4 ? 164 : 128;
  const x0 = n <= 4 ? 26 : Math.round((W - ((n - 1) * gap + bw)) / 2);
  let s = RR(0, H - 118, W, 118, 0, '#6B4423', 'none', 0, 'opacity="0.16"');
  tabs.forEach((t, i) => {
    const x = x0 + i * gap;
    const on = t === active;
    s += pill(x, H - 100, bw, 66, t, on
      ? { fill: 'url(#gold)', stroke: '#8A5F10', weight: 'bold', size: n <= 4 ? 26 : 22 }
      : { fill: 'url(#paper)', size: n <= 4 ? 26 : 22 });
  });
  return s;
};
const coin = (x, y, r) => C(x, y, r, 'url(#gold)', `stroke="#8A5F10" stroke-width="2"`) + T(x, y + r * 0.38, r * 1.05, '¥', '#6B4423', 'bold');

// ==================== 页面 1：田地 ====================
const groundShadow = (cx, by, rx) => E(cx + 5, by + 2, rx, rx * 0.3, '#4A3520', 'opacity="0.22" filter="url(#blur4)"');

// 圆角菱形路径（2:1 斜切地块，角部裁圆）
function diamondPath(cx, cy, hw, hh, r = 0.16) {
  const pts = [[cx, cy - hh], [cx + hw, cy], [cx, cy + hh], [cx - hw, cy]];
  let d = '';
  pts.forEach((c, i) => {
    const p = pts[(i + 3) % 4], n = pts[(i + 1) % 4];
    const ax = c[0] + (p[0] - c[0]) * r, ay = c[1] + (p[1] - c[1]) * r;
    const bx = c[0] + (n[0] - c[0]) * r, by = c[1] + (n[1] - c[1]) * r;
    d += (i === 0 ? `M${ax} ${ay}` : `L${ax} ${ay}`) + ` Q${c[0]} ${c[1]} ${bx} ${by}`;
  });
  return d + ' Z';
}

// 菱形地块：落地投影 + 土坡厚度 + 顶面（干/湿）+ 沿菱向犁沟 + 颗粒 + 状态内容
function isoPlot(cx, cy, hw, hh, opt) {
  const { soil = 'dry', crop = null, stage = 0, v = 0 } = opt;
  const k = hw / 100; // 地块缩放（近大远小）
  // 未解锁坑位：草地上的虚线轮廓 + 小锁（无土坡，与草地齐平）
  if (opt.locked) {
    let s = P(diamondPath(cx, cy, hw * 0.96, hh * 0.96), '#6FB53F', `stroke="#4E8A2E" stroke-width="2.2" stroke-dasharray="7 6" opacity="0.9"`);
    const lw = 30 * k, lh = 22 * k, ly = cy - lh * 0.3;
    s += PS(`M${cx - lw * 0.26} ${ly} L${cx - lw * 0.26} ${ly - lh * 0.55} Q${cx} ${ly - lh * 1.35} ${cx + lw * 0.26} ${ly - lh * 0.55} L${cx + lw * 0.26} ${ly}`, '#4A3520', 3 * k);
    s += RR(cx - lw / 2, ly, lw, lh, 5 * k, '#8A7A5A', '#4A3520', 2 * k, 'opacity="0.92"');
    s += C(cx, ly + lh * 0.42, 2.6 * k, '#4A3520') + PS(`M${cx} ${ly + lh * 0.42} L${cx} ${ly + lh * 0.72}`, '#4A3520', 2.4 * k);
    return s;
  }
  const th = hh * 0.14; // 土坡厚度（压低，避免与顶面形成明显分层）
  const wet = soil === 'wet';
  let s = '';
  // 草地上的落地投影
  s += E(cx + 5, cy + th + hh * 0.5, hw * 1.04, hh * 0.36, '#2F5D1F', 'opacity="0.32" filter="url(#blur4)"');
  // 侧沿土坡（与顶面同色系、稍深，衔接自然不分层）
  s += P(diamondPath(cx, cy + th, hw, hh), wet ? '#6B4526' : '#8A5B32');
  // 顶面土壤
  s += P(diamondPath(cx, cy, hw, hh), wet ? 'url(#soilWet)' : 'url(#soilDry)', `stroke="#5C3A1E" stroke-width="2.5"`);
  // 上角受光（左上 45° 光源）
  s += PS(`M${cx - hw * 0.62} ${cy - hh * 0.36} Q${cx} ${cy - hh * 1.04} ${cx + hw * 0.62} ${cy - hh * 0.36}`, wet ? '#B08962' : '#EAC69A', 2.5, 'opacity="0.8"');
  // 犁沟：连接 L-T 边与 B-R 边的平行弧线（沿菱形方向）+ 沟沿受光
  [0.32, 0.5, 0.68].forEach((t) => {
    const ax = cx - hw + t * hw, ay = cy - t * hh;
    const bx = cx + t * hw, by = cy + hh - t * hh;
    const mx = (ax + bx) / 2 + hh * 0.07, my = (ay + by) / 2 - hw * 0.035;
    s += PS(`M${ax} ${ay} Q${mx} ${my} ${bx} ${by}`, wet ? '#3E2812' : '#7A4A22', 4.5 * k, `opacity="${wet ? 0.65 : 0.6}"`);
    s += PS(`M${ax - 2.5} ${ay - 2.5} Q${mx - 2.5} ${my - 2.5} ${bx - 2.5} ${by - 2.5}`, wet ? '#A87F57' : '#E4B57E', 1.6, 'opacity="0.55"');
  });
  // 土壤颗粒（按 v 错位，避免每块一样）
  const spk = [[-0.5, -0.12], [-0.18, 0.28], [0.32, -0.3], [0.48, 0.12], [0.06, -0.48], [-0.12, -0.32], [0.2, 0.42], [-0.42, 0.3]];
  spk.forEach(([fx, fy], i) => {
    const j = (i + v * 3) % spk.length;
    const [gx, gy] = spk[j];
    s += E(cx + gx * hw, cy + gy * hh, 2.4 * k, 1.5 * k, wet ? '#3A2410' : '#7A5230', 'opacity="0.45"');
  });
  // 种植位：后 1 前 2 的三角阵型（沿犁沟排布）
  const spots = [
    [cx, cy - hh * 0.24, 0.82],
    [cx - hw * 0.3, cy + hh * 0.16, 1.0],
    [cx + hw * 0.3, cy + hh * 0.16, 1.0],
  ];
  if (crop) {
    if (stage >= 1) {
      // 成熟微光晕
      s += C(cx, cy - 34 * k, 62 * k, '#FFE98A', 'opacity="0.42" filter="url(#blur8)"');
    }
    spots.forEach(([px, py, ps]) => {
      if (stage < 0.35) {
        // 苗期：直接用 art-lib 的作物专属 s1 图标（与游戏内同源，落地影含在图标内）
        const ss = k * ps * (1.35 + stage * 1.2) * 0.8;
        s += icon(CROP_S1[crop], px, py - 18 * ss, ss);
      } else s += PLANTS[crop](px, py, k * ps * (0.55 + stage * 0.6));
    });
    if (stage >= 1 && opt.badge !== false) {
      // 胶囊锚在地块下角（半压土坡），紧贴所属地块
      const bw = Math.max(96 * k, 60), fs = Math.max(15 * k, 11.5), by = cy + hh * 0.52;
      s += RR(cx - bw / 2, by, bw, 24, 12, 'url(#gold)', '#8A5F10', 2, `filter="url(#softSm)"`);
      s += T(cx, by + 17, fs, '可收获！', '#4A3520', 'bold');
    } else if (stage < 1) {
      const bw = 72 * k, by = cy + hh + th + 12;
      s += RR(cx - bw / 2, by, bw, 9, 4.5, '#FFFDF5', 'none', 0, 'opacity="0.85"');
      s += RR(cx - bw / 2, by, bw * stage, 9, 4.5, '#7EC850');
    }
    // 化肥催熟小按钮（M3 金币水槽：生长期地块角上的金色圆钮 + 闪电）
    if (opt.fert) {
      const fx = cx + hw * 0.68, fy = cy - hh * 0.62, fr = Math.max(12 * k, 11);
      s += C(fx, fy, fr, 'url(#gold)', `stroke="#8A5F10" stroke-width="2" filter="url(#softSm)"`);
      s += P(`M${fx + 1.5} ${fy - 6.5} L${fx - 4} ${fy + 0.8} L${fx - 0.6} ${fy + 0.8} L${fx - 1.5} ${fy + 6.5} L${fx + 4} ${fy - 0.8} L${fx + 0.6} ${fy - 0.8} Z`, '#4A3520');
    }
  } else if (wet) {
    // 已翻整湿土：水光 + 小木牌（随地块缩放）
    const bw = 88 * k, bh = 32 * k, fs = 18 * k;
    const sx = cx + hw * 0.3, sy2 = cy - hh * 0.08;
    s += E(cx - hw * 0.28, cy - hh * 0.28, 7 * k, 3 * k, '#FFF8E7', 'opacity="0.3"');
    s += E(cx + hw * 0.34, cy + hh * 0.1, 5 * k, 2.4 * k, '#FFF8E7', 'opacity="0.22"');
    s += PS(`M${sx} ${cy + hh * 0.32} L${sx} ${sy2}`, '#6B4423', 3);
    s += RR(sx - bw / 2, sy2 - bh, bw, bh, 6 * k, 'url(#woodSign)', '#4A3520', 1.6, `transform="rotate(-3 ${sx} ${sy2 - bh / 2})" filter="url(#softSm)"`);
    s += T(sx, sy2 - bh / 2 + fs * 0.36, fs, '翻地', '#FFF8E7');
  } else if (opt.sign) {
    // 空地：播种小木牌（随地块缩放）
    const bw = 84 * k, bh = 32 * k, fs = 18 * k;
    const sy2 = cy - hh * 0.08;
    s += PS(`M${cx} ${cy + hh * 0.3} L${cx} ${sy2}`, '#6B4423', 3);
    s += RR(cx - bw / 2, sy2 - bh, bw, bh, 6 * k, 'url(#woodSign)', '#4A3520', 1.6, `transform="rotate(-2 ${cx} ${sy2 - bh / 2})" filter="url(#softSm)"`);
    s += T(cx, sy2 - bh / 2 + fs * 0.36, fs, '播种', '#FFF8E7');
  }
  return s;
}

// 草丛 / 小花 / 暖石（地块间点缀）
const grassTuft = (x, y, s = 1) =>
  PS(`M${x} ${y} Q${x - 7 * s} ${y - 12 * s} ${x - 9 * s} ${y - 18 * s} M${x} ${y} Q${x} ${y - 14 * s} ${x + 1 * s} ${y - 21 * s} M${x} ${y} Q${x + 7 * s} ${y - 12 * s} ${x + 9 * s} ${y - 17 * s}`, '#5CA83C', 2.6 * s);
const flower = (x, y, s = 1, color = '#F4A7B9') =>
  [0, 72, 144, 216, 288].map((a) => {
    const r = (a * Math.PI) / 180;
    return E(x + Math.cos(r) * 4.6 * s, y + Math.sin(r) * 4.6 * s, 3.4 * s, 3.4 * s, color, `stroke="#4A3520" stroke-width="0.8"`);
  }).join('') + C(x, y, 2.6 * s, '#F2B830', `stroke="#4A3520" stroke-width="0.8"`);
const stone = (x, y, s = 1) =>
  E(x, y, 11 * s, 7.5 * s, '#D9C9A8', `stroke="#8B7355" stroke-width="1.5"`) +
  E(x - 3 * s, y - 2.5 * s, 4 * s, 2.2 * s, '#F3EAD2', 'opacity="0.8"');

// 植株（都带落地投影，根扎进垄里；苗期统一用 art-lib 的 CROP_S1，不再自绘）

const wheatPlant = (cx, by, s = 1) => {
  let r = groundShadow(cx, by, 30 * s);
  [-14, 0, 14].forEach((dx, i) => {
    const top = by - (52 + (i === 1 ? 9 : 0)) * s;
    const x0 = cx + dx * s;
    r += PS(`M${x0} ${by} Q${x0 + 3 * s} ${(by + top) / 2} ${x0} ${top}`, '#A0713D', 3.5);
    for (let g = 0; g < 4; g++) {
      const gy = top + 2 + g * 6.5 * s;
      r += E(x0 - 5 * s, gy, 4 * s, 6 * s, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.1"`);
      r += E(x0 + 5 * s, gy + 3.2 * s, 4 * s, 6 * s, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.1"`);
    }
    r += PS(`M${x0} ${top} L${x0 - 6 * s} ${top - 10 * s} M${x0} ${top} L${x0} ${top - 13 * s} M${x0} ${top} L${x0 + 6 * s} ${top - 10 * s}`, '#D9A020', 1.6);
  });
  return r;
};

const tomatoBush = (cx, by, s = 1) => {
  let r = groundShadow(cx, by, 34 * s);
  r += PS(`M${cx} ${by} L${cx} ${by - 26 * s}`, '#4E9433', 4);
  r += C(cx - 17 * s, by - 28 * s, 14 * s, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6"`);
  r += C(cx + 17 * s, by - 26 * s, 13 * s, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6"`);
  r += C(cx, by - 41 * s, 16 * s, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6"`);
  r += C(cx - 12 * s, by - 21 * s, 8 * s, 'url(#tomatoG)', `stroke="#4A3520" stroke-width="1.6"`);
  r += C(cx + 13 * s, by - 17 * s, 7.5 * s, 'url(#tomatoG)', `stroke="#4A3520" stroke-width="1.6"`);
  r += C(cx + 2 * s, by - 34 * s, 8.5 * s, 'url(#tomatoG)', `stroke="#4A3520" stroke-width="1.6"`);
  r += E(cx - 14 * s, by - 24 * s, 2 * s, 1.3 * s, '#FFB3A0', 'opacity="0.85"');
  r += E(cx, by - 37 * s, 2.2 * s, 1.4 * s, '#FFB3A0', 'opacity="0.85"');
  return r;
};

const pumpkinPlant = (cx, by, s = 1) => {
  let r = groundShadow(cx + 8 * s, by, 36 * s);
  r += PS(`M${cx - 32 * s} ${by - 3} Q${cx - 12 * s} ${by - 17 * s} ${cx + 4 * s} ${by - 10 * s}`, '#4E9433', 3.5);
  r += P(`M${cx - 20 * s} ${by - 8 * s} q-9 * 0 -12 * 0 2 -10 * 0`, 'none');
  r += C(cx - 20 * s, by - 12 * s, 7 * s, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`);
  r += C(cx - 4 * s, by - 16 * s, 6 * s, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`);
  r += E(cx + 12 * s, by - 13 * s, 20 * s, 15 * s, 'url(#orangeG)', `stroke="#4A3520" stroke-width="2"`);
  r += PS(`M${cx + 12 * s} ${by - 27 * s} Q${cx + 4 * s} ${by - 13 * s} ${cx + 12 * s} ${by + 1 * s} M${cx + 12 * s} ${by - 27 * s} Q${cx + 20 * s} ${by - 13 * s} ${cx + 12 * s} ${by + 1 * s}`, '#D96F10', 1.8);
  r += E(cx + 5 * s, by - 19 * s, 4 * s, 2.6 * s, '#FCCB8E', 'opacity="0.8" transform="rotate(-20 5 0)"');
  r += PS(`M${cx + 12 * s} ${by - 27 * s} Q${cx + 13 * s} ${by - 33 * s} ${cx + 18 * s} ${by - 34 * s}`, '#3E8E41', 3);
  return r;
};

const cornStalk = (cx, by, s = 1) => {
  let r = groundShadow(cx, by, 22 * s);
  r += PS(`M${cx} ${by} L${cx} ${by - 62 * s}`, '#5CA83C', 5);
  r += P(`M${cx} ${by - 18 * s} Q${cx - 27 * s} ${by - 28 * s} ${cx - 30 * s} ${by - 48 * s} Q${cx - 12 * s} ${by - 40 * s} ${cx} ${by - 28 * s} Z`, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`);
  r += P(`M${cx} ${by - 32 * s} Q${cx + 25 * s} ${by - 42 * s} ${cx + 27 * s} ${by - 60 * s} Q${cx + 11 * s} ${by - 50 * s} ${cx} ${by - 42 * s} Z`, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`);
  r += RR(cx + 3 * s, by - 44 * s, 11 * s, 26 * s, 5.5 * s, 'url(#goldFruit)', '#4A3520', 1.5, `transform="rotate(12 ${cx + 8 * s} ${by - 31 * s})"`);
  r += PS(`M${cx} ${by - 62 * s} L${cx - 5 * s} ${by - 72 * s} M${cx} ${by - 62 * s} L${cx} ${by - 75 * s} M${cx} ${by - 62 * s} L${cx + 5 * s} ${by - 72 * s}`, '#D9A020', 2);
  return r;
};

const PLANTS = { wheat: wheatPlant, tomato: tomatoBush, pumpkin: pumpkinPlant, corn: cornStalk };

function pageField() {
  // 装饰背景（天空/远山/大树/小屋/灯笼串/草地/栅栏）：与游戏内 bg/field.jpg 同源
  let s = BG.field();
  // 顶部 UI（个人区 + 金币区在 topBar 内）
  s += topBar(251);
  s += T(W / 2, 140, 22, '收获了 番茄 ×1', '#5C4028', 'bold');
  // 种子选择：非常驻左侧列表，改为点空地时从底部弹出的抽屉（见页面末尾 seedDrawer）
  // 可扩展菱形网格：按地块数 N 自动排行（对齐 data/upgrades.json 田地 Lv1~4 = 4/6/8/10 块）
  // 可扩展菱形网格：3/4/5/4/3 插缝布局（奇偶行错位半格），共 19 个坑位
  // 解锁逻辑：从第 3 排（中间排）正中央开始，按到网格中心的平面距离逐渐向外解锁。
  // 落到代码时同一套规则：坑位坐标 = (row, col) 插值，解锁序 = sortBy(dx²+(dy*2)²) 稳定排序。
  const FIELD_LEVEL = 4, UNLOCKED = 10; // 演示档位：Lv4 · 已解锁 10 / 19
  const GRID_ROWS = [3, 4, 5, 4, 3];
  const TOTAL = GRID_ROWS.reduce((a, b) => a + b, 0);
  // 状态梯队（按解锁顺序依次填充已解锁坑位）：干土空地/湿土已翻整/幼苗/生长期/成熟 全覆盖
  const PLOT_STATES = [
    { soil: 'wet', crop: 'wheat', stage: 1, v: 0 },
    { soil: 'wet', crop: null, v: 1 },
    { soil: 'dry', crop: 'tomato', stage: 0.18, v: 2 },
    { soil: 'wet', crop: 'tomato', stage: 0.62, v: 0 },
    { soil: 'dry', crop: null, sign: true, v: 1 },
    { soil: 'wet', crop: 'corn', stage: 0.45, v: 1, fert: true },
    { soil: 'wet', crop: 'wheat', stage: 0.78, v: 2 },
    { soil: 'dry', crop: null, v: 0 },
    { soil: 'wet', crop: 'tomato', stage: 1, v: 2 },
    { soil: 'wet', crop: 'pumpkin', stage: 1, badge: false, v: 1 },
  ];
  const nRows = GRID_ROWS.length;
  const midRow = (nRows - 1) / 2;
  const topY = 716, stepY = 66, stepX = 134;
  // 生成全部坑位：dx/dy 为相对网格中心的格坐标（dy 乘 2 让纵向间距观感与横向一致）
  const cells = [];
  GRID_ROWS.forEach((count, ri) => {
    for (let j = 0; j < count; j++) {
      cells.push({ ri, j, dx: j - (count - 1) / 2, dy: ri - midRow });
    }
  });
  // 解锁顺序：按画面上的视觉距离（dy 乘 stepX/stepY 折算成等距环形扩散）；
  // 同距离时行优先（上→下）、再列优先（左→右），保证确定性
  const DYW = stepX / stepY;
  const byDist = [...cells].sort((a, b) =>
    (a.dx * a.dx + DYW * DYW * a.dy * a.dy) - (b.dx * b.dx + DYW * DYW * b.dy * b.dy) || a.dy - b.dy || a.dx - b.dx);
  byDist.forEach((c, i) => { c.unlockOrder = i + 1; });
  // 渲染：按行从后往前（上行压下行），已解锁的按解锁顺序取状态
  let plotIdx = 0;
  GRID_ROWS.forEach((count, ri) => {
    const scale = 0.88 + ri * (0.24 / (nRows - 1)); // 远小近大
    const cy = topY + ri * stepY;
    for (let j = 0; j < count; j++) {
      const cell = cells.find((c) => c.ri === ri && c.j === j);
      const cx = 360 + cell.dx * stepX * scale;
      const locked = cell.unlockOrder > UNLOCKED;
      const opt = locked ? { locked: true } : (PLOT_STATES[plotIdx++] || { soil: 'dry', crop: null });
      s += isoPlot(cx, cy, 68 * scale, 34 * scale, opt);
      // 解锁顺序编号（设计稿标注，游戏内不显示）
      s += `<g opacity="0.85">` + C(cx - 68 * scale * 0.62, cy - 34 * scale * 0.55, 11, locked ? '#4E8A2E' : '#6B4423') +
        T(cx - 68 * scale * 0.62, cy - 34 * scale * 0.55 + 5, 14, String(cell.unlockOrder), '#FFF8E7', 'bold') + `</g>`;
    }
  });
  // 地块间的草地点缀：草丛 / 小花 / 暖石（沿集群两侧与底部补白）
  s += grassTuft(84, 752, 0.85) + grassTuft(648, 798, 1.0) + grassTuft(44, 876, 1.05) +
    grassTuft(700, 905, 0.9) + grassTuft(368, 1042, 1.1) + grassTuft(64, 996, 0.95) +
    grassTuft(660, 1006, 1.0) + grassTuft(238, 1052, 0.9);
  s += flower(112, 760, 0.95) + flower(58, 956, 1.05) +
    flower(640, 956, 0.95) + flower(452, 1058, 0.85, '#FFF8E7') + flower(140, 702, 0.8) + flower(664, 822, 0.85, '#FFF8E7');
  s += stone(640, 750, 0.95) + stone(96, 1016, 1.1) + stone(330, 1046, 0.75);
  // 收获篮区（左下）：每收获一种食材多一个篮子，最多展示 4 个。
  // 数量不标数字，按 少(1)/中(2~4)/多(5+) 三档显示不同堆叠贴图。
  const harvestBasket = (x, y, cropId, count) => {
    const inner = CROP_ICONS[cropId];
    const pile = count >= 5 // 多：冒尖的一堆
      ? icon(inner, -13, -3, 0.7) + icon(inner, 3, -11, 0.85) + icon(inner, 15, -3, 0.65)
      : count >= 2 // 中：两个并排
        ? icon(inner, -10, -6, 0.8) + icon(inner, 10, -8, 0.8)
        : icon(inner, 0, -8, 0.95); // 少：孤零零一个
    return `<g transform="translate(${x} ${y})">` +
      E(4, 14, 52, 10, '#2F5D1F', 'opacity="0.3" filter="url(#blur4)"') +
      P('M-42 -6 Q-46 26 0 28 Q46 26 42 -6 Q20 4 0 4 Q-20 4 -42 -6 Z', 'url(#woodSign)', `stroke="#4A3520" stroke-width="2.2"`) +
      PS('M-38 4 Q0 16 38 4 M-30 14 Q0 22 30 14', '#6B4423', 1.8, 'opacity="0.7"') +
      PS('M-26 -6 Q0 -34 26 -6', '#8B5A2B', 4) +
      pile +
      `</g>`;
  };
  // 演示：番茄 中（×3）/ 小麦 多（×5）/ 南瓜 少（×1）（第 4 个槽位留空，满 4 种后不再新增）
  const HARVEST_DEMO = [['tomato', 3], ['wheat', 5], ['pumpkin', 1]];
  HARVEST_DEMO.slice(0, 4).forEach(([id, n], i) => {
    s += harvestBasket(96 + i * 112, 1072, id, n);
  });
  // 前景道具：浇水壶（右）+ 蝴蝶
  s += `<g transform="translate(596 1064)">` +
    E(2, 24, 46, 9, '#2F5D1F', 'opacity="0.3" filter="url(#blur4)"') +
    PS('M27 8 Q45 2 51 -13', '#4A3520', 10) +
    PS('M27 8 Q45 2 51 -13', '#E8D9B8', 6) +
    E(53, -16, 8, 5.5, '#E8D9B8', `stroke="#4A3520" stroke-width="2" transform="rotate(-32 53 -16)"`) +
    PS('M60 -12 q3 7 -1 13 M67 -8 q3 7 -1 13', '#7FB8D9', 2.5, 'opacity="0.85"') +
    P('M-26 -14 L22 -14 Q28 -14 28 -6 L26 16 Q25 22 18 22 L-18 22 Q-26 22 -26 15 L-28 -6 Q-28 -14 -26 -14 Z', '#E8D9B8', `stroke="#4A3520" stroke-width="2.2" filter="url(#softSm)"`) +
    PS('M-16 -22 Q-1 -35 14 -22', '#6B4423', 4) +
    RR(-13, -22, 23, 9, 4, '#E8D9B8', '#4A3520', 2) +
    E(-11, -3, 10, 4.5, '#FFFDF5', 'opacity="0.65"') +
    `</g>`;
  s += `<g transform="translate(118 646) rotate(12)">` +
    E(-5, 0, 6.5, 4.5, '#F2B830', `stroke="#4A3520" stroke-width="1.2" transform="rotate(-24 -5 0)"`) +
    E(5, 0, 6.5, 4.5, '#F4A7B9', `stroke="#4A3520" stroke-width="1.2" transform="rotate(24 5 0)"`) +
    PS('M0 -4 L0 5', '#4A3520', 1.6) +
    `</g>`;
  // 栅栏上挂着的田地等级木牌
  s += PS('M566 600 L568 634 M682 600 L680 634', '#6B4423', 2.5);
  s += RR(516, 632, 220, 42, 9, 'url(#woodSign)', '#4A3520', 2.2, `transform="rotate(1.5 626 653)" filter="url(#softSm)"`);
  s += T(626, 660, 18, `田地 Lv${FIELD_LEVEL} · ${UNLOCKED}/${TOTAL} 块地`, '#FFF8E7', 'bold', 'middle', 1);
  s += navBar('田地');
  // —— 种子抽屉（点“播种/翻地”空地时从底部弹出，遮住导航；mockup 展示打开状态）——
  // 交互规则：点空地弹出，选种子或点遮罩/✕ 收起；两行网格随列整体左右滑动，作物增多只增加列数。
  {
    s += RR(0, 0, W, H, 0, '#3A2A18', 'none', 0, 'opacity="0.32"'); // 全屏遮罩
    const dy = 848; // 抽屉顶
    s += RR(0, dy, W, H - dy, 28, 'url(#paper)', '#4A3520', 2.5, `filter="url(#softSm)"`);
    s += RR(310, dy + 12, 100, 7, 3.5, '#C9B48E'); // 顶部抓手
    s += T(W / 2, dy + 52, 24, '选择种子', '#4A3520', 'bold');
    s += T(W - 44, dy + 52, 24, '✕', '#A8916B', 'bold');
    // 两行网格卡片：上图标下名字，选中金框，锁定灰化 + Lv 标记；右侧渐隐提示可滑动
    const SEEDS = [
      ['wheat', 0], ['strawberry', 5], ['tomato', 0], ['watermelon', 0], ['potato', 0],
      ['carrot', 0], ['corn', 0], ['cabbage', 0], ['pumpkin', 0], ['mushroom', 0], ['chili', 0],
    ]; // [作物, 解锁等级](0=已解锁)；按列排列，每列上下两个
    const cw = 150, ch = 96, gapX = 14, x0 = 34, ry1 = dy + 76, ry2 = dy + 184;
    SEEDS.forEach(([id, lockLv], i) => {
      const col = Math.floor(i / 2), row = i % 2;
      const x = x0 + col * (cw + gapX), y = row ? ry2 : ry1;
      const sel = id === 'tomato';
      s += itemCard(x, y, cw, ch, sel);
      if (lockLv > 0) {
        s += `<g opacity="0.38">` + icon(CROP_ICONS[id], x + cw / 2, y + 36, 0.85) + `</g>`;
        s += T(x + cw / 2, y + 76, 19, CROP_NAMES[id], '#A8916B');
        s += RR(x + cw - 64, y + 8, 56, 20, 10, '#4A3520', 'none', 0, 'opacity="0.75"');
        s += T(x + cw - 36, y + 22, 12, `Lv${lockLv} 解锁`, '#FFE9A8');
      } else {
        s += icon(CROP_ICONS[id], x + cw / 2, y + 36, 0.85);
        s += T(x + cw / 2, y + 76, 19, CROP_NAMES[id], '#4A3520', sel ? 'bold' : 'normal');
      }
    });
    // 右缘渐隐 + 小箭头：提示后面还有（共 15 种，首发 6 种随等级解锁）
    s += RR(W - 96, ry1 - 6, 96, ry2 + ch - ry1 + 12, 0, 'url(#fadeR)');
    s += T(W - 26, dy + 178, 30, '›', '#A8916B', 'bold');
    // 底部滑动条
    s += RR(220, H - 26, 280, 8, 4, '#C9B48E', 'none', 0, 'opacity="0.6"');
    s += RR(220, H - 26, 96, 8, 4, '#8B5A2B');
  }
  s += grain(0.05);
  return svg(s, '#D9F0E3');
}

// ==================== 页面 2：厨房 ====================
function pageKitchen() {
  // 装饰背景（木墙/挂饰/台面/地板/大锅/切菜板/调味罐）：与游戏内 bg/kitchen.jpg 同源
  let s = BG.kitchen();
  // 顶部 UI：顶栏 + 发现食谱的金色 toast（一条，不再和倒计时并排抢层次）
  s += topBar(251) + msgBar('✨ 发现新食谱「番茄汤」！');
  // 组合槽：横排在锅正上方，同种食材合并计数（番茄×2 占 1 槽）；空槽虚线
  {
    const SLOTS = [['tomato', 2], null, null]; // 演示：番茄汤 = 番茄×2
    const sw = 132, sh = 108, gap = 24, sx0 = (W - (SLOTS.length * sw + (SLOTS.length - 1) * gap)) / 2, sy = 330;
    s += T(W / 2, sy - 16, 18, `组合槽 1/${SLOTS.length}`, '#FFE9A8', 'bold');
    SLOTS.forEach((slot, i) => {
      const [id, n] = slot || [];
      const x = sx0 + i * (sw + gap);
      if (id) {
        s += itemCard(x, sy, sw, sh, true);
        s += icon(CROP_ICONS[id], x + sw / 2, sy + 40, 0.9);
        s += T(x + sw / 2, sy + 86, 19, `${CROP_NAMES[id]} ×${n}`, '#4A3520', 'bold');
      } else {
        s += RR(x, sy, sw, sh, 14, '#FFFDF5', '#C9B891', 2, 'opacity="0.4" stroke-dasharray="8 6"');
        s += T(x + sw / 2, sy + sh / 2 + 7, 19, '空槽位', '#C9B891');
      }
      // 槽位 → 锅 的倒入引导线
      s += PS(`M${x + sw / 2} ${sy + sh + 6} L${x + sw / 2} ${sy + sh + 22}`, '#FFE9A8', 2.5, 'opacity="0.5" stroke-dasharray="3 5"');
    });
  }
  // 烹饪状态：槽满后显示进度（演示：番茄汤 剩余 8 秒）
  s += RR(260, 470, 200, 12, 6, '#2E1D0E', 'none', 0, 'opacity="0.55"');
  s += RR(260, 470, 200 * 0.72, 12, 6, 'url(#gold)');
  s += T(W / 2, 506, 17, '番茄汤 · 剩余 8 秒', '#FFE9A8', 'bold');
  // 状态按钮：按烹饪状态只显示一个（待开始=开始烹饪 / 烹饪中=倒计时置灰 / 完成=出锅高亮）
  s += pill(196, 756, 328, 62, '开始烹饪', { fill: 'url(#gold)', stroke: '#8A5F10', weight: 'bold', size: 26 });
  // 食材区（台面下方通栏）：两行网格、随列左右滑动，只展示持有的食材，数量写在名字后
  {
    const py = 876, pw = W - 32;
    s += panel(16, py, pw, 272, '食材（点击放入）');
    const STOCK = [['wheat', 3], ['tomato', 2], ['potato', 1], ['pumpkin', 1], ['corn', 1], ['carrot', 1], ['cabbage', 1]];
    const cw = 160, ch = 82, gapX = 12, x0 = 22, ry1 = py + 56, ry2 = py + 150;
    STOCK.forEach(([id, n], i) => {
      const col = Math.floor(i / 2), row = i % 2;
      const x = x0 + col * (cw + gapX), y = row ? ry2 : ry1;
      s += itemCard(x, y, cw, ch, false);
      s += icon(CROP_ICONS[id], x + 34, y + ch / 2, 0.8);
      s += T(x + 62, y + ch / 2 + 7, 19, `${CROP_NAMES[id]} ×${n}`, '#4A3520', 'normal', 'start');
    });
    // 右缘渐隐：提示可横滑
    s += RR(W - 112, py + 46, 96, 210, 0, 'url(#fadeR)');
  }
  s += navBar('厨房');
  s += grain(0.06);
  return svg(s, '#6F4822');
}

// ==================== 页面 3：商店 ====================
function pageShop() {
  // 装饰背景（灰泥墙/遮阳棚/木招牌/水果筐）：与游戏内 bg/shop.jpg 同源
  let s = BG.shop();
  // 顶部 UI
  s += topBar(251);
  // —— 分区 1：售卖 ——
  s += PS('M70 196 L276 196 M444 196 L650 196', '#C9B891', 2);
  s += T(W / 2, 204, 25, '售卖', '#8B5A2B', 'bold');
  s += T(W / 2, 238, 19, '卖出全部菜品，+239 金币', '#8B5A2B', 'bold');
  // 按钮行：主操作金色大按钮 + 次操作两个并排（统一样式）
  s += pill(196, 256, 328, 58, '全部卖出', { fill: 'url(#gold)', stroke: '#8A5F10', weight: 'bold' });
  s += pill(70, 330, 264, 54, '只卖菜品', {});
  s += pill(386, 330, 264, 54, '每日奖励', {});
  // 门口小黑板：今日特价（动态内容，仅 mockup；水果筐属背景，在 bg-lib）
  s += `<g transform="translate(100 436) rotate(-2)">` +
    PS('M-38 26 L-46 62 M38 26 L46 62', '#6B4423', 4) +
    RR(-62, -46, 124, 76, 8, 'url(#woodSign)', '#4A3520', 2.2, `filter="url(#softSm)"`) +
    RR(-52, -36, 104, 56, 5, '#3E3225', '#2E2418', 1.5) +
    T(0, -12, 17, '今日特价', '#F5D47E', 'bold') +
    T(0, 12, 14, '番茄汤 9折', '#FFF8E7') +
    PS('M-42 16 L-30 16 M30 16 L42 16', '#D9C9A8', 1.5, 'opacity="0.6"') +
    `</g>`;
  // —— 分区 2：升级 ——
  s += PS('M70 536 L276 536 M444 536 L650 536', '#C9B891', 2);
  s += T(W / 2, 544, 25, '升级', '#8B5A2B', 'bold');
  const ups = [
    ['田地', 4, 5, 3000, '地块 10 → 13，解锁新作物', 'wheat'],
    ['厨房', 1, 2, 150, '烹饪时间 -15%', null],
    ['店铺', 1, 2, 150, '售价 +15%', null],
    ['便利', 1, 2, 800, '一键收获全部作物', 'bolt'],
  ];
  ups.forEach(([name, from, to, cost, desc, ic], i) => {
    const y = 572 + i * 136;
    s += RR(56, y, 608, 112, 16, 'url(#paper)', '#4A3520', 2.5, `filter="url(#soft)"`);
    s += RR(64, y + 8, 592, 30, 11, '#FFFFFF', 'none', 0, 'opacity="0.4"');
    // 左侧圆形徽章
    s += C(112, y + 56, 31, 'url(#goldSoft)', `stroke="#C98F1B" stroke-width="2.2"`);
    if (ic === 'bolt') {
      s += P(`M${115} ${y + 40} L${101} ${y + 59} L${110} ${y + 59} L${107} ${y + 73} L${122} ${y + 53} L${113} ${y + 53} Z`, 'url(#gold)', `stroke="#8A5F10" stroke-width="1.8"`);
    } else if (ic) s += icon(CROP_ICONS[ic], 112, y + 56, 0.75);
    else if (name === '厨房') { s += E(112, y + 63, 19, 8, '#43434A', `stroke="#2E2E33" stroke-width="2"`); s += P(`M94 ${y + 63} Q92 ${y + 46} 101 ${y + 42} L123 ${y + 42} Q132 ${y + 46} 130 ${y + 63} Z`, 'url(#potG)'); }
    else { s += coin(112, y + 56, 17); }
    s += T(156, y + 46, 23, `${name} Lv${from}→${to}`, '#4A3520', 'bold', 'start');
    for (let p = 0; p < Math.max(4, to); p++) {
      s += C(170 + p * 27, y + 80, 8, p < from ? 'url(#gold)' : '#E3D9C4', `stroke="#4A3520" stroke-width="1.5"`);
    }
    s += T(302, y + 86, 16.5, desc, '#8B5A2B', 'normal', 'start');
    s += pill(496, y + 32, 136, 48, `${cost} 金`, { fill: 'url(#gold)', stroke: '#8A5F10', weight: 'bold', size: 20 });
  });
  s += navBar('小铺');
  s += grain(0.05);
  return svg(s, '#F3E4C2');
}

// ==================== 页面 3b：求购 / 订单（与小铺分开） ====================
// 设计口径（P0b 前确认）：
//  - 小铺 = 卖给林婶的日常出货；本页 = 向具体 NPC 交付点名单
//  - 一张卡 = 一单：头像 + 谁 + 要什么 + 报酬（溢价金 + 好心）+ 主按钮
//  - 三态示意：可交付 / 缺货 / 未发现（菜品单未进图鉴）
//  - 底部第五 tab「订单」；落地时可改为小铺内入口，本 mockup 按独立页评审构图
function pageOrders() {
  let s = BG.shop();
  s += topBar(251);

  // 木匾标题（与小铺招牌区分：强调「人」不是「货」）
  s += RR(120, 96, 480, 64, 14, 'url(#woodSign)', '#4A3520', 2.5, `filter="url(#soft)"`);
  s += RR(132, 104, 456, 22, 8, '#FFFFFF', 'none', 0, 'opacity="0.18"');
  s += T(W / 2, 138, 28, '镇民订单', '#FFF8E7', 'bold');
  s += T(W / 2, 186, 18, '把菜端给人 · 溢价高于小铺直卖', '#5C4028');

  // NPC 简笔头像（占位，非最终立绘）
  const npcFace = (cx, cy, fill, mark) => {
    let g = C(cx, cy, 28, fill, `stroke="#4A3520" stroke-width="2.2"`);
    g += C(cx - 8, cy - 2, 3.2, '#4A3520');
    g += C(cx + 8, cy - 2, 3.2, '#4A3520');
    g += PS(`M${cx - 8} ${cy + 10} Q${cx} ${cy + 16} ${cx + 8} ${cy + 10}`, '#4A3520', 2);
    g += T(cx, cy + 48, 13, mark, '#8B5A2B', 'bold');
    return g;
  };

  // 订单卡
  // state: ready | lack | locked
  const orderCard = (y, opt) => {
    const { name, title, face, faceMark, wantIcon, wantName, qty, pay, premium, affinity, state } = opt;
    let c = RR(40, y, 640, 168, 18, 'url(#paper)', '#4A3520', 2.5, `filter="url(#soft)"`);
    c += RR(50, y + 8, 620, 36, 12, '#FFFFFF', 'none', 0, 'opacity="0.4"');
    // 左：头像
    c += npcFace(98, y + 78, face, faceMark);
    // 中：文案 + 需求
    c += T(148, y + 42, 24, name, '#4A3520', 'bold', 'start');
    c += T(148 + name.length * 26 + 8, y + 42, 16, title, '#A8916B', 'normal', 'start');
    c += T(148, y + 72, 17, '想要', '#8B5A2B', 'normal', 'start');
    c += RR(200, y + 52, 200, 44, 12, '#FFF8E7', '#C9B891', 1.8);
    c += icon(wantIcon, 224, y + 74, 0.55);
    c += T(252, y + 80, 18, `${wantName} ×${qty}`, '#4A3520', 'bold', 'start');
    // 报酬条
    c += T(148, y + 118, 16, '报酬', '#8B5A2B', 'normal', 'start');
    c += coin(188, y + 112, 11);
    c += T(206, y + 118, 20, `${pay}`, '#4A3520', 'bold', 'start');
    c += RR(268, y + 100, 72, 28, 10, '#FFF0C8', '#C98F1B', 1.5);
    c += T(304, y + 119, 14, `溢价${premium}`, '#8A5F10', 'bold');
    c += T(360, y + 118, 16, `· 好心 +${affinity}`, '#C45C6A', 'normal', 'start');
    // 右：主按钮三态
    if (state === 'ready') {
      c += pill(468, y + 56, 180, 56, '交付', { fill: 'url(#gold)', stroke: '#8A5F10', weight: 'bold', size: 24 });
    } else if (state === 'lack') {
      c += pill(468, y + 56, 180, 56, '缺货', { fill: '#E3D9C4', stroke: '#A8916B', textFill: '#8B7355', size: 24, shadow: false });
      c += T(558, y + 132, 14, '先去田里收 / 厨房做', '#A8916B');
    } else {
      c += pill(468, y + 56, 180, 56, '未发现', { fill: '#EDE3CC', stroke: '#A8916B', textFill: '#8B7355', size: 22, shadow: false });
      c += T(558, y + 132, 14, '图鉴里还没有这道菜', '#A8916B');
    }
    return c;
  };

  s += orderCard(220, {
    name: '田伯', title: '隔壁老农', face: '#E8C9A0', faceMark: '田',
    wantIcon: DISH_ICONS.toast, wantName: '烤面包', qty: 1,
    pay: 22, premium: '×1.3', affinity: 3, state: 'ready',
  });
  s += orderCard(410, {
    name: '林婶', title: '杂货铺老板娘', face: '#F0B8A0', faceMark: '林',
    wantIcon: DISH_ICONS.tomato_potato_stew, wantName: '番茄炖土豆', qty: 1,
    pay: 62, premium: '×1.3', affinity: 3, state: 'lack',
  });
  s += orderCard(600, {
    name: '小满', title: '皮孩子', face: '#F5D6A8', faceMark: '满',
    wantIcon: CROP_ICONS.wheat, wantName: '小麦', qty: 3,
    pay: 5, premium: '×1.2', affinity: 2, state: 'ready',
  });
  // 第四态「未发现」用半透明示意条，不占一整卡高度
  s += RR(40, 790, 640, 72, 16, '#EDE3CC', '#A8916B', 2, 'opacity="0.95"');
  s += T(80, 822, 18, '沈先生 · 南瓜汤  ——  图鉴未发现，暂不可接', '#8B7355', 'normal', 'start');
  s += T(80, 848, 14, '（高级单示意：先探索食谱，再来接单）', '#A8916B', 'normal', 'start');

  s += RR(80, 890, 560, 52, 14, '#FFFDF5', '#C9B891', 1.8, 'opacity="0.92"');
  s += T(W / 2, 922, 16, '不是任务板 · 交单涨好感 · 想换人明天再来看看', '#8B5A2B');

  s += navBar('订单', ['田地', '厨房', '小铺', '订单', '图鉴']);
  s += grain(0.05);
  return svg(s, '#F3E4C2');
}

// ==================== 页面 4：图鉴（外婆的手抄本） ====================
function pageBook() {
  // 装饰背景（旧纸/横线/红边线/书签/铅笔/涂鸦）：与游戏内 bg/book.jpg 同源
  let s = BG.book();
  // 胶带贴纸（做旧手帐感）
  const tape = (x, y, rot, color) =>
    RR(x - 42, y - 13, 84, 26, 3, color, 'none', 0, `opacity="0.55" transform="rotate(${rot} ${x} ${y})"`);
  const TAPE_COLORS = ['#F4A7B9', '#F5D47E', '#B5DCA0'];
  // 顶部 UI
  s += topBar(251);
  s += T(W / 2, 108, 27, '外婆的手抄本', '#8B5A2B', 'bold');
  // 分类切换页签（计数直接写在页签上；当前「作物」丰收黄高亮；扩展新分类在此处加按钮）
  s += pill(190, 160, 160, 52, '作物 3/15', { fill: 'url(#gold)', stroke: '#8A5F10', weight: 'bold', size: 21 });
  s += pill(370, 160, 160, 52, '食谱 8/40', { size: 21 });
  // 卡片：4 列网格，可滚动查看更多；未解锁也占位一张卡（灰色剪影 + ？？？名）
  const cardU = (x, y, inner, name, tilt, tapeColor) =>
    `<g transform="rotate(${tilt} ${x + 75} ${y + 85})">` +
    RR(x, y, 150, 170, 11, '#FFFDF5', '#4A3520', 2, `filter="url(#softSm)"`) +
    RR(x + 8, y + 8, 134, 100, 7, '#FFF8E7', '#E3D9C4', 1.5) +
    icon(inner, x + 75, y + 58, 1.1) +
    tape(x + 75, y + 3, tilt > 0 ? -6 : 5, tapeColor) +
    T(x + 75, y + 143, 17, name, '#4A3520') +
    `</g>`;
  const cardL = (x, y, inner) =>
    RR(x, y, 150, 170, 11, '#EDE3CC', '#D9C9A8', 2, 'opacity="0.9"') +
    RR(x + 8, y + 8, 134, 100, 7, '#E3D9C4', '#D9C9A8', 1.5) +
    `<g opacity="0.3">` + icon(inner, x + 75, y + 58, 1.1) + `</g>` +
    T(x + 75, y + 143, 17, '？？？', '#A8916B');
  // 作物区：3 张已解锁 + 12 张锁定卡（目标 15 种），一行 4 张
  const crops = Object.keys(CROP_NAMES);
  const unlocked = new Set(['wheat', 'tomato', 'potato']);
  crops.forEach((id, i) => {
    const x = 36 + (i % 4) * 166;
    const y = 238 + Math.floor(i / 4) * 186;
    if (unlocked.has(id)) s += cardU(x, y, CROP_ICONS[id], CROP_NAMES[id], i % 2 ? 1.2 : -1.2, TAPE_COLORS[i % 3]);
    else s += cardL(x, y, CROP_ICONS[id]);
  });
  // 底部渐隐 + 右侧滚动条：示意「下滑查看更多」
  s += `<rect x="0" y="996" width="${W}" height="150" fill="url(#fadeDown)"/>`;
  s += RR(700, 250, 9, 620, 4.5, '#D9C9A8', 'none', 0, 'opacity="0.5"');
  s += RR(700, 250, 9, 210, 4.5, '#A8916B', 'none', 0, 'opacity="0.85"');
  s += navBar('图鉴');
  s += grain(0.08);
  return svg(s, '#F3E4C2');
}

// ==================== 输出 ====================
const pages = { field: pageField, kitchen: pageKitchen, shop: pageShop, orders: pageOrders, book: pageBook };
for (const [name, fn] of Object.entries(pages)) {
  fs.writeFileSync(path.join(OUT, `${name}.svg`), fn());
  console.log(`✅ docs/mockups/${name}.svg`);
}
// PNG 转换（Edge 无头模式，Git Bash）：
// "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
//   --screenshot="E:\Code\NewGame\docs\mockups\field.png" --window-size=720,1280 --hide-scrollbars \
//   "file:///E:/Code/NewGame/docs/mockups/field.svg"
// 批量循环渲染注意：①screenshot 路径里变量要用 ${p}（"\$p" 会被转义成字面量）；②连续调用
// 需为每次加 --user-data-dir=<独立临时目录>，否则 Edge 配置单例锁会让后续截图静默失败。
const captions = {
  field: '田地页',
  kitchen: '厨房页',
  shop: '小铺页（卖给林婶）',
  orders: '求购/订单页（对人交单）',
  book: '图鉴页',
};
const gallery = `<!DOCTYPE html><html lang="zh"><head><meta charset="utf-8"><title>NewGame 最终成果示意图</title>
<style>body{background:#2b2b2b;margin:0;padding:32px;font-family:${FONT};color:#eee}
h1{font-size:22px}p{color:#bbb;font-size:14px}.row{display:flex;gap:24px;flex-wrap:wrap}
figure{margin:0}figcaption{text-align:center;padding:8px;font-size:15px}
img{width:270px;border-radius:12px;box-shadow:0 4px 16px #0008}</style></head>
<body><h1>丰穗小镇 · 页面示意图</h1>
<p>小铺 = 日常出货给林婶 · 订单 = 向 NPC 求购交付（两套分开）。求购页为 P0b 设计稿，确认后再落代码。</p>
<div class="row">
${Object.keys(pages).map((k) => `<figure><img src="${k}.svg"><figcaption>${captions[k]}</figcaption></figure>`).join('\n')}
<figure><img src="loading.svg"><figcaption>Loading 页</figcaption></figure>
</div></body></html>`;
fs.writeFileSync(path.join(OUT, 'index.html'), gallery);
console.log('✅ docs/mockups/index.html');
