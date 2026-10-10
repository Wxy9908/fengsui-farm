# UI 导航 / 地图热点小样

| 正式文件名 | 用途 |
|------------|------|
| `map.png` / `bag.png` | 右下角地图、背包入口 |
| `map_place_*.png` | 地图页热点叠层 |
| `map_bg.png` | 地图页底图小样（走 `import-jimeng-bg`，不在本目录 icon 脚本里） |

**工作流**

1. 即梦出图 → 画布抠图 → 导出 PNG，可先存为 `{name}_抠图.png`。
2. `npm run sync-ui-cutout-icons`：去水印、裁透明边、覆盖上表正式名；抠图源归档到 `_archive/pre-cutout-replace/`。
3. `npm run import-jimeng-ui-icons` → `assets/resources/icons/ui/`。
