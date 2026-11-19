import { getHelipad } from './helipad-data';

export const FLIGHT_TIMING = {
  shutdown: 5,
  spoolUp: 3.5,
  liftoff: 4.5,
  outbound: 7,
  inbound: 7,
  align: 3,
  landing: 4.8,
  spoolDown: 3.5,
  hoverHeight: 1.4,
  rotorSpeed: 24,
} as const;

export type FlightStage = 'shutdown' | 'spool-up' | 'liftoff' | 'outbound' | 'mission' | 'inbound' | 'align' | 'landing' | 'spool-down';

interface FlightPath {
  centerX: number;
  centerZ: number;
  rangeX: number;
  rangeZ: number;
  altitude: number;
  speed: number;
  phase: number;
  hover?: boolean;
  yaw?: number;
}

interface FlightPlan {
  id: string;
  padIds: string[];
  path: FlightPath;
  missionDuration: number;
  offset: number;
  cruiseAltitude: number;
  groundOffset: number;
}

interface Point {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface FlightPose extends Point {
  stage: FlightStage;
  pitch: number;
  roll: number;
  rotorSpeed: number;
  missionTime: number;
  padId: string;
  contactY: number;
  onPad: boolean;
}

const normalScaleOffset = (0.36 + 0.027) * 0.69;
const transportScaleOffset = (0.36 + 0.027) * 0.78;

export const FLIGHT_PLANS: FlightPlan[] = [
  { id: 'rescue-01', padIds: ['summit', 'hospital-roof'], path: { centerX: -3.2, centerZ: -3.65, rangeX: 0, rangeZ: 0, altitude: 5.45, speed: 0, phase: 0, hover: true, yaw: 0.8 }, missionDuration: 15, offset: 23, cruiseAltitude: 5.7, groundOffset: normalScaleOffset },
  { id: 'rescue-02', padIds: ['central'], path: { centerX: 0.9, centerZ: 0.65, rangeX: 0, rangeZ: 0, altitude: 4.6, speed: 0, phase: 1.1, hover: true, yaw: 1.1 }, missionDuration: 16, offset: 25, cruiseAltitude: 4.8, groundOffset: normalScaleOffset },
  { id: 'rescue-03', padIds: ['waterside'], path: { centerX: 4.05, centerZ: -2.3, rangeX: 0, rangeZ: 0, altitude: 2.28, speed: 0, phase: 0, yaw: 0.8 }, missionDuration: 24, offset: 20, cruiseAltitude: 4.9, groundOffset: normalScaleOffset },
  { id: 'fire-01', padIds: ['forest'], path: { centerX: 4.6, centerZ: 2.1, rangeX: 0, rangeZ: 0, altitude: 3.15, speed: 0, phase: 0, hover: true, yaw: -0.4 }, missionDuration: 16, offset: 24, cruiseAltitude: 6.35, groundOffset: normalScaleOffset },
  { id: 'fire-02', padIds: ['ranger'], path: { centerX: 3.3, centerZ: -2.35, rangeX: 2.5, rangeZ: 1.45, altitude: 6.65, speed: 0.12, phase: 2.2 }, missionDuration: 30, offset: 60.8, cruiseAltitude: 6.85, groundOffset: normalScaleOffset },
  { id: 'police-02', padIds: ['city-roof', 'police-ground'], path: { centerX: -2.5, centerZ: 1.8, rangeX: 2.7, rangeZ: 2.15, altitude: 5.8, speed: -0.105, phase: 2.8 }, missionDuration: 32, offset: 0, cruiseAltitude: 7.2, groundOffset: normalScaleOffset },
  { id: 'transport-01', padIds: ['logistics'], path: { centerX: -0.3, centerZ: -3.3, rangeX: 2.7, rangeZ: 1.5, altitude: 6.9, speed: 0.085, phase: 1.8 }, missionDuration: 34, offset: 5.8, cruiseAltitude: 7.6, groundOffset: transportScaleOffset },
];

const MISSION_START = FLIGHT_TIMING.shutdown + FLIGHT_TIMING.spoolUp + FLIGHT_TIMING.liftoff + FLIGHT_TIMING.outbound;
const FIXED_DURATION = MISSION_START + FLIGHT_TIMING.inbound + FLIGHT_TIMING.align + FLIGHT_TIMING.landing + FLIGHT_TIMING.spoolDown;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function turnToward(from: number, to: number, amount: number) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * clamp01(amount);
}

