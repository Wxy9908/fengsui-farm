/**
 * M3 数值平衡仿真：不依赖编辑器，用「理想玩家 bot」在虚拟时钟下经营多天，
 * 回答三个问题：
 *  ① 「直卖 vs 做菜」定价悬案——同样游玩节奏下两条策略的金币/经验收益差；
 *  ② 等级曲线节奏——多少天到 Lv3/5/8/10，是否过陡/过缓；
 *  ③ 水槽吞吐——升级线购买节奏、化肥消耗能力、金币是否淤积。
 *
 * 运行：npm run balance
 *
 * 口径说明：
 *  - bot 拥有全部食谱的完美信息（真实玩家需要探索），金币/经验为理论上限；
 *  - 游玩节奏 = 每天 4 次上线（8/12/18/22 点），每次上线最多做 3 锅菜并等待出锅；
 *  - 夜间长离线走 settleOffline（受 offlineCapHours 封顶），与现实时间制一致。
 */

import fs from 'node:fs';
import path from 'node:path';
import { GameCore } from '../assets/scripts/core/GameCore';
import { DataTables, RecipeDef, CropDef } from '../assets/scripts/core/types';

// ---------- 数据表 ----------
const root = path.join(__dirname, '..', '..');
const read = (f: string) => JSON.parse(fs.readFileSync(path.join(root, 'data', f), 'utf-8'));
const data: DataTables = {
  crops: read('crops.json').crops,
  recipes: read('recipes.json').recipes,
  fallbackRecipeId: read('recipes.json').fallbackRecipeId,
  upgrades: read('upgrades.json').upgrades,
  levels: read('levels.json').levels,
  milestones: read('milestones.json').milestones,
  npcs: read('npcs.json').npcs,
  orders: read('orders.json').orders,
  stories: read('stories.json').stories,
  prologue: read('stories.json').prologue,
  config: { ...read('config.json'), debugTimeScale: 1 }, // 仿真固定 1 倍时间
};

const cropOf = (id: string): CropDef => data.crops.find((c) => c.id === id)!;
const ingCost = (r: RecipeDef) => Object.entries(r.ingredients).reduce((s, [id, n]) => s + cropOf(id).sellPrice * n, 0);

// ============================================================
// 第一部分：静态表体检
// ============================================================
console.log('================ 静态表体检 ================');
console.log('\n-- 作物直卖时薪（(售价-种子价)/周期，未含店铺倍率）--');
for (const c of data.crops) {
  const profit = c.sellPrice - c.seedPrice;
  const hourly = (profit / c.growTime) * 3600;
  const margin = ((profit / c.seedPrice) * 100).toFixed(0);
  console.log(
    `  T${c.tier} ${c.name.padEnd(4, '　')} 种子${String(c.seedPrice).padStart(3)} 售${String(c.sellPrice).padStart(4)} ` +
      `周期${String(c.growTime).padStart(5)}s 净利${String(profit).padStart(4)} 时薪 ${hourly.toFixed(0).padStart(3)}/h 利润率 ${margin}%`,
  );
}

console.log('\n-- 菜品溢价（售价 / 食材机会成本，目标 1.7~2.2）--');
const premiums: number[] = [];
for (const r of data.recipes) {
  if (r.id === data.fallbackRecipeId) continue;
  const cost = ingCost(r);
  const p = r.sellPrice / cost;
  premiums.push(p);
  const flag = p < 1.7 || p > 2.2 ? '  ⚠ 超出区间' : '';
  console.log(`  T${r.tier} ${r.name} 成本${cost} 售${r.sellPrice} 溢价 ${p.toFixed(2)}${flag}`);
}
premiums.sort((a, b) => a - b);
console.log(
  `  溢价分布：min ${premiums[0].toFixed(2)} / 中位 ${premiums[Math.floor(premiums.length / 2)].toFixed(2)} / max ${premiums[premiums.length - 1].toFixed(2)}`,
);

// 厨房 vs 田地吞吐：单厨房每秒消耗食材 vs N 块田每秒产出作物
console.log('\n-- 厨房 vs 田地吞吐（食材 个/小时）--');
for (const fields of [4, 10, 19]) {
  // 各 tier 代表作物（取该 tier 周期最短者，产出最快的情形）
  for (const tier of [1, 2, 3, 4]) {
    const reps = data.crops.filter((c) => c.tier === tier);
    const fastest = reps.reduce((a, b) => (a.growTime < b.growTime ? a : b));
    const fieldOut = (fields / fastest.growTime) * 3600;
    // 厨房：该 tier 单食材菜烹饪时长
    const cookSec = data.config.cookTimeByTier[String(tier)] ?? 20;
    const kitchenIn = 3600 / cookSec; // 单食材菜 = 每秒消化 1 个食材
    console.log(
      `  ${String(fields).padStart(2)} 块田 T${tier}（${fastest.name} ${fastest.growTime}s）：田产 ${fieldOut.toFixed(0)}/h，厨房消化上限 ${kitchenIn.toFixed(0)}/h → ${fieldOut > kitchenIn ? '田堵厨' : '厨堵田'}`,
    );
  }
}

