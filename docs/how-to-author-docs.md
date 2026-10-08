---
doc_id: governance.how-to-author
title: 新建文档规范
doc_kind: spec
authority: [文档写作纪律, 模板, 登记流程]
related:
  - path: doc-governance.md
    rel: cross-ref
  - path: README.md
    rel: cross-ref
---

# 新建文档规范（v2）

> **角色**：以后**新增或拆分** `docs/**/*.md` 时，人类与 AI 都按本文执行。  
> **真源**：文件名、frontmatter、文首 blockquote、登记三件套、索引纪律。  
> **不写**：玩法数值真值、批次 ✅ 勾选、整段复述其它文档已有内容。  
> **文档分工**：总表与反打架见 [doc-governance.md](doc-governance.md) §1–§2。

---

## 1. 放哪、叫什么

| 内容类型 | 目录 | 文件名 |
|----------|------|--------|
| 里程碑 / 范围 / 大事记 | `docs/` 根 | 已有 `development-plan.md`，一般**不新建**平行总方案 |
| 未排期想法 | `planning/` | `kebab-case.md`，如 `parking-lot.md` |
| 叙事、人设、剧情、文案 | `narrative/` | 子文件；入口 `story-and-characters.md` 只做索引 |
| 字段、存档、组合 | `gameplay/` | 如 `data-schema.md` |
| 画风、出图 | `art/` | 操作与提示词**分开**（参考 `jimeng-workflow` / `jimeng-prompts`） |
| 提审 / 发布 | `release/` | 如 `wechat-minigame-checklist.md` |
| 过程记录 | `docs/` 根 | 只用 `dev-log.md` **追加**，不新建第二份日志 |
| 图片 / 原型 | `mockups/`、`参考图/` | **禁止**在此目录新建 `.md` 规格 |

- 文件名：**英文 kebab-case** + `.md`  
- 展示名：**中文**，写在 `frontmatter.title` 与 `#` 标题  
- `doc_id`：点分 ID，与路径对应，如 `narrative.my-topic` → `narrative/my-topic.md`

---

## 2. `doc_kind` 怎么用

| doc_kind | 用途 | 正文要求 |
|----------|------|----------|
| `spec` | 规格真源 | 完整叙述，但遵守「一事实一真源」 |
| `index` | 索引 | 摘要表 + 链接；**禁止**堆长篇真源 |
| `changelog` | 史料 | 仅 `dev-log.md` |
| `redirect` | （已废弃） | v2 起**不再创建** |

一篇文档若超过约 **~250 行**或含两个明显独立主题 → **拆文件** + 父级改 `index`，并在 `doc-governance` §1 登记。

---

## 3. 文首模板（复制即用）

### 3.1 规格文档 `spec`

```markdown
---
doc_id: gameplay.my-feature
title: 我的功能设计
doc_kind: spec
authority: [本文件独有的真源关键词]
related:
  - path: data-schema.md
    rel: data-contract
  - path: ../development-plan.md
    rel: milestone-status
data_refs:                          # 可选
  - data/foo.json
---

# 我的功能设计（中文标题可与 title 一致）

> **角色**：一句话：本文管什么。  
> **真源**：只在这里写的完整表述范围。  
> **不写**：明确指向其它文档或 data（带路径）。  
> **文档分工**：见 `docs/doc-governance.md`

（正文从 ## 开始）
```

`related[].rel` 只能用：`milestone-status` | `experience-gate` | `data-contract` | `art-pipeline` | `narrative` | `cross-ref`

### 3.2 索引文档 `index`

```markdown
---
doc_id: narrative.story-and-characters
title: 故事线与人物规划
doc_kind: index
related:
  - path: worldview-and-tone.md
    rel: narrative
---

# …

## 专题文档

| 文档 | 内容 |
|------|------|
| [worldview-and-tone.md](worldview-and-tone.md) | … |

（不写长篇人设/剧情正文）
```

---

## 4. 正文纪律（AI 尤其要遵守）

1. **一事实一真源** — 色板、提示词全文、批次表、体验底线表：只链 `详见 path §x`，禁止复制。  
2. **状态** — 完成与否只写 `development-plan.md` §6；体验底线只写 `experience-roadmap.md` §4。  
3. **数值** — 售价、时长、周期只写 `data/*.json`；设计文档写原则与字段名。  
4. **链接** — 一律用 **相对 canonical 路径**（如 `gameplay/data-schema.md`），不用已删除的中文文件名。  
5. **资产** — 图在 `mockups/`、`参考图/`；规格里只写路径与验收语义。

---

## 5. 新建文档必做登记（三件套）

新增或拆分出**新文件**后，在同一 PR/提交里完成：

- [ ] [doc-governance.md](doc-governance.md) **§1** 增加一行（路径 / 角色 / 真源 / 不写）  
- [ ] [README.md](README.md) 树状目录 +（若常用）30 秒路由表加一行 **中文用途**  
- [ ] [_meta/doc-registry.yaml](_meta/doc-registry.yaml) 增加 `path / doc_id / title / kind / purpose_zh`  

若属某 **index** 子专题，还要：

- [ ] 在对应 index（如 `story-and-characters.md`）专题表里加链接  

里程碑级变更再追加：

- [ ] `development-plan.md` 大事记一行 + `dev-log.md` 一行  

---

## 6. 什么时候不新建文件

| 情况 | 做法 |
|------|------|
| 只是未排期想法 | 记入 `planning/parking-lot.md` 表格 |
| 过程讨论、根因 | 只追加 `dev-log.md` |
| 改批次是否完成 | 只改 `development-plan.md` §6 |
| 与现有文档同主题 | **扩写原真源**或拆子文件，不要第二份平行真源 |

---

## 7. Cursor / AI 生成文档时

1. 先读 `AGENTS.md` → `README.md` → `doc-governance.md` §1，确认没有已有真源。  
2. 按 §3 模板创建文件，填全 frontmatter。  
3. 执行 §5 三件套。  
4. 遵守 [.cursor/rules/docs-authority.mdc](../.cursor/rules/docs-authority.mdc)。

---

## 8. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-10-08 | v2 初版：与目录拆分、registry 对齐 |
