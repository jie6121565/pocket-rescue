import * as THREE from 'three';
import { HELIPADS } from './helipad-data';
import type { HelipadDefinition } from './helipad-data';
import type { HelicopterUnit } from './helicopters';
import { GROUND_Y, box, cylinderBetween, ellipsoid, makeMesh, standardMaterial } from './primitives';

interface PadVisual {
  definition: HelipadDefinition;
  lights: THREE.InstancedMesh;
  washes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>[];
  windsock?: THREE.Group;
}

export interface HelipadWorld {
  group: THREE.Group;
  update: (elapsed: number, units: HelicopterUnit[]) => void;
}

function createMarkings(pad: HelipadDefinition) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.strokeStyle = '#f3cf72';
  context.fillStyle = '#f6e7b3';
  context.lineWidth = 14;
  context.beginPath();
  context.arc(256, 256, 224, 0, Math.PI * 2);
  context.stroke();
  context.font = '700 220px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('H', 256, 268);
  context.font = '700 44px sans-serif';
  context.fillText(pad.number, 256, 74);
  context.font = '700 25px sans-serif';
  context.fillText(pad.name, 256, 451, 390);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  const markings = makeMesh(
    new THREE.PlaneGeometry(pad.radius * 1.8, pad.radius * 1.8),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    false,
    false,
  );
  markings.rotation.x = -Math.PI / 2;
  markings.position.y = 0.009;
  return markings;
}

function createFacade() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable');
  context.fillStyle = '#668c9b';
  context.fillRect(0, 0, 128, 256);
  for (let floor = 0; floor < 7; floor += 1) {
    context.fillStyle = '#52717e';
    context.fillRect(0, floor * 36 + 30, 128, 4);
    for (let column = 0; column < 3; column += 1) {
      context.fillStyle = (floor + column) % 3 === 0 ? '#e9d995' : '#b7dfe5';
      context.fillRect(13 + column * 39, floor * 36 + 8, 23, 17);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.42, side: THREE.DoubleSide });
}

function addRailing(root: THREE.Group, radius: number) {
  const material = standardMaterial('#a2b7b2', { metalness: 0.3, roughness: 0.48 });
  const edge = radius * 1.04;
  for (const side of [-1, 1]) {
    root.add(cylinderBetween(new THREE.Vector3(-edge, 0.22, side * edge), new THREE.Vector3(edge, 0.22, side * edge), 0.012, material, 6));
    root.add(cylinderBetween(new THREE.Vector3(side * edge, 0.22, -edge), new THREE.Vector3(side * edge, 0.22, edge), 0.012, material, 6));
    for (const other of [-1, 0, 1]) {
      root.add(cylinderBetween(new THREE.Vector3(other * edge, 0, side * edge), new THREE.Vector3(other * edge, 0.22, side * edge), 0.013, material, 6));
      root.add(cylinderBetween(new THREE.Vector3(side * edge, 0, other * edge), new THREE.Vector3(side * edge, 0.22, other * edge), 0.013, material, 6));
    }
  }
}

function addStructure(root: THREE.Group, pad: HelipadDefinition) {
  const steel = standardMaterial('#688984', { metalness: 0.28, roughness: 0.5 });
  if (pad.kind === 'summit') {
    for (const x of [-0.56, 0.56]) {
      for (const z of [-0.56, 0.56]) {
        const top = new THREE.Vector3(x * pad.radius, -0.12, z * pad.radius);
        const foot = new THREE.Vector3(x * pad.radius * 1.12, -1.58, z * pad.radius * 1.12);
        root.add(cylinderBetween(foot, top, 0.045, steel));
        const anchor = ellipsoid(0.13, 0.075, 0.13, standardMaterial('#777e6c'), 0);
        anchor.position.copy(foot);
        root.add(anchor);
      }
    }
    root.add(cylinderBetween(new THREE.Vector3(-0.52, -1.1, -0.52), new THREE.Vector3(0.52, -0.12, -0.52), 0.022, steel));
    root.add(cylinderBetween(new THREE.Vector3(0.52, -1.1, 0.52), new THREE.Vector3(-0.52, -0.12, 0.52), 0.022, steel));
    addRailing(root, pad.radius * 0.94);
  }
  if (pad.id === 'hospital-roof') {
    const slab = box(pad.radius * 2.18, 0.12, pad.radius * 2.18, steel);
    slab.position.y = -0.12;
    root.add(slab);
    for (const x of [-0.47, 0.47]) {
      for (const z of [-0.47, 0.47]) {
        root.add(cylinderBetween(new THREE.Vector3(x, GROUND_Y - pad.deckY, z), new THREE.Vector3(x, -0.14, z), 0.04, steel));
      }
    }
    addRailing(root, pad.radius);
  }
  if (pad.id === 'city-roof') {
    const building = new THREE.Group();
    const height = 1.75;
    const body = box(1.16, height, 1.16, standardMaterial('#668c9b'));
    body.position.y = height / 2;
    building.add(body);
    const facade = createFacade();
    const front = makeMesh(new THREE.PlaneGeometry(1.08, 1.58), facade, false, false);
    front.position.set(0, 0.9, 0.586);
    const side = makeMesh(new THREE.PlaneGeometry(1.08, 1.58), facade, false, false);
    side.position.set(0.586, 0.9, 0);
    side.rotation.y = Math.PI / 2;
    building.add(front, side);
    const roof = box(1.28, 0.1, 1.28, standardMaterial('#456670'));
    roof.position.y = height + 0.05;
    building.add(roof);
    building.position.y = GROUND_Y + 0.055 - pad.deckY;
    root.add(building);
    const support = box(pad.radius * 2.18, 0.16, pad.radius * 2.18, steel);
    support.position.y = -0.13;
    root.add(support);
    addRailing(root, pad.radius);
    root.add(cylinderBetween(new THREE.Vector3(-0.58, -0.3, -0.58), new THREE.Vector3(-0.58, 0.5, -0.58), 0.016, steel, 6));
  }
}

