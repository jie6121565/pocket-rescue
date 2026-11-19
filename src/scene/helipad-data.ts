export type HelipadKind = 'ground' | 'rooftop' | 'summit';

export interface HelipadDefinition {
  id: string;
  number: string;
  name: string;
  kind: HelipadKind;
  x: number;
  z: number;
  deckY: number;
  radius: number;
  yaw: number;
  shape?: 'circle' | 'octagon';
}

export const HELIPADS: HelipadDefinition[] = [
  { id: 'summit', number: '01', name: 'SUMMIT RESCUE', kind: 'summit', x: -3.2, z: -3.65, deckY: 3.18, radius: 0.88, yaw: 0.8 },
  { id: 'hospital-roof', number: '02', name: 'HOSPITAL', kind: 'rooftop', x: -6.3, z: 0.95, deckY: 1.46, radius: 0.67, yaw: 0.18 },
  { id: 'central', number: '03', name: 'CITY RESCUE', kind: 'ground', x: 0.9, z: 0.65, deckY: 0.57, radius: 0.72, yaw: 1.1 },
  { id: 'waterside', number: '04', name: 'WATER RESCUE', kind: 'ground', x: 5.2, z: -4.65, deckY: 0.57, radius: 0.96, yaw: -0.6 },
  { id: 'forest', number: '05', name: 'FIRE BASE', kind: 'ground', x: 1.65, z: 2.75, deckY: 0.57, radius: 0.98, yaw: -0.4 },
  { id: 'ranger', number: '06', name: 'RANGER', kind: 'ground', x: 1.6, z: -3.8, deckY: 0.57, radius: 0.77, yaw: 0.7 },
  { id: 'city-roof', number: '07', name: 'POLICE AIR', kind: 'rooftop', x: -3.74, z: 4.18, deckY: 2.48, radius: 0.72, yaw: -0.12 },
  { id: 'police-ground', number: '08', name: 'POLICE', kind: 'ground', x: -7.6, z: 3.6, deckY: 0.57, radius: 0.67, yaw: 0.2 },
  { id: 'logistics', number: '09', name: 'CARGO', kind: 'ground', x: -7.45, z: 5.65, deckY: 0.57, radius: 1.18, yaw: -0.25, shape: 'octagon' },
];

export function getHelipad(id: string) {
  const pad = HELIPADS.find((candidate) => candidate.id === id);
  if (!pad) throw new Error(`Unknown helipad: ${id}`);
  return pad;
}
