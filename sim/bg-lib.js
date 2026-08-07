/**
 * 场景背景共享库（美术 v3）：四页「纯装饰背景」的唯一权威源。
 * 同源引用方：
 *   - sim/gen-mockups.js（效果图：背景 + 前景 UI）
 *   - sim/gen-scene-bg.js（游戏内背景图：仅装饰背景，烘成 JPEG）
 * 只放装饰件（天空/远山/小屋/灯笼串/栅栏/大树/木墙/搁板/大锅/遮阳棚/招牌/手抄本纸等），
 * 交互 UI（顶栏/导航/卡片/地块/槽位/按钮/动态文字）一律不进本库——游戏内由 GameController 绘制。
 * 坐标与 docs/mockups v3 完全一致；全幅底色矩形外扩 8px（wcBg 位移不留画布边缘白缝，
 * mockup 无 wcBg 时被视口裁切，视觉无差）。
 */
'use strict';

const W = 720;
const H = 1280;

module.exports = (A) => {
  const { T, RR, C, E, P, PS } = A;

  // ---------- 共用装饰件 ----------
  const cloud = (cx, cy, sc, op) =>
    `<g opacity="${op}">` + E(cx, cy, 58 * sc, 18 * sc, '#FFFFFF') + E(cx - 34 * sc, cy + 6 * sc, 36 * sc, 13 * sc, '#FFFFFF') + E(cx + 36 * sc, cy + 5 * sc, 40 * sc, 14 * sc, '#FFFFFF') + `</g>`;

  // 背景：外婆小屋
  function farmhouse(x, y) {
    let r = E(x + 82, y + 4, 100, 12, '#4A3520', 'opacity="0.16" filter="url(#blur8)"');
    r += PS(`M${x + 122} ${y - 138} q-9 -13 2 -21 q11 -9 2 -22`, '#FFFFFF', 7, 'opacity="0.7" filter="url(#blur4)"');
    r += PS(`M${x + 127} ${y - 140} q-6 -10 3 -17`, '#FFFFFF', 4.5, 'opacity="0.45" filter="url(#blur4)"');
    r += RR(x + 110, y - 126, 20, 42, 3, '#A9713F', '#4A3520', 2);
    r += RR(x, y - 88, 164, 88, 8, 'url(#paper)', '#4A3520', 2.5, `filter="url(#softSm)"`);
    r += P(`M${x - 16} ${y - 82} L${x + 82} ${y - 150} L${x + 180} ${y - 82} Z`, '#D98A5C', `stroke="#4A3520" stroke-width="2.5"`);
    r += PS(`M${x - 6} ${y - 86} L${x + 82} ${y - 143}`, '#EFB98C', 3, 'opacity="0.8"');
    r += RR(x + 68, y - 52, 28, 52, 6, 'url(#woodV)', '#4A3520', 2);
    r += RR(x + 20, y - 62, 26, 24, 5, '#BEE3D8', '#4A3520', 2);
    r += RR(x + 118, y - 62, 26, 24, 5, '#BEE3D8', '#4A3520', 2);
    r += PS(`M${x + 33} ${y - 62} L${x + 33} ${y - 38} M${x + 20} ${y - 50} L${x + 46} ${y - 50}`, '#4A3520', 1.5);
    r += PS(`M${x + 131} ${y - 62} L${x + 131} ${y - 38} M${x + 118} ${y - 50} L${x + 144} ${y - 50}`, '#4A3520', 1.5);
    return r;
  }

  // 褪色灯笼串（丰收祭的情感锚点）
  function lanternString(x1, y1, x2, y2) {
    const my = Math.max(y1, y2) + 46;
    let r = PS(`M${x1} ${y1} Q${(x1 + x2) / 2} ${my} ${x2} ${y2}`, '#6B4423', 2, 'opacity="0.8"');
    [[0.24, -4], [0.5, 3], [0.76, -3]].forEach(([t, tilt]) => {
      const lx = x1 + (x2 - x1) * t;
      const ly = (y1 + y2) / 2 + (my - (y1 + y2) / 2) * (1 - Math.abs(1 - 2 * t)) * 0.9 + 4;
      r += `<g transform="translate(${lx} ${ly}) rotate(${tilt})">` +
        PS('M0 0 L0 7', '#6B4423', 2) +
        E(0, 19, 11, 13, '#D98F7A', `stroke="#4A3520" stroke-width="1.8" opacity="0.92"`) +
        PS('M-9 14 Q0 18 9 14 M-10 19 L10 19 M-9 24 Q0 20 9 24', '#B86A55', 1.2) +
        RR(-4, 5, 8, 4, 2, '#8B5A2B') +
        PS('M0 32 L0 38', '#B86A55', 2) +
        `</g>`;
    });
    return r;
  }

  // ---------- 田地页背景 ----------
  // 含：天空/太阳/云/鸟/远山两层/左侧大树/小屋+炊烟/灯笼串/草地/木栅栏。
  // 不含：菱形地块、收获篮、浇水壶、草丛小花暖石（地块区保持低细节，交互元素由代码绘制）。
  function field() {
    let s = RR(-8, -8, W + 16, 588, 0, 'url(#sky)');
    s += C(618, 108, 66, 'url(#sun)');
    s += C(618, 108, 38, '#FFE98A', `stroke="#F2B830" stroke-width="2.5"`);
    s += cloud(150, 130, 1, 0.92) + cloud(430, 78, 0.8, 0.75) + cloud(300, 210, 0.6, 0.6);
    s += PS('M292 176 q6 -7 12 0 q6 -7 12 0', '#4A3520', 2.2, 'opacity="0.65"');
    s += PS('M336 158 q5 -6 10 0 q5 -6 10 0', '#4A3520', 2, 'opacity="0.5"');
    s += P('M0 520 Q120 440 260 492 Q400 540 520 478 Q640 430 720 486 L720 580 L0 580 Z', 'url(#hillFar)');
    s += P('M0 556 Q160 496 340 540 Q520 580 720 524 L720 620 L0 620 Z', 'url(#hillNear)');
    // 左侧大树（增加层次）
    s += PS('M64 596 Q58 500 66 420', '#6B4423', 16);
    s += PS('M66 480 Q90 460 104 436', '#6B4423', 8);
    s += C(60, 372, 64, 'url(#greenG)', `stroke="#4A3520" stroke-width="2.5"`);
    s += C(8, 412, 42, 'url(#greenG)', `stroke="#4A3520" stroke-width="2.5"`);
    s += C(112, 408, 46, 'url(#greenG)', `stroke="#4A3520" stroke-width="2.5"`);
    s += E(38, 348, 22, 14, '#B5E39A', 'opacity="0.7" transform="rotate(-18 38 348)"');
    // 小屋（右）+ 灯笼串（树 → 屋顶）
    s += farmhouse(486, 560);
    s += lanternString(104, 436, 566, 412);
    // 草地
    s += RR(-8, 578, W + 16, H - 578 + 8, 0, 'url(#grass)');
    s += E(150, 616, 130, 16, '#6DB544', 'opacity="0.8"') + E(560, 640, 150, 18, '#6DB544', 'opacity="0.7"') + E(330, 1076, 220, 22, '#67B23F', 'opacity="0.6"');
    // 木栅栏
    s += RR(0, 592, W, 9, 4, 'url(#woodSign)', '#6B4423', 1.5);
    s += RR(0, 614, W, 9, 4, 'url(#woodSign)', '#6B4423', 1.5);
    for (let fx = 30; fx < W; fx += 88) s += RR(fx, 584, 12, 48, 4, 'url(#woodV)', '#6B4423', 1.5);
    s += E(212, 636, 30, 14, 'url(#greenG)') + E(688, 640, 26, 13, 'url(#greenG)');
    return s;
  }

  // ---------- 厨房页背景 ----------
  // 含：木板墙/暖光晕/围裙/搁板瓶罐香草/台面/地板/碗杯搁板/大蒜辫/大锅+汤+蒸汽+木勺/切菜板/调味罐。
  // 不含：组合槽、进度条、状态按钮、食材面板等交互 UI。
  function kitchen() {
    let s = RR(-8, -8, W + 16, H + 16, 0, 'url(#woodWall)');
    for (let i = 0; i <= 8; i++) {
      const px = i * 90;
      s += PS(`M${px} 0 L${px} ${H}`, '#5A3820', 3, 'opacity="0.8"');
      s += PS(`M${px + 3} 0 L${px + 3} ${H}`, '#A0713D', 1.5, 'opacity="0.5"');
    }
    s += E(150, 300, 10, 6, '#5A3820', 'opacity="0.5"') + E(560, 760, 8, 5, '#5A3820', 'opacity="0.45"');
    // 顶部暖光晕（灶台灯的午后光）
    s += E(W / 2, -60, 480, 220, '#F2B830', 'opacity="0.14" filter="url(#blur8)"');
    // 挂墙：外婆的旧围裙（左）+ 香草束与木搁板（右）
    s += `<g transform="translate(58 128) rotate(-4)">` +
      PS('M10 -26 Q21 -40 32 -26', '#D9C9A8', 3.5) +
      PS('M12 -26 L8 -44 M30 -26 L34 -44', '#D9C9A8', 3) +
      RR(6, -28, 30, 26, 7, '#F3E4C2', '#4A3520', 2) +
      P('M2 -4 L40 -4 L50 62 Q21 76 -8 62 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="2" filter="url(#softSm)"`) +
      RR(-4, -8, 50, 10, 5, '#E8A34F', '#4A3520', 1.6) +
      PS('M-8 2 L-22 -4 M50 2 L64 -4', '#E8A34F', 3) +
      RR(12, 26, 18, 16, 5, '#FFF8E7', '#C9B891', 1.8) +
      PS('M14 30 L28 30', '#C9B891', 1.2, 'stroke-dasharray="3 2"') +
      `</g>`;
    s += `<g transform="translate(596 104)">` +
      RR(-14, 30, 122, 10, 4, 'url(#woodV)', '#5A3820', 1.5, `filter="url(#softSm)"`) +
      RR(0, -2, 26, 32, 6, '#D9F0E3', '#4A3520', 2, 'opacity="0.9"') +
      RR(3, 8, 20, 22, 4, '#E8563F', 'none', 0, 'opacity="0.75"') +
      RR(4, -8, 18, 7, 3, '#8B5A2B', '#4A3520', 1.5) +
      RR(40, 2, 26, 28, 6, '#D9F0E3', '#4A3520', 2, 'opacity="0.9"') +
      RR(43, 10, 20, 18, 4, '#F2B830', 'none', 0, 'opacity="0.8"') +
      RR(44, -4, 18, 7, 3, '#8B5A2B', '#4A3520', 1.5) +
      PS('M92 0 L92 12', '#D9C9A8', 2.5) +
      P('M92 12 Q78 26 82 44 Q92 36 92 24 Q92 36 102 44 Q106 26 92 12 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
      `</g>`;
    // 台面（顶面 + 前沿亮边 + 立面厚度）
    s += RR(0, 648, W, 34, 0, '#A0713D');
    s += RR(0, 648, W, 5, 0, '#C89A62', 'none', 0, 'opacity="0.9"');
    s += RR(0, 682, W, 46, 0, 'url(#woodV)');
    s += PS('M0 686 L720 686', '#5A3820', 2.5, 'opacity="0.7"');
    // 地板（底部，透视板缝）
    s += RR(0, 1108, W, 172, 0, '#7E5127');
    for (let i = 0; i < 4; i++) s += PS(`M0 ${1128 + i * 40} L720 ${1128 + i * 40}`, '#5A3820', 2.5, 'opacity="0.7"');
    s += RR(0, 1108, W, 8, 0, '#5A3820', 'none', 0, 'opacity="0.8"');
    // 右侧墙：木搁板 + 叠放的陶碗 + 挂杯
    s += `<g transform="translate(540 792)">` +
      RR(-6, 26, 156, 10, 4, 'url(#woodV)', '#5A3820', 1.5, `filter="url(#softSm)"`) +
      E(30, 22, 26, 6, '#4A3520', 'opacity="0.18"') +
      E(30, 12, 24, 12, '#F3E4C2', `stroke="#4A3520" stroke-width="2"`) +
      E(30, 6, 20, 9, '#FFFDF5', `stroke="#4A3520" stroke-width="1.6"`) +
      E(30, 4, 13, 5, '#E3D9C4') +
      E(88, 22, 22, 5, '#4A3520', 'opacity="0.18"') +
      E(88, 12, 20, 11, '#D9A05B', `stroke="#4A3520" stroke-width="2"`) +
      E(88, 6, 16, 7, '#F2C878', `stroke="#4A3520" stroke-width="1.5"`) +
      PS('M126 26 L126 44', '#D9C9A8', 2) +
      RR(118, 42, 17, 16, 5, '#F3E4C2', '#4A3520', 1.8) +
      PS('M135 46 q7 3 0 8', '#4A3520', 1.8) +
      `</g>`;
    // 左侧墙：挂着的大蒜辫
    s += `<g transform="translate(92 786) rotate(-3)">` +
      PS('M0 -26 L0 -14', '#D9C9A8', 2.5) +
      E(0, -6, 10, 11, '#FFF8E7', `stroke="#4A3520" stroke-width="1.8"`) +
      E(-8, 8, 10, 11, '#F5ECD4', `stroke="#4A3520" stroke-width="1.8"`) +
      E(8, 10, 10, 11, '#FFF8E7', `stroke="#4A3520" stroke-width="1.8"`) +
      E(0, 24, 10, 11, '#F5ECD4', `stroke="#4A3520" stroke-width="1.8"`) +
      PS('M0 -16 L-3 -24 M0 -16 L3 -24', '#7EC850', 2) +
      `</g>`;
    // 大锅（陶铁体积感，背景装饰）
    s += E(360, 656, 150, 16, '#4A3520', 'opacity="0.3" filter="url(#blur4)"');
    s += P('M232 566 Q226 640 262 652 L458 652 Q494 640 488 566 Z', 'url(#potG)', `stroke="#2E2E33" stroke-width="2.5"`);
    s += PS('M250 580 Q246 620 262 640', '#8E8E99', 5, 'opacity="0.5"');
    s += PS('M224 578 q-16 6 -12 20 M496 578 q16 6 12 20', '#3A3A41', 7);
    s += E(360, 566, 128, 32, '#2E2E33', `stroke="#1F1F23" stroke-width="2"`);
    s += E(360, 566, 110, 25, 'url(#soupG)');
    s += E(336, 560, 34, 8, '#F8A58E', 'opacity="0.7"');
    s += C(382, 570, 4, '#F8A58E', 'opacity="0.6"') + C(398, 562, 3, '#F8A58E', 'opacity="0.5"');
    s += PS('M326 522 q7 -12 0 -24 q-7 -10 0 -20', '#FFFFFF', 3, 'opacity="0.12" filter="url(#blur4)"');
    s += PS('M362 526 q7 -12 0 -24 q-7 -10 0 -20', '#FFFFFF', 3, 'opacity="0.09" filter="url(#blur4)"');
    s += PS('M398 522 q7 -12 0 -24 q-7 -10 0 -20', '#FFFFFF', 3, 'opacity="0.06" filter="url(#blur4)"');
    // 木勺已不在背景烘焙——改由 UI 层动态绘制（烹饪中搅动，GameController.refreshKitchen）
    // 台面左：切菜板 + 番茄片 + 小刀
    s += `<g transform="translate(72 598)">` +
      E(62, 46, 68, 8, '#4A3520', 'opacity="0.22" filter="url(#blur4)"') +
      RR(0, 8, 128, 34, 12, '#D9A05B', '#4A3520', 2.2, `filter="url(#softSm)"`) +
      RR(10, 14, 108, 8, 4, '#F2C878', 'none', 0, 'opacity="0.5"') +
      C(14, 18, 4, 'none', `stroke="#4A3520" stroke-width="2"`) +
      C(48, 18, 13, 'url(#tomatoG)', `stroke="#4A3520" stroke-width="1.8"`) +
      C(50, 17, 8, '#F2795F') + C(50, 17, 4, '#F8A58E') +
      E(78, 24, 12, 5, '#E8563F', `stroke="#4A3520" stroke-width="1.6"`) +
      E(100, 20, 11, 5, '#E8563F', `stroke="#4A3520" stroke-width="1.6"`) +
      PS('M96 34 L124 26', '#C9C2B8', 5) + PS('M124 26 L136 22', '#6B4423', 6) +
      `</g>`;
    // 台面右：调味罐两只
    s += `<g transform="translate(560 596)">` +
      E(34, 48, 56, 7, '#4A3520', 'opacity="0.2" filter="url(#blur4)"') +
      RR(0, 10, 30, 36, 8, '#D9F0E3', '#4A3520', 2, 'opacity="0.95"') +
      RR(4, 24, 22, 20, 5, '#FFFDF5', 'none', 0, 'opacity="0.8"') +
      RR(5, 2, 20, 9, 4, '#8B5A2B', '#4A3520', 1.6) +
      RR(42, 14, 28, 32, 8, '#D9F0E3', '#4A3520', 2, 'opacity="0.95"') +
      RR(46, 26, 20, 18, 5, '#F2E3B3', 'none', 0, 'opacity="0.85"') +
      RR(47, 6, 18, 9, 4, '#8B5A2B', '#4A3520', 1.6) +
      `</g>`;
    return s;
  }

  // ---------- 商店页背景 ----------
  // 含：奶油灰泥墙/柔光/波浪边遮阳棚/木招牌「丰穗小铺」/一筐新到水果。
  // 不含：今日特价黑板（动态内容）、售卖/升级分区 UI。
  function shop() {
    let s = RR(-8, -8, W + 16, H + 16, 0, 'url(#paperDeep)');
    s += E(360, 500, 420, 340, '#FFFFFF', 'opacity="0.25" filter="url(#blur8)"');
    // 波浪边遮阳棚（红/奶油条纹 + 棚下投影）
    s += E(360, 176, 400, 26, '#4A3520', 'opacity="0.22" filter="url(#blur8)"');
    for (let i = 0; i < 8; i++) {
      const x = i * 90;
      const fill = i % 2 ? 'url(#awnRed)' : 'url(#awnCream)';
      s += P(`M${x} 64 L${x + 90} 64 L${x + 90} 148 Q${x + 67.5} 172 ${x + 45} 148 Q${x + 22.5} 172 ${x} 148 Z`, fill, `stroke="#4A3520" stroke-width="2"`);
      s += PS(`M${x + 4} 68 L${x + 4} 144`, '#FFFFFF', 2.5, `opacity="${i % 2 ? 0.18 : 0.6}"`);
    }
    s += RR(0, 58, W, 12, 0, 'url(#woodV)', '#5A3820', 1.5);
    // 木招牌
    s += PS('M270 74 L282 108 M450 74 L438 108', '#6B4423', 3);
    s += RR(240, 106, 240, 54, 10, 'url(#woodSign)', '#4A3520', 2.5, `filter="url(#softSm)"`);
    s += RR(248, 112, 224, 42, 7, 'none', '#F5E8C8', 1.5, 'opacity="0.5"');
    s += T(360, 143, 27, '丰穗小铺', '#FFF8E7', 'bold');
    // 一筐新到水果（右）
    s += `<g transform="translate(612 436)">` +
      E(0, 40, 62, 10, '#4A3520', 'opacity="0.18" filter="url(#blur4)"') +
      P('M-52 2 Q-56 40 0 42 Q56 40 52 2 Z', 'url(#woodSign)', `stroke="#4A3520" stroke-width="2.2" filter="url(#softSm)"`) +
      PS('M-48 16 Q0 28 48 16', '#6B4423', 2, 'opacity="0.7"') +
      C(-22, -4, 13, 'url(#orangeG)', `stroke="#4A3520" stroke-width="1.8"`) +
      C(4, -12, 14, 'url(#tomatoG)', `stroke="#4A3520" stroke-width="1.8"`) +
      C(26, -2, 12, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.8"`) +
      PS('M4 -24 q2 -6 8 -7', '#3E8E41', 2.5) +
      P('M12 -26 q10 -6 14 2 q-10 4 -14 -2 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2"`) +
      `</g>`;
    return s;
  }

  // ---------- 图鉴页背景（外婆的手抄本纸） ----------
  // 含：泛黄旧纸/横线/红边线/书签绸带/铅笔/涂鸦星星。不含：标题、页签、卡片、滚动条。
  function book() {
    let s = RR(-8, -8, W + 16, H + 16, 0, 'url(#paperDeep)');
    for (let y = 150; y < H - 120; y += 44) s += PS(`M36 ${y} L684 ${y}`, '#D9C9A8', 1, 'opacity="0.35"');
    s += PS('M64 100 L64 1160', '#D98F7A', 1.5, 'opacity="0.3"');
    // 手帐小物：黄色书签绸带 + 铅笔 + 涂鸦
    s += P('M306 0 L344 0 L344 62 L325 50 L306 62 Z', 'url(#gold)', `stroke="#C98F1B" stroke-width="2" opacity="0.9"`);
    s += `<g transform="translate(606 1098) rotate(-24)">` +
      RR(-52, -7, 84, 14, 4, '#F2B830', '#4A3520', 1.8) +
      P('M32 -7 L52 0 L32 7 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="1.6"`) +
      P('M46 -2.2 L52 0 L46 2.2 Z', '#4A3520') +
      RR(-62, -7, 12, 14, 4, '#E8563F', '#4A3520', 1.6) +
      `</g>`;
    s += PS('M566 130 l3.5 7.5 8 1 -6 5.6 1.6 8 -7.1 -4 -7.1 4 1.6 -8 -6 -5.6 8 -1 Z', '#C98F1B', 2, 'opacity="0.7"');
    return s;
  }

  return { W, H, cloud, farmhouse, lanternString, field, kitchen, shop, book };
};
