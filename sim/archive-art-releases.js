/**
 * 场景原画版本归档：从 git 取出替换前的 in-game 大图，并快照当前即梦版 + 矢量源。
 * 运行：node sim/archive-art-releases.js
 * 产出：art-archive/releases/<version>-<tag>/
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'art-archive', 'releases');
const BG_NAMES = ['field', 'kitchen', 'shop', 'book'];
const GIT_REF = process.env.ARCHIVE_GIT_REF || 'HEAD';

function gitShow(filePath) {
  try {
    return execSync(`git show ${GIT_REF}:${filePath}`, {
      cwd: ROOT,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

function writeManifest(dir, manifest) {
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirFiles(srcDir, destDir, ext) {
  if (!fs.existsSync(srcDir)) return [];
  const names = [];
  for (const f of fs.readdirSync(srcDir)) {
    if (!f.endsWith(ext)) continue;
    copyFile(path.join(srcDir, f), path.join(destDir, f));
    names.push(f);
  }
  return names;
}

let gitCommit = 'unknown';
try {
  gitCommit = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  /* 非 git 环境 */
}

// ---------- 0.4.0：替换前最后一次入库的矢量烘焙场景（git HEAD 中的 jpg） ----------
const dir040 = path.join(ARCHIVE, '0.4.0-vector-scene-bg');
fs.mkdirSync(dir040, { recursive: true });
const saved040 = [];
for (const name of BG_NAMES) {
  const rel = `assets/resources/bg/${name}.jpg`;
  const buf = gitShow(rel);
  if (!buf) continue;
  fs.writeFileSync(path.join(dir040, `${name}.jpg`), buf);
  saved040.push(`${name}.jpg`);
}
const svgNames = copyDirFiles(path.join(ROOT, 'art-src', 'bg'), path.join(dir040, 'vector-src'), '.svg');
writeManifest(dir040, {
  releaseVersion: '0.4.0',
  archivedAt: new Date().toISOString().slice(0, 10),
  gitRef: GIT_REF,
  gitCommit,
  pipeline: 'sim/bg-lib.js → sim/gen-scene-bg.js（程序化矢量烘焙 JPEG）',
  note: '微信体验版 0.4.0 同期画面；即梦阶段 2 替换前从 git 导出。',
  files: saved040,
  vectorSrc: svgNames,
  restoreHint: '复制 *.jpg 到 assets/resources/bg/ 并保留原 .meta；或 npm run gen-scene-bg 从 vector-src 重烘（画面以 git 提交为准）。',
});

// ---------- 0.5.0：即梦小样入库版（当前 in-game + 小样 png） ----------
const dir050 = path.join(ARCHIVE, '0.5.0-jimeng-scene-bg');
fs.mkdirSync(dir050, { recursive: true });
const saved050 = [];
for (const name of BG_NAMES) {
  const src = path.join(ROOT, 'assets', 'resources', 'bg', `${name}.jpg`);
  if (!fs.existsSync(src)) continue;
  copyFile(src, path.join(dir050, `${name}.jpg`));
  saved050.push(`${name}.jpg`);
}
const sampleDir = path.join(ROOT, 'docs', '参考图', '小样');
const jimengSamplesCanonical = ['field_bg.png', 'kitchen_bg.png', 'shop_bg.png']
  .filter((f) => fs.existsSync(path.join(sampleDir, f)))
  .map((f) => `docs/参考图/小样/${f}`);
writeManifest(dir050, {
  releaseVersion: '0.5.0',
  archivedAt: new Date().toISOString().slice(0, 10),
  gitCommit,
  pipeline: '即梦小样 → npm run import-jimeng-bg',
  note: 'M5-P1 阶段 2：field/kitchen/shop 三页场景即梦静态图入库。',
  files: saved050,
  jimengSamplesCanonical,
  restoreHint: 'npm run import-jimeng-bg 或复制 jpg 到 assets/resources/bg/；即梦 PNG 真源见 jimengSamplesCanonical',
});

console.log(`✅ art-archive/releases/0.4.0-vector-scene-bg（${saved040.length} jpg + ${svgNames.length} svg）`);
console.log(`✅ art-archive/releases/0.5.0-jimeng-scene-bg（${saved050.length} jpg；小样见 docs/参考图/小样）`);
