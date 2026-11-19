import * as THREE from 'three';
import {
  box,
  cylinderBetween,
  ellipsoid,
  makeMesh,
  standardMaterial,
} from './primitives';
import { FLEET } from './types';
import type { HelicopterInfo, MissionType } from './types';
import { createWaterRescueRig } from './water-rescue';
import type { WaterRescueRig } from './water-rescue';
import { getFlightPose } from './flight-plan';
import type { FlightPose } from './flight-plan';

interface CharacterRig {
  root: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

interface RescueGear {
  climber?: CharacterRig;
  ladder?: THREE.Group;
  capture?: THREE.Group;
  waterRescue?: WaterRescueRig;
  waterDrops?: THREE.Mesh[];
  cargo?: THREE.Group;
  bucketRig?: THREE.Group;
  waterStream?: THREE.Mesh;
  searchBeam?: THREE.Mesh;
}

interface HelicopterModel {
  root: THREE.Group;
  mainRotor: THREE.Group;
  tailRotor: THREE.Group;
  secondaryRotor?: THREE.Group;
}

export interface HelicopterUnit extends HelicopterModel, RescueGear {
  info: HelicopterInfo;
  flight: FlightPose;
  waterDrops: THREE.Mesh[];
  rotorDiscs: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  navigationLights: THREE.Mesh[];
}

export interface FleetWorld {
  group: THREE.Group;
  units: HelicopterUnit[];
  update: (elapsed: number, delta: number) => void;
}

function createRotor(accent: THREE.Material, dark: THREE.Material) {
  const rotor = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    const arm = new THREE.Group();
    arm.rotation.y = index * Math.PI / 2;
    const blade = box(0.065, 0.018, 0.82, dark);
    blade.position.z = 0.52;
    const tip = box(0.072, 0.022, 0.16, accent);
    tip.position.z = 0.96;
    arm.add(blade, tip);
    rotor.add(arm);
  }
  const hub = makeMesh(new THREE.CylinderGeometry(0.07, 0.09, 0.09, 8), accent);
  const disc = makeMesh(
    new THREE.CircleGeometry(1.04, 48),
    new THREE.MeshBasicMaterial({ color: '#b5d5d1', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    false,
    false,
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.015;
  rotor.add(hub, disc);
  return { rotor, disc };
}

function addSkids(root: THREE.Group, dark: THREE.Material, metal: THREE.Material) {
  for (const x of [-0.27, 0.27]) {
    root.add(cylinderBetween(
      new THREE.Vector3(x, -0.36, -0.43),
      new THREE.Vector3(x, -0.36, 0.49),
      0.027,
      dark,
    ));
    for (const z of [-0.22, 0.25]) {
      root.add(cylinderBetween(
        new THREE.Vector3(x * 0.68, -0.16, z),
        new THREE.Vector3(x, -0.36, z),
        0.022,
        metal,
      ));
    }
  }
}

function addDecals(root: THREE.Group, info: HelicopterInfo, paint: string) {
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = 512;
  textureCanvas.height = 128;
  const context = textureCanvas.getContext('2d');
  if (!context) return;
  context.fillStyle = paint;
  context.fillRect(0, 0, 512, 128);
  context.fillStyle = info.type === 'police' || info.type === 'fire' ? '#f7f4e8' : '#173b43';
  context.font = '700 52px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const prefix = info.type === 'rescue' ? '+ ' : '';
  context.fillText(`${prefix}${info.callsign}`, 256, 67, 480);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  for (const side of [-1, 1]) {
    const label = makeMesh(new THREE.PlaneGeometry(0.48, 0.13), material, false, false);
    label.position.set(side * 0.326, -0.015, 0.015);
    label.rotation.y = side * Math.PI / 2;
    root.add(label);
  }
}

function createCharacter(kind: 'police' | 'villain'): CharacterRig {
  const root = new THREE.Group();
  const isPolice = kind === 'police';
  const uniform = standardMaterial(isPolice ? '#285a7d' : '#3d4547');
  const trousers = standardMaterial(isPolice ? '#1d3548' : '#554b43');
  const dark = standardMaterial('#202c31');
  const skin = standardMaterial('#d9a276');

  const torso = box(0.18, 0.22, 0.11, uniform);
  torso.position.y = 0.06;
  const belt = box(0.19, 0.04, 0.12, dark);
  belt.position.y = -0.055;
  const head = ellipsoid(0.085, 0.09, 0.08, skin, 1);
  head.position.y = 0.25;
  root.add(torso, belt, head);

  if (isPolice) {
    const cap = makeMesh(new THREE.CylinderGeometry(0.088, 0.088, 0.045, 10), uniform);
    cap.position.y = 0.33;
    const brim = box(0.14, 0.018, 0.08, dark);
    brim.position.set(0, 0.31, 0.065);
    const badge = box(0.035, 0.05, 0.012, standardMaterial('#ffd166'));
    badge.position.set(-0.045, 0.1, 0.062);
    root.add(cap, brim, badge);
  } else {
    const mask = box(0.15, 0.045, 0.025, dark);
    mask.position.set(0, 0.26, 0.073);
    root.add(mask);
  }

  const createArm = (x: number) => {
    const arm = new THREE.Group();
    arm.position.set(x, 0.15, 0);
    arm.add(cylinderBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.18, 0),
      0.035,
      uniform,
      7,
    ));
    const hand = ellipsoid(0.038, 0.038, 0.038, skin, 1);
    hand.position.y = -0.2;
    arm.add(hand);
    root.add(arm);
    return arm;
  };
  const createLeg = (x: number) => {
    const leg = new THREE.Group();
    leg.position.set(x, -0.075, 0);
    leg.add(cylinderBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.2, 0),
      0.04,
      trousers,
      7,
    ));
    const boot = box(0.07, 0.05, 0.11, dark);
    boot.position.set(0, -0.225, 0.025);
    leg.add(boot);
    root.add(leg);
    return leg;
  };

  const character = {
    root,
    leftArm: createArm(-0.125),
    rightArm: createArm(0.125),
    leftLeg: createLeg(-0.055),
    rightLeg: createLeg(0.055),
  };
  root.scale.setScalar(0.8);
  return character;
}

