import * as THREE from 'three';
import { createScene } from './scene';
import { createModel, disposeModel } from './models';
import { getPreset } from './presets';
import { loadLayout, saveLayout } from './storage';
import { ITEM_INFO, TABLE, type ItemData, type ItemType, type PlacedItem } from './types';
import './style.css';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand"><span class="brand-seal">案</span><div><strong>一案四时</strong><small>清供 DIY 数字案几</small></div></div>
      <div class="top-center"><span class="eyebrow">把四时雅意，安放于一案之间</span></div>
      <div class="top-actions"><button class="ghost-button" id="reset-camera" title="恢复初始视角">⌖ <span>初始视角</span></button><button class="save-button" id="save-layout">保存我的清供</button></div>
    </header>
    <main class="workspace">
      <aside class="library panel">
        <div class="panel-heading"><span class="section-index">01 / MATERIALS</span><h2>清供物件库</h2><p>择一雅物，添于案头</p></div>
        <div class="library-scroll">
          ${(['花木','果品','器皿','文房','雅玩'] as const).map(cat => `<section class="category"><h3>${cat}</h3><div class="cards">${(Object.entries(ITEM_INFO) as [ItemType, typeof ITEM_INFO[ItemType]][]).filter(([,v]) => v.category === cat).map(([type, v]) => `<button class="item-card" data-type="${type}" draggable="true" title="点击添加；也可拖入案几"><span class="item-icon icon-${type}" aria-hidden="true">${v.icon}</span><span class="item-copy"><strong>${v.name}</strong><small>${v.note}</small></span><span class="item-plus">+</span></button>`).join('')}</div></section>`).join('')}
        </div>
        <div class="library-foot"><span class="tiny-diamond">◆</span> 点击添加 · 拖动摆放 · 自由组合</div>
      </aside>
      <section class="stage" aria-label="三维清供案几编辑区">
        <div id="canvas-host"></div>
        <div class="stage-top"><span class="scene-chip"><i></i> 清供案几 · 编辑中</span><span class="stage-hint">拖动器物移动　/　拖动空白旋转　/　滚轮缩放</span></div>
        <div class="stage-bottom"><div class="stage-caption"><span class="caption-line"></span><span>一案之间，自有天地</span></div><div class="item-count" id="item-count">案上 0 件雅物</div></div>
      </section>
      <aside class="editor panel">
        <div class="panel-heading"><span class="section-index">02 / COMPOSE</span><h2>布置案几</h2><p>方寸之间，随心成景</p></div>
        <div class="editor-scroll"><div id="selection-panel"></div><div class="divider"></div><section class="presets"><div class="subhead"><h3>灵感预设</h3><span>一键入景</span></div><button data-preset="spring"><span class="preset-number">01</span><span><strong>岁朝迎春</strong><small>梅影 · 金橘 · 炉香</small></span><span class="preset-arrow">↗</span></button><button data-preset="gathering"><span class="preset-number">02</span><span><strong>梅窗雅集</strong><small>花木 · 湖石 · 文房</small></span><span class="preset-arrow">↗</span></button><button data-preset="leisure"><span class="preset-number">03</span><span><strong>案头清趣</strong><small>清玩 · 书卷 · 果品</small></span><span class="preset-arrow">↗</span></button></section></div>
        <div class="editor-actions"><button id="export-image" class="primary-action"><span>生成我的清供图</span><span>↗</span></button><button id="clear-layout" class="text-action">清空案几</button></div>
      </aside>
    </main>
    <div id="toast" role="status" aria-live="polite"></div>
  </div>`;

const host = document.querySelector<HTMLElement>('#canvas-host')!;
const viewport = createScene(host);
const { scene, camera, renderer, controls } = viewport;
const canvas = renderer.domElement;
const items = new Map<string, PlacedItem>();
let selectedId: string | null = null;
let drag: { id: string; offsetX: number; offsetZ: number; startX: number; startY: number; moved: boolean } | null = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TABLE.top);
const hit = new THREE.Vector3();
const ring = new THREE.Mesh(new THREE.RingGeometry(.46, .49, 64), new THREE.MeshBasicMaterial({ color: 0xc7a46b, side: THREE.DoubleSide, transparent: true, opacity: .84, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.position.y = TABLE.top + .012; ring.visible = false; scene.add(ring);

function toast(message: string) {
  const el = document.querySelector<HTMLElement>('#toast')!;
  el.textContent = message; el.classList.add('show');
  window.clearTimeout(Number(el.dataset.timeout));
  el.dataset.timeout = String(window.setTimeout(() => el.classList.remove('show'), 2600));
}

function bounds(type: ItemType, scale: number) {
  const radius: Record<ItemType, [number, number]> = { plum: [.7, .47], citrus: [.82, .82], rock: [.75, .52], incense: [.78, .7], brush: [.84, .67], scroll: [1.02, .7] };
  return radius[type].map(v => v * scale) as [number, number];
}

function clampItem(data: ItemData) {
  data.scale = THREE.MathUtils.clamp(data.scale, .7, 1.5);
  const [rx, rz] = bounds(data.type, data.scale);
  data.x = THREE.MathUtils.clamp(data.x, -TABLE.width / 2 + rx + .12, TABLE.width / 2 - rx - .12);
  data.z = THREE.MathUtils.clamp(data.z, -TABLE.depth / 2 + rz + .1, TABLE.depth / 2 - rz - .1);
}

function freePosition(type: ItemType, scale: number, preferred = { x: 0, z: 0 }) {
  const [rx, rz] = bounds(type, scale);
  let best = { x: 0, z: 0, cost: Infinity };
  for (let z = -1.13; z <= 1.14; z += .19) for (let x = -2.9; x <= 2.91; x += .19) {
    const candidate = { id: '', type, x, z, rotation: 0, scale };
    clampItem(candidate);
    if (Math.abs(candidate.x - x) > .01 || Math.abs(candidate.z - z) > .01) continue;
    let cost = Math.hypot(x - preferred.x, z - preferred.z) * .3;
    for (const other of items.values()) {
      const [ox, oz] = bounds(other.data.type, other.data.scale);
      const separation = Math.hypot((x - other.data.x) / (rx + ox), (z - other.data.z) / (rz + oz));
      if (separation < 1.06) cost += 100 * (1.06 - separation);
    }
    if (cost < best.cost) best = { x, z, cost };
  }
  return { x: best.x, z: best.z };
}

function syncObject(item: PlacedItem) {
  clampItem(item.data);
  item.object.position.set(item.data.x, TABLE.top, item.data.z);
  item.object.rotation.y = item.data.rotation;
  item.object.scale.setScalar(item.data.scale);
  if (selectedId === item.data.id) updateRing();
}

function updateRing() {
  const item = selectedId ? items.get(selectedId) : null;
  ring.visible = !!item;
  if (!item) return;
  const [rx, rz] = bounds(item.data.type, item.data.scale);
  ring.position.x = item.data.x; ring.position.z = item.data.z;
  ring.scale.set(rx * 1.25, rz * 1.25, 1);
}

function addItem(data: ItemData, animate = true) {
  if (items.has(data.id)) data.id = crypto.randomUUID();
  clampItem(data);
  const object = createModel(data.type);
  object.userData.itemId = data.id;
  scene.add(object);
  const item = { data, object };
  items.set(data.id, item);
  syncObject(item);
  if (animate) {
    const start = performance.now();
    const target = data.scale;
    const step = (now: number) => {
      if (!items.has(data.id)) return;
      const t = Math.min(1, (now - start) / 340);
      const eased = 1 - Math.pow(1 - t, 3);
      object.scale.setScalar(target * (.82 + .18 * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  updateCount();
  return item;
}

function removeItem(id: string) {
  const item = items.get(id); if (!item) return;
  scene.remove(item.object); disposeModel(item.object); items.delete(id);
  if (selectedId === id) select(null);
  updateCount();
}

function clearItems() { for (const id of [...items.keys()]) removeItem(id); select(null); }

function select(id: string | null) {
  selectedId = id && items.has(id) ? id : null;
  updateRing(); renderSelection();
}

function updateCount() { document.querySelector('#item-count')!.textContent = `案上 ${items.size} 件雅物`; }

function renderSelection() {
  const panel = document.querySelector<HTMLElement>('#selection-panel')!;
  const item = selectedId ? items.get(selectedId) : null;
  if (!item) {
    panel.innerHTML = `<div class="empty-selection"><div class="empty-mark">✦</div><h3>让雅物落于案上</h3><p>从左侧挑选心仪器物，再在三维案几中轻轻拖动，布置属于你的清供。</p><div class="instruction"><span>01</span> 点击左侧器物添加</div><div class="instruction"><span>02</span> 拖动器物调整位置</div><div class="instruction"><span>03</span> 选中后精细调整</div></div>`;
    return;
  }
  const { data } = item;
  const info = ITEM_INFO[data.type];
  panel.innerHTML = `<div class="selected-heading"><span class="selected-icon icon-${data.type}">${info.icon}</span><div><span class="mini-label">正在编辑 · ${info.category}</span><h3>${info.name}</h3><p>${info.note}</p></div></div>
    <div class="control"><div class="control-top"><label for="rotation-slider">旋转角度</label><output id="rotation-value">${Math.round(THREE.MathUtils.radToDeg(data.rotation) % 360)}°</output></div><input id="rotation-slider" type="range" min="0" max="360" value="${Math.round((THREE.MathUtils.radToDeg(data.rotation) + 360) % 360)}" /></div>
    <div class="control"><div class="control-top"><label for="scale-slider">器物大小</label><output id="scale-value">${Math.round(data.scale * 100)}%</output></div><input id="scale-slider" type="range" min="70" max="150" value="${Math.round(data.scale * 100)}" /></div>
    <div class="edit-buttons"><button data-action="copy">⧉ <span>复制</span></button><button data-action="reset">↺ <span>重置</span></button><button data-action="delete" class="danger">× <span>删除</span></button></div>`;
}

function screenRay(clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
}

function tableHit(clientX: number, clientY: number) {
  screenRay(clientX, clientY);
  return raycaster.ray.intersectPlane(tablePlane, hit) ? hit.clone() : null;
}

function pick(clientX: number, clientY: number) {
  screenRay(clientX, clientY);
  const roots = [...items.values()].map(i => i.object);
  for (const intersection of raycaster.intersectObjects(roots, true)) {
    let obj: THREE.Object3D | null = intersection.object;
    while (obj && !obj.userData.itemId) obj = obj.parent;
    if (obj?.userData.itemId && items.has(obj.userData.itemId as string)) return obj.userData.itemId as string;
  }
  return null;
}

canvas.addEventListener('pointerdown', ev => {
  if (ev.button !== 0) return;
  const id = pick(ev.clientX, ev.clientY);
  if (!id) { select(null); return; }
  select(id);
  const point = tableHit(ev.clientX, ev.clientY);
  const data = items.get(id)!.data;
  drag = { id, offsetX: point ? data.x - point.x : 0, offsetZ: point ? data.z - point.z : 0, startX: ev.clientX, startY: ev.clientY, moved: false };
  controls.enabled = false;
  canvas.setPointerCapture(ev.pointerId);
  canvas.style.cursor = 'grabbing';
  ev.preventDefault();
});

canvas.addEventListener('pointermove', ev => {
  if (!drag) { canvas.style.cursor = pick(ev.clientX, ev.clientY) ? 'grab' : 'auto'; return; }
  if (Math.hypot(ev.clientX - drag.startX, ev.clientY - drag.startY) < 3 && !drag.moved) return;
  drag.moved = true;
  const point = tableHit(ev.clientX, ev.clientY);
  const item = items.get(drag.id);
  if (point && item) { item.data.x = point.x + drag.offsetX; item.data.z = point.z + drag.offsetZ; syncObject(item); }
});

function endDrag() { drag = null; controls.enabled = true; canvas.style.cursor = 'auto'; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
window.addEventListener('blur', endDrag);

document.querySelectorAll<HTMLButtonElement>('.item-card').forEach(card => {
  const type = card.dataset.type as ItemType;
  card.addEventListener('click', () => {
    const scale = type === 'plum' ? .9 : 1;
    const { x, z } = freePosition(type, scale);
    const item = addItem({ id: crypto.randomUUID(), type, x, z, rotation: 0, scale });
    select(item.data.id); toast(`已添入「${ITEM_INFO[type].name}」`);
  });
  card.addEventListener('dragstart', ev => { ev.dataTransfer?.setData('text/qinggong-type', type); if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy'; });
});

canvas.addEventListener('dragover', ev => { if (ev.dataTransfer?.types.includes('text/qinggong-type')) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; } });
canvas.addEventListener('drop', ev => {
  ev.preventDefault();
  const type = ev.dataTransfer?.getData('text/qinggong-type') as ItemType;
  if (!ITEM_INFO[type]) return;
  const point = tableHit(ev.clientX, ev.clientY);
  const item = addItem({ id: crypto.randomUUID(), type, x: point?.x ?? 0, z: point?.z ?? 0, rotation: 0, scale: type === 'plum' ? .9 : 1 });
  select(item.data.id); toast(`已添入「${ITEM_INFO[type].name}」`);
});

document.querySelector<HTMLElement>('#selection-panel')!.addEventListener('input', ev => {
  const target = ev.target as HTMLInputElement;
  const item = selectedId ? items.get(selectedId) : null; if (!item) return;
  if (target.id === 'rotation-slider') { item.data.rotation = THREE.MathUtils.degToRad(Number(target.value)); document.querySelector('#rotation-value')!.textContent = `${target.value}°`; }
  if (target.id === 'scale-slider') { item.data.scale = Number(target.value) / 100; document.querySelector('#scale-value')!.textContent = `${target.value}%`; }
  syncObject(item);
});

document.querySelector<HTMLElement>('#selection-panel')!.addEventListener('click', ev => {
  const button = (ev.target as HTMLElement).closest<HTMLButtonElement>('[data-action]'); if (!button || !selectedId) return;
  const item = items.get(selectedId)!;
  if (button.dataset.action === 'delete') { removeItem(selectedId); toast('已移除器物'); }
  if (button.dataset.action === 'copy') {
    const position = freePosition(item.data.type, item.data.scale, { x: item.data.x + .8, z: item.data.z + .32 });
    const clone = addItem({ ...item.data, id: crypto.randomUUID(), ...position });
    select(clone.data.id); toast('已复制器物');
  }
  if (button.dataset.action === 'reset') {
    Object.assign(item.data, { x: 0, z: 0, rotation: 0, scale: 1 }); syncObject(item); renderSelection(); toast('已重置器物');
  }
});

document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach(button => button.addEventListener('click', () => {
  clearItems(); getPreset(button.dataset.preset!).forEach(d => addItem(d, false));
  toast(`已载入「${button.querySelector('strong')?.textContent}」`);
}));

document.querySelector('#clear-layout')!.addEventListener('click', () => { clearItems(); toast('案几已清空'); });
document.querySelector('#save-layout')!.addEventListener('click', () => {
  try { saveLayout([...items.values()].map(i => ({ ...i.data }))); toast('清供已保存，刷新后可继续编辑'); }
  catch { toast('保存失败，请检查浏览器存储权限'); }
});
document.querySelector('#reset-camera')!.addEventListener('click', () => {
  camera.position.copy(viewport.initialPosition); controls.target.copy(viewport.initialTarget); controls.update(); toast('已恢复初始视角');
});
document.querySelector('#export-image')!.addEventListener('click', async () => {
  const size = new THREE.Vector2(); renderer.getSize(size);
  const ratio = renderer.getPixelRatio(); const oldAspect = camera.aspect;
  try {
    ring.visible = false;
    renderer.setPixelRatio(1); renderer.setSize(1800, 1125, false);
    camera.aspect = 1800 / 1125; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const blob = await new Promise<Blob>((resolve, reject) => renderer.domElement.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png'));
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `一案四时-清供作品-${new Date().toISOString().slice(0, 10)}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    toast('清供作品图片已生成，正在下载');
  } catch { toast('图片生成失败，请稍后重试'); }
  finally {
    renderer.setPixelRatio(ratio); renderer.setSize(size.x, size.y, false);
    camera.aspect = oldAspect; camera.updateProjectionMatrix(); updateRing();
  }
});

window.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') select(null);
  if ((ev.key === 'Delete' || ev.key === 'Backspace') && selectedId && !(ev.target instanceof HTMLInputElement)) removeItem(selectedId);
});

const saved = loadLayout();
if (saved) { saved.forEach(data => addItem(data, false)); toast('已恢复上次保存的清供'); }
else getPreset('spring').forEach(data => addItem(data, false));
renderSelection();

if (import.meta.hot) import.meta.hot.dispose(() => { endDrag(); viewport.destroy(); });
