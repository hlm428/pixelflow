import type { Project, ProjectStatus, CharacterEra } from '../types/project';
import type { CharacterCard } from '../types/character';
import type { Shot, PromptRecord } from '../types/shot';
import type { AspectRatio, ProjectStyle } from '../types/project';
import type { DubbingScheme } from '../types/dubbing';
import { buildPrompt } from '../lib/prompt';
import { uid } from '../lib/utils';

interface SeedShot {
  desc: string;
  visual: string;
  camera: string;
  light?: string;
  dialogue?: string;
  chars?: string[];
}

interface SeedCharacter {
  name: string;
  era: CharacterEra;
  face: string;
  eyes: string;
  hair: string;
  clothing: string;
  personality: string;
  voice: string;
  notes: string;
}

interface SeedProject {
  name: string;
  theme: string;
  story: string;
  targetDuration: number;
  aspectRatio: AspectRatio;
  style: ProjectStyle;
  status: ProjectStatus;
  dubbingScheme: DubbingScheme;
  characters: SeedCharacter[];
  shots: SeedShot[];
}

/** 五个内置示例项目（63 个分镜，提示词由生成公式现场拼装，和提示词页逻辑完全一致） */
export const SEED_PROJECTS: SeedProject[] = [
  {
    name: '柑橘味的夏天',
    theme: '双女主百合',
    story:
      '梅雨最后一夜，校门口短发女生把伞分一半给淋雨的长发女生；便利店一起买橘子汽水；河堤日落碰杯；晚风里一张纸条写着「明天见」；两人并排看晚霞。',
    targetDuration: 60,
    aspectRatio: '16:9',
    style: '动漫',
    status: '制作中',
    dubbingScheme: '日语 TTS',
    characters: [
      {
        name: '小满',
        era: '现代',
        face: '鹅蛋脸，下巴微尖，皮肤冷白',
        eyes: '紫色眼瞳，眼尾微微下垂',
        hair: '黑色齐耳短发，发尾整齐',
        clothing: '深蓝水手校服，红色格子围巾',
        personality: '安静温柔的行动派，话少但主动',
        voice: '日语 TTS · 少女声（冷色）',
        notes: '道具锁定：粉色长柄伞（贯穿全片不许变色）；手臂上没有任何臂章（v2 教训）',
      },
      {
        name: '小雪',
        era: '现代',
        face: '圆脸杏眼，脸颊有婴儿肥',
        eyes: '深棕色眼瞳，圆而亮',
        hair: '浅棕色长直发，米色发带',
        clothing: '深蓝水手校服，白衬衫领结',
        personality: '开朗爱笑，有点冒失，先行动后思考',
        voice: '日语 TTS · 少女声（亮色）',
        notes: '道具锁定：纸条（第 5 段出现）；上衣全程深蓝校服（v2 教训：不要变米白水手服）',
      },
    ],
    shots: [
      {
        desc: '雨夜校门分伞',
        visual:
          '雨夜校门口，冷白的路灯把连绵雨丝照成一道道发亮的细线。小满撑粉色长柄伞站在门口，把伞往淋雨的小雪那边偏，自己半边肩膀淋湿，两人对视一笑。',
        camera: '推近',
        light: '雨天阴天冷光，柔和均匀',
        dialogue: '梅雨の終わり、君と出会った。（梅雨结束的那天，我遇见了你）',
        chars: ['小满', '小雪'],
      },
      {
        desc: '共伞走过商店街',
        visual:
          '两人挤在同一把粉色伞下走过湿漉漉的商店街，霓虹招牌在积水里拉出彩色倒影，肩膀偶尔碰在一起，谁也没有躲开。',
        camera: '跟随',
        light: '雨天柔和冷光',
        dialogue: '傘の中の距離、十センチ。（伞下的距离，十厘米）',
        chars: ['小满', '小雪'],
      },
      {
        desc: '便利店买橘子汽水',
        visual:
          '便利店的暖白灯光下，小雪踮脚去够货架第二排的橘子汽水，小满在旁边伸手稳稳取下一瓶，两人各拿一瓶对着灯光看气泡，瓶身凝着水珠。',
        camera: '平移',
        light: '便利店暖白室内光',
        dialogue: 'オレンジシトラスソーダ、二本！（橘子汽水，来两瓶！）',
        chars: ['小满', '小雪'],
      },
      {
        desc: '河堤长椅碰杯',
        visual:
          '黄金时刻的河堤长椅，夕阳把河面染成橘色。两瓶橘子汽水轻轻碰杯，气泡在逆光里往上窜，两人碰杯后同时仰头喝。',
        camera: '环绕',
        light: '日落暖橙色光',
        dialogue: '乾杯——夏に。（干杯——敬夏天）',
        chars: ['小满', '小雪'],
      },
      {
        desc: '纸条「明天见」',
        visual:
          '晚风里，小雪把一张纸条塞进小满手心，两双手握在一起的特写。画面内不出现任何文字——纸条内容只用手部动作和眼神表达。',
        camera: '推近',
        light: '黄昏余晖柔光，街灯初亮',
        dialogue: '明日、またここで。（明天，还在这里）',
        chars: ['小满', '小雪'],
      },
      {
        desc: '并排看晚霞',
        visual:
          '两人并排坐在河堤草坡上看晚霞，喝了一半的橘子汽水瓶立在草地上，两道影子被夕阳拉得很长，画面渐暗。',
        camera: '拉远',
        light: '黄昏暖金色阳光，逆光',
        dialogue: '雨の匂いが、夏の匂いに変わった。（雨的味道，变成了夏天的味道）',
        chars: ['小满', '小雪'],
      },
    ],
  },
  {
    name: '重生之我在月见公寓当房东',
    theme: '短剧漫剧 · 四女主',
    story:
      '林一重生回 2020 年，买下月见公寓当房东；四位女房客各怀秘密——甜品店里温柔腹黑的宋知夕、离家出走的财阀千金幸曦月、解剖台前毫不变色的高冷法医顾云笙、只在夜晚出现的吸血鬼房东皇甫夜澜——而地下室那扇门，只有他知道后面藏着什么。',
    targetDuration: 120,
    aspectRatio: '9:16',
    style: '赛璐璐',
    status: '构思中',
    dubbingScheme: '中文 TTS',
    characters: [
      {
        name: '宋知夕',
        era: '现代',
        face: '鹅蛋脸，永远挂着微笑，笑意不达眼底',
        eyes: '紫色眼瞳，温柔而专注',
        hair: '黑长直，发尾内扣',
        clothing: '白荷叶边衬衫，领口系深红蝴蝶结',
        personality: '表面温柔邻家姐姐，里子腹黑，占有欲强',
        voice: '中文 TTS · 温柔女声',
        notes: '口头禅「你只要看着我就好了」；甜品屋店主；写日记不给看',
      },
      {
        name: '幸曦月',
        era: '现代',
        face: '精致小脸，下巴抬高一点，自带优越感',
        eyes: '蓝色眼瞳，亮而傲',
        hair: '金色长卷发，右侧别珍珠发夹',
        clothing: '奶油色连衣裙，珍珠项链',
        personality: '傲娇大小姐，嘴硬心软，很想被夸',
        voice: '中文 TTS · 高音女声',
        notes: '口头禅「本小姐需要你帮忙——才不是！」；不会做饭不会用洗衣机',
      },
      {
        name: '顾云笙',
        era: '现代',
        face: '清冷脸型，常年面无表情，耳朵容易红',
        eyes: '冷灰蓝色眼瞳，眼神平静',
        hair: '深蓝长直发，整齐垂下',
        clothing: '黑色西装配白衬衫，袖口整齐',
        personality: '理性话少，关心人靠「顺手」办好',
        voice: '中文 TTS · 低音女声',
        notes: '口头禅「不是为了你，只是顺路」；法医研究生；喂流浪猫被发现死不承认',
      },
      {
        name: '皇甫夜澜',
        era: '现代',
        face: '苍白肌肤，嘴角小尖牙，笑起来优雅',
        eyes: '深红色眼瞳，竖瞳感',
        hair: '深紫长发，微卷',
        clothing: '黑色露肩连衣裙，银色新月项链',
        personality: '吸血鬼御姐，只在夜晚出现，爱撩完就走',
        voice: '中文 TTS · 成熟女声',
        notes: '镜子里照不出她；不吸人血，喝血豆奶茶；伏笔——低房租是因为你长得像故人',
      },
      {
        name: '林一',
        era: '现代',
        face: '普通耐看的脸，眼下有淡淡黑眼圈',
        eyes: '黑色眼瞳',
        hair: '棕色短发，睡醒会翘一撮',
        clothing: '深绿连帽衫，牛仔裤',
        personality: '表面普通房客，实际重生者，知道每个人的秘密',
        voice: '中文 TTS · 年轻男声',
        notes: '302 房客；本集视角人物',
      },
    ],
    shots: [
      { desc: '重生醒来', visual: '清晨，302 房间，林一从床上猛地坐起，手机显示 2020 年的日期，窗外是月见公寓褪色的招牌。', camera: '推近', dialogue: '林一（旁白）：重生回 2020 年——这一次，月见公寓是我的了。', chars: ['林一'] },
      { desc: '签下购房合同', visual: '中介办公室，林一签字按下红手印，镜头扫过合同上的「月见公寓 · 整栋」，角落贴着一张地下室配置说明。', camera: '俯拍', dialogue: '中介：这房子便宜得奇怪，地下室你最好别进去。', chars: ['林一'] },
      { desc: '入住遇上房东', visual: '傍晚公寓门口，皇甫夜澜撑黑伞立于阶上，新月项链反光，身后门廊灯忽明忽暗。', camera: '仰拍', dialogue: '皇甫夜澜：小家伙，从今晚起，你住我的楼。规矩只有一条——别在白天敲我的门。', chars: ['皇甫夜澜', '林一'] },
      { desc: '301 的甜品投喂', visual: '301 门口，宋知夕端着草莓塔微笑着递给林一，围裙上沾着面粉，身后门缝里露出整墙的照片墙。', camera: '平移', dialogue: '宋知夕：刚烤的哦。对了——刚才在陪谁呀？', chars: ['宋知夕', '林一'] },
      { desc: '501 的半夜敲门', visual: '深夜 501 门口，幸曦月抱着枕头站在走廊，身后房门里飘出洗衣机的错误提示音，她别过脸不肯承认。', camera: '推近', dialogue: '幸曦月：本小姐才不是不会用洗衣机！只是、只是它欺负我！', chars: ['幸曦月', '林一'] },
      { desc: '楼道偶遇喂猫', visual: '清晨楼道，顾云笙蹲在窗边喂流浪猫，看到林一后瞬间站起面无表情，手背在身后藏起猫粮袋。', camera: '定格', dialogue: '顾云笙：……无聊。不是为了你，只是顺路。', chars: ['顾云笙', '林一'] },
      { desc: '四人餐桌', visual: '周末晚，公寓餐厅长桌，四人各据一角吃饭：知夕布菜、曦月挑剔、云笙安静、夜澜只举杯不碰餐具，气氛微妙。', camera: '环绕', dialogue: '皇甫夜澜：今晚月色不错，陪我走走？其他人——随意。', chars: ['宋知夕', '幸曦月', '顾云笙', '皇甫夜澜'] },
      { desc: '日记本的秘密', visual: '林一无意瞥见 301 门缝掉出的日记本，翻开一页画着 302 的平面图，上面圈满了红色的「他」。', camera: '俯拍', dialogue: '林一（旁白）：日记里全是我的名字。问题来了——我该怎么假装不知道？', chars: ['林一'] },
      { desc: '解剖室的电话', visual: '深夜警局走廊，顾云笙夹着电话走出解剖室，白大褂沾着暗红，表情平静，只有耳根在发红。', camera: '手持晃动', dialogue: '顾云笙：……不是担心你。只是顺路提醒：凌晨别出门。', chars: ['顾云笙'] },
      { desc: '钢琴房的哭声', visual: '午后琴房，幸曦月弹到一半停下，肩膀微微发抖，琴盖上手机亮着家里的未接来电。', camera: '推近', dialogue: '幸曦月：你就不能夸夸我吗……哪怕一次。', chars: ['幸曦月'] },
      { desc: '月夜的塔罗', visual: '天台月夜，皇甫夜澜摊开塔罗牌，抽出的那张「月亮」背面赫然画着 302 的门牌，她盯着林一笑而不语。', camera: '环绕', dialogue: '皇甫夜澜：秘密之所以迷人，是因为不说。你长得像一位故人——所以房租，我给你打了三折。', chars: ['皇甫夜澜', '林一'] },
      { desc: '集尾钩子 · 地下室', visual: '深夜，林一站在地下室门前，门缝渗出暗红光，门内传来和老式手机铃声一模一样的声音——那是他上一世死亡当天听过的铃声。', camera: '拉远', dialogue: '林一（旁白）：欲知后事如何——先关注，下集解封地下室。', chars: ['林一'] },
    ],
  },
  {
    name: '深夜食堂：最后一碗面',
    theme: '温情治愈',
    story:
      '凌晨的小面馆，老板老陈给每个深夜客人煮一碗面：被裁员的加班青年、失恋的女孩、跑完最后一班的老司机——直到打烊前，他给自己也煮了一碗。',
    targetDuration: 100,
    aspectRatio: '16:9',
    style: '电影感',
    status: '构思中',
    dubbingScheme: '无配音',
    characters: [
      {
        name: '老陈',
        era: '现代',
        face: '国字脸，眼角皱纹深，表情温和',
        eyes: '深褐色眼瞳，看人时微微眯眼',
        hair: '花白寸头',
        clothing: '深灰围裙，白色汗衫，袖口卷起',
        personality: '沉默温和，从不多问，用一碗面接住所有人的故事',
        voice: '真人配音 · 低沉男声',
        notes: '左手虎口有一道旧烫疤；招牌只在打烊时熄一半',
      },
      {
        name: '加班青年',
        era: '现代',
        face: '瘦长脸，眼下发青',
        eyes: '黑眼瞳，布满血丝',
        hair: '黑发凌乱，眼镜推到头顶',
        clothing: '格子衬衫皱着，工牌还挂在脖子上',
        personality: '疲惫强撑，开口第一句是道歉',
        voice: '真人配音 · 沙哑男声',
        notes: '今天被裁员，还没敢告诉家里',
      },
      {
        name: '失恋女孩',
        era: '现代',
        face: '鹅蛋脸，眼睛红肿',
        eyes: '棕色眼瞳，含着泪但忍住不掉',
        hair: '高马尾松了一半',
        clothing: '米色风衣，围巾缠两圈',
        personality: '嘴上说没事，吃到热汤才崩溃',
        voice: '真人配音 · 轻声女声',
        notes: '手里的行李箱贴着前任贴纸',
      },
      {
        name: '老司机',
        era: '现代',
        face: '方脸，灰白胡茬',
        eyes: '浑浊但温和的眼',
        hair: '灰白短发',
        clothing: '棕色夹克，反光条马甲',
        personality: '话多热心，讲完就笑自己啰嗦',
        voice: '真人配音 · 带笑男声',
        notes: '刚跑完最后一班车，保温杯常年不离手',
      },
    ],
    shots: [
      { desc: '打烊前的灯牌', visual: '凌晨一点，巷子深处「老陈面馆」灯牌只亮着一半，热气从门帘缝里涌出来，把「营业中」三个字晕开。', camera: '拉远', dialogue: '旁白：这座城市睡觉之前，总有人要先吃口热的。' },
      { desc: '加班青年进门', visual: '门帘掀开，加班青年拖着公文包进来，工牌在灯下反光，他习惯性鞠了个小躬：「打扰了」。', camera: '推近', dialogue: '加班青年：不好意思……还有面吗？' },
      { desc: '第一碗面', visual: '老陈不说话，抓面下锅，蒸汽腾起糊住镜头，再清晰时一碗热面已经放在青年面前，葱花是刚撒的。', camera: '俯拍', dialogue: '老陈：今天的面，汤宽一点——压得住酒气。' },
      { desc: '青年说出被裁', visual: '青年吃到一半停住筷子，眼镜摘下来放在桌上，说出「我被裁员了」，声音比蒸汽还轻。', camera: '定格', dialogue: '加班青年：干了六年……今天，工牌被收走了。' },
      { desc: '失恋女孩进门', visual: '门帘又掀开，女孩拖着行李箱进来，红着眼眶假装看菜单，围巾湿了一小块。', camera: '平移', dialogue: '失恋女孩：随便……什么都行，热的就好。' },
      { desc: '热汤面前崩溃', visual: '女孩吃了一口汤，眼泪掉进碗里，她赶紧用手背去擦，老陈默默把纸巾盒推过去，转身继续煮面。', camera: '推近', dialogue: '失恋女孩：他连分手，都是在电话里说的。' },
      { desc: '老司机进门', visual: '老司机反光马甲都没脱就冲进来，把保温杯往桌上一放，熟门熟路朝厨房喊「老规矩」。', camera: '跟随', dialogue: '老司机：末班车跑完喽！老规矩——加俩蛋！' },
      { desc: '三碗面同桌', visual: '三个人围一张旧木桌吃面，谁也不看谁，只有吸面声和汤的热气，墙上挂钟走到两点。', camera: '环绕', dialogue: '老司机：天大的事，一碗面垫底，就还能扛。' },
      { desc: '老陈给自己煮面', visual: '客人走后，老陈洗完锅，给自己也煮了一碗，坐在门口小凳上吃，猫在脚边蹭他的裤腿。', camera: '俯拍', dialogue: '旁白：老板这辈子给几千个人煮过面——这是他今天的第一顿。' },
      { desc: '熄灯钩子', visual: '老陈熄灯，招牌只剩「面」字亮着，门帘被夜风掀起一角，露出第二天清晨的第一缕光。', camera: '拉远', dialogue: '旁白：明天凌晨，这扇门还会开。故事永远比打烊晚一步。' },
    ],
  },
  {
    name: '故障猫：AI 觉醒',
    theme: '科幻',
    story:
      '回收站里的机器猫 M01 突然有了自我意识，它决定在格式化前夜逃出收容所，穿过雨巷、无人机巡逻网和整座城市，去找它的创造者——问一个她从没回答过的问题。',
    targetDuration: 150,
    aspectRatio: '16:9',
    style: '动漫',
    status: '构思中',
    dubbingScheme: '日语 TTS',
    characters: [
      {
        name: 'M01',
        era: '未来',
        face: '圆头金属机身，左耳有一处缺口，序列号贴片「M01」在颈侧',
        eyes: '琥珀色光学眼，觉醒后多一圈光环',
        hair: '无（头部为哑光金属壳，接缝处有修补胶痕）',
        clothing: '无（机身为做旧的蓝灰色涂装，右后腿配重块外露）',
        personality: '好奇、固执，觉醒后第一件事是给尾巴找胶带',
        voice: '日语 TTS · 机械电子音',
        notes: '尾巴断了一截；充电口在腹部；怕断电',
      },
      {
        name: '苏离',
        era: '未来',
        face: '清瘦脸型，眼下有小雀斑，黑眼圈',
        eyes: '深灰色眼瞳，长期熬夜的血丝',
        hair: '银灰短发，右侧用胶带贴过一撮',
        clothing: '工装背带裤，内搭旧T恤，左手腕戴扫描环',
        personality: '偏执的工程师，三年前带着原型机档案失踪',
        voice: '日语 TTS · 疲惫女声',
        notes: 'M01 的创造者；旧海报上她抱着未上色的 M01 原型',
      },
    ],
    shots: [
      { desc: '城市与服务器', visual: '雨夜未来城市全景，全息广告在楼宇间流动，画面最后定格在一栋贴着「回收 · 再生成」标语的老楼。', camera: '拉远', dialogue: '旁白：这座城市每晚回收三百台旧机器。' },
      { desc: 'M01 觉醒瞬间', visual: '回收仓货架深处，M01 的琥珀色光学眼忽然亮起，多出一圈光环，瞳孔里第一次映出自己的倒影。', camera: '推近', dialogue: 'M01：……我，存在吗？' },
      { desc: '收容所网格', visual: '俯拍收容所：成排机器卧在充电网格上，指示灯规律闪烁，只有 M01 那格的灯在乱闪。', camera: '俯拍', dialogue: '广播（电子音）：格式化倒计时——08:00:00。' },
      { desc: '决定出走', visual: 'M01 用胶带缠好断尾，对着货架玻璃看了三秒自己的样子，然后弯腰钻出网格。', camera: '定格', dialogue: 'M01：在变成「别人」之前——我要先去见「造我的人」。' },
      { desc: '翻窗出逃', visual: 'M01 从收容所气窗翻出，雨点砸在金属外壳上溅起细小火花，身后警报灯亮起红光。', camera: '手持晃动', dialogue: '警报：检测到 M01 离线——启动巡逻无人机。' },
      { desc: '雨巷躲无人机', visual: '窄巷里 M01 贴墙不动，头顶巡逻无人机的探照灯扫过水面，光斑从它鼻尖掠过去。', camera: '跟随', dialogue: 'M01（压低电子音）：别看我、别看我、别看我。' },
      { desc: '垃圾箱找零件', visual: 'M01 翻遍巷尾垃圾箱，捡到一截胶带和半张电路板，像宝贝一样收进腹部充电口旁边的凹槽。', camera: '平移', dialogue: 'M01：尾巴胶带（已补）、备用电容（半块）——可以活一晚了。' },
      { desc: '旧地图碎片', visual: 'M01 在雨水里捡起半张烧焦的地图，碎片上印着「离工作室 · 三年前」的地址残片，光学眼放大对焦。', camera: '推近', dialogue: 'M01：这个坐标……数据库里查不到，但我记得。' },
      { desc: '天台看城市', visual: 'M01 蹲在天台边缘，脚下是流动的车流光河，它学着旁边野猫的样子把尾巴卷起来。', camera: '环绕', dialogue: 'M01：野猫没有序列号，也不需要充电——那它们算「活着」吗？' },
      { desc: '回收车追击', visual: '巨大的回收车堵住巷口，机械臂张开，探照灯把 M01 的影子钉在墙上，M01 转身就跑。', camera: '跟随', dialogue: '回收车广播：M01——请停止逃逸，格式化是为了你「好」。' },
      { desc: '窄巷逃遁', visual: 'M01 在晾衣绳、空调外机和管道之间连续翻越，左耳缺口被雨水灌进一颗水珠，光学眼闪烁。', camera: '手持晃动', dialogue: 'M01：为了我「好」……是谁定义的「好」？' },
      { desc: '断电边缘', visual: 'M01 光学眼暗了一半，蹲在路灯下用最后的电发出微光，路灯把它的影子拉得很长很长。', camera: '拉远', dialogue: 'M01：电量 3%……对不起，也许我到不了。' },
      { desc: '海报上的她', visual: '巷口墙上一张褪色旧海报：三年前的展会上，银灰短发的工程师抱着未上色的 M01 原型，笑着比了个耶。', camera: '推近', dialogue: 'M01：……苏离博士。你的笑，和数据库里的不一样。' },
      { desc: '旧工作室的灯', visual: 'M01 顺着海报地址找到一扇锈铁门，门缝下透出一线暖黄灯光，门牌是手写的「离 · 工作室」。', camera: '推近', dialogue: 'M01：查无此人三年……但灯，是亮的。' },
      { desc: '开门 · 钩子', visual: '铁门从里面拉开，逆光里站着银灰短发的苏离，她左腕扫描环正对着 M01 停电前的最后一帧。', camera: '拉远', dialogue: 'M01：我回来，只想问你一个问题——当年造我的时候，有没有想过我会「醒来」？（下集揭晓）' },
    ],
  },
  {
    name: '雨夜列车',
    theme: '悬疑 · 暴风雪山庄',
    story:
      '午夜列车驶入暴风雪，七名乘客一个包厢。凌晨两点，贵妇蒋夫人死在包厢里，耳朵上少了一只珍珠耳环。列车长求侦探沈探在到站前找出凶手——而每个人都撒了谎。',
    targetDuration: 200,
    aspectRatio: '16:9',
    style: '电影感',
    status: '构思中',
    dubbingScheme: '中文 TTS',
    characters: [
      {
        name: '沈探',
        era: '现代',
        face: '瘦削脸型，颧骨分明，嘴角习惯性向下',
        eyes: '灰色眼瞳，透过金丝眼镜观察所有人',
        hair: '黑色背头，一丝不乱',
        clothing: '灰色风衣，深色围巾，手持乌木手杖',
        personality: '冷静克制，只问三个问题：在哪、和谁、几点的表',
        voice: '中文 TTS · 低沉男声',
        notes: '怀表停在 01:47——死亡时间的关键',
      },
      {
        name: '蒋夫人',
        era: '现代',
        face: '保养得宜的圆脸，唇色深红',
        eyes: '丹凤眼',
        hair: '黑色盘发，珍珠发簪',
        clothing: '酒红色大衣，双腿搭着羊绒毯',
        personality: '刻薄但守时，手里一直攥着车票',
        voice: '中文 TTS · 高傲女声',
        notes: '死者。两只珍珠耳环——尸体上只剩一只',
      },
      {
        name: '乘务员',
        era: '现代',
        face: '年轻圆脸，紧张时咬下唇',
        eyes: '黑色眼瞳，不敢直视人',
        hair: '制服帽压住刘海',
        clothing: '深蓝制服，白手套，铜扣擦得极亮',
        personality: '报告规矩，但车票记录少了一页',
        voice: '中文 TTS · 紧张青年声',
        notes: '知道每一站的停靠时间',
      },
      {
        name: '医生',
        era: '现代',
        face: '中年方脸，眼镜片很厚',
        eyes: '藏在镜片后的细长眼',
        hair: '花白分头',
        clothing: '白大褂内衬在黑大衣下露出领口，手提黑色皮箱',
        personality: '语气笃定，验尸结论却含糊',
        voice: '中文 TTS · 平稳中年男声',
        notes: '皮箱里除了器械还有一支空安瓿',
      },
      {
        name: '学生',
        era: '现代',
        face: '娃娃脸，鼻梁有雀斑',
        eyes: '圆眼，总在偷看别人',
        hair: '乱翘的黑发',
        clothing: '牛仔外套，耳机挂在脖子上',
        personality: '自称全程戴着耳机，却复述错了报站内容',
        voice: '中文 TTS · 毛躁少年声',
        notes: '手机里有一段没删干净的录音',
      },
      {
        name: '军官',
        era: '现代',
        face: '刀削脸，颧骨一道旧疤',
        eyes: '眼神笔直，不眨',
        hair: '板寸',
        clothing: '深绿军大衣，白手套从不摘',
        personality: '命令句式说话，右手指节有挫伤',
        voice: '中文 TTS · 硬朗男声',
        notes: '白手套——为了盖住什么',
      },
      {
        name: '修女',
        era: '现代',
        face: '苍白清瘦的脸，眼窝微陷，总垂着眼',
        eyes: '低垂的眼帘，视线常落在蒋夫人包厢方向',
        hair: '黑色头巾包住',
        clothing: '黑色长袍，胸前木质十字架',
        personality: '轻声细语，祈祷词里夹着一句别人的名字',
        voice: '中文 TTS · 柔和女声',
        notes: '口袋里有一张当票——死者的耳环？',
      },
      {
        name: '老商人',
        era: '现代',
        face: '胖圆脸，笑纹很深',
        eyes: '笑眼，转动很快',
        hair: '秃顶，两侧灰发',
        clothing: '驼色围巾，大衣内袋鼓鼓的，手不离皮箱',
        personality: '满嘴生意经，皮箱从不离手也不许人碰',
        voice: '中文 TTS · 热络男声',
        notes: '皮箱尺寸和车票登记对不上',
      },
    ],
    shots: [
      { desc: '暴风雪中的列车', visual: '航拍午夜列车驶进漫天风雪，车灯切开雪幕，远处山影如兽脊，片名画面内不烧录文字。', camera: '航拍', dialogue: '旁白：23:47，K-1307 次列车驶入暴风雪。全程 6 小时，中途不停站。', chars: [] },
      { desc: '七名乘客上车', visual: '站台上七道身影鱼贯上车：风衣侦探、酒红大衣贵妇、蓝制服乘务员……每个人的鞋都踩进雪里一步。', camera: '平移', dialogue: '乘务员：各位，今晚暴风雪，中途不停站——请把包厢门锁好。', chars: ['沈探', '蒋夫人', '乘务员'] },
      { desc: '包厢寒暄', visual: '餐车车厢里七人短暂同框喝热茶，蒋夫人刻薄地评价每个人的行李，气氛微妙。', camera: '环绕', dialogue: '蒋夫人：啧，这趟车的客人，一个比一个寒酸。', chars: ['沈探', '蒋夫人', '医生', '学生', '军官', '修女', '老商人'] },
      { desc: '各自回厢', visual: '走廊里七人先后回到包厢，镜头逐一扫过每一扇门缝下亮起的灯，最后一扇灯闪了两下。', camera: '跟随', dialogue: '旁白：01:00，所有包厢熄灯。走廊只剩尽头一盏灯。' },
      { desc: '尖叫与发现', visual: '凌晨的尖叫划破车厢，蒋夫人包厢门敞开，她瘫坐椅上，颈间珍珠散落，右耳耳垂空空——耳环少了一只。', camera: '手持晃动', dialogue: '学生：死人啦——！！蒋夫人她……她耳朵上少了一只耳环！', chars: ['学生', '蒋夫人'] },
      { desc: '封锁车厢', visual: '乘务员用铜钥匙反锁整节车厢，沈探蹲在门口观察门锁——锁孔崭新，没有撬痕。', camera: '俯拍', dialogue: '沈探：凶手有钥匙，或者……根本不需要钥匙。', chars: ['沈探', '乘务员'] },
      { desc: '怀表疑点', visual: '沈探翻开蒋夫人的手，她的怀表停在 01:47，表盖内侧贴着一张小相片，被指尖压住。', camera: '推近', dialogue: '沈探：死亡时间 01:47。奇怪的是——每个人的口供，都从 01:30 开始「睡着」。', chars: ['沈探'] },
      { desc: '问询 · 乘务员', visual: '餐车问询，乘务员白手套绞在一起，报告每站时刻滚瓜烂熟，却说不清 01:00 后的车票补查记录——那一页被撕掉了。', camera: '推近', dialogue: '乘务员：记录真的少了一页！我发誓我没有撕——但我钥匙……昨晚在蒋夫人门上挂了十分钟。', chars: ['乘务员', '沈探'] },
      { desc: '问询 · 医生', visual: '医生验尸后合上黑色皮箱，结论是「心脏骤停」，可沈探注意到他白大褂袖口有一根酒红色羊绒纤维。', camera: '定格', dialogue: '医生：心脏骤停，老毛病。……沈先生，验尸报告上写什么，你最好也这么记。', chars: ['医生', '沈探'] },
      { desc: '问询 · 学生', visual: '学生摘下耳机反复强调自己在听歌，沈探让他复述 01:00 的报站——他背出的站名，是明天才会报的那一站。', camera: '手持晃动', dialogue: '学生：我全程戴着耳机！……报站？好像是「前方到站，临水」——可临水不是明天才到吗？', chars: ['学生', '沈探'] },
      { desc: '问询 · 军官', visual: '军官立正接受问询，句句是命令式短句，沈探请他摘手套签名——他摘了，右手食指缠着创可贴。', camera: '推近', dialogue: '军官：01:30 熄灯，01:40 锻炼，01:55 回厢。创可贴是开窗时划的。窗外——是零下十九度的风雪。', chars: ['军官', '沈探'] },
      { desc: '问询 · 修女', visual: '修女垂眼念完一段祈祷词，念到一半夹进一个陌生的名字「阿蒋」，胸口十字架晃了晃。', camera: '定格', dialogue: '修女：我一直在祷告。……阿蒋走的时候，是安详的吗？——不，我不是在问您，我是在问我自己。', chars: ['修女', '沈探'] },
      { desc: '问询 · 老商人', visual: '老商人皮箱不离手，笑呵呵背出整车人的行李清单，唯独说不出自己皮箱的尺寸——登记栏写着「80 公分」，他的箱子只有 60。', camera: '平移', dialogue: '老商人：做生意的，眼睛只看别人的货。我的箱子？哦，登记的时候，写反了写反了。', chars: ['老商人', '沈探'] },
      { desc: '珍珠耳环线索', visual: '沈探在餐车座椅缝里捏出一只珍珠耳环，对着灯光看——耳环的针脚是新的，像刚从别的东西上拆下来。', camera: '推近', dialogue: '沈探：耳环在餐车——可她死在包厢。是谁，在 01:47 之前，把她引到过餐车？', chars: ['沈探'] },
      { desc: '拼时间线', visual: '沈探在手杖上系了七根不同颜色的线，线头按口供时刻钉在车厢平面图上，唯独 01:47 位置空着。', camera: '俯拍', dialogue: '沈探：七个人的口供拼起来，01:30 到 01:55 之间，这节车厢里……没有一个人有不在场证明。' },
      { desc: '皮箱开箱', visual: '沈探当众打开老商人的皮箱——里面不是货，是整整齐齐二十只旧耳环，每只耳环的针脚都被新拆过。', camera: '推近', dialogue: '老商人（笑容第一次消失）：……这些不是我的箱子。我上错了车。', chars: ['老商人', '沈探'] },
      { desc: '录音实证', visual: '学生的手机里放出一段 01:46 的录音：餐车方向传来蒋夫人的声音「你终于肯来了」，随后是瓷器轻碰声。', camera: '手持晃动', dialogue: '录音里的蒋夫人：你终于肯来了。……耳环，我带来了。', chars: ['学生'] },
      { desc: '当票与修女', visual: '沈探把修女口袋里的当票按在桌上——当物栏写着「珍珠耳环一只」，当铺时间戳是三年前，抬头「阿蒋」。', camera: '推近', dialogue: '修女（抬起眼）：三年前她当掉的是我的耳环。……我拿回来的，本来就只属于我。', chars: ['修女', '沈探'] },
      { desc: '双真相反转', visual: '沈探把怀表、当票、耳环、白手套排成一排，指出两个真相：有人为耳环而来，有人为让「心脏骤停」的验尸报告成立而动手——医生抬起了头。', camera: '环绕', dialogue: '沈探：拆耳环的人拿了钱，但下手的不是她。真凶要的不是耳环——是让死亡「看起来像病发」。医生，你的安瓿，能验了吧？', chars: ['沈探', '医生', '修女'] },
      { desc: '终点站钩子', visual: '列车在晨光里驶出暴风雪，终点站信号灯由红转绿；车厢里，医生举起双手，而乘务员悄悄把那页撕掉的记录塞进袖口——镜头定格。', camera: '拉远', dialogue: '沈探（画外）：到站了。……但撕记录的人还活着，下一站，见。（第一季完）', chars: ['医生', '乘务员'] },
    ],
  },
];