// ============================================================
// 第二部分：bot 多天经营仿真
// ============================================================
const DAY = 24 * 3600;
const SESSION_HOURS = [8, 12, 18, 22]; // 每天 4 次上线
const COOKS_PER_SESSION = 3;
const DAYS = 30;

interface BotResult {
  name: string;
  finalGold: number;
  finalXp: number;
  finalLevel: number;
  levelDay: Record<number, number>; // 首次达到该等级的天数
  upgradeLog: string[];
  goldFromDishes: number;
  goldFromCrops: number;
  fertSpent: number;
  goldCurve: number[]; // 每日结束金币
}

function runBot(name: string, opts: { cook: boolean; fertilize: boolean }): BotResult {
  let now = Date.parse('2026-08-01T08:00:00+08:00');
  const nowFn = () => now;
  const game = new GameCore(data, undefined, nowFn);
  const res: BotResult = {
    name,
    finalGold: 0,
    finalXp: 0,
    finalLevel: 1,
    levelDay: {},
    upgradeLog: [],
    goldFromDishes: 0,
    goldFromCrops: 0,
    fertSpent: 0,
    goldCurve: [],
  };
  const SEED_RESERVE = 50;

  const gapToNextSession = (dayIdx: number, sessIdx: number): number => {
    if (sessIdx < SESSION_HOURS.length - 1) return (SESSION_HOURS[sessIdx + 1] - SESSION_HOURS[sessIdx]) * 3600;
    return (24 - SESSION_HOURS[sessIdx] + SESSION_HOURS[0]) * 3600; // 隔夜
  };

  const bestCook = (): Record<string, number> | null => {
    if (!opts.cook) return null;
    const inv = game.getSave().inventory.crops;
    let best: RecipeDef | null = null;
    let bestScore = 0;
    for (const r of data.recipes) {
      if (r.id === data.fallbackRecipeId) continue;
      const total = Object.values(r.ingredients).reduce((a, b) => a + b, 0);
      if (total > game.maxComboSlots) continue;
      if (!Object.entries(r.ingredients).every(([id, n]) => (inv[id] ?? 0) >= n)) continue;
      const t = (data.config.cookTimeByTier[String(r.tier)] ?? 20) + data.config.cookTimePerExtraIngredient * (total - 1);
      // 得分 = 每厨房秒净利润；未发现的食谱额外加权（探索价值）
      const profit = r.sellPrice - ingCost(r);
      const score = (profit / t) * (game.getSave().discoveredRecipes.includes(r.id) ? 1 : 1.5);
      if (score > bestScore) {
        bestScore = score;
        best = r;
      }
    }
    return best ? { ...best.ingredients } : null;
  };

  const doSession = (dayIdx: number, sessIdx: number) => {
    game.settleOffline(); // 离线封顶结算
    if (sessIdx === 0) game.claimDailyReward();
    game.drainXpEvents(); // bot 不消费事件，丢弃

    // 1. 收获全部成熟地块
    for (let i = 0; i < game.getSave().fields.length; i++) game.harvest(i);

    // 2. 做菜：最多 COOKS_PER_SESSION 锅，下锅后等出锅（玩家在线等待）
    for (let c = 0; c < COOKS_PER_SESSION; c++) {
      if (game.getSave().cooking) {
        const wait = game.getSave().cooking!.readyAt - now;
        if (wait > 0) now += wait;
        game.collectDish();
      }
      const combo = bestCook();
      if (!combo) break;
      const r = game.startCook(combo);
      const wait = game.getSave().cooking!.readyAt - now;
      if (wait > 0 && wait <= 180_000) now += wait; // 最多等 3 分钟
      game.collectDish();
      void r;
    }

    // 3. 卖出：菜品全卖；作物留存厨房口粮（每样 3 锅 × 3 槽 = 9 个），余量直卖
    const inv = game.getSave().inventory;
    for (const [id, n] of Object.entries(inv.dishes)) {
      if (n > 0) res.goldFromDishes += game.sellDish(id, n);
    }
    for (const [id, n] of Object.entries(inv.crops)) {
      const surplus = n - (opts.cook ? 9 : 0);
      if (surplus > 0) res.goldFromCrops += game.sellCrop(id, surplus);
    }

    // 4. 化肥催熟（水槽测量）：已购便利线化肥且金币 > 5 倍成本时，催熟未成熟地块中 tier 最高者
    if (opts.fertilize && game.hasConvenienceEffect('fertilize')) {
      const cost = data.config.fertilizeCost;
      let bestField = -1;
      let bestTier = 0;
      game.getSave().fields.forEach((f, i) => {
        if (f && game.growthProgress(i) < 1 && cropOf(f.cropId).tier > bestTier) {
          bestTier = cropOf(f.cropId).tier;
          bestField = i;
        }
      });
      if (bestField >= 0 && game.gold > cost * 5) {
        game.fertilize(bestField);
        res.fertSpent += cost;
        game.harvest(bestField);
      }
    }

    // 5. 买升级：便宜优先，保持 SEED_RESERVE 种子准备金
    for (;;) {
      const infos = game.listUpgrades().filter((u) => u.next && game.gold - u.next.cost >= SEED_RESERVE);
      if (infos.length === 0) break;
      infos.sort((a, b) => a.next!.cost - b.next!.cost);
      const target = infos[0];
      try {
        const bought = game.buyUpgrade(target.line);
        res.upgradeLog.push(`D${dayIdx + 1} ${target.line} Lv${bought.level}（-${bought.cost}）`);
      } catch {
        break; // 等级门控未达标，等下级
      }
    }

    // 6. 播种空地：选「下次上线前能熟」的时薪最高作物；都不行就选已解锁时薪最高者
    const gap = gapToNextSession(dayIdx, sessIdx);
    const seeds = game.listSeeds();
    const hourly = (c: { id: string }) => {
      const cd = cropOf(c.id);
      return (cd.sellPrice - cd.seedPrice) / cd.growTime;
    };
    const fits = seeds.filter((s) => cropOf(s.id).growTime <= gap);
    const pickFrom = fits.length > 0 ? fits : seeds;
    const pick = pickFrom.reduce((a, b) => (hourly(a) > hourly(b) ? a : b), pickFrom[0]);
    for (let i = 0; i < game.getSave().fields.length; i++) {
      if (game.getSave().fields[i]) continue;
      try {
        game.plant(i, pick.id);
      } catch {
        /* 金币不足，留空 */
      }
    }

    // 记录等级首达天数
    const lv = game.level;
    for (let l = 2; l <= lv; l++) if (!(l in res.levelDay)) res.levelDay[l] = dayIdx + 1;
  };

  for (let d = 0; d < DAYS; d++) {
    for (let s = 0; s < SESSION_HOURS.length; s++) {
      const target = Date.parse('2026-08-01T00:00:00+08:00') + d * DAY * 1000 + SESSION_HOURS[s] * 3600 * 1000;
      if (target > now) now = target;
      doSession(d, s);
    }
    res.goldCurve.push(game.gold);
  }

  res.finalGold = game.gold;
  res.finalXp = game.xp;
  res.finalLevel = game.level;
  return res;
}

