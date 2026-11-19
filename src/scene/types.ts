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

export const SCENE_SPEECH: Record<string, string> = {
  'police-station': 'Police station. The town\'s police headquarters.',
  'fire-station': 'Fire station. Home of the town\'s fire and rescue team.',
  'police-car': 'Police car. Patrolling the town.',
  'fire-engine': 'Fire engine. Driving between the pond and the fire to refill and spray water.',
  'rescue-01': 'Rescue helicopter. A police officer is climbing the rescue ladder.',
  'rescue-02': 'Rescue helicopter. Capturing a suspect with a net.',
  'rescue-03': 'Rescue helicopter. Collecting pond water and carrying it to the forest fire.',
  'fire-01': 'Fire helicopter. Dropping water on the forest fire.',
  'fire-02': 'Fire helicopter. Flying between the lake and the fire to refill its water bucket.',
  'police-02': 'Police helicopter. Patrolling the city with a searchlight.',
  'transport-01': 'Transport helicopter. Carrying supplies to the mountains.',
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

export const FLEET: HelicopterInfo[] = [
  { id: 'rescue-01', type: 'rescue', name: '红十字 01', callsign: 'RESCUE 01', mission: '在雪顶山脉放下救援绳梯，接应攀爬中的警务人员。', equipment: '救援绳梯 · 医疗舱 · 山地救援装备', status: '绳梯救援', speed: 0, altitude: 165 },
  { id: 'rescue-02', type: 'rescue', name: '红十字 02', callsign: 'RESCUE 02', mission: '使用抓捕网控制逃跑嫌犯，等待警务人员接应。', equipment: '抓捕网兜 · 吊索 · 搜索摄像', status: '抓捕嫌犯', speed: 0, altitude: 145 },
  { id: 'rescue-03', type: 'rescue', name: '清泉 03', callsign: 'RESCUE 03', mission: '在池塘降下吊桶取水，装满后飞往东侧森林火场洒水，再返回池塘。', equipment: '取水吊桶 · 可伸缩吊索 · 水量传感器', status: '取水灭火', speed: 96, altitude: 180 },
  { id: 'fire-01', type: 'fire', name: '烈焰 01', callsign: 'FIRE 01', mission: '向松果森林火点持续洒水，压制火线蔓延。', equipment: '消防吊桶 · 大容量水箱 · 红外火情探测', status: '洒水作业', speed: 0, altitude: 150 },
  { id: 'fire-02', type: 'fire', name: '烈焰 02', callsign: 'FIRE 02', mission: '在湖泊与火场之间往返，为吊桶补水。', equipment: '可吸水吊桶 · 泡沫混合器 · 外载挂钩', status: '往返补水', speed: 126, altitude: 190 },
  { id: 'police-02', type: 'police', name: '守护者 02', callsign: 'POLICE 02', mission: '在城市与港口区域执行探照搜索。', equipment: '双光搜索灯 · 夜视仪 · 实时图传', status: '探照搜索', speed: 82, altitude: 160 },
  { id: 'transport-01', type: 'transport', name: '大力士 01', callsign: 'CARGO 01', mission: '将建筑物资运往雪顶山脉施工营地。', equipment: '双旋翼系统 · 四点吊索 · 防震货箱', status: '吊运中', speed: 88, altitude: 230 },
];
