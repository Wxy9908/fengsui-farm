/**
 * 游戏核心逻辑。纯 TypeScript，不依赖 Cocos 引擎，可在 Node 下直接仿真验证。
 * 数值全部来自数据表（DataTables），调平衡只改 data/ 下的 JSON。
 */

import {
  CropDef,
  DataTables,
  MilestoneDef,
  OrderDef,
  RecipeDef,
  SaveData,
  StoryDef,
  UpgradeDef,
  UpgradeEffectType,
} from './types';

export interface CookResult {
  recipe: RecipeDef;
  /** 下锅时该食谱是否尚未发现（仅供 UI 决定文案悬念，点亮图鉴以出锅为准） */
  isNew: boolean;
}

/** 经验/升级事件（drainXpEvents 队列元素） */
export type XpEvent =
  | { type: 'xp'; amount: number; source: string }
  | { type: 'levelup'; level: number; rewardGold: number; unlocks: string[] };

/** 种子列表项（listAllSeeds，含锁定态，UI 用） */
export interface SeedEntry {
  crop: CropDef;
  unlocked: boolean;
  /** 解锁所需农场等级；未出现在 levels 表中的默认种子为 null（视为 L1 默认解锁） */
  requiredLevel: number | null;
}

/** 出锅结果：菜品 + 黑暗料理回血金币（新手保护）+ 是否首次发现该食谱（出锅时才点亮图鉴） */
export interface CollectResult {
  dishId: string;
  /** 黑暗料理且处于新手保护期时返还的金币，否则为 0 */
  refund: number;
  /** 是否首次发现该食谱：出锅瞬间才揭晓/点亮，烹饪期间保持悬念 */
  isNew: boolean;
}

/** 求购单展示态（订单页 UI） */
export interface OrderView {
  id: string;
  npcId: string;
  npcName: string;
  npcTitle: string;
  kind: 'dish' | 'crop';
  itemId: string;
  itemName: string;
  qty: number;
  /** ready=可交 lack=缺货 locked=菜品未发现 */
  state: 'ready' | 'lack' | 'locked';
  pay: number;
  premium: number;
  affinity: number;
  have: number;
}

/** 升级线状态（UI 展示用） */
export interface UpgradeInfo {
  line: string;
  /** 当前等级 */
  level: number;
  /** 当前等级的描述 */
  desc: string;
  /** 下一级定义；满级为 null */
  next: UpgradeDef | null;
}

const DAY_MS = 24 * 3600 * 1000;

export class GameCore {
  private save: SaveData;
  /** 待 UI 消费的经验/升级事件队列（drainXpEvents 取走即清空） */
  private xpEvents: XpEvent[] = [];
  /** 待 UI 消费的里程碑达成事件队列（drainMilestones 取走即清空） */
  private milestoneEvents: MilestoneDef[] = [];

  constructor(
    private data: DataTables,
    save?: SaveData,
    /** 时间源注入，测试/仿真时可替换 */
    private nowFn: () => number = () => Date.now(),
  ) {
    this.save = save ?? this.newSave();
    this.save.seenCrops ??= []; // 旧存档迁移：作物图鉴字段后补
    this.save.xp ??= 0; // 旧存档迁移：M3-① 经验字段后补
    this.save.claimedMilestones ??= []; // 旧存档迁移：M4 收集里程碑字段后补
    this.save.affinity ??= {};
    this.save.orderDate ??= '';
    this.save.orderIds ??= [];
    this.save.orderDone ??= [];
    // 旧存档没有引导字段：视为序章和全部教学已读，避免老玩家重看
    const legacyTutorials = save !== undefined && save.readTutorials === undefined;
    this.save.readTutorials ??= [];
    this.save.prologueSeen ??= false;
    if (legacyTutorials) {
      this.save.prologueSeen = true;
      for (const s of this.data.stories ?? []) {
        if (s.type !== 'tutorial') continue;
        if (!this.save.readTutorials.includes(s.id)) this.save.readTutorials.push(s.id);
      }
    }
    this.save.readAffinityStories ??= [];
    // 旧存档迁移：后加的升级线（如便利线）缺省 = Lv1 初始级（Lv1 无解锁门控，缺省会永远锁死）
    for (const line of this.upgradeLines()) this.save.upgrades[line] ??= 1;
    // 数据腐蚀自愈：金币非有限数（如 NaN 被 JSON 存成 null）时重置为初始金，避免脏值无限传播
    if (!Number.isFinite(this.save.gold)) this.save.gold = this.data.config.startGold;
    // 清理降级编译 bug 污染的存档键（[...new Set] 曾被编成 [].concat(set)，升级线名变成 "[object Set]"）
    delete this.save.upgrades['[object Set]'];
    this.settleOffline();
    // 旧存档补发：已超门槛的里程碑在上线时一次性发放（事件入队，UI 逐个弹层）
    this.checkMilestones();
  }

