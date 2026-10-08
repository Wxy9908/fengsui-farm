# AI / 协作者：读文档从这里开始

本项目设计文档以 **`docs/` 英文 canonical 路径** 为唯一真源（无中文 redirect 文件）。

## 硬规则（30 秒）

1. 打开 **[docs/README.md](docs/README.md)** → 找任务对应文档。  
2. 改「谁写啥 / 同步谁」只看 **[docs/doc-governance.md](docs/doc-governance.md)**。  
3. **状态勾选**：里程碑 → `docs/development-plan.md`；体验底线 → `docs/experience-roadmap.md`。  
4. **数值真值** → `data/*.json`；文档只写字段与原则。  
5. **长文已拆分**：叙事见 `docs/narrative/` 子文件；即梦见 `jimeng-workflow.md` + `jimeng-prompts.md`。勿在索引页堆新正文。  
6. **新建或拆分** `docs/**/*.md` → 必读 **[docs/how-to-author-docs.md](docs/how-to-author-docs.md)**（模板 + 登记三件套）。  
7. 改 `docs/**/*.md` 时遵守 [.cursor/rules/docs-authority.mdc](.cursor/rules/docs-authority.mdc)。

## 常见任务路由

| 任务 | 文档 |
|------|------|
| 批次 / 范围 / 大事记 | `docs/development-plan.md` |
| 停车场想法 | `docs/planning/parking-lot.md` |
| 人设 / 主线 / 祭典 | `docs/narrative/`（从 `story-and-characters.md` 索引进入） |
| 好感触发 | `docs/narrative/affinity-design.md` |
| 字段 / 存档 | `docs/gameplay/data-schema.md` |
| 组合 / 发现率 | `docs/gameplay/recipe-combo-design.md` |
| 画风 | `docs/art/art-style-guide.md` |
| 即梦操作 / 提示词 | `docs/art/jimeng-workflow.md` / `jimeng-prompts.md` |
| 机器可读目录 | `docs/_meta/doc-registry.yaml` |

资产图（非 md）：`docs/mockups/`、`docs/参考图/`。
