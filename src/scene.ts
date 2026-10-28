import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TABLE } from './types';

function woodTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#603d2f'; ctx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 210; i++) {
    const y = i * 1.22 + Math.sin(i * .16) * 2;
    ctx.strokeStyle = i % 4 === 0 ? 'rgba(26,12,8,.12)' : 'rgba(222,174,113,.09)';
    ctx.lineWidth = i % 7 === 0 ? 2 : .7;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(150, y + Math.sin(i * .7) * 3, 340, y - Math.cos(i * .3) * 3, 512, y + Math.sin(i) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

function box(parent: THREE.Object3D, size: [number, number, number], pos: [number, number, number], mat: THREE.Material, bevel = 0) {
  const geo = bevel ? new THREE.BoxGeometry(size[0], size[1], size[2]) : new THREE.BoxGeometry(...size);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}

function createDesk(scene: THREE.Scene) {
  const desk = new THREE.Group();
  const grain = woodTexture(); grain.repeat.set(2.2, 1);
  const topMat = new THREE.MeshStandardMaterial({ map: grain, color: 0xc29978, roughness: .48, metalness: .03 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4b2b23, roughness: .58 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0x301d19, roughness: .45 });
  box(desk, [TABLE.width, .18, TABLE.depth], [0, TABLE.top - .09, 0], topMat);
  box(desk, [TABLE.width + .15, .08, TABLE.depth + .13], [0, TABLE.top - .21, 0], edgeMat);
  for (let x of [-2.85, 2.85]) for (let z of [-1.12, 1.12]) {
    box(desk, [.28, 1.12, .29], [x, .57, z], frameMat);
    box(desk, [.36, .06, .37], [x, .055, z], edgeMat);
  }
  for (let z of [-1.15, 1.15]) {
    box(desk, [5.5, .27, .12], [0, 1.04, z], frameMat);
    box(desk, [5.6, .055, .075], [0, .91, z], edgeMat);
  }
  for (let x of [-2.85, 2.85]) box(desk, [.12, .24, 2.16], [x, 1.03, 0], frameMat);
  box(desk, [5.68, .08, .1], [0, .46, -1.13], frameMat);
  box(desk, [5.68, .08, .1], [0, .46, 1.13], frameMat);
  scene.add(desk);
}

function createRoom(scene: THREE.Scene) {
  const wall = new THREE.MeshStandardMaterial({ color: 0xded8c9, roughness: 1 });
  const floor = new THREE.MeshStandardMaterial({ color: 0xc4b9a7, roughness: 1 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 10), wall);
  back.position.set(0, 3.3, -4.7); back.receiveShadow = true; scene.add(back);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), floor);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.01; ground.receiveShadow = true; scene.add(ground);
  const timber = new THREE.MeshStandardMaterial({ color: 0x49342c, roughness: .8 });
  const paper = new THREE.MeshBasicMaterial({ color: 0xf3ecdc, transparent: true, opacity: .85, side: THREE.DoubleSide });
  const win = new THREE.Group(); win.position.set(-3.3, 3.1, -4.56);
  box(win, [3.2, 2.9, .06], [0, 0, 0], timber);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.97, 2.67), paper);
  glow.position.z = .04; win.add(glow);
  for (let i = -1; i <= 1; i++) box(win, [.055, 2.7, .08], [i * .96, 0, .08], timber);
  for (let i = -1; i <= 1; i++) box(win, [3, .055, .08], [0, i * .83, .08], timber);
  scene.add(win);
  const bamboo = new THREE.Group(); bamboo.position.set(-3.3, 2.4, -4.48);
  const leafMat = new THREE.MeshBasicMaterial({ color: 0x6f8974, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false });
  for (let i = 0; i < 9; i++) {
    const x = -1.2 + i * .31;
    const stem = new THREE.Mesh(new THREE.PlaneGeometry(.017, 2.4), leafMat); stem.position.set(x, 0, .02); stem.rotation.z = .06 * (i % 3 - 1); bamboo.add(stem);
    for (let j = 0; j < 5; j++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(.38, .07), leafMat);
      leaf.position.set(x + (j % 2 ? .14 : -.14), -.7 + j * .42, .03);
      leaf.rotation.z = j % 2 ? .32 : -.32; bamboo.add(leaf);
    }
  }
  scene.add(bamboo);
  // A restrained hanging scroll gives the right side of the backdrop some depth.
  const hanging = new THREE.Group(); hanging.position.set(2.55, 2.85, -4.48);
  box(hanging, [1.15, 2.1, .015], [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0xb3ac94, roughness: 1 }));
  box(hanging, [.94, 1.66, .02], [0, .02, .02], new THREE.MeshStandardMaterial({ color: 0xece5d5, roughness: 1 }));
  const ink = new THREE.MeshBasicMaterial({ color: 0x586a5b, transparent: true, opacity: .42 });
  for (let i = 0; i < 4; i++) {
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(.038, .45 + i * .12), ink);
    mark.position.set(-.25 + i * .15, .16 - i * .09, .037); mark.rotation.z = .15 - i * .12; hanging.add(mark);
  }
  box(hanging, [1.29, .07, .075], [0, 1.08, .015], timber);
  box(hanging, [1.29, .07, .075], [0, -1.08, .015], timber);
  scene.add(hanging);
}

export function createScene(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8e4da);
  scene.fog = new THREE.Fog(0xe8e4da, 14, 30);
  const camera = new THREE.PerspectiveCamera(40, 1, .1, 100);
  const initialPosition = new THREE.Vector3(7.7, 5.15, 8.4);
  const initialTarget = new THREE.Vector3(0, 1.22, 0);
  camera.position.copy(initialPosition);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.55;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(initialTarget);
  controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 7.5; controls.maxDistance = 17;
  controls.minPolarAngle = .52; controls.maxPolarAngle = 1.23;
  controls.minAzimuthAngle = -.9; controls.maxAzimuthAngle = 1.28;
  controls.enablePan = false; controls.rotateSpeed = .48; controls.zoomSpeed = .8;
  controls.update();
  scene.add(new THREE.HemisphereLight(0xfff8ed, 0x71675b, 2.1));
  const sun = new THREE.DirectionalLight(0xffe9cc, 3.6);
  sun.position.set(-3, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -8; sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
  sun.shadow.normalBias = .02;
  sun.shadow.bias = -.00005;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xcadbd2, 1.2); fill.position.set(5, 4, -3); scene.add(fill);
  createRoom(scene); createDesk(scene);
  const resize = () => {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
  };
  const observer = new ResizeObserver(resize); observer.observe(container); resize();
  let frame = 0;
  const animate = () => { frame = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
  animate();
  return {
    scene, camera, renderer, controls, initialPosition, initialTarget,
    resize,
    destroy: () => { cancelAnimationFrame(frame); observer.disconnect(); controls.dispose(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