  // ---------- 存档 ----------

  private newSave(): SaveData {
    const cfg = this.data.config;
    const upgrades: Record<string, number> = {};
    for (const line of this.upgradeLines()) upgrades[line] = 1;
    // 注意：此处不能调 effectValue()，它依赖尚未赋值的 this.save
    const initialSlots =
      this.data.upgrades.find((u) => u.effect.type === 'fieldSlots' && u.level === 1)?.effect.value ?? 4;
    return {
      gold: cfg.startGold,
      xp: 0,
      inventory: { crops: {}, dishes: {} },
      fields: new Array(initialSlots).fill(null),
      cooking: null,
      discoveredRecipes: [],
      seenCrops: [],
      upgrades,
      lastOnlineAt: this.nowFn(),
      lastDailyRewardDate: null,
      claimedMilestones: [],
      affinity: {},
      orderDate: '',
      orderIds: [],
      orderDone: [],
      readTutorials: [],
      readAffinityStories: [],
      prologueSeen: false,
      stats: { totalGoldEarned: 0, recipesDiscovered: 0 },
    };
  }

  prologuePending(): boolean {
    return !this.save.prologueSeen && (this.data.prologue?.length ?? 0) > 0;
  }

  prologueLines(): { speaker: string; text: string }[] {
    return (this.data.prologue ?? []).map((l) => ({ speaker: l.speaker, text: l.text }));
  }

  finishPrologue(): void {
    this.save.prologueSeen = true;
  }

  /** 该地点、该触发下第一条未读引导；没有则 null */
  pendingTutorial(place: string, trigger: string) {
    return (
      (this.data.stories ?? []).find(
        (s) => s.type === 'tutorial' && s.place === place && s.trigger === trigger && !this.save.readTutorials.includes(s.id),
      ) ?? null
    );
  }

  completeTutorial(id: string): void {
    if (!this.save.readTutorials.includes(id)) this.save.readTutorials.push(id);
  }

  /**
   * 好感薄剧情：按 stories 数组顺序取第一条满足条件的未读节点。
   * onOrderDeliver 须传入刚交付订单的 npcId。
   */
  pendingAffinity(place: string, trigger: string, orderNpcId?: string): StoryDef | null {
    for (const s of this.data.stories ?? []) {
      if (s.type !== 'affinity') continue;
      if (s.place !== place || s.trigger !== trigger) continue;
      if (!s.npcId || s.minAffinity === undefined) continue;
      if (this.save.readAffinityStories.includes(s.id)) continue;
      if (this.affinityOf(s.npcId) < s.minAffinity) continue;
      if (trigger === 'onOrderDeliver' && orderNpcId !== s.npcId) continue;
      return s;
    }
    return null;
  }

  completeAffinityStory(id: string): void {
    if (!this.save.readAffinityStories.includes(id)) this.save.readAffinityStories.push(id);
  }

  isDarkDish(id: string): boolean {
    return id === this.data.fallbackRecipeId;
  }

  getSave(): SaveData {
    this.save.lastOnlineAt = this.nowFn();
    return JSON.parse(JSON.stringify(this.save));
  }

  // ---------- 查表辅助 ----------

  private crop(id: string): CropDef {
    const c = this.data.crops.find((c) => c.id === id);
    if (!c) throw new Error(`未知作物: ${id}`);
    return c;
  }

  private recipe(id: string): RecipeDef {
    const r = this.data.recipes.find((r) => r.id === id);
    if (!r) throw new Error(`未知食谱: ${id}`);
    return r;
  }

  /** 供 UI 查食谱定义（出锅庆祝层取 ingredients/desc 用） */
  recipeOf(id: string): RecipeDef {
    return this.recipe(id);
  }

  private upgradeLines(): string[] {
    // 注意：不能写 [...new Set(...)]——构建降级编译（downlevelIteration 关闭）会把 Set 展开编成 [].concat(set)，
    // 把整个 Set 当成一个元素（商店升级卡曾因此显示「[object Set]」）。Array.from 编译产物安全。
    return Array.from(new Set(this.data.upgrades.map((u) => u.line)));
  }

  private upgradeDef(line: string, level: number): UpgradeDef | undefined {
    return this.data.upgrades.find((u) => u.line === line && u.level === level);
  }

  /** 当前升级线下某效果的取值；无匹配效果时返回 fallback（effectValue 等价于 fallback=1） */
  private effectValueOr(type: UpgradeEffectType, fallback: number): number {
    for (const line of this.upgradeLines()) {
      const def = this.upgradeDef(line, this.save.upgrades[line]);
      if (def && def.effect.type === type) return def.effect.value;
    }
    return fallback;
  }

  /** 当前升级线下某效果的取值（绝对值/总倍率，不累加） */
  private effectValue(type: UpgradeEffectType): number {
    return this.effectValueOr(type, 1);
  }

