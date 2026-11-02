<script setup>
import { computed, ref } from 'vue';
import {
  BOARD,
  ROWS,
  holes,
  holeById,
  footprint,
  nearestHole,
  validatePlacement,
} from '../domain/breadboard';
import { createComponent } from '../data/components';
import PartGraphic from './PartGraphic.vue';
const props = defineProps({
  project: Object,
  selectedUid: String,
  result: Object,
  tool: String,
  placing: String,
  wireStart: String,
  zoom: Number,
});
const emit = defineEmits(['select', 'move', 'hole', 'hover', 'notice']);
const surface = ref(null);
const hover = ref(null);
const candidate = ref(null);
const dragging = ref(null);
let origin = null;
const preview = computed(() => {
  if (candidate.value) return candidate.value;
  if (props.placing && hover.value?.kind === 'terminal')
    return createComponent(props.placing, hover.value.id, 'preview');
  return null;
});
const validity = computed(() =>
  preview.value
    ? validatePlacement(preview.value, props.project.components, props.project.wires)
    : null,
);
const shownNet = computed(() => hover.value?.net);
const viewBox = computed(() => {
  const width = 1110 / props.zoom,
    height = 760 / props.zoom;
  return (
    (BOARD.width - width) / 2 + ' ' + ((BOARD.height - height) / 2 - 4) + ' ' + width + ' ' + height
  );
});
function point(event) {
  const matrix = surface.value?.getScreenCTM();
  return matrix
    ? new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    : { x: 0, y: 0 };
}
function start(event, part) {
  if (event.button !== 0 || props.tool !== 'select' || event.isPrimary === false) return;
  event.preventDefault();
  event.stopPropagation();
  emit('select', part.uid);
  const p = point(event),
    pin = footprint(part)[0];
  origin = { x: p.x, y: p.y, dx: p.x - pin.x, dy: p.y - pin.y, pointer: event.pointerId, part };
  surface.value.setPointerCapture(event.pointerId);
  dragging.value = part.uid;
}
function move(event) {
  const p = point(event);
  if (origin) {
    const pin = nearestHole({ x: p.x - origin.dx, y: p.y - origin.dy }, true, 80);
    candidate.value = pin ? { ...origin.part, anchor: pin.id } : null;
    hover.value = pin;
  } else hover.value = nearestHole(p, false, 20);
  emit('hover', hover.value?.id || null);
}
function finish(event) {
  if (!origin) return;
  if (candidate.value && candidate.value.anchor !== origin.part.anchor) {
    if (validity.value.valid) emit('move', candidate.value);
    else emit('notice', validity.value.reason);
  }
  cancel(event);
}
function cancel(event) {
  if (origin && surface.value?.hasPointerCapture(origin.pointer))
    surface.value.releasePointerCapture(origin.pointer);
  origin = null;
  candidate.value = null;
  dragging.value = null;
}
function click(event) {
  if (props.tool === 'place' || props.tool === 'wire') {
    const hole = nearestHole(point(event), props.tool === 'place', 23);
    if (hole) emit('hole', hole.id);
  }
}
function wirePath(wire) {
  const a = holeById[wire.from],
    b = holeById[wire.to];
  const lift = Math.max(32, Math.min(100, Math.abs(b.x - a.x) * 0.18));
  return (
    'M' +
    a.x +
    ',' +
    a.y +
    ' C' +
    a.x +
    ',' +
    (a.y - lift) +
    ' ' +
    b.x +
    ',' +
    (b.y - lift) +
    ' ' +
    b.x +
    ',' +
    b.y
  );
}
</script>
<template>
  <svg
    ref="surface"
    class="breadboard-surface"
    :class="'tool-' + tool"
    :viewBox="viewBox"
    aria-label="Protoboard de 400 contactos. Arrastra componentes o conecta contactos con la herramienta cable."
    @pointermove="move"
    @pointerup="finish"
    @pointercancel="cancel"
    @lostpointercapture="cancel"
    @click="click"
  >
    <defs>
      <linearGradient id="board-plastic" x2="0" y2="1">
        <stop stop-color="#f8f7f0" />
        <stop offset="1" stop-color="#e9e8df" />
      </linearGradient>
      <filter id="board-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="15" stdDeviation="12" flood-opacity=".22" />
      </filter>
    </defs>
    <g class="board-base">
      <rect
        x="0"
        y="0"
        width="920"
        height="600"
        rx="14"
        fill="url(#board-plastic)"
        stroke="#d7d8cf"
        filter="url(#board-shadow)"
      />
      <rect x="0" y="588" width="920" height="12" rx="5" fill="#d6d7ce" />
      <rect x="51" y="137" width="809" height="144" rx="4" fill="#dedfd6" fill-opacity=".55" />
      <rect x="51" y="321" width="809" height="144" rx="4" fill="#dedfd6" fill-opacity=".55" />
      <path d="M22 301H898" stroke="#c7c9bf" stroke-width="20" />
      <path d="M22 292H898" stroke="#bfc3b7" stroke-width="1.5" />
      <g v-for="(y, index) in [48, 112, 490, 554]" :key="y">
        <path
          :d="'M53 ' + y + 'H862'"
          :stroke="index % 2 ? '#6488a6' : '#bf7569'"
          stroke-width="2"
        />
        <text x="31" :y="y + 4" :fill="index % 2 ? '#6488a6' : '#bf7569'" font-size="15">
          {{ index % 2 ? '−' : '+' }}
        </text>
      </g>
      <g class="board-print">
        <text v-for="n in 30" :key="'top' + n" :x="80 + (n - 1) * 26" y="130" text-anchor="middle">
          {{ n === 1 || n % 5 === 0 ? n : '' }}
        </text>
        <text
          v-for="n in 30"
          :key="'bottom' + n"
          :x="80 + (n - 1) * 26"
          y="483"
          text-anchor="middle"
        >
          {{ n === 1 || n % 5 === 0 ? n : '' }}
        </text>
        <text v-for="row in ROWS" :key="row" x="39" :y="holeById[row + '1'].y + 4">{{ row }}</text>
      </g>
      <rect
        v-for="hole in holes"
        :key="hole.id"
        :x="hole.x - 4"
        :y="hole.y - 4"
        width="8"
        height="8"
        rx="1.5"
        fill="#333a3c"
        stroke="#bdc0b4"
        stroke-width="1"
      />
      <g v-if="shownNet" pointer-events="none">
        <circle
          v-for="hole in holes.filter((h) => h.net === shownNet)"
          :key="hole.id"
          :cx="hole.x"
          :cy="hole.y"
          r="9"
          fill="#4f9f8544"
          stroke="#519d84"
          stroke-width="1.5"
        />
      </g>
    </g>
    <g
      v-for="wire in project.wires"
      :key="wire.uid"
      class="board-wire"
      :class="{ selected: selectedUid === wire.uid }"
      role="button"
      tabindex="0"
      :aria-label="'Seleccionar cable ' + wire.from + ' a ' + wire.to"
      @click.stop="tool === 'select' && $emit('select', wire.uid)"
      @keydown.enter="$emit('select', wire.uid)"
    >
      <path
        :d="wirePath(wire)"
        stroke="#000"
        stroke-opacity=".15"
        stroke-width="9"
        transform="translate(0 3)"
      />
      <path :d="wirePath(wire)" :stroke="wire.color" stroke-width="6" />
      <path :d="wirePath(wire)" stroke="transparent" stroke-width="15" />
      <circle
        v-for="id in [wire.from, wire.to]"
        :key="id"
        :cx="holeById[id].x"
        :cy="holeById[id].y"
        r="3"
        fill="#b7c0c2"
      />
    </g>
    <g
      v-for="part in project.components"
      :key="part.uid"
      :data-part="part.uid"
      class="movable-part"
      :opacity="dragging === part.uid ? 0.3 : 1"
      role="button"
      tabindex="0"
      :aria-label="'Seleccionar ' + part.label + ', ' + part.name"
      @pointerdown="start($event, part)"
      @click.stop="tool === 'select' && $emit('select', part.uid)"
      @keydown.enter="$emit('select', part.uid)"
    >
      <PartGraphic
        :part="part"
        :reading="result.parts[part.uid]"
        :selected="selectedUid === part.uid"
      />
    </g>
    <g v-if="preview" pointer-events="none" :class="{ 'invalid-preview': !validity.valid }">
      <PartGraphic :part="preview" :preview="true" />
      <circle
        v-for="pin in validity.pins"
        :key="pin.id"
        :cx="pin.x"
        :cy="pin.y"
        r="10"
        fill="none"
        :stroke="validity.valid ? '#2b9871' : '#cc5c50'"
        stroke-width="3"
      />
    </g>
    <circle
      v-if="wireStart"
      :cx="holeById[wireStart].x"
      :cy="holeById[wireStart].y"
      r="11"
      fill="none"
      stroke="#dc9f44"
      stroke-width="3"
    />
    <path
      v-if="wireStart && hover"
      :d="wirePath({ from: wireStart, to: hover.id })"
      stroke="#d1a35e"
      stroke-width="3"
      stroke-dasharray="6 5"
      fill="none"
      pointer-events="none"
    />
  </svg>
</template>
