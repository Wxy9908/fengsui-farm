/**
 * 美术资产权威源（美术 v1.1）：2.5D 矢量图标的唯一定义处。
 * 依据 docs/美术风格规范.md：色板、左上 45° 光源、描边棕 #4A3520、禁纯黑/荧光。
 * 使用者：sim/gen-assets.js（游戏资产 PNG）、sim/gen-scene-bg.js（场景大图，仅用 DEFS）、
 *   sim/gen-mockups.js（M3 目标效果图，v3 起直接 require 本文件，图标与游戏内同源）。
 * v1.1（2026-07-26）：菜品图标废弃单一"白盘穹顶"模板，22 道菜逐一按现实形态手绘
 *   （蒸笼/吐司/欧包/玻璃罐/汤碗/南瓜盅/煎锅饼/玉米棒/爆米花盒/玻璃杯/刨冰杯/砂锅/沙拉碗…），
 *   剪影两两可辨；作物图标统一投影与高光。
 * v1.1 质感（2026-07-26）：水彩质感套件——DEFS 新增 bleed/wcIcon/wcBg 滤镜与 wc() 包装
 *   （晕染出血底层 + feDisplacementMap 手绘抖动 + feTurbulence 颜料不均层），
 *   图标与场景大图经 wc() 包装后出图，治"硬边矢量太平面"。
 * 注意：本文件是图标唯一定义处；图标若有迭代，各使用方自动同步，无需手动拷贝。
 */
'use strict';

const FONT = `'PingFang SC','Microsoft YaHei',sans-serif`;

// ---------- 基础件 ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = (x, y, size, str, fill = '#4A3520', weight = 'normal', anchor = 'middle', opacity = 1) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}" opacity="${opacity}">${esc(str)}</text>`;
const RR = (x, y, w, h, r, fill, stroke = 'none', sw = 0, extra = '') =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;
const C = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`;
const E = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const PS = (d, stroke, sw, extra = '') => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" ${extra}/>`;

// ---------- 全局 defs（渐变/滤镜；每个 SVG 内联） ----------
const DEFS = `<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9FD3E8"/><stop offset="0.55" stop-color="#BEE3D8"/><stop offset="1" stop-color="#D9F0E3"/>
  </linearGradient>
  <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFE98A"/><stop offset="0.7" stop-color="#FFDF5C"/><stop offset="1" stop-color="#FFDF5C" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B5DCA0"/><stop offset="1" stop-color="#A3D18B"/>
  </linearGradient>
  <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8FC96E"/><stop offset="1" stop-color="#7CB95A"/>
  </linearGradient>
  <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8AD35C"/><stop offset="0.4" stop-color="#7EC850"/><stop offset="1" stop-color="#6DB544"/>
  </linearGradient>
  <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFDF5"/><stop offset="1" stop-color="#F9EFD8"/>
  </linearGradient>
  <linearGradient id="paperDeep" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFF8E7"/><stop offset="1" stop-color="#F3E4C2"/>
  </linearGradient>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#F8D464"/><stop offset="0.5" stop-color="#F2B830"/><stop offset="1" stop-color="#DF9E1E"/>
  </linearGradient>
  <linearGradient id="goldSoft" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFE9A8"/><stop offset="1" stop-color="#F5D47E"/>
  </linearGradient>
  <linearGradient id="woodV" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9C6A38"/><stop offset="1" stop-color="#7E5127"/>
  </linearGradient>
  <linearGradient id="woodWall" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8B5F33"/><stop offset="1" stop-color="#6F4822"/>
  </linearGradient>
  <linearGradient id="woodSign" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#A0713D"/><stop offset="1" stop-color="#8B5A2B"/>
  </linearGradient>
  <linearGradient id="soilBed" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#A5764E"/><stop offset="0.5" stop-color="#96683F"/><stop offset="1" stop-color="#7E5636"/>
  </linearGradient>
  <radialGradient id="tomatoG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#F2795F"/><stop offset="0.55" stop-color="#E8563F"/><stop offset="1" stop-color="#C23A28"/>
  </radialGradient>
  <radialGradient id="goldFruit" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#F8DA6E"/><stop offset="1" stop-color="#E3A81F"/>
  </radialGradient>
  <radialGradient id="orangeG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#F7A95C"/><stop offset="1" stop-color="#E0761A"/>
  </radialGradient>
  <radialGradient id="greenG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#8FD468"/><stop offset="1" stop-color="#4E9433"/>
  </radialGradient>
  <radialGradient id="potatoG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#D39E66"/><stop offset="1" stop-color="#A9713F"/>
  </radialGradient>
  <radialGradient id="pinkG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#F6BFCB"/><stop offset="1" stop-color="#E8557A"/>
  </radialGradient>
  <radialGradient id="melonG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#57A85C"/><stop offset="1" stop-color="#2E7D32"/>
  </radialGradient>
  <radialGradient id="cabbageG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#E9F2C8"/><stop offset="1" stop-color="#9CBF6A"/>
  </radialGradient>
  <radialGradient id="mushroomCapG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#C8A87E"/><stop offset="1" stop-color="#8A6844"/>
  </radialGradient>
  <radialGradient id="chiliG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#E8604C"/><stop offset="1" stop-color="#A03020"/>
  </radialGradient>
  <radialGradient id="eggplantG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#B98FD6"/><stop offset="1" stop-color="#5E3A8E"/>
  </radialGradient>
  <radialGradient id="peanutG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#F2DBB0"/><stop offset="1" stop-color="#B08A4E"/>
  </radialGradient>
  <radialGradient id="grapeG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#B39CE0"/><stop offset="1" stop-color="#5E35B1"/>
  </radialGradient>
  <radialGradient id="peachG" cx="0.35" cy="0.3" r="0.9">
    <stop offset="0" stop-color="#FAD9C4"/><stop offset="1" stop-color="#F08A6B"/>
  </radialGradient>
  <radialGradient id="plateG" cx="0.4" cy="0.3" r="1">
    <stop offset="0" stop-color="#FFFDF8"/><stop offset="1" stop-color="#E9DFC9"/>
  </radialGradient>
  <radialGradient id="bunG" cx="0.4" cy="0.3" r="1">
    <stop offset="0" stop-color="#FFFDF5"/><stop offset="1" stop-color="#EFE0C2"/>
  </radialGradient>
  <radialGradient id="breadG" cx="0.35" cy="0.3" r="1">
    <stop offset="0" stop-color="#F0CE8E"/><stop offset="1" stop-color="#C98F4E"/>
  </radialGradient>
  <radialGradient id="jamG" cx="0.35" cy="0.3" r="1">
    <stop offset="0" stop-color="#F2637F"/><stop offset="1" stop-color="#C21847"/>
  </radialGradient>
  <radialGradient id="potG" cx="0.4" cy="0.25" r="1.1">
    <stop offset="0" stop-color="#5E5E66"/><stop offset="0.6" stop-color="#43434A"/><stop offset="1" stop-color="#2E2E33"/>
  </radialGradient>
  <radialGradient id="soupG" cx="0.4" cy="0.35" r="0.9">
    <stop offset="0" stop-color="#F2836A"/><stop offset="1" stop-color="#D24A33"/>
  </radialGradient>
  <linearGradient id="awnRed" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#EE6B50"/><stop offset="1" stop-color="#D24A33"/>
  </linearGradient>
  <linearGradient id="awnCream" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFDF5"/><stop offset="1" stop-color="#F3E4C2"/>
  </linearGradient>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="3" dy="6" stdDeviation="6" flood-color="#4A3520" flood-opacity="0.28"/>
  </filter>
  <filter id="softSm" x="-40%" y="-40%" width="180%" height="180%">
    <feDropShadow dx="1.5" dy="3" stdDeviation="3" flood-color="#4A3520" flood-opacity="0.25"/>
  </filter>
  <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
  <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>
  <filter id="grain">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0.29  0 0 0 0 0.21  0 0 0 0 0.13  0 0 0 0.5 0"/>
  </filter>
  <!-- 水彩质感套件（美术 v1.1）：晕染出血 + 手绘抖动描边 + 双层颜料不均 + 边缘沉色 -->
  <filter id="bleed" x="-15%" y="-15%" width="130%" height="130%">
    <feGaussianBlur stdDeviation="2.2"/>
  </filter>
  <filter id="wcIcon" x="-12%" y="-12%" width="124%" height="124%">
    <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="11" result="wob"/>
    <feDisplacementMap in="SourceGraphic" in2="wob" scale="3" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="5" result="pigL"/>
    <feColorMatrix in="pigL" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 0 -0.35" result="pigLA"/>
    <feComposite in="disp" in2="pigLA" operator="in" result="blotch1"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.35" numOctaves="2" seed="9" result="pigF"/>
    <feColorMatrix in="pigF" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0.12 0.12 0 0.86" result="pigFA"/>
    <feComposite in="blotch1" in2="pigFA" operator="in" result="blotch2"/>
    <feMorphology in="blotch2" operator="erode" radius="1.5" result="er"/>
    <feComposite in="blotch2" in2="er" operator="out" result="ring"/>
    <feFlood flood-color="#3A2415" flood-opacity="0.3" result="poolC"/>
    <feComposite in="poolC" in2="ring" operator="in" result="pool"/>
    <feMerge>
      <feMergeNode in="blotch2"/>
      <feMergeNode in="pool"/>
    </feMerge>
  </filter>
  <filter id="wcBg" x="-4%" y="-4%" width="108%" height="108%">
    <feTurbulence type="fractalNoise" baseFrequency="0.007" numOctaves="3" seed="23" result="wob"/>
    <feDisplacementMap in="SourceGraphic" in2="wob" scale="4" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feFlood flood-color="#FFF3D9" result="creamC"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="17" result="washL"/>
    <feColorMatrix in="washL" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.18 0.18 0.18 0 -0.22" result="washLA"/>
    <feComposite in="creamC" in2="washLA" operator="in" result="washL2"/>
    <feComposite in="washL2" in2="disp" operator="atop" result="w1"/>
    <feFlood flood-color="#6B4423" result="brownC"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" seed="31" result="washD"/>
    <feColorMatrix in="washD" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0.1 0.1 0 -0.12" result="washDA"/>
    <feComposite in="brownC" in2="washDA" operator="in" result="washD2"/>
    <feComposite in="washD2" in2="w1" operator="atop"/>
  </filter>
  <!-- wcBg 柔和版：水洗双层强度减半（厨房等深底色页面，奶油水洗会显白斑） -->
  <filter id="wcBgSoft" x="-4%" y="-4%" width="108%" height="108%">
    <feTurbulence type="fractalNoise" baseFrequency="0.007" numOctaves="3" seed="23" result="wob"/>
    <feDisplacementMap in="SourceGraphic" in2="wob" scale="4" xChannelSelector="R" yChannelSelector="G" result="disp"/>
    <feFlood flood-color="#FFF3D9" result="creamC"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.006" numOctaves="3" seed="17" result="washL"/>
    <feColorMatrix in="washL" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.035 0.035 0.035 0 -0.045" result="washLA"/>
    <feComposite in="creamC" in2="washLA" operator="in" result="washL2"/>
    <feComposite in="washL2" in2="disp" operator="atop" result="w1"/>
    <feFlood flood-color="#6B4423" result="brownC"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" seed="31" result="washD"/>
    <feColorMatrix in="washD" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.05 0.05 0.05 0 -0.06" result="washDA"/>
    <feComposite in="brownC" in2="washDA" operator="in" result="washD2"/>
    <feComposite in="washD2" in2="w1" operator="atop"/>
  </filter>
</defs>`;

