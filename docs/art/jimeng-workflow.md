---
doc_id: art.jimeng-workflow
title: 即梦出图流程
doc_kind: spec
authority: [即梦设置, 参考挂法, 制作顺序, 入库路径]
related:
  - path: jimeng-prompts.md
    rel: art-pipeline
  - path: jimeng-pipeline.md
    rel: cross-ref
  - path: art-style-guide.md
    rel: art-pipeline
---
# 即梦出图管线（执行手册）

> **角色**：用**即梦 AI** 为本项目出图的操作真源。  
> **真源**：工具设定、参考挂法、提示词模板、**制作顺序（先改旧再做新）**、入库路径、防跑偏纪律。  
> **不写**：色板 Hex、验收三关定义（→ 美术规范）、人物口癖（→ 故事线）、批次是否完成（→ 方案）。  
> **文档分工**：`docs/doc-governance.md`  

- 创建：2026-09-30
- 工具：**即梦 · Seedream 5.0 Lite**（本机不跑 ComfyUI）
- 对齐：美术规范 v1.3（粗描边平涂）+ 场景俯视（桃源构图）
- 旧手册：`comfyui-pipeline-deprecated.md` 仅作历史指针，**以本文为准**

---

## 1. 总原则

1. **先重做游戏里已有资产，再做新内容**（NPC 定妆等排后）。  
2. **全项目锁死三件套**：同一模型 + 同一风格参考 + **同一类全局前缀**；中途不换。  
3. 先 **小样签字**，再按清单放量。  
4. 成品题材必须是「丰穗」自己的作物/菜/场景。  
5. 入库文件名与现有资源一致（见 §5）。  
6. 防跑偏靠前缀 + 参考 + 设置，不靠长篇「游戏说明」。

### 1.1 两类作物图（必须分清）

| 类型 | 用途 | 长什么样 | 提示词 | 阶段 0 优先 |
|------|------|----------|--------|-------------|
| **A · 田里植株** | 地块上的 s1/s2/成熟 | 从土里长出的一株/一丛，能种在地里 | **§6.3A** | **先做这个** |
| **B · 背包贴纸** | 图鉴/列表/收获物展示 | 收获物或可爱贴纸图标，可无土块 | **§6.3B** | 田里套过关后再做 |

实战教训（2026-09-30）：

- 挂旧 `wheat.png` 作外形 → 容易变成「三圆点杆子」描边版，**阶段 0 不要挂旧作物图**。  
- 只写「道具图标/贴纸」→ 好看但**不适合放地里**。  
- 田里版要写清：**从土里长出、植株/一丛、禁止白边贴纸外框、描边略抖动**。  
- **白菜**：提示词写「圆白菜」仍易漂成大白菜/高脚白茎 → 必须写死「贴地正圆包心球 + 禁止大白菜/白茎柱」；圆白菜≈卷心菜，≠大白菜。

### 1.2 防越画越歪

| 做 | 不做 |
|----|------|
| 全程 Seedream 5.0 Lite | 中途换模型 |
| 风格参考锁定 `dw13`（或签字后的自有拼版） | 每张乱换风格参考 |
| 同类资产用同一套 §6 模板 | 每次重写风格段 |
| 一次只出 **一个** 主体 | 整页菜谱/UI |
| **不要**用旧 `icon-sheet` 当风格参考 | 把旧画风当目标 |

---

## 2. 即梦界面怎么操作

入口：**画布 / 工作区**。Seedream 5.0 **没有**「风格特征」按钮；参考用途写在提示词里。

### 2.1 固定设置

| 项 | 值 |
|----|-----|
| 模型 | **Seedream 5.0 Lite** |
| 作物/菜比例 | **1:1** |
| 场景比例 | **9:16** |
| 参考缩略图 | 底栏提示条左上小图（旁有 `+`） |
| 全局前缀进模型的方式 | **必须出现在底部提示框**（或可靠 @）；画布文字节点连线**不保证**被读取 |

### 2.2 参考图路径

| 用途 | 文件 |
|------|------|
| 风格（主） | `docs/参考图/动物/dw13.png`（辅 `dw4.png`） |
| 场景 | `docs/参考图/桃源/bg2.png`（或 bg5/bg7） |
| 田伯定妆 | `docs/mockups/npc/sc1.png` |
| 旧作物（一般不用） | `assets/resources/icons/crops/<id>.png` |
| 小样输出 | `docs/参考图/小样/` |

