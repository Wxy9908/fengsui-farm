/**
 * BGM 合成器（音频 v1.0 / M4-1）：程序化生成背景音乐，无外部依赖。
 * 运行：node sim/gen-bgm.js
 * 产出：assets/resources/audio/bgm/main.wav（11025Hz 16bit 单声道，无缝循环）
 * 风格：MC(C418) 的留白氛围 × 星露谷的田园小调——
 *   72 BPM 慢速、C 大调五声音阶（无半音冲突）、旋律稀疏大量留白、
 *   软垫和弦长音垫底（氛围层）、音乐盒音色旋律（与音效同源 MB 泛音列）。
 * 无缝循环原理：所有音符的起止严格对齐节拍网格，尾音衰减按缓冲长度取模回卷到开头。
 * 体积说明：WAV 约 3.5MB，按 M4-2 发布工程应走 CDN；本地包内不入主包红线。
 * 注意：.meta 由 Cocos Creator 下次打开时自动生成；GameController 加载失败静默降级。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SR = 11025; // 音乐盒/软垫以中低频为主，半采样率体积减半（80s≈1.7MB）；防混叠见 tone() 内保护
const OUT_DIR = path.join(__dirname, '..', 'assets', 'resources', 'audio', 'bgm');
fs.mkdirSync(OUT_DIR, { recursive: true });

/** 确定性伪随机（mulberry32），与 gen-audio.js 同源，保证每次生成完全一致 */
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 音符频率：midi → Hz */
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- 曲式参数 ----
const BPM = 72;
const BEAT = 60 / BPM;            // ≈0.833s
const BAR = BEAT * 4;             // ≈3.33s
const BARS = 24;                  // 3 乐句 × 8 小节
const TOTAL = BAR * BARS;         // ≈80s

// 和弦进行：I–vi–IV–V 循环（C Am F G），每和弦 2 小节，3 乐句同构
const CHORDS = [
  { root: 36, tri: [48, 52, 55] },  // C2 / C-E-G
  { root: 33, tri: [45, 48, 52] },  // A1 / A-C-E
  { root: 29, tri: [41, 45, 48] },  // F1 / F-A-C
  { root: 31, tri: [43, 47, 50] },  // G1 / G-B-D
];
// 五声音阶旋律池（C 大调 pentatonic，两个八度）
const PENTA = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81];

const b = new Float32Array(Math.ceil(TOTAL * SR));

/** 加音：t0 起 dur 秒正弦+泛音，指数衰减；超出末尾的部分回卷到开头（无缝循环） */
function tone({ f0, f1 = f0, t0, dur, amp, harm = [], decay = 6, vib = 0, vibRate = 5 }) {
  const NYQ = SR * 0.45; // 防混叠：基频/泛音超过奈奎斯特即丢弃（半采样率下高音 sparkle 会触顶）
  if (f0 > NYQ) return;
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
    for (const [h, a] of harm) if (f * h <= NYQ) s += a * Math.sin(phase * h);
    s *= amp * Math.exp(-decay * t);
    b[(start + i) % b.length] += s;
  }
}

/** 软垫音：慢起音长保持的和弦长音（MC 氛围层），attack 段线性渐入防咔哒 */
function pad({ midi, t0, dur, amp }) {
  const f0 = mf(midi);
  const start = Math.floor(t0 * SR);
  const N = Math.floor(dur * SR);
  const atk = Math.floor(1.2 * SR);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    phase += (2 * Math.PI * f0) / SR;
    let env = Math.min(1, i / atk) * Math.exp(-0.55 * t); // 慢起 + 极慢衰减
    let s = Math.sin(phase) + 0.35 * Math.sin(phase * 2) + 0.12 * Math.sin(phase * 3);
    b[(start + i) % b.length] += s * amp * env;
  }
}

// 音乐盒泛音列（与音效同源）
const MB = [[2, 0.28], [3, 0.14], [4.2, 0.05]];

