/**
 * M1 核心循环仿真：不依赖 Cocos 编辑器，直接在 Node 里跑一遍
 * 「种菜 → 收获 → 做菜 → 卖钱 → 买种子/升级」完整循环 + 离线结算。
 * 运行：npm run sim
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { GameCore } from '../assets/scripts/core/GameCore';
import { DataTables, SaveData } from '../assets/scripts/core/types';

// ---------- 加载数据表 ----------
const root = path.join(__dirname, '..', '..');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf-8'));
const crops = read('crops.json');
const recipes = read('recipes.json');
const upgrades = read('upgrades.json');
const levels = read('levels.json');
const milestones = read('milestones.json');
const data: DataTables = {
  crops: crops.crops,
  recipes: recipes.recipes,
  fallbackRecipeId: recipes.fallbackRecipeId,
  upgrades: upgrades.upgrades,
  levels: levels.levels,
  milestones: milestones.milestones,
  // 仿真固定用 1 倍时间（debugTimeScale 是测试期加速开关，逻辑断言不应受它影响）
  config: { ...read('config.json'), debugTimeScale: 1 },
};

// 虚拟时钟：以毫秒推进，替代真实时间
let now = Date.parse('2026-07-21T08:00:00+08:00');
const advance = (sec: number) => {
  now += sec * 1000;
};
const nowFn = () => now;

let game = new GameCore(data, undefined, nowFn);
const log = (msg: string) => console.log(`[t+${((now - Date.parse('2026-07-21T08:00:00+08:00')) / 1000).toFixed(0)}s] ${msg}`);

log(`开局金币 ${game.gold}（数据表 startGold）`);
assert.strictEqual(game.gold, 50);

// ---------- 种菜 → 收获 ----------
const seeds = game.listSeeds().map((c) => c.id);
assert.deepStrictEqual(seeds, ['wheat', 'tomato', 'potato'], '初始只解锁 T1 作物');
log(`初始可买种子: ${seeds.join(', ')}`);

for (let i = 0; i < 4; i++) game.plant(i, 'wheat'); // 4 × 3 = 12 金币
assert.strictEqual(game.gold, 38);
log('种 4 块小麦（-12 金币），等待 60 秒成熟');
advance(60);
assert.strictEqual(game.harvest(0), 'wheat');
for (let i = 1; i < 4; i++) game.harvest(i);
assert.strictEqual(game.getSave().inventory.crops.wheat, 4);
assert.strictEqual(game.xp, 20, '收获 4 次小麦（tier1）应得 5×1×4 = 20 经验');
assert.deepStrictEqual(game.getSave().seenCrops, ['wheat'], '收获应点亮作物图鉴');
const cropBook = game.cropBook();
assert.ok(cropBook.find((c) => c.id === 'wheat')?.discovered, '小麦应已点亮');
assert.ok(!cropBook.find((c) => c.id === 'tomato')?.discovered, '番茄未收获不应点亮');
log('收获小麦 ×4，作物图鉴点亮：小麦');

// ---------- 厨房：发现食谱（出锅才揭晓） ----------
const r1 = game.startCook({ wheat: 2 });
assert.strictEqual(r1.recipe.id, 'toast');
assert.strictEqual(r1.isNew, true, '下锅时可知「会是新菜」，但图鉴/经验等出锅才发');
assert.strictEqual(game.xp, 20, '下锅不再发发现经验（只有 4 次收获 +20）');
log(`组合 {小麦×2} → 下锅（新菜悬念中）`);
assert.strictEqual(game.collectDish(), null, '未熟时不能收取');
advance(80); // 新阶梯：T1 60s + 2 食材加成 20s = 80s
const collected = game.collectDish();
assert.strictEqual(collected?.dishId, 'toast');
assert.strictEqual(collected?.isNew, true, '出锅时才判定首次发现');
assert.strictEqual(game.xp, 70, '出锅发现新食谱应 +50 经验');
assert.strictEqual(collected?.refund, 0, '命中食谱不回血');
log('烤面包出炉（阶梯时长 60+20=80s），发现新食谱「烤面包」！');

const r2 = game.startCook({ wheat: 1 });
assert.strictEqual(r2.recipe.id, 'steamed_bun', '小麦×1 应产出馒头（数量匹配机制）');
advance(60); // T1 1 食材 = 60s
game.collectDish();
log('组合 {小麦×1} → 馒头（1 个和 2 个出不同菜，数量也是变量）');

// ---------- 售卖换钱 ----------
const income = game.sellDish('toast');
assert.strictEqual(income, 15);
const bunIncome = game.sellDish('steamed_bun');
// 仿真固定日期 2026-07-21 的今日特价恰为馒头：6 × 1.2 = 7.2 → 7
assert.strictEqual(bunIncome, 7, '当日特价菜（馒头）卖出价应 ×1.2');
assert.strictEqual(game.xp, 123, '卖菜经验 = income/10 取整：15→2、6→1（馒头发现已 +50）');
log(`卖出烤面包 +15、馒头 +6，当前金币 ${game.gold}`);

// ---------- 剩余小麦直接卖 + 每日奖励 ----------
assert.strictEqual(game.sellCrop('wheat', 1), 4);
assert.strictEqual(game.xp, 123, '卖作物不喂经验（设计只列卖出菜品）');
assert.strictEqual(game.claimDailyReward(), 50);
assert.strictEqual(game.xp, 133, '每日奖励应 +10 经验');
assert.strictEqual(game.claimDailyReward(), 0, '每日奖励一天只能领一次');
log(`卖掉剩余小麦、领每日奖励，当前金币 ${game.gold}`);

// ---------- 升级线：解锁 T2 作物 ----------
// 黑暗料理兜底验证：{土豆×3} 无对应食谱（土豆饼是 {土豆×2} 完全匹配）
for (let i = 0; i < 4; i++) game.plant(i, 'potato');
advance(600);
for (let i = 0; i < 4; i++) game.harvest(i);
const rd = game.startCook({ potato: 3 });
assert.strictEqual(rd.recipe.id, 'dark_cuisine', '未命中组合应产出黑暗料理');
advance(5);
const dc = game.collectDish();
assert.strictEqual(dc?.dishId, 'dark_cuisine');
assert.strictEqual(dc?.refund, 30, '新手保护期：3 个土豆（成本 60）黑暗料理应回血 50% = 30');
assert.strictEqual(game.xp, 203, '发现黑暗料理（新食谱）应再 +50 经验（其间 4 次土豆收获 +20）');
assert.strictEqual(game.level, 1, 'xp 203 未达 Lv2（250，曲线拉陡后前期升级变慢）');
// drainXpEvents：未有升级事件，取走后队列清空
const evs = game.drainXpEvents();
assert.ok(!evs.some((e) => e.type === 'levelup'), '未到 Lv2 不应产生升级事件');
assert.ok(evs.some((e) => e.type === 'xp' && e.amount === 50 && e.source === '发现新食谱'), '应产生经验事件');
assert.deepStrictEqual(game.drainXpEvents(), [], '取走后队列应清空');
assert.strictEqual(game.sellDish('dark_cuisine'), 1);
game.sellCrop('potato', 1); // 剩余 1 个土豆卖掉
log('组合 {土豆×3} → 黑暗料理（图鉴 +1），新手安慰回血 +30，兜底机制正常；经验事件已消费');

// 快进赚钱：反复种土豆卖土豆（演示经济循环）
for (let round = 0; round < 8; round++) {
  for (let i = 0; i < 4; i++) game.plant(i, 'potato');
  advance(600);
  for (let i = 0; i < 4; i++) game.harvest(i);
  for (let i = 0; i < 4; i++) game.sellCrop('potato');
}
log(`经营 8 轮土豆后金币 ${game.gold}，经验 ${game.xp}`);
assert.ok(game.gold >= 200, '应攒够田地 Lv2 的钱');
assert.strictEqual(game.xp, 203 + 8 * 4 * 5, '8 轮 × 4 次收获 tier1 应再 +160 经验');
assert.strictEqual(game.level, 2, 'xp 363 应到农场 Lv2（新曲线 250）');
const evs2 = game.drainXpEvents();
assert.ok(evs2.some((e) => e.type === 'levelup' && e.level === 2 && e.rewardGold === 50), '8 轮后应跨过 Lv2 并产生升级事件');

// 曲线拉陡后主流程经验只到 Lv2：换绑注入 xp=600（Lv3）的存档副本，继续后续玉米/南瓜流程（经验断言已在上方完成）
const saveLv3 = game.getSave();
saveLv3.xp = 600;
game = new GameCore(data, saveLv3, nowFn);

// 等级门控：Lv2 时田地升 Lv3 应被拒绝；注入 xp 到 Lv3 后放行
const gateSave = new GameCore(data, undefined, nowFn).getSave();
gateSave.xp = 300; // Lv2（250≤xp<600）
gateSave.gold = 1000;
gateSave.upgrades.field = 2;
const gateGame = new GameCore(data, gateSave, nowFn);
assert.strictEqual(gateGame.level, 2);
assert.ok(!gateGame.isUnlocked('seed:corn'), 'Lv2 时玉米种子未解锁');
assert.throws(() => gateGame.buyUpgrade('field'), /农场等级不足（需要 Lv3）/, 'Lv2 买田地 Lv3 应抛等级不足');
gateGame.getSave(); // 无副作用
const gateSave3 = gateGame.getSave();
gateSave3.xp = 600; // Lv3
const gateGame3 = new GameCore(data, gateSave3, nowFn);
assert.ok(gateGame3.isUnlocked('seed:corn'), 'Lv3 时玉米种子解锁');
assert.strictEqual(gateGame3.buyUpgrade('field').level, 3, 'Lv3 后田地 Lv3 可购买');
log('等级门控：Lv2 拒绝田地 Lv3，Lv3 放行；isUnlocked(seed:corn) Lv2=false / Lv3=true');

// listAllSeeds：锁定项带 requiredLevel
const allSeeds = new GameCore(data, undefined, nowFn).listAllSeeds();
const cornEntry = allSeeds.find((s) => s.crop.id === 'corn')!;
assert.ok(!cornEntry.unlocked && cornEntry.requiredLevel === 3, 'Lv1 时玉米应锁定且 requiredLevel=3');
const wheatEntry = allSeeds.find((s) => s.crop.id === 'wheat')!;
assert.ok(wheatEntry.unlocked && wheatEntry.requiredLevel === 1, '小麦默认解锁，requiredLevel=1（levels 表反查）');
// M3-②：Lv6 前胡萝卜锁定且 requiredLevel=6
const carrotEntry = allSeeds.find((s) => s.crop.id === 'carrot')!;
assert.ok(!carrotEntry.unlocked && carrotEntry.requiredLevel === 6, 'Lv1 时胡萝卜应锁定且 requiredLevel=6');

// 重复做菜安慰经验 + 烹饪阶梯时长（独立实例，不打乱主流程经验计数）
{
  const g = new GameCore(data, undefined, nowFn);
  for (let i = 0; i < 3; i++) g.plant(i, 'wheat');
  advance(60);
  for (let i = 0; i < 3; i++) g.harvest(i);
  // 阶梯时长：{小麦×1} T1 1 食材 = 60s，未到时不可收、到点可收
  const rb = g.startCook({ wheat: 1 });
  assert.strictEqual(rb.recipe.id, 'steamed_bun');
  advance(59);
  assert.strictEqual(g.collectDish(), null, '阶梯 60s 未到不能收取');
  advance(1);
  assert.strictEqual(g.collectDish()?.dishId, 'steamed_bun', '到 60s 应可收取');
  // 重复烹饪已发现食谱：出锅 +2×tier
  const rb2 = g.startCook({ wheat: 1 });
  assert.strictEqual(rb2.isNew, false, '馒头已发现过');
  const xpBefore = g.xp;
  advance(60);
  g.collectDish();
  assert.strictEqual(g.xp, xpBefore + 2, '重复做馒头（T1）出锅应 +2 经验');
  // 黑暗料理：固定 5s；重复烹饪出锅不加经验
  for (let i = 0; i < 3; i++) g.plant(i, 'potato');
  advance(600);
  for (let i = 0; i < 3; i++) g.harvest(i);
  const rd1 = g.startCook({ potato: 3 });
  assert.strictEqual(rd1.recipe.id, 'dark_cuisine');
  advance(4);
  assert.strictEqual(g.collectDish(), null, '黑暗料理 5s 未到不能收取');
  advance(1);
  assert.strictEqual(g.collectDish()?.dishId, 'dark_cuisine');
  for (let i = 0; i < 3; i++) g.plant(i, 'potato');
  advance(600);
  for (let i = 0; i < 3; i++) g.harvest(i);
  const rd2 = g.startCook({ potato: 3 });
  assert.strictEqual(rd2.isNew, false, '黑暗料理也已发现过');
  const xpBeforeDark = g.xp;
  advance(5);
  g.collectDish();
  assert.strictEqual(g.xp, xpBeforeDark, '重复做黑暗料理出锅不加经验');
  log('重复做菜安慰经验：馒头出锅 +2；黑暗料理不加；阶梯时长（60s/5s）卡点生效');
}

// M3-② 内容扩充：食谱 40 条（39 道 + 黑暗料理）、作物 15 种、组合无重复多重集合
assert.strictEqual(data.recipes.length, 40, '食谱表应为 40 条');
assert.strictEqual(data.crops.length, 15, '作物表应为 15 种');
{
  const key = (o: Record<string, number>) =>
    Object.keys(o).filter((k) => o[k] > 0).sort().map((k) => `${k}:${o[k]}`).join('|');
  const seen = new Set<string>();
  for (const r of data.recipes) {
    if (r.id === data.fallbackRecipeId) continue;
    const k = key(r.ingredients);
    assert.ok(!seen.has(k), `食谱多重集合重复: ${r.id}`);
    seen.add(k);
  }
  assert.strictEqual(seen.size, 39, '命中食谱应为 39 条（不含黑暗料理）');
}

// M3-②：注入 xp 到 Lv6（3300），胡萝卜可买可种可收（tier2 经验 +10）；新组合命中新食谱
{
  const s6 = new GameCore(data, undefined, nowFn).getSave();
  s6.xp = 3300; // Lv6（新曲线）
  const g6 = new GameCore(data, s6, nowFn);
  assert.strictEqual(g6.level, 6);
  assert.ok(g6.isUnlocked('seed:carrot') && g6.listSeeds().some((c) => c.id === 'carrot'), 'Lv6 应解锁胡萝卜');
  const xpBefore = g6.xp;
  g6.plant(0, 'carrot');
  advance(900); // 胡萝卜 900 秒成熟
  assert.strictEqual(g6.harvest(0), 'carrot');
  assert.strictEqual(g6.xp, xpBefore + 10, '收获 tier2 胡萝卜应 +10 经验');
  // 三食材新菜：胡萝卜+白菜+香菇 → 农家炖菜（此时白菜/香菇未入库存，用注入库存验证 resolveCombo 即可）
  assert.strictEqual(g6.resolveCombo({ carrot: 1, cabbage: 1, mushroom: 1 }).id, 'farmhouse_stew', '三食材新组合应命中农家炖菜');
  // 跨层组合：胡萝卜+土豆 → 胡萝卜土豆泥
  assert.strictEqual(g6.resolveCombo({ carrot: 1, potato: 1 }).id, 'carrot_potato_mash', '跨层组合应命中胡萝卜土豆泥');
  // T4 果盅（Lv8 内容，resolveCombo 纯表查询不受等级限制）
  assert.strictEqual(g6.resolveCombo({ strawberry: 1, grape: 1, peach: 1 }).id, 'harvest_fruit_cup', '三食材果组合应命中丰收果盅');
  log('M3-②：Lv6 解锁胡萝卜（收获 +10 经验），新组合命中农家炖菜/胡萝卜土豆泥/丰收果盅');
}

// 升级发奖：xp 注入到 240（Lv1），每日奖励 +10 → 升 Lv2，金币 +50 rewardGold
const lvUpSave = new GameCore(data, undefined, nowFn).getSave();
lvUpSave.xp = 240;
const lvUp = new GameCore(data, lvUpSave, nowFn);
const goldBefore = lvUp.gold;
lvUp.claimDailyReward();
assert.strictEqual(lvUp.level, 2, 'xp 250 应升 Lv2');
assert.strictEqual(lvUp.gold, goldBefore + 50 + 50, '每日 50 金 + Lv2 升级奖励 50 金');
const lvUpEvs = lvUp.drainXpEvents();
assert.ok(lvUpEvs.some((e) => e.type === 'levelup' && e.level === 2 && e.rewardGold === 50 && e.unlocks.includes('upg:kitchen:2')));
log('升级即领：xp 240 + 每日 10 → Lv2，金币 +50 rewardGold，levelup 事件含 unlocks');

// 旧存档迁移：无 xp 字段的存档应补 0
const legacy: Partial<SaveData> = new GameCore(data, undefined, nowFn).getSave();
delete legacy.xp;
const migrated = new GameCore(data, legacy as SaveData, nowFn);
assert.strictEqual(migrated.xp, 0, '旧存档（无 xp）迁移后应为 0');
assert.strictEqual(migrated.level, 1);
log('旧存档迁移：无 xp 字段 → 0（Lv1）');

const up = game.buyUpgrade('field');
assert.strictEqual(up.level, 2);
assert.strictEqual(game.fieldSlots, 6);
assert.ok(game.listSeeds().some((c) => c.id === 'corn'), '农场 Lv3 应解锁玉米');
log(`升级田地 Lv2（-200）：地块 ${game.fieldSlots} 个，农场 Lv3 已解锁玉米/南瓜`);

// ---------- 升级线查询（UI 面板用） ----------
const lines = game.listUpgrades();
assert.deepStrictEqual(lines.map((l) => l.line), ['field', 'kitchen', 'shop', 'convenience']);
assert.strictEqual(lines[0].level, 2, '田地已升到 Lv2');
assert.strictEqual(lines[0].next?.cost, 600, '田地下一级应为 Lv3（600 金）');
assert.strictEqual(lines[1].next?.cost, 150, '厨房下一级应为 Lv2（150 金）');
log(`升级面板查询：${lines.map((l) => `${l.line} Lv${l.level}`).join(' / ')}`);

// ---------- 离线结算（上限 8 小时） ----------
game.plant(0, 'pumpkin'); // 南瓜需 3600 秒
advance(600); // 在线 10 分钟
const before = game.getSave();
const offlineElapsed = 20 * 3600 * 1000; // 离线 20 小时
now += offlineElapsed;
const game2 = new GameCore(data, structuredClone(before), nowFn);
// 离线 20h 但 capped 8h：南瓜 10 分钟 + 8 小时 > 3600 秒 → 成熟
assert.strictEqual(game2.harvest(0), 'pumpkin', '离线 capped 8h 足够南瓜成熟');
log('离线 20 小时（cap 8h）后上线：南瓜已成熟并收获');

// 反例：离线时长不够（且超 cap 也不会多算）
const save3 = game2.getSave();
const game3 = new GameCore(data, save3, nowFn);
game3.plant(1, 'corn'); // 玉米需 1800 秒
const save4 = game3.getSave();
now += 15 * 60 * 1000; // 只离线 15 分钟
const game4 = new GameCore(data, save4, nowFn);
const p = game4.growthProgress(1);
assert.ok(Math.abs(p - 0.5) < 0.01, `玉米离线 15 分钟进度应约 50%，实际 ${(p * 100).toFixed(1)}%`);
log(`玉米离线 15 分钟，进度 ${(p * 100).toFixed(1)}%（1800 秒周期）`);

// ---------- 阶段 6：口径 B 核心层 ----------

// 便利线购买门控：Lv9 放行 Lv2（化肥 3000 金），Lv10 放行 Lv3（一键收获 6000 金），此后满级
{
  const g = new GameCore(data, undefined, nowFn);
  g.getSave();
  assert.throws(() => g.buyUpgrade('convenience'), /农场等级不足（需要 Lv9）/, 'Lv1 买便利 Lv2 应抛等级不足');
  const s = g.getSave();
  s.xp = 12000; // Lv9
  s.gold = 10000;
  const g9 = new GameCore(data, s, nowFn);
  assert.strictEqual(g9.buyUpgrade('convenience').level, 2, 'Lv9 可买便利 Lv2（化肥催熟）');
  assert.throws(() => g9.buyUpgrade('convenience'), /农场等级不足（需要 Lv10）/, 'Lv9 买便利 Lv3 应抛等级不足');
  s.xp = 17500; // Lv10
  const g10 = new GameCore(data, s, nowFn);
  assert.strictEqual(g10.buyUpgrade('convenience').level, 3, 'Lv10 可买便利 Lv3（一键收获）');
  assert.throws(() => g10.buyUpgrade('convenience'), /该升级线已满级/, '便利线 Lv3 后应已满级');
  log('便利线门控：Lv9 放行 Lv2 化肥、Lv10 放行 Lv3 一键收获，此后满级');
}

// 一键收获：未购升级抛错；购得后收获全部成熟地块，经验照常，未成熟地块不动
{
  const s = new GameCore(data, undefined, nowFn).getSave();
  s.gold = 1000;
  const g = new GameCore(data, s, nowFn);
  assert.throws(() => g.harvestAll(), /尚未购买「一键收获」升级/, '未购升级应拒绝一键收获');
  for (let i = 0; i < 4; i++) g.plant(i, 'wheat');
  advance(30); // 未成熟
  const s2 = g.getSave();
  s2.upgrades.convenience = 3; // 注入一键收获（便利线 Lv3）
  const g2 = new GameCore(data, s2, nowFn);
  assert.deepStrictEqual(g2.harvestAll(), [], '未成熟地块一键收获应为空');
  advance(30); // 成熟
  const xpBefore = g2.xp;
  const r = g2.harvestAll();
  assert.strictEqual(r.length, 4, '应收获 4 块成熟小麦');
  assert.ok(r.every((x) => x.cropId === 'wheat' && !x.replanted), '无自动重播升级时 replanted 应为 false');
  assert.strictEqual(g2.getSave().inventory.crops.wheat, 4);
  assert.strictEqual(g2.xp, xpBefore + 20, '一键收获经验照常：4×5×tier1');
  log('一键收获：未购拒绝；4 块成熟小麦一次收完，经验照常');
}

// 自动重播 / 离线上限 +Nh / 组合槽 +N：便利线后续档位暂未开放（数据表到 Lv3 一键收获），
// 效果类型在 core 中保留，待后续内容扩展时恢复数据行与测试。

// 化肥催熟：需便利线 Lv2 解锁；固定价 config.fertilizeCost；空地/已成熟拒绝；付款后立即成熟
{
  const s = new GameCore(data, undefined, nowFn).getSave();
  s.gold = 1000;
  const g = new GameCore(data, s, nowFn);
  assert.throws(() => g.fertilize(0), /尚未购买「化肥催熟」升级/, '未购化肥升级应拒绝施肥');
  s.upgrades.convenience = 2; // 注入化肥解锁
  const g2 = new GameCore(data, s, nowFn);
  assert.throws(() => g2.fertilize(0), /空地不能施肥/);
  g2.plant(0, 'wheat');
  g2.fertilize(0);
  assert.strictEqual(g2.gold, 1000 - 3 - 200, '化肥应扣 200 金');
  assert.strictEqual(g2.growthProgress(0), 1, '施肥后应立即成熟');
  assert.strictEqual(g2.harvest(0), 'wheat');
  g2.plant(1, 'wheat');
  advance(60);
  assert.throws(() => g2.fertilize(1), /已成熟/, '已成熟地块施肥应拒绝');
  const sPoor = g2.getSave();
  sPoor.gold = 0;
  sPoor.fields[2] = { cropId: 'wheat', plantedAt: now };
  const gPoor = new GameCore(data, sPoor, nowFn);
  assert.throws(() => gPoor.fertilize(2), /金币不足/, '金币不足施肥应拒绝');
  log('化肥催熟：便利线 Lv2 解锁；200 金立即成熟；未购/空地/已成熟/金币不足均拒绝');
}

// 今日特价 + 卖出预览：特价纯函数按日派生、×1.2 售价上浮；previewSellAll 只读且与 sellAll 同口径
{
  const s = new GameCore(data, undefined, nowFn).getSave();
  s.discoveredRecipes = ['toast', 'steamed_bun'];
  s.inventory.dishes = { toast: 2, steamed_bun: 1 };
  s.inventory.crops = { wheat: 3 };
  const g = new GameCore(data, s, nowFn);
  const sp = g.dailySpecial()!;
  assert.ok(sp, '有已发现食谱时应有特价');
  assert.ok(['toast', 'steamed_bun'].includes(sp.dishId), '特价应来自已发现食谱');
  assert.strictEqual(sp.mult, 1.2);
  assert.deepStrictEqual(g.dailySpecial(), sp, '同一天特价应确定不变');
  // 无已发现食谱 → null；含黑暗料理也应排除
  const g0 = new GameCore(data, undefined, nowFn);
  assert.strictEqual(g0.dailySpecial(), null, '未发现任何食谱时特价为 null');
  const sDark = g0.getSave();
  sDark.discoveredRecipes = ['dark_cuisine'];
  assert.strictEqual(new GameCore(data, sDark, nowFn).dailySpecial(), null, '只有黑暗料理时特价为 null');
  // 特价菜售价 ×1.2（逐份取整），非特价菜原价
  const dishIds = ['toast', 'steamed_bun'];
  const normalId = dishIds.find((id) => id !== sp.dishId)!;
  const priceOf = (id: string) => data.recipes.find((r) => r.id === id)!.sellPrice;
  const goldBefore = g.gold;
  const gotSpecial = g.sellDish(sp.dishId, 1);
  assert.strictEqual(gotSpecial, Math.round(priceOf(sp.dishId) * 1.2), '特价菜应 ×1.2');
  const gotNormal = g.sellDish(normalId, 1);
  assert.strictEqual(gotNormal, priceOf(normalId), '非特价菜应原价');
  // previewSellAll 只读且与 sellAll 成交一致
  const before = JSON.stringify(g.getSave());
  const pv = g.previewSellAll();
  assert.strictEqual(JSON.stringify(g.getSave()), before, 'previewSellAll 不应改动存档');
  const sa = g.sellAll();
  assert.deepStrictEqual(sa, pv, 'sellAll 成交应与预览一致');
  assert.strictEqual(g.gold, goldBefore + gotSpecial + gotNormal + pv.gold);
  const invAfter = g.getSave().inventory;
  assert.ok(
    [...Object.values(invAfter.crops), ...Object.values(invAfter.dishes)].every((n) => n === 0),
    'sellAll 后库存应清空',
  );
  assert.ok(pv.dishes === 1 && pv.crops === 3, '预览数量口径：剩 1 菜品 + 3 作物');
  log(`今日特价：${sp.name} ×1.2（+${gotSpecial - priceOf(sp.dishId)} 金/份）；卖出预览与成交一致`);
}

// ---------- M4：收集里程碑奖励 ----------
{
  // 表结构：id 唯一、类型合法、同类型门槛递增
  const ms = data.milestones;
  assert.ok(ms.length === 11, '里程碑表应为 11 条（食谱 8 + 作物 3）');
  assert.strictEqual(new Set(ms.map((m) => m.id)).size, ms.length, '里程碑 id 应唯一');
  for (const t of ['recipe', 'crop'] as const) {
    const ths = ms.filter((m) => m.type === t).map((m) => m.threshold);
    assert.deepStrictEqual(ths, [...ths].sort((a, b) => a - b), `${t} 门槛应递增排列`);
  }
  assert.strictEqual(ms.find((m) => m.id === 'recipe_39')?.reward, 5000, '全收集应给最大奖 5000');

  // 门槛触发 + 奖励入账：注入 4 条发现不触发，第 5 条触发 recipe_5（+200）
  const s = new GameCore(data, undefined, nowFn).getSave();
  s.discoveredRecipes = data.recipes.filter((r) => r.id !== data.fallbackRecipeId).slice(0, 4).map((r) => r.id);
  const g4 = new GameCore(data, s, nowFn);
  assert.deepStrictEqual(g4.drainMilestones(), [], '4 条发现不应触发任何里程碑');
  const s5 = g4.getSave();
  s5.discoveredRecipes = data.recipes.filter((r) => r.id !== data.fallbackRecipeId).slice(0, 5).map((r) => r.id);
  const g5 = new GameCore(data, s5, nowFn);
  assert.strictEqual(g5.gold, 50 + 200, '第 5 条发现应触发 recipe_5 并补发 +200（旧存档上线补发路径）');
  const ev5 = g5.drainMilestones();
  assert.deepStrictEqual(ev5.map((m) => m.id), ['recipe_5'], '应产生 recipe_5 达成事件');
  assert.deepStrictEqual(g5.drainMilestones(), [], '事件取走后队列应清空');
  assert.deepStrictEqual(g5.checkMilestones(), [], '已领取的里程碑不应重复发放');
  assert.strictEqual(g5.gold, 250, '重复检查不应重复入账');
  assert.strictEqual(g5.nextMilestoneOf('recipe')?.id, 'recipe_10', '下一个食谱里程碑应为 recipe_10');
  assert.strictEqual(g5.nextMilestoneOf('crop')?.id, 'crop_5');

  // 收获点亮作物触发 crop_5（+300）：注入 4 个已点亮 + 种第 5 种收获
  const sc = new GameCore(data, undefined, nowFn).getSave();
  sc.seenCrops = data.crops.filter((c) => c.id !== 'tomato').slice(0, 4).map((c) => c.id);
  sc.inventory.crops.tomato = 1;
  const gc = new GameCore(data, sc, nowFn);
  assert.deepStrictEqual(gc.drainMilestones(), [], '4 种点亮不应触发 crop_5');
  const goldBefore = gc.gold;
  gc.plant(0, 'tomato');
  advance(300); // 番茄 300 秒成熟
  assert.strictEqual(gc.harvest(0), 'tomato');
  assert.strictEqual(gc.gold, goldBefore - 6 + 300, '收获点亮第 5 种作物应触发 crop_5（+300，扣种子费 6）');
  assert.deepStrictEqual(gc.drainMilestones().map((m) => m.id), ['crop_5']);
  assert.deepStrictEqual(gc.checkMilestones(), [], 'crop_5 不应重复发放');

  // 旧存档迁移：无 claimedMilestones 字段且已远超门槛 → 上线一次性补发全部已达成
  const legacy = new GameCore(data, undefined, nowFn).getSave() as Partial<SaveData>;
  delete legacy.claimedMilestones;
  legacy.discoveredRecipes = data.recipes.map((r) => r.id); // 含黑暗料理（计数应排除）
  legacy.seenCrops = data.crops.map((c) => c.id); // 15 种全点亮
  legacy.gold = 100;
  const gm = new GameCore(data, legacy as SaveData, nowFn);
  const totalReward = data.milestones.reduce((a, m) => a + m.reward, 0);
  assert.strictEqual(gm.gold, 100 + totalReward, `旧存档应一次性补发全部 ${data.milestones.length} 条里程碑（合计 ${totalReward} 金）`);
  assert.strictEqual(gm.drainMilestones().length, data.milestones.length, '补发事件应逐个列出');
  assert.deepStrictEqual(gm.checkMilestones(), [], '补发后不应再有可领里程碑');
  assert.strictEqual(gm.nextMilestoneOf('recipe'), null, '全达成后下一个预告应为 null（UI 显示已全部达成）');
  assert.strictEqual(gm.nextMilestoneOf('crop'), null);
  log(`M4 收集里程碑：门槛触发/不重复发放/旧存档补发（全收集合计 ${totalReward} 金）/预告查询全部通过`);
}

console.log('\n✅ 仿真通过：核心循环（种菜→收获→做菜→卖钱→升级）+ 离线结算全部符合数据表预期');
