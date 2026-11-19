export type MissionType = 'rescue' | 'fire' | 'police' | 'transport';

export interface MissionMeta {
  label: string;
  shortLabel: string;
  color: string;
  icon: string;
  summary: string;
}

export interface HelicopterInfo {
  id: string;
  type: MissionType;
  name: string;
  callsign: string;
  mission: string;
  equipment: string;
  status: string;
  speed: number;
  altitude: number;
}

export const MISSION_META: Record<MissionType, MissionMeta> = {
  rescue: {
    label: '救援直升机',
    shortLabel: '空中救援',
    color: '#f06449',
    icon: 'life-buoy',
    summary: '绳梯救援 · 嫌犯抓捕 · 取水灭火',
  },
  fire: {
    label: '消防直升机',
    shortLabel: '森林消防',
    color: '#ffd166',
    icon: 'flame',
    summary: '吊桶洒水 · 火场侦察',
  },
  police: {
    label: '警务直升机',
    shortLabel: '城市巡逻',
    color: '#65b7ff',
    icon: 'shield-check',
    summary: '空中巡逻 · 探照搜索',
  },
  transport: {
    label: '运输直升机',
    shortLabel: '物资运输',
    color: '#9ed06a',
    icon: 'package',
    summary: '双旋翼 · 吊运物资',
  },
};

export const STARFISH_SPEECH = '我是海星,我被直升飞机救援了';

export const SCENE_SPEECH: Record<string, string> = {
  starfish: STARFISH_SPEECH,
  'police-station': 'Police station. The town\'s police headquarters.',
  'fire-station': 'Fire station. Home of the town\'s fire and rescue team.',
  'police-car': 'Police car. Patrolling the town.',
  'fire-engine': 'Fire engine. Driving between the pond and the fire to refill and spray water.',
  'helipad-summit': 'Mountain helipad. A high-altitude landing platform for rescue helicopters.',
  'helipad-hospital-roof': 'Hospital helipad. A compact rooftop landing pad for emergency rescue.',
  'helipad-central': 'City helipad. A small landing pad for rescue operations.',
  'helipad-waterside': 'Waterside helipad. A large landing pad for water rescue helicopters.',
  'helipad-forest': 'Forest fire helipad. A large landing pad for firefighting helicopters.',
  'helipad-ranger': 'Ranger helipad. A compact forest landing pad.',
  'helipad-city-roof': 'Rooftop helipad. An elevated landing pad above the city.',
  'helipad-police-ground': 'Police helipad. A small landing pad for police helicopters.',
  'helipad-logistics': 'Cargo helipad. A large landing pad for transport helicopters.',
};

export const HELICOPTER_GREETINGS = [
  '小飞行员桉弟,准备起飞啦',
  '桉弟,直升机来陪你玩啦',
  '桉弟,我们一起去看海星',
  '海星说,桉弟真勇敢',
  '桉弟,记得吃饭饭和喝水水',
  '桉弟,你是小小救援家',
  '直升机给桉弟带来快乐',
  '桉弟,和海星一起加油吧',
  '桉弟,我是你的直升机朋友',
  '桉弟,我转动旋翼来看你',
  '桉弟,我的旋翼转呀转',
  '小桉弟,我带你去兜风',
  '桉弟,别怕,我会安全送你回家',
  '桉弟,我是勇敢的救援直升机',
  '桉弟,我最爱和你一起飞行',
  '桉弟,海星也想坐直升机',
  '桉弟,看我把海星救回来啦',
  '桉弟,我会轻轻落在停机坪上',
  '桉弟,为我加油吧',
  '桉弟,你的笑脸让我飞得更高',
  '桉弟,我帮你把快乐运过来啦',
  '桉弟,我再来转一个圈',
  '桉弟,我要带你看蓝蓝的天空',
  '桉弟,我有一双会飞的翅膀',
  '桉弟,听我的旋翼在唱歌',
  '桉弟,我是你的空中守护者',
  '桉弟,我的救援成功啦',
  '桉弟,我好想和你一起玩耍',
] as const;

export function randomHelicopterGreeting(random = Math.random) {
  return HELICOPTER_GREETINGS[Math.floor(random() * HELICOPTER_GREETINGS.length)];
}

export const FLEET: HelicopterInfo[] = [
  { id: 'rescue-01', type: 'rescue', name: '红十字 01', callsign: 'RESCUE 01', mission: '在雪顶山脉放下救援绳梯，接应攀爬中的警务人员。', equipment: '救援绳梯 · 医疗舱 · 山地救援装备', status: '绳梯救援', speed: 0, altitude: 165 },
  { id: 'rescue-02', type: 'rescue', name: '红十字 02', callsign: 'RESCUE 02', mission: '使用抓捕网控制逃跑嫌犯，等待警务人员接应。', equipment: '抓捕网兜 · 吊索 · 搜索摄像', status: '抓捕嫌犯', speed: 0, altitude: 145 },
  { id: 'rescue-03', type: 'rescue', name: '清泉 03', callsign: 'RESCUE 03', mission: '在池塘取水救火，同时用吊桶捞起海星并送回水边停机坪。', equipment: '取水吊桶 · 海星救援舱 · 可伸缩吊索', status: '海星救援', speed: 96, altitude: 180 },
  { id: 'fire-01', type: 'fire', name: '烈焰 01', callsign: 'FIRE 01', mission: '向松果森林火点持续洒水，压制火线蔓延。', equipment: '消防吊桶 · 大容量水箱 · 红外火情探测', status: '洒水作业', speed: 0, altitude: 150 },
  { id: 'fire-02', type: 'fire', name: '烈焰 02', callsign: 'FIRE 02', mission: '在湖泊与火场之间往返，为吊桶补水。', equipment: '可吸水吊桶 · 泡沫混合器 · 外载挂钩', status: '往返补水', speed: 126, altitude: 190 },
  { id: 'police-02', type: 'police', name: '守护者 02', callsign: 'POLICE 02', mission: '在城市与港口区域执行探照搜索。', equipment: '双光搜索灯 · 夜视仪 · 实时图传', status: '探照搜索', speed: 82, altitude: 160 },
  { id: 'transport-01', type: 'transport', name: '大力士 01', callsign: 'CARGO 01', mission: '将建筑物资运往雪顶山脉施工营地。', equipment: '双旋翼系统 · 四点吊索 · 防震货箱', status: '吊运中', speed: 88, altitude: 230 },
];
