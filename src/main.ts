import './style.css';
import {
  createIcons,
  Map as MapIcon,
  Navigation,
  CarFront,
  Wind,
  X,
  Radio,
  LifeBuoy,
  Flame,
  ShieldCheck,
  Package,
  ChevronRight,
  MousePointer2,
  Compass,
  Pause,
  Play,
  Plus,
  Minus,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide';
import { RescueScene } from './scene/RescueScene';
import { RotorAudio } from './RotorAudio';
import { SpeechGuide } from './SpeechGuide';
import { FLEET, MISSION_META } from './scene/types';
import type { HelicopterInfo, MissionType } from './scene/types';

const icons = {
  Map: MapIcon,
  Navigation,
  CarFront,
  Wind,
  X,
  Radio,
  LifeBuoy,
  Flame,
  ShieldCheck,
  Package,
  ChevronRight,
  MousePointer2,
  Compass,
  Pause,
  Play,
  Plus,
  Minus,
  RotateCcw,
  Volume2,
  VolumeX,
};

function refreshIcons() {
  createIcons({ icons });
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
}

refreshIcons();

const missionTypes: MissionType[] = ['rescue', 'fire', 'police', 'transport'];
const fleetList = byId<HTMLDivElement>('fleet-list');
const typeCursors = new Map<MissionType, number>();
const fleetButtons = new Map<MissionType, HTMLButtonElement>();

for (const type of missionTypes) {
  const meta = MISSION_META[type];
  const count = FLEET.filter((item) => item.type === type).length;
  const button = document.createElement('button');
  button.className = 'fleet-item';
  button.style.setProperty('--mission-color', meta.color);
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', `定位${meta.label}，共 ${count} 架`);
  button.innerHTML = `
    <span class="fleet-icon" aria-hidden="true"><i data-lucide="${meta.icon}"></i></span>
    <span class="fleet-copy"><strong>${meta.shortLabel}</strong><small>${meta.summary}</small></span>
    <span class="fleet-count">${count} 架<i data-lucide="chevron-right" aria-hidden="true"></i></span>
  `;
  button.addEventListener('click', () => {
    const units = FLEET.filter((item) => item.type === type);
    const cursor = typeCursors.get(type) ?? 0;
    scene.focusHelicopter(units[cursor % units.length].id);
    typeCursors.set(type, cursor + 1);
    closeFleet();
  });
  fleetButtons.set(type, button);
  fleetList.appendChild(button);
}

const autoOrbitButton = byId<HTMLButtonElement>('auto-orbit');
const pauseButton = byId<HTMLButtonElement>('pause-motion');
const soundButton = byId<HTMLButtonElement>('sound-toggle');
const fleetPanel = byId<HTMLElement>('fleet-panel');
const fleetOpenButton = byId<HTMLButtonElement>('fleet-open');
const rotorAudio = new RotorAudio();
const speechGuide = new SpeechGuide(byId('speech-status'));
let autoRotate = false;
let paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let soundEnabled = false;
let soundBusy = false;

function updateSelection(info: HelicopterInfo | null) {
  for (const [type, button] of fleetButtons) {
    button.setAttribute('aria-pressed', String(info?.type === type));
  }
  rotorAudio.setFocused(info !== null);
}

function updatePauseUI() {
  document.body.classList.toggle('is-paused', paused);
  byId('live-label').textContent = paused ? '动态已暂停' : '小镇运转中';
  const footnote = document.querySelector<HTMLElement>('.fleet-footnote');
  if (footnote) {
    footnote.innerHTML = `<span class="pulse-ring" aria-hidden="true"></span>${paused ? '仍可环绕与缩放观察' : '所有飞行器实时巡航中'}`;
  }
  pauseButton.innerHTML = `<i data-lucide="${paused ? 'play' : 'pause'}" aria-hidden="true"></i><span>${paused ? '继续动态' : '暂停动态'}</span>`;
  pauseButton.setAttribute('aria-label', paused ? '继续小镇动态' : '暂停小镇动态');
  refreshIcons();
}

function updateSoundUI() {
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? '关闭救援音效' : '开启救援音效');
  soundButton.innerHTML = `<i data-lucide="${soundEnabled ? 'volume-2' : 'volume-x'}" aria-hidden="true"></i><span>${soundEnabled ? '关闭音效' : '开启音效'}</span>`;
  refreshIcons();
}

