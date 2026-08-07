/**
 * 一次性重建脚本：FieldButton0 彻底修复 + 灰盒布局重排（在编辑器关闭后运行！）。
 *
 * 背景：FieldButton0 曾被拖成 ItemButton 预制体，编辑器回存后场景里只剩预制体实例
 * 外壳（无点击事件、无文字绑定）。本脚本：
 *   A. 删除预制体实例及其全部关联条目（引用按下标重映射）；
 *   B. 深拷贝 FieldButton1 子树克隆出 FieldButton0（组件齐全，追加到数组末尾，无下标位移）；
 *   C. 把克隆体的 label 组件绑进 GameController.fieldLabels[0]，点击参数改为 "0"；
 *   D. 重排灰盒布局（同 fix-layout.js 的坐标方案），地块按钮 180x70，容器锚点顶部。
 * 用法：关闭 Cocos Creator 后 → node sim/rebuild-fieldbutton0.js → npm run check-scene
 */

const fs = require('fs');
const path = require('path');

const scenePath = path.join(__dirname, '..', 'assets', 'Main.scene');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

const idOf = (obj) => scene.indexOf(obj);
const byName = (name) => scene.find((e) => e.__type__ === 'cc.Node' && e._name === name);

// ---------- A. 删除预制体实例及关联条目 ----------
const instNodeIdx = scene.findIndex((e) => e.__type__ === 'cc.Node' && !e._name && e._prefab);
if (instNodeIdx >= 0) {
  const prefabInfoIdx = scene[instNodeIdx]._prefab.__id__;
  const instanceIdx = scene[prefabInfoIdx].instance.__id__;
  const overrideIdx = (scene[instanceIdx].propertyOverrides || []).map((r) => r.__id__);
  const targetIdx = overrideIdx
    .map((i) => scene[i].targetInfo && scene[i].targetInfo.__id__)
    .filter((i) => i !== undefined);
  // 编辑器新版本还会生成 cc.TargetOverrideInfo（挂在 PrefabInfo.targetOverrides 上）
  const targetOverrideIdx = scene
    .map((e, i) => (e.__type__ === 'cc.TargetOverrideInfo' ? i : -1))
    .filter((i) => i >= 0);
  const toRemove = new Set([
    instNodeIdx, prefabInfoIdx, instanceIdx,
    ...overrideIdx, ...targetIdx, ...targetOverrideIdx,
  ]);

  const canvas0 = byName('Canvas');
  canvas0._children = canvas0._children.filter((c) => c.__id__ !== instNodeIdx);
  for (const e of scene) {
    if (e.__type__ === 'cc.PrefabInfo' && !toRemove.has(idOf(e))) {
      if (e.nestedPrefabInstanceRoots) e.nestedPrefabInstanceRoots = null;
      if (e.targetOverrides) e.targetOverrides = null;
    }
  }

  const remap = (old) => {
    let shift = 0;
    for (const r of toRemove) if (r < old) shift++;
    return old - shift;
  };
  const kept = scene.filter((_, i) => !toRemove.has(i));
  const walk = (obj) => {
    if (Array.isArray(obj)) return obj.forEach(walk);
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__id__' && typeof v === 'number') {
        if (toRemove.has(v)) throw new Error(`悬空引用 → ${v}`);
        obj[k] = remap(v);
      } else walk(v);
    }
  };
  walk(kept);
  scene.length = 0;
  scene.push(...kept);
  console.log(`✅ A. 已删除预制体实例及关联条目 ${toRemove.size} 个`);
} else {
  console.log('⏭ A. 无预制体实例，跳过');
}

