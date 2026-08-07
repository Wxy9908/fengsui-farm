// M3-② 扩表纸面验证（一次性脚本，验证后可删）：组合空间/命中数/发现率 + 查重 + 溢价与时薪校验
const fs = require('fs');
const crops = JSON.parse(fs.readFileSync('data/crops.json', 'utf-8')).crops;
const recipes = JSON.parse(fs.readFileSync('data/recipes.json', 'utf-8')).recipes;

// —— 计划新增（与规格一致；若已落入 JSON 则改为从 JSON 读） ——
const NEW_CROPS = [
  { id: 'carrot', tier: 2, seedPrice: 12, sellPrice: 35, growTime: 900, level: 6 },
  { id: 'cabbage', tier: 2, seedPrice: 25, sellPrice: 85, growTime: 2400, level: 6 },
  { id: 'mushroom', tier: 2, seedPrice: 55, sellPrice: 190, growTime: 5400, level: 6 },
  { id: 'chili', tier: 3, seedPrice: 70, sellPrice: 250, growTime: 5400, level: 7 },
  { id: 'eggplant', tier: 3, seedPrice: 140, sellPrice: 500, growTime: 10800, level: 7 },
  { id: 'peanut', tier: 3, seedPrice: 110, sellPrice: 410, growTime: 9000, level: 7 },
  { id: 'grape', tier: 4, seedPrice: 240, sellPrice: 840, growTime: 14400, level: 8 },
  { id: 'peach', tier: 4, seedPrice: 350, sellPrice: 1250, growTime: 21600, level: 8 },
];
const NEW_RECIPES = [
  { id: 'sauteed_carrot', ing: { carrot: 1 }, price: 55, cook: 25 },
  { id: 'carrot_potato_mash', ing: { carrot: 1, potato: 1 }, price: 90, cook: 40 },
  { id: 'vinegar_cabbage', ing: { cabbage: 1 }, price: 135, cook: 30 },
  { id: 'cabbage_pastry', ing: { cabbage: 1, wheat: 1 }, price: 150, cook: 45 },
  { id: 'grilled_mushroom', ing: { mushroom: 1 }, price: 300, cook: 50 },
  { id: 'mushroom_corn_soup', ing: { mushroom: 1, corn: 1 }, price: 420, cook: 60 },
  { id: 'chili_sauce', ing: { chili: 1 }, price: 410, cook: 90 },
  { id: 'spicy_potato_shreds', ing: { chili: 1, potato: 1 }, price: 430, cook: 90 },
  { id: 'braised_eggplant', ing: { eggplant: 1 }, price: 820, cook: 100 },
  { id: 'eggplant_tomato', ing: { eggplant: 1, tomato: 1 }, price: 820, cook: 100 },
  { id: 'salted_peanut', ing: { peanut: 1 }, price: 650, cook: 90 },
  { id: 'peanut_toast', ing: { peanut: 1, wheat: 1 }, price: 700, cook: 100 },
  { id: 'grape_jam', ing: { grape: 1 }, price: 1400, cook: 160 },
  { id: 'grape_melon_drink', ing: { grape: 1, watermelon: 1 }, price: 2500, cook: 180 },
  { id: 'peach_can', ing: { peach: 1 }, price: 2000, cook: 170 },
  { id: 'peach_berry_tart', ing: { peach: 1, strawberry: 1 }, price: 2670, cook: 190 },
  { id: 'farmhouse_stew', ing: { carrot: 1, cabbage: 1, mushroom: 1 }, price: 560, cook: 60 },
  { id: 'harvest_fruit_cup', ing: { strawberry: 1, grape: 1, peach: 1 }, price: 4340, cook: 220 },
];

const inJson = crops.some((c) => c.id === 'carrot');
const allCrops = inJson ? crops : crops.concat(NEW_CROPS.map((c) => ({ ...c, unlock: { type: 'level', level: c.level } })));
const allRecipes = inJson
  ? recipes
  : recipes.concat(NEW_RECIPES.map((r) => ({ id: r.id, ingredients: r.ing, sellPrice: r.price })));

const price = Object.fromEntries(allCrops.map((c) => [c.id, c.sellPrice]));
const key = (o) => Object.keys(o).filter((k) => o[k] > 0).sort().map((k) => `${k}:${o[k]}`).join('|');

// 1. 多重集查重
const seen = new Map();
let dup = 0;
for (const r of allRecipes) {
  if (r.id === 'dark_cuisine') continue;
  const k = key(r.ingredients);
  if (seen.has(k)) { console.log(`!! 重复多重集: ${seen.get(k)} vs ${r.id} (${k})`); dup++; }
  seen.set(k, r.id);
}
console.log(dup === 0 ? `✅ 组合无重复多重集（共 ${seen.size} 条命中食谱）` : `❌ ${dup} 处重复`);

// 2. 溢价校验（1.5~1.9）
if (inJson) {
  for (const r of allRecipes) {
    if (r.id === 'dark_cuisine') continue;
    const sum = Object.entries(r.ingredients).reduce((a, [k, n]) => a + price[k] * n, 0);
    const p = r.sellPrice / sum;
    if (p < 1.5 || p > 1.9) console.log(`!! 溢价越界: ${r.id} ${p.toFixed(2)}`);
  }
  console.log('✅ 溢价校验完成（无输出即全部在 1.5~1.9）');
} else {
  for (const r of NEW_RECIPES) {
    const sum = Object.entries(r.ing).reduce((a, [k, n]) => a + price[k] * n, 0);
    const p = r.price / sum;
    console.log(`${p < 1.5 || p > 1.9 ? '!!' : '  '} ${r.id}: ${sum}→${r.price} 溢价 ${p.toFixed(2)}`);
  }
}

// 3. 时薪校验
for (const c of NEW_CROPS) {
  const w = (c.sellPrice - c.seedPrice) / (c.growTime / 3600);
  console.log(`  时薪 ${c.id} T${c.tier}: ${w.toFixed(0)}/h（seed ${c.seedPrice} sell ${c.sellPrice} ${c.growTime}s）`);
}

// 4. 发现率曲线
const poolAt = (lv) => allCrops.filter((c) => (c.unlock.type === 'default' ? 1 : c.unlock.level) <= lv).map((c) => c.id);
const multi = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r; };
console.log('\n阶段 | 作物数 | 组合总数 | 命中 | 发现率');
for (const lv of [1, 3, 5, 6, 7, 8]) {
  const pool = new Set(poolAt(lv));
  const n = pool.size;
  let total = 0;
  for (let k = 1; k <= 3; k++) total += multi(n + k - 1, k);
  const hits = allRecipes.filter((r) => r.id !== 'dark_cuisine' && Object.keys(r.ingredients).every((k) => pool.has(k))).length;
  console.log(`Lv${lv} | ${n} | ${total} | ${hits} | ${((100 * hits) / total).toFixed(1)}%`);
}
