// Shared physical topology for drawing, pointer interaction, 3D and DC analysis.
export const ROWS = 'abcdefghij'.split('');
export const boardCatalog = [
  {
    id: 'mini170',
    name: 'Mini · 170 contactos',
    shortName: 'Mini 170',
    columns: 17,
    contacts: 170,
    width: 576,
    height: 450,
    dimensions: '46 × 36 mm',
    railContacts: 0,
    rails: false,
    splitRails: false,
    rowY: [70, 96, 122, 148, 174, 252, 278, 304, 330, 356],
    trenchY: 213,
    railLines: [],
  },
  {
    id: 'bb400',
    name: 'Mediana · 400 contactos',
    shortName: 'BB-400',
    columns: 30,
    contacts: 400,
    width: 920,
    height: 600,
    dimensions: '83 × 55 mm',
    railContacts: 25,
    rails: true,
    splitRails: false,
    rowY: [158, 184, 210, 236, 262, 340, 366, 392, 418, 444],
    trenchY: 301,
    railLines: [48, 112, 490, 554],
  },
  {
    id: 'bb830',
    name: 'Larga · 830 contactos',
    shortName: 'BB-830',
    columns: 63,
    contacts: 830,
    width: 1778,
    height: 600,
    dimensions: '165 × 55 mm',
    railContacts: 50,
    rails: true,
    splitRails: true,
    rowY: [158, 184, 210, 236, 262, 340, 366, 392, 418, 444],
    trenchY: 301,
    railLines: [48, 112, 490, 554],
  },
];
const cache = new Map();
export function getBoard(boardId = 'bb400', splitOverride) {
  const definition = boardCatalog.find((board) => board.id === boardId) || boardCatalog[1];
  const split = definition.rails && (splitOverride ?? definition.splitRails);
  const key = definition.id + ':' + split;
  if (cache.has(key)) return cache.get(key);
  const board = { ...definition, pitch: 26, splitRails: split };
  board.holes = ROWS.flatMap((row, index) =>
    Array.from({ length: board.columns }, (_, col) => ({
      id: row + (col + 1),
      row,
      col,
      x: 80 + col * 26,
      y: board.rowY[index],
      net: (index < 5 ? 'upper:' : 'lower:') + (col + 1),
      kind: 'terminal',
    })),
  );
  for (const [rail, y] of board.rails
    ? [
        ['tp', 64],
        ['tn', 96],
        ['bp', 506],
        ['bn', 538],
      ]
    : []) {
    for (let i = 0; i < board.railContacts; i++) {
      const col =
        Math.floor(i / 5) * 6 + (i % 5) + (board.columns === 63 ? 1 + (i >= 25 ? 2 : 0) : 0);
      board.holes.push({
        id: rail + (col + 1),
        col,
        row: rail,
        x: 80 + col * 26,
        y,
        net: rail + (split ? (col < Math.floor(board.columns / 2) ? ':left' : ':right') : ''),
        kind: 'rail',
      });
    }
  }
  board.holeById = Object.fromEntries(board.holes.map((hole) => [hole.id, hole]));
  cache.set(key, board);
  return board;
}
export function projectBoard(project) {
  return getBoard(project.boardId, project.splitRails);
}
// Default exports remain for consumers of the original half-size board API.
export const BOARD = getBoard();
export const holes = BOARD.holes;
export const holeById = BOARD.holeById;

export function nearestHole(point, terminalsOnly = false, maxDistance = 34, board = BOARD) {
  let closest = null,
    distance = maxDistance;
  for (const hole of board.holes) {
    if (terminalsOnly && hole.kind !== 'terminal') continue;
    const next = Math.hypot(point.x - hole.x, point.y - hole.y);
    if (next < distance) {
      closest = hole;
      distance = next;
    }
  }
  return closest;
}
export function footprint(component, board = BOARD) {
  const anchor = board.holeById[component.anchor];
  if (!anchor || anchor.kind !== 'terminal') return [];
  const span =
    component.span ?? (component.type === 'resistor' ? 4 : component.type === 'source' ? 3 : 1);
  const direction = (((component.rotation || 0) % 4) + 4) % 4;
  const dx = [span, 0, -span, 0][direction],
    dy = [0, span, 0, -span][direction];
  const row = ROWS.indexOf(anchor.row) + dy,
    col = anchor.col + dx + 1;
  const other = board.holeById[(ROWS[row] || '?') + col];
  return other ? [anchor, other] : [];
}
export function validatePlacement(candidate, components, wires = [], board = BOARD) {
  const pins = footprint(candidate, board);
  if (pins.length !== 2)
    return { valid: false, reason: 'Los dos terminales deben quedar dentro de la placa.', pins };
  const occupied = new Set(
    components
      .filter((c) => c.uid !== candidate.uid)
      .flatMap((c) => footprint(c, board).map((p) => p.id)),
  );
  for (const wire of wires) {
    occupied.add(wire.from);
    occupied.add(wire.to);
  }
  if (pins.some((pin) => occupied.has(pin.id)))
    return {
      valid: false,
      reason: 'Ese agujero ya tiene un terminal. Usa otro contacto del mismo nodo.',
      pins,
    };
  return {
    valid: true,
    reason: 'Terminales ' + pins.map((p) => p.id.toUpperCase()).join(' · '),
    pins,
  };
}
export function shiftAnchor(component, dx, dy, board = BOARD) {
  const hole = board.holeById[component.anchor],
    row = ROWS.indexOf(hole?.row) + dy;
  return hole ? board.holeById[(ROWS[row] || '?') + (hole.col + 1 + dx)]?.id : null;
}
