---
doc_id: narrative.affinity-design
title: 好感度设计
doc_kind: spec
authority: [好感来源, 阈值档位, 触发条件对照]
related:
  - path: story-and-characters.md
    rel: narrative
  - path: ../development-plan.md
    rel: milestone-status
  - path: ../gameplay/recipe-combo-design.md
    rel: cross-ref
data_refs:
  - data/npcs.json
  - data/stories.json
---

# 好感度设计（触发与剧情对照）

> **角色**：好感从哪来、多少分算哪一档、**什么状态下触发哪段对话**——策划对照表（类似《组合表设计》的「条件 → 结果」）。  
> **真源**：阈值档位含义 → 本文 + `data/npcs.json`；**对白全文与节点 id** → `data/stories.json`；累计分 → 存档 `affinity`。  
> **不写**：批次 ✅ 状态（→ `docs/development-plan.md` §6.5）、人设长文（→ [characters.md](characters.md)）、赠送/声望实装细节（未做则标停车场）。  
> **文档分工**：见 `docs/doc-governance.md`。

- 创建：2026-10-08
- 对齐：M5-P1 A0（好感薄剧情管线）已落地；玩家侧仍**无好感条 UI**，仅订单结算「好心 +N」与气泡剧情。

---

## 1. 设计目标

- **先记账后开花**（P0b → P1）：交单涨 `affinity`；达到配置门槛后，在指定地点/时机弹出**一次性**气泡对白。
- **与教学分离**：`type: tutorial` 走 `readTutorials`；`type: affinity` 走 `readAffinityStories`，互不覆盖。
- **线性、可表驱动**：同一 NPC 多条按 `stories.json` **数组顺序**排队；先播靠前的未读且已达标段。
- **不做**：好感下降、恋爱线、独立任务板、本表未列的触发类型（新增须改代码 + 本文）。

---

## 2. 好感从哪来（当前已实装）

| 来源 | 条件 | 入账 | 存档字段 |
|------|------|------|----------|
| **交付求购** | 订单页交付成功 | 单上 `affinity` 点；若交的是该 NPC **最爱菜**（`npcs.favoriteDish`）再 **+2** | `save.affinity[npcId]` 累加 |
| 赠送喜欢的菜 | 每日限次 | — | **停车场**（P1 未做） |
| 主线/声望 | — | — | **P2+** |

**玩家可见**：订单交付后消息栏「好心 +N」；**不可见**：累计分、等级名（`npcs.affinityLevels` 供策划对齐，P2 再 UI 化）。

---

## 3. 档位：累计分 vs「等级」

`npcs.json` 的 `affinityLevels` 为**累计好感门槛**（升 1 级、2 级…），与 `stories.json` 的 `minAffinity` 应对齐，但**不必每条都占一档**。

| NPC id | 名称 | affinityLevels（累计分） |
|--------|------|---------------------------|
| tianbo | 田伯 | 10 · 30 · 60 · 100 · 150 |
| linshen | 林婶 | 10 · 30 · 60 · 100 · 150 |
| popo | 白婆婆 | 10 · 30 · 60 · 100 · 150 |
| xiaoman | 小满 | 8 · 24 · 48 · 80 · 120 |
| shenxiansheng | 沈先生 | 12 · 36 · 72 · 120 · 180 |
| ayuan | 阿远 | 12 · 36 · 72 · 120 · 180 |

**等级换算（策划用）**：当前等级 = 满足 `affinity >= affinityLevels[k]` 的最大 k+1（从 1 起）；未达 `affinityLevels[0]` 视为 0 级。

**P1 薄层约定**：每人先铺 **2～3 段**，`minAffinity` 建议用各 NPC 的 **第 1、2 档**（上表前两列）；第 3 段可用第 3 档（60/48/72 等）。

---

## 4. 地点与页面（place）

| place | 现用入口（底栏页） | 常驻 NPC（设计） |
|-------|-------------------|------------------|
| farm | 田地 | 田伯 |
| shop | 小铺 | 林婶 |
| canteen | 厨房、图鉴 | 白婆婆 |
| orders | 订单 | 当日求购人（临时集中页） |

地图期仍用 `place`，不绑 tab 序号（见《故事线与人物规划》§2.2）。

---

## 5. 触发类型（trigger）

| trigger | 何时检查 | 典型用途 |
|---------|----------|----------|
| `onEnter` | 进入对应底栏页（序章结束后） | 田伯/林婶/白婆婆在田地、小铺、食堂见人 |
| `onHarvest` | 田地收获成功 | 教学已用；好感**可复用**，P1 暂无 |
| `onDark` | 黑暗料理出锅 | 教学已用 |
| `onOrderDeliver` | **本单交付成功之后** | 小满 / 沈先生 / 阿远等「订单页才见面」的 NPC |

**播放纪律**：与教学相同——底部气泡、可跳过、播完记入 `readAffinityStories`；**同 id 不重复播**。  
**优先级**：同一次检查时 **先 tutorial，再 affinity**；一段结束后链式检查下一条。

---

## 6. 剧情节点字段（`data/stories.json`）

| 字段 | tutorial | affinity | 说明 |
|------|----------|----------|------|
| id | ✓ | ✓ | 全局唯一 |
| type | `tutorial` | `affinity` | |
| place | ✓ | ✓ | §4 |
| trigger | ✓ | ✓ | §5 |
| speaker | ✓ | ✓ | 气泡署名 |
| lines | ✓ | ✓ | 每句一条，3～8 句/段为宜 |
| npcId | — | ✓ | 用谁的 `affinity` 做门槛 |
| minAffinity | — | ✓ | **累计分** ≥ 此值才可触发 |
| note | 可选 | 可选 | 策划备注，不进游戏 |

