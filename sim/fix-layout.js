/**
 * 一次性布局修复脚本（M2-1 灰盒 UI 问题修复）：
 * 1. FieldButton0 误挂在 Scene 根节点下（导致渲染偏移、点击失效）→ 移回 Canvas；
 * 2. 灰盒 UI 重新排布，解决按钮/文字互相遮挡；
 * 3. 地块按钮放大到 180x70，容纳两行文字。
 * 用法：node sim/fix-layout.js（改完用 npm run check-scene 验证接线）
 */

const fs = require('fs');
const path = require('path');

const scenePath = path.join(__dirname, '..', 'assets', 'Main.scene');
const scene = JSON.parse(fs.readFileSync(scenePath, 'utf8'));

// 注意：Cocos 序列化中元素没有 __id__ 字段，数组下标即 id，引用是 {__id__: 下标}
const idOf = (obj) => scene.indexOf(obj);
const byName = (name) => scene.find((e) => e.__type__ === 'cc.Node' && e._name === name);
const utOf = (node) =>
  scene.find((e) => e.__type__ === 'cc.UITransform' && e.node.__id__ === idOf(node));

const setPos = (name, x, y) => {
  const n = byName(name);
  if (!n) throw new Error(`找不到节点: ${name}`);
  n._lpos.x = x;
  n._lpos.y = y;
};

// ---------- 1. FieldButton0 移回 Canvas ----------
const sceneRoot = scene.find((e) => e.__type__ === 'cc.Scene');
const canvas = byName('Canvas');
const field0 = byName('FieldButton0');
const field1 = byName('FieldButton1');

const idx = sceneRoot._children.findIndex((c) => c.__id__ === idOf(field0));
const inCanvas = canvas._children.some((c) => c.__id__ === idOf(field0));
if (idx >= 0) {
  sceneRoot._children.splice(idx, 1);
  // 插到 FieldButton1 前面，保持渲染顺序一致
  const at = canvas._children.findIndex((c) => c.__id__ === idOf(field1));
  canvas._children.splice(at >= 0 ? at : canvas._children.length, 0, { __id__: idOf(field0) });
  field0._parent = { __id__: idOf(canvas) };
  console.log('✅ FieldButton0 已从 Scene 根移回 Canvas');
} else if (inCanvas) {
  console.log('⏭ FieldButton0 已在 Canvas 下，跳过');
} else {
  // 孤儿节点（_parent=null，不在任何 children 列表）→ 直接挂到 Canvas
  const at = canvas._children.findIndex((c) => c.__id__ === idOf(field1));
  canvas._children.splice(at >= 0 ? at : canvas._children.length, 0, { __id__: idOf(field0) });
  field0._parent = { __id__: idOf(canvas) };
  console.log('✅ FieldButton0 孤儿节点已挂到 Canvas');
}

// ---------- 2. 重新排布（设计分辨率 720x1280，原点居中） ----------
const positions = {
  GoldLabel: [0, 600],
  MessageLabel: [0, 550],
  SeedRoot: [-250, 500], // 左列：种子列表（锚点改到顶部，向下生长）
  FieldButton0: [-90, 480],
  FieldButton1: [130, 480],
  FieldButton2: [-90, 350],
  FieldButton3: [130, 350],
  KitchenLabel: [0, 270],
  KitchenRoot: [0, 230], // 中列：厨房面板（锚点顶部，向下生长）
  CollectButton: [-180, -320],
  SellAllButton: [180, -320],
  DailyButton: [0, -440],
  InventoryLabel: [0, -560],
};
for (const [name, [x, y]] of Object.entries(positions)) setPos(name, x, y);
console.log('✅ 节点位置已重排');

// ---------- 3. 地块按钮放大 + 容器锚点 ----------
for (const name of ['FieldButton0', 'FieldButton1', 'FieldButton2', 'FieldButton3']) {
  const n = byName(name);
  const ut = utOf(n);
  ut._contentSize.width = 180;
  ut._contentSize.height = 70;
  // 按钮上的文字框同步放大
  const labelNode = scene.find(
    (e) => e.__type__ === 'cc.Node' && e._parent && e._parent.__id__ === idOf(n),
  );
  if (labelNode) {
    const lut = utOf(labelNode);
    lut._contentSize.width = 180;
    lut._contentSize.height = 70;
  }
}
console.log('✅ 地块按钮放大到 180x70');

for (const name of ['SeedRoot', 'KitchenRoot']) {
  const ut = utOf(byName(name));
  ut._anchorPoint.x = 0.5;
  ut._anchorPoint.y = 1; // 顶部锚点：动态列表向下生长，不再上下乱扩
}
console.log('✅ 容器锚点设为顶部居中');

fs.writeFileSync(scenePath, JSON.stringify(scene, null, 2));
console.log('🎉 Main.scene 已写回');
