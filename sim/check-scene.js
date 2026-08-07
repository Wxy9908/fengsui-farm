/**
 * 场景接线检查器：解析 assets/Main.scene，验证灰盒 UI 的绑定是否完整。
 * 用法：npm run check-scene（每次在编辑器里改完场景并 Ctrl+S 后运行）
 */
const fs = require('node:fs');
const path = require('node:path');

const file = path.join(__dirname, '..', 'assets', 'Main.scene');
const arr = JSON.parse(fs.readFileSync(file, 'utf-8'));

const byId = (i) => arr[i];
const typeOf = (o) => o && o.__type__;
const nameOfNode = (ref) => {
  const n = byId(ref.__id__);
  return n ? n._name : `?#${ref.__id__}`;
};

let errors = 0;
const bad = (msg) => {
  errors++;
  console.log(`  ❌ ${msg}`);
};
const ok = (msg) => console.log(`  ✅ ${msg}`);

// ---------- 1. 找到 GameController 组件 ----------
// 自定义脚本组件在场景文件里以脚本 ID 为 __type__（不是类名），用属性特征识别
const gc = arr.find((o) => o && typeof o === 'object' && 'fieldLabels' in o);
if (!gc) {
  console.log('❌ 场景里没有 GameController 组件（GameRoot 上没挂脚本？）');
  process.exit(1);
}
console.log('【GameController 属性槽】');

const checkLabelSlot = (field, displayName) => {
  const ref = gc[field];
  if (!ref || ref.__id__ === undefined) return bad(`${displayName} 未绑定`);
  const comp = byId(ref.__id__);
  if (!comp) return bad(`${displayName} 引用无效`);
  ok(`${displayName} ← ${nameOfNode(comp.node)}`);
};
checkLabelSlot('goldLabel', 'Gold Label');
checkLabelSlot('kitchenLabel', 'Kitchen Label');
checkLabelSlot('inventoryLabel', 'Inventory Label');
checkLabelSlot('messageLabel', 'Message Label');

// M2 新增槽位：按钮预制体（资源引用，存 __uuid__）+ 两个容器节点
if (gc.itemButtonPrefab && gc.itemButtonPrefab.__uuid__) ok('Item Button Prefab ← 已绑定预制体');
else bad('Item Button Prefab 未绑定（把 ItemButton 预制体从资源管理器拖进来）');

const checkNodeSlot = (field, displayName) => {
  const ref = gc[field];
  if (!ref || ref.__id__ === undefined) return bad(`${displayName} 未绑定`);
  ok(`${displayName} ← ${nameOfNode(ref)}`);
};
checkNodeSlot('seedContainer', 'Seed Container');
checkNodeSlot('kitchenContainer', 'Kitchen Container');

const fl = gc.fieldLabels || [];
if (fl.length !== 4) {
  bad(`Field Labels 数组长度 = ${fl.length}（应为 4）`);
} else {
  fl.forEach((ref, i) => {
    if (!ref) return bad(`Field Labels[${i}] 为空`);
    const comp = byId(ref.__id__);
    ok(`Field Labels[${i}] ← ${comp ? nameOfNode(comp.node) : '无效引用'}`);
  });
}

// ---------- 2. 检查按钮 Click Events ----------
console.log('【按钮 Click Events】');
const EXPECTED = {
  FieldButton0: ['onClickField', '0'],
  FieldButton1: ['onClickField', '1'],
  FieldButton2: ['onClickField', '2'],
  FieldButton3: ['onClickField', '3'],
  CollectButton: ['onCollectDish', ''],
  SellAllButton: ['onSellAll', ''],
  DailyButton: ['onDailyReward', ''],
};
// M2 起这两个按钮被自由组合面板取代，场景里不应再存在
const REMOVED = ['CookToastButton', 'CookExperimentButton'];

