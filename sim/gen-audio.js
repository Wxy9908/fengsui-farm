/**
 * 音效合成器（音频 v0.1）：程序化 DSP 生成游戏音效 WAV，无外部依赖。
 * 运行：node sim/gen-audio.js
 * 产出：assets/resources/audio/sfx/<name>.wav（22050Hz 16bit 单声道）
 * 风格：对齐「暖、软、拙」——音乐盒/木琴质感（正弦+少量泛音、指数衰减），
 *   禁尖锐方波与刺耳高频；所有音效 <1.2s，服务即时反馈。
 * 路线说明（2026-07-26 定）：音效现在程序化合成；BGM 留 M4 从免费素材库选轻音乐。
 * 注意：.meta 由 Cocos Creator 下次打开时自动生成；GameController 加载失败静默降级。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 22050;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'resources', 'audio', 'sfx');
fs.mkdirSync(OUT_DIR, { recursive: true });

/** 确定性伪随机（mulberry32），保证每次生成完全一致 */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 加法合成一个音：扫频正弦 + 泛音列 + 指数衰减（+ 可选颤音）。
 * f0→f1 线性扫频；harm = [[倍频, 振幅比]...]；decay 越大衰减越快。
 */
function tone(buf, { f0, f1 = f0, t0 = 0, dur, amp = 0.5, harm = [], decay = 6, vib = 0, vibRate = 6 }) {
  const start = Math.floor(t0 * SR);
  const N = Math.floor(dur * SR);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const k = i / N;
    let f = f0 + (f1 - f0) * k;
    if (vib) f *= 1 + vib * Math.sin(2 * Math.PI * vibRate * t);
    phase += (2 * Math.PI * f) / SR;
    let s = Math.sin(phase);
    for (const [h, a] of harm) s += a * Math.sin(phase * h);
    s *= amp * Math.exp(-decay * t);
    const idx = start + i;
    if (idx < buf.length) buf[idx] += s;
  }
}

/** 平滑噪声（单极点低通）：泥土、蒸汽、纸感 */
function noise(buf, { t0 = 0, dur, amp = 0.3, decay = 8, smooth = 0.6, seed = 42 }) {
  const rnd = mulberry32(seed);
  const start = Math.floor(t0 * SR);
  const N = Math.floor(dur * SR);
  let y = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    y += (1 - smooth) * (rnd() * 2 - 1 - y);
    const idx = start + i;
    if (idx < buf.length) buf[idx] += y * amp * Math.exp(-decay * t);
  }
}

const buf = (durSec) => new Float32Array(Math.ceil(durSec * SR));
/** 归一化到峰值 0.89，防裁剪 */
function normalize(b) {
  let peak = 0;
  for (const s of b) peak = Math.max(peak, Math.abs(s));
  if (peak > 0) { const g = 0.89 / peak; for (let i = 0; i < b.length; i++) b[i] *= g; }
  return b;
}

function writeWav(file, b) {
  const n = b.length;
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVE', 8);
  out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(file, out);
  return out.length;
}

// 音乐盒泛音列（暖软基调，全音效共用）
const MB = [[2, 0.28], [3, 0.14], [4.2, 0.05]];

