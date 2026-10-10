# 作物收获 UI 贴纸小样（§6.3B）

| 正式文件名 | 用途 |
|------------|------|
| `<cropId>.png` | 种子 / 厨房 / 图鉴 / 背包（与田里 `icons/crops/` 三档分离） |

**工作流**

1. 即梦出图 → 画布抠图 → 导出 PNG，存为 `{cropId}_抠图.png`。
2. `npm run organize-crop-ui-samples`：去水印、裁透明边、覆盖正式名；抠图源归档到 `_archive/pre-cutout-replace/`。
3. `npm run import-jimeng-crops-ui` → `assets/resources/icons/crops-ui/`。
