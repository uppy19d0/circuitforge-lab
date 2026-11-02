import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { createComponent, getDefinition } from '../data/components';
import { footprint, holeById, shiftAnchor, validatePlacement } from '../domain/breadboard';
import { createExample } from '../domain/projects';
import { simulateCircuit } from '../engine/simulator';

const STORAGE_KEY = 'circuitforge.project.v2';
function readSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (
      saved?.version === 2 &&
      saved.components?.length <= 80 &&
      saved.wires?.length <= 100 &&
      saved.components.every(
        (c) => getDefinition(c.id) && footprint(c).length === 2 && Number.isFinite(c.value),
      ) &&
      saved.wires.every((w) => holeById[w.from] && holeById[w.to])
    )
      return saved;
  } catch {}
  return createExample();
}
export function useWorkbench() {
  const project = ref(readSaved());
  const selectedUid = ref('p2');
  const view = ref('board');
  const tool = ref('select');
  const placing = ref(null);
  const wireStart = ref(null);
  const hoveredHole = ref(null);
  const zoom = ref(1);
  const running = ref(true);
  const notice = ref('Arrastra un componente por su cuerpo o elige una pieza en la biblioteca.');
  const history = ref([]);
  const future = ref([]);
  const saving = ref(true);
  const selected = computed(
    () =>
      project.value.components.find((c) => c.uid === selectedUid.value) ||
      project.value.wires.find((w) => w.uid === selectedUid.value),
  );
  const liveResult = computed(() => simulateCircuit(project.value));
  const result = computed(() =>
    running.value
      ? liveResult.value
      : {
          ...liveResult.value,
          state: 'idle',
          label: 'Simulación pausada',
          current: 0,
          power: 0,
          parts: {},
          nodeVoltages: {},
        },
  );
  let timer;
  function message(text) {
    notice.value = text;
  }
  function snapshot() {
    history.value.push(JSON.stringify(project.value));
    if (history.value.length > 40) history.value.shift();
    future.value = [];
  }
  function restore(value) {
    project.value = JSON.parse(value);
    selectedUid.value = null;
    cancelTool();
  }
  function undo() {
    if (history.value.length) {
      future.value.push(JSON.stringify(project.value));
      restore(history.value.pop());
    }
  }
  function redo() {
    if (future.value.length) {
      history.value.push(JSON.stringify(project.value));
      restore(future.value.pop());
    }
  }
  function cancelTool() {
    placing.value = null;
    wireStart.value = null;
    tool.value = 'select';
  }
  function choosePart(id) {
    placing.value = id;
    wireStart.value = null;
    tool.value = 'place';
    message(
      'Elige un agujero para el primer terminal. R cambia la orientación después de colocar.',
    );
  }
  function selectTool(next) {
    cancelTool();
    tool.value = next;
  }
  function placeAt(holeId) {
    if (tool.value === 'wire') {
      if (
        project.value.components.some((c) => footprint(c).some((p) => p.id === holeId)) ||
        project.value.wires.some((w) => [w.from, w.to].includes(holeId))
      ) {
        message('Contacto ocupado: utiliza un agujero libre del mismo grupo.');
        return;
      }
      if (!wireStart.value) {
        wireStart.value = holeId;
        message('Selecciona el segundo extremo del cable. Esc cancela.');
        return;
      }
      if (wireStart.value === holeId) return;
      snapshot();
      project.value.wires.push({
        uid: 'w' + crypto.randomUUID().slice(0, 8),
        from: wireStart.value,
        to: holeId,
        color: '#549e8a',
      });
      wireStart.value = null;
      message('Cable conectado. Selecciona otros dos contactos para continuar.');
      return;
    }
    if (!placing.value) return;
    const part = createComponent(placing.value, holeId, 'p' + crypto.randomUUID().slice(0, 8));
    const usedLabels = new Set(project.value.components.map((item) => item.label));
    let sequence = 1;
    while (usedLabels.has(part.prefix + sequence)) sequence++;
    part.label = part.prefix + sequence;
    const check = validatePlacement(part, project.value.components, project.value.wires);
    if (!check.valid) {
      message(check.reason);
      return;
    }
    snapshot();
    project.value.components.push(part);
    selectedUid.value = part.uid;
    cancelTool();
    message(check.reason);
  }
  function movePart(candidate) {
    const check = validatePlacement(candidate, project.value.components, project.value.wires);
    if (!check.valid) {
      message(check.reason);
      return false;
    }
    const index = project.value.components.findIndex((c) => c.uid === candidate.uid);
    if (index < 0) return false;
    snapshot();
    project.value.components[index] = { ...candidate };
    selectedUid.value = candidate.uid;
    message(check.reason);
    return true;
  }
  function removeSelected() {
    if (!selected.value) return;
    snapshot();
    project.value.components = project.value.components.filter((c) => c.uid !== selectedUid.value);
    project.value.wires = project.value.wires.filter((w) => w.uid !== selectedUid.value);
    selectedUid.value = null;
    message('Elemento eliminado. Puedes deshacer el cambio.');
  }
  function rotate() {
    if (selected.value?.type)
      movePart({ ...selected.value, rotation: (selected.value.rotation + 1) % 4 });
  }
  function updatePart(changes) {
    if (!selected.value?.type) return;
    const value = changes.value;
    if (
      value !== undefined &&
      (!Number.isFinite(value) ||
        value <= 0 ||
        value > (selected.value.type === 'source' ? 24 : 10000000))
    ) {
      message('Introduce un valor válido: fuente de 0–24 V o resistencia positiva.');
      return;
    }
    snapshot();
    Object.assign(selected.value, changes);
  }
  function loadExample(name) {
    snapshot();
    project.value = createExample(name);
    selectedUid.value = project.value.components[1]?.uid || null;
    cancelTool();
    message('Ejemplo cargado. Todos los elementos se pueden editar.');
  }
  function keyboard(event) {
    if (event.target.closest('input, textarea, select, [contenteditable]')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      event.shiftKey ? redo() : undo();
      return;
    }
    if (event.key === 'Escape') cancelTool();
    if (event.key.toLowerCase() === 'r') rotate();
    if (event.key.toLowerCase() === 'w') selectTool('wire');
    if (event.key.toLowerCase() === 'v') selectTool('select');
    if (['Delete', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      removeSelected();
    }
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      event.key
    ];
    if (delta && selected.value?.type) {
      event.preventDefault();
      const anchor = shiftAnchor(selected.value, ...delta);
      if (anchor) movePart({ ...selected.value, anchor });
    }
  }
  window.addEventListener('keydown', keyboard);
  watch(
    project,
    () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(project.value));
          saving.value = true;
        } catch {
          saving.value = false;
        }
      }, 200);
    },
    { deep: true },
  );
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', keyboard);
    clearTimeout(timer);
  });
  return {
    project,
    selected,
    selectedUid,
    view,
    tool,
    placing,
    wireStart,
    hoveredHole,
    zoom,
    running,
    notice,
    result,
    history,
    future,
    saving,
    message,
    undo,
    redo,
    cancelTool,
    selectTool,
    choosePart,
    placeAt,
    movePart,
    removeSelected,
    rotate,
    updatePart,
    loadExample,
  };
}
