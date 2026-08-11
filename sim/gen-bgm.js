/**
 * BGM 合成器（音频 v1.0 / M4-1）：程序化生成背景音乐，无外部依赖。
 * 运行：node sim/gen-bgm.js
 * 产出：assets/resources/audio/bgm/main.wav（11025Hz 16bit 单声道，无缝循环）
 * 风格：MC(C418) 的留白氛围 × 星露谷的田园小调——
 *   72 BPM 慢速、C 大调五声音阶（无半音冲突）、旋律稀疏大量留白、
 *   软垫和弦长音垫底（氛围层）、合成钢琴主奏（带琴槌起音，替代 v1 音乐盒）、
 *   沙锤轻律动层（高频噪声八分摇动，提供"流动感"不抢戏）。
 * v2（2026-08-11）：旋律改钢琴音色 + 全部旋律音加 attack 渐入（根治 v1 瞬时起音"哒哒哒"音头），
 *   新增沙锤层（参考用户偏好：有节奏但舒服、悠扬、久听不烦、无顶部主奏乐器）。
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

/** 加音：t0 起 dur 秒正弦+泛音，指数衰减；超出末尾的部分回卷到开头（无缝循环）
 *  attack：起音渐入秒数（>0 时线性渐入，治瞬时起音的"哒"音头；旋律/钢琴必加） */
function tone({ f0, f1 = f0, t0, dur, amp, harm = [], decay = 6, vib = 0, vibRate = 5, attack = 0 }) {
  const NYQ = SR * 0.45; // 防混叠：基频/泛音超过奈奎斯特即丢弃（半采样率下高音 sparkle 会触顶）
  if (f0 > NYQ) return;
  const start = Math.floor(t0 * SR);
  const N = Math.floor(dur * SR);
  const atkN = Math.floor(attack * SR);
  let phase = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const k = i / N;
    let f = f0 + (f1 - f0) * k;
    if (vib) f *= 1 + vib * Math.sin(2 * Math.PI * vibRate * t);
    phase += (2 * Math.PI * f) / SR;
    let s = Math.sin(phase);
    for (const [h, a] of harm) if (f * h <= NYQ) s += a * Math.sin(phase * h);
    let env = Math.exp(-decay * t);
    if (atkN > 0 && i < atkN) env *= i / atkN;
    b[(start + i) % b.length] += s * amp * env;
  }
}

/** 合成钢琴：琴槌快亮头 + 琴弦长延音两段包络，泛音越高衰减越快（比音乐盒更"肉"） */
function piano({ midi, t0, dur = 1.6, amp = 0.24 }) {
  const f0 = mf(midi);
  const NYQ = SR * 0.45;
  if (f0 > NYQ) return;
  const start = Math.floor(t0 * SR);
  const N = Math.floor(dur * SR);
  const atkN = Math.floor(0.012 * SR); // 12ms 琴槌起音
  // v2.3：高音区柔化——基频超 E5(660Hz) 时压掉 3 阶以上泛音（刺耳感主要来自高音 × 高泛音）
  const soft = f0 > 660 ? 660 / f0 : 1;
  // [泛音比, 振幅, 衰减率]：低泛音撑延音，高泛音只给起音亮度
  const PARTIALS = [[1, 1.0, 2.2], [2, 0.42, 3.5], [3, 0.20 * soft, 5.0], [4, 0.09 * soft, 7.0], [5, 0.04 * soft, 9.0]];
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let s = 0;
    for (const [h, a, d] of PARTIALS) if (f0 * h <= NYQ) s += a * Math.sin(2 * Math.PI * f0 * h * t) * Math.exp(-d * t);
    let env = i < atkN ? i / atkN : 1;
    b[(start + i) % b.length] += s * amp * env;
  }
}

/** 风：棕噪声 + 缓慢起伏包络（≈13s 一阵），似有若无的环境层，藏在音乐底下 */
function wind(rnd) {
  const amp = 0.028; // 剂量纪律：能"感觉"但不能"听清"
  let brown = 0;
  const swell = TOTAL / 6; // 全曲 6 阵风，错开乐句边界
  for (let i = 0; i < b.length; i++) {
    brown = (brown + (rnd() * 2 - 1) * 0.02) * 0.998; // 棕噪声（漏积分白噪声，低频为主）
    const ph = (i / SR / swell) % 1;
    const env = Math.pow(Math.sin(Math.PI * ph), 2); // 每阵风缓起缓落，无音头
    b[i] += brown * amp * env;
  }
}

