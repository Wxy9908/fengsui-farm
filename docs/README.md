---
doc_id: index.readme
title: 文档索引
doc_kind: index
---

# 丰穗小镇 · 文档索引（v2）

仓库根 **[AGENTS.md](../AGENTS.md)** 给 AI 的硬规则。本文是完整地图。**只编辑英文路径**；无中文 redirect。

---

## 30 秒路由

| 你想改… | 路径 | 中文名 | 用途 |
|--------|------|--------|------|
| 批次 / 范围 / 大事记 | [development-plan.md](development-plan.md) | 游戏开发方案 | 总方案与 §6 勾选 |
| 停车场想法 | [planning/parking-lot.md](planning/parking-lot.md) | 灵感停车场 | 未排期想法表 |
| M6 玩法范围 | [planning/m6-town-expansion.md](planning/m6-town-expansion.md) | M6 小镇扩展 | 果园/地图/背包与批次顺序 |
| 体验底线 | [experience-roadmap.md](experience-roadmap.md) | 体验内容开发方向 | 四线阶梯 + §4 勾选 |
| 文档分工 | [doc-governance.md](doc-governance.md) | 文档体系 | 真源表与纪律 |
| **新建文档怎么写** | [how-to-author-docs.md](how-to-author-docs.md) | 新建文档规范 | 模板、登记、AI 写作纪律 |
| 叙事（入口） | [narrative/story-and-characters.md](narrative/story-and-characters.md) | 故事线索引 | 链到各叙事子文档 |
| 好感触发 | [narrative/affinity-design.md](narrative/affinity-design.md) | 好感度设计 | 条件 ↔ stories.json |
| 字段 / 存档 | [gameplay/data-schema.md](gameplay/data-schema.md) | 数据表设计 | 配置契约 |
| 主线 / 功能解锁 | [gameplay/main-quest-design.md](gameplay/main-quest-design.md) | 主线任务设计 | 章一节奏与 unlock |
| 背包内页 | [gameplay/bag-ui-design.md](gameplay/bag-ui-design.md) | 背包内页 UI 设计 | M6 H4b 规格与验收 |
| 组合 / 发现率 | [gameplay/recipe-combo-design.md](gameplay/recipe-combo-design.md) | 组合表设计 | 组合原则 |
| 画风 | [art/art-style-guide.md](art/art-style-guide.md) | 美术风格规范 | 色板与验收 |
| 即梦（入口） | [art/jimeng-pipeline.md](art/jimeng-pipeline.md) | 即梦索引 | 链 workflow / prompts |
| 即梦操作 | [art/jimeng-workflow.md](art/jimeng-workflow.md) | 即梦流程 | 界面、顺序、入库 |
| 即梦提示词 | [art/jimeng-prompts.md](art/jimeng-prompts.md) | 提示词模板 | 粘贴用 §6 |
| 微信提审 | [release/wechat-minigame-checklist.md](release/wechat-minigame-checklist.md) | 发布清单 | M7 勾选 |
| 体验版号 / 更新说明 | [release/game-releases.md](release/game-releases.md) | 版本记录 | 与 config.releaseVersion 一致 |
| 史料 | [dev-log.md](dev-log.md) | 开发日志 | 只追加 |

---

## 完整目录（中文说明）

```text
docs/
  README.md                         # 本索引
  doc-governance.md                 # 分工真源、反打架、检查单
  how-to-author-docs.md             # 新建/拆分文档的模板与登记流程（AI 必遵）
  development-plan.md               # 里程碑、批次 ✅、技术、大事记
  experience-roadmap.md             # 体验过关线与底线勾选
  dev-log.md                        # 开发日志（非现行规格）
  _meta/doc-registry.yaml           # 机器可读目录（与本文同步）
  planning/
    parking-lot.md                  # 灵感停车场真源表
    m6-town-expansion.md            # M6 小镇扩展范围与硬指标
  narrative/
    story-and-characters.md         # 叙事索引（摘要 + 子文档表）
    worldview-and-tone.md           # 世界观、序章、地图
    systems-and-reputation.md       # 三件套 + 声望轴
    characters.md                   # 六人设定 + 交集剧情
    plot-and-festival.md            # 主线、支线、丰收祭
    narrative-data-contract.md      # npcs/stories、存档、UI
    story-roadmap.md                # 故事侧分期（不写 ✅）
    copy-guide.md                   # 文案规范
    tutorial-by-dialogue.md         # 叙事化引导
    risks-and-open-questions.md     # 风险与待决策
    affinity-design.md              # 好感触发对照表
  gameplay/
    data-schema.md                  # 字段与存档契约
    recipe-combo-design.md          # 组合与发现率
  art/
    art-style-guide.md              # 画风真源
    jimeng-pipeline.md              # 即梦索引
    jimeng-workflow.md              # 即梦操作与阶段
    jimeng-prompts.md               # 即梦提示词全文
    comfyui-pipeline-deprecated.md  # ComfyUI 停用指针
  release/
    game-releases.md                  # 体验版号与内容变更
    wechat-minigame-checklist.md    # 提审清单
  mockups/                          # UI 原型 SVG/PNG（程序生成）
  参考图/                           # AI 参考与小样 png
```

---

## 文档 ↔ 代码 / data

| 文档 | 关联 |
|------|------|
| `gameplay/data-schema.md` | `data/*.json`、`assets/scripts/core/types.ts` |
| `narrative/affinity-design.md` | `data/stories.json`、`data/npcs.json` |
| `narrative/narrative-data-contract.md` | 叙事表字段约定 |
| `art/jimeng-workflow.md` | `docs/参考图/小样/` 入库路径 |
| `release/game-releases.md` | `data/config.json` `releaseVersion`、`art-archive/` |
| `art/art-style-guide.md` | `sim/art-lib.js`、`sim/gen-mockups.js` |

---

## 阅读顺序（新会话）

1. [doc-governance.md](doc-governance.md)  
2. [development-plan.md](development-plan.md) §6  
3. 按任务进入 `narrative/`、`gameplay/` 或 `art/` — **长文读子文件，不扫索引全文**
