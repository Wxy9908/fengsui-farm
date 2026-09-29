/**
 * 丰穗镇地图初稿（田园风）。布局对齐 2026-09-28 讨论：
 * 村口 = 杂货铺 + 旅馆；镇中 = 食堂；学校贴食堂北侧；
 * 我家与田伯靠近、田地在旁、田伯靠后山；
 * 食堂与村口之间留丰收祭空地；南缘留河；田地外侧留空草地；后山不盖满。
 * 运行：node sim/gen-map.js → docs/mockups/map.svg
 */
const fs = require('fs');
const path = require('path');

const W = 1440;
const H = 810;
const OUT = path.join(__dirname, '..', 'docs', 'mockups');
const FONT = `'PingFang SC','Microsoft YaHei',sans-serif`;

const T = (x, y, size, str, fill = '#4A3520', weight = 'bold', anchor = 'middle') =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${fill}" font-weight="${weight}" text-anchor="${anchor}">${str}</text>`;

const house = (x, y, w, h, roof, name, opt = {}) => {
  const { awning = false, chimney = true, door = '#6B4423' } = opt;
  let s = '';
  s += `<ellipse cx="${x + w / 2 + 6}" cy="${y + h + 8}" rx="${w * 0.55}" ry="10" fill="#3E5C28" opacity="0.25"/>`;
  s += `<polygon points="${x - 14},${y + 8} ${x + w / 2},${y - h * 0.72} ${x + w + 14},${y + 8}" fill="${roof}" stroke="#4A3520" stroke-width="3" stroke-linejoin="round"/>`;
  s += `<polygon points="${x + 8},${y - h * 0.42} ${x + w / 2},${y - h * 0.68} ${x + w * 0.55},${y - h * 0.28}" fill="#FFF6E4" opacity="0.35"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#FFF8E7" stroke="#4A3520" stroke-width="3"/>`;
  s += `<rect x="${x + w * 0.38}" y="${y + h * 0.42}" width="${w * 0.24}" height="${h * 0.58}" rx="3" fill="${door}" stroke="#4A3520" stroke-width="2"/>`;
  s += `<rect x="${x + w * 0.12}" y="${y + h * 0.22}" width="${w * 0.16}" height="${h * 0.22}" rx="2" fill="#C9E7F2" stroke="#4A3520" stroke-width="2"/>`;
  s += `<rect x="${x + w * 0.70}" y="${y + h * 0.22}" width="${w * 0.16}" height="${h * 0.22}" rx="2" fill="#C9E7F2" stroke="#4A3520" stroke-width="2"/>`;
  if (chimney) {
    s += `<rect x="${x + w * 0.72}" y="${y - h * 0.55}" width="14" height="${h * 0.38}" rx="2" fill="#8B5A2B" stroke="#4A3520" stroke-width="2"/>`;
  }
  if (awning) {
    s += `<path d="M${x - 6} ${y + 18} Q${x + w / 2} ${y + 48} ${x + w + 6} ${y + 18}" fill="none" stroke="#E8563F" stroke-width="10" stroke-linecap="round"/>`;
    s += `<path d="M${x - 6} ${y + 18} Q${x + w / 2} ${y + 40} ${x + w + 6} ${y + 18}" fill="none" stroke="#FFF8E7" stroke-width="4"/>`;
  }
  s += T(x + w / 2, y + h + 28, 16, name);
  return s;
};

const tree = (x, y, s = 1) => {
  let o = `<ellipse cx="${x + 4}" cy="${y + 8}" rx="${22 * s}" ry="${8 * s}" fill="#3E5C28" opacity="0.22"/>`;
  o += `<rect x="${x - 4 * s}" y="${y - 6 * s}" width="${8 * s}" height="${28 * s}" rx="3" fill="#6B4423" stroke="#4A3520" stroke-width="2"/>`;
  o += `<circle cx="${x}" cy="${y - 18 * s}" r="${22 * s}" fill="#7EC850" stroke="#4A3520" stroke-width="2.5"/>`;
  o += `<circle cx="${x - 14 * s}" cy="${y - 8 * s}" r="${14 * s}" fill="#8ED45A" stroke="#4A3520" stroke-width="2"/>`;
  o += `<circle cx="${x + 14 * s}" cy="${y - 10 * s}" r="${15 * s}" fill="#5CA83C" stroke="#4A3520" stroke-width="2"/>`;
  return o;
};