function missionPoint(plan: FlightPlan, missionTime: number): Point {
  const { path } = plan;
  if (plan.id === 'rescue-03') {
    const progress = missionTime / plan.missionDuration;
    const pond = { x: 4.05, y: 2.28, z: -2.3, yaw: 0.8 };
    const fire = { x: 6.1, y: 3.25, z: 3.6, yaw: -0.35 };
    const pad = getHelipad('waterside');
    const home = { x: pad.x, y: pad.deckY + plan.groundOffset + FLIGHT_TIMING.hoverHeight, z: pad.z, yaw: pad.yaw };
    if (progress < 0.2) return { ...pond, y: pond.y + Math.sin(missionTime * 1.5) * 0.018 };
    if (progress < 0.26) return { ...pond, y: pond.y + smooth((progress - 0.2) / 0.06) * 2.57 };
    if (progress < 0.5) {
      const travel = smooth((progress - 0.26) / 0.24);
      return {
        x: lerp(pond.x, fire.x, travel),
        y: 4.85 + Math.sin(travel * Math.PI) * 0.35 - smooth((progress - 0.43) / 0.07) * 1.6,
        z: lerp(pond.z, fire.z, travel),
        yaw: Math.atan2(fire.x - pond.x, fire.z - pond.z),
      };
    }
    if (progress < 0.66) return { ...fire, y: fire.y + Math.sin(missionTime * 1.3) * 0.025 };
    if (progress < 0.74) return { ...fire, y: fire.y + smooth((progress - 0.66) / 0.08) * 1.6, yaw: Math.atan2(home.x - fire.x, home.z - fire.z) };
    const travel = smooth((progress - 0.74) / 0.26);
    return {
      x: lerp(fire.x, home.x, travel),
      y: 4.85 - smooth((progress - 0.92) / 0.08) * (4.85 - home.y),
      z: lerp(fire.z, home.z, travel),
      yaw: Math.atan2(home.x - fire.x, home.z - fire.z),
    };
  }
  if (path.hover) {
    return { x: path.centerX, y: path.altitude + Math.sin(missionTime * 1.25 + path.phase) * 0.045, z: path.centerZ, yaw: path.yaw ?? 0 };
  }
  const angle = path.phase + missionTime * path.speed;
  const positionAt = (value: number) => ({
    x: path.centerX + Math.sin(value) * path.rangeX,
    z: path.centerZ + Math.cos(value) * path.rangeZ,
  });
  const position = positionAt(angle);
  const next = positionAt(angle + Math.sign(path.speed) * 0.015);
  return {
    ...position,
    y: path.altitude + Math.sin(missionTime * 1.4 + path.phase) * 0.05,
    yaw: Math.atan2(next.x - position.x, next.z - position.z),
  };
}

function transitPoint(from: Point, to: Point, progress: number, cruiseAltitude: number): Point {
  const amount = smooth(progress);
  const sameVerticalCorridor = Math.abs(from.x - to.x) < 0.0001 && Math.abs(from.z - to.z) < 0.0001;
  const arc = sameVerticalCorridor ? 0 : Math.max(0.65, cruiseAltitude - Math.max(from.y, to.y));
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount) + Math.sin(amount * Math.PI) * arc,
    z: lerp(from.z, to.z, amount),
    yaw: Math.atan2(to.x - from.x, to.z - from.z),
  };
}

