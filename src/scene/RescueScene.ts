import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTerrainWorld } from './terrain';
import type { TerrainWorld } from './terrain';
import { createFleetWorld } from './helicopters';
import type { FleetWorld, HelicopterUnit } from './helicopters';
import { createHelipadWorld } from './helipads';
import type { HelipadWorld } from './helipads';
import { createStarfishWorld } from './starfish';
import type { StarfishWorld } from './starfish';
import type { HelicopterInfo } from './types';
import { SCENE_SPEECH, randomHelicopterGreeting } from './types';

interface RescueSceneOptions {
  onReady: () => void;
  onSelect: (info: HelicopterInfo | null) => void;
  onFollowChange: (following: boolean) => void;
  onSpeak: (text: string, language?: 'en-US' | 'zh-CN') => void;
  onContextLost: () => void;
}

export class RescueScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly terrain: TerrainWorld;
  private readonly helipads: HelipadWorld;
  private readonly fleet: FleetWorld;
  private readonly starfish: StarfishWorld;
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly options: RescueSceneOptions;
  private animationFrame = 0;
  private elapsed = 0;
  private paused = false;
  private autoRotate = false;
  private ready = false;
  private selected: HelicopterUnit | null = null;
  private following = false;
  private resetting = false;
  private readonly pointerStart = new THREE.Vector2();
  private readonly activePointers = new Set<number>();
  private tapCancelled = false;
  private readonly coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  private homePosition = new THREE.Vector3();
  private readonly homeTarget = new THREE.Vector3(0, 1.2, 0);

  constructor(private readonly container: HTMLElement, options: RescueSceneOptions) {
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.coarsePointer ? 1.5 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);

    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '卡通救援小镇三维视图。单指拖动环绕，双指缩放与旋转，轻点设施、车辆或停机坪听英语介绍，轻点直升机听中文问候。');
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    container.appendChild(canvas);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 180);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = this.coarsePointer ? 0.09 : 0.065;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = this.coarsePointer ? 0.72 : 0.62;
    this.controls.zoomSpeed = this.coarsePointer ? 0.45 : 0.82;
    this.controls.touches.ONE = THREE.TOUCH.ROTATE;
    this.controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
    this.controls.minDistance = this.coarsePointer ? 13 : 11;
    this.controls.maxDistance = 76;
    this.controls.minPolarAngle = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.045;
    this.controls.autoRotateSpeed = 0.48;
    this.controls.addEventListener('start', this.handleControlStart);
    this.controls.listenToKeyEvents(canvas);

    this.scene.add(new THREE.HemisphereLight('#dcf5ed', '#355443', 2.15));
    const sunlight = new THREE.DirectionalLight('#fff0cb', 3.25);
    sunlight.position.set(9, 18, 11);
    sunlight.castShadow = true;
    const shadowMapSize = this.coarsePointer ? 1024 : 2048;
    sunlight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sunlight.shadow.camera.left = -14;
    sunlight.shadow.camera.right = 14;
    sunlight.shadow.camera.top = 14;
    sunlight.shadow.camera.bottom = -14;
    sunlight.shadow.camera.near = 0.5;
    sunlight.shadow.camera.far = 52;
    sunlight.shadow.bias = -0.0007;
    sunlight.shadow.normalBias = 0.025;
    this.scene.add(sunlight);
    const fill = new THREE.DirectionalLight('#79c9db', 0.75);
    fill.position.set(-12, 7, -8);
    this.scene.add(fill);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(180, 180),
      new THREE.MeshStandardMaterial({ color: '#174d54', roughness: 1 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.82;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.terrain = createTerrainWorld();
    this.helipads = createHelipadWorld();
    this.fleet = createFleetWorld();
    this.starfish = createStarfishWorld((text, language) => this.options.onSpeak(text, language));
    this.scene.add(this.terrain.group, this.helipads.group, this.fleet.group, this.starfish.group);

    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointercancel', this.handlePointerCancel);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.animate();
  }

  private resize = () => {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const aspect = width / height;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    const distance = 33.5 * Math.max(1, 1.15 / aspect);
    this.homePosition = new THREE.Vector3(14, 16, 21).normalize().multiplyScalar(distance);
    if (!this.ready || !this.selected) {
      this.camera.position.copy(this.homePosition);
      this.controls.target.copy(this.homeTarget);
      this.resetting = false;
      this.controls.update();
    }
  };

  private handleContextLost = (event: Event) => {
    event.preventDefault();
    this.options.onContextLost();
  };

  private handleControlStart = () => {
    this.resetting = false;
    if (this.following) {
      this.following = false;
      this.options.onFollowChange(false);
    }
  };

  private handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.activePointers.add(event.pointerId);
    if (this.activePointers.size === 1) {
      this.pointerStart.set(event.clientX, event.clientY);
      this.tapCancelled = false;
    } else {
      this.tapCancelled = true;
    }
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (!this.activePointers.has(event.pointerId)) return;
    const threshold = event.pointerType === 'touch' ? 14 : 6;
    if (this.pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) > threshold) {
      this.tapCancelled = true;
    }
  };

  private handlePointerUp = (event: PointerEvent) => {
    const threshold = event.pointerType === 'touch' ? 14 : 6;
    const isTap = this.activePointers.size === 1
      && !this.tapCancelled
      && event.button === 0
      && this.pointerStart.distanceTo(new THREE.Vector2(event.clientX, event.clientY)) <= threshold;
    this.activePointers.delete(event.pointerId);
    if (!isTap) return;
    const bounds = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects([this.fleet.group, this.starfish.group, this.helipads.group, this.terrain.group], true);
    const id: unknown = hits[0]?.object.userData.helicopterId;
    const speechId: unknown = hits[0]?.object.userData.speechId;
    if (typeof id === 'string') {
      this.focusHelicopter(id);
    } else if (typeof speechId === 'string' && SCENE_SPEECH[speechId]) {
      this.options.onSpeak(SCENE_SPEECH[speechId], speechId === 'starfish' ? 'zh-CN' : 'en-US');
    }
  };

  private handlePointerCancel = (event: PointerEvent) => {
    this.activePointers.delete(event.pointerId);
    this.tapCancelled = true;
  };

  private updateFocus(delta: number) {
    const smoothing = 1 - Math.exp(-delta * 3.2);
    if (this.selected && this.following) {
      const position = new THREE.Vector3();
      this.selected.root.getWorldPosition(position);
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.selected.root.quaternion).normalize();
      const side = new THREE.Vector3().crossVectors(THREE.Object3D.DEFAULT_UP, forward).normalize();
      const isFireMission = this.selected.info.id === 'fire-01' || this.selected.info.id === 'rescue-03';
      const onPad = this.selected.flight.onPad;
      const focusScale = Math.max(1, 0.9 / this.camera.aspect) * (isFireMission ? 1.35 : 1);
      const targetDrop = onPad ? 0.12 : (isFireMission ? 1.05 : 0.4);
      const target = position.clone().add(new THREE.Vector3(0, -targetDrop * focusScale, 0));
      const desired = target.clone();
      if (onPad) {
        desired.add(new THREE.Vector3(3.6 * focusScale, 3.4 * focusScale, 4.8 * focusScale));
      } else {
        desired.add(new THREE.Vector3(0, 2.1 * focusScale, 0))
          .addScaledVector(side, 3.6 * focusScale)
          .addScaledVector(forward, 2.4 * focusScale);
      }
      this.camera.up.set(0, 1, 0);
      this.camera.position.lerp(desired, smoothing);
      this.controls.target.lerp(target, smoothing * 1.25);
    } else if (this.resetting) {
      this.camera.position.lerp(this.homePosition, smoothing);
      this.controls.target.lerp(this.homeTarget, smoothing);
      if (this.camera.position.distanceTo(this.homePosition) < 0.035 && this.controls.target.distanceTo(this.homeTarget) < 0.035) {
        this.resetting = false;
      }
    }
  }

  private animate = () => {
    this.animationFrame = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (!this.paused) {
      this.elapsed += delta;
      this.terrain.update(this.elapsed);
      this.fleet.update(this.elapsed, delta);
      this.helipads.update(this.elapsed, this.fleet.units);
      const waterRescueUnit = this.fleet.units.find((unit) => unit.info.id === 'rescue-03');
      if (waterRescueUnit) this.starfish.update(this.elapsed, waterRescueUnit);
    }
    this.controls.autoRotate = this.autoRotate && !this.paused && !this.selected && !this.resetting;
    this.updateFocus(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (!this.ready) {
      this.ready = true;
      this.options.onReady();
    }
  };

  focusHelicopter(id: string, follow = true) {
    const unit = this.fleet.units.find((candidate) => candidate.info.id === id);
    if (!unit) return;
    this.selected = unit;
    this.following = follow;
    this.resetting = false;
    this.controls.minDistance = 2.4;
    this.options.onSelect(unit.info);
    this.options.onFollowChange(follow);
    this.options.onSpeak(randomHelicopterGreeting(), 'zh-CN');
  }

  setFollowing(following: boolean) {
    if (!this.selected) return;
    this.following = following;
    this.options.onFollowChange(following);
  }

  resetView() {
    this.selected = null;
    this.following = false;
    this.resetting = true;
    this.controls.minDistance = this.coarsePointer ? 13 : 11;
    this.options.onSelect(null);
    this.options.onFollowChange(false);
  }

  zoom(factor: number) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = THREE.MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    offset.setLength(distance);
    this.camera.position.copy(this.controls.target).add(offset);
    this.resetting = false;
  }

  setPaused(paused: boolean) {
    this.paused = paused;
  }

  setAutoRotate(autoRotate: boolean) {
    this.autoRotate = autoRotate;
    if (autoRotate && this.selected) this.resetView();
  }

  dispose() {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    this.controls.removeEventListener('start', this.handleControlStart);
    this.controls.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.handlePointerCancel);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.activePointers.clear();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
          material.dispose();
        });
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
