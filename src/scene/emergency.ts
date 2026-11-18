import * as THREE from 'three';
import { box, cylinderBetween, ellipsoid, GROUND_Y, makeMesh, standardMaterial } from './primitives';

interface EmergencyWorld {
  group: THREE.Group;
  update: (elapsed: number) => void;
}

function markSpeakable(root: THREE.Group, id: string) {
  root.traverse((child) => {
    child.userData.speechId = id;
  });
  return root;
}

function createSign(text: string, width: number, foreground: string, background: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.fillStyle = background;
  context.fillRect(0, 0, 512, 128);
  context.fillStyle = foreground;
  context.font = '700 58px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 256, 68, 480);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = makeMesh(
    new THREE.PlaneGeometry(width, width / 4),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
    false,
    false,
  );
  return sign;
}

function createPoliceStation() {
  const root = new THREE.Group();
  const cream = standardMaterial('#e8eee5');
  const blue = standardMaterial('#35678c');
  const dark = standardMaterial('#29464f');
  const glass = standardMaterial('#9fd3df', { roughness: 0.24 });
  const body = box(0.98, 0.55, 0.68, cream);
  body.position.y = 0.315;
  const base = box(1.08, 0.09, 0.77, blue);
  base.position.y = 0.045;
  const roof = box(1.09, 0.1, 0.77, blue);
  roof.position.y = 0.63;
  root.add(body, base, roof);
  const door = box(0.23, 0.37, 0.025, dark);
  door.position.set(0, 0.225, 0.352);
  root.add(door);
  for (const x of [-0.33, 0.33]) {
    const window = box(0.23, 0.23, 0.025, glass);
    window.position.set(x, 0.31, 0.352);
    root.add(window);
  }
  const sign = createSign('POLICE', 0.8, '#f4f2df', '#35678c');
  sign.position.set(0, 0.65, 0.394);
  root.add(sign);
  const badge = makeMesh(new THREE.OctahedronGeometry(0.12), standardMaterial('#ffd166'));
  badge.position.set(0, 0.83, 0);
  root.add(badge);
  const red = box(0.12, 0.065, 0.09, standardMaterial('#ff6556', { emissive: '#ff493d', emissiveIntensity: 0.6 }));
  const blueLight = box(0.12, 0.065, 0.09, standardMaterial('#6ccaff', { emissive: '#4aaef0', emissiveIntensity: 0.6 }));
  red.position.set(-0.32, 0.72, 0);
  blueLight.position.set(0.32, 0.72, 0);
  root.add(red, blueLight);
  root.position.set(-6.3, GROUND_Y + 0.02, 2.48);
  root.scale.setScalar(1.18);
  return markSpeakable(root, 'police-station');
}

function createFireStation() {
  const root = new THREE.Group();
  const cream = standardMaterial('#f1e4c8');
  const red = standardMaterial('#d95943');
  const trim = standardMaterial('#f7f0dc');
  const body = box(1.18, 0.6, 0.78, cream);
  body.position.y = 0.34;
  const base = box(1.29, 0.08, 0.88, red);
  base.position.y = 0.04;
  const roof = box(1.3, 0.1, 0.89, red);
  roof.position.y = 0.69;
  root.add(body, base, roof);
  const garage = box(0.76, 0.43, 0.025, red);
  garage.position.set(0, 0.265, 0.402);
  root.add(garage);
  for (let index = 0; index < 5; index += 1) {
    const slat = box(0.7, 0.018, 0.012, trim);
    slat.position.set(0, 0.095 + index * 0.085, 0.421);
    root.add(slat);
  }
  for (const x of [-0.46, 0.46]) {
    const column = box(0.075, 0.49, 0.045, trim);
    column.position.set(x, 0.29, 0.414);
    root.add(column);
  }
  const sign = createSign('FIRE RESCUE', 0.99, '#fff4d9', '#c84c38');
  sign.position.set(0, 0.64, 0.449);
  root.add(sign);
  const tower = box(0.26, 0.3, 0.28, cream);
  tower.position.set(-0.36, 0.86, -0.13);
  const bell = makeMesh(new THREE.ConeGeometry(0.09, 0.12, 10), standardMaterial('#ffd166'));
  bell.position.set(-0.36, 1.04, -0.13);
  root.add(tower, bell);
  const beacon = ellipsoid(0.07, 0.055, 0.07, standardMaterial('#ff6650', { emissive: '#ff493d', emissiveIntensity: 0.65 }), 1);
  beacon.position.set(0.32, 0.78, 0);
  root.add(beacon);
  root.position.set(3, GROUND_Y + 0.02, -0.02);
  return markSpeakable(root, 'fire-station');
}

