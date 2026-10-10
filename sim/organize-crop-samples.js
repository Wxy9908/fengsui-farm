/**
 * 即梦导出「*_抠图.png」→ 整理为田里标准命名，旧文件进 _archive。
 * 运行：node sim/organize-crop-samples.js
 *
 * 规范（真源目录 docs/参考图/小样/icons/crops/）：
 *   <id>.png | <id>_s1.png | <id>_s2.png   — 仅这三种，无后缀
 * 即梦批量下载常带「_抠图」：本脚本提升为 canonical 并归档被替换的旧图。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'docs', '参考图', '小样', 'icons', 'crops');
const STAGE_RE = /^([a-z]+)(_s[12])?\.png$/i;
const CUTOUT_RE = /^([a-z]+)(_s[12])?_抠图\.png$/i;

function todayStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

if (!fs.existsSync(DIR)) {
  console.error(`目录不存在：${DIR}`);
  process.exit(1);
}

const archiveDir = path.join(DIR, '_archive', todayStamp());
fs.mkdirSync(archiveDir, { recursive: true });

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.png'));
let promoted = 0;
let archived = 0;

function moveToArchive(name) {
  const src = path.join(DIR, name);
  if (!fs.existsSync(src)) return;
  const dest = path.join(archiveDir, name);
  let finalDest = dest;
  if (fs.existsSync(finalDest)) {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    finalDest = path.join(archiveDir, `${base}_${Date.now()}${ext}`);
  }
  fs.renameSync(src, finalDest);
  archived++;
  console.log(`  归档 ${name} → _archive/${path.basename(archiveDir)}/`);
}

/** 先处理抠图版（优先于同名非抠图） */
const cutouts = files.filter((f) => CUTOUT_RE.test(f)).sort();
for (const f of cutouts) {
  const m = f.match(CUTOUT_RE);
  const canonical = `${m[1]}${m[2] || ''}.png`;
  if (fs.existsSync(path.join(DIR, canonical))) {
    moveToArchive(canonical);
  }
  fs.renameSync(path.join(DIR, f), path.join(DIR, canonical));
  console.log(`✓ ${f} → ${canonical}`);
  promoted++;
}

/** 残留的 _抠图（命名异常）归档 */
for (const f of fs.readdirSync(DIR)) {
  if (f.includes('抠图') && f.endsWith('.png')) {
    moveToArchive(f);
  }
}

/** 非标准命名（非 id / id_s1 / id_s2）的 png 归档 */
for (const f of fs.readdirSync(DIR)) {
  if (!f.endsWith('.png')) continue;
  if (f.startsWith('_')) continue;
  if (!STAGE_RE.test(f)) {
    moveToArchive(f);
  }
}

const left = fs.readdirSync(DIR).filter((f) => f.endsWith('.png') && !f.startsWith('_'));
const byCrop = {};
for (const f of left) {
  const m = f.match(STAGE_RE);
  if (!m) continue;
  const id = m[1];
  if (!byCrop[id]) byCrop[id] = [];
  byCrop[id].push(f);
}

console.log('\n当前 canonical 清单：');
for (const id of Object.keys(byCrop).sort()) {
  const stages = byCrop[id].sort();
  const ok = ['', '_s1', '_s2'].every((s) => stages.includes(`${id}${s}.png`));
  console.log(`  ${id}: ${stages.join(', ')}${ok ? '' : ' ⚠️ 缺档'}`);
}

console.log(`\n提升抠图 ${promoted} 张，归档 ${archived} 张。`);
console.log('下一步：npm run import-jimeng-crop-stages-all（入库会去水印+透明底）');
