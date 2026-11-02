<script setup>
import { computed } from 'vue';
import AppIcon from './AppIcon.vue';
import PartGraphic from './PartGraphic.vue';
import { footprint, holeById } from '../domain/breadboard';
import { formatCurrent, formatVoltage } from '../engine/simulator';
const props = defineProps({ selected: Object, result: Object });
defineEmits(['update', 'remove', 'rotate']);
const pins = computed(() =>
  props.selected?.type
    ? footprint(props.selected)
    : props.selected
      ? [holeById[props.selected.from], holeById[props.selected.to]]
      : [],
);
const reading = computed(() => props.result.parts[props.selected?.uid]);
const pinNames = computed(() =>
  props.selected?.type === 'led'
    ? ['Ánodo (+)', 'Cátodo (−)']
    : props.selected?.type === 'source'
      ? ['Positivo (+)', 'Retorno (−)']
      : ['Terminal 1', 'Terminal 2'],
);
</script>
<template>
  <aside class="inspector-panel">
    <div class="panel-title">
      <h2>Inspector</h2>
      <AppIcon name="layers" :size="16" />
    </div>
    <div v-if="selected" class="inspector-content">
      <div class="selected-preview">
        <svg v-if="selected.type" viewBox="-62 -55 124 105">
          <PartGraphic
            :part="selected"
            :reading="reading"
            :points="[
              { x: -47, y: 0 },
              { x: 47, y: 0 },
            ]"
            :preview="true"
          /></svg
        ><AppIcon v-else name="wire" :size="38" />
      </div>
      <div class="part-heading">
        <span>{{ selected.label || 'Jumper' }}</span>
        <h3>{{ selected.name || 'Cable de conexión' }}</h3>
        <p>{{ selected.subtitle || 'Conductor ideal entre dos contactos' }}</p>
      </div>
      <label v-if="selected.type" class="inspector-field"
        >Identificador<input
          :value="selected.label"
          maxlength="18"
          @change="$emit('update', { label: $event.target.value.trim() || selected.label })"
      /></label>
      <label v-if="['resistor', 'source'].includes(selected.type)" class="inspector-field"
        >{{ selected.type === 'source' ? 'Tensión de la fuente' : 'Resistencia'
        }}<span class="unit-input"
          ><input
            aria-label="Valor del componente"
            type="number"
            :value="selected.value"
            :min="selected.type === 'source' ? 0.1 : 1"
            :max="selected.type === 'source' ? 24 : 10000000"
            :step="selected.type === 'source' ? 0.1 : 1"
            @change="$emit('update', { value: Number($event.target.value) })"
          /><span>{{ selected.unit }}</span></span
        ></label
      >
      <div v-if="selected.type === 'resistor'" class="spec-row">
        <span>Potencia nominal</span><strong>0,25 W · ±5 %</strong>
      </div>
      <div v-if="selected.type === 'led'" class="spec-row">
        <span>Corriente nominal</span><strong>20 mA</strong>
      </div>
      <button
        v-if="selected.type === 'switch'"
        class="switch-control"
        :aria-pressed="selected.closed"
        @click="$emit('update', { closed: !selected.closed })"
      >
        <span :class="{ closed: selected.closed }"></span
        >{{ selected.closed ? 'Contacto cerrado' : 'Contacto abierto' }}
      </button>
      <div class="inspector-subtitle">TERMINALES</div>
      <div class="terminal-list">
        <div v-for="(pin, index) in pins" :key="pin.id">
          <span class="terminal-marker"></span><span>{{ pinNames[index] }}</span
          ><code>{{ pin.id.toUpperCase() }}</code>
        </div>
      </div>
      <div class="inspector-subtitle">PUNTO DE OPERACIÓN DC</div>
      <dl class="reading-list">
        <div>
          <dt>Voltaje</dt>
          <dd>{{ formatVoltage(reading?.voltage) }}</dd>
        </div>
        <div>
          <dt>Corriente</dt>
          <dd>{{ formatCurrent(reading?.current) }}</dd>
        </div>
        <div>
          <dt>Potencia</dt>
          <dd>{{ reading ? (reading.power * 1000).toFixed(2) + ' mW' : '—' }}</dd>
        </div>
      </dl>
      <div class="inspector-actions">
        <button v-if="selected.type" @click="$emit('rotate')">
          <AppIcon name="rotate" :size="16" /> Rotar <kbd>R</kbd></button
        ><button class="delete-action" @click="$emit('remove')">
          <AppIcon name="trash" :size="16" /> Eliminar
        </button>
      </div>
    </div>
    <div v-else class="inspector-empty">
      <AppIcon name="cursor" :size="28" />
      <h3>Todo empieza en un contacto.</h3>
      <p>Selecciona una pieza o un cable para ver sus conexiones y editar sus propiedades.</p>
    </div>
    <div class="diagnostic-box" :class="'tone-' + result.state">
      <span class="status-dot"></span><strong>{{ result.label }}</strong>
      <p>{{ result.explanation }}</p>
    </div>
    <details class="model-notes">
      <summary>Acerca de este análisis</summary>
      <p>
        Modelo DC educativo: resistencias, interruptores, una fuente con 0,8 Ω internos y LED con
        caída directa y 10 Ω dinámicos. Los avisos señalan límites eléctricos; no predicen el daño
        térmico de una pieza física.
      </p>
      <a
        href="https://learn.sparkfun.com/tutorials/how-to-use-a-breadboard"
        target="_blank"
        rel="noreferrer"
        >Cómo se conecta un protoboard ↗</a
      >
    </details>
  </aside>
</template>