  /** 便利线效果累计：逐级是不同功能，扫描 1~当前等级，把同类型效果的 value 累加（未购得为 0） */
  private convenienceBonus(type: UpgradeEffectType): number {
    const cur = this.save.upgrades['convenience'] ?? 0;
    let sum = 0;
    for (let l = 1; l <= cur; l++) {
      const def = this.upgradeDef('convenience', l);
      if (def && def.effect.type === type) sum += def.effect.value;
    }
    return sum;
  }

  /** 便利线某功能是否已购得（≤ 当前等级任一级提供该效果） */
  private hasConvenience(type: UpgradeEffectType): boolean {
    return this.convenienceBonus(type) > 0;
  }

  /** 供 UI 查询便利线功能是否已解锁（肥钮/一键收获胶囊的显示条件） */
  hasConvenienceEffect(type: UpgradeEffectType): boolean {
    return this.hasConvenience(type);
  }

  get gold(): number {
    return this.save.gold;
  }

  get fieldSlots(): number {
    return this.effectValue('fieldSlots');
  }

  get maxComboSlots(): number {
    return this.data.config.maxComboSlots + this.convenienceBonus('comboSlotBonus');
  }

  /** 食谱总数（图鉴进度用，含黑暗料理） */
  get recipeCount(): number {
    return this.data.recipes.length;
  }

  /** 显示名查询（UI 用） */
  cropName(id: string): string {
    return this.crop(id).name;
  }

  dishName(id: string): string {
    return this.recipe(id).name;
  }

  // ---------- 种植 / 收获 ----------

  /** 当前可购买的种子（解锁条件已满足的作物） */
  listSeeds(): CropDef[] {
    return this.data.crops.filter((c) => {
      if (c.unlock.type === 'default') return true;
      if (c.unlock.type === 'level') return this.level >= c.unlock.level;
      // upgrade 型保留兼容（数据表设计 §2）
      return (this.save.upgrades[c.unlock.line] ?? 0) >= c.unlock.level;
    });
  }

  /** 全部种子 + 解锁态（种子列表 UI 用：未解锁项显示锁态与所需等级） */
  listAllSeeds(): SeedEntry[] {
    const unlockedIds = new Set(this.listSeeds().map((c) => c.id));
    return this.data.crops.map((crop) => ({
      crop,
      unlocked: unlockedIds.has(crop.id),
      requiredLevel: this.unlockLevelOf(`seed:${crop.id}`),
    }));
  }

  // ---------- 农场等级（M3-①：等级给资格、金币做支付） ----------

  /** 累计经验 */
  get xp(): number {
    return this.save.xp;
  }

  /** 当前农场等级（派生值：按 levels 表累计经验区间查表，满级封顶） */
  get level(): number {
    let lv = this.data.levels[0]?.level ?? 1;
    for (const l of this.data.levels) {
      if (this.save.xp >= l.xp) lv = l.level;
      else break;
    }
    return lv;
  }

  /** 顶栏进度信息：当前级经验区间与 0~1 进度（满级 nextLevelXp 为 null、progress 为 1） */
  levelInfo(): { level: number; xp: number; curLevelXp: number; nextLevelXp: number | null; progress: number } {
    const level = this.level;
    const cur = this.data.levels.find((l) => l.level === level);
    const next = this.data.levels.find((l) => l.level === level + 1) ?? null;
    const curLevelXp = cur?.xp ?? 0;
    const progress = next ? Math.min(1, (this.save.xp - curLevelXp) / (next.xp - curLevelXp)) : 1;
    return { level, xp: this.save.xp, curLevelXp, nextLevelXp: next?.xp ?? null, progress };
  }

  /** 加经验：检测跨级（可连升多级），每级发 rewardGold 入金币并把事件推入队列 */
  private gainXp(amount: number, source: string): void {
    if (amount <= 0) return;
    const before = this.level;
    this.save.xp += amount;
    this.xpEvents.push({ type: 'xp', amount, source });
    const after = this.level;
    for (let l = before + 1; l <= after; l++) {
      const def = this.data.levels.find((d) => d.level === l);
      const rewardGold = def?.rewardGold ?? 0;
      this.save.gold += rewardGold;
      this.xpEvents.push({ type: 'levelup', level: l, rewardGold, unlocks: def?.unlocks ?? [] });
    }
  }

  /** 取走并清空经验/升级事件队列（UI 每次 refreshUI 时调用） */
  drainXpEvents(): XpEvent[] {
    const ev = this.xpEvents;
    this.xpEvents = [];
    return ev;
  }

  // ---------- 收集里程碑（M4 留存钩子） ----------

  /** 某类里程碑的当前进度：recipe = 已发现食谱数（不含黑暗料理）；crop = 作物点亮数 */
  private milestoneProgress(type: MilestoneDef['type']): number {
    if (type === 'recipe') return this.save.discoveredRecipes.filter((id) => id !== this.data.fallbackRecipeId).length;
    return this.save.seenCrops.length;
  }

