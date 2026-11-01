export const componentCatalog = [
  { id: 'resistor', name: 'Resistencia', symbol: 'R', value: '1 kΩ', category: 'Pasivos', color: '#dca56b', pins: ['A', 'B'], description: 'Limita la corriente y permite dividir voltaje.' },
  { id: 'led', name: 'LED rojo', symbol: 'D', value: '2 V · 20 mA', category: 'Semiconductores', color: '#f36b70', pins: ['Ánodo', 'Cátodo'], description: 'Emite luz cuando circula corriente en polarización directa.' },
  { id: 'battery', name: 'Batería', symbol: 'V', value: '9 V DC', category: 'Fuentes', color: '#d84755', pins: ['+', '−'], description: 'Fuente de tensión continua para prácticas básicas.' },
  { id: 'switch', name: 'Interruptor', symbol: 'S', value: 'SPST', category: 'Entradas', color: '#65a7d8', pins: ['IN', 'OUT'], description: 'Abre o cierra el camino de corriente.' },
  { id: 'npn', name: 'Transistor NPN', symbol: 'Q', value: '2N3904', category: 'Semiconductores', color: '#6c8edf', pins: ['B', 'C', 'E'], description: 'Interruptor controlado por corriente de base.' },
  { id: 'and', name: 'Puerta AND', symbol: '&', value: '74HC08', category: 'Digital', color: '#a78bfa', pins: ['A', 'B', 'Y'], description: 'Produce 1 solo cuando todas sus entradas son 1.' },
];
