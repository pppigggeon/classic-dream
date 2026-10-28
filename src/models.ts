import * as THREE from 'three';
import type { ItemType } from './types';

const ceramic = new THREE.MeshPhysicalMaterial({ color: 0x91b8a5, roughness: .23, metalness: .03, clearcoat: .55, clearcoatRoughness: .18 });
const paleCeramic = new THREE.MeshPhysicalMaterial({ color: 0xe7e2d5, roughness: .22, metalness: .02, clearcoat: .65 });
const darkCeramic = new THREE.MeshPhysicalMaterial({ color: 0x42675c, roughness: .31, clearcoat: .4 });
const bronze = new THREE.MeshStandardMaterial({ color: 0x9b7040, metalness: .74, roughness: .31 });
const bronzeDark = new THREE.MeshStandardMaterial({ color: 0x5d452c, metalness: .66, roughness: .4 });
const wood = new THREE.MeshStandardMaterial({ color: 0x6d4030, roughness: .53 });
const paper = new THREE.MeshStandardMaterial({ color: 0xeee4c8, roughness: .86, side: THREE.DoubleSide });

function add(parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function lathe(parent: THREE.Group, profile: [number, number][], material: THREE.Material, x = 0, z = 0) {
  return add(parent, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48), material, x, 0, z);
}

function tube(parent: THREE.Group, points: [number, number, number][], radius: number, material: THREE.Material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return add(parent, new THREE.TubeGeometry(curve, Math.max(12, points.length * 8), radius, 7, false), material);
}

function ellipsoid(parent: THREE.Group, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const mesh = add(parent, new THREE.SphereGeometry(1, 20, 14), material, x, y, z);
  mesh.scale.set(sx, sy, sz);
  return mesh;
}

function blossom(parent: THREE.Group, x: number, y: number, z: number, angle: number, size = 1) {
  const flower = new THREE.Group();
  flower.position.set(x, y, z);
  flower.rotation.set(.25, angle, -.2);
  const petalMat = new THREE.MeshStandardMaterial({ color: 0xf0c7bd, roughness: .68, side: THREE.DoubleSide });
  const innerMat = new THREE.MeshStandardMaterial({ color: 0xf9e8d5, roughness: .65, side: THREE.DoubleSide });
  const petal = new THREE.Shape();
  petal.moveTo(0, 0);
  petal.bezierCurveTo(-.075, .07, -.11, .2, 0, .24);
  petal.bezierCurveTo(.11, .2, .075, .07, 0, 0);
  const geo = new THREE.ShapeGeometry(petal, 8);
  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(geo, i % 2 ? petalMat : innerMat);
    mesh.rotation.z = i * Math.PI * 2 / 5;
    mesh.scale.setScalar(size);
    mesh.position.z = .007 * i;
    mesh.castShadow = true;
    flower.add(mesh);
  }
  ellipsoid(flower, new THREE.MeshStandardMaterial({ color: 0xb99747 }), 0, 0, .035, .034, .034, .025);
  parent.add(flower);
}

export function createPlum() {
  const g = new THREE.Group();
  lathe(g, [[0, 0], [.21, 0], [.24, .04], [.27, .13], [.38, .28], [.46, .51], [.45, .7], [.34, .87], [.23, 1.02], [.19, 1.13], [.2, 1.18], [.23, 1.2], [.23, 1.23], [.17, 1.23]], ceramic);
  add(g, new THREE.TorusGeometry(.215, .016, 8, 40), darkCeramic, 0, 1.21, 0).rotation.x = Math.PI / 2;
  const twig = new THREE.MeshStandardMaterial({ color: 0x48342b, roughness: .95 });
  const branchSets: [number, number, number][][] = [
    [[0, 1.18, 0], [-.08, 1.43, 0], [-.3, 1.67, .03], [-.47, 1.92, .05], [-.54, 2.06, .08]],
    [[.03, 1.18, 0], [.13, 1.43, -.02], [.36, 1.65, -.04], [.54, 1.79, -.1]],
    [[0, 1.27, .01], [-.05, 1.5, .1], [.05, 1.78, .16], [.14, 1.97, .2]],
  ];
  branchSets.forEach(points => tube(g, points, .018, twig));
  tube(g, [[-.28, 1.65, .03], [-.49, 1.68, .03], [-.61, 1.77, .05]], .01, twig);
  tube(g, [[.35, 1.64, -.04], [.41, 1.8, .03], [.43, 1.98, .09]], .011, twig);
  [[-.5, 1.93, .08], [-.38, 1.7, .07], [-.59, 1.78, .06], [.53, 1.79, -.09], [.35, 1.65, 0], [.42, 1.96, .1], [.13, 1.95, .2], [.02, 1.73, .18]].forEach((p, i) => blossom(g, p[0], p[1], p[2], i * 1.37, i % 3 === 0 ? .75 : 1));
  return g;
}