const bots = [
  runBot('策略A·直卖流（不做菜）', { cook: false, fertilize: false }),
  runBot('策略B·做菜流（厨房优先）', { cook: true, fertilize: false }),
  runBot('策略C·做菜+化肥（重水槽）', { cook: true, fertilize: true }),
];

console.log('\n================ bot 仿真（每天 4 次上线 × 30 天）================');
for (const b of bots) {
  console.log(`\n== ${b.name} ==`);
  const lvStr = [2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => `Lv${l}:D${b.levelDay[l] ?? '>30'}`).join(' ');
  console.log(`  30 天后：金币 ${b.finalGold}，经验 ${b.finalXp}（Lv${b.finalLevel}）`);
  console.log(`  升级节奏：${lvStr}`);
  console.log(`  收入来源：菜品 ${b.goldFromDishes} / 作物直卖 ${b.goldFromCrops}`);
  if (b.fertSpent > 0) console.log(`  化肥总消耗：${b.fertSpent} 金`);
  console.log(`  升级购买：${b.upgradeLog.join('，') || '无'}`);
  console.log(`  金币曲线（每 5 天）：${b.goldCurve.filter((_, i) => i % 5 === 4 || i === 0).join(' → ')}`);
}

console.log('\n== 直卖 vs 做菜对比（悬案数据）==');
const [a, b] = bots;
console.log(`  30 天总收入比（做菜流/直卖流）：菜品+作物 ${(b.goldFromDishes + b.goldFromCrops) / Math.max(1, a.goldFromCrops)} 倍`);
console.log(`  做菜流收入结构：做菜占 ${((b.goldFromDishes / Math.max(1, b.goldFromDishes + b.goldFromCrops)) * 100).toFixed(0)}%，直卖仍占 ${((b.goldFromCrops / Math.max(1, b.goldFromDishes + b.goldFromCrops)) * 100).toFixed(0)}%`);
console.log('\n✅ 数值仿真完成');
