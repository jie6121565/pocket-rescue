import * as THREE from 'three';
import { ellipsoid, makeMesh, standardMaterial } from './primitives';
import { STARFISH_SPEECH } from './types';
import type { HelicopterUnit } from './helicopters';

export interface StarfishWorld {
  group: THREE.Group;
  active: THREE.Group;
  saved: THREE.Group;
  update: (elapsed: number, unit: HelicopterUnit) => void;
}

function createStarfish() {
  const root = new THREE.Group();
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 0.36 : 0.16;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const body = makeMesh(new THREE.ExtrudeGeometry(shape, {
    depth: 0.075,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 4,
  }), standardMaterial('#f49a70', { roughness: 0.68 }));
  body.rotation.x = -Math.PI / 2;
  root.add(body);
  const dark = standardMaterial('#263b40');
  for (const x of [-0.055, 0.055]) {
    const eye = ellipsoid(0.018, 0.018, 0.018, dark, 1);
    eye.position.set(x, 0.112, 0.055);
    root.add(eye);
    const cheek = ellipsoid(0.022, 0.009, 0.016, standardMaterial('#f27772'), 1);
    cheek.position.set(x * 1.7, 0.109, 0.01);
    root.add(cheek);
  }
  const smile = makeMesh(new THREE.TorusGeometry(0.036, 0.006, 6, 14, Math.PI), dark, false, false);
  smile.rotation.x = -Math.PI / 2;
  smile.position.set(0, 0.113, -0.015);
  root.add(smile);
  root.scale.setScalar(0.68);
  root.traverse((child) => { child.userData.speechId = 'starfish'; });
  return root;
}

export function createStarfishWorld(onSpeak: (text: string, language: 'zh-CN') => void): StarfishWorld {
  const group = new THREE.Group();
  const active = createStarfish();
  const saved = new THREE.Group();
  const ripple = makeMesh(
    new THREE.TorusGeometry(0.36, 0.012, 6, 32),
    new THREE.MeshBasicMaterial({ color: '#b2f5e7', transparent: true, opacity: 0.58, depthWrite: false }),
    false,
    false,
  );
  ripple.rotation.x = Math.PI / 2;
  ripple.position.y = 0.505;
  const sanctuarySand = ellipsoid(0.76, 0.025, 0.5, standardMaterial('#d9ca94'), 2);
  sanctuarySand.position.set(5.5, 0.485, -3.75);
  const sanctuaryWater = ellipsoid(0.58, 0.015, 0.34, standardMaterial('#42bdd0', { roughness: 0.22 }), 2);
  sanctuaryWater.position.set(5.5, 0.507, -3.75);
  sanctuarySand.userData.speechId = 'starfish';
  sanctuaryWater.userData.speechId = 'starfish';
  group.add(saved, active, ripple, sanctuarySand, sanctuaryWater);
  let state: 'waiting' | 'carried' | 'delivered' = 'waiting';
  let announced = false;
  const sanctuary = [
    new THREE.Vector3(5.25, 0.535, -3.55),
    new THREE.Vector3(5.75, 0.535, -3.6),
    new THREE.Vector3(5.5, 0.535, -3.95),
  ];
  const savedStarfish: THREE.Group[] = [];
  return {
    group,
    active,
    saved,
    update: (elapsed, unit) => {
      if (!unit.waterRescue) return;
      const { stage, missionTime } = unit.flight;
      if (stage === 'mission' && missionTime < 3.2) {
        state = 'waiting';
        announced = false;
      } else if (stage === 'mission' && state === 'waiting') {
        state = 'carried';
      }
      unit.waterRescue.setCarryingStarfish(state === 'carried');
      if (state === 'waiting') {
        active.visible = true;
        active.position.set(4.4, 0.57 + Math.sin(elapsed * 1.8) * 0.035, -2.65);
        active.rotation.y = Math.sin(elapsed * 0.8) * 0.28;
        ripple.visible = true;
        ripple.scale.setScalar(0.95 + Math.sin(elapsed * 2) * 0.08);
      } else {
        ripple.visible = false;
      }
      if (state === 'carried' && ['mission', 'inbound', 'align', 'landing'].includes(stage)) {
        active.visible = true;
        unit.root.updateWorldMatrix(true, true);
        unit.waterRescue.bucket.getWorldPosition(active.position);
        active.position.y += 0.13;
        active.rotation.y = elapsed * 0.55;
      }
      if (state === 'carried' && (stage === 'spool-down' || stage === 'shutdown')) {
        const rescued = active.clone(true);
        rescued.position.copy(sanctuary[savedStarfish.length % sanctuary.length]);
        saved.add(rescued);
        savedStarfish.push(rescued);
        if (savedStarfish.length > sanctuary.length) {
          const oldest = savedStarfish.shift();
          if (oldest) saved.remove(oldest);
        }
        active.visible = false;
        state = 'delivered';
        unit.waterRescue.setCarryingStarfish(false);
        if (!announced) {
          onSpeak(STARFISH_SPEECH, 'zh-CN');
          announced = true;
        }
      }
    },
  };
}