const nodeName = (nodeRef) => nameOfNode(nodeRef);
for (const o of arr) {
  if (typeOf(o) !== 'cc.Button') continue;
  const name = nodeName(o.node);
  const want = EXPECTED[name];
  if (!want) continue;
  const evs = o.clickEvents || [];
  if (evs.length !== 1) {
    bad(`${name}: Click Events 数量 = ${evs.length}（应为 1）`);
    continue;
  }
  const evRef = evs[0];
  const ev = evRef && evRef.__id__ !== undefined ? byId(evRef.__id__) : evRef; // 兼容内联
  if (!ev) {
    bad(`${name}: Click Event 为空`);
    continue;
  }
  const target = ev.target ? nameOfNode(ev.target) : '(空)';
  const handler = ev.handler || '(空)';
  const data = ev.customEventData ?? '';
  if (target !== 'GameRoot') bad(`${name}: target = ${target}（应为 GameRoot）`);
  else if (handler !== want[0]) bad(`${name}: 方法 = ${handler}（应为 ${want[0]}）`);
  else if (data !== want[1]) bad(`${name}: 参数 = "${data}"（应为 "${want[1]}"）`);
  else ok(`${name}: ${target} → ${handler}("${data}")`);
}

// 检查是否有缺失的按钮
const existing = new Set(
  arr.filter((o) => typeOf(o) === 'cc.Button').map((o) => nodeName(o.node)),
);
for (const name of Object.keys(EXPECTED)) {
  if (!existing.has(name)) bad(`场景里缺少按钮节点 ${name}`);
}
for (const name of REMOVED) {
  if (existing.has(name)) bad(`${name} 应从场景中删除（已被自由组合面板取代）`);
}

// ---------- 3. 孤儿节点检查 ----------
// 编辑器里拖拽节点可能把节点拖出场景树（_parent=null），表现：渲染偏移、点击失效
console.log('【节点挂载】');
const sceneObj = arr.find((o) => typeOf(o) === 'cc.Scene');
const reachable = new Set();
const stack = (sceneObj._children || []).map((c) => c.__id__);
while (stack.length) {
  const i = stack.pop();
  if (reachable.has(i)) continue;
  reachable.add(i);
  const n = byId(i);
  if (n && n._children) stack.push(...n._children.map((c) => c.__id__));
}
const orphans = arr.filter((o, i) => typeOf(o) === 'cc.Node' && !reachable.has(i));
if (orphans.length === 0) ok('所有节点都挂在场景树中');
else orphans.forEach((n) => bad(`孤儿节点「${n._name || '(无名)'}」（不在场景树中，渲染/点击会异常）`));

// ---------- 4. 重复节点名 / 场景内预制体实例 ----------
// 教训：编辑器里把按钮拖成预制体时会留下同名副本，两个「FieldButton0」真假难辨
console.log('【重复与冗余】');
const nameCount = {};
const IGNORE = new Set(['label']); // 按钮子 Label 的默认名，允许重复
for (const o of arr) {
  if (typeOf(o) !== 'cc.Node' || !o._name || IGNORE.has(o._name)) continue;
  nameCount[o._name] = (nameCount[o._name] || 0) + 1;
}
const dups = Object.entries(nameCount).filter(([, n]) => n > 1);
if (dups.length === 0) ok('无重名节点');
else dups.forEach(([name, n]) => bad(`节点名「${name}」出现 ${n} 次（应为 1 次）`));

const prefabInsts = arr.filter((o) => typeOf(o) === 'cc.PrefabInstance');
if (prefabInsts.length === 0) ok('场景内无预制体实例（列表项由代码实例化，场景只放空容器）');
else bad(`场景里有 ${prefabInsts.length} 个预制体实例（灰盒约定：列表项由代码实例化，场景里不应拖入预制体）`);

// ---------- 5. 汇总 ----------
console.log('');
if (errors === 0) console.log('🎉 全部检查通过，场景接线完整');
else console.log(`共 ${errors} 处问题，修复后保存场景再运行本脚本`);
process.exit(errors === 0 ? 0 : 1);
