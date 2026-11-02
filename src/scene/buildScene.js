import * as THREE from 'three';
import { BOARD, ROWS, holes, holeById, footprint } from '../domain/breadboard';
import { resistorBands } from '../data/components';

export const position3D = (point, height = 0.03) =>
  new THREE.Vector3((point.x - BOARD.width / 2) / 100, height, (point.y - BOARD.height / 2) / 100);
const plastic = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
const metal = new THREE.MeshStandardMaterial({
  color: '#a9b3bd',
  metalness: 0.75,
  roughness: 0.28,
});
function mesh(group, geometry, material, position) {
  const item = new THREE.Mesh(geometry, material);
  item.position.copy(position);
  item.castShadow = true;
  item.receiveShadow = true;
  group.add(item);
  return item;
}
function cube(group, size, color, p) {
  return mesh(group, new THREE.BoxGeometry(...size), plastic(color), new THREE.Vector3(...p));
}
function tube(group, points, color = null, radius = 0.018) {
  const curve = new THREE.CatmullRomCurve3(points);
  return mesh(
    group,
    new THREE.TubeGeometry(curve, 24, radius, 8, false),
    color ? plastic(color) : metal,
    new THREE.Vector3(),
  );
}

export function buildBoard() {
  const group = new THREE.Group();
  cube(group, [9.2, 0.18, 6], '#e3e4db', [0, -0.11, 0]);
  cube(group, [8.9, 0.02, 0.22], '#bfc4b8', [0, -0.005, 0]);
  const canvas = document.createElement('canvas');
  canvas.width = 1840;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = '#f0f0e8';
  ctx.fillRect(0, 0, 920, 600);
  ctx.fillStyle = '#c4c8bb';
  ctx.fillRect(22, 290, 876, 23);
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#777e72';
  for (let n = 1; n <= 30; n++)
    if (n === 1 || n % 5 === 0) {
      ctx.fillText(n, 80 + (n - 1) * 26, 130);
      ctx.fillText(n, 80 + (n - 1) * 26, 482);
    }
  ROWS.forEach((row) => ctx.fillText(row, 39, holeById[row + '1'].y + 4));
  [48, 112, 490, 554].forEach((y, i) => {
    ctx.strokeStyle = i % 2 ? '#6488a6' : '#bf7569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(53, y);
    ctx.lineTo(862, y);
    ctx.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(9.2, 6),
    new THREE.MeshStandardMaterial({ map: texture, roughness: 0.8 }),
  );
  top.rotation.x = -Math.PI / 2;
  top.position.y = -0.008;
  top.receiveShadow = true;
  group.add(top);
  const contacts = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.075, 0.014, 0.075),
    plastic('#343b3b'),
    holes.length,
  );
  const matrix = new THREE.Matrix4();
  holes.forEach((hole, i) => {
    matrix.makeTranslation(...position3D(hole, 0.004).toArray());
    contacts.setMatrixAt(i, matrix);
  });
  group.add(contacts);
  return group;
}

export function buildPart(part, reading, selected) {
  const group = new THREE.Group();
  const [a, b] = footprint(part);
  if (!a || !b) return group;
  const pa = position3D(a),
    pb = position3D(b),
    middle = pa.clone().add(pb).multiplyScalar(0.5);
  const distance = pa.distanceTo(pb);
  group.position.copy(middle);
  group.rotation.y = -Math.atan2(pb.z - pa.z, pb.x - pa.x);
  group.userData.uid = part.uid;
  const ends = [-distance / 2, distance / 2];
  for (const x of ends)
    tube(group, [
      new THREE.Vector3(x, 0, 0),
      new THREE.Vector3(x, 0.12, 0),
      new THREE.Vector3(x * 0.45, 0.2, 0),
    ]);
  const material = reading?.state === 'danger' ? plastic('#4b4540') : plastic(part.color);
  if (part.type === 'resistor') {
    const body = mesh(
      group,
      new THREE.CylinderGeometry(0.11, 0.11, 0.56, 24),
      plastic(reading?.state === 'danger' ? '#4b4540' : '#c8af83'),
      new THREE.Vector3(0, 0.2, 0),
    );
    body.rotation.z = Math.PI / 2;
    resistorBands(part.value).forEach((color, i) => {
      const band = mesh(
        group,
        new THREE.CylinderGeometry(0.112, 0.112, 0.04, 24),
        plastic(color),
        new THREE.Vector3(-0.18 + i * 0.12, 0.2, 0),
      );
      band.rotation.z = Math.PI / 2;
    });
  } else if (part.type === 'led') {
    mesh(
      group,
      new THREE.CylinderGeometry(0.17, 0.17, 0.06, 28),
      material,
      new THREE.Vector3(0, 0.12, 0),
    );
    const ledMaterial = new THREE.MeshPhysicalMaterial({
      color: reading?.state === 'danger' ? '#4b4540' : part.color,
      roughness: 0.18,
      metalness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: 0.9,
      emissive: part.color,
      emissiveIntensity: reading?.on ? 0.55 : 0.03,
    });
    mesh(
      group,
      new THREE.CylinderGeometry(0.145, 0.145, 0.22, 28),
      ledMaterial,
      new THREE.Vector3(0, 0.25, 0),
    );
    mesh(
      group,
      new THREE.SphereGeometry(0.145, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      ledMaterial,
      new THREE.Vector3(0, 0.36, 0),
    );
  } else if (part.type === 'source') {
    cube(group, [0.74, 0.45, 0.57], '#4b5664', [0, 0.36, 0]);
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#182d26';
    ctx.fillRect(0, 0, 256, 96);
    ctx.fillStyle = '#acdbba';
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(part.value.toFixed(1) + ' V', 128, 66);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.57, 0.22),
      new THREE.MeshBasicMaterial({ map: texture }),
    );
    screen.rotation.x = -Math.PI / 2;
    screen.position.set(0, 0.592, 0);
    group.add(screen);
    tube(
      group,
      [
        new THREE.Vector3(ends[0], 0, 0),
        new THREE.Vector3(ends[0], 0.12, -0.12),
        new THREE.Vector3(-0.2, 0.16, 0),
      ],
      '#ca6955',
      0.025,
    );
    tube(
      group,
      [
        new THREE.Vector3(ends[1], 0, 0),
        new THREE.Vector3(ends[1], 0.12, 0.12),
        new THREE.Vector3(0.2, 0.16, 0),
      ],
      '#323d4a',
      0.025,
    );
  } else {
    cube(group, [0.35, 0.2, 0.3], '#3e4854', [0, 0.19, 0]);
    cube(group, [0.14, 0.08, 0.22], '#a1b1af', [part.closed ? 0.08 : -0.08, 0.33, 0]);
  }
  if (selected) {
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.32, distance / 2 + 0.08), 0.012, 6, 48),
      new THREE.MeshBasicMaterial({ color: '#53ab95' }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.015;
    group.add(marker);
  }
  return group;
}

export function buildWire(wire) {
  const group = new THREE.Group();
  group.userData.uid = wire.uid;
  const a = position3D(holeById[wire.from]),
    b = position3D(holeById[wire.to]);
  const lift = Math.max(0.25, Math.min(0.75, a.distanceTo(b) * 0.17));
  tube(group, [a, a.clone().setY(lift), b.clone().setY(lift), b], wire.color, 0.027);
  return group;
}
export function disposeGroup(group) {
  group.traverse((object) => {
    object.geometry?.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials)
      if (material && material !== metal) {
        material.map?.dispose();
        material.dispose();
      }
  });
}
