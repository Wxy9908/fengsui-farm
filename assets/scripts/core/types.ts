/**
 * 数据表与存档的类型定义。
 * 原则：配置表只读（策划案），存档是运行时状态，两者严格分离。
 * 字段含义见 docs/数据表设计.md。
 */

export interface CropUnlockDefault {
  type: 'default';
}

export interface CropUnlockUpgrade {
  type: 'upgrade';
  line: string;
  level: number;
}

/** M3-① 等级门控：农场等级 ≥ level 才可购买 */
export interface CropUnlockLevel {
  type: 'level';
  level: number;
}

export interface CropDef {
  id: string;
  name: string;
  tier: number;
  seedPrice: number;
  sellPrice: number;
  /** 生长时长（秒） */
  growTime: number;
  unlock: CropUnlockDefault | CropUnlockUpgrade | CropUnlockLevel;
  desc: string;
}

export interface RecipeDef {
  id: string;
  name: string;
  /** {作物id: 数量}，多重集合 */
  ingredients: Record<string, number>;
  sellPrice: number;
  /** 烹饪时长：由 config.cookTimeByTier 阶梯 + 食材数加成派生，不逐条填写 */
  tier: number;
  desc: string;
}

export type UpgradeEffectType =
  | 'fieldSlots' // 田地：已解锁地块总数（19 坑位网格中按中心向外解锁）
  | 'cookTimeMult' // 厨房：烹饪时间倍率
  | 'sellPriceMult' // 店铺：售价倍率
  | 'none' // 便利线 Lv1 占位（无效果）
  | 'fertilize' // 便利：解锁化肥催熟（金币换时间）
  | 'harvestAll' // 便利：一键收获全部成熟作物
  | 'autoReplant' // 便利：收获后自动重播上次作物
  | 'offlineCapBonus' // 便利：离线收益上限 +N 小时
  | 'comboSlotBonus'; // 便利：厨房组合槽 +N

export interface UpgradeDef {
  line: string;
  level: number;
  effect: { type: UpgradeEffectType; value: number };
  cost: number;
  desc?: string;
}

export interface GameConfig {
  startGold: number;
  maxComboSlots: number;
  offlineCapHours: number;
  dailyRewardGold: number;
  debugTimeScale: number;
  /** 烹饪时长阶梯（秒）：按食谱 tier 查表 */
  cookTimeByTier: Record<string, number>;
  /** 每多一样食材加成的烹饪秒数（食材总数 -1 计） */
  cookTimePerExtraIngredient: number;
  /** 黑暗料理回血比例（新手保护期内的失败安慰） */
  darkCuisineRefundRate: number;
  /** 新手保护门槛：图鉴发现数超过该值后，黑暗料理不再回血 */
  darkCuisineRefundUntilDiscovered: number;
  /** 化肥催熟单价（金币/次）：固定价，调平衡只改这里 */
  fertilizeCost: number;
  /** 今日特价售价倍率：当日特价菜品卖出价 × 该值（>1 为收购价上浮，利好玩家） */
  dailySpecialMult: number;
  /** 卖菜经验封顶：单次卖出获得经验不超过该值 */
  sellDishXpCap: number;
}

/** 农场等级表条目（data/levels.json）：xp 为累计经验，unlocks 为字符串门控清单 */
export interface LevelDef {
  level: number;
  xp: number;
  rewardGold: number;
  unlocks: string[];
}

/** 收集里程碑条目（data/milestones.json）：图鉴发现数达到 threshold 即发 reward 金币（一次性） */
export interface MilestoneDef {
  id: string;
  /** recipe = 食谱发现数（不含黑暗料理）；crop = 作物点亮数 */
  type: 'recipe' | 'crop';
  threshold: number;
  reward: number;
  /** 展示名（如「食谱 x15」），弹层文案直接拼用 */
  name: string;
}

export interface DataTables {
  crops: CropDef[];
  recipes: RecipeDef[];
  fallbackRecipeId: string;
  upgrades: UpgradeDef[];
  levels: LevelDef[];
  config: GameConfig;
  milestones: MilestoneDef[];
}

// ---------- 存档（运行时状态） ----------

export interface FieldState {
  cropId: string;
  /** Unix 毫秒时间戳 */
  plantedAt: number;
}

export interface CookingState {
  dishId: string;
  /** Unix 毫秒时间戳，到点可收取 */
  readyAt: number;
  /** 本次烹饪的食材成本（按作物直接售价计），黑暗料理回血用 */
  invest: number;
  /** 开始烹饪时该食谱是否已发现过（重复做菜安慰经验用；旧存档缺省视为不加经验） */
  wasKnown?: boolean;
}

export interface SaveData {
  gold: number;
  /** 累计经验（M3-①）；等级为按 levels.json 查表得到的派生值，不单独存 */
  xp: number;
  inventory: {
    crops: Record<string, number>;
    dishes: Record<string, number>;
  };
  fields: (FieldState | null)[];
  cooking: CookingState | null;
  discoveredRecipes: string[];
  /** 已收获过的作物 id（作物图鉴点亮依据，首次收获时记录） */
  seenCrops: string[];
  upgrades: Record<string, number>;
  lastOnlineAt: number;
  /** 上次领取每日奖励的日期（YYYY-MM-DD），null 表示从未领取 */
  lastDailyRewardDate: string | null;
  /** 已领取的收集里程碑 id（M4 留存钩子；旧存档缺省 = []，构造时按当前图鉴进度一次性补发） */
  claimedMilestones: string[];
  stats: {
    totalGoldEarned: number;
    recipesDiscovered: number;
  };
}
