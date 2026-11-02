// The drawing, pointer interactions, 3D scene and electrical netlist share these coordinates.
export const BOARD = { width: 920, height: 600, pitch: 26, columns: 30 };
export const ROWS = 'abcdefghij'.split('');
const rowY = [158, 184, 210, 236, 262, 340, 366, 392, 418, 444];
export const holes = ROWS.flatMap((row, index) =>
  Array.from({ length: BOARD.columns }, (_, col) => ({
    id: row + (col + 1),
    row,
    col,
    x: 80 + col * BOARD.pitch,
    y: rowY[index],
    net: (index < 5 ? 'upper:' : 'lower:') + (col + 1),
    kind: 'terminal',
  })),
);
for (const [rail, y] of [
  ['tp', 64],
  ['tn', 96],
  ['bp', 506],
  ['bn', 538],
]) {
  for (let col = 0; col < BOARD.columns; col++) {
    if (col % 6 === 5) continue; // 25 contacts in each bus: 400 contacts in total.
    holes.push({
      id: rail + (col + 1),
      col,
      row: rail,
      x: 80 + col * BOARD.pitch,
      y,
      net: rail,
      kind: 'rail',
    });
  }
}
export const holeById = Object.fromEntries(holes.map((hole) => [hole.id, hole]));

export function nearestHole(point, terminalsOnly = false, maxDistance = 34) {
  let closest = null;
  let distance = maxDistance;
  for (const hole of holes) {
    if (terminalsOnly && hole.kind !== 'terminal') continue;
    const next = Math.hypot(point.x - hole.x, point.y - hole.y);
    if (next < distance) {
      closest = hole;
      distance = next;
    }
  }
  return closest;
}

export function footprint(component) {
  const anchor = holeById[component.anchor];
  if (!anchor || anchor.kind !== 'terminal') return [];
  const span = component.type === 'resistor' ? 4 : component.type === 'source' ? 3 : 1;
  const direction = (((component.rotation || 0) % 4) + 4) % 4;
  const dx = [span, 0, -span, 0][direction];
  const dy = [0, span, 0, -span][direction];
  const row = ROWS.indexOf(anchor.row) + dy;
  const col = anchor.col + dx + 1;
  const other = holeById[(ROWS[row] || '?') + col];
  return other ? [anchor, other] : [];
}

export function validatePlacement(candidate, components, wires = []) {
  const pins = footprint(candidate);
  if (pins.length !== 2)
    return { valid: false, reason: 'Los dos terminales deben quedar dentro de la placa.', pins };
  const occupied = new Set(
    components.filter((c) => c.uid !== candidate.uid).flatMap((c) => footprint(c).map((p) => p.id)),
  );
  for (const wire of wires) {
    occupied.add(wire.from);
    occupied.add(wire.to);
  }
  if (pins.some((pin) => occupied.has(pin.id))) {
    return {
      valid: false,
      reason: 'Ese agujero ya tiene un terminal. Usa otro contacto del mismo nodo.',
      pins,
    };
  }
  return {
    valid: true,
    reason: 'Terminales ' + pins.map((p) => p.id.toUpperCase()).join(' · '),
    pins,
  };
}

export function shiftAnchor(component, dx, dy) {
  const hole = holeById[component.anchor];
  const row = ROWS.indexOf(hole?.row) + dy;
  return hole ? holeById[(ROWS[row] || '?') + (hole.col + 1 + dx)]?.id : null;
}
