/**
 * 一次性清理脚本：删除场景里误生成的 ItemButton 预制体实例（被改名为 FieldButton0 的死按钮）。
 * 背景：编辑器里把 FieldButton0 拖成预制体时产生了一个实例副本 + 一个孤儿原件；
 * 原件已在 fix-layout.js 中挂回 Canvas，本脚本删除实例副本。
 * 难点：场景 JSON 用数组下标做引用（{__id__: n}），删除条目后必须整体重映射下标。
 * 用法：node sim/cleanup-duplicate-fieldbutton.js（之后跑 npm run check-scene 验证）
 */

const fs = require('fs');
const path = require('path');

const scenePath = path.join(__dirname, '..', 'assets', 'Main.scene');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// ---------- 1. 找到要删除的条目 ----------
// 预制体实例根节点：没有 _name、带 _prefab 的 cc.Node（场景中唯一的预制体实例）
const instNodeIdx = scene.findIndex(
  (e) => e.__type__ === 'cc.Node' && !e._name && e._prefab,
);
if (instNodeIdx < 0) {
  console.log('⏭ 场景里没有预制体实例节点，无需清理');
  process.exit(0);
}
const prefabInfoIdx = scene[instNodeIdx]._prefab.__id__;
const prefabInfo = scene[prefabInfoIdx];
const instanceIdx = prefabInfo.instance.__id__;
const instance = scene[instanceIdx];
const overrideIdx = (instance.propertyOverrides || []).map((r) => r.__id__);
// 属性覆盖里嵌套的 cc.TargetInfo
const targetIdx = overrideIdx
  .map((i) => scene[i].targetInfo && scene[i].targetInfo.__id__)
  .filter((i) => i !== undefined);

const toRemove = new Set([instNodeIdx, prefabInfoIdx, instanceIdx, ...overrideIdx, ...targetIdx]);
console.log('将删除条目:', [...toRemove].sort((a, b) => a - b).join(', '));

// ---------- 2. 下标重映射 ----------
const remap = (old) => {
  let shift = 0;
  for (const r of toRemove) if (r < old) shift++;
  return old - shift;
};

// 递归遍历整个 JSON，替换所有 {__id__: n} 引用；遇到指向待删条目的引用则报错（不应存在）
const walk = (obj, pathStr) => {
  if (Array.isArray(obj)) {
    for (const item of obj) walk(item, pathStr);
    return;
  }
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (k === '__id__' && typeof v === 'number') {
      if (toRemove.has(v)) throw new Error(`发现指向待删条目的悬空引用: ${pathStr} → ${v}`);
      obj[k] = remap(v);
    } else {
      walk(v, `${pathStr}.${k}`);
    }
  }
};

// ---------- 3. 先处理特殊引用，再整体重映射 ----------
// Canvas._children 里的实例节点引用（直接移除，不参与 remap）
const canvas = scene.find((e) => e.__type__ === 'cc.Node' && e._name === 'Canvas');
canvas._children = canvas._children.filter((c) => c.__id__ !== instNodeIdx);

// cc.Scene 的 _prefab.nestedPrefabInstanceRoots 置空
for (const e of scene) {
  if (e.__type__ === 'cc.PrefabInfo' && e.nestedPrefabInstanceRoots) {
    e.nestedPrefabInstanceRoots = null;
    console.log('✅ 已清空 scene PrefabInfo.nestedPrefabInstanceRoots');
  }
}

// 把待删条目自身也从遍历中排除：先置 null，walk 时跳过
const removed = [...toRemove].sort((a, b) => b - a);
const kept = scene.filter((_, i) => !toRemove.has(i));
walk(kept, 'root');

fs.writeFileSync(scenePath, JSON.stringify(kept, null, 2));
console.log(`🎉 已删除 ${removed.length} 个条目并写回 Main.scene`);
