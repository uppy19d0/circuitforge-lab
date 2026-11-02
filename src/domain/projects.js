import { createComponent } from '../data/components.js';

export function createExample(name = 'led') {
  const source = createComponent('source', 'a2', 'p1');
  if (name === 'empty')
    return { version: 2, name: 'Circuito sin título', components: [], wires: [] };
  if (name === 'divider' || name === 'parallel') {
    source.value = 12;
    const r1 = createComponent('resistor1k', 'c6', 'p2');
    const r2 = createComponent('resistor1k', name === 'parallel' ? 'e6' : 'e10', 'p3');
    r2.value = 2000;
    return {
      version: 2,
      name: name === 'parallel' ? 'Resistencias en paralelo' : 'Divisor de tensión',
      components: [source, r1, r2],
      wires: [
        { uid: 'w1', from: 'b2', to: 'a6', color: '#cf6c55' },
        { uid: 'w2', from: 'b5', to: name === 'parallel' ? 'a10' : 'a14', color: '#5d85ab' },
      ],
    };
  }
  const resistor = createComponent('resistor', 'c6', 'p2');
  const led = createComponent('led', 'e10', 'p3');
  if (name === 'overload') resistor.value = 47;
  return {
    version: 2,
    name: name === 'overload' ? 'Límite de corriente del LED' : 'LED con resistencia',
    components: [source, resistor, led],
    wires: [
      { uid: 'w1', from: 'b2', to: 'a6', color: '#cf6c55' },
      { uid: 'w2', from: 'b5', to: 'a11', color: '#5d85ab' },
    ],
  };
}