export function flightCycleDuration(id: string) {
  const plan = FLIGHT_PLANS.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown helicopter: ${id}`);
  return FIXED_DURATION + plan.missionDuration;
}

export function getFlightPose(id: string, elapsed: number): FlightPose {
  const plan = FLIGHT_PLANS.find((candidate) => candidate.id === id);
  if (!plan) throw new Error(`Unknown helicopter: ${id}`);
  const duration = flightCycleDuration(id);
  const total = elapsed + plan.offset;
  const cycleIndex = Math.floor(total / duration);
  const time = total % duration;
  const startPad = getHelipad(plan.padIds[cycleIndex % plan.padIds.length]);
  const endPad = getHelipad(plan.padIds[(cycleIndex + 1) % plan.padIds.length]);
  const contactY = startPad.deckY + plan.groundOffset;
  const landingContactY = endPad.deckY + plan.groundOffset;
  const missionTime = Math.max(0, Math.min(plan.missionDuration, time - MISSION_START));
  const start = { x: startPad.x, y: contactY, z: startPad.z, yaw: startPad.yaw };
  const hover = { ...start, y: contactY + FLIGHT_TIMING.hoverHeight };
  const missionStart = missionPoint(plan, 0);
  const missionEnd = missionPoint(plan, plan.missionDuration);
  const endHover = { x: endPad.x, y: landingContactY + FLIGHT_TIMING.hoverHeight, z: endPad.z, yaw: endPad.yaw };
  const arrivalYaw = Math.atan2(endHover.x - missionEnd.x, endHover.z - missionEnd.z);
  let stage: FlightStage;
  let point: Point;
  let pitch = 0;
  let roll = 0;
  let rotorSpeed: number = FLIGHT_TIMING.rotorSpeed;
  let padId = endPad.id;
  let onPad = false;

  if (time < FLIGHT_TIMING.shutdown) {
    stage = 'shutdown';
    point = start;
    rotorSpeed = 0;
    padId = startPad.id;
    onPad = true;
  } else if (time < MISSION_START - FLIGHT_TIMING.liftoff - FLIGHT_TIMING.outbound) {
    stage = 'spool-up';
    point = start;
    rotorSpeed *= smooth((time - FLIGHT_TIMING.shutdown) / FLIGHT_TIMING.spoolUp);
    padId = startPad.id;
    onPad = true;
  } else if (time < MISSION_START - FLIGHT_TIMING.outbound) {
    stage = 'liftoff';
    const progress = (time - FLIGHT_TIMING.shutdown - FLIGHT_TIMING.spoolUp) / FLIGHT_TIMING.liftoff;
    point = { ...start, y: lerp(contactY, hover.y, smooth(progress)) };
    roll = Math.sin(progress * Math.PI) * 0.012;
    padId = startPad.id;
    onPad = true;
  } else if (time < MISSION_START) {
    stage = 'outbound';
    const progress = (time - MISSION_START + FLIGHT_TIMING.outbound) / FLIGHT_TIMING.outbound;
    point = transitPoint(hover, missionStart, progress, plan.cruiseAltitude);
    point.yaw = turnToward(point.yaw, missionStart.yaw, smooth((progress - 0.7) / 0.3));
    pitch = -Math.sin(progress * Math.PI) * 0.1;
    roll = Math.sin(progress * Math.PI * 2) * 0.025;
  } else if (time < MISSION_START + plan.missionDuration) {
    stage = 'mission';
    point = missionPoint(plan, time - MISSION_START);
    roll = plan.path.hover ? 0 : Math.sign(plan.path.speed) * 0.025;
  } else if (time < MISSION_START + plan.missionDuration + FLIGHT_TIMING.inbound) {
    stage = 'inbound';
    const progress = (time - MISSION_START - plan.missionDuration) / FLIGHT_TIMING.inbound;
    point = transitPoint(missionEnd, endHover, progress, plan.cruiseAltitude);
    point.yaw = turnToward(missionEnd.yaw, point.yaw, smooth(progress / 0.3));
    pitch = Math.sin(progress * Math.PI) * 0.085;
  } else if (time < MISSION_START + plan.missionDuration + FLIGHT_TIMING.inbound + FLIGHT_TIMING.align) {
    stage = 'align';
    const progress = (time - MISSION_START - plan.missionDuration - FLIGHT_TIMING.inbound) / FLIGHT_TIMING.align;
    point = { ...endHover, yaw: turnToward(arrivalYaw, endPad.yaw, smooth(progress)) };
    onPad = true;
  } else if (time < duration - FLIGHT_TIMING.spoolDown) {
    stage = 'landing';
    const progress = (time - MISSION_START - plan.missionDuration - FLIGHT_TIMING.inbound - FLIGHT_TIMING.align) / FLIGHT_TIMING.landing;
    point = { ...endHover, y: lerp(endHover.y, landingContactY, smooth(progress)) };
    pitch = Math.sin(progress * Math.PI) * 0.025;
    onPad = true;
  } else {
    stage = 'spool-down';
    point = { ...endHover, y: landingContactY };
    rotorSpeed *= 1 - smooth((time - duration + FLIGHT_TIMING.spoolDown) / FLIGHT_TIMING.spoolDown);
    onPad = true;
  }

  return { ...point, stage, pitch, roll, rotorSpeed, missionTime, padId, contactY: padId === startPad.id ? contactY : landingContactY, onPad };
}
