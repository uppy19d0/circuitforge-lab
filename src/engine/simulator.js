import { holes, holeById, footprint } from '../domain/breadboard.js';

class DisjointSet {
  constructor(keys) {
    this.parents = new Map(keys.map((key) => [key, key]));
  }
  find(key) {
    const parent = this.parents.get(key);
    if (parent !== key) this.parents.set(key, this.find(parent));
    return this.parents.get(key);
  }
  join(a, b) {
    this.parents.set(this.find(a), this.find(b));
  }
}

export function buildNetlist(project) {
  const sets = new DisjointSet([...new Set(holes.map((hole) => hole.net))]);
  for (const wire of project.wires) {
    const a = holeById[wire.from],
      b = holeById[wire.to];
    if (a && b) sets.join(a.net, b.net);
  }
  for (const part of project.components.filter((part) => part.type === 'switch' && part.closed)) {
    const pins = footprint(part);
    if (pins.length === 2) sets.join(pins[0].net, pins[1].net);
  }
  const netByHole = Object.fromEntries(holes.map((hole) => [hole.id, sets.find(hole.net)]));
  const branches = project.components.flatMap((part) => {
    const pins = footprint(part);
    return pins.length === 2
      ? [{ ...part, a: netByHole[pins[0].id], b: netByHole[pins[1].id] }]
      : [];
  });
  return { netByHole, branches };
}

function solveLinear(matrix, values) {
  const a = matrix.map((row, i) => [...row, values[i]]);
  for (let i = 0; i < a.length; i++) {
    let pivot = i;
    for (let j = i + 1; j < a.length; j++) if (Math.abs(a[j][i]) > Math.abs(a[pivot][i])) pivot = j;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    if (Math.abs(a[i][i]) < 1e-18) throw new Error('Red singular');
    const scale = a[i][i];
    for (let j = i; j <= a.length; j++) a[i][j] /= scale;
    for (let k = 0; k < a.length; k++) {
      if (k === i) continue;
      const factor = a[k][i];
      for (let j = i; j <= a.length; j++) a[k][j] -= factor * a[i][j];
    }
  }
  return a.map((row) => row[a.length]);
}