function orange(parent: THREE.Group, x: number, y: number, z: number, r: number) {
  const geo = new THREE.SphereGeometry(r, 24, 16);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i), vy = pos.getY(i), vz = pos.getZ(i);
    const wav = 1 + .019 * Math.sin(Math.atan2(vz, vx) * 9) + .01 * Math.sin(vy * 42);
    pos.setXYZ(i, vx * wav, vy * .91, vz * wav);
  }
  geo.computeVertexNormals();
  add(parent, geo, new THREE.MeshStandardMaterial({ color: 0xe68c35, roughness: .74, metalness: 0 }), x, y, z);
  add(parent, new THREE.CylinderGeometry(.022, .035, .045, 7), new THREE.MeshStandardMaterial({ color: 0x55704a }), x, y + r * .89, z);
  const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(.11, .08, .19, 0); leaf.quadraticCurveTo(.1, -.045, 0, 0);
  const lm = add(parent, new THREE.ShapeGeometry(leaf), new THREE.MeshStandardMaterial({ color: 0x53734d, side: THREE.DoubleSide }), x, y + r * .9, z);
  lm.rotation.x = -Math.PI / 2; lm.rotation.z = x * 2;
}

export function createCitrus() {
  const g = new THREE.Group();
  lathe(g, [[0, .035], [.32, .035], [.57, .07], [.7, .13], [.76, .21], [.78, .24], [.75, .25], [.7, .2], [.53, .14], [.2, .12], [0, .12]], paleCeramic);
  add(g, new THREE.TorusGeometry(.76, .018, 8, 50), ceramic, 0, .225, 0).rotation.x = Math.PI / 2;
  orange(g, -.29, .34, -.13, .23); orange(g, .27, .33, -.14, .25); orange(g, -.31, .34, .29, .235); orange(g, .25, .34, .3, .225); orange(g, .02, .55, .06, .22);
  return g;
}

export function createRock() {
  const g = new THREE.Group();
  const base = add(g, new THREE.CylinderGeometry(.64, .73, .12, 8), wood, 0, .07, 0);
  base.scale.z = .67;
  add(g, new THREE.CylinderGeometry(.55, .59, .07, 8), bronzeDark, 0, .16, 0).scale.z = .62;
  const outline = new THREE.Shape();
  outline.moveTo(-.45, .21); outline.bezierCurveTo(-.7, .42, -.51, .68, -.43, .84);
  outline.bezierCurveTo(-.5, 1.03, -.23, 1.06, -.23, 1.28);
  outline.bezierCurveTo(-.17, 1.56, .07, 1.56, .13, 1.35);
  outline.bezierCurveTo(.24, 1.15, .47, 1.24, .51, 1.04);
  outline.bezierCurveTo(.6, .84, .37, .75, .49, .55);
  outline.bezierCurveTo(.56, .35, .34, .23, .19, .31);
  outline.bezierCurveTo(-.08, .45, -.15, .15, -.45, .21);
  const hole1 = new THREE.Path(); hole1.absellipse(-.1, .83, .13, .21, 0, Math.PI * 2, true); outline.holes.push(hole1);
  const hole2 = new THREE.Path(); hole2.absellipse(.23, .55, .09, .12, 0, Math.PI * 2, true); outline.holes.push(hole2);
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x858981, roughness: .96, flatShading: true, side: THREE.DoubleSide });
  const stone = add(g, new THREE.ExtrudeGeometry(outline, { depth: .25, bevelEnabled: true, bevelThickness: .08, bevelSize: .055, bevelSegments: 2, curveSegments: 12 }), stoneMat, 0, 0, -.12);
  stone.rotation.y = .12;
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x67726a, roughness: .98, flatShading: true });
  [[-.35,.52,-.2,.13,.2,.13],[.36,.86,.19,.16,.22,.11],[-.05,1.23,-.12,.12,.22,.14]].forEach(p => ellipsoid(g, darkStone, p[0], p[1], p[2], p[3], p[4], p[5]));
  return g;
}

