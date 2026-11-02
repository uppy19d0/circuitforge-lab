import * as THREE from 'three';
import { getBoard, ROWS, footprint } from '../domain/breadboard';
import { resistorBands } from '../data/components';

export const position3D = (point, height = 0.03, board = getBoard()) =>
  new THREE.Vector3((point.x - board.width / 2) / 100, height, (point.y - board.height / 2) / 100);
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

export function buildBoard(board = getBoard()) {
  const { holes, holeById } = board;
  const group = new THREE.Group();
  cube(group, [board.width / 100, 0.18, board.height / 100], '#e3e4db', [0, -0.11, 0]);
  cube(group, [(board.width - 30) / 100, 0.02, 0.22], '#bfc4b8', [0, -0.005, 0]);
  const canvas = document.createElement('canvas');
  canvas.width = board.width * 2;
  canvas.height = board.height * 2;
  const ctx = canvas.getContext('2d');
  ctx.scale(2, 2);
  ctx.fillStyle = '#f0f0e8';
  ctx.fillRect(0, 0, board.width, board.height);
  ctx.fillStyle = '#c4c8bb';
  ctx.fillRect(22, board.trenchY - 11, board.width - 44, 23);
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#777e72';
  for (let n = 1; n <= board.columns; n++)
    if (n === 1 || n % 5 === 0) {
      ctx.fillText(n, 80 + (n - 1) * 26, board.rowY[0] - 28);
      ctx.fillText(n, 80 + (n - 1) * 26, board.rowY[9] + 38);
    }
  ROWS.forEach((row) => ctx.fillText(row, 39, holeById[row + '1'].y + 4));
  board.railLines.forEach((y, i) => {
    ctx.strokeStyle = i % 2 ? '#6488a6' : '#bf7569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(53, y);
    if (board.splitRails) {
      ctx.lineTo(board.width / 2 - 14, y);
      ctx.moveTo(board.width / 2 + 14, y);
    }
    ctx.lineTo(board.width - 58, y);
    ctx.stroke();
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const top = new THREE.Mesh(
    new THREE.PlaneGeometry(board.width / 100, board.height / 100),
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
    matrix.makeTranslation(...position3D(hole, 0.004, board).toArray());
    contacts.setMatrixAt(i, matrix);
  });
  group.add(contacts);
  return group;
}

export function buildPart(part, reading, selected, board = getBoard()) {
  const group = new THREE.Group();
  const [a, b] = footprint(part, board);
  if (!a || !b) return group;
  const pa = position3D(a, 0.03, board),
    pb = position3D(b, 0.03, board),
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
    const radius = ((part.diameter || 5) / 2.54) * 0.13;
    const brightness = reading?.brightness ?? (reading?.on ? 1 : 0);
    mesh(
      group,
      new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, 0.06, 32),
      material,
      new THREE.Vector3(0, 0.12, 0),
    );
    const ledMaterial = new THREE.MeshPhysicalMaterial({
      color: reading?.state === 'danger' ? '#4b4540' : part.color,
      roughness: 0.18,
      metalness: 0,
      clearcoat: 1,
      transparent: true,
      opacity: reading?.on ? 0.92 : 0.65,
      emissive: part.color,
      emissiveIntensity: reading?.on ? brightness * 1.15 : 0.01,
    });
    mesh(
      group,
      new THREE.CylinderGeometry(radius, radius, radius * 1.6, 32),
      ledMaterial,
      new THREE.Vector3(0, 0.15 + radius * 0.8, 0),
    );
    mesh(
      group,
      new THREE.SphereGeometry(radius, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      ledMaterial,
      new THREE.Vector3(0, 0.15 + radius * 1.6, 0),
    );
  } else if (part.type === 'diode') {
    const body = mesh(
      group,
      new THREE.CylinderGeometry(0.075, 0.075, 0.45, 24),
      new THREE.MeshPhysicalMaterial({ color: part.color, roughness: 0.22, clearcoat: 1 }),
      new THREE.Vector3(0, 0.2, 0),
    );
    body.rotation.z = Math.PI / 2;
    const band = mesh(
      group,
      new THREE.CylinderGeometry(0.078, 0.078, 0.055, 24),
      plastic('#b6bbb4'),
      new THREE.Vector3(0.15, 0.2, 0),
    );
    band.rotation.z = Math.PI / 2;
  } else if (part.type === 'ldr') {
    mesh(
      group,
      new THREE.CylinderGeometry(0.23, 0.23, 0.055, 32),
      plastic('#c39561'),
      new THREE.Vector3(0, 0.24, 0),
    );
    const points = [
      [-0.14, -0.14],
      [0.1, -0.14],
      [0.1, -0.07],
      [-0.14, -0.07],
      [-0.14, 0],
      [0.14, 0],
      [0.14, 0.07],
      [-0.14, 0.07],
      [-0.14, 0.14],
      [0.1, 0.14],
    ].map(([x, z]) => new THREE.Vector3(x, 0.272, z));
    tube(group, points, '#79513b', 0.012);
  } else if (part.type === 'rheostat') {
    cube(group, [0.52, 0.28, 0.42], '#417b96', [0, 0.24, 0]);
    mesh(
      group,
      new THREE.CylinderGeometry(0.14, 0.14, 0.08, 28),
      plastic('#bbc4c1'),
      new THREE.Vector3(0, 0.42, 0),
    );
    const needle = cube(group, [0.026, 0.01, 0.22], '#53666a', [0, 0.466, 0]);
    needle.rotation.y =
      ((-135 + (part.value / (part.maxResistance || 10000)) * 270) * Math.PI) / 180;
  } else if (part.type === 'lamp') {
    const glass = new THREE.MeshPhysicalMaterial({
      color: '#ede4ca',
      transparent: true,
      opacity: 0.45,
      roughness: 0.15,
      clearcoat: 1,
    });
    mesh(group, new THREE.SphereGeometry(0.29, 28, 20), glass, new THREE.Vector3(0, 0.48, 0));
    mesh(
      group,
      new THREE.CylinderGeometry(0.13, 0.13, 0.2, 24),
      metal,
      new THREE.Vector3(0, 0.18, 0),
    );
    const filamentMaterial = new THREE.MeshStandardMaterial({
      color: '#e5ba53',
      emissive: '#f0b94b',
      emissiveIntensity: (reading?.brightness || 0) * 2,
    });
    mesh(
      group,
      new THREE.TorusGeometry(0.1, 0.01, 8, 20),
      filamentMaterial,
      new THREE.Vector3(0, 0.48, 0),
    );
  } else if (part.type === 'source' && part.body === 'battery9') {
    cube(group, [0.58, 0.78, 0.38], '#3c4349', [0, 0.41, 0]);
    cube(group, [0.59, 0.18, 0.39], '#b08b54', [0, 0.72, 0]);
    mesh(
      group,
      new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16),
      metal,
      new THREE.Vector3(-0.14, 0.835, 0),
    );
    mesh(
      group,
      new THREE.CylinderGeometry(0.065, 0.065, 0.05, 6),
      metal,
      new THREE.Vector3(0.14, 0.835, 0),
    );
    tube(
      group,
      [
        new THREE.Vector3(ends[0], 0, 0),
        new THREE.Vector3(-0.4, 0.65, 0),
        new THREE.Vector3(-0.14, 0.86, 0),
      ],
      '#c46e54',
      0.02,
    );
    tube(
      group,
      [
        new THREE.Vector3(ends[1], 0, 0),
        new THREE.Vector3(0.4, 0.65, 0),
        new THREE.Vector3(0.14, 0.86, 0),
      ],
      '#283943',
      0.02,
    );
  } else if (part.type === 'source' && part.body === 'batteryAA') {
    cube(group, [0.85, 0.11, 0.6], '#313b43', [0, 0.1, 0]);
    for (const z of [-0.15, 0.15]) {
      const cell = mesh(
        group,
        new THREE.CylinderGeometry(0.125, 0.125, 0.74, 24),
        plastic('#b4b5ae'),
        new THREE.Vector3(0, 0.25, z),
      );
      cell.rotation.z = Math.PI / 2;
      const cap = mesh(
        group,
        new THREE.CylinderGeometry(0.127, 0.127, 0.19, 24),
        plastic('#b38e4e'),
        new THREE.Vector3(0.26, 0.25, z),
      );
      cap.rotation.z = Math.PI / 2;
    }
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
    if (part.momentary)
      mesh(
        group,
        new THREE.CylinderGeometry(0.1, 0.1, part.closed ? 0.06 : 0.12, 24),
        plastic('#b56f5d'),
        new THREE.Vector3(0, part.closed ? 0.31 : 0.35, 0),
      );
    else cube(group, [0.14, 0.08, 0.22], '#a1b1af', [part.closed ? 0.08 : -0.08, 0.33, 0]);
  }
  if (selected) {
    const marker = new THREE.Mesh(
      new THREE.TorusGeometry(
        Math.max(
          0.32,
          distance / 2 + 0.08,
          part.type === 'led' ? ((part.diameter || 5) / 2.54) * 0.13 + 0.06 : 0,
        ),
        0.012,
        6,
        48,
      ),
      new THREE.MeshBasicMaterial({ color: '#53ab95' }),
    );
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.015;
    group.add(marker);
  }
  return group;
}

export function buildWire(wire, board = getBoard()) {
  const { holeById } = board;
  const group = new THREE.Group();
  group.userData.uid = wire.uid;
  const a = position3D(holeById[wire.from], 0.03, board),
    b = position3D(holeById[wire.to], 0.03, board);
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