function createWindsock() {
  const root = new THREE.Group();
  const metal = standardMaterial('#90a8a2', { metalness: 0.25, roughness: 0.45 });
  root.add(cylinderBetween(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.54, 0), 0.012, metal, 6));
  const sock = new THREE.Group();
  sock.position.y = 0.53;
  const cloth = makeMesh(new THREE.CylinderGeometry(0.025, 0.063, 0.3, 8, 1, true), standardMaterial('#f06449', { side: THREE.DoubleSide }), false, false);
  cloth.rotation.z = -Math.PI / 2;
  cloth.position.x = 0.17;
  const stripe = makeMesh(new THREE.CylinderGeometry(0.044, 0.052, 0.075, 8, 1, true), standardMaterial('#fff0cf', { side: THREE.DoubleSide }), false, false);
  stripe.rotation.z = -Math.PI / 2;
  stripe.position.x = 0.12;
  sock.add(cloth, stripe);
  root.add(sock);
  return { root, sock };
}

function createPad(pad: HelipadDefinition): PadVisual & { root: THREE.Group } {
  const root = new THREE.Group();
  root.position.set(pad.x, pad.deckY, pad.z);
  const segments = pad.shape === 'octagon' ? 8 : 48;
  const base = makeMesh(new THREE.CylinderGeometry(pad.radius, pad.radius * 1.035, 0.12, segments), standardMaterial('#334e54'), false, true);
  base.position.y = -0.06;
  const skirt = makeMesh(new THREE.CylinderGeometry(pad.radius * 1.04, pad.radius * 1.08, 0.065, segments), standardMaterial('#b1b59a'), false, true);
  skirt.position.y = -0.145;
  root.add(base, skirt, createMarkings(pad));
  addStructure(root, pad);

  const count = pad.radius > 1 ? 16 : 12;
  const lightMaterial = standardMaterial('#8fe39c', { emissive: '#62c972', emissiveIntensity: 1.2 });
  const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 6, 4), lightMaterial, count);
  const matrix = new THREE.Matrix4();
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    matrix.makeTranslation(Math.cos(angle) * pad.radius * 0.93, 0.038, Math.sin(angle) * pad.radius * 0.93);
    lights.setMatrixAt(index, matrix);
  }
  lights.instanceMatrix.needsUpdate = true;
  lights.castShadow = false;
  root.add(lights);

  const washes: PadVisual['washes'] = [];
  for (let index = 0; index < 3; index += 1) {
    const wash = makeMesh(
      new THREE.RingGeometry(pad.radius * 0.25, pad.radius * 0.275, 40),
      new THREE.MeshBasicMaterial({ color: '#d8e6b4', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      false,
      false,
    );
    wash.rotation.x = -Math.PI / 2;
    wash.position.y = 0.018 + index * 0.003;
    root.add(wash);
    washes.push(wash);
  }

  let windsock: THREE.Group | undefined;
  if (pad.kind === 'ground' && pad.radius > 0.7) {
    const wind = createWindsock();
    wind.root.position.set(pad.radius * 0.96, 0, -pad.radius * 0.8);
    wind.sock.rotation.y = -0.8;
    root.add(wind.root);
    windsock = wind.sock;
  }
  root.traverse((child) => { child.userData.speechId = `helipad-${pad.id}`; });
  return { root, definition: pad, lights, washes, windsock };
}

export function createHelipadWorld(): HelipadWorld {
  const group = new THREE.Group();
  const visuals = HELIPADS.map((definition) => createPad(definition));
  group.add(...visuals.map((visual) => visual.root));
  return {
    group,
    update: (elapsed, units) => {
      visuals.forEach((visual, index) => {
        const unit = units.find((candidate) => candidate.info.id === visual.definition.id || candidate.flight.padId === visual.definition.id);
        const pose = unit?.flight;
        const active = pose?.onPad && ['liftoff', 'align', 'landing', 'spool-up'].includes(pose.stage);
        const strength = active ? Math.max(0.12, Math.min(1, (pose.y - pose.contactY) / 1.4)) : 0;
        visual.washes.forEach((wash, ringIndex) => {
          const progress = (elapsed * 0.8 + ringIndex / visual.washes.length) % 1;
          wash.visible = strength > 0;
          wash.scale.setScalar(0.9 + progress * 2.6);
          wash.material.opacity = (1 - progress) * strength * 0.16;
        });
        const lightMaterial = visual.lights.material as THREE.MeshStandardMaterial;
        lightMaterial.color.set(pose?.onPad ? '#8fe39c' : '#f3cf72');
        lightMaterial.emissive.set(pose?.onPad ? '#62c972' : '#a88b38');
        lightMaterial.emissiveIntensity = 0.85 + Math.sin(elapsed * 3.2 + index * 0.7) * 0.35;
        if (visual.windsock) visual.windsock.rotation.z = Math.sin(elapsed * 1.7 + index) * 0.075;
      });
    },
  };
}