function addRescueEquipment(model: HelicopterModel, info: HelicopterInfo, metal: THREE.Material, orange: THREE.Material): RescueGear {
  const { root } = model;
  const winch = box(0.18, 0.14, 0.22, orange);
  winch.position.set(0, -0.24, 0.02);
  root.add(winch);

  if (info.id === 'rescue-01') {
    const ladder = new THREE.Group();
    const rope = standardMaterial('#6c5a3d');
    for (const x of [-0.18, 0.18]) {
      ladder.add(cylinderBetween(
        new THREE.Vector3(x, -0.32, 0),
        new THREE.Vector3(x, -2.45, 0),
        0.018,
        rope,
        7,
      ));
    }
    for (let rung = 0; rung < 10; rung += 1) {
      const y = -0.43 - rung * 0.22;
      ladder.add(cylinderBetween(
        new THREE.Vector3(-0.18, y, 0),
        new THREE.Vector3(0.18, y, 0),
        0.022,
        metal,
        7,
      ));
    }
    const climber = createCharacter('police');
    climber.root.position.set(0, -1.7, 0.09);
    climber.leftArm.rotation.z = -0.25;
    climber.rightArm.rotation.z = 0.25;
    ladder.add(climber.root);
    root.add(ladder);
    return { climber, ladder };
  }

  if (info.id === 'rescue-02') {
    const capture = new THREE.Group();
    capture.add(cylinderBetween(
      new THREE.Vector3(0, -0.3, 0),
      new THREE.Vector3(0, -0.96, 0),
      0.018,
      metal,
      7,
    ));
    const netMaterial = new THREE.MeshBasicMaterial({
      color: '#d9c99a',
      wireframe: true,
      transparent: true,
      opacity: 0.82,
    });
    const net = makeMesh(new THREE.CylinderGeometry(0.34, 0.12, 0.62, 10, 4, true), netMaterial, false, false);
    net.position.y = -1.55;
    capture.add(net);
    const rim = makeMesh(new THREE.TorusGeometry(0.34, 0.018, 7, 20), metal);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -1.24;
    capture.add(rim);
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2;
      capture.add(cylinderBetween(
        new THREE.Vector3(0, -0.94, 0),
        new THREE.Vector3(Math.cos(angle) * 0.34, -1.24, Math.sin(angle) * 0.34),
        0.012,
        metal,
        6,
      ));
    }
    const villain = createCharacter('villain');
    villain.root.position.set(0, -1.58, 0);
    villain.leftArm.rotation.z = -2.35;
    villain.rightArm.rotation.z = 2.35;
    capture.add(villain.root);
    root.add(capture);
    return { capture };
  }
  if (info.id === 'rescue-03') return { waterRescue: createWaterRescueRig(root) };
  return {};
}