function addWheels(root: THREE.Group, halfWidth: number, halfLength: number, radius: number) {
  const tire = standardMaterial('#1d292d');
  for (const x of [-halfWidth, halfWidth]) {
    for (const z of [-halfLength, halfLength]) {
      const wheel = makeMesh(new THREE.CylinderGeometry(radius, radius, 0.06, 10), tire);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, radius, z);
      root.add(wheel);
    }
  }
}

function createPoliceCar() {
  const root = new THREE.Group();
  const white = standardMaterial('#e9eee7');
  const blue = standardMaterial('#315f83');
  const body = box(0.28, 0.13, 0.52, white);
  body.position.y = 0.13;
  const stripe = box(0.294, 0.05, 0.34, blue);
  stripe.position.set(0, 0.12, -0.03);
  const cabin = box(0.24, 0.12, 0.28, standardMaterial('#a9d9df', { roughness: 0.24 }));
  cabin.position.set(0, 0.25, -0.025);
  const roof = box(0.25, 0.035, 0.2, white);
  roof.position.set(0, 0.327, -0.025);
  root.add(body, stripe, cabin, roof);
  addWheels(root, 0.155, 0.16, 0.065);
  const red = box(0.09, 0.045, 0.08, standardMaterial('#ff5d52', { emissive: '#ff493d', emissiveIntensity: 0.8 }));
  const blueLight = box(0.09, 0.045, 0.08, standardMaterial('#67c7ff', { emissive: '#4aaef0', emissiveIntensity: 0.8 }));
  red.position.set(-0.057, 0.37, -0.025);
  blueLight.position.set(0.057, 0.37, -0.025);
  root.add(red, blueLight);
  const bumper = box(0.27, 0.045, 0.045, blue);
  bumper.position.set(0, 0.08, 0.275);
  root.add(bumper);
  root.scale.setScalar(1.35);
  return { root: markSpeakable(root, 'police-car'), flashers: [red, blueLight] };
}

function createFireEngine() {
  const root = new THREE.Group();
  const red = standardMaterial('#dc513c');
  const cream = standardMaterial('#f0e5c7');
  const metal = standardMaterial('#aebcb8', { metalness: 0.25, roughness: 0.44 });
  const glass = standardMaterial('#91ccd9', { roughness: 0.22 });
  const body = box(0.42, 0.24, 0.85, red);
  body.position.y = 0.23;
  const cabin = box(0.42, 0.27, 0.29, red);
  cabin.position.set(0, 0.43, 0.27);
  const windshield = box(0.33, 0.15, 0.022, glass);
  windshield.position.set(0, 0.47, 0.425);
  const sideWindow = box(0.43, 0.11, 0.18, glass);
  sideWindow.position.set(0, 0.48, 0.25);
  root.add(body, cabin, windshield, sideWindow);
  for (const z of [-0.2, -0.04, 0.12]) {
    const shutter = box(0.432, 0.16, 0.135, cream);
    shutter.position.set(0, 0.29, z);
    root.add(shutter);
  }
  addWheels(root, 0.24, 0.26, 0.092);
  for (const x of [-0.11, 0.11]) {
    root.add(cylinderBetween(new THREE.Vector3(x, 0.63, -0.42), new THREE.Vector3(x, 0.63, 0.15), 0.019, metal));
  }
  for (let index = 0; index < 7; index += 1) {
    root.add(cylinderBetween(
      new THREE.Vector3(-0.11, 0.63, -0.4 + index * 0.085),
      new THREE.Vector3(0.11, 0.63, -0.4 + index * 0.085),
      0.015,
      metal,
    ));
  }
  root.add(cylinderBetween(new THREE.Vector3(0, 0.42, 0.31), new THREE.Vector3(0, 0.62, 0.48), 0.035, metal));
  const redLight = box(0.11, 0.045, 0.07, standardMaterial('#ff5d52', { emissive: '#ff493d', emissiveIntensity: 0.8 }));
  const blueLight = box(0.11, 0.045, 0.07, standardMaterial('#67c7ff', { emissive: '#4aaef0', emissiveIntensity: 0.8 }));
  redLight.position.set(-0.12, 0.6, 0.28);
  blueLight.position.set(0.12, 0.6, 0.28);
  root.add(redLight, blueLight);
  root.position.set(3.85, GROUND_Y + 0.05, 1.2);
  root.rotation.y = Math.atan2(4.6 - 3.85, 2.1 - 1.2);
  return { root: markSpeakable(root, 'fire-engine'), flashers: [redLight, blueLight] };
}