// ---------- B. 克隆 FieldButton1 → FieldButton0 ----------
if (byName('FieldButton0')) {
  console.log('⏭ B. FieldButton0 已存在，跳过克隆');
} else {
  const src = byName('FieldButton1');
  const srcLabelNode = scene.find(
    (e) => e.__type__ === 'cc.Node' && e._parent && e._parent.__id__ === idOf(src),
  );
  // 收集源子树：按钮节点 + 其组件 + label 子节点 + 其组件 + ClickEvent
  const srcEntries = [src, srcLabelNode];
  for (const n of [src, srcLabelNode]) {
    for (const c of n._components) srcEntries.push(scene[c.__id__]);
  }
  const clickEventIdx = [];
  for (const e of srcEntries) {
    if (e.__type__ === 'cc.Button') {
      for (const ev of e.clickEvents) clickEventIdx.push(ev.__id__);
    }
  }
  for (const i of clickEventIdx) srcEntries.push(scene[i]);

  // 深拷贝并追加到数组末尾，记录旧下标 → 新下标
  const oldIdx = srcEntries.map((e) => idOf(e));
  const map = new Map();
  const clones = srcEntries.map((e, k) => {
    const c = JSON.parse(JSON.stringify(e));
    map.set(oldIdx[k], scene.length);
    scene.push(c);
    return c;
  });
  // 重写克隆体内部引用
  const rewire = (obj) => {
    if (Array.isArray(obj)) return obj.forEach(rewire);
    if (!obj || typeof obj !== 'object') return;
    for (const [k, v] of Object.entries(obj)) {
      if (k === '__id__' && typeof v === 'number' && map.has(v)) obj[k] = map.get(v);
      else rewire(v);
    }
  };
  clones.forEach(rewire);

  const btnNode = clones[0];
  const labelNode = clones[1];
  btnNode._name = 'FieldButton0';
  btnNode._parent = { __id__: idOf(byName('Canvas')) };
  labelNode._name = 'label';
  // 点击参数改为 "0"
  for (const c of clones) {
    if (c.__type__ === 'cc.ClickEvent') c.customEventData = '0';
    if (c.__type__ === 'cc.Label') c._string = '地块1';
  }
  // 挂进 Canvas 子节点（插到 FieldButton1 前面）
  const canvas = byName('Canvas');
  const at = canvas._children.findIndex((c) => c.__id__ === idOf(src));
  canvas._children.splice(at >= 0 ? at : canvas._children.length, 0, { __id__: idOf(btnNode) });

  // ---------- C. 绑定 fieldLabels[0] ----------
  const gc = scene.find((o) => o && typeof o === 'object' && 'fieldLabels' in o);
  const labelCompIdx = labelNode._components.find((c) => scene[c.__id__].__type__ === 'cc.Label');
  gc.fieldLabels[0] = { __id__: labelCompIdx.__id__ };
  console.log('✅ B/C. FieldButton0 已克隆重建并绑定 fieldLabels[0]');
}

// ---------- D. 布局重排 ----------
const setPos = (name, x, y) => {
  const n = byName(name);
  if (!n) throw new Error(`找不到节点: ${name}`);
  n._lpos.x = x;
  n._lpos.y = y;
};
const utOf = (node) =>
  scene.find((e) => e.__type__ === 'cc.UITransform' && e.node.__id__ === idOf(node));

const positions = {
  GoldLabel: [0, 600],
  MessageLabel: [0, 550],
  SeedRoot: [-250, 500],
  FieldButton0: [-90, 480],
  FieldButton1: [130, 480],
  FieldButton2: [-90, 350],
  FieldButton3: [130, 350],
  KitchenLabel: [0, 270],
  KitchenRoot: [0, 230],
  CollectButton: [-180, -320],
  SellAllButton: [180, -320],
  DailyButton: [0, -440],
  InventoryLabel: [0, -560],
};
for (const [name, [x, y]] of Object.entries(positions)) setPos(name, x, y);

for (const name of ['FieldButton0', 'FieldButton1', 'FieldButton2', 'FieldButton3']) {
  const n = byName(name);
  const ut = utOf(n);
  ut._contentSize.width = 180;
  ut._contentSize.height = 70;
  const labelNode = scene.find(
    (e) => e.__type__ === 'cc.Node' && e._parent && e._parent.__id__ === idOf(n),
  );
  if (labelNode) {
    const lut = utOf(labelNode);
    lut._contentSize.width = 180;
    lut._contentSize.height = 70;
  }
}
for (const name of ['SeedRoot', 'KitchenRoot']) {
  const ut = utOf(byName(name));
  ut._anchorPoint.x = 0.5;
  ut._anchorPoint.y = 1;
}
console.log('✅ D. 布局已重排（三列 + 按钮 180x70 + 容器顶部锚点）');

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
console.log('🎉 Main.scene 已写回');