作物 id：`wheat tomato potato corn pumpkin strawberry watermelon carrot cabbage mushroom chili eggplant peanut grape peach`。

### 2.3 阶段 0 / 田里植株：只挂 dw13（推荐）

1. 只上传 **dw13**，比例 1:1，模型 Seedream 5.0 Lite。  
2. 底栏提示框粘贴 **§6.3A**（改「内容」行作物名）。  
3. 生成 → 存 `docs/参考图/小样/<id>.png`（田里成熟株）。  
4. **不要**挂旧作物图，除非新画风已像、只是认不出作物。

### 2.4 背包贴纸 / 作物列表图标

只挂 **dw13**，粘贴 **`jimeng-prompts.md` §6.3B 整段** + 作物表「内容行」。**首批 7 作物 UI 贴纸 ✅ 2026-10-09**（`icons/crops-ui/`：wheat～carrot 解锁序前 7 种）。可保留「收获物」观感；**不要**与田里植株 §6.3A 混用；**不要**挂带白刀模边的失败稿当参考。小样：`docs/参考图/小样/icons/crops-ui/<id>.png`。

### 2.5 后期

即梦「抠图」下载 → `npm run organize-crop-samples`（`_抠图` 重命名为 canonical，旧图进 `_archive`）→ `npm run import-jimeng-crop-stages-all`（去右下角即梦水印、透明/浅底、256）。仍须目视过 §5.4；角标裁不干净时换无水印导出或手修小样后再入库。

---

## 3. 制作顺序（先旧后新）

### 阶段 0 · 小样签字

| # | 产出 | 参考 | 模板 | 状态 |
|---|------|------|------|------|
| 0.1 | **7 个田里成熟植株** | 仅 dw13 | **§6.3A** | ✅ 2026-09-30 签字（见 `docs/参考图/小样/`） |
| 0.2 | 田地背景 1 张 | dw4 + 桃源 | §6.4 | ✅ 2026-09-30 签字（`docs/参考图/小样/field_bg.png`） |
| 0.3 | 厨房/小铺背景 | dw13 + field_bg | jimeng-prompts §4 | ✅ 2026-10-08（`kitchen_bg` / `shop_bg`） |

7 作物（0.1）：`wheat` `tomato` `potato` `corn` `pumpkin` `cabbage` `carrot` → 文件 `docs/参考图/小样/<id>.png`。  
白菜口径：**圆白菜/卷心菜（结球甘蓝）**，不是大白菜。  
**未过 §5.4 后期 + 入库清单前，不覆盖** `assets/resources/`。

### 阶段 1 · 重做已有

**1A 作物 45 张**：先 **§6.3A** 出齐田里用 `<id>` / `_s1` / `_s2`（s1/s2 改内容行为幼苗/半成株，仍带土或破土）。  
**1B 菜品 40 张**：用 **§6.3B**（收获物/盘装，不是地里植株）。  
（若日后背包要与田里区分文件，再开命名约定；现行游戏同名文件先以田里植株覆盖成熟图。）

### 阶段 2 · 场景大图

`field/kitchen/shop/loading` → §6.4；**M6 新增** `map` → §6.4「小镇地图页 `map_bg`」。  
**入库命令**：`npm run import-jimeng-bg`（小样 `field_bg` / `kitchen_bg` / `shop_bg` / `loading_bg` / **`map_bg`** → `assets/resources/bg/*.jpg`，720×1280 JPEG q87，**不覆盖**已有 `.meta`）。`book` 仍走 `gen-scene-bg`；**`loading` 整幅海报走即梦**（见 §7 Loading 海报）。

### 3.1 M6 · 地图底图 + 入口小图标（生成逻辑）

| 步骤 | 地图页 `map_bg` | 入口 icon（地图钮/背包钮） |
|------|-----------------|---------------------------|
| 1 构图 | **方案 B**：`map_bg` 无建筑；热点坐标对照 `map.svg` | 三折地图纸 icon |
| 2 即梦 | **只挂 `field_bg.png`** + §6.4 `map_bg` 纯地形提示词 | §6.3C |
| 2b | 地点叠层 §6.4.1：食堂/小铺（白墙橙顶）+ 田地/果园（无房：犁沟或果树） | — |
| 3 小样 | `map_bg.png` + `map_place_*.png` | `icons/ui/map.png`、`bag.png` |
| 4 验收 | 与 `field.jpg` 同世界、全图零建筑；小房与 field 小屋并排 | 透明底 |
| 5 入库 | `import-jimeng-bg`；小房 `import-jimeng-ui-icons` | `import-jimeng-ui-icons`；作物贴纸 `npm run import-jimeng-crops-ui`；田里 `_s1/_s2` → `import-jimeng-crop-stages` |
| 6 游戏 | 底图 + 代码热点；后续 Sprite 替胶囊 | 田地地图钮 |

