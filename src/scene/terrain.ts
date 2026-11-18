import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  GROUND_Y,
  UP,
  box,
  cylinderBetween,
  ellipsoid,
  makeMesh,
  seededRandom,
  standardMaterial,
} from './primitives';
import { createEmergencyWorld } from './emergency';

interface AnimatedCar {
  root: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
}

interface AnimatedCloud {
  root: THREE.Group;
  x: number;
  y: number;
  z: number;
  speed: number;
}

interface AnimatedTurbine {
  rotor: THREE.Group;
  speed: number;
}

export interface TerrainWorld {
  group: THREE.Group;
  update: (elapsed: number) => void;
}

const roadMaterial = standardMaterial('#354c51', { roughness: 0.96 });
const roadLineMaterial = standardMaterial('#f8e6ae', { emissive: '#5a4a20', emissiveIntensity: 0.08 });
const dark = standardMaterial('#243c42');
const FIRE_SITES = [
  { x: 4.6, z: 2.1, scale: 1 },
  { x: 6.1, z: 3.6, scale: 0.82 },
  { x: -5.8, z: -1.5, scale: 0.76 },
];

function roundedRectangle(width: number, depth: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const z = -depth / 2;
  shape.moveTo(x + radius, z);
  shape.lineTo(x + width - radius, z);
  shape.quadraticCurveTo(x + width, z, x + width, z + radius);
  shape.lineTo(x + width, z + depth - radius);
  shape.quadraticCurveTo(x + width, z + depth, x + width - radius, z + depth);
  shape.lineTo(x + radius, z + depth);
  shape.quadraticCurveTo(x, z + depth, x, z + depth - radius);
  shape.lineTo(x, z + radius);
  shape.quadraticCurveTo(x, z, x + radius, z);
  return shape;
}

function createTerrainBase() {
  const group = new THREE.Group();
  const shape = roundedRectangle(19.2, 15, 1.8);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.64,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.1,
    bevelThickness: 0.08,
    curveSegments: 10,
  });
  geometry.rotateX(-Math.PI / 2);
  const base = makeMesh(geometry, [
    standardMaterial('#83c95d'),
    standardMaterial('#adac79'),
  ]);
  base.position.y = -0.26;
  group.add(base);

  const grass = makeMesh(new THREE.ShapeGeometry(shape, 10), standardMaterial('#83c95d'), false, true);
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = GROUND_Y - 0.008;
  group.add(grass);

  const random = seededRandom(618);
  for (let index = 0; index < 28; index += 1) {
    const patch = makeMesh(
      new THREE.CircleGeometry(0.18 + random() * 0.4, 9),
      standardMaterial(index % 2 ? '#8dcd65' : '#78bd59'),
      false,
      true,
    );
    patch.rotation.x = -Math.PI / 2;
    patch.scale.y = 0.55 + random() * 0.35;
    patch.position.set((random() - 0.5) * 13.4, GROUND_Y + 0.002, (random() - 0.5) * 10.4);
    group.add(patch);
  }
  return group;
}

function createRoadStrip(curve: THREE.CatmullRomCurve3, width: number, material: THREE.Material, lift = 0) {
  const segments = 160;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPointAt(t);
    const side = new THREE.Vector3().crossVectors(UP, curve.getTangentAt(t)).normalize().multiplyScalar(width / 2);
    const left = point.clone().add(side);
    const right = point.clone().sub(side);
    positions.push(left.x, left.y + lift, left.z, right.x, right.y + lift, right.z);
    if (index < segments) {
      const base = index * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const road = makeMesh(geometry, material, false, true);
  road.material.side = THREE.DoubleSide;
  return road;
}

function createRoad(curve: THREE.CatmullRomCurve3, width: number) {
  const group = new THREE.Group();
  group.add(
    createRoadStrip(curve, width + 0.16, standardMaterial('#d6cda8')),
    createRoadStrip(curve, width, roadMaterial, 0.012),
  );
  const count = 66;
  const markers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.016, 0.18), roadLineMaterial, count);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < count; index += 1) {
    const t = index / count;
    const point = curve.getPointAt(t);
    point.y += 0.027;
    quaternion.setFromAxisAngle(UP, Math.atan2(curve.getTangentAt(t).x, curve.getTangentAt(t).z));
    matrix.compose(point, quaternion, scale);
    markers.setMatrixAt(index, matrix);
  }
  markers.instanceMatrix.needsUpdate = true;
  markers.receiveShadow = true;
  group.add(markers);
  return group;
}

