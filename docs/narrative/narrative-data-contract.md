---
doc_id: narrative.data-contract
title: 叙事数据与 UI
doc_kind: spec
authority: [npcs, stories, 存档, UI]
related:
  - path: story-and-characters.md
    rel: narrative
  - path: affinity-design.md
    rel: narrative
  - path: ../development-plan.md
    rel: milestone-status
---
## 7. 数据表与存档

### 7.1 配置表

| 文件 | 内容 |
|------|------|
| `data/npcs.json` | NPC：id/name/desc/喜好菜品/最爱菜/好感等级阈值/各等级奖励/支线小节大纲 |
| `data/orders.json` | 交易生成规则：来源 NPC、菜品池（按 tier）、溢价系数、好感与声望奖励、刷新规则；以物易物手配单 |
| `data/stories.json` | 剧情节点：id/归属（主线/支线/交集/引导）/participants/触发条件/对话文本数组/完成奖励 |
| `data/levels.json` 扩展 | 声望等级曲线（或独立 `reputation.json`，动手时定） |

### 7.2 存档扩展（旧存档 `??=` 迁移）

```json
{
  "affinity": { "tianbo": 0 },
  "reputation": 0,
  "completedStories": ["main_1"],
  "activeOrders": [ { "id": "...", "npcId": "linshen", "dishId": "toast", "count": 2, "reward": 40 } ],
  "mainChapter": 1
}
```

### 7.3 菜品文本字段（v2，`recipes.json` v6）

- `desc`：从一句话扩写为 **2~3 句**——第一句味道，第二句故事钩子或归属人（例：南瓜汤→「整颗南瓜熬出的金黄一锅。沈先生尝第一口时，勺子停在了半空。」）；
- `favoriteOf`（可选）：NPC id——「某人的最爱菜」，图鉴详情与 NPC 档案双向展示，赠送有额外好感。

### 7.4 种植场景与远期品类（2026-10-09 修订）

- **`crops.json` 的 `type`**（玩法真源，见 `gameplay/data-schema.md` §2）：`farm` | `orchard` | 远期 `fishery` | `ranch`。M6-P1 四水果迁 `orchard`；香菇、花生仍 `farm`。
- **可选 `category`**（文案/图鉴分组，非 M6 硬性）：`crop` | `fruit` | `livestock` | `fish` — 与 `type` 分工不同，落地时再定是否进表。
- **果园**：M6 硬性指标；**养殖/钓鱼**：仍停车场，M6 不做。
- NPC 交易数据模型按「物品 id」建模，新品类只增表行不改解析器。

### 7.5 UI 形态（v2.1 修订）

**现在**：底栏是地点的临时入口（田地=农场、厨房/图鉴=食堂、小铺=林婶、订单=当日求购的集中列表）。声望称号进顶栏仍后置。

**地图期（M6-P0 起）**：底栏可与地图短期并存。小镇地图上点热点进入对应地点（含 `orchard`）。**订单集中页（orders tab）弱化至 M6-P2**；之后单子出现在 NPC 所在 `place`。逻辑用 `place` id，不绑 tab 序号。

第五页「小镇 NPC 列表」的旧设想作废，由地图取代。

---

