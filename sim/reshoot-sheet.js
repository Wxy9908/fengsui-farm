// 一次性：按 icon-sheet.svg 实际宽高重出全尺寸拼版 PNG（gen-assets 固定 840×640 窗口会裁掉长拼版）
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const svgPath = path.join(__dirname, '..', 'docs', 'mockups', 'icon-sheet.svg');
const svg = fs.readFileSync(svgPath, 'utf-8');
const w = +svg.match(/width="(\d+)"/)[1];
const h = +svg.match(/height="(\d+)"/)[1];
const EDGE = ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find((p) => fs.existsSync(p));
execFileSync(EDGE, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--screenshot=${path.join(__dirname, '..', 'docs', 'mockups', 'icon-sheet.png')}`,
  `--window-size=${w},${h}`,
  `file:///${svgPath.replace(/\\/g, '/')}`,
], { stdio: 'pipe' });
console.log(`re-shot icon-sheet.png at ${w}x${h}`);
