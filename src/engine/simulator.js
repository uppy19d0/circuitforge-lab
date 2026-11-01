const exercises = {
  led: { source: 9, resistance: 500, ledDrop: 2, ledLimit: 0.02 },
  divider: { source: 12, r1: 100, r2: 200 },
  inverter: { source: 5, pullup: 1000, transistorDrop: 0.2 },
  overload: { source: 9, resistance: 47, ledDrop: 2, ledLimit: 0.02 },
  short: { source: 9, resistance: 0, ledDrop: 0, ledLimit: 0.02 },
};

export function simulateCircuit(type = 'led') {
  const circuit = exercises[type] || exercises.led;
  if (type === 'divider') {
    const current = circuit.source / (circuit.r1 + circuit.r2);
    return { status: 'ok', label: 'FUNCIONANDO', voltage: circuit.source, current, output: current * circuit.r2, power: current ** 2 * circuit.r1, explanation: 'La corriente es igual en serie y el voltaje se reparte entre las resistencias.' };
  }
  if (type === 'inverter') return { status: 'ok', label: 'FUNCIONANDO', voltage: circuit.source, current: circuit.source / circuit.pullup, output: 0, power: 0.001, explanation: 'El transistor conduce y lleva la salida a nivel bajo.' };
  const current = circuit.resistance === 0 ? Infinity : (circuit.source - circuit.ledDrop) / circuit.resistance;
  const power = Number.isFinite(current) ? current ** 2 * circuit.resistance : Infinity;
  if (!Number.isFinite(current) || current > circuit.ledLimit * 3) return { status: 'danger', label: 'CORTOCIRCUITO', voltage: circuit.source, current, output: 0, power, explanation: 'La resistencia efectiva es demasiado baja: la corriente se dispara y el componente se quema.' };
  if (current > circuit.ledLimit) return { status: 'warn', label: 'SOBRECORRIENTE', voltage: circuit.source, current, output: circuit.ledDrop, power, explanation: 'La corriente supera el límite recomendado del LED.' };
  return { status: 'ok', label: 'FUNCIONANDO', voltage: circuit.source, current, output: circuit.ledDrop, power, explanation: 'La resistencia limita la corriente y protege al LED.' };
}

export function formatCurrent(value) { return Number.isFinite(value) ? `${(value * 1000).toFixed(1)} mA` : '∞ A'; }
