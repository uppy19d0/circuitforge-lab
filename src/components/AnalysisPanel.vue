<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import AppIcon from './AppIcon.vue';
import { formatCurrent, formatVoltage } from '../engine/simulator';
const props = defineProps({ result: Object, running: Boolean });
const samples = ref([]);
let time = 0;
const timer = setInterval(() => {
  if (!props.running) return;
  time += 0.25;
  samples.value = [...samples.value.slice(-59), { time, current: props.result.current }];
}, 250);
watch(
  () => props.result.current,
  (value) => {
    samples.value = [...samples.value.slice(-59), { time, current: value }];
  },
);
onBeforeUnmount(() => clearInterval(timer));
const maximum = computed(() => Math.max(0.025, ...samples.value.map((s) => s.current)) * 1.2);
const line = computed(() =>
  samples.value
    .map(
      (sample, index) =>
        (index ? 'L' : 'M') +
        ((index * 700) / 59).toFixed(1) +
        ',' +
        (95 - (sample.current / maximum.value) * 75).toFixed(1),
    )
    .join(' '),
);
</script>
<template>
  <section class="analysis-panel" aria-label="Análisis eléctrico">
    <header>
      <div>
        <AppIcon name="chart" :size="16" /><strong>Análisis DC</strong
        ><span>Lecturas del circuito</span>
      </div>
      <span class="analysis-live"
        ><i :class="{ paused: !running }"></i>{{ running ? 'En vivo' : 'Pausado' }}</span
      >
    </header>
    <div class="analysis-body">
      <div class="analysis-metrics">
        <div>
          <span>Fuente</span><strong>{{ formatVoltage(result.voltage) }}</strong>
        </div>
        <div>
          <span>Corriente total</span
          ><strong class="accent">{{ formatCurrent(result.current) }}</strong>
        </div>
        <div>
          <span>Potencia</span
          ><strong>{{ (result.power * 1000).toFixed(1) }} <small>mW</small></strong>
        </div>
      </div>
      <div class="dc-chart">
        <div class="chart-caption">
          <span>I · FUENTE</span><span>{{ formatCurrent(maximum) }} / escala</span>
        </div>
        <svg
          viewBox="0 0 700 110"
          preserveAspectRatio="none"
          role="img"
          aria-label="Historial de corriente DC calculada"
        >
          <path
            :d="line"
            fill="none"
            stroke="#6eaf9b"
            stroke-width="2"
            vector-effect="non-scaling-stroke"
          /></svg
        ><span class="chart-time">Últimas {{ Math.min(time, 15).toFixed(0) }} s · circuito DC</span>
      </div>
    </div>
  </section>
</template>