**触发条件（逻辑真值）**：

```text
type === 'affinity'
AND place、trigger 与当前事件一致
AND save.affinity[npcId] >= minAffinity
AND id ∉ save.readAffinityStories
AND（若 trigger === onOrderDeliver）交付订单的 npcId === 节点 npcId
AND 序章已结束（onEnter 与教学相同）
→ 取 stories 数组中第一条满足的节点播放
```

---

## 7. 触发对照总表（状态 → 内容）

> **对白正文**以 `data/stories.json` 为准；下表「内容摘要」为策划意图，W2 定稿后请与 JSON 同步改摘要。  
> 状态列：**累计好感** + **未读** + **地点/触发** 同时满足才播。

### 7.1 已入库（含 W1 占位）

| id | NPC | minAffinity | place | trigger | 内容摘要（策划） | 状态 |
|----|-----|-------------|-------|---------|------------------|------|
| aff_tianbo_10 | 田伯 | 10 | farm | onEnter | W1 占位；W2 改为交单后夸奖 + 可选祭典漏料（空地/灯笼） | ✅ 占位已接代码 |
| aff_linshen_10 | 林婶 | 10 | shop | onEnter | W1 占位；W2 人情/赊账向 | ✅ 占位已接代码 |

**自测**：新档交田伯单至累计 ≥10 → 进田地播 `aff_tianbo_10` 一次；林婶同理进小铺。

### 7.2 M5-P1 计划（待写入 `stories.json`）

| id（建议） | NPC | minAffinity | place | trigger | 内容摘要 | 祭典漏料 |
|------------|-----|-------------|-------|---------|----------|----------|
| aff_tianbo_30 | 田伯 | 30 | farm | onEnter | 田埂糗事/护犊 | 仍不说「丰收祭」三字 |
| aff_linshen_30 | 林婶 | 30 | shop | onEnter | 外婆赊账 | **说出丰收祭**、歇业帮忙、问是否办回来 |
| aff_popo_10 | 白婆婆 | 10 | canteen | onEnter | 毒舌但承认肯干活 | — |
| aff_popo_30 | 白婆婆 | 30 | canteen | onEnter | 别扭关心 | 灯笼是祭上点的，语气略软 |
| aff_xiaoman_8 | 小满 | 8 | orders | onOrderDeliver | 玻璃珠/爆米花 | — |
| aff_xiaoman_24 | 小满 | 24 | orders | onOrderDeliver | 外号「做饭的」 | — |
| aff_shen_12 | 沈先生 | 12 | orders | onOrderDeliver | 讲究/毒舌 | 轻提「小时候的味道」 |
| aff_shen_36 | 沈先生 | 36 | orders | onOrderDeliver | 火候点评 | 不揭汤 |
| aff_ayuan_12 | 阿远 | 12 | orders | onOrderDeliver | 外地铜钱 | — |
| aff_ayuan_36 | 阿远 | 36 | orders | onOrderDeliver | 三种未见作物 | 可选一句「镇子欠一晚」（可挪 P2） |

**P1 体验底线 N1**：上表中至少 **田伯 + 林婶或白婆婆** 的祭典漏料段落地即可勾选。

### 7.3 教学节点（非好感，对照用）

| id | place | trigger | 说话人 | 说明 |
|----|-------|---------|--------|------|
| tut_farm_plant | farm | onEnter | 田伯 | 新档种地教学 |
| tut_farm_harvest | farm | onHarvest | 田伯 | 收获教学 |
| tut_shop | shop | onEnter | 林婶 | 小铺教学 |
| tut_orders | orders | onEnter | 林婶 | 订单教学 |
| tut_canteen | canteen | onEnter | 白婆婆 | 厨房教学 |
| tut_dark | canteen | onDark | 白婆婆 | 黑暗料理 |

好感段与教学 **id 分开**；同页 `onEnter` 会先播完未读教学，再播好感。

---

## 8. 存档与迁移

| 字段 | 含义 |
|------|------|
| `affinity` | `Record<npcId, number>` 累计好感 |
| `readAffinityStories` | 已播完的好感剧情 id 列表 |
| `readTutorials` | 已读教学（与好感无关） |

- **旧存档**缺 `readAffinityStories` → 视为 `[]`，**可补播**未读好感段（与教学「缺字段则全已读」不同）。
- 播剧情**不消耗**好感分。

---

## 9. 与奖励表的关系（`npcs.rewards`）

`npcs.json` 的 `rewards[].level` 表示**好感等级**解锁方向（剧情/折扣/食谱…）。  
**P1**：仅 `type: story` 的薄层用 `stories.json` 的 `affinity` 节点实现；折扣、订单刷新、专属食谱等 **数值与 UI 在 P2**，本文只预留对照：

| 等级 | 典型解锁（设计稿） | P1 是否实装 |
|------|-------------------|-------------|
| 1 | 支线前几段 | 部分（薄对白） |
| 2+ | 折扣/溢价/食谱/深写 | 否 |

---

## 10. 改表纪律

1. 增删好感剧情：改 `data/stories.json` → `npm run sync-data` → 更新 **§7 对照表**一行摘要。  
2. 改门槛档位：改 `minAffinity` 与/或 `npcs.affinityLevels` → 本文 §3、§7 同步。  
3. 新 trigger：须改 `GameCore` / `GameController` + 本文 §5。  
4. 里程碑级变动：`docs/dev-log.md` 追加一行。

---

## 11. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-10-08 | 初版：A0 管线说明 + 触发总表 + P1 计划行 + W1 占位两条 |
