<script setup>
import { computed } from 'vue';
import { footprint } from '../domain/breadboard';
import { resistorBands } from '../data/components';
const props = defineProps({
  part: Object,
  reading: Object,
  selected: Boolean,
  preview: Boolean,
  points: Array,
});
const pins = computed(() => props.points || footprint(props.part));
const length = computed(() =>
  pins.value.length === 2
    ? Math.hypot(pins.value[1].x - pins.value[0].x, pins.value[1].y - pins.value[0].y)
    : 52,
);
const transform = computed(() => {
  if (pins.value.length !== 2) return '';
  const [a, b] = pins.value;
  return (
    'translate(' +
    (a.x + b.x) / 2 +
    ',' +
    (a.y + b.y) / 2 +
    ') rotate(' +
    (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI +
    ')'
  );
});
</script>
<template>
  <g
    v-if="pins.length === 2"
    class="part-graphic"
    :class="{
      'is-selected': selected,
      'is-ghost': preview,
      'part-fault': reading?.state === 'danger',
    }"
  >
    <g :transform="transform">
      <rect
        v-if="selected"
        class="selection-outline"
        :x="-length / 2 - 10"
        y="-47"
        :width="length + 20"
        height="78"
        rx="9"
      />
      <line :x1="-length / 2" y1="0" :x2="length / 2" y2="0" stroke="#8e959b" stroke-width="4" />
      <template v-if="part.type === 'resistor'">
        <rect
          x="-31"
          y="-13"
          width="62"
          height="26"
          rx="10"
          fill="#c8af83"
          stroke="#a68d65"
          stroke-width="1.3"
        />
        <rect
          v-for="(color, index) in resistorBands(part.value)"
          :key="index"
          :x="-20 + index * 13"
          y="-12"
          width="5"
          height="24"
          rx="1"
          :fill="color"
        />
        <path d="M-22-9H20" stroke="#f5e4c7" stroke-opacity=".45" stroke-width="2" />
      </template>
      <template v-else-if="part.type === 'led'">
        <circle v-if="reading?.on" r="28" :fill="part.color" opacity=".13" />
        <circle
          r="16"
          :fill="reading?.state === 'danger' ? '#554d48' : part.color"
          stroke="#913b36"
          stroke-width="1.5"
        />
        <path
          d="M-4-11a10 10 0 0111 6"
          fill="none"
          stroke="#fff"
          stroke-opacity=".6"
          stroke-width="3"
        />
        <path d="M12-10v20" stroke="#4d2925" stroke-width="2" />
      </template>
      <template v-else-if="part.type === 'source'">
        <rect x="-37" y="-37" width="74" height="65" rx="7" fill="#3c4654" stroke="#687380" />
        <rect x="-29" y="-29" width="58" height="23" rx="3" fill="#192b28" />
        <text
          x="0"
          y="-12"
          text-anchor="middle"
          fill="#a8d7a2"
          font-size="13"
          font-family="monospace"
          >{{ part.value.toFixed(1) }} V</text
        >
        <circle cx="-15" cy="14" r="5" fill="#c96854" /><circle
          cx="15"
          cy="14"
          r="5"
          fill="#181e26"
        />
        <text x="-15" y="5" text-anchor="middle" fill="#dcd6c9" font-size="8">+</text
        ><text x="15" y="5" text-anchor="middle" fill="#dcd6c9" font-size="8">−</text>
      </template>
      <template v-else-if="part.type === 'switch'">
        <rect x="-19" y="-13" width="38" height="26" rx="3" fill="#3e4650" stroke="#252b33" />
        <rect :x="part.closed ? 1 : -15" y="-9" width="14" height="18" rx="2" fill="#9aa6a6" />
      </template>
      <text
        v-if="!preview"
        x="0"
        :y="part.type === 'source' ? -48 : -25"
        text-anchor="middle"
        class="part-label"
        >{{ part.label }}</text
      >
    </g>
    <circle
      v-for="pin in pins"
      :key="pin.id || pin.x"
      :cx="pin.x"
      :cy="pin.y"
      r="3.3"
      fill="#a0a8ad"
      stroke="#f6f6f1"
      stroke-width="1"
    />
  </g>
</template>