function createCar(color: string) {
  const root = new THREE.Group();
  const paint = standardMaterial(color);
  const glass = standardMaterial('#a9d9df', { roughness: 0.28, metalness: 0.08 });
  const tire = standardMaterial('#1d292d');
  const light = standardMaterial('#fff2b3', { emissive: '#ffe49a', emissiveIntensity: 0.45 });
  const body = box(0.22, 0.1, 0.4, paint);
  body.position.y = 0.1;
  const cabin = box(0.18, 0.09, 0.21, glass);
  cabin.position.set(0, 0.19, -0.025);
  root.add(body, cabin);
  for (const x of [-0.12, 0.12]) {
    for (const z of [-0.12, 0.12]) {
      const wheel = makeMesh(new THREE.CylinderGeometry(0.052, 0.052, 0.038, 8), tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.065, z);
      root.add(wheel);
    }
  }
  for (const x of [-0.065, 0.065]) {
    const headlight = box(0.045, 0.035, 0.018, light);
    headlight.position.set(x, 0.11, 0.208);
    root.add(headlight);
  }
  root.scale.setScalar(1.3);
  return root;
}

function createBuilding(width: number, height: number, depth: number, color: string, random: () => number) {
  const root = new THREE.Group();
  const bodyMaterial = standardMaterial(color);
  const trim = standardMaterial('#e9e2c8');
  const roofMaterial = standardMaterial(random() > 0.5 ? '#527078' : '#766e5f');
  const windowMaterial = standardMaterial('#c5eef0', {
    emissive: '#8bc4cd',
    emissiveIntensity: 0.2,
    roughness: 0.25,
  });
  const body = box(width, height, depth, bodyMaterial);
  body.position.y = height / 2;
  const roof = box(width + 0.06, 0.07, depth + 0.06, roofMaterial);
  roof.position.y = height + 0.035;
  const foundation = box(width + 0.08, 0.07, depth + 0.08, trim);
  foundation.position.y = 0.035;
  root.add(body, roof, foundation);
  const windowGeometries: THREE.BufferGeometry[] = [];
  const floors = Math.max(1, Math.floor(height / 0.23));
  const columns = Math.max(1, Math.floor(width / 0.2));
  for (let floor = 0; floor < floors; floor += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = ((column + 1) / (columns + 1) - 0.5) * width;
      const y = 0.16 + floor * 0.22;
      if (y > height - 0.05) continue;
      const front = new THREE.BoxGeometry(0.085, 0.1, 0.018);
      front.translate(x, y, depth / 2 + 0.011);
      windowGeometries.push(front);
      const side = new THREE.BoxGeometry(0.018, 0.1, 0.085);
      side.translate(width / 2 + 0.011, y, x * (depth / width));
      windowGeometries.push(side);
    }
  }
  if (windowGeometries.length > 0) {
    root.add(makeMesh(mergeGeometries(windowGeometries), windowMaterial, false, false));
    windowGeometries.forEach((geometry) => geometry.dispose());
  }
  if (random() > 0.45) {
    const unit = box(width * 0.34, 0.12, depth * 0.34, trim);
    unit.position.set(width * 0.15, height + 0.12, -depth * 0.12);
    root.add(unit);
  } else {
    const tank = makeMesh(new THREE.CylinderGeometry(width * 0.16, width * 0.16, 0.18, 8), trim);
    tank.position.set(0, height + 0.14, 0);
    root.add(tank);
  }
  if (height > 0.85) {
    root.add(cylinderBetween(
      new THREE.Vector3(0, height + 0.08, 0),
      new THREE.Vector3(0, height + 0.43, 0),
      0.014,
      dark,
      6,
    ));
  }
  return root;
}