const labelPlate = (x, y, text) =>
  `<rect x="${x - text.length * 9}" y="${y - 16}" width="${text.length * 18}" height="24" rx="8" fill="#FFF8E7" stroke="#4A3520" stroke-width="2" opacity="0.92"/>` +
  T(x, y + 2, 14, text);

let body = '';

body += `<rect width="${W}" height="${H}" fill="url(#sky)"/>`;
body += `<circle cx="1240" cy="92" r="78" fill="url(#sun)"/>`;
body += `<circle cx="1240" cy="92" r="26" fill="#FFE98A" stroke="#C98F1B" stroke-width="2"/>`;
const cloud = (x, y, s) =>
  `<ellipse cx="${x}" cy="${y}" rx="${28 * s}" ry="${14 * s}" fill="#FFF8E7" opacity="0.85"/>` +
  `<ellipse cx="${x + 22 * s}" cy="${y + 4}" rx="${20 * s}" ry="${12 * s}" fill="#FFF8E7" opacity="0.85"/>` +
  `<ellipse cx="${x - 20 * s}" cy="${y + 6}" rx="${16 * s}" ry="${10 * s}" fill="#FFF8E7" opacity="0.8"/>`;
body += cloud(180, 70, 1.3) + cloud(420, 110, 0.9) + cloud(680, 58, 1.1);
body += `<path d="M210 148 q8 -10 16 0" fill="none" stroke="#4A3520" stroke-width="2" stroke-linecap="round" opacity="0.45"/>`;
body += `<path d="M236 138 q8 -10 16 0" fill="none" stroke="#4A3520" stroke-width="2" stroke-linecap="round" opacity="0.45"/>`;

// 远山（右后山更高，留白给以后上山）
body += `<path d="M0 250 C180 180 260 210 420 190 C560 170 640 220 780 200 C900 184 980 150 1100 120 C1240 80 1320 40 1440 90 L1440 320 L0 340 Z" fill="#C5E2B0" opacity="0.85"/>`;
body += `<path d="M980 210 C1120 120 1260 70 1440 110 L1440 420 C1320 360 1200 390 1080 340 C1000 310 980 250 980 210 Z" fill="#8FB56E"/>`;
body += `<path d="M1120 160 C1220 90 1340 70 1440 100 L1440 240 C1340 200 1240 210 1160 180 Z" fill="#A9C98A" opacity="0.9"/>`;
body += `<path d="M1200 150 C1280 110 1360 100 1440 120" fill="none" stroke="#FFF8E7" stroke-width="8" opacity="0.35" stroke-linecap="round"/>`;

// 草地
body += `<path d="M0 300 C200 280 400 320 700 300 C980 282 1200 340 1440 300 L1440 ${H} L0 ${H} Z" fill="url(#grass)"/>`;
body += `<path d="M0 360 C240 340 480 390 760 360 C1000 338 1220 400 1440 370" fill="none" stroke="#9ED36A" stroke-width="18" opacity="0.45" stroke-linecap="round"/>`;

