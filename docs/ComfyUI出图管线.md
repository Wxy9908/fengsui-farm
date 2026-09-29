# ComfyUI 出图管线（执行手册）

> **角色**：本机 ComfyUI 怎么出图。  
> **真源**：底模、节点顺序、权重、分辨率、可粘贴提示词。  
> **不写**：色板 Hex、验收三关定义、人物口癖、批次是否完成。  
> **文档分工**：`docs/文档体系.md`  
> 画什么/过关 → `美术风格规范.md`（§5.1 四槽、§5.4 验收）  
> 体验底线 → `体验内容开发方向.md` §4.2  
> 人物性格 → `故事线与人物规划.md`  
> 是否排进画风批次 → `游戏开发方案.md` §6.5  

- 创建：2026-09-29
- 工具：ComfyUI（本机）
- 对齐：美术规范 v1.3（粗描边平涂）+ 场景俯视（桃源构图）

---

## 1. 和美术规范的边界

见 `文档体系.md`。一句话：规范定语义与验收；**本文定怎么点、贴什么词**。参考图路径：`docs/参考图/`、`docs/mockups/npc/`。

---

## 2. 底模与全局纪律

1. **全项目只锁一个 SDXL 卡通/插画底模**（名字写进下文「已锁定底模」；未填前禁止放量）。  
2. 同类型资产：**同采样器、同步数、同 CFG、同 IP-Adapter / ControlNet 权重**。  
3. 先 **小样拼版**（建议 7 张作物图标）过美术规范验收三关，再量产。  
4. 不要每张图换参考组合；换组合 = 新开一小样验收。  
5. 出图后去文字 / 水印 / UI；人类 NPC 负向词必须含 `cats as humans` 一类防兽人条款。

### 已锁定底模

| 项 | 值 |
|----|-----|
| Checkpoint | _（待填：你本机选用的模型文件名）_ |
| 采样器 | 建议 `euler` 或 `dpmpp_2m`（选定后勿换） |
| Steps | 图标 20–28；场景 24–32 |
| CFG | **5–7** |
| 可选风格 LoRA | _（有训再填；权重建议 0.6–0.8）_ |

---

## 3. 参考图挂载（ComfyUI 槽）

美术规范 §5 定义四槽语义；本文给 **节点侧默认权重**。

| 槽 | 用途 | 默认文件 | 节点 | 默认权重 |
|----|------|----------|------|----------|
| A 风格 | 几乎每张 | `参考图/动物/dw4.png` | IP-Adapter（style） | 0.55–0.70 |
| B 构图 | 仅俯视场景 | `参考图/桃源/bg2.png` 或 `bg5.png` / `bg7.png` | ControlNet Depth 或 SoftEdge | 0.45–0.65 |
| C 图标 | 菜/作物 | `参考图/动物/dw13.png`（辅 `dw8.png`） | IP-Adapter | 0.50–0.65 |
| D 身份 | NPC | `mockups/npc/sc1.png`（田伯方向） | IP-Adapter 第二路 / Face | 0.40–0.60 |

**不要**把 `dw1–dw3`、`dw9`、`dw11–12`、`dw15` 当主风格；`dw5/6/14` 只可学卡片构图，勿把动物脸接到人类 NPC。

多路控制同时开时：IP 风格略降到 **0.5–0.6**，避免糊成糊墙。

---

## 4. 三条工作流

### W1 · 小图标（作物 / 菜品）

1. 正向 = §6.1 风格前缀 + §6.3 主体句。  
2. IP-Adapter：槽 C（`dw13`，可选再挂 `dw8`）。  
3. 可选：简单碗/盘线稿 → ControlNet Lineart（0.4–0.6）。  
4. Empty Latent：**1024×1024**（或 768²）。  
5. 后期：抠白底 → 对齐描边棕观感 → 交付 256 / 128（见美术规范 §4.2）。

### W2 · 俯视场景（田地 / 厨房底等）