function createTrees(roads: THREE.CatmullRomCurve3[]) {
  const random = seededRandom(7291);
  const count = 260;
  const trunkGeometry = new THREE.CylinderGeometry(0.045, 0.07, 0.34, 6);
  trunkGeometry.translate(0, 0.17, 0);
  const crownGeometry = new THREE.ConeGeometry(0.28, 0.68, 7);
  crownGeometry.translate(0, 0.64, 0);
  const crownTopGeometry = new THREE.ConeGeometry(0.2, 0.52, 7);
  crownTopGeometry.translate(0, 0.94, 0);
  const trunks = new THREE.InstancedMesh(trunkGeometry, standardMaterial('#75533a'), count);
  const crowns = new THREE.InstancedMesh(crownGeometry, standardMaterial('#2d7b4d'), count);
  const crownTops = new THREE.InstancedMesh(crownTopGeometry, standardMaterial('#4c9c54'), count);
  const zones = [
    { x: 4.4, z: 2.6, spreadX: 4.4, spreadZ: 4.7 },
    { x: -5.6, z: -2.8, spreadX: 2.3, spreadZ: 4.4 },
    { x: 1.1, z: -4.3, spreadX: 3, spreadZ: 2 },
    { x: 5.9, z: -0.6, spreadX: 1.6, spreadZ: 2.8 },
    { x: 7.3, z: -3.8, spreadX: 2.2, spreadZ: 3 },
    { x: -6.4, z: -1.7, spreadX: 1.6, spreadZ: 1.9 },
  ];
  const roadSamples = roads.flatMap((road) => road.getSpacedPoints(100));
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < count; index += 1) {
    const zone = zones[index % zones.length];
    let x = zone.x;
    let z = zone.z;
    for (let attempt = 0; attempt < 100; attempt += 1) {
      x = zone.x + (random() - 0.5) * zone.spreadX;
      z = zone.z + (random() - 0.5) * zone.spreadZ;
      const onFire = FIRE_SITES.some((site) => Math.hypot(x - site.x, z - site.z) < site.scale + 0.14);
      const inLake = ((x - 4.05) / 1.85) ** 2 + ((z + 2.3) / 1.35) ** 2 < 1;
      const onRoad = roadSamples.some((point) => Math.hypot(x - point.x, z - point.z) < 0.63);
      if (!onFire && !inLake && !onRoad) break;
    }
    const scale = 0.62 + random() * 0.65;
    quaternion.setFromAxisAngle(UP, random() * Math.PI * 2);
    matrix.compose(new THREE.Vector3(x, GROUND_Y, z), quaternion, new THREE.Vector3(scale, scale, scale));
    trunks.setMatrixAt(index, matrix);
    crowns.setMatrixAt(index, matrix);
    crownTops.setMatrixAt(index, matrix);
  }
  for (const mesh of [trunks, crowns, crownTops]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
  }
  const group = new THREE.Group();
  group.add(trunks, crowns, crownTops);
  return group;
}

function createMountain(height: number, radius: number, rock: THREE.Material, snow: THREE.Material, rotation: number) {
  const root = new THREE.Group();
  const mountain = makeMesh(new THREE.ConeGeometry(radius, height, 7), rock);
  mountain.position.y = height / 2;
  mountain.rotation.y = rotation;
  const cap = makeMesh(new THREE.ConeGeometry(radius * 0.46, height * 0.42, 7), snow);
  cap.position.y = height * 0.79;
  cap.rotation.y = rotation;
  root.add(mountain, cap);
  return root;
}

function createMountains() {
  const group = new THREE.Group();
  const random = seededRandom(441);
  const rocks = ['#7f8072', '#8b8977', '#6f796f'].map((color) => standardMaterial(color));
  const snow = standardMaterial('#f1f2e8');
  const locations = [
    [-3.2, -3.65, 2.6, 1.25],
    [-5.7, -3.6, 1.65, 0.9],
    [-4.8, -4.75, 2.05, 1.04],
    [-4.3, -2.8, 1.35, 0.8],
    [-2.15, -4.95, 1.85, 0.92],
    [-1.6, -3.1, 1.35, 0.82],
    [-3.2, -5.15, 1.7, 0.95],
    [-6.1, -4.85, 1.3, 0.74],
    [-0.85, -4.4, 1.05, 0.65],
  ];
  locations.forEach(([x, z, height, radius], index) => {
    const mountain = createMountain(height, radius, rocks[index % rocks.length], snow, random() * Math.PI);
    mountain.position.set(x, GROUND_Y, z);
    group.add(mountain);
  });
  return group;
}

function createCloud(scale: number, random: () => number) {
  const root = new THREE.Group();
  const material = standardMaterial('#f3f6ec', { roughness: 1 });
  const puffs = 5 + Math.floor(random() * 3);
  for (let index = 0; index < puffs; index += 1) {
    const puff = ellipsoid(0.34 + random() * 0.24, 0.22 + random() * 0.2, 0.27 + random() * 0.22, material, 1);
    puff.position.set((index - puffs / 2) * 0.28, random() * 0.2, (random() - 0.5) * 0.35);
    puff.castShadow = false;
    puff.receiveShadow = false;
    root.add(puff);
  }
  root.scale.setScalar(scale);
  return root;
}

