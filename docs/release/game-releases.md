---
doc_id: release.game-releases
title: 游戏版本与内容记录
doc_kind: spec
authority: [体验版号, 发布说明, 原画归档索引]
related:
  - path: wechat-minigame-checklist.md
    rel: release
  - path: ../art/jimeng-workflow.md
    rel: art
---

# 游戏版本与内容记录

> **角色**：玩家可见版本号与每次体验版「换了什么」的简表。  
> **真源**：`data/config.json` 的 `releaseVersion` / `releaseNotes`；原画文件快照在仓库 `art-archive/`。  
> **不写**：里程碑批次勾选（→ `development-plan.md` §6）、开发过程细节（→ `dev-log.md`）。  
> **文档分工**：见 [doc-governance.md](../doc-governance.md)

微信开发者工具上传时的**版本号**请与下表 `releaseVersion` 一致（上次体验版：**0.4.0**；仓库当前：**0.7.0**）。

| releaseVersion | 日期 | 微信体验版 | 内容摘要 | 原画归档 |
|----------------|------|------------|----------|----------|
| **0.4.0** | 2026-08-11 | ✅ 真机验收 | M4 测试版：BGM/音效、loading、原型 v3 UI、M5-P0 前玩法 | `art-archive/releases/0.4.0-vector-scene-bg/` |
| **0.5.0** | 2026-10-08 | （未单独上传） | 即梦场景入库中间态；见 0.6.0 合并说明 | `art-archive/releases/0.5.0-jimeng-scene-bg/` |
| **0.6.0** | 2026-10-09 | 待上传 | M5-P1 体验收官 + M6 方案；四场景/loading、小铺账单弹窗、薄好感与出锅事件 | 同 0.5.0 场景集 + `docs/mockups/p1-v2-jimeng-scenes.png` |
| **0.7.0** | 2026-10-10 | 待上传 | **M6-P0**：地图 `map_bg` + `map_place_*` 热点、主线 unlock、背包抽屉、右下角 bag/map、存档 v4 | `assets/resources/bg/map.jpg` + `icons/ui/` |

## 0.7.0 明细

- **版本**：`releaseVersion` 0.7.0；**M6-P0** 批次收口（`development-plan.md` §6.6）。  
- **玩法**：`main_quests.json` 章一主线；`hasUnlock` 门控地图/食堂/背包；收菜解锁背包（`mq_ch1_bag`）。  
- **UI**：丰穗镇地图页；右下角双 icon 入口；背包底部抽屉 + 分区列表；主线任务条；隐藏订单 tab、`affinityStoriesEnabled` 关闭。  
- **存档**：`newgame_save_v4`（v3 迁移补 unlock）。  
- **待做**：M6-P0′ 背包内页改版；M6-P1 果园与 `crops.type`。

## 0.6.0 明细

- **版本**：`releaseVersion` 0.6.0；里程碑文档 M5 收口、**M6** 小镇扩展（`planning/m6-town-expansion.md`），提审顺延 **M7**。  
- **场景/UI**：即梦 `field`/`kitchen`/`shop`/`loading`；`BG_UI` 锚点对齐；厨房铲拨 `potFx`、`stir` 音效；小铺 `previewSellAllBill` 确认弹窗、升级区滚动。  
- **叙事**：前期三人薄好感 + `onDishCollect` / `onOrderDeliver`；`stories.json` 扩表。  
- **数据**：`crops.type` 口径写入 `data-schema`（json 待 M6-P1 落地）。  
- **待做**：M6-P0 地图 + 背包；微信体验版上传时用 **0.6.0**。

## 0.5.0 明细（历史）

- **场景**：`npm run import-jimeng-bg`（`field`/`kitchen`/`shop`/`loading` 小样 → `assets/resources/bg/*.jpg`）；`loading` 为即梦整幅海报，勿用 `gen-loading.js` 覆盖。  
- **玩法/UI（2026-10-09）**：四页 `BG_UI` 对齐即梦底图；厨房 `potFx` 铲拨+轻颠、`stir` 换轨；小铺「全部卖出」账单确认弹窗（`previewSellAllBill`）、升级区纵向吸附滚动（一屏约 3 卡）。  
- **未改**：`book` 仍矢量管线；图标仍为程序化矢量。  
- **待做**：P1-A1 真机听感/包体；P1 宣称完成前余下体验底线。P1-V2 小样拼版 ✅；薄好感前期三人已入库。  

## 版本号改法（下次发体验版）

1. 改 `data/config.json`：`releaseVersion`、`releaseNotes`。  
2. `npm run sync-data`。  
3. 改 `package.json` 的 `version`（与 `releaseVersion` 对齐）。  
4. 更新本表一行 + `dev-log.md` 一行。  
5. 若替换场景大图：`node sim/archive-art-releases.js` 更新 `art-archive/`。  
6. 微信开发者工具上传时使用同一 `releaseVersion`。
