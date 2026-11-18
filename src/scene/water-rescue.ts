import * as THREE from 'three';
import { ellipsoid, makeMesh, standardMaterial } from './primitives';

export interface WaterRescueRig {
  update: (elapsed: number, delta: number, root: THREE.Group) => void;
}

export function createWaterRescueRig(root: THREE.Group): WaterRescueRig {
  const metal = standardMaterial('#879c99', { metalness: 0.22, roughness: 0.4 });
  const orange = standardMaterial('#f06449');
  const waterMaterial = standardMaterial('#79dbeb', {
    emissive: '#3baac1',
    emissiveIntensity: 0.24,
    transparent: true,
    opacity: 0.86,
    roughness: 0.18,
  });
  const rope = makeMesh(new THREE.CylinderGeometry(0.013, 0.013, 1, 7), metal);
  const bucket = new THREE.Group();
  const shell = makeMesh(new THREE.CylinderGeometry(0.19, 0.135, 0.27, 10), orange);
  const rim = makeMesh(new THREE.TorusGeometry(0.19, 0.018, 6, 16), metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.135;
  const handle = makeMesh(new THREE.TorusGeometry(0.15, 0.012, 6, 16, Math.PI), metal);
  handle.position.y = 0.16;
  const fill = makeMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 12), waterMaterial, false, false);
  fill.position.y = 0.09;
  bucket.add(shell, rim, handle, fill);
  root.add(rope, bucket);

  const streamMaterial = waterMaterial.clone();
  streamMaterial.opacity = 0.34;
  const stream = makeMesh(new THREE.CylinderGeometry(0.035, 0.075, 2.4, 8), streamMaterial, false, false);
  root.add(stream);
  const drops: THREE.Mesh[] = [];
  for (let index = 0; index < 32; index += 1) {
    const drop = ellipsoid(0.029, 0.075, 0.029, waterMaterial, 0);
    drop.castShadow = false;
    root.add(drop);
    drops.push(drop);
  }

  const pond = new THREE.Vector3(4.05, 2.28, -2.3);
  const fire = new THREE.Vector3(6.1, 3.25, 3.6);
  let previousPosition = pond.clone();
  const update = (elapsed: number, delta: number, helicopter: THREE.Group) => {
    const progress = (elapsed % 24) / 24;
    let collecting = false;
    let dropping = false;
    let bucketY = -0.95;
    if (progress < 0.2) {
      helicopter.position.copy(pond);
      helicopter.position.y += Math.sin(elapsed * 1.5) * 0.018;
      helicopter.rotation.y = 0.8;
      bucketY = -2.5;
      collecting = true;
    } else if (progress < 0.26) {
      const lift = THREE.MathUtils.smoothstep(progress, 0.2, 0.26);
      helicopter.position.copy(pond);
      helicopter.position.y += lift * 2.57;
      bucketY = THREE.MathUtils.lerp(-2.5, -0.95, lift);
    } else if (progress < 0.5) {
      const travel = THREE.MathUtils.smoothstep(progress, 0.26, 0.5);
      helicopter.position.lerpVectors(pond, fire, travel);
      helicopter.position.y = 4.85 + Math.sin(travel * Math.PI) * 0.35
        - THREE.MathUtils.smoothstep(progress, 0.43, 0.5) * 1.6;
    } else if (progress < 0.66) {
      helicopter.position.copy(fire);
      helicopter.position.y += Math.sin(elapsed * 1.3) * 0.025;
      helicopter.rotation.y = -0.35;
      dropping = true;
    } else if (progress < 0.74) {
      helicopter.position.copy(fire);
      helicopter.position.y += THREE.MathUtils.smoothstep(progress, 0.66, 0.74) * 1.6;
    } else {
      const travel = THREE.MathUtils.smoothstep(progress, 0.74, 1);
      helicopter.position.lerpVectors(fire, pond, travel);
      helicopter.position.y = 4.85 - THREE.MathUtils.smoothstep(progress, 0.92, 1) * 2.57;
      bucketY = THREE.MathUtils.lerp(-0.95, -2.5, THREE.MathUtils.smoothstep(progress, 0.92, 1));
    }
    const direction = helicopter.position.clone().sub(previousPosition);
    if (delta > 0 && direction.x * direction.x + direction.z * direction.z > 0.00001) {
      const yaw = Math.atan2(direction.x, direction.z);
      const difference = Math.atan2(Math.sin(yaw - helicopter.rotation.y), Math.cos(yaw - helicopter.rotation.y));
      helicopter.rotation.y += difference * Math.min(1, delta * 4);
    }
    previousPosition.copy(helicopter.position);
    bucket.position.y = bucketY;
    const ropeLength = Math.max(0.1, -bucketY - 0.34);
    rope.scale.y = ropeLength;
    rope.position.y = (-0.34 + bucketY) / 2;
    fill.visible = progress >= 0.06 && progress < 0.64;
    stream.visible = collecting || dropping;
    stream.position.y = collecting ? -2.77 : -2.05;
    stream.scale.y = collecting ? 0.25 : 1;
    drops.forEach((drop, index) => {
      drop.visible = collecting || dropping;
      if (collecting) {
        const rise = (elapsed * 0.8 + index / drops.length) % 1;
        drop.position.set(Math.sin(index * 2.4) * 0.08, -2.56 + rise * 0.4, Math.cos(index * 2.4) * 0.08);
      } else {
        drop.position.y -= delta * 3.1;
        if (drop.position.y < -3.88 || !dropping) drop.position.y = -1.05 - (index % 5) * 0.065;
        drop.position.x = (index % 4 - 1.5) * 0.05;
        drop.position.z = (index % 3 - 1) * 0.045;
      }
    });
  };
  update(0, 0, root);
  return { update };
}