const SFX = {
  // 通用按钮：短促木鱼嗒
  click: () => {
    const b = buf(0.08);
    tone(b, { f0: 880, f1: 660, dur: 0.06, amp: 0.5, decay: 45 });
    noise(b, { dur: 0.02, amp: 0.12, decay: 60, smooth: 0.4, seed: 1 });
    return b;
  },
  // 种植：低软土声 + 细碎泥粒
  plant: () => {
    const b = buf(0.24);
    tone(b, { f0: 150, f1: 85, dur: 0.18, amp: 0.6, decay: 16 });
    noise(b, { dur: 0.1, amp: 0.28, decay: 22, smooth: 0.85, seed: 2 });
    return b;
  },
  // 收获：上挑啵 + 两粒高音闪
  harvest: () => {
    const b = buf(0.38);
    tone(b, { f0: 520, f1: 940, dur: 0.07, amp: 0.55, decay: 20 });
    tone(b, { f0: 1318, t0: 0.07, dur: 0.12, amp: 0.3, harm: MB, decay: 16 });
    tone(b, { f0: 1760, t0: 0.14, dur: 0.16, amp: 0.26, harm: MB, decay: 14 });
    return b;
  },
  // 金币：经典双音叮
  coin: () => {
    const b = buf(0.38);
    tone(b, { f0: 988, dur: 0.09, amp: 0.5, harm: [[2, 0.25]], decay: 12 });
    tone(b, { f0: 1319, t0: 0.08, dur: 0.26, amp: 0.5, harm: [[2, 0.25], [4, 0.1]], decay: 10 });
    return b;
  },
  // 发现新食谱：音乐盒上行琶音 C-E-G-C + 尾音闪
  discovery: () => {
    const b = buf(1.15);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(b, { f0: f, t0: i * 0.12, dur: 0.6, amp: 0.42, harm: MB, decay: 5 }));
    tone(b, { f0: 2093, t0: 0.52, dur: 0.35, amp: 0.14, harm: MB, decay: 8 });
    return b;
  },
  // 发现稀有食谱（三食材菜）：低音暖根音 + 六音上行琶音 C-E-G-C-E-G + 高音星光闪烁
  discovery_rare: () => {
    const b = buf(1.15);
    tone(b, { f0: 130.81, dur: 0.9, amp: 0.22, harm: [[2, 0.15]], decay: 3 }); // C2 暖底
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98].forEach((f, i) =>
      tone(b, { f0: f, t0: i * 0.1, dur: 0.55, amp: 0.4, harm: MB, decay: 5 }));
    [2093, 2637, 3136].forEach((f, i) =>
      tone(b, { f0: f, t0: 0.62 + i * 0.09, dur: 0.3, amp: 0.12, harm: MB, decay: 8 })); // 星光闪烁
    return b;
  },
  // 开始烹饪：三声软咕嘟 + 轻蒸汽
  cook_start: () => {
    const b = buf(0.42);
    [0, 0.13, 0.26].forEach((t, i) =>
      tone(b, { f0: 300 + i * 60, f1: 520 + i * 40, t0: t, dur: 0.09, amp: 0.4, decay: 18 }));
    noise(b, { t0: 0.05, dur: 0.3, amp: 0.07, decay: 5, smooth: 0.92, seed: 3 });
    return b;
  },
  // 出锅：双铃轻响（开盖铃铛）
  cook_done: () => {
    const b = buf(0.85);
    tone(b, { f0: 880, dur: 0.7, amp: 0.5, harm: [[2, 0.22], [2.76, 0.12], [5.4, 0.05]], decay: 4.5 });
    tone(b, { f0: 1174.7, t0: 0.16, dur: 0.55, amp: 0.32, harm: [[2, 0.2], [2.76, 0.1]], decay: 5 });
    return b;
  },
  // 黑暗料理：下滑滑稽音 + 一点糊气
  dark: () => {
    const b = buf(0.68);
    tone(b, { f0: 360, f1: 130, dur: 0.55, amp: 0.5, harm: [[2, 0.2]], decay: 2.5, vib: 0.045, vibRate: 7 });
    noise(b, { t0: 0.3, dur: 0.22, amp: 0.09, decay: 6, smooth: 0.8, seed: 4 });
    return b;
  },
  // 每日奖励：两音轻快问候 E-G
  daily: () => {
    const b = buf(0.6);
    tone(b, { f0: 659.25, dur: 0.3, amp: 0.4, harm: MB, decay: 7 });
    tone(b, { f0: 783.99, t0: 0.13, dur: 0.38, amp: 0.44, harm: MB, decay: 6 });
    return b;
  },
  // 升级：上行四音 C-E-G-C，明亮收尾
  upgrade: () => {
    const b = buf(0.7);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(b, { f0: f, t0: i * 0.09, dur: i === 3 ? 0.4 : 0.22, amp: 0.4, harm: MB, decay: 7 }));
    return b;
  },
  // 农场等级提升：暖底 + 五音上行走句 C-D-E-G-C + 尾音星光（比购买升级更庆祝）
  levelup: () => {
    const b = buf(1.2);
    tone(b, { f0: 196, dur: 0.8, amp: 0.2, harm: [[2, 0.15]], decay: 3 }); // G2 暖底
    [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone(b, { f0: f, t0: i * 0.11, dur: i === 4 ? 0.6 : 0.3, amp: 0.42, harm: MB, decay: 5.5 }));
    [1567.98, 2093].forEach((f, i) =>
      tone(b, { f0: f, t0: 0.62 + i * 0.1, dur: 0.3, amp: 0.12, harm: MB, decay: 8 })); // 星光
    return b;
  },
  // 化肥催熟：轻沙沙 + 三粒上行闪烁（「快快长大」的魔法感）
  fertilize: () => {
    const b = buf(0.55);
    noise(b, { dur: 0.28, amp: 0.22, decay: 7, smooth: 0.7, seed: 5 }); // 撒肥沙沙
    [1046.5, 1318.5, 1567.98].forEach((f, i) =>
      tone(b, { f0: f, t0: 0.1 + i * 0.09, dur: 0.22, amp: 0.3, harm: MB, decay: 10 }));
    return b;
  },
  // 放入食材：短软「嗒-啵」落锅感
  add_ingredient: () => {
    const b = buf(0.16);
    tone(b, { f0: 320, f1: 240, dur: 0.07, amp: 0.5, decay: 28 });
    tone(b, { f0: 660, f1: 880, t0: 0.05, dur: 0.08, amp: 0.3, harm: MB, decay: 20 });
    return b;
  },
  // 取出食材：更轻的上挑（与放入镜像）
  remove_ingredient: () => {
    const b = buf(0.14);
    tone(b, { f0: 520, f1: 760, dur: 0.09, amp: 0.35, harm: MB, decay: 24 });
    return b;
  },
  // 操作被拒绝：温和低双音「嘟-嘟」（不刺耳，只表否定）
  error: () => {
    const b = buf(0.3);
    tone(b, { f0: 220, dur: 0.09, amp: 0.4, harm: [[2, 0.12]], decay: 22 });
    tone(b, { f0: 185, t0: 0.12, dur: 0.12, amp: 0.4, harm: [[2, 0.12]], decay: 18 });
    return b;
  },
  // 翻炒（烹饪中循环）：轻铲碰锅 + 稀疏「沙沙」底噪，避免魔女式密集咕噜
  stir: () => {
    const b = buf(2.0);
    {
      const rnd = mulberry32(11);
      let y = 0;
      for (let i = 0; i < b.length; i++) {
        const t = i / SR;
        y += 0.015 * (rnd() * 2 - 1 - y);
        const lfo = 0.35 + 0.25 * Math.sin(2 * Math.PI * 1.1 * t);
        b[i] += y * 0.45 * lfo;
      }
    }
    const scrapes = [
      [0.05, 280, 0.06],
      [0.42, 310, 0.05],
      [0.78, 265, 0.055],
      [1.18, 295, 0.05],
      [1.55, 270, 0.06],
    ];
    for (const [t0, f0, dur] of scrapes) {
      tone(b, { f0, f1: f0 * 0.55, t0, dur, amp: 0.22, harm: [[2, 0.08]], decay: 28 });
    }
    const rndT = mulberry32(41);
    for (let k = 0; k < 3; k++) {
      const t0 = 0.3 + k * 0.55 + rndT() * 0.12;
      tone(b, { f0: 120 + rndT() * 40, t0, dur: 0.05, amp: 0.12, harm: [[2, 0.1]], decay: 22 });
    }
    tone(b, { f0: 240, f1: 180, t0: 1.82, dur: 0.08, amp: 0.18, harm: [[2, 0.12]], decay: 20 });
    return b;
  },
  // 离线结算/回游问候：舒展暖两音 G-E + 轻铃尾（「欢迎回来」）
  offline: () => {
    const b = buf(1.0);
    tone(b, { f0: 392, dur: 0.4, amp: 0.36, harm: MB, decay: 5 });
    tone(b, { f0: 659.25, t0: 0.16, dur: 0.5, amp: 0.4, harm: MB, decay: 4.5 });
    tone(b, { f0: 1318.5, t0: 0.42, dur: 0.35, amp: 0.14, harm: MB, decay: 7 }); // 轻铃尾
    return b;
  },
};

for (const [name, fn] of Object.entries(SFX)) {
  const size = writeWav(path.join(OUT_DIR, `${name}.wav`), normalize(fn()));
  console.log(`✅ audio/sfx/${name}.wav（${(size / 1024).toFixed(1)}KB）`);
}
console.log(`完成：${Object.keys(SFX).length} 个音效 → assets/resources/audio/sfx/（.meta 由编辑器下次打开自动生成）`);
