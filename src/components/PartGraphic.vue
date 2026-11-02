<script setup>
import { computed } from 'vue';
import { footprint, getBoard } from '../domain/breadboard';
import { resistorBands } from '../data/components';
const props = defineProps({
  part: Object,
  reading: Object,
  selected: Boolean,
  preview: Boolean,
  points: Array,
  board: Object,
});
const pins = computed(() => props.points || footprint(props.part, props.board || getBoard()));
const lensRadius = computed(() => ((props.part.diameter || 5) / 2.54) * 13);
const brightness = computed(() => props.reading?.brightness ?? (props.reading?.on ? 1 : 0));
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
        :x="-Math.max(length / 2 + 10, part.type === 'led' ? lensRadius + 10 : 0)"
        :y="part.type === 'led' ? -lensRadius - 28 : -47"
        :width="Math.max(length + 20, part.type === 'led' ? lensRadius * 2 + 20 : 0)"
        :height="part.type === 'led' ? lensRadius * 2 + 43 : 78"
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
        <circle
          v-if="reading?.on"
          :r="lensRadius * 1.6"
          :fill="part.color"
          :opacity="0.08 + brightness * 0.22"
        />
        <circle
          :r="lensRadius"
          :fill="reading?.state === 'danger' ? '#554d48' : part.color"
          stroke="#778084"
          stroke-width="1.5"
        />
        <path
          :transform="'scale(' + lensRadius / 16 + ')'"
          d="M-4-11a10 10 0 0111 6"
          fill="none"
          stroke="#fff"
          stroke-opacity=".6"
          stroke-width="3"
        />
        <path
          :transform="'scale(' + lensRadius / 16 + ')'"
          d="M12-10v20"
          stroke="#4d2925"
          stroke-width="2"
        />
      </template>
      <template v-else-if="part.type === 'diode'">
        <rect
          x="-25"
          y="-9"
          width="50"
          height="18"
          rx="4"
          :fill="part.color"
          stroke="#5b514a"
        /><rect x="12" y="-9" width="6" height="18" fill="#c6c6bc" /><path
          d="M-20-5H7"
          stroke="#e1ac8e"
          opacity=".6"
        />
      </template>
      <template v-else-if="part.type === 'ldr'">
        <circle r="22" fill="#c99963" stroke="#886744" stroke-width="2" /><path
          d="M-14-14h21v7h-21v7h28v7h-28v7h21"
          fill="none"
          stroke="#795139"
          stroke-width="3"
        /><circle r="17" fill="#f5d380" :opacity="(part.light ?? 50) / 500" />
      </template>
      <template v-else-if="part.type === 'rheostat'">
        <rect
          x="-27"
          y="-22"
          width="54"
          height="44"
          rx="4"
          fill="#518095"
          stroke="#325361"
        /><circle r="15" fill="#adb9b9" stroke="#cfdad6" /><path
          d="M0-12V8"
          stroke="#4c5d61"
          stroke-width="3"
          :transform="'rotate(' + (-135 + (part.value / (part.maxResistance || 10000)) * 270) + ')'"
        />
      </template>
      <template v-else-if="part.type === 'lamp'">
        <circle r="29" fill="#dfddd3" fill-opacity=".55" stroke="#93988f" /><circle
          v-if="reading?.on"
          r="26"
          fill="#f5c86a"
          :opacity="0.1 + brightness * 0.65"
        /><path
          d="M-15 0l6-9 6 18 6-18 6 18 6-9"
          fill="none"
          :stroke="reading?.on ? '#b47f24' : '#7c827d'"
          stroke-width="2"
        />
      </template>
      <template v-else-if="part.type === 'source' && part.body === 'battery9'">
        <rect x="-29" y="-44" width="58" height="72" rx="5" fill="#393f44" stroke="#b0a58d" /><path
          d="M-28-26h56v-14q0-4-4-4h-48q-4 0-4 4z"
          fill="#bd9862"
        /><text
          x="0"
          y="1"
          text-anchor="middle"
          fill="#ddd5bb"
          font-size="18"
          font-family="monospace"
          >{{ part.value }}V</text
        ><path d="M-16-44v-7M16-44v-7" stroke="#c8cbca" stroke-width="7" />
      </template>
      <template v-else-if="part.type === 'source' && part.body === 'batteryAA'">
        <rect x="-38" y="-31" width="76" height="59" rx="5" fill="#343b42" /><rect
          v-for="y in [-26, 2]"
          :key="y"
          x="-32"
          :y="y"
          width="64"
          height="22"
          rx="7"
          fill="#a7a8a3"
          stroke="#737a7a"
        /><rect
          v-for="y in [-26, 2]"
          :key="'cap' + y"
          x="15"
          :y="y"
          width="17"
          height="22"
          rx="5"
          fill="#b28c4b"
        /><text x="0" y="0" text-anchor="middle" fill="#3b4848" font-size="8">2 × AA</text>
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
        <circle
          v-if="part.momentary"
          r="11"
          :fill="part.closed ? '#8c4f46' : '#bd7768'"
          stroke="#332d2b"
          stroke-width="2"
        /><rect
          v-else
          :x="part.closed ? 1 : -15"
          y="-9"
          width="14"
          height="18"
          rx="2"
          fill="#9aa6a6"
        />
      </template>
      <text
        v-if="!preview"
        x="0"
        :y="part.type === 'source' ? -48 : part.type === 'led' ? -lensRadius - 10 : -25"
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