**优先级**：玩法可先色块地图；**体验底线 M6-V0** 再换 `map.jpg`。入口 icon **不挡** P0 逻辑验收。

### 阶段 3 · 新内容

NPC 定妆等 → §6.5。

---

## 4. 工作流速查

| 流程 | 做法 |
|------|------|
| **W1A 田里作物** | 仅 dw13 → §6.3A → 小样/crops |
| **W1B 菜/贴纸图标** | 仅 dw13 → §6.3B → dishes 或备选收获图 |
| **W2 场景** | dw4/桃源 → §6.4（含 **map_bg**） |
| **W2b UI 小图标** | 仅 dw13 → §6.3C（地图钮/背包钮） |
| **W3 NPC** | sc1 → §6.5 |

---

## 5. 入库纪律

| 类型 | 路径 | 命名 |
|------|------|------|
| 作物 | `assets/resources/icons/crops/` | `<id>.png` / `_s1` / `_s2` |
| 菜品 | `assets/resources/icons/dishes/` | 与现文件同名 |
| 背景 | `assets/resources/bg/` | `field.jpg` / **`map.jpg`** 等 |
| UI 小图标 | `assets/resources/icons/ui/` | `map.png` / `bag.png` |
| 小样 | `docs/参考图/小样/icons/crops/` | 如 `wheat.png` / `wheat_s1.png` |
| 小样 | `docs/参考图/小样/` | `map_bg.png`；`icons/ui/*.png` |
| NPC | `docs/mockups/npc/` | 如 `tianbo.png` |

---

> 提示词全文见 [jimeng-prompts.md](jimeng-prompts.md)（§6）。

## 7. 接下来怎么跑

### 已完成 · 0.1 田里成熟植株 ×7

文件在 `docs/参考图/小样/{wheat,tomato,potato,corn,pumpkin,cabbage,carrot}.png`（`wheat_logo.png` 为早期贴纸向试图，不作田里准绳）。

### 已完成 · 0.2 田地背景小样

文件：`docs/参考图/小样/field_bg.png`（须即梦**原图导出**入库，勿用工作区拼版截图）。  
验收通过：上半装饰（天/日/云/远山/左树/右屋+炊烟/灯笼串/木栅栏）+ 下半空草地；无人物、无作物、无田格、无 UI；构图对齐现版 `field.jpg` 分区。  
小瑕疵可忽略（前景石径、零星小花）：地块由代码叠层，不挡操作区即可。

### 已完成 · 0.3 厨房 / 小铺背景小样

`docs/参考图/小样/kitchen_bg.png`、`shop_bg.png` 已签字；小铺经视角修正（正面空墙）。

### 当前 · 阶段 2 场景入库（field / kitchen / shop）

已跑 `npm run import-jimeng-bg` → `assets/resources/bg/{field,kitchen,shop,loading}.jpg`（含 `loading_bg` 海报）。  
**玩法层（2026-10-09 ✅）**：四页 `BG_UI` 锚点；厨房 `potFx` 铲拨/轻颠 + `stir` 音效；小铺售卖确认弹窗与升级列表滚动见 `dev-log.md` 当日行。  
**P1-V2 ✅（2026-10-09）**：小样拼版 `docs/mockups/p1-v2-jimeng-scenes.png`（`npm run gen-p1-v2-collage`）。游戏内 UI 叠层对照可另截真机图作加分，不挡底线。

### Loading 整幅海报（`loading_bg`）

