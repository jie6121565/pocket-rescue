import * as THREE from 'three';

export const UP = new THREE.Vector3(0, 1, 0);
export const GROUND_Y = 0.46;

export function standardMaterial(color: string | number, options: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0,
    flatShading: true,
    ...options,
  });
}

export function makeMesh<T extends THREE.Material | THREE.Material[]>(
  geometry: THREE.BufferGeometry,
  material: T,
  castShadow = true,
  receiveShadow = true,
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

export function box(width: number, height: number, depth: number, material: THREE.Material) {
  return makeMesh(new THREE.BoxGeometry(width, height, depth), material);
}

export function ellipsoid(
  radiusX: number,
  radiusY: number,
  radiusZ: number,
  material: THREE.Material,
  detail = 1,
) {
  const mesh = makeMesh(new THREE.IcosahedronGeometry(1, detail), material);
  mesh.scale.set(radiusX, radiusY, radiusZ);
  return mesh;
}

export function cylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 8,
) {
  const direction = end.clone().sub(start);
  const mesh = makeMesh(new THREE.CylinderGeometry(radius, radius, direction.length(), segments), material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
}

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