export function createIncense() {
  const g = new THREE.Group();
  const foot = new THREE.MeshStandardMaterial({ color: 0x765235, metalness: .7, roughness: .37 });
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3;
    const leg = add(g, new THREE.CylinderGeometry(.095, .125, .31, 10), foot, Math.cos(a) * .37, .17, Math.sin(a) * .37);
    leg.rotation.z = Math.cos(a) * -.15;
  }
  lathe(g, [[0, .31], [.27, .3], [.44, .37], [.53, .48], [.56, .66], [.52, .81], [.47, .85], [.48, .89], [.59, .91], [.6, .96], [.48, .96], [0, .96]], bronze);
  add(g, new THREE.TorusGeometry(.54, .035, 8, 40), bronzeDark, 0, .92, 0).rotation.x = Math.PI / 2;
  lathe(g, [[0, .96], [.47, .96], [.43, 1.04], [.32, 1.14], [.17, 1.2], [0, 1.21]], bronzeDark);
  add(g, new THREE.SphereGeometry(.075, 16, 12), bronze, 0, 1.24, 0);
  for (let s of [-1, 1]) {
    const ring = add(g, new THREE.TorusGeometry(.17, .042, 8, 24), bronze, s * .59, .75, 0);
    ring.rotation.y = Math.PI / 2;
    ellipsoid(g, bronzeDark, s * .52, .75, 0, .08, .08, .08);
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    ellipsoid(g, bronzeDark, Math.cos(a)*.53, .6, Math.sin(a)*.53, .027, .09, .027);
  }
  return g;
}

export function createBrush() {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-.74, .05); shape.lineTo(-.69, .18); shape.lineTo(-.54, .22);
  shape.lineTo(-.36, .55); shape.quadraticCurveTo(-.3, .62, -.23, .49);
  shape.lineTo(-.08, .27); shape.lineTo(.05, .65); shape.quadraticCurveTo(.1, .73, .16, .58);
  shape.lineTo(.31, .28); shape.lineTo(.46, .51); shape.quadraticCurveTo(.53, .6, .59, .43);
  shape.lineTo(.72, .16); shape.lineTo(.75, .05); shape.closePath();
  add(g, new THREE.ExtrudeGeometry(shape, { depth: .15, bevelEnabled: true, bevelSize: .035, bevelThickness: .03, bevelSegments: 2, curveSegments: 8 }), darkCeramic, 0, 0, -.075);
  for (let i = 0; i < 2; i++) {
    const z = .31 + i * .17;
    const shaft = add(g, new THREE.CylinderGeometry(.026, .034, 1.42, 10), wood, 0, .09, z);
    shaft.rotation.z = Math.PI / 2;
    add(g, new THREE.CylinderGeometry(.043, .043, .105, 10), bronze, -.72, .09, z).rotation.z = Math.PI / 2;
    const tip = add(g, new THREE.ConeGeometry(.05, .2, 10), new THREE.MeshStandardMaterial({ color: 0x322a24 }), .82, .09, z);
    tip.rotation.z = -Math.PI / 2;
  }
  return g;
}

export function createScroll() {
  const g = new THREE.Group();
  const sheet = add(g, new THREE.BoxGeometry(1.65, .025, .89), paper, 0, .075, 0);
  sheet.rotation.y = -.045;
  const silk = new THREE.MeshStandardMaterial({ color: 0x547569, roughness: .78 });
  for (let s of [-1, 1]) {
    const bar = add(g, new THREE.CylinderGeometry(.075, .075, 1.84, 16), wood, 0, .115, s * .49);
    bar.rotation.z = Math.PI / 2;
    for (let side of [-1, 1]) {
      const cap = add(g, new THREE.CylinderGeometry(.095, .095, .055, 16), bronzeDark, side * .94, .115, s * .49);
      cap.rotation.z = Math.PI / 2;
    }
  }
  for (let i = 0; i < 7; i++) {
    const w = .19 + (i * 13 % 5) * .06;
    const line = add(g, new THREE.BoxGeometry(w, .002, .012), new THREE.MeshStandardMaterial({ color: 0x665b4c, roughness: 1 }), -.45 + (i % 2) * .13, .091, -.3 + i * .09);
    line.rotation.y = -.045;
  }
  for (let s of [-1, 1]) add(g, new THREE.BoxGeometry(.055, .01, .87), silk, s * .77, .091, 0);
  return g;
}

export function createModel(type: ItemType): THREE.Group {
  const model = ({ plum: createPlum, citrus: createCitrus, rock: createRock, incense: createIncense, brush: createBrush, scroll: createScroll })[type]();
  model.name = type;
  return model;
}

export function disposeModel(model: THREE.Group) {
  model.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      // The six model materials above are shared across instances; dispose only one-off materials.
      const mat = obj.material;
      if (Array.isArray(mat)) mat.forEach(m => { if (![ceramic, paleCeramic, darkCeramic, bronze, bronzeDark, wood, paper].includes(m)) m.dispose(); });
      else if (![ceramic, paleCeramic, darkCeramic, bronze, bronzeDark, wood, paper].includes(mat)) mat.dispose();
    }
  });
}