// ---- 1) 和声层：低音根音 + 软垫和弦，每和弦 2 小节 ----
for (let bar = 0; bar < BARS; bar++) {
  const ch = CHORDS[Math.floor(bar / 2) % 4];
  const t0 = bar * BAR;
  // 低音：每小节根音长音，软而稳
  tone({ f0: mf(ch.root), t0, dur: BAR * 1.05, amp: 0.16, harm: [[2, 0.12]], decay: 0.9 });
  // 软垫：和弦三音铺满 2 小节（每和弦首小节铺一次）
  if (bar % 2 === 0) for (const m of ch.tri) pad({ midi: m, t0, dur: BAR * 2.1, amp: 0.045 });
}

// ---- 2) 旋律层：音乐盒，稀疏留白（星露谷的田园小调感） ----
// 三乐句结构：A(1~8) 呈示 / B(9~16) 高八度展开 / A'(17~24) 回归并收尾到主音
// 确定性随机漫步：约 45% 八分位为空（留白），邻级进行为主（≤2 阶），偶发跳进
const rnd = mulberry32(20260807);
let pos = 3; // 旋律游标（PENTA 下标），从 G 出发
for (let bar = 0; bar < BARS; bar++) {
  const phrase = Math.floor(bar / 8);
  const oct = phrase === 1 ? 12 : 0; // B 乐句高八度
  for (let e = 0; e < 8; e++) {
    const t0 = bar * BAR + e * (BEAT / 2);
    const isBarHead = e === 0;
    // 留白规则：句首必出音；其余 ~45% 概率休止；B 乐句加密（30% 休止）
    const restP = phrase === 1 ? 0.3 : 0.45;
    if (!isBarHead && rnd() < restP) continue;
    // 随机漫步：70% 走 ±1~2 阶，20% 不动，10% 跳 ±3~4
    const r = rnd();
    let step = 0;
    if (r < 0.7) step = (rnd() < 0.5 ? -1 : 1) * (1 + Math.floor(rnd() * 2));
    else if (r >= 0.9) step = (rnd() < 0.5 ? -1 : 1) * (3 + Math.floor(rnd() * 2));
    pos = Math.max(0, Math.min(PENTA.length - 1, pos + step));
    // 最后一小节强制收主音 C
    if (bar === BARS - 1 && e >= 6) pos = 0;
    const dur = (rnd() < 0.3 ? 1 : 0.5) * BEAT * 1.6; // 附点感长短错落
    tone({ f0: mf(PENTA[pos] + oct), t0, dur, amp: 0.30, harm: MB, decay: 4.5, vib: 0.004, vibRate: 4.5 });
    // 乐句尾点缀高音星光（每乐句末小节）
    if (bar % 8 === 7 && e === 4) tone({ f0: mf(91 + oct), t0: t0 + BEAT, dur: 1.4, amp: 0.10, harm: MB, decay: 3.5 });
  }
}

// ---- 3) 氛围层：极轻的高频「风」 shimmer，每 4 小节一粒 ----
for (let bar = 0; bar < BARS; bar += 4) {
  const m = PENTA[Math.floor(mulberry32(bar + 7)() * PENTA.length)] + 24;
  tone({ f0: mf(m), t0: bar * BAR + BEAT * 2, dur: 2.2, amp: 0.05, harm: MB, decay: 2.5 });
}

// ---- 写出 ----
let peak = 0;
for (const s of b) peak = Math.max(peak, Math.abs(s));
const g = 0.7 / peak; // BGM 峰值压 0.7，给音效留头顶空间
const out = Buffer.alloc(44 + b.length * 2);
out.write('RIFF', 0); out.writeUInt32LE(36 + b.length * 2, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(b.length * 2, 40);
for (let i = 0; i < b.length; i++) out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b[i] * g * 32767))), 44 + i * 2);
const file = path.join(OUT_DIR, 'main.wav');
fs.writeFileSync(file, out);
console.log(`✅ audio/bgm/main.wav（${(out.length / 1024 / 1024).toFixed(2)}MB，${TOTAL.toFixed(1)}s @ ${BPM}BPM，无缝循环）`);
console.log('注意：体积超主包红线，按 M4-2 发布工程走 CDN；.meta 由编辑器下次打开自动生成');