  /**
   * 检查并发放已达成的里程碑：达成即自动发金币、记入 claimedMilestones（不重复发放），
   * 事件入队供 UI 弹层。在收获点亮作物 / 发现新食谱 / 出锅后调用；返回本次新达成的列表。
   */
  checkMilestones(): MilestoneDef[] {
    const hit: MilestoneDef[] = [];
    for (const m of this.data.milestones) {
      if (this.save.claimedMilestones.includes(m.id)) continue;
      if (this.milestoneProgress(m.type) < m.threshold) continue;
      this.save.claimedMilestones.push(m.id);
      this.save.gold += m.reward;
      this.milestoneEvents.push(m);
      hit.push(m);
    }
    return hit;
  }

  /** 取走并清空里程碑达成事件队列（UI 每次 refreshUI 时调用，逐个弹庆祝层） */
  drainMilestones(): MilestoneDef[] {
    const ev = this.milestoneEvents;
    this.milestoneEvents = [];
    return ev;
  }

  /** 某类里程碑的下一个未达目标（弹层「下一个：…」用）；全部达成返回 null */
  nextMilestoneOf(type: MilestoneDef['type']): MilestoneDef | null {
    const progress = this.milestoneProgress(type);
    return (
      this.data.milestones
        .filter((m) => m.type === type && m.threshold > progress)
        .sort((a, b) => a.threshold - b.threshold)[0] ?? null
    );
  }

  /** 门控查询：key 格式 seed:xxx / upg:line:level，按 ≤ 当前等级的 unlocks 并集判定 */
  isUnlocked(key: string): boolean {
    return this.data.levels.some((l) => l.level <= this.level && l.unlocks.includes(key));
  }

  /** key 在 levels 表中首次出现的等级；未出现返回 null（视为默认开放） */
  unlockLevelOf(key: string): number | null {
    return this.data.levels.find((l) => l.unlocks.includes(key))?.level ?? null;
  }

  /** 升级线显示名 */
  private static readonly LINE_NAMES: Record<string, string> = {
    field: '田地',
    kitchen: '厨房',
    shop: '店铺',
    convenience: '便利',
  };

  /** 门控 key 人类化：seed:corn→"玉米种子"、upg:field:2→"田地 Lv2 购买资格" */
  unlockText(key: string): string {
    const parts = key.split(':');
    if (parts[0] === 'seed') {
      const c = this.data.crops.find((c) => c.id === parts[1]);
      return `${c?.name ?? parts[1]}种子`;
    }
    if (parts[0] === 'upg') {
      const name = GameCore.LINE_NAMES[parts[1]] ?? parts[1];
      return `${name} Lv${parts[2]} 购买资格`;
    }
    return key;
  }

  /** 下一级预告（升级弹窗用）；满级返回 null */
  nextLevelPreview(): { level: number; unlocks: string[]; rewardGold: number } | null {
    const next = this.data.levels.find((l) => l.level === this.level + 1);
    return next ? { level: next.level, unlocks: next.unlocks, rewardGold: next.rewardGold } : null;
  }

  /** 生长进度 0~1；debugTimeScale 参与加速（数据表设计 §6） */
  growthProgress(fieldIndex: number): number {
    const f = this.save.fields[fieldIndex];
    if (!f) return 0;
    const needMs = this.crop(f.cropId).growTime * 1000;
    const elapsed = (this.nowFn() - f.plantedAt) * this.data.config.debugTimeScale;
    return Math.min(1, elapsed / needMs);
  }

  plant(fieldIndex: number, cropId: string): void {
    if (fieldIndex < 0 || fieldIndex >= this.save.fields.length) throw new Error('地块不存在');
    if (this.save.fields[fieldIndex]) throw new Error('地块已被占用');
    const c = this.crop(cropId);
    if (!this.listSeeds().some((s) => s.id === cropId)) throw new Error('该种子尚未解锁');
    if (this.save.gold < c.seedPrice) throw new Error('金币不足');
    this.save.gold -= c.seedPrice;
    this.save.fields[fieldIndex] = { cropId, plantedAt: this.nowFn() };
  }

  /** 成熟则收获入库存并返回作物 id，否则返回 null。拥有自动重播升级时收获后自动重播同种作物（种子费从金币扣，与手动种植等价；金币不足则只收获不重播） */
  harvest(fieldIndex: number): string | null {
    const f = this.save.fields[fieldIndex];
    if (!f || this.growthProgress(fieldIndex) < 1) return null;
    this.save.fields[fieldIndex] = null;
    const inv = this.save.inventory.crops;
    inv[f.cropId] = (inv[f.cropId] ?? 0) + 1;
    if (!this.save.seenCrops.includes(f.cropId)) this.save.seenCrops.push(f.cropId); // 作物图鉴点亮
    this.gainXp(5 * this.crop(f.cropId).tier, '收获');
    this.checkMilestones(); // 作物点亮可能达成里程碑
    this.autoReplant(fieldIndex, f.cropId);
    return f.cropId;
  }