function createWaterJet(origin: THREE.Vector3, target: THREE.Vector3, lift: number, reverse = false) {
  const control = origin.clone().lerp(target, 0.5).add(new THREE.Vector3(0, lift, 0));
  const curve = new THREE.QuadraticBezierCurve3(origin, control, target);
  const group = new THREE.Group();
  const material = standardMaterial('#8be4ef', {
    emissive: '#42bdd0',
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.76,
    roughness: 0.2,
  });
  const streamMaterial = material.clone();
  streamMaterial.opacity = 0.26;
  const stream = makeMesh(new THREE.TubeGeometry(curve, 24, 0.022, 6, false), streamMaterial, false, false);
  group.add(stream);
  const drops: THREE.Mesh[] = [];
  for (let index = 0; index < 36; index += 1) {
    const drop = ellipsoid(0.025, 0.036, 0.025, material, 0);
    drop.castShadow = false;
    group.add(drop);
    drops.push(drop);
  }
  group.traverse((child) => {
    child.raycast = () => undefined;
  });
  return {
    group,
    update: (elapsed: number) => {
      if (!group.visible) return;
      drops.forEach((drop, index) => {
        const progress = (elapsed * 1.2 + index / drops.length) % 1;
        drop.position.copy(curve.getPoint(reverse ? 1 - progress : progress));
      });
    },
  };
}

export function createEmergencyWorld(road: THREE.CatmullRomCurve3, serviceRoad: THREE.CatmullRomCurve3): EmergencyWorld {
  const group = new THREE.Group();
  const policeCar = createPoliceCar();
  const fireEngine = createFireEngine();
  const fireYaw = fireEngine.root.rotation.y;
  fireEngine.root.updateMatrixWorld(true);
  const fireOrigin = fireEngine.root.localToWorld(new THREE.Vector3(0, 0.62, 0.48));
  const fireTarget = new THREE.Vector3(4.6, GROUND_Y + 0.17, 2.1);
  const fireJet = createWaterJet(fireOrigin, fireTarget, 0.52);
  fireEngine.root.position.set(2.55, GROUND_Y + 0.05, -1.5);
  fireEngine.root.rotation.y = Math.atan2(4.05 - 2.55, -2.3 + 1.5);
  fireEngine.root.updateMatrixWorld(true);
  const pondOrigin = new THREE.Vector3(3.3, GROUND_Y + 0.09, -1.95);
  const tank = fireEngine.root.localToWorld(new THREE.Vector3(0, 0.44, -0.16));
  const pondJet = createWaterJet(pondOrigin, tank, 0.25, true);
  fireEngine.root.position.set(3.85, GROUND_Y + 0.05, 1.2);
  fireEngine.root.rotation.y = fireYaw;
  group.add(createPoliceStation(), createFireStation(), policeCar.root, fireEngine.root, fireJet.group, pondJet.group);
  return {
    group,
    update: (elapsed: number) => {
      const t = (0.38 + elapsed * 0.024) % 1;
      policeCar.root.position.copy(road.getPointAt(t));
      policeCar.root.position.y += 0.035;
      const tangent = road.getTangentAt(t);
      policeCar.root.rotation.y = Math.atan2(tangent.x, tangent.z);
      const progress = (elapsed % 32) / 32;
      if (progress < 0.2 || progress >= 0.7) {
        fireEngine.root.position.copy(serviceRoad.getPointAt(1));
        fireEngine.root.position.y += 0.014;
        fireEngine.root.rotation.y = fireYaw;
      } else if (progress < 0.36) {
        const travel = THREE.MathUtils.smoothstep(progress, 0.2, 0.36);
        fireEngine.root.position.copy(serviceRoad.getPointAt(1 - travel));
        fireEngine.root.position.y += 0.014;
        const direction = serviceRoad.getTangentAt(1 - travel).negate();
        fireEngine.root.rotation.y = Math.atan2(direction.x, direction.z);
      } else if (progress < 0.54) {
        fireEngine.root.position.copy(serviceRoad.getPointAt(0));
        fireEngine.root.position.y += 0.014;
        fireEngine.root.rotation.y = Math.atan2(4.05 - 2.55, -2.3 + 1.5);
      } else {
        const travel = THREE.MathUtils.smoothstep(progress, 0.54, 0.7);
        fireEngine.root.position.copy(serviceRoad.getPointAt(travel));
        fireEngine.root.position.y += 0.014;
        const direction = serviceRoad.getTangentAt(travel);
        fireEngine.root.rotation.y = Math.atan2(direction.x, direction.z);
      }
      fireJet.group.visible = progress < 0.2 || progress >= 0.7;
      pondJet.group.visible = progress >= 0.36 && progress < 0.54;
      const flash = Math.sin(elapsed * 12) > 0;
      for (const vehicle of [policeCar, fireEngine]) {
        vehicle.flashers[0].visible = flash;
        vehicle.flashers[1].visible = !flash;
      }
      fireJet.update(elapsed);
      pondJet.update(elapsed);
    },
  };
}