function addFireEquipment(model: HelicopterModel, info: HelicopterInfo, yellow: THREE.Material, metal: THREE.Material) {
  const { root } = model;
  const tank = ellipsoid(0.27, 0.17, 0.4, yellow, 1);
  tank.position.set(0, -0.29, -0.02);
  root.add(tank);
  const bucketRig = new THREE.Group();
  const hose = makeMesh(new THREE.CylinderGeometry(0.035, 0.035, 0.32, 8), metal);
  hose.position.set(0, -0.48, 0.03);
  bucketRig.add(hose);
  bucketRig.add(cylinderBetween(
    new THREE.Vector3(0, -0.36, -0.06),
    new THREE.Vector3(0, -1.12, -0.06),
    0.012,
    metal,
    6,
  ));
  const bucket = makeMesh(new THREE.CylinderGeometry(0.17, 0.12, 0.25, 10), yellow);
  bucket.position.set(0, -1.25, -0.06);
  bucketRig.add(bucket);
  const handle = makeMesh(new THREE.TorusGeometry(0.14, 0.012, 6, 16, Math.PI), metal);
  handle.position.set(0, -1.1, -0.06);
  bucketRig.add(handle);
  root.add(bucketRig);
  const waterDrops: THREE.Mesh[] = [];
  let waterStream: THREE.Mesh | undefined;
  if (info.id === 'fire-01') {
    const waterMaterial = standardMaterial('#79dbeb', {
      emissive: '#3baac1',
      emissiveIntensity: 0.24,
      transparent: true,
      opacity: 0.86,
      roughness: 0.18,
    });
    const streamMaterial = waterMaterial.clone();
    streamMaterial.opacity = 0.34;
    waterStream = makeMesh(new THREE.CylinderGeometry(0.045, 0.075, 2.4, 8), streamMaterial, false, false);
    waterStream.position.set(0, -2.55, -0.06);
    root.add(waterStream);
    for (let index = 0; index < 32; index += 1) {
      const drop = ellipsoid(0.032, 0.085, 0.032, waterMaterial, 0);
      drop.position.set((index % 4 - 1.5) * 0.05, -1.4 - index * 0.075, -0.06 + (index % 3 - 1) * 0.04);
      drop.castShadow = false;
      root.add(drop);
      waterDrops.push(drop);
    }
  }
  return { waterDrops, bucketRig, waterStream };
}