  /** 自动重播（便利线 Lv3）：扣种子费在同地块重播同种作物；未购升级/未解锁/金币不足则不动，返回是否重播成功 */
  private autoReplant(fieldIndex: number, cropId: string): boolean {
    if (!this.hasConvenience('autoReplant')) return false;
    try {
      this.plant(fieldIndex, cropId);
      return true;
    } catch {
      return false; // 金币不足或种子未解锁：只收获不重播
    }
  }

  /** 一键收获（便利线 Lv3）：收获全部成熟地块，返回明细（含是否已自动重播）。未购买该升级抛错 */
  harvestAll(): { fieldIndex: number; cropId: string; replanted: boolean }[] {
    if (!this.hasConvenience('harvestAll')) throw new Error('尚未购买「一键收获」升级');
    const out: { fieldIndex: number; cropId: string; replanted: boolean }[] = [];
    for (let i = 0; i < this.save.fields.length; i++) {
      const cropId = this.harvest(i);
      if (cropId) out.push({ fieldIndex: i, cropId, replanted: this.save.fields[i] !== null });
    }
    return out;
  }

  /** 化肥催熟：花 config.fertilizeCost 金币让该地块立即成熟。未购便利线化肥/空地/已成熟抛错 */
  fertilize(fieldIndex: number): void {
    if (!this.hasConvenience('fertilize')) throw new Error('尚未购买「化肥催熟」升级');
    const f = this.save.fields[fieldIndex];
    if (!f) throw new Error('空地不能施肥');
    if (this.growthProgress(fieldIndex) >= 1) throw new Error('作物已成熟，无需催熟');
    const cost = this.data.config.fertilizeCost;
    if (!Number.isFinite(cost)) throw new Error('配置缺失：fertilizeCost（请运行 npm run sync-data）');
    if (this.save.gold < cost) throw new Error('金币不足');
    this.save.gold -= cost;
    const needMs = this.crop(f.cropId).growTime * 1000;
    f.plantedAt = this.nowFn() - needMs / this.data.config.debugTimeScale;
  }

  // ---------- 厨房：自由组合 + 食谱发现 ----------

  /**
   * 组合解析：与每条食谱的 ingredients 做完全匹配（种类和数量都相等），
   * 未命中则返回兜底项黑暗料理。
   */
  resolveCombo(selected: Record<string, number>): RecipeDef {
    const keys = (o: Record<string, number>) => Object.keys(o).filter((k) => o[k] > 0).sort();
    const sk = keys(selected);
    for (const r of this.data.recipes) {
      if (r.id === this.data.fallbackRecipeId) continue;
      const rk = keys(r.ingredients);
      if (rk.length === sk.length && rk.every((k, i) => k === sk[i] && r.ingredients[k] === selected[k])) {
        return r;
      }
    }
    return this.recipe(this.data.fallbackRecipeId);
  }

  /** 开始烹饪：扣除食材，到 readyAt 后可收取。发现食谱不在这里揭晓——出锅（collectDish）时才点亮图鉴/发经验 */
  startCook(selected: Record<string, number>): CookResult {
    if (this.save.cooking) throw new Error('厨房正在烹饪中');
    const total = Object.values(selected).reduce((a, b) => a + b, 0);
    if (total < 1 || total > this.maxComboSlots) {
      throw new Error(`食材数量需在 1~${this.maxComboSlots} 之间`);
    }
    const inv = this.save.inventory.crops;
    for (const [id, n] of Object.entries(selected)) {
      if ((inv[id] ?? 0) < n) throw new Error(`食材不足: ${id}`);
    }
    const recipe = this.resolveCombo(selected);
    let invest = 0;
    for (const [id, n] of Object.entries(selected)) {
      invest += this.crop(id).sellPrice * n;
      inv[id] -= n;
    }

    const wasKnown = this.save.discoveredRecipes.includes(recipe.id);
    const cookMs = (this.cookTimeSec(recipe, total) * 1000 * this.effectValue('cookTimeMult')) / this.data.config.debugTimeScale;
    this.save.cooking = { dishId: recipe.id, readyAt: this.nowFn() + cookMs, invest, wasKnown };
    return { recipe, isNew: !wasKnown };
  }

  /** 烹饪时长（秒）：tier 阶梯 + 每多一样食材加成；黑暗料理固定 5 秒 */
  private cookTimeSec(recipe: RecipeDef, ingredientCount: number): number {
    if (recipe.id === this.data.fallbackRecipeId) return 5;
    const base = this.data.config.cookTimeByTier[String(recipe.tier)] ?? 20;
    return base + this.data.config.cookTimePerExtraIngredient * (ingredientCount - 1);
  }

