/**
 * 把 data/ 下的主数据表同步到 Cocos 工程的 assets/resources/data/。
 * data/ 是唯一真源；Cocos 侧只是副本，改动请改 data/ 后运行 npm run sync-data。
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'data');
const dst = path.join(root, 'assets', 'resources', 'data');
fs.mkdirSync(dst, { recursive: true });
for (const f of fs.readdirSync(src).filter((f) => f.endsWith('.json'))) {
  fs.copyFileSync(path.join(src, f), path.join(dst, f));
  console.log(`synced ${f}`);
}