function addPoliceEquipment(root: THREE.Group, info: HelicopterInfo, metal: THREE.Material) {
  const red = standardMaterial('#ff5d52', { emissive: '#ff493d', emissiveIntensity: 0.75 });
  const blue = standardMaterial('#67c7ff', { emissive: '#4aaef0', emissiveIntensity: 0.75 });
  const redLight = ellipsoid(0.06, 0.04, 0.06, red, 1);
  redLight.position.set(-0.1, 0.35, -0.1);
  const blueLight = ellipsoid(0.06, 0.04, 0.06, blue, 1);
  blueLight.position.set(0.1, 0.35, -0.1);
  root.add(redLight, blueLight);
  const lamp = box(0.15, 0.12, 0.18, metal);
  lamp.position.set(0.19, -0.26, 0.33);
  root.add(lamp);
  let searchBeam: THREE.Mesh | undefined;
  if (info.id === 'police-02') {
    searchBeam = makeMesh(
      new THREE.ConeGeometry(0.58, 2.35, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: '#d2f4e9',
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      false,
      false,
    );
    searchBeam.position.set(0.19, -1.45, 0.33);
    root.add(searchBeam);
  }
  return searchBeam;
}

function addTransportEquipment(model: HelicopterModel, info: HelicopterInfo, olive: THREE.Material, metal: THREE.Material, dark: THREE.Material) {
  const { root } = model;
  for (const x of [-0.34, 0.34]) {
    const fuelTank = ellipsoid(0.12, 0.13, 0.42, olive, 1);
    fuelTank.position.set(x, -0.12, -0.18);
    root.add(fuelTank);
  }
  const ramp = box(0.43, 0.035, 0.4, metal);
  ramp.position.set(0, -0.25, -0.56);
  ramp.rotation.x = -0.35;
  root.add(ramp);
  let cargo: THREE.Group | undefined;
  if (info.id === 'transport-01') {
    cargo = new THREE.Group();
    const crate = box(0.52, 0.45, 0.52, standardMaterial('#bd9561'));
    crate.position.set(0, -1.45, 0);
    cargo.add(crate);
    for (const x of [-0.22, 0.22]) {
      for (const z of [-0.22, 0.22]) {
        cargo.add(cylinderBetween(
          new THREE.Vector3(x * 0.65, -0.28, z * 0.65),
          new THREE.Vector3(x, -1.22, z),
          0.012,
          metal,
          6,
        ));
        const strap = box(0.045, 0.46, 0.535, dark);
        strap.position.set(x, -1.45, 0);
        cargo.add(strap);
      }
    }
    root.add(cargo);
  }
  return cargo;
}

function createHelicopter(info: HelicopterInfo): HelicopterModel & RescueGear & {
  waterDrops: THREE.Mesh[];
  rotorDiscs: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  navigationLights: THREE.Mesh[];
} {
  const root = new THREE.Group();
  const paintColors: Record<MissionType, string> = {
    rescue: '#f1eee0',
    fire: '#df5540',
    police: '#315b78',
    transport: '#7f9655',
  };
  const accentColors: Record<MissionType, string> = {
    rescue: '#f06449',
    fire: '#ffd166',
    police: '#d9edf1',
    transport: '#d7c76c',
  };
  const paint = standardMaterial(paintColors[info.type], { roughness: 0.58 });
  const accent = standardMaterial(accentColors[info.type]);
  const dark = standardMaterial('#263b40', { roughness: 0.55 });
  const metal = standardMaterial('#7e9293', { metalness: 0.25, roughness: 0.42 });
  const glass = standardMaterial('#7cc6d3', { roughness: 0.18, metalness: 0.18 });
  const isTransport = info.type === 'transport';

  const body = ellipsoid(isTransport ? 0.4 : 0.34, isTransport ? 0.35 : 0.29, isTransport ? 0.66 : 0.56, paint, 2);
  const cockpit = ellipsoid(isTransport ? 0.35 : 0.3, 0.22, 0.31, glass, 2);
  cockpit.position.set(0, 0.09, isTransport ? 0.43 : 0.35);
  const stripe = box(isTransport ? 0.7 : 0.61, 0.075, 0.52, accent);
  stripe.position.set(0, -0.04, -0.04);
  root.add(body, cockpit, stripe);

  const boomStart = new THREE.Vector3(0, 0.06, -0.39);
  const boomEnd = new THREE.Vector3(0, 0.15, isTransport ? -1.02 : -1.27);
  root.add(cylinderBetween(boomStart, boomEnd, isTransport ? 0.1 : 0.072, paint));
  const tailFin = box(0.055, 0.4, 0.25, accent);
  tailFin.position.set(0, 0.34, isTransport ? -0.96 : -1.18);
  tailFin.rotation.x = -0.18;
  const stabilizer = box(0.48, 0.045, 0.16, paint);
  stabilizer.position.set(0, 0.13, isTransport ? -0.77 : -0.9);
  root.add(tailFin, stabilizer);

  for (const x of [-0.15, 0.15]) {
    const engine = makeMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.38, 10), metal);
    engine.rotation.x = Math.PI / 2;
    engine.position.set(x, 0.28, -0.16);
    const exhaust = makeMesh(new THREE.CylinderGeometry(0.055, 0.065, 0.16, 8), dark);
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(x, 0.29, -0.4);
    root.add(engine, exhaust);
  }

  for (const side of [-1, 1]) {
    const door = box(0.018, 0.22, 0.25, glass);
    door.position.set(side * (isTransport ? 0.39 : 0.327), 0.02, 0.05);
    const handle = box(0.025, 0.025, 0.08, metal);
    handle.position.set(side * (isTransport ? 0.405 : 0.34), -0.015, -0.015);
    root.add(door, handle);
  }

  addSkids(root, dark, metal);
  addDecals(root, info, paintColors[info.type]);

  const mast = makeMesh(new THREE.CylinderGeometry(0.035, 0.045, 0.2, 8), metal);
  mast.position.set(0, 0.4, isTransport ? 0.28 : 0);
  root.add(mast);
  const mainAssembly = createRotor(accent, dark);
  const mainRotor = mainAssembly.rotor;
  mainRotor.position.set(0, 0.52, isTransport ? 0.28 : 0);
  root.add(mainRotor);
  const rotorDiscs = [mainAssembly.disc];

  let secondaryRotor: THREE.Group | undefined;
  if (isTransport) {
    const rearMast = makeMesh(new THREE.CylinderGeometry(0.04, 0.05, 0.22, 8), metal);
    rearMast.position.set(0, 0.4, -0.65);
    const secondaryAssembly = createRotor(accent, dark);
    secondaryRotor = secondaryAssembly.rotor;
    secondaryRotor.position.set(0, 0.53, -0.65);
    rotorDiscs.push(secondaryAssembly.disc);
    root.add(rearMast, secondaryRotor);
  }

  const tailRotor = new THREE.Group();
  tailRotor.position.set(0.09, 0.19, isTransport ? -1.0 : -1.24);
  const tailBladeA = box(0.025, 0.48, 0.035, dark);
  const tailBladeB = box(0.025, 0.035, 0.48, dark);
  const tailTip = box(0.03, 0.12, 0.045, accent);
  tailTip.position.y = 0.2;
  tailRotor.add(tailBladeA, tailBladeB, tailTip);
  root.add(tailRotor);

  const navRed = ellipsoid(0.035, 0.035, 0.035, standardMaterial('#ff6455', {
    emissive: '#ff493d', emissiveIntensity: 0.7,
  }), 1);
  navRed.position.set(-0.34, 0.02, -0.08);
  const navGreen = ellipsoid(0.035, 0.035, 0.035, standardMaterial('#8fe39c', {
    emissive: '#62c972', emissiveIntensity: 0.7,
  }), 1);
  navGreen.position.set(0.34, 0.02, -0.08);
  root.add(navRed, navGreen);

  const rescueGear: RescueGear = info.type === 'rescue'
    ? addRescueEquipment({ root, mainRotor, tailRotor, secondaryRotor }, info, metal, accent)
    : {};
  if (info.type === 'fire') {
    Object.assign(rescueGear, addFireEquipment({ root, mainRotor, tailRotor, secondaryRotor }, info, accent, metal));
  }
  if (info.type === 'police') rescueGear.searchBeam = addPoliceEquipment(root, info, metal);
  if (info.type === 'transport') rescueGear.cargo = addTransportEquipment({ root, mainRotor, tailRotor, secondaryRotor }, info, accent, metal, dark);
  const waterDrops = rescueGear.waterDrops ?? [];

  root.scale.setScalar(isTransport ? 0.78 : 0.69);
  root.traverse((child) => {
    child.userData.helicopterId = info.id;
    if (child instanceof THREE.Mesh) {
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });
  root.userData.helicopterId = info.id;
  return { root, mainRotor, tailRotor, secondaryRotor, waterDrops, rotorDiscs, navigationLights: [navRed, navGreen], ...rescueGear };
}