1. 正向 = §6.1 + §6.4。  
2. IP-Adapter：槽 A `dw4`（**0.5–0.6**，别太高）。  
3. ControlNet：槽 B 桃源田地参考，或自画色块网格草图。  
4. 分辨率：按竖屏比（如 1024×1536）再压到规范交付尺寸。  
5. 提示词写清下半为 UI 留白；去掉参考图里的萝卜精/UI。

### W3 · NPC 半身 / 头像

1. IP 风格：槽 A `dw4`。  
2. IP 身份：槽 D 定妆图（田伯现用 `sc1`；其他人补齐后再挂）。  
3. 正向只写身份/服装/表情（§6.5）；少堆风格长句。  
4. 画幅：方图或 3:4；胸以上；奶油/浅色纯底。  
5. 每人先刷约 20 张 → **只留 1 张定妆** →（可选）轻量角色 LoRA。  
6. `sc1` 进正式锚前：裁掉「AI 生成」字样；布纹过重则重出一版「弱纹理、粗描边平涂」再挂。

---

## 5. 推荐执行顺序（量产前）

1. 填好本文 §2「已锁定底模」。  
2. W1：7 个作物图标拼版 → 美术规范 **§5.4** 三关。  
3. W2：1 张田地俯视底图 → 叠现有 UI 看是否突兀。  
4. W3：田伯定妆收口 → 再补林婶 / 白婆婆 / 外婆。  
5. 通过后再：作物三阶段 → 菜品 → 四页场景 → 其余 NPC。

现有 `art-lib` / `bg-lib` 程序化资产可继续当 **线稿或色块底** 喂 ControlNet，不必一刀切扔掉。

---

## 6. 提示词模板（直接粘贴）

### 6.1 风格前缀（所有类型共用头）

```
hand-drawn 2D cozy game art, Animal Restaurant line language,
thick dark brown outlines, flat cel fill, soft warm cream palette,
minimal shading, rounded shapes, no photorealism, no 3D,
```

### 6.2 全局负向（共用）

```
photorealistic, 3d render, harsh black outlines, neon, cold gray,
watercolor heavy bleed, oily canvas texture, text, watermark, logo, UI,
extra limbs, deformed hands, blurry, noisy background, cats as humans
```

### 6.3 菜 / 作物图标

```
[把 6.1 贴在这里]
game item icon, centered, subject fills 70% of frame,
plain light cream background, clear silhouette,
[SUBJECT: e.g. a ceramic bowl of tomato egg stir-fry],
simple plate or bowl prop, readable at small size
```

### 6.4 俯视田地场景

```
[把 6.1 贴在这里]
top-down isometric farm scene, high angle,
grid farmland plots, warm afternoon light,
thatched cottage in upper area, soft grass paths,
lower half mostly open empty plots for UI placement,
cozy Chinese pastoral village, no UI, no text, tiny or no characters
```

挂槽 B 时：少写布局细节，多写材质与色感。

### 6.5 NPC（田伯示例）

```
[把 6.1 贴在这里]
elderly kind Chinese village farmer, bust portrait,
bushy white beard, straw hat, warm henley shirt,
crescent smiling eyes, soft blush, plain cream background,
human character, not an animal, chest-up, slight 3/4 view
```

其他人设：只换身份句；风格前缀与负向不动。口癖与性格以《故事线与人物规划》为准，提示词只写**看得见**的特征。

---

## 7. 出图后检查（进游戏前）

对照美术规范 **§5.4**：

1. 剪影 32px 可辨（图标）  
2. 光源左上一致  
3. 放进页面 / mockup 不突兀  
4. 无水印文字；色温偏暖；描边接近 `#4A3520`  
5. 场景下半留白未被高细节占满  

---

## 8. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-09-29 | 初版：四槽挂载、W1/W2/W3、提示词模板、与美术规范分工 |
| 2026-09-29 | 交叉引用收紧：文首链方案/故事线/体验底线；验收条款号改为规范 §5.4 |
| 2026-09-29 | 文首改角色/真源句式；§1 边界改指向 `文档体系.md` |