/** 沙锤：高通噪声 + 短包络，八分音符轻摇（正拍弱、反拍强的"chick"感），提供流动律动 */
function shaker(rnd) {
  for (let bar = 0; bar < BARS; bar++) {
    for (let e = 0; e < 8; e++) {
      const t0 = bar * BAR + e * (BEAT / 2);
      const off = e % 2 === 1; // 反拍
      const amp = (off ? 0.030 : 0.018) * (0.9 + rnd() * 0.2); // 人性化微抖
      const start = Math.floor(t0 * SR);
      const N = Math.floor((off ? 0.09 : 0.06) * SR);
      let prev = 0;
      for (let i = 0; i < N; i++) {
        const t = i / SR;
        const n = rnd() * 2 - 1; // 白噪声
        const hp = n - prev; prev = n; // 一阶高通，只留"沙沙"高频
        const atkN = Math.floor(0.004 * SR);
        let env = Math.exp(-55 * t);
        if (i < atkN) env *= i / atkN;
        b[(start + i) % b.length] += hp * amp * env;
      }
    }
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
  // 低音：每小节根音长音，软而稳（10ms 起音防低频"噗"头）
  tone({ f0: mf(ch.root), t0, dur: BAR * 1.05, amp: 0.16, harm: [[2, 0.12]], decay: 0.9, attack: 0.01 });
  // 软垫：和弦三音铺满 2 小节（每和弦首小节铺一次）
  if (bar % 2 === 0) for (const m of ch.tri) pad({ midi: m, t0, dur: BAR * 2.1, amp: 0.045 });
}

// ---- 1.5) 律动层：沙锤八分轻摇（正拍弱反拍强），贯穿全曲提供流动感 ----
shaker(mulberry32(20260811));

// ---- 1.6) 环境层：间歇微风（v2.2，似有若无剂量，藏在音乐底下） ----
wind(mulberry32(20260812));

// ---- 2) 旋律层：合成钢琴，稀疏留白（星露谷的田园小调感） ----
// 三乐句结构：A(1~8) 呈示 / B(9~16) 加密展开 / A'(17~24) 回归并收尾到主音
// 确定性随机漫步：约 45% 八分位为空（留白），邻级进行为主（≤2 阶），偶发跳进
// v2.1：B 乐句取消高八度（+12 的孤立高音区是"听多了烦躁"的来源），变化只靠密度
const rnd = mulberry32(20260807);
let pos = 3; // 旋律游标（PENTA 下标），从 G 出发
for (let bar = 0; bar < BARS; bar++) {
  const phrase = Math.floor(bar / 8);
  const oct = 0; // v2.1：不再抬八度，全曲旋律待在舒适音区
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
    // v2.3：高音均值回归——游标到 79/81（G5/A5）大概率被拉回中音区，
    // 治随机漫步卡顶造成的"高音扎堆刺耳"（12-20s、53-60s 两个投诉段根因）
    if (pos > 7 && rnd() < 0.65) pos -= 2;
    // 最后一小节强制收主音 C
    if (bar === BARS - 1 && e >= 6) pos = 0;
    const dur = (rnd() < 0.3 ? 1 : 0.5) * BEAT * 1.6; // 附点感长短错落
    piano({ midi: PENTA[pos] + oct, t0, dur: Math.max(dur, 1.6), amp: 0.26 });
    // 乐句尾点缀（每乐句末小节，限制在旋律同音区，不再冲高八度）
    if (bar % 8 === 7 && e === 4) piano({ midi: PENTA[PENTA.length - 1] + oct, t0: t0 + BEAT, dur: 1.4, amp: 0.10 });
  }
}

// ---- 3) 氛围层：v2.1 移除（原 shimmer 高音纯泛音列在慢曲里过于刺耳，pad 已足够铺底） ----

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
