/**
 * 灰盒 UI 接线层（M2-3 起：底部导航四分页——田地/厨房/商店/图鉴）。
 * 职责：加载数据表、创建 GameCore、读写本地存档、刷新 UI。
 * 核心规则全部在 core/GameCore 中，本组件只做引擎侧接线，不写游戏逻辑。
 *
 * 全部面板由代码从 itemButtonPrefab 实例化生成，场景只提供：
 * 全局 Label（金币/消息）、若干静态按钮（运行时换父节点归入各页）、占位容器。
 * 分页只是页容器的显隐切换，游戏逻辑无感知；后续美术接入后可升级为「场景图+热点」。
 */

import {
  _decorator,
  AudioClip,
  AudioSourceComponent,
  BlockInputEvents,
  Button,
  Color,
  Component,
  Event,
  Graphics,
  instantiate,
  JsonAsset,
  Label,
  Layers,
  Layout,
  Mask,
  Node,
  Prefab,
  resources,
  ScrollView,
  Sprite,
  SpriteFrame,
  sys,
  TTFFont,
  tween,
  Tween,
  UIOpacity,
  UITransform,
  Vec3,
  view,
  Widget,
} from 'cc';
import { GameCore } from '../core/GameCore';
import { DataTables, MilestoneDef, SaveData } from '../core/types';

const { ccclass, property } = _decorator;

const SAVE_KEY = 'newgame_save_v3'; // v2 → v3：M3 平衡回修（经验曲线/便利线重排）后清档开新局（旧档仍留在 v2 key 下，可回退）
const AUTOSAVE_INTERVAL = 10; // 秒

@ccclass('GameController')
export class GameController extends Component {
  @property(Label) goldLabel: Label | null = null;
  /** 4 个地块按钮上的 Label，顺序即地块编号 0~3 */
  @property([Label]) fieldLabels: Label[] = [];
  @property(Label) kitchenLabel: Label | null = null;
  @property(Label) inventoryLabel: Label | null = null;
  @property(Label) messageLabel: Label | null = null;
  /** 列表按钮模板（Prefab：Button + 子 Label） */
  @property(Prefab) itemButtonPrefab: Prefab | null = null;
  /** 种子列表容器（空节点即可，Layout 由代码添加） */
  @property(Node) seedContainer: Node | null = null;
  /** 厨房面板容器（空节点即可，Layout 由代码添加） */
  @property(Node) kitchenContainer: Node | null = null;

  private game: GameCore | null = null;
  private saveTimer = 0;
  /** 当前组合槽内容：{作物id: 数量} */
  private combo: Record<string, number> = {};
  /** 当前选中的种子（地块按钮点击时种它） */
  private selectedSeed = 'wheat';
  /** 动态田畦地块（代码实例化，数量跟随存档，田地升级可增至 10 块） */
  private fieldPlots: ReturnType<GameController['makeFieldPlot']>[] = [];
  private fieldsContainer: Node | null = null;
  /** 种子底部抽屉（原型 v3 bottom sheet；drawerField=目标坑位，-1=未打开） */
  private seedDrawer: Node | null = null;
  private drawerField = -1;
  private drawerArrow: Node | null = null;
  private drawerScrollbar: Graphics | null = null;
  /** 收获篮区容器（左下，最多 4 篮）与重建缓存 key */
  private basketRoot: Node | null = null;
  private basketKey = '';
  private upgradeContainer: Node | null = null;
  private orderContainer: Node | null = null;
  private collectionContainer: Node | null = null;
  /** 图鉴当前分类页签（BOOK_TABS 的 key；新增分类只需在 BOOK_TABS 加一项 + getBookItems 加分支） */
  private bookTab = 'crop';
  /** 四分页容器与导航（M2-3） */
  private pages: Record<string, Node> = {};
  private navItems: { key: string; name: string; label: Label; g: Graphics; w: number; h: number; on: boolean }[] = [];
  private currentPage = 'field';
  /** 各页消息栏（位置统一，say() 路由到对应页） */
  private pageMessages: Record<string, Label> = {};
  /** 商店页库存栏（代码创建，替代场景 InventoryLabel；v3 起精简为底部一行小字） */
  private invLabel: Label | null = null;
  /** 商店页「卖出全部，+N 金币」预览文案（refreshUI 实时刷新） */
  private sellPreviewLabel: Label | null = null;
  /** 商店页今日特价小黑板（dailySpecial() 为 null 时隐藏；文案 refreshUI 刷新） */
  private specialBoard: Node | null = null;
  private specialLabel: Label | null = null;
  /** 厨房页「出锅」按钮（场景节点，v3 起隐藏收编，功能并入状态按钮） */
  private collectBtn: Node | null = null;
  /** 厨房页进度条/状态按钮引用（refreshUI 按秒刷新，不整页重建）；key 缓存当前烹饪状态 */
  private kitchenProg: { barG: Graphics; label: Label; btnLabel: Label } | null = null;
  private kitchenCookKey = '';
  /** 本次烹饪总时长（毫秒，算进度条比例用；存档载入中途烹饪时按剩余时长起估） */
  private cookTotalMs = 0;
  /** 大锅搅拌动效引用（buildPotFx 建、update 逐帧驱动；refreshKitchen 重建时节点销毁后自清空） */
  private potAnim: {
    spoon: Node;
    rings: Node[];
    bubbles: { n: Node; op: UIOpacity; phase: number }[];
    stars: { n: Node; op: UIOpacity; phase: number }[];
    t: number;
  } | null = null;
  /** 顶部金币胶囊（setupPages 创建；金币动效用） */
  private goldBar: Node | null = null;
  /** 上一帧金币数（-1=未初始化，避免首帧误播进账动效） */
  private lastGold = -1;
  /** 顶部个人区胶囊（M3-①：左上，头像 + Lv 徽章 + 经验条；与 GoldBar 同级，四页统一出现） */
  private profileBar: Node | null = null;
  private lvLabel: Label | null = null;
  private xpTextLabel: Label | null = null;
  private xpBarG: Graphics | null = null;
  /** 经验条重绘缓存（level:pct），避免每帧 clear/redraw Graphics */
  private xpBarKey = '';
  /** 上一帧农场等级（-1=未初始化；升级时个人区脉冲） */
  private lastLevel = -1;
  /** 图标 SpriteFrame 缓存（美术 v1.0：assets/resources/icons，key=作物/菜品 id） */
  private iconFrames: Record<string, SpriteFrame> = {};
  /** 页面背景 SpriteFrame 缓存（assets/resources/bg，key=页面 key；缺失时降级 Graphics 色块底） */
  private bgFrames: Record<string, SpriteFrame> = {};
  /** 卡片纸纹叠层（assets/resources/ui/paper，缺失时跳过，不影响显示） */
  private paperFrame: SpriteFrame | null = null;
  /** 音效（音频 v0.1：assets/resources/audio/sfx，key=音效名；缺失时静默不播） */
  private sfx: Record<string, AudioClip> = {};
  private audioSrc: AudioSourceComponent | null = null;
  /** 搅拌循环音通道（烹饪中才响，与一次性反馈音分轨互不干扰） */
  private stirSrc: AudioSourceComponent | null = null;
  /** BGM 循环音通道（音频 v1.0：audio/bgm/main 无缝循环，音量压低作背景） */
  private bgmSrc: AudioSourceComponent | null = null;
  /** UI 字体（美术 v1.1 ④：站酷快乐体子集 assets/resources/fonts/ui.ttf；缺失时全体降级系统字） */
  private uiFont: TTFFont | null = null;

  /** 升级线显示名 */
  private static readonly LINE_NAMES: Record<string, string> = {
    field: '田地',
    kitchen: '厨房',
    shop: '店铺',
    convenience: '便利',
  };

  /** 页面定义（底部导航顺序即展示顺序） */
  private static readonly PAGES: { key: string; name: string }[] = [
    { key: 'field', name: '田地' },
    { key: 'kitchen', name: '厨房' },
    { key: 'shop', name: '小铺' },
    { key: 'orders', name: '订单' },
    { key: 'book', name: '图鉴' },
  ];

  /** 启动遮罩节点（loading 层；初始化完成后淡出销毁） */
  private splash: Node | null = null;
  /** 遮罩上的进度条填充 Graphics */
  private splashFill: Graphics | null = null;
  /** 遮罩上的百分比 Label */
  private splashPct: Label | null = null;
  /** 进度条显示值（平滑追赶 setSplashProgress 的目标值） */
  private splashShown = 0;
  /** 遮罩创建时刻（用于最短展示时长，防本地秒加载闪屏） */
  private splashStartAt = 0;
  /** 启动遮罩结束后才允许地点引导；序章期间不因切页插队 */
  private playReady = false;
  private talkNode: Node | null = null;
  private talkLines: { speaker: string; text: string }[] = [];
  private talkIndex = 0;
  private talkOnDone: (() => void) | null = null;
  private talkStoryId = '';
  private talkQueue: { id: string; lines: { speaker: string; text: string }[]; onDone: () => void }[] = [];
  private talkSpeaker: Label | null = null;
  private talkBody: Label | null = null;

  /** 页面到地点。订单页是地图完成前的临时地点。 */
  private static readonly PLACE: Record<string, string> = {
    field: 'farm',
    kitchen: 'canteen',
    book: 'canteen',
    shop: 'shop',
    orders: 'orders',
  };

  /** loading 小贴士池（每次启动随机一条；文案只用快乐体覆盖字符） */
  private static readonly SPLASH_TIPS = [
    '小贴士：成熟的作物会微微发光，记得回来看看',
    '小贴士：做菜比直接卖作物更赚钱',
    '小贴士：1 个番茄是酱，2 个番茄是汤，数量也是配方',
    '小贴士：商店每天都有今日特价，卖出多赚两成',
    '小贴士：图鉴点亮越多，里程碑奖励的金币越多',
  ];

  onLoad() {
    this.makeSplash();
  }

  start() {
    // 音效通道（AudioSourceComponent 常驻，playOneShot 播放；WeChat 需首次触摸后才出声，属平台限制）
    const an = new Node('Audio');
    an.parent = this.node;
    this.audioSrc = an.addComponent(AudioSourceComponent);
    this.stirSrc = an.addComponent(AudioSourceComponent); // 搅拌循环音（loop）
    this.bgmSrc = an.addComponent(AudioSourceComponent); // BGM 循环音（loop）
    this.loadData().then(async (data) => {
      this.setSplashProgress(0.35);
      await this.loadIcons();
      this.setSplashProgress(0.85);
      if (this.splash) this.applyUiFont(this.splash); // 快乐体加载完成后遮罩文字同步换皮
      const oldSave = this.readSave();
      const offlineMs = oldSave ? Date.now() - oldSave.lastOnlineAt : 0;
      this.game = new GameCore(data, oldSave);
      // 每日奖励不再代领：留待商店页按钮手动领取（待领/已领两态，领取的成就感归玩家）
      const msgs: string[] = [];
      if (offlineMs > 5 * 60 * 1000) {
        const h = Math.floor(offlineMs / 3600000);
        const m = Math.round((offlineMs % 3600000) / 60000);
        msgs.push(`离线 ${h > 0 ? `${h} 小时` : ''}${m} 分钟，作物已继续生长`);
      }
      this.setupPages();
      this.setupFields();
      this.setSplashProgress(1);
      if (msgs.length > 0) {
        this.sayAll(msgs.join('；'));
        this.playSfx('offline'); // 回游问候（离线结算提示）
      }
      this.switchPage('field');
      this.refreshPanels();
      if (this.splash) this.hideSplash();
      else this.beginStory();
    });
  }

  // ---------- 启动遮罩（loading 层） ----------