// 河（南缘，钓鱼预留）
body += `<path d="M-20 700 C200 670 380 740 620 710 C860 680 1040 750 1280 710 C1360 696 1420 720 1480 700 L1480 790 C1200 820 800 760 400 800 C180 820 -20 770 -20 760 Z" fill="url(#water)" stroke="#6AA8B8" stroke-width="3"/>`;
body += `<path d="M40 730 C220 710 400 760 640 735 C900 708 1100 760 1360 730" fill="none" stroke="#FFF8E7" stroke-width="3" opacity="0.45" stroke-linecap="round"/>`;
for (const [x, y] of [[180, 745], [520, 755], [900, 740], [1200, 760]]) {
  body += `<ellipse cx="${x}" cy="${y}" rx="16" ry="6" fill="#7EC8C0" opacity="0.5"/>`;
}
for (let x = 80; x < 1400; x += 70) {
  const y = 690 + ((x / 70) % 3) * 6;
  body += `<path d="M${x} ${y} q4 -16 0 -22 M${x + 6} ${y + 2} q5 -18 2 -24" fill="none" stroke="#3E6B28" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`;
}
body += `<path d="M860 700 Q910 668 960 702" fill="none" stroke="#8B5A2B" stroke-width="10" stroke-linecap="round"/>`;
body += `<path d="M868 694 Q910 670 952 696" fill="none" stroke="#C9A36A" stroke-width="4" stroke-linecap="round"/>`;

// 进村土路
body += `<path d="M0 470 C180 450 280 490 420 470 C560 450 640 500 820 480" fill="none" stroke="#E6C48A" stroke-width="28" stroke-linecap="round"/>`;
body += `<path d="M0 470 C180 450 280 490 420 470 C560 450 640 500 820 480" fill="none" stroke="#C9A36A" stroke-width="4" stroke-dasharray="10 14" stroke-linecap="round"/>`;
body += `<path d="M820 480 C900 470 980 430 1100 450 C1180 462 1240 500 1280 540" fill="none" stroke="#E6C48A" stroke-width="18" stroke-linecap="round"/>`;

// 丰收祭空地：只有草地、灯笼桩，不盖房子
body += `<ellipse cx="560" cy="500" rx="120" ry="46" fill="#A6D36A" opacity="0.55"/>`;
body += `<path d="M470 470 L470 430 M650 470 L650 430" stroke="#6B4423" stroke-width="4" stroke-linecap="round"/>`;
body += `<circle cx="470" cy="422" r="8" fill="#E8563F" stroke="#4A3520" stroke-width="2"/>`;
body += `<circle cx="650" cy="422" r="8" fill="#F2B830" stroke="#4A3520" stroke-width="2"/>`;
body += labelPlate(560, 430, '丰收祭空地');
const flower = (x, y, c) =>
  `<circle cx="${x}" cy="${y}" r="4" fill="${c}" stroke="#4A3520" stroke-width="1"/>` +
  `<circle cx="${x}" cy="${y}" r="1.4" fill="#F2B830"/>`;
for (const [x, y, c] of [[300, 520, '#E8563F'], [330, 540, '#F2B830'], [360, 515, '#E7A0C4'], [490, 560, '#E8563F'], [620, 560, '#F2B830'], [40, 430, '#E7A0C4'], [200, 500, '#F2B830'], [860, 560, '#E8563F'], [980, 300, '#E7A0C4']]) {
  body += flower(x, y, c);
}

// 树
for (const [x, y, s] of [[40, 250, 0.8], [250, 230, 0.7], [430, 250, 0.75], [990, 250, 0.7], [240, 620, 0.85], [700, 600, 0.7], [1360, 250, 0.9]]) {
  body += tree(x, y, s);
}

// 建筑
body += house(70, 300, 130, 88, '#C4564A', '杂货铺', { awning: true, chimney: false });
body += house(90, 540, 120, 80, '#8B5A2B', '旅馆', { chimney: true, door: '#4A3520' });
body += `<rect x="128" y="548" width="10" height="16" fill="#F2B830" stroke="#4A3520" stroke-width="1.5"/>`;

body += house(690, 360, 160, 100, '#C4564A', '食堂', { chimney: true });
body += `<ellipse cx="820" cy="300" rx="10" ry="6" fill="#FFF8E7" opacity="0.7"/>`;
body += `<ellipse cx="828" cy="286" rx="14" ry="8" fill="#FFF8E7" opacity="0.45"/>`;
body += house(900, 430, 78, 58, '#A67C52', '白婆婆', { chimney: false });