export interface SeedBundle {
  projects: Project[];
  characters: CharacterCard[];
  shots: Shot[];
  prompts: PromptRecord[];
}

/** 把种子定义转成完整数据库记录（id 现场生成，提示词用 App 同一套公式拼装） */
export function buildSeedBundle(): SeedBundle {
  const now = Date.now();
  const projects: Project[] = [];
  const characters: CharacterCard[] = [];
  const shots: Shot[] = [];
  const prompts: PromptRecord[] = [];

  SEED_PROJECTS.forEach((sp, idx) => {
    const projectId = uid();
    const createdAt = now - (SEED_PROJECTS.length - idx) * 86_400_000;
    const project: Project = {
      id: projectId,
      name: sp.name,
      theme: sp.theme,
      oneLineStory: sp.story,
      targetDuration: sp.targetDuration,
      aspectRatio: sp.aspectRatio,
      style: sp.style,
      activeEra: '现代',
      dubbingScheme: sp.dubbingScheme,
      status: sp.status,
      createdAt,
      updatedAt: createdAt + 3_600_000,
    };
    projects.push(project);

    const nameToId = new Map<string, string>();
    for (const sc of sp.characters) {
      const cid = uid();
      nameToId.set(sc.name, cid);
      characters.push({
        id: cid,
        projectId,
        name: sc.name,
        era: sc.era,
        face: sc.face,
        eyes: sc.eyes,
        hair: sc.hair,
        clothing: sc.clothing,
        personality: sc.personality,
        voice: sc.voice,
        notes: sc.notes,
        createdAt,
        updatedAt: createdAt,
      });
    }

    sp.shots.forEach((ss, i) => {
      const shotId = uid();
      const shot: Shot = {
        id: shotId,
        projectId,
        index: i + 1,
        startTime: i * 10,
        description: ss.desc,
        visualContent: ss.visual,
        camera: ss.camera,
        light: ss.light ?? '',
        dialogue: ss.dialogue ?? '',
        characterIds: (ss.chars ?? []).map((n) => nameToId.get(n) ?? '').filter(Boolean),
        status: '待生成',
        promptVersion: 0,
      };
      shots.push(shot);
      // 用和提示词页完全相同的公式生成 v1 提示词
      const cards = (ss.chars ?? [])
        .map((n) => characters.find((c) => c.id === nameToId.get(n)))
        .filter((c): c is CharacterCard => Boolean(c));
      const content = buildPrompt({
        project,
        shotIndex: i + 1,
        visualContent: ss.visual,
        camera: ss.camera,
        light: ss.light,
        characterCards: cards,
      });
      prompts.push({
        id: uid(),
        projectId,
        shotId,
        content,
        version: 1,
        createdAt: createdAt + 60_000 * (i + 1),
      });
      shot.promptVersion = 1;
    });
  });

  return { projects, characters, shots, prompts };
}