function createTurbine() {
  const root = new THREE.Group();
  const material = standardMaterial('#e8e5d4');
  const tower = makeMesh(new THREE.CylinderGeometry(0.035, 0.07, 0.95, 8), material);
  tower.position.y = 0.475;
  const nacelle = box(0.12, 0.11, 0.24, material);
  nacelle.position.set(0, 0.98, 0.05);
  const rotor = new THREE.Group();
  rotor.position.set(0, 0.98, 0.18);
  for (let index = 0; index < 3; index += 1) {
    const blade = box(0.055, 0.5, 0.025, material);
    blade.position.y = 0.24;
    const arm = new THREE.Group();
    arm.rotation.z = (index / 3) * Math.PI * 2;
    arm.add(blade);
    rotor.add(arm);
  }
  rotor.add(ellipsoid(0.08, 0.08, 0.08, material));
  root.add(tower, nacelle, rotor);
  return { root, rotor };
}

function createLake() {
  const group = new THREE.Group();
  const shore = ellipsoid(1.77, 0.035, 1.12, standardMaterial('#d9ca94'), 2);
  shore.position.set(4.05, GROUND_Y + 0.012, -2.3);
  const water = ellipsoid(1.57, 0.035, 0.94, standardMaterial('#42bdd0', { roughness: 0.22, metalness: 0.08 }), 2);
  water.position.set(4.05, GROUND_Y + 0.042, -2.3);
  group.add(shore, water);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const rock = ellipsoid(0.12, 0.1, 0.16, standardMaterial('#8d9d86'), 0);
    rock.position.set(4.05 + Math.cos(angle) * 1.7, GROUND_Y + 0.08, -2.3 + Math.sin(angle) * 1.05);
    group.add(rock);
  }
  return group;
}

function createFireSite(x: number, z: number, scale: number) {
  const root = new THREE.Group();
  const flames: THREE.Mesh[] = [];
  const smoke: THREE.Mesh[] = [];
  const splashes: THREE.Mesh[] = [];
  const scorched = makeMesh(new THREE.CylinderGeometry(0.58, 0.62, 0.045, 12), standardMaterial('#4a4b35'), false, true);
  scorched.position.y = 0.022;
  root.add(scorched);
  const flameMaterials = ['#ffbb3e', '#f06449', '#ffdf69'].map((color) => standardMaterial(color, {
    emissive: color,
    emissiveIntensity: 0.68,
  }));
  for (let index = 0; index < 9; index += 1) {
    const height = 0.38 + (index % 3) * 0.11;
    const flame = makeMesh(new THREE.ConeGeometry(0.11 + (index % 2) * 0.035, height, 6), flameMaterials[index % 3], false, false);
    flame.position.set((index % 3 - 1) * 0.22, height / 2 + 0.045, (Math.floor(index / 3) - 1) * 0.2);
    root.add(flame);
    flames.push(flame);
  }
  for (let index = 0; index < 8; index += 1) {
    const puff = ellipsoid(0.2, 0.17, 0.18, standardMaterial('#63716d', {
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }), 1);
    puff.castShadow = false;
    root.add(puff);
    smoke.push(puff);
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    const splash = makeMesh(new THREE.CylinderGeometry(0.07, 0.11, 0.018, 8), standardMaterial('#78dce7', {
      emissive: '#42bdd0',
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.66,
      depthWrite: false,
    }), false, false);
    splash.position.set(Math.cos(angle) * 0.36, 0.075, Math.sin(angle) * 0.36);
    root.add(splash);
    splashes.push(splash);
  }
  root.position.set(x, GROUND_Y + 0.02, z);
  root.scale.setScalar(scale);
  return { root, flames, smoke, splashes };
}

function createOutskirts(random: () => number) {
  const group = new THREE.Group();
  const road = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-6.3, GROUND_Y + 0.036, 5.1),
    new THREE.Vector3(-5.6, GROUND_Y + 0.036, 5.85),
    new THREE.Vector3(-2.6, GROUND_Y + 0.036, 5.95),
    new THREE.Vector3(-0.35, GROUND_Y + 0.036, 5.65),
    new THREE.Vector3(0.65, GROUND_Y + 0.036, 4.7),
  ], false, 'centripetal');
  group.add(createRoad(road, 0.44));
  const colors = ['#efc578', '#e99a7b', '#a4c9bc', '#e7ddbb', '#98b7c5', '#c2d389'];
  [-5.65, -4.15, -2.65, -1.15, 0.35, 1.85].forEach((x, index) => {
    const house = createBuilding(0.58 + random() * 0.12, 0.42 + random() * 0.32, 0.48, colors[index], random);
    house.position.set(x, GROUND_Y + 0.045, 6.65);
    house.rotation.y = -0.1 + index * 0.025;
    group.add(house);
    const garden = makeMesh(new THREE.BoxGeometry(0.85, 0.025, 0.38), standardMaterial('#a8c878'), false, true);
    garden.position.set(x, GROUND_Y + 0.015, 6.17);
    group.add(garden);
  });
  return { group, road };
}