  /**
   * 启动遮罩：onLoad 第一帧盖上，盖住场景静态灰盒节点与初始化空窗。
   * 视觉对齐 docs/mockups/loading.png（美术品牌 v1.0）：底图 bg/loading.jpg（Logo 牌匾 +
   * 麦穗徽章 + 丰收篮主视觉 + 健康游戏忠告，93KB 进主包），动态件代码叠加——
   * 随机小贴士 + 加载文案 + 木框金条进度条（百分比实时推进）。
   * 底图加载前以奶油纸色兜底；初始化完成后由 hideSplash 淡出销毁。零场景改动。
   */
  private makeSplash() {
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas) return;
    const ut = canvas.getComponent(UITransform);
    const W = ut?.contentSize.width ?? 720;
    const H = ut?.contentSize.height ?? 1280;
    const n = new Node('Splash');
    n.layer = Layers.Enum.UI_2D;
    n.parent = canvas;
    n.addComponent(UITransform).setContentSize(W, H);
    n.addComponent(BlockInputEvents); // 加载期间屏蔽触摸
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(0xff, 0xf8, 0xe7); // 奶油纸兜底（底图加载前）
    g.rect(-W / 2, -H / 2, W, H);
    g.fill();
    // 底图（与 mockup 同源烘焙）；失败则保持奶油底 + 动态件，不阻塞启动
    resources.load('bg/loading/spriteFrame', SpriteFrame, (err, frame) => {
      if (err || !frame || !n.isValid) return;
      const bgNode = new Node('bg');
      bgNode.layer = Layers.Enum.UI_2D;
      bgNode.parent = n;
      bgNode.setSiblingIndex(0); // 压在兜底色上、动态件下
      bgNode.addComponent(UITransform).setContentSize(W, H);
      const sp = bgNode.addComponent(Sprite);
      sp.spriteFrame = frame;
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
    });
    const mkText = (str: string, y: number, size: number, color: Color, bold = false) => {
      const t = new Node('label');
      t.layer = Layers.Enum.UI_2D;
      t.parent = n;
      t.addComponent(UITransform).setContentSize(W - 80, size + 16);
      t.setPosition(0, y);
      const l = t.addComponent(Label);
      l.string = str;
      l.fontSize = size;
      l.isBold = bold;
      l.color = color;
      l.horizontalAlign = Label.HorizontalAlign.CENTER;
      return l;
    };
    // 坐标与 mockup 对齐（SVG y → Cocos y = 640 - y）：小贴士 y1010、加载文案 y1078、进度条中心 y1121
    const tip = GameController.SPLASH_TIPS[Math.floor(Math.random() * GameController.SPLASH_TIPS.length)];
    mkText(tip, -370, 24, new Color(0x8b, 0x5a, 0x2b));
    mkText('外婆正在生火备料…', -438, 28, new Color(0x4a, 0x35, 0x20), true);
    // 进度条（对齐 mockup：木框 496×50 + 奶油底槽 480×34 + 丰收黄填充 + 百分比居中）
    const bar = new Node('bar');
    bar.layer = Layers.Enum.UI_2D;
    bar.parent = n;
    bar.addComponent(UITransform).setContentSize(496, 50);
    bar.setPosition(0, -481);
    const frame = bar.addComponent(Graphics);
    frame.fillColor = new Color(0x8b, 0x5a, 0x2b); // 木框
    frame.roundRect(-248, -25, 496, 50, 25);
    frame.fill();
    frame.lineWidth = 3;
    frame.strokeColor = new Color(0x4a, 0x35, 0x20);
    frame.roundRect(-248, -25, 496, 50, 25);
    frame.stroke();
    frame.fillColor = new Color(0xf3, 0xe4, 0xc2); // 底槽
    frame.roundRect(-240, -17, 480, 34, 17);
    frame.fill();
    frame.lineWidth = 2;
    frame.roundRect(-240, -17, 480, 34, 17);
    frame.stroke();
    const fill = new Node('fill');
    fill.layer = Layers.Enum.UI_2D;
    fill.parent = bar;
    fill.addComponent(UITransform).setContentSize(480, 34);
    this.splashFill = fill.addComponent(Graphics);
    this.splashPct = mkText('0%', -481, 22, new Color(0x4a, 0x35, 0x20), true);
    this.splash = n;
    this.splashStartAt = Date.now();
    this.setSplashProgress(0.05);
  }

  /** 进度条目标值（0~1）：显示值以补间平滑追赶，视觉连续而非阶段跳变 */
  private setSplashProgress(p: number) {
    if (!this.splashFill) return;
    const target = Math.min(1, p);
    const state = { v: this.splashShown };
    Tween.stopAllByTarget(state);
    tween(state)
      .to(Math.max(0.15, (target - state.v) * 1.2), { v: target }, {
        onUpdate: () => {
          this.splashShown = state.v;
          this.drawSplashFill(state.v);
        },
      })
      .start();
  }

  /** 画一帧进度填充（丰收黄圆角条 + 百分比） */
  private drawSplashFill(v: number) {
    const g = this.splashFill;
    if (!g) return;
    g.clear();
    const w = Math.max(24, (480 - 12) * v);
    g.fillColor = new Color(0xf2, 0xb8, 0x30);
    g.roundRect(-234, -11, w, 22, 11);
    g.fill();
    if (this.splashPct) this.splashPct.string = `${Math.round(v * 100)}%`;
  }

  /** 初始化完成：进度补满 + 满最短展示时长（防本地秒加载闪屏）后，遮罩置顶淡出销毁 */
  private hideSplash() {
    const n = this.splash;
    if (!n) return;
    if (n.parent) n.setSiblingIndex(n.parent.children.length - 1); // 压过构建好的 UI，淡出过程不露底
    const holdMs = Math.max(0, 1200 - (Date.now() - this.splashStartAt)); // 最短展示 1.2s，让进度条完整走完
    this.scheduleOnce(() => {
      this.setSplashProgress(1);
      this.scheduleOnce(() => {
        this.splash = null;
        this.splashFill = null;
        this.splashPct = null;
        if (!n.isValid) return;
        const op = n.getComponent(UIOpacity) ?? n.addComponent(UIOpacity);
        n.removeComponent(BlockInputEvents);
        tween(op)
          .to(0.4, { opacity: 0 })
          .call(() => {
            n.destroy();
            this.beginStory();
          })
          .start();
      }, 0.35); // 等进度补间收尾再淡出
    }, holdMs / 1000);
  }

  /**
   * 动态地块面板：场景里 4 个静态按钮隐藏保留（兼容 check-scene 接线约定），
   * 实际交互由代码实例化的按钮接管，数量跟随存档 fields（田地升级可增至 10 块）。
   */
  private setupFields() {
    const canvas = this.node.scene?.getChildByName('Canvas');
    const page = this.pages.field;
    if (!canvas || !page || !this.itemButtonPrefab) return;
    for (const name of ['FieldButton0', 'FieldButton1', 'FieldButton2', 'FieldButton3']) {
      const n = canvas.getChildByName(name);
      if (n) n.active = false;
    }
    const c = new Node('FieldsRoot');
    c.layer = Layers.Enum.UI_2D;
    c.parent = page;
    c.setPosition(0, 0);
    c.addComponent(UITransform);
    this.fieldsContainer = c;
    // 收获篮区（左下，纯展示；内容 key 缓存，跟随库存变化重建）
    const bk = new Node('BasketRoot');
    bk.layer = Layers.Enum.UI_2D;
    bk.parent = page;
    bk.setPosition(0, 0);
    bk.addComponent(UITransform);
    this.basketRoot = bk;
    this.rebuildFields();
  }

  // ---------- 田地页 19 坑菱形网格（原型 v3，对齐 sim/gen-mockups.js 田地页参数） ----------
  // 坐标系：mockup 为 SVG y 向下（720×1280），Cocos 中心锚点 y 向上 → cocosX = svgX-360，cocosY = 640-svgY
  private static readonly GRID_ROWS = [3, 4, 5, 4, 3]; // 共 19 坑，行内居中天然错位半格插缝
  private static readonly GRID_TOP_Y = -76; // mockup topY=716 → 640-716
  private static readonly GRID_STEP_Y = 66;
  private static readonly GRID_STEP_X = 134;
  private static readonly PLOT_HW = 68; // 菱形半宽（2:1）
  private static readonly PLOT_HH = 34;

  /** 圆角菱形路径（2:1 斜切地块，角部裁圆 r），只描路径，由调用方 fill/stroke */
  private traceDiamond(g: Graphics, cx: number, cy: number, hw: number, hh: number, r = 0.16) {
    const pts: [number, number][] = [
      [cx, cy + hh],
      [cx + hw, cy],
      [cx, cy - hh],
      [cx - hw, cy],
    ];
    for (let i = 0; i < 4; i++) {
      const c = pts[i];
      const p = pts[(i + 3) % 4];
      const n = pts[(i + 1) % 4];
      const ax = c[0] + (p[0] - c[0]) * r;
      const ay = c[1] + (p[1] - c[1]) * r;
      const bx = c[0] + (n[0] - c[0]) * r;
      const by = c[1] + (n[1] - c[1]) * r;
      if (i === 0) g.moveTo(ax, ay);
      else g.lineTo(ax, ay);
      g.quadraticCurveTo(c[0], c[1], bx, by);
    }
    g.close();
  }

  /** 虚线菱形轮廓（Graphics 无 dasharray，沿四边手动分段）；锁态坑位专用 */
  private strokeDiamondDashed(g: Graphics, hw: number, hh: number, dash = 7, gap = 6) {
    const corners: [number, number][] = [
      [0, hh],
      [hw, 0],
      [0, -hh],
      [-hw, 0],
    ];
    for (let e = 0; e < 4; e++) {
      const a = corners[e];
      const b = corners[(e + 1) % 4];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let cur = 0;
      let on = true;
      while (cur < len) {
        const nx = Math.min(len, cur + (on ? dash : gap));
        if (on) {
          g.moveTo(a[0] + ((b[0] - a[0]) * cur) / len, a[1] + ((b[1] - a[1]) * cur) / len);
          g.lineTo(a[0] + ((b[0] - a[0]) * nx) / len, a[1] + ((b[1] - a[1]) * nx) / len);
        }
        cur = nx;
        on = !on;
      }
    }
    g.stroke();
  }

  /** 坑位编号圆牌（所有坑位都显示，mockup 标注色：已解锁深木 / 锁定草绿） */
  private makePlotNumBadge(parent: Node, num: number, locked: boolean) {
    const HW = GameController.PLOT_HW;
    const HH = GameController.PLOT_HH;
    const bn = new Node('numBadge');
    bn.layer = Layers.Enum.UI_2D;
    bn.parent = parent;
    bn.addComponent(UITransform).setContentSize(22, 22);
    bn.setPosition(-HW * 0.62, HH * 0.55);
    const g = bn.addComponent(Graphics);
    g.fillColor = locked ? new Color(0x4e, 0x8a, 0x2e, 0xd9) : new Color(0x6b, 0x44, 0x23, 0xd9);
    g.circle(0, 0, 11);
    g.fill();
    const ln = new Node('label');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = bn;
    ln.addComponent(UITransform).setContentSize(22, 22);
    const ll = ln.addComponent(Label);
    ll.string = String(num);
    ll.fontSize = 14;
    ll.isBold = true;
    ll.color = new Color(0xff, 0xf8, 0xe7);
  }

  /**
   * 菱形地块（原型 v3）：2:1 圆角菱形全 Graphics 手绘（mockup 同款程序生成，比 soil_dry/wet 矩形贴图更贴稿）——
   * 落地投影 + 土坡厚度 + 顶面（干/湿）+ 三条弧犁沟 + 土壤颗粒；一畦三株（后 1 前 2 三角阵型）、
   * 贴畦细进度条、「可收获！」金签、成熟微光轻摆；三态带 key 缓存只在变化时重绘。
   */
  private makeFieldPlot(parent: Node, x: number, y: number, num: number, onClick: () => void) {
    const HW = GameController.PLOT_HW;
    const HH = GameController.PLOT_HH;
    const TH = HH * 0.14; // 土坡厚度
    const node = new Node('FieldPlot');
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.addComponent(UITransform).setContentSize(HW * 2, HH * 2);
    node.setPosition(x, y);
    // 土壤层（Graphics，状态变化时整体重绘）
    const soilN = new Node('soil');
    soilN.layer = Layers.Enum.UI_2D;
    soilN.parent = node;
    soilN.addComponent(UITransform).setContentSize(HW * 2, HH * 2);
    const soilG = soilN.addComponent(Graphics);
    const drawSoil = (wet: boolean) => {
      const g = soilG;
      g.clear();
      // 草地上的落地投影
      g.fillColor = new Color(0x2f, 0x5d, 0x1f, 0x52);
      g.ellipse(5, -(TH + HH * 0.5), HW * 1.04, HH * 0.36);
      g.fill();
      // 侧沿土坡（与顶面同色系稍深，压低厚度不分层）
      g.fillColor = wet ? new Color(0x6b, 0x45, 0x26) : new Color(0x8a, 0x5b, 0x32);
      this.traceDiamond(g, 0, -TH, HW, HH);
      g.fill();
      // 顶面土壤（色板 §2.2：泥土/湿土）+ 深棕描边
      g.fillColor = wet ? new Color(0x7c, 0x53, 0x35) : new Color(0xa0, 0x72, 0x4a);
      this.traceDiamond(g, 0, 0, HW, HH);
      g.fill();
      g.lineWidth = 2.5;
      g.strokeColor = new Color(0x5c, 0x3a, 0x1e);
      this.traceDiamond(g, 0, 0, HW, HH);
      g.stroke();
      // 上角受光（左上 45° 光源）
      g.lineWidth = 2.5;
      g.strokeColor = wet ? new Color(0xb0, 0x89, 0x62, 0xcc) : new Color(0xea, 0xc6, 0x9a, 0xcc);
      g.moveTo(-HW * 0.62, HH * 0.36);
      g.quadraticCurveTo(0, HH * 1.04, HW * 0.62, HH * 0.36);
      g.stroke();
      // 三条弧犁沟（沿菱向，连接左上边与右下边）+ 沟沿受光
      for (const t of [0.32, 0.5, 0.68]) {
        const ax = -HW + t * HW;
        const ay = t * HH;
        const bx = t * HW;
        const by = -HH + t * HH;
        const mx = (ax + bx) / 2 + HH * 0.07;
        const my = (ay + by) / 2 + HW * 0.035;
        g.lineWidth = 3;
        g.strokeColor = wet ? new Color(0x3e, 0x28, 0x12, 0xa6) : new Color(0x7a, 0x4a, 0x22, 0x99);
        g.moveTo(ax, ay);
        g.quadraticCurveTo(mx, my, bx, by);
        g.stroke();
        g.lineWidth = 1.6;
        g.strokeColor = wet ? new Color(0xa8, 0x7f, 0x57, 0x8c) : new Color(0xe4, 0xb5, 0x7e, 0x8c);
        g.moveTo(ax - 2.5, ay + 2.5);
        g.quadraticCurveTo(mx - 2.5, my + 2.5, bx - 2.5, by + 2.5);
        g.stroke();
      }
      // 土壤颗粒
      const spk: [number, number][] = [
        [-0.5, 0.12], [-0.18, -0.28], [0.32, 0.3], [0.48, -0.12],
        [0.06, 0.48], [-0.12, 0.32], [0.2, -0.42], [-0.42, -0.3],
      ];
      g.fillColor = wet ? new Color(0x3a, 0x24, 0x10, 0x73) : new Color(0x7a, 0x52, 0x30, 0x73);
      for (const [fx, fy] of spk) {
        g.ellipse(fx * HW, fy * HH, 1.7, 1.1);
        g.fill();
      }
    };
    // 一畦三株：后 1 前 2 三角阵型（沿犁沟排布，近大远小）
    const spots: [number, number, number][] = [
      [0, HH * 0.24, 0.82],
      [-HW * 0.3, -HH * 0.16, 1.0],
      [HW * 0.3, -HH * 0.16, 1.0],
    ];
    const plants: Sprite[] = [];
    for (const [px, py, ps] of spots) {
      const pn = new Node('plant');
      pn.layer = Layers.Enum.UI_2D;
      pn.parent = node;
      pn.addComponent(UITransform).setContentSize(44, 44);
      pn.setPosition(px, py + 10); // 根扎进垄里，图标中心略上抬
      pn.setScale(ps, ps, 1);
      const sp = pn.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      pn.active = false;
      plants.push(sp);
    }
    // 空地「播种」小木牌（mockup：细木杆 + 原木牌 + 米白字）
    const signN = new Node('sign');
    signN.layer = Layers.Enum.UI_2D;
    signN.parent = node;
    signN.addComponent(UITransform).setContentSize(60, 40);
    const signG = signN.addComponent(Graphics);
    signG.strokeColor = new Color(0x6b, 0x44, 0x23);
    signG.lineWidth = 3;
    signG.moveTo(0, -HH * 0.3);
    signG.lineTo(0, HH * 0.08);
    signG.stroke();
    signG.fillColor = new Color(0x8b, 0x5a, 0x2b);
    signG.roundRect(-29, HH * 0.08, 58, 22, 5);
    signG.fill();
    signG.strokeColor = new Color(0x4a, 0x35, 0x20);
    signG.lineWidth = 1.6;
    signG.roundRect(-29, HH * 0.08, 58, 22, 5);
    signG.stroke();
    const signTN = new Node('text');
    signTN.layer = Layers.Enum.UI_2D;
    signTN.parent = signN;
    signTN.addComponent(UITransform).setContentSize(58, 22);
    signTN.setPosition(0, HH * 0.08 + 11);
    const signLabel = signTN.addComponent(Label);
    signLabel.string = '播种';
    signLabel.fontSize = 13;
    signLabel.color = new Color(0xff, 0xf8, 0xe7);
    // 生长进度（苗上方奶油胶囊：米白底+棕描边+草绿填充+受光边，悬在作物头顶不被遮挡）
    const progN = new Node('prog');
    progN.layer = Layers.Enum.UI_2D;
    progN.parent = node;
    progN.addComponent(UITransform).setContentSize(64, 14);
    progN.setPosition(0, HH + 30);
    const prog = progN.addComponent(Graphics);
    // 成熟收获牌（悬在作物头顶：金色小圆牌「收」+ 星花，成熟时上下浮动引导点击；
    // 动效占微光呼吸的配额——呼吸光在成熟态改静态，摆动保留，每屏动效仍 ≤2）
    const badgeN = new Node('badge');
    badgeN.layer = Layers.Enum.UI_2D;
    badgeN.parent = node;
    badgeN.addComponent(UITransform).setContentSize(40, 40);
    badgeN.setPosition(0, HH + 34);
    const badgeG = badgeN.addComponent(Graphics);
    // 金色圆牌 + 棕描边 + 高光弧
    badgeG.fillColor = new Color(0xf2, 0xb8, 0x30);
    badgeG.circle(0, 0, 17);
    badgeG.fill();
    badgeG.strokeColor = new Color(0x8a, 0x5f, 0x10);
    badgeG.lineWidth = 2;
    badgeG.circle(0, 0, 17);
    badgeG.stroke();
    badgeG.strokeColor = new Color(0xff, 0xe9, 0xa8);
    badgeG.lineWidth = 2.5;
    badgeG.arc(0, 0, 12, Math.PI * 0.7, Math.PI * 1.3, false);
    badgeG.stroke();
    // 两侧星花（四角星，上小下大）
    badgeG.fillColor = new Color(0xff, 0xfd, 0xf5);
    const star = (sx: number, sy: number, r: number) => {
      const k = r * 0.38;
      badgeG.moveTo(sx, sy - r);
      badgeG.lineTo(sx + k, sy - k);
      badgeG.lineTo(sx + r, sy);
      badgeG.lineTo(sx + k, sy + k);
      badgeG.lineTo(sx, sy + r);
      badgeG.lineTo(sx - k, sy + k);
      badgeG.lineTo(sx - r, sy);
      badgeG.lineTo(sx - k, sy - k);
      badgeG.close();
      badgeG.fill();
    };
    star(-24, -8, 5);
    star(24, -4, 7);
    star(19, 12, 4);
    const badgeLabel = badgeN.addComponent(Label);
    badgeLabel.string = '收';
    badgeLabel.fontSize = 17;
    badgeLabel.isBold = true;
    badgeLabel.color = new Color(0x4a, 0x35, 0x20);
    // 化肥金钮（mockup：生长态地块右上角小圆钮，丰收黄底 + 棕描边 +「肥」字，r≈12）
    const fertN = new Node('fertBtn');
    fertN.layer = Layers.Enum.UI_2D;
    fertN.parent = node;
    fertN.addComponent(UITransform).setContentSize(28, 28); // 命中区略大于图形
    fertN.setPosition(HW * 0.68, HH * 0.62);
    const fertG = fertN.addComponent(Graphics);
    fertG.fillColor = new Color(0xf2, 0xb8, 0x30);
    fertG.circle(0, 0, 12);
    fertG.fill();
    fertG.strokeColor = new Color(0x8a, 0x5f, 0x10);
    fertG.lineWidth = 2;
    fertG.circle(0, 0, 12);
    fertG.stroke();
    const fertTN = new Node('text');
    fertTN.layer = Layers.Enum.UI_2D;
    fertTN.parent = fertN;
    fertTN.addComponent(UITransform).setContentSize(24, 24);
    const fertLabel = fertTN.addComponent(Label);
    fertLabel.string = '肥';
    fertLabel.fontSize = 14;
    fertLabel.isBold = true;
    fertLabel.color = new Color(0x4a, 0x35, 0x20);
    fertN.addComponent(Button);
    fertN.on(Button.EventType.CLICK, () => this.handleFertilize(num - 1), this);
    // 拦截点击：Button 自身先响应，再由这两个监听截停冒泡，防穿透到地块的种植/收获点击
    fertN.on(Node.EventType.TOUCH_START, (e: Event) => { e.propagationStopped = true; }, this);
    fertN.on(Node.EventType.TOUCH_END, (e: Event) => { e.propagationStopped = true; }, this);
    // 坑位编号（所有坑都显示）
    this.makePlotNumBadge(node, num, false);
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, onClick, this);

    let lastKey = '';
    // 成熟态动效节点（微光 + 三株轻摆）：状态切换/重建时必须停 tween 并销毁，防残留
    let glowN: Node | null = null;
    let glowOp: UIOpacity | null = null;
    const stopMatureFx = () => {
      spots.forEach(([, , ps], i) => {
        Tween.stopAllByTarget(plants[i].node);
        plants[i].node.setScale(ps, ps, 1);
      });
      Tween.stopAllByTarget(badgeN);
      badgeN.setPosition(0, HH + 34);
      if (glowN) glowN.destroy();
      glowN = null;
      glowOp = null;
    };
    // 注意：下面返回的对象字面量方法里 this 指向字面量本身，访问组件字段必须走箭头闭包
    const hasFrame = (id: string) => !!this.iconFrames[id];
    const canFertilize = () => this.game?.hasConvenienceEffect('fertilize') ?? false; // 生长中且已购化肥才显示金钮（避免摆出无法使用的按钮）
    const setPlants = (frameId: string, size: number) => {
      const sf = this.iconFrames[frameId];
      for (const p of plants) {
        p.node.active = !!sf;
        if (sf) {
          p.spriteFrame = sf;
          p.node.getComponent(UITransform)!.setContentSize(size, size);
        }
      }
    };
    const hideAux = () => {
      signN.active = false;
      progN.active = false;
      badgeN.active = false;
      fertN.active = false;
    };
    return {
      node,
      setEmpty(key: string) {
        stopMatureFx(); // 短路前也执行：保证成熟动效绝不残留
        if (key === lastKey) return;
        lastKey = key;
        hideAux();
        drawSoil(false);
        for (const p of plants) p.node.active = false;
        signN.active = true;
      },
      setGrowing(id: string, _name: string, pct: number, key: string) {
        stopMatureFx();
        if (key === lastKey) return;
        lastKey = key;
        hideAux();
        drawSoil(true); // 生长中 = 湿土
        // 生长阶段差分（美术 v1.1 ③）：<34% 幼苗 _s1，否则半成株 _s2；缺帧静默退回成熟帧
        const stageId = pct < 34 ? `${id}_s1` : `${id}_s2`;
        setPlants(hasFrame(stageId) ? stageId : id, 44);
        prog.clear();
        // 底：米白胶囊 + 棕描边
        prog.fillColor = new Color(0xff, 0xfd, 0xf5, 0xf2);
        prog.roundRect(-32, -7, 64, 14, 7);
        prog.fill();
        prog.strokeColor = new Color(0x4a, 0x35, 0x20);
        prog.lineWidth = 2;
        prog.roundRect(-32, -7, 64, 14, 7);
        prog.stroke();
        // 填充：草绿内条（内缩 3px），顶部受光边
        const w = Math.max(10, 58 * (pct / 100));
        prog.fillColor = new Color(0x7e, 0xc8, 0x50);
        prog.roundRect(-29, -4, w, 8, 4);
        prog.fill();
        prog.fillColor = new Color(0xa8, 0xe0, 0x78, 0xcc);
        prog.roundRect(-27, 0.5, Math.max(6, w - 4), 2.5, 1.2);
        prog.fill();
        progN.active = true;
        fertN.active = canFertilize();
      },
      setMature(id: string, _name: string, key: string) {
        if (key === lastKey) return;
        lastKey = key;
        stopMatureFx(); // 换作物成熟时清掉上一套动效再重建
        hideAux();
        drawSoil(true);
        setPlants(id, 50);
        badgeN.active = true;
        // 收获牌上下浮动（点击引导；与三株轻摆合计 2 处动效，微光改静态让出配额）
        tween(badgeN)
          .repeatForever(
            tween<Node>()
              .to(0.5, { position: new Vec3(0, HH + 40, 0) }, { easing: 'sineInOut' })
              .to(0.5, { position: new Vec3(0, HH + 32, 0) }, { easing: 'sineInOut' }),
          )
          .start();
        // 成熟微光（静态丰收黄柔光，不再呼吸）
        glowN = new Node('matureGlow');
        glowN.layer = Layers.Enum.UI_2D;
        glowN.parent = node;
        glowN.setSiblingIndex(1); // 土壤之上、植株之下
        glowN.addComponent(UITransform).setContentSize(96, 56);
        glowN.setPosition(0, 18);
        const gg = glowN.addComponent(Graphics);
        gg.fillColor = new Color(0xff, 0xe9, 0x8a, 0x59);
        gg.ellipse(0, 0, 48, 28);
        gg.fill();
        // 三株轻摆（相位错开；状态反馈，不占装饰配额）
        plants.forEach((p, i) => {
          const ps = spots[i][2];
          tween(p.node)
            .delay(i * 0.22)
            .repeatForever(
              tween<Node>()
                .to(0.9, { scale: new Vec3(ps * 1.07, ps * 1.07, 1) }, { easing: 'sineInOut' })
                .to(0.9, { scale: new Vec3(ps, ps, 1) }, { easing: 'sineInOut' }),
            )
            .start();
        });
      },
      /** 销毁前停掉成熟动效 tween（rebuildFields 重建时调用，防 repeatForever 残留） */
      dispose() {
        stopMatureFx();
      },
    };
  }

  /** 锁定坑位（原型 v3）：草地色虚线菱形轮廓 + 小锁 + 编号；点击提示解锁路径 */
  private makeLockedPlot(parent: Node, x: number, y: number, num: number, onClick: () => void): Node {
    const HW = GameController.PLOT_HW;
    const HH = GameController.PLOT_HH;
    const node = new Node('LockedPlot');
    node.layer = Layers.Enum.UI_2D;
    node.parent = parent;
    node.addComponent(UITransform).setContentSize(HW * 2, HH * 2);
    node.setPosition(x, y);
    const g = node.addComponent(Graphics);
    // 草地色底（与 v3 背景草地融合）+ 虚线轮廓（无土坡，与草地齐平）
    g.fillColor = new Color(0x6f, 0xb5, 0x3f, 0xe6);
    this.traceDiamond(g, 0, 0, HW * 0.96, HH * 0.96);
    g.fill();
    g.lineWidth = 2.2;
    g.strokeColor = new Color(0x4e, 0x8a, 0x2e, 0xe6);
    this.strokeDiamondDashed(g, HW * 0.96, HH * 0.96);
    // 小锁（锁梁弧 + 锁体 + 钥匙孔）
    g.lineWidth = 2;
    g.strokeColor = new Color(0x4a, 0x35, 0x20, 0xeb);
    g.moveTo(-5, 5);
    g.lineTo(-5, 11);
    g.quadraticCurveTo(0, 18, 5, 11);
    g.lineTo(5, 5);
    g.stroke();
    g.fillColor = new Color(0x8a, 0x7a, 0x5a, 0xeb);
    g.roundRect(-10, -10, 20, 15, 3.5);
    g.fill();
    g.strokeColor = new Color(0x4a, 0x35, 0x20, 0xeb);
    g.lineWidth = 1.4;
    g.roundRect(-10, -10, 20, 15, 3.5);
    g.stroke();
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0xeb);
    g.circle(0, -3.5, 1.8);
    g.fill();
    g.lineWidth = 1.6;
    g.strokeColor = new Color(0x4a, 0x35, 0x20, 0xeb);
    g.moveTo(0, -3.5);
    g.lineTo(0, -7);
    g.stroke();
    this.makePlotNumBadge(node, num, true);
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, onClick, this);
    return node;
  }

  /** 锁定坑位点击提示：优先「农场等级门槛」，否则「去商店升级田地」 */
  private lockedFieldTip() {
    if (!this.game) return;
    const upg = this.game.listUpgrades().find((u) => u.line === 'field');
    if (!upg || !upg.next) {
      this.say('田地已全部开垦', 'field');
      return;
    }
    const need = this.game.unlockLevelOf(`upg:field:${upg.next.level}`);
    if (need !== null && need > this.game.level) {
      this.say(`田地 Lv${upg.next.level} 需农场 Lv${need} 解锁`, 'field');
    } else {
      this.say(`去商店升级田地（Lv${upg.level}＞Lv${upg.next.level}）解锁新地块`, 'field'); // 快乐体字库无 →，用 ＞
    }
  }

  /** 田地等级木牌（mockup：农田区右上，挂在栅栏上）：原木底 + 棕描边 + 米白字 */
  private makeFieldSign(parent: Node, unlocked: number) {
    const upg = this.game!.listUpgrades().find((u) => u.line === 'field');
    const lv = upg?.level ?? 1;
    // 紧凑木牌：宽度自适应贴屏幕右缘（右留 10px），避免宽屏 mockup 坐标在窄机顶出屏外
    const W = 164;
    const H = 36;
    const rightX = view.getVisibleSize().width / 2 - 10;
    const n = new Node('FieldSign');
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform).setContentSize(W, H);
    n.setPosition(rightX - W / 2, -13);
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x33); // 软投影
    g.roundRect(-W / 2 + 3, -H / 2 - 4, W, H, 9);
    g.fill();
    g.fillColor = new Color(0x8b, 0x5a, 0x2b); // 原木
    g.roundRect(-W / 2, -H / 2, W, H, 9);
    g.fill();
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.lineWidth = 2;
    g.roundRect(-W / 2, -H / 2, W, H, 9);
    g.stroke();
    g.fillColor = new Color(0xff, 0xf8, 0xe7, 0x40); // 顶部受光边
    g.roundRect(-W / 2 + 14, H / 2 - 7, W - 28, 3, 1.5);
    g.fill();
    const ln = new Node('label');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = n;
    ln.addComponent(UITransform).setContentSize(W, H);
    const ll = ln.addComponent(Label);
    ll.string = `田地 Lv${lv} · ${unlocked}/${GameController.GRID_ROWS.reduce((a, b) => a + b, 0)}`;
    ll.fontSize = 15;
    ll.isBold = true;
    ll.color = new Color(0xff, 0xf8, 0xe7);
  }

  /**
   * 19 坑菱形插缝网格（原型 v3）：固定渲染全部坑位，视觉坑位按 byDist 解锁序排序，
   * 前 save.fields.length 个为已解锁（fields[i] ↔ 排序后第 i 个坑位，核心层零改动），其余为锁态。
   * 微透视行缩放 0.88+ri×0.06（远小近大），按行从后往前创建即 z 序（上行压下行）。
   */
  private rebuildFields() {
    const c = this.fieldsContainer;
    if (!c || !this.game) return;
    for (const p of this.fieldPlots) p.dispose();
    c.removeAllChildren();
    this.fieldPlots = [];
    const ROWS = GameController.GRID_ROWS;
    const STEP_X = GameController.GRID_STEP_X;
    const STEP_Y = GameController.GRID_STEP_Y;
    interface Cell {
      dx: number;
      dy: number;
      x: number;
      y: number;
      scale: number;
      order: number;
    }
    const cells: Cell[] = [];
    const midRow = (ROWS.length - 1) / 2;
    ROWS.forEach((count, ri) => {
      const scale = 0.88 + ri * (0.24 / (ROWS.length - 1)); // 0.88 + ri*0.06
      for (let j = 0; j < count; j++) {
        const dx = j - (count - 1) / 2;
        cells.push({
          dx,
          dy: ri - midRow,
          x: dx * STEP_X * scale,
          y: GameController.GRID_TOP_Y - ri * STEP_Y,
          scale,
          order: 0,
        });
      }
    });
    // 解锁序：到网格中心的视觉距离（dy 按 stepX/stepY 折算成等距环形扩散），同距先上后下、先左后右（稳定排序）
    const DYW = STEP_X / STEP_Y;
    const byDist = [...cells].sort(
      (a, b) =>
        a.dx * a.dx + DYW * DYW * a.dy * a.dy - (b.dx * b.dx + DYW * DYW * b.dy * b.dy) ||
        a.dy - b.dy ||
        a.dx - b.dx,
    );
    byDist.forEach((cell, i) => {
      cell.order = i;
    });
    const unlocked = Math.min(this.game.getSave().fields.length, cells.length);
    // 渲染序 = 行从后往前（dy 小的在上排），同行从左到右
    const renderOrder = [...cells].sort((a, b) => a.dy - b.dy || a.dx - b.dx);
    for (const cell of renderOrder) {
      const i = cell.order;
      if (i < unlocked) {
        const plot = this.makeFieldPlot(c, cell.x, cell.y, i + 1, () => this.handleField(i));
        plot.node.setScale(cell.scale, cell.scale, 1);
        this.fieldPlots[i] = plot;
      } else {
        const n = this.makeLockedPlot(c, cell.x, cell.y, i + 1, () => this.lockedFieldTip());
        n.setScale(cell.scale, cell.scale, 1);
      }
    }
    this.makeFieldSign(c, unlocked);
    // 一键收获胶囊（便利线已购 harvestAll 才显示，木牌正下方贴右缘；避免摆出无法使用的按钮）
    if (this.game.hasConvenienceEffect('harvestAll')) {
      const rightX = view.getVisibleSize().width / 2 - 10;
      this.makePillButton(c, '一键收获', rightX - 54, -58, 108, 30, true, () => this.handleHarvestAll(), 15);
    }
    this.applyUiFont(c); // 地块重建后快乐体重挂（美术 v1.1 ④）
  }

  // ---------- 商店页（原型 v3，对齐 docs/mockups/shop.png；SVG y 向下 → cocosY = 640 - svgY） ----------

  /** 分区标题（mockup：居中标题 + 两侧分隔线，线 svg x70~276/444~650 → cocos ∓290~∓84） */
  private makeSectionTitle(parent: Node, text: string, cy: number) {
    const n = new Node('section');
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform).setContentSize(580, 32);
    n.setPosition(0, cy);
    const g = n.addComponent(Graphics);
    g.strokeColor = new Color(0xc9, 0xb8, 0x91);
    g.lineWidth = 2;
    g.moveTo(-290, 0);
    g.lineTo(-84, 0);
    g.moveTo(84, 0);
    g.lineTo(290, 0);
    g.stroke();
    const ln = new Node('label');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = n;
    ln.addComponent(UITransform).setContentSize(160, 32);
    const ll = ln.addComponent(Label);
    ll.string = text;
    ll.fontSize = 25;
    ll.isBold = true;
    ll.color = new Color(0x8b, 0x5a, 0x2b);
  }

  /** 胶囊按钮（v3 商店售卖区）：主=丰收黄大胶囊（drawCookPill），次=米白胶囊（drawNavTab 未选中底） */
  private makePillButton(
    parent: Node,
    text: string,
    x: number,
    y: number,
    w: number,
    h: number,
    primary: boolean,
    onClick: () => void,
    fontSize = 22,
  ) {
    const n = new Node('pill');
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform).setContentSize(w, h);
    n.setPosition(x, y);
    const g = n.addComponent(Graphics);
    if (primary) this.drawCookPill(g, w, h, true);
    else this.drawNavTab(g, w, h, false);
    const ln = new Node('label');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = n;
    ln.addComponent(UITransform).setContentSize(w, h);
    const ll = ln.addComponent(Label);
    ll.string = text;
    ll.fontSize = fontSize;
    ll.isBold = true;
    ll.color = new Color(0x4a, 0x35, 0x20);
    n.addComponent(Button).transition = Button.Transition.NONE; // 按压态由 Graphics 风格承担，不走 Button 变色
    n.on(Button.EventType.CLICK, () => {
      this.playSfx('click', 0.5);
      onClick();
    }, this);
    return n;
  }

  /** 升级线徽章手绘小图标（田地=苗、厨房=锅、店铺=金币、便利=闪电；画在 r31 徽章圆内，本地原点即圆心） */
  private drawLineIcon(g: Graphics, line: string) {
    if (line === 'field') {
      // 苗：茎 + 两片子叶
      g.lineWidth = 3;
      g.strokeColor = new Color(0x4e, 0x8a, 0x2e);
      g.moveTo(0, -14);
      g.lineTo(0, 6);
      g.stroke();
      g.fillColor = new Color(0x7e, 0xc8, 0x50);
      g.moveTo(0, 2);
      g.quadraticCurveTo(-18, 12, -19, -5);
      g.quadraticCurveTo(-8, -3, 0, 2);
      g.close();
      g.moveTo(0, 7);
      g.quadraticCurveTo(18, 17, 19, 0);
      g.quadraticCurveTo(8, 1, 0, 7);
      g.close();
      g.fill();
      g.lineWidth = 1.5;
      g.strokeColor = new Color(0x4e, 0x8a, 0x2e);
      g.stroke();
    } else if (line === 'kitchen') {
      // 锅：锅身 + 锅口 + 双把手
      g.fillColor = new Color(0x6b, 0x44, 0x23);
      g.roundRect(-14, -12, 28, 18, 6);
      g.fill();
      g.fillColor = new Color(0x4a, 0x35, 0x20);
      g.ellipse(0, 6, 15, 5);
      g.fill();
      g.fillColor = new Color(0x8b, 0x5a, 0x2b);
      g.ellipse(0, 6, 11, 3.2);
      g.fill();
      g.lineWidth = 2.5;
      g.strokeColor = new Color(0x4a, 0x35, 0x20);
      g.moveTo(-14, 0);
      g.lineTo(-19, 3);
      g.moveTo(14, 0);
      g.lineTo(19, 3);
      g.stroke();
    } else if (line === 'shop') {
      // 金币：金圆 + ¥（纯笔画）
      g.fillColor = new Color(0xf2, 0xb8, 0x30);
      g.circle(0, 0, 16);
      g.fill();
      g.lineWidth = 2;
      g.strokeColor = new Color(0x8a, 0x5f, 0x10);
      g.circle(0, 0, 16);
      g.stroke();
      g.lineWidth = 2.6;
      g.strokeColor = new Color(0x6b, 0x44, 0x23);
      g.moveTo(-6, 8);
      g.lineTo(0, 1);
      g.lineTo(6, 8);
      g.moveTo(0, 1);
      g.lineTo(0, -8);
      g.moveTo(-5, -2);
      g.lineTo(5, -2);
      g.moveTo(-5, -6);
      g.lineTo(5, -6);
      g.stroke();
    } else {
      // 便利：闪电（mockup 同款折线，svg y 向下已翻转为 cocos y 向上）
      g.fillColor = new Color(0xf2, 0xb8, 0x30);
      g.moveTo(3, 16);
      g.lineTo(-11, -3);
      g.lineTo(-2, -3);
      g.lineTo(-5, -17);
      g.lineTo(10, 3);
      g.lineTo(1, 3);
      g.close();
      g.fill();
      g.lineWidth = 1.8;
      g.strokeColor = new Color(0x8a, 0x5f, 0x10);
      g.stroke();
    }
  }

  /** 今日特价小黑板（mockup translate(100,436) rotate(-2) → cocos (-260,204) 倾 2°）：木框深棕板 + 架子腿 + 粉笔米白字 */
  private makeSpecialBoard(parent: Node) {
    const n = new Node('SpecialBoard');
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform).setContentSize(140, 130);
    n.setPosition(-260, 204);
    n.angle = 2; // svg rotate(-2) 为顺时针，cocos angle 逆时针为正
    const g = n.addComponent(Graphics);
    // 架子腿（先画腿，板身压其上；svg 腿 M-38 26 L-46 62 已翻转 y）
    g.strokeColor = new Color(0x6b, 0x44, 0x23);
    g.lineWidth = 4;
    g.moveTo(-38, -26);
    g.lineTo(-46, -62);
    g.moveTo(38, -26);
    g.lineTo(46, -62);
    g.stroke();
    // 木框（svg RR(-62,-46,124,76) → cocos 底边 y=-30）
    g.fillColor = new Color(0x8b, 0x5a, 0x2b);
    g.roundRect(-62, -30, 124, 76, 8);
    g.fill();
    g.lineWidth = 2.2;
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.roundRect(-62, -30, 124, 76, 8);
    g.stroke();
    // 黑板面（svg RR(-52,-36,104,56) → cocos 底边 y=-20）
    g.fillColor = new Color(0x3e, 0x32, 0x25);
    g.roundRect(-52, -20, 104, 56, 5);
    g.fill();
    g.lineWidth = 1.5;
    g.strokeColor = new Color(0x2e, 0x24, 0x18);
    g.roundRect(-52, -20, 104, 56, 5);
    g.stroke();
    // 板面下沿两侧粉笔点缀线（svg y16 → cocos -16）
    g.strokeColor = new Color(0xd9, 0xc9, 0xa8, 0x99);
    g.lineWidth = 1.5;
    g.moveTo(-42, -16);
    g.lineTo(-30, -16);
    g.moveTo(30, -16);
    g.lineTo(42, -16);
    g.stroke();
    // 标题「今日特价」（粉笔金黄，svg y-12 → cocos +12）
    const tN = new Node('title');
    tN.layer = Layers.Enum.UI_2D;
    tN.parent = n;
    tN.addComponent(UITransform).setContentSize(104, 22);
    tN.setPosition(0, 12);
    const tL = tN.addComponent(Label);
    tL.string = '今日特价';
    tL.fontSize = 17;
    tL.isBold = true;
    tL.color = new Color(0xf5, 0xd4, 0x7e);
    // 第二行「菜名 +N%」（粉笔米白，svg y+12 → cocos -12；refreshUI 刷新）
    const bN = new Node('body');
    bN.layer = Layers.Enum.UI_2D;
    bN.parent = n;
    bN.addComponent(UITransform).setContentSize(104, 18);
    bN.setPosition(0, -11);
    const bL = bN.addComponent(Label);
    bL.fontSize = 14;
    bL.color = new Color(0xff, 0xf8, 0xe7);
    bL.overflow = Label.Overflow.CLAMP;
    this.specialBoard = n;
    this.specialLabel = bL;
  }

  /**
   * 升级大卡（mockup RR(56,y,608,112,16)，中心 cocos (0,cy)）：
   * 左圆形徽章图标 + 名称「田地 Lv4→5」+ 圆点等级刻度（点亮=丰收黄）+ 下一级效果文案 + 右侧价格胶囊。
   * 满级置灰「已满级」；农场等级未解锁置灰「农场 LvN 解锁」。购买数据流不变（buyUpgrade）。
   */
  private makeUpgradeCard(parent: Node, u: ReturnType<GameCore['listUpgrades']>[number], cy: number) {
    const W = 608;
    const H = 112;
    const name = GameController.LINE_NAMES[u.line] ?? u.line;
    const card = new Node('upgCard');
    card.layer = Layers.Enum.UI_2D;
    card.parent = parent;
    card.addComponent(UITransform).setContentSize(W, H);
    card.setPosition(0, cy);
    const g = card.addComponent(Graphics);
    // 纸卡底（软投影 + 纸面 + 描边 + 顶部 40% 白高光带，mockup RR(64,y+8,592,30)）
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x33);
    g.roundRect(-W / 2 + 4, -H / 2 - 5, W, H, 16);
    g.fill();
    g.fillColor = new Color(0xff, 0xfd, 0xf5);
    g.roundRect(-W / 2, -H / 2, W, H, 16);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.roundRect(-W / 2, -H / 2, W, H, 16);
    g.stroke();
    g.fillColor = new Color(0xff, 0xff, 0xff, 0x66);
    g.roundRect(-W / 2 + 8, H / 2 - 38, W - 16, 30, 11);
    g.fill();

    // 左圆形徽章（mockup C(112,y+56,31) goldSoft + 金描边）+ 线别手绘图标
    const badgeN = new Node('badge');
    badgeN.layer = Layers.Enum.UI_2D;
    badgeN.parent = card;
    badgeN.addComponent(UITransform).setContentSize(64, 64);
    badgeN.setPosition(-248, 0);
    const bg = badgeN.addComponent(Graphics);
    bg.fillColor = new Color(0xff, 0xe9, 0xa8);
    bg.circle(0, 0, 31);
    bg.fill();
    bg.lineWidth = 2.2;
    bg.strokeColor = new Color(0xc9, 0x8f, 0x1b);
    bg.circle(0, 0, 31);
    bg.stroke();
    this.drawLineIcon(bg, u.line);

    // 名称「田地 Lv4＞5」（顶行左对齐；快乐体字库无 →，用 ＞）
    const nameN = new Node('name');
    nameN.layer = Layers.Enum.UI_2D;
    nameN.parent = card;
    const nameUt = nameN.addComponent(UITransform);
    nameUt.setContentSize(330, 30);
    nameUt.setAnchorPoint(0, 0.5);
    nameN.setPosition(-204, 28);
    const nameL = nameN.addComponent(Label);
    nameL.string = u.next ? `${name} Lv${u.level}＞${u.next.level}` : `${name} Lv${u.level}`;
    nameL.fontSize = 23;
    nameL.isBold = true;
    nameL.color = new Color(0x4a, 0x35, 0x20);
    nameL.horizontalAlign = Label.HorizontalAlign.LEFT;
    nameL.overflow = Label.Overflow.CLAMP;

    // 圆点等级刻度（中行：总级数个圆点，已点亮=丰收黄实心）
    const total = Math.max(4, u.next ? u.next.level : u.level);
    const dotR = 7;
    const step = 22;
    const dotsN = new Node('dots');
    dotsN.layer = Layers.Enum.UI_2D;
    dotsN.parent = card;
    dotsN.addComponent(UITransform).setContentSize(total * step, 18);
    const dg = dotsN.addComponent(Graphics);
    for (let p = 0; p < total; p++) {
      dg.fillColor = p < u.level ? new Color(0xf2, 0xb8, 0x30) : new Color(0xe3, 0xd9, 0xc4);
      dg.circle(-190 + p * step, 0, dotR);
      dg.fill();
      dg.lineWidth = 1.5;
      dg.strokeColor = new Color(0x4a, 0x35, 0x20);
      dg.circle(-190 + p * step, 0, dotR);
      dg.stroke();
    }

    // 效果描述（独占底行整宽：下一级效果文案；满级显示当前级描述）
    const descN = new Node('desc');
    descN.layer = Layers.Enum.UI_2D;
    descN.parent = card;
    const descUt = descN.addComponent(UITransform);
    descUt.setContentSize(318, 22); // 右缘让出价格胶囊（本地 x≤128）
    descUt.setAnchorPoint(0, 0.5);
    descN.setPosition(-190, -30);
    const descL = descN.addComponent(Label);
    descL.string = u.next?.desc ?? u.desc;
    descL.fontSize = 15;
    descL.color = new Color(0x8b, 0x5a, 0x2b);
    descL.horizontalAlign = Label.HorizontalAlign.LEFT;
    descL.overflow = Label.Overflow.CLAMP;

    // 右侧价格胶囊（mockup pill(496,y+32,136,48) → 本地 (204,0)）：金=可买，灰=已满级/未解锁
    let pillText: string;
    let enabled: boolean;
    let onTap: () => void;
    let pillFont = 20;
    if (!u.next) {
      pillText = '已满级';
      enabled = false;
      pillFont = 18;
      onTap = () => this.say(`${name}已升满`, 'shop');
    } else if (!this.game!.isUnlocked(`upg:${u.line}:${u.next.level}`)) {
      const need = this.game!.unlockLevelOf(`upg:${u.line}:${u.next.level}`);
      pillText = `农场 Lv${need ?? '?'} 解锁`;
      enabled = false;
      pillFont = 15;
      onTap = () => this.say(`农场 Lv${need ?? '?'} 解锁`, 'shop');
    } else if (this.game!.gold < u.next.cost) {
      // 金币不足：禁用灰胶囊（与种子卡片同语言），点击提示差额
      pillText = `${u.next.cost} 金`;
      enabled = false;
      onTap = () => this.say(`金币不足，升级${name}还差 ${u.next!.cost - this.game!.gold} 金`, 'shop');
    } else {
      pillText = `${u.next.cost} 金`;
      enabled = true;
      onTap = () => this.buyUpgrade(u.line);
    }
    const pill = new Node('price');
    pill.layer = Layers.Enum.UI_2D;
    pill.parent = card;
    pill.addComponent(UITransform).setContentSize(136, 48);
    pill.setPosition(204, 0);
    this.drawCookPill(pill.addComponent(Graphics), 136, 48, enabled);
    const plN = new Node('label');
    plN.layer = Layers.Enum.UI_2D;
    plN.parent = pill;
    plN.addComponent(UITransform).setContentSize(136, 48);
    const plL = plN.addComponent(Label);
    plL.string = pillText;
    plL.fontSize = pillFont;
    plL.isBold = enabled;
    plL.color = enabled ? new Color(0x4a, 0x35, 0x20) : new Color(0xa8, 0x91, 0x6b);
    pill.addComponent(Button).transition = Button.Transition.NONE;
    pill.on(Button.EventType.CLICK, () => {
      this.playSfx('click', 0.5);
      onTap();
    }, this);
  }

  /** 每日奖励按钮（两态）：待领 = 金胶囊 + 两侧星花，可爱勾人点；已领 = 灰米白（文案无 emoji——快乐体字库不含符号字形） */
  private makeDailyButton(parent: Node, x: number, y: number) {
    const canClaim = this.game!.canClaimDaily();
    const w = 264, h = 54;
    const n = new Node('dailyBtn');
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform).setContentSize(w, h);
    n.setPosition(x, y);
    const g = n.addComponent(Graphics);
    if (canClaim) {
      this.drawCookPill(g, w, h, true); // 金胶囊
      // 两侧四角星花点缀（同收获牌语言）
      g.fillColor = new Color(0xff, 0xfd, 0xf5);
      const star = (sx: number, sy: number, r: number) => {
        const k = r * 0.38;
        g.moveTo(sx, sy - r);
        g.lineTo(sx + k, sy - k);
        g.lineTo(sx + r, sy);
        g.lineTo(sx + k, sy + k);
        g.lineTo(sx, sy + r);
        g.lineTo(sx - k, sy + k);
        g.lineTo(sx - r, sy);
        g.lineTo(sx - k, sy - k);
        g.close();
        g.fill();
      };
      star(-w / 2 + 16, 12, 6);
      star(w / 2 - 14, -10, 7);
    } else {
      this.drawCookPill(g, w, h, false); // 置灰
    }
    const ln = new Node('label');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = n;
    ln.addComponent(UITransform).setContentSize(w, h);
    const ll = ln.addComponent(Label);
    ll.string = canClaim ? '每日奖励' : '今日已领取';
    ll.fontSize = 22;
    ll.isBold = canClaim;
    ll.color = canClaim ? new Color(0x4a, 0x35, 0x20) : new Color(0xa8, 0x91, 0x6b);
    const btn = n.addComponent(Button);
    btn.transition = Button.Transition.SCALE;
    btn.zoomScale = canClaim ? 0.93 : 1; // 待领态按下回弹，勾人点击
    btn.duration = 0.08;
    n.on(Button.EventType.CLICK, () => {
      this.playSfx('click', 0.5);
      this.onDailyReward();
    }, this);
  }

  /**
   * 商店页（原型 v3，对齐 docs/mockups/shop.png；SVG y 向下 → cocosY = 640 - svgY）：
   * 「售卖」分区（收益预览 + 全部卖出金胶囊 + 只卖菜品/每日奖励米白胶囊 + 今日特价小黑板）+
   * 「升级」分区（四条升级线大卡 y=572+i×136）。
   * 4 卡排布在可视区内（卡底 cocos -452 > 导航顶 -558），无需 ScrollView。
   */
  private refreshShop() {
    const c = this.upgradeContainer;
    if (!c || !this.game) return;
    c.removeAllChildren();
    this.sellPreviewLabel = null;
    this.specialBoard = null;
    this.specialLabel = null;

    // —— 分区 1：售卖（标题 svg y196~204 → cocos 440）——
    this.makeSectionTitle(c, '售卖', 440);
    // 收益预览（svg y238 → cocos 402；previewSellAll 只读口径，refreshUI 逐帧刷新）
    const pvN = new Node('sellPreview');
    pvN.layer = Layers.Enum.UI_2D;
    pvN.parent = c;
    pvN.addComponent(UITransform).setContentSize(420, 26);
    pvN.setPosition(0, 402);
    const pvL = pvN.addComponent(Label);
    pvL.fontSize = 19;
    pvL.isBold = true;
    pvL.color = new Color(0x8b, 0x5a, 0x2b);
    const pv = this.game.previewSellAll();
    pvL.string = pv.gold > 0 ? `全部卖出（菜品+作物），+${pv.gold} 金币` : '暂无可卖的存货';
    this.sellPreviewLabel = pvL;
    // 全部卖出（金大胶囊 328×58，svg (196,256) → 中心 cocos (0,355)）
    this.makePillButton(c, '全部卖出', 0, 355, 328, 58, true, () => this.onSellAll(), 26);
    // 只卖菜品 / 每日奖励（米白胶囊 264×54，svg y330 → 中心 cocos 283）
    this.makePillButton(c, '只卖菜品', -158, 283, 264, 54, false, () => this.onSellDishes());
    this.makeDailyButton(c, 158, 283);
    // 今日特价小黑板（售卖区左侧；dailySpecial() 为 null 时 refreshUI 整板隐藏）
    this.makeSpecialBoard(c);

    // —— 分区 2：升级（标题 svg y536~544 → cocos 100；卡中心 cocos 12-i×136）——
    this.makeSectionTitle(c, '升级', 100);
    this.game.listUpgrades().forEach((u, i) => {
      this.makeUpgradeCard(c, u, 12 - i * 136);
    });
  }

  /** 求购页：当日订单卡（交付 / 缺货 / 未发现）。与小铺卖出分开。 */
  private refreshOrders() {
    const c = this.orderContainer;
    if (!c || !this.game) return;
    c.removeAllChildren();
    const title = this.makeTitle(c, '镇民订单', 28);
    title.setPosition(0, 480);
    const sub = this.makeTitle(c, '把菜端给人 · 溢价高于小铺直卖', 16);
    sub.setPosition(0, 440);
    (sub.getComponent(Label)!).color = new Color(0x8b, 0x5a, 0x2b);

    const list = this.game.listOrders();
    if (list.length === 0) {
      const empty = this.makeTitle(c, '今天的单都交完了，明天再来看看', 20);
      empty.setPosition(0, 200);
      return;
    }
    list.forEach((o, i) => {
      const y = 320 - i * 168;
      const card = new Node(`order_${o.id}`);
      card.layer = Layers.Enum.UI_2D;
      card.parent = c;
      card.setPosition(0, y);
      card.addComponent(UITransform).setContentSize(640, 150);
      const g = card.addComponent(Graphics);
      g.fillColor = o.state === 'locked' ? new Color(0xed, 0xe3, 0xcc) : new Color(0xff, 0xfd, 0xf5);
      g.roundRect(-320, -75, 640, 150, 16);
      g.fill();
      g.lineWidth = 2.5;
      g.strokeColor = new Color(0x4a, 0x35, 0x20);
      g.roundRect(-320, -75, 640, 150, 16);
      g.stroke();

      const name = this.makeTitle(card, `${o.npcName}  ${o.npcTitle}`, 22);
      name.setPosition(-40, 48);
      const want = this.makeTitle(card, `想要  ${o.itemName} ×${o.qty}`, 18);
      want.setPosition(-70, 12);
      const pay = this.makeTitle(card, `报酬 ${o.pay} 金  溢价×${o.premium}  好心+${o.affinity}`, 16);
      pay.setPosition(-20, -22);
      (pay.getComponent(Label)!).color = new Color(0x8b, 0x5a, 0x2b);

      const sf = this.iconFrames[o.itemId];
      if (sf) {
        const iconN = new Node('icon');
        iconN.layer = Layers.Enum.UI_2D;
        iconN.parent = card;
        iconN.setPosition(-250, 8);
        const iut = iconN.addComponent(UITransform);
        iut.setContentSize(56, 56);
        const sp = iconN.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = sf;
        iut.setContentSize(56, 56);
      }

      const label = o.state === 'ready' ? '交付' : o.state === 'lack' ? '缺货' : '未发现';
      this.makePillButton(card, label, 210, -8, 150, 52, o.state === 'ready', () => {
        if (o.state === 'locked') {
          this.say('图鉴里还没有这道菜', 'orders');
          return;
        }
        if (o.state === 'lack') {
          this.say('货不够，先去田里收或厨房做', 'orders');
          return;
        }
        this.run(() => {
          const r = this.game!.deliverOrder(o.id);
          this.playSfx('coin');
          this.say(`交给${r.npcName}，+${r.gold} 金，好心 +${r.affinityGain}`, 'orders');
          this.refreshOrders();
          this.refreshKitchen();
        });
      }, 22);
    });
  }

  private buyUpgrade(line: string) {
    this.run(() => {
      const def = this.game!.buyUpgrade(line);
      this.playSfx('upgrade');
      this.say(def.desc ?? '升级成功', 'shop');
      this.refreshShop();
      this.refreshSeeds(); // 田地升级可能解锁新作物
      if (def.effect.type === 'fieldSlots') this.rebuildFields();
      if (line === 'convenience') this.rebuildFields(); // 购得一键收获/自动重播后刷新木牌旁胶囊
    });
  }

  update(dt: number) {
    if (!this.game) return;
    this.saveTimer += dt;
    if (this.saveTimer >= AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      this.writeSave();
    }
    this.refreshUI();
    this.tickPotAnim(dt); // 大锅搅拌动效（非烹饪中 potAnim 为 null，空转）
  }

  onDestroy() {
    if (this.game) this.writeSave();
  }

  // ---------- 静态按钮事件（Click Events 绑定） ----------

  /** 地块智能按钮（customData = 地块编号）：空地→种当前选中种子；成熟→收获；生长中→提示 */
  onClickField(_event: Event, customData: string) {
    this.handleField(Number(customData));
  }

  /** 动态/静态地块按钮共用的交互逻辑（原型 v3：空地不再直接种，改为弹出底部种子抽屉） */
  private handleField(i: number) {
    if (!this.game) return;
    if (!this.game.getSave().fields[i]) {
      this.playSfx('click', 0.5);
      this.openSeedDrawer(i);
      return;
    }
    this.run(() => {
      if (this.game!.growthProgress(i) >= 1) {
        const wasSeen = this.game!.getSave().seenCrops.includes(this.game!.getSave().fields[i]!.cropId);
        const id = this.game!.harvest(i)!;
        this.playSfx('harvest');
        this.say(`收获了 ${this.game!.cropName(id)} ×1`, 'field');
        this.maybeTalk('field', 'onHarvest');
        const plot = this.fieldPlots[i];
        if (plot) this.playHarvest(plot.node, id); // 收获动效：图标弹跳飞出
        this.refreshKitchen(); // 新食材进库存，刷新可选列表
        this.refreshCollection(); // 作物图鉴点亮
        // 首次收获该作物 = 发现时刻（与食谱发现同规格弹窗；T4 作物给稀有表现）
        if (!wasSeen) {
          const info = this.game!.cropBook().find((c) => c.id === id);
          const rare = (info?.tier ?? 1) >= 4;
          this.playSfx(rare ? 'discovery_rare' : 'discovery', 0.9);
          this.playDiscovery(id, this.game!.cropName(id), {
            rare,
            desc: info?.desc,
            header: rare ? '发现稀有作物！' : '发现新作物！', // 快乐体字库无 emoji，庆祝感交给星星爆开动效
          });
        }
      } else {
        this.say('还没成熟，再等等', 'field');
      }
    });
  }

  /** 化肥催熟（生长态地块右上角金钮）：花 config.fertilizeCost 金币让该地块立即成熟；失败把核心抛错 say 出来 */
  private handleFertilize(i: number) {
    if (!this.game) return;
    this.run(() => {
      this.game!.fertilize(i);
      this.playSfx('fertilize'); // 催熟专属音效（沙沙 + 上行闪烁），金币条回落即为扣费反馈
      this.say('化肥催熟，作物立即成熟！', 'field');
    });
  }

  /** 一键收获（便利线 Lv3，木牌旁胶囊）：收获全部成熟地块，汇总提示 + 汇总飞行动效（每屏动效 ≤2 原则） */
  private handleHarvestAll() {
    if (!this.game) return;
    this.run(() => {
      const list = this.game!.harvestAll();
      if (list.length === 0) {
        this.say('还没有成熟的作物', 'field');
        return;
      }
      this.playSfx('harvest');
      this.say(`收获了 ×${list.length} 份作物`, 'field');
      this.maybeTalk('field', 'onHarvest');
      // 批量时不逐块播动效，简化为首块被收地块一次汇总飞行动效
      const plot = this.fieldPlots[list[0].fieldIndex];
      if (plot) this.playHarvest(plot.node, list[0].cropId);
      this.refreshKitchen(); // 新食材进库存，刷新可选列表
      this.refreshCollection(); // 作物图鉴点亮
    });
  }

  onCollectDish() {
    this.run(() => {
      const result = this.game!.collectDish();
      if (!result) {
        this.say('还没做好', 'kitchen');
      } else if (result.isNew) {
        // 发现新食谱：出锅瞬间才揭晓，庆祝层 + 图鉴点亮都压在这个高光时刻
        const recipe = this.game!.recipeOf(result.dishId);
        const rare = Object.keys(recipe.ingredients).length >= 3; // 三食材菜 = 稀有食谱，更强正反馈
        this.playSfx(rare ? 'discovery_rare' : 'discovery', 0.9);
        this.playDiscovery(recipe.id, recipe.name, { rare, desc: recipe.desc });
        if (result.refund > 0) this.say(`黑暗料理……但至少是一种发现，返还了 ${result.refund} 金币（新手安慰）`, 'kitchen');
        if (this.game!.isDarkDish(result.dishId)) this.maybeTalk('kitchen', 'onDark');
        this.refreshCollection(); // 图鉴点亮
      } else if (result.refund > 0) {
        this.playSfx('dark'); // 新手保护期黑暗料理（毕业后黑暗料理暂无专属提示音，归入 cook_done）
        this.say(`出锅：${this.game!.dishName(result.dishId)}……没人欣赏，返还了 ${result.refund} 金币（新手安慰）`, 'kitchen');
        if (this.game!.isDarkDish(result.dishId)) this.maybeTalk('kitchen', 'onDark');
      } else {
        this.playSfx('cook_done');
        this.say(`菜品出锅：${this.game!.dishName(result.dishId)}`, 'kitchen');
      }
      this.refreshKitchen(); // 出锅后回到待开始态（食材/槽位/按钮全量重建）
    });
  }

  onSellAll() {
    this.run(() => {
      const r = this.game!.sellAll(); // 与 previewSellAll 同口径实卖（含店铺倍率+今日特价）
      if (r.gold > 0) this.playSfx('coin');
      this.say(r.gold > 0 ? `全部卖出，+${r.gold} 金币（菜品 ${r.dishes} 份 + 作物 ${r.crops} 份）` : '没有可卖的东西', 'shop');
      this.refreshKitchen();
      this.refreshShop(); // 金币变了，升级价格胶囊的可买态要重算
    });
  }

  /** 只卖菜品（作物留着做菜）——按钮由 setupSellDishesButton 代码创建 */
  onSellDishes() {
    this.run(() => {
      const inv = this.game!.getSave().inventory;
      let earned = 0;
      for (const [id, n] of Object.entries(inv.dishes)) {
        if (n > 0) earned += this.game!.sellDish(id, n);
      }
      if (earned > 0) this.playSfx('coin');
      this.say(earned > 0 ? `卖出全部菜品，+${earned} 金币` : '没有可卖的菜品', 'shop');
      this.refreshShop(); // 金币变了，升级价格胶囊的可买态要重算
    });
  }

  onDailyReward() {
    this.run(() => {
      const r = this.game!.claimDailyReward();
      if (r > 0) {
        this.playSfx('daily');
        this.say(`每日奖励 +${r} 金币`, 'shop');
        this.refreshShop(); // 按钮翻成「今日已领取 ✓」
      } else {
        this.say('今天已经领过了，明天再来吧', 'shop');
      }
    });
  }

  // ---------- 分页框架（M2-3） ----------

  /**
   * 创建四个页容器 + 底部导航，并把场景里的静态节点换父节点归入各页。
   * 场景占位容器（SeedRoot/KitchenRoot）弃用隐藏，保留节点仅为 check-scene 接线约定。
   */
  private setupPages() {
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas) return;
    if (this.seedContainer) this.seedContainer.active = false;
    if (this.kitchenContainer) this.kitchenContainer.active = false;
    // 全局消息栏弃用：改为每页一个、位置统一（M2 体验反馈：跨页重合）
    if (this.messageLabel) this.messageLabel.node.active = false;
    // 可见区域（随分辨率适配策略变化）：消息栏贴可见顶边；导航/金币条用 Widget 钉边（不手算）
    const vis = view.getVisibleSize();
    const topY = vis.height / 2;

    for (const { key } of GameController.PAGES) {
      const p = new Node(`Page_${key}`);
      p.layer = Layers.Enum.UI_2D;
      p.parent = canvas;
      p.active = false;
      this.pages[key] = p;
      this.makePageBg(p, key, vis); // 页面底色（美术 v1.0 皮肤化第一步）
      this.addAmbient(key, p); // 环境生气动效（美术 v1.1 ⑥）：每屏 ≤2 处循环小动效
      // 每页统一位置的消息栏（收获→田地页、烹饪→厨房页、装修/售卖→商店页）
      const msgNode = new Node('PageMessage');
      msgNode.layer = Layers.Enum.UI_2D;
      msgNode.parent = p;
      msgNode.setPosition(0, topY - 105);
      msgNode.addComponent(UITransform);
      const msgLabel = msgNode.addComponent(Label);
      msgLabel.fontSize = 20;
      // 厨房页底深用浅字，其余页用描边棕
      msgLabel.color = key === 'kitchen' ? new Color(0xff, 0xe9, 0xa8) : new Color(0x4a, 0x35, 0x20);
      msgNode.addComponent(UIOpacity).opacity = 0; // 初始隐藏，say/sayAll 时闪现 3 秒淡出
      this.pageMessages[key] = msgLabel;
    }

    // 各页内容容器（纯容器 + makeCardPanel 手动排版，不依赖 Layout）
    // 注：田地页种子列表已改底部抽屉（buildSeedDrawer），不再占用页内容器
    this.kitchenContainer = this.makePlain(this.pages.kitchen, 'KitchenPanel', 0, 0);
    this.upgradeContainer = this.makePlain(this.pages.shop, 'UpgradeRoot', 0, 0);
    this.orderContainer = this.makePlain(this.pages.orders, 'OrderRoot', 0, 0);
    this.collectionContainer = this.makePlain(this.pages.book, 'CollectionRoot', 0, 520);

    // 场景静态节点归位（保持槽位绑定有效，仅运行时换父节点）
    // v3：厨房倒计时文字（KitchenLabel）与场景「出锅」按钮（CollectButton）隐藏收编——
    // 倒计时改进度条、出锅并入单状态按钮，场景节点保留仅为 check-scene 接线约定
    this.moveToPage(canvas, 'KitchenLabel', this.pages.kitchen, 0, 505);
    this.moveToPage(canvas, 'CollectButton', this.pages.kitchen, 0, -40);
    this.collectBtn = this.pages.kitchen.getChildByName('CollectButton');
    if (this.kitchenLabel) this.kitchenLabel.node.active = false;
    if (this.collectBtn) this.collectBtn.active = false;
    // v3：商店页场景按钮（全部卖出/每日奖励）隐藏收编——售卖区按钮改代码绘制（金胶囊/米白胶囊），
    // 场景节点保留仅为 check-scene 接线约定
    this.moveToPage(canvas, 'SellAllButton', this.pages.shop, 0, 380);
    this.moveToPage(canvas, 'DailyButton', this.pages.shop, 0, 260);
    const sellAllScene = this.pages.shop.getChildByName('SellAllButton');
    const dailyScene = this.pages.shop.getChildByName('DailyButton');
    if (sellAllScene) sellAllScene.active = false;
    if (dailyScene) dailyScene.active = false;
    // 库存栏弃用场景节点（静态节点摆位不可靠），改代码动态创建；
    // v3 无独立库存栏（收益预览文案已体现），精简为底部一行小字
    const invScene = canvas.getChildByName('InventoryLabel');
    if (invScene) invScene.active = false;
    const invNode = new Node('InventoryInfo');
    invNode.layer = Layers.Enum.UI_2D;
    invNode.parent = this.pages.shop;
    invNode.setPosition(0, -498); // 升级卡列表之下、底部导航之上
    invNode.addComponent(UITransform).setContentSize(620, 24);
    this.invLabel = invNode.addComponent(Label);
    this.invLabel.fontSize = 14;
    this.invLabel.overflow = Label.Overflow.CLAMP;

    // 底部导航栏（原型 v3：四枚大胶囊 tab 等距横排；Widget 钉在 Canvas 真实底边，内部手动算坐标，不用 Layout）
    const NAV_TAB_H = 66;
    const NAV_MARGIN = 26; // 与 mockup 两侧留白一致
    const NAV_GAP_MIN = 8;
    const nav = new Node('NavBar');
    nav.layer = Layers.Enum.UI_2D;
    nav.parent = canvas;
    const navWidget = nav.addComponent(Widget);
    navWidget.isAlignBottom = true;
    navWidget.isAlignHorizontalCenter = true;
    navWidget.bottom = 16;
    navWidget.horizontalCenter = 0;
    navWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    const navUt = nav.addComponent(UITransform);
    navUt.setAnchorPoint(0.5, 0.5);
    navUt.setContentSize(vis.width, NAV_TAB_H);
    const nTabs = GameController.PAGES.length;
    let tabW = nTabs <= 4 ? 164 : 120;
    let gap = (vis.width - NAV_MARGIN * 2 - tabW * nTabs) / (nTabs - 1);
    if (gap < NAV_GAP_MIN) {
      gap = NAV_GAP_MIN;
      tabW = (vis.width - NAV_MARGIN * 2 - gap * (nTabs - 1)) / nTabs;
    }
    const tabFont = nTabs <= 4 ? 26 : 22;
    GameController.PAGES.forEach(({ key, name }, i) => {
      const on = key === this.currentPage;
      const tab = new Node(`NavTab_${key}`);
      tab.layer = Layers.Enum.UI_2D;
      tab.parent = nav;
      tab.addComponent(UITransform).setContentSize(tabW, NAV_TAB_H);
      tab.setPosition(-vis.width / 2 + NAV_MARGIN + tabW / 2 + i * (tabW + gap), 0);
      const g = tab.addComponent(Graphics);
      const btn = tab.addComponent(Button);
      btn.transition = Button.Transition.NONE; // 颜色态由 Graphics 重绘承担，不走 Button 变色
      const labelN = new Node('label');
      labelN.layer = Layers.Enum.UI_2D;
      labelN.parent = tab;
      labelN.addComponent(UITransform).setContentSize(tabW, NAV_TAB_H);
      const label = labelN.addComponent(Label);
      label.string = name;
      label.fontSize = tabFont;
      label.isBold = on;
      label.color = on ? new Color(0x6b, 0x44, 0x23) : new Color(0x4a, 0x35, 0x20);
      this.drawNavTab(g, tabW, NAV_TAB_H, on);
      tab.on(Button.EventType.CLICK, () => {
        this.playSfx('click', 0.5);
        this.switchPage(key);
      }, this);
      this.navItems.push({ key, name, label, g, w: tabW, h: NAV_TAB_H, on });
    });

    // 顶部金币胶囊（原型 v3：右上贴边；深棕胶囊 + 受光边 + 软投影 + 金币图标 + 「+」付费伏笔）
    // （置于所有页面之上，场景金币 Label 换父节点收编——页面全屏背景会盖住 Canvas 下原有的金币 Label）
    const bar = new Node('GoldBar');
    bar.layer = Layers.Enum.UI_2D;
    bar.parent = canvas;
    const barWidget = bar.addComponent(Widget);
    barWidget.isAlignTop = true;
    barWidget.isAlignRight = true;
    barWidget.top = 12;
    barWidget.right = 16;
    barWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    bar.addComponent(UITransform).setContentSize(240, 52);
    this.drawHudCapsule(bar.addComponent(Graphics), 240, 52);
    this.goldBar = bar;
    // 丰收黄金币图标（¥）
    const coinN = new Node('coin');
    coinN.layer = Layers.Enum.UI_2D;
    coinN.parent = bar;
    coinN.addComponent(UITransform).setContentSize(30, 30);
    coinN.setPosition(-90, 0);
    const coinG = coinN.addComponent(Graphics);
    coinG.fillColor = new Color(0xf2, 0xb8, 0x30);
    coinG.circle(0, 0, 15);
    coinG.fill();
    coinG.lineWidth = 2;
    coinG.strokeColor = new Color(0x4a, 0x35, 0x20);
    coinG.circle(0, 0, 15);
    coinG.stroke();
    const coinL = coinN.addComponent(Label);
    coinL.string = '¥';
    coinL.fontSize = 17;
    coinL.isBold = true;
    coinL.color = new Color(0x6b, 0x44, 0x23);
    // 「+」按钮（预留：只弹消息提示，不接付费）
    const plus = new Node('GoldPlus');
    plus.layer = Layers.Enum.UI_2D;
    plus.parent = bar;
    plus.addComponent(UITransform).setContentSize(30, 30);
    plus.setPosition(92, 0);
    const plusG = plus.addComponent(Graphics);
    plusG.fillColor = new Color(0xf2, 0xb8, 0x30);
    plusG.circle(0, 0, 14);
    plusG.fill();
    plusG.lineWidth = 2;
    plusG.strokeColor = new Color(0x4a, 0x35, 0x20);
    plusG.circle(0, 0, 14);
    plusG.stroke();
    plusG.lineWidth = 3;
    plusG.moveTo(0, -5.5);
    plusG.lineTo(0, 5.5);
    plusG.moveTo(-5.5, 0);
    plusG.lineTo(5.5, 0);
    plusG.stroke();
    const plusBtn = plus.addComponent(Button);
    plusBtn.transition = Button.Transition.SCALE;
    plusBtn.zoomScale = 0.92;
    plus.on(Button.EventType.CLICK, () => {
      this.playSfx('click', 0.5);
      this.sayAll('更多金币获取方式敬请期待！');
    }, this);
    if (this.goldLabel) {
      this.goldLabel.node.parent = bar;
      this.goldLabel.node.setPosition(4, 0);
      this.goldLabel.color = new Color(0xff, 0xe9, 0xa8);
      this.goldLabel.isBold = true;
    }

    // 顶部个人区胶囊（M3-① 顶栏布局定案：左上=个人区，右上=金币胶囊；四页统一出现）
    const prof = new Node('ProfileBar');
    prof.layer = Layers.Enum.UI_2D;
    prof.parent = canvas;
    const profWidget = prof.addComponent(Widget);
    profWidget.isAlignTop = true;
    profWidget.isAlignLeft = true;
    profWidget.top = 12;
    profWidget.left = 16;
    profWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
    prof.addComponent(UITransform).setContentSize(280, 52);
    this.drawHudCapsule(prof.addComponent(Graphics), 280, 52);
    this.profileBar = prof;
    // 圆形头像占位（程序化简笔外婆：金圈 + 肤色脸 + 灰白发髻）
    const av = new Node('avatar');
    av.layer = Layers.Enum.UI_2D;
    av.parent = prof;
    av.addComponent(UITransform).setContentSize(44, 44);
    av.setPosition(-112, 0);
    const ag = av.addComponent(Graphics);
    ag.fillColor = new Color(0xf2, 0xb8, 0x30);
    ag.circle(0, 0, 21);
    ag.fill();
    ag.fillColor = new Color(0xf5, 0xc9, 0x9a);
    ag.circle(0, -3, 15);
    ag.fill();
    ag.fillColor = new Color(0xe8, 0xe0, 0xd0);
    ag.circle(0, 13, 8);
    ag.fill();
    // Lv 徽章（原型 v3：丰收黄小胶囊底 + 深木字）
    const lvN = new Node('lvBadge');
    lvN.layer = Layers.Enum.UI_2D;
    lvN.parent = prof;
    lvN.addComponent(UITransform).setContentSize(48, 24);
    lvN.setPosition(-64, 0);
    const lvG = lvN.addComponent(Graphics);
    lvG.fillColor = new Color(0xf2, 0xb8, 0x30);
    lvG.roundRect(-24, -12, 48, 24, 12);
    lvG.fill();
    lvG.lineWidth = 2;
    lvG.strokeColor = new Color(0x4a, 0x35, 0x20);
    lvG.roundRect(-24, -12, 48, 24, 12);
    lvG.stroke();
    const lvTN = new Node('text');
    lvTN.layer = Layers.Enum.UI_2D;
    lvTN.parent = lvN;
    lvTN.addComponent(UITransform).setContentSize(48, 24);
    this.lvLabel = lvTN.addComponent(Label);
    this.lvLabel.string = 'Lv1';
    this.lvLabel.fontSize = 15;
    this.lvLabel.isBold = true;
    this.lvLabel.color = new Color(0x6b, 0x44, 0x23);
    // 经验数字（xp/next）与经验条
    const xpTN = new Node('xpText');
    xpTN.layer = Layers.Enum.UI_2D;
    xpTN.parent = prof;
    xpTN.addComponent(UITransform).setContentSize(170, 16);
    xpTN.setPosition(45, 11);
    this.xpTextLabel = xpTN.addComponent(Label);
    this.xpTextLabel.string = '0/100';
    this.xpTextLabel.fontSize = 13;
    this.xpTextLabel.color = new Color(0xff, 0xe9, 0xa8);
    const xpBN = new Node('xpBar');
    xpBN.layer = Layers.Enum.UI_2D;
    xpBN.parent = prof;
    xpBN.addComponent(UITransform).setContentSize(170, 10);
    xpBN.setPosition(45, -9);
    this.xpBarG = xpBN.addComponent(Graphics);

    // 场景 Label 配色适配新底色（美术规范：深色底用浅麦字、浅色底用描边棕）
    if (this.kitchenLabel) this.kitchenLabel.color = new Color(0xff, 0xe9, 0xa8);
    if (this.invLabel) this.invLabel.color = new Color(0x4a, 0x35, 0x20);
  }

  /** 纯容器（无 Layout）：子节点全部手动摆位——图鉴页专用，嵌套 Layout 在此页两次翻车，弃用 */
  private makePlain(parent: Node, name: string, x: number, y: number): Node {
    const c = new Node(name);
    c.layer = Layers.Enum.UI_2D;
    c.parent = parent;
    c.setPosition(x, y);
    const ut = c.addComponent(UITransform);
    ut.setAnchorPoint(0.5, 1);
    return c;
  }

  /** HUD 深棕胶囊（原型 v3 顶栏质感）：软投影 + 深棕底 + 顶部受光带（光源左上 45°，美术规范 §3） */
  private drawHudCapsule(g: Graphics, w: number, h: number) {
    const x = -w / 2;
    const y = -h / 2;
    const r = h / 2;
    g.clear();
    // 软投影（规范 §2.4：深棕阴影，不用灰黑）
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40);
    g.roundRect(x + 3, y - 4, w, h, r);
    g.fill();
    // 深棕底
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0xd1);
    g.roundRect(x, y, w, h, r);
    g.fill();
    // 上半受光带（深木色叠出“深棕渐变”感，Graphics 无渐变，用双层近似）
    g.fillColor = new Color(0x6b, 0x44, 0x23, 0x66);
    g.roundRect(x + 4, y + h * 0.48, w - 8, h * 0.48 - 4, r * 0.7);
    g.fill();
    // 顶部受光边（左上光源的亮线）
    g.fillColor = new Color(0xff, 0xe9, 0xa8, 0x59);
    g.roundRect(x + 14, y + h - 6, w - 28, 2.5, 1.25);
    g.fill();
  }

  /** 底部导航胶囊 tab（原型 v3）：未选中=米白底棕描边，选中=丰收黄填充；仅状态变化时重绘 */
  private drawNavTab(g: Graphics, w: number, h: number, on: boolean) {
    const x = -w / 2;
    const y = -h / 2;
    const r = h / 2;
    g.clear();
    // 软投影
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40);
    g.roundRect(x + 2, y - 3, w, h, r);
    g.fill();
    // 底 + 描边
    g.fillColor = on ? new Color(0xf2, 0xb8, 0x30) : new Color(0xff, 0xfd, 0xf5);
    g.roundRect(x, y, w, h, r);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.roundRect(x, y, w, h, r);
    g.stroke();
    // 顶部受光边
    g.fillColor = on ? new Color(0xff, 0xff, 0xff, 0x4d) : new Color(0xff, 0xff, 0xff, 0x8c);
    g.roundRect(x + 12, y + h - 7, w - 24, 3.5, 1.75);
    g.fill();
  }

  /** 创建带 Layout 的列容器（anchor 顶部居中，向下生长）；cols>1 时为网格布局 */
  private makePanel(parent: Node, name: string, x: number, y: number, cols = 1): Node {
    const c = new Node(name);
    c.layer = Layers.Enum.UI_2D;
    c.parent = parent;
    c.setPosition(x, y);
    const ut = c.addComponent(UITransform);
    ut.setAnchorPoint(0.5, 1);
    const layout = c.addComponent(Layout);
    if (cols > 1) {
      layout.type = Layout.Type.GRID;
      layout.startAxis = Layout.AxisDirection.HORIZONTAL;
      layout.constraint = Layout.Constraint.FIXED_COL;
      layout.constraintNum = cols;
      layout.spacingX = 10;
    } else {
      layout.type = Layout.Type.VERTICAL;
    }
    layout.spacingY = 8;
    layout.resizeMode = Layout.ResizeMode.CONTAINER;
    return c;
  }

  /** 页面背景：优先场景大图（assets/resources/bg），缺失时降级 Graphics 色块底；尺寸铺满可见区域（宽高只扩不缩，软质美术拉伸无感） */
  private makePageBg(page: Node, key: string, vis: { width: number; height: number }) {
    const w = Math.max(720, vis.width);
    const h = Math.max(1280, vis.height);
    const sf = this.bgFrames[key === 'orders' ? 'shop' : key];
    if (sf) {
      const n = new Node('PageBg');
      n.layer = Layers.Enum.UI_2D;
      n.parent = page;
      const ut = n.addComponent(UITransform);
      ut.setContentSize(w, h);
      const sp = n.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM; // 先 CUSTOM 再赋帧，防引擎隐式 resize
      sp.spriteFrame = sf;
      ut.setContentSize(w, h);
      return;
    }
    const n = new Node('PageBg');
    n.layer = Layers.Enum.UI_2D;
    n.parent = page;
    n.addComponent(UITransform).setContentSize(w, h);
    const g = n.addComponent(Graphics);
    const rect = (x: number, y: number, w2: number, h2: number, c: Color) => {
      g.fillColor = c;
      g.rect(x, y, w2, h2);
      g.fill();
    };
    // 坐标系：Canvas 中心为原点，y 向上；全屏 = (-w/2,-h/2) 到 (w/2,h/2)
    const hw = w / 2;
    const hh = h / 2;
    if (key === 'field') {
      rect(-hw, hh - 512, w, 512, new Color(0xbe, 0xe3, 0xd8)); // 天空（上 40%）
      rect(-hw, -hh, w, h - 512, new Color(0x7e, 0xc8, 0x50)); // 草地
    } else if (key === 'kitchen') {
      rect(-hw, -hh, w, h, new Color(0x7e, 0x51, 0x27)); // 木墙
      rect(-hw, -hh, w, 172, new Color(0x6b, 0x44, 0x23)); // 地板带
    } else if (key === 'shop' || key === 'orders') {
      rect(-hw, -hh, w, h, new Color(0xf5, 0xe8, 0xc8)); // 奶油墙（订单页复用小铺底）
    } else {
      rect(-hw, -hh, w, h, new Color(0xf9, 0xef, 0xd8)); // 图鉴纸
    }
  }

  /** 把 Canvas 下的场景节点换父节点到指定页并摆位 */
  private moveToPage(canvas: Node, name: string, page: Node, x: number, y: number) {
    const n = canvas.getChildByName(name);
    if (!n) return;
    n.parent = page;
    n.setPosition(x, y);
  }

  /**
   * 环境生气动效（美术 v1.1 ⑥，守 §7 每屏动效 ≤2）：
   * 田地页 = 小屋炊烟（烟囱口 = bg-lib farmhouse(486,560) 烟囱顶 SVG(608,422) → Cocos(248,218)）；
   * 厨房页 = 大锅蒸汽（汤面中心 SVG(360,566) → Cocos(0,74) 上方）。
   * 纯 Graphics 圆点 + tween 循环，零素材成本；只有背景大图加载成功时才加（灰盒底色无小屋/大锅可对应）。
   */
  private addAmbient(key: string, page: Node) {
    if (!this.bgFrames[key]) return;
    if (key === 'field') {
      this.spawnPuffs(page, 248, 228, { rise: 86, drift: 26, cycle: 4.2, count: 3, r: 10, peakOp: 110 });
    } else if (key === 'kitchen') {
      this.spawnPuffs(page, -40, 100, { rise: 70, drift: 12, cycle: 3.2, count: 2, r: 8, peakOp: 70 });
      this.spawnPuffs(page, 44, 96, { rise: 64, drift: -10, cycle: 3.2, count: 2, r: 7, peakOp: 55, phase: 1.6 });
    }
  }

  /** 生成一组循环上升的烟/汽圆点：淡入→上升放大→淡出，同组内相位错开 */
  private spawnPuffs(
    parent: Node,
    x: number,
    y: number,
    cfg: { rise: number; drift: number; cycle: number; count: number; r: number; peakOp: number; phase?: number },
  ) {
    for (let i = 0; i < cfg.count; i++) {
      const n = new Node('puff');
      n.layer = Layers.Enum.UI_2D;
      n.parent = parent;
      n.addComponent(UITransform);
      const g = n.addComponent(Graphics);
      g.fillColor = new Color(0xff, 0xff, 0xff, 90);
      g.circle(0, 0, cfg.r);
      g.fill();
      g.fillColor = new Color(0xff, 0xff, 0xff, 140);
      g.circle(0, 0, cfg.r * 0.55);
      g.fill();
      const op = n.addComponent(UIOpacity);
      op.opacity = 0;
      const init = (cfg.phase ?? 0) + (i * cfg.cycle) / cfg.count;
      const x0 = x;
      const x1 = x + cfg.drift;
      // repeatForever 包住整个序列（含前置 delay），组内相位因此天然错开
      tween(n)
        .repeatForever(
          tween(n)
            .delay(init)
            .call(() => {
              n.setPosition(x0, y);
              n.setScale(0.6, 0.6, 1);
            })
            .to(cfg.cycle, { position: new Vec3(x1, y + cfg.rise, 0), scale: new Vec3(1.5, 1.5, 1) }, { easing: 'sineOut' }),
        )
        .start();
      tween<UIOpacity>(op)
        .repeatForever(
          tween<UIOpacity>()
            .delay(init)
            .to(cfg.cycle * 0.25, { opacity: cfg.peakOp })
            .to(cfg.cycle * 0.75, { opacity: 0 }, { easing: 'sineIn' }),
        )
        .start();
    }
  }

  /** 切换页面：只显隐页容器，游戏逻辑无感知；当前页导航 tab 丰收黄填充（状态变化才重绘 Graphics） */
  private switchPage(key: string) {
    this.currentPage = key;
    if (key !== 'field') this.closeSeedDrawer(); // 抽屉挂在 Canvas 上盖住导航，离开田地页必须收起
    for (const [k, p] of Object.entries(this.pages)) p.active = k === key;
    for (const item of this.navItems) {
      const on = item.key === key;
      if (on === item.on) continue;
      item.on = on;
      item.label.isBold = on;
      item.label.color = on ? new Color(0x6b, 0x44, 0x23) : new Color(0x4a, 0x35, 0x20);
      this.drawNavTab(item.g, item.w, item.h, on);
    }
    this.maybeTalk(key, 'onEnter');
  }

  private refreshPanels() {
    this.refreshSeeds();
    this.refreshKitchen();
    this.refreshShop();
    this.refreshOrders();
    this.refreshCollection();
    // 列表每次刷新重建 Label，快乐体需重挂（美术 v1.1 ④）
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (canvas) this.applyUiFont(canvas);
  }

  private makeTitle(parent: Node, text: string, fontSize = 24): Node {
    const n = new Node('title');
    // 关键：代码创建的 UI 节点默认在 DEFAULT 层，UI 相机不渲染——必须显式设 UI_2D
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform);
    const label = n.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.color = new Color(0x4a, 0x35, 0x20); // 描边棕替代纯黑（美术规范）
    return n;
  }

  /** 按钮皮肤（美术 v1.0）：奶油底 + 描边棕文字 + 按下丰收黄；替换预制体默认灰 */
  private skinButton(n: Node) {
    const sp = n.getComponent(Sprite);
    if (sp) sp.color = new Color(0xff, 0xf8, 0xe7);
    const btn = n.getComponent(Button);
    if (btn) {
      btn.normalColor = new Color(0xff, 0xf8, 0xe7);
      btn.hoverColor = new Color(0xff, 0xfd, 0xf5);
      btn.pressedColor = new Color(0xf2, 0xb8, 0x30);
      btn.disabledColor = new Color(0xe3, 0xd9, 0xc4);
    }
    const label = n.getComponentInChildren(Label);
    if (label) label.color = new Color(0x4a, 0x35, 0x20);
  }

  private makeButton(parent: Node, text: string, onClick: () => void): Node | null {
    if (!this.itemButtonPrefab) return null;
    const n = instantiate(this.itemButtonPrefab);
    n.parent = parent;
    this.skinButton(n);
    const label = n.getComponentInChildren(Label);
    if (label) label.string = text;
    n.on(Button.EventType.CLICK, () => {
      this.playSfx('click', 0.5);
      onClick();
    }, this);
    return n;
  }

  /** 图标槽（空 Sprite，可后补帧）；务必先 CUSTOM 再赋帧，赋帧后再强制尺寸（引擎隐式 resize 兜底） */
  private makeIconSlot(host: Node, size: number): Sprite {
    const hostW = host.getComponent(UITransform)?.width ?? 100;
    const n = new Node('icon');
    n.layer = Layers.Enum.UI_2D;
    n.parent = host;
    n.addComponent(UITransform).setContentSize(size, size);
    n.setPosition(-hostW / 2 + size / 2 + 8, 0);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    return sp;
  }

  /** 在节点左侧挂一个图标 Sprite（缺图时告警并跳过，灰盒可降级） */
  private attachIcon(host: Node, id: string, size: number): Sprite | null {
    const sf = this.iconFrames[id];
    if (!sf) {
      console.warn(`[美术] 缺图标: ${id}`);
      return null;
    }
    const sp = this.makeIconSlot(host, size);
    sp.spriteFrame = sf;
    sp.node.getComponent(UITransform)!.setContentSize(size, size);
    return sp;
  }

  /**
   * 列表项（美术 v1.0 卡片化）：圆角奶油卡 + 描边 + 可选左图标 + 文字。
   * 关键决策：图标一律走「纯节点 + 子节点」模式（图鉴页已验证可靠），
   * 不再挂在按钮预制体内部（该路径图标不可见，原因见沟通记录 2026-07-22）。
   */
  private makeListItem(
    parent: Node,
    opts: {
      w?: number;
      h?: number;
      text: string;
      iconId?: string;
      onClick?: () => void;
      tone?: 'cream' | 'gold' | 'locked';
      fontSize?: number;
      lineHeight?: number;
      /** 右侧角标（如「Lv3 解锁」锁态提示） */
      badge?: string;
    },
  ): Node {
    const w = opts.w ?? 190;
    const h = opts.h ?? 46;
    const tone = opts.tone ?? 'cream';
    const item = new Node('item');
    item.layer = Layers.Enum.UI_2D;
    item.parent = parent;
    item.addComponent(UITransform).setContentSize(w, h);
    const g = item.addComponent(Graphics);
    g.fillColor =
      tone === 'gold'
        ? new Color(0xff, 0xe9, 0xa8)
        : tone === 'locked'
          ? new Color(0xed, 0xe3, 0xcc)
          : new Color(0xff, 0xf8, 0xe7);
    g.strokeColor = tone === 'locked' ? new Color(0xd9, 0xc9, 0xa8) : new Color(0x4a, 0x35, 0x20);
    g.lineWidth = 2;
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.stroke();
    const hasIcon = !!opts.iconId && !!this.iconFrames[opts.iconId];
    if (hasIcon) this.attachIcon(item, opts.iconId!, Math.min(h - 12, 34));
    const ln = new Node('label');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = item;
    ln.addComponent(UITransform).setContentSize(hasIcon ? w - 52 : w - 12, h);
    ln.setPosition(hasIcon ? 18 : 0, 0);
    const ll = ln.addComponent(Label);
    ll.string = opts.text;
    ll.fontSize = opts.fontSize ?? 20;
    ll.color = tone === 'locked' ? new Color(0xa8, 0x91, 0x6b) : new Color(0x4a, 0x35, 0x20);
    ll.overflow = Label.Overflow.CLAMP;
    if (opts.lineHeight) ll.lineHeight = opts.lineHeight;
    if (opts.badge) {
      const bn = new Node('badge');
      bn.layer = Layers.Enum.UI_2D;
      bn.parent = item;
      bn.addComponent(UITransform).setContentSize(96, 20);
      bn.setPosition(w / 2 - 52, 0);
      const bl = bn.addComponent(Label);
      bl.string = opts.badge;
      bl.fontSize = 13;
      bl.color = tone === 'locked' ? new Color(0xa8, 0x91, 0x6b) : new Color(0xc9, 0x8f, 0x1b);
      // 主标签让出角标位置
      ln.getComponent(UITransform)!.setContentSize((hasIcon ? w - 52 : w - 12) - 92, h);
    }
    if (opts.onClick) {
      item.addComponent(Button);
      const cb = opts.onClick;
      item.on(Button.EventType.CLICK, () => {
        this.playSfx('click', 0.5);
        cb();
      }, this);
    }
    return item;
  }

  /**
   * 卡片面板（美术 v1.0）：圆角纸卡（软投影 + 顶部受光边）+ 标题 + 列表项，全手动排版。
   * 返回卡片底部 y，供调用方继续向下摆放其他元素。
   */
  private makeCardPanel(
    parent: Node,
    cx: number,
    topY: number,
    w: number,
    title: string,
    items: {
      text: string;
      iconId?: string;
      tone?: 'cream' | 'gold' | 'locked';
      onClick?: () => void;
      fontSize?: number;
      badge?: string;
    }[],
    emptyText?: string,
  ): number {
    const pad = 14;
    const titleH = 34;
    const itemH = 46;
    const gap = 8;
    const itemW = w - pad * 2;
    const rows = Math.max(items.length, 1);
    const cardH = pad + titleH + rows * itemH + (rows - 1) * gap + pad;
    // 卡底
    const bg = new Node('CardBg');
    bg.layer = Layers.Enum.UI_2D;
    bg.parent = parent;
    const ut = bg.addComponent(UITransform);
    ut.setContentSize(w, cardH);
    ut.setAnchorPoint(0.5, 1);
    bg.setPosition(cx, topY);
    const g = bg.addComponent(Graphics);
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x33); // 软投影（右下错位）
    g.roundRect(-w / 2 + 4, -cardH - 5, w, cardH, 18);
    g.fill();
    g.fillColor = new Color(0xff, 0xfd, 0xf5); // 纸面
    g.roundRect(-w / 2, -cardH, w, cardH, 18);
    g.fill();
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.lineWidth = 2.5;
    g.roundRect(-w / 2, -cardH, w, cardH, 18);
    g.stroke();
    g.strokeColor = new Color(0xff, 0xff, 0xff, 0x90); // 顶部受光边
    g.lineWidth = 2;
    g.moveTo(-w / 2 + 18, -3);
    g.lineTo(w / 2 - 18, -3);
    g.stroke();
    // 纸纹叠层（美术 v1.1：与图标/背景的水彩纸感咬合；圆角外溢出在 30% 透明度下不可见）
    if (this.paperFrame) {
      const tex = new Node('paperTex');
      tex.layer = Layers.Enum.UI_2D;
      tex.parent = bg;
      tex.addComponent(UITransform).setContentSize(w, cardH);
      const tsp = tex.addComponent(Sprite);
      tsp.sizeMode = Sprite.SizeMode.CUSTOM;
      tsp.spriteFrame = this.paperFrame;
      tsp.color = new Color(0xff, 0xff, 0xff, 76); // 30% 不透明度
      tex.setPosition(0, -cardH / 2);
    }
    // 标题与条目
    const t = this.makeTitle(parent, title, 20);
    t.setPosition(cx, topY - pad - titleH / 2 + 2);
    if (items.length === 0 && emptyText) {
      const e = this.makeTitle(parent, emptyText, 18);
      e.setPosition(cx, topY - pad - titleH - itemH / 2);
    }
    items.forEach((it, i) => {
      const item = this.makeListItem(parent, { w: itemW, h: itemH, ...it });
      item.setPosition(cx, topY - pad - titleH - itemH / 2 - i * (itemH + gap));
    });
    return topY - cardH;
  }

  /** 嵌套 Layout（CONTAINER）构建后手动重排：先内层后外层，避免父布局拿过期子容器高度（图鉴重叠根因） */
  private relayout(root: Node) {
    const depth = (n: Node): number => {
      let d = 0;
      let p = n.parent;
      while (p) {
        d++;
        p = p.parent;
      }
      return d;
    };
    const layouts = root.getComponentsInChildren(Layout);
    layouts.sort((a, b) => depth(b.node) - depth(a.node));
    for (const l of layouts) l.updateLayout();
  }

  /**
   * 种子底部抽屉（原型 v3 bottom sheet，对齐 mockup：遮罩 32% 黑、抽屉顶 svg y=848 → cocos -208、
   * 卡片 150×96 两行网格按列横滑、右缘渐隐）。点空地弹出，选种子即种并收起；点遮罩/✕ 收起。
   * 挂在 Canvas 上（盖住底部导航），离开田地页自动收起。
   */
  private buildSeedDrawer() {
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas) return;
    const root = new Node('SeedDrawer');
    root.layer = Layers.Enum.UI_2D;
    root.parent = canvas;
    root.addComponent(UITransform).setContentSize(720, 1280);
    root.active = false;
    this.seedDrawer = root;
    // 全屏遮罩（点击收起）
    const maskN = new Node('veil');
    maskN.layer = Layers.Enum.UI_2D;
    maskN.parent = root;
    maskN.addComponent(UITransform).setContentSize(720, 1280);
    const mg = maskN.addComponent(Graphics);
    mg.fillColor = new Color(0x3a, 0x2a, 0x18, 0x52); // 32% 黑（暖棕调）
    mg.rect(-360, -640, 720, 1280);
    mg.fill();
    maskN.addComponent(BlockInputEvents);
    maskN.on(Node.EventType.TOUCH_END, () => this.closeSeedDrawer(), this);
    // 奶油纸大卡（底部贴边，顶部大圆角；底部圆角在屏外不可见）
    const panel = new Node('panel');
    panel.layer = Layers.Enum.UI_2D;
    panel.parent = root;
    panel.addComponent(UITransform).setContentSize(720, 432);
    panel.setPosition(0, -640 + 432 / 2);
    panel.addComponent(BlockInputEvents); // 挡住卡片间空隙的点击，防误关
    const g = panel.addComponent(Graphics);
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40); // 软投影
    g.roundRect(-360 + 4, -216 - 5, 720, 432, 28);
    g.fill();
    g.fillColor = new Color(0xff, 0xfd, 0xf5);
    g.roundRect(-360, -216, 720, 432, 28);
    g.fill();
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.lineWidth = 2.5;
    g.roundRect(-360, -216, 720, 432, 28);
    g.stroke();
    // 顶部抓手
    g.fillColor = new Color(0xc9, 0xb4, 0x8e);
    g.roundRect(-50, 197, 100, 7, 3.5);
    g.fill();
    // 标题
    const titleN = new Node('title');
    titleN.layer = Layers.Enum.UI_2D;
    titleN.parent = panel;
    titleN.addComponent(UITransform).setContentSize(300, 34);
    titleN.setPosition(0, 164);
    const title = titleN.addComponent(Label);
    title.string = '选择种子';
    title.fontSize = 24;
    title.isBold = true;
    title.color = new Color(0x4a, 0x35, 0x20);
    // 右上 ✕
    const closeN = new Node('close');
    closeN.layer = Layers.Enum.UI_2D;
    closeN.parent = panel;
    closeN.addComponent(UITransform).setContentSize(44, 44);
    closeN.setPosition(316, 164);
    const closeL = closeN.addComponent(Label);
    closeL.string = '×'; // 快乐体字库无 ✕(U+2715)，用 U+00D7
    closeL.fontSize = 24;
    closeL.isBold = true;
    closeL.color = new Color(0xa8, 0x91, 0x6b);
    closeN.addComponent(Button);
    closeN.on(Button.EventType.CLICK, () => {
      this.playSfx('click', 0.5);
      this.closeSeedDrawer();
    }, this);
    // 卡片横滑区（Mask 裁剪 + ScrollView 水平）
    const viewN = new Node('view');
    viewN.layer = Layers.Enum.UI_2D;
    viewN.parent = panel;
    viewN.addComponent(UITransform).setContentSize(720, 216);
    viewN.setPosition(0, 38);
    const mask = viewN.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    const sv = viewN.addComponent(ScrollView);
    sv.horizontal = true;
    sv.vertical = false;
    const content = new Node('content');
    content.layer = Layers.Enum.UI_2D;
    content.parent = viewN;
    const contentUt = content.addComponent(UITransform);
    contentUt.setAnchorPoint(0, 0.5);
    contentUt.setContentSize(720, 216);
    content.setPosition(-360, 0);
    sv.content = content;
    // 右缘渐隐（Graphics 无渐变，阶梯透明近似）+ 「》」提示后面还有（快乐体字库无 ›，用 》）
    const fadeN = new Node('fade');
    fadeN.layer = Layers.Enum.UI_2D;
    fadeN.parent = panel;
    fadeN.addComponent(UITransform).setContentSize(96, 228);
    fadeN.setPosition(312, 38);
    const fg = fadeN.addComponent(Graphics);
    for (let i = 0; i < 4; i++) {
      fg.fillColor = new Color(0xff, 0xfd, 0xf5, 24 + i * 56);
      fg.rect(-48 + i * 24, -114, 24, 228);
      fg.fill();
    }
    const arrowN = new Node('arrow');
    arrowN.layer = Layers.Enum.UI_2D;
    arrowN.parent = panel;
    arrowN.addComponent(UITransform).setContentSize(30, 40);
    arrowN.setPosition(328, 38);
    const arrowL = arrowN.addComponent(Label);
    arrowL.string = '》';
    arrowL.fontSize = 22;
    arrowL.isBold = true;
    arrowL.color = new Color(0xa8, 0x91, 0x6b);
    this.drawerArrow = arrowN;
    // 底部滑动条（轨道 + 拇指，拇指宽度随内容比变化，refreshSeeds 时更新）
    const sbN = new Node('scrollbar');
    sbN.layer = Layers.Enum.UI_2D;
    sbN.parent = panel;
    sbN.addComponent(UITransform).setContentSize(280, 8);
    sbN.setPosition(0, -190);
    this.drawerScrollbar = sbN.addComponent(Graphics);
  }

  /** 打开种子抽屉（记下目标坑位，点选即种） */
  private openSeedDrawer(fieldIndex: number) {
    if (!this.game) return;
    if (!this.seedDrawer) this.buildSeedDrawer();
    const d = this.seedDrawer;
    if (!d) return;
    this.drawerField = fieldIndex;
    d.active = true;
    this.refreshSeeds();
    this.applyUiFont(d); // 抽屉项重建后快乐体重挂（美术 v1.1 ④）
    // 上滑入场（一次性交互反馈，非循环装饰动效）
    const panel = d.getChildByName('panel');
    if (panel) {
      Tween.stopAllByTarget(panel);
      panel.setPosition(0, -640 + 432 / 2 - 80);
      tween(panel).to(0.22, { position: new Vec3(0, -640 + 432 / 2, 0) }, { easing: 'sineOut' }).start();
    }
  }

  private closeSeedDrawer() {
    if (this.seedDrawer) this.seedDrawer.active = false;
    this.drawerField = -1;
  }

  /** 抽屉内容刷新（原左上常驻种子列表已移除；田地升级/农场升级后若抽屉开着则同步重建） */
  private refreshSeeds() {
    const d = this.seedDrawer;
    if (!d || !d.active || !this.game) return;
    const panel = d.getChildByName('panel');
    const content = panel?.getChildByName('view')?.getChildByName('content');
    if (!panel || !content) return;
    content.removeAllChildren();
    const seeds = this.game.listAllSeeds();
    const gold = this.game.gold;
    const cw = 150;
    const ch = 96;
    const gapX = 14;
    const x0 = 34;
    const cols = Math.ceil(seeds.length / 2);
    const contentW = x0 + cols * (cw + gapX) - gapX + x0;
    seeds.forEach((s, i) => {
      const col = Math.floor(i / 2);
      const row = i % 2;
      const x = x0 + col * (cw + gapX) + cw / 2; // content anchor 左中，x 从 0 起
      const y = row === 0 ? 54 : -54;
      const sel = s.crop.id === this.selectedSeed;
      const afford = s.unlocked && gold >= s.crop.seedPrice; // 金币不足 = 禁用态
      const card = new Node('seed');
      card.layer = Layers.Enum.UI_2D;
      card.parent = content;
      card.addComponent(UITransform).setContentSize(cw, ch);
      card.setPosition(x, y);
      const cg = card.addComponent(Graphics);
      cg.fillColor = !s.unlocked
        ? new Color(0xed, 0xe3, 0xcc)
        : !afford
          ? new Color(0xef, 0xe9, 0xdc) // 禁用：灰麦底
          : sel
            ? new Color(0xf5, 0xe8, 0xc8) // 选中：浅麦底 + 金框
            : new Color(0xff, 0xfd, 0xf5);
      cg.roundRect(-cw / 2, -ch / 2, cw, ch, 12);
      cg.fill();
      cg.lineWidth = sel && afford ? 3.5 : 2;
      cg.strokeColor = sel && afford ? new Color(0xf2, 0xb8, 0x30) : s.unlocked && afford ? new Color(0x4a, 0x35, 0x20) : new Color(0xd9, 0xc9, 0xa8);
      cg.roundRect(-cw / 2, -ch / 2, cw, ch, 12);
      cg.stroke();
      // 图标 + 名称（上图标下名字）
      const iconN = new Node('icon');
      iconN.layer = Layers.Enum.UI_2D;
      iconN.parent = card;
      iconN.addComponent(UITransform).setContentSize(54, 54);
      iconN.setPosition(0, 12);
      const isp = iconN.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM;
      const sf = this.iconFrames[s.crop.id];
      if (sf) {
        isp.spriteFrame = sf;
        if (!s.unlocked) {
          isp.grayscale = true;
          isp.color = new Color(0xa8, 0x91, 0x6b);
        } else if (!afford) {
          isp.color = new Color(0xc9, 0xbd, 0xa8); // 禁用：图标褪色（保留彩色轮廓，区别于锁态灰度）
        }
      }
      const nameN = new Node('name');
      nameN.layer = Layers.Enum.UI_2D;
      nameN.parent = card;
      nameN.addComponent(UITransform).setContentSize(cw - 8, 24);
      nameN.setPosition(0, -28);
      const nameL = nameN.addComponent(Label);
      nameL.string = s.crop.name;
      nameL.fontSize = 19;
      nameL.isBold = sel && afford;
      nameL.color = s.unlocked && afford ? new Color(0x4a, 0x35, 0x20) : new Color(0xa8, 0x91, 0x6b);
      nameL.overflow = Label.Overflow.CLAMP;
      // 锁态角标「LvN 解锁」（深棕底 + 浅麦字）
      if (!s.unlocked) {
        const bN = new Node('badge');
        bN.layer = Layers.Enum.UI_2D;
        bN.parent = card;
        bN.addComponent(UITransform).setContentSize(60, 20);
        bN.setPosition(37, 30);
        const bg = bN.addComponent(Graphics);
        bg.fillColor = new Color(0x4a, 0x35, 0x20, 0xbf);
        bg.roundRect(-30, -10, 60, 20, 10);
        bg.fill();
        const bLN = new Node('text');
        bLN.layer = Layers.Enum.UI_2D;
        bLN.parent = bN;
        bLN.addComponent(UITransform).setContentSize(60, 20);
        const bL = bLN.addComponent(Label);
        bL.string = `Lv${s.requiredLevel ?? '?'} 解锁`;
        bL.fontSize = 12;
        bL.color = new Color(0xff, 0xe9, 0xa8);
      }
      // 金币不足角标：小金币 + 价格（深棕底 + 丰收黄币 + 浅麦字，一眼看出"差钱"）
      if (s.unlocked && !afford) {
        const pN = new Node('price');
        pN.layer = Layers.Enum.UI_2D;
        pN.parent = card;
        pN.addComponent(UITransform).setContentSize(64, 20);
        pN.setPosition(37, 30);
        const pg = pN.addComponent(Graphics);
        pg.fillColor = new Color(0x4a, 0x35, 0x20, 0xbf);
        pg.roundRect(-32, -10, 64, 20, 10);
        pg.fill();
        pg.fillColor = new Color(0xf2, 0xb8, 0x30);
        pg.circle(-22, 0, 6);
        pg.fill();
        pg.strokeColor = new Color(0x8a, 0x5f, 0x10);
        pg.lineWidth = 1.5;
        pg.circle(-22, 0, 6);
        pg.stroke();
        const pLN = new Node('text');
        pLN.layer = Layers.Enum.UI_2D;
        pLN.parent = pN;
        pLN.addComponent(UITransform).setContentSize(48, 20);
        pLN.setPosition(8, 0);
        const pL = pLN.addComponent(Label);
        pL.string = `${s.crop.seedPrice} 金`;
        pL.fontSize = 12;
        pL.color = new Color(0xff, 0xe9, 0xa8);
      }
      card.addComponent(Button);
      card.on(Button.EventType.CLICK, () => {
        if (!s.unlocked) {
          this.say(`农场 Lv${s.requiredLevel ?? '?'} 解锁`, 'field');
          return;
        }
        if (!afford) {
          this.say(`金币不足，种${s.crop.name}还差 ${s.crop.seedPrice - gold} 金`, 'field');
          return;
        }
        this.selectedSeed = s.crop.id;
        const fi = this.drawerField;
        this.closeSeedDrawer();
        if (fi >= 0) {
          this.run(() => {
            this.game!.plant(fi, s.crop.id);
            this.playSfx('plant');
            this.say(`地块 ${fi + 1} 种下了${s.crop.name}`, 'field');
          });
        }
      }, this);
    });
    content.getComponent(UITransform)!.setContentSize(Math.max(contentW, 720), 216);
    // 右缘渐隐/箭头只在内容超出视口时显示
    if (this.drawerArrow) this.drawerArrow.active = contentW > 720;
    const fade = panel.getChildByName('fade');
    if (fade) fade.active = contentW > 720;
    // 滑动条拇指
    if (this.drawerScrollbar) {
      const g = this.drawerScrollbar;
      g.clear();
      g.fillColor = new Color(0xc9, 0xb4, 0x8e, 0x99);
      g.roundRect(-140, -4, 280, 8, 4);
      g.fill();
      g.fillColor = new Color(0x8b, 0x5a, 0x2b);
      g.roundRect(-140, -4, Math.max(40, 280 * Math.min(1, 720 / contentW)), 8, 4);
      g.fill();
    }
  }

  /** 收获篮（原型 v3 左下）：篮身 + 作物图标按 1 / 2~4 / 5+ 三档堆叠（不标数字），纯展示无交互 */
  private makeBasket(parent: Node, x: number, y: number, cropId: string, count: number) {
    const n = new Node('basket');
    n.layer = Layers.Enum.UI_2D;
    n.parent = parent;
    n.addComponent(UITransform).setContentSize(96, 72);
    n.setPosition(x, y);
    const g = n.addComponent(Graphics);
    // 落地投影
    g.fillColor = new Color(0x2f, 0x5d, 0x1f, 0x4d);
    g.ellipse(4, -14, 52, 10);
    g.fill();
    // 篮身（原木，mockup 梯形撇口篮）
    g.fillColor = new Color(0x8b, 0x5a, 0x2b);
    g.moveTo(-42, 6);
    g.quadraticCurveTo(-46, -26, 0, -28);
    g.quadraticCurveTo(46, -26, 42, 6);
    g.quadraticCurveTo(20, -4, 0, -4);
    g.quadraticCurveTo(-20, -4, -42, 6);
    g.close();
    g.fill();
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.lineWidth = 2.2;
    g.stroke();
    // 编织纹
    g.strokeColor = new Color(0x6b, 0x44, 0x23, 0xb3);
    g.lineWidth = 1.8;
    g.moveTo(-38, -4);
    g.quadraticCurveTo(0, -16, 38, -4);
    g.moveTo(-30, -14);
    g.quadraticCurveTo(0, -22, 30, -14);
    g.stroke();
    // 提手
    g.strokeColor = new Color(0x8b, 0x5a, 0x2b);
    g.lineWidth = 4;
    g.moveTo(-26, 6);
    g.quadraticCurveTo(0, 34, 26, 6);
    g.stroke();
    // 作物堆叠三档：少(1) 孤零零一个 / 中(2~4) 两个并排 / 多(5+) 冒尖一堆
    const pile: [number, number, number][] =
      count >= 5
        ? [
            [-13, 3, 0.7],
            [3, 11, 0.85],
            [15, 3, 0.65],
          ]
        : count >= 2
          ? [
              [-10, 6, 0.8],
              [10, 8, 0.8],
            ]
          : [[0, 8, 0.95]];
    const sf = this.iconFrames[cropId];
    if (!sf) return;
    for (const [px, py, ps] of pile) {
      const icon = new Node('crop');
      icon.layer = Layers.Enum.UI_2D;
      icon.parent = n;
      const ut = icon.addComponent(UITransform);
      ut.setContentSize(48 * ps, 48 * ps);
      icon.setPosition(px, py);
      const sp = icon.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      sp.spriteFrame = sf;
      ut.setContentSize(48 * ps, 48 * ps);
    }
  }

  /** 收获篮区刷新：库存作物按数量取前 4 种；key 缓存（id:档位），只在变化时重建 */
  private refreshBaskets() {
    if (!this.basketRoot || !this.game) return;
    const inv = this.game.getSave().inventory.crops;
    const top = Object.entries(inv)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const key = top.map(([id, n]) => `${id}:${n >= 5 ? 2 : n >= 2 ? 1 : 0}`).join('|');
    if (key === this.basketKey) return;
    this.basketKey = key;
    this.basketRoot.removeAllChildren();
    top.forEach(([id, n], i) => this.makeBasket(this.basketRoot!, -264 + i * 112, -432, id, n)); // mockup: x=96+i*112, y=1072
  }

  /** 图鉴分类页签定义（顺序即按钮顺序；扩展新分类在此加一项即可） */
  private static readonly BOOK_TABS: { key: string; name: string }[] = [
    { key: 'crop', name: '作物' },
    { key: 'recipe', name: '食谱' },
  ];

  /** 取某分类的图鉴条目（与 BOOK_TABS 的 key 一一对应） */
  private getBookItems(key: string): { id: string; name: string; tier: number; discovered: boolean; desc?: string; ingCount?: number }[] {
    if (key === 'recipe') return this.game!.recipeBook();
    return this.game!.cropBook();
  }

  /** 图鉴卡片（上图下文，手账贴页感）：未解锁也占位，图标褪色低透明锁定、名字「？？？」；
   *  已解锁卡顶部贴和纸胶带（粉/黄/绿按索引轮换）+ 每卡 1~2° 确定性伪随机微倾斜（按索引 hash，不每帧跳） */
  private makeBookCard(parent: Node, item: { id: string; name: string; tier: number; discovered: boolean; desc?: string; ingCount?: number }, index: number): Node {
    const w = 150, h = 170;
    const card = new Node('bookcard');
    card.layer = Layers.Enum.UI_2D;
    card.parent = parent;
    card.addComponent(UITransform).setContentSize(w, h);
    // 确定性伪随机倾斜：±1~2°（mockup: i%2 ? 1.2 : -1.2 的手账贴页感）
    const hash = (index * 37 + 11) % 100;
    card.angle = (hash % 2 === 0 ? -1 : 1) * (1 + hash / 100);
    const g = card.addComponent(Graphics);
    g.fillColor = item.discovered ? new Color(0xff, 0xfd, 0xf5) : new Color(0xed, 0xe3, 0xcc);
    g.strokeColor = item.discovered ? new Color(0x4a, 0x35, 0x20) : new Color(0xd9, 0xc9, 0xa8);
    g.lineWidth = 2;
    g.roundRect(-w / 2, -h / 2, w, h, 11);
    g.fill();
    g.roundRect(-w / 2, -h / 2, w, h, 11);
    g.stroke();
    // 图标内衬面板（134×100，mockup 双层卡纸感）
    g.fillColor = item.discovered ? new Color(0xff, 0xf8, 0xe7) : new Color(0xe3, 0xd9, 0xc4);
    g.strokeColor = item.discovered ? new Color(0xe3, 0xd9, 0xc4) : new Color(0xd9, 0xc9, 0xa8);
    g.lineWidth = 1.5;
    g.roundRect(-67, -23, 134, 100, 7);
    g.fill();
    g.roundRect(-67, -23, 134, 100, 7);
    g.stroke();
    // 已解锁：一角贴和纸胶带（84×26，半透明 0.55，微倾斜随手贴感；粉/黄/绿按索引轮换）
    if (item.discovered) {
      const TAPE_COLORS = [new Color(0xf4, 0xa7, 0xb9), new Color(0xf5, 0xd4, 0x7e), new Color(0xb5, 0xdc, 0xa0)];
      const tape = new Node('tape');
      tape.layer = Layers.Enum.UI_2D;
      tape.parent = card;
      tape.addComponent(UITransform).setContentSize(84, 26);
      tape.setPosition(0, h / 2 - 3); // 压住卡片顶边
      tape.angle = hash % 2 === 0 ? 5 : -6; // 与卡身倾斜反向，像随手一贴
      const tg = tape.addComponent(Graphics);
      const tc = TAPE_COLORS[index % TAPE_COLORS.length].clone();
      tc.a = 140; // 半透明（mockup opacity 0.55）
      tg.fillColor = tc;
      tg.roundRect(-42, -13, 84, 26, 3);
      tg.fill();
    }
    // 图标（未解锁也显示，褪色低透明剪影 = 锁定态；mockup 锁定卡 icon opacity 0.3）
    const iconSize = 64; // 内衬面板 134×100 内留白展示，不再撑满
    const iconNode = new Node('icon');
    iconNode.layer = Layers.Enum.UI_2D;
    iconNode.parent = card;
    iconNode.addComponent(UITransform).setContentSize(iconSize, iconSize);
    iconNode.setPosition(0, 27);
    const sp = iconNode.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    const sf = this.iconFrames[item.id];
    if (sf) {
      sp.spriteFrame = sf;
      if (!item.discovered) {
        sp.grayscale = true; // 灰度剪影：只见轮廓不见真容
        sp.color = new Color(0xa8, 0x91, 0x6b, 110); // 低透明褪色，融进旧纸
      }
    } else {
      console.warn(`[美术] 缺图标: ${item.id}`);
    }
    // 名字（未解锁显示？？？；tier 是后台数据不展示）
    const ln = new Node('name');
    ln.layer = Layers.Enum.UI_2D;
    ln.parent = card;
    ln.addComponent(UITransform).setContentSize(w - 10, 30);
    ln.setPosition(0, -58); // mockup: 卡底上 27px
    const ll = ln.addComponent(Label);
    ll.string = item.discovered ? item.name : '？？？';
    ll.fontSize = 19;
    ll.color = item.discovered ? new Color(0x4a, 0x35, 0x20) : new Color(0xa8, 0x91, 0x6b);
    ll.overflow = Label.Overflow.CLAMP;
    // 点击查看详情（复用发现庆祝层的弹卡效果；未点亮卡提示去厨房探索）
    card.addComponent(Button);
    card.on(Button.EventType.CLICK, () => {
      if (!item.discovered) {
        this.say('还没有点亮，去厨房试试新组合吧', 'book');
        return;
      }
      this.playSfx('click', 0.5);
      const isRecipe = (item.ingCount ?? 0) > 0;
      const rare = isRecipe ? (item.ingCount ?? 0) >= 3 : item.tier >= 4; // 三食材菜 / T4 作物 = 稀有规格
      this.playDiscovery(item.id, item.name, {
        rare,
        desc: item.desc,
        header: isRecipe ? '食谱图鉴' : rare ? '稀有作物！' : '作物图鉴',
      });
    });
    return card;
  }

  /**
   * 图鉴页：标题 + 分类切换（作物/食谱，可扩展）+ ScrollView 滚动网格（一行 4 张卡片）。
   * 未解锁条目同样占位一张卡片（灰度锁定图 + ？？？名），不再用整排问号占位。
   */
  private refreshCollection() {
    const c = this.collectionContainer;
    if (!c || !this.game) return;
    c.removeAllChildren();
    const found = (arr: { discovered: boolean }[]) => arr.filter((r) => r.discovered).length;

    let cursor = 0; // 相对容器顶部的向下偏移
    // 标题（mockup: 原木棕粗体「外婆的手抄本」；收集进度写进分页胶囊，不在标题重复）
    const title = this.makeTitle(c, '外婆的手抄本', 26);
    const titleLabel = title.getComponent(Label);
    if (titleLabel) {
      titleLabel.isBold = true;
      titleLabel.color = new Color(0x8b, 0x5a, 0x2b); // 原木（色板 §2.2）
    }
    title.getComponent(UITransform)?.setContentSize(660, 34);
    title.setPosition(0, -17);
    cursor += 40;

    // 分类切换胶囊（可爱手绘风：圆胶囊 + 小图标 + 顶部受光 + 按下回弹；当前页签丰收黄）
    const tabW = 176, tabH = 54, tabGap = 24;
    const tabs = GameController.BOOK_TABS;
    tabs.forEach((t, i) => {
      const items = this.getBookItems(t.key);
      const on = this.bookTab === t.key;
      const n = new Node('bookTab');
      n.layer = Layers.Enum.UI_2D;
      n.parent = c;
      n.addComponent(UITransform).setContentSize(tabW, tabH);
      const x = (i - (tabs.length - 1) / 2) * (tabW + tabGap);
      n.setPosition(x, -(cursor + tabH / 2));
      const g = n.addComponent(Graphics);
      this.drawNavTab(g, tabW, tabH, on);
      // 小图标：作物=双瓣芽，食谱=小勺（丰收黄描边改深棕，随选中态微移）
      const ig = new Node('icon');
      ig.layer = Layers.Enum.UI_2D;
      ig.parent = n;
      ig.addComponent(UITransform).setContentSize(30, 30);
      ig.setPosition(-tabW / 2 + 30, 0);
      const igg = ig.addComponent(Graphics);
      const iconColor = on ? new Color(0x4a, 0x35, 0x20) : new Color(0x8b, 0x5a, 0x2b);
      if (t.key === 'crop') {
        igg.strokeColor = iconColor;
        igg.lineWidth = 2.2;
        igg.moveTo(0, -8);
        igg.lineTo(0, 10); // 茎
        igg.stroke();
        igg.fillColor = on ? new Color(0x7e, 0xc8, 0x50) : new Color(0xa8, 0xd8, 0x78);
        igg.ellipse(-6, -3, 6, 4); // 左瓣
        igg.fill();
        igg.ellipse(6, -3, 6, 4); // 右瓣
        igg.fill();
        igg.strokeColor = iconColor;
        igg.lineWidth = 1.8;
        igg.ellipse(-6, -3, 6, 4);
        igg.stroke();
        igg.ellipse(6, -3, 6, 4);
        igg.stroke();
      } else {
        igg.fillColor = on ? new Color(0xff, 0xfd, 0xf5) : new Color(0xf5, 0xe8, 0xc8);
        igg.ellipse(-3, -2, 7, 8); // 勺头
        igg.fill();
        igg.strokeColor = iconColor;
        igg.lineWidth = 2;
        igg.ellipse(-3, -2, 7, 8);
        igg.stroke();
        igg.lineWidth = 3.5;
        igg.moveTo(2, 4);
        igg.lineTo(9, 12); // 勺柄
        igg.stroke();
      }
      // 文案
      const ln = new Node('label');
      ln.layer = Layers.Enum.UI_2D;
      ln.parent = n;
      ln.addComponent(UITransform).setContentSize(tabW - 44, tabH);
      ln.setPosition(14, 0);
      const ll = ln.addComponent(Label);
      ll.string = `${t.name} ${found(items)}/${items.length}`;
      ll.fontSize = 19;
      ll.isBold = on;
      ll.color = new Color(0x4a, 0x35, 0x20);
      // 交互：按下回弹（SCALE），切换时重绘选中态
      const btn = n.addComponent(Button);
      btn.transition = Button.Transition.SCALE;
      btn.zoomScale = 0.93;
      btn.duration = 0.08;
      n.on(Button.EventType.CLICK, () => {
        if (this.bookTab === t.key) return;
        this.playSfx('click', 0.5);
        this.bookTab = t.key;
        this.refreshCollection();
      }, this);
    });
    cursor += tabH + 14;

    // 滚动区：view（Mask 裁剪）+ content（网格内容，anchor 顶中）
    const viewW = 680, viewH = 880;
    const viewNode = new Node('BookView');
    viewNode.layer = Layers.Enum.UI_2D;
    viewNode.parent = c;
    viewNode.addComponent(UITransform).setContentSize(viewW, viewH);
    viewNode.setPosition(0, -(cursor + viewH / 2));
    const mask = viewNode.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    const sv = viewNode.addComponent(ScrollView);
    sv.horizontal = false;
    sv.vertical = true;

    const content = new Node('content');
    content.layer = Layers.Enum.UI_2D;
    content.parent = viewNode;
    const contentUt = content.addComponent(UITransform);
    contentUt.setAnchorPoint(0.5, 1);
    sv.content = content;

    // 网格：一行 4 张卡片（顶部留白 topPad，让首行卡片的和纸胶带完整露出不被 Mask 裁掉）
    const items = this.getBookItems(this.bookTab);
    const cw = 150, ch = 170, gx = 16, gy = 28, cols = 4, topPad = 16;
    items.forEach((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const card = this.makeBookCard(content, r, i);
      card.setPosition((col - (cols - 1) / 2) * (cw + gx), -(topPad + row * (ch + gy) + ch / 2));
    });
    const rows = Math.max(1, Math.ceil(items.length / cols));
    const contentH = topPad + rows * (ch + gy);
    contentUt.setContentSize(viewW, Math.max(contentH, viewH));
    content.setPosition(0, viewH / 2); // 内容顶对齐视口顶（初始滚动位置）
  }

  private comboTotal(): number {
    return Object.values(this.combo).reduce((a, b) => a + b, 0);
  }

  /**
   * 厨房页（原型 v3，对齐 docs/mockups/kitchen.png；SVG y 向下 → cocosY = 640 - svgY）：
   * 组合槽横排在背景大锅正上方（svg y330，槽 132×108，已放=浅金卡/空槽=虚线虚位，每份食材占一格）；
   * 槽下倒入虚线点缀；烹饪进度条 + 「菜名 · 剩余 n 秒」（svg y470/506）；
   * 单状态按钮（328×62，svg y756 → cocos -147）；食材区底部通栏面板（两行网格横滑，常驻非弹层）。
   * 大锅/汤/蒸汽已烘进 bg/kitchen.jpg，UI 层只画交互件。
   */
  private refreshKitchen() {
    const c = this.kitchenContainer;
    if (!c || !this.game) return;
    c.removeAllChildren();
    const save = this.game.getSave();
    const cooking = save.cooking;
    const remain = cooking ? Math.max(0, Math.ceil((cooking.readyAt - Date.now()) / 1000)) : 0;
    const ready = !!cooking && remain <= 0;

    // ---------- 组合槽（横排，数量跟随 core.maxComboSlots；每份食材占一格，同类多份占多格） ----------
    const units: string[] = []; // 按份数摊开：{草莓:2} → ['草莓','草莓']
    for (const id of Object.keys(this.combo)) {
      for (let k = 0; k < this.combo[id]; k++) units.push(id);
    }
    const maxSlots = this.game.maxComboSlots;
    const titleN = new Node('slotTitle');
    titleN.layer = Layers.Enum.UI_2D;
    titleN.parent = c;
    titleN.addComponent(UITransform).setContentSize(300, 26);
    titleN.setPosition(0, 342); // 槽顶 310，抬高留出呼吸位（原 326 贴框）
    const titleL = titleN.addComponent(Label);
    titleL.string = `组合槽 ${units.length}/${maxSlots}`;
    titleL.fontSize = 18;
    titleL.isBold = true;
    titleL.color = new Color(0xff, 0xe9, 0xa8);

    const sw = 132;
    const sh = 108;
    const sGap = 24;
    const sx0 = -((maxSlots * sw + (maxSlots - 1) * sGap) / 2) + sw / 2;
    const slotY = 256; // svg 330+54
    for (let i = 0; i < maxSlots; i++) {
      const id = units[i];
      const slot = new Node(`slot${i}`);
      slot.layer = Layers.Enum.UI_2D;
      slot.parent = c;
      slot.addComponent(UITransform).setContentSize(sw, sh);
      slot.setPosition(sx0 + i * (sw + sGap), slotY);
      const g = slot.addComponent(Graphics);
      if (id) {
        // 已放：浅金卡（itemCard selected 态）
        g.fillColor = new Color(0x4a, 0x35, 0x20, 0x33); // 软投影
        g.roundRect(-sw / 2 + 3, -sh / 2 - 4, sw, sh, 14);
        g.fill();
        g.fillColor = new Color(0xff, 0xe9, 0xa8);
        g.roundRect(-sw / 2, -sh / 2, sw, sh, 14);
        g.fill();
        g.lineWidth = 2.2;
        g.strokeColor = new Color(0xc9, 0x8f, 0x1b);
        g.roundRect(-sw / 2, -sh / 2, sw, sh, 14);
        g.stroke();
        g.fillColor = new Color(0xff, 0xff, 0xff, 0x4d); // 顶部受光
        g.roundRect(-sw / 2 + 5, sh / 2 - sh * 0.34 - 4, sw - 10, sh * 0.34, 10);
        g.fill();
        const sf = this.iconFrames[id];
        if (sf) {
          const iconN = new Node('icon');
          iconN.layer = Layers.Enum.UI_2D;
          iconN.parent = slot;
          iconN.addComponent(UITransform).setContentSize(48, 48);
          iconN.setPosition(0, 14);
          const isp = iconN.addComponent(Sprite);
          isp.sizeMode = Sprite.SizeMode.CUSTOM;
          isp.spriteFrame = sf;
          iconN.getComponent(UITransform)!.setContentSize(48, 48);
        }
        const nameN = new Node('name');
        nameN.layer = Layers.Enum.UI_2D;
        nameN.parent = slot;
        nameN.addComponent(UITransform).setContentSize(sw - 8, 26);
        nameN.setPosition(0, -32);
        const nameL = nameN.addComponent(Label);
        nameL.string = this.game.cropName(id);
        nameL.fontSize = 19;
        nameL.isBold = true;
        nameL.color = new Color(0x4a, 0x35, 0x20);
        nameL.overflow = Label.Overflow.CLAMP;
        slot.addComponent(Button);
        slot.on(Button.EventType.CLICK, () => {
          this.removeFromCombo(id); // 音效在 removeFromCombo 内（remove_ingredient）
        }, this);
      } else {
        // 空槽：半透明米白 + 虚线描边（Graphics 无 dash，短线段手拼）
        g.fillColor = new Color(0xff, 0xfd, 0xf5, 0x33);
        g.roundRect(-sw / 2, -sh / 2, sw, sh, 14);
        g.fill();
        this.strokeDashedRoundRect(g, -sw / 2, -sh / 2, sw, sh, 14, new Color(0xc9, 0xb8, 0x91, 0xb3));
        const eN = new Node('empty');
        eN.layer = Layers.Enum.UI_2D;
        eN.parent = slot;
        eN.addComponent(UITransform).setContentSize(sw - 8, 26);
        const eL = eN.addComponent(Label);
        eL.string = '空槽位';
        eL.fontSize = 19;
        eL.color = new Color(0xc9, 0xb8, 0x91);
      }
      // 槽 → 锅 倒入虚线点缀（svg y444~466 → cocos 196~174）
      const dN = new Node('dash');
      dN.layer = Layers.Enum.UI_2D;
      dN.parent = c;
      dN.addComponent(UITransform).setContentSize(4, 24);
      dN.setPosition(sx0 + i * (sw + sGap), 185);
      const dg = dN.addComponent(Graphics);
      dg.strokeColor = new Color(0xff, 0xe9, 0xa8, 0x80);
      dg.lineWidth = 2.5;
      for (let yy = 11; yy > -12; yy -= 8) {
        dg.moveTo(0, yy);
        dg.lineTo(0, yy - 3);
      }
      dg.stroke();
    }

    // ---------- 大锅动态层（木勺 + 烹饪中搅拌/汤旋/冒泡动效） ----------
    this.buildPotFx(c, !!cooking && !ready);

    // ---------- 烹饪进度（svg 条 y470 260×200×12 → cocos y164；文案 y506 → cocos 134） ----------
    const progN = new Node('cookProg');
    progN.layer = Layers.Enum.UI_2D;
    progN.parent = c;
    progN.addComponent(UITransform).setContentSize(200, 12);
    progN.setPosition(0, 164);
    progN.active = !!cooking;
    const barG = progN.addComponent(Graphics);
    const progLabelN = new Node('progLabel');
    progLabelN.layer = Layers.Enum.UI_2D;
    progLabelN.parent = c;
    progLabelN.addComponent(UITransform).setContentSize(360, 24);
    progLabelN.setPosition(0, 134);
    progLabelN.active = !!cooking;
    const progLabel = progLabelN.addComponent(Label);
    progLabel.fontSize = 17;
    progLabel.isBold = true;
    progLabel.color = new Color(0xff, 0xe9, 0xa8);
    if (cooking) {
      if (this.cookTotalMs <= 0) this.cookTotalMs = Math.max(1, cooking.readyAt - Date.now()); // 载入存档中途接管：从剩余时长起估
      // 未发现的食谱不剧透菜名（发现出锅时才揭晓），已知食谱照常显示
      const dishLabel = save.discoveredRecipes.includes(cooking.dishId) ? this.game.dishName(cooking.dishId) : '？？？';
      progLabel.string = ready
        ? `${dishLabel} · 可以出锅了！`
        : `${dishLabel} · 剩余 ${remain} 秒`;
      this.drawCookBar(barG, ready ? 1 : 1 - remain / Math.max(1, Math.ceil(this.cookTotalMs / 1000)));
    } else {
      this.cookTotalMs = 0;
    }

    // ---------- 单状态按钮（328×62，svg y756 → cocos -147）：开始烹饪 / 烹饪中置灰 / 出锅！ ----------
    let btnText = '开始烹饪';
    let enabled = this.comboTotal() > 0;
    if (cooking) {
      btnText = ready ? '出锅！' : `烹饪中 · 剩余 ${remain} 秒`;
      enabled = ready;
    }
    const btnN = new Node('cookBtn');
    btnN.layer = Layers.Enum.UI_2D;
    btnN.parent = c;
    btnN.addComponent(UITransform).setContentSize(328, 62);
    btnN.setPosition(0, -147);
    const btnG = btnN.addComponent(Graphics);
    this.drawCookPill(btnG, 328, 62, enabled);
    const btnLabelN = new Node('label');
    btnLabelN.layer = Layers.Enum.UI_2D;
    btnLabelN.parent = btnN;
    btnLabelN.addComponent(UITransform).setContentSize(328, 62);
    const btnLabel = btnLabelN.addComponent(Label);
    btnLabel.string = btnText;
    btnLabel.fontSize = 26;
    btnLabel.isBold = true;
    btnLabel.color = enabled ? new Color(0x4a, 0x35, 0x20) : new Color(0xa8, 0x91, 0x6b);
    btnN.addComponent(Button).transition = Button.Transition.NONE;
    btnN.on(Button.EventType.CLICK, () => {
      if (!this.game) return;
      const ck = this.game.getSave().cooking;
      if (ck) {
        if (Date.now() >= ck.readyAt) {
          this.playSfx('click', 0.5);
          this.onCollectDish();
        } // 烹饪中置灰：点击不响应（文案已提示剩余秒数）
      } else if (this.comboTotal() > 0) {
        this.playSfx('click', 0.5);
        this.doCook();
      } else {
        this.playSfx('click', 0.5);
        this.say('先点击下方食材放入组合槽', 'kitchen');
      }
    }, this);

    // ---------- 食材区底部通栏（svg x16 y876 688×272 → cocos 中心 y-372；两行网格横滑） ----------
    const PW = 688;
    const PH = 272;
    const panelN = new Node('ingPanel');
    panelN.layer = Layers.Enum.UI_2D;
    panelN.parent = c;
    panelN.addComponent(UITransform).setContentSize(PW, PH);
    panelN.setPosition(0, -372);
    const pg = panelN.addComponent(Graphics);
    pg.fillColor = new Color(0x4a, 0x35, 0x20, 0x40); // 软投影
    pg.roundRect(-PW / 2 + 4, -PH / 2 - 5, PW, PH, 20);
    pg.fill();
    pg.fillColor = new Color(0xff, 0xfd, 0xf5); // 奶油纸
    pg.roundRect(-PW / 2, -PH / 2, PW, PH, 20);
    pg.fill();
    pg.lineWidth = 2.5;
    pg.strokeColor = new Color(0x4a, 0x35, 0x20);
    pg.roundRect(-PW / 2, -PH / 2, PW, PH, 20);
    pg.stroke();
    pg.strokeColor = new Color(0xff, 0xff, 0xff, 0xb3); // 顶部受光边
    pg.lineWidth = 2;
    pg.moveTo(-PW / 2 + 18, PH / 2 - 3);
    pg.lineTo(PW / 2 - 18, PH / 2 - 3);
    pg.stroke();
    // 标题 + 两侧分隔线（上移腾出网格顶部间距）
    const ptN = new Node('title');
    ptN.layer = Layers.Enum.UI_2D;
    ptN.parent = panelN;
    ptN.addComponent(UITransform).setContentSize(300, 30);
    ptN.setPosition(0, 96);
    const ptL = ptN.addComponent(Label);
    ptL.string = '食材（点击放入）';
    ptL.fontSize = 23;
    ptL.isBold = true;
    ptL.color = new Color(0x8b, 0x5a, 0x2b);
    pg.strokeColor = new Color(0xc9, 0xb8, 0x91);
    pg.lineWidth = 2;
    pg.moveTo(-PW / 2 + 26, 104);
    pg.lineTo(-88, 104);
    pg.moveTo(88, 104);
    pg.lineTo(PW / 2 - 26, 104);
    pg.stroke();
    // 横滑网格（Mask + ScrollView 水平，与种子抽屉同款；常驻面板无遮罩/抓手/✕）
    // 视口宽 = 左边距 + 4 列卡片 + 列间距 + 右边距 → 每页恰好 8 种食材（4 列 × 2 行），左边距=卡片间距
    const cw = 150;
    const ch = 74;
    const gapX = 12;
    const x0 = gapX; // 左侧间距与卡片间距一致
    const VIEW_W = x0 + 4 * cw + 3 * gapX + x0;
    const viewN = new Node('view');
    viewN.layer = Layers.Enum.UI_2D;
    viewN.parent = panelN;
    viewN.addComponent(UITransform).setContentSize(VIEW_W, 166);
    viewN.setPosition(0, -14);
    const mask = viewN.addComponent(Mask);
    mask.type = Mask.Type.GRAPHICS_RECT;
    const sv = viewN.addComponent(ScrollView);
    sv.horizontal = true;
    sv.vertical = false;
    const content = new Node('content');
    content.layer = Layers.Enum.UI_2D;
    content.parent = viewN;
    const contentUt = content.addComponent(UITransform);
    contentUt.setAnchorPoint(0, 0.5);
    content.setPosition(-VIEW_W / 2, 0);
    sv.content = content;
    const stock = Object.entries(save.inventory.crops)
      .map(([id, n]) => ({ id, available: n - (this.combo[id] ?? 0) }))
      .filter((e) => e.available > 0);
    const cols = Math.ceil(stock.length / 2);
    const contentW = x0 + cols * (cw + gapX) - gapX + x0;
    stock.forEach(({ id, available }, i) => {
      const col = Math.floor(i / 2);
      const row = i % 2;
      const card = new Node('ing');
      card.layer = Layers.Enum.UI_2D;
      card.parent = content;
      card.addComponent(UITransform).setContentSize(cw, ch);
      card.setPosition(x0 + col * (cw + gapX) + cw / 2, row === 0 ? 41 : -41);
      const cg = card.addComponent(Graphics);
      cg.fillColor = new Color(0x4a, 0x35, 0x20, 0x26); // 软投影
      cg.roundRect(-cw / 2 + 2, -ch / 2 - 3, cw, ch, 14);
      cg.fill();
      cg.fillColor = new Color(0xff, 0xfd, 0xf5);
      cg.roundRect(-cw / 2, -ch / 2, cw, ch, 14);
      cg.fill();
      cg.lineWidth = 2.2;
      cg.strokeColor = new Color(0x4a, 0x35, 0x20);
      cg.roundRect(-cw / 2, -ch / 2, cw, ch, 14);
      cg.stroke();
      cg.fillColor = new Color(0xff, 0xff, 0xff, 0x8c); // 顶部受光
      cg.roundRect(-cw / 2 + 5, ch / 2 - ch * 0.34 - 4, cw - 10, ch * 0.34, 10);
      cg.fill();
      const sf = this.iconFrames[id];
      if (sf) {
        const iconN = new Node('icon');
        iconN.layer = Layers.Enum.UI_2D;
        iconN.parent = card;
        iconN.addComponent(UITransform).setContentSize(42, 42);
        iconN.setPosition(-cw / 2 + 30, 0);
        const isp = iconN.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM;
        isp.spriteFrame = sf;
        iconN.getComponent(UITransform)!.setContentSize(42, 42);
      }
      const nameN = new Node('name');
      nameN.layer = Layers.Enum.UI_2D;
      nameN.parent = card;
      nameN.addComponent(UITransform).setContentSize(cw - 60, 28);
      nameN.setPosition(-cw / 2 + 56 + (cw - 60) / 2, 0);
      const nameL = nameN.addComponent(Label);
      nameL.string = `${this.game!.cropName(id)} ×${available}`;
      nameL.fontSize = 18;
      nameL.color = new Color(0x4a, 0x35, 0x20);
      nameL.horizontalAlign = Label.HorizontalAlign.LEFT;
      nameL.overflow = Label.Overflow.CLAMP;
      card.addComponent(Button);
      card.on(Button.EventType.CLICK, () => {
        this.playSfx('click', 0.5);
        this.addToCombo(id);
      }, this);
    });
    if (stock.length === 0) {
      const eN = new Node('empty');
      eN.layer = Layers.Enum.UI_2D;
      eN.parent = content;
      eN.addComponent(UITransform).setContentSize(400, 30);
      eN.setPosition(PW / 2, 0);
      const eL = eN.addComponent(Label);
      eL.string = '（暂无食材，先去种菜）';
      eL.fontSize = 18;
      eL.color = new Color(0xa8, 0x91, 0x6b);
    }
    contentUt.setContentSize(Math.max(contentW, VIEW_W), 166);
    // 右缘渐隐（内容超出视口时提示可横滑；阶梯透明近似渐变，贴视口右缘）
    if (contentW > VIEW_W) {
      const fadeN = new Node('fade');
      fadeN.layer = Layers.Enum.UI_2D;
      fadeN.parent = panelN;
      fadeN.addComponent(UITransform).setContentSize(96, 166);
      fadeN.setPosition(VIEW_W / 2 - 48, -14);
      const fg = fadeN.addComponent(Graphics);
      for (let i = 0; i < 4; i++) {
        fg.fillColor = new Color(0xff, 0xfd, 0xf5, 24 + i * 56);
        fg.rect(-48 + i * 24, -83, 24, 166);
        fg.fill();
      }
    }

    // 缓存秒级刷新引用与状态 key（refreshUI 用；类别翻转时整页重建）
    this.kitchenProg = { barG, label: progLabel, btnLabel };
    this.kitchenCookKey = cooking ? (ready ? 'ready' : `cook:${remain}`) : 'idle';
  }

  /**
   * 大锅动态层：木勺常驻（v3.1 起不再烘进背景，UI 层绘制同款造型，勺尖为节点原点）；
   * 烹饪中播放搅拌动效（update 逐帧驱动，不用 tween，refreshKitchen 重建即销）——
   *   勺尖沿椭圆轨道顺时针绕圈搅拌 + 汤面三层漩涡弧环（压扁贴合汤面，内层转更快）+ 汤泡鼓起破裂 + 锅沿四角星闪烁。
   */
  private buildPotFx(c: Node, stirring: boolean) {
    this.potAnim = null;
    const fx = new Node('potFx');
    fx.layer = Layers.Enum.UI_2D;
    fx.parent = c;
    fx.setPosition(0, 74); // 汤面中心（svg 360,566 → cocos 0,74）

    // 木勺：勺尖为原点（柄 #8B5A2B、头 #A0713D + 棕描边，同原 bg-lib 造型）
    const spoon = new Node('spoon');
    spoon.layer = Layers.Enum.UI_2D;
    spoon.parent = fx;
    const sg = spoon.addComponent(Graphics);
    sg.strokeColor = new Color(0x8b, 0x5a, 0x2b);
    sg.lineWidth = 7;
    sg.moveTo(0, 0);
    sg.lineTo(34, 66);
    sg.stroke();
    const head = new Node('head');
    head.layer = Layers.Enum.UI_2D;
    head.parent = spoon;
    head.setPosition(40, 76);
    head.angle = -28;
    const hg = head.addComponent(Graphics);
    hg.fillColor = new Color(0xa0, 0x71, 0x3d);
    hg.ellipse(0, 0, 9, 12);
    hg.fill();
    hg.strokeColor = new Color(0x4a, 0x35, 0x20);
    hg.lineWidth = 1.8;
    hg.ellipse(0, 0, 9, 12);
    hg.stroke();

    if (!stirring) {
      spoon.setPosition(58, 14); // 静置：斜插在汤里（沿用原背景构图）
      return;
    }

    // 汤面漩涡：母节点压扁到汤面椭圆比例（ry/rx ≈ 25/110），三层圆弧环同向旋转、内层更快 → 漩涡感
    const swirl = new Node('swirl');
    swirl.layer = Layers.Enum.UI_2D;
    swirl.parent = fx;
    swirl.setScale(1, 0.23, 1);
    const ringDefs: [number, number, number, Color, number][] = [
      // [半径, 弧起始角(弧度), 弧长, 颜色, 线宽]
      [88, 0.3, 4.4, new Color(0xff, 0xe9, 0xa8, 0x70), 5],
      [60, 2.2, 4.8, new Color(0xf8, 0xa5, 0x8e, 0x90), 4.5],
      [34, 4.0, 5.2, new Color(0xff, 0xfd, 0xf5, 0x80), 4],
    ];
    const rings: Node[] = [];
    for (const [r, a0, span, col, lw] of ringDefs) {
      const ring = new Node('ring');
      ring.layer = Layers.Enum.UI_2D;
      ring.parent = swirl;
      const rg = ring.addComponent(Graphics);
      rg.strokeColor = col;
      rg.lineWidth = lw;
      rg.arc(0, 0, r, a0, a0 + span, false);
      rg.stroke();
      rings.push(ring);
    }

    // 汤泡 3 粒：鼓起→滞胀→破裂，相位错开
    const bubbles: { n: Node; op: UIOpacity; phase: number }[] = [];
    const mkBubble = (x: number, y: number, r: number, phase: number) => {
      const b = new Node('bubble');
      b.layer = Layers.Enum.UI_2D;
      b.parent = fx;
      b.setPosition(x, y);
      const bg = b.addComponent(Graphics);
      bg.fillColor = new Color(0xff, 0xe9, 0xa8, 0xb0);
      bg.circle(0, 0, r);
      bg.fill();
      const op = b.addComponent(UIOpacity);
      op.opacity = 0;
      bubbles.push({ n: b, op, phase });
    };
    mkBubble(-36, 4, 5, 0);
    mkBubble(40, -3, 4, 0.55);
    mkBubble(6, 8, 3.5, 1.0);

    // 锅沿四角星 2 颗：闪烁（可爱点缀，与庆祝层星星同语言）
    const stars: { n: Node; op: UIOpacity; phase: number }[] = [];
    const mkStar = (x: number, y: number, r: number, col: Color, phase: number) => {
      const s = new Node('star');
      s.layer = Layers.Enum.UI_2D;
      s.parent = fx;
      s.setPosition(x, y);
      const sg2 = s.addComponent(Graphics);
      sg2.fillColor = col;
      sg2.moveTo(0, r);
      sg2.quadraticCurveTo(0, 0, r, 0);
      sg2.quadraticCurveTo(0, 0, 0, -r);
      sg2.quadraticCurveTo(0, 0, -r, 0);
      sg2.quadraticCurveTo(0, 0, 0, r);
      sg2.fill();
      const op = s.addComponent(UIOpacity);
      stars.push({ n: s, op, phase });
    };
    mkStar(-76, 36, 7, new Color(0xff, 0xe9, 0xa8), 0);
    mkStar(82, 32, 5.5, new Color(0xf8, 0xa5, 0x8e), 1.6);

    this.potAnim = { spoon, rings, bubbles, stars, t: 0 };
  }

  /** 搅拌动效逐帧驱动（update 调用）：勺尖椭圆绕圈 + 漩涡环旋转 + 泡/星循环 */
  private tickPotAnim(dt: number) {
    const a = this.potAnim;
    if (!a) return;
    if (!a.spoon.isValid) {
      this.potAnim = null; // 节点已被 refreshKitchen 重建销毁
      return;
    }
    a.t += dt;
    const t = a.t;
    // 勺尖沿汤面椭圆顺时针绕圈（俯视投影：x 大圈、y 小圈），勺身随轨道切线微倾 = 手腕随动
    const th = -t * 2.4; // 负号 = 顺时针，约 2.6 秒一圈
    a.spoon.setPosition(Math.cos(th) * 62, Math.sin(th) * 62 * 0.23 + 2);
    a.spoon.angle = 14 * Math.sin(th) - 8;
    // 漩涡环：顺时针同向，内层更快（角速度差制造搅动层次）
    const speeds = [90, 160, 260];
    a.rings.forEach((r, i) => (r.angle = -speeds[i] * t));
    // 汤泡：1.4s 周期，鼓起(0~60%)→滞胀(60~80%)→破裂淡出(80~100%)
    for (const b of a.bubbles) {
      const k = ((t + b.phase) % 1.4) / 1.4;
      if (k < 0.6) {
        const s = 0.2 + (k / 0.6) * 0.9;
        b.n.setScale(s, s, 1);
        b.op.opacity = 220;
      } else if (k < 0.8) {
        b.n.setScale(1.15, 1.15, 1);
        b.op.opacity = 220;
      } else {
        const f = (k - 0.8) / 0.2;
        const s = 1.15 * (1 - f);
        b.n.setScale(s, s, 1);
        b.op.opacity = Math.round(220 * (1 - f));
      }
    }
    // 星星：呼吸闪烁 + 微缩放
    for (const s of a.stars) {
      const w = 0.5 + 0.5 * Math.sin(t * 3 + s.phase);
      s.op.opacity = Math.round(100 + 140 * w);
      const sc = 0.85 + 0.3 * w;
      s.n.setScale(sc, sc, 1);
    }
  }

  /** 烹饪进度条：深棕轨道 + 丰收黄填充（200×12，本地坐标） */
  private drawCookBar(g: Graphics, frac: number) {
    const f = Math.max(0, Math.min(1, frac));
    g.clear();
    g.fillColor = new Color(0x2e, 0x1d, 0x0e, 0x8c);
    g.roundRect(-100, -6, 200, 12, 6);
    g.fill();
    if (f > 0) {
      g.fillColor = new Color(0xf2, 0xb8, 0x30);
      g.roundRect(-100, -6, Math.max(12, 200 * f), 12, 6);
      g.fill();
    }
  }

  /** 厨房状态按钮（丰收黄主按钮，原型 v3 pill：软投影 + 金底 + 顶部受光带；置灰=浅麦灰） */
  private drawCookPill(g: Graphics, w: number, h: number, enabled: boolean) {
    const x = -w / 2;
    const y = -h / 2;
    const r = h / 2;
    g.clear();
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40);
    g.roundRect(x + 3, y - 4, w, h, r);
    g.fill();
    g.fillColor = enabled ? new Color(0xf2, 0xb8, 0x30) : new Color(0xe3, 0xd9, 0xc4);
    g.roundRect(x, y, w, h, r);
    g.fill();
    g.lineWidth = 2.5;
    g.strokeColor = enabled ? new Color(0xc9, 0x8f, 0x1b) : new Color(0xa8, 0x91, 0x6b);
    g.roundRect(x, y, w, h, r);
    g.stroke();
    g.fillColor = new Color(0xff, 0xff, 0xff, 0x59);
    g.roundRect(x + w * 0.08, y + h * 0.52, w * 0.84, h * 0.36, h * 0.18);
    g.fill();
  }

  /** 虚线圆角矩形描边（Graphics 无 dasharray，沿四边手拼短线段；角部省略，远看无异样） */
  private strokeDashedRoundRect(g: Graphics, x: number, y: number, w: number, h: number, r: number, color: Color) {
    g.strokeColor = color;
    g.lineWidth = 2;
    const dash = 8;
    const gap = 6;
    const run = (x1: number, y1: number, x2: number, y2: number) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const dx = (x2 - x1) / len;
      const dy = (y2 - y1) / len;
      for (let d = 0; d + dash <= len; d += dash + gap) {
        g.moveTo(x1 + dx * d, y1 + dy * d);
        g.lineTo(x1 + dx * (d + dash), y1 + dy * (d + dash));
      }
    };
    run(x + r, y, x + w - r, y);
    run(x + r, y + h, x + w - r, y + h);
    run(x, y + r, x, y + h - r);
    run(x + w, y + r, x + w, y + h - r);
    g.stroke();
  }

  private addToCombo(id: string) {
    const have = this.game!.getSave().inventory.crops[id] ?? 0;
    if (this.comboTotal() >= this.game!.maxComboSlots) {
      this.playSfx('error', 0.6);
      this.say(`组合槽已满（最多 ${this.game!.maxComboSlots} 份）`);
      return;
    }
    if ((this.combo[id] ?? 0) >= have) {
      this.playSfx('error', 0.6);
      this.say('这种食材没有了');
      return;
    }
    this.combo[id] = (this.combo[id] ?? 0) + 1;
    this.playSfx('add_ingredient', 0.6);
    this.refreshKitchen();
  }

  private removeFromCombo(id: string) {
    if (!this.combo[id]) return;
    this.combo[id]--;
    if (this.combo[id] <= 0) delete this.combo[id];
    this.playSfx('remove_ingredient', 0.6);
    this.refreshKitchen();
  }

  private doCook() {
    this.run(() => {
      if (this.comboTotal() === 0) {
        this.say(`先放入 1~${this.game!.maxComboSlots} 份食材`);
        return;
      }
      if (this.game!.getSave().cooking) {
        this.say('厨房正在烹饪中，先点「出锅」再试');
        return;
      }
      const { recipe, isNew } = this.game!.startCook({ ...this.combo });
      this.combo = {};
      this.playSfx('cook_start');
      const ck = this.game!.getSave().cooking;
      this.cookTotalMs = ck ? Math.max(1, ck.readyAt - Date.now()) : 0; // 进度条比例基数
      // 发现食谱出锅时才揭晓：未知组合不剧透菜名，保持悬念
      this.say(isNew ? '开始烹饪……会做出什么呢？' : `开始烹饪「${recipe.name}」`);
      this.refreshKitchen();
    });
  }

  // ---------- 内部 ----------

  private run(fn: () => void) {
    if (!this.game) return;
    try {
      fn();
    } catch (e) {
      this.playSfx('error', 0.5); // core 抛错（金币不足/等级不足等拒绝）统一给否定音
      this.say((e as Error).message);
    }
  }

  /** 遮罩结束后：新档先播序章，再按当前地点出引导。老存档两者都已读。 */
  private beginStory() {
    if (!this.game || this.playReady) return;
    if (this.game.prologuePending()) {
      this.openTalk(this.game.prologueLines(), () => {
        this.game!.finishPrologue();
        this.writeSave();
        this.playReady = true;
        this.maybeTalk(this.currentPage, 'onEnter');
      }, 'prologue');
      return;
    }
    this.playReady = true;
    this.maybeTalk(this.currentPage, 'onEnter');
  }

  /** 地点引导。切页的 onEnter 等序章结束；收获和黑暗料理可以排在序章后面。 */
  private maybeTalk(page: string, trigger: 'onEnter' | 'onHarvest' | 'onDark') {
    if (!this.game) return;
    if (trigger === 'onEnter' && !this.playReady) return;
    const place = GameController.PLACE[page];
    if (!place) return;
    const story = this.game.pendingTutorial(place, trigger);
    if (!story) return;
    if (this.talkStoryId === story.id || this.talkQueue.some((q) => q.id === story.id)) return;
    this.openTalk(
      story.lines.map((text) => ({ speaker: story.speaker, text })),
      () => {
        this.game!.completeTutorial(story.id);
        this.writeSave();
      },
      story.id,
    );
  }

  /** 底部对白。不盖住整屏，跳过只结束这一段。正在播时后来的段排队。 */
  private openTalk(
    lines: { speaker: string; text: string }[],
    onDone: () => void,
    id: string,
  ) {
    if (lines.length === 0) {
      onDone();
      return;
    }
    if (this.talkNode) {
      this.talkQueue.push({ id, lines, onDone });
      return;
    }
    this.talkStoryId = id;
    this.talkLines = lines;
    this.talkIndex = 0;
    this.talkOnDone = onDone;
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas) {
      this.talkStoryId = '';
      this.talkOnDone = null;
      onDone();
      return;
    }
    const n = new Node('Talk');
    n.layer = Layers.Enum.UI_2D;
    n.parent = canvas;
    n.setPosition(0, -430);
    n.addComponent(UITransform).setContentSize(660, 250);
    n.addComponent(BlockInputEvents);
    const g = n.addComponent(Graphics);
    g.fillColor = new Color(0xff, 0xf8, 0xe7, 245);
    g.roundRect(-330, -110, 660, 230, 18);
    g.fill();
    g.lineWidth = 3;
    g.strokeColor = new Color(0x4a, 0x35, 0x20);
    g.roundRect(-330, -110, 660, 230, 18);
    g.stroke();
    const mk = (y: number, size: number, color: Color, w: number) => {
      const t = new Node('t');
      t.layer = Layers.Enum.UI_2D;
      t.parent = n;
      t.setPosition(0, y);
      t.addComponent(UITransform).setContentSize(w, size + 8);
      const l = t.addComponent(Label);
      l.fontSize = size;
      l.color = color;
      l.horizontalAlign = Label.HorizontalAlign.CENTER;
      l.overflow = Label.Overflow.RESIZE_HEIGHT;
      return l;
    };
    this.talkSpeaker = mk(78, 22, new Color(0x8b, 0x5a, 0x2b), 600);
    this.talkSpeaker.isBold = true;
    this.talkBody = mk(10, 26, new Color(0x4a, 0x35, 0x20), 600);
    const btn = (x: number, text: string, fn: () => void) => {
      const b = new Node(text);
      b.layer = Layers.Enum.UI_2D;
      b.parent = n;
      b.setPosition(x, -78);
      b.addComponent(UITransform).setContentSize(140, 44);
      const bg = b.addComponent(Graphics);
      bg.fillColor = new Color(0xf2, 0xb8, 0x30);
      bg.roundRect(-70, -22, 140, 44, 12);
      bg.fill();
      bg.strokeColor = new Color(0x4a, 0x35, 0x20);
      bg.lineWidth = 2;
      bg.roundRect(-70, -22, 140, 44, 12);
      bg.stroke();
      const l = mk(0, 22, new Color(0x4a, 0x35, 0x20), 120);
      l.string = text;
      l.node.setParent(b);
      l.node.setPosition(0, 0);
      b.on(Node.EventType.TOUCH_END, fn);
    };
    btn(-90, '下一句', () => this.advanceTalk());
    btn(90, '跳过', () => this.finishTalk());
    this.talkNode = n;
    this.renderTalkLine();
    this.applyUiFont(n);
    n.setSiblingIndex(canvas.children.length - 1);
  }

  private renderTalkLine() {
    const line = this.talkLines[this.talkIndex];
    if (!line || !this.talkSpeaker || !this.talkBody) return;
    this.talkSpeaker.string = line.speaker;
    this.talkBody.string = line.text;
  }

  private advanceTalk() {
    if (this.talkIndex < this.talkLines.length - 1) {
      this.talkIndex += 1;
      this.renderTalkLine();
      return;
    }
    this.finishTalk();
  }

  private finishTalk() {
    const done = this.talkOnDone;
    this.talkNode?.destroy();
    this.talkNode = null;
    this.talkSpeaker = null;
    this.talkBody = null;
    this.talkOnDone = null;
    this.talkStoryId = '';
    this.talkLines = [];
    done?.();
    const next = this.talkQueue.shift();
    if (next) this.openTalk(next.lines, next.onDone, next.id);
  }

  /** 当前页消息栏（各页位置统一）；page 指定时写到对应页 */
  private say(msg: string, page?: string) {
    console.log(msg);
    const label = this.pageMessages[page ?? this.currentPage];
    if (label) this.flashMsg(label, msg);
  }

  /** 全页面消息（每日奖励、离线提示等全局事件） */
  private sayAll(msg: string) {
    console.log(msg);
    for (const label of Object.values(this.pageMessages)) this.flashMsg(label, msg);
  }

  /** 消息栏短暂显示：3 秒后淡出（新消息打断上一次淡出，恢复不透明） */
  private flashMsg(label: Label, msg: string) {
    label.string = msg;
    const op = label.node.getComponent(UIOpacity) ?? label.node.addComponent(UIOpacity);
    Tween.stopAllByTarget(op);
    op.opacity = 255;
    tween(op)
      .delay(3)
      .to(0.6, { opacity: 0 }, { easing: 'sineOut' })
      .start();
  }

  private refreshUI() {
    const save = this.game!.getSave();
    const gold = save.gold;
    if (this.goldLabel) this.goldLabel.string = `金币: ${gold}`;
    // 金币进账反馈：胶囊脉冲 + 「+N」上浮（只在增加时播，首帧不播）
    if (this.lastGold >= 0 && gold > this.lastGold) this.playGoldGain(gold - this.lastGold);
    this.lastGold = gold;

    // 顶栏个人区（M3-①）：Lv 徽章 + 经验条按 levelInfo() 刷新；升级时胶囊脉冲
    const info = this.game!.levelInfo();
    if (this.lvLabel) this.lvLabel.string = `Lv${info.level}`;
    if (this.xpTextLabel) {
      this.xpTextLabel.string = info.nextLevelXp === null ? `${info.xp} MAX` : `${info.xp}/${info.nextLevelXp}`;
    }
    if (this.xpBarG) {
      const key = `${info.level}:${Math.floor(info.progress * 100)}`;
      if (key !== this.xpBarKey) {
        this.xpBarKey = key;
        const g = this.xpBarG;
        g.clear();
        g.fillColor = new Color(0x2e, 0x20, 0x12);
        g.roundRect(-85, -5, 170, 10, 5);
        g.fill();
        if (info.progress > 0) {
          g.fillColor = new Color(0xf2, 0xb8, 0x30);
          g.roundRect(-85, -5, Math.max(10, 170 * info.progress), 10, 5);
          g.fill();
        }
      }
    }
    if (this.lastLevel >= 0 && info.level > this.lastLevel && this.profileBar) {
      const bar = this.profileBar;
      bar.setScale(1, 1, 1);
      tween(bar)
        .to(0.12, { scale: new Vec3(1.15, 1.15, 1) })
        .to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
        .start();
    }
    this.lastLevel = info.level;

    // 经验/升级事件：levelup 弹升级庆祝层（xp 事件不弹窗，顶栏已在上文刷新）
    for (const ev of this.game!.drainXpEvents()) {
      if (ev.type === 'levelup') {
        this.playLevelUp(ev.level, ev.rewardGold, ev.unlocks);
        this.refreshSeeds(); // 新等级可能解锁种子
        this.refreshShop(); // 新等级可能解锁升级线购买资格
      }
    }

    // 收集里程碑（M4）：达成即发奖 + 庆祝层（多个时逐个顺序弹，含旧存档补发的一次性批量）
    this.playMilestones(this.game!.drainMilestones());

    // 动态菱形地块三态刷新（fieldLabels 静态按钮已隐藏，不再刷新）
    this.fieldPlots.forEach((plot, i) => {
      const f = save.fields[i];
      if (!f) {
        plot.setEmpty(`empty:${i}`);
      } else {
        const p = this.game!.growthProgress(i);
        const name = this.game!.cropName(f.cropId);
        if (p >= 1) {
          plot.setMature(f.cropId, name, `m:${f.cropId}`);
        } else {
          const pct = Math.floor(p * 100);
          plot.setGrowing(f.cropId, name, pct, `g:${f.cropId}:${pct}`);
        }
      }
    });

    this.refreshBaskets(); // 收获篮区跟随库存变化（内部 key 缓存，不变不重建）

    // KitchenLabel 场景节点已隐藏收编（v3 进度条取代文字倒计时），保留仅作调试文本
    if (this.kitchenLabel) {
      const c = save.cooking;
      const remain = c ? Math.max(0, Math.ceil((c.readyAt - Date.now()) / 1000)) : 0;
      this.kitchenLabel.string = c
        ? `厨房：${this.game!.dishName(c.dishId)}（剩余 ${remain} 秒）`
        : '厨房：空闲';
    }

    // 厨房页进度条/状态按钮秒级刷新：同类状态（cook:n）就地改文案+进度条；类别翻转（cook↔ready↔idle）整页重建
    if (this.kitchenProg) {
      const c = save.cooking;
      const remain = c ? Math.max(0, Math.ceil((c.readyAt - Date.now()) / 1000)) : 0;
      const key = c ? (remain > 0 ? `cook:${remain}` : 'ready') : 'idle';
      // 搅拌循环音：只在厨房页且烹饪进行中响
      this.updateStirSfx(this.currentPage === 'kitchen' && !!c && remain > 0);
      if (key !== this.kitchenCookKey) {
        const flip = key === 'idle' || key === 'ready' || this.kitchenCookKey === 'idle' || this.kitchenCookKey === 'ready';
        if (flip) {
          this.refreshKitchen();
        } else {
          this.kitchenCookKey = key;
          const dishLabel = save.discoveredRecipes.includes(c!.dishId) ? this.game!.dishName(c!.dishId) : '？？？'; // 未发现不剧透
          this.kitchenProg.label.string = `${dishLabel} · 剩余 ${remain} 秒`;
          this.kitchenProg.btnLabel.string = `烹饪中 · 剩余 ${remain} 秒`;
          this.drawCookBar(this.kitchenProg.barG, 1 - remain / Math.max(1, Math.ceil(this.cookTotalMs / 1000)));
        }
      }
    }

    const invTarget = this.invLabel ?? this.inventoryLabel;
    if (invTarget) {
      const fmt = (o: Record<string, number>, nameOf: (id: string) => string) =>
        Object.entries(o)
          .filter(([, n]) => n > 0)
          .map(([k, n]) => `${nameOf(k)}×${n}`)
          .join(' ') || '（空）';
      invTarget.string =
        `作物 ${fmt(save.inventory.crops, (id) => this.game!.cropName(id))} · ` +
        `菜品 ${fmt(save.inventory.dishes, (id) => this.game!.dishName(id))} · ` +
        `图鉴 ${save.discoveredRecipes.length}/${this.game!.recipeCount}`;
    }

    // 商店页收益预览（previewSellAll 只读，含店铺倍率 + 今日特价；库存变化实时反映）
    if (this.sellPreviewLabel) {
      const pv = this.game!.previewSellAll();
      this.sellPreviewLabel.string = pv.gold > 0 ? `全部卖出（菜品+作物），+${pv.gold} 金币` : '暂无可卖的存货';
    }
    // 今日特价小黑板（常驻展示；尚无已发现食谱时 dailySpecial() 为 null → 只显示标题的默认态）
    if (this.specialBoard) {
      const sp = this.game!.dailySpecial();
      this.specialBoard.active = true;
      if (this.specialLabel) {
        this.specialLabel.string = sp ? `${sp.name} +${Math.round((sp.mult - 1) * 100)}%` : '';
      }
    }
  }

  // ---------- 核心反馈动效（美术 v1.0 §8：爽点必须贵） ----------

  /** 收获动效：作物图标从田畦弹跳飞出、上升消散 */
  private playHarvest(plotNode: Node, cropId: string) {
    const sf = this.iconFrames[cropId];
    if (!sf) return;
    const n = new Node('HarvestFly');
    n.layer = Layers.Enum.UI_2D;
    n.parent = plotNode.parent ?? plotNode;
    const p = plotNode.position;
    n.setPosition(p.x, p.y + 10, 0);
    const ut = n.addComponent(UITransform);
    ut.setContentSize(52, 52);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.spriteFrame = sf;
    ut.setContentSize(52, 52);
    const op = n.addComponent(UIOpacity);
    n.setScale(0.4, 0.4, 1);
    tween(n)
      .to(0.22, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'backOut' })
      .to(0.12, { scale: new Vec3(1, 1, 1) })
      .start();
    tween(n).by(0.7, { position: new Vec3(0, 110, 0) }, { easing: 'sineOut' }).start();
    tween(op)
      .delay(0.45)
      .to(0.25, { opacity: 0 })
      .call(() => n.destroy())
      .start();
  }

  /** 金币进账：胶囊脉冲 + 「+N」金色数字上浮 */
  private playGoldGain(diff: number) {
    const bar = this.goldBar;
    if (!bar) return;
    bar.setScale(1, 1, 1);
    tween(bar)
      .to(0.12, { scale: new Vec3(1.15, 1.15, 1) })
      .to(0.16, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
      .start();
    const n = new Node('GoldGain');
    n.layer = Layers.Enum.UI_2D;
    n.parent = bar;
    n.setPosition(0, 44, 0);
    n.addComponent(UITransform);
    const label = n.addComponent(Label);
    label.string = `+${diff}`;
    label.fontSize = 24;
    label.color = new Color(0xf2, 0xb8, 0x30);
    const op = n.addComponent(UIOpacity);
    tween(n).by(0.8, { position: new Vec3(0, 46, 0) }, { easing: 'sineOut' }).start();
    tween(op)
      .delay(0.5)
      .to(0.3, { opacity: 0 })
      .call(() => n.destroy())
      .start();
  }

  /** 金色四角星（发现庆祝层的爆开粒子）；color 可换色（如黑暗料理的紫星） */
  private makeSparkle(parent: Node, color?: Color): Node {
    const st = new Node('sparkle');
    st.layer = Layers.Enum.UI_2D;
    st.parent = parent;
    st.addComponent(UITransform).setContentSize(28, 28);
    const g = st.addComponent(Graphics);
    const r = 14;
    g.fillColor = color ?? new Color(0xf2, 0xb8, 0x30);
    g.moveTo(0, -r);
    g.lineTo(r * 0.28, -r * 0.28);
    g.lineTo(r, 0);
    g.lineTo(r * 0.28, r * 0.28);
    g.lineTo(0, r);
    g.lineTo(-r * 0.28, r * 0.28);
    g.lineTo(-r, 0);
    g.lineTo(-r * 0.28, -r * 0.28);
    g.close();
    g.fill();
    return st;
  }

  /** 农场升级庆祝层（M3-①）：复用发现庆祝层骨架——纱幔 + 金边纸卡 backOut 弹入 + 星星爆开；
   *  内容 = 升级标题 + 奖励金币 + 已解锁清单 + 下一级预告（满级显示「已是最高等级」） */
  private playLevelUp(level: number, rewardGold: number, unlocks: string[]) {
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas || !this.game) return;
    this.playSfx('levelup'); // 农场升级专属（区别于购买升级的 upgrade）
    const unlockLines = unlocks.map((k) => this.game!.unlockText(k));
    const preview = this.game.nextLevelPreview();
    const previewText = preview
      ? `下一级 Lv${preview.level}：${
          preview.unlocks.length > 0 ? preview.unlocks.map((k) => this.game!.unlockText(k)).join('、') : '更多内容筹备中'
        }`
      : '已是最高等级';

    const ov = new Node('LevelUpOverlay');
    ov.layer = Layers.Enum.UI_2D;
    ov.parent = canvas;
    ov.addComponent(UITransform).setContentSize(720, 1280);
    ov.addComponent(BlockInputEvents); // 拦截点击，防止穿透到下层 UI
    const veil = ov.addComponent(Graphics);
    veil.fillColor = new Color(0x4a, 0x35, 0x20, 0xb8);
    veil.rect(-360, -640, 720, 1280);
    veil.fill();
    const ovOp = ov.addComponent(UIOpacity);
    ovOp.opacity = 0;
    tween(ovOp).to(0.2, { opacity: 255 }).start();

    // 金边纸卡（高度随解锁清单行数变化）
    const w = 460;
    const h = 320 + unlockLines.length * 30;
    const card = new Node('card');
    card.layer = Layers.Enum.UI_2D;
    card.parent = ov;
    card.addComponent(UITransform).setContentSize(w, h);
    card.setPosition(0, 40, 0);
    const g = card.addComponent(Graphics);
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40);
    g.roundRect(-w / 2 + 5, -h / 2 - 6, w, h, 22);
    g.fill();
    g.fillColor = new Color(0xff, 0xfd, 0xf5);
    g.roundRect(-w / 2, -h / 2, w, h, 22);
    g.fill();
    g.strokeColor = new Color(0xf2, 0xb8, 0x30);
    g.lineWidth = 4;
    g.roundRect(-w / 2, -h / 2, w, h, 22);
    g.stroke();
    const mkLabel = (text: string, y: number, size: number, color: Color, bold = false) => {
      const ln = new Node('label');
      ln.layer = Layers.Enum.UI_2D;
      ln.parent = card;
      ln.addComponent(UITransform).setContentSize(w - 40, size + 8);
      ln.setPosition(0, y, 0);
      const ll = ln.addComponent(Label);
      ll.string = text;
      ll.fontSize = size;
      ll.color = color;
      ll.overflow = Label.Overflow.CLAMP;
      if (bold) ll.isBold = true;
    };
    let y = h / 2 - 40;
    mkLabel(`农场升级到 Lv${level}！`, y, 28, new Color(0xc9, 0x8f, 0x1b), true); // 快乐体字库无 emoji，星星由爆开动效承担
    y -= 44;
    mkLabel(`+${rewardGold} 金币`, y, 24, new Color(0x4a, 0x35, 0x20), true);
    y -= 40;
    for (const t of unlockLines) {
      mkLabel(`已解锁：${t}`, y, 18, new Color(0x4a, 0x35, 0x20));
      y -= 30;
    }
    mkLabel(previewText, y - 6, 16, new Color(0xc9, 0x8f, 0x1b));
    mkLabel('点击任意处继续', -h / 2 + 26, 16, new Color(0xa8, 0x91, 0x6b));
    card.setScale(0.3, 0.3, 1);
    tween(card).to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

    // 星星爆开
    for (let i = 0; i < 10; i++) {
      const st = this.makeSparkle(card);
      const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      st.setPosition(Math.cos(ang) * 40, 60 + Math.sin(ang) * 40, 0);
      st.setScale(0.2, 0.2, 1);
      const r = 150 + Math.random() * 90;
      const sop = st.addComponent(UIOpacity);
      tween(st)
        .to(
          0.5,
          { position: new Vec3(Math.cos(ang) * r, 60 + Math.sin(ang) * r, 0), scale: new Vec3(1, 1, 1) },
          { easing: 'sineOut' },
        )
        .start();
      tween(sop)
        .delay(0.35)
        .to(0.25, { opacity: 0 })
        .start();
    }

    // 关闭（点击 / 超时）
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      tween(ovOp)
        .to(0.25, { opacity: 0 })
        .call(() => ov.destroy())
        .start();
    };
    ov.on(Node.EventType.TOUCH_END, close, this);
    this.scheduleOnce(close, 3.5);
    this.applyUiFont(ov); // 升级庆祝层快乐体（美术 v1.1 ④）
  }

  /** 里程碑弹层入口：空列表直接返回；多个（旧存档补发）按顺序逐个弹，每层列出自己的奖励明细 */
  private playMilestones(list: MilestoneDef[]) {
    if (list.length === 0) return;
    const [head, ...rest] = list;
    this.playMilestone(head, () => this.playMilestones(rest));
  }

  /** 收集里程碑庆祝层（M4）：复用升级庆祝层骨架——纱幔 + 金边纸卡弹入 + 星星爆开；
   *  内容 = 里程碑标题 + 奖励金币 + 下一个目标预告（全达成显示「已全部达成」）。快乐体无 emoji，庆祝感由图形承担 */
  private playMilestone(m: MilestoneDef, onClosed?: () => void) {
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas || !this.game) return;
    this.playSfx('levelup'); // 里程碑与升级同档喜庆音效
    const next = this.game.nextMilestoneOf(m.type);
    const nextText = next ? `下一个：${next.name}` : '已全部达成';

    const ov = new Node('MilestoneOverlay');
    ov.layer = Layers.Enum.UI_2D;
    ov.parent = canvas;
    ov.addComponent(UITransform).setContentSize(720, 1280);
    ov.addComponent(BlockInputEvents); // 拦截点击，防止穿透到下层 UI
    const veil = ov.addComponent(Graphics);
    veil.fillColor = new Color(0x4a, 0x35, 0x20, 0xb8);
    veil.rect(-360, -640, 720, 1280);
    veil.fill();
    const ovOp = ov.addComponent(UIOpacity);
    ovOp.opacity = 0;
    tween(ovOp).to(0.2, { opacity: 255 }).start();

    const w = 460;
    const h = 300;
    const card = new Node('card');
    card.layer = Layers.Enum.UI_2D;
    card.parent = ov;
    card.addComponent(UITransform).setContentSize(w, h);
    card.setPosition(0, 40, 0);
    const g = card.addComponent(Graphics);
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40);
    g.roundRect(-w / 2 + 5, -h / 2 - 6, w, h, 22);
    g.fill();
    g.fillColor = new Color(0xff, 0xfd, 0xf5);
    g.roundRect(-w / 2, -h / 2, w, h, 22);
    g.fill();
    g.strokeColor = new Color(0xf2, 0xb8, 0x30);
    g.lineWidth = 4;
    g.roundRect(-w / 2, -h / 2, w, h, 22);
    g.stroke();
    const mkLabel = (text: string, y: number, size: number, color: Color, bold = false) => {
      const ln = new Node('label');
      ln.layer = Layers.Enum.UI_2D;
      ln.parent = card;
      ln.addComponent(UITransform).setContentSize(w - 40, size + 8);
      ln.setPosition(0, y, 0);
      const ll = ln.addComponent(Label);
      ll.string = text;
      ll.fontSize = size;
      ll.color = color;
      ll.overflow = Label.Overflow.CLAMP;
      if (bold) ll.isBold = true;
    };
    mkLabel(`收集里程碑·${m.name}`, h / 2 - 46, 28, new Color(0xc9, 0x8f, 0x1b), true);
    mkLabel(`+${m.reward} 金币`, h / 2 - 96, 24, new Color(0x4a, 0x35, 0x20), true);
    mkLabel(nextText, h / 2 - 146, 16, new Color(0xc9, 0x8f, 0x1b));
    mkLabel('点击任意处继续', -h / 2 + 26, 16, new Color(0xa8, 0x91, 0x6b));
    card.setScale(0.3, 0.3, 1);
    tween(card).to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

    // 星星爆开
    for (let i = 0; i < 10; i++) {
      const st = this.makeSparkle(card);
      const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
      st.setPosition(Math.cos(ang) * 40, 30 + Math.sin(ang) * 40, 0);
      st.setScale(0.2, 0.2, 1);
      const r = 150 + Math.random() * 90;
      const sop = st.addComponent(UIOpacity);
      tween(st)
        .to(
          0.5,
          { position: new Vec3(Math.cos(ang) * r, 30 + Math.sin(ang) * r, 0), scale: new Vec3(1, 1, 1) },
          { easing: 'sineOut' },
        )
        .start();
      tween(sop)
        .delay(0.35)
        .to(0.25, { opacity: 0 })
        .start();
    }

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      tween(ovOp)
        .to(0.25, { opacity: 0 })
        .call(() => {
          ov.destroy();
          onClosed?.(); // 补发批量：本层关完再弹下一个
        })
        .start();
    };
    ov.on(Node.EventType.TOUCH_END, close, this);
    this.scheduleOnce(close, 3.5);
    this.applyUiFont(ov); // 里程碑庆祝层快乐体（美术 v1.1 ④）
  }

  /** 发现新食谱庆祝层：暖棕纱幔 + 金边纸卡弹入 + 星星爆开；点击或 3.5s 自动关闭。
   *  稀有食谱（三食材菜）升级表现：卡片背后旋转散射光芒、双描边卡框、专属标题与菜谱文案、
   *  更多星光、停留更久（5s），传达「你发现的东西非常稀有」 */
  private playDiscovery(dishId: string, dishName: string, opts?: { rare?: boolean; desc?: string; header?: string }) {
    const rare = opts?.rare ?? false;
    // 黑暗料理专属氛围：紫黑纱幔 + 紫黑波浪翻涌（替换金色光芒/星星那套喜庆表现）
    const dark = dishId === 'dark_cuisine';
    const canvas = this.node.scene?.getChildByName('Canvas');
    if (!canvas) return;
    const ov = new Node('DiscoveryOverlay');
    ov.layer = Layers.Enum.UI_2D;
    ov.parent = canvas;
    ov.addComponent(UITransform).setContentSize(720, 1280);
    ov.addComponent(BlockInputEvents); // 拦截点击，防止穿透到下层 UI
    const veil = ov.addComponent(Graphics);
    veil.fillColor = dark ? new Color(0x14, 0x0c, 0x20, 0xd8) : rare ? new Color(0x2e, 0x1e, 0x3a, 0xc8) : new Color(0x4a, 0x35, 0x20, 0xb8);
    veil.rect(-360, -640, 720, 1280);
    veil.fill();
    const ovOp = ov.addComponent(UIOpacity);
    ovOp.opacity = 0;
    tween(ovOp).to(0.2, { opacity: 255 }).start();

    // 黑暗料理：三列紫黑波浪在卡片背后缓慢翻涌（正弦飘带，左右漂移 + 呼吸）
    if (dark) {
      const waveColors = [new Color(0x3d, 0x2b, 0x56, 0xb0), new Color(0x2a, 0x1d, 0x40, 0xc8), new Color(0x4a, 0x33, 0x70, 0x90)];
      for (let wIdx = 0; wIdx < 3; wIdx++) {
        const wn = new Node('wave');
        wn.layer = Layers.Enum.UI_2D;
        wn.parent = ov;
        wn.addComponent(UITransform).setContentSize(900, 1280);
        wn.setPosition(0, 40, 0);
        const wg = wn.addComponent(Graphics);
        const baseY = -260 + wIdx * 240; // 三条纵向错开
        const amp = 34 + wIdx * 12;
        const halfH = 52; // 飘带半高（细浪，不糊屏）
        const waveLen = 150;
        wg.fillColor = waveColors[wIdx];
        wg.moveTo(-450, baseY - halfH);
        for (let x = -450; x < 450; x += waveLen) {
          wg.quadraticCurveTo(x + waveLen / 2, baseY - halfH + (x / waveLen % 2 === 0 ? amp : -amp) * 2, x + waveLen, baseY - halfH);
        }
        wg.lineTo(450, baseY + halfH);
        for (let x = 450; x > -450; x -= waveLen) {
          wg.quadraticCurveTo(x - waveLen / 2, baseY + halfH + (x / waveLen % 2 === 0 ? -amp : amp) * 2, x - waveLen, baseY + halfH);
        }
        wg.close();
        wg.fill();
        // 左右漂移 + 缓慢呼吸（循环装饰，黑暗料理专属层不受每屏动效配额限制——它是全屏反馈层）
        const drift = 60 + wIdx * 25;
        const dur = 2.2 + wIdx * 0.7;
        tween(wn)
          .repeatForever(
            tween<Node>()
              .to(dur, { position: new Vec3(wIdx % 2 === 0 ? drift : -drift, 40, 0) }, { easing: 'sineInOut' })
              .to(dur, { position: new Vec3(0, 40, 0) }, { easing: 'sineInOut' }),
          )
          .start();
        const wop = wn.addComponent(UIOpacity);
        tween(wop)
          .repeatForever(
            tween<UIOpacity>()
              .to(dur, { opacity: 160 }, { easing: 'sineInOut' })
              .to(dur, { opacity: 255 }, { easing: 'sineInOut' }),
          )
          .start();
      }
    }

    // 稀有：卡片背后的散射光芒（旋转扇形光锥，循环慢转）
    if (rare && !dark) {
      const rays = new Node('rays');
      rays.layer = Layers.Enum.UI_2D;
      rays.parent = ov;
      rays.setPosition(0, 40, 0);
      rays.addComponent(UITransform).setContentSize(720, 720);
      const rg = rays.addComponent(Graphics);
      const R = 360;
      const N = 12;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const half = (i % 2 === 0 ? 0.16 : 0.09); // 宽窄交替，更有韵律
        rg.fillColor = new Color(0xff, 0xd9, 0x6a, i % 2 === 0 ? 0x4d : 0x2e);
        rg.moveTo(0, 0);
        rg.lineTo(Math.cos(a - half) * R, Math.sin(a - half) * R);
        rg.lineTo(Math.cos(a + half) * R, Math.sin(a + half) * R);
        rg.close();
        rg.fill();
      }
      tween(rays).by(12, { angle: 360 }).repeatForever().start();
    }

    // 金边纸卡（稀有版更高；有描述文案时加高 40 放两句制 desc）
    const w = 430;
    const h = (rare ? 460 : 380) + (opts?.desc ? 40 : 0);
    const card = new Node('card');
    card.layer = Layers.Enum.UI_2D;
    card.parent = ov;
    card.addComponent(UITransform).setContentSize(w, h);
    card.setPosition(0, 40, 0);
    const g = card.addComponent(Graphics);
    g.fillColor = new Color(0x4a, 0x35, 0x20, 0x40);
    g.roundRect(-w / 2 + 5, -h / 2 - 6, w, h, 22);
    g.fill();
    g.fillColor = new Color(0xff, 0xfd, 0xf5);
    g.roundRect(-w / 2, -h / 2, w, h, 22);
    g.fill();
    g.strokeColor = dark ? new Color(0x7a, 0x5a, 0xa8) : new Color(0xf2, 0xb8, 0x30);
    g.lineWidth = 4;
    g.roundRect(-w / 2, -h / 2, w, h, 22);
    g.stroke();
    if (rare && !dark) {
      // 稀有：内圈浅色双描边 + 微光呼吸
      g.strokeColor = new Color(0xff, 0xd9, 0x6a);
      g.lineWidth = 2;
      g.roundRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16, 16);
      g.stroke();
      const cardOp = card.addComponent(UIOpacity);
      tween(cardOp).to(0.9, { opacity: 200 }).to(0.9, { opacity: 255 }).union().repeatForever().start();
    }
    const mkLabel = (text: string, y: number, size: number, color: Color, bold = false) => {
      const ln = new Node('label');
      ln.layer = Layers.Enum.UI_2D;
      ln.parent = card;
      ln.addComponent(UITransform).setContentSize(w - 40, size + 8);
      ln.setPosition(0, y, 0);
      const ll = ln.addComponent(Label);
      ll.string = text;
      ll.fontSize = size;
      ll.color = color;
      if (rare) ll.overflow = Label.Overflow.CLAMP;
      if (bold) ll.isBold = true;
    };
    mkLabel(opts?.header ?? (dark ? '黑暗料理……' : rare ? '发现稀有食谱！' : '发现新食谱！'), h / 2 - 50, 28, dark ? new Color(0x7a, 0x5a, 0xa8) : new Color(0xc9, 0x8f, 0x1b), true);
    const sf = this.iconFrames[dishId];
    if (sf) {
      const icon = new Node('icon');
      icon.layer = Layers.Enum.UI_2D;
      icon.parent = card;
      const iut = icon.addComponent(UITransform);
      iut.setContentSize(130, 130);
      icon.setPosition(0, rare ? h / 2 - 160 : 30, 0);
      const sp = icon.addComponent(Sprite);
      sp.sizeMode = Sprite.SizeMode.CUSTOM;
      sp.spriteFrame = sf;
      iut.setContentSize(130, 130);
    }
    mkLabel(`「${dishName}」`, rare ? h / 2 - 270 : -80, 32, new Color(0x4a, 0x35, 0x20), true);
    // 描述文案：所有规格都展示（M5 两句制 desc），顶锚自动换行，图鉴详情与发现庆祝共用
    if (opts?.desc) {
      const dn = new Node('desc');
      dn.layer = Layers.Enum.UI_2D;
      dn.parent = card;
      const dut = dn.addComponent(UITransform);
      dut.setContentSize(w - 64, 24);
      dut.setAnchorPoint(0.5, 1);
      dn.setPosition(0, rare ? h / 2 - 312 : -110);
      const dl = dn.addComponent(Label);
      dl.string = opts.desc;
      dl.fontSize = 16;
      dl.lineHeight = 24;
      dl.color = new Color(0x8b, 0x5a, 0x2b);
      dl.overflow = Label.Overflow.RESIZE_HEIGHT; // 按宽度自动换行、向下撑高
    }
    mkLabel('已收入图鉴 · 点击任意处继续', -h / 2 + 26, 16, new Color(0xa8, 0x91, 0x6b));
    card.setScale(0.3, 0.3, 1);
    tween(card).to(0.35, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();

    // 星星爆开（稀有翻倍且分两波；黑暗料理 = 紫色星尘）
    const waves = rare && !dark ? 2 : 1;
    for (let wave = 0; wave < waves; wave++) {
      for (let i = 0; i < 10; i++) {
        const st = this.makeSparkle(card, dark ? new Color(0x9a, 0x7a, 0xc8) : undefined);
        const ang = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
        st.setPosition(Math.cos(ang) * 40, 30 + Math.sin(ang) * 40, 0);
        st.setScale(0.2, 0.2, 1);
        const r = 150 + Math.random() * 90;
        const sop = st.addComponent(UIOpacity);
        tween(st)
          .delay(wave * 0.3)
          .to(
            0.5,
            { position: new Vec3(Math.cos(ang) * r, 30 + Math.sin(ang) * r, 0), scale: new Vec3(1, 1, 1) },
            { easing: 'sineOut' },
          )
          .start();
        tween(sop)
          .delay(wave * 0.3 + 0.35)
          .to(0.25, { opacity: 0 })
          .start();
      }
    }

    // 关闭（点击 / 超时，稀有停留更久）
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      tween(ovOp)
        .to(0.25, { opacity: 0 })
        .call(() => ov.destroy())
        .start();
    };
    ov.on(Node.EventType.TOUCH_END, close, this);
    this.scheduleOnce(close, rare ? 5 : 3.5);
    this.applyUiFont(ov); // 庆祝层快乐体（美术 v1.1 ④）
  }

  // ---------- 数据与存档 ----------

  /** 预载全部图标与页面背景（失败时降级为纯文字灰盒/色块底） */
  private async loadIcons(): Promise<void> {
    const loadDir = (dir: string) =>
      new Promise<SpriteFrame[]>((resolve) =>
        resources.loadDir(`icons/${dir}`, SpriteFrame, (err, frames) => resolve(err ? [] : frames)),
      );
    const loadBg = () =>
      new Promise<SpriteFrame[]>((resolve) =>
        resources.loadDir('bg', SpriteFrame, (err, frames) => resolve(err ? [] : frames)),
      );
    const [crops, dishes, field, bgs] = await Promise.all([loadDir('crops'), loadDir('dishes'), loadDir('field'), loadBg()]);
    for (const f of [...crops, ...dishes, ...field]) this.iconFrames[f.name] = f;
    for (const f of bgs) this.bgFrames[f.name] = f;
    resources.load('ui/paper/spriteFrame', SpriteFrame, (err, frame) => {
      if (!err) this.paperFrame = frame;
    });
    resources.loadDir('audio/sfx', AudioClip, (err, clips) => {
      if (!err) for (const c of clips) this.sfx[c.name] = c;
    });
    // BGM（音频 v1.0）：加载成功即循环播放；缺失静默（CDN 迁移后改为远程加载）
    resources.load('audio/bgm/main', AudioClip, (err, clip) => {
      if (err || !clip || !this.bgmSrc) return;
      this.bgmSrc.clip = clip;
      this.bgmSrc.loop = true;
      this.bgmSrc.volume = 0.35; // 背景音量压低，给音效留头顶空间
      this.bgmSrc.play();
    });
    // UI 字体在页面构建前加载完毕（失败静默降级系统字）
    await new Promise<void>((resolve) =>
      resources.load('fonts/ui', TTFFont, (err, f) => {
        if (!err) this.uiFont = f;
        resolve();
      }),
    );
  }

  /** 把快乐体应用到 root 下所有 Label（含未来状态再刷新的子树——各构建/刷新函数末尾调用）；字体缺失时不动 */
  private applyUiFont(root: Node) {
    if (!this.uiFont) return;
    for (const l of root.getComponentsInChildren(Label)) {
      l.useSystemFont = false;
      l.font = this.uiFont;
    }
  }

  /** 播音效：未加载到（目录不存在/编辑器未导入）时静默跳过 */
  private playSfx(name: string, volume = 0.8) {
    const clip = this.sfx[name];
    if (clip && this.audioSrc) this.audioSrc.playOneShot(clip, volume);
  }

  /** 搅拌循环音开关：只在厨房页且烹饪进行中响；clips 未加载/离开页面/出锅即停 */
  private updateStirSfx(on: boolean) {
    const src = this.stirSrc;
    if (!src) return;
    if (on && !src.playing) {
      const clip = this.sfx['stir'];
      if (!clip) return;
      src.clip = clip;
      src.loop = true;
      src.volume = 0.4;
      src.play();
    } else if (!on && src.playing) {
      src.stop();
    }
  }

  private async loadData(): Promise<DataTables> {
    const load = (p: string) =>
      new Promise<any>((resolve, reject) =>
        resources.load(`data/${p}`, JsonAsset, (err, asset) =>
          err ? reject(err) : resolve(asset.json),
        ),
      );
    const [crops, recipes, upgrades, levels, config, milestones, npcs, orders, stories] = await Promise.all([
      load('crops'),
      load('recipes'),
      load('upgrades'),
      load('levels'),
      load('config'),
      load('milestones'),
      load('npcs'),
      load('orders'),
      load('stories'),
    ]);
    return {
      crops: crops.crops,
      recipes: recipes.recipes,
      fallbackRecipeId: recipes.fallbackRecipeId,
      upgrades: upgrades.upgrades,
      levels: levels.levels,
      config,
      milestones: milestones.milestones,
      npcs: npcs.npcs,
      orders: orders.orders,
      stories: stories.stories,
      prologue: stories.prologue,
    };
  }

  private readSave(): SaveData | undefined {
    // 清掉历史存档 key（v1/v2 已确认废弃，不再保留回退）
    sys.localStorage.removeItem('newgame_save_v1');
    sys.localStorage.removeItem('newgame_save_v2');
    const raw = sys.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  }

  private writeSave() {
    sys.localStorage.setItem(SAVE_KEY, JSON.stringify(this.game!.getSave()));
  }
}