function closeFleet() {
  fleetPanel.classList.remove('is-open');
  fleetOpenButton.setAttribute('aria-expanded', 'false');
  if (fleetPanel.contains(document.activeElement)) fleetOpenButton.focus();
}

function showError(message?: string) {
  byId('loading-screen').classList.add('is-loaded');
  byId('error-screen').hidden = false;
  if (message) byId('error-message').textContent = message;
}

let scene: RescueScene;
try {
  scene = new RescueScene(byId('scene'), {
    onReady: () => {
      document.documentElement.dataset.sceneReady = 'true';
      byId('loading-screen').classList.add('is-loaded');
    },
    onSelect: updateSelection,
    onFollowChange: () => undefined,
    onSpeak: (text, language) => speechGuide.speak(text, language),
    onContextLost: () => showError('图形上下文已中断，请重新加载以恢复小镇。'),
  });
} catch (error: unknown) {
  console.error('Unable to initialize the rescue scene', error);
  showError();
  throw error;
}

scene.setPaused(paused);
updatePauseUI();
updateSoundUI();
refreshIcons();

byId('zoom-in').addEventListener('click', () => scene.zoom(0.8));
byId('zoom-out').addEventListener('click', () => scene.zoom(1.25));
byId('reset-view').addEventListener('click', () => scene.resetView());

autoOrbitButton.setAttribute('aria-label', '自动环绕');
autoOrbitButton.addEventListener('click', () => {
  autoRotate = !autoRotate;
  autoOrbitButton.setAttribute('aria-pressed', String(autoRotate));
  scene.setAutoRotate(autoRotate);
});

pauseButton.addEventListener('click', () => {
  paused = !paused;
  scene.setPaused(paused);
  updatePauseUI();
});

soundButton.addEventListener('click', async () => {
  if (soundBusy) return;
  soundBusy = true;
  soundButton.disabled = true;
  try {
    const next = !soundEnabled;
    await rotorAudio.setEnabled(next);
    soundEnabled = next;
    updateSoundUI();
  } catch (error: unknown) {
    console.error('Unable to control helicopter audio', error);
    soundButton.setAttribute('aria-label', '当前浏览器无法播放救援音效');
    soundButton.innerHTML = '<i data-lucide="volume-x" aria-hidden="true"></i><span>音效不可用</span>';
    refreshIcons();
  } finally {
    soundBusy = false;
    soundButton.disabled = false;
  }
});

fleetOpenButton.addEventListener('click', () => {
  const open = !fleetPanel.classList.contains('is-open');
  fleetPanel.classList.toggle('is-open', open);
  fleetOpenButton.setAttribute('aria-expanded', String(open));
});
byId('fleet-close').addEventListener('click', closeFleet);
byId('reload-page').addEventListener('click', () => window.location.reload());

byId('scene').addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    event.preventDefault();
    pauseButton.click();
  } else if (event.key === 'r' || event.key === 'R' || event.key === 'Escape') {
    scene.resetView();
  } else if (event.key === '+' || event.key === '=') {
    event.preventDefault();
    scene.zoom(0.8);
  } else if (event.key === '-') {
    event.preventDefault();
    scene.zoom(1.25);
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && fleetPanel.classList.contains('is-open')) closeFleet();
});

window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (event) => {
  paused = event.matches;
  scene.setPaused(paused);
  updatePauseUI();
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose();
    speechGuide.dispose();
    void rotorAudio.dispose();
  });
}