  /**
   * 烹饪完成则收取菜品，否则返回 null。
   * 黑暗料理且处于新手保护期（图鉴发现数 ≤ 门槛）时，按食材成本比例回血——
   * 失败安慰机制：前期每次失败都回血，毕业后（发现数超门槛）风险自担。
   */
  collectDish(): CollectResult | null {
    const c = this.save.cooking;
    if (!c || this.nowFn() < c.readyAt) return null;
    this.save.cooking = null;
    const inv = this.save.inventory.dishes;
    inv[c.dishId] = (inv[c.dishId] ?? 0) + 1;
    let refund = 0;
    // 发现新食谱：出锅瞬间才揭晓——点亮图鉴 +50 经验，烹饪期间保持悬念
    // （先于回血判定点亮，保持与旧口径一致：黑暗料理自身计入发现数）
    let isNew = false;
    if (!this.save.discoveredRecipes.includes(c.dishId)) {
      this.save.discoveredRecipes.push(c.dishId);
      this.save.stats.recipesDiscovered += 1;
      isNew = true;
      this.gainXp(50, '发现新食谱');
    }
    if (
      c.dishId === this.data.fallbackRecipeId &&
      this.save.discoveredRecipes.length <= this.data.config.darkCuisineRefundUntilDiscovered
    ) {
      refund = Math.round((c.invest ?? 0) * this.data.config.darkCuisineRefundRate);
      this.save.gold += refund;
    }
    // 重复做菜安慰经验：烹饪已发现过的食谱出锅 +2×tier（黑暗料理不加；旧存档无 wasKnown 视为不加）
    if (!isNew && c.wasKnown && c.dishId !== this.data.fallbackRecipeId) {
      this.gainXp(2 * this.recipe(c.dishId).tier, 'repeat_cook');
    }
    this.checkMilestones(); // 食谱发现数可能达成里程碑（无新增即空转）
    return { dishId: c.dishId, refund, isNew };
  }

  // ---------- 售卖与经济 ----------

  /**
   * 今日特价（纯函数，免存档迁移）：由本地日期做种子，从已发现食谱（不含黑暗料理）中
   * 确定性地选一道；当日该菜品卖出价 × config.dailySpecialMult（收购价上浮，利好玩家）。
   * 尚无任何已发现食谱时返回 null。
   */
  dailySpecial(): { dishId: string; name: string; mult: number } | null {
    const ids = this.save.discoveredRecipes.filter((id) => id !== this.data.fallbackRecipeId).sort();
    if (ids.length === 0) return null;
    const date = new Date(this.nowFn()).toLocaleDateString('sv'); // YYYY-MM-DD，与每日奖励同一刷新点
    let h = 0;
    for (const ch of date) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const dishId = ids[h % ids.length];
    return { dishId, name: this.recipe(dishId).name, mult: this.data.config.dailySpecialMult };
  }

  /** 菜品当前卖出单价：基础价 × 店铺倍率，特价菜品再 × 特价倍率（逐份取整，与既有口径一致） */
  private dishPrice(dishId: string): number {
    let price = this.recipe(dishId).sellPrice * this.effectValue('sellPriceMult');
    const mult = this.data.config.dailySpecialMult;
    if (Number.isFinite(mult) && this.dailySpecial()?.dishId === dishId) price *= mult;
    return Math.round(price);
  }

  sellDish(dishId: string, count = 1): number {
    const inv = this.save.inventory.dishes;
    if ((inv[dishId] ?? 0) < count) throw new Error(`菜品不足: ${dishId}`);
    inv[dishId] -= count;
    const income = this.dishPrice(dishId) * count;
    this.save.gold += income;
    this.save.stats.totalGoldEarned += income;
    // 卖菜经验封顶：防止后期高价菜单次打穿等级曲线
    this.gainXp(Math.min(Math.round(income / 10), this.data.config.sellDishXpCap), '卖出菜品');
    return income;
  }

  sellCrop(cropId: string, count = 1): number {
    const inv = this.save.inventory.crops;
    if ((inv[cropId] ?? 0) < count) throw new Error(`作物不足: ${cropId}`);
    inv[cropId] -= count;
    const income = Math.round(this.crop(cropId).sellPrice * this.effectValue('sellPriceMult')) * count;
    this.save.gold += income;
    this.save.stats.totalGoldEarned += income;
    return income;
  }

  /**
   * 卖出全部库存（菜品 + 作物）的收益预览：dry-run 只读计算，不改动存档。
   * 菜品含店铺倍率与今日特价加成；作物只有店铺倍率。供商店页「卖出全部，+N 金币」文案。
   */
  previewSellAll(): { gold: number; dishes: number; crops: number } {
    let gold = 0;
    let dishes = 0;
    let crops = 0;
    for (const [id, n] of Object.entries(this.save.inventory.dishes)) {
      if (n <= 0) continue;
      gold += this.dishPrice(id) * n;
      dishes += n;
    }
    for (const [id, n] of Object.entries(this.save.inventory.crops)) {
      if (n <= 0) continue;
      gold += Math.round(this.crop(id).sellPrice * this.effectValue('sellPriceMult')) * n;
      crops += n;
    }
    return { gold, dishes, crops };
  }

