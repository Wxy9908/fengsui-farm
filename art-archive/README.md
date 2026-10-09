# 原画 / 场景大图版本归档

与 **微信体验版号**、[`docs/release/game-releases.md`](../docs/release/game-releases.md) 对照使用。游戏内当前生效的是 `assets/resources/bg/*.jpg`；本目录只存历史快照，**不参与 Cocos 加载**。

## 目录约定

```text
art-archive/releases/
  0.4.0-vector-scene-bg/     # M4 测试版同期：程序化矢量烘焙（替换前从 git 导出）
  0.5.0-jimeng-scene-bg/     # M5-P1：即梦 field/kitchen/shop 入库快照
```

每个版本含 `manifest.json`（管线说明、git 提交、恢复方式）。

## 更新归档

替换场景大图后执行：

```bash
node sim/archive-art-releases.js
```

默认从 `git HEAD` 导出「上一版 in-game jpg」到 `0.4.0-*`；若需指定提交：

```bash
set ARCHIVE_GIT_REF=edf0b6d
node sim/archive-art-releases.js
```

（PowerShell 用 `$env:ARCHIVE_GIT_REF='edf0b6d'`）

## 恢复旧版画面（本地试玩）

1. 从 `0.4.0-vector-scene-bg/` 复制 `field.jpg` / `kitchen.jpg` / `shop.jpg` 到 `assets/resources/bg/`。  
2. **不要删** 对应 `.meta`。  
3. Cocos 中 Reimport 或重新预览。

即梦 PNG 真源只在 `docs/参考图/小样/`（`0.5.0-*` 归档内不再复制小样副本，见各版 `manifest.json` 的 `jimengSamplesCanonical`）。
