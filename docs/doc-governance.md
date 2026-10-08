---
doc_id: governance.doc-governance
title: 文档体系
doc_kind: spec
authority: [真源表, 反打架规则, 同步检查单, 目录与命名规范]
related:
  - path: README.md
    rel: cross-ref
  - path: _meta/doc-registry.yaml
    rel: cross-ref
---

# 文档体系（真源与维护纪律）

> **本文是文档怎么分工的唯一真源。**  
> 改「某类事实写在哪 / 改完要同步谁」只改本文；其它文档文首只保留一句话角色 + 链到本文。  
> **入口**：`docs/README.md`、仓库根 `AGENTS.md`；机器目录：`docs/_meta/doc-registry.yaml`。

- 创建：2026-09-29 · v2 结构：2026-10-08（拆叙事/即梦/停车场；删除中文 redirect）

---

## 0. 目录与命名（canonical）

| 目录 | 含义 |
|------|------|
| `docs/` 根 | 总览四件 + `README` + `doc-governance` |
| `planning/` | 未排期想法（停车场） |
| `narrative/` | 叙事专题（**索引** `story-and-characters.md` + 子文件） |
| `gameplay/` | 配置契约、组合设计 |
| `art/` | 画风 + 即梦（**索引** `jimeng-pipeline.md` + workflow/prompts） |
| `release/` | 提审清单 |
| `mockups/`、`参考图/` | **资产区**（仅图片，不放 md 规格） |

- 文件名：**kebab-case 英文**；`title` 与 H1 用中文。  
- **`doc_kind: index`**：只放摘要与链接，**禁止**在索引页追加长篇真源正文。  
- 无中文 redirect；旧路径不再维护。

---

## 1. 现行文档一览

| 文档 | 角色 | 真源范围 | 明确不写 |
|------|------|----------|----------|
| `development-plan.md` | 总方案 | 支柱、范围、§6 批次勾选、技术、大事记 | 停车场表、提示词、对白、字段细则 |
| `planning/parking-lot.md` | 停车场 | 未排期想法表 | 批次状态 |
| `experience-roadmap.md` | 体验过关 | 四线阶梯、§4 底线勾选 | 画法、出图、剧情全文 |
| `narrative/story-and-characters.md` | 叙事**索引** | 变更摘要、专题路由表 | 长篇人设/主线正文 |
| `narrative/worldview-and-tone.md` | 世界观 | 定位、世界观、序章、地图 | 批次状态 |
| `narrative/systems-and-reputation.md` | 叙事系统 | 三件套、声望轴 | 数值真值 |
| `narrative/characters.md` | 人物 | 6 人设定、交集剧情 | 好感触发表 |
| `narrative/plot-and-festival.md` | 剧情结构 | 主线、支线、丰收祭 | 批次状态 |
| `narrative/narrative-data-contract.md` | 叙事数据 | 表结构、存档、菜品文本、UI | 玩法数值 |
| `narrative/story-roadmap.md` | 故事分期 | 故事侧要点 | ✅ 批次状态 |
| `narrative/copy-guide.md` | 文案 | 口癖、回响、审定 | 对白全文 |
| `narrative/tutorial-by-dialogue.md` | 引导 | 对话式教学 | 任务板 UI |
| `narrative/risks-and-open-questions.md` | 风险/待决 | 风险、§12 待拍板 | 状态勾选 |
| `narrative/affinity-design.md` | 好感 | 阈值、触发 ↔ stories | 人设长文 |
| `gameplay/data-schema.md` | 数据契约 | 字段、存档、经济原则 | 发现率长文 |
| `gameplay/recipe-combo-design.md` | 组合 | 发现率、命中、菜名 §4.2 | 价目真值 |
| `art/art-style-guide.md` | 画风 | 色板、透视、验收语义 | 提示词全文、操作步骤 |
| `art/jimeng-pipeline.md` | 即梦**索引** | 路由 | 正文 |
| `art/jimeng-workflow.md` | 即梦操作 | 设置、顺序、入库 | 提示词全文 |
| `art/jimeng-prompts.md` | 即梦提示词 | §6 粘贴模板 | 批次状态 |
| `art/comfyui-pipeline-deprecated.md` | 停用指针 | 链到即梦 | 一切操作 |
| `release/wechat-minigame-checklist.md` | 提审 | 勾选清单 | 玩法/画风 |
| `dev-log.md` | 史料 | 只追加 | 现行规格 |
| `README.md` | 地图 | 树、路由 | 玩法真源 |
| `how-to-author-docs.md` | 写作规范 | 模板、登记三件套 | 玩法真源 |
| **本文** | 分工纪律 | 本表、§2–§4 | 游戏内容 |

---

## 2. 反打架规则（硬）

1. **一事实一真源** — 上表「真源范围」列。  
2. **索引不是第二真源** — `story-and-characters`、`jimeng-pipeline` 只链子文档。  
3. **状态勾选** — 仅 `development-plan.md` §6、`experience-roadmap.md` §4。  
4. **数值** — `data/*.json` + sim。  
5. **日志** — `dev-log.md` 不当规格。  
6. **即梦** — 操作 `jimeng-workflow.md`，提示词 `jimeng-prompts.md`。

---

## 3. 改完同步检查单

### 3.1 画风 / 出图

- [ ] `art/art-style-guide.md`  
- [ ] `art/jimeng-workflow.md` 或 `jimeng-prompts.md`（视改动）  
- [ ] `experience-roadmap.md`（若动体验底线）  
- [ ] `development-plan.md` 大事记 + `dev-log.md` 一行  

### 3.2 人物 / 对白 / 祭典

- [ ] 对应 `narrative/*.md` 子文件（勿只改索引）  
- [ ] `narrative/affinity-design.md`（若动触发）  
- [ ] `data/npcs.json` / `stories.json`  
- [ ] `dev-log.md` 一行  

### 3.3 数值 / 组合

- [ ] `data/*.json`  
- [ ] `gameplay/data-schema.md` 或 `recipe-combo-design.md`  
- [ ] `npm run sim` / `balance`  

### 3.4 里程碑 / 停车场

- [ ] `development-plan.md` §6（状态）  
- [ ] `planning/parking-lot.md`（仅新想法入停车场）  
- [ ] 新文档：更新 **本文 §1** + `README.md` + `_meta/doc-registry.yaml`

---

## 4. 文首标准

YAML frontmatter（`doc_id`、`title`、`doc_kind`）+ blockquote 四句（角色/真源/不写/分工）。

**新建/拆分文档的操作步骤、复制模板、登记清单** → **[how-to-author-docs.md](how-to-author-docs.md)**（与 AI 写文档时必读）。

---

## 5. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-09-29 | 初版 |
| 2026-10-08 | 英文路径 + README；redirect 桩 |
| 2026-10-08 | **v2**：删 redirect；叙事/即梦/停车场拆分；`AGENTS.md` + registry |