export function createFleetWorld(): FleetWorld {
  const group = new THREE.Group();
  const units: HelicopterUnit[] = [];
  for (const info of FLEET) {
    const model = createHelicopter(info);
    const unit: HelicopterUnit = { info, flight: getFlightPose(info.id, 0), ...model };
    units.push(unit);
    group.add(model.root);
  }

  const update = (elapsed: number, delta: number) => {
    for (const unit of units) {
      const { root } = unit;
      const pose = getFlightPose(unit.info.id, elapsed);
      unit.flight = pose;
      const onMission = pose.stage === 'mission';
      root.position.set(pose.x, pose.y, pose.z);
      root.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ');
      unit.mainRotor.rotation.y += delta * pose.rotorSpeed;
      unit.tailRotor.rotation.x += delta * pose.rotorSpeed * 1.3;
      if (unit.secondaryRotor) unit.secondaryRotor.rotation.y -= delta * pose.rotorSpeed * 0.94;
      for (const disc of unit.rotorDiscs) {
        disc.visible = pose.rotorSpeed > 4;
        disc.material.opacity = pose.rotorSpeed / 24 * 0.13;
      }
      for (const light of unit.navigationLights) light.visible = pose.rotorSpeed > 0 && elapsed % 1 < 0.82;
      if (unit.ladder) unit.ladder.visible = onMission;
      if (unit.capture) unit.capture.visible = onMission;
      if (unit.searchBeam) unit.searchBeam.visible = onMission;
      if (unit.waterStream) unit.waterStream.visible = onMission;
      const equipmentClearance = THREE.MathUtils.clamp((pose.y - pose.contactY) / 1.25, 0, 1);
      if (unit.bucketRig) unit.bucketRig.scale.y = 0.32 + equipmentClearance * 0.68;
      if (unit.cargo) unit.cargo.scale.y = 0.2 + equipmentClearance * 0.8;
      if (unit.waterRescue) unit.waterRescue.update(pose.missionTime, delta, root, onMission);
      if (unit.climber && onMission) {
        const stride = Math.sin(elapsed * 4.2);
        const climb = (Math.sin(elapsed * 0.65) + 1) / 2;
        unit.climber.root.position.y = -2.05 + climb * 1.15;
        unit.climber.leftArm.rotation.x = stride * 0.85;
        unit.climber.rightArm.rotation.x = -stride * 0.85;
        unit.climber.leftLeg.rotation.x = -stride * 0.65;
        unit.climber.rightLeg.rotation.x = stride * 0.65;
      }
      if (unit.capture && onMission) {
        unit.capture.rotation.z = Math.sin(elapsed * 1.4) * 0.075;
        unit.capture.rotation.x = Math.cos(elapsed * 1.1) * 0.045;
      }
      unit.waterDrops.forEach((drop, index) => {
        drop.visible = onMission;
        if (!onMission) return;
        drop.position.y -= delta * 3.1;
        if (drop.position.y < -3.88) drop.position.y = -1.4 - (index % 4) * 0.06;
      });
    }
  };

  update(0, 0);
  return { group, units, update };
}