function createHelipad() {
  const root = new THREE.Group();
  const base = makeMesh(new THREE.CylinderGeometry(0.72, 0.72, 0.055, 32), standardMaterial('#5c8176'), false, true);
  base.position.y = 0.027;
  const ring = makeMesh(new THREE.TorusGeometry(0.54, 0.022, 5, 32), standardMaterial('#f1e6b8'), false, true);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  const barA = box(0.075, 0.018, 0.48, roadLineMaterial);
  const barB = barA.clone();
  barA.position.set(-0.15, 0.065, 0);
  barB.position.set(0.15, 0.065, 0);
  const cross = box(0.3, 0.018, 0.075, roadLineMaterial);
  cross.position.y = 0.065;
  root.add(base, ring, barA, barB, cross);
  root.position.set(0.9, GROUND_Y + 0.014, 0.65);
  return root;
}

export function createTerrainWorld(): TerrainWorld {
  const group = new THREE.Group();
  const random = seededRandom(9107);
  group.add(createTerrainBase());

  const cityRoad = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-5.9, GROUND_Y + 0.036, 0.05),
    new THREE.Vector3(-2.8, GROUND_Y + 0.036, -0.35),
    new THREE.Vector3(0.05, GROUND_Y + 0.036, 0.3),
    new THREE.Vector3(0.3, GROUND_Y + 0.036, 3.35),
    new THREE.Vector3(-0.35, GROUND_Y + 0.036, 5.12),
    new THREE.Vector3(-4.7, GROUND_Y + 0.036, 5.2),
    new THREE.Vector3(-6.45, GROUND_Y + 0.036, 3.45),
  ], true, 'centripetal');
  const forestRoad = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.95, GROUND_Y + 0.036, 4.7),
    new THREE.Vector3(4.1, GROUND_Y + 0.036, 5.05),
    new THREE.Vector3(6.65, GROUND_Y + 0.036, 3.5),
    new THREE.Vector3(6.75, GROUND_Y + 0.036, 0.15),
    new THREE.Vector3(4.9, GROUND_Y + 0.036, -0.65),
    new THREE.Vector3(1.65, GROUND_Y + 0.036, -0.7),
    new THREE.Vector3(0.75, GROUND_Y + 0.036, 1.8),
  ], true, 'centripetal');
  group.add(createRoad(cityRoad, 0.56), createRoad(forestRoad, 0.5));

  const square = makeMesh(new THREE.BoxGeometry(6.15, 0.06, 4.55), standardMaterial('#d3cba5'), false, true);
  square.position.set(-2.95, GROUND_Y + 0.016, 2.42);
  group.add(square);
  const city = new THREE.Group();
  const buildingColors = ['#f2c96d', '#e98b70', '#8fc4bd', '#e8dfbd', '#8fb3c4', '#c4d686'];
  let buildingIndex = 0;
  for (const z of [0.8, 1.9, 3.05, 4.18]) {
    for (const x of [-5.12, -3.74, -2.34, -0.96]) {
      const width = 0.38 + random() * 0.24;
      const depth = 0.38 + random() * 0.23;
      const height = 0.48 + random() * 0.95;
      const building = createBuilding(width, height, depth, buildingColors[buildingIndex % buildingColors.length], random);
      building.position.set(x + (random() - 0.5) * 0.12, GROUND_Y + 0.055, z + (random() - 0.5) * 0.12);
      building.rotation.y = -0.12;
      building.scale.setScalar(1.17);
      city.add(building);
      buildingIndex += 1;
    }
  }
  const hospital = createBuilding(0.72, 0.66, 0.52, '#f2eee0', random);
  const crossMaterial = standardMaterial('#f06449', { emissive: '#f06449', emissiveIntensity: 0.1 });
  const crossVertical = box(0.1, 0.3, 0.025, crossMaterial);
  crossVertical.position.set(0, 0.44, 0.275);
  const crossHorizontal = box(0.3, 0.1, 0.025, crossMaterial);
  crossHorizontal.position.copy(crossVertical.position);
  hospital.add(crossVertical, crossHorizontal);
  hospital.position.set(-6.3, GROUND_Y, 0.95);
  hospital.rotation.y = 0.18;
  city.add(hospital);
  const serviceRoad = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.55, GROUND_Y + 0.036, -1.5),
    new THREE.Vector3(2.05, GROUND_Y + 0.036, -0.95),
    new THREE.Vector3(1.92, GROUND_Y + 0.036, 0.15),
    new THREE.Vector3(2.5, GROUND_Y + 0.036, 1.22),
    new THREE.Vector3(3.85, GROUND_Y + 0.036, 1.2),
  ], false, 'centripetal');
  group.add(createRoad(serviceRoad, 0.34));
  const outskirts = createOutskirts(random);
  group.add(city, outskirts.group, createTrees([cityRoad, forestRoad, outskirts.road, serviceRoad]), createMountains(), createLake(), createHelipad());

  const cars: AnimatedCar[] = [];
  const carColors = ['#f06449', '#ffd166', '#f5f2df', '#4c87a8', '#9ed06a', '#e998b3'];
  for (let index = 0; index < 20; index += 1) {
    const root = createCar(carColors[index % carColors.length]);
    const cityCar = index < 13;
    cars.push({
      root,
      curve: cityCar ? cityRoad : forestRoad,
      offset: (cityCar ? index : index - 13) / (cityCar ? 13 : 7),
      speed: 0.018 + random() * 0.01,
    });
    group.add(root);
  }
  const emergency = createEmergencyWorld(cityRoad, serviceRoad);
  group.add(emergency.group);

  const clouds: AnimatedCloud[] = [];
  for (let index = 0; index < 18; index += 1) {
    const cloud = createCloud(0.75 + random() * 0.65, random);
    clouds.push({
      root: cloud,
      x: -12 + random() * 24,
      y: 8 + random() * 3,
      z: -6 + random() * 11,
      speed: 0.13 + random() * 0.12,
    });
    cloud.rotation.y = random() * Math.PI;
    group.add(cloud);
  }

  const turbines: AnimatedTurbine[] = [];
  for (const [x, z] of [[-0.3, -5.25], [0.75, -5.35], [1.65, -4.95]]) {
    const turbine = createTurbine();
    turbine.root.position.set(x, GROUND_Y, z);
    turbine.root.rotation.y = -0.45;
    turbines.push({ rotor: turbine.rotor, speed: 0.65 + random() * 0.4 });
    group.add(turbine.root);
  }

  const fires = FIRE_SITES.map((site) => createFireSite(site.x, site.z, site.scale));
  group.add(...fires.map((fire) => fire.root));

  const update = (elapsed: number) => {
    for (const car of cars) {
      const t = (car.offset + elapsed * car.speed) % 1;
      const position = car.curve.getPointAt(t);
      position.y += 0.035;
      car.root.position.copy(position);
      const tangent = car.curve.getTangentAt(t);
      car.root.rotation.y = Math.atan2(tangent.x, tangent.z);
    }
    emergency.update(elapsed);
    for (const cloud of clouds) {
      cloud.root.position.set(((cloud.x + elapsed * cloud.speed + 12) % 24) - 12, cloud.y, cloud.z);
    }
    for (const turbine of turbines) turbine.rotor.rotation.z = elapsed * turbine.speed;
    for (const fire of fires) {
      fire.flames.forEach((flame, index) => {
        flame.scale.y = 0.88 + Math.sin(elapsed * 5 + index * 1.7 + fire.root.position.x) * 0.22;
      });
      fire.smoke.forEach((puff, index) => {
        const rise = (elapsed * 0.22 + index * 0.2) % 1.65;
        const size = 0.72 + rise * 0.38;
        puff.position.set(Math.sin(elapsed * 0.35 + index) * 0.12 + rise * 0.16, 0.4 + rise, Math.cos(index) * 0.09);
        puff.scale.set(0.2 * size, 0.17 * size, 0.18 * size);
      });
      fire.splashes.forEach((splash, index) => {
        const spread = 0.65 + ((elapsed * 1.6 + index * 0.17) % 1) * 0.9;
        splash.scale.set(spread, 1, spread);
      });
    }
  };

  update(0);
  return { group, update };
}