1. 参考：**dw13** + **`field_bg.png`**（勿挂旧 `loading.jpg`）。  
2. 比例 **9:16**；提示词 → [jimeng-prompts.md §6 Loading 整幅海报](jimeng-prompts.md)。  
3. 产出：`docs/参考图/小样/loading_bg.png`（即梦**原图导出**、去水印）。  
4. 验收：与田地页同世界；牌匾与副标题字正确；**无**进度条/百分比/小贴士/加载句；最底两行忠告可读；中下渐变压暗给程序进度条。  
5. 入库：`npm run import-jimeng-bg` → `assets/resources/bg/loading.jpg`；Cocos 预览启动遮罩。  
6. **勿再跑** `node sim/gen-loading.js` 覆盖 `loading.jpg`（除非只出 mockup SVG）。

### 其后（勿抢跑）

- 阶段 1A：其余 8 作物 × s1/s2/成熟 → 覆盖 `icons/crops`（0.3 后再放量）。  
- 阶段 1B：菜品图标。  
- P1-V2：✅ 见 `mockups/p1-v2-jimeng-scenes.png`。

---

## 8. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-09-30 | 初版；Seedream；无风格特征按钮；防跑偏 |
| 2026-09-30 | **分型**：田里植株 jimeng-prompts.md §3A vs 背包贴纸 jimeng-prompts.md §3B；阶段 0 默认只挂 dw13；写入小麦实战教训（勿挂旧三圆点图；要带土与手绘抖动） |
| 2026-09-30 | **0.1 签字**：7 田里成熟株入 `docs/参考图/小样/`；白菜定圆白菜口径；下一步 0.2 田地背景 |
| 2026-09-30 | **0.2 纠偏**：田地背景对齐现版 field——上半装饰、下半空草地；禁止田格/人物/按钮；按钮不画进图 |
| 2026-09-30 | **0.2 签字**：`field_bg` 构图过关（对齐现版分区）；下一步阶段 **1A**（先补 7 作物 s1/s2） |
| 2026-09-30 | **1A 纠偏**：小麦 s2 禁止金黄饱满穗；须青绿瘪穗 + 更矮更疏 |
| 2026-09-30 | **1A 提示词表**：jimeng-prompts.md §3A 补齐 15 作物成熟/s1/s2 内容行 + 制作顺序勾选 |
| 2026-09-30 | **1A 纠偏²**：pumpkin_s2 贴地禁悬空；cabbage_s2 贴地禁高杆；carrot_s2 只露尖加强与成熟区分 |
| 2026-09-30 | **1A 首批 7 作物三阶段签字**（wheat～carrot）；小样路径改为 `小样/icons/crops/`；下一步 strawberry 起 8 个新作物 |
| 2026-09-30 | **纠偏顺序**：当前回到 **0.3** 厨房/小铺；8 作物放量属 1A，不抢跑；jimeng-prompts.md §4 补厨房/小铺提示词 |
| 2026-10-08 | **厨房 jimeng-prompts.md §4 改版**：深锅汤面 → 浅口农家灶锅（静态菜块）；铲拨/轻颠归程序叠层；提示词与 0.3 验收同步；建议参考 `field_bg`+dw13 |
| 2026-10-08 | **0.3 ✅** + **阶段 2**：`import-jimeng-bg.js`；field/kitchen/shop 小样入库游戏 bg |
| 2026-10-08 | **Loading 海报**：jimeng-prompts §6 `loading_bg` 整幅即梦；`import-jimeng-bg` 支持 loading |
| 2026-10-09 | **P1-V2 ✅**：`gen-p1-v2-collage.js` → `mockups/p1-v2-jimeng-scenes.png` |
| 2026-10-09 | **M6**：`jimeng-prompts` §6.3C 入口 icon + §6.4 `map_bg`；`import-jimeng-bg` 支持 map；`import-jimeng-ui-icons` |
| 2026-10-09 | **§6.3C 纠偏**：地图改单层定位针/折角纸（禁卷轴嵌小镇）；背包改双肩包正面（禁粮袋麦穗） |
| 2026-10-09 | **§6.3C**：地图定稿语义=三折地图纸 icon（禁路标）；画风仍丰穗描边平涂，非黄底圆标素材 |
| 2026-10-09 | **map_bg 方案 B**：纯地形对齐 field_bg；地点建筑 §6.4.1 单栋叠层 |
| 2026-10-09 | **§6.3B 作物贴纸**：15 作物内容行 + 禁白边模板；小样目录 `icons/crops-ui/` |
| 2026-10-09 | **§6.3B 首批 7 ✅**：wheat/tomato/potato/corn/pumpkin/carrot/cabbage 入 `icons/crops-ui/`；余 8 作物待放量 |
