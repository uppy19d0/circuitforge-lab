<script setup>
import { computed } from 'vue';
import { buildNetlist, formatCurrent, formatVoltage, resistanceFor } from '../engine/simulator';
const props = defineProps({ project: Object, result: Object, selectedUid: String });
defineEmits(['select']);
const graph = computed(() => {
  const { branches } = buildNetlist(props.project);
  const nets = [...new Set(branches.flatMap((part) => [part.a, part.b]))];
  const positions = Object.fromEntries(
    nets.map((net, i) => {
      const angle = -Math.PI * 0.75 + (i * Math.PI * 2) / Math.max(3, nets.length);
      return [
        net,
        { x: 460 + Math.cos(angle) * 255, y: 300 + Math.sin(angle) * 205, label: 'N' + (i + 1) },
      ];
    }),
  );
  return { nets, positions, branches };
});
function placement(part) {
  const a = graph.value.positions[part.a],
    b = graph.value.positions[part.b];
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
    length: Math.hypot(b.x - a.x, b.y - a.y),
  };
}
</script>
<template>
  <svg
    class="schematic-surface"
    viewBox="0 0 920 600"
    aria-label="Esquema eléctrico generado desde las conexiones actuales"
  >
    <defs>
      <pattern id="schematic-dots" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r=".8" fill="#bcc4c7" />
      </pattern>
    </defs>
    <rect width="920" height="600" fill="#f5f6f3" />
    <rect width="920" height="600" fill="url(#schematic-dots)" />
    <text x="32" y="40" class="schematic-heading">ESQUEMA · CONEXIONES DEL MONTAJE</text>
    <g
      v-for="part in graph.branches"
      :key="part.uid"
      class="schematic-part"
      :class="{ selected: part.uid === selectedUid }"
      tabindex="0"
      role="button"
      :aria-label="'Inspeccionar ' + part.label"
      @click="$emit('select', part.uid)"
      @keydown.enter="$emit('select', part.uid)"
    >
      <g
        :transform="
          'translate(' +
          placement(part).x +
          ',' +
          placement(part).y +
          ') rotate(' +
          placement(part).angle +
          ')'
        "
      >
        <path
          :d="'M' + -placement(part).length / 2 + ' 0H-32M32 0H' + placement(part).length / 2"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <rect
          x="-36"
          y="-26"
          width="72"
          height="52"
          rx="5"
          fill="#f5f6f3"
          :stroke="selectedUid === part.uid ? '#4e9b87' : 'none'"
        />
        <path
          v-if="['resistor', 'rheostat', 'ldr'].includes(part.type)"
          d="M-32 0h8l4-8 8 16 8-16 8 16 8-16 8 16 4-8h8"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        />
        <g
          v-else-if="['led', 'diode'].includes(part.type)"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M-30 0h16M-14-13L12 0-14 13ZM12-14v28M12 0h18" />
          <path v-if="part.type === 'led'" d="M0-20l12-12M12-20l12-12" />
          <path v-if="part.type === 'led'" d="M8-32h4v4M20-32h4v4" />
        </g>
        <g v-else-if="part.type === 'source'" fill="none" stroke="currentColor" stroke-width="2">
          <circle r="23" />
          <path d="M-10-5v10M-15 0h10M8 0h10M-32 0h9M23 0h9" />
        </g>
        <g v-else-if="part.type === 'lamp'" fill="none" stroke="currentColor" stroke-width="2">
          <circle r="21" />
          <path d="M-15-15l30 30M-15 15l30-30M-32 0h11M21 0h11" />
        </g>
        <g v-else fill="none" stroke="currentColor" stroke-width="2">
          <path :d="part.closed ? 'M-32 0H32' : 'M-32 0h10l36-18M22 0h10'" />
        </g>
      </g>
      <g :transform="'translate(' + placement(part).x + ',' + (placement(part).y - 44) + ')'">
        <text text-anchor="middle" class="schematic-label">
          {{ part.label }} ·
          {{
            part.type === 'switch'
              ? part.closed
                ? 'ON'
                : 'OFF'
              : (part.type === 'ldr' ? Math.round(resistanceFor(part)) : part.value) +
                ' ' +
                part.unit
          }}
        </text>
        <text y="16" text-anchor="middle" class="schematic-reading">
          {{ formatCurrent(result.parts[part.uid]?.current) }}
        </text>
      </g>
    </g>
    <g v-for="net in graph.nets" :key="net">
      <circle :cx="graph.positions[net].x" :cy="graph.positions[net].y" r="4" fill="#4e8c7a" />
      <text
        :x="graph.positions[net].x"
        :y="graph.positions[net].y + 24"
        text-anchor="middle"
        class="schematic-net"
      >
        {{ graph.positions[net].label }} · {{ formatVoltage(result.nodeVoltages[net]) }}
      </text>
    </g>
    <text
      v-if="!graph.branches.length"
      x="460"
      y="300"
      text-anchor="middle"
      fill="#727f84"
      font-size="16"
    >
      Coloca componentes en la vista Montaje.
    </text>
    <text x="32" y="572" class="schematic-caption">
      Los contactos conectados internamente y los cables se agrupan en un mismo nodo.
    </text>
  </svg>
</template>
