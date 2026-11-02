export const componentCatalog = [
  {
    id: 'resistor',
    type: 'resistor',
    name: 'Resistencia axial',
    subtitle: 'Película de carbono · ¼ W',
    category: 'Pasivos',
    prefix: 'R',
    value: 470,
    unit: 'Ω',
    color: '#b59b69',
    rating: 0.25,
  },
  {
    id: 'resistor1k',
    type: 'resistor',
    name: 'Resistencia de 1 kΩ',
    subtitle: 'Divisores y limitación · ¼ W',
    category: 'Pasivos',
    prefix: 'R',
    value: 1000,
    unit: 'Ω',
    color: '#b59b69',
    rating: 0.25,
  },
  {
    id: 'led',
    type: 'led',
    name: 'LED rojo · 5 mm',
    subtitle: 'Ánodo / cátodo · 20 mA',
    category: 'Semiconductores',
    prefix: 'D',
    value: 2,
    unit: 'V',
    color: '#db4c43',
    rating: 0.02,
  },
  {
    id: 'ledGreen',
    type: 'led',
    name: 'LED verde · 5 mm',
    subtitle: 'Ánodo / cátodo · 20 mA',
    category: 'Semiconductores',
    prefix: 'D',
    value: 2.2,
    unit: 'V',
    color: '#48a678',
    rating: 0.02,
  },
  {
    id: 'source',
    type: 'source',
    name: 'Fuente DC',
    subtitle: 'Dos cables · resistencia interna 0,8 Ω',
    category: 'Alimentación',
    prefix: 'V',
    value: 9,
    unit: 'V',
    color: '#536078',
    rating: 1,
  },
  {
    id: 'switch',
    type: 'switch',
    name: 'Interruptor SPST',
    subtitle: 'Contacto abierto / cerrado',
    category: 'Entradas',
    prefix: 'S',
    value: 0,
    unit: '',
    color: '#697486',
    rating: 1,
  },
];
export const getDefinition = (id) => componentCatalog.find((component) => component.id === id);
export function createComponent(id, anchor, uid, rotation = 0) {
  const definition = getDefinition(id);
  if (!definition) throw new Error('Componente desconocido');
  return {
    ...definition,
    uid,
    anchor,
    rotation,
    label: definition.prefix + uid.replace(/\D/g, ''),
    closed: false,
  };
}

const bandColors = [
  '#292b30',
  '#785036',
  '#c5433d',
  '#df8a3d',
  '#d5b949',
  '#3f8050',
  '#3660a4',
  '#8256a4',
  '#7c8287',
  '#ecebe4',
];
export function resistorBands(value) {
  if (!(value > 0)) return ['#292b30', '#292b30', '#292b30', '#bc9a4b'];
  let exponent = Math.floor(Math.log10(value)) - 1;
  const digits = Math.round(value / 10 ** exponent);
  return [
    bandColors[Math.floor(digits / 10) % 10],
    bandColors[digits % 10],
    exponent >= 0 ? bandColors[exponent] || '#7c8287' : exponent === -1 ? '#bc9a4b' : '#b8bcc2',
    '#bc9a4b',
  ];
}