  /** 卖出全部库存（菜品 + 作物），返回与 previewSellAll 同口径的实际成交明细 */
  sellAll(): { gold: number; dishes: number; crops: number } {
    const r = this.previewSellAll();
    for (const [id, n] of Object.entries(this.save.inventory.dishes)) {
      if (n > 0) this.sellDish(id, n);
    }
    for (const [id, n] of Object.entries(this.save.inventory.crops)) {
      if (n > 0) this.sellCrop(id, n);
    }
    return r;
  }

  /** 图鉴：全部作物 + 是否已收获过（作物图鉴页 UI 用；desc 供点击查看详情） */
  cropBook(): { id: string; name: string; tier: number; discovered: boolean; desc: string }[] {
    return this.data.crops.map((c) => ({
      id: c.id,
      name: c.name,
      tier: c.tier,
      discovered: this.save.seenCrops.includes(c.id),
      desc: c.desc,
    }));
  }

  /** 图鉴：全部食谱 + 是否已发现（图鉴页 UI 用；desc/ingCount 供点击查看详情） */
  recipeBook(): { id: string; name: string; tier: number; discovered: boolean; desc: string; ingCount: number }[] {
    return this.data.recipes.map((r) => ({
      id: r.id,
      name: r.name,
      tier: r.tier,
      discovered: this.save.discoveredRecipes.includes(r.id),
      desc: r.desc,
      ingCount: Object.keys(r.ingredients).length,
    }));
  }

  /** 各升级线当前状态与下一级（升级面板 UI 用） */
  listUpgrades(): UpgradeInfo[] {
    return this.upgradeLines().map((line) => {
      const level = this.save.upgrades[line] ?? 0;
      const cur = this.upgradeDef(line, level);
      const next = this.upgradeDef(line, level + 1) ?? null;
      return { line, level, desc: cur?.desc ?? '', next };
    });
  }

  /** 购买升级线下一级；田地升级会自动扩展地块数组。等级门控：需农场等级达标（等级给资格、金币做支付） */
  buyUpgrade(line: string): UpgradeDef {
    const next = this.upgradeDef(line, (this.save.upgrades[line] ?? 0) + 1);
    if (!next) throw new Error('该升级线已满级');
    const key = `upg:${line}:${next.level}`;
    if (!this.isUnlocked(key)) throw new Error(`农场等级不足（需要 Lv${this.unlockLevelOf(key) ?? '?'}）`);
    if (this.save.gold < next.cost) throw new Error('金币不足');
    this.save.gold -= next.cost;
    this.save.upgrades[line] = next.level;
    if (next.effect.type === 'fieldSlots') {
      while (this.save.fields.length < next.effect.value) this.save.fields.push(null);
    }
    return next;
  }

  /** 每日轻量奖励：按本地日期发放，一天一次 */
  claimDailyReward(): number {
    const today = new Date(this.nowFn()).toLocaleDateString('sv');
    if (this.save.lastDailyRewardDate === today) return 0;
    this.save.lastDailyRewardDate = today;
    this.save.gold += this.data.config.dailyRewardGold;
    this.gainXp(10, '每日奖励');
    return this.data.config.dailyRewardGold;
  }

  /** 今日奖励是否可领（每日奖励按钮待领/已领态用） */
  canClaimDaily(): boolean {
    return this.save.lastDailyRewardDate !== new Date(this.nowFn()).toLocaleDateString('sv');
  }

  // ---------- NPC 求购（与小铺直卖分开） ----------

  private orderPool(): OrderDef[] {
    return this.data.orders ?? [];
  }

  private npcOf(id: string) {
    return (this.data.npcs ?? []).find((n) => n.id === id);
  }