body += house(760, 150, 110, 72, '#E7C36A', '学校', { chimney: false, door: '#6B4423' });
body += `<rect x="800" y="118" width="4" height="28" fill="#6B4423"/>`;
body += `<polygon points="792,118 804,104 816,118" fill="#E8563F" stroke="#4A3520" stroke-width="1.5"/>`;
body += `<path d="M820 220 C830 280 860 320 900 360" fill="none" stroke="#C9A36A" stroke-width="8" stroke-linecap="round"/>`;
body += house(980, 175, 86, 58, '#D9A05B', '小满家', { chimney: false });

// 田地
body += `<g>`;
for (let r = 0; r < 3; r++) {
  for (let c = 0; c < 4; c++) {
    const x = 1088 + c * 52;
    const y = 400 + r * 36;
    body += `<rect x="${x}" y="${y}" width="46" height="28" rx="6" fill="${(r + c) % 2 ? '#C48A52' : '#A86B3C'}" stroke="#5C3A1E" stroke-width="2"/>`;
    body += `<path d="M${x + 6} ${y + 16} H${x + 40}" stroke="#6B4423" stroke-width="1.5" opacity="0.6"/>`;
    if ((r + c) % 3 !== 0) {
      const crop = ['#E8563F', '#F2B830', '#7EC850'][(r + c) % 3];
      body += `<circle cx="${x + 23}" cy="${y + 10}" r="5" fill="${crop}" stroke="#3E6B28" stroke-width="1"/>`;
    }
  }
}
body += `</g>`;
body += labelPlate(1048, 430, '田地');

// 空草地（养殖预留）：篱笆，不放动物
body += `<path d="M980 590 H1100" stroke="#6B4423" stroke-width="3"/>`;
for (let x = 980; x <= 1100; x += 24) body += `<path d="M${x} 578 V602" stroke="#6B4423" stroke-width="3" stroke-linecap="round"/>`;
body += labelPlate(1040, 640, '空草地');

body += house(1120, 620, 120, 78, '#C4564A', '我家', { chimney: true });
body += house(1310, 280, 110, 76, '#8B5A2B', '田伯', { chimney: true });
body += `<path d="M1360 250 C1388 210 1410 180 1440 150" fill="none" stroke="#C9A36A" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 8" opacity="0.8"/>`;
body += `<ellipse cx="806" cy="292" rx="8" ry="5" fill="#FFF8E7" opacity="0.75"/>`;
body += `<ellipse cx="818" cy="276" rx="12" ry="7" fill="#FFF8E7" opacity="0.45"/>`;
body += `<ellipse cx="1188" cy="560" rx="7" ry="4" fill="#FFF8E7" opacity="0.7"/>`;

body += labelPlate(40, 455, '进村路');
body += labelPlate(1320, 210, '后山');
body += labelPlate(700, 760, '河');

// 标题牌
body += `<rect x="36" y="28" width="280" height="64" rx="14" fill="#FFF8E7" stroke="#4A3520" stroke-width="3"/>`;
body += T(176, 56, 26, '丰穗镇', '#4A3520');
body += T(176, 78, 13, '从村口走进后山', '#8B5A2B');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B7DFF0"/><stop offset="0.55" stop-color="#D7F0E4"/><stop offset="1" stop-color="#F3E7C8"/>
  </linearGradient>
  <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#FFE98A" stop-opacity="0.95"/><stop offset="1" stop-color="#FFE98A" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#B6E08A"/><stop offset="1" stop-color="#7EBE55"/>
  </linearGradient>
  <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8FD0D4"/><stop offset="1" stop-color="#5EABBA"/>
  </linearGradient>
</defs>
${body}
</svg>`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'map.svg'), svg);
console.log('docs/mockups/map.svg');