// Educational DC operating-point solver. LEDs use a forward-drop + 10 Ω model.
// Every source has 0.8 Ω internal resistance, so a short never produces infinity.
export function simulateCircuit(project) {
  const { netByHole, branches } = buildNetlist(project);
  const sources = branches.filter((part) => part.type === 'source');
  const empty = {
    netByHole,
    parts: {},
    nodeVoltages: {},
    voltage: 0,
    current: 0,
    power: 0,
    diagnostics: [],
  };
  if (sources.length !== 1)
    return {
      ...empty,
      state: 'idle',
      label: sources.length ? 'Revisa las fuentes' : 'Sin alimentación',
      explanation: sources.length
        ? 'Este análisis DC admite una fuente independiente por circuito.'
        : 'Coloca una fuente y conecta una carga para comenzar.',
    };
  const source = sources[0];
  const supply = Number(source.value);
  if (!(supply > 0) || !Number.isFinite(supply))
    return {
      ...empty,
      state: 'idle',
      label: 'Fuente no válida',
      explanation: 'La fuente necesita una tensión positiva.',
    };
  const ground = source.b;
  const nodes = [...new Set(branches.flatMap((part) => [part.a, part.b]))].filter(
    (node) => node !== ground,
  );
  const index = new Map(nodes.map((node, i) => [node, i]));
  let voltages = {};
  const active = new Set(branches.filter((part) => part.type === 'led').map((part) => part.uid));
  for (let iteration = 0; iteration < 30; iteration++) {
    const matrix = nodes.map(() => nodes.map(() => 0));
    const rhs = nodes.map(() => 0);
    const stamp = (a, b, conductance, drop = 0) => {
      const ia = index.get(a),
        ib = index.get(b);
      if (ia !== undefined) {
        matrix[ia][ia] += conductance;
        rhs[ia] += drop * conductance;
      }
      if (ib !== undefined) {
        matrix[ib][ib] += conductance;
        rhs[ib] -= drop * conductance;
      }
      if (ia !== undefined && ib !== undefined) {
        matrix[ia][ib] -= conductance;
        matrix[ib][ia] -= conductance;
      }
    };
    // A very small shunt permits floating/dangling branches without fabricated voltages.
    for (let i = 0; i < nodes.length; i++) matrix[i][i] = 1e-12;
    stamp(source.a, ground, 1 / 0.8, supply);
    for (const part of branches) {
      if (part.type === 'resistor') stamp(part.a, part.b, 1 / Math.max(0.1, part.value));
      if (part.type === 'led' && active.has(part.uid)) stamp(part.a, part.b, 1 / 10, part.value);
    }
    const solution = solveLinear(matrix, rhs);
    voltages = Object.fromEntries(nodes.map((node, i) => [node, solution[i]]));
    voltages[ground] = 0;
    let changed = false;
    for (const part of branches.filter((part) => part.type === 'led')) {
      const conducts = voltages[part.a] - voltages[part.b] > part.value + 1e-8;
      if (conducts !== active.has(part.uid)) {
        changed = true;
        if (conducts) active.add(part.uid);
        else active.delete(part.uid);
      }
    }
    if (!changed) break;
  }
  const current = Math.max(0, (supply - (voltages[source.a] || 0)) / 0.8);
  const diagnostics = [];
  const parts = Object.fromEntries(
    branches.map((part) => {
      const voltage = (voltages[part.a] || 0) - (voltages[part.b] || 0);
      let amps = 0;
      if (part.type === 'resistor') amps = voltage / Math.max(0.1, part.value);
      if (part.type === 'led')
        amps = active.has(part.uid) ? Math.max(0, (voltage - part.value) / 10) : 0;
      if (part.type === 'source') amps = current;
      const power = Math.abs(voltage * amps);
      const limitExceeded =
        part.type === 'led'
          ? amps > part.rating
          : part.type === 'resistor'
            ? power > part.rating
            : part.type === 'source' && amps > part.rating;
      const critical =
        part.type === 'led'
          ? amps > part.rating * 3
          : part.type === 'resistor'
            ? power > part.rating * 3
            : part.type === 'source' && amps > part.rating * 3;
      const state = critical ? 'danger' : limitExceeded ? 'warn' : 'ok';
      if (limitExceeded)
        diagnostics.push({
          uid: part.uid,
          state,
          message:
            part.label +
            ': ' +
            (part.type === 'resistor'
              ? 'potencia superior a ' + part.rating + ' W.'
              : 'corriente superior a ' + formatCurrent(part.rating) + '.'),
        });
      if (part.type === 'led' && voltage < -5)
        diagnostics.push({
          uid: part.uid,
          state: 'warn',
          message: part.label + ': polarización inversa excesiva para este LED.',
        });
      return [
        part.uid,
        { voltage, current: amps, power, state, on: part.type === 'led' && amps > 0.0001 },
      ];
    }),
  );
  const short = source.a === ground;
  const state =
    short || diagnostics.some((d) => d.state === 'danger')
      ? 'danger'
      : diagnostics.length
        ? 'warn'
        : current < 1e-7
          ? 'open'
          : 'ok';
  return {
    netByHole,
    parts,
    nodeVoltages: voltages,
    voltage: supply,
    current,
    power: supply * current,
    diagnostics,
    state,
    label: short
      ? 'Cortocircuito'
      : state === 'danger'
        ? 'Límite excedido'
        : state === 'warn'
          ? 'Sobrecarga'
          : state === 'open'
            ? 'Circuito abierto'
            : 'Funcionamiento normal',
    explanation: short
      ? 'Los terminales de la fuente comparten el mismo nodo. Revisa el cableado.'
      : diagnostics[0]?.message ||
        (state === 'open'
          ? 'No hay un camino conductor cerrado entre los terminales de la fuente.'
          : 'El análisis DC usa las conexiones y los valores de los componentes colocados.'),
  };
}

export function formatCurrent(value) {
  if (!Number.isFinite(value)) return '—';
  return Math.abs(value) < 1 ? (value * 1000).toFixed(2) + ' mA' : value.toFixed(2) + ' A';
}
export const formatVoltage = (value) => (Number.isFinite(value) ? value.toFixed(2) + ' V' : '—');