/** 水彩包装：把一组 SVG 内容包成「晕染出血底层 + 手绘抖动/颜料不均主层」 */
const wc = (inner, filterId = 'url(#wcIcon)', bleedOpacity = 0.32) =>
  `<g opacity="${bleedOpacity}" filter="url(#bleed)">${inner}</g>` +
  `<g filter="${filterId}">${inner}</g>`;

// ---------- 作物图标（48×48 坐标系，2.5D 渐变版；透明底） ----------
const CROP_ICONS = {
  wheat:
    PS('M24 44 L24 14', '#8B5A2B', 3) +
    PS('M24 30 L15 22 M24 30 L33 22 M24 38 L15 30 M24 38 L33 30', '#A0713D', 2) +
    C(15, 17, 5.5, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(24, 11, 5.5, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(33, 17, 5.5, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.5"`) +
    E(21.5, 9, 1.6, 2.4, '#FFF3C4', 'opacity="0.9"'),
  tomato:
    C(24, 28, 15, 'url(#tomatoG)', `stroke="#4A3520" stroke-width="2"`) +
    E(19, 22, 4, 2.6, '#FFB3A0', 'opacity="0.85" transform="rotate(-30 19 22)"') +
    P('M24 14 L19 7 M24 14 L29 7 M24 14 L24 6 M24 14 L16 10 M24 14 L32 10', 'none', `stroke="#3E8E41" stroke-width="3" stroke-linecap="round"`),
  potato:
    E(24, 27, 15, 11, 'url(#potatoG)', `stroke="#4A3520" stroke-width="2"`) +
    E(19, 22.5, 4.5, 2.4, '#E8C49A', 'opacity="0.7" transform="rotate(-18 19 22.5)"') +
    C(19, 27, 1.5, '#8B5A2B') + C(28, 30, 1.5, '#8B5A2B') + C(26, 23, 1.2, '#8B5A2B'),
  corn:
    P('M10 44 Q4 26 14 8 Q17 26 18 44 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M38 44 Q44 26 34 8 Q31 26 30 44 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.8"`) +
    RR(17, 8, 14, 34, 7, 'url(#goldFruit)', '#4A3520', 1.8) +
    PS('M22 11 L22 39 M26 11 L26 39', '#D9A020', 1.5) +
    E(20.5, 14, 1.6, 3.5, '#FFF3C4', 'opacity="0.8"'),
  pumpkin:
    C(24, 28, 15, 'url(#orangeG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M24 14 Q19 28 24 42 M24 14 Q29 28 24 42', '#D96F10', 2) +
    E(18.5, 21, 3.5, 2.2, '#FCCB8E', 'opacity="0.8" transform="rotate(-28 18.5 21)"') +
    PS('M24 14 Q24 7 29 6', '#3E8E41', 3),
  strawberry:
    P('M24 43 Q7 29 11 16 Q15 7 24 11 Q33 7 37 16 Q41 29 24 43 Z', 'url(#pinkG)', `stroke="#4A3520" stroke-width="2"`) +
    P('M15 12 L33 12 L24 4 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    E(18, 18, 2.6, 3.4, '#FAD4DC', 'opacity="0.85" transform="rotate(-20 18 18)"') +
    C(20, 25, 1.2, '#FFE08A') + C(28, 27, 1.2, '#FFE08A') + C(23, 33, 1.2, '#FFE08A'),
  watermelon:
    C(24, 26, 16, 'url(#melonG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M24 10 Q17 26 24 42 M24 10 Q31 26 24 42 M11 18 Q24 25 37 18 M11 34 Q24 27 37 34', '#1B5E20', 2.5) +
    E(18, 17, 3.6, 2.4, '#A9D9A0', 'opacity="0.7" transform="rotate(-30 18 17)"'),
  // —— M3-② 新作物（8 种） ——
  carrot: // 斜插橙根 + 三缕缨子
    `<g transform="rotate(25 24 26)">` +
    P('M24 44 Q18 30 20 18 Q24 13 28 18 Q30 30 24 44 Z', 'url(#orangeG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M24 14 L20 4 M24 14 L24 3 M24 14 L28 4', '#4E9433', 2.5) +
    PS('M21.5 24 L26.5 23 M21 29 L26 28', '#D96F10', 1.3) +
    E(21.5, 20, 1.6, 3, '#FCCB8E', 'opacity="0.8"') +
    `</g>`,
  cabbage: // 大白菜：长椭球菜头，白帮绿叶尖（参照实物：外层叶斜展、中肋白净、叶尖褶皱）
    E(24, 41, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    P('M24 42 Q34 38 36 26 Q37 14 29 10 Q25 12 24 20 Z', 'url(#cabbageG)', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M24 42 Q13 39 12 27 Q11 15 19 10 Q23 12 24 20 Z', '#C9DE9A', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M24 42 Q16 37 16 24 Q16 11 24 8 Q32 11 32 24 Q32 37 24 42 Z', '#F5F9E4', `stroke="#4A3520" stroke-width="2"`) +
    PS('M12.5 22 Q14.5 15 17 19 Q19 12 21 16', '#8FBF6A', 2) +
    PS('M35.5 22 Q33.5 15 31 19 Q29 12 27 16', '#8FBF6A', 2) +
    PS('M16.5 19 Q19 13 21.5 17 Q24 11 26.5 17 Q29 13 31.5 19', '#8FBF6A', 2.2) +
    PS('M24 40 Q22.5 30 24 16 M20 38 Q18.5 30 19.5 21 M28 38 Q29.5 30 28.5 21', '#D9E5BC', 1.6) +
    E(20, 18, 2.4, 3.4, '#FFFFFF', 'opacity="0.6" transform="rotate(-18 20 18)"'),
  mushroom: // 棕伞白柄小香菇
    P('M19 40 L20 26 L28 26 L29 40 Q24 43 19 40 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M8 26 Q8 12 24 12 Q40 12 40 26 Q24 31 8 26 Z', 'url(#mushroomCapG)', `stroke="#4A3520" stroke-width="2"`) +
    C(17, 19, 2, '#F3E4C2') + C(29, 16.5, 1.6, '#F3E4C2') + C(33, 21, 1.3, '#F3E4C2') +
    E(15, 15.5, 3, 1.8, '#E8CBA8', 'opacity="0.8" transform="rotate(-25 15 15.5)"'),
  chili: // 弯钩红椒 + 绿蒂
    P('M14 12 Q10 30 22 40 Q32 46 37 38 Q26 36 22 24 Q19 15 20 11 Z', 'url(#chiliG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M17 11 Q16 5 22 4', '#3E8E41', 3) +
    E(17, 20, 1.8, 4, '#F79B8A', 'opacity="0.7" transform="rotate(-20 17 20)"'),
  eggplant: // 紫亮椭圆 + 星形萼片
    E(24, 29, 12, 14, 'url(#eggplantG)', `stroke="#4A3520" stroke-width="2"`) +
    P('M24 16 L18 8 L24 12 L30 8 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    PS('M24 12 L24 6', '#3E8E41', 2.5) +
    E(19, 24, 2.6, 4.5, '#D9BDF2', 'opacity="0.75" transform="rotate(-20 19 24)"'),
  peanut: // 双节葫芦壳 + 壳纹
    P('M24 6 Q33 6 33 15 Q33 21 28 24 Q33 27 33 33 Q33 42 24 42 Q15 42 15 33 Q15 27 20 24 Q15 21 15 15 Q15 6 24 6 Z', 'url(#peanutG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M20 12 L22 13 M26 15 L28 16 M20 30 L22 31 M26 33 L28 34 M24 20 L24 22 M24 27 L24 28', '#A97F45', 1.2) +
    E(20, 13, 2.6, 2, '#F2DBB0', 'opacity="0.8" transform="rotate(-20 20 13)"'),
  grape: // 藤上倒三角果串 + 一片叶
    PS('M24 12 L24 7', '#8B5A2B', 2.5) +
    E(29, 8, 5, 2.8, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2" transform="rotate(-25 29 8)"`) +
    C(24, 15, 5, 'url(#grapeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(17, 21, 5, 'url(#grapeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(31, 21, 5, 'url(#grapeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(20, 28, 5, 'url(#grapeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(28, 28, 5, 'url(#grapeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(24, 35, 4.5, 'url(#grapeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    E(21, 13, 1.6, 1.1, '#CBB3F0', 'opacity="0.85"'),
  peach: // 粉圆带缝线 + 一片叶
    P('M24 12 Q38 12 38 27 Q38 42 24 42 Q10 42 10 27 Q10 12 24 12 Z', 'url(#peachG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M24 13 Q20 27 24 41', '#E8906B', 2) +
    E(27, 8, 6, 3, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2" transform="rotate(-20 27 8)"`) +
    E(17, 20, 3.4, 2.4, '#FAD9C4', 'opacity="0.85" transform="rotate(-28 17 20)"'),
};

// ---------- 菜品图标（v1.1：逐菜手绘，剪影差异化；48×48 坐标系） ----------
// 设计原则：每道菜贴合现实形态（器皿家族分化），左上高光 + 落地投影 + 描边棕；
// 同家族菜品（两只酱罐/两张薯饼）靠内容物、颜色与细节配件区分。
const groundShadow = (x, y, rx) => E(x, y, rx, rx * 0.26, '#4A3520', 'opacity="0.16"');
const steam = (x, y) =>
  PS(`M${x} ${y} q2 -3 0 -6 M${x + 6} ${y - 1} q2 -3 0 -6 M${x + 12} ${y} q2 -3 0 -6`, '#C9C2B8', 1.6, 'opacity="0.55"');

const DISH_ICONS = {
  // —— 面点家族 ——
  steamed_bun: // 竹蒸笼（双层箅线）+ 白胖馒头
    groundShadow(24, 41, 16) +
    RR(7, 29, 34, 10, 3, 'url(#woodSign)', '#4A3520', 1.8) +
    PS('M7 32.5 L41 32.5 M7 36 L41 36', '#6B4423', 1.2) +
    PS('M14 29.5 L14 38.5 M24 29.5 L24 38.5 M34 29.5 L34 38.5', '#6B4423', 1) +
    P('M13 29 Q13 17 24 17 Q35 17 35 29 Z', 'url(#bunG)', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M20 21.5 Q24 18.5 28 21.5', '#D9C8A8', 1.4) +
    E(19, 22, 2.6, 1.8, '#FFFFFF', 'opacity="0.7" transform="rotate(-20 19 22)"') +
    PS('M21 13 q2 -3 0 -6 M27 12 q2 -3 0 -6', '#C9C2B8', 1.6, 'opacity="0.55"'),
  toast: // 宽吐司片 + 烤斑
    groundShadow(24, 41, 15) +
    P('M13 40 L13 19 Q13 8 24 8 Q35 8 35 19 L35 40 Z', '#C98F4E', `stroke="#4A3520" stroke-width="2"`) +
    P('M16.5 37 L16.5 20 Q16.5 12 24 12 Q31.5 12 31.5 20 L31.5 37 Z', '#F5E3C0', `stroke="#B8814F" stroke-width="1.2"`) +
    E(21, 24, 1.7, 2.3, '#D9A05B') + E(26.5, 30, 1.5, 2, '#D9A05B') + E(24, 19, 1.3, 1.7, '#D9A05B') +
    E(20, 16, 2.2, 3.2, '#FFFFFF', 'opacity="0.5" transform="rotate(-15 20 16)"'),
  wheat_bread: // 长条欧包 + 割包裂纹
    groundShadow(24, 40, 17) +
    E(24, 31, 17, 9, 'url(#breadG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M13 27 L19 32 M21 24 L27 30 M30 24 L35 29', '#8B5A2B', 2) +
    E(17.5, 26.5, 4, 2, '#F5DFA8', 'opacity="0.7" transform="rotate(-18 17.5 26.5)"'),
  tomato_flatbread: // 平烤饼 + 番茄块 + 香草碎
    groundShadow(24, 40, 16) +
    E(24, 31, 16, 9, '#E8B96A', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 30, 12.5, 6.5, '#F0CE8E') +
    C(18.5, 29, 2.6, '#E8563F', `stroke="#4A3520" stroke-width="1.2"`) +
    C(28.5, 31, 2.6, '#E8563F', `stroke="#4A3520" stroke-width="1.2"`) +
    C(23.5, 33.5, 2.2, '#E8563F', `stroke="#4A3520" stroke-width="1.2"`) +
    C(21, 26.5, 1, '#5CA83C') + C(31, 28.5, 1, '#5CA83C') + C(26, 35, 0.9, '#5CA83C'),
  potato_bun: // 小圆餐包 + 十字割纹
    groundShadow(24, 40, 13) +
    C(24, 29, 13, 'url(#breadG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M17 25 Q24 29 31 25 M24 19 Q24 27 24 35', '#B8814F', 1.8) +
    E(18.5, 23.5, 3.5, 2.2, '#FBE9B8', 'opacity="0.8" transform="rotate(-25 18.5 23.5)"'),
  // —— 罐装家族（罐形相同，内容物与标签区分，符合现实） ——
  ketchup: // 玻璃罐红酱 + 布盖麻绳
    groundShadow(24, 41, 11) +
    RR(15, 17, 18, 23, 4, '#D9382C', '#4A3520', 2) +
    E(24, 18, 8, 2.5, '#F2795F') +
    P('M14 17 Q24 9 34 17 L34 13.5 Q24 6.5 14 13.5 Z', '#F5E8C8', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M15 15.5 L33 15.5', '#C9A66B', 1.5) +
    C(24, 12, 1.4, '#C9A66B') +
    PS('M19 22 L19 36', '#FFFFFF', 2.5, 'opacity="0.35"'),
  strawberry_jam: // 玻璃罐草莓酱 + 草莓贴标
    groundShadow(24, 41, 11) +
    RR(15, 17, 18, 23, 4, 'url(#jamG)', '#4A3520', 2) +
    E(24, 18, 8, 2.5, '#F6A8BC') +
    P('M14 17 Q24 9 34 17 L34 13.5 Q24 6.5 14 13.5 Z', '#F9EFD8', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M15 15.5 L33 15.5', '#C9A66B', 1.5) +
    RR(19, 24, 10, 9, 2, '#FFFDF5', '#4A3520', 1.2) +
    P('M24 31.5 Q20.5 28.5 21.5 26.5 Q22.5 25 24 26 Q25.5 25 26.5 26.5 Q27.5 28.5 24 31.5 Z', '#F2637F', `stroke="#4A3520" stroke-width="0.9"`) +
    PS('M24 26 L22 24.5 M24 26 L26 24.5', '#4E9433', 1.1) +
    PS('M19 22 L19 36', '#FFFFFF', 2.5, 'opacity="0.35"'),
  // —— 汤碗家族 ——
  tomato_soup: // 深汤碗 + 红汤奶油旋 + 汤匙
    groundShadow(24, 42, 16) +
    P('M7 26 Q7 41 24 41 Q41 41 41 26 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 26, 16, 5.5, 'url(#soupG)', `stroke="#4A3520" stroke-width="1.5"`) +
    PS('M17 26 Q23 22.5 30 25.5', '#FBE3D0', 2, 'opacity="0.85"') +
    PS('M34 21 L38.5 12', '#C9C2B8', 2.5) +
    E(39, 11, 1.6, 2.6, '#C9C2B8', 'transform="rotate(25 39 11)"') +
    steam(16, 20),
  pumpkin_soup: // 南瓜盅盛汤
    groundShadow(24, 42, 15) +
    C(24, 29, 14, 'url(#orangeG)', `stroke="#4A3520" stroke-width="2"`) +
    PS('M24 17 Q17 29 24 41 M24 17 Q31 29 24 41', '#D96F10', 1.8) +
    E(24, 20, 8.5, 4, '#F2B830', `stroke="#4A3520" stroke-width="1.5"`) +
    C(24, 20, 1.6, '#FBE3D0') +
    PS('M24 16 Q24 10.5 28.5 9.5', '#3E8E41', 2.5) +
    E(18.5, 24, 2.6, 1.8, '#FCCB8E', 'opacity="0.8" transform="rotate(-28 18.5 24)"'),
  corn_pumpkin_soup: // 浅粥碗 + 南瓜块 + 玉米粒
    groundShadow(24, 42, 15) +
    P('M9 27 Q9 39 24 39 Q39 39 39 27 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 27, 14, 4.5, '#F7E3B0', `stroke="#4A3520" stroke-width="1.5"`) +
    RR(19, 24, 4, 3.5, 1, '#F08A24', '#4A3520', 1) +
    RR(27, 25.5, 4, 3.5, 1, '#F08A24', '#4A3520', 1) +
    C(17, 27.5, 1.3, '#F2C230') + C(24, 29, 1.3, '#F2C230') + C(32, 28, 1.2, '#F2C230') +
    steam(18, 21),
  harvest_soup: // 大肚汤碗 + 三食材浮面
    groundShadow(24, 42, 17) +
    P('M6 25 Q6 42 24 42 Q42 42 42 25 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2.2"`) +
    PS('M9 34 Q24 39 39 34', '#C9A66B', 1.5) +
    E(24, 25, 16, 5.5, '#D97A3C', `stroke="#4A3520" stroke-width="1.5"`) +
    C(17.5, 24, 2.2, '#E8563F', `stroke="#4A3520" stroke-width="1"`) +
    RR(26, 22.5, 4, 3.5, 1.2, '#D39E66', '#4A3520', 1) +
    C(31.5, 26, 1.4, '#F2C230') + C(22, 27, 1.4, '#F2C230') + C(27.5, 27.5, 1.2, '#F2C230') +
    steam(18, 18),
  // —— 土豆家族 ——
  mashed_potato: // 小碗 + 奶油尖顶 + 黄油块
    groundShadow(24, 42, 13) +
    P('M11 30 Q11 40 24 40 Q37 40 37 30 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 29, 9, 4, '#F2E3B3', `stroke="#4A3520" stroke-width="1.5"`) +
    E(24, 25.5, 6.5, 3.5, '#F5EAC4', `stroke="#4A3520" stroke-width="1.2"`) +
    E(24, 22, 4, 3, '#F8F0D8', `stroke="#4A3520" stroke-width="1"`) +
    RR(22, 15.5, 4.5, 3.2, 0.8, '#F2C230', '#4A3520', 1) +
    E(20, 24, 2, 1.4, '#FFFFFF', 'opacity="0.6" transform="rotate(-20 20 24)"'),
  potato_cake: // 浅盘 + 两块金黄圆饼 + 油星
    groundShadow(24, 41, 16) +
    E(24, 36, 17, 6, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    E(18.5, 31, 7, 4.5, '#E0A83C', `stroke="#4A3520" stroke-width="1.8"`) +
    E(29.5, 31.5, 7, 4.5, '#E0A83C', `stroke="#4A3520" stroke-width="1.8"`) +
    E(18.5, 29.8, 4.8, 2.6, '#F2C96B') + E(29.5, 30.3, 4.8, 2.6, '#F2C96B') +
    P('M12 22 L13 24 L15 24.5 L13 25.5 L12 27.5 L11 25.5 L9 24.5 L11 24 Z', '#F8D464') +
    P('M36 20 L36.8 21.8 L38.5 22.3 L36.8 23.2 L36 25 L35.2 23.2 L33.5 22.3 L35.2 21.8 Z', '#F8D464'),
  corn_potato_cake: // 浅盘 + 嵌玉米粒大饼
    groundShadow(24, 41, 15) +
    E(24, 36, 16, 5.5, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    E(24, 30, 11, 6, '#D9B83C', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 28.2, 8.5, 4, '#E8CC6B') +
    C(19.5, 29, 1.6, '#F2C230', `stroke="#4A3520" stroke-width="1"`) +
    C(27.5, 28, 1.6, '#F2C230', `stroke="#4A3520" stroke-width="1"`) +
    C(23.5, 32, 1.6, '#F2C230', `stroke="#4A3520" stroke-width="1"`) +
    C(30.5, 31, 1, '#4E9433'),
  // —— 玉米家族 ——
  baked_corn: // 横向烤玉米棒（全库唯一横长剪影）+ 焦痕 + 苞叶
    groundShadow(24, 40, 16) +
    `<g transform="rotate(-15 24 28)">` +
    RR(9, 23, 29, 10, 5, 'url(#goldFruit)', '#4A3520', 2) +
    PS('M15 23.5 L15 32.5 M21 23.5 L21 32.5 M27 23.5 L27 32.5 M33 24 L33 32', '#D9A020', 1.3) +
    PS('M10 28 L37 28', '#D9A020', 1.1) +
    E(19, 26, 2, 1.2, '#8B5A2B', 'opacity="0.6"') + E(30, 30, 1.6, 1, '#8B5A2B', 'opacity="0.6"') +
    P('M38 28 Q45 25 44 17 Q39 22 37 24 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    E(14, 25.5, 3, 1.6, '#FFF3C4', 'opacity="0.8"') +
    `</g>`,
  popcorn: // 红白条纹纸盒 + 爆米花溢出
    groundShadow(24, 42, 12) +
    P('M13 19 L35 19 L31 41 L17 41 Z', '#FFFDF5', `stroke="#4A3520" stroke-width="2"`) +
    P('M17.5 19.5 L21 19.5 L19.6 40.5 L17.2 40.5 Z', '#E8563F') +
    P('M24.5 19.5 L28 19.5 L26.8 40.5 L24.2 40.5 Z', '#E8563F') +
    P('M31.5 19.5 L34 19.5 L30.8 40.5 L29.2 40.5 Z', '#E8563F') +
    C(16.5, 17, 3, '#FFF8E0', `stroke="#4A3520" stroke-width="1.2"`) +
    C(23, 13.5, 3.4, '#FFF8E0', `stroke="#4A3520" stroke-width="1.2"`) +
    C(29.5, 15, 3, '#FFF8E0', `stroke="#4A3520" stroke-width="1.2"`) +
    C(33.5, 18, 2.6, '#F5D47E', `stroke="#4A3520" stroke-width="1.2"`) +
    C(19.5, 10.5, 2.4, '#F5D47E', `stroke="#4A3520" stroke-width="1.2"`) +
    C(27, 9.5, 2.4, '#FFF8E0', `stroke="#4A3520" stroke-width="1.2"`),
  // —— 冷饮家族 ——
  watermelon_juice: // 玻璃杯红汁 + 吸管 + 挂珠
    groundShadow(24, 42, 11) +
    P('M16 15 L32 15 L29.5 41 L18.5 41 Z', '#E8F0EA', 'opacity="0.55"', `stroke="#4A3520" stroke-width="2"`) +
    P('M17.5 22 L30.5 22 L29 39.5 L19 39.5 Z', '#F25C5C') +
    E(24, 22, 6.5, 2, '#F7938A') +
    PS('M27.5 20 L32.5 8', '#F2B830', 2.5) +
    PS('M19 18 L20 38', '#FFFFFF', 2, 'opacity="0.4"') +
    C(31.5, 30, 1.1, '#FFFFFF', 'opacity="0.65"') + C(30.5, 34, 0.9, '#FFFFFF', 'opacity="0.65"') +
    C(24, 30, 1.2, '#C23A28') + C(21, 34, 1, '#C23A28') + C(27, 35, 1, '#C23A28'),
  berry_ice: // 高脚刨冰杯 + 双色冰沙 + 小勺
    groundShadow(24, 42, 12) +
    P('M14 22 L34 22 L30.5 41 L17.5 41 Z', '#E8F0EA', 'opacity="0.75"', `stroke="#4A3520" stroke-width="2"`) +
    P('M17 28 L31 28 L29.8 39 L18.2 39 Z', '#F6C9D4', 'opacity="0.8"') +
    P('M13 22 Q13 10 24 10 Q35 10 35 22 Z', '#F2A0B8', `stroke="#4A3520" stroke-width="2"`) +
    P('M24 10 Q35 10 35 22 L24 22 Z', '#F25C5C') +
    PS('M19.5 14.5 L21 20 M28 14 L26.8 20', '#FFFFFF', 1.2, 'opacity="0.6"') +
    PS('M32.5 12 L37.5 4.5', '#C9C2B8', 2.5) +
    C(24, 8.5, 1.8, '#E8557A', `stroke="#4A3520" stroke-width="1"`),
  // —— 其他 ——
  tomato_potato_stew: // 砂锅炖菜 + 双把手
    groundShadow(24, 42, 14) +
    PS('M11 27 L6.5 25 M37 27 L41.5 25', '#4A3520', 2.5) +
    RR(11, 21, 26, 17, 6, '#C96F4A', '#4A3520', 2) +
    E(24, 21.5, 13, 4, '#A55733', `stroke="#4A3520" stroke-width="1.5"`) +
    E(24, 22.5, 10.5, 3, '#D95F3C') +
    RR(19.5, 20.5, 3.5, 3, 1, '#D39E66', '#4A3520', 0.9) +
    C(28, 22.5, 2.2, '#E8563F', `stroke="#4A3520" stroke-width="0.9"`) +
    E(17, 30, 2.2, 4, '#E8A87E', 'opacity="0.5"') +
    steam(18, 14),
  corn_tomato_salad: // 浅沙拉碗（唯一绿色基调）
    groundShadow(24, 42, 15) +
    P('M8 28 Q8 39 24 39 Q40 39 40 28 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 28, 14, 4.5, '#7EC850', `stroke="#4A3520" stroke-width="1.5"`) +
    E(18, 25, 4, 2, '#5CA83C', 'transform="rotate(-20 18 25)"') +
    E(30, 26, 4, 2, '#5CA83C', 'transform="rotate(15 30 26)"') +
    C(21, 27.5, 1.4, '#F2C230') + C(26, 29, 1.4, '#F2C230') +
    C(28, 24, 2, '#E8563F', `stroke="#4A3520" stroke-width="1"`) +
    C(19, 29.5, 2, '#E8563F', `stroke="#4A3520" stroke-width="1"`),
  pumpkin_pie: // 扁圆小饼叠三块 + 芝麻
    groundShadow(24, 41, 14) +
    E(24, 35, 13, 5.5, '#D98F3F', `stroke="#4A3520" stroke-width="1.8"`) +
    E(23, 29, 12, 5, '#E8A34F', `stroke="#4A3520" stroke-width="1.8"`) +
    E(25, 23.5, 10.5, 4.6, '#F2B96B', `stroke="#4A3520" stroke-width="1.8"`) +
    C(22, 22, 0.9, '#8B5A2B') + C(27, 21, 0.9, '#8B5A2B') + C(25, 25, 0.9, '#8B5A2B') +
    E(21, 20.5, 3, 1.6, '#FBE0A8', 'opacity="0.7" transform="rotate(-15 21 20.5)"'),
  // —— M3-② 新菜（18 道，器皿家族延续：浅盘/汤碗/罐/杯/陶锅，剪影差异化） ——
  sauteed_carrot: // 浅盘 + 三枚胡萝卜圆片（带芯圈）
    groundShadow(24, 41, 16) +
    E(24, 34, 17, 6.5, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    C(17, 29, 4, 'url(#orangeG)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(24, 31, 4, 'url(#orangeG)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(31, 29, 4, 'url(#orangeG)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(17, 29, 1.5, '#FCCB8E') + C(24, 31, 1.5, '#FCCB8E') + C(31, 29, 1.5, '#FCCB8E') +
    C(20, 26, 0.9, '#5CA83C') + C(28, 33, 0.9, '#5CA83C'),
  carrot_potato_mash: // 小碗 + 橙白双色旋泥
    groundShadow(24, 42, 13) +
    P('M11 30 Q11 40 24 40 Q37 40 37 30 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 29, 9, 4, '#F2E3B3', `stroke="#4A3520" stroke-width="1.5"`) +
    E(24, 25.5, 6.5, 3.5, '#F5EAC4', `stroke="#4A3520" stroke-width="1.2"`) +
    PS('M20 25 Q24 21 28 24', '#F08A24', 2.2) +
    E(24, 22.5, 3, 2.2, '#F7B95C', `stroke="#4A3520" stroke-width="1"`) +
    E(20, 24, 2, 1.4, '#FFFFFF', 'opacity="0.6" transform="rotate(-20 20 24)"'),
  vinegar_cabbage: // 浅盘 + 三片醋溜白菜叶
    groundShadow(24, 41, 15) +
    E(24, 35, 16, 6, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    E(18, 30, 6, 3.5, '#DCE8B0', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-15 18 30)"`) +
    E(24, 27, 6, 3.5, '#C9DE9A', `stroke="#4A3520" stroke-width="1.5"`) +
    E(30, 30, 6, 3.5, '#DCE8B0', `stroke="#4A3520" stroke-width="1.5" transform="rotate(15 30 30)"`) +
    PS('M20 29 L24 26 M26 28 L30 29', '#8FAE5E', 1.2) +
    C(32, 26, 1.1, '#D24A33'),
  cabbage_pastry: // 浅盘 + 两只半月盒子（捏花边）
    groundShadow(24, 41, 16) +
    E(24, 36, 17, 6, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M10 32 Q17 22 24 32 Q17 36 10 32 Z', '#F0CE8E', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M24 32 Q31 22 38 32 Q31 36 24 32 Z', '#E8B96A', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M13 30 Q17 25 21 30 M27 30 Q31 25 35 30', '#B8814F', 1.2) +
    C(17, 29, 1.2, '#C9DE9A') + C(31, 29, 1.2, '#C9DE9A'),
  grilled_mushroom: // 竹签斜串两朵香菇（唯一串烧剪影）
    groundShadow(24, 41, 13) +
    PS('M10 40 L38 12', '#C9A66B', 2.5) +
    P('M14 30 Q14 21 22 21 Q30 21 30 30 Q22 33 14 30 Z', 'url(#mushroomCapG)', `stroke="#4A3520" stroke-width="1.8"`) +
    P('M22 21 Q22 14 29 14 Q36 14 36 21 Q29 24 22 21 Z', '#A97F5E', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M18 27 L20 25 M26 18 L28 16', '#5E3A20', 1.3) +
    E(17, 24, 2.4, 1.5, '#E8CBA8', 'opacity="0.8"'),
  mushroom_corn_soup: // 浅羹碗 + 香菇片 + 玉米粒
    groundShadow(24, 42, 15) +
    P('M9 27 Q9 39 24 39 Q39 39 39 27 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 27, 14, 4.5, '#F0D9A8', `stroke="#4A3520" stroke-width="1.5"`) +
    P('M19 27 Q19 22.5 23 22.5 Q27 22.5 27 27 Z', '#A97F5E', `stroke="#4A3520" stroke-width="1"`) +
    C(17, 28.5, 1.3, '#F2C230') + C(24, 29.5, 1.3, '#F2C230') + C(31, 28, 1.2, '#F2C230') +
    steam(18, 21),
  chili_sauce: // 玻璃罐深辣酱 + 辣椒贴标
    groundShadow(24, 41, 11) +
    RR(15, 17, 18, 23, 4, '#B03426', '#4A3520', 2) +
    E(24, 18, 8, 2.5, '#E8604C') +
    P('M14 17 Q24 9 34 17 L34 13.5 Q24 6.5 14 13.5 Z', '#F5E8C8', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M15 15.5 L33 15.5', '#C9A66B', 1.5) +
    C(24, 12, 1.4, '#C9A66B') +
    RR(19, 24, 10, 9, 2, '#FFFDF5', '#4A3520', 1.2) +
    PS('M22 30 Q24 26.5 27 27.5', '#D24A33', 1.8) +
    PS('M26.5 27.5 L28 25.5', '#4E9433', 1.2) +
    PS('M19 22 L19 36', '#FFFFFF', 2.5, 'opacity="0.35"'),
  spicy_potato_shreds: // 浅盘 + 土豆丝束 + 红椒碎
    groundShadow(24, 41, 16) +
    E(24, 35, 17, 6, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M14 32 Q20 28 26 31 M16 34 Q24 30 32 33 M18 29 Q26 26 34 29', '#F2D98F', 3) +
    PS('M15 31.5 Q21 27.5 27 30.5', '#E8C97E', 1.2) +
    C(20, 27, 1.2, '#D24A33') + C(29, 32, 1.2, '#D24A33') + C(25, 29, 1, '#D24A33') +
    C(31, 27, 0.9, '#5CA83C'),
  braised_eggplant: // 浅盘 + 三块油亮酱茄 + 酱汁
    groundShadow(24, 41, 15) +
    E(24, 35, 16, 6, 'url(#plateG)', `stroke="#4A3520" stroke-width="1.8"`) +
    RR(14, 26, 8, 6, 3, '#6E4A9E', '#4A3520', 1.5) +
    RR(24, 24, 8, 6, 3, '#7E57B0', '#4A3520', 1.5) +
    RR(19, 30, 8, 5, 2.5, '#5E3A8E', '#4A3520', 1.5) +
    E(17, 28, 2, 1.2, '#C9A6E8', 'opacity="0.8"') +
    E(27, 26, 2, 1.2, '#C9A6E8', 'opacity="0.8"') +
    PS('M15 33 Q24 36 33 32', '#8B3A20', 2),
  eggplant_tomato: // 汤碗 + 紫茄块红番茄双烧
    groundShadow(24, 42, 14) +
    P('M10 28 Q10 39 24 39 Q38 39 38 28 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 28, 13, 4, '#D95F3C', `stroke="#4A3520" stroke-width="1.5"`) +
    RR(17, 25, 6, 4.5, 2, '#6E4A9E', '#4A3520', 1.2) +
    C(29, 26.5, 2.6, '#E8563F', `stroke="#4A3520" stroke-width="1"`) +
    C(22, 29, 2.2, '#E8563F', `stroke="#4A3520" stroke-width="1"`) +
    steam(18, 21),
  salted_peanut: // 小碟 + 三颗带壳花生
    groundShadow(24, 42, 13) +
    P('M12 29 Q12 39 24 39 Q36 39 36 29 Z', 'url(#plateG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 29, 11, 3.5, '#C9A66B', `stroke="#4A3520" stroke-width="1.5"`) +
    E(18, 27, 3.4, 2.2, 'url(#peanutG)', `stroke="#4A3520" stroke-width="1"`) +
    E(24, 28.5, 3.4, 2.2, 'url(#peanutG)', `stroke="#4A3520" stroke-width="1"`) +
    E(30, 27, 3.4, 2.2, 'url(#peanutG)', `stroke="#4A3520" stroke-width="1"`) +
    PS('M17 27 L19 27 M23 28.5 L25 28.5 M29 27 L31 27', '#A97F45', 0.9),
  peanut_toast: // 吐司片 + 厚抹花生酱（与烤面包靠酱层区分）
    groundShadow(24, 41, 15) +
    P('M13 40 L13 19 Q13 8 24 8 Q35 8 35 19 L35 40 Z', '#C98F4E', `stroke="#4A3520" stroke-width="2"`) +
    P('M16.5 37 L16.5 20 Q16.5 12 24 12 Q31.5 12 31.5 20 L31.5 37 Z', '#F5E3C0', `stroke="#B8814F" stroke-width="1.2"`) +
    P('M19 33 L19 22 Q19 16 24 16 Q29 16 29 22 L29 33 Q24 36 19 33 Z', '#D9A75E', `stroke="#A97F45" stroke-width="1.2"`) +
    E(22, 20, 2, 1.4, '#EBCB96', 'opacity="0.8"'),
  grape_jam: // 玻璃罐紫酱 + 葡萄串贴标
    groundShadow(24, 41, 11) +
    RR(15, 17, 18, 23, 4, 'url(#eggplantG)', '#4A3520', 2) +
    E(24, 18, 8, 2.5, '#B98FD6') +
    P('M14 17 Q24 9 34 17 L34 13.5 Q24 6.5 14 13.5 Z', '#F9EFD8', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M15 15.5 L33 15.5', '#C9A66B', 1.5) +
    RR(19, 24, 10, 9, 2, '#FFFDF5', '#4A3520', 1.2) +
    C(22, 27, 1.8, '#7E57B0', `stroke="#4A3520" stroke-width="0.8"`) +
    C(26, 27, 1.8, '#7E57B0', `stroke="#4A3520" stroke-width="0.8"`) +
    C(24, 30, 1.8, '#7E57B0', `stroke="#4A3520" stroke-width="0.8"`) +
    PS('M24 25 L24 23.5', '#4E9433', 1) +
    PS('M19 22 L19 36', '#FFFFFF', 2.5, 'opacity="0.35"'),
  grape_melon_drink: // 玻璃杯紫红渐变饮 + 吸管（与西瓜汁靠分层区分）
    groundShadow(24, 42, 11) +
    P('M16 15 L32 15 L29.5 41 L18.5 41 Z', '#E8F0EA', 'opacity="0.55"', `stroke="#4A3520" stroke-width="2"`) +
    P('M17.5 22 L30.5 22 L29 39.5 L19 39.5 Z', '#7E57B0') +
    P('M17.5 22 L30.5 22 L30 30 L18 30 Z', '#F25C5C', 'opacity="0.85"') +
    E(24, 22, 6.5, 2, '#C9A6E8') +
    PS('M27.5 20 L32.5 8', '#F2B830', 2.5) +
    PS('M19 18 L20 38', '#FFFFFF', 2, 'opacity="0.4"') +
    C(22, 33, 1.2, '#5E3A8E') + C(26, 36, 1, '#5E3A8E'),
  peach_can: // 糖水罐头（玻罐 + 蜜桃半瓣）
    groundShadow(24, 41, 12) +
    P('M14 16 L34 16 L33 40 Q24 43 15 40 Z', '#E8F0EA', 'opacity="0.6"', `stroke="#4A3520" stroke-width="2"`) +
    P('M15.5 24 L32.5 24 L32 38.5 Q24 41 16 38.5 Z', '#F5D47E') +
    E(24, 24, 8.5, 2.6, '#F9E3A8') +
    P('M21 34 Q21 28 25 28 Q29 28 29 34 Q25 36 21 34 Z', '#F7A95C', `stroke="#4A3520" stroke-width="1.2"`) +
    PS('M25 29 L25 34', '#E8906B', 1.2) +
    E(24, 16, 10, 3, '#D9C8A8', `stroke="#4A3520" stroke-width="1.5"`) +
    E(24, 15, 8, 2.2, '#F3E4C2'),
  peach_berry_tart: // 花边挞 + 蜜桃扇片 + 一颗草莓
    groundShadow(24, 41, 16) +
    E(24, 34, 17, 7, '#D9A75E', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 32, 13.5, 5.5, '#F5E3C0', `stroke="#B8814F" stroke-width="1.2"`) +
    P('M16 33 Q19 27 23 30 L23 33.5 Z', '#F7A95C', `stroke="#4A3520" stroke-width="1"`) +
    P('M23 30 Q27 26 31 31 L23 33.5 Z', '#F9BE8C', `stroke="#4A3520" stroke-width="1"`) +
    P('M27 35 Q23.5 32 24.5 30.5 Q25.5 29 27 30 Q28.5 29 29 31.5 Q29.5 33.5 27 35 Z', '#F2637F', `stroke="#4A3520" stroke-width="0.9"`) +
    E(18, 30, 2, 1.2, '#FAD9C4', 'opacity="0.8"'),
  farmhouse_stew: // 陶土大肚锅 + 三色时蔬（与红砂锅靠陶土色区分）
    groundShadow(24, 42, 17) +
    PS('M10 27 L5.5 25 M38 27 L42.5 25', '#4A3520', 2.5) +
    P('M8 26 Q8 41 24 41 Q40 41 40 26 Z', '#A55733', `stroke="#4A3520" stroke-width="2.2"`) +
    E(24, 26, 15, 5, '#E8956B', `stroke="#4A3520" stroke-width="1.5"`) +
    C(17, 24.5, 2.2, '#F08A24', `stroke="#4A3520" stroke-width="1"`) +
    E(29, 23.5, 3, 2, '#C9DE9A', `stroke="#4A3520" stroke-width="1"`) +
    P('M22 27 Q22 24 25 24 Q28 24 28 27 Z', '#A97F5E', `stroke="#4A3520" stroke-width="0.9"`) +
    steam(18, 19),
  harvest_fruit_cup: // 直身果盅杯 + 三层果色 + 顶果
    groundShadow(24, 42, 12) +
    P('M14 18 L34 18 L30 41 L18 41 Z', '#E8F0EA', 'opacity="0.7"', `stroke="#4A3520" stroke-width="2"`) +
    P('M16.5 33 L31.5 33 L30 39.5 L18 39.5 Z', '#F9BE8C') +
    P('M16 26 L32 26 L31.5 33 L16.5 33 Z', '#B98FD6') +
    P('M15.5 18 L32.5 18 L32 26 L16 26 Z', '#F6C9D4') +
    E(24, 18, 8.5, 2.4, '#FAD4DC') +
    C(19, 15, 2.6, '#F2637F', `stroke="#4A3520" stroke-width="1"`) +
    C(24, 13.5, 2.8, '#7E57B0', `stroke="#4A3520" stroke-width="1"`) +
    C(28.5, 15, 2.6, '#7E57B0', `stroke="#4A3520" stroke-width="1"`) +
    PS('M30 12 L34 5', '#C9C2B8', 2.5),
  dark_cuisine: // 焦黑小锅冒糊烟（"事故感"，不进任何家族）
    groundShadow(24, 41, 13) +
    PS('M12 29 L8 27 M36 29 L40 27', '#4A3520', 2.2) +
    P('M12 26 Q12 39 24 39 Q36 39 36 26 Z', 'url(#potG)', `stroke="#4A3520" stroke-width="2"`) +
    E(24, 26, 11.5, 4, '#3A3A3F', `stroke="#4A3520" stroke-width="1.5"`) +
    C(20, 25, 1.6, '#6B5D4F') + C(27.5, 26, 1.4, '#6B5D4F') +
    PS('M19 20 q3 -4 0 -8 q-2 -3 1 -6 M27 20 q3 -4 0 -8', '#9A8B78', 2, 'opacity="0.7"'),
};

const DISH_NAMES = {
  dark_cuisine: '黑暗料理', steamed_bun: '馒头', toast: '烤面包', wheat_bread: '全麦馒头',
  ketchup: '番茄酱', tomato_soup: '番茄汤', mashed_potato: '土豆泥', potato_cake: '香煎土豆饼',
  tomato_flatbread: '番茄馅饼', potato_bun: '土豆包子', tomato_potato_stew: '番茄炖土豆',
  baked_corn: '烤玉米', popcorn: '爆米花', pumpkin_soup: '南瓜汤', pumpkin_pie: '南瓜饼',
  corn_pumpkin_soup: '玉米南瓜粥', corn_tomato_salad: '玉米拌番茄', corn_potato_cake: '玉米土豆饼',
  harvest_soup: '丰收汤', strawberry_jam: '草莓酱', watermelon_juice: '西瓜汁', berry_ice: '草莓西瓜冰',
  sauteed_carrot: '清炒胡萝卜', carrot_potato_mash: '胡萝卜土豆泥', vinegar_cabbage: '醋溜白菜',
  cabbage_pastry: '白菜盒子', grilled_mushroom: '烤香菇', mushroom_corn_soup: '香菇玉米羹',
  chili_sauce: '辣椒酱', spicy_potato_shreds: '香辣土豆丝', braised_eggplant: '红烧茄子',
  eggplant_tomato: '茄子烧番茄', salted_peanut: '盐水花生', peanut_toast: '花生酱馒头片',
  grape_jam: '葡萄果酱', grape_melon_drink: '葡萄西瓜饮', peach_can: '蜜桃罐头',
  peach_berry_tart: '蜜桃草莓挞', farmhouse_stew: '农家炖菜', harvest_fruit_cup: '丰收果盅',
};
// v1.0 遗留的主色表，仅作数据参考（mockup 冻结副本在用），图标绘制已不再依赖它
const DISH_COLORS = {
  dark_cuisine: '#4A4A4A', steamed_bun: '#F5E6C8', toast: '#D9A05B', wheat_bread: '#B8814F',
  ketchup: '#D9382C', tomato_soup: '#E0563C', mashed_potato: '#F2E3B3', potato_cake: '#E0A83C',
  tomato_flatbread: '#E2723C', potato_bun: '#E8C87E', tomato_potato_stew: '#D95F3C',
  baked_corn: '#F2C230', popcorn: '#FFEFB0', pumpkin_soup: '#F29B30', pumpkin_pie: '#E8A34F',
  corn_pumpkin_soup: '#F2B830', corn_tomato_salad: '#8EC850', corn_potato_cake: '#D9B83C',
  harvest_soup: '#D97A3C', strawberry_jam: '#D92C50', watermelon_juice: '#F25C5C', berry_ice: '#F2A0B8',
  sauteed_carrot: '#F08A24', carrot_potato_mash: '#F2C98A', vinegar_cabbage: '#C9DE9A',
  cabbage_pastry: '#E8B96A', grilled_mushroom: '#A97F5E', mushroom_corn_soup: '#F0D9A8',
  chili_sauce: '#B03426', spicy_potato_shreds: '#F2D98F', braised_eggplant: '#6E4A9E',
  eggplant_tomato: '#C95F4A', salted_peanut: '#E3C189', peanut_toast: '#D9A75E',
  grape_jam: '#7E57B0', grape_melon_drink: '#9B6BC0', peach_can: '#F5D47E',
  peach_berry_tart: '#F0A88C', farmhouse_stew: '#E8956B', harvest_fruit_cup: '#D9A8D0',
};
const CROP_NAMES = {
  wheat: '小麦', tomato: '番茄', potato: '土豆', corn: '玉米', pumpkin: '南瓜', strawberry: '草莓', watermelon: '西瓜',
  carrot: '胡萝卜', cabbage: '白菜', mushroom: '香菇', chili: '辣椒', eggplant: '茄子', peanut: '花生', grape: '葡萄', peach: '桃子',
};

// ---------- 生长阶段差分（美术 v1.1 ③：s1 幼苗 / s2 半成株；48×48 坐标系） ----------
// s1：每种作物有专属幼苗形态（单子叶针状 / 双子叶肥厚 / 菌蕾 / 藤钩…现实幼苗并不趋同），
// 共用元素只有落地影与左上光源；剪影在 32px 下仍可辨。
const S1_SHADOW = E(24, 42, 10, 3, '#4A3520', 'opacity="0.14"');
const CROP_S1 = {
  wheat: // 禾本科针叶三缕（黄绿）
    S1_SHADOW +
    PS('M22 42 Q20 32 19 24', '#A8D870', 2.6) +
    PS('M24 42 Q24 30 24 20', '#A8D870', 2.6) +
    PS('M26 42 Q29 32 30 25', '#A8D870', 2.6),
  tomato: // 双瓣子叶 + 刚冒头的锯齿真叶
    S1_SHADOW +
    PS('M24 42 L24 28', '#5CA83C', 2.5) +
    E(18.5, 26, 6, 3.8, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-30 18.5 26)"`) +
    E(29.5, 26, 6, 3.8, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(30 29.5 26)"`) +
    P('M24 26 L21 18 L23.2 20.5 L24 16 L24.8 20.5 L27 18 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2"`),
  potato: // 肥厚圆子叶，矮壮
    S1_SHADOW +
    PS('M24 42 L24 32', '#5CA83C', 3) +
    E(18, 27, 7, 5.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-22 18 27)"`) +
    E(30, 27, 7, 5.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(22 30 27)"`),
  corn: // 单子叶：一卷嫩筒叶上冲
    S1_SHADOW +
    P('M24 42 Q18 30 21 14 Q26 28 26 42 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    PS('M25 40 Q27 28 26 18', '#8FD468', 2),
  pumpkin: // 两片肥厚大子叶平展
    S1_SHADOW +
    PS('M24 42 L24 34', '#5CA83C', 3) +
    E(15.5, 28, 8.5, 5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6" transform="rotate(-18 15.5 28)"`) +
    E(32.5, 28, 8.5, 5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6" transform="rotate(18 32.5 28)"`),
  strawberry: // 小子叶 + 中间三小叶雏形
    S1_SHADOW +
    PS('M24 42 L24 30', '#5CA83C', 2.5) +
    E(19, 29, 5, 3.2, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3" transform="rotate(-28 19 29)"`) +
    E(29, 29, 5, 3.2, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3" transform="rotate(28 29 29)"`) +
    C(24, 21, 3, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(20.5, 24, 2.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.1"`) +
    C(27.5, 24, 2.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.1"`),
  watermelon: // 弯钩藤茎 + 窄子叶 + 小卷须
    S1_SHADOW +
    PS('M24 42 Q20 34 24 27', '#5CA83C', 2.5) +
    E(19, 25, 5.5, 3, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3" transform="rotate(-25 19 25)"`) +
    E(29, 25, 5.5, 3, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3" transform="rotate(25 29 25)"`) +
    PS('M24 27 Q30 24 29 19 Q28 16 25 17', '#5CA83C', 1.8),
  carrot: // 纤细丝状裂叶三缕
    S1_SHADOW +
    PS('M23 42 Q20 30 16 20', '#7CB342', 2) +
    PS('M24 42 Q24 28 24 16', '#7CB342', 2) +
    PS('M25 42 Q28 30 32 21', '#7CB342', 2) +
    PS('M20 30 L16 27 M28 30 L32 27', '#7CB342', 1.4),
  cabbage: // 心形对生子叶（浅绿）
    S1_SHADOW +
    PS('M24 42 L24 32', '#8FBF6A', 2.5) +
    P('M23 31 Q14 28 15 21 Q20 18 24 24 Q23 28 23 31 Z', '#C9DE9A', `stroke="#4A3520" stroke-width="1.4"`) +
    P('M25 31 Q34 28 33 21 Q28 18 24 24 Q25 28 25 31 Z', '#C9DE9A', `stroke="#4A3520" stroke-width="1.4"`),
  mushroom: // 土里冒出的菌蕾一对
    S1_SHADOW +
    P('M20 42 L20.5 34 L25.5 34 L26 42 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="1.3"`) +
    P('M16 34 Q16 27 23 27 Q30 27 30 34 Q23 36 16 34 Z', 'url(#mushroomCapG)', `stroke="#4A3520" stroke-width="1.5"`) +
    P('M30 42 L30.3 37 L33.7 37 L34 42 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="1.1"`) +
    P('M28 37 Q28 32 32 32 Q36 32 36 37 Q32 38.4 28 37 Z', '#A97F5E', `stroke="#4A3520" stroke-width="1.2"`),
  chili: // 窄长披针子叶
    S1_SHADOW +
    PS('M24 42 L24 30', '#5CA83C', 2.5) +
    E(18, 26, 7.5, 3, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(-35 18 26)"`) +
    E(30, 26, 7.5, 3, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(35 30 26)"`),
  eggplant: // 紫茎 + 卵圆子叶
    S1_SHADOW +
    PS('M24 42 L24 29', '#8E6BB8', 2.5) +
    E(18.5, 25.5, 6.5, 4.2, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-28 18.5 25.5)"`) +
    E(29.5, 25.5, 6.5, 4.2, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(28 29.5 25.5)"`),
  peanut: // 对生圆小叶两对
    S1_SHADOW +
    PS('M24 42 L24 26', '#5CA83C', 2.5) +
    C(19.5, 32, 3.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3"`) +
    C(28.5, 32, 3.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3"`) +
    C(20, 23, 3.4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3"`) +
    C(28, 23, 3.4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.3"`),
  grape: // 细蔓 + 单片小裂叶 + 卷须
    S1_SHADOW +
    PS('M24 42 Q23 34 25 28', '#8B5A2B', 2.2) +
    P('M25 28 Q17 26 18 18 Q24 15 27 21 Q28 26 25 28 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`) +
    PS('M25 28 Q33 26 33 20 Q33 16 30 17', '#5CA83C', 1.8),
  peach: // 双子叶 + 红尖小芽
    S1_SHADOW +
    PS('M24 42 L24 29', '#5CA83C', 2.5) +
    E(18.5, 26, 6.5, 4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-30 18.5 26)"`) +
    E(29.5, 26, 6.5, 4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(30 29.5 26)"`) +
    C(24, 19, 3, '#E8906B', `stroke="#4A3520" stroke-width="1.3"`),
};

// s2：半成株——初具各自形态特征（剪影开始分化，为成熟图标做预告）
const CROP_S2 = {
  wheat: // 三秆矮麦，小穗初结
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M18 42 L16 16 M24 42 L24 12 M30 42 L32 16', '#A0713D', 2) +
    PS('M20 34 L14 28 M28 34 L34 28', '#5CA83C', 1.8) +
    C(16, 13, 3.2, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(24, 9, 3.4, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.2"`) +
    C(32, 13, 3.2, 'url(#goldFruit)', `stroke="#4A3520" stroke-width="1.2"`),
  tomato: // 叶丛 + 一枚小青果
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M24 42 L24 24', '#4E9433', 2.5) +
    E(15, 24, 8, 5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-25 15 24)"`) +
    E(33, 24, 8, 5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(25 33 24)"`) +
    E(24, 15, 7, 5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(24, 33, 5.5, '#A9D9A0', `stroke="#4A3520" stroke-width="1.5"`) +
    PS('M24 28 L21 25 M24 28 L27 25', '#4E9433', 1.2),
  potato: // 贴地莲座叶丛
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    E(24, 26, 6, 9, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    E(15, 30, 5.5, 8, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-30 15 30)"`) +
    E(33, 30, 5.5, 8, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(30 33 30)"`) +
    E(10, 36, 4.5, 6.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(-55 10 36)"`) +
    E(38, 36, 4.5, 6.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(55 38 36)"`),
  corn: // 三片长叶上冲，未见苞
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    P('M24 42 Q15 28 17 8 Q24 24 25 42 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6"`) +
    P('M24 42 Q33 28 31 8 Q24 24 23 42 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.6"`) +
    P('M24 42 Q22 22 24 5 Q27 22 25 42 Z', '#8FD468', `stroke="#4A3520" stroke-width="1.6"`),
  pumpkin: // 大圆裂叶 + 卷须
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M20 40 L14 30', '#4E9433', 2.5) +
    P('M14 30 Q4 26 6 16 Q8 8 16 10 Q26 6 28 16 Q30 26 20 30 Q17 32 14 30 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M16 28 L14 14 M20 28 L24 12', '#4E9433', 1.2) +
    PS('M30 40 Q38 37 36 30 Q35 25 30 26', '#5CA83C', 2),
  strawberry: // 三出复叶 + 一朵小白花
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M24 42 L18 30 M24 42 L30 30', '#4E9433', 2) +
    P('M18 31 Q9 28 11 19 Q19 16 22 24 Q23 29 18 31 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    P('M30 31 Q39 28 37 19 Q29 16 26 24 Q25 29 30 31 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5"`) +
    C(24, 11, 2.4, '#FFFDF5', `stroke="#4A3520" stroke-width="0.9"`) +
    C(28.5, 14.5, 2.4, '#FFFDF5', `stroke="#4A3520" stroke-width="0.9"`) +
    C(26.8, 20, 2.4, '#FFFDF5', `stroke="#4A3520" stroke-width="0.9"`) +
    C(21.2, 20, 2.4, '#FFFDF5', `stroke="#4A3520" stroke-width="0.9"`) +
    C(19.5, 14.5, 2.4, '#FFFDF5', `stroke="#4A3520" stroke-width="0.9"`) +
    C(24, 16, 2, '#F2B830'),
  watermelon: // 藤蔓 + 两片裂叶 + 卷须
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M8 42 Q18 36 22 28 Q26 21 34 19', '#5CA83C', 2.5) +
    E(16, 30, 6, 4.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-28 16 30)"`) +
    E(29, 22, 6, 4.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(18 29 22)"`) +
    PS('M34 19 Q40 16 38 11 Q37 8 34 9', '#5CA83C', 1.8),
  // —— M3-② 新作物半成株 ——
  carrot: // 羽状缨丛 + 土面露橙肩
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    P('M19 40 Q22 36 29 36 Q31 40 29 41 Q24 43 19 40 Z', '#8A5C3A', `stroke="#4A3520" stroke-width="1.2"`) +
    P('M24 38 Q22 33 23 29 Q24 27 25 29 Q26 33 24 38 Z', 'url(#orangeG)', `stroke="#4A3520" stroke-width="1.2"`) +
    PS('M24 29 L18 14 M24 29 L24 11 M24 29 L30 14 M21 24 L15 18 M27 24 L33 18', '#5CA83C', 2),
  cabbage: // 嫩菜头初结：两片外叶 + 浅色小长球头（与成熟态同一语言）
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    E(13, 34, 7.5, 4.5, '#8FBF6A', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-28 13 34)"`) +
    E(35, 34, 7.5, 4.5, '#8FBF6A', `stroke="#4A3520" stroke-width="1.5" transform="rotate(28 35 34)"`) +
    P('M24 39 Q18 35 18 25 Q18 15 24 13 Q30 15 30 25 Q30 35 24 39 Z', '#F5F9E4', `stroke="#4A3520" stroke-width="1.8"`) +
    PS('M18.5 19 Q21 14 24 17 Q27 14 29.5 19', '#8FBF6A', 1.8) +
    PS('M24 37 Q23 29 24 18 M21 34 Q20 28 20.5 22 M27 34 Q28 28 27.5 22', '#D9E5BC', 1.2),
  mushroom: // 木段上两朵小伞
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    RR(10, 34, 28, 7, 3.5, '#8B5A2B', '#4A3520', 1.5) +
    PS('M12 37.5 L36 37.5', '#6B4423', 1) +
    P('M18 34 L18.6 28 L23.4 28 L24 34 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="1.2"`) +
    P('M15 28 Q15 21 21 21 Q27 21 27 28 Q21 30 15 28 Z', 'url(#mushroomCapG)', `stroke="#4A3520" stroke-width="1.5"`) +
    P('M28 34 L28.5 30 L32.5 30 L33 34 Z', '#F3E4C2', `stroke="#4A3520" stroke-width="1"`) +
    P('M26 30 Q26 25 30.5 25 Q35 25 35 30 Q30.5 31.5 26 30 Z', '#A97F5E', `stroke="#4A3520" stroke-width="1.2"`),
  chili: // 灌木小株 + 一枚青辣椒
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M24 42 L24 24 M24 32 L16 26 M24 30 L32 24', '#4E9433', 2.2) +
    E(15, 24, 5.5, 3.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(-25 15 24)"`) +
    E(33, 22, 5.5, 3.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(25 33 22)"`) +
    E(24, 20, 5, 4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`) +
    P('M27 33 Q25 38 29 41 Q33 43 35 40 Q31 39 30 35 Q29 32 30 31 Z', '#A9D9A0', `stroke="#4A3520" stroke-width="1.2"`),
  eggplant: // 阔叶紫株 + 紫花苞
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M24 42 L24 26', '#4E9433', 2.5) +
    E(15, 28, 7, 4.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(-25 15 28)"`) +
    E(33, 28, 7, 4.5, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.5" transform="rotate(25 33 28)"`) +
    C(24, 20, 4, '#B98FD6', `stroke="#4A3520" stroke-width="1.4"`) +
    P('M24 24 L21 19 L24 21 L27 19 Z', 'url(#greenG)', `stroke="#4A3520" stroke-width="1"`),
  peanut: // 贴地羽状复叶丛
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M24 42 L24 28 M20 42 L14 32 M28 42 L34 32', '#5CA83C', 2) +
    E(21, 26, 3.6, 2.4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2"`) +
    E(27, 26, 3.6, 2.4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2"`) +
    E(12, 30, 3.4, 2.2, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2" transform="rotate(-25 12 30)"`) +
    E(36, 30, 3.4, 2.2, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.2" transform="rotate(25 36 30)"`) +
    C(24, 20, 1.6, '#F2D98F', `stroke="#4A3520" stroke-width="0.8"`),
  grape: // 立竿 + 卷须藤蔓
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M30 42 L30 8', '#8B5A2B', 2.5) +
    PS('M12 42 Q18 32 24 28 Q30 24 30 16', '#5CA83C', 2.5) +
    E(18, 30, 5.5, 4, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(-25 18 30)"`) +
    E(26, 20, 5, 3.6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4" transform="rotate(15 26 20)"`) +
    PS('M30 12 Q36 10 34 6', '#5CA83C', 1.8),
  peach: // 小树干 + 圆冠
    E(24, 42, 12, 3.2, '#4A3520', 'opacity="0.14"') +
    PS('M24 42 L24 30 M24 34 L18 28 M24 33 L30 27', '#8B5A2B', 2.5) +
    C(17, 24, 6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`) +
    C(31, 24, 6, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`) +
    C(24, 17, 7, 'url(#greenG)', `stroke="#4A3520" stroke-width="1.4"`) +
    C(27, 22, 2.2, '#F7B9A0', `stroke="#4A3520" stroke-width="1"`),
};

/** 把 48×48 图标摆到 (x, y) 中心、缩放 s */
const icon = (inner, x, y, s = 1) => `<g transform="translate(${x - 24 * s},${y - 24 * s}) scale(${s})">${inner}</g>`;

module.exports = {
  FONT, esc, T, RR, C, E, P, PS, DEFS, wc,
  CROP_ICONS, CROP_NAMES, DISH_COLORS, DISH_NAMES, DISH_ICONS, icon,
  CROP_S1, CROP_S2,
};
