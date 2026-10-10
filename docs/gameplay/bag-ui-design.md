---
doc_id: gameplay.bag-ui-design
title: 背包内页 UI 设计
doc_kind: spec
authority: [背包抽屉信息架构, 视觉规格, M6 验收项 H4b]
related:
  - path: ../planning/m6-town-expansion.md
    rel: milestone-scope
  - path: ../art/art-style-guide.md
    rel: visual
  - path: ../experience-roadmap.md
    rel: experience-gate
  - path: data-schema.md
    rel: data-contract
---

# 背包内页 UI 设计

> **角色**：背包**抽屉内部**该长什么样、怎么验收；入口 icon / 解锁节奏不在本文（→ `main-quest-design.md`、`experience-roadmap` P0-L3）。  
> **真源**：§2～§5；库存字段 → `data-schema.md`（`inventory.crops` / `inventory.dishes`）。  
> **实现落点**：`GameController.ts` — `buildBagOverlay` / `refreshBagOverlay` / `makeListItem`（或拆 `makeBagCell`）。  
> **文档分工**：`docs/doc-governance.md`

- 定案：2026-10-10
- 状态：**规格已定，实现未做**（用户暂不做；**未完成则 M6 不能宣称整体验收**，见 `planning/m6-town-expansion.md` H4b）

---

## 1. 现状（M6-P0 功能 MVP）

| 项 | 现状 |
|----|------|
| 容器 | 底部抽屉 ~560px 高，白底圆角 + 细描边，半透明遮罩 |
| 列表 | 纵向 ScrollView；分区标题「作物」「菜品」+ `makeListItem` 单行（左图标 / 中名 / 右 `×数量`） |
| 空态 | 分区「（暂无）」；全空「袋子里还空着呢」 |
| 问题（对照截图） | 信息密度低、行条过「表单感」；与田地种子抽屉 / 厨房食材区的**木牌+格子**气质不统一；标题区弱、关闭钮像纯文字 |

**P0-B1** 只验收「能看库存」；**不**代表背包视觉终稿。

---

## 2. 设计目标

1. **气质**：与 v3 原型一致 —— **奶油纸 + 深棕描边 + 丰收黄点缀**（`art-style-guide.md` §2）；像「外婆布袋里的清单」，不是系统设置列表。
2. **扫读**：2 秒内看出「有什么、各多少」；图标为主、字为辅（复用 `icons/crops-ui` / 菜品图标）。
3. **结构**：作物 / 菜品 **分段清晰**；后期果园四果仍归「作物」段，不新增 tab（除非 P1 后数据变复杂再评）。
4. **不做**：容量条、整理/排序玩法、拖拽交物、从背包直接下锅（仍走厨房页）。

---

## 3. 信息架构

```
[ 遮罩 tap 关闭 ]
└─ 底部抽屉 Panel（高 ≈ 58% 屏，max ~680px）
   ├─ 顶栏：拖拽条（可选） + 标题「背包」 + 关闭（× 命中区 ≥44px，描边圆钮）
   ├─ 分段切换（二选一，推荐 A）
   │   A. 双胶囊 Tab：「作物」|「菜品」（选中=丰收黄底，未选=米白描边）— 与底栏 tab 同 `drawNavTab` 语法
   │   B. 单页上下两段 + 段头木牌（与现分区类似，但段内改网格）
   └─ 内容区（ScrollView）
       ├─ 网格：每格 = 图标 + 数量角标 + 可选 1 行短名
       └─ 空态插画/文案（段内空：「还没收过这类」；全空：「去田里收点什么吧」）
```

**推荐落地**：**A + 网格**（单段一屏更干净；条目多时再滚）。

| 数据 | 展示 |
|------|------|
| `inventory.crops[id]>0` | 作物 tab，格内 `cropUi` 图 + 角标数量 |
| `inventory.dishes[id]>0` | 菜品 tab，格内菜品图 + 角标数量 |
| 排序 | 默认按 `cropName` / `dishName` 拼音；与现逻辑一致 |

---

## 4. 视觉规格（实现对照）

| 元素 | 规格 |
|------|------|
| 面板底 | `#FFFDF5`，外描边 `#4A3520` 2.5px，圆角 28；顶缘轻阴影（深棕 α≈0.25，y+4） |
| 顶栏高 | 56px；标题 22px 粗体 `#4A3520` |
| Tab | 高 40px，宽各 ~120px，间距 12；复用 `drawNavTab` |
| 网格 | 4 列（720 宽下格宽约 72～76，间距 10）；格底 `#FFF8E7` 圆角 12 + 内描边 1.5px |
| 图标 | 56×56（格内居中）；数量角标右下小圆 `#F2B830` 底 + 棕字 13px 粗体 |
| 名称 | 可选：格下 12px `#6B4423` 单行省略（字多时可只显示图标+角标） |
| 滚动区 | 左右边距 20；底部留白 24（防贴边） |

**动效（可选，不挡验收）**：打开抽屉 slide-up 200ms；格内数量变化时角标轻弹。

---

## 5. 验收清单（H4b / experience-roadmap P0-B2）

| # | 要点 |
|---|------|
| B2-1 | 双 tab（或等价分段）切换作物/菜品，数据与 Core 库存一致 |
| B2-2 | 网格展示，图标来自现有 `cropUi` / 菜品资源，数量角标正确 |
| B2-3 | 空态文案符合 §3；全空与分段空均可用 |
| B2-4 | 关闭：遮罩、×、系统返回（若已接）均可关抽屉 |
| B2-5 | 与种子抽屉/厨房食材区**同一套色板与描边**，真机一眼同属「丰穗 UI」 |
| B2-6 | 收菜 / 做菜后打开背包，列表即时刷新（沿用 `refreshBagOverlay` 钩子） |

**不要求**：mockup 新 PNG（程序搭 UI 即可）；即梦不另出「背包全屏图」（§6.3C 已约定入口 icon 即可）。

---

## 6. 实现提示（给下一棒）

1. 保留 `bagOverlay` / `openBagOverlay` / 解锁门控；重写 `buildBagOverlay` 布局与 `refreshBagOverlay` 填格逻辑。
2. 抽 `makeBagGridCell(parent, { iconKind, id, qty, name? })` 避免 `makeListItem` 强行复用（行布局与格布局不同）。
3. Tab 状态存 `bagTab: 'crop' | 'dish'` 于 Controller 字段；切换只 `refreshBagOverlay` 不重建树。
4. P1 果园作物仍进作物 tab，无需改本 spec。

---

## 7. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-10-10 | 初版：M6 H4b 视觉改版规格；P0 列表 MVP 与终稿分离 |
