---
doc_id: narrative.story-and-characters
title: 故事线与人物规划
doc_kind: index
related:
  - path: worldview-and-tone.md
    rel: narrative
  - path: systems-and-reputation.md
    rel: narrative
  - path: characters.md
    rel: narrative
  - path: plot-and-festival.md
    rel: narrative
  - path: narrative-data-contract.md
    rel: data-contract
  - path: affinity-design.md
    rel: narrative
  - path: ../development-plan.md
    rel: milestone-status
data_refs:
  - data/npcs.json
  - data/stories.json
---
# 故事线与人物规划（M5 内容块 · 设计稿 v2）

> **角色**：世界观、人物、主线/支线、丰收祭、文案与引导设计。  
> **真源**：人设与对白口径、故事结构、文案规范、引导触发设计。  
> **不写**：批次完成状态（→ 方案 §6.5～§6.6）、画法/出图参数、数值真值。  
> **文档分工**：`docs/doc-governance.md`  
> 体验过关线：`docs/experience-roadmap.md`。设计支柱审判：方案 §7.1。  
> 文案协作：AI 起草 → 用户审定稿（见 [copy-guide.md](copy-guide.md)）。

- 创建日期：2026-07-22
- v2 改版：2026-08-11（M4 收官后）
- 人设微调：2026-09-28（田伯↔白婆婆性格对调定稿：田伯慈祥护犊 / 白婆婆外冷内热）
- v2.1 补记：2026-09-28（序章「为何回镇」+ 地图串联 NPC；现有分页只是地点的临时入口，见 §2.1 / §2.2）
- v2.1 地图补记：2026-09-28（平面初稿 `docs/mockups/map.svg`；到站改从进村路走进来）
- v2.1 丰收祭补记：2026-09-28（来历、过法、每人的含义、按章往外漏，见 [plot-and-festival.md](plot-and-festival.md)）
- **批次编号**：M5 已收口；玩法与人物出场顺序见 **M6**（`../planning/m6-town-expansion.md`）；**完成与否只看《游戏开发方案》§6.6**

## v2 变更摘要（对照 v1）

| 项 | v1 | v2 |
|----|----|----|
| 人物 | 6 人，支线 3~5 段/人 | 6 人不加人，**加深**：支线 8~10 段/人 + 新增「人物交集剧情」 |
| 好感度 | M5-2 才落地 | **数据层已在 P0b 落地**（先记账）；剧情开花 = **P1 薄层 / P2 深写** |
| 订单 | NPC 点单 | 升级为**「NPC 交易」**（求购/赠送/以物易物），商店人格化为林婶的杂货铺 |
| 进度轴 | 金币 + 农场等级 | 新增第三轴**「小镇声望」**（人际关系广度，阶段性提升） |
| 菜品文本 | 一句话 desc | **扩写 2~3 句**（味道 + 故事钩子）+ `favoriteOf` 绑定 NPC 最爱 |
| 远期扩展 | 未提 | 数据模型预留物品分类（作物/水果/动物/鱼），果园/养殖/钓鱼记停车场不排期 |
| 见面方式（v2.1） | 切页即见人 | **地点**挂人：现在用页面代理地点；以后用地图把农场/食堂/小铺/人家串起来（§2.2） |
| 开场（v2.1） | 已在镇上 | 序章交代城里的日子、回镇的原因，再进入「重新开张」（§2.1） |

---

## 专题文档（真源分拆）

| 文档 | 内容 |
|------|------|
| [worldview-and-tone.md](worldview-and-tone.md) | 定位、世界观、序章、地图 |
| [systems-and-reputation.md](systems-and-reputation.md) | 三件套 + 声望轴 |
| [characters.md](characters.md) | 6 人设定 + 人物交集 |
| [plot-and-festival.md](plot-and-festival.md) | 主线章节 + 丰收祭 §6.4 |
| [narrative-data-contract.md](narrative-data-contract.md) | 配置表、存档、菜品文本、UI |
| [story-roadmap.md](story-roadmap.md) | 故事侧分期要点（**不写**批次 ✅） |
| [copy-guide.md](copy-guide.md) | 文案规范 |
| [tutorial-by-dialogue.md](tutorial-by-dialogue.md) | 叙事化新手引导 |
| [risks-and-open-questions.md](risks-and-open-questions.md) | 风险与待决策 |
| [affinity-design.md](affinity-design.md) | 好感触发对照表 |

批次完成状态 → 仅 [development-plan.md](../development-plan.md) §6.5。