  private hashStr(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /** 按日确定性抽 boardSize 张单（默认 3），换日清空已交 */
  private ensureOrderBoard() {
    const today = new Date(this.nowFn()).toLocaleDateString('sv');
    if (this.save.orderDate === today && this.save.orderIds.length > 0) return;
    const pool = this.orderPool();
    const size = 3;
    const ranked = pool
      .map((o) => ({ o, k: this.hashStr(`${today}:${o.id}`) }))
      .sort((a, b) => a.k - b.k);
    this.save.orderDate = today;
    this.save.orderDone = [];
    this.save.orderIds = ranked.slice(0, Math.min(size, ranked.length)).map((x) => x.o.id);
  }

  private orderPay(o: OrderDef): number {
    const base =
      o.kind === 'dish'
        ? (this.data.recipes.find((r) => r.id === o.itemId)?.sellPrice ?? 0)
        : this.crop(o.itemId).sellPrice;
    return Math.round(base * o.qty * o.premium * this.effectValue('sellPriceMult'));
  }

  private orderHave(o: OrderDef): number {
    const bag = o.kind === 'dish' ? this.save.inventory.dishes : this.save.inventory.crops;
    return bag[o.itemId] ?? 0;
  }

  /** 当日未交付的求购单（含缺货/未发现态） */
  listOrders(): OrderView[] {
    this.ensureOrderBoard();
    const views: OrderView[] = [];
    for (const id of this.save.orderIds) {
      if (this.save.orderDone.includes(id)) continue;
      const o = this.orderPool().find((x) => x.id === id);
      if (!o) continue;
      const npc = this.npcOf(o.npcId);
      const itemName =
        o.kind === 'dish'
          ? (this.data.recipes.find((r) => r.id === o.itemId)?.name ?? o.itemId)
          : this.crop(o.itemId).name;
      const discovered =
        o.kind === 'crop' || this.save.discoveredRecipes.includes(o.itemId);
      const have = this.orderHave(o);
      const state: OrderView['state'] = !discovered ? 'locked' : have >= o.qty ? 'ready' : 'lack';
      views.push({
        id: o.id,
        npcId: o.npcId,
        npcName: npc?.name ?? o.npcId,
        npcTitle: npc?.title ?? '',
        kind: o.kind,
        itemId: o.itemId,
        itemName,
        qty: o.qty,
        state,
        pay: this.orderPay(o),
        premium: o.premium,
        affinity: o.affinity,
        have,
      });
    }
    return views;
  }

  affinityOf(npcId: string): number {
    return this.save.affinity[npcId] ?? 0;
  }

  /**
   * 向对应 NPC 交付求购。不走今日特价。菜品单须已发现。
   * 好感只升：基础点 + 最爱菜额外 +2。
   */
  deliverOrder(id: string): {
    gold: number;
    affinityGain: number;
    npcId: string;
    npcName: string;
    itemName: string;
  } {
    this.ensureOrderBoard();
    if (!this.save.orderIds.includes(id) || this.save.orderDone.includes(id)) throw new Error('这张单不在今天的板上');
    const o = this.orderPool().find((x) => x.id === id);
    if (!o) throw new Error('未知订单');
    if (o.kind === 'dish' && !this.save.discoveredRecipes.includes(o.itemId)) throw new Error('图鉴里还没有这道菜');
    if (this.orderHave(o) < o.qty) throw new Error('货不够，先去田里收或厨房做');
    const bag = o.kind === 'dish' ? this.save.inventory.dishes : this.save.inventory.crops;
    bag[o.itemId] -= o.qty;
    if (bag[o.itemId] <= 0) delete bag[o.itemId];
    const gold = this.orderPay(o);
    this.save.gold += gold;
    this.save.stats.totalGoldEarned += gold;
    if (o.kind === 'dish') {
      this.gainXp(Math.min(Math.round(gold / 10), this.data.config.sellDishXpCap), '交付求购');
    }
    const npc = this.npcOf(o.npcId);
    let affinityGain = o.affinity;
    if (o.kind === 'dish' && npc?.favoriteDish === o.itemId) affinityGain += 2;
    this.save.affinity[o.npcId] = (this.save.affinity[o.npcId] ?? 0) + affinityGain;
    this.save.orderDone.push(id);
    const itemName =
      o.kind === 'dish'
        ? (this.data.recipes.find((r) => r.id === o.itemId)?.name ?? o.itemId)
        : this.crop(o.itemId).name;
    return { gold, affinityGain, npcId: o.npcId, npcName: npc?.name ?? o.npcId, itemName };
  }

  // ---------- 离线结算 ----------

  /**
   * 现实时间制：离线期间作物继续生长，但结算时长 capped by offlineCapHours + 便利线离线加成。
   * 对未成熟的作物，把 plantedAt 平移到" capped 进度"对应的位置，保证进度语义一致。
   */
  settleOffline(): void {
    const now = this.nowFn();
    const elapsed = now - this.save.lastOnlineAt;
    if (elapsed <= 0) return;
    const capMs = (this.data.config.offlineCapHours + this.convenienceBonus('offlineCapBonus')) * 3600 * 1000;
    const scale = this.data.config.debugTimeScale;
    const effectiveMs = Math.min(elapsed, capMs);

    for (const f of this.save.fields) {
      if (!f) continue;
      const needMs = this.crop(f.cropId).growTime * 1000;
      const progressMs = (now - f.plantedAt) * scale;
      if (progressMs >= needMs) continue; // 已成熟，无需调整
      const cappedMs = Math.min(progressMs - (elapsed - effectiveMs) * scale, needMs);
      f.plantedAt = now - Math.max(0, cappedMs) / scale;
    }
    this.save.lastOnlineAt = now;
  }
}

export { DAY_MS };
