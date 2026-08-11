/**
 * 一次性迁移：recipes.json v5 → v6（M5 菜品文案体系，2026-08-11）
 * - desc 全部扩写为 2 句：第一句味道，第二句故事钩子/归属人（《故事线与人物规划》§7.3、§9）
 * - 新增 favoriteOf 字段：「某 NPC 的最爱菜」（赠送额外好感，图鉴与 NPC 档案双向展示）
 * 运行：node sim/patch-recipes-v6.js && npm run sync-data
 */
'use strict';
const fs = require('fs');
const path = require('path');

const V6 = {
  dark_cuisine:      { desc: '试验失败的产物，没人知道它在锅里经历了什么。但小满居然吃得很香——这大概就是天赋。', favoriteOf: 'xiaoman' },
  steamed_bun:       { desc: '朴实无华，但管饱。林婶说，镇上几十年，最难熬的日子是它陪着过来的。' },
  toast:             { desc: '外脆内软，麦香扑鼻。田伯尝了一口，半天只说个「还行」——那是他最高的夸奖。', favoriteOf: 'tianbo' },
  wheat_bread:       { desc: '三倍麦香，沉甸甸的满足感。田伯点头：这才叫正经粮食。' },
  ketchup:           { desc: '浓缩的番茄精华，酸亮百搭。食堂的架子上，永远给它留一个位置。' },
  tomato_soup:       { desc: '两颗番茄的诚意，酸甜暖胃。下雨天喝它，能把寒气从骨头缝里赶出去。' },
  mashed_potato:     { desc: '细腻绵软，入口即化。这是一道不需要牙口的温柔。' },
  potato_cake:       { desc: '两面金黄，隔壁小孩都馋哭了。田伯嘴上说油大，筷子却很诚实。' },
  tomato_flatbread:  { desc: '麦香托底，番茄点睛。出炉的那十分钟，是食堂最香的时候。' },
  potato_bun:        { desc: '咬开是绵密的土豆馅。小小一个，藏着整个秋天的踏实。' },
  tomato_potato_stew:{ desc: '家常的味道，汤汁拌饭一绝。林婶算了一下午账，就着它吃了两碗。', favoriteOf: 'linshen' },
  baked_corn:        { desc: '炭火慢烤，粒粒金黄。这是田埂上的味道，带着一点柴火气。' },
  popcorn:           { desc: '噼啪作响，看剧必备。小满说，这是世界上最好听的声音。', favoriteOf: 'xiaoman' },
  pumpkin_soup:      { desc: '整颗南瓜熬出的金黄浓汤。沈先生尝第一口时，勺子停在了半空。', favoriteOf: 'shenxiansheng' },
  pumpkin_pie:       { desc: '软糯香甜，老少皆宜。白婆婆吃之前，总要先掰一小块放在旁边。' },
  corn_pumpkin_soup: { desc: '暖暖的一碗，治愈人心。白婆婆的规矩：粥要熬到开花才算好。', favoriteOf: 'popo' },
  corn_tomato_salad: { desc: '清爽开胃，夏天的颜色。小镇的夏天，是从这一盘开始的。' },
  corn_potato_cake:  { desc: '玉米粒在饼里咯吱作响。小满管它叫「会唱歌的饼」。' },
  harvest_soup:      { desc: '把田里的丰收一次性装进碗里。沈先生说它「还差一味」——那一味，在记忆里。' },
  strawberry_jam:    { desc: '把春天的味道封存进玻璃瓶。小满想直接用勺子挖着吃，被你拦下了。' },
  watermelon_juice:  { desc: '不加一滴水的纯粹。阿远用一枚外地铜钱，换了第一杯。' },
  berry_ice:         { desc: '梦幻联动，一口入夏。阿远走南闯北，说这碗冰让他记住了丰穗镇。', favoriteOf: 'ayuan' },
  sauteed_carrot:    { desc: '油亮金黄，甜丝丝的家常味。最普通的菜，最见功夫。' },
  carrot_potato_mash:{ desc: '双色绵软，小朋友的最爱。小满能吃出哪一勺胡萝卜多放了一撮。' },
  vinegar_cabbage:   { desc: '酸脆爽口，下饭一绝。冬天菜窖里的大白菜，是小镇的底气。' },
  cabbage_pastry:    { desc: '面皮烙得焦香，咬开全是清甜的白菜馅。林婶的午饭常常是它——不耽误看店。' },
  grilled_mushroom:  { desc: '炭火一烤，鲜味全锁在伞盖里。沈先生难得没挑刺，只说了句「火候尚可」。' },
  mushroom_corn_soup:{ desc: '鲜上加甜，一碗喝出山林和田野。喝完连勺子都想舔干净。' },
  chili_sauce:       { desc: '红亮亮一罐，蘸什么都带劲。小镇的冬天，靠它点火。' },
  spicy_potato_shreds:{ desc: '酸辣脆爽，筷子停不下来。林婶一边吸气一边说「不辣」。' },
  braised_eggplant:  { desc: '酱香油润，拌饭能吃三大碗。田伯的下酒菜，没酒也行。' },
  eggplant_tomato:   { desc: '紫的糯、红的酸，最后汤汁都不剩。盘子比洗过还干净。' },
  salted_peanut:     { desc: '慢慢煮透，一颗接一颗。田伯的口袋里，总能摸出几颗来。' },
  peanut_toast:      { desc: '厚抹一层现磨花生酱，香浓到眯眼。这是早餐的奢侈。' },
  grape_jam:         { desc: '紫宝石熬成的酱，抹什么都高级。白婆婆说它的颜色，像她年轻时的头巾。' },
  grape_melon_drink: { desc: '紫与红的渐变杯，颜值与清甜并存。阿远说它像外地的晚霞。' },
  peach_can:         { desc: '把夏天封进糖水，冬天也能尝到。开罐那声「啵」，是冬天的惊喜。' },
  peach_berry_tart:  { desc: '酥皮托着双果，摆上桌就是节日。沈先生差点掏出放大镜看酥皮层次。' },
  farmhouse_stew:    { desc: '地里现摘的三样，咕嘟出一锅踏实。外婆的食堂从前，常有这一锅。' },
  harvest_fruit_cup: { desc: '三种果子层层叠叠，丰收祭的压轴甜。它一上桌，丰收祭才算圆满。', favoriteOf: 'ayuan' },
};

const file = path.join(__dirname, '..', 'data', 'recipes.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
if (data.version === 6) { console.log('已是 v6，跳过'); process.exit(0); }
for (const r of data.recipes) {
  const v = V6[r.id];
  if (!v) { console.error('缺 v6 文案: ' + r.id); process.exit(1); }
  r.desc = v.desc;
  if (v.favoriteOf) r.favoriteOf = v.favoriteOf; else delete r.favoriteOf;
}
data.version = 6;
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`✅ recipes.json v6：${data.recipes.length} 条，含 favoriteOf ${data.recipes.filter(r => r.favoriteOf).length} 条`);
console.log('下一步：npm run sync-data && npm run sim');
