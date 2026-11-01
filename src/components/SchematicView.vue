<script setup>
defineProps({ circuit: { type: String, default: 'led' } });
</script>
<template>
  <div class="schematic-view"><div class="schematic-grid"></div><svg viewBox="0 0 760 390" role="img" aria-label="Diagrama eléctrico del circuito"><path class="wire hot" d="M120 120H260M360 120H500M500 120V260M500 260H390M290 260H170V120"/><path class="wire ground" d="M170 260V320H500V260"/><circle class="node" cx="120" cy="120" r="7"/><circle class="node" cx="500" cy="120" r="7"/><g class="symbol battery"><path d="M80 100v40M95 90v60"/><text x="55" y="175">V1 · 9 V</text></g><g class="symbol resistor"><path d="M260 120l14-18 14 36 14-36 14 36 14-18"/><text x="250" y="80">R1 · 500 Ω</text></g><g class="symbol led"><path d="M335 105l30 15-30 15z"/><path d="M365 105v30"/><path d="M345 92l12-12M356 94l14-12"/><text x="328" y="175">D1 · LED</text></g><g class="symbol ground"><path d="M480 320h40M487 330h26M495 340h10"/><text x="535" y="325">GND</text></g></svg><div class="diagram-legend"><span><i class="legend-dot hot"></i> corriente convencional</span><span><i class="legend-dot ground"></i> retorno a tierra</span></div></div>
</template>
