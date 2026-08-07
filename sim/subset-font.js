/**
 * 字体子集化（美术 v1.1 ④）：站酷快乐体（ZCOOL KuaiLe，OFL 免费可商用）→ 游戏 UI 用最小字符集。
 * 全量 1.4MB 撞微信 4MB 主包红线，子集化只保留游戏内可能出现的字符：
 *   - assets/scripts/ 下全部 TS 源码中出现的非 ASCII 字符（UI 文案）；
 *   - data/*.json 中出现的全部字符（作物/食谱/升级的名称与描述）；
 *   - 可打印 ASCII（0x20~0x7E，含数字与半角标点）。
 * 输出：assets/resources/fonts/ui.ttf（resources 内，GameController 运行时加载）。
 * 运行：node sim/subset-font.js
 */
const fs = require('fs');
const path = require('path');
const { Font } = require('fonteditor-core');

const root = path.join(__dirname, '..');
const SRC = path.join(root, 'art-src/fonts/ZCOOLKuaiLe-Regular.ttf');
const OUT = path.join(root, 'assets/resources/fonts/ui.ttf');

// ---------- 收集字符集 ----------
const charset = new Set();
for (let cp = 0x20; cp <= 0x7e; cp++) charset.add(cp); // 可打印 ASCII

const eat = (text) => {
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp > 0x7e) charset.add(cp);
  }
};

// data 表（名称/描述/门控文案的全部字符）
for (const f of fs.readdirSync(path.join(root, 'data'))) {
  if (f.endsWith('.json')) eat(fs.readFileSync(path.join(root, 'data', f), 'utf-8'));
}
// 游戏源码（UI 文案字符串，先剥注释——注释不渲染，缺字警告才有意义）；sim/ 不进包，跳过
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:"'`])\/\/[^\n]*/g, '$1'); // 保守剥 // 注释（避开 URL 字符串）
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.ts')) eat(stripComments(fs.readFileSync(p, 'utf-8')));
  }
};
walk(path.join(root, 'assets/scripts'));

// ---------- 子集化 ----------
const codepoints = [...charset];
console.log(`字符集大小：${codepoints.length}（含 ASCII 95）`);
const font = Font.create(fs.readFileSync(SRC), {
  type: 'ttf',
  subset: codepoints,
  hinting: false, // 手机端屏幕渲染不依赖 hinting，进一步瘦身
});
// 覆盖检查：cmap 里缺的字符逐一列出（运行时不会自动回退，必须消灭缺字）
const cmap = font.get().cmap || {};
const missing = codepoints.filter((cp) => cp > 0x7e && !(cp in cmap));
if (missing.length > 0) {
  console.warn(`⚠ 字体缺字 ${missing.length} 个：${missing.map((cp) => `${String.fromCodePoint(cp)}(U+${cp.toString(16).toUpperCase()})`).join(' ')}`);
  console.warn('  → 请在源码/数据表中替换这些字符（emoji 改图形化），否则游戏内显示为方框');
} else {
  console.log('覆盖检查：非 ASCII 字符全部命中字体 cmap ✅');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const buf = font.write({ type: 'ttf' });
fs.writeFileSync(OUT, Buffer.from(buf));
console.log(`输出 ${path.relative(root, OUT)}：${(fs.statSync(OUT).size / 1024).toFixed(1)} KB（源 ${(fs.statSync(SRC).size / 1024).toFixed(0)} KB）`);
